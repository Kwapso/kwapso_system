// WHAT A TICKET ARRIVED AS IS WRITTEN ONCE AND NEVER AGAIN.
//
// `help_type` is overwritten in place when a ticket is recategorised, which is
// right — the type is what the ticket IS. It also meant the app could never
// answer the other question: what did it come in AS? Team migration 0065 adds
// `raised_as_type`, stamped in `createTicket`'s INSERT and touched by no UPDATE
// anywhere, and this suite is the whole of what makes that sentence true rather
// than a comment somebody meant.
//
// THE INVARIANT IS NEGATIVE, which is why it needs a source scan as well as a
// behavioural test. "The column is stamped correctly" is provable by driving the
// doors; "nothing will ever move it" is not, because the write that breaks it
// has not been written yet. The failure would be silent and total: the pair
// stops meaning "arrived as / is now", every value agrees with `help_type`, and
// the recategorisation chart reports zero for ever while looking exactly like a
// working chart. So the scan below reads every worker source off disk and fails
// on a second writer, in the shape triage-duty.test.ts already uses for the one
// other column in this app with a one-writer rule.
//
// THE ONE WRITE THAT IS ALLOWED, and it is not an UPDATE of this fact: renaming
// a dropdown value re-spells the word on every record that stored it, because in
// this app the WORD is the join key. shared/selectable-homes.ts declares
// `raised_as_type` as a second home of `Ticket type` so a rename carries it, and
// the last case here is why: without it, renaming "Request" to "Ask" would
// manufacture a recategorisation on every historical request — which is the
// exact number the chart exists to report.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { DatabaseSync } from "node:sqlite"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"

const holder = vi.hoisted(() => ({ db: null as DatabaseSync | null }))

vi.mock("@shared/workers/d1-rest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/d1-rest")>()
  const { d1Impl } = await import("../../tenancy/test/d1-sqlite")
  return { ...actual, ...d1Impl(() => holder.db as DatabaseSync) }
})

import worker from "../src/index"
import { buildSpineDb, IDS, makeEnv } from "../../tenancy/test/spine-harness"
import { storedWordColumns } from "@shared/selectable-homes"
import { workingDaysAgo } from "@shared/business-days"
import { TRIAGE_AFTER_DAYS } from "../src/lib/triage"

const ROOT = join(__dirname, "..", "..", "..")
const db = () => holder.db as DatabaseSync

/** The most recent date (strictly before today) falling on `weekday`, where
 * Sunday is 0 — SQLite's own `strftime('%w')` numbering, so a test that names a
 * Friday and a door that recognises one are using one convention.
 *
 * Relative to now rather than a fixed calendar date, for the reason the closing
 * seeds below are: everything on this dashboard is measured against a window
 * that moves, so a hard-coded Friday is a test that expires. */
function mostRecentWeekday(weekday: number): Date {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  do {
    d.setUTCDate(d.getUTCDate() - 1)
  } while (d.getUTCDay() !== weekday)
  return d
}

function env(userId: string) {
  const base = makeEnv(() => db(), userId) as unknown as Record<string, unknown>
  return {
    ...base,
    INTERNAL_KEY: "k",
    PUBLIC_APP_URL: "https://kwapso.example",
    REALTIME: { fetch: async () => new Response("{}") },
  } as never
}

const call = (userId: string, route: string, body?: unknown) => {
  const [method, path] = route.split(" ")
  return worker.fetch(
    new Request(`https://content${path}`, {
      method,
      headers: { Cookie: "session=x", "Content-Type": "application/json" },
      body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
    }),
    env(userId) as never
  )
}

/** The two type columns of one ticket, straight off the row. */
const typesOf = (id: string) =>
  db().prepare(`SELECT help_type, raised_as_type FROM help WHERE id = ?`).get(id) as {
    help_type: string | null
    raised_as_type: string | null
  }

