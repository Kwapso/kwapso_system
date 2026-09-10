// 0074 GIVES A SOURCE A WAY TO SAY IT HAS NOTHING MORE TO SAY THAN THE
// SENTENCE THE APP WROTE FOR IT (KB-AUDIT.md §4.3, BUILD-5-knowledge-rebuild.md).
//
// THREE DESIGNS WERE TRIED AND FAILED BEFORE THIS ONE — worth recording here
// because the failures are what prove a column is the right shape, not a
// convenience:
//
//   1. A CENSUS ("every live source of this kind produces exactly one short
//      chunk") measured 2,589 of 3,933 sources, 1,309 of them tickets. A
//      short ticket is not a stub — length alone cannot tell the two apart.
//   2. A KIND-LEVEL FLAG ("declare `person`/`account`/`contact` as card-only
//      kinds") turned out false on inspection: every kind the audit named has
//      a reader that folds in real free text (person: headline/strengths/
//      weaknesses; account: about, apps, sprints, tickets by name; task:
//      detail and logged-time notes). The audit's stubs were rows where
//      those fields happened to be EMPTY, not a property of the kind. Only
//      `dropdown` and `portal_login` fold no free text at all — 22 of 3,933
//      live sources — so a kind-level flag would read as "the audit's
//      complaint is fixed" while leaving it exactly where it was.
//   3. So: card-ness is a property of the ROW, decided by the READER, at the
//      moment it builds the body — because that moment is the only one where
//      "did this row say anything beyond what the app generated for it" is
//      still a fact anybody holds. Once the two halves are joined into one
//      body string, they are indistinguishable, and nothing downstream
//      (chunking, embedding, a re-read of the row) can recover which case a
//      given source was. That is why this cannot be derived later — it has
//      to be recorded at ingest or not at all.
//
// DEFAULT 0 IS THE SAFE DIRECTION, not a guess: a wrong 0 (a real stub marked
// quotable) costs one weak answer slot, exactly the pre-existing bug; a wrong
// 1 (real material marked generated-only) SILENTLY stops a person's own words
// from ever being quoted, which is worse and invisible. Every row that
// predates this column, and every kind's reader until it is taught to set the
// flag, reads as "quotable" — the behaviour this base already has today.

import { DatabaseSync } from "node:sqlite"
import { describe, expect, it } from "vitest"
import { TEAM_MIGRATIONS } from "../src/team-schema"

const VERSION = "0074_findable_but_not_quotable"

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

describe("0074 — a source can say it has nothing to quote beyond its own generated sentence", () => {
  it("is in the ledger, numbered after 0073, and applies cleanly", () => {
    expect(TEAM_MIGRATIONS.some((m) => m.version === VERSION)).toBe(true)
    expect(() => migrated()).not.toThrow()
  })

  it("adds generated_only to knowledge_sources", () => {
    const db = migrated()
    const cols = new Set(
      (db.prepare("PRAGMA table_info(knowledge_sources)").all() as { name: string }[]).map((c) => c.name)
    )
    expect(cols.has("generated_only")).toBe(true)
  })

  it("defaults to 0 — every existing row, and every kind whose reader has not been taught to set it, stays quotable", () => {
    const db = migrated()
    db.exec(
      `INSERT INTO knowledge_sources (id, kind, title, created_at) VALUES ('S1','account','Untitled','2026-09-10');`
    )
    expect(
      db.prepare("SELECT generated_only FROM knowledge_sources WHERE id = 'S1'").get()
    ).toMatchObject({ generated_only: 0 })
  })

  it("a row a reader marks generated-only is distinguishable from one it does not", () => {
    const db = migrated()
    db.exec(
      `INSERT INTO knowledge_sources (id, kind, title, generated_only, created_at)
         VALUES ('S1','account','Empty Co','1','2026-09-10');
       INSERT INTO knowledge_sources (id, kind, title, generated_only, created_at)
         VALUES ('S2','account','Chatty Co','0','2026-09-10');`
    )
    const rows = db
      .prepare("SELECT id, generated_only FROM knowledge_sources ORDER BY id")
      .all()
    expect(rows).toEqual([
      { id: "S1", generated_only: 1 },
      { id: "S2", generated_only: 0 },
    ])
  })
})
