// A TICKET GETS THE SAME THREE FIGURES A STORY ALREADY HAS — Aurora's ruling,
// 21 Sep 2026 (B44 amended): the Effort card's own Cycle time / Effort / Flow
// efficiency lines draw on the ticket page too, computed from the ticket's own
// work logs and its resolved moment, or "Not started" before either exists.
// `getTicketMetrics` (workers/content/src/lib/help.ts, `POST /api/content/
// help/metrics`) mirrors `getStoryMetrics` exactly, with one difference: a
// ticket's "done" moment is `help.resolved_at` directly, not a second events
// table — see that function's own header for why that is still "latest, not
// first" the same way the story's join is.
//
// Driven through the real route handlers against a real SQLite database
// running the real team migrations, the same shape `story-build-notes.test.ts`
// (the story metrics' own suite) uses.

import type { DatabaseSync } from "node:sqlite"
import { beforeEach, describe, expect, it, vi } from "vitest"

const holder = vi.hoisted(() => ({ db: null as DatabaseSync | null }))

vi.mock("@shared/workers/d1-rest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/d1-rest")>()
  const { d1Impl } = await import("../../tenancy/test/d1-sqlite")
  return { ...actual, ...d1Impl(() => holder.db as DatabaseSync) }
})

import worker from "../src/index"
import { buildSpineDb, IDS, makeEnv, seedImageAttachment } from "../../tenancy/test/spine-harness"

const db = () => holder.db as DatabaseSync

function env(userId: string) {
  return {
    ...(makeEnv(() => db(), userId) as unknown as Record<string, unknown>),
    INTERNAL_KEY: "k",
    PUBLIC_APP_URL: "https://kwapso.example",
    REALTIME: { fetch: async () => new Response("{}") },
  } as never
}

const call = (userId: string, route: string, body?: unknown, query = "") => {
  const [method, path] = route.split(" ")
  return worker.fetch(
    new Request(`https://content${path}${query}`, {
      method,
      headers: { Cookie: "session=x", "Content-Type": "application/json" },
      body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
    }),
    env(userId) as never
  )
}

const ticketIds = async (res: Response): Promise<string[]> =>
  ((await res.json()) as { tickets?: { id: string }[] }).tickets?.map((t) => t.id) ?? []

/** Raise a ticket and hand back its id. */
async function addTicket(description: string): Promise<string> {
  const res = await call(IDS.staffUser, "POST /api/content/help", { description })
  expect(res.status, "the ticket door refused a plain create").toBe(200)
  const ids = await ticketIds(res)
  expect(ids.length, "the ticket was not written").toBe(1)
  return ids[0]!
}

async function metricsFor(id: string) {
  const res = await call(IDS.staffUser, "POST /api/content/help/metrics", { id })
  return { status: res.status, metrics: (await res.json()) as Record<string, unknown> }
}

async function logTime(targetId: string, startedAt: string, endedAt: string) {
  const res = await call(IDS.staffUser, "POST /api/content/work-logs", {
    targetTable: "help",
    targetId,
    startedAt,
    endedAt,
  })
  expect(res.status, "logging time was refused").toBe(200)
}

beforeEach(() => {
  holder.db = buildSpineDb()
})

describe("a ticket's own metrics", () => {
  it("reads 'not started' — null cycle time — before any work is logged", async () => {
    const id = await addTicket("Nothing logged yet")
    const { status, metrics } = await metricsFor(id)
    expect(status).toBe(200)
    expect(metrics.cycleTimeSeconds).toBeNull()
    expect(metrics.effortSeconds).toBe(0)
    expect(metrics.flowEfficiency).toBeNull()
  })

  it("computes cycle time from the first work log to the resolved moment, and flow efficiency from the two", async () => {
    const id = await addTicket("Timed work")
    await logTime(id, "2026-09-18T09:00:00.000Z", "2026-09-18T12:00:00.000Z") // 3h
    await logTime(id, "2026-09-19T09:00:00.000Z", "2026-09-19T12:30:00.000Z") // 3.5h

    // Resolve it two days after the first log — the moment cycle time counts to.
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-09-20T09:00:00.000Z"))
    try {
      const resolved = await call(IDS.staffUser, "POST /api/content/help/resolve", {
        id,
        resolution: "Fixed it, and here is what changed.",
        attachmentIds: [seedImageAttachment(db(), id)],
      })
      expect(resolved.status).toBe(200)
    } finally {
      vi.useRealTimers()
    }

    const { metrics } = await metricsFor(id)
    // First log 09:00 18th -> resolved 09:00 20th = exactly 2 days = 172800s.
    expect(metrics.cycleTimeSeconds).toBe(172800)
    expect(metrics.effortSeconds).toBe(3 * 3600 + 3.5 * 3600)
    expect(metrics.flowEfficiency).toBeCloseTo((23400 / 172800) * 100, 5)
  })

  it("counts cycle time to NOW while the ticket is still unresolved", async () => {
    const id = await addTicket("Still open")
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-09-18T09:00:00.000Z"))
    try {
      await logTime(id, "2026-09-18T09:00:00.000Z", "2026-09-18T10:00:00.000Z") // 1h
      vi.setSystemTime(new Date("2026-09-18T15:00:00.000Z"))
      const { metrics } = await metricsFor(id)
      expect(metrics.cycleTimeSeconds).toBe(6 * 3600)
      expect(metrics.effortSeconds).toBe(3600)
    } finally {
      vi.useRealTimers()
    }
  })

  it("a discarded timer never counts toward effort", async () => {
    const id = await addTicket("One good log, one discarded")
    await logTime(id, "2026-09-18T09:00:00.000Z", "2026-09-18T10:00:00.000Z") // 1h
    const logRow = db().prepare(`SELECT id FROM work_logs WHERE target_id = ?`).get(id) as { id: string }
    db().exec(`UPDATE work_logs SET discarded_at = '2026-09-18T10:05:00.000Z' WHERE id = '${logRow.id}'`)
    const { metrics } = await metricsFor(id)
    expect(metrics.effortSeconds).toBe(0)
    // No LIVE work log left to start a cycle time from.
    expect(metrics.cycleTimeSeconds).toBeNull()
  })

  it("reopening and resolving again reads the LATEST resolved moment, not the first", async () => {
    const id = await addTicket("Reopened once")
    await logTime(id, "2026-09-18T09:00:00.000Z", "2026-09-18T10:00:00.000Z") // 1h

    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date("2026-09-19T09:00:00.000Z"))
      await call(IDS.staffUser, "POST /api/content/help/resolve", {
        id,
        resolution: "First answer.",
        attachmentIds: [seedImageAttachment(db(), id)],
      })
      // Back to triaged — the reopen the door's own `resolveBlock` NULLs
      // `resolved_at` for.
      await call(IDS.staffUser, "POST /api/content/help/status", { id, status: "triaged" })
      vi.setSystemTime(new Date("2026-09-21T09:00:00.000Z"))
      await call(IDS.staffUser, "POST /api/content/help/resolve", {
        id,
        resolution: "Second, real answer.",
        attachmentIds: [seedImageAttachment(db(), id)],
      })
    } finally {
      vi.useRealTimers()
    }

    const { metrics } = await metricsFor(id)
    // First log 09:00 18th -> SECOND resolve 09:00 21st = exactly 3 days.
    expect(metrics.cycleTimeSeconds).toBe(3 * 86400)
  })
})
