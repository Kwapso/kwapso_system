// 0088's OWN PROOF, RUN AGAINST A REAL SCHEMA (node:sqlite) — the same reason
// selectable-doors.test.ts gives for not mocking the data door away: nothing
// TypeScript-shaped can see inside a SQL string, and this migration IS one, a
// recursive walk over every character of every mark plus a codepoint predicate
// hand-translated from `optionalMark`'s regex. The only judge that can tell a
// correct predicate from a subtly wrong one is SQLite itself, executing it.
//
// R66's own history is the reason this file exists rather than trusting the
// migration by inspection: migrations 0034 and 0044 each LOOKED like they
// answered the client's ruling and neither one could — both were guarded `AND
// mark IS NULL`, so they never touched a row that already held a pictograph.
// This suite inserts rows in exactly that already-poisoned shape (never through
// `createSelectable`, which would refuse them at the door today) and applies
// ONLY 0088, so a guard clause that silently reintroduces `AND mark IS NULL`
// fails here the same way it should have failed then.
//
// NO PICTOGRAPH IS PASTED AS A LITERAL CHARACTER ANYWHERE IN THIS FILE — named
// by codepoint via `String.fromCodePoint`, the same convention `optionalMark`'s
// own header, UI-RULEBOOK.md and `workers/content/test/validate.test.ts` all
// keep. This file's whole subject is a pictograph census; pasting one here
// would fail the very law it is proving.

import { DatabaseSync } from "node:sqlite"
import { describe, expect, it } from "vitest"

import { TEAM_MIGRATIONS } from "../src/team-schema"

const CUTOFF_INDEX = TEAM_MIGRATIONS.findIndex((m) => m.version.startsWith("0088_"))
const BEFORE_0088 = TEAM_MIGRATIONS.slice(0, CUTOFF_INDEX)
const MIGRATION_0088 = TEAM_MIGRATIONS[CUTOFF_INDEX]

// Named by codepoint, never pasted — see this file's own header.
const WARNING_SIGN = String.fromCodePoint(0x26a0) // U+26A0 WARNING SIGN
const WARNING_SIGN_VS16 = String.fromCodePoint(0x26a0, 0xfe0f) // + VARIATION SELECTOR-16
const BOOK_EMOJI = String.fromCodePoint(0x1f4d8) // U+1F4D8 BLUE BOOK
const TICKET_EMOJI = String.fromCodePoint(0x1f3ab) // U+1F3AB TICKET
const HEAVY_MULTIPLICATION_X = String.fromCodePoint(0x2716) // Extended_Pictographic
const LONE_REGIONAL_INDICATOR = String.fromCodePoint(0x1f1fa) // half a flag — "U"
const US_FLAG = String.fromCodePoint(0x1f1fa, 0x1f1f8) // Regional_Indicator PAIR — a real flag
const DE_FLAG = String.fromCodePoint(0x1f1e9, 0x1f1ea)
// THE KIT'S OWN LEGITIMATE DINGBATS — `optionalMark`'s own header names these
// exact three as NOT Extended_Pictographic (a close button's multiplication
// sign, a department's black rightwards arrowhead, a black star), which is
// why they must survive this migration untouched.
const CLOSE_BUTTON_X = String.fromCodePoint(0x2715) // MULTIPLICATION X (not emoji)
const BLACK_STAR = String.fromCodePoint(0x2605)
const BLACK_RIGHTWARDS_ARROWHEAD = String.fromCodePoint(0x27a4)

// A CAPTIVE UPSTREAM MIGRATION, so a renumbering upstream fails loudly here
// instead of silently testing an empty slice.
it("0088 exists, right after every migration this suite seeds against", () => {
  expect(CUTOFF_INDEX, "0088 must exist in TEAM_MIGRATIONS").toBeGreaterThan(0)
  expect(MIGRATION_0088.version).toBe("0088_a_pictograph_is_not_a_mark_and_protected_is_always_active")
})

