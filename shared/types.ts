// Shared contract between the workers (who produce these) and the web app
// (who consumes them). ONE master copy — never redeclare these shapes.

// The one import this file makes, and it is the reason the rule above holds: a
// savings figure has a shape, and that shape lives beside the arithmetic that
// produces it (shared/workers/savings.ts). Re-declaring `ProcessSaving` here to
// keep the file import-free would be the exact duplication this file exists to
// prevent — and the copy that drifts would be the one describing money.
import type { ProcessSaving } from "./workers/savings"

/** A signed-in person, as the auth worker returns them to the browser. */
export type SessionUser = {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  imageUrl: string | null
  /** true once the onboarding screen (name + optional photo) is completed */
  onboardingComplete: boolean
  /** the team this person is currently working in (one at a time, locked) */
  currentTeamId: string | null
  /** The team this SESSION is locked to, or null for an ordinary browser session.
   * Only auth's internal `/internal/mcp-session` bridge mints a pinned session, and
   * only for a verified personal access token — so a non-null value is the one
   * unspoofable statement that the caller on the other end is a MACHINE. It travels
   * with `/api/auth/me`, which is how a downstream worker can tell a token's call
   * from a person's without inventing a header a browser could also send. */
  pinnedTeamId: string | null
  /** The language this person reads kwapso in, or null if they never chose.
   *
   * It rides on the session for the same reason `currentTeamId` does: every
   * worker already resolves the caller through `whoAmI`, so a refusal message,
   * an email and the assistant's prose can all be composed in the reader's own
   * language without a single door looking it up — and none of them can disagree
   * about it. Null means English (shared/i18n.ts `toLanguage`), kept distinct
   * from a deliberate choice of English so that only the un-chosen could ever be
   * guessed at from a browser header. */
  language: string | null
  /** HOW BIG THIS PERSON WANTS THE APP. One of SCALE_STEPS (shared/scale.ts).
   * Null means never chosen, which reads as comfortable — kept distinct from a
   * deliberate choice of comfortable for the same reason `language` is. It sits
   * on the session rather than in one browser's storage so it follows the person
   * between devices, and because the viewport is locked against pinch-zoom this
   * is the only way anybody can make the app bigger (UI-RULEBOOK S4, S5). */
  scale: string | null
  /** WHICH SPINE THE APP'S BACKGROUND IS PAINTED IN — ink, paper or mango
   * (shared/spine.ts). Null means never chosen, which reads as mango since the
   * client's ruling of 2026-09-02 — kept distinct from a deliberate choice of
   * mango for the same reason `scale` is, and it stays null for somebody who
   * simply took the default on the onboarding screen. It sits on the session
   * rather than in one browser's storage so it follows the person between
   * devices, exactly as `scale` does. */
  spine: string | null
}

/** One team as the tenancy worker lists them for the signed-in person. */
export type TeamSummary = {
  id: string
  name: string
  logoUrl: string | null
  /** the member_roles row id (inside the team's own database) this person holds */
  roleId: string
  /** creating | ready | failed — a team is usable once 'ready' */
  dbStatus: string
  /** THE AGENCY'S OWN DETAILS (db/core/0025) — the four facts a business owner
   * reaches for when an invoice, a contract or a client's supplier form asks.
   * `legalName` is what goes on a contract, which is often not the short name in
   * the rail; `legalNumbers` is one block of text on purpose, because which
   * numbers a business carries is a fact about its country. All four null until
   * somebody fills them in. */
  legalName?: string | null
  legalAddress?: string | null
  legalNumbers?: string | null
  phone?: string | null
}

/** One member of a team — membership (per-team) joined with identity (global,
 * read fresh from the users table) and their role title (from the team's DB). */
export type TeamMember = {
  userId: string
  email: string
  firstName: string | null
  lastName: string | null
  imageUrl: string | null
  roleId: string
  roleTitle: string
  /** true if this is the signed-in viewer */
  isYou: boolean
  /** true if they hold the team's locked Admin role */
  isAdmin: boolean
  /** TRUE IF THIS IS A CLIENT LOGIN, NOT ONE OF OURS.
   *
   * A portal login is an ordinary team member — grant → invite → accept is the
   * only way to make a working one — so a client contact has always been in this
   * list, and therefore in every dropdown built from it. That is right for the
   * admin screens (they are a member; somebody has to be able to see and remove
   * them) and wrong everywhere work is handed out, which is what the front door
   * uses this to decide (web/lib/members.ts). The fact is a `portal_users` row in
   * the team's own database, the same table the account fence reads. */
  isClient: boolean
  joinedAt: string
}

/** The four access switches for one module (matches the library
 * PermissionMatrix component's RightSet). */
export type RightSet = {
  read: boolean
  create: boolean
  edit: boolean
  delete: boolean
}

/** A whole role's permission sheet: one RightSet per module key. */
export type PermissionValue = Record<string, RightSet>

/** A per-team dropdown value ("selectable data"): a `value` inside a `type` group
 * (e.g. "Video link" in "File type"). Managed on the team Settings page; powers
 * the Ticket-type / Sprint-type pickers. */
export type SelectableValue = {
  id: string
  type: string
  value: string
  isDefault: boolean
  /** false = deactivated (retired). The manager shows these greyed with an Activate
   * button; form pickers filter to active. Always present. */
  active: boolean
  /** WHAT A VALUE CARRIES BESIDES ITS WORD — all four optional, all four null on
   * most rows, and that is the point: a dropdown value is a label first.
   *
   * They arrived with the delivery catalogue (team-schema 0025), which had ten
   * rows describing how the agency runs an engagement and nowhere to put them
   * once the Delivery method page went. A sprint type was already the same idea
   * wearing a different name, so the enrichment moved onto it rather than into a
   * table of its own.
   *
   * `mark` is the type mark UI-RULEBOOK defines — one glyph where an icon sits,
   * never in a sentence. `nameDe` is a curated label for readers of German, not
   * a translation seam: everything else the app says is translated at build time
   * from the string catalogue. `standardDays` is a suggested length, never a
   * rule — a sprint's dates are the ones somebody agreed with the client. */
  mark: string | null
  nameDe: string | null
  description: string | null
  standardDays: number | null
  /** WHO WROTE THE WORD, AND WHEN — read by the SINGLE-ROW door only.
   *
   * Optional because the LIST door does not select them, and that is the
   * decision rather than an oversight: the record footer is the one place that
   * asks, so putting two more columns on the list would carry them for every
   * value on every read to answer a question no row in a list is asking. A list
   * row therefore has them absent; a row read through `selectableOne` has them. */
  createdAt?: string | null
  createdByName?: string | null
}

/** A role's permission matrix as the tenancy worker returns it: the module rows
 * (key + label), the saved value, the role title, and whether it's the locked
 * Admin role (shown view-only). */
export type RolePermissions = {
  /** `rights` is WHICH of the four this module offers (R36, `MODULE_OFFERED_RIGHTS`),
   * so the Roles screen draws only the boxes that decide something. */
  modules: { key: string; label: string; rights: readonly (keyof RightSet)[] }[]
  value: PermissionValue
  isDefault: boolean
  title: string
  /** whether the signed-in viewer may edit roles (member_roles:edit) — drives
   * the screen's edit-vs-view mode and whether Save shows. */
  canEdit: boolean
}

/** One invite to a team. `status` is the display status — "pending" past its
 * expiry is reported as "expired"; an admin-cancelled one is "revoked". */
export type Invite = {
  id: string
  email: string
  roleId: string
  roleTitle: string
  status: "pending" | "accepted" | "revoked" | "expired"
  createdAt: string
  expiresAt: string
}

/** An invite the signed-in person has RECEIVED (matched by their email) — for
 * the invites inbox. Read from the global invite_index + teams row, so it
 * works for ANY signed-in user without opening a team database. */
export type ReceivedInvite = {
  id: string
  teamId: string
  teamName: string
  teamLogoUrl: string | null
  roleId: string
  createdAt: string
  expiresAt: string
}

/** The per-team invite_logs audit for ONE invite (M4) — surfaced on the invite
 * detail beside the routing data. The inviter snapshot is FROZEN at invite time
 * (it won't change if the inviter later edits their profile). */
export type InviteAudit = {
  inviterName: string | null
  inviterEmail: string | null
  inviterImageUrl: string | null
  /** did the invitee already have an account when invited? */
  inviteeHasAccount: boolean
  accepted: boolean
  acceptedAt: string | null
  shelfLifeHours: number
}

/** One role in a team (from the team's own member_roles table). */
export type TeamRole = {
  id: string
  title: string
  description: string | null
  /** the locked Admin role (cannot be edited or deleted) */
  isDefault: boolean
  /** how many active members currently hold this role */
  memberCount: number
  /** false = deactivated (kept, never deleted; holders keep their access) */
  active: boolean
  /** the audit block, for the detail Overview tab (same shape every record shows) */
  createdAt?: string | null
  createdByName?: string | null
  updatedAt?: string | null
  editedByName?: string | null
}

/** The signed-in person's current working context — powers the app shell. */
export type ActiveContext = {
  /** the team you're currently working in (null only if you have no teams) */
  team: TeamSummary | null
  /** your role in that team (id + title, read from the team's own database) */
  role: { id: string; title: string } | null
  /** how many active members the current team has */
  memberCount: number
  /** every team you belong to — feeds the team switcher */
  teams: TeamSummary[]
  /** WHO IS ASKING — the same answer `/api/auth/me` gives, carried here so the
   * agency app boots on ONE request instead of two. The tenancy door already
   * resolved the caller through auth to answer at all; handing that answer back
   * costs nothing and saves the browser a full round trip on every cold open
   * (MAX_REQUESTS_BEFORE_FIRST_PAINT, shared/workers/limits.ts). */
  user: SessionUser
  /** YOUR OWN RIGHTS in the current team — the same sheet `/api/tenancy/
   * my-permissions` answers, read in the same wave as the fence that decides
   * whether you may see this context at all. Null when there is no team to have
   * rights in. The web app primes its `my-perms` cache from this, so the one
   * hook nothing can render without is warm before the first screen asks. */
  permissions: PermissionValue | null
}

/** One row of a record's Activity tab (and the team-wide feed). The same row
 * surfaces in the team / user / role scopes by the relation it carries. */
export type ActivityItem = {
  id: string
  /** short type, e.g. "Member role changed" */
  type: string
  /** the human sentence shown in the feed */
  description: string
  /** who did it (name snapshot), or null if unknown */
  actorName: string | null
  /** WHICH POPULATION THE ACTOR BELONGS TO (R54). A client login is an ordinary
   * `team_members` row and `toActor` is the only actor constructor in the estate,
   * so a row a contact authored through the portal — a process comment, a ticket,
   * a rating, a completed to-do — carries THEIR name in `creator_name` and lands
   * in this feed beside ours. Staff are shown by first name and a contact is not,
   * and this is the only thing on the row that can tell the screen which it is
   * looking at. `false` for a staff actor and for an unknown one, which is the
   * safe direction: it leaves a name whole rather than truncating one. */
  actorIsClient: boolean
  createdAt: string
  /** WHICH OF THE EIGHT (shared/workers/activity-verbs.ts). `type` is the
   * sentence a person reads; this is the word a filter can stand on. Written on
   * every row since the column landed; older rows answer null. */
  verb: string | null
  /** WHICH DOOR THE CHANGE CAME THROUGH — the agency app, the client portal, a
   * machine token, the assistant, a cron. Every surface writes the same row
   * through the same seam, so without this the trail cannot tell you which one
   * a change came from; with it, "did Alex do this or did Alex's token?" is a
   * question the feed answers. `unknown` where the writer could not say. */
  origin: string | null
}

/** A team's Overview-tab metadata (who made it + when). */
export type TeamMeta = {
  name: string
  createdAt: string
  creatorName: string | null
  creatorEmail: string | null
  updatedAt: string | null
}

/** Every /api error body looks like this. */
export type ApiError = {
  error: string
  /** plain-English message safe to show the user */
  message: string
}

/* ----------------------------- next-build modules ----------------------------- */

/** THE ticket lifecycle — the one list, for every side of the app. The server
 * validates against it, the stepper renders from it, and the agent's tool
 * descriptions name it. It was written out four times over; a fifth status was
 * four edits and TypeScript caught none of them. Now it's one edit.
 *
 * A STATUS IS A FACT, NOT A BUTTON (the tester's sentence, 17 Aug 2026). Five of
 * these six are reached by something HAPPENING rather than by somebody choosing
 * them, and the one a person does reach is a door of its own with its own words,
 * not a dropdown:
 *
 *   new                  raised, nobody here has read it;
 *   triaged              somebody on duty read it (`/help/triage-read`);
 *   scheduled            work exists AND some of it is in a sprint — flipped by
 *                        lib/ready-flip `scheduledFlip`;
 *   in_progress          a timer started on the ticket or on one of its stories
 *                        — flipped by lib/ready-flip `progressFlip`;
 *   ready                every story closed — flipped by `readyFlipForTicket`;
 *   resolved             a PERSON sent the answer (`/help/resolve`), which is
 *                        refused until a resolution is written.
 *
 * ── SIX, AND IT WAS SEVEN UNTIL 7 SEP 2026 ──────────────────────────────────
 *
 * `awaiting_validation` — "the client's main stakeholder has not said yes yet" —
 * was the seventh, and the client retired it on 7 Sep 2026 in one sentence:
 * "kill awaiting_validation". It is NOT gone from the world, only from this
 * list: see `RETIRED_HELP_STATUSES` below, which is what a ticket that really
 * passed through it is still read back through.
 *
 * The reasoning, because a retirement with no reason recorded gets re-litigated.
 * It was the only stage with no home on the five-column Open board, and the
 * WAITING it was reaching for is said far better as a PREDICATE than as a
 * stored word: `waitingClause` (workers/content/src/lib/help.ts) asks whether
 * the last reply on the thread came from somebody who is not a portal user —
 * "we spoke last and nobody has answered" — which needs no column, no door to
 * clear it, and cannot go stale the way a stored stage can. A status that only
 * a second write can correct is a fact with an expiry date on it.
 *
 * What went with it: the ONE lifecycle door a client could push
 * (`POST /api/content/help/validate`, `validate_help_ticket`) and the gate that
 * opened tickets into it. An extra, a request or a piece of feedback now opens
 * in `new` like everything else — we stop asking permission before we read the
 * thing. `help.validated_at` and every `help_status_events` row survive
 * untouched: what a ticket went through is not this list's to edit. */
export const HELP_STATUSES = [
  "new",
  "triaged",
  "scheduled",
  "in_progress",
  "ready",
  "resolved",
] as const
export type HelpStatus = (typeof HELP_STATUSES)[number]

