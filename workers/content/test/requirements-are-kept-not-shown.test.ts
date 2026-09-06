// REQUIREMENTS TICKETS: KEPT IN THE DATABASE, GONE FROM THE TICKETS EXPERIENCE.
//
// The client's ruling, 6 Sep 2026, in her own words: *"keep the existing
// requirements (we will use that later) but do not display them in tickets / i
// just want that you dont lose that data, because later we're moving them to
// another database"*. Nothing is converted, nothing is deleted, no migration
// rewrites a row's `help_type`. It is a READ-SIDE exclusion and a vocabulary
// change, and `TICKET_TYPE_KEPT_FOR_MIGRATION` in `shared/types.ts` is where the
// whole reasoning lives.
//
// WHY THIS SUITE RUNS THE DOORS RATHER THAN READING THEM. The exclusion is one
// clause on `ticketWhere`, which is the same expression the page, the two
// totals, the sub-tab badges and all eight dashboard reads are built from — so a
// source scan asserting "the clause is present" would pass on the day somebody
// adds a ninth read that builds its own WHERE, which is precisely the failure
// worth catching. And the failure has no visible edge: a dashboard counting
// hidden rows draws the same panels with bigger numbers, and nobody scans a
// chart against rows they can check.
//
// THE ASSERTION THAT MATTERS MOST IS THE ONE ABOUT AGREEMENT. Hiding rows from a
// list is easy; hiding them from every grouped `COUNT(*)` that describes that
// list is the part that goes wrong, and it goes wrong silently — every number
// true, none of them about the rows on screen (R16). So the tallies below are
// checked against the rows, not against a constant.

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
import { TICKET_TYPE_KEPT_FOR_MIGRATION } from "@shared/types"

const db = () => holder.db as DatabaseSync

function env(userId: string) {
  return {
    ...(makeEnv(() => db(), userId) as unknown as Record<string, unknown>),
    INTERNAL_KEY: "k",
    PUBLIC_APP_URL: "https://kwapso.example",
    REALTIME: { fetch: async () => new Response("{}") },
  } as never
}

async function door(path: string, init?: RequestInit): Promise<Response> {
  return worker.fetch(
    new Request(`https://content${path}`, {
      ...init,
      headers: { Cookie: "session=x", "Content-Type": "application/json", ...init?.headers },
    }),
    env(IDS.staffUser)
  )
}

/** The ticket list, exactly as the screen receives it — rows AND every number
 * that describes them, from the one door call the screen makes. */
type TicketList = {
  /** The rows key `pagedJson` writes for this door — `tickets`, not `rows`. */
  tickets: { id: string; helpType: string | null }[]
  total: number
  mineTotal: number
  byType: Record<string, number>
  byStatus: Record<string, number>
  byAccount: { accountId: string; open: number; total: number }[]
}

async function list(query = ""): Promise<TicketList> {
  const res = await door(`/api/content/help${query}`)
  expect(res.status, "the ticket list must answer staff").toBe(200)
  return (await res.json()) as TicketList
}

type Dashboard = {
  openByTypeAndStatus: { helpType: string; status: string; n: number }[]
  byAccountAndType: { accountId: string; helpType: string; open: number; total: number }[]
  closureDays: { helpType: string; n: number }[]
  raisedVsCurrent: { raisedAsType: string; helpType: string | null; n: number }[]
  openByApp: { appId: string | null; helpType: string; open: number; total: number }[]
  unopenedPastLine: number
}

async function dashboard(): Promise<Dashboard> {
  const res = await door("/api/content/help/dashboard")
  expect(res.status, "the dashboard door must answer staff").toBe(200)
  return (await res.json()) as Dashboard
}

type Triage = { waiting: { id: string }[]; total: number; yours: boolean }

async function triage(): Promise<Triage> {
  const res = await door("/api/content/triage")
  expect(res.status, "the triage door must answer staff").toBe(200)
  return (await res.json()) as Triage
}

/** One ticket, written straight into the team database.
 *
 * INSERTED RATHER THAN RAISED THROUGH THE DOOR, and here that is not merely
 * convenient — it is the only way to build the fixture at all. The create door
 * now REFUSES this kind (that refusal has its own test below), and these rows
 * are supposed to be the ones that were already there when the ruling came. A
 * row this suite could only make by a path the product no longer offers is
 * exactly the row the product now has to keep. */
