// A TICKET'S STAGE HISTORY IS COMPLETE, OR IT IS WORSE THAN NOTHING.
//
// Team migration 0066 records every move along the ticket ladder as a row, so
// the app can answer the owner's two questions of 2026-09-06 — "how long it sat
// on each stage" and "how often sth is reopened" — and so a REOPEN stops erasing
// the fact that a ticket was ever answered.
//
// THE INVARIANT IS A CENSUS, WHICH IS WHY IT NEEDS A SOURCE SCAN AS WELL AS
// BEHAVIOUR. There are eight places in this codebase that move `help.status`.
// Seven of them recording and one not is not a slightly worse history: the gap
// is INVISIBLE, the two stages either side of the missing rung silently merge
// into one long one, and every duration computed from it looks exactly as
// finished as a true one. Driving the doors proves the writers that exist today
// record; only a scan can say anything about the writer somebody adds next
// month, and that is the one this law is written for.
//
// AND THE EMPTY CASE IS ASSERTED TOO, because it is the half most likely to be
// "improved" into a lie later. A ticket that predates the table reports
// `recorded: false` and NOT zeroes — 0066 carries the argument for why the past
// was not reconstructed out of the activity feed's prose, and the last block
// here makes somebody read it before writing a backfill.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { DatabaseSync } from "node:sqlite"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"

const holder = vi.hoisted(() => ({ db: null as DatabaseSync | null }))

vi.mock("@shared/workers/d1-rest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/d1-rest")>()
  const { d1Impl } = await import("../../tenancy/test/d1-sqlite")
  return { ...actual, ...d1Impl(() => holder.db as DatabaseSync) }
})

import worker from "../src/index"
import { buildSpineDb, IDS, makeEnv } from "../../tenancy/test/spine-harness"

const ROOT = join(__dirname, "..", "..", "..")
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

const call = (userId: string, route: string, body?: unknown) => {
  const [method, path] = route.split(" ")
  return worker.fetch(
    new Request(`https://content${path}`, {
      method,
      headers: { Cookie: "session=x", "Content-Type": "application/json" },
      body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
    }),
    env(userId) as never
  )
}

/** One ticket's rungs, oldest first — straight off the table, so a test asserts
 * what was STORED rather than what the reader chose to say about it.
 *
 * ORDERED THE WAY THE READER ORDERS, `rowid` and all: `created_at` is
 * millisecond-resolution and a ULID's low half is random, so two moves inside
 * one millisecond — which is every pair of calls in this file, against an
 * in-memory database — have no order at all without it. That is not a test
 * artefact papered over; it is the reason the reader sorts this way, and
 * lib/help-stages.ts carries the argument. */
const rungs = (id: string) =>
  db()
    .prepare(
      `SELECT from_status, to_status, creator_name FROM help_status_events
        WHERE help_id = ? ORDER BY created_at ASC, rowid ASC`
    )
    .all(id) as { from_status: string | null; to_status: string; creator_name: string | null }[]

async function raise(fields: Record<string, unknown> = {}): Promise<string> {
  const res = await call(IDS.staffUser, "POST /api/content/help", {
    description: "The dispatch board will not load on a phone",
    helpType: "Issue",
    // THE PRE-TRIAGE GATE'S FOUR FACTS. `markTriaged` refuses a ticket that has
    // not named a type, a client, an app and who raised it — so a fixture
    // without them cannot reach the rung this suite is about.
    accountId: IDS.victimAccount,
    appId: IDS.victimApp,
    raisedByContactId: IDS.victimPerson,
    ...fields,
  })
  const body = (await res.json()) as { tickets?: { id: string }[]; id?: string }
  const id = body.id ?? body.tickets?.[0]?.id
  if (!id) throw new Error(`raise failed ${res.status}: ${JSON.stringify(body)}`)
  return id
}

beforeEach(() => {
  holder.db = buildSpineDb()
})

