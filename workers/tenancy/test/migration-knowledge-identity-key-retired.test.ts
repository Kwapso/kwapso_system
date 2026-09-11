// 0080 RETIRES knowledge_sources.identity_key — R68 REPOINTED, NOT DROPPED.
//
// 0073 built identity_key to be "one identity per real-world thing, reader
// stripped", enforced by its own partial unique index. Measured before this
// migration was written (see workers/content/test/one-identity-per-source.test.ts
// and the hub's own independent check): 0012's `idx_knowledge_sources_origin`,
// a UNIQUE PARTIAL index on `(origin_table, origin_row_id)`, already enforces
// exactly that fact, and the real fold (knowledge-ingest.ts's `ON CONFLICT
// (origin_table, origin_row_id)`) has been keying on it — not on
// `identity_key` — since it landed. identity_key's own INPUT is those same
// two fields (`identityKey()` just joins them into one string), so its index
// was a SECOND constraint enforcing ONE invariant, never written to, never
// read outside a comment.
//
// R68 itself is not wrong and is not retired — its sentence ("one identity
// per source, computed by one seam, never a string with the reader baked
// in") is the correct law, aimed at the wrong mechanism. This migration
// removes the redundant column; the law re-points at the real one.
//
// Column is NULL on every row that has ever existed (confirmed: nothing in
// workers/content/src/ has ever written it), so the drop loses no data.
// DROP INDEX before DROP COLUMN — measured: SQLite refuses to drop a column
// a live index still references ("error in index … after drop column: no
// such column").

import { DatabaseSync } from "node:sqlite"
import { describe, expect, it } from "vitest"
import { TEAM_MIGRATIONS } from "../src/team-schema"

const VERSION = "0080_identity_key_retired_the_fold_was_never_on_it"

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

describe("0080 — identity_key is retired, 0012's origin index is what the fold actually uses", () => {
  it("is in the ledger, numbered after 0079, and applies cleanly", () => {
    expect(TEAM_MIGRATIONS.some((m) => m.version === VERSION)).toBe(true)
    expect(() => migrated()).not.toThrow()
  })

  it("removes identity_key from knowledge_sources", () => {
    const db = migrated()
    const cols = new Set(
      (db.prepare("PRAGMA table_info(knowledge_sources)").all() as { name: string }[]).map((c) => c.name)
    )
    expect(cols.has("identity_key")).toBe(false)
  })

  it("removes idx_knowledge_sources_identity", () => {
    const db = migrated()
    const idx = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_knowledge_sources_identity'")
      .get()
    expect(idx).toBeUndefined()
  })

  it("0012's idx_knowledge_sources_origin — the index the fold actually keys on — survives untouched", () => {
    const db = migrated()
    const idx = db
      .prepare("SELECT sql FROM sqlite_master WHERE type = 'index' AND name = 'idx_knowledge_sources_origin'")
      .get() as { sql: string } | undefined
    expect(idx?.sql, "0012's origin index must not be touched by this migration").toBeTruthy()
    expect(idx!.sql).toContain("(origin_table, origin_row_id)")
  })

  it("existing rows and their other columns survive the drop untouched", () => {
    const db = baseUpTo()
    db.exec(
      `INSERT INTO knowledge_sources (id, kind, title, origin_table, origin_row_id, created_at)
         VALUES ('S1','document','A title','google_drive','file-1','2026-09-10');`
    )
    const m = TEAM_MIGRATIONS.find((x) => x.version === VERSION)
    db.exec((m as { sql: string }).sql)
    expect(
      db.prepare("SELECT id, title, origin_table, origin_row_id FROM knowledge_sources WHERE id = 'S1'").get()
    ).toMatchObject({ id: "S1", title: "A title", origin_table: "google_drive", origin_row_id: "file-1" })
  })
})
