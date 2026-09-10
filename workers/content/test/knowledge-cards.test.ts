// FINDABLE, NEVER QUOTED — a record whose every word the app wrote for it.
//
// KB-AUDIT.md §4.3: 1,142 of 9,781 live chunks were under 200 characters and
// most were machine-written record mirrors, so a forty-character sentence ("X is
// a meeting of ours on 3 Sep") scored well against any name-shaped question and
// was QUOTED as evidence. Asked what one colleague had been working on, the ONLY
// passage was that person's account stub.
//
// THE FIX IS PER ROW AND NOT PER KIND, which took three attempts to establish
// and is the whole reason this file is short. Every mirror kind the audit named
// — person, account, contact, task, app, todo — has a reader that folds in words
// somebody wrote (`about`, `detail`, `headline`, the notes on logged time). The
// stubs it measured were rows where those fields were EMPTY. So the question is
// "did THIS row produce anything beyond the sentence generated for it", the
// reader is the only thing that can answer it, and `generated_only` is where the
// answer is kept — because once the body is one string the two halves are
// indistinguishable and nothing downstream can recover it.
//
// The fixture carries both sides without being asked to: its `account_links`
// rows have no `about`, so contacts are cards; its `todos` and `tasks` carry a
// `detail` somebody typed, so they are not.
//
// ── THE TWO THINGS THAT GO WRONG SILENTLY ───────────────────────────────────
//
//   • A card must still get a `level: "record"` vector. Skip the chunk work by
//     returning early and the summary vector never gets written either — the
//     record becomes invisible rather than unquotable, which is the opposite of
//     the intent and looks identical on a green build.
//   • A card must not blank its own content hash. `indexSource` blanks it and
//     counts an attempt when a source has no embedded CHUNKS — self-healing for
//     a source the model failed on, an infinite loop for one that has no chunks
//     by design: re-read and re-written every fifteen minutes, for ever, against
//     a cap the owner has already cut once.

import type { DatabaseSync } from "node:sqlite"
import { beforeEach, describe, expect, it, vi } from "vitest"

const holder = vi.hoisted(() => ({ db: null as DatabaseSync | null }))

vi.mock("@shared/workers/d1-rest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/d1-rest")>()
  const { d1Impl } = await import("../../tenancy/test/d1-sqlite")
  return { ...actual, ...d1Impl(() => holder.db as DatabaseSync) }
})

import worker from "../src/index"
import { fakeVectorize } from "./fake-vectorize"
import { buildSpineDb, IDS, makeEnv } from "../../tenancy/test/spine-harness"
import { tokenise } from "../src/lib/knowledge-text"

const db = () => holder.db as DatabaseSync
let vectorIndex = fakeVectorize()

/** The same deterministic stand-in the other knowledge suites use. */
function fakeVector(text: string): number[] {
  const v = Array.from({ length: 256 }, () => 0)
  for (const [term, weight] of tokenise(text)) {
    let h = 0
    for (let i = 0; i < term.length; i++) h = (h * 31 + term.charCodeAt(i)) >>> 0
    v[h % 256] += weight
  }
  return v
}

function env(userId: string) {
  const base = makeEnv(() => db(), userId) as unknown as Record<string, unknown>
  return {
    ...base,
    INTERNAL_KEY: "k",
    KNOWLEDGE_INDEX: vectorIndex.binding,
    AI: { run: async (_m: string, input: { text: string[] }) => ({ data: input.text.map(fakeVector) }) },
    REALTIME: { fetch: async () => new Response("{}") },
  } as never
}

async function sync(): Promise<void> {
  for (let tick = 1; tick <= 40; tick++) {
    const res = await worker.fetch(
      new Request("https://content/api/content/knowledge/sync", {
        method: "POST",
        headers: { Cookie: "session=x", "Content-Type": "application/json" },
        body: "{}",
      }),
      env(IDS.staffUser) as never
    )
    expect(res.status).toBe(200)
    if (((await res.json()) as { caughtUp: boolean }).caughtUp) return
  }
  throw new Error("the sweep never caught up")
}

type Row = {
  id: string
  kind: string
  generated_only: number
  chunk_count: number
  pieces: number
  postings: number
  content_hash: string | null
  embed_attempts: number
}

function sources(where: string): Row[] {
  return db()
    .prepare(
      `SELECT s.id, s.kind, s.generated_only, s.chunk_count, s.content_hash, s.embed_attempts,
              (SELECT COUNT(*) FROM knowledge_chunks c WHERE c.source_id = s.id) AS pieces,
              (SELECT COUNT(*) FROM knowledge_terms t JOIN knowledge_chunks c2 ON c2.id = t.chunk_id
                WHERE c2.source_id = s.id) AS postings
         FROM knowledge_sources s
        WHERE s.deactivated_at IS NULL AND ${where}`
    )
    .all() as never
}

