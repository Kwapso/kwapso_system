// TEAM MIGRATION 0122 — "wipe them" (Aurora, 24 Sep 2026), the data half of the
// ruling that made the kind of work AUTOMATIC the day before.
//
// WHY THIS IS TESTED AND NOT JUST WRITTEN. The statement has to tell two
// populations apart that share a column and, in one corner, share a VALUE:
//
//   * the words a person typed into the old free-text "Kind of work" box, which
//     Aurora has ruled are to go; and
//   * `MEETING_LOG_KIND` ('Meeting'), which the transcript capture stamps on one
//     log per staff attendee and which is LOAD-BEARING TWICE — the `meetingTime`
//     filter reads it, and the capture's own de-duplication guard matches on it.
//
// A guard that stops matching lets a re-capture write a meeting's hours a second
// time, and that exact failure added 18.25 hours across 21 work logs that nobody
// worked on 2026-08-31. So "wipe everything except one literal" is a clause that
// has to be proved, not asserted: a person could type that literal themselves,
// and on a meeting they could (`<WorkLogsPanel targetTable="meetings">` opens
// the same log dialog with the meeting fixed as the target). Every case below
// exists because getting it wrong is silent.
//
// THE SQL IS READ OUT OF THE SHIPPED LEDGER, never re-typed here — a test that
// copies the statement it is checking proves only that the copy works. It runs
// against the real schema through `buildSpineDb`, which rolls every real
// migration in order, so the harness has ALREADY applied 0122 once before a
// single assertion is made. That is deliberate: every case below is therefore
// also a proof that the statement is safe on a database it has already touched.

import type { DatabaseSync } from "node:sqlite"
import { beforeEach, describe, expect, it, vi } from "vitest"

const holder = vi.hoisted(() => ({ db: null as DatabaseSync | null }))

vi.mock("@shared/workers/d1-rest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/d1-rest")>()
  const { d1Impl } = await import("./d1-sqlite")
  return { ...actual, ...d1Impl(() => holder.db as DatabaseSync) }
})

import { TEAM_MIGRATIONS } from "../src/team-schema"
import { buildSpineDb, IDS } from "./spine-harness"

const db = () => holder.db as DatabaseSync

/** The migration's own SQL, off the ledger. */
const SQL_0122 = () => {
  const found = TEAM_MIGRATIONS.find((m) => m.version.startsWith("0122_"))
  if (!found) throw new Error("team migration 0122 is not in TEAM_MIGRATIONS")
  return found.sql
}

/** A row of time in the pre-migration world — straight in, never through a
 * door, so what is asserted is what the statement sees. */
function seedLog(id: string, targetTable: string, kind: string | null): void {
  db()
    .prepare(
      `INSERT INTO work_logs (id, target_table, target_id, user_id, user_name, kind,
         started_at, ended_at, seconds, created_at, creator_id)
       VALUES (?, ?, ?, ?, 'Alex', ?, '2026-03-01T10:00:00.000Z', '2026-03-01T11:00:00.000Z', 3600, '2026-03-01', ?)`
    )
    .run(id, targetTable, `${targetTable}-target`, IDS.staffUser, kind, IDS.staffUser)
}

const kindOf = (id: string) =>
  (db().prepare("SELECT kind FROM work_logs WHERE id = ?").get(id) as { kind: string | null }).kind

const backup = (id: string) =>
  db()
    .prepare("SELECT kind, target_table, cleared_at FROM work_log_kinds_backup WHERE work_log_id = ?")
    .get(id) as { kind: string; target_table: string; cleared_at: string | null } | undefined

/** Run the migration the way the runner does. */
const run = () => db().exec(SQL_0122())

beforeEach(() => {
  holder.db = buildSpineDb()
})

