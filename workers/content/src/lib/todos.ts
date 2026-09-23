// TO-DOS — something we are waiting on the CLIENT for (.plans/BUILD-1 §2).
//
// This is the ONE part of the work engine a client login can write to, and the
// only file in it that carries an account fence rather than a flat refusal. The
// difference is the whole design: a story is our work and a client sees a count
// of it; a to-do is aimed AT them, sits in their portal with a due date, and they
// complete it themselves and upload a file against it (SCOPE ch.06 — two of the
// six things a contact can do).
//
// IT IS A SEPARATE TABLE FROM `tasks` AND A SEPARATE FILE FROM lib/tasks.ts, for
// the reason the two rate cards are separate: same shape, opposite audiences. A
// list of the agency's internal chores rendered on a client's screen is one
// forgotten `WHERE kind = 'todo'` away in the one-table version, and no distance
// away at all in this one — the internal chores are not in the table this file
// can name.
//
// NO WORK LOG EVER ATTACHES TO ONE. Enforced where time is written
// (WORK_LOG_TARGETS in lib/work-logs.ts) rather than here, because that is the
// door somebody would have to get past.

import { accountScopeClause, appScopeClause, type AccountScope } from "@shared/workers/account-scope"
import { logActivity, type Actor } from "@shared/workers/activity"
import { d1ExecScript, d1Query, likeLiteral, sqlString, type D1Rest } from "@shared/workers/d1-rest"
import { ulid } from "@shared/workers/id"
import { GuardError, type MemberGuard } from "@shared/workers/gating"
import { LIST_HARD_CAP } from "@shared/workers/limits"
import { countCollectionWith, reportedTotal } from "@shared/workers/count"
import { decodeCursor, keysetAfter, PAGE_SIZE, toPage, type Page } from "@shared/workers/paging"
import { orderBy, resolveOrdering, type Ordering, type SortMenu } from "@shared/workers/sorting"
import { optionalText, TEXT_LIMITS } from "@shared/workers/validate"
import type { Todo, TodoViewName } from "@shared/types"

import { nextTeamRef, refAliasMatchSql, TEAM_REF_KINDS, TEAM_REF_TABLES } from "@shared/workers/refs"
import { accountArchivedClause, ticketArchivedClause } from "./help"

type TodoRow = {
  id: string
  ref: string | null
  title: string
  detail: string | null
  due_on: string | null
  completed_at: string | null
  completer_name: string | null
  /** 1 when the completer holds a portal login — see TODO_COLS. */
  completer_is_client: number
  file_url: string | null
  file_name: string | null
  cancelled_at: string | null
  account_id: string
  account_name: string | null
  /** THE ACCOUNT'S OWN LOGO (R35) — see `Todo.accountLogoUrl`'s own doc,
   * shared/types.ts. Arrived 15 Sep 2026 with the Inputs screen; the same
   * join `tasks.ts`'s own `TASK_COLS` already reads. */
  account_logo_url: string | null
  /** WHICH SYSTEM (client ruling, 17 Sep 2026) — optional, unfenced to the
   * account (see `appForTodo`'s own doc for why), the same shape
   * `help.app_id`/`tasks.app_id` already carry. */
  app_id: string | null
  app_name: string | null
  app_logo_url: string | null
  /** WHO AT THE CLIENT (client ruling, 17 Sep 2026) — an `accounts` row of
   * type `individual`, the same shape `help.raised_by_contact_id` carries. */
  assigned_contact_id: string | null
  assigned_contact_name: string | null
  ticket_id: string | null
  created_at: string
}

const TODO_COLS = `t.id, t.ref, t.title, t.detail, t.due_on, t.completed_at, t.completer_name,
  -- R54: the paragraph below says this name is one of TWO populations — the
  -- client's own person, or a staff member doing it on the phone with them.
  -- Both keep their name; only ours is shortened to a first name on screen,
  -- and this is the only thing that can tell the screen which it is holding.
  EXISTS (SELECT 1 FROM portal_users pu WHERE pu.user_id = t.completer_id) AS completer_is_client,
  t.file_url, t.file_name, t.cancelled_at, t.account_id, t.app_id, t.assigned_contact_id, t.ticket_id, t.created_at,
  (SELECT a.name FROM accounts a WHERE a.id = t.account_id) AS account_name,
  (SELECT a.logo_url FROM accounts a WHERE a.id = t.account_id) AS account_logo_url,
  (SELECT p.name FROM apps p WHERE p.id = t.app_id) AS app_name,
  (SELECT p.logo_url FROM apps p WHERE p.id = t.app_id) AS app_logo_url,
  (SELECT c.name FROM accounts c WHERE c.id = t.assigned_contact_id) AS assigned_contact_name`

