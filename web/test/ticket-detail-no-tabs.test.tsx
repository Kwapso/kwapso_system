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
//   · Files and links is reachable from the ⋯ menu, as a sheet;
//   · the Stakeholders panel carries the "Raised by" / "Raised on" facts
//     (ticket-raised-on.test.tsx proves the SOURCE wiring; this proves the
//     DOM actually renders them, inside the right panel).
// `ticket-close-moved-to-top.test.tsx` already proves the mango Close button
// stays the title's one primary action — unaffected by this file's own
// change, so it is not re-proved here.

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { HelpStakeholder, HelpTicket, HelpStatus, TicketStageHistory } from "@shared/types"

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
      stories: async () => ({ stories: [], total: 0, nextCursor: null, hasMore: false }),
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

describe("the stakeholders panel carries the raiser facts", () => {
  it("renders 'Raised by' and 'Raised on' inside the Stakeholders panel, below the people pills", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    const panel = screen.getByText("Stakeholders").closest('[data-slot="card"]') as HTMLElement
    expect(within(panel).getByText("Raised by")).toBeTruthy()
    expect(within(panel).getByText("Raised on")).toBeTruthy()
    // The pills sit ABOVE the facts (V1: "plus the facts … below them") —
    // the stakeholder's own name renders before "Raised by" in DOM order.
    const html = panel.innerHTML
    expect(html.indexOf("Aurora")).toBeGreaterThan(-1)
    expect(html.indexOf("Aurora")).toBeLessThan(html.indexOf("Raised by"))
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
