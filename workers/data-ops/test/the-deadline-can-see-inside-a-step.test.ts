// A DEADLINE THAT COULD NOT REACH THE ONLY CALL LONG ENOUGH TO NEED IT.
//
// `TURN_DEADLINE_MS` (210s, and 150s when this was written) exists because of
// one measured outcome, recorded in agent.ts's own header: "a 144-second one
// was killed by the platform mid-request and the person received an EMPTY BUBBLE — no answer, no error, no
// sign anything had happened. That is the worst outcome available: a failure
// that looks like the assistant ignoring you."
//
// It was checked BETWEEN steps and nowhere else. So a single slow model call
// walked straight through it and produced exactly that outcome again.
//
// MEASURED ON STAGING, 14 Sep 2026, on the owner's own five-part question
// ("how many total open tickets… avg per account and per app… more than 1 week
// old… who has triaged the most… graph by month"). Reading the saved thread,
// with every row's offset from the user's message:
//
//     +0.0s    user
//     +14.6s   assistant  · describe_module
//     +63.9s   assistant  · describe_module
//     +85.3s   assistant  · four query_records, all green
//     +88.6s   tool       · the last result of that step
//     +230.3s  assistant  · …and then nothing, ever
//
// The step that began at +88.6s was correctly ALLOWED to start — 88 is inside
// 150 — and the model did not answer for 142 seconds. The assistant row was
// written at +230 and the request died there: no tool results, no wrap-up, no
// message of any kind. Ten green steps and an empty bubble.
//
// WHAT THIS PINS, and it is deliberately about STRUCTURE rather than about
// timing, because a test that waits 150 seconds is a test nobody runs:
//
//   1. both provider calls go through the race, not just one of them — the
//      streaming path is the one a person actually gets, and it was the one
//      that failed;
//   2. the budget is what is LEFT of the turn, never a fresh constant, so the
//      race can never extend a turn past the bound it is enforcing;
//   3. the timeout is told apart from a model failure, because nothing is wrong
//      with the provider and saying so would send the owner to check a key;
//   4. both ways of running out of time reach the SAME saved sentence — one
//      exit, so a person cannot tell which side of a step boundary they landed
//      on, and so the second one cannot go missing again.
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const SOURCE = readFileSync(join(__dirname, "../src/lib/agent.ts"), "utf8")
const LOOP = SOURCE.slice(SOURCE.indexOf("for (let step = 0; step < MAX_STEPS; step++)"))

describe("the turn deadline can see inside a step", () => {
  it("both provider calls are raced, not only the streaming one", () => {
    expect(LOOP).toContain("await inTime(model.stream!(")
    expect(LOOP).toContain("await inTime(model.complete(")
    // …and neither survives un-raced anywhere in the loop, which is the half a
    // "contains" test alone would miss.
    expect(LOOP).not.toMatch(/=\s*await model\.stream!\(/)
    expect(LOOP).not.toMatch(/=\s*await model\.complete\(/)
  })

  it("the budget is what is LEFT of the turn, never a fresh deadline", () => {
    expect(LOOP).toContain("const leftOfTurn = TURN_DEADLINE_MS - (Date.now() - startedAt)")
    // The race is armed with exactly that, so it can only ever END a turn early
    // — never grant it another 150 seconds.
    const race = LOOP.slice(LOOP.indexOf("const inTime"), LOOP.indexOf("if (streaming)"))
    expect(race).toContain("leftOfTurn)")
    expect(race).not.toContain("TURN_DEADLINE_MS)")
    // A step that begins with nothing left does not start a call at all.
    expect(LOOP).toContain("if (leftOfTurn <= 0) return await stoppedPartway()")
  })

  it("running out of time is not reported as a model failure", () => {
    const katch = LOOP.slice(LOOP.indexOf("} catch (e) {"))
    const timeoutExit = katch.indexOf("if (e === TURN_RAN_OUT) return await stoppedPartway()")
    const classify = katch.indexOf("e instanceof ModelError")
    expect(timeoutExit, "the timeout branch is missing").toBeGreaterThan(-1)
    // BEFORE the classifier and before recordWorkerError: a turn that simply
    // took too long is not an incident, and filing it as one buries the real ones.
    expect(timeoutExit).toBeLessThan(classify)
    expect(timeoutExit).toBeLessThan(katch.indexOf("recordWorkerError"))
  })

  it("both ways of running out of time reach one saved sentence", () => {
    // The sentence lives in exactly one place. Two copies is how the second exit
    // came to have none.
    const occurrences = SOURCE.split("taking longer than I should keep you waiting for").length - 1
    expect(occurrences, "the stop-partway sentence should be written once").toBe(1)
    // And that one place SAVES it — an unsaved sentence is the empty bubble
    // wearing a different hat, because a reopened thread would show nothing.
    const helper = SOURCE.slice(SOURCE.indexOf("const stoppedPartway"))
    const body = helper.slice(0, helper.indexOf("\n  }"))
    expect(body).toContain("appendMessage")
    expect(body).toContain('role: "assistant"')
    expect(body).toContain("say(note)")
    // Both callers go through it.
    expect(LOOP.split("stoppedPartway()").length - 1).toBeGreaterThanOrEqual(3)
  })
})
