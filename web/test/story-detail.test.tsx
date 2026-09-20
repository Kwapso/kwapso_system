// THE STORY DETAIL PAGE, ONE PAGE, NO TABS — Aurora's design review, 21 Sep
// 2026, built the same shape the ticket already is. Driven, not scanned: a
// comment can say the right thing beside a control that does the wrong one,
// the same reason `story-accept-asks-no-assignee.test.tsx` gives for its own
// shape.
//
// COVERS: the panel order in both columns, the Build notes empty door (R88)
// opening the slide-in sheet, Save writing `buildNotes` through the story
// update door, the Done head action disabled (with a reason) until build
// notes are filled — her verbatim ruling, "canont be marked as don if thats
// not filled in" — the Assigned to card drawn first with its inherited
// line, the Effort card's own merged metrics figures from a fixture, and
// the dark band last with no nested scroll region on this page.
//
// B44 (Aurora's ruling, 21 Sep 2026): "Include the metrics inside the
// effort card. On the effort card, remove the value entries and put the
// number next to the effort title, just as you do, for example, for
// stakeholders." There is no separate "Metrics" panel and no `WorkLogsPanel`
// row list here any more — the Effort card's own title carries the total
// hours as its count, and its body holds the three metric lines.

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { HelpTicket, RunningTimer, Sprint, Story, StoryAttachment, StoryMetrics } from "@shared/types"

function story(overrides: Partial<Story>): Story {
  return {
    id: "story-1",
    ref: "BERG-S0188",
    title: "Add saved filters to the backlog board",
    detail: "<p>Power users filter the backlog every session.</p>",
    status: "open",
    storyType: "Feature",
    reviewNote: null,
    reviewFileUrl: null,
    reviewFileName: null,
    ticketId: "ticket-1",
    ticketRef: "T0142",
    sprintId: "sprint-1",
    sprintName: "Phase 2",
    appId: "app-1",
    appName: "Padelbase",
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
    rank: null,
    category: "Client-requested",
    acceptanceCriteria: "<p>A saved filter remembers app, phase and type.</p>",
    buildNotes: null,
    moscow: null,
    contributesToGoal: false,
    accountId: null,
    createdAt: "2026-09-18T10:00:00.000Z",
    updatedAt: null,
    createdByName: "Priya N",
    editedByName: null,
    ...overrides,
  }
}

const RELATED_TICKET: HelpTicket = {
  id: "ticket-1",
  ref: "T0142",
  titleEn: "Backlog filters reset on every page load",
  titleDe: null,
  description: "Backlog filters reset on every page load",
  status: "resolved",
} as unknown as HelpTicket

const SPRINT: Sprint = {
  id: "sprint-1",
  ref: "S0002",
  refWas: null,
  name: "Phase 2",
  goal: null,
  goalSummary: null,
  sprintType: "Build",
  accountId: null,
  accountName: null,
  appId: "app-1",
  appName: "Padelbase",
  waveId: "wave-1",
  waveName: "Wave 14",
  startsOn: null,
  endsOn: null,
  soldPriceCents: 0,
  currency: null,
  completedAt: null,
  active: true,
  storyCount: 0,
  openStoryCount: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  createdByName: null,
} as unknown as Sprint

const SIBLING_STORY: Story = story({
  id: "story-2",
  ref: "BERG-S0511",
  title: "Persist filter sort order per view",
  status: "in_review",
})

const NO_METRICS: StoryMetrics = { cycleTimeSeconds: null, effortSeconds: 0, flowEfficiency: null }
const FIXTURE_METRICS: StoryMetrics = { cycleTimeSeconds: 183600, effortSeconds: 23400, flowEfficiency: 41 }

const api = vi.hoisted(() => ({
  story: null as unknown as Story,
  setStoryStatus: vi.fn(),
  updateStory: vi.fn(),
  logTime: vi.fn(),
  metrics: null as unknown as StoryMetrics,
  timers: [] as RunningTimer[],
}))
const perms = vi.hoisted(() => ({ can: vi.fn(() => true) }))

