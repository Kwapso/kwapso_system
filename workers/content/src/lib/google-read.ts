// THE SEAM — one function that hands back what a person's Google connections
// can see, in one shape, with the shelf carried on every item.
//
// ══════════════════════════════════════════════════════════════════════════════
// WHERE THE RETRIEVAL LANE PLUGS IN
//
// This build's job ends at "the connection exists, is scoped, is permissioned,
// and can read and write". Making Google material ANSWERABLE — chunking it,
// embedding it, keeping it in step — belongs to the knowledge base, and that is
// a different lane's work. The join is here:
//
//   workers/content/src/lib/knowledge-ingest.ts owns the sweep. It walks a list
//   of KINDS (a ticket, an account, an article), reads a bounded slice of each
//   per tick from a cursor, and writes `knowledge_sources` rows. A Google kind is
//   one more entry in that list, and `readGoogleMaterial` below is the read it
//   should call — it already returns the four fields that ingest wants
//   (`title`, `text`, `url`, `updatedAt`) plus the two it MUST respect:
//
//     • `shelf`       — 'private' means this material may only ever answer its
//                       OWNER's question. A source indexed without that
//                       distinction is the failure the design round named
//                       exactly: a colleague asking about a document in YOUR
//                       Drive should be answered "only if you filed it as team
//                       material". Ingest must carry it onto the source row and
//                       the compartment logic must honour it.
//     • `ownerUserId` — whose connection it came through. `private` is
//                       meaningless without it.
//
//   And one thing that lane must NOT do: call this on a schedule with a
//   fabricated guard. Everything here is read with ONE PERSON'S OWN TOKEN, so a
//   sweep has to run per connected person, as that person, or not at all. The
//   knowledge cron's existing guard is deliberately a user id no row can hold
//   (see index.ts) — that guard resolves no connection here, which is the right
//   failure: nothing, rather than somebody's mail under a system account.
// ══════════════════════════════════════════════════════════════════════════════

import { d1Query, type D1Rest } from "@shared/workers/d1-rest"
import { LIST_HARD_CAP } from "@shared/workers/limits"
import { type MemberGuard } from "@shared/workers/gating"
import type { GoogleItem, GoogleService } from "@shared/types"
import type { ChatMessage } from "./google-api"
import { chunkChat, chunkMail } from "./knowledge-text"
import type { ReaderEnv } from "./source-readers"
import {
  chatMessages,
  driveFileText,
  driveFilesById,
  driveList,
  calendarGet,
  calendarList,
  gmailMessage,
  gmailSearch,
  isConnectionLost,
  GMAIL_CONTACT_CAP,
  type CalendarWindow,
  type MailMessage,
} from "./google-api"
import {
  accessTokenFor,
  googleScope,
  type GoogleScope,
  knownChatPeople,
  listNamedSources,
  rememberChatPeople,
  type GoogleEnv,
} from "./google"

/** Contact addresses one lookup will read. R14's spirit on the other axis: the
 * accounts table is a GROWING collection, so the read that feeds a Gmail query
 * is bounded here as well as capped inside the query builder — two ceilings
 * because they guard two different things (a database read, and a query string
 * Google will refuse if it is too long). */
const CONTACT_READ_CAP = 500

/**
 * THE KNOWN CONTACTS — every email address on one of the team's accounts.
 *
 * This is the entire definition of "a known contact" (the owner's rule: mail is
 * read only when it is to or from one). It reads the customer spine's own table,
 * which is the whole point — a contact becomes known by being added to an
 * account, not by anybody maintaining a second list here that would drift.
 *
 * Deactivated accounts are included on purpose: a past client's mail is still
 * mail with a known contact, and dropping them would make old threads vanish
 * from an assistant's sight the day somebody tidies up the accounts list.
 */
export async function knownContactEmails(cfg: D1Rest, guard: MemberGuard): Promise<string[]> {
  return (await knownContacts(cfg, guard)).map((c) => c.email)
}

/** A known contact, and WHOSE material a conversation with them is.
 *
 * `accountId` is the contact's PARENT where there is one, and the contact's own
 * row where there is not. That is the whole rule, and it is the difference
 * between a compartment that answers and one that does not: mail with Marta —
 * a person account sitting under Bergman — is BERGMAN's material, and filing it
 * under Marta would put it in a slice no question about Bergman ever searches.
 * A contact with no parent IS a client in their own right, so they are their own
 * compartment. */
async function knownContacts(
  cfg: D1Rest,
  guard: MemberGuard
): Promise<{ email: string; accountId: string }[]> {
  const rows = await d1Query<{ email: string; account_id: string }>(
    cfg,
    guard.databaseId,
    // R14 hard cap: the accounts table grows with every person an agency works
    // with, and this read feeds a bounded query string anyway.
    //
    // GROUPED rather than DISTINCT: two contacts can share an address (a shared
    // info@ on a company and on its own contact row), and a row per duplicate
    // would silently double the query string this feeds. `min(...)` picks one
    // deterministically — either is a correct compartment for that address.
    `SELECT lower(email) AS email, min(COALESCE(parent_account_id, id)) AS account_id FROM accounts
      WHERE email IS NOT NULL AND trim(email) <> ''
      GROUP BY lower(email) ORDER BY email LIMIT ${CONTACT_READ_CAP}`
  )
  return rows.map((r) => ({ email: r.email, accountId: r.account_id }))
}