function freshDbThroughBefore0088(): DatabaseSync {
  const db = new DatabaseSync(":memory:")
  for (const m of BEFORE_0088) db.exec(m.sql)
  return db
}

function insertRow(
  db: DatabaseSync,
  id: string,
  mark: string | null,
  opts: {
    isDefault?: boolean
    deactivated?: boolean
    /** Who deactivated it — see the "deactivator_id is the discriminator"
     * describe block below. `"person"` writes a real `deactivator_id`
     * (`setSelectableActive`'s own shape); `"system"` leaves it NULL (every
     * migration's own shape — 0026, 0034, 0044, 0042). Ignored unless
     * `deactivated` is true. */
    deactivatedBy?: "person" | "system"
  } = {}
) {
  const byPerson = opts.deactivated && opts.deactivatedBy === "person"
  db.prepare(
    `INSERT INTO selectable_data
       (id, type, value, mark, is_default, deactivated_at, deactivator_id, deactivator_email, deactivator_name, created_at, creator_name)
     VALUES (?, 'Ticket type', ?, ?, ?, ?, ?, ?, ?, '2026-01-01T00:00:00.000Z', 'System')`
  ).run(
    id,
    `Value ${id}`,
    mark,
    opts.isDefault ? 1 : 0,
    opts.deactivated ? "2026-02-01T00:00:00.000Z" : null,
    byPerson ? "U_ANA" : null,
    byPerson ? "ana@kwapso.com" : null,
    opts.deactivated ? (byPerson ? "Ana" : "System") : null
  )
}

function markOf(db: DatabaseSync, id: string): string | null {
  const r = db.prepare("SELECT mark FROM selectable_data WHERE id = ?").get(id) as { mark: string | null }
  return r.mark
}

function rowOf(db: DatabaseSync, id: string) {
  return db
    .prepare(
      "SELECT is_default, deactivated_at, deactivator_id, deactivator_email, deactivator_name FROM selectable_data WHERE id = ?"
    )
    .get(id) as {
    is_default: number
    deactivated_at: string | null
    deactivator_id: string | null
    deactivator_email: string | null
    deactivator_name: string | null
  }
}

describe("0088 nulls every pictograph mark — even one an old `AND mark IS NULL` guard would have skipped", () => {
  it("nulls a plain pictograph (the warning sign that reached staging — R66's own example)", () => {
    const db = freshDbThroughBefore0088()
    insertRow(db, "warn", WARNING_SIGN)
    db.exec(MIGRATION_0088.sql)
    expect(markOf(db, "warn")).toBeNull()
  })

  it("nulls a pictograph with a variation selector (the multi-codepoint case optionalMark also refuses)", () => {
    const db = freshDbThroughBefore0088()
    insertRow(db, "warnvs", WARNING_SIGN_VS16)
    db.exec(MIGRATION_0088.sql)
    expect(markOf(db, "warnvs")).toBeNull()
  })

  it("nulls a book emoji (a plausible legacy 'Requirements'-style mark)", () => {
    const db = freshDbThroughBefore0088()
    insertRow(db, "book", BOOK_EMOJI)
    db.exec(MIGRATION_0088.sql)
    expect(markOf(db, "book")).toBeNull()
  })

  it("nulls a heavy multiplication X — Extended_Pictographic, unlike the kit's plain close button", () => {
    const db = freshDbThroughBefore0088()
    insertRow(db, "heavy_x", HEAVY_MULTIPLICATION_X)
    db.exec(MIGRATION_0088.sql)
    expect(markOf(db, "heavy_x")).toBeNull()
  })

  it("nulls a LONE regional indicator (half a flag is not a flag)", () => {
    const db = freshDbThroughBefore0088()
    insertRow(db, "lone_ri", LONE_REGIONAL_INDICATOR)
    db.exec(MIGRATION_0088.sql)
    expect(markOf(db, "lone_ri")).toBeNull()
  })

  it("does NOT touch a row whose mark is already null", () => {
    const db = freshDbThroughBefore0088()
    insertRow(db, "empty", null)
    db.exec(MIGRATION_0088.sql)
    expect(markOf(db, "empty")).toBeNull()
  })
})

