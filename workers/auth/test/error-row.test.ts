// WHAT ONE ROW IN THE ERROR STORE SAYS — and what it must never say.
//
// Measured on staging, 7 Sep 2026 (6,534 rows): 1,991 rows carried "Google
// couldn't answer that just now. Try again." — our own sentence, quoted back at
// us — because a recording site wrote `String(e)` of a refusal whose real cause
// (which call, what status, what Google said) lived only on the console; 30
// browser rows carried a full `location.href`, query string included; and a row
// dropped by the hourly ceiling looked exactly like a quiet hour. Four seams,
// one file, each held here against real SQLite and the real migrations, so a
// stub that "understands" the statement cannot agree with a broken one.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { DatabaseSync, type SqlValue } from "node:sqlite"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  causeOf,
  logError,
  MAX_ERROR_LOGS_PER_HOUR,
  MEASUREMENT_SOURCES,
  recordWorkerError,
  SLOW_DOOR_SOURCE,
  tickId,
} from "@shared/workers/error-log"
import { GuardError } from "@shared/workers/gating"

const ROOT = join(__dirname, "..", "..", "..")
const CORE = join(ROOT, "db", "core")
const migration = (name: string) => readFileSync(join(CORE, name), "utf8")

function coreDb() {
  const db = new DatabaseSync(":memory:")
  db.exec(migration("0012_error_logs.sql"))
  db.exec(migration("0019_error_log_bound.sql"))
  db.exec(migration("0020_error_request_id.sql"))
  return db
}

/** The slice of the D1 binding logError uses, over real SQLite. */
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
      }
      return api
    },
  }
}

type Row = { message: string; stack: string | null; url: string | null; request_id: string | null }
const lastRow = (db: DatabaseSync) =>
  db.prepare("SELECT message, stack, url, request_id FROM error_logs ORDER BY rowid DESC LIMIT 1").get() as Row

afterEach(() => vi.restoreAllMocks())

describe("the message is the cause, not the sentence", () => {
  it("a refusal that carries a detail records the detail and keeps its own stack", async () => {
    const db = coreDb()
    const e = new GuardError(
      502,
      "google_refused",
      "Google couldn't answer that just now. Try again.",
      "google GET https://www.googleapis.com/drive/v3/files → 403: PERMISSION_DENIED"
    )
    await recordWorkerError(d1(db), "content", "cron/google-autopilot (t/u/list)", e, "tick:x", { teamId: "t" })
    const row = lastRow(db)
    expect(row.message).toBe("google GET https://www.googleapis.com/drive/v3/files → 403: PERMISSION_DENIED")
    expect(row.message).not.toMatch(/try again/i)
    // The refusal's OWN stack — the site that threw it — not a fresh Error's
    // stack pointing at the central catch.
    expect(row.stack, "the stack is the thrown thing's").toBe(e.stack)
  })

  it("a refusal with no detail, and a plain Error, record their message as before", async () => {
    const db = coreDb()
    await recordWorkerError(d1(db), "tenancy", "POST /x", new GuardError(403, "forbidden", "You may not do that."))
    expect(lastRow(db).message).toBe("You may not do that.")
    await recordWorkerError(d1(db), "tenancy", "POST /x", new Error("D1_ERROR: no such table: foo"))
    expect(lastRow(db).message).toBe("D1_ERROR: no such table: foo")
  })

  it("causeOf is ONE definition — gating.ts re-exports the recorder's", async () => {
    const gating = readFileSync(join(ROOT, "shared", "workers", "gating.ts"), "utf8")
    expect(gating, "gating must not carry a second causeOf").not.toMatch(/export function causeOf/)
    expect(gating).toMatch(/export \{ causeOf \} from "\.\/error-log"/)
    const viaGating = (await import("@shared/workers/gating")).causeOf
    expect(viaGating).toBe(causeOf)
    // And it is duck-typed on `detail`, so a thrown thing that is not a
    // GuardError instance (a different module graph, a test double) still
    // records its diagnosis.
    expect(causeOf({ message: "shown", detail: "diagnosed" })).toBe("diagnosed")
    expect(causeOf(new Error("plain"))).toBe("plain")
    expect(causeOf("a string")).toBe("a string")
  })
})