function ticket(row: {
  id: string
  type: string | null
  status?: string
  created?: string
  resolved?: string
}) {
  const status = row.status ?? "new"
  db().exec(
    `INSERT INTO help (id, description, help_type, raised_as_type, status, resolved, app_id, account_id,
                       created_at, resolved_at, creator_id, creator_email, creator_name)
     VALUES ('${row.id}', 'Something is wrong', ${row.type ? `'${row.type}'` : "NULL"},
             ${row.type ? `'${row.type}'` : "NULL"},
             '${status}', ${status === "resolved" ? 1 : 0},
             '${IDS.victimApp}', '${IDS.victimAccount}',
             '${row.created ?? daysAgo(40)}', ${row.resolved ? `'${row.resolved}'` : "NULL"},
             '${IDS.staffUser}', 'staff@kwapso.app', 'Staff');`
  )
}

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString()

/** THE ROWS THIS SUITE IS ABOUT. Four kept-but-hidden tickets against four
 * ordinary ones, and the four hidden ones are spread across the lifecycle on
 * purpose: one open, one resolved (so the closing-time panels have something to
 * wrongly include), one sitting unread past the triage line, and one spelled the
 * way a person would type it rather than the way the seed did. */
const HIDDEN = ["H_REQ_OPEN", "H_REQ_DONE", "H_REQ_OLD", "H_REQ_TYPED"]
const SHOWN = ["H_ISSUE_OPEN", "H_ISSUE_DONE", "H_ISSUE_OLD", "H_UNTYPED"]

beforeEach(() => {
  holder.db = buildSpineDb()
  // The fixture ships a ticket of its own that this suite never mentions; a
  // suite about which rows are counted should not have one it did not place.
  db().exec(`DELETE FROM help`)

  ticket({ id: "H_REQ_OPEN", type: "Requirements", status: "in_progress", created: daysAgo(20) })
  ticket({ id: "H_REQ_DONE", type: "Requirements", status: "resolved", created: daysAgo(30), resolved: daysAgo(10) })
  ticket({ id: "H_REQ_OLD", type: "Requirements", status: "new", created: daysAgo(40) })
  // THE SAME KIND, SPELLED BY A HUMAN. `help_type` holds a team's own editable
  // word, so the test that recognises it has to survive a stray capital, a
  // trailing space and a dropped "s" — the identity test is the one this
  // codebase already uses for a ticket type (`ticketTypeWaitsForValidation`),
  // and this row is what proves the SQL half agrees with the TypeScript half.
  ticket({ id: "H_REQ_TYPED", type: " requirement ", status: "triaged", created: daysAgo(25) })

  ticket({ id: "H_ISSUE_OPEN", type: "Issue", status: "in_progress", created: daysAgo(20) })
  ticket({ id: "H_ISSUE_DONE", type: "Issue", status: "resolved", created: daysAgo(30), resolved: daysAgo(10) })
  ticket({ id: "H_ISSUE_OLD", type: "Issue", status: "new", created: daysAgo(40) })
  // A TICKET NOBODY HAS GIVEN A KIND. The one row that proves the exclusion did
  // not reach further than it was asked to: `NULL NOT IN (…)` is NULL, not true,
  // so a clause written without COALESCE would have swallowed every untyped
  // ticket in the app — including every one sitting in the triage queue
  // BECAUSE nobody has said what kind it is.
  ticket({ id: "H_UNTYPED", type: null, status: "new", created: daysAgo(40) })
})

