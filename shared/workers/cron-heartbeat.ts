// A CRON THAT STOPPED FIRING IS THE PUREST BACKGROUND FAILURE: nothing errored,
// nothing was recorded, and the work simply stopped happening.
//
// Every scheduled handler here already records what goes WRONG on a tick (R12).
// None of them could say that a tick never came. The nightly retention sweep,
// the fifteen-minute knowledge sweep and the morning digest each write to a
// team's tables on a good tick and to `error_logs` on a bad one — and a
// schedule that Cloudflare silently dropped, or a worker whose deploy failed
// after its cron trigger was removed, writes to neither. From the outside that
// is indistinguishable from a quiet estate. `knowledge_ingest.last_ok_at`
// existed for a year and nothing read it for staleness; it is per team and per
// kind, in a team database, and cannot say whether the SCHEDULE is alive.
//
// So each tick BEATS: one row per job in core, `last_run_at` moved on every
// fire and `last_ok_at` only on a clean one. And the two workers WATCH EACH
// OTHER, once a day each: tenancy's nightly reads content's two beats and
// content's morning tick reads tenancy's, and a beat older than twice its
// period becomes one row in `error_logs` — which the ops digest mails that
// night as a fresh signature. If EVERY cron on the estate is dead at once,
// nobody watches the watchers; that is said plainly here rather than hidden.
//
// THE JOBS ARE DATA, and the check reads them: the migration that creates the
// table seeds one row per job (so a schedule that never fires after a fresh
// deploy is noticed after two periods rather than never), and a test holds
// this table equal to the crons the two wrangler configs declare.

import { logError, type CoreDb } from "./error-log"

/** The slice of a D1 binding this seam uses — `CoreDb`'s write shape plus a
 * bound-less `all()` for the one read. Structural, so shared/ compiles in every
 * workspace; the real `env.DB` satisfies it (a prepared statement carries both). */
export type BeatDb = {
  prepare(sql: string): {
    bind(...values: unknown[]): { run(): Promise<unknown> }
    all(): Promise<{ results?: unknown[] }>
  }
}

/** Every scheduled job on the estate, with the worker that owns it and how
 * often its trigger fires. The period is the cron expression's, said once
 * here rather than parsed from it (content/index.ts makes the same choice). */
export const CRON_JOBS = {
  "knowledge-sweep": { worker: "content", periodMs: 15 * 60 * 1000 },
  "morning-digest": { worker: "content", periodMs: 24 * 60 * 60 * 1000 },
  nightly: { worker: "tenancy", periodMs: 24 * 60 * 60 * 1000 },
} as const

export type CronJob = keyof typeof CRON_JOBS

/** How many periods a beat may be old before the schedule is called dead. Two,
 * not one: a cron can fire a minute late, and a watcher that fires at the same
 * minute as the job it watches would otherwise raise on every tick. */
export const STALE_AFTER_PERIODS = 2

/** One tick happened. `ok` is "nothing on this tick was recorded as a failure";
 * it moves `last_ok_at`, and the fire itself moves `last_run_at` either way.
 *
 * Best-effort like every write to the observability tables: a beat that cannot
 * be written (the migration not yet applied on this environment) says so on the
 * console and never fails the tick that did the real work. */
export async function beatCron(db: CoreDb, job: CronJob, at: Date, ok: boolean): Promise<void> {
  try {
    await db
      .prepare(
        `INSERT INTO cron_heartbeats (job, last_run_at, last_ok_at) VALUES (?, ?, ?)
         ON CONFLICT(job) DO UPDATE SET
           last_run_at = excluded.last_run_at,
           last_ok_at = COALESCE(excluded.last_ok_at, cron_heartbeats.last_ok_at)`
      )
      .bind(job, at.toISOString(), ok ? at.toISOString() : null)
      .run()
  } catch (e) {
    console.error(`cron heartbeat for ${job} could not be written:`, e)
  }
}

export type StaleCron = { job: CronJob; lastRunAt: string; periodsLate: number }

type BeatRow = { job: string; last_run_at: string }

/** The jobs whose last beat is older than `STALE_AFTER_PERIODS` × their period.
 * A job the table does not know (a row seeded for a cron since removed) is
 * ignored rather than reported: the list of live jobs is `CRON_JOBS`, and the
 * test beside this file keeps that list equal to what the wranglers declare. */
export async function staleCrons(db: BeatDb, now: Date): Promise<StaleCron[]> {
  // One row per job on the estate — three today. The cap is a habit (R14) and
  // not a bound anything approaches.
  const rows = ((await db.prepare(`SELECT job, last_run_at FROM cron_heartbeats LIMIT 50`).all()).results ??
    []) as BeatRow[]
  const out: StaleCron[] = []
  for (const r of rows) {
    const def = CRON_JOBS[r.job as CronJob]
    if (!def) continue
    const age = now.getTime() - new Date(r.last_run_at).getTime()
    const periodsLate = age / def.periodMs
    if (periodsLate >= STALE_AFTER_PERIODS) out.push({ job: r.job as CronJob, lastRunAt: r.last_run_at, periodsLate })
  }
  return out
}

/** Record one row per dead schedule, from the watcher's own tick.
 *
 * The message names the job, its worker, when it last fired and what to check,
 * and it is written so the signature folds: the date and the count are digit
 * runs, which `foldSignature` turns into `#`, so three nights of the same dead
 * cron are one signature in the digest and one line to resolve. `tick` is the
 * watcher's tick id (`tickId`), so the rows this check wrote join the rest of
 * that tick's. */
export async function reportStaleCrons(
  db: BeatDb,
  source: string,
  now: Date,
  tick: string
): Promise<StaleCron[]> {
  let stale: StaleCron[] = []
  try {
    stale = await staleCrons(db, now)
  } catch (e) {
    // The table is missing or unreadable: that is itself a fact worth a row,
    // because a watcher that cannot read its beats is a watcher that is off.
    await logError(db, {
      source,
      place: "cron/watch",
      message: `could not read cron_heartbeats, so no schedule on the estate is being watched for silence: ${e instanceof Error ? e.message : String(e)}. Apply db/core/0029 if it is missing.`,
      requestId: tick,
    })
    return []
  }
  for (const s of stale) {
    const def = CRON_JOBS[s.job]
    const hours = Math.round(def.periodMs / 3_600_000)
    const period = hours >= 1 ? `${hours} hour${hours === 1 ? "" : "s"}` : `${Math.round(def.periodMs / 60_000)} minutes`
    await logError(db, {
      source,
      place: "cron/watch",
      message:
        `the ${s.job} schedule on the ${def.worker} worker has not fired since ${s.lastRunAt} — ` +
        `${Math.floor(s.periodsLate)} times its ${period} period. Nothing errored; the work simply stopped. ` +
        `Check the trigger in workers/${def.worker}/wrangler.jsonc and the worker's cron events in the Cloudflare dashboard, then redeploy it.`,
      requestId: tick,
    })
  }
  return stale
}
