// IS THIS WORKER ACTUALLY ABLE TO DO ITS JOB — asked at any moment, rather than
// discovered by the first person who tries.
//
// ── THE GAP THIS CLOSES ─────────────────────────────────────────────────────
//
// A Cloudflare Worker fails a DEPLOY on a module-scope throw, which is why boot
// failures barely exist here. What does exist, and is worse, is a worker that
// deploys perfectly and cannot work: a secret nobody set on a fresh environment,
// a token that was rotated at Cloudflare's end and not here, a var that moved.
// Nothing catches that. `npm run check` runs no wrangler at all, six workers
// expose a `/health` endpoint that answers `{ ok: true }` unconditionally, and
// the FIRST signal is a person's request failing.
//
// It is not hypothetical. `cloud_key_rejected` — the D1 token being refused — is
// 1,848 rows of the 5,086 in the live staging error store. Every one of them was
// somebody's request, and every one of them could have been one line in a health
// answer nobody had to be inconvenienced to produce.
//
// ── WHAT IT WILL NOT DO ─────────────────────────────────────────────────────
//
// It reports NAMES, never values, and never a length or a prefix — a health
// endpoint is reachable and "the key is 37 characters and starts with abc" is a
// fact worth nothing to us and something to somebody else. And it reports
// PRESENCE, not validity: whether a token still works is a question with a
// network call in it, and a health endpoint that makes one is a health endpoint
// that can be used to make us call somebody else.
//
// So the honest claim is narrow and worth having: "this worker is missing
// CF_D1_TOKEN" is a complete diagnosis, and `ok: true` on this check means the
// class of failure that produced those 1,848 rows is not the one you have.

import { logError, type CoreDb } from "./error-log"

/** What one worker cannot work without. Names only — this never reads a value. */
export type ConfigReport = {
  ok: boolean
  /** Required names that are absent or empty, in the order they were asked for. */
  missing: string[]
}

/** Which of `required` this env does not have. A var set to the empty string
 * counts as missing, because a secret somebody cleared and a secret nobody set
 * are the same outage. */
export function configReport(env: unknown, required: readonly string[]): ConfigReport {
  const bag = (env ?? {}) as Record<string, unknown>
  const missing = required.filter((name) => {
    const v = bag[name]
    if (v === undefined || v === null) return true
    if (typeof v === "string") return v.trim() === ""
    // A binding (D1, R2, a Fetcher, the AI binding) is an object and is present
    // by virtue of existing — wrangler would have refused the deploy otherwise.
    return false
  })
  return { ok: missing.length === 0, missing }
}

/** The health body every worker answers with.
 *
 * `ok` stays the first field and stays true-when-well, because something may be
 * reading it already and a health check that changes what "fine" looks like is a
 * health check that breaks a monitor. What is new sits beside it. */
export function healthBody(
  worker: string,
  env: unknown,
  required: readonly string[]
): { ok: boolean; worker: string; config: ConfigReport } {
  const config = configReport(env, required)
  return { ok: config.ok, worker, config }
}

/** THE PROBE NOBODY HAS TO RUN BY HAND.
 *
 * `healthBody` answers honestly — and until this, nothing asked. A person still
 * had to open six URLs to learn that a secret had been cleared, which meant the
 * first signal stayed what it always was: somebody's request failing. So a
 * cron tick that already runs asks the workers its own service bindings reach,
 * and a door that answers `ok: false`, or does not answer, becomes one row in
 * `error_logs` naming the worker and the NAMES it is missing (never a value —
 * the door does not carry one). The ops digest mails it that night.
 *
 * Bounded like every outbound call (R11): a worker that hangs on its health
 * door is reported as not answering, not waited for. Records through
 * `logError` directly rather than throwing, so a dead sibling can never fail
 * the tick that was checking on it. */
export const HEALTH_PROBE_MS = 5_000

export async function probeWorkerHealth(
  db: CoreDb,
  source: string,
  tick: string,
  workers: readonly { name: string; door: { fetch(url: string, init?: RequestInit): Promise<Response> }; path: string }[]
): Promise<{ name: string; missing: string[] }[]> {
  const unwell: { name: string; missing: string[] }[] = []
  for (const w of workers) {
    let report: { name: string; missing: string[] } | null = null
    try {
      const res = await w.door.fetch(`https://internal${w.path}`, { signal: AbortSignal.timeout(HEALTH_PROBE_MS) })
      const body = (await res.json().catch(() => null)) as { ok?: unknown; config?: { missing?: unknown } } | null
      if (!res.ok || !body || body.ok !== true) {
        const missing = Array.isArray(body?.config?.missing) ? body!.config!.missing.map(String) : []
        report = { name: w.name, missing }
      }
    } catch (e) {
      report = { name: w.name, missing: [`(no answer within ${HEALTH_PROBE_MS}ms: ${e instanceof Error ? e.message : String(e)})`] }
    }
    if (!report) continue
    unwell.push(report)
    await logError(db, {
      source,
      place: "cron/health-probe",
      message:
        `the ${report.name} worker reports itself unable to work: missing ${report.missing.join(", ") || "(the health door answered but did not say what)"}. ` +
        `Every request that needs it is failing. Set it with a wrangler secret (a secret) or in wrangler.jsonc (a var), then redeploy ${report.name}.`,
      requestId: tick,
    })
  }
  return unwell
}
