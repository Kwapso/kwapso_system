// D1 REFUSES A STATEMENT CARRYING MORE THAN 100 BOUND PARAMETERS.
//
// Every other suite in this repo runs its SQL against local SQLite, whose limit
// is 999. That makes the harness MORE permissive than the thing it stands in
// for, so a statement that binds 200 values passes every test and 500s in
// production. It did: `GET /api/content/knowledge/ask` asked for its candidate
// rows as `IN (?, ?, …)` with one id bound per candidate, up to CANDIDATE_CAP
// (200), and the top-up fills the candidate set to the cap on any question the
// lexical stage does not already answer. So every question against a base of
// more than a hundred chunks came back "Something went wrong on our side", and
// the door had never once answered on real infrastructure.
//
// This suite reads the source off disk and refuses the shape that caused it: a
// `?` placeholder generated per element of a list whose length is bounded by
// something larger than D1's cap. Server-owned ids go through `sqlString` like
// every other server-owned value (CONVENTIONS); values off a request stay bound,
// and stay under the cap.
//
// IT USED TO WALK ONE WORKER, AND THAT WAS THE HOLE. `SRC` was
// `workers/content/src` — the worker the first bug happened in — so the check
// read like a repo-wide law and was actually one directory. Four statements
// outside it had the same shape and worse bounds, and the scaling review found
// them under a green build:
//   • the ACCOUNT FENCE (shared/workers/account-scope.ts) bound one parameter per
//     account in reach — SCOPE_HARD_CAP is 500 — and `accountActivityClause`
//     bound the same set THREE times in one statement, so a client login standing
//     at a company with 34 businesses under it could not read its own activity
//     feed, and one with 101 could not read anything at all;
//   • the portal switcher bound one per root off a read that had no LIMIT;
//   • `withEmails` bound one per row of a list capped at LIST_HARD_CAP (1,000);
//   • the ticket-stakeholder lookup bound one per watcher, capped at 500.
// So the scan now walks EVERY worker's src plus shared/, and the vouching list
// below is keyed by file as well as by variable — a bound is only a bound if you
// can name it, and "the same variable name is fine somewhere else" is how a list
// of exceptions stops meaning anything.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { sourceFiles } from "@shared/rules/source-scan"
import { CRON_ALERT_CAP, D1_MAX_BOUND_PARAMS, PORTAL_ROOTS_CAP, STORY_PROCESS_CAP } from "@shared/workers/limits"

const SRC = join(__dirname, "..", "src")
const REPO = join(__dirname, "..", "..", "..")

/** Every directory a statement can be written in: the six brains, the two
 * gateways, and the shared seams they all call. */
const SCANNED = [
  join(REPO, "shared"),
  ...["auth", "content", "data-ops", "gateway", "mcp", "portal-gateway", "realtime", "tenancy"].map(
    (w) => join(REPO, "workers", w, "src")
  ),
]

