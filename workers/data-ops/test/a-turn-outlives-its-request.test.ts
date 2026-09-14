// A TURN CAN OUTLIVE ITS REQUEST.
//
// One web request holds a turn for at most TURN_DEADLINE_MS, because the
// platform kills the request soon after (measured: +230 s). Before 14 Sep 2026
// a turn that needed more than that was ended with "I've stopped partway" — and
// the owner's five-part ticket question died that way three times in one day,
// every figure already fetched and SAVED, each retry starting again from the
// question because the saved rows could not be replayed: an assistant row
// remembered which tools it called and not what it asked them, so nothing could
// pair a result back to its call.
//
// Now the rows carry the call's own id and input, `resumable` rebuilds the turn
// EXACTLY from them, the time-limit exit hands the turn on (`continues`) under a
// segment cap, and the chat door takes `continue: true` to pick it up. This
// pins each of those, and the cap.
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import type { AgentMessage } from "@shared/types"
import { CARRYING_ON_NOTE, CARRY_ON_NUDGE, MAX_SEGMENTS, resumable } from "../src/lib/agent"

const AGENT = readFileSync(join(__dirname, "../src/lib/agent.ts"), "utf8")
const DOOR = readFileSync(join(__dirname, "../src/routes/agent.ts"), "utf8")
const MCP = readFileSync(join(__dirname, "../../mcp/src/lib/tools.ts"), "utf8")

const row = (
  role: AgentMessage["role"],
  content: string | null,
  toolCalls?: AgentMessage["toolCalls"]
): AgentMessage => ({ id: "x", threadId: "t", role, content, toolCalls, source: null, createdAt: "now" })

describe("a turn can outlive its request", () => {
  it("the saved rows rebuild the turn exactly — calls with their ids and inputs, results paired by order", () => {
    const turn = [
      row("user", "how many open tickets, and who triaged the most?"),
      row("assistant", null, [
        { tool: "query_records", status: "done", id: "c1", input: { module: "tickets", limit: 0 } },
        { tool: "describe_module", status: "done", id: "c2", input: { module: "ticket_moves" } },
      ]),
      row("tool", 'OK. Result data: {"total":433}'),
      row("tool", 'OK. Result data: {"module":"ticket_moves"}'),
      row("assistant", CARRYING_ON_NOTE),
    ]
    expect(resumable(turn)).toEqual([
      { role: "user", content: "how many open tickets, and who triaged the most?" },
      {
        role: "assistant",
        content: "",
        toolCalls: [
          { id: "c1", name: "query_records", input: { module: "tickets", limit: 0 } },
          { id: "c2", name: "describe_module", input: { module: "ticket_moves" } },
        ],
      },
      { role: "tool", content: 'OK. Result data: {"total":433}', toolCallId: "c1", toolName: "query_records" },
      { role: "tool", content: 'OK. Result data: {"module":"ticket_moves"}', toolCallId: "c2", toolName: "describe_module" },
      { role: "assistant", content: CARRYING_ON_NOTE },
    ])
  })

  it("a call whose result never landed gets an honest placeholder, never a dangling call", () => {
    const turn = [
      row("user", "q"),
      row("assistant", null, [{ tool: "query_records", status: "pending", id: "c1", input: {} }]),
    ]
    const out = resumable(turn)!
    expect(out[2]).toMatchObject({ role: "tool", toolCallId: "c1" })
    expect(out[2]!.content).toMatch(/cut off/)
  })

  it("rows from before the ids existed cannot be resumed exactly, and say so", () => {
    const old = [row("user", "q"), row("assistant", null, [{ tool: "query_records", status: "done" }]), row("tool", "OK")]
    expect(resumable(old)).toBeNull()
  })

  it("the assistant row is saved with the id and the input, or nothing above can work", () => {
    expect(AGENT).toContain('({ tool: tc.name, status: "pending", id: tc.id, input: tc.input })')
  })

  it("running out of time hands the turn on under the cap, and stops honestly on the last segment", () => {
    const helper = AGENT.slice(AGENT.indexOf("const stoppedPartway"), AGENT.indexOf("for (let step = 0"))
    expect(helper).toContain("(loopOpts.segment ?? 0) < MAX_SEGMENTS - 1")
    expect(helper).toContain("? CARRYING_ON_NOTE")
    expect(helper).toContain("continues ? { continues: true } : {}")
    // The cap is a small number on purpose — it is the cost dial for a long
    // question, and each segment is a full MAX_STEPS of credits.
    expect(MAX_SEGMENTS).toBeGreaterThan(1)
    expect(MAX_SEGMENTS).toBeLessThanOrEqual(6)
    // The segment is counted off the SAVED notes, so the cap holds however the
    // continuation was asked for — a client cannot reset it by lying.
    expect(AGENT).toContain("m.role === \"assistant\" && m.content === CARRYING_ON_NOTE).length")
    // AND THE STEP CAP HANDS ON TOO — on the measured engine it is the exit a
    // hard question actually reaches, so a time-limit-only handover would have
    // been a handover that never happened.
    const stepsOut = AGENT.slice(AGENT.indexOf("I took several steps and paused here") - 400, AGENT.indexOf("I took several steps and paused here") + 400)
    expect(stepsOut).toContain("const continues = (loopOpts.segment ?? 0) < MAX_SEGMENTS - 1")
    expect(stepsOut).toContain("continues ? CARRYING_ON_NOTE :")
    expect(stepsOut).toContain("continues ? { continues: true } : {}")
  })

  it("a continuation adds no user row, replays the turn exactly, and opens with the one nudge", () => {
    const chat = AGENT.slice(AGENT.indexOf("export async function runChat"), AGENT.indexOf("async function runPlanLoop"))
    expect(chat).toContain("if (!opts.continue)\n    await appendMessage(")
    expect(chat).toContain("...(resumable(turn) ?? replayable(turn))")
    expect(chat).toContain('if (opts.continue) convo.push({ role: "user", content: CARRY_ON_NUDGE })')
    expect(CARRY_ON_NUDGE).toContain("Do not repeat a lookup")
  })

  it("the door reads the flag as a literal comparison (R20), and the MCP mirror forwards it (R22)", () => {
    expect(DOOR).toContain("const carryOn = body.continue === true")
    expect(DOOR).toContain('carryOn ? "" : requireText(body.message')
    expect(MCP).toContain("...(i.continue === true ? { continue: true } : {})")
  })
})
