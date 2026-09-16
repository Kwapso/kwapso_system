// 0100's OWN PROOF, run against a real schema (node:sqlite) — the pattern
// migration-0088-pictograph-marks.test.ts and migration-carry-over.test.ts
// both use for a migration whose whole subject is SQL a TypeScript-shaped
// assertion cannot see inside of.
//
// TWO HALVES, ONE MIGRATION: (a) at most one ACTIVE row may share a (type,
// value) — found on staging as two live "Plan" rows and two live "Build"
// rows under "Sprint type" (Kwapso, team-01kzwxfd86n0k3rzrbhkmkrwys), the
// result of 0098's rename statement reactivating a dormant duplicate it
// never checked for — and (b) a wider `waves.app_id` backfill that reads
// every sprint with an app, live or not, instead of only live ones.
//
// Neither half is planted through `createSelectable`/`updateSelectable`,
// which refuse a duplicate at the door today: this seeds the ALREADY-POISONED
// shape directly, the way 0098's own statement could produce it, and applies
// 0100 to prove the repair — not the door's own refusal, which is proved
// elsewhere (selectable-doors.test.ts).

import { DatabaseSync } from "node:sqlite"
import { describe, expect, it } from "vitest"

import { TEAM_MIGRATIONS } from "../src/team-schema"

const CUTOFF_INDEX = TEAM_MIGRATIONS.findIndex((m) => m.version.startsWith("0100_"))
const BEFORE_0100 = TEAM_MIGRATIONS.slice(0, CUTOFF_INDEX)
const MIGRATION_0100 = TEAM_MIGRATIONS[CUTOFF_INDEX]

// A CAPTIVE UPSTREAM MIGRATION, so a renumbering upstream fails loudly here
// instead of silently testing an empty slice.
it("0100 exists, right after every migration this suite seeds against", () => {
  expect(CUTOFF_INDEX, "0100 must exist in TEAM_MIGRATIONS").toBeGreaterThan(0)
  expect(MIGRATION_0100.version).toBe("0100_selectable_dedupe_and_wider_wave_app_backfill")
})

function freshDbThroughBefore0100(): DatabaseSync {
  const db = new DatabaseSync(":memory:")
  for (const m of BEFORE_0100) db.exec(m.sql)
  return db
}

