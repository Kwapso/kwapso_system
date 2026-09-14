// D1 REFUSES AN EXPRESSION THAT NESTS DEEPER THAN 100 — SQLITE_MAX_EXPR_DEPTH,
// measured from the 15 Sep 2026 staging incident this file exists to prevent a
// repeat of: migration 0088 originally OR-ed 160 `BETWEEN` ranges into one
// WHERE clause, which is unremarkable SQL under stock SQLite's own ceiling
// (1000, the engine `node:sqlite` runs this whole test suite against) and
// which D1 refused outright — "D1_ERROR: Expression tree is too large
// (maximum depth 100): SQLITE_ERROR" on the bound path, "Cloudflare D1 API
// failed: Expression tree is too large (maximum depth 100): SQLITE_ERROR" on
// the REST path, same statement, both execution doors. `d1ExecScript`
// (shared/workers/d1-rest.ts) sends a migration's whole script through D1 as
// ONE transaction on either path, so the refusal rolled the whole script
// back — both teams the migrate-teams robot tried it against stayed on 0087
// with nothing recorded, never a partial write.
//
// NEITHER LOCAL ENGINE CAN REPRODUCE D1's CEILING DIRECTLY. SQLite's own C API
// exposes `sqlite3_limit(db, SQLITE_LIMIT_EXPR_DEPTH, 100)` for exactly this,
// but neither binding available to this test suite reaches it: `node:sqlite`'s
// `DatabaseSync` — checked directly against the Node version this repo runs
// (v24.19.0) — exposes no `.limit()`/`.pragma()` surface at all; its own
// prototype is `open`, `close`, `prepare`, `exec`, `function`,
// `createTagStore`, `location`, `aggregate`, `createSession`,
// `applyChangeset`, `enableLoadExtension`, `enableDefensive`,
// `loadExtension`, `serialize`, `deserialize`, `setAuthorizer` — nothing
// that reaches `sqlite3_limit`. And there is no `better-sqlite3` dependency
// anywhere in this repo (grepped `package.json` and the lockfile) to fall
// back to — which would not have helped either, since SQLite has no PRAGMA
// for expression depth, only the C API `better-sqlite3`'s own `.pragma()`
// does not expose.
//
// SO THIS IS THE STATIC CENSUS the runtime check would have been if either
// binding could set the real limit: parse each migration's own SQL text and
// estimate the deepest an OR/AND chain plus parenthesis nesting reaches in any
// one statement — exactly the shape `d1-compound-cap.test.ts` (this same
// directory) already uses for D1's OTHER ceiling (compound-SELECT terms, 5 --
// 0018's lesson). This one is a heuristic, not SQLite's own parser, so its cap
// sits well under D1's measured 100 — the margin is deliberate, because the
// job is catching a chain headed for the wall long before it reaches it, not
// shaving the estimate to the exact byte.

import { describe, expect, it } from "vitest"

import { TEAM_MIGRATIONS } from "../src/team-schema"

/** Comfortably under D1's measured ceiling (100, "Expression tree is too
 * large (maximum depth 100)") — a heuristic count, not SQLite's own parser,
 * so the margin is deliberate. */
const D1_EXPR_DEPTH_CAP = 60

/** Estimate the deepest an expression nests in one SQL statement: parenthesis
 * nesting plus the length of the longest OR/AND chain found at that nesting
 * level, combined at every point a group closes (or a connective is seen).
 * Comments and string literals are stripped first so a name or a sentence
 * containing the word "and"/"or" cannot inflate the count.
 *
 * Deliberately not a real SQL parser — see this file's own header for why
 * nothing here can reach SQLite's actual `sqlite3_limit`. It only has to
 * agree with reality on the ONE shape that has ever actually failed: a long
 * flat OR (or AND) chain, which is exactly what costs a left-deep binary
 * expression tree one level of depth per term. */
function maxExpressionDepth(statement: string): number {
  const cleaned = statement
    .replace(/--[^\n]*/g, "") // line comments
    .replace(/'(?:[^']|'')*'/g, "''") // string literals, quotes doubled inside

  let depth = 0
  let maxDepth = 0
  const chainAtDepth: number[] = [0]

  const tokenRe = /\(|\)|\bOR\b|\bAND\b/gi
  let m: RegExpExecArray | null
  while ((m = tokenRe.exec(cleaned))) {
    const tok = m[0].toUpperCase()
    if (tok === "(") {
      depth++
      chainAtDepth.push(0)
    } else if (tok === ")") {
      const chain = chainAtDepth.pop() ?? 0
      maxDepth = Math.max(maxDepth, depth + chain)
      depth = Math.max(depth - 1, 0)
    } else {
      chainAtDepth[chainAtDepth.length - 1]++
      maxDepth = Math.max(maxDepth, depth + chainAtDepth[chainAtDepth.length - 1])
    }
  }
  return maxDepth
}

