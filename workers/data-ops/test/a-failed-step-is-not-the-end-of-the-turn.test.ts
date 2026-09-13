// A DOOR'S REFUSAL IS NOT A FENCE, AND THE TURN MUST NOT TREAT THEM ALIKE.
//
// THE FAILURE THIS LOCKS, in the owner's own session (13 Sep 2026). He asked:
//
//     "how many total open tickets (to be triaged) are there? and avg per
//      account and per app? and how many more than 1 week old?"
//
// The model sent its filters in the wrong shape, all four calls were refused by
// `query_records`, and it then wrote, in the reply he actually read:
//
//     "All four lookups were refused — the filters I sent weren't in the right
//      shape... Let me run them again properly."
//
// It never ran them again. `runPlanLoop` ended the whole turn on the first step
// that contained any failed call, with eleven of twelve steps unused. The model
// had diagnosed its own mistake correctly, and the loop had already decided the
// conversation was over. The fix was known, by the only party who could apply
// it, one step too late.
//
// WHY THE OBVIOUS FIX IS WRONG. "Don't stop on failure" would also stop the turn
// stopping on a FENCE — an unticked source chip, or R24's outbound money taint —
// and those two must end it, every time, without a retry. `source-chip-gate.test.ts`
// pins that invariant in words: "the refusal must come back ok:false so the turn
// stops and explains itself." Both arrive as `ok: false`, so `ok` alone cannot
// tell them apart, which is exactly why this loop conflated them.
//
// SO THE DIFFERENCE IS DECLARED AT ITS SOURCE. `refuseStep` — reached from the
// chip gate and the money gate and from nowhere else — returns `terminal: true`.
// Everything else that comes back `ok: false` is a door's own answer about a
// call it really was asked, and is recoverable. The loop reads that flag rather
// than re-deriving the fence, so a fence added inside `runToolCall` tomorrow
// arrives here already terminal without this file being touched.
//
// WHAT IS CHECKED, AND WHY IT IS READ OFF DISK. There is no harness in this
// workspace that runs `runPlanLoop` against a stubbed model — every existing
// test of this loop reads its source, and this follows them. The assertions are
// POSITIONAL rather than textual wherever it matters: that `failedSteps++` sits
// OUTSIDE the per-call loop is a fact about where a statement is, and a census
// that only grepped for the string would pass on the version of this fix that
// spends the whole budget inside one step.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const AGENT_SRC = readFileSync(join(__dirname, "..", "src", "lib", "agent.ts"), "utf8")

/** `runPlanLoop`'s own source, from its declaration to the end of the file. */
const LOOP = AGENT_SRC.slice(AGENT_SRC.indexOf("async function runPlanLoop("))

