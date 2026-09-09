// THE CONNECTIONS TAB TELLS THE TRUTH — knowledge-detail.tsx's map panel used
// to have two states where it needed three: `mapQ.data ? <RelationshipMap /> :
// <Skeleton />` showed the same four grey rows whether the read was still in
// flight or had already failed, so a door error sat there forever looking like
// a slow network. Reported 8 Sep 2026: "any failure renders as a loading
// skeleton that never resolves."
//
// This proves the fix carries all three states a record's neighbourhood read
// can be in: still loading (the skeleton, and ONLY the skeleton), failed (a
// sentence and a working retry — pressing it asks the door again), and loaded-
// but-genuinely-empty (the kit's own register inside `RelationshipMap`, not a
// second skeleton and not a blank panel).
//
// EACH CASE GETS ITS OWN RECORD. `shared/web/store.ts` dedupes concurrent
// reads of the SAME cache key across the whole module (`inFlight`), which
// outlives `cleanup()` between tests — a never-settling promise from the
// "still loading" case would otherwise be joined by every later case asking
// for the same key, and none of them would ever see their own answer.
//
// A FOURTH STATE, reported 8 Sep 2026 in the same breath as the first bug: the
// owner opened a source that came "From an email" and pressed a "Try again"
// that would refuse forever. `getKnowledgeMap` answers a 400 for any
// `originTable` outside `ACTIVITY_GATE_MAP` — permanently, by design, since a
// Google-mirrored source names a system this database has no row for — and
// "failed" above was one bucket for that AND a dropped connection alike. Two
// suites below hold the two halves of the fix apart: the panel tells a
// permanent refusal from a transient one (no retry button on the former), and
// the tab itself never renders for a table the door will never draw.

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { KnowledgeDetailScreen } from "@/components/knowledge/knowledge-detail"
import { ApiFailure } from "@/lib/api"
import { appsKey, knowledgeKey } from "@/lib/live-resources"
import { primeCache } from "@shared/web/store"
import type { KnowledgeSource } from "@shared/types"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: () => {}, push: () => {} }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}))

const { door } = vi.hoisted(() => ({
  door: {
    recordMap: (_table: string, _id: string): Promise<unknown> =>
      Promise.resolve({ focus: null, nodes: [], links: [], total: 0, capped: false }),
    sourcesInPage: [] as unknown[],
  },
}))

vi.mock("@/lib/api", () => ({
  ApiFailure: class extends Error {
    status: number
    code: string
    constructor(status: number, code: string, message: string) {
      super(message)
      this.status = status
      this.code = code
    }
  },
  content: {
    knowledge: async () => ({ sources: door.sourcesInPage }),
    knowledgeOne: async (id: string) =>
      (door.sourcesInPage as KnowledgeSource[]).find((s) => s.id === id) ?? null,
    recordMap: (table: string, id: string) => door.recordMap(table, id),
    updateKnowledge: async () => {
      throw new Error("not exercised by this suite")
    },
    setKnowledgeActive: async () => {
      throw new Error("not exercised by this suite")
    },
  },
  tenancy: {
    accounts: async () => ({ accounts: [], total: 0, entityTotal: 0, individualTotal: 0, nextCursor: null }),
    accountRow: async () => null,
    apps: async () => ({ apps: [], total: 0 }),
    myPermissions: async () => ({ permissions: { knowledge: { edit: true, delete: true } } }),
    recordActivity: async () => ({ activity: [], total: 0, nextCursor: null }),
  },
}))

afterEach(cleanup)

const TEAM = "TEAM"

function makeSource(over: Partial<KnowledgeSource>): KnowledgeSource {
  return {
    id: "SRC",
    kind: "mirror",
    originTable: null,
    originRowId: null,
    compartment: "team",
    accountId: null,
    appId: null,
    ticketId: null,
    sprintId: null,
    recordDate: null,
    title: "Mapland GmbH",
    summary: null,
    body: "What the assistant reads.",
    bodyBytes: 10,
    bodyTruncated: false,
    sourceUrl: null,
    fileUrl: null,
    fileName: null,
    fileType: null,
    fileBytes: 0,
    fileNote: null,
    visibility: "team",
    ownerUserId: null,
    visibleToAppId: null,
    visibleToAppName: null,
    indexedAt: "2026-09-01T00:00:00.000Z",
    chunkCount: 3,
    indexedChunks: 3,
    indexError: null,
    active: true,
    createdAt: "2026-09-01T00:00:00.000Z",
    creatorName: "Aurora",
    editorName: null,
    updatedAt: null,
    ...over,
  }
}

