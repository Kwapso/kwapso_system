// THE BACKFILL WATERMARK UNDERCOUNT (12 Sep 2026) — a window holding more real
// items than the ingest's own per-tick cap (`INGEST_SOURCES_PER_TICK`, 25) but
// fewer than GOOGLE's own page ceiling (`GMAIL_SWEEP_PAGES × GOOGLE_PAGE_SIZE`,
// 200 for mail) used to read as "fully covered" — `truncated` asked only
// whether GOOGLE stopped early, never whether the INGEST filed everything
// Google handed back. The watermark advanced past the whole window regardless,
// so the un-filed remainder was gone for good: no later tick ever revisits
// ground the watermark has already moved past. Measured on real staging: mail
// stopped 5 weeks back, declaring itself caught up, against years of real
// history — gmail's own `messages.list` has no ordering and always returns
// newest-first, so its live/forward read can never walk backward on its own
// to quietly recover what a falling tick skipped.
//
// AGAINST THE SHAPE, NOT A SERVICE (the hub's own instruction): gmail is the
// one direction with no self-healing forward read, so it is also the one
// whose loss is unrecoverable and the one this proof is built against — a
// window with real, dated mail comfortably over 25 and comfortably under 200.
//
// PROVED BY RUNNING, not by reading — same discipline as google-ingest.test.ts
// beside it: the real route, the real sweep engine, a bounded Gmail mock that
// actually RESPECTS the after:/before: terms the falling walk sends, so a
// wrongly-built query would show up here as "found nothing" rather than being
// assumed correct.

import type { DatabaseSync } from "node:sqlite"
import { beforeEach, describe, expect, it, vi } from "vitest"

const holder = vi.hoisted(() => ({ db: null as DatabaseSync | null }))

vi.mock("@shared/workers/d1-rest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/d1-rest")>()
  const { d1Impl } = await import("../../tenancy/test/d1-sqlite")
  return { ...actual, ...d1Impl(() => holder.db as DatabaseSync) }
})

vi.mock("../src/lib/google-crypto", () => ({
  sealToken: async (_e: unknown, v: string) => v,
  openToken: async (_e: unknown, v: string) => v,
  tokenStorageReady: () => true,
}))

// 90 REAL THREADS, one a day, all with a known contact so filing never refuses
// them — spread across the window a single falling-backfill tick will read.
// Comfortably over INGEST_SOURCES_PER_TICK (25); comfortably under
// GMAIL_SWEEP_PAGES × GOOGLE_PAGE_SIZE (200), so Google's OWN read is never
// truncated — the only way the old bug could ever be triggered by a real
// mailbox, and the exact shape staging measured.
const NOW = new Date()
const THREAD_COUNT = 90
const THREADS = Array.from({ length: THREAD_COUNT }, (_, i) => {
  const at = new Date(NOW.getTime() - (10 + i) * 24 * 60 * 60 * 1000) // starts 10 days back, one/day older
  return {
    id: `MAIL_${i}`,
    threadId: `TH_${i}`,
    from: "Luis Vera <luis@bergman.example>",
    to: "me@kwapso.app",
    subject: `Bergman update ${i}`,
    snippet: "a snippet",
    date: at.toUTCString(),
    url: `https://mail.example/MAIL_${i}`,
    text: `Update number ${i} about the Bergman rollout.`,
    epochSec: Math.floor(at.getTime() / 1000),
  }
})

vi.mock("../src/lib/google-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/google-api")>()
  return {
    ...actual,
    googlePresence: async () => "there",
    driveList: async () => [],
    driveFileText: async () => "",
    calendarList: async () => ({ truncated: false, events: [] }),
    chatSpacesList: async () => [],
    chatMessages: async () => ({ messages: [], learned: new Map(), truncated: false }),
    // RESPECTS after:/before:, exactly like the real Gmail API does (confirmed
    // against Google's own filtering docs — epoch seconds is documented,
    // supported syntax) — a wrongly-built query bound would show up here as
    // an empty or wrong-sized result, not be assumed away.
    gmailSearch: async (_token: string, _contactQuery: string, search?: string) => {
      // ISOLATES THE BACKFILL, ON PURPOSE: only the falling walk ever sets
      // after:/before: (google-read.ts's own comment on GoogleReadRequest.from/
      // to says so). The ordinary forward/live read asks with neither, and
      // returning nothing for THAT call keeps this proof about the backfill's
      // own watermark arithmetic, not about the two reads' merge order.
      const afterMatch = /after:(\d+)/.exec(search ?? "")
      const beforeMatch = /before:(\d+)/.exec(search ?? "")
      if (!afterMatch && !beforeMatch) return []
      const afterSec = afterMatch ? Number(afterMatch[1]) : -Infinity
      const beforeSec = beforeMatch ? Number(beforeMatch[1]) : Infinity
      return THREADS.filter((t) => t.epochSec > afterSec && t.epochSec < beforeSec)
    },
    gmailMessage: async (_token: string, id: string) => {
      const t = THREADS.find((x) => x.id === id)!
      return { ...t }
    },
  }
})

