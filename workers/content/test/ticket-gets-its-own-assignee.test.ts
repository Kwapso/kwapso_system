// A TICKET GETS ITS OWN ASSIGNEE, Aurora's ruling, verbatim, 21 Sep 2026:
// "both on story detail and ticket detail we need to see to whom it's
// assigned, normally this gets inherited from the app." Team migration 0111
// gives `help` its own `assignee_id`/`assignee_name` pair; `updateTicket`
// (workers/content/src/lib/help.ts) is the one door onto it, staff only; the
// app's own answer, its LEAD (`app_staff.is_lead`, team migration 0030) ,
// rides the ticket row as `app_assignee_id`, a correlated subselect, never a
// second column on `apps`.
//
// Driven through the real route handlers against a real SQLite database
// running the real team migrations, the same shape every other door-level
// suite here uses (`ticket-work-engine.test.ts`'s own header says why).

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

const row = (id: string) =>
  db().prepare(`SELECT * FROM help WHERE id = ?`).get(id) as Record<string, string | number | null>

/** One ticket, by id, as the wire shapes it, the same GET the record screen
 * itself reads. */
async function ticketOne(userId: string, id: string) {
  const res = await call(userId, "GET /api/content/help", undefined, `?id=${id}`)
  const body = (await res.json()) as { tickets: Record<string, unknown>[] }
  return { status: res.status, ticket: body.tickets?.[0] }
}

/** Makes the app's LEAD real, `app_staff.is_lead`, the fact
 * `effectiveAssignee` reads when a ticket names no assignee of its own. No
 * door of its own (see `web/lib/members.ts`'s own note on `app_staff`), so
 * this seeds the row directly, exactly as `ticket-work-engine.test.ts` seeds
 * a fact no route exists to set. */
function makeAppLead(appId: string, userId: string) {
  db()
    .prepare(
      `INSERT INTO app_staff (id, app_id, user_id, is_lead, created_at) VALUES (?, ?, ?, 1, '2026-02-01')`
    )
    .run(`AS_${userId}`, appId, userId)
}

beforeEach(() => {
  holder.db = buildSpineDb()
})

describe("a ticket's own assignee", () => {
  it("a staff member sets it, and reading the ticket back shows it", async () => {
    const before = await ticketOne(IDS.staffUser, IDS.victimTicket)
    expect(before.ticket?.assigneeId).toBeNull()

    const updated = await call(IDS.staffUser, "POST /api/content/help/update", {
      id: IDS.victimTicket,
      description: "Bergman S.A. cannot see the March invoice run",
      assigneeId: IDS.staffUser,
    })
    expect(updated.status).toBe(200)

    const after = await ticketOne(IDS.staffUser, IDS.victimTicket)
    expect(after.ticket?.assigneeId).toBe(IDS.staffUser)
    // The audit-pair habit every person reference in this codebase keeps
    // (`stories.assignee_name`'s own precedent), a real name, not the id
    // echoed back.
    expect(after.ticket?.assigneeName).toBeTruthy()
    expect(after.ticket?.assigneeName).not.toBe(IDS.staffUser)

    // Stored, not merely returned on the wire, the row itself carries it.
    expect(row(IDS.victimTicket).assignee_id).toBe(IDS.staffUser)
  })

  it("leaving assigneeId out of an edit keeps whoever is already on it", async () => {
    await call(IDS.staffUser, "POST /api/content/help/update", {
      id: IDS.victimTicket,
      description: "Bergman S.A. cannot see the March invoice run",
      assigneeId: IDS.staffUser,
    })
    // An ordinary edit that never mentions the assignee, correcting the
    // description alone, the way `appId`/`moduleId`/`raisedByContactId`
    // already behave on this same door.
    await call(IDS.staffUser, "POST /api/content/help/update", {
      id: IDS.victimTicket,
      description: "Bergman S.A. cannot see the March invoice run, revised wording",
    })
    expect(row(IDS.victimTicket).assignee_id).toBe(IDS.staffUser)
  })

  it("refuses an id that isn't on the team", async () => {
    const res = await call(IDS.staffUser, "POST /api/content/help/update", {
      id: IDS.victimTicket,
      description: "Bergman S.A. cannot see the March invoice run",
      assigneeId: "nobody-on-this-team",
    })
    expect(res.status).toBe(400)
  })

  it("a client login cannot set it, the field is ignored outright, not refused", async () => {
    // The victim raised this ticket themselves (spine-harness's own fixture),
    // so the portal ownership check passes; the assignee is still never
    // written, because a portal caller's `assigneeId` is never even read
    // (`updateTicket`'s own STAFF ONLY branch).
    const res = await call(IDS.victimUser, "POST /api/content/help/update", {
      id: IDS.victimTicket,
      description: "Bergman S.A. cannot see the March invoice run",
      assigneeId: IDS.staffUser,
    })
    expect(res.status).toBe(200)
    expect(row(IDS.victimTicket).assignee_id).toBeNull()

    // And the same door's own read never hands a client login staff identity
    // (SCOPE ch.06, unconditional, see `toTicket`'s own `hideAssignee`).
    const asClient = await ticketOne(IDS.victimUser, IDS.victimTicket)
    expect(asClient.ticket?.assigneeId).toBeNull()
  })
})

describe("the app's own answer, when a ticket has none of its own", () => {
  it("inherits the app's lead", async () => {
    const raised = await call(IDS.staffUser, "POST /api/content/help", {
      description: "The dispatch board will not load",
      appId: IDS.victimApp,
    })
    expect(raised.status).toBe(200)
    const id = (
      db().prepare(`SELECT id FROM help ORDER BY created_at DESC LIMIT 1`).get() as { id: string }
    ).id

    makeAppLead(IDS.victimApp, IDS.staffUser)

    const ticket = (await ticketOne(IDS.staffUser, id)).ticket
    expect(ticket?.assigneeId).toBeNull() // nobody set on the ticket itself
    expect(ticket?.appAssigneeId).toBe(IDS.staffUser) // the app's lead answers instead
  })

  it("a ticket with no app and no assignee carries neither", async () => {
    await call(IDS.staffUser, "POST /api/content/help", {
      description: "Our own internal question, no system named",
    })
    const id = (
      db().prepare(`SELECT id FROM help ORDER BY created_at DESC LIMIT 1`).get() as { id: string }
    ).id
    const ticket = (await ticketOne(IDS.staffUser, id)).ticket
    expect(ticket?.assigneeId).toBeNull()
    expect(ticket?.appAssigneeId).toBeNull()
  })

  it("the ticket's own assignee wins over the app's lead", async () => {
    await call(IDS.staffUser, "POST /api/content/help", {
      description: "The dispatch board will not load",
      appId: IDS.victimApp,
    })
    const id = (
      db().prepare(`SELECT id FROM help ORDER BY created_at DESC LIMIT 1`).get() as { id: string }
    ).id
    makeAppLead(IDS.victimApp, IDS.burglarUser)

    await call(IDS.staffUser, "POST /api/content/help/update", {
      id,
      description: "The dispatch board will not load",
      assigneeId: IDS.staffUser,
    })

    const ticket = (await ticketOne(IDS.staffUser, id)).ticket
    expect(ticket?.assigneeId).toBe(IDS.staffUser)
    // The app's own answer still rides the row, it is the record's OWN
    // field that wins, at the resolver, not a fact the door has to erase.
    expect(ticket?.appAssigneeId).toBe(IDS.burglarUser)
  })
})
