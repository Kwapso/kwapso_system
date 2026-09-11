// THE KNOWLEDGE BASE — one knowledge base, many compartments, chosen for the
// reader rather than by them.
//
// ════════════════════════════════════════════════════════════════════════════
// THE ARCHITECTURAL DECISION, written down where the code it governs lives,
// because a decision recorded anywhere else is a decision the next person
// relitigates.
//
// 1. IT IS A MODULE ON `workers/content`, NOT A NINTH WORKER. (Unchanged, and
//    the argument still holds.)
//
//    For: CLAUDE.md's first directive ("a route on an existing worker beats a
//    new worker"), and precedent — content already owns learning and tickets,
//    already reaches the team's own database over the one REST door, already
//    binds R2. A source row is shaped exactly like a learning row.
//
//    Against, and it is a real argument: ingestion is a different shape from
//    everything else here — scheduled, resumable, fanned out over thousands of
//    documents — and `workers/content` is on the CLIENT PORTAL's critical path.
//
//    Decided for the module, on three grounds: ingestion never touches the
//    request path for longer than one bounded slice; the isolation a worker
//    boundary buys is bought more provably by the fence the base already has
//    (every door here refuses a portal caller AT THE DOOR, machine-checked,
//    where "it is on another worker" is a deployment fact no law reads); and a
//    ninth worker is four law SCANS whose worker lists would each have to learn
//    about it, every one a place a new worker is silently un-measured.
//
// 2. THE SEARCH LIVES IN VECTORIZE. THE ANSWER STILL COMES OUT OF THE TEAM'S
//    OWN DATABASE. (This replaced the original decision. Here is why, and what
//    the original got right.)
//
//    WHAT WAS THERE BEFORE, and why it was reasonable: vectors were stored in
//    the team's own D1, and a search was two stages — a lexical narrowing to at
//    most 200 candidate chunks, then a cosine re-rank over exactly those. It
//    kept tenancy structural (a guard resolves one database id and the SQL
//    cannot name another) and it needed no new platform resource. At three
//    thousand chunks it worked.
//
//    WHAT WAS WRONG WITH IT, measured rather than assumed. The stages were
//    SERIAL, and the wrong one was first. The meaning stage only ever saw what
//    the word stage handed it, so a question asked in different words from the
//    material could not be answered no matter how good the embedding was — and
//    the "top-up" that was supposed to save it (fill the candidate set with the
//    compartment's newest chunks) is recency, not search. Against seven whole
//    books — 5.5 MB, 7,441 chunks, real embeddings, 142 questions with known
//    answers — the shipped design found the right passage in its top six on
//    46.5% of them. The same corpus, the same embeddings, the same questions,
//    with the two arms run SIDE BY SIDE and fused: see the numbers in
//    .plans/BUILD-4-knowledge-retrieval.md. The prefilter was the ceiling.
//
//    So the fix is not "Vectorize instead of D1". The fix is LEXICAL AND VECTOR
//    AS PEERS, and Vectorize is what makes the vector arm affordable when it can
//    no longer be a re-rank of two hundred rows: an approximate-nearest-neighbour
//    search over every chunk in the compartment, in one call, at any size.
//
//    THE FENCES DID NOT MOVE — see the header of knowledge-vectors.ts for the
//    full argument. In one line: the vector store NARROWS and the database
//    DECIDES. Vectorize is asked for ids and scores only (`returnValues: false`,
//    `returnMetadata: "none"`); every passage in every answer is then read back
//    out of the team's own database, under the caller's own owner clause, with
//    excluded sources gone. A mislabelled vector can cost a relevant passage; it
//    cannot produce one the caller was never allowed to read. Law R26.
//
// 3. THE ROUTER READS THE COVERS FIRST — AND SAYS WHAT IT READ, RATHER THAN
//    QUIETLY RE-ORDERING THE EVIDENCE.
//
//    Every record the base mirrors carries a short written SUMMARY of itself
//    (knowledge-summary.ts), embedded alongside the material at `level:
//    "record"`. A question searches the summaries first. That is the owner's
//    "the agent already knows what each notebook contains", and it is built.
//
//    WHAT THE SUMMARIES ARE NOT ALLOWED TO DO IS RANK THE PASSAGES, and this is
//    the sharpest thing the measurements taught. Two ways of letting a record
//    hint move a chunk were tried on the same corpus:
//      • as a PREFERENCE (lift the chunks of the top three records): recall@6
//        62.7% → 54.2% at book shape, → 14.8% when the same text was re-cut into
//        250 small records;
//      • as a NARROWING (search only inside the top records): → 34.5% (top 1),
//        49.3% (top 3), and 10.6% / 18.3% at record shape.
//    Both are worse, and the second is catastrophic, for the same reason: a
//    router is a GUESS about which notebook, and a guess placed in front of the
//    search can hide the answer completely. The search is very good at finding
//    the passage; it does not need to be told where to look.
//
//    So the summaries inform the ANSWER, not the ranking. The route narrows by
//    COMPARTMENT — which is a fact, not a guess: the caller is standing on a
//    client's record, or the question names one — and the records the summaries
//    matched ride the answer as `records`, so the assistant and the reader can
//    see what this question looks like it is about. Wrong, that is visible and
//    harmless. Wrong as a filter, it is invisible and fatal.
//
// ════════════════════════════════════════════════════════════════════════════
//
// THREE FENCES, and they are not the same fence — the comment is here because
// conflating any two of them is how this kind of module leaks:
//   • TENANCY   — the team's own database, and the vector index's namespace.
//   • THE CLIENT — `refusePortalCaller`, at every door (R21). The knowledge base
//     holds the agency's internal material; a client login never reaches it.
//   • THE PERSON — `owner_user_id`. Material that arrived through one member's
//     own sight of it is readable only in THEIR answers.
// A COMPARTMENT IS NOT A FENCE. It is relevance: which slice of the team's own
// material answers this question. Every compartment belongs to the same team and
// the same staff readers; narrowing to one is about a better answer, never about
// permission.

import { recordWorkerError } from "@shared/workers/error-log"
import { describeChanges, logActivity, type Actor } from "@shared/workers/activity"
import { addTokens, logUsage, NO_TOKENS, type TokenUsage } from "@shared/workers/credits"
import { countCollection } from "@shared/workers/count"
import { brand } from "@shared/brand"
import { d1ExecScript, d1Query, likeLiteral, sqlString, type D1Rest } from "@shared/workers/d1-rest"
import { GuardError, type MemberGuard } from "@shared/workers/gating"
import { ulid } from "@shared/workers/id"
import { decodeCursor, keysetAfter, PAGE_SIZE, toPage, type Page } from "@shared/workers/paging"
import { orderBy, resolveOrdering, type Ordering, type SortMenu } from "@shared/workers/sorting"
import { isVideoLink } from "@shared/media-links"
import { EMBED_ATTEMPT_CAP, INDEX_REVISIT_LIMIT, numberVar } from "@shared/workers/limits"
import {
  DOCUMENT_LIMIT_BYTES,
  optionalDocument,
  optionalText,
  requireText,
  TEXT_LIMITS,
} from "@shared/workers/validate"
import type {
  KnowledgeAnswer,
  KnowledgeCitation,
  KnowledgePassage,
  KnowledgeSource,
} from "@shared/types"
import type { Env } from "../env"
import { contextLineFor } from "./source-readers"
import {
  CHUNK_TARGET_CHARS,
  chunkText,
  contentHash,
  encodeEmbedding,
  expandGrainPieces,
  type GrainPiece,
  plainText,
  questionTerms,
  type StoredGrainPiece,
  tokenise,
} from "./knowledge-text"
import { buildSummary } from "./knowledge-summary"
import { passageId, READER_SHORTLIST_CAP } from "./knowledge-reader"
import {
  chunkVectorId,
  deleteVectors,
  hasVectorStore,
  NONE,
  recordVectorId,
  searchVectors,
  TEAM_SHELF,
  upsertVectors,
  type VectorFilter,
  type VectorLabels,
  type VectorRow,
} from "./knowledge-vectors"

/** The kinds of material a source can be. `note` is typed by a person; the rest
 * MIRROR a row the app already owns and are kept in step by the sweep. Data, not
 * a code path — a new kind is a line here plus a reader in knowledge-ingest.ts. */
export const KNOWLEDGE_KINDS = [
  "note",
  // A file somebody uploaded. The FILE is the truth and the body is a READING of
  // it, which is why it is its own kind rather than a note with a link on it: a
  // reader who disagrees with an answer needs to be able to tell the difference
  // between words a colleague typed and words a converter produced.
  "file",
  "ticket",
  // ARTICLE — a kind with no mirror behind it any more, and deliberately kept.
  // The Learning module was purged on 17 Aug 2026 and its table went with it,
  // but its 41 articles had already been indexed here, so the material outlived
  // the module. Dropping the kind would orphan those rows: the sweep no longer
  // writes one, and nothing reads `learning` — this word is only what an
  // existing source calls itself, and what a person filters by to find one.
  "article",
  "account",
  // The three record kinds the vector rebuild added — an app, a story and a
  // sprint each carry a summary, so the router knows what a record is ABOUT
  // before it searches.
  "app",
  "story",
  "sprint",
  // THE REST OF WHAT AN AGENCY KNOWS ABOUT A CLIENT. Six kinds that all carry an
  // account id and none of which the sweep could read: a conversation we had, the
  // map of what we actually DO for them, the person we talk to, what we are
  // waiting on them for, and our own jobs about them. `meeting` shipped its
  // reader before it was named here, so every transcript in the base was being
  // listed and filtered as a `note` — the coercion in `toSource` below is what
  // made that silent.
  "meeting",
  "process",
  "contact",
  "todo",
  "task",
  // The four that arrive through somebody's own Google connection. Named for
  // what a person would call the thing rather than for the service it came out
  // of — somebody filtering the knowledge base is looking for "an email", and
  // would have to translate "gmail" back into one. Built in
  // lib/knowledge-google.ts, which is where the readers beside them live.
  "document",
  "email",
  "event",
  "message",
  // R47's three, added 1 Sep 2026 — the modules a person could see and the
  // assistant could only reach through a tool.
  //
  // `person` is the one that earned the law: the owner asked for a colleague's
  // full name and nothing in the base said who his own people are. It is also
  // the only kind whose row is not in the team's database — membership is
  // global, and `staff_profiles` carries no name at all.
  "person",
  // The team's own vocabulary, one source per LIST and never one per value: the
  // answer to "what ticket types do we use" is a list, so the list is the record.
  "dropdown",
  // Who at a client can open the portal, filed in that client's own compartment.
  "portal_login",
] as const
export type KnowledgeKind = (typeof KNOWLEDGE_KINDS)[number]

/** The agency's own compartment — everything not owned by one client. */
export const AGENCY_COMPARTMENT = "agency"

/** One client's compartment. The ONE place the string is built, so a reader and
 * a writer can never spell it differently. */
export const accountCompartment = (accountId: string): string => `account:${accountId}`

/** Chunks the LEXICAL arm returns, and how loudly it votes.
 *
 * BOTH NUMBERS ARE MEASURED, and the first sweep got them wrong. Run as an EQUAL
 * peer of the vector arm, the word match COST nine points of recall against the
 * vector arm alone (53.5% vs 62.7% — .plans/BUILD-4-knowledge-retrieval.md): its
 * hundred best guesses at an ordinary question are long chunks full of ordinary
 * words, and an equal vote puts them above the passage that answers it.
 *
 * So it is small, and it is GATED (see `hasExactTerm`). What it is for is the
 * one thing an embedding is indifferent to: something a person typed EXACTLY —
 * a ticket reference, an invoice number, an error code. */
const LEXICAL_TOP_K = 10
const LEXICAL_WEIGHT = 0.1

/** HOW MANY UNION-ALL BRANCHES ONE D1 STATEMENT MAY HOLD — d-lexical-branch-
 * limit, 11 Sep 2026, and this is the number to re-derive against, never
 * MAX_QUESTION_TERMS (24, `shared/workers/limits.ts`, which governs the
 * PARAMETER budget and is a different ceiling guarding a different thing).
 *
 * MEASURED, not assumed, against the live REST door, staging, harmless
 * `SELECT 1 AS x` branches, no table touched:
 *   4 branches → success   ·   5 branches → success
 *   6 branches → refused, every time:
 *   {"code":7500,"message":"too many terms in compound SELECT: SQLITE_ERROR"}
 *
 * THIS IS A CLOUDFLARE D1 PLATFORM CEILING, not a SQLite default — SQLite's
 * own documented `SQLITE_MAX_COMPOUND_SELECT` is 500. Nobody who tuned
 * MAX_QUESTION_TERMS against the 100-parameter budget ever measured this one,
 * because it is two orders of magnitude below what SQLite itself allows and
 * nothing about compiling against SQLite's own docs would have surfaced it.
 * `lexicalArm`'s old single UNION ALL of one branch per term threw, uncaught,
 * on every question that tokenised to 6+ distinct terms — see its own header
 * for the batched shape this cap now bounds. */
const LEXICAL_MAX_BRANCHES = 5

/** WHAT A CHUNK IS WORTH WHEN IT LITERALLY CONTAINS THE REFERENCE SOMEBODY TYPED.
 *
 * `LEXICAL_WEIGHT` is a tenth of a vote, and it was measured: at parity the word
 * match drags an ORDINARY question's answer down nine points. That measurement
 * stands and this does not touch it — but it was taken on ordinary questions, and
 * a question carrying a rare exact token is not one.
 *
 * MEASURED, 27 Aug 2026, and it is the same failure the proportional floor was
 * blamed for and did not cause. "task 3144" answers perfectly: two words, so the
 * embedding of the question is essentially the embedding of "3144" and the vector
 * arm finds the right chunks by itself. Put that reference inside a sentence a
 * person would actually say — "could somebody remind me where things currently
 * stand with task 3144, and whether anybody has replied about it since last
 * week?" — and the embedding is dominated by the polite framing, the vector arm
 * returns three FluClinic meetings, and the word arm, which found the right chunk,
 * is outvoted ten to one by construction. So the fuller and more courteous the
 * question, the worse the answer: exactly backwards.
 *
 * 2, AND THE NUMBER IS DERIVED RATHER THAN CHOSEN. Parity (1) is not enough, and
 * a test with six chatty near-misses around one short handover note is what
 * showed it: a distractor that the vector arm ranks first AND the word arm also
 * returns scores 1/(K+1) + LEXICAL_WEIGHT/(K+2), while the reference chunk scores
 * EXACT_WEIGHT/(K+1) and nothing else, because it matched one term. So parity
 * loses by exactly the tenth of a vote the distractor collects twice over. The
 * break-even is
 *
 *     EXACT_WEIGHT > 1 + LEXICAL_WEIGHT × (K+1)/(K+2)  ≈  1.098
 *
 * and 2 is the next whole number, which leaves room for a distractor that ranks
 * well in both arms rather than only the one that ranks first in each.
 *
 * It is safe above parity ONLY because the token had to be rare to get here
 * (EXACT_TERM_MAX_CHUNKS): "2026" never reaches this line. */
const EXACT_WEIGHT = 2

/** THE NAME ARM'S VOTE, and why it is EXACT_WEIGHT's twin rather than a number
 * of its own. A colleague's name is the same class of thing as a reference
 * code: something a person types EXACTLY, that an embedding is indifferent to.
 * "What is Alex's full name?" embeds almost entirely to "full name", which no
 * passage in the base says, so the vector arm cleared nothing and the question
 * was REFUSED — with the answer sitting one row away in a source titled
 * "Alexander Stadlmair". Measured on the bench before and after: 20/20 → 22/22
 * with the owner's two failed questions added, and no ordinary question moved.
 *
 * If a reason ever arises to move the two apart, move this one — the exact-token
 * weight has an arithmetic derivation above it (see EXACT_WEIGHT) and this does
 * not. */
const NAME_WEIGHT = EXACT_WEIGHT

/** THE SHORTEST THING THAT MAY BE SOMEBODY'S NAME. Two letters is "of", "an",
 * "we"; three is the floor at which a prefix means a person rather than a
 * coincidence, and it is what makes "Ana" work without "an" matching everybody. */
const NAME_MIN_CHARS = 3

/** How many colleagues this arm will consider. The people of ONE agency, so a
 * cap rather than a page (R14) — and stated here rather than at the statement
 * because a team that outgrows it wants a decision, not a silent truncation. */
const PEOPLE_HARD_CAP = 200

/** Chunks the fused list hands on to be READ out of the database.
 *
 * IT IS A BUDGET FOR ATTRITION, and 24 was not enough of one. The sentence above
 * this line used to say "comfortably more than one answer carries, so the
 * personal fence and the excluded-source filter can drop rows without the answer
 * running short". The intent was right and the number was measured against
 * nothing.
 *
 * MEASURED, 27 Aug 2026, on the question the owner's complaint is clearest on.
 * "What did we agree in the week recap?" returns 100 neighbours over the
 * relevance floor, and FIFTEEN of them exist: the other 85 are vectors whose
 * source is no longer in the database at all, and the first surviving one is at
 * rank 17. So a pool of 24 was spending 16 of its 24 slots on rows that cannot
 * come back, and what little got through was another person's private calendar
 * material, dropped again by the reader clause. The base answered "we have
 * nothing on that" about a meeting it holds two 96-chunk transcripts of.
 *
 * ATTRITION IS NORMAL, NOT AN OUTAGE, and that is why this is a budget rather
 * than a bug to fix elsewhere. Three separate things thin the pool between the
 * index and the answer, and two of them are permanent by design: the personal
 * fence hides a colleague's own material, an excluded source stays excluded, and
 * a re-index leaves the ids it replaced behind (R26 makes those safe to meet —
 * they read back as no row — but safe is not the same as free, because a ghost is
 * still a nearest neighbour and still takes a slot).
 *
 * 100 is the whole candidate list, so the pool no longer throws away evidence
 * before finding out whether it survives. The cost is ONE read of at most 100
 * rows by primary key — the same single statement, a longer id list — against an
 * answer that carries six. R14 is satisfied by the LIMIT at the statement, which
 * says the number out loud. */
const RANKING_POOL = 100

/** Passages one answer carries. Enough for a real answer with more than one
 * source behind it; small enough that the assistant's context stays cheap. */
const DEFAULT_PASSAGES = 6

/** HOW CLOSE IS CLOSE ENOUGH TO COUNT AS EVIDENCE.
 *
 * A vector search always returns something. There is always a nearest
 * neighbour, so without a floor the knowledge base would answer every question
 * ever asked, confidently, out of whatever happened to be least unlike it — and
 * R23's whole point is that "we have nothing on this" is a different KIND of
 * answer, not a shorter one. The old design got this by accident (its lexical
 * stage returned nothing, so there was nothing to rank); here it has to be a
 * decision, and a decision needs a number somebody measured.
 *
 * MEASURED, on 7,441 chunks with the shipped model (bge-m3), against 142
 * questions the corpus can answer and 16 it cannot:
 *
 *   answerable questions   min 0.507   5th pct 0.550   median 0.624
 *   unanswerable ones      max 0.519   95th pct 0.505  median 0.459
 *
 *   floor   real questions still answered   unanswerable ones refused
 *   0.40              100%                            13%
 *   0.45              100%                            38%
 *   0.50              100%                            88%
 *   0.55               95%                           100%
 *
 * 0.50 is the last floor that costs nothing. Going further buys the remaining
 * refusals with real answers, and a knowledge base that starts saying "nothing
 * on that" about things it holds is one nobody asks twice.
 *
 * IT IS A PROPERTY OF THE MODEL, not of the app — which is why it is a VAR and
 * not a constant. Cosine scales differ between embedding models: change
 * KNOWLEDGE_EMBED_MODEL and this number has to be measured again (the harness
 * that measured it is kept — see .plans/BUILD-4-knowledge-retrieval.md). A test
 * running against a stand-in model sets its own, for the same reason. */
const MIN_VECTOR_SCORE = 0.5

/** THE FLOOR WHEN A READER IS GOING TO LOOK ANYWAY (BUILD-5 §6: "a low
 * absolute score (~0.30) only guards nonsense; thin material → answer and say
 * what is missing"). KB-AUDIT.md §3 measured the cost of using
 * `MIN_VECTOR_SCORE` as the SOLE decision: a paraphrase sits 0.05–0.06 lower
 * than its direct twin, which is exactly the band 0.50 cuts — "Who is
 * responsible for organising the monthly get-together?" scored 0.444 against
 * the right document (Team Assembly) and was refused outright, correct
 * document, wrong decision layer.
 *
 * ONLY IN EFFECT WHEN `input.read` IS SUPPLIED. Every existing caller (no
 * reader) sees `MIN_VECTOR_SCORE` exactly as before — this is additive, not a
 * silent change to what "found" means for a caller that never asked for the
 * reader. See `retrieve`'s own comment at the point this is used. */
const READER_HALLUCINATION_FLOOR = 0.3

/** Reciprocal-rank fusion's smoothing constant. The two arms score on scales
 * that have nothing to do with one another (a cosine and a sum of term weights),
 * so they are fused by RANK. 60 is the value the method was published with and
 * it behaves like a prior: it takes a big rank difference to overturn agreement
 * between the two arms. */
const RRF_K = 60

/** Records the router names. It is answering "what is this question ABOUT",
 * which is a short list or it is not an answer. */
const ROUTER_TOP_RECORDS = 3

/** HOW MANY OF THE ROUTER'S RECORDS THE LAST-RESORT READ OPENS.
 *
 * Fewer than the router names, deliberately. `ROUTER_TOP_RECORDS` decides what a
 * READER is told the question looks like it is about — a sentence somebody can
 * disagree with, so three is generous. This decides what gets READ when nothing
 * else found anything, and there a third guess is a paragraph from a
 * conversation that merely resembles the right one. The best two, and the
 * diversifier still has the final word on how many of each survive. */
const ROUTER_FALLBACK_RECORDS = 2

/** Terms one question contributes to the lexical arm. A question is short; this
 * is a ceiling on a pathological one (a pasted log file in the question box),
 * and it bounds the `IN (…)` list — and therefore the bound parameters — the
 * statement carries. D1 refuses a statement past 100 of those. */
const MAX_QUESTION_TERMS = 24

/** Chunk rows written per statement. A source's chunks go in as several scripts
 * rather than one, so a 1,700-chunk contract can't build a megabyte of SQL —
 * D1 refuses a statement over 100 KB. */
const CHUNK_WRITE_BATCH = 20

/** Texts handed to the embedding model in one call. Workers AI takes 100. */
const EMBED_BATCH = 100

/** Chunks one source may hold — DERIVED from the ceiling the door enforces, not
 * chosen beside it, so the two numbers cannot disagree.
 *
 * It used to be 200 (about eight pages) and the CHUNKER enforced it by silently
 * returning fewer pieces than the text had. That is the exact shape the owner
 * ruled out: "the upload is REFUSED with a clear message, never silently
 * trimmed." The refusal now happens at the door — `optionalDocument`, in bytes,
 * before anything is saved — and this is only the backstop for material that
 * never passes a door, a mirrored row some import made enormous. `indexSource`
 * indexes what fits and RECORDS the overflow on the row in both numbers, because
 * making an existing record unfindable would be a worse answer than an
 * incomplete one, and neither may be silent.
 *
 * The 1.4 is headroom: text whose paragraphs are shorter than the target cuts
 * into more pieces than its length alone predicts. */
export const MAX_CHUNKS_PER_SOURCE = Math.ceil((DOCUMENT_LIMIT_BYTES / CHUNK_TARGET_CHARS) * 1.4)

/** Chunks one INDEXING SLICE does. The unit of resumable work: a slice embeds,
 * writes and upserts this many chunks and then records where it got to. */
const INDEX_CHUNKS_PER_SLICE = 300

/** Slices one invocation will run before handing the rest back to the next
 * caller. 6 × 300 = 1,800 chunks, which is more than the largest document the
 * door will accept — so in practice a whole 300-page contract is indexed inside
 * the request that added it, and the ceiling exists for the case that isn't. */
const INDEX_SLICES_PER_CALL = 6

/* --------------------------------- reading -------------------------------- */

type SourceRow = {
  id: string
  kind: string
  origin_table: string | null
  origin_row_id: string | null
  compartment: string
  account_id: string | null
  app_id: string | null
  ticket_id: string | null
  sprint_id: string | null
  record_date: string | null
  title: string
  summary: string | null
  body: string | null
  body_bytes: number
  source_url: string | null
  file_url: string | null
  file_name: string | null
  file_type: string | null
  file_bytes: number
  file_note: string | null
  owner_user_id: string | null
  visible_to_app_id: string | null
  visible_to_app_name: string | null
  indexed_at: string | null
  chunk_count: number
  indexed_chunks: number
  index_error: string | null
  created_at: string
  creator_name: string | null
  editor_name: string | null
  updated_at: string | null
  deactivated_at: string | null
  /** JSON arrays, 0073 — every account/app this source concerns, additive
   * beside the singular `account_id`/`app_id` above. `'[]'` on every row
   * today: nothing writes them yet (DATA-MODEL.md says so), so a reader
   * falls back to the singular columns rather than treating an empty array
   * as "filed nowhere". */
  accounts: string
  apps: string
  /** 0073, defaults `'agency'` on every row and nothing writes it yet either
   * — read for display, never treated as the authoritative fence. */
  shared_with: string
  /** 0074 — a source that produced nothing beyond the sentence the app wrote
   * for it: findable, never quotable. Written by the sweep per kind. */
  generated_only: number
  /** HOW MANY DISTINCT PEOPLE currently see this, live ones only (`gone_at IS
   * NULL`) — a row with `gone_at` set has ended and does not count. DISTINCT
   * on `seen_by_user_id` rather than a bare row count: the unique index is
   * `(source_id, seen_where, seen_by_user_id)`, so the same person can hold
   * two live sightings of one source (a shared Drive folder AND a direct
   * email share), and a screen saying "N people have seen this" is a claim
   * about people, not about sighting rows. Correlated subquery rather than a
   * join: `knowledge_sightings` is keyed and indexed on `source_id`, so this
   * is one indexed lookup per row, not a scan. */
  sightings_count: number
}

/** The columns a LIST carries — everything except the material itself.
 *
 * `body` is deliberately absent. A source can now be a 300-page contract, and a
 * page of fifty of them would have been forty megabytes of JSON on the way to a
 * screen that shows titles. The summary is what a list is for; the body is what
 * a detail is for. */
const LIST_COLS = `id, kind, origin_table, origin_row_id, compartment, account_id, app_id, ticket_id, sprint_id,
  record_date, title, summary, NULL AS body, body_bytes, source_url,
  file_url, file_name, file_type, file_bytes, file_note, owner_user_id,
  visible_to_app_id, (SELECT name FROM apps WHERE id = visible_to_app_id) AS visible_to_app_name, indexed_at,
  chunk_count, indexed_chunks, index_error,
  created_at, creator_name, editor_name, updated_at, deactivated_at,
  accounts, apps, shared_with, generated_only,
  (SELECT COUNT(DISTINCT seen_by_user_id) FROM knowledge_sightings WHERE source_id = knowledge_sources.id AND gone_at IS NULL) AS sightings_count`

/** The columns ONE source carries. The body comes too — but only as far as a
 * person can read (see BODY_INLINE_CHARS), because a detail screen is a screen. */
const DETAIL_COLS = LIST_COLS.replace("NULL AS body", `substr(body, 1, ${bodyInlineChars()}) AS body`)

/** How much of a source's material a screen is handed inline. This is a DISPLAY
 * decision and nothing else: the whole document is stored and every word of it
 * is searchable. `bodyBytes` on the row says how much there really is, so the
 * screen can say "showing the first part of 412 KB" rather than quietly
 * presenting an excerpt as the whole thing. */
function bodyInlineChars(): number {
  return TEXT_LIMITS.long
}

/** A JSON array column, defensively — same shape as `sharding.ts`'s
 * `parseList`: anything that isn't an array of strings reads as empty
 * rather than throwing, because this is a DISPLAY read and a malformed row
 * should never turn a list screen into an error page. */
function parseIdList(json: string): string[] {
  try {
    const v = JSON.parse(json)
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []
  } catch {
    return []
  }
}

function toSource(r: SourceRow): KnowledgeSource {
  const shown = r.body ?? null
  return {
    id: r.id,
    kind: (KNOWLEDGE_KINDS as readonly string[]).includes(r.kind) ? (r.kind as KnowledgeKind) : "note",
    originTable: r.origin_table,
    originRowId: r.origin_row_id,
    compartment: r.compartment,
    accountId: r.account_id,
    appId: r.app_id,
    ticketId: r.ticket_id,
    sprintId: r.sprint_id,
    recordDate: r.record_date,
    title: r.title,
    summary: r.summary,
    body: shown,
    bodyBytes: r.body_bytes,
    // TRUE when what the screen was handed is less than what is stored — the one
    // fact that stops an excerpt from being mistaken for the document.
    bodyTruncated: shown !== null && r.body_bytes > shown.length,
    sourceUrl: r.source_url,
    fileUrl: r.file_url,
    fileName: r.file_name,
    fileType: r.file_type,
    fileBytes: r.file_bytes,
    fileNote: r.file_note,
    // The FIELD a person edits is "who may this be read by", so the wire says
    // that rather than making every reader remember what two null ids mean.
    // Three settings, in narrowing order — private beats app, because a source
    // that is both is answerable to one person and the app half is noise.
    visibility: r.owner_user_id ? "private" : r.visible_to_app_id ? "app" : "team",
    ownerUserId: r.owner_user_id,
    visibleToAppId: r.visible_to_app_id,
    // The app's NAME rides the row so a list can say "only the people on
    // Dispatch" without fetching every app to look one id up.
    visibleToAppName: r.visible_to_app_name,
    indexedAt: r.indexed_at,
    chunkCount: r.chunk_count,
    indexedChunks: r.indexed_chunks,
    indexError: r.index_error,
    active: r.deactivated_at === null,
    createdAt: r.created_at,
    creatorName: r.creator_name,
    editorName: r.editor_name,
    updatedAt: r.updated_at,
    // 0073's additive arrays — empty on every row today (nothing writes them
    // yet), so a reader falls back to the singular `accountId`/`appId` above
    // rather than reading an empty array as "filed nowhere".
    accounts: parseIdList(r.accounts),
    apps: parseIdList(r.apps),
    sharedWith: r.shared_with === "private" || r.shared_with === "agency_client" ? r.shared_with : "agency",
    generatedOnly: r.generated_only === 1,
    sightingsCount: r.sightings_count,
  }
}

