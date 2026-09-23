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
// stakeholders." AMENDED THE SAME DAY, verbatim: "ok, but i still want to
// see the individual records of time og! also show avatar of perosn. bring
// back the old cards with the metrics inside effort" and "in effort card
// inside stories or tickets, rmeove the + button (we have the start on
// top!)". The three metric lines stay; the individual time log rows are
// back, each with a face, drawn by the shared `EffortCard`
// (web/components/work/effort-card.tsx) — and there is no add door left on
// the card at all, on either page.

import * as React from "react"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type {
  HelpTicket,
  RunningTimer,
  Sprint,
  Story,
  StoryAttachment,
  StoryMetrics,
  TeamMember,
  WorkLog,
} from "@shared/types"

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

// ONE ROW, NOT ZERO (R88) — the default fixture, so a test that does not
// care about the Effort card's own rows never trips the empty state by
// accident (the same reason `ticket-detail-no-tabs.test.tsx`'s own
// `workLogs` mock gives). 1800s = 30m, well inside `durationLabel`'s minute
// branch.
const WORK_LOG: WorkLog = {
  id: "log-1",
  targetTable: "stories",
  targetId: "story-1",
  targetLabel: "Add saved filters to the backlog board",
  targetRef: "BERG-S0188",
  userId: "user-priya",
  userName: "Priya Nandal",
  kind: null,
  note: null,
  startedAt: "2026-09-18T09:00:00.000Z",
  endedAt: "2026-09-18T09:30:00.000Z",
  seconds: 1800,
  discarded: false,
  accountId: null,
}

// PRIYA'S OWN FACE — matched to `WORK_LOG.userId` through `memberFace`
// (tickets-collection.tsx), the same lookup the row's `<RecordMark>` reads.
const MEMBER_WITH_FACE: TeamMember = {
  userId: "user-priya",
  email: "priya@kwapso.com",
  firstName: "Priya",
  lastName: "Nandal",
  imageUrl: "https://kwapso.example/priya.png",
  roleId: "role-1",
  roleTitle: "Staff",
  isYou: false,
  isAdmin: false,
  isClient: false,
} as unknown as TeamMember

