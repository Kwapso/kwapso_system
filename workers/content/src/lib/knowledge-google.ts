// GOOGLE MATERIAL, AS KNOWLEDGE SOURCES — the four kinds that make a named Drive
// folder, a named Chat space, scoped mail and the calendar answerable.
//
// ══════════════════════════════════════════════════════════════════════════════
// WHY THIS IS A SECOND LIST OF KINDS AND NOT FOUR MORE LINES IN INGEST_KINDS
//
// lib/google-read.ts's header names the one thing this lane must not do: "call
// this on a schedule with a fabricated guard. Everything here is read with ONE
// PERSON'S OWN TOKEN, so a sweep has to run per connected person, as that person,
// or not at all."
//
// A single list would have obeyed that only by ACCIDENT — the cron's guard is a
// user id no row can hold, so `accessTokenFor` would resolve no connection and
// each Google kind would file nothing. Correct, and invisible: a silent no-op
// that looks exactly like "nobody has connected anything", recorded as a clean
// run, for as long as it takes somebody to notice.
//
// So the separation is structural instead. `sweepAll` — the only sweep the
// scheduled handler can call — takes `INGEST_KINDS`, a list this module is not
// in. These kinds are only ever built from a REAL caller's guard, by a door that
// gated on that caller's own `google:read` right. There is no argument the cron
// could pass that reaches them.
//
// WHAT THAT COSTS, said plainly: a person's Google material is brought up to date
// when they (or the assistant acting as them) ask kwapso to, not every fifteen
// minutes. That is the honest shape of a per-person token, and it is why the
// sync screen shows a row per person per service rather than one team-wide "last
// run" that would be a different person's answer every time.
// ══════════════════════════════════════════════════════════════════════════════
//
// TWO FIELDS OFF EVERY ITEM DECIDE WHERE IT LANDS:
//   • `shelf`     → this reader's SIGHTING (`writeSightings`, below). 'private'
//                   means only THEY may ever be answered from their sight of
//                   it; 'team' means everyone who may read the module can. It
//                   also seeds `ownerUserId` on the row the generic engine
//                   upserts first — a transient, correct-for-one-reader value
//                   that `writeSightings` overwrites moments later with what
//                   the FULL sightings set actually says (see below).
//   • `accountId` → the COMPARTMENT. The client's, or — when it is null — the
//                   agency's own. Decided by the read that fetched the item (the
//                   folder it came out of, the contact it was with), never by
//                   matching a client's name in the text.
//
// ONE SOURCE PER THING, MANY SIGHTINGS OF IT — kb_B1's identity gate, and the
// reason this file changed shape. `origin_row_id` is the THING's own id now,
// the same for every reader who sees it, so a file two colleagues have both
// named lands as ONE source. Who saw it, and on which shelf, moved to
// `knowledge_sightings` (one row per person per item) instead of being the
// SOURCE itself.
//
// THIS PARAGRAPH USED TO ARGUE FOR THE OLD SHAPE, AND THE ARGUMENT WAS RIGHT —
// it just answers a question sightings now answer differently. "Sharing one
// row would make the last sweep to run decide who else can read somebody's
// document" is still true of `owner_user_id` taken alone, which is exactly why
// nothing here trusts it alone any more. THE GENERIC ENGINE'S UPSERT STILL
// WRITES IT, unconditionally, every tick, whoever's sweep runs — that clobber
// was never stopped. What changed is that it no longer MATTERS: the moment a
// second sighting exists, `writeSightings` (below) recomputes `owner_user_id`
// from the WHOLE sightings set and writes over whatever the engine's own
// upsert just said, and the read path (`ownerClause`, knowledge.ts) stops
// trusting the raw column the instant any sighting exists at all. The old
// reasoning did not become wrong; it became the reason sightings exist rather
// than a second owner column, and `writeSightings`'s own header has the exact
// mechanism — the clobber survives, and is made not to matter, which is a
// different claim than "the clobber was prevented" and worth keeping
// straight. `knowledge-identity.ts`'s own header has the full account of
// what the old interpolation cost and why the fence moved with it.

import { automationOff } from "@shared/workers/automations"
import { sqlString, d1Query, type D1Rest } from "@shared/workers/d1-rest"
import type { MemberGuard } from "@shared/workers/gating"
import { ulid } from "@shared/workers/id"
import { mendMojibake } from "@shared/workers/mojibake"
import { GOOGLE_SCOPED_SERVICES, GOOGLE_SERVICES, type GoogleItem, type GoogleService, type GoogleShelf } from "@shared/types"
import type { Env } from "../env"
import { accessTokenFor, googleScope, knownChatPeople, listConnections, listNamedSources } from "./google"
import { calendarEventIdInText, chatMessages, googlePresence, isConnectionLost, type ChatMessage, type ProbableService } from "./google-api"
import { chatThreadItem, chatThreads, hydrateText, readGoogleMaterial, tokenOrNull } from "./google-read"
import { BACKFILL_SLICE_DAYS, BACKFILL_YEARS_BACK } from "./meetings"
import { execKnowledgeScript, indexSource, teamVisibleRecomputeSql } from "./knowledge"
import { googleIdentity, stillLive, type Sighting } from "./knowledge-identity"
import { withSyncLease } from "./sync-lease"
import { brand } from "@shared/brand"
import {
  INGEST_SOURCES_PER_TICK,
  listIngestState,
  sweepKinds,
  type IngestKind,
  type IngestRow,
  type SweepResult,
} from "./knowledge-ingest"

/** The word each service wears on a source row and in the Knowledge screen's
 * kind filter. Plain nouns rather than product names: somebody filtering the
 * knowledge base is looking for "a document" or "an email", and would have to
 * translate "drive" back into one. */
const KIND_OF: Record<GoogleService, string> = {
  drive: "document",
  gmail: "email",
  calendar: "event",
  chat: "message",
}

/** Which SERVICE a source kind came from — the inverse of KIND_OF, so the
 * knowledge module's kind list and this one can never drift apart. */
export const GOOGLE_SOURCE_KINDS = GOOGLE_SERVICES.map((s) => KIND_OF[s])

/** The state key one person's sweep of one service keeps its place under. The
 * ONE place the string is built, so the sweeper, the screen and the door can
 * never spell it differently. */
function googleStateKey(service: GoogleService, userId: string): string {
  return `${KIND_OF[service]}:${userId}`
}

/** FORGET WHERE THIS LANE HAD GOT TO, so the next sweep reads it from the start.
 *
 * THE FAULT (owner, 20 Aug 2026). He disconnected Google, pressed "Connect
 * everything", and re-shared five Chat spaces and four Drive folders. The sweep
 * ran twice afterwards and brought in ZERO chat messages, while the knowledge
 * base held 73 chat sources with every one of them deactivated. The material was
 * gone and re-sharing did not bring it back.
 *
 * The cursor is why. A lane keeps its place — `v2|2026-08-20T04:16:39|…` — and
 * resumes from it, which is exactly right while a share is CONTINUOUS: nobody
 * wants a re-read of two years of chat every quarter of an hour. But
 * disconnecting retires the sources (`retireVanished` is correct to do that: the
 * space is genuinely no longer shared) and re-sharing brings the space back
 * while the cursor still points past everything in it. So the lane resumes
 * after the end of material that is no longer there, finds nothing newer, and
 * reports an honest, useless "caught up".
 *
 * SHARING SOMETHING IS THE ONE EVENT THAT MEANS "READ THIS AGAIN". It is rare, a
 * person does it deliberately, and it is the moment they expect the material to
 * appear — so it is the right and only place to give the cursor up. The cost is
 * one re-read of a folder or a space, bounded by the same caps as any other
 * sweep, and the alternative is what happened here: a share that silently does
 * nothing. */
export async function rewindGoogleLane(
  cfg: D1Rest,
  guard: MemberGuard,
  service: GoogleService
): Promise<void> {
  await d1Query(
    cfg,
    guard.databaseId,
    // The row may not exist yet — a first share before a first sweep — and a
    // cursor that was never set is already rewound, so this touches nothing.
    `UPDATE knowledge_ingest SET cursor = NULL WHERE kind = ?`,
    [googleStateKey(service, guard.userId)]
  )
}

/**
 * STOP ANSWERING FROM ONE GOOGLE KIND ALTOGETHER, and read it again from the
 * start — what a person's SCOPE change means for material already brought in.
 *
 * THE PROBLEM IT SOLVES, said plainly. Scope narrows what is READ, which is the
 * right shape and is the whole design (lib/google.ts's SCOPE essay). But a
 * person who narrows their mail on Tuesday has already had six months of it
 * indexed on Monday, and "that source was never in scope" is false for every
 * one of those rows. A narrowing that only reaches the future is a narrowing
 * that leaves the thing somebody was trying to get rid of exactly where it was.
 *
 * WHY IT IS THIS BLUNT. A `knowledge_sources` row does not record WHICH calendar
 * or WHICH label it came through — the origin id is Google's event or message
 * id and nothing else — so the rows that are now out of scope cannot be
 * identified after the fact. They could be, with a column and a migration and a
 * backfill that would still know nothing about the rows written before it. So
 * the honest move is to let go of the whole kind and let the next sweep bring
 * back exactly what is in scope, which is a computation the code already knows
 * how to do correctly.
 *
 * IT IS THE SAME ARGUMENT `rewindGoogleLane` ALREADY MAKES, in the other
 * direction: sharing something is the one event that means "read this again",
 * because it is rare, deliberate, and the moment a person expects the material
 * to move. Changing scope is its mirror and earns the same treatment. The cost
 * is one re-read and one re-embed of that person's own mail or calendar, paid
 * only when somebody deliberately changes their mind, and the screen says so
 * before they confirm.
 *
 * AND THE THING THAT HOLDS AFTERWARDS IS THE SCOPE, NOT THE RETIREMENT — which
 * is what makes it safe to retire with the MACHINE's hand (`retire` below leaves
 * `deactivator_id` null, so `sweepKind` may revive these rows, and that is
 * deliberate). Everything still in scope is read again on the next tick and
 * comes back. Everything OUT of scope is never read again, so there is nothing
 * for a revival to act on: the sweep cannot revive a row it is never handed.
 *
 * That is the distinction the retirement seam turns on, applied to its mirror. A
 * person's decision is not enforced by a deactivated_at that must survive every
 * future housekeeping pass — it is enforced by the read never happening. A flag
 * can be flipped back by a pass nobody thought about; a read that does not occur
 * cannot be undone.
 */
export async function forgetGoogleKind(
  env: Env,
  cfg: D1Rest,
  guard: MemberGuard,
  service: GoogleService
): Promise<number> {
  let dropped = 0
  // `heldSources` is capped (R14, RETIRE_SCAN_CAP) and randomised, so one call
  // cannot promise to have seen everything. Walked until a pass finds nothing
  // left rather than once — with a hard ceiling, because a loop whose exit
  // depends on a write succeeding is a loop that can fail to exit.
  for (let pass = 0; pass < FORGET_PASSES; pass++) {
    const held = await heldSources(cfg, guard, `google_${service}`)
    if (held.length === 0) break
    for (const source of held) {
      await retire(env, cfg, guard, source.id)
      dropped++
    }
  }
  await rewindGoogleLane(cfg, guard, service)
  return dropped
}

/** How many capped scans `forgetGoogleKind` will walk. RETIRE_SCAN_CAP is 500,
 * so this reaches five thousand of one person's sources for one service — an
 * order of magnitude past any mailbox this app has met, and a ceiling rather
 * than a number anybody will touch. */
const FORGET_PASSES = 10

/** Every state key one person could have — what the sync screen asks for. */
export function googleStateKeys(userId: string): string[] {
  return GOOGLE_SERVICES.map((s) => googleStateKey(s, userId))
}

/** A moment that SORTS. Google hands back three different shapes of time — an
 * RFC-3339 stamp from Drive and Chat, an RFC-2822 mail header ("Tue, 3 Jun 2026
 * 10:04:00 +0200"), a plain date on an all-day event — and only the first sorts
 * as text. The cursor compares strings, so everything is normalised here or the
 * sweep would walk its window in an order nobody can predict.
 *
 * Unreadable or absent → the empty string, which sorts before everything and is
 * therefore swept FIRST rather than never. A row with no date is not a row to
 * drop; it is a row we know less about. */
function moment(raw: string | null): string {
  if (!raw) return ""
  const ms = Date.parse(raw)
  return Number.isFinite(ms) ? new Date(ms).toISOString() : ""
}

/** Sort ascending by (moment, id) — the same total order the cursor names, so
 * "everything strictly after this position" is a meaningful sentence about a
 * window whose own order we do not control. */
function inCursorOrder(rows: IngestRow[]): IngestRow[] {
  return [...rows].sort((a, b) =>
    a.sortAt === b.sortAt ? (a.originRowId < b.originRowId ? -1 : 1) : a.sortAt < b.sortAt ? -1 : 1
  )
}

