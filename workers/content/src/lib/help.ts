// The TICKETS module — team-wide support tickets + threaded replies, inside the team's
// OWN database. Locked model rules enforced HERE on the server:
//   • status is a FIXED lifecycle the code trusts (new / triaged / in_progress /
//     ready / resolved) — help_type is a cosmetic selectable, never the source of
//     truth (SCOPE ch.07 calls the type an EDITABLE list, so the code never
//     hard-codes the four values it seeds);
//   • the account owns the WORDING until we read it: a client may edit and re-rank
//     their own ticket while `locked_at` is null, and the first staff touch sets it
//     (SCOPE ch.07, "editing and ranking lock at first staff touch");
//   • the list's order IS the drag-rank — there is no priority dropdown and there
//     will not be one;
//   • tickets are team-wide: the My/All tabs are just a creator filter, no
//     row-level privacy (a mention is notify-only — see lib/notify);
//   • resolving stamps the resolver audit block + resolved flag; reopening clears
//     it. Every status move (incl. reopen) is gated purely by help:edit;
//   • the AI agent's first-draft reply is a HOOK (maybeDraftFirstReply) left off
//     until the agent worker exists — a ticket always opens regardless.

import { listGaps, triageGaps } from "@shared/triage-readiness"
import { accountScopeClause, appScopeClause, type AccountScope } from "@shared/workers/account-scope"
import { describeChanges, logActivity, type Actor } from "@shared/workers/activity"
import { countCollection, countCollectionWith, reportedTotal } from "@shared/workers/count"
import { d1ExecScript, d1Query, likeLiteral, sqlString, type D1Rest } from "@shared/workers/d1-rest"
import { ulid } from "@shared/workers/id"
import {
  CLOSURE_TREND_MONTHS,
  CLOSURE_WINDOW_MONTHS,
  HELP_STATUSES,
  OPEN_HELP_STATUSES,
  TICKET_TYPE_KEPT_FOR_MIGRATION,
  ticketTypeKeptForMigration,
  ticketTypeKeptForMigrationExcludedSql,
  type HelpMessage,
  type HelpStatus,
  type HelpTicket,
} from "@shared/types"
// EVERY DURATION ON THE DASHBOARD, FROM THE ONE PLACE THE RULE LIVES — Mon–Fri
// only, the client's ruling of 6 Sep 2026. `workingDaysSql` is the SQL twin of
// the `workingDaysBetween` the triage queue counts its cards with, proved equal
// by `working-days-agree.test.ts`; `workingDaysAgo` is the same seam's cutoff,
// used here for exactly the reason triage uses it — so the dashboard's count of
// unopened tickets and the queue's own list can never disagree about "late".
import { workingDaysAgo, workingDaysSql } from "@shared/business-days"
// THE THREE-DAY LINE, read from the queue that draws it rather than retyped as a
// 3 here. It is not a new promise: the dashboard is reporting on the queue's own
// threshold, so the day somebody moves it, both move together.
import { TRIAGE_AFTER_DAYS } from "./triage"
// EVERY STATUS MOVE IN THIS FILE GOES THROUGH ONE SEAM (team migration 0066).
// `createTicket` embeds the statement in its own script — one transaction, so a
// ticket cannot exist for an instant with no first stage — while `setStatus`,
// `markTriaged` and the set-shaped bulk write theirs after the
// UPDATE that made the move. lib/help-stages.ts carries the argument for that
// order, and for why this one seam does not swallow its own failures the way
// `logActivity` does.
import { recordStatusEvent, recordStatusEvents, statusEventStatement } from "./help-stages"
import { GuardError, type MemberGuard } from "@shared/workers/gating"
import { optionalText, parseStringArray, requireText, TEXT_LIMITS } from "@shared/workers/validate"
import {
  BULK_CONCURRENCY, BULK_IDS_LIMIT, THREAD_HARD_CAP, TICKET_DASHBOARD_GROUP_CAP, TICKET_FACET_CAP
} from "@shared/workers/limits"
import { decodeCursor, keysetAfter, PAGE_SIZE, toPage, type Page } from "@shared/workers/paging"
import { orderBy, resolveOrdering, type Ordering, type SortMenu } from "@shared/workers/sorting"
import { rankAtTop, rankBetween } from "@shared/workers/rank"
// The reference number lives in shared/workers/refs.ts — a ticket is TEAM-wide
// now (no account-code prefix), and app/wave mint from the same seam over in
// tenancy, so it moved out of this worker entirely (2026-08-31 ruling).
import { nextTeamRef, refAliasMatchSql, TEAM_REF_KINDS, TEAM_REF_TABLES } from "@shared/workers/refs"
import { inOrder } from "@shared/workers/parallel"

// The fixed status lifecycle the code trusts (the team-editable dropdown is
// display-only) — Anything outside this set is rejected. It lives in shared/types
// beside HelpTicket, because the stepper and the ticket row need the same list;
// re-exported here so this worker's routes still read it off its own module.
export { HELP_STATUSES, type HelpStatus }

type TicketRow = {
  id: string
  help_type: string | null
  /** WHAT IT ARRIVED AS. Stamped in `createTicket`'s INSERT and touched by no
   * UPDATE in this file or any other — team migration 0065 says why at length,
   * and `workers/content/test/raised-as-is-stamped-once.test.ts` fails the
   * build if a second writer appears. Null on every row raised before the
   * column existed; never backfilled. */
  raised_as_type: string | null
  description: string
  screen_recording_link: string | null
  source_screen: string | null
  status: string
  resolved: number
  resolved_at: string | null
  account_id: string | null
  app_id: string | null
  app_name: string | null
  module_id: string | null
  module_name: string | null
  module_mark: string | null
  raised_by_contact_id: string | null
  raised_by_contact_name: string | null
  validated_at: string | null
  ref: string | null
  rank: string | null
  locked_at: string | null
  archived_at: string | null
  draft_resolution: string | null
  story_count: number
  done_story_count: number
  title_de: string | null
  title_en: string | null
  creator_id: string
  creator_name: string | null
  editor_name: string | null
  created_at: string
  updated_at: string | null
  /** Computed in TICKET_COLS: does the person who raised / last edited this row
   * have a portal login? "Is one of the client's own people", in other words —
   * see toTicket. */
  raiser_is_client: number
  editor_is_client: number
}

/** WHOSE NAME TRAVELS ON A TICKET — the same promise `listReplies` keeps on a
 * thread, kept one table up, where it was not being kept at all.
 *
 * SCOPE ch.06: "the portal shows work status but never which staff member is
 * doing it." That sentence is why `/help/stakeholders` is withheld from the
 * portal surface entirely — and every ticket row was carrying the same fact for
 * free: `raiserName` and `editorName` are the staff member's real name, and
 * `raiserId` is their stable ULID, the same one against the same person on every
 * ticket they ever touch. The portal drew none of it and the wire sent all of
 * it, which is the version of this mistake that survives a UI rewrite.
 *
 * Not a hypothetical, and not an edge: 220 of the 221 seeded historical requests
 * are staff-raised, because staff raise a client's questions on their behalf
 * (SCOPE ch.07). Staff-authored is the majority case here.
 *
 * The rule is `listReplies`'s rule, for the same reason: a client login is told
 * the names of the people on THEIR side of the fence — a colleague who raised
 * the question is theirs to know, and calling them "kwapso" would be a lie about
 * who is talking — and nothing at all about ours. "Has a portal login" is
 * exactly "is one of this company's people"; anyone else is the agency, and
 * arrives with no name and no handle. Staff readers are unaffected.
 *
 * `scope` is REQUIRED rather than defaulted, for the reason written over
 * `ticketFence`: a redaction that defaults to "not a client" is a redaction that
 * fails open the day somebody writes a new reader. */
function toTicket(r: TicketRow, scope: AccountScope): HelpTicket {
  // Ours = the agency's. A portal caller learns nothing about our side of it.
  const hideRaiser = scope.kind === "portal" && r.raiser_is_client !== 1
  const hideEditor = scope.kind === "portal" && r.editor_is_client !== 1
  return {
    id: r.id,
    helpType: r.help_type,
    // WHAT IT ARRIVED AS, on every ticket-shaped read, and NOT redacted for a
    // client login. It is the same class of fact as `helpType` beside it — the
    // kind of thing they asked for — and a contact who raised a question that we
    // later recorded as an issue is entitled to see that we did. Nothing about
    // our side of the fence is in it.
    raisedAsType: r.raised_as_type,
    description: r.description,
    screenRecordingLink: r.screen_recording_link,
    sourceScreen: r.source_screen,
    // A status the code does not know reads as "new" — the state a ticket nobody
    // has dealt with sits in. It is the SAFE direction: an unrecognised value
    // shows up as work still to do rather than as work already finished, so a
    // row the migration somehow missed nags us instead of quietly disappearing.
    status: (HELP_STATUSES as readonly string[]).includes(r.status)
      ? (r.status as HelpStatus)
      : "new",
    resolved: r.resolved === 1,
    resolvedAt: r.resolved_at,
    moduleId: r.module_id,
    moduleName: r.module_name,
    moduleMark: r.module_mark,
    // The HANDLE dies with the name. Blanking `raiserName` alone would leave a
    // per-staff-member pseudonym on every ticket, and a pseudonym is anonymity
    // only until one thing links it to a name once — which is precisely the
    // linkage the reply notification used to make (see listReplies).
    raiserId: hideRaiser ? null : r.creator_id,
    raiserName: hideRaiser ? null : r.creator_name,
    editorName: hideEditor ? null : r.editor_name,
    // R54, AND IT IS THE SAME FACT THE TWO LINES ABOVE ARE ALREADY STANDING ON.
    // The row has always known whether each of these two people is one of the
    // client's or one of ours; the portal used it and then it was dropped. The
    // AGENCY app needs the same answer for the opposite reason — it draws both
    // names, and a colleague is shown by first name where a contact is shown in
    // full. Not redacted for a client login: it says nothing the name beside it
    // (present, or null) does not already say.
    raiserIsClient: r.raiser_is_client === 1,
    editorIsClient: r.editor_is_client === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    accountId: r.account_id,
    // The work-engine fields. Most of these are not a staff FACT the way a name
    // is, so most are not redacted: a client is meant to know their own reference
    // number, the order they dragged their requests into, whether their wording
    // is still theirs to change, and whether it has been put away.
    //
    // `draftResolution` is the ONE exception, and it goes out to staff only. It
    // is our unsent working text — each story's closing note, appended as the
    // work finishes (lib/ready-flip.ts) — so half of it may be wrong and all of
    // it is written in the register colleagues use with each other. The
    // resolution a client reads is the one a person SENDS.
    ref: r.ref,
    draftResolution: scope.kind === "portal" ? null : r.draft_resolution,
    // TWO NUMBERS, NEVER A LIST. This is the whole of what a client login learns
    // about the work on their request (BUILD-1 §7: "stories as a COUNT only —
    // never the titles"), and it is deliberately the same two numbers we show
    // ourselves: a count nobody can check against the list beside it is a count
    // somebody stops believing.
    storyCount: r.story_count,
    doneStoryCount: r.done_story_count,
    rank: r.rank,
    lockedAt: r.locked_at,
    archivedAt: r.archived_at,
    titleDe: r.title_de,
    titleEn: r.title_en,
    // WHICH SYSTEM, AND WHO ASKED. Neither is redacted: a client already knows
    // their own apps and their own colleagues — those are the two facts on this
    // row that are THEIRS. The redaction above is about our side of the fence.
    appId: r.app_id,
    appName: r.app_name,
    raisedByContactId: r.raised_by_contact_id,
    raisedByContactName: r.raised_by_contact_name,
    validatedAt: r.validated_at,
  }
}

type ReplyRow = {
  id: string
  help_id: string
  message_body: string
  tagged_user_ids: string | null
  is_agent: number
  /** Null only on the way OUT, and only to a client login — see listReplies. */
  creator_id: string | null
  creator_name: string | null
  created_at: string
}

/** `fromClient` is passed rather than read off the row because the row type is
 * shared with writers that have no such column — the reader that HAS the
 * subselect (`listReplies`) hands the answer in, and the one that does not says
 * so by passing false, which is the direction that leaves a name whole (R54). */
function toMessage(r: ReplyRow, fromClient: boolean): HelpMessage {
  return {
    id: r.id,
    ticketId: r.help_id,
    body: r.message_body,
    taggedUserIds: parseStringArray(r.tagged_user_ids),
    isAgent: r.is_agent === 1,
    authorId: r.creator_id,
    authorName: r.creator_name,
    authorIsClient: fromClient,
    createdAt: r.created_at,
  }
}

// The last two are computed, not stored: "does this person have a portal login",
// asked of the raiser and of the last editor. Exactly the subselect listReplies
// uses on an author, and it rides the SAME read as the row so a name and the
// answer about that name can never come from two different moments.
const TICKET_COLS = `id, help_type, raised_as_type, description, screen_recording_link, source_screen, status, resolved, resolved_at,
  account_id, app_id, module_id, raised_by_contact_id, validated_at,
  ref, rank, locked_at, archived_at, draft_resolution, title_de, title_en,
  creator_id, creator_name, editor_name, created_at, updated_at,
  (SELECT ap.name FROM apps ap WHERE ap.id = help.app_id) AS app_name,
  -- R35: a module shown on a ticket carries its OWN face — the name AND the
  -- emoji beside it, on the same read as the row, so a list never renders a bare
  -- id and never pays a second round trip to find out what it is looking at.
  (SELECT m.name FROM app_modules m WHERE m.id = help.module_id) AS module_name,
  (SELECT m.mark FROM app_modules m WHERE m.id = help.module_id) AS module_mark,
  (SELECT a.name FROM accounts a WHERE a.id = help.raised_by_contact_id) AS raised_by_contact_name,
  EXISTS (SELECT 1 FROM portal_users pu WHERE pu.user_id = help.creator_id) AS raiser_is_client,
  EXISTS (SELECT 1 FROM portal_users pu WHERE pu.user_id = help.editor_id) AS editor_is_client,
  (SELECT COUNT(*) FROM stories s WHERE s.ticket_id = help.id) AS story_count,
  (SELECT COUNT(*) FROM stories s WHERE s.ticket_id = help.id AND s.status = 'done') AS done_story_count`

/** Fetch one ticket (the raw row the gating + notify need), or throw a clean 404.
 *
 * THE FENCE RIDES THE WRITE PATH TOO. This is the row every help WRITE resolves
 * before it changes anything (edit, status move, reply), so an unfenced version
 * of it is an unfenced version of all three: outside the caller's world the row
 * must be indistinguishable from a made-up id. `creator_id` never changes, so
 * resolving here and updating next is not a race — but the UPDATEs carry the
 * clause as well, because a fence you can only see by reading the caller is a
 * fence the next reader will delete. */
async function ticketOrThrow(
  cfg: D1Rest,
  guard: MemberGuard,
  scope: AccountScope,
  id: string
): Promise<TicketRow> {
  const fence = ticketFence(guard, scope, "all")
  const rows = await d1Query<TicketRow>(
    cfg,
    guard.databaseId,
    `SELECT ${TICKET_COLS} FROM help WHERE id = ?${fence.sql ? ` AND ${fence.sql}` : ""}`,
    [id, ...fence.params]
  )
  if (!rows[0]) throw new GuardError(404, "help_not_found", "That ticket doesn't exist.")
  return rows[0]
}

/** THE SORT, and it is the drag-rank (SCOPE ch.07: "drag-rank is the only
 * priority signal"). It used to be newest-activity-first, which is a fine default
 * and a bad promise: a reply on an old ticket shoved it above the one somebody
 * deliberately dragged to the top, so the order a person arranged survived only
 * until the next comment.
 *
 * `COALESCE(rank, id)` so a row written before the rank column existed still
 * sorts sensibly — a ULID carries its own creation time, so an un-ranked backlog
 * reads newest-first exactly as it did. The id breaks ties, which makes the order
 * TOTAL, which is what the keyset cursor needs to page without repeating a row. */
const TICKET_ORDER = "COALESCE(rank, id)"

/** WHAT THE TICKET LIST MAY BE ORDERED BY (shared/workers/sorting.ts), with the
 * drag-rank as the fallback so a screen that asks for nothing gets the order
 * somebody arranged by hand — which is what the paragraph above is about.
 *
 * THIS DOOR IS ON THE PORTAL'S SURFACE, so the menu was read as an R21 question
 * as well as a usability one: an ordering cannot show a client a row the fence
 * excluded (the WHERE is untouched), but a position can make a hidden VALUE
 * inferable, so every name here is a column that already rides a client's own
 * ticket row. Their question, when they asked it, what kind it is, where it has
 * got to. Nothing about who else asked and nothing about what it cost. */
