// THE TICKETS DASHBOARD, ASKED ABOUT A WORD — AND ASKED THE SAME QUESTION THE
// LIST TAB IS ASKED, ONE TAB AWAY.
//
// The Dashboard tab grew a search box on 7 Sep 2026, after the client said it
// twice ("on the dashboard, I'm missing the full toolbar", then "still missing
// full toolbar!"). Sort is absent by her own earlier ruling on that row, so the
// box was the one control a sibling ticket tab carried that this one did not.
//
// THE TERM IS A DOOR PARAMETER, `q`, exactly as `accountId`, `helpType` and
// `appId` already are, and for the reason those three are: there are no rows on
// that tab for a browser to sieve. Every number on it is a COUNT(*) or a
// quantile the database took, so narrowing means taking the counts again over a
// smaller WHERE — a box that did not reach the door would change nothing at all
// on screen while looking exactly like a working search.
//
// ── WHAT THIS SUITE IS ACTUALLY FOR ────────────────────────────────────────
//
// Two failures, and the second is the one worth building a fixture for.
//
// FIRST, THE ORDINARY ONE: the parameter is parsed and never spent, or spent in
// some of the nine grouped reads and not the others. Each read builds its own
// statement around one shared `fenced` string, so a term can be dropped from one
// panel while the other eight narrow correctly, and nobody reading a chart could
// tell. So every panel is asserted separately, the way the `appId` suite beside
// this one already does.
//
// SECOND, AND THE REASON THIS FILE IS NAMED WHAT IT IS: two boxes on one screen
// must not answer one question two ways. The list tab searches the same tickets
// through `GET /api/content/help?q=`, and if the dashboard ever grew a matcher
// of its own — a second set of columns, a prefix instead of a substring, a
// case-sensitive comparison — a manager could type a client's word into one tab
// and get eleven tickets, type it into the other and get a picture of four. The
// defence is that neither box owns a matcher: both terms reach `searchClause`
// inside `ticketWhere`. That is a claim about the SOURCE, so it is proved here
// by RUNNING both doors over one database and requiring the same tickets, which
// is a claim about the answer.
//
// It drives the shipped worker against a real SQLite database running the real
// team migrations, exactly as its sibling suites do.

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

/** THE WORD EVERY ASSERTION HERE TURNS ON. Deliberately a word that appears in
 * the MIDDLE of a description and in no reference and no title, so a matcher
 * that anchored at the start, or looked only at the title, would fail rather
 * than pass by accident. */
const TERM = "invoice"

function env(userId: string) {
  return {
    ...(makeEnv(() => db(), userId) as unknown as Record<string, unknown>),
    INTERNAL_KEY: "k",
    PUBLIC_APP_URL: "https://kwapso.example",
    REALTIME: { fetch: async () => new Response("{}") },
  } as never
}

async function door(path: string): Promise<Response> {
  return worker.fetch(
    new Request(`https://content${path}`, { headers: { Cookie: "session=x" } }),
    env(IDS.staffUser)
  )
}

/** Only the shape this suite reads. Deliberately NOT the door's own exported
 * type — a test that imports the type it is checking keeps agreeing with a
 * response that has quietly changed shape. */
type Dashboard = {
  openByTypeAndStatus: { helpType: string; status: string; n: number }[]
  byAccountAndType: { accountId: string; helpType: string; open: number; total: number }[]
  closureDays: { helpType: string; n: number }[]
  closureTrend: { helpType: string; month: string; n: number }[]
  raisedVsCurrent: { raisedAsType: string; helpType: string | null; n: number }[]
  raisedAsNotRecorded: number
  openByApp: { appId: string | null; helpType: string; open: number; total: number }[]
  unopenedPastLine: number
  matched: number
}

async function dashboard(query = ""): Promise<Dashboard> {
  const res = await door(`/api/content/help/dashboard${query}`)
  expect(res.status, "the dashboard door must answer staff").toBe(200)
  return (await res.json()) as Dashboard
}

/** The LIST door's own answer to the same question, so the two can be compared
 * as ANSWERS rather than as source code. */