function toTodo(r: TodoRow): Todo {
  return {
    id: r.id,
    ref: r.ref,
    title: r.title,
    detail: r.detail,
    dueOn: r.due_on,
    completedAt: r.completed_at,
    // WHO COMPLETED IT is a name we are always willing to print, unlike every
    // other name in this build — because the only people who complete a to-do are
    // the client's own (it is their job) or a staff member doing it on the phone
    // with them. Neither is a disclosure about who is doing the WORK.
    completedByName: r.completer_name,
    completedByIsClient: r.completer_is_client === 1,
    fileUrl: r.file_url,
    fileName: r.file_name,
    cancelled: r.cancelled_at != null,
    accountId: r.account_id,
    accountName: r.account_name,
    accountLogoUrl: r.account_logo_url,
    appId: r.app_id,
    appName: r.app_name,
    appLogoUrl: r.app_logo_url,
    assignedContactId: r.assigned_contact_id,
    assignedContactName: r.assigned_contact_name,
    ticketId: r.ticket_id,
    createdAt: r.created_at,
  }
}

/** THE FENCE, and it is the ordinary one: the account the to-do is FOR. Same
 * clause as the accounts list and the ticket list, reading a column. Staff get no
 * clause; a client login gets the company they are standing in and everything
 * nested beneath it.
 *
 * `scope` is REQUIRED rather than defaulted, for the reason written over
 * `ticketFence`: a fence that defaults to "not a client" is a fence that fails
 * open the day somebody writes a new reader. */
function todoFence(scope: AccountScope): { sql: string; params: string[] } {
  return accountScopeClause(scope, "t.account_id")
}

/** WHAT EACH VIEW IS ORDERED BY — and the reason this file pages at all.
 *
 * The old read ordered by FOUR terms: `(completed_at IS NOT NULL), due_on IS
 * NULL, due_on, id DESC`. `keysetAfter` takes ONE expression, so that looks
 * un-page-able and is not — it COLLAPSES, because the view fixes the first term
 * and the middle two are a single value:
 *
 *   • OPEN — every row has `completed_at IS NULL`, so term one is a constant.
 *     What is left is `COALESCE(due_on, '9999-12-31')` ascending, and that ONE
 *     expression IS "no date last, then soonest first": the nulls-last flag and
 *     the date are the same key, not two.
 *   • DONE — `completed_at` descending, newest first. Naturally single, and the
 *     column is NOT NULL for every row this view can return.
 *
 * TWO ORDERINGS MEANS TWO SIGNATURES, which is the property that matters more
 * than either sort. `resolveOrdering` stamps `<name>:<dir>` into every cursor and
 * `decodeCursor` refuses one minted under a different ordering (400, the same
 * refusal a malformed cursor gets). Without that, a cursor from the open list
 * handed to the done list would not fail — it would return a page that reads as
 * an answer while skipping an arbitrary slice of the collection, which is the
 * failure mode that ships. */
export const TODO_SORTS: SortMenu<Todo> = {
  due: {
    expr: "COALESCE(t.due_on, '9999-12-31')",
    dir: "asc",
    // The SAME value, read back off a row — the sentinel included, or the cursor
    // would be minted from a null the ORDER BY never sorted on.
    key: (todo) => todo.dueOn ?? "9999-12-31",
  },
  completed: { expr: "t.completed_at", dir: "desc", key: (todo) => todo.completedAt },
  // WAITING LONGEST — the Inputs screen's own second toolbar sort (client
  // ruling, 15 Sep 2026, "the column that flags how long we are waiting" plus
  // the coordinator's own I1 mock, "Days waiting"). Orders by when the request
  // was RAISED, oldest first, never by when it is due — the two questions a
  // to-do can be read by, and this is the one `due` cannot answer.
  waiting: { expr: "t.created_at", dir: "asc", key: (todo) => todo.createdAt },
}

