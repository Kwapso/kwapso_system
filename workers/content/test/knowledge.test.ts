// THE KNOWLEDGE BASE, END TO END, against a real SQLite database running the
// real team migrations — the shipped route handlers, the shipped SQL, the
// shipped guard corridor. Only two things are stubbed: the D1 REST transport
// (pointed at the in-memory database) and the embedding model.
//
// WHY THE MODEL IS FAKED, AND WHAT THAT COSTS. `env.AI` here returns a
// deterministic bag-of-words vector, so a chunk about invoices really is closer
// to a question about invoices than to one about logos. What that proves is the
// PIPELINE — embed on write, store quantised, decode on read, blend with the
// lexical score, rank — which is the part that can silently break. What it does
// not prove is Workers AI's semantics; that is measured separately, on the
// agency's own history, by scripts/knowledge-backfill.mjs.
//
// FOUR THINGS THIS SUITE IS ACTUALLY FOR:
//   • a client login cannot reach ONE door of this module (R21), whatever their
//     role says — their role here holds every knowledge right on purpose;
//   • an answer names its sources, and an answer with none says so (R23);
//   • the compartment is DERIVED, and a question about one client does not come
//     back carrying another client's material;
//   • taking a source away really takes it away — and the sweep does not quietly
//     put it back.

import { readFileSync } from "node:fs"
import { join } from "node:path"
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
import { diversify, hasRecencyIntent, rebuildNameIndex, retrieve } from "../src/lib/knowledge"
import { passageId } from "../src/lib/knowledge-reader"
import { d1Query } from "@shared/workers/d1-rest"
import type { MemberGuard } from "@shared/workers/gating"
import { INGEST_KINDS } from "../src/lib/knowledge-ingest"
import type { KnowledgeAnswer, KnowledgeSource } from "@shared/types"

const db = () => holder.db as DatabaseSync

/** A SECOND staff member, added here because the shared fixture has only one.
 * The personal fence is a fence between COLLEAGUES — everyone else in that
 * fixture is a client login, and a client login is refused at the door long
 * before the fence is reached, which would have proved nothing about it. */
const OTHER_STAFF = "U_STAFF_2"

/** Every live ping the worker published, captured instead of broadcast. */
let published: { resource?: string; id?: string; op?: string }[] = []
/** Every text the "model" was asked to embed — how the hash-skip is observed. */
let embedded: string[] = []
/** The vector index, in memory. A stand-in that really partitions by namespace
 * and really filters by metadata (see fake-vectorize.ts), so the fence is
 * exercised rather than asserted. */
let vectorIndex = fakeVectorize()

/** A DETERMINISTIC stand-in for the embedding model: 256 dimensions, each token
 * landing in one slot. Two texts sharing words point in similar directions,
 * which is all the ranking needs to be exercised honestly.
 *
 * 256 RATHER THAN 64, and the reason matters now that there is a relevance floor
 * to exercise. In 64 slots an ordinary pair of unrelated sentences collides on
 * two or three dimensions and lands at a cosine of 0.4-0.5 — indistinguishable
 * from a real match, so no floor could separate them and the suite could not
 * tell "refuses what it has nothing on" from "answers everything". Four times
 * the slots makes an accidental collision rare, which is the property a real
 * embedding has and this needs to imitate. */
function fakeVector(text: string): number[] {
  const v = Array.from({ length: 256 }, () => 0)
  for (const [term, weight] of tokenise(text)) {
    let h = 0
    for (let i = 0; i < term.length; i++) h = (h * 31 + term.charCodeAt(i)) >>> 0
    v[h % 256] += weight
  }
  // A text with no indexable words at all has no direction — the codec refuses
  // to store a zero vector, which is the behaviour under test elsewhere.
  return v
}

function env(
  userId: string,
  opts: {
    brokenModel?: boolean
    noVectorStore?: boolean
    minScore?: string
    /** The READER's own floor (KNOWLEDGE_READER_MIN_SCORE) — a SEPARATE var
     * from `minScore` on purpose (see `retrieve`'s own comment on `floor`):
     * a test exercising the reader path sets this rather than `minScore`,
     * proving the two are genuinely independent rather than one relaxed
     * reading of the other. Unset means the code's own default
     * (READER_HALLUCINATION_FLOOR). */
    readerMinScore?: string
  } = {}
) {
  const base = makeEnv(() => db(), userId) as unknown as Record<string, unknown>
  return {
    ...base,
    INTERNAL_KEY: "k",
    KNOWLEDGE_INDEX: opts.noVectorStore ? undefined : vectorIndex.binding,
    // THE RELEVANCE FLOOR BELONGS TO THE MODEL, and the model here is a
    // stand-in whose cosine is on a different scale from bge-m3's (see
    // fakeVector below). What this suite tests is that there IS a floor and
    // that it refuses below it — not the shipped number, which was measured
    // against the real model on 7,441 real chunks. Setting it here is the same
    // act as setting it for a new model in production.
    KNOWLEDGE_MIN_SCORE: opts.minScore ?? "0.35",
    KNOWLEDGE_READER_MIN_SCORE: opts.readerMinScore,
    AI: {
      run: async (_model: string, input: { text: string[] }) => {
        embedded.push(...input.text)
        if (opts.brokenModel) throw new Error("model unavailable")
        return { data: input.text.map(fakeVector) }
      },
    },
    REALTIME: {
      fetch: async (_url: string, init?: { body?: string }) => {
        const body = JSON.parse(init?.body ?? "{}") as { event?: Record<string, string> }
        if (body.event) published.push(body.event)
        return new Response("{}")
      },
    },
  } as never
}

const call = (userId: string, route: string, body?: unknown, query = "", opts = {}) => {
  const [method, path] = route.split(" ")
  return worker.fetch(
    new Request(`https://content${path}${query}`, {
      method,
      headers: { Cookie: "session=x", "Content-Type": "application/json" },
      body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
    }),
    env(userId, opts) as never
  )
}

/** Add a source through the DOOR (never a raw insert) and hand back its id. */
async function addSource(
  userId: string,
  input: {
    title: string
    body?: string
    accountId?: string
    visibility?: string
    visibleToAppId?: string
  }
): Promise<string> {
  const res = await call(userId, "POST /api/content/knowledge", input)
  expect(res.status, `adding "${input.title}"`).toBe(200)
  const { source } = (await res.json()) as { source: KnowledgeSource }
  return source.id
}

async function ask(
  userId: string,
  question: string,
  accountId?: string,
  // `noVectorStore` is not a variant of `minScore`: one is a search that looked
  // and found nothing, the other is nobody looking. The word match is held to a
  // different floor in each (see `termFloor`), so both have to be reachable here.
  opts: { minScore?: string; noVectorStore?: boolean } = {}
): Promise<KnowledgeAnswer> {
  const query = `?q=${encodeURIComponent(question)}${accountId ? `&accountId=${accountId}` : ""}`
  const res = await call(userId, "GET /api/content/knowledge/ask", undefined, query, opts)
  expect(res.status).toBe(200)
  return (await res.json()) as KnowledgeAnswer
}

const titles = (a: KnowledgeAnswer) => a.citations.map((c) => c.title)

beforeEach(() => {
  published = []
  embedded = []
  vectorIndex = fakeVectorize()
  holder.db = buildSpineDb()
  db().exec(
    `INSERT INTO users (id, email, first_name, current_team_id) VALUES ('${OTHER_STAFF}', 'aurora@kwapso.app', 'Aurora', '${IDS.team}');
     INSERT INTO team_members (id, team_id, user_id, role_id, created_at) VALUES ('m5', '${IDS.team}', '${OTHER_STAFF}', '${IDS.adminRole}', '2026-01-01');`
  )
  // BOTH roles hold every knowledge right — the burglar's role is not what stops
  // them, so if a client login gets through, the door's own refusal is broken.
  // Asserted rather than assumed: a suite whose premise quietly stopped being
  // true would answer "refused" for the wrong reason.
  for (const role of [IDS.adminRole, IDS.clientRole])
    db().exec(
      `INSERT INTO role_permissions (id, role_id, module, can_read, can_create, can_edit, can_delete)
       VALUES ('${role}_knowledge', '${role}', 'knowledge', 1, 1, 1, 1);`
    )
  for (const role of [IDS.adminRole, IDS.clientRole]) {
    const granted = db()
      .prepare(
        `SELECT COUNT(*) n FROM role_permissions WHERE role_id = ? AND module = 'knowledge'
          AND can_read = 1 AND can_create = 1 AND can_edit = 1 AND can_delete = 1`
      )
      .get(role) as { n: number }
    expect(granted.n, `${role} must hold every knowledge right for this suite to mean anything`).toBe(1)
  }
})

describe("R21 — a client login cannot reach the knowledge base at all", () => {
  const DOORS: [string, unknown, string][] = [
    ["GET /api/content/knowledge", undefined, ""],
    ["GET /api/content/knowledge/ask", undefined, "?q=invoice"],
    ["GET /api/content/knowledge/sync", undefined, ""],
    ["POST /api/content/knowledge", { title: "Theirs now" }, ""],
    ["POST /api/content/knowledge/update", { id: "x", title: "Theirs now" }, ""],
    ["POST /api/content/knowledge/active", { id: "x", active: false }, ""],
    ["POST /api/content/knowledge/sync", {}, ""],
  ]

  it("every door refuses them — reads and writes alike", async () => {
    for (const [route, body, query] of DOORS) {
      const res = await call(IDS.burglarUser, route, body, query)
      expect(res.status, `${route} must refuse a client login`).toBe(403)
      expect((await res.json()) as { error: string }).toMatchObject({ error: "client_login" })
    }
    // The scan can't see this and the seed can't promise it: the burglar is a
    // real portal user in this fixture, so the refusal above was reached.
    const grants = db()
      .prepare("SELECT COUNT(*) n FROM portal_users WHERE user_id = ? AND deactivated_at IS NULL")
      .get(IDS.burglarUser) as { n: number }
    expect(grants.n, "the burglar must hold a live portal grant, or they were never a client login").toBe(1)
  })

  it("nothing they sent reached the database", async () => {
    await call(IDS.burglarUser, "POST /api/content/knowledge", { title: "Theirs now" })
    const rows = db().prepare("SELECT COUNT(*) n FROM knowledge_sources").get() as { n: number }
    expect(rows.n).toBe(0)
  })
})

describe("a source a person writes is answerable straight away", () => {
  it("indexes on the way in, and the answer names it", async () => {
    const id = await addSource(IDS.staffUser, {
      title: "How we handle a dispatch outage",
      body: "When the dispatch screen logs people out, restart the session service and tell the client within the hour.",
    })
    // Chunked and embedded in the same call — the owner asked for instant
    // syncing, and "instant" is what makes a note worth typing.
    const chunks = db().prepare("SELECT COUNT(*) n FROM knowledge_chunks WHERE source_id = ?").get(id) as {
      n: number
    }
    expect(chunks.n).toBeGreaterThan(0)
    // FTS5 (0073), NOT `knowledge_terms` — the lexical arm's own index, kept in
    // step by `indexSource` itself (see its comment). `knowledge_terms` is
    // written by nothing any more (tracker item `a-fts`, step 1: retired 10 Sep
    // 2026, verified off disk that nothing anywhere reads it before the writes
    // stopped) — asserted here as a real negative rather than left silent, so a
    // write that creeps back in fails loudly rather than quietly reviving a
    // dead table.
    const fts = db()
      .prepare(
        `SELECT COUNT(*) n FROM knowledge_chunks_fts f
           JOIN knowledge_chunks c ON c.rowid = f.rowid
          WHERE c.source_id = ?`
      )
      .get(id) as { n: number }
    expect(fts.n).toBeGreaterThan(0)
    const terms = db().prepare("SELECT COUNT(*) n FROM knowledge_terms").get() as { n: number }
    expect(terms.n, "knowledge_terms must stay empty — nothing writes to it any more").toBe(0)

    const answer = await ask(IDS.staffUser, "what do we do when the dispatch screen logs people out?")
    expect(answer.found).toBe(true)
    expect(titles(answer)).toContain("How we handle a dispatch outage")
    expect(answer.passages[0].text).toContain("restart the session service")
    // R1: the write published a row-level ping so open lists patch that row.
    expect(published).toContainEqual(expect.objectContaining({ resource: "knowledge", id, op: "add" }))
  })

  it("admits it knows nothing rather than answering anyway", async () => {
    await addSource(IDS.staffUser, { title: "Dispatch outages", body: "Restart the session service." })
    const answer = await ask(IDS.staffUser, "what is our policy on parental leave?")
    expect(answer.found).toBe(false)
    expect(answer.citations).toEqual([])
    expect(answer.passages).toEqual([])
    expect(answer.message).toMatch(/do not answer from memory/i)
  })
})

// A QUESTION FROM OUTSIDE THE TEAM'S WORLD — the honesty case R23 is FOR, and the
// one that got out. Asked "What is the capital of France?" on staging, the
// knowledge base answered, with citations, out of material that had nothing to do
// with it. The path is the fallback: nothing was close enough for the vector arm,
// so the word arm ran as everything-we-have — and its floor was "half the
// question", which for a two-word question is one word. Any chunk saying "capital"
// was, arithmetically, half an answer about France.
//
// The corpus below is built to make that leak happen: one source contains one of
// the two words, the other contains the other, and neither contains both. Under the
// old floor each of them cleared it on its own.
//
// NOTHING IS CLOSE ENOUGH is set here rather than hoped for. The trigger is
// `vector.length === 0`, which retrieve() reaches by four routes it treats
// identically — no store bound, the question could not be embedded, the material
// has no vector, or nothing clears the relevance floor. Staging took the last one,
// so this suite takes it too, by putting the floor out of the stand-in model's
// reach. Leaving it at the suite default would measure that model's accidental
// collisions (a two-word question and a two-word account name share a hashed slot
// often enough) rather than this floor.
const NOTHING_CLOSE_ENOUGH = { minScore: "0.99" }

// THE ROUTER FOUND IT AND THE ANSWER SAID IT HAD NOTHING.
//
// Isolated on staging on 20 Aug 2026, against the agency's own material. Three
// phrasings of one question, one transcript, indexed and chunked:
//
//   "Ishita and Alaap one-to-one"                          -> 6 passages
//   "What was decided in the Ishita and Alaap meeting?"     -> 3 passages
//   "What was decided in the Ishita and Alaap one-to-one?"  -> NOTHING
//
// And the refusal carried the router's own sentence: "It reads like a question
// about \"Ishita x Alaap\"." It had named the right record and still answered
// with nothing, because the two searches read different things — the router
// reads record COVERS (a title and a summary, a short text about the whole
// conversation) and the answer reads CHUNKS (paragraphs of what people said).
// A padded question still lands near the cover and no longer lands near any
// paragraph.
//
// WHAT A TEST HERE CAN PROVE, said out loud because the first version proved
// nothing. The stand-in model is a bag of words in 256 slots (see fakeVector);
// it has no semantic drift, so a suite asserting "the padded question is
// answered" passed with the fix REMOVED. A green test asserting the wrong intent
// is worse than no test. The symptom was verified against the real model on
// staging, where it was found and where it was fixed.
//
// So this locks the two halves that CAN be stated exactly: the covers reaching
// the paragraphs when nothing else does, and the refusal that must survive it.
describe("when the covers find a record and the paragraphs find nothing", () => {
  beforeEach(async () => {
    await addSource(IDS.staffUser, {
      title: "Ishita and Alaap catch-up",
      body:
        "Ishita and Alaap agreed that the voucher redemption work moves to the August sprint, " +
        "and that Ishita picks up the outstanding onboarding questions from the pharmacy chains.",
    })
  })

  // THE FLOOR THE FALLBACK STANDS ON IS THE ROUTER'S, and the router is held to
  // the same number as the answer. With nothing able to clear it, the covers
  // find no record either — so the fallback has nothing to open and the base
  // says what it has always said. This is the half a "read something anyway"
  // fix would have given away.
  it("still refuses when even the covers find nothing", async () => {
    const answer = await ask(
      IDS.staffUser,
      "What was decided about the Antarctic shipping tariff review?",
      undefined,
      NOTHING_CLOSE_ENOUGH
    )
    expect(answer.found, `answered out of ${titles(answer).join(", ") || "nothing"}`).toBe(false)
    expect(answer.citations).toEqual([])
    expect(answer.passages).toEqual([])
    expect(answer.records, "no record cleared the floor, so none may be named").toEqual([])
  })

  // …and the ordinary path is untouched: a question the base can answer is still
  // answered by the two arms, with the fallback never reached.
  it("answers a question its own words match, without needing the fallback", async () => {
    const answer = await ask(IDS.staffUser, "Ishita Alaap catch-up voucher redemption")
    expect(answer.found).toBe(true)
    expect(titles(answer)).toContain("Ishita and Alaap catch-up")
  })
})

