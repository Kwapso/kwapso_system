// LAW R68 — ONE IDENTITY PER SOURCE, RE-POINTED (0080).
//
// 0073 built `knowledge_sources.identity_key` to enforce "one identity per
// real-world thing, reader stripped" — the correct sentence, aimed at the
// wrong mechanism. Migration 0012's `idx_knowledge_sources_origin`, a UNIQUE
// PARTIAL index on `(origin_table, origin_row_id)`, already enforced exactly
// that fact, sixty-one migrations earlier, and the real fold
// (`workers/content/src/lib/knowledge-ingest.ts`'s
// `ON CONFLICT (origin_table, origin_row_id)`) has always keyed on THAT pair.
// `identity_key`'s own index sat beside it enforcing the same thing a second
// way, written by nothing (`grep -rn "identity_key" workers/content/src/`
// found two hits, both comments, before 0080 removed the column).
//
// This law's job did not go away when the column did. Its sentence — one
// identity per source, computed the one way the fold actually reads, never a
// string with the reader baked in — is right; only the mechanism it pointed
// at was redundant. Two clauses, each grounded in a different oracle, now
// pointed at the real thing:
//
//   (i) THE CONSTRAINT IS REAL. Read straight off 0012's own migration SQL
//       for the literal `CREATE UNIQUE INDEX idx_knowledge_sources_origin ON
//       knowledge_sources (origin_table, origin_row_id) WHERE origin_row_id
//       IS NOT NULL` — never trusted from a comment, exactly as clause (i)
//       always was, pointed sixty-one migrations earlier.
//   (ii) THE FOLD'S CONTRACT IS THE CENSUS, not the presence of one function.
//        The naive version of this clause — "does a file exist whose INSERT
//        carries the right ON CONFLICT" — is trivial by construction: there
//        is exactly one shared upsert function
//        (`workers/content/src/lib/knowledge-ingest.ts`), so of course one
//        file has it. That is the SAME vacuous-population failure clause
//        (ii) had under the old column, wearing a different hat. The real
//        question is a PER-ROW predicate: does anything that CLAIMS an
//        origin (its own INSERT names `origin_table` in its column list)
//        skip the SAFE HANDLING it obligates? Every `INSERT INTO
//        knowledge_sources` under `workers/content/src/` is censused —
//        three sites, pinned, same count as before this law was rewritten —
//        and each is decided individually: one is exempt
//        because it never claims an origin (a typed note — knowledge.ts),
//        one is compliant because it claims one and FOLDS
//        (knowledge-ingest.ts, `ON CONFLICT` — a sweep that re-reads on a
//        schedule and means "refresh this row"), and one is compliant a
//        DIFFERENT way (b-upload-dup, 11 Sep 2026): the uploaded-file create
//        (knowledge.ts) now claims an origin (`uploadIdentity()`, keyed on
//        content hash) and explicitly SELECTs for an existing row and
//        THROWS before ever reaching its own INSERT if one exists —
//        `PRE_CHECK_REFUSAL_OK` below, reasoned per site. Folding would be
//        the WRONG behaviour here: a re-upload is a person's mistake to be
//        told about ("already in the library"), never a re-read to merge
//        silently into the existing row the way a sweep's mirror is. The
//        mistake this whole law catches is ordinary and real: copy an
//        INSERT, add `origin_table`/`origin_row_id` because the new reader
//        mirrors something, and reach neither an `ON CONFLICT` NOR a
//        pre-check — a second, silent duplication path into the exact
//        subsystem this rebuild exists to de-duplicate. Proved three ways
//        below: breaking the compliant fold site's ON CONFLICT target turns
//        it red; breaking the compliant pre-check site's own guard turns it
//        red (knowledge-upload-dedup.test.ts, not here — this file censuses
//        SHAPE, that one proves BEHAVIOUR); and adding an unhandled origin
//        claim to the exempt site also turns it red here — the last one is
//        the one that matters for THIS file, because it proves the rule
//        decides a ROW rather than counting a population.
//
// THE PARSER'S OWN CAUTION, answered before trusting it: could
// `INSERT INTO knowledge_sources` and its `ON CONFLICT` be split across a
// concatenation or built from a template that isn't one literal, defeating a
// per-string test? Checked against the source on disk for all three sites
// before writing this: each is ONE template literal, start to end (no
// string concatenation, no literal built from a shared prefix/suffix
// variable) — the third interpolates one `${sqlString(...)}` expression
// inside its VALUES clause, but the column list and the ON CONFLICT clause
// either side of it are static text in the SAME literal. The extractor below
// still tracks `${…}` nesting depth rather than assuming that, so a future
// site that DOES nest a backtick inside an interpolation is read correctly
// rather than silently mis-split.

import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { sourceFiles } from "@shared/rules/source-scan"

const ROOT = join(__dirname, "..", "..", "..")
const CONTENT_SRC = join(ROOT, "workers", "content", "src")

/** Every template literal in a source file, respecting `${…}` nesting so a
 * literal backtick inside an interpolation (none exist in this repo's
 * knowledge_sources INSERTs today, but the parser does not get to assume
 * that) is never mistaken for the literal's own close. */
