// R55 — THE STORED REFERENCE IS WHAT THE FORMULA MAKES, AND THE FORMULA IS ONE
// PLACE.
//
// ── THE FAULT THIS IS THE ANSWER TO ─────────────────────────────────────────
//
// On 31 Aug 2026 the client ruled that a reference is team-wide with no account
// code in it. Migrations 0059 and 0060 landed that ruling: they built
// `team_ref_counters`, gave `apps` and `waves` a `ref` column, dropped the old
// `ref_counters`, and REWROTE NOT ONE STORED ROW. `shared/workers/refs.ts` then
// said, in its own header, that the old account-coded shape "is GONE".
//
// It was gone from the MINT. On 7 Sep 2026 the client was reading
// `VU Solutions-T1183` and `FluClinic-T0001` off her own screens, and a probe of
// staging found 1,896 ticket references, 275 story, 100 sprint, 45 meeting and
// 1 input — every single one still account-coded, and not one row in the team
// that held real data wearing the shape the file described.
//
// Six days, and nothing in the repository could have noticed. `npm run check`
// was green throughout and could not have been anything else: the formula lived
// inside `nextTeamRef` as a template literal, which means the rule "a reference
// looks like this" existed only during the instant one was minted. Afterwards
// there was nothing to ask. No migration could check the shape it was leaving
// behind, no door could check the shape it was reading, and no test could check
// anything at all, because there was no formula to check against — only a
// string being built.
//
// So this law has two halves and they are not the same sentence:
//
//   THE FORMULA IS A THING. `canonicalRef` is a function, `canonicalRefSql` is
//   its twin inside SQLite, and both are exported. That is what makes every
//   clause below possible; it is not a tidiness change.
//
//   NOTHING BUT THE FORMULA PUTS A REFERENCE IN A ROW. `nextTeamRef` is the one
//   writer, migration 0068 is the one backfill, and the census below is what
//   stops a third appearing.
//
// ── WHY IT IS DERIVED THREE TIMES AND HAND-LISTED NOWHERE ───────────────────
//
// The population is "every table that stores a reference", and the reason a
// hand-typed list is not good enough here is on the record twice over. RULES.md
// R2's own note says it at length: a law that enumerates its subject from a list
// somebody remembered to type has a hole by construction, and R2's list opened
// twice, both times because a screen no law walked looked exactly like a screen
// that passed. And this law's own subject is a case in point — `tasks` has a
// `ref` column and a live unique index on it and mints nothing, which is a fact
// nobody would have typed into a list of kinds.
//
// So the census comes from two independent oracles that cannot be the same
// mistake:
//
//   1 · THE SCHEMA, read off `TEAM_MIGRATIONS` itself — every `ref TEXT` in a
//       `CREATE TABLE` and every `ALTER TABLE … ADD COLUMN ref`. This is the
//       ground truth about what a team's database actually holds, and it is a
//       different kind of statement from anything in the application code.
//   2 · THE MAP, `TEAM_REF_TABLES` in `shared/workers/refs.ts`, typed
//       `Record<TeamRefKindName, string>` so `tsc` refuses a kind with no table.
//
// A table in (1) and not in (2) is either a kind nobody wired up or a fossil,
// and it has to be one of those IN WRITING — `REF_TABLES_WITHOUT_A_KIND`,
// rot-checked so it can only shrink.
//
// ── THE BLINDNESS TRIPWIRE ──────────────────────────────────────────────────
//
// Every clause here is a set difference, and a set difference against an empty
// set is empty. A schema scan that stopped matching would report a clean pass
// over nothing at all — the law asleep, wearing a green tick, which is exactly
// the state the estate was in for six days. So the derivations are asserted
// BEFORE they are used: the schema must still find at least seven ref columns
// (it finds eight), both `CREATE`-side and `ALTER`-side shapes must still each
// contribute a table nothing else finds, and the migration replay must actually
// change rows.

import { readFileSync } from "node:fs"
import { DatabaseSync } from "node:sqlite"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"
import { REF_TABLES_WITHOUT_A_KIND } from "@shared/rules/registry"
import {
  canonicalRef,
  canonicalRefSql,
  REF_ALIAS_TABLE,
  refNumber,
  refNumberSql,
  TEAM_REF_KINDS,
  TEAM_REF_TABLES,
  type TeamRefKind,
  type TeamRefKindName,
} from "@shared/workers/refs"
import { QUERY_MODULES } from "@shared/workers/query-grammar"
import { TEAM_MIGRATIONS } from "../../workers/tenancy/src/team-schema"
// THE ENGINE ITSELF, imported so this law can RUN it rather than read it — see
// clause 6. `readWhere` is the one clause `runQuery` builds its rows, its exact
// total and its grouped counts from, so a filter compiled here is the filter the
// MCP `query_records` tool really executes.
import { parseQuery, readWhere, type Fence } from "../../workers/tenancy/src/lib/query-engine"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, "..", "..")

/** The migration that carried the data to the formula. Named once. */
const BACKFILL = "0068_the_reference_keeps_its_old_name"

/** Every worker's own source — where a reference is minted, stored and searched.
 * `test/` is out: a fixture writing a deliberately wrong reference should fail
 * as a test, not as a law. */
