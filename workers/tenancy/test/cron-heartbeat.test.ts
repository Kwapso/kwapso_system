// A CRON THAT STOPPED FIRING IS NOTICED — and every row a tick writes says which tick.
//
// Three claims, each held against something that cannot agree with itself:
//   • the beat and the watch, over real SQLite with the real migration;
//   • the JOB LIST, held equal to the cron triggers the two wrangler configs
//     declare and to the rows the migration seeds — three copies of one fact,
//     any of which can rot alone;
//   • the SCHEDULED HANDLERS on disk: every recorder call on a tick carries the
//     tick's id, every tick beats, and the two workers watch each other.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { DatabaseSync, type SqlValue } from "node:sqlite"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  beatCron,
  CRON_JOBS,
  reportStaleCrons,
  STALE_AFTER_PERIODS,
  staleCrons,
} from "@shared/workers/cron-heartbeat"
import { HEALTH_PROBE_MS, probeWorkerHealth } from "@shared/workers/config-health"

const ROOT = join(__dirname, "..", "..", "..")
const CORE = join(ROOT, "db", "core")
const migration = (name: string) => readFileSync(join(CORE, name), "utf8")

function coreDb() {
  const db = new DatabaseSync(":memory:")
  db.exec(migration("0012_error_logs.sql"))
  db.exec(migration("0019_error_log_bound.sql"))
  db.exec(migration("0020_error_request_id.sql"))
  db.exec(migration("0029_cron_heartbeats.sql"))
  return db
}

/** The D1 slice the seam uses (bind→run, and all), over real SQLite. */
function d1(db: DatabaseSync) {
  return {
    prepare(sql: string) {
      const stmt = db.prepare(sql)
      let args: unknown[] = []
      const api = {
        bind(...a: unknown[]) {
          args = a
          return api
        },
        async run() {
          return { meta: { changes: Number(stmt.run(...(args as SqlValue[])).changes) } }
        },
        async all() {
          return { results: stmt.all(...(args as SqlValue[])) as unknown[] }
        },
      }
      return api
    },
  }
}

type Beat = { job: string; last_run_at: string; last_ok_at: string | null }
const beats = (db: DatabaseSync) => db.prepare("SELECT * FROM cron_heartbeats ORDER BY job").all() as unknown as Beat[]
const errorRows = (db: DatabaseSync) =>
  db.prepare("SELECT source, place, message, request_id FROM error_logs ORDER BY rowid").all() as unknown as {
    source: string
    place: string
    message: string
    request_id: string | null
  }[]

const T0 = Date.UTC(2026, 8, 7, 3, 10)
const H = 3_600_000

afterEach(() => vi.restoreAllMocks())

describe("the beat", () => {
  it("the migration seeds one row per job, stamped now, so a schedule that never fires is still noticed", () => {
    const db = coreDb()
    expect(beats(db).map((b) => b.job)).toEqual(Object.keys(CRON_JOBS).sort())
    for (const b of beats(db)) {
      expect(Date.now() - new Date(b.last_run_at).getTime()).toBeLessThan(60_000)
      expect(b.last_ok_at).toBeNull()
    }
  })

  it("a tick moves last_run_at every time and last_ok_at only on a clean run", async () => {
    const db = coreDb()
    await beatCron(d1(db), "nightly", new Date(T0), false)
    let row = beats(db).find((b) => b.job === "nightly")!
    expect(row.last_run_at).toBe(new Date(T0).toISOString())
    expect(row.last_ok_at).toBeNull()
    await beatCron(d1(db), "nightly", new Date(T0 + 24 * H), true)
    row = beats(db).find((b) => b.job === "nightly")!
    expect(row.last_ok_at).toBe(new Date(T0 + 24 * H).toISOString())
    await beatCron(d1(db), "nightly", new Date(T0 + 48 * H), false)
    row = beats(db).find((b) => b.job === "nightly")!
    expect(row.last_run_at).toBe(new Date(T0 + 48 * H).toISOString())
    expect(row.last_ok_at, "a failed tick keeps the last clean one").toBe(new Date(T0 + 24 * H).toISOString())
  })

  it("a beat that cannot be written says so on the console and never throws", async () => {
    const said = vi.spyOn(console, "error").mockImplementation(() => {})
    const db = new DatabaseSync(":memory:") // no table at all
    await expect(beatCron(d1(db), "nightly", new Date(T0), true)).resolves.toBeUndefined()
    expect(said).toHaveBeenCalledTimes(1)
  })
})

