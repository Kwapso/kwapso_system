// A COLUMN NAME THAT COLLIDES ACROSS TWO JOINED TABLES IS A RUNTIME REFUSAL,
// NOT A LINT WARNING. Team migration 0117 gave `accounts` its own
// `archived_at`, beside `help`'s (0043-ish: a ticket somebody put away). The
// two are different facts — a client put away is not a ticket put away — and
// the moment both live on tables a statement JOINs, a bare `archived_at`
// stops being "the ticket's" or "the client's" and becomes ambiguous, which
// SQLite refuses to even prepare: "ambiguous column name: archived_at". It
// broke `workers/content/src/lib/help.ts`'s `countTicketFacets` — a LEFT JOIN
// onto `accounts` for the client's name, inheriting a bare predicate built
// three functions away by `archiveClause` — and it took down the whole
// Tickets list, not only the write doors the gate happened to exercise (see
// `workers/content/test/help-archived-account-collision.test.ts`).
//
// WHAT THIS CENSUS IS, AND WHAT IT HONESTLY IS NOT. A full census would parse
// every SQL statement's own scope tree — CTEs, correlated subqueries, the lot
// — and would need to resolve string interpolation back to the helper that
// built it, which is exactly how `countTicketFacets` hid: the bare
// `archived_at` this suite is about was never spelled out at the join site,
// it arrived as `${where.sql.join(" AND ")}` from a function three call frames
// away. No source-text census sees THAT. So this is the narrower, honest
// thing the doc asks for instead: it PINS the two column names this base has
// actually collided on (`archived_at`, `deactivated_at` — the second because
// it is on nearly every team table by the same audit-block convention that
// gave `help` its own `archived_at`, so it is one new column away from the
// identical failure), derives WHICH TABLES OWN THEM off the real schema
// rather than a hand-kept list, and fails when a statement's own text JOINS
// two owning tables and ALSO spells the column bare, outside any
// parenthesised (and therefore separately-scoped) subquery or CTE. It cannot
// see an ambiguity assembled through a helper function the way
// `countTicketFacets`'s was — that is what the dynamic suite above is for —
// but it catches the ordinary way this class of bug actually gets written: a
// query drafted new, joining two tables, with the collision spelled out right
// there in its own WHERE.

import { DatabaseSync } from "node:sqlite"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"
import { TEAM_MIGRATIONS } from "../src/team-schema"

const WORKERS = join(__dirname, "..", "..")
const ROOT = join(__dirname, "..", "..", "..")

/** THE PINNED COLUMN NAMES. Not derived — this is the "narrower honest thing"
 * the brief allows when a full census (see the file header) is not
 * practical. A column joins this list when it has actually collided, or when
 * it is one column-add away from the identical shape `archived_at` was:
 * `deactivated_at` sits on nearly every team table already. Widening this to
 * every column the schema happens to repeat (`id`, `name`, `status`,
 * `created_at`, …) was tried and rejected — those are qualified by habit
 * everywhere in this codebase (`t.id`, `a.name`) NOT because a check demanded
 * it, and a census over all of them either drowns in exemptions for
 * intentional, safe SQL or has to reconstruct a full scope resolver, which is
 * the "not practical" the brief anticipates. */
const PINNED_COLUMNS = ["archived_at", "deactivated_at"] as const

/** WHO OWNS EACH PINNED COLUMN, read off a REAL schema rather than grepped out
 * of `migrations.ts` by hand — D1 *is* SQLite (the same argument
 * `spine-harness.ts` makes), so running the actual `TEAM_MIGRATIONS` into
 * `node:sqlite` and asking it `PRAGMA table_info` is the one oracle that
 * cannot silently drift from what a live team database actually has. */