describe("every move along the ladder leaves a row", () => {
  it("raising a ticket stamps where it started, with nothing before it", async () => {
    const id = await raise()
    expect(rungs(id).map((r) => [r.from_status, r.to_status])).toEqual([[null, "new"]])
  })

  it("a null `from` is the creation row's own signature, not a missing value", async () => {
    // The reader leans on this: `fromStatus === null` on the FIRST row is what
    // says the sequence is whole, so a ticket born into `awaiting_validation`
    // has to carry it too rather than only the ordinary `new` case.
    const id = await raise({ helpType: "Request" })
    expect(rungs(id)[0]).toMatchObject({ from_status: null, to_status: "awaiting_validation" })
  })

  it("triage, a status move and a resolve are three rungs, in order", async () => {
    const id = await raise()
    await call(IDS.staffUser, "POST /api/content/help/triage-read", { id })
    await call(IDS.staffUser, "POST /api/content/help/status", { id, status: "in_progress" })
    await call(IDS.staffUser, "POST /api/content/help/resolve", {
      id,
      resolution: "Fixed and deployed this morning.",
    })
    expect(rungs(id).map((r) => `${r.from_status ?? "-"}→${r.to_status}`)).toEqual([
      "-→new",
      "new→triaged",
      "triaged→in_progress",
      "in_progress→resolved",
    ])
  })

  it("the client saying yes is a rung like any other", async () => {
    const id = await raise({ helpType: "Request" })
    await call(IDS.staffUser, "POST /api/content/help/validate", { id })
    expect(rungs(id).map((r) => `${r.from_status ?? "-"}→${r.to_status}`)).toEqual([
      "-→awaiting_validation",
      "awaiting_validation→new",
    ])
  })

  it("R17's silence covers the history: a re-run writes no second rung", async () => {
    const id = await raise()
    await call(IDS.staffUser, "POST /api/content/help/triage-read", { id })
    await call(IDS.staffUser, "POST /api/content/help/triage-read", { id })
    expect(
      rungs(id).length,
      "a zero-row move is not an event — recording one would put a stage of zero seconds into the sequence"
    ).toBe(2)
  })
})

describe("a reopen no longer erases the answer", () => {
  it("closed on x, reopened on y, closed again on z — all three survive", async () => {
    // THE OWNER'S OWN SENTENCE, 2026-09-06: "Reopening a ticket nulls its closing
    // timestamp, yeah — but keep it in activity, like closed on x, reopen on y,
    // closed again on z."
    const id = await raise()
    await call(IDS.staffUser, "POST /api/content/help/resolve", { id, resolution: "Done." })
    await call(IDS.staffUser, "POST /api/content/help/status", { id, status: "in_progress" })
    await call(IDS.staffUser, "POST /api/content/help/resolve", { id, resolution: "Done again." })

    expect(rungs(id).map((r) => r.to_status)).toEqual([
      "new",
      "resolved",
      "in_progress",
      "resolved",
    ])
  })

  it("…and the ticket ROW still forgets, which is why the rows exist", async () => {
    // The column means "the answer that stands NOW", and a reopened ticket has
    // no standing answer — so `setStatus` NULLing it is correct and is left
    // alone. What was wrong was that nothing else remembered.
    const id = await raise()
    await call(IDS.staffUser, "POST /api/content/help/resolve", { id, resolution: "Done." })
    await call(IDS.staffUser, "POST /api/content/help/status", { id, status: "in_progress" })

    const row = db()
      .prepare(`SELECT resolved_at, resolver_name FROM help WHERE id = ?`)
      .get(id) as { resolved_at: string | null; resolver_name: string | null }
    expect(row.resolved_at, "the ticket row is deliberately silent about a reopened close").toBeNull()
    expect(row.resolver_name).toBeNull()

    const resolve = rungs(id).find((r) => r.to_status === "resolved")
    expect(resolve, "the resolve is gone from the history too — nothing remembers it").toBeTruthy()
    expect(
      resolve?.creator_name,
      "who answered it has to survive the reopen, or the record is worse than before"
    ).toBeTruthy()
  })

  it("the reader counts the reopen, and reads the sequence rather than the from-column", async () => {
    const id = await raise()
    await call(IDS.staffUser, "POST /api/content/help/resolve", { id, resolution: "Done." })
    await call(IDS.staffUser, "POST /api/content/help/status", { id, status: "in_progress" })

    const res = await call(IDS.staffUser, `GET /api/content/help/stages?id=${id}`)
    expect(res.status, await res.clone().text()).toBe(200)
    const body = (await res.json()) as {
      recorded: boolean
      fromCreation: boolean
      reopens: number | null
      spans: { status: string; to: string | null }[]
    }
    expect(body).toMatchObject({ recorded: true, fromCreation: true, reopens: 1 })
    expect(
      body.spans.at(-1),
      "the stage a ticket is in now is open-ended — its length is measured to the moment the door answered"
    ).toMatchObject({ status: "in_progress", to: null })
  })
})

