// THE OPEN TAB IS SEVERAL STAGES AT ONCE, AND THE WAITING TAB IS NOT A STAGE.
//
// Two client rulings of 2026-09-06, and both of them changed what this door has
// to be able to answer:
//
//   "Open → triaged + scheduled + in_progress + waiting"
//   "add new tab: waiting (this is when we are waiting sth from the customer) …
//    waiting means there's a message from us, pending answer from customer"
//
// …AND A THIRD, 2026-09-07: "in open, include status ready and waiting". So the
// stage set grew to FOUR and this file no longer counts them in its own words —
// it reads `OPEN_TAB_STATUSES` (shared/types.ts, which carries the ruling and
// what it cost) and asserts RELATIONSHIPS over it. A suite that spells the set
// out is a second copy of the constant, and a second copy fails the day the
// first one is correctly changed, which is exactly what happened here.
//
// ── WHY THIS IS A DOOR TEST AND NOT A BROWSER ONE ─────────────────────────────
//
// The ticket list PAGES (R14) and every badge above it is this door's own
// grouped COUNT(*) (R16), so "filter it in the browser" is not a shortcut here,
// it is the bug: narrowing the fifty rows in hand answers "the in-progress ones
// among the newest fifty" under a number counting all of them. That failure is
// invisible in a test that loads fifty rows and narrows them correctly — fifty
// rows correctly narrowed is exactly what the broken version does — so this
// file is built the way its three siblings are (paged-search, paged-sort,
// paged-facets): SIXTY tickets, and every row that matters is deliberately past
// the cursor, where nothing in a browser can reach it.
//
// ── AND WHY THE WAITING HALF NEEDS A REAL DATABASE ────────────────────────────
//
// `waitingClause` (workers/content/src/lib/help.ts) is the one filter in this
// module that is DERIVED rather than stored: there is no `waiting` column and no
// column anywhere in `help_threads` recording which side wrote a message, so the
// door works it out from the last reply's author and whether that person holds a
// `portal_users` row. That is three tables, a correlated subselect and a
// deliberate tie-break, and the only honest way to check it is to ask a real
// SQLite database, through the shipped route, the way a screen does.

import type { DatabaseSync } from "node:sqlite"
import { beforeEach, describe, expect, it, vi } from "vitest"

const holder = vi.hoisted(() => ({ db: null as DatabaseSync | null }))

vi.mock("@shared/workers/d1-rest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/d1-rest")>()
  const { d1Impl } = await import("../../tenancy/test/d1-sqlite")
  return { ...actual, ...d1Impl(() => holder.db as DatabaseSync) }
})

import worker from "../src/index"
import { PAGE_SIZE } from "@shared/workers/paging"
import { buildSpineDb, IDS, makeEnv } from "../../tenancy/test/spine-harness"
import { OPEN_TAB_STATUSES } from "@shared/types"

const db = () => holder.db as DatabaseSync

function env(userId: string) {
  const base = makeEnv(() => db(), userId) as unknown as Record<string, unknown>
  return {
    ...base,
    INTERNAL_KEY: "k",
    PUBLIC_APP_URL: "https://kwapso.example",
    REALTIME: { fetch: async () => new Response("{}") },
  } as never
}

type Page = {
  ids: string[]
  total: number
  byStatus: Record<string, number>
  nextCursor: string | null
  hasMore: boolean
}

async function page(path: string): Promise<Page> {
  const res = await worker.fetch(
    new Request(`https://content${path}`, { headers: { Cookie: "session=x" } }),
    env(IDS.staffUser) as never
  )
  expect(res.status, `${path} refused (${await res.clone().text()})`).toBe(200)
  const body = (await res.json()) as {
    tickets: { id: string }[]
    total: number
    byStatus: Record<string, number>
    nextCursor: string | null
    hasMore: boolean
  }
  return {
    ids: body.tickets.map((r) => r.id),
    total: body.total,
    byStatus: body.byStatus,
    nextCursor: body.nextCursor,
    hasMore: body.hasMore,
  }
}

/** The whole narrowed collection, walked through the cursor exactly as
 * <LoadMore> does — because a filter applied to the rows but not carried into
 * the keyset predicate does not fail, it drops rows at the page boundary. */
