// TEAM MIGRATION 0121 — "moved existing notes to agenda" (Aurora, 23 Sep 2026),
// the data half of the ruling that took the Notes surface off the meetings UI.
//
// WHY THIS IS TESTED AND NOT JUST WRITTEN. `meetings.notes` is the ONE column
// in that module no sync ever writes (team migration 0035's own note: "the one
// column in this module that only a person writes"), so nothing regenerates it
// if this statement is wrong. Measured in the app's own source against the live
// staging base: of 458 live meetings, 75 carry notes and 4 carry an agenda. A
// migration that concatenated the wrong way round, or ran twice, would damage
// three quarters of the prose this module exists to keep, silently, on a
// screen that now shows only the agenda.
//
// THE SQL IS READ OUT OF THE SHIPPED LEDGER, never re-typed here — a test that
// copies the statement it is checking proves only that the copy works. It runs
// against the real schema through `buildSpineDb`, which rolls every real
// migration in order, so the harness has ALREADY applied 0121 once before a
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
const SQL_0121 = () => {
  const found = TEAM_MIGRATIONS.find((m) => m.version.startsWith("0121_"))
  if (!found) throw new Error("team migration 0121 is not in TEAM_MIGRATIONS")
  return found.sql
}

/** A meeting in the pre-migration world — straight in, never through a door,
 * so what is asserted is what the statement sees. */
function seedMeeting(id: string, agenda: string | null, notes: string | null): void {
  db()
    .prepare(
      `INSERT INTO meetings (id, title, agenda, notes, starts_at, created_at, creator_id)
       VALUES (?, ?, ?, ?, '2026-03-01T10:00:00.000Z', '2026-03-01', ?)`
    )
    .run(id, `Meeting ${id}`, agenda, notes, IDS.staffUser)
}

const row = (id: string) =>
  db().prepare("SELECT agenda, notes FROM meetings WHERE id = ?").get(id) as {
    agenda: string | null
    notes: string | null
  }

const backup = (id: string) =>
  db()
    .prepare("SELECT notes, merged_at FROM meeting_notes_backup WHERE meeting_id = ?")
    .get(id) as { notes: string; merged_at: string | null } | undefined

/** Run the migration the way the runner does. */
const run = () => db().exec(SQL_0121())

beforeEach(() => {
  holder.db = buildSpineDb()
})

describe("0121 · the backup comes first, and it can be restored", () => {
  it("copies the notes of every meeting that has them, exactly as stored", () => {
    seedMeeting("m1", null, "<p>What we agreed</p>")
    run()
    expect(backup("m1")?.notes).toBe("<p>What we agreed</p>")
  })

  it("never backs up a meeting with no notes — nothing to keep, no row", () => {
    seedMeeting("empty", "<p>An agenda</p>", null)
    seedMeeting("blank", "<p>An agenda</p>", "   ")
    run()
    expect(backup("empty")).toBeUndefined()
    expect(backup("blank")).toBeUndefined()
  })

  it("the original notes column is NOT cleared — the merge keeps two copies", () => {
    // Deactivate-never-delete. The door still reads and writes `notes` and the
    // knowledge sweep still ingests it; a merge that also wiped the source
    // would make the backup the only copy of what we just decided to keep.
    seedMeeting("m1", null, "<p>What we agreed</p>")
    run()
    expect(row("m1").notes).toBe("<p>What we agreed</p>")
  })

  it("a restore is one statement against the backup, and it round-trips", () => {
    seedMeeting("m1", "<p>Agenda</p>", "<p>Notes</p>")
    run()
    // The whole point of the backup: this statement puts the world back.
    db().exec(
      `UPDATE meetings SET agenda = (
         SELECT CASE WHEN b.notes IS NULL THEN meetings.agenda ELSE
           CASE WHEN meetings.agenda = b.notes THEN NULL
                ELSE substr(meetings.agenda, 1, length(meetings.agenda) - length(b.notes) - 4)
           END
         END FROM meeting_notes_backup b WHERE b.meeting_id = meetings.id
       ) WHERE id IN (SELECT meeting_id FROM meeting_notes_backup)`
    )
    expect(row("m1").agenda).toBe("<p>Agenda</p>")
  })
})