/** THE PERSONAL FENCE, as SQL — LIVE against a source's own sightings, not a
 * denormalised copy, because every read that reaches `knowledge_sources`
 * through this function is R14-capped to a handful of rows and
 * `idx_knowledge_sightings_source` (migration 0073) makes the join a keyed
 * lookup rather than a scan. See `fastOwnerClause` below for the one table
 * this reasoning does NOT apply to.
 *
 * THREE BRANCHES, and only TWO of them have a counterpart in
 * knowledge-identity.ts's TS model — SAID PLAINLY because an earlier version
 * of this header claimed all three matched `readableBy` (now `sightingsAdmit`)
 * "exactly", and that sentence was false the moment this function grew a
 * branch the TS side was never given the column to build:
 *
 *   1. `team_visible = 1` — the STORED half of the answer (0075/0076),
 *      recomputed from live sightings by `recomputeTeamVisible` whenever one
 *      changes. Reading it here rather than re-deriving "does a live team
 *      sighting exist" inline is not an optimisation, it is the CONTRACT: this
 *      function and the flag must always agree, and the corpus-wide rot-check
 *      (knowledge-fence.test.ts) is what catches them drifting apart.
 *      MATCHES `teamVisible(sightings)` in knowledge-identity.ts.
 *   2. A source with NO sightings at all answers exactly as it always did:
 *      `owner_user_id IS NULL` is the team's, `owner_user_id = me` is mine — a
 *      typed private note or an uploaded file, which never gets a sighting
 *      because nobody's Google connection produced it. GATED ON
 *      `NOT EXISTS (any sighting for this source)`, and the gate is not
 *      defensive dressing: once a source has sightings, `owner_user_id` is no
 *      longer trustworthy on its own (see `fastOwnerClause` for the reason
 *      that column can end up `NULL` even with no team sighting present), so
 *      an ungated `owner_user_id IS NULL` would read a merely-AMBIGUOUS source
 *      as team-readable — the exact widening this function exists to refuse.
 *      NO TS COUNTERPART. `sightingsAdmit`/`teamVisible` take a `Sighting[]`
 *      and never see `owner_user_id`, so neither one can decide this branch —
 *      not a gap in the model, a question outside what it was ever handed.
 *      Proven correct on its own, against the real door, in
 *      knowledge-fence.test.ts ("a source with no sightings").
 *   3. EXISTS a LIVE sighting that is mine. The branch that answers for
 *      exactly the population this whole design exists to serve: several
 *      people's own sight of one thing, folded into one source, where no
 *      single column could ever have named all of them.
 *      Together with branch 1, MATCHES `sightingsAdmit(sightings, me)` — but
 *      only once a source HAS sightings; see branch 2 for the case it does
 *      not, which sightingsAdmit was never asked about at all.
 *
 * ONE COLUMN CANNOT HOLD A SET is the whole of why this function exists. The
 * old single-line version — `owner_user_id IS NULL OR owner_user_id = me` —
 * read correctly for a source at most one person had ever seen. It cannot
 * read correctly for the calendar fold, where measured on staging every one of
 * 27 doubly-or-triply-sighted events is private, on the private shelf, seen by
 * more than one person: `NULL` there would answer for everybody, and a single
 * saved id would lock the others out. See scripts/measure-source-identity.mjs.
 *
 * THE SIZE OF THE WALL IS NOT THE SIZE OF THE BUG. Branch 2 above (the
 * no-sightings legacy rule) is almost every fixture source in the suite —
 * deleting it reddens ~85 tests across nine files. Branch 1 reddens 2. If you
 * are debugging this at 2am and see dozens of unrelated-looking failures, that
 * is what heavy, honest coverage of a two-line clause looks like, not a sign
 * the app is on fire (kb_review, 11 Sep 2026, mutation-tested branch by branch). */
function ownerClause(guard: MemberGuard, prefix = ""): { sql: string; params: string[] } {
  // ALWAYS QUALIFIED, never bare `id` — `knowledge_sightings` has an `id`
  // column of its own (its primary key), and inside the correlated subqueries
  // below an unprefixed `id` resolves to THAT column, not to the source this
  // clause is about: the innermost matching table wins column-name scoping,
  // so `sg.source_id = id` would silently compare a sighting's own id to its
  // own source_id and never match, making every NOT EXISTS below vacuously
  // true and the gate it exists to be a no-op. Caught by knowledge-fence.test.ts,
  // not by inspection — the bug reads as correct SQL. `knowledge_sources.id` is
  // safe unprefixed because it is the literal, unaliased table name every bare
  // caller of this function actually queries.
  const id = prefix ? `${prefix}id` : "knowledge_sources.id"
  const owner = `${prefix}owner_user_id`
  const teamVisible = `${prefix}team_visible`
  return {
    sql: `(
      ${teamVisible} = 1
      OR (
        NOT EXISTS (SELECT 1 FROM knowledge_sightings sg WHERE sg.source_id = ${id})
        AND (${owner} IS NULL OR ${owner} = ?)
      )
      OR EXISTS (
        SELECT 1 FROM knowledge_sightings sg
         WHERE sg.source_id = ${id} AND sg.gone_at IS NULL AND sg.seen_by_user_id = ?
      )
    )`,
    params: [guard.userId, guard.userId],
  }
}

/** THE FAST OWNER CHECK — for `knowledge_chunks`, `lexicalArm`'s stage one,
 * read before `LIMIT LEXICAL_TOP_K` narrows the BM25 match set down to
 * anything a caller could afford to fence precisely.
 *
 * NOT BECAUSE THIS TABLE LACKS `source_id` — a stale version of this comment
 * once said so, back when this ran against `knowledge_terms`, which genuinely
 * has none. `knowledge_chunks` DOES carry `source_id`, so a sightings-aware
 * check here would cost only a ONE-hop join, not two. That table stopped
 * being what this fences the day `lexicalArm` moved to `knowledge_chunks_fts`
 * — a correct decision (this function) is worth nothing if the reason beside
 * it describes a table its own caller no longer touches, which is exactly the
 * trap a reader falls into trusting a declaration-site comment over a
 * call-site one.
 *
 * THE REAL REASON, TODAY: cost is still the right call, just for a different
 * shape of it. This runs over every candidate BM25 matches, before the LIMIT
 * — not the tiny, R14-capped handful of rows `ownerClause`'s correlated
 * `EXISTS` was priced for — and precision at this stage buys nothing a
 * cheaper check could not also buy, because whatever survives it still
 * crosses the sightings-aware read-back at `retrieve`'s `reader.sql` before
 * it can become an answer (verified by census, not assumed — see
 * `lexicalArm`'s own call-site comment).
 *
 * `owner_user_id` alongside `team_visible` still narrows the common case (no
 * sighting, or one) for free, exactly as it always has — that column's WRITE
 * path belongs to each ingest reader (knowledge-ingest.ts, knowledge-google.ts)
 * and is untouched by any of this. Once a source has more than one DISTINCT
 * PRIVATE sighter, no single column can name them all, and the honest value
 * for `owner_user_id` on its chunks and terms is `NULL` — read here as "narrow
 * it in for everyone" rather than "nobody restricts it". THAT IS R26'S OWN
 * BARGAIN, one layer down: a wrong label here costs a relevant passage its
 * place in the ranking; it cannot cost a caller an answer they should never
 * have had, because the read-back through `knowledge_sources` — `ownerClause`
 * above, which DOES consult sightings — is what actually decides.
 *
 * EXPECT THIS FUNCTION TO NEUTER TO `(1=1)` AND EVERY TEST TO STAY GREEN. That
 * is not missing coverage; it is what "narrows, never decides" predicts —
 * this clause can be wrong in the permissive direction with no observable
 * effect on any answer, by design, and a red test here would mean the
 * architecture had quietly started trusting this function for something it
 * was never built to guarantee. */
function fastOwnerClause(guard: MemberGuard): { sql: string; params: string[] } {
  return {
    sql: `(team_visible = 1 OR owner_user_id IS NULL OR owner_user_id = ?)`,
    params: [guard.userId],
  }
}

/** THE WRITE SIDE OF `team_visible` AND `owner_user_id` — SQL TEXT, not a call.
 *
 * Every writer that changes what a source's sightings SAY (a new sighting, a
 * shelf moved private→team, one retired) must recompute BOTH stored facts a
 * fold leaves behind — `team_visible` (`teamVisible`, knowledge-identity.ts)
 * and the single-owner case (`singleOwnerOf`, same file) — and denormalise
 * both onto every chunk and posting the source owns, in the SAME statement or
 * transaction as that write — never a follow-up call that can be skipped.
 * This function is the exact condition the hub set before any of this could
 * be trusted to store an answer (tick 8): the recompute must be atomic with
 * the write that made it stale, or the gap between them is a window where the
 * stored facts say one thing and the sightings say another, silently.
 *
 * WHY `owner_user_id` NEEDS THIS TOO, and did not from the start. Chunks and
 * terms copy `owner_user_id` at INDEX time (`indexSource`), which only runs
 * again when a source's TEXT changes — and a new sighting, a shelf move or a
 * retirement changes none of it. Without this, the denormalised copies would
 * go on citing whoever the LAST re-index saw, forever, the moment a second
 * sighting arrived with no accompanying content change — silent, and
 * invisible to every test that only ever changes text and sightings
 * together.
 *
 * SO IT RETURNS TEXT RATHER THAN EXECUTING ANYTHING. A separate async call is
 * a separate network round trip a future writer's own `d1ExecScript` can be
 * built without — awaited, forgotten, or raced against the very insert it was
 * meant to follow. Splicing this into THAT SAME script makes "wrote a
 * sighting without recomputing" impossible to construct rather than merely
 * disciplined against; the string is unusable any other way, which is the
 * point.
 *
 * THREE STATEMENTS, TWO COMPUTED VALUES, in SQL rather than round-tripped
 * through this process — `EXISTS(...)` and the owner subquery each evaluate
 * once and are reused across all three UPDATEs, so they share one true source
 * of truth rather than six chances for a client-computed value to be stale by
 * the time the last statement runs. `gone_at IS NULL` is a LIVE sighting;
 * `shelf = 'team'` is the only shelf `team_visible` ever models — see
 * `ownerClause`'s own header for why the app tier can never ride this column.
 * The owner subquery is `singleOwnerOf` in SQL: exactly one live sighting,
 * and it is private, names that person; anything else is `NULL`.
 *
 * ── THE ONE THING A CALLER MUST GET RIGHT, SAID EXACTLY: SPLICE ORDER ──────
 *
 * `d1ExecScript` runs the statements in ONE script in the order they are
 * written, and each later statement sees every earlier one's effect — that is
 * the whole reason a script is atomic in the first place. This function's
 * `EXISTS` subqueries read `knowledge_sightings` AS THE SCRIPT STANDS AT THE
 * MOMENT THEY RUN. So:
 *
 *   THE STATEMENT(S) THAT INSERT, UPDATE OR RETIRE A SIGHTING FOR THIS SOURCE
 *   MUST APPEAR EARLIER IN THE SAME SCRIPT STRING THAN THIS FUNCTION'S OUTPUT.
 *
 *       const script = `
 *         INSERT INTO knowledge_sightings (...) VALUES (...);
 *         ${teamVisibleRecomputeSql(sourceId)}
 *       `
 *       await d1ExecScript(cfg, guard.databaseId, script)
 *
 * GET THE ORDER BACKWARDS — recompute text placed BEFORE the sighting write —
 * and the `EXISTS` runs against the sightings table as it stood a moment
 * EARLIER, before the very write that was supposed to make it correct. That
 * produces exactly the staleness this function exists to prevent, self
 * inflicted, inside the one script that was supposed to be atomic against it.
 * A stale-high result from this failure mode never leaks (it only narrows a
 * caller in early, which R26 accepts); a stale-LOW one silently refuses
 * material to everybody it should still answer for, the moment the ordering
 * mistake happens to land on a source's LAST live sighting retiring.
 *
 * Multiple sighting writes for the SAME source in one script — a fold adding
 * one sighter while retiring another — are fine in any order AMONG
 * THEMSELVES, as long as all of them precede this function's text. A caller
 * recomputing with no sighting write in the same script at all (a resync, a
 * repair pass) may splice this anywhere; there is nothing to race against. */
export function teamVisibleRecomputeSql(sourceId: string): string {
  const id = sqlString(sourceId)
  const teamSightingExists = `EXISTS (
    SELECT 1 FROM knowledge_sightings
     WHERE source_id = ${id} AND gone_at IS NULL AND shelf = 'team'
  )`
  // `singleOwnerOf`, in SQL: COUNT = 1 makes MAX(shelf) and MAX(seen_by_user_id)
  // that one row's own values (MAX of one value is that value), so the CASE
  // reads exactly as "exactly one live sighting, and it is private".
  const singleOwner = `(
    SELECT CASE WHEN COUNT(*) = 1 AND MAX(shelf) = 'private' THEN MAX(seen_by_user_id) ELSE NULL END
      FROM knowledge_sightings WHERE source_id = ${id} AND gone_at IS NULL
  )`
  return `
UPDATE knowledge_sources SET team_visible = ${teamSightingExists}, owner_user_id = ${singleOwner} WHERE id = ${id};
UPDATE knowledge_chunks SET team_visible = ${teamSightingExists}, owner_user_id = ${singleOwner} WHERE source_id = ${id};
UPDATE knowledge_terms SET team_visible = ${teamSightingExists}, owner_user_id = ${singleOwner}
  WHERE chunk_id IN (SELECT id FROM knowledge_chunks WHERE source_id = ${id});
`
}

/** THE ONE FRAGMENT `teamVisibleRecomputeSql` COULD NEVER PRODUCE BY ACCIDENT —
 * checked for rather than the whole string, so a future caller who changes
 * whitespace or reorders the three UPDATEs is not mistaken for one who
 * dropped the recompute entirely. */
const RECOMPUTE_MARKER = "UPDATE knowledge_sources SET team_visible"

/** DOES THIS SCRIPT WRITE A SIGHTING? An INSERT, or an UPDATE touching the two
 * columns whose change is what makes `team_visible` stale — `shelf` (moved
 * private→team or back) and `gone_at` (a sighting retired). A `SELECT`, or an
 * `UPDATE` that never names either column, does not change what
 * `teamVisibleRecomputeSql`'s `EXISTS` would find and is not this guard's
 * business. */
const SIGHTING_WRITE = /INSERT\s+INTO\s+knowledge_sightings\b|UPDATE\s+knowledge_sightings\s+SET\s+[^;]*\b(?:shelf|gone_at)\b/gi

/** THE GATE `teamVisibleRecomputeSql`'s OWN HEADER PROMISED AND A DOC COMMENT
 * COULD NEVER BE. kb_review's finding, named exactly: "the guarantee that a
 * future writer actually splices `teamVisibleRecomputeSql` into its own
 * transaction is enforced by NOTHING except a doc comment." Asked to "put
 * that sentence in the code, not just in a report" a second time — this is
 * what that looks like when a comment is not enough.
 *
 * WHY THIS INSPECTS THE RESOLVED STRING RATHER THAN CENSUSING SOURCE TEXT.
 * The obvious shape — read every file off disk, as `shared/rules/registry.ts`
 * already does for a dozen other laws, and trace which script a sighting
 * write lands in — was the first design. It does not survive contact with
 * this FILE's OWN two `d1ExecScript` callers: both build a script as
 * `statements.join("\n")`, an ARRAY assembled across several `.push()` calls
 * scattered through a loop, never one template literal a regex could read in
 * one piece. A census that trusted the SHAPE of the source would be fooled by
 * a refactor that changes nothing about correctness — the exact "correct
 * decision, false justification" trap this whole night has been about, one
 * layer earlier: a check that LOOKS like it proves atomicity and does not.
 *
 * So this inspects the ACTUAL, FULLY RESOLVED STRING, at the one place it is
 * about to be sent to D1 — after every `${...}` has already run, however the
 * caller assembled it. It does not care whether the script came from one
 * template literal, an array `.join`, or something not yet invented; it cares
 * what the string SAYS, which is the only thing D1 ever sees.
 *
 * ORDER IS CHECKED, PER WRITE, NOT JUST PRESENCE SOMEWHERE IN THE SCRIPT.
 * `teamVisibleRecomputeSql`'s own header names the two failure directions
 * separately, and this guard is what makes BOTH a thrown error rather than a
 * silent write: the marker missing entirely (nobody called it), and the
 * marker present but BEFORE the write it was meant to follow (the `EXISTS`
 * then reads sightings a moment before the change that was supposed to make
 * it correct — self-inflicted staleness inside the one script that was
 * supposed to be atomic against it). EVERY write walks its own INTERVAL —
 * after itself, before whatever write comes next or the end of the script —
 * and needs a recompute marker somewhere inside it; "one recompute exists
 * anywhere in the script" would let a batch of several writes hide behind a
 * single one that happened to run last.
 *
 * WHAT THIS STILL CANNOT PROVE, SAID PLAINLY RATHER THAN LEFT IMPLIED. A
 * recompute marker in a write's interval is not confirmed to be FOR THAT
 * WRITE'S SOURCE — this scans text, not source ids, so a script batching two
 * DIFFERENT sources' writes with only one of them actually recomputed could,
 * in principle, satisfy both intervals if the timing lined up by chance. That
 * gap is real and it is not this guard's to close: `teamVisibleRecomputeSql`
 * takes exactly one source id, its own worked example is one write and one
 * recompute, and the documented pattern is one source per script. A future
 * writer that batches several sources into one script should call this
 * function once PER SOURCE rather than lean on this guard to police a shape
 * nothing has asked it to support.
 *
 * A HARD THROW, NOT A LOGGED WARNING. A stale `team_visible` is a permission
 * bug waiting to be read by a future optimiser as "already decided" — see
 * `ownerClause`'s own header for why that read is the leak. Refusing the
 * write outright, before it reaches D1, is the same bargain R20 already makes
 * for a malformed request body: bad input is a 400, never a corrupted row.
 *
 * THE COMPANION THIS DOES NOT REPLACE. This catches a script that reaches
 * here malformed. It cannot catch a future writer who reaches for the raw
 * `d1ExecScript` instead of this wrapper — that needs a STATIC census (every
 * file under `workers/content/src/` that writes `knowledge_sightings` must
 * call `execKnowledgeScript`, never `d1ExecScript` directly), which belongs
 * in `shared/rules/registry.ts` beside this repo's other rot-checked laws.
 * Today that census would find nothing to check, because nothing writes a
 * sighting yet — which is exactly what makes it cheap to add now and
 * impossible to get wrong later. */
export async function execKnowledgeScript(cfg: D1Rest, databaseId: string, script: string): Promise<void> {
  const writes = [...script.matchAll(SIGHTING_WRITE)]
  const recomputeAt = [...script.matchAll(new RegExp(RECOMPUTE_MARKER, "g"))].map((m) => m.index ?? -1)
  // EVERY WRITE NEEDS A RECOMPUTE IN THE INTERVAL AFTER IT AND BEFORE
  // WHATEVER COMES NEXT — the next write, or the end of the script. Not "one
  // recompute exists somewhere in the script", which a batch of several
  // writes could satisfy with only the LAST one ever actually recomputed.
  // Walking intervals is what makes the natural batch shape correct instead
  // of merely lucky: write, recompute, write, recompute is exactly what a
  // fold processing several sources in one script would produce, and each
  // write's own interval must hold its own recompute. (This still cannot
  // prove the recompute in a shared interval is for the SAME source id as
  // that write — see the header for why, and why the documented one-source-
  // per-script pattern is what makes that gap not matter today.)
  for (let i = 0; i < writes.length; i++) {
    const from = (writes[i].index ?? 0) + writes[i][0].length
    const to = i + 1 < writes.length ? (writes[i + 1].index ?? Infinity) : Infinity
    if (!recomputeAt.some((at) => at >= from && at < to))
      throw new GuardError(
        500,
        recomputeAt.length ? "sighting_recompute_misordered" : "sighting_not_recomputed",
        recomputeAt.length
          ? "team_visible was recomputed BEFORE the sighting write it was meant to account for, in the same script — see teamVisibleRecomputeSql's splice-order header."
          : "A script wrote a knowledge_sightings row without recomputing team_visible in the same script — see teamVisibleRecomputeSql."
      )
  }
  return d1ExecScript(cfg, databaseId, script)
}

/** THE APP FENCE, as SQL — the middle setting the module was missing (12.3).
 *
 * The owner asked to "choose what information in the knowledge base is
 * accessible by whom", and the base had two answers: the whole team, or one
 * person. What was missing is the ordinary case in between — material somebody
 * wants kept off a wider audience INSIDE the agency without making it answerable
 * to themselves alone.
 *
 * IT RIDES A FENCE THE APP ALREADY HAS rather than inventing an access list. The
 * app record already decided who may open it (8.11: the staff on it, plus an
 * admin), and `app_staff` is where that lives. So a source can say "the people on
 * this app", and the sentence a reader must learn is one they already know from
 * every other screen. An access-control table would have been a second, parallel
 * answer to a question this codebase has already answered once.
 *
 * A SUBQUERY, NOT A RESOLVED LIST OF IDS — help.ts's `mineClause` made this
 * argument first and it is the same one: the staffed set is read INSIDE the
 * statement, so a list and the COUNT beside it can never be asked about two
 * different moments, and there is no unbounded `IN (…)` to cap. The admin half is
 * an `EXISTS` over the same statement for the same reason: one round trip, one
 * moment, and no second fetch to forget at a call site.
 *
 * A member staffed to nothing simply matches no restricted source, which is the
 * honest empty answer rather than an error.
 *
 * THE SIZE OF THE WALL IS NOT THE SIZE OF THE BUG. Branch 1 above
 * (`visible_to_app_id IS NULL`) is almost every fixture source in the suite —
 * deleting it reddens ~91 tests across nine files. The `app_staff` branch
 * reddens 8, the `is_default` bypass branch 1 (see `test/app-fence-clause`). If
 * you are debugging this at 2am and see dozens of unrelated-looking failures,
 * that is what heavy, honest coverage of a two-line clause looks like, not a
 * sign the app is on fire (kb_review, 11 Sep 2026, mutation-tested branch by
 * branch). */
function appClause(guard: MemberGuard, prefix = ""): { sql: string; params: string[] } {
  const col = `${prefix}visible_to_app_id`
  return {
    sql: `(${col} IS NULL
        OR ${col} IN (SELECT app_id FROM app_staff WHERE user_id = ? AND deactivated_at IS NULL)
        OR EXISTS (SELECT 1 FROM member_roles WHERE is_default = 1 AND id = ?))`,
    params: [guard.userId, guard.roleId],
  }
}

/** BOTH FENCES, FOR A READ THAT CAN SEE THE SOURCE ROW. Every read on
 * `knowledge_sources` goes through here — the list, its count, one source by id,
 * and the passage read-back that decides what an answer is made of.
 *
 * WHY THE LEXICAL ARM DOES NOT USE IT, said here because this is where somebody
 * will look for the inconsistency — and said of the table it actually runs
 * against TODAY, `knowledge_chunks` (the FTS5 rewrite moved stage one off
 * `knowledge_terms`; see `fastOwnerClause`'s own header for that history and
 * why it stopped being the reason). `knowledge_chunks` carries copies of the
 * source's `compartment` and `owner_user_id` so stage one is a single-table
 * read, and it carries no app. Rather than denormalise a third column onto it
 * and re-index the world to back-fill it, the app half is decided where R26
 * says decisions are made: the index (and the word-match beside it) NARROWS,
 * and the team's database DECIDES. A restricted chunk can reach the candidate
 * pool and cost a relevant passage its place; it cannot reach an answer,
 * because the read-back below is a join to `knowledge_sources` and this
 * clause is on it.
 *
 * EXPORTED so the whole-corpus SHAPE (lib/knowledge-shape.ts) fences with THIS
 * clause rather than with a second copy of it. `sourcesWhere` above already made
 * this argument about the list and its count — one builder, no drift — and a
 * picture of the corpus is a third reader of the same rows, so it is the same
 * argument a third time. A fence written twice is a fence that will be amended
 * once. */
export function readerClause(guard: MemberGuard, prefix = ""): { sql: string; params: string[] } {
  const owner = ownerClause(guard, prefix)
  const app = appClause(guard, prefix)
  return { sql: `${owner.sql} AND ${app.sql}`, params: [...owner.params, ...app.params] }
}

/** The sort a source list is keyed by: newest first, id breaking ties. */
const SOURCE_ORDER = "COALESCE(updated_at, created_at)"

/** WHAT THE KNOWLEDGE LIST MAY BE ORDERED BY (shared/workers/sorting.ts).
 * `touched` is the fallback — the order this list has always been in — and the
 * others are the three questions an agency asks of its own history: what is it
 * called, what kind of thing is it, and what is it FROM (which is not when it was
 * filed: a contract signed in March indexed in August is March's).
 *
 * The keys read the CONVERTED source rather than the raw row, because that is
 * what `toPage` is handed here — the menu pairs its SQL with the field that
 * mirrors it, and the field has to be one that exists at the point the cursor is
 * minted. */
export const KNOWLEDGE_SORTS: SortMenu<KnowledgeSource> = {
  touched: { expr: SOURCE_ORDER, dir: "desc", key: (s) => s.updatedAt ?? s.createdAt },
  added: { expr: "created_at", dir: "desc", key: (s) => s.createdAt },
  title: { expr: "title", dir: "asc", key: (s) => s.title },
  kind: { expr: "kind", dir: "asc", key: (s) => s.kind },
  dated: { expr: "COALESCE(record_date, created_at)", dir: "desc", key: (s) => s.recordDate ?? s.createdAt },
}

/** What a caller may narrow a source list to: the search box, the two words a
 * source is filed under, and whether it is still in use.
 *
 * `active` is an ALLOW-LIST of two words rather than a boolean, because it
 * arrives off a query string where everything is text and `"false"` is truthy.
 * "yes" is the sources the assistant may read; "no" is the ones somebody took
 * away and can put back (deactivate-never-delete, so they are still rows). */
export type SourceFilters = { kind?: string; compartment?: string; q?: string; active?: string }

/** THE FENCE PLUS THE FILTERS, built ONCE — because the list and the COUNT have
 * to be the same question. They were not: the count was the fence alone, so a
 * search answering with 12 sources was badged with the whole base's 3,400. R16
 * is about the badge being exact; it is exact about the wrong question if the
 * two clauses drift. One builder, no drift. */
function sourcesWhere(guard: MemberGuard, filter: SourceFilters): { sql: string[]; params: string[] } {
  const reader = readerClause(guard)
  const sql = [reader.sql]
  const params = [...reader.params]
  if (filter.kind) {
    sql.push("kind = ?")
    params.push(filter.kind)
  }
  if (filter.compartment) {
    sql.push("compartment = ?")
    params.push(filter.compartment)
  }
  // Not a parameter: the two words are matched against literals ABOVE this line
  // (the door's own allow-list), so what reaches the statement is our SQL and
  // never the caller's text.
  if (filter.active === "yes") sql.push("deactivated_at IS NULL")
  if (filter.active === "no") sql.push("deactivated_at IS NOT NULL")
  if (filter.q) {
    // The needle is a LIKE PATTERN, not just a bound value — likeLiteral is what
    // stops `%` meaning "everything" and an alternating pattern costing the
    // worker exponential time (see shared/workers/d1-rest.ts). It searches the
    // title and the SUMMARY rather than the body: a LIKE over 300-page documents
    // is a full scan of every byte the team owns, and the summary is the part
    // that says what each one is.
    sql.push(`(LOWER(title) LIKE ? ESCAPE '\\' OR LOWER(summary) LIKE ? ESCAPE '\\')`)
    const needle = `%${likeLiteral(filter.q.toLowerCase())}%`
    params.push(needle, needle)
  }
  return { sql, params }
}

/** The team's sources, newest first. R14 GROWING collection: keyset-PAGED, not
 * capped — the agency's own history alone is thousands of sources, so the door
 * answers "here is a page and where the next one starts" rather than refusing
 * past a ceiling. `cursor` is the opaque one from the previous page. */
export async function listSources(
  cfg: D1Rest,
  guard: MemberGuard,
  filter: SourceFilters,
  cursor: string | null,
  ordering: Ordering<KnowledgeSource> = resolveOrdering(KNOWLEDGE_SORTS, "touched", undefined, undefined)
): Promise<Page<KnowledgeSource>> {
  const narrowed = sourcesWhere(guard, filter)
  const where = [...narrowed.sql]
  const params: (string | number)[] = [...narrowed.params]
  // One ordering feeds the ORDER BY, the keyset predicate and the next cursor.
  const after = keysetAfter(decodeCursor(cursor, ordering.sig), ordering.expr, ordering.dir)
  if (after.sql) {
    where.push(after.sql)
    params.push(...after.params)
  }
  const rows = await d1Query<SourceRow>(
    cfg,
    guard.databaseId,
    `SELECT ${LIST_COLS} FROM knowledge_sources
      WHERE ${where.join(" AND ")}
      ${orderBy(ordering)} LIMIT ${PAGE_SIZE + 1}`,
    params
  )
  return toPage(rows.map(toSource), PAGE_SIZE, (s) => [ordering.key(s), s.id], ordering.sig)
}

