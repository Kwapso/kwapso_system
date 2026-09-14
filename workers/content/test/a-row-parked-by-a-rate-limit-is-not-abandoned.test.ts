// A GIVE-UP COUNTER THAT WAS RIGHT ONLY GOING FORWARD.
//
// `EMBED_ATTEMPT_CAP` (5) exists to stop paying a model to re-read a document
// it has already refused five times. `indexOneSource` stopped advancing that
// counter on a Vectorize 429 the day somebody understood what a 429 is: a fact
// about the INFRASTRUCTURE at that instant, never about the document. Both are
// correct.
//
// Neither of them un-parks a row that reached the cap BEFORE the second rule
// existed. `revisitUnhealthySources` selects `embed_attempts <
// EMBED_ATTEMPT_CAP`, so such a row is skipped — every sweep, for ever. The only
// other thing that clears the counter is the source's own text changing, and a
// mirror of a story nobody is editing never changes.
//
// MEASURED ON STAGING, 14 Sep 2026. Two rows: a 342-character story and a
// 97-character task, both `VECTOR_DELETE_ERROR (code = 40041): Too Many
// Requests`, both at exactly 5. I had told the owner they were "queued, not
// abandoned", having read the forward-looking rule and not the selection. They
// were abandoned, and nothing in the app would ever have said so — a
// permanently-skipped row and a row whose turn has not come look identical from
// outside.
//
// WHAT THIS PINS is the agreement between the two spellings of one sentence.
// `isVectorizeRateLimited` reads a thrown Error; `RATE_LIMITED_ERROR_SQL` reads
// the string that error was SAVED as. They are in different languages and can
// drift silently — a row the JS calls rate-limited and the SQL does not is
// exactly the row that stays parked.
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { isVectorizeRateLimited, RATE_LIMITED_ERROR_SQL } from "../src/lib/knowledge"

/** `x LIKE 'pattern'` the way SQLite means it: `%` is any run, and LIKE on a
 *  plain string is case-insensitive for ASCII — which is why the SQL also
 *  lowercases one side rather than trusting that. */
function sqlLike(value: string, pattern: string): boolean {
  const rx = new RegExp(
    "^" + pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*") + "$",
    "i"
  )
  return rx.test(value)
}

/** Evaluate RATE_LIMITED_ERROR_SQL against one stored `index_error`, by reading
 *  the predicate itself rather than by re-typing what it is believed to say. */
function sqlSaysRateLimited(indexError: string | null): boolean {
  if (indexError === null) return false
  const patterns = [...RATE_LIMITED_ERROR_SQL.matchAll(/LIKE '([^']+)'/g)].map((m) => m[1])
  expect(patterns.length, "the predicate should be a disjunction of LIKEs").toBeGreaterThan(1)
  return patterns.some((p) => sqlLike(indexError, p))
}

describe("a row parked by a rate limit is not abandoned", () => {
  // THE REAL MESSAGES, copied from the two staging rows and from the wider
  // burst of 38 during the mass rebuild.
  const RATE_LIMITED = [
    "VECTOR_DELETE_ERROR (code = 40041): Too Many Requests",
    "VECTOR_UPSERT_ERROR (code = 40041): Too Many Requests",
    "vectorize: too many requests, slow down",
  ]
  const NOT_RATE_LIMITED = [
    "VECTOR_UPSERT_ERROR (code = 40010): vector dimension mismatch",
    "Too big to index whole: the first 200 of 412 pieces are searchable.",
    "TypeError: Cannot read properties of undefined",
  ]

  it("the two spellings of one sentence agree, both ways", () => {
    for (const m of RATE_LIMITED) {
      expect(isVectorizeRateLimited(new Error(m)), `JS missed: ${m}`).toBe(true)
      expect(sqlSaysRateLimited(m), `SQL missed: ${m}`).toBe(true)
    }
    for (const m of NOT_RATE_LIMITED) {
      expect(isVectorizeRateLimited(new Error(m)), `JS over-matched: ${m}`).toBe(false)
      expect(sqlSaysRateLimited(m), `SQL over-matched: ${m}`).toBe(false)
    }
    // A row with no error at all is not rate-limited, and must not be swept in
    // by a predicate that forgot `index_error` can be NULL.
    expect(sqlSaysRateLimited(null)).toBe(false)
  })

  it("the revisit pass lifts the cap for exactly that failure and nothing else", () => {
    const source = readFileSync(join(__dirname, "../src/lib/knowledge.ts"), "utf8")
    const select = source.slice(source.indexOf("export async function revisitUnhealthySources"))
    const query = select.slice(0, select.indexOf("ORDER BY updated_at ASC"))
    // The cap is still there — this widens one door, it does not remove one.
    expect(query).toContain("embed_attempts < ${EMBED_ATTEMPT_CAP}")
    // …with the rate-limit escape beside it, as an OR rather than a replacement.
    expect(query).toContain("OR ${RATE_LIMITED_ERROR_SQL}")
    // And it is still bounded and still fenced to live rows.
    expect(query).toContain("deactivated_at IS NULL")
    expect(select).toContain("LIMIT ${limit}")
  })
})