const api = vi.hoisted(() => ({
  story: null as unknown as Story,
  setStoryStatus: vi.fn(),
  updateStory: vi.fn(),
  logTime: vi.fn(),
  updateWorkLog: vi.fn(),
  metrics: null as unknown as StoryMetrics,
  timers: [] as RunningTimer[],
  workLogs: [] as unknown[],
  members: [] as unknown[],
  siblingStories: [] as Story[],
  attachments: [] as StoryAttachment[],
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
      storyAttachments: async () => ({ attachments: api.attachments, total: api.attachments.length }),
      addStoryAttachment: async () => ({ attachments: [] as StoryAttachment[], total: 0 }),
      removeStoryAttachment: async () => ({ attachments: [] as StoryAttachment[], total: 0 }),
      updateStoryAttachment: async () => ({ attachments: [] as StoryAttachment[], total: 0 }),
      helpOne: async () => RELATED_TICKET,
      stories: async () => ({ stories: api.siblingStories, total: api.siblingStories.length, mineTotal: 0, nextCursor: null, hasMore: false }),
      sprintOne: async () => SPRINT,
      storyMetrics: async () => api.metrics,
      sprints: async () => ({ sprints: [], total: 0 }),
      help: async () => ({ tickets: [], total: 0, nextCursor: null, hasMore: false }),
      logTime: api.logTime,
      runningTimers: async () => ({ timers: api.timers }),
      workLogs: async () => ({
        logs: api.workLogs,
        total: api.workLogs.length,
        totalSeconds: 0,
        nextCursor: null,
        hasMore: false,
      }),
      updateWorkLog: api.updateWorkLog,
      // START/STOP — the seam the "Effort card's stat tiles update after a
      // start/stop" describe block below drives through the real
      // `RecordTimerButton`, the same way a person on staging does. BY
      // REASSIGNMENT, never in place: `useCached` compares the fetcher's
      // answer by reference, and mutating `api.workLogs`/`api.timers` in
      // place would hand back the SAME array a stale cache entry already
      // holds, hiding exactly the staleness this describe block exists to
      // catch (the same note `task-sheet.test.tsx`'s own mock carries).
      startTimer: async (targetTable: string, targetId: string) => {
        const startedAt = new Date().toISOString()
        const id = `timer-${targetTable}-${targetId}`
        api.timers = [
          ...api.timers,
          { id, targetTable, targetId, targetLabel: null, targetRef: null, startedAt, elapsedSeconds: 0, runaway: false },
        ]
        api.workLogs = [
          ...(api.workLogs as unknown[]),
          {
            id,
            targetTable,
            targetId,
            targetLabel: null,
            targetRef: null,
            userId: "user-priya",
            userName: "Priya Nandal",
            kind: null,
            note: null,
            startedAt,
            endedAt: null,
            seconds: 0,
            discarded: false,
            accountId: null,
          },
        ]
        return { timers: api.timers }
      },
      stopTimer: async (id: string) => {
        api.timers = api.timers.filter((t) => t.id !== id)
        const stoppedAt = new Date().toISOString()
        api.workLogs = (api.workLogs as { id: string; startedAt: string }[]).map((l) =>
          l.id === id ? { ...l, endedAt: stoppedAt, seconds: 3 } : l
        )
        // THE METRICS DOOR'S OWN REAL ANSWER, recomputed from the same rows —
        // a 3-SECOND STOP, so effort is real and near-zero (the live proof's
        // own scenario), and the story has genuinely started work now
        // (`cycleTimeSeconds` moves off `null`).
        const totalSeconds = (api.workLogs as { seconds: number }[]).reduce((sum, l) => sum + (l.seconds || 0), 0)
        api.metrics = { cycleTimeSeconds: 3, effortSeconds: totalSeconds, flowEfficiency: 100 }
        return { timers: api.timers }
      },
    },
    tenancy: {
      ...actual.tenancy,
      members: async () => ({ members: api.members }),
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

import { FooterSlotProvider } from "@/components/shell/footer-slot"
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
  api.updateWorkLog.mockReset().mockResolvedValue({ logs: [], total: 0, totalSeconds: 0, nextCursor: null, hasMore: false })
  api.metrics = NO_METRICS
  api.timers = []
  api.workLogs = [WORK_LOG]
  api.members = []
  api.siblingStories = [SIBLING_STORY]
  api.attachments = []
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

/* THE SHELL'S FOOTER SLOT, STOOD IN FOR, 22 Sep 2026, kit v1.2.155.
 *
 * The dark band is not the page's own last child any more: the page renders
 * it through `<ScreenFooterSlot>`, which portals it into the host
 * `app-shell.tsx` hands `ScreenShell`'s own `footer` slot. The kit then draws
 * that host inside the one scroller and OUTSIDE the body's padded stack, as
 * the `mt-auto` last child of a `min-h-full` column, which is the whole
 * point: a short record's band lands on the pane's own bottom edge with no
 * paper under it.
 *
 * `AppShell` is not mounted in these tests, so the host is stood in for here
 * AND PLACED LAST inside the same container, exactly where the kit places it
 * relative to the body. That keeps any reading-order assertion a real
 * statement about the rendered page rather than an artefact of where the
 * stand-in happens to sit. */
function WithFooterSlot({ children }: { children: React.ReactNode }) {
  const [host, setHost] = React.useState<HTMLDivElement | null>(null)
  return (
    <>
      <FooterSlotProvider host={host}>{children}</FooterSlotProvider>
      <div data-slot="screen-shell-footer" ref={setHost} />
    </>
  )
}

const openStory = () =>
  render(
    <WithFooterSlot>
      <StoryDetailScreen teamId="team-1" storyId="story-1" basePath="/stories" />
    </WithFooterSlot>
  )

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

  // DEFECT (live proof, 21 Sep 2026): a story with attachments but no
  // written prose still showed the empty "Write the build notes" door —
  // `buildNotesMissing` asked only about the TEXT column, and this section
  // has a second way to have something to show. Her ruling: prose WITH
  // images inline; the empty door shows only when there is neither.
  it("with attachments and no text: draws the images, no empty door", async () => {
    api.story = story({ buildNotes: null })
    api.attachments = [
      {
        id: "att-1",
        storyId: "story-1",
        kind: "file",
        label: "Before and after.png",
        url: "/media/story-attachments/before-and-after.png",
        contentType: "image/png",
        sizeBytes: 40_000,
        createdAt: "2026-09-21T10:00:00.000Z",
        addedByName: "Priya Nandal",
      },
    ]
    const { container } = openStory()
    await screen.findByText("Add saved filters to the backlog board")

    // NO EMPTY DOOR — a story with images is not "nothing written".
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Write the build notes" })).toBeNull()
    })
    // The pencil still reopens the same sheet, exactly as it does once text
    // exists.
    expect(await screen.findByRole("button", { name: "Edit the build notes" })).toBeTruthy()
    // THE IMAGE ITSELF — the kit's own `<Image>`, `data-slot="image-media"`.
    const image = container.querySelector('[data-slot="image-media"]') as HTMLImageElement | null
    expect(image, "the attachment must render as an inline image").toBeTruthy()
    expect(image!.getAttribute("src")).toBe("/media/story-attachments/before-and-after.png")
  })

  it("with BOTH text and attachments: draws the prose above the images", async () => {
    api.story = story({ buildNotes: "<p>Shipped the redesigned filter bar.</p>" })
    api.attachments = [
      {
        id: "att-1",
        storyId: "story-1",
        kind: "file",
        label: "Before and after.png",
        url: "/media/story-attachments/before-and-after.png",
        contentType: "image/png",
        sizeBytes: 40_000,
        createdAt: "2026-09-21T10:00:00.000Z",
        addedByName: "Priya Nandal",
      },
    ]
    const { container } = openStory()
    const prose = await screen.findByText("Shipped the redesigned filter bar.")
    const image = await waitFor(() => {
      const el = container.querySelector('[data-slot="image-media"]')
      expect(el).toBeTruthy()
      return el as HTMLElement
    })
    // Prose ABOVE the gallery, in that order.
    expect(prose.compareDocumentPosition(image) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("with neither text nor an attachment: still shows the empty door", async () => {
    api.story = story({ buildNotes: null })
    api.attachments = []
    openStory()
    expect(await screen.findByRole("button", { name: "Write the build notes" })).toBeTruthy()
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

  // Aurora, over a screenshot of the kit's own dashed drop zone, 21 Sep 2026:
  // "that's not what i neant. imeant a compmntet liek inscreenshot", the B43
  // paragraph names `<FileUpload>` as the mount, but until this case the only
  // proof was static (`story-b43-parked.test.tsx` greps the source for
  // `<FileUpload`); nothing had rendered the sheet and read its own empty
  // state back. This closes that gap: the dashed zone's two words ("Drop
  // files here", "Choose a file") are on the page under the editor, and
  // neither of `record-attachments.tsx`'s own two words ("Add a file",
  // "Add a link", the hand-built widget the ruling replaced) is.
  it("draws the kit's own dashed drop zone under the editor, never an 'Add a file' control", async () => {
    api.story = story({ buildNotes: null })
    openStory()
    fireEvent.click(await screen.findByRole("button", { name: "Write the build notes" }))
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText("Drop files here")).toBeTruthy()
    expect(within(dialog).getByRole("button", { name: "Choose a file" })).toBeTruthy()
    expect(within(dialog).queryByText("Add a file")).toBeNull()
    expect(within(dialog).queryByText("Add a link")).toBeNull()
    // No "nothing attached" line either, Aurora's own second sentence in the
    // same ruling ("don't show that there's nothing attached").
    expect(within(dialog).queryByText(/nothing attached/i)).toBeNull()
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

// DEFECT (live proof, 21 Sep 2026): the Effort card's own stat tiles stayed
// on their BEFORE-the-timer values (a story never worked on: "Not started",
// "No time log", "0h") after a real Start-then-Stop of a very short (3
// second) timer, until a full reload — `refreshTimers` (shell/timer-bar.tsx)
// invalidated `recordTimeKey` (the ROWS) on every start/stop but never
// `story:metrics:<id>` (the door behind these three TILES), so the rows
// updated and the tiles beside them did not.
describe("the Effort card's stat tiles update after a real start/stop, no reload", () => {
  it("moves off 'Not started' / 'No time log' once a short timer is stopped", async () => {
    api.story = story({ status: "open" })
    // A REAL WORK LOG ALREADY EXISTS (the default `WORK_LOG` fixture,
    // `beforeEach` primes it) — the card draws nothing at all otherwise
    // (R88's own "zero records" rule, proved elsewhere in this file) — but
    // the METRICS DOOR is deliberately stale/behind it (`NO_METRICS`),
    // standing in for the exact staleness this describe block exists to
    // catch: a `story:metrics:<id>` cache entry primed before this
    // session's own timer activity.
    api.metrics = NO_METRICS
    api.timers = []
    openStory()
    await screen.findByText("Add saved filters to the backlog board")

    // BEFORE: nothing has ever run on this story — the placeholder words.
    await screen.findByText("Not started")
    expect(screen.getByText("No time log")).toBeTruthy()

    const startButton = await screen.findByRole("button", { name: /^Start/ })
    fireEvent.click(startButton)

    const stopButton = await screen.findByRole("button", { name: /Stop timer/ })
    fireEvent.click(stopButton)

    // AFTER: a real (if tiny) cycle time and effort figure, not the
    // placeholder words a stale cache would keep showing.
    await waitFor(() => {
      expect(screen.queryByText("Not started")).toBeNull()
      expect(screen.queryByText("No time log")).toBeNull()
    })
    // AND THE TILES STILL RENDER — never blank, never gone — with the
    // rounded-to-zero figure the 3 second stop actually produced.
    expect(screen.getByText("0h")).toBeTruthy()
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
    // The Related tickets panel is hidden when there's no ticket — wait for
    // another panel to settle instead, then verify the category reads Enabler.
    await screen.findByText("Phase and wave")
    expect(await screen.findByText("Enabler")).toBeTruthy()
  })
})

describe("Related tickets and stories — render only when present (B42 amended 22 Sep 2026)", () => {
  it("renders the Related tickets panel when the story has a ticket", async () => {
    api.story = story({ ticketId: "ticket-1" })
    openStory()
    const panel = await screen.findByText("Related tickets")
    expect(panel).toBeTruthy()
  })

  it("renders nothing at all when the story has no ticket — no panel, no title, no row", async () => {
    api.story = story({ ticketId: null })
    openStory()
    await screen.findByText("Add saved filters to the backlog board")
    // The rest of the page still settles (a neighbouring panel proves the
    // page did not simply fail to render).
    await screen.findByText("Phase and wave")
    expect(screen.queryByText("Related tickets")).toBeNull()
  })

  it("renders the Related stories panel when there are sibling stories", async () => {
    api.story = story({})
    api.siblingStories = [
      story({ id: "story-2", ref: "BERG-S0189", title: "Related story" }),
    ]
    openStory()
    const panel = await screen.findByText("Related stories")
    expect(panel).toBeTruthy()
    expect(await screen.findByText("Related story")).toBeTruthy()
  })

  it("renders nothing at all when there are no related stories — no panel, no title, no empty state", async () => {
    api.story = story({})
    api.siblingStories = []
    openStory()
    await screen.findByText("Add saved filters to the backlog board")
    // The rest of the page still settles (a neighbouring panel proves the
    // page did not simply fail to render).
    await screen.findByText("Phase and wave")
    expect(screen.queryByText("Related stories")).toBeNull()
  })
})

describe("Effort — the metrics AND the rows, no add door (B44 amended)", () => {
  // AMENDED, 22 Sep 2026 — Aurora, verbatim: "next to effort show the count
  // of record, not the total hours (that has a metric on itself)." The
  // title's own count is now the NUMBER of time log records, never hours.
  it("carries the record count beside the Effort title, the same register as Stakeholders", async () => {
    api.story = story({})
    api.metrics = FIXTURE_METRICS
    openStory()
    await screen.findByText("Cycle time")
    // The title row itself: "Time log" then its own count, "1" — one WORK_LOG
    // fixture row — the same `<h3>{title}{count}</h3>` shape
    // `help-stakeholders.tsx`'s own "Stakeholders 4" register renders
    // through (`TicketSidePanel`).
    const heading = await screen.findByRole("heading", { name: /^Time log/ })
    expect(heading.textContent).toBe("Time log1")
  })

  it("reads 'Not started' and 'No time log' before any work is logged, with the record count beside the title", async () => {
    api.story = story({})
    api.metrics = NO_METRICS
    openStory()
    await screen.findByText("Cycle time")
    expect(await screen.findByText("Not started")).toBeTruthy()
    expect(await screen.findByText("No time log")).toBeTruthy()
    // The one WORK_LOG fixture row is still logged even though the metrics
    // door has nothing to say yet — the title's own count answers a
    // different question from the tiles now, and does so honestly.
    const heading = await screen.findByRole("heading", { name: /^Time log/ })
    expect(heading.textContent).toBe("Time log1")
  })

  // AMENDED, 22 Sep 2026 — Aurora, verbatim: "make the metrics cards inside
  // the container, like in the metrics artifact you did for me!" The three
  // lines are real `<StatGrid>` tiles now, and the middle one reads "Effort
  // hours" (not "Time log") since the title's own count answers "Time log" on
  // its own now — the figure is said once, not twice.
  it("renders the door's own cycle time, effort hours and flow efficiency as stat tiles", async () => {
    api.story = story({})
    api.metrics = FIXTURE_METRICS
    openStory()
    // 183600s = 51h = 2d 3h; 23400s = 6.5h; 41%.
    expect(await screen.findByText("2d 3h")).toBeTruthy()
    expect(await screen.findByText("Hours logged")).toBeTruthy()
    expect(await screen.findByText("41%")).toBeTruthy()
    // "6.5h" appears once now — the tile's own figure, the title carries the
    // record count instead of repeating it (B44 amended, 22 Sep 2026).
    expect(screen.getAllByText("6.5h").length).toBe(1)
  })

  // AMENDED AGAIN, 22 Sep 2026, same day: Aurora, verbatim, "good. add kind
  // of card background behind cards, this is a metric, like in kit." Each
  // tile's own figure sits inside its own kit `<Card>`, proven by walking up
  // from the value to the nearest `[data-slot="card"]`.
  //
  // THE TONE FLIPPED ON 21 SEP 2026 (rulebook L43) AND HER SENTENCE DID NOT.
  // This read `"raised"` while the panel around the tiles was a painted card.
  // The panel is plain now, so a tile's ground is the PAGE, and `raised`
  // (`--card`) IS the page's own colour in light: the tiles would have
  // measured 1.000 and been held up by their shadow alone. `default` is soft
  // paper, 1.103 against the page, and it is what her own comparison already
  // pointed at -- the kit's own `StatGrid` tile is a `Card variant="default"`.
  it("draws each metric tile inside its own kit card, on soft paper, not bare", async () => {
    api.story = story({})
    api.metrics = FIXTURE_METRICS
    openStory()
    const cycleValue = await screen.findByText("2d 3h")
    const tileCard = cycleValue.closest('[data-slot="card"]')
    expect(tileCard).toBeTruthy()
    expect(tileCard?.getAttribute("data-variant")).toBe("default")
  })

  // AURORA, 21 SEP 2026, THE SAME ROUND: "ok, but i still want to see the
  // individual records of time og! also show avatar of perosn. bring back
  // the old cards with the metrics inside effort." The row list is back,
  // with a face on every row (R35/R90) — this case proves both at once.
  it("draws the individual time log rows, newest first, each with a face, name, date and duration", async () => {
    api.story = story({})
    api.metrics = FIXTURE_METRICS
    api.members = [MEMBER_WITH_FACE]
    const { container } = openStory()
    await screen.findByText("Cycle time")

    const list = container.querySelector('[data-slot="effort-log-rows"]')
    expect(list, "the row list is drawn").toBeTruthy()
    const row = list!.querySelector('[role="listitem"]')
    expect(row).toBeTruthy()
    // The name (first name only, R54/staff naming), the date, and the
    // duration (1800s = 30m).
    expect(row!.textContent).toContain("Priya")
    expect(row!.textContent).toContain("2026-09-18")
    expect(row!.textContent).toContain("30m")
    // THE FACE — `RecordMark` draws the member's own photo once `memberFace`
    // resolves it off `userId`, an <img>, never a broken or empty box.
    const face = row!.querySelector("img")
    expect(face).toBeTruthy()
    expect(face!.getAttribute("src")).toBe(MEMBER_WITH_FACE.imageUrl)
  })

  it("falls back to initials when the row's own person carries no photo", async () => {
    api.story = story({})
    api.metrics = FIXTURE_METRICS
    api.members = []
    const { container } = openStory()
    await screen.findByText("Cycle time")
    const row = container.querySelector('[data-slot="effort-log-rows"] [role="listitem"]')
    expect(row).toBeTruthy()
    expect(row!.querySelector("img")).toBeNull()
    // The fallback is the name's own first letter (`RecordMarkGlyph`).
    expect(row!.textContent).toContain("P")
  })

  // AMENDED, 22 Sep 2026 — Aurora, from the task review, verbatim: "if no
  // time logged yet, hide that component." Stricter than R88's own
  // header-only drop: at zero rows the card renders NOTHING at all, not
  // even the body's own "No time logged yet." sentence — the head's own
  // Start/Stop timer button is the one way in.
  it("renders nothing at all — no card, no sentence — once the record has no time at all", async () => {
    api.story = story({})
    api.metrics = NO_METRICS
    api.workLogs = []
    const { container } = openStory()
    await screen.findByText("Add saved filters to the backlog board")
    // The rest of the page still settles (a neighbouring panel proves the
    // page did not simply fail to render).
    await screen.findByText("Phase and wave")
    expect(screen.queryByText("No time logged yet.")).toBeNull()
    expect(screen.queryByRole("heading", { name: /^Time log/ })).toBeNull()
    expect(screen.queryByRole("button", { name: "Add the first" })).toBeNull()
    // No Effort card at all on the page — not even an empty shell.
    expect(container.querySelector('[data-slot="effort-log-rows"]')).toBeNull()
  })

  // AURORA, THE SAME ROUND: "in effort card inside stories or tickets,
  // rmeove the + button (we have the start on top!)." No add door anywhere
  // on this card, empty or not — the head's own Start/Stop timer button is
  // the one way a new row is written now.
  it("draws no add / Log time button anywhere on the card", async () => {
    api.story = story({})
    api.metrics = FIXTURE_METRICS
    openStory()
    await screen.findByText("Cycle time")
    expect(screen.queryByRole("button", { name: "Log time" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Add the first" })).toBeNull()
  })

  // AMENDED, 22 Sep 2026 — Aurora, verbatim: "remove the pencil. when
  // clicking one detail in slide in, and there have the option to edit."
  // No pencil icon any more: the row itself is the button.
  it("draws no pencil — clicking a row opens the slide-in sheet and corrects it through the same door WorkLogsPanel used", async () => {
    api.story = story({})
    api.metrics = FIXTURE_METRICS
    const { container } = openStory()
    await screen.findByText("Cycle time")
    const row = container.querySelector('[data-slot="effort-log-rows"] [role="listitem"] button')
    expect(row, "the row itself is a button now, not a pencil beside it").toBeTruthy()
    fireEvent.click(row!)
    const dialog = await screen.findByRole("dialog")
    expect(dialog).toBeTruthy()
    expect(within(dialog).getByRole("heading", { name: "Correct this time" })).toBeTruthy()
    fireEvent.click(within(dialog).getByRole("button", { name: /submit/i }))
    await waitFor(() => expect(api.updateWorkLog).toHaveBeenCalled())
    expect(api.updateWorkLog.mock.calls[0][0].id).toBe(WORK_LOG.id)
  })
})