/** R16: the exact server COUNT(*) for the badge — never rows.length. Carries the
 * same personal fence as the list, or the badge would count sources the reader
 * cannot see — and the same FILTERS, or a search's own count is a number about
 * somebody else's question. Called with no filter (the default) it is still the
 * whole collection's total, which is what the badge above the list shows.
 *
 * R16 (amended): counted exactly to TOTAL_COUNT_CAP through the one bounded
 * seam, then "at least". The filters ride the same WHERE, so a searched count
 * answers the searched question and is bounded on the same terms. */
export async function countSources(
  cfg: D1Rest,
  guard: MemberGuard,
  filter: SourceFilters = {}
): Promise<number> {
  const narrowed = sourcesWhere(guard, filter)
  return countCollection(
    cfg,
    guard.databaseId,
    `SELECT 1 FROM knowledge_sources WHERE ${narrowed.sql.join(" AND ")}`,
    narrowed.params
  )
}

/** One source by id, or null. */
export async function getSource(
  cfg: D1Rest,
  guard: MemberGuard,
  id: string
): Promise<KnowledgeSource | null> {
  const reader = readerClause(guard)
  const rows = await d1Query<SourceRow>(
    cfg,
    guard.databaseId,
    `SELECT ${DETAIL_COLS} FROM knowledge_sources WHERE id = ? AND ${reader.sql}`,
    [id, ...reader.params]
  )
  return rows[0] ? toSource(rows[0]) : null
}

/** The same read, throwing the clean 404 every write opens with. Outside the
 * caller's fence a real row and a made-up id answer identically. */
async function sourceOrThrow(cfg: D1Rest, guard: MemberGuard, id: string): Promise<KnowledgeSource> {
  const found = await getSource(cfg, guard, id)
  if (!found) throw new GuardError(404, "knowledge_not_found", "That source doesn't exist.")
  return found
}

/* --------------------------------- writing -------------------------------- */

/** What a create / edit accepts. `compartment` is not here on purpose: it is
 * DERIVED from `accountId`, so the two can never disagree. */
export type SourceInput = {
  title?: unknown
  body?: unknown
  sourceUrl?: unknown
  accountId?: unknown
  visibility?: unknown
  /** WHICH APP'S PEOPLE may read this (12.3), or absent for the whole team.
   * Deliberately NOT the same field as `appId` on the row: that one is the
   * SWEEP's — it says what a mirrored source is about and is rewritten on every
   * pass — and a person's decision about who may read something cannot live in a
   * column a background job overwrites. */
  visibleToAppId?: unknown
  /** WHICH CLIENTS this concerns (BUILD-5 §1's "filing", not "fencing" — the
   * hub's own words). Additive to `accountId`: a source stays filed under its
   * one compartment either way, this is the wider "also relevant to" list a
   * reader falls back away from once it carries anything (`toSource`'s own
   * comment). Verified before this was wired: no `WHERE` clause anywhere reads
   * this array, only `visible_to_app_id`/`owner_user_id` fence a read — so
   * writing it can only ever change what a card SAYS, never who a search
   * ADMITS. */
  accounts?: unknown
  /** WHICH APPS this concerns — same filing/fencing split as `accounts` above,
   * and unlike it there is no singular column to fall back to: `appId` names
   * what a MIRRORED source is ABOUT (the sweep's own field, rewritten every
   * pass), never a person's filing decision, so an empty `apps[]` has always
   * meant exactly what it says. */
  apps?: unknown
}

/** Every element of an ALREADY-CHECKED array through the text validator, so a
 * number or an object inside the list is a clean 400 rather than something
 * that reaches a statement (R20 — positional, same as `client-org.ts`'s `ids`). */
export function idArray(list: unknown[], field: string): string[] {
  return list.map((v) => requireText(v, field, TEXT_LIMITS.short))
}

/** The fields a create and an edit share, validated identically so the two can't
 * drift into different shapes.
 *
 * THE BODY IS A DOCUMENT, NOT A PARAGRAPH. It goes through `optionalDocument`,
 * which caps BYTES rather than characters and refuses — in words, saying both
 * numbers — rather than trimming. The old cap was TEXT_LIMITS.long, twenty
 * thousand characters, which is about eight pages: two whole books handed to
 * this door came back refused, and a 300-page contract could not go in at all. */
function readInput(input: SourceInput): {
  title: string
  body: string | null
  sourceUrl: string | null
  accountId: string | null
  privateToMe: boolean
  visibleToAppId: string | null
  accountIds: string[]
  appIds: string[]
} {
  const privateToMe = input.visibility === "private"
  const body = optionalDocument(input.body, "The material") ?? null
  const sourceUrl = optionalText(input.sourceUrl, "Link", TEXT_LIMITS.link) ?? null
  // A LINK IS NOT A SOURCE — IT IS A LINK TO ONE, and this is the door refusing
  // rather than the screen asking nicely. The form explains it while somebody is
  // typing and points at the box; this is what holds when the request arrives
  // from the assistant, from MCP, or from a screen that has drifted.
  //
  // THE GATE IS THE EMPTY BODY, NOT THE HOST, and that distinction was earned
  // rather than designed. The first version of this refused a VIDEO link, on a
  // list of fifteen hostnames — and the owner pasted a Tella recording behind his
  // own domain, `content.kwapso.com/video/…`, which walked straight past all
  // fifteen and became a source with a title, a link and no body. Exactly the
  // shape the rule exists to prevent, produced by the rule meant to prevent it.
  //
  // A HOST LIST IS WRONG THE MOMENT SOMEBODY USES A SERVICE THAT IS NOT ON IT.
  // "Has this anything for the assistant to read?" cannot go out of date, and it
  // closes the custom domain, the service nobody has heard of, and the one that
  // will exist next year. `isVideoLink` still runs — it chooses which SENTENCE
  // the person reads, which is all a detector was ever fit to decide.
  //
  // WHY REFUSE AT ALL. Every unreadable thing that ever reached this base was
  // ACCEPTED, stored, and quietly never read — 131 files of logo artwork, every
  // PDF at 0.000 letter-shaped tokens, `image/*` opaque since the beginning — and
  // nobody was told. Paste what it says and the source is welcome; paste nothing
  // and there is no row pretending to hold an answer.
  //
  // NOTHING IS FETCHED. There is no reader for a web page yet, and a network call
  // with a timeout on every paste would be a lot of machinery to decide something
  // this line already decides correctly without it.
  if (sourceUrl && !plainText(body ?? "").trim())
    throw new GuardError(
      400,
      isVideoLink(sourceUrl) ? "video_needs_transcript" : "link_needs_material",
      isVideoLink(sourceUrl)
        ? "We can't watch a video, so a link on its own gives the assistant nothing to read. Paste the transcript into the material and this source is good to go."
        : "A link on its own gives the assistant nothing to read — we don't open the page for you. Paste or write what it says into the material and this source is good to go."
    )
  return {
    title: requireText(input.title, "Title", TEXT_LIMITS.short),
    body,
    sourceUrl,
    accountId: optionalText(input.accountId, "Account", TEXT_LIMITS.short) ?? null,
    privateToMe,
    // PRIVATE WINS, AND IT WINS HERE rather than in three write statements.
    // "Only me" and "only the people on this app" are two answers to one
    // question, so a caller sending both gets the narrower one stored — and the
    // row can then never be in a state the reader (`toSource`) has to guess at.
    visibleToAppId: privateToMe
      ? null
      : (optionalText(input.visibleToAppId, "App", TEXT_LIMITS.short) ?? null),
    // FILING, ASKED THE SAME WAY THE FENCE FIELDS ABOVE ARE (R20: positional,
    // every element through a real checker) — but never narrowed by
    // `privateToMe`, because "who may read it" and "which clients this
    // concerns" are unrelated questions and a private source can still be
    // filed under three of them.
    accountIds: Array.isArray(input.accounts) ? idArray(input.accounts, "Accounts") : [],
    appIds: Array.isArray(input.apps) ? idArray(input.apps, "Apps") : [],
  }
}

/** THE APP A SOURCE MAY BE LIMITED TO must be one this caller can open — the
 * same sentence 8.11 says about the app record itself, asked of the same table.
 *
 * The failure path this closes is the boring one, and it is why the check is a
 * refusal rather than a silent store: somebody files a contract "for the people
 * on Dispatch", is not on Dispatch themselves, and has just written a source
 * they can no longer read, edit or take back. The fence has no exception for its
 * own author — a fence with one is not a fence — so the door refuses the move
 * instead of letting a person lock themselves out of their own material.
 *
 * ONE STATEMENT: the app must exist, and the caller must be staffed to it or
 * hold the locked Admin role. Same shape as the read fence, so the two can never
 * disagree about what "can open" means. */
async function requireOpenableApp(
  cfg: D1Rest,
  guard: MemberGuard,
  appId: string
): Promise<{ id: string; name: string }> {
  const app = appClause(guard)
  const rows = await d1Query<{ id: string; name: string }>(
    cfg,
    guard.databaseId,
    // R14: one row by primary key. `visible_to_app_id` in the fence is spelled by
    // `appClause`, so the id under test is aliased into that name.
    `SELECT id, name FROM (SELECT id, name, id AS visible_to_app_id FROM apps WHERE id = ?)
      WHERE ${app.sql} LIMIT 1`,
    [appId, ...app.params]
  )
  if (!rows[0])
    throw new GuardError(
      400,
      "invalid_input",
      "You can only limit a source to an app you are on, otherwise you'd be the first person locked out of it."
    )
  return rows[0]
}

/** The account a source is filed under must be one this team really has — a
 * compartment built from an id nobody owns would be a slice of the knowledge
 * base nothing can ever reach again. */
async function requireAccount(
  cfg: D1Rest,
  guard: MemberGuard,
  accountId: string
): Promise<{ id: string; name: string }> {
  const rows = await d1Query<{ id: string; name: string }>(
    cfg,
    guard.databaseId,
    "SELECT id, name FROM accounts WHERE id = ? LIMIT 1",
    [accountId]
  )
  if (!rows[0]) throw new GuardError(404, "not_found", "That account doesn't exist.")
  return rows[0]
}

/** Write a source a PERSON typed, and index it in the same call so the assistant
 * knows about it before they have finished reading the toast. Returns its id.
 *
 * THE BODY GOES IN AS A BOUND PARAMETER, not through `sqlString`. D1 refuses a
 * SQL statement over 100 KB, so the interpolated write this used to do put a
 * hard ceiling of about a hundred kilobytes on the material — one nobody had
 * chosen and nothing said out loud. A bound parameter carries the value beside
 * the statement instead of inside it, and the only ceiling left is the one in
 * the validator, which is a decision with a sentence attached. */
export async function createSource(
  env: Env,
  cfg: D1Rest,
  guard: MemberGuard,
  actor: Actor,
  input: SourceInput
): Promise<string> {
  const v = readInput(input)
  const account = v.accountId ? await requireAccount(cfg, guard, v.accountId) : null
  if (v.visibleToAppId) await requireOpenableApp(cfg, guard, v.visibleToAppId)
  // Same existence + access check the edit door runs — see updateSource's own
  // comment on why this is honesty (what a card may SAY) rather than a fence
  // (what a search may ADMIT).
  const accountsFiled = await Promise.all(v.accountIds.map((aid) => requireAccount(cfg, guard, aid)))
  const appsFiled = await Promise.all(v.appIds.map((aid) => requireOpenableApp(cfg, guard, aid)))
  const id = ulid()
  const now = new Date().toISOString()
  const compartment = account ? accountCompartment(account.id) : AGENCY_COMPARTMENT
  const summary = buildSummary({
    noun: "note",
    title: v.title,
    accountName: account?.name ?? null,
    detail: v.body ?? "",
  })
  await d1Query(
    cfg,
    guard.databaseId,
    `INSERT INTO knowledge_sources (id, kind, compartment, account_id, title, summary, body, body_bytes, source_url,
       owner_user_id, visible_to_app_id, accounts, apps, record_date, created_at, creator_id, creator_email, creator_name)
     VALUES (?, 'note', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      compartment,
      v.accountId,
      v.title,
      summary,
      v.body,
      byteLength(v.body),
      v.sourceUrl,
      v.privateToMe ? guard.userId : null,
      v.visibleToAppId,
      JSON.stringify(accountsFiled.map((a) => a.id)),
      JSON.stringify(appsFiled.map((a) => a.id)),
      now,
      now,
      actor.id,
      actor.email,
      actor.name,
    ]
  )
  await indexOneSource(env, cfg, guard, id)
  await logActivity(cfg, guard.databaseId, actor, {
    type: "Knowledge source added",
    description: `${actor.name} added "${v.title}" to the knowledge base`,
    relatedTable: "knowledge_sources",
    relatedRowId: id,
  })
  return id
}

/** How big a piece of material really is, measured the way the database
 * measures it and the way the validator refuses it. */
function byteLength(text: string | null): number {
  return text ? new TextEncoder().encode(text).length : 0
}

/** WRITE A SOURCE FROM AN UPLOADED FILE, and index whatever words came out of
 * it — the third way into the knowledge base.
 *
 * It is a sibling of `createSource` rather than a flag on it, because the two
 * differ in the one thing that matters here: what the TRUTH is. A note's truth
 * is its body, so an edit rewrites it. A file's truth is the file, so the body
 * is a READING that must always be traceable back to the thing it was read from
 * — which is why `fileUrl` is written in the same statement as the words, and
 * why `fileNote` is not optional in this function's shape.
 *
 * `extract.text` null is a first-class outcome, not a failure: the row is
 * written, the source is listed, `indexSource` finds no text and indexes nothing
 * — so `chunkCount` stays 0 and every screen reading it says "stored, not
 * searchable" without anybody having to remember to. The one thing that cannot
 * happen is a row that looks indexed and is not.
 *
 * THE BODY GOES IN AS A BOUND PARAMETER, for the reason `createSource` gives:
 * D1 refuses a statement over 100 KB and the material here can be a megabyte. */
export async function createFileSource(
  env: Env,
  cfg: D1Rest,
  guard: MemberGuard,
  actor: Actor,
  input: {
    title: string
    accountId: string | null
    privateToMe: boolean
    /** 12.3: limit it to the people on one app. Ignored when `privateToMe` — the
     * narrower answer wins, exactly as it does for a typed note. */
    visibleToAppId?: string | null
    // FILING, the same fields and the same door `createSource` takes them
    // through (d-ingest-filing) — a file can concern more than one client just
    // as a typed note can, and the third way into the base was the only one
    // that never asked. R20: positional, validated below via `idArray`, never
    // trusted as already an array of ids.
    accounts?: unknown
    apps?: unknown
    file: { url: string; name: string; type: string; bytes: number }
    extract: { text: string | null; note: string | null }
  }
): Promise<string> {
  const account = input.accountId ? await requireAccount(cfg, guard, input.accountId) : null
  const visibleToAppId = input.privateToMe ? null : (input.visibleToAppId ?? null)
  if (visibleToAppId) await requireOpenableApp(cfg, guard, visibleToAppId)
  const accountIds = Array.isArray(input.accounts) ? idArray(input.accounts, "Accounts") : []
  const appIds = Array.isArray(input.apps) ? idArray(input.apps, "Apps") : []
  // Same existence + access check createSource runs — see its own comment on
  // why this is honesty (what a card may SAY) rather than a fence (what a
  // search may ADMIT).
  const accountsFiled = await Promise.all(accountIds.map((aid) => requireAccount(cfg, guard, aid)))
  const appsFiled = await Promise.all(appIds.map((aid) => requireOpenableApp(cfg, guard, aid)))
  const id = ulid()
  const now = new Date().toISOString()
  const compartment = account ? accountCompartment(account.id) : AGENCY_COMPARTMENT
  const summary = buildSummary({
    noun: "file",
    title: input.title,
    accountName: account?.name ?? null,
    // A file we could not read still gets a summary, and the note IS the honest
    // one: "we keep presentations but can't read their words" is a true sentence
    // about this record, and the router prefers records it can describe.
    detail: input.extract.text ?? input.extract.note ?? "",
  })
  await d1Query(
    cfg,
    guard.databaseId,
    `INSERT INTO knowledge_sources (id, kind, compartment, account_id, title, summary, body, body_bytes,
       file_url, file_name, file_type, file_bytes, file_note,
       owner_user_id, visible_to_app_id, record_date, created_at, creator_id, creator_email, creator_name,
       accounts, apps)
     VALUES (?, 'file', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      compartment,
      input.accountId,
      input.title,
      summary,
      input.extract.text,
      byteLength(input.extract.text),
      input.file.url,
      input.file.name,
      input.file.type,
      input.file.bytes,
      input.extract.note,
      input.privateToMe ? guard.userId : null,
      visibleToAppId,
      now,
      now,
      actor.id,
      actor.email,
      actor.name,
      JSON.stringify(accountsFiled.map((a) => a.id)),
      JSON.stringify(appsFiled.map((a) => a.id)),
    ]
  )
  await indexOneSource(env, cfg, guard, id)
  await logActivity(cfg, guard.databaseId, actor, {
    type: "Knowledge source added",
    // The history says which of the two happened, because "we have that file"
    // and "the assistant can answer from that file" are different promises and
    // somebody will one day need to know which one was made.
    description: `${actor.name} uploaded "${input.file.name}" to the knowledge base${
      input.extract.text ? "" : ", kept, but not searchable"
    }`,
    relatedTable: "knowledge_sources",
    relatedRowId: id,
  })
  return id
}

/** Correct a source. A MIRRORED source's body belongs to the row it mirrors, so
 * only its filing (which client, who may read it) is editable here — the sweep
 * would overwrite anything else on its next tick, which would be a worse lie
 * than refusing. An UPLOADED FILE's body belongs to the file, so everything but
 * the words is editable, including its name. A typed note is editable in full. */
export async function updateSource(
  env: Env,
  cfg: D1Rest,
  guard: MemberGuard,
  actor: Actor,
  id: string,
  input: SourceInput
): Promise<void> {
  const before = await sourceOrThrow(cfg, guard, id)
  const v = readInput(input)
  const account = v.accountId ? await requireAccount(cfg, guard, v.accountId) : null
  if (v.visibleToAppId) await requireOpenableApp(cfg, guard, v.visibleToAppId)
  // accounts[]/apps[] (0073's arrays, BUILD-5 §1's FILING half) go through the
  // same existence + access checks as the singular `accountId`/`visibleToAppId`
  // above, for the same reason: a compartment or an app id nobody's caller can
  // reach is a slice of the knowledge base nothing can ever find again. Neither
  // array is read by any fence (`appClause` reads only `visible_to_app_id`,
  // verified before this was written), so this validation is honesty, not
  // access control — a card that says "Dispatch, Confia" should not be able to
  // say the name of an app or account this caller was never shown.
  const accountsFiled = await Promise.all(v.accountIds.map((aid) => requireAccount(cfg, guard, aid)))
  const appsFiled = await Promise.all(v.appIds.map((aid) => requireOpenableApp(cfg, guard, aid)))
  const accountsJson = JSON.stringify(accountsFiled.map((a) => a.id))
  const appsJson = JSON.stringify(appsFiled.map((a) => a.id))
  // WHOSE WORDS ARE THESE? Two families answer "not this form's": a MIRRORED
  // source, whose row the sweep would overwrite an edit from; and an UPLOADED
  // FILE, whose truth is the file — its body is a READING of it, and a form is
  // not where a reading is corrected.
  //
  // For the file the argument is sharper than "the sweep would undo it", and it
  // is a real trap rather than a principle: a detail screen is handed only as
  // much body as a person can read (DETAIL_COLS caps it), so a form prefilled
  // from that and saved back would write the EXCERPT over the document — a
  // 300-page contract silently becoming its first eight pages, with the file
  // still sitting there looking untouched. Filing and visibility stay editable,
  // which is everything a person actually wants to change about a file.
  const mirrored = before.originRowId !== null
  const fileBacked = before.fileUrl !== null
  // The TITLE is a different question from the WORDS, and a file answers the two
  // differently: its words belong to it, but nothing owns what we call it — so a
  // file source can be renamed and a mirrored one cannot (the sweep would put
  // the row's own name straight back).
  const title = mirrored ? before.title : v.title
  // A mirrored source's body is never read back here (the list does not carry it
  // and the detail carries only as much as a screen shows), so an edit leaves
  // the stored body alone rather than writing an excerpt over the document.
  const compartment = account ? accountCompartment(account.id) : AGENCY_COMPARTMENT
  const owner = v.privateToMe ? guard.userId : null
  // WHO MAY READ IT is one decision with three answers, and the ACCOUNT/APP half
  // of it is editable on all three families — a MIRRORED source's filing is
  // exactly the thing that stays editable when its words do not, and limiting a
  // file to one app's people is the commonest reason anybody opens this form at
  // all. The "only me" half is NOT one of the three, and that is new: for a
  // FILE-BACKED or NOTE source, owner_user_id below IS the decision, nothing
  // else ever touches that row, and this write is the only place it can come
  // from. For a MIRRORED source it is a live Google sweep's `writeSightings` +
  // `teamVisibleRecomputeSql` that own that column (knowledge-google.ts), and
  // the generic ingest engine's unconditional `owner_user_id =
  // excluded.owner_user_id` (knowledge-ingest.ts) means a value written HERE
  // would already be gone by the next tick — so the mirrored branch does not
  // write it at all, rather than promise something the sweep silently takes
  // back. That was a real bug, not a hypothetical: this form let somebody pick
  // "only me" on a mirrored source, said it saved, and lost the setting within
  // one sweep window with no error anywhere. The screen no longer offers that
  // choice on a mirrored source (knowledge-form-dialog.tsx); the door refuses to
  // write it either way, because a screen can drift and a door is the last
  // place this can be caught.
  const visibleToApp = v.visibleToAppId
  const now = new Date().toISOString()
  if (mirrored) {
    await d1Query(
      cfg,
      guard.databaseId,
      `UPDATE knowledge_sources SET account_id = ?, compartment = ?,
         visible_to_app_id = ?, accounts = ?, apps = ?, updated_at = ?,
         editor_id = ?, editor_email = ?, editor_name = ? WHERE id = ?`,
      [v.accountId, compartment, visibleToApp, accountsJson, appsJson, now, actor.id, actor.email, actor.name, id]
    )
  } else if (fileBacked) {
    // Everything but the words. The body and its summary are left exactly as the
    // reading produced them, for the reason above.
    await d1Query(
      cfg,
      guard.databaseId,
      `UPDATE knowledge_sources SET title = ?, source_url = ?, account_id = ?, compartment = ?,
         owner_user_id = ?, visible_to_app_id = ?, accounts = ?, apps = ?, updated_at = ?,
         editor_id = ?, editor_email = ?, editor_name = ? WHERE id = ?`,
      [
        title,
        v.sourceUrl,
        v.accountId,
        compartment,
        owner,
        visibleToApp,
        accountsJson,
        appsJson,
        now,
        actor.id,
        actor.email,
        actor.name,
        id,
      ]
    )
  } else {
    await d1Query(
      cfg,
      guard.databaseId,
      `UPDATE knowledge_sources SET title = ?, body = ?, body_bytes = ?, summary = ?, source_url = ?,
         account_id = ?, compartment = ?, owner_user_id = ?, visible_to_app_id = ?, accounts = ?, apps = ?,
         updated_at = ?, editor_id = ?, editor_email = ?, editor_name = ? WHERE id = ?`,
      [
        title,
        v.body,
        byteLength(v.body),
        buildSummary({ noun: "note", title, accountName: account?.name ?? null, detail: v.body ?? "" }),
        v.sourceUrl,
        v.accountId,
        compartment,
        owner,
        visibleToApp,
        accountsJson,
        appsJson,
        now,
        actor.id,
        actor.email,
        actor.name,
        id,
      ]
    )
  }
  // The chunks and the vectors carry the compartment and the owner too (both
  // arms narrow on them without a join), so a re-filing has to travel down or
  // the index would answer for a client whose material this no longer is.
  await indexOneSource(env, cfg, guard, id, { force: true })
  // For a MIRRORED source `owner` above was never written (see the comment on
  // it), so "to" has to be read the same way `before.visibility` itself was —
  // off whatever owner_user_id the row actually holds now, not off the form's
  // "only me" choice — or this line would tell a mirrored source's editor their
  // private-to-me pick took effect when the door just refused to write it.
  const visibilityAfter = mirrored
    ? before.visibility === "private"
      ? "private"
      : visibleToApp
        ? "app"
        : "team"
    : owner
      ? "private"
      : visibleToApp
        ? "app"
        : "team"
  const changes = describeChanges([
    { label: "Title", from: before.title, to: title },
    { label: "Filed under", from: before.compartment, to: compartment },
    { label: "Visible to", from: before.visibility, to: visibilityAfter },
    {
      label: "Body",
      from: before.body,
      to: mirrored || fileBacked ? before.body : v.body,
      hideValues: true,
    },
  ])
  await logActivity(cfg, guard.databaseId, actor, {
    type: "Knowledge source edited",
    description: `${actor.name} corrected "${title}" in the knowledge base${changes ? `, ${changes}` : ""}`,
    relatedTable: "knowledge_sources",
    relatedRowId: id,
  })
}

/** Take a source away from the assistant, or give it back. Deactivate-never-
 * delete: the ROW survives (so the decision, and who made it, survive with it)
 * and its CHUNKS AND VECTORS do not — an excluded source has to stop being
 * retrievable in the same instant, or "remove something wrong" is a promise the
 * search breaks. The sweep skips an excluded source rather than re-adding it.
 *
 * R17: the current-status predicate rides the UPDATE, so a double click moves
 * zero rows and writes no second line of history. */
export async function setSourceActive(
  env: Env,
  cfg: D1Rest,
  guard: MemberGuard,
  actor: Actor,
  id: string,
  active: boolean
): Promise<boolean> {
  const source = await sourceOrThrow(cfg, guard, id)
  const now = new Date().toISOString()
  const changed = await d1Query<{ id: string }>(
    cfg,
    guard.databaseId,
    active
      ? `UPDATE knowledge_sources SET deactivated_at = NULL, deactivator_id = NULL, deactivator_email = NULL, deactivator_name = NULL, updated_at = ? WHERE id = ? AND deactivated_at IS NOT NULL RETURNING id`
      : `UPDATE knowledge_sources SET deactivated_at = ?, deactivator_id = ${sqlString(actor.id)}, deactivator_email = ${sqlString(actor.email)}, deactivator_name = ${sqlString(actor.name)}, updated_at = ? WHERE id = ? AND deactivated_at IS NULL RETURNING id`,
    active ? [now, id] : [now, now, id]
  )
  if (!changed[0]) return false
  if (active) await indexOneSource(env, cfg, guard, id, { force: true })
  else await clearIndex(env, cfg, guard, id)
  await logActivity(cfg, guard.databaseId, actor, {
    type: active ? "Knowledge source restored" : "Knowledge source removed",
    description: `${actor.name} ${active ? "gave the assistant back" : "took away the assistant's sight of"} "${source.title}"`,
    relatedTable: "knowledge_sources",
    relatedRowId: id,
  })
  return true
}

/* -------------------------------- indexing -------------------------------- */

/** Everything derived FROM a source: its chunks, their postings, and its
 * vectors. The chunk rows are two keyed deletes; the vectors are removed by
 * DERIVED id — `<sourceId>:<seq>` for every sequence the row says it had, plus
 * its summary — so the index can be cleaned without first asking Vectorize what
 * it holds, and a source that got SHORTER loses its tail rather than keeping
 * orphan vectors nothing will ever overwrite.
 *
 * `fromSeq` IS THE DIFFERENCE BETWEEN TAKING A SOURCE AWAY AND REBUILDING IT.
 * Taking it away clears everything (`fromSeq` 0, the default). A REBUILD passes
 * the new chunk total and clears only the TAIL — the sequences the new text no
 * longer has — because every id from 0 upwards is about to be overwritten in
 * place by a write that says so (`ON CONFLICT (id) DO UPDATE`, below). Deleting
 * them first bought nothing and cost the one thing that matters here: while a
 * rebuild is mid-flight the material is GONE, so a second rebuild starting a
 * second later — the owner pressing "Bring it in" while the fifteen-minute
 * sweep is running — used to delete the pieces the first one had already
 * written. Overwrite-in-place plus a tail trim converges instead: two rebuilds
 * of the same text write the same bytes to the same ids, in any order. */