describe("the watch", () => {
  it("a job silent for two periods is stale; one period late is not", async () => {
    const db = coreDb()
    await beatCron(d1(db), "knowledge-sweep", new Date(T0), true)
    await beatCron(d1(db), "morning-digest", new Date(T0), true)
    await beatCron(d1(db), "nightly", new Date(T0), true)
    const sweep = CRON_JOBS["knowledge-sweep"].periodMs
    expect(await staleCrons(d1(db), new Date(T0 + sweep))).toEqual([])
    const late = await staleCrons(d1(db), new Date(T0 + STALE_AFTER_PERIODS * sweep))
    expect(late.map((s) => s.job)).toEqual(["knowledge-sweep"])
    expect(late[0].periodsLate).toBe(STALE_AFTER_PERIODS)
    // A day on, the two daily jobs are exactly one period late — still fine —
    // and the sweep is 96 periods late.
    const day = await staleCrons(d1(db), new Date(T0 + 24 * H))
    expect(day.map((s) => s.job)).toEqual(["knowledge-sweep"])
  })

  it("each dead schedule is one error row from the watcher's tick, naming the job, its worker and the last beat", async () => {
    const db = coreDb()
    await beatCron(d1(db), "knowledge-sweep", new Date(T0), true)
    await beatCron(d1(db), "morning-digest", new Date(T0), true)
    await beatCron(d1(db), "nightly", new Date(T0), true)
    const stale = await reportStaleCrons(d1(db), "tenancy", new Date(T0 + 3 * 24 * H), "tick:nightly:x")
    expect(stale.map((s) => s.job).sort()).toEqual(["knowledge-sweep", "morning-digest", "nightly"])
    const rows = errorRows(db)
    expect(rows).toHaveLength(3)
    for (const r of rows) {
      expect(r.source).toBe("tenancy")
      expect(r.place).toBe("cron/watch")
      expect(r.request_id).toBe("tick:nightly:x")
      expect(r.message).toMatch(/has not fired since 2026-09-07T03:10:00\.000Z/)
    }
    expect(rows.find((r) => r.message.startsWith("the knowledge-sweep schedule on the content worker"))).toBeTruthy()
    expect(rows.find((r) => r.message.startsWith("the nightly schedule on the tenancy worker"))).toBeTruthy()
  })

  it("a watcher that cannot read its beats records THAT, rather than watching nothing in silence", async () => {
    const db = new DatabaseSync(":memory:")
    db.exec(migration("0012_error_logs.sql"))
    db.exec(migration("0019_error_log_bound.sql"))
    db.exec(migration("0020_error_request_id.sql"))
    const stale = await reportStaleCrons(d1(db), "content", new Date(T0), "tick:morning-digest:x")
    expect(stale).toEqual([])
    const rows = errorRows(db)
    expect(rows).toHaveLength(1)
    expect(rows[0].message).toMatch(/could not read cron_heartbeats/)
    expect(rows[0].message).toMatch(/0029/)
  })
})

describe("the job list is one fact in three places", () => {
  const wrangler = (w: string) => readFileSync(join(ROOT, "workers", w, "wrangler.jsonc"), "utf8")
  /** The TOP-LEVEL cron triggers of a worker (the staging env repeats them). */
  const cronsOf = (w: string) => {
    const m = /^\s*"triggers":\s*\{\s*"crons":\s*\[([^\]]*)\]/m.exec(wrangler(w))
    return m ? [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]) : []
  }

  it("every worker with a cron trigger has exactly that many jobs in CRON_JOBS, and no job names a cron-less worker", () => {
    const perWorker: Record<string, number> = {}
    for (const def of Object.values(CRON_JOBS)) perWorker[def.worker] = (perWorker[def.worker] ?? 0) + 1
    for (const w of ["auth", "tenancy", "content", "data-ops", "mcp", "realtime", "gateway", "portal-gateway"]) {
      expect(perWorker[w] ?? 0, `${w}: CRON_JOBS vs wrangler triggers`).toBe(cronsOf(w).length)
    }
  })

  it("the migration seeds exactly the jobs CRON_JOBS names", () => {
    const sql = migration("0029_cron_heartbeats.sql")
    const seeded = [...sql.matchAll(/^\s*\('([a-z-]+)',/gm)].map((m) => m[1]).sort()
    expect(seeded).toEqual(Object.keys(CRON_JOBS).sort())
  })
})

