// ONE SPACE'S REFUSAL IS ONE SPACE'S — a live defect, found while building
// migration 0081's backfill rather than caused by it, and fixed on its own
// first: `google-read.ts`'s chat branch had NO try/catch around `chatMessages`
// at all, unlike Drive's per-file isolation (`driveFileText`, same file) and
// Gmail's `Promise.allSettled` (`google-api.ts`'s `gmailSearch`). A space that
// became unreadable — deleted, access revoked — threw straight out of the
// loop and silently took every space named AFTER it with it, in every tick
// from then on, while `sweepKinds`' own per-KIND catch (knowledge-ingest.ts)
// swallowed the whole thing and reported success.
//
// A DEDICATED, FIRST COMMIT — the hub's own ruling: this is a standalone
// defect and scaffolding for the backfill at once, and those two facts should
// not be entangled in one diff. This suite proves the fix and nothing else,
// against the real sweep door, three real named spaces, one throwing.

import type { DatabaseSync } from "node:sqlite"
import { beforeEach, describe, expect, it, vi } from "vitest"

const holder = vi.hoisted(() => ({ db: null as DatabaseSync | null }))
const chat = vi.hoisted(() => ({ fails: new Set<string>() }))

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
    gmailSearch: async () => [],
    calendarList: async () => ({ events: [], truncated: false }),
    chatMembers: async () => new Map<string, string>(),
    chatMessages: async (_t: string, spaceName: string) => {
      if (chat.fails.has(spaceName)) throw new Error("space unreadable")
      return {
        messages: [
          {
            id: `${spaceName}/messages/M1`,
            space: spaceName,
            sender: "Ana",
            senderNamed: true,
            senderIsApp: false,
            thread: `${spaceName}/threads/T1`,
            url: `https://chat.google.com/${spaceName}/M1`,
            text: `said something in ${spaceName}`,
            createdAt: "2026-08-03T10:00:00.000Z",
          },
        ],
        learned: new Map<string, string>(),
        truncated: false,
      }
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
    INTERNAL_KEY: "k",
    GOOGLE_CONNECT_CLIENT_ID: "id",
    GOOGLE_CONNECT_CLIENT_SECRET: "secret",
    GOOGLE_TOKEN_KEY: "key",
    AI: { run: async () => ({ data: [] }) },
    REALTIME: { fetch: async () => new Response("{}") },
  } as never
}

const sync = () =>
  worker.fetch(
    new Request("https://content/api/content/knowledge/sync-google", {
      method: "POST",
      headers: { Cookie: "session=x", "Content-Type": "application/json" },
      body: "{}",
    }),
    env(IDS.staffUser) as never
  )

beforeEach(() => {
  holder.db = buildSpineDb()
  chat.fails = new Set()
  db().exec(
    `INSERT INTO role_permissions (id, role_id, module, can_read, can_create, can_edit, can_delete)
     VALUES ('r_knowledge', '${IDS.adminRole}', 'knowledge', 1, 1, 1, 1);
     INSERT INTO role_permissions (id, role_id, module, can_read, can_create, can_edit, can_delete)
     VALUES ('r_google', '${IDS.adminRole}', 'google', 1, 1, 1, 1);`
  )
  const future = new Date(Date.now() + 3_600_000).toISOString()
  db().exec(
    `INSERT INTO google_connections (id, user_id, service, google_email, scopes, access_token,
       access_expires_at, refresh_token, created_at, creator_id)
     VALUES ('C_chat', '${IDS.staffUser}', 'chat', 'me@kwapso.app', 'scope',
       'plain-access', '${future}', 'plain-refresh', '2026-01-01', '${IDS.staffUser}');`
  )
  // THREE NAMED SPACES, ORDERED DELIBERATELY. `listNamedSources` (google.ts)
  // reads `ORDER BY created_at DESC`, so the LATEST timestamp is read FIRST —
  // spelled out here so "the second one" means the same thing in the test as
  // it does in the loop, rather than depending on an implementation detail of
  // how SQLite breaks ties.
  for (const [id, ext, createdAt] of [
    ["S_FIRST", "spaces/FIRST", "2026-01-03"],
    ["S_SECOND", "spaces/SECOND", "2026-01-02"],
    ["S_THIRD", "spaces/THIRD", "2026-01-01"],
  ])
    db().exec(
      `INSERT INTO google_sources (id, connection_id, user_id, service, external_id, name, shelf, created_at, creator_id)
       VALUES ('${id}', 'C_chat', '${IDS.staffUser}', 'chat', '${ext}', '${ext}', 'private', '${createdAt}', '${IDS.staffUser}');`
    )
})

const chatTitles = (): string[] =>
  (
    db().prepare("SELECT title FROM knowledge_sources WHERE origin_table = 'google_chat'").all() as {
      title: string
    }[]
  ).map((r) => r.title)

describe("one chat space's refusal is one space's, not the whole sweep's", () => {
  it("a person with three spaces where the SECOND throws still gets the first and the third", async () => {
    chat.fails.add("spaces/SECOND")
    const res = await sync()
    expect(res.status).toBe(200)
    const titles = chatTitles()
    expect(titles.some((t) => t.includes("FIRST")), "the space named before the failure").toBe(true)
    expect(titles.some((t) => t.includes("THIRD")), "the space named after the failure").toBe(true)
    expect(titles.some((t) => t.includes("SECOND")), "the failing space itself files nothing").toBe(false)
  })
})
