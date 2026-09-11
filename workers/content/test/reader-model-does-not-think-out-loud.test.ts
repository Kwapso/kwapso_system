// THE READER'S MODEL MUST NOT BE ONE THAT WRITES ITS REASONING INTO THE ANSWER'S
// BUDGET.
//
// This is the one property that made the re-reader fail for months, and it is
// invisible to every other check here: the wiring was correct, the prompt was
// correct, the parse was correct, and the reply came back empty every time,
// because `@cf/moonshotai/kimi-k2.6` emits `reasoning_content` BEFORE `content`
// and bills both against the same `max_tokens`. The reader's whole answer is a
// JSON array of ids. The deliberation is the whole budget.
//
// Measured 11 Sep 2026 against the real model and real twelve-passage
// shortlists: kimi returned NULL on three questions of four, taking 30-36
// seconds each; the cheap model answered all four in 1-3 seconds, and on the one
// question both finished they returned the IDENTICAL ids in the IDENTICAL order.
// The exam over 36 scorable rows: no reader 27/36, kimi 27/36, cheap model
// 29/36, refusals 7/7 on all three, zero rows backward.
//
// SO THE LAW IS ABOUT THE CLASS, NOT THE NAME. A future reasoning model pinned
// here would reproduce the same silent failure, and nothing else in this repo
// would notice — `parseIds` returning null is indistinguishable from "the model
// was unreachable", which is exactly how it hid.

import { describe, expect, it } from "vitest"

import { CHEAP_TEXT_MODEL, READER_TEXT_MODEL } from "@shared/workers/model-text"

/** Models known to emit chain-of-thought into the same completion budget as the
 * answer. DATA, with the reason beside it, so adding one is a decision somebody
 * writes down rather than a default somebody inherits. */
const THINKS_OUT_LOUD = [
  // Emits `reasoning_content` before `content`, both against `max_tokens`.
  // Measured on the real shortlist: the answer never arrives.
  "@cf/moonshotai/kimi-k2.6",
]

describe("the reader's model", () => {
  it("is not one that spends the answer's budget thinking", () => {
    expect(
      THINKS_OUT_LOUD,
      `${READER_TEXT_MODEL} writes its reasoning into the same budget as its reply. ` +
        "The reader's answer is a list of ids; the deliberation is the whole ceiling, so " +
        "`content` comes back empty and every re-read reads as NO EVIDENCE. Raising " +
        "max_tokens does not fix it — 200, 1500 and 3000 were all measured."
    ).not.toContain(READER_TEXT_MODEL)
  })

  it("is the cheap model, which is what the measurement chose", () => {
    // Not a restatement of the line above: this pins WHICH model won, so a
    // change to some third model is a decision somebody has to make here,
    // with the exam numbers in front of them, rather than a quiet edit.
    expect(READER_TEXT_MODEL).toBe(CHEAP_TEXT_MODEL)
  })

  it("and the deny-list is not vacuous", () => {
    // The canary. A list that had been emptied would make the first test pass
    // for every model in the world, including the one it was written about.
    expect(THINKS_OUT_LOUD.length).toBeGreaterThan(0)
    expect(THINKS_OUT_LOUD).toContain("@cf/moonshotai/kimi-k2.6")
  })
})