async function walk(path: string): Promise<string[]> {
  const ids: string[] = []
  let cursor: string | null = null
  for (let guard = 0; guard < 20; guard++) {
    const p: Page = await page(cursor ? `${path}&cursor=${encodeURIComponent(cursor)}` : path)
    ids.push(...p.ids)
    if (!p.hasMore) return ids
    cursor = p.nextCursor
    expect(cursor, "hasMore with no cursor is a list that cannot be finished").toBeTruthy()
  }
  throw new Error("the walk never ended — a cursor is repeating a page")
}

/* ── THE FIXTURE ────────────────────────────────────────────────────────────
 *
 * SIXTY TICKETS. `rank` counts up with the row number and the default order is
 * rank descending, so page one is H060…H011 and the deep end — the ten rows a
 * browser never holds — is H010…H001.
 *
 * Everything this file asserts lives down there, on purpose:
 *
 *   H001  `triaged`,     our reply is the last word          → Open AND Waiting
 *   H002  `scheduled`,   the CLIENT replied last             → Open, not Waiting
 *   H003  `in_progress`, nobody has replied at all           → Open, not Waiting
 *   H004  `ready`,       our reply is the last word          → Open AND Waiting
 *   H005  `in_progress`, the last reply is the ASSISTANT'S   → Open AND Waiting
 *   H006  `new`,         our reply is the last word          → neither (below)
 *
 * H006 IS THE ROW THAT PROVES WAITING IS NOT A STATUS OF ITS OWN, and it is a
 * REPLACEMENT rather than an addition. H004 used to hold that job: it is
 * `ready`, our reply is the last word on it, and it was excluded from both tabs
 * because `ready` was outside the Open tab's stage set. The client's 2026-09-07
 * ruling put `ready` INSIDE that set, so H004 now belongs on both tabs and the
 * proof it carried evaporated — not because the door changed, but because the
 * one stage this suite happened to pick as its outsider stopped being one.
 *
 * H006 is `new`, which is the stage `OPEN_TAB_STATUSES`' own comment rules OUT
 * in writing and for a reason that cannot drift into fashion ("nobody has read
 * those tickets, so they are not sorted and under way by any reading"). Its
 * conversation satisfies the waiting half perfectly and it is excluded anyway,
 * because the tab sends the stage set as well — Waiting is a SUBSET of Open,
 * not a stage beside it.
 *
 * Every other row is `new` with no conversation at all (the Triage tab's pile),
 * which keeps the open stages scarce enough that a door quietly ignoring the
 * filter answers sixty rather than five. */
const ROWS = 60
const id = (n: number) => `H${String(n).padStart(3, "0")}`
const STAGE: Record<string, string> = {
  H001: "triaged",
  H002: "scheduled",
  H003: "in_progress",
  H004: "ready",
  H005: "in_progress",
}
/** The three the Waiting TAB must find — every one of them past the cursor.
 * `H004` joined this list on 2026-09-07 when `ready` joined the Open tab's
 * stage set; its conversation always qualified. `H006` is deliberately NOT
 * here: it qualifies on the conversation and is `new`, so the tab's own stage
 * set excludes it (see the fixture note). */
const WAITING_ONES = ["H001", "H004", "H005"]
/** A CLIENT LOGIN, and the choice of user is the whole fixture. A client login
 * is an ordinary team member — there is no flag on the membership row — and the
 * only thing that makes one is a `portal_users` row in the team's own database.
 * The harness writes one for `victimUser` (`victimPortal`) and deliberately
 * writes NONE for the user it happens to call `clientUser`, so this is the id
 * whose messages the door can actually recognise as the client's. Picking the
 * other one would have made every assertion below pass for the wrong reason. */
const CLIENT = IDS.victimUser
const STAFF = IDS.staffUser

