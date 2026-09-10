// THE MONEY — the version cut's idempotence, the two facts this build borrows
// from the work engine, and the saving a client reads.
//
// A FOURTH BLOCK STOOD AT THE TOP OF THIS FILE and was RETIRED on 10 Sep 2026:
// four cases over `margin()`, the pure arithmetic in
// `workers/tenancy/src/lib/internal-money.ts` — revenue minus logged seconds
// times our internal rates minus tool costs, in lines a person could check. It
// was retired rather than re-pointed for the only honest reason available: the
// client killed the whole internal rates feature ("kill the whole internal rates
// thing … for now i iwanna wipe it clean"), the file was deleted, and there is
// no other function in this base that does that subtraction. A pure-arithmetic
// test has nothing to re-point AT — you cannot give `margin()` a different
// fixture, because `margin()` is gone.
//
// WHAT DID NOT GO WITH IT is the reason the block below it survives. The work
// engine's two borrowed facts are still read by a live door — `routes/
// processes.ts` calls `workEngineFacts` for the value screen — so those cases go
// on measuring something, and the `listSavings` block at the foot of the file
// never touched an internal rate at all.
//
// Three things are proved here, and each one is a place a plausible
// implementation goes quietly wrong:
//
//   1. A VERSION IS CUT ONCE PER SPRINT. The automatic cut is fired by something
//      that can fire twice — a double click, a retried job, a replayed hook — and
//      "the same thing happened twice" here is an INSERT, so the predicate cannot
//      ride a WHERE. It rides a partial unique index instead (R17), and this
//      proves the database is what refuses rather than a check a race slips past.
//   2. WHEN THE WORK ENGINE IS NOT HERE YET, the door says so instead of
//      presenting a confident zero. The two lanes were built at the same time,
//      and a team database is migrated one team at a time, so "that table is not
//      here yet" is a real state and not a hypothetical.
//   3. THE SAVING A CLIENT READS, end to end against a real database: the
//      latest version subtracted from the baseline, and a regression that stays
//      in the total whether or not somebody explained it.

import { DatabaseSync } from "node:sqlite"
import { beforeEach, describe, expect, it, vi } from "vitest"

const holder = vi.hoisted(() => ({ db: null as DatabaseSync | null }))

vi.mock("@shared/workers/d1-rest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/d1-rest")>()
  const { d1Impl } = await import("./d1-sqlite")
  return { ...actual, ...d1Impl(() => holder.db as DatabaseSync) }
})

import { cutVersion, listProcessVersions, listProcessSteps, listSavings } from "../src/lib/processes"
import { workEngineFacts } from "../src/lib/work-engine"
import { buildSpineDb, IDS } from "./spine-harness"

const db = () => holder.db as DatabaseSync
const cfg = { accountId: "a", apiToken: "t" } as never
const guard = { userId: IDS.staffUser, teamId: IDS.team, roleId: IDS.adminRole, databaseId: "db_team" }
const actor = { id: IDS.staffUser, email: "staff@kwapso.app", name: "Staff" }
const staff = { kind: "staff" } as const

beforeEach(() => {
  holder.db = buildSpineDb()
})