describe("R23 — a question the team's material cannot answer is refused, not approximated", () => {
  beforeEach(async () => {
    await addSource(IDS.staffUser, {
      title: "Capital expenditure sign-off",
      body: "Any capital expenditure above ten thousand needs the finance lead to sign it off before the purchase order is raised, and the approval is recorded against the project it belongs to.",
    })
    await addSource(IDS.staffUser, {
      title: "Where our suppliers are",
      body: "The label printer is shipped from a supplier in France, so allow an extra week on any hardware order that goes through them during the summer.",
    })
  })

  it("refuses a short question whose words appear in the base but never together", async () => {
    const answer = await ask(IDS.staffUser, "What is the capital of France?", undefined, NOTHING_CLOSE_ENOUGH)
    expect(answer.found, `answered out of ${titles(answer).join(", ") || "nothing"}`).toBe(false)
    expect(answer.citations).toEqual([])
    expect(answer.passages).toEqual([])
    expect(answer.message).toMatch(/do not answer from memory/i)
  })

  // THE REASONING IS PART OF THE ANSWER (R23), so it is held to the same floor.
  // The router had none: a vector search always returns a nearest neighbour, so the
  // sentence riding the answer named the three least-unlike records for every
  // question ever asked — including this one, where it sat next to a refusal
  // telling the reader the question was about three documents it had just said it
  // could not answer from.
  it("and its reasoning claims no subject either", async () => {
    const answer = await ask(IDS.staffUser, "What is the capital of France?", undefined, NOTHING_CLOSE_ENOUGH)
    expect(answer.records).toEqual([])
    expect(answer.reason).not.toMatch(/reads like a question about/i)
  })

  it("still answers when the words really are together — the floor is not a mute button", async () => {
    // The same two-word shape and the SAME sole-evidence path, this time genuinely
    // covered. If the stricter floor ever becomes "refuse anything short", this is
    // what goes red.
    const answer = await ask(IDS.staffUser, "capital expenditure?", undefined, NOTHING_CLOSE_ENOUGH)
    expect(answer.found).toBe(true)
    expect(titles(answer)).toContain("Capital expenditure sign-off")
  })

  // BUILD-5 §5-6, 0077: a refusal remembers what it saw. Proved here rather
  // than left to the migration test alone, because "the table exists and can
  // hold a row" and "retrieve() actually writes one" are different claims —
  // the same gap `stripTrailingSourceList` (knowledge-compose.ts) was earlier
  // named as: a predicate nobody calls is not a guard.
  it("a refusal writes a row to knowledge_refusals, with the question and the reason it carried", async () => {
    const before = db().prepare("SELECT COUNT(*) AS n FROM knowledge_refusals").get() as { n: number }
    const answer = await ask(IDS.staffUser, "What is the capital of France?", undefined, NOTHING_CLOSE_ENOUGH)
    expect(answer.found).toBe(false)
    const after = db().prepare("SELECT COUNT(*) AS n FROM knowledge_refusals").get() as { n: number }
    expect(after.n, "no row was written for a real refusal").toBe(before.n + 1)
    const row = db()
      .prepare(
        "SELECT question, reason, shortlist, top1_score, asked_by_user_id FROM knowledge_refusals ORDER BY created_at DESC LIMIT 1"
      )
      .get() as {
      question: string
      reason: string
      shortlist: string
      top1_score: number | null
      asked_by_user_id: string
    }
    expect(row.question).toBe("What is the capital of France?")
    expect(row.reason.length).toBeGreaterThan(0)
    expect(row.asked_by_user_id).toBe(IDS.staffUser)
    // The shortlist is always valid JSON — an array, whether or not there was
    // anything in it to log.
    expect(Array.isArray(JSON.parse(row.shortlist))).toBe(true)
    // KB-AUDIT.md §3's own instrument: the raw top-1 cosine, captured even
    // though this question was refused before it ever reached the floor
    // decision — there IS a nearest neighbour (the base holds two real
    // sources), it is just not close enough, and that number is the whole
    // point of this column.
    expect(row.top1_score, "the raw top-1 score must be captured, not just the fused shortlist").not.toBeNull()
  })

  it("an answer that DOES find something writes no refusal row", async () => {
    const before = db().prepare("SELECT COUNT(*) AS n FROM knowledge_refusals").get() as { n: number }
    await ask(IDS.staffUser, "capital expenditure?", undefined, NOTHING_CLOSE_ENOUGH)
    const after = db().prepare("SELECT COUNT(*) AS n FROM knowledge_refusals").get() as { n: number }
    expect(after.n).toBe(before.n)
  })
})

// BUILD-5-knowledge-rebuild.md §5-6, KB-AUDIT.md §3's own case: "the retrieval
// is working, the floor is discarding the win". A paraphrase whose vector score
// sits under the ordinary floor is refused with NO reader; the SAME question,
// the SAME material, is answered honestly once a reader is supplied — because
// the floor that applies is a different one (KNOWLEDGE_READER_MIN_SCORE, a
// hallucination guard) and the real decision moves to what the reader says.
// `retrieve()` is called directly rather than through `ask()`'s HTTP door,
// because `read` is a function and cannot cross that boundary — the door
// wiring (gating + metering a real model call) is a separate, not-yet-built
// piece; this proves the mechanism `retrieve()` itself now has.
describe("the reader recovers a paraphrase the floor alone would refuse (BUILD-5 §5-6)", () => {
  const guard: MemberGuard = { userId: IDS.staffUser, teamId: IDS.team, roleId: IDS.adminRole, databaseId: "db" }

  beforeEach(async () => {
    await addSource(IDS.staffUser, {
      title: "Team Assembly",
      body: "The monthly team assembly happens on the first Friday. Aurora organises it and rotates who leads it next time.",
    })
  })

  /** A reader that keeps everything it is shown — proves the RECOVERY half. */
  const keepEverything = async (_q: string, shortlist: { sourceId: string; seq: number }[]) => ({
    relevant: shortlist.map(passageId),
  })
  /** A reader that has genuinely looked and found nothing — proves that
   * widening the floor does not mean the reader rubber-stamps whatever it is
   * shown; an HONEST refusal is still available after reading. */
  const keepNothing = async () => ({ relevant: [] })

  // The reader's OWN floor, set low enough that the fake model's cosine for
  // this genuine-but-partial overlap (2 of the question's 4 terms) clears it
  // — the fake model's scale has nothing to do with bge-m3's, so this number
  // means nothing beyond "this suite's stand-in model, this fixture". Paired
  // with the SAME impossibly strict `minScore` as the no-reader test above, so
  // every reader test here proves the two floors are genuinely independent
  // vars, not one relaxed reading of the other.
  const READER_OPTS = { ...NOTHING_CLOSE_ENOUGH, readerMinScore: "0.15" }

  it("without a reader, the strict floor refuses the paraphrase", async () => {
    const answer = await retrieve(env(IDS.staffUser, NOTHING_CLOSE_ENOUGH), {} as never, guard, {
      question: "who organises our monthly get-together?",
    })
    expect(answer.found, `answered out of ${titles(answer).join(", ") || "nothing"}`).toBe(false)
  })

  it("with a reader, KNOWLEDGE_MIN_SCORE stops being the question — the reader's own floor and verdict decide", async () => {
    const answer = await retrieve(env(IDS.staffUser, READER_OPTS), {} as never, guard, {
      question: "who organises our monthly get-together?",
      read: keepEverything,
    })
    expect(answer.found, `still refused; reason: ${answer.reason}`).toBe(true)
    expect(titles(answer)).toContain("Team Assembly")
  })

  it("and a reader that genuinely finds nothing still produces an honest refusal, not a rubber stamp", async () => {
    const answer = await retrieve(env(IDS.staffUser, READER_OPTS), {} as never, guard, {
      question: "who organises our monthly get-together?",
      read: keepNothing,
    })
    expect(answer.found).toBe(false)
    expect(answer.passages).toEqual([])
    expect(answer.citations).toEqual([])
  })

  it("a reader that fails to run refuses honestly, rather than exposing the widened pool unjudged", async () => {
    const answer = await retrieve(env(IDS.staffUser, READER_OPTS), {} as never, guard, {
      question: "who organises our monthly get-together?",
      read: async () => null,
    })
    // The pool this would have shown a reader was built against the LOW
    // hallucination-guard floor, not the strict one — so a failed reader must
    // NOT fall through to answering from it: that would be exactly the
    // uncalibrated-cosine failure this mechanism exists to fix, on the one
    // path (a model outage) nobody is watching. Refuse instead.
    expect(answer.found).toBe(false)
    expect(answer.passages).toEqual([])
  })

  // AND THE OTHER HALF OF THAT SENTENCE, WHICH WENT UNWRITTEN FOR A DAY.
  //
  // The test above is correct and stays: its fixture pins an impossibly strict
  // `minScore`, so the strict floor would have kept NOTHING, and refusing is
  // the only honest answer. What it does not say — and what nothing said — is
  // what happens when a reader fails on material the strict floor WOULD have
  // allowed through cleanly. The old code cleared `ranked` to empty either
  // way, so a reader outage did not cost the widened extras it was summoned
  // for: it cost the ORDINARY answer as well, the one the base would have
  // given if nobody had asked for a reader at all.
  //
  // Its own comment admitted the price ("it costs an answer the strict floor
  // might have allowed through cleanly") on the assumption that a failed
  // reader is a rare model outage. MEASURED 11 Sep 2026 by kb_E against the
  // real model and a real twelve-passage shortlist: the reader fails on
  // ORDINARY questions, because it writes its reasoning into the same token
  // budget as its answer and runs out. Four columns of the exam: 27/36 with no
  // reader, 8/36 with one. A mechanism built to RECOVER answers was destroying
  // two thirds of them, and this handling is why.
  //
  // So a failed reader now costs only what it was supposed to add. The
  // widened pool is narrowed back to what the strict floor would have kept,
  // which is the pre-reader behaviour — not identical to it (the fuse ranks
  // over a different candidate list), and deliberately not claimed as
  // identical; what is guaranteed is that nothing survives here that the
  // strict floor would have rejected.
  it("a reader that fails costs the widened extras and NOT the ordinary answer", async () => {
    const question = "who organises the monthly team assembly?"
    // What the base says with no reader involved at all — the floor alone.
    const withoutReader = await retrieve(env(IDS.staffUser, {}), {} as never, guard, { question })
    expect(withoutReader.found, "fixture broken: the plain floor must answer this one").toBe(true)
    expect(titles(withoutReader)).toContain("Team Assembly")

    // The same question, a reader asked for, and the reader falls over.
    const readerDied = await retrieve(env(IDS.staffUser, { readerMinScore: "0.15" }), {} as never, guard, {
      question,
      read: async () => null,
    })
    expect(readerDied.found, `a reader outage swallowed the ordinary answer; reason: ${readerDied.reason}`).toBe(
      true
    )
    expect(titles(readerDied)).toContain("Team Assembly")
  })
})

// KB-AUDIT.md §4.5, MEASURED 10 Sep 2026: "what changed this week?" returned
// one citation from 31 August while a 7 September source (88 chunks) existed
// and was never retrieved — ABSENT, not ranked low, because a generic
// recency question shares no words or meaning with any one week's specific
// content. Neither the vector nor the lexical arm can find something they do
// not recognise; the recency arm does not try to recognise anything, it asks
// what is newest, and only when the question itself asked for that.
describe("the recency arm — a question that wants what is new (KB-AUDIT.md §4.5)", () => {
  let newestId = ""

  beforeEach(async () => {
    const oldId = await addSource(IDS.staffUser, {
      title: "Week planning",
      body: "The team discussed the invoice run and the sign-off steps for next month.",
    })
    db().exec(`UPDATE knowledge_sources SET record_date = '2026-01-01' WHERE id = '${oldId}'`)
    newestId = await addSource(IDS.staffUser, {
      title: "Office supplies note",
      body: "A completely unconnected note about stationery and printer paper, sharing no topic with anything else here.",
    })
    db().exec(`UPDATE knowledge_sources SET record_date = '2026-09-07' WHERE id = '${newestId}'`)
  })

  it("without recency intent, a question with no shared vocabulary finds nothing — the absence the audit measured", async () => {
    const answer = await ask(IDS.staffUser, "what's going on?", undefined, NOTHING_CLOSE_ENOUGH)
    expect(answer.found).toBe(false)
  })

  it("'latest' recovers the newest source even though it shares no words with the question", async () => {
    const answer = await ask(IDS.staffUser, "what's the latest?", undefined, NOTHING_CLOSE_ENOUGH)
    expect(answer.found, `answered out of ${titles(answer).join(", ") || "nothing"}`).toBe(true)
    expect(titles(answer)).toContain("Office supplies note")
  })

  it("hasRecencyIntent is the gate — 'currently'/'today'/'this week' do NOT trigger it (measured: they collide with ordinary questions)", () => {
    for (const ordinary of [
      "where do things currently stand?",
      "what is due today?",
      "what happened this week?",
      "since last week, has anything moved?",
    ])
      expect(hasRecencyIntent(ordinary), ordinary).toBe(false)
    for (const real of ["what's the latest?", "any recent news?", "what's the newest update?", "what changed?"])
      expect(hasRecencyIntent(real), real).toBe(true)
  })
})

describe("the compartment is derived, and it is the reasoning that ships", () => {
  beforeEach(async () => {
    await addSource(IDS.staffUser, {
      title: "Bergman rollout plan",
      body: "Bergman S.A. moves to the new invoice run in March. Their finance team signs it off.",
      accountId: IDS.victimAccount,
    })
    await addSource(IDS.staffUser, {
      title: "Delaval rollout plan",
      body: "Delaval Group moves to the new invoice run in June. Their operations lead signs it off.",
      accountId: IDS.burglarAccount,
    })
    await addSource(IDS.staffUser, {
      title: "How we run a rollout",
      body: "Every rollout starts with a dry run and a written sign-off from the client.",
    })
    // `accountsNamedIn` reads `knowledge_names` (0073), not `accounts` directly —
    // in production the sync door keeps it in step (`postKnowledgeSync`); here
    // it is built once, directly, the same way `diversify` is exercised as a
    // plain function elsewhere in this suite. `cfg`/`guard` are both ignored by
    // the mocked D1 door (see d1-sqlite.ts) — only `databaseId` would matter
    // against the real door, and this harness has one shared database.
    await rebuildNameIndex({} as never, { databaseId: "db" } as never)
  })

  it("a question naming a client searches that client and the agency, and says so", async () => {
    const answer = await ask(IDS.staffUser, "when does Bergman move to the new invoice run?")
    expect(answer.compartments).toEqual([`account:${IDS.victimAccount}`, "agency"])
    // The reasoning is the product: a wrong compartment is invisible otherwise.
    expect(answer.reason).toContain("Bergman S.A.")
    expect(titles(answer)).toContain("Bergman rollout plan")
    // …and the other client's material is NOT in the answer, which is the whole
    // point of compartmenting a single index.
    expect(titles(answer)).not.toContain("Delaval rollout plan")
  })

  it("standing on a record beats guessing from the words", async () => {
    // The same question, with no client named in it at all: the compartment
    // comes from WHERE it was asked from.
    const answer = await ask(IDS.staffUser, "when do they move to the new invoice run?", IDS.burglarAccount)
    expect(answer.compartments).toEqual([`account:${IDS.burglarAccount}`, "agency"])
    expect(answer.reason).toContain("Delaval Group")
    expect(titles(answer)).toContain("Delaval rollout plan")
    expect(titles(answer)).not.toContain("Bergman rollout plan")
  })

  it("a question with no client in it searches everything, and says that too", async () => {
    const answer = await ask(IDS.staffUser, "how do we run a rollout?")
    expect(answer.compartments).toEqual([])
    expect(answer.reason).toContain("named no client")
    expect(titles(answer)).toContain("How we run a rollout")
  })

  // A QUESTION ABOUT THE APP ITSELF. The agency's own documentation — the scope
  // chapters, the vocabulary, the laws, the screen guide that
  // scripts/seed-knowledge-about-the-app.mjs writes — lives in the agency's
  // compartment, and a staging test reported one of those questions being answered
  // out of a client's material instead.
  //
  // The compartment cannot be what did that, and this is the assertion that says
  // so out loud rather than leaving it to be re-derived: EVERY branch of the route
  // keeps the agency's own compartment. Standing on a client's record adds theirs;
  // naming a client in the question adds theirs; naming nobody narrows to nothing
  // at all. There is no route through deriveCompartment that puts the agency's own
  // material out of reach, so if app-self material ever loses, it lost on RANKING
  // and the fix is not here.
  it("never routes a question away from the agency's own material", async () => {
    await addSource(IDS.staffUser, {
      title: "Why the client portal is a separate app",
      body: "The client portal is a different app at a different address. It is not a copy of the agency app and nothing is synced between them — they are two permission-gated views of the same rows.",
    })
    for (const [label, answer] of [
      ["names a client", await ask(IDS.staffUser, "why does Bergman have a separate client portal?")],
      ["stands on a client", await ask(IDS.staffUser, "why a separate client portal?", IDS.burglarAccount)],
      ["names nobody", await ask(IDS.staffUser, "why is the client portal a separate app?")],
    ] as const) {
      const searched = answer.compartments
      expect(
        searched.length === 0 || searched.includes("agency"),
        `${label}: searched ${JSON.stringify(searched)} — the agency's own material must always be in reach`
      ).toBe(true)
    }
    // …and it really is reachable, not merely in scope.
    expect(titles(await ask(IDS.staffUser, "why is the client portal a separate app?"))).toContain(
      "Why the client portal is a separate app"
    )
  })

  it("a word inside a longer name does not file a question under that client", async () => {
    // "Marine" is a word in "Bergman Marine". A question about marine insurance
    // must not be answered out of that account's compartment just because the
    // LIKE matched — every word of the account's own name has to appear.
    const answer = await ask(IDS.staffUser, "what does our marine insurance cover?")
    expect(answer.compartments).toEqual([])
  })

  // THE DETERMINISTIC HALF OF BUILD-5's FAN-OUT: a question naming TWO clients
  // widens the search to both of them, rather than the router's old
  // `ORDER BY LENGTH(name) DESC` picking whichever sorted longest and silently
  // dropping the other. No model call — this is a lookup against real named
  // entities the team already holds records for, not a judgment about
  // language, which is why it is safe to run on every question.
  it("a question naming two clients searches both, not whichever name sorted longest", async () => {
    const answer = await ask(IDS.staffUser, "when do Bergman S.A. and Delaval Group both move to the new invoice run?")
    expect(answer.compartments.sort()).toEqual(
      [`account:${IDS.victimAccount}`, `account:${IDS.burglarAccount}`, "agency"].sort()
    )
    expect(answer.reason).toContain("Bergman S.A.")
    expect(answer.reason).toContain("Delaval Group")
    // …and both accounts' material is actually reachable, not merely in the
    // compartment list — the whole point of widening the search rather than
    // widening the sentence alone.
    expect(titles(answer)).toContain("Bergman rollout plan")
    expect(titles(answer)).toContain("Delaval rollout plan")
  })
})