describe("the scheduled handlers on disk", () => {
  const src = (w: string) => readFileSync(join(ROOT, "workers", w, "src", "index.ts"), "utf8")

  /** Every `recordWorkerError(` call in `region`, with its full argument text. */
  function recorderCalls(region: string): string[] {
    const out: string[] = []
    let at = region.indexOf("recordWorkerError(")
    while (at !== -1) {
      let depth = 0
      let i = at + "recordWorkerError".length
      for (; i < region.length; i++) {
        if (region[i] === "(") depth++
        else if (region[i] === ")" && --depth === 0) break
      }
      out.push(region.slice(at, i + 1))
      at = region.indexOf("recordWorkerError(", i)
    }
    return out
  }

  /** The unattended half of a worker: from `async scheduled(` to the end, plus
   * any helper the tick calls that records (content's teamSlice). */
  function scheduledRegion(w: string): string {
    const s = src(w)
    const at = s.search(/async scheduled\s*\(/)
    expect(at, `${w} must have a scheduled handler`).toBeGreaterThan(-1)
    const helper = s.indexOf("export async function teamSlice")
    return s.slice(at) + (helper !== -1 ? s.slice(helper, s.indexOf("\n}\n", helper)) : "")
  }

  for (const w of ["tenancy", "content"]) {
    it(`${w}: every row a tick records carries the tick's id`, () => {
      const calls = recorderCalls(scheduledRegion(w))
      expect(calls.length).toBeGreaterThanOrEqual(5)
      for (const c of calls)
        expect(c, `a recorder call on a tick without its tick id:\n${c}`).toMatch(/\btick\b|\btickId\(/)
    })

    it(`${w}: the tick beats when it ends, and watches the other worker's schedules`, () => {
      const region = scheduledRegion(w)
      expect(region).toMatch(/beatCron\(env\.DB, "/)
      expect(region).toMatch(/reportStaleCrons\(env\.DB, "/)
    })
  }

  it("content's morning tick asks its own health, and the list is the health door's", () => {
    const s = src("content")
    expect(s).toMatch(/configReport\(env, CONTENT_REQUIRED\)/)
    expect(s).toMatch(/healthBody\("content", env, CONTENT_REQUIRED\)/)
  })

  it("tenancy's nightly probes every worker its service bindings reach", () => {
    const s = src("tenancy")
    const services = [...readFileSync(join(ROOT, "workers", "tenancy", "wrangler.jsonc"), "utf8").matchAll(/"binding":\s*"([A-Z_]+)",\s*"service"/g)].map((m) => m[1])
    expect(services.length).toBeGreaterThanOrEqual(2)
    const probe = /probeWorkerHealth\(env\.DB, "tenancy", tick, \[([\s\S]*?)\]\)/.exec(s)
    expect(probe, "the nightly must probe").not.toBeNull()
    for (const b of services) expect(probe![1], `binding ${b} is not probed`).toContain(`door: env.${b}`)
  })
})

describe("the health probe", () => {
  const door = (answer: () => Promise<Response>) => ({ fetch: () => answer() })
  const ok = () => Promise.resolve(new Response(JSON.stringify({ ok: true, worker: "auth", config: { ok: true, missing: [] } })))
  const unwell = () =>
    Promise.resolve(new Response(JSON.stringify({ ok: false, worker: "auth", config: { ok: false, missing: ["RESEND_API_KEY"] } })))

  it("a healthy door records nothing; an unwell one records the names it is missing", async () => {
    const db = coreDb()
    await probeWorkerHealth(d1(db), "tenancy", "tick:nightly:x", [{ name: "auth", door: door(ok), path: "/api/auth/health" }])
    expect(errorRows(db)).toEqual([])
    const out = await probeWorkerHealth(d1(db), "tenancy", "tick:nightly:x", [
      { name: "auth", door: door(unwell), path: "/api/auth/health" },
    ])
    expect(out).toEqual([{ name: "auth", missing: ["RESEND_API_KEY"] }])
    const rows = errorRows(db)
    expect(rows).toHaveLength(1)
    expect(rows[0].place).toBe("cron/health-probe")
    expect(rows[0].request_id).toBe("tick:nightly:x")
    expect(rows[0].message).toMatch(/^the auth worker reports itself unable to work: missing RESEND_API_KEY\./)
  })

  it("a door that does not answer is recorded as such, and cannot fail the tick", async () => {
    const db = coreDb()
    const dead = door(() => Promise.reject(Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" })))
    await expect(
      probeWorkerHealth(d1(db), "tenancy", "tick:nightly:x", [{ name: "realtime", door: dead, path: "/api/realtime/health" }])
    ).resolves.toEqual([{ name: "realtime", missing: [`(no answer within ${HEALTH_PROBE_MS}ms: The operation was aborted due to timeout)`] }])
    expect(errorRows(db)[0].message).toMatch(/^the realtime worker reports itself unable to work: missing \(no answer within/)
  })
})
