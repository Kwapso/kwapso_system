// THE REFERENCE NUMBER — the short code a client quotes on the phone and in
// every email we send them. One shape, team-wide, after the client's
// 2026-08-31 ruling and its own follow-up a moment later:
//
//  • THE TEAM-WIDE SHAPE — "T412", "B188", "S12", "M9", "A3", "W1", "I7" — a
//    single sequence PER KIND, shared by every account in the team, with no
//    account code anywhere in the string. Tickets, stories, sprints,
//    meetings, apps, waves and now the client-facing INPUT (né to-do) all
//    wear this.
//
//    WHY TEAM-WIDE AND NOT PER-ACCOUNT (the design question the client left
//    open): once the account code is gone from the string, two different
//    clients' tickets can both mint "T0001" and print IDENTICALLY wherever
//    they meet — and they do meet. `tickets-collection.tsx`'s `TriageQueue`
//    is a personal, CROSS-ACCOUNT list ("yours, unread") rendered as
//    `ref + description` with nothing naming the account on the row at all;
//    a triager scanning that queue would see two unrelated "T0001"s with no
//    way to tell them apart short of opening both. Sprint and meeting detail
//    screens DO carry an account chip next to their own black ID chip, but
//    the ticket queue does not, and a scheme has to be safe on its worst
//    screen, not its best one. Per-TEAM counters (one row per kind — the
//    team's own database already IS the tenant boundary, so "per team" here
//    is simply "no account_id in the key") make that collision structurally
//    impossible instead of merely unlikely, at the cost of a continuity
//    ("which account is busiest") nobody had asked to keep once the prefix
//    carrying it was the thing being removed.
//
//  • THE OLD ACCOUNT-CODED SHAPE — "BERG-D0412" — IS GONE FROM THE MINT, AND
//    UNTIL 7 SEP 2026 THIS COMMENT SAID IT WAS GONE FULL STOP. That sentence
//    was false for six days and it is worth leaving the correction in rather
//    than quietly rewriting it, because the way it became false is the reason
//    R55 exists.
//
//    The 2026-08-31 ruling changed the MINT. Migrations 0059 and 0060 gave
//    `apps` and `waves` a `ref` column, built `team_ref_counters` and dropped
//    `ref_counters` — and not one of them rewrote a single stored value. So
//    every row that already had a reference kept the old string, and on
//    7 Sep 2026 the client was reading `VU Solutions-T1183` and
//    `FluClinic-T0001` off her own screens while this file said the shape
//    behind them did not exist. Measured on staging the same morning: 1,896
//    ticket references, 275 story, 100 sprint, 45 meeting, 1 input — every
//    single one of them account-coded, and not one row in the whole estate
//    carrying the shape described above except the two the smoke team minted.
//
//    Migration `0068_the_reference_keeps_its_old_name` is the rewrite, on the
//    client's 2026-09-07 ruling ("alias yes"): every stored reference is
//    carried to the shape below, and the string it used to wear is kept in
//    `ref_aliases` so a number a client quoted in an email last year still
//    finds the record. `nextTeamRef` mints; the migration carries; and R55
//    (`refs-match-the-formula`, web/test/refs-match-the-formula.test.ts) is
//    the law that stops the DATA and the FORMULA drifting apart a second time
//    — because the formula living only inside a minting function is exactly
//    how nobody noticed for six days.
//
//    The to-do (now called Input on both screens) was the one holdout when the
//    2026-08-31 ruling landed, kept back only because the client had not named
//    it yet. She has now: Input mints team-wide with kind `I`, the same door
//    every other kind uses, and `ref_counters` — the table that carried
//    nothing but the to-do's counter after that first ruling — is dropped
//    outright (migration 0060). There is no second live shape to keep in step.
//
// The shape keeps the SAME race-safety this file has always relied on: ONE
// statement, `INSERT … ON CONFLICT DO UPDATE … RETURNING`, so two callers
// minting the same kind at once are serialised by the database rather than by
// a read-then-write (CONCURRENCY.md rule 1: the counter rides the write).

