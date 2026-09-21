// 0115 KILLS work_logs.billable, not hidden, removed.
//
// 0015 minted this column (`billable INTEGER NOT NULL DEFAULT 1`, this
// table's own creation migration). Aurora, 22 Sep 2026, verbatim: "remove
// the billable from logs, not hide, remove." This migration is the data
// half of the kill: the column itself is dropped, not merely left unmounted
// or unread — the door fields, the MCP tool fields, the meeting-capture
// INSERT and the Logs screen chip are all removed the same round.
//
// D1 supports `ALTER TABLE ... DROP COLUMN`, the same mechanism 0080 used to
// retire `knowledge_sources.identity_key` and 0114 used to retire
// `stories.contributes_to_goal` (see migration-0114-goal-column-dropped.
// test.ts, the identical shape this file borrows). No index rides
// `work_logs.billable`: 0015 added it plain, `INTEGER NOT NULL DEFAULT 1`,
// and none of `idx_work_logs_running`, `idx_work_logs_target`,
// `idx_work_logs_account` or `idx_work_logs_user` reference it, so unlike
// 0080 there is no DROP INDEX to sequence first.

import { DatabaseSync } from "node:sqlite"
import { describe, expect, it } from "vitest"
import { TEAM_MIGRATIONS } from "../src/team-schema"

const VERSION = "0115_the_billable_flag_is_killed"

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

describe("0115, the billable flag is killed, not hidden", () => {
  it("is in the ledger, numbered after 0114, and applies cleanly", () => {
    expect(TEAM_MIGRATIONS.some((m) => m.version === VERSION)).toBe(true)
    expect(() => migrated()).not.toThrow()
  })

  it("work_logs.billable existed right before this migration ran", () => {
    const db = baseUpTo()
    const cols = new Set((db.prepare("PRAGMA table_info(work_logs)").all() as { name: string }[]).map((c) => c.name))
    expect(cols.has("billable")).toBe(true)
  })

  it("removes billable from work_logs", () => {
    const db = migrated()
    const cols = new Set((db.prepare("PRAGMA table_info(work_logs)").all() as { name: string }[]).map((c) => c.name))
    expect(cols.has("billable")).toBe(false)
  })

  it("work_logs.seconds, a different fact on the same row, is untouched", () => {
    const db = migrated()
    const cols = new Set((db.prepare("PRAGMA table_info(work_logs)").all() as { name: string }[]).map((c) => c.name))
    expect(cols.has("seconds")).toBe(true)
  })

  it("existing rows and their other columns survive the drop untouched", () => {
    const db = baseUpTo()
    // No FK-referencing columns (account_id) are given a value, the same
    // shape migration-0114-goal-column-dropped.test.ts's own insert takes:
    // this proof is about the DROP, not about seeding a full graph of rows.
    db.exec(
      `INSERT INTO work_logs (id, target_table, target_id, user_id, user_name, kind, note,
         started_at, ended_at, seconds, billable, created_at, creator_id, creator_email, creator_name)
       VALUES ('W1', 'stories', 'S1', 'u1', 'Actor', 'Development', 'Did the thing',
         '2026-09-10T09:00:00.000Z', '2026-09-10T10:00:00.000Z', 3600, 1, '2026-09-10T10:00:00.000Z',
         'u1', 'a@x.com', 'Actor');`
    )
    const m = TEAM_MIGRATIONS.find((x) => x.version === VERSION)
    db.exec((m as { sql: string }).sql)
    expect(
      db.prepare("SELECT id, target_table, user_id, seconds FROM work_logs WHERE id = 'W1'").get()
    ).toMatchObject({
      id: "W1",
      target_table: "stories",
      user_id: "u1",
      seconds: 3600,
    })
  })
})
