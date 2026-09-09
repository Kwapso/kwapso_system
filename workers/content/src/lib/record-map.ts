// THE RELATIONSHIP MAP'S DATA LAYER — one record's neighbourhood, and nothing
// larger.
//
// ── WHY A NEIGHBOURHOOD AND NEVER THE WHOLE GRAPH ───────────────────────────
//
// The base holds a few thousand records. Drawn at once they are a hairball: no
// reader can find anything in it, every frame costs the whole set, and the one
// question a map is actually asked — "what is this connected to?" — is the one a
// hairball answers worst. So the door takes a record and hands back what sits one
// step away from it, and the screen expands from there as somebody pulls. That is
// R14's bounded read arriving as a product decision rather than as a cap bolted
// on: a neighbourhood is bounded BY CONSTRUCTION, and the cap below is the belt.
//
// ── THE EDGES ARE COLUMNS SOMEBODY ALREADY WROTE ────────────────────────────
//
// Nothing here infers a relationship. Every edge is a foreign key this app has
// always stored — a ticket's client, a story's ticket, a process's app — read as
// what it is. No AI, no similarity, no guessing. The one exception is named and
// argued where it is built (`meetingPeople`), because a meeting's guest list is
// JSON rather than a column and it is the single most useful edge on the map.
//
// ── AND THE FENCE, WHICH IS THE PART A GRAPH GETS WRONG ─────────────────────
//
// A MAP LEAKS BY AGGREGATION EVEN WHEN EVERY NODE IS FENCED, and this is the
// reasoning R24 already wrote down about numbers, arriving at relationships. Each
// record on its own is compartment-fenced and the fences work. An EDGE is a fact
// about TWO records at once, and it can disclose something neither endpoint
// states: a contact in one client's compartment sharing a meeting with a contact
// in another says that those two clients met, which is precisely what SCOPE's
// account fence exists to keep apart.
//
// So an edge is drawn only when the caller may read BOTH ENDS. Not greyed, not
// counted, not shown as "1 more" — ABSENT, because a count of things you may not
// see is itself the fact being withheld. `readableTables` is that clause, and it
// is applied to the far end of every edge as well as to the near one.
//
// AGENCY ONLY, DELIBERATELY, AND SAID OUT LOUD. Every door on this refuses a
// portal caller. The client portal has its own account fence with its own suite,
// and an edge rule proved on the agency side is NOT inherited there — it would
// have to be proved again, against a different gateway and a different fence. A
// map is a delight feature; it is not worth answering a fence question nobody has
// asked yet. When somebody wants this in the portal, that is a scoped piece of
// work with its own tests, and this comment is the reason it is not free.

import { d1Query, sqlString, type D1Rest } from "@shared/workers/d1-rest"
import { hasRight, type MemberGuard } from "@shared/workers/gating"
import { countCollection } from "@shared/workers/count"
import { ACTIVITY_GATE_MAP } from "@shared/rules/registry"

/** HOW MANY NEIGHBOURS ONE STEP MAY RETURN. Not a page — a neighbourhood past
 * this size is not a neighbourhood, and the honest answer is the count beside it
 * (R16) rather than a cursor into a picture nobody can read. Said here rather
 * than at each statement because every edge shares it. */
export const NEIGHBOURS_PER_EDGE = 40

/** One relationship, as the column that already holds it.
 *
 * `from`/`to` are TABLES, because that is what the gate map is keyed on and
 * therefore what the fence can be applied to. `relation` is the words a reader
 * sees on the line; it is English here and translated at the screen (R28/R33). */