/** The one account an address list points at, or null.
 *
 * A mail's `From` and `To` are RFC-2822 header text ("Marta <marta@berg.de>,
 * ops@berg.de"), not addresses — so the match is "does this header CONTAIN a
 * known address", lower-cased, and the first hit wins. Reading the first hit is
 * deliberate: a thread with two clients on it is one conversation, and picking
 * one compartment for it beats picking none. */
function accountForAddresses(
  contacts: { email: string; accountId: string }[],
  ...headers: string[]
): string | null {
  const haystack = headers.join(" ").toLowerCase()
  for (const c of contacts) if (c.email && haystack.includes(c.email)) return c.accountId
  return null
}

/** EVERY account an address list points at, not just the first — the FILING
 * question (d-ingest-filing, BUILD-5 §1), answered from the exact same loop as
 * `accountForAddresses` above and the exact same reason it does not touch that
 * function: `account_id`/compartment is a SEARCH PARTITION and has to be one
 * value, so the first hit stays the first hit, on purpose, per that function's
 * own comment. `accounts[]` is a different question — "which clients does this
 * concern" — and the migration that added the column (0073) says the two are
 * additive: the singular column untouched, this one alongside it. A thread or
 * an event naming three clients now says so in `accounts[]` while still
 * answering ONE question — "where do I search for this" — through `accountId`.
 * Zero extra cost: `contacts` is already loaded for the caller above, this
 * walks the same list once more instead of returning on the first match. */
function matchedAccounts(contacts: { email: string; accountId: string }[], ...headers: string[]): string[] {
  const haystack = headers.join(" ").toLowerCase()
  const found = new Set<string>()
  for (const c of contacts) if (c.email && haystack.includes(c.email)) found.add(c.accountId)
  return [...found]
}

/** One file or message a read could not open — named, so the person who shared
 * it can go and fix it, rather than a whole sweep turning up empty with nothing
 * saying why. */
export type GoogleSkip = { title: string; reason: string }

/** What a caller asks the seam for. */
export type GoogleReadRequest = {
  /** which services to read; defaults to all four the person has connected. */
  services?: GoogleService[]
  /** narrow within a service — a Drive/Chat search, a Gmail query. */
  search?: string
  /** read the full text of each item (Drive files only today; a mail list
   * carries snippets, and a body per message is a call per message). */
  withText?: boolean
  /** calendar only — the window to read. */
  from?: string
  to?: string
  /** GMAIL ONLY — ids this lane has already filed, so their header is worth
   * skipping. Built by the caller (only the automatic sweep does), never by
   * this function: it has no database to read one from, and building it here
   * for every caller would cost a query nobody but the sweep can use. See
   * `gmailSearch`'s own doc for what skipping one actually means. */
  gmailKnownIds?: Set<string>
}

/**
 * Everything the CALLER's own connections can see, in one shape.
 *
 * A service the caller has not connected is simply absent from the answer, not
 * an error: "read what you can" is the honest behaviour for a seam that is asked
 * about four independent connections, and a person who has connected two of them
 * should not get a failure about the other two.
 *
 * `shelf` on every item is the load-bearing field. Drive and Chat items carry
 * the shelf of the source they came through. Gmail and Calendar are always
 * `private` and cannot be anything else — there is no screen on which somebody
 * declares their inbox to be team material, and inventing a way to would be
 * inventing a decision nobody made.
 */
/**
 * THE GOOGLE EVENTS THIS APP ALREADY HOLDS AS MEETINGS.
 *
 * ── THE MEASUREMENT ─────────────────────────────────────────────────────────
 *
 * On the owner's own staging data, 20 Aug 2026: 251 calendar entries in the
 * knowledge base, and 250 of them were the SAME EVENT as a meeting row, matched
 * on Google's own event id. "Week Planning" was in there 108 times. "Pickleball"
 * 99 times.
 *
 * The two arrive by different lanes and neither knew about the other. The
 * meetings sweep files a meeting — title, purpose, who was there, the
 * transcript when there is one, averaging 431 characters. The calendar sweep
 * files the same event straight off Google — a title and a date, averaging
 * THIRTY-FOUR characters.
 *
 * ── WHY IT IS WORTH A QUERY ─────────────────────────────────────────────────
 *
 * An eighth of the whole knowledge base was a second, thinner copy of something
 * already in it. That is not merely waste: retrieval hands back the passages
 * that match, so a hundred near-identical thirty-four-character titles compete
 * for room with the passages that could actually answer the question. The
 * owner's report was that the assistant's answers were unsatisfactory, and this
 * is the largest single reason found.
 *
 * THE MEETING WINS, always, and it is not close — it is the same event with the
 * work written on it. An event NOT in this set is one nobody made a
 * meeting for, which is exactly the case the calendar lane is for, and it still
 * files normally.
 */
async function meetingEventIds(cfg: D1Rest, guard: MemberGuard): Promise<Set<string>> {
  const rows = await d1Query<{ google_event_id: string }>(
    cfg,
    guard.databaseId,
    // R14 hard cap — the meetings list is bounded by how many conversations a team has had,
    // and this reads one column of it.
    `SELECT google_event_id FROM meetings
      WHERE google_event_id IS NOT NULL AND google_event_id <> '' AND deactivated_at IS NULL
      LIMIT ${LIST_HARD_CAP}`
  )
  return new Set(rows.map((r) => r.google_event_id))
}

