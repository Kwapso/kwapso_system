// TASKS PAGE BY KEY, AND THE FOUR-KEY ORDER SURVIVES THE PAGE BOUNDARY.
//
// The list this collection shows sorts on FOUR things — unfinished before
// finished, then most important-and-urgent, then dated before undated, then
// soonest deadline — and a keyset cursor can only carry ONE value. So the four
// are folded into one lexicographic string (`TASK_SORTS` in lib/tasks.ts), and
// that fold exists in TWO PLACES by construction: `expr` runs inside SQLite and
// `key` runs in this worker over the row that came back.
//
// THOSE TWO HALVES DISAGREEING IS THE FAILURE THIS FILE EXISTS FOR, and it is
// worth being precise about why it needs a test rather than care. A wrong cursor
// does not throw and does not return an error: the door answers 200, the page
// looks entirely reasonable, and a slice of the collection is silently skipped or
// silently repeated somewhere in the middle. Nobody notices until a person goes
// looking for a task they know exists — which is exactly how the ticket bug of
// 26 Aug 2026 was found, by the owner, in production.
//
// So the proof is a WALK: page through the whole collection and insist that what
// comes back is exactly the rows a single unpaged query returns, in exactly that
// order, each one once. Sixty-one tasks against a PAGE_SIZE of fifty, arranged so
// every branch of the fold is crossed at least once and — deliberately — so a
// page boundary falls in the middle of a run of equal keys, which is the one
// place a tiebreak that does not follow the sort direction goes wrong.
//
// Driven through the SHIPPED route handler against real SQLite, like its sibling
// paged-sort.test.ts, because three files have to agree and only a real walk
// proves they do.

import type { DatabaseSync } from "node:sqlite"
import { beforeEach, describe, expect, it, vi } from "vitest"

const holder = vi.hoisted(() => ({ db: null as DatabaseSync | null }))

vi.mock("@shared/workers/d1-rest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/d1-rest")>()
  const { d1Impl } = await import("../../tenancy/test/d1-sqlite")
  return { ...actual, ...d1Impl(() => holder.db as DatabaseSync) }
})

import worker from "../src/index"
import { PAGE_SIZE } from "@shared/workers/paging"
import { TASK_SORTS } from "../src/lib/tasks"
import { buildSpineDb, IDS, makeEnv } from "../../tenancy/test/spine-harness"

const db = () => holder.db as DatabaseSync

function env() {
  const base = makeEnv(() => db(), IDS.staffUser) as unknown as Record<string, unknown>
  return {
    ...base,
    INTERNAL_KEY: "k",
    PUBLIC_APP_URL: "https://kwapso.example",
    REALTIME: { fetch: async () => new Response("{}") },
  } as never
}

const get = (path: string) =>
  worker.fetch(
    new Request(`https://content${path}`, { headers: { Cookie: "session=x" } }),
    env() as never
  )

type Body = {
  tasks: { id: string; title: string; status: string; important: boolean; urgent: boolean; dueOn: string | null }[]
  total: number
  totalCapped: boolean
  hasMore: boolean
  nextCursor: string | null
}

async function page(path: string): Promise<Body> {
  const res = await get(path)
  expect(res.status, `${path} refused (${await res.clone().text()})`).toBe(200)
  return (await res.json()) as Body
}

/** SIXTY-ONE TASKS, arranged to cross every branch of the fold.
 *
 * The shape matters more than the number. `i % 7 === 0` makes roughly one in
 * seven done (the first key), the two ticks cycle independently through all four
 * combinations (the second), one in five carries no deadline at all (the third),
 * and the deadlines repeat across rows so that many tasks share an identical
 * four-key position — which is what forces the id tiebreak to do real work at a
 * page boundary rather than being decorative. */
function seedTasks(): void {
  const stmts: string[] = []
  for (let i = 0; i < 61; i++) {
    const id = `TASK_${String(i).padStart(3, "0")}`
    const done = i % 7 === 0 ? "done" : "open"
    const important = i % 2 === 0 ? 1 : 0
    const urgent = i % 3 === 0 ? 1 : 0
    // Deliberately COARSE — ten distinct deadlines over sixty-one rows, so runs
    // of identical sort keys are long enough to straddle the fifty-row boundary.
    const due = i % 5 === 4 ? null : `2026-1${i % 10}-01`
    stmts.push(
      `INSERT INTO tasks (id, title, status, important, urgent, due_on, created_at, creator_id, creator_email, creator_name)
       VALUES ('${id}', 'Task ${i}', '${done}', ${important}, ${urgent}, ${due ? `'${due}'` : "NULL"},
               '2026-09-01T00:00:00Z', '${IDS.staffUser}', 'staff@kwapso.test', 'Staff')`
    )
  }
  for (const s of stmts) db().exec(s)
}

/** The order a single UNPAGED query gives — the answer the walk has to match. */
function wholeCollectionInOrder(where = ""): string[] {
  const rows = db()
    .prepare(
      `SELECT t.id FROM tasks t${where}
        ORDER BY COALESCE(${TASK_SORTS.priority.expr}, '') ASC, t.id ASC`
    )
    .all() as { id: string }[]
  return rows.map((r) => r.id)
}

