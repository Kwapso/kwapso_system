// 0093's OWN PROOF, RUN AGAINST A REAL SCHEMA (node:sqlite), and against the
// EXACT shape the staging estate was in on the day it was written.
//
// THE RULING, 15 Sep 2026, the owner's own words: *"Remove all other options.
// Just get rid of them, delete them completely. From staging and production."*
// A ticket is an Issue, a Question, an Extra or a piece of Feedback; "Request"
// folds into "Extra" and everything else is deleted, row and all.
//
// WHY IT IS EXECUTED RATHER THAN READ. Nothing TypeScript-shaped can see inside
// a SQL string, and this migration is nine statements per word: a survivor
// chosen by a four-term ORDER BY, a DELETE correlated against that same
// subquery, an UPDATE with a three-clause idempotence guard using `IS NOT`, and
// a guarded INSERT. Each of those has a plausible wrong version that reads
// correctly — a survivor chosen before the deletions rather than after, an
// `IS NOT` written as `<>` (which is NULL against a NULL mark, so the guard
// silently stops matching), a DELETE that takes the row it was meant to keep.
// Only SQLite can tell those apart.
//
// THE FIXTURE IS NOT INVENTED. `KWAPSO_SHAPE` below is the real `Ticket type`
// vocabulary of the Kwapso team on staging, counted read-only before a line of
// this change was written: fifteen rows for eight words, including two
// duplicate pairs left behind by a lane test, a protected-but-retired "Bug",
// and marks that are null on every single row. A fixture somebody made up would
// not have had the duplicates, and the duplicates are the reason step 3 exists.

import { DatabaseSync } from "node:sqlite"
import { describe, expect, it } from "vitest"

import { TEAM_MIGRATIONS } from "../src/team-schema"
import { TICKET_TYPES, TICKET_TYPE_GROUP, ticketTypeKey } from "@shared/ticket-types"
import { storedWordColumns } from "@shared/selectable-homes"

const CUTOFF = TEAM_MIGRATIONS.findIndex((m) => m.version.startsWith("0093_"))
const BEFORE = TEAM_MIGRATIONS.slice(0, CUTOFF)
const MIGRATION = TEAM_MIGRATIONS[CUTOFF]

// A CAPTIVE MIGRATION, so a renumbering fails loudly here rather than silently
// testing an empty slice — `migration-0088-pictograph-marks.test.ts`'s own guard.
//
// IT NO LONGER HAS TO BE THE LAST ONE. Written the day this migration was the
// newest in the ledger, before the 15 Sep 2026 merge that landed the story/
// inputs work (0094–0096) beside it — two branches each minted a "0093" that
// day, this one and a parallel one, and the merge kept this migration's own
// number and renumbered the other three to come after it. What this test
// still needs is that BEFORE (the slice `freshDb()` seeds against) is real and
// stops exactly at 0093 — nothing about what the ledger holds AFTER it.
it("0093 exists, right after every migration this suite seeds against", () => {
  expect(CUTOFF, "0093 must exist in TEAM_MIGRATIONS").toBeGreaterThan(0)
  expect(MIGRATION.version).toBe("0093_ticket_types_cut_to_four")
})

function freshDb(): DatabaseSync {
  const db = new DatabaseSync(":memory:")
  for (const m of BEFORE) db.exec(m.sql)
  // Every migration before 0093 has already planted its own `Ticket type` rows
  // (0034 among them). This suite is about a KNOWN starting shape, so it clears
  // what the ledger left and writes the one it measured.
  db.exec(`DELETE FROM selectable_data WHERE type = '${TICKET_TYPE_GROUP}'`)
  db.exec(`DELETE FROM help`)
  return db
}

type Row = { value: string; active: boolean; isDefault: boolean; mark: string | null }

/** THE KWAPSO TEAM'S REAL VOCABULARY ON STAGING, 15 Sep 2026 — fifteen rows for
 * eight words, counted read-only before this migration was written. */
const KWAPSO_SHAPE: Row[] = [
  { value: "Bug", active: false, isDefault: true, mark: null },
  { value: "Bug", active: false, isDefault: false, mark: null },
  { value: "Extra", active: true, isDefault: true, mark: null },
  { value: "Extra", active: false, isDefault: false, mark: null },
  { value: "Feedback", active: false, isDefault: true, mark: null },
  { value: "Feedback", active: false, isDefault: false, mark: null },
  { value: "Issue", active: true, isDefault: true, mark: null },
  { value: "Lane check alpha", active: false, isDefault: false, mark: null },
  { value: "Lane check alpha", active: false, isDefault: false, mark: null },
  { value: "Lane check beta", active: false, isDefault: false, mark: null },
  { value: "Lane check beta", active: false, isDefault: false, mark: null },
  { value: "Question", active: true, isDefault: true, mark: null },
  { value: "Question", active: false, isDefault: false, mark: null },
  { value: "Request", active: true, isDefault: true, mark: null },
  { value: "Requirements", active: true, isDefault: true, mark: null },
]

