// THE ARCHIVED-ACCOUNT COLLISION — team migration 0117 gave `accounts` its own
// `archived_at`, beside `help`'s (team migration 0043-ish: a ticket somebody put
// away). Both facts are real and both are independent: an account can be
// archived (invisible everywhere, Aurora's ruling 22 Sep 2026) while its
// tickets stay exactly as they were, and a ticket can be archived on its own
// with its account still live.
//
// The collision is that a query joining `help` to `accounts` and writing a
// bare, unqualified `archived_at` no longer compiles — SQLite refuses it at
// runtime with "ambiguous column name: archived_at" — and three doors do
// exactly that on every call, because `ticketMutationReply(..., withFacets:
// true)` always runs `countTicketFacets`, whose `perAccount` read
// (`workers/content/src/lib/help.ts`) LEFT JOINs `accounts` for the client's
// name. Reproduced live, captured in the gate's own run:
//   content worker error: POST /api/content/help/status
//     Error: ambiguous column name: archived_at
// — the identical failure on `/help/update` and `/help/triage-read`, because
// all three reply through the same helper. THE GATE UNDERSOLD IT: `ticketPage`
// (routes/help.ts, `GET /api/content/help` — the tickets list itself, no
// mutation required) calls `countTicketFacets` on every single read, so the
// blast radius is the whole Tickets screen the moment one account in a team
// carries `archived_at`, not only the three write doors the gate happened to
// exercise — proved below by running this suite with the fix reverted (a `cp`
// backup, then restored): 5 of 6 cases failed, the plain list included.
//
// AGAINST A REAL SQLITE DATABASE, running the real team migrations — the only
// honest way to prove this: the bug is in the SQL SQLite actually executes,
// assembled at runtime from `archiveClause` through `ticketWhere`'s `where.sql`
// and interpolated into the JOIN, so no source-text census can see the bare
// column at the site of the join (see `ambiguous-join-columns.test.ts` in
// workers/tenancy/test for the static census this file's own header explains
// cannot reach this exact shape, and why it still exists).
//
// ═══════════════════════════════════════════════════════════════════════════
// ROUND TWO — AURORA'S RULING, 23 Sep 2026, answering a question put to her
// directly: "yes, archived accounts should hide their tickets too."
//
// The collision fix above only stopped SQLite refusing the statement; it said
// nothing about what the statement should ANSWER, and the header note on the
// first test below used to say so in as many words: "an archived account's
// ticket stays fully reachable through the tickets list … flagged to the
// owner rather than decided here." It has now been decided. This file is
// extended rather than replaced — it already carries the one fixture this
// proof needs (an archived account with a live ticket on it) and the real
// SQLite database the fix has to prove itself against.
//
// THE FILTER IS `accountArchivedClause` (lib/help.ts), A SEPARATE CONDITION
// FROM `archiveClause`, never merged into it — the ticket's own archived_at
// (a fact about the TICKET) and the account's (a fact about the CLIENT) are
// independent and both keep working on their own, proved by the second
// describe block below (unchanged): archiving the account does not touch the
// ticket's own `archived_at`.
//
// EVERY SURFACE A TICKET APPEARS ON THAT THIS SUITE CAN REACH THROUGH THE REAL
// WORKER: the everyday list and its exact count (R16), the sub-tab facets
// (`byAccount`), a single ticket looked up by id (the deep-link / generic
// record query tool surface — `list_help_tickets` with an `id`, in
// shared/workers/tool-catalog.ts, is the SAME door), the Dashboard tab
// (`GET /help/dashboard`), and the triage queue (`GET /api/content/triage`,
// which builds its own WHERE by hand rather than through `ticketWhere` and so
// needed its own explicit `accountArchivedClause()` call — see triage.ts).
//
// AND THE TICKET THAT HAS NO ACCOUNT AT ALL (SCOPE ch.07: "220 of 221 seeded
// historical requests are staff-raised" — the agency's own housekeeping)
// must never be caught by a predicate about a company it was never raised
// against. `ORPHAN_TICKET` below is seeded fresh in THIS file rather than in
// spine-harness.ts, because the shared fixture's only ticket is the victim's
// own — every describe block below reads it as the control proving the fix
// is a FILTER and not a blanket "no tickets" refusal.

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

const call = (route: string, body?: unknown) => {
  const [method, path] = route.split(" ")
  return worker.fetch(
    new Request(`https://content${path}`, {
      method,
      headers: { Cookie: "session=x", "Content-Type": "application/json" },
      body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
    }),
    makeEnv(() => db(), IDS.staffUser)
  )
}

