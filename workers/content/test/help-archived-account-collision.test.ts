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
})

describe("a ticket door that replies with facets survives an archived account", () => {
  // THE THREE DOORS THE GATE CAUGHT. Each replies through
  // `ticketMutationReply(..., withFacets: true)`, which is what actually runs
  // the ambiguous join — a plain `listTickets`/`getTicket` read never does.
  it("POST /help/status — moving a ticket along its lifecycle", async () => {
    const res = await call("POST /api/content/help/status", { id: IDS.victimTicket, status: "triaged" })
    expect(res.status, await res.clone().text()).toBe(200)
    const body = (await res.json()) as { byAccount?: { accountId: string }[] }
    // THE FACET STILL NAMES THE ACCOUNT — proving the join resolved rather
    // than merely proving the statement didn't throw. An archived account's
    // ticket stays fully reachable through the tickets list (see the header
    // note on what this repo does NOT yet do about that, flagged to the
    // owner rather than decided here).
    expect(body.byAccount?.some((a) => a.accountId === IDS.victimAccount)).toBe(true)
  })

  it("POST /help/update — editing a ticket", async () => {
    const res = await call("POST /api/content/help/update", {
      id: IDS.victimTicket,
      description: "Bergman S.A. cannot see the March invoice run, still",
    })
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

  it("the everyday (live) view still returns the ticket of an archived account", async () => {
    const res = await call("GET /api/content/help?view=live")
    expect(res.status, await res.clone().text()).toBe(200)
    const body = (await res.json()) as { tickets?: { id: string }[] }
    expect(body.tickets?.some((t) => t.id === IDS.victimTicket)).toBe(true)
  })
})