async function clearIndex(
  env: Env,
  cfg: D1Rest,
  guard: MemberGuard,
  sourceId: string,
  known?: { chunkCount: number; indexedChunks: number },
  fromSeq = 0
): Promise<void> {
  const counts =
    known ??
    (
      await d1Query<{ chunk_count: number; indexed_chunks: number }>(
        cfg,
        guard.databaseId,
        "SELECT chunk_count, indexed_chunks FROM knowledge_sources WHERE id = ? LIMIT 1",
        [sourceId]
      )
    )[0] ?? { chunk_count: 0, indexed_chunks: 0 }
  const written = Math.max(
    "chunkCount" in counts ? counts.chunkCount : counts.chunk_count,
    "indexedChunks" in counts ? counts.indexedChunks : counts.indexed_chunks,
    0
  )
  await deleteVectors(env, [
    // The record's own cover goes either way: a rebuild re-embeds it a moment
    // later (and a source that LOST its summary must not keep the old one).
    recordVectorId(sourceId),
    ...Array.from({ length: Math.max(written - fromSeq, 0) }, (_, i) =>
      chunkVectorId(sourceId, fromSeq + i)
    ),
  ])
  // `knowledge_terms`'s own delete USED TO SIT HERE. Retired (tracker item
  // `a-fts`) once `lexicalArm`'s move to `knowledge_chunks_fts` left it with
  // no reader anywhere in the app, the MCP surface or `scripts/` — verified
  // off disk, not assumed: zero `SELECT … FROM knowledge_terms` outside a
  // diagnostic COUNT(*) in wipe-knowledge.mjs. Step 1 of 2 (hub ruling,
  // 10 Sep 2026): stop writing first, fully reversible, the table and its
  // rows are untouched. Dropping the table is step 2 and waits until this
  // has run live through a real rebuild with nothing missing it.
  //
  // KEEPING `knowledge_chunks_fts` IN STEP — the same keyed 'delete' the
  // migration's own test demonstrates, reading the rows' CURRENT text WHILE
  // they still exist, immediately before the statement that removes them.
  await d1Query(
    cfg,
    guard.databaseId,
    `INSERT INTO knowledge_chunks_fts (knowledge_chunks_fts, rowid, text)
       SELECT 'delete', rowid, text FROM knowledge_chunks WHERE source_id = ? AND seq >= ?`,
    [sourceId, fromSeq]
  )
  await d1Query(cfg, guard.databaseId, "DELETE FROM knowledge_chunks WHERE source_id = ? AND seq >= ?", [
    sourceId,
    fromSeq,
  ])
  // A TAIL TRIM DOES NOT TOUCH THE COUNTERS: its caller sets all four in the
  // very next statement, and zeroing them here would open a window where the
  // row says "nothing indexed" about a source whose chunks are still there.
  if (fromSeq) return
  await d1Query(
    cfg,
    guard.databaseId,
    "UPDATE knowledge_sources SET chunk_count = 0, indexed_chunks = 0, indexed_at = NULL, content_hash = NULL, index_error = NULL WHERE id = ?",
    [sourceId]
  )
}

/** The text a source is indexed FROM: its title and its body, together. The
 * title is indexed with the body deliberately — a note called "Bergman dispatch
 * rollout" whose body never repeats the name would otherwise be unfindable by
 * the words a person would actually use.
 *
 * WITH ONE EXCEPTION, AND IT IS THE WHOLE OF THE UPLOAD PROMISE. A FILE we could
 * not read has no body, and indexing it on its TITLE alone would produce a
 * source with one searchable piece containing nothing but its own name — which
 * is precisely the state this feature is built never to reach. A real upload
 * proved it rather than a test: a .pptx came back "stored, not searchable" in
 * words and `chunkCount: 1` in the same row, so the screen that derives "stored,
 * not searchable" from the count would have called it searchable, and the
 * assistant could have cited a deck it had not read a word of. A title is not
 * material. An unreadable file indexes to nothing, and the number on the row
 * says so. */
export function indexableText(source: {
  title: string
  body: string | null
  file_url?: string | null
}): string {
  if (source.file_url && !source.body) return ""
  return [source.title, source.body ?? ""].join("\n\n").trim()
}

/** WHAT A CHUNK IS EMBEDDED AS — the chunk, and nothing else.
 *
 * THIS FUNCTION EXISTS TO RECORD A NEGATIVE RESULT, because without it the next
 * person will re-add the thing it names. Embedding each chunk with its record's
 * name (and summary) in front of it — "contextual retrieval", the standard
 * remedy for a sentence that means nothing out of its document — was built and
 * measured on the same corpus. With the record's SUMMARY in front: recall@6
 * 62.7% → 38.7%, because a four-hundred-character preamble shared by thirty
 * chunks makes those thirty chunks resemble each other more than they resemble
 * any question. With just the record's NAME: 62.7% → 62.7% at book shape and
 * → 59.2% when the same text was cut into 250 small records. Neutral at best,
 * and worse the moment a title is poor.
 *
 * WHAT WOULD CHANGE OUR MIND: a measurement on the AGENCY'S OWN material rather
 * than on books. The argument for the prefix is strongest exactly where this
 * corpus is weakest — three hundred tickets that all say "we tried again and it
 * still failed" — and the harness takes any corpus. */
function embeddableText(_source: unknown, chunk: string): string {
  return chunk
}

/** Ask the model for one embedding per text. Best-effort BY DESIGN: an embedding
 * failure must not fail an ingest, because the alternative is a knowledge base
 * that refuses to accept a note when Workers AI has a bad minute. A null
 * embedding stores as NULL, that chunk gets no vector, and the source's content
 * hash is left un-stamped so the next sweep tries again.
 *
 * AND FOR A YEAR THAT WAS THE WHOLE STORY, WHICH MADE AN OUTAGE INVISIBLE. This
 * swallows, returns nulls, and `indexSource` then completes and counts the
 * source as indexed — so `r.error` is never set, the sweep's own R12 recording
 * sees a clean run, and the assistant answers from a corpus that quietly stopped
 * growing. "Workers AI had a bad hour" and "there was nothing new to index"
 * produced the identical, cheerful log line, and the sweep re-read the same rows
 * every fifteen minutes for as long as it lasted.
 *
 * ONE ROW PER CALL, not per batch: a bad hour is one fact, and the recorder's
 * hourly budget (error-log.ts) is a shared resource this must not spend on
 * repeats of the same sentence. The count of failed batches rides in the message
 * instead, which is the number that says how big the hole is. */
async function embed(env: Env, texts: string[]): Promise<(number[] | null)[]> {
  const out: (number[] | null)[] = []
  let failedBatches = 0
  let firstFailure = ""
  for (let i = 0; i < texts.length; i += EMBED_BATCH) {
    const batch = texts.slice(i, i + EMBED_BATCH)
    try {
      const model = env.KNOWLEDGE_EMBED_MODEL || "@cf/baai/bge-m3"
      const res = (await env.AI.run(model as never, { text: batch } as never)) as {
        data?: number[][]
      }
      const vectors = Array.isArray(res?.data) ? res.data : []
      for (let j = 0; j < batch.length; j++) out.push(vectors[j] ?? null)
    } catch (e) {
      // Loud in the log, silent to the caller: the ingest continues without
      // vectors rather than losing the material. ERROR-HANDLING.md's rule is
      // never to swallow — the cron's own failure recording (R12) is what makes
      // this visible to somebody, and it records the run, not each chunk.
      console.error("knowledge embed failed:", e)
      failedBatches++
      if (!firstFailure) firstFailure = e instanceof Error ? e.message : String(e)
      for (let j = 0; j < batch.length; j++) out.push(null)
    }
  }
  if (failedBatches)
    await recordWorkerError(
      env.DB,
      "content",
      "knowledge/embed",
      new Error(
        `${failedBatches} embedding batch(es) of ${Math.ceil(texts.length / EMBED_BATCH)} FAILED, so ${failedBatches * EMBED_BATCH} chunk(s) have no vector and are unfindable by search. The ingest reports success either way and the sweep will re-read these on its next tick, and every tick after that, until it works. First failure: ${firstFailure}`
      )
    )
  return out
}

/** How far one source's indexing got. Returned so a door can tell a person, and
 * so a sweep knows whether to come back. */
export type IndexProgress = { total: number; indexed: number; done: boolean }

/** `knowledge_sources.grain_pieces` (migration 0081), read honestly: a row
 * this app wrote is JSON or NULL, never anything else, but a malformed value
 * must not fail the whole sweep for one source — same discipline as `embed`'s
 * own best-effort catch. NULL, missing, or an empty/malformed array all read
 * as "no structured pieces", which is exactly the safe, generic fallback
 * `indexSource` already has for every kind that never sets this column. */
function parseGrainPieces(raw: string | null): StoredGrainPiece[] | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length ? (parsed as StoredGrainPiece[]) : null
  } catch {
    return null
  }
}

/** Which source KINDS may spend on a context line (BUILD-5 §2) — a SPEND
 * decision the owner ruled on, 11 Sep 2026, and not one this function may
 * widen on its own: "not on email, not on chat" — an email or a chat message
 * already says who wrote it and when, so a generated summary adds almost
 * nothing; a paragraph from page 40 of a contract means nothing alone.
 * Measured shape behind the number: Drive averages 27.6 chunks per source
 * against 1.8 for email and 1.3 for chat, so gating on kind alone (rather
 * than "documents" in the loose sense) is what keeps the bill the owner
 * actually approved (~$0.55) rather than the ~$5.06 a blanket rollout costs.
 *
 * DELIBERATELY NARROWER than "a document": a typed note (`kind === "note"`)
 * and a manual upload (`kind === "file"`) are NOT here — the owner's own
 * numbers were Google Drive's specifically (`KIND_OF.drive` → `"document"`),
 * and widening past that is the same spend decision R42/BUILD-5 already
 * warn against making silently. Change this one line and say why. */
function wantsContextLine(kind: string): boolean {
  return kind === "document"
}

/** What this batch's chunk ids already say, read BEFORE any of them are
 * overwritten — the one read that lets `wantsContextLine`'s spend be skipped
 * for a piece whose own text has not changed. A chunk that does not exist
 * yet (a genuinely new piece) is simply absent from the map, which reads the
 * same as "always spend" below. */
async function priorContextLinesFor(
  cfg: D1Rest,
  guard: MemberGuard,
  ids: string[]
): Promise<Map<string, { text: string; contextLine: string | null }>> {
  const rows = await d1Query<{ id: string; text: string; context_line: string | null }>(
    cfg,
    guard.databaseId,
    `SELECT id, text, context_line FROM knowledge_chunks WHERE id IN (${ids.map(sqlString).join(", ")})`
  )
  return new Map(rows.map((r) => [r.id, { text: r.text, contextLine: r.context_line }]))
}

/** (Re)build one source's chunks, postings and vectors from its own text — in
 * SLICES, so a document of any size the door accepts is indexed by repeating one
 * bounded piece of work rather than by one call that has to finish.
 *
 * WHY STAGED AT ALL, in numbers: the largest document this door accepts is 1.5
 * MB, which is about 1,700 chunks. That is 17 embedding calls, ~85 SQL writes
 * and 9 vector upserts. A Worker may make 1,000 sub-requests per invocation, so
 * it fits — but only just, and only because the ceiling is where it is. A staged
 * indexer does not care where the ceiling is: it does 300 chunks, writes down
 * where it stopped, and the next call carries on. Nothing has to finish.
 *
 * IDEMPOTENT, AND RESUMABLE ACROSS A CHANGE. `content_hash` is the hash of the
 * text being indexed, stamped at the START of a rebuild; `indexed_chunks` is how
 * far that rebuild got. So "is this source current?" is `hash matches AND
 * indexed_chunks >= chunk_count`, and a source whose text changed halfway
 * through starts again rather than finishing a document that no longer exists.
 * A tick that dies leaves a source the next tick finishes. */
export async function indexSource(
  env: Env,
  cfg: D1Rest,
  guard: MemberGuard,
  sourceId: string,
  opts: { force?: boolean; slices?: number } = {}
): Promise<IndexProgress> {
  const rows = await d1Query<
    SourceRow & {
      content_hash: string | null
      embed_attempts: number
      generated_only: number
      shared_with: string
      team_visible: number
      grain_pieces: string | null
    }
  >(
    cfg,
    guard.databaseId,
    // `file_url` rides along because `indexableText` needs it: a file with no
    // body indexes to nothing, and the difference between "no body" and "a file
    // with no body" is the difference between a note somebody left blank and a
    // document we could not read. `shared_with` (0073) rides along for the
    // tenth Vectorize label (`labelsFor`) — see knowledge-vectors.ts. `team_visible`
    // rides along so the chunk/term write below can denormalise it — see that
    // write's own comment for why silently defaulting to 0 was a real gap.
    // `grain_pieces` (0081) rides along so a grain-bearing source can be
    // chunked from its own structured pieces rather than generically —
    // see `parseGrainPieces`/`expandGrainPieces` below.
    `SELECT id, kind, title, summary, body, file_url, compartment, account_id, app_id, ticket_id, sprint_id, record_date,
            owner_user_id, content_hash, chunk_count, indexed_chunks, embed_attempts, generated_only, shared_with,
            team_visible, grain_pieces, deactivated_at, created_at
       FROM knowledge_sources WHERE id = ? LIMIT 1`,
    [sourceId]
  )
  const source = rows[0]
  if (!source) return { total: 0, indexed: 0, done: true }
  // An excluded source is not indexed, ever — that is what excluding it means.
  if (source.deactivated_at !== null) {
    await clearIndex(env, cfg, guard, sourceId, {
      chunkCount: source.chunk_count,
      indexedChunks: source.indexed_chunks,
    })
    return { total: 0, indexed: 0, done: true }
  }

  const text = indexableText(source)
  const hash = contentHash(text)
  // A CARD IS EVERY WORD THE APP WROTE FOR THIS ROW, so it is never cut into
  // pieces and there is nothing to quote. It keeps its record vector below, so
  // the router can still route to it — findable, never quoted (KB-AUDIT.md
  // §4.3). The reader decided this per ROW at ingest, because every mirror kind
  // can also carry words a person typed and only the reader can tell.
  const card = source.generated_only === 1
  // PIECES WIN, AND `seq` FOLLOWS THEM (migration 0081's own answer to this):
  // when the source's own reader left structured pieces behind, they are
  // chunked directly — never re-derived by cutting `body` from scratch — and
  // only a source with none (every kind but chat today) falls back to the
  // ordinary generic chunker.
  const grainPieces = card ? null : parseGrainPieces(source.grain_pieces)
  const pieces: GrainPiece[] = card
    ? []
    : grainPieces
      ? expandGrainPieces(grainPieces)
      : chunkText(text).map((t) => ({ text: t, speaker: null, saidAt: null }))
  const total = Math.min(pieces.length, MAX_CHUNKS_PER_SOURCE)
  // NOT SILENT. A mirrored row bigger than the indexer's ceiling keeps the part
  // that fits — making an existing record unfindable would be a worse answer
  // than an incomplete one — but it SAYS SO on the row, in both numbers, where
  // the sync screen and the machine surface both read it. (An UPLOAD past the
  // ceiling never gets here: the door refuses it outright, and nothing is saved.)
  const overflow =
    pieces.length > MAX_CHUNKS_PER_SOURCE
      ? `Too big to index whole: the first ${MAX_CHUNKS_PER_SOURCE} of ${pieces.length} pieces are searchable.`
      : null

  let from = source.indexed_chunks
  const restart = opts.force || source.content_hash !== hash || from > total
  if (restart) {
    // Only the tail — everything below `total` is overwritten in place by the
    // write below. See clearIndex for why razing it first was the bug.
    await clearIndex(
      env,
      cfg,
      guard,
      sourceId,
      { chunkCount: source.chunk_count, indexedChunks: source.indexed_chunks },
      total
    )
    from = 0
    await d1Query(
      cfg,
      guard.databaseId,
      "UPDATE knowledge_sources SET content_hash = ?, chunk_count = ?, indexed_chunks = 0, index_error = ? WHERE id = ?",
      [hash, total, overflow, sourceId]
    )
  }
  // A CARD FALLS THROUGH. Everything below is a no-op for it except the record
  // vector, and returning here would make it invisible rather than unquotable —
  // the opposite of the intent, and identical on a green build.
  if (!card && (!total || from >= total)) return { total, indexed: from, done: true }

  const labels = labelsFor(source)
  const now = new Date().toISOString()
  const slices = Math.max(1, opts.slices ?? INDEX_SLICES_PER_CALL)
  // SUMMED ACROSS THE WHOLE CALL, ONE ROW PER logUsage'S OWN DOCTRINE ("the
  // row is per COMMAND"), not per chunk — a 300-page contract's first index
  // would otherwise write hundreds of usage-log rows for one tick's work.
  let contextLineUsage: TokenUsage = NO_TOKENS

  for (let slice = 0; slice < slices && from < total; slice++) {
    const slicePieces = pieces.slice(from, Math.min(from + INDEX_CHUNKS_PER_SLICE, total))
    const vectors = await embed(env, slicePieces.map((p) => embeddableText(source, p.text)))
    const upserts: VectorRow[] = []

    for (let start = 0; start < slicePieces.length; start += CHUNK_WRITE_BATCH) {
      const batch = slicePieces.slice(start, start + CHUNK_WRITE_BATCH)
      const ids = batch.map((_, offset) => chunkVectorId(sourceId, from + start + offset))
      // THE POSTINGS THIS BATCH IS ABOUT TO REPLACE, in the FTS5 index — a chunk
      // keeps its id when its text changes, so its old words would otherwise
      // stay behind pointing at a piece that no longer contains them.
      // `knowledge_terms`'s own delete USED TO SIT HERE too; retired alongside
      // `clearIndex`'s (see that function's comment for the full reasoning and
      // the verification this rests on).
      const statements: string[] = [
        // KEEPING `knowledge_chunks_fts` (0073) IN STEP — application code's job,
        // because a trigger cannot survive this repo's migration executor (see
        // the migration's own header). External-content FTS5's 'delete' command
        // needs the OLD text to remove the right postings, so it is read back
        // with a plain SELECT, BEFORE the chunk rows below overwrite it. On a
        // first write this matches no row and deletes nothing, which is correct.
        `INSERT INTO knowledge_chunks_fts (knowledge_chunks_fts, rowid, text)
           SELECT 'delete', rowid, text FROM knowledge_chunks WHERE id IN (${ids.map(sqlString).join(", ")});`,
      ]
      // THE PIECE'S OWN CONTENT_HASH DECIDES WHETHER A CONTEXT LINE IS SPENT
      // AGAIN — read BEFORE any of this batch's rows are overwritten, exactly
      // like the FTS delete above needs the OLD text first. A chunk whose own
      // TEXT is unchanged from what is already on the row keeps its existing
      // line; only a new or genuinely changed piece spends a model call. See
      // `contextLineFor`'s own doc comment (source-readers.ts) for why this is
      // the caller's job: "the difference between spending BUILD-5's $1.70
      // once and spending it on every rebuild."
      const priorContextLines = wantsContextLine(source.kind) ? await priorContextLinesFor(cfg, guard, ids) : null
      for (const [offset, piece] of batch.entries()) {
        const seq = from + start + offset
        const chunkId = ids[offset]
        const vector = vectors[start + offset]
        // DOCUMENTS ONLY (`wantsContextLine`) — the owner's own spend ruling,
        // not a code-path a chat or mail piece can reach. `line || null` so a
        // model failure (`contextLineFor`'s own honest empty string) stores as
        // NULL rather than "", which is what lets the NEXT sweep retry it
        // instead of treating an empty sentence as done forever. The spend
        // itself is folded into `contextLineUsage` (never on the reused-line
        // branch, which spent nothing) and written once, below, after the
        // whole call finishes — see that write's own comment for why.
        const prior = priorContextLines?.get(chunkId)
        let contextLine: string | null = null
        if (priorContextLines) {
          if (prior && prior.text === piece.text && prior.contextLine) {
            contextLine = prior.contextLine
          } else {
            const spent = await contextLineFor(env, { sourceTitle: source.title, piece: piece.text })
            contextLineUsage = addTokens(contextLineUsage, spent.usage)
            contextLine = spent.line || null
          }
        }
        // WRITING THE SAME PIECE TWICE IS NOT AN ERROR (R17's discipline, on the
        // one write in this app whose key is DERIVED rather than minted). The id
        // is `<sourceId>:<seq>`, so the same slice re-run — by a retry inside the
        // data door after a request that had already landed, by a tick that wrote
        // its chunks and died before it could record how far it got, or by a
        // second sweep started while this one is running — computes the same ids
        // and used to hit `UNIQUE constraint failed: knowledge_chunks.id`. Now it
        // overwrites, and the guard on the DO UPDATE means an IDENTICAL rewrite
        // moves zero rows and says nothing. `created_at` is deliberately not in
        // the SET list: a piece was first indexed when it was first indexed.
        // TEAM_VISIBLE RIDES ALONG FROM THE SOURCE, the same way owner_user_id
        // and compartment already do — WITHOUT this, a chunk written or
        // rewritten after 0075/0076's one-time backfill takes the column's
        // DEFAULT 0 for ever, silently, because nothing else in this statement
        // ever sets it. Copying it here is what keeps the denormalised copy a
        // copy: the moment a source's own team_visible changes, the next
        // re-index (which content or force already trigger on every write this
        // module makes) carries the new value down onto every chunk and
        // posting it owns.
        //
        // `source.owner_user_id` RIDES ALONG UNCHANGED TOO, and `labelsFor`'s
        // own header (below) is the one place that says what it MUST be once a
        // fold merges more than one private sighter — read it before writing
        // that merge. A stale single value copied here would exclude a
        // legitimate colleague from this very candidate pool with no
        // downstream fence able to rescue it.
        //
        // SPEAKER/SAID_AT RIDE FROM THE PIECE ITSELF (tracker `a-pieces`) — both
        // null for an ordinary document chunk, both non-null for one that came
        // out of `expandGrainPieces` (`knowledge_sources.grain_pieces`, 0081).
        // This is the fix for the bug that named this tracker item: the
        // migration added the columns, nothing ever wrote them, and 3,954
        // chunks sat with all three grain columns empty.
        // CONTEXT_LINE is computed above, DOCUMENTS ONLY, keyed on the piece's
        // own text so an unchanged chunk never re-spends (see the comment on
        // `priorContextLines` above the loop).
        statements.push(
          `INSERT INTO knowledge_chunks (id, source_id, compartment, owner_user_id, team_visible, seq, text, speaker, said_at, context_line, embedding, created_at) VALUES (${sqlString(chunkId)}, ${sqlString(sourceId)}, ${sqlString(source.compartment)}, ${sqlString(source.owner_user_id)}, ${source.team_visible}, ${seq}, ${sqlString(piece.text)}, ${sqlString(piece.speaker)}, ${sqlString(piece.saidAt)}, ${sqlString(contextLine)}, ${sqlString(vector ? encodeEmbedding(vector) : null)}, ${sqlString(now)})
             ON CONFLICT (id) DO UPDATE SET compartment = excluded.compartment, owner_user_id = excluded.owner_user_id, team_visible = excluded.team_visible, text = excluded.text, speaker = excluded.speaker, said_at = excluded.said_at, context_line = excluded.context_line, embedding = excluded.embedding
             WHERE knowledge_chunks.text IS NOT excluded.text OR knowledge_chunks.embedding IS NOT excluded.embedding OR knowledge_chunks.compartment IS NOT excluded.compartment OR knowledge_chunks.owner_user_id IS NOT excluded.owner_user_id OR knowledge_chunks.team_visible IS NOT excluded.team_visible OR knowledge_chunks.speaker IS NOT excluded.speaker OR knowledge_chunks.said_at IS NOT excluded.said_at OR knowledge_chunks.context_line IS NOT excluded.context_line;`
        )
        // THE FRESH POSTING — read back AFTER the row above has written the new
        // text, same rowid (an UPDATE never changes SQLite's own rowid, only a
        // DELETE+INSERT would), new words.
        statements.push(
          `INSERT INTO knowledge_chunks_fts(rowid, text) SELECT rowid, text FROM knowledge_chunks WHERE id = ${sqlString(chunkId)};`
        )
        if (vector) upserts.push({ id: chunkId, values: vector, labels: { ...labels, level: "chunk" } })
      }
      await d1ExecScript(cfg, guard.databaseId, statements.join("\n"))
    }

    await upsertVectors(env, guard, upserts)
    from += slicePieces.length
    await d1Query(cfg, guard.databaseId, "UPDATE knowledge_sources SET indexed_chunks = ?, indexed_at = ? WHERE id = ?", [
      from,
      now,
      sourceId,
    ])
  }

  // THE SUMMARY VECTOR — the record's own cover, written once the material has
  // started going in. It is what the router searches before it searches
  // anything, so a record with no summary is a record the router cannot prefer;
  // it is still perfectly findable through its chunks.
  if (restart && source.summary) {
    const [summaryVector] = await embed(env, [`${source.title}\n\n${source.summary}`])
    if (summaryVector) {
      await upsertVectors(env, guard, [
        { id: recordVectorId(sourceId), values: summaryVector, labels: { ...labels, level: "record" } },
      ])
      await d1Query(cfg, guard.databaseId, "UPDATE knowledge_sources SET summary_embedding = ? WHERE id = ?", [
        encodeEmbedding(summaryVector),
        sourceId,
      ])
    }
  }

  // THE HASH IS THE "DON'T DO THIS AGAIN" FLAG, and it is only trusted together
  // with `indexed_chunks`. If the model was down, this source is chunked but has
  // no vectors — blanking the hash is what makes the next sweep pick it up again
  // instead of skipping it forever as "unchanged". Self-healing without a repair
  // door anybody has to remember.
  // ...AND IT MUST NOT FIRE ON A CARD. A card has no embedded chunks by design,
  // which this self-heal reads as failure — so without the guard the sweep
  // blanks every card's hash, re-reads and re-writes all of them on every tick,
  // for ever, and counts a failed attempt each time. Silent, indistinguishable
  // from ordinary sweep activity, and it spends against a cap the owner has
  // already cut once.
  if (!card) {
  const embedded = await d1Query<{ n: number }>(
    cfg,
    guard.databaseId,
    "SELECT COUNT(*) AS n FROM knowledge_chunks WHERE source_id = ? AND embedding IS NOT NULL",
    [sourceId]
  )
  // …AND THE ATTEMPT IS COUNTED HERE, in the same branch, because this is the
  // one place that knows the difference between "indexed" and "indexed with no
  // vectors". Blanking the hash is what makes the next sweep retry; the counter
  // is what stops that retry being for ever (EMBED_ATTEMPT_CAP — a source that
  // fails repeatably was costing a model call every fifteen minutes and writing
  // the same error row each time). One statement either way, on the path that
  // already writes one.
  if (!(embedded[0]?.n ?? 0))
    await d1Query(
      cfg,
      guard.databaseId,
      "UPDATE knowledge_sources SET content_hash = NULL, embed_attempts = embed_attempts + 1 WHERE id = ?",
      [sourceId]
    )
  // A source that DID embed starts again from zero, so a run of transient
  // failures followed by a success cannot leave a source one wobble away from
  // being given up on months later.
  else if (source.embed_attempts > 0)
    await d1Query(cfg, guard.databaseId, "UPDATE knowledge_sources SET embed_attempts = 0 WHERE id = ?", [
      sourceId,
    ])
  }

  // CONTEXT-LINE SPEND, LOGGED — the hub's own ruling: a spend that never
  // reaches agent_usage_log is a spend nobody can audit, and this is the
  // ledger the owner's cost questions get answered from. ONE ROW for the
  // whole call (`addTokens`'s own doctrine, "the row is per COMMAND"), only
  // when something was actually spent — a reused-line tick writes nothing,
  // same as an ordinary hash-skip writes nothing.
  //
  // `credits: 0` ON PURPOSE. `credits` meters a TEAM's own daily/monthly AI
  // allowance (`consumeAiUnit`/`FREE_DAILY`) — the thing a person reads as
  // "25 left today". Ingestion is not a feature a team invoked; it is
  // rebuild infrastructure the owner is paying for directly, tracked at the
  // account level (COSTS.md, the $5 BUILD-5 cap, `scripts/ai-spend.mjs`) —
  // so this row is real, auditable SPEND with zero metered UNITS, exactly as
  // `UsageSource`'s own doctrine distinguishes the two.
  //
  // NO SIGNED-IN ACTOR — a scheduled sweep tick has nobody logged in, the
  // same reason `knowledge-ingest.ts`'s own retirement flows stamp
  // `brand.name` rather than a person's. `agent_usage_log.actor_id` is
  // nullable for exactly this shape; `Actor.id` itself is not (every other
  // caller is a real person), so this is the narrowest way to say "the app
  // did this" without widening a type every other call site depends on.
  if (wantsContextLine(source.kind) && contextLineUsage !== NO_TOKENS)
    await logUsage(
      env,
      guard.teamId,
      { id: "system", email: "", name: brand.name },
      0,
      "free",
      `Knowledge base: context lines for "${source.title}"`.slice(0, 140),
      "action",
      contextLineUsage
    )

  return { total, indexed: from, done: from >= total }
}

/** ONE SOURCE'S FAILURE IS ONE SOURCE'S — the same sentence the Google readers
 * learnt on 9 Sep 2026, one layer further in, and on a much wider population.
 *
 * ── WHAT WAS WRONG ──────────────────────────────────────────────────────────
 *
 * `indexSource` was awaited at three points in the loop below with NO catch
 * around any of them, so anything it threw for ONE source — a Vectorize upsert
 * refused, a D1 write that would not take that row's text, a sub-request budget
 * reached on an awkward document — escaped the loop, escaped `sweepKind`, and
 * landed in `sweepKinds`' catch, which recorded a fact about one document as the
 * failure of the WHOLE KIND. The tick's remaining sources were never reached,
 * the pass was discarded, and the kind sat red until it next had a completely
 * clean run.
 *
 * `embed()` catches its own model failures, which is why this stayed invisible:
 * the common failure was already handled, so the loop LOOKED protected. It was
 * protected against exactly one thing.
 *
 * ── WHY IT MATTERS MORE THAN THE GOOGLE ONE ─────────────────────────────────
 *
 * The Google fix was about READING from Google, so it reached the four Google
 * lanes. This is the INDEXING step, which every kind goes through — tickets,
 * stories, meetings, processes, people, and every file a person uploads through
 * the app by hand. The owner asked whether the skip-and-continue rule covered
 * the manual uploads too. It did not. It does now, and it covers them by
 * construction rather than by four more copies of a catch.
 *
 * ── WHAT IT DELIBERATELY DOES NOT SWALLOW ───────────────────────────────────
 *
 * The repair write is NOT wrapped. If the database itself is unreachable, this
 * catch cannot record anything either, and that throw propagates and fails the
 * lane — which is correct: "one document is awkward" and "the database is gone"
 * must not come back as the same sentence, and the second is one somebody has to
 * be told about. The failing case chooses honestly between them without anybody
 * having to enumerate error codes.
 *
 * ── AND IT CANNOT LOOP FOR EVER — EXCEPT FOR THE ONE FAILURE THAT MUST NOT COUNT ──
 *
 * It bumps `embed_attempts`, the counter the loop below ALREADY consults against
 * `EMBED_ATTEMPT_CAP`, so a source that fails repeatably is given up on and
 * reported once, exactly as a repeatably-unembeddable one is — and is picked up
 * again the moment its text changes, because the upsert clears the counter. It
 * also blanks `content_hash`, so a source that threw halfway through is re-read
 * rather than skipped as unchanged.
 *
 * BUT NOT WHEN GOOGLE'S ANSWER WAS "TOO MANY REQUESTS" (`isVectorizeRateLimited`
 * below). Measured on staging: 38 sources from one burst during the mass
 * rebuild, `VECTOR_UPSERT_ERROR`/`VECTOR_DELETE_ERROR (code = 40041)`, every
 * one of them Cloudflare rate-limiting THIS ACCOUNT, none of them the text
 * being unembeddable. `EMBED_ATTEMPT_CAP` exists to stop paying for a
 * document the model will never accept; a burst of 429s is a fact about the
 * INFRASTRUCTURE at that instant, not about any one of the 38 documents, and
 * counting it toward the same budget means five unlucky seconds during one
 * rebuild can permanently give up on a source that was never actually asked
 * a question it couldn't answer. The five-year backfill (migration 0082) is
 * exactly this shape of burst and there will be another one — a rate-limited
 * attempt must cost nothing toward the give-up counter, for ever, not just
 * for today's 38.
 *
 * Returns whether the source was indexed, so the caller's count stays true. */