describe("a failed step is not the end of the turn, but a fence still is", () => {
  it("refuseStep — the ONE fence shape — declares itself terminal", () => {
    const start = AGENT_SRC.indexOf("async function refuseStep(")
    expect(start, "refuseStep is still the one refusal shape").toBeGreaterThan(0)
    const fn = AGENT_SRC.slice(start, AGENT_SRC.indexOf("\n}", start))
    // Still ok:false — source-chip-gate.test.ts stands on this and must not have
    // been quietly loosened by the retry work.
    expect(fn, "a fence is still a failed step").toContain("ok: false")
    expect(fn, "and it is now marked as one the turn may not retry").toContain("terminal: true")
  })

  it("NOTHING ELSE is terminal — the flag is set at exactly one place", () => {
    // The whole safety of the retry rests on this being a closed set. If a second
    // `terminal: true` appears, a door failure somewhere has been promoted to a
    // fence and a class of question silently stops working again.
    // The VALUE, not the type. `refuseStep`'s own return annotation says
    // `terminal: true` as a TYPE (semicolon-separated in an object type), and a
    // count that lumped the two together would be one assertion doing two jobs
    // badly — it fired on the first run against a correct implementation, which
    // is how this distinction got written down.
    const returned = AGENT_SRC.split(", terminal: true").length - 1
    expect(returned, "only refuseStep may RETURN a terminal step").toBe(1)
    const declared = AGENT_SRC.split("; terminal: true").length - 1
    expect(declared, "and it says so in its own signature, once").toBe(1)
  })

  it("a fence ends the turn REGARDLESS of the budget", () => {
    const exit = LOOP.indexOf("if (blocked || failedSteps > RETRY_BUDGET)")
    expect(exit, "the turn's failure exit reads the fence first").toBeGreaterThan(0)
    // `blocked` is on the left of the `||`, so no arithmetic can keep a fenced
    // turn alive. Stated as a property rather than trusted to reading order.
    const cond = LOOP.slice(exit, LOOP.indexOf(")", exit))
    expect(cond.indexOf("blocked")).toBeLessThan(cond.indexOf("failedSteps"))
  })

  it("both held-back branches set `blocked`, never `failed`", () => {
    for (const fence of ["HELD_BACK_BY_CHIPS", "HELD_BACK_BY_MONEY"]) {
      const at = LOOP.indexOf(fence + "\n")
      expect(at, `${fence} is used in the loop`).toBeGreaterThan(0)
      const branch = LOOP.slice(at, at + 200)
      expect(branch, `${fence} must end the turn, not spend a retry`).toContain("blocked = true")
      expect(branch).not.toContain("failed = true")
    }
  })

  it("a terminal result from runToolCall blocks; an ordinary one only fails", () => {
    const at = LOOP.indexOf("const { message, ok, terminal } = await runToolCall(")
    expect(at, "the loop reads the flag rather than re-deriving the fence").toBeGreaterThan(0)
    const branch = LOOP.slice(at, at + 900)
    expect(branch).toContain("if (terminal) blocked = true")
    expect(branch).toContain("else failed = true")
  })

  it("the budget is REAL and BOUNDED — at least one retry, and few", () => {
    const m = /const RETRY_BUDGET = (\d+)/.exec(LOOP)
    expect(m, "the budget is a named constant, not a literal in the condition").not.toBeNull()
    const budget = Number(m![1])
    // Zero is the bug this file exists to prevent: it is the old behaviour spelled
    // with a constant. A large number is a different bug — every retry is a real
    // model call the team pays for, and MAX_STEPS (12) is not a spending plan.
    expect(budget, "zero retries IS the original defect").toBeGreaterThan(0)
    expect(budget, "a retry costs a model call; this is not a place to be generous").toBeLessThanOrEqual(3)
  })

  it("the budget counts STEPS, not CALLS — positionally, not by grep", () => {
    // THE HALF A STRING SEARCH CANNOT SEE. The owner's failing step held FOUR
    // refused calls. If the counter were incremented per call it would have
    // spent the entire budget inside the one step that earned the retry, and the
    // fix would have changed nothing for the case that motivated it.
    const perCall = LOOP.indexOf("for (const tc of reply.toolCalls) {")
    const increment = LOOP.indexOf("if (failed) failedSteps++")
    const exit = LOOP.indexOf("if (blocked || failedSteps > RETRY_BUDGET)")
    expect(perCall, "the per-call loop is still there").toBeGreaterThan(0)
    expect(increment, "the counter is incremented once per step").toBeGreaterThan(0)
    // The increment sits AFTER the per-call loop opens and BEFORE the exit — i.e.
    // between the loop's close and the decision, which is the only position that
    // counts one step once.
    expect(increment).toBeGreaterThan(perCall)
    expect(increment).toBeLessThan(exit)
    // And it appears exactly once: a second increment anywhere is a per-call
    // counter wearing a per-step name.
    expect(LOOP.split("failedSteps++").length - 1).toBe(1)
  })

  it("the retry is the MODEL's — this loop re-runs nothing itself", () => {
    // A write that failed must never be attempted again behind the person's
    // back. The loop does not re-issue a call; it lets the step end with the
    // door's error in `convo` and asks the model again, which is a fresh
    // decision with every gate, confirm and fence still in front of it.
    const exit = LOOP.indexOf("if (blocked || failedSteps > RETRY_BUDGET)")
    const between = LOOP.slice(LOOP.indexOf("if (failed) failedSteps++"), exit)
    expect(between, "nothing between counting and deciding calls a tool").not.toContain("runToolCall")
    expect(between).not.toContain("executeTool")
  })
})
