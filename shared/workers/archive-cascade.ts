// ARCHIVING CASCADES, AND THE CASCADE REMEMBERS WHO CAUSED IT.
//
// Aurora's ruling, 23-24 Sep 2026, in two messages, verbatim:
//
//   "wdym by vanish? should stay in the system, but invisible. just in case we
//    need to in the future recover it. if ticket archive - story archived as
//    well"
//   "when archiving a parent item, always archive as well the child items"
//
// The round before this one made a child of an archived parent invisible by
// FILTERING: the child's own row was untouched and a clause on every read hid
// it. That is not what she asked for. A cascaded child now carries its OWN
// archived state — invisible for the same reason anything archived is
// invisible, findable wherever archived things are found, and recoverable.
//
// ── WHY THIS IS A DECLARED EDGE SET AND NOT THE FOREIGN KEYS ────────────────
//
// Thirty-two foreign keys in this schema point at `accounts`. Cascading down
// all of them would archive every ticket a contact ever raised the moment that
// contact was archived (`help.raised_by_contact_id`), and a client's whole
// process library because one tool was retired. MOST FOREIGN KEYS ARE NOT
// OWNERSHIP, and no scan can tell the two apart: `stories.ticket_id -> help`
// and `help.raised_by_contact_id -> accounts` are the same shape in
// `pragma_foreign_key_list` and opposite answers in the product. So ownership
// is DATA here, one line per edge, and every line is a decision somebody made.
//
// ── THE FOUR RULINGS THIS TABLE ENCODES ─────────────────────────────────────
//
// Put to her as four questions on 24 Sep 2026, answered verbatim:
//
//   1 · An app is an owning parent. "yes, archiving th eparent archive the
//       child." Archiving an app archives its tickets, meetings, tasks and
//       stories. The question was put the other way round (an app is what a
//       ticket is ABOUT, the account is whose it IS) and she overruled it.
//   2 · A sprint is NOT. "no. only archiving app or account would archive
//       stories." Work outlives the phase it sat in. This does not contradict
//       her ticket ruling: a story is owned by its account, its app and its
//       ticket, and merely SITS IN a sprint.
//   3 · `work_logs` is never a target. "never archive work logs, time is logged
//       and we must always know where it went." See WORK_LOGS_ARE_NEVER_ARCHIVED.
//   4 · A contact is not an owning parent of what they raised. "no."
//       `help.raised_by_contact_id` stays a reference edge.
//
// ── TERMINATION, WHICH IS FREE ──────────────────────────────────────────────
//
// The owning graph is a DAG with exactly one self-edge,
// `accounts.parent_account_id`, and that edge is proven acyclic at the write
// door: `setAccountParent` (workers/tenancy/src/lib/accounts.ts) runs a
// `WITH RECURSIVE ancestors` check and refuses a ring at any depth, bounded by
// `MAX_ACCOUNT_DEPTH`. (`process_links.from_process_id`/`to_process_id` looks
// like a cycle and is a reference table, not ownership.)
//
// A DOOR-SIDE GUARANTEE IS NOT A RUNTIME ONE, so the walk carries its own belt
// — and it gets it for free, in SQL. Every step is
// `UPDATE … WHERE archived_at IS NULL RETURNING id`, so a row that is already
// archived returns nothing and there is nothing to recurse into. THE PREDICATE
// IS THE VISITED SET. A diamond (a story reachable both directly from its
// account and through its ticket) is visited once, and whichever path arrives
// first owns the marker. `CASCADE_ROW_CAP` is the belt on top of the belt.
//
// ── AND THE LIMIT, SAID OUT LOUD RATHER THAN BURIED ─────────────────────────
//
// D1 gives no transaction across statements, so a crash mid-cascade leaves a
// PARTIAL state. The marker is what makes that recoverable rather than corrupt:
// re-running the archive completes it, because every row already archived is
// skipped by its own predicate, and the rows that did land already name their
// cause. It is recoverable, not atomic, and that is the honest word for it.

import { d1Query, sqlString, type D1Rest } from "./d1-rest"
import { GuardError } from "./gating"
import type { Actor } from "./activity"

/** One owning edge: the parent's row archives every row of `table` whose
 * `column` points at it. */
export type CascadeEdge = { table: string; column: string }

/** THE OWNING GRAPH, keyed by the parent's own table.
 *
 * SCOPED TO THE SPINE THIS ROUND, deliberately and with the rest written down
 * rather than rediscovered later. The long tail — `client_departments`,
 * `client_roles`, `client_tools`, `app_modules`, `deliverables`,
 * `app_attachments`, `story_attachments`, `help_attachments`, `portal_users`,
 * `account_links`, `knowledge_sources` — is a second round. Two of those are
 * already answered by other means and are the least urgent: a client login for
 * an archived account is refused by the guard corridor itself
 * (`resolveAccountScope`), and an archived account's knowledge sources are
 * already retired by the ingest's own `retired` flag. */