async function raise(fields: Record<string, unknown>): Promise<string> {
  const res = await call(IDS.staffUser, "POST /api/content/help", {
    description: "The dispatch board will not load on a phone",
    ...fields,
  })
  const body = (await res.json()) as { tickets?: { id: string }[]; id?: string }
  const id = body.id ?? body.tickets?.[0]?.id
  if (!id) throw new Error(`raise failed ${res.status}: ${JSON.stringify(body)}`)
  return id
}

beforeEach(() => {
  holder.db = buildSpineDb()
})

describe("the type a ticket arrived as is stamped at creation", () => {
  it("the INSERT writes it from the same value help_type gets", async () => {
    const id = await raise({ helpType: "Question", accountId: IDS.victimAccount })
    expect(typesOf(id)).toEqual({ help_type: "Question", raised_as_type: "Question" })
  })

  it("a ticket raised with no kind records no kind — never a guess", async () => {
    // NULL means "nobody said", which is a different fact from any type we could
    // have defaulted to. The same sentence the column keeps about history.
    const id = await raise({ accountId: IDS.victimAccount })
    expect(typesOf(id)).toEqual({ help_type: null, raised_as_type: null })
  })

  it("…and it rides every ticket-shaped read out to the caller", async () => {
    const id = await raise({ helpType: "Question", accountId: IDS.victimAccount })
    const res = await call(IDS.staffUser, `GET /api/content/help?id=${id}`)
    const body = (await res.json()) as { tickets: { id: string; raisedAsType: string | null }[] }
    expect(body.tickets[0]?.raisedAsType, "the door dropped the column on the way out").toBe(
      "Question"
    )
  })
})

describe("recategorising moves help_type and leaves the record of arrival alone", () => {
  it("the edit door changes one column and not the other", async () => {
    const id = await raise({ helpType: "Question", accountId: IDS.victimAccount })
    const res = await call(IDS.staffUser, "POST /api/content/help/update", {
      id,
      description: "The dispatch board will not load on a phone",
      helpType: "Issue",
    })
    expect(res.status, await res.clone().text()).toBe(200)
    expect(typesOf(id)).toEqual({ help_type: "Issue", raised_as_type: "Question" })
  })

  it("a SECOND recategorisation still reports the FIRST arrival", async () => {
    // The obvious wrong implementation — "remember the previous value" — passes
    // the case above and fails here, because it would answer "Issue".
    const id = await raise({ helpType: "Question", accountId: IDS.victimAccount })
    for (const helpType of ["Issue", "Request"])
      await call(IDS.staffUser, "POST /api/content/help/update", {
        id,
        description: "The dispatch board will not load on a phone",
        helpType,
      })
    expect(typesOf(id)).toEqual({ help_type: "Request", raised_as_type: "Question" })
  })

  it("moving a ticket's STATUS does not touch it either", async () => {
    const id = await raise({ helpType: "Question", accountId: IDS.victimAccount })
    await call(IDS.staffUser, "POST /api/content/help/triage-read", { id })
    expect(typesOf(id).raised_as_type).toBe("Question")
  })
})

describe("no second writer, anywhere", () => {
  // THE NEGATIVE HALF, which no behavioural test can reach: a write that does
  // not exist yet. Every worker source is read off disk, and the column may
  // appear in exactly one statement — the INSERT that stamps it.
  const workerSources = () => {
    const dirs = ["auth", "content", "data-ops", "mcp", "realtime", "tenancy"].map((w) =>
      join(ROOT, "workers", w, "src")
    )
    return sourceFiles(dirs, { extensions: [".ts"], relativeTo: ROOT })
  }

  it("no UPDATE statement in any worker names raised_as_type", () => {
    const offenders: string[] = []
    for (const { rel, source } of workerSources()) {
      // The migration ledger is the one file allowed to name it in DDL — it is
      // where the column is CREATED — and it holds no UPDATE of it either, which
      // is what this deliberately still checks: 0065 adds the column and
      // backfills nothing.
      for (const m of stripComments(source).matchAll(/UPDATE\s+[\s\S]{0,600}?raised_as_type/gi)) {
        // …but only when the match really is one statement: `[\s\S]{0,600}` can
        // run past the end of an UPDATE into an unrelated SELECT. A statement
        // ends at its semicolon or at the RETURNING clause, so a match carrying
        // either before the column name is two statements, not one.
        if (!/[;]|RETURNING/i.test(m[0])) offenders.push(`${rel}: …${m[0].slice(-120)}`)
      }
    }
    expect(
      offenders,
      "raised_as_type may be written ONCE, in createTicket's INSERT. An UPDATE of it erases the only fact it holds — read team migration 0065 before adding one"
    ).toEqual([])
  })

  it("exactly one INSERT writes it, and it is the ticket create", () => {
    const writers = workerSources().filter(
      ({ source }) => /INSERT INTO help\s*\([^)]*raised_as_type/i.test(stripComments(source))
    )
    expect(
      writers.map((f) => f.rel),
      "the ticket INSERT is the one place this column is written"
    ).toEqual(["workers/content/src/lib/help.ts"])
  })
})