describe("the tickets collection no longer contains them", () => {
  it("no kept-for-migration ticket is in the list", async () => {
    const r = await list()
    const ids = r.tickets.map((x) => x.id).sort()
    expect(ids, "the hidden kinds must not be among the rows").toEqual([...SHOWN].sort())
    for (const id of HIDDEN) expect(ids).not.toContain(id)
  })

  it("and every number describing the list agrees with the rows", async () => {
    const r = await list()
    // THE WHOLE POINT OF EXCLUDING AT THE DOOR. Each of these is a separate
    // grouped COUNT(*) taken by the database, not a length of what came back,
    // so agreement here is a real fact about four statements rather than one.
    expect(r.total, "the All badge must count the rows it can show").toBe(r.tickets.length)
    expect(
      Object.values(r.byStatus).reduce((a, b) => a + b, 0),
      "the stage tallies must add up to the same collection"
    ).toBe(r.tickets.length)
    expect(
      Object.values(r.byType).reduce((a, b) => a + b, 0),
      "the kind tallies must add up to the collection minus the one ticket with no kind"
    ).toBe(r.tickets.length - 1)
    expect(r.byAccount.reduce((a, b) => a + b.total, 0)).toBe(r.tickets.length)
  })

  it("the sub-tab strip has no badge for the kept kind, under any spelling", async () => {
    const r = await list()
    for (const word of Object.keys(r.byType)) {
      expect(
        word.trim().toLowerCase().replace(/s$/, ""),
        `"${word}" should not have a tab on the tickets screen any more`
      ).not.toBe("requirement")
    }
    expect(r.byType).toEqual({ Issue: 3 })
  })

  it("asking for the kind by name returns nothing rather than everything", async () => {
    // A filter naming a hidden kind narrows to rows the door has already
    // excluded — an empty page, and an empty page's badge, rather than a hole
    // in the exclusion that a hand-typed query string walks through.
    const r = await list(`?helpType=${encodeURIComponent(TICKET_TYPE_KEPT_FOR_MIGRATION)}`)
    expect(r.tickets).toEqual([])
    expect(r.total, "and the badge must agree with the empty page").toBe(0)
  })
})

describe("the dashboard's panels are drawn over the same collection", () => {
  it("no panel names the kept kind", async () => {
    const d = await dashboard()
    const named = [
      ...d.openByTypeAndStatus.map((r) => r.helpType),
      ...d.byAccountAndType.map((r) => r.helpType),
      ...d.closureDays.map((r) => r.helpType),
      ...d.openByApp.map((r) => r.helpType),
    ]
    expect(named.length, "the fixture must give the panels something to draw").toBeGreaterThan(0)
    for (const word of named) {
      expect(
        word.trim().toLowerCase().replace(/s$/, ""),
        "a panel is still drawing the kind the client retired"
      ).not.toBe("requirement")
    }
  })

  it("and the panels' own totals match the list they claim to describe", async () => {
    const [d, r] = await Promise.all([dashboard(), list()])
    const open = r.tickets.length - 1 // one of the shown tickets is resolved
    expect(
      d.openByTypeAndStatus.reduce((a, b) => a + b.n, 0),
      "the pipeline must count the open tickets the list can show"
    ).toBe(open - 1) // …and one of those has no kind, so it has no bar
    expect(d.openByApp.reduce((a, b) => a + b.open, 0)).toBe(open - 1)
    // The unopened-past-the-line number is the dashboard's copy of the triage
    // queue's length, so the two must exclude identically or the screen and the
    // queue disagree about the same fact.
    const q = await triage()
    expect(d.unopenedPastLine, "the dashboard and the triage queue count one thing").toBe(q.total)
  })
})

describe("the triage queue", () => {
  it("does not offer a kept-for-migration ticket to be triaged", async () => {
    const q = await triage()
    expect(q.yours, "the fixture's staff user must be able to see the queue").toBe(true)
    const ids = q.waiting.map((w) => w.id).sort()
    expect(ids, "H_REQ_OLD is old and unread and must still not be here").toEqual(
      ["H_ISSUE_OLD", "H_UNTYPED"].sort()
    )
  })

  it("and its count agrees with its cards", async () => {
    const q = await triage()
    expect(q.total, "a queue of two under a badge of three is the R16 failure").toBe(q.waiting.length)
  })
})

describe("the data is kept, and stays reachable", () => {
  it("a kept-for-migration ticket still opens by its own id", async () => {
    // THE HALF THE CLIENT ASKED FOR. These rows are being preserved to be moved
    // into another database, so they must remain READABLE — hidden from the
    // collection is not the same sentence as gone.
    for (const id of HIDDEN) {
      const res = await door(`/api/content/help?id=${id}`)
      expect(res.status).toBe(200)
      const body = (await res.json()) as TicketList
      expect(body.tickets.map((r) => r.id), `${id} must still open by id`).toEqual([id])
    }
  })

  it("and the rows are still in the database, still saying their own word", async () => {
    // Nothing above may be a delete or a rewrite in disguise. Read straight off
    // the table, past every door, because that is the promise: the word on the
    // row is untouched.
    const kept = db()
      .prepare(`SELECT id, help_type FROM help WHERE id IN ('H_REQ_OPEN','H_REQ_DONE','H_REQ_OLD')`)
      .all() as { id: string; help_type: string }[]
    expect(kept.length, "not one row may have been deleted").toBe(3)
    for (const row of kept) expect(row.help_type).toBe("Requirements")
  })
})