/** THE STAGES A TICKET MAY NO LONGER ENTER, AND STILL WENT THROUGH.
 *
 * A vocabulary that has been retired is not a vocabulary that has been undone.
 * `help_status_events` (team migration 0066) holds rows naming stages that were
 * real when they were written, team migration 0069 deliberately does not touch
 * them, and a ticket that genuinely waited on a client still waited on one. So
 * the WRITING vocabulary narrows and the READING one does not: `HELP_STATUSES`
 * is what a ticket may be in NOW — every door, filter, facet, board column and
 * validator stands on it — and `HelpStatusEver` is every word this column has
 * ever legitimately held, which is what the stage-history types are cut from
 * (`TicketStageEvent`, `TicketStageSpan`).
 *
 * WHY A SECOND LIST RATHER THAN LEAVING THE WORD IN THE FIRST ONE. Because
 * every one of those doors would then still accept it: the status door would
 * take it off a request body, the tab facets would offer it, the board would
 * grow a column for it, and `set_help_status` would tell the agent it is a
 * place a ticket can be sent. A retirement that only removes the BUTTON is the
 * shape that leaves a stage reachable by anybody who types its name.
 *
 * AND WHY NOT SIMPLY DROP IT EVERYWHERE. Because `stageLabel`
 * (web/components/tickets/ticket-stages.tsx) would then have no case for it, and a
 * timeline row on a real ticket would draw either nothing or the raw enum. A
 * person reading their own ticket's history is owed the same words we used at
 * the time — "Waiting on you" — for ever. */
export const RETIRED_HELP_STATUSES = ["awaiting_validation"] as const
export type RetiredHelpStatus = (typeof RETIRED_HELP_STATUSES)[number]

/** Every word `help.status` has ever legitimately held — live or retired. The
 * HISTORY reads this; nothing that WRITES may. */
export type HelpStatusEver = HelpStatus | RetiredHelpStatus

/** THE KINDS THAT ARE SCOPED WORK — an extra, a request, a piece of feedback:
 * somebody asking for MORE, as against a question or an issue, which is somebody
 * stuck. Matched case-insensitively against the team's OWN editable `Ticket type`
 * vocabulary — the words are a team's to rename, and a rule that hard-matched
 * the seeded spelling would silently stop matching the day somebody typed
 * "Requests".
 *
 * IT USED TO BE `ticketTypeWaitsForValidation`, AND THE RENAME IS THE POINT.
 * Until 7 Sep 2026 this predicate decided which kinds opened in
 * `awaiting_validation` and waited on the client to confirm. That stage is
 * retired (see `HELP_STATUSES` above) and nothing waits any more — but the
 * DIVISION it draws outlived the gate that used it, because it was never really
 * about permission: these are the kinds that cost money, which is why the
 * tickets dashboard ranks clients by exactly this set ("who has more scoped
 * work", web/components/tickets/tickets-dashboard.tsx). Keeping the old name over the
 * surviving half would have left an identifier promising a wait that no longer
 * happens. */
const SCOPED_TICKET_TYPES = ["extra", "request", "feedback"] as const

/** Is a ticket of this kind scoped work — an ask for more, rather than somebody
 * stuck? */
export function isScopedTicketType(helpType: string | null | undefined): boolean {
  if (!helpType) return false
  const word = helpType.trim().toLowerCase().replace(/s$/, "")
  return (SCOPED_TICKET_TYPES as readonly string[]).includes(word)
}

/* ═══════════════════════════════════════════════════════════════════════════
 * THE KIND OF TICKET THAT IS KEPT BUT NEVER SHOWN.
 *
 * READ THIS BEFORE YOU DELETE ANYTHING. The rows this hides are NOT orphans and
 * they are NOT waiting to be cleaned up. The client's ruling, 6 Sep 2026, in her
 * own words: *"keep the existing requirements (we will use that later) but do
 * not display them in tickets / i just want that you dont lose that data,
 * because later we're moving them to another database"*.
 *
 * So this is a HIDE, not a tombstone, and the distinction is the whole of the
 * design. Nothing is converted, nothing is deleted, no migration rewrites a
 * row's `help_type`, and the word stays translated in `shared/i18n-seed.ts`
 * because tickets on disk still carry it. A requirements ticket is a live row
 * with live data that a future migration will lift into another database; if it
 * had been converted to a Question or wiped, that migration would have nothing
 * to lift. Somebody reading this in six months should conclude "these were kept
 * deliberately", never "these were forgotten".
 *
 * WHY IT IS ALSO NOT A TYPE ANY MORE. She ruled in August that "requirements is
 * not a type, kill that". It was never removed, and the cost of that showed up
 * on 6 Sep 2026 as a real defect: the tickets dashboard's open-work panel
 * hard-coded four columns while the vocabulary was five words long, so every
 * stage drew two rows. A vocabulary the product has retired but the seed still
 * plants is a fifth word every screen has to remember to allow for.
 *
 * WHERE IT IS ENFORCED — AT THE DOOR, and never in a browser:
 *   • `ticketWhere` (workers/content/src/lib/help.ts) puts the clause below on
 *     the ticket list, its `COUNT(*)` badges, the sub-tab facets and the whole
 *     dashboard, so the rows and every number describing them come off ONE
 *     WHERE. A client-side filter would have made the badges disagree with the
 *     rows, which is the exact failure R16 exists to prevent.
 *   • `needsTriage` (workers/content/src/lib/triage.ts) puts it on the queue AND
 *     on the queue's own count, for the same reason.
 *   • `createTicket` / `updateTicket` REFUSE the word, so no new one can be
 *     raised even on a team whose dropdown still offers it.
 * A ticket reached BY ID (`getTicket`, the detail screen, the machine surface)
 * is deliberately untouched: hidden from the collection, still readable on its
 * own — which is what "do not lose that data" requires.
 * ═══════════════════════════════════════════════════════════════════════════ */

/** The one place the word lives. A `Ticket type` dropdown VALUE, not an id —
 * `help.help_type` stores the team's own word (shared/selectable-homes.ts). */
export const TICKET_TYPE_KEPT_FOR_MIGRATION = "Requirements"

/** The spellings the test below accepts, lowercased. DERIVED from the word
 * above so the TypeScript predicate and the SQL clause cannot come to disagree
 * about what counts — the failure that would show as a row in the list with no
 * bar on the chart, or the other way round. */
const KEPT_FOR_MIGRATION_SPELLINGS: readonly string[] = [
  TICKET_TYPE_KEPT_FOR_MIGRATION.trim().toLowerCase().replace(/s$/, ""),
  TICKET_TYPE_KEPT_FOR_MIGRATION.trim().toLowerCase(),
]

/** Is this the kind that is kept but never shown?
 *
 * THE SAME IDIOM AS `isScopedTicketType` ABOVE, on purpose and not by
 * coincidence: trim, lowercase, drop one trailing "s". `help_type` holds a
 * team's OWN editable word, so a rule that hard-matched the seeded spelling
 * would start showing these rows again the day somebody retyped the value as
 * "requirement" or "Requirements ". Two idioms for "is this word that word" in
 * one file would be one idiom too many. */
export function ticketTypeKeptForMigration(helpType: string | null | undefined): boolean {
  if (!helpType) return false
  const word = helpType.trim().toLowerCase().replace(/s$/, "")
  return KEPT_FOR_MIGRATION_SPELLINGS.includes(word)
}

/** The same test, as a SQL predicate that EXCLUDES those rows.
 *
 * `column` is written by the caller in its own source and never taken off a
 * request — the same condition `workingDaysSql` asks for.
 *
 * IT DOES NOT REACH FOR `sqlString`, and that is deliberate rather than lazy:
 * that seam lives in `shared/workers/d1-rest.ts`, which is worker-only code, and
 * this file is imported by both front doors' browser bundles. The values being
 * quoted are computed above from a string literal in THIS file, so the only
 * thing this interpolation can ever contain is a word this file shipped with —
 * the same argument `OPEN_STATUS_SQL` in lib/help.ts makes about the status
 * enum. The doubled-quote escape is kept anyway, so the day somebody changes
 * the word to one with an apostrophe in it nothing breaks quietly.
 *
 * `COALESCE` because a ticket with NO kind is not one of these: `NULL NOT IN
 * (…)` is NULL, which is not true, which would have silently swallowed every
 * untyped ticket in the app — including every one sitting in the triage queue
 * precisely BECAUSE nobody has given it a kind yet. */
export function ticketTypeKeptForMigrationExcludedSql(column: string): string {
  const list = KEPT_FOR_MIGRATION_SPELLINGS.map((w) => `'${w.replaceAll("'", "''")}'`).join(", ")
  return `LOWER(TRIM(COALESCE(${column}, ''))) NOT IN (${list})`
}

/** The states a ticket is NOT yet finished in — "still ours to do something
 * about". Derived from the one list above rather than retyped, so a sixth state
 * cannot be added and silently left out of the sentence that matters most.
 * `ready` counts as unfinished: every story is done, but nobody has told the
 * client yet, and that telling is the resolution. */
export const OPEN_HELP_STATUSES = HELP_STATUSES.filter((s) => s !== "resolved")

/** THE STAGES THE "OPEN" TAB MEANS — the client's own ruling, 2026-09-06,
 * verbatim: "Open → triaged + scheduled + in_progress + waiting", and "open
 * (status, when triaged but not solved)".
 *
 * IT IS NOT `OPEN_HELP_STATUSES` ABOVE, AND THE TWO MUST NOT BE MERGED. That
 * one answers "is this ticket still ours to do something about" — everything
 * that is not `resolved`, `new` included — and it is read by the dashboard and
 * by every "how much is open" figure in the product.
 * THIS one is a TAB: the pile of work that has been sorted and is not finished.
 *
 * ── `ready` JOINED IT, 2026-09-07, AND THE PARAGRAPH IT REPLACED IS WHY ─────
 *
 * The client's next sentence about this screen was *"in open, include status
 * ready and waiting / add them after / with this 5 columns, use all width
 * available in screen"* — she was describing the Open tab's Kanban, and a board
 * column is a slice of the tab it is drawn on. So `ready` is in the SET, not
 * only in the board: a column counting rows the tab's own list refuses to show
 * is the exact defect R16 exists for, and the two must agree by construction
 * rather than by two lists that happen to match today. Everything downstream is
 * derived from this array — the tab token (`OPEN_FACET`), the door's `status
 * IN (…)` clause, the tab's badge, the Status facet's option list and the
 * board's columns — so the ruling is one edit here and the five surfaces cannot
 * disagree about what Open means.
 *
 * WHAT THAT COSTS, SAID PLAINLY, BECAUSE THIS COMMENT USED TO FORBID IT. The
 * paragraph here read: folding `ready` in "would put the same ticket under two
 * tabs and make each one's badge a count of the other's pile as well". Both
 * halves are still TRUE; what changed is that they stopped being objections.
 * Ready is now a SUBSET of Open, in exactly the shape Waiting already was
 * (`waitingClause`, workers/content/src/lib/help.ts: "a subset of Open, not a
 * sibling of it"), and a strip whose tabs nest is what this strip already is —
 * All contains Closed contains nothing else, and nobody reads those badges as a
 * partition. Each badge stays an exact `COUNT(*)` of its OWN tab's own
 * question, no badge is a sum of two others, and no number is taken off a
 * loaded page. That is the whole of R16; overlapping questions were never the
 * part it forbade.
 *
 * `new` STAYS OUT. Triage is the one pile that is not work-in-progress at all —
 * nobody has read those tickets, so they are not "sorted and under way" by any
 * reading, and the client's own sentence names `ready` and `waiting` and stops.
 *
 * `awaiting_validation` USED TO BE OUT OF THIS TAB TOO, and the paragraph that
 * said so is worth one sentence of epitaph rather than a silent deletion: it
 * meant "the client has not approved a request yet", which is a DIFFERENT
 * sentence from the Waiting column's ("we said something, they have not
 * answered"), and that difference was the whole reason it sat outside. The
 * client settled it on 7 Sep 2026 by retiring the stage entirely, so the two
 * sentences are now one — the surviving one is the predicate, derived from the
 * conversation on every read and never stored.
 *
 * DERIVED-CHECKED RATHER THAN RETYPED: every entry is asserted to be a real
 * `HelpStatus`, so a stage renamed in `HELP_STATUSES` cannot leave a dead word
 * behind here that would silently narrow the tab to nothing. */
export const OPEN_TAB_STATUSES = [
  "triaged",
  "scheduled",
  "in_progress",
  "ready",
] as const satisfies readonly HelpStatus[]

/** HOW FAR BACK THE CLOSING-TIME DISTRIBUTION LOOKS, on the tickets dashboard.
 * A distribution taken over all time is dominated by tickets closed under a way
 * of working nobody here uses any more, and the question the panel is titled
 * with — how long does a ticket take to close — is a question about now.
 *
 * SIX MONTHS, AND IT IS COUNTED IN MONTHS (client, 6 Sep 2026: "for this how
 * long, only consider the latest 6 months"). It was ninety days until then, and
 * the unit moved with the number rather than being converted into a hundred and
 * eighty: she said months, the sentence the panel writes when it has nothing to
 * draw says months, and SQLite's own `'-6 months'` walks the calendar, so a
 * February does not quietly count as thirty days. One constant, read by the
 * door's SQL and by that sentence, so the window and its caption cannot drift.
 *
 * IT IS THE SHORTER OF TWO WINDOWS ON ONE PANEL ROW, deliberately: the trend
 * beside it still draws `CLOSURE_TREND_MONTHS`, because six monthly points is
 * too few to tell a direction from a season. The two answer different
 * questions — what it is NOW, and which way it is GOING — and each says its own
 * span on screen, the distribution in its empty-state sentence and the trend in
 * the months written along its own axis. */
export const CLOSURE_WINDOW_MONTHS = 6

/** HOW MANY MONTHS OF THE CLOSING-TIME TREND ARE DRAWN. A year, so a season
 * repeats once and a reader can tell a trend from a summer. */
export const CLOSURE_TREND_MONTHS = 12