export type RecordEdge = {
  /** the table holding the pointer */
  from: string
  /** the column on it */
  column: string
  /** what it points at */
  to: string
  /** WHICH COLUMN ON THE FAR END THE POINTER MATCHES. Absent means `id`, which
   * is every edge this table held for its first year and still most of them.
   *
   * IT EXISTS FOR ONE REAL CASE rather than for generality. A knowledge source
   * says which call it came out of by carrying GOOGLE'S OWN calendar event id
   * (`knowledge_sources.event_id`, migration 0070, whose own comment is
   * emphatic: "GOOGLE'S OWN calendar event id and nothing else"). The matching
   * local record is the meeting that has been storing that same id in
   * `google_event_id` since 0012, under a unique index. So the join is
   * `meetings.google_event_id = knowledge_sources.event_id`, and an edge table
   * that can only say `o.id = n.<column>` cannot express it at all.
   *
   * THE ALTERNATIVE WAS A SECOND COLUMN holding the meeting's own id, and 0070
   * refused it in advance for a reason that still holds: a second spelling of a
   * fact is a second place for it to drift. Teaching the map to follow the key
   * that already exists costs one optional field here; teaching the schema to
   * repeat itself costs a migration, a backfill and a reconciliation for ever. */
  toColumn?: string
  /** what the line MEANS, read from `from` to `to`. */
  relation: string
}

/** EVERY EDGE THE MAP DRAWS. Data, so a new one is a line rather than a code
 * path, and so the fence below can be applied to all of them in one place.
 *
 * DELIBERATELY NOT EXHAUSTIVE OF EVERY FOREIGN KEY IN THE SCHEMA. A map is a
 * picture somebody reads, and an edge that answers no question a person has is
 * a line that makes the ones that do harder to see. Each of these is a sentence
 * somebody would say out loud: this ticket is Bergman's, this story answers that
 * ticket, this process belongs to that app. */
export const RECORD_EDGES: readonly RecordEdge[] = [
  // The customer spine — everything hangs off an account.
  { from: "apps", column: "account_id", to: "accounts", relation: "is built for" },
  { from: "help", column: "account_id", to: "accounts", relation: "was raised by" },
  { from: "help", column: "app_id", to: "apps", relation: "is about" },
  { from: "meetings", column: "account_id", to: "accounts", relation: "was with" },
  { from: "meetings", column: "app_id", to: "apps", relation: "was about" },
  { from: "todos", column: "account_id", to: "accounts", relation: "was asked of" },
  { from: "tasks", column: "account_id", to: "accounts", relation: "is about" },
  { from: "portal_users", column: "account_id", to: "accounts", relation: "signs in to" },
  { from: "account_links", column: "account_id", to: "accounts", relation: "works at" },
  // The work engine.
  { from: "stories", column: "ticket_id", to: "help", relation: "answers" },
  { from: "stories", column: "sprint_id", to: "sprints", relation: "sits in" },
  { from: "stories", column: "app_id", to: "apps", relation: "changes" },
  { from: "sprints", column: "account_id", to: "accounts", relation: "was sold to" },
  { from: "sprints", column: "wave_id", to: "waves", relation: "sits in" },
  { from: "waves", column: "account_id", to: "accounts", relation: "was sold to" },
  // What we actually do for them, and what we handed over.
  { from: "processes", column: "app_id", to: "apps", relation: "runs on" },
  { from: "deliverables", column: "app_id", to: "apps", relation: "was handed over on" },
  // Why we met.
  { from: "meetings", column: "purpose_id", to: "meeting_purposes", relation: "was held for" },
  // ── WHAT THE ASSISTANT WAS ALLOWED TO READ, AND WHERE IT CAME FROM ────────
  //
  // A knowledge source had no edges at all until now, so opening the map on one
  // answered "nothing is linked to this" about a row that is, by construction, a
  // copy of something. That was invisible because the Connections tab stands on
  // the source's ORIGIN row rather than on the source — which works for the
  // thirteen origin tables that are real rows here, and cannot work at all for
  // the four that name an external system (`google_gmail`, `google_calendar`,
  // `google_chat`, `google_drive` — 1,313 of 4,838 sources, measured by
  // connections_fix_1). Those four have no local row to stand on. They do have
  // these.
  //
  // THE EVENT EDGE IS THE ONE THAT PAYS FOR THE `toColumn` FIELD, and it is the
  // one that gives that material a neighbourhood it has never had: an email, a
  // chat log and a transcript about the same half-hour all point at the same
  // Google event, so standing on the MEETING gathers them (the backward reading
  // of this line), and standing on any one of them reaches the call. Before
  // migration 0070 nothing in the schema could say that two of them were about
  // the same half-hour.
  //
  // account / app / sprint are the universal parents 0070 deliberately did NOT
  // duplicate ("a stray thread has an account and no event"), so a source with
  // no event is still not an orphan.
  //
  // `ticket_id` IS DELIBERATELY LEFT OUT, and it is the tempting one because the
  // column is right there and populated. On staging (measured 8 Sep 2026) 2,050
  // of its 2,053 live uses hold the source's OWN `origin_row_id` — the source is
  // the mirror OF that ticket — so the line says "this is a copy of that", which
  // is a sentence about the mirroring machinery rather than about the business.
  // Read from the other end it is worse: every one of those 2,050 tickets would
  // gain a permanent extra node on its own map saying the knowledge base has a
  // copy of it. This table's own rule is that an edge must be a sentence
  // somebody would say out loud, and that one is not.
  { from: "knowledge_sources", column: "event_id", toColumn: "google_event_id", to: "meetings", relation: "came out of" },
  { from: "knowledge_sources", column: "account_id", to: "accounts", relation: "is filed under" },
  { from: "knowledge_sources", column: "app_id", to: "apps", relation: "is about" },
  { from: "knowledge_sources", column: "sprint_id", to: "sprints", relation: "is about" },
] as const

