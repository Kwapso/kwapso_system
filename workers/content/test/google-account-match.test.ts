// TRACKER `b-filing` — "naming a Drive folder or Chat space asks you to
// confirm its account once." The match itself reuses `accountsNamedIn`
// (knowledge.ts), exported for this second caller rather than rebuilt: a
// folder or space's own NAME is free text exactly like a question is
// (`tokenise`/`questionTerms`'s own header — "the SAME function reads a
// question, which is the point"). This proves the reuse actually behaves
// correctly on a NAME-shaped input, not a question-shaped one: an alias
// match (an account's own code, e.g. "HOGO") short-circuits the multi-token/
// rarity gate exactly as it does for a question, and an ordinary folder name
// that names nothing returns empty rather than a false positive.
//
// PROVED BY RUNNING, not by reading — same discipline as
// google-source-revive.test.ts: the data door is replaced and the function
// is called for real.

import { beforeEach, describe, expect, it, vi } from "vitest"

/** What the next `SELECT ... FROM knowledge_names` answers with. */
let nameCandidates: { ref_id: string; name: string; alias_of: string | null }[] = []
/** What the next rarity check (`knowledge_chunks_fts`) answers with — the
 * chunk count for whatever single term is being tested for rarity. */
let rarityChunkCount = 0
const sent: { sql: string; params: unknown[] }[] = []

vi.mock("@shared/workers/d1-rest", async (importOriginal) => {
  const real = await importOriginal<typeof import("@shared/workers/d1-rest")>()
  return {
    ...real,
    d1Query: vi.fn(async (_cfg: unknown, _db: unknown, sql: string, params?: unknown[]) => {
      sent.push({ sql, params: params ?? [] })
      if (sql.includes("FROM knowledge_names")) return nameCandidates
      if (sql.includes("FROM knowledge_chunks_fts")) return [{ n: rarityChunkCount }]
      return []
    }),
  }
})

import { accountsNamedIn } from "../src/lib/knowledge"

const CFG = { accountId: "acct", apiToken: "tok" }
const GUARD = { userId: "U1", teamId: "T1", roleId: "R1", databaseId: "DB1" }

beforeEach(() => {
  sent.length = 0
  nameCandidates = []
  rarityChunkCount = 0
  vi.clearAllMocks()
})

describe("accountsNamedIn, reused on a Drive folder / Chat space NAME (b-filing)", () => {
  it("an account's own CODE in the folder's name matches — exactly, no rarity gate needed", async () => {
    // The account's alias (its reference code) is HOGO; the canonical name is
    // the fuller "Hogo Health Systems". A code match bypasses the multi-token
    // and rarity rules entirely (accountsNamedIn's own header).
    nameCandidates = [{ ref_id: "ACC-HOGO", name: "HOGO", alias_of: "Hogo Health Systems" }]
    const matches = await accountsNamedIn(CFG, GUARD, "HOGO Q3 Project Files")
    expect(matches).toEqual([{ id: "ACC-HOGO", name: "Hogo Health Systems" }])
    // The rarity door was never even asked — an alias match doesn't need it.
    expect(sent.some((s) => s.sql.includes("knowledge_chunks_fts"))).toBe(false)
  })

  it("a two-token canonical name matches without needing the rarity gate either", async () => {
    nameCandidates = [{ ref_id: "ACC-BERG", name: "Bergman Logistics", alias_of: null }]
    const matches = await accountsNamedIn(CFG, GUARD, "Bergman Logistics — Shared Drive")
    expect(matches).toEqual([{ id: "ACC-BERG", name: "Bergman Logistics" }])
  })

  it("an ordinary folder name that happens to share ONE common word with an account is refused — the anti-hijack gate KB-AUDIT.md §4.2 exists for", async () => {
    // "Solutions" is a real, ordinary English word and also a single-token
    // account name. A folder called "Client Solutions Archive" must not
    // silently match VU Solutions on the strength of one common word.
    nameCandidates = [{ ref_id: "ACC-VU", name: "solutions", alias_of: null }]
    rarityChunkCount = 5000 // common across the corpus — over EXACT_TERM_MAX_CHUNKS
    const matches = await accountsNamedIn(CFG, GUARD, "Client Solutions Archive")
    expect(matches).toEqual([])
  })

  it("a genuinely rare single-token name still resolves — the gate narrows, it does not silence", async () => {
    nameCandidates = [{ ref_id: "ACC-PAD", name: "paddlebase", alias_of: null }]
    rarityChunkCount = 2 // rare — under the corpus-wide EXACT_TERM_MAX_CHUNKS floor
    const matches = await accountsNamedIn(CFG, GUARD, "Paddlebase Onboarding")
    expect(matches).toEqual([{ id: "ACC-PAD", name: "paddlebase" }])
  })

  it("a folder name that matches nothing on file returns empty, not a guess", async () => {
    nameCandidates = []
    const matches = await accountsNamedIn(CFG, GUARD, "Miscellaneous Notes")
    expect(matches).toEqual([])
  })
})
