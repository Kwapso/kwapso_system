// A TOP-UP THAT LEAVES NOTHING BEHIND IS AN UNTRACEABLE ONE.
//
// `POST /api/data-ops/admin/grant-credits` is the only write in the estate that
// creates money out of nothing, and it opens on `adminGuard` — the owner's key,
// the highest privilege here. Until db/core/0030 it wrote a bigger `balance` and
// a bigger `lifetime_granted` on `agent_credits` and stopped. You could read the
// total ever granted and the minute the row last moved; you could not read who
// granted what, when, or in how many increments. A leaked key topped a balance
// up and the only evidence was a number that had got bigger.
//
// This runs the REAL handler against a REAL SQLite database with the REAL
// migrations applied, because the claim is about what ends up in a table. A stub
// that "understood" the INSERT would be agreeing with itself; and every
// assertion here is about a row that must EXIST, so the negative control matters
// more than usual — `grantCredits` is called with the record as a required
// argument, so deleting the second statement of its batch is the mutation this
// file has to go red on.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { DatabaseSync, type SqlValue } from "node:sqlite"
import { beforeEach, describe, expect, it } from "vitest"

import { postGrantCredits } from "../src/routes/agent"
import type { Env } from "../src/env"

const CORE = join(__dirname, "..", "..", "..", "db", "core")
const migration = (name: string) => readFileSync(join(CORE, name), "utf8")

const ADMIN_KEY = "a-maintenance-key"
const TEAM = "01JTEAM"

/** The core tables this door touches, built from the migrations THEMSELVES — so
 * a schema change that drops a column fails here rather than in production.
 * `agent_credits` references `teams(id)`, which this slice does not build, so
 * the reference is inert: the point under test is the row beside the balance. */
function coreDb() {
  const db = new DatabaseSync(":memory:")
  db.exec(migration("0010_agent_credits.sql").replace("REFERENCES teams (id)", ""))
  db.exec(migration("0030_credit_grants.sql"))
  return db
}

/** The slice of the D1 binding this door uses, over real SQLite. Two things it
 * copies from D1 deliberately: `batch` runs its statements inside ONE
 * transaction, and a statement is COMPILED WHEN IT RUNS rather than when it is
 * prepared. The second one is what makes the last test in this file mean
 * something — an adapter that compiled eagerly would fail before the transaction
 * opened, and would prove nothing about rolling back. */
function d1(db: DatabaseSync) {
  const prepare = (sql: string) => {
    let args: unknown[] = []
    const bound = {
      bind(...a: unknown[]) {
        args = a
        return bound
      },
      async first<T>(): Promise<T | null> {
        return (db.prepare(sql).get(...(args as SqlValue[])) ?? null) as T | null
      },
      async run() {
        const r = db.prepare(sql).run(...(args as SqlValue[]))
        return { meta: { changes: Number(r.changes) } }
      },
    }
    return bound
  }
  return {
    prepare,
    async batch(stmts: { run(): Promise<{ meta: { changes: number } }> }[]) {
      db.exec("BEGIN")
      try {
        const out = []
        for (const s of stmts) out.push(await s.run())
        db.exec("COMMIT")
        return out
      } catch (e) {
        db.exec("ROLLBACK")
        throw e
      }
    },
  }
}

/** Enough env for this door: the core database, the maintenance key, and a
 * realtime binding that answers so the live ping neither fails nor hides one. */
function envFor(db: DatabaseSync): Env {
  return {
    DB: d1(db),
    ADMIN_KEY,
    REALTIME: { fetch: async () => new Response("{}") },
  } as unknown as Env
}

/** The door, called the way the gateway calls it: the maintenance key on the
 * header, and this click's own trace id (shared/workers/trace.ts). */
function grant(body: unknown, requestId?: string): Request {
  const headers: Record<string, string> = {
    "x-admin-key": ADMIN_KEY,
    "Content-Type": "application/json",
  }
  if (requestId) headers["x-request-id"] = requestId
  return new Request("https://data-ops/api/data-ops/admin/grant-credits", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  })
}

type GrantRow = {
  id: string
  team_id: string
  granted_at: string
  amount: number
  actor: string
  request_id: string | null
}

const grants = (db: DatabaseSync) =>
  db.prepare("SELECT * FROM credit_grants ORDER BY granted_at, id").all() as unknown as GrantRow[]

let db: DatabaseSync
let env: Env