/* THE FLOOR UNDER A MONTHLY MEDIAN WAS REMOVED ON 2026-09-07, BY THE CLIENT,
 * AND THE REASONING IS KEPT HERE RATHER THAN DELETED WITH THE CODE.
 *
 * `CLOSURE_TREND_MIN_CLOSURES` was 8. A (month, kind) bucket with fewer
 * closures than that never left the door, so the twelve-month trend drew the
 * kinds that close in real numbers and dropped the ones that trickle.
 *
 * THE ARGUMENT FOR IT WAS NOT WRONG, and that is why it is written down instead
 * of being quietly forgotten. A median is the middle VALUE, so it exists for
 * any count at all — including one — and a median of one closed ticket is that
 * ticket's own duration drawn at the same weight, in the same colour, on the
 * same axis as a median of a hundred and eighteen. A chart cannot refuse to be
 * read, and a reader who can see a line will read a line.
 *
 * SHE OVERRULED IT, KNOWING THAT: "Only months with at least 8 of a kind are
 * thrown. No, even if it's only 1, it should appear there." Her reading of the
 * same fact is the opposite one and it is hers to make — a month she knows
 * something closed in, drawn as a gap, tells her the app lost her data, which
 * costs more than a jumpy line does. So the floor is gone from the SQL
 * (`workers/content/src/lib/help.ts`, 3B) and the sentence that explained it is
 * gone from the screen with it, because a caption describing a rule that no
 * longer applies is worse than no caption.
 *
 * WHAT REPLACED IT IS NOT A SECOND FLOOR. Nothing thresholds a month now. What
 * the thin months rest on is DISCLOSURE: every point's own count already rides
 * the hover readout and the hit area's accessible name ("{median} days, from
 * {count} closed"), so "how much is this point standing on" is answerable per
 * month, by anybody, without the chart deciding for them. See
 * `ClosureTrend` in `web/components/tickets/tickets-dashboard.tsx` for why nothing else
 * was added. */

/** A support ticket (team-wide; the My/All tabs filter by raiser). The built-in
 * `status` is the source of truth; `helpType` is a cosmetic selectable value. */
export type HelpTicket = {
  id: string
  helpType: string | null
  /** WHAT IT ARRIVED AS — the type it was created with, stamped once at the
   * INSERT and never updated afterwards (team migration 0065, which carries the
   * whole reasoning). `helpType` above is what it IS; this is what it WAS, and
   * the pair is the only way the app can say how often a ticket comes in as one
   * kind and is recategorised into another.
   *
   * NULL is a real answer and means "this system did not record it": every
   * ticket raised before the column existed, the ~788 imported from Glide
   * included. It is deliberately NOT backfilled from anything — read 0065 for
   * the two candidate sources and why each was refused — so a reader must say
   * "not recorded" rather than counting those rows as un-recategorised. */
  raisedAsType: string | null
  description: string
  screenRecordingLink: string | null
  sourceScreen: string | null
  status: HelpStatus
  resolved: boolean
  resolvedAt: string | null
  /** THE NUMBER THE CLIENT QUOTES (SCOPE ch.02, "BERG-T0412") — the account's own
   * short code, a T, and a sequence counted PER ACCOUNT. Null on a ticket with no
   * client, or one whose client has no code yet: a reference nobody can say out
   * loud is worse than none, because it looks like it means something. */
  ref: string | null
  /** WHERE THE PERSON PUT IT. Drag-rank is the only priority signal in the
   * product (SCOPE ch.07 — there is no priority dropdown and there will not be
   * one), so this is the list's order, not a tiebreak. A sparse text key: see
   * shared/workers/rank.ts. */
  rank: string | null
  /** WHEN WE FIRST READ IT. Until this is set the account still owns the wording
   * and may edit it; after, the record of what they asked for holds still while
   * the conversation about it moves. Null = nobody here has touched it yet. */
  lockedAt: string | null
  /** Put away without being lost (the glossary's Archive). Null = live. */
  archivedAt: string | null
  /** BOTH TITLES, never one overwriting the other. 788 of the tickets arriving
   * from Glide exist only in German; a translation SETS `titleEn` and leaves
   * `titleDe` exactly as the person wrote it. */
  titleDe: string | null
  titleEn: string | null
  /** OUR UNSENT WORKING TEXT — what we will tell them when the request is
   * answered, assembled from each story's closing note as the work finishes so
   * nobody is composing from a blank page at the end of a fortnight.
   *
   * Null on the way OUT to a client login, always. It is a draft: half of it may
   * be wrong, and all of it is written in the register colleagues use with each
   * other. The resolution the client reads is the one a person SENDS. */
  draftResolution: string | null
  /** HOW MUCH WORK IS ON IT, and nothing else about that work. "3 pieces of
   * work, 1 done" is exactly what a client is shown (.plans/BUILD-1 §7) — never
   * a title, an assignee or a date, because those are the answer to "which staff
   * member is doing it" (SCOPE ch.06). Staff read the same two numbers and click
   * through to the backlog for the rest. */
  storyCount: number
  doneStoryCount: number
  /** Who raised it, and who last touched it. All three are null on the way OUT,
   * and only to a client login, when the person is on the AGENCY's side of the
   * fence — SCOPE ch.06, "the portal shows work status but never which staff
   * member is doing it". See toTicket in workers/content/src/lib/help.ts. */
  raiserId: string | null
  raiserName: string | null
  editorName: string | null
  /** WHOSE SIDE OF THE FENCE EACH OF THOSE TWO IS ON (R54). Already computed on
   * the row for the redaction above (`raiser_is_client` / `editor_is_client`,
   * an EXISTS over `portal_users`) and, until 7 Sep 2026, thrown away on the way
   * out — which left the AGENCY app holding one field carrying two populations
   * with nothing to tell them apart. Staff are named by their first name only;
   * a contact who raised their own question is named in full. */
  raiserIsClient: boolean
  editorIsClient: boolean
  createdAt: string
  updatedAt: string | null
  /** The account this question was raised FOR — the company a client contact was
   * standing in when they asked. `null` on the agency's own tickets. It is what
   * the account fence reads, and what a live ping carries so a colleague's
   * question can reach their screen without reaching anyone else's. */
  accountId: string | null
  /** WHICH SYSTEM IT IS ABOUT (CHECKLIST 5.8). A request that names no app is a
   * request nobody can route: the app is what says whose work it is, which
   * sprint it could be scheduled into, and who the stakeholder to tell is. */
  appId: string | null
  appName: string | null
  /** WHICH SECTION OF THAT APP (Aurora, 19 Aug 2026: "please implement MODULES
   * under apps, so i can group all the tickets I am creating in an organized
   * way"). 94% of the 1,820 tickets in the legacy data carried one, which is why
   * the form asks for it rather than hoping triage adds it later.
   *
   * The NAME and the MARK ride the row (R35) — a ticket list shows the section
   * with its emoji, and never a bare id it would have to go and resolve. */
  moduleId: string | null
  moduleName: string | null
  moduleMark: string | null
  /** WHO ASKED (CHECKLIST 5.9) — the CONTACT, a person row on the account, not
   * the login that typed it. Staff raise most of a client's history on their
   * behalf, so "who raised it" and "who typed it" are different people and the
   * record has to be able to say both. */
  raisedByContactId: string | null
  raisedByContactName: string | null
  /** WHEN THE CLIENT'S MAIN STAKEHOLDER CONFIRMED THEY WANTED IT, back when we
   * asked. Nothing sets it any more: the confirmation gate was retired with
   * `awaiting_validation` on 7 Sep 2026 (see `HELP_STATUSES`), and an extra now
   * goes straight into the queue like everything else.
   *
   * IT IS KEPT, NOT DROPPED, and read-only from here on. The rows that carry
   * one recorded a real act by a real person on a real date; a column emptied
   * because the feature behind it ended is a fact deleted, not a feature
   * removed. No screen reads it today and none has to — it is the answer to
   * "did they ever say yes", for as long as anybody asks. */
  validatedAt: string | null
}

/** ONE MOVE ALONG THE LADDER — a row of `help_status_events` (team migration
 * 0066), as a screen reads it.
 *
 * `fromStatus` is null when nothing before this was recorded: on the row
 * `createTicket` stamps there genuinely was nothing (the ticket did not exist),
 * and 0066 names the one race that shares the value. It is stored rather than
 * inferred from the previous event because the FIRST event has no previous
 * event, and whether the sequence is whole is exactly what it answers.
 *
 * `HelpStatusEver` AND NOT `HelpStatus`, WHICH IS THE WHOLE OF HOW A RETIRED
 * STAGE STAYS READABLE. These two fields are the one place in the codebase that
 * reports what a ticket WAS rather than what it IS, and the two questions stop
 * having the same answer the moment a stage is retired. Narrowing them to the
 * live vocabulary would not delete the stored rows — nothing deletes from
 * `help_status_events` — it would only make the type LIE about them, and the
 * exhaustive `switch` in `stageLabel` would then fall through to `undefined` on
 * a real ticket's real history. Widen the reader, never the writer. */
export type TicketStageEvent = {
  id: string
  fromStatus: HelpStatusEver | null
  toStatus: HelpStatusEver
  at: string
  /** Who moved it. Null on a row whose actor was not recorded. */
  byName: string | null
}

/** HOW LONG THE TICKET SAT IN ONE STAGE — the gap between two consecutive
 * events, in WORKING days (`shared/business-days.ts`: the owner's Mon–Fri rule,
 * "saturday and sunday do not count towards how long it took").
 *
 * `to` is null on the stage the ticket is in NOW, and `workingDays` is then
 * measured to the moment the door answered — which is why it is computed on the
 * server beside the rows rather than in a browser that may have the tab open all
 * week.
 *
 * `HelpStatusEver` for the reason `TicketStageEvent` above gives at length: a
 * span is cut from a stored event, so it inherits that event's vocabulary and
 * not the live one. */
export type TicketStageSpan = {
  status: HelpStatusEver
  from: string
  to: string | null
  workingDays: number
}

/** A TICKET'S STAGE HISTORY, and its honest empty shape.
 *
 * `recorded: false` is what every ticket that existed before 0066 reports, for
 * ever. It is NOT "zero days in every stage" and no reader may render it as a
 * number: nothing was measured, and 0066 carries the argument for why the past
 * was not invented out of the activity feed's prose.
 *
 * `fromCreation` is the second, subtler honesty: a ticket raised before 0066 and
 * moved after it has a REAL sequence that simply does not start at the
 * beginning, so the first span's own start is unknown and the screen says so
 * rather than drawing a stage that begins where the recording does. */
export type TicketStageHistory = {
  recorded: boolean
  /** The first recorded event is the ticket's creation, so the sequence is whole. */
  fromCreation: boolean
  events: TicketStageEvent[]
  spans: TicketStageSpan[]
  /** Transitions back OUT of `resolved`. Null when nothing is recorded — the
   * difference between "it was never reopened" and "we have no record" is the
   * whole reason this is nullable rather than 0. */
  reopens: number | null
}

/** HOW WE DID, ACCORDING TO THE PERSON WE DID IT FOR (team migration 0067).
 *
 * A score out of three and, if they felt like it, some words. The comment is
 * OPTIONAL in the real sense: a score on its own is a complete rating and
 * nothing may refuse or nag on the absence of text.
 *
 * `by*` is who said it, and it is on the row rather than implied because a
 * rating is a personal statement — the agency has to be able to tell a client's
 * own answer from one a staff member relayed off a phone call. */
export type TicketRating = {
  id: string
  ticketId: string
  score: 1 | 2 | 3
  comment: string | null
  createdAt: string
  byId: string | null
  byName: string | null
}

/** A FILE OR A LINK ON A TICKET (CHECKLIST 5.10) — several of each, from either
 * front door. One row shape for both, because "here is the thing I mean" is one
 * act: a `file` carries the R2 key we stored it under, a `link` carries only a
 * URL. Deactivate-never-delete, like everything else here. */
export type HelpAttachment = {
  id: string
  ticketId: string
  kind: "file" | "link"
  /** what a person reads in the list — the file's name, or the link's label */
  label: string
  /** the file's key inside the tickets bucket, or the link's URL */
  url: string
  contentType: string | null
  sizeBytes: number | null
  createdAt: string
  /** null on the way OUT to a client login when the person is on the agency's
   * side of the fence — the same redaction `toTicket` makes about a raiser. */
  addedByName: string | null
  /** R54: which population `addedByName` belongs to, from the same `from_client`
   * subselect the redaction above already runs. Staff by first name, a contact
   * in full. */
  addedByIsClient: boolean
}

/** ONE THING A STORY SHOWS FOR ITSELF — a file in the shared media bucket, or a
 * link somebody pasted. The same shape `HelpAttachment` has one table along, and
 * for the same reasons: "here is the thing I mean" is one act, and `kind` decides
 * only how `url` is read. */
export type StoryAttachment = {
  id: string
  storyId: string
  kind: "file" | "link"
  /** what a person reads in the list — the file's name, or the link's label */
  label: string
  /** the file's key inside the shared media bucket, or the link's URL */
  url: string
  contentType: string | null
  sizeBytes: number | null
  createdAt: string
  addedByName: string | null
}

/** One reply on a ticket. `isAgent` marks the AI-drafted first reply; a mention
 * is notification-only (every member can see every ticket via the All tab).
 *
 * `authorId` and `authorName` are BOTH nullable because the wire is where staff
 * anonymity is kept (SCOPE ch.06): to a client login, a reply written on the
 * agency's side of the fence arrives with no id and no name. Nulling only the
 * name left a stable per-person handle in the payload — a pseudonym, which is
 * anonymity right up until one email addresses the same person by name. */
export type HelpMessage = {
  id: string
  ticketId: string
  body: string
  taggedUserIds: string[]
  isAgent: boolean
  authorId: string | null
  authorName: string | null
  /** R54, and the same sentence `raiserIsClient` carries: a thread in the agency
   * app has both sides on it, `listReplies` already computes `from_client` for
   * the portal's own redaction, and the agency screen needs the answer too —
   * a colleague is named by their first name, a contact in full. */
  authorIsClient: boolean
  createdAt: string
}

/** One stakeholder on a ticket. Origin tells the UI why they're here (and that
 * derived ones can't be removed — nothing on a ticket can). No assignee. */
export type HelpStakeholder = {
  userId: string
  name: string | null
  email: string
  imageUrl: string | null
  origin: "raiser" | "admin" | "mentioned" | "added"
}

/** A target in the owner-maintained global import catalog. */
export type ImportableTarget = {
  id: string
  tableKey: string
  displayName: string
  description: string | null
  requiredColumns: { key: string; label: string; required: boolean }[]
  active: boolean
}

/** A saved agent conversation thread (per team — the agent's memory). */
export type AgentThread = {
  id: string
  title: string | null
  lastMessageAt: string | null
  createdAt: string
}

/** One message in an agent thread. `toolCalls` records the actions the agent took
 * (and their status); `source` is in-app vs which MCP client. */
export type AgentMessage = {
  id: string
  threadId: string
  role: "user" | "assistant" | "tool"
  content: string | null
  toolCalls?: { tool: string; status: "pending" | "done" | "failed"; summary?: string }[]
  source: string | null
  createdAt: string
}

/** A team's AI quota snapshot (the credit-based model): a free daily allowance plus
 * a purchasable credit balance. `remaining` = free left today + credits; `blocked`
 * means both are exhausted (the agent warns, then hard-stops for the day). */
