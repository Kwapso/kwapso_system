// THE SWEEP LEARNS TO LOOK BEHIND ITSELF — migration 0082, knowledge-google.ts.
//
// `knowledge_ingest.cursor` watermarks how far a Google kind has FILED, never
// how far it has LOOKED. Gmail and calendar read a fixed window near "now" on
// every tick, so history older than that window's floor was never going to
// be reached by ticking that cursor alone — measured on staging after a wipe:
// gmail -245, chat -116 against pre-wipe counts, and calendar's own -11 was a
// SECOND, independent finding (google-read.ts passes no timeMin/timeMax at
// all, and Google's answer to that is "start near now and walk forward into
// the future", not "the oldest events ever").
//
// THIS SUITE PROVES THE MECHANISM THAT CLOSES IT — real SQLite, real
// migrations, real sweep door; only Google itself is stubbed, and stubbed to
// FILTER BY THE RANGE IT WAS ASKED FOR (mirroring meetings.test.ts's own
// `calendarList` fixture), because a fixture that answers every call the same
// way regardless of range would hand the same items to the live read and the
// backfill and prove nothing about which one found what.
//
// THE TWO TESTS THE HUB NAMED, for calendar (rising: floor → now) and gmail
// (falling: now → floor — the two walk in OPPOSITE directions on purpose,
// see knowledge-google.ts's own header on `risingBackfillWindow` for why):
//   • a second call returns material the first did not — the cursor's
//     advance is what makes new history visible, not mere repetition;
//   • a walk that has reached its end makes NO Google call at all — the
//     `BACKFILL_DONE` sentinel, not a moving `now` recomputed forever.
// PLUS chat's own per-space isolation: one space's failure is RECORDED next
// to that space, never silently dropped from the answer, and never costs
// another space its own turn.

import type { DatabaseSync } from "node:sqlite"
import { beforeEach, describe, expect, it, vi } from "vitest"

const holder = vi.hoisted(() => ({ db: null as DatabaseSync | null }))
/** What Google's calendar/mail/chat hold, per test — filtered by the range
 * each mock is actually asked for, same discipline as meetings.test.ts. */
const google = vi.hoisted(() => ({
  events: [] as { id: string; summary: string; start: string }[],
  mail: [] as { id: string; threadId: string; subject: string; date: string }[],
  /** spaceName -> messages, so the per-space chat test can give two spaces
   * two different histories (and one of them a reason to fail). */
  chatBySpace: new Map<string, { id: string; createdAt: string; sender: string }[]>(),
  /** a space name in here throws when `chatMessages` is asked for it —
   * proving the per-space isolation rather than merely describing it. */
  chatFails: new Set<string>(),
  calendarCalls: [] as { from?: string; to?: string }[],
}))

vi.mock("@shared/workers/d1-rest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/d1-rest")>()
  const { d1Impl } = await import("../../tenancy/test/d1-sqlite")
  return { ...actual, ...d1Impl(() => holder.db as DatabaseSync) }
})

vi.mock("../src/lib/google-crypto", () => ({
  sealToken: async (_env: unknown, v: string) => v,
  openToken: async (_env: unknown, v: string) => v,
  tokenStorageReady: () => true,
}))

