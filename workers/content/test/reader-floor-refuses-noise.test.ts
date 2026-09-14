// THE READER'S FLOOR MUST NOT THROW AWAY EVIDENCE — AND IT CANNOT BE ASKED TO
// RECOGNISE NOISE, BECAUSE FOUR MEASUREMENTS SAY NO FLOOR CAN.
//
// This file used to assert the opposite, and it was wrong. It was written on
// 11 Sep 2026 to pin `READER_HALLUCINATION_FLOOR` ABOVE the capital-of-France
// question, on two measured points:
//
//   "What is the capital of France?"     top-1 0.335   must refuse
//   A-M1, the exam's own reader canary   top-1 0.444   must answer
//
// 0.4 separates those two, so 0.4 looked like a clean answer. It was not. Two
// more points, both measured on 12 Sep against the same staging base:
//
//   "what horsepower do we have and what
//    is everyone specialised in?"        top-1 0.399   must ANSWER
//   A-X9, "...at dinner on the 14th"     top-1 0.466   must REFUSE
//
// Read all four in order: 0.335 refuse · 0.399 answer · 0.444 answer · 0.466
// refuse. A question that must be refused sits BELOW one that must be answered,
// and another sits ABOVE both. THERE IS NO LINE THROUGH THAT SET. Similarity is
// a ranking signal; it was never a verdict, and every floor that looks decisive
// is just choosing which correct answer to sacrifice.
//
// The 0.4 raise sacrificed the horsepower question — one of the three
// d-paraphrase rows, proven working the day before, killed by one thousandth —
// and NOTHING WENT RED, because that question is not in the exam. It was found
// by re-testing an old caveat, which is not a control.
//
// SO THIS FILE NOW GUARDS THE ONE THING A FLOOR CAN HONESTLY PROMISE: that it
// does not exclude material somebody has measured as real evidence. The
// decision about noise moved to the reader, which must now quote the words it
// relies on (`knowledge-reader.ts`), and to the exam's refusal ceiling, which
// is a throw rather than a report (`enforceRefusalCeiling`).
//
// NO MODEL RUNS HERE, deliberately: a floor is arithmetic, and a test that
// needs a quota stops guarding the moment the quota runs out.

import { describe, expect, it } from "vitest"

/** Every measurement anybody has taken of this, off staging's own refusal log
 * and the exam's baseline. Named rather than inlined so a future change has to
 * argue with the evidence rather than edit a number. */
const MEASURED = [
  { id: "france", top1: 0.335, must: "refuse", q: "What is the capital of France?" },
  { id: "horsepower", top1: 0.399, must: "answer", q: "what horsepower do we have and what is everyone specialised in?" },
  { id: "A-M1", top1: 0.444, must: "answer", q: "the exam's own reader canary" },
  { id: "A-X9", top1: 0.466, must: "refuse", q: "what did Alaap discuss at dinner on the 14th?" },
] as const

const answerers = MEASURED.filter((m) => m.must === "answer")

describe("the floor the reader's pool is built against", () => {
  it("never excludes a question somebody measured as having a real answer", async () => {
    const { READER_HALLUCINATION_FLOOR } = await floors()
    const lowest = answerers.reduce((a, b) => (a.top1 <= b.top1 ? a : b))
    expect(
      lowest.top1,
      `"${lowest.q}" has a real answer in the base at top-1 ${lowest.top1}. A floor above ` +
        `that never shows it to the reader at all, so the question refuses and nothing ` +
        `goes red — which is exactly how the 0.4 raise killed it on 12 Sep 2026`
    ).toBeGreaterThanOrEqual(READER_HALLUCINATION_FLOOR)
  })

  it("records that no floor can separate refuse from answer", () => {
    // THE REASON THE FRANCE CLAUSE IS GONE. Not an opinion — the ordering.
    const worstRefusal = MEASURED.filter((m) => m.must === "refuse").reduce((a, b) => (a.top1 >= b.top1 ? a : b))
    const bestNeeded = answerers.reduce((a, b) => (a.top1 >= b.top1 ? a : b))
    expect(
      worstRefusal.top1,
      "if a must-refuse question ever scored BELOW every must-answer one, a floor would " +
        "work again and this file should go back to pinning one. It does not: " +
        `${worstRefusal.id} (${worstRefusal.top1}) outscores ${bestNeeded.id} (${bestNeeded.top1})`
    ).toBeGreaterThan(bestNeeded.top1)
  })

  it("and the strict floor still refuses every one of them on its own", async () => {
    // The canary. If the strict floor ever dropped below these measurements,
    // the tests above would keep passing while describing a world that no
    // longer exists — the reader would stop being the thing that rescues them.
    const { MIN_VECTOR_SCORE } = await floors()
    for (const m of MEASURED) expect(m.top1, `${m.id} is no longer under the strict floor`).toBeLessThan(MIN_VECTOR_SCORE)
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
