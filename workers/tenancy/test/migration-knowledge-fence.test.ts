// 0075 GIVES THE FENCE SOMEWHERE TO LIVE ONCE ONE SOURCE CAN HOLD TWO
// PEOPLE'S SIGHTINGS (BUILD-5-knowledge-rebuild.md; kb_B1's fold analysis,
// hub tick 8 — "the fence the fold cannot ship without").
//
// THE FAULT THIS CLOSES. Retrieval's compartment fence today reads
// `knowledge_chunks.owner_user_id` directly: NULL means the team's, a value
// means one person's, and that is a SINGLE COLUMN answering a question about
// ONE person's sight of the source. 0073 folded the multi-person duplicate
// (one Google item, one source, many `knowledge_sightings` rows) precisely so
// two people's different answers — Aurora filed a folder privately, Alex
// filed the SAME folder as the team's — can both be recorded. A single
// `owner_user_id` on the chunk cannot hold both once the sources are one row;
// whichever sighting wrote it last would silently decide the other person's
// answer too.
//
// `team_visible` is the fence's own half of `readableBy`'s two conditions
// (knowledge-identity.ts, fix/kb-gate): a source is team-readable when SOME
// live sighting (no `gone_at`) sits on the 'team' shelf. It is a DENORMALISED
// COPY of a fact that lives on the sightings SET, exactly the shape
// `owner_user_id` already was one level up — which is why the design
// constraint that matters is not this migration, it is the WRITE PATH: every
// place a sighting's `shelf` or `gone_at` changes must recompute this flag in
// the SAME statement or transaction, never a follow-up write that can be
// skipped, or the flag goes stale and stays stale silently. That recompute is
// kb_B1's — the read/write side — and is proved there by a test that
// recomputes the flag from `knowledge_sightings` across a whole corpus and
// asserts equality. This suite proves only the SCHEMA half: the column
// exists, defaults safely, and the one-time backfill this migration performs
// (there are no sightings yet for any pre-existing row, so the only fact
// available to backfill FROM is the single `owner_user_id` column being
// replaced) preserves exactly the visibility the base already has today.
//
// SAFE DEFAULT, SAME REASONING AS 0074's `generated_only`: 0 (private) is the
// direction that costs a missed answer rather than an over-shared one. A row
// inserted after this migration with no explicit value is NOT team-visible
// until something explicitly says it is — the opposite of the old
// `owner_user_id IS NULL` default, and deliberately so: a forgotten column on
// a write path should fail closed, not open.

import { DatabaseSync } from "node:sqlite"
import { describe, expect, it } from "vitest"
import { TEAM_MIGRATIONS } from "../src/team-schema"

const VERSION = "0075_the_fence_the_fold_cannot_ship_without"

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

const columns = (db: DatabaseSync, table: string): Set<string> =>
  new Set(
    (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name)
  )

describe("0075 — team_visible, the denormalised half of the fence", () => {
  it("is in the ledger, numbered after 0074, and applies cleanly", () => {
    expect(TEAM_MIGRATIONS.some((m) => m.version === VERSION)).toBe(true)
    expect(() => migrated()).not.toThrow()
  })

  it("adds team_visible to both knowledge_chunks and knowledge_terms", () => {
    const db = migrated()
    expect(columns(db, "knowledge_chunks").has("team_visible")).toBe(true)
    expect(columns(db, "knowledge_terms").has("team_visible")).toBe(true)
  })

  it("defaults to 0 (fail closed) for a row inserted after the migration with no explicit value", () => {
    const db = migrated()
    db.exec(
      `INSERT INTO knowledge_sources (id, kind, title, created_at) VALUES ('S1','document','D','2026-09-10');
       INSERT INTO knowledge_chunks (id, source_id, compartment, seq, text, created_at)
         VALUES ('C1','S1','agency',0,'x','2026-09-10');`
    )
    expect(
      db.prepare("SELECT team_visible FROM knowledge_chunks WHERE id = 'C1'").get()
    ).toMatchObject({ team_visible: 0 })
  })

  it("backfills existing team-wide material (owner_user_id IS NULL) as team-visible", () => {
    const db = baseUpTo()
    db.exec(
      `INSERT INTO knowledge_sources (id, kind, title, created_at) VALUES ('S1','document','Team doc','2026-09-01');
       INSERT INTO knowledge_chunks (id, source_id, compartment, owner_user_id, seq, text, created_at)
         VALUES ('C1','S1','agency',NULL,0,'team material','2026-09-01');
       INSERT INTO knowledge_terms (term, chunk_id, compartment, owner_user_id, weight)
         VALUES ('team','C1','agency',NULL,1);`
    )
    const m = TEAM_MIGRATIONS.find((x) => x.version === VERSION)
    db.exec((m as { sql: string }).sql)
    expect(
      db.prepare("SELECT team_visible FROM knowledge_chunks WHERE id = 'C1'").get()
    ).toMatchObject({ team_visible: 1 })
    expect(
      db.prepare("SELECT team_visible FROM knowledge_terms WHERE chunk_id = 'C1'").get()
    ).toMatchObject({ team_visible: 1 })
  })

  it("backfills existing PRIVATE material (owner_user_id set) as NOT team-visible", () => {
    const db = baseUpTo()
    db.exec(
      `INSERT INTO knowledge_sources (id, kind, title, created_at) VALUES ('S1','email','Private mail','2026-09-01');
       INSERT INTO knowledge_chunks (id, source_id, compartment, owner_user_id, seq, text, created_at)
         VALUES ('C1','S1','agency','U_ALEX',0,'private material','2026-09-01');
       INSERT INTO knowledge_terms (term, chunk_id, compartment, owner_user_id, weight)
         VALUES ('private','C1','agency','U_ALEX',1);`
    )
    const m = TEAM_MIGRATIONS.find((x) => x.version === VERSION)
    db.exec((m as { sql: string }).sql)
    expect(
      db.prepare("SELECT team_visible FROM knowledge_chunks WHERE id = 'C1'").get()
    ).toMatchObject({ team_visible: 0 })
    expect(
      db.prepare("SELECT team_visible FROM knowledge_terms WHERE chunk_id = 'C1'").get()
    ).toMatchObject({ team_visible: 0 })
  })

  it("the backfill preserves the OLD readable-by-team population exactly — nothing gains or loses team visibility at the migration boundary", () => {
    const db = baseUpTo()
    db.exec(
      `INSERT INTO knowledge_sources (id, kind, title, created_at) VALUES
         ('S1','document','Team A','2026-09-01'),
         ('S2','document','Team B','2026-09-01'),
         ('S3','email','Mine','2026-09-01');
       INSERT INTO knowledge_chunks (id, source_id, compartment, owner_user_id, seq, text, created_at) VALUES
         ('C1','S1','agency',NULL,0,'a','2026-09-01'),
         ('C2','S2','agency',NULL,0,'b','2026-09-01'),
         ('C3','S3','agency','U_ALEX',0,'c','2026-09-01');`
    )
    const before = new Set(
      (
        db
          .prepare("SELECT id FROM knowledge_chunks WHERE owner_user_id IS NULL")
          .all() as { id: string }[]
      ).map((r) => r.id)
    )
    const m = TEAM_MIGRATIONS.find((x) => x.version === VERSION)
    db.exec((m as { sql: string }).sql)
    const after = new Set(
      (
        db
          .prepare("SELECT id FROM knowledge_chunks WHERE team_visible = 1")
          .all() as { id: string }[]
      ).map((r) => r.id)
    )
    expect(after).toEqual(before)
  })
})
