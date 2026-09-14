// THE SENTENCE THE APP WROTE AND THEN SPENT A DAY DIAGNOSING AS THE MODEL'S.
//
// `finalAnswerText` read `reply.text?.trim() || "Hi — how can I help with your
// team today?"`. So a model turn that ended with NO text, NO tool call and
// `finish_reason: "stop"` — which is what a reasoning model does when it decides
// on its tool calls inside its hidden thinking and then never emits them — was
// shown to the person as a cheerful greeting. Six correct tool results were in
// the context. The greeting was ours.
//
// MEASURED ON STAGING, 14 Sep 2026, on the owner's five-part ticket question
// (thread 01M2DSC331CRDY89XF70FG9DDS, rows 1315–1326): four model calls, every
// tool result correct, then row 1326 — "Hi — how can I help with your team
// today?". Replaying that exact final call against the deployed model over the
// REST door: `finish_reason: "stop"`, content 0 chars, reasoning_content 10,143
// chars ending "Let me do these calls:", tool calls 0. With one nudge appended
// to the same context, the same model wrote the answer.
//
// WHAT THIS PINS, in the order the bug hid:
//   1. the model's hidden reasoning is CAPTURED — on both provider paths — and
//      kept off the screen, so a silent step can be recorded with what the
//      model was thinking (the fact that told a stall apart from a finish);
//   2. an empty reply is never dressed as a greeting;
//   3. the loop treats it as a STALL: nudged ONCE PER TURN, recorded every
//      time, and ended honestly the second time — before the final-answer
//      branch can see it.
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { finalAnswerText, STALLED_TURN_NOTE, STALL_NUDGE } from "../src/lib/agent"
import { parseOpenAiStream, selectModel } from "../src/lib/model"
import type { Env } from "../src/env"

const SOURCE = readFileSync(join(__dirname, "../src/lib/agent.ts"), "utf8")
const LOOP_AT = SOURCE.indexOf("for (let step = 0; step < MAX_STEPS; step++)")
const LOOP = SOURCE.slice(LOOP_AT)

function sse(events: unknown[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder()
  return new ReadableStream({
    start(c) {
      for (const ev of events) c.enqueue(enc.encode(`data: ${JSON.stringify(ev)}\n\n`))
      c.enqueue(enc.encode("data: [DONE]\n\n"))
      c.close()
    },
  })
}

describe("an empty reply is not a greeting", () => {
  it("the stream path keeps the model's thinking as evidence and off the screen", async () => {
    const said: string[] = []
    const reply = await parseOpenAiStream(
      sse([
        { choices: [{ delta: { role: "assistant", reasoning_content: "Let me do " } }] },
        { choices: [{ delta: { reasoning_content: "these calls:" } }] },
        { choices: [{ delta: {}, finish_reason: "stop" }] },
        { usage: { prompt_tokens: 10, completion_tokens: 5 }, choices: [] },
      ]),
      (d) => said.push(d)
    )
    expect(reply.reasoning).toBe("Let me do these calls:")
    // The two failures this must not have: thinking leaking into the answer, or
    // onto the live stream.
    expect(reply.text).toBe("")
    expect(said).toEqual([])
    expect(reply.toolCalls).toEqual([])
    expect(reply.truncated).toBe(false)
  })

  it("gpt-oss sends the same thought under two names, and it is counted once", async () => {
    const reply = await parseOpenAiStream(
      sse([{ choices: [{ delta: { reasoning: "once", reasoning_content: "once" } }] }]),
      () => {}
    )
    expect(reply.reasoning).toBe("once")
  })

  it("the non-streaming path carries it too", async () => {
    const env = {
      AGENT_MODEL: "@cf/test/model",
      AI: {
        run: async () => ({
          choices: [{ message: { content: "", reasoning_content: "thinking, then nothing" }, finish_reason: "stop" }],
          usage: { prompt_tokens: 1, completion_tokens: 1 },
        }),
      },
    } as unknown as Env
    const reply = await selectModel(env).complete([{ role: "user", content: "hi" }], [])
    expect(reply.text).toBe("")
    expect(reply.reasoning).toBe("thinking, then nothing")
    // …and a reply with nothing hidden has no field at all, so nobody downstream
    // reads an empty string as "the model thought about it".
    const plain = { ...env, AI: { run: async () => ({ choices: [{ message: { content: "All set." } }] }) } } as unknown as Env
    expect(await selectModel(plain).complete([{ role: "user", content: "hi" }], [])).not.toHaveProperty("reasoning")
  })

  it("an empty reply says it lost the thread — it never greets", () => {
    const text = finalAnswerText({ text: "   ", truncated: false })
    expect(text).toBe(STALLED_TURN_NOTE)
    expect(text.toLowerCase()).not.toMatch(/^hi\b/)
    expect(text).not.toContain("how can I help")
    // And the greeting is not waiting in the CODE either — comments may quote it
    // (this file's own header does), a string literal may not.
    const code = SOURCE.split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n")
    expect(code).not.toContain('"Hi — how can I help')
  })

  it("the loop nudges a stalled model once per turn, records it, and ends honestly the second time", () => {
    const stall = LOOP.indexOf("const stalled = !reply.toolCalls.length && !reply.text?.trim() && !reply.truncated")
    const final = LOOP.indexOf("if (!reply.toolCalls.length) {")
    expect(stall, "the stall branch is missing").toBeGreaterThan(-1)
    // BEFORE the final-answer branch, or the empty reply reaches finalAnswerText
    // first and the nudge never fires.
    expect(stall).toBeLessThan(final)
    const branch = LOOP.slice(stall, final)
    expect(branch).toContain("content: STALL_NUDGE")
    expect(branch).toContain("continue")
    expect(branch).toContain("recordWorkerError")
    expect(branch).toContain('"agent/stalled"')
    expect(branch).toContain('"agent/stalled-twice"')
    // ONCE PER TURN: the flag is declared OUTSIDE the step loop. Declared inside
    // it, every step would be its own first stall and a silent model would be
    // nudged until MAX_STEPS ran out, a credit a step.
    const declared = SOURCE.indexOf("let nudged = false")
    expect(declared).toBeGreaterThan(-1)
    expect(declared).toBeLessThan(LOOP_AT)
    expect(branch).toContain("if (!nudged)")
    expect(branch).toContain("nudged = true")
    // The nudge forbids tool calls — the stall happens where a call was meant to
    // be, and the one measured recovery answered from what it already had.
    expect(STALL_NUDGE).toContain("Do not call any more tools")
  })
})