describe("what a row may carry", () => {
  it("the page a browser was on, never its query string or fragment", async () => {
    const db = coreDb()
    await logError(d1(db), {
      source: "web",
      place: "google-catch-up",
      message: "Boom",
      url: "https://agency-staging.kwapso.app/t/abc/knowledge?q=alex%20salary&token=secret#row-9",
    })
    expect(lastRow(db).url).toBe("https://agency-staging.kwapso.app/t/abc/knowledge")
  })

  it("a url that does not parse is kept as it came, capped", async () => {
    const db = coreDb()
    await logError(d1(db), { source: "web", place: "x", message: "Boom", url: "not a url" })
    expect(lastRow(db).url).toBe("not a url")
  })

  it("a tick id names itself a tick, carries the job, and fits the column", () => {
    const id = tickId("knowledge sweep", Date.UTC(2026, 8, 7, 6, 30))
    expect(id).toBe("tick:knowledge-sweep:2026-09-07T06:30:00.000Z")
    expect(id.length).toBeLessThanOrEqual(64)
    expect(id).toMatch(/^tick:[A-Za-z0-9_.-]+:\d{4}-\d{2}-\d{2}T[\d:.]+Z$/)
  })

  it("the tick id lands in request_id, so a tick's rows join like a request's", async () => {
    const db = coreDb()
    await recordWorkerError(d1(db), "content", "cron/knowledge-sweep (t1)", new Error("x"), tickId("knowledge-sweep", 0))
    expect(lastRow(db).request_id).toBe("tick:knowledge-sweep:1970-01-01T00:00:00.000Z")
  })
})

describe("a dropped recording is not silent everywhere", () => {
  it("over the hourly ceiling, the drop is one console line naming the bucket and the place", async () => {
    const db = coreDb()
    const door = d1(db)
    const said = vi.spyOn(console, "error").mockImplementation(() => {})
    for (let i = 0; i < MAX_ERROR_LOGS_PER_HOUR; i++)
      await logError(door, { source: "web", place: "/loop", message: `row ${i}`, userId: "01USERALICE" })
    expect(said, "under the line, nothing is printed").not.toHaveBeenCalled()
    await logError(door, { source: "web", place: "/loop", message: "row 121", userId: "01USERALICE" })
    expect(said).toHaveBeenCalledTimes(1)
    const line = String(said.mock.calls[0][0])
    expect(line).toMatch(/^error_logs: dropped a row from web at \/loop/)
    expect(line).toContain("01USERALICE")
    expect(line, "never the message body — the catch printed that already").not.toContain("row 121")
  })

  it("a store that cannot be written prints, and still never throws", async () => {
    const said = vi.spyOn(console, "error").mockImplementation(() => {})
    const broken = {
      prepare() {
        return {
          bind() {
            return {
              async run() {
                throw new Error("D1_ERROR: no such table: error_logs")
              },
            }
          },
        }
      },
    }
    await expect(logError(broken, { source: "auth", place: "POST /x", message: "Boom" })).resolves.toBeUndefined()
    expect(said).toHaveBeenCalledTimes(1)
    expect(String(said.mock.calls[0][0])).toMatch(/^error_logs: could not record a row from auth at POST \/x/)
  })
})

describe("a measurement is declared, not inferred from a missing stack", () => {
  it("the slow-door line names its source from the seam that declares it a measurement, and passes no stack", () => {
    expect(MEASUREMENT_SOURCES).toContain(SLOW_DOOR_SOURCE)
    const timing = readFileSync(join(ROOT, "shared", "workers", "timing.ts"), "utf8")
    const at = timing.indexOf("logError(core, {")
    expect(at, "timing.ts must write its slow-door row through logError").toBeGreaterThan(-1)
    const call = timing.slice(at, timing.indexOf("}))", at))
    expect(call).toContain("source: SLOW_DOOR_SOURCE")
    expect(call, "a measurement carries no stack, by design").not.toMatch(/\bstack\b/)
    // The literal may appear in prose; it may not be passed as a source.
    expect(timing, "no site may spell the literal and drift from the declaration").not.toMatch(/source:\s*"slow-door"/)
  })

  it("no exception-recording site names a measurement source", () => {
    // Every source literal passed to recordWorkerError across the fleet — the
    // seam that records THROWN things — must be outside MEASUREMENT_SOURCES.
    const workers = join(ROOT, "workers")
    const literals = new Set<string>()
    for (const w of ["auth", "tenancy", "content", "data-ops", "mcp", "realtime"]) {
      const src = readFileSync(join(workers, w, "src", "index.ts"), "utf8")
      for (const m of src.matchAll(/recordWorkerError\(\s*env\.DB,\s*"([^"]+)"/g)) literals.add(m[1])
    }
    expect(literals.size).toBeGreaterThanOrEqual(6)
    for (const s of literals) expect(MEASUREMENT_SOURCES, `${s} records exceptions`).not.toContain(s)
  })

  it("the errors door announces the list, so a reader can subtract it without opening the source", () => {
    const admin = readFileSync(join(workersDir(), "data-ops", "src", "routes", "admin.ts"), "utf8")
    expect(admin).toMatch(/measurementSources: MEASUREMENT_SOURCES/)
    const script = readFileSync(join(ROOT, "scripts", "errors.mjs"), "utf8")
    expect(script, "the terminal reader tags a measurement group").toContain("measurementSources")
  })
})

function workersDir() {
  return join(ROOT, "workers")
}