export const TICKET_SORTS: SortMenu<TicketRow> = {
  rank: { expr: TICKET_ORDER, dir: "desc", key: (r) => r.rank ?? r.id },
  created: { expr: "created_at", dir: "desc", key: (r) => r.created_at },
  updated: { expr: "COALESCE(updated_at, created_at)", dir: "desc", key: (r) => r.updated_at ?? r.created_at },
  status: { expr: "status", dir: "asc", key: (r) => r.status },
  kind: { expr: "help_type", dir: "asc", key: (r) => r.help_type },
  title: { expr: "description", dir: "asc", key: (r) => r.description },
}

/** Tickets for the team, newest-activity first. `scope: "mine"` returns only the
 * caller's own raised tickets (the My tab); "all" returns everyone's (All tab).
 * R14 GROWING collection: keyset-PAGED, not capped — tickets accumulate forever,
 * so the door answers "here's a page and where the next one starts" instead of
 * refusing past a ceiling. `cursor` is the opaque one from the previous page. */
/** THE HELP FENCE. "All tickets" means all of the AGENCY's tickets — it was
 * never meant to mean "every client's". A client login raises tickets like
 * anyone else, and the team-wide default handed them everyone else's: names,
 * problems, and whatever they pasted into the description.
 *
 * WHAT A CLIENT SEES, since the owner's ruling of 11 Aug 2026: their COMPANY's
 * questions, not merely their own. The first version of this fence pinned a
 * portal caller to `creator_id = <them>`, and at a real client that made the
 * finance person and the ops person invisible to each other — two people at the
 * same company, each told the other's question does not exist. So the fence is
 * now the ORDINARY account fence (`accountScopeClause`) over the account the
 * ticket was raised for: the company they are standing in, everything nested
 * beneath it, and nothing else. It cannot reach further than the account scope
 * because it IS the account scope — the same clause the accounts list is built
 * from, reading a column instead of a second idea of who the caller is.
 *
 * The agency's own tickets carry NO account, and NULL never matches an IN list,
 * so they stay the agency's. Staff get no clause at all.
 *
 * `tab` is the My/All choice, and it is now a real choice for a client too:
 * "mine" adds `creator_id`, on top of the fence and never instead of it.
 *
 * `table` prefixes the columns for a joined/EXISTS read (the thread fence).
 *
 * Returned as a clause rather than a pre-check so it rides the same WHERE as the
 * page AND the count — a total that didn't pass the same filter would say how
 * many tickets it is refusing to show.
 *
 * NO DEFAULT ANYWHERE BELOW, deliberately. Every reader in this file used to
 * take `portal = false`, which is a fence that fails OPEN when a call site
 * forgets it — and one did: the door that RAISES a ticket answered with the
 * whole team's list, so a client asking a question was handed every other
 * client's. A required parameter turns that miss into a compile error, which is
 * the only kind of reminder that never gets tired. */
export function ticketFence(
  guard: MemberGuard,
  scope: AccountScope,
  tab: "mine" | "all",
  table = ""
): { sql: string; params: string[] } {
  const col = (name: string) => (table ? `${table}.${name}` : name)
  const parts = [
    accountScopeClause(scope, col("account_id")),
    // A RESTRICTED CLIENT SEES ONLY THEIR APPS' TICKETS. A ticket with no app is
    // left OUT for them rather than in: "everything on the two systems you look
    // after" is the sentence the restriction makes, and a request nobody has
    // filed against a system yet is not on one of them.
    appScopeClause(scope, col("app_id")),
    tab === "mine" ? mineClause(guard, scope, col) : { sql: "", params: [] },
  ].filter((p) => p.sql)
  return { sql: parts.map((p) => p.sql).join(" AND "), params: parts.flatMap((p) => p.params) }
}

/** WHAT "MY TICKETS" MEANS, and it changed on 17 Aug 2026 (CHECKLIST 2.3).
 *
 * It used to mean "tickets I typed", which was the wrong question in an agency
 * where 220 of 221 requests were typed by staff on a client's behalf: the person
 * who typed it is rarely the person who has to do anything about it. Aurora's
 * answer, taken over the owner's, is **tickets on the apps I am staffed to** —
 * the systems I am actually responsible for. That is a real inbox.
 *
 * A CLIENT LOGIN KEEPS THE OLD MEANING, deliberately: staffing is our rota, a
 * contact is on nobody's, and "tickets on the apps you are staffed to" would
 * hand every client an empty tab forever. For them "mine" is still what they
 * raised, which is the only version of the word that means anything on their
 * side.
 *
 * A SUBQUERY rather than a resolved list of ids: the staffed set is read INSIDE
 * the statement, so the list and its count (which share this clause) can never
 * be asked about two different moments — and an id list would be one more
 * unbounded `IN (…)` to cap. A member staffed to nothing matches no ticket,
 * which is the honest empty answer rather than an error. */
function mineClause(
  guard: MemberGuard,
  scope: AccountScope,
  col: (name: string) => string
): { sql: string; params: string[] } {
  if (scope.kind === "portal") return { sql: `${col("creator_id")} = ?`, params: [guard.userId] }
  return {
    sql: `${col("app_id")} IN (SELECT app_id FROM app_staff WHERE user_id = ? AND deactivated_at IS NULL)`,
    params: [guard.userId],
  }
}

/** LIVE OR PUT AWAY — the everyday list against the archive drawer.
 *
 * A separate clause from `ticketFence` on purpose, and the distinction is worth
 * keeping straight: the fence decides what a caller MAY see and rides every read
 * AND every write, while this decides what they are LOOKING AT and rides only the
 * list and its count. Folding it into the fence would quietly make an archived
 * ticket unreplyable and un-unarchivable — you cannot take a record out of a
 * drawer you can no longer reach into. */
function archiveClause(view: "live" | "archived"): string {
  return view === "archived" ? "archived_at IS NOT NULL" : "archived_at IS NULL"
}

/** WHAT THE SEARCH BOX ON THE TICKETS SCREEN ASKS THE SERVER. It rides the list
 * AND the count, so the number beside the results counts the same question the
 * rows answer.
 *
 * It searches the reference and the words a person would recognise a ticket by —
 * the description they wrote and the title we made of it. ESCAPED for the same
 * two reasons the accounts search is (`workers/tenancy/src/lib/accounts.ts`): a
 * search box is not a pattern box, and an alternating `%a%a%…` needle is a
 * handful of bytes that costs the worker exponential time over the whole table. */
/** WHOSE TICKETS — narrowed to one account (a client's own company, or one
 * person's own row). A FILTER, not a fence: the fence has already decided which
 * accounts this caller may see at all, and this only says which of them they are
 * looking at. It rides the list AND its count, or the badge would answer a
 * different question from the rows (R16). */
function accountClause(accountId: string | undefined): { sql: string; params: string[] } {
  return accountId ? { sql: "account_id = ?", params: [accountId] } : { sql: "", params: [] }
}

/** WHICH SYSTEM — the app record's own Tickets tab (CHECKLIST 8.6). The same
 * shape as the account narrowing above and for the same reason: a filter on top
 * of the fence, riding the list AND its count so the badge and the rows answer
 * one question (R16). A ticket that names no app never matches, which is right —
 * "tickets about this system" cannot include the ones nobody said were. */
function appClause(appId: string | undefined): { sql: string; params: string[] } {
  return appId ? { sql: "app_id = ?", params: [appId] } : { sql: "", params: [] }
}

/** WHICH KIND, AND WHICH STAGE — the sub-tabs under All / My / Archived
 * (CHECKLIST 5.1: Ready, Issues, Questions, Requests, Extra, Closed, All).
 *
 * Two facets rather than one, because that strip is genuinely two questions
 * wearing one row of tabs: four of its tabs name a TYPE (the team's own editable
 * `Ticket type` vocabulary, so the strip is DERIVED from the team's values and
 * not hard-coded — retiring "Bug" on the Dropdown values screen retires its tab),
 * and two name a STATUS. "All" sends neither.
 *
 * The status one is deliberately a single value and not a list: every tab in the
 * strip that names a stage names exactly one, and a door that accepted several
 * would be a filter language nobody asked for.
 *
 * Both ride the list AND the count, or the badge answers a different question
 * from the rows beneath it (R16). */
/** ONE SECTION'S TICKETS. `module_id` is a real column on the row, so this is an
 * indexed equality and not a join — `idx_help_module` exists for exactly this. */
function moduleClause(moduleId: string | undefined): { sql: string; params: string[] } {
  return moduleId ? { sql: "module_id = ?", params: [moduleId] } : { sql: "", params: [] }
}

function typeClause(helpType: string | undefined): { sql: string; params: string[] } {
  return helpType ? { sql: "help_type = ?", params: [helpType] } : { sql: "", params: [] }
}

/** THE KIND THAT IS KEPT BUT NEVER SHOWN, subtracted here and nowhere else.
 *
 * The client's ruling of 6 Sep 2026 — keep the rows, stop displaying them —
 * written up in full beside the test itself (`shared/types.ts`,
 * `TICKET_TYPE_KEPT_FOR_MIGRATION`). These rows are being preserved for a
 * migration into another database. Do not "tidy them up".
 *
 * WHY IT IS A CLAUSE ON `ticketWhere` AND NOT A FILTER ON THE ROWS. Everything
 * that describes this collection to a person is a grouped `COUNT(*)` at this
 * same door — the sub-tab badges (`countTicketFacets`), the All/My totals
 * (`countTickets`) and every panel on the dashboard (`readTicketDashboard`).
 * Sieving the rows in the browser would have left all of those counting a
 * backlog the list can no longer show, which is R16's failure in its quietest
 * form: every number true, none of them about the rows on screen. One clause on
 * the one WHERE the page and its counts already share is the only shape that
 * cannot drift.
 *
 * IT IS NOT PART OF `ticketFence`, deliberately. The fence decides what a caller
 * MAY see and rides every read AND every write; this decides what the COLLECTION
 * is and rides only the list, its counts and its charts. Folded into the fence it
 * would have made a requirements ticket unreadable, unreplyable and
 * un-unarchivable — you cannot migrate a row you can no longer reach. */
function keptForMigrationClause(): { sql: string; params: string[] } {
  return { sql: ticketTypeKeptForMigrationExcludedSql("help_type"), params: [] }
}

/** …AND THE WRITE HALF, so no new one can be raised.
 *
 * REMOVING THE WORD FROM THE SEED ONLY HELPS A TEAM THAT DOES NOT EXIST YET.
 * Every team already running got the row from team migration 0034, it is still
 * ACTIVE, and the client's instruction was explicitly not to touch their
 * vocabulary — so their Dropdown values screen still lists it and their ticket
 * form's picker still offers it. That is a hole with a person-shaped edge: raise
 * one and it would vanish the instant it was saved, which reads as data loss
 * even though nothing is lost. Rather than deactivate a row she asked us to
 * leave alone, the DOOR refuses the value. A picker cannot be trusted to
 * withhold anything — the machine surface and the importer reach the same door
 * with no picker at all.
 *
 * IT REFUSES A MOVE INTO THE KIND, NEVER A ROW ALREADY IN IT. `was` is the
 * ticket's current word, and an edit that leaves the type where it is passes.
 * That is the difference between hiding a collection and freezing a record: the
 * existing rows must stay editable and readable right up to the day they are
 * migrated, which is the whole reason they are still here. On a create there is
 * no `was`, so any spelling of the word is refused outright. */
function refuseKeptForMigration(next: string | null, was: string | null): void {
  if (!ticketTypeKeptForMigration(next)) return
  if (ticketTypeKeptForMigration(was)) return
  throw new GuardError(
    400,
    "retired_ticket_type",
    `"${TICKET_TYPE_KEPT_FOR_MIGRATION}" isn't a kind of ticket any more. Pick another one.`
  )
}

/** WHICH STAGE(S) — A SET, NOT ONE WORD (client ruling, 2026-09-06).
 *
 * IT USED TO TAKE EXACTLY ONE, and the comment above `TicketFilter` said why:
 * "every tab in the strip that names a stage names exactly one, and a door that
 * accepted several would be a filter language nobody asked for." That sentence
 * was true of the strip it described and stopped being true the day she ruled
 * "Open → triaged + scheduled + in_progress" — a tab that names three.
 *
 * THE BROWSER MAY NOT DO THIS INSTEAD, which is the whole reason it is here.
 * Every badge on that strip is this door's own grouped `COUNT(*)`
 * (`countTicketFacets`) and the list PAGES (R14), so an Open tab that fetched
 * `status=triaged` and then sieved two more stages out of the loaded page would
 * show "the triaged among the newest fifty" under a badge counting all three
 * — R16's founding defect, drawn deliberately.
 *
 * AN EMPTY SET NARROWS NOTHING rather than matching nothing. `IN ()` is not
 * valid SQL in SQLite and "the caller named no stage" is indistinguishable from
 * "the caller did not ask", so the empty array is the same answer as
 * `undefined`. The route below never produces one — an unrecognised word is
 * dropped, and a parameter that drops to nothing is simply not a filter. */
function statusClause(statuses: readonly HelpStatus[] | undefined): { sql: string; params: string[] } {
  if (!statuses || statuses.length === 0) return { sql: "", params: [] }
  return { sql: `status IN (${statuses.map(() => "?").join(", ")})`, params: [...statuses] }
}

/** WHO SPOKE LAST — the one subselect the WAITING tab is built out of.
 *
 * Written once, interpolated where it is needed, and it takes NO parameter: it
 * correlates on `help.id` and reads nothing a caller supplied, so there is
 * nothing here for a value to be bound into. `ORDER BY created_at DESC, id DESC`
 * rather than `MAX(created_at)`: two replies written in the same millisecond
 * would both satisfy a MAX and the answer would depend on which row the planner
 * reached first, which is a filter that gives two answers to one question. The
 * id is a ULID, so it breaks the tie in the order the rows were actually made. */
const LAST_REPLY_AUTHOR = `(SELECT th.creator_id FROM help_threads th
     WHERE th.help_id = help.id ORDER BY th.created_at DESC, th.id DESC LIMIT 1)`

/** THE WAITING TAB — "this is when we are waiting sth from the customer", and,
 * asked what that meant: "waiting means there's a message from us, pending
 * answer from customer" (client, 2026-09-06).
 *
 * ── IT IS DERIVED, AND THAT IS THE POINT ──────────────────────────────────
 *
 * There is no `waiting` status and this adds none. A status would need a column,
 * a backfill across the ~1,820 tickets already in the database, and — far worse
 * — a WRITER: something would have to notice every reply from either side and
 * move the ticket, forever, and the day it missed one the tab would be quietly
 * wrong with no way to tell. Read-time derivation cannot go stale: it is a
 * question about the thread, asked of the thread, every time it is asked.
 *
 * ── WHICH SIDE WROTE A MESSAGE IS NOT RECORDED ANYWHERE ────────────────────
 *
 * `help_threads` (workers/tenancy/src/team-schema/migrations.ts) is id, help_id,
 * message_body, tagged_user_ids, is_agent, created_at and the three creator_*
 * columns. NOT ONE OF THEM SAYS WHOSE SIDE THE AUTHOR IS ON. So the side is
 * COMPUTED, from the one fact that does answer it: a client login is an ordinary
 * team member whose only distinguishing mark is a `portal_users` row in this
 * team's own database (workers/tenancy/src/lib/members.ts says exactly this
 * about the members list, and resolves `isClient` the same way).
 *
 * PRESENCE, NOT LIVENESS — `deactivated_at` is deliberately not tested, which is
 * the convention `members.ts` states in words: "a revoked grant still means
 * 'this login belongs to a client', and reviving it is one click." Reading only
 * the live grants would move every message a paused client ever wrote onto the
 * agency's side of this filter.
 *
 * THE KNOWN WEAKNESS, STATED RATHER THAN HIDDEN: the answer is computed from
 * TODAY'S grant, not from the grant as it stood when the message was written, so
 * it can DRIFT. Granting portal access to somebody who has been replying as
 * staff reclassifies their whole history as the client's, and a ticket sitting
 * on this tab quietly leaves it. (Revocation does NOT drift, because the row
 * survives it — which is the other half of why presence is the right test.) The
 * cost is bounded: a tab is briefly wrong about a handful of tickets, and no
 * record is changed. The alternative — stamping the side onto every reply as it
 * is written — is a column and a backfill that would have to GUESS the same
 * answer for every row already in the table, which is the same drift, frozen.
 *
 * `is_agent` COUNTS AS A MESSAGE FROM US, and it needs no clause of its own.
 * The column marks the AI-drafted reply nobody typed (`maybeDraftFirstReply`,
 * further down this file, is still a no-op hook — no row in any team database
 * carries a 1 today). When it ships, that reply is POSTED INTO THE THREAD the
 * client reads and is written under a staff actor's own `creator_id`, so the
 * portal test above already classifies it as ours. Excluding it would have been
 * the expensive mistake: a ticket whose only outbound message was drafted rather
 * than typed is exactly the one nobody has chased, and it would have been the
 * one this tab hid. The client is waiting on an answer, not on an author.
 *
 * A TICKET WITH NO REPLIES AT ALL IS NOT WAITING — the subselect returns NULL
 * and the first half of the clause fails. Nothing has been said, so nobody is
 * pending an answer to it, and a ticket nobody has replied to belongs on Open
 * (where it is) rather than here. A reply whose `creator_id` is NULL (the column
 * is nullable) falls the same way: an author we cannot identify is not an author
 * we may claim.
 *
 * ── AND WAITING IS A SUBSET OF OPEN, NOT A SIBLING OF IT ──────────────────
 *
 * The tab pairs this clause with the SAME `OPEN_TAB_STATUSES` the Open tab
 * sends, so every ticket on Waiting is also on Open. That is not a bug and it is
 * not double-counting: Open is "what is under way" and Waiting is "the part of
 * it that is not moving because we are the ones who spoke last". A reader
 * clearing Waiting is working through a corner of Open, and the two badges
 * overlapping is what makes that legible rather than what makes it wrong. */