function templateLiterals(source: string): string[] {
  const out: string[] = []
  let i = 0
  while (i < source.length) {
    if (source[i] !== "`") {
      i++
      continue
    }
    let depth = 0
    let j = i + 1
    while (j < source.length) {
      const c = source[j]
      if (c === "\\") {
        j += 2
        continue
      }
      if (c === "`" && depth === 0) break
      if (c === "$" && source[j + 1] === "{") {
        depth++
        j += 2
        continue
      }
      if (c === "}" && depth > 0) {
        depth--
        j++
        continue
      }
      j++
    }
    out.push(source.slice(i, j + 1))
    i = j + 1
  }
  return out
}

describe("R68 — one identity per source", () => {
  it("0012's migration creates the UNIQUE index the fold has always keyed on", async () => {
    const { TEAM_MIGRATIONS } = await import("../../tenancy/src/team-schema")
    const m = TEAM_MIGRATIONS.find((x) => x.version === "0012_knowledge")
    expect(m, "0012_knowledge is not in the ledger").toBeTruthy()
    const sql = (m as { sql: string }).sql
    expect(
      sql,
      "0012 no longer creates the unique index the real fold (knowledge-ingest.ts's ON CONFLICT) depends on"
    ).toMatch(
      /CREATE UNIQUE INDEX idx_knowledge_sources_origin ON knowledge_sources \(origin_table, origin_row_id\)\s+WHERE origin_row_id IS NOT NULL/
    )
  })

  // A CLAIMED ORIGIN MAY BE HANDLED SAFELY TWO WAYS, NOT JUST ONE: fold
  // (`ON CONFLICT`, a sweep refreshing a row it expects to have seen before)
  // or an explicit pre-check-and-refuse (a person's own act, where silently
  // merging into someone else's existing row would be the wrong answer, not
  // a convenience). This is DATA, not a third regex, so a new site choosing
  // this pattern is a reviewed, named decision — reasoned per site, rot-
  // checked the same way `folds` is: `signature` is a substring unique to
  // ONE literal in `file`, because knowledge.ts holds two INSERT sites and a
  // per-file exemption would silently cover both.
  const PRE_CHECK_REFUSAL_OK: { file: string; signature: string; reason: string }[] = [
    {
      file: "lib/knowledge.ts",
      signature: "file_url",
      reason:
        "b-upload-dup (11 Sep 2026): createFileSource SELECTs for an existing " +
        "(origin_table, origin_row_id) and THROWS a clean 409 before this INSERT " +
        "runs at all — see the SELECT immediately above it and " +
        "knowledge-upload-dedup.test.ts for the behaviour proof. A re-upload must " +
        "be refused and told about the original, never folded into it.",
    },
  ]

  it("every INSERT into knowledge_sources that claims an origin folds OR pre-checks — three sites, pinned", () => {
    const files = sourceFiles(CONTENT_SRC, { extensions: [".ts"], skipTests: true })
    const INSERT_START = /INSERT INTO knowledge_sources\b/

    const sites: { file: string; literal: string; claimsOrigin: boolean; folds: boolean; preChecked: boolean }[] = []
    for (const f of files) {
      for (const literal of templateLiterals(f.source)) {
        if (!INSERT_START.test(literal)) continue
        sites.push({
          file: f.rel,
          literal,
          claimsOrigin: /\borigin_table\b/.test(literal),
          folds: /ON CONFLICT\s*\(\s*origin_table\s*,\s*origin_row_id\s*\)/.test(literal),
          preChecked: PRE_CHECK_REFUSAL_OK.some((p) => p.file === f.rel && literal.includes(p.signature)),
        })
      }
    }

    // THE BLINDNESS TRIPWIRE, pinned to an exact number rather than "> 0" —
    // a fourth INSERT site appearing or one of the three vanishing is a
    // decision somebody makes deliberately, not a silent drift in what this
    // law covers.
    // Sorted before comparing: the walk order sourceFiles() returns is a
    // filesystem detail, and the POPULATION being pinned is which files and
    // how many sites, not which order the directory happened to list them.
    expect(
      sites.map((s) => s.file).sort(),
      "expected exactly three INSERT INTO knowledge_sources sites under workers/content/src/ — " +
        "if this list changed on purpose, update the pinned count with it"
    ).toEqual(
      [
        "lib/knowledge.ts", // the typed-note create — no origin, exempt
        "lib/knowledge.ts", // the uploaded-file create — claims an origin, pre-checks
        "lib/knowledge-ingest.ts", // the generic sweep — claims an origin, folds
      ].sort()
    )

    const violators = sites.filter((s) => s.claimsOrigin && !s.folds && !s.preChecked)
    expect(
      violators.map((s) => s.file),
      "these INSERTs claim an origin (origin_table in the column list) without folding on it " +
        "(ON CONFLICT (origin_table, origin_row_id)) or a named, reasoned pre-check " +
        "(PRE_CHECK_REFUSAL_OK above) — a second, silent duplication path into " +
        "the exact subsystem this rebuild exists to de-duplicate:\n" +
        violators.map((s) => s.file).join("\n")
    ).toEqual([])

    // The rule decides a ROW, not a population — at least one exempt site
    // (no origin claim) and at least one compliant site (claims and folds)
    // must both exist, or the census above could be vacuously satisfied by
    // every site landing on the same side.
    expect(
      sites.some((s) => !s.claimsOrigin),
      "no exempt site found — the census has nothing to contrast against"
    ).toBe(true)
    expect(
      sites.some((s) => s.claimsOrigin && s.folds),
      "no compliant site found — the fold itself may be missing"
    ).toBe(true)
  })
})
