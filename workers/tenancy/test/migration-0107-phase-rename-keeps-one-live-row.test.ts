// 0107's OWN PROOF, run against a real schema (node:sqlite), the pattern
// migration-0100-selectable-dedupe-and-wave-app.test.ts uses. 0107's step 4
// used to rename EVERY selectable_data row matching a candidate spelling of
// a canonical phase word, live or dormant, and clear its deactivated_at in
// the same UPDATE. On the Kwapso staging team a live "Plan" row and a
// deactivated duplicate "Plan" row both matched, both turned live, and the
// partial unique index (migration 0100, idx_selectable_type_value_active,
// ON (type, value) WHERE deactivated_at IS NULL) refused the second one:
//
//   D1_ERROR: UNIQUE constraint failed: selectable_data.type, selectable_data.value
//
// This suite seeds the exact live Kwapso shape (as told, not re-derived
// remotely) and proves the fixed step 4 lands exactly one live row per
// canonical word, everywhere the old statement could have collided.

import { DatabaseSync } from "node:sqlite"
import { describe, expect, it } from "vitest"

import { PHASE_TYPES } from "@shared/sprint-types"

import { TEAM_MIGRATIONS } from "../src/team-schema"

const CUTOFF_INDEX = TEAM_MIGRATIONS.findIndex((m) => m.version.startsWith("0107_"))
const BEFORE_0107 = TEAM_MIGRATIONS.slice(0, CUTOFF_INDEX)
const MIGRATION_0107 = TEAM_MIGRATIONS[CUTOFF_INDEX]

// THE PHASE-RENAME SLICE, step 4 alone (the part this suite exists to
// prove), pulled out of the migration's own text by its own comment
// markers rather than retyped. The other steps in this migration are not
// idempotent by construction and were never meant to be: step 1's `ALTER
// TABLE ... ADD COLUMN` throws "duplicate column name" on a second run
// because SQLite's ALTER TABLE has no "IF NOT EXISTS" form, exactly the way
// every other migration in this ledger runs exactly once per team through
// the migration gate. Step 4 is the part the bug and the fix both live in,
// so it is the part idempotency is asked of here.
const STEP_4_START = "-- 4 · THE SEVEN CANONICAL WORDS"
const STEP_5_START = "-- 5 · THE RECORD ID PREFIX"
const step4StartIndex = MIGRATION_0107.sql.indexOf(STEP_4_START)
const step5StartIndex = MIGRATION_0107.sql.indexOf(STEP_5_START)
if (step4StartIndex < 0 || step5StartIndex < 0 || step5StartIndex <= step4StartIndex) {
  throw new Error("0107's own step 4/5 markers moved; update this test's slice markers to match")
}
const PHASE_RENAME_SQL = MIGRATION_0107.sql.slice(step4StartIndex, step5StartIndex)

// A CAPTIVE UPSTREAM MIGRATION, so a renumbering upstream fails loudly here
// instead of silently testing an empty slice (the same guard 0100's own
// suite opens with).
it("0107 exists, right after every migration this suite seeds against", () => {
  expect(CUTOFF_INDEX, "0107 must exist in TEAM_MIGRATIONS").toBeGreaterThan(0)
  expect(MIGRATION_0107.version).toBe("0107_sprint_becomes_phase_goal_and_wave_lifecycle")
})

function freshDbThroughBefore0107(): DatabaseSync {
  const db = new DatabaseSync(":memory:")
  for (const m of BEFORE_0107) db.exec(m.sql)
  return db
}

type SelectableRow = {
  id: string
  value: string
  position: number | null
  deactivated_at: string | null
  deactivator_name: string | null
}

function phaseTypeRows(db: DatabaseSync): SelectableRow[] {
  return db
    .prepare(
      `SELECT id, value, position, deactivated_at, deactivator_name FROM selectable_data
        WHERE type = 'Phase type' ORDER BY value, id`
    )
    .all() as SelectableRow[]
}

