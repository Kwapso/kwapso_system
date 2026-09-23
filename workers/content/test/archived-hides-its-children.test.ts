// R112 — ARCHIVED MEANS INVISIBLE, AND IT REACHES DOWN.
//
// Aurora, 23 Sep 2026, validating the account round and widening it in the same
// breath, verbatim: **"validated - this for everything when archived, not only
// accounts"**. So "archived means invisible" stopped being a fact about a
// company and became a fact about ARCHIVING: it reaches the rows that hang off
// whatever was archived, whichever record type that is.
//
// ── WHICH RECORD TYPES THIS IS ABOUT, READ OFF THE SCHEMA ───────────────────
//
// Exactly two tables in the team schema carry the archive quartet (`archived_at`
// + `archiver_id`/`archiver_email`/`archiver_name`): `help` (migration 0011, a
// ticket somebody put away) and `accounts` (migration 0117). The first test
// below reads that off the real migrated database rather than trusting the
// sentence, so the day a third table gains the column this suite says so and the
// law is extended deliberately instead of silently applying to two things
// forever.
//
// THE THIRTY-TWO `deactivated_at` TABLES ARE NOT IN THIS SET. That column is
// Aurora's INACTIVE, her own distinction the same week: "inactive have their own
// tab - but do not show in choice components but i can still see them and acces
// everything underneath, archived however are completley invisible." Folding the
// two together would make every deactivated dropdown value hide its children.
//
// ── WHAT THE ACCOUNT ROUND ALREADY BUILT, AND WHAT THIS ROUND ADDED ─────────
//
// The account half shipped 23 Sep 2026 (see help-archived-account-collision.test.ts,
// which is its proof and stays exactly as it is): an archived company's TICKETS
// left the list, the facets, the dashboard, the triage queue, the knowledge base
// and the record map. Nothing asked the same question of the OTHER archivable
// record. So this suite is about the ticket: archive one, and the stories that
// answer it, the to-dos raised off it, its corpus entries and its edges on the
// map all had to go with it, and all of them had to come back on unarchive.
//
// ── AND THE TWO WAYS THE ACCOUNT VERSION LEAKED, HELD DOWN HERE TOO ─────────
//
// (1) A CORRELATED `EXISTS` BOUND TO THE RIGHT ALIAS. A bare `archived_at` in a
// statement that joins two archivable tables is refused by SQLite at runtime
// ("ambiguous column name: archived_at"), and when that happened on `help` it
// took the WHOLE Tickets screen down rather than the three doors it was aimed
// at. Every statement this round touches joins `help` and `accounts` together —
// the story reader, the to-do reader, the map's ticket edge — so the alias half
// is tested by RUNNING them against real SQLite, which is the only oracle that
// can see it.
//
// (2) THE KNOWLEDGE BASE RETIRES ITS MIRRORED COPIES, IT DOES NOT MERELY STOP
// SERVING THEM. A reader that filtered archived rows OUT of its own sweep would
// never visit them again, so the copy already embedded would answer questions
// for ever. The ticket reader learned that in the account round; the story and
// to-do readers had not, and the last block below is what holds it.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { DatabaseSync } from "node:sqlite"
import { beforeEach, describe, expect, it, vi } from "vitest"

const holder = vi.hoisted(() => ({ db: null as DatabaseSync | null }))

vi.mock("@shared/workers/d1-rest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/d1-rest")>()
  const { d1Impl } = await import("../../tenancy/test/d1-sqlite")
  return { ...actual, ...d1Impl(() => holder.db as DatabaseSync) }
})

import worker from "../src/index"
import { buildSpineDb, IDS, makeEnv } from "../../tenancy/test/spine-harness"
import { ARCHIVABLE } from "../src/lib/help"
import { ARCHIVED_PARENT_HIDES } from "../src/lib/record-map"
import { INGEST_KINDS } from "../src/lib/knowledge-ingest"
import { accountScope } from "@shared/workers/account-scope"

const db = () => holder.db as DatabaseSync

const callAs = (userId: string, route: string, query = "") => {
  const [method, path] = route.split(" ")
  return worker.fetch(
    new Request(`https://content${path}${query}`, {
      method,
      headers: { Cookie: "session=x", "Content-Type": "application/json" },
    }),
    makeEnv(() => db(), userId)
  )
}
const call = (route: string, query = "") => callAs(IDS.staffUser, route, query)

