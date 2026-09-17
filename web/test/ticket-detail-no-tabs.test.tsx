// V1 — THE TICKET'S ONE-PAGE BODY. Client ruling, 17 Sep 2026, verbatim: "I
// want to see, on one single screen with no tabs, the content of tickets:
// the stages, the kind of conversation with the customer, related stories,
// work logs, stakeholders. We currently, in our legacy system, have it on
// one page, and it's very practical. We don't want to change that." And her
// pick, the same day, over the decision page
// (https://claude.ai/artifact/34udsj1HpzcojN15Sq97tt): "For ticket 1 page, I
// choose to implement it v1."
//
// This file proves the shape the brief asked for, over a real render:
//   · no `tablist` renders anywhere on the ticket detail;
//   · the two-column body renders all four panels — Conversation, Related
//     stories, Work logs, Stakeholders;
//   · a `?tab=stories` deep link still resolves — it scrolls to the panel
//     rather than switching to a tab that no longer exists;
//   · Files and links is reachable from the ⋯ menu, as a sheet.
// `ticket-close-moved-to-top.test.tsx` already proves the mango Close button
// stays the title's one primary action, and the standalone Edit pen beside
// it — unaffected by this file's own change, so neither is re-proved here.
//
// AMENDED 17 Sep 2026 — the client's review of the deployed page retired the
// Stakeholders panel's own fact list (Type/App/Raised by/Raised on/Title/
// Raised from/Screen recording/Resolved) and its member picker, and asked
// that every related story show, uncapped, with no "Show all". The two
// describe blocks below that used to prove the OLD shapes ("the stakeholders
// panel carries the raiser facts") are replaced with what the page does now;
// `help-stakeholders.test.tsx` proves the panel component alone, and
// `help-form-dialog-loop-field.test.tsx` proves the picker's NEW home, in
// the edit sheet.

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { HelpStakeholder, HelpTicket, HelpStatus, Story, TicketStageHistory } from "@shared/types"

const BASE_TICKET = {
  id: "help-1",
  ref: "BERG-T0412",
  titleEn: "The dispatch board will not load",
  titleDe: null,
  description: "<p>None of my drivers can see today's routes.</p>",
  helpType: "Bug",
  archivedAt: null,
  accountId: "acct-bergman",
  accountName: "Bergman S.A.",
  appId: "app-1",
  appName: "Dispatch",
  raisedByContactId: null,
  raisedByContactName: "Marta Bergman",
  raiserName: "Marta Bergman",
  sourceScreen: null,
  resolvedAt: null,
  draftResolution: null,
  createdAt: "2026-08-18T09:00:00.000Z",
  updatedAt: null,
  editorName: null,
} as unknown as HelpTicket

const EMPTY_STAGE_HISTORY: TicketStageHistory = {
  recorded: false,
  fromCreation: false,
  events: [],
  spans: [],
  reopens: null,
}

const STAKEHOLDER: HelpStakeholder = {
  userId: "u-2",
  name: "Aurora",
  email: "aurora@kwapso.com",
  imageUrl: null,
  origin: "admin",
} as unknown as HelpStakeholder

// TWO RELATED STORIES — enough to prove "no cap" means something (V1 capped
// at five; two is not a cap-proving number on its own, but the type/status
// chip assertions below need only one, and a second row is what proves nothing
// besides `.slice(0, N)` was quietly reintroduced under a different name).
const RELATED_STORIES = [
  {
    id: "story-1",
    ref: "BERG-S0188",
    title: "Fix the dispatch board's stuck spinner",
    status: "in_review",
    storyType: "Bug",
    ticketId: "help-1",
  },
  {
    id: "story-2",
    ref: "BERG-S0189",
    title: "Add a retry button to the dispatch board",
    status: "open",
    storyType: "Feature",
    ticketId: "help-1",
  },
] as unknown as Story[]

const perms = vi.hoisted(() => ({ can: vi.fn(() => true) }))
vi.mock("@/lib/perms", () => ({ usePermissions: () => ({ can: perms.can }) }))

// V1 (17 Sep 2026) DRAWS EVERY PANEL AT ONCE — see ticket-close-moved-to-top.test.tsx's
// own comment beside this same mock for the full account: `<WorkLogsPanel>`
// (and its always-mounted `<TimeFormDialog>`s) is on the page unconditionally
// now, and that dialog reads a router hook whether or not it is open.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: () => {}, push: () => {} }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}))

