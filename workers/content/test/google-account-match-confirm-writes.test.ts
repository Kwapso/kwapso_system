// TRACKER `b-filing`, property 3 — "the SUGGESTION step alone never persists
// an account/compartment; only an explicit confirm call writes it."
//
// google-account-match.test.ts already proves `accountsNamedIn` picks the
// right account and refuses an ordinary word (properties 1 and 2), calling
// the library function directly. This file proves the THIRD property, which
// is a property of the DOORS, not the matcher: `GET .../google/match-account`
// (the suggestion) sends nothing but SELECTs no matter what it finds, and
// `POST .../google/sources` (the confirm) is the ONLY one of the two that
// ever sends a write, and that write actually carries the confirmed
// `accountId` into `google_sources.account_id`.
//
// PROVED BY RUNNING: both real route handlers are called, `d1-rest` is
// replaced, and every statement either one sends is read back — the same
// discipline as google-source-revive.test.ts.

import { beforeEach, describe, expect, it, vi } from "vitest"

const WRITE = /^\s*(INSERT|UPDATE|DELETE)\b/i

/** Every statement either door would have sent, SQL and bound values alike. */
const sent: { sql: string; params: unknown[] }[] = []

/** `knowledge_names` candidates the match door's underlying matcher sees. */
let nameCandidates: { ref_id: string; name: string; alias_of: string | null }[] = []
let rarityChunkCount = 0

vi.mock("@shared/workers/d1-rest", async (importOriginal) => {
  const real = await importOriginal<typeof import("@shared/workers/d1-rest")>()
  return {
    ...real,
    d1Query: vi.fn(async (_cfg: unknown, _db: unknown, sql: string, params?: unknown[]) => {
      sent.push({ sql, params: params ?? [] })
      if (sql.includes("FROM knowledge_names")) return nameCandidates
      if (sql.includes("FROM knowledge_chunks_fts")) return [{ n: rarityChunkCount }]
      // A COMPLETE `ConnectionRow` (google.ts), not the bare `{ id }` this
      // fixture predated `toConnection` reading in full with — `unrequestedScopes`,
      // `missingScopes` and `eventTypeList` each index or split one of these
      // fields unconditionally, and a real `google_connections` row always has
      // all of them (even as an empty string), so `undefined` here is a stale
      // fixture, not a real shape. Found on current main, 11 Sep 2026.
      if (sql.includes("FROM google_connections"))
        return [
          {
            id: "CONN-LIVE",
            user_id: GUARD.userId,
            service: "drive",
            google_email: "aurora@kwapso.com",
            scopes: "",
            last_used_at: null,
            last_error: null,
            scope_mode: "everything",
            scope_event_types: "",
            deactivated_at: null,
            created_at: "2026-01-01T00:00:00.000Z",
            creator_name: "Aurora",
            updated_at: null,
            editor_name: null,
          },
        ]
      if (sql.includes("SELECT id, deactivated_at FROM google_sources")) return []
      if (sql.includes("FROM accounts")) return [{ id: "ACC-BERG" }]
      if (sql.includes("INSERT INTO google_sources")) return [{ id: "SRC-NEW" }]
      return []
    }),
    d1ExecScript: vi.fn(async (_cfg: unknown, _db: unknown, script: string) => {
      sent.push({ sql: script, params: [] })
    }),
  }
})

vi.mock("@shared/workers/route", () => ({
  gated: async () => ({ cfg: CFG, guard: GUARD, actor: ACTOR }),
  gatedBody: async (_req: unknown, _env: unknown, ..._rest: unknown[]) => ({
    cfg: CFG,
    guard: GUARD,
    actor: ACTOR,
    body: postBody,
  }),
}))
vi.mock("@shared/workers/account-scope", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  refusePortalCaller: async () => {},
}))
vi.mock("@shared/workers/realtime", () => ({ publishChange: vi.fn(async () => {}) }))
vi.mock("../src/lib/knowledge-google", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  rewindGoogleLane: vi.fn(async () => {}),
  forgetGoogleKind: vi.fn(async () => 0),
}))
vi.mock("@shared/workers/activity", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  logActivity: vi.fn(async () => {}),
}))

import { getGoogleAccountMatch, postGoogleSource } from "../src/routes/google"