const WORKER_SRC = ["auth", "tenancy", "content", "data-ops", "mcp", "realtime", "gateway", "portal-gateway"]
  .map((w) => join(ROOT, "workers", w, "src"))
  .filter((p) => {
    try {
      readFileSync(join(p, "..", "package.json"))
      return true
    } catch {
      return false
    }
  })

// ── DERIVATION 1: the schema's own answer ───────────────────────────────────

/** EVERY TABLE A TEAM DATABASE STORES A REFERENCE IN, read off the migration
 * ledger rather than remembered.
 *
 * Two shapes, and BOTH are load-bearing — the eight tables split six/two between
 * them, so a scan that knew only one would silently lose the other's tables and
 * still look healthy:
 *
 *   · `ref TEXT` inside a `CREATE TABLE` — the tables born with one (sprints,
 *     stories, todos, tasks, meetings).
 *   · `ALTER TABLE <t> ADD COLUMN ref TEXT` — the tables that gained one later
 *     (help in 0011, apps and waves in 0059).
 *
 * The CREATE side is parsed by walking the statement rather than by matching
 * `ref TEXT` anywhere in the file, because `ref TEXT` also appears inside the
 * alias table 0068 creates and inside prose. */
function refColumnsInSchema(): { create: Set<string>; alter: Set<string> } {
  const sql = TEAM_MIGRATIONS.map((m) => m.sql).join("\n")
  const create = new Set<string>()
  for (const m of sql.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)\s*\(([\s\S]*?)\n\s*\)\s*;/g)) {
    if (/^\s*ref TEXT/m.test(m[2])) create.add(m[1])
  }
  const alter = new Set<string>()
  for (const m of sql.matchAll(/ALTER TABLE (\w+) ADD COLUMN ref TEXT/g)) alter.add(m[1])
  return { create, alter }
}

/** The two shapes as one population. */
function refTablesInSchema(): Set<string> {
  const { create, alter } = refColumnsInSchema()
  return new Set([...create, ...alter])
}

// ── DERIVATION 2: the application's answer ──────────────────────────────────

const KIND_NAMES = Object.keys(TEAM_REF_KINDS) as TeamRefKindName[]
const MAPPED_TABLES = new Set(KIND_NAMES.map((k) => TEAM_REF_TABLES[k]))

/** A team database carried to the very end of the ledger, with nothing in it. */
function freshTeamDb(): DatabaseSync {
  const db = new DatabaseSync(":memory:")
  for (const m of TEAM_MIGRATIONS) db.exec(m.sql)
  return db
}

/** A team database carried to the migration BEFORE the backfill — the state
 * every live team was in on the morning of 7 Sep 2026. */
function dbBeforeTheBackfill(): DatabaseSync {
  const db = new DatabaseSync(":memory:")
  for (const m of TEAM_MIGRATIONS) {
    if (m.version === BACKFILL) return db
    db.exec(m.sql)
  }
  throw new Error(`${BACKFILL} is not in TEAM_MIGRATIONS — this whole law is about that migration.`)
}

function runBackfill(db: DatabaseSync): void {
  const m = TEAM_MIGRATIONS.find((x) => x.version === BACKFILL)
  if (!m) throw new Error(`${BACKFILL} is not in TEAM_MIGRATIONS.`)
  db.exec(m.sql)
}

