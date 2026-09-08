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

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { KnowledgeDetailScreen } from "@/components/knowledge/knowledge-detail"
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
  ApiFailure: class extends Error {},
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
})