import { d1Query, type D1Rest } from "./d1-rest"
import type { MemberGuard } from "./gating"

/** The kinds minted TEAM-WIDE, with no account code anywhere in the string.
 * `story` and `sprint` swapped letters in the 2026-08-31 ruling — story is now
 * `B` (its old `S` went to sprint, which dropped the three-letter `SPR`) —
 * `app`/`wave` gained a reference for the first time in that same ruling, and
 * `input` (the client-facing to-do) joined a moment later, on the client's own
 * follow-up naming it. */
export const TEAM_REF_KINDS = {
  ticket: "T",
  story: "B",
  sprint: "S",
  meeting: "M",
  app: "A",
  wave: "W",
  input: "I",
} as const
export type TeamRefKindName = keyof typeof TEAM_REF_KINDS
export type TeamRefKind = (typeof TEAM_REF_KINDS)[TeamRefKindName]

/** WHERE EACH KIND'S NUMBER IS ACTUALLY STORED, and the only place that fact is
 * written down.
 *
 * It used to be written down nowhere, which is a smaller-sounding problem than
 * it is. `nextTeamRef` returns a string and its caller decides which column to
 * put it in, so "which tables hold a reference" was a question you could only
 * answer by reading six libraries in two workers and remembering the seventh.
 * The 7 Sep 2026 backfill needed exactly that list, R55 needs it to census the
 * schema against, and the doors need it to find an alias — three readers, and
 * a hand-typed list would have been three chances to disagree.
 *
 * `Record<TeamRefKindName, string>` is the load-bearing part of the type: add a
 * kind above and `tsc` refuses this file until the table is named, so the map
 * cannot fall behind the kinds. R55's census closes it the other way round —
 * a table that grows a `ref` column and is named neither here nor in the
 * reasoned residue turns the build red. */
export const TEAM_REF_TABLES: Record<TeamRefKindName, string> = {
  ticket: "help",
  story: "stories",
  sprint: "sprints",
  meeting: "meetings",
  app: "apps",
  wave: "waves",
  // The client-facing Input still lives in the table the to-do was born in.
  // DATA-MODEL.md § todos says why the table was not renamed with the product
  // word: the same reason `help` is still `help` behind the Tickets screens.
  input: "todos",
}

/** The same map keyed by the LETTER, which is what SQL and a stored row carry.
 * Derived rather than typed twice. */
export const REF_TABLE_BY_KIND = Object.fromEntries(
  (Object.keys(TEAM_REF_KINDS) as TeamRefKindName[]).map((name) => [
    TEAM_REF_KINDS[name],
    TEAM_REF_TABLES[name],
  ])
) as Record<TeamRefKind, string>

/** THE TABLE THAT REMEMBERS WHAT A RECORD USED TO BE CALLED. One row per
 * retired string (migration 0068). Named here rather than spelled into five
 * queries, for the reason every other constant in this file exists. */
export const REF_ALIAS_TABLE = "ref_aliases"

/** How wide a reference's number prints. Four, since the first counter — see
 * `canonicalRef`, which is the only place it is applied. */
export const REF_PAD = 4

/** THE FORMULA, and the whole point of it being a function.
 *
 * It was a template literal inside `nextTeamRef` until 7 Sep 2026, which means
 * the rule "a reference looks like this" existed only at the moment one was
 * minted. Nothing could ask the question afterwards — not a migration, not a
 * door, not a test — so the stored data drifted away from the mint and the
 * only thing that noticed was the client, six days later, reading her own
 * screen. A formula you can CALL is a formula something can check.
 *
 * `padStart` and not `printf`-style truncation: number 12,345 prints as
 * "T12345", five digits, because a reference that silently wrapped at 9,999
 * would mint a duplicate against a live unique index. The SQL twin below
 * (`canonicalRefSql`) matches this exactly, and R55 proves the two agree by
 * running both over the same numbers rather than by reading them. */
