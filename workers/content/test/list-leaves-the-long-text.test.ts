// A PAGE IS TITLES; THE WORDS ARE THE RECORD'S OWN.
//
// Measured 7 Sep 2026 against staging's own team database ("Kwapso"), one page
// of fifty stories was 63,374 characters and 25,519 of them — 40.3% — were
// `detail`: rich text somebody typed into a paragraph field, sent to every
// screen that draws a page of stories, and drawn by none of them. The screens
// draw the title, the status, the assignee and the deadline; the words live on
// the story's own screen, which reads the story BY ID and always did
// (`story:one:<id>`, no list fallback — the live registry says so in writing).
//
// So the list door leaves `detail` out and the by-id door keeps it whole, the
// same split `knowledge.ts` has made between `LIST_COLS` and `DETAIL_COLS`
// since a source could be a 300-page contract.
//
// WHY THIS FILE EXISTS RATHER THAN A COMMENT. A trimmed column is invisible
// from every direction that usually catches a mistake: the door answers 200,
// the page renders, the types still say `string | null`, and nothing on any
// screen changes. The only thing that moves is a number nobody can see. So both
// halves are asserted through the SHIPPED door against a real SQLite database —
// the page must NOT carry the words, and the single story MUST — because either
// half alone is satisfied by deleting the other.
//
// It is deliberately the narrow claim. A ticket's `description` is 40.3% of ITS
// page by the same measurement and must NOT be trimmed: three screens render it
// straight off a list row, including the ticket's own body until a by-id read
// lands (web-portal/components/ticket-screen.tsx says so at its own read). The
// discriminator is not the size of the field. It is whether a screen showing
// one record reads that record by id.

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

const call = (route: string, body?: unknown) => {
  const [method, path] = route.split(" ")
  return worker.fetch(
    new Request(`https://content${path}`, {
      method,
      headers: { Cookie: "session=x", "Content-Type": "application/json" },
      body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
    }),
    env(IDS.staffUser) as never
  )
}

type StoryRow = { id: string; title: string; detail: string | null }

async function stories(path: string): Promise<StoryRow[]> {
  const res = await call(`GET ${path}`)
  expect(res.status, `${path} refused (${await res.clone().text()})`).toBe(200)
  return ((await res.json()) as { stories: StoryRow[] }).stories
}

/** The words of the work — long enough that nobody could mistake their absence
 * for a field that was empty in the fixture. */
const WORDS =
  "<p>The dispatch board renders every row on every keystroke, so typing in the " +
  "filter box redraws four hundred rows a character. Memoise the row and move " +
  "the filter into the query, then measure it again on a phone.</p>"

beforeEach(() => {
  holder.db = buildSpineDb()
})

describe("a page of stories leaves the words of the work behind", () => {
  it("does not send `detail` in a page, and does send everything a row draws", async () => {
    const made = await call("POST /api/content/stories", {
      title: "Make the dispatch board responsive",
      storyType: "Fix",
      detail: WORDS,
      changesNoStep: true,
    })
    expect(made.status).toBe(200)

    const page = await stories("/api/content/stories?view=all")
    expect(page.length).toBeGreaterThan(0)
    const row = page.find((s) => s.title === "Make the dispatch board responsive")
    expect(row, "the story is in the page at all").toBeTruthy()
    // THE CLAIM. Null, not absent: the field is part of the shape either way, so
    // a reader can tell "not sent here" from "this key does not exist".
    expect(row?.detail, "a page carries the words of the work").toBeNull()
    // …and the trim took nothing else with it. A list row still draws.
    expect(row?.title).toBe("Make the dispatch board responsive")
  })

  it("sends it whole when one story is asked for by id", async () => {
    const made = await call("POST /api/content/stories", {
      title: "Make the dispatch board responsive",
      storyType: "Fix",
      detail: WORDS,
      changesNoStep: true,
    })
    const id = ((await made.json()) as { stories: { id: string }[] }).stories[0].id

    // THE OTHER HALF, and the reason it is here: "the page does not carry the
    // words" is also true of a door that lost them altogether.
    const [one] = await stories(`/api/content/stories?id=${id}`)
    expect(one.id).toBe(id)
    expect(one.detail, "the story's own read carries the words whole").toBe(WORDS)
  })

  it("still searches the words it does not send", async () => {
    await call("POST /api/content/stories", {
      title: "Make the dispatch board responsive",
      storyType: "Fix",
      detail: WORDS,
      changesNoStep: true,
    })
    // `q` reads the COLUMN, not the response, so trimming the payload must not
    // have narrowed what the door can find. A needle that appears only in the
    // detail is the only honest way to ask that.
    const found = await stories("/api/content/stories?view=all&q=memoise")
    expect(found.map((s) => s.title)).toContain("Make the dispatch board responsive")
    expect(found[0].detail, "…and finding it by its words still does not send them").toBeNull()
  })
})