/** Everything strictly after the cursor. The keyset predicate the SQL kinds get
 * from `after()`, done in code — because the rows came back from Google rather
 * than from a statement we could put a WHERE on. */
function afterCursor(rows: IngestRow[], cursor: { at: string; id: string } | null): IngestRow[] {
  if (!cursor) return rows
  return rows.filter((r) => r.sortAt > cursor.at || (r.sortAt === cursor.at && r.originRowId > cursor.id))
}

/** The fence and the filing, off one item. Two lines, in one place, because they
 * are the two things this whole module is for. */
function fencing(item: GoogleItem): { ownerUserId: string | null; accountId: string | null; accounts: string[] } {
  return {
    // 'team' means NOBODY owns it — which is what a null owner means to every
    // read in lib/knowledge.ts. 'private' names the person whose connection it
    // came through, and only their questions can ever be answered from it.
    ownerUserId: item.shelf === "team" ? null : item.ownerUserId,
    accountId: item.accountId,
    // ABSENT (Drive, Chat) READS AS EMPTY, never as `[item.accountId]` — a
    // redundant wrap of the singular value is not new information (d-ingest-filing:
    // the migration calls the singular column "right for a mirrored record",
    // and the same reasoning holds for a source with only ever one account).
    accounts: item.accounts ?? [],
  }
}

/** THE THING'S OWN ID, NEVER THE READER'S — the fix kb_B1's identity gate names
 * in its own header. Two colleagues naming the same folder now build the SAME
 * key here, which is the whole point: one source, two sightings, not two
 * sources. `googleIdentity` refuses an empty external id rather than letting
 * one bad item collide every unidentifiable row of a service into one. */
function rowId(item: GoogleItem): string {
  // The bare id — `origin_row_id`'s own value — never a composite "table id"
  // string. An earlier draft joined `originTable`/`originRowId` into one
  // string and wrote THAT here, which reads as correct (both come out of
  // `googleIdentity`) and is caught only by `origin_row_id` visibly carrying
  // a table name inside it. The joined-string column that draft was aiming
  // at (`identity_key`, 0073) was retired in 0080: 0012's own
  // `idx_knowledge_sources_origin`, a unique partial index on exactly
  // `(origin_table, origin_row_id)`, already enforced the fact that column
  // was built to enforce — the fold here has always keyed on those two plain
  // columns, never on a joined string.
  return googleIdentity(item.service, item.externalId).originRowId
}

/**
 * THE FOUR KINDS, built for ONE person from their own guard.
 *
 * `env`, `cfg` and `guard` are closed over rather than passed through the read
 * signature: a Google read needs a token, a token belongs to a person, and a
 * kind that could be handed somebody else's guard at call time is a kind that
 * could be swept as the wrong person. Bound once, at the only place that has the
 * right to build them.
 */

/** GOOGLE'S OWN CALENDAR-NOTICE OPENINGS. A PREFIX and never a substring: a mail
 * that OPENS "Invitation: " is Google announcing an event, and a mail whose
 * subject merely contains the word is a person writing to us. */
const NOTICE_PREFIXES = [
  "Invitation: ",
  "Accepted: ",
  "Declined: ",
  "Tentative: ",
  "Canceled: ",
  "Cancelled: ",
  "Updated invitation: ",
  "Updated invitation with note: ",
]

/** The event a calendar notice is ABOUT — its own title, with Google's prefix
 * and its " @ <when>" tail removed. Null when the title is not a notice, so "is
 * this a notice" and "what is it about" are one decision in one place. */
export function eventNamedBy(title: string): string | null {
  const prefix = NOTICE_PREFIXES.find((p) => title.startsWith(p))
  if (!prefix) return null
  const rest = title.slice(prefix.length)
  const at = rest.indexOf(" @ ")
  const named = (at === -1 ? rest : rest.slice(0, at)).trim()
  return named.length ? named : null
}

/** WHAT THE APP ALREADY HOLDS, for the fold below — read ONCE per sweep. */
/** THE SAME CALL UNDER TWO OF GOOGLE'S OWN IDS — settled, so the artefact
 * reaches the meeting it came out of.
 *
 * ── WHAT WENT WRONG, IN ONE PAIR OF STRINGS ─────────────────────────────
 *
 *   the source says   742htcuo14uqtaa8v9f53lq7ef_20260904T100000Z
 *   the meeting says  742htcuo14uqtaa8v9f53lq7ef_20260904T103000Z
 *
 * Same series, same Friday, thirty minutes apart. A recurring occurrence's id
 * is the series id plus the instance's start, so when the standing call MOVES
 * — the Jourfix went from 10:00 to 10:30 — everything Google wrote before the
 * move keeps the old stamp and everything after it carries the new one. Both
 * are Google's, both name the same hour of the same day, and an equality join
 * matches neither to the other.
 *
 * Measured on staging, 9 Sep 2026: 142 event ids on live sources matched no
 * meeting we hold, and 37 of them are exactly this — the call IS in the base,
 * under the other stamp.
 *
 * ── WHY THE WINDOW IS TWELVE HOURS AND NOT "THE NEAREST ONE" ────────────
 *
 * "Resolve an occurrence to the nearest occurrence of its series" was the
 * shape first proposed, and the data refused it: the MEDIAN distance to the
 * nearest occurrence we hold is 112 DAYS, because the calendar sweep fills a
 * recurring series FORWARDS (out to Aug 2027 on staging) while the knowledge
 * base holds artefacts from occurrences behind it. Nearest-match would have
 * hung last August's minutes on next August's meeting — a wrong answer
 * wearing the shape of a right one, which is the more expensive kind.
 *
 * Inside half a day it is the same call by construction: a series cannot have
 * two occurrences twelve hours apart and still be the weekly, daily or
 * fortnightly rhythm these all are. Outside it, this refuses, and 105 sources
 * keep a null — the honest answer, and the one the Meetings backfill question
 * is really about.
 *
 * ── AND IT SELF-HEALS ──────────────────────────────────────────────────
 *
 * It runs on every read of every lane, and the upsert writes `event_id` on
 * every pass (COALESCE keeps a value only where the new one is null), so a
 * source read BEFORE its meeting existed is settled by a later tick with no
 * backfill to run and no repair door for anybody to remember. */
export function settledEvent(r: IngestRow, targets: FoldTargets): IngestRow {
  const stated = r.eventId
  // Nothing to settle, or the id already names a call we hold.
  if (!stated || targets.events.has(stated)) return r
  const cut = stated.indexOf("_")
  if (cut <= 0) return r
  const held = targets.occurrences.get(stated.slice(0, cut))
  if (!held?.length) return r
  // `YYYYMMDDTHHMMSSZ` → an instant. Anything else is not an occurrence stamp
  // and is left exactly as Google gave it.
  const s = stated.slice(cut + 1)
  if (!/^\d{8}T\d{6}Z$/.test(s)) return r
  const at = Date.parse(
    `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(11, 13)}:${s.slice(13, 15)}Z`
  )
  if (!Number.isFinite(at)) return r
  // NEAREST within the window, not merely the first one inside it. With a
  // weekly series the two are the same answer; they stop being the same the day
  // somebody schedules a series twice in one day, and a rule that is only right
  // because of the data it happens to meet is not a rule.
  let best: { id: string; gap: number } | null = null
  for (const o of held) {
    const started = Date.parse(o.startsAt)
    if (!Number.isFinite(started)) continue
    const gap = Math.abs(started - at)
    if (gap <= SAME_CALL_WINDOW_MS && (!best || gap < best.gap)) best = { id: o.id, gap }
  }
  return best ? { ...r, eventId: best.id } : r
}

/** HOW FAR APART TWO OF GOOGLE'S IDS MAY BE AND STILL NAME THE SAME CALL.
 *
 * Twelve hours, and the number is chosen by what a recurring call IS rather than
 * by taste: every standing series in this base is daily, weekly or fortnightly,
 * so it cannot hold two occurrences half a day apart, and inside that window a
 * match is the same call by construction rather than by proximity. See
 * `settledEvent` for the measurement that ruled out matching on nearness alone.
 */
const SAME_CALL_WINDOW_MS = 12 * 60 * 60 * 1000

export type FoldTargets = {
  transcripts: Set<string>
  events: Set<string>
  /** THE CALLS WE HOLD, GROUPED BY THEIR SERIES — the oracle behind
   * `settledEvent`. Keyed by `recurring_event_id`, each entry the occurrence's
   * own Google id and when it actually starts. Only meetings that carry a
   * series are in here: a one-off has nothing to be confused with. */
  occurrences: Map<string, { id: string; startsAt: string }[]>
}
async function readFoldTargets(cfg: D1Rest, guard: MemberGuard): Promise<FoldTargets> {
  const [meetings, events] = await Promise.all([
    // R14 hard cap: one team's meetings, stated at the statement.
    d1Query<{
      title: string
      transcript_file_id: string | null
      superseded_transcript_ids: string | null
      google_event_id: string | null
      recurring_event_id: string | null
      starts_at: string | null
      words: number
    }>(
      cfg,
      guard.databaseId,
      `SELECT title, transcript_file_id, superseded_transcript_ids,
              google_event_id, recurring_event_id, starts_at,
              LENGTH(COALESCE(transcript_text, '')) AS words
         FROM meetings WHERE deactivated_at IS NULL LIMIT ${FOLD_ORACLE_CAP}`
    ),
    // R14 hard cap: the calendar entries this base already mirrors.
    d1Query<{ title: string }>(
      cfg,
      guard.databaseId,
      `SELECT title FROM knowledge_sources
        WHERE kind = 'event' AND deactivated_at IS NULL LIMIT ${FOLD_ORACLE_CAP}`
    ),
  ])
  // A TRANSCRIPT ONLY COUNTS WHEN THE MEETING REALLY HOLDS THE WORDS. Folding
  // the Drive copy while the app's own row is empty would leave the base with
  // neither, which is the one outcome worse than the duplication — and it is
  // the SAME clause for a runner-up as for the winner, on purpose: a runner-up
  // is only known-inferior relative to a winner that is genuinely still there.
  const held = meetings.filter((m) => m.transcript_file_id && m.words > 0)
  return {
    transcripts: new Set([
      ...held.map((m) => m.transcript_file_id as string),
      // EVERY DOCUMENT A HUNT FOR THIS MEETING HAS EVER READ AND REJECTED — an
      // ID join exactly like the winner's above, and unconditional beyond the
      // same "the meeting really holds words" gate: a file lands in this column
      // only because `fromAttachments`/`refreshTranscript` already proved a
      // STRICTLY fuller candidate for the same event beat it (google-transcript.ts,
      // meetings.ts), so there is no "does it hold words" test left to apply a
      // second time — it held fewer of them than the one that won, and that is
      // the whole of the decision. See migration 0070.
      ...held.flatMap((m) => (m.superseded_transcript_ids ?? "").split(",").filter(Boolean)),
    ]),
    events: new Set([...meetings.map((m) => m.title), ...events.map((e) => e.title)]),
    occurrences: meetings.reduce((by, m) => {
      if (!m.recurring_event_id || !m.google_event_id || !m.starts_at) return by
      const list = by.get(m.recurring_event_id) ?? []
      list.push({ id: m.google_event_id, startsAt: m.starts_at })
      by.set(m.recurring_event_id, list)
      return by
    }, new Map<string, { id: string; startsAt: string }[]>()),
  }
}

/** How many rows either half of the fold oracle will read. One agency's meetings
 * and calendar entries, so a cap is the honest shape (R14) — and a base that
 * outgrows it wants a decision rather than a silent truncation. */
const FOLD_ORACLE_CAP = 20000

/** HOW MANY OF THIS PERSON'S ALREADY-FILED GMAIL IDS ONE TICK WILL SAMPLE. R14
 * hard cap. `gmailSearch` can only ever list GMAIL_SWEEP_PAGES × GOOGLE_PAGE_SIZE
 * = 200 ids in one tick, so a known id outside this sample just costs one
 * redundant, harmless header read on that one message — not a correctness
 * question, an efficiency one, and a generous one at that. */
const KNOWN_GMAIL_SAMPLE = 500

/** IDS THIS PERSON'S GMAIL LANE HAS ALREADY FILED — active or retired, because
 * a retired row still means "already processed", and that is the only signal
 * `gmailSearch`'s header skip needs (see its own doc). Never applied unless the
 * caller already holds a cursor for this lane (see `slice` below): a null
 * cursor means either a first connection or a deliberate `rewindGoogleLane`,
 * and both mean "read it all again" — which is exactly what NOT calling this
 * preserves, untouched.
 *
 * THIS IS WHY THE SWEEP HAS BEEN COSTING ~204 GMAIL CALLS A TICK PER MAILBOX
 * EVEN WHEN NOTHING IS NEW (documents/COSTS.md §3, 2026-09-10): every one of
 * the newest 200 messages got a header read solely to learn a date the cursor
 * was about to discard it by. This is the same discard, made from a fact the
 * database already holds instead of a fact Google has to be asked for again. */