/** THE FOUR FIXTURES, AND WHY EACH ONE IS HERE.
 *
 * Two rows hang off the victim's ticket and two do not. EVERY assertion that a
 * hidden row is gone also asserts that its control is still there — without the
 * pair, a clause that had been widened into "no stories at all" would satisfy
 * every "does not come back" expectation in this file and prove nothing. It is
 * the same discipline `ORPHAN_TICKET` holds in the account suite, one record
 * type down.
 *
 * THE CONTROL IS THE COMMON CASE HERE, not the exotic one: four out of five
 * stories in the real base carry no ticket (migration 0014's own header on the
 * nullable `ticket_id`), so a clause that forgot its `IS NULL` short-circuit
 * would empty the board rather than filter it. */
const STORY_ON_TICKET = "S_ON_TICKET"
const STORY_NO_TICKET = "S_NO_TICKET"
const TODO_ON_TICKET = "D_ON_TICKET"
const TODO_NO_TICKET = "D_NO_TICKET"

const NOW = "2026-09-23T10:00:00.000Z"

beforeEach(() => {
  holder.db = buildSpineDb()
  db().exec(
    // BOTH STORIES CARRY THE APP, and so does the ticket. `RECORD_EDGES` draws
    // no `stories.account_id -> accounts` line (a story reaches its client
    // through the ticket or the app it changes), so the APP is the standing
    // point from which both a ticket and its story are neighbours — which is
    // what makes it the one place a single read can show the hidden pair and
    // the untouched control side by side.
    `UPDATE help SET app_id = '${IDS.victimApp}' WHERE id = '${IDS.victimTicket}';
     INSERT INTO stories (id, ref, account_id, ticket_id, app_id, title, status, created_at, creator_id, creator_email, creator_name)
       VALUES ('${STORY_ON_TICKET}', 'S0001', '${IDS.victimAccount}', '${IDS.victimTicket}', '${IDS.victimApp}',
               'Fix the March invoice run', 'open', '${NOW}', '${IDS.staffUser}', 'staff@kwapso.app', 'Staff');
     INSERT INTO stories (id, ref, account_id, ticket_id, app_id, title, status, created_at, creator_id, creator_email, creator_name)
       VALUES ('${STORY_NO_TICKET}', 'S0002', '${IDS.victimAccount}', NULL, '${IDS.victimApp}',
               'Upgrade the build pipeline', 'open', '${NOW}', '${IDS.staffUser}', 'staff@kwapso.app', 'Staff');
     INSERT INTO todos (id, ref, account_id, ticket_id, title, created_at, creator_id, creator_email, creator_name)
       VALUES ('${TODO_ON_TICKET}', 'I0001', '${IDS.victimAccount}', '${IDS.victimTicket}',
               'Send us the March statement', '${NOW}', '${IDS.staffUser}', 'staff@kwapso.app', 'Staff');
     INSERT INTO todos (id, ref, account_id, ticket_id, title, created_at, creator_id, creator_email, creator_name)
       VALUES ('${TODO_NO_TICKET}', 'I0002', '${IDS.victimAccount}', NULL,
               'Send us the new logo', '${NOW}', '${IDS.staffUser}', 'staff@kwapso.app', 'Staff');`
  )
})

/** Put the ticket away / take it back out, written straight onto the row rather
 * than through the door: this suite is about what the READS do afterwards, and
 * the write door has its own proof in help-archived-account-collision.test.ts. */
function archiveTicket(archived: boolean) {
  db().exec(
    archived
      ? `UPDATE help SET archived_at = '${NOW}', archiver_id = '${IDS.staffUser}',
           archiver_email = 'staff@kwapso.app', archiver_name = 'Staff' WHERE id = '${IDS.victimTicket}';`
      : `UPDATE help SET archived_at = NULL, archiver_id = NULL, archiver_email = NULL,
           archiver_name = NULL WHERE id = '${IDS.victimTicket}';`
  )
}

function archiveAccount() {
  db().exec(
    `UPDATE accounts SET archived_at = '${NOW}', archiver_id = '${IDS.staffUser}',
       archiver_email = 'staff@kwapso.app', archiver_name = 'Staff' WHERE id = '${IDS.victimAccount}';`
  )
}

async function stories(query = "?view=all"): Promise<{ ids: string[]; total: number }> {
  const res = await call("GET /api/content/stories", query)
  expect(res.status, await res.clone().text()).toBe(200)
  const body = (await res.json()) as { stories: { id: string }[]; total: number }
  return { ids: body.stories.map((s) => s.id).sort(), total: body.total }
}

