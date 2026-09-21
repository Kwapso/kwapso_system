// THE BACKLOG TAB'S OWN STATUS FACET — Aurora's ruling, 21 Sep 2026, verbatim:
// "To Do means its scheduled in an active phase, Backlog otherwise" — and the
// Filter panel on the Backlog tab offers them as two choices, beside In Review
// and Done. `work-panels.tsx`'s own StoriesPanel facet already offers the
// identical two virtual words through `<PagedFind>`'s own door-forwarding
// (`web/test/story-status-board.test.ts`'s last `describe` block, which this
// file's static half mirrors); this is the Backlog TAB's own facet
// (`stories-screen.tsx`, `useFilterBar`, never `PagedFind`), narrower by one
// choice (no In Progress, the brief's own word) and narrowed through the DOOR
// rather than sieved over the loaded page (R14/R16) — which the first suite
// below cannot see (a static read of the source), so the second suite RENDERS
// the real screen and reads what the door was actually asked, the same
// discipline `facets-ask-the-door.test.tsx` states for `PagedFind`'s own
// facets.

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { primeCache } from "@shared/web/store"
import { appsKey, storiesKey } from "@/lib/live-resources"
import { BASE_RECIPES } from "@/lib/screens"
import { StoriesScreen } from "@/components/work/stories-screen"
import type { Story } from "@shared/types"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..")

// The screen mounts its create dialog, which reaches the router.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: () => {}, push: () => {} }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}))

const { door, asked } = vi.hoisted(() => ({
  door: { stories: [] as unknown[] },
  /** EVERY OPTS OBJECT `content.stories` WAS CALLED WITH, in call order — the
   * one thing this suite is actually about: whether picking "To Do" issues a
   * real request carrying `status: "to_do"`, never a sieve over rows already
   * on screen. */
  asked: [] as Record<string, unknown>[],
}))
vi.mock("@/lib/api", () => ({
  ApiFailure: class extends Error {},
  content: {
    stories: async (opts: Record<string, unknown> = {}) => {
      asked.push({ ...opts })
      return {
        stories: door.stories,
        total: door.stories.length,
        totalCapped: false,
        hasMore: false,
        nextCursor: null,
        mineTotal: door.stories.length,
        openTotal: door.stories.length,
        nowTotal: door.stories.length,
        plannedTotal: door.stories.length,
        backlogTotal: door.stories.length,
        completedTotal: door.stories.length,
        everyoneTotal: door.stories.length,
      }
    },
    createStory: async () => ({ stories: [], createdId: "new" }),
    setStoryStatus: async () => ({ stories: [] }),
  },
  tenancy: {
    members: async () => ({ members: [] }),
    apps: async () => ({ apps: [], total: 0 }),
    accounts: async () => ({ accounts: [], total: 0, entityTotal: 0, individualTotal: 0, nextCursor: null }),
    selectable: async () => ({ values: [], total: 0 }),
    myPermissions: async () => ({ permissions: {} }),
  },
}))
vi.mock("@/lib/api/tenancy", () => ({
  tenancy: {
    members: async () => ({ members: [] }),
    accounts: async () => ({ accounts: [], total: 0, entityTotal: 0, individualTotal: 0, nextCursor: null }),
    selectable: async () => ({ values: [], total: 0 }),
  },
}))

/** WHAT JSDOM HAS NOT GOT. Radix's popovers measure themselves and capture the
 * pointer; neither exists here, and without them the facet's own trigger
 * simply never opens (`facets-ask-the-door.test.tsx`'s own header explains
 * this same shim). */