/** WHETHER THIS TICK MAY SKIP A KNOWN GMAIL ID'S HEADER — named, not inlined at
 * the call site, so a test can assert the RULE rather than infer it from
 * behaviour (the same choice `isItemRefusal` in google-api.ts makes, and for
 * the same reason: the day this reads `cursor !== null` alone again, a test
 * should say so by name rather than by a mailbox slowly losing new mail).
 *
 * `cursor !== null` IS ONLY HALF OF "A REAL CURSOR". A null cursor means
 * "read it all" — a first connection, or a lane `rewindGoogleLane`
 * deliberately forgot — and skipping a known id's header there would defeat
 * the one mechanism this app has for saying "bring that back". That much a
 * plain null check catches.
 *
 * `cursor.at === ""` IS THE SAME CASE WEARING A NON-NULL OBJECT, and a plain
 * null check does not catch it. `moment()` has exactly two shapes, a real ISO
 * date or the empty string for a row with no readable date (its own doc —
 * "swept FIRST rather than never"), and nothing stops a slice from being
 * filled entirely by date-less rows, which stores `last = { at: "", id: … }`
 * (knowledge-ingest.ts) as this lane's new position. A placeholder also
 * carries `sortAt === ""` (see the note above `knownPlaceholder` in
 * google-api.ts), so against an EMPTY cursor `afterCursor`'s own equality
 * branch (`r.sortAt === cursor.at && r.originRowId > cursor.id`) can keep one
 * — unlike against a real cursor, where a placeholder's empty sortAt is never
 * `>` a real date and the first branch alone excludes it. Kept placeholders
 * sort first (same reason), so `wanted` fills with content-free rows before
 * any real new mail behind them is ever reached, and the lane's `last` stays
 * `""` forever — the transient state `moment()`'s own comment describes
 * becomes absorbing. See `knownGmailIds`'s own doc for what the skip trades
 * away in return, once it is safe to apply. */
export function gmailKnownIdsApply(
  service: GoogleService,
  cursor: { at: string; id: string } | null
): boolean {
  return service === "gmail" && cursor !== null && cursor.at !== ""
}

export async function knownGmailIds(cfg: D1Rest, guard: MemberGuard): Promise<Set<string>> {
  try {
    // "KNOWN TO ME" IS STILL A QUESTION ABOUT THIS READER, even though the id
    // itself no longer carries them — a Gmail thread id is scoped to ONE
    // MAILBOX (kb_B1's own finding: three readers, zero id collisions across
    // 436 live mails), so a thread known to a colleague says nothing about
    // whether THIS mailbox has ever produced it. What changed is where the
    // answer is READ from: not a string prefix on `origin_row_id`, which no
    // longer names anybody, but a live sighting of THIS person's.
    const rows = await d1Query<{ origin_row_id: string }>(
      cfg,
      guard.databaseId,
      // R14 hard cap: KNOWN_GMAIL_SAMPLE.
      `SELECT s.origin_row_id FROM knowledge_sources s
         JOIN knowledge_sightings sg ON sg.source_id = s.id
        WHERE s.origin_table = 'google_gmail' AND sg.seen_by_user_id = ? AND sg.gone_at IS NULL
        ORDER BY s.updated_at DESC LIMIT ${KNOWN_GMAIL_SAMPLE}`,
      [guard.userId]
    )
    return new Set(rows.map((r) => r.origin_row_id))
  } catch {
    // FAIL SAFE, NEVER FAIL SILENT ABOUT COST: an empty set here does not mean
    // "nothing is known", it means "the read that would have told us failed" —
    // and the caller cannot tell the two apart. That is fine, because the only
    // consequence of an empty set is paying for the expensive, always-correct
    // path this function exists to make less FREQUENT, never the cheap one.
    return new Set()
  }
}

/* ────────────────── THE BACKWARD WALK — migration 0082 ──────────────────────
 *
 * `knowledge_ingest.cursor` (above, and knowledge-ingest.ts) watermarks how
 * far a kind has FILED. It says nothing about how far a Google kind has
 * LOOKED: gmail and calendar read a fixed window near "now" every tick — the
 * newest ~200 threads, whatever `calendarList` hands back with no
 * `timeMin`/`timeMax` at all — and once everything in that window is filed,
 * every later tick reads the SAME window and finds nothing new. History
 * older than the window's floor was never going to be reached by a cursor
 * that only ever watermarks what was SEEN, because nothing ever asks Google
 * to look further back. `backfilled_through` (`knowledge_ingest`) and
 * `chat_backfilled_through` (`google_sources`, one row per named space — see
 * below) are that second watermark, walked independently of the forward one
 * and merged into the same tick's rows.
 *
 * ONE FLOOR, THE OWNER'S OWN NUMBER: `BACKFILL_YEARS_BACK` /
 * `BACKFILL_SLICE_DAYS`, imported from `meetings.ts` rather than
 * re-declared — meetings' own 5-year calendar backfill already proved this
 * shape in production, and two copies of "five years" is two places the
 * owner's ruling can drift apart.
 *
 * TWO DIRECTIONS, NOT ONE, because the two Google APIs involved hand results
 * back in OPPOSITE orders and a backward walk is only gap-free when it reads
 * its ALREADY-CONFIRMED boundary FIRST — see the header on
 * `meetings.ts`'s own `backfillCursor`: "forward-only is the whole safety of
 * it… a pair of frontiers crawling outwards from today can [leave a gap] the
 * first time a slice truncates." A single frontier is gap-free only when a
 * truncated read is guaranteed to have covered ground CONTIGUOUS with what
 * was already confirmed, which depends on which end of the query window the
 * API reads first:
 *
 *   • `calendarList` (`google-api.ts`) always orders ascending
 *     (`orderBy: "startTime"`, Google's own requirement for it) — the read
 *     starts at the OLDER edge. So calendar (and chat's own backfill below,
 *     which chooses `orderBy: "createTime"` ascending on purpose to match)
 *     walk RISING: from the floor toward now, exactly `meetings.ts`'s own
 *     shape. A truncated read has fully covered `[from, X]` for some
 *     `X < to` — contiguous with the already-confirmed ground below `from`,
 *     never with a hole next to it.
 *   • Gmail's `messages.list` has no ordering parameter at all and always
 *     returns newest-first. Forcing calendar's shape onto it would mean the
 *     read starts at `to` — the NEW, not-yet-confirmed edge — so a truncated
 *     read (verified below: at the measured historical rate a 90-day slice
 *     holds roughly 700 threads against a 200-thread page budget, so
 *     truncation is the ORDINARY case here, not the exception calendar
 *     treats it as) would credit ground next to the wrong boundary and open
 *     a permanent hole beside the existing frontier. So gmail walks FALLING
 *     instead: from now toward the floor, reading `to` (already-adjacent to
 *     the live window) first — the same safety property, mirrored to match
 *     the one order Gmail will actually give it.
 *
 * BOTH DIRECTIONS STOP FOR REAL. `now` (and the floor) recompute fresh every
 * call — cheap, and correct for the live windows, which is why
 * `meetings.ts`'s own future-facing ceiling is happy to "keep pace with it,
 * a slice at a time, for ever": the future keeps producing new ground to
 * keep pace WITH. This walk has an actual finish line — the ordinary forward
 * sweep already owns everything from near-now onward — so recomputing a
 * live boundary every tick would reopen a sliver-sized slice for ever,
 * costing a Google call every fifteen minutes for five years for nothing
 * anyone would ever notice. `BACKFILL_DONE` is the explicit "stop asking"
 * flag that a moving `now` cannot quietly undo.
 */

/** THE SENTINEL, not a timestamp — and it never crosses the boundary of this
 * file. A stored value this cannot parse as a date would fall back to "never
 * backfilled" and restart the whole walk from the floor — the opposite of
 * done — which is why every read of the raw column goes through
 * `stateFromRaw` before anything else touches it, and every write goes
 * through `rawFromState` on the way back out. Nothing outside those two
 * functions may compare the raw column value, in TypeScript or in SQL: a
 * `WHERE backfilled_through < ?` written anywhere else would compare
 * `"caught-up"` against an ISO string and get an answer that happens to work
 * by an accident of alphabet, until one day it does not. */
const BACKFILL_DONE = "caught-up"

/** THE ONE SHAPE EVERY CALLER SEES — never the raw column, never the
 * sentinel string. `through: null` means "never backfilled at all", which is
 * a real, distinct state from `done` (nothing walked yet) and from a real
 * timestamp (walked, not yet finished). */
export type BackfillState = { done: true } | { done: false; through: string | null }

function stateFromRaw(raw: string | null): BackfillState {
  return raw === BACKFILL_DONE ? { done: true } : { done: false, through: raw }
}

function rawFromState(state: BackfillState): string {
  return state.done ? BACKFILL_DONE : (state.through ?? "")
}

/** RISING: floor → now, ascending. Calendar, and chat's own per-space walk.
 *
 * WHY ASCENDING IS RISING AND NOT A PREFERENCE: Google returns ascending and
 * offers no descending option for either lane that uses this direction
 * (`calendarList`'s own `orderBy: "startTime"`, and chat's backfill choosing
 * `orderBy: "createTime"` to match). A forward walk reads from the CONFIRMED
 * frontier into new territory, so a truncated read trims the far,
 * unattempted edge and the confirmed region stays contiguous — nothing is
 * ever credited that was not actually seen. A backward walk over the same
 * ascending order would read from the UNEXPLORED end instead, so a
 * truncation drops entries adjacent to the safe frontier — and crediting
 * that read opens a permanent hole the walk has already moved past. It would
 * never be found again, because nothing ever revisits ground behind a
 * single, forward-only frontier. That is exactly the failure `meetings.ts`'s
 * own header warns about ("a pair of frontiers crawling outwards from
 * today… does [leave a gap] the first time a slice truncates"), and it is
 * why this direction is not a simplification waiting to happen — walking
 * this backward would silently reintroduce it.
 *
 * `null` means no Google call this tick — either genuinely done or,
 * transiently, a slice that already reached `now` (the caller is expected to
 * persist the done state once it sees that; see `advanceRisingBackfill`).
 * The floor recomputes off `now` every call, same as `meetings.ts`'s own. */
export function risingBackfillWindow(now: Date, state: BackfillState): { from: string; to: string } | null {
  if (state.done) return null
  const floor = new Date(now.getTime() - BACKFILL_YEARS_BACK * 365 * 24 * 60 * 60 * 1000)
  const parsed = Date.parse(state.through ?? "")
  const from = Number.isFinite(parsed) && parsed > floor.getTime() ? new Date(parsed) : floor
  if (from.getTime() >= now.getTime()) return null
  const to = new Date(Math.min(from.getTime() + BACKFILL_SLICE_DAYS * 24 * 60 * 60 * 1000, now.getTime()))
  return { from: from.toISOString(), to: to.toISOString() }
}

/** MOVE THE RISING WALK ON, honestly — mirrors `meetings.ts`'s own
 * `advanceBackfill` exactly: a truncated read (ascending) has covered
 * `[window.from, lastEntryAt]`, so the next call resumes there rather than
 * at `window.to`; a truncated read whose last entry starts no later than
 * `window.from` (a pile of simultaneous entries) advances anyway rather
 * than stalling for ever, same degenerate case, same answer. Reaching `now`
 * returns `{done:true}` instead of a timestamp `now` would immediately be
 * behind on the very next call — see the header on `BACKFILL_DONE` for why a
 * moving `now` cannot be allowed to undo that once it is reached. */
function advanceRisingBackfill(
  now: Date,
  window: { from: string; to: string },
  truncated: boolean,
  lastEntryAt: string | null
): BackfillState {
  let next = window.to
  if (truncated) {
    const at = Date.parse(lastEntryAt ?? "")
    if (Number.isFinite(at) && at > Date.parse(window.from)) next = new Date(at).toISOString()
  }
  return Date.parse(next) >= now.getTime() ? { done: true } : { done: false, through: next }
}

/** FALLING: now → floor, and the read must start at `to` — see the header on
 * `risingBackfillWindow` for why gmail alone walks this direction (Gmail's
 * `messages.list` has no ordering parameter and always returns newest-first,
 * so `to` — already adjacent to the live window — is the end that reads
 * first here, the same safety property mirrored to match the one order
 * Gmail will actually give it). `through: null` here means "nothing
 * confirmed yet", which reads as "start at now". */