async function todos(query = ""): Promise<{ ids: string[]; total: number }> {
  const res = await call("GET /api/content/todos", query)
  expect(res.status, await res.clone().text()).toBe(200)
  const body = (await res.json()) as { todos: { id: string }[]; total: number }
  return { ids: body.todos.map((t) => t.id).sort(), total: body.total }
}

describe("the law's own subject — which record types can be archived at all", () => {
  it("exactly the tables `ARCHIVABLE` names carry the archive quartet, read off the migrations", () => {
    const tables = (
      db()
        .prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`)
        .all() as { name: string }[]
    ).map((t) => t.name)
    expect(tables.length, "the schema scan found nothing — it has gone blind").toBeGreaterThan(30)

    const carrying = tables.filter((t) =>
      (db().prepare(`SELECT name FROM pragma_table_info('${t}')`).all() as { name: string }[]).some(
        (c) => c.name === "archived_at"
      )
    )
    // TWO, AND THE LIST IS THE LAW'S SCOPE. A third table gaining the column
    // turns this red on the day it lands, which is the day somebody has to
    // decide what hangs off it and what must therefore hide with it — rather
    // than a law that quietly goes on covering two things for ever.
    expect(carrying.sort()).toEqual(["accounts", "help"])
    expect(Object.keys(ARCHIVABLE).sort()).toEqual(carrying.sort())

    // …and it is a QUARTET on each of them, not a lone flag: the audit block is
    // what makes an archive answerable ("who put this away, and when").
    for (const t of carrying) {
      const cols = (
        db().prepare(`SELECT name FROM pragma_table_info('${t}')`).all() as { name: string }[]
      ).map((c) => c.name)
      for (const col of ["archived_at", "archiver_id", "archiver_email", "archiver_name"])
        expect(cols, `${t} must carry ${col}`).toContain(col)
    }
  })

  it("`deactivated_at` is a DIFFERENT state and is never treated as an archive", () => {
    // THE ONE SUBSTITUTION THAT WOULD BREAK EVERYTHING QUIETLY. Thirty-plus
    // tables carry `deactivated_at`, and if the generalisation had been written
    // over "any retirement column" instead of over the archive quartet, every
    // deactivated dropdown value, rate, link and profile would start hiding its
    // children — under a green build, because no existing suite asserts the
    // negative. Her own words are the discriminator and this is where they are
    // held: inactive is reachable, archived is invisible.
    const deactivatable = (
      db()
        .prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`)
        .all() as { name: string }[]
    )
      .map((t) => t.name)
      .filter((t) =>
        (
          db().prepare(`SELECT name FROM pragma_table_info('${t}')`).all() as { name: string }[]
        ).some((c) => c.name === "deactivated_at")
      )
    expect(deactivatable.length, "the base retires rows on many tables").toBeGreaterThan(20)
    for (const t of deactivatable)
      if (!ARCHIVABLE[t])
        expect(
          Object.keys(ARCHIVED_PARENT_HIDES).flatMap((k) =>
            ARCHIVED_PARENT_HIDES[k].map((p) => p.parent)
          ),
          `${t} is deactivatable, not archivable — nothing may hide its children on an archive rule`
        ).not.toContain(t)
  })
})