import worker from "../src/index"
import { buildSpineDb, IDS, makeEnv } from "../../tenancy/test/spine-harness"

const db = () => holder.db as DatabaseSync

function env(userId: string) {
  const base = makeEnv(() => db(), userId) as unknown as Record<string, unknown>
  return {
    ...base,
    AI: { run: async () => ({ data: [[1, 0, 0]] }) },
    REALTIME: { fetch: async () => new Response("{}") },
  } as never
}

function call(userId: string, route: string, body?: unknown) {
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

const CONTACT = "A_BACKFILL_CONTACT"

beforeEach(() => {
  holder.db = buildSpineDb()
  db().exec(
    `INSERT INTO google_connections (id, user_id, service, google_email, scopes, access_token, access_expires_at, refresh_token, created_at, creator_id)
     VALUES ('C1', '${IDS.staffUser}', 'gmail', 'me@kwapso.app', 'scope', 'plain-access', '${new Date(Date.now() + 3_600_000).toISOString()}', 'plain-refresh', '2026-01-01', '${IDS.staffUser}');
     INSERT INTO accounts (id, account_type, parent_account_id, name, email, created_at, creator_id)
       VALUES ('${CONTACT}', 'individual', '${IDS.victimAccount}', 'Luis Vera', 'luis@bergman.example', '2026-01-01', '${IDS.staffUser}');`
  )
  db().exec(
    `INSERT INTO role_permissions (id, role_id, module, can_read, can_create, can_edit, can_delete)
     VALUES ('${IDS.adminRole}_knowledge', '${IDS.adminRole}', 'knowledge', 1, 1, 1, 1);
     INSERT INTO role_permissions (id, role_id, module, can_read, can_create, can_edit, can_delete)
     VALUES ('${IDS.adminRole}_google', '${IDS.adminRole}', 'google', 1, 1, 1, 1);`
  )
})

describe("the falling backfill watermark does not advance past a window it could not fully file", () => {
  it("orphans no real, in-window thread — every UNFILED thread's date must still be reachable by a later, older tick", async () => {
    const res = await call(IDS.staffUser, "POST /api/content/knowledge/sync-google", {})
    expect(res.status, await res.text()).toBe(200)

    const filedTitles = new Set(
      (
        db()
          .prepare("SELECT title FROM knowledge_sources WHERE origin_table='google_gmail'")
          .all() as { title: string }[]
      ).map((r) => r.title)
    )
    const cursorRow = db()
      .prepare("SELECT backfilled_through FROM knowledge_ingest WHERE kind LIKE 'email:%'")
      .get() as { backfilled_through: string | null }

    // THE INGEST CAP BIT: comfortably fewer than the real threads within one
    // 90-day window (80 of the 90 seeded — the other 10 sit outside it).
    expect(filedTitles.size).toBeLessThan(80)
    expect(filedTitles.size).toBeGreaterThan(0)
    expect(cursorRow.backfilled_through, "must not have declared itself done after one tick").not.toBe("caught-up")
    const watermark = Date.parse(cursorRow.backfilled_through ?? "")

    // THE ACTUAL PROOF: a falling walk may only ever move OLDER — so any real
    // thread that was NOT filed this tick, and whose own date is NEWER than
    // (after) the watermark the walk just wrote, is orphaned. No future tick
    // reads a window newer than the watermark; that thread is gone for good.
    // One such thread is the bug; zero is the fix.
    const orphaned = THREADS.filter(
      (t) => t.epochSec > NOW.getTime() / 1000 - 90 * 24 * 60 * 60 // inside the first (falling) window
    )
      .filter((t) => !filedTitles.has(`Bergman update ${t.id.replace("MAIL_", "")}`))
      .filter((t) => Date.parse(t.date) > watermark)
    expect(
      orphaned.map((t) => t.subject),
      "real, in-window threads left NEWER than the watermark that just advanced past them — a later tick only reads OLDER ground, so these can never be filed"
    ).toEqual([])
  })
})
