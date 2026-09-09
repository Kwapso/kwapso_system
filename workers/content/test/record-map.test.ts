// THE RELATIONSHIP MAP'S DATA LAYER — and mostly, its fence.
//
// A MAP LEAKS BY AGGREGATION EVEN WHEN EVERY NODE IS FENCED. That is R24's
// reasoning about numbers, arriving at relationships: each record on its own is
// compartment-fenced and the fences work, but an EDGE is a fact about TWO records
// and can disclose something neither endpoint states. A contact in one client's
// compartment sharing a meeting with a contact in another says that those two
// clients met — which is exactly what SCOPE's account fence exists to keep apart.
//
// So the assertions that matter here are the negative ones: an edge whose FAR END
// the caller may not read is absent. Not greyed, not counted, not "3 more" —
// absent, because a count of things you may not see is itself the fact being
// withheld. Every one of them is written from the far end's side, because that is
// the side a near-end-only check would let through.

import type { DatabaseSync } from "node:sqlite"
import { beforeEach, describe, expect, it, vi } from "vitest"

const holder = vi.hoisted(() => ({ db: null as DatabaseSync | null }))

vi.mock("@shared/workers/d1-rest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/d1-rest")>()
  const { d1Impl } = await import("../../tenancy/test/d1-sqlite")
  return { ...actual, ...d1Impl(() => holder.db as DatabaseSync) }
})

import { buildSpineDb, IDS, makeEnv } from "../../tenancy/test/spine-harness"
import worker from "../src/index"
import { edgesFor, NEIGHBOURS_PER_EDGE, RECORD_EDGES } from "../src/lib/record-map"
import { ACTIVITY_GATE_MAP } from "@shared/rules/registry"

const db = () => holder.db as DatabaseSync

/** Every module the map's edges touch, granted to the admin role — the spine
 * harness grants what its own suites needed, and this is the first map read. */
function grantMapModules() {
  const modules = [
    // …plus `knowledge`, which is the door's own gate: this is the knowledge
    // section's screen, and the per-module subtraction decides what is IN the
    // picture rather than whether there is one.
    "knowledge",
    ...new Set(RECORD_EDGES.flatMap((e) => [e.from, e.to]).map((t) => ACTIVITY_GATE_MAP[t])),
  ]
  for (const m of modules)
    db().exec(
      `INSERT OR IGNORE INTO role_permissions (id, role_id, module, can_read, can_create, can_edit, can_delete)
         VALUES ('${IDS.adminRole}_map_${m}', '${IDS.adminRole}', '${m}', 1, 1, 1, 1)`
    )
}

/** Take one module's read right away, without touching the others. */
function deny(module: string) {
  db().exec(
    `UPDATE role_permissions SET can_read = 0 WHERE role_id = '${IDS.adminRole}' AND module = '${module}'`
  )
}

async function map(table: string, id: string) {
  const res = await worker.fetch(
    new Request(`https://content/api/content/knowledge/map?table=${table}&id=${id}`, {
      headers: { Cookie: "session=x" },
    }),
    makeEnv(() => holder.db as DatabaseSync, IDS.staffUser)
  )
  return { status: res.status, body: (await res.json()) as Record<string, unknown> }
}

beforeEach(() => {
  holder.db = buildSpineDb()
  grantMapModules()
  db().exec(`
    INSERT INTO accounts (id, account_type, name, created_at)
      VALUES ('A_MAP', 'entity', 'Mapland GmbH', '2026-01-01');
    INSERT INTO apps (id, account_id, name, created_at)
      VALUES ('APP_MAP', 'A_MAP', 'Dispatch', '2026-01-01');
    INSERT INTO help (id, account_id, app_id, description, status, created_at)
      VALUES ('T_MAP', 'A_MAP', 'APP_MAP', 'The screen logs drivers out', 'new', '2026-02-01');
    INSERT INTO processes (id, app_id, name, created_at)
      VALUES ('P_MAP', 'APP_MAP', 'Invoice approval', '2026-01-05');
  `)
})