// KB-AUDIT.md §4.2 — THE ROUTER HIJACKED BY ORDINARY WORDS. 26 of 134 staging
// accounts have a single-token name that is also an ordinary English word
// ("VU Solutions" → "solutions", "re-green" → "green"), and the old router
// (a raw scan of `accounts`) matched on that one token alone: a question
// about "solutions" in general silently narrowed to whichever account
// happened to be named that. `accountsNamedIn` now requires a single-token
// name to be RARE across the corpus (`isRareTerm`) before it may narrow —
// exercised here directly rather than through the fake embedding model,
// because the fault is in ROUTING, not ranking.
describe("the account router is not hijacked by a name that is also an ordinary word (§4.2)", () => {
  const HIJACKER = "A_HIJACK"
  const RARE_NAMED = "A_RARE"

  beforeEach(() => {
    db().exec(
      `INSERT INTO accounts (id, account_type, name, code, created_at) VALUES
         ('${HIJACKER}', 'entity', 'VU Solutions', NULL, '2026-01-01'),
         ('${RARE_NAMED}', 'entity', 'Paddlebase', NULL, '2026-01-01');`
    )
    // A DUMMY SOURCE, purely as knowledge_chunks' FK target — this test is
    // about the ROUTER, so the chunks below are filler text, never asked
    // about and never expected to be cited.
    db().exec(
      `INSERT INTO knowledge_sources (id, kind, title, compartment, created_at)
         VALUES ('S_FILLER', 'note', 'Filler', 'agency', '2026-01-01');`
    )
    // A REAL source about Paddlebase, filed under its own compartment — c-hijack
    // A3's own retry-on-empty fires whenever a fragile single-token narrow
    // finds nothing, and a fixture with no real material behind the narrow
    // would trigger it every time, silently changing what this test proves
    // from "the rarity gate lets a real name through" to "A3 widens past an
    // empty fixture" — a different claim. Real content keeps the two questions
    // separate.
    db().exec(
      `INSERT INTO knowledge_sources (id, kind, title, compartment, created_at)
         VALUES ('S_PADELBASE', 'note', 'Paddlebase migration notes', 'account:${RARE_NAMED}', '2026-01-01');
       INSERT INTO knowledge_chunks (id, source_id, compartment, seq, text, created_at)
         VALUES ('C_PADELBASE', 'S_PADELBASE', 'account:${RARE_NAMED}', 0, 'the Paddlebase migration status is on track for next month', '2026-01-01');
       INSERT INTO knowledge_chunks_fts(rowid, text) SELECT rowid, text FROM knowledge_chunks WHERE source_id = 'S_PADELBASE';`
    )
    // MAKE "solutions" COMMON — over EXACT_TERM_MAX_CHUNKS (100) chunks say
    // it, the same shape as the audit's own real corpus, where "solutions"
    // is an everyday word said across hundreds of chunks that have nothing
    // to do with the VU Solutions account.
    const rows: string[] = []
    for (let i = 0; i < 120; i++)
      rows.push(
        `INSERT INTO knowledge_chunks (id, source_id, compartment, seq, text, created_at)
           VALUES ('C_FILL_${i}', 'S_FILLER', 'agency', ${i}, 'we discussed several possible solutions for this problem', '2026-01-01');`
      )
    db().exec(rows.join("\n"))
    db().exec(
      "INSERT INTO knowledge_chunks_fts(rowid, text) SELECT rowid, text FROM knowledge_chunks WHERE source_id = 'S_FILLER';"
    )
  })

  it("does not narrow to an account whose name is a single, ordinary, common word", async () => {
    await rebuildNameIndex({} as never, { databaseId: "db" } as never)
    const answer = await ask(IDS.staffUser, "what solutions have we proposed for data import?")
    // THE BUG (KB-AUDIT.md §4.2's own transcript) is the COMPARTMENT narrowing —
    // "I searched VU Solutions's material and the agency's own" — which hides
    // every OTHER client's material behind an account nobody named. It is not
    // this: a separate, floored vector search over record SUMMARIES may still
    // mention "VU Solutions" in the advisory sentence once it is genuinely
    // indexed and genuinely similar (its own name shares the word "solutions"
    // with the question) — that is `deriveRoute`'s "covers" feature working as
    // documented, and it never narrows anything on its own (see its header).
    expect(answer.compartments).toEqual([])
    expect(answer.reason).toContain("named no client")
    expect(answer.reason).not.toContain("I searched VU Solutions's material")
  })

  it("still narrows to a single-token name that is genuinely rare in the corpus", async () => {
    await rebuildNameIndex({} as never, { databaseId: "db" } as never)
    const answer = await ask(IDS.staffUser, "what is the status of the Paddlebase migration?")
    expect(answer.compartments).toEqual([`account:${RARE_NAMED}`, "agency"])
    expect(answer.reason).toContain("Paddlebase")
  })
})

// c-hijack, ticked once on the wrong evidence (11 Sep 2026) and unticked the
// same day: §4.2's own test above used 120 filler chunks for "solutions",
// already over the OLD ceiling (EXACT_TERM_MAX_CHUNKS, 100) by construction —
// it could never have caught the real bug, because staging's real count (79)
// sits UNDER that ceiling. These three use the REAL measured staging counts
// (this file's own `ACCOUNT_TOKEN_MAX_CHUNKS` header has the full 26-account
// distribution), so a threshold that only looks tight is told apart from one
// that actually is.
describe("c-hijack (A): a threshold measured against the RIGHT population closes the three proven cases", () => {
  const SOLUTIONS = "A_HIJACK_SOLUTIONS"
  const GREEN = "A_HIJACK_GREEN"
  const UMLAUT = "A_HIJACK_UMLAUT"

  beforeEach(() => {
    db().exec(
      `INSERT INTO accounts (id, account_type, name, code, created_at) VALUES
         ('${SOLUTIONS}', 'entity', 'VU Solutions', NULL, '2026-01-01'),
         ('${GREEN}', 'entity', 're-green', NULL, '2026-01-01'),
         ('${UMLAUT}', 'entity', 'Grün Logistik', NULL, '2026-01-01');`
    )
    db().exec(
      `INSERT INTO knowledge_sources (id, kind, title, compartment, created_at)
         VALUES ('S_FILLER', 'note', 'Filler', 'agency', '2026-01-01');`
    )
    const rows: string[] = []
    // 79 — VU Solutions's real measured staging count.
    for (let i = 0; i < 79; i++)
      rows.push(
        `INSERT INTO knowledge_chunks (id, source_id, compartment, seq, text, created_at)
           VALUES ('C_SOL_${i}', 'S_FILLER', 'agency', ${i}, 'we discussed several possible solutions', '2026-01-01');`
      )
    // 35 — re-green's real measured staging count.
    for (let i = 0; i < 35; i++)
      rows.push(
        `INSERT INTO knowledge_chunks (id, source_id, compartment, seq, text, created_at)
           VALUES ('C_GRN_${i}', 'S_FILLER', 'agency', ${100 + i}, 'the light was green when we checked', '2026-01-01');`
      )
    // 40 — an UMLAUT-collapsed ordinary word ("Logistik" — German for
    // "logistics"), never a dropped SHORT word: "Grün" shatters entirely
    // (both fragments under the 3-character floor), leaving "logistik" as
    // the sole survivor — the mechanism this describe block's sibling test
    // is for.
    for (let i = 0; i < 40; i++)
      rows.push(
        `INSERT INTO knowledge_chunks (id, source_id, compartment, seq, text, created_at)
           VALUES ('C_LOG_${i}', 'S_FILLER', 'agency', ${200 + i}, 'the logistik team confirmed the delivery window', '2026-01-01');`
      )
    db().exec(rows.join("\n"))
    db().exec(
      "INSERT INTO knowledge_chunks_fts(rowid, text) SELECT rowid, text FROM knowledge_chunks WHERE source_id = 'S_FILLER';"
    )
  })

  it("VU Solutions no longer hijacks 'what solutions have we proposed for data import?'", async () => {
    await rebuildNameIndex({} as never, { databaseId: "db" } as never)
    const answer = await ask(IDS.staffUser, "what solutions have we proposed for data import?")
    expect(answer.compartments).toEqual([])
    expect(answer.reason).toContain("named no client")
  })

  it("re-green no longer hijacks 'which parts are green and ready?' — including the outright refusal it used to cause", async () => {
    await rebuildNameIndex({} as never, { databaseId: "db" } as never)
    const answer = await ask(IDS.staffUser, "which parts are green and ready?")
    expect(answer.compartments).toEqual([])
    // KB-AUDIT's own worst outcome: a wrong narrow that then finds nothing
    // and refuses outright, on a corpus that had the answer all along.
    // Fixed at the ROUTING layer, this shape cannot recur from THIS cause —
    // a genuinely empty result for an unnarrowed search is a separate,
    // legitimate "found: false" this test does not claim to touch.
  })

  it("an umlaut-collapsed ordinary word is caught exactly like a dropped-short-word collapse — same fix, different mechanism", async () => {
    await rebuildNameIndex({} as never, { databaseId: "db" } as never)
    const answer = await ask(IDS.staffUser, "has the logistik process changed this month?")
    expect(answer.compartments).toEqual([])
    expect(answer.reason).toContain("named no client")
  })
})

// c-hijack (A2): a single collapsed token that names more than one real
// account is evidence about the WORD, not either company — derived from the
// data itself, no dictionary and no threshold. Fixture names deliberately do
// NOT appear in spine-harness.ts: reusing "Bergman S.A." from there is
// exactly what produced a false "two accounts collide" reading earlier in
// this investigation (a name duplicate, not a real finding), and it is not
// a mistake worth repeating in the test that is supposed to prove the fix.
describe("c-hijack (A2): an ambiguous shared token resolves to NEITHER account, not both", () => {
  const ROSEWOOD_1 = "A_HIJACK_ROSEWOOD_1"
  const ROSEWOOD_2 = "A_HIJACK_ROSEWOOD_2"

  beforeEach(() => {
    // "VX Rosewood" and "re-rosewood" collapse to the identical single token
    // "rosewood" by two different routes (a dropped short prefix, a dropped
    // short word) — two genuinely different companies, one shared word.
    db().exec(
      `INSERT INTO accounts (id, account_type, name, code, created_at) VALUES
         ('${ROSEWOOD_1}', 'entity', 'VX Rosewood', NULL, '2026-01-01'),
         ('${ROSEWOOD_2}', 'entity', 're-rosewood', NULL, '2026-01-01');`
    )
    db().exec(
      `INSERT INTO knowledge_sources (id, kind, title, compartment, created_at)
         VALUES ('S_FILLER', 'note', 'Filler', 'agency', '2026-01-01');`
    )
    // Well under ACCOUNT_TOKEN_MAX_CHUNKS on its own — proving this is NOT
    // the threshold doing the work, it is the ambiguity check.
    const rows: string[] = []
    for (let i = 0; i < 5; i++)
      rows.push(
        `INSERT INTO knowledge_chunks (id, source_id, compartment, seq, text, created_at)
           VALUES ('C_ROSE_${i}', 'S_FILLER', 'agency', ${i}, 'the rosewood finish was approved', '2026-01-01');`
      )
    db().exec(rows.join("\n"))
    db().exec(
      "INSERT INTO knowledge_chunks_fts(rowid, text) SELECT rowid, text FROM knowledge_chunks WHERE source_id = 'S_FILLER';"
    )
  })

  it("a question mentioning the shared word names neither account", async () => {
    await rebuildNameIndex({} as never, { databaseId: "db" } as never)
    const answer = await ask(IDS.staffUser, "was the rosewood finish approved yet?")
    expect(answer.compartments).toEqual([])
    expect(answer.compartments).not.toContain(`account:${ROSEWOOD_1}`)
    expect(answer.compartments).not.toContain(`account:${ROSEWOOD_2}`)
  })
})