export function canonicalRef(kind: TeamRefKind, no: number): string {
  return `${kind}${String(no).padStart(REF_PAD, "0")}`
}

/** The number inside a reference that is ALREADY canonical, or null for one
 * that is not (an old account-coded string, an empty ref, anything else). Used
 * by R55 to read a stored value back through the formula that made it. */
export function refNumber(kind: TeamRefKind, ref: string | null | undefined): number | null {
  if (!ref) return null
  const digits = ref.slice(kind.length)
  if (!/^\d+$/.test(digits)) return null
  const no = Number(digits)
  // Round-tripped, not merely parsed: "T00168" and "T0168" both give 168 and
  // only one of them is what the formula makes.
  return canonicalRef(kind, no) === ref ? no : null
}

// ── THE SQL TWINS ───────────────────────────────────────────────────────────
//
// The migration and the search doors need the same three questions answered
// inside SQLite, where the TypeScript above cannot run. They are here, beside
// the functions they mirror, because a formula in two files is the fault this
// whole module was rewritten to close.
//
// NO REGEXP, deliberately: D1 ships SQLite without one, so every one of these
// is built out of `rtrim`, `substr` and `printf`, which are always there.

/** Every digit, for `rtrim`. */
const DIGITS = "'0123456789'"

/** THE TRAILING NUMBER OF ANY REFERENCE, canonical or not, as an integer.
 *
 * `rtrim(ref, '0…9')` strips the trailing digit run; what it strips is what is
 * left after the head, so `substr` from the head's length + 1 is the run
 * itself. "196+ awards-T0412" gives 412, "SPR0001" gives 1, "T0168" gives 168,
 * and a value with no trailing digits at all gives 0 — which is not a valid
 * reference number (counters start at 1), so 0 reads as "there is no number
 * here to keep" without needing a second flag.
 *
 * It reads from the END on purpose. The old shape was `<account name>-<letters><digits>`
 * and the account name is arbitrary text: "re-green" has a hyphen in it,
 * "196+ awards" has a plus and a space, "S4Y Office" ends in a digit-adjacent
 * word. Anything that parses the PREFIX has to be right about all of them.
 * Nothing here parses the prefix; it is discarded, never read. */
export function refNumberSql(col: string): string {
  return `CAST(substr(${col}, length(rtrim(${col}, ${DIGITS})) + 1) AS INTEGER)`
}

/** `canonicalRef` in SQL, over a column: what THIS row's reference would be if
 * the number it already carries were minted today. `printf('%04d', …)` is
 * `padStart(4, "0")` — it pads to a minimum width and never truncates, so the
 * five-digit case agrees with the TypeScript rather than differing at 10,000. */
export function canonicalRefSql(kind: TeamRefKind, col: string): string {
  return `('${kind}' || printf('%0${REF_PAD}d', ${refNumberSql(col)}))`
}

/** A STORED REFERENCE THIS TABLE'S KIND WOULD NEVER HAVE MINTED. The predicate
 * migration 0068 rewrites on, and the one R55 asserts is empty afterwards. */
export function staleRefSql(kind: TeamRefKind, col: string): string {
  return `(${col} IS NOT NULL AND ${col} <> '' AND ${col} <> ${canonicalRefSql(kind, col)})`
}

// ── FINDING A RECORD BY A NUMBER IT NO LONGER WEARS ──────────────────────────

