// LAW R68 — ONE IDENTITY PER SOURCE.
//
// BUILD-5-knowledge-rebuild.md's own fault, closed by 0073: a Google item's
// key used to be `<readerId>:<externalId>`, so the same Drive folder shared
// with two colleagues filed as two `knowledge_sources` rows, each chunked,
// embedded and stored separately. The fix is a single identity per
// real-world thing, computed by ONE seam — `identityKey()`
// (`workers/content/src/lib/knowledge-identity.ts`) — and enforced by ONE
// database constraint, a partial unique index on `identity_key`.
//
// TWO CLAUSES, each grounded in a different oracle so the check can never be
// a parser agreeing with itself:
//
//   (i) THE CONSTRAINT IS REAL. Read straight off 0073's own migration SQL
//       (`workers/tenancy/src/team-schema/migrations.ts`) — not trusted from
//       a comment, and not assumed from the column existing (0073's suite
//       already proves the column and the index against real SQLite; this
//       law asks the narrower, load-bearing question: is the CONSTRAINT
//       exactly the one the law promises).
//   (ii) THE SEAM IS THE ONLY WRITER. Any file under `workers/content/src/`
//        that writes the `identity_key` column — in an INSERT column list or
//        an UPDATE's SET clause — must import `identityKey` from
//        `knowledge-identity.ts`. This is currently checked against ZERO
//        write sites: as of 10 Sep 2026 nothing in the ingest sweep writes
//        `identity_key` yet (DATA-MODEL.md says so plainly), so the census
//        finds nothing to violate. That is not a blind test — the CENSUS
//        ITSELF is real (it would catch a hand-rolled `<reader>:<id>` string
//        landing in an ingest file tomorrow without importing the seam), and
//        clause (i) alone already proves the law is enforceable today. This
//        is the cheapest moment to write it: the day it finds a real
//        violator is the day this comment's "zero write sites" sentence goes
//        stale, and that sentence is a fact this test itself will falsify
//        the moment it happens, which is what a real check does and a
//        comment alone cannot.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { sourceFiles } from "@shared/rules/source-scan"

const ROOT = join(__dirname, "..", "..", "..")
const CONTENT_SRC = join(ROOT, "workers", "content", "src")

describe("R68 — one identity per source", () => {
  it("0073's migration creates a UNIQUE index on identity_key, partial on NOT NULL", async () => {
    const { TEAM_MIGRATIONS } = await import("../../tenancy/src/team-schema")
    const m = TEAM_MIGRATIONS.find((x) => x.version === "0073_the_knowledge_base_is_rebuilt")
    expect(m, "0073_the_knowledge_base_is_rebuilt is not in the ledger").toBeTruthy()
    const sql = (m as { sql: string }).sql
    expect(
      sql,
      "0073 no longer creates the partial unique index one identity per source depends on"
    ).toMatch(
      /CREATE UNIQUE INDEX idx_knowledge_sources_identity ON knowledge_sources \(identity_key\)\s+WHERE identity_key IS NOT NULL/
    )
  })

  it("identityKey is a real, single-purpose seam — one function, one file", () => {
    const identityFile = readFileSync(join(CONTENT_SRC, "lib", "knowledge-identity.ts"), "utf8")
    expect(identityFile).toMatch(/export function identityKey\(/)
    // No second file in the tree may declare a function of the same name —
    // a shadow seam is how "the one seam" quietly becomes two.
    const files = sourceFiles(CONTENT_SRC, { extensions: [".ts"], skipTests: true })
    const declaredElsewhere = files.filter(
      (f) => f.rel !== join("lib", "knowledge-identity.ts") && /function identityKey\(/.test(f.source)
    )
    expect(
      declaredElsewhere.map((f) => f.rel),
      "identityKey must be declared in exactly one file"
    ).toEqual([])
  })

  it("every write of identity_key comes from a file that imports the seam", () => {
    const files = sourceFiles(CONTENT_SRC, { extensions: [".ts"], skipTests: true })
    // A WRITE is identity_key inside an INSERT's column list, or on the left
    // of `=` in an UPDATE's SET clause — deliberately narrower than "the
    // string identity_key appears", which would also catch an ordinary
    // SELECT (e.g. `SELECT identity_key, title FROM …`) and wrongly demand
    // the seam of a file that only ever reads the column.
    const INSERT_WRITE = /INSERT INTO knowledge_sources\s*\([^)]*\bidentity_key\b[^)]*\)/
    const UPDATE_WRITE = /UPDATE knowledge_sources[\s\S]{0,400}?\bSET\b[\s\S]{0,400}?\bidentity_key\s*=/
    const IMPORTS_SEAM = /from ["']\.\.?\/.*knowledge-identity["']|from ["'].*\/lib\/knowledge-identity["']/
    const writers = files.filter(
      (f) => (INSERT_WRITE.test(f.source) || UPDATE_WRITE.test(f.source)) && f.rel !== join("lib", "knowledge-identity.ts")
    )
    const missingTheSeam = writers.filter((f) => !IMPORTS_SEAM.test(f.source))
    expect(
      missingTheSeam.map((f) => f.rel),
      "these files write identity_key without importing identityKey from knowledge-identity.ts — " +
        "the one seam this law exists to keep singular:\n" +
        missingTheSeam.map((f) => f.rel).join("\n")
    ).toEqual([])
    // The blindness tripwire this repo's own laws are held to: a census that
    // silently stopped matching anything must say so rather than pass by
    // finding nothing to check, forever, without anyone noticing the walk
    // itself had gone empty.
    expect(files.length, "the source walk over workers/content/src found nothing — the census is blind").toBeGreaterThan(10)
  })
})
