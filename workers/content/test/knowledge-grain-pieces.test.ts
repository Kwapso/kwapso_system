// tracker `a-pieces`, take two. The first attempt encoded a piece's speaker
// and time as a mark inside `body` itself and could not have worked — not
// because D1 rejects an embedded NUL (measured, 11 Sep 2026: it doesn't,
// storing and reading one back byte-perfect), but because a SQLite TEXT
// FUNCTION stops at the first NUL, and knowledge.ts's own source detail
// screen reads its body excerpt through exactly one (substr(body, 1, N)) — a
// marked chat body would have rendered every detail panel blank, silently.
// The hub's ruling: a separate column, `knowledge_sources.grain_pieces`
// (migration 0081), read by `indexSource` INSTEAD of re-chunking `body` when
// it is present. This is that: PIECES WIN, AND seq FOLLOWS THEM, proven
// against the real `indexSource`, mocked at the d1-rest seam the same way
// `index-one-source-skips.test.ts` and `knowledge-context-line.test.ts` do.

import { beforeEach, describe, expect, it, vi } from "vitest"

const holder = vi.hoisted(() => ({
  sourceRow: null as Record<string, unknown> | null,
  writes: [] as string[],
}))

vi.mock("../src/lib/knowledge-vectors", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/knowledge-vectors")>()
  return {
    ...actual,
    upsertVectors: async () => 0,
    clearVectors: async () => {},
    deleteVectors: async () => {},
    hasVectorStore: () => false,
    searchVectors: async () => [],
  }
})

vi.mock("@shared/workers/d1-rest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/d1-rest")>()
  return {
    ...actual,
    d1Query: async (_cfg: unknown, _db: string, sql: string) => {
      const s = sql.trim()
      if (/^SELECT id, kind, title/.test(s)) return holder.sourceRow ? [holder.sourceRow] : []
      if (/^SELECT id, text, context_line/.test(s)) return []
      return []
    },
    d1ExecScript: async (_cfg: unknown, _db: string, sql: string) => {
      holder.writes.push(sql)
      return []
    },
  }
})

const { indexSource } = await import("../src/lib/knowledge")

function fakeEnv() {
  return {
    DB: {},
    AI: {
      run: async (_model: string, input: { text?: string[] }) => ({ data: (input.text ?? []).map(() => [0.1, 0.2]) }),
    },
  } as never
}

const cfg = {} as never
const guard = { databaseId: "db", teamId: "t", userId: "u" } as never

beforeEach(() => {
  holder.sourceRow = null
  holder.writes.length = 0
})

function sourceRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "SRC1",
    kind: "message",
    title: "Ana, Bob",
    summary: "",
    body: "Ana: hi\n\nBob: hi back",
    file_url: null,
    compartment: "agency",
    account_id: null,
    app_id: null,
    ticket_id: null,
    sprint_id: null,
    record_date: null,
    owner_user_id: null,
    content_hash: null,
    chunk_count: 0,
    indexed_chunks: 0,
    embed_attempts: 0,
    generated_only: 0,
    shared_with: null,
    team_visible: 1,
    grain_pieces: null,
    deactivated_at: null,
    created_at: "2026-09-11T00:00:00Z",
    ...overrides,
  }
}

/** Every individual "INSERT INTO knowledge_chunks (...)" statement across
 * every d1ExecScript call — one batch's script is several statements joined
 * by a newline in ONE string, never one write per chunk. */
function chunkInserts(): string[] {
  return holder.writes.join("\n").split("\n").filter((line) => line.trimStart().startsWith("INSERT INTO knowledge_chunks ("))
}

describe("indexSource — grain_pieces wins over the generic chunker when present", () => {
  it("chunks straight from grain_pieces, one chunk per piece, seq in piece order", async () => {
    holder.sourceRow = sourceRow({
      grain_pieces: JSON.stringify([
        { text: "Ana: hi", speaker: "Ana", saidAt: "2026-09-11T09:00:00Z" },
        { text: "Bob: hi back", speaker: "Bob", saidAt: "2026-09-11T09:01:00Z" },
      ]),
    })
    await indexSource(fakeEnv(), cfg, guard, "SRC1")
    const inserts = chunkInserts()
    expect(inserts).toHaveLength(2)
    expect(inserts[0]).toContain("'Ana: hi'")
    expect(inserts[0]).toContain("'Ana'")
    expect(inserts[0]).toContain("'2026-09-11T09:00:00Z'")
    expect(inserts[1]).toContain("'Bob: hi back'")
    expect(inserts[1]).toContain("'Bob'")
  })

  it("falls back to chunking body generically when grain_pieces is NULL", async () => {
    holder.sourceRow = sourceRow({ grain_pieces: null })
    await indexSource(fakeEnv(), cfg, guard, "SRC1")
    const inserts = chunkInserts()
    // The generic chunker glues short paragraphs into one chunk — the exact
    // opposite of grain_pieces' one-chunk-per-piece shape above — and neither
    // speaker nor said_at is ever set.
    expect(inserts).toHaveLength(1)
    expect(inserts[0]).toContain("Ana: hi")
    expect(inserts[0]).toContain("Bob: hi back")
    expect(inserts[0]).toMatch(/,\s*NULL,\s*NULL,\s*NULL,/) // speaker, said_at, context_line
  })

  it("falls back honestly, never crashes the sweep, on malformed grain_pieces", async () => {
    holder.sourceRow = sourceRow({ grain_pieces: "{not valid json" })
    await expect(indexSource(fakeEnv(), cfg, guard, "SRC1")).resolves.toBeDefined()
    const inserts = chunkInserts()
    expect(inserts).toHaveLength(1)
  })

  it("falls back on an empty grain_pieces array, same as NULL", async () => {
    holder.sourceRow = sourceRow({ grain_pieces: "[]" })
    await indexSource(fakeEnv(), cfg, guard, "SRC1")
    expect(chunkInserts()).toHaveLength(1)
  })
})