/** THE ALIAS HALF OF A SEARCH CLAUSE, for a door that searches in SQL.
 *
 * Returns an `EXISTS` fragment to OR into whatever the door already matches on,
 * taking ONE `?` — the same `%needle%` the door built for its other columns, so
 * a caller adds one parameter and nothing else changes.
 *
 * A CORRELATED EXISTS AND NOT A JOIN: a join would multiply a row by however
 * many names it has ever had, and every one of these doors is a paged list
 * whose count has to agree with its page (R16). `(entity_table, alias)` is the
 * unique index the migration builds, so the subselect is a seek.
 *
 * It is written here, once, rather than at five doors, for the same reason the
 * formula is: five spellings of "and also look in the aliases" is five chances
 * for one of them to be missing, and a search that quietly does not look
 * anywhere is indistinguishable on screen from a record that is not there.
 *
 * `rowId` IS AN EXPRESSION, NOT A TABLE ALIAS, and that distinction is bought
 * with a real bug. The ticket door's search clause is folded into `ticketWhere`,
 * which is reused by a facet count that says `FROM help h` — so a hard-coded
 * `help.id` was a valid query in three places and `no such column: help.id` in
 * the fourth. Every other clause in that function uses BARE column names for
 * exactly this reason, and the ticket door passes a bare `id` here to match.
 *
 * A bare `id` resolves to the OUTER row because `ref_aliases` has no `id` column
 * of its own — its key is `(entity_table, alias)`, which migration 0068's header
 * argues for on its own merits. That is load-bearing here too: give the alias
 * table an `id` and this correlation silently starts comparing a row to itself. */
export function refAliasMatchSql(table: string, rowId: string): string {
  return `EXISTS (SELECT 1 FROM ${REF_ALIAS_TABLE} ra
     WHERE ra.entity_table = '${table}' AND ra.row_id = ${rowId}
       AND LOWER(ra.alias) LIKE ? ESCAPE '\\')`
}

/** THE ALIAS HALF FOR A COLLECTION THE BROWSER NARROWS INSTEAD.
 *
 * Sprints, apps and waves have no `q` on their door at all — their search is a
 * client-side matcher over an already-loaded, bounded list (`sprints-screen.tsx`,
 * `apps-screen.tsx`, `wave-finder.tsx`, and the screen engine's own
 * `searchKeys`). An EXISTS clause cannot help those: the narrowing happens
 * after the rows have arrived. So the read PROJECTS the names instead, space
 * separated, and the matcher already in place finds them the way it finds a
 * name or an account.
 *
 * Space, not comma: the matchers do a substring test on a lower-cased needle,
 * and a separator that can appear inside a value would let a search for
 * "0001,T" match two aliases that only touch. A reference has no spaces in it.
 * NULL when a record has never been renumbered, which is nearly all of them. */
export function refAliasesColumnSql(table: string, rowId: string): string {
  return `(SELECT group_concat(ra.alias, ' ') FROM ${REF_ALIAS_TABLE} ra
     WHERE ra.entity_table = '${table}' AND ra.row_id = ${rowId})`
}

/** Allocate the next TEAM-wide reference for one kind (ticket / story / sprint
 * / meeting / app / wave / input).
 *
 * Never null: nothing about this shape depends on an account existing, so
 * WHETHER to mint one at all — a ticket with no client, an internal meeting —
 * is each caller's own decision, made before it gets here (most still gate on
 * their own `accountId`, to keep "the number a client quotes" meaning what it
 * says; an app is not gated, because it is ours whether or not a client is
 * named on it, and it never carried that meaning to begin with).
 *
 * THE COUNTER CANNOT BE BEHIND THE ROWS, and that is migration 0068's job
 * rather than this function's. A backfill that renumbered rows past the counter
 * and left the counter alone would hand the next ticket a number a row already
 * has, against a live unique index — so 0068 raises each counter to the
 * high-water mark it leaves behind, with `MAX()`, so it can only ever go up.
 * Nothing here changed for that: this is still ONE statement. */
export async function nextTeamRef(cfg: D1Rest, guard: MemberGuard, kind: TeamRefKind): Promise<string> {
  const taken = await d1Query<{ next_no: number }>(
    cfg,
    guard.databaseId,
    `INSERT INTO team_ref_counters (kind, next_no) VALUES (?, 2)
     ON CONFLICT(kind) DO UPDATE SET next_no = next_no + 1
     RETURNING next_no`,
    [kind]
  )
  const no = (taken[0]?.next_no ?? 2) - 1
  return canonicalRef(kind, no)
}