describe("one record's neighbourhood", () => {
  it("draws what sits one step away, in both directions", async () => {
    const { status, body } = await map("apps", "APP_MAP")
    expect(status).toBe(200)
    const nodes = body.nodes as { table: string; id: string; label: string }[]
    // OUTWARD: the app points at its account. INWARD: the ticket and the process
    // point at the app. One edge table, two readings, and the picture reads the
    // same whichever end you opened it from.
    expect(nodes.map((n) => `${n.table}:${n.id}`).sort()).toEqual(
      ["accounts:A_MAP", "apps:APP_MAP", "help:T_MAP", "processes:P_MAP"].sort()
    )
    expect((body.focus as { label: string }).label).toBe("Dispatch")
    // The label, not the ULID — a map without labels is a diagram of identifiers.
    expect(nodes.find((n) => n.id === "A_MAP")?.label).toBe("Mapland GmbH")
  })

  it("says what each line MEANS, in the edge's own direction", async () => {
    const { body } = await map("apps", "APP_MAP")
    const links = body.links as { from: string; to: string; relation: string }[]
    expect(links).toContainEqual({
      from: "apps:APP_MAP",
      to: "accounts:A_MAP",
      relation: "is built for",
    })
    expect(links).toContainEqual({ from: "help:T_MAP", to: "apps:APP_MAP", relation: "is about" })
  })

  it("answers nothing for a record that does not exist", async () => {
    const { body } = await map("apps", "NOPE")
    expect(body.focus).toBeNull()
    expect(body.nodes).toEqual([])
  })

  it("refuses a table it does not draw", async () => {
    const { status } = await map("__proto__", "APP_MAP")
    expect(status, "an inherited member is not a table").toBe(400)
  })
})

describe("the fence is on BOTH ends of every edge", () => {
  it("a caller denied the far end's module does not see the edge at all", async () => {
    deny("accounts")
    const { body } = await map("apps", "APP_MAP")
    const nodes = body.nodes as { table: string; id: string }[]
    expect(
      nodes.some((n) => n.table === "accounts"),
      "the account is the FAR end — a near-end-only check would have drawn it"
    ).toBe(false)
    const links = body.links as { to: string }[]
    expect(links.some((l) => l.to === "accounts:A_MAP")).toBe(false)
    // …and the rest of the neighbourhood is untouched: the fence removes an edge,
    // never the picture.
    expect(nodes.some((n) => n.id === "T_MAP")).toBe(true)
  })

  it("and it is ABSENT, never counted — a count of what you may not see is the fact", async () => {
    const withAccounts = await map("apps", "APP_MAP")
    deny("accounts")
    const without = await map("apps", "APP_MAP")
    expect(
      (without.body.total as number) < (withAccounts.body.total as number),
      "the denied edge must leave the total, not sit inside it as an unnamed one"
    ).toBe(true)
  })

  it("a caller denied the NEAR end's module gets nothing at all", async () => {
    deny("processes") // apps and processes share this module
    const { body } = await map("apps", "APP_MAP")
    expect(body.focus, "you cannot stand on a record you may not read").toBeNull()
    expect(body.nodes).toEqual([])
  })

  it("edgesFor keeps only edges whose BOTH ends are readable", () => {
    const all = new Set(Object.keys(ACTIVITY_GATE_MAP))
    expect(edgesFor("help", all).length, "the fixture has ticket edges").toBeGreaterThan(0)
    // The far end gone: the edge goes with it.
    const noAccounts = new Set([...all].filter((t) => t !== "accounts"))
    expect(edgesFor("help", noAccounts).some((e) => e.to === "accounts")).toBe(false)
    // The near end gone: nothing at all.
    expect(edgesFor("help", new Set([...all].filter((t) => t !== "help")))).toEqual([])
  })
})

describe("the map is bounded by construction", () => {
  it("every edge's read is capped, and the cap is a constant in the file", () => {
    expect(NEIGHBOURS_PER_EDGE).toBeGreaterThan(0)
    expect(NEIGHBOURS_PER_EDGE).toBeLessThanOrEqual(100)
  })

  it("and every edge names two tables the gate map knows", () => {
    // A table missing from ACTIVITY_GATE_MAP has no module, so `readableTables`
    // can never admit it and the edge would be silently undrawable — a line in
    // the table that does nothing, which is the shape every deny-list in this
    // base rot-checks against.
    for (const e of RECORD_EDGES) {
      expect(ACTIVITY_GATE_MAP[e.from], `edge from "${e.from}" maps to no module`).toBeTruthy()
      expect(ACTIVITY_GATE_MAP[e.to], `edge to "${e.to}" maps to no module`).toBeTruthy()
      expect(e.relation.length, `the edge ${e.from}→${e.to} says nothing`).toBeGreaterThan(2)
    }
  })
})