beforeEach(() => {
  holder.db = buildSpineDb()
  const values = Array.from({ length: ROWS }, (_, i) => {
    const n = i + 1
    const day = String((n % 28) + 1).padStart(2, "0")
    return `('${id(n)}', 'Ticket ${n}', 'T-${n}', 'question', '${STAGE[id(n)] ?? "new"}',
             '2026-01-${day}', '${STAFF}', 'Staff', '${String(n).padStart(3, "0")}')`
  })
  db().exec(
    `DELETE FROM help;
     INSERT INTO help (id, description, ref, help_type, status, created_at, creator_id, creator_name, rank)
     VALUES ${values.join(",\n")};`
  )
  // THE CONVERSATIONS. Two messages each where the order matters, so the test is
  // about WHO SPOKE LAST rather than who spoke at all — a door reading "is there
  // any message from us" would pass on H002 and be wrong.
  db().exec(
    `DELETE FROM help_threads;
     INSERT INTO help_threads (id, help_id, message_body, is_agent, created_at, creator_id, creator_name) VALUES
       ('m1', 'H001', 'What browser?',            0, '2026-02-01T09:00:00.000Z', '${CLIENT}', 'Client'),
       ('m2', 'H001', 'We have a fix coming.',    0, '2026-02-02T09:00:00.000Z', '${STAFF}',  'Staff'),
       ('m3', 'H002', 'Could you confirm?',       0, '2026-02-01T09:00:00.000Z', '${STAFF}',  'Staff'),
       ('m4', 'H002', 'Yes, confirmed.',          0, '2026-02-03T09:00:00.000Z', '${CLIENT}', 'Client'),
       ('m6', 'H004', 'All done, sending soon.',  0, '2026-02-02T09:00:00.000Z', '${STAFF}',  'Staff'),
       ('m7', 'H005', 'Drafted by the assistant.',1, '2026-02-02T09:00:00.000Z', '${STAFF}',  'Staff'),
       ('m8', 'H006', 'Any more detail on this?', 0, '2026-02-02T09:00:00.000Z', '${STAFF}',  'Staff');`
  )
})

const LIST = "/api/content/help?scope=all&view=live"
const OPEN = `${LIST}&status=${OPEN_TAB_STATUSES.join(",")}`
const WAITING = `${OPEN}&waiting=only`

describe("the Open tab asks the door for several stages at once", () => {
  it("page one is a page — the proof rests on there being rows it cannot see", async () => {
    const first = await page(LIST)
    expect(first.ids).toHaveLength(PAGE_SIZE)
    expect(first.total, "R16: the exact server count, never the page's length").toBe(ROWS)
    // Every row this file is about is past the cursor. Nothing a browser does to
    // the fifty it is holding can find any of them.
    for (const row of ["H001", "H002", "H003", "H004", "H005", "H006"])
      expect(first.ids, `${row} must be OFF page one for this suite to prove anything`).not.toContain(row)
  })

  it("a comma-separated status returns EVERY stage named, and only those", async () => {
    const open = await page(OPEN)
    expect(
      [...open.ids].sort(),
      "every stage `OPEN_TAB_STATUSES` names — `ready` among them since 2026-09-07 — and no `new` one"
    ).toEqual(["H001", "H002", "H003", "H004", "H005"])
    // R16 — the count is of the same question the rows answer. A door that
    // narrowed the rows and counted the collection would say sixty here.
    expect(open.total).toBe(5)
  })

  it("one status still means one status, so nothing that already worked changed", async () => {
    const ready = await page(`${LIST}&status=ready`)
    expect(ready.ids).toEqual(["H004"])
    expect(ready.total).toBe(1)
  })

  it("an unrecognised stage is dropped, and a parameter of nothing but nonsense narrows nothing", async () => {
    // The half that keeps a mistyped tab from emptying the screen: an unknown
    // word is not a 400 and not a match, it simply is not a stage.
    const mixed = await page(`${LIST}&status=triaged,not_a_status`)
    expect(mixed.ids).toEqual(["H001"])
    // …and a set with no recognised word left in it is "no stage was asked",
    // never "no row may match" — `statusClause`'s own stated behaviour.
    expect((await page(`${LIST}&status=nonsense`)).total).toBe(ROWS)
  })

  it("the badge above the strip still counts every stage, not the one being shown (R16)", async () => {
    // `byStatus` is counted with the stage facet turned OFF, which is what lets
    // the Open tab badge three stages while standing on the Open tab.
    const open = await page(OPEN)
    expect(open.byStatus.new, "the Triage badge, read while standing on Open").toBe(55)
    // AND THE READY BADGE STILL READS 1 THOUGH READY IS NOW PART OF OPEN. The
    // two tabs overlap on purpose (shared/types.ts says why): each badge stays
    // an exact COUNT(*) of its own tab's own question, and no badge is a sum of
    // two others. `byStatus` is grouped with the stage facet turned OFF, which
    // is what lets both be read while standing on either.
    expect(open.byStatus.ready, "and the Ready badge, which Open now contains").toBe(1)
    expect(
      OPEN_TAB_STATUSES.reduce((n, s) => n + (open.byStatus[s] ?? 0), 0),
      "the sum the Open tab badges — one disjoint exact count per stage it spans"
    ).toBe(5)
  })

  it("the whole narrowed collection walks through the cursor, every row exactly once", async () => {
    const walked = await walk(OPEN)
    expect([...walked].sort()).toEqual(["H001", "H002", "H003", "H004", "H005"])
  })
})