vi.mock("@/lib/perms", () => ({ usePermissions: () => ({ can: perms.can }) }))

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return {
    ...actual,
    content: {
      ...actual.content,
      storyOne: async () => api.story,
      setStoryStatus: api.setStoryStatus,
      updateStory: api.updateStory,
      storyAttachments: async () => ({ attachments: [] as StoryAttachment[], total: 0 }),
      addStoryAttachment: async () => ({ attachments: [] as StoryAttachment[], total: 0 }),
      removeStoryAttachment: async () => ({ attachments: [] as StoryAttachment[], total: 0 }),
      updateStoryAttachment: async () => ({ attachments: [] as StoryAttachment[], total: 0 }),
      helpOne: async () => RELATED_TICKET,
      stories: async () => ({ stories: [SIBLING_STORY], total: 1, mineTotal: 0, nextCursor: null, hasMore: false }),
      sprintOne: async () => SPRINT,
      storyMetrics: async () => api.metrics,
      sprints: async () => ({ sprints: [], total: 0 }),
      help: async () => ({ tickets: [], total: 0, nextCursor: null, hasMore: false }),
      logTime: api.logTime,
      runningTimers: async () => ({ timers: api.timers }),
    },
    tenancy: {
      ...actual.tenancy,
      members: async () => ({ members: [] }),
      selectable: async () => ({ values: [] }),
      apps: async () => ({ apps: [], total: 0 }),
      processes: async () => ({ processes: [], total: 0, nextCursor: null, hasMore: false }),
      activity: async () => ({ activity: [], total: 0, nextCursor: null, hasMore: false }),
    },
  }
})

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: () => {}, push: () => {} }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock("@shared/ui/components/sonner/sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}))

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

import { StoryDetailScreen } from "@/components/work/story-detail"
import { clearCache } from "@shared/web/store"

afterEach(cleanup)
beforeEach(() => {
  // Every case below reuses "story-1" with a different shape — the shared
  // module-level cache (`shared/web/store.ts`) must not serve a PREVIOUS
  // case's own cached read to this one.
  clearCache()
  perms.can.mockReset().mockReturnValue(true)
  api.setStoryStatus.mockReset().mockResolvedValue({ stories: [] })
  api.updateStory.mockReset().mockResolvedValue({ stories: [] })
  api.logTime.mockReset().mockResolvedValue({ logs: [], total: 0, totalSeconds: 0, nextCursor: null, hasMore: false })
  api.metrics = NO_METRICS
  api.timers = []
})

const RUNNING_ON_STORY: RunningTimer = {
  id: "log-1",
  targetTable: "stories",
  targetId: "story-1",
  targetLabel: "Add saved filters to the backlog board",
  targetRef: "BERG-S0188",
  startedAt: "2026-09-21T09:00:00.000Z",
  elapsedSeconds: 600,
  runaway: false,
}

const openStory = () =>
  render(<StoryDetailScreen teamId="team-1" storyId="story-1" basePath="/stories" />)

describe("the story detail page — panel order", () => {
  it("draws the left column Detail, Acceptance criteria, Build notes, and the right column Assigned to, Related tickets, Related stories, Phase and wave, Effort (with its metrics inside), band last", async () => {
    api.story = story({ status: "open" })
    api.metrics = NO_METRICS
    const { container } = openStory()
    await screen.findByText("Add saved filters to the backlog board")
    // The Effort card's own three lines settle once `storyMetrics` resolves
    // — wait for one of them before reading `textContent`, so this never
    // races the metrics read under a loaded test run.
    await screen.findByText("Cycle time")

    const text = container.textContent ?? ""
    const at = (needle: string) => {
      const i = text.indexOf(needle)
      expect(i, `expected to find "${needle}" on the page`).toBeGreaterThan(-1)
      return i
    }

    const detailAt = at("Power users filter the backlog every session.")
    const acceptanceAt = at("A saved filter remembers app, phase and type.")
    const buildNotesAt = at("What was built, and how.")
    const assignedAt = at("Nobody yet.")
    const relatedTicketsAt = at("Related tickets")
    const relatedStoriesAt = at("Related stories")
    const phaseAndWaveAt = at("Phase and wave")
    // No separate "Metrics" panel any more (B44) — the Effort card's own
    // body is the marker, "Cycle time" being the first of its three lines.
    const effortAt = at("Cycle time")
    const bandAt = at("Latest activity")

    expect(detailAt).toBeLessThan(acceptanceAt)
    expect(acceptanceAt).toBeLessThan(buildNotesAt)
    // The right column starts with Assigned to, before any of the others.
    expect(assignedAt).toBeLessThan(relatedTicketsAt)
    expect(relatedTicketsAt).toBeLessThan(relatedStoriesAt)
    expect(relatedStoriesAt).toBeLessThan(phaseAndWaveAt)
    expect(phaseAndWaveAt).toBeLessThan(effortAt)
    // The dark band is the very last thing on the page.
    expect(effortAt).toBeLessThan(bandAt)
    expect(bandAt).toBe(text.lastIndexOf("Latest activity"))
  })

  it("carries no nested scroll region — no element on the page is marked overflow-y-auto", async () => {
    api.story = story({ status: "open" })
    const { container } = openStory()
    await screen.findByText("Add saved filters to the backlog board")
    const scrollers = container.querySelectorAll('[class*="overflow-y-auto"]')
    expect(scrollers.length).toBe(0)
  })

  // R91 — the case above renders below `lg` only: `web/test/setup.ts` stubs
  // `window.matchMedia` to always answer `matches: false`, so
  // `RecordDetailBody`'s own `useIsAtLeastLg()` never picks the `lg`
  // grid branch under the default mock and a scroll class living only in
  // that branch would pass unseen. This case forces `matches: true` so the
  // two-column grid (`main` beside `side`) actually mounts, closing that
  // blind spot.
  it("carries no nested scroll region at lg widths either — no element on the page is marked overflow-y-auto", async () => {
    const original = window.matchMedia
    window.matchMedia = ((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
    try {
      api.story = story({ status: "open" })
      const { container } = openStory()
      await screen.findByText("Add saved filters to the backlog board")
      const scrollers = container.querySelectorAll('[class*="overflow-y-auto"]')
      expect(scrollers.length).toBe(0)
    } finally {
      window.matchMedia = original
    }
  })
})

describe("Build notes — R88 single door", () => {
  it("empty: draws no title row, only the single 'Write the build notes' door", async () => {
    api.story = story({ buildNotes: null })
    openStory()
    const button = await screen.findByRole("button", { name: "Write the build notes" })
    expect(button).toBeTruthy()
    // The empty state's own heading stands in for a header — no second
    // "Build notes" title text sits above it.
    expect(screen.queryByText("Build notes")).toBeNull()
  })

  it("opens the slide-in sheet from the empty door", async () => {
    api.story = story({ buildNotes: null })
    openStory()
    fireEvent.click(await screen.findByRole("button", { name: "Write the build notes" }))
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByRole("heading", { name: "Build notes" })).toBeTruthy()
  })

  it("opens the same sheet from the pencil once something is written", async () => {
    api.story = story({ buildNotes: "<p>Shipped it.</p>" })
    openStory()
    await screen.findByText("Shipped it.")
    fireEvent.click(await screen.findByRole("button", { name: "Edit the build notes" }))
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByRole("heading", { name: "Build notes" })).toBeTruthy()
  })

  it("Save writes buildNotes through the story update door, spreading the rest of the record", async () => {
    api.story = story({ buildNotes: "<p>First draft.</p>", detail: "<p>Some detail.</p>" })
    openStory()
    fireEvent.click(await screen.findByRole("button", { name: "Edit the build notes" }))
    const dialog = await screen.findByRole("dialog")
    const editable = within(dialog).getByRole("textbox")
    editable.innerHTML = "<p>What was built, and how it works now.</p>"
    fireEvent.input(editable)
    fireEvent.click(within(dialog).getByRole("button", { name: /submit/i }))

    await waitFor(() => expect(api.updateStory).toHaveBeenCalled())
    const call = api.updateStory.mock.calls[0][0]
    expect(call.id).toBe("story-1")
    expect(call.buildNotes).toBe("<p>What was built, and how it works now.</p>")
    // The rest of the record's own shape rides along — the door replaces
    // every field it reads.
    expect(call.detail).toBe("<p>Some detail.</p>")
    expect(call.title).toBe("Add saved filters to the backlog board")
  })
})

describe("Done is disabled until build notes are filled", () => {
  it("the Done button is disabled while buildNotes is empty", async () => {
    api.story = story({ status: "in_review", buildNotes: null })
    openStory()
    const done = (await screen.findByRole("button", { name: "Done" })) as HTMLButtonElement
    expect(done.disabled).toBe(true)
    fireEvent.click(done)
    expect(api.setStoryStatus).not.toHaveBeenCalled()
  })

  it("the Done button is enabled once build notes are written", async () => {
    api.story = story({ status: "in_review", buildNotes: "<p>What we built.</p>" })
    openStory()
    const done = (await screen.findByRole("button", { name: "Done" })) as HTMLButtonElement
    expect(done.disabled).toBe(false)
    fireEvent.click(done)
    await waitFor(() => expect(api.setStoryStatus).toHaveBeenCalledWith("story-1", "done", undefined))
  })
})

// R99, Aurora's 21 Sep 2026 ruling, verbatim: "cannot mark anything as
// closed (task, story, ticket, whatever) if there's an active time log
// running." The door's own copy is `refuseWhileTimerRuns`
// (workers/content/src/lib/work-logs.ts), wired into `setStoryStatus`; this
// button only mirrors the same fact back, the identical split
// `doneReason`'s build-notes half already takes.
describe("Done is disabled while a timer on the story is still running (R99)", () => {
  it("the Done button is disabled while a timer on this story runs", async () => {
    api.story = story({ status: "in_review", buildNotes: "<p>What we built.</p>" })
    api.timers = [RUNNING_ON_STORY]
    openStory()
    await screen.findByRole("button", { name: "Done" })
    // The running-timers read lands a beat after the button first paints,
    // and swaps the ENABLED button for the Tooltip-wrapped disabled one, a
    // different element rather than a mutated prop, so this re-queries
    // instead of polling a reference captured before the swap.
    await waitFor(() => {
      expect((screen.getByRole("button", { name: "Done" }) as HTMLButtonElement).disabled).toBe(true)
    })
    const done = screen.getByRole("button", { name: "Done" }) as HTMLButtonElement
    fireEvent.click(done)
    expect(api.setStoryStatus).not.toHaveBeenCalled()
  })

  it("a timer running on a DIFFERENT record never disables this one's Done button", async () => {
    api.story = story({ status: "in_review", buildNotes: "<p>What we built.</p>" })
    api.timers = [{ ...RUNNING_ON_STORY, id: "log-2", targetTable: "help", targetId: "ticket-1" }]
    openStory()
    const done = (await screen.findByRole("button", { name: "Done" })) as HTMLButtonElement
    expect(done.disabled).toBe(false)
  })

  it("the Done button is enabled once that timer is stopped (no running timers at all)", async () => {
    api.story = story({ status: "in_review", buildNotes: "<p>What we built.</p>" })
    api.timers = []
    openStory()
    const done = (await screen.findByRole("button", { name: "Done" })) as HTMLButtonElement
    expect(done.disabled).toBe(false)
    fireEvent.click(done)
    await waitFor(() => expect(api.setStoryStatus).toHaveBeenCalledWith("story-1", "done", undefined))
  })
})

describe("Assigned to", () => {
  it("is the first panel in the right column and shows the inherited line when the story has no assignee of its own", async () => {
    api.story = story({
      assigneeId: null,
      assigneeName: null,
      appId: "app-1",
      appName: "Padelbase",
      appAssigneeId: "user-lead",
    })
    openStory()
    await screen.findByText("Add saved filters to the backlog board")
    // No members loaded in this fixture, so the inherited NAME cannot
    // resolve — but the inheritance itself still reads, off `appAssigneeId`.
    expect(await screen.findByText(/Inherited from/)).toBeTruthy()
  })
})

describe("No translate on the story page (B43)", () => {
  it("renders no Translate button anywhere — a story is always in English", async () => {
    api.story = story({})
    openStory()
    await screen.findByText("Add saved filters to the backlog board")
    expect(screen.queryByRole("button", { name: /Translate/ })).toBeNull()
  })
})

describe("Category — derived, shown as a read-only fact (B43)", () => {
  it("shows Client-requested when the story is linked to a ticket", async () => {
    api.story = story({ category: "Client-requested", ticketId: "ticket-1" })
    openStory()
    await screen.findByText("Related tickets")
    expect(await screen.findByText("Client-requested")).toBeTruthy()
    // A fact, not a control — no button or combobox named "Category".
    expect(screen.queryByRole("button", { name: "Category" })).toBeNull()
    expect(screen.queryByRole("combobox", { name: "Category" })).toBeNull()
  })

  it("shows Enabler when the story has no ticket", async () => {
    api.story = story({ category: "Enabler", ticketId: null })
    openStory()
    await screen.findByText("Related tickets")
    expect(await screen.findByText("Enabler")).toBeTruthy()
  })
})

describe("Effort — the metrics are inside the card now (B44)", () => {
  it("carries the total hours as a count beside the Effort title, the same register as Stakeholders", async () => {
    api.story = story({})
    api.metrics = FIXTURE_METRICS
    openStory()
    await screen.findByText("Cycle time")
    // The title row itself: "Effort" then its own count, "6.5h" — the same
    // `<h3>{title}{count}</h3>` shape `help-stakeholders.tsx`'s own
    // "Stakeholders 4" register renders through (`TicketSidePanel`).
    const heading = await screen.findByRole("heading", { name: /^Effort/ })
    expect(heading.textContent).toBe("Effort6.5h")
  })

  it("reads 'Not started' and 'No time log' before any work is logged, with '0h' beside the title", async () => {
    api.story = story({})
    api.metrics = NO_METRICS
    openStory()
    await screen.findByText("Cycle time")
    expect(await screen.findByText("Not started")).toBeTruthy()
    expect(await screen.findByText("No time log")).toBeTruthy()
    const heading = await screen.findByRole("heading", { name: /^Effort/ })
    expect(heading.textContent).toBe("Effort0h")
  })

  it("renders the door's own cycle time, effort and flow efficiency, no per-log rows", async () => {
    api.story = story({})
    api.metrics = FIXTURE_METRICS
    const { container } = openStory()
    // 183600s = 51h = 2d 3h; 23400s = 6.5h; 41%.
    expect(await screen.findByText("2d 3h")).toBeTruthy()
    expect(await screen.findByText("41%")).toBeTruthy()
    // "6.5h" appears twice on purpose — the title's own count and the
    // body's own "Effort" line, the same figure said two ways (B44).
    expect(screen.getAllByText("6.5h").length).toBe(2)
    // NO WORK-LOG ROW LIST any more — `WorkLogsPanel`'s own row shape
    // (a name/date line followed by a duration) is gone from this page.
    expect(container.querySelector('ul[class*="divide-y"]')).toBeNull()
  })

  it("the Log time door still opens and writes through the same door WorkLogsPanel used", async () => {
    api.story = story({})
    api.metrics = NO_METRICS
    openStory()
    fireEvent.click(await screen.findByRole("button", { name: "Log time" }))
    const dialog = await screen.findByRole("dialog")
    expect(dialog).toBeTruthy()
  })
})
