// THE WHOLE KNOWLEDGE BASE, AS ONE PICTURE — its data layer.
//
// ── WHY THIS EXISTS BESIDE `record-map.ts` RATHER THAN INSTEAD OF IT ─────────
//
// `record-map.ts` opens with the argument against exactly this file: a whole
// graph is a hairball, no reader can find anything in it, and the one question a
// map is asked — "what is this connected to?" — is the one a hairball answers
// worst. That argument is CORRECT, and it is correct about an UNCLUSTERED graph.
// It is answered here rather than overruled.
//
// The neighbourhood door answers "what is this connected to". This one answers a
// DIFFERENT question, which that door cannot: "where is the knowledge, and where
// is there none?" An agency with 134 clients wants to see that seven of them
// account for most of what we know and a hundred and seven have a name and
// nothing else. That is not a question about one record, so no neighbourhood can
// answer it, and it is not a list either — a list of 134 rows sorted by a count
// is the same facts with the shape taken out.
//
// SO THE CLUSTER IS THE WHOLE DESIGN. Nodes are grouped and coloured by ACCOUNT,
// and the picture is legible because the eye reads 134 blobs of different sizes
// rather than 4,000 dots. Take the clustering away and `record-map.ts` is right
// again.
//
// ── WHAT THE EDGES ARE, AND THE ONE THAT IS NOT DRAWN ───────────────────────
//
// Nothing here infers a relationship — same rule as the neighbourhood door.
// Every edge is a column the sweep already wrote: a source's account, the app it
// is about, the sprint it sits in.
//
// `knowledge_sources.ticket_id` IS DELIBERATELY NOT AN EDGE, and this is the
// measurement that decided it rather than a preference. On staging (2026-09-08)
// 2,053 live sources carry a ticket, and on 2,050 of them `ticket_id` is the
// source's OWN `origin_row_id` — the row is the mirror OF that ticket, so the
// line would run from a node to itself. Drawn, it is two thousand loops that
// mean nothing; the three genuine ones (a story's source naming another team's
// ticket) are not worth the two thousand. A relationship a column HAPPENS to
// hold is not the same thing as a relationship somebody would say out loud, and
// `record-map.ts` already made that distinction its rule for choosing edges.
//
// ── THE FENCE, WHICH A PICTURE GETS WRONG MORE EASILY THAN A LIST ───────────
//
// Two clauses, and the second is the one only a picture needs.
//
// The NODES are fenced by `readerClause` — knowledge.ts's own, imported rather
// than copied, because a fence written twice is a fence that will be amended
// once. So a source behind somebody's personal Google connection, or restricted
// to one app's staff, is not a dot here for anybody else.
//
// The CLUSTERS are fenced by whether the caller may read ACCOUNTS AT ALL, and
// this is `record-map.ts`'s both-ends rule arriving at a shape it never had to
// think about. A picture LEAKS BY AGGREGATION: a reader who may not open the
// accounts module must not be shown a dense, named blob either, because the blob
// IS the fact — it says that client exists and that we know a great deal about
// them, which is precisely what the module right was withholding. Not greyed,
// not counted, not drawn as "another client": ABSENT. When `accounts` is not
// readable the picture has NO clusters and NO colours, and says so in a sentence
// rather than quietly looking sparse. The same subtraction applies to the app
// and sprint hubs, one module each.
//
// AGENCY ONLY, for the reason `record-map.ts` gives at length: the portal has
// its own account fence with its own suite, and a rule proved here is not
// inherited there. `refusePortalCaller` at the door.

import { d1Query, type D1Rest } from "@shared/workers/d1-rest"
import { type MemberGuard } from "@shared/workers/gating"
import { KNOWLEDGE_SHAPE_ANCHORS, KNOWLEDGE_SHAPE_SOURCES } from "@shared/workers/limits"
import { countSources, readerClause } from "./knowledge"

/** ONE CLUSTER — an account's worth of material, or the agency's own.
 *
 * `total` is the EXACT count over the whole corpus and `drawn` is how many dots
 * the picture actually put inside it. They are two numbers on purpose: R16's
 * rule that a capped list's length is not a count, applied to a shape. The
 * cluster is SIZED by `total`, so a client with 450 sources looks four times a
 * client with 110 whatever the sample happened to include. */
export type ShapeCluster = {
  /** the account's id, or "" for the agency's own material */
  id: string
  label: string
  total: number
  drawn: number
}

/** ONE DOT. `table` and `recordId` are what a click opens — a node the reader
 * cannot open is a node that should not have been drawn. */
export type ShapeNode = {
  id: string
  kind: string
  label: string
  /** the cluster it sits in, "" for the agency's own or for an unclustered picture */
  cluster: string
  table: string
  recordId: string
}

export type ShapeLink = { from: string; to: string }