describe("no new one can be raised", () => {
  async function raise(helpType: string) {
    return door("/api/content/help", {
      method: "POST",
      body: JSON.stringify({ description: "Please add a field", helpType }),
    })
  }

  it("the door refuses the retired kind", async () => {
    const res = await raise(TICKET_TYPE_KEPT_FOR_MIGRATION)
    expect(res.status, "a picker cannot be trusted to withhold it — the door must").toBe(400)
    const body = (await res.json()) as { error?: string }
    expect(body.error).toBe("retired_ticket_type")
  })

  it("under any spelling a person might type", async () => {
    for (const spelling of ["requirements", " Requirement ", "REQUIREMENTS"]) {
      const res = await raise(spelling)
      expect(res.status, `"${spelling}" must be refused too`).toBe(400)
    }
  })

  it("but an ordinary kind is unaffected", async () => {
    const res = await raise("Issue")
    expect(res.status, "the rest of the vocabulary must still work").toBe(200)
    const after = await list()
    expect(after.tickets.length).toBe(SHOWN.length + 1)
    expect(after.total, "and the badge moves with it").toBe(after.tickets.length)
  })

  it("recategorising a visible ticket INTO the retired kind is refused", async () => {
    const res = await door("/api/content/help/update", {
      method: "POST",
      body: JSON.stringify({
        id: "H_ISSUE_OPEN",
        description: "Something is wrong",
        helpType: TICKET_TYPE_KEPT_FOR_MIGRATION,
      }),
    })
    expect(res.status).toBe(400)
    const still = db().prepare(`SELECT help_type FROM help WHERE id='H_ISSUE_OPEN'`).get() as {
      help_type: string
    }
    expect(still.help_type, "and the refusal must not have half-written the row").toBe("Issue")
  })

  it("but editing a KEPT ticket, which posts its own type back, still saves", async () => {
    // Hiding a collection is not freezing a record. These rows stay editable
    // right up to the day they are migrated, so an edit that leaves the type
    // where it already is has to pass — otherwise the refusal above would have
    // quietly made every preserved ticket read-only.
    const res = await door("/api/content/help/update", {
      method: "POST",
      body: JSON.stringify({
        id: "H_REQ_OPEN",
        description: "Now with more detail",
        helpType: "Requirements",
      }),
    })
    expect(res.status, "a preserved ticket must still be editable").toBe(200)
    const row = db().prepare(`SELECT description, help_type FROM help WHERE id='H_REQ_OPEN'`).get() as {
      description: string
      help_type: string
    }
    expect(row.description).toBe("Now with more detail")
    expect(row.help_type).toBe("Requirements")
  })
})

describe("the set-shaped bulk move", () => {
  it("neither counts nor touches a kept-for-migration ticket", async () => {
    // The one WRITE that takes a FILTER rather than ids, so it inherits the
    // collection's definition — and the number it counts is the number a person
    // APPROVES in a confirm panel, which makes it R16's sentence about a badge
    // said about a confirmation.
    const before = statuses()
    const res = await door("/api/content/help/bulk-status-by-filter", {
      method: "POST",
      body: JSON.stringify({ toStatus: "triaged", dryRun: false }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { matched: number; changed: number }
    // THE NUMBER A PERSON APPROVES. Two of the four visible tickets are not
    // already triaged, and neither is the untyped one — the three hidden rows
    // that would otherwise have qualified must be in neither the count nor the
    // move.
    expect(body.matched, "the confirm must state a number about the visible list").toBe(body.changed)
    expect(statuses(), "not one hidden row may have moved").toMatchObject(
      Object.fromEntries(HIDDEN.map((id) => [id, before[id]]))
    )
  })

  /** Every hidden ticket's status, straight off the table. */
  function statuses(): Record<string, string> {
    const rows = db()
      .prepare(`SELECT id, status FROM help WHERE id IN (${HIDDEN.map((i) => `'${i}'`).join(",")})`)
      .all() as { id: string; status: string }[]
    return Object.fromEntries(rows.map((r) => [r.id, r.status]))
  }
})