const api = vi.hoisted(() => ({ ticket: null as unknown as HelpTicket }))

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return {
    ...actual,
    content: {
      ...actual.content,
      help: async () => ({ tickets: [api.ticket], total: 1, nextCursor: null, hasMore: false }),
      helpOne: async () => api.ticket,
      helpThread: async () => ({ replies: [], total: 0 }),
      helpStakeholders: async () => ({ stakeholders: [STAKEHOLDER] }),
      helpStages: async () => EMPTY_STAGE_HISTORY,
      stories: async () => ({ stories: RELATED_STORIES, total: RELATED_STORIES.length, nextCursor: null, hasMore: false }),
      sprints: async () => ({ sprints: [], total: 0 }),
      workLogs: async () => ({ logs: [], total: 0, totalSeconds: 0, nextCursor: null, hasMore: false }),
      workLogSummary: async () => ({ total: 0, totalSeconds: 0, people: [], kinds: [], weeks: [] }),
      helpAttachments: async () => ({ attachments: [], total: 0 }),
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

vi.mock("@shared/ui/components/sonner/sonner", () => ({
  toast: { success: () => {}, error: () => {}, info: () => {} },
  Toaster: () => null,
}))

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

// `EdgePanel` (the Files sheet, the Related-stories "Show all" sheet) reads
// this to size itself against the viewport — undefined in jsdom otherwise.
window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia

import { HelpDetailScreen } from "@/components/tickets/help-detail"

afterEach(cleanup)
beforeEach(() => {
  perms.can.mockReset().mockReturnValue(true)
  window.history.pushState({}, "", "/tickets/help-1")
})

const openTicket = (status: HelpStatus = "triaged") => {
  api.ticket = { ...BASE_TICKET, status } as HelpTicket
  return render(<HelpDetailScreen teamId="team-1" helpId="help-1" myUserId="u-1" basePath="/tickets" />)
}

describe("the ticket detail draws no tabs", () => {
  it("renders no tablist anywhere on the screen", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    expect(screen.queryByRole("tablist")).toBeNull()
    expect(screen.queryByRole("tab")).toBeNull()
  })
})

describe("the two-column body renders all four panels", () => {
  it("draws the conversation, Related stories, Work logs and Stakeholders together — nothing behind a click", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })

    // CONVERSATION — the request itself, on the thread.
    expect(await screen.findByText("None of my drivers can see today's routes.")).toBeTruthy()
    expect(document.querySelector('[data-slot="ticket-thread"]')).toBeTruthy()
    expect(document.querySelector('[data-slot="reply-composer"]')).toBeTruthy()

    // RELATED STORIES — the panel's own title.
    expect(screen.getByText("Related stories")).toBeTruthy()

    // WORK LOGS — the panel's own title.
    expect(screen.getByText("Work logs")).toBeTruthy()

    // STAKEHOLDERS — the panel's own title, and the people pill inside it.
    expect(screen.getByText("Stakeholders")).toBeTruthy()
    expect(await screen.findByText("Aurora")).toBeTruthy()

    // ALL FOUR IN ONE RENDER — no tab press got any of them onto the page.
  })

  it("stands each panel on its own paper, raised on the record's own ground (R67)", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    const stories = screen.getByText("Related stories").closest('[data-slot="card"]')
    const time = screen.getByText("Work logs").closest('[data-slot="card"]')
    const stakeholders = screen.getByText("Stakeholders").closest('[data-slot="card"]')
    const conversation = (document.querySelector('[data-slot="ticket-thread"]') as HTMLElement).closest(
      '[data-slot="card"]'
    )
    for (const card of [stories, time, stakeholders, conversation]) {
      expect(card, "every one of the four panels stands on a real Card").toBeTruthy()
      expect(card!.getAttribute("data-variant")).toBe("raised")
    }
  })
})

// AMENDED 17 Sep 2026 — client ruling, reading the deployed page back,
// verbatim: "Remove all of this from stakeholders 'Pick someone to keep in
// the loop … Type Issue App Kwapso System Raised by Max Mustermann Raised on
// Sep 16, 2026 (1 days ago) Title Title (English) Ticket and story titles
// Raised from Screen recording Resolved … You can add members, but no one is
// ever removed.'" The panel keeps only the people themselves.
describe("the stakeholders panel is faces + names only", () => {
  it("renders the stakeholder's name and no fact list, no picker, no intro sentence", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    const panel = screen.getByText("Stakeholders").closest('[data-slot="card"]') as HTMLElement
    expect(within(panel).getByText("Aurora")).toBeTruthy()

    // THE FACT LIST IS GONE — every label the old OverviewList drew.
    for (const label of ["Type", "Raised by", "Raised on", "Raised from", "Screen recording", "Resolved"]) {
      expect(within(panel).queryByText(label), `"${label}" must not render in the panel any more`).toBeNull()
    }
    // THE PICKER AND ITS SENTENCES ARE GONE — moved to the edit sheet
    // (help-form-dialog-loop-field.test.tsx proves the new home).
    expect(within(panel).queryByText("Pick someone to keep in the loop")).toBeNull()
    expect(within(panel).queryByText("You can add members, but no one is ever removed.")).toBeNull()
    // THE OLD INTRO SENTENCE IS GONE TOO.
    expect(
      within(panel).queryByText("Everyone kept in the loop on this ticket, the person who raised it, your admins, and anyone mentioned.")
    ).toBeNull()
  })
})