describe("the two facts we borrow from the work engine", () => {
  // THE WORK ENGINE HAS LANDED (12 Aug 2026), so these cases changed shape. They
  // used to create a FAKE `sprints` table per case, because the real one did not
  // exist yet and the borrow was written against BUILD-1's declaration rather
  // than against code. Both tables are now in the team migrations, and with them
  // the one contract ambiguity is settled: the price column is
  // `sold_price_cents`, whole cents on both sides, so there is no longer a
  // spelling for the adapter to detect or a major-unit conversion to prove.
  it("answers 'not here yet' rather than a confident zero when a table is absent", async () => {
    // A team database is migrated one at a time by an ops route, so "this one has
    // not rolled that migration yet" is a real production state — reproduced here
    // by taking a table away rather than by never having written it. A caller
    // that read the price and silently subtracted nothing would report a
    // beautiful 100%, which is the failure this flag exists to prevent.
    db().exec(`DROP TABLE work_logs`)
    const facts = await workEngineFacts(cfg, guard, IDS.victimAccount)
    expect(facts.ready, "both work-engine tables must be present before the figure is claimed").toBe(false)
    expect(facts.soldCents).toBe(0)
    expect(facts.loggedSeconds).toBe(0)
  })

  it("reads the price in whole cents, and never multiplies it again", async () => {
    db().exec(`
      INSERT INTO sprints (id, account_id, name, sold_price_cents, created_at)
        VALUES ('S1', '${IDS.victimAccount}', 'Sprint 4', 499999, '2026-08-12T00:00:00.000Z');
      INSERT INTO work_logs (id, account_id, target_table, target_id, user_id, started_at, ended_at, seconds, created_at) VALUES
        ('W1', '${IDS.victimAccount}', 'stories', 'X', 'U', '2026-08-12T09:00:00.000Z', '2026-08-12T10:00:00.000Z', 3600, '2026-08-12T09:00:00.000Z'),
        ('W2', '${IDS.victimAccount}', 'stories', 'X', 'U', '2026-08-12T10:00:00.000Z', '2026-08-12T10:30:00.000Z', 1800, '2026-08-12T10:00:00.000Z');
    `)
    const facts = await workEngineFacts(cfg, guard, IDS.victimAccount)
    expect(facts.ready).toBe(true)
    expect(facts.soldCents).toBe(499_999)
    expect(facts.loggedSeconds).toBe(5400)
  })

  it("counts only the named account's money and nobody else's", async () => {
    db().exec(`
      INSERT INTO sprints (id, account_id, name, sold_price_cents, created_at) VALUES
        ('S1', '${IDS.victimAccount}', 'Theirs', 10000, '2026-08-12T00:00:00.000Z'),
        ('S2', '${IDS.burglarAccount}', 'Somebody else''s', 90000, '2026-08-12T00:00:00.000Z');
    `)
    const facts = await workEngineFacts(cfg, guard, IDS.victimAccount)
    expect(facts.soldCents).toBe(10_000)
  })
})

describe("a version is cut by hand, and a double press cuts one", () => {
  it("copies every step forward, keeping the key that makes a saving a subtraction", async () => {
    const cut = await cutVersion(cfg, guard, staff, actor, {
      processId: IDS.victimProcess,
      label: "After the first sprint",
    })
    expect(cut?.versionNo).toBe(2)

    const versions = await listProcessVersions(cfg, guard, staff, IDS.victimProcess)
    expect(versions.map((v) => v.versionNo)).toEqual([2, 1])
    expect(versions.find((v) => v.versionNo === 1)?.isBaseline).toBe(true)

    // The step travelled forward as a NEW row under the SAME key.
    const steps = await listProcessSteps(cfg, guard, staff, IDS.victimProcess)
    expect(steps).toHaveLength(1)
    expect(steps[0].stepKey).toBe("SK_VICTIM")
    expect(steps[0].id).not.toBe(IDS.victimStep)
    expect(steps[0].versionId).toBe(cut?.versionId)
    expect(steps[0].secondsPerRun).toBe(2400)
  })

  // R17, for a transition that is an INSERT. The predicate cannot ride a WHERE,
  // so it rides the unique index on (process_id, version_no) — the database
  // refuses, not a check a second request could slip past.
  //
  // THE RACE IS THE DOUBLE CLICK, not the second thought. Two submissions that
  // overlap both read version N and both try to insert N+1; the loser is refused
  // and reads that as "already cut". A person who presses, sees version 2, and
  // then deliberately presses again gets version 3, because they meant it — that
  // is the test below this one.
  it("two overlapping presses cut ONE version, and the second is silent", async () => {
    const before = await latestVersionNo()
    const [first, second] = await Promise.all([
      cutVersion(cfg, guard, staff, actor, { processId: IDS.victimProcess }),
      cutVersion(cfg, guard, staff, actor, { processId: IDS.victimProcess }),
    ])
    const cuts = [first, second].filter(Boolean)
    expect(cuts, "exactly one of two overlapping presses may cut").toHaveLength(1)
    expect(cuts[0]?.versionNo).toBe(before + 1)

    const versions = await listProcessVersions(cfg, guard, staff, IDS.victimProcess)
    expect(versions.map((v) => v.versionNo)).toEqual([before + 1, before])
    // Zero rows moved = no activity row, exactly like every other transition.
    const history = db()
      .prepare("SELECT COUNT(*) AS n FROM activity WHERE type = 'Version cut'")
      .get() as { n: number }
    expect(history.n, "history says what happened, not how many times it was fired").toBe(1)
  })

  it("pressing again, deliberately, cuts the next one — because they meant it", async () => {
    await cutVersion(cfg, guard, staff, actor, { processId: IDS.victimProcess })
    await cutVersion(cfg, guard, staff, actor, { processId: IDS.victimProcess })
    await cutVersion(cfg, guard, staff, actor, { processId: IDS.victimProcess })
    const versions = await listProcessVersions(cfg, guard, staff, IDS.victimProcess)
    expect(versions.map((v) => v.versionNo)).toEqual([4, 3, 2, 1])
  })
})

