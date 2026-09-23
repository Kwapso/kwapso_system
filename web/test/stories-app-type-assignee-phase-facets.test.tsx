// T3851 — "a filter option inside backlog would be good, where I can filter my
// backlogs." The Filter control already existed (Category, plus Status on the
// Backlog tab), reachable on every tab, so the ticket was really about the
// FACETS on offer: nobody narrows their backlog by category alone, they narrow
// by which app it is for, what kind of work it is, who has it, or which phase
// it sits in. This locks the four facets that answer the actual ask — App,
// Story type, Assignee and Phase — and that all four narrow the loaded page
// directly (client-side, the same seam Category already uses), never a new
// door request, the mirror image of `stories-backlog-status-facet.test.tsx`'s
// door-bound Status facet.

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import { primeCache } from "@shared/web/store"
import { appsKey, storiesKey } from "@/lib/live-resources"
import { BASE_RECIPES } from "@/lib/screens"
import { StoriesScreen } from "@/components/work/stories-screen"
import type { Story } from "@shared/types"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: () => {}, push: () => {} }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}))

const { door } = vi.hoisted(() => ({ door: { stories: [] as unknown[], selectable: [] as unknown[] } }))
vi.mock("@/lib/api", () => ({
  ApiFailure: class extends Error {},
  content: {
    stories: async () => ({
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
    }),
    createStory: async () => ({ stories: [], createdId: "new" }),
    setStoryStatus: async () => ({ stories: [] }),
    // THE SCREEN'S OTHER READS — `useStoryFormOptions`'s sprints/tickets and
    // `StartTimerStrip`'s running timers, none of which this suite is about,
    // but each is gated behind `useAfterPaint()`, which watches EVERY
    // `useCached` on screen for a "loading, then quiet" beat. Leaving one of
    // these undefined threw "is not a function" on mount, which never resolves
    // that gate and left the Story type facet (the one facet here whose whole
    // option list is `options.storyTypes`, gated the same way) waiting on a
    // read that could never settle.
    sprints: async () => ({ sprints: [], total: 0 }),
    help: async () => ({
      tickets: [],
      total: 0,
      totalCapped: false,
      hasMore: false,
      nextCursor: null,
      mineTotal: 0,
      byType: {},
      byStatus: {},
      byAccount: [],
    }),
    runningTimers: async () => ({ timers: [] }),
  },
  tenancy: {
    members: async () => ({ members: [] }),
    apps: async () => ({ apps: [], total: 0 }),
    accounts: async () => ({ accounts: [], total: 0, entityTotal: 0, individualTotal: 0, nextCursor: null }),
    // `selectable:${teamId}` is PRIMED with the fixture's own "Story type"
    // rows before render (below), but `useAfterPaint()` gates the read
    // behind a null key until the screen goes quiet — and this mock's own
    // revalidation, once that key opens, was overwriting the primed rows
    // with an empty list, which is what silently dropped every pick against
    // the Story type facet. Reading the SAME mutable `door.selectable` the
    // fixture writes keeps the two in step, the identical shape `door.
    // stories` already takes for `content.stories`.
    selectable: async () => ({ values: door.selectable, total: door.selectable.length }),
    myPermissions: async () => ({ permissions: {} }),
    processes: async () => ({ processes: [], total: 0, hasMore: false, nextCursor: null }),
  },
}))
vi.mock("@/lib/api/tenancy", () => ({
  tenancy: {
    members: async () => ({ members: [] }),
    accounts: async () => ({ accounts: [], total: 0, entityTotal: 0, individualTotal: 0, nextCursor: null }),
    selectable: async () => ({ values: door.selectable, total: door.selectable.length }),
  },
}))

/** WHAT JSDOM HAS NOT GOT — the identical shim
 * `stories-backlog-status-facet.test.tsx` carries for the same reason: without
 * it the facet's own trigger never opens. */
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

const STORY_BASE = {
  ref: "B0001",
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
  assigneeId: null,
  assigneeName: null,
  reviewerId: null,
  reviewerName: null,
  startsOn: null,
  dueOn: null,
  sprintEndsOn: null,
  sprintStartsOn: null,
  closedAt: null,
  closingNote: null,
  storyType: null,
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
}

function story(partial: Partial<Story> & { id: string; title: string }): Story {
  return { ...STORY_BASE, ...partial } as Story
}

/** A minimal live "Story type" row — `options.storyTypes` (the facet's own
 * option list) reads exactly `type`/`value`/`active` off this shape. */
function storyTypeValue(value: string) {
  return {
    id: `stv-${value}`,
    type: "Story type",
    value,
    isDefault: false,
    active: true,
    mark: null,
    nameDe: null,
    description: null,
    standardDays: null,
    position: null,
    createdAt: null,
    createdByName: null,
  }
}

