// The ONE server-side error-RECORDING seam (ERROR-HANDLING.md). Every worker's
// central catch calls `logError` right after its console.error, so an unexpected
// crash lands in the core `error_logs` table (90-day-ish owned history + the
// resolve workflow) as well as Cloudflare's short-lived console logs. The gateway
// forwards client beacons into the same table via auth's /internal/log-error.
//
// Contract: RECORDING AN ERROR MUST NEVER THROW and never change the response —
// everything is capped and wrapped. Clean GuardError refusals (4xx) are never
// logged; this table is for the unexpected only.

import { ulid } from "./id"

/** The slice of a D1 binding this seam uses — structural, so shared/ compiles in
 * every workspace (the web tsconfig has no Workers types). The real `env.DB`
 * satisfies it. */
export type CoreDb = {
  prepare(sql: string): { bind(...values: unknown[]): { run(): Promise<unknown> } }
}

export type ErrorReport = {
  source: string
  place: string
  message: string
  stack?: string
  teamId?: string
  userId?: string
  url?: string
  /** The id the public door minted for this request, carried on every internal
   * hop (shared/workers/trace.ts) — or, on unattended work, the TICK's id from
   * `tickId` below. Optional because a worker's own crash may have neither.
   *
   * This used to say a cron "has no id to carry — and inventing one there would
   * suggest a click that never happened". Half right: a tick is not a click,
   * and the id must not look like one. But the column exists so that every row
   * one unit of work wrote can be found with one query, and a sweep that writes
   * one row per broken team per tick is exactly that unit — 2,020 cron rows on
   * staging with nothing joining a tick's rows to each other. So a tick carries
   * an id that SAYS it is a tick. */
  requestId?: string
}

/** Sources whose rows are MEASUREMENTS and never exceptions — written on
 * purpose, by a seam that measured something, and carrying NO STACK BY DESIGN.
 *
 * The slow-door line (timing.ts) writes into this table because the ops alarm
 * already watches it, and that is right: a door that got slower three weeks ago
 * raises itself instead of waiting to be found. But a reviewer counting
 * `stack IS NULL` read those rows as a defect — 1,442 of them on staging by
 * 7 Sep 2026, and every exception row beside them carried a stack. The
 * distinction has to be DECLARED somewhere a reader can ask, so: a source in
 * this list is a measurement, the errors door announces the list, and a stack
 * missing from any OTHER source is still the defect it always was. */
export const SLOW_DOOR_SOURCE = "slow-door"
export const MEASUREMENT_SOURCES: readonly string[] = [SLOW_DOOR_SOURCE]

/** WHAT TO RECORD ABOUT A THROWN THING — the diagnosis where there is one, the
 * message where there is not.
 *
 * The recording seam wants the sentence a developer can act on; the caller
 * wants the sentence a person can read. For everything except a diagnosed
 * refusal those are the same string, which is why this reads as a no-op most
 * of the time and is worth its own name anyway: `String(e)` at a recording
 * site is exactly how 1,991 cron rows came to say "Google couldn't answer that
 * just now. Try again." — our own words, quoted back at us, about a token
 * Google had revoked.
 *
 * DUCK-TYPED on `detail`, deliberately: `GuardError` lives in gating.ts, and
 * gating reaches this file through timing.ts, so an `instanceof` here would be
 * an import cycle. A string `detail` on a thrown thing IS the contract
 * (gating.ts documents it), and nothing else in the codebase puts one there.
 * gating.ts re-exports this under the same name so every existing call site
 * keeps its import. */
export function causeOf(e: unknown): string {
  const detail = (e as { detail?: unknown } | null)?.detail
  if (typeof detail === "string" && detail) return detail
  return e instanceof Error ? e.message : String(e)
}

/** The id one cron tick carries on every row it writes, so a tick's rows join
 * the way a request's do (`request_id`, db/core/0020). It names itself a tick
 * so nobody reads it as a click, carries the JOB so two crons firing in the
 * same minute stay apart, and uses the tick's own `scheduledTime` rather than
 * the clock, so a re-run of a late tick writes under the same id.
 *
 * Same alphabet as trace.ts's SAFE (`[A-Za-z0-9_.-]` plus the `:` that keeps the
 * three parts readable) and well inside the 64 the column keeps. */
export function tickId(job: string, scheduledTime: number): string {
  return `tick:${job.replace(/[^A-Za-z0-9_.-]+/g, "-")}:${new Date(scheduledTime).toISOString()}`
}

/** The page a browser was on, WITHOUT its query string or fragment. The query
 * is where a person's search words live (google-api.ts strips its own for
 * exactly this reason), and a `?token=` on a sign-in landing is the other thing
 * a full `location.href` would carry into a table read by whoever reads the
 * error log. A URL that does not parse is kept as it came, capped like every
 * other field — refusing to record is the wrong failure. */
function pageOf(url: string): string {
  try {
    const u = new URL(url)
    return `${u.origin}${u.pathname}`
  } catch {
    return url
  }
}