export type AgentQuota = {
  freeDaily: number
  freeUsedToday: number
  freeRemaining: number
  creditBalance: number
  remaining: number
  blocked: boolean
  /** TESTING ENVIRONMENTS ONLY — the daily allowance is not enforced here, so a
   * turn is never refused for running out. The counters beside this stay TRUE:
   * `freeUsedToday`, the credit balance and the usage log all keep recording, so
   * what a team costs is still answerable. Only the REFUSAL is off.
   *
   * A boolean beside the number rather than a very large `freeDaily`, for the
   * reason the whole codebase prefers `hasMore` / `complete` / `totalCapped`: a
   * sentinel value has to be recognised to be understood, and anything that
   * doesn't recognise it renders "999,975 of 1,000,000 free left today" to a
   * person. A flag is either read or ignored, and ignoring it is safe here —
   * `blocked` is already false. */
  unlimited: boolean
}

/** One row of the agent usage log — a plain trail of what the AI did, one per turn.
 * `credits` = AI units the turn consumed; `source` = where they came from; `summary` =
 * the user's message, trimmed. Newest-first; team-scoped. */
export type UsageLogRow = {
  id: string
  createdAt: string
  actorName: string | null
  credits: number
  source: "free" | "credit" | "mixed"
  summary: string
  /** what the summary IS: an action taken (team-visible) or the author's prompt
   * (their own). NULL on back-filled rows → treated as private. */
  kind?: "action" | "prompt" | null
}

/** One column an import maps a file onto (matches a catalog target's columns). */
export type ImportColumn = { key: string; label: string; required: boolean }

/* ---- Agentic multi-file import (AGENTIC-IMPORT.md) ---- */

/** The safe, fixed vocabulary of per-column normalizers the agent may pick from
 * (no arbitrary code runs — a transform key maps to a pure function). */
export type TransformKey = "trim" | "titlecase" | "lowercase" | "uppercase" | "iso_date" | "boolean"

/** One file's step in the plan: which target it feeds, how its columns map, the
 * chosen normalizations, the references it carries, and a reject prediction. */
export type ImportPlanStep = {
  fileId: string
  fileName: string
  target: string
  targetName: string
  mapping: Record<string, string | null> // our column key → their header (null = unmapped)
  transforms: Record<string, TransformKey> // our column key → normalizer
  references: { column: string; target: string; mode: "id" | "value" }[]
  rowCount: number
  predictedRejects: number
  /** The predicted rejections themselves (row + reason), computed from the file's
   * ROWS at plan time so a bad file is visible BEFORE running — capped in size (the
   * count above is always the full number). Uses the same scan as execution, so the
   * plan never over- or under-promises what the run will do. */
  predictedRejections?: ImportRejection[]
  notes?: string
}

/** The reviewable plan: the ordered steps + any warnings (cycle, unknown target…). */
export type ImportPlan = {
  order: string[] // tableKeys, dependency order (parents first)
  steps: ImportPlanStep[] // one per file, already in run order
  warnings: string[]
  bySource: "agent" | "fallback" // did the model plan it, or the deterministic fallback?
}

export type ImportRejection = { file: string; row: number; reason: string }

/** The per-target tally + every rejected row's reason, produced by execution. */
export type ImportBatchReport = {
  perTarget: { target: string; targetName: string; created: number; skipped: number; failed: number }[]
  created: number
  skipped: number
  failed: number
  rejections: ImportRejection[]
}

/** The whole batch as the wizard sees it (files + plan + report + status). */
export type ImportBatchView = {
  id: string
  status: string
  files: { fileId: string; name: string; headers: string[]; rowCount: number }[]
  plan: ImportPlan | null
  report: ImportBatchReport | null
  /** WHERE A RUN HAS GOT TO, while it is still going — the table it is inside
   * and how many of that table's rows are done. Null before a run starts and
   * again once it finishes, so `status === "running"` with a null progress is a
   * run that has not reached its first checkpoint (or one that died before it
   * did, which is the case the Continue button exists for). */
  progress: { targetKey: string; rowsDone: number } | null
  createdAt: string
}

/** One line of the team's import HISTORY (who ran what, when, into which tables,
 * with the totals) — summaries only, never row contents. */
export type ImportBatchSummary = {
  id: string
  status: string
  by: string
  at: string
  completedAt: string | null
  files: { name: string; rowCount: number }[]
  targets: string[]
  created: number
  skipped: number
  failed: number
}

/** One personal access token (the MCP front desk) as the settings screen sees it. */
export type McpTokenSummary = {
  id: string
  label: string
  teamId: string
  createdAt: string
  /** When it stops working (every token has a deadline — core migration 0016). */
  expiresAt: string | null
  lastUsedAt: string | null
  revokedAt: string | null
}

/** One action the agent proposes that needs the user's confirmation before it runs.
 * `summary` is the one-line label; `details` is the PAYLOAD behind it — the body
 * the gated door will receive, in plain lines (shared/workers/confirm-payload.ts).
 * Both are built by the one `pendingCall` seam: a confirm you cannot read is not
 * a confirm, so the panel never shows the label without what it will do. */
export type PendingCall = {
  name: string
  input: Record<string, unknown>
  summary: string
  details: string[]
}

/** The result of one agent chat turn: a finished reply, or a pause for confirmation. */
export type ChatOutcome =
  | {
      done: true
      threadId: string
      reply: string
      quota: AgentQuota
      overQuota?: boolean
      /** THE TURN FAILED AT THE MODEL DOOR and the loop turned it into a saved,
       * friendly turn rather than a 500 — so the stream ends `done`, and this is
       * the only thing that says the answer never happened. The screen draws its
       * gentle notice from this; without it a failure is indistinguishable from
       * a short reply. */
      failure?: ModelFailure
    }
  | {
      done: false
      threadId: string
      assistantText: string
      needsConfirm: PendingCall[]
      quota: AgentQuota
    }

/** One event on the agent's SSE stream (wire format: `data: <json>\n\n`). Keys are
 * terse + stable. `text` + `step_*` may repeat any number of times; exactly ONE terminal
 * event (confirm | final | error) ends every stream. EVERYTHING the assistant says
 * arrives as `text` events (streamed deltas, or one chunk for a non-streaming model /
 * a server note) — `final` only settles the turn (thread/quota/reply fallback), so the
 * client renders the accumulated text and never loses an earlier explanation. The
 * `summary` on step_* uses the same name-resolved logic as the confirm-panel summaries. */
/** WHY a model turn failed, as a closed set — one reason per SENTENCE a person
 * needs, never one per status code (shared/workers/model-failure.ts classifies).
 *
 *   unconfigured           this environment has no assistant key at all
 *   refused                the key was rejected (401/403) — an account decision
 *   rate_limited           too many requests, for now (429)
 *   provider_out_of_credit the account behind the key has run dry
 *   overloaded             the provider is busy; it clears on its own
 *   unavailable            anything else, including a network that never answered
 *
 * The WORDS live in the front doors, wrapped in `t(...)` (R28/R33). A worker
 * cannot translate, so it sends the reason and the screen says the sentence. */
export type ModelFailure =
  | "unconfigured"
  | "refused"
  | "rate_limited"
  | "provider_out_of_credit"
  | "overloaded"
  | "unavailable"

export type StreamEvent =
  /** append this delta to the current assistant reply bubble (word-by-word). */
  | { t: "text"; d: string }
  /** a tool is about to run (human, id→name-resolved summary). */
  | { t: "step_start"; tool: string; summary: string; ids?: Record<string, string> }
  /** that tool finished — ok true, or false on failure (`error` = the door's short,
   * human reason, e.g. which permission was missing — shown on the failed step row). */
  | { t: "step_end"; tool: string; ok: boolean; summary: string; error?: string }
  /** WHAT THE ASSISTANT JUST READ OUT OF THE KNOWLEDGE BASE — Law R23 on the wire.
   *
   * Until this existed, a retrieval's citations reached the MODEL and stopped
   * there: the client is sent `step_start`/`step_end` and never a tool's result,
   * so the panel could not have drawn a source under an answer if it had wanted
   * to. This carries the answer seam's own two lists, unchanged and unassembled,
   * so the turn's citation marks and the sources under it come from the same
   * retrieval the answer was written from.
   *
   * It belongs to the turn that is streaming when it arrives, and it repeats: a
   * turn that asks two questions retrieves twice. */
  | { t: "sources"; citations: KnowledgeCitation[]; passages: KnowledgePassage[] }
  /** TERMINAL: needs confirmation; the client shows the yes/no panel. Carries the
   * `threadId` so a FIRST-turn confirm (a brand-new conversation whose opening
   * message proposes a dangerous action) can be resolved — the thread is already
   * saved server-side, but the client only learns its id from `final`, which a
   * paused turn never reaches. Without it, approve/decline no-op (dead buttons). */
  | { t: "confirm"; threadId: string; calls: PendingCall[]; text?: string }
  /** TERMINAL: run complete; carries the full ChatOutcome (reply/quota/threadId). */
  | { t: "final"; outcome: ChatOutcome }
  /** TERMINAL: something went wrong; a safe message to show. `reason` is set
   * when the failure was the MODEL door and could be classified — the screen
   * says its own sentence for that reason and falls back to `message` when it
   * is absent (an older worker, or a fault that was never a model call). */
  | { t: "error"; message: string; reason?: ModelFailure }

// ── The customer spine (SCOPE ch.03) ─────────────────────────────────────────
// One table for every company and every person. What the workers hand the client
// carries `id` as THE identifier and `code` as a label — never the other way
// round, on either side of the wire.

/** One account — a company (`entity`) or a person (`individual`). */
export type Account = {
  id: string
  accountType: "entity" | "individual"
  /** the account this one sits under; null at the top of its tree */
  parentAccountId: string | null
  name: string
  email: string | null
  phone: string | null
  /** THE POSTAL ADDRESS, in four fields rather than one free-text line. A
   * country typed free is a country spelled five ways, and "which city are our
   * German clients in?" is a question one text column cannot answer. `country`
   * is picked from the Country dropdown group; the other three are typed. */
  street: string | null
  postalCode: string | null
  city: string | null
  country: string | null
  /** what this company does, from the Industry dropdown group */
  industry: string | null
  /** a paragraph about them, authored as rich text (HTML) */
  about: string | null
  /** their mark, and the wide image their record leads with */
  logoUrl: string | null
  coverUrl: string | null
  /** the human reference staff assign when work starts (BERG). GENERATED, not
   * typed: the first four letters of the name, uppercased, with a numeric suffix
   * when that is already taken. Display only — every route addresses a row by
   * its ULID `id`, so re-coding an account never re-points its records. */
  code: string | null
  currency: string | null
  /** the language this account is written to. The account's own default; a
   * contact may override it, and staff switch their own. */
  locale: string | null
  timezone: string | null
  /** may this account see money figures on its own work? `null` on the way OUT
   * to a client login — the agency's own switch ABOUT them, never for them. */
  commercialsVisible: boolean | null
  /** WHERE THIS PERSON WORKS, AND WHAT THEY DO THERE — the contacts table's two
   * middle columns (client, 2026-09-09: "for contacts lets do view table, also
   * add column role after account").
   *
   * They are read off `account_links`, not off `parentAccountId`, and the two
   * travel together on purpose: `relationship` is the role somebody holds AT a
   * company ("CEO", "Site Manager", "Webflow Developer"), so a role taken from
   * one link beside a company taken from the parent pointer would be two cells
   * describing two different facts. ONE link answers both — the one that matches
   * the parent pointer where there is one, then the main stakeholder, then the
   * first by company name (workers/tenancy/src/lib/accounts.ts, `LINKED_COMPANY`).
   *
   * `null` is ORDINARY on both, and on 110 real contacts it is 22 and 45 of them:
   * a person nobody has filed under a company yet, and a link where nobody typed
   * what she does. The screen draws an em dash, the same as an unset app on the
   * tickets list — it is not an error and must not read as one.
   *
   * Always `null` on a COMPANY row (a company is nobody's contact) and always
   * `null` on the way out to a client login, the same sentence
   * `commercialsVisible` makes one line up: a person can be a contact at two
   * companies, and one of them may sit outside the caller's fence. */
  companyName?: string | null
  relationship?: string | null
  /** false once archived (deactivate-never-delete) */
  active: boolean
  /** the audit block, for the detail Overview tab (the same shape every record
   * shows — see TeamRole). */
  createdAt?: string | null
  createdByName?: string | null
  updatedAt?: string | null
  editedByName?: string | null
}

/** A person's relationship to an account — the "contact of" row. */
/** THE CLIENT'S OWN ORGANISATION — who does the work at a client, what an hour
 * of them costs, and what they run on. A role exists so a step's minutes can
 * become money; a tool exists so a step that replaces one can be subtracted. */
export type ClientDepartment = {
  id: string
  accountId: string
  name: string
  active: boolean
  /** how many roles sit in it — counted by the list door in one statement, not
   * one query per row. */
  roleCount: number
}

export type ClientRole = {
  id: string
  accountId: string
  name: string
  /** What an hour costs the CLIENT, in cents. `null` is a real answer — "nobody
   * has said yet" — and is deliberately not zero, which would read as "this
   * person is free" and would come out of the arithmetic as a saving of nothing
   * with nothing to say a number was missing. */
  centsPerHour: number | null
  active: boolean
  /** SEVERAL, deliberately: "one role is doing things across multiple
   * departments, especially in slightly smaller companies" (the owner). */
  departmentIds: string[]
  /** The contacts holding it — their own `accounts` rows. There is no separate
   * person table here, because a second address book is one that goes out of
   * step with the first. */
  peopleIds: string[]
}

export type ClientTool = {
  id: string
  accountId: string
  name: string
  mark: string | null
  active: boolean
  /** The price in force on the day asked about — null when it has never been
   * priced. Read from `client_tool_prices`, never a column on the tool, which is
   * what stops the two ever disagreeing. */
  cents: number | null
  billingPeriod: "month" | "year" | null
  effectiveOn: string | null
}

export type ClientToolPrice = {
  id: string
  toolId: string
  cents: number
  billingPeriod: "month" | "year"
  /** the day this price started being true */
  effectiveOn: string
}

export type AccountLink = {
  id: string
  accountId: string
  personAccountId: string
  personName: string
  /** THE FACE AT THE OTHER END OF THE LINK — `accounts.logo_url` on the row
   * `personName` names, so it follows that field's direction exactly: the
   * PERSON's photograph on `AccountDetail.links`, the COMPANY's mark on
   * `AccountDetail.companies`. R35: a record shown anywhere carries its own
   * face, and a contact offered in a picker is shown to be chosen.
   *
   * NULL FOR A CLIENT LOGIN, always, and that withholding is `listAccountLinks`'
   * to make — see the note there. It is also null for the many people who
   * simply have no photograph, which is the ordinary case and the one
   * `RecordMark` falls through to an initial for. */
  personLogoUrl: string | null
  relationship: string | null
  isMainStakeholder: boolean
  active: boolean
}

/** One account opened: the record, the account it sits under, the people linked
 * to it and who can log in — plus the two EXACT server totals its tabs badge
 * (R16: a badge is a COUNT(*), never the length of a capped list). */