export type KnowledgeShape = {
  clusters: ShapeCluster[]
  nodes: ShapeNode[]
  links: ShapeLink[]
  /** EXACT, over the whole corpus, through the one bounded count seam. Never
   * `nodes.length` — the number a person reads has to be the true one even when
   * the picture is a sample of it. */
  total: number
  /** how many source dots were drawn */
  drawn: number
  /** true when the corpus is larger than the picture, so the screen can say so */
  capped: boolean
  /** false when the caller may not read accounts, so the picture has no
   * clusters and no colours at all. Said out loud rather than left to look like
   * an empty knowledge base. */
  clustered: boolean
}

/** The agency's own material — a cluster with no account behind it. */
const AGENCY = ""

/** A HUB'S NODE ID, namespaced away from a source's. A source id and an app id
 * are both ULIDs and could collide in one map; the prefix is what keeps a link's
 * two ends unambiguous. */
const hub = (table: string, id: string) => `${table}:${id}`

type SourceRow = {
  id: string
  kind: string
  title: string
  account_id: string | null
  app_id: string | null
  sprint_id: string | null
}

/** THE WHOLE CORPUS, CLUSTERED AND BOUNDED.
 *
 * R14 — every statement below carries a LIMIT from `shared/workers/limits.ts`,
 * said at the statement, and the number of statements is FIXED (four reads plus
 * one count) rather than one per cluster. So the cost of this door is two
 * constants and cannot grow with the base.
 *
 * `compartment` narrows it to one client, which is what a reader does when the
 * whole picture is capped — the toolbar's own filter, forwarded. That is the
 * paging story: a picture cannot page, so it NARROWS, and one client's material
 * is far under the ceiling. */