// c-hijack (A3). Weighed before building (the hub's own three questions,
// answered in the branch's commit): a fragile narrow that finds nothing bets
// on a compartment that just cost nothing to protect, so the search widens
// once, unnarrowed, rather than refusing outright. THE POPULATION THIS COSTS
// A SECOND ROUND TRIP ON is countable, not open-ended: the 26 staging
// accounts whose canonical name collapses to one surviving token
// (`ACCOUNT_TOKEN_MAX_CHUNKS`'s own header has the full list) — every other
// account (an alias/code match, a multi-token match, or standing on a record)
// never retries at all.
describe("c-hijack (A3): a fragile narrow that finds nothing retries unnarrowed — never after an alias or code match", () => {
  const LUMEN = "A_HIJACK_LUMEN"
  const HOGO_STYLE = "A_HIJACK_HOGOSTYLE"
  // A THIRD account, unrelated to either — its own compartment is reachable
  // ONLY by a full, unnarrowed search. `agency` is deliberately not used for
  // this: it is part of EVERY single-account narrow already (`deriveCompartment`'s
  // own `[account, AGENCY_COMPARTMENT]` shape), so content filed there would
  // be found on the FIRST pass regardless of whether A3 ever ran — proving
  // nothing about the retry specifically.
  const ELSEWHERE = "A_HIJACK_ELSEWHERE"

  beforeEach(() => {
    db().exec(
      `INSERT INTO accounts (id, account_type, name, code, created_at) VALUES
         ('${LUMEN}', 'entity', 'Lumen', NULL, '2026-01-01'),
         ('${HOGO_STYLE}', 'entity', 'Praxis Health', 'PRAXIS', '2026-01-01'),
         ('${ELSEWHERE}', 'entity', 'Delaval Marine', NULL, '2026-01-01');`
    )
  })

  it("finds nothing under the narrowed compartment, widens once, and the reason sentence says so honestly", async () => {
    // "Lumen" is a real, single-token, rare name — fragile by c-hijack's own
    // definition — with no material of its own. The ONLY matching material
    // sits under a completely different account's compartment, reachable
    // only once the search is genuinely unnarrowed.
    db().exec(
      `INSERT INTO knowledge_sources (id, kind, title, compartment, created_at)
         VALUES ('S_LUMEN_MENTION', 'note', 'Team update', 'account:${ELSEWHERE}', '2026-01-01');
       INSERT INTO knowledge_chunks (id, source_id, compartment, seq, text, created_at)
         VALUES ('C_LUMEN_MENTION', 'S_LUMEN_MENTION', 'account:${ELSEWHERE}', 0, 'the Lumen relocation review moved to next quarter', '2026-01-01');
       INSERT INTO knowledge_chunks_fts(rowid, text) SELECT rowid, text FROM knowledge_chunks WHERE source_id = 'S_LUMEN_MENTION';`
    )
    await rebuildNameIndex({} as never, { databaseId: "db" } as never)
    const answer = await ask(IDS.staffUser, "what is the Lumen relocation?")
    // THE RECEIPT — a person must be able to read that a guess was made, that
    // it paid nothing, and that the search widened because of it.
    expect(answer.reason).toBe(
      "The question names Lumen, so I first searched Lumen's material — found nothing there, so I searched the whole knowledge base instead."
    )
    expect(answer.compartments).toEqual([])
    expect(answer.found).toBe(true)
    expect(titles(answer)).toContain("Team update")
  })

  it("NEVER retries after an alias/code match — a real answer about the account, not a bad guess to retry past", async () => {
    // Praxis Health's own code, PRAXIS, matches exactly and has NO material of
    // its own. Material that WOULD be found if this incorrectly retried sits
    // under a third, unrelated account's compartment — reachable only by a
    // full unnarrow, which an alias match must never trigger.
    db().exec(
      `INSERT INTO knowledge_sources (id, kind, title, compartment, created_at)
         VALUES ('S_PRAXIS_ELSEWHERE', 'note', 'Reading list', 'account:${ELSEWHERE}', '2026-01-01');
       INSERT INTO knowledge_chunks (id, source_id, compartment, seq, text, created_at)
         VALUES ('C_PRAXIS_ELSEWHERE', 'S_PRAXIS_ELSEWHERE', 'account:${ELSEWHERE}', 0, 'the praxis relocation of good management theory is discussed in this book', '2026-01-01');
       INSERT INTO knowledge_chunks_fts(rowid, text) SELECT rowid, text FROM knowledge_chunks WHERE source_id = 'S_PRAXIS_ELSEWHERE';`
    )
    await rebuildNameIndex({} as never, { databaseId: "db" } as never)
    const answer = await ask(IDS.staffUser, "what is the PRAXIS relocation?")
    // Narrowed, found nothing THERE, and STAYS narrowed — the compartment is
    // still Praxis Health's own, never widened to pick up the unrelated hit.
    expect(answer.compartments).toEqual([`account:${HOGO_STYLE}`, "agency"])
    expect(answer.found).toBe(false)
    expect(answer.reason).toContain("Praxis Health")
    expect(answer.reason).not.toContain("found nothing there")
  })

  // NAMED, ACCEPTED RISK — spelled out here rather than left to a commit
  // message, per the hub's own instruction. The weighing's third question,
  // answered concretely: yes, this can happen, and it is the SAME risk an
  // ordinary "named no client" question already carries every day, behind
  // the SAME floors, now also reached through this second door. "Lumen" the
  // CLIENT and "lumen" the unit of luminous flux are a real homonym — the
  // exact shape of coincidence c-hijack has been about throughout, here at
  // the CONTENT level rather than the account-name level.
  it("ACCEPTED RISK: when the wider corpus has UNRELATED material that clears the same floors, A3 can answer from the wrong material — same risk the unnarrowed path already carries daily", async () => {
    db().exec(
      `INSERT INTO knowledge_sources (id, kind, title, compartment, created_at)
         VALUES ('S_LUMEN_UNIT', 'note', 'Lighting spec sheet', 'account:${ELSEWHERE}', '2026-01-01');
       INSERT INTO knowledge_chunks (id, source_id, compartment, seq, text, created_at)
         VALUES ('C_LUMEN_UNIT', 'S_LUMEN_UNIT', 'account:${ELSEWHERE}', 0, 'the office lighting relocation measured 800 Lumen, well within spec', '2026-01-01');
       INSERT INTO knowledge_chunks_fts(rowid, text) SELECT rowid, text FROM knowledge_chunks WHERE source_id = 'S_LUMEN_UNIT';`
    )
    await rebuildNameIndex({} as never, { databaseId: "db" } as never)
    const answer = await ask(IDS.staffUser, "what is the Lumen relocation?")
    // This IS what ships: the retry finds the unrelated note (about a unit of
    // light, not the client) and answers from it. The mitigation is not
    // silence — it is R23's citations (a reader checking the source would see
    // it is a lighting spec sheet, not Lumen's own material) and the reason
    // sentence, which still says plainly that Lumen's own material had
    // nothing and the search widened past it.
    expect(answer.found).toBe(true)
    expect(titles(answer)).toContain("Lighting spec sheet")
    expect(answer.reason).toContain("found nothing there")
  })

  // THE QUESTION THE HUB ASKED ME TO PROVE, NOT REASON ABOUT (11 Sep 2026):
  // can A3's unnarrowed retry reach a source the CALLER'S OWN FENCE would
  // have refused? `route.compartments` only decides which COMPARTMENTS the
  // candidate arms search — the read-back that turns a candidate id into a
  // passage (`retrieve`'s `readerClause(guard, "s.")` join) runs
  // unconditionally, after every `searchArms` call including the retry, and
  // never reads `route.compartments` at all. So a private source sitting in
  // the wide-open retry's path must still be invisible to a colleague who
  // has no sighting of it and does not own it — proved here by mutation,
  // not asserted from reading the source.
  it("SECURITY: the unnarrowed retry cannot surface a source the caller's own fence would refuse", async () => {
    db().exec(
      `INSERT INTO knowledge_sources (id, kind, title, compartment, owner_user_id, team_visible, created_at)
         VALUES ('S_LUMEN_PRIVATE', 'note', 'Lumen — my own read on the relocation', 'account:${ELSEWHERE}', '${OTHER_STAFF}', 0, '2026-01-01');
       INSERT INTO knowledge_chunks (id, source_id, compartment, seq, text, created_at)
         VALUES ('C_LUMEN_PRIVATE', 'S_LUMEN_PRIVATE', 'account:${ELSEWHERE}', 0, 'my private note: the Lumen relocation review moved to next quarter', '2026-01-01');
       INSERT INTO knowledge_chunks_fts(rowid, text) SELECT rowid, text FROM knowledge_chunks WHERE source_id = 'S_LUMEN_PRIVATE';`
    )
    await rebuildNameIndex({} as never, { databaseId: "db" } as never)
    // IDS.staffUser is not OTHER_STAFF, holds no sighting of this source, and
    // does not own it — the retry's own widened search WILL surface this
    // chunk as a candidate (proved by the sibling test above, same shape,
    // same account, no owner set); the only thing standing between that
    // candidate and an answer is the read-back fence.
    const answer = await ask(IDS.staffUser, "what is the Lumen relocation?")
    expect(answer.found, `answered out of ${titles(answer).join(", ")}`).toBe(false)
  })
})

// c-hijack (B): a person's OWN declaration that a single-token name may
// narrow a search alone — 0085, built after A/A2/A3 because the owner's
// ruling ("if you know how to fix it, fix it") replaced the 1.5-day estimate
// in NOTE-c-hijack-B-declared-safety.md with "one hour, not 1.5 days."
//
// THE DECLARED FLAG IS AN ADDITIONAL BYPASS, NEVER A REQUIREMENT — `OR`, not
// `AND`, in `accountsNamedIn`'s own condition. An already-rare name (Bergman
// S.A.'s surname, 1 chunk) keeps narrowing exactly as A already made it,
// undeclared; what the flag adds is a SECOND way in, for a name that is NOT
// rare (an ordinary word with real chunk volume — the "aws"/"platinum"
// shape A's own header names as unclosable by any threshold).
describe("c-hijack (B): a declared name_narrows_alone bypasses the rarity gate, never the A2 ambiguity check", () => {
  const PREMIUM = "A_HIJACK_B_PREMIUM"
  const RARE = "A_HIJACK_B_RARE"

  beforeEach(() => {
    db().exec(
      `INSERT INTO accounts (id, account_type, name, code, created_at) VALUES
         ('${PREMIUM}', 'entity', 'Premium', NULL, '2026-01-01'),
         ('${RARE}', 'entity', 'Vandenbroucke', NULL, '2026-01-01');`
    )
    db().exec(
      `INSERT INTO knowledge_sources (id, kind, title, compartment, created_at)
         VALUES ('S_FILLER_B', 'note', 'Filler', 'agency', '2026-01-01');`
    )
    // 50 — well over ACCOUNT_TOKEN_MAX_CHUNKS (30): "premium" is an ordinary
    // word this corpus already talks about a lot, the same shape as the real
    // "aws"/"platinum" ties A's own header names as unclosable by rarity alone.
    const rows: string[] = []
    for (let i = 0; i < 50; i++)
      rows.push(
        `INSERT INTO knowledge_chunks (id, source_id, compartment, seq, text, created_at)
           VALUES ('C_PREM_${i}', 'S_FILLER_B', 'agency', ${i}, 'we offer a premium tier on request', '2026-01-01');`
      )
    db().exec(rows.join("\n"))
    db().exec(
      "INSERT INTO knowledge_chunks_fts(rowid, text) SELECT rowid, text FROM knowledge_chunks WHERE source_id = 'S_FILLER_B';"
    )
    // Real material under Premium's OWN compartment, so a successful narrow
    // finds something rather than tripping A3's retry — these tests are about
    // WHETHER it narrows, not what happens when a narrow finds nothing.
    db().exec(
      `INSERT INTO knowledge_sources (id, kind, title, compartment, created_at)
         VALUES ('S_PREMIUM_OWN', 'note', 'Renewal notes', 'account:${PREMIUM}', '2026-01-01');
       INSERT INTO knowledge_chunks (id, source_id, compartment, seq, text, created_at)
         VALUES ('C_PREMIUM_OWN', 'S_PREMIUM_OWN', 'account:${PREMIUM}', 0, 'Premium renewal status: approved for another year', '2026-01-01');
       INSERT INTO knowledge_chunks_fts(rowid, text) SELECT rowid, text FROM knowledge_chunks WHERE source_id = 'S_PREMIUM_OWN';`
    )
  })

  it("an ordinary, non-rare single-token name does NOT narrow while undeclared", async () => {
    await rebuildNameIndex({} as never, { databaseId: "db" } as never)
    const answer = await ask(IDS.staffUser, "what is the status of the premium renewal?")
    expect(answer.compartments).toEqual([])
    expect(answer.reason).toContain("named no client")
  })

  it("the SAME name narrows once a person declares name_narrows_alone", async () => {
    db().exec(`UPDATE accounts SET name_narrows_alone = 1 WHERE id = '${PREMIUM}'`)
    await rebuildNameIndex({} as never, { databaseId: "db" } as never)
    const answer = await ask(IDS.staffUser, "what is the status of the premium renewal?")
    expect(answer.compartments).toEqual([`account:${PREMIUM}`, "agency"])
    expect(answer.found).toBe(true)
    expect(titles(answer)).toContain("Renewal notes")
  })

  it("an already-rare name keeps narrowing UNDECLARED — the flag adds a bypass, it is never a requirement", async () => {
    // Vandenbroucke: a genuinely rare surname, no filler chunks at all —
    // exactly Bergman S.A.'s own shape (A's header: 1 chunk, undeclared,
    // hijacks today). If the `OR` had silently become an `AND`, this is the
    // test that would catch it — every one of the three proven A fixes
    // (green, demo, solutions) is this same undeclared-but-rare shape.
    db().exec(
      `INSERT INTO knowledge_sources (id, kind, title, compartment, created_at)
         VALUES ('S_RARE_OWN', 'note', 'Contract notes', 'account:${RARE}', '2026-01-01');
       INSERT INTO knowledge_chunks (id, source_id, compartment, seq, text, created_at)
         VALUES ('C_RARE_OWN', 'S_RARE_OWN', 'account:${RARE}', 0, 'The Vandenbroucke renewal finally happened this week', '2026-01-01');
       INSERT INTO knowledge_chunks_fts(rowid, text) SELECT rowid, text FROM knowledge_chunks WHERE source_id = 'S_RARE_OWN';`
    )
    await rebuildNameIndex({} as never, { databaseId: "db" } as never)
    const answer = await ask(IDS.staffUser, "what happened with the Vandenbroucke renewal?")
    expect(answer.compartments).toEqual([`account:${RARE}`, "agency"])
    expect(answer.found).toBe(true)
  })

  it("A2 still wins over TWO declared accounts sharing the same token — resolves to neither", async () => {
    // A second account declares the SAME collapsed token "premium" — two real
    // companies both claiming one ordinary word is evidence about the WORD,
    // never either company, exactly as A2 already established for undeclared
    // matches. "re-premium" collapses to "premium" the same way A2's own
    // "re-rosewood" collapses to "rosewood" — a dropped short prefix.
    const PREMIUM_2 = "A_HIJACK_B_PREMIUM_2"
    db().exec(
      `INSERT INTO accounts (id, account_type, name, code, created_at, name_narrows_alone) VALUES
         ('${PREMIUM_2}', 'entity', 're-premium', NULL, '2026-01-01', 1);
       UPDATE accounts SET name_narrows_alone = 1 WHERE id = '${PREMIUM}';`
    )
    await rebuildNameIndex({} as never, { databaseId: "db" } as never)
    const answer = await ask(IDS.staffUser, "what is the status of the premium renewal?")
    expect(answer.compartments).toEqual([])
    expect(answer.compartments).not.toContain(`account:${PREMIUM}`)
    expect(answer.compartments).not.toContain(`account:${PREMIUM_2}`)
  })

  // c-hijack (B), THE SECOND HALF (0086) — the owner's correction, the same
  // night: `name_narrows_alone = 1` (ALLOW) is an `OR` against the rarity
  // gate, so it can only ever ADD a narrow. It does NOTHING for a name that
  // is already rare enough to narrow on its own — Bergman S.A.'s surname is
  // one chunk, well under ACCOUNT_TOKEN_MAX_CHUNKS, and narrows on rarity
  // alone whether or not anyone ever declares it. The residual that actually
  // needed closing was the OPPOSITE: a way to say a word must NEVER narrow
  // alone. `= 2` (DENY) is that control, checked FIRST, before either the
  // rarity gate or the alias/code branch.
  it("a DENY beats rarity — the shape an ALLOW alone could never close, and the one that would have caught the spec error", async () => {
    const DENIED = "A_HIJACK_B_DENIED"
    db().exec(
      `INSERT INTO accounts (id, account_type, name, code, created_at, name_narrows_alone) VALUES
         ('${DENIED}', 'entity', 'Wexford', NULL, '2026-01-01', 2);
       INSERT INTO knowledge_sources (id, kind, title, compartment, created_at)
         VALUES ('S_DENIED_OWN', 'note', 'Onboarding notes', 'account:${DENIED}', '2026-01-01');
       INSERT INTO knowledge_chunks (id, source_id, compartment, seq, text, created_at)
         VALUES ('C_DENIED_OWN', 'S_DENIED_OWN', 'account:${DENIED}', 0, 'The Wexford onboarding finally happened this week', '2026-01-01');
       INSERT INTO knowledge_chunks_fts(rowid, text) SELECT rowid, text FROM knowledge_chunks WHERE source_id = 'S_DENIED_OWN';`
    )
    await rebuildNameIndex({} as never, { databaseId: "db" } as never)
    // Same shape as the "already-rare name keeps narrowing UNDECLARED" test
    // above (one chunk, no filler) — the ONLY difference is the DENY. Without
    // it, this question would narrow exactly like Vandenbroucke's did.
    const answer = await ask(IDS.staffUser, "what happened with the Wexford onboarding?")
    expect(answer.compartments).toEqual([])
    expect(answer.reason).toContain("named no client")
  })

  it("a DENY beats an alias/code match too — a declared 'never narrow alone' must not be defeated by the account's own code", async () => {
    const DENIED_CODE = "A_HIJACK_B_DENIED_CODE"
    db().exec(
      `INSERT INTO accounts (id, account_type, name, code, created_at, name_narrows_alone) VALUES
         ('${DENIED_CODE}', 'entity', 'Wexford Logistics', 'WEXFORD', '2026-01-01', 2);
       INSERT INTO knowledge_sources (id, kind, title, compartment, created_at)
         VALUES ('S_DENIED_CODE_OWN', 'note', 'Shipping notes', 'account:${DENIED_CODE}', '2026-01-01');
       INSERT INTO knowledge_chunks (id, source_id, compartment, seq, text, created_at)
         VALUES ('C_DENIED_CODE_OWN', 'S_DENIED_CODE_OWN', 'account:${DENIED_CODE}', 0, 'The WEXFORD shipment finally happened this week', '2026-01-01');
       INSERT INTO knowledge_chunks_fts(rowid, text) SELECT rowid, text FROM knowledge_chunks WHERE source_id = 'S_DENIED_CODE_OWN';`
    )
    await rebuildNameIndex({} as never, { databaseId: "db" } as never)
    const answer = await ask(IDS.staffUser, "what happened with the WEXFORD shipment?")
    expect(answer.compartments).toEqual([])
    expect(answer.reason).toContain("named no client")
  })
})