/** Every cached read the screen opens with, warmed so only `mapQ` is under
 * test — a bare `useCached` revalidates on mount regardless of a warm cache
 * (shared/web/store.ts, "REVALIDATE ON MOUNT"), which the `@/lib/api` mock
 * above answers quietly for everything except the map. */
function primeTeam(source: KnowledgeSource) {
  door.sourcesInPage = [source]
  primeCache(knowledgeKey(TEAM), [source])
  primeCache(`knowledge:one:${source.id}`, source)
  primeCache(`accounts:${TEAM}`, [])
  primeCache(appsKey(TEAM), [])
  primeCache(`my-perms:${TEAM}`, { knowledge: { edit: true, delete: true } })
  primeCache(`activity:record:knowledge_sources:${source.id}`, [])
}

function openConnectionsTab(source: KnowledgeSource) {
  render(<KnowledgeDetailScreen teamId={TEAM} sourceId={source.id} />)
  const tab = screen.getByRole("tab", { name: /Connections/ })
  fireEvent.mouseDown(tab, { button: 0 })
  fireEvent.click(tab)
  expect(tab.getAttribute("aria-selected")).toBe("true")
}

describe("the Connections tab — three states, not one", () => {
  it("still loading: the skeleton, and nothing that claims to be an answer", async () => {
    const source = makeSource({ id: "SRC-LOADING", originTable: "accounts", originRowId: "ACC-LOADING" })
    primeTeam(source)
    door.recordMap = () => new Promise(() => {}) // never settles, on purpose
    openConnectionsTab(source)

    // Give any microtask queue a turn — there is nothing to await on a
    // promise that never settles, so this proves absence rather than timing.
    await Promise.resolve()
    expect(screen.queryByText("Couldn't load this record's connections.")).toBeNull()
    expect(screen.queryByText("Nothing is linked to this yet.")).toBeNull()
  })

  it("failed: says so, and Try again asks the door again", async () => {
    const source = makeSource({ id: "SRC-FAILED", originTable: "accounts", originRowId: "ACC-FAILED" })
    primeTeam(source)
    let calls = 0
    door.recordMap = () => {
      calls++
      return Promise.reject(new Error("network gone"))
    }
    openConnectionsTab(source)

    expect(await screen.findByText("Couldn't load this record's connections.")).toBeTruthy()
    expect(calls).toBe(1)

    // MUTATION-PROVEN: revert the fix (drop the `mapQ.error` branch, back to
    // `mapQ.data ? <RelationshipMap /> : <Skeleton />`) and this is the
    // assertion that goes red — the sentence and the button disappear, and the
    // panel goes back to a skeleton that never becomes anything else.
    const retry = screen.getByRole("button", { name: "Try again" })
    fireEvent.click(retry)
    await screen.findByText("Couldn't load this record's connections.")
    expect(calls).toBe(2)
  })

  it("loaded, genuinely empty: the kit's own register, not a second skeleton", async () => {
    const source = makeSource({ id: "SRC-EMPTY", originTable: "accounts", originRowId: "ACC-EMPTY" })
    primeTeam(source)
    const focus = { table: "accounts", id: "ACC-EMPTY", label: "Mapland GmbH" }
    door.recordMap = async () => ({ focus, nodes: [focus], links: [], total: 0, capped: false })
    openConnectionsTab(source)

    expect(await screen.findByText("Nothing is linked to this yet.")).toBeTruthy()
    expect(screen.queryByText("Couldn't load this record's connections.")).toBeNull()
  })

  it("a real neighbourhood renders once the read lands", async () => {
    const source = makeSource({ id: "SRC-FULL", originTable: "accounts", originRowId: "ACC-FULL" })
    primeTeam(source)
    const focus = { table: "accounts", id: "ACC-FULL", label: "Mapland GmbH" }
    const other = { table: "apps", id: "APP-FULL", label: "Dispatch" }
    door.recordMap = async () => ({
      focus,
      nodes: [focus, other],
      links: [{ from: "accounts:ACC-FULL", to: "apps:APP-FULL", relation: "runs" }],
      total: 1,
      capped: false,
    })
    openConnectionsTab(source)

    // Drawn twice on purpose (relationship-map.tsx): once as a node in the
    // picture, once as the same fact said in words for a screen reader.
    expect(await screen.findAllByText("Dispatch")).toHaveLength(2)
  })

  it("permanently refused (400): the honest sentence, and no button that will only refuse again", async () => {
    const source = makeSource({ id: "SRC-REFUSED", originTable: "accounts", originRowId: "ACC-REFUSED" })
    primeTeam(source)
    let calls = 0
    door.recordMap = () => {
      calls++
      return Promise.reject(
        new ApiFailure(400, "invalid_input", "That is not a kind of record this map draws.")
      )
    }
    openConnectionsTab(source)

    expect(await screen.findByText("This source doesn't have a map to draw.")).toBeTruthy()
    expect(calls).toBe(1)

    // MUTATION-PROVEN: revert the `ApiFailure`/`status === 400` branch back to
    // the single "Couldn't load…" + retry render, and this goes red — the
    // sentence disappears and a "Try again" appears in its place.
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull()
    expect(screen.queryByText("Couldn't load this record's connections.")).toBeNull()
  })
})

