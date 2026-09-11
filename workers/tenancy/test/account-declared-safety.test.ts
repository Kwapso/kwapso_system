// THE TWO REFUSALS `alt_names` (0083, c-misspell) OWED SINCE IT SHIPPED —
// a schema column with NO WRITE DOOR anywhere in the app until now (kb_review,
// ship-gate finding, 11 Sep 2026), and `name_narrows_alone` (0085, c-hijack B),
// built beside it because the two share one declared-safety signal
// (.session-notes/lanes/NOTE-c-hijack-B-declared-safety.md's own closing line:
// "the two probably want to be one door, not two").
//
// Drives the REAL route through the REAL schema, same discipline as
// account-patch.test.ts beside it: the interesting half is the boundary, where
// a declared spelling either gets refused for a real reason or lands exactly
// as sent.

import type { DatabaseSync } from "node:sqlite"
import { beforeEach, describe, expect, it, vi } from "vitest"

const holder = vi.hoisted(() => ({ db: null as DatabaseSync | null }))

vi.mock("../../../shared/workers/d1-rest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../shared/workers/d1-rest")>()
  const { d1Impl } = await import("./d1-sqlite")
  return { ...actual, ...d1Impl(() => holder.db as DatabaseSync) }
})

import worker from "../src/index"
import { buildSpineDb, IDS, makeEnv, req } from "./spine-harness"

const post = (body: unknown) =>
  worker.fetch(
    req("POST /api/tenancy/accounts/update", body),
    makeEnv(() => holder.db as DatabaseSync, IDS.staffUser)
  )

const account = () =>
  holder.db!.prepare("SELECT * FROM accounts WHERE id = ?").get(IDS.victimAccount) as Record<
    string,
    unknown
  >

/** Seeds `knowledge_chunks_fts` (the same virtual table `isRareAccountToken`
 * queries) with enough rows carrying `word` to put it OVER
 * `ACCOUNT_TOKEN_MAX_CHUNKS` (30) — an ordinary word this corpus already talks
 * about a lot, the "aws"/"platinum" shape `@shared/workers/account-rarity`'s
 * own header names. No `knowledge_chunks` row is needed: the rarity check
 * reads the FTS table alone. */
function seedCommonWord(word: string, count = 40) {
  const insert = holder.db!.prepare("INSERT INTO knowledge_chunks_fts(rowid, text) VALUES (?, ?)")
  for (let i = 0; i < count; i++) insert.run(i + 1, `we talk about ${word} constantly`)
}

beforeEach(() => {
  holder.db = buildSpineDb()
})

describe("the alt_names write door (0083, c-misspell — no write door existed until this)", () => {
  it("a single rare word is accepted with no declaration needed", async () => {
    const res = await post({ id: IDS.victimAccount, name: "Bergman S.A.", altNames: ["Bergmann"] })
    expect(res.status, await res.text()).toBe(200)
    expect(JSON.parse(account().alt_names as string)).toEqual(["Bergmann"])
  })

  it("a multi-word entry is refused — it could never match anyway (rebuildNameIndex's own header)", async () => {
    const res = await post({ id: IDS.victimAccount, name: "Bergman S.A.", altNames: ["Bergman Logistics"] })
    expect(res.status).toBe(400)
    const body = (await res.json()) as { message: string }
    expect(body.message).toContain("more than one word")
    // Refused BEFORE the write — nothing landed.
    expect(account().alt_names).toBe("[]")
  })

  it("a common word is refused without a declaration — an alt_names row is read exactly like `code`, no rarity gate at all once accepted", async () => {
    seedCommonWord("solutions")
    const res = await post({ id: IDS.victimAccount, name: "Bergman S.A.", altNames: ["solutions"] })
    expect(res.status).toBe(400)
    const body = (await res.json()) as { message: string }
    expect(body.message).toContain("too common a word")
    expect(account().alt_names).toBe("[]")
  })

  it("the SAME common word is accepted once nameNarrowsAlone is declared in the same request", async () => {
    seedCommonWord("solutions")
    const res = await post({
      id: IDS.victimAccount,
      name: "Bergman S.A.",
      altNames: ["solutions"],
      nameNarrowsAlone: true,
    })
    expect(res.status, await res.text()).toBe(200)
    expect(JSON.parse(account().alt_names as string)).toEqual(["solutions"])
    expect(account().name_narrows_alone).toBe(1)
  })

  it("a common word is accepted without repeating the declaration, once the account already carries it", async () => {
    seedCommonWord("solutions")
    // Declare it first, alone.
    const first = await post({ id: IDS.victimAccount, name: "Bergman S.A.", nameNarrowsAlone: true })
    expect(first.status).toBe(200)
    // A LATER edit, unrelated to the declaration, can still add the common word —
    // the account's own standing declaration is read, not just this request's body.
    const res = await post({ id: IDS.victimAccount, name: "Bergman S.A.", altNames: ["solutions"] })
    expect(res.status, await res.text()).toBe(200)
    expect(JSON.parse(account().alt_names as string)).toEqual(["solutions"])
  })
})

describe("name_narrows_alone (0085, c-hijack B)", () => {
  it("defaults to 0 — not reviewed — and is left alone by an edit that never mentions it", async () => {
    expect(account().name_narrows_alone).toBe(0)
    const res = await post({ id: IDS.victimAccount, name: "Bergman Renamed" })
    expect(res.status).toBe(200)
    expect(account().name_narrows_alone).toBe(0)
  })

  it("is written when declared true", async () => {
    const res = await post({ id: IDS.victimAccount, name: "Bergman S.A.", nameNarrowsAlone: true })
    expect(res.status).toBe(200)
    expect(account().name_narrows_alone).toBe(1)
  })

  it("can be un-declared again", async () => {
    await post({ id: IDS.victimAccount, name: "Bergman S.A.", nameNarrowsAlone: true })
    const res = await post({ id: IDS.victimAccount, name: "Bergman S.A.", nameNarrowsAlone: false })
    expect(res.status).toBe(200)
    expect(account().name_narrows_alone).toBe(0)
  })
})