describe("R55 — a stored reference is what the formula makes", () => {
  // ── TRIPWIRES ─────────────────────────────────────────────────────────────
  it("TRIPWIRE: both schema scans still answer, and neither carries the census alone", () => {
    const { create, alter } = refColumnsInSchema()
    expect(
      [...create].sort(),
      "the CREATE-TABLE scan found no `ref TEXT` column at all. Either every reference column was " +
        "dropped (in which case delete this law) or the scan has gone blind — and a blind scan makes " +
        "every clause below a set difference against nothing, which passes"
    ).not.toEqual([])
    expect(
      [...alter].sort(),
      "the ALTER-TABLE scan found no `ADD COLUMN ref` at all. `help` gained its reference that way in " +
        "0011 and `apps`/`waves` in 0059, so an empty answer here means the scan stopped reading, not " +
        "that the estate got tidier"
    ).not.toEqual([])
    // Neither shape may be decoration: each has to carry a table the other does
    // not find, or one of them is costing a scan and buying nothing.
    expect([...create].filter((t) => !alter.has(t)), "the CREATE scan finds nothing of its own").not.toEqual([])
    expect([...alter].filter((t) => !create.has(t)), "the ALTER scan finds nothing of its own").not.toEqual([])
    expect(
      refTablesInSchema().size,
      `the schema scan found ${refTablesInSchema().size} table(s) with a reference column. It found ` +
        "eight the day this law was written (apps, help, meetings, sprints, stories, tasks, todos, " +
        "waves), so a sharp drop is a blind scan rather than a smaller schema"
    ).toBeGreaterThanOrEqual(7)
  })

  // ── CLAUSE 1: the census ──────────────────────────────────────────────────
  it("every table that stores a reference is a kind, or says in writing why it is not", () => {
    const schema = refTablesInSchema()
    const used = new Set<string>()
    const unclaimed: string[] = []
    for (const table of [...schema].sort()) {
      if (MAPPED_TABLES.has(table)) continue
      if (REF_TABLES_WITHOUT_A_KIND[table]) {
        used.add(table)
        continue
      }
      unclaimed.push(table)
    }
    expect(
      unclaimed,
      "these tables store a `ref` and no kind mints one for them, so nothing in the product decides " +
        "what a value in that column should look like and R55 cannot check it. Give the table a kind " +
        "in TEAM_REF_KINDS + TEAM_REF_TABLES (shared/workers/refs.ts), or add a REF_TABLES_WITHOUT_A_KIND " +
        `entry saying why it has none:\n  ${unclaimed.join("\n  ")}`
    ).toEqual([])

    // ROT, and it is the half that keeps the list shrinking: an entry excusing a
    // table that now HAS a kind reads as a handled exception while describing
    // nothing, and would go on excusing the table after the reason expired.
    const stale = Object.keys(REF_TABLES_WITHOUT_A_KIND).filter((t) => !used.has(t))
    expect(
      stale,
      "REF_TABLES_WITHOUT_A_KIND names tables that either no longer store a reference or have since " +
        `been given a kind. Delete the entries:\n  ${stale.join("\n  ")}`
    ).toEqual([])

    // …and the other direction: a kind whose table is not in the schema at all
    // would mint numbers into nowhere.
    const homeless = KIND_NAMES.filter((k) => !schema.has(TEAM_REF_TABLES[k]))
    expect(
      homeless.map((k) => `${k} → ${TEAM_REF_TABLES[k]}`),
      "TEAM_REF_TABLES points these kinds at a table the team schema has no `ref` column on. The mint " +
        "would write a number into a column that does not exist"
    ).toEqual([])
  })

  // ── CLAUSE 2: the formula is one place, and its SQL twin agrees ───────────
  it("the mint returns the formula rather than re-spelling it", () => {
    const src = stripComments(readFileSync(join(ROOT, "shared", "workers", "refs.ts"), "utf8"))
    const body = src.slice(src.indexOf("export async function nextTeamRef"))
    expect(
      body,
      "`nextTeamRef` no longer ends in `canonicalRef(...)`. The whole fault this law exists for is a " +
        "formula that lives only inside the minting function — if the mint builds its string itself " +
        "again, nothing else in the estate can ask what a reference should look like"
    ).toMatch(/return canonicalRef\(/)
    // And the template it replaced may not creep back in beside it.
    expect(
      /padStart\(/.test(body),
      "`nextTeamRef` is padding a number itself again instead of calling `canonicalRef`"
    ).toBe(false)
  })

  it("the SQL twin of the formula gives the same answer as the TypeScript", () => {
    // RUN BOTH, never read them. Two spellings of one rule agreeing by
    // inspection is how the estate got here; the only proof that means anything
    // is the same numbers through both engines. The spread deliberately crosses
    // the padding boundary in both directions — 9,999 is the last four-digit
    // number and 10,000 is where a `printf` that TRUNCATED instead of padding
    // would start minting duplicates against a live unique index.
    const db = freshTeamDb()
    const kind: TeamRefKind = TEAM_REF_KINDS.ticket
    const numbers = [1, 2, 9, 99, 100, 412, 1183, 3447, 9998, 9999, 10000, 123456]
    // The value goes in through ONE bind and the expressions read a COLUMN, the
    // way they do in the migration and at every door. Both twins mention their
    // argument three times, so handing them a `?` each would bind three
    // different placeholders and silently compare against nulls.
    for (const n of numbers) {
      const ts = canonicalRef(kind, n)
      const sql = db
        .prepare(`SELECT ${canonicalRefSql(kind, "r")} AS v, ${refNumberSql("r")} AS n FROM (SELECT ? AS r)`)
        .get(ts) as { v: string; n: number }
      expect(sql.v, `canonicalRefSql disagrees with canonicalRef at ${n}`).toBe(ts)
      expect(sql.n, `refNumberSql cannot read back ${ts}`).toBe(n)
      // And the number reads back out of the string in TypeScript too.
      expect(refNumber(kind, ts), `refNumber cannot read back ${ts}`).toBe(n)
    }
    // A number that is padded WRONG is not canonical — the round trip, not a
    // parse. Without this, "T00168" would read as a valid 168 and the backfill
    // would leave it alone.
    expect(refNumber(kind, "T00168")).toBeNull()
    expect(refNumber(kind, "196+ awards-T0412")).toBeNull()
  })

  // ── CLAUSE 3: nothing but the mint puts a reference in a row ──────────────
  it("only the one mint writes a reference, and nothing updates one in place", () => {
    const tables = [...MAPPED_TABLES]
    const inserters: string[] = []
    const updaters: string[] = []
    for (const file of sourceFiles(WORKER_SRC, { extensions: [".ts"], skipTests: true, relativeTo: ROOT })) {
      // The backfill IS the one act allowed to rewrite a reference — it is what
      // this law's own migration does — so it is skipped by NAME rather than by
      // being missed.
      if (file.rel.endsWith("team-schema/migrations.ts")) continue
      const code = stripComments(file.source)
      for (const table of tables) {
        const insert = new RegExp(`INSERT INTO ${table}\\s*\\(([^)]*)\\)`, "g")
        for (const m of code.matchAll(insert)) {
          if (!/\bref\b/.test(m[1])) continue
          if (/nextTeamRef/.test(code)) continue
          inserters.push(`${file.rel} — INSERT INTO ${table} writes \`ref\``)
        }
        const update = new RegExp(`UPDATE ${table} SET [^\`;]*\\bref\\s*=`, "g")
        if (update.test(code)) updaters.push(`${file.rel} — UPDATE ${table} SET … ref = …`)
      }
    }
    expect(
      [...new Set(inserters)],
      "these write a reference into a row without ever calling `nextTeamRef`, so the value they store " +
        "obeys no formula and nothing can check it. This is the exact shape of the fault R55 exists " +
        "for — mint through shared/workers/refs.ts"
    ).toEqual([])
    expect(
      [...new Set(updaters)],
      "a reference is minted once and never edited: the number a client has been quoted is not a field. " +
        "The ONE act allowed to rewrite one is a team migration, and it has to keep the old string in " +
        `${REF_ALIAS_TABLE} the way ${BACKFILL} does`
    ).toEqual([])
  })

  // ── CLAUSE 4: a search that finds the new number finds the old one ────────
  it("every door that searches a reference also searches what it used to be", () => {
    const blind: string[] = []
    for (const file of sourceFiles(WORKER_SRC, { extensions: [".ts"], skipTests: true, relativeTo: ROOT })) {
      const code = stripComments(file.source)
      // A SEARCH predicate, not any mention of the column: the literal COLUMN
      // `ref` (bare, table-qualified, or wrapped in the LOWER/COALESCE the doors
      // wrap it in) on a line that also says LIKE.
      //
      // TWO THINGS IT DELIBERATELY DOES NOT CATCH:
      //   · an EQUALITY on a reference — that is a lookup, not a search box, and
      //     nobody types an old number into an internal join.
      //   · an identifier that merely CONTAINS the word (`ref.labelColumn`,
      //     `refAliasMatchSql`), which a bare `\bref\b` matches happily.
      //
      // A THIRD used to be listed here, and it was a KNOWN GAP rather than an
      // exclusion: the generic query engine builds `LOWER(<column>) LIKE ?` from
      // a field TABLE, so the column is a variable and no scan of a source file
      // can know that `ref` is one of the values it takes — which meant the MCP
      // `query_records` filter genuinely did not find an alias, while the same
      // string typed into the app's search box did. That surface is closed and
      // this law now covers it, by a different means, two clauses down: the
      // grammar DECLARES which fields have a past and the engine's own WHERE is
      // RUN over a real backfilled database. The sentence is gone because it is
      // no longer true, not because it stopped being worth saying.
      const REF_IN_A_LIKE =
        /(?:LOWER|COALESCE)\(\s*(?:COALESCE\()?\s*(?:\w+\.)?ref\b|(?<![\w.])(?:\w+\.)?ref\s+LIKE/
      const searches = [...code.matchAll(/^.*\bLIKE\b.*$/gm)].filter(
        (m) => REF_IN_A_LIKE.test(m[0]) && !m[0].includes("ra.alias")
      )
      if (!searches.length) continue
      if (/refAliasMatchSql\(/.test(code)) continue
      blind.push(`${file.rel} — ${searches[0][0].trim().slice(0, 110)}`)
    }
    expect(
      blind,
      "these search a reference and cannot find the string that reference used to be. Migration 0068 " +
        "renumbered most of the estate — 202 tickets, 241 stories, 75 sprints, 31 meetings — and the " +
        "client's answer to being shown the choice was `alias yes`, which means a number quoted in an " +
        "email last year still has to land on the record. OR in `refAliasMatchSql(table, alias)` from " +
        `shared/workers/refs.ts and push one more needle:\n  ${blind.join("\n  ")}`
    ).toEqual([])
  })

  // ── CLAUSE 5: the machine surface's own door, which has no SQL to scan ────
  //
  // Clause 4 reads doors. `query_records` is not a door of that kind: one engine
  // serves sixteen modules and builds its predicate from `QUERY_MODULES`, so
  // there is no hand-written `LOWER(ref) LIKE ?` anywhere to find. Until 8 Sep
  // 2026 that difference was the gap — the clause above named it in its own
  // comment and stopped there.
  //
  // The engine cannot have a door's `OR` bolted on, so the fact moved into the
  // field table: a field says `renumbered` and the engine ORs in the SAME
  // `refAliasMatchSql` seam with the module's own table. That makes the question
  // this clause asks a DECLARATION question, and it is derived from the same
  // oracle everything else here is derived from — `TEAM_REF_TABLES`, the map
  // `tsc` refuses to let fall behind the kinds.
  //
  // IT FAILS BOTH WAYS, and the second half is the one a name-based rule would
  // have got wrong. `tasks` has a `ref` column, a live unique index and 109 old
  // `<account>-K####` strings, and 0068 deliberately left every one of them
  // alone — a task mints no reference, so there was no kind to carry them to.
  // A field there claiming a history would hang an EXISTS over a table holding
  // nothing for it and tell a caller it had searched something it had not.
  it("the generic query engine knows which of its fields have a past, and which do not", () => {
    const kindTables = new Set(Object.values(TEAM_REF_TABLES))
    const refFields: string[] = []
    const declared: string[] = []
    const missing: string[] = []
    const overclaimed: string[] = []
    const confused: string[] = []
    for (const [name, mod] of Object.entries(QUERY_MODULES))
      for (const f of mod.fields) {
        // The COLUMN, not the field's published name: the grammar's whole point
        // is that a model-facing name and a column are two different things, and
        // this question is about the column the aliases were recorded against.
        if (f.column !== "ref") continue
        refFields.push(`${name}.${f.name}`)
        const carriesAliases = kindTables.has(mod.table)
        if (f.renumbered) declared.push(`${name}.${f.name}`)
        if (carriesAliases && !f.renumbered) missing.push(`${name}.${f.name} → ${mod.table}`)
        if (!carriesAliases && f.renumbered) overclaimed.push(`${name}.${f.name} → ${mod.table}`)
        // A `ref` FIELD (one that points at another module) resolves its value
        // against that module's NAME through a subquery of its own; an alias of
        // THIS row is a different question and the engine refuses to mix them.
        if (f.renumbered && f.ref) confused.push(`${name}.${f.name} → ${f.ref}`)
      }

    // THE BLINDNESS TRIPWIRE, and it needs BOTH sides: a census that found no
    // reference fields at all, or one where every field fell on the same side of
    // the question, would pass the three assertions below without measuring
    // anything. Six modules publish a `ref` field; five carry aliases and
    // `tasks` does not.
    expect(
      refFields.length,
      "no queryable module publishes a `ref` field at all — either the grammar stopped exposing " +
        "references (in which case delete this clause) or this scan has gone blind, and a blind " +
        "scan makes every assertion below vacuous"
    ).toBeGreaterThanOrEqual(5)
    expect(declared, "not one queryable reference field declares a history").not.toEqual([])
    expect(
      refFields.filter((n) => !declared.includes(n)),
      "every reference field now declares a history, so this census can no longer tell the two " +
        "cases apart — `tasks` was the one that must NOT, and if it has gained a kind then " +
        "REF_TABLES_WITHOUT_A_KIND has an entry to lose and this tripwire needs rewriting"
    ).not.toEqual([])

    expect(
      missing,
      "migration 0068 retired references on these tables into `ref_aliases`, and the query engine " +
        "cannot see them: a number a client was quoted in an email finds the record through the " +
        "app's own search box and comes back as 'no such record' through `query_records`, which is " +
        "one question with two answers on two surfaces. Add `renumbered: true` to the field in " +
        "shared/workers/query-grammar.ts"
    ).toEqual([])
    expect(
      overclaimed,
      "these declare a history their table does not have — 0068 wrote no alias row for them, so the " +
        "engine would run an EXISTS against nothing and report that it had searched what a record " +
        "used to be called. Drop `renumbered`, or give the table a kind"
    ).toEqual([])
    expect(
      confused,
      "a field cannot both point at another module and carry a history of its own: the first " +
        "matches the REFERENCED record's name, the second matches what THIS row used to be called"
    ).toEqual([])
  })

  // ── CLAUSE 6: the data, proved against a real database ────────────────────
  //
  // Everything above reads SOURCE. This runs the actual migration ledger into a
  // real SQLite handle — D1 *is* SQLite, the same thing the tenancy suites do —
  // over rows in the shapes that were actually measured on staging, and asks the
  // question the six-day gap was: what does the column HOLD afterwards.
  describe("the backfill carries every stored reference to the formula", () => {
    /** The five old shapes staging actually held, plus the three that make the
     * hard cases hard. Nothing invented: `196+ awards-T2912` and
     * `VU Solutions-T1183` are real, `re-green` is a real account with a hyphen
     * in its name (so a parser reading the PREFIX would split it wrong), and
     * `Alpha-T0001` / `Beta-T0001` are the cross-account collision the whole
     * team-wide shape exists to make impossible. */
    function seed(db: DatabaseSync) {
      db.exec(`
        INSERT INTO accounts (id, account_type, name, created_at) VALUES
          ('A1','entity','Alpha','2026-01-01'),('A2','entity','Beta','2026-01-01');
        INSERT INTO help (id, description, status, account_id, ref, created_at) VALUES
          ('H_OLD','a','triage','A1','Alpha-T0001','2026-01-01'),
          ('H_CLASH','b','triage','A2','Beta-T0001','2026-02-01'),
          ('H_HYPHEN','c','triage','A1','re-green-T0009','2026-03-01'),
          ('H_NEW','d','triage','A1','T0100','2026-04-01'),
          ('H_BLOCKED','e','triage','A1','196+ awards-T0100','2026-05-01'),
          ('H_JUNK','f','triage','A1','Created by Glide','2026-06-01'),
          ('H_NONE','g','triage','A1',NULL,'2026-07-01');
        INSERT INTO stories (id, title, status, account_id, ref, created_at) VALUES
          ('S1','s1','open','A1','Alpha-S0003','2026-01-01'),
          ('S2','s2','open','A2','Beta-S0003','2026-02-01');
        INSERT INTO sprints (id, name, account_id, ref, created_at) VALUES
          ('SP1','sp1','A1','Alpha-SPR0002','2026-01-01');
        INSERT INTO todos (id, account_id, title, ref, created_at) VALUES
          ('TD1','A1','t1','TEST-D0001','2026-01-01');
      `)
    }

    it("leaves no stored reference the formula would not have made", () => {
      const db = dbBeforeTheBackfill()
      seed(db)
      runBackfill(db)
      const wrong: string[] = []
      for (const name of KIND_NAMES) {
        const table = TEAM_REF_TABLES[name]
        const kind = TEAM_REF_KINDS[name]
        const rows = db.prepare(`SELECT id, ref FROM ${table} WHERE ref IS NOT NULL`).all() as {
          id: string
          ref: string
        }[]
        for (const r of rows) {
          if (refNumber(kind, r.ref) === null) wrong.push(`${table}.${r.id} = ${r.ref}`)
        }
      }
      expect(
        wrong,
        "after the backfill these rows still hold a string `canonicalRef` would never produce — which " +
          "is the state the whole estate was in on 7 Sep 2026, under a green build"
      ).toEqual([])
      // THE TRIPWIRE FOR THIS CLAUSE: a backfill that matched nothing would pass
      // the assertion above trivially. It has to have actually moved rows.
      const moved = db.prepare(`SELECT COUNT(*) AS n FROM ${REF_ALIAS_TABLE}`).get() as { n: number }
      // Five tickets (the canonical one and the reference-less one are correctly
      // left alone), two stories, one sprint, one input.
      expect(moved.n, "the backfill rewrote nothing at all — it is not reading the seeded rows").toBe(9)
    })

    it("keeps the number where the number is free and reissues where it is not", () => {
      const db = dbBeforeTheBackfill()
      seed(db)
      runBackfill(db)
      const ref = (id: string) =>
        (db.prepare("SELECT ref FROM help WHERE id = ?").get(id) as { ref: string | null }).ref

      // PRESERVED: nobody else wanted 1, so the shape changes and the number
      // does not. This is 89% of tickets on staging and it is the whole reason
      // "reissue everything" was the wrong answer.
      expect(ref("H_OLD"), "the oldest claimant keeps the number").toBe("T0001")
      // REISSUED: the SAME number under the old per-account scheme. The seat goes
      // to the older row (Jan beats Feb), and this one is carried above the
      // high-water mark rather than colliding on `idx_help_ref`.
      expect(ref("H_CLASH")).toBe("T0101")
      // An account name with a hyphen in it is not a parse problem: the number is
      // read off the END of the string and the prefix is never read at all.
      expect(ref("H_HYPHEN")).toBe("T0009")
      // A row that ALREADY wore the formula is untouched…
      expect(ref("H_NEW"), "a canonical reference is left exactly alone").toBe("T0100")
      // …and it BLOCKS the old row that wanted its number, which is the case a
      // collision check that only looked at the stale rows would have missed.
      expect(ref("H_BLOCKED")).toBe("T0102")
      // A value with no number in it at all cannot preserve one.
      expect(ref("H_JUNK")).toBe("T0103")
      // A row that never had a reference does not gain one — five of the seven
      // kinds mint nothing without a client, and inventing one here would put a
      // number on a ticket the client was never given.
      expect(ref("H_NONE")).toBeNull()
    })

    it("keeps the old string, pointing at the row and at what replaced it", () => {
      const db = dbBeforeTheBackfill()
      seed(db)
      runBackfill(db)
      const row = db
        .prepare(`SELECT * FROM ${REF_ALIAS_TABLE} WHERE entity_table = 'help' AND alias = ?`)
        .get("Beta-T0001") as Record<string, string>
      expect(row, "the string a client was quoted is not recoverable — the rewrite is one-way").toBeTruthy()
      expect(row.row_id).toBe("H_CLASH")
      expect(row.replaced_by).toBe("T0101")
      expect(row.kind).toBe(TEAM_REF_KINDS.ticket)
      expect(row.source, "an alias says which act retired it, so the data explains itself").toBe(BACKFILL)
      // Every kind, not just the one this test reads by name.
      const tables = db
        .prepare(`SELECT DISTINCT entity_table FROM ${REF_ALIAS_TABLE} ORDER BY entity_table`)
        .all() as { entity_table: string }[]
      expect(tables.map((t) => t.entity_table)).toEqual(["help", "sprints", "stories", "todos"])
    })

    it("leaves no counter able to mint a number a row already has", () => {
      const db = dbBeforeTheBackfill()
      seed(db)
      // The counter AHEAD of every row it has — staging's real state: 167 ticket
      // numbers minted and not one row left to show for them. A backfill that
      // "reconciled" by setting the counter to match the rows would re-mint
      // numbers already handed out.
      db.exec(`INSERT INTO team_ref_counters (kind, next_no) VALUES ('T', 168), ('B', 2);`)
      runBackfill(db)
      for (const name of KIND_NAMES) {
        const table = TEAM_REF_TABLES[name]
        const kind = TEAM_REF_KINDS[name]
        const top = db
          .prepare(`SELECT MAX(${refNumberSql("ref")}) AS n FROM ${table} WHERE ref IS NOT NULL`)
          .get() as { n: number | null }
        if (top.n == null) continue
        const counter = db
          .prepare("SELECT next_no FROM team_ref_counters WHERE kind = ?")
          .get(kind) as { next_no: number } | undefined
        expect(
          counter?.next_no ?? 0,
          `the ${kind} counter would mint ${counter?.next_no}, and a row already holds ${top.n} — the ` +
            "next record created after this migration collides on a live unique index"
        ).toBeGreaterThan(top.n)
      }
      // AND IT ONLY EVER GOES UP. The ticket counter stood at 168 with nothing to
      // show for it; the rows now reach 103, so a "reconcile to the rows" would
      // have dragged it back down over numbers already issued.
      const t = db.prepare("SELECT next_no FROM team_ref_counters WHERE kind = 'T'").get() as {
        next_no: number
      }
      expect(t.next_no, "the counter was lowered, re-minting numbers already handed out").toBeGreaterThanOrEqual(168)
    })

    it("changes nothing the second time it runs", () => {
      const db = dbBeforeTheBackfill()
      seed(db)
      runBackfill(db)
      const snap = () => ({
        help: db.prepare("SELECT id, ref FROM help ORDER BY id").all(),
        stories: db.prepare("SELECT id, ref FROM stories ORDER BY id").all(),
        sprints: db.prepare("SELECT id, ref FROM sprints ORDER BY id").all(),
        todos: db.prepare("SELECT id, ref FROM todos ORDER BY id").all(),
        aliases: db.prepare(`SELECT entity_table, alias, replaced_by FROM ${REF_ALIAS_TABLE} ORDER BY entity_table, alias`).all(),
        counters: db.prepare("SELECT kind, next_no FROM team_ref_counters ORDER BY kind").all(),
      })
      const first = JSON.stringify(snap())
      runBackfill(db)
      expect(
        JSON.stringify(snap()),
        "a migration that rewrites identifiers is very close to irreversible, so running it twice — a " +
          "half-finished rollout, a re-run after a timeout — must be a no-op"
      ).toBe(first)
    })

    // ── AND THE GENERIC ENGINE FINDS WHAT THE BACKFILL RENAMED ──────────────
    //
    // The clause above proves the DECLARATION. This proves the BEHAVIOUR, and it
    // has to: a type-check on a boolean flag says nothing about whether a row
    // comes back. So the real migration ledger is replayed, the rows staging
    // actually held are seeded and carried, a filter is parsed by the engine's
    // own `parseQuery`, compiled by the engine's own `readWhere` — the ONE clause
    // its rows, its exact total and its grouped counts are all built from — and
    // executed against the real SQLite handle.
    //
    // `readWhere` is exported for exactly this. A law that read the engine's
    // source instead would have been green on the day the engine was blind.
    describe("the query engine's own WHERE, run over the carried data", () => {
      const TICKETS = QUERY_MODULES.tickets
      /** The engine's answer to one filter, as row ids. `fence` is what the
       * caller's SECOND right leaves them — null when they hold it. */
      function ask(
        db: DatabaseSync,
        where: unknown[],
        fence: Fence = null
      ): string[] {
        const parsed = parseQuery(TICKETS, { where })
        const clause = readWhere(TICKETS, parsed, QUERY_MODULES, fence)
        const rows = db
          .prepare(`SELECT t.id FROM ${TICKETS.table} t WHERE ${clause.sql} ORDER BY t.id`)
          .all(...(clause.params as string[])) as { id: string }[]
        return rows.map((r) => r.id)
      }

      function carried(): DatabaseSync {
        const db = dbBeforeTheBackfill()
        seed(db)
        runBackfill(db)
        return db
      }

      it("a filter carrying the number a client was QUOTED finds the record", () => {
        const db = carried()
        // H_CLASH is the row that lost its seat: it was `Beta-T0001` and the
        // backfill reissued it as `T0101` (the older claimant kept 1). Its old
        // string is the one most likely to be in somebody's inbox, and the one
        // that used to come back as "no such record" on this surface alone.
        expect(
          db.prepare(`SELECT replaced_by FROM ${REF_ALIAS_TABLE} WHERE alias = ?`).get("Beta-T0001"),
          "the fixture must really have retired that string, or the query below proves nothing"
        ).toEqual({ replaced_by: "T0101" })

        expect(ask(db, [{ field: "reference", op: "eq", value: "Beta-T0001" }])).toEqual(["H_CLASH"])
        // The word the app's own prose uses, the field's own name, and a
        // SUBSTRING of the retired string — the shape a search box sends.
        expect(ask(db, [{ field: "ref", op: "eq", value: "beta-t0001" }])).toEqual(["H_CLASH"])
        expect(ask(db, [{ field: "ref", op: "contains", value: "Beta-" }])).toEqual(["H_CLASH"])
        // THE CONTROL: the number it wears NOW still answers, and a string
        // nobody ever wore still does not.
        expect(ask(db, [{ field: "ref", op: "eq", value: "T0101" }])).toEqual(["H_CLASH"])
        expect(ask(db, [{ field: "ref", op: "eq", value: "Gamma-T0001" }])).toEqual([])
      })

      it("…and every kind the backfill touched, not just the one read by name", () => {
        const db = carried()
        const aliases = db
          .prepare(`SELECT entity_table, alias, row_id FROM ${REF_ALIAS_TABLE} ORDER BY alias`)
          .all() as { entity_table: string; alias: string; row_id: string }[]
        expect(aliases.length, "nine retired strings, across four tables").toBe(9)
        // Every module in the grammar that publishes a renumbered field, asked
        // for every string the backfill retired on ITS table. Derived from the
        // data rather than listed, so a kind added tomorrow is covered here the
        // moment its migration writes an alias row.
        let asked = 0
        for (const [, mod] of Object.entries(QUERY_MODULES)) {
          const field = mod.fields.find((f) => f.renumbered)
          if (!field) continue
          for (const a of aliases.filter((x) => x.entity_table === mod.table)) {
            const parsed = parseQuery(mod, { where: [{ field: field.name, op: "eq", value: a.alias }] })
            const clause = readWhere(mod, parsed, QUERY_MODULES, null)
            const rows = db
              .prepare(`SELECT t.id FROM ${mod.table} t WHERE ${clause.sql}`)
              .all(...(clause.params as string[])) as { id: string }[]
            expect(
              rows.map((r) => r.id),
              `${mod.table}: the string "${a.alias}" no longer finds the record it was retired from`
            ).toEqual([a.row_id])
            asked++
          }
        }
        expect(asked, "the loop asked nothing — every renumbered module lost its aliases").toBe(9)
      })

      it("THE FENCE STILL DECIDES: an old number reaches no row a live one would not", () => {
        const db = carried()
        // The caller's own clause is BRACKETED before either subtraction is
        // ANDed on (`readWhere`), so the alias `OR` widens which rows answer the
        // QUESTION and never which rows the caller may see. Proved with the two
        // subtractions the engine has, on the same row, with the same filter —
        // the only thing that changes between a hit and a miss is the fence.
        const found = [{ field: "reference", op: "eq", value: "Beta-T0001" }]
        expect(ask(db, found), "the positive control: unfenced, the row comes back").toEqual([
          "H_CLASH",
        ])

        // 1 · THE SECOND RIGHT. H_CLASH belongs to account A2; a caller narrowed
        // to A1 must not reach it by the number it used to have, exactly as they
        // cannot by the number it has now.
        expect(ask(db, found, { column: "account_id", value: "A1" })).toEqual([])
        expect(ask(db, [{ field: "ref", op: "eq", value: "T0101" }], { column: "account_id", value: "A1" })).toEqual([])
        expect(
          ask(db, found, { column: "account_id", value: "A2" }),
          "and their OWN side of the fence is unaffected — a fence that refused everybody would " +
            "pass the two assertions above and be a broken door rather than a fence"
        ).toEqual(["H_CLASH"])

        // 2 · WHAT THE MODULE NO LONGER ANSWERS ABOUT AT ALL, which has no escape
        // even for a caller who names it. A requirements ticket has LEFT the
        // tickets collection everywhere a person is answered; an alias must not
        // be a way back in.
        db.exec(`UPDATE help SET help_type = 'Requirements' WHERE id = 'H_CLASH';`)
        expect(ask(db, found)).toEqual([])
        expect(ask(db, [{ field: "ref", op: "eq", value: "T0101" }])).toEqual([])
      })

      it("a table the backfill left alone is not searched as though it had a history", () => {
        // `tasks` holds old `<account>-K####` strings that 0068 deliberately did
        // not carry, so `ref_aliases` has nothing for it. The engine must ask
        // the column and nothing else — and the proof is that a row planted in
        // the alias table under that name changes no answer.
        const db = carried()
        db.exec(`
          INSERT INTO tasks (id, ref, title, status, created_at)
            VALUES ('K1', 'K0009', 'Renew the domain', 'open', '2026-05-01T00:00:00.000Z');
          INSERT INTO ${REF_ALIAS_TABLE} (entity_table, alias, row_id, kind, replaced_by, retired_at, source)
            VALUES ('tasks', 'Kwapso-K0009', 'K1', 'K', 'K0009', '2026-09-07T00:00:00.000Z', 'a hand');
        `)
        const tasks = QUERY_MODULES.tasks
        const idsFor = (value: string): string[] => {
          const parsed = parseQuery(tasks, { where: [{ field: "ref", op: "eq", value }] })
          const clause = readWhere(tasks, parsed, QUERY_MODULES, null)
          return (
            db
              .prepare(`SELECT t.id FROM ${tasks.table} t WHERE ${clause.sql}`)
              .all(...(clause.params as string[])) as { id: string }[]
          ).map((r) => r.id)
        }
        expect(idsFor("K0009"), "the control: the task is really there").toEqual(["K1"])
        expect(
          idsFor("Kwapso-K0009"),
          "the engine consulted the alias table for a field that declares no history — the flag " +
            "is not what decides, and a column NAME is"
        ).toEqual([])
      })
    })

    it("is a no-op on a newborn team, which replays the whole ledger", () => {
      const db = freshTeamDb()
      const aliases = db.prepare(`SELECT COUNT(*) AS n FROM ${REF_ALIAS_TABLE}`).get() as { n: number }
      expect(aliases.n, "a fresh database has nothing to carry, so the backfill must write nothing").toBe(0)
      const counters = db.prepare("SELECT COUNT(*) AS n FROM team_ref_counters").get() as { n: number }
      expect(
        counters.n,
        "a newborn team was given counter rows for kinds it has never minted — `HAVING COUNT(*) > 0` " +
          "is what keeps the backfill silent where there is nothing to reconcile"
      ).toBe(0)
    })
  })
})
