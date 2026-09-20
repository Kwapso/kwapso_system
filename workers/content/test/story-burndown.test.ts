// A STORY REMEMBERS ITS STAGES, AND A PHASE READS THEM BACK AS A BURNDOWN,
// driven through the SHIPPED route handlers against a real SQLite database
// running the real team migrations (team migration 0110).
//
// Round-28 ruling: a burndown chart plots work remaining against an ideal line
// that falls from the phase's starting total to zero, and the remaining line
// updates as stories move to Completed. Cycle time rides the same history
// ("this is one addition, not two," the artifact's own words). This suite
// proves the WRITER (an event lands on a status change, including a backward
// move) and the READER (`POST /api/content/stories/burndown`'s series, and its
// refusal when a phase carries no dates).

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
  const base = makeEnv(() => db(), userId) as unknown as Record<string, unknown>
  return {
    ...base,
    INTERNAL_KEY: "k",
    PUBLIC_APP_URL: "https://kwapso.example",
    REALTIME: { fetch: async () => new Response("{}") },
    MEDIA: { put: async () => {} },
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

const eventsFor = (storyId: string) =>
  db()
    .prepare(
      `SELECT from_status, to_status FROM story_status_events WHERE story_id = ? ORDER BY created_at, id`
    )
    .all(storyId) as { from_status: string | null; to_status: string }[]

async function addStory(body: Record<string, unknown>): Promise<string> {
  const res = await call(IDS.staffUser, "POST /api/content/stories", {
    storyType: "Feature",
    changesNoStep: true,
    // Required before Done (Aurora's ruling, 21 Sep 2026) — several cases in
    // this file move a story to done via `setStatus`.
    buildNotes: "Shipped.",
    ...body,
  })
  expect(res.status, "the story door refused a plain create").toBe(200)
  const found = db()
    .prepare(`SELECT id FROM stories WHERE title = ? ORDER BY id DESC LIMIT 1`)
    .get(body.title as string) as { id: string } | undefined
  expect(found, "the story was not written").toBeTruthy()
  return (found as { id: string }).id
}

async function addSprint(body: Record<string, unknown>): Promise<string> {
  const res = await call(IDS.staffUser, "POST /api/content/sprints", { name: "A phase", ...body })
  expect(res.status).toBe(200)
  const { sprints } = (await res.json()) as { sprints: { id: string; name: string }[] }
  const found = sprints.find((s) => s.name === (body.name ?? "A phase"))
  expect(found, "the sprint was not written").toBeTruthy()
  return (found as { id: string }).id
}

async function setStatus(id: string, status: string, extra: Record<string, unknown> = {}) {
  const res = await call(IDS.staffUser, "POST /api/content/stories/status", { id, status, ...extra })
  expect(res.status, `moving a story to ${status} was refused`).toBe(200)
}

beforeEach(() => {
  holder.db = buildSpineDb()
})

describe("a story remembers its stages (team migration 0110)", () => {
  it("writes an event when a status change actually moves the row", async () => {
    const id = await addStory({ title: "Ship the burndown chart" })
    expect(eventsFor(id)).toEqual([])
    await setStatus(id, "done")
    expect(eventsFor(id)).toEqual([{ from_status: "open", to_status: "done" }])
  })

  it("writes nothing when the move is a no-op (R17)", async () => {
    const id = await addStory({ title: "Re-close an already-closed story" })
    await setStatus(id, "done")
    // A second "done" moves zero rows, so it must add no second line.
    await setStatus(id, "done")
    expect(eventsFor(id)).toEqual([{ from_status: "open", to_status: "done" }])
  })

  it("records a backward move, a story pulled back out of done", async () => {
    const id = await addStory({ title: "Reopen a done story" })
    await setStatus(id, "done")
    await setStatus(id, "open")
    expect(eventsFor(id)).toEqual([
      { from_status: "open", to_status: "done" },
      { from_status: "done", to_status: "open" },
    ])
  })

  it("the automatic in_progress flip records an event too", async () => {
    const id = await addStory({ title: "Start a timer on it" })
    const res = await call(IDS.staffUser, "POST /api/content/work-logs/start", {
      targetTable: "stories",
      targetId: id,
    })
    expect(res.status).toBe(200)
    expect(eventsFor(id)).toEqual([{ from_status: "open", to_status: "in_progress" }])
  })
})

describe("POST /api/content/stories/burndown, the series a phase's chart plots", () => {
  it("refuses a phase with no start/end dates, in a plain message", async () => {
    const phaseId = await addSprint({ name: "No dates yet" })
    const res = await call(IDS.staffUser, "POST /api/content/stories/burndown", { phaseId })
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: string; message: string }
    expect(body.error).toBe("phase_has_no_dates")
    expect(body.message.length).toBeGreaterThan(10)
  })

  it("refuses a phase that does not exist", async () => {
    const res = await call(IDS.staffUser, "POST /api/content/stories/burndown", { phaseId: "nope" })
    expect(res.status).toBe(404)
  })

  it("says there is nothing to count when the phase has dates but no stories", async () => {
    const phaseId = await addSprint({ name: "Empty phase", startsOn: "2026-02-01", endsOn: "2026-02-03" })
    const res = await call(IDS.staffUser, "POST /api/content/stories/burndown", { phaseId })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { startTotal: number; days: { remainingCount: number }[] }
    expect(body.startTotal).toBe(0)
    expect(body.days).toHaveLength(3)
    expect(body.days.every((d) => d.remainingCount === 0)).toBe(true)
  })

  it("says it counts stories, not points, until a points column exists", async () => {
    const phaseId = await addSprint({ name: "Points check", startsOn: "2026-02-01", endsOn: "2026-02-02" })
    const body = (await (
      await call(IDS.staffUser, "POST /api/content/stories/burndown", { phaseId })
    ).json()) as { hasPoints: boolean; days: { remainingPoints: number | null }[] }
    expect(body.hasPoints).toBe(false)
    expect(body.days.every((d) => d.remainingPoints === null)).toBe(true)
  })

  it("computes the series correctly against a small fixture", async () => {
    // A five-day phase, four stories, two closed partway through.
    const phaseId = await addSprint({ name: "Checkout redesign", startsOn: "2026-03-01", endsOn: "2026-03-05" })
    const a = await addStory({ title: "Story A", sprintId: phaseId })
    const b = await addStory({ title: "Story B", sprintId: phaseId })
    const c = await addStory({ title: "Story C", sprintId: phaseId })
    const d = await addStory({ title: "Story D", sprintId: phaseId })

    // Close A on day 2, close B on day 4, driven through the real door so the
    // writer under test is exercised, then the event's timestamp is pinned to
    // the day the fixture is about (the door always stamps "now").
    await setStatus(a, "done")
    db().exec(
      `UPDATE story_status_events SET created_at = '2026-03-02T12:00:00.000Z' WHERE story_id = '${a}'`
    )
    await setStatus(b, "done")
    db().exec(
      `UPDATE story_status_events SET created_at = '2026-03-04T12:00:00.000Z' WHERE story_id = '${b}'`
    )
    // C and D never move, still open on every day.
    void c
    void d

    const res = await call(IDS.staffUser, "POST /api/content/stories/burndown", { phaseId })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      startTotal: number
      hasPoints: boolean
      days: { date: string; remainingCount: number; idealCount: number }[]
    }

    expect(body.startTotal).toBe(4)
    expect(body.days.map((day) => day.date)).toEqual([
      "2026-03-01",
      "2026-03-02",
      "2026-03-03",
      "2026-03-04",
      "2026-03-05",
    ])
    // Day 1: nothing closed yet, all four remain.
    expect(body.days[0].remainingCount).toBe(4)
    // Day 2: A closed, three remain.
    expect(body.days[1].remainingCount).toBe(3)
    expect(body.days[2].remainingCount).toBe(3)
    // Day 4: B closed too, two remain.
    expect(body.days[3].remainingCount).toBe(2)
    expect(body.days[4].remainingCount).toBe(2)

    // The ideal line: a straight fall from 4 on day one to 0 on day five.
    expect(body.days[0].idealCount).toBe(4)
    expect(body.days[4].idealCount).toBe(0)
    expect(body.days[2].idealCount).toBeCloseTo(2, 5)
  })

  it("a story pulled back out of done counts as remaining again from that day", async () => {
    const phaseId = await addSprint({ name: "Reopen fixture", startsOn: "2026-04-01", endsOn: "2026-04-03" })
    const id = await addStory({ title: "Story that gets reopened", sprintId: phaseId })

    await setStatus(id, "done")
    db().exec(`UPDATE story_status_events SET created_at = '2026-04-01T12:00:00.000Z' WHERE story_id = '${id}' AND to_status = 'done'`)
    await setStatus(id, "open")
    db().exec(`UPDATE story_status_events SET created_at = '2026-04-02T12:00:00.000Z' WHERE story_id = '${id}' AND to_status = 'open'`)

    const body = (await (
      await call(IDS.staffUser, "POST /api/content/stories/burndown", { phaseId })
    ).json()) as { days: { date: string; remainingCount: number }[] }

    expect(body.days.find((d) => d.date === "2026-04-01")?.remainingCount).toBe(0)
    // Reopened on day 2, counts as remaining again from here on.
    expect(body.days.find((d) => d.date === "2026-04-02")?.remainingCount).toBe(1)
    expect(body.days.find((d) => d.date === "2026-04-03")?.remainingCount).toBe(1)
  })

  // Aurora's ruling, 21 Sep 2026, verbatim: "mind you, all of this is Monday
  // to Friday... I, of course, don't count the weekends." A phase this test
  // runs Monday 2026-03-02 through the following Monday 2026-03-09, eight
  // calendar days, with a Saturday and a Sunday sitting inside it, so the
  // ideal line has somewhere real to prove it does not drop on either of them.
  it("the ideal line falls only on working days, flat across the weekend inside the phase", async () => {
    const phaseId = await addSprint({ name: "Crosses a weekend", startsOn: "2026-03-02", endsOn: "2026-03-09" })
    for (let i = 0; i < 5; i++) await addStory({ title: `Weekend story ${i}`, sprintId: phaseId })

    const body = (await (
      await call(IDS.staffUser, "POST /api/content/stories/burndown", { phaseId })
    ).json()) as { startTotal: number; days: { date: string; idealCount: number }[] }

    expect(body.startTotal).toBe(5)
    const byDate = new Map(body.days.map((d) => [d.date, d.idealCount]))
    // Mon, Tue, Wed, Thu, Fri: one working day at a time, 5 down to 1.
    expect(byDate.get("2026-03-02")).toBe(5)
    expect(byDate.get("2026-03-03")).toBe(4)
    expect(byDate.get("2026-03-04")).toBe(3)
    expect(byDate.get("2026-03-05")).toBe(2)
    expect(byDate.get("2026-03-06")).toBe(1)
    // Sat and Sun: flat, the same figure Friday closed at, no calendar-day
    // drop across the weekend.
    expect(byDate.get("2026-03-07")).toBe(1)
    expect(byDate.get("2026-03-08")).toBe(1)
    // The following Monday: the phase's own last day, back to zero.
    expect(byDate.get("2026-03-09")).toBe(0)
  })
})