/** The Smoke team's shape the same day — seven rows, one per word, every mark
 * already set, and "Feedback" retired rather than absent. A second real shape,
 * because the two exercise different branches: Kwapso needs a Feedback INSERT
 * (its rows are retired AND there are two of them), Smoke needs a REACTIVATE. */
const SMOKE_SHAPE: Row[] = [
  { value: "Bug", active: false, isDefault: true, mark: null },
  { value: "Extra", active: true, isDefault: true, mark: "EX" },
  { value: "Feedback", active: false, isDefault: true, mark: null },
  { value: "Issue", active: true, isDefault: true, mark: "IS" },
  { value: "Question", active: true, isDefault: true, mark: "Q" },
  { value: "Request", active: true, isDefault: true, mark: "RQ" },
  { value: "Requirements", active: true, isDefault: true, mark: "RM" },
]

function plant(db: DatabaseSync, rows: Row[]): void {
  rows.forEach((r, i) => {
    db.prepare(
      `INSERT INTO selectable_data (id, type, value, mark, is_default, deactivated_at, created_at, creator_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'System')`
    ).run(
      `SD_${i}`,
      TICKET_TYPE_GROUP,
      r.value,
      r.mark,
      r.isDefault ? 1 : 0,
      r.active ? null : "2026-03-01T00:00:00.000Z",
      // A DISTINCT `created_at` PER ROW, ascending, because the survivor's
      // third tie-break is the oldest row. Two rows sharing a timestamp would
      // fall through to the id, which is a weaker thing to be asserting.
      `2026-01-${String(i + 1).padStart(2, "0")}T00:00:00.000Z`
    )
  })
}

function ticket(db: DatabaseSync, id: string, helpType: string | null, raisedAs: string | null): void {
  db.prepare(
    `INSERT INTO help (id, description, help_type, raised_as_type, status, resolved, created_at, creator_id)
     VALUES (?, 'Something', ?, ?, 'new', 0, '2026-02-01T00:00:00.000Z', 'U')`
  ).run(id, helpType, raisedAs)
}

function vocabulary(db: DatabaseSync): Row[] {
  return (
    db
      .prepare(
        `SELECT value, mark, is_default, deactivated_at FROM selectable_data
          WHERE type = ? ORDER BY value`
      )
      .all(TICKET_TYPE_GROUP) as {
      value: string
      mark: string | null
      is_default: number
      deactivated_at: string | null
    }[]
  ).map((r) => ({
    value: r.value,
    active: r.deactivated_at == null,
    isDefault: r.is_default === 1,
    mark: r.mark,
  }))
}

/** The four, in the order `vocabulary` returns them (alphabetical by value),
 * each active, protected and carrying its declared mark. Derived from
 * `TICKET_TYPES` rather than retyped, so the day a word or a mark changes there
 * this suite moves with it instead of going quietly stale. */
const EXPECTED_FOUR: Row[] = [...TICKET_TYPES]
  .map((t) => ({ value: t.value, active: true, isDefault: true, mark: t.mark as string }))
  .sort((a, b) => (a.value < b.value ? -1 : 1))