async function listIds(query = ""): Promise<string[]> {
  const res = await door(`/api/content/help${query}`)
  expect(res.status, "the ticket list must answer staff").toBe(200)
  const body = (await res.json()) as { tickets: { id: string }[] }
  return body.tickets.map((t) => t.id).sort()
}

/** One ticket, written straight into the team database.
 *
 * INSERTED RATHER THAN RAISED, the same reasoning the `appId` suite gives: this
 * fixture needs tickets that are already closed, already old and already
 * stamped with what they arrived as, and the create door sets all three from
 * the clock. It also needs one row of a kind the create door now REFUSES. */
function ticket(row: {
  id: string
  description: string
  type: string
  raisedAs?: string
  status: string
  app?: string | null
  created: string
  resolved?: string
  /** THE READER-FACING NUMBER, and one fixture row carries a real one on
   * purpose: `searchClause` matches the reference as well as the description
   * and the title, and a fixture where every `ref` is NULL would let a matcher
   * that had quietly dropped that column pass. */
  ref?: string
}) {
  db().exec(
    `INSERT INTO help (id, ref, description, help_type, raised_as_type, status, resolved, app_id, account_id,
                       created_at, resolved_at, creator_id, creator_email, creator_name)
     VALUES ('${row.id}', ${row.ref ? `'${row.ref}'` : "NULL"}, '${row.description}', '${row.type}',
             ${row.raisedAs ? `'${row.raisedAs}'` : "NULL"},
             '${row.status}', ${row.status === "resolved" ? 1 : 0},
             ${row.app ? `'${row.app}'` : "NULL"}, '${IDS.victimAccount}',
             '${row.created}', ${row.resolved ? `'${row.resolved}'` : "NULL"},
             '${IDS.staffUser}', 'staff@kwapso.app', 'Staff');`
  )
}

const recently = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString()

beforeEach(() => {
  holder.db = buildSpineDb()
  db().exec(`DELETE FROM help`)

  // ── THE TICKETS THAT MENTION THE WORD ───────────────────────────────────
  // Spread across kinds, stages and both halves of the closed/open line, so
  // every panel on the dashboard has something of its own to count.
  ticket({
    id: "H_Q1",
    description: "The invoice total is wrong on the export",
    type: "Issue",
    raisedAs: "Issue",
    status: "new",
    app: IDS.victimApp,
    created: recently(30),
  })
  ticket({
    id: "H_Q2",
    description: "Can we add an invoice column to the list?",
    type: "Request",
    raisedAs: "Issue",
    status: "triaged",
    app: IDS.victimApp,
    created: recently(10),
  })
  ticket({
    id: "H_Q3",
    description: "Invoice PDF would not open",
    type: "Issue",
    raisedAs: "Issue",
    status: "resolved",
    app: IDS.victimApp,
    created: recently(20),
    resolved: recently(15),
  })
  // Mentions the word and has NO record of what it arrived as — the matrix's
  // separately-counted half (team migration 0065 refused to backfill it).
  ticket({
    id: "H_Q4",
    description: "Invoice numbering restarted",
    type: "Issue",
    status: "in_progress",
    app: IDS.victimApp,
    created: recently(4),
  })

  // ── THE TICKETS THAT DO NOT ─────────────────────────────────────────────
  // Every one of these must be absent once the word is asked, and present when
  // nothing is. Without them every "must not contain" below would pass over an
  // empty answer.
  ticket({
    id: "H_N1",
    description: "The dispatch board is slow in the morning",
    type: "Question",
    raisedAs: "Question",
    status: "new",
    app: IDS.victimApp,
    created: recently(25),
  })
  ticket({
    id: "H_N2",
    // THE ONE ROW WITH A REFERENCE. It deliberately does NOT mention the term,
    // so the two searches below are independent: the word finds the four that
    // say it, and the reference finds this one and only this one.
    ref: "TCK-0000042",
    description: "Please add a dark theme",
    type: "Question",
    raisedAs: "Question",
    status: "triaged",
    app: IDS.victimApp,
    created: recently(9),
  })
  ticket({
    id: "H_N3",
    description: "Login was down for an hour",
    type: "Question",
    raisedAs: "Question",
    status: "resolved",
    app: IDS.victimApp,
    created: recently(12),
    resolved: recently(8),
  })
})