/** THE DEFAULT ORDERING FOR A VIEW — one place, so the list, the keyset
 * predicate and the minted cursor cannot disagree about which of the three
 * this is. `received` reads the SAME ordering `done` always has (newest
 * completion first); the caller may still ask for a different one (the
 * Inputs screen's own toolbar sort) — this is only what a bare `?view=`
 * lands on unasked, exactly the shape `resolveOrdering`'s own `fallback`
 * argument is for (see `workers/content/src/routes/stories.ts` for the same
 * pattern: the ROUTE resolves the caller's `sort`/`dir` against this
 * fallback and hands the settled `Ordering` down, never the view alone). */
function defaultOrderingName(view: TodoViewName): string {
  return view === "done" || view === "received" ? "completed" : "due"
}

type TodoFilter = {
  accountId?: string
  /** THE ACCOUNT'S OWN MANAGER — the Inputs screen's second facet, and the
   * fence `all_inputs:read` narrows to when a caller does not hold it (own
   * accounts only, `account_manager_user_id`). A join rather than a second
   * table: the manager is a fact about the ACCOUNT, so a to-do never carries
   * one of its own. */
  accountManagerId?: string
  view?: TodoViewName
  q?: string
}

/** TODAY, as the date half of an ISO moment — the boundary `overdue`/`waiting`
 * are cut on. Same UTC reasoning `workers/content/src/lib/tasks.ts`'s own
 * `todayIso` carries: a worker has no reader's clock, and the honest string
 * comparison ('2026-08-17T00:00:00Z' < '2026-08-17' is false) is what makes
 * `due_on < ?` exact against the stored ISO moment. */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

/** WHAT EACH OF THE FIVE VIEWS ASKS FOR, as a WHERE fragment — written once so
 * the list and the counts beside it can never be asked different questions
 * (R16), the same shape `tasks.ts`'s own `viewClause` takes.
 *
 * `waiting` and `overdue` PARTITION the open pile by due date — every open
 * row lands in exactly one of the two, whether or not it has a date at all
 * (an undated one is never overdue). `received` reads the identical
 * predicate `done` always has; it is a second WORD for the same pile, not a
 * third one, because completing a to-do is one act however the screen that
 * asked for the list spells its tab. */
function todoViewClause(view: TodoViewName): { sql: string; dated: boolean } {
  if (view === "done" || view === "received") return { sql: "t.completed_at IS NOT NULL", dated: false }
  if (view === "overdue")
    return { sql: "t.completed_at IS NULL AND t.due_on IS NOT NULL AND t.due_on < ?", dated: true }
  if (view === "waiting")
    return { sql: "t.completed_at IS NULL AND (t.due_on IS NULL OR t.due_on >= ?)", dated: true }
  return { sql: "t.completed_at IS NULL", dated: false } // "open"
}

/** The SAME search clause `whereFor` and `countTodos` both fold in — a to-do has
 * no backlog-sized table of its own to page a search over, but it is nested
 * inside an account's or a sprint's own tab exactly like the collections that
 * do, and a toolbar with no way to narrow forty outstanding requests is the gap
 * this whole file's asks-the-door design was written to close. Same shape as
 * `storyWhere`'s own search clause: the reference and the words somebody would
 * recognise the request by, ESCAPED because a search box is not a pattern box. */
function todoSearchClause(q: string | undefined): { sql: string | null; params: string[] } {
  if (!q) return { sql: null, params: [] }
  const needle = `%${likeLiteral(q.toLowerCase())}%`
  return {
    sql: `(LOWER(t.title) LIKE ? ESCAPE '\\' OR LOWER(COALESCE(t.ref, '')) LIKE ? ESCAPE '\\' OR LOWER(COALESCE(t.detail, '')) LIKE ? ESCAPE '\\'
       OR ${refAliasMatchSql(TEAM_REF_TABLES.input, "t.id")})`,
    params: [needle, needle, needle, needle],
  }
}