export type AccountDetail = {
  account: Account
  parent: Account | null
  /** the PEOPLE inside this company. Empty for a person (they are somebody's
   * contact, not somebody with contacts) and empty for any caller without
   * `contacts:read` — the address book is its own grant. */
  links: AccountLink[]
  /** the COMPANIES this person is a contact of — the same link table read from
   * the other end, which is why companies and people stayed one table: a person
   * can be a contact at two companies and a parent pointer has room for one.
   * Empty for a company. `personName` on each row carries the COMPANY's name. */
  companies: AccountLink[]
  portalUsers: PortalUser[]
  linksTotal: number
  /** the exact server COUNT(*) behind `companies` (R16) */
  companiesTotal: number
  portalUsersTotal: number
}

/** A client-side person's login. Absent = no portal access; present and inactive
 * = revoked (their records are untouched). */
export type PortalUser = {
  id: string
  accountId: string
  userId: string
  email: string | null
  /** null = the whole account's world; otherwise the Apps they're narrowed to */
  appRestriction: string | null
  grantedAt: string
  grantedByName: string | null
  active: boolean
}

/* ------------------------------ knowledge base ------------------------------ */

/** ONE SOURCE — a piece of material the assistant may read. Two families in one
 * shape: a `note` a person typed here (the body is the truth), and a MIRROR of a
 * row the app already owns (`ticket` / `account` / `app` — the row is the
 * truth and the sweep keeps the body in step). `compartment` is which slice of
 * the knowledge base it belongs to: "agency", or "account:<id>". */
export type KnowledgeSource = {
  id: string
  kind: string
  /** the table this mirrors, or null for a note somebody typed */
  originTable: string | null
  originRowId: string | null
  compartment: string
  accountId: string | null
  /** the built system, the ticket and the sprint this is about — the rest of the
   * "notebook" a question is routed by. Null where it does not apply. */
  appId: string | null
  ticketId: string | null
  sprintId: string | null
  /** when the material is FROM, which is not when it was indexed */
  recordDate: string | null
  title: string
  /** what this record is ABOUT, in a sentence or two — derived from the record
   * itself, never generated. What a list shows, and what the router searches. */
  summary: string | null
  /** the material. On a LIST this is always null (a page of 300-page contracts
   * is not a list); on a detail it is as much as a screen shows. */
  body: string | null
  /** how much material there really is. With `bodyTruncated` it is what lets a
   * screen say "the first part of 412 KB" instead of showing an excerpt as if it
   * were the document. */
  bodyBytes: number
  bodyTruncated: boolean
  sourceUrl: string | null
  /** THE FILE THIS SOURCE WAS READ FROM, when it was one (kind 'file').
   *
   * `fileUrl` is a capability URL into the agency's own media (/media/internal/,
   * served by the agency door and no other). `fileType` is the type the browser
   * declared — a LABEL for a screen, never handed to a renderer; the object
   * itself is stored with no renderable type at all.
   *
   * `fileNote` is the honest half, and the one a screen must never hide: why
   * this file's words are missing, or why there are fewer of them than the file
   * holds. `fileUrl` set with a null `body` and this note is the whole of
   * "stored, not searchable" — a state the product allows on purpose, because
   * the alternative was refusing half of what somebody has on their desktop. */
  fileUrl: string | null
  fileName: string | null
  fileType: string | null
  fileBytes: number
  fileNote: string | null
  /** WHO MAY READ THIS SOURCE, in narrowing order (12.3):
   *   "team"    — anyone who may read the knowledge base;
   *   "app"     — only the people staffed to `visibleToAppId` (plus an admin),
   *               which is the same sentence the app record itself says (8.11);
   *   "private" — only its owner.
   * Derived from the two id columns, never stored twice: "private" wins over
   * "app" when both are set, so no row can be in a state a reader has to guess. */
  visibility: "team" | "app" | "private"
  ownerUserId: string | null
  /** the app whose people may read it, or null for the whole team. NOT `appId`
   * above — that one says what a mirrored source is ABOUT and belongs to the
   * sweep, which rewrites it on every pass. */
  visibleToAppId: string | null
  /** that app's name, so a list can say whose it is without a second read */
  visibleToAppName: string | null
  indexedAt: string | null
  chunkCount: number
  /** how far through this source the indexer has got. Below `chunkCount` means
   * a large document is still going in — it is searchable as far as it got. */
  indexedChunks: number
  /** why it could not be indexed whole, in words, or null */
  indexError: string | null
  active: boolean
  createdAt: string
  creatorName: string | null
  editorName: string | null
  updatedAt: string | null
}

/** One piece of a source, as retrieval hands it back: the text, and where it came
 * from. `score` is 0…1 — the blend of the vector's similarity and the lexical
 * index's, rounded for the wire. */
export type KnowledgePassage = {
  sourceId: string
  title: string
  kind: string
  url: string | null
  /** THE RECORD THIS CAME OUT OF, as a path under the team (`tickets/<id>`).
   * A reader who disagrees with an answer has to be able to go and look at the
   * ticket, the map or the meeting itself — not only at the source row that
   * mirrors it. Null where there is no record screen to open: a note somebody
   * typed IS the record, and a document out of Drive is reached through `url`. */
  recordPath: string | null
  compartment: string
  seq: number
  text: string
  score: number
  /** WHEN THIS SOURCE IS FROM — the record's own moment, never the moment we read
   * it. Null where the row genuinely has none, which is a fact rather than a gap
   * to fill: the writer is told a source carries no date rather than being handed
   * a guess it would then reason about. */
  recordDate: string | null
}

/** Where an answer came from. Law R23: an answer with no citation is not an
 * answer, so this list is empty exactly when `found` is false. */
export type KnowledgeCitation = {
  sourceId: string
  title: string
  kind: string
  url: string | null
  /** the record itself, one hop past the source — see `KnowledgePassage`. */
  recordPath: string | null
  /** WHAT THE LIVE ROW SAYS RIGHT NOW, read at the moment of answering rather
   * than taken from the index — so a ticket that was "in progress" when it was
   * indexed and is "done" now cannot be quoted as in progress. Null for a source
   * that mirrors nothing (a note somebody typed IS the truth). */
  liveStatus: string | null
  checkedAt: string | null
}

/** What the knowledge base answers with: the evidence, the reasoning about WHERE
 * it looked (`reason`), and — when it was asked to write one — the answer itself.
 *
 * RETRIEVAL STILL WRITES NOTHING. `answer` is composed by a model that was handed
 * exactly the `passages` and `citations` below and nothing else, and it is decided
 * in the SAME seam they are (Law R23), so it cannot exist without them. A caller
 * that did not ask for it, or a question nothing answers, gets null and the
 * evidence — which is what this type has always been. */
export type KnowledgeAnswer = {
  question: string
  found: boolean
  /** the sentence to say when there is nothing — never an invented answer */
  message: string
  /** THE WRITTEN ANSWER, or null when nobody asked for one, nothing was found, or
   * the model could not be reached. Markdown, and it may carry the app's visual
   * blocks (shared/agent-blocks.ts) — the same string shape an assistant reply is,
   * rendered by the same one renderer. Null is never an error: it means the
   * passages below are the whole answer, exactly as they were before. */
  answer: string | null
  /** the compartments searched; empty means the whole knowledge base */
  compartments: string[]
  /** WHY those compartments, in a sentence a person can disagree with */
  reason: string
  /** what the record summaries say this question is ABOUT. Evidence for the
   * reader; deliberately NOT an input to the ranking — see §3 of
   * workers/content/src/lib/knowledge.ts. */
  records: { sourceId: string; title: string }[]
  passages: KnowledgePassage[]
  citations: KnowledgeCitation[]
  /** how many chunks the search considered (the bounded candidate set) */
  candidates: number
}

// ── Process maps, versions and the money (SCOPE ch.02 · .plans/BUILD-3) ───────
// App → Process → Step, and what a map is worth. THERE WERE THREE RATE CARDS
// HERE and on 10 Sep 2026 there were none. `InternalRate` (what a kind of our
// own work cost us) and `RoleRate` (what an hour of one of our roles was worth)
// went first — "kill the whole internal rates thing … for now i iwanna wipe it
// clean" — and `AccountRate` (what a CLIENT was charged, by kind of work) went
// an hour later, at the same person's second ruling: "the whole account rates
// also killed it".
//
// Each was its own type rather than a `kind` field on one, so that no wrong
// filter could turn one into the other. That care is worth recording even though
// all three are gone: the reason there was never a `Rate` type with an audience
// on it is the reason removing one of them did not risk the others.
//
// WHAT IS LEFT IS NOT A CARD. An hourly figure still exists in this base — on a
// CLIENT'S OWN ROLE (`client_roles.cents_per_hour`, what their staff cost THEM,
// frozen onto each step of a map when it was drawn) — and a sprint still carries
// what it was sold for. Neither is a card the book is costed from; both are
// facts about one client's own world.


/** WHAT ONE APP HAS GIVEN BACK — hours, and what those hours are worth (8.13).
 * The money is the ONE savings seam's own arithmetic (shared/workers/savings):
 * each step's saving times the CLIENT-role rate frozen on that step — the same
 * figure the process screen shows, because for six days this panel priced a
 * SECOND way (a process-level role against the internal rate card) and the two
 * answers disagreed on the owner's own screen: €2,766.35 on the map, 0.00 one
 * tab over. One arithmetic, one seam, or the numbers stop being believable.
 * Still a staff door (the portal has its own hours-only view). */
export type AppMoneyBack = {
  appId: string
  savedSecondsPerMonth: number
  /** the sum of the priced steps only — see `unpricedProcesses`. */
  moneyCentsPerMonth: number
  /** how many processes carry NO priced step at all. Shown, never hidden: a
   * total that silently left work out is the sort of number that costs the
   * screen its credit. */
  unpricedProcesses: number
  lines: {
    processId: string
    name: string
    savedSecondsPerMonth: number
    /** null when no step is priced — distinct from "priced at zero". */
    moneyCentsPerMonth: number | null
    /** the money's own coverage: how many of this map's steps carry a rate. */
    pricedSteps: number
    totalSteps: number
  }[]
  /** R25 — the sentence the figure may not be shown without, carried on the
   * payload so the screen never assembles it. */
  caption: string
}

/** An App: the built system, the thing with its own address (SCOPE ch.02). */
export type AppRow = {
  id: string
  /** THE NUMBER A PERSON READS OFF THE HEADER'S BLACK CHIP — "A3", team-wide,
   * minted the moment the app is created (shared/workers/refs.ts). New as of
   * the 2026-08-31 ruling: an app never carried one before. Null on every app
   * that existed before that migration landed — there is nothing to mint one
   * FROM after the fact. */
  ref: string | null
  /** whose system it is; null is the agency's own */
  accountId: string | null
  name: string
  url: string | null
  stage: string | null
  /** THE CLIENT'S OWN MARK, as a `/media/...` path we host. An app is the one
   * record a person recognises by sight, so this is what the tile shows; where
   * it is null the tile keeps the stage mark it has always drawn. It rides for
   * every reader, staffed or not — the overview IS the picture. */
  logoUrl: string | null
  /** what it costs US to run each month, in cents. `null` on the way OUT to a
   * client login — an internal number, withheld on the row (see listApps). */
  toolCostCentsPerMonth: number | null
  // ── THE FOUR CONTEXT FIELDS ────────────────────────────────────────────────
  // What the system is, the situation it was built into, what we did about it,
  // and who actually uses it. Prose, all four — they are what somebody joining
  // the account reads first, and what the assistant answers "what is this app
  // for?" out of. They ride on the LIST row rather than a detail door because
  // the apps set is bounded and read whole: the record is the list's own row.
  about: string | null
  clientContext: string | null
  solution: string | null
  keyActors: string | null
  /** WHETHER THIS READER MAY OPEN IT (8.11). Everyone sees an app in the
   * overview; only the staff on it and an admin open its detail. False means the
   * four context fields and the address above arrived NULL because the door
   * withheld them, not because nobody has filled them in. */
  canOpen: boolean
  /** OUR people on this app, the lead first. Empty when `canOpen` is false. */
  staff: { userId: string; isLead: boolean }[]
  /** THE CLIENT's people on this app, the main one first. Each `contactId` is an
   * `accounts` row of type individual — a contact is a person's own account row
   * (there is no contacts table, and CHECKLIST 15.1 says why). */
  stakeholders: { contactId: string; isMain: boolean }[]
  active: boolean
  createdAt?: string | null
  createdByName?: string | null
  updatedAt?: string | null
  editedByName?: string | null
}

/** A DELIVERABLE: one piece of material we handed over on an app — a handover
 * doc, an API reference, a recorded walkthrough, an SOP (CHECKLIST 8.7).
 *
 * It hangs off exactly one app, always, which is why `appId` is not optional:
 * the legacy app hung them off apps too, and a handover doc with no system to
 * hand over is not a record anybody could file. */
export type Deliverable = {
  id: string
  appId: string
  /** whose system it was built for, copied off the app at creation and never
   * edited — the account fence, ready, on a module no client door names yet. */
  accountId: string | null
  title: string
  /** the word the card shows in small caps (VIDEO, SOP). A dropdown value from
   * the team's own "Deliverable kind" vocabulary, so it grows. */
  kind: string | null
  /** the day it was handed over, written YYYY-MM-DD. */
  datedOn: string | null
  /** THE MATERIAL: an object we host (a /media/internal/… URL the upload door
   * minted) or a link we do not (a Loom recording, a Google Doc, an API
   * reference). One field for both shapes — "here is the thing I mean" is one
   * act, and two fields would be two ways to be wrong about which is set. */
  url: string | null
  /** the picture worth showing on the card, when there is one. */
  imageUrl: string | null
  /** WHEN THIS WAS MADE VISIBLE TO THE CLIENT, or null — which is the default and
   * the safe state (Client visibility, glossary). A moment rather than a flag so
   * the client's own screen can say since when; WHO turned it on is a line in the
   * record's history, not a second copy on the row. */
  visibleToClientAt: string | null
  active: boolean
  createdAt: string
  creatorName: string | null
  updatedAt: string | null
  editorName: string | null
}

/** ONE DELIVERABLE, AS THE CLIENT SEES IT — a different shape from `Deliverable`
 * on purpose, and the shape is half the fencing.
 *
 * What is missing is the point. No `creatorName` or `editorName`: SCOPE ch.06 is
 * that the portal shows the work and never which staff member is doing it, and a
 * shape with nowhere to put a name cannot leak one by a later careless mapper.
 * No `active`: an archived deliverable is simply absent, not present-and-faded,
 * because "we put this away" is our word about our own shelf. No
 * `visibleToClientAt` as a switch either — every row the client can read is
 * visible by construction, so it travels as `sharedOn`, which is a date they can
 * be told rather than a state they could infer things from.
 *
 * `appName` rather than `appId` alone: a client reads their handover material by
 * the system it belongs to, and an id is not a thing anybody recognises. */