function waitingClause(waiting: boolean | undefined): { sql: string; params: string[] } {
  if (!waiting) return { sql: "", params: [] }
  return {
    sql: `(${LAST_REPLY_AUTHOR} IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM portal_users pu WHERE pu.user_id = ${LAST_REPLY_AUTHOR}))`,
    params: [],
  }
}

/** AND THE NUMBER IT USED TO HAVE. Migration 0068 carried every ticket from the
 * old account-coded reference (`VU Solutions-T1183`) to the team-wide one, and
 * kept the old string in `ref_aliases` precisely so this box still answers it —
 * a client quoting a number from an email last year is the whole reason the
 * client asked for the alias rather than a plain rewrite. The clause is built by
 * `refAliasMatchSql` rather than written here, so the five doors that search a
 * reference cannot each grow their own spelling of it. */
function searchClause(q: string | undefined): { sql: string; params: string[] } {
  if (!q) return { sql: "", params: [] }
  const needle = `%${likeLiteral(q.toLowerCase())}%`
  return {
    sql: `(LOWER(description) LIKE ? ESCAPE '\\' OR LOWER(ref) LIKE ? ESCAPE '\\' OR LOWER(COALESCE(title_en, '')) LIKE ? ESCAPE '\\'
       OR ${refAliasMatchSql(TEAM_REF_TABLES.ticket, `${TEAM_REF_TABLES.ticket}.id`)})`,
    params: [needle, needle, needle, needle],
  }
}

/** THE FACETS THE TICKET DOOR PARSES. Declared as a type so the door, the count,
 * the machine surface and this file cannot drift about what a filter IS (R19) —
 * the same shape `StoryFilter` has had since the work engine landed, adopted here
 * the day the list grew a second row of tabs. */
export type TicketFilter = {
  /** the My/All choice — a raiser filter on top of the fence, never instead */
  tab: "mine" | "all"
  /** the everyday list, or the archive drawer */
  view: "live" | "archived"
  /** the search box, answered by the door (R14: the list pages) */
  q?: string
  /** one client's tickets — a FILTER on top of the fence */
  accountId?: string
  /** one system's tickets — the app record's Tickets tab (8.6) */
  appId?: string
  /** ONE SECTION of one app — what "group all the tickets I am creating in an
   * organized way" actually asks for. Sits BESIDE `appId` rather than replacing
   * it: a module id already implies its app, but the two filters are chosen
   * independently on screen (pick the app, then narrow), and a module filter
   * with no app named still answers correctly. */
  moduleId?: string
  /** one kind — the sub-tab strip's four type tabs */
  helpType?: string
  /** ONE OR MORE STAGES — the strip's Triage, Ready, Open, Waiting and Closed
   * tabs. A SET since 2026-09-06, because "Open" names three of them; see
   * `statusClause` for why the browser may not do this narrowing instead. */
  statuses?: HelpStatus[]
  /** WE SPOKE LAST AND NOBODY HAS ANSWERED — derived from the thread rather than
   * stored, and only ever asked ALONGSIDE `statuses`. See `waitingClause`. */
  waiting?: boolean
}

/** Everything except the keyset cursor, written once so the page and its count
 * are asked the one question (R16). */
function ticketWhere(
  guard: MemberGuard,
  scope: AccountScope,
  filter: TicketFilter
): { sql: string[]; params: string[] } {
  const fence = ticketFence(guard, scope, filter.tab)
  const parts = [
    // FIRST, AND UNCONDITIONALLY — no facet turns it off, because "the tickets"
    // no longer means these (see `keptForMigrationClause`). It sits with the
    // filters rather than in the fence for the reason written there.
    keptForMigrationClause(),
    accountClause(filter.accountId),
    appClause(filter.appId),
    moduleClause(filter.moduleId),
    typeClause(filter.helpType),
    statusClause(filter.statuses),
    // LAST, because it is the only clause here that reads another table. Every
    // clause above it is an indexed equality on `help` itself, so a row that
    // fails one of those never reaches the correlated subselect at all.
    waitingClause(filter.waiting),
    searchClause(filter.q),
  ].filter((p) => p.sql)
  return {
    sql: [archiveClause(filter.view), ...(fence.sql ? [fence.sql] : []), ...parts.map((p) => p.sql)],
    params: [...fence.params, ...parts.flatMap((p) => p.params)],
  }
}

export async function listTickets(
  cfg: D1Rest,
  guard: MemberGuard,
  scope: AccountScope,
  filter: TicketFilter,
  cursor: string | null,
  ordering: Ordering<TicketRow> = resolveOrdering(TICKET_SORTS, "rank", undefined, undefined)
): Promise<Page<HelpTicket>> {
  // The ORDER BY, the keyset predicate and the cursor's key come off ONE
  // ordering, so the sort can never reach the rows and miss the cursor.
  const pos = decodeCursor(cursor, ordering.sig)
  const after = keysetAfter(pos, ordering.expr, ordering.dir)
  const where = ticketWhere(guard, scope, filter)
  const clauses = [...where.sql, ...(after.sql ? [after.sql] : [])]
  const params = [...where.params, ...after.params]
  const rows = await d1Query<TicketRow>(
    cfg,
    guard.databaseId,
    // LIMIT is PAGE_SIZE + 1 — the extra row is how hasMore is known (R14).
    `SELECT ${TICKET_COLS} FROM help WHERE ${clauses.join(" AND ")}
     ${orderBy(ordering)} LIMIT ${PAGE_SIZE + 1}`,
    params
  )
  // The page's key is the SORT, and the sort is the rank — keyed off anything
  // else and page two starts in a different place from where page one stopped.
  const page = toPage(rows, PAGE_SIZE, (r) => [ordering.key(r), r.id], ordering.sig)
  return { ...page, rows: page.rows.map((r) => toTicket(r, scope)) }
}

/** R16: exact server COUNT(*) for the badges — the All total and the caller's
 * own (My) total in one read; never a loaded list's length. */
export async function countTickets(
  cfg: D1Rest,
  guard: MemberGuard,
  scope: AccountScope,
  filter: TicketFilter
): Promise<{ total: number; mineTotal: number }> {
  // R16 says the count is exact; the fence says exact ABOUT WHAT THEY MAY SEE.
  // An unfenced total would tell a client how many tickets exist that it is
  // refusing to show them — a smaller leak, but the same leak. Both totals ride
  // the SAME clause: "All" is their company's, "My" is the part they raised, and
  // for a client login those two numbers now genuinely differ.
  // …and it counts the SAME VIEW the list is showing. A total taken across live
  // and archived together would badge a number the list can never reach, which is
  // the R16 failure in its quietest form: both numbers true, neither about the
  // rows on screen.
  // …and it counts the SAME SEARCH, when there is one: a filtered list showing an
  // unfiltered total is the R16 failure the other way round.
  // …and the SAME account narrowing, the SAME kind and the SAME stage, for the
  // same reason: a tab badging one client's Questions over a total counting
  // everybody's everything is the R16 failure again, four times over.
  //
  // ONE `ticketWhere` CALL, shared with the list above, and that is the fix as
  // much as it is the tidying: this function used to rebuild the clause by hand
  // and had ALREADY drifted — it appended the account clause to the SQL and left
  // its parameter out of the array, so a tab narrowed to one client bound the
  // search needle into the account slot. The two questions are now literally the
  // same expression, so they cannot be asked differently.
  //
  // The count always reads the "all" tab: `mineTotal` is computed beside it from
  // the same rows, so narrowing to the caller's own first would make "my" the
  // denominator of itself.
  const where = ticketWhere(guard, scope, { ...filter, tab: "all" })
  // R16 (amended): counted exactly to TOTAL_COUNT_CAP through the one bounded
  // seam. Both numbers are BADGES, so both are clamped — "my" tickets cannot
  // exceed all tickets, and a partial tally beside a partial total tells the same
  // story at the same ceiling.
  //
  // The "mine" tally is the SAME expression the My tab filters by (mineClause),
  // not a second idea of the word — R16's whole point. When that sentence
  // changed from "tickets I typed" to "tickets on my apps", the badge changed
  // with it because there is only one place it is written.
  const mine = mineClause(guard, scope, (n) => n)
  const row = await countCollectionWith<{ total: number; mine: number }>(
    cfg,
    guard.databaseId,
    `SELECT (${mine.sql}) AS is_mine FROM help WHERE ${where.sql.join(" AND ")}`,
    "COUNT(*) AS total, SUM(is_mine) AS mine",
    [...mine.params, ...where.params]
  )
  return { total: reportedTotal(row?.total ?? 0), mineTotal: reportedTotal(row?.mine ?? 0) }
}

/** THE SUB-TAB BADGES, IN ONE READ (R16 + CHECKLIST 5.1).
 *
 * A tab strip of seven cannot cost seven counts: the strip is on the screen a
 * team lives in, and six extra bounded scans per page load is exactly the sort of
 * cost the count seam was capped to avoid. So this is ONE grouped read — the
 * server's own tally per type and per status over the same WHERE the list uses,
 * minus the type and status facets themselves (a strip whose Questions badge was
 * counted while narrowed to Questions would read "N" on every tab).
 *
 * BOUNDED like every other count here: the inner select carries the same ceiling,
 * so a team with a million tickets pays the same worst case as everywhere else. */