function fallingBackfillWindow(now: Date, state: BackfillState): { from: string; to: string } | null {
  if (state.done) return null
  const floor = new Date(now.getTime() - BACKFILL_YEARS_BACK * 365 * 24 * 60 * 60 * 1000)
  const parsed = Date.parse(state.through ?? "")
  const to = Number.isFinite(parsed) && parsed < now.getTime() ? new Date(parsed) : now
  if (to.getTime() <= floor.getTime()) return null
  const from = new Date(Math.max(to.getTime() - BACKFILL_SLICE_DAYS * 24 * 60 * 60 * 1000, floor.getTime()))
  return { from: from.toISOString(), to: to.toISOString() }
}

/** MOVE THE FALLING WALK ON — the mirror image of `advanceRisingBackfill`:
 * the read starts at `window.to` (newest-first), so a truncated read has
 * covered `[firstEntryAt, window.to]` and the next call resumes at
 * `firstEntryAt` rather than at `window.from`. Reaching the floor returns
 * `{done:true}` for the same reason the rising walk does at `now`. */
function advanceFallingBackfill(
  now: Date,
  window: { from: string; to: string },
  truncated: boolean,
  firstEntryAt: string | null
): BackfillState {
  let next = window.from
  if (truncated) {
    const at = Date.parse(firstEntryAt ?? "")
    if (Number.isFinite(at) && at < Date.parse(window.to)) next = new Date(at).toISOString()
  }
  const floor = new Date(now.getTime() - BACKFILL_YEARS_BACK * 365 * 24 * 60 * 60 * 1000)
  return Date.parse(next) <= floor.getTime() ? { done: true } : { done: false, through: next }
}

/** THE ONE ACCESSOR — the hub's condition: gmail and calendar keep a single
 * watermark on their own `knowledge_ingest` row; chat's one row can stand
 * behind MANY named spaces (migration 0082's own header says why), so its
 * answer to "how far back has this kind's backfill reached" is DERIVED — the
 * MINIMUM across its own live spaces' watermarks, correctness first, never a
 * silent drop of a space that cannot be read (see `writeChatSpaceBackfillError`
 * for the half that keeps that honest). Both are right for their own shape,
 * and this is the ONE place that knows which is which — every caller that
 * wants a KIND's overall progress (as opposed to one space's own, which
 * `chatBackfillRows` still needs at finer grain than this) asks HERE, so
 * shipping a second way to answer the same question stays impossible by
 * construction rather than by remembering. */
async function backfilledThrough(
  cfg: D1Rest,
  guard: MemberGuard,
  kind: "gmail" | "calendar" | "chat",
  stateKey: string
): Promise<BackfillState> {
  if (kind !== "chat") {
    const rows = await d1Query<{ backfilled_through: string | null }>(
      cfg,
      guard.databaseId,
      // R14: one row by primary key.
      "SELECT backfilled_through FROM knowledge_ingest WHERE kind = ? LIMIT 1",
      [stateKey]
    )
    return stateFromRaw(rows[0]?.backfilled_through ?? null)
  }
  const rows = await d1Query<{ chat_backfilled_through: string | null }>(
    cfg,
    guard.databaseId,
    // R14: bounded by how many spaces one person can name (a hand-kept list).
    "SELECT chat_backfilled_through FROM google_sources WHERE user_id = ? AND service = 'chat' AND deactivated_at IS NULL",
    [guard.userId]
  )
  // NO LIVE SPACES IS VACUOUSLY DONE — there is nothing left to walk, which
  // is a true and different sentence from "walked and finished".
  if (rows.length === 0) return { done: true }
  const states = rows.map((r) => stateFromRaw(r.chat_backfilled_through))
  if (states.every((s) => s.done)) return { done: true }
  // A SPACE THAT HAS NEVER STARTED counts as the earliest possible position —
  // the minimum cannot be more advanced than its least-advanced member.
  const unfinished = states.filter((s): s is { done: false; through: string | null } => !s.done)
  if (unfinished.some((s) => s.through === null)) return { done: false, through: null }
  const throughs = unfinished.map((s) => s.through as string).sort()
  return { done: false, through: throughs[0] ?? null }
}

/** WHERE THE WALK HAS GOT TO, for gmail/calendar — `knowledge_ingest`, the
 * same row `sweepKind` already reads/writes for `cursor` (see migration
 * 0082's header for why this is one row, not two). An UPSERT rather than
 * `meetings.ts`'s bare UPDATE: unlike `google_connections` (a row created at
 * OAuth-connect time, always there before any sync runs), a `knowledge_ingest`
 * row for a stateKey that has never filed anything yet may not exist. The
 * other columns take their table defaults (`runs`/`sources_indexed` = 0) on
 * the INSERT branch; `sweepKind`'s own `recordRun` UPSERT (knowledge-ingest.ts)
 * reconciles them afterwards either way, whichever of the two writes this
 * tick happens to reach first. */
async function writeBackfillThrough(
  cfg: D1Rest,
  guard: MemberGuard,
  stateKey: string,
  state: BackfillState
): Promise<void> {
  await d1Query(
    cfg,
    guard.databaseId,
    `INSERT INTO knowledge_ingest (kind, backfilled_through) VALUES (?, ?)
       ON CONFLICT (kind) DO UPDATE SET backfilled_through = excluded.backfilled_through`,
    [stateKey, rawFromState(state)]
  )
}

/** CHAT'S OWN PER-SPACE READ — finer grain than `backfilledThrough` above on
 * purpose: `chatBackfillRows` decides each NAMED SPACE's own window, which is
 * a different question from the kind's overall progress and is answered from
 * the same row (`google_sources`) the space itself lives on, so a stall
 * shows up next to the space a person actually shared rather than buried in
 * an aggregate nobody can act on. */
async function readChatSpaceBackfill(cfg: D1Rest, guard: MemberGuard, sourceId: string): Promise<BackfillState> {
  const rows = await d1Query<{ chat_backfilled_through: string | null }>(
    cfg,
    guard.databaseId,
    // R14: one row by primary key.
    "SELECT chat_backfilled_through FROM google_sources WHERE id = ? LIMIT 1",
    [sourceId]
  )
  return stateFromRaw(rows[0]?.chat_backfilled_through ?? null)
}

/** ONE WRITE, both columns — success clears any earlier `chat_backfill_error`
 * (and its timestamp) in the SAME statement that advances the watermark, so
 * a space that stalled once and then recovers does not keep showing a stale
 * error next to fresh progress. A bare UPDATE is right here (unlike
 * `writeBackfillThrough`'s UPSERT): the row already exists — it is the named
 * space itself. */
async function writeChatSpaceBackfill(
  cfg: D1Rest,
  guard: MemberGuard,
  sourceId: string,
  state: BackfillState
): Promise<void> {
  await d1Query(
    cfg,
    guard.databaseId,
    `UPDATE google_sources
        SET chat_backfilled_through = ?, chat_backfill_error = NULL, chat_backfill_error_at = NULL
      WHERE id = ?`,
    [rawFromState(state), sourceId]
  )
}

/** THE STALL, RECORDED — the hub's ruling, structurally: `chat_backfilled_through`
 * is left exactly where it was (never wiped, same reasoning as
 * `recordRun`'s own `cursor`-preserving `ON CONFLICT`), and the error sits
 * beside it where the space's own row already is.
 *
 * `chat_backfill_error_at` is set ONLY ON THE FIRST FAILURE — the hub's own
 * addition: an error with no timestamp cannot distinguish "failed once an
 * hour ago" from "has been failing since June", and that distinction is the
 * difference between a person seeing "this space stopped working just now"
 * and a stall nobody has looked at in months. `COALESCE` against the
 * EXISTING column is what makes repeated failures leave it alone; only a
 * successful `writeChatSpaceBackfill` clears it, matching the message. */
async function writeChatSpaceBackfillError(
  cfg: D1Rest,
  guard: MemberGuard,
  sourceId: string,
  error: string,
  now: string
): Promise<void> {
  await d1Query(
    cfg,
    guard.databaseId,
    `UPDATE google_sources
        SET chat_backfill_error = ?,
            chat_backfill_error_at = COALESCE(chat_backfill_error_at, ?)
      WHERE id = ?`,
    [error, now, sourceId]
  )
}

