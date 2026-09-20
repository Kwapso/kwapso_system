// T3653 — "New tickets/stories created without a serial number/ID."
//
// FIRST DIAGNOSIS: `createTicket`/`createStory` minted a reference only when
// `accountId` was truthy at birth, so a ticket/story raised with no client
// and later given one kept `ref` NULL for ever. Proved on staging: ticket
// 01M2MWDFKHGPPAXS0QJTFC6MYT carries a real `account_id` and `ref IS NULL`.
// A first fix minted inline inside `updateTicket`/`updateStory` on that
// null→set transition, and R55 (`web/test/refs-match-the-formula.test.ts`,
// "only the one mint writes a reference, and nothing updates one in place")
// correctly refused it — an unconditional, no-exemption law.
//
// THE OWNER'S RULING: the `accountId` gate at CREATE was itself the bug — a
// holdover from the account-CODED reference shape, where an account was a
// structural input to the string; migration 0059 dropped the account code
// from the format entirely, and the gate outlived the reason it existed for.
// Every ticket and story now gets a number AT CREATE, account or not, which
// is the one act R55 always allowed — so the update path needs no minting
// logic at all, and the "named later" gap cannot recur for any row created
// from here on. Migration 0098 backfills every EXISTING `ref IS NULL` row,
// account or not, the one-time act R55 permits for what the old gate left
// behind.
//
// Driven through the real route handlers against a real SQLite database
// running the real team migrations — the shape every other door-level suite
// here uses, not a source scan, because this is a behavioural promise.

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

const call = (userId: string, route: string, body?: unknown) => {
  const [method, path] = route.split(" ")
  return worker.fetch(
    new Request(`https://content${path}`, {
      method,
      headers: { Cookie: "session=x", "Content-Type": "application/json" },
      body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
    }),
    env(userId) as never
  )
}

beforeEach(() => {
  holder.db = buildSpineDb()
})

describe("T3653 — every ticket gets a number at birth, account or not", () => {
  it("mints a reference for an accountless ticket immediately, not just once a client is named", async () => {
    const raised = await call(IDS.staffUser, "POST /api/content/help", {
      description: "Our own internal question, nobody outside asked it",
      appId: IDS.victimApp,
    })
    expect(raised.status).toBe(200)
    const row = db().prepare(`SELECT ref, account_id FROM help ORDER BY created_at DESC LIMIT 1`).get() as {
      ref: string | null
      account_id: string | null
    }
    expect(row.account_id, "born with no client — that part is unchanged").toBeNull()
    expect(row.ref, "but a number is minted regardless — no client to quote it yet, no matter").toMatch(
      /^T\d{4}$/
    )
  })

  it("naming a client afterward leaves the reference exactly where it already was", async () => {
    const raised = await call(IDS.staffUser, "POST /api/content/help", {
      description: "Our own internal question, nobody outside asked it",
      appId: IDS.victimApp,
    })
    expect(raised.status).toBe(200)
    const id = (
      db().prepare(`SELECT id FROM help ORDER BY created_at DESC LIMIT 1`).get() as { id: string }
    ).id
    const minted = (db().prepare(`SELECT ref FROM help WHERE id = ?`).get(id) as { ref: string }).ref
    expect(minted).toMatch(/^T\d{4}$/)

    const edited = await call(IDS.staffUser, "POST /api/content/help/update", {
      id,
      description: "Our own internal question, nobody outside asked it",
      accountId: IDS.victimAccount,
    })
    expect(edited.status).toBe(200)
    const after = db().prepare(`SELECT ref, account_id FROM help WHERE id = ?`).get(id) as {
      ref: string | null
      account_id: string | null
    }
    expect(after.account_id).toBe(IDS.victimAccount)
    expect(after.ref, "the number was already there — naming a client neither adds nor changes it").toBe(
      minted
    )
  })

  it("never re-mints a reference a ticket already carries", async () => {
    const raised = await call(IDS.staffUser, "POST /api/content/help", {
      description: "Bergman's own question",
      appId: IDS.victimApp,
      accountId: IDS.victimAccount,
    })
    expect(raised.status).toBe(200)
    const id = (
      db().prepare(`SELECT id FROM help ORDER BY created_at DESC LIMIT 1`).get() as { id: string }
    ).id
    const minted = (db().prepare(`SELECT ref FROM help WHERE id = ?`).get(id) as { ref: string }).ref
    expect(minted).toMatch(/^T\d{4}$/)

    const edited = await call(IDS.staffUser, "POST /api/content/help/update", {
      id,
      description: "Bergman's own question, reworded",
      accountId: IDS.victimAccount,
    })
    expect(edited.status).toBe(200)
    const after = db().prepare(`SELECT ref FROM help WHERE id = ?`).get(id) as { ref: string }
    expect(after.ref).toBe(minted)
  })
})

