// THE WORD ON THE SCREEN IS THE WORD IN THE FILTER.
//
// Measured on staging, 13 Sep 2026. Asked "how many total open tickets (to be
// triaged) are there? and avg per account and per app?", the assistant filtered
// `status = "New"` and the door refused it:
//
//   "New" isn't a status. It is one of: new, triaged, scheduled, in_progress,
//   ready, resolved.
//
// Six of those words are in the refusal, in lower case, which is what makes this
// the wrong kind of no. The model had not GUESSED a value the app does not have
// — it had the right value and the wrong shift key. It read the word off the
// Tickets screen, where a status is drawn `New` because that is how a status is
// written for a person, and then capitalised it again on the way into a
// sentence, which is what writing a sentence does.
//
// The cost was never the refusal itself. It was a STEP: the turn has twelve, and
// one of them went on capitalisation, in a question that already needed a count,
// two groupings, an age filter and a chart.
//
// WHY MATCHING LOOSELY IS SAFE HERE, and why it is not a widening of the door.
// The declared list is the dictionary in both readings: a case-insensitive match
// can only RECOGNISE a value that is already on it, never admit one that is not,
// and what reaches the statement is the DECLARED spelling rather than whatever
// the caller typed. The one thing that could make it ambiguous is a fixed enum
// holding two values that differ only in case — so the third test below asserts
// no such list exists anywhere in the grammar, read off the grammar itself
// rather than off a list kept here.
//
// A TEAM-EDITED vocabulary is deliberately untouched: those words are the team's
// and are not checked at this door at all, so nothing here can affect them.
import { describe, expect, it } from "vitest"
import { QUERY_MODULES } from "@shared/workers/query-grammar"
import { parseQuery } from "../src/lib/query-engine"

/** The values a filter on one module binds, or the refusal's own text. */
function compile(module: string, field: string, value: string) {
  try {
    const parsed = parseQuery(QUERY_MODULES[module], { where: [{ field, op: "eq", value }] })
    return { ok: true as const, params: parsed.where.flatMap((c) => c.values) }
  } catch (err) {
    return { ok: false as const, message: (err as Error).message }
  }
}

describe("a fixed status is matched by its word, not by its capitalisation", () => {
  it("accepts the word as a person reads it on screen, and binds the declared spelling", () => {
    for (const written of ["New", "NEW", "nEw", "new"]) {
      const out = compile("tickets", "status", written)
      expect(out.ok, `${written} was refused: ${out.ok ? "" : out.message}`).toBe(true)
      // THE DECLARED SPELLING REACHES THE STATEMENT. Binding the caller's own
      // capitalisation would match zero rows in a case-sensitive column, which
      // is the silent version of the same bug and the half worth pinning.
      expect(out.ok && out.params).toContain("new")
    }
    // And the caller's spelling is NOT what was bound.
    const shouted = compile("tickets", "status", "NEW")
    expect(shouted.ok && shouted.params).not.toContain("NEW")
  })

  it("still refuses a word that is not on the list, and still says the list", () => {
    const out = compile("tickets", "status", "open")
    expect(out.ok).toBe(false)
    expect(!out.ok && out.message).toContain("isn't a status")
    expect(!out.ok && out.message).toContain("triaged")
  })

  it("no fixed enum anywhere declares two values that differ only in case", () => {
    // The precondition the loose match rests on, asserted off the grammar
    // itself. A list that broke it would make the lookup pick by declaration
    // order, which is an arbitrary answer to a real ambiguity.
    const clashes: string[] = []
    for (const [name, mod] of Object.entries(QUERY_MODULES))
      for (const field of mod.fields) {
        if (field.type !== "enum" || !field.values) continue
        const lowered = field.values.map((v) => v.toLowerCase())
        if (new Set(lowered).size !== lowered.length) clashes.push(`${name}.${field.name}`)
      }
    expect(clashes).toEqual([])
  })
})