export type ClientDeliverable = {
  id: string
  appId: string
  appName: string | null
  title: string
  kind: string | null
  datedOn: string | null
  url: string | null
  imageUrl: string | null
  /** the day the agency made it visible to them (`visible_to_client_at`). */
  sharedOn: string
}

/** One process in a list: what it is, and how much of it there is. */
/** A MODULE — one section of an app, and the thing a ticket says it is about.
 *
 * The two trees this product keeps apart meet on the app and nowhere else: an
 * ACCOUNT has processes (how the client's business works, versioned, what every
 * saving is drilled through), and an APP has modules (how the software we built
 * is divided — Settings, Documents, Tasks). A ticket carries a module because a
 * ticket is about a screen. A saving carries a process because a saving is about
 * a job of work. Nothing joins them, on purpose.
 *
 * `mark` and `nameDe` mirror `selectable_data`'s enrichment columns so a module
 * is edited with the same affordances as any other vocabulary — an emoji and a
 * German name — without being a team-wide vocabulary, which it cannot be: 124 of
 * the 160 distinct names in the legacy data belong to exactly one app. */
export type AppModule = {
  id: string
  appId: string
  appName: string
  accountId: string | null
  name: string
  /** the emoji shown beside the name, as on a dropdown value */
  mark: string | null
  /** the German name, for a client whose account reads in German */
  nameDe: string | null
  description: string | null
  /** WHAT THIS SECTION GIVES THE CLIENT — carried over from the legacy data,
   * where every module named its own benefit ("Time savings, transparency, and
   * automated monitoring"). Not shown on a picker; it is what a handover
   * document is written from. */
  benefit: string | null
  /** open tickets filed against this module */
  ticketCount: number
  active: boolean
  createdAt: string
}

export type ProcessSummary = {
  id: string
  appId: string
  appName: string
  accountId: string | null
  name: string
  description: string | null
  /** WHO DOES THIS WORK — the role whose hours the saving is measured in
   * (CHECKLIST 8.13). Free text against the team's own words: the person who
   * does a client's invoicing is THEIR bookkeeper, not one of our logins. Null
   * until somebody says, and an app's money figure then reports this process's
   * hours with no price beside them rather than inventing one. */
  roleName: string | null
  /** WHICH of the client's roles that word now names — migration 0052 turned
   * every typed word into a record, and this is the pointer. It is the DEFAULT a
   * new step starts from (0053); a step's own role is what the money is actually
   * computed against. `roleName` stays as the word the map was mapped with. */
  roleId: string | null
  /** THE DAY THE SAVING IS MEASURED FROM. Null on a map nobody has dated, which
   * reads as the day the map was created. */
  auditDate?: string | null
  /** how many versions have been cut (1 = the baseline alone) */
  versionCount: number
  /** steps in the CURRENT version */
  stepCount: number
  active: boolean
  createdAt: string
}

/** One version of a process. v1 is the pre-kwapso baseline, always. */
export type ProcessVersion = {
  id: string
  processId: string
  versionNo: number
  label: string | null
  isBaseline: boolean
  createdAt: string
  createdByName: string | null
}

/** One step of one version. */
export type ProcessStep = {
  id: string
  processId: string
  versionId: string
  /** the SAME step across versions — what makes the saving a subtraction */
  stepKey: string
  name: string
  description: string | null
  position: number
  secondsPerRun: number
  runsPerMonth: number
  /** true once the work stopped happening (kept, at zero seconds — never deleted) */
  removed: boolean
  /** WHO DOES THIS STEP — one of the client's own roles. Null until somebody
   * says, which is a real answer: the step's minutes then report with no money
   * beside them rather than at a price nobody agreed. */
  roleId: string | null
  /** the role's own name, read alongside so a step can be read without a second
   * lookup — and so an older version still says the word it was mapped with */
  roleName: string | null
  /** WHAT AN HOUR OF THAT ROLE COSTS THE CLIENT, in cents. Null when the role is
   * unnamed OR when its cost has not been looked up yet — two different reasons
   * for the same honest gap, told apart by whether `roleId` is set. */
  roleCentsPerHour: number | null
  /** WHAT IT IS DONE IN — exactly ONE, by both respondents' ruling. Aurora's
   * reason is the good one: "if it's multiple tools, it's multiple steps". A step
   * done in two systems has a handoff in the middle of it, and the handoff is
   * what a process map exists to show. Null is ordinary, not missing. */
  toolId: string | null
  toolName: string | null
  toolMark: string | null
  /** HOW OFTEN, IN THE PERIOD SOMEBODY SAYS IT IN. `runsPerMonth` above is this
   * converted, once, in the one place that conversion lives. */
  runsPerPeriod: number
  frequencyPeriod: "day" | "week" | "month" | "year"
  /** THE WORD ON A FORK. Two steps at the SAME position are branches of one
   * decision; this is what distinguishes them ("if approved" / "if rejected").
   * Null on an ordinary step, which is nearly all of them. */
  branchLabel: string | null
  /** WHICH ARM OF A FORK THIS STEP IS ON — the step_key of the branch HEAD it
   * continues, or null for an ordinary step on the trunk.
   *
   * A fork used to be able to say only two things: steps sharing a position are
   * branches, and a single step below them is the rejoin. So a step meant to
   * continue ONE arm was drawn centred under both and read as a join. This is
   * the third thing it can say, and the picture library has been able to draw it
   * all along (`FlowBranch.chain`). */
  branchOf: string | null
  /** THE WAY BACK. The step key this one can return to — "if rejected, go back
   * to step two". Rejections and rework are real work and a map that cannot draw
   * them is describing a process nobody runs. */
  loopsBackTo: string | null
  /** WHICH DAY THIS DESCRIPTION STARTED BEING TRUE — set only when the step came
   * out of the dated history rather than off the live row. */
  effectiveOn?: string
}

/** One process opened: its versions, the steps of ONE of them, the exact totals
 * its tabs are badged with (R16), and the subtraction the map exists to produce.
 *
 * `steps` is the SHOWN version's, not always the current one's — `shownVersionId`
 * says which, and it is the latest unless the reader asked for an older one. The
 * two travel together deliberately: a list of steps with no version beside it is
 * how a reader ends up checking today's times against last year's total. */
export type ProcessLink = {
  id: string
  /** the OTHER map — never this one */
  processId: string
  name: string
  note: string | null
  /** `to` = this map hands over to it; `from` = it hands over to this one. Read
   * both ways on purpose: making somebody remember which way round they typed a
   * connection is how a feature stops being used. */
  direction: "to" | "from"
}

export type ProcessDetail = {
  process: ProcessSummary
  versions: ProcessVersion[]
  steps: ProcessStep[]
  /** which version `steps` belongs to (the latest, unless one was asked for) */
  shownVersionId: string
  /** the exact server count of that version's steps — what the Steps tab badges */
  shownStepCount: number
  commentsTotal: number
  /** baseline minus latest, step by step, through the ONE savings seam — so this
   * screen's figure and the client's portal can never disagree. `null` for an
   * archived map, which is out of the value picture by construction. */
  saving: ProcessSaving | null
  /** the sentence the figure above must be quoted with (R25), carried with it */
  savingsCaption: string
  /** THE DAY THE SAVING IS MEASURED FROM — Alex's visit, not "version 1"
   * (Aurora's ruling). A version number is a thing WE did; this is the moment
   * the client recognises as "before". */
  auditDate: string
  /** the day the slider is parked on, or null for today's live map */
  asOf: string | null
  /** every day this map changed, plus the audit date — the stops the slider
   * snaps to, so no position on it is a day nothing happened */
  revisionDates: string[]
  /** the maps this one hands over to, and the ones that hand over to it. LOOSE
   * by ruling: naming a link changes no duration and no saving on either side. */
  links: ProcessLink[]
}

/** A comment on a process map — a conversation, never an edit. */
export type ProcessComment = {
  id: string
  processId: string
  body: string
  /** set = this comment is the staff explanation for that step's regression */
  explainsStepKey: string | null
  fromStaff: boolean
  createdAt: string
  /** null when a client login is reading a STAFF comment: the portal never says
   * which staff member is doing the work (SCOPE ch.06). */
  createdByName: string | null
}


/* ─────────────────────────── the work engine ─────────────────────────────── */
// A ticket is what an account ASKS FOR; a story is one piece of work WE DO about
// it (.plans/BUILD-1 §2). The four nouns are kept apart in the words, in the
// glossary, and here in the types — a single "work item" type with a kind field
// is how they stop being kept apart on the screens.

/** The four states a story moves through (SCOPE ch.07). The review step is
 * deliberate: work is checked before it is called done. FIXED — the code trusts
 * this list; the team-editable "Story status" dropdown is display-only. */
export const STORY_STATUSES = ["open", "in_progress", "in_review", "done"] as const
export type StoryStatus = (typeof STORY_STATUSES)[number]

/** ONE PIECE OF WORK WE DO. The only place an assignee and a due date live — a
 * ticket deliberately has neither and derives its picture from these. */
export type Story = {
  id: string
  /** BERG-S0188 — the account's own short code, an S, and a per-account sequence.
   * Null on a story with no account, or one whose account has no code yet. */
  ref: string | null
  title: string
  detail: string | null
  status: StoryStatus
  /** WHAT KIND OF WORK IT IS (CHECKLIST 6.2) — Fix, Feature or Change, and
   * editable on the Dropdown values screen like every other vocabulary here.
   * REQUIRED on the way in; nullable on the way out because 3,677 stories
   * arrived from the previous system without one, and a column that refused to
   * describe them would be a column that lied about what is in the table. */
  storyType: string | null
  /** WHY IT MAY BE REVIEWED. Written before a story can move to `in_review`
   * (CHECKLIST 6.9): the timers have to be stopped and this has to say what was
   * done. The FILE is optional — Aurora's ruling, over "all three always" —
   * because plenty of work has nothing to show. */
  reviewNote: string | null
  reviewFileUrl: string | null
  reviewFileName: string | null
  /** the request this work answers, when there is one. Four out of five stories
   * in the real history stand on their own. */
  ticketId: string | null
  ticketRef: string | null
  sprintId: string | null
  sprintName: string | null
  appId: string | null
  processId: string | null
  /** WHICH STEP OF WHICH MAP THIS WORK CHANGED — a step KEY, so it means the same
   * step across every version of that map. A story cannot close without this or
   * `changesNoStep`; that pair is the hook the savings maths hangs off. */
  stepKey: string | null
  changesNoStep: boolean
  /** EVERY PROCESS THIS WORK TOUCHES (CHECKLIST 6.5). `processId` above is the
   * FIRST of these, kept because the savings maths and the import both address a
   * story's map by one id; this is the full set, and one piece of work commonly
   * changes two. An EMPTY list is only allowed when `changesNoStep` is ticked —
   * Aurora's ruling that "no process" must be CHOSEN rather than left blank. */
  processIds: string[]
  assigneeId: string | null
  assigneeName: string | null
  reviewerId: string | null
  reviewerName: string | null
  startsOn: string | null
  /** THE STORY'S OWN due date, kept for the rows that already carry one and
   * never asked for again — the form stopped offering it on 17 Aug 2026. */
  dueOn: string | null
  /** WHEN IT IS ACTUALLY DUE: the end date of the sprint this work sits in. A
   * story is one piece of a block that was sold with an end date on it, so the
   * block's date is the promise; two dates for one promise is two dates that
   * disagree the first time a sprint moves. Null on a story with no sprint. */
  sprintEndsOn: string | null
  closedAt: string | null
  /** what we will tell the client. Closing a story appends this to the ticket's
   * DRAFT resolution — a draft, never a sent message. */
  closingNote: string | null
  rank: string | null
  accountId: string | null
  createdAt: string
  updatedAt: string | null
  createdByName: string | null
  editedByName: string | null
}

/** A BLOCK OF DELIVERY WORK SOLD TO ONE ACCOUNT. It carries the flat price. It
 * used to be the revenue half of the agency's margin, which was retired with the
 * internal rates on 10 Sep 2026; what reads it now is the client's own value
 * screen, behind their account's price-visibility switch. Whole cents, like every
 * money column here. */
export type Sprint = {
  id: string
  ref: string | null
  /** EVERY REFERENCE THIS SPRINT HAS EVER WORN, space separated, or null for the
   * ordinary case of one that has never been renumbered. Not for display — it is
   * what the browser's own search matcher looks in, because the sprints door
   * takes no `q` and cannot answer an old number on the server the way the ticket
   * and story doors do. See `refAliasesColumnSql` (shared/workers/refs.ts) and
   * migration 0068, which reissued three sprint numbers in four. */
  refWas: string | null
  name: string
  goal: string | null
  sprintType: string | null
  accountId: string | null
  accountName: string | null
  appId: string | null
  appName: string | null
  /** WHICH PACKAGE IT WAS SOLD INSIDE, if any. A sprint can be sold on its own —
   * null is ordinary, not missing — but where it belongs to a wave the sprint's
   * own screen has to say so, or a reader has to go and look for it. Read
   * alongside like the account and the app, for the same reason: one round trip. */
  waveId: string | null
  waveName: string | null
  startsOn: string | null
  endsOn: string | null
  soldPriceCents: number
  currency: string | null
  /** the MOMENT it completed, not a status word. It used to be what an automatic
   * version cut keyed off; that decision was purged on 24 Aug 2026 (a version is
   * cut by hand), and the moment is still the honest way to ask "is it done?". */
  completedAt: string | null
  active: boolean
  /** exact server counts of the work inside it (R16) — never a loaded length. */
  storyCount: number
  openStoryCount: number
  createdAt: string
  createdByName: string | null
}

/** ONE ROW OF TIME: who, what they worked on, and how long, in whole seconds.
 * A TIMER is one of these with no `endedAt` yet — there is no second concept and
 * no state machine, which is what makes starting one a single click. */
export type WorkLog = {
  id: string
  /** what it is against — one of WORK_LOG_TARGETS. Never a to-do (that is
   * somebody else's time) and never an account on its own. */
  targetTable: string
  targetId: string
  /** what the thing it is against is CALLED, so a list of time reads as a list
   * of work rather than a list of ids. */
  targetLabel: string | null
  /** The target's own short reference (`BERG-T0412`). NULL when the record has
   * no account, or its account has no short code — the agency's own work, most
   * often. Callers fall back to the label rather than showing a blank. */
  targetRef: string | null
  userId: string
  userName: string | null
  /** the kind of work, so the margin can group by it. Null until a team starts
   * saying — the margin applies its default internal rate and says so. */
  kind: string | null
  note: string | null
  startedAt: string
  /** null = still running */
  endedAt: string | null
  seconds: number
  billable: boolean
  /** a runaway timer somebody binned. The row survives; every sum subtracts it. */
  discarded: boolean
  accountId: string | null
}