describe("0088 leaves a real flag alone — R66's fourth ruling, 'keep emojis for countries and languages'", () => {
  it("keeps a well-formed two-codepoint flag (US)", () => {
    const db = freshDbThroughBefore0088()
    insertRow(db, "us_flag", US_FLAG)
    db.exec(MIGRATION_0088.sql)
    expect(markOf(db, "us_flag")).toBe(US_FLAG)
  })

  it("keeps a well-formed two-codepoint flag (DE)", () => {
    const db = freshDbThroughBefore0088()
    insertRow(db, "de_flag", DE_FLAG)
    db.exec(MIGRATION_0088.sql)
    expect(markOf(db, "de_flag")).toBe(DE_FLAG)
  })
})

describe("0088 leaves ordinary marks exactly alone", () => {
  it("keeps a plain letter initial", () => {
    const db = freshDbThroughBefore0088()
    insertRow(db, "initial", "Q")
    db.exec(MIGRATION_0088.sql)
    expect(markOf(db, "initial")).toBe("Q")
  })

  it("keeps a two-letter code", () => {
    const db = freshDbThroughBefore0088()
    insertRow(db, "code", "MT")
    db.exec(MIGRATION_0088.sql)
    expect(markOf(db, "code")).toBe("MT")
  })

  it("keeps the kit's own legitimate dingbats — a close button, a star, an arrowhead", () => {
    const db = freshDbThroughBefore0088()
    insertRow(db, "close_x", CLOSE_BUTTON_X)
    insertRow(db, "star", BLACK_STAR)
    insertRow(db, "arrowhead", BLACK_RIGHTWARDS_ARROWHEAD)
    db.exec(MIGRATION_0088.sql)
    expect(markOf(db, "close_x")).toBe(CLOSE_BUTTON_X)
    expect(markOf(db, "star")).toBe(BLACK_STAR)
    expect(markOf(db, "arrowhead")).toBe(BLACK_RIGHTWARDS_ARROWHEAD)
  })
})

describe("0088 does NOT guard on `mark IS NULL` — the exact mistake 0034/0044 made", () => {
  it("nulls a pictograph mark on a row that is otherwise fully populated (not an empty-mark backfill)", () => {
    const db = freshDbThroughBefore0088()
    insertRow(db, "populated", TICKET_EMOJI) // a real historic mark, not a blank one
    db.exec(MIGRATION_0088.sql)
    expect(markOf(db, "populated"), "a pre-existing pictograph must be reached, not stepped over").toBeNull()
  })

  it("the migration's own SQL text never guards a mark UPDATE with `AND mark IS NULL`", () => {
    // Not a substring ban on the whole script (the reactivation statement's
    // WHERE clause is unrelated to marks) — specifically the mark-nulling
    // UPDATE's own predicate.
    const markUpdate = MIGRATION_0088.sql.slice(
      MIGRATION_0088.sql.indexOf("SET mark = NULL"),
      MIGRATION_0088.sql.indexOf("UPDATE selectable_data", MIGRATION_0088.sql.indexOf("SET mark = NULL"))
    )
    expect(/mark\s+IS\s+NULL/i.test(markUpdate)).toBe(false)
  })
})

