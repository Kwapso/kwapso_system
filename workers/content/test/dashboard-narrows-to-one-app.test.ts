// THE TICKETS DASHBOARD, ASKED ABOUT ONE SYSTEM.
//
// The app record's Tickets tab has two views now — the list, and this same
// dashboard narrowed to the app you are standing on (client, 6 Sep 2026: "make
// the dashboard a view inside the Tickets tab inside the app … like a mini
// version, a filtered version"). The narrowing is a DOOR PARAMETER, `appId`,
// spent in the WHERE clause of all eight grouped reads, because there are no
// rows on that tab for a browser to sieve: every number on it is a COUNT(*) or
// a quantile the database took.
//
// WHICH IS EXACTLY WHY IT NEEDS A TEST THAT RUNS THE DOOR. A filter that never
// reached the SQL would look identical on screen to one that did — the panels
// would draw, the headings would read "this app", and every figure would be the
// whole team's backlog. Nobody scans a chart against a row they can check, so
// there is no way for a reader to notice. A source scan would not catch it
// either: `TicketFilter` already declares `appId`, so the failure is a missing
// LINE in the handler, not a missing type.
//
// So this drives the shipped route against a real SQLite database running the
// real team migrations, over two apps' worth of tickets, and requires the
// answer to be about one of them — panel by panel, because the eight reads
// build their WHERE independently and a filter can be dropped from one of them
// while the other seven narrow correctly.

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

/** THE SECOND SYSTEM. The fixture ships one app (Bergman dispatch); a narrowing
 * test needs something to be narrowed AWAY from, and one app cannot prove
 * anything — an unfiltered read and a filtered one would agree by accident. */
const OTHER_APP = "AP_OTHER"

function env(userId: string) {
  return {
    ...(makeEnv(() => db(), userId) as unknown as Record<string, unknown>),
    INTERNAL_KEY: "k",
    PUBLIC_APP_URL: "https://kwapso.example",
    REALTIME: { fetch: async () => new Response("{}") },
  } as never
}

/** The door's own answer, through the shipped worker. Staff, because the
 * dashboard refuses a client login outright (R21) and this suite is about the
 * narrowing rather than the fence — `help-fence.test.ts` owns that half. */
async function dashboard(query = ""): Promise<TicketDashboardBody> {
  const res = await worker.fetch(
    new Request(`https://content/api/content/help/dashboard${query}`, {
      headers: { Cookie: "session=x" },
    }),
    env(IDS.staffUser)
  )
  expect(res.status, "the dashboard door must answer staff").toBe(200)
  return (await res.json()) as TicketDashboardBody
}

/** Only the shape this suite reads. Deliberately not the door's own exported
 * type: a test that imports the type it is checking will keep agreeing with a
 * response that has quietly changed shape. */
type TicketDashboardBody = {
  openByTypeAndStatus: { helpType: string; status: string; n: number }[]
  byAccountAndType: { accountId: string; helpType: string; open: number }[]
  closureDays: { helpType: string; n: number }[]
  raisedVsCurrent: { raisedAsType: string; helpType: string | null; n: number }[]
  raisedAsNotRecorded: number
  openByApp: { appId: string | null; appName: string | null; helpType: string; open: number }[]
  unopenedPastLine: number
}

/** One ticket, written straight into the team database.
 *
 * INSERTED RATHER THAN RAISED THROUGH THE DOOR, on purpose: this suite needs
 * tickets that are already closed, already old, and already stamped with what
 * they arrived as — three facts the create door sets for itself from the clock.
 * Raising them and then updating every one of those columns would be a longer
 * way of writing the same row with more chances to disagree with itself. */
