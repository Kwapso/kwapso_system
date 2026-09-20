// A STORY GETS ITS OWN BUILD NOTES, Aurora's ruling, verbatim, 21 Sep 2026:
// "call it build notes" (what was built and how, the story detail's third
// left-column section) and, the same round, "yes, canont be marked as don if
// thats not filled in, its required" (Done refuses a story with empty build
// notes). Team migration 0112 gives `stories` its own `build_notes` column,
// the same storage `detail`/`acceptance_criteria` already use; the update
// door (`updateStory`, workers/content/src/lib/stories.ts) is the one write
// path; `refuseUndocumented` is the Done refusal, read beside `refuseUnstepped`
// (CHECKLIST 6.5's own step rule) in `setStoryStatus`.
//
// Also covers `getStoryMetrics` (`POST /api/content/stories/metrics`): Cycle
// time, Effort and Flow efficiency, computed off `work_logs` and
// `story_status_events` — never stored, never on the list read.
//
// Driven through the real route handlers against a real SQLite database
// running the real team migrations, the same shape every other door-level
// suite here uses (`ticket-gets-its-own-assignee.test.ts`'s own header says
// why).

import type { DatabaseSync } from "node:sqlite"
import { beforeEach, describe, expect, it, vi } from "vitest"

const holder = vi.hoisted(() => ({ db: null as DatabaseSync | null }))

vi.mock("@shared/workers/d1-rest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/d1-rest")>()
  const { d1Impl } = await import("../../tenancy/test/d1-sqlite")
  return { ...actual, ...d1Impl(() => holder.db as DatabaseSync) }
})

import worker from "../src/index"
import { buildSpineDb, IDS, makeEnv } from "../../tenancy/test/spine-harness"

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

const storyRow = (id: string) =>
  db().prepare(`SELECT * FROM stories WHERE id = ?`).get(id) as Record<string, string | number | null>

/** Write a story and hand back its id — the same defaults
 * `stories.test.ts`'s own `addStory` uses (a kind, and "changes no step"),
 * so a case here is never about an unrelated refusal. */
async function addStory(body: Record<string, unknown>): Promise<string> {
  const res = await call(IDS.staffUser, "POST /api/content/stories", {
    storyType: "Feature",
    changesNoStep: true,
    ...body,
  })
  expect(res.status, "the story door refused a plain create").toBe(200)
  const found = db()
    .prepare(`SELECT id FROM stories WHERE title = ? ORDER BY id DESC LIMIT 1`)
    .get(body.title as string) as { id: string } | undefined
  expect(found, "the story was not written").toBeTruthy()
  return (found as { id: string }).id
}

/** One story by id, as the wire shapes it — the same GET the detail page
 * itself reads. */
async function storyOne(id: string) {
  const res = await call(IDS.staffUser, "GET /api/content/stories", undefined, `?id=${id}`)
  const body = (await res.json()) as { stories: Record<string, unknown>[] }
  return { status: res.status, story: body.stories?.[0] }
}

async function metricsFor(id: string) {
  const res = await call(IDS.staffUser, "POST /api/content/stories/metrics", { id })
  return { status: res.status, metrics: (await res.json()) as Record<string, unknown> }
}

async function logTime(id: string, startedAt: string, endedAt: string) {
  const res = await call(IDS.staffUser, "POST /api/content/work-logs", {
    targetTable: "stories",
    targetId: id,
    startedAt,
    endedAt,
  })
  expect(res.status, "logging time was refused").toBe(200)
}

beforeEach(() => {
  holder.db = buildSpineDb()
})

