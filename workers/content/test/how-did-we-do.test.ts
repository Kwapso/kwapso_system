// HOW WE DID, ACCORDING TO THE PERSON WE DID IT FOR.
//
// The owner, 2026-09-06: "let's store sentiment (1-3) on the portal for how did
// we do it to see if client is happy", then "sentiment they can add a text
// (optional)". Team migration 0067 is the table; workers/content/src/lib/help-
// ratings.ts is the door, and this suite is what makes its three rulings true
// rather than three paragraphs somebody meant:
//
//   · ONLY ON A FINISHED TICKET. "How did we do" is past tense. Asked mid-flight
//     it measures how a person feels about waiting, and that answer would land
//     in the same column with nothing able to separate the two afterwards.
//   · OPTIONAL MEANS OPTIONAL. A score with no words is a complete rating and
//     nothing anywhere refuses or nags on the absence of text.
//   · IT APPENDS AND NEVER UPDATES. A later change of mind is a new row: the
//     useful sentence this data can say is "we did badly and then we fixed it",
//     and only a row per answer can say it.
//
// And the fence, which is the ticket's own: a rating is a PROPERTY of a ticket,
// so whether the ticket is theirs to speak about is the only question — with one
// narrowing on the read, because a colleague's private "1 out of 3" is a
// personal statement rather than a fact about the ticket the way a reply is.

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

type RatingBody = {
  ratings: { id: string; score: number; comment: string | null; byId: string | null }[]
  mine: { score: number; comment: string | null } | null
}

async function raise(): Promise<string> {
  const res = await call(IDS.staffUser, "POST /api/content/help", {
    description: "The dispatch board will not load on a phone",
    helpType: "Issue",
    accountId: IDS.victimAccount,
  })
  const body = (await res.json()) as { tickets?: { id: string }[]; id?: string }
  const id = body.id ?? body.tickets?.[0]?.id
  if (!id) throw new Error(`raise failed ${res.status}`)
  return id
}

/** Raise it and answer it, which is the only state in which the question exists. */
async function answered(): Promise<string> {
  const id = await raise()
  const res = await call(IDS.staffUser, "POST /api/content/help/resolve", {
    id,
    resolution: "Fixed and deployed this morning.",
  })
  expect(res.status, await res.clone().text()).toBe(200)
  return id
}

const rows = (id: string) =>
  db()
    .prepare(
      `SELECT score, comment, creator_id FROM help_ratings WHERE help_id = ? ORDER BY created_at ASC, rowid ASC`
    )
    .all(id) as { score: number; comment: string | null; creator_id: string | null }[]

beforeEach(() => {
  holder.db = buildSpineDb()
})

describe("when the question may be asked", () => {
  it("a ticket that is still open refuses it, in words", async () => {
    const id = await raise()
    const res = await call(IDS.contactUser, "POST /api/content/help/rating", { id, score: 3 })
    expect(res.status).toBe(409)
    expect(await res.text()).toContain("still open")
    expect(rows(id), "a refused rating must leave no row behind").toEqual([])
  })

  it("an answered ticket takes it", async () => {
    const id = await answered()
    const res = await call(IDS.contactUser, "POST /api/content/help/rating", { id, score: 2 })
    expect(res.status, await res.clone().text()).toBe(200)
    expect(rows(id)).toEqual([{ score: 2, comment: null, creator_id: IDS.contactUser }])
  })

  it("a reopen does not take the answer back", async () => {
    // The whole shape of 0067 in one case: what somebody said about how we did
    // is a record of a moment, and the moment happened.
    const id = await answered()
    await call(IDS.contactUser, "POST /api/content/help/rating", { id, score: 1 })
    await call(IDS.staffUser, "POST /api/content/help/status", { id, status: "in_progress" })
    expect(rows(id).map((r) => r.score)).toEqual([1])
  })
})

describe("optional means optional", () => {
  it("a score with no words is a complete rating", async () => {
    const id = await answered()
    const res = await call(IDS.contactUser, "POST /api/content/help/rating", { id, score: 3 })
    expect(res.status).toBe(200)
    expect(rows(id)[0].comment, "an absent comment is absent, never an empty string").toBeNull()
  })

  it("…and words ride along when somebody wants to write them", async () => {
    const id = await answered()
    await call(IDS.contactUser, "POST /api/content/help/rating", {
      id,
      score: 1,
      comment: "It took three weeks and nobody told us why.",
    })
    expect(rows(id)[0].comment).toBe("It took three weeks and nobody told us why.")
  })

  it("a score off the scale is a sentence, not a database error", async () => {
    const id = await answered()
    for (const score of [0, 4, "high"]) {
      const res = await call(IDS.contactUser, "POST /api/content/help/rating", { id, score })
      expect(res.status, `score ${score} should be refused at the door`).toBe(400)
    }
    expect(rows(id)).toEqual([])
  })
})