/** ARCHIVED MEANS INVISIBLE, AND IT REACHES DOWN (R112) — Aurora, 23 Sep 2026:
 * "validated - this for everything when archived, not only accounts."
 *
 * A to-do hangs off both archivable records: its CLIENT (`todos.account_id`) and,
 * when somebody raised it off one, its TICKET (`todos.ticket_id`). Both are
 * asked, both short-circuit on NULL — the agency's own inputs carry neither —
 * and neither reads the other's column. `t.cancelled_at` is a THIRD, unrelated
 * fact about the to-do itself (somebody withdrew it) and stays exactly where it
 * was: an archive is not a cancellation and the two must never be merged.
 *
 * Said once so the list and both counts cannot drift (R16). */
function todoArchivedClauses(alias = "t"): string[] {
  return [accountArchivedClause(alias), ticketArchivedClause(alias)]
}

/** The WHERE both the page and its counts are built from — the fence, the
 * withdrawn, the client, and which pile. One function, because R16 is not "an
 * exact count" but a count of the SAME collection the list showed. */
function whereFor(scope: AccountScope, filter: TodoFilter): { sql: string; params: string[] } {
  const fence = todoFence(scope)
  const view = todoViewClause(filter.view ?? "open")
  const clauses = ["t.cancelled_at IS NULL", ...todoArchivedClauses(), ...(fence.sql ? [fence.sql] : []), view.sql]
  const params: string[] = [...fence.params, ...(view.dated ? [todayIso()] : [])]
  if (filter.accountId) {
    clauses.push("t.account_id = ?")
    params.push(filter.accountId)
  }
  // THE ACCOUNT'S OWN MANAGER — an EXISTS over `accounts` rather than a JOIN,
  // so a to-do's own SELECT list never has to carry a second table's columns
  // for the one narrow question this filter asks.
  if (filter.accountManagerId) {
    clauses.push("EXISTS (SELECT 1 FROM accounts a WHERE a.id = t.account_id AND a.account_manager_user_id = ?)")
    params.push(filter.accountManagerId)
  }
  const search = todoSearchClause(filter.q)
  if (search.sql) {
    clauses.push(search.sql)
    params.push(...search.params)
  }
  return { sql: clauses.join(" AND "), params }
}

/** Every to-do the caller may see, ONE PAGE at a time (R14).
 *
 * IT USED TO BE BOUNDED, and the comment here used to say why: "a to-do shrinks
 * as fast as it grows". That is true of the OPEN pile and false of the completed
 * one, which accumulates for ever — and a completed to-do is the only kind that
 * can carry the document a client sent us, because `completeTodo` writes
 * `file_url` and `completed_at` in the same UPDATE. So the collection this file
 * answers about GROWS the moment the done pile is visible at all, and a hard cap
 * would eventually be a refusal to show somebody the invoice they were sent. */
export async function listTodos(
  cfg: D1Rest,
  guard: MemberGuard,
  scope: AccountScope,
  filter: TodoFilter,
  cursor: string | null,
  // THE CALLER'S OWN ORDERING (the Inputs screen's toolbar sort), settled
  // against `TODO_SORTS` at the ROUTE (`resolveOrdering`, the same shape
  // `stories.ts`'s own `listStories` takes) — defaulted here so the panel's
  // call site (work-panels.tsx, through `getTodos`, which always resolves
  // one before calling down) and any other caller that names none still
  // lands on the view's own default order.
  ordering: Ordering<Todo> = resolveOrdering(TODO_SORTS, defaultOrderingName(filter.view ?? "open"), undefined, undefined)
): Promise<Page<Todo>> {
  const base = whereFor(scope, filter)
  // One ordering feeds the ORDER BY, the keyset predicate and the next cursor.
  const after = keysetAfter(decodeCursor(cursor, ordering.sig), ordering.expr, ordering.dir, "t.id")
  const rows = await d1Query<TodoRow>(
    cfg,
    guard.databaseId,
    `SELECT ${TODO_COLS} FROM todos t
      WHERE ${base.sql}${after.sql ? ` AND ${after.sql}` : ""}
      ${orderBy(ordering, "t.id")} LIMIT ${PAGE_SIZE + 1}`,
    [...base.params, ...after.params]
  )
  return toPage(rows.map(toTodo), PAGE_SIZE, (todo) => [ordering.key(todo), todo.id], ordering.sig)
}

