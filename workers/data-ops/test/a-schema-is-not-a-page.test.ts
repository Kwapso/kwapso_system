// THE ONE RESULT THAT MAY NEVER ARRIVE HALF-DROPPED.
//
// `trimResult` calls anything carrying more than LIST_ROWS (8) entries a LIST:
// it keeps as many as fit in RESULT_CHARS (2,000) and drops the rest from the
// end, with a note saying so. That is right for fifty tickets — the rows are
// alike, the first few answer the question, and the tallies beside them are
// exact whatever is shown.
//
// It is wrong for a SCHEMA. `describe_module("tickets")` answers with EIGHTEEN
// fields, so it took the page path, and the tail of the field list was dropped
// to fit a budget written for rows. Every entry in that list is a different
// fact, and the ones that fell off the end are not a smaller sample of the ones
// that stayed — they are precisely what the caller asked for.
//
// WHAT IT COST, measured on staging 13 Sep 2026 across two turns on one
// question ("who has triaged the most tickets?"). The model asked what fields
// tickets has, was handed a short answer, and then did the only thing left open
// to it: it guessed. `triagedById`, `assignedTo`, `triagedBy`, `triageBy` — four
// names, four refusals, four steps of twelve, and in between it called
// describe_module again and was answered from the turn's own cache with the
// same shortened list. It never disbelieved what it had been given, because
// there is no reason to.
//
// This is the row-trim's OWN founding bug (a `total` cut off the end of a page,
// so the model asked again, six times, at one credit each) reappearing one layer
// up — on the single result whose entire job is to tell the model what it is
// allowed to say.
import { describe, expect, it } from "vitest"
import { getTool } from "../src/lib/tools"
import { trimResult } from "../src/lib/agent"

/** A schema answer the size of a real one: many entries, each a different fact. */
const schema = (n: number) => ({
  module: "tickets",
  summary: "The team's tickets — what a client asked for, and where it has got to.",
  fields: Array.from({ length: n }, (_, i) => ({
    name: `field${i}`,
    type: "text",
    note: "a sentence about this field that is long enough to matter when there are eighteen of them, which is what a real module carries",
  })),
})

describe("a schema is a contract, not a page", () => {
  it("the describe tools declare it, and they are the only ones that do", () => {
    // DERIVED FROM THE NAME, not hand-listed — so a third `describe_*` tool is
    // covered the day it lands, and no ordinary read can quietly claim it.
    const describes = ["describe_module", "describe_tool"]
    for (const n of describes) expect(getTool(n)?.wholeResult, n).toBe(true)
    for (const n of ["query_records", "ask_knowledge", "read_activity"])
      expect(getTool(n)?.wholeResult, n).not.toBe(true)
  })

  it("every field survives, where a page of the same size would lose its tail", () => {
    const big = schema(18)
    const kept = trimResult(big, 40_000, true)
    for (let i = 0; i < 18; i++) expect(kept, `field${i} was dropped`).toContain(`field${i}`)
    expect(kept).not.toContain("were dropped to fit")

    // THE CANARY. The same payload down the ordinary path really does lose
    // fields — without this the test above would pass just as well against a
    // trim that never had a problem, and would be proving nothing.
    const trimmed = trimResult(big, 40_000, false)
    expect(trimmed).toContain("dropped to fit")
    expect(trimmed).not.toContain("field17")
  })

  it("a contract is still bounded — nothing here reads without a limit", () => {
    const huge = trimResult(schema(4000), 5_000, true)
    expect(huge.length).toBeLessThan(5_200)
    expect(huge).toContain("Trimmed here")
  })

  it("a small answer is handed over untouched either way", () => {
    const small = { module: "x", fields: [{ name: "id" }] }
    expect(trimResult(small, 40_000, true)).toBe(JSON.stringify(small))
    expect(trimResult(small, 40_000, false)).toBe(JSON.stringify(small))
  })
})