const CFG = { accountId: "acct", apiToken: "tok" }
const GUARD = { userId: "U1", teamId: "T1", roleId: "R1", databaseId: "DB1" }
const ACTOR = { id: "U1", email: "ana@agency.example", name: "Ana" }

/** What `gatedBody` hands `postGoogleSource` as the parsed request body — set
 * per test, since the real body-parsing seam is mocked away above. */
let postBody: Record<string, unknown> = {}

beforeEach(() => {
  sent.length = 0
  nameCandidates = []
  rarityChunkCount = 0
  postBody = {}
  vi.clearAllMocks()
})

describe("b-filing property 3: the suggestion never writes; only confirm does", () => {
  it("the MATCH door sends only SELECTs, even when it finds a real, confident match", async () => {
    // "Bergman Logistics" — a genuine two-token account match, exactly the
    // unambiguous case property 1 proves the matcher accepts.
    nameCandidates = [{ ref_id: "ACC-BERG", name: "Bergman Logistics", alias_of: null }]
    const res = await getGoogleAccountMatch(
      new Request("https://x/api/content/google/match-account?name=" + encodeURIComponent("Bergman Logistics — Shared Drive")),
      {} as never
    )
    const { matches } = (await res.json()) as { matches: { id: string }[] }
    // The matcher really did find it — this is not a vacuous pass on an empty result.
    expect(matches).toEqual([{ id: "ACC-BERG", name: "Bergman Logistics", fragile: false }])
    // And still, nothing it sent was a write.
    const writes = sent.filter((s) => WRITE.test(s.sql))
    expect(writes, `the suggestion step must never write: ${JSON.stringify(writes)}`).toEqual([])
  })

  it("the MATCH door sends only SELECTs even on a fragile (rare single-token) match", async () => {
    nameCandidates = [{ ref_id: "ACC-PAD", name: "paddlebase", alias_of: null }]
    rarityChunkCount = 2
    const res = await getGoogleAccountMatch(
      new Request("https://x/api/content/google/match-account?name=" + encodeURIComponent("Paddlebase Onboarding")),
      {} as never
    )
    const { matches } = (await res.json()) as { matches: { id: string; fragile: boolean }[] }
    expect(matches).toEqual([{ id: "ACC-PAD", name: "paddlebase", fragile: true }])
    expect(sent.filter((s) => WRITE.test(s.sql))).toEqual([])
  })

  it("the CONFIRM door is the one that writes — and it writes the CONFIRMED account, not a re-guess", async () => {
    postBody = {
      service: "drive",
      items: [{ externalId: "folder123", name: "Bergman Logistics — Shared Drive", kind: "folder" }],
      shelf: "team",
      accountId: "ACC-BERG",
    }
    const res = await postGoogleSource(new Request("https://x/api/content/google/sources", { method: "POST" }), {} as never)
    expect(res.status).toBe(200)
    const inserts = sent.filter((s) => /^INSERT INTO google_sources/.test(s.sql))
    expect(inserts).toHaveLength(1)
    // account_id is INLINED into the INSERT text via `sqlString` (addNamedSource
    // uses `d1ExecScript`, not `d1Query` with positional params, for this
    // statement — this assertion checked `.params`, which `d1ExecScript`'s own
    // mock always records as `[]`, until corrected here) — the compartment is
    // what the CONFIRM call said, not something the matcher inferred and the
    // door trusted silently.
    expect(inserts[0].sql).toContain("account_id")
    expect(inserts[0].sql).toContain("'ACC-BERG'")
    // The match door was never even touched by this call — confirming is not
    // routed back through the suggestion.
    expect(sent.some((s) => s.sql.includes("FROM knowledge_names"))).toBe(false)
  })

  it("the CONFIRM door writes nothing under the account when accountId is left off (the agency's own)", async () => {
    postBody = {
      service: "drive",
      items: [{ externalId: "folder999", name: "Internal Ops", kind: "folder" }],
      shelf: "team",
    }
    await postGoogleSource(new Request("https://x/api/content/google/sources", { method: "POST" }), {} as never)
    const inserts = sent.filter((s) => /^INSERT INTO google_sources/.test(s.sql))
    expect(inserts).toHaveLength(1)
    // `sqlString(null)` renders as the bare literal NULL (shared/workers/d1-rest.ts).
    expect(inserts[0].sql).toMatch(/,\s*NULL\s*,/)
    expect(inserts[0].sql).not.toContain("ACC-BERG")
  })
})