export const ARCHIVE_CASCADE: Record<string, readonly CascadeEdge[]> = {
  // A COMPANY OWNS ITS WHOLE WORLD, including the businesses nested under it.
  accounts: [
    { table: "accounts", column: "parent_account_id" },
    { table: "apps", column: "account_id" },
    { table: "help", column: "account_id" },
    { table: "meetings", column: "account_id" },
    { table: "tasks", column: "account_id" },
    { table: "todos", column: "account_id" },
    { table: "stories", column: "account_id" },
    { table: "sprints", column: "account_id" },
    { table: "waves", column: "account_id" },
    { table: "processes", column: "account_id" },
  ],
  // AN APP OWNS WHAT WAS BUILT ON IT — her ruling 1, against the instinct the
  // question was put with.
  apps: [
    { table: "help", column: "app_id" },
    { table: "meetings", column: "app_id" },
    { table: "tasks", column: "app_id" },
    { table: "todos", column: "app_id" },
    { table: "stories", column: "app_id" },
    { table: "sprints", column: "app_id" },
    { table: "waves", column: "app_id" },
    { table: "processes", column: "app_id" },
  ],
  // A TICKET OWNS THE WORK RAISED OFF IT — her own example, verbatim: "if
  // ticket archive - story archived as well".
  help: [
    { table: "stories", column: "ticket_id" },
    { table: "todos", column: "ticket_id" },
  ],
}

/** AURORA'S RULING, 24 Sep 2026, VERBATIM: "never archive work logs, time is
 * logged and we must always know where it went."
 *
 * Written HERE, at the place that decides, rather than left to be inferred from
 * an absence in the table above — because it is a PRINCIPLE and not a
 * preference, and an absence is indistinguishable from an oversight. The record
 * of where time went must survive whatever happens to the thing it was spent
 * on: a story archived with its ticket keeps every hour logged against it, and
 * those hours go on answering "where did the week go" exactly as before.
 *
 * `work_logs` therefore carries no archive column (migration 0123 skips it) and
 * appears in no edge above, at any depth, from any parent. The constant is
 * exported so the check can assert the rule rather than re-type it, and so a
 * lane adding an edge tomorrow meets the sentence rather than guessing. */
export const WORK_LOGS_ARE_NEVER_ARCHIVED = "work_logs"

/** THE REVERSE GRAPH — for a child table, every pointer that can own it.
 *
 * Derived from `ARCHIVE_CASCADE` rather than declared a second time: two
 * spellings of one graph is two places for it to drift, and this one is only
 * ever read to answer "is any of my parents still archived?". */
export const ARCHIVE_PARENTS: Record<string, readonly { parent: string; column: string }[]> =
  Object.entries(ARCHIVE_CASCADE).reduce<Record<string, { parent: string; column: string }[]>>(
    (acc, [parent, edges]) => {
      for (const e of edges) (acc[e.table] ??= []).push({ parent, column: e.column })
      return acc
    },
    {}
  )

/** R14 — the walk is bounded, and it fails LOUDLY rather than half-cascading.
 *
 * A cascade that stopped quietly at a ceiling would leave exactly the state this
 * whole design exists to prevent: a visible child under an invisible parent,
 * with nothing recording that the walk gave up. The refusal is a 409 the caller
 * can act on, and the rows already written keep their markers, so restoring the
 * parent unwinds what did land. */
const CASCADE_ROW_CAP = 5000

const AUDIT = ["archived_at", "archiver_id", "archiver_email", "archiver_name"] as const

/** ARCHIVE EVERY ROW THAT HANGS OFF THIS ONE, and remember which row did it.
 *
 * `archived_at IS NULL` RIDES EVERY UPDATE, which buys three things at once:
 * R17's idempotence (a second archive of the same parent moves zero rows), the
 * visited set that makes the walk terminate, and — the one that matters most —
 * a row already archived ON ITS OWN MERITS is stepped over, keeping its NULL
 * marker, so restoring this parent will walk straight past it.
 *
 * Returns the rows it archived, so a caller can say how many and a test can say
 * which. */