// CLIENT RULING, 17 Sep 2026, verbatim: "In the section 'Related Stories',
// also show the type as a chip with the icon and the color dot for the
// status. Remove 'Show All' because you need to show them all."
describe("related stories show every row, uncapped, with a type chip and a status dot", () => {
  it("renders every related story with no 'Show all' link", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    const panel = screen.getByText("Related stories").closest('[data-slot="card"]') as HTMLElement
    expect(within(panel).getByText("Fix the dispatch board's stuck spinner")).toBeTruthy()
    expect(within(panel).getByText("Add a retry button to the dispatch board")).toBeTruthy()
    expect(within(panel).queryByRole("button", { name: "Show all" })).toBeNull()
  })

  it("carries the story's own TYPE as a chip with its icon, and STATUS as a coloured dot", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    const panel = screen.getByText("Related stories").closest('[data-slot="card"]') as HTMLElement
    const row = within(panel).getByText("Fix the dispatch board's stuck spinner").closest("li") as HTMLElement
    // THE TYPE CHIP — plain, quiet (never coloured — R86 reserves colour for
    // status), carrying the word AND an icon glyph beside it.
    expect(within(row).getByText("Bug")).toBeTruthy()
    expect(row.querySelector("svg")).toBeTruthy()
    // THE STATUS — a coloured dot badge, `variant="status"`, never plain
    // `variant="secondary"` the way it drew before this ruling.
    const statusBadge = within(row).getByText("In review").closest('[data-slot="badge"]') as HTMLElement
    expect(statusBadge.getAttribute("data-dot")).toBe("review")
  })

  it("offers 'New story' on the panel's own title row, replacing the old 'Show all' door to it", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    const panel = screen.getByText("Related stories").closest('[data-slot="card"]') as HTMLElement
    expect(await within(panel).findByRole("button", { name: "New story" })).toBeTruthy()
  })
})

describe("files moved to the ⋯ menu", () => {
  it("opens the attachments panel as a sheet from 'Files and links'", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    const trigger = screen.getByRole("button", { name: "More actions" })
    // RADIX'S DropdownMenuTrigger OPENS ON POINTER DOWN, not on `click` alone
    // — a plain `fireEvent.click` never dispatches the pointer events it
    // listens for in jsdom.
    fireEvent.pointerDown(trigger, { button: 0, pointerId: 1 })
    fireEvent.pointerUp(trigger, { button: 0, pointerId: 1 })
    fireEvent.click(trigger)
    const filesItem = await screen.findByText("Files and links")
    fireEvent.pointerDown(filesItem, { button: 0, pointerId: 1 })
    fireEvent.pointerUp(filesItem, { button: 0, pointerId: 1 })
    fireEvent.click(filesItem)
    // The attachments panel's own empty-state sentence (help-attachments.tsx),
    // now inside the slide-in rather than a tab panel.
    expect(await screen.findByText("Nothing attached to this ticket yet.")).toBeTruthy()
  })
})

describe("?tab= still resolves — it scrolls instead of switching", () => {
  it("scrolls to the Related stories panel for a ?tab=stories deep link", async () => {
    window.history.pushState({}, "", "/tickets/help-1?tab=stories")
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled())
    // Called ON the Related stories panel's own DOM anchor, not some other
    // element — the anchor is the ancestor `scrollIntoView` was invoked on.
    const storiesHeading = screen.getByText("Related stories")
    const calledOn = scrollIntoView.mock.instances[0] as unknown as HTMLElement
    expect(calledOn.contains(storiesHeading)).toBe(true)
  })

  it("opens the Files sheet for a ?tab=files deep link, rather than scrolling to nothing", async () => {
    window.history.pushState({}, "", "/tickets/help-1?tab=files")
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    expect(await screen.findByText("Nothing attached to this ticket yet.")).toBeTruthy()
  })

  it("lands on the page with no error for a plain deep link (no ?tab= at all)", async () => {
    window.history.pushState({}, "", "/tickets/help-1")
    openTicket()
    expect(await screen.findByRole("heading", { level: 1 })).toBeTruthy()
    expect(screen.getByText("Related stories")).toBeTruthy()
  })
})