export function googleIngestKinds(
  env: Env,
  cfg: D1Rest,
  guard: MemberGuard,
  /** WHAT GOOGLE STILL HAD, filled in as each kind reads — the other half of
   * `retireVanished` below, and the reason it costs no extra Google call. The
   * sweep already asks each service what it holds; this keeps the answer instead
   * of throwing it away. Optional, because a caller that only wants to INDEX has
   * no business being made to hold a map it will not read.
   *
   * THE SHELF RIDES ALONG NOW, not just the id — `sweepGoogle` is what reads it,
   * to write this person's SIGHTING of each item after the generic engine has
   * filed it. A `Set` could only ever answer "is this still there"; a sighting
   * also needs "on which shelf", which is the other half of what this pass
   * already read off Google a moment ago. */
  seen?: Map<GoogleService, Map<string, GoogleShelf>>
): IngestKind[] {
  /** WHAT GOOGLE SENT, WITH THE KNOWN DAMAGE MENDED — see shared/workers/mojibake.
   *
   * Google's own profile carries the owner's display name mis-decoded ("Ãlaap"),
   * and writes that spelling into everything it composes: an invitation's subject
   * line, a transcript's attendee list, a chat roster. 311 rows on staging.
   *
   * IT HAS TO HAPPEN HERE RATHER THAN IN A REPAIR SCRIPT. These four kinds are
   * `windowed`: the sweep re-reads what Google currently holds every fifteen
   * minutes and the upsert sets `title = excluded.title` unconditionally, so a
   * row repaired in the database is mangled again by the next tick. Correcting
   * the name on the Google account — which the owner has done — fixes everything
   * composed FROM NOW ON and cannot reach a subject line already sent. Of the
   * 311, only the 43 chat threads are rebuilt from the live directory and heal
   * themselves; the other 268 are frozen text that every sweep faithfully
   * re-reads.
   *
   * AND IT SITS ON THE ONE EXIT ALL FOUR LANES SHARE, not on each of the four
   * mappers. A fifth lane added tomorrow is mended because it goes through
   * `slice`, not because somebody remembered.
   *
   * Only known strings with a named source of truth are touched; anything else
   * is left exactly as Google sent it. */
  const mended = (r: IngestRow): IngestRow => ({
    ...r,
    title: mendMojibake(r.title),
    body: mendMojibake(r.body),
  })

  /* ── FOLD_TO_THE_APP_S_OWN_RECORD ─────────────────────────────────────────
   *
   * ONE EVENT, ONE RECORD. A single meeting arrives here as up to five sources:
   * the meeting row this app owns, the notes document Gemini leaves in Drive,
   * Google's "Invitation:" mail, an "Accepted:" mail per guest, and the calendar
   * entry. Five titles, one subject — and an answer built from six passages has
   * then told the reader one thing five times, spending four slots a different
   * real source did not get. Measured on staging 1 Sep 2026: 118 of 3,775 live
   * sources, 3.1% of the corpus.
   *
   * THE APP'S OWN RECORD IS CANONICAL, and the two rules say only that:
   *   · a Drive file that IS some meeting's transcript is the same words at a
   *     second address — an ID join on `transcript_file_id`, not a title guess;
   *   · a Google calendar notice for an event the base ALREADY HOLDS is an
   *     announcement of a record rather than a record.
   *
   * THE SECOND AGREEMENT IS WHAT MAKES EACH SAFE, and it is the same sentence
   * both times: fold only where the original is really there. A transcript
   * counts only if the meeting holds words; a notice folds only if we hold the
   * event. An invitation to something the base does not otherwise know about is
   * the ONLY record of it — measured, 40 of them on staging — and it stays.
   *
   * "Notes:" MAIL IS NOT A NOTICE AND IS NEVER FOLDED. It carries the meeting's
   * actual minutes, and the retrieval bench cites one as a correct answer.
   *
   * RETIRED, NOT SKIPPED. The source is written and DEACTIVATED, which is the
   * difference between "the assistant stops quoting it" and "the assistant
   * quotes it forever because the sweep never visits it again" — and it means a
   * row whose condition stops being true (the meeting's transcript is cleared)
   * is REVIVED by the engine on the next tick, with no repair door to remember.
   *
   * The oracle is read ONCE per sweep and shared by both lanes; a tick that
   * cannot read it folds nothing, which is the safe direction. */
  let oracle: Promise<FoldTargets> | null = null
  const foldTargets = (): Promise<FoldTargets> =>
    (oracle ??= readFoldTargets(cfg, guard).catch(() => ({
      transcripts: new Set<string>(),
      events: new Set<string>(),
      occurrences: new Map<string, { id: string; startsAt: string }[]>(),
    })))

  const folded = (service: GoogleService, r: IngestRow, targets: FoldTargets): IngestRow => {
    // `r.originRowId` IS the Drive file id, directly — since the identity gate
    // (kb_B1), `origin_row_id` for a `drive` row is the thing's own id and
    // nothing else, so the ID JOIN against `transcript_file_id` this comment
    // above promises is now literally this comparison, no parsing required.
    if (service === "drive") return targets.transcripts.has(r.originRowId) ? { ...r, retired: true } : r
    if (service === "gmail") {
      const named = eventNamedBy(r.title)
      return named && targets.events.has(named) ? { ...r, retired: true } : r
    }
    return r
  }

  /** WHICH CALL A GOOGLE ARTEFACT IS FROM, where Google itself says so.
   *
   * MAIL ONLY, AND NARROW ON PURPOSE. Google's calendar robot writes the event
   * into an invitation, an update, an acceptance and a decline as an `eid` link,
   * and that is a fact to be read (`calendarEventIdInText`). Nothing else here
   * is given the same treatment: a Drive document that quotes a calendar link is
   * quoting somebody's prose, and measured on staging on 8 Sep 2026 not one of
   * the 80 live Drive sources carries such a link anyway. A Chat message has no
   * such statement at all.
   *
   * It runs AFTER hydration, which is why it lives here and not in the gmail
   * lane's own mapper: a listing hands back a hundred-character snippet and the
   * link is far below it. It rides `slice` for the same reason the fold and the
   * mojibake mend do — a lane added tomorrow is covered because it goes through
   * this function, not because somebody remembered.
   *
   * THE NOTES MAIL IS THE ONE THIS CANNOT REACH, and it is the one that matters
   * most: 121 "Notes:" messages on staging, not one carrying an eid, a Meet link
   * or anything else naming the call — only the event's title in quotes, which
   * is exactly the inference this app does not make. They keep a NULL. */
  const statedEvent = (service: GoogleService, r: IngestRow): IngestRow => {
    if (service !== "gmail" || r.eventId) return r
    const eventId = calendarEventIdInText(r.body)
    return eventId ? { ...r, eventId, eventIdFrom: "mail" } : r
  }

  /** List cheaply, walk to the cursor, and only THEN pay for the bodies. A Drive
   * listing is one call for fifty files and their text is fifty more, so
   * hydrating before the slice would pay for forty-nine files this tick is not
   * going to file. */
  const slice = async (
    service: GoogleService,
    cursor: { at: string; id: string } | null,
    limit: number,
    toRows: (items: GoogleItem[]) => IngestRow[],
    hydrate = false,
    /** THE BACKFILL'S OWN WINDOW (migration 0082), when this call is walking
     * backward rather than watching the live one. Present ⇒ `readGoogleMaterial`
     * is bounded to it, `afterCursor` is skipped entirely (the window itself is
     * the bound; the forward cursor's position is irrelevant to material it has
     * already passed by, ahead or behind), and `truncated` is handed back so the
     * caller can advance the backfill honestly instead of guessing from the row
     * count alone. NOT recorded into `seen` — that map answers "what does
     * Google currently hold", and a bounded historical slice is a different,
     * much narrower question. */
    window?: { from: string; to: string }
  ): Promise<{ rows: IngestRow[]; truncated: boolean }> => {
    const gmailKnownIds = gmailKnownIdsApply(service, cursor) ? await knownGmailIds(cfg, guard) : undefined
    const { items, truncated } = await readGoogleMaterial(env, cfg, guard, {
      services: [service],
      gmailKnownIds,
      from: window?.from,
      to: window?.to,
    })
    // RECORDED BEFORE THE CURSOR NARROWS IT. The slice below is what this tick
    // will FILE; this is everything the service currently holds, which is a
    // different and much larger sentence — and it is the only one that can tell
    // "Google no longer has this" from "the cursor has already passed it".
    if (seen && !window) seen.set(service, new Map(items.map((i) => [i.externalId, i.shelf])))
    const ordered = inCursorOrder(toRows(items))
    const wanted = (window ? ordered : afterCursor(ordered, cursor)).slice(0, limit)
    // THE FOLD RIDES THE SAME EXIT `mended` DOES, and for the same reason: a
    // fifth lane added tomorrow is covered because it goes through `slice`, not
    // because somebody remembered.
    const targets = await foldTargets()
    const fold = (r: IngestRow) =>
      settledEvent(statedEvent(service, folded(service, mended(r), targets)), targets)
    if (!hydrate || wanted.length === 0) return { rows: wanted.map(fold), truncated }
    // Hydration is per ITEM, so the slice is mapped back to the items it came
    // from — by the id this module builds, which is the only key both sides share.
    const byId = new Map(items.map((i) => [rowId(i), i]))
    // A skipped item is already named in the log `hydrateText` writes (one
    // unreadable file must not cost the tick the rest of its slice); the sweep
    // itself just carries on with what each item already had.
    const { items: full } = await hydrateText(
      env,
      cfg,
      guard,
      wanted.map((r) => byId.get(r.originRowId)).filter((i): i is GoogleItem => Boolean(i))
    )
    const textById = new Map(full.map((i) => [rowId(i), i.text]))
    return { rows: wanted.map((r) => fold({ ...r, body: textById.get(r.originRowId) || r.body })), truncated }
  }

  /** ONE KIND'S BACKWARD WALK, folded into its regular forward read — the
   * shape shared by calendar (rising) and gmail (falling): read the current
   * `backfilled_through`, compute this tick's slice, read it through the
   * SAME `slice()` every regular read uses (same fold, same fencing, same
   * mojibake mend — a fifth backfilled kind gets all of that for free), and
   * advance the watermark by what was ACTUALLY read, never by what was asked
   * for. Merged with the forward rows by `originRowId` — an item both windows
   * happen to see this tick is upserted once, not filed twice (the fold's own
   * `ON CONFLICT`, R68, already makes a double-upsert harmless; this is
   * simply not doing it twice on purpose). Returns `[]` and touches Google
   * not at all once the walk is done — `risingBackfillWindow`/
   * `fallingBackfillWindow` returning `null` is the whole of that. */
  const backfillRows = async (
    service: "calendar" | "gmail",
    stateKey: string,
    limit: number,
    toRows: (items: GoogleItem[]) => IngestRow[],
    hydrate: boolean,
    rising: boolean
  ): Promise<IngestRow[]> => {
    const now = new Date()
    const state = await backfilledThrough(cfg, guard, service, stateKey)
    const window = rising ? risingBackfillWindow(now, state) : fallingBackfillWindow(now, state)
    if (!window) return []
    const { rows, truncated } = await slice(service, null, limit, toRows, hydrate, window)
    const boundary = rows.map((r) => r.sortAt).filter(Boolean).sort()
    const next = rising
      ? advanceRisingBackfill(now, window, truncated, boundary[boundary.length - 1] ?? null)
      : advanceFallingBackfill(now, window, truncated, boundary[0] ?? null)
    await writeBackfillThrough(cfg, guard, stateKey, next)
    return rows
  }

  /** MERGE THE TWO WINDOWS BY `originRowId` — the forward read wins a
   * collision (it is the one already trusted to decide `retired`/fold state
   * for the live case), matching `meetings.ts`'s own dedup-by-id over
   * `past ∪ future ∪ slice`. */
  const mergeWindows = (forward: IngestRow[], backfill: IngestRow[]): IngestRow[] => {
    const byId = new Map(forward.map((r) => [r.originRowId, r]))
    for (const r of backfill) if (!byId.has(r.originRowId)) byId.set(r.originRowId, r)
    return [...byId.values()]
  }

  /** CHAT'S PER-SPACE RISING WALK — the shape the hub ruled on: correctness
   * first (a stalled space never gets silently dropped from the answer), a
   * stall RECORDED rather than swallowed (`chat_backfill_error`, next to the
   * space that produced it), and each space's own frontier kept on its own
   * row so the aggregate is never the only place the truth lives.
   *
   * ONE PAGE PER SPACE PER TICK, ascending (`chatMessages`'s own `window`
   * param — see its header for why ascending is the direction that keeps a
   * truncated read gap-free here, same reasoning as `risingBackfillWindow`).
   * A dense space simply takes more ticks to drain its own history; it does
   * not cost any OTHER space a turn, and it does not cost the live read a
   * thing — this is an entirely separate call, bounded on its own. */
  const chatBackfillRows = async (
    toRows: (items: GoogleItem[]) => IngestRow[],
    limit: number
  ): Promise<IngestRow[]> => {
    const token = await tokenOrNull(env, cfg, guard, "chat")
    if (!token) return []
    const now = new Date()
    const rows: IngestRow[] = []
    const known = await knownChatPeople(cfg, guard)
    for (const space of (await listNamedSources(cfg, guard, "chat")).filter((s) => s.active)) {
      const state = await readChatSpaceBackfill(cfg, guard, space.id)
      const window = risingBackfillWindow(now, state)
      if (!window) continue
      let page: { messages: ChatMessage[]; learned: Map<string, string>; truncated: boolean }
      try {
        page = await chatMessages(token, space.externalId, known, window)
      } catch (e) {
        if (isConnectionLost(e)) throw e
        const reason = e instanceof Error ? e.message : String(e)
        await writeChatSpaceBackfillError(cfg, guard, space.id, reason, now.toISOString())
        continue
      }
      for (const [id, name] of page.learned) known.set(id, name)
      const items = chatThreads(page.messages).map((m) => chatThreadItem(space, m, guard.userId))
      const mapped = toRows(items)
      rows.push(...mapped.slice(0, limit))
      const sortAts = mapped.map((r) => r.sortAt).filter(Boolean).sort()
      const next = advanceRisingBackfill(now, window, page.truncated, sortAts[sortAts.length - 1] ?? null)
      await writeChatSpaceBackfill(cfg, guard, space.id, next)
    }
    return rows
  }

  return [
    {
      kind: KIND_OF.drive,
      stateKey: googleStateKey("drive", guard.userId),
      // The `origin_table` is not a table in this database — it is where the row
      // came FROM, and these four came from outside it. Naming them for the
      // service is what keeps `(origin_table, origin_row_id)` unique across the
      // four, and what lets somebody reading a source row see at a glance that
      // its original is not something this app owns.
      table: "google_drive",
      label: "Drive documents",
      windowed: true,
      textVersion: 1,
      read: async (_cfg, _guard, cursor, limit) =>
        (
          await slice(
            "drive",
            cursor,
            limit,
            (items) =>
              items.map((item) => ({
                originRowId: rowId(item),
                sortAt: moment(item.updatedAt),
                // WHEN THIS IS FROM. Every Google lane already builds this moment
                // for its cursor and none of them wrote it to the row, so 799 of the
                // agency's 4,026 sources — every email, document, chat thread and
                // calendar entry, 20% of the base — carried no date at all. Nothing
                // that reasons about "latest" or "since last week" can see them.
                recordDate: moment(item.updatedAt) || null,
                title: item.title,
                // Empty until hydration — the listing has no text in it at all.
                body: "",
                sourceUrl: item.url,
                ...fencing(item),
              })),
            true
          )
        ).rows,
      // NO BACKWARD WALK HERE, ON PURPOSE. `driveList` lists an entire named
      // folder every call (bounded by the folder's own size, not by a "newest
      // N" window near now) — there is no history beyond what one call already
      // reaches, so migration 0082's blindness does not apply to Drive at all.
      // Measured: Drive's own gap after the wipe was zero.
    },
    {
      kind: KIND_OF.gmail,
      stateKey: googleStateKey("gmail", guard.userId),
      table: "google_gmail",
      label: "mail with a client",
      windowed: true,
      // 2 SINCE 10 SEP 2026 — the unit changed from a message to a thread and
      // the body changed with it (google-read.ts's `mailThreads`, BUILD-5
      // §2), so every stored cursor has to rewind. Without the bump the
      // sweep keeps the position it reached over the OLD per-message rows,
      // finds almost every thread to be "before" it, and files almost
      // nothing while reporting itself caught up — chat measured exactly
      // this on 20 Aug 2026 (`read: 1, indexed: 1, caughtUp: true` against
      // five spaces holding fifty messages each) when it made the same move.
      textVersion: 2,
      read: async (_cfg, _guard, cursor, limit) => {
        const toRows = (items: GoogleItem[]) =>
          items.map((item) => ({
            originRowId: rowId(item),
            sortAt: moment(item.updatedAt),
            // WHEN THIS IS FROM — the mail's own date. See the drive lane above.
            recordDate: moment(item.updatedAt) || null,
            title: item.title,
            // The snippet until hydration replaces it with the real body. It is
            // a hundred characters, which is enough to be worth having and not
            // enough to answer anything — which is why mail is hydrated.
            body: item.text,
            sourceUrl: item.url,
            ...fencing(item),
          }))
        // FALLING (now → floor): Gmail's `messages.list` has no ordering
        // parameter and always returns newest-first — see the header on
        // `fallingBackfillWindow` above for why that is the direction that
        // keeps a truncated read gap-free here specifically.
        //
        // SEQUENTIAL, not `Promise.all` — two independent Gmail searches at
        // once is two independent rate-limit risks for one tick's read; this
        // walk has no deadline the way the live window does, so there is
        // nothing bought by racing them.
        const { rows: forward } = await slice("gmail", cursor, limit, toRows, true)
        const backfill = await backfillRows(
          "gmail",
          googleStateKey("gmail", guard.userId),
          limit,
          toRows,
          true,
          false
        )
        return mergeWindows(forward, backfill)
      },
    },
    {
      kind: KIND_OF.calendar,
      stateKey: googleStateKey("calendar", guard.userId),
      table: "google_calendar",
      label: "calendar entries",
      windowed: true,
      // 2 SINCE 27 AUG 2026 — an occurrence that has not happened is no longer
      // filed (below). The rows already filed sit behind the cursor, so without
      // the bump the 204 of them in staging would stay there for ever: the bump
      // is what makes the sweep walk back and re-decide every entry.
      textVersion: 2,
      // READING FROM THE CALENDAR IS WHAT TELLS THE KNOWLEDGE BASE WHAT WAS
      // AGREED WHEN. A meeting's title and the note somebody put in the
      // description are usually the only written record that a decision was
      // taken on a Tuesday in March — and "when did we agree that?" is a question
      // no other table in this app can answer.
      //
      // ── BUT AN EMPTY ONE THAT HAS NOT HAPPENED IS NOT A RECORD OF ANYTHING ──
      //
      // A recurring series is one calendar entry per occurrence, for ever
      // forwards. With no description on it, every one of those says exactly
      // this and nothing else: "Met on 2027-09-10." — about a day that has not
      // arrived, which is not merely empty but untrue.
      //
      // MEASURED ON STAGING, 27 Aug 2026. 236 of the team's 237 calendar sources
      // had no description at all, and 204 of those were dated in the future. Not
      // 204 subjects: FOUR. "Week recap" ninety-two times, "Week planning"
      // ninety-one, "Team Assembly" twenty, one other.
      //
      // WHAT IT COST, and it is not the disk. Asked "what did we agree in the
      // week recap?", every one of the thirty nearest chunks in the index was one
      // of these placeholders — the title matches what a person types, exactly,
      // ninety-two times over — and the 96-chunk transcript of the meeting they
      // meant never reached the ranking at all. The answer was "we have nothing
      // on that", about a meeting the base holds a full transcript of. A ranking
      // cannot recover from that and neither can the diversifier, which only ever
      // sees what the search already chose.
      //
      // NARROW, AND IT UNDOES ITSELF. Only an entry with NO words of its own and
      // a date still ahead: an agenda somebody typed is kept whatever its date,
      // and a bare PAST entry is kept too — that one really is the record that a
      // meeting happened, which is what the paragraph above defends. And because
      // this retires rather than skips, the day the meeting finally happens the
      // condition stops being true, the sweep meets a live row, and the engine
      // revives it (see `sweepKind` — the app may undo its own retirement).
      read: async (_cfg, _guard, cursor, limit) => {
        const toRows = (items: GoogleItem[]) => {
          const now = new Date().toISOString()
          return items.map((item) => {
            const at = moment(item.updatedAt)
            return {
              originRowId: rowId(item),
              sortAt: at,
              // WHEN THIS IS FROM — the entry's own moment. See the drive lane.
              recordDate: at || null,
              // THE ENTRY IS THE EVENT. `externalId` is Google's own event id —
              // the same string the meetings table stores as `google_event_id`
              // and the same one a calendar notice carries in its `eid` — so this
              // is a fact read off the item, not a match made against it.
              eventId: item.externalId || null,
              eventIdFrom: item.externalId ? "origin" : null,
              // AN ENTRY WITH NO DESCRIPTION IS THE APP'S OWN SENTENCE — "Met on
              // 3 Sep." and nothing else. Findable, never quoted: KB-AUDIT.md
              // §4.3 measured `event` at forty characters a chunk, the shortest
              // in the base, which is exactly what makes it beat real documents
              // on name-shaped questions. An agenda somebody typed is material
              // and keeps its pieces.
              generatedOnly: !item.text,
              title: item.title,
              body: [`Met on ${(at || "an unknown date").slice(0, 10)}.`, item.text]
                .filter(Boolean)
                .join("\n\n"),
              sourceUrl: item.url,
              // An unparseable moment is empty, and "" is never after now — so a
              // date we could not read keeps its entry rather than losing it.
              retired: !item.text && at > now,
              ...fencing(item),
            }
          })
        }
        // RISING (floor → now): `calendarList` always orders ascending, the
        // one direction that keeps a truncated slice gap-free here — see the
        // header on `risingBackfillWindow` above. Sequential for the same
        // reason gmail's own backfill is: no deadline to race against.
        const { rows: forward } = await slice("calendar", cursor, limit, toRows)
        const backfill = await backfillRows(
          "calendar",
          googleStateKey("calendar", guard.userId),
          limit,
          toRows,
          false,
          true
        )
        return mergeWindows(forward, backfill)
      },
    },
    {
      kind: KIND_OF.chat,
      stateKey: googleStateKey("chat", guard.userId),
      table: "google_chat",
      label: "Chat conversations",
      windowed: true,
      // 3 SINCE 31 AUG 2026 — the app-only retirement below. It changes no TEXT,
      // so nothing here needs re-embedding; what it needs is for the sweep to
      // MEET the conversations it has already filed, and a cursor is exactly what
      // stops that. A windowed kind does rewind on its own — but only on a tick
      // that finds nothing new (`sweepKind`: `rows.length === 0`), and a space
      // receiving a trickle of messages consumes every tick without ever
      // rewinding. Measured on staging: 90 minutes and seven ticks after the
      // deploy, not one of the 21 notification threads had been re-read, and
      // there was no hour at which it was going to happen. Unbounded, not slow.
      //
      // WHAT THE BUMP COSTS, measured rather than assumed, because this lane
      // first declined to bump on the belief that it would re-embed the lot:
      // one upsert per conversation and NO embedding call, since every hash is
      // unchanged and the hash-skip returns before `indexSource`. On staging,
      // three re-read chat sources kept `indexed_at` values an hour older than
      // the `updated_at` the re-read gave them. `knowledge-coverage.test.ts`
      // holds both halves down now — the rewind, and the skip.
      //
      // 2 SINCE 20 AUG 2026 — the unit changed from a space to a thread and the
      // body changed with it, so every stored cursor has to rewind. Without the
      // bump the sweep kept the position it had reached over the OLD rows, found
      // almost every conversation to be "before" it, and filed one thread out of
      // a hundred while reporting itself caught up. Measured live: `read: 1,
      // indexed: 1, caughtUp: true` against five spaces holding fifty messages
      // each.
      //
      // 4 SINCE 11 SEP 2026 (tracker `a-pieces`) — `chatThreads` now also
      // computes `grainPieces` (each run's speaker/time, migration 0081's
      // `knowledge_sources.grain_pieces`) alongside `body`. `body` ITSELF IS
      // BYTE-FOR-BYTE UNCHANGED — the first attempt at this bump (since
      // reverted) wrapped each run in a mark and genuinely changed `body`'s
      // bytes; this design does not, because the structured half lives in
      // its own column, not folded into the prose. So this bump is the SAME
      // FREE SHAPE as bullet 3's: `content_hash` still matches what's
      // stored, the hash-skip returns before `indexSource`, and the cost is
      // one upsert per conversation — the write that actually delivers
      // `grain_pieces` to the 105 chat sources already on file, since
      // `grain_pieces = excluded.grain_pieces` is unconditional on every
      // re-visit. Still needed, not decorative: without the rewind a space
      // producing a steady trickle never re-visits its OLDER threads at all
      // (bullet 3's own measurement), so those would keep NULL forever.
      textVersion: 4,
      // ONE SOURCE PER CONVERSATION — not per message, and no longer per space.
      //
      // PER MESSAGE was wrong for the reason this comment has always given: a
      // chat message on its own is four words with no subject, and fifty of them
      // is fifty sources, fifty upserts and fifty embedding calls for a
      // morning's chatter.
      //
      // PER SPACE, which is what replaced it, was wrong in the other direction
      // and less obviously. A space is not a subject either — it is a room that
      // has held every subject for a year. Folding one into a single source
      // meant its ten chunks were cut across unrelated conversations, a citation
      // could only ever say "the FluClinic space", and there was nothing for a
      // link to point AT.
      //
      // A THREAD is the unit a person actually means by "that conversation about
      // the voucher quantity". Google hands us the grouping for free on every
      // message (`thread.name`) and nothing read it until 20 Aug 2026. The
      // folding itself lives in google-read's `chatThreads`, beside the reader
      // that knows what a message is — so by the time an item reaches here it IS
      // a conversation, and this lane has nothing left to group.
      read: async (_cfg, _guard, cursor, limit) => {
        const toRows = (items: GoogleItem[]) =>
          items.map((item) => ({
            // The THREAD is the row, so the thread's own id is the key. A new
            // reply updates the conversation in place rather than filing a
            // second copy of it.
            originRowId: rowId(item),
            // As recent as its last reply — `chatThreads` stamps the fold with
            // the newest message for exactly this.
            sortAt: moment(item.updatedAt),
            // AND THAT SAME MOMENT IS WHEN THE CONVERSATION IS FROM. A chat thread
            // dated by its newest reply is what makes "the latest on FluClinic"
            // answerable — the question the owner asked that started this.
            recordDate: moment(item.updatedAt) || null,
            title: item.title,
            // ALREADY ATTRIBUTED, line by line, by `chatThreads`. It used to be
            // re-attributed here from the title, which is why every line read
            // "Somebody in this space: Somebody in this space:" the moment the
            // reader started doing it properly.
            body: item.text,
            // THE STRUCTURED HALF, alongside `body` — tracker `a-pieces`,
            // migration 0081. `chatThreads` computed it; this is the one
            // place it reaches `knowledge_sources.grain_pieces`.
            grainPieces: item.grainPieces,
            // AND IT LINKS BACK. This was `null` — so Chat was the one Google
            // kind the assistant could quote and nobody could go and read.
            sourceUrl: item.url,
            // ── THE APP READING ITS OWN NOTIFICATIONS BACK IN ────────────────
            //
            // kwapso posts into a Chat space ("*Request* created by _K. Stehlik_
            // in the Portal"); the Chat sweep then files that post as knowledge.
            // A closed loop. These are genuinely distinct threads with correct
            // composite keys, so this is not duplication and dedup is the wrong
            // tool: every one is a real, separate, worthless conversation, and
            // each occupies a retrieval slot a real question needs. The ticket
            // it announces is already in the base as a `ticket` source with the
            // actual words on it.
            //
            // MEASURED ON STAGING, 31 Aug 2026: 96 chat sources, of which 21 are
            // such threads — every one live — and 6 are the mixed case below,
            // across four spaces —
            //   "HOGO — An app"      "An app: *💭 Request* created by _K. Stehlik_ in the Portal"
            //   "Rest-o — An app"    "An app: 🐛 *Bug Reported*: @Ishita Goyal"
            //   "FluClinic — An app" "An app: 📤 Task ready for your review @Ishita Goyal"
            //
            // ── WHY THE DISCRIMINATOR IS THE SPEAKER AND NOT THE WORDS ───────
            //
            // The obvious filter is the message FORMAT, and it is the dangerous
            // one. In the same four spaces sit SIX threads that open with that
            // exact notification line and then carry the team's reply to it:
            //
            //   "An app: *⚠️ Issue* created by _Paras Maroo_ in the Portal
            //    Aurora Thalassa: @Chilavert George pls review this
            //    Chilavert George: these two emails are sent by me, when I was
            //      working on the stripe workflow.
            //    Chilavert George: I have fixed the issue that caused these emails"
            //
            // That is a decision made in the open with the reasoning attached —
            // precisely what the knowledge base is FOR. Every one of those nine
            // bodies contains the notification line and the words "in the
            // Portal", so a format filter deletes the team's own diagnostic
            // record and leaves a green build behind it. The SPACE discriminates
            // nothing either: HOGO, FluClinic, Assecuranz and Rest-o each hold
            // both kinds.
            //
            // So the test is WHO SPOKE, over the WHOLE thread, and it never
            // reads the body at all — which is why no human sentence can trip
            // it, whatever it says about the Portal. `appOnly` is Google's own
            // `sender.type`, folded across every message by `chatThreads`.
            //
            // WHAT A FALSE POSITIVE COSTS, because a knowledge base that
            // silently drops real material is worse than one carrying noise: a
            // space where an app posts something genuinely useful that no human
            // ever replies to — an alerting, CI or form-response bot — is
            // retired unread. I judge that acceptable and reversible, and it is
            // the real cost rather than a nil one. Reversible twice over: this
            // RETIRES rather than skips, so the row and its history survive
            // (deactivate-never-delete), and the moment one person replies the
            // condition stops being true, the sweep meets a live row and the
            // engine revives it (`sweepKind`) — exactly as the calendar lane's
            // placeholders come back the day the meeting happens. A person who
            // excluded it by hand still keeps that decision; `deactivator_id`
            // is what separates the two.
            retired: item.appOnly === true,
            ...fencing(item),
          }))
        // THE LIVE READ (unbounded, newest per space) plus CHAT'S OWN
        // per-space rising walk (`chatBackfillRows`, migration 0082) — two
        // genuinely separate calls, merged the same way gmail's and
        // calendar's are.
        const { rows: forward } = await slice("chat", cursor, limit, toRows)
        const backfill = await chatBackfillRows(toRows, limit)
        return mergeWindows(forward, backfill)
      },
    },
  ]
}