export async function cascadeArchive(
  cfg: D1Rest,
  databaseId: string,
  actor: Actor,
  root: { table: string; id: string },
  now: string
): Promise<{ table: string; id: string }[]> {
  const touched: { table: string; id: string }[] = []
  let frontier: { table: string; id: string }[] = [root]

  while (frontier.length) {
    const next: { table: string; id: string }[] = []
    for (const node of frontier) {
      for (const edge of ARCHIVE_CASCADE[node.table] ?? []) {
        if (edge.table === WORK_LOGS_ARE_NEVER_ARCHIVED) continue
        const rows = await d1Query<{ id: string }>(
          cfg,
          databaseId,
          // Every value here is SERVER-OWNED (the actor off the session, the
          // clock, and a table/column name out of the constant above), never a
          // request value — the same rule `account-scope.ts`'s own `idList`
          // states for the fence's ids.
          `UPDATE ${edge.table}
              SET archived_at = ?, archiver_id = ?, archiver_email = ?, archiver_name = ?,
                  archived_via_table = ${sqlString(node.table)}, archived_via_id = ?
            WHERE ${edge.column} = ? AND archived_at IS NULL
            RETURNING id`,
          [now, actor.id, actor.email, actor.name, node.id, node.id]
        )
        for (const r of rows) {
          touched.push({ table: edge.table, id: r.id })
          next.push({ table: edge.table, id: r.id })
        }
        if (touched.length > CASCADE_ROW_CAP)
          throw new GuardError(
            409,
            "cascade_too_large",
            "That record has too much under it to archive in one go. Archive the biggest parts first."
          )
      }
    }
    frontier = next
  }
  return touched
}

/** RESTORE EXACTLY WHAT THE CASCADE TOOK, AND NOTHING ELSE.
 *
 * The marker is the whole mechanism: a row comes back only when
 * `archived_via_table`/`archived_via_id` name THIS row. A child archived on its
 * own merits carries a NULL marker and is untouched; a child archived by a
 * DIFFERENT parent (a story whose account went first, on a diamond where the
 * ticket arrived second) names that other parent and is untouched too, which is
 * right — that parent is still archived, and the story must stay invisible
 * under it.
 *
 * Terminates for the mirror reason `cascadeArchive` does: clearing the marker
 * means a second pass over the same row matches nothing. */
export async function cascadeRestore(
  cfg: D1Rest,
  databaseId: string,
  root: { table: string; id: string }
): Promise<{ table: string; id: string }[]> {
  const touched: { table: string; id: string }[] = []
  let frontier: { table: string; id: string }[] = [root]

  while (frontier.length) {
    const next: { table: string; id: string }[] = []
    for (const node of frontier) {
      for (const edge of ARCHIVE_CASCADE[node.table] ?? []) {
        if (edge.table === WORK_LOGS_ARE_NEVER_ARCHIVED) continue
        const rows = await d1Query<{ id: string }>(
          cfg,
          databaseId,
          `UPDATE ${edge.table}
              SET ${AUDIT.map((c) => `${c} = NULL`).join(", ")},
                  archived_via_table = NULL, archived_via_id = NULL
            WHERE archived_via_table = ${sqlString(node.table)} AND archived_via_id = ?
            RETURNING id`,
          [node.id]
        )
        for (const r of rows) {
          touched.push({ table: edge.table, id: r.id })
          next.push({ table: edge.table, id: r.id })
        }
        if (touched.length > CASCADE_ROW_CAP)
          throw new GuardError(
            409,
            "cascade_too_large",
            "That record has too much under it to restore in one go."
          )
      }
    }
    frontier = next
  }
  return touched
}

/** NOTHING VISIBLE EVER HANGS UNDER SOMETHING INVISIBLE.
 *
 * Restoring a row whose own owning parent is still archived would produce
 * exactly that, so it is refused at the door. The check is one statement per
 * owning pointer, and it subsumes the cascaded case by construction: a row the
 * cascade archived has an archived parent BY DEFINITION, so its own Restore is
 * refused and the only way back is to restore the parent — which is also the
 * only place the marker can be honoured.
 *
 * The message names the parent's TABLE rather than its name, because this runs
 * in both workers and only one of them can cheaply read the other's labels; the
 * screen that calls it already knows the word for the record it is standing on. */
export async function refuseIfParentArchived(
  cfg: D1Rest,
  databaseId: string,
  row: { table: string; id: string }
): Promise<void> {
  for (const p of ARCHIVE_PARENTS[row.table] ?? []) {
    const [found] = await d1Query<{ id: string }>(
      cfg,
      databaseId,
      // R14: one row, by primary key, through the child's own pointer.
      `SELECT p.id FROM ${row.table} c JOIN ${p.parent} p ON p.id = c.${p.column}
        WHERE c.id = ? AND p.archived_at IS NOT NULL LIMIT 1`,
      [row.id]
    )
    if (found)
      throw new GuardError(
        409,
        "parent_archived",
        "Restore the record this one hangs off first."
      )
  }
}