/** WHAT THIS CALLER MAY READ, as a set of TABLES — the same map the activity
 * feed subtracts through (R18), asked the same way.
 *
 * TABLES rather than modules, because an edge has table endpoints and the whole
 * point of the fence below is that it must be applied to a FAR END whose module
 * the caller may never have been told about.
 *
 * One read, not twenty: `hasRight` caches the whole permission sheet per request
 * (`sheetPerRequest` in shared/workers/gating.ts), so asking it once per module
 * costs one statement. Bounded by ACTIVITY_GATE_MAP, which is a constant. */
export async function readableTables(cfg: D1Rest, guard: MemberGuard): Promise<Set<string>> {
  const modules = [...new Set(Object.values(ACTIVITY_GATE_MAP))]
  const allowed = new Set<string>()
  for (const module of modules) if (await hasRight(cfg, guard, module, "read")) allowed.add(module)
  const out = new Set<string>()
  for (const [table, module] of Object.entries(ACTIVITY_GATE_MAP))
    if (allowed.has(module)) out.add(table)
  return out
}

/** The edges that touch a table AND whose OTHER END this caller may read.
 *
 * BOTH ENDS, and that is the clause the whole file exists for. An edge from a
 * ticket to an account is not a fact about the ticket — it is a fact about the
 * pair, and a caller who may read tickets but not accounts must not learn it
 * from the ticket's side either. */
export function edgesFor(table: string, readable: Set<string>): RecordEdge[] {
  if (!readable.has(table)) return []
  return RECORD_EDGES.filter(
    (e) =>
      (e.from === table || e.to === table) && readable.has(e.from) && readable.has(e.to)
  )
}

export type MapNode = { table: string; id: string; label: string }
export type MapLink = { from: string; to: string; relation: string }
/** A neighbourhood: the focus, what sits one step from it, the lines between
 * them, and — R16 — the EXACT number of neighbours, which is not the length of
 * the list when the list was capped. */
export type Neighbourhood = {
  focus: MapNode | null
  nodes: MapNode[]
  links: MapLink[]
  total: number
  capped: boolean
}

/** The column holding a row's human name, per table. A map without labels is a
 * diagram of ULIDs. Absent means the table has none and the node carries its
 * reference instead — which is true of `account_links`, a row that IS a
 * relationship and has no name of its own. */