/**
 * A SPACE'S MESSAGES, FOLDED INTO CONVERSATIONS.
 *
 * ── WHY A MESSAGE IS THE WRONG UNIT ─────────────────────────────────────────
 *
 * Chat was filed one source per message, and a chat message is mostly not a
 * thing anybody can answer from. Read off the owner's own spaces on 20 Aug 2026:
 * "yes!", "working.", "👏👏👏👏👏", "safe journey". Each of those was its own
 * source, its own passage and its own competitor for room in an answer — while
 * the exchange that gave them meaning was scattered across four other sources
 * that retrieval had no reason to return together.
 *
 * Google hands us the grouping for free: every message carries `thread.name`,
 * and nothing had ever read it. A thread is what a person means by "that
 * conversation about the voucher quantity", and it is the unit they would go
 * looking for.
 *
 * ── WHAT A FOLDED THREAD IS ─────────────────────────────────────────────────
 *
 * The whole exchange, oldest first, each line attributed to whoever said it, as
 * one body. So a passage that comes back from retrieval carries the question AND
 * the answer AND who gave it — which is the shape the owner asked for ("they
 * don't know who sent what message") and the shape a citation can point at.
 *
 * The thread's OWN id is the source id, so re-reading a space that has gained a
 * reply updates the conversation in place rather than filing a second copy of
 * it — the content hash changes, the source does not multiply. Its timestamp is
 * the LATEST message, because a conversation is as recent as its last reply and
 * the sweep's cursor orders by exactly that.
 *
 * A message Google gives no thread for is its own conversation of one, which is
 * both true and the safe default.
 *
 * ── AND WITHIN ONE THREAD, THE BODY IS CUT INTO RUNS, NOT ONE BLOB ──────────
 *
 * BUILD-5 §2's grain rule for chat: a piece is a RUN of a few messages, not
 * the whole conversation. `chunkChat` (knowledge-text.ts) does the grouping;
 * the runs are joined here with a blank line between them, which is the
 * strongest boundary `chunkText` looks for (it splits on `\n{2,}` before it
 * ever considers a sentence) — so once this body reaches the generic chunker
 * downstream, a cut lands BETWEEN runs rather than through the middle of
 * somebody's turn. Before this, an 88-message thread was one contiguous
 * string and the paragraph cutter had no boundary to prefer over any other
 * (KB-AUDIT.md §4.9: "one thread is one ~348-char blob… per-turn or
 * per-topic segmentation… is the obvious direction"). The per-line
 * `sender: text` attribution is UNCHANGED — `google-ingest.test.ts` asserts
 * that literal shape.
 *
 * ── AND THE RUN'S SPEAKER/TIME SURVIVE THE JOIN TOO (tracker `a-pieces`) ────
 *
 * `chunkChat` hands back that metadata (`speakers`, `startAt`) beside each
 * piece's text, but this thread is ONE row with ONE `body` — the metadata
 * would otherwise die right here, the moment the runs are flattened into a
 * single string, with no second call to Google later to get it back.
 *
 * THE FIRST FIX ENCODED IT IN THE PROSE ITSELF — a mark in front of each run,
 * stripped again before a chunk's stored text — and could not have worked:
 * an embedded NUL truncates every SQLite text function at the first one — D1
 * stores it fine, which is the trap (`shared/workers/validate.ts` strips one
 * from every request field for exactly that reason), and `body` never passes
 * through that seam, because it arrives from Google, not a request. Caught
 * before merge.
 *
 * SO THE RUNS RIDE ALONGSIDE `text` INSTEAD, on `grainPieces` — the SAME
 * `chunkChat` call's own pieces, kept rather than thrown away, written by
 * `knowledge-google.ts`'s chat kind onto `knowledge_sources.grain_pieces`
 * (migration 0081; that migration's own comment is where "pieces win, and
 * `seq` follows them" is answered). `body` stays exactly what it always
 * was — nothing hidden in it, nothing to strip, no interaction with the
 * hash, the embedding or the FTS postings.
 */
export function chatThreads(messages: ChatMessage[]): ChatMessage[] {
  const byThread = new Map<string, ChatMessage[]>()
  for (const m of messages) {
    const key = m.thread || m.id
    byThread.set(key, [...(byThread.get(key) ?? []), m])
  }
  const out: ChatMessage[] = []
  for (const [thread, group] of byThread) {
    // Oldest first: a conversation reads forwards, and the API hands them back
    // newest first.
    const ordered = [...group].sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""))
    const first = ordered[0]
    const last = ordered[ordered.length - 1]
    if (!first || !last) continue
    // WHO IS IN IT, in the order they first spoke, for the title. A conversation
    // between two people is named by both of them rather than by whoever
    // happened to reply last.
    const voices = [...new Set(ordered.map((m) => m.sender).filter(Boolean))]
    // COMPUTED ONCE, used for both `text` and `grainPieces` below — never two
    // separate calls that could disagree about where a run's boundaries are.
    const runs = chunkChat(ordered.map((m) => ({ speaker: m.sender, at: m.createdAt ?? "", text: m.text })))
    out.push({
      ...first,
      id: thread,
      sender: voices.join(", "),
      // Named only if EVERY voice is — a conversation half of whose speakers are
      // "Somebody in this space" is not attributed, and saying it is would be
      // the one thing this lane must never do.
      senderNamed: ordered.every((m) => m.senderNamed),
      // AND WAS ANYBODY HUMAN IN IT? True only when EVERY voice was an app —
      // one human line anywhere in the thread makes the conversation a person's.
      // `every` over an empty group cannot arise: a group with no messages was
      // dropped above.
      senderIsApp: ordered.every((m) => m.senderIsApp),
      // RUNS, joined on a blank line — see the essay above. A run's own line
      // shape is still exactly `sender: text` (chunkChat drops the timestamp
      // from the prose on purpose), byte-for-byte what the flat join has
      // always produced — `runs` below is computed once and reused for both
      // `text` and `grainPieces`, so the two can never say something different
      // about the same conversation.
      text: runs.map((piece) => piece.text).join("\n\n"),
      // THE STRUCTURED HALF, alongside `text` rather than folded into it —
      // `knowledge_sources.grain_pieces` (migration 0081) is what
      // `indexSource` actually reads; see the essay above for why this is a
      // separate field and not a mark in the prose.
      grainPieces: runs.map((piece) => ({ text: piece.text, speaker: piece.speakers.join(", "), saidAt: piece.startAt })),
      // AS RECENT AS ITS LAST REPLY, which is what the sweep's cursor orders by.
      createdAt: last.createdAt,
      // The link opens the thread at its first message, which is where a person
      // wants to start reading it.
      url: first.url,
    })
  }
  return out
}