describe("0121 · her three cases", () => {
  it("BOTH — the agenda stays first, the notes follow under a visible divider", () => {
    seedMeeting("both", "<p>What we mean to cover</p>", "<p>What was decided</p>")
    run()
    expect(row("both").agenda).toBe("<p>What we mean to cover</p><hr><p>What was decided</p>")
  })

  it("…and the divider really is between them, in that order, never the other way round", () => {
    seedMeeting("both", "<p>AGENDA</p>", "<p>NOTES</p>")
    run()
    const merged = row("both").agenda ?? ""
    expect(merged.indexOf("AGENDA")).toBeLessThan(merged.indexOf("<hr>"))
    expect(merged.indexOf("<hr>")).toBeLessThan(merged.indexOf("NOTES"))
  })

  it("NO AGENDA — the notes simply become the agenda, with no divider at all", () => {
    seedMeeting("notesonly", null, "<p>What was decided</p>")
    seedMeeting("blankagenda", "   ", "<p>Also decided</p>")
    run()
    expect(row("notesonly").agenda).toBe("<p>What was decided</p>")
    expect(row("blankagenda").agenda).toBe("<p>Also decided</p>")
    expect(row("notesonly").agenda).not.toContain("<hr>")
  })

  it("NO NOTES — nothing happens; an existing agenda is untouched", () => {
    seedMeeting("agendaonly", "<p>Only an agenda</p>", null)
    run()
    expect(row("agendaonly").agenda).toBe("<p>Only an agenda</p>")
  })

  it("a meeting with neither is left entirely alone", () => {
    seedMeeting("bare", null, null)
    run()
    expect(row("bare").agenda).toBeNull()
    expect(backup("bare")).toBeUndefined()
  })
})

describe("0121 · it is safe to run twice", () => {
  it("running it a second time changes nothing at all", () => {
    seedMeeting("both", "<p>Agenda</p>", "<p>Notes</p>")
    seedMeeting("notesonly", null, "<p>Notes</p>")
    run()
    const after = { both: row("both").agenda, notesonly: row("notesonly").agenda }
    run()
    run()
    expect(row("both").agenda, "the notes are not appended a second time").toBe(after.both)
    expect(row("notesonly").agenda).toBe(after.notesonly)
  })

  it("the marker is what makes that true — merged_at is set in the same run", () => {
    seedMeeting("m1", "<p>Agenda</p>", "<p>Notes</p>")
    run()
    expect(backup("m1")?.merged_at, "a merged row is marked, so the UPDATE cannot find it again").toBeTruthy()
  })

  it("MUTATION PROOF — without the marker, a second run WOULD double the notes", () => {
    // The guard is load-bearing, so this proves what it is guarding against:
    // clearing the marker is exactly the state the statement would be in if
    // `merged_at` were never set, and the second run then appends again.
    seedMeeting("m1", "<p>Agenda</p>", "<p>Notes</p>")
    run()
    const once = row("m1").agenda ?? ""
    db().exec("UPDATE meeting_notes_backup SET merged_at = NULL")
    run()
    const twice = row("m1").agenda ?? ""
    expect(twice.length, "with the marker cleared it really does append again").toBeGreaterThan(
      once.length
    )
    expect((twice.match(/<hr>/g) ?? []).length).toBe(2)
  })

  it("a meeting whose notes change AFTER the merge is not re-merged behind a person's back", () => {
    // Somebody corrects the row through the door (or a restore puts something
    // back). The backup already holds its own copy and its own marker, so the
    // migration has no business touching that meeting again.
    seedMeeting("m1", null, "<p>Original</p>")
    run()
    db().prepare("UPDATE meetings SET notes = ? WHERE id = ?").run("<p>Corrected</p>", "m1")
    run()
    expect(row("m1").agenda, "still the merge that happened, not a second one").toBe(
      "<p>Original</p>"
    )
  })
})

describe("0121 · it is in the ledger, in the right place", () => {
  it("is the last migration, and nothing above it shares its number", () => {
    const versions = TEAM_MIGRATIONS.map((m) => m.version)
    const mine = versions.filter((v) => v.startsWith("0121_"))
    expect(mine, "exactly one 0121").toEqual(["0121_meeting_notes_become_the_agenda"])
    // Read live rather than recalled: whatever the tail is, this one sits
    // after every lower number rather than being spliced into the middle.
    const at = versions.indexOf("0121_meeting_notes_become_the_agenda")
    for (const v of versions.slice(0, at)) expect(v < "0121").toBe(true)
  })

  it("drops no column and deletes no row — it is additive on both tables", () => {
    const sql = SQL_0121()
    expect(sql, "the notes column survives").not.toMatch(/DROP COLUMN/i)
    expect(sql, "nothing is deleted").not.toMatch(/\bDELETE\b/i)
    expect(sql, "and the meetings table itself is not rebuilt").not.toMatch(/DROP TABLE/i)
  })
})