describe("the Kwapso shape — fifteen rows for eight words", () => {
  function run(): DatabaseSync {
    const db = freshDb()
    plant(db, KWAPSO_SHAPE)
    db.exec(MIGRATION.sql)
    return db
  }

  it("leaves exactly four rows, all active, all protected, all marked", () => {
    expect(vocabulary(run())).toEqual(EXPECTED_FOUR)
  })

  it("deletes Request, Requirements, Bug and the lane leftovers outright", () => {
    // A HARD DELETE, not a deactivation, and that is the owner's own word twice
    // over: "get rid of them, delete them completely". The rest of this ledger
    // deactivates (0034's own shape), so a reader finding zero rows here should
    // be able to see that it was the intention.
    const left = vocabulary(run()).map((r) => r.value)
    for (const gone of ["Request", "Requirements", "Bug", "Lane check alpha", "Lane check beta"])
      expect(left, `${gone} must be gone from the group entirely`).not.toContain(gone)
  })

  it("plants Feedback, which the team had only as two retired rows", () => {
    const fb = vocabulary(run()).filter((r) => ticketTypeKey(r.value) === "feedback")
    expect(fb.length, "one row, not two").toBe(1)
    expect(fb[0]).toEqual({ value: "Feedback", active: true, isDefault: true, mark: "FB" })
  })

  it("keeps the ACTIVE duplicate rather than the retired one", () => {
    // Extra and Question each had a live row and a dead one. The survivor is the
    // row the team's own tickets have been reading; taking the other would have
    // been invisible on screen and wrong in the activity trail.
    const db = run()
    const ids = (
      db
        .prepare(`SELECT id, value FROM selectable_data WHERE type = ? ORDER BY value`)
        .all(TICKET_TYPE_GROUP) as { id: string; value: string }[]
    ).filter((r) => ["Extra", "Question"].includes(r.value))
    // SD_2 is the live Extra, SD_11 the live Question (see KWAPSO_SHAPE's order).
    expect(ids.map((r) => r.id).sort()).toEqual(["SD_11", "SD_2"])
  })
})

describe("the Smoke shape — one row per word, Feedback retired", () => {
  function run(): DatabaseSync {
    const db = freshDb()
    plant(db, SMOKE_SHAPE)
    db.exec(MIGRATION.sql)
    return db
  }

  it("reaches the same four", () => {
    expect(vocabulary(run())).toEqual(EXPECTED_FOUR)
  })

  it("REACTIVATES the retired Feedback row rather than planting a second one", () => {
    // The branch Kwapso cannot exercise. If the UPDATE failed to clear
    // `deactivated_at`, the guarded INSERT would find a row and plant nothing,
    // and the team would end with a protected, INACTIVE Feedback nobody can pick
    // — the exact state migration 0088 was written to make impossible.
    const db = run()
    const row = db
      .prepare(`SELECT id, deactivated_at FROM selectable_data WHERE type = ? AND value = 'Feedback'`)
      .all(TICKET_TYPE_GROUP) as { id: string; deactivated_at: string | null }[]
    expect(row.length).toBe(1)
    expect(row[0].id, "the row that was already there, reactivated").toBe("SD_2")
    expect(row[0].deactivated_at).toBe(null)
  })

  it("overwrites a mark the team already had, rather than stepping over it", () => {
    // R66's founding defect, in one sentence: every back-fill in 0034 and 0044
    // was guarded `AND mark IS NULL`, so not one of them could replace a mark
    // that was already wrong. `Request`'s "RQ" is gone with the row; what this
    // asserts is that a SET mark is not treated as untouchable.
    const db = freshDb()
    plant(db, [{ value: "Issue", active: true, isDefault: true, mark: "ZZ" }])
    db.exec(MIGRATION.sql)
    expect(vocabulary(db).find((r) => r.value === "Issue")?.mark).toBe("IS")
  })
})