function ticket(row: {
  id: string
  app: string | null
  type: string
  raisedAs?: string
  status: string
  created: string
  resolved?: string
}) {
  db().exec(
    `INSERT INTO help (id, description, help_type, raised_as_type, status, resolved, app_id, account_id,
                       created_at, resolved_at, creator_id, creator_email, creator_name)
     VALUES ('${row.id}', 'Something is wrong', '${row.type}',
             ${row.raisedAs ? `'${row.raisedAs}'` : "NULL"},
             '${row.status}', ${row.status === "resolved" ? 1 : 0},
             ${row.app ? `'${row.app}'` : "NULL"}, '${IDS.victimAccount}',
             '${row.created}', ${row.resolved ? `'${row.resolved}'` : "NULL"},
             '${IDS.staffUser}', 'staff@kwapso.app', 'Staff');`
  )
}

/** A day, far enough back that "closed in the last ninety days" is a question
 * about the fixture rather than about the day the suite happens to run. */
const recently = (daysAgo: number) =>
  new Date(Date.now() - daysAgo * 86_400_000).toISOString()

beforeEach(() => {
  holder.db = buildSpineDb()
  // The fixture's own ticket carries no app and no type, so it sits in none of
  // these tallies either way. Cleared regardless: a suite about which tickets
  // are counted should not have a row in the table it never mentions.
  db().exec(`DELETE FROM help`)
  db().exec(
    `INSERT INTO apps (id, account_id, name, created_at, creator_id)
     VALUES ('${OTHER_APP}', '${IDS.victimAccount}', 'Delaval routing', '2026-02-01', '${IDS.staffUser}');`
  )

  // ── THE SYSTEM UNDER THE MICROSCOPE — Bergman dispatch ──────────────────
  // Two open (one of them unread and old enough to be past the triage line),
  // one recategorised on the way through triage, one closed recently.
  ticket({ id: "H_A1", app: IDS.victimApp, type: "Issue", raisedAs: "Issue", status: "new", created: recently(30) })
  ticket({ id: "H_A2", app: IDS.victimApp, type: "Request", raisedAs: "Issue", status: "triaged", created: recently(10) })
  ticket({
    id: "H_A3",
    app: IDS.victimApp,
    type: "Issue",
    raisedAs: "Issue",
    status: "resolved",
    created: recently(20),
    resolved: recently(15),
  })
  // No `raised_as_type` — the rows team migration 0065 refused to backfill, and
  // the number the matrix has to report separately rather than absorb.
  ticket({ id: "H_A4", app: IDS.victimApp, type: "Issue", status: "in_progress", created: recently(4) })

  // ── THE OTHER SYSTEM — every one of these must be absent when we ask about
  // Bergman dispatch, and present when we ask about nothing.
  ticket({ id: "H_B1", app: OTHER_APP, type: "Question", raisedAs: "Question", status: "new", created: recently(25) })
  ticket({ id: "H_B2", app: OTHER_APP, type: "Question", raisedAs: "Question", status: "triaged", created: recently(9) })
  ticket({
    id: "H_B3",
    app: OTHER_APP,
    type: "Question",
    raisedAs: "Question",
    status: "resolved",
    created: recently(12),
    resolved: recently(8),
  })
})