/**
 * ONE SOURCE PER MAIL THREAD, not per message. BUILD-5 §2, in the plan's own
 * words: "mail thread = source, message = piece." The same map-by-key shape
 * as `chatThreads` above; the one real difference is the plan's own — a mail
 * message already has its own boundary a chat turn does not, so the body is
 * assembled with `chunkMail` (one piece PER MESSAGE) rather than `chunkChat`
 * (runs of a few, because a chat message alone is rarely a whole thought).
 *
 * GRAIN'S DECISION, NOT IDENTITY'S — the grouping key is whatever thread id
 * THIS list read returned. Gmail's thread id is per-mailbox exactly as its
 * message id is, so this does not merge one conversation across two
 * colleagues' mailboxes: the cross-mailbox identity is still the RFC-822
 * `Message-ID` header, still unread anywhere in this app. What an item's
 * `externalId` becomes from here, and whether a thread's identity needs more
 * than this id, is kb_B1's call — this function only decides which messages
 * are the same conversation IN ONE MAILBOX.
 *
 * THE ONE GAP THIS CANNOT CLOSE ALONE: `google-api.ts`'s known-id skip
 * answers a message the sweep already has on file with a PLACEHOLDER whose
 * `threadId` is `""` (`knownPlaceholder`) — a real fetch is skipped because a
 * Gmail message never changes once received, but the real thread id it
 * would have carried is thrown away with it. So a placeholder can never join
 * its real thread's group here; it falls back to a lone group keyed by its
 * own id, which is HARMLESS (that group is excluded by the cursor exactly
 * as a lone message always was) but means a thread with some already-known
 * messages and one new reply reassembles from the new message ALONE — the
 * older ones are missing from the body, not merely un-refreshed. Gmail's own
 * list response already carries `threadId` beside `id` for every message,
 * known or not, so this is fixable with no extra call; it is just not this
 * function's fix, since the id is thrown away one file over
 * (`gmailSearch`/`knownPlaceholder`, google-api.ts) before it ever reaches
 * here. Flagged to kb_B1 rather than worked around.
 */
export function mailThreads(messages: MailMessage[]): { threadId: string; ordered: MailMessage[] }[] {
  const byThread = new Map<string, MailMessage[]>()
  for (const m of messages) {
    const key = m.threadId || m.id
    byThread.set(key, [...(byThread.get(key) ?? []), m])
  }
  return [...byThread.entries()].map(([threadId, group]) => ({
    threadId,
    // Oldest first, same reading order chatThreads gives a conversation.
    ordered: [...group].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "")),
  }))
}

/** EVERY MEMBER MESSAGE'S FULL BODY, read and assembled with `chunkMail` —
 * one piece per message, joined on a blank line for the same reason
 * `chatThreads`' runs are: `chunkText` downstream prefers that boundary over
 * any other, so a citation never lands split across two messages.
 *
 * NOT WRAPPED IN ITS OWN TRY/CATCH ON PURPOSE. A member message Google
 * refuses mid-thread propagates to `hydrateText`'s existing per-item catch,
 * which is the same "one item's refusal is one item's" rule this file
 * already applies to a single-message gmail item or a Drive file — the
 * THREAD is the item now, so its refusal is the thread's, not carved up by
 * which message inside it failed. */
async function mailThreadText(token: string, messageIds: string[]): Promise<string> {
  const messages: { from: string; at: string; text: string }[] = []
  for (const id of messageIds) {
    const full = await gmailMessage(token, id)
    if (full.text) messages.push({ from: full.from, at: full.date ?? "", text: full.text })
  }
  return chunkMail(messages)
    .map((piece) => piece.text)
    .join("\n\n")
}


// ── THE TWO SCOPED READS ─────────────────────────────────────────────────────
//
// Gmail and Calendar are the two services a person reaches WHOLESALE — connect
// them and everything in them is in reach — so they are the two that carry a
// scope. Every read of either, anywhere in this worker, goes through one of
// these two functions: the knowledge sweep, the meetings sync, the events door
// and the mail door alike.
//
// THAT UNIFORMITY IS THE POINT AND IT IS THE HALF THAT IS EASY TO GET WRONG.
// Applying scope only where it was easiest — inside the knowledge sweep — would
// have left the assistant's own mail tool reading the whole mailbox through a
// door the sweep was fenced out of. Which is not a fence. It is a preference.
//
// NEITHER OF THEM FILTERS ANYTHING. The narrowing is a parameter Google applies
// (`labelIds`, the calendar in the URL, `eventTypes`), so material out of scope
// is never fetched. A thing that was fetched and then discarded has still been
// fetched, and has still passed through this worker's logs and memory on its way
// to being dropped.