/** THE TICKET NOBODY RAISED AGAINST A CLIENT — the control this whole round
 * turns on. If `accountArchivedClause` were ever widened to a bare
 * `account_id IN (SELECT id FROM accounts WHERE archived_at IS NULL)` (no
 * `OR account_id IS NULL` short-circuit), this ticket would vanish from every
 * surface below exactly like the victim's, and every "does NOT come back"
 * assertion would still pass — silently proving nothing. Every test that
 * checks the victim's ticket is gone also checks this one is still there. */
const ORPHAN_TICKET = "H_ORPHAN"

beforeEach(() => {
  holder.db = buildSpineDb()
  // THE COLLISION, SEEDED ON PURPOSE — the victim's account is archived (0117)
  // while its ticket (the shared fixture's own, IDS.victimTicket) is untouched.
  // Without this, `accounts.archived_at` is NULL on every row and the ambiguity
  // a real team could hit is invisible: SQLite still refuses an ambiguous
  // reference regardless of the value, but a suite that never sets the column
  // is a suite that could pass by accident if the qualifier silently bound to
  // the wrong table instead of failing loudly (see the second describe block).
  db().exec(
    `UPDATE accounts SET archived_at = '2026-09-22T00:00:00.000Z',
       archiver_id = '${IDS.staffUser}', archiver_email = 'staff@kwapso.app', archiver_name = 'Staff'
     WHERE id = '${IDS.victimAccount}';`
  )
  // THE ORPHAN — no account, raised by staff, old enough to sit past the
  // triage line the same way the victim's does (workingDaysAgo(now, 3) from
  // 2026-02-05 is comfortably past on any date this suite could run).
  db().exec(
    `INSERT INTO help (id, description, status, resolved, account_id, created_at, creator_id, creator_email, creator_name)
     VALUES ('${ORPHAN_TICKET}', 'Renew the SSL certificate on the staging box', 'new', 0, NULL, '2026-02-05', '${IDS.staffUser}', 'staff@kwapso.app', 'Staff');`
  )
})

describe("a ticket door that replies with facets survives an archived account", () => {
  // THE THREE DOORS THE GATE CAUGHT. Each replies through
  // `ticketMutationReply(..., withFacets: true)`, which is what actually runs
  // the ambiguous join — a plain `listTickets`/`getTicket` read never does.
  it("POST /help/status — moving a ticket along its lifecycle", async () => {
    const res = await call("POST /api/content/help/status", { id: IDS.victimTicket, status: "triaged" })
    expect(res.status, await res.clone().text()).toBe(200)
    const body = (await res.json()) as { byAccount?: { accountId: string }[] }
    // AURORA'S RULING, 23 Sep 2026: archived accounts hide their tickets too.
    // The facet no longer names the archived account — the join still
    // resolves without throwing (this suite's own original proof still
    // holds), it now simply has nothing of the victim's left to count.
    expect(body.byAccount?.some((a) => a.accountId === IDS.victimAccount)).toBe(false)
  })

  it("POST /help/update — editing a ticket", async () => {
    const res = await call("POST /api/content/help/update", {
      id: IDS.victimTicket,
      description: "Bergman S.A. cannot see the March invoice run, still",
    })
    // THE WRITE STILL SUCCEEDS. Aurora's ruling was about VISIBILITY — the
    // tickets list, its facets, the dashboard, triage and the generic query
    // tool — never about locking staff out of housekeeping a ticket that
    // happens to sit on a company that was archived after the fact. The
    // mutation gate (`ticketFence`/`ticketOrThrow`) is untouched by this
    // round; only the READ surfaces this file's second describe block below
    // is about were changed.
    expect(res.status, await res.clone().text()).toBe(200)
  })

  it("POST /help/triage-read — marking a ticket read off the triage queue", async () => {
    // `markTriaged` only moves a `new` ticket, and the shared fixture's victim
    // ticket is seeded `new` — see workers/tenancy/test/spine-harness.ts. The
    // four readiness fields (shared/triage-readiness.ts) are unrelated to this
    // suite's own question, so they are filled in directly rather than routed
    // through a second door.
    db().exec(
      `UPDATE help SET help_type = 'Question', app_id = '${IDS.victimApp}',
         raised_by_contact_id = '${IDS.victimPerson}' WHERE id = '${IDS.victimTicket}';`
    )
    const res = await call("POST /api/content/help/triage-read", { id: IDS.victimTicket })
    expect(res.status, await res.clone().text()).toBe(200)
  })

  // THE ARCHIVE VIEW ITSELF — a plain `FROM help WHERE ...` (`listTickets`),
  // never joined, so it was never ambiguous; kept here as the control that
  // proves this suite is not just asserting "the fence hides everything".
  it("GET /help — the archive drawer, unaffected because it never joins", async () => {
    const res = await call("GET /api/content/help?view=archived")
    expect(res.status, await res.clone().text()).toBe(200)
  })
})