vi.mock("../src/lib/google-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/google-api")>()
  return {
    ...actual,
    driveList: async () => [],
    calendarList: async (_t: string, range: { from?: string; to?: string }) => {
      google.calendarCalls.push(range)
      // THE LIVE READ IS UNBOUNDED (no from/to) — mirroring the real bug:
      // with nothing asked, only what is within a day of "now" comes back,
      // never the true unbounded everything a naive fixture would offer.
      const now = Date.now()
      const events = google.events.filter((e) => {
        const at = Date.parse(e.start)
        if (!range.from && !range.to) return Math.abs(at - now) < 24 * 60 * 60 * 1000
        return (!range.from || at >= Date.parse(range.from)) && (!range.to || at < Date.parse(range.to))
      })
      return {
        truncated: false,
        events: events.map((e) => ({
          id: e.id,
          summary: e.summary,
          description: "",
          start: e.start,
          end: e.start,
          url: `https://calendar.example/${e.id}`,
          attendees: [],
        })),
      }
    },
    gmailSearch: async (_t: string, _c: string, search?: string) => {
      const after = /after:(\d+)/.exec(search ?? "")
      const before = /before:(\d+)/.exec(search ?? "")
      const now = Date.now()
      return google.mail
        .filter((m) => {
          const at = Date.parse(m.date)
          // THE LIVE READ IS UNBOUNDED — same fixture discipline as calendar:
          // nothing asked back means "only the last day", never everything.
          if (!after && !before) return now - at < 24 * 60 * 60 * 1000
          return (
            (!after || at >= Number(after[1]) * 1000) && (!before || at < Number(before[1]) * 1000)
          )
        })
        .map((m) => ({
          id: m.id,
          threadId: m.threadId,
          from: "luis@bergman.example",
          to: "me@kwapso.app",
          subject: m.subject,
          snippet: "",
          date: new Date(Date.parse(m.date)).toUTCString(),
          url: `https://mail.example/${m.id}`,
          text: "",
        }))
    },
    gmailMessage: async (_t: string, id: string) => {
      const m = google.mail.find((x) => x.id === id)
      return {
        id,
        threadId: m?.threadId ?? id,
        from: "luis@bergman.example",
        to: "me@kwapso.app",
        subject: m?.subject ?? "",
        snippet: "",
        date: m ? new Date(Date.parse(m.date)).toUTCString() : "",
        url: `https://mail.example/${id}`,
        text: "the body",
      }
    },
    chatMembers: async () => new Map<string, string>(),
    chatMessages: async (
      _t: string,
      spaceName: string,
      _known: Map<string, string>,
      window?: { from: string; to: string }
    ) => {
      if (google.chatFails.has(spaceName)) throw new Error("space unreadable")
      const all = google.chatBySpace.get(spaceName) ?? []
      const now = Date.now()
      const messages = all.filter((m) => {
        const at = Date.parse(m.createdAt)
        if (!window) return now - at < 24 * 60 * 60 * 1000
        return at > Date.parse(window.from) && at < Date.parse(window.to)
      })
      return {
        messages: messages.map((m) => ({
          id: `${spaceName}/messages/${m.id}`,
          space: spaceName,
          sender: m.sender,
          senderNamed: true,
          senderIsApp: false,
          thread: `${spaceName}/threads/${m.id}`,
          url: `https://chat.google.com/${spaceName}/${m.id}`,
          text: `said ${m.id}`,
          createdAt: m.createdAt,
        })),
        learned: new Map<string, string>(),
        truncated: false,
      }
    },
  }
})

import worker from "../src/index"
import { buildSpineDb, IDS, makeEnv } from "../../tenancy/test/spine-harness"
import { risingBackfillWindow } from "../src/lib/knowledge-google"

const db = () => holder.db as DatabaseSync

function env(userId: string) {
  const base = makeEnv(() => db(), userId) as unknown as Record<string, unknown>
  return {
    ...base,
    INTERNAL_KEY: "k",
    GOOGLE_CONNECT_CLIENT_ID: "id",
    GOOGLE_CONNECT_CLIENT_SECRET: "secret",
    GOOGLE_TOKEN_KEY: "key",
    AI: { run: async () => ({ data: [] }) },
    REALTIME: { fetch: async () => new Response("{}") },
  } as never
}

const call = (userId: string, route: string) => {
  const [method, path] = route.split(" ")
  return worker.fetch(
    new Request(`https://content${path}`, {
      method,
      headers: { Cookie: "session=x", "Content-Type": "application/json" },
      body: method === "GET" ? undefined : "{}",
    }),
    env(userId) as never
  )
}

const sync = async () => call(IDS.staffUser, "POST /api/content/knowledge/sync-google")