describe("archiving a TICKET takes its children with it", () => {
  it("before: every fixture is on its own door", async () => {
    expect((await stories()).ids).toEqual([STORY_NO_TICKET, STORY_ON_TICKET])
    expect((await todos()).ids).toEqual([TODO_NO_TICKET, TODO_ON_TICKET])
  })

  it("the story that ANSWERS the archived ticket leaves the board; the one that answers none stays", async () => {
    archiveTicket(true)
    const { ids } = await stories()
    expect(ids, "the archived ticket's own story is gone").not.toContain(STORY_ON_TICKET)
    expect(ids, "an enabler story answering no ticket is untouched").toEqual([STORY_NO_TICKET])
  })

  it("…and the badge counts the same question the rows answer (R16)", async () => {
    archiveTicket(true)
    const { ids, total } = await stories()
    expect(total).toBe(ids.length)
    // The per-tab badges build their own WHERE by hand (`countStoryViews`), so
    // they are the half most likely to drift away from the list.
    const res = await call("GET /api/content/stories", "?view=all")
    const body = (await res.json()) as { views?: Record<string, number> }
    if (body.views) expect(body.views.all).toBe(ids.length)
  })

  it("the to-do raised off the archived ticket goes too; the one raised off none stays", async () => {
    archiveTicket(true)
    const { ids, total } = await todos()
    expect(ids).toEqual([TODO_NO_TICKET])
    expect(total, "R16: the count agrees with the list").toBe(1)
  })

  it("UNARCHIVING hands every child straight back", async () => {
    archiveTicket(true)
    expect((await stories()).ids).toEqual([STORY_NO_TICKET])
    archiveTicket(false)
    expect((await stories()).ids, "the story returns exactly as it was").toEqual([
      STORY_NO_TICKET,
      STORY_ON_TICKET,
    ])
    expect((await todos()).ids).toEqual([TODO_NO_TICKET, TODO_ON_TICKET])
  })

  it("the door ALLOWED to see an archived ticket still opens it, and its map still draws", async () => {
    archiveTicket(true)
    // The Archive view is the one door whose whole purpose is the put-away
    // pile. It must never be caught by the filter that hides the live list —
    // "you cannot take a record out of a drawer you can no longer reach into"
    // (`archiveClause`'s own header, lib/help.ts).
    const res = await call("GET /api/content/help", "?view=archived")
    expect(res.status, await res.clone().text()).toBe(200)
    const body = (await res.json()) as { tickets: { id: string }[] }
    expect(body.tickets.map((t) => t.id)).toContain(IDS.victimTicket)
  })
})

describe("archiving the ACCOUNT takes the same children with it — the half that already shipped, held from below", () => {
  it("a story and a to-do both leave when their client is archived", async () => {
    archiveAccount()
    expect((await stories()).ids, "both stories hang off the archived company").toEqual([])
    expect((await todos()).ids).toEqual([])
  })

  it("the two facts are INDEPENDENT — archiving one does not write the other's column", async () => {
    archiveTicket(true)
    const row = db()
      .prepare(`SELECT archived_at FROM accounts WHERE id = '${IDS.victimAccount}'`)
      .get() as { archived_at: string | null }
    expect(row.archived_at, "archiving a ticket must never archive its client").toBeNull()
    archiveTicket(false)
    archiveAccount()
    const t = db()
      .prepare(`SELECT archived_at FROM help WHERE id = '${IDS.victimTicket}'`)
      .get() as { archived_at: string | null }
    expect(t.archived_at, "archiving a client must never archive its tickets").toBeNull()
  })
})

describe("the relationship map draws neither the archived record nor what hangs off it", () => {
  /** The map's own gate is `knowledge:read` — it is the knowledge section's own
   * screen — and the per-module subtraction then decides what is IN the picture.
   * The spine harness grants what its own suites needed; this is a map read, so
   * the right is granted here the same way record-map.test.ts does it. */
  beforeEach(() => {
    db().exec(
      `INSERT OR IGNORE INTO role_permissions (id, role_id, module, can_read, can_create, can_update, can_delete)
         VALUES ('${IDS.adminRole}_arch_knowledge', '${IDS.adminRole}', 'knowledge', 1, 1, 1, 1)`
    )
  })

  const map = async (table: string, id: string) => {
    const res = await call("GET /api/content/knowledge/map", `?table=${table}&id=${id}`)
    expect(res.status, await res.clone().text()).toBe(200)
    return (await res.json()) as { nodes: { table: string; id: string }[]; total: number }
  }

  it("standing on the APP no longer draws the archived ticket, nor the story that answers it", async () => {
    const before = await map("apps", IDS.victimApp)
    expect(before.nodes.some((n) => n.id === IDS.victimTicket), "drawn while live").toBe(true)
    expect(before.nodes.some((n) => n.id === STORY_ON_TICKET), "and so is its story").toBe(true)

    archiveTicket(true)
    const after = await map("apps", IDS.victimApp)
    expect(after.nodes.some((n) => n.id === IDS.victimTicket), "the archived ticket is gone").toBe(
      false
    )
    expect(
      after.nodes.some((n) => n.id === STORY_ON_TICKET),
      "and so is the story that answers it"
    ).toBe(false)
    expect(
      after.nodes.some((n) => n.id === STORY_NO_TICKET),
      "the enabler story is untouched — this is a filter, not a blackout"
    ).toBe(true)
    // R16: the number beside the picture counts the picture, focus excluded.
    expect(after.total).toBe(after.nodes.length - 1)
  })

  it("the map's own reach table names a real pointer at a real archivable parent", () => {
    // Rot-check: each entry writes `<table>.<column>` blind into SQL, and names
    // a parent whose `archived_at` the subquery then reads. Both halves are read
    // off the real migrated schema in record-map.test.ts; this asserts the
    // SHAPE, which is what keeps the two files from drifting apart.
    for (const [table, parents] of Object.entries(ARCHIVED_PARENT_HIDES)) {
      expect(parents.length, `${table} must name at least one archivable parent`).toBeGreaterThan(0)
      for (const p of parents)
        expect(ARCHIVABLE, `${table} points at ${p.parent}, which is not archivable`).toHaveProperty(
          p.parent
        )
    }
  })
})