// a-names. A contact is an INDIVIDUAL account linked to a company through
// `account_links` — "contact" is a role on that link, not an account_type
// (the table's own header comment). `ref_id` on a contact's `knowledge_names`
// row is the LINKED COMPANY's id, never the contact's own: nothing is ever
// indexed under a real contact's own individual-account id (measured before
// this was built — 119 sources filed that way, all five real chunks a QA
// fixture's own notification emails, against 3,235 under real client
// accounts), so a compartment built from a contact's own id would search
// nothing.
describe("a-names: a contact narrows a search the same way a client name does", () => {
  const NKEMCO = "A_NAMES_NKEMCO"
  const PERSON_JN = "A_NAMES_JAMES_NKEMELU"

  beforeEach(() => {
    db().exec(
      `INSERT INTO accounts (id, account_type, name, code, created_at) VALUES
         ('${NKEMCO}', 'entity', 'Nkemco', NULL, '2026-01-01'),
         ('${PERSON_JN}', 'individual', 'James Nkemelu', NULL, '2026-01-01');
       INSERT INTO account_links (id, account_id, person_account_id, created_at)
         VALUES ('L_JN', '${NKEMCO}', '${PERSON_JN}', '2026-01-01');`
    )
    // "james" is an ordinary English word this corpus already talks about a
    // lot — the exact shape a first name must NEVER be seeded alone for.
    // "nkemelu" is a genuinely rare surname (zero filler chunks).
    db().exec(
      `INSERT INTO knowledge_sources (id, kind, title, compartment, created_at)
         VALUES ('S_JAMES_FILLER', 'note', 'Filler', 'agency', '2026-01-01');`
    )
    const rows: string[] = []
    for (let i = 0; i < 40; i++)
      rows.push(
        `INSERT INTO knowledge_chunks (id, source_id, compartment, seq, text, created_at)
           VALUES ('C_JAMES_${i}', 'S_JAMES_FILLER', 'agency', ${i}, 'james said the room was ready', '2026-01-01');`
      )
    db().exec(rows.join("\n"))
    db().exec(
      "INSERT INTO knowledge_chunks_fts(rowid, text) SELECT rowid, text FROM knowledge_chunks WHERE source_id = 'S_JAMES_FILLER';"
    )
    // Real material under Nkemco's own compartment, so a successful narrow
    // finds something rather than tripping A3's retry.
    db().exec(
      `INSERT INTO knowledge_sources (id, kind, title, compartment, created_at)
         VALUES ('S_NKEMCO_OWN', 'note', 'Renewal notes', 'account:${NKEMCO}', '2026-01-01');
       INSERT INTO knowledge_chunks (id, source_id, compartment, seq, text, created_at)
         VALUES ('C_NKEMCO_OWN', 'S_NKEMCO_OWN', 'account:${NKEMCO}', 0, 'Nkemelu renewal status: approved for another year', '2026-01-01');
       INSERT INTO knowledge_chunks_fts(rowid, text) SELECT rowid, text FROM knowledge_chunks WHERE source_id = 'S_NKEMCO_OWN';`
    )
  })

  it("the full name narrows to the linked company, via the existing multi-token bypass", async () => {
    await rebuildNameIndex({} as never, { databaseId: "db" } as never)
    const answer = await ask(IDS.staffUser, "what is the status of the James Nkemelu renewal?")
    expect(answer.compartments).toEqual([`account:${NKEMCO}`, "agency"])
    expect(answer.reason).toContain("James Nkemelu")
    expect(answer.found).toBe(true)
    expect(titles(answer)).toContain("Renewal notes")
  })

  it("the surname alone narrows too, once it clears the rarity gate", async () => {
    await rebuildNameIndex({} as never, { databaseId: "db" } as never)
    const answer = await ask(IDS.staffUser, "what is the status of the Nkemelu renewal?")
    expect(answer.compartments).toEqual([`account:${NKEMCO}`, "agency"])
    expect(answer.found).toBe(true)
    expect(titles(answer)).toContain("Renewal notes")
  })

  it("the first name is NEVER seeded alone, however ordinary or rare it is", async () => {
    await rebuildNameIndex({} as never, { databaseId: "db" } as never)
    const rows = await d1Query<{ name: string }>(
      {} as never,
      "db",
      "SELECT name FROM knowledge_names WHERE kind = 'contact' AND ref_id = ?",
      [NKEMCO]
    )
    expect(rows.map((r) => r.name.toLowerCase())).not.toContain("james")
    // And a question naming ONLY the first name does not narrow — "james" is
    // exactly ordinary enough that if it HAD been seeded alone, this would
    // hijack every question anybody ever asked containing the word.
    const answer = await ask(IDS.staffUser, "is james back from leave yet?")
    expect(answer.compartments).not.toContain(`account:${NKEMCO}`)
  })

  it("a contact linked to more than one company narrows to NEITHER — never fanned out", async () => {
    const SECOND = "A_NAMES_SECOND_CO"
    db().exec(
      `INSERT INTO accounts (id, account_type, name, code, created_at) VALUES ('${SECOND}', 'entity', 'Secondco', NULL, '2026-01-01');
       INSERT INTO account_links (id, account_id, person_account_id, created_at) VALUES ('L_JN_2', '${SECOND}', '${PERSON_JN}', '2026-01-01');`
    )
    await rebuildNameIndex({} as never, { databaseId: "db" } as never)
    const rows = await d1Query<{ name: string }>(
      {} as never,
      "db",
      "SELECT name FROM knowledge_names WHERE kind = 'contact' AND (ref_id = ? OR ref_id = ?)",
      [NKEMCO, SECOND]
    )
    // Not seeded under EITHER company — the ambiguity is caught before a row
    // is even written, not resolved later at match time.
    expect(rows).toEqual([])
    const answer = await ask(IDS.staffUser, "did James Nkemelu confirm the renewal?")
    expect(answer.compartments).not.toContain(`account:${NKEMCO}`)
    expect(answer.compartments).not.toContain(`account:${SECOND}`)
  })

  it("a contact never bypasses rarity through the COMPANY's own name_narrows_alone", async () => {
    // "Ordinaire" declares its OWN collapsed name safe — that says nothing
    // about a contact filed under it. "Regular" is the surname, deliberately
    // as ordinary as "premium" (c-hijack B's own proven case), with the same
    // shape of filler chunks well over the ceiling.
    const ORDINAIRE = "A_NAMES_ORDINAIRE"
    const PERSON_PR = "A_NAMES_PAT_REGULAR"
    db().exec(
      `INSERT INTO accounts (id, account_type, name, code, created_at, name_narrows_alone) VALUES
         ('${ORDINAIRE}', 'entity', 'Ordinaire', NULL, '2026-01-01', 1),
         ('${PERSON_PR}', 'individual', 'Pat Regular', NULL, '2026-01-01', 0);
       INSERT INTO account_links (id, account_id, person_account_id, created_at)
         VALUES ('L_PR', '${ORDINAIRE}', '${PERSON_PR}', '2026-01-01');`
    )
    const rows: string[] = []
    for (let i = 0; i < 40; i++)
      rows.push(
        `INSERT INTO knowledge_chunks (id, source_id, compartment, seq, text, created_at)
           VALUES ('C_REG_${i}', 'S_JAMES_FILLER', 'agency', ${100 + i}, 'this is a regular occurrence around here', '2026-01-01');`
      )
    db().exec(rows.join("\n"))
    db().exec(
      "INSERT INTO knowledge_chunks_fts(rowid, text) SELECT rowid, text FROM knowledge_chunks WHERE id LIKE 'C_REG_%';"
    )
    await rebuildNameIndex({} as never, { databaseId: "db" } as never)
    const seeded = await d1Query<{ name: string }>(
      {} as never,
      "db",
      "SELECT name FROM knowledge_names WHERE kind = 'contact' AND ref_id = ?",
      [ORDINAIRE]
    )
    // "pat regular" (2 tokens) is seeded via the multi-token bypass; "regular"
    // alone is NOT, because it fails the live rarity check and the company's
    // OWN name_narrows_alone flag must not rescue it — the SEED-TIME half of
    // the guard.
    expect(seeded.map((r) => r.name.toLowerCase())).toContain("pat regular")
    expect(seeded.map((r) => r.name.toLowerCase())).not.toContain("regular")
    const answer = await ask(IDS.staffUser, "was this a regular occurrence?")
    expect(answer.compartments).not.toContain(`account:${ORDINAIRE}`)

    // THE MATCH-TIME HALF, proven directly: a 'contact' row naming "regular"
    // alone, inserted straight into `knowledge_names` (never through the
    // seeder — this is `accountsNamedIn`'s OWN refusal under test, not
    // `contactNameRows`'s, so a future seeder that got the seed-time gate
    // wrong could not silently make this pass). If the `kind === "account"`
    // guard on `name_narrows_alone` were ever dropped, ORDINAIRE's own
    // declared flag would rescue this row and the question below would
    // wrongly narrow.
    db().exec(
      `INSERT INTO knowledge_names (id, kind, ref_id, name, alias_of, compartment, created_at)
         VALUES ('KN_REGULAR_DIRECT', 'contact', '${ORDINAIRE}', 'regular', NULL, 'account:${ORDINAIRE}', '2026-01-01');`
    )
    const direct = await ask(IDS.staffUser, "was this a regular occurrence?")
    expect(direct.compartments).not.toContain(`account:${ORDINAIRE}`)
  })

  it("a QA account-switcher fixture is never seeded, by name", async () => {
    const QA_CO = "A_NAMES_QA_CO"
    const QA_PERSON = "A_NAMES_QA_PERSON"
    db().exec(
      `INSERT INTO accounts (id, account_type, name, code, created_at) VALUES
         ('${QA_CO}', 'entity', 'Qaco', NULL, '2026-01-01'),
         ('${QA_PERSON}', 'individual', 'Alaap Kanchwala (portal test 1)', NULL, '2026-01-01');
       INSERT INTO account_links (id, account_id, person_account_id, created_at)
         VALUES ('L_QA', '${QA_CO}', '${QA_PERSON}', '2026-01-01');`
    )
    await rebuildNameIndex({} as never, { databaseId: "db" } as never)
    const rows = await d1Query<{ name: string }>(
      {} as never,
      "db",
      "SELECT name FROM knowledge_names WHERE kind = 'contact' AND ref_id = ?",
      [QA_CO]
    )
    expect(rows).toEqual([])
  })
})

// c-misspell. The owner asked the live assistant "What is happening with
// Paddlebase?" (his own spelling — the real account is Padelbase) and it
// answered "the question named no client", off a brute search rather than the
// account. Measured on staging (0083's own migration comment has the full
// trail): rebuildNameIndex wrote only the canonical name and code.toLowerCase(),
// so no row for "Paddlebase" or "Asekurans" could ever exist.
//
// THE HUB'S RULING, not mine to relitigate here: a DECLARED alias
// (accounts.alt_names, a JSON array a person writes), never a generated
// variant. Edit-distance and phonetic matching were both considered and
// refused — this file's own §4.2 block two names up is the proof of why:
// "solutions" hijacking every question about VU Solutions is what an
// unrestricted matcher already did once, and HOGO is four letters, which is
// exactly where any distance-1 net starts matching words that are not HOGO.
// So the hijack tests come first, and the FIRST of them proves this
// mechanism adds no fuzzy tolerance at all — a word one edit from a real
// account's own CODE, never declared as an alias, must resolve nothing.
describe("c-misspell: a DECLARED alt_name resolves the owner's own spelling — hijack case first", () => {
  const PADELBASE = "A_PADELBASE"
  const ASSECURANZ = "A_ASSECURANZ"
  const HOGO = "A_HOGO_MISSPELL"

  beforeEach(() => {
    db().exec(
      `INSERT INTO accounts (id, account_type, name, code, alt_names, created_at) VALUES
         ('${PADELBASE}', 'entity', 'Padelbase', NULL, '["paddlebase"]', '2026-01-01'),
         ('${ASSECURANZ}', 'entity', 'Assecuranz', NULL, '["asekurans"]', '2026-01-01'),
         ('${HOGO}', 'entity', 'Hogo Health Systems', 'HOGO', '[]', '2026-01-01');`
    )
  })

  it("HIJACK: a word one edit from a real account's own CODE, never declared, resolves nothing — this mechanism is not fuzzy", async () => {
    await rebuildNameIndex({} as never, { databaseId: "db" } as never)
    // "hoga" is HOGO's own code with the last letter changed — exactly the
    // shape an edit-distance-1 net would catch, and exactly why the hub
    // refused one. Never declared as an alt_name, so it must not resolve.
    const answer = await ask(IDS.staffUser, "what's the latest with hoga?")
    expect(answer.compartments).toEqual([])
    expect(answer.reason).toContain("named no client")
  })

  it("Paddlebase (the owner's own spelling) narrows to the Padelbase account", async () => {
    await rebuildNameIndex({} as never, { databaseId: "db" } as never)
    const answer = await ask(IDS.staffUser, "what is happening with Paddlebase?")
    expect(answer.compartments).toEqual([`account:${PADELBASE}`, "agency"])
    // The REASON names the CANONICAL spelling, not the alias the question
    // used — a person reading "I searched Paddlebase's material" would not
    // recognise their own client; `alias_of` is what makes this say
    // "Padelbase" instead.
    expect(answer.reason).toContain("Padelbase")
  })

  it("Asekurans (the owner's own spelling) narrows to the Assecuranz account", async () => {
    await rebuildNameIndex({} as never, { databaseId: "db" } as never)
    const answer = await ask(IDS.staffUser, "what did we agree with Asekurans?")
    expect(answer.compartments).toEqual([`account:${ASSECURANZ}`, "agency"])
    expect(answer.reason).toContain("Assecuranz")
  })

  it("REGRESSION: one account's declared alias never narrows a DIFFERENT account's question", async () => {
    await rebuildNameIndex({} as never, { databaseId: "db" } as never)
    const answer = await ask(IDS.staffUser, "what did we agree with Asekurans?")
    const compartments = answer.compartments
    expect(compartments).toContain(`account:${ASSECURANZ}`)
    // The failure this guards: a bind-order or dedup bug in rebuildNameIndex
    // that let one account's alias row carry a DIFFERENT account's ref_id.
    expect(compartments, "Padelbase's own compartment must not appear").not.toContain(`account:${PADELBASE}`)
    expect(compartments, "HOGO's own compartment must not appear either").not.toContain(`account:${HOGO}`)
  })
})

// tracker item d-fanout: "Fan-out is visible and capped at 12 — the step line
// shows the count, never more than 12." BUILD-5's own fan-out ceiling
// (NAMED_ACCOUNTS_CAP, lib/knowledge.ts) is exercised here directly — 13 real
// accounts, all matching the same question, must never widen the compartment
// search past 12 of them (+ agency).
describe("fan-out is capped at 12, enforced rather than merely documented (d-fanout)", () => {
  const ACCOUNT_COUNT = 13

  beforeEach(() => {
    const rows = Array.from(
      { length: ACCOUNT_COUNT },
      (_, i) =>
        `INSERT INTO accounts (id, account_type, name, created_at) VALUES ('A_FANOUT_${i}', 'entity', 'Zorbex Company', '2026-01-01');`
    )
    db().exec(rows.join("\n"))
  })

  it("13 real, equally-matching accounts widen to EXACTLY 12 compartments — the cap both binds and is actually reached", async () => {
    await rebuildNameIndex({} as never, { databaseId: "db" } as never)
    const answer = await ask(IDS.staffUser, "what does Zorbex Company want from this rollout?")
    const accountCompartments = answer.compartments.filter((c) => c.startsWith("account:"))
    // NOT `toBeLessThanOrEqual(12)` — that assertion would pass just as well if
    // the true ceiling were silently 5, or 10, or anything under 12, which is
    // exactly what an unenforced-but-documented cap looks like from outside.
    // 13 real, equally-matching accounts exist; the correct answer is EXACTLY
    // twelve, not "at most twelve".
    expect(
      accountCompartments.length,
      `named ${accountCompartments.length} of ${ACCOUNT_COUNT} real, equally-matching accounts — NAMED_ACCOUNTS_CAP (12) did not bind at its own number`
    ).toBe(12)
    expect(answer.compartments).toContain("agency")
  })
})

describe("the personal fence — material that came through one person's own sight of it", () => {
  it("is answerable for its owner and invisible to everyone else", async () => {
    await addSource(IDS.staffUser, {
      title: "My note on the Bergman renewal",
      body: "Bergman renewal: the finance lead wants a discount before signing.",
      visibility: "private",
    })
    const mine = await ask(IDS.staffUser, "what does the finance lead want on the renewal?")
    expect(titles(mine)).toContain("My note on the Bergman renewal")

    // Another STAFF member, with every knowledge right, asking the same thing.
    const theirs = await ask(OTHER_STAFF, "what does the finance lead want on the renewal?")
    expect(theirs.found).toBe(false)
    // …and it is not in their list either — the fence is on every read, not
    // just the search.
    const list = await call(OTHER_STAFF, "GET /api/content/knowledge")
    const { sources } = (await list.json()) as { sources: KnowledgeSource[] }
    expect(sources.map((s) => s.title)).not.toContain("My note on the Bergman renewal")
  })
})