describe("a story's own build notes", () => {
  it("a staff member writes them through the update door, and reading the story back shows them", async () => {
    const id = await addStory({ title: "Add saved filters to the backlog board" })
    expect((await storyOne(id)).story?.buildNotes).toBeNull()

    const updated = await call(IDS.staffUser, "POST /api/content/stories/update", {
      id,
      title: "Add saved filters to the backlog board",
      storyType: "Feature",
      category: "Client-requested",
      changesNoStep: true,
      buildNotes: "Saved filters live in a new board_filters table.",
    })
    expect(updated.status).toBe(200)
    expect(storyRow(id).build_notes).toBe("Saved filters live in a new board_filters table.")

    const after = await storyOne(id)
    expect(after.story?.buildNotes).toBe("Saved filters live in a new board_filters table.")
  })

  it("the list read never carries build notes — only a by-id read does (the same split as detail)", async () => {
    await addStory({ title: "A story with build notes", buildNotes: "Written down." })
    const res = await call(IDS.staffUser, "GET /api/content/stories", undefined, "?view=all")
    const body = (await res.json()) as { stories: { title: string; buildNotes: string | null }[] }
    const row = body.stories.find((s) => s.title === "A story with build notes")
    expect(row?.buildNotes).toBeNull()
  })

  it("cannot be marked done while build notes are empty", async () => {
    const id = await addStory({ title: "Ship it with nothing written down" })
    expect(storyRow(id).build_notes).toBeNull()
    const res = await call(IDS.staffUser, "POST /api/content/stories/status", { id, status: "done" })
    expect(res.status).toBe(400)
    expect((await res.json()) as { error: string }).toMatchObject({ error: "build_notes_required" })
    // No half-close: the row is untouched.
    expect(storyRow(id).status).toBe("open")
    expect(storyRow(id).closed_at).toBeNull()
  })

  it("can be marked done once build notes are written", async () => {
    const id = await addStory({ title: "Ship it, documented", buildNotes: "What was built, and how." })
    const res = await call(IDS.staffUser, "POST /api/content/stories/status", { id, status: "done" })
    expect(res.status).toBe(200)
    expect(storyRow(id).status).toBe("done")
  })

  it("an update that never mentions build notes clears them, like every other field this door replaces", async () => {
    const id = await addStory({ title: "Written, then edited", buildNotes: "First draft." })
    await call(IDS.staffUser, "POST /api/content/stories/update", {
      id,
      title: "Written, then edited",
      storyType: "Feature",
      category: "Client-requested",
      changesNoStep: true,
      // buildNotes left off on purpose.
    })
    expect(storyRow(id).build_notes).toBeNull()
  })
})

describe("a story's own metrics", () => {
  it("reads 'not started' — null cycle time — before any work is logged", async () => {
    const id = await addStory({ title: "Nothing logged yet" })
    const { status, metrics } = await metricsFor(id)
    expect(status).toBe(200)
    expect(metrics.cycleTimeSeconds).toBeNull()
    expect(metrics.effortSeconds).toBe(0)
    expect(metrics.flowEfficiency).toBeNull()
  })

  it("computes cycle time from the first work log to the done event, and flow efficiency from the two", async () => {
    const id = await addStory({ title: "Timed work", buildNotes: "Done." })
    await logTime(id, "2026-09-18T09:00:00.000Z", "2026-09-18T12:00:00.000Z") // 3h
    await logTime(id, "2026-09-19T09:00:00.000Z", "2026-09-19T12:30:00.000Z") // 3.5h

    // Close it two days after the first log — the moment cycle time counts to.
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-09-20T09:00:00.000Z"))
    try {
      const closed = await call(IDS.staffUser, "POST /api/content/stories/status", { id, status: "done" })
      expect(closed.status).toBe(200)
    } finally {
      vi.useRealTimers()
    }

    const { metrics } = await metricsFor(id)
    // First log 09:00 18th -> done 09:00 20th = exactly 2 days = 172800s.
    expect(metrics.cycleTimeSeconds).toBe(172800)
    expect(metrics.effortSeconds).toBe(3 * 3600 + 3.5 * 3600)
    expect(metrics.flowEfficiency).toBeCloseTo((23400 / 172800) * 100, 5)
  })

  it("a discarded timer never counts toward effort", async () => {
    const id = await addStory({ title: "One good log, one discarded" })
    await logTime(id, "2026-09-18T09:00:00.000Z", "2026-09-18T10:00:00.000Z") // 1h
    const row = db().prepare(`SELECT id FROM work_logs WHERE target_id = ?`).get(id) as { id: string }
    db().exec(`UPDATE work_logs SET discarded_at = '2026-09-18T10:05:00.000Z' WHERE id = '${row.id}'`)
    const { metrics } = await metricsFor(id)
    expect(metrics.effortSeconds).toBe(0)
    // No LIVE work log left to start a cycle time from.
    expect(metrics.cycleTimeSeconds).toBeNull()
  })
})