describe("0107 - the Kwapso staging shape (live rows on Sprint type plus two deactivated duplicates)", () => {
  function seedKwapsoShape(db: DatabaseSync) {
    // "Sprint type" rows, exactly as reported live: seven live rows in
    // position order, a deactivated duplicate of Plan and of Build (both
    // deactivated the same second), and six wholly-retired rows (Iteration
    // twice) that fold into nothing at step 4's own closing statement.
    db.exec(`
      DELETE FROM selectable_data WHERE type = 'Sprint type';
      INSERT INTO selectable_data (id, type, value, is_default, position, created_at)
        VALUES
          ('LIVE-NOT-STARTED', 'Sprint type', 'Not started', 1, 1, '2026-08-01T00:00:00.000Z'),
          ('LIVE-AUDIT',        'Sprint type', 'Audit',       1, 2, '2026-08-01T00:00:00.000Z'),
          ('LIVE-PLAN',         'Sprint type', 'Plan',        1, 3, '2026-08-01T00:00:00.000Z'),
          ('LIVE-BUILD',        'Sprint type', 'Build',       1, 4, '2026-08-01T00:00:00.000Z'),
          ('LIVE-VALIDATION',   'Sprint type', 'Validation',  1, 5, '2026-08-01T00:00:00.000Z'),
          ('LIVE-REFINEMENTS',  'Sprint type', 'Refinements', 1, 6, '2026-08-01T00:00:00.000Z'),
          ('LIVE-ENHANCEMENT',  'Sprint type', 'Enhancement', 1, 7, '2026-08-01T00:00:00.000Z');
      INSERT INTO selectable_data (id, type, value, is_default, position, created_at, deactivated_at, deactivator_name)
        VALUES
          ('DUP-PLAN',  'Sprint type', 'Plan',  1, 3, '2026-07-01T00:00:00.000Z', '2026-09-16T12:50:48.000Z', 'System'),
          ('DUP-BUILD', 'Sprint type', 'Build', 1, 4, '2026-07-01T00:00:00.000Z', '2026-09-16T12:50:48.000Z', 'System'),
          ('DEAD-DATA-MIGRATION',    'Sprint type', 'Data Migration',       1, 0, '2026-06-01T00:00:00.000Z', '2026-08-01T00:00:00.000Z', 'System'),
          ('DEAD-DIAGNOSTIC',        'Sprint type', 'Diagnostic',           1, 0, '2026-06-01T00:00:00.000Z', '2026-08-01T00:00:00.000Z', 'System'),
          ('DEAD-FOUNDATION',        'Sprint type', 'Foundation',           1, 0, '2026-06-01T00:00:00.000Z', '2026-08-01T00:00:00.000Z', 'System'),
          ('DEAD-ITERATION-1',       'Sprint type', 'Iteration',            1, 0, '2026-06-01T00:00:00.000Z', '2026-08-01T00:00:00.000Z', 'System'),
          ('DEAD-ITERATION-2',       'Sprint type', 'Iteration',            1, 0, '2026-06-02T00:00:00.000Z', '2026-08-02T00:00:00.000Z', 'System'),
          ('DEAD-PROCESS-OPT',       'Sprint type', 'Process Optimization', 1, 0, '2026-06-01T00:00:00.000Z', '2026-08-01T00:00:00.000Z', 'System'),
          ('DEAD-TRAINING',          'Sprint type', 'Training',             1, 0, '2026-06-01T00:00:00.000Z', '2026-08-01T00:00:00.000Z', 'System');
    `)
  }

  it("does not throw, unlike the original statement against this exact shape", () => {
    const db = freshDbThroughBefore0107()
    seedKwapsoShape(db)
    expect(() => db.exec(MIGRATION_0107.sql)).not.toThrow()
  })

  it("lands exactly the seven canonical Phase type rows, live, in PHASE_TYPES' own order and position", () => {
    const db = freshDbThroughBefore0107()
    seedKwapsoShape(db)
    db.exec(MIGRATION_0107.sql)

    const rows = phaseTypeRows(db)
    const live = rows.filter((r) => r.deactivated_at === null)
    // Read off PHASE_TYPES itself (the array the migration's own SQL is
    // generated from) rather than a hand-typed list, so this test cannot
    // drift from the one thing the migration actually promises to write.
    const expectedNames = PHASE_TYPES.map((p) => p.name)
    expect(expectedNames, "PHASE_TYPES must still be the seven words this migration targets").toHaveLength(7)

    expect(live.map((r) => r.value).sort()).toEqual([...expectedNames].sort())
    for (const p of PHASE_TYPES) {
      const row = live.find((r) => r.value === p.name)
      expect(row, `a live row named ${p.name}`).toBeTruthy()
      expect(row!.position).toBe(PHASE_TYPES.indexOf(p) + 1)
    }
  })

  it("no two live Phase type rows ever share a value (the invariant the unique index polices)", () => {
    const db = freshDbThroughBefore0107()
    seedKwapsoShape(db)
    db.exec(MIGRATION_0107.sql)

    const live = phaseTypeRows(db).filter((r) => r.deactivated_at === null)
    const values = live.map((r) => r.value)
    expect(new Set(values).size).toBe(values.length)
  })

  it("the deactivated Plan duplicate is still deactivated, and keeps its own old timestamp", () => {
    const db = freshDbThroughBefore0107()
    seedKwapsoShape(db)
    db.exec(MIGRATION_0107.sql)

    const dup = db
      .prepare("SELECT deactivated_at FROM selectable_data WHERE id = 'DUP-PLAN'")
      .get() as { deactivated_at: string | null }
    expect(dup.deactivated_at, "the duplicate must not have been reactivated").not.toBeNull()
    expect(dup.deactivated_at).toBe("2026-09-16T12:50:48.000Z")

    const dupBuild = db
      .prepare("SELECT deactivated_at FROM selectable_data WHERE id = 'DUP-BUILD'")
      .get() as { deactivated_at: string | null }
    expect(dupBuild.deactivated_at).toBe("2026-09-16T12:50:48.000Z")
  })

  it('"Not started" and "Enhancement" fold into nothing and end up deactivated', () => {
    const db = freshDbThroughBefore0107()
    seedKwapsoShape(db)
    db.exec(MIGRATION_0107.sql)

    const notStarted = db
      .prepare("SELECT deactivated_at FROM selectable_data WHERE id = 'LIVE-NOT-STARTED'")
      .get() as { deactivated_at: string | null }
    expect(notStarted.deactivated_at).not.toBeNull()

    const enhancement = db
      .prepare("SELECT deactivated_at FROM selectable_data WHERE id = 'LIVE-ENHANCEMENT'")
      .get() as { deactivated_at: string | null }
    expect(enhancement.deactivated_at).not.toBeNull()
  })

  it("a second run of the same SQL (the phase-rename step) is a no-op: idempotent, no throw, same live set", () => {
    const db = freshDbThroughBefore0107()
    seedKwapsoShape(db)
    db.exec(MIGRATION_0107.sql)
    const before = phaseTypeRows(db)

    expect(() => db.exec(PHASE_RENAME_SQL)).not.toThrow()

    const after = phaseTypeRows(db)
    expect(after).toEqual(before)
  })
})