beforeEach(() => {
  db = coreDb()
  env = envFor(db)
})

describe("a credit grant leaves a record", () => {
  it("writes one row naming the amount and the team", async () => {
    const res = await postGrantCredits(grant({ teamId: TEAM, amount: 500 }), env)
    expect(res.status).toBe(200)
    // `lifetimeGranted` rides along because the operator running the grant is the
    // only reader that column has ever had (lifetime-granted.test.ts). Asserted
    // with toEqual rather than toMatchObject on purpose: the door's answer is a
    // contract, and a field appearing in it unannounced is the thing to catch.
    expect(await res.json()).toEqual({ teamId: TEAM, balance: 500, lifetimeGranted: 500 })

    const rows = grants(db)
    expect(rows.length, "a grant that records nothing is the bug this closes").toBe(1)
    expect(rows[0].amount, "how much").toBe(500)
    expect(rows[0].team_id, "to which team").toBe(TEAM)
    expect(rows[0].granted_at, "when").toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it("names the owner key as the actor, and invents no person", async () => {
    // `adminGuard` proves possession of a key, not the identity of anybody. The
    // row has to say that rather than borrow a name it does not have — a made-up
    // actor is worse than an honest one, because it would be believed.
    await postGrantCredits(grant({ teamId: TEAM, amount: 10 }), env)
    expect(grants(db)[0].actor).toBe("owner-key")
  })

  it("tells two grants apart by the request that carried them", async () => {
    // Same team, same size, same second: without the trace id these two rows are
    // indistinguishable, and "in how many increments" is the question the
    // finding was about.
    await postGrantCredits(grant({ teamId: TEAM, amount: 100 }, "REQ-ONE"), env)
    await postGrantCredits(grant({ teamId: TEAM, amount: 100 }, "REQ-TWO"), env)

    const rows = grants(db)
    expect(rows.length).toBe(2)
    expect(new Set(rows.map((r) => r.request_id))).toEqual(new Set(["REQ-ONE", "REQ-TWO"]))
    expect(new Set(rows.map((r) => r.id)).size, "each grant is its own row").toBe(2)
  })

  it("records every increment, not just the latest — the balance is not the trail", async () => {
    for (const amount of [50, 25, 5]) await postGrantCredits(grant({ teamId: TEAM, amount }), env)
    const rows = grants(db)
    expect(rows.map((r) => r.amount).sort((a, b) => b - a)).toEqual([50, 25, 5])
    // …and the sum reconciles with the balance the door reports, which is what
    // makes the trail answerable rather than merely present.
    const balance = (await d1(db).prepare("SELECT balance FROM agent_credits WHERE team_id = ?")
      .bind(TEAM)
      .first<{ balance: number }>())!.balance
    expect(rows.reduce((n, r) => n + r.amount, 0)).toBe(balance)
  })

  it("a refused grant records nothing at all", async () => {
    // The record must follow the money. A bad key never reaches `grantCredits`;
    // a bad amount is refused at the boundary (R20). Neither may leave a row
    // saying a grant happened — an audit trail that over-reports is a wrong
    // answer that looks like an answer.
    const badKey = new Request("https://data-ops/api/data-ops/admin/grant-credits", {
      method: "POST",
      headers: { "x-admin-key": "wrong", "Content-Type": "application/json" },
      body: JSON.stringify({ teamId: TEAM, amount: 500 }),
    })
    expect((await postGrantCredits(badKey, env)).status).toBe(403)
    expect((await postGrantCredits(grant({ teamId: TEAM, amount: -5 }), env)).status).toBe(400)
    expect((await postGrantCredits(grant({ teamId: TEAM, amount: 1.5 }), env)).status).toBe(400)
    expect(grants(db), "nothing was granted, so nothing may be recorded").toEqual([])
  })

  it("the money and the record commit together — neither can land alone", async () => {
    // THE NEGATIVE CONTROL, and the reason the two writes share a `batch`. With
    // the record's table missing, the whole statement fails and the balance must
    // NOT have moved: a top-up that quietly succeeded while its audit row failed
    // is precisely the untraceable grant, only now it looks fixed.
    db.exec("DROP TABLE credit_grants")
    await expect(postGrantCredits(grant({ teamId: TEAM, amount: 500 }), env)).rejects.toThrow()
    const row = db.prepare("SELECT balance FROM agent_credits WHERE team_id = ?").get(TEAM)
    expect(row, "no record means no money").toBeUndefined()
  })
})