describe("the app fence — material kept to the people on one app (12.3)", () => {
  /** The shared fixture already has an app (`IDS.victimApp`). Staffing is what
   * decides who may open it (8.11), so it is staffing — not a role — that this
   * suite moves: BOTH staff hold every knowledge right throughout, which is the
   * only way a refusal proves the fence rather than the permission sheet. */
  const staffOnApp = (userId: string) =>
    db().exec(
      "INSERT INTO app_staff (id, app_id, user_id, is_lead, created_at, creator_id) VALUES ('as_" +
        userId +
        "', '" +
        IDS.victimApp +
        "', '" +
        userId +
        "', 0, '2026-03-01', '" +
        userId +
        "');"
    )

  it("answers its app's staff and nobody else, in the search AND in the list", async () => {
    staffOnApp(IDS.staffUser)
    await addSource(IDS.staffUser, {
      title: "Dispatch rollout postmortem",
      body: "The dispatch rollout was paused because the invoice run kept timing out.",
      visibleToAppId: IDS.victimApp,
    })

    const mine = await ask(IDS.staffUser, "why was the dispatch rollout paused?")
    expect(titles(mine)).toContain("Dispatch rollout postmortem")

    // A COLLEAGUE with every knowledge right, who is simply not on this app.
    const theirs = await ask(OTHER_STAFF, "why was the dispatch rollout paused?")
    expect(theirs.found).toBe(false)
    const list = await call(OTHER_STAFF, "GET /api/content/knowledge")
    const { sources, total } = (await list.json()) as { sources: KnowledgeSource[]; total: number }
    expect(sources.map((s) => s.title)).not.toContain("Dispatch rollout postmortem")
    // R16: the badge counts the same question the rows answered. A count that
    // included a row the list withheld would advertise the existence of the very
    // thing the fence exists to hide.
    expect(total).toBe(sources.length)
  })

  /** THE SENTENCE ABOUT THE CONTENT IS PART OF THE ANSWER (R23), so the fence
   * has to reach it too. Found by an adversarial review, 11 Sep 2026:
   * `sourceTitles` fenced with the owner half alone while every other read used
   * both, so an app-restricted source's TITLE and EXISTENCE reached a colleague
   * outside that app through `reason` and `records` — with `found` correctly
   * false and no passage leaking. The test above asserts `.found` and the list
   * and would have stayed green through all of it, which is why this one asserts
   * the two fields it never looked at. */
  it("does not name an app's material to a colleague outside it, not even in the reason", async () => {
    staffOnApp(IDS.staffUser)
    await addSource(IDS.staffUser, {
      title: "Dispatch rollout postmortem — internal only",
      body: "The dispatch rollout was paused because the invoice run kept timing out.",
      visibleToAppId: IDS.victimApp,
    })

    const theirs = await ask(OTHER_STAFF, "why was the dispatch rollout paused?")
    expect(theirs.found).toBe(false)
    // The title must appear in NEITHER field a person can read.
    expect(theirs.reason ?? "").not.toContain("Dispatch rollout postmortem")
    expect(JSON.stringify(theirs.records ?? [])).not.toContain("Dispatch rollout postmortem")

    // And the same question from the app's OWN staff still names it — otherwise
    // this passes by breaking the feature rather than by fencing it.
    const mine = await ask(IDS.staffUser, "why was the dispatch rollout paused?")
    expect(JSON.stringify(mine.records ?? [])).toContain("Dispatch rollout postmortem")
  })

  it("lets them in the moment they are put on the app, with no re-index", async () => {
    staffOnApp(IDS.staffUser)
    await addSource(IDS.staffUser, {
      title: "Dispatch rollout postmortem",
      body: "The dispatch rollout was paused because the invoice run kept timing out.",
      visibleToAppId: IDS.victimApp,
    })
    expect((await ask(OTHER_STAFF, "why was the dispatch rollout paused?")).found).toBe(false)

    // The fence is a JOIN to `app_staff`, read at question time — so staffing
    // somebody is the whole of granting them sight of it. Nothing is rewritten,
    // nothing is re-embedded, and there is no window in which the two disagree.
    staffOnApp(OTHER_STAFF)
    expect(titles(await ask(OTHER_STAFF, "why was the dispatch rollout paused?"))).toContain(
      "Dispatch rollout postmortem"
    )
  })

  it("refuses an app the author is not on, rather than filing something they'd be locked out of", async () => {
    const res = await call(IDS.staffUser, "POST /api/content/knowledge", {
      title: "A note about somebody else's system",
      body: "…",
      visibleToAppId: IDS.victimApp,
    })
    expect(res.status).toBe(400)
    expect(((await res.json()) as { message: string }).message).toMatch(/only limit a source to an app you are on/i)
    expect((db().prepare("SELECT COUNT(*) n FROM knowledge_sources").get() as { n: number }).n).toBe(0)
  })

  it("private beats app — a source that says both is answerable to one person", async () => {
    staffOnApp(IDS.staffUser)
    staffOnApp(OTHER_STAFF)
    await addSource(IDS.staffUser, {
      title: "My own read on the rollout",
      body: "The dispatch rollout was paused because the invoice run kept timing out.",
      visibility: "private",
      visibleToAppId: IDS.victimApp,
    })
    // Both are on the app; only the owner is answered from it. The row stores
    // one answer, so no reader has to work out which of two settings wins.
    expect(titles(await ask(IDS.staffUser, "why was the dispatch rollout paused?"))).toContain(
      "My own read on the rollout"
    )
    expect((await ask(OTHER_STAFF, "why was the dispatch rollout paused?")).found).toBe(false)
    const row = db()
      .prepare("SELECT owner_user_id AS o, visible_to_app_id AS a FROM knowledge_sources")
      .get() as { o: string | null; a: string | null }
    expect({ owner: row.o, app: row.a }).toEqual({ owner: IDS.staffUser, app: null })
  })

  /** THE THIRD BRANCH OF `appClause`, never exercised by any test above it. Every
   * role this file grants — `IDS.adminRole`, `IDS.clientRole`, and the shared
   * fixture's own roles — is inserted by `spine-harness.ts`'s `grantAll` with
   * `is_default = 0`, so `OTHER_STAFF` failing to see an app-restricted source
   * has never once touched the `OR EXISTS (... is_default = 1 ...)` clause; it
   * fails on `app_staff` alone. Found by adversarial review, 11 Sep 2026: with
   * the clause deleted, every test in this file — 65 of them — stayed green. */
  describe("the admin/default-role bypass, appClause's third branch", () => {
    /** `is_default = 1` is the mark production's locked Admin role carries
     * (`workers/tenancy/src/team-schema/seed.ts`); a fresh role here rather
     * than reusing `IDS.adminRole`, since that fixture role is deliberately
     * NOT the default one this branch is about. */
    const DEFAULT_ROLE_USER = "U_DEFAULT_ROLE"

    beforeEach(() => {
      db().exec(`
        INSERT INTO users (id, email, first_name, current_team_id)
          VALUES ('${DEFAULT_ROLE_USER}', 'default-role@kwapso.app', 'Dana', '${IDS.team}');
        INSERT INTO member_roles (id, title, is_default, created_at)
          VALUES ('R_DEFAULT_TEST', 'Owner', 1, '2026-01-01');
        INSERT INTO role_permissions (id, role_id, module, can_read, can_create, can_edit, can_delete)
          VALUES ('RP_DEFAULT_TEST_knowledge', 'R_DEFAULT_TEST', 'knowledge', 1, 1, 1, 1);
        INSERT INTO team_members (id, team_id, user_id, role_id, created_at)
          VALUES ('m_default_role', '${IDS.team}', '${DEFAULT_ROLE_USER}', 'R_DEFAULT_TEST', '2026-01-01');
      `)
    })

    it("admits a caller whose role is the account's default role, even off the app's staff list", async () => {
      staffOnApp(IDS.staffUser)
      await addSource(IDS.staffUser, {
        title: "Dispatch rollout postmortem — default-role bypass",
        body: "The dispatch rollout was paused because the invoice run kept timing out.",
        visibleToAppId: IDS.victimApp,
      })

      // DEFAULT_ROLE_USER is never staffed on the app — the bypass, not
      // app_staff, is what has to let them through.
      const answer = await ask(DEFAULT_ROLE_USER, "why was the dispatch rollout paused?")
      expect(titles(answer)).toContain("Dispatch rollout postmortem — default-role bypass")
    })

    it("still refuses a colleague who holds every knowledge right but neither the default role nor a staffing row", async () => {
      staffOnApp(IDS.staffUser)
      await addSource(IDS.staffUser, {
        title: "Dispatch rollout postmortem — ordinary colleague still refused",
        body: "The dispatch rollout was paused because the invoice run kept timing out.",
        visibleToAppId: IDS.victimApp,
      })

      // OTHER_STAFF holds IDS.adminRole, which grantAll marks is_default = 0 —
      // the ordinary case the bypass must not swallow.
      const answer = await ask(OTHER_STAFF, "why was the dispatch rollout paused?")
      expect(answer.found).toBe(false)
    })
  })
})

describe("taking a source away really takes it away", () => {
  it("stops answering from it, keeps the row, and does not resurrect it", async () => {
    const id = await addSource(IDS.staffUser, {
      title: "Old pricing, withdrawn",
      body: "The dispatch module costs 400 a month.",
    })
    expect(titles(await ask(IDS.staffUser, "what does the dispatch module cost?"))).toContain(
      "Old pricing, withdrawn"
    )

    const res = await call(IDS.staffUser, "POST /api/content/knowledge/active", { id, active: false })
    expect(res.status).toBe(200)
    // The searchable pieces are gone in the same instant — "remove something
    // wrong" is a promise the SEARCH has to keep, not just the list.
    const chunks = db().prepare("SELECT COUNT(*) n FROM knowledge_chunks WHERE source_id = ?").get(id) as {
      n: number
    }
    expect(chunks.n).toBe(0)
    expect((await ask(IDS.staffUser, "what does the dispatch module cost?")).found).toBe(false)
    // The ROW survives, with who took it away and when (deactivate, never delete).
    const row = db()
      .prepare("SELECT deactivated_at, deactivator_name FROM knowledge_sources WHERE id = ?")
      .get(id) as { deactivated_at: string | null; deactivator_name: string | null }
    expect(row.deactivated_at).not.toBeNull()
    expect(row.deactivator_name).toBe("Staff")

    // R17: doing it twice moves zero rows — no second history line, no second ping.
    published = []
    const again = await call(IDS.staffUser, "POST /api/content/knowledge/active", { id, active: false })
    expect(again.status).toBe(200)
    expect(published).toEqual([])
    const history = db()
      .prepare("SELECT COUNT(*) n FROM activity WHERE related_row_id = ? AND type = 'Knowledge source removed'")
      .get(id) as { n: number }
    expect(history.n).toBe(1)

    // …and giving it back re-indexes it, so the decision is reversible.
    await call(IDS.staffUser, "POST /api/content/knowledge/active", { id, active: true })
    expect(titles(await ask(IDS.staffUser, "what does the dispatch module cost?"))).toContain(
      "Old pricing, withdrawn"
    )
  })
})

describe("the sweep — the app's own rows become material, and stay in step", () => {
  it("mirrors a ticket, its conversation and the account it belongs to", async () => {
    db().exec(
      `INSERT INTO help_threads (id, help_id, message_body, created_at, creator_name)
       VALUES ('R1', '${IDS.victimTicket}', 'We traced it to the March invoice batch job.', '2026-02-06', 'Staff');`
    )
    const res = await call(IDS.staffUser, "POST /api/content/knowledge/sync", {})
    expect(res.status).toBe(200)
    const { caughtUp } = (await res.json()) as { caughtUp: boolean }
    expect(caughtUp).toBe(true)

    const source = db()
      .prepare("SELECT id, compartment, body FROM knowledge_sources WHERE origin_table = 'help' AND origin_row_id = ?")
      .get(IDS.victimTicket) as { id: string; compartment: string; body: string }
    expect(source).toBeTruthy()
    // Filed under the client the ticket was raised for — the compartment is
    // derived from the row, never typed.
    expect(source.compartment).toBe(`account:${IDS.victimAccount}`)
    // The conversation rides with the ticket: it is most of what makes a ticket
    // worth reading later.
    expect(source.body).toContain("March invoice batch job")

    const answer = await ask(IDS.staffUser, "what caused the March invoice problem at Bergman?")
    expect(answer.found).toBe(true)
    expect(answer.citations.some((c) => c.kind === "ticket")).toBe(true)
  })

  it("skips a row whose text has not changed — the sweep pays for itself", async () => {
    await call(IDS.staffUser, "POST /api/content/knowledge/sync", {})
    expect(embedded.length, "the first pass must really embed, or this proves nothing").toBeGreaterThan(0)

    // FORGET THE CURSOR, so the same rows are read a SECOND time. Without this
    // the next sweep sees nothing at all and passes on the cursor alone — which
    // is what the first version of this test was quietly measuring, and it
    // stayed green with the hash check deleted.
    db().exec("DELETE FROM knowledge_ingest;")
    embedded = []
    const res = await call(IDS.staffUser, "POST /api/content/knowledge/sync", {})
    const { results } = (await res.json()) as { results: { kind: string; read: number; indexed: number }[] }
    const ticket = results.find((r) => r.kind === "ticket")
    expect(ticket?.read, "the rows must really have been read again").toBeGreaterThan(0)
    // Read again, and NOT ONE of them re-chunked or re-embedded. That difference
    // is what makes a 15-minute sweep over thousands of rows affordable.
    expect(results.every((r) => r.indexed === 0)).toBe(true)
    expect(embedded).toEqual([])
  })

  it("does not put back a source somebody deliberately took away", async () => {
    await call(IDS.staffUser, "POST /api/content/knowledge/sync", {})
    const source = db()
      .prepare("SELECT id FROM knowledge_sources WHERE origin_table = 'help' AND origin_row_id = ?")
      .get(IDS.victimTicket) as { id: string }
    await call(IDS.staffUser, "POST /api/content/knowledge/active", { id: source.id, active: false })

    // The ticket changes — so the sweep will see it again and update the row.
    db().exec(`UPDATE help SET description = 'Bergman S.A. cannot see the April invoice run', updated_at = '2026-03-01' WHERE id = '${IDS.victimTicket}';`)
    // Its cursor has already passed this ticket, so re-run from the start the way
    // a fresh environment would: the point is that being SEEN again is not the
    // same as being re-indexed.
    db().exec("DELETE FROM knowledge_ingest;")
    await call(IDS.staffUser, "POST /api/content/knowledge/sync", {})

    const after = db()
      .prepare("SELECT deactivated_at, chunk_count FROM knowledge_sources WHERE id = ?")
      .get(source.id) as { deactivated_at: string | null; chunk_count: number }
    expect(after.deactivated_at, "the sweep must not clear somebody's decision").not.toBeNull()
    expect(after.chunk_count, "an excluded source must stay unsearchable").toBe(0)
  })

  it("records what happened, so 'it has been failing since Tuesday' is readable", async () => {
    await call(IDS.staffUser, "POST /api/content/knowledge/sync", {})
    const res = await call(IDS.staffUser, "GET /api/content/knowledge/sync")
    const { ingest } = (await res.json()) as {
      ingest: { kind: string; lastOkAt: string | null; lastError: string | null; sourcesIndexed: number }[]
    }
    // EVERY KIND THE SWEEP OWNS REPORTED, derived from the sweep's own table
    // rather than copied out of it. The list was hand-written and went stale the
    // first time a kind was added — which is the failure this whole module is
    // built against: a green test asserting last month's coverage. What this
    // suite is FOR is the reporting (R12), so the shape it asserts is "every kind
    // there is, each with a clean run", not which kinds happen to exist today.
    // Which kinds SHOULD exist, and what each one says, is knowledge-coverage.test.ts.
    expect(ingest.map((i) => i.kind).sort()).toEqual(INGEST_KINDS.map((k) => k.stateKey ?? k.kind).sort())
    expect(ingest.length, "the sweep reported nothing — this assertion would be vacuous").toBeGreaterThan(5)
    for (const row of ingest) {
      expect(row.lastOkAt).not.toBeNull()
      expect(row.lastError).toBeNull()
    }
    expect(ingest.reduce((n, i) => n + i.sourcesIndexed, 0)).toBeGreaterThan(0)
  })
})

describe("the model having a bad minute costs the material, not the base", () => {
  it("keeps the source, indexes it lexically, and retries on the next sweep", async () => {
    const res = await call(
      IDS.staffUser,
      "POST /api/content/knowledge",
      { title: "Written while the model was down", body: "The dispatch rollout is paused until March." },
      "",
      { brokenModel: true }
    )
    expect(res.status, "an embedding failure must never lose what somebody wrote").toBe(200)
    const { source } = (await res.json()) as { source: KnowledgeSource }

    const row = db()
      .prepare("SELECT content_hash, chunk_count FROM knowledge_sources WHERE id = ?")
      .get(source.id) as { content_hash: string | null; chunk_count: number }
    expect(row.chunk_count).toBeGreaterThan(0)
    // The hash is the "don't do this again" flag, so it is NOT stamped when the
    // vectors never arrived — that is what makes the next sweep pick it up
    // instead of skipping it as unchanged forever.
    expect(row.content_hash).toBeNull()

    // …and it is still findable in the meantime, by its words alone.
    const answer = await ask(IDS.staffUser, "is the dispatch rollout paused?")
    expect(answer.found).toBe(true)
    expect(titles(answer)).toContain("Written while the model was down")
  })
})