describe("a ticket with no history says so, in words", () => {
  it("reports `recorded: false` and NOT a row of zeroes", async () => {
    // Every ticket that existed before 0066 is this ticket, for ever. Seeded
    // straight into the table because no door can make one any more.
    db()
      .prepare(
        `INSERT INTO help (id, description, help_type, status, created_at)
         VALUES ('H_OLD', 'raised before the table existed', 'Issue', 'triaged', '2026-01-01T00:00:00.000Z')`
      )
      .run()
    const res = await call(IDS.staffUser, "GET /api/content/help/stages?id=H_OLD")
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      recorded: false,
      fromCreation: false,
      events: [],
      spans: [],
      reopens: null,
    })
  })

  it("a HALF-recorded ticket says the earlier stages are missing", async () => {
    // The subtler shape, and the one a reader would otherwise misread: a ticket
    // raised before the table and moved after it has a real sequence that does
    // not start at the beginning. `fromCreation: false` is what the screen turns
    // into "Earlier stages have no record."
    db()
      .prepare(
        `INSERT INTO help (id, description, help_type, status, created_at)
         VALUES ('H_HALF', 'raised before, moved after', 'Issue', 'new', '2026-01-01T00:00:00.000Z')`
      )
      .run()
    await call(IDS.staffUser, "POST /api/content/help/status", { id: "H_HALF", status: "in_progress" })

    const res = await call(IDS.staffUser, "GET /api/content/help/stages?id=H_HALF")
    const body = (await res.json()) as { recorded: boolean; fromCreation: boolean; reopens: number | null }
    expect(body).toMatchObject({ recorded: true, fromCreation: false, reopens: 0 })
  })

  it("a client login is refused at the door (R21)", async () => {
    // The rows name the staff who moved each ticket, which is the same
    // disclosure the activity feed is kept off the portal for (SCOPE ch.06).
    const id = await raise()
    const res = await call(IDS.contactUser, `GET /api/content/help/stages?id=${id}`)
    expect(res.status).toBe(403)
  })
})

