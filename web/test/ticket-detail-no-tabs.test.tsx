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

import type { HelpMessage, HelpStakeholder, HelpTicket, HelpStatus, Story, TicketStageHistory } from "@shared/types"

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

const api = vi.hoisted(() => ({
  ticket: null as unknown as HelpTicket,
  replies: [] as unknown as HelpMessage[],
}))

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return {
    ...actual,
    content: {
      ...actual.content,
      help: async () => ({ tickets: [api.ticket], total: 1, nextCursor: null, hasMore: false }),
      helpOne: async () => api.ticket,
      helpThread: async () => ({ replies: api.replies, total: api.replies.length }),
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
import { TICKET_PANEL_ANCHOR } from "@/components/tickets/ticket-detail-body"

afterEach(cleanup)
beforeEach(() => {
  perms.can.mockReset().mockReturnValue(true)
  window.history.pushState({}, "", "/tickets/help-1")
  api.replies = []
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

  it("stands each panel on its own paper, on the bare page ground now (R67, amended 18 Sep 2026)", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    const stories = screen.getByText("Related stories").closest('[data-slot="card"]')
    const time = screen.getByText("Work logs").closest('[data-slot="card"]')
    const stakeholders = screen.getByText("Stakeholders").closest('[data-slot="card"]')
    const conversation = (document.querySelector('[data-slot="ticket-thread"]') as HTMLElement).closest(
      '[data-slot="card"]'
    )
    // `default` (`--surface-panel`, soft paper), NOT `raised` (`--card`) —
    // client ruling, 18 Sep 2026: "remove the 'overall' container, make
    // each thing its own container, like tickets dashboard." `RecordScreen`
    // no longer wraps this body in its own `--surface-panel` Card
    // (`panelVisible={false}`), so these four now stand DIRECTLY on the
    // page — and `--card`/`--background` are the SAME colour in light
    // (ticket-detail-body.tsx's own header), so `raised` here would be the
    // exact "container on its own ground" bug R67 exists to catch.
    for (const card of [stories, time, stakeholders, conversation]) {
      expect(card, "every one of the four panels stands on a real Card").toBeTruthy()
      expect(card!.getAttribute("data-variant")).toBe("default")
    }
  })

  it("draws no second, outer panel card around the four of them (18 Sep 2026 container ruling)", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    // The kit's own record panel region carries this attribute
    // (record-detail.tsx: `data-record-region="panel"`) — `RecordScreen`'s
    // `panelVisible={false}` means `RecordDetail` never draws that Card at
    // all, so the attribute must not appear anywhere on the page.
    expect(document.querySelector('[data-record-region="panel"]')).toBeNull()
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

// AMENDED 18 Sep 2026 — client ruling, verbatim: "kill this whole files &
// links … button. those are visible in the conversation itself! the
// customers can attach images & files. so do we." The ⋯ menu item and its
// EdgePanel sheet are both gone; the SAME `<HelpAttachmentsPanel>` renders
// inline, inside the Conversation card.
describe("files are inline in the conversation, not behind the ⋯ menu", () => {
  it("draws no 'Files and links' item in the ⋯ menu", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    const trigger = screen.getByRole("button", { name: "More actions" })
    fireEvent.pointerDown(trigger, { button: 0, pointerId: 1 })
    fireEvent.pointerUp(trigger, { button: 0, pointerId: 1 })
    fireEvent.click(trigger)
    // The heading text below still says "Files and links" — as the inline
    // tray's own caption — so this asks specifically for a MENU ITEM
    // (Radix's own role) rather than the bare text, which would find that
    // caption anywhere on the page and pass for the wrong reason.
    expect(screen.queryByRole("menuitem", { name: "Files and links" })).toBeNull()
  })

  it("renders the attachments panel's own empty state inline, inside the conversation card, with no click needed", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    const conversation = (document.querySelector('[data-slot="ticket-thread"]') as HTMLElement).closest(
      '[data-slot="card"]'
    ) as HTMLElement
    // The attachments panel's own empty-state sentence (help-attachments.tsx),
    // now inside the Conversation card's own tray rather than a tab panel or
    // a sheet — and nothing was clicked to reach it.
    expect(await within(conversation).findByText("Nothing attached to this ticket yet.")).toBeTruthy()
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

  it("scrolls to the Conversation panel for a ?tab=files deep link, rather than opening a sheet that no longer exists", async () => {
    window.history.pushState({}, "", "/tickets/help-1?tab=files")
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled())
    const thread = document.querySelector('[data-slot="ticket-thread"]') as HTMLElement
    const calledOn = scrollIntoView.mock.instances[0] as unknown as HTMLElement
    expect(calledOn.contains(thread)).toBe(true)
    // The attachments the old sheet held are right there once landed.
    expect(await screen.findByText("Nothing attached to this ticket yet.")).toBeTruthy()
  })

  it("lands on the page with no error for a plain deep link (no ?tab= at all)", async () => {
    window.history.pushState({}, "", "/tickets/help-1")
    openTicket()
    expect(await screen.findByRole("heading", { level: 1 })).toBeTruthy()
    expect(screen.getByText("Related stories")).toBeTruthy()
  })
})

// CLIENT RULING, 18 Sep 2026, VERBATIM: "the ticket detail conversation
// should have more height, depending on the height of the right column
// components. they should be, the addition of the three of the right, same
// as conversation." Proved structurally (jsdom has no layout engine to
// measure a real height against): the grid carries the two-column,
// three-AUTO-row template and `items-stretch`, the conversation cell spans
// all three rows with `min-h-0`/`h-full` so it never feeds its own height
// back into them, and the three right-column panels are direct grid
// children — no wrapping `flex-col` box left to give them a height of their
// own for the span to measure.
//
// AMENDED 18 Sep 2026, SAME DAY — live proof on staging (T0001) measured the
// FIRST cut of this fix (`lg:grid-rows-3`, three EQUAL `fr` tracks) still
// short: conversation 1015.78px against the three right cards' own
// 136.3 + 322.59 + 208.3 plus two 24px gaps = 901.49px. An `fr` track in an
// auto-height grid sizes to the tallest CONTENT before dividing space
// evenly, so the spanning conversation cell dragged all three equal tracks
// up to a third of ITS OWN height each, and the "gap" under the right
// column's three short cards was leftover track space, not a uniform 24px
// gap. `lg:grid-rows-[auto_auto_auto]` sizes each track to its OWN cell
// instead, so the span's height becomes the sum the right column alone
// decided — see ticket-detail-body.tsx's own header for the full account.
describe("the conversation cell spans the right column's three rows (R16 sibling ruling)", () => {
  it("the grid is two columns × three auto rows, stretched, with the conversation cell spanning all three", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    const conversationAnchor = document.getElementById(TICKET_PANEL_ANCHOR.conversation) as HTMLElement
    const grid = conversationAnchor.parentElement as HTMLElement
    expect(grid.className).toContain("lg:grid-cols-[2fr_1fr]")
    // THREE AUTO ROWS, NOT THREE EQUAL `fr` ONES — `grid-rows-3` (Tailwind's
    // `repeat(3, minmax(0, 1fr))`) is exactly the shape that dragged all
    // three tracks up to the spanning conversation cell's own height; this
    // must never come back.
    expect(grid.className).toContain("lg:grid-rows-[auto_auto_auto]")
    expect(grid.className).not.toMatch(/lg:grid-rows-3\b/)
    expect(grid.className).toContain("items-stretch")
    expect(conversationAnchor.className).toContain("lg:row-span-3")
    // THE SPAN MUST NOT FEED ITS OWN HEIGHT BACK INTO THE TRACKS IT SPANS —
    // a grid item's default min-height is its own content's min-content
    // size, which `min-h-0` floors to zero so only the right column's three
    // cells set the auto tracks; `h-full` then fills whatever height the
    // grid hands back.
    expect(conversationAnchor.className).toContain("lg:min-h-0")
    expect(conversationAnchor.className).toContain("lg:h-full")

    // THE THREE RIGHT-COLUMN PANELS ARE DIRECT GRID CHILDREN, not nested in
    // a `flex-col` box of their own — that box is exactly what USED to give
    // them (and therefore the span) a height independent of the grid.
    const storiesAnchor = document.getElementById(TICKET_PANEL_ANCHOR.stories) as HTMLElement
    const timeAnchor = document.getElementById(TICKET_PANEL_ANCHOR.time) as HTMLElement
    const stakeholdersAnchor = document.getElementById(TICKET_PANEL_ANCHOR.stakeholders) as HTMLElement
    expect(storiesAnchor.parentElement).toBe(grid)
    expect(timeAnchor.parentElement).toBe(grid)
    expect(stakeholdersAnchor.parentElement).toBe(grid)
  })

  it("the conversation card fills its grid cell (lg:h-full) rather than a fixed viewport height", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    const conversationCard = (document.querySelector('[data-slot="ticket-thread"]') as HTMLElement).closest(
      '[data-slot="card"]'
    ) as HTMLElement
    expect(conversationCard.className).toContain("lg:h-full")
  })
})

// CLIENT RULING, 18 Sep 2026, VERBATIM: "missing the avatars of the senders
// … client contacts and staff alike."
describe("every message in the thread carries the sender's face", () => {
  it("draws an avatar for the raiser's own message and for a staff reply", async () => {
    api.replies = [
      {
        id: "msg-1",
        ticketId: "help-1",
        body: "We're looking into it.",
        taggedUserIds: [],
        isAgent: false,
        authorId: "u-2",
        authorName: "Aurora Weber",
        authorIsClient: false,
        createdAt: "2026-08-18T10:00:00.000Z",
      },
    ] as unknown as HelpMessage[]
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    await screen.findByText("We're looking into it.")
    // ONE PER MESSAGE — the description (the raiser) and the one reply
    // (staff) above.
    const avatars = document.querySelectorAll('[data-slot="avatar"]')
    expect(avatars.length).toBe(2)
  })
})

// CLIENT RULING, 18 Sep 2026, VERBATIM: "missing the attach button … the
// customers can attach images & files. so do we."
describe("the composer carries an attach button, wired to the same file picker", () => {
  it("draws a Paperclip button beside the send button, and it opens the SAME attachments panel inline below", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    const attach = await screen.findByRole("button", { name: "Attach a file" })
    expect(attach).toBeTruthy()
    // The panel it reaches is already on the page (inline in the
    // conversation), proving there is one upload path, not a second one
    // conjured by this button.
    expect(screen.getByText("Nothing attached to this ticket yet.")).toBeTruthy()
  })
})