// ── THE EXACT TERM, AND THE FLOOR IT IS ALLOWED PAST ────────────────────────
//
// `termFloor` is a PROPORTION of the question's length, and that arithmetic runs
// backwards on the one thing the word match exists for. Measured on staging: a
// question about ticket 3144 returned zero candidates, because the chunk that
// says "3144 is pending gravity forms confirmation" holds the one token that
// matters and three others, against a floor of eight. Phrasing the question more
// fully made the reference HARDER to find, which is the opposite of what a person
// doing it expects.
//
// So an exact token waives the proportion — and only a RARE one does, because a
// year is a digit-bearing token too and there are hundreds of chunks with one in
// them. Both halves are here: without the second, the sole-evidence path (where
// the word match decides `found` on its own) would answer every question that
// happens to contain a number.
describe("an exact reference is found however long the question around it is", () => {
  beforeEach(async () => {
    await addSource(IDS.staffUser, {
      title: "Ticket 3144 handover note",
      body: "3144 is pending gravity forms confirmation.",
    })
    await addSource(IDS.staffUser, {
      title: "Dispatch rota",
      body: "The dispatch rota is published every Thursday and the weekend cover is agreed at the Wednesday stand-up before it goes out.",
    })
  })

  const LONG_QUESTION =
    "Could somebody remind me where things currently stand with ticket 3144, and whether anybody has replied about it since last week?"

  it("returns the chunk holding the reference, though it holds almost nothing else", async () => {
    const answer = await ask(IDS.staffUser, LONG_QUESTION, undefined, NOTHING_CLOSE_ENOUGH)
    expect(answer.found, `refused with ${answer.candidates} candidates`).toBe(true)
    expect(titles(answer)).toContain("Ticket 3144 handover note")
  })

  // The proportional floor is not softened for anything else. Same length, same
  // sole-evidence path, no exact token — and the two words it shares with the
  // rota note are a coincidence, which is what the floor is for.
  it("and a question with no exact term in it is held to the proportion exactly as before", async () => {
    const answer = await ask(
      IDS.staffUser,
      "Could somebody remind me where things currently stand with the parental leave policy, and whether anybody has replied about it since last week?",
      undefined,
      NOTHING_CLOSE_ENOUGH
    )
    expect(answer.found, `answered out of ${titles(answer).join(", ")}`).toBe(false)
  })

  // RARITY IS THE WHOLE OF WHAT MAKES A TOKEN "EXACT", and the threshold has to
  // be crossed for real rather than described. A year is a digit-bearing token
  // too, and if one could waive the floor the sole-evidence path would answer any
  // question that happened to contain a number.
  //
  // The cap is read from the source rather than repeated here, because the number
  // MOVED once already and moved for a good reason: it was first guessed at 20,
  // which silently switched the bypass off for ticket 3144 (56 chunks) — the very
  // reference it was built for — and shipped green while that case still failed.
  // A test carrying its own copy of the number would have kept passing.
  it("a token that is everywhere is not an exact term, whatever the digit says", async () => {
    const cap = Number(
      /const EXACT_TERM_MAX_CHUNKS = (\d+)/.exec(
        readFileSync(join(__dirname, "..", "src", "lib", "knowledge.ts"), "utf8")
      )?.[1]
    )
    expect(cap, "the rarity cap has gone — this test is measuring nothing").toBeGreaterThan(0)
    // One long note, cut into more pieces than the cap allows, every piece saying
    // 2026. Cheaper than the same number of separate sources and the same fact:
    // this token is not rare.
    const paragraph = (i: number) =>
      `Planning note ${i} for the 2026 delivery year. ` + `Workstream ${i} detail. `.repeat(60)
    await addSource(IDS.staffUser, {
      title: "Budget planning notes",
      body: Array.from({ length: cap + 20 }, (_, i) => paragraph(i)).join("\n\n"),
    })
    const answer = await ask(
      IDS.staffUser,
      "Could somebody remind me what the agreed parental leave arrangement is for 2026, and who signed it off?",
      undefined,
      NOTHING_CLOSE_ENOUGH
    )
    expect(answer.found, `answered out of ${titles(answer).join(", ")}`).toBe(false)
  })

  // `c-exact`'s OWN CLAIM, restated at the boundary the fix touches: a real
  // reference ("3144") still waives the floor alone, with no other question
  // term anywhere in the chunk — "task" never appears in "Handover note"'s
  // body. Written first, before the regression test below, because a fix for
  // the calendar-fragment failure that also cost this its bypass would be a
  // trade nobody agreed to, not a fix.
  it("a genuine reference still waives the floor alone, exactly as before", async () => {
    const answer = await ask(IDS.staffUser, LONG_QUESTION, undefined, NOTHING_CLOSE_ENOUGH)
    expect(answer.found).toBe(true)
    expect(titles(answer)).toContain("Ticket 3144 handover note")
  })

  // THE FAILURE ITSELF (kb_review, 11 Sep 2026): "What did Alaap discuss at
  // dinner on the 14th?" answered on staging out of a FluClinic sprint note
  // that happens to say "by the 14th and 16th of September" — nothing else in
  // that chunk is about a dinner, and it only mentions Alaap because every
  // line of a Gemini transcript is prefixed with its speaker's name. A
  // co-occurrence rule ("the bypass needs one other question term in the same
  // chunk") was proposed and rejected for exactly this reason: "alaap" would
  // have satisfied it in every candidate chunk, fixing nothing. This fixture
  // reproduces the same shape — a person's name prefixing an unrelated
  // sentence that happens to name a day of the month — deliberately smaller
  // than staging's real transcript, to isolate the one mechanism.
  it("a bare ordinal day does not waive the floor, even naming a real colleague", async () => {
    await addSource(IDS.staffUser, {
      title: "FluClinic sprint note",
      body: "Alaap Kanchwala: I just want to give you a little bit of insight — by the 14th and 16th of September, one more project milestone is due.",
    })
    const answer = await ask(
      IDS.staffUser,
      "What did Alaap discuss at dinner on the 14th?",
      undefined,
      NOTHING_CLOSE_ENOUGH
    )
    expect(answer.found, `answered out of ${titles(answer).join(", ")}`).toBe(false)
  })
})

// ── AN EMPTY VECTOR ARM IS TWO OPPOSITE SENTENCES ───────────────────────────
//
// `!vector.length` used to be one condition covering four situations it treated
// as identical. Three of them are IGNORANCE — no store bound, the question could
// not be embedded, the index holds no neighbours at all — and there the word
// match really is everything we have. The fourth is an ANSWER: a semantic search
// ran over the whole compartment and reported that nothing in it is about this.
//
// MEASURED 27 Aug 2026 on the agency's own material. "What is our parental leave
// policy and how much notice does it need?" — a policy nobody has ever written
// down — put the vector arm's best neighbour at 0.451 against a floor of 0.5, so
// it correctly found nothing. The word match then cleared a PROPORTIONAL floor on
// "policy", "notice" and "leave" and answered out of a page of meeting notes. To
// overturn a search that has already answered, a chunk must now hold the WHOLE
// question — with the one exception the word match exists for, a rare exact
// token, which bypasses every floor here.
// ── AND WHAT A CHUNK HOLDING THE REFERENCE IS WORTH ─────────────────────────
//
// The word arm runs beside the vector arm at a tenth of a vote, which was
// measured and is right for an ordinary question. A question carrying a rare
// exact token is not one, and at a tenth it loses by construction: "task 3144"
// answers perfectly because the whole question embeds to "3144", while the same
// reference inside a natural sentence is drowned by the polite framing and the
// word arm's correct answer is outvoted ten to one.
describe("a chunk holding the reference is not worth a tenth of a vote", () => {
  beforeEach(async () => {
    // The reference lives in ONE short note. Six longer notes are about the
    // client and the sprint the question is phrased around, so the vector arm has
    // plenty to prefer — which is the situation on staging exactly.
    await addSource(IDS.staffUser, {
      title: "Handover note",
      body: "3144 is pending gravity forms confirmation.",
    })
    for (let i = 0; i < 6; i++)
      await addSource(IDS.staffUser, {
        title: `Bergman sprint sync ${i}`,
        body:
          "Could somebody remind the team where things currently stand this week. " +
          "We walked the sprint, agreed what anybody still owes, and Ana replied about the rest.",
      })
  })

  it("finds the reference inside a sentence a person would actually say", async () => {
    const answer = await ask(
      IDS.staffUser,
      "Could somebody remind me where things currently stand with task 3144, and whether anybody has replied about it since last week?"
    )
    expect(answer.found).toBe(true)
    expect(titles(answer), "the note holding the reference must be cited").toContain("Handover note")
  })

  it("and the bare reference still works, which is the case that never broke", async () => {
    const answer = await ask(IDS.staffUser, "task 3144")
    expect(titles(answer)).toContain("Handover note")
  })

  // A REFERENCE THAT IS DISCUSSED A LOT IS STILL A REFERENCE, and this is the
  // regression that shipped green: the rarity cap was guessed at 20 chunks, and
  // ticket 3144 is in 56 of them on staging — the meetings about it, their Gemini
  // notes, the calendar invitations — so the bypass was silently off for the very
  // case it was built for, and every test passed.
  it("a reference discussed across a whole record is still rare enough to speak", async () => {
    const paragraph = (i: number) =>
      `Task 3144 update ${i}. ` + `The team walked through the remaining checks. `.repeat(60)
    await addSource(IDS.staffUser, {
      title: "Task 3144 log",
      body: Array.from({ length: 30 }, (_, i) => paragraph(i)).join("\n\n"),
    })
    const answer = await ask(
      IDS.staffUser,
      "Could somebody remind me where things currently stand with task 3144, and whether anybody has replied about it since last week?"
    )
    expect(answer.found).toBe(true)
    expect(
      titles(answer).some((t) => t.includes("3144")),
      `nothing about 3144 was cited — got ${titles(answer).join(", ")}`
    ).toBe(true)
  })

  // AND IT MUST LEAD THE WORD ARM'S OWN LIST, not merely be on it. That list is
  // capped at LEXICAL_TOP_K, and it used to be ordered by the SUM of term
  // weights — so a dozen chunks echoing the question's ordinary words ("could",
  // "somebody", "currently", "week") fill the ten slots and push the one chunk
  // holding the reference off the end, where no fusion weight can reach it.
  it("and it is not pushed off the word arm's list by chatter that echoes the question", async () => {
    for (let i = 6; i < 18; i++)
      await addSource(IDS.staffUser, {
        title: `Bergman weekly note ${i}`,
        body:
          "Could somebody remind the team where things currently stand this week. " +
          "We walked the sprint, agreed what anybody still owes, and Ana replied about the rest.",
      })
    const answer = await ask(
      IDS.staffUser,
      "Could somebody remind me where things currently stand with task 3144, and whether anybody has replied about it since last week?"
    )
    expect(titles(answer), "eighteen chatty near-misses must not bury one reference").toContain(
      "Handover note"
    )
  })
})

describe("overruling a search that already answered takes the whole question", () => {
  beforeEach(async () => {
    await addSource(IDS.staffUser, {
      title: "Notes from the delivery catch-up",
      body: "We agreed a notice period on the dispatch policy, and Aurora will leave the rollout dates as they are until the client replies.",
    })
    await addSource(IDS.staffUser, {
      title: "Bergman dispatch rollout",
      body: "The dispatch rollout is paused until March while the client finishes their own migration.",
    })
  })

  it("refuses a question whose words are merely scattered through what we hold", async () => {
    // "notice", "policy" and "leave" are all in the catch-up note and the
    // question is not about it. A proportion is three words wide.
    const answer = await ask(
      IDS.staffUser,
      "What is our parental leave policy and how much notice does it need?",
      undefined,
      NOTHING_CLOSE_ENOUGH
    )
    expect(answer.found, `answered out of ${titles(answer).join(", ")}`).toBe(false)
  })

  it("but answers when a chunk really does hold the whole question", async () => {
    const answer = await ask(IDS.staffUser, "is the dispatch rollout paused?", undefined, NOTHING_CLOSE_ENOUGH)
    expect(answer.found).toBe(true)
    expect(titles(answer)).toContain("Bergman dispatch rollout")
  })

  // AND THE EXACT TERM STILL GETS THROUGH THE STRICTEST OF THE THREE. This is
  // the case the word match exists for: an embedding is indifferent to "3144"
  // and the inverted index is not, so a reference may still overturn a refusal
  // even though nothing else may.
  it("and a rare exact reference still speaks, though nothing else may", async () => {
    await addSource(IDS.staffUser, {
      title: "Handover note",
      body: "3144 is pending gravity forms confirmation.",
    })
    const answer = await ask(
      IDS.staffUser,
      "Could somebody tell me where things stand with ticket 3144 and whether anyone replied?",
      undefined,
      NOTHING_CLOSE_ENOUGH
    )
    expect(answer.found, `refused with ${answer.candidates} candidates`).toBe(true)
    expect(titles(answer)).toContain("Handover note")
  })

  // NOBODY LOOKED IS NOT THE SAME SENTENCE, and this is the whole distinction in
  // one pair: ONE question, one base, two reasons the vector arm is empty, two
  // different answers. With no store bound the word match is the only reader the
  // material has and a share is enough — which is what keeps a note written while
  // the model was down findable by its words alone. With the store bound and the
  // search having positively found nothing, the same share is a coincidence and
  // the same question is refused.
  const SCATTERED = "what is currently happening with the Bergman dispatch rollout?"

  it("when nothing looked at all, a share of the question is enough", async () => {
    const answer = await ask(IDS.staffUser, SCATTERED, undefined, { noVectorStore: true })
    expect(answer.found, "an outage must not make the base mute").toBe(true)
    expect(titles(answer)).toContain("Bergman dispatch rollout")
  })

  it("and the SAME question is refused when the search looked and found nothing", async () => {
    const answer = await ask(IDS.staffUser, SCATTERED, undefined, NOTHING_CLOSE_ENOUGH)
    expect(answer.found, `answered out of ${titles(answer).join(", ")}`).toBe(false)
  })
})

// ── THE POOL IS A BUDGET FOR ATTRITION ──────────────────────────────────────
//
// Three things thin the candidate list between the index and the answer, and two
// are permanent by design: the personal fence hides a colleague's own material,
// an excluded source stays excluded, and a re-index leaves behind the ids it
// replaced. R26 makes a stale id SAFE to meet — it reads back as no row, never as
// somebody else's paragraph — but safe is not free: it is still a nearest
// neighbour and still takes a slot.
//
// MEASURED on staging: "what did we agree in the week recap?" returns 100
// neighbours over the floor and fifteen of them exist, the first at rank 17. A
// pool of 24 spent sixteen slots on rows that cannot come back, and the base
// answered "we have nothing on that" about a meeting it holds two 96-chunk
// transcripts of.
//
// WHAT THIS TEST PROVES, AND WHAT IT DOES NOT. It locks the PROPERTY — a wall of
// a colleague's private material must neither leak nor starve the answer — and it
// passes with the pool at 24 as well as at 100, because a second mechanism also
// covers this case: when nothing at all survives the read, the last-resort record
// fallback opens the router's own best records by source id. That is defence in
// depth and worth having. It also means this test is not the evidence for the
// pool size; the evidence for that is the staging measurement in RANKING_POOL's
// own comment, and the bench going 18/20 to 20/20 on the strength of it.
describe("material a colleague cannot see must not starve the answer", () => {
  const QUESTION = "is the dispatch rollout cutover paused?"

  it("reaches the team's own material past a wall of somebody else's", async () => {
    // MORE OF THEM THAN THE OLD POOL HELD, which is the whole point: with a pool
    // of 24 these fill it entirely and the team's own note is cut before anyone
    // finds out it was readable. Each one echoes the question word for word, so
    // it outranks the team's note on both arms — and every one is invisible to
    // the person asking.
    for (let i = 0; i < 30; i++)
      await addSource(OTHER_STAFF, {
        title: `Aurora's private dispatch note ${i}`,
        body: `dispatch rollout cutover paused. ${QUESTION} dispatch rollout cutover paused.`,
        visibility: "private",
      })
    // The answer, in a colleague's words rather than the question's — which is
    // what real material looks like, and why it ranks below the echoes.
    await addSource(IDS.staffUser, {
      title: "Bergman dispatch rollout",
      body: "The dispatch rollout is on hold until March while Bergman finish their own migration.",
    })
    const answer = await ask(IDS.staffUser, QUESTION)
    expect(answer.found, "the team's own note is right there").toBe(true)
    expect(titles(answer)).toContain("Bergman dispatch rollout")
    expect(
      titles(answer).some((t) => t.includes("private")),
      "and none of the colleague's private material leaked"
    ).toBe(false)
  })
})

// ── A SLOT SPENT ON A PASSAGE THAT SAYS NOTHING ─────────────────────────────
//
// Some sources are envelopes. A calendar invitation's body is its own subject
// line again with a time on it; a bare meeting that has already happened — kept
// on purpose, because it is the record that it happened — says "X is a meeting of
// ours, on 2026-08-19." and stops. Both are perfectly RELEVANT, which is exactly
// why they win slots: they are near-perfect matches for a question naming the
// thing they are about.
//
// AND A SCORE CLIFF DOES NOT REACH THEM, which is why this is not a relevance
// rule. Measured on the agency's own material: these score at the TOP, so
// dropping what is far below the best hit cuts nothing. Asked about task 3144 the
// base answered "Task 3144 is currently scheduled, and it was a meeting on August
// 25" — out of the invitation — while the conversation about the task sat lower.
describe("an envelope does not take a slot from something that says more", () => {
  beforeEach(async () => {
    await addSource(IDS.staffUser, {
      title: "Invitation: Bergman dispatch review @ Tue Aug 25, 2026 12:30pm",
      body: "Bergman dispatch review\nTue Aug 25, 2026 12:30pm",
    })
    await addSource(IDS.staffUser, {
      title: "Bergman dispatch review",
      body: "Bergman dispatch review is a meeting of ours, on 2026-08-25.",
    })
    await addSource(IDS.staffUser, {
      title: "Bergman dispatch review notes",
      body:
        "Bergman dispatch review is a meeting of ours, on 2026-08-25. What was said in the meeting: " +
        "Marta agreed the cutover moves to the first Monday of April, and Ana will send the supplier " +
        "list before the invoice run so the desk can check it against the board.",
    })
  })

  it("the passage carrying the answer is cited, and the two envelopes beside it are not", async () => {
    const answer = await ask(IDS.staffUser, "what was said at the Bergman dispatch review?")
    const cited = titles(answer)
    expect(cited, `cited ${cited.join(", ")}`).toContain("Bergman dispatch review notes")
    // The two that say nothing share the subject and the words and would score at
    // the top. Neither may spend a slot while the notes are available.
    expect(cited).not.toContain("Bergman dispatch review")
    expect(cited.some((t) => t.startsWith("Invitation:"))).toBe(false)
  })

  // NEVER PAID FOR — the same bargain the title cap makes. When a bare diary entry
  // is genuinely all there is, it is still the answer. That half is proved at the
  // seam rather than here, and the note on `diversify` says why: this harness
  // cannot build a base in which an envelope IS all there is, because both the
  // POST and the ask re-run the sweep. The test that used to sit here emptied the
  // three tables, posted one bare record, and asked — and was answered out of
  // thirteen sources with the envelope in the sixth slot, which the backfill would
  // have handed it whether or not it was all there was. See "an answer is never
  // padded" below.
})