describe("no statement can bind more parameters than D1 accepts", () => {
  it("the knowledge candidate fetch interpolates its ids, it does not bind them", () => {
    const src = readFileSync(join(SRC, "lib", "knowledge.ts"), "utf8")
    const fetchStmt = src.slice(src.indexOf("FROM knowledge_chunks c JOIN knowledge_sources s"))
    const line = fetchStmt.slice(0, fetchStmt.indexOf("LIMIT"))
    expect(
      line,
      "the candidate fetch must interpolate server-owned chunk ids through sqlString — " +
        "binding one per candidate exceeds D1's 100-parameter cap and 500s the whole door"
    ).toContain("sqlString(id)")
    expect(line, "and it must not generate a placeholder per candidate").not.toContain('map(() => "?")')
  })

  it("the account fence interpolates its ids — it is the widest list in the base", () => {
    const src = readFileSync(join(REPO, "shared", "workers", "account-scope.ts"), "utf8")
    expect(
      src,
      "accountScopeClause and accountActivityClause must render their account ids through " +
        "sqlString (idList). Binding them is bounded only by SCOPE_HARD_CAP (500), and the " +
        "activity clause carries the set three times — so it fails at 34 accounts, on every " +
        "fenced read a client login makes."
    ).not.toContain('map(() => "?")')
    expect(src, "and the ids must go through the one escaping seam").toContain("sqlString(id)")
  })

  it("every per-element placeholder list is one that provably cannot reach the cap", () => {
    // A `xs.map(() => "?")` is safe only while `xs` cannot outgrow D1's limit.
    // Rather than guess from each file's constants — which flags the safe lists
    // alongside the dangerous ones — this names each surviving list, WHERE it is,
    // and why it is small. A new one turns the build red until somebody says
    // which it is.
    const KNOWN_SMALL: Record<string, string> = {
      // PROVEN BY CONSTRUCTION, which is the strongest kind here: `batch` is not
      // a list somebody bounded, it is what `idBatches` HANDS BACK, and that
      // helper's whole job is to cut a list into pieces of at most
      // D1_MAX_BOUND_PARAMS minus the reserved parameters. The door passes
      // `reserved = 2` (the timestamp and the note), so a batch is at most 98 and
      // the statement binds at most 100. workers/data-ops/test/error-signature.test.ts
      // asserts the arithmetic against a full RESOLVE_SCAN_CAP scan, and asserts
      // the door actually calls the helper rather than binding the lot.
      "data-ops/src/routes/admin.ts: batch":
        "one page of idBatches(ids, 2) — bounded by the helper itself at D1_MAX_BOUND_PARAMS − 2 (98)",
      "content/src/lib/knowledge.ts: terms":
        "a question's search terms, capped at MAX_QUESTION_TERMS (24)",
      // A CONSTANT ARRAY, not a runtime list: MEASUREMENT_SOURCES is declared
      // literally in shared/workers/error-log.ts and holds one entry today. It
      // names the recording seams whose rows are measurements rather than
      // exceptions, so it grows only when somebody adds such a seam by hand —
      // it can never take a length from a request, a team's data or a page of
      // ids, which is the shape this suite exists to catch. Two queries bind it,
      // each alongside one or two dates, so the ceiling is its length plus 2.
      "tenancy/src/lib/ops-alert.ts: MEASUREMENT_SOURCES":
        "the literal list of measurement recording seams in shared/workers/error-log.ts (1 today); grows only by hand-editing that constant",
      // The digit-bearing SUBSET of one BATCH's terms (d-lexical-branch-limit —
      // lexicalArm now runs one query per ≤LEXICAL_MAX_BRANCHES (5) terms, not
      // one for the whole question), bound a second time so the exact-term
      // bypass can name it within that batch. A subset of a list capped at 5 is
      // capped at 5 — tighter than the old MAX_QUESTION_TERMS (24) bound, since
      // batching means no single statement ever sees more than 5 terms at once.
      "content/src/lib/knowledge.ts: rareInBatch":
        "the digit-bearing terms within ONE lexicalArm batch — a subset of that batch's own terms, so LEXICAL_MAX_BRANCHES (5) bounds it, tighter than MAX_QUESTION_TERMS ever did",
      "content/src/lib/knowledge.ts: compartments":
        "the compartments searched — the agency's plus at most one client",
      // NOT proven, ADMITTED — and now with the number that makes it survivable.
      // notify.ts binds one parameter per user id against the global core DB.
      // `lookupUsers` is fed a ticket's raiser plus its @mentions, and mentions
      // are capped at MENTIONS_LIMIT (50), so the list is ≤51. `accountInboxes`
      // reads its grants under `LIMIT 100`, which is the cap exactly and no
      // headroom — recorded here rather than quietly passing, because a cap that
      // equals the ceiling is one edit from crossing it.
      "content/src/lib/notify.ts: unique":
        "a ticket's raiser plus its mentions — MENTIONS_LIMIT (50) bounds the list at 51",
      "content/src/lib/notify.ts: ids":
        "the account's portal grants, bounded by the read's own LIMIT 100 — exactly at the cap",
      // PROVEN: the sync-state read names INGEST_KINDS (three, fixed in code)
      // plus the caller's own Google state keys (GOOGLE_SERVICES, four, fixed in
      // code). Seven, and neither list can grow without an edit to a `const`.
      "content/src/lib/knowledge-ingest.ts: keys":
        "the ingest state keys — INGEST_KINDS (3) plus one per GOOGLE_SERVICE (4), both fixed at author time",
      // PROVEN BY THE VOCABULARY, and by the door that parses it. The ticket
      // list's stage filter became a SET on 2026-09-06 (the client's Open tab
      // names three stages at once), so `statusClause` binds one parameter per
      // stage asked for. The list it can be handed is not free text: the route
      // splits the `status` parameter, KEEPS ONLY words that are in
      // HELP_STATUSES (6, fixed in code) and de-dupes what survives, so the
      // longest possible list is every status exactly once. Six parameters,
      // and the only way past it is adding statuses to shared/types.ts — an edit
      // to a `const`, ninety-four of them away from the cap.
      "content/src/lib/help.ts: statuses":
        "the stage set the ticket list narrows by — the route keeps only HELP_STATUSES members (6) and de-dupes them, so the list cannot exceed the vocabulary",
      "content/src/lib/ready-flip.ts: FLIPPABLE":
        "a module-level constant: the ticket statuses a Ready flip may move from. " +
        "Derived from HELP_STATUSES, fixed at author time.",
      // The same shape, one function along: `flip` takes the states an automatic
      // move may claim, and every caller passes a module-level constant
      // (SCHEDULABLE, STARTABLE) derived from HELP_STATUSES. There is no call
      // site that hands it a list a request supplied.
      "content/src/lib/ready-flip.ts: from":
        "the ticket statuses an automatic flip may move OUT of — SCHEDULABLE / STARTABLE, " +
        "both module-level constants derived from HELP_STATUSES",
      // PROVEN by the cap the caller checks one line above the statement:
      // `resolveProcesses` refuses past STORY_PROCESS_CAP before it builds the
      // list, so the placeholder count cannot exceed 20.
      "content/src/lib/stories.ts: unique":
        `the processes one story links to, capped at STORY_PROCESS_CAP (${STORY_PROCESS_CAP}) by the door itself`,
      // The resolution email's two named recipients, read back out of the core
      // database. Bounded by the read that produced the ids: the portal-grant
      // lookup carries `LIMIT 100`, and the set is de-duped before it is bound.
      // PROVEN by the read that produced the list: the attendee addresses come
      // off ONE calendar entry, and the calendar layer caps those at
      // EVENT_ATTENDEE_CAP (50) before this file ever sees them. De-duped and
      // lower-cased first, so the placeholder count is at most fifty.
      "content/src/lib/meetings.ts: list":
        "one calendar entry's attendee addresses, capped at EVENT_ATTENDEE_CAP (50) by the read that fetched them",
      "content/src/lib/notify.ts: list":
        "the resolution's recipients — the raiser and the main stakeholder, from a read bounded at LIMIT 100",
      // PROVEN by the cap the DOOR applies before the lib is ever called:
      // routes/processes.ts refuses a staff or stakeholder list longer than
      // APP_PEOPLE_CAP (50), and the write binds nine audit values beside it —
      // fifty-nine, with headroom against D1's hundred.
      "tenancy/src/lib/processes.ts: wanted":
        "the people named on one app, capped at APP_PEOPLE_CAP (50) by the door before the lib sees it",
      "content/src/lib/stakeholders.ts: batch":
        "one slice of idBatches — bounded BY D1_MAX_BOUND_PARAMS itself, which is the point of it",
      "tenancy/src/routes/accounts.ts: batch":
        "the same: a slice of idBatches, bounded by the cap it exists to respect",
      // The third one, and the one that proves the suite earns its keep: the
      // "who here is a client login" read (R29's front-door decision) started
      // life bound over its whole list, which was fine for a ticket's fifty
      // mentions and five times D1's ceiling for the morning digest's five
      // hundred team members. This suite caught it before it shipped.
      "shared/workers/record-link.ts: batch":
        "a slice of idBatches again — bounded BY D1_MAX_BOUND_PARAMS itself, which is the point of it",
      // PROVEN, and by the caller's own ceiling rather than by a claim: the size
      // alarm reads the growth trend for the databases that crossed 80% TONIGHT,
      // and `checkDatabaseSizes` stops writing alarms at CRON_ALERT_CAP (50). The
      // relationship is asserted directly in
      // `workers/tenancy/test/size-alert-delivery.test.ts`, so the day somebody
      // raises the alarm ceiling past D1's, that suite goes red too.
      "tenancy/src/lib/sharding.ts: alerted":
        `the databases that alarmed tonight, capped at CRON_ALERT_CAP (${CRON_ALERT_CAP})`,
      "tenancy/src/lib/accounts.ts: scope.roots":
        `the portal switcher's companies, capped at PORTAL_ROOTS_CAP (${PORTAL_ROOTS_CAP}) by ROOTS_SQL`,
      // The vocabulary GROUPS one query module declares — derived from that
      // module's own `vocabulary` markers in QUERY_MODULES, fixed at author time.
      // The largest module declares two.
      "tenancy/src/routes/query.ts: groups":
        "the dropdown groups one query module names — one per `vocabulary` marker in its own field list, fixed at author time",
      "tenancy/src/lib/activity-read.ts: allowedTables":
        "the modules a caller may read — one per TEAM_MODULES entry, fixed at author time",
      "tenancy/src/lib/work-engine.ts: BORROWED":
        "a module-level constant: the tables the work engine borrows. Fixed at author time.",
      // A column list, not an id list: bounded by the table's own shape, and D1
      // caps a table at 100 columns anyway — so the schema cannot make this fail
      // without failing first for a different reason.
      "tenancy/src/lib/accounts.ts: cols": "one placeholder per COLUMN — D1 caps a table at 100 of them",
      "tenancy/src/lib/processes.ts: cols": "the same: one per column, and a table may not have 101",
    }
    const found: string[] = []
    for (const dir of SCANNED)
      for (const file of sourceFiles(dir, { extensions: [".ts"] }))
        for (const m of file.source.matchAll(/([\w.]+)\.map\(\(\) => "\?"\)/g)) {
          // `file.rel` is relative to each scanned root, so re-key it on the
          // worker (or shared/) it came from — two workers may hold the same
          // relative path and must not vouch for each other's lists.
          const root = dir.slice(REPO.length + 1).replace(/^workers\//, "")
          found.push(`${root}/${file.rel}: ${m[1]}`)
        }
    const unexplained = found.filter((f) => !KNOWN_SMALL[f])
    expect(
      unexplained,
      `a statement generates one bound placeholder per element of a list this suite cannot vouch ` +
        `for. D1 refuses past ${D1_MAX_BOUND_PARAMS} parameters. Either prove the list is small and ` +
        `add it to KNOWN_SMALL with its bound, interpolate server-owned values through sqlString, or ` +
        `batch it with idBatches:\n` +
        unexplained.join("\n")
    ).toEqual([])

    // And the caps that make those safe must stay under the limit.
    const src = readFileSync(join(SRC, "lib", "knowledge.ts"), "utf8")
    const maxTerms = Number(/const MAX_QUESTION_TERMS = (\d+)/.exec(src)?.[1] ?? "0")
    expect(maxTerms, "MAX_QUESTION_TERMS must stay under D1's parameter cap").toBeGreaterThan(0)
    // d-lexical-branch-limit: the lexical arm no longer binds one statement for
    // the WHOLE question — it batches at LEXICAL_MAX_BRANCHES (5, the measured
    // D1 compound-SELECT ceiling, not the parameter one), so no single
    // statement ever sees more than 5 terms. TWICE, because each batch's
    // statement binds that batch's own term list AND its exact subset.
    const maxBranches = Number(/const LEXICAL_MAX_BRANCHES = (\d+)/.exec(src)?.[1] ?? "0")
    expect(maxBranches, "LEXICAL_MAX_BRANCHES must stay under D1's parameter cap too").toBeGreaterThan(0)
    expect(
      2 * maxBranches,
      "one lexicalArm batch binds LEXICAL_MAX_BRANCHES twice — that batch's terms and their exact subset"
    ).toBeLessThan(D1_MAX_BOUND_PARAMS)
    expect(
      PORTAL_ROOTS_CAP,
      "PORTAL_ROOTS_CAP must stay under D1's parameter cap — the switcher binds one per root"
    ).toBeLessThan(D1_MAX_BOUND_PARAMS)
    expect(
      STORY_PROCESS_CAP,
      "STORY_PROCESS_CAP must stay under D1's parameter cap — the proof binds one per process"
    ).toBeLessThan(D1_MAX_BOUND_PARAMS)
    expect(
      CRON_ALERT_CAP,
      "CRON_ALERT_CAP must stay under D1's parameter cap — the size alarm binds one per alarming database"
    ).toBeLessThan(D1_MAX_BOUND_PARAMS)
  })
})