/** How many rows one BUCKET may write to the store in a trailing hour.
 *
 * A bucket is the caller a row is charged to: the signed-in person whose browser
 * beaconed it, or — for a worker's own central catch, which has no user — the
 * worker that crashed. Per-bucket rather than global, so a flood of client
 * beacons can never spend the budget a crashing worker needs to report itself.
 *
 * The number is deliberately generous for a HUMAN and useless for a LOOP. Two a
 * minute is far more than any real debugging session produces; nobody diagnoses
 * anything from row 121 of the same hour, and the live console tail still has
 * every one of them. What it buys is that `POST /api/log/client` — whose body is
 * entirely the caller's — can no longer grow the GLOBAL core database without
 * limit. Field lengths were already capped; the row COUNT was not. */
export const MAX_ERROR_LOGS_PER_HOUR = 120

export async function logError(db: CoreDb, r: ErrorReport): Promise<void> {
  const now = new Date()
  try {
    // THE BUDGET RIDES THE WRITE (CONCURRENCY.md, and the same shape as the
    // login-send ledger): the ceiling sits in the INSERT's own WHERE, so a burst
    // of beacons cannot all read "under the line" and all write. Over the line
    // the statement simply moves zero rows — which is not an error and must not
    // become one: this seam's whole contract is that recording never throws and
    // never changes the response, so a dropped row is silence, exactly as a
    // failed insert already was.
    const result = await db
      .prepare(
        `INSERT INTO error_logs (id, at, source, place, message, stack, team_id, user_id, url, request_id)
         SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
          WHERE (SELECT COUNT(*) FROM error_logs
                  WHERE COALESCE(user_id, source) = ? AND at > ?) < ?`
      )
      .bind(
        ulid(),
        now.toISOString(),
        String(r.source).slice(0, 40),
        String(r.place).slice(0, 200),
        String(r.message).slice(0, 500),
        r.stack ? String(r.stack).slice(0, 2000) : null,
        r.teamId ?? null,
        r.userId ?? null,
        r.url ? pageOf(String(r.url)).slice(0, 300) : null,
        // Capped like every other caller-influenced field: the id may have come
        // from an outside tool's own header (trace.ts keeps a sane one).
        r.requestId ? String(r.requestId).slice(0, 64) : null,
        // The bucket, matching the row this statement would write — and matching
        // idx_error_logs_bucket_at (core 0019), so the count is an index seek and
        // not a scan of the one table built to grow.
        r.userId ?? String(r.source).slice(0, 40),
        new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
        MAX_ERROR_LOGS_PER_HOUR
      )
      .run()
    // A DROPPED ROW IS SILENT IN THE TABLE AND MUST NOT BE SILENT EVERYWHERE.
    // Over the ceiling the statement moves zero rows, which is correct and is
    // the one outcome a reader of the store cannot see: a bucket that hit its
    // hourly line and a quiet hour look identical. So the drop goes to the
    // console — the short-lived tail a developer is already watching when a
    // flood is on — as one line naming the bucket and the place, never the
    // message (the catch that called us printed that already).
    const changes = (result as { meta?: { changes?: number } } | null)?.meta?.changes
    if (changes === 0)
      console.error(
        `error_logs: dropped a row from ${r.source} at ${String(r.place).slice(0, 200)} — bucket ${r.userId ?? r.source} is over its ${MAX_ERROR_LOGS_PER_HOUR}/hour ceiling`
      )
  } catch (e) {
    // Recording must never break the request — and a store that has stopped
    // accepting writes (a missing migration, a full database) must not look
    // like a quiet week. The line is the counter this seam has.
    console.error(`error_logs: could not record a row from ${r.source} at ${String(r.place).slice(0, 200)}:`, e)
  }
}

/** The central-catch recorder. `e` is whatever was thrown; `place` is
 * "<METHOD> <pathname>" on a request, "cron/<job>" on a tick.
 *
 * THE MESSAGE IS THE CAUSE, NOT THE SENTENCE (`causeOf`). A refusal that
 * carries a `detail` records the detail — what Google actually said, which call,
 * what status — and the person still reads the refusal's own sentence, because
 * `fail()` at the catch never sees this function. Before this sat in the seam,
 * three of six central catches wrapped the detail by hand (`new Error(e.detail)`,
 * which also threw away the refusal's real stack for the catch's own) and the
 * other three recorded nothing for a diagnosed refusal at all.
 *
 * IT WRITES THE ROW AND NOT THE CONSOLE LINE, and this comment used to claim
 * both ("console (for live tails) + the table (for history)"). The console half
 * lives at each worker's own catch, where the prefix names the worker, and it
 * carries the same request id this row does — the two stores are only one store
 * if they can be filtered by the same key.
 *
 * `requestId` is what makes the console line and the row FILTERABLE together —
 * pass the id off the request (`requestId(request)`) so this worker's row joins
 * the rows every other worker wrote for the same click. A cron tick has none,
 * and passes nothing. */
export async function recordWorkerError(
  db: CoreDb,
  source: string,
  place: string,
  e: unknown,
  requestId?: string,
  /** the resolved caller, when the request got that far — identityFor(request)
   * from the gating seam. 0 of 200 live rows carried either column before this
   * argument existed, which made the hardest rows (whose? which tenant?) the
   * least answerable ones. */
  who?: { teamId?: string; userId?: string }
): Promise<void> {
  const err = e instanceof Error ? e : new Error(String(e))
  await logError(db, {
    source,
    place,
    message: causeOf(e),
    stack: err.stack,
    requestId,
    teamId: who?.teamId,
    userId: who?.userId,
  })
}