describe("a knowledge source has a neighbourhood — including the four that name no row here", () => {
  // THE GAP THIS CLOSES. The Connections tab stands on a source's ORIGIN row,
  // which works for the thirteen origin tables that are real rows in this
  // database and cannot work for the four that name an external system
  // (`google_gmail`, `google_calendar`, `google_chat`, `google_drive` — 1,313 of
  // 4,838 sources on staging). Those four have no local row to stand on, so the
  // tab was hidden and the material had no neighbourhood at all. They do have an
  // account, an app, and — since migration 0070 — the Google event they came out
  // of, which is what these edges follow.
  beforeEach(() => {
    db().exec(`
      INSERT INTO meetings (id, account_id, title, google_event_id, starts_at, created_at)
        VALUES ('M_MAP', 'A_MAP', 'The Tuesday call', 'GCAL_EVENT_9', '2026-03-01T10:00:00Z', '2026-03-01');
      -- The same half-hour, three ways: Google's own calendar entry, the email
      -- notice about it, and the chat log. None of them is a row in this database
      -- and all three carry the one event id.
      INSERT INTO knowledge_sources (id, kind, origin_table, origin_row_id, compartment,
             account_id, app_id, event_id, event_id_from, title, created_at)
        VALUES ('KS_MAIL', 'email', 'google_gmail', 'u1:mail-1', 'agency',
                'A_MAP', 'APP_MAP', 'GCAL_EVENT_9', 'mail', 'Notes: The Tuesday call', '2026-03-01');
      INSERT INTO knowledge_sources (id, kind, origin_table, origin_row_id, compartment,
             event_id, event_id_from, title, created_at)
        VALUES ('KS_CHAT', 'message', 'google_chat', 'u1:chat-1', 'agency',
                'GCAL_EVENT_9', 'origin', 'Chat about Tuesday', '2026-03-01');
    `)
  })

  it("stands on the SOURCE and draws the call, the client and the system", async () => {
    const { status, body } = await map("knowledge_sources", "KS_MAIL")
    expect(status).toBe(200)
    const nodes = body.nodes as { table: string; id: string; label: string }[]
    expect(nodes.map((n) => `${n.table}:${n.id}`).sort()).toEqual(
      ["accounts:A_MAP", "apps:APP_MAP", "knowledge_sources:KS_MAIL", "meetings:M_MAP"].sort()
    )
    // Its own words, not a ULID — reached from both ends now.
    expect((body.focus as { label: string }).label).toBe("Notes: The Tuesday call")
    expect(nodes.find((n) => n.id === "M_MAP")?.label).toBe("The Tuesday call")
  })

  it("gathers the SIBLINGS when you stand on the call — the point of the event edge", async () => {
    const { body } = await map("meetings", "M_MAP")
    const nodes = body.nodes as { table: string; id: string }[]
    // Both artefacts about that half-hour, neither of which is a row here.
    expect(nodes.filter((n) => n.table === "knowledge_sources").map((n) => n.id).sort()).toEqual([
      "KS_CHAT",
      "KS_MAIL",
    ])
    const links = body.links as { from: string; to: string; relation: string }[]
    expect(links).toContainEqual({
      from: "knowledge_sources:KS_MAIL",
      to: "meetings:M_MAP",
      relation: "came out of",
    })
  })

  it("matches GOOGLE'S event id and never the meeting's own id", async () => {
    // THE ASSERTION THE `toColumn` FIELD EXISTS FOR. `event_id` is Google's id
    // (migration 0070: "GOOGLE'S OWN calendar event id and nothing else"), so a
    // source carrying the MEETING's primary key is naming something else
    // entirely and must not be drawn. Without `toColumn` this row is exactly what
    // the old `o.id = n.<column>` join would have matched — and the real ones
    // above are exactly what it would have missed.
    db().exec(`
      INSERT INTO knowledge_sources (id, kind, origin_table, origin_row_id, compartment,
             event_id, title, created_at)
        VALUES ('KS_WRONG', 'email', 'google_gmail', 'u1:mail-2', 'agency',
                'M_MAP', 'Names the row id, not the event', '2026-03-02');
    `)
    const { body } = await map("meetings", "M_MAP")
    const ids = (body.nodes as { id: string }[]).map((n) => n.id)
    expect(ids, "the meeting's own id is not a Google event id").not.toContain("KS_WRONG")
    expect(ids).toContain("KS_MAIL")
    const back = await map("knowledge_sources", "KS_WRONG")
    expect(
      (back.body.nodes as { table: string }[]).some((n) => n.table === "meetings"),
      "read from the source's side either"
    ).toBe(false)
  })

  it("counts the same question it lists (R16)", async () => {
    // THE COUNT FOLLOWS THE SUBQUERY, and this is where that could silently rot.
    // The backward reading counts through `countCollection` on its own statement,
    // so a count that resolved the far key differently from the list would report
    // a number about a different question — here, `event_id = 'M_MAP'`, which is
    // zero. Asserted as a DIFFERENCE rather than as a fixed number, so the
    // meeting's other edges (its account) cannot make the test pass by accident.
    const before = (await map("meetings", "M_MAP")).body.total as number
    const nodes = (await map("meetings", "M_MAP")).body.nodes as { id: string }[]
    expect(before, "nothing is capped here, so every neighbour is on the page").toBe(
      nodes.length - 1
    )
    db().exec(`DELETE FROM knowledge_sources WHERE id = 'KS_CHAT'`)
    const after = (await map("meetings", "M_MAP")).body.total as number
    expect(after, "one sibling fewer, counted rather than measured off the page").toBe(before - 1)
  })

  it("a source with no account, no app and no event is honestly empty", async () => {
    db().exec(`
      INSERT INTO knowledge_sources (id, kind, compartment, title, created_at)
        VALUES ('KS_NOTE', 'note', 'agency', 'A note somebody typed', '2026-03-03');
    `)
    const { status, body } = await map("knowledge_sources", "KS_NOTE")
    expect(status).toBe(200)
    expect((body.focus as { label: string }).label).toBe("A note somebody typed")
    expect(body.links).toEqual([])
    expect(body.total).toBe(0)
  })

  it("draws NO edge for ticket_id — the mirror pointer is not a relationship", () => {
    // 2,050 of 2,053 live uses hold the source's own origin_row_id (staging,
    // 8 Sep 2026), so the line would say "this is a copy of that" and every one
    // of those tickets would gain a permanent extra node. Pinned so the column
    // being right there does not invite it back in without the argument.
    expect(
      RECORD_EDGES.some((e) => e.from === "knowledge_sources" && e.column === "ticket_id")
    ).toBe(false)
  })
})