describe("the tickets themselves", () => {
  it("moves every Request to Extra, on BOTH columns the group is stored on", () => {
    // `raised_as_type` is rewritten beside `help_type` and that is not an
    // exception to its own one-way rule: a SPELLING changing is not a
    // recategorisation anybody performed. Carrying only `help_type` would have
    // manufactured 961 of them on staging, in the one chart that reports them.
    const db = freshDb()
    plant(db, KWAPSO_SHAPE)
    ticket(db, "H1", "Request", "Request")
    ticket(db, "H2", "Issue", "Request")
    ticket(db, "H3", "Question", null)
    db.exec(MIGRATION.sql)
    const rows = db
      .prepare(`SELECT id, help_type, raised_as_type FROM help ORDER BY id`)
      .all() as { id: string; help_type: string | null; raised_as_type: string | null }[]
    expect(rows).toEqual([
      { id: "H1", help_type: "Extra", raised_as_type: "Extra" },
      { id: "H2", help_type: "Issue", raised_as_type: "Extra" },
      { id: "H3", help_type: "Question", raised_as_type: null },
    ])
  })

  it("under any spelling a person or an importer might have written", () => {
    // `help_type` holds a team's own word and the Smoke team's rows are all
    // lower case. The migration matches the way `ticketTypeKey` matches —
    // trimmed, lower-cased, one trailing "s" tolerated — so all four of these
    // are the same word.
    const db = freshDb()
    plant(db, KWAPSO_SHAPE)
    const spellings = ["request", " Request ", "REQUESTS", "requests"]
    spellings.forEach((s, i) => ticket(db, `H${i}`, s, null))
    db.exec(MIGRATION.sql)
    const kinds = (db.prepare(`SELECT help_type FROM help`).all() as { help_type: string }[]).map(
      (r) => r.help_type
    )
    expect(kinds).toEqual(spellings.map(() => "Extra"))
  })

  it("and the columns it rewrites are DERIVED, not typed into the migration", () => {
    // The clause that makes the test above mean something. If somebody adds a
    // third column that stores a ticket type, `VOCABULARY_HOMES` is where they
    // declare it and the migration picks it up — this asserts the migration is
    // reading that map rather than a list of its own.
    const homes = storedWordColumns(TICKET_TYPE_GROUP)
    expect(homes.length, "two columns on `help` store this group's words").toBe(2)
    for (const h of homes)
      expect(MIGRATION.sql, `${h.table}.${h.column} must be rewritten`).toContain(
        `UPDATE ${h.table}\n   SET ${h.column} =`
      )
  })

  it("leaves a ticket carrying a word the vocabulary no longer holds", () => {
    // Deleting a vocabulary row can never orphan history, because `help_type`
    // stores the WORD and not a foreign key. A ticket filed years ago as
    // "General" still says "General"; it reads the neutral colour and sorts to
    // the end of the client's order, which is `ticketTypeColour`'s own ruling.
    const db = freshDb()
    plant(db, KWAPSO_SHAPE)
    ticket(db, "H_OLD", "General", "General")
    db.exec(MIGRATION.sql)
    const row = db.prepare(`SELECT help_type FROM help WHERE id='H_OLD'`).get() as {
      help_type: string
    }
    expect(row.help_type).toBe("General")
  })
})

describe("running it twice changes nothing", () => {
  // `_migrations` is what actually stops a second run, but a migration that
  // could not survive one is a migration nobody can re-apply by hand after a
  // half-failed robot pass — and this ledger has had exactly that happen
  // (`a-hand-applied-migration-repeats-forever`). The guard that earns this is
  // the `mark IS NOT ?` term on the normalising UPDATE: written as `<>` it would
  // be NULL against a NULL mark, the row would never match, and the second pass
  // would move rows for ever.
  it("on the Kwapso shape", () => {
    const db = freshDb()
    plant(db, KWAPSO_SHAPE)
    ticket(db, "H1", "Request", "Request")
    db.exec(MIGRATION.sql)
    const once = db
      .prepare(`SELECT id, value, mark, is_default, deactivated_at, updated_at FROM selectable_data WHERE type = ? ORDER BY id`)
      .all(TICKET_TYPE_GROUP)
    db.exec(MIGRATION.sql)
    const twice = db
      .prepare(`SELECT id, value, mark, is_default, deactivated_at, updated_at FROM selectable_data WHERE type = ? ORDER BY id`)
      .all(TICKET_TYPE_GROUP)
    expect(twice, "not one row, and not one timestamp, may move on a second pass").toEqual(once)
  })

  it("on a team that is already correct", () => {
    const db = freshDb()
    plant(db, EXPECTED_FOUR)
    const before = db
      .prepare(`SELECT id, updated_at FROM selectable_data WHERE type = ? ORDER BY id`)
      .all(TICKET_TYPE_GROUP)
    db.exec(MIGRATION.sql)
    expect(
      db.prepare(`SELECT id, updated_at FROM selectable_data WHERE type = ? ORDER BY id`).all(TICKET_TYPE_GROUP),
      "a team born after this change must not be touched by it at all"
    ).toEqual(before)
  })
})

describe("nothing outside the group is touched", () => {
  it("a Sprint type called Request keeps its row", () => {
    // Every statement is fenced on `type = 'Ticket type'`. A migration that
    // dropped that fence would delete half of another module's vocabulary and
    // nothing on the tickets screen would look any different.
    const db = freshDb()
    plant(db, KWAPSO_SHAPE)
    db.prepare(
      `INSERT INTO selectable_data (id, type, value, is_default, created_at, creator_name)
       VALUES ('SD_OTHER', 'Sprint type', 'Request', 0, '2026-01-01T00:00:00.000Z', 'System')`
    ).run()
    db.exec(MIGRATION.sql)
    const other = db
      .prepare(`SELECT value, deactivated_at FROM selectable_data WHERE id='SD_OTHER'`)
      .get() as { value: string; deactivated_at: string | null } | undefined
    expect(other).toEqual({ value: "Request", deactivated_at: null })
  })
})