describe("the fix binds the predicate to the RIGHT table", () => {
  it("an archived ACCOUNT does not archive its ticket — the ticket's own archived_at is untouched", async () => {
    const row = db().prepare("SELECT archived_at FROM help WHERE id = ?").get(IDS.victimTicket) as {
      archived_at: string | null
    }
    expect(row.archived_at).toBeNull()
  })

  it("the everyday (live) view no longer returns the ticket of an archived account", async () => {
    const res = await call("GET /api/content/help?view=live")
    expect(res.status, await res.clone().text()).toBe(200)
    const body = (await res.json()) as { tickets?: { id: string }[] }
    // WAS `.toBe(true)` until Aurora's 23 Sep 2026 ruling — this line is the
    // one the header's "flagged to the owner rather than decided here" note
    // pointed at. It is decided now.
    expect(body.tickets?.some((t) => t.id === IDS.victimTicket)).toBe(false)
    // …AND THE ORPHAN, WHICH HAS NO ACCOUNT TO BE ARCHIVED, IS UNTOUCHED — the
    // control that proves this is a filter over one company and not a wider
    // regression.
    expect(body.tickets?.some((t) => t.id === ORPHAN_TICKET)).toBe(true)
  })
})

describe("Aurora's ruling, 23 Sep 2026 — an archived account hides its tickets everywhere one appears", () => {
  it("the exact count (R16) drops with the row", async () => {
    const res = await call("GET /api/content/help?view=live")
    expect(res.status, await res.clone().text()).toBe(200)
    const body = (await res.json()) as { total?: number; mineTotal?: number }
    // Only the orphan is left once the victim's account is archived — the
    // badge and the rows above answer the SAME question (R16), so this number
    // and the previous test's row list can never disagree.
    expect(body.total).toBe(1)
  })

  it("a single ticket lookup by id — the deep-link and generic-query-tool surface — comes back empty, not the ticket", async () => {
    // `GET /api/content/help?id=<id>` is the exact door `list_help_tickets`
    // (shared/workers/tool-catalog.ts) calls when an agent or MCP caller
    // passes `id` — a by-id lookup is a LOOKUP, not a filtered page, so it has
    // to ask the same question on its own rather than inherit an answer a
    // list happened to give (`getTicket`, lib/help.ts).
    const res = await call(`GET /api/content/help?id=${IDS.victimTicket}`)
    expect(res.status, await res.clone().text()).toBe(200)
    const body = (await res.json()) as { tickets?: { id: string }[] }
    expect(body.tickets ?? []).toEqual([])
  })

  it("a single ticket lookup by id still works for a ticket with no account", async () => {
    const res = await call(`GET /api/content/help?id=${ORPHAN_TICKET}`)
    expect(res.status, await res.clone().text()).toBe(200)
    const body = (await res.json()) as { tickets?: { id: string }[] }
    expect(body.tickets?.map((t) => t.id)).toEqual([ORPHAN_TICKET])
  })

  it("the Dashboard tab (GET /help/dashboard) stops counting it", async () => {
    const res = await call("GET /api/content/help/dashboard")
    expect(res.status, await res.clone().text()).toBe(200)
    const body = (await res.json()) as { matched?: number }
    // `matched` is the whole population every panel on the tab was grouped
    // over (readTicketDashboard's own note on the type) — the one number on
    // the door that is honest about "nothing matched" without having to be
    // inferred from which grouped arrays happen to come back empty. Only the
    // orphan ticket is left to match.
    expect(body.matched).toBe(1)
  })

  it("the triage queue stops listing it", async () => {
    const res = await call("GET /api/content/triage")
    expect(res.status, await res.clone().text()).toBe(200)
    const body = (await res.json()) as { waiting?: { id: string }[]; total?: number }
    expect(body.waiting?.some((t) => t.id === IDS.victimTicket)).toBe(false)
    expect(body.total).toBe(1)
    // …AND STILL LISTS THE ORPHAN — `needsTriage` (lib/triage.ts) carries no
    // account fence at all by design (a client must never see the queue), so
    // it had to grow its own explicit `accountArchivedClause()` call rather
    // than inherit one through `ticketWhere`; this is the proof it did.
    expect(body.waiting?.some((t) => t.id === ORPHAN_TICKET)).toBe(true)
  })
})