describe("a rename is a re-spelling, not a recategorisation", () => {
  it("the Ticket type vocabulary declares BOTH columns as its home", () => {
    expect(
      storedWordColumns("Ticket type"),
      "renaming a ticket type must carry the arrival record with it, or every historical ticket of that type reads as recategorised"
    ).toEqual([
      { table: "help", column: "help_type" },
      { table: "help", column: "raised_as_type" },
    ])
  })

  it("…so renaming Request to Ask leaves no ticket looking recategorised", () => {
    // The rename exactly as `updateSelectable` builds it (the tenancy suite
    // rename-carries-its-records.test.ts proves that shape); asserted here for
    // its effect on THIS column, which is the reason the second home exists.
    db().exec(`
      INSERT INTO help (id, description, help_type, raised_as_type, status, created_at)
        VALUES ('H_R','a','Request','Request','new','2026-01-01');
      INSERT INTO help (id, description, help_type, raised_as_type, status, created_at)
        VALUES ('H_M','b','Issue','Request','new','2026-01-01');
    `)
    for (const h of storedWordColumns("Ticket type"))
      db().prepare(`UPDATE ${h.table} SET ${h.column} = ? WHERE ${h.column} = ?`).run("Ask", "Request")

    // The untouched ticket still reads as untouched…
    expect(typesOf("H_R"), "a rename manufactured a recategorisation").toEqual({
      help_type: "Ask",
      raised_as_type: "Ask",
    })
    // …and the genuinely recategorised one still reads as recategorised.
    expect(typesOf("H_M"), "a rename erased a real recategorisation").toEqual({
      help_type: "Issue",
      raised_as_type: "Ask",
    })
  })
})

