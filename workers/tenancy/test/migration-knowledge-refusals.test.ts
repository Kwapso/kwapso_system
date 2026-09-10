// 0079 — THE REFUSAL LOG (BUILD-5-knowledge-rebuild.md §5-6, KB-AUDIT.md §7).
// A refusal keeps what it saw — the shortlist that fell short, not just the
// fact that nothing survived — so the next "why did it say no to that" is a
// query rather than a reproduction. Write side only; no read door yet (see
// the migration's own comment for why that is not an oversight).

import { DatabaseSync } from "node:sqlite"
import { describe, expect, it } from "vitest"
import { TEAM_MIGRATIONS } from "../src/team-schema"

const VERSION = "0079_a_refusal_remembers_what_it_saw"

function migrated(): DatabaseSync {
  const db = new DatabaseSync(":memory:")
  for (const m of TEAM_MIGRATIONS) {
    db.exec(m.sql)
    if (m.version === VERSION) return db
  }
  throw new Error(`${VERSION} is not in the ledger`)
}

const columns = (db: DatabaseSync, table: string): Set<string> =>
  new Set(
    (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name)
  )

describe("0079 — knowledge_refusals remembers what a refusal saw", () => {
  it("is in the ledger, numbered after 0078, and applies cleanly onto a real database", () => {
    expect(TEAM_MIGRATIONS.some((m) => m.version === VERSION)).toBe(true)
    expect(() => migrated()).not.toThrow()
  })

  it("creates the table with a question, a reason, a shortlist and who asked", () => {
    const db = migrated()
    const cols = columns(db, "knowledge_refusals")
    for (const c of ["id", "question", "compartments", "reason", "shortlist", "asked_by_user_id", "created_at"])
      expect(cols.has(c), `knowledge_refusals.${c} is missing`).toBe(true)
  })

  it("holds the shortlist as real, readable JSON — the whole point of the table", () => {
    const db = migrated()
    const shortlist = JSON.stringify([{ id: "C1", score: 0.29 }])
    db.exec(
      `INSERT INTO knowledge_refusals (id, question, compartments, reason, shortlist, asked_by_user_id, created_at)
         VALUES ('R1', 'what is our parental leave policy?', '[]', 'The question named no client, so I searched the whole knowledge base.', '${shortlist}', 'U1', '2026-09-10');`
    )
    const row = db.prepare("SELECT shortlist FROM knowledge_refusals WHERE id = 'R1'").get() as {
      shortlist: string
    }
    expect(JSON.parse(row.shortlist)).toEqual([{ id: "C1", score: 0.29 }])
  })

  it("an index on created_at exists — this table is written far more than it is read", () => {
    const db = migrated()
    const idx = db
      .prepare("SELECT sql FROM sqlite_master WHERE type = 'index' AND tbl_name = 'knowledge_refusals'")
      .all() as { sql: string }[]
    expect(idx.some((i) => i.sql?.includes("created_at"))).toBe(true)
  })
})
