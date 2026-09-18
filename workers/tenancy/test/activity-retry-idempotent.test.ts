// BUILD-5 §J (18 Sep 2026), report open item 5. Observed live: `UNIQUE
// constraint failed: activity.id` during a heavy concurrent run. `ulid()`
// draws 16 bytes of real randomness (crypto.getRandomValues) — two
// independent calls colliding is not a real risk, so "the mint" was never
// broken. What broke: the id is minted ONCE per logical write and carried
// into `d1ExecScript`'s own script text; that script's own retry loop
// (`cfRaw` in shared/workers/d1-rest.ts) can resend the identical script,
// id and all, when a write TIMES OUT client-side after already succeeding
// on D1's — the response was lost, not the write. The insert is the same
// row arriving twice, not two writers racing, and a PRIMARY KEY violation
// on a byte-identical retried INSERT is the write failing to be idempotent.
// Fixed with `INSERT OR IGNORE` in shared/workers/activity.ts. This proves
// it through the real functions, with a mocked ulid() standing in for two
// attempts that mint the SAME id — the shape a lost-response retry actually
// produces, not a fabricated collision between two different ids.

import type { DatabaseSync } from "node:sqlite"
import { beforeEach, describe, expect, it, vi } from "vitest"

const holder = vi.hoisted(() => ({ db: null as DatabaseSync | null }))

vi.mock("@shared/workers/d1-rest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/d1-rest")>()
  const { d1Impl } = await import("./d1-sqlite")
  return { ...actual, ...d1Impl(() => holder.db as DatabaseSync) }
})

import { logActivity, writeActivity } from "@shared/workers/activity"
import type { D1Rest } from "@shared/workers/d1-rest"
import * as idModule from "@shared/workers/id"
import { buildSpineDb, IDS } from "./spine-harness"

/** THE SAME ID BOTH TIMES — exactly what a retried, already-minted script
 * carries. A fresh ulid() per call would prove nothing about a retry; it
 * would just be two ordinary, unrelated rows. Spied AFTER the fixture is
 * seeded (the seed mints its own real ids and must not collide with itself),
 * so only the two calls under test are pinned. */
function pinNextTwoUlidCalls(id: string) {
  const spy = vi.spyOn(idModule, "ulid")
  spy.mockReturnValueOnce(id).mockReturnValueOnce(id)
}

const db = () => holder.db as DatabaseSync
const cfg = { accountId: "acct", apiToken: "token" } as D1Rest
const actor = { id: IDS.staffUser, email: "staff@kwapso.app", name: "Staff" }
const entry = { type: "Test event", description: "A test event happened." }

beforeEach(() => {
  holder.db = buildSpineDb()
})

describe("a retried activity write — the same id twice — is not an error", () => {
  it("writeActivity: the second, identical send does not throw, and only one row lands", async () => {
    pinNextTwoUlidCalls("01RETRIEDACTIVITYROWIDXXXX")
    await expect(writeActivity(cfg, "db_team", actor, entry)).resolves.toBeUndefined()
    await expect(writeActivity(cfg, "db_team", actor, entry)).resolves.toBeUndefined()

    const rows = db().prepare("SELECT id, description FROM activity WHERE id = ?").all("01RETRIEDACTIVITYROWIDXXXX")
    expect(rows).toHaveLength(1)
  })

  it("logActivity: the same shape through the swallow-and-log wrapper — still just one row, nothing thrown out of it either", async () => {
    pinNextTwoUlidCalls("01RETRIEDACTIVITYROWIDYYYY")
    // logActivity never throws either way (that is its whole contract) — the
    // regression this guards is the ROW, not the promise: before the fix, the
    // second call's UNIQUE-constraint throw was swallowed and reported exactly
    // like a genuine lost write, for a row that, this time, really was written
    // the first time.
    await expect(logActivity(cfg, "db_team", actor, entry)).resolves.toBeUndefined()
    await expect(logActivity(cfg, "db_team", actor, entry)).resolves.toBeUndefined()

    const rows = db().prepare("SELECT id FROM activity WHERE id = ?").all("01RETRIEDACTIVITYROWIDYYYY")
    expect(rows).toHaveLength(1)
  })
})
