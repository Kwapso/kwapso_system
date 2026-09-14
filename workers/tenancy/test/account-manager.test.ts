// THE ACCOUNT MANAGER (0091) — the client's ruling, 14 Sep 2026, verbatim:
// "Who the account responsible or account manager is, like someone from
// staff. For this account manager, if this is not in the data, add it there
// as well as in the crude [CRUD] screens."
//
// These drive the REAL doors (`POST /api/tenancy/accounts` and
// `/accounts/update`) through the REAL migrated schema, the same shape
// account-patch.test.ts already uses for the rest of this record's PATCH
// semantics — because the interesting half of this feature is the boundary:
// a member id checked as an id shape, and checked to be a CURRENT STAFF
// member of this team, never a client login (a client login is an ordinary
// `team_members` row, so membership alone cannot tell the two apart).

import type { DatabaseSync } from "node:sqlite"
import { beforeEach, describe, expect, it, vi } from "vitest"

const holder = vi.hoisted(() => ({ db: null as DatabaseSync | null }))

vi.mock("@shared/workers/d1-rest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/d1-rest")>()
  const { d1Impl } = await import("./d1-sqlite")
  return { ...actual, ...d1Impl(() => holder.db as DatabaseSync) }
})

import worker from "../src/index"
import { buildSpineDb, IDS, makeEnv, req } from "./spine-harness"

async function call(request: Request, userId: string): Promise<{ status: number; text: string }> {
  const res = await worker.fetch(request, makeEnv(() => holder.db as DatabaseSync, userId))
  return { status: res.status, text: await res.text() }
}

const account = () =>
  holder.db!.prepare("SELECT * FROM accounts WHERE id = ?").get(IDS.victimAccount) as Record<
    string,
    unknown
  >

beforeEach(() => {
  holder.db = buildSpineDb()
})

describe("creating an account with a manager", () => {
  it("a real staff member sticks", async () => {
    const { status, text } = await call(
      req("POST /api/tenancy/accounts", {
        accountType: "entity",
        name: "Padelbase",
        accountManagerUserId: IDS.staffUser,
      }),
      IDS.staffUser
    )
    expect(status, text).toBe(200)
    const { id } = JSON.parse(text) as { id: string }
    const row = holder.db!.prepare("SELECT account_manager_user_id m FROM accounts WHERE id = ?").get(id) as {
      m: string | null
    }
    expect(row.m).toBe(IDS.staffUser)
  })

  it("left out, the account simply has none yet", async () => {
    const { status, text } = await call(
      req("POST /api/tenancy/accounts", { accountType: "entity", name: "Padelbase" }),
      IDS.staffUser
    )
    expect(status, text).toBe(200)
    const { id } = JSON.parse(text) as { id: string }
    const row = holder.db!.prepare("SELECT account_manager_user_id m FROM accounts WHERE id = ?").get(id) as {
      m: string | null
    }
    expect(row.m).toBeNull()
  })

  it("refuses a made-up id with a clean 400, not a 500", async () => {
    const { status, text } = await call(
      req("POST /api/tenancy/accounts", {
        accountType: "entity",
        name: "Padelbase",
        accountManagerUserId: "NOBODY_LIKE_THIS",
      }),
      IDS.staffUser
    )
    expect(status, text).toBe(400)
  })

  it("refuses a CLIENT LOGIN — a client login is an ordinary team member, and membership alone cannot tell them apart", async () => {
    // U_VICTIM holds a `team_members` row on this team (the client role) AND a
    // `portal_users` row — exactly the case the door's own header warns about.
    const { status, text } = await call(
      req("POST /api/tenancy/accounts", {
        accountType: "entity",
        name: "Padelbase",
        accountManagerUserId: IDS.victimUser,
      }),
      IDS.staffUser
    )
    expect(status, text).toBe(400)
    expect(text).toMatch(/staff/i)
  })
})

describe("editing an account's manager — the same tri-state every other field carries", () => {
  it("left out, whoever is already assigned stays assigned", async () => {
    holder.db!
      .prepare("UPDATE accounts SET account_manager_user_id = ? WHERE id = ?")
      .run(IDS.staffUser, IDS.victimAccount)
    const { status } = await call(
      req("POST /api/tenancy/accounts/update", { id: IDS.victimAccount, name: "Bergman S.A." }),
      IDS.staffUser
    )
    expect(status).toBe(200)
    expect(account().account_manager_user_id).toBe(IDS.staffUser)
  })

  it("an empty string clears it, same as every other optional field", async () => {
    holder.db!
      .prepare("UPDATE accounts SET account_manager_user_id = ? WHERE id = ?")
      .run(IDS.staffUser, IDS.victimAccount)
    const { status, text } = await call(
      req("POST /api/tenancy/accounts/update", {
        id: IDS.victimAccount,
        name: "Bergman S.A.",
        accountManagerUserId: "",
      }),
      IDS.staffUser
    )
    expect(status, text).toBe(200)
    expect(account().account_manager_user_id).toBeNull()
  })

  it("a real staff id reassigns it", async () => {
    const { status, text } = await call(
      req("POST /api/tenancy/accounts/update", {
        id: IDS.victimAccount,
        name: "Bergman S.A.",
        accountManagerUserId: IDS.staffUser,
      }),
      IDS.staffUser
    )
    expect(status, text).toBe(200)
    expect(account().account_manager_user_id).toBe(IDS.staffUser)
  })

  it("refuses a client login with a clean 400, and does not write it", async () => {
    const { status, text } = await call(
      req("POST /api/tenancy/accounts/update", {
        id: IDS.victimAccount,
        name: "Bergman S.A.",
        accountManagerUserId: IDS.victimUser,
      }),
      IDS.staffUser
    )
    expect(status, text).toBe(400)
    expect(account().account_manager_user_id, "the refused write must not land").toBeNull()
  })

  it("refuses somebody who isn't a member of this team at all", async () => {
    const { status, text } = await call(
      req("POST /api/tenancy/accounts/update", {
        id: IDS.victimAccount,
        name: "Bergman S.A.",
        // U_CLIENT has no team_members row on this team.
        accountManagerUserId: IDS.clientUser,
      }),
      IDS.staffUser
    )
    expect(status, text).toBe(400)
  })
})

describe("a client login never reads who we staffed on their account", () => {
  it("staff see the assigned manager", async () => {
    holder.db!
      .prepare("UPDATE accounts SET account_manager_user_id = ? WHERE id = ?")
      .run(IDS.staffUser, IDS.victimAccount)
    const { status, text } = await call(req("GET /api/tenancy/accounts"), IDS.staffUser)
    expect(status, text).toBe(200)
    expect(text).toContain(`"accountManagerId":"${IDS.staffUser}"`)
  })

  it("the client's own list nulls it — our staffing decision about them, not theirs to read", async () => {
    holder.db!
      .prepare("UPDATE accounts SET account_manager_user_id = ? WHERE id = ?")
      .run(IDS.staffUser, IDS.victimAccount)
    const { status, text } = await call(req("GET /api/tenancy/accounts"), IDS.victimUser)
    expect(status, text).toBe(200)
    expect(text, "the client must still get their own company back").toContain("Bergman")
    expect(text).not.toContain(`"accountManagerId":"${IDS.staffUser}"`)
  })
})
