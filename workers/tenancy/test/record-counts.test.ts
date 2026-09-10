// THE BADGE DOOR, tenancy's half — the systems built for a client, the packages
// of work sold to them, and the maps inside a system. Driven through the SHIPPED
// route handler against a real SQLite database running the real team migrations.
//
// The reasoning is written once, on content's half
// (workers/content/test/record-counts.test.ts). What is worth locking HERE is
// the same four things and one more that only this worker can get wrong:
//
//   A COLLECTION IS BEHIND ITS OWN MODULE, so a role that may open a record and
//   not one of its tabs is answered `null` rather than `0` — and a `0` would
//   tell a developer, in a badge, that the collection is empty.
//
//   THE FIXTURE MOVED ON 10 SEP 2026. That case used to be the RATE CARD, on
//   `commercials`, which the shared fixture's role has never held — the honest
//   `null` meaning "this client's agreed prices are not yours to count". The
//   client retired the rate card ("the whole account rates also killed it"), so
//   the case moved to WAVES, on `work`. Every tenancy-owned collection is now on
//   a module the fixture DOES hold, so the right is taken away explicitly rather
//   than found already missing — the same `withoutRight` shape
//   workers/tenancy/test/query-fence.test.ts uses one file along. That is a
//   weaker accident and a stronger test: the revocation is deliberate and the
//   assertion says which module it was.

import type { DatabaseSync } from "node:sqlite"
import { beforeEach, describe, expect, it, vi } from "vitest"

const holder = vi.hoisted(() => ({ db: null as DatabaseSync | null }))

vi.mock("@shared/workers/d1-rest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/d1-rest")>()
  const { d1Impl } = await import("./d1-sqlite")
  return { ...actual, ...d1Impl(() => holder.db as DatabaseSync) }
})

import worker from "../src/index"
import { buildSpineDb, IDS, makeEnv } from "./spine-harness"
import { childrenFor, RECORD_CHILDREN, type RecordCounts } from "@shared/record-counts"

const db = () => holder.db as DatabaseSync

const ask = (userId: string, table: string, id: string) =>
  worker.fetch(
    new Request(
      `https://tenancy/api/tenancy/record-counts?table=${encodeURIComponent(table)}&id=${encodeURIComponent(id)}`,
      { headers: { Cookie: "session=x" } }
    ),
    makeEnv(() => db(), userId) as never
  )

const counts = async (userId: string, table: string, id: string) =>
  ((await (await ask(userId, table, id)).json()) as RecordCounts).counts

beforeEach(() => {
  holder.db = buildSpineDb()
})