/** A timer still running, as the header shows it: what it is on, where clicking
 * it goes, and when it started (the browser counts up from there rather than
 * asking the server every second). */
export type RunningTimer = {
  id: string
  targetTable: string
  targetId: string
  targetLabel: string | null
  /** The target's own short reference (`BERG-T0412`). NULL when the record has
   * no account, or its account has no short code — the agency's own work, most
   * often. Callers fall back to the label rather than showing a blank. */
  targetRef: string | null
  startedAt: string
  /** whole seconds elapsed at the moment the server answered */
  elapsedSeconds: number
  /** true once it has been running longer than RUNAWAY_HOURS — the Monday prompt */
  runaway: boolean
}

/** SOMETHING WE ARE WAITING ON THE CLIENT FOR. The one row in the work engine a
 * client login can write to: they complete it and upload a file against it from
 * their own portal. Never carries a work log — that would be their time in our
 * margin. */
export type Todo = {
  id: string
  /** BERG-D0007 — a to-do always belongs to a client, so it always has one (as
   * long as that client has a short code). */
  ref: string | null
  title: string
  detail: string | null
  dueOn: string | null
  completedAt: string | null
  completedByName: string | null
  /** R54: which population the name above belongs to. `toTodo`'s own paragraph
   * says a to-do is completed either by one of the client's people or by a staff
   * member doing it on the phone with them — two populations in one field, named
   * two different ways on screen, and until 7 Sep 2026 nothing on the row said
   * which. */
  completedByIsClient: boolean
  /** what they sent us, and what it was called on their machine. One file: the
   * request is "send us the logo", and a second attachment is a second to-do. */
  fileUrl: string | null
  fileName: string | null
  /** withdrawn without being deleted — we stopped needing it. */
  cancelled: boolean
  accountId: string
  accountName: string | null
  ticketId: string | null
  createdAt: string
}

/** THE TWO PILES OF A TO-DO, as SERVER views — the panel's own two words.
 *
 * Not a client filter, and not one list with a checkbox over it: the collection
 * PAGES (R14), so sieving the loaded rows for the completed ones would show "the
 * done among the newest fifty" under a badge counting all of them (R16). Each
 * view is also its own ORDERING — open by when it is due, done by when it was
 * done — which is what lets a single keyset cursor page either one.
 *
 * `all` USED TO BE THE SECOND WORD and is retired rather than renamed: the two
 * views sort by different columns, so "everything, in one order" is a question
 * with no honest keyset answer. A caller asking for the retired word gets the
 * open list, which is what it got before `all` existed. */
export const TODO_VIEWS = ["open", "done"] as const
export type TodoViewName = (typeof TODO_VIEWS)[number]

/** KWAPSO'S OWN INTERNAL ADMIN. Nobody outside the agency ever sees one. Work
 * logs DO attach — forty minutes on our own VAT return is real time and costs us
 * the same as forty minutes of delivery. */
export type Task = {
  id: string
  ref: string | null
  title: string
  detail: string | null
  assigneeId: string | null
  assigneeName: string | null
  /** WHEN IT HAS TO BE DONE. The field is `due_on` in the table and the word on
   * every screen is "Deadline" — the tester's, and the one this build uses. */
  dueOn: string | null
  status: "open" | "done"
  completedAt: string | null
  /** usually null — our own admin belongs to no client. A task that IS about one
   * (chasing an invoice, preparing a review) may name it, which is what puts its
   * time in the right margin. */
  accountId: string | null
  accountName: string | null
  /** THE EISENHOWER PAIR, which replaced a high/medium/low word. `priority` is
   * `(important × 2) + urgent + 1`, 1 to 4, computed from the two rather than
   * stored — a derived column is a column that can disagree with its inputs. */
  important: boolean
  urgent: boolean
  priority: 1 | 2 | 3 | 4
  /** which of the agency's five departments it belongs to — a word from the
   * `Department` dropdown group, editable on that screen. It is also what decides
   * the SECOND field: Production names an app, Sales a client, Admin may. */
  department: string | null
  appId: string | null
  appName: string | null
  /** the one thing attached to it — a photo of the letter, the form to file. It
   * lives in the agency's own bucket, served at /media/internal/ by the agency
   * gateway alone (R21): a task is ours, and so is its evidence. */
  fileUrl: string | null
  fileName: string | null
  createdAt: string
  createdByName: string | null
}

/** THE SIX PILES of our own admin, as SERVER views — the tab strip's own words.
 *
 * Not client filters, for the reason the ticket strip is a server scope: the list
 * is capped (R14), so sieving the loaded rows for the overdue ones would show
 * "the overdue among the newest N" under a badge counting all of them (R16).
 *
 * `open` is the everyday one and keeps its old name on the wire — the door has
 * answered to `?view=open` and `?view=all` since it shipped, and a rename would
 * be a contract change to relabel a tab. */
export const TASK_VIEWS = ["open", "overdue", "upcoming", "completed", "calendar", "all"] as const
export type TaskViewName = (typeof TASK_VIEWS)[number]

/* ── THE PULSE — the team's week as numbers a screen can draw ──────────────── */

/** One week of logged time. The worker knows no locale, so it hands back the
 * Monday that opens the week and the screen spells it in the reader's language. */
export type PulseWeek = {
  /** the Monday, `YYYY-MM-DD`, in UTC (the server owns the boundary so the chart
   * and every badge beside it mean the same week). */
  weekStart: string
  /** whole seconds logged inside it. EXACT — hours are the number an invoice is
   * argued about, so this is never a bounded display tally. */
  seconds: number
}

/** What `GET /api/content/insights` answers with.
 *
 * A `null` SECTION IS A RIGHT THE CALLER'S ROLE DOES NOT HOLD, and it is
 * deliberately not a zero: "you may not look at this" and "there are none of
 * these" are different sentences, and a chart drawn on the second one would be a
 * confident lie about the first (R18 — a cross-module read carries the caller's
 * rights). Every screen reading this must render nothing for a null section
 * rather than an empty state. */
export type TeamPulse = {
  tickets: {
    /** everything not yet resolved. */
    open: number
    /** the live stages in the lifecycle's own order — a chart of them reads left
     * to right as the work moves, and a stage nobody is in stays at zero rather
     * than vanishing, because an empty column is information too. */
    byStage: { stage: HelpStatus; count: number }[]
  } | null
  work: {
    /** the backlog: stories that are not done. */
    storiesOpen: number
    /** admin due today or earlier, and how much of it is ticked off. */
    tasksDue: number
    tasksDueDone: number
    /** the last eight weeks of logged time, oldest first. */
    weeks: PulseWeek[]
  } | null
  meetings: {
    /** this week's meetings, Monday to Sunday, decided by the server. */
    thisWeek: number
  } | null
}

/** What `GET /api/content/work-logs/summary` answers with — the numbers on top
 * of one record's list of time.
 *
 * EVERY FIGURE IS OVER THE WHOLE FILTER, never the page under it. The list is
 * keyset-paged (R14), so a browser adding up the rows it happens to hold would
 * answer "the newest fifty entries" while looking exactly like an answer about
 * the record. `total` and `totalSeconds` are the SAME two numbers the list door
 * returns, from the same function, so the badge and the header cannot disagree
 * (R16).
 *
 * NOTHING HERE IS MONEY. What an hour costs us is derived in the one file R24
 * fences and never travels on this object. */
export type WorkLogSummary = {
  /** how many entries — a badge number, bounded like every other count. */
  total: number
  /** did that count stop early? R16 says a total that hit the ceiling SAYS SO in
   * the same object, and this door answers with `json` rather than `pagedJson`,
   * which is where every paged door gets the flag for free. Without it the only
   * thing hedging was `formatCount`'s "+", which is a rendering decision — a
   * caller reading the number itself (an export, the agent) had nothing to read. */
  totalCapped: boolean
  /** whole seconds across all of them. EXACT, for the reason PulseWeek says. */
  totalSeconds: number
  /** HOW MANY PEOPLE HAVE WORKED ON IT — the door's own bounded count over the
   * whole filter, and NOT `people.length`, which is the top `WORK_LOG_GROUP_CAP`
   * by hours. A record worked on by more than fifty people read "People on it:
   * 50" for ever (R16: a capped list's length is a ceiling, not a total).
   *
   * No `peopleCapped` beside it: the ceiling is `TOTAL_COUNT_CAP`, so reaching it
   * means a million distinct people logged time against one story, and
   * `formatCount` renders the "+" if that day ever comes. */
  peopleTotal: number
  /** who spent it, biggest first — the top `WORK_LOG_GROUP_CAP` of them, which is
   * what a bar chart can show. `userName` is the snapshot on the row, so time
   * logged by somebody since removed from the team still has a name on it. */
  people: { userId: string; userName: string | null; seconds: number }[]
  /** what kind of work it was, biggest first. `null` is the real bucket for time
   * logged without a kind, which is most of it — not a dropped row. */
  kinds: { kind: string | null; seconds: number }[]
  /** the last eight weeks, oldest first — the SAME eight windows Home draws, so
   * two screens can never be looking at two different Mondays. */
  weeks: PulseWeek[]
}

/* A MEETING HAS NO STATUS, and that is a decision rather than an omission. It
 * had two words, `scheduled` and `held`, and the second was a flag somebody had
 * to remember to tick about a fact the CLOCK already knows: a meeting's own
 * `startsAt` says whether it has happened. Two sources of truth for one question
 * disagree the first time anybody forgets, in both directions. Cancelling was
 * never one of the words anyway — it is the module's `delete`, and the row
 * survives it (`active`). */

/** ONE PERSON ON A CALENDAR EVENT — the "stakeholders" a meeting record carries.
 *
 * As Google states them and nothing more: this is the MIRROR of the invitation,
 * so it says who was asked and what they answered, and it deliberately does not
 * say who they are to us. That second question is a different fact with a
 * different lifetime — a contact added to an account next week should light up
 * on a meeting held last week — so it is answered by a read (`meetingPeople`)
 * rather than frozen into the row at sync time. */
export type MeetingGuest = {
  email: string
  name: string
  /** Google's own word: `needsAction`, `declined`, `tentative` or `accepted`. */
  response: string
  organizer: boolean
  optional: boolean
  /** a meeting ROOM rather than a person — Google puts both on one list. */
  resource: boolean
}

/** A file hanging off a calendar event: an agenda, a deck, or the transcript Google
 * Meet files against the event once the call is over. */
export type MeetingAttachment = {
  fileId: string
  title: string
  mimeType: string
  iconUrl: string | null
  url: string | null
}

/** WHO ON AN INVITATION WE ALREADY KNOW. The answer to the second half of the
 * owner's "stakeholders" ask: an address that matches one of our own people, or
 * a contact on one of our accounts, is a RECORD rather than a string.
 *
 * Both halves can be null — most addresses on most invitations are neither, and
 * saying so plainly is better than a screen that implies every guest is filed
 * somewhere. */
export type MeetingPersonLink = {
  email: string
  /** one of our own team members. */
  memberUserId: string | null
  memberName: string | null
  /** a contact on one of our accounts, and the client it sits under. */
  accountId: string | null
  accountName: string | null
}

/** A CONVERSATION WE HAD, or are about to have — the record Glide never kept.
 * Its 350 meetings were folded into work logs, which kept the hours and lost the
 * agenda; these two fields are why this is a record of its own. */
export type Meeting = {
  id: string
  /** the short code a client quotes, when the meeting names one (BERG-M0007). */
  ref: string | null
  title: string
  /** which client it is with. Null = an internal meeting of our own. */
  accountId: string | null
  accountName: string | null
  /** WHICH SYSTEM IT WAS ABOUT, and the app's name so a row can say it without a
   * second lookup. Nullable: plenty of meetings are about the account rather
   * than one of its systems, and the first kickoff call is one of them. */
  appId: string | null
  appName: string | null
  /** why we meet, out of the settled taxonomy under Delivery method. */
  purposeId: string | null
  purposeName: string | null
  /** what we mean to talk about, and what was decided. The two fields no other
   * record in the app has anywhere to put. */
  agenda: string | null
  notes: string | null
  location: string | null
  /** WHEN IT IS, AND THEREFORE WHETHER IT HAS HAPPENED. There is no separate
   * status: this against the clock is the answer, and it is the only one that
   * cannot go stale. */
  startsAt: string
  endsAt: string | null
  /** the Google Calendar entry this meeting mirrors, and the link that opens it
   * in Google's own web app. Set by the sweep — nothing in this product puts an
   * entry in a calendar — and unique on the row, so one calendar event can never
   * become two meetings. */
  googleEventId: string | null
  googleEventUrl: string | null
  /* ── THE REST OF THE CALENDAR EVENT, MIRRORED ────────────────────────────────
   * Everything below is Google's fact about the same entry, copied onto the row
   * by the calendar sweep so that a meeting can SAY who was in the room, where
   * to join and what was attached — without every reader holding a connection
   * and every list costing fifty calls to Google.
   *
   * The direction is one-way, and now it is one-way in BOTH senses: nothing in
   * this product writes to a calendar at all, so Google's calendar is the source
   * and every column below is a copy of it. `googleSyncedAt` says when that copy
   * was last true, which is the honest thing a mirror can offer. */
  /** the join link — Meet, or whatever conferencing system is on the entry. */
  googleJoinUrl: string | null
  /** who called the meeting. Often not on the guest list at all. */
  googleOrganizer: string | null
  /** Google's own word: `confirmed`, `tentative` or `cancelled`. */
  googleStatus: string | null
  /** the IANA zone the entry is written in — an hour is not a fact without it. */
  googleTimeZone: string | null
  /** the repeat rule as Google states it (`RRULE:FREQ=WEEKLY;BYDAY=MO`). */
  googleRecurrence: string | null
  googleGuests: MeetingGuest[]
  googleAttachments: MeetingAttachment[]
  /** when the mirror above was last brought into step with Google. */
  googleSyncedAt: string | null
  /** TRUE when this row was read IN off somebody's calendar rather than typed here
   * and pushed out. It decides what a re-sync may overwrite: Google owns the
   * words of a row it authored, kwapso owns the words of a row it authored, and
   * the notes belong to a person either way. */
  fromCalendar: boolean
  /** WHICH TRANSCRIPT WAS READ, and WHEN (CHECKLIST 9.2 + 9.4). The timestamp is
   * the idempotence predicate as much as it is a fact: reading a transcript
   * ticks the meeting held and writes a work log for every one of OUR people who
   * was in the room, and both of those must happen exactly once. */
  transcriptFileId: string | null
  transcriptCapturedAt: string | null
  /** the document itself, in Google — so "read the transcript" has somewhere to
   * go on any screen, whoever is looking. */
  transcriptUrl: string | null
  /** WHICH OF THE THREE HUNTS FOUND IT: `attachment` (Google put it on the
   * calendar entry itself), `drive` (a document in a folder somebody shared) or
   * `mail` (a notice from Google naming the document). They do not prove the
   * same thing — the first is a fact and the other two are matches — so the
   * screen says which. Null until one is captured. */
  transcriptFoundBy: string | null
  /** WHEN THE WORDS BECAME ANSWERABLE — null until the knowledge sweep has
   * indexed this meeting. Distinct from `transcriptCapturedAt`, which only says
   * the transcript was fetched from Google: for a window between the two, the
   * meeting HAS its transcript and asking the knowledge base about it still
   * finds nothing. That gap was invisible on every screen. */
  knowledgeIndexedAt: string | null
  /* THE WORDS THEMSELVES ARE NOT HERE, and that is deliberate. A page of
   * meetings is fifty; a transcript is up to a megabyte. Putting one on
   * the other would make the list read the heaviest response in the app to show
   * a column nobody scrolls. The text has its own door
   * (`GET /api/content/meetings/transcript`), read once, by the one screen that
   * displays it. */
  /** THE GOOGLE SERIES this entry belongs to, when it is one of a repeating set
   * (9.7). Null on a one-off. */
  recurringEventId: string | null
  active: boolean
  createdAt: string
  creatorName: string | null
  updatedAt: string | null
  editorName: string | null
}