describe("0100 — at most one active row per (type, value)", () => {
  // A FIXTURE TYPE NOTHING ELSE IN THE LEDGER TOUCHES. "Sprint type" and "App
  // stage" are themselves seeded by 0097/0098's own `INSERT … WHERE NOT
  // EXISTS` the moment a fresh database replays them (even with no team-seed
  // script run at all), so a hand-planted "Sprint type"/"Plan" row would
  // collide with a row the migrations already created — a real interaction,
  // covered by team-schema.test.ts's own "0098" suite, but not the shape this
  // test wants to isolate. A type no migration seeds keeps the fixture exact.
  const FIXTURE_TYPE = "Widget kind"

  it("two active rows sharing one value: the older survives, the newer is deactivated by System", () => {
    const db = freshDbThroughBefore0100()
    // THE STAGING SHAPE, MINIMISED: two live rows, same type, same value,
    // different `created_at` and `id` — exactly what 0098's rename statement
    // could produce (a live row renamed onto the canonical word, plus a
    // dormant duplicate the same statement reactivated and renamed alongside
    // it). Neither is protected (`is_default`), same as an ordinary team word.
    db.exec(`
      INSERT INTO selectable_data (id, type, value, is_default, created_at)
        VALUES ('OLDER', '${FIXTURE_TYPE}', 'Plan', 1, '2026-08-01T00:00:00.000Z'),
               ('NEWER', '${FIXTURE_TYPE}', 'Plan', 1, '2026-09-16T12:23:57.000Z');
    `)
    db.exec(MIGRATION_0100.sql)

    const rows = db
      .prepare(
        `SELECT id, deactivated_at, deactivator_name FROM selectable_data WHERE type = '${FIXTURE_TYPE}' AND value = 'Plan' ORDER BY id`
      )
      .all() as { id: string; deactivated_at: string | null; deactivator_name: string | null }[]
    expect(rows).toHaveLength(2)

    const older = rows.find((r) => r.id === "OLDER")!
    const newer = rows.find((r) => r.id === "NEWER")!
    expect(older.deactivated_at, "the oldest row keeps its seat").toBeNull()
    expect(newer.deactivated_at, "the younger duplicate is retired, never deleted").not.toBeNull()
    expect(newer.deactivator_name, "a migration's own signature").toBe("System")

    // Exactly one ACTIVE row now answers for (FIXTURE_TYPE, 'Plan') — the
    // invariant the partial unique index (below) then makes structural.
    const activeCount = db
      .prepare(
        `SELECT COUNT(*) AS n FROM selectable_data WHERE type = '${FIXTURE_TYPE}' AND value = 'Plan' AND deactivated_at IS NULL`
      )
      .get() as { n: number }
    expect(activeCount.n).toBe(1)
  })

  it("a dedupe over a DIFFERENT type does not touch an unrelated pair sharing the same value word", () => {
    const db = freshDbThroughBefore0100()
    db.exec(`
      INSERT INTO selectable_data (id, type, value, is_default, created_at)
        VALUES ('A1', '${FIXTURE_TYPE}', 'Only one', 1, '2026-08-01T00:00:00.000Z'),
               ('A2', '${FIXTURE_TYPE} 2', 'Only one', 1, '2026-08-01T00:00:00.000Z');
    `)
    db.exec(MIGRATION_0100.sql)
    const rows = db
      .prepare(`SELECT id, deactivated_at FROM selectable_data WHERE value = 'Only one' ORDER BY id`)
      .all() as {
      id: string
      deactivated_at: string | null
    }[]
    expect(rows).toHaveLength(2)
    for (const r of rows) expect(r.deactivated_at, `${r.id} is not a duplicate of anything`).toBeNull()
  })

  it("the partial unique index exists and refuses a second active row once the dedupe has run", () => {
    const db = freshDbThroughBefore0100()
    db.exec(MIGRATION_0100.sql)
    db.exec(
      "INSERT INTO selectable_data (id, type, value, is_default, created_at) VALUES ('X1', 'Custom', 'Only', 0, '2026-01-01')"
    )
    expect(() =>
      db.exec(
        "INSERT INTO selectable_data (id, type, value, is_default, created_at) VALUES ('X2', 'Custom', 'Only', 0, '2026-01-02')"
      )
    ).toThrow(/UNIQUE constraint failed/)
    // …but a DEACTIVATED duplicate is never blocked — the index is partial.
    expect(() =>
      db.exec(
        `INSERT INTO selectable_data (id, type, value, is_default, created_at, deactivated_at)
           VALUES ('X3', 'Custom', 'Only', 0, '2026-01-03', '2026-01-04')`
      )
    ).not.toThrow()
  })

  it("is idempotent: applying it twice deactivates nothing the second time", () => {
    const db = freshDbThroughBefore0100()
    db.exec(`
      INSERT INTO selectable_data (id, type, value, is_default, created_at)
        VALUES ('OLDER', 'Sprint type', 'Build', 1, '2026-08-01T00:00:00.000Z'),
               ('NEWER', 'Sprint type', 'Build', 1, '2026-09-16T12:23:57.000Z');
    `)
    db.exec(MIGRATION_0100.sql)
    expect(() => db.exec(MIGRATION_0100.sql)).not.toThrow()
    const rows = db
      .prepare("SELECT id, deactivated_at FROM selectable_data WHERE type = 'Sprint type' AND value = 'Build'")
      .all() as { id: string; deactivated_at: string | null }[]
    expect(rows.filter((r) => r.deactivated_at == null)).toHaveLength(1)
  })
})