describe("the knowledge base RETIRES the mirrored copies rather than merely not serving them", () => {
  const SOURCE = readFileSync(
    join(__dirname, "..", "src", "lib", "knowledge-ingest.ts"),
    "utf8"
  )

  it("every reader over a table with an archivable parent decides `retired` on that parent", () => {
    // THE SHAPE OF THE FAILURE THIS CATCHES. A reader that filtered archived
    // rows out of its own SELECT would look correct and be worse than doing
    // nothing: the cursor would never visit them again, so the chunks already
    // embedded would go on answering questions for ever, with no row left to
    // walk back and retire them. So the assertion is positive — the reader must
    // SELECT the parent's own archived state and hand it to `retired` — rather
    // than "must not select archived rows".
    const kinds = new Map(INGEST_KINDS.map((k) => [k.table, k.kind]))
    for (const [table, parents] of Object.entries(ARCHIVED_PARENT_HIDES)) {
      const kind = kinds.get(table)
      expect(kind, `${table} hides with its parent but has no knowledge reader`).toBeTruthy()
      const from = SOURCE.indexOf(`kind: "${kind}"`)
      expect(from, `the reader for ${kind} was not found — the scan has gone blind`).toBeGreaterThan(
        0
      )
      const next = SOURCE.indexOf("\n  {\n", from)
      const slice = SOURCE.slice(from, next === -1 ? SOURCE.length : next)
      for (const p of parents) {
        // ALIASED, NEVER BARE — the ambiguity half of the law (see this file's
        // own header). Two archivable tables in one statement both carry
        // `archived_at`, and a bare reference is refused by SQLite at runtime.
        const alias = p.parent === "accounts" ? "account_archived_at" : "ticket_archived_at"
        expect(
          slice,
          `the ${kind} reader must select its ${p.parent} parent's archived state as ${alias}`
        ).toContain(alias)
        expect(
          slice.replace(/\s+/g, " "),
          `the ${kind} reader must RETIRE on ${alias}, not merely select it`
        ).toMatch(new RegExp(`retired:[^,]*${alias}`))
      }
    }
  })

  it("a reader that gains a reason to retire bumps its own textVersion", () => {
    // The bump is what walks the cursor back over rows already filed. Without
    // it, a record archived before the reader learned to notice stays in the
    // corpus until something else happens to touch it. Pinned per kind in
    // knowledge-coverage.test.ts; asserted here as a floor, so the two files
    // cannot both be edited into agreeing on version 1.
    const byKind = new Map(INGEST_KINDS.map((k) => [k.kind, k.textVersion]))
    expect(byKind.get("ticket")).toBeGreaterThanOrEqual(2)
    expect(byKind.get("story")).toBeGreaterThanOrEqual(3)
    expect(byKind.get("todo")).toBeGreaterThanOrEqual(5)
  })
})