describe("0088 reactivates a protected value a PERSON deactivated before protecting it", () => {
  it("clears deactivated_at (and the deactivator audit trio) on a protected, person-deactivated row", () => {
    const db = freshDbThroughBefore0088()
    insertRow(db, "stuck", null, { isDefault: true, deactivated: true, deactivatedBy: "person" })
    db.exec(MIGRATION_0088.sql)
    const r = rowOf(db, "stuck")
    expect(r.is_default).toBe(1)
    expect(r.deactivated_at).toBeNull()
    expect(r.deactivator_id).toBeNull()
    expect(r.deactivator_email).toBeNull()
    expect(r.deactivator_name).toBeNull()
  })

  it("leaves an UNprotected deactivated row deactivated — only protected rows are reactivated", () => {
    const db = freshDbThroughBefore0088()
    insertRow(db, "just_off", null, { isDefault: false, deactivated: true, deactivatedBy: "person" })
    db.exec(MIGRATION_0088.sql)
    expect(rowOf(db, "just_off").deactivated_at).not.toBeNull()
  })

  it("leaves a protected, already-active row untouched (zero-row UPDATE, nothing to fix)", () => {
    const db = freshDbThroughBefore0088()
    insertRow(db, "fine", null, { isDefault: true, deactivated: false })
    db.exec(MIGRATION_0088.sql)
    const r = rowOf(db, "fine")
    expect(r.is_default).toBe(1)
    expect(r.deactivated_at).toBeNull()
  })
})

describe("0088 must NOT reactivate a row a MIGRATION deliberately retired — the regression team-schema.test.ts caught", () => {
  // THE BUG, SAID PLAINLY. A first draft of this migration reactivated on
  // `is_default = 1 AND deactivated_at IS NOT NULL` alone. `is_default` is the
  // seeded/starting-vocabulary flag, and several EARLIER migrations in this
  // same ledger deliberately deactivate a starting value ON PURPOSE and never
  // touch `is_default` — 0026 retiring a duplicate seeded value chief among
  // them. That bare predicate reactivated every one of those, which
  // `team-schema.test.ts`'s own 0026 suite caught immediately: a duplicate
  // "Question" ticket type 0026 exists to keep retired came back live.
  //
  // These four cases are that exact shape, reproduced directly (never through
  // the earlier migrations themselves, so this suite proves the 0088
  // PREDICATE rather than re-testing 0026/0034/0042's own behaviour, which
  // already has its own coverage).
  it("does not reactivate a protected row a migration deactivated (deactivator_id NULL, deactivator_name 'System')", () => {
    const db = freshDbThroughBefore0088()
    insertRow(db, "migration_retired", null, { isDefault: true, deactivated: true, deactivatedBy: "system" })
    db.exec(MIGRATION_0088.sql)
    const r = rowOf(db, "migration_retired")
    expect(r.is_default, "still protected — this migration never touches is_default").toBe(1)
    expect(r.deactivated_at, "a deliberate retirement must stay retired").not.toBeNull()
    expect(r.deactivator_name).toBe("System")
  })

  it("is exactly the shape 0026's own duplicate retirement leaves behind, reproduced directly", () => {
    // 0026's own SQL: `deactivator_id = NULL, deactivator_email = NULL,
    // deactivator_name = 'System'` on a row whose `is_default` it never reads
    // or writes — so a duplicate seeded ("Question") row retired by 0026
    // stays exactly `is_default = 1`, `deactivated_at` set, `deactivator_id`
    // NULL. This is that row.
    const db = freshDbThroughBefore0088()
    insertRow(db, "duplicate_retired", null, { isDefault: true, deactivated: true, deactivatedBy: "system" })
    db.exec(MIGRATION_0088.sql)
    expect(rowOf(db, "duplicate_retired").deactivated_at, "0026's retirement must survive 0088").not.toBeNull()
  })
})