describe("no status writer escapes the seam", () => {
  // THE NEGATIVE HALF, which no behavioural test can reach: the writer somebody
  // adds next month. Every worker source is read off disk, and a function that
  // moves `help.status` must reach `lib/help-stages.ts` — directly, or through a
  // helper in the same file.
  const SEAM = /(?<![\w.])(recordStatusEvent|recordStatusEvents|statusEventStatement)\s*\(/

  const workerSources = () => {
    const dirs = ["auth", "content", "data-ops", "mcp", "realtime", "tenancy"].map((w) =>
      join(ROOT, "workers", w, "src")
    )
    return sourceFiles(dirs, { extensions: [".ts"], relativeTo: ROOT })
  }

  /** The function a character offset sits inside, plus every function in the
   * same file that one calls — the same transitive reach the fence walks use, so
   * a seam reached through a small local helper still counts. */
  function reachAround(source: string, at: number): string {
    const starts = [...source.matchAll(/(?:export\s+)?(?:async\s+)?function\s+(\w+)/g)]
    const bodies = new Map<string, string>()
    starts.forEach((m, i) =>
      bodies.set(m[1], source.slice(m.index as number, (starts[i + 1]?.index as number) ?? source.length))
    )
    const owner = [...starts].reverse().find((m) => (m.index as number) <= at)
    if (!owner) return ""
    const walk = (name: string, seen = new Set<string>()): string => {
      if (seen.has(name) || seen.size > 6) return ""
      seen.add(name)
      const body = bodies.get(name)
      if (!body) return ""
      let out = body
      for (const other of bodies.keys())
        if (other !== name && new RegExp(`(?<![\\w.])${other}\\s*\\(`).test(body))
          out += walk(other, seen)
      return out
    }
    return walk(owner[1])
  }

  it("every UPDATE of help.status sits in a function that records the move", () => {
    const offenders: string[] = []
    let seen = 0
    for (const { rel, source } of workerSources()) {
      // THE MIGRATION LEDGER IS NOT A WRITER, and the exclusion is narrow on
      // purpose. 0016 re-spells two retired status WORDS on rows that already
      // exist (`open` → `new`, `reopened` → `triaged`); it is a rename of a
      // vocabulary, not a move along the ladder, and the tickets it touches
      // predate this table by three months and could not be given a rung
      // anyway. Every migration is a dated one-off applied once per database,
      // read by a person before it ships — which is precisely the review a
      // running door does not get, and the review this scan stands in for.
      if (rel.endsWith("team-schema/migrations.ts")) continue
      const code = stripComments(source)
      let at = -1
      while ((at = code.indexOf("UPDATE help SET status", at + 1)) !== -1) {
        seen++
        if (!SEAM.test(reachAround(code, at))) offenders.push(`${rel} @${at}`)
      }
    }
    // The tripwire: a scan that suddenly finds nothing reports "all clear"
    // exactly like a passing one, and this one walks for a STRING that a
    // refactor could easily respell.
    expect(seen, "the status-writer scan found no status UPDATEs at all — it has gone blind").toBeGreaterThanOrEqual(5)
    expect(
      offenders,
      "a ticket's status moves here and nothing records it (team migration 0066). A history with holes is worse than none: the gap is invisible, and the two stages either side of it merge into one long stage that every duration then reports as real. Record the move through lib/help-stages.ts: " +
        offenders.join(", ")
    ).toEqual([])
  })

  it("…and the INSERT that creates a ticket stamps its first rung in the same script", () => {
    // `createTicket` is the one writer that can be atomic about it — its INSERT
    // is already a script, so the event rides inside it and there is no instant
    // in which a ticket exists with no recorded first stage.
    const makers = workerSources().filter(({ source }) =>
      /INSERT INTO help\s*\(id, help_type/i.test(stripComments(source))
    )
    expect(makers.map((f) => f.rel)).toEqual(["workers/content/src/lib/help.ts"])
    const code = stripComments(makers[0].source)
    const at = code.indexOf("INSERT INTO help (id, help_type")
    expect(
      SEAM.test(reachAround(code, at)),
      "the ticket INSERT must stamp its own first stage — a ticket whose sequence starts at its second rung reads as one whose earlier stages were never recorded"
    ).toBe(true)
  })

  it("the seam is one file, and nothing else writes the table", () => {
    const writers = workerSources().filter(({ source }) =>
      /INSERT INTO help_status_events/i.test(stripComments(source))
    )
    expect(
      writers.map((f) => f.rel),
      "every status writer goes through ONE statement — eight call sites and one shape, or the rows stop meaning one thing"
    ).toEqual(["workers/content/src/lib/help-stages.ts"])
  })

  it("nothing anywhere UPDATEs or DELETEs a recorded move", () => {
    // The table is append-only by design: a history somebody can edit is a
    // history nothing can be computed from.
    const offenders: string[] = []
    for (const { rel, source } of workerSources())
      for (const m of stripComments(source).matchAll(
        /(UPDATE|DELETE\s+FROM)\s+help_status_events/gi
      ))
        offenders.push(`${rel}: ${m[0]}`)
    expect(offenders, "a stage event is a record of something that happened — it is never rewritten").toEqual([])
  })
})

/** The migration is read as TEXT, for the reason 0065's own suite reads its own:
 * what is asserted is the DECISION written in it. A future "improvement" that
 * fills the table from the activity feed would be a silent change to what a row
 * means, and this is where somebody is made to read the reasoning first. */
describe("0066 backfills nothing, on purpose", () => {
  const ledger = readFileSync(
    join(ROOT, "workers", "tenancy", "src", "team-schema", "migrations.ts"),
    "utf8"
  )
  const at = ledger.indexOf('version: "0066_a_ticket_remembers_its_stages"')

  it("the migration exists and is the one that creates the table", () => {
    expect(at, "0066 is gone — has the table moved?").toBeGreaterThan(-1)
    expect(ledger.slice(at, at + 600)).toContain("CREATE TABLE help_status_events")
  })

  it("its SQL is the table, its index, and no rows at all", () => {
    const sql = ledger.slice(at, ledger.indexOf("`,", at))
    expect(
      /INSERT\s+INTO\s+help_status_events/i.test(sql),
      "0066 must not invent a history: the activity feed is best-effort, is prose, folds a whole bulk into one sentence, and says nothing at all about the tickets imported from Glide. Read the migration's own comment"
    ).toBe(false)
  })
})
