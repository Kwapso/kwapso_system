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
    `INSERT INTO role_permissions (id, role_id, module, can_read, can_create, can_update, can_delete)
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

// BUILD-5 §H (18 Sep 2026) — THE MISSING SIBLING. The hash-skip's own comment
// above says "ONLY THIS DIRECTION NEEDS SAYING" — a card that GAINS a
// person's words has changed its BODY, so its hash moves and the skip does
// not bite. That reasoning holds when a HUMAN adds free text. It does not
// hold when the CODE's own definition of "real content" widens without the
// body changing at all — exactly what BUILD-5 §H's account/app fix did:
// `generatedOnly` started reading the rollup lists too, but the rollup TEXT
// those lists produce was already being computed identically before the
// change. MEASURED LIVE ON STAGING: the fix shipped, the textVersion bumped,
// the cursor correctly reset and re-read every account and app — and the
// hash-skip below then silently `continue`d every one of them anyway,
// because `content_hash` still matched. `generatedOnly` flipped from true to
// false and the sweep believed nothing had happened.
describe("a row that STOPS being a card between sweeps, with its body unchanged", () => {
  it("is force-indexed once, the same self-healing the OTHER direction already gets", async () => {
    // A BRAND NEW, ISOLATED ACCOUNT — with a contact from the very start, so
    // it indexes with real content and a real hash under TODAY's reader.
    const THIN = "A_CARD_THEN_NOT"
    const CONTACT = "A_CARD_THEN_NOT_PERSON"
    db().exec(
      `INSERT INTO accounts (id, account_type, name, code, status, created_at, creator_id)
         VALUES ('${THIN}', 'entity', 'Thin Freight Ltd', 'THINF', 'active_client', '2026-01-01', '${IDS.staffUser}');
       INSERT INTO accounts (id, account_type, name, created_at, creator_id)
         VALUES ('${CONTACT}', 'individual', 'Priya Shah', '2026-01-01', '${IDS.staffUser}');
       INSERT INTO account_links (id, account_id, person_account_id, relationship, created_at, creator_id)
         VALUES ('L_CARD_THEN_NOT', '${THIN}', '${CONTACT}', 'Harbourmaster', '2026-01-01', '${IDS.staffUser}');`
    )
    await sync()
    const row = () =>
      db()
        .prepare(
          `SELECT s.id, s.generated_only, s.chunk_count, s.content_hash,
                  (SELECT COUNT(*) FROM knowledge_chunks c WHERE c.source_id = s.id) AS pieces
             FROM knowledge_sources s WHERE s.origin_table = 'accounts' AND s.origin_row_id = ?`
        )
        .get(THIN) as Row
    const indexed = row()
    expect(indexed.generated_only, "a real contact did not stop this being a card — the actual fix is broken").toBe(
      0
    )
    expect(indexed.pieces, "no pieces were written for real content").toBeGreaterThan(0)
    expect(indexed.content_hash, "no hash was ever written").not.toBeNull()

    // NOW SIMULATE THE EXACT LIVE INCIDENT: a row an OLDER sweep classified
    // as a card — `generated_only=1`, no chunks — for the SAME content,
    // SAME hash, nothing about the account or its contact having moved
    // since. This is precisely what BUILD-5 §H's own deploy found on
    // staging: the code's definition of "real content" widened, the
    // textVersion bump reset the cursor and re-read the row, and the
    // hash-skip below STILL treated `content_hash === hash` as "nothing to
    // do" — because it never asked whether the CLASSIFICATION had also
    // changed underneath an unchanged hash.
    db().exec(
      `UPDATE knowledge_sources SET generated_only = 1, chunk_count = 0, indexed_chunks = 0
         WHERE origin_table = 'accounts' AND origin_row_id = '${THIN}';
       DELETE FROM knowledge_chunks WHERE source_id = (
         SELECT id FROM knowledge_sources WHERE origin_table = 'accounts' AND origin_row_id = '${THIN}'
       );`
    )
    const staged = row()
    expect(staged.generated_only).toBe(1)
    expect(staged.pieces).toBe(0)
    expect(staged.content_hash, "the simulated stale row must keep the SAME hash — that is the whole bug").toBe(
      indexed.content_hash
    )

    await sync()
    const healed = row()
    // THE ASSERTION THAT WOULD HAVE CAUGHT THIS LIVE: the reader says this is
    // real content, so the index must agree — even though the hash never
    // moved, because it was the CLASSIFICATION that was stale, not the text.
    expect(healed.generated_only, "the reader still says card, with a real contact on it").toBe(0)
    expect(
      healed.pieces,
      "still a card in the index though the flag says otherwise, and the hash matched — the hash-skip ate it"
    ).toBeGreaterThan(0)
    expect(healed.chunk_count).toBeGreaterThan(0)
  })
})