export async function countTicketFacets(
  cfg: D1Rest,
  guard: MemberGuard,
  scope: AccountScope,
  filter: TicketFilter
): Promise<{
  byType: Record<string, number>
  byStatus: Record<string, number>
  byAccount: { accountId: string; accountName: string | null; open: number; total: number }[]
}> {
  const where = ticketWhere(guard, scope, {
    ...filter,
    tab: "all",
    helpType: undefined,
    statuses: undefined,
    // …AND THE DERIVED ONE TOO. `waiting` is a narrowing OF the stage facet (the
    // Waiting tab is Open plus a predicate), so counting the strip's badges
    // while it was on would have every badge answering "…that we replied to
    // last", which is the same R16 failure the two lines above it prevent.
    waiting: undefined,
  })
  const rows = await d1Query<{ help_type: string | null; status: string; n: number }>(
    cfg,
    guard.databaseId,
    // R14: bounded by GROUPING — at most (types × statuses) rows come back, and
    // both vocabularies are collections that cannot run away.
    `SELECT help_type, status, COUNT(*) AS n FROM help
      WHERE ${where.sql.join(" AND ")} GROUP BY help_type, status LIMIT ${TICKET_FACET_CAP}`,
    where.params
  )
  const byType: Record<string, number> = {}
  const byStatus: Record<string, number> = {}
  for (const r of rows) {
    if (r.help_type) byType[r.help_type] = (byType[r.help_type] ?? 0) + r.n
    byStatus[r.status] = (byStatus[r.status] ?? 0) + r.n
  }

  /* WHICH CLIENT HAS THE MOST, COUNTED BY THE DATABASE.
   *
   * Measured on 2026-08-28: asked "which account has the most open tickets?" the
   * assistant spent six steps and four and a half minutes pulling ticket rows and
   * trying to tally them in its head, then gave up and said the tool only returns
   * overall totals. It was right — it did. A model counting hundreds of rows by
   * reading them is slow, expensive and wrong, and no model is good at it.
   *
   * So the database counts. It is the same argument `byType` and `byStatus` were
   * already making, applied to the third question people actually ask, and it is
   * bounded the same way: GROUPED, so at most one row per account, ORDERED by
   * open count so the answer to "the most" is the first row, and capped. */
  const perAccount = await d1Query<{
    account_id: string
    account_name: string | null
    open_n: number
    total_n: number
  }>(
    cfg,
    guard.databaseId,
    // THE TABLE IS NOT ALIASED, and that is now load-bearing rather than a
    // style choice. `ticketWhere` is shared by five reads, and since the search
    // clause learned to look in `ref_aliases` (migration 0068) it correlates on
    // `help.id` — which resolves under `FROM help` and under nothing else. A
    // bare `id` was tried first and is ambiguous here, because `accounts` has
    // one too. Alias this table again and the read fails loudly on the next run
    // rather than quietly returning the wrong rows.
    `SELECT help.account_id AS account_id, a.name AS account_name,
            SUM(CASE WHEN help.status = 'resolved' THEN 0 ELSE 1 END) AS open_n,
            COUNT(*) AS total_n
       FROM help LEFT JOIN accounts a ON a.id = help.account_id
      WHERE ${where.sql.join(" AND ")} AND help.account_id IS NOT NULL
      GROUP BY help.account_id, a.name
      ORDER BY open_n DESC, total_n DESC
      LIMIT ${TICKET_FACET_CAP}`,
    where.params
  )
  return {
    byType,
    byStatus,
    byAccount: perAccount.map((r) => ({
      accountId: r.account_id,
      accountName: r.account_name,
      open: Number(r.open_n) || 0,
      total: Number(r.total_n) || 0,
    })),
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
 * THE TICKETS DASHBOARD — the whole backlog, asked eight ways, in one read.
 *
 * WHY THIS IS ITS OWN DOOR AND NOT MORE FACETS ON THE LIST. `countTicketFacets`
 * above rides EVERY ticket page, because its three tallies badge a tab strip that
 * is on the screen whether anybody looks at it or not. These do not badge
 * anything: they are one tab's charts, opened deliberately. Hanging them
 * off the list door would put eight extra grouped scans on every page of every
 * ticket list on both front doors, for a tab most reads never show — the same
 * argument, run the other way, that made the tab strip ONE grouped read instead
 * of six counts.
 *
 * COUNTED BY THE DATABASE, LIKE EVERY OTHER NUMBER HERE. The rows a chart would
 * need to tally these itself are the whole backlog, which is a GROWING
 * collection (R14) the browser only ever holds page one of — so a chart drawn
 * from loaded rows would be a picture of the newest fifty tickets under a title
 * claiming to be the backlog. `countTicketFacets`' own note on `byAccount` is the
 * measured version of that argument.
 *
 * EVERY READ IS BOUNDED BY ITS GROUPING and says its cap
 * (TICKET_DASHBOARD_GROUP_CAP, which explains why it is smaller than the badge
 * one). Most group over sets that cannot run away — the team's ticket vocabulary,
 * the seven-value status lifecycle, and twelve months — crossed with each other
 * and with themselves. The two that group over something that DOES grow (clients,
 * systems) are ORDERED with the busiest first before they are capped, so the cap
 * can only ever drop the quiet tail, never the answer. Two more are single
 * aggregate rows and are capped at one.
 *
 * EVERY DURATION HERE IS COUNTED IN WORKING DAYS, through the one shared
 * expression (`businessDaysSql`, shared/workers/business-days.ts) and never by
 * subtracting two `julianday`s at the chart that needs it. The client's ruling,
 * 6 Sep 2026: "the time counts monday-friday! saturday and sunday do not count
 * towards how long it took! very very important!" That seam's own header carries
 * the arithmetic and the reason it is one function rather than three — including
 * why public holidays are deliberately NOT subtracted.
 * ═══════════════════════════════════════════════════════════════════════════ */

/** The stages a ticket is still OURS TO DO SOMETHING ABOUT, spelled for SQL.
 *
 * DERIVED from `OPEN_HELP_STATUSES` (shared/types.ts), never retyped as `status
 * <> 'resolved'`: the day an eighth stage lands, or the day "resolved" stops
 * being the only finished one, every "open work" chart here moves with the one
 * list rather than three of them moving and two staying behind. The values are
 * a fixed code-owned enum, so this interpolation can only ever contain words
 * this file shipped with. */
const OPEN_STATUS_SQL = OPEN_HELP_STATUSES.map((s) => sqlString(s)).join(", ")

export type TicketDashboard = {
  /** 1B — OPEN WORK, BY KIND, WITH THE STAGE VISIBLE INSIDE EACH KIND. One row
   * per (kind, stage) pair, so the chart can stack the stages inside each type's
   * bar. Deliberately NOT two separate groupings: "12 questions, 9 of them still
   * new" is a fact about one pair, and two tallies beside each other cannot say
   * it. `helpType` is never null here — a ticket nobody gave a kind has no bar
   * to sit in. */
  openByTypeAndStatus: { helpType: string; status: string; n: number }[]
  /** 2B — WHICH CLIENT ASKS FOR THE MOST OF WHAT. The account facet on
   * `countTicketFacets` groups by client ALONE, which answers "who generates the
   * most work" and cannot answer "who asks for the most extras" — this is the
   * same read with the kind crossed in. `open` and `total` both ride the row for
   * the reason `byAccount` carries both: a client whose extras are all delivered
   * is a real answer to "who asks for the most", not a row worth hiding. */
  byAccountAndType: {
    accountId: string
    accountName: string | null
    helpType: string
    open: number
    total: number
  }[]
  /** 3A — HOW LONG THINGS TAKE TO CLOSE, AS A DISTRIBUTION AND NEVER AS A MEAN.
   * One row per kind (the chart picks the one it wants — the vocabulary is the
   * team's to edit, so this file does not hard-code "Issue"), carrying the
   * five-number summary a box plot is drawn from. A mean over closure times is
   * the one number this data cannot support: a handful of tickets that sat for a
   * year drags it clear of every ticket anybody actually experienced. */
  closureDays: {
    helpType: string
    /** how many closed tickets the summary is computed over — a median over four
     * of them is arithmetic, not a measurement, and only the reader can decide
     * that, so the count travels with it */
    n: number
    minDays: number
    p25Days: number
    medianDays: number
    p75Days: number
    maxDays: number
  }[]
  /** 5A — RAISED AS versus IS NOW. The matrix team migration 0065 exists for:
   * one row per (arrived-as, is-now) pair, the diagonal being the tickets that
   * were never recategorised. `helpType` may be null (a kind that was cleared
   * rather than changed); `raisedAsType` never is — a row with no record of what
   * it arrived as is not a zero, it is a row this question cannot be asked of,
   * and it is counted separately below. */
  raisedVsCurrent: { raisedAsType: string; helpType: string | null; n: number }[]
  /** …AND HOW MANY ROWS THE MATRIX ABOVE CANNOT SPEAK FOR. Every ticket raised
   * before 0065 shipped, the ~788 imported from Glide included. It rides the
   * same read because a matrix without it is a rate with a silently wrong
   * denominator — 0065 refused to backfill precisely so that this number could
   * be told rather than absorbed. */
  raisedAsNotRecorded: number
  /** 3B — THE SAME STATISTIC, MONTH BY MONTH, BY THE MONTH A TICKET CLOSED IN.
   * One row per (kind, month) over the last `CLOSURE_TREND_MONTHS`, carrying the
   * median and the count it was taken over.
   *
   * EVERY BUCKET IS HERE, however few closed in it (client, 2026-09-07: "even if
   * it's only 1, it should appear there"). Until that day a floor of eight was
   * applied in this read and the thin months never reached the screen; the
   * retired constant's note in `shared/types.ts` keeps the argument for it. `n`
   * still travels with every row, and it now carries more weight than it used
   * to: it is the only thing that tells a reader a month's median was taken over
   * one ticket rather than a hundred.
   *
   * `month` is `YYYY-MM`, the month a ticket was CLOSED in and never the month
   * it was raised in — this line answers "are we getting faster", which is a
   * question about the moment the work finished. */
  closureTrend: { helpType: string; month: string; n: number; medianDays: number }[]
  /** 6A — OPEN WORK BY SYSTEM, WITH THE KIND VISIBLE INSIDE EACH SYSTEM. One row
   * per (system, kind), so a bar can be split by what sort of work it is: an app
   * carrying fourteen tickets of which eight are issues is a quality problem in
   * one app, and an app carrying fourteen requests is a client spending money.
   * Two tallies beside each other cannot tell those apart, which is the same
   * argument `openByTypeAndStatus` above is built on.
   *
   * `app_id` is indexed (0035). The null bucket is KEPT and comes back as
   * `appId: null`: "work nobody has said which system it is about" is one of the
   * more useful bars on this chart, and dropping it would quietly shrink the
   * total. `helpType` is never null — a ticket nobody gave a kind has no segment
   * to sit in, exactly as it has no bar in 1B. */
  openByApp: {
    appId: string | null
    appName: string | null
    helpType: string
    open: number
    total: number
  }[]
  /** HOW MANY TICKETS NOBODY HAS OPENED YET, past the line triage already draws
   * (`TRIAGE_AFTER_DAYS`, counted in WORKING days). The one number on this whole
   * screen that is about us rather than about the work: every other chart says
   * what arrived, and this says what we did not pick up.
   *
   * IT IS NOT A NEW PROMISE — the threshold is the one the triage queue has used
   * since it shipped, read from the same constant, so the dashboard and the
   * queue cannot come to disagree about what "late" means. */
  unopenedPastLine: number
  /** HOW MANY TICKETS THE WHOLE QUESTION FOUND — the population every grouping
   * above was taken over, counted once, through the one bounded seam (R16).
   *
   * IT EXISTS SO THE SCREEN CAN SAY "NOTHING MATCHED" IN ONE SENTENCE. Without
   * it a dashboard whose search term finds nothing is six panels each drawing
   * its own private zero, which is a screen that looks broken rather than a
   * screen that answered. And it cannot be INFERRED from the arrays: a ticket
   * with no kind and nothing closed sits in none of the grouped reads above,
   * so "every array is empty" is a proposition about which GROUPINGS happen to
   * exclude nulls today rather than about whether anything matched. Two of
   * those arrays happen to partition the population between them right now —
   * which is exactly the kind of accident that stops being true when somebody
   * adds a `WHERE`, silently, with nothing red.
   *
   * BOUNDED, like every other total over this collection: tickets are a
   * `GROWING_COLLECTIONS` member, so it goes through `countCollection` and
   * stops at `TOTAL_COUNT_CAP` exactly as `countTickets` does. Nothing renders
   * the NUMBER — the screen reads it as "is this zero" — so the ceiling costs
   * no honesty here; it is used because an unbounded `COUNT(*)` over a growing
   * table is the one read this codebase does not allow, whoever reads it. */
  matched: number
}

/** THE WHOLE DASHBOARD, IN ONE ROUND TRIP.
 *
 * `filter` is the everyday list's own question — the fence, the archive view —
 * built by the same `ticketWhere` the list and its counts use, so a chart can
 * never be drawn over rows the list itself would not show (R16's sentence,
 * applied to a picture instead of a badge).
 *
 * THE STAGE FACET IS DROPPED AND THE KIND FACET IS NOT, and the two used to be
 * dropped together. A dashboard narrowed to one STAGE would draw a pipeline
 * chart of one row and a closing-time chart of tickets that have not closed:
 * every heading here would be about the backlog while every picture was about a
 * slice of it. A dashboard narrowed to one KIND is a different sentence — it is
 * the toolbar's second filter, ruled by the client on 6 Sep 2026 ("dashboard
 * should also have toolbar / filter by client and type / no sort"), and every
 * chart on the screen still answers its own heading with the kind held constant:
 * "how long does an Issue take to close" is the same question as "how long does
 * a ticket take to close", asked of fewer rows. The two filters are a WHERE
 * clause on every read below rather than a narrowing of loaded rows, because a
 * dashboard has no rows to narrow — there is nothing on that tab a browser could
 * sieve.
 *
 * …AND THE THIRD FILTER IS THE SEARCH BOX (`q`, 7 Sep 2026). It is the same
 * field on the same `TicketFilter` the LIST door binds its own `?q=` into, so it
 * reaches the same `searchClause` inside the same `ticketWhere` — one matcher
 * over description, reference and title, and therefore one answer. A term that
 * finds eleven tickets on the list tab draws these panels over those eleven,
 * and that is a property of there being no second matcher rather than of two
 * matchers currently agreeing. Nothing in this function had to change to accept
 * it, which is the point `appId` already made: a filter the list understood was
 * already understood here.
 *
 * NINE STATEMENTS IN ONE WAVE. Each is its own round trip to the team database
 * (~150ms, measured 25 Aug 2026) and none depends on another's answer, so they
 * are one `Promise.all` rather than nine consecutive lines — the same reasoning
 * `createTicket`'s waves are built on. The ninth is `matched`, the population
 * the other eight were grouped over; see the field's own note on the type. */
export async function readTicketDashboard(
  cfg: D1Rest,
  guard: MemberGuard,
  scope: AccountScope,
  filter: TicketFilter
): Promise<TicketDashboard> {
  const where = ticketWhere(guard, scope, {
    ...filter,
    tab: "all",
    // The stage is what half these panels are ABOUT, so it can never be a
    // narrowing they inherit — and `waiting` goes with it for the same reason it
    // does in `countTicketFacets`: it is a narrowing of the stage.
    statuses: undefined,
    waiting: undefined,
  })
  const fenced = where.sql.join(" AND ")
  const cap = TICKET_DASHBOARD_GROUP_CAP
  // HOW LONG A TICKET TOOK, ONCE, for both reads below that need it (the
  // client's Mon–Fri ruling; see the seam's own header). The column names are
  // written here in the source and never taken off a request, which is the one
  // condition `workingDaysSql` interpolating rather than binding asks for.
  const tookDays = workingDaysSql("created_at", "resolved_at")
  // …AND THE LINE A TICKET NOBODY HAS OPENED IS LATE PAST. Built the way the
  // triage queue builds it — the same function, the same constant, a bound
  // parameter rather than date arithmetic in the statement — because the number
  // on this dashboard and the length of that queue are the same fact, and two
  // ways of asking it would eventually be two answers.
  const unopenedCutoff = workingDaysAgo(new Date(), TRIAGE_AFTER_DAYS).toISOString()

  // NINE STATEMENTS NOW, and the ninth is the population the other eight were
  // grouped over — see `matched` on the type above for why it is counted rather
  // than inferred from whether the eight came back empty.
  const [openByType, byAccountType, closure, trend, matrix, notRecorded, byApp, unopened, matched] = await Promise.all([
    // 1B. Bounded by GROUPING: at most (kinds × stages) rows, and both sets are
    // collections that cannot run away.
    d1Query<{ help_type: string; status: string; n: number }>(
      cfg,
      guard.databaseId,
      `SELECT help_type, status, COUNT(*) AS n FROM help
        WHERE ${fenced} AND status IN (${OPEN_STATUS_SQL}) AND help_type IS NOT NULL
        GROUP BY help_type, status
        LIMIT ${cap}`,
      where.params
    ),
    // 2B. The fenced rows are named ONCE in a CTE and joined from there, rather
    // than joining `help` to `accounts` and leaning on the WHERE's unqualified
    // column names to land on the right table. `accounts` carries an
    // `account_id` of its own and `apps` carries a `ref`, both of which the
    // ticket clause can name, so "it resolves correctly today" is a property of
    // which filters this door happens to parse — which is exactly the kind of
    // thing that stops being true when somebody adds one.
    //
    // ORDERED BEFORE IT IS CAPPED, and ordered ACROSS the kinds rather than
    // within each: the cap then drops the quietest (client, kind) pairs in the
    // team, so the top of every kind's ranking survives it. That is the property
    // the two ranked lists need; "the first N clients alphabetically" is not.
    d1Query<{
      account_id: string
      account_name: string | null
      help_type: string
      open_n: number
      total_n: number
    }>(
      cfg,
      guard.databaseId,
      `WITH scoped AS (SELECT account_id, help_type, status FROM help WHERE ${fenced})
       SELECT s.account_id AS account_id, a.name AS account_name, s.help_type AS help_type,
              SUM(CASE WHEN s.status = 'resolved' THEN 0 ELSE 1 END) AS open_n,
              COUNT(*) AS total_n
         FROM scoped s LEFT JOIN accounts a ON a.id = s.account_id
        WHERE s.account_id IS NOT NULL AND s.help_type IS NOT NULL
        GROUP BY s.account_id, a.name, s.help_type
        ORDER BY open_n DESC, total_n DESC
        LIMIT ${cap}`,
      where.params
    ),
    // 3A. THE QUANTILES ARE COMPUTED BY THE DATABASE, and that is the bound as
    // much as it is the arithmetic: the alternative — hand back every closed
    // ticket's duration and let the chart sort them — is an unbounded row set on
    // a collection R14 makes page, which is the one shape this file may not
    // return. One row per kind comes back instead.
    //
    // NEAREST RANK, no interpolation, because the reader is a person looking at
    // a box: the quartiles are the durations of REAL tickets rather than numbers
    // between two of them. The median is the one exception and it is the
    // ordinary definition — with an even count it averages the two middle rows,
    // which is why the two ranks are selected together and averaged.
    // `(n*25+99)/100` is integer-division ceiling: SQLite's `ceil` is a
    // compile-time option and D1 is not the place to find out whether it was
    // taken. For n >= 1 both ranks are always within 1..n, so no clamping is
    // needed and none is written.
    //
    // WHAT IS LEFT OUT, deliberately: a ticket whose `resolved_at` is missing or
    // unreadable, and one that reads as closed BEFORE it was raised. `julianday`
    // answers null for a date it cannot parse, and both comparisons then fail,
    // so those rows fall out rather than arriving as a negative duration that
    // would drag a quartile below zero.
    //
    // …AND EVERYTHING CLOSED MORE THAN `CLOSURE_WINDOW_MONTHS` AGO, which is a
    // decision rather than a tidy-up. The panel asks how long a ticket takes to
    // close, which is a question about NOW, and a distribution taken over all
    // time is a distribution over ways of working the team has already left
    // behind. The trend read below is where the longer view lives, and it is a
    // better shape for it: a year of months says WHICH WAY this is going, where
    // one number over a year says only that a year happened.
    //
    // SIX CALENDAR MONTHS, NOT A COUNT OF DAYS (client, 6 Sep 2026: "for this
    // how long, only consider the latest 6 months"). `julianday('now', '-6
    // months')` walks the calendar the way she said it, so the window is the
    // same six months whichever six they are — where a fixed day count would
    // make a window containing February shorter than one containing July. The
    // shape of the comparison is unchanged: `julianday` still answers null for
    // a date it cannot parse, so an unreadable `resolved_at` falls out here
    // exactly as it falls out of the two comparisons above it.
    //
    // WORKING DAYS, NOT CALENDAR DAYS (`tookDays`). This read used to subtract
    // two `julianday`s, so a ticket raised at five on a Friday and closed at
    // nine on the Monday reported three days of work over a weekend nobody
    // worked. The client's ruling is in the seam's own header.
    d1Query<{
      help_type: string
      n: number
      min_days: number
      p25_days: number
      median_days: number
      p75_days: number
      max_days: number
    }>(
      cfg,
      guard.databaseId,
      `WITH closed AS (
         SELECT help_type AS t, ${tookDays} AS days
           FROM help
          WHERE ${fenced} AND status = 'resolved' AND help_type IS NOT NULL
            AND julianday(resolved_at) >= julianday(created_at)
            AND julianday(resolved_at) >= julianday('now', '-${CLOSURE_WINDOW_MONTHS} months')
       ), ranked AS (
         SELECT t, days,
                ROW_NUMBER() OVER (PARTITION BY t ORDER BY days) AS rn,
                COUNT(*)     OVER (PARTITION BY t)               AS n
           FROM closed
       )
       SELECT t AS help_type, n AS n,
              MIN(days) AS min_days,
              MAX(days) AS max_days,
              MAX(CASE WHEN rn = (n * 25 + 99) / 100 THEN days END) AS p25_days,
              AVG(CASE WHEN rn IN ((n + 1) / 2, (n + 2) / 2) THEN days END) AS median_days,
              MAX(CASE WHEN rn = (n * 75 + 99) / 100 THEN days END) AS p75_days
         FROM ranked
        GROUP BY t, n
        LIMIT ${cap}`,
      where.params
    ),
    // 3B. THE SAME MIDDLE TICKET, ONE MONTH AT A TIME — the line that says which
    // way this is going, which is the question the box plot above cannot answer
    // at all. Grouped by the month a ticket CLOSED in, because that is when the
    // work finished: grouping by the month it was RAISED in would put a ticket
    // that took four months into the month it arrived, so the most recent months
    // would be built out of the fastest tickets and every trend would look like
    // an improvement.
    //
    // THERE IS NO FLOOR ON THIS READ ANY MORE (client, 2026-09-07): "Only
    // months with at least 8 of a kind are thrown. No, even if it's only 1, it
    // should appear there."
    //
    // WHAT USED TO BE HERE, so the removal is a decision on the record rather
    // than a line that went missing: `WHERE n >= CLOSURE_TREND_MIN_CLOSURES`,
    // eight, applied in the rows precisely because a median exists for a bucket
    // of one and is then drawn at the same weight as a median of a hundred. That
    // objection is still true and the constant's own retirement note in
    // `shared/types.ts` keeps the whole argument. She has heard it and ruled the
    // other way: a month she knows something closed in, drawn as a gap, reads as
    // the app having lost her work, and that costs her more than a line that
    // jumps.
    //
    // SO EVERY BUCKET LEAVES THE DOOR, and `n` still travels with each one — it
    // is what the screen's hover readout says per month, which is now the only
    // thing standing between a thin month and a misread one. Nothing here
    // thresholds anything; a filter reintroduced under another name would be the
    // same refusal wearing a different word.
    //
    // BOUNDED BY ITS GROUPING: at most (kinds × twelve months) rows, and the cap
    // is said anyway (R14). No ORDER BY for the cap to protect, because there is
    // no tail to lose — the whole grouping is small by construction.
    d1Query<{ help_type: string; month: string; n: number; median_days: number }>(
      cfg,
      guard.databaseId,
      `WITH closed AS (
         SELECT help_type AS t, strftime('%Y-%m', resolved_at) AS mo, ${tookDays} AS days
           FROM help
          WHERE ${fenced} AND status = 'resolved' AND help_type IS NOT NULL
            AND julianday(resolved_at) >= julianday(created_at)
            AND resolved_at >= strftime('%Y-%m-01', 'now', '-${CLOSURE_TREND_MONTHS - 1} months')
       ), ranked AS (
         SELECT t, mo, days,
                ROW_NUMBER() OVER (PARTITION BY t, mo ORDER BY days) AS rn,
                COUNT(*)     OVER (PARTITION BY t, mo)               AS n
           FROM closed
       )
       SELECT t AS help_type, mo AS month, n AS n,
              AVG(CASE WHEN rn IN ((n + 1) / 2, (n + 2) / 2) THEN days END) AS median_days
         FROM ranked
        GROUP BY t, mo, n
        ORDER BY mo ASC
        LIMIT ${cap}`,
      where.params
    ),
    // 5A. NULL `raised_as_type` is EXCLUDED here and counted separately in the
    // next statement — the two together are the whole population, and neither is
    // any use without the other. Team migration 0065 is the argument for why
    // those rows are null rather than guessed at.
    d1Query<{ raised_as_type: string; help_type: string | null; n: number }>(
      cfg,
      guard.databaseId,
      `SELECT raised_as_type, help_type, COUNT(*) AS n FROM help
        WHERE ${fenced} AND raised_as_type IS NOT NULL
        GROUP BY raised_as_type, help_type
        LIMIT ${cap}`,
      where.params
    ),
    // …and the denominator's missing half. One aggregate row.
    d1Query<{ n: number }>(
      cfg,
      guard.databaseId,
      `SELECT COUNT(*) AS n FROM help WHERE ${fenced} AND raised_as_type IS NULL LIMIT 1`,
      where.params
    ),
    // 6A. Same CTE shape and same reasoning as 2B, and the NULL app is kept.
    //
    // THE KIND IS CROSSED IN NOW, so a bar can be split by what sort of work it
    // is — which is the whole point of the chart the client picked. That change
    // breaks the ORDERING 2B can get away with, and the fix is the two extra
    // CTEs below rather than a smarter ORDER BY. Ordering (app, kind) pairs by
    // their own tally and capping at a hundred would rank pairs ACROSS apps, so
    // the busiest app's smallest segment could be dropped while a quiet app's
    // biggest one survived — and a stacked bar missing one segment does not look
    // broken, it looks like an app with no extras. 2B is safe from that because
    // it draws two independent ranked lists and a missing pair is a missing row;
    // here a missing pair silently rewrites a bar that is still drawn.
    //
    // So the apps are ranked FIRST, by their own whole-app total, and the pairs
    // are then ordered by their app's rank. The cap can now only ever drop the
    // quiet apps at the bottom of the chart — entire bars, visibly absent —
    // never a slice out of a bar that is still on screen.
    //
    // `r.app_id IS p.app_id` rather than `=`: the null app is a real bucket and
    // `NULL = NULL` is null, so a plain equality would join that bucket to
    // nothing and drop the very bar the comment above insists on keeping.
    d1Query<{
      app_id: string | null
      app_name: string | null
      help_type: string
      open_n: number
      total_n: number
    }>(
      cfg,
      guard.databaseId,
      `WITH scoped AS (SELECT app_id, help_type, status FROM help WHERE ${fenced}),
            pairs AS (
              SELECT app_id, help_type,
                     SUM(CASE WHEN status = 'resolved' THEN 0 ELSE 1 END) AS open_n,
                     COUNT(*) AS total_n
                FROM scoped
               WHERE help_type IS NOT NULL
               GROUP BY app_id, help_type
            ),
            ranked_apps AS (
              SELECT app_id, SUM(open_n) AS app_open, SUM(total_n) AS app_total
                FROM pairs GROUP BY app_id
            )
       SELECT p.app_id AS app_id, ap.name AS app_name, p.help_type AS help_type,
              p.open_n AS open_n, p.total_n AS total_n
         FROM pairs p
         JOIN ranked_apps r ON r.app_id IS p.app_id
         LEFT JOIN apps ap ON ap.id = p.app_id
        ORDER BY r.app_open DESC, r.app_total DESC, p.open_n DESC
        LIMIT ${cap}`,
      where.params
    ),
    // …AND THE ONE NUMBER ON THIS SCREEN THAT IS ABOUT US. Tickets still sitting
    // in `new` past the line the triage queue already draws, in WORKING days.
    //
    // THE SAME PREDICATE `needsTriage` USES, deliberately, down to the strict
    // `<`: `status = 'new'` and raised before the cutoff. A dashboard chip that
    // said seven over a queue holding six would be read as a bug in one of them,
    // and nobody could tell which — so the two are one sentence, built from one
    // function and one constant.
    //
    // `archived_at IS NULL` rides in `fenced` already (the everyday list's own
    // `view: "live"`), which is the third clause that queue applies: a ticket
    // somebody deliberately put away is not one nobody has looked at.
    //
    // ONE AGGREGATE ROW, so `LIMIT 1` is the honest cap (R14). The cutoff binds
    // AFTER the fence's own parameters, because both are positional.
    d1Query<{ n: number }>(
      cfg,
      guard.databaseId,
      `SELECT COUNT(*) AS n FROM help
        WHERE ${fenced} AND status = 'new' AND created_at < ? LIMIT 1`,
      [...where.params, unopenedCutoff]
    ),
    // …AND HOW MANY TICKETS THE QUESTION FOUND AT ALL — the denominator under
    // every picture above, over the identical `fenced` clause and the identical
    // parameters, so it can never describe a different population from the one
    // the panels were drawn from.
    //
    // THROUGH THE COUNT SEAM AND NEVER A BARE `COUNT(*)` (R16, amended): tickets
    // grow with ordinary use, and the seam's own header is explicit that a
    // `COUNT(*)` over a growing table is the one read in this product with no
    // ceiling at all. `countCollection` wants the collection's own question
    // selecting one row per member, which is exactly what `fenced` already is.
    countCollection(cfg, guard.databaseId, `SELECT 1 FROM help WHERE ${fenced}`, where.params),
  ])

  // `Number(...) || 0` on every tally, exactly as `byAccount` above does it: the
  // D1 REST door hands numbers back as JSON, and a SUM over no rows is null.
  const num = (v: unknown) => Number(v) || 0
  return {
    openByTypeAndStatus: openByType.map((r) => ({
      helpType: r.help_type,
      status: r.status,
      n: num(r.n),
    })),
    byAccountAndType: byAccountType.map((r) => ({
      accountId: r.account_id,
      accountName: r.account_name,
      helpType: r.help_type,
      open: num(r.open_n),
      total: num(r.total_n),
    })),
    closureDays: closure.map((r) => ({
      helpType: r.help_type,
      n: num(r.n),
      minDays: num(r.min_days),
      p25Days: num(r.p25_days),
      medianDays: num(r.median_days),
      p75Days: num(r.p75_days),
      maxDays: num(r.max_days),
    })),
    raisedVsCurrent: matrix.map((r) => ({
      raisedAsType: r.raised_as_type,
      helpType: r.help_type,
      n: num(r.n),
    })),
    raisedAsNotRecorded: num(notRecorded[0]?.n),
    closureTrend: trend.map((r) => ({
      helpType: r.help_type,
      month: r.month,
      n: num(r.n),
      medianDays: num(r.median_days),
    })),
    openByApp: byApp.map((r) => ({
      appId: r.app_id,
      appName: r.app_name,
      helpType: r.help_type,
      open: num(r.open_n),
      total: num(r.total_n),
    })),
    unopenedPastLine: num(unopened[0]?.n),
    // Already a clamped number off the seam, so no `num(...)` — every other
    // field here is unwrapping a JSON value the REST door handed back, and this
    // one is not.
    matched,
  }
}

/** The rank a new ticket takes: above every one the caller can already see.
 *
 * Read-then-write, deliberately, and safe because of what it is FOR. Two tickets
 * raised in the same instant can land on the same rank; both are "newest", the
 * `id DESC` tiebreak still gives the list a total order, and the first drag
 * separates them for good. See rankAtTop — the alternative is a lock nobody could
 * perceive the benefit of. */
async function topRank(cfg: D1Rest, guard: MemberGuard): Promise<string> {
  const rows = await d1Query<{ top: string | null }>(
    cfg,
    guard.databaseId,
    `SELECT MAX(COALESCE(rank, id)) AS top FROM help LIMIT 1` // R14: one aggregate row
  )
  return rankAtTop(rows[0]?.top ?? null)
}

/** One ticket by id (or null). */
export async function getTicket(
  cfg: D1Rest,
  guard: MemberGuard,
  scope: AccountScope,
  id: string
): Promise<HelpTicket | null> {
  // The fence rides the WHERE here too: a by-id lookup that skipped it would be
  // the leak in its most convenient form (one id, one ticket, no list to page).
  const fence = ticketFence(guard, scope, "all")
  const rows = await d1Query<TicketRow>(
    cfg,
    guard.databaseId,
    `SELECT ${TICKET_COLS} FROM help WHERE id = ?${fence.sql ? ` AND ${fence.sql}` : ""}`,
    [id, ...fence.params]
  )
  return rows[0] ? toTicket(rows[0], scope) : null
}

/** THE THREAD FENCE — the same fence, one table along.
 *
 * A reply belongs to a ticket, so "may I read this conversation?" is exactly
 * "may I read this ticket?". `getTicket` has carried that answer since the help
 * fence landed; the THREAD doors did not, and read `help_threads WHERE help_id
 * = ?` on a caller-supplied id with nothing else on the WHERE. Row ids are not
 * secret — the live channel broadcasts them — so a client login holding
 * `help:read` (which they must hold to use their own support screen at all)
 * could hand back another client's ticket id and read the whole conversation.
 *
 * Expressed as a subquery rather than a pre-check so it rides the SAME WHERE as
 * the rows AND the count: a total that didn't pass the same filter would say how
 * many replies it is refusing to show. The fence reads columns on `help`, not on
 * `help_threads` — hence the alias it is built with. */
function threadFence(guard: MemberGuard, scope: AccountScope): { sql: string; params: string[] } {
  const fence = ticketFence(guard, scope, "all", "h")
  if (!fence.sql) return { sql: "", params: [] }
  return {
    sql: ` AND EXISTS (SELECT 1 FROM help h WHERE h.id = help_id AND ${fence.sql})`,
    params: fence.params,
  }
}

/** Every reply on a ticket, oldest first (the conversation order).
 *
 * WHOSE NAME TRAVELS. "The portal shows work status but never which staff member
 * is doing it" (SCOPE ch.06), and the portal used to keep that promise in the
 * BROWSER: it printed "You" for the signed-in person and the agency's name for
 * everyone else, on the reasoning that a client could only ever see their own
 * tickets, so "everyone else" meant staff. The staff member's real name was on
 * the wire the whole time; only the component declined to draw it.
 *
 * Both halves of that changed at once. Now that a contact sees their COMPANY's
 * questions, "everyone else" includes their own colleagues — and calling a
 * colleague "kwapso" is worse than a leak, it is a lie about who is talking. So
 * the decision moves to the server, where the caller's kind is known: a client
 * login is told the names of the people on THEIR side of the fence and nothing
 * about ours. A reply from someone with no portal login is the agency, and it
 * arrives with no name at all for the portal to render as us.
 *
 * Anyone who could reply on this ticket had to pass the same fence to see it, so
 * "has a portal login" is exactly "is one of this company's people". Staff
 * readers are unaffected — the agency app shows every name, as it must. */
export async function listReplies(
  cfg: D1Rest,
  guard: MemberGuard,
  scope: AccountScope,
  ticketId: string
): Promise<HelpMessage[]> {
  const fence = threadFence(guard, scope)
  const rows = await d1Query<ReplyRow & { from_client: number }>(
    cfg,
    guard.databaseId,
    `SELECT id, help_id, message_body, tagged_user_ids, is_agent, creator_id, creator_name, created_at,
            EXISTS (SELECT 1 FROM portal_users pu WHERE pu.user_id = help_threads.creator_id) AS from_client
       FROM help_threads WHERE help_id = ?${fence.sql} ORDER BY created_at ASC LIMIT ${THREAD_HARD_CAP}`, // R14 hard cap
    [ticketId, ...fence.params]
  )
  // THE NAME AND THE HANDLE, not just the name. Blanking `creator_name` alone
  // left `creator_id` on every staff reply, which is a STABLE PSEUDONYM: the same
  // ULID against the same person on every ticket, for as long as they work here.
  // A pseudonym is anonymity only until something links it to a name once, and
  // the reply notification used to do exactly that ("Alice Smith replied to your
  // ticket") for the very reply the client is looking at. Two halves of one
  // promise; both are kept now, and this is the half that makes the linkage
  // worthless even if a name escapes somewhere else.
  return rows.map((r) =>
    toMessage(
      scope.kind === "portal" && r.from_client !== 1 ? { ...r, creator_id: null, creator_name: null } : r,
      r.from_client === 1
    )
  )
}

/** R16: the thread's exact reply COUNT(*) — the Conversation badge shows this,
 * never the loaded (THREAD_HARD_CAP-bounded) list's length. */
export async function countReplies(
  cfg: D1Rest,
  guard: MemberGuard,
  scope: AccountScope,
  ticketId: string
): Promise<number> {
  const fence = threadFence(guard, scope)
  const rows = await d1Query<{ n: number }>(
    cfg,
    guard.databaseId,
    `SELECT COUNT(*) AS n FROM help_threads WHERE help_id = ?${fence.sql}`,
    [ticketId, ...fence.params]
  )
  return rows[0]?.n ?? 0
}

/** Fields a create / update accepts. */
export type TicketInput = {
  description?: string
  helpType?: string
  screenRecordingLink?: string
  sourceScreen?: string
  sourceRelatedTable?: string
  sourceRelatedRowId?: string
  /** BOTH TITLES, and neither is derived from the other. 788 of the requests
   * arriving from Glide exist only in German, so "the title" is not a single
   * field with a language attached — it is two fields, one of which may be empty
   * until somebody (or the translate door) fills it in. */
  titleDe?: string
  titleEn?: string
  /** STAFF ONLY: the client this ticket is raised FOR. Ignored outright for a
   * portal caller, whose account is never taken from the body. See
   * `accountForStaffTicket`. */
  accountId?: string
  /** WHICH SYSTEM IT IS ABOUT (CHECKLIST 5.8). Proved to be a live app before it
   * is written, exactly as the client is — an unchecked id here would route a
   * request at a system that does not exist. */
  appId?: string
  /** WHICH SECTION OF THAT APP. Proved to belong to `appId` before it is
   * written — see `moduleForTicket` for why the PAIR is the check. */
  moduleId?: string
  /** WHO ASKED (CHECKLIST 5.9) — a contact, meaning a person's own account row
   * linked to the client this ticket belongs to. Proved to be exactly that, so
   * "raised by" can never name a stranger. */
  raisedByContactId?: string
}

/** WHICH APP IS THIS REQUEST ABOUT? Null is allowed and common (the agency's own
 * housekeeping questions are about no system at all), but a NAMED app must be a
 * live row in the caller's own team database — the same proof the client gets,
 * for the same reason: a ticket pointed at an id that does not exist is a ticket
 * whose sub-tab, whose sprint and whose stakeholder can never be resolved. */
async function appForTicket(cfg: D1Rest, guard: MemberGuard, raw: unknown): Promise<string | null> {
  const id = optionalText(raw, "App", TEXT_LIMITS.short)
  if (!id) return null
  const rows = await d1Query<{ id: string }>(
    cfg,
    guard.databaseId,
    `SELECT id FROM apps WHERE id = ${sqlString(id)} AND deactivated_at IS NULL LIMIT 1`
  )
  if (!rows[0]) throw new GuardError(400, "invalid_input", "That app isn't one of ours any more.")
  return rows[0].id
}

/** WHICH SECTION OF THE APP — a module, and it must be a module OF THIS APP.
 *
 * THE PAIR IS THE CHECK, not the id on its own. 160 of the legacy module names
 * are distinct and 124 belong to exactly one app, so ids are plentiful and a
 * client's form is a place somebody can put any of them. Checking only that the
 * module exists would let a ticket on the Padelbase app be filed against a
 * section of somebody else's system — readable to the wrong people, and
 * countable in the wrong app's badge. The `app_id = ?` in this statement is the
 * fence, and it is why the app is resolved BEFORE the module in `createTicket`.
 *
 * A ticket with no app cannot carry a module either: there is nothing to check
 * the module against, so naming one is refused rather than trusted. */
async function moduleForTicket(
  cfg: D1Rest,
  guard: MemberGuard,
  raw: unknown,
  appId: string | null
): Promise<string | null> {
  const id = optionalText(raw, "Module", TEXT_LIMITS.short)
  if (!id) return null
  if (!appId) throw new GuardError(400, "invalid_input", "Choose the app before the module.")
  const rows = await d1Query<{ id: string }>(
    cfg,
    guard.databaseId,
    `SELECT id FROM app_modules WHERE id = ${sqlString(id)} AND app_id = ${sqlString(appId)}
       AND deactivated_at IS NULL LIMIT 1`
  )
  if (!rows[0]) throw new GuardError(400, "invalid_input", "That module isn't part of that app.")
  return rows[0].id
}

/** WHO RAISED IT — a contact ON THIS ACCOUNT, and the fence is the whole point.
 *
 * A contact is a person's own `accounts` row linked to a company through
 * `account_links` (there is no contacts table — CHECKLIST 15.1 says why: Marta is
 * a contact at two companies). So "a contact of this client" is a live link, and
 * checking it is what stops a ticket naming somebody at another company as the
 * person who asked — which would put a stranger's name on a record their own
 * portal will never show them, and ours will.
 *
 * A person may also raise a ticket on their OWN account (a freelancer with no
 * parent company), so the row itself counts as its own contact. */
async function contactForTicket(
  cfg: D1Rest,
  guard: MemberGuard,
  raw: unknown,
  accountId: string | null
): Promise<string | null> {
  const id = optionalText(raw, "Raised by", TEXT_LIMITS.short)
  if (!id) return null
  if (!accountId)
    throw new GuardError(400, "invalid_input", "Name the client first, a contact belongs to one.")
  const rows = await d1Query<{ id: string }>(
    cfg,
    guard.databaseId,
    `SELECT p.id FROM accounts p
      WHERE p.id = ? AND p.deactivated_at IS NULL
        AND (p.id = ? OR EXISTS (
              SELECT 1 FROM account_links l
               WHERE l.person_account_id = p.id AND l.account_id = ? AND l.deactivated_at IS NULL))
      LIMIT 1`,
    [id, accountId, accountId]
  )
  if (!rows[0])
    throw new GuardError(400, "invalid_input", "That person isn't a contact at this client.")
  return rows[0].id
}

/** WHICH CLIENT IS THIS TICKET FOR, when the agency raises it?
 *
 * A ticket's `account_id` is what the account fence reads, so a ticket with none
 * belongs to nobody and no client will ever see it. That is correct for the
 * agency's own internal questions, and it was silently wrong for everything else:
 * most of a client's history is typed in by US, on the phone, on their behalf —
 * 220 of the 221 requests the staging seed wrote were staff-raised, and a client
 * signed in to look at their own history saw zero of them.
 *
 * So a staff caller may NAME the client. A portal caller may not, ever: their
 * account comes from the guard corridor and the body is not consulted, or a
 * client could raise a ticket into another company's world by typing an id.
 *
 * The id is proved to be a live account in the caller's OWN team database before
 * it is written — an unchecked string here would mint a ticket fenced to
 * something that does not exist, which is a row nobody can ever reach again. */
async function accountForStaffTicket(cfg: D1Rest, guard: MemberGuard, raw: unknown): Promise<string | null> {
  const id = optionalText(raw, "Client", TEXT_LIMITS.short)
  if (!id) return null
  const rows = await d1Query<{ id: string }>(
    cfg,
    guard.databaseId,
    `SELECT id FROM accounts WHERE id = ${sqlString(id)} AND deactivated_at IS NULL LIMIT 1`
  )
  if (!rows[0]) throw new GuardError(400, "invalid_input", "That client isn't on your books any more.")
  return rows[0].id
}

/** Raise a ticket. Description is required; everything else optional. Opens in the
 * `open` status. Returns the new ticket's id AND the account it was raised for —
 * the live ping needs the account to reach the raiser's colleagues and nobody
 * else.
 *
 * WHICH ACCOUNT. The one the caller is STANDING IN, taken from the guard
 * corridor and never from the body: a client raises a question for the company
 * they are looking at, which is the same company every other read on that screen
 * was fenced to. Staff raise the agency's own questions, which belong to no
 * client and are stamped NULL. */
export async function createTicket(
  cfg: D1Rest,
  guard: MemberGuard,
  scope: AccountScope,
  actor: Actor,
  input: TicketInput
): Promise<{ id: string; accountId: string | null }> {
  const description = requireText(input.description, "Description", TEXT_LIMITS.long)

  const id = ulid()
  // A CLIENT's ticket belongs to the company they are standing in — from the
  // guard corridor, never from the body. THE AGENCY's ticket belongs to whichever
  // client it names, or to nobody when it is our own internal question.
  //
  // TWO WAVES, NOT SIX TRIPS (shared/workers/parallel.ts). Each of these checks
  // is its own round trip to the team database — ~150ms each, measured 25 Aug
  // 2026 — and the dependency graph the comments below describe only chains
  // TWO of them: the module is checked against the app, and the contact against
  // the client. Everything else was sequential because it was written on
  // consecutive lines, not because it had to be. `inOrder` keeps the refusal a
  // person gets identical to the sequence's (first failure IN ARRAY ORDER), so
  // this is the same six statements in half the wall clock.
  const [accountId, appId] = await inOrder([
    scope.kind === "portal"
      ? Promise.resolve(scope.currentAccountId)
      : accountForStaffTicket(cfg, guard, input.accountId),
    appForTicket(cfg, guard, input.appId),
  ])
  // AFTER the app, because the app is what it is checked against; the contact is
  // AFTER the client for the same reason, so the two ride the second wave
  // together with the rank, which depends on nothing.
  const [moduleId, raisedBy, rank] = await inOrder([
    moduleForTicket(cfg, guard, input.moduleId, appId),
    contactForTicket(cfg, guard, input.raisedByContactId, accountId),
    topRank(cfg, guard),
  ])
  const helpType = optionalText(input.helpType, "Type", TEXT_LIMITS.short) ?? null
  // NOTHING NEW ARRIVES AS THE KIND WE STOPPED SHOWING. There is no `was` on a
  // create, so this is the flat refusal (see `refuseKeptForMigration`).
  refuseKeptForMigration(helpType, null)
  const now = new Date().toISOString()
  // WHERE IT STARTS, AND IT IS THE SAME PLACE FOR EVERYTHING NOW.
  //
  // This line used to fork. An EXTRA, a REQUEST or a piece of FEEDBACK opened in
  // `awaiting_validation` and waited for the client who pays for it to confirm
  // they wanted it before we spent a day on triage (CHECKLIST 5.13, Aurora's
  // ap2); a QUESTION or an ISSUE went straight in, because somebody stuck should
  // not have to ask their own colleague for permission first.
  //
  // The client retired that stage on 7 Sep 2026 — "kill awaiting_validation" —
  // and shared/types.ts `HELP_STATUSES` carries the argument. So there is no
  // longer a stage to wait in and nothing left to fork on: every ticket, of
  // every kind, with or without a client, opens in `new` and is read by a person
  // like everything else. We stop asking permission before we look at the thing.
  //
  // THE KIND DIVISION SURVIVED THE GATE, and is not to be re-derived from here:
  // `isScopedTicketType` (shared/types.ts) is the same three words, still used —
  // by the dashboard's "who has more scoped work" ranking. What it stopped being
  // is a lifecycle decision.
  const status = "new"
  // The reference the client will quote, and the place in the list. Both are
  // resolved BEFORE the insert so the row is complete the first time anybody
  // reads it — a ticket that exists for a moment with no number is a ticket
  // somebody screenshots with no number.
  //
  // GATED ON `accountId`, not on the team-wide counter: the reference is TEAM
  // wide now (no account-code prefix, shared/workers/refs.ts), but "the number
  // a client quotes" still needs a client. The agency's own question, with no
  // account, gets no reference — same answer as before, for the same reason.
  //
  // ON ITS OWN LINE, AFTER THE WAVES, because it is the one preflight step that
  // WRITES: it mints the next number in the sequence a client quotes. Run beside
  // a check that fails and it would burn a reference nobody ever sees — the rule
  // parallel.ts states for exactly this call.
  const ref = accountId ? await nextTeamRef(cfg, guard, TEAM_REF_KINDS.ticket) : null
  // WHO IS RAISING IT decides whether the wording is still the account's. A
  // ticket a STAFF member types is locked the instant it exists: the first staff
  // touch has already happened — it is us. A client's own question stays theirs
  // to correct until we read it.
  const lockedAt = scope.kind === "portal" ? null : now
  await d1ExecScript(
    cfg,
    guard.databaseId,
    // WHAT IT ARRIVED AS, STAMPED HERE AND NOWHERE ELSE (team migration 0065).
    // `raised_as_type` takes the SAME `helpType` value on the SAME line as
    // `help_type`, in one statement, so the two cannot start life disagreeing —
    // and from this moment `help_type` is free to move while this one never
    // does. There is no update path for it anywhere in the codebase, which is
    // the whole of its value: the pair is "arrived as / is now", and a column
    // that could be rewritten would report zero recategorisations for ever.
    // The single exception is a dropdown RENAME, which re-spells both columns
    // together — shared/selectable-homes.ts says why that is not an update of
    // this fact.
    `INSERT INTO help (id, help_type, raised_as_type, description, screen_recording_link, source_screen, source_related_table, source_related_row_id, status, resolved, account_id, app_id, module_id, raised_by_contact_id, ref, rank, locked_at, title_de, title_en, created_at, creator_id, creator_email, creator_name)
VALUES (${sqlString(id)}, ${sqlString(helpType)}, ${sqlString(helpType)}, ${sqlString(description)}, ${sqlString((optionalText(input.screenRecordingLink, "Screen recording link", TEXT_LIMITS.link) ?? null))}, ${sqlString((optionalText(input.sourceScreen, "Source", TEXT_LIMITS.short) ?? null))}, ${sqlString((optionalText(input.sourceRelatedTable, "Source table", TEXT_LIMITS.short) ?? null))}, ${sqlString((optionalText(input.sourceRelatedRowId, "Source row", TEXT_LIMITS.short) ?? null))}, ${sqlString(status)}, 0, ${sqlString(accountId)}, ${sqlString(appId)}, ${sqlString(moduleId)}, ${sqlString(raisedBy)}, ${sqlString(ref)}, ${sqlString(rank)}, ${sqlString(lockedAt)}, ${sqlString((optionalText(input.titleDe, "German title", TEXT_LIMITS.short) ?? null))}, ${sqlString((optionalText(input.titleEn, "English title", TEXT_LIMITS.short) ?? null))}, ${sqlString(now)}, ${sqlString(actor.id)}, ${sqlString(actor.email)}, ${sqlString(actor.name)});
` +
      // WHERE THE SEQUENCE STARTS (team migration 0066). The first stage event
      // rides INSIDE this script rather than following it, which is a property
      // no other status writer in the codebase can have: `d1ExecScript` runs the
      // statements as one batch, so there is no instant in which a ticket exists
      // with no recorded first stage — and the ONE reader of that sequence can
      // therefore treat a `from_status` of null as "this ticket was born here"
      // rather than as "something went missing". Same `status` value, same
      // statement, same argument `raised_as_type` makes two lines above: two
      // facts that must agree at birth are written in one place.
      statusEventStatement(actor, id, null, status, now)
  )

  await logActivity(cfg, guard.databaseId, actor, {
    type: "Ticket raised",
    description: `${actor.name} raised ${ref ? `ticket ${ref}` : "a ticket"}`,
    relatedTable: "help",
    relatedRowId: id,
  })

  return { id, accountId }
}

/** IS THE WORDING STILL THEIRS? (SCOPE ch.07: "editing and ranking lock at first
 * staff touch".)
 *
 * The account owns what it asked for right up until we have read it; after that
 * the record of the request holds still while the conversation about it moves.
 * Staff are never stopped — they are the ones the lock is FOR.
 *
 * Expressed as a thrown refusal AND, at every call site, as a predicate on the
 * UPDATE itself. Both, on purpose: the throw is what tells the person why, and
 * the predicate is what makes it true when two requests arrive together — the
 * check and the write are otherwise two steps, and a client editing at the same
 * instant a staff member opens the ticket would pass the first and win the
 * second. */
function refuseIfLocked(scope: AccountScope, row: TicketRow, what: string): void {
  if (scope.kind !== "portal") return
  if (row.locked_at)
    throw new GuardError(
      409,
      "ticket_locked",
      `We've already picked this one up, so ${what} is fixed now. Add a comment and we'll pick it up from there.`
    )
}

/** Edit a ticket's content (description / type / screen recording / source). Stamps
 * the editor audit block + updated_at (which also re-sorts it to the top).
 * Returns the account the ticket belongs to, for the live ping. */
export async function updateTicket(
  cfg: D1Rest,
  guard: MemberGuard,
  scope: AccountScope,
  actor: Actor,
  id: string,
  input: TicketInput
): Promise<string | null> {
  const before = await ticketOrThrow(cfg, guard, scope, id)
  const description = requireText(input.description, "Description", TEXT_LIMITS.long)
  // A client may correct their own question while it is still theirs. Two rules,
  // not one: the ticket must be UNREAD by us (the lock), and it must be THEIRS —
  // a contact sees their whole company's requests now, and being allowed to read
  // a colleague's question is not being allowed to rewrite it.
  refuseIfLocked(scope, before, "the wording")
  if (scope.kind === "portal" && before.creator_id !== guard.userId)
    throw new GuardError(403, "not_yours", "This one was raised by a colleague. Add a comment instead.")

  // NAMING THE CLIENT ON A TICKET THAT HAS NONE — set once, never moved.
  //
  // A ticket raised without a client (ours, or one we forgot to attribute) can be
  // given one. A ticket that already HAS a client cannot be moved to another:
  // that would retroactively take a conversation away from the people reading it
  // and hand it, replies and all, to strangers. If we ever want that, it is a
  // deliberate feature with a confirm panel, not a quiet field on an edit form.
  // A portal caller never reaches this: their own ticket already carries their
  // company, so the branch below is unreachable for them by construction.
  // NOBODY RECATEGORISES A TICKET *INTO* THE KIND WE STOPPED SHOWING. Checked
  // against what the row already says, so an ordinary edit to one of the
  // preserved rows (which posts its own unchanged type straight back) still
  // saves — see `refuseKeptForMigration`. Before the first write, so a refusal
  // costs no round trips.
  refuseKeptForMigration(
    optionalText(input.helpType, "Type", TEXT_LIMITS.short) ?? null,
    before.help_type
  )
  const namedAccount =
    scope.kind === "portal" ? null : await accountForStaffTicket(cfg, guard, input.accountId)
  if (namedAccount && before.account_id && namedAccount !== before.account_id) {
    throw new GuardError(409, "account_fixed", "This ticket already belongs to another client, and can't be moved.")
  }
  const accountAfter = before.account_id ?? namedAccount
  // The app and the contact are ordinary editable facts — unlike the client, both
  // can legitimately be corrected (a request filed against the wrong system, a
  // colleague who actually raised it). An absent value means "leave it alone",
  // the same rule the two titles follow: a portal form that does not offer the
  // field must not blank ours.
  const appId = (await appForTicket(cfg, guard, input.appId)) ?? before.app_id
  // THE MODULE IS CHECKED AGAINST THE APP THE TICKET WILL HAVE, not the one it
  // had. Moving a ticket to another app and naming a section of the new one is a
  // single legitimate edit, and checking against `before.app_id` would refuse it
  // for the one reason that is not true.
  const moduleId = (await moduleForTicket(cfg, guard, input.moduleId, appId)) ?? before.module_id
  const raisedBy =
    (await contactForTicket(cfg, guard, input.raisedByContactId, accountAfter)) ??
    before.raised_by_contact_id

  const now = new Date().toISOString()
  // The fence rides the UPDATE as well as the read above — same sentence, same
  // statement, so neither can be removed while the other keeps the door honest.
  // Parameterised (the house shape for a fenced UPDATE, as in lib/accounts):
  // the clause carries a placeholder PER account id, so it cannot be spelled out
  // by hand and cannot drift from the one the read used.
  const fence = ticketFence(guard, scope, "all")
  // THE LOCK RIDES THE WRITE, not just the check above. `refuseIfLocked` is what
  // explains the refusal to a person; this is what makes it true when a client's
  // edit and a staff member's first touch arrive in the same instant. For a
  // portal caller the statement only matches a row that is still unlocked and
  // still theirs, so losing the race means changing nothing.
  const ownership =
    scope.kind === "portal" ? " AND locked_at IS NULL AND creator_id = ?" : ""
  const ownershipParams = scope.kind === "portal" ? [guard.userId] : []
  // …and a STAFF edit IS the first staff touch. `COALESCE` so it records when we
  // first read it, never the last time anyone typed — the lock is a moment, and
  // re-stamping it would keep moving the moment the client's rights ended.
  const lockSet = scope.kind === "portal" ? "" : ", locked_at = COALESCE(locked_at, ?)"
  const lockParams = scope.kind === "portal" ? [] : [now]
  // `raised_as_type` IS DELIBERATELY NOT IN THIS SET LIST, and this is the one
  // statement in the app where its absence is load-bearing. THIS is the write
  // that recategorises a ticket — the "Type" line in the activity sentence below
  // is written from exactly this UPDATE — so adding the column here would erase
  // the fact the column exists to hold, on the precise event it exists to
  // record, and the raised-as/is-now chart would report zero for ever. Team
  // migration 0065 carries the full reasoning; a source scan
  // (workers/content/test/raised-as-is-stamped-once.test.ts) fails the build if
  // this or any other UPDATE ever names it.
  const changed = await d1Query<{ id: string }>(
    cfg,
    guard.databaseId,
    `UPDATE help SET help_type = ?, description = ?, screen_recording_link = ?, source_screen = ?,
       title_de = ?, title_en = ?, app_id = ?, module_id = ?, raised_by_contact_id = ?,
       account_id = ?, updated_at = ?, editor_id = ?, editor_email = ?, editor_name = ?${lockSet}
     WHERE id = ?${fence.sql ? ` AND ${fence.sql}` : ""}${ownership} RETURNING id`,
    [
      optionalText(input.helpType, "Type", TEXT_LIMITS.short) ?? null,
      description,
      optionalText(input.screenRecordingLink, "Screen recording link", TEXT_LIMITS.link) ?? null,
      optionalText(input.sourceScreen, "Source", TEXT_LIMITS.short) ?? null,
      // An absent title means "leave it alone", not "blank it": the translate
      // door writes ONE of these two and must not erase the other, and a portal
      // form that only knows about its own language must not delete ours.
      optionalText(input.titleDe, "German title", TEXT_LIMITS.short) ?? before.title_de,
      optionalText(input.titleEn, "English title", TEXT_LIMITS.short) ?? before.title_en,
      appId,
      moduleId,
      raisedBy,
      accountAfter,
      now,
      actor.id,
      actor.email,
      actor.name,
      ...lockParams,
      id,
      ...fence.params,
      ...ownershipParams,
    ]
  )
  // Lost the race with the staff member who just opened it. Same sentence the
  // pre-check gives, so the person sees one explanation either way.
  if (!changed[0])
    throw new GuardError(
      409,
      "ticket_locked",
      "We've already picked this one up, so the wording is fixed now. Add a comment and we'll pick it up from there."
    )

  const changes = describeChanges([
    { label: "Type", from: before.help_type, to: optionalText(input.helpType, "Type", TEXT_LIMITS.short) ?? null },
    { label: "Description", from: before.description, to: description },
    {
      label: "Screen recording",
      from: before.screen_recording_link,
      to: optionalText(input.screenRecordingLink, "Screen recording link", TEXT_LIMITS.link) ?? null,
      hideValues: true,
    },
    { label: "Source", from: before.source_screen, to: optionalText(input.sourceScreen, "Source", TEXT_LIMITS.short) ?? null },
  ])
  await logActivity(cfg, guard.databaseId, actor, {
    type: "Ticket edited",
    description: `${actor.name} edited ${before.ref ?? "a ticket"}${changes ? `, ${changes}` : ""}`,
    relatedTable: "help",
    relatedRowId: id,
  })
  // The ping names the account the ticket has AFTER the edit — otherwise the
  // moment a ticket is finally attributed to a client, the one ping that would
  // have told their people it exists is addressed to nobody.
  return accountAfter
}

/** Move a ticket along its fixed lifecycle. Resolving stamps the resolver block +
 * resolved flag; any non-resolved status clears it. Caller-permission lives in the
 * route — every status move (incl. reopen) needs help:edit. Reports whether a row
 * actually moved (R17) and which account's ticket it was (for the live ping). */
export async function setStatus(
  cfg: D1Rest,
  guard: MemberGuard,
  scope: AccountScope,
  actor: Actor,
  id: string,
  status: HelpStatus
): Promise<{ moved: boolean; accountId: string | null }> {
  const before = await ticketOrThrow(cfg, guard, scope, id)
  // R17: the `status <> ?` predicate makes the move idempotent — re-resolving an
  // already-resolved ticket moves zero rows, so it writes no duplicate history,
  // re-stamps no editor/updated_at (no phantom re-sort), and pings nothing.
  const now = new Date().toISOString()
  const resolved = status === "resolved"
  const resolveBlock = resolved
    ? `resolved = 1, resolved_at = ${sqlString(now)}, resolver_id = ${sqlString(actor.id)}, resolver_email = ${sqlString(actor.email)}, resolver_name = ${sqlString(actor.name)}`
    : "resolved = 0, resolved_at = NULL, resolver_id = NULL, resolver_email = NULL, resolver_name = NULL"
  // The fence rides the move itself, beside the R17 predicate.
  const fence = ticketFence(guard, scope, "all")
  // MOVING IT IS A STAFF TOUCH, so the lock closes here too — and it rides the
  // same statement as the move, so a ticket cannot end up "in progress" while
  // its wording is still the client's to change. COALESCE: the lock records when
  // we FIRST read it, so a later move never pushes that moment forward.
  const changed = await d1Query<{ id: string }>(
    cfg,
    guard.databaseId,
    `UPDATE help SET status = ?, ${resolveBlock}, locked_at = COALESCE(locked_at, ?), updated_at = ?, editor_id = ${sqlString(actor.id)}, editor_email = ${sqlString(actor.email)}, editor_name = ${sqlString(actor.name)} WHERE id = ? AND status <> ?${fence.sql ? ` AND ${fence.sql}` : ""} RETURNING id`,
    [status, now, now, id, status, ...fence.params]
  )
  if (!changed[0]) return { moved: false, accountId: before.account_id }

  // THE MOVE, AS A ROW (team migration 0066) — and this is the writer that makes
  // the reopen legible. The `resolveBlock` above NULLs `resolved_at` and the
  // whole resolver block on any move to a non-resolved status, so before this
  // existed a reopen ERASED who answered the ticket and when, with nothing
  // anywhere that could say it had ever been answered at all. The owner blessed
  // the nulling and named where the fact belongs instead: "Reopening a ticket
  // nulls its closing timestamp, yeah — but keep it in activity, like closed on
  // x, reopen on y, closed again on z". The row below IS that record: the
  // resolve is one event carrying its resolver and its instant, the reopen is
  // the next, and neither can rub the other out.
  //
  // AFTER the R17 early return, so a zero-row move writes no event — a re-run
  // must not put a stage of zero seconds into the sequence. And BEFORE the
  // activity sentence deliberately: this is the record the numbers are computed
  // from, `logActivity` is prose that is allowed to fail, and the one that must
  // not fail goes first.
  await recordStatusEvent(cfg, guard, actor, id, before.status, status, now)

  await logActivity(cfg, guard.databaseId, actor, {
    type: `Ticket ${status === "resolved" ? "resolved" : status === "ready" ? "ready" : "updated"}`,
    description: `${actor.name} set ${before.ref ?? "a ticket"} to ${status.replace("_", " ")}`,
    relatedTable: "help",
    relatedRowId: id,
  })
  return { moved: true, accountId: before.account_id }
}

/** RESOLVING IS NOT A STATUS MOVE (CHECKLIST 5.6 + 5.7).
 *
 * "Resolve is refused until a resolution has been written", and resolving emails
 * the client — so it cannot be reachable as one value in a dropdown of seven. It
 * has a door of its own (`/help/resolve`) which requires the words and sends
 * them; every other way to the word `resolved` is refused here, in one sentence,
 * called by all three status doors (single, bulk-by-id, bulk-by-filter).
 *
 * A FUNCTION AND NOT A CONDITION AT EACH DOOR, for R24's reason in miniature: a
 * condition can be forgotten by the next door somebody writes, and there are
 * already three of them. */
export function refuseDirectResolve(status: HelpStatus): void {
  if (status !== "resolved") return
  throw new GuardError(
    400,
    "resolution_required",
    "A ticket is resolved by sending the answer, not by setting a status. Write the resolution and send it."
  )
}

/* ── `validateTicket` WAS HERE, AND IT IS GONE (7 Sep 2026) ─────────────────
 *
 * "THE CLIENT SAYS YES" (CHECKLIST 5.13): it moved a ticket out of
 * `awaiting_validation` into `new`, stamped `validated_at`, and recorded the
 * move as a stage event like any other —
 * `recordStatusEvent(cfg, guard, actor, id, "awaiting_validation", "new", now)`.
 * That call is the one WRITE anywhere in the codebase that named the retired
 * stage, and this note exists so the next reader knows where it went rather
 * than finding a hole where the module's most-argued-about function used to be.
 *
 * IT WAS REMOVED RATHER THAN LEFT AS A NO-OP, and that is the decision worth
 * recording. With the stage retired (shared/types.ts, `HELP_STATUSES`) R17's
 * predicate — `status IN ('awaiting_validation')` — can no longer match any row
 * in any team database, so the function would have been a door that could only
 * ever move zero rows: a control whose sole possible outcome is silent failure.
 * Worse, it was the ONE exception to this module's every-other-status-move-
 * refuses-a-portal-caller rule (R21), gated on `help:read` so a client login
 * could reach it. An exception that has stopped buying anything is not
 * harmless — it is a portal-reachable write door kept alive by inertia. Both
 * halves of the safety argument for it (the account fence on the UPDATE, R17's
 * predicate) were arguments for why a USEFUL door was narrow enough; neither is
 * a reason to keep a useless one.
 *
 * WHAT SURVIVES IT. Every `help_status_events` row that recorded a real
 * `awaiting_validation → new` move stays exactly where it is — team migration
 * 0069 touches `help.status` and never the history — and `stageLabel`
 * (web/components/ticket-stages.tsx) still draws those rungs as "Waiting on
 * you". The `validated_at` values stay too. Nothing that happened is unhappened
 * by the door that made it happen going away. */

/** SOMEBODY READ IT (CHECKLIST 5.11) — the one act the triage screen performs.
 *
 * Triage is the only stage of the ladder a person genuinely does and a machine
 * cannot infer: "I have read this and it is a real piece of work" is a judgement.
 * So it is a door with its own word rather than a value in a status picker, and
 * the strip's waiting list is what it is pressed from.
 *
 * R17: `status = 'new'` rides the UPDATE. A ticket already triaged, already
 * scheduled or already in progress moves zero rows — reading it a second time is
 * not an event, and this must never drag a started ticket backwards. */
export async function markTriaged(
  cfg: D1Rest,
  guard: MemberGuard,
  scope: AccountScope,
  actor: Actor,
  id: string
): Promise<{ moved: boolean; accountId: string | null }> {
  const before = await ticketOrThrow(cfg, guard, scope, id)

  // THE PRE-TRIAGE GATE (owner, 19 Aug 2026). A ticket does not leave `new`
  // until it names a type, a client, an app and who raised it. Checked HERE
  // rather than at the door for `refuseUnreviewable`'s reason: there is more
  // than one way to reach this function — the triage screen, the agent, an MCP
  // tool — and one of them will be written by somebody who has never read the
  // route file. The rule rides the model.
  //
  // It REPORTS rather than just refusing. A ticket that could not move used to
  // sit in the queue saying nothing about why, which is the whole reason a
  // pre-triage state was asked for: the state was never missing, the reason was.
  const gaps = triageGaps({
    helpType: before.help_type,
    accountId: before.account_id,
    appId: before.app_id,
    raisedByContactId: before.raised_by_contact_id,
  })
  if (gaps.length)
    throw new GuardError(
      409,
      "not_ready_for_triage",
      `This one still needs ${listGaps(gaps)} before it can be triaged. Set them on the ticket and try again.`
    )

  const now = new Date().toISOString()
  const changed = await d1Query<{ id: string }>(
    cfg,
    guard.databaseId,
    // The lock closes here: reading a request IS the first staff touch, which is
    // the sentence SCOPE ch.07 defines the lock by.
    // R17, same spelling: reading a request that has already been read, or one
    // somebody has since started, moves zero rows — it must never drag a started
    // ticket backwards.
    `UPDATE help SET status = 'triaged', locked_at = COALESCE(locked_at, ?), updated_at = ?,
       editor_id = ?, editor_email = ?, editor_name = ?
     WHERE id = ? AND status IN ('new') RETURNING id`,
    [now, now, actor.id, actor.email, actor.name, id]
  )
  if (!changed[0]) return { moved: false, accountId: before.account_id }
  // Somebody reading a request is the second rung of the ladder and it is
  // recorded like every other (0066). `new` is written rather than
  // `before.status` for the same reason validation writes its own: the UPDATE's
  // predicate is `status IN ('new')`, so a row that moved was `new`, full stop.
  await recordStatusEvent(cfg, guard, actor, id, "new", "triaged", now)
  await logActivity(cfg, guard.databaseId, actor, {
    type: "Ticket triaged",
    description: `${actor.name} read ${before.ref ?? "a ticket"}`,
    relatedTable: "help",
    relatedRowId: id,
  })
  return { moved: true, accountId: before.account_id }
}

/** DRAG-RANK — put a ticket between two others (SCOPE ch.07: the only priority
 * signal there is).
 *
 * The caller names its NEIGHBOURS, not a position. A position would be a number
 * computed from a list the caller loaded some seconds ago, and by the time it
 * arrives the list has moved; two neighbours are a statement about the order that
 * is still true whatever else happened, and they are what a drag actually knows.
 *
 * Both neighbour ids are read through the FENCE, so a client cannot pin their
 * ticket next to one they cannot see — which would be a (very small) oracle for
 * whether an id exists, and a way to learn another company's ordering. */
export async function setTicketRank(
  cfg: D1Rest,
  guard: MemberGuard,
  scope: AccountScope,
  actor: Actor,
  id: string,
  afterId: string | null,
  beforeId: string | null
): Promise<{ moved: boolean; accountId: string | null }> {
  const row = await ticketOrThrow(cfg, guard, scope, id)
  // Ranking locks with the wording, and for the same reason: once we are working
  // on it, the order is ours to manage.
  refuseIfLocked(scope, row, "the order")

  // `afterId` sits ABOVE in the list (a higher rank) and `beforeId` BELOW, because
  // the list reads rank DESC — so the new rank goes between beforeId's and
  // afterId's, low bound first.
  const neighbour = async (nid: string | null): Promise<string | null> => {
    if (!nid) return null
    const found = await ticketOrThrow(cfg, guard, scope, nid)
    return found.rank ?? found.id
  }
  const rank = rankBetween(await neighbour(beforeId), await neighbour(afterId))

  const fence = ticketFence(guard, scope, "all")
  const ownership = scope.kind === "portal" ? " AND locked_at IS NULL" : ""
  // R17: `rank <> ?` — dropping a ticket back exactly where it was moves zero
  // rows, so it writes no history and pings nothing. A drag that ends where it
  // started is not an event.
  const changed = await d1Query<{ id: string }>(
    cfg,
    guard.databaseId,
    `UPDATE help SET rank = ? WHERE id = ? AND COALESCE(rank, id) <> ?${
      fence.sql ? ` AND ${fence.sql}` : ""
    }${ownership} RETURNING id`,
    [rank, id, rank, ...fence.params]
  )
  if (!changed[0]) return { moved: false, accountId: row.account_id }

  await logActivity(cfg, guard.databaseId, actor, {
    type: "Ticket reordered",
    description: `${actor.name} moved ${row.ref ?? "a ticket"} in the list`,
    relatedTable: "help",
    relatedRowId: id,
  })
  return { moved: true, accountId: row.account_id }
}

/** ARCHIVE / UNARCHIVE — available from any state (SCOPE ch.07). The base's
 * deactivate-never-delete under the word the glossary already uses: the row, its
 * conversation and its history all survive; it simply stops appearing in the
 * everyday list.
 *
 * R17: the current-state predicate rides the UPDATE (`archived_at IS NULL` /
 * `IS NOT NULL`), so a double-clicked Archive moves zero rows the second time and
 * writes no second sentence into the record's history. */
export async function setTicketArchived(
  cfg: D1Rest,
  guard: MemberGuard,
  scope: AccountScope,
  actor: Actor,
  id: string,
  archived: boolean
): Promise<{ moved: boolean; accountId: string | null }> {
  const row = await ticketOrThrow(cfg, guard, scope, id)
  const now = new Date().toISOString()
  const fence = ticketFence(guard, scope, "all")
  const set = archived
    ? `archived_at = ?, archiver_id = ${sqlString(actor.id)}, archiver_email = ${sqlString(actor.email)}, archiver_name = ${sqlString(actor.name)}`
    : `archived_at = NULL, archiver_id = NULL, archiver_email = NULL, archiver_name = NULL`
  const changed = await d1Query<{ id: string }>(
    cfg,
    guard.databaseId,
    `UPDATE help SET ${set} WHERE id = ? AND archived_at IS ${archived ? "" : "NOT "}NULL${
      fence.sql ? ` AND ${fence.sql}` : ""
    } RETURNING id`,
    archived ? [now, id, ...fence.params] : [id, ...fence.params]
  )
  if (!changed[0]) return { moved: false, accountId: row.account_id }

  await logActivity(cfg, guard.databaseId, actor, {
    type: archived ? "Ticket archived" : "Ticket restored",
    description: `${actor.name} ${archived ? "archived" : "restored"} ${row.ref ?? "a ticket"}`,
    relatedTable: "help",
    relatedRowId: id,
  })
  return { moved: true, accountId: row.account_id }
}

/** Move MANY tickets to the same status in one call (the bulk sibling of
 * setStatus). Applies the SAME per-row change — same UPDATE, same resolver block,
 * same activity row — and reports how many actually changed vs. were skipped
 * (an id with no matching ticket, or one ALREADY at the target status — R17:
 * a re-run bulk writes no duplicate history and pings nothing). Returns the rows
 * that really changed — id AND the account each belongs to — so the route
 * publishes one row-level ping EACH, aimed at the people who may hear it. */
export async function bulkSetStatus(
  cfg: D1Rest,
  guard: MemberGuard,
  scope: AccountScope,
  actor: Actor,
  ids: string[],
  status: HelpStatus
): Promise<{ changed: { id: string; accountId: string | null }[]; skipped: number }> {
  const changed: { id: string; accountId: string | null }[] = []
  let skipped = 0
  // IN WAVES, NOT ONE AT A TIME. This was a plain `for` loop, which is fine when
  // the database is next door and ruinous when it is not: measured 25 Aug 2026,
  // one team-database trip cost ~150ms because the database was in APAC and the
  // workers in WEUR. At BULK_IDS_LIMIT (512) rows and a few trips each, the loop
  // was several MINUTES — so the Worker was killed, and the person saw a spinner
  // and then an error with their tickets half moved.
  //
  // A WAVE IS AWAITED BEFORE THE NEXT STARTS, deliberately. It bounds how many
  // statements are in flight (D1 has its own per-invocation ceiling, and meeting
  // it fails in a way that looks like a database fault), and it keeps a failure
  // inside one wave rather than scattered across the whole batch.
  //
  // ORDER DOES NOT MATTER HERE and that is why this is safe: each row is an
  // independent UPDATE with its own R17 predicate riding it, and the activity
  // rows carry their own timestamps. Two rows moving at once cannot interfere —
  // the same reason the sequential version needed no lock.
  for (let i = 0; i < ids.length; i += BULK_CONCURRENCY) {
    const wave = ids.slice(i, i + BULK_CONCURRENCY)
    const results = await Promise.all(
      wave.map(async (id) => {
        try {
          const { moved, accountId } = await setStatus(cfg, guard, scope, actor, id, status)
          // `moved: false` = already at the target status. A no-op, not an event
          // (R17: a re-run writes no duplicate history and pings nothing).
          return moved ? { id, accountId } : null
        } catch (e) {
          // A missing ticket is skipped, not fatal — the rest of the batch still
          // applies. Anything else is rethrown untouched: a swallowed database
          // error is exactly what a bulk job must not become, because the count
          // it reports would then be a lie.
          if (e instanceof GuardError && e.status === 404) return null
          throw e
        }
      })
    )
    for (const r of results) {
      if (r) changed.push(r)
      else skipped++
    }
  }
  return { changed, skipped }
}

/** The FILTER-shaped bulk (the set-shaped job): "move every ticket matching
 * these facets to <toStatus>" in ONE call — the agent has no variables, only
 * words, so passing it rows means re-saying every id; passing the FILTER is 2
 * calls where 10 round-trips were. It counts FIRST (so a confirm can state the
 * TRUE number), refuses past BULK_IDS_LIMIT, is idempotent by construction
 * (`status <> ?` — a re-run matches nothing), writes ONE activity row for the
 * whole set, and the route publishes only when something moved. Facets ONLY,
 * never free text — a fuzzy ranked match is not something a person can approve
 * honestly. `dryRun` returns the count without writing (the count-first step). */
export async function bulkSetStatusByFilter(
  cfg: D1Rest,
  guard: MemberGuard,
  scope: AccountScope,
  actor: Actor,
  filter: { status?: HelpStatus; helpType?: string },
  toStatus: HelpStatus,
  dryRun: boolean
): Promise<{ matched: number; changed: number; accounts: string[] }> {
  // The same facet set the Tickets screen sends (status / type). The R17 predicate
  // (`status <> ?`) is INLINE in both statements below — source-visible for the
  // idempotent-transitions scan — so "matched" is already "would change".
  //
  // The fence leads the extras: a set-shaped write must not reach a ticket the
  // caller cannot even see, and the COUNT it confirms with must be a count of
  // the same rows the UPDATE will touch.
  const authored = ticketFence(guard, scope, "all")
  const extra: string[] = authored.sql ? [authored.sql] : []
  const extraParams: (string | number)[] = [...authored.params]
  // …AND THE KIND THAT IS KEPT BUT NEVER SHOWN IS NOT IN THE SET EITHER. This is
  // the one WRITE that takes a FILTER rather than ids, so it is the one write
  // that inherits the collection's own definition: a set-shaped job says "every
  // ticket matching this", and these rows are no longer part of "the tickets".
  // It is also the number a person APPROVES — the count above is what the
  // confirm panel states — so leaving them in would have told somebody they were
  // about to move more tickets than the list in front of them holds, and then
  // quietly moved rows they cannot see. That is the same sentence R16 makes
  // about a badge, made about a confirmation.
  extra.push(keptForMigrationClause().sql)
  if (filter.status) {
    extra.push("status = ?")
    extraParams.push(filter.status)
  }
  if (filter.helpType) {
    extra.push("help_type = ?")
    extraParams.push(filter.helpType)
  }
  const extraSql = extra.length ? ` AND ${extra.join(" AND ")}` : ""

  const countRows = await d1Query<{ n: number }>(
    cfg,
    guard.databaseId,
    `SELECT COUNT(*) AS n FROM help WHERE status <> ?${extraSql}`,
    [toStatus, ...extraParams]
  )
  const matched = countRows[0]?.n ?? 0
  if (dryRun || matched === 0) return { matched, changed: 0, accounts: [] }
  if (matched > BULK_IDS_LIMIT)
    throw new GuardError(
      400,
      "too_many",
      `That filter matches ${matched} tickets, the bulk ceiling is ${BULK_IDS_LIMIT}. Narrow the filter.`
    )

  const now = new Date().toISOString()
  // WHAT EACH OF THEM IS ABOUT TO MOVE OUT OF (team migration 0066).
  //
  // THE ONE PLACE A STAGE EVENT NEEDS A SECOND READ, and it is worth saying why
  // there is no cheaper way. This is the only status writer in the module that
  // moves MANY rows in ONE statement, and SQLite's `RETURNING` hands back the
  // row as it is AFTER the update — so the statement that performs the move
  // cannot also report what each row was before it. The alternative was to drop
  // `from_status` for a bulk, which would make the FIRST recorded event on a
  // bulk-moved ticket indistinguishable from a creation row, and a creation row
  // is what tells the reader the sequence is whole.
  //
  // BOUNDED AND POSITIONED, not merely added: it runs AFTER the ceiling refusal
  // above, so it can never read more than `BULK_IDS_LIMIT` rows, and it reads
  // exactly the WHERE the UPDATE below is about to carry. R14: the cap rides the
  // statement anyway, because a bound that is only true because of a check
  // fifteen lines up is a bound the next reader has to go and find.
  //
  // A row the UPDATE moves that this read did not see means a concurrent write
  // pushed a ticket INTO the filter between the two statements. 0066 names that
  // race: such a row is recorded with a null `from_status`, which reads as "no
  // recorded stage before this one" — true, and the same sentence the creation
  // row means.
  const beforeRows = await d1Query<{ id: string; status: string }>(
    cfg,
    guard.databaseId,
    `SELECT id, status FROM help WHERE status <> ?${extraSql} LIMIT ${BULK_IDS_LIMIT}`,
    [toStatus, ...extraParams]
  )
  const wasAt = new Map(beforeRows.map((r) => [r.id, r.status]))
  const resolved = toStatus === "resolved"
  const resolveBlock = resolved
    ? `resolved = 1, resolved_at = ${sqlString(now)}, resolver_id = ${sqlString(actor.id)}, resolver_email = ${sqlString(actor.email)}, resolver_name = ${sqlString(actor.name)}`
    : "resolved = 0, resolved_at = NULL, resolver_id = NULL, resolver_email = NULL, resolver_name = NULL"
  // `account_id` rides the RETURNING beside the id: ONE activity row and ONE
  // coarse ping is right for the agency's screens, but a client login hears only
  // its own world, so the route needs to know WHICH worlds this set touched.
  const changedRows = await d1Query<{ id: string; account_id: string | null }>(
    cfg,
    guard.databaseId,
    // The lock closes on every ticket the set touches, exactly as it does on a
    // single move — a bulk is not a quieter kind of staff touch.
    `UPDATE help SET status = ?, ${resolveBlock}, locked_at = COALESCE(locked_at, ?), updated_at = ?, editor_id = ${sqlString(actor.id)}, editor_email = ${sqlString(actor.email)}, editor_name = ${sqlString(actor.name)} WHERE status <> ?${extraSql} RETURNING id, account_id`,
    [toStatus, now, now, toStatus, ...extraParams]
  )
  const changed = changedRows.length
  // ONE EVENT PER TICKET, even though there is one activity row for the whole
  // set — and the asymmetry is the point rather than an inconsistency. The
  // activity feed is a story a person reads, and "Aurora set 40 tickets to
  // ready" is the sentence that happened. The stage history is a MEASUREMENT,
  // per ticket: fold a bulk into one row there and forty tickets each lose a
  // rung, their durations either side of it silently merge, and nothing on any
  // chart says a thing went missing. This is also the writer whose omission the
  // activity feed could never have been backfilled from, for exactly this reason
  // (0066's third refusal).
  if (changed > 0)
    await recordStatusEvents(
      cfg,
      guard,
      actor,
      changedRows.map((r) => ({ ticketId: r.id, from: wasAt.get(r.id) ?? null, to: toStatus })),
      now
    )
  if (changed > 0)
    // ONE activity row for the set — history says what happened, not per-row noise.
    await logActivity(cfg, guard.databaseId, actor, {
      type: `Tickets ${toStatus === "resolved" ? "resolved" : "updated"} (bulk)`,
      description: `${actor.name} set ${changed} ticket${changed === 1 ? "" : "s"}${filter.helpType ? ` of type "${filter.helpType}"` : ""}${filter.status ? ` from ${filter.status.replace("_", " ")}` : ""} to ${toStatus.replace("_", " ")}`,
      relatedTable: "help",
    })
  return {
    matched,
    changed,
    accounts: [...new Set(changedRows.map((r) => r.account_id).filter((a): a is string => !!a))],
  }
}

/** Add a reply to a ticket's thread, and bump the ticket's updated_at so it
 * re-sorts to the top of both tabs. `taggedUserIds` are notify-only mentions (the
 * notify happens in the route). `isAgent` marks the AI-drafted reply.
 *
 * Returns the new reply's id AND THE RAISER'S, which is not tidiness: the route
 * has to email whoever asked the question, and since a client login is no longer
 * SENT the raiser's id (see toTicket) it cannot read one off the ticket it just
 * fetched. So the notify path takes it from the write path, which had already
 * read the row and was throwing the answer away. The redaction is about what
 * leaves the building; a staff raiser still gets told a client replied. */
export async function addReply(
  cfg: D1Rest,
  guard: MemberGuard,
  scope: AccountScope,
  actor: Actor,
  ticketId: string,
  body: string,
  taggedUserIds: string[],
  isAgent: boolean
): Promise<{ id: string; raiserId: string }> {
  const clean = body.trim()
  if (!clean) throw new GuardError(400, "invalid_input", "A reply can't be empty.")
  const ticket = await ticketOrThrow(cfg, guard, scope, ticketId)

  const id = ulid()
  const now = new Date().toISOString()
  const tagged = taggedUserIds.length ? sqlString(JSON.stringify(taggedUserIds)) : "NULL"
  await d1ExecScript(
    cfg,
    guard.databaseId,
    `INSERT INTO help_threads (id, help_id, message_body, tagged_user_ids, is_agent, created_at, creator_id, creator_email, creator_name)
VALUES (${sqlString(id)}, ${sqlString(ticketId)}, ${sqlString(clean)}, ${tagged}, ${isAgent ? 1 : 0}, ${sqlString(now)}, ${sqlString(actor.id)}, ${sqlString(actor.email)}, ${sqlString(actor.name)});
UPDATE help SET updated_at = ${sqlString(now)} WHERE id = ${sqlString(ticketId)};`
  )

  return { id, raiserId: ticket.creator_id }
}

/** HOOK (Phase 3) — the AI agent drafts the FIRST reply here, labelled "Drafted by
 * the kwapso assistant" (is_agent = 1), built from Learning content + the team's
 * data. Until the data-ops/agent worker exists this stays a no-op, so a ticket
 * always opens awaiting a human reply (per the locked "ticket always opens" rule).
 * When implemented it will addReply(..., isAgent=true) and publish help_threads. */
export async function maybeDraftFirstReply(
  _cfg: D1Rest,
  _guard: MemberGuard,
  _ticketId: string,
  _description: string
): Promise<string | null> {
  return null
}