export async function buildShape(
  cfg: D1Rest,
  guard: MemberGuard,
  input: { compartment: string | null; readable: Set<string> }
): Promise<KnowledgeShape> {
  const { compartment, readable } = input
  const fence = readerClause(guard, "s.")
  const narrow = compartment ? " AND s.compartment = ?" : ""
  const narrowParams = compartment ? [compartment] : []
  const where = `${fence.sql} AND s.deactivated_at IS NULL${narrow}`
  const whereParams = [...fence.params, ...narrowParams]

  // R16: the true size of the corpus, through the one bounded count seam and the
  // SAME fence and filter the list's own badge uses — `countSources` is that
  // seam, so the number under this picture and the number over the list beside
  // it can never disagree.
  const total = await countSources(cfg, guard, {
    compartment: compartment ?? undefined,
    active: "yes",
  })

  // THE DOTS. Most recently touched first, which is the same order the list
  // beside this picture is in — a sample somebody can reason about ("the newest
  // 1,500") rather than an arbitrary one. R14 hard cap: KNOWLEDGE_SHAPE_SOURCES.
  const rows = await d1Query<SourceRow>(
    cfg,
    guard.databaseId,
    `SELECT s.id, s.kind, s.title, s.account_id, s.app_id, s.sprint_id
       FROM knowledge_sources s
      WHERE ${where}
      ORDER BY COALESCE(s.updated_at, s.created_at) DESC, s.id DESC
      LIMIT ${KNOWLEDGE_SHAPE_SOURCES}`,
    whereParams
  )

  // WHETHER THERE ARE CLUSTERS AT ALL. Not a display choice — the aggregation
  // fence. A reader without `accounts:read` gets one unclustered field, because
  // a named blob is the disclosure the right was withholding.
  const clustered = readable.has("accounts")

  // THE CLUSTER SIZES, counted over the WHOLE corpus rather than over the dots
  // above — the number is the answer to "who are we dense on", so it must not be
  // a property of the sample. R14 hard cap: KNOWLEDGE_SHAPE_ANCHORS, biggest
  // first, so the ceiling falls on the thin tail.
  const totals = clustered
    ? await d1Query<{ account_id: string | null; c: number }>(
        cfg,
        guard.databaseId,
        `SELECT s.account_id, COUNT(*) AS c FROM knowledge_sources s
          WHERE ${where}
          GROUP BY s.account_id
          ORDER BY c DESC
          LIMIT ${KNOWLEDGE_SHAPE_ANCHORS}`,
        whereParams
      )
    : []

  // THE CLUSTER NAMES. A join rather than an `IN (…)` of ids: the bound
  // parameters D1 accepts are capped (D1_MAX_BOUND_PARAMS) and a list of account
  // ids is not, so the set is resolved inside the statement — the same argument
  // `sourcesWhere`'s subquery makes. R14 hard cap: KNOWLEDGE_SHAPE_ANCHORS.
  const accountNames = clustered
    ? await d1Query<{ id: string; name: string }>(
        cfg,
        guard.databaseId,
        `SELECT DISTINCT a.id, a.name FROM accounts a
           JOIN knowledge_sources s ON s.account_id = a.id
          WHERE ${where}
          LIMIT ${KNOWLEDGE_SHAPE_ANCHORS}`,
        whereParams
      )
    : []
  const accountName = new Map(accountNames.map((a) => [a.id, a.name]))

  // THE HUBS INSIDE A CLUSTER — the app a source is about, the sprint it sits
  // in. ONE MODULE EACH, subtracted independently: a reader who may see clients
  // but not their systems gets clusters with no app hubs in them, which is the
  // both-ends rule applied a hub at a time. R14 hard cap on both.
  const apps = readable.has("apps")
    ? await d1Query<{ id: string; name: string }>(
        cfg,
        guard.databaseId,
        `SELECT DISTINCT a.id, a.name FROM apps a
           JOIN knowledge_sources s ON s.app_id = a.id
          WHERE ${where}
          LIMIT ${KNOWLEDGE_SHAPE_ANCHORS}`,
        whereParams
      )
    : []
  const sprints = readable.has("sprints")
    ? await d1Query<{ id: string; name: string }>(
        cfg,
        guard.databaseId,
        `SELECT DISTINCT p.id, p.name FROM sprints p
           JOIN knowledge_sources s ON s.sprint_id = p.id
          WHERE ${where}
          LIMIT ${KNOWLEDGE_SHAPE_ANCHORS}`,
        whereParams
      )
    : []
  const appName = new Map(apps.map((a) => [a.id, a.name]))
  const sprintName = new Map(sprints.map((p) => [p.id, p.name]))

  const nodes: ShapeNode[] = []
  const links: ShapeLink[] = []
  const drawnPerCluster = new Map<string, number>()
  // A HUB IS DRAWN ONLY WHERE A DOT ACTUALLY REACHES IT. The reads above resolve
  // hub names over the whole corpus (bounded, and cheaper than an id list); a hub
  // whose sources all fell outside the sample would otherwise be a lone circle
  // with nothing attached, which reads as a record we know nothing about.
  //
  // WHICH CLUSTER IT IS DRAWN IN IS DECIDED BY A VOTE, and that is not a
  // refinement — it was measured. The first version put a hub in the cluster of
  // the FIRST dot that reached it, which is an arbitrary choice dressed as a
  // rule: on staging (2026-09-08) the app HORST was reached by 52 dots, 51 of
  // them in one account and one in another, and the hub landed with the ONE.
  // Fifty-one lines then crossed the whole picture — 51 of the 58 crossing lines
  // in the whole drawing, from a single misplaced circle. A hub belongs where its
  // material is, so it is placed where MOST of its dots are; a tie falls to
  // whichever cluster reached it first, which is arbitrary between equals rather
  // than arbitrary between a majority and a minority.
  type Hub = { node: ShapeNode; votes: Map<string, number> }
  const usedHubs = new Map<string, Hub>()
  const reach = (
    id: string,
    kind: string,
    label: string,
    table: string,
    recordId: string,
    cluster: string
  ) => {
    const found = usedHubs.get(id)
    const votes = found?.votes ?? new Map<string, number>()
    votes.set(cluster, (votes.get(cluster) ?? 0) + 1)
    if (!found) usedHubs.set(id, { node: { id, kind, label, cluster, table, recordId }, votes })
  }

  for (const row of rows) {
    const cluster = clustered && row.account_id ? row.account_id : AGENCY
    nodes.push({
      id: row.id,
      kind: row.kind,
      label: row.title,
      cluster,
      table: "knowledge_sources",
      recordId: row.id,
    })
    drawnPerCluster.set(cluster, (drawnPerCluster.get(cluster) ?? 0) + 1)
    // The hubs this dot hangs off. `appName`/`sprintName` are empty when the
    // module is not readable, so an unreadable far end produces no hub and no
    // line — the edge is absent rather than drawn to a nameless circle.
    if (row.app_id && appName.has(row.app_id)) {
      const id = hub("apps", row.app_id)
      reach(id, "app", appName.get(row.app_id) as string, "apps", row.app_id, cluster)
      links.push({ from: row.id, to: id })
    }
    if (row.sprint_id && sprintName.has(row.sprint_id)) {
      const id = hub("sprints", row.sprint_id)
      reach(id, "sprint", sprintName.get(row.sprint_id) as string, "sprints", row.sprint_id, cluster)
      links.push({ from: row.id, to: id })
    }
  }
  for (const { node, votes } of usedHubs.values()) {
    let best = node.cluster
    let most = 0
    for (const [cluster, n] of votes) if (n > most) [best, most] = [cluster, n]
    nodes.push({ ...node, cluster: best })
  }

  const clusters: ShapeCluster[] = totals.map((t) => {
    const id = t.account_id ?? AGENCY
    return {
      id,
      // A cluster whose account the join did not name is the agency's own
      // (`account_id` NULL) — the screen supplies that word, so this stays "".
      label: id === AGENCY ? "" : (accountName.get(id) ?? ""),
      total: t.c,
      drawn: drawnPerCluster.get(id) ?? 0,
    }
  })

  return {
    clusters,
    nodes,
    links,
    total,
    drawn: rows.length,
    capped: rows.length >= KNOWLEDGE_SHAPE_SOURCES && total > rows.length,
    clustered,
  }
}