describe("0107 - a team with no prior Sprint type or Phase type rows at all", () => {
  it("inserts the seven canonical rows fresh, through the INSERT ... WHERE NOT EXISTS path", () => {
    const db = freshDbThroughBefore0107()
    db.exec("DELETE FROM selectable_data WHERE type IN ('Sprint type', 'Phase type')")

    expect(() => db.exec(MIGRATION_0107.sql)).not.toThrow()

    const live = phaseTypeRows(db).filter((r) => r.deactivated_at === null)
    expect(live.map((r) => r.value).sort()).toEqual(PHASE_TYPES.map((p) => p.name).sort())
  })
})

describe("0107 - a team where only a deactivated candidate spelling exists (the reactivation path)", () => {
  it("reactivates the most recently deactivated candidate onto the canonical word, position and mark", () => {
    const db = freshDbThroughBefore0107()
    db.exec(`
      DELETE FROM selectable_data WHERE type IN ('Sprint type', 'Phase type');
      INSERT INTO selectable_data (id, type, value, is_default, position, created_at, deactivated_at, deactivator_name)
        VALUES
          ('OLD-REFINEMENT',  'Sprint type', 'Refinement',  1, 0, '2026-05-01T00:00:00.000Z', '2026-06-01T00:00:00.000Z', 'System'),
          ('NEWER-REFINEMENTS', 'Sprint type', 'Refinements', 1, 0, '2026-05-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z', 'System');
    `)

    db.exec(MIGRATION_0107.sql)

    const revisionCandidate = PHASE_TYPES.find((p) => p.name === "Revision")!
    const revisionPosition = PHASE_TYPES.indexOf(revisionCandidate) + 1

    const reactivated = db
      .prepare("SELECT id, value, position, deactivated_at FROM selectable_data WHERE id = 'NEWER-REFINEMENTS'")
      .get() as { id: string; value: string; position: number; deactivated_at: string | null }
    // The most recently deactivated candidate (2026-07-01, newer than
    // 2026-06-01) is the one reactivated onto the canonical word.
    expect(reactivated.value).toBe("Revision")
    expect(reactivated.deactivated_at).toBeNull()
    expect(reactivated.position).toBe(revisionPosition)

    const stillDead = db
      .prepare("SELECT value, deactivated_at FROM selectable_data WHERE id = 'OLD-REFINEMENT'")
      .get() as { value: string; deactivated_at: string | null }
    expect(stillDead.value).toBe("Refinement")
    expect(stillDead.deactivated_at).not.toBeNull()

    const live = phaseTypeRows(db).filter((r) => r.deactivated_at === null)
    expect(live.map((r) => r.value).sort()).toEqual(PHASE_TYPES.map((p) => p.name).sort())
  })
})