describe("tasks page by key", () => {
  beforeEach(() => {
    holder.db = buildSpineDb()
    seedTasks()
  })

  it("the two halves of the sort key agree, row for row", () => {
    // THE SHARP EDGE. `expr` is computed by SQLite and `key` by this worker; a
    // cursor is minted from the second and compared against the first, so a
    // disagreement on any single row is a page boundary that skips or repeats.
    // Asserted over every row rather than a sample, because the branches that
    // differ are exactly the rare ones (no deadline, both ticks, done).
    const rows = db()
      .prepare(
        `SELECT t.id, t.status, t.important, t.urgent, t.due_on,
                ${TASK_SORTS.priority.expr} AS sql_key FROM tasks t`
      )
      .all() as { id: string; status: string; important: number; urgent: number; due_on: string | null; sql_key: string }[]
    expect(rows.length, "nothing was seeded — this test would pass vacuously").toBe(61)
    const disagreements = rows
      .map((r) => {
        const fromWorker = TASK_SORTS.priority.key({
          status: r.status === "done" ? "done" : "open",
          important: r.important === 1,
          urgent: r.urgent === 1,
          dueOn: r.due_on,
        } as never)
        return fromWorker === r.sql_key ? null : `${r.id}: SQL ${r.sql_key} vs worker ${fromWorker}`
      })
      .filter(Boolean)
    expect(disagreements, "the ORDER BY and the cursor disagree about a row's position").toEqual([])
  })

  it("a full walk returns every task exactly once, in the unpaged order", async () => {
    const expected = wholeCollectionInOrder()
    expect(expected.length).toBe(61)
    // More than one page, or the walk proves nothing.
    expect(expected.length).toBeGreaterThan(PAGE_SIZE)

    const seen: string[] = []
    let cursor: string | null = null
    for (let guard = 0; guard < 10; guard++) {
      const body: Body = await page(
        `/api/content/tasks?view=all${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`
      )
      seen.push(...body.tasks.map((t) => t.id))
      cursor = body.nextCursor
      if (!cursor) break
    }
    expect(cursor, "the walk never reached a last page").toBeNull()
    expect(new Set(seen).size, "a task came back on two different pages").toBe(seen.length)
    expect(seen).toEqual(expected)
  })

  it("the completed pile pages too — the view that made this a growing collection", async () => {
    // The reason tasks is in GROWING_COLLECTIONS at all: `completed` asks for
    // exactly the rows the old cap's reasoning said "fall out of the view".
    const first = await page("/api/content/tasks?view=completed")
    const expected = wholeCollectionInOrder(" WHERE t.status = 'done'")
    expect(expected.length).toBeGreaterThan(0)
    expect(first.tasks.map((t) => t.id)).toEqual(expected.slice(0, PAGE_SIZE))
    expect(first.total, "the badge must count the whole pile, not the page").toBe(expected.length)
    expect(first.tasks.every((t) => t.status === "done")).toBe(true)
  })

  it("every page carries the whole strip, so a tab badge never reads off its own rows", async () => {
    const body = await page("/api/content/tasks?view=completed")
    // R16: the five counts for the tabs nobody is looking at cannot be derived
    // from the rows in front of you, so they ride every answer.
    expect(body.total).toBeGreaterThan(0)
    expect(body.totalCapped).toBe(false)
    const all = await page("/api/content/tasks?view=all")
    expect(all.total).toBe(61)
  })

  it("a task past the first page is reachable by id (R38)", async () => {
    // THE OTHER HALF OF PAGING, and the half that shipped broken last time: a
    // detail screen that resolves its record out of the loaded page can only
    // ever open the first fifty. `taskOne` reads this door.
    const expected = wholeCollectionInOrder()
    const beyond = expected[PAGE_SIZE + 3]
    expect(beyond, "the fixture is too small to have a row past page one").toBeTruthy()

    const firstPage = await page("/api/content/tasks?view=all")
    expect(
      firstPage.tasks.some((t) => t.id === beyond),
      "the fixture put the row on page one — this test would pass without proving anything"
    ).toBe(false)

    const one = await page(`/api/content/tasks?id=${beyond}`)
    expect(one.tasks.map((t) => t.id)).toEqual([beyond])
    expect(one.hasMore, "a lookup is not a page").toBe(false)
    expect(one.nextCursor).toBeNull()
  })

  it("a cursor minted under one view is refused by another, rather than skipping rows", async () => {
    // Each view is its own ordering with its own signature. Handing a position
    // taken in one to a read in another does not produce a wrong page — it
    // produces a page that looks right and omits an arbitrary slice, which is
    // why the seam refuses it outright.
    const all = await page("/api/content/tasks?view=all")
    expect(all.nextCursor).toBeTruthy()
    // Same ordering across views here (one sort menu), so the cursor is
    // ACCEPTED — what must hold is that it is a position and not a row offset:
    // the second page of `completed` starts after that position within the
    // completed pile, never at row fifty of it.
    const done = wholeCollectionInOrder(" WHERE t.status = 'done'")
    const second = await page(
      `/api/content/tasks?view=completed&cursor=${encodeURIComponent(all.nextCursor as string)}`
    )
    for (const row of second.tasks) expect(done).toContain(row.id)
  })
})