/** WHAT A TO-DO COLLECTION'S THREE NUMBERS ARE — open, done, and both — out of
 * ONE read (R16, and the tasks door's reasoning one table along).
 *
 * Three because three badges ask: the panel's two view tabs each count their own
 * pile, and the record tab ABOVE them counts what the panel reveals, which is
 * both. A tab badge counting the open ones over a list showing the done ones is
 * R16's failure in its quietest form, and it is one forgotten argument away in
 * the version where each badge asks its own question.
 *
 * BOUNDED (R16 amended): counted exactly to TOTAL_COUNT_CAP, then "at least".
 * `open` and `done` are DISPLAY tallies riding beside the display count, which is
 * the only thing a SUM over a bounded set may ever be.
 *
 * THREE MORE, 15 SEP 2026 — the Inputs screen's own tab badges. `waiting` and
 * `overdue` split `open` by due date; `received` IS `done` under its tab's own
 * word (`todoViewClause`'s own note says why it is not a fourth pile). Kept as
 * their own fields rather than an alias so a reader of `todoPage`'s sidecar
 * never has to know the two are the same number by construction. */
export type TodoCounts = {
  open: number
  done: number
  all: number
  waiting: number
  overdue: number
  received: number
}

export async function countTodos(
  cfg: D1Rest,
  guard: MemberGuard,
  scope: AccountScope,
  /** `q` is OPTIONAL and answers a different question than the other two
   * fields: called without it, this is the tab badges' own unfiltered pile
   * (R16 — a search must never move the number on a tab it did not narrow).
   * Called WITH it (the paged panel's own search total), it counts the SAME
   * question `listTodos` is answering, over both piles at once — a search
   * asked while the Open tab is open still knows the Done pile's match, cheaply,
   * from the one query. `accountManagerId` is the Inputs screen's own fence —
   * see `TodoFilter`'s own doc on why it is a join and not a second table. */
  filter: { accountId?: string; accountManagerId?: string; q?: string }
): Promise<TodoCounts> {
  // The list's own WHERE minus the pile — the counts have to see both.
  const fence = todoFence(scope)
  // R112 + R16: the same two archive clauses `whereFor` rides, so each pile's
  // badge counts the rows the list can actually show.
  const clauses = ["t.cancelled_at IS NULL", ...todoArchivedClauses(), ...(fence.sql ? [fence.sql] : [])]
  const params: string[] = [...fence.params]
  if (filter.accountId) {
    clauses.push("t.account_id = ?")
    params.push(filter.accountId)
  }
  if (filter.accountManagerId) {
    clauses.push("EXISTS (SELECT 1 FROM accounts a WHERE a.id = t.account_id AND a.account_manager_user_id = ?)")
    params.push(filter.accountManagerId)
  }
  const search = todoSearchClause(filter.q)
  if (search.sql) {
    clauses.push(search.sql)
    params.push(...search.params)
  }
  // ONE `?` AHEAD OF EVERYTHING ELSE — the SELECT list's own `is_overdue` sits
  // textually before the WHERE clause's params, so `todayIso()` binds first
  // (D1 binds positionally, in the order a `?` appears in the string).
  const row = await countCollectionWith<{ all_n: number; open_n: number | null; overdue_n: number | null }>(
    cfg,
    guard.databaseId,
    `SELECT (t.completed_at IS NULL) AS is_open,
            (t.completed_at IS NULL AND t.due_on IS NOT NULL AND t.due_on < ?) AS is_overdue
       FROM todos t WHERE ${clauses.join(" AND ")}`,
    `COUNT(*) AS all_n, SUM(is_open) AS open_n, SUM(is_overdue) AS overdue_n`,
    [todayIso(), ...params]
  )
  const all = reportedTotal(row?.all_n ?? 0)
  const open = reportedTotal(row?.open_n ?? 0)
  const overdue = reportedTotal(row?.overdue_n ?? 0)
  const done = Math.max(0, all - open)
  const waiting = Math.max(0, open - overdue)
  return { open, done, all, waiting, overdue, received: done }
}

/** One to-do the caller may see, by id — a LOOKUP, never a find over a page.
 *
 * R38's subject, and it activates the moment the list above starts paging: the
 * live layer's `fetchOne` used to pull the WHOLE list with `?view=all` and
 * `.find()` the row out of it, which resolves page one and nothing else. */