// ── IDEMPOTENT BY CONSTRUCTION — the robot may call this SQL twice on the
// same database. Not hypothetical: `d1ExecScript` sends a migration's whole
// script (this SQL plus the trailing `_migrations` stamp) through D1 as ONE
// transaction, so a genuinely partial write needs a statement-level failure
// INSIDE that same transaction to survive it — but the robot itself retries
// a team that failed on version N by replaying every migration from N again
// on its NEXT run (`workers/tenancy/src/routes/admin.ts`'s `missing` loop),
// and nothing stops that next run from being 0088 a second time if an
// operator re-invokes the route, or a future migration bundled alongside it
// fails and 0088 is replayed as part of retrying the batch. Either way this
// SQL has to meet a database it has already run against and do nothing extra
// — the same bar 0072's `_numbering_0072` scratch table and 0039's back-fill
// (both in this file's sibling `team-schema.test.ts`) already have to clear.
describe("0088 is idempotent — a second run on the same handle changes nothing and drops its scratch table", () => {
  function selectableSnapshot(db: DatabaseSync) {
    return db
      .prepare(
        `SELECT id, mark, is_default, deactivated_at, deactivator_id, deactivator_email, deactivator_name
           FROM selectable_data ORDER BY id`
      )
      .all()
  }

  it("running 0088 twice leaves selectable_data byte-for-byte identical to running it once", () => {
    const db = freshDbThroughBefore0088()
    insertRow(db, "warn", WARNING_SIGN)
    insertRow(db, "warnvs", WARNING_SIGN_VS16)
    insertRow(db, "us_flag", US_FLAG)
    insertRow(db, "lone_ri", LONE_REGIONAL_INDICATOR)
    insertRow(db, "stuck", null, { isDefault: true, deactivated: true, deactivatedBy: "person" })
    insertRow(db, "migration_retired", null, { isDefault: true, deactivated: true, deactivatedBy: "system" })
    insertRow(db, "just_off", null, { isDefault: false, deactivated: true, deactivatedBy: "person" })

    db.exec(MIGRATION_0088.sql)
    const afterFirstRun = selectableSnapshot(db)

    // THE RE-RUN. Neither statement-count nor row-count assumptions here —
    // just "does it throw, and does the data move".
    expect(() => db.exec(MIGRATION_0088.sql), "a re-run must not throw (e.g. on a second CREATE TABLE)").not.toThrow()

    expect(selectableSnapshot(db), "a second run must be a pure no-op on selectable_data").toEqual(afterFirstRun)
  })

  it("does not leave the scratch table behind after a successful run — twice over", () => {
    const db = freshDbThroughBefore0088()
    insertRow(db, "warn", WARNING_SIGN)
    const scratchTableExists = () =>
      db
        .prepare("SELECT 1 AS present FROM sqlite_master WHERE type = 'table' AND name = '_pictograph_ranges_0088'")
        .get() as { present: number } | undefined

    db.exec(MIGRATION_0088.sql)
    expect(scratchTableExists(), "the scratch table must be dropped by the end of a successful run").toBeUndefined()

    db.exec(MIGRATION_0088.sql)
    expect(
      scratchTableExists(),
      "a second successful run must also leave no scratch table behind"
    ).toBeUndefined()
  })

  it("a robot re-run that finds the scratch table already sitting there (a genuinely partial prior attempt) recovers rather than wedging", () => {
    // THE SHAPE A PARTIAL FAILURE WOULD LEAVE, reproduced directly rather than
    // through a contrived mid-script throw: the scratch table exists, already
    // holds SOME of the range rows (an earlier attempt that got partway through
    // the 160 one-row INSERTs before whatever killed it), and no product row has
    // been touched yet. `CREATE TABLE IF NOT EXISTS` + `DELETE FROM` on entry is
    // exactly what has to turn this into a clean run rather than a duplicate-row
    // wedge or a stale range set silently missing coverage.
    const db = freshDbThroughBefore0088()
    insertRow(db, "warn", WARNING_SIGN)
    db.exec(`
      CREATE TABLE _pictograph_ranges_0088 (lo INTEGER NOT NULL, hi INTEGER NOT NULL);
      INSERT INTO _pictograph_ranges_0088 (lo, hi) VALUES (${0x26a0}, ${0x26a0});
    `)

    expect(() => db.exec(MIGRATION_0088.sql), "a leftover partial scratch table must not wedge the retry").not.toThrow()
    expect(markOf(db, "warn"), "the retry must still reach the row the partial attempt never got to").toBeNull()
  })
})