describe("no migration sends D1 an expression deeper than its own ceiling", () => {
  it("every statement in every team migration stays under the census cap", () => {
    const over: string[] = []
    for (const m of TEAM_MIGRATIONS) {
      for (const statement of m.sql.split(";")) {
        const depth = maxExpressionDepth(statement)
        if (depth > D1_EXPR_DEPTH_CAP)
          over.push(
            `${m.version}: estimated depth ${depth} — ${
              statement.trim().split("\n").find((l) => /WHERE|SELECT/i.test(l))?.slice(0, 64) ?? ""
            }`
          )
      }
    }
    expect(
      over,
      `D1 refuses an expression past its real ceiling of 100 ("Expression tree is too large ` +
        `(maximum depth 100)"), and a refused migration leaves every existing team on the ` +
        `previous schema with the new code already deployed — the 15 Sep 2026 incident this ` +
        `file exists to prevent a repeat of. Move the test into a ROW SET and join against it ` +
        `instead of OR-chaining it into the expression:\n` +
        over.join("\n")
    ).toEqual([])
  })

  it("bites: the OLD 0088 predicate (160 BETWEENs OR-ed into one WHERE) is exactly what this census exists to catch", () => {
    // THE ACTUAL SQL 0088 USED TO SEND, kept here ONLY to prove the census
    // would have caught the 15 Sep 2026 incident before it shipped — not a
    // live migration, never executed against a database, not part of
    // TEAM_MIGRATIONS. Named by codepoint throughout (never a pasted glyph),
    // the same convention 0088's own SQL and every test file that touches it
    // keeps.
    const OLD_0088_SQL = `
WITH RECURSIVE
  mark_chars(id, mark, pos, ch) AS (
    SELECT id, mark, 1, substr(mark, 1, 1) FROM selectable_data WHERE mark IS NOT NULL
    UNION ALL
    SELECT id, mark, pos + 1, substr(mark, pos + 1, 1)
      FROM mark_chars
     WHERE pos < length(mark)
  ),
  flagged(id) AS (
    SELECT DISTINCT id FROM (SELECT id, unicode(ch) AS cp FROM mark_chars)
     WHERE cp = 0xA9
                  OR cp = 0xAE
                  OR cp = 0x200D
                  OR cp = 0x203C
                  OR cp = 0x2049
                  OR cp = 0x20E3
                  OR cp = 0x2122
                  OR cp = 0x2139
                  OR cp BETWEEN 0x2194 AND 0x2199
                  OR cp BETWEEN 0x21A9 AND 0x21AA
                  OR cp BETWEEN 0x231A AND 0x231B
                  OR cp = 0x2328
                  OR cp = 0x23CF
                  OR cp BETWEEN 0x23E9 AND 0x23F3
                  OR cp BETWEEN 0x23F8 AND 0x23FA
                  OR cp = 0x24C2
                  OR cp BETWEEN 0x25AA AND 0x25AB
                  OR cp = 0x25B6
                  OR cp = 0x25C0
                  OR cp BETWEEN 0x25FB AND 0x25FE
                  OR cp BETWEEN 0x2600 AND 0x2604
                  OR cp = 0x260E
                  OR cp = 0x2611
                  OR cp BETWEEN 0x2614 AND 0x2615
                  OR cp = 0x2618
                  OR cp = 0x261D
                  OR cp = 0x2620
                  OR cp BETWEEN 0x2622 AND 0x2623
                  OR cp = 0x2626
                  OR cp = 0x262A
                  OR cp BETWEEN 0x262E AND 0x262F
                  OR cp BETWEEN 0x2638 AND 0x263A
                  OR cp = 0x2640
                  OR cp = 0x2642
                  OR cp BETWEEN 0x2648 AND 0x2653
                  OR cp BETWEEN 0x265F AND 0x2660
                  OR cp = 0x2663
                  OR cp BETWEEN 0x2665 AND 0x2666
                  OR cp = 0x2668
                  OR cp = 0x267B
                  OR cp BETWEEN 0x267E AND 0x267F
                  OR cp BETWEEN 0x2692 AND 0x2697
                  OR cp = 0x2699
                  OR cp BETWEEN 0x269B AND 0x269C
                  OR cp BETWEEN 0x26A0 AND 0x26A1
                  OR cp = 0x26A7
                  OR cp BETWEEN 0x26AA AND 0x26AB
                  OR cp BETWEEN 0x26B0 AND 0x26B1
                  OR cp BETWEEN 0x26BD AND 0x26BE
                  OR cp BETWEEN 0x26C4 AND 0x26C5
                  OR cp = 0x26C8
                  OR cp BETWEEN 0x26CE AND 0x26CF
                  OR cp = 0x26D1
                  OR cp BETWEEN 0x26D3 AND 0x26D4
                  OR cp BETWEEN 0x26E9 AND 0x26EA
                  OR cp BETWEEN 0x26F0 AND 0x26F5
                  OR cp BETWEEN 0x26F7 AND 0x26FA
                  OR cp = 0x26FD
                  OR cp = 0x2702
                  OR cp = 0x2705
                  OR cp BETWEEN 0x2708 AND 0x270D
                  OR cp = 0x270F
                  OR cp = 0x2712
                  OR cp = 0x2714
                  OR cp = 0x2716
                  OR cp = 0x271D
                  OR cp = 0x2721
                  OR cp = 0x2728
                  OR cp BETWEEN 0x2733 AND 0x2734
                  OR cp = 0x2744
                  OR cp = 0x2747
                  OR cp = 0x274C
                  OR cp = 0x274E
                  OR cp BETWEEN 0x2753 AND 0x2755
                  OR cp = 0x2757
                  OR cp BETWEEN 0x2763 AND 0x2764
                  OR cp BETWEEN 0x2795 AND 0x2797
                  OR cp = 0x27A1
                  OR cp = 0x27B0
                  OR cp = 0x27BF
                  OR cp BETWEEN 0x2934 AND 0x2935
                  OR cp BETWEEN 0x2B05 AND 0x2B07
                  OR cp BETWEEN 0x2B1B AND 0x2B1C
                  OR cp = 0x2B50
                  OR cp = 0x2B55
                  OR cp = 0x3030
                  OR cp = 0x303D
                  OR cp = 0x3297
                  OR cp = 0x3299
                  OR cp = 0xFE0F
                  OR cp = 0x1F004
                  OR cp BETWEEN 0x1F02C AND 0x1F02F
                  OR cp BETWEEN 0x1F094 AND 0x1F09F
                  OR cp BETWEEN 0x1F0AF AND 0x1F0B0
                  OR cp = 0x1F0C0
                  OR cp BETWEEN 0x1F0CF AND 0x1F0D0
                  OR cp BETWEEN 0x1F0F6 AND 0x1F0FF
                  OR cp BETWEEN 0x1F170 AND 0x1F171
                  OR cp BETWEEN 0x1F17E AND 0x1F17F
                  OR cp = 0x1F18E
                  OR cp BETWEEN 0x1F191 AND 0x1F19A
                  OR cp BETWEEN 0x1F1AE AND 0x1F1E5
                  OR cp BETWEEN 0x1F1E6 AND 0x1F1FF
                  OR cp BETWEEN 0x1F201 AND 0x1F20F
                  OR cp = 0x1F21A
                  OR cp = 0x1F22F
                  OR cp BETWEEN 0x1F232 AND 0x1F23A
                  OR cp BETWEEN 0x1F23C AND 0x1F23F
                  OR cp BETWEEN 0x1F249 AND 0x1F25F
                  OR cp BETWEEN 0x1F266 AND 0x1F321
                  OR cp BETWEEN 0x1F324 AND 0x1F393
                  OR cp BETWEEN 0x1F396 AND 0x1F397
                  OR cp BETWEEN 0x1F399 AND 0x1F39B
                  OR cp BETWEEN 0x1F39E AND 0x1F3F0
                  OR cp BETWEEN 0x1F3F3 AND 0x1F3F5
                  OR cp BETWEEN 0x1F3F7 AND 0x1F3FA
                  OR cp BETWEEN 0x1F400 AND 0x1F4FD
                  OR cp BETWEEN 0x1F4FF AND 0x1F53D
                  OR cp BETWEEN 0x1F549 AND 0x1F54E
                  OR cp BETWEEN 0x1F550 AND 0x1F567
                  OR cp BETWEEN 0x1F56F AND 0x1F570
                  OR cp BETWEEN 0x1F573 AND 0x1F57A
                  OR cp = 0x1F587
                  OR cp BETWEEN 0x1F58A AND 0x1F58D
                  OR cp = 0x1F590
                  OR cp BETWEEN 0x1F595 AND 0x1F596
                  OR cp BETWEEN 0x1F5A4 AND 0x1F5A5
                  OR cp = 0x1F5A8
                  OR cp BETWEEN 0x1F5B1 AND 0x1F5B2
                  OR cp = 0x1F5BC
                  OR cp BETWEEN 0x1F5C2 AND 0x1F5C4
                  OR cp BETWEEN 0x1F5D1 AND 0x1F5D3
                  OR cp BETWEEN 0x1F5DC AND 0x1F5DE
                  OR cp = 0x1F5E1
                  OR cp = 0x1F5E3
                  OR cp = 0x1F5E8
                  OR cp = 0x1F5EF
                  OR cp = 0x1F5F3
                  OR cp BETWEEN 0x1F5FA AND 0x1F64F
                  OR cp BETWEEN 0x1F680 AND 0x1F6C5
                  OR cp BETWEEN 0x1F6CB AND 0x1F6D2
                  OR cp BETWEEN 0x1F6D5 AND 0x1F6E5
                  OR cp = 0x1F6E9
                  OR cp BETWEEN 0x1F6EB AND 0x1F6F0
                  OR cp BETWEEN 0x1F6F3 AND 0x1F6FF
                  OR cp BETWEEN 0x1F7DA AND 0x1F7FF
                  OR cp BETWEEN 0x1F80C AND 0x1F80F
                  OR cp BETWEEN 0x1F848 AND 0x1F84F
                  OR cp BETWEEN 0x1F85A AND 0x1F85F
                  OR cp BETWEEN 0x1F888 AND 0x1F88F
                  OR cp BETWEEN 0x1F8AE AND 0x1F8AF
                  OR cp BETWEEN 0x1F8BC AND 0x1F8BF
                  OR cp BETWEEN 0x1F8C2 AND 0x1F8CF
                  OR cp BETWEEN 0x1F8D9 AND 0x1F8FF
                  OR cp BETWEEN 0x1F90C AND 0x1F93A
                  OR cp BETWEEN 0x1F93C AND 0x1F945
                  OR cp BETWEEN 0x1F947 AND 0x1F9FF
                  OR cp BETWEEN 0x1FA58 AND 0x1FA5F
                  OR cp BETWEEN 0x1FA6E AND 0x1FAFF
                  OR cp BETWEEN 0x1FC00 AND 0x1FFFD
  )
UPDATE selectable_data
   SET mark = NULL
 WHERE id IN (SELECT id FROM flagged)
   AND NOT (
     -- THE ONE EXEMPTION: a well-formed flag, exactly two Regional Indicator
     -- codepoints and nothing else — R66's fourth ruling, "keep emojis for
     -- countries and languages only" — left alone even though a lone
     -- Regional Indicator (no pair) is still refused above.
     length(mark) = 2
     AND unicode(substr(mark, 1, 1)) BETWEEN 0x1F1E6 AND 0x1F1FF
     AND unicode(substr(mark, 2, 1)) BETWEEN 0x1F1E6 AND 0x1F1FF
   );

UPDATE selectable_data
   SET deactivated_at = NULL, deactivator_id = NULL, deactivator_email = NULL, deactivator_name = NULL
 WHERE is_default = 1 AND deactivated_at IS NOT NULL
   -- deactivator_id IS NOT NULL — see this migration's own header. Reserved
   -- for a row a PERSON deactivated through the door, never one a migration
   -- retired on purpose (0026's duplicates, 0034/0044's retired ticket and
   -- story words, 0042's Account status) — every one of those writes a
   -- deactivator_name and leaves deactivator_id untouched (still NULL),
   -- because a migration has no actor. Reactivating on that signal alone
   -- would have resurrected Bug, Feedback and every deduplicated value this
   -- ledger already retired on purpose.
   AND deactivator_id IS NOT NULL;
`

    const depths = OLD_0088_SQL.split(";").map(maxExpressionDepth)
    const worst = Math.max(...depths)
    expect(
      worst,
      "the census must flag the old OR-chain shape as over the cap — if this ever passes, " +
        "the census has stopped detecting the one incident it exists for"
    ).toBeGreaterThan(D1_EXPR_DEPTH_CAP)

    // A large margin over, not a coincidental one-off near the boundary — the
    // actual ~160-deep chain the incident's own error message measured
    // ("maximum depth 100").
    expect(worst).toBeGreaterThan(100)
  })

  it("the live 0088 migration (today's row-set rewrite) passes comfortably under the cap", () => {
    const m = TEAM_MIGRATIONS.find((x) => x.version.startsWith("0088_"))
    expect(m, "0088 must exist").toBeTruthy()
    const depths = m!.sql.split(";").map(maxExpressionDepth)
    expect(
      Math.max(...depths),
      "the row-set rewrite must stay far under the census cap — its depth no longer grows with the range count"
    ).toBeLessThan(D1_EXPR_DEPTH_CAP)
  })
})