describe("the tickets dashboard narrows to one system", () => {
  // THE PREMISE, ASSERTED RATHER THAN ASSUMED. Every test below is a
  // subtraction, and a subtraction from nothing is nothing: if the unfiltered
  // read did not carry both systems, every "must not contain" assertion would
  // pass over an empty answer.
  it("carries both systems when nothing is asked", async () => {
    const all = await dashboard()
    const apps = new Set(all.openByApp.map((r) => r.appId))
    expect(apps, "the unfiltered dashboard must see Bergman dispatch").toContain(IDS.victimApp)
    expect(apps, "…and the other system, or nothing below proves anything").toContain(OTHER_APP)
    expect(all.openByTypeAndStatus.some((r) => r.helpType === "Question")).toBe(true)
  })

  it("the open-work pipeline counts only the app that was asked for", async () => {
    const mine = await dashboard(`?appId=${IDS.victimApp}`)
    // Bergman dispatch has no Questions at all, so the other system's three
    // tickets are the whole of that kind — its presence is the leak.
    expect(
      mine.openByTypeAndStatus.map((r) => r.helpType),
      "another system's tickets are in this app's pipeline"
    ).not.toContain("Question")
    // …and what IS there is exactly this app's own open work: one new Issue,
    // one triaged Request, one in-progress Issue. The resolved one is not open.
    const at = (type: string, status: string) =>
      mine.openByTypeAndStatus.find((r) => r.helpType === type && r.status === status)?.n ?? 0
    expect(at("Issue", "new")).toBe(1)
    expect(at("Request", "triaged")).toBe(1)
    expect(at("Issue", "in_progress")).toBe(1)
  })

  it("the per-system bars come back as one bar — this app's", async () => {
    const mine = await dashboard(`?appId=${IDS.victimApp}`)
    expect(new Set(mine.openByApp.map((r) => r.appId))).toEqual(new Set([IDS.victimApp]))
    // The panel that draws this is the first of the two the app's own dashboard
    // DROPS, and this is the arithmetic behind that judgement: inside one app it
    // is a single bar at 100% of a scale it sets itself.
    expect(new Set(mine.openByApp.map((r) => r.appName))).toEqual(new Set(["Bergman dispatch"]))
  })

  it("the closing-time distribution is taken over this app's closed tickets only", async () => {
    const mine = await dashboard(`?appId=${IDS.victimApp}`)
    // One closed Issue here; the other system closed a Question.
    expect(mine.closureDays.map((r) => r.helpType)).toEqual(["Issue"])
    expect(mine.closureDays[0]?.n).toBe(1)
  })

  it("the recategorisation matrix, and the rows it cannot speak for, are this app's", async () => {
    const mine = await dashboard(`?appId=${IDS.victimApp}`)
    expect(
      mine.raisedVsCurrent.some((r) => r.raisedAsType === "Question"),
      "the other system's tickets are in this app's matrix"
    ).toBe(false)
    // Issue→Issue twice (the open one and the closed one) and Issue→Request once.
    const cell = (from: string, to: string) =>
      mine.raisedVsCurrent.find((r) => r.raisedAsType === from && r.helpType === to)?.n ?? 0
    expect(cell("Issue", "Issue")).toBe(2)
    expect(cell("Issue", "Request")).toBe(1)
    // THE DENOMINATOR'S MISSING HALF NARROWS TOO. One unstamped row on this app,
    // none on the other — a count that ignored `appId` would report the team's,
    // which is a rate over a denominator quietly belonging to somebody else.
    expect(mine.raisedAsNotRecorded).toBe(1)
  })

  it("the count of unread work past the line is this app's, not the team's", async () => {
    const all = await dashboard()
    const mine = await dashboard(`?appId=${IDS.victimApp}`)
    // Two `new` tickets in the team, both old enough (30 and 25 days); one of
    // them is on this app. The chip on the app's dashboard must say one.
    expect(all.unopenedPastLine).toBe(2)
    expect(mine.unopenedPastLine).toBe(1)
  })

  it("an app nobody has raised anything about answers empty, not everything", async () => {
    // The failure this catches is the one a dropped filter produces MOST
    // visibly: a brand-new system whose dashboard shows the whole team's
    // backlog under its own name.
    const none = await dashboard(`?appId=AP_NOBODY`)
    expect(none.openByTypeAndStatus).toEqual([])
    expect(none.openByApp).toEqual([])
    expect(none.closureDays).toEqual([])
    expect(none.raisedVsCurrent).toEqual([])
    expect(none.raisedAsNotRecorded).toBe(0)
    expect(none.unopenedPastLine).toBe(0)
  })

  it("the system filter composes with the kind filter rather than replacing it", async () => {
    // Both are parameters of the same door and both land in the same WHERE, so
    // asking two questions must answer the intersection. A handler that read the
    // last one written would pass every test above.
    const both = await dashboard(`?appId=${IDS.victimApp}&helpType=Request`)
    expect(both.openByTypeAndStatus.map((r) => r.helpType)).toEqual(["Request"])
    expect(new Set(both.openByApp.map((r) => r.appId))).toEqual(new Set([IDS.victimApp]))
  })
})