describe("portal login is refused for the contacts of an archived account", () => {
  // AURORA SETTLED THIS BESIDE THE WIDENING, 23 Sep 2026. It is the same
  // sentence read from the other end: if an archived company is invisible, the
  // people who sign in to see it have nothing left to stand in.
  //
  // THE REFUSAL IS WHERE A CLIENT LOGIN IS ALREADY REFUSED, not a new gate in
  // front of the portal: `resolveAccountScope` (shared/workers/account-scope.ts)
  // is the ONE place a caller is resolved, and a revoked grant has always come
  // out of it "standing nowhere, seeing nothing" (`roots: []`,
  // `currentAccountId: null`, `accountIds: []`). An archived company now lands
  // the same way. A gate of its own would have had to be remembered by every
  // fenced door in two workers; this is inherited by all of them.
  //
  // PROVED THROUGH A REAL DOOR rather than by reading the resolver: the fence is
  // only worth anything where it rides a WHERE, and `ticketFence` is the fence's
  // own first customer.
  /** THE FENCE ITSELF, asked directly. The door tests below prove the OUTCOME,
   * and an outcome test is not enough here: `ticketWhere` already carries
   * `accountArchivedClause` from the account round, so a contact of an archived
   * company would come back with an empty list even if the corridor had never
   * learned to refuse them. Proved live, by deleting the refusal and re-running
   * this file: every door assertion stayed green. So the refusal is asserted at
   * the ONE place it lives, on the shape a revoked grant has always resolved to
   * — standing nowhere, seeing nothing. */
  const cfg = { accountId: "a", apiToken: "t" } as never
  const guardFor = (userId: string) => ({
    userId,
    teamId: IDS.team,
    roleId: IDS.clientRole,
    databaseId: "db_team",
  })

  it("the corridor resolves the contact into their company while it is live", async () => {
    const scope = await accountScope(cfg, guardFor(IDS.contactUser))
    expect(scope.kind).toBe("portal")
    if (scope.kind === "portal") {
      expect(scope.roots, "their company is one of their worlds").toContain(IDS.victimAccount)
      expect(scope.currentAccountId).toBe(IDS.victimAccount)
      expect(scope.accountIds.length).toBeGreaterThan(0)
    }
  })

  it("…and STANDING NOWHERE once that company is archived", async () => {
    archiveAccount()
    const scope = await accountScope(cfg, guardFor(IDS.contactUser))
    // Still PORTAL, never promoted to staff — the corridor's own fail-closed
    // rule: portal-ness is decided by the PRESENCE of a `portal_users` row,
    // never by its absence, so a refused client is a client with no world and
    // never a caller who quietly gained the agency's reach.
    expect(scope.kind).toBe("portal")
    if (scope.kind === "portal") {
      expect(scope.roots, "no company left to stand in").toEqual([])
      expect(scope.currentAccountId).toBeNull()
      expect(scope.accountIds, "and therefore no rows at all").toEqual([])
    }
  })

  it("a STAFF caller is still staff — the refusal cannot reach the agency", async () => {
    archiveAccount()
    const scope = await accountScope(cfg, guardFor(IDS.staffUser))
    expect(scope.kind).toBe("staff")
  })

  it("the contact sees their company's ticket while it is live", async () => {
    const res = await callAs(IDS.contactUser, "GET /api/content/help", `?id=${IDS.victimTicket}`)
    expect(res.status, await res.clone().text()).toBe(200)
    const body = (await res.json()) as { tickets: { id: string }[] }
    expect(body.tickets.map((t) => t.id)).toEqual([IDS.victimTicket])
  })

  it("…and nothing at all once their company is archived", async () => {
    archiveAccount()
    const res = await callAs(IDS.contactUser, "GET /api/content/help", `?id=${IDS.victimTicket}`)
    // The door answers with the shape it gives for a row that is not there,
    // which is right twice over: it is the truthful answer, and it does not
    // disclose that the ticket exists.
    const body = (await res.json()) as { tickets?: { id: string }[] }
    expect(body.tickets ?? []).toEqual([])
  })

  it("…and their whole list is empty, not merely that one ticket", async () => {
    archiveAccount()
    const res = await callAs(IDS.contactUser, "GET /api/content/help", "?view=all")
    const body = (await res.json()) as { tickets?: { id: string }[]; total?: number }
    expect(body.tickets ?? []).toEqual([])
    expect(body.total ?? 0).toBe(0)
  })

  it("STAFF ARE UNTOUCHED — this refuses a client login, never the agency", async () => {
    // The corridor decides portal-ness by the PRESENCE of a `portal_users` row
    // (account-scope.ts's own fail-closed note), so a staff caller never reaches
    // the refusal at all. The distinction matters: if archiving a company also
    // locked the agency out, nobody could ever take it back out again.
    archiveAccount()
    const res = await call("GET /api/content/help", "?view=all")
    expect(res.status, "staff still resolve, and are answered").toBe(200)
    // …and a staff write aimed at an id they already hold still lands. Aurora's
    // ruling is about DISCOVERING a record on a company that has been put away,
    // never about refusing the agency the housekeeping that unwinds it.
    const one = db()
      .prepare(`SELECT id FROM help WHERE id = '${IDS.victimTicket}'`)
      .get() as { id: string } | undefined
    expect(one?.id, "the row itself is untouched — archived is not deleted").toBe(IDS.victimTicket)
  })
})