describe("T3653 — every story gets a number at birth, account or not", () => {
  it("mints a reference for an accountless story immediately", async () => {
    const created = await call(IDS.staffUser, "POST /api/content/stories", {
      title: "Our own upkeep, nobody outside asked for it",
      storyType: "Feature",
      changesNoStep: true,
    })
    expect(created.status).toBe(200)
    const row = db()
      .prepare(`SELECT ref, account_id FROM stories ORDER BY created_at DESC LIMIT 1`)
      .get() as { ref: string | null; account_id: string | null }
    expect(row.account_id).toBeNull()
    expect(row.ref).toMatch(/^B\d{4}$/)
  })

  it("re-pointing an accountless story at a client afterward leaves its reference exactly where it was", async () => {
    await call(IDS.staffUser, "POST /api/content/help", {
      description: "Our own internal question",
      appId: IDS.victimApp,
    })
    const ticketId = (
      db().prepare(`SELECT id FROM help ORDER BY created_at DESC LIMIT 1`).get() as { id: string }
    ).id

    const created = await call(IDS.staffUser, "POST /api/content/stories", {
      title: "Work against our own question",
      storyType: "Feature",
      changesNoStep: true,
      ticketId,
    })
    expect(created.status).toBe(200)
    const storyId = (
      db().prepare(`SELECT id FROM stories ORDER BY created_at DESC LIMIT 1`).get() as { id: string }
    ).id
    const minted = (
      db().prepare(`SELECT ref FROM stories WHERE id = ?`).get(storyId) as { ref: string }
    ).ref
    expect(minted).toMatch(/^B\d{4}$/)

    // Now the TICKET is named — the story's own update re-derives its account
    // from the ticket exactly as `resolveAccount` always has.
    await call(IDS.staffUser, "POST /api/content/help/update", {
      id: ticketId,
      description: "Our own internal question",
      accountId: IDS.victimAccount,
    })

    const edited = await call(IDS.staffUser, "POST /api/content/stories/update", {
      id: storyId,
      title: "Work against our own question",
      storyType: "Feature",
      category: "Enabler",
      changesNoStep: true,
      ticketId,
    })
    expect(edited.status).toBe(200)
    const after = db().prepare(`SELECT ref, account_id FROM stories WHERE id = ?`).get(storyId) as {
      ref: string | null
      account_id: string | null
    }
    expect(after.account_id).toBe(IDS.victimAccount)
    expect(after.ref, "no re-mint — the story already had its number").toBe(minted)
  })

  it("never re-mints a reference a story already carries", async () => {
    const created = await call(IDS.staffUser, "POST /api/content/stories", {
      title: "Bergman's own work",
      storyType: "Feature",
      changesNoStep: true,
      accountId: IDS.victimAccount,
    })
    expect(created.status).toBe(200)
    const storyId = (
      db().prepare(`SELECT id FROM stories ORDER BY created_at DESC LIMIT 1`).get() as { id: string }
    ).id
    const minted = (
      db().prepare(`SELECT ref FROM stories WHERE id = ?`).get(storyId) as { ref: string }
    ).ref
    expect(minted).toMatch(/^B\d{4}$/)

    const edited = await call(IDS.staffUser, "POST /api/content/stories/update", {
      id: storyId,
      title: "Bergman's own work, reworded",
      storyType: "Feature",
      category: "Client-requested",
      changesNoStep: true,
      accountId: IDS.victimAccount,
    })
    expect(edited.status).toBe(200)
    const after = db().prepare(`SELECT ref FROM stories WHERE id = ?`).get(storyId) as { ref: string }
    expect(after.ref).toBe(minted)
  })
})