export async function getTodo(
  cfg: D1Rest,
  guard: MemberGuard,
  scope: AccountScope,
  id: string
): Promise<Todo | null> {
  const row = await todoRow(cfg, guard, scope, id)
  return row ? toTodo(row) : null
}

/** The row itself, fenced — what the writes need (the ref and the account for
 * their history line) and what the two readers above are built from. */
async function todoRow(
  cfg: D1Rest,
  guard: MemberGuard,
  scope: AccountScope,
  id: string
): Promise<TodoRow | undefined> {
  const fence = todoFence(scope)
  const rows = await d1Query<TodoRow>(
    cfg,
    guard.databaseId,
    // R14: one row by primary key.
    `SELECT ${TODO_COLS} FROM todos t WHERE t.id = ?${fence.sql ? ` AND ${fence.sql}` : ""} LIMIT 1`,
    [id, ...fence.params]
  )
  return rows[0]
}

/** One to-do the caller may see, or a clean 404 — the shape every write resolves
 * first, so "not yours" and "does not exist" are the same sentence. */
export async function todoOrThrow(
  cfg: D1Rest,
  guard: MemberGuard,
  scope: AccountScope,
  id: string
): Promise<TodoRow> {
  const row = await todoRow(cfg, guard, scope, id)
  if (!row) throw new GuardError(404, "todo_not_found", "That to-do doesn't exist.")
  return row
}

/** WHICH SYSTEM THIS ASK IS ABOUT — optional (client ruling, 17 Sep 2026: "it
 * is optional to select an app"). Checked only for "exists and is active",
 * the same unfenced shape `appForTicket` (workers/content/src/lib/help.ts)
 * already draws: the account narrowing (`AccountAppPicker`, only offering an
 * app that belongs to the chosen account) is the PICKER's own UX, never a
 * hard fence at this door — an agency-wide app genuinely has no account, and
 * a stricter check here would refuse exactly the row that field is for. */