/**
 * BRING ONE PERSON'S GOOGLE MATERIAL INTO STEP — the personal half of the sweep.
 *
 * Only the services they have actually CONNECTED are swept. A person with Drive
 * and nothing else must not have three kinds recording a run each tick, and the
 * empty answer `readGoogleMaterial` gives for an unconnected service would look
 * identical to an empty Drive on the screen — "in step, nothing found" about a
 * mailbox nobody ever attached.
 *
 * Everything else — the cursor, the bounded slice, the hash-skip, R12's failure
 * record — is inherited from the one engine, which is the whole point of a kind
 * being data (lib/knowledge-ingest.ts's header).
 */
export async function sweepGoogle(
  env: Env,
  cfg: D1Rest,
  guard: MemberGuard,
  options: {
    /** true = don't ask Google when this person's kinds were all swept inside
     * the five-minute floor; answer with the state as of that sweep instead. */
    onlyIfStale?: boolean
    limit?: number
  } = {}
): Promise<{
  results: SweepResult[]
  skipped: boolean
  connectedServices: GoogleService[]
  /** true = another caller — another tab, another device, this same person —
   * is bringing this in RIGHT NOW, so nothing here was read or written. Kept
   * apart from `skipped` (which means "found nothing to do") because the two
   * need different sentences: one is "up to date", the other is "wait a
   * moment and press again". */
  busy: boolean
}> {
  const connected = new Set(
    (await listConnections(cfg, guard)).filter((c) => c.active).map((c) => c.service)
  )
  // WHAT IS CONNECTED, said out loud. An empty sweep has two very different
  // causes — nothing changed, or nothing was ever connected — and the screen
  // was collapsing both into "Nothing new to bring in" (the owner pressed the
  // button with zero connections and was told there was nothing to fetch, as
  // if a fetch had happened). Derived from the same read as the filter below,
  // in the same breath, so the flag can never disagree with the behaviour.
  const connectedServices = [...connected]
  const seen = new Map<GoogleService, Map<string, GoogleShelf>>()
  // A KIND SCOPE HAS CLOSED DOES NOT RUN AT ALL, and that is not merely an
  // economy. A closed kind reads nothing, so its `seen` set would be empty —
  // and an empty `seen` is the input `retireVanished` reads as "Google returned
  // none of these", which would send it probing every source this person holds.
  // Not running is the honest state: nothing was asked, so nothing is known.
  const closed = new Set<GoogleService>()
  for (const service of GOOGLE_SCOPED_SERVICES) {
    // Only a service this person actually connected — `googleScope` answers
    // "everything" for one they have not, which is right and is a database read
    // spent learning nothing.
    if (!connected.has(service)) continue
    const scope = await googleScope(cfg, guard, service)
    if (scope.mode === "only" && scope.containers.length === 0) closed.add(service)
  }
  const kinds = googleIngestKinds(env, cfg, guard, seen).filter((k) => {
    const service = serviceOfStateKey(k.stateKey as string, guard.userId)
    return connected.has(service) && !closed.has(service)
  })
  if (kinds.length === 0) return { results: [], skipped: false, connectedServices, busy: false }

  // THE FLOOR (14.12). This door now fires by itself when somebody opens the
  // app, so "how often may it ask Google?" stopped being a question about a
  // button somebody presses and became a question about a page load.
  //
  // IT IS ASKED FOR, AND THAT IS THE WHOLE DESIGN. A floor over EVERY call was
  // written first and was wrong: re-shelving a Drive folder and pressing sync is
  // a deliberate act with an expected result, and a door that answered "already
  // did that four minutes ago" would have broken every proved path in §14 to add
  // this one. So the AUTOMATIC caller opts in and the BUTTON does not — which
  // also means the floor is not a security control and never has to survive a
  // lying client: the cost it bounds is the cost the automatic caller
  // introduced, and a person hammering the button spends their own Google quota
  // exactly as they could before this lane existed. The rights on the door
  // (R10) are what stop a stranger, and they are unchanged.
  //
  // IT IS READ, NOT STORED. `knowledge_ingest.last_run_at` already records when
  // each kind last ran, per person — the row the sweep writes on every tick — so
  // the floor is a comparison rather than a column. Adding a "last pinged"
  // column beside a "last ran" column would have been two facts that must agree.
  //
  // ALL OR NOTHING, per person. A part-skipped sweep would answer with a `read`
  // of 0 for the quiet kinds and look like an empty Drive, which is the exact
  // confusion `sweepGoogle` already refuses to create for an unconnected service.
  if (options.onlyIfStale) {
    const recent = await sweptWithin(cfg, guard, kinds, GOOGLE_SWEEP_FLOOR_MS)
    if (recent) return { results: recent, skipped: true, connectedServices, busy: false }
  }

  // THE LEASE. Everything above this line is a READ (connections, state rows) —
  // cheap, and safe to repeat if two callers land here at once. Everything
  // below WRITES to knowledge_ingest and reads Google with this person's own
  // token, and that is the part that must never run twice at the same instant
  // (migration 0057's header carries the owner's own report). Claimed on the
  // ACT, not the request, so the Meetings page's own knowledge sweep and this
  // one collide correctly.
  const lease = await withSyncLease(
    cfg,
    guard.databaseId,
    `google-knowledge:${guard.userId}`,
    async () => {
      const results = await sweepKinds(env, cfg, guard, kinds, options.limit ?? INGEST_SOURCES_PER_TICK)
      // AFTER the sweep, never instead of it: the generic engine has just
      // upserted or updated every source `seen` names, so the source id this
      // needs to attach a sighting to is guaranteed to exist by the time this
      // runs — see `writeSightings`'s own header for what "not found" means
      // when it does not.
      await writeSightings(cfg, guard, seen)
      // AFTER the sweep, never instead of it: the reads above are what filled
      // `seen`, and a retire pass that ran first would be reasoning about last
      // tick's world.
      await retireVanished(env, cfg, guard, seen)
      return results
    }
  )
  if (!lease.ran) return { results: [], skipped: true, connectedServices, busy: true }
  return { results: lease.result, skipped: false, connectedServices, busy: false }
}