/** How many containers one scoped read will walk. Both reads cost one round trip
 * per named container, so this is R14 on the axis that actually spends money —
 * and it is generous, because naming twelve calendars or twelve labels is a
 * person being careful rather than a script. Anything past it is DROPPED
 * LOUDLY: the caller is told, because a silently ignored label is a source
 * somebody believes is in scope and is not. */
const SCOPE_CONTAINER_CAP = 12

/** THIS PERSON'S MAIL, narrowed to the labels they left in reach.
 *
 * 'only' with nothing named answers with NOTHING and asks Gmail nothing, which
 * is the safe reading of an empty allow-list and the whole reason scope carries
 * a mode (see the SCOPE essay in lib/google.ts). */
export async function scopedGmailSearch(
  cfg: D1Rest,
  guard: MemberGuard,
  token: string,
  contactQuery: string,
  search?: string,
  /** See `gmailSearch`'s own doc — passed straight through. Only the
   * automatic sweep ever builds one; an interactive read (the manual button,
   * `routes/google.ts`'s mail search) never passes this and reads in full,
   * exactly as before. */
  knownIds?: Set<string>
): Promise<MailMessage[]> {
  const scope = await googleScope(cfg, guard, "gmail")
  if (scope.mode !== "only") return gmailSearch(token, contactQuery, search, [], knownIds)
  if (scope.containers.length === 0) return []
  const labels = scope.containers.slice(0, SCOPE_CONTAINER_CAP).map((c) => c.externalId)
  if (scope.containers.length > labels.length)
    console.error(
      `[google] mail scope walked ${labels.length} of ${scope.containers.length} labels for ${guard.userId}`
    )
  return gmailSearch(token, contactQuery, search, labels, knownIds)
}

/** THIS PERSON'S CALENDAR, narrowed to the calendars and the kinds of event they
 * left in reach.
 *
 * `truncated` is OR-ed across the calendars read, because a half answer from any
 * one of them makes the whole window a half answer — and the meetings backfill
 * moves a cursor on the strength of that word (see `calendarList`). */
export async function scopedCalendarWindow(
  cfg: D1Rest,
  guard: MemberGuard,
  token: string,
  range: { from?: string; to?: string; showDeleted?: boolean },
  /** THE SCOPE, ALREADY READ. A caller taking four windows in one breath — the
   * meetings sync does exactly that — would otherwise pay for the same two
   * database round trips four times over, and the REST door is the expensive
   * thing in this worker (EDGE-CASES). Optional rather than required, so a
   * caller reading ONE window is not made to do the bookkeeping. */
  known?: GoogleScope
): Promise<CalendarWindow> {
  const scope = known ?? (await googleScope(cfg, guard, "calendar"))
  const eventTypes = scope.eventTypes
  if (scope.mode !== "only") return calendarList(token, { ...range, eventTypes })
  if (scope.containers.length === 0) return { events: [], truncated: false }
  const calendars = scope.containers.slice(0, SCOPE_CONTAINER_CAP)
  if (scope.containers.length > calendars.length)
    console.error(
      `[google] calendar scope walked ${calendars.length} of ${scope.containers.length} calendars for ${guard.userId}`
    )
  const events: CalendarEventRow[] = []
  let truncated = false
  for (const calendar of calendars) {
    const window = await calendarList(token, { ...range, eventTypes, calendarId: calendar.externalId })
    events.push(...window.events)
    truncated = truncated || window.truncated
  }
  return { events, truncated }
}

/** The event shape `calendarList` hands back, named here so the merge above can
 * hold one without this file importing a type it otherwise has no use for. */
type CalendarEventRow = CalendarWindow["events"][number]

/** ONE EVENT, from whichever of this person's calendars actually holds it.
 *
 * Scope turned "the calendar" into a list, and `events.get` needs to be told
 * which one. An id that is not on the calendar asked is a 404, so a lookup
 * pinned to `primary` would report "not there" about an event sitting on a
 * calendar the person deliberately named. The calendars are walked in the order
 * they were named and the first hit wins; null means no calendar in reach holds
 * it, which is a different sentence from "it does not exist" and is the one the
 * caller has to say.
 *
 * `calendarGet` throws on a 404 (it goes through `googleFetch`, which maps every
 * failure onto the product's own words), so the miss is caught rather than
 * tested for — there is nothing else on that path to swallow. */
export async function scopedCalendarEvent(
  cfg: D1Rest,
  guard: MemberGuard,
  token: string,
  eventId: string
): Promise<CalendarEventRow | null> {
  const scope = await googleScope(cfg, guard, "calendar")
  const calendars =
    scope.mode === "only" && scope.containers.length
      ? scope.containers.slice(0, SCOPE_CONTAINER_CAP).map((c) => c.externalId)
      : ["primary"]
  for (const calendarId of calendars) {
    try {
      return await calendarGet(token, eventId, calendarId)
    } catch {
      continue
    }
  }
  return null
}