/* ─────────────────────── THE AGENCY'S OWN HOUSEKEEPING ──────────────────────
 * Four modules carrying the seven legacy tables that describe how the agency
 * runs ITSELF. Every one of these shapes has the same three closing fields —
 * `active`, the creator and the editor — because they are all the same kind of
 * record: something a member of the agency wrote down about the agency, which is
 * retired rather than deleted and whose history is worth reading.
 *
 * None of them carries an `accountId`. That is not an omission: these rows
 * belong to no client, so there is nothing for the account fence to fence, and
 * every door on all three refuses a client login outright instead (R21).
 * ────────────────────────────────────────────────────────────────────────── */

/** One piece of the agency's brand material — the legacy `branding` table. */
export type BrandAsset = {
  id: string
  name: string
  category: string | null
  description: string | null
  /** an object we host (/media/internal/…) or a link somewhere else. */
  fileUrl: string | null
  /** `#RRGGBB`, for an asset that IS a colour rather than a file of one. A brand
   * colour was 24 links to flat rectangles drawn by someone else's website until
   * 0043 — nine of them at a domain one letter off the one we meant. The value
   * was in the URL the whole time. */
  colorHex: string | null
  active: boolean
  createdAt: string
  creatorName: string | null
  updatedAt: string | null
  editorName: string | null
}

/** Why the agency meets — the legacy `purposes` table. The one legacy lookup
 * that could not become a dropdown value, because it carries a department. */
export type MeetingPurpose = {
  id: string
  name: string
  /** pick-or-created into the "Department" dropdown group. */
  department: string | null
  description: string | null
  active: boolean
  createdAt: string
  creatorName: string | null
  updatedAt: string | null
  editorName: string | null
}

/** The person behind a member row: how they work and what they are like. Visible
 * to the team, never to a client — there is no portal door on this module. */
export type StaffProfile = {
  id: string
  /** the GLOBAL user id (members live in the core database). */
  userId: string
  headline: string | null
  personalityType: string | null
  strengths: string | null
  weaknesses: string | null
  roleModels: string | null
  about: string | null
  photoUrl: string | null
  active: boolean
  createdAt: string
  creatorName: string | null
  updatedAt: string | null
  editorName: string | null
}

/** A credential a member holds — the legacy `certificates` table. */
export type StaffCertificate = {
  id: string
  userId: string
  title: string
  issuer: string | null
  /** the day it was granted / the day it lapses (YYYY-MM-DD), either may be null. */
  issuedOn: string | null
  expiresOn: string | null
  fileUrl: string | null
  active: boolean
  createdAt: string
  creatorName: string | null
  updatedAt: string | null
  editorName: string | null
}

// ── GOOGLE, CONNECTED ONE PERSON AT A TIME ───────────────────────────────────
// Four services, one shape. Nothing here ever carries a token: the tokens live
// encrypted in the team database and are read by exactly one file
// (workers/content/src/lib/google.ts). A type that COULD hold one would
// eventually hold one, on a wire, in a log, in somebody's browser devtools.

/** The four Google services a person may connect, each asked for separately. */
export const GOOGLE_SERVICES = ["drive", "gmail", "calendar", "chat"] as const
export type GoogleService = (typeof GOOGLE_SERVICES)[number]

/** The two services whose material is reached through SHARED sources — Drive
 * folders and Chat spaces. Sharing is the act: nothing in a Drive or a Chat is
 * reachable until somebody hands it over, and what they hand over carries a
 * shelf and a client with it. */
const GOOGLE_NAMED_SERVICES = ["drive", "chat"] as const
export type GoogleNamedService = (typeof GOOGLE_NAMED_SERVICES)[number]

/** The two services that are reached WHOLESALE unless somebody narrows them —
 * the mailbox and the calendar. There is nothing to hand over here: a person
 * connects Gmail and every message is in reach, connects Calendar and their own
 * calendar is. So the act on these two is the opposite one — SCOPE, which says
 * which containers may be read and leaves the rest alone. */
export const GOOGLE_SCOPED_SERVICES = ["gmail", "calendar"] as const
export type GoogleScopedService = (typeof GOOGLE_SCOPED_SERVICES)[number]

/** HOW MUCH OF A CONNECTION KWAPSO MAY READ.
 *
 * 'everything' is the default and is what every connection did before scope
 * existed. 'only' means the containers this person named and nothing else — and
 * 'only' with nothing named means NOTHING, which is the safe direction and the
 * whole reason this is a mode rather than an empty list. Without it, switching
 * off a last named label would hand somebody's whole mailbox back through a
 * gesture that reads as a narrowing. */
export const GOOGLE_SCOPE_MODES = ["everything", "only"] as const
export type GoogleScopeMode = (typeof GOOGLE_SCOPE_MODES)[number]

/** GOOGLE'S OWN WORDS for the kinds of thing that sit in a calendar, passed
 * straight to events.list as repeated `eventTypes` — so a kind left out is never
 * fetched rather than fetched and dropped. An empty allow-list means every kind,
 * which is the untouched state and the only way to spell it. */
export const GOOGLE_EVENT_TYPES = [
  "default",
  "outOfOffice",
  "focusTime",
  "workingLocation",
  "birthday",
  "fromGmail",
] as const
export type GoogleEventType = (typeof GOOGLE_EVENT_TYPES)[number]

/** Who may read what you shared. Declared at the moment you share it, shown on
 * the row afterwards, and the only thing that decides whether a colleague's
 * question can be answered from your material. */
export const GOOGLE_SHELVES = ["private", "team"] as const
export type GoogleShelf = (typeof GOOGLE_SHELVES)[number]

/** One person's link to one Google service, as a screen sees it. */
export type GoogleConnection = {
  id: string
  /** the GLOBAL user id — a connection belongs to a person, never to a team. */
  userId: string
  service: GoogleService
  /** which Google account this is, so a person with two can tell them apart. */
  googleEmail: string
  /** what Google actually granted, space-separated, exactly as it said it. A
   * person who unticked a box at the consent screen has a connection that works
   * for less than we asked for, and the screen has to be able to say so. */
  grantedScopes: string
  /** THE OTHER DIRECTION, and the harder one to notice: what Google granted that
   * this app never asked for.
   *
   * A grant at Google is an additive SET per OAuth client, so narrowing a scope
   * in our own code changes nothing about a person who already approved the
   * wider one — their next connect returns the old power and the app looks
   * fixed. Computed server-side against the request itself
   * (`unrequestedScopes`), never in the browser, and normally empty. When it is
   * not, the settings card says so plainly and the fix is to disconnect (which
   * revokes at Google) and connect again. */
  extraScopes: string[]
  /** AND WHAT THIS CONNECTION IS SHORT OF — the same subtraction the other way.
   *
   * A grant is only ever widened by CONSENT, so a scope added to the app after
   * somebody connected leaves them quietly unable to do the thing it was added
   * for, and the refusal they get names a status code rather than a cause. Live
   * on the owner's own account (CHECKLIST 14.5): `gmail.modify` post-dated his
   * Gmail connection, so filing a message under a label was "blocked on you"
   * with no screen anywhere saying what to do. Same fix as `extraScopes` —
   * disconnect, connect again — which is why they sit side by side. */
  missingScopes: string[]
  /** the last time we used it, and the last thing that went wrong if anything
   * did (an expired grant, a revoked account). Both are how a person finds out
   * their connection stopped working without waiting for an answer to be wrong. */
  lastUsedAt: string | null
  lastError: string | null
  /** HOW MUCH OF IT KWAPSO MAY READ. Meaningful on Gmail and Calendar, where
   * connecting alone puts everything in reach; Drive and Chat are already
   * narrowed by what somebody chose to share, so this stays 'everything' on
   * them and no screen offers to change it. */
  scopeMode: GoogleScopeMode
  /** WHICH KINDS OF EVENT, on a calendar connection. Empty means every kind. */
  scopeEventTypes: GoogleEventType[]
  active: boolean
  createdAt: string
  creatorName: string | null
  updatedAt: string | null
  editorName: string | null
}

/** WHAT WAS SHARED. Two of these are Drive, and the difference between them is
 * the owner's own question — "In Drive, why is it that it's only folder-wise?
 * What if it had to be file-wise, or does that file have to be in a folder?" It
 * did not have to. A folder is a place to look inside; a file is the thing
 * itself, and sharing one no longer means sharing everything filed beside it.
 *
 * A Chat share is always a space, which is why this is one word rather than a
 * boolean on the Drive rows: three shapes, three names, and no row that has to
 * be read together with its service to know what it is. */
const GOOGLE_SHARE_KINDS = ["folder", "file", "space"] as const

/** AND THE TWO A PERSON SCOPES TO rather than shares. A calendar and a Gmail
 * label are containers in the same sense a folder is — a place the read runs
 * against — but nobody hands one over: they exist in reach already, and naming
 * one is how somebody says "this, and not the rest". Same table, same audit,
 * same switch; a different verb on the screen. */
export const GOOGLE_SCOPE_KINDS = ["calendar", "label"] as const

/** Every kind of container a `google_sources` row can be. */
export const GOOGLE_SOURCE_KINDS = [...GOOGLE_SHARE_KINDS, ...GOOGLE_SCOPE_KINDS] as const
export type GoogleSourceKind = (typeof GOOGLE_SOURCE_KINDS)[number]

/** A Drive folder, a single Drive file, a Chat space one person shared — or a
 * calendar or Gmail label they scoped kwapso to. */
export type GoogleSource = {
  id: string
  connectionId: string
  userId: string
  service: GoogleService
  /** Google's own id for it — a folder id, a `spaces/AAAA…` space name, a
   * calendar id, or a Gmail label id. */
  externalId: string
  name: string
  shelf: GoogleShelf
  kind: GoogleSourceKind
  /** WHICH CLIENT this folder or space is about — the compartment everything
   * inside it is filed under when the knowledge base reads it. Null means the
   * agency's own, exactly as it does on a knowledge source. Asked at the moment
   * of naming, beside the shelf: both questions are about where the material
   * ends up, and neither can be inferred from the material itself. */
  accountId: string | null
  accountName: string | null
  active: boolean
  createdAt: string
  creatorName: string | null
  updatedAt: string | null
  editorName: string | null
}

/** ONE DRIVE FILE, AS A SCREEN SEES IT — the metadata that makes a list of
 * documents look like documents rather than like a list of strings.
 *
 * `iconUrl` is Google's own small type icon (the Docs blue, the Sheets green): a
 * static, unauthenticated, cacheable link, so it goes straight into a page.
 * `hasThumbnail` is the opposite kind of fact and is deliberately a boolean —
 * Google's preview link is authenticated and expires, so the ADDRESS never
 * leaves the worker and a screen asks our own door for the bytes instead
 * (`googleDriveThumbnailUrl`). */
export type DriveFileRow = {
  id: string
  name: string
  mimeType: string
  modifiedTime: string | null
  webViewLink: string | null
  /** which named folder it came out of, or "" when the FILE itself was named. */
  folderId: string
  iconUrl: string | null
  hasThumbnail: boolean
  ownerName: string
  /** bytes, when Google states one. A Google Doc has no size in the ordinary
   * sense, so this is null more often than not. */
  sizeBytes: number | null
}

/** One thing read out of Google, in the shape the retrieval lane wants it. See
 * workers/content/src/lib/google-read.ts for where that lane plugs in. */
export type GoogleItem = {
  service: GoogleService
  /** the kwapso source row it came through, when it came through one. */
  sourceId: string | null
  externalId: string
  title: string
  /** a link a person can click to open it where it actually lives. */
  url: string | null
  /** the readable text, when the caller asked for it (a list read leaves it ""). */
  text: string
  updatedAt: string | null
  /** who may read it — carried WITH the item, so nothing downstream has to go
   * back and ask. A `private` item may only ever be shown to its owner. */
  shelf: GoogleShelf
  ownerUserId: string
  /** WHOSE MATERIAL IT IS — the client's, or nobody's. Carried on the item for
   * the same reason the shelf is: the thing that knows which account a mail or a
   * folder belongs to is the read that fetched it (the contact it was with, the
   * folder it came out of), and asking again downstream would be guessing at
   * text instead of reading a decision. Null = the agency's own compartment. */
  accountId: string | null
  /** TRUE WHEN NO PERSON EVER SPOKE IN IT — every voice was an app. Chat only,
   * and absent (undefined) on every other service, which read as "a person was
   * involved" and is the safe default for a kind that cannot tell.
   *
   * Carried WITH the item for exactly the reason the shelf and the account are:
   * the thing that knows whether a human was in a conversation is the read that
   * fetched the messages, and re-deciding it downstream would mean reading the
   * TEXT — which is the one thing that must never decide this (lib/knowledge-google.ts,
   * the chat kind's `retired`). */
  appOnly?: boolean
  /** GMAIL ONLY — the ids of every message this THREAD is made of, oldest
   * first. BUILD-5 §2: "mail thread = source, message = piece." A mail
   * item's `text` is unhydrated ("") from the list read same as any other
   * service; `hydrateText` reads every one of these ids' full bodies and
   * reassembles the thread with `chunkMail`. Only the ids Gmail's list read
   * gave a REAL thread id to land here — a message the known-id skip already
   * has on file comes back with none (google-api.ts's `knownPlaceholder`),
   * so it is missing from an existing thread's list rather than re-fetched
   * (`google-read.ts`'s `mailThreads` says why, and what it costs). Absent
   * on every other service. */
  threadMessageIds?: string[]
}