/** The highest version number this process currently carries. */
async function latestVersionNo(): Promise<number> {
  const versions = await listProcessVersions(cfg, guard, staff, IDS.victimProcess)
  return versions[0]?.versionNo ?? 0
}

describe("the saving a client reads, end to end, against a real database", () => {
  it("subtracts the LATEST version from version 1 — not the other way round", async () => {
    // Cut a version, then make the step faster in it: 40 minutes → 8, 20× a month.
    const cut = await cutVersion(cfg, guard, staff, actor, { processId: IDS.victimProcess })
    db()
      .prepare("UPDATE process_steps SET seconds_per_run = 480 WHERE version_id = ?")
      .run(cut?.versionId as string)

    const view = await listSavings(cfg, guard, staff)
    const step = view.apps[0].processes[0].steps[0]
    expect(step.baselineSecondsPerRun).toBe(2400)
    expect(step.latestSecondsPerRun).toBe(480)
    expect(step.savedSecondsPerMonth).toBe(38_400)
    expect(view.savedSecondsPerMonth).toBe(38_400)
  })

  it("a step removed in the latest version saves all of its old time", async () => {
    const cut = await cutVersion(cfg, guard, staff, actor, { processId: IDS.victimProcess })
    db()
      .prepare("UPDATE process_steps SET seconds_per_run = 0, removed_at = '2026-03-01' WHERE version_id = ?")
      .run(cut?.versionId as string)

    const view = await listSavings(cfg, guard, staff)
    const step = view.apps[0].processes[0].steps[0]
    expect(step.removed).toBe(true)
    // 40 minutes × 20 a month, all of it.
    expect(step.savedSecondsPerMonth).toBe(48_000)
  })

  // The explanation is a STAFF comment naming the step. A client's own comment
  // naming one must never mark a regression as explained.
  it("a step counts as explained only when the TEAM has explained it", async () => {
    const cut = await cutVersion(cfg, guard, staff, actor, { processId: IDS.victimProcess })
    db()
      .prepare("UPDATE process_steps SET seconds_per_run = 9000 WHERE version_id = ?")
      .run(cut?.versionId as string)

    const before = await listSavings(cfg, guard, staff)
    expect(before.apps[0].processes[0].steps[0].regression).toBe(true)
    expect(before.apps[0].processes[0].steps[0].explained).toBe(false)

    // A CLIENT's comment naming the step — not an explanation.
    db()
      .prepare(
        `INSERT INTO process_comments (id, process_id, account_id, body, explains_step_key, is_staff, created_at, creator_id)
         VALUES ('PC_CLIENT', ?, ?, 'why is this slower now?', 'SK_VICTIM', 0, '2026-03-02', ?)`
      )
      .run(IDS.victimProcess, IDS.victimAccount, IDS.victimUser)
    const stillUnexplained = await listSavings(cfg, guard, staff)
    expect(stillUnexplained.apps[0].processes[0].steps[0].explained).toBe(false)

    // Ours is.
    db()
      .prepare(
        `INSERT INTO process_comments (id, process_id, account_id, body, explains_step_key, is_staff, created_at, creator_id)
         VALUES ('PC_STAFF', ?, ?, 'It now includes the approval we used to do separately.', 'SK_VICTIM', 1, '2026-03-03', ?)`
      )
      .run(IDS.victimProcess, IDS.victimAccount, IDS.staffUser)
    const after = await listSavings(cfg, guard, staff)
    expect(after.apps[0].processes[0].steps[0].explained).toBe(true)
    // And it is STILL a regression, still in the list, still in the total —
    // explaining one never hides it (BUILD-3 §3).
    expect(after.apps[0].processes[0].steps[0].regression).toBe(true)
    expect(after.savedSecondsPerMonth).toBeLessThan(0)
  })
})