export async function indexOneSource(
  env: Env,
  cfg: D1Rest,
  guard: MemberGuard,
  sourceId: string,
  opts: { force?: boolean } = {}
): Promise<boolean> {
  try {
    await indexSource(env, cfg, guard, sourceId, opts)
    return true
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e)
    console.error(`knowledge source ${sourceId} failed to index: ${reason}`)
    const bumpAttempts = isVectorizeRateLimited(e) ? "embed_attempts" : "embed_attempts + 1"
    await d1Query(
      cfg,
      guard.databaseId,
      `UPDATE knowledge_sources SET index_error = ?, content_hash = NULL, embed_attempts = ${bumpAttempts}
        WHERE id = ?`,
      [reason.slice(0, 300), sourceId]
    )
    return false
  }
}

/** GOOGLE — no, CLOUDFLARE — IS BUSY RIGHT NOW, not "this document is broken".
 * Narrow on purpose: only the exact signature Vectorize sends for its own
 * rate limit (code 40041, seen on both `upsertVectors` and `deleteVectors`
 * — `knowledge-vectors.ts`'s `twice()` already retries once with no backoff,
 * which does nothing against a sustained burst, so this is the failure that
 * reaches here after that retry has already been spent). A genuine
 * unembeddable-text failure, a network timeout, a malformed response — every
 * other shape — still counts toward `EMBED_ATTEMPT_CAP` exactly as before. */
export function isVectorizeRateLimited(e: unknown): boolean {
  const message = e instanceof Error ? e.message : String(e)
  return message.includes("code = 40041") || /too many requests/i.test(message)
}

/** THE ONE EXPRESSION THAT DECIDES "IS THIS SOURCE ACTUALLY BROKEN" —
 * measured against the raw `index_error IS NOT NULL` count and found to
 * overstate it roughly twelve to one (38 raw vs. 3 real, staging, 11 Sep
 * 2026): most rows that ever hit a Vectorize 429 finished chunking and
 * embedding in full either before or after the one call that threw (see
 * `clearIndex`'s own header for the DELETE-before-chunk-count-write ordering
 * that makes a fully-embedded row able to carry a leftover error at all), so
 * `index_error IS NOT NULL` alone answers "did an attempt ever fail", not
 * "is anything actually missing".
 *
 * A row is unhealthy if it has an error AND (it produced no chunks at all)
 * OR (fewer chunks are embedded than exist) OR (it is a card whose only
 * vector — the record/summary one that makes it ROUTABLE — never landed).
 * `deactivated_at` is deliberately NOT checked here — the caller decides
 * whether a retired row should count, because the count on a screen and the
 * revisit pass want different answers to that (a retired row needs no more
 * attempts; a badge should not carry it as unread work at all).
 *
 * USED IN EXACTLY THREE PLACES, on purpose, per the hub's own condition: the
 * revisit pass's SELECT, the housekeeping clear below (as `NOT (…)`), and
 * `unhealthySourceCount` for the sweep's own status line. A fourth place
 * that re-derives this OR by hand is the bug this constant exists to make
 * impossible. */
export const UNHEALTHY_INDEX_SQL = `index_error IS NOT NULL AND (
  chunk_count = 0
  OR indexed_chunks < chunk_count
  OR (generated_only = 1 AND summary_embedding IS NULL)
)`

/** THE COUNT A SCREEN OR A STATUS LINE SHOWS — never the raw `index_error`
 * tally, which is the number this whole law exists to stop anyone reading
 * again. Excludes deactivated rows: a retired source has nothing left to
 * fix and showing it as outstanding work is its own small dishonesty. */
export async function unhealthySourceCount(cfg: D1Rest, guard: MemberGuard): Promise<number> {
  const rows = await d1Query<{ n: number }>(
    cfg,
    guard.databaseId,
    `SELECT COUNT(*) AS n FROM knowledge_sources WHERE deactivated_at IS NULL AND (${UNHEALTHY_INDEX_SQL})`
  )
  return rows[0]?.n ?? 0
}

/** THE REVISIT PASS — what a forward-only cursor can never do on its own.
 * Two housekeeping jobs, in order, because they need different oracles and
 * one of them costs nothing:
 *
 *   1. CLEAR THE FALSE ALARMS, no Vectorize call, no model call — a source
 *      with an error that `UNHEALTHY_INDEX_SQL` does not recognise as broken
 *      is, by definition, fully chunked and fully embedded (or a card with
 *      its record vector already in place). There is nothing left to write,
 *      so the honest fix is a bare UPDATE, not a wasted re-index.
 *   2. RETRY THE REAL ONES, bounded (`INDEX_REVISIT_LIMIT`, R14) and
 *      respecting `EMBED_ATTEMPT_CAP` exactly as the ordinary sweep does —
 *      `isVectorizeRateLimited` failures never advanced that counter, so a
 *      row sitting at the cap here genuinely failed for a reason unrelated
 *      to a burst, and revisiting it would spend a model call on a document
 *      already shown five times to be one the model will not accept. Oldest
 *      `updated_at` first, so one dense burst cannot starve an older one. */
export async function revisitUnhealthySources(
  env: Env,
  cfg: D1Rest,
  guard: MemberGuard,
  limit = INDEX_REVISIT_LIMIT
): Promise<{ cleared: number; revisited: number; recovered: number }> {
  const cleared = await d1Query<{ id: string }>(
    cfg,
    guard.databaseId,
    `UPDATE knowledge_sources SET index_error = NULL
      WHERE index_error IS NOT NULL AND NOT (${UNHEALTHY_INDEX_SQL})
      RETURNING id`
  )
  const rows = await d1Query<{ id: string }>(
    cfg,
    guard.databaseId,
    // R14: bounded by INDEX_REVISIT_LIMIT.
    `SELECT id FROM knowledge_sources
      WHERE deactivated_at IS NULL AND (${UNHEALTHY_INDEX_SQL}) AND embed_attempts < ${EMBED_ATTEMPT_CAP}
      ORDER BY updated_at ASC LIMIT ${limit}`
  )
  let recovered = 0
  for (const row of rows) if (await indexOneSource(env, cfg, guard, row.id)) recovered++
  return { cleared: cleared.length, revisited: rows.length, recovered }
}

/** THE LABELS ON EVERY VECTOR A SOURCE PRODUCES — the notebook it belongs to,
 * built in ONE place so a chunk and its record's summary can never disagree
 * about whose material they are. Every key is present on every vector, because
 * Vectorize has no "is null": an absent key is a hole in every filter, so
 * "nothing here" has a spelling of its own.
 *
 * ── WHAT `owner` MUST BE, ONCE A SOURCE HAS MORE THAN ONE PRIVATE SIGHTER ──
 *
 * `source.owner_user_id ?? TEAM_SHELF` is correct only because `owner_user_id`
 * is trusted, by construction, to name AT MOST ONE PERSON — or nobody, which is
 * NULL and reads here as team-wide. The moment a fold merges two or more
 * DISTINCT PRIVATE sightings into one source (the calendar fold's own shape —
 * measured on staging, every one of its 27 multi-sighted events is private,
 * seen by more than one person, no team sighting), no single value can name
 * them all, and the whoever writes that merge MUST set `owner_user_id = NULL`
 * on the source, DELIBERATELY, rather than leave it at whatever the last
 * ingest reader to run happened to write.
 *
 * GET THIS WRONG AND NOTHING DOWNSTREAM CAN RESCUE IT. `ownerClause`
 * (knowledge.ts, above) decides the real answer from live sightings and cannot
 * be widened by a stale `owner_user_id` — but it only ever sees a source
 * Vectorize's own ANN search already returned as a CANDIDATE. A chunk labelled
 * `owner: <one stale person's id>` is excluded from every OTHER sighted
 * colleague's search at THIS layer, before `ownerClause` is ever consulted —
 * a false refusal with no correct read-back to appeal to, because a vector
 * Vectorize never returns as a candidate never reaches it. `NULL` is the only
 * honest value once one column can no longer name the truth: over-inclusive at
 * the narrowing stage (R26's own bargain — a wrong label costs a relevant
 * passage its ranking slot, never a caller an answer they should never have
 * had), and correctly decided, for real, at the read-back through
 * `ownerClause`. This is not written here as documentation of a decision
 * already made — the fold-merge writer that must make it does not exist yet. */
function labelsFor(source: {
  kind: string
  compartment: string
  account_id: string | null
  app_id: string | null
  ticket_id: string | null
  sprint_id: string | null
  record_date: string | null
  created_at: string
  owner_user_id: string | null
  shared_with: string
}): VectorLabels {
  const when = Date.parse(source.record_date ?? source.created_at)
  return {
    level: "chunk",
    compartment: source.compartment,
    owner: source.owner_user_id ?? TEAM_SHELF,
    kind: source.kind,
    account: source.account_id ?? NONE,
    app: source.app_id ?? NONE,
    ticket: source.ticket_id ?? NONE,
    sprint: source.sprint_id ?? NONE,
    date: Number.isFinite(when) ? Math.floor(when / 1000) : 0,
    shared: source.shared_with,
  }
}

/* ------------------------------- the router ------------------------------- */

/** Which slice of the knowledge base a question is answered from, WHY, and which
 * records to prefer inside it.
 *
 * The reasoning is the product: the owner's complaint about the tools he uses
 * today is that he has to KEEP a notebook per project by hand. So nobody picks a
 * compartment here — it is derived from where the asker is standing, from what
 * they said, and from what the records themselves say they are about; and the
 * answer carries the sentence explaining the choice, so a wrong one is visible
 * instead of mysterious.
 *
 * `compartments` empty means "no narrowing" — the whole knowledge base the
 * caller may read. That is the honest answer to a question that names no client. */
export type CompartmentChoice = {
  compartments: string[]
  reason: string
  /** the records this question looks like it is about, best first. It rides the
   * ANSWER and never the ranking (see §3 in the header) — a wrong guess here is
   * something a reader can disagree with, not something that hid the passage. */
  records: { sourceId: string; title: string }[]
}

async function deriveCompartment(
  cfg: D1Rest,
  guard: MemberGuard,
  input: { question: string; accountId?: string | null }
): Promise<{ compartments: string[]; reason: string }> {
  // 1. THE RECORD THEY ARE STANDING ON wins. If the caller asked from a client's
  //    screen (or a tool passed that client's id), that is not a guess.
  if (input.accountId) {
    const named = await accountById(cfg, guard, input.accountId)
    if (named)
      return {
        compartments: [accountCompartment(named.id), AGENCY_COMPARTMENT],
        reason: `You asked from ${named.name}'s record, so I searched ${named.name}'s material and the agency's own.`,
      }
  }
  // 2. THE QUESTION NAMES ONE OR MORE CLIENTS. Matched on each account's own
  //    name and reference, confirmed word by word (below) so "new" cannot
  //    match "Newton Ltd" — and ALL of them widen the search, not just the
  //    first found (BUILD-5's deterministic fan-out: "compare BERG's ticket
  //    volume to HOGO's" used to search whichever name sorted longest and
  //    silently drop the other).
  const named = await accountsNamedIn(cfg, guard, input.question)
  if (named.length === 1)
    return {
      compartments: [accountCompartment(named[0].id), AGENCY_COMPARTMENT],
      reason: `The question names ${named[0].name}, so I searched ${named[0].name}'s material and the agency's own.`,
    }
  if (named.length > 1) {
    const names = named.map((a) => a.name)
    const list = names.length === 2 ? names.join(" and ") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
    return {
      compartments: [...named.map((a) => accountCompartment(a.id)), AGENCY_COMPARTMENT],
      reason: `The question names ${list}, so I searched all of their material and the agency's own.`,
    }
  }
  // 3. NOTHING NAMED. Search everything — a question about our own process has
  //    no client in it, and neither does a vague one.
  return {
    compartments: [],
    reason: "The question named no client, so I searched the whole knowledge base.",
  }
}

/** The full route: the compartment decision above, plus the record-level
 * preference that only a vector search can give. */
async function deriveRoute(
  env: Env,
  cfg: D1Rest,
  guard: MemberGuard,
  input: { question: string; accountId?: string | null; asked: number[] | null }
): Promise<CompartmentChoice> {
  const choice = await deriveCompartment(cfg, guard, input)
  if (!input.asked || !hasVectorStore(env)) return { ...choice, records: [] }

  // THE COVERS, READ FIRST. One query over the record summaries — a few hundred
  // short vectors, never the material — narrowed to whatever the compartment
  // decision already settled.
  const hits = await searchVectors(
    env,
    guard,
    input.asked,
    { level: "record", ...compartmentFilter(choice.compartments) },
    ROUTER_TOP_RECORDS
  )
  // THE REASONING IS HELD TO THE SAME FLOOR AS THE ANSWER. A vector search always
  // returns a nearest neighbour, and this one had no floor at all — so the
  // sentence that rides every answer said "it reads like a question about X, Y,
  // Z" for EVERY question, including the ones the base has nothing on. Asked
  // "what is the capital of France?", the app's own documents come back at 0.32
  // and the reader was told the question was about three of them, next to a
  // refusal. Under R23 the reasoning is part of the answer, so it cannot assert a
  // subject on evidence the answer itself would throw away.
  const near = hits.filter((h) => h.score >= numberVar(env.KNOWLEDGE_MIN_SCORE, MIN_VECTOR_SCORE))
  if (!near.length) return { ...choice, records: [] }
  // In the order the SEARCH put them, best first. Reading them back off the Map
  // handed them over in whatever order the database returned, so "best first" —
  // which is what the sentence claims — was a coincidence of row order.
  const ids = near.map((h) => h.id.replace(/:summary$/, ""))
  const titles = await sourceTitles(cfg, guard, ids)
  const records = ids.flatMap((sourceId) => {
    const title = titles.get(sourceId)
    return title ? [{ sourceId, title }] : []
  })
  return {
    ...choice,
    records,
    reason: records.length
      ? `${choice.reason} It reads like a question about ${records.map((r) => `"${r.title}"`).join(", ")}.`
      : choice.reason,
  }
}

/** The compartment decision, as a vector filter. Empty means no narrowing. */
function compartmentFilter(compartments: string[]): VectorFilter {
  return compartments.length ? { compartment: { $in: compartments } } : {}
}

async function accountById(
  cfg: D1Rest,
  guard: MemberGuard,
  id: string
): Promise<{ id: string; name: string } | null> {
  const rows = await d1Query<{ id: string; name: string }>(
    cfg,
    guard.databaseId,
    "SELECT id, name FROM accounts WHERE id = ? LIMIT 1",
    [id]
  )
  return rows[0] ?? null
}

/** The titles of a handful of sources, for the sentence the router says out
 * loud.
 *
 * FENCED WITH `readerClause`, BOTH HALVES, AND THE REASON IS THE WHOLE POINT.
 * This used to say "fenced like every other read here" while using
 * `ownerClause` alone — a comment asserting a property the code did not have.
 * Every OTHER read here is `readerClause` (owner AND app); this one was the
 * exception and its own comment hid that.
 *
 * What it cost: an app-restricted source's TITLE and its EXISTENCE reached a
 * colleague who is not on that app, through the router's `reason` sentence and
 * its `records` — while `found` was correctly false and no passage or citation
 * leaked. The content fence held; the sentence ABOUT the content did not. R23
 * makes the reasoning part of the answer, so a fence the reasoning does not
 * honour is not a fence.
 *
 * WHY THIS ONE AND NOT `nameArm`, which also narrows with the owner half alone:
 * `nameArm` produces CANDIDATES that must still cross the full-fence read-back
 * before they can become an answer, which is R26's bargain — the index narrows,
 * the team's database decides. These titles cross nothing. They go straight into
 * a sentence a person reads. */
async function sourceTitles(
  cfg: D1Rest,
  guard: MemberGuard,
  ids: string[]
): Promise<Map<string, string>> {
  if (!ids.length) return new Map()
  const owner = readerClause(guard)
  const rows = await d1Query<{ id: string; title: string }>(
    cfg,
    guard.databaseId,
    // R14 hard cap: `ids` is at most ROUTER_TOP_RECORDS, and the LIMIT says so
    // at the statement. The ids are ULIDs this worker wrote and read back, never
    // anything off a request, so they are interpolated like every other
    // server-owned value (CONVENTIONS) and the statement binds one parameter.
    `SELECT id, title FROM knowledge_sources
      WHERE id IN (${ids.map((id) => sqlString(id)).join(", ")}) AND ${owner.sql} AND deactivated_at IS NULL
      LIMIT ${ROUTER_TOP_RECORDS}`,
    owner.params
  )
  return new Map(rows.map((r) => [r.id, r.title]))
}

/** IS THIS TOKEN RARE ENOUGH TO MEAN SOMETHING ON ITS OWN — the same question
 * `EXACT_TERM_MAX_CHUNKS` already answers for the lexical arm's rare-token
 * bypass, asked here for `accountsNamedIn` instead of inventing a second
 * number for the same idea. UNFENCED (whole-team chunk count over FTS5),
 * because this runs BEFORE the compartment is known — narrowing to a
 * compartment is the very question this function exists to answer. */
async function isRareTerm(cfg: D1Rest, guard: MemberGuard, term: string): Promise<boolean> {
  const rows = await d1Query<{ n: number }>(
    cfg,
    guard.databaseId,
    "SELECT COUNT(*) AS n FROM knowledge_chunks_fts WHERE knowledge_chunks_fts MATCH ?",
    [`"${term}"`]
  )
  return (rows[0]?.n ?? 0) <= EXACT_TERM_MAX_CHUNKS
}

/** The account a question names, or null. Reads `knowledge_names` (0073)
 * rather than the raw `accounts` table — see `rebuildNameIndex` for why.
 *
 * KB-AUDIT.md §4.2: "VU Solutions" → "solutions", "re-green" → "green",
 * "DEMO" → "demo" — 26 of 134 staging accounts have a single-token name, and
 * the token is often an ordinary English word, so "what solutions have we
 * proposed for data import?" used to silently narrow to VU Solutions. TWO
 * WAYS a candidate may still win: its name is ≥2 tokens, every one of them
 * present in the question (two specific words appearing together is not a
 * coincidence the way one common word is); or it is a single token that is
 * RARE across the corpus (`isRareTerm`) — "Paddlebase" and "Asekurans" are
 * still one token each, and still have to resolve. An ALIAS (the account's own
 * `code`, e.g. BERG) bypasses both: a code is chosen to be a short,
 * unambiguous handle on purpose, so an exact match is evidence on its own,
 * exactly as it was before this function moved off `accounts.code`. */
/** How many DISTINCT accounts one question may name before the compartment
 * search widens to all of them. BUILD-5-knowledge-rebuild.md's own fan-out
 * ceiling ("hard cap 12"), reused here rather than a second number invented
 * for the same idea — asking about more than a dozen clients in one
 * question is pathological, and the cap exists as a sanity ceiling rather
 * than a cost one (a compartment is a free extra value in one `IN (...)`
 * clause, not a second search). */
const NAMED_ACCOUNTS_CAP = 12

/** EVERY account the question names, not just the first — the deterministic
 * half of BUILD-5's "fan-out": a question naming two or more clients widens
 * the compartment search to all of them rather than picking one arbitrarily
 * (the router's `ORDER BY LENGTH(name) DESC` used to mean "the longest name
 * wins", silently dropping every other one it found). Same anti-hijack rules
 * as a single match — a name has to be ≥2 tokens or a corpus-rare single one,
 * or match a code exactly — applied to every candidate rather than stopping
 * at the first that passes.
 *
 * NOT A MODEL CALL, ON PURPOSE. This is the SAFE half of fan-out: detecting
 * multiple NAMED, REAL entities the team already holds records for, which is
 * a lookup against data rather than a judgment about language. It says
 * nothing about a genuinely ambiguous multi-part question with no named
 * entity in it ("compare what we agreed in March to what we agreed in July")
 * — that case needs either a heuristic nobody has measured yet or a real
 * model call, and is deliberately left alone here rather than shipped on a
 * guess (see `retrieve`'s own header for where that stands).
 *
 * EXPORTED (10 Sep 2026, tracker `b-filing`) FOR A SECOND CALLER: a Drive
 * folder or Chat space's own NAME is free text exactly like a question is —
 * `tokenise`/`questionTerms` already say so ("the SAME function reads a
 * question, which is the point") — so naming an account from it reuses this
 * function rather than a second matcher. The parameter is still called
 * `question` because renaming it to satisfy a caller that doesn't ask one
 * would be the tail wagging the dog; what matters is that a name is text and
 * this reads text. */
export async function accountsNamedIn(
  cfg: D1Rest,
  guard: MemberGuard,
  question: string
): Promise<{ id: string; name: string }[]> {
  const terms = questionTerms(question, 8)
  if (!terms.length) return []
  const clauses = terms.map(() => `LOWER(name) LIKE ? ESCAPE '\\'`)
  const params = terms.map((t) => `%${likeLiteral(t)}%`)
  const candidates = await d1Query<{ ref_id: string; name: string; alias_of: string | null }>(
    cfg,
    guard.databaseId,
    // R14 hard cap: NAMED_ACCOUNTS_CAP × 2, not NAMED_ACCOUNTS_CAP itself — a
    // real bug, found by a mutation-proof test (d-fanout) rather than assumed
    // fixed by the loop below: this statement's own LIMIT used to be a bare
    // 10, predating NAMED_ACCOUNTS_CAP (12), which made the cap UNREACHABLE —
    // the candidate ROWS ran out two short of the cap's own number, silently,
    // on every question naming that many real accounts. Doubled rather than
    // set to exactly 12: not every candidate row passes the match-confirmation
    // below (a token-subset check, a rarity check), so fetching exactly the
    // target count would silently under-fill again the first time one
    // candidate failed to confirm.
    `SELECT ref_id, name, alias_of FROM knowledge_names
      WHERE kind = 'account' AND (${clauses.join(" OR ")})
      ORDER BY LENGTH(name) DESC LIMIT ${NAMED_ACCOUNTS_CAP * 2}`,
    params
  )
  const asked = new Set(terms)
  const found: { id: string; name: string }[] = []
  const seen = new Set<string>()
  for (const c of candidates) {
    if (found.length >= NAMED_ACCOUNTS_CAP) break
    let match: { id: string; name: string } | null = null
    // AN ALIAS ROW (today, always the account's code) — exact match or nothing,
    // no token-count/rarity gate. `alias_of` carries the canonical name back.
    if (c.alias_of) {
      if (asked.has(c.name.toLowerCase())) match = { id: c.ref_id, name: c.alias_of }
    } else {
      const nameTerms = [...tokenise(c.name).keys()]
      if (nameTerms.length && nameTerms.every((t) => asked.has(t))) {
        if (nameTerms.length >= 2 || (await isRareTerm(cfg, guard, nameTerms[0])))
          match = { id: c.ref_id, name: c.name }
      }
    }
    // DEDUPED BY ACCOUNT, not by row: the same account's canonical name and
    // its code can both match one question ("BERG, the Bergman account…"),
    // and that is one account named twice, not two.
    if (match && !seen.has(match.id)) {
      seen.add(match.id)
      found.push(match)
    }
  }
  return found
}

/** Rebuilds `knowledge_names` (0073) — THE NAME INDEX `accountsNamedIn` reads.
 *
 * READ STRAIGHT OFF `accounts` AND `apps`, not off `knowledge_sources`. The
 * first draft of this function derived names from the SWEPT mirror instead —
 * simpler, one shape for every kind — and it broke the one thing this table
 * exists to fix: an account that exists but has nothing indexed about it yet
 * (a brand-new client, or a team the sweep has not reached) would have NO
 * candidate row at all, so a question naming it correctly would route as
 * "named no client" — the exact silent failure KB-AUDIT.md §4.2 is about,
 * moved rather than fixed. `accounts` and `apps` are foundational tables that
 * exist the moment a record does, independent of indexing, which is what
 * `accountsNamedIn`'s ORIGINAL implementation relied on by reading them
 * directly; this keeps that guarantee.
 *
 * `contact`/`person` kinds are left to grow this table later (the migration's
 * own comment names them as in scope) — `nameArm` already has a working,
 * independently-tested route to colleagues (`knowledge_sources kind='person'`
 * directly), so nothing in this build regresses by their absence here.
 *
 * ALIASES: an account's own `code` (BERG, HOGO) is one, generated, because it
 * is DATA the app already holds, not a guess. `alt_names` (0083, c-misspell)
 * is the second — a JSON array of spellings a PERSON declared, never a
 * generated variant. This supersedes the assumption this comment used to
 * make: that misspelling coverage needed a model call to GUESS variants
 * (BUILD-5 §3's $0.10 price for exactly that). Measured on staging, 11 Sep
 * 2026: "Paddlebase"/"Asekurans" are not typos a distance metric would catch
 * near "Padelbase"/"Assecuranz" — they are the owner's own STABLE spelling of
 * a word, and the hub ruled a curated alias beats a fuzzy one: an
 * edit-distance or phonetic net would also catch unrelated words (this
 * codebase already refuses that shape twice elsewhere, by name), where a
 * declared spelling can never match anything it wasn't written for. Both
 * kinds of alias row are read identically below (exact match, no rarity
 * gate — a human already decided this one), and both are SINGLE TOKENS only:
 * the confirmation match is `asked.has(alias)` against the question's own
 * tokenised words, so a multi-word alias could never appear as one of them.
 * A canonical name with no alias at all is still fully usable:
 * `accountsNamedIn`'s multi-token and rare-single-token rules both read it
 * alone, and a client whose accepted name IS a single ordinary word (the
 * audit's own "green"/"solutions" cases) still resolves once it clears the
 * rarity floor — no alias required for either path.
 *
 * A FULL REBUILD, NOT AN UPSERT. The population is a few hundred rows at
 * most (every live account and app this team holds), so deleting and
 * reinserting is simpler than an upsert keyed on `(kind, ref_id, name)` —
 * which cannot express a RENAME, because the old name is part of the key an
 * upsert would leave behind as an orphan row. */
export async function rebuildNameIndex(cfg: D1Rest, guard: MemberGuard): Promise<{ written: number }> {
  const accounts = await d1Query<{ id: string; name: string; code: string | null; alt_names: string | null }>(
    cfg,
    guard.databaseId,
    // R14 hard cap: bounded by how many accounts this team holds — an
    // agency's own client roster, not a growing log.
    "SELECT id, name, code, alt_names FROM accounts WHERE deactivated_at IS NULL AND name IS NOT NULL LIMIT 2000"
  )
  const apps = await d1Query<{ id: string; name: string; account_id: string | null }>(
    cfg,
    guard.databaseId,
    "SELECT id, name, account_id FROM apps WHERE deactivated_at IS NULL AND name IS NOT NULL LIMIT 2000"
  )

  type NameRow = {
    id: string
    kind: string
    ref_id: string
    name: string
    alias_of: string | null
    compartment: string
  }
  const rows: NameRow[] = []
  for (const a of accounts) {
    if (!a.name) continue
    const compartment = accountCompartment(a.id)
    rows.push({ id: ulid(), kind: "account", ref_id: a.id, name: a.name, alias_of: null, compartment })
    if (a.code)
      rows.push({ id: ulid(), kind: "account", ref_id: a.id, name: a.code.toLowerCase(), alias_of: a.name, compartment })
    // c-misspell. Declared, never generated (see this function's own doc
    // comment) — one row per spelling a person chose, read identically to
    // `code` above: exact match, no rarity gate.
    for (const spelling of parseIdList(a.alt_names ?? "[]")) {
      const clean = spelling.trim().toLowerCase()
      if (clean) rows.push({ id: ulid(), kind: "account", ref_id: a.id, name: clean, alias_of: a.name, compartment })
    }
  }
  for (const app of apps) {
    if (!app.name) continue
    rows.push({
      id: ulid(),
      kind: "app",
      ref_id: app.id,
      name: app.name,
      alias_of: null,
      compartment: app.account_id ? accountCompartment(app.account_id) : AGENCY_COMPARTMENT,
    })
  }

  const now = new Date().toISOString()
  await d1Query(cfg, guard.databaseId, "DELETE FROM knowledge_names")
  const REBUILD_BATCH = 200
  for (let i = 0; i < rows.length; i += REBUILD_BATCH) {
    const batch = rows.slice(i, i + REBUILD_BATCH)
    const statements = batch.map(
      (r) =>
        `INSERT INTO knowledge_names (id, kind, ref_id, name, alias_of, compartment, created_at) VALUES (${sqlString(r.id)}, ${sqlString(r.kind)}, ${sqlString(r.ref_id)}, ${sqlString(r.name)}, ${sqlString(r.alias_of)}, ${sqlString(r.compartment)}, ${sqlString(now)})
           ON CONFLICT (kind, ref_id, name) DO NOTHING;`
    )
    await d1ExecScript(cfg, guard.databaseId, statements.join("\n"))
  }
  return { written: rows.length }
}