describe("the fence is on the new edges too", () => {
  beforeEach(() => {
    db().exec(`
      INSERT INTO meetings (id, account_id, title, google_event_id, starts_at, created_at)
        VALUES ('M_MAP', 'A_MAP', 'The Tuesday call', 'GCAL_EVENT_9', '2026-03-01T10:00:00Z', '2026-03-01');
      INSERT INTO knowledge_sources (id, kind, origin_table, origin_row_id, compartment,
             account_id, app_id, event_id, title, created_at)
        VALUES ('KS_MAIL', 'email', 'google_gmail', 'u1:mail-1', 'agency',
                'A_MAP', 'APP_MAP', 'GCAL_EVENT_9', 'Notes: The Tuesday call', '2026-03-01');
    `)
  })

  it("a caller who may not read meetings does not learn the call exists", async () => {
    deny("meetings")
    const { body } = await map("knowledge_sources", "KS_MAIL")
    expect(
      (body.nodes as { table: string }[]).some((n) => n.table === "meetings"),
      "the call is the FAR end — absent, not greyed and not counted"
    ).toBe(false)
    expect(body.total, "a count of things you may not see is itself the fact").toBe(2)
  })

  it("…and without `knowledge:read` there is no map at all, from either side", async () => {
    // NOT THE SYMMETRIC CASE I FIRST WROTE, and the difference is worth keeping.
    // `knowledge` is the DOOR's own gate, not just one end of this edge, so
    // taking it away does not quietly drop the source nodes from a meeting's
    // map — it refuses the whole read. That is a stronger answer than the one
    // the test was reaching for, and the test now asserts what actually happens
    // rather than what the edge table alone would suggest.
    deny("knowledge")
    expect((await map("meetings", "M_MAP")).status).toBe(403)
    expect((await map("knowledge_sources", "KS_MAIL")).status).toBe(403)
  })

  it("subtracts one module at a time, not all of them", async () => {
    deny("accounts")
    const { body } = await map("knowledge_sources", "KS_MAIL")
    const tables = (body.nodes as { table: string }[]).map((n) => n.table)
    expect(tables, "the client is gone").not.toContain("accounts")
    expect(tables, "and the call the reader MAY see is still there").toContain("meetings")
    expect(tables).toContain("apps")
  })
})