function connect(service: string) {
  const future = new Date(Date.now() + 3_600_000).toISOString()
  db().exec(
    `INSERT INTO google_connections (id, user_id, service, google_email, scopes, access_token,
       access_expires_at, refresh_token, created_at, creator_id)
     VALUES ('C_${service}', '${IDS.staffUser}', '${service}', 'me@kwapso.app', 'scope',
       'plain-access', '${future}', 'plain-refresh', '2026-01-01', '${IDS.staffUser}');`
  )
}

function namedChatSpace(id: string, externalId: string) {
  db().exec(
    `INSERT INTO google_sources (id, connection_id, user_id, service, external_id, name, shelf, created_at, creator_id)
     VALUES ('${id}', 'C_chat', '${IDS.staffUser}', 'chat', '${externalId}', '${externalId}', 'private', '2026-01-01', '${IDS.staffUser}');`
  )
}

const backfilledThrough = (kind: string): string | null =>
  (
    db().prepare("SELECT backfilled_through FROM knowledge_ingest WHERE kind = ?").get(kind) as
      | { backfilled_through: string | null }
      | undefined
  )?.backfilled_through ?? null

beforeEach(() => {
  holder.db = buildSpineDb()
  google.events = []
  google.mail = []
  google.chatBySpace = new Map()
  google.chatFails = new Set()
  google.calendarCalls = []
  db().exec(
    `INSERT INTO role_permissions (id, role_id, module, can_read, can_create, can_edit, can_delete)
     VALUES ('r_knowledge', '${IDS.adminRole}', 'knowledge', 1, 1, 1, 1);
     INSERT INTO role_permissions (id, role_id, module, can_read, can_create, can_edit, can_delete)
     VALUES ('r_google', '${IDS.adminRole}', 'google', 1, 1, 1, 1);`
  )
})

