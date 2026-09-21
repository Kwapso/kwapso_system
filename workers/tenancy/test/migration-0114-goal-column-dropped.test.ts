// 0114 KILLS stories.contributes_to_goal, not parked, deleted.
//
// 0107 minted this column ("let users flag which stories contribute to it",
// Aurora's 20 Sep 2026 ruling). The three UI surfaces that set/showed it were
// pulled and PARKED the next day (B43, documents/UI-RULEBOOK.md), with the
// column and the create/update doors left untouched underneath, the same
// "display gone, data stays" shape `work/moscow-chip` still takes today.
// Aurora, reading that parked shape back the same round, verbatim: "not
// parked, kill it." This migration is the data half of the kill: the column
// itself is dropped, not merely left unmounted.
//
// D1 supports `ALTER TABLE ... DROP COLUMN`, the same mechanism 0080 used to
// retire `knowledge_sources.identity_key` (see
// migration-knowledge-identity-key-retired.test.ts, the identical shape this
// file borrows). No index rides `stories.contributes_to_goal`: 0107 added it
// plain, `INTEGER NOT NULL DEFAULT 0`, no matching `CREATE INDEX`, so unlike
// 0080 there is no DROP INDEX to sequence first.
//
// `sprints.goal_summary` ("Phase goal") is a DIFFERENT fact, minted by the
// same 0107 migration, and is not touched here. See
// team-schema.test.ts's own "sprints.goal_summary exists" assertion,
// unchanged by this migration.

import { DatabaseSync } from "node:sqlite"
import { describe, expect, it } from "vitest"
import { TEAM_MIGRATIONS } from "../src/team-schema"

const VERSION = "0114_the_story_goal_flag_is_killed"

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

describe("0114, the story goal flag is killed, not parked", () => {
  it("is in the ledger, numbered after 0113, and applies cleanly", () => {
    expect(TEAM_MIGRATIONS.some((m) => m.version === VERSION)).toBe(true)
    expect(() => migrated()).not.toThrow()
  })

  it("stories.contributes_to_goal existed right before this migration ran", () => {
    const db = baseUpTo()
    const cols = new Set((db.prepare("PRAGMA table_info(stories)").all() as { name: string }[]).map((c) => c.name))
    expect(cols.has("contributes_to_goal")).toBe(true)
  })

  it("removes contributes_to_goal from stories", () => {
    const db = migrated()
    const cols = new Set((db.prepare("PRAGMA table_info(stories)").all() as { name: string }[]).map((c) => c.name))
    expect(cols.has("contributes_to_goal")).toBe(false)
  })

  it("sprints.goal_summary, a different fact minted by the same earlier migration, is untouched", () => {
    const db = migrated()
    const cols = new Set((db.prepare("PRAGMA table_info(sprints)").all() as { name: string }[]).map((c) => c.name))
    expect(cols.has("goal_summary")).toBe(true)
  })

  it("existing rows and their other columns survive the drop untouched", () => {
    const db = baseUpTo()
    // No FK-referencing columns (account_id/ticket_id/app_id/process_id/
    // sprint_id) are given a value, the same shape
    // migration-knowledge-identity-key-retired.test.ts's own insert takes:
    // this proof is about the DROP, not about seeding a full graph of rows.
    db.exec(
      `INSERT INTO stories (id, ref, step_key, changes_no_step, title, detail, story_type, category, status,
         rank, created_at, creator_id, creator_email, creator_name, contributes_to_goal)
       VALUES ('S1', 'B0001', NULL, 1, 'A story', NULL, 'Feature', 'Enabler', 'open', '1', '2026-09-10',
         'u1', 'a@x.com', 'Actor', 1);`
    )
    const m = TEAM_MIGRATIONS.find((x) => x.version === VERSION)
    db.exec((m as { sql: string }).sql)
    expect(db.prepare("SELECT id, title, story_type, status FROM stories WHERE id = 'S1'").get()).toMatchObject({
      id: "S1",
      title: "A story",
      story_type: "Feature",
      status: "open",
    })
  })
})