// ── A LINK TO A VIDEO IS NOT A SOURCE — IT IS A LINK TO ONE ────────────────
//
// Every unreadable thing that ever reached this knowledge base failed the same
// way: accepted, stored, quietly never read, and the person never told. 131
// files of logo artwork got in that way; every PDF scored 0.000 on letter-shaped
// tokens that way; `image/*` has been opaque since the beginning that way.
//
// The owner ruled on 27 Aug 2026 that a video link is REFUSED instead, and that
// the refusal carries the fix: paste the transcript and the source is welcome.
// The form says so while somebody is typing; this is the door, which is what
// holds when the request comes from the assistant, from MCP, or from a screen
// that has drifted.
describe("a video link is refused unless its transcript comes with it", () => {
  const video = (body?: string) =>
    call(IDS.staffUser, "POST /api/content/knowledge", {
      title: "Bergman cutover walkthrough",
      sourceUrl: "https://www.youtube.com/watch?v=abc123",
      ...(body ? { body } : {}),
    })

  it("refuses it, and says what would fix it", async () => {
    const res = await video()
    expect(res.status).toBe(400)
    const out = (await res.json()) as { error: string; message: string }
    expect(out.error).toBe("video_needs_transcript")
    expect(out.message, "the refusal must carry the remedy, not just the no").toMatch(/transcript/i)
  })

  it("and stores NOTHING — a refused source is not a row that answers nothing", async () => {
    await video()
    const rows = db()
      .prepare("SELECT count(*) AS n FROM knowledge_sources WHERE title = ?")
      .get("Bergman cutover walkthrough") as { n: number }
    expect(rows.n).toBe(0)
  })

  it("accepts it the moment the transcript is pasted, and indexes what was said", async () => {
    const res = await video(
      "Marta walked the cutover: the invoice run moves to the first Monday of April and Ana sends the supplier list."
    )
    expect(res.status).toBe(200)
    // The transcript is the MATERIAL, not a note beside the link — so it is
    // chunked and searchable like any other source. Asserted on the index rather
    // than on an answer: what a stand-in embedding model ranks is a different
    // subject, and this one is about the row existing with its words in it.
    const row = db()
      .prepare(
        `SELECT chunk_count AS n FROM knowledge_sources WHERE title = ? AND body LIKE '%first Monday of April%'`
      )
      .get("Bergman cutover walkthrough") as { n: number } | undefined
    expect(row?.n, "the pasted transcript must be indexed, not merely stored").toBeGreaterThan(0)
  })

  // THE GATE IS THE EMPTY BODY, NOT THE HOST — and this is the case that moved
  // it. The owner pasted a Tella recording behind his OWN domain,
  // `content.kwapso.com/video/…`, which walked past all fifteen hostnames and
  // became a source with a title, a link and no body: the exact shape the rule
  // exists to prevent, produced by the rule meant to prevent it.
  it("refuses ANY link with nothing to read, including one no list could name", async () => {
    const res = await call(IDS.staffUser, "POST /api/content/knowledge", {
      title: "Tella 1",
      sourceUrl: "https://content.kwapso.com/video/testing-application-loading-speed-cbfo",
    })
    expect(res.status).toBe(400)
    const rows = db().prepare("SELECT count(*) AS n FROM knowledge_sources WHERE title = ?").get("Tella 1") as {
      n: number
    }
    expect(rows.n, "and stores nothing — a row that looks filed and holds nothing is the defect").toBe(0)
  })

  it("and an ordinary link with nothing to read is refused too, in different words", async () => {
    const res = await call(IDS.staffUser, "POST /api/content/knowledge", {
      title: "The dispatch runbook",
      sourceUrl: "https://docs.example.com/runbook",
    })
    expect(res.status).toBe(400)
    const out = (await res.json()) as { error: string; message: string }
    // The DETECTOR still runs — it just chooses the sentence now rather than the
    // outcome. A person who pasted a document link is not told we cannot watch it.
    expect(out.error).toBe("link_needs_material")
    expect(out.message).not.toMatch(/watch a video/i)
  })

  it("and a link is welcome the moment there is something to read beside it", async () => {
    const res = await call(IDS.staffUser, "POST /api/content/knowledge", {
      title: "The dispatch runbook",
      sourceUrl: "https://docs.example.com/runbook",
      body: "The runbook says to check the session cookie before restarting the dispatch worker.",
    })
    expect(res.status).toBe(200)
  })

  it("a direct link to an .mp4 is refused too, wherever it is hosted", async () => {
    const res = await call(IDS.staffUser, "POST /api/content/knowledge", {
      title: "Standup recording",
      sourceUrl: "https://files.bergman.example/standup-2026-03-04.mp4",
    })
    expect(res.status).toBe(400)
  })
})

// ── ONE PARAGRAPH IS ONE SLOT, HOWEVER MANY ROADS IT ARRIVED BY ─────────────
//
// The failure this locks, measured on the agency's own staging base 28 Aug 2026
// over the twenty questions in scripts/kb-bench-questions.mjs: 17 of the 84
// passages the knowledge base handed back — ONE SLOT IN FIVE — were a paragraph
// the SAME answer had already shown the reader, and ten of the sixteen answered
// questions carried at least one such pair. Two questions about ticket 3144 spent
// three of their six slots on one identical paragraph.
//
// Nothing was mis-ranked. A meeting reaches this base by several roads — the
// meeting record's own mirror embeds the Gemini notes, the notes document is
// indexed again from Drive, the notes email carries them a third time — so three
// different TITLES hold one set of words, and `PASSAGES_PER_TITLE`, which exists
// to stop one SUBJECT filling an answer, looks straight past it.
//
// Both halves are proved here, because the fix has two and the second is the one
// that can rot: suppressing the repeat frees a slot, and a slot freed is only
// worth having if what fills it says something. The backfill used to pool "held
// back by the title cap" with "says nothing at all" into one list re-sorted by
// score, so freeing those slots handed them straight to the envelopes.
describe("the same paragraph, arriving under three names, is worth one slot", () => {
  // Long enough to be a real chunk and to clear ENOUGH_TO_COMPARE's twenty
  // distinct words comfortably — below that the comparison is not made at all,
  // deliberately, and a fixture that sat under it would be measuring nothing.
  // LONG ENOUGH THAT THE TITLE IS NOT THE PASSAGE. The embedding in this suite is
  // a deterministic bag of words (see the head of the file), so on a short body
  // the extra words in a longer title — "2026/08/19 12:29 CEST — Notes by Gemini"
  // — dilute the match enough to drop that copy under the relevance floor, and
  // only one of the three ever reaches the ranking. The rule would then look
  // enforced by a fixture in which there was nothing to enforce it against.
  const NOTES =
    "The assembly agreed to hold a monthly remote gathering, with the organising rotated between the team " +
    "rather than owned by one person. Aurora raised that the previous cadence was too sparse for anybody to " +
    "build on, Alexander offered to take the first month, and the group settled on culture and bonding as the " +
    "standing purpose rather than project reporting, which stays in the weekly recap. The group agreed the " +
    "gathering is remote by default so that nobody is left out of the monthly rhythm, and that whoever is " +
    "organising picks the shape of it rather than working from a template agreed once and never revisited. " +
    "Alexander asked that the agreed purpose be written down where the team can find it, and Aurora agreed to " +
    "put the monthly rota beside it so the remote gathering does not quietly lapse the way the last one did."

  beforeEach(async () => {
    // THE SAME WORDS, THREE TIMES, UNDER THE THREE TITLES THE REAL BASE USES.
    for (const title of [
      "Team Assembly",
      "Team Assembly - 2026/08/19 12:29 CEST - Notes by Gemini",
      "Notes: “Team Assembly” Aug 19, 2026",
    ])
      await addSource(IDS.staffUser, { title, body: NOTES })
  })

  it("cites it once, and does not hand the reader the same words twice", async () => {
    const answer = await ask(IDS.staffUser, "What was agreed at the monthly remote assembly?")
    expect(answer.found, "the material is right there").toBe(true)
    const saying = answer.passages.filter((p) => p.text.includes("rotated between the team"))
    expect(
      saying.length,
      `the same paragraph came back ${saying.length} times, as ${titles(answer).join(" / ")}`
    ).toBe(1)
  })

  it("spends the slot it saved on material the answer does not already have", async () => {
    await addSource(IDS.staffUser, {
      title: "Assembly follow-up",
      // Sharing the question's own vocabulary on purpose: the embedding here is a
      // deterministic bag of words (see the head of this file), so a second
      // subject worded entirely differently would sit under the relevance floor
      // and this test would pass or fail on the fixture rather than on the rule.
      body:
        "What was agreed after the monthly remote assembly: the rota for organising it was written up and the " +
        "first three months were allocated, so nobody has to chase the monthly assembly each time. The remote " +
        "calendar hold goes out a fortnight ahead of every gathering.",
    })
    const answer = await ask(IDS.staffUser, "What was agreed at the monthly remote assembly?")
    expect(titles(answer)).toContain("Assembly follow-up")
    // Two subjects, not one said twice — which is what the slot was FOR.
    expect(answer.passages.length).toBe(2)
  })

  it("does not fill the slot with an envelope that says only its own title", async () => {
    // An envelope: a calendar row whose whole body is the words already in its
    // name. Perfectly RELEVANT — it is a near-perfect match for a question naming
    // the thing it is about — which is exactly why it used to win the slot.
    await addSource(IDS.staffUser, {
      title: "Updated invitation: Team Assembly @ Wed Aug 19, 2026 4pm - 5pm",
      body: "Updated invitation: Team Assembly @ Wed Aug 19, 2026 4pm - 5pm",
    })
    const answer = await ask(IDS.staffUser, "What was agreed at the monthly remote assembly?")
    expect(titles(answer).join(" / ")).not.toMatch(/Updated invitation/)
  })
})

// ── AN ANSWER IS NEVER PADDED WITH A PASSAGE THAT ADDS NOTHING ─────────────
//
// The other half of the bargain the two describes above make, tested at the seam
// because the door cannot reach it (see the note on `diversify`, and the one
// where this test used to live end-to-end).
//
// The rule has two sentences and they pull in opposite directions, which is why
// both are pinned here. A passage that says nothing beyond its own title, or that
// repeats one already in the answer, may not fill a slot while real material is
// available — six is a ceiling, never a quota, and the citation list already
// carries every title. But when such a passage is ALL there is, it is still the
// answer: "we have nothing on that" about a meeting we hold the record of is the
// worse sentence.
//
// It is a unit test on purpose. The backfill used to pool "held back by the title
// cap" with "says nothing at all" into one list re-sorted by score, so an envelope
// scoring 0.014 walked in ahead of a real paragraph scoring 0.012 — and that is
// invisible from outside unless the fixture happens to run short, which is exactly
// the condition the end-to-end harness cannot produce.
describe("an answer is never padded, and never silent when it has something", () => {
  const NOTES =
    "Marta agreed the cutover moves to the first Monday of April, and Ana will send the supplier list " +
    "before the invoice run so the desk can check it against the board before anybody signs it off."
  const MORE =
    "The supplier list itself is kept by the desk and reissued each quarter, so the April cutover needs " +
    "the March issue rather than the one on the board today, which Ana confirmed before the meeting closed."
  const row = (id: string, title: string, text: string) =>
    ({ id, source_id: id, seq: 0, text, title, kind: "document" }) as never

  const scored = (rows: unknown[]) => rows.map((r, i) => ({ row: r as never, score: 1 / (60 + i) }))

  it("leaves the envelope out while there is material, however well it scored", () => {
    // Best first, and the envelope is the BEST — which is the case a score cliff
    // cannot reach and this rule exists for.
    const out = diversify(
      scored([
        row("e", "Bergman dispatch review", "Bergman dispatch review is a meeting of ours, on 2026-08-25."),
        row("a", "Bergman dispatch review notes", NOTES),
        row("b", "Bergman dispatch follow-up", MORE),
      ])
    )
    expect(out.map((o) => o.row.title)).toEqual([
      "Bergman dispatch review notes",
      "Bergman dispatch follow-up",
    ])
  })

  it("and quotes it when it is the only thing there is", () => {
    const out = diversify(
      scored([row("e", "Bergman dispatch review", "Bergman dispatch review is a meeting of ours, on 2026-08-25.")])
    )
    expect(out.map((o) => o.row.title)).toEqual(["Bergman dispatch review"])
  })

  it("prefers a passage held back only by the title cap over one that says nothing", () => {
    // Three chunks of one document: the cap keeps two and sets the third aside,
    // and an envelope scoring better than it sits alongside. The third chunk is
    // real material this answer does not have; the envelope is not.
    const out = diversify(
      scored([
        row("a1", "Cutover plan", NOTES),
        row("a2", "Cutover plan", MORE),
        row("e", "Invitation: Cutover plan @ Tue Aug 25", "Invitation: Cutover plan @ Tue Aug 25"),
        row("a3", "Cutover plan", "The board copy is replaced on the first working day of each quarter by the desk."),
      ])
    )
    expect(out.map((o) => o.row.id)).toEqual(["a1", "a2", "a3"])
  })
})

// ── A SHORT ANSWER IS WIDENED FROM WHAT IT ALREADY HAS ─────────────────────
//
// The other half of removing the repeats. Taking three copies of one paragraph
// out of an answer honestly leaves four passages where there were six, and the
// slots are worth filling — from the paragraph either side of the one that
// matched, which is the rest of the same thought, and never from the top of the
// document, which on a transcript is "Hello. I don't think I can hear you."
//
// Why there is a shortfall at all is measured in the note on `widenNeighbours`
// and is not this rule's fault: on the agency's own staging base the vector arm
// returns a hundred nearest neighbours and nine of them still exist in the
// database, so a six-passage answer is routinely chosen from seven rows.
//
// Two things are pinned, and the second is the one that keeps it honest: it fills
// the gap, and it can never open a door. A neighbour is held to the same two bars
// as every other passage — it must say something of its own and must not repeat
// what is already there — and it can only come from a source the answer is
// already built on.
describe("a short answer is widened from the passages it already has", () => {
  // Six paragraphs of one document, worded so that each is distinctly about its
  // own thing: a neighbour that merely restated its sibling would be refused by
  // the same rule that refuses a repeat, and the test would prove nothing.
  const PARA = [
    "The cutover window opens on the first Monday of April and closes the following Friday evening.",
    "Marta owns the supplier list during the window and reissues it each quarter from the desk copy.",
    "Ana checks the invoice run against the board before anybody signs the cutover off as complete.",
    "The board copy is replaced on the first working day of each quarter, which is why March matters.",
    "Rollback is a single switch and the desk keeps the key, so nobody waits for an approval to use it.",
    "Training for the desk staff runs the fortnight before, in two sessions, morning and afternoon.",
  ]

  it("fills the empty slots from the paragraphs beside the one that matched", async () => {
    await addSource(IDS.staffUser, {
      title: "Cutover plan",
      // Chunked by the shipped chunker, so the neighbours are real rows with real
      // seq numbers rather than a fixture's idea of them.
      body: PARA.map((p) => p.repeat(9)).join("\n\n"),
    })
    const answer = await ask(IDS.staffUser, "Who owns the supplier list during the cutover window?")
    expect(answer.found).toBe(true)
    const fromPlan = answer.passages.filter((p) => p.title === "Cutover plan")
    // More than the title cap would ever have allowed on its own — which is the
    // whole point: the cap is about spreading an answer, and this is about not
    // handing back a short one when the document has more to say.
    expect(fromPlan.length, `only ${fromPlan.length} passages of a six-paragraph document`).toBeGreaterThan(
      2
    )
    // And they are neighbours of a match, not the document from the top.
    const seqs = fromPlan.map((p) => p.seq).sort((a, b) => a - b)
    expect(Math.max(...seqs) - Math.min(...seqs), `seqs ${seqs.join(",")}`).toBeLessThanOrEqual(
      fromPlan.length
    )
  })

  it("never reaches a source the answer was not already built on", async () => {
    await addSource(IDS.staffUser, {
      title: "Cutover plan",
      body: PARA.map((p) => p.repeat(9)).join("\n\n"),
    })
    // A source that the search did NOT reach. If widening could open a door, this
    // is what would come through it — it is about the same subject in the same
    // words, and it is fenced to somebody else.
    await addSource(OTHER_STAFF, {
      title: "Private cutover note",
      body: PARA.join(" ").repeat(4),
      visibility: "private",
    })
    const answer = await ask(IDS.staffUser, "Who owns the supplier list during the cutover window?")
    expect(titles(answer)).not.toContain("Private cutover note")
  })
})
