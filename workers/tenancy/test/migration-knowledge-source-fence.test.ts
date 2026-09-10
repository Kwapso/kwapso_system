// 0076 GIVES knowledge_sources ITS OWN team_visible — the column 0075 gave
// to knowledge_chunks and knowledge_terms but not to the table
// knowledge_sightings is actually keyed to. Without this, kb_B1's write path
// has nowhere to stamp the fence's team half from the sightings SET before
// denormalising it down onto every chunk and term the source owns.
//
// A NEW migration, not an edit to 0075: 0074/0075 had already merged to
// main before this gap surfaced, and the ledger is append-only — a shipped
// migration's SQL is never rewritten, however incomplete it turns out to be.
//
// Same three properties 0075 already carries, restated in the migration's
// own comment because a reader following knowledge_sources.team_visible
// should not have to also read 0075 to learn them: this flag is a
// NARROWING AID, never the authoritative answer (the real fence is
// readerClause = ownerClause AND appClause, knowledge.ts:602 — three
// settings, private/app/team, and only the read-back join to
// knowledge_sources applies the app half); knowledge_terms.team_visible
// stays deliberately owner-half-only; and none of this forecloses
// visible_to_app_id's own still-open fold problem.

import { DatabaseSync } from "node:sqlite"
import { describe, expect, it } from "vitest"
import { TEAM_MIGRATIONS } from "../src/team-schema"

const VERSION = "0076_the_source_gets_its_own_team_visible"

function baseUpTo(): DatabaseSync {
  const db = new DatabaseSync(":memory:")
  for (const m of TEAM_MIGRATIONS) {
    if (m.version === VERSION) return db
    db.exec(m.sql)
  }
  throw new Error(`${VERSION} is not in the ledger`)
}

function migrated(): DatabaseSync {
  const db = baseUpTo()
  const m = TEAM_MIGRATIONS.find((x) => x.version === VERSION)
  if (!m) throw new Error(`${VERSION} is not in the ledger`)
  db.exec(m.sql)
  return db
}

describe("0076 — knowledge_sources gets the team_visible column its own sightings need", () => {
  it("is in the ledger, numbered after 0075, and applies cleanly", () => {
    expect(TEAM_MIGRATIONS.some((m) => m.version === VERSION)).toBe(true)
    expect(() => migrated()).not.toThrow()
  })

  it("adds team_visible to knowledge_sources", () => {
    const db = migrated()
    const cols = new Set(
      (db.prepare("PRAGMA table_info(knowledge_sources)").all() as { name: string }[]).map((c) => c.name)
    )
    expect(cols.has("team_visible")).toBe(true)
  })

  it("defaults to 0 (private, fail closed) for a source written after the migration", () => {
    const db = migrated()
    db.exec(`INSERT INTO knowledge_sources (id, kind, title, created_at) VALUES ('S1','document','D','2026-09-10');`)
    expect(
      db.prepare("SELECT team_visible FROM knowledge_sources WHERE id = 'S1'").get()
    ).toMatchObject({ team_visible: 0 })
  })

  it("backfills existing team-wide sources (owner_user_id IS NULL) as team-visible", () => {
    const db = baseUpTo()
    db.exec(
      `INSERT INTO knowledge_sources (id, kind, title, owner_user_id, created_at)
         VALUES ('S1','document','Team doc',NULL,'2026-09-01');`
    )
    const m = TEAM_MIGRATIONS.find((x) => x.version === VERSION)
    db.exec((m as { sql: string }).sql)
    expect(
      db.prepare("SELECT team_visible FROM knowledge_sources WHERE id = 'S1'").get()
    ).toMatchObject({ team_visible: 1 })
  })

  it("backfills existing private sources (owner_user_id set) as NOT team-visible", () => {
    const db = baseUpTo()
    db.exec(
      `INSERT INTO knowledge_sources (id, kind, title, owner_user_id, created_at)
         VALUES ('S1','email','Private mail','U_ALEX','2026-09-01');`
    )
    const m = TEAM_MIGRATIONS.find((x) => x.version === VERSION)
    db.exec((m as { sql: string }).sql)
    expect(
      db.prepare("SELECT team_visible FROM knowledge_sources WHERE id = 'S1'").get()
    ).toMatchObject({ team_visible: 0 })
  })

  it("the backfill preserves the OLD readable-by-team population exactly", () => {
    const db = baseUpTo()
    db.exec(
      `INSERT INTO knowledge_sources (id, kind, title, owner_user_id, created_at) VALUES
         ('S1','document','Team A',NULL,'2026-09-01'),
         ('S2','document','Team B',NULL,'2026-09-01'),
         ('S3','email','Mine','U_ALEX','2026-09-01');`
    )
    const before = new Set(
      (db.prepare("SELECT id FROM knowledge_sources WHERE owner_user_id IS NULL").all() as { id: string }[]).map(
        (r) => r.id
      )
    )
    const m = TEAM_MIGRATIONS.find((x) => x.version === VERSION)
    db.exec((m as { sql: string }).sql)
    const after = new Set(
      (db.prepare("SELECT id FROM knowledge_sources WHERE team_visible = 1").all() as { id: string }[]).map(
        (r) => r.id
      )
    )
    expect(after).toEqual(before)
  })
})