export async function readGoogleMaterial(
  env: GoogleEnv & ReaderEnv,
  cfg: D1Rest,
  guard: MemberGuard,
  request: GoogleReadRequest = {}
): Promise<{
  items: GoogleItem[]
  contactsUsed: number
  contactsCapped: boolean
  skipped: GoogleSkip[]
}> {
  const wanted = request.services ?? (["drive", "gmail", "calendar", "chat"] as GoogleService[])
  const items: GoogleItem[] = []
  const skipped: GoogleSkip[] = []
  let contactsUsed = 0
  let contactsCapped = false
  // Read ONCE for the whole call, not per service: Gmail needs the addresses to
  // build its fence and both Gmail and Calendar need the account behind each
  // one, and that is the same read of the same table.
  const contacts =
    wanted.includes("gmail") || wanted.includes("calendar") ? await knownContacts(cfg, guard) : []

  if (wanted.includes("drive")) {
    const token = await tokenOrNull(env, cfg, guard, "drive")
    if (token) {
      const shared = (await listNamedSources(cfg, guard, "drive")).filter((s) => s.active)
      // TWO GRAINS OF THE SAME FENCE. A folder is a place to look inside; a file
      // named on its own IS the thing. Both are shares this person made, both
      // carry their own shelf and their own client, and the knowledge base must
      // see both or a deliberately shared contract would be the one document the
      // assistant cannot answer from.
      const folders = shared.filter((s) => s.kind === "folder")
      const files = shared.filter((s) => s.kind === "file")
      const shelfOf = new Map(folders.map((f) => [f.externalId, f]))
      const namedFileSource = new Map(files.map((f) => [f.externalId, f]))
      const found = [
        ...(await driveList(token, [...shelfOf.keys()], request.search)),
        // A named file ignores the search term for the same reason the door
        // above it does: somebody who shared exactly one document has already
        // narrowed it as far as narrowing goes.
        ...(await driveFilesById(token, [...namedFileSource.keys()])),
      ]
      for (const file of found) {
        // The folder it came out of, or — for a file named on its own — the row
        // that names the file itself.
        const source = shelfOf.get(file.folderId) ?? namedFileSource.get(file.id)
        // ONE FILE'S REFUSAL IS ONE FILE'S — the same reasoning google-api.ts's
        // folder walk gives for a listing call, one layer down, for the READ of a
        // file the walk already found. Before this the first file `driveFileText`
        // could not open — a metadata 403 on that specific item, a timeout, a
        // socket that dropped mid-download — took every file after it with it:
        // the loop had no catch, so one awkward document turned a whole sweep
        // into nothing, silently. `google_access_lost` is different and still
        // throws: a dead token would otherwise be swallowed once per file and the
        // whole read would come back EMPTY AND SUCCESSFUL, which is worse than
        // the failure this exists to fix.
        let text = ""
        if (request.withText) {
          try {
            text = await driveFileText(env, token, file.id)
          } catch (e) {
            if (isConnectionLost(e)) throw e
            const reason = e instanceof Error ? e.message : String(e)
            const name = file.name || file.id
            console.error(`google drive file "${name}" (${file.id}) skipped: ${reason}`)
            skipped.push({ title: name, reason })
          }
        }
        items.push({
          service: "drive",
          sourceId: source?.id ?? null,
          externalId: file.id,
          // THE ONE READER OF THE FOUR WITH NO FALLBACK, until now. Mail says
          // "(no subject)" and an event says "(no title)"; a document said
          // whatever Google's `name` field held, and `str()` turns a missing one
          // into "". A source with no title is not merely untidy — it is a
          // citation a reader cannot identify, which is the same thing as no
          // citation (R23), and downstream it rendered as a link with nothing
          // inside it.
          title: file.name || "(untitled document)",
          url: file.webViewLink,
          text,
          updatedAt: file.modifiedTime,
          shelf: source?.shelf ?? "private",
          ownerUserId: guard.userId,
          // The SHARE says whose it is — a decision somebody made when they named
          // it, not a name matched out of the file's own text.
          accountId: source?.accountId ?? null,
        })
      }
    }
  }

  if (wanted.includes("gmail")) {
    const token = await tokenOrNull(env, cfg, guard, "gmail")
    if (token) {
      // WHAT THE CONTACTS ARE STILL FOR. They no longer FENCE the search — the
      // owner opened the mailbox on 20 Aug 2026 — but they still decide which
      // client a message belongs to a few lines below. So this reports how many
      // addresses were available to attribute with, and `capped` says whether
      // that attribution had to work from a subset.
      contactsUsed = Math.min(contacts.length, GMAIL_CONTACT_CAP)
      contactsCapped = contacts.length > GMAIL_CONTACT_CAP
      // THE CONTACT FENCE IS OFF (owner, 20 Aug 2026: "I'd read all my emails").
      //
      // It used to build a query from up to forty known contact addresses, so an
      // inbox of tens of thousands contributed THIRTY sources and every internal
      // thread, every supplier and every conversation with somebody not yet filed
      // as a contact was invisible to the assistant. Measured before the change:
      // 30 email sources against 436 meetings and 1,218 document passages.
      //
      // WHAT MAKES THAT HIS DECISION ALONE TO TAKE: mail is filed on the
      // `private` shelf a few lines below, and the knowledge base enforces that
      // on every read (`ownerClause`). Opening the net widens what can answer HIS
      // questions and nobody else's — no colleague, and no client.
      //
      // The contacts are still read, and still do the OTHER job below: deciding
      // which client a message belongs to. Losing the fence does not lose that.
      // THROUGH THE SCOPED READ, never `gmailSearch` directly — the sweep is the
      // largest consumer of a person's mailbox and would be the worst place for
      // the fence to be missing.
      // ONE SOURCE PER THREAD, NOT PER MESSAGE. See `mailThreads`.
      for (const { threadId, ordered } of mailThreads(
        await scopedGmailSearch(cfg, guard, token, "", request.search, request.gmailKnownIds)
      )) {
        const first = ordered[0]
        const last = ordered[ordered.length - 1]
        if (!first || !last) continue
        // THE FIRST MEMBER THAT RESOLVES, over the whole thread — a thread
        // where only the second reply mentions a known contact is still that
        // client's, not "nobody's" because the opening message did not name
        // one. Same fence, same cap-can-miss caveat as the single-message
        // read this replaces.
        let accountId: string | null = null
        for (const m of ordered) {
          accountId = accountForAddresses(contacts, m.from, m.to)
          if (accountId) break
        }
        // EVERY ACCOUNT ON THE THREAD, not just the first — see
        // `matchedAccounts`' own comment. Same headers, whole thread, one more
        // pass over the same `contacts` list.
        const accounts = matchedAccounts(contacts, ...ordered.flatMap((m) => [m.from, m.to]))
        items.push({
          service: "gmail",
          sourceId: null,
          externalId: threadId,
          // THE ORIGINAL SUBJECT, not the last reply's "Re: Re: Re:" — the
          // thread's own opening line is what a person would search for.
          title: first.subject || "(no subject)",
          url: first.url,
          // UNHYDRATED HERE, same as every list read (see the doc comment on
          // `text` in shared/types.ts) — `hydrateText` reads every member
          // message below and assembles the thread with `chunkMail`.
          text: "",
          // AS RECENT AS ITS LAST REPLY, matching chatThreads' own reasoning:
          // a conversation is as recent as the last thing said in it.
          updatedAt: last.date,
          // A mailbox is nobody's team material. See the doc comment above.
          shelf: "private",
          ownerUserId: guard.userId,
          accountId,
          accounts,
          // WHICH MESSAGES `hydrateText` reads to assemble this thread's
          // body. See `mailThreads`' own doc for the one gap this carries
          // forward rather than silently fixing: a message the known-id skip
          // already has on file is missing from this list, not merely
          // unrefreshed in it.
          threadMessageIds: ordered.map((m) => m.id),
        })
      }
    }
  }

  if (wanted.includes("calendar")) {
    const token = await tokenOrNull(env, cfg, guard, "calendar")
    // EVENTS THIS APP ALREADY HOLDS AS MEETINGS, so they are not filed twice.
    // See `meetingEventIds` for the measurement that made this necessary.
    const alreadyMeetings = token ? await meetingEventIds(cfg, guard) : new Set<string>()
    if (token)
      for (const event of (
        await scopedCalendarWindow(cfg, guard, token, { from: request.from, to: request.to })
      ).events) {
        if (alreadyMeetings.has(event.id)) continue
        items.push({
          service: "calendar",
          sourceId: null,
          externalId: event.id,
          title: event.summary || "(no title)",
          url: event.url,
          text: event.description,
          updatedAt: event.start,
          shelf: "private",
          ownerUserId: guard.userId,
          // A meeting with a client on the invitation is that client's; one with
          // nobody but us in the room is the agency's own. The guest list is the
          // only place on an event where that is written down.
          accountId: accountForAddresses(contacts, event.attendees.map((a) => a.email).join(" ")),
          // EVERY CLIENT ON THE GUEST LIST, not just the first — see
          // `matchedAccounts`.
          accounts: matchedAccounts(contacts, event.attendees.map((a) => a.email).join(" ")),
        })
      }
  }

  if (wanted.includes("chat")) {
    const token = await tokenOrNull(env, cfg, guard, "chat")
    // WHO WE ALREADY KNOW, read ONCE for the whole sweep rather than per space —
    // and it is what stops a person reading as "Somebody in this space" in one
    // conversation while being named in the next (0049_chat_people).
    const known = token ? await knownChatPeople(cfg, guard) : new Map<string, string>()
    const fresh = new Map<string, string>()
    if (token)
      for (const space of (await listNamedSources(cfg, guard, "chat")).filter((s) => s.active)) {
        const page = await chatMessages(token, space.externalId, known)
        // WHAT THIS SPACE TAUGHT US IS AVAILABLE TO THE NEXT ONE, in this same
        // sweep, before anything is written down.
        for (const [id, name] of page.learned) { known.set(id, name); fresh.set(id, name) }
        // ONE SOURCE PER CONVERSATION, NOT PER MESSAGE. See `chatThreads`.
        for (const message of chatThreads(page.messages))
          items.push({
            service: "chat",
            sourceId: space.id,
            externalId: message.id,
            title: `${space.name} — ${message.sender}`,
            // THE LINK BACK, built from the message's own ids (`chatMessageUrl`).
            // This was `null` from the day it was written, which made Chat the
            // one Google kind the assistant could quote and nobody could go and
            // read in context.
            url: message.url,
            // ALREADY ATTRIBUTED LINE BY LINE by `chatThreads` above, which is
            // the half that actually answers the owner's complaint: retrieval
            // hands the assistant PASSAGES, and a passage holding only the words
            // has thrown the speaker away by the time anybody reads it. Adding a
            // sender here as well is what produced "Somebody in this space:
            // Somebody in this space:" on every line.
            text: message.text,
            updatedAt: message.createdAt,
            shelf: space.shelf,
            ownerUserId: guard.userId,
            // The space says whose it is, exactly as a Drive folder does.
            accountId: space.accountId,
            // NOBODY HUMAN EVER SPOKE IN THIS ONE. Decided by `chatThreads` off
            // Google's own sender type and carried through; the knowledge lane
            // retires on it (lib/knowledge-google.ts, the chat kind).
            appOnly: message.senderIsApp,
            // THE STRUCTURED RUNS, alongside `text` — tracker `a-pieces`,
            // migration 0081. `knowledge-google.ts`'s chat kind carries this
            // onto `grain_pieces`.
            grainPieces: message.grainPieces,
          })
      }
    // WRITTEN DOWN ONCE, AT THE END. Everything this sweep learned, from every
    // space, so the next sweep starts knowing it — which is the whole point:
    // coverage that goes UP over time instead of depending on whether a mention
    // happens to be in the page in front of us.
    if (fresh.size) await rememberChatPeople(cfg, guard, fresh)
  }

  return { items, contactsUsed, contactsCapped, skipped }
}

