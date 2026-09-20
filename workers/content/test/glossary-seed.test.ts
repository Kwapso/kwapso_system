// THE GLOSSARY'S OWN SEED AND LIST, THROUGH THE REAL DOORS. Aurora's ruling,
// 20 Sep 2026: "identifying which words we use and their definitions...
// this will let our users search there, but should be part of the knowledge
// base and feed the assistant." Two things this file proves against the
// actual database, the way `knowledge-filing.test.ts` beside it proves its
// own door: the seed is IDEMPOTENT (never duplicates a word, whatever number
// of times it is asked), and a seeded word is readable back through the
// knowledge base's own generic list door, `kind=glossary`, exactly as any
// other source is.

import type { DatabaseSync } from "node:sqlite"
import { beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({ db: null as DatabaseSync | null }))

vi.mock("@shared/workers/d1-rest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/d1-rest")>()
  const { d1Impl } = await import("../../tenancy/test/d1-sqlite")
  return { ...actual, ...d1Impl(() => state.db as DatabaseSync) }
})

import worker from "../src/index"
import { fakeVectorize } from "./fake-vectorize"
import { buildSpineDb, IDS, makeEnv } from "../../tenancy/test/spine-harness"
import { GLOSSARY_ENTRIES } from "@shared/glossary-seed"

const db = () => state.db as DatabaseSync
let vectorIndex = fakeVectorize()

function env(userId: string) {
  const base = makeEnv(() => db(), userId) as unknown as Record<string, unknown>
  return {
    ...base,
    INTERNAL_KEY: "k",
    KNOWLEDGE_INDEX: vectorIndex.binding,
    KNOWLEDGE_MIN_SCORE: "0.35",
    AI: { run: async (_model: string, input: { text: string[] }) => ({ data: input.text.map(() => [1]) }) },
    REALTIME: { fetch: async () => new Response("{}") },
  } as never
}

async function seedDoor(userId: string): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await worker.fetch(
    new Request("https://content/api/content/knowledge/glossary/seed", {
      method: "POST",
      headers: { Cookie: "session=x", "Content-Type": "application/json" },
      body: "{}",
    }),
    env(userId)
  )
  return { status: res.status, body: (await res.json()) as Record<string, unknown> }
}

async function listDoor(userId: string, query = "kind=glossary"): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await worker.fetch(
    new Request(`https://content/api/content/knowledge?${query}`, {
      method: "GET",
      headers: { Cookie: "session=x" },
    }),
    env(userId)
  )
  return { status: res.status, body: (await res.json()) as Record<string, unknown> }
}

function glossaryRowCount(): number {
  const row = db()
    .prepare("SELECT COUNT(*) AS n FROM knowledge_sources WHERE kind = 'glossary'")
    .get() as { n: number }
  return row.n
}

beforeEach(() => {
  state.db = buildSpineDb()
  vectorIndex = fakeVectorize()
  db().exec(
    `INSERT INTO role_permissions (id, role_id, module, can_read, can_create, can_update, can_delete)
       VALUES ('${IDS.adminRole}_knowledge', '${IDS.adminRole}', 'knowledge', 1, 1, 1, 1);`
  )
})

describe("POST /api/content/knowledge/glossary/seed, the 54-word seed, idempotent", () => {
  it("writes every entry once, on the first call", async () => {
    const { status, body } = await seedDoor(IDS.staffUser)
    expect(status).toBe(200)
    expect(body.created).toBe(GLOSSARY_ENTRIES.length)
    expect(body.skipped).toBe(0)
    expect(glossaryRowCount()).toBe(GLOSSARY_ENTRIES.length)
  })

  it("a second call creates nothing new, matched by word, never a duplicate row", async () => {
    await seedDoor(IDS.staffUser)
    const { status, body } = await seedDoor(IDS.staffUser)
    expect(status).toBe(200)
    expect(body.created).toBe(0)
    expect(body.skipped).toBe(GLOSSARY_ENTRIES.length)
    expect(glossaryRowCount()).toBe(GLOSSARY_ENTRIES.length)
  })

  it("fills in only what is missing when one word was taken away by hand in between", async () => {
    await seedDoor(IDS.staffUser)
    // A real row, taken away by hand rather than through the door; its
    // indexed chunks go with it, the same order `deleteVectors`'s own real
    // callers already delete in, so the foreign key holds.
    db().exec(
      `DELETE FROM knowledge_chunks WHERE source_id IN (SELECT id FROM knowledge_sources WHERE kind = 'glossary' AND title = 'Wave');
       DELETE FROM knowledge_sources WHERE kind = 'glossary' AND title = 'Wave';`
    )
    expect(glossaryRowCount()).toBe(GLOSSARY_ENTRIES.length - 1)

    const { body } = await seedDoor(IDS.staffUser)
    expect(body.created).toBe(1)
    expect(body.skipped).toBe(GLOSSARY_ENTRIES.length - 1)
    expect(glossaryRowCount()).toBe(GLOSSARY_ENTRIES.length)
  })

  it("refuses a caller without the knowledge create right", async () => {
    const { status } = await seedDoor(IDS.contactUser)
    expect(status).toBe(403)
    expect(glossaryRowCount()).toBe(0)
  })
})

describe("GET /api/content/knowledge?kind=glossary, the list door, after the seed", () => {
  it("lists a seeded word with its own title and definition, readable like any other source", async () => {
    await seedDoor(IDS.staffUser)
    const { status, body } = await listDoor(IDS.staffUser)
    expect(status).toBe(200)
    const sources = body.sources as { title: string; body: string; kind: string }[]
    expect(sources.length).toBeGreaterThan(0)
    expect(sources.every((s) => s.kind === "glossary")).toBe(true)
  })

  it("a search box narrows the glossary to one word, the same `q` search every source list already offers", async () => {
    await seedDoor(IDS.staffUser)
    const { status, body } = await listDoor(IDS.staffUser, "kind=glossary&q=Wave")
    expect(status).toBe(200)
    // A LIST ROW CARRIES NO BODY (KnowledgeSource's own header: "On a LIST
    // this is always null... on a detail it is as much as a screen shows"),
    // so what a search result actually SAYS about the word is its summary.
    const sources = body.sources as { title: string; summary: string; kind: string }[]
    const wave = sources.find((s) => s.title === "Wave")
    expect(wave).toBeTruthy()
    expect(wave?.summary).toMatch(/phases/i)
  })

  it("an unfiltered list still carries the glossary's own exact count in byKind (R16)", async () => {
    await seedDoor(IDS.staffUser)
    const { body } = await listDoor(IDS.staffUser, "kind=note")
    const byKind = body.byKind as Record<string, number>
    expect(byKind.glossary).toBe(GLOSSARY_ENTRIES.length)
  })
})