beforeAll(() => {
  Object.assign(window.HTMLElement.prototype, {
    scrollIntoView: () => {},
    hasPointerCapture: () => false,
    releasePointerCapture: () => {},
    setPointerCapture: () => {},
  })
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

afterEach(cleanup)

const ONE_STORY = {
  id: "st1",
  ref: "B0001",
  title: "Move dispatch onto the driver app",
  detail: null,
  status: "open",
  ticketId: null,
  ticketRef: null,
  sprintId: null,
  sprintName: null,
  appId: null,
  appName: null,
  appAssigneeId: null,
  processId: null,
  stepKey: null,
  changesNoStep: true,
  processIds: [],
  assigneeId: "u1",
  assigneeName: "Bea",
  reviewerId: null,
  reviewerName: null,
  startsOn: null,
  dueOn: null,
  sprintEndsOn: null,
  sprintStartsOn: null,
  closedAt: null,
  closingNote: null,
  storyType: "Feature",
  category: "Client-requested",
  acceptanceCriteria: null,
  buildNotes: null,
  moscow: null,
  reviewNote: null,
  reviewFileUrl: null,
  reviewFileName: null,
  rank: "a0",
  accountId: null,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: null,
  createdByName: null,
  editedByName: null,
} as Story

let n = 0
function renderBacklog(stories: Story[]) {
  const teamId = `backlog-facet-${++n}`
  primeCache(`selectable:${teamId}`, [])
  primeCache(`members:${teamId}`, [])
  primeCache(appsKey(teamId), [])
  primeCache(`accounts:${teamId}`, [])
  door.stories = stories
  primeCache(storiesKey(teamId, "backlog"), stories)
  return render(
    <StoriesScreen
      teamId={teamId}
      recipe={BASE_RECIPES["stories.list"]}
      rights={{ work: { read: true, create: true, update: true } } as never}
      total={stories.length}
      counts={{
        now: stories.length,
        planned: stories.length,
        backlog: stories.length,
        completed: stories.length,
        all: stories.length,
        reviews: stories.length,
      }}
      view="backlog"
      onViewChange={() => {}}
      canCreate
      onAction={() => {}}
      onIntent={() => {}}
    />
  )
}

/** Open the facet panel and choose one of a facet's words — the identical
 * choreography `facets-ask-the-door.test.tsx` uses over `PagedFind`'s own
 * panel: this screen's toolbar is built by the same `useFilterBar` seam
 * (`shared/web/screen-engine/filter-bar.tsx`), so the same `CompactFacet`
 * mechanics apply. */
async function pick(label: string, option: string) {
  if (screen.queryAllByRole("group", { name: label }).length === 0)
    fireEvent.click(screen.getByRole("button", { name: /^Filter/ }))
  const facet = await screen.findByRole("group", { name: label })
  fireEvent.click(within(facet).getByRole("button"))
  const listbox = await screen.findByRole("listbox")
  await waitFor(() => expect(within(listbox).getAllByRole("option").length).toBeGreaterThan(0))
  fireEvent.click(within(listbox).getByRole("option", { name: option }))
}

describe("stories-screen.tsx's own Backlog Status facet — declared order", () => {
  it("offers exactly four choices, Backlog/To Do/In Review/Done, in that order", () => {
    const src = readFileSync(join(ROOT, "web", "components", "work", "stories-screen.tsx"), "utf8")
    const at = src.indexOf('field: "status"')
    expect(at, "the Backlog tab's own status facet").toBeGreaterThan(-1)
    const block = src.slice(at, at + 700)
    const order = [...block.matchAll(/value:\s*"(backlog|to_do|in_review|done|in_progress|open)"/g)].map((m) => m[1])
    expect(order).toEqual(["backlog", "to_do", "in_review", "done"])
    // No fifth/sixth stored status, and never the raw `open` value — the two
    // virtual words are what a person picks (`OpenStoryFacetStatus`,
    // workers/content/src/lib/stories.ts), never a status this door writes.
    expect(block).not.toMatch(/value:\s*"in_progress"/)
    expect(block).not.toMatch(/value:\s*"open"/)
  })

  it("is declared only inside the Backlog tab's own branch, never unconditionally", () => {
    const src = readFileSync(join(ROOT, "web", "components", "work", "stories-screen.tsx"), "utf8")
    const at = src.indexOf('field: "status"')
    const before = src.slice(Math.max(0, at - 400), at)
    expect(before, "the status facet must be gated on the Backlog tab").toMatch(/view === "backlog"/)
  })
})

describe("the Backlog tab's Status facet — RENDERED order", () => {
  // R75: `useFilterBar` alphabetizes every facet's options by default
  // (`sortedOptions(optionsFor(f), lang)`), so the "declared order" suite
  // above — a static read of the source array — cannot see whether that
  // default sort still runs on top of it. Before `ordered: true` was set on
  // this facet, the DECLARED array above (Backlog, To Do, In Review, Done)
  // rendered as Backlog, Done, In Review, To Do — alphabetical, not the
  // lifecycle order Aurora ruled. This suite opens the real panel and reads
  // the option list a person actually sees.
  it("opens with Backlog, To Do, In Review, Done, in that order — not alphabetical", async () => {
    renderBacklog([ONE_STORY])
    await screen.findAllByText(/Move dispatch onto the driver app/)
    if (screen.queryAllByRole("group", { name: "Status" }).length === 0)
      fireEvent.click(screen.getByRole("button", { name: /^Filter/ }))
    const facet = await screen.findByRole("group", { name: "Status" })
    fireEvent.click(within(facet).getByRole("button"))
    const listbox = await screen.findByRole("listbox")
    await waitFor(() => expect(within(listbox).getAllByRole("option").length).toBe(5))
    const labels = within(listbox)
      .getAllByRole("option")
      .map((el) => el.textContent?.trim())
    // The panel's own leading "clear this facet" option ("Any status") comes
    // first, ahead of the four real choices — not part of the ordering this
    // law is about, so it is sliced off before the assertion.
    expect(labels.slice(1)).toEqual(["Backlog", "To Do", "In Review", "Done"])
  })
})

describe("the Backlog tab's Status facet narrows through the door, never client side", () => {
  it("choosing To Do issues a request carrying status=to_do", async () => {
    asked.length = 0
    renderBacklog([ONE_STORY])
    expect((await screen.findAllByText(/Move dispatch onto the driver app/)).length).toBeGreaterThan(0)

    await pick("Status", "To Do")

    await waitFor(() => expect(asked.some((q) => q.status === "to_do")).toBe(true))
    // AND THE VIEW RIDES ALONG — the door is still asked for the Backlog
    // tab's own rows, `status` narrows WITHIN it, never instead of it.
    expect(asked.some((q) => q.status === "to_do" && q.view === "backlog")).toBe(true)
  })

  it("an untouched Backlog tab never asks the door for a status at all", async () => {
    asked.length = 0
    renderBacklog([ONE_STORY])
    await screen.findAllByText(/Move dispatch onto the driver app/)
    expect(asked.some((q) => "status" in q)).toBe(false)
  })
})