describe("the record-counts door (tenancy)", () => {
  it("refuses a client login outright (R21)", async () => {
    const res = await ask(IDS.contactUser, "accounts", IDS.victimAccount)
    expect(res.status).toBe(403)
    expect(((await res.json()) as { error: string }).error).toBe("client_login")
  })

  it("answers only for a record kind the registry knows (R20)", async () => {
    expect((await ask(IDS.staffUser, "invoices", IDS.victimAccount)).status).toBe(400)
  })

  // THE ONE THE OWNER REPORTED, at the door: the fixture's client already has a
  // system built for it, so its Apps badge is answerable before anybody has
  // opened the tab.
  it("counts the systems built for one client", async () => {
    const body = await counts(IDS.staffUser, "accounts", IDS.victimAccount)
    expect(body["apps-account"]).toBe(1)
    // Nothing here for a collection this worker does not own — the sprints and
    // to-dos are content's, and the screen merges the two answers.
    expect("sprints-account" in body).toBe(false)
  })

  it("counts the ways of working mapped inside one system", async () => {
    const body = await counts(IDS.staffUser, "apps", IDS.victimApp)
    // TWO maps on the victim's system — the invoice approval and the goods
    // receipt. The second exists so the process-LINK door can be attacked with
    // two real records rather than being refused for self-connection.
    expect(body["processes-app"]).toBe(2)
    // A system nobody has mapped yet answers 0 rather than nothing — "we have
    // mapped none of this" is a fact, and the badge renders it as no badge.
    db()
      .prepare(
        `INSERT INTO apps (id, account_id, name, tool_cost_cents_per_month, created_at, creator_id)
         VALUES ('AP_FRESH', ?, 'Fresh system', 0, '2026-03-01', ?)`
      )
      .run(IDS.victimAccount, IDS.staffUser)
    expect((await counts(IDS.staffUser, "apps", "AP_FRESH"))["processes-app"]).toBe(0)
  })

  // R18, and the reason this door has no single gate of its own.
  it("hands back null — never zero — for a collection a role may not see (R18)", async () => {
    // THE ROW IS REALLY THERE, or the `null` below means nothing: a count that
    // is withheld and a count that is genuinely absent look identical from the
    // outside, which is the whole failure this case is about.
    db()
      .prepare(
        `INSERT INTO waves (id, account_id, name, created_at, creator_id)
         VALUES ('WV1', ?, 'Autumn package', '2026-02-01', ?)`
      )
      .run(IDS.victimAccount, IDS.staffUser)
    expect(
      (db().prepare("SELECT COUNT(*) AS n FROM waves WHERE account_id = ?").get(IDS.victimAccount) as { n: number }).n,
      "the wave must exist before its badge can be withheld"
    ).toBe(1)

    // Take the right away — deliberately, from a role that holds it — and the
    // badge must go blank rather than say zero.
    db().prepare(`DELETE FROM role_permissions WHERE role_id = ? AND module = 'work'`).run(IDS.adminRole)
    const body = await counts(IDS.staffUser, "accounts", IDS.victimAccount)
    expect(body["waves-account"], "a collection this role may not read is null, never 0").toBeNull()
    // …and the apps figure beside it, on a module they DO hold, is a number. One
    // right per collection, never one standing in for three.
    expect(body["apps-account"]).toBe(1)

    // Give it back, and the same call now says how many packages there are. The
    // count is real rather than a placeholder — a `null` that never becomes a
    // number is a permission nobody can tell from a broken counter.
    db()
      .prepare(
        `INSERT INTO role_permissions (id, role_id, module, can_read, can_create, can_edit, can_delete)
         VALUES ('R_WORK', ?, 'work', 1, 1, 1, 1)`
      )
      .run(IDS.adminRole)
    expect((await counts(IDS.staffUser, "accounts", IDS.victimAccount))["waves-account"]).toBe(1)
  })

  // The registry is the contract between three surfaces (this door, the screen,
  // the live layer). A line with no counter behind it would answer `null` and
  // read exactly like a missing permission — which is the failure this door was
  // built to end — so every line this worker owes is proved to produce a NUMBER
  // for a caller holding every right, derived from the registry itself.
  it("answers every collection the registry says this worker owes", async () => {
    // NO EXTRA GRANT IS NEEDED ANY MORE. This case used to open by granting
    // `commercials` so the rate-card badge would answer a number; the card was
    // retired on 10 Sep 2026 and every tenancy-owned collection now sits on a
    // module the shared fixture's role already holds. If a future collection
    // lands on a module it does not, this case fails with the key named — which
    // is the right outcome, because the grant belongs beside the collection.
    const ids: Record<string, string> = {
      accounts: IDS.victimAccount,
      apps: IDS.victimApp,
      help: IDS.victimTicket,
      sprints: "SP_NONE",
    }
    const owed = Object.keys(RECORD_CHILDREN).flatMap((table) =>
      childrenFor(table, "tenancy").map((c) => [table, c.key] as const)
    )
    expect(owed.length, "the registry scan found nothing — it has gone blind").toBeGreaterThan(2)
    for (const [table, key] of owed) {
      const body = await counts(IDS.staffUser, table, ids[table])
      expect(typeof body[key], `${table}.${key} has no counter behind it`).toBe("number")
    }
  })
})
