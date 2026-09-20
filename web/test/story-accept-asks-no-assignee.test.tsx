// Aurora, verbatim, 20 Sep 2026: "on stories, when accepting i have to assign a
// person right? replicate the queue behaviour for all buttons in the detail
// screen. maybe i am wrong here."
//
// SHE IS WRONG, AND THIS FILE IS THE PROOF. There is no "Accept" word or
// concept anywhere in the stories module (`web/components/work/stories-
// screen.tsx`, `web/components/work/story-detail.tsx`,
// `workers/content/src/lib/stories.ts`): a story is moved along by "Ready for
// review" (open/in_progress to in_review) and "Done" (in_review to done), and
// neither call ever reads or writes an `assigneeId`. `setStoryStatus`
// (workers/content/src/lib/stories.ts) refuses a `done` move to anybody but
// the app's own team lead and refuses it while a checklist step is
// unfinished. It does not ask who the story belongs to.
//
// THE "ACCEPT ASKS FOR A PERSON" BEHAVIOUR SHE IS RECALLING BELONGS TO
// TICKETS, not stories: the Triage Queue's own decision word (Issue asks
// "Assign", Request asks "Plan") opens a people row before the ticket is
// triaged (`triageAct`, `web/components/tickets/tickets-collection.tsx`),
// and that queue behaviour was unified onto the ticket detail head THE SAME
// DAY, on her own ruling quoted there verbatim ("when ticket is in status
// triage, also in main screen the visible buttons should change: same as in
// queue"), proved by `web/test/ticket-close-moved-to-top.test.tsx`'s own
// "the triage stage's own actions replace Close/the timer on the head"
// block. That file is a different lane's and untouched here.
//
// THE STORIES "QUEUE" SHE MEANS IS A DIFFERENT THING WITH THE SAME NAME.
// The Reviews tab's own "Queue" sub-view (`ReviewsQueue`, stories-
// screen.tsx) is a READ-ONLY list of stories already at `done`. Aurora's
// own 20 Sep 2026 ruling for it: "For Queue, same chips as the story detail
// page except sprint, title, description, completed by, completed on."
// Every card's only behaviour is `onSelect`, which opens the story's detail
// screen; it carries no Accept/Assign button of its own to drift from the
// detail head, so there is nothing to unify. The detail head is already the
// ONE decision surface a story has, and this file locks in that it asks for
// no assignee on either of its two moves.
//
// DRIVEN, NOT SCANNED, the same reason `story-born-on-a-ticket.test.tsx`
// gives: a comment can say the right thing beside a control that does the
// wrong one, and only a render that presses the buttons back catches that.

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { Story, StoryAttachment } from "@shared/types"

function story(overrides: Partial<Story>): Story {
  return {
    id: "story-1",
    ref: "BERG-S0188",
    title: "Move the dispatch list onto the driver app",
    detail: null,
    status: "open",
    storyType: "Feature",
    reviewNote: null,
    reviewFileUrl: null,
    reviewFileName: null,
    ticketId: null,
    ticketRef: null,
    sprintId: null,
    sprintName: null,
    appId: "app-1",
    appName: "Dispatch",
    processId: null,
    stepKey: null,
    changesNoStep: true,
    processIds: [],
    // NO ASSIGNEE ON EITHER FIXTURE, ON PURPOSE. The whole point of this file
    // is that neither move reads or refuses on this field.
    assigneeId: null,
    assigneeName: null,
    reviewerId: null,
    reviewerName: null,
    startsOn: null,
    dueOn: null,
    sprintEndsOn: null,
    closedAt: null,
    closingNote: null,
    rank: null,
    category: "Client-requested",
    acceptanceCriteria: null,
    moscow: null,
    contributesToGoal: false,
    ...overrides,
  } as unknown as Story
}

const LINK_ATTACHMENT: StoryAttachment = {
  id: "att-1",
  storyId: "story-1",
  kind: "link",
  label: "Recording",
  url: "https://example.com/clip",
  contentType: null,
  sizeBytes: null,
  createdAt: "2026-09-19T10:00:00.000Z",
  addedByName: "Aurora",
}

const api = vi.hoisted(() => ({
  story: null as unknown as Story,
  setStoryStatus: vi.fn(),
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
      storyAttachments: async () => ({ attachments: [LINK_ATTACHMENT], total: 1 }),
      sprints: async () => ({ sprints: [], total: 0 }),
      help: async () => ({ tickets: [], total: 0, nextCursor: null, hasMore: false }),
      workLogs: async () => ({ logs: [], total: 0, totalSeconds: 0, nextCursor: null, hasMore: false }),
      workLogSummary: async () => ({ total: 0, totalSeconds: 0, people: [], kinds: [], weeks: [] }),
      runningTimers: async () => ({ timers: [] }),
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

afterEach(cleanup)
beforeEach(() => {
  perms.can.mockReset().mockReturnValue(true)
  api.setStoryStatus.mockReset().mockResolvedValue({ stories: [] })
})

const openStory = () =>
  render(<StoryDetailScreen teamId="team-1" storyId="story-1" basePath="/stories" />)

describe("a story's own decision surface asks for no assignee (Aurora, 20 Sep 2026)", () => {
  it("sends a story for review with no assignee anywhere in the call", async () => {
    api.story = story({ status: "open" })
    openStory()

    fireEvent.click(await screen.findByRole("button", { name: "Ready for review" }))
    const dialog = await screen.findByRole("dialog")

    // What's already attached (the mocked `storyAttachments` read) is enough
    // to satisfy "something to show", the same door requirement 6.9 states
    // for anybody, never a person to name.
    fireEvent.change(screen.getByLabelText("What you did"), {
      target: { value: "Moved the dispatch list onto the driver app." },
    })
    fireEvent.submit(dialog.querySelector("form") as HTMLFormElement)

    await waitFor(() => expect(api.setStoryStatus).toHaveBeenCalled())
    expect(api.setStoryStatus).toHaveBeenCalledWith(
      "story-1",
      "in_review",
      undefined,
      {
        reviewNote: "Moved the dispatch list onto the driver app.",
        reviewFileUrl: undefined,
        reviewFileName: undefined,
      }
    )
    // NOBODY WAS ASKED. The call above is the entire payload the door
    // receives, no fourth argument, no `assigneeId` anywhere inside it.
  })

  it("closes a reviewed story with one click, no dialog, no person to name", async () => {
    api.story = story({ status: "in_review", reviewNote: "Moved it.", closingNote: null })
    openStory()

    fireEvent.click(await screen.findByRole("button", { name: "Done" }))

    await waitFor(() => expect(api.setStoryStatus).toHaveBeenCalled())
    // THE SAME DOOR THE BOARD'S OWN DRAG-TO-DONE CALLS
    // (`stories-screen.tsx`'s `moveStatus`), with exactly the two arguments
    // that route accepts, nothing that could carry an assignee.
    expect(api.setStoryStatus).toHaveBeenCalledWith("story-1", "done", undefined)
    // No people picker, no second dialog: `screen.queryByRole("dialog")` is
    // never non-null across this whole case because none is ever opened.
    expect(screen.queryByRole("dialog")).toBeNull()
  })
})