describe("a change of mind appends", () => {
  it("the second answer is a second row, and the first one survives it", async () => {
    const id = await answered()
    await call(IDS.contactUser, "POST /api/content/help/rating", { id, score: 1, comment: "Slow." })
    await call(IDS.contactUser, "POST /api/content/help/rating", { id, score: 3, comment: "Sorted now." })

    expect(
      rows(id).map((r) => [r.score, r.comment]),
      "an upsert here would answer 'what do they think now' perfectly and destroy 'what did they think then'"
    ).toEqual([
      [1, "Slow."],
      [3, "Sorted now."],
    ])
  })

  it("and the standing answer is the newest of them", async () => {
    const id = await answered()
    await call(IDS.contactUser, "POST /api/content/help/rating", { id, score: 1 })
    await call(IDS.contactUser, "POST /api/content/help/rating", { id, score: 3 })
    const res = await call(IDS.contactUser, `GET /api/content/help/rating?id=${id}`)
    const body = (await res.json()) as RatingBody
    expect(body.mine?.score).toBe(3)
  })
})

describe("who may read what was said", () => {
  it("the agency reads the whole set — that is the point of storing it", async () => {
    const id = await answered()
    await call(IDS.contactUser, "POST /api/content/help/rating", { id, score: 2, comment: "Fine." })
    const res = await call(IDS.staffUser, `GET /api/content/help/rating?id=${id}`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as RatingBody
    expect(body.ratings.map((r) => r.score)).toEqual([2])
    expect(body.ratings[0].comment).toBe("Fine.")
  })

  it("a client reads their OWN answers and nobody else's", async () => {
    // A colleague's private verdict is a personal statement, not a fact about
    // the ticket the way a reply is. The narrowing is in the door's statement,
    // so there is no moment at which it has been fetched into a response some
    // later redaction could forget to strip.
    const id = await answered()
    await call(IDS.contactUser, "POST /api/content/help/rating", { id, score: 1 })
    // A staff member relaying a second verdict off a phone call — a real row on
    // the same ticket, written by somebody who is not this contact.
    await call(IDS.staffUser, "POST /api/content/help/rating", { id, score: 3 })

    const staffSees = (await (await call(IDS.staffUser, `GET /api/content/help/rating?id=${id}`)).json()) as RatingBody
    expect(staffSees.ratings.length).toBe(2)

    const clientSees = (await (
      await call(IDS.contactUser, `GET /api/content/help/rating?id=${id}`)
    ).json()) as RatingBody
    expect(clientSees.ratings.map((r) => r.byId)).toEqual([IDS.contactUser])
  })

  it("a ticket outside the fence is not there — 404, never 403", async () => {
    // "Not yours" must never confirm that a ticket exists.
    const id = await answered()
    const res = await call(IDS.burglarUser, `GET /api/content/help/rating?id=${id}`)
    expect(res.status).toBe(404)
    const write = await call(IDS.burglarUser, "POST /api/content/help/rating", { id, score: 3 })
    expect(write.status).toBe(404)
  })
})

describe("the agency can read what a client said, today, with no new screen", () => {
  it("a rating writes a line into the ticket's own history", async () => {
    // There is no sentiment dashboard yet and its shape is a separate design
    // question — but "the agency must be able to read what a client said" is not
    // a thing to defer, and the Activity tab is where the agency already reads
    // everything else that happened to a request. The client's side has no
    // activity feed at all (PORTAL_ACTIVITY_EXEMPT), so this sentence is ours.
    const id = await answered()
    await call(IDS.contactUser, "POST /api/content/help/rating", { id, score: 2 })
    const row = db()
      .prepare(
        `SELECT type, description FROM activity WHERE related_table = 'help' AND related_row_id = ?
          AND type = 'Ticket rated'`
      )
      .get(id) as { type: string; description: string } | undefined
    expect(row, "nothing in the agency's app would ever say a verdict had been given").toBeTruthy()
    expect(row?.description).toContain("2 out of 3")
  })
})

describe("nothing rewrites a verdict", () => {
  const workerSources = () => {
    const dirs = ["auth", "content", "data-ops", "mcp", "realtime", "tenancy"].map((w) =>
      join(ROOT, "workers", w, "src")
    )
    return sourceFiles(dirs, { extensions: [".ts"], relativeTo: ROOT })
  }

  it("no worker UPDATEs or DELETEs help_ratings", () => {
    // The negative half, which no behavioural test can reach: the write somebody
    // adds next month. An upsert here is the single change that would quietly
    // turn this table back into the column it exists instead of.
    const offenders: string[] = []
    for (const { rel, source } of workerSources())
      for (const m of stripComments(source).matchAll(/(UPDATE|DELETE\s+FROM)\s+help_ratings/gi))
        offenders.push(`${rel}: ${m[0]}`)
    expect(
      offenders,
      "a rating records how we did AT THE TIME. Overwriting one destroys the only sentence this data can say that a column could not — read team migration 0067"
    ).toEqual([])
  })

  it("one file writes the table, and it is the door's own lib", () => {
    const writers = workerSources().filter(({ source }) =>
      /INSERT INTO help_ratings/i.test(stripComments(source))
    )
    expect(writers.map((f) => f.rel)).toEqual(["workers/content/src/lib/help-ratings.ts"])
  })
})