const LABEL_COLUMN: Record<string, string> = {
  accounts: "name",
  apps: "name",
  help: "title_en",
  stories: "title",
  sprints: "name",
  waves: "name",
  meetings: "title",
  processes: "name",
  deliverables: "title",
  tasks: "title",
  todos: "title",
  meeting_purposes: "name",
  // A source's own words. Without this a knowledge node reads as a ULID, which
  // is the one thing this map exists not to be — and it is reached from BOTH
  // ends now: standing on a source, and standing on the call several of them
  // came out of.
  knowledge_sources: "title",
  portal_users: "",
  account_links: "",
}

/** TABLES WHOSE ROWS THE APP RETIRES RATHER THAN DELETES, so the map can leave
 * a retired one out of somebody's neighbourhood.
 *
 * ── WHY THIS ARRIVED WITH THE KNOWLEDGE EDGES AND NOT BEFORE ───────────────
 *
 * The map has never filtered a retired row, and until now that was invisible
 * rather than correct. Measured on staging (9 Sep 2026) across every table these
 * edges touch: apps 0 retired, accounts 0, sprints 0, waves 0, processes 0,
 * deliverables 0, meeting_purposes 0, meetings 5, portal_users 1,
 * account_links 2 — and `knowledge_sources` 886. One table holds 886 of the 894
 * retired rows in the whole map, so the clause that was missing had almost
 * nothing to act on and nobody could have noticed it was absent.
 *
 * IT MATTERS NOW BECAUSE OF WHAT RETIRES A SOURCE. The knowledge base folds its
 * own duplicates away — 726 of the 851 rows carrying an event id are retired,
 * every one of them stamped by `kwapso` rather than by a person. Standing on a
 * meeting WITHOUT this clause gathers 58 live artefacts and 404 retired ones: a
 * seven-to-one wall of exactly the duplicates phase 2 exists to hide, drawn as
 * though they were the record. The feature would have made the problem it was
 * built beside look worse.
 *
 * A MAP IS A PICTURE OF THE SHAPE THINGS ARE IN NOW. "Deactivate, never delete"
 * keeps the row and its audit; it does not make the row a neighbour. The FOCUS
 * is exempt — opening the map on a retired record is a deliberate act and it
 * still draws itself — and only the far end of each edge is filtered.
 *
 * DATA, AND ROT-CHECKED AGAINST THE SCHEMA rather than trusted: record-map's own
 * suite reads `deactivated_at` off each table in a real database built from the
 * migrations and fails if this set and the schema disagree in either direction.
 * So a table that gains the column, or loses it, cannot leave this stale. */
export const RETIRABLE = new Set([
  "accounts",
  "account_links",
  "apps",
  "deliverables",
  "knowledge_sources",
  "meeting_purposes",
  "meetings",
  "portal_users",
  "processes",
  "sprints",
  "waves",
])

/** `AND o.deactivated_at IS NULL`, where the far table HAS that column. Built
 * once so the list and the R16 count below can never carry different versions of
 * it — the failure `sourcesWhere` in knowledge.ts already names: a count is
 * exact about the wrong question the moment the two clauses drift. */
const liveOnly = (table: string) => (RETIRABLE.has(table) ? ` AND o.deactivated_at IS NULL` : "")

const key = (n: { table: string; id: string }) => `${n.table}:${n.id}`

/** ONE RECORD'S NEIGHBOURHOOD.
 *
 * R14: every statement below is capped at NEIGHBOURS_PER_EDGE, and the number of
 * statements is bounded by RECORD_EDGES, which is a constant in this file. So the
 * whole read is bounded by two constants and cannot grow with the base.
 *
 * R16: `total` is a real COUNT over the same predicate, not the length of a
 * capped list — a map that says "12" when there are 300 is worse than one that
 * says 300 and draws 40 of them. */