/** HOW LONG A PERSON'S GOOGLE STAYS "JUST CHECKED" — the floor above. Five
 * minutes: long enough that opening the app repeatedly costs Google nothing,
 * short enough that a document filed during a meeting is answerable by the end
 * of it. */
export const GOOGLE_SWEEP_FLOOR_MS = 5 * 60 * 1000

/** Were ALL of this person's connected kinds swept inside the window? Returns
 * the state as sweep results when they were — read straight off the rows the
 * last real sweep wrote — and null when even one of them is due.
 *
 * `read` and `indexed` are 0 because nothing was read and nothing was indexed:
 * this call did no work and says so. `caughtUp` is true for the same reason a
 * clean tick's is — there is nothing more to bring in *right now*; the caller
 * that wants to push a first fill along is told `skipped` and can come back.
 * A kind that FAILED last time carries its error forward, so a floor can never
 * turn "it has been failing since Tuesday" into a silent success. */
async function sweptWithin(
  cfg: D1Rest,
  guard: MemberGuard,
  kinds: IngestKind[],
  windowMs: number
): Promise<SweepResult[] | null> {
  const keys = kinds.map((k) => (k.stateKey ?? k.kind) as string)
  // The ONE reader of this table (R14's cap is the length of the named list it
  // carries), asked for this caller's own keys and nothing else.
  const state = await listIngestState(cfg, guard, keys)
  const byKind = new Map(state.map((s) => [s.kind, s]))
  const floor = Date.now() - windowMs
  const results: SweepResult[] = []
  for (const key of keys) {
    const row = byKind.get(key)
    const ran = row?.lastRunAt ? Date.parse(row.lastRunAt) : NaN
    // Never run, unreadable stamp, or older than the window → this is a real
    // sweep. `Number.isFinite` rather than a truthiness test, because a stamp we
    // cannot parse must mean "due", never "just now".
    if (!Number.isFinite(ran) || ran < floor) return null
    results.push({
      kind: key,
      read: 0,
      indexed: 0,
      caughtUp: true,
      ...(row?.lastError ? { error: row.lastError } : {}),
    })
  }
  return results
}

/** Which service a state key belongs to — the inverse of googleStateKey, so the
 * filter above reads the same string the key was built from rather than a second
 * spelling of it. */
function serviceOfStateKey(stateKey: string, userId: string): GoogleService {
  return (
    GOOGLE_SERVICES.find((s) => googleStateKey(s, userId) === stateKey) ?? "drive"
  )
}

// ── LETTING GO ───────────────────────────────────────────────────────────────
//
// WHAT HAPPENS WHEN SOMEBODY DELETES A GOOGLE FILE, and what used to.
//
// Every kind this app owns the rows of retires itself. `IngestRow.retired` says
// it in as many words: "TRUE when the row has left the part of the app this kind
// mirrors — archived, switched off, deleted. The source is DEACTIVATED rather
// than skipped, which is the difference between 'the assistant stops quoting it'
// and 'the assistant quotes it forever because the sweep never visits it
// again'." An archived ticket comes back from its own table with a column set,
// and the engine acts on it.
//
// GOOGLE'S FOUR KINDS HAD NO SUCH COLUMN AND SET NO SUCH FLAG. They are not a
// table this app walks; they are a LISTING, and a deleted file is not in it. So
// the sweep moved forward past a source it would never be handed again, and the
// assistant went on quoting a document that no longer existed — indefinitely,
// because nothing in the loop was ever going to visit that row a second time.
// Edits were always fine (the content hash catches a changed file the next time
// its stamp moves). Deletions were the half nobody could see, because the
// symptom is an answer that looks perfectly normal.
//
// THE TWO RULES THIS PASS IS BUILT ON:
//
//   • ABSENCE IS NOT DELETION. A source missing from a listing may have fallen
//     outside a window, slid past a page cap, stopped matching a query, or been
//     invisible for ninety seconds because Google was unwell. Retiring on
//     absence would empty somebody's index during an outage and record it as
//     housekeeping. So absence only makes a source a CANDIDATE, and a candidate
//     is retired only when Google positively says it has gone (`googlePresence`
//     — in the bin, called off, or 404).
//   • RETIRE, NEVER DELETE. Exactly as everywhere else here: `deactivated_at` is
//     set, the chunks are dropped so nothing can be quoted from it, and the row
//     and its whole history stay where they are.
//
// AND ONE SOURCE THAT NEEDS NO GOOGLE CALL AT ALL. A Chat source IS a space
// somebody named in kwapso, so the positive signal for it is that named source
// being switched off — a fact in this app's own database. Nothing is asked of
// Google about a space, which is why `ProbableService` has three members.

/** How many of one person's sources for one kind this pass will LOOK at per
 * tick. R14's hard cap, and generous on purpose: it is one indexed read of one
 * person's own rows, and the number of Google sources anybody can have is itself
 * bounded by the listing sizes that created them. */
const RETIRE_SCAN_CAP = 500

/** How many of those it will ASK GOOGLE about per tick. This is the number that
 * costs something — one round trip each — so it is small, and the scan above is
 * randomised so that a person with more candidates than this does not have the
 * same head of the queue examined for ever while the tail is never reached. */
const RETIRE_PROBES_PER_TICK = 25

/** One live SIGHTING of this person's — the source it is on, the Google id
 * behind it, and `seenWhere`, needed to retire exactly this sighting and no
 * other should this person hold the same source through two services (they
 * cannot today, but the key does not assume it stays that way). */
type HeldSource = { id: string; externalId: string; seenWhere: string }