describe("0122 — the hand-typed kinds go, and the meeting constant stays", () => {
  it("wipes a word somebody typed on a story", () => {
    seedLog("w1", "stories", "Development")
    run()
    expect(kindOf("w1"), "a hand-typed kind survived the wipe").toBeNull()
  })

  it("wipes a word typed on a ticket and on a task too", () => {
    seedLog("w2", "help", "Project management")
    seedLog("w3", "tasks", "Admin")
    run()
    expect(kindOf("w2")).toBeNull()
    expect(kindOf("w3")).toBeNull()
  })

  it("wipes an empty string, which is neither a word nor the constant", () => {
    seedLog("w4", "stories", "")
    run()
    expect(kindOf("w4")).toBeNull()
    // …and it was copied first, so even that is restorable.
    expect(backup("w4")?.kind).toBe("")
  })

  it("SPARES the capture's own constant on a meeting", () => {
    seedLog("w5", "meetings", "Meeting")
    run()
    expect(
      kindOf("w5"),
      "the transcript capture's own kind was wiped. Its de-duplication guard matches on this literal; " +
        "a guard that stops matching lets a re-capture write the hours again (18.25 hours, 21 logs, 2026-08-31)."
    ).toBe("Meeting")
    expect(backup("w5"), "a spared row should not even be backed up").toBeUndefined()
  })

  it("SPARES a hand-typed 'Meeting' on a meeting — the ambiguous set, kept on purpose", () => {
    // Indistinguishable from the row above by any column in this table. The
    // asymmetry decides it: sparing costs an invisible word, wiping costs the
    // guard. See the migration's own header.
    seedLog("w6", "meetings", "Meeting")
    run()
    expect(kindOf("w6")).toBe("Meeting")
  })

  it("WIPES a hand-typed 'Meeting' on a STORY — there `target_table` IS the discriminator", () => {
    seedLog("w7", "stories", "Meeting")
    run()
    expect(
      kindOf("w7"),
      "'Meeting' on a story cannot have come from the capture, which always writes target_table='meetings'"
    ).toBeNull()
  })

  it("WIPES another word typed on a meeting — only the constant is spared there", () => {
    seedLog("w8", "meetings", "Workshop")
    run()
    expect(kindOf("w8")).toBeNull()
  })

  it("leaves a log that never had a kind exactly as it was", () => {
    seedLog("w9", "stories", null)
    run()
    expect(kindOf("w9")).toBeNull()
    expect(backup("w9"), "a row with nothing to wipe should not be backed up").toBeUndefined()
  })
})

describe("0122 — the backup is complete and the wipe is restorable", () => {
  it("copies the word, its target table and when it was taken, before clearing it", () => {
    seedLog("w10", "help", "Design")
    run()
    const b = backup("w10")
    expect(b?.kind, "the word was cleared without being copied first").toBe("Design")
    expect(b?.target_table).toBe("help")
    expect(b?.cleared_at, "the backup row was not marked as cleared").not.toBeNull()
  })

  it("restores every wiped word with one statement against the backup", () => {
    seedLog("w11", "stories", "Development")
    seedLog("w12", "tasks", "Admin")
    seedLog("w13", "meetings", "Meeting")
    run()
    expect(kindOf("w11")).toBeNull()
    expect(kindOf("w12")).toBeNull()

    // The restore printed in the migration's own header, run verbatim.
    db().exec(
      `UPDATE work_logs SET kind =
         (SELECT b.kind FROM work_log_kinds_backup b WHERE b.work_log_id = work_logs.id)
        WHERE id IN (SELECT work_log_id FROM work_log_kinds_backup)`
    )
    expect(kindOf("w11")).toBe("Development")
    expect(kindOf("w12")).toBe("Admin")
    // …and the spared row was never in the backup, so a restore cannot touch it.
    expect(kindOf("w13")).toBe("Meeting")
  })
})

describe("0122 — safe to run twice", () => {
  it("changes nothing on a second run, and writes no second backup row", () => {
    seedLog("w14", "stories", "Development")
    seedLog("w15", "meetings", "Meeting")
    run()
    const after = db()
      .prepare("SELECT COUNT(*) AS n FROM work_log_kinds_backup")
      .get() as { n: number }

    run()
    run()

    expect(kindOf("w14")).toBeNull()
    expect(kindOf("w15")).toBe("Meeting")
    expect(
      (db().prepare("SELECT COUNT(*) AS n FROM work_log_kinds_backup").get() as { n: number }).n,
      "a re-run wrote a second backup row, so the table is no longer one row per log"
    ).toBe(after.n)
  })

  it("does not re-wipe a word somebody deliberately put back", () => {
    // The marker is what makes this true: `cleared_at` is set in the same run,
    // so the UPDATE's own subquery can never select that log again.
    seedLog("w16", "stories", "Development")
    run()
    db().prepare("UPDATE work_logs SET kind = 'Put back on purpose' WHERE id = ?").run("w16")
    run()
    expect(
      kindOf("w16"),
      "a second run wiped a value written AFTER the migration had already dealt with that row"
    ).toBe("Put back on purpose")
  })
})

describe("0122 — it changes nothing else", () => {
  it("touches no other column on the row it clears", () => {
    seedLog("w17", "stories", "Development")
    const before = db()
      .prepare("SELECT target_table, target_id, user_id, user_name, seconds, started_at, ended_at FROM work_logs WHERE id = ?")
      .get("w17")
    run()
    const after = db()
      .prepare("SELECT target_table, target_id, user_id, user_name, seconds, started_at, ended_at FROM work_logs WHERE id = ?")
      .get("w17")
    expect(after).toEqual(before)
  })

  it("leaves the column itself in place — this is a value wipe, not a column drop", () => {
    // 0115 dropped `billable` outright; this deliberately does not. The capture
    // still writes here and the constant is still what the old, still-deployed
    // worker reads during the migrate-then-deploy window.
    const cols = db().prepare("PRAGMA table_info(work_logs)").all() as { name: string }[]
    expect(cols.map((c) => c.name)).toContain("kind")
  })
})