/* -------------------------------- retrieval ------------------------------- */

/** THE ONE ANSWER BUILDER (Law R23). An answer with no source is not a
 * shorter answer, it is a different kind of thing — so it is built here, once,
 * and the shape makes the two cases impossible to confuse: no citations means
 * `found: false`, no passages at all, and a sentence that says so in words a
 * person can read. A door that assembled this by hand could ship half of it,
 * which is exactly how a confident, sourceless answer gets in front of a client. */
export function knowledgeAnswer(input: {
  question: string
  compartments: string[]
  reason: string
  /** what the record summaries said this question is about. Evidence for the
   * reader, never an input to the ranking (§3). */
  records: { sourceId: string; title: string }[]
  passages: KnowledgePassage[]
  candidates: number
  /** what the live rows say RIGHT NOW about the records being cited — see
   * `crossCheck`. Attached to the citation it belongs to, never to the passage:
   * the passage is what the index remembered, and these two must stay visibly
   * different things. */
  live?: Map<string, { status: string; checkedAt: string }>
  /** THE ANSWER, ALREADY WRITTEN, when somebody asked for one — composed from the
   * very passages below and nothing else (lib/knowledge-compose.ts). It arrives as
   * an INPUT rather than being produced here, which is the whole of R23 in one
   * line: retrieval still writes nothing, and the decision about whether a written
   * answer may exist is made in the same breath as `found`. No citation, no
   * passage, no answer — one decision, not three. */
  written?: string | null
  /** TRACKER `d-steps`: did the reader run on this search. Required rather
   * than defaulted here, so every call site says so explicitly — the app
   * side (`evidenceFrom`) still defaults it, because a thread saved before
   * this field existed has no opinion and false ("the floor alone decided")
   * is the honest reading of silence there. */
  reread: boolean
}): KnowledgeAnswer {
  const citations: KnowledgeCitation[] = []
  for (const p of input.passages)
    if (!citations.some((c) => c.sourceId === p.sourceId)) {
      const live = input.live?.get(p.sourceId)
      citations.push({
        sourceId: p.sourceId,
        title: p.title,
        kind: p.kind,
        url: p.url,
        // THE RECORD ITSELF, one hop past the source. Copied from the passage
        // rather than worked out again here, so the link under a passage and the
        // link under its citation can never point at different rows.
        recordPath: p.recordPath,
        liveStatus: live?.status ?? null,
        checkedAt: live?.checkedAt ?? null,
      })
    }
  const found = citations.length > 0
  const stale = citations.filter((c) => c.liveStatus)
  return {
    question: input.question,
    found,
    // Said in the assistant's own voice, because this sentence is what it must
    // repeat rather than inventing an answer around an empty result.
    message: found
      ? `${citations.length} source${citations.length === 1 ? "" : "s"} in the knowledge base answer this.${
          stale.length
            ? ` I checked the live record${stale.length === 1 ? "" : "s"} just now. Say what ${stale.length === 1 ? "it says" : "they say"} today, not what the passage says.`
            : ""
        }`
      : "The knowledge base has nothing on this. Say so plainly, do not answer from memory.",
    // A WRITTEN ANSWER CANNOT OUTLIVE ITS SOURCES. It rides the same `found` the
    // passages do, so there is no input at all — not a bug, not a caller mistake
    // — that produces confident prose with nothing behind it.
    answer: found ? (input.written ?? null) : null,
    compartments: input.compartments,
    reason: input.reason,
    records: input.records,
    passages: found ? input.passages : [],
    citations,
    candidates: input.candidates,
    reread: input.reread,
  }
}

type CandidateRow = {
  chunk_id: string
  lex: number
  /** How many of the question's RARE exact tokens this chunk contains. Zero for
   * every chunk of a question that had none, which is what keeps `fuse`'s
   * measured behaviour on an ordinary question untouched. */
  exact: number
}

/** How much of a question a chunk must actually CONTAIN before the word match
 * will call it evidence.
 *
 * The vector arm has a floor (MIN_VECTOR_SCORE) and the word arm needs one for
 * the same reason: a chunk sharing one word out of eight is not an answer, it is
 * a coincidence, and without a floor "we have nothing on that" would become
 * impossible to say the moment the word arm was allowed to run alone. Its only
 * honest unit is how many of the question's own terms are in it. */
const MIN_TERM_SHARE = 0.5

/** A question with no room in it for a SHARE. Measured on staging: "What is the
 * capital of France?" tokenises to two terms, and half of two is one — so the
 * knowledge base answered a question about France out of whatever it held that
 * said "capital", confidently, with citations. A share is a proportion, and a
 * proportion of two is not a floor; below this many terms the only honest
 * requirement is all of them. */
const SHORT_QUESTION_TERMS = 3

/** WHAT THE WORD ARM MUST SHOW TO OVERRULE A SEMANTIC SEARCH THAT FOUND NOTHING.
 *
 * `overruling` used to demand ALL of a question's terms, which is the strictest
 * thing available and was chosen because the alternative had just answered a
 * parental-leave question out of unrelated meeting notes. It holds that door
 * shut. It also shuts a door that should be open, and the case is on record:
 *
 *   "What is replacing the cartesian distance measurement for HOGO?" — REFUSED,
 *   citing nothing. The answer is in the base, in one sentence of the HOGO
 *   September sprint transcript: "integrate the Google Maps API for driving
 *   distance calculations, replacing the current cartesian measurement method".
 *   Re-ask it as "what did we decide about driving distance in the HOGO
 *   September sprint meeting?" and it answers correctly. Same fact, same
 *   source, one phrasing finds it and the other does not — which is exactly
 *   what the owner had been reporting and nobody could reproduce.
 *
 * ALL-OR-NOTHING FAILS ON ONE ABSENT WORD. "HOGO" is in that source's TITLE and
 * not in the sentence, so the chunk holding the answer carried four of five
 * terms and was thrown away.
 *
 * WHY A SHARE AND NOT A RARITY CAP, since rarity was the obvious idea and was
 * measured first: "cartesian" appears in 12 chunks of this base — but "notice"
 * is in 27 and "policy" in 75, so any cap loose enough to admit the first
 * admits the two that caused the parental-leave answer. The word-frequency
 * distribution is a Zipf tail with no break in it (65% of the vocabulary is in
 * three chunks or fewer), so every threshold is fitted to its examples.
 *
 * CO-OCCURRENCE IS THE HONEST DISCRIMINATOR. The parental-leave failure was
 * many chunks each sharing ONE common word. The cartesian case is one chunk
 * holding MOST of the question at once. That is a difference in kind, and it is
 * what this measures.
 *
 * Short questions are unchanged: below SHORT_QUESTION_TERMS the only honest
 * requirement is still all of them, for the reason above this line. */
const OVERRULE_TERM_SHARE = 0.75

/** WHY THE WORD MATCH IS RUNNING — three situations, and it may claim something
 * different in each. It used to be a boolean, and the two cases it collapsed
 * together are opposites. */
export type LexicalRole =
  /** The vector arm has evidence. This is a tenth of a vote on a list somebody
   * else decided the shape of, and cannot turn a refusal into an answer. */
  | "beside"
  /** NOBODY LOOKED. No vector store bound, the question could not be embedded,
   * or the index came back with no neighbours at all — which is what a base
   * whose material was indexed while the model was down looks like. The word
   * match really is everything we have. */
  | "blind"
  /** THE VECTOR ARM LOOKED AND FOUND NOTHING. Not ignorance: an answer. To speak
   * here is to overturn a semantic search that has already reported the base
   * holds nothing on this. */
  | "overruling"

/** HOW MUCH OF THE QUESTION A CHUNK MUST HOLD — and it is not one number,
 * because the word arm has three jobs and only one of them can lie.
 *
 * BESIDE the vector arm it is a tenth of a vote on a list the vector arm already
 * decided the shape of. It cannot turn a refusal into an answer, so a share is
 * enough and the measured 0.5 stands.
 *
 * BLIND, it decides `found` on its own — the one decision R23 is about — and a
 * short question has to be present in FULL: "capital of France" must mean a
 * chunk that says both, or the base says it has nothing. Beyond that a share,
 * because this is the case where the word match is the only reader the material
 * has and the material is really there (a note written while the model was down
 * is findable by its words alone, deliberately, and there is a test that says
 * so).
 *
 * OVERRULING, the WHOLE question, however long. Measured 27 Aug 2026 on the
 * agency's own material: "what is our parental leave policy and how much notice
 * does it need?" — a policy nobody has ever written down — put the vector arm's
 * best neighbour at 0.451 against a floor of 0.5, so it correctly found nothing.
 * The word match then cleared a proportional floor on "policy", "notice" and
 * "leave" and answered out of a page of Gemini meeting notes. A proportion is
 * the wrong instrument for overturning a search that has already answered: half
 * a question is a coincidence three words wide. The exception is the one thing
 * the word match is genuinely better at, and it is not here — a rare exact token
 * bypasses this floor entirely (see the `rare` clause in `lexicalArm`), which is
 * how "ticket 3144" still reaches its chunk under the strictest of the three.
 *
 * WHAT THIS DOES NOT TOUCH, measured against the real model (bge-m3): a question
 * the base can answer clears the VECTOR floor and is `beside`, never either of
 * the other two. Over the twenty questions in scripts/kb-bench.mjs, every one of
 * the sixteen answerable ones tops 0.502 and every one of the four unanswerable
 * ones tops 0.471 — so the only questions whose behaviour changes here are the
 * ones the vector arm had already refused. */
function termFloor(terms: number, role: LexicalRole): number {
  const share = Math.max(1, Math.ceil(terms * MIN_TERM_SHARE))
  if (role === "beside") return share
  if (role === "overruling")
    return terms <= SHORT_QUESTION_TERMS ? terms : Math.max(1, Math.ceil(terms * OVERRULE_TERM_SHARE))
  return terms <= SHORT_QUESTION_TERMS ? terms : share
}

/** HOW MANY CHUNKS A TOKEN MAY APPEAR IN AND STILL BE "EXACT".
 *
 * `termFloor` says a chunk sharing one word out of eight is a coincidence. The
 * exact-term bypass says THIS word is not a coincidence — and rarity is the only
 * honest way to tell those two apart, because both arrive as a token with a digit
 * in it. A reference identifies one thing; a year identifies a twelfth of the
 * base.
 *
 * 100 IS MEASURED, and the first number here (20) was not — it was a guess, and
 * it was wrong in the direction that matters: it silently switched the bypass OFF
 * for the very reference the bypass was built for. Ticket 3144 is discussed
 * across a dozen records — the meetings about it, their Gemini notes, the
 * calendar invitations — and lands in 56 chunks, so a cap of 20 excluded it and
 * the fix shipped green while the case it was for still failed.
 *
 * The distribution, over the 6,372 digit-bearing terms in the agency's own base
 * (27 Aug 2026), is why 100 rather than any nearby number:
 *
 *      1-20 chunks   6,321 terms      references, amounts, codes
 *     21-60             31            3144 (56) sits here
 *     61-100             5            almost nothing
 *    101-200             9            2027 (170), 2025 (265)
 *      200+              6            2026 (1,424), and format debris
 *                                     ("000z", "30pm", "2fkolkata")
 *
 * The boundary sits in the sparsest band there is, so it is not balanced on a
 * knife edge: moving it to 80 or to 120 changes which side five terms fall on.
 *
 * COUNTED IN CHUNKS RATHER THAN SOURCES, deliberately. Sources is the truer unit
 * — 3144 is 27 sources against 2026's 1,062, an even cleaner separation — but it
 * costs a join from the postings table to the chunks table inside the hot read,
 * and the chunk count separates these two populations perfectly well. If a single
 * enormous document ever makes a real reference look common, sources is the
 * upgrade, and this comment is where to start. */
const EXACT_TERM_MAX_CHUNKS = 100

/** A DIGIT-BEARING TOKEN THAT IS CALENDAR ARITHMETIC, NOT AN IDENTIFIER —
 * an ordinal day, a bare year, or a time of day. This is exactly the shape
 * the rare-exact bypass was never built for: `EXACT_TERM_MAX_CHUNKS`
 * measures STATISTICAL rarity (how many chunks mention it), and a bare
 * ordinal day is rare by CHANCE, not by MEANING — measured 11 Sep 2026 on
 * this team's own corpus, all 31 of "1st" through "31st", all 19 bare years
 * in use, and all 13 times of day sit comfortably under the 100-chunk
 * ceiling, so any one of them could singlehandedly drag an unrelated chunk
 * into an answer.
 *
 * Found the hard way: "What did Alaap discuss at dinner on the 14th?"
 * answered out of a FluClinic sprint note that happens to say "by the 14th
 * and 16th of September" — nothing else in that chunk is about a dinner, or
 * about Alaap discussing anything.
 *
 * EXCLUDED ENTIRELY, rather than required to CO-OCCUR with another question
 * term — the first fix proposed and rejected, because a co-occurrence rule
 * is defeated by exactly this shape of question: a PERSON'S OWN NAME
 * trivially co-occurs across every transcript chunk where they speak (each
 * line is prefixed "<Name>: ..."), so "alaap" would have satisfied a
 * co-occurrence requirement in every one of the six chunks that caused this
 * failure, fixing nothing. Co-occurrence also breaks a real case that must
 * keep working (`c-exact`): "task 3144" finds "Handover note" (body "3144
 * is pending gravity forms confirmation.") though the word "task" never
 * appears in it at all — the label word is semantically empty and its
 * absence must not cost the reference its bypass.
 *
 * A genuine identifier ("3144", a ticket or invoice number) is untouched:
 * it matches none of these shapes, and the existing rarity cap keeps
 * protecting it exactly as before. */
function isCalendarFragment(token: string): boolean {
  return (
    /^\d{1,2}(st|nd|rd|th)$/.test(token) ||
    /^(19|20)\d{2}$/.test(token) ||
    /^\d{1,2}(am|pm)$/.test(token)
  )
}

/** THE TOKENS SOMEBODY TYPED EXACTLY — the digit-bearing subset of the question,
 * which is the definition `questionTerms` itself already sorts by ("rarer-looking
 * words, and anything with a digit in it — a reference, a date, an invoice
 * number — first").
 *
 * NARROWER THAN `hasExactTerm` ON PURPOSE, and the two are answering different
 * questions. That one decides whether the word match RUNS beside the vector arm,
 * and a quoted phrase is good evidence that somebody wants a literal match. This
 * decides which single token may carry a chunk over the proportional floor ALONE,
 * and the words inside a quoted phrase are ordinary words: letting `forms` out of
 * "gravity forms" waive the floor would reinstate the coincidence the floor
 * exists to refuse. */
function exactTerms(question: string): string[] {
  return questionTerms(question, MAX_QUESTION_TERMS).filter((t) => /\d/.test(t))
}

/** DID SOMEBODY TYPE SOMETHING EXACT? A token with a digit in it — a ticket
 * reference, an invoice number, an error code, a date — or a phrase they put in
 * quotation marks. That, and only that, is what the word match is better at than
 * the vector, so that is the only thing it is asked about.
 *
 * The alternative (always run it, fuse the two as equals) was measured and it
 * cost nine points of recall. A gate is not timidity here; it is the difference
 * between an arm that helps on the questions it understands and one that votes
 * loudly on every question it does not. */