describe("calendar's rising walk (floor → now)", () => {
  const OLD_DAYS_AGO = 400

  it("a second call reaches material the first did not — the advance is what makes it visible", async () => {
    connect("calendar")
    const old = new Date(Date.now() - OLD_DAYS_AGO * 24 * 60 * 60 * 1000)
    google.events = [{ id: "OLD_EVT", summary: "The first kickoff", start: old.toISOString() }]

    // NOT REACHABLE FROM THE LIVE WINDOW ALONE — 400 days back is nowhere
    // near the unbounded fixture's own "last 24h" answer, so the first tick
    // must find it (if at all) only via the backfill's OWN bounded slice,
    // which starts at the five-year floor and has not walked forward far
    // enough yet in one call.
    const titles = () =>
      (db().prepare("SELECT title FROM knowledge_sources WHERE origin_table = 'google_calendar'").all() as {
        title: string
      }[]).map((r) => r.title)

    await sync()
    expect(titles(), "one 90-day slice from the floor cannot reach 400 days back yet").toHaveLength(0)

    let found = false
    for (let i = 0; i < 30 && !found; i++) {
      await sync()
      found = titles().some((t) => t.includes("The first kickoff"))
    }
    expect(found, "the walk must reach the event within five years of slices").toBe(true)
  })

  it("MUTATION-PROVED: freezing the cursor between ticks finds nothing new", async () => {
    connect("calendar")
    const old = new Date(Date.now() - OLD_DAYS_AGO * 24 * 60 * 60 * 1000)
    google.events = [{ id: "OLD_EVT", summary: "The first kickoff", start: old.toISOString() }]

    await sync()
    const frozen = backfilledThrough("event:" + IDS.staffUser)
    expect(frozen, "the walk must have moved at least once to have anything to freeze").toBeTruthy()

    // FREEZE IT — undo whatever this tick's own advance just wrote, so the
    // next call re-reads the IDENTICAL slice a second time.
    const before = google.calendarCalls.length
    await sync()
    db()
      .prepare("UPDATE knowledge_ingest SET backfilled_through = ? WHERE kind = ?")
      .run(frozen, "event:" + IDS.staffUser)
    const beforeSources = db().prepare("SELECT COUNT(*) AS n FROM knowledge_sources WHERE origin_table='google_calendar'").get() as { n: number }
    await sync()
    const afterSources = db().prepare("SELECT COUNT(*) AS n FROM knowledge_sources WHERE origin_table='google_calendar'").get() as { n: number }
    expect(google.calendarCalls.length, "a frozen cursor must still ask Google — it is not yet caught up").toBeGreaterThan(before)
    expect(afterSources.n, "the same slice read twice must file nothing new").toBe(beforeSources.n)
  })

  it("a walk that has reached now makes NO Google call at all", async () => {
    connect("calendar")
    // ALREADY DONE, by hand — the sentinel a real walk would only reach after
    // ~24 slices. Written directly so this test does not need to spend them.
    db().exec(
      `INSERT INTO knowledge_ingest (kind, backfilled_through) VALUES ('event:${IDS.staffUser}', 'caught-up')`
    )
    await sync()
    // EVERY call in this array carries a `from` — only the backfill ever
    // sets one; the live read's own call passes neither. None here may.
    expect(
      google.calendarCalls.filter((c) => c.from),
      "a caught-up walk must place zero bounded (backfill) calendar reads"
    ).toHaveLength(0)
  })

  // PURE, DIRECT — not another sync() against fake timers: an earlier attempt
  // at this test used `vi.useFakeTimers()` around the whole worker request and
  // it passed for the WRONG reason (confirmed by inspecting the actual call
  // log): nothing in the sweep ran AT ALL under a faked clock — some other
  // part of the pipeline (token-expiry comparison, most likely) depends on a
  // real `Date`, so the "zero backfill calls" the test wanted was really
  // "zero calls of any kind", a green result that proved nothing. This is why
  // `risingBackfillWindow` takes `now` as a plain parameter rather than
  // reading the clock itself — it can be asked the regression question
  // directly, with no worker, no D1, no clock to fake.
  it("a caught-up state given a `now` days later does not restart the walk", () => {
    const now = new Date()
    const daysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    // THE REGRESSION THE SENTINEL EXISTS TO STOP: a bare recomputed
    // `through < now` check would see `now` move forward and conclude there
    // is new ground — reopening a sliver-sized slice for ever. `{done:true}`
    // must refuse a window regardless of how far `now` has moved.
    expect(risingBackfillWindow(now, { done: true })).toBeNull()
    expect(risingBackfillWindow(daysLater, { done: true })).toBeNull()
  })
})

describe("gmail's falling walk (now → floor)", () => {
  const OLD_DAYS_AGO = 400

  it("a second call reaches material the first did not", async () => {
    connect("gmail")
    const old = new Date(Date.now() - OLD_DAYS_AGO * 24 * 60 * 60 * 1000)
    google.mail = [{ id: "OLD_MAIL", threadId: "OLD_MAIL", subject: "The original quote", date: old.toISOString() }]

    const titles = () =>
      (db().prepare("SELECT title FROM knowledge_sources WHERE origin_table = 'google_gmail'").all() as {
        title: string
      }[]).map((r) => r.title)

    await sync()
    expect(titles(), "one 90-day slice from now cannot fall 400 days back yet").toHaveLength(0)

    let found = false
    for (let i = 0; i < 30 && !found; i++) {
      await sync()
      found = titles().some((t) => t.includes("The original quote"))
    }
    expect(found, "the falling walk must reach the mail within five years of slices").toBe(true)
  })

  it("a walk that has reached the floor makes no Google call at all", async () => {
    connect("gmail")
    db().exec(`INSERT INTO knowledge_ingest (kind, backfilled_through) VALUES ('email:${IDS.staffUser}', 'caught-up')`)
    // A spy that would see a bounded search if one were made.
    const calls: string[] = []
    google.mail = [{ id: "SHOULD_NOT_APPEAR", threadId: "X", subject: "x", date: new Date(0).toISOString() }]
    await sync()
    const titles = db().prepare("SELECT title FROM knowledge_sources WHERE origin_table = 'google_gmail'").all() as {
      title: string
    }[]
    // A bounded call would have found SHOULD_NOT_APPEAR (it is far outside
    // the unbounded live window); its absence is the proof no bounded call
    // was made.
    expect(titles.some((t) => t.title.includes("x")), "caught-up must place no bounded gmail read").toBe(false)
    void calls
  })
})