let n = 0
function renderBacklog(stories: Story[], selectable: ReturnType<typeof storyTypeValue>[] = []) {
  const teamId = `new-facets-${++n}`
  primeCache(`selectable:${teamId}`, selectable)
  primeCache(`members:${teamId}`, [])
  primeCache(appsKey(teamId), [])
  primeCache(`accounts:${teamId}`, [])
  door.stories = stories
  door.selectable = selectable
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
 * choreography `stories-backlog-status-facet.test.tsx` uses. */
async function pick(label: string, option: string) {
  if (screen.queryAllByRole("group", { name: label }).length === 0)
    fireEvent.click(screen.getByRole("button", { name: /^Filter/ }))
  const facet = await screen.findByRole("group", { name: label })
  fireEvent.click(within(facet).getByRole("button"))
  const listbox = await screen.findByRole("listbox")
  await waitFor(() => expect(within(listbox).getAllByRole("option").length).toBeGreaterThan(0))
  fireEvent.click(within(listbox).getByRole("option", { name: option }))
  await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull())
}

/** The BACKLOG TABLE's own rows, never the whole screen — `StartTimerStrip`
 * (this screen's own quick "start a timer" pills, `time-panel.tsx`) reads its
 * OWN, separate cache of the caller's open stories and draws up to five of
 * them as its own `<li><button>` chips regardless of this tab's own facets,
 * so a fixture story can legitimately appear there too. The table body is
 * the one place this screen's own narrowing is provable. */
function backlogRowTitles(): string[] {
  return Array.from(document.querySelectorAll("tbody tr")).map((tr) => tr.textContent ?? "")
}

describe("Backlog: the Filter control offers App, Story type, Assignee, Phase (T3851)", () => {
  it("picking an app leaves only that app's stories on screen", async () => {
    renderBacklog([
      story({ id: "s1", title: "Move dispatch onto the driver app", appId: "a1", appName: "FluClinic" }),
      story({ id: "s2", title: "Fix the invoice export", appId: "a2", appName: "Ontime Fuhrpark" }),
    ])
    await screen.findByText(/Move dispatch/)

    await pick("App", "FluClinic")

    await waitFor(() => expect(backlogRowTitles().some((r) => r.includes("Fix the invoice export"))).toBe(false))
    expect(backlogRowTitles().some((r) => r.includes("Move dispatch"))).toBe(true)
  })

  it("picking a story type leaves only that type's stories on screen", async () => {
    renderBacklog(
      [
        story({ id: "s1", title: "Add the acceptance criteria field", storyType: "Feature" }),
        story({ id: "s2", title: "Fix the broken export button", storyType: "Fix" }),
      ],
      [storyTypeValue("Feature"), storyTypeValue("Fix")]
    )
    await screen.findByText(/Add the acceptance/)

    await pick("Story type", "Feature")

    await waitFor(() => expect(backlogRowTitles().some((r) => r.includes("Fix the broken export"))).toBe(false))
    expect(backlogRowTitles().some((r) => r.includes("Add the acceptance"))).toBe(true)
  })

  it("picking an assignee leaves only their stories on screen", async () => {
    renderBacklog([
      story({ id: "s1", title: "Add the burndown chart", assigneeId: "u1", assigneeName: "Ana" }),
      story({ id: "s2", title: "Add the cycle time metric", assigneeId: "u2", assigneeName: "Bruno" }),
    ])
    await screen.findByText(/Add the burndown/)

    await pick("Assigned to", "Ana")

    await waitFor(() => expect(backlogRowTitles().some((r) => r.includes("Add the cycle time"))).toBe(false))
    expect(backlogRowTitles().some((r) => r.includes("Add the burndown"))).toBe(true)
  })

  it("picking a phase leaves only that phase's stories on screen", async () => {
    renderBacklog([
      story({ id: "s1", title: "Add the flow efficiency metric", sprintId: "sp1", sprintName: "Build sprint" }),
      story({ id: "s2", title: "Add the spike story type", sprintId: "sp2", sprintName: "Refinements" }),
    ])
    await screen.findByText(/Add the flow/)

    await pick("Phase", "Build sprint")

    await waitFor(() => expect(backlogRowTitles().some((r) => r.includes("Add the spike"))).toBe(false))
    expect(backlogRowTitles().some((r) => r.includes("Add the flow"))).toBe(true)
  })

  it("offers the App facet's options alphabetically (R75)", async () => {
    renderBacklog([
      story({ id: "s1", title: "Story one", appId: "a1", appName: "Zeta app" }),
      story({ id: "s2", title: "Story two", appId: "a2", appName: "Alpha app" }),
    ])
    await screen.findByText("Story one")
    fireEvent.click(screen.getByRole("button", { name: /^Filter/ }))
    const facet = await screen.findByRole("group", { name: "App" })
    fireEvent.click(within(facet).getByRole("button"))
    const listbox = await screen.findByRole("listbox")
    await waitFor(() => expect(within(listbox).getAllByRole("option").length).toBeGreaterThan(0))
    const labels = within(listbox)
      .getAllByRole("option")
      .map((el) => el.textContent?.trim() ?? "")
    // The panel's own leading "clear this facet" option comes first, and
    // each option's own text carries the RecordMark's initial-letter
    // placeholder ahead of the word (no picture on either fixture app), so
    // this reads the WORD each option ends with rather than the raw string.
    expect(labels.slice(1).map((l) => l.endsWith("Alpha app"))).toEqual([true, false])
    expect(labels.slice(1).map((l) => l.endsWith("Zeta app"))).toEqual([false, true])
  })
})