describe("the tickets dashboard searches, and searches the same way the list does", () => {
  // THE PREMISE, ASSERTED RATHER THAN ASSUMED. Every test below is a
  // subtraction, and a subtraction from nothing is nothing.
  it("carries both sets of tickets when no word is asked", async () => {
    const all = await dashboard()
    expect(all.matched, "the unfiltered dashboard must see the whole fixture").toBe(7)
    expect(all.openByTypeAndStatus.some((r) => r.helpType === "Question")).toBe(true)
    expect(all.openByTypeAndStatus.some((r) => r.helpType === "Issue")).toBe(true)
  })

  it("the term reaches the door: every panel narrows to the tickets that mention it", async () => {
    const found = await dashboard(`?q=${TERM}`)

    // 1B — the pipeline. None of the four matching tickets is a Question, so
    // the presence of that kind IS the leak.
    expect(
      found.openByTypeAndStatus.map((r) => r.helpType),
      "a ticket that never mentions the word is in this pipeline"
    ).not.toContain("Question")
    const at = (type: string, status: string) =>
      found.openByTypeAndStatus.find((r) => r.helpType === type && r.status === status)?.n ?? 0
    expect(at("Issue", "new")).toBe(1)
    expect(at("Request", "triaged")).toBe(1)
    expect(at("Issue", "in_progress")).toBe(1)

    // 2B — who has more. One client in this fixture, so the CHECK is the tally
    // rather than the ranking: four matching tickets, three of them still open.
    const mine = found.byAccountAndType.filter((r) => r.accountId === IDS.victimAccount)
    expect(mine.reduce((n, r) => n + r.total, 0)).toBe(4)
    expect(mine.reduce((n, r) => n + r.open, 0)).toBe(3)

    // 3A — the closing-time distribution. One closed ticket mentions the word
    // and it is an Issue; the closed Question must not be in it.
    expect(found.closureDays.map((r) => r.helpType)).toEqual(["Issue"])
    expect(found.closureDays[0]?.n).toBe(1)

    // 5A — the matrix, and the denominator's missing half. Issue→Issue twice
    // (the open one and the closed one), Issue→Request once, and exactly one
    // unstamped row. A count that ignored the term would report the fixture's.
    expect(
      found.raisedVsCurrent.some((r) => r.raisedAsType === "Question"),
      "a ticket that never mentions the word is in this matrix"
    ).toBe(false)
    const cell = (from: string, to: string) =>
      found.raisedVsCurrent.find((r) => r.raisedAsType === from && r.helpType === to)?.n ?? 0
    expect(cell("Issue", "Issue")).toBe(2)
    expect(cell("Issue", "Request")).toBe(1)
    expect(found.raisedAsNotRecorded).toBe(1)

    // 6A — the per-system bars, split by kind. Same subtraction, one panel over.
    expect(found.openByApp.map((r) => r.helpType)).not.toContain("Question")
    expect(found.openByApp.reduce((n, r) => n + r.open, 0)).toBe(3)

    // The one number about US. Two `new` tickets in the fixture are old enough
    // to be past the line; only one of them mentions the word.
    const all = await dashboard()
    expect(all.unopenedPastLine).toBe(2)
    expect(found.unopenedPastLine).toBe(1)
  })

  it("the term finds the same tickets here as it does on the list tab", async () => {
    // THE CLAIM THIS WHOLE FILE IS NAMED FOR, proved as an ANSWER rather than as
    // a shared function name. `matched` is the door's own count of the rows
    // every panel above was grouped over, so it is directly comparable to the
    // list's own page of ids under the identical question.
    const found = await dashboard(`?q=${TERM}`)
    const rows = await listIds(`?q=${TERM}`)
    expect(rows, "the list finds the four tickets that mention the word").toEqual([
      "H_Q1",
      "H_Q2",
      "H_Q3",
      "H_Q4",
    ])
    expect(
      found.matched,
      "the dashboard drew over a different population than the list showed"
    ).toBe(rows.length)
  })

  it("the matching is the LIST's matching — the same columns and the same case", async () => {
    // Three properties of `searchClause`, each of which a hand-written second
    // matcher would plausibly get wrong, asserted through both doors so the two
    // cannot drift apart in only one of them.
    for (const asked of [
      // Case, in both directions: "Invoice" leads two descriptions and
      // "invoice" sits inside two others.
      "INVOICE",
      // A substring in the middle of a word rather than a whole word.
      "nvoic",
      // The reference, which no description contains — proof the search reads
      // more than `description`.
      "0000042",
    ]) {
      const found = await dashboard(`?q=${asked}`)
      const rows = await listIds(`?q=${asked}`)
      expect(found.matched, `the two doors disagree about "${asked}"`).toBe(rows.length)
    }
    // …AND NOT VACUOUSLY. Each of the three above must actually FIND something,
    // or "the two doors agree" is a sentence about two zeroes — which is what
    // this assertion existed as before the fixture carried a real reference.
    expect((await dashboard("?q=INVOICE")).matched).toBe(4)
    expect((await dashboard("?q=nvoic")).matched).toBe(4)
    expect((await dashboard("?q=0000042")).matched).toBe(1)
  })

  it("a word nothing mentions answers empty, and SAYS it found nothing", async () => {
    // The failure a dropped filter produces most visibly is the opposite of
    // this: a searched dashboard drawing the whole backlog. And the failure a
    // present filter produces is this one drawn as six blank panels with no
    // sentence — which is what `matched` exists to let the screen replace with
    // one sentence.
    const none = await dashboard("?q=zzzznothing")
    expect(none.matched).toBe(0)
    expect(none.openByTypeAndStatus).toEqual([])
    expect(none.byAccountAndType).toEqual([])
    expect(none.closureDays).toEqual([])
    expect(none.closureTrend).toEqual([])
    expect(none.raisedVsCurrent).toEqual([])
    expect(none.raisedAsNotRecorded).toBe(0)
    expect(none.openByApp).toEqual([])
    expect(none.unopenedPastLine).toBe(0)
    expect(await listIds("?q=zzzznothing")).toEqual([])
  })

  it("the term composes with the other three narrowings rather than replacing one", async () => {
    // All four are parameters of the same door landing in the same WHERE, so
    // asking two questions must answer the intersection. A handler that read
    // the last parameter written would pass every test above.
    const both = await dashboard(`?q=${TERM}&helpType=Request`)
    expect(both.matched).toBe(1)
    expect(both.openByTypeAndStatus.map((r) => r.helpType)).toEqual(["Request"])

    const withApp = await dashboard(`?q=${TERM}&appId=${IDS.victimApp}`)
    expect(withApp.matched, "the app-scoped dashboard still searches").toBe(4)

    const elsewhere = await dashboard(`?q=${TERM}&appId=AP_NOBODY`)
    expect(elsewhere.matched, "a system with none of these tickets must answer empty").toBe(0)
  })

  it("REQUIREMENTS TICKETS STAY HIDDEN, term or no term", async () => {
    // The kind kept for a migration is subtracted FIRST and unconditionally in
    // `ticketWhere`, before any facet — but "unconditionally" is a property of
    // one function, and a search that had grown its own WHERE would be exactly
    // the place that subtraction stopped applying. So it is asserted here
    // alongside the term rather than only in its own suite: a row nobody may
    // see must not become visible because somebody typed its own words.
    ticket({
      id: "H_REQ",
      description: "Invoice requirements for the migration",
      type: "Requirements",
      raisedAs: "Requirements",
      status: "new",
      app: IDS.victimApp,
      created: recently(40),
    })

    const found = await dashboard(`?q=${TERM}`)
    expect(found.matched, "a Requirements ticket was counted into a searched dashboard").toBe(4)
    expect(found.raisedVsCurrent.map((r) => r.raisedAsType)).not.toContain("Requirements")
    expect(found.openByTypeAndStatus.map((r) => r.helpType)).not.toContain("Requirements")
    expect(found.openByApp.map((r) => r.helpType)).not.toContain("Requirements")
    // …and the term does not reach it through the list either, which is the
    // same sentence read from the other door.
    expect(await listIds(`?q=${TERM}`)).not.toContain("H_REQ")
    // Searching for the WORD ITSELF finds nothing, which is the sharper form of
    // the same claim: the exclusion is not a filter the term can outrank.
    expect((await dashboard("?q=requirements")).matched).toBe(0)
  })
})