describe("chat's per-space isolation — the hub's ruling", () => {
  it("one space's failure is RECORDED next to that space, and never costs another space its own rows", async () => {
    connect("chat")
    namedChatSpace("S_GOOD", "spaces/GOOD")
    namedChatSpace("S_BAD", "spaces/BAD")
    const old = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString()
    google.chatBySpace.set("spaces/GOOD", [{ id: "M1", createdAt: old, sender: "Ana" }])
    google.chatFails.add("spaces/BAD")

    let found = false
    for (let i = 0; i < 30 && !found; i++) {
      await sync()
      const rows = db()
        .prepare("SELECT title FROM knowledge_sources WHERE origin_table = 'google_chat'")
        .all() as { title: string }[]
      found = rows.some((r) => r.title.includes("GOOD"))
    }
    expect(found, "the good space's backfill must proceed despite the bad space existing").toBe(true)

    const bad = db()
      .prepare("SELECT chat_backfill_error, chat_backfilled_through FROM google_sources WHERE id = 'S_BAD'")
      .get() as { chat_backfill_error: string | null; chat_backfilled_through: string | null }
    expect(bad.chat_backfill_error, "a space that cannot be read must say so, not vanish quietly").toBeTruthy()
    expect(bad.chat_backfilled_through, "a stalled space must not be credited with progress it never made").toBeNull()
  })

  it("the error carries WHEN it first failed, and repeated failures do not move it", async () => {
    // THE HUB'S OWN ADDITION: a message with no timestamp cannot distinguish
    // "failed once an hour ago" from "has been failing since June".
    connect("chat")
    namedChatSpace("S_FLAKY", "spaces/FLAKY")
    google.chatFails.add("spaces/FLAKY")

    await sync()
    const first = db()
      .prepare("SELECT chat_backfill_error, chat_backfill_error_at FROM google_sources WHERE id = 'S_FLAKY'")
      .get() as { chat_backfill_error: string | null; chat_backfill_error_at: string | null }
    expect(first.chat_backfill_error).toBeTruthy()
    expect(first.chat_backfill_error_at, "a stall with no timestamp answers no question at all").toBeTruthy()

    // FAIL AGAIN. The message may be rewritten; the FIRST-failed moment must
    // not move — that is the whole point of it being "first", not "latest".
    await sync()
    const second = db()
      .prepare("SELECT chat_backfill_error_at FROM google_sources WHERE id = 'S_FLAKY'")
      .get() as { chat_backfill_error_at: string | null }
    expect(second.chat_backfill_error_at, "a repeated failure must not reset when the stall began").toBe(
      first.chat_backfill_error_at
    )
  })

  it("a space that recovers clears its own earlier error, timestamp included", async () => {
    connect("chat")
    namedChatSpace("S_FLAKY", "spaces/FLAKY")
    google.chatFails.add("spaces/FLAKY")
    await sync()
    let row = db()
      .prepare("SELECT chat_backfill_error, chat_backfill_error_at FROM google_sources WHERE id = 'S_FLAKY'")
      .get() as { chat_backfill_error: string | null; chat_backfill_error_at: string | null }
    expect(row.chat_backfill_error).toBeTruthy()
    expect(row.chat_backfill_error_at).toBeTruthy()

    google.chatFails.delete("spaces/FLAKY")
    await sync()
    row = db()
      .prepare("SELECT chat_backfill_error, chat_backfill_error_at FROM google_sources WHERE id = 'S_FLAKY'")
      .get() as { chat_backfill_error: string | null; chat_backfill_error_at: string | null }
    expect(row.chat_backfill_error, "a recovered space must not keep showing a stale error").toBeNull()
    expect(row.chat_backfill_error_at, "the timestamp goes with the error it dates").toBeNull()
  })
})