export function hasExactTerm(question: string): boolean {
  if (/["“][^"”]{3,}["”]/.test(question)) return true
  return questionTerms(question, MAX_QUESTION_TERMS).some((t) => /\d/.test(t))
}

/** DOES THIS QUESTION NAME ONE OF US? — the NAME ARM (R47's other half).
 *
 * THE FAULT, and it is a different one from anything the other two arms are for.
 * The owner asked staging "what is Alex's full name?" and was refused. The
 * answer was in the base: a source titled "Alexander Stadlmair" whose text says
 * he is also called Alex. Neither arm could reach it, for two different reasons
 * that happen to coincide on exactly this shape of question:
 *
 *   • THE VECTOR ARM. "What is X's full name?" embeds to something dominated by
 *     "full name", and no passage in an agency's material says "full name". The
 *     nearest neighbour was below the floor, correctly — the question is not
 *     ABOUT anything, it is a lookup.
 *   • THE WORD ARM. It runs beside the vector arm only for an EXACT token (a
 *     digit-bearing reference), and "alex" has no digit in it. With the vector
 *     arm empty the word arm may only overrule on a rare exact token, which by
 *     construction this question has none of. So it was silent by design, and
 *     the design was right for every other question.
 *
 * WHAT MAKES A NAME ANSWERABLE AND NOT A GENERAL BOOST. The base knows who its
 * own people are — that is what R47's `person` kind is — so this arm does not
 * guess whether a word is a name. It ASKS: it reads the team's own people (a
 * bounded read, fenced exactly as every other read here is) and fires only when
 * one of the question's terms is a word of somebody's name, or the beginning of
 * one. "alex" begins "alexander"; "full", "name", "leave" and "policy" begin
 * nobody. That is the whole gate, and it is why this cannot repeat the failure
 * the word arm's own header describes: a question about parental leave matches
 * no person, so this arm returns nothing and the refusal stands.
 *
 * A PREFIX, NOT A SUBSTRING, and not a nickname table. A shortening is almost
 * always the front of the name (Alex, Chris, Ana, Chila), and a substring match
 * would put "art" inside "Stuart" and "ana" inside "Johanna" — a wrong person is
 * worse than a miss here, because the answer would look perfectly well-sourced.
 * `nameSpellings` in the sweep writes the same shortenings INTO the material for
 * the word arm to find; this reaches them by the other road, which is why "Alex"
 * works even on a person whose email says nothing useful. */
async function nameArm(
  cfg: D1Rest,
  guard: MemberGuard,
  terms: string[],
  compartments: string[],
  /** The chips, if the caller narrowed. A colleague is one of the app's own
   * records, so a conversation that unticked "App records" has said it does not
   * want them — and an arm that ignored that would be the one door a chip could
   * not close. */
  kinds: string[] | null
): Promise<CandidateRow[]> {
  if (kinds && !kinds.includes("person")) return []
  const wanted = terms.filter((t) => t.length >= NAME_MIN_CHARS)
  if (!wanted.length) return []
  const owner = ownerClause(guard)
  const where = [`kind = 'person'`, "deactivated_at IS NULL", owner.sql]
  const params: string[] = [...owner.params]
  if (compartments.length) {
    where.push(`compartment IN (${compartments.map(() => "?").join(", ")})`)
    params.push(...compartments)
  }
  const people = await d1Query<{ id: string; title: string }>(
    cfg,
    guard.databaseId,
    // R14 hard cap: PEOPLE_HARD_CAP, one row per colleague.
    `SELECT id, title FROM knowledge_sources WHERE ${where.join(" AND ")} LIMIT ${PEOPLE_HARD_CAP}`,
    params
  )
  const named = people.filter((p) =>
    p.title
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .some((word) => word.length >= NAME_MIN_CHARS && wanted.some((t) => word.startsWith(t)))
  )
  if (!named.length) return []
  const rows = await d1Query<{ chunk_id: string }>(
    cfg,
    guard.databaseId,
    // R14 hard cap: bounded by the people matched, which is bounded above, and a
    // person's own source is one or two chunks.
    `SELECT id AS chunk_id FROM knowledge_chunks
      WHERE source_id IN (${named.map((p) => sqlString(p.id)).join(", ")})
      ORDER BY source_id, seq LIMIT ${LEXICAL_TOP_K}`
  )
  // `lex` and `exact` are what `fuse` reads off a candidate; this arm's rows are
  // ranked by nothing but the order they came back in, because a person either
  // is the person asked about or is not.
  return rows.map((r) => ({ chunk_id: r.chunk_id, lex: 1, exact: 1 }))
}

/** WORDS THAT SIGNAL THE QUESTION WANTS WHAT IS NEW (KB-AUDIT.md §4.5).
 * `fuse`'s own header names the bar for reopening recency: "a term that
 * applies only when the question itself says 'latest', 'recent', 'today'" —
 * and MEASURED, 10 Sep 2026, that suggestion was too loose to ship as
 * written. "today", "currently"/"current" and "this week"/"since last week"
 * all appear in ORDINARY questions this suite already exercises — "where
 * things currently stand with ticket 3144", "what is currently happening
 * with the Bergman dispatch rollout" — none of which are asking for the
 * newest material; they are asking a STATUS question using everyday
 * temporal words. Narrowed to the handful that mean "give me the newest
 * thing" and nothing else: "latest", "recent" (bare, not "recently" — the
 * adverb reads as ordinary phrasing the same way "currently" does), "newest",
 * and the two audit-measured phrasings themselves. Deliberately narrow —
 * every ordinary question is left at the behaviour the fusion weights were
 * measured on, which is the whole point of GATING on intent rather than
 * adding recency as a universal signal. */
const RECENCY_WORDS = /\b(latest|recent|newest|what'?s new|what changed)\b/i

export function hasRecencyIntent(question: string): boolean {
  return RECENCY_WORDS.test(question)
}

/** How many of the newest sources this arm offers. Small — it exists to make
 * sure the newest material is a CANDIDATE at all, not to flood the fusion
 * with everything recent regardless of relevance. */
const RECENCY_TOP_K = 8

/** THE RECENCY ARM'S VOTE — EXACT_WEIGHT's twin, the same reasoning NAME_WEIGHT
 * already borrows it for: when the question EXPLICITLY signals what it wants
 * (a name, an exact reference, or here, "the latest"), that is evidence an
 * embedding is not built to carry, and it earns the same confident weight as
 * the other two exact signals rather than a fraction of a vote. */
const RECENCY_WEIGHT = EXACT_WEIGHT

/** THE RECENCY ARM (KB-AUDIT.md §4.5). Measured, 10 Sep 2026: "what changed
 * this week?" returned ONE citation, from 31 August; the 7 September Week
 * planning (88 chunks) existed and was NEVER RETRIEVED — not ranked low,
 * ABSENT. "What are the most recent decisions we made?" was REFUSED outright.
 * The trigger `fuse`'s header names — "a question whose newest material is
 * not retrieved at all" — is met, and it is met for a structural reason no
 * fusion WEIGHT can fix: "what changed" and "most recent decisions" share no
 * words and no real meaning with any one week's specific content, so the
 * vector and lexical arms have nothing to recognise. This arm does not try to
 * recognise anything either — it asks what is NEWEST in the searched
 * compartments, plainly, and only runs when the question itself asked for
 * that (`hasRecencyIntent`). Fenced like `nameArm`: the real fence is the
 * pool's own read-back (R26), this only has to narrow the same way every
 * other arm's candidate read does. */
async function recencyArm(
  cfg: D1Rest,
  guard: MemberGuard,
  compartments: string[],
  kinds: string[] | null
): Promise<CandidateRow[]> {
  const owner = ownerClause(guard)
  const where = [owner.sql, "deactivated_at IS NULL", "record_date IS NOT NULL"]
  const params: string[] = [...owner.params]
  if (compartments.length) {
    where.push(`compartment IN (${compartments.map(() => "?").join(", ")})`)
    params.push(...compartments)
  }
  // INTERPOLATED, NOT BOUND — matching `retrieve`'s own `chipClause` a few
  // lines below, which reads this exact list the same way: a source chip key
  // resolves through `kindsForChips` against `SOURCE_CHIP_KEYS`, a fixed,
  // code-declared vocabulary (shared/knowledge-chips.ts), never free text off
  // a request. Two spellings of "bind one per element" for the same
  // server-controlled list would be a second convention for the same fact.
  if (kinds?.length) where.push(`kind IN (${kinds.map((k) => sqlString(k)).join(", ")})`)
  const sources = await d1Query<{ id: string }>(
    cfg,
    guard.databaseId,
    // R14 hard cap: RECENCY_TOP_K, said here.
    `SELECT id FROM knowledge_sources WHERE ${where.join(" AND ")}
      ORDER BY record_date DESC LIMIT ${RECENCY_TOP_K}`,
    params
  )
  if (!sources.length) return []
  // THE FIRST CHUNK OF EACH — a source's opening piece is its best single
  // representative when nothing else is narrowing which paragraph matters,
  // the same reasoning the router's own fallback read uses (`ORDER BY c.seq`
  // picking up from the start).
  const rows = await d1Query<{ chunk_id: string; source_id: string }>(
    cfg,
    guard.databaseId,
    `SELECT id AS chunk_id, source_id FROM knowledge_chunks
      WHERE source_id IN (${sources.map((s) => sqlString(s.id)).join(", ")}) AND seq = 0`
  )
  // NEWEST FIRST, in the order `sources` already put them — a chunk read has
  // no ORDER BY over an IN-list, so the rank `fuse` reads array POSITION from
  // has to be restored here rather than trusted from the statement above.
  const bySource = new Map(rows.map((r) => [r.source_id, r.chunk_id]))
  return sources.flatMap((s) => {
    const chunkId = bySource.get(s.id)
    return chunkId ? [{ chunk_id: chunkId, lex: 1, exact: 1 }] : []
  })
}

/** THE LEXICAL ARM. FTS5's own BM25 over `knowledge_chunks_fts` (0073) — one
 * keyed read, fenced by the reader and narrowed by the compartment.
 *
 * REPLACES `knowledge_terms` (KB-AUDIT.md §4.4): that table's scorer was a raw
 * term-frequency SUM with no IDF and no length normalisation — a chunk saying
 * "invoice" five times outscored one that said it once in a five-word note
 * regardless of how common "invoice" is across the corpus — and the audit's
 * "hybrid search costs nine points of recall" finding was measured against
 * that scorer, not against BM25. FTS5's `bm25()` is a real BM25 (term
 * frequency, inverse document frequency, document-length normalisation), so
 * this is now the arm that measurement should have been run against. See
 * `retrieve`'s header for the re-measured RRF weights.
 *
 * SAME SHAPE AS BEFORE, ON PURPOSE. `termFloor`'s proportional floor and the
 * exact-token bypass (`exactTerms`, `EXACT_TERM_MAX_CHUNKS`) are UNCHANGED;
 * only the source of a chunk's term coverage and its relevance number moved.
 * `fuse` never reads `.lex`'s VALUE, only the ARRAY POSITION this function
 * hands back, so nothing downstream had to change to accept a bm25 number in
 * place of a weight sum.
 *
 * ONE TERM, ONE BRANCH — BATCHED, not a single UNION ALL any more (d-lexical-
 * branch-limit). FTS5 has no "how many of these N terms does this row contain"
 * primitive the way a `GROUP BY chunk_id` over a term-postings table did, so
 * each batch of `scoped` is still a UNION ALL of one `MATCH` per term. Each
 * term is double-quoted in its MATCH string so a token that happens to
 * collide with an FTS5 operator keyword (AND/OR/NOT/NEAR) is still a literal
 * search rather than a syntax error — `tokenise()` already drops the ordinary
 * stopwords that would otherwise raise this, but a quoted term costs nothing
 * and closes the case a future stopword list forgets.
 *
 * WHY BATCHED. Measured against the live REST door, staging, 11 Sep 2026,
 * harmless `SELECT 1 AS x` branches, no table touched:
 *   4 branches OK · 5 branches OK · 6 branches REFUSED, every time:
 *   {"code":7500,"message":"too many terms in compound SELECT: SQLITE_ERROR"}
 * That is a D1 PLATFORM ceiling on compound SELECTs — UNION ALL, INTERSECT,
 * EXCEPT all count — and it is unrelated to and far below SQLite's own
 * documented default (`SQLITE_MAX_COMPOUND_SELECT` = 500). This arm's OLD
 * comment budgeted only against D1's *parameter* ceiling (~76/100 at
 * MAX_QUESTION_TERMS=24) and never mentioned this one, so every question
 * tokenising to 6+ distinct terms threw — uncaught, all the way out of
 * `retrieve` — discarding the vector arm's already-completed work with it.
 * `LEXICAL_MAX_BRANCHES` below is that measured 5, not a nearby round number:
 * see its own header for the same probe recorded beside the cap it justifies.
 *
 * THE FLOOR/RARITY DECISION ITSELF DID NOT MOVE. `termFloor` and
 * `EXACT_TERM_MAX_CHUNKS` are unchanged, called exactly as they were — this
 * arm's anti-hijack-adjacent precision gate is correctness-critical and
 * reimplementing it was refused on purpose (KB-CD hub ruling, 11 Sep 2026).
 * What moved is WHERE a chunk's total hit-count across ALL of `terms` is
 * summed: each batch's own `counted` CTE (below) is *itself* unchanged SQL,
 * it just cannot apply the real floor — a floor computed against the FULL
 * term count would wrongly reject a chunk that only clears it once every
 * batch's partial hits are added together. So each batch returns its own
 * UNFILTERED `(row_id, hits, exact)` — no `HAVING`, nothing dropped — and the
 * SUMMATION across batches (a `Map` accumulator: `hits += `, `exact += `,
 * pure arithmetic, nothing a SQL `GROUP BY … COUNT(*)` would not have
 * produced) plus the ONE `termFloor(...)` comparison happen after. The
 * threshold and its formula are untouched; only the addition that feeds it
 * now happens once in JS instead of once in a `HAVING`.
 *
 * THE FENCE IS APPLIED ONCE PER BATCH, on that batch's own union output —
 * every batch shares the same owner and compartment, so this is the same
 * "not once per branch" discipline the old comment described, now one level
 * up.
 *
 * NOTHING IS DROPPED BEFORE THE FLOOR SEES IT. Each batch's query carries no
 * `LIMIT` — every row that matched any of that batch's terms ships back, so
 * the floor (which needs the TRUE total) never loses a candidate to an
 * intermediate cut. The cost is real and stated rather than hidden: worst
 * case (24 terms, 5 batches) ships more rows over five round trips than the
 * old single compound SELECT shipped over one — bounded by how many chunks
 * match ANY of a batch's five terms, not by term count. If that ever shows up
 * as a real latency problem, the upgrade is the two-phase design this
 * function's own commit message describes and rejects for now (a new
 * multi-statement capability in shared/workers/d1-rest.ts, which every
 * worker touches — the wrong blast radius for one function today). Measure
 * it before building it.
 *
 * bm25() IS ASCENDING — SQLite's convention is a MORE NEGATIVE number for a
 * BETTER match (measured against this exact table: a chunk repeating both
 * query terms scored more negative than one containing them once each), the
 * opposite of the old `SUM(weight)`. The final sort (now in JS — see below)
 * reads `exact` DESC then `lex` ASC for the same reason the old `ORDER BY`
 * did; the array POSITION `fuse` reads is unchanged — the exact bypass still
 * leads, relevance still breaks the tie. */
export async function lexicalArm(
  cfg: D1Rest,
  guard: MemberGuard,
  terms: string[],
  /** The digit-bearing subset of `terms` — see `exactTerms`. A chunk holding one
   * of these, and rare enough for it to mean something, is evidence whatever the
   * proportional floor says. */
  exact: string[],
  compartments: string[],
  /** What this list is FOR — see `termFloor`, which is where the three jobs stop
   * being the same job. */
  role: LexicalRole
): Promise<CandidateRow[]> {
  if (!terms.length) return []
  // THE FAST CHECK, DELIBERATELY, NOT A SIGHTINGS-AWARE ONE — and this table is
  // NOT the reason `fastOwnerClause` exists (`knowledge_chunks`, unlike
  // `knowledge_terms`, carries `source_id` and would cost only a one-hop join),
  // so the choice needed its own reasoning rather than inheriting
  // `fastOwnerClause`'s own doc comment by proximity.
  //
  // THIS IS STAGE ONE OF THE LEXICAL ARM, run over every candidate BM25 matches
  // before `LIMIT LEXICAL_TOP_K` narrows it — not the tiny, R14-capped handful
  // of rows `ownerClause`'s correlated EXISTS was priced for. A precise fence
  // here buys nothing a wrong one could not also buy: whatever survives this
  // narrowing still crosses the read-back join to `knowledge_sources`
  // (`retrieve`'s `reader.sql`) before it can become an answer, and THAT join
  // is sightings-aware. R26's own bargain, restated at a third table now: the
  // index narrows, the team's database decides, and precision at the narrowing
  // stage only ever costs a relevant passage its ranking slot — never a caller
  // an answer they should never have had. See `ownerClause`'s header for the
  // measured shape this protects (the calendar fold: 100% of it multi-private,
  // no team sighting) — this arm reaches the same rows, just later.
  const owner = fastOwnerClause(guard)
  const fenceWhere = [owner.sql]
  const fenceParams: (string | number)[] = [...owner.params]
  if (compartments.length) {
    fenceWhere.push(`k.compartment IN (${compartments.map(() => "?").join(", ")})`)
    fenceParams.push(...compartments)
  }

  // THE ONE CLAUSE THAT LETS AN EXACT TERM PAST THE PROPORTIONAL FLOOR, and it
  // is absent — statement for statement, parameter for parameter — from a
  // question that has no exact term in it. The floor's measured behaviour on
  // every other question is therefore untouched by this, which is the whole of
  // what the no-exact-term case is promised.
  //
  // CALENDAR ARITHMETIC IS NOT AN IDENTIFIER (see `isCalendarFragment`'s own
  // header): a date is filtered out here, before it ever reaches `rareTerms`
  // below, so it falls back to the ordinary proportional floor like any other
  // common word rather than waiving it alone.
  const rare = exact.filter((t) => terms.includes(t) && !isCalendarFragment(t))
  // THE COMBINED QUERY, for `bm25()` alone — every branch's row set is by
  // construction a subset of what this OR-of-all-terms query matches, so the
  // read-back below can never miss a row a batch found. ONE MATCH expression,
  // however many terms — this never branches and never touches the ceiling.
  const combinedMatch = terms.map((t) => `"${t}"`).join(" OR ")

  // ONE BATCH PER ≤LEXICAL_MAX_BRANCHES TERMS. In parallel — each batch is an
  // independent read with no data dependency on any other.
  const batches: string[][] = []
  for (let i = 0; i < terms.length; i += LEXICAL_MAX_BRANCHES) batches.push(terms.slice(i, i + LEXICAL_MAX_BRANCHES))

  const batchResults = await Promise.all(
    batches.map((batchTerms) => {
      const branches = batchTerms
        .map(() => `SELECT rowid AS row_id, ? AS term FROM knowledge_chunks_fts WHERE knowledge_chunks_fts MATCH ?`)
        .join(" UNION ALL ")
      const branchParams: string[] = []
      for (const t of batchTerms) branchParams.push(t, `"${t}"`)
      const rareInBatch = rare.filter((t) => batchTerms.includes(t))

      // NO `HAVING`, NO `LIMIT` — this batch cannot know the TRUE floor
      // (computed against every term across every batch, not just its own
      // five), so it hands back every row it found, unfiltered, and the
      // floor is applied once the batches are summed. See this function's
      // own header for why that summation is arithmetic, not a
      // reimplementation of the floor itself.
      return d1Query<{ row_id: number; hits: number; exact: number }>(
        cfg,
        guard.databaseId,
        `WITH scoped AS (
           SELECT u.row_id, u.term FROM (${branches}) u
           JOIN knowledge_chunks k ON k.rowid = u.row_id
           WHERE ${fenceWhere.join(" AND ")}
         )${
           rareInBatch.length
             ? `, rareTerms AS (
           SELECT term FROM scoped WHERE term IN (${rareInBatch.map(() => "?").join(", ")})
            GROUP BY term HAVING COUNT(*) <= ${EXACT_TERM_MAX_CHUNKS}
         )`
             : ""
         }
         SELECT row_id, COUNT(*) AS hits,
           ${rareInBatch.length ? "SUM(CASE WHEN term IN (SELECT term FROM rareTerms) THEN 1 ELSE 0 END)" : "0"} AS exact
         FROM scoped GROUP BY row_id`,
        [...branchParams, ...fenceParams, ...(rareInBatch.length ? rareInBatch : [])]
      )
    })
  )

  // THE SUM, ACROSS BATCHES — a `Map` accumulator, nothing a single SQL
  // `GROUP BY row_id, COUNT(*)` would not have produced over the same rows.
  const merged = new Map<number, { hits: number; exact: number }>()
  for (const rows of batchResults)
    for (const r of rows) {
      const m = merged.get(r.row_id) ?? { hits: 0, exact: 0 }
      m.hits += r.hits
      m.exact += r.exact
      merged.set(r.row_id, m)
    }

  // THE FLOOR, APPLIED ONCE, AGAINST THE TRUE TOTAL — `termFloor` itself is
  // untouched; only where its `>=` is evaluated moved.
  const floor = termFloor(terms.length, role)
  const survivors = new Map<number, number>() // row_id → exact
  for (const [rowId, m] of merged) if (m.hits >= floor || m.exact > 0) survivors.set(rowId, m.exact)
  if (!survivors.size) return []

  // THE RANK, unbatched — bm25() over the combined MATCH never branches, so
  // it was never at risk and does not need batching. Unfenced on purpose, as
  // it always was: only rows already fenced by surviving a batch above are
  // ever read out of this by the join in JS below.
  const ranked = await d1Query<{ chunk_id: string; row_id: number; lex: number }>(
    cfg,
    guard.databaseId,
    `SELECT k.id AS chunk_id, ranked.row_id, ranked.rel AS lex
       FROM (
         SELECT rowid AS row_id, bm25(knowledge_chunks_fts) AS rel
         FROM knowledge_chunks_fts WHERE knowledge_chunks_fts MATCH ?
       ) ranked
       JOIN knowledge_chunks k ON k.rowid = ranked.row_id`,
    [combinedMatch]
  )

  // THE JOIN AND THE ORDER, now in JS — the same `ORDER BY exact DESC, lex
  // ASC` the old single query ran, and the same `LIMIT LEXICAL_TOP_K` (R14).
  return ranked
    .filter((r) => survivors.has(r.row_id))
    .map((r) => ({ chunk_id: r.chunk_id, lex: r.lex, exact: survivors.get(r.row_id) as number }))
    .sort((a, b) => b.exact - a.exact || a.lex - b.lex)
    .slice(0, LEXICAL_TOP_K)
}

type ScoredRow = {
  id: string
  source_id: string
  seq: number
  text: string
  title: string
  kind: string
  source_url: string | null
  compartment: string
  origin_table: string | null
  origin_row_id: string | null
  record_date: string | null
}

/** ONE `ScoredRow`, AS THE ANSWER SEES IT. Factored out because `retrieve`
 * builds this shape TWICE once the reader is in the loop — once for the
 * shortlist it hands the reader, once for the final passages an answer
 * carries — and a mapping written twice is a mapping that drifts the first
 * time only one copy is edited. */
function toPassage(row: ScoredRow, score: number): KnowledgePassage {
  return {
    sourceId: row.source_id,
    title: row.title,
    kind: row.kind,
    url: row.source_url,
    // `origin_table`/`origin_row_id` already rode the read that built `row`,
    // so the link to the record costs nothing extra.
    recordPath: recordPath(row.origin_table, row.origin_row_id, row.compartment),
    compartment: row.compartment,
    seq: row.seq,
    text: plainText(row.text),
    score: Math.round(score * 1000) / 1000,
    recordDate: row.record_date ?? null,
  }
}

/** WEIGHTED RECIPROCAL RANK FUSION. Two ranked lists whose scores mean entirely
 * different things (a cosine, and a sum of term weights), combined by the one
 * thing they share — position. Each contributes weight/(K + rank).
 *
 * The WEIGHT is the part that was measured and got wrong first time round. At
 * parity the word match drags an ordinary question's answer down nine points;
 * at a tenth of a vote, gated to questions that contain something exact, it is
 * invisible on questions it has nothing to say about and decisive on the ones
 * it does. Nothing else is added here — no record hint, no recency, no
 * hand-tuned boost. Every one of those was tried and every one was worse.
 *
 * ── RECENCY, CONSIDERED AGAIN ON 27 AUG 2026 AND LEFT OUT ──────────────────
 *
 * The measurement above was taken on seven novels, and this file's own note says
 * the retest belongs on the agency's material. It got one, because the owner
 * asked the question that would need it: "the latest news on the flu clinic
 * stripe integration", and got the week before's meeting.
 *
 * THE CASE FOR ADDING A RECENCY TERM GOT WEAKER, NOT STRONGER. The newest source
 * — a transcript from that morning — was ALREADY retrieved, at rank six of six.
 * Nothing was missing from the ranking. What was missing is that the writer was
 * never told when anything was from, or what day it is, so "latest" was a word
 * with no referent. Giving it the dates answers the question with the ranking
 * untouched (see knowledge-compose.ts), and a term here would have put a measured
 * 20/20 at risk to fix something that was not broken.
 *
 * WHAT WOULD REOPEN IT, and it is deliberately a high bar: a question whose
 * newest material is NOT RETRIEVED AT ALL. Not ranked low — absent. Ranked low is
 * the writer's problem and it now has the dates to solve it. If the bench turns
 * up an absent one, start with recency GATED ON INTENT — a term that applies only
 * when the question itself says "latest", "recent", "today" — because that leaves
 * every ordinary question at the behaviour these numbers were measured on.
 *
 * A rejection without its evidence gets re-tried by the next person who has the
 * same good idea. This is the evidence. */
function fuse(
  vector: { id: string }[],
  lexical: CandidateRow[],
  /** THE PEOPLE THE QUESTION NAMED, if it named any — see `nameArm`. A third
   * list rather than more rows in `lexical`, because it earns a different vote
   * and because a list that is empty on every question that names nobody cannot
   * disturb a single measured number. */
  named: CandidateRow[] = [],
  /** THE NEWEST MATERIAL, if the question asked for it — see `recencyArm`.
   * Empty on every question without recency intent, by construction
   * (`retrieve` only calls the arm at all when `hasRecencyIntent` is true),
   * so an ordinary question's fusion is exactly as it was measured. */
  recency: CandidateRow[] = []
): { id: string; score: number }[] {
  const fused = new Map<string, number>()
  vector.forEach((hit, rank) => fused.set(hit.id, (fused.get(hit.id) ?? 0) + 1 / (RRF_K + rank + 1)))
  named.forEach((row, rank) =>
    fused.set(row.chunk_id, (fused.get(row.chunk_id) ?? 0) + NAME_WEIGHT / (RRF_K + rank + 1))
  )
  recency.forEach((row, rank) =>
    fused.set(row.chunk_id, (fused.get(row.chunk_id) ?? 0) + RECENCY_WEIGHT / (RRF_K + rank + 1))
  )
  lexical.forEach((row, rank) =>
    fused.set(
      row.chunk_id,
      // A TENTH OF A VOTE, UNLESS THE CHUNK HOLDS THE REFERENCE ITSELF. See
      // EXACT_WEIGHT: the tenth was measured on ordinary questions and still
      // stands for them, and `exact` is zero for every chunk of every question
      // that carried no rare exact token — so nothing measured moves.
      (fused.get(row.chunk_id) ?? 0) +
        (row.exact > 0 ? EXACT_WEIGHT : LEXICAL_WEIGHT) / (RRF_K + rank + 1)
    )
  )
  return [...fused.entries()]
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score)
}

/** How many of the fused candidates a refusal keeps — enough to see whether
 * anything was CLOSE, never the whole pool. This table is a diagnostic, not a
 * second copy of the ranking. */
const REFUSAL_SHORTLIST_CAP = 10

/** THE REFUSAL LOG (0077, BUILD-5 §5-6). NEVER THROWS: a failure here is
 * recorded (ERROR-HANDLING.md's one seam) and swallowed inside `write()`,
 * because a refusal that could not be LOGGED must still be returned to the
 * person who asked — the diagnostic is a courtesy to whoever investigates
 * later, not part of the answer contract. Deferred where a deferrer is set up
 * (`env.DEFER`, the same per-request seam `publishChange` already rides — a
 * person asking a question neither knows nor should wait for this) and
 * awaited plainly where one is not (a cron, a test, a lib called directly). */
async function logRefusal(
  env: Env,
  cfg: D1Rest,
  guard: MemberGuard,
  question: string,
  compartments: string[],
  reason: string,
  shortlist: { id: string; score: number }[],
  /** THE RAW COSINE OF THE NEAREST VECTOR NEIGHBOUR, before any floor —
   * KB-AUDIT.md §3's own number: "you will see the 0.44-0.49 band
   * immediately." `null` when there is nothing to report one for (no vector
   * store, an unembeddable question, or literally no neighbours), which is a
   * different fact from a low score and must stay distinguishable from one. */
  top1Score: number | null
): Promise<void> {
  const write = (async () => {
    try {
      await d1Query(
        cfg,
        guard.databaseId,
        `INSERT INTO knowledge_refusals (id, question, compartments, reason, shortlist, top1_score, asked_by_user_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ulid(),
          question,
          JSON.stringify(compartments),
          reason,
          JSON.stringify(
            shortlist
              .slice(0, REFUSAL_SHORTLIST_CAP)
              .map((s) => ({ id: s.id, score: Math.round(s.score * 1000) / 1000 }))
          ),
          top1Score === null ? null : Math.round(top1Score * 1000) / 1000,
          guard.userId,
          new Date().toISOString(),
        ]
      )
    } catch (e) {
      await recordWorkerError(env.DB, "content", "knowledge refusal log", e, undefined, {
        teamId: guard.teamId,
        userId: guard.userId,
      })
    }
  })()
  if (env.DEFER) env.DEFER(write)
  else await write
}

/** Answer a question from the team's own material.
 *
 * IT STILL GENERATES NO PROSE. It finds the passages and their citations; if the
 * caller passed a `compose` writer, that writer is handed EXACTLY the evidence the
 * reader will see and hands back a paragraph — which is R23's own sentence ("the
 * assistant composes the reply with those in front of it") made into a parameter
 * instead of a habit. Nothing here can promote a near-miss, invent a source, or
 * turn a refusal into an answer, because the writer is only ever reached AFTER
 * `found` is already true. */
export async function retrieve(
  env: Env,
  cfg: D1Rest,
  guard: MemberGuard,
  input: {
    question: string
    accountId?: string | null
    /** WHICH DOORS THIS CONVERSATION IS USING — the source chips, already
     * resolved from chip keys to kinds by `kindsForChips`. Null means every
     * kind, which is what a caller who has never touched the chips sends.
     *
     * IT NARROWS IN BOTH PLACES, and that is R26's shape rather than a belt and
     * braces: the vector index is told to look only at those kinds (a label it
     * already carries), and the passage read — the one place THE DATABASE
     * DECIDES — carries the same clause. Narrowing only the index would let the
     * word arm and the name arm return a kind the caller unticked; narrowing
     * only the read would spend the index's whole budget on kinds it is going to
     * throw away. */
    kinds?: string[] | null
    limit?: number
    /** WRITE THE ANSWER OUT. Absent means the caller wants the evidence only, which
     * is what every caller wanted until the Knowledge tab started answering in
     * words — and is still what an assistant wants, because it writes its own
     * reply. It costs a model call, so the door that supplies it is the door that
     * gates and meters it (routes/knowledge.ts); this function only decides
     * WHETHER there is anything worth writing about. */
    compose?: (material: KnowledgePassage[], sources: KnowledgeCitation[]) => Promise<string | null>
    /** RE-READ THE SHORTLIST (BUILD-5 §5-6) before deciding what counts as
     * evidence. Absent means the caller wants the pre-Stage-2 behaviour
     * exactly — `MIN_VECTOR_SCORE` alone decides, unchanged. Present, and it
     * costs a model call: the door that supplies it gates and meters it
     * (`routes/knowledge.ts`), same shape as `compose` above and the same
     * reason — this function only decides whether there is a shortlist worth
     * reading. Present also means the candidate floor WIDENS to
     * `KNOWLEDGE_READER_MIN_SCORE` (a hallucination guard, not a real
     * decision), so a `null` verdict (the reader could not run) is read as NO
     * EVIDENCE, not as "fall back to the floor" — the widened pool was never
     * safe to expose unjudged. See the point this is used in the function
     * body, and `knowledge-reader.ts`'s own header, for the whole argument. */
    read?: (question: string, shortlist: KnowledgePassage[]) => Promise<{ relevant: string[] } | null>
  }
): Promise<KnowledgeAnswer> {
  const question = requireText(input.question, "Question", TEXT_LIMITS.message)
  const want = Math.max(1, Math.min(input.limit ?? DEFAULT_PASSAGES, 20))

  const [asked] = await embed(env, [question])
  const route = await deriveRoute(env, cfg, guard, {
    question,
    accountId: input.accountId ?? null,
    asked,
  })

  // THE TWO ARMS, SIDE BY SIDE. Neither narrows the other; that was the bug.
  const terms = questionTerms(question, MAX_QUESTION_TERMS)
  const hits =
    asked && hasVectorStore(env)
      ? await searchVectors(env, guard, asked, {
          level: "chunk",
          ...compartmentFilter(route.compartments),
          ...(input.kinds?.length ? { kind: { $in: input.kinds } } : {}),
        })
      : []
  // THE RAW NEAREST-NEIGHBOUR SCORE, BEFORE ANY FLOOR — kept for the refusal
  // log alone (KB-AUDIT.md §3: "log every refusal with its top-1 score"),
  // never for ranking or for the floor decision itself, both of which read
  // `vector` below. `searchVectors` returns matches ordered best-first
  // (Vectorize's own contract), so this is genuinely the nearest neighbour and
  // not an arbitrary row.
  const top1Score = hits[0]?.score ?? null
  // NOT EVERY NEAREST NEIGHBOUR IS EVIDENCE. There is always a closest thing;
  // below the floor it is merely the least unlike, and letting it through is how
  // a knowledge base answers a question about parental leave out of a note about
  // dispatch outages.
  //
  // WIDENED WHEN A READER IS COMING, THROUGH A SEPARATE VAR — not a fallback
  // switched on `input.read` inside the SAME `numberVar(env.KNOWLEDGE_MIN_SCORE,
  // …)` call, because that would have made the two floors inseparable: any
  // deployment (or test) that pins `KNOWLEDGE_MIN_SCORE` explicitly — which is
  // every existing test in this suite — would silently pin the reader's floor
  // to the SAME number too, and "the reader gets its own, lower floor" would
  // have been true only on an environment that set neither var. Two floors, two
  // vars, independently measured: `input.read` present means something is
  // about to actually READ these passages rather than trust their score alone,
  // so `KNOWLEDGE_READER_MIN_SCORE` (default `READER_HALLUCINATION_FLOOR`) is a
  // guard against pure noise, and the real decision moves to the reader below.
  // Absent `input.read`, this is `KNOWLEDGE_MIN_SCORE` / `MIN_VECTOR_SCORE`
  // exactly as before Stage 2 — no existing caller's answers change.
  const floor = input.read
    ? numberVar(env.KNOWLEDGE_READER_MIN_SCORE, READER_HALLUCINATION_FLOOR)
    : numberVar(env.KNOWLEDGE_MIN_SCORE, MIN_VECTOR_SCORE)
  const vector = hits.filter((h) => h.score >= floor)



  // WHEN THE WORD MATCH RUNS — and the answer turns on a distinction the old
  // version of this comment did not draw.
  //
  // BESIDE THE VECTOR ARM it is easy: the question contains something EXACT (a
  // reference, an invoice number), so it runs quietly at a tenth of a vote,
  // because "exactly this string" is the one thing an embedding is indifferent
  // to. Nothing below changes that case.
  //
  // ── WHEN THE VECTOR ARM CAME BACK EMPTY, WHICH IS TWO SENTENCES ───────────
  //
  // This used to be one condition (`!vector.length`) covering four situations it
  // called identical: no store bound, the question could not be embedded, the
  // material has no vector because it was indexed while the model was down, or
  // nothing in the base cleared the floor. The first three are IGNORANCE — we
  // did not look, so the word match really is everything we have. The fourth is
  // an ANSWER: a semantic search ran over the whole compartment and reported
  // that nothing in it is about this. Treating an answer as ignorance let the
  // word match overturn it, on shared common words, into a confident reply.
  //
  // MEASURED, 27 Aug 2026, over the agency's own material. Asked "what is our
  // parental leave policy and how much notice does it need?" — a policy the base
  // does not hold and nobody has ever written down — the vector arm topped out
  // at 0.451 against a floor of 0.5 and correctly found nothing. The word arm
  // then ran as sole evidence, cleared the proportional floor on "policy",
  // "notice" and "leave", and answered out of a page of Gemini meeting notes.
  // That is precisely the failure R23 exists to prevent, arriving through the
  // one door that was left open for it.
  //
  // So a search that LOOKED and found nothing stands, with one exception, and it
  // is the same exception the word match exists for: a rare exact token. An
  // embedding is indifferent to "3144" and the inverted index is not, so that
  // one case may still speak. Everything else — a question of ordinary words the
  // semantic search has already answered — is a refusal.
  //
  // The strict floor (`termFloor`'s `sole` branch — a short question present in
  // FULL) still applies whenever the word match stands alone, and is now the
  // second line rather than the only one.
  const role: LexicalRole = vector.length
    ? "beside"
    : !asked || !hasVectorStore(env) || !hits.length
      ? "blind"
      : "overruling"
  const lexical =
    role !== "beside" || hasExactTerm(question)
      ? await lexicalArm(cfg, guard, terms, exactTerms(question), route.compartments, role)
      : []
  // THE NAME ARM RUNS ON EVERY QUESTION, and it is its own gate: it returns
  // nothing unless one of the question's terms begins a colleague's name. So it
  // costs one bounded read on a question about parental leave and speaks only on
  // a question about a person — which is also why it may speak when the vector
  // arm found nothing, the case that refused the owner outright.
  const named = await nameArm(cfg, guard, terms, route.compartments, input.kinds ?? null)
  // THE RECENCY ARM RUNS ONLY ON INTENT (KB-AUDIT.md §4.5) — gated the same
  // way the name arm is unconditional and this is not: "what changed this
  // week?" needs it, "capital expenditure?" must never be nudged by it, so a
  // bounded read only happens on the question shape that asked for one.
  const recency = hasRecencyIntent(question)
    ? await recencyArm(cfg, guard, route.compartments, input.kinds ?? null)
    : []

  const fused = fuse(vector, lexical, named, recency)

  if (!fused.length) {
    // No fused candidates at all — the shortlist worth logging is empty, and
    // that emptiness is itself the fact: nothing narrowed by compartment or
    // touched by any arm, not "something close that fell short".
    await logRefusal(env, cfg, guard, question, route.compartments, route.reason, [], top1Score)
    return knowledgeAnswer({
      question,
      compartments: route.compartments,
      reason: route.reason,
      records: route.records,
      passages: [],
      candidates: 0,
      // No shortlist ever existed for a reader to look at.
      reread: false,
    })
  }

  // THE DATABASE DECIDES (R26). Everything above chose ids; the words come from
  // here, out of the team's own database, under the caller's own fence, with
  // excluded sources gone. Nothing readable ever left the vector store.
  const pool = fused.slice(0, RANKING_POOL)
  // BOTH FENCES, ON THE SOURCE ROW. The personal one used to be read off the
  // CHUNK's copy of it; it is read off `s` now so that the two halves of "who may
  // read this" are one clause in one place, on the row that owns the decision.
  // The chunk's copy is a denormalisation for the word-match's single-table read,
  // never the authority (see readerClause).
  const reader = readerClause(guard, "s.")
  // THE CHIPS, AS SQL — built ONCE and used at every read that can hand a
  // passage back. There are three (the pool read, the router's fallback and the
  // neighbour widening), and the fallback's own comment already says the rule:
  // "a second way in may not be a wider one". Building the clause here rather
  // than at each read is what makes a fourth way in honest by construction.
  const chipClause = input.kinds?.length
    ? ` AND s.kind IN (${input.kinds.map((k) => sqlString(k)).join(", ")})`
    : ""
  const rows = await d1Query<ScoredRow>(
    cfg,
    guard.databaseId,
    // R14 hard cap: the pool is already bounded by RANKING_POOL; the LIMIT says
    // so at the statement, where the next reader is looking. The ids are this
    // worker's own, read back out of its own table, so they are interpolated
    // (CONVENTIONS) and the statement stays under D1's 100-parameter ceiling.
    `SELECT c.id, c.source_id, c.seq, c.text, s.title, s.kind, s.source_url, s.compartment,
            s.origin_table, s.origin_row_id, s.record_date
       FROM knowledge_chunks c JOIN knowledge_sources s ON s.id = c.source_id
      WHERE c.id IN (${pool.map(({ id }) => sqlString(id)).join(", ")})
        AND s.deactivated_at IS NULL AND ${reader.sql}${chipClause}
      LIMIT ${RANKING_POOL}`,
    reader.params
  )

  // ── WHAT SURVIVED THE READ, AND WHAT TO DO WHEN NOTHING DID ──────────────
  //
  // THE FAULT, isolated on staging on 20 Aug 2026. Three phrasings of one
  // question, one transcript, indexed and chunked:
  //
  //   "Ishita and Alaap one-to-one"                          -> 6 passages
  //   "What was decided in the Ishita and Alaap meeting?"     -> 3 passages
  //   "What was decided in the Ishita and Alaap one-to-one?"  -> NOTHING
  //
  // The refusal came back carrying `candidates: 2` and this sentence: "It reads
  // like a question about \"Ishita x Alaap\"." So the search DID find two
  // chunks and the router DID name the right record — and the answer was still
  // "the knowledge base has nothing on this".
  //
  // Two ids came out of the vector store and NEITHER was in the database. The
  // source itself is wide open (`owner_user_id` null, `visible_to_app_id` null,
  // compartment `agency`, one live chunk), so no fence dropped them: the ids
  // simply no longer exist. Re-indexing replaces a source's chunks — new rows,
  // new ids — and the store can still answer with the ids of the ones it
  // replaced. R26 is what makes that survivable rather than dangerous: the index
  // NARROWS and the database DECIDES, so a ghost id reads back as no row instead
  // of as somebody else's paragraph. But "no row" was being reported as "nothing
  // to say", which is a different and much worse sentence.
  //
  // So when nothing survives the read, the covers get the last word. Those
  // record ids already cleared the SAME floor in `deriveRoute`, and their chunks
  // are read from D1 by source — rows that exist by construction, because the
  // database is what just handed them over.
  //
  // WHY THIS DOES NOT CONTRADICT THE NOTE ON `records`, which says the router's
  // guess "rides the ANSWER and never the ranking — a wrong guess here is
  // something a reader can disagree with, not something that hid the passage".
  // That rule exists so a wrong guess cannot HIDE a passage. This runs only when
  // there is no passage left to hide; it cannot reorder anything, because there
  // is nothing to reorder. And if the covers found no record over the floor —
  // which is what a question the base has nothing on produces — it does not run,
  // and the refusal stands exactly as it always did.
  let ranked = diversify(rankPassages(fused, rows))
  if (!ranked.length && route.records.length) {
    const named = route.records.slice(0, ROUTER_FALLBACK_RECORDS).map((r) => r.sourceId)
    const revived = await d1Query<ScoredRow>(
      cfg,
      guard.databaseId,
      // The SAME fence and the SAME columns as the read above — a second way in
      // may not be a wider one. R14: bounded by RANKING_POOL, said here.
      `SELECT c.id, c.source_id, c.seq, c.text, s.title, s.kind, s.source_url, s.compartment,
              s.origin_table, s.origin_row_id, s.record_date
         FROM knowledge_chunks c JOIN knowledge_sources s ON s.id = c.source_id
        WHERE c.source_id IN (${named.map((id) => sqlString(id)).join(", ")})
          AND s.deactivated_at IS NULL AND ${reader.sql}${chipClause}
        ORDER BY c.seq LIMIT ${RANKING_POOL}`,
      reader.params
    )
    // Scored on the scale `fuse` uses, in the order the router put the records
    // and the author put the paragraphs, so everything downstream is handed the
    // shape it already understands.
    ranked = diversify(revived.map((row, i) => ({ row, score: 1 / (RRF_K + i) })))
  }
  ranked = await widenNeighbours(cfg, guard, reader, ranked, want)

  // THE READER (BUILD-5 §5-6): re-reads a shortlist and decides what is real
  // evidence, rather than trusting the floor's score alone. Runs on the whole
  // RANKED POOL capped at READER_SHORTLIST_CAP (12) — wider than `want` (the
  // six an answer carries), the same way a person skims more than they end up
  // quoting — and its OWN order becomes the ranking for exactly the passages
  // it was shown: a passage past the shortlist the reader never saw has not
  // been vouched for, and is dropped along with the ones it actively rejected.
  if (input.read && ranked.length) {
    const shortlist = ranked.slice(0, READER_SHORTLIST_CAP)
    const verdict = await input.read(
      question,
      shortlist.map(({ row, score }) => toPassage(row, score))
    )
    // BOTH OUTCOMES CLEAR `ranked` TO EMPTY UNLESS THE READER SAYS OTHERWISE —
    // and that is deliberately the SAME handling for "the reader looked and
    // found nothing" and "the reader could not run". `ranked` at this point was
    // built against the WIDENED floor (`READER_HALLUCINATION_FLOOR`), which by
    // design is not a safe floor on its own — it is a hallucination guard, and
    // the reader's judgment is what was supposed to turn it into a real
    // decision. A reader that FAILED never supplied that judgment, so passing
    // the widened, unjudged pool through anyway would reintroduce exactly the
    // failure this whole mechanism exists to fix — a low, uncalibrated cosine
    // standing in for a real "is this evidence" decision, quietly, on the one
    // path (a model outage) where nobody is watching. Refusing is the safe
    // direction: it costs an answer the strict floor might have allowed
    // through cleanly, never a confident one built on unverified material.
    const byId = new Map(shortlist.map((r) => [passageId({ sourceId: r.row.source_id, seq: r.row.seq }), r]))
    ranked = verdict
      ? verdict.relevant.flatMap((id) => {
          const r = byId.get(id)
          return r ? [r] : []
        })
      : []
  }

  const passages: KnowledgePassage[] = ranked.slice(0, want).map(({ row, score }) => toPassage(row, score))
  const live = await crossCheck(cfg, guard, ranked.slice(0, want).map((r) => r.row))
  const evidence = {
    question,
    compartments: route.compartments,
    reason: route.reason,
    records: route.records,
    passages,
    candidates: fused.length,
    live,
    // TRACKER `d-steps`: whether the reader ran is decided by whether the
    // caller gave `retrieve()` one — see the `if (input.read && ...)` block
    // above — not by whether it found anything, so a re-read that came back
    // empty still says so honestly.
    reread: !!input.read,
  }
  // DECIDED FIRST, WRITTEN SECOND, and the order is the law. The seam settles
  // `found`, which sources are cited and which passages survive; only then is the
  // writer handed that settled evidence — the same object the reader gets — and
  // only if there was any. A writer that ran before this decision could be given
  // material the caller was never going to see.
  const decided = knowledgeAnswer(evidence)
  // THE INTERESTING CASE: real candidates existed (`fused` is non-empty) and
  // none survived to become an answer. This shortlist is what tells "the base
  // genuinely holds nothing" apart from "something was close" — logged with
  // the FUSED candidates rather than the (empty, by construction) `passages`.
  if (!decided.found)
    await logRefusal(env, cfg, guard, question, route.compartments, route.reason, fused, top1Score)
  if (!input.compose || !decided.found) return decided
  const written = await input.compose(decided.passages, decided.citations)
  // Nothing written (the model was unreachable, or said nothing) is not an error:
  // the evidence is still the answer, exactly as it was before any of this.
  return written ? knowledgeAnswer({ ...evidence, written }) : decided
}

/** THE ORDER THE FUSION DECIDED, joined to the rows the database handed back.
 *
 * THERE IS NO CROSS-ENCODER RE-RANK HERE, AND THAT IS A MEASUREMENT, NOT AN
 * OMISSION. The obvious next move — take the top two dozen, have a cross-encoder
 * read the question and each passage together, re-order — is the standard way to
 * turn "roughly right" into "the right paragraph", and the latency and cost for
 * it were explicitly authorised. It was built and measured. The only re-ranker
 * Cloudflare offers (@cf/baai/bge-reranker-base — the v2/large/jina ones return
 * "no route for that URI") made every slice of the corpus WORSE: recall@6 62.7%
 * → 47.9% over a pool of 24, → 41.5% over a pool of 50. So it is not shipped,
 * and the seam it would slot into is this function.
 *
 * WHAT WOULD CHANGE OUR MIND: a stronger re-ranker on Workers AI (the seam is
 * one `env.AI.run` here, and the harness that measured it is kept), or a bigger
 * question set showing the loss is our sample rather than the model. It stays on
 * Cloudflare either way — no outside provider sees this text. */
/** HOW MANY PASSAGES MAY COME FROM SOURCES SHARING ONE TITLE.
 *
 * Two, because one is too few — a document and its follow-up genuinely both
 * answer some questions — and three is already a page of the same thing. */
const PASSAGES_PER_TITLE = 2

/**
 * DON'T SPEND THE WHOLE ANSWER ON ONE THING SAID FIVE TIMES.
 *
 * ── WHAT THIS FIXES, read off a real answer ─────────────────────────────────
 *
 * Asked "summarise what happened in the Team Assembly meeting", the base
 * returned six passages and five of them were the SAME recurring meeting —
 * different rows, identical titles, and every one of them a future instance
 * that had not happened yet. The one source that described what was actually
 * said got the remaining slot.
 *
 * That is not a scoring bug: a recurring series really does produce many rows
 * that match "Team Assembly" equally well, and the ranking is right that they
 * all match. It is a SELECTION bug. Six of the best matches is not the same
 * thing as the best six-passage answer, and the difference is exactly what a
 * person means when they say an answer was unhelpful.
 *
 * ── HOW ──────────────────────────────────────────────────────────────────────
 *
 * Best first, taking at most two passages from any set of sources that share a
 * title, and then — only if that left fewer than were asked for — filling the
 * rest from what was skipped, best first again. So diversity is preferred and
 * never PAID for: an answer can still be six passages from one document when
 * one document is genuinely all there is.
 *
 * Deliberately on the TITLE and not the source id: several passages from one
 * long document are a good answer to a question about that document, and
 * capping those would make a fifty-page contract quotable twice. What is being
 * spread is the ANSWER across the things it is about.
 */
/** WORDS OF ITS OWN — words the body has and the title does not — a passage must
 * carry before it is worth a slot.
 *
 * LOW ON PURPOSE, and it was not low enough on the first attempt. At eight, a
 * real handover note — "3144 is pending gravity forms confirmation." — was
 * classed as an envelope and pushed down the answer, which is the same mistake
 * this rule exists to correct, made in the other direction. Short is not empty. A
 * note somebody typed in one line is exactly the material a knowledge base is
 * for. */
const SUBSTANTIVE_WORDS = 4

/** THE SENTENCES THE MIRROR WRITES ROUND EVERY RECORD, which are not the record.
 * A source's body opens with a line this app generated — "X is a meeting of ours,
 * on 2026-08-19.", "Met on 2026-08-19." — and that line is the same for a
 * ninety-six-chunk transcript and for a diary entry. Struck out before anything
 * is counted, or the wrapper alone clears any threshold worth having. */
const MIRROR_WRAPPER = /(is a meeting (of ours|with)[^.]*\.|^Met on[^.]*\.|is a way of working[^.]*\.)/gi

/** DOES THIS PASSAGE SAY ANYTHING THE TITLE DID NOT?
 *
 * Some sources are envelopes. "Invitation: FluClinic : Task 3144 @ Tue Aug 25,
 * 2026 12:30pm" is a calendar invitation, and its body is the same words again
 * with a time on them. A bare meeting that has already happened — kept on
 * purpose, because it is the record that it happened — says "X is a meeting of
 * ours, on 2026-08-19." and nothing else. Both are perfectly RELEVANT: they are
 * near-perfect matches for a question naming the thing they are about, which is
 * exactly why they win slots.
 *
 * That is what makes this a different rule from a relevance floor, and why the
 * obvious fix does not work. Measured on the agency's own material, 27 Aug 2026:
 * a score cliff — keep what is close to the best hit, drop the rest — cuts
 * nothing here, because these score at the TOP. Asked about task 3144 the base
 * answered "Task 3144 is currently scheduled, and it was a meeting on August 25",
 * out of the invitation, while the conversation about the task sat lower down.
 *
 * Take the text, strike out the title it already carries, the sentence the mirror
 * wrapped it in and the dates, and count what is left. A paragraph survives
 * easily; a one-line note survives; an envelope has nothing underneath. Digits
 * are KEPT — a reference number is information, and stripping it was what made
 * the handover note look empty. */
function saysSomething(row: ScoredRow): boolean {
  const words = (text: string) =>
    text
      .replace(MIRROR_WRAPPER, " ")
      .replace(/\d{4}-\d{2}-\d{2}/g, " ")
      .replace(/\b\w{3,}\s+\d{1,2},?\s*\d{4}\b/g, " ")
      .replace(/\b\d{1,2}[:.]\d{2}\s*(am|pm)?\b/gi, " ")
      .replace(/[^A-Za-z0-9À-ÿ]+/g, " ")
      .toLowerCase()
      .split(" ")
      .filter((w) => w.length >= 3)
  // BY WORD, NOT BY STRING. Striking out the title as a literal caught the
  // mirrored records and missed the calendar invitations, whose title and body
  // say the same thing in a different arrangement — "Invitation: Bergman dispatch
  // review @ Tue Aug 25" over a body reading "Bergman dispatch review / Tue Aug
  // 25". Asking which words the body has that the title did not is the question
  // that was meant all along, and it answers both.
  const named = new Set(words(row.title ?? ""))
  return words(plainText(row.text ?? "")).filter((w) => !named.has(w)).length >= SUBSTANTIVE_WORDS
}

/** THE SAME PARAGRAPH, UNDER ANOTHER NAME — the share of one passage's own words
 * that another passage must also carry before the two are the same material.
 *
 * ── WHAT THIS FIXES, MEASURED ───────────────────────────────────────────────
 *
 * On the agency's own base, 28 Aug 2026, over the twenty bench questions: 17 of
 * the 84 passages the knowledge base handed back — ONE SLOT IN FIVE — were a
 * paragraph the same answer had already shown the reader, and ten of the sixteen
 * answered questions carried at least one such pair. Two questions about ticket
 * 3144 spent THREE of their six slots on one identical paragraph.
 *
 * It is not a scoring bug and it is not the failure `PASSAGES_PER_TITLE` catches.
 * A meeting reaches this base by several roads: the meeting record's own mirror
 * embeds the Gemini notes, the notes document is indexed again from Drive, and
 * the notes email carries them a third time. Three different TITLES, one set of
 * words — so the title cap, which exists to stop one SUBJECT filling an answer,
 * looks straight past the case where the answer is one PARAGRAPH three times. The
 * ranking is right that all three match; a reader who has read the first has read
 * all of them.
 *
 * ── WHY 0.9, AND WHY A FLOOR UNDER IT ───────────────────────────────────────
 *
 * The overlaps between passages in one answer are sharply bimodal: distinct
 * material sits at 0.0–0.8 and every genuine re-arrival at 0.90–1.00. The band
 * just below is where the pairs that must SURVIVE live — "Recording a damage
 * case" against "Recording damage to a vehicle" at 0.78 are two different process
 * maps and both belong in that answer. So the line goes above them.
 *
 * `ENOUGH_TO_COMPARE` is the other half, and it matters more than the ratio. A
 * share computed over a handful of words is noise: a seven-word calendar envelope
 * scored 0.71 against a sixty-word transcript chunk purely because a short set is
 * easy to cover. Every genuine duplicate measured had at least 55 distinct words.
 * Below twenty there is not enough text to tell "the same paragraph" from "two
 * short notes about one thing", and a passage that thin is `saysSomething`'s
 * business, not this rule's. One rule, one job. */
const SAME_WORDS = 0.9
const ENOUGH_TO_COMPARE = 20

/** A passage's distinct informative words, for comparing it against another.
 * Same shape as `saysSomething`'s counter and for the same reason — it is the
 * words a reader would actually take from the passage, not its punctuation. */
function distinctWords(row: ScoredRow): Set<string> {
  return new Set(
    plainText(row.text ?? "")
      .replace(MIRROR_WRAPPER, " ")
      .replace(/[^A-Za-z0-9À-ÿ]+/g, " ")
      .toLowerCase()
      .split(" ")
      .filter((w) => w.length >= 4)
  )
}

/** HAS THE ANSWER ALREADY SAID THIS? Measured over the SMALLER of the two word
 * sets, because a chunk that is wholly contained in a longer one adds the reader
 * nothing either — the question is what is NEW, not what is equal. */
function alreadySaid(words: Set<string>, said: Set<string>[]): boolean {
  if (words.size < ENOUGH_TO_COMPARE) return false
  return said.some((earlier) => {
    if (earlier.size < ENOUGH_TO_COMPARE) return false
    const [small, large] = words.size <= earlier.size ? [words, earlier] : [earlier, words]
    let shared = 0
    for (const w of small) if (large.has(w)) shared++
    return shared / small.size >= SAME_WORDS
  })
}

/** EXPORTED FOR ONE TEST, and the reason is worth the export. The bargain below
 * — nothing that adds nothing, unless it is all there is — cannot be reached
 * through the door in the end-to-end harness: posting a source runs the sweep and
 * so does asking a question, so the fixture's own mirrored rows are back in the
 * base by the time any question is answered, and "all there is" is never true.
 * The suite tried, and passed for a year without testing it. */
export function diversify(
  ranked: { row: ScoredRow; score: number }[]
): { row: ScoredRow; score: number }[] {
  const seen = new Map<string, number>()
  const said: Set<string>[] = []
  const kept: { row: ScoredRow; score: number }[] = []
  // TWO REASONS TO SET A PASSAGE ASIDE, AND THEY ARE NOT WORTH THE SAME, which
  // is what the single `skipped` list here used to assume. A passage held back
  // only by the title cap still carries words this answer does not have; one that
  // says nothing of its own, or that repeats a passage already in the answer,
  // carries none. Pooled into one list and re-sorted by score, an envelope
  // scoring 0.014 walked in ahead of a real paragraph scoring 0.012 — so the
  // backfill, which exists so an answer is never SHORT, was quietly undoing the
  // rule beside it. Measured: on "What happened at the Team Assembly meeting in
  // August?" the sixth slot went to "Updated invitation: 🧡 Team Assembly @ Wed
  // Aug 19", whose entire body is its own title, while the transcript's other
  // chunks sat below it unused.
  const capped: { row: ScoredRow; score: number }[] = []
  const spent: { row: ScoredRow; score: number }[] = []
  for (const item of ranked) {
    const key = (item.row.title ?? "").trim().toLowerCase()
    const used = seen.get(key) ?? 0
    const words = distinctWords(item.row)
    // THREE PREFERENCES, ONE PASS, AND THE SAME BARGAIN FOR ALL THREE: spread the
    // answer across the things it is about, spend slots on passages that say
    // something, and never show the reader the same paragraph twice — but none of
    // them is PAID for. Anything set aside here comes back below if the answer
    // would otherwise be short, so an answer can still be six passages from one
    // document, and still quote a bare diary entry when a bare diary entry is
    // genuinely all there is.
    if (!saysSomething(item.row) || alreadySaid(words, said)) {
      spent.push(item)
      continue
    }
    said.push(words)
    if (used < PASSAGES_PER_TITLE) {
      seen.set(key, used + 1)
      kept.push(item)
    } else capped.push(item)
  }
  // ── AND WHAT THE BACKFILL IS ACTUALLY FOR ──────────────────────────────────
  //
  // It no longer asks how many passages the caller wanted, and that is a
  // simplification rather than a change: `retrieve` slices this to `want`, so a
  // capped passage still only ever surfaces when the answer would be short. One
  // place decides the ceiling.
  //
  // The title cap is a preference between EQUALS, so a passage it held back comes
  // back the moment the answer would otherwise be short: `capped` is real material
  // this answer does not have, and there is no reason to leave it out.
  //
  // `spent` is not that, and it took a measurement to see it. A passage that says
  // nothing beyond its own title, or that repeats a paragraph already in the
  // answer, cannot make an answer better — the citation list already carries the
  // title, and the reader has already read the words. Padding six slots with those
  // is precisely the two complaints this module was reopened for: references to
  // files that were not important, and the big file it should have touched left
  // untouched underneath them. Five passages that each say something is a better
  // answer than five and an envelope, and there is no length a reader is owed.
  //
  // So it comes back for one reason only: when it is ALL THERE IS. A bare meeting
  // record — "X is a meeting of ours, on 2026-08-19." — is a thin answer and a
  // true one, and the alternative to quoting it is refusing a question the base
  // can genuinely speak to. That case is `kept` and `capped` both empty; it is not
  // "the answer came to five".
  const material = [...kept, ...capped]
  if (material.length) return material
  return spent
}

/** HOW FAR EITHER SIDE OF A MATCHED PASSAGE TO REACH. One paragraph before and
 * one after: near enough that it is still about what matched, close enough that
 * nothing has to decide whether it is relevant. Two would be a page. */
const NEIGHBOUR_REACH = 1

/**
 * WHEN THE ANSWER IS SHORT, WIDEN WHAT IT ALREADY HAS — rather than leave the
 * slots empty or fill them with something worse.
 *
 * ── WHY THERE IS A SHORTFALL TO FILL ────────────────────────────────────────
 *
 * Not because the base is thin. Measured on the agency's own staging base, 28 Aug
 * 2026: asked to summarise the week recap, the vector arm returned its full
 * hundred nearest neighbours and NINE of them still existed in the database — the
 * other ninety-one are ids of chunks that re-indexing replaced, which R26 makes
 * survivable (a ghost id reads back as no row, never as somebody else's
 * paragraph) and which nothing makes VISIBLE. So the pool a six-passage answer is
 * chosen from is routinely seven or eight rows, three of which are the same
 * paragraph arriving by three roads. Take those away honestly and the answer is
 * four passages — of a ninety-six-chunk transcript that is sitting right there.
 *
 * The index being stale is its own problem and a bigger one; this is what the
 * retrieval can do about it without pretending the duplicates were material.
 *
 * ── WHY THE NEIGHBOURS, AND NOT MORE OF THE DOCUMENT ────────────────────────
 *
 * The chunk that matched is the evidence; the paragraph either side of it is the
 * rest of the same thought, which is exactly what a reader who found the right
 * sentence wants next. Starting from the top of the document instead would spend
 * the freed slots on a transcript's opening — "Hello. I don't think I can hear
 * you." — which is how a top-up makes an answer worse while making it longer.
 *
 * IT CANNOT REACH ANYTHING NEW. Same fence, same columns, and only sources this
 * answer is already built on — so it can widen an answer and can never open one.
 * A question the base refuses has no `ranked` to widen and this does not run.
 */
async function widenNeighbours(
  cfg: D1Rest,
  guard: MemberGuard,
  reader: { sql: string; params: string[] },
  ranked: { row: ScoredRow; score: number }[],
  want: number
): Promise<{ row: ScoredRow; score: number }[]> {
  if (!ranked.length || ranked.length >= want) return ranked
  const have = new Set(ranked.map((r) => r.row.id))
  const wanted: string[] = []
  for (const { row } of ranked)
    for (let d = -NEIGHBOUR_REACH; d <= NEIGHBOUR_REACH; d++)
      if (d !== 0 && row.seq + d >= 0)
        wanted.push(`(c.source_id = ${sqlString(row.source_id)} AND c.seq = ${row.seq + d})`)
  if (!wanted.length) return ranked
  const near = await d1Query<ScoredRow>(
    cfg,
    guard.databaseId,
    // R14 hard cap: at most the shortfall itself, and the WHERE names a bounded
    // set of (source, seq) pairs built from the passages already chosen.
    //
    // NO CHIP CLAUSE HERE, and that is not an omission: a neighbour is another
    // chunk of a passage that ALREADY survived the narrowed read, so it is the
    // same source and therefore the same kind by construction. Adding the clause
    // would be a filter that can never remove a row, which reads to the next
    // person as though it could.
    `SELECT c.id, c.source_id, c.seq, c.text, s.title, s.kind, s.source_url, s.compartment,
            s.origin_table, s.origin_row_id, s.record_date
       FROM knowledge_chunks c JOIN knowledge_sources s ON s.id = c.source_id
      WHERE (${wanted.join(" OR ")})
        AND s.deactivated_at IS NULL AND ${reader.sql}
      ORDER BY c.seq LIMIT ${RANKING_POOL}`,
    reader.params
  )
  // Held to the SAME two bars as everything else in the answer: it must say
  // something of its own, and it must not repeat a passage already there. A
  // neighbour is a candidate, not a free pass. Scored just under the passage it
  // came from so the ranking the search decided is never re-ordered by this.
  const said = ranked.map(({ row }) => distinctWords(row))
  const out = [...ranked]
  for (const row of near) {
    if (out.length >= want) break
    if (have.has(row.id)) continue
    const words = distinctWords(row)
    if (!saysSomething(row) || alreadySaid(words, said)) continue
    said.push(words)
    have.add(row.id)
    out.push({ row, score: 0 })
  }
  return out
}

function rankPassages(
  fused: { id: string; score: number }[],
  rows: ScoredRow[]
): { row: ScoredRow; score: number }[] {
  const byId = new Map(rows.map((r) => [r.id, r]))
  return fused
    .map((f) => ({ row: byId.get(f.id), score: f.score }))
    .filter((r): r is { row: ScoredRow; score: number } => Boolean(r.row))
}

/** WHAT THE LIVE ROW SAYS RIGHT NOW.
 *
 * The index is a memory of a row, and a memory goes stale between the moment it
 * was written and the moment somebody asks. A ticket that was "in progress" when
 * it was indexed and is "done" now would otherwise be quoted, accurately and
 * uselessly, as in progress. So before the answer leaves, the records it is
 * about are read AGAIN — the real rows, in the team's own database, at the
 * moment of asking — and what they say today rides the citation.
 *
 * Always, not only when the ranking looked uncertain: it is one grouped read per
 * table over at most six cited records, the owner authorised the latency, and a
 * rule that fires only sometimes is a rule nobody can rely on.
 *
 * It reads no more than the index already carries — the status is inside the
 * indexed text of every mirrored source — so it widens nobody's sight of
 * anything; it only stops the answer being out of date. */
const LIVE_STATUS: Record<string, { table: string; status: string }> = {
  help: { table: "help", status: "status" },
  stories: { table: "stories", status: "status" },
  sprints: { table: "sprints", status: `CASE WHEN completed_at IS NULL THEN 'running' ELSE 'completed' END` },
  apps: { table: "apps", status: "stage" },
  accounts: { table: "accounts", status: "status" },
  meetings: { table: "meetings", status: "status" },
  tasks: { table: "tasks", status: "status" },
  todos: {
    table: "todos",
    status: `CASE WHEN cancelled_at IS NOT NULL THEN 'called off'
                  WHEN completed_at IS NOT NULL THEN 'sent to us' ELSE 'still waiting' END`,
  },
  // `processes` and `account_links` are absent on purpose: neither has a status
  // column, and a row with nothing to re-read has nothing to be stale about.
}

/** WHERE THE RECORD BEHIND A PASSAGE LIVES, IN THIS APP.
 *
 * The owner's sentence: "the ability to go and check out the links to the
 * sources or to those particular records as well." A citation already opens the
 * SOURCE — the knowledge screen that shows what was indexed and why. This is the
 * other half: one hop further, to the ticket, the map, the meeting itself.
 *
 * A path RELATIVE TO THE TEAM (`tickets/<id>`), because the worker has no
 * business knowing what a front end's URLs look like beyond the segment, and
 * both front ends prefix their own. Null for a source with no record screen — a
 * note somebody typed IS the record, a Google document is reached through `url`,
 * and a to-do or a contact lives inside another record's page rather than on one
 * of its own. Null renders no link; it never renders a broken one.
 *
 * DERIVED, not decided at the door (R23): the map is here, the one call is in
 * `retrieve`, and the citation copies what the passage carries. Every segment is
 * checked against `web/lib/pages.ts` by knowledge-coverage.test.ts, so a page
 * that is renamed cannot leave a dead link behind. */
const RECORD_PATH: Record<string, string> = {
  help: "tickets",
  stories: "stories",
  sprints: "sprints",
  apps: "apps",
  processes: "processes",
  meetings: "meetings",
  accounts: "accounts",
  tasks: "tasks",
  // A COLLEAGUE OPENS AS THEIR MEMBER PAGE — `/t/<team>/members/<userId>`, which
  // is where their profile and certificates are drawn (the `StaffPanel` under
  // the member detail). The origin row id IS the user id, so the link resolves
  // without a second lookup.
  users: "members",
}

/** RECORDS THAT LIVE INSIDE ANOTHER RECORD'S PAGE.
 *
 * A contact is not a screen — it is a row on its account's Contacts tab. Same
 * for a to-do, which lives on the account or app it was asked of. So "open the
 * record" for one of these means opening the page it is ON, which is where a
 * person would go to look at it anyway.
 *
 * Before this they resolved to null and rendered no link at all. The owner's
 * sentence was "we should always be able to just link back to the resource", and
 * a citation reading "Roland Golger at HOGO" with nothing to click was the one
 * shape of answer that could not be checked. Measured in the test run: four
 * citations out of six on a question about HOGO's people had no way back. */
const LIVES_ON_ITS_ACCOUNT = new Set([
  "account_links",
  "todos",
  // A PORTAL LOGIN is a row on its account's Portal access tab — it has no page
  // of its own, and the account page is where a person goes to look at one
  // anyway. Its compartment is always that client's, so the hop always resolves.
  "portal_users",
])

export function recordPath(
  originTable: string | null,
  originRowId: string | null,
  /** the source's compartment — `account:<id>` or `agency`. The account id is
   * already on the row the ranker read, so this costs nothing extra. */
  compartment?: string | null
): string | null {
  const segment = originTable ? RECORD_PATH[originTable] : undefined
  if (segment && originRowId) return `${segment}/${originRowId}`
  // The nested kinds, one hop out to the page they sit on. Only ever the
  // account's OWN compartment: `agency` names no record, so a contact filed
  // there still renders no link rather than a broken one.
  if (originTable && LIVES_ON_ITS_ACCOUNT.has(originTable)) {
    const account = /^account:(.+)$/.exec(compartment ?? "")
    if (account) return `accounts/${account[1]}`
  }
  return null
}

async function crossCheck(
  cfg: D1Rest,
  guard: MemberGuard,
  rows: ScoredRow[]
): Promise<Map<string, { status: string; checkedAt: string }>> {
  const out = new Map<string, { status: string; checkedAt: string }>()
  const byTable = new Map<string, { sourceId: string; rowId: string }[]>()
  for (const r of rows) {
    if (!r.origin_table || !r.origin_row_id) continue
    if (!Object.prototype.hasOwnProperty.call(LIVE_STATUS, r.origin_table)) continue
    if (!byTable.has(r.origin_table)) byTable.set(r.origin_table, [])
    const list = byTable.get(r.origin_table) as { sourceId: string; rowId: string }[]
    if (!list.some((x) => x.rowId === r.origin_row_id))
      list.push({ sourceId: r.source_id, rowId: r.origin_row_id })
  }
  const checkedAt = new Date().toISOString()
  await Promise.all(
    [...byTable.entries()].map(async ([table, wanted]) => {
      // Own-row values, but the lookup form is the hardened one anyway — a
      // prototype name in a stored row must skip, not crash.
      const def = Object.prototype.hasOwnProperty.call(LIVE_STATUS, table) ? LIVE_STATUS[table] : undefined
      if (!def) return
      const live = await d1Query<{ id: string; status: string | null }>(
        cfg,
        guard.databaseId,
        // R14 hard cap: `wanted` is at most the passages one answer carries, and
        // the LIMIT says so. Row ids come from this module's own rows.
        `SELECT id, ${def.status} AS status FROM ${def.table}
          WHERE id IN (${wanted.map((w) => sqlString(w.rowId)).join(", ")}) LIMIT ${wanted.length}`
      )
      const statusById = new Map(live.map((l) => [l.id, l.status]))
      for (const w of wanted) {
        const status = statusById.get(w.rowId)
        // A row that is GONE is news too — an answer built on a record that no
        // longer exists must say so rather than quoting it confidently.
        out.set(w.sourceId, {
          status: status ? String(status).replace(/_/g, " ") : "no longer in the app",
          checkedAt,
        })
      }
    })
  )
  return out
}