/**
 * THE SOURCES THIS PERSON STILL HOLDS FOR ONE KIND — via their own SIGHTING,
 * not via `origin_row_id`.
 *
 * `origin_row_id` used to carry the reader's own id as its first half (see
 * `rowId`'s old comment), which made a string match the cheapest way to find
 * "this person's rows". It no longer does — the identity gate (kb_B1) made
 * `origin_row_id` the THING's own id, the same for every reader who sees it —
 * so who holds it is answerable only from `knowledge_sightings` now, and this
 * joins there instead of parsing a prefix that no longer exists. */
async function heldSources(
  cfg: D1Rest,
  guard: MemberGuard,
  originTable: string
): Promise<HeldSource[]> {
  const rows = await d1Query<{ id: string; origin_row_id: string; seen_where: string }>(
    cfg,
    guard.databaseId,
    // R14 hard cap: RETIRE_SCAN_CAP, said here and named above.
    //
    // RANDOM, and it is the cheapest way to be complete over time. There is no
    // "last checked" column to order by and adding one would be a migration for
    // a housekeeping detail; ordering by anything stable would examine the same
    // head every tick and never reach a person's five-hundred-and-first source.
    // Shuffling costs nothing at this size and means every source is looked at
    // within a handful of ticks.
    `SELECT s.id, s.origin_row_id, sg.seen_where FROM knowledge_sources s
       JOIN knowledge_sightings sg ON sg.source_id = s.id
      WHERE s.origin_table = ? AND sg.seen_by_user_id = ? AND sg.gone_at IS NULL
        AND s.deactivated_at IS NULL
      ORDER BY RANDOM() LIMIT ${RETIRE_SCAN_CAP}`,
    [originTable, guard.userId]
  )
  return rows.map((r) => ({ id: r.id, externalId: r.origin_row_id, seenWhere: r.seen_where }))
}

/** STOP QUOTING IT. The same two steps the ingest engine takes for an archived
 * ticket, in the same order: mark the source, then re-index it — which, for a
 * deactivated source, is what drops its chunks. */
async function retire(env: Env, cfg: D1Rest, guard: MemberGuard, sourceId: string): Promise<void> {
  const now = new Date().toISOString()
  await d1Query(
    cfg,
    guard.databaseId,
    // R17: the predicate rides the UPDATE, so a source another pass already
    // retired moves zero rows and this one does nothing twice.
    `UPDATE knowledge_sources SET deactivated_at = ?, deactivator_name = ${sqlString(brand.name)}, updated_at = ?
      WHERE id = ? AND deactivated_at IS NULL`,
    [now, now, sourceId]
  )
  await indexSource(env, cfg, guard, sourceId)
}

/** RETIRE ONE PERSON'S SIGHTING — never the source outright, unless this was
 * the last one. Under the old shape, "Google no longer has this" and "the
 * SOURCE is gone" were the same fact, because a source was one person's row.
 * They are not the same fact any more: Aurora losing a Drive folder must not
 * take the same material away from Alex, who still holds it. So this marks
 * only HER sighting gone, recomputes what that leaves (`teamVisibleRecomputeSql`,
 * spliced after the write as its own header requires), and only calls the
 * whole-source `retire` above when `stillLive` says nobody's left — the exact
 * question this file's identity gate was built to let the retire pass ask. */
async function retireSighting(
  env: Env,
  cfg: D1Rest,
  guard: MemberGuard,
  sourceId: string,
  seenWhere: string
): Promise<void> {
  const now = new Date().toISOString()
  const script = `
UPDATE knowledge_sightings SET gone_at = ${sqlString(now)}
 WHERE source_id = ${sqlString(sourceId)} AND seen_where = ${sqlString(seenWhere)}
   AND seen_by_user_id = ${sqlString(guard.userId)} AND gone_at IS NULL;
${teamVisibleRecomputeSql(sourceId)}
`
  await execKnowledgeScript(cfg, guard.databaseId, script)
  const rows = await d1Query<{ shelf: GoogleShelf; seen_by_user_id: string; gone_at: string | null }>(
    cfg,
    guard.databaseId,
    "SELECT shelf, seen_by_user_id, gone_at FROM knowledge_sightings WHERE source_id = ?",
    [sourceId]
  )
  const sightings: Sighting[] = rows.map((r) => ({
    userId: r.seen_by_user_id,
    shelf: r.shelf,
    goneAt: r.gone_at,
  }))
  if (!stillLive(sightings)) await retire(env, cfg, guard, sourceId)
}

/**
 * RETIRE WHAT GOOGLE NO LONGER HAS — see the essay above for both rules.
 *
 * `seen` is what each service actually returned this tick. A service MISSING
 * from it was not read at all (its kind errored, or the person has not connected
 * it), and that is the most important case to get right: an unread service must
 * retire nothing, because "we did not ask" and "it is not there" are the two
 * sentences this whole pass exists to keep apart.
 */
/** THE SPACE A THREAD BELONGS TO, off the thread's own name.
 *
 * Google's thread names are `spaces/AAA/threads/BBB`, so the space is the first
 * two segments and needs no lookup. Anything else returns the input unchanged,
 * which is the safe direction: an id this does not recognise will not match a
 * live space, and the caller's own comment explains why that is a retirement
 * rather than a silent keep. */
function spaceOfThread(threadName: string): string {
  const m = /^(spaces\/[^/]+)\//.exec(threadName)
  return m ? m[1] : threadName
}

/** The calendars this person's scope names, or `primary` when they have not
 * narrowed — the same answer `scopedCalendarWindow` reads a window from, so the
 * pass that RETIRES an event can never be asking a different calendar from the
 * one that FILED it. */
async function scopedCalendarIds(cfg: D1Rest, guard: MemberGuard): Promise<string[]> {
  const scope = await googleScope(cfg, guard, "calendar")
  if (scope.mode !== "only" || scope.containers.length === 0) return ["primary"]
  return scope.containers.map((c) => c.externalId)
}

/** THE OTHER HALF OF THE FOLD — writing this person's SIGHT of what `seen`
 * already read, now that the generic engine has filed a source for each item
 * under its own identity. This is the piece that makes the identity gate real:
 * without it, `rowId`'s change alone would have taken today's one-row-per-
 * person duplication and turned it into "one row, whoever's sweep runs last
 * decides who it belongs to" — the exact bug per-person rows existed to avoid,
 * reintroduced one column over. Identity and sighting-writing land together
 * or not at all; that was true from the first report on this gate.
 *
 * CORRECTED, kb_review's own finding: sightings do not STOP the clobber —
 * they make it NOT MATTER, which is a different and more precise claim. The
 * generic engine's upsert (`sweepKinds`, running before this) still writes
 * `owner_user_id = excluded.owner_user_id` unconditionally, per reader, every
 * tick — a second reader's sweep really does overwrite the first's value with
 * their own, momentarily. What saves the read is `ownerClause`'s branch 2
 * (knowledge.ts), which trusts `owner_user_id` alone ONLY when
 * `NOT EXISTS (any sighting for this source)`. The instant this function
 * writes the SECOND sighting for a source, that gate closes — the
 * momentarily-wrong column becomes invisible to the one read that decides
 * anything, whatever it currently says. Reorder these two calls believing the
 * overwrite itself was prevented, and the gap this comment describes is
 * exactly where a fence would widen.
 *
 * `seen` carries EVERY item this tick's read returned — not just the ones
 * whose text changed (`wanted`, inside `slice`), because a sighting means "I
 * can still see this", and an item Google did not change is still seen. A
 * fold-worthy item Google hands back every tick therefore gets its sighting
 * kept alive every tick, cheaply — the SQL's own `WHERE … OR gone_at IS NOT
 * NULL` guard (inside the upsert below) means an unchanged, already-live
 * sighting moves zero rows and costs nothing beyond the one lookup. */
async function writeSightings(
  cfg: D1Rest,
  guard: MemberGuard,
  seen: Map<GoogleService, Map<string, GoogleShelf>>
): Promise<void> {
  const now = new Date().toISOString()
  for (const [service, items] of seen)
    for (const [externalId, shelf] of items) {
      const { originTable, originRowId } = googleIdentity(service, externalId)
      const rows = await d1Query<{ id: string }>(
        cfg,
        guard.databaseId,
        "SELECT id FROM knowledge_sources WHERE origin_table = ? AND origin_row_id = ? LIMIT 1",
        [originTable, originRowId]
      )
      const source = rows[0]
      // NOT FOUND: this item is outside the slice the generic engine actually
      // filed this tick — past `INGEST_SOURCES_PER_TICK`, or a fold rule
      // dropped it (a calendar entry with nothing in it yet, see `folded`).
      // Nothing lost: `seen` is read fresh every tick, so an item that is
      // still there next time gets its sighting written then. Sighting a
      // source that does not exist would be a foreign-key violation, and
      // silently skipping it here is what "not filed yet" is supposed to mean.
      if (!source) continue
      const script = `
INSERT INTO knowledge_sightings (id, source_id, seen_where, seen_by_user_id, shelf, seen_at, gone_at, created_at)
  VALUES (${sqlString(ulid())}, ${sqlString(source.id)}, ${sqlString(service)}, ${sqlString(guard.userId)},
    ${sqlString(shelf)}, ${sqlString(now)}, NULL, ${sqlString(now)})
  ON CONFLICT (source_id, seen_where, seen_by_user_id)
  DO UPDATE SET shelf = excluded.shelf, seen_at = excluded.seen_at, gone_at = NULL
  WHERE knowledge_sightings.shelf IS NOT excluded.shelf OR knowledge_sightings.gone_at IS NOT NULL;
${teamVisibleRecomputeSql(source.id)}
`
      await execKnowledgeScript(cfg, guard.databaseId, script)
    }
}

async function retireVanished(
  env: Env,
  cfg: D1Rest,
  guard: MemberGuard,
  seen: Map<GoogleService, Map<string, GoogleShelf>>
): Promise<void> {
  // THE TEAM'S OWN SWITCH (R70, `shared/automations.ts`). A team that would
  // rather keep answering out of material it can no longer see in Google — and
  // decide for itself, on each source's own screen, when to take one away —
  // switches this off, and the sweep that calls it still runs. Absent means ON,
  // and this is a cron path, so the trip costs nobody a wait.
  //
  // OFF LEAVES THE SOURCES EXACTLY AS THEY ARE; it never revives one. The
  // revival branch in `knowledge-ingest.ts` is careful about whose retirement it
  // may undo (a machine's, never a person's), and a SETTING is neither.
  if (await automationOff(cfg, guard.databaseId, "knowledge.retire-vanished")) return
  // CHAT FIRST, because it asks Google nothing.
  //
  // A chat source is keyed on a THREAD since 20 Aug 2026, and the thread name
  // CONTAINS its space (`spaces/AAA/threads/T1`), so the question "has this
  // gone?" is still answerable from a fact this app wrote down itself: is the
  // space it came out of still an active share?
  //
  // IT IS DELIBERATELY NOT "was this thread seen this tick". That reads as the
  // obvious rule and is a data-loss bug: a space is read fifty messages at a
  // time, so every conversation older than the last fifty is absent from a
  // normal tick — and absent is not gone. Keying the question on the SPACE is
  // what makes the answer conservative in the right direction, which is the same
  // property the previous space-keyed version had and the reason to keep it.
  if (seen.has("chat")) {
    const liveSpaces = new Set(
      (await listNamedSources(cfg, guard, "chat")).filter((s) => s.active).map((s) => s.externalId)
    )
    for (const held of await heldSources(cfg, guard, "google_chat"))
      if (!liveSpaces.has(spaceOfThread(held.externalId)))
        await retireSighting(env, cfg, guard, held.id, held.seenWhere)
  }

  for (const service of ["drive", "gmail", "calendar"] as ProbableService[]) {
    const current = seen.get(service)
    // Not read this tick → nothing is knowable, so nothing happens.
    if (!current) continue
    const candidates = (await heldSources(cfg, guard, `google_${service}`))
      .filter((h) => !current.has(h.externalId))
      .slice(0, RETIRE_PROBES_PER_TICK)
    if (candidates.length === 0) continue
    // A token this person has, by definition: the kind was read a moment ago
    // with it. A failure here is not "everything has gone" — it is one service
    // this tick cannot ask about, and it is left alone.
    let token: string
    try {
      token = (await accessTokenFor(env, cfg, guard, service)).token
    } catch {
      continue
    }
    // WHICH CALENDARS TO ASK. Scope made "the calendar" a list, and an event on
    // a named secondary calendar is a 404 on `primary` — which this pass reads
    // as "gone" and acts on. Asking the calendars the person actually named is
    // what keeps that from retiring live material and recording it as
    // housekeeping. Every other service ignores the argument.
    const calendarIds =
      service === "calendar" ? await scopedCalendarIds(cfg, guard) : ["primary"]
    for (const held of candidates)
      if ((await googlePresence(service, token, held.externalId, calendarIds)) === "gone")
        await retireSighting(env, cfg, guard, held.id, held.seenWhere)
  }
}