/**
 * READ THE FULL TEXT OF A SLICE — the second half of "list is cheap, bodies are
 * not".
 *
 * A Drive listing is one call for fifty files; the TEXT of those fifty is fifty
 * more, and a Gmail listing carries a hundred-character snippet where the body
 * is the thing worth indexing. So the seam lists first and hydrates afterwards,
 * and the caller decides WHICH items are worth the calls — the knowledge sweep
 * narrows to its bounded slice before asking, so a tick costs one call per item
 * it is actually going to file rather than one per item it merely saw.
 *
 * `withText: true` on the read above still exists and still fetches everything:
 * that is the right shape for a caller reading one folder on purpose. This is
 * the right shape for a sweep.
 *
 * An item whose text cannot be read comes back with the text it already had (a
 * snippet, or nothing). A file with no text representation is not an error — it
 * is a file with nothing in it to answer questions from.
 */
export async function hydrateText(
  env: GoogleEnv & ReaderEnv,
  cfg: D1Rest,
  guard: MemberGuard,
  items: GoogleItem[]
): Promise<{ items: GoogleItem[]; skipped: GoogleSkip[] }> {
  const out: GoogleItem[] = []
  const skipped: GoogleSkip[] = []
  // One token per service, resolved lazily — a slice that turns out to be all
  // Drive must not go and refresh a Gmail token it never uses.
  const tokens = new Map<GoogleService, string | null>()
  const tokenFor = async (service: GoogleService): Promise<string | null> => {
    if (!tokens.has(service)) tokens.set(service, await tokenOrNull(env, cfg, guard, service))
    return tokens.get(service) ?? null
  }
  for (const item of items) {
    if (item.service !== "drive" && item.service !== "gmail") {
      out.push(item)
      continue
    }
    const token = await tokenFor(item.service)
    if (!token) {
      out.push(item)
      continue
    }
    // ONE ITEM'S REFUSAL IS ONE ITEM'S — see the identical guard in
    // `readGoogleMaterial` above. This loop hydrates a whole tick's slice one
    // body at a time; before this, the first item that could not be read (a
    // Drive file refused mid-download, a Gmail message the connection lost mid-
    // sweep) took every item after it with it, and the docstring above — "an
    // item whose text cannot be read comes back with the text it already had" —
    // described behaviour this loop did not actually have. `google_access_lost`
    // still throws: a dead token would otherwise be swallowed once per item and
    // the whole hydration would come back looking like a clean, empty pass.
    let text = ""
    try {
      // A GMAIL ITEM IS A THREAD NOW (`mailThreads`), so its words are every
      // member message's body, assembled — not the one body a message-shaped
      // item used to need. `threadMessageIds` is absent only for an item
      // built before this shape existed (there are none live; kept as a
      // fallback to the item's own id rather than a hard requirement, the
      // same generosity `item.text` already shows an item this loop cannot
      // read at all).
      text =
        item.service === "drive"
          ? await driveFileText(env, token, item.externalId)
          : await mailThreadText(token, item.threadMessageIds ?? [item.externalId])
    } catch (e) {
      if (isConnectionLost(e)) throw e
      const reason = e instanceof Error ? e.message : String(e)
      const name = item.title || item.externalId
      console.error(`google ${item.service} item "${name}" (${item.externalId}) skipped: ${reason}`)
      skipped.push({ title: name, reason })
      out.push(item)
      continue
    }
    out.push({ ...item, text: text || item.text })
  }
  return { items: out, skipped }
}

/** A token, or null when this person simply has not connected that service.
 * ONLY the "not connected" refusal is swallowed — a revoked grant, an unreadable
 * token or a Google outage still throws, because those are things somebody needs
 * to be told about rather than an empty answer that looks like an empty Drive. */
async function tokenOrNull(
  env: GoogleEnv & ReaderEnv,
  cfg: D1Rest,
  guard: MemberGuard,
  service: GoogleService
): Promise<string | null> {
  try {
    return (await accessTokenFor(env, cfg, guard, service)).token
  } catch (e) {
    if (e instanceof Error && "code" in e && (e as { code?: unknown }).code === "google_not_connected")
      return null
    throw e
  }
}