async function appForTodo(cfg: D1Rest, guard: MemberGuard, raw: unknown): Promise<string | null> {
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

/** WHO AT THE CLIENT (client ruling, 17 Sep 2026: "select who this gets
 * assigned to … filter the contacts of this account"). The identical check
 * `contactForTicket` runs for a ticket's raised-by contact: the account
 * itself, or a live `account_links` row to it — never a contact of a
 * DIFFERENT company, and never a staff member (this table has no such
 * population to check against). */
async function contactForTodo(
  cfg: D1Rest,
  guard: MemberGuard,
  raw: unknown,
  accountId: string
): Promise<string | null> {
  const id = optionalText(raw, "Assigned to", TEXT_LIMITS.short)
  if (!id) return null
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
  if (!rows[0]) throw new GuardError(400, "invalid_input", "That person isn't a contact at this client.")
  return rows[0].id
}

/** Ask a client for something. STAFF ONLY — the door refuses a portal caller, so
 * a client cannot write themselves a to-do (which would be a note, and notes go
 * on the ticket). */
export async function createTodo(
  cfg: D1Rest,
  guard: MemberGuard,
  actor: Actor,
  input: {
    accountId: string
    title: string
    detail?: string
    dueOn?: string
    ticketId?: string
    /** raw, unvalidated — checked inside against `apps` (`appForTodo`). */
    appId?: unknown
    /** raw, unvalidated — checked inside against this same `accountId`'s own
     * contacts (`contactForTodo`). */
    assignedContactId?: unknown
  }
): Promise<{ id: string; ref: string | null; accountId: string }> {
  const accounts = await d1Query<{ id: string }>(
    cfg,
    guard.databaseId,
    `SELECT id FROM accounts WHERE id = ? AND deactivated_at IS NULL LIMIT 1`,
    [input.accountId]
  )
  if (!accounts[0]) throw new GuardError(400, "invalid_input", "That client isn't on your books any more.")

  const [appId, assignedContactId] = await Promise.all([
    appForTodo(cfg, guard, input.appId),
    contactForTodo(cfg, guard, input.assignedContactId, input.accountId),
  ])

  const id = ulid()
  const now = new Date().toISOString()
  // TEAM-WIDE, kind `I` (the client's own 2026-08-31 follow-up ruling, naming
  // Input where the first pass had left it alone) — the same door every other
  // record's reference mints through. See shared/workers/refs.ts.
  const ref = await nextTeamRef(cfg, guard, TEAM_REF_KINDS.input)
  await d1ExecScript(
    cfg,
    guard.databaseId,
    `INSERT INTO todos (id, ref, account_id, app_id, assigned_contact_id, ticket_id, title, detail, due_on, created_at, creator_id, creator_email, creator_name)
VALUES (${sqlString(id)}, ${sqlString(ref)}, ${sqlString(input.accountId)}, ${sqlString(appId)}, ${sqlString(assignedContactId)}, ${sqlString(input.ticketId ?? null)}, ${sqlString(input.title)}, ${sqlString(input.detail ?? null)}, ${sqlString(input.dueOn ?? null)}, ${sqlString(now)}, ${sqlString(actor.id)}, ${sqlString(actor.email)}, ${sqlString(actor.name)});`
  )
  await logActivity(cfg, guard.databaseId, actor, {
    type: "To-do raised",
    description: `${actor.name} asked the client for ${ref ?? "something"}, ${input.title}`,
    relatedTable: "todos",
    relatedRowId: id,
  })
  return { id, ref, accountId: input.accountId }
}

/** COMPLETE IT — the client's own act, and the only write in this build they make
 * on a row we created. Staff may do it too: half of these are completed on the
 * phone, and refusing that would make the app disagree with the conversation.
 *
 * R17: `completed_at IS NULL` rides the UPDATE, so completing a completed to-do
 * moves zero rows, writes no second history line and pings nothing. */
export async function completeTodo(
  cfg: D1Rest,
  guard: MemberGuard,
  scope: AccountScope,
  actor: Actor,
  id: string,
  file: { url: string; name: string } | null
): Promise<{ moved: boolean; todo: Todo; accountId: string }> {
  const before = await todoOrThrow(cfg, guard, scope, id)
  const now = new Date().toISOString()
  // The write's fence carries the BARE column: an UPDATE has no alias to hang a
  // `t.` on, and a clause written for the read would be a clause the statement
  // silently rejects. Same scope, same set of accounts, one prefix apart.
  const fence = accountScopeClause(scope, "account_id")
  const changed = await d1Query<{ id: string }>(
    cfg,
    guard.databaseId,
    // The fence rides the WRITE as well as the read above — same sentence, same
    // statement, so neither can be removed while the other keeps the door honest.
    // A file is only ever ADDED here (`COALESCE(?, file_url)`): completing again
    // with nothing attached must not wipe what they already sent.
    `UPDATE todos SET completed_at = ?, completer_id = ?, completer_name = ?,
       file_url = COALESCE(?, file_url), file_name = COALESCE(?, file_name)
     WHERE id = ? AND completed_at IS NULL AND cancelled_at IS NULL${
       fence.sql ? ` AND ${fence.sql}` : ""
     } RETURNING id`,
    [now, actor.id, actor.name, file?.url ?? null, file?.name ?? null, id, ...fence.params]
  )
  const after = await todoOrThrow(cfg, guard, scope, id)
  if (!changed[0]) return { moved: false, todo: toTodo(after), accountId: before.account_id }

  await logActivity(cfg, guard.databaseId, actor, {
    type: "To-do completed",
    description: `${actor.name} completed ${before.ref ?? before.title}${file ? " and sent a file" : ""}`,
    relatedTable: "todos",
    relatedRowId: id,
  })
  return { moved: true, todo: toTodo(after), accountId: before.account_id }
}

/** WITHDRAW one — we stopped needing it. Deactivate-never-delete: the row and the
 * decision survive, it simply leaves the client's list. STAFF only; a client who
 * thinks a request is unnecessary says so on the ticket.
 *
 * R17: `cancelled_at IS NULL` rides the UPDATE. */
export async function cancelTodo(
  cfg: D1Rest,
  guard: MemberGuard,
  actor: Actor,
  id: string
): Promise<{ moved: boolean; accountId: string | null }> {
  const rows = await d1Query<TodoRow>(
    cfg,
    guard.databaseId,
    `SELECT ${TODO_COLS} FROM todos t WHERE t.id = ? LIMIT 1`,
    [id]
  )
  const row = rows[0]
  if (!row) throw new GuardError(404, "todo_not_found", "That to-do doesn't exist.")
  const now = new Date().toISOString()
  const changed = await d1Query<{ id: string }>(
    cfg,
    guard.databaseId,
    `UPDATE todos SET cancelled_at = ?, canceller_id = ?, canceller_email = ?, canceller_name = ?
      WHERE id = ? AND cancelled_at IS NULL RETURNING id`,
    [now, actor.id, actor.email, actor.name, id]
  )
  if (!changed[0]) return { moved: false, accountId: row.account_id }
  await logActivity(cfg, guard.databaseId, actor, {
    type: "To-do withdrawn",
    description: `${actor.name} withdrew ${row.ref ?? row.title}, we no longer need it`,
    relatedTable: "todos",
    relatedRowId: id,
  })
  return { moved: true, accountId: row.account_id }
}

/* ─────────────── the client's view of the work they bought ──────────────── */

/** WHAT A CLIENT SEES OF A SPRINT: a named block with dates (.plans/BUILD-1 §7,
 * "sprints as a named block with dates — it is what they bought"), and how much
 * of it is finished.
 *
 * WHAT IS NOT ON THIS SHAPE, and each absence is a decision:
 *   • NO PRICE. What a client was charged is projected by the value door behind
 *     their own account's price-visibility switch (workers/tenancy). A price on
 *     this shape would be a second route to the same figure with none of that
 *     switch's reasoning attached, and money has one door on this side.
 *   • NO STORY TITLES, NO ASSIGNEES, NO DATES ON THE WORK. Two counts, exactly
 *     as a ticket carries two counts, because "which staff member is doing it"
 *     is what SCOPE ch.06 keeps off this side.
 *   • NO GOAL TEXT. It is written by us, for us, in the register colleagues use
 *     with each other. The NAME is the thing a client agreed to. */
export type ClientSprint = {
  ref: string | null
  name: string
  sprintType: string | null
  startsOn: string | null
  endsOn: string | null
  completedAt: string | null
  storyCount: number
  doneStoryCount: number
}

/** The blocks of work sold to the accounts this caller may see.
 *
 * FENCED, not refused — this is the one read of the sprint table a client login
 * makes, and it is a different SHAPE from the agency's (see ClientSprint above)
 * rather than the same rows with a flag. A shape that cannot carry a price
 * cannot leak one.
 *
 * BOUNDED (R14): a sprint is a contract, so a client has a handful. */
export async function clientSprints(
  cfg: D1Rest,
  guard: MemberGuard,
  scope: AccountScope
): Promise<ClientSprint[]> {
  const fence = accountScopeClause(scope, "sp.account_id")
  // A restricted client sees the blocks of work on THEIR systems. A sprint with
  // no app is company-wide and stays.
  const apps = appScopeClause(scope, "sp.app_id")
  const rows = await d1Query<{
    ref: string | null
    name: string
    sprint_type: string | null
    starts_on: string | null
    ends_on: string | null
    completed_at: string | null
    story_count: number
    done_story_count: number
  }>(
    cfg,
    guard.databaseId,
    // Only the columns above are SELECTed. `sold_price_cents` is not named here
    // and must never be: the shape it would land in has nowhere to put it.
    `SELECT sp.ref, sp.name, sp.sprint_type, sp.starts_on, sp.ends_on, sp.completed_at,
       (SELECT COUNT(*) FROM stories s WHERE s.sprint_id = sp.id) AS story_count,
       (SELECT COUNT(*) FROM stories s WHERE s.sprint_id = sp.id AND s.status = 'done') AS done_story_count
     FROM sprints sp
     WHERE sp.deactivated_at IS NULL${fence.sql ? ` AND ${fence.sql}` : ""}${apps.sql ? ` AND (sp.app_id IS NULL OR ${apps.sql})` : ""}
     ORDER BY sp.starts_on DESC, sp.id DESC LIMIT ${LIST_HARD_CAP}`, // R14 hard cap
    [...fence.params, ...apps.params]
  )
  return rows.map((r) => ({
    ref: r.ref,
    name: r.name,
    sprintType: r.sprint_type,
    startsOn: r.starts_on,
    endsOn: r.ends_on,
    completedAt: r.completed_at,
    storyCount: r.story_count,
    doneStoryCount: r.done_story_count,
  }))
}
