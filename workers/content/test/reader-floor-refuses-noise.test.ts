// THE READER'S POOL MUST NOT CONTAIN PURE NOISE, BECAUSE A MODEL HANDED NOISE
// WILL EVENTUALLY PICK SOME.
//
// `READER_HALLUCINATION_FLOOR` is the floor that applies INSTEAD of the strict
// one when a reader is coming — a guard against nothing-at-all, on the argument
// that the real decision moves to the reader. That argument holds only while the
// guard is actually a guard.
//
// MEASURED, and this is the whole test:
//
//   "What is the capital of France?"     top-1 0.335   must refuse
//   A-M1, the exam's own reader canary   top-1 0.444   must be rescued
//
// Both sit under the strict floor of 0.5, so both were refused before a reader
// existed. At 0.3 both entered the pool — and on 11 Sep 2026, the day the reader
// became a model that actually finishes its reply, it looked at twelve unrelated
// passages for the France question and picked one, citing a FluClinic
// transcript. The exam's refusal ceiling went 7/7 -> 6/7.
//
// A refusal failure is not one row's worth of damage. A base that invents an
// answer about France is a base nobody can trust about anything, and the whole
// of R23 is written about exactly that.
//
// NO MODEL RUNS HERE, deliberately: the floor is arithmetic, and the team's AI
// allowance was exhausted the night this was written. A test that cannot run
// without a quota is a test that stops guarding the moment it matters.

import { describe, expect, it } from "vitest"

/** The two real measurements, off staging's own refusal log and the exam's
 * baseline. Named rather than inlined so a future change has to argue with the
 * evidence rather than edit a number. */
const FRANCE_TOP1 = 0.335 // "What is the capital of France?" — the base holds nothing
const CANARY_TOP1 = 0.444 // A-M1 — real evidence the strict floor threw away

describe("the floor the reader's pool is built against", () => {
  it("keeps out a question the base has nothing on", async () => {
    const { READER_HALLUCINATION_FLOOR } = await floors()
    expect(
      FRANCE_TOP1,
      "a nearest neighbour this far from the question is noise; handing twelve of " +
        "them to a model is how the base ended up citing a FluClinic transcript " +
        "for the capital of France"
    ).toBeLessThan(READER_HALLUCINATION_FLOOR)
  })

  it("still lets through the row the reader exists to rescue", async () => {
    const { READER_HALLUCINATION_FLOOR } = await floors()
    expect(
      CANARY_TOP1,
      "A-M1 is real evidence sitting under the strict floor — the exact case the " +
        "reader was built for. A floor that excludes it has thrown the mechanism away"
    ).toBeGreaterThanOrEqual(READER_HALLUCINATION_FLOOR)
  })

  it("and the strict floor still refuses both on its own", async () => {
    // The canary for the two above: if the strict floor ever dropped below
    // either measurement, both tests would keep passing while describing a
    // world that no longer exists.
    const { MIN_VECTOR_SCORE } = await floors()
    expect(FRANCE_TOP1).toBeLessThan(MIN_VECTOR_SCORE)
    expect(CANARY_TOP1).toBeLessThan(MIN_VECTOR_SCORE)
  })
})

/** Read off the SOURCE rather than imported: both constants are module-private,
 * and exporting them purely for a test would widen the file's surface for no
 * reason a reader of that file would understand. */
async function floors(): Promise<{ READER_HALLUCINATION_FLOOR: number; MIN_VECTOR_SCORE: number }> {
  const { readFileSync } = await import("node:fs")
  const { join } = await import("node:path")
  const src = readFileSync(join(__dirname, "..", "src", "lib", "knowledge.ts"), "utf8")
  const read = (name: string): number => {
    const found = new RegExp(`const ${name} = ([0-9.]+)`).exec(src)
    expect(found, `${name} is no longer declared as a plain number in knowledge.ts`).toBeTruthy()
    return Number(found![1])
  }
  return { READER_HALLUCINATION_FLOOR: read("READER_HALLUCINATION_FLOOR"), MIN_VECTOR_SCORE: read("MIN_VECTOR_SCORE") }
}
