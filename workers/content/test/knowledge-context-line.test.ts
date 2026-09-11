// PART 2 OF `a-pieces` — the owner's own spend ruling: a context line is a
// document thing, "not on email, not on chat", keyed on the piece's own text
// so an unchanged chunk never re-spends. See `wantsContextLine` and
// `priorContextLinesFor` in knowledge.ts.
//
// Mocked at the `d1-rest` seam, the same shape `index-one-source-skips.test.ts`
// already uses to exercise the REAL `indexSource` — a full sqlite harness would
// work too, but this is the narrower, faster tool for a narrow question: does
// this ONE function call the model, and when does it not.

import { beforeEach, describe, expect, it, vi } from "vitest"

const holder = vi.hoisted(() => ({
  sourceRow: null as Record<string, unknown> | null,
  existingChunks: [] as { id: string; text: string; context_line: string | null }[],
  writes: [] as string[],
  /** How many times the model was asked for a CONTEXT LINE — never an
   * embedding, which the fake AI binding below tells apart by shape. */
  contextLineCalls: 0,
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
      if (/^SELECT id, text, context_line/.test(s)) return holder.existingChunks
      return []
    },
    d1ExecScript: async (_cfg: unknown, _db: string, sql: string) => {
      holder.writes.push(sql)
      return []
    },
  }
})

const { indexSource } = await import("../src/lib/knowledge")
const { chunkText } = await import("../src/lib/knowledge-text")

function fakeEnv() {
  return {
    DB: {},
    AI: {
      run: async (_model: string, input: { text?: string[]; messages?: unknown[] }) => {
        if (input.messages) {
          holder.contextLineCalls++
          return {
            choices: [{ message: { content: "A generated sentence of context." } }],
            usage: { prompt_tokens: 12, completion_tokens: 6 },
          }
        }
        return { data: (input.text ?? []).map(() => [0.1, 0.2, 0.3]) }
      },
    },
  } as never
}

const cfg = {} as never
const guard = { databaseId: "db", teamId: "t", userId: "u" } as never

beforeEach(() => {
  holder.sourceRow = null
  holder.existingChunks = []
  holder.writes.length = 0
  holder.contextLineCalls = 0
})

const TITLE = "The dispatch handbook"
const BODY = "Paragraph one is short.\n\nParagraph two is also short."
const ONLY_CHUNK = chunkText([TITLE, BODY].join("\n\n"))[0]

function sourceRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "SRC1",
    kind: "document",
    title: TITLE,
    summary: "",
    body: BODY,
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
    deactivated_at: null,
    created_at: "2026-09-11T00:00:00Z",
    ...overrides,
  }
}

describe("indexSource — context lines, documents only, keyed on the piece's own text", () => {
  it("spends on a document-kind source's chunk, and writes the line", async () => {
    holder.sourceRow = sourceRow()
    await indexSource(fakeEnv(), cfg, guard, "SRC1")
    expect(holder.contextLineCalls).toBeGreaterThan(0)
    expect(holder.writes.join("\n")).toContain("A generated sentence of context.")
  })

  it("never spends on a non-document kind — chat/message, e.g.", async () => {
    holder.sourceRow = sourceRow({ kind: "message", title: "Ana, Bob" })
    await indexSource(fakeEnv(), cfg, guard, "SRC1")
    expect(holder.contextLineCalls).toBe(0)
    expect(holder.writes.join("\n")).not.toContain("A generated sentence of context.")
  })

  it("never spends on a note or a manual upload either — the owner's ruling was Drive specifically", async () => {
    holder.sourceRow = sourceRow({ kind: "note" })
    await indexSource(fakeEnv(), cfg, guard, "SRC1")
    expect(holder.contextLineCalls).toBe(0)
    holder.sourceRow = sourceRow({ kind: "file", id: "SRC1" })
    await indexSource(fakeEnv(), cfg, guard, "SRC1")
    expect(holder.contextLineCalls).toBe(0)
  })

  it("skips the model call for a chunk whose own text is unchanged, and keeps its old line", async () => {
    // Force a restart (content_hash stale) so the write loop runs at all, while
    // seeding an EXISTING row whose text is exactly what re-chunking recomputes —
    // the "the document changed elsewhere, this piece did not" case.
    holder.sourceRow = sourceRow({ content_hash: "STALE", chunk_count: 1, indexed_chunks: 1 })
    holder.existingChunks = [{ id: "SRC1:00000", text: ONLY_CHUNK, context_line: "The old, already-paid-for line." }]
    await indexSource(fakeEnv(), cfg, guard, "SRC1")
    expect(holder.contextLineCalls, "the piece's text matched — nothing should have been spent").toBe(0)
    expect(holder.writes.join("\n")).toContain("The old, already-paid-for line.")
    expect(holder.writes.join("\n")).not.toContain("A generated sentence of context.")
  })

  it("spends again when the chunk's own text has actually changed", async () => {
    holder.sourceRow = sourceRow({ content_hash: "STALE", chunk_count: 1, indexed_chunks: 1 })
    holder.existingChunks = [{ id: "SRC1:00000", text: "Some completely different old wording.", context_line: "Stale line, must not survive." }]
    await indexSource(fakeEnv(), cfg, guard, "SRC1")
    expect(holder.contextLineCalls).toBe(1)
    expect(holder.writes.join("\n")).toContain("A generated sentence of context.")
    expect(holder.writes.join("\n")).not.toContain("Stale line, must not survive.")
  })
})