beforeEach(() => {
  holder.db = buildSpineDb()
  vectorIndex = fakeVectorize()
  db().exec(
    `INSERT INTO role_permissions (id, role_id, module, can_read, can_create, can_edit, can_delete)
     VALUES ('${IDS.adminRole}_knowledge', '${IDS.adminRole}', 'knowledge', 1, 1, 1, 1);
     INSERT INTO todos (id, ref, account_id, title, detail, created_at, creator_id)
       VALUES ('TD_C', 'BERG-T9', '${IDS.victimAccount}', 'Send us the supplier list',
               'The list of repeat suppliers, so the check can be skipped for them.',
               '2026-03-30', '${IDS.staffUser}');
     INSERT INTO tasks (id, ref, account_id, title, detail, status, created_at, creator_id)
       VALUES ('TSK_C', 'BERG-K9', '${IDS.victimAccount}', 'Raise the Bergman April invoice',
               'Bill the March sprint and the April retainer together.', 'open',
               '2026-04-01', '${IDS.staffUser}');`
  )
})

describe("a row whose every word the app wrote", () => {
  it("is marked as generated, and writes no pieces and no postings", async () => {
    await sync()
    // Contacts: the fixture's `account_links` carry no `about`, so every word of
    // the body is the sentence the reader built.
    const cards = sources("s.kind = 'contact'")
    expect(cards.length, "no contact sources in the fixture — this is measuring nothing").toBeGreaterThan(0)
    for (const c of cards) {
      expect(c.generated_only, "a contact with no `about` is every word the app wrote").toBe(1)
      expect(c.pieces, `it wrote ${c.pieces} piece(s) — a card is never quoted`).toBe(0)
      expect(c.postings, `it wrote ${c.postings} posting(s)`).toBe(0)
      expect(c.chunk_count, "it claims pieces it does not have").toBe(0)
    }
  })

  it("still reaches the index as a record, so the router can route to it", async () => {
    await sync()
    const levels = new Map(vectorIndex.all().map((v) => [v.id, String(v.metadata.level)]))
    for (const c of sources("s.kind = 'contact'")) {
      const mine = [...levels].filter(([id]) => id.startsWith(c.id))
      expect(mine.length, "a card reached the index as nothing at all — unquotable became unfindable").toBeGreaterThan(
        0
      )
      for (const [, level] of mine) expect(level, "a card wrote a chunk-level vector").toBe("record")
    }
  })

  it("does not blank its hash or climb its attempt counter, tick after tick", async () => {
    await sync()
    await sync()
    for (const c of sources("s.kind = 'contact'")) {
      expect(c.content_hash, "a card had its hash blanked — the sweep will redo it every tick, for ever").not.toBeNull()
      expect(c.embed_attempts, `a card counted ${c.embed_attempts} failed embedding attempt(s)`).toBe(0)
    }
  })
})

describe("a row that carries a person's own words", () => {
  it("is not a card, whatever kind it is", async () => {
    await sync()
    // The fixture's todo and task both carry a `detail` somebody typed. Same
    // kinds, same readers, opposite answer — which is the point.
    const written = sources("s.kind IN ('todo', 'task')")
    expect(written.length, "no todo/task sources in the fixture").toBeGreaterThan(0)
    for (const w of written) {
      expect(w.generated_only, `a ${w.kind} with a detail somebody typed was marked generated`).toBe(0)
      expect(w.pieces, `a ${w.kind} with words in it wrote no pieces — those words are unquotable`).toBeGreaterThan(0)
    }
  })

  it("agrees with the pieces, in both directions, across the whole corpus", async () => {
    // NOT A THRESHOLD. "Most of it is still quotable" would pass whatever the
    // rule did to any particular row, and the fixture's mix is not the corpus's.
    // This is the exact property instead: the flag and the pieces are two
    // statements of one fact, so a source can never carry both or neither.
    await sync()
    const all = sources("1 = 1")
    expect(all.length, "the sweep filed nothing").toBeGreaterThan(10)
    for (const s of all)
      expect(
        s.pieces > 0,
        `"${s.kind}" says generated_only=${s.generated_only} and holds ${s.pieces} piece(s) — the flag and the index disagree`
      ).toBe(s.generated_only === 0 && s.chunk_count > 0)
    // …and both sides really occur, or the loop above is vacuous.
    expect(all.some((s) => s.generated_only === 1), "nothing became a card").toBe(true)
    expect(all.some((s) => s.pieces > 0), "nothing stayed quotable").toBe(true)
  })
})