describe("0100 — the wider wave app backfill", () => {
  function seedWaveWithSprints(
    db: DatabaseSync,
    opts: { waveAppId?: string | null; sprints: { appId: string | null; deactivated: boolean }[] }
  ) {
    db.exec(`
      INSERT INTO accounts (id, account_type, name, created_at) VALUES ('ACC1', 'entity', 'Client', '2026-01-01');
      INSERT INTO apps (id, account_id, name, created_at) VALUES ('APP1', 'ACC1', 'System', '2026-01-01');
      INSERT INTO apps (id, account_id, name, created_at) VALUES ('APP2', 'ACC1', 'Portal', '2026-01-01');
      INSERT INTO waves (id, account_id, name, created_at${opts.waveAppId !== undefined ? ", app_id" : ""})
        VALUES ('WAVE1', 'ACC1', 'Package one', '2026-01-01'${
          opts.waveAppId !== undefined ? `, ${opts.waveAppId === null ? "NULL" : `'${opts.waveAppId}'`}` : ""
        });
    `)
    opts.sprints.forEach((s, i) => {
      db.exec(`
        INSERT INTO sprints (id, wave_id, account_id, name, created_at, app_id, deactivated_at)
          VALUES ('S${i}', 'WAVE1', 'ACC1', 'Sprint ${i}', '2026-01-0${i + 2}',
                  ${s.appId === null ? "NULL" : `'${s.appId}'`},
                  ${s.deactivated ? "'2026-02-01'" : "NULL"});
      `)
    })
  }

  it("fills a wave's app from a DEACTIVATED sprint's app_id when it is the only one that ever named one", () => {
    const db = freshDbThroughBefore0100()
    seedWaveWithSprints(db, {
      sprints: [
        { appId: "APP1", deactivated: true }, // finished/corrected, but still the wave's own app
      ],
    })
    // 0099's own (narrower) backfill already ran as part of BEFORE_0100 and
    // left this NULL, since the sprint above is not live — the case this
    // migration exists to widen.
    const before = db.prepare("SELECT app_id FROM waves WHERE id = 'WAVE1'").get() as { app_id: string | null }
    expect(before.app_id, "0099's own backfill must not have filled this — it only reads live sprints").toBeNull()

    db.exec(MIGRATION_0100.sql)
    const after = db.prepare("SELECT app_id FROM waves WHERE id = 'WAVE1'").get() as { app_id: string | null }
    expect(after.app_id, "the wider backfill fills it from the deactivated sprint").toBe("APP1")
  })

  it("still refuses to guess when app-bearing sprints (live or not) disagree", () => {
    const db = freshDbThroughBefore0100()
    seedWaveWithSprints(db, {
      sprints: [
        { appId: "APP1", deactivated: true },
        { appId: "APP2", deactivated: false },
      ],
    })
    db.exec(MIGRATION_0100.sql)
    const row = db.prepare("SELECT app_id FROM waves WHERE id = 'WAVE1'").get() as { app_id: string | null }
    expect(row.app_id, "two different apps named — left NULL rather than guessed at").toBeNull()
  })

  it("never overwrites an app_id already set through the door", () => {
    const db = freshDbThroughBefore0100()
    seedWaveWithSprints(db, {
      waveAppId: "APP2",
      sprints: [{ appId: "APP1", deactivated: false }],
    })
    db.exec(MIGRATION_0100.sql)
    const row = db.prepare("SELECT app_id FROM waves WHERE id = 'WAVE1'").get() as { app_id: string | null }
    expect(row.app_id, "a value set at the door is never overwritten by a backfill").toBe("APP2")
  })

  it("the Kwapso shape: every wave-wrapped sprint has no app at all, live or dead — the backfill fills nothing, honestly", () => {
    const db = freshDbThroughBefore0100()
    seedWaveWithSprints(db, {
      sprints: [
        { appId: null, deactivated: false },
        { appId: null, deactivated: false },
      ],
    })
    db.exec(MIGRATION_0100.sql)
    const row = db.prepare("SELECT app_id FROM waves WHERE id = 'WAVE1'").get() as { app_id: string | null }
    expect(row.app_id, "no app was ever named on any sprint in the wave — nothing to fill, nothing invented").toBeNull()
  })
})
