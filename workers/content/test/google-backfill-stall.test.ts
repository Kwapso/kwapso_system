// THE SECOND HALF OF THE 12 SEP 2026 FIX — advanceRisingBackfill/
// advanceFallingBackfill correctly stopped crediting a window as covered when
// `incomplete` was true and a real boundary was found. They still fell
// through to the UNCONDITIONAL advance (`next = window.from`/`window.to`)
// when `incomplete` was true but the boundary itself was unusable — every row
// this tick filed had no parseable date, so `boundary` (backfillRows' own
// `rows.map(r => r.sortAt).filter(Boolean)`) came back empty even though real
// rows were written. That is the SAME bug wearing a different coat: crediting
// a window the tick never actually covered.
//
// THIS SUITE proves both halves of the round-two fix, end to end through the
// real sweep door (same discipline as google-backfill-watermark.test.ts
// beside it — real SQLite, real migrations, a Gmail mock that respects the
// after:/before: bound it is asked for):
//   • the watermark REFUSES to advance past the window when this happens —
//     it stays exactly where it started, so the next tick retries the same
//     ground instead of abandoning it;
//   • the stall is RECORDED to error_logs (`recordWorkerError`), not merely
//     left to a console line nobody is watching — the gap that let the
//     ORIGINAL watermark-undercount hide for months.

import type { DatabaseSync } from "node:sqlite"
import { beforeEach, describe, expect, it, vi } from "vitest"

const holder = vi.hoisted(() => ({ db: null as DatabaseSync | null }))

// Same shape as knowledge-catchup-records.test.ts's own spy — explicit
// param/return types so a later `.mockClear()` cannot silently widen it.
const { recordWorkerError } = vi.hoisted(() => ({
  recordWorkerError: vi.fn(
    async (
      _db: unknown,
      _source: string,
      _place: string,
      _e: unknown,
      _requestId?: string,
      _who?: { teamId?: string; userId?: string }
    ): Promise<void> => {}
  ),
}))

vi.mock("@shared/workers/error-log", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/error-log")>()
  return { ...actual, recordWorkerError }
})

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

// FIFTY THREADS, one every day, ALL WITH AN UNPARSEABLE DATE — comfortably
// over INGEST_SOURCES_PER_PRESS (40, what `POST .../sync-google` actually
// passes as its cap — not the cron's own INGEST_SOURCES_PER_TICK), so the
// falling walk's own cap bites and `incomplete` is true from the cap alone
// (comfortably under GMAIL_SWEEP_PAGES × GOOGLE_PAGE_SIZE, so Google's OWN
// truncation signal stays false — this is isolating the SAME gap the
// cap-vs-ceiling fix isolated, one level deeper). `epochSec` (what the
// mock's after:/before: filter actually reads) is real and ordered; `date`
// (what `moment()` turns into `sortAt`) is empty on every one, so every
// filed row's boundary is unusable — the exact shape that used to fall
// through to an unconditional advance.
const NOW = new Date()
const THREAD_COUNT = 50
const THREADS = Array.from({ length: THREAD_COUNT }, (_, i) => {
  const at = new Date(NOW.getTime() - (10 + i) * 24 * 60 * 60 * 1000)
  return {
    id: `MAIL_${i}`,
    threadId: `TH_${i}`,
    from: "Luis Vera <luis@bergman.example>",
    to: "me@kwapso.app",
    subject: `Bergman update ${i}`,
    snippet: "a snippet",
    // UNPARSEABLE ON PURPOSE — see the header above.
    date: "",
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
    gmailSearch: async (_token: string, _contactQuery: string, search?: string) => {
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

const CONTACT = "A_BACKFILL_STALL_CONTACT"

beforeEach(() => {
  recordWorkerError.mockClear()
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

describe("a falling backfill tick that files nothing with a usable date stalls loudly instead of advancing", () => {
  it("does not move the watermark past the window, and records the stall", async () => {
    const res = await call(IDS.staffUser, "POST /api/content/knowledge/sync-google", {})
    expect(res.status, await res.text()).toBe(200)

    // SOME rows were filed — this is not the "genuinely nothing here" case
    // (that one is already covered, correctly, by google-backfill-watermark's
    // "not truncated" branch). The cap bit at 40 of 50 real threads.
    const filed = db()
      .prepare("SELECT COUNT(*) n FROM knowledge_sources WHERE origin_table='google_gmail'")
      .get() as { n: number }
    expect(filed.n).toBe(40)

    const cursorRow = db()
      .prepare("SELECT backfilled_through FROM knowledge_ingest WHERE kind LIKE 'email:%'")
      .get() as { backfilled_through: string | null }

    // THE WATERMARK STAYED PUT. Before the round-two fix this fell through to
    // `window.from` — crediting the whole window despite none of the filed
    // rows carrying a date the walk could trust — which is exactly what
    // `advanceFallingBackfill`'s new guard refuses to do. `window.to` here is
    // "now" (the walk's very first tick, state.through was null), so a
    // watermark that stayed put reads back as "caught-up" being FALSE and the
    // position being recent, never the far edge a real advance would reach.
    expect(cursorRow.backfilled_through, "must not read as done").not.toBe("caught-up")
    const watermark = Date.parse(cursorRow.backfilled_through ?? "")
    const tenDaysAgo = NOW.getTime() - 10 * 24 * 60 * 60 * 1000
    expect(
      watermark,
      "the watermark must not have advanced past the near edge of the window it just failed to cover"
    ).toBeGreaterThan(tenDaysAgo - 1000)

    // AND IT SAID SO. One row, naming the stalled kind.
    expect(recordWorkerError).toHaveBeenCalledTimes(1)
    const [, source, place, err] = recordWorkerError.mock.calls[0]
    expect(source).toBe("content")
    expect(place).toMatch(/knowledge\/backfill-stalled/)
    expect((err as Error).message).toMatch(/filed none of it with a usable date/)
  })
})
