// THE INPUTS SCREEN'S OWN DOOR — the three new views, the account/account-
// manager facets, and the `all_inputs:read` narrowing, driven through the
// SHIPPED route handler against a real SQLite database running the real team
// migrations (the same infrastructure todos-tasks.test.ts and todos-paged.test.ts
// use, for the same reason: the ordering, the fence and the cursor signature
// all have to agree, and they live in different files).
//
// todos-paged.test.ts already proves `open`/`done` (the panel's own two
// piles) page correctly; this file is about the THREE NEW ones layered over
// them — waiting/overdue split `open` by due date, received reads `done`
// under a second word — and about the permission that gates them.

import type { DatabaseSync } from "node:sqlite"
import { beforeEach, describe, expect, it, vi } from "vitest"

const holder = vi.hoisted(() => ({ db: null as DatabaseSync | null }))

vi.mock("@shared/workers/d1-rest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/d1-rest")>()
  const { d1Impl } = await import("../../tenancy/test/d1-sqlite")
  return { ...actual, ...d1Impl(() => holder.db as DatabaseSync) }
})
vi.mock("@shared/workers/notify", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/notify")>()
  return { ...actual, sendBrandedEmail: async () => true }
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
    MEDIA: { put: async () => undefined },
    INTERNAL_MEDIA: { put: async () => undefined },
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

type TodoBody = {
  todos: { id: string; title: string; dueOn: string | null; completedAt: string | null; accountId: string }[]
  total: number
  waitingTotal: number
  overdueTotal: number
  receivedTotal: number
  openTotal: number
  doneTotal: number
}

async function get(userId: string, query: string): Promise<TodoBody> {
  const res = await call(userId, "GET /api/content/todos", undefined, query)
  expect(res.status, `${query} refused (${await res.clone().text()})`).toBe(200)
  return (await res.json()) as TodoBody
}

async function ask(title: string, accountId: string, dueOn?: string): Promise<string> {
  const res = await call(IDS.staffUser, "POST /api/content/todos", { accountId, title, dueOn })
  expect(res.status, "the to-do door refused a plain create").toBe(200)
  return (db().prepare(`SELECT id FROM todos WHERE title = ?`).get(title) as { id: string }).id
}

beforeEach(() => {
  holder.db = buildSpineDb()
})

describe("the door gates on inputs:read now (renamed from todos:read, migration 0096)", () => {
  it("the admin role (which holds inputs via buildTeamSeed) reaches the door", async () => {
    const res = await call(IDS.staffUser, "GET /api/content/todos")
    expect(res.status).toBe(200)
  })
})

describe("waiting / overdue / received — the three new views", () => {
  it("an undated open input is WAITING, never overdue", async () => {
    const id = await ask("No due date at all", IDS.victimAccount)
    const waiting = await get(IDS.staffUser, "?view=waiting")
    expect(waiting.todos.map((t) => t.id)).toContain(id)
    const overdue = await get(IDS.staffUser, "?view=overdue")
    expect(overdue.todos.map((t) => t.id)).not.toContain(id)
  })

  it("a future-dated open input is WAITING", async () => {
    const id = await ask("Due next month", IDS.victimAccount, "2099-01-01T00:00:00.000Z")
    const waiting = await get(IDS.staffUser, "?view=waiting")
    expect(waiting.todos.map((t) => t.id)).toContain(id)
  })

  it("a past-dated open input is OVERDUE, never waiting", async () => {
    const id = await ask("Should have come back already", IDS.victimAccount)
    db().exec(`UPDATE todos SET due_on = '2000-01-01T00:00:00.000Z' WHERE id = '${id}'`)
    const overdue = await get(IDS.staffUser, "?view=overdue")
    expect(overdue.todos.map((t) => t.id)).toContain(id)
    const waiting = await get(IDS.staffUser, "?view=waiting")
    expect(waiting.todos.map((t) => t.id)).not.toContain(id)
  })

  it("a completed input is RECEIVED, the same pile `done` already named", async () => {
    const id = await ask("Send the logo", IDS.victimAccount)
    const complete = await call(IDS.staffUser, "POST /api/content/todos/complete", { id })
    expect(complete.status).toBe(200)
    const received = await get(IDS.staffUser, "?view=received")
    expect(received.todos.map((t) => t.id)).toContain(id)
    const done = await get(IDS.staffUser, "?view=done")
    expect(done.todos.map((t) => t.id)).toContain(id)
  })

  it("every count is exact and rides EVERY answer (R16) — waitingTotal/overdueTotal/receivedTotal never move with the search box", async () => {
    await ask("Waiting one", IDS.victimAccount)
    const overdueId = await ask("Overdue one", IDS.victimAccount)
    db().exec(`UPDATE todos SET due_on = '2000-01-01T00:00:00.000Z' WHERE id = '${overdueId}'`)
    const receivedId = await ask("Received one", IDS.victimAccount)
    await call(IDS.staffUser, "POST /api/content/todos/complete", { id: receivedId })

    const body = await get(IDS.staffUser, "?view=waiting")
    expect({ waitingTotal: body.waitingTotal, overdueTotal: body.overdueTotal, receivedTotal: body.receivedTotal }).toEqual(
      { waitingTotal: 1, overdueTotal: 1, receivedTotal: 1 }
    )
    // Asked from a DIFFERENT view — the badges are the whole pile regardless.
    const fromOverdue = await get(IDS.staffUser, "?view=overdue")
    expect({
      waitingTotal: fromOverdue.waitingTotal,
      overdueTotal: fromOverdue.overdueTotal,
      receivedTotal: fromOverdue.receivedTotal,
    }).toEqual({ waitingTotal: 1, overdueTotal: 1, receivedTotal: 1 })
  })
})

describe("the account facet (client ruling: 'add a filter for account')", () => {
  it("?accountId narrows to one company's inputs, at the door", async () => {
    await ask("For Bergman", IDS.victimAccount)
    await ask("For the workshop", IDS.victimChild)
    const forParent = await get(IDS.staffUser, `?view=waiting&accountId=${IDS.victimAccount}`)
    expect(forParent.todos.map((t) => t.title)).toEqual(["For Bergman"])
    const forChild = await get(IDS.staffUser, `?view=waiting&accountId=${IDS.victimChild}`)
    expect(forChild.todos.map((t) => t.title)).toEqual(["For the workshop"])
  })
})

describe("sort — Due (default) and Waiting longest", () => {
  it("Waiting longest orders by when the input was RAISED, oldest first — never by due date", async () => {
    const early = await ask("Raised first", IDS.victimAccount, "2099-06-01T00:00:00.000Z")
    db().exec(`UPDATE todos SET created_at = '2026-01-01T00:00:00.000Z' WHERE id = '${early}'`)
    const late = await ask("Raised second", IDS.victimAccount, "2099-01-01T00:00:00.000Z")
    db().exec(`UPDATE todos SET created_at = '2026-02-01T00:00:00.000Z' WHERE id = '${late}'`)

    // Due order: the SOONEST due date first — "Raised second" (Jan 2099) before
    // "Raised first" (June 2099).
    const byDue = await get(IDS.staffUser, "?view=waiting&sort=due")
    expect(byDue.todos.map((t) => t.title)).toEqual(["Raised second", "Raised first"])

    // Waiting-longest: oldest RAISED first, regardless of either due date.
    const byWaiting = await get(IDS.staffUser, "?view=waiting&sort=waiting")
    expect(byWaiting.todos.map((t) => t.title)).toEqual(["Raised first", "Raised second"])
  })

  it("an unknown sort name is a clean 400, never silently ignored", async () => {
    const res = await call(IDS.staffUser, "GET /api/content/todos", undefined, "?view=waiting&sort=nonsense")
    expect(res.status).toBe(400)
  })
})

describe("all_inputs:read — whose accounts' inputs 'the inputs' means", () => {
  /** A second staff member on a role that holds `inputs` but NOT
   * `all_inputs` — "off by default for every role except Admin" in
   * practice, same shape `todos-tasks.test.ts`'s own NARROW_USER takes for
   * `all_tasks`. */
  const NARROW_USER = "U_NARROW_INPUTS"
  const NARROW_ROLE = "R_NARROW_INPUTS"
  beforeEach(() => {
    db().exec(`
      INSERT INTO users (id, email, first_name, current_team_id)
        VALUES ('${NARROW_USER}', 'narrow-inputs@kwapso.app', 'Noor', '${IDS.team}');
      INSERT INTO team_members (id, team_id, user_id, role_id, created_at)
        VALUES ('m_narrow_inputs', '${IDS.team}', '${NARROW_USER}', '${NARROW_ROLE}', '2026-01-01');
      INSERT INTO member_roles (id, title, is_default, created_at)
        VALUES ('${NARROW_ROLE}', 'Account manager', 0, '2026-01-01');
      INSERT INTO role_permissions (id, role_id, module, can_read, can_create, can_update, can_delete)
        VALUES ('rp_narrow_inputs', '${NARROW_ROLE}', 'inputs', 1, 1, 1, 1);
      -- The victim account is managed by the narrow user; the workshop
      -- (a different account) is managed by nobody.
      UPDATE accounts SET account_manager_user_id = '${NARROW_USER}' WHERE id = '${IDS.victimAccount}';
    `)
  })

  it("without the right, the three new views narrow to accounts THIS caller manages", async () => {
    await ask("On the managed account", IDS.victimAccount)
    await ask("On an account nobody gave them", IDS.victimChild)

    const res = await get(NARROW_USER, "?view=waiting")
    expect(res.todos.map((t) => t.title)).toEqual(["On the managed account"])
    // …and the door OPENS (inputs:read is what gets you the screen) rather
    // than refusing — narrowed, never refused, same reasoning `getTasks`
    // already takes for `all_tasks:read`.
    expect(res.waitingTotal, "the badge can't advertise rows the list withholds (R16)").toBe(1)
  })

  it("naming the unmanaged account explicitly still comes back empty, not someone else's row", async () => {
    await ask("On an account nobody gave them", IDS.victimChild)
    const res = await get(NARROW_USER, `?view=waiting&accountId=${IDS.victimChild}`)
    expect(res.todos).toEqual([])
  })

  it("with the right, the same door answers about every account", async () => {
    await ask("On the managed account", IDS.victimAccount)
    await ask("On an account nobody gave them", IDS.victimChild)
    db().exec(
      `INSERT INTO role_permissions (id, role_id, module, can_read, can_create, can_update, can_delete)
         VALUES ('rp_narrow_inputs_all', '${NARROW_ROLE}', 'all_inputs', 1, 0, 0, 0);`
    )
    const res = await get(NARROW_USER, "?view=waiting")
    expect(res.todos.map((t) => t.title).sort()).toEqual([
      "On an account nobody gave them",
      "On the managed account",
    ])
  })

  it("the PANEL's own open/done views are UNTOUCHED by all_inputs — they answer about every account either way", async () => {
    // The account/contact record's own TodosPanel is not this screen: it
    // already carries its own fence (one specific account, or the caller's
    // ordinary `inputs:read`), and widening THIS gate must never narrow it
    // a second, disagreeing way.
    await ask("On the managed account", IDS.victimAccount)
    await ask("On an account nobody gave them", IDS.victimChild)
    const res = await get(NARROW_USER, "?view=open")
    expect(res.todos.map((t) => t.title).sort()).toEqual([
      "On an account nobody gave them",
      "On the managed account",
    ])
  })
})

// THE PORTAL RIGHT IS `inputs`, NOT THE RETIRED `todos` — proved against a
// REAL portal caller (`IDS.victimUser`, a `portal_users` row on the harness's
// R_CLIENT role), the same shape SCOPE ch.06/07 describes: a client reads and
// completes their own company's inputs, and nothing else.
//
// WHY THIS FILE EXISTS SEPARATELY FROM THE SMOKE. `scripts/smoke-portal.mjs`
// caught this the hard way, 15 Sep 2026: its own `CLIENT_RIGHTS` fixture still
// wrote a role's rights against the module named `todos`, which migration
// 0096 (`workers/tenancy/src/team-schema/migrations.ts`) renamed to `inputs`
// for every EXISTING team's EXISTING roles — so a role built fresh against
// the OLD name landed on a module no door reads any more, and the door
// answered exactly what an unheld right answers: 403, "your role is missing
// the 'update' right on inputs" for the complete door and a flat 403 for the
// read door, staff and portal alike, no different than a role that held
// nothing at all. The smoke's own fix was renaming that one key to `inputs`;
// this suite proves the mapping the smoke fixture had gotten wrong — the
// worker side of it, so a future rename of this module is caught here even
// when nobody happens to run the smoke.
describe("the portal right is `inputs`, not the retired `todos` (migration 0096)", () => {
  it("a portal caller holding inputs:read + inputs:update reads and completes their own company's input", async () => {
    const id = await ask("Send the signed contract", IDS.victimAccount)
    const list = await get(IDS.victimUser, "?view=open")
    expect(list.todos.map((t) => t.id)).toContain(id)
    const done = await call(IDS.victimUser, "POST /api/content/todos/complete", { id })
    expect(done.status, `portal complete refused (${await done.clone().text()})`).toBe(200)
  })

  it("without inputs:update a portal caller is refused, named for the module a door actually reads", async () => {
    db()
      .prepare(`UPDATE role_permissions SET can_update = 0 WHERE role_id = ? AND module = 'inputs'`)
      .run(IDS.clientRole)
    const id = await ask("Send the W-9", IDS.victimAccount)
    const res = await call(IDS.victimUser, "POST /api/content/todos/complete", { id })
    expect(res.status).toBe(403)
    const body = (await res.json()) as { error: string; message: string }
    expect(body.message).toMatch(/inputs/)
  })

  it("without inputs:read a portal caller cannot even list their own company's inputs", async () => {
    db().prepare(`UPDATE role_permissions SET can_read = 0 WHERE role_id = ? AND module = 'inputs'`).run(IDS.clientRole)
    const res = await call(IDS.victimUser, "GET /api/content/todos")
    expect(res.status).toBe(403)
  })

  it("holding inputs is not a pass to another company's input — the fence refuses it, not the right", async () => {
    const id = await ask("Their own paperwork", IDS.burglarAccount)
    const res = await call(IDS.victimUser, "POST /api/content/todos/complete", { id })
    expect(res.status).toBe(404)
  })
})