function ownersOfPinnedColumns(): Map<string, Set<string>> {
  const db = new DatabaseSync(":memory:")
  for (const m of TEAM_MIGRATIONS) db.exec(m.sql)
  const tables = (
    db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`).all() as {
      name: string
    }[]
  ).map((r) => r.name)

  const owners = new Map<string, Set<string>>(PINNED_COLUMNS.map((c) => [c, new Set<string>()]))
  for (const table of tables) {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
    for (const col of cols) if (owners.has(col.name)) owners.get(col.name)!.add(table)
  }
  db.close()
  return owners
}

/** Every backtick template literal in `source` that reads as SQL (contains a
 * `SELECT`, `UPDATE`, `INSERT`, `DELETE` or `WITH`, case-insensitive) — the
 * same "find the query text" step every SQL-aware check in this repo
 * (`one-way-columns.test.ts` included) starts from, done once here rather
 * than five times over. */
function sqlLiterals(source: string): string[] {
  const out: string[] = []
  const re = /`(?:[^`\\]|\\.)*`/gs
  let m: RegExpExecArray | null
  while ((m = re.exec(source))) {
    const lit = m[0]
    if (/\b(SELECT|UPDATE|INSERT|DELETE|WITH)\b/i.test(lit)) out.push(lit)
  }
  return out
}

/** Balanced parentheses removed, repeatedly, so a CTE body (`AS (…)`) and a
 * correlated subquery (`(SELECT … FROM …)`) — each its OWN scope, where a
 * bare column resolves against the tables named INSIDE it and nothing outside
 * — drop out of a text search for the outer statement's own ambiguity. This
 * is the whole reason `countTicketFacets`'s SIBLING reads (`readTicketDashboard`
 * in the same file) are safe despite joining `accounts`: every one of them
 * isolates the ticket-only predicate inside a `WITH scoped AS (…)` first. A
 * search that did not strip parens would flag those as false positives and
 * teach the next reader to ignore this check. */
function stripParenGroups(sql: string): string {
  let out = sql
  for (let i = 0; i < 20; i++) {
    const next = out.replace(/\(([^()]*)\)/g, " ")
    if (next === out) return next
    out = next
  }
  return out
}

/** The table names a statement's OWN (paren-stripped) text puts in scope —
 * every `FROM <table>` and `JOIN <table>`, deduplicated. An alias is not a
 * table and is never returned: something later resolving a bare column
 * against `s` (a CTE's own alias) rather than `help` is exactly the safe case
 * this check must not flag. */
function joinedTables(strippedSql: string): Set<string> {
  const names = new Set<string>()
  const re = /\b(?:FROM|JOIN)\s+([A-Za-z_][A-Za-z0-9_]*)/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(strippedSql))) names.add(m[1].toLowerCase())
  return names
}

/** Whether `column` appears UNQUALIFIED in `strippedSql` — not immediately
 * preceded by `.` (an alias qualifying it) or by a word character (part of a
 * longer identifier, e.g. `deactivator_id` must never trip `deactivated_at`'s
 * own search — moot here since the names don't overlap, but the guard is the
 * same one `archiveClause`'s own fix relies on). `AS <column>` — naming an
 * OUTPUT column in a SELECT list — is stripped first: aliasing a computed
 * value to `archived_at` is not a reference to the real column and must not
 * itself trip the check. */
function hasBareReference(strippedSql: string, column: string): boolean {
  const withoutAliasing = strippedSql.replace(new RegExp(`\\bAS\\s+${column}\\b`, "gi"), " ")
  const bare = new RegExp(`(?<![.\\w])${column}\\b`, "i")
  return bare.test(withoutAliasing)
}

/** One SQL comment line (`-- …`) removed at a time, so a JOIN or a column name
 * spelled out in PROSE beside the real statement — this repo comments its SQL
 * at length, in the SQL's own template literal — cannot forge a hit. */
function stripSqlComments(sql: string): string {
  return sql.replace(/--[^\n]*/g, " ")
}

type Offender = { file: string; column: string; excerpt: string }

function census(): Offender[] {
  const owners = ownersOfPinnedColumns()
  const files = ["auth", "tenancy", "content", "data-ops", "mcp", "realtime", "gateway", "portal-gateway"]
    .flatMap((w) => sourceFiles(join(WORKERS, w, "src"), { extensions: [".ts"] }))
    .concat(sourceFiles(join(ROOT, "shared"), { extensions: [".ts"] }))
    .filter((f) => !/(^|\/)tests?\//.test(f.rel))
    // THE SCHEMA LEDGER ITSELF IS OUT OF SCOPE. `migrations.ts` IS the
    // definition of every table this check derives its owner map from — its
    // CREATE TABLE bodies are DDL, not an application query, and they are
    // riddled with real JOIN-shaped prose ("a JOIN that can multiply…") that
    // a query census has no business reading.
    .filter((f) => !/team-schema[/\\]migrations\.ts$/.test(f.rel))

  const offenders: Offender[] = []
  for (const f of files) {
    const stripped = stripComments(f.source)
    for (const lit of sqlLiterals(stripped)) {
      const sql = stripParenGroups(stripSqlComments(lit))
      const tables = joinedTables(sql)
      if (tables.size < 2) continue // nothing to be ambiguous BETWEEN
      for (const column of PINNED_COLUMNS) {
        const owningTablesPresent = [...tables].filter((t) => owners.get(column)?.has(t))
        if (owningTablesPresent.length < 2) continue
        if (hasBareReference(sql, column))
          offenders.push({ file: f.rel, column, excerpt: lit.slice(0, 300).replace(/\s+/g, " ") })
      }
    }
  }
  return offenders
}

/** Reasoned, rot-checked exceptions — keyed by FILE and a distinctive
 * EXPRESSION found in the offending literal, never by line (a file:line key
 * rots on the next edit above it). Empty on the day this check was written:
 * every real hit this census found was the bug itself, now fixed, and every
 * safe JOIN this repo already writes isolates the collision inside a CTE or a
 * correlated subquery, which paren-stripping already sees through. A future
 * entry here says, in one line, why a NEW hit is not one. */
const AMBIGUOUS_JOIN_EXEMPT: { file: string; expression: string; reason: string }[] = []

describe("a query joining two tables that both own a pinned column qualifies it", () => {
  it("the schema oracle is reading the real, live columns — not an empty derivation", () => {
    const owners = ownersOfPinnedColumns()
    // THE CANARY. `archived_at` is the column this whole suite exists for, and
    // its owner set must be EXACTLY this list — not more, not fewer, not empty.
    // A change here is news: every table that grows the column widens the blast
    // radius of the exact bug this file guards (a bare `archived_at` in a
    // statement joining two owners is refused by SQLite at runtime, and on
    // `help` it took the whole Tickets screen down), and losing one silently
    // turns this check into one that passes for finding nothing.
    //
    // WIDENED FROM TWO TO TEN, 24 Sep 2026, migration 0123. Aurora's ruling —
    // "when archiving a parent item, always archive as well the child items" —
    // gave eight more tables an archived state of their own, because a cascaded
    // child now IS archived rather than merely filtered out of sight. Eight of
    // the ten are new; `accounts` (0117) and `help` (0011) are the originals.
    // `work_logs` is deliberately NOT here and never will be: "never archive
    // work logs, time is logged and we must always know where it went."
    expect([...(owners.get("archived_at") ?? [])].sort()).toEqual([
      "accounts",
      "apps",
      "help",
      "meetings",
      "processes",
      "sprints",
      "stories",
      "tasks",
      "todos",
      "waves",
    ])
    // AND THE ONE THAT MUST NEVER JOIN THEM, asserted as a negative because an
    // absence is otherwise indistinguishable from an oversight.
    expect([...(owners.get("archived_at") ?? [])]).not.toContain("work_logs")
    // `deactivated_at` is the audit-block column: virtually every team table
    // carries it, so the owner set is large rather than exact.
    expect((owners.get("deactivated_at")?.size ?? 0)).toBeGreaterThan(15)
  })

  it("the walker is reading real files across every worker, not an empty scan", () => {
    const files = ["auth", "tenancy", "content", "data-ops", "mcp", "realtime", "gateway", "portal-gateway"].flatMap(
      (w) => sourceFiles(join(WORKERS, w, "src"), { extensions: [".ts"] })
    )
    expect(files.length).toBeGreaterThan(80)
  })

  it("the paren-stripper actually isolates a CTE — proof against a real safe query", () => {
    // THE SHAPE `readTicketDashboard` (workers/content/src/lib/help.ts) uses
    // to join `help` to `accounts` safely: the ticket-only predicate lives
    // INSIDE the CTE, which paren-stripping removes before the outer join is
    // ever looked at.
    const safe = `WITH scoped AS (SELECT account_id FROM help WHERE archived_at IS NULL)
       SELECT s.account_id FROM scoped s LEFT JOIN accounts a ON a.id = s.account_id`
    const stripped = stripParenGroups(stripSqlComments(safe))
    expect(joinedTables(stripped).has("help")).toBe(false)
    expect(hasBareReference(stripped, "archived_at")).toBe(false)
  })

  it("…and the SAME shape, without the CTE, is exactly what this check exists to catch", () => {
    const unsafe = `SELECT help.account_id, a.name
       FROM help LEFT JOIN accounts a ON a.id = help.account_id
      WHERE archived_at IS NULL`
    const stripped = stripParenGroups(stripSqlComments(unsafe))
    expect(joinedTables(stripped)).toEqual(new Set(["help", "accounts"]))
    expect(hasBareReference(stripped, "archived_at")).toBe(true)
  })

  it("no unexempted offender remains in the shipped source", () => {
    const offenders = census().filter(
      (o) => !AMBIGUOUS_JOIN_EXEMPT.some((e) => e.file === o.file && o.excerpt.includes(e.expression))
    )
    expect(
      offenders,
      "a query joins two tables that both carry this pinned column and writes it " +
        "unqualified — SQLite refuses this at runtime with \"ambiguous column name\". " +
        "Qualify it to the table the predicate is actually ABOUT (never just the " +
        "nearer one), or add a reasoned AMBIGUOUS_JOIN_EXEMPT entry: " +
        JSON.stringify(offenders, null, 2)
    ).toEqual([])
  })
})