describe("the Waiting tab is derived from the conversation, not from a column", () => {
  it("finds the tickets where WE spoke last, and nothing else", async () => {
    const waiting = await page(WAITING)
    expect([...waiting.ids].sort(), "our word was the last one on these three").toEqual(WAITING_ONES)
    expect(waiting.total, "and the count answers the same question the rows do").toBe(
      WAITING_ONES.length
    )
  })

  it("a ticket the CLIENT answered last is not waiting on the client", async () => {
    expect((await page(WAITING)).ids).not.toContain("H002")
  })

  it("a ticket nobody has replied to at all is not waiting", async () => {
    // Nothing has been said, so nobody is pending an answer to it. H003 sits on
    // Open, where it belongs, and not here.
    expect((await page(OPEN)).ids).toContain("H003")
    expect((await page(WAITING)).ids).not.toContain("H003")
  })

  it("an AI-DRAFTED reply counts as a message from us", async () => {
    // The ruling, written out at `waitingClause`: `is_agent` marks the reply
    // nobody typed, but it is posted into the thread the client reads and is
    // written under a staff actor's own id. A ticket whose only outbound message
    // was drafted rather than typed is exactly the one nobody has chased, so
    // excluding it would have hidden the row this tab exists to surface.
    expect((await page(WAITING)).ids, "H005's last reply is is_agent = 1").toContain("H005")
  })

  it("WAITING IS A SUBSET OF OPEN — never a stage beside it", async () => {
    const open = new Set((await page(OPEN)).ids)
    const waiting = await page(WAITING)
    for (const row of waiting.ids)
      expect(open.has(row), `${row} is on Waiting but not on Open — the two have come apart`).toBe(true)
    // H006 is the row that makes this a real assertion rather than a tautology:
    // our reply IS the last word on it, and it is excluded because `new` is not
    // one of the stages the tab sends. It replaced H004 on 2026-09-07, when
    // `ready` joined the tab's stage set and stopped being an outsider — the
    // fixture note carries the whole swap. `new` cannot drift into the set the
    // way `ready` did: `OPEN_TAB_STATUSES`' own comment rules it out in writing.
    expect(waiting.ids, "a `new` ticket is not waiting, however the conversation ended").not.toContain(
      "H006"
    )
    expect(
      (OPEN_TAB_STATUSES as readonly string[]).includes("new"),
      "`new` is inside the Open tab now, so H006 no longer proves anything — pick a stage that is genuinely outside"
    ).toBe(false)
  })

  it("a REVOKED portal login is still a client login", async () => {
    // Presence, not liveness — the convention lib/members.ts states in words
    // ("a revoked grant still means 'this login belongs to a client', and
    // reviving it is one click"). Without it, pausing somebody's access would
    // move every message they ever wrote onto the agency's side of this filter
    // and drop H002 onto the Waiting tab.
    db().exec(`UPDATE portal_users SET deactivated_at = '2026-03-01' WHERE user_id = '${CLIENT}';`)
    expect((await page(WAITING)).ids).not.toContain("H002")
  })

  it("the waiting question is asked WITHOUT a stage set too, and still narrows", async () => {
    // The door takes the two filters independently — the SCREEN happens to send
    // them together, and nothing here depends on that. Without the stages, the
    // `ready` ticket joins the answer, which is the honest result of asking a
    // narrower question.
    const anyStage = await page(`${LIST}&waiting=only`)
    expect([...anyStage.ids].sort()).toEqual(["H001", "H004", "H005", "H006"])
  })

  it("anything but the exact word `only` is the same as not asking", async () => {
    // The parameter turns a correlated subselect on, so the door refuses to read
    // a caller's `waiting=no` as yes.
    expect((await page(`${LIST}&waiting=no`)).total).toBe(ROWS)
  })
})