describe("the dashboard door only counts what it can stand behind", () => {
  /** Every chart on the tab, in one read — optionally narrowed by the toolbar's
   * own two filters, which are PARAMETERS of this door rather than a sieve in
   * the browser (there are no rows on that tab to sieve). */
  async function dashboard(query = "") {
    const res = await call(IDS.staffUser, `GET /api/content/help/dashboard${query}`)
    expect(res.status, await res.clone().text()).toBe(200)
    return (await res.json()) as {
      openByTypeAndStatus: { helpType: string; status: string; n: number }[]
      byAccountAndType: { accountId: string; helpType: string; open: number; total: number }[]
      closureDays: { helpType: string; n: number; p25Days: number; medianDays: number; p75Days: number }[]
      closureTrend: { helpType: string; month: string; n: number; medianDays: number }[]
      raisedVsCurrent: { raisedAsType: string; helpType: string | null; n: number }[]
      raisedAsNotRecorded: number
      openByApp: { appId: string | null; helpType: string; open: number; total: number }[]
      unopenedPastLine: number
    }
  }

  /** WHERE THE CLOSING-TIME SEEDS SIT, and why they are not fixed dates any
   * more. The spread is taken over the last `CLOSURE_WINDOW_MONTHS`, so a ticket
   * seeded at a hard-coded January date drops out of the answer the moment the
   * calendar moves past it — which is a test that passes for a season and then
   * starts failing on a Tuesday for no reason anybody changed. Everything below
   * is anchored to NOW instead, and moved backwards with the product's own
   * `workingDaysAgo`, which is the exact inverse of the count the door takes: a
   * ticket seeded `d` working days before its close reports exactly `d`. */
  const closedAt = workingDaysAgo(new Date(), 2)
  const raisedFor = (workingDays: number) => workingDaysAgo(closedAt, workingDays).toISOString()

  /** A ticket written straight into the table, so a test can choose its dates,
   * its stage and whether its arrival was ever recorded — none of which the
   * create door will let it decide. */
  function seed(row: {
    id: string
    helpType: string | null
    raisedAs: string | null
    status: string
    createdAt?: string
    resolvedAt?: string | null
    appId?: string | null
    accountId?: string | null
  }) {
    db()
      .prepare(
        `INSERT INTO help (id, description, help_type, raised_as_type, status, resolved, resolved_at,
                           app_id, account_id, created_at)
         VALUES (?, 'seeded', ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        row.id,
        row.helpType,
        row.raisedAs,
        row.status,
        row.status === "resolved" ? 1 : 0,
        row.resolvedAt ?? null,
        row.appId ?? null,
        row.accountId ?? null,
        row.createdAt ?? "2026-01-01T00:00:00.000Z"
      )
  }

  it("the raised-as matrix EXCLUDES the rows nothing recorded, and counts them", async () => {
    // THE WHOLE POINT OF 0065's refusal to backfill. Two tickets we know about,
    // two we do not — and the two we do not are a number the reader is told,
    // never a silent addition to the diagonal.
    seed({ id: "D1", helpType: "Issue", raisedAs: "Question", status: "new" })
    seed({ id: "D2", helpType: "Question", raisedAs: "Question", status: "new" })
    seed({ id: "D3", helpType: "Issue", raisedAs: null, status: "new" })
    seed({ id: "D4", helpType: "Request", raisedAs: null, status: "new" })

    const { raisedVsCurrent, raisedAsNotRecorded } = await dashboard()
    const cells = raisedVsCurrent.filter((c) => c.raisedAsType === "Question")
    expect(cells.map((c) => [c.helpType, c.n]).sort()).toEqual([
      ["Issue", 1],
      ["Question", 1],
    ])
    expect(
      raisedVsCurrent.every((c) => c.raisedAsType !== null),
      "a null arrival is not a cell in the matrix"
    ).toBe(true)
    // The spine harness seeds one ticket of its own, raised before this column
    // existed, so it is counted here too — which is exactly the point.
    expect(raisedAsNotRecorded).toBeGreaterThanOrEqual(2)
  })

  it("days-to-close is a median and quartiles, not a mean", async () => {
    // Five closed tickets at 1, 2, 3, 4 and 100 WORKING days. The mean is 22 and
    // describes none of them; the median is 3 and describes the middle one.
    // Nothing here may return 22.
    for (const [i, days] of [1, 2, 3, 4, 100].entries())
      seed({
        id: `C${i}`,
        helpType: "Issue",
        raisedAs: "Issue",
        status: "resolved",
        createdAt: raisedFor(days),
        resolvedAt: closedAt.toISOString(),
      })

    const issues = (await dashboard()).closureDays.find((c) => c.helpType === "Issue")
    expect(issues, "the closure summary lost the only kind with closed tickets").toBeTruthy()
    expect(issues?.n).toBe(5)
    expect(issues?.medianDays).toBeCloseTo(3, 6)
    // Nearest rank on five values: the 2nd and the 4th.
    expect(issues?.p25Days).toBeCloseTo(2, 6)
    expect(issues?.p75Days).toBeCloseTo(4, 6)
  })

  it("…and with an EVEN count the median is the two middle rows averaged", async () => {
    for (const [i, days] of [2, 4, 6, 8].entries())
      seed({
        id: `E${i}`,
        helpType: "Extra",
        raisedAs: "Extra",
        status: "resolved",
        createdAt: raisedFor(days),
        resolvedAt: closedAt.toISOString(),
      })
    const extras = (await dashboard()).closureDays.find((c) => c.helpType === "Extra")
    expect(extras?.n).toBe(4)
    expect(extras?.medianDays).toBeCloseTo(5, 6)
  })

  it("THE WEEKEND DOES NOT COUNT — the client's ruling, on the door itself", async () => {
    // Her words, 6 Sep 2026: "the time counts monday-friday! saturday and sunday
    // do not count towards how long it took! very very important!" The case she
    // described is the first one here: raised on a Friday afternoon, closed on
    // the Monday morning, which the calendar called three days and nobody
    // worked. `working-days-agree.test.ts` proves the SQL and the Javascript
    // agree; this proves the DOOR is built out of them rather than out of a
    // subtraction somebody wrote at the chart.
    const friday = mostRecentWeekday(5)
    const monday = new Date(friday.getTime() + 3 * 86_400_000)
    const setHour = (d: Date, h: number) => {
      const out = new Date(d.getTime())
      out.setUTCHours(h, 0, 0, 0)
      return out.toISOString()
    }
    seed({
      id: "W1",
      helpType: "Question",
      raisedAs: "Question",
      status: "resolved",
      createdAt: setHour(friday, 16),
      resolvedAt: setHour(monday, 9),
    })
    const questions = (await dashboard()).closureDays.find((c) => c.helpType === "Question")
    expect(questions?.n).toBe(1)
    expect(
      questions?.medianDays,
      "a ticket raised on Friday evening and closed on Monday morning took no working days — the weekend is not time"
    ).toBe(0)
  })

  it("the twelve-month trend keeps a month with a single closure in it", async () => {
    // THIS ASSERTION IS INVERTED, AND THE INVERSION IS THE RECORD.
    //
    // It used to prove the opposite: a `(kind, month)` bucket under
    // `CLOSURE_TREND_MIN_CLOSURES` (eight) never left this read, because a
    // median exists for a bucket of one, is drawn at the same weight as a median
    // of a hundred, and a chart cannot refuse to be read.
    //
    // The client, 2026-09-07: "Only months with at least 8 of a kind are thrown.
    // No, even if it's only 1, it should appear there." She has heard the
    // argument and ruled the other way — a month she knows something closed in,
    // drawn as a gap, reads as the app having lost her work. The constant is
    // deleted rather than left as an unused pin, and the whole reasoning behind
    // it is kept where it used to be defined, in `shared/types.ts`.
    //
    // SO THIS IS THE FLOOR'S OWN CASE, TURNED ROUND, and it is deliberately the
    // same shape: one kind closing several tickets and one kind closing exactly
    // ONE, in the same month. The thin bucket used to be the proof the floor
    // worked; it is now the proof nothing threshold it. `n` still travels with
    // every row, which is the only thing standing between a thin month and a
    // misread one — the screen prints it in the month's hover readout.
    const many = 8
    for (let i = 0; i < many; i++)
      seed({
        id: `T${i}`,
        helpType: "Request",
        raisedAs: "Request",
        status: "resolved",
        createdAt: raisedFor(3),
        resolvedAt: closedAt.toISOString(),
      })
    seed({
      id: "S0",
      helpType: "Extra",
      raisedAs: "Extra",
      status: "resolved",
      createdAt: raisedFor(5),
      resolvedAt: closedAt.toISOString(),
    })

    const { closureTrend } = await dashboard()
    const month = closedAt.toISOString().slice(0, 7)
    const requests = closureTrend.find((r) => r.helpType === "Request" && r.month === month)
    expect(requests?.n).toBe(many)
    expect(requests?.medianDays).toBeCloseTo(3, 6)
    const extras = closureTrend.find((r) => r.helpType === "Extra" && r.month === month)
    expect(
      extras,
      "a month with a single closure was dropped — the floor is back, or something else is thresholding this read"
    ).toBeTruthy()
    expect(
      extras?.n,
      "the count a thin median was taken over did not travel, so the screen cannot say what the point is standing on"
    ).toBe(1)
    expect(extras?.medianDays).toBeCloseTo(5, 6)
  })

  it("the unopened count is the triage queue's own line, in working days", async () => {
    // Same threshold, same function, so the chip on the dashboard and the length
    // of the queue can never be two different numbers.
    seed({
      id: "U1",
      helpType: "Issue",
      raisedAs: "Issue",
      status: "new",
      createdAt: workingDaysAgo(new Date(), TRIAGE_AFTER_DAYS + 2).toISOString(),
    })
    seed({
      id: "U2",
      helpType: "Issue",
      raisedAs: "Issue",
      status: "new",
      createdAt: new Date().toISOString(),
    })
    // A ticket somebody already read is not one nobody has opened.
    seed({
      id: "U3",
      helpType: "Issue",
      raisedAs: "Issue",
      status: "triaged",
      createdAt: workingDaysAgo(new Date(), TRIAGE_AFTER_DAYS + 9).toISOString(),
    })

    const queue = await call(IDS.staffUser, "GET /api/content/triage")
    expect(queue.status).toBe(200)
    const { total } = (await queue.json()) as { total: number }
    expect(
      (await dashboard()).unopenedPastLine,
      "the dashboard and the triage queue disagree about what 'nobody has opened this' means"
    ).toBe(total)
  })

  it("THE TOOLBAR'S TWO FILTERS ARE A WHERE CLAUSE ON EVERY READ", async () => {
    // The client's ruling, 6 Sep 2026: "dashboard should also have toolbar /
    // filter by client and type / no sort." There are no rows on that tab, so a
    // filter that stopped at the browser would change nothing on screen — it has
    // to reach the door and be taken again over a smaller WHERE.
    seed({ id: "F1", helpType: "Issue", raisedAs: "Issue", status: "new", accountId: IDS.victimAccount })
    seed({ id: "F2", helpType: "Extra", raisedAs: "Extra", status: "new", accountId: IDS.victimAccount })
    seed({ id: "F3", helpType: "Issue", raisedAs: "Issue", status: "new", accountId: null })

    const byType = await dashboard("?helpType=Extra")
    expect(
      byType.openByTypeAndStatus.every((r) => r.helpType === "Extra"),
      "the kind filter did not reach the pipeline read"
    ).toBe(true)
    expect(
      byType.raisedVsCurrent.every((r) => r.helpType === "Extra" || r.helpType === null),
      "the kind filter did not reach the recategorisation matrix"
    ).toBe(true)

    const byClient = await dashboard(`?accountId=${IDS.victimAccount}`)
    expect(
      byClient.byAccountAndType.every((r) => r.accountId === IDS.victimAccount),
      "the client filter did not reach the client ranking"
    ).toBe(true)
    expect(
      byClient.openByTypeAndStatus.reduce((n, r) => n + r.n, 0),
      "the client filter narrowed one chart and not the rest"
    ).toBeLessThan((await dashboard()).openByTypeAndStatus.reduce((n, r) => n + r.n, 0))
  })

  it("…and the STAGE is still not a filter this door offers", async () => {
    // A dashboard narrowed to one stage would draw a pipeline of one row and a
    // closing-time chart of tickets that have not closed, under headings that
    // all still say backlog. `status` is dropped inside the read, so a query
    // string cannot smuggle one in.
    seed({ id: "G1", helpType: "Issue", raisedAs: "Issue", status: "new" })
    seed({ id: "G2", helpType: "Issue", raisedAs: "Issue", status: "triaged" })
    const stages = (await dashboard("?status=new")).openByTypeAndStatus.map((r) => r.status)
    expect(new Set(stages).size, "a stage filter reached the door").toBeGreaterThan(1)
  })

  it("open work by kind carries the stage INSIDE the kind, and leaves closed work out", async () => {
    seed({ id: "O1", helpType: "Issue", raisedAs: "Issue", status: "new" })
    seed({ id: "O2", helpType: "Issue", raisedAs: "Issue", status: "triaged" })
    seed({ id: "O3", helpType: "Issue", raisedAs: "Issue", status: "resolved", resolvedAt: "2026-02-01" })

    const rows = (await dashboard()).openByTypeAndStatus.filter((r) => r.helpType === "Issue")
    expect(
      rows.map((r) => [r.status, r.n]).sort(),
      "a stacked bar needs the pair, not two tallies beside each other"
    ).toEqual([
      ["new", 1],
      ["triaged", 1],
    ])
  })

  it("the client ranking is per (client, kind) — which is what 'the most extras' asks", async () => {
    seed({ id: "K1", helpType: "Extra", raisedAs: "Extra", status: "new", accountId: IDS.victimAccount })
    seed({ id: "K2", helpType: "Extra", raisedAs: "Extra", status: "new", accountId: IDS.victimAccount })
    seed({ id: "K3", helpType: "Request", raisedAs: "Request", status: "new", accountId: IDS.victimAccount })

    const rows = (await dashboard()).byAccountAndType.filter((r) => r.accountId === IDS.victimAccount)
    expect(rows.find((r) => r.helpType === "Extra")?.open).toBe(2)
    expect(rows.find((r) => r.helpType === "Request")?.open).toBe(1)
  })

  it("open work by system KEEPS the tickets nobody said a system for", async () => {
    seed({ id: "A1", helpType: "Issue", raisedAs: "Issue", status: "new", appId: IDS.victimApp })
    seed({ id: "A2", helpType: "Issue", raisedAs: "Issue", status: "new", appId: null })

    const rows = (await dashboard()).openByApp
    expect(rows.find((r) => r.appId === IDS.victimApp)?.open).toBe(1)
    expect(
      rows.find((r) => r.appId === null)?.open,
      "work with no system named is a bar, not a rounding error"
    ).toBeGreaterThanOrEqual(1)
  })

  it("…and carries the KIND inside each system, which is what the bar is split by", async () => {
    // An app carrying fourteen tickets of which eight are issues is a quality
    // problem in one app; an app carrying fourteen requests is a client
    // spending money. One tally per app cannot tell those apart, which is the
    // same argument the pipeline read is built on.
    seed({ id: "B1", helpType: "Issue", raisedAs: "Issue", status: "new", appId: IDS.victimApp })
    seed({ id: "B2", helpType: "Issue", raisedAs: "Issue", status: "new", appId: IDS.victimApp })
    seed({ id: "B3", helpType: "Request", raisedAs: "Request", status: "new", appId: IDS.victimApp })

    const mine = (await dashboard()).openByApp.filter((r) => r.appId === IDS.victimApp)
    expect(mine.find((r) => r.helpType === "Issue")?.open).toBe(2)
    expect(mine.find((r) => r.helpType === "Request")?.open).toBe(1)
  })

  it("a client login is refused at the door (R21)", async () => {
    // Every chart here compares one client against the rest, so the account
    // fence is not the answer — the door is not theirs at all.
    const res = await call(IDS.contactUser, "GET /api/content/help/dashboard")
    expect(res.status).toBe(403)
  })
})

/** The migration is read as TEXT here rather than through the ledger, because
 * what is asserted is the DECISION written in it: 0065 adds the column and
 * backfills NOTHING. A future "improvement" that fills it from the activity feed
 * or copies `help_type` across would be a silent change to what the column
 * means, and this is where somebody is made to read the reasoning first. */
describe("0065 backfills nothing, on purpose", () => {
  const ledger = readFileSync(
    join(ROOT, "workers", "tenancy", "src", "team-schema", "migrations.ts"),
    "utf8"
  )
  const at = ledger.indexOf('version: "0065_a_ticket_remembers_what_it_arrived_as"')

  it("the migration exists and is the one that adds the column", () => {
    expect(at, "0065 is gone — has the column moved?").toBeGreaterThan(-1)
    expect(ledger.slice(at, at + 400)).toContain("ALTER TABLE help ADD COLUMN raised_as_type TEXT;")
  })

  it("its SQL is the ALTER and nothing else", () => {
    const sql = ledger.slice(at, ledger.indexOf("`,", at))
    expect(
      /UPDATE\s+help/i.test(sql),
      "0065 must not backfill: an inferred value in the same column as a stamped one cannot be told apart afterwards. Read the migration's own comment"
    ).toBe(false)
  })
})