export async function neighbourhood(
  cfg: D1Rest,
  guard: MemberGuard,
  input: { table: string; id: string; readable: Set<string> }
): Promise<Neighbourhood> {
  const { table, id, readable } = input
  const edges = edgesFor(table, readable)
  const focusLabel = LABEL_COLUMN[table]
  if (!readable.has(table)) return { focus: null, nodes: [], links: [], total: 0, capped: false }

  const [focusRow] = await d1Query<{ id: string; label: string | null }>(
    cfg,
    guard.databaseId,
    // R14: one row by primary key.
    `SELECT id${focusLabel ? `, ${focusLabel} AS label` : ", NULL AS label"} FROM ${table}
      WHERE id = ${sqlString(id)} LIMIT 1`
  )
  if (!focusRow) return { focus: null, nodes: [], links: [], total: 0, capped: false }
  const focus: MapNode = { table, id: focusRow.id, label: focusRow.label ?? focusRow.id }

  const nodes = new Map<string, MapNode>([[key(focus), focus]])
  const links: MapLink[] = []
  let total = 0
  let capped = false

  for (const edge of edges) {
    // WHICH WAY THIS EDGE POINTS FROM WHERE WE ARE STANDING. On a ticket, the
    // account edge is followed forwards (read the pointer); on an account, the
    // same edge is followed backwards (find the rows pointing here). Same line,
    // same words, two readings — and the link is always recorded in the edge's
    // own direction so the picture reads the same whichever end you opened.
    const outward = edge.from === table
    const other = outward ? edge.to : edge.from
    const otherLabel = LABEL_COLUMN[other]
    const select = `SELECT o.id${otherLabel ? `, o.${otherLabel} AS label` : ", NULL AS label"}`
    // WHICH KEY THE FAR END IS MATCHED ON — `id` unless the edge says otherwise
    // (see `toColumn`). The two readings need it in two different places, and
    // the BACKWARD one is where it is easy to get wrong: standing on a meeting,
    // the sources that came out of it do not carry that meeting's id, they carry
    // the Google event id it stores. So the value is looked up in the statement
    // rather than assumed to be the focus's own id — a subquery, so the whole
    // edge is still ONE round trip and one moment.
    const toCol = edge.toColumn ?? "id"
    const farValue =
      toCol === "id"
        ? sqlString(id)
        : `(SELECT f.${toCol} FROM ${table} f WHERE f.id = ${sqlString(id)})`
    const where =
      (outward
        ? `n.id = ${sqlString(id)} AND o.${toCol} = n.${edge.column}`
        : `o.${edge.column} = ${farValue}`) + liveOnly(other)
    const from = outward
      ? `FROM ${table} n JOIN ${other} o ON o.${toCol} = n.${edge.column}`
      : `FROM ${other} o`
    const rows = await d1Query<{ id: string; label: string | null }>(
      cfg,
      guard.databaseId,
      // R14 hard cap: NEIGHBOURS_PER_EDGE, said here, at the statement.
      `${select} ${from} WHERE ${where} LIMIT ${NEIGHBOURS_PER_EDGE + 1}`
    )
    const shown = rows.slice(0, NEIGHBOURS_PER_EDGE)
    if (rows.length > NEIGHBOURS_PER_EDGE) capped = true
    // R16: the exact number on the other end of this line, counted rather than
    // measured off the page.
    total += outward
      ? shown.length
      : await countCollection(
          cfg,
          guard.databaseId,
          // THE SAME PREDICATE AS THE LIST ABOVE, `farValue` included. R16 is
          // about the number being exact; it is exact about the WRONG question
          // the moment the count and the list stop asking the same one.
          `SELECT 1 FROM ${other} o WHERE o.${edge.column} = ${farValue}${liveOnly(other)}`
        )
    for (const r of shown) {
      const node: MapNode = { table: other, id: r.id, label: r.label ?? r.id }
      nodes.set(key(node), node)
      links.push(
        outward
          ? { from: key(focus), to: key(node), relation: edge.relation }
          : { from: key(node), to: key(focus), relation: edge.relation }
      )
    }
  }
  return { focus, nodes: [...nodes.values()], links, total, capped }
}