describe("WHERE the Connections tab stands — the origin row, else the source itself", () => {
  // THIS SUITE REPLACES ONE THAT ASSERTED THE OPPOSITE, and the reversal is the
  // point rather than a correction. Until `RECORD_EDGES` carried the source's own
  // relationships, a source mirrored from outside this database had NOTHING to
  // draw — `getKnowledgeMap` refuses any `originTable` outside ACTIVITY_GATE_MAP,
  // permanently — so hiding the tab was the honest answer and the old test
  // pinned it. It now has something: the call it came out of (migration 0070),
  // and the account, app and sprint it is filed under. So the tab is offered to
  // every source, and what these tests pin is WHICH RECORD the map stands on,
  // which is the part a reader cannot see and a regression would not announce.
  //
  // NO PERMISSION CHANGED to make this work: `knowledge_sources` has been a key
  // of ACTIVITY_GATE_MAP (`knowledge`) all along, which is the same right this
  // screen is already gated on. ACTIVITY_GATE_MAP is untouched by this lane.
  /** The (table, id) the screen actually asked the door for. */
  function recordWhatItAsked() {
    const asked: { table: string; id: string }[] = []
    door.recordMap = async (table: string, id: string) => {
      asked.push({ table, id })
      return { focus: null, nodes: [], links: [], total: 0, capped: false }
    }
    return asked
  }

  it("a mirrored source stands on its ORIGIN row — the record somebody came looking for", () => {
    const source = makeSource({ id: "SRC-DRAWABLE", originTable: "accounts", originRowId: "ACC-DRAWABLE" })
    primeTeam(source)
    const asked = recordWhatItAsked()
    render(<KnowledgeDetailScreen teamId={TEAM} sourceId={source.id} />)

    expect(screen.getByRole("tab", { name: /Connections/ })).toBeTruthy()
    expect(asked, "the account's neighbourhood is richer than the copy's").toContainEqual({
      table: "accounts",
      id: "ACC-DRAWABLE",
    })
  })

  it("an EMAIL gets the tab now, standing on itself — never on `google_gmail`", () => {
    const source = makeSource({
      id: "SRC-GMAIL",
      kind: "email",
      originTable: "google_gmail",
      originRowId: "gmail:msg-1",
    })
    primeTeam(source)
    const asked = recordWhatItAsked()
    render(<KnowledgeDetailScreen teamId={TEAM} sourceId={source.id} />)

    expect(
      screen.getByRole("tab", { name: /Connections/ }),
      "1,313 of 4,838 sources on staging are one of the four external kinds"
    ).toBeTruthy()
    expect(asked).toContainEqual({ table: "knowledge_sources", id: "SRC-GMAIL" })
    expect(
      asked.some((a) => a.table === "google_gmail"),
      "asking for a table the door refuses is the bug the old gate existed to stop"
    ).toBe(false)
  })

  it("a typed note — no origin at all — stands on itself too", () => {
    const source = makeSource({ id: "SRC-NOTE", kind: "note", originTable: null, originRowId: null })
    primeTeam(source)
    const asked = recordWhatItAsked()
    render(<KnowledgeDetailScreen teamId={TEAM} sourceId={source.id} />)

    expect(screen.getByRole("tab", { name: /Connections/ })).toBeTruthy()
    expect(asked).toContainEqual({ table: "knowledge_sources", id: "SRC-NOTE" })
  })

  it("…and a source with nothing attached says so, rather than looking broken", async () => {
    const source = makeSource({ id: "SRC-LONELY", kind: "note", originTable: null, originRowId: null })
    primeTeam(source)
    const focus = { table: "knowledge_sources", id: "SRC-LONELY", label: "Mapland GmbH" }
    door.recordMap = async () => ({ focus, nodes: [focus], links: [], total: 0, capped: false })
    openConnectionsTab(source)

    // The whole reason the old gate hid the tab was that a tab which always
    // fails teaches people not to press it. An empty answer is not a failure —
    // it is the kit's own register, and it is reached rather than refused.
    expect(await screen.findByText("Nothing is linked to this yet.")).toBeTruthy()
    expect(screen.queryByText("Couldn't load this record's connections.")).toBeNull()
  })
})
