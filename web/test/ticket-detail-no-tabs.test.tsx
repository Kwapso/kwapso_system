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
//   · Files and links is reachable from NEITHER the ⋯ menu NOR a tray inside
//     the conversation — see this file's own describe block below, and
//     help-detail.tsx's own header, for the two 18 Sep 2026 rulings that
//     took it there and then pulled it back out.
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
      // ONE ROW, NOT ZERO (R88) — this file's own panels are proved
      // POPULATED (the grid/card/paper structure every `it` below asserts),
      // and a genuinely empty Work logs panel now draws no title row at all
      // (`EmptyGatedPanel`, deep-link/screen-bits.tsx) — the shape
      // `empty-state-single-door.test.ts` proves on its own. A zero-row
      // fixture here would be testing that law by accident, on a title this
      // file needs present to find the panel by.
      workLogs: async () => ({
        logs: [
          {
            id: "log-1",
            targetTable: "help",
            targetId: "help-1",
            targetLabel: "BERG-T0412",
            targetRef: "BERG-T0412",
            userId: "user-1",
            userName: "Aurora",
            kind: null,
            note: null,
            startedAt: "2026-08-18T09:00:00.000Z",
            endedAt: "2026-08-18T09:30:00.000Z",
            seconds: 1800,
            billable: true,
            discarded: false,
            accountId: "acct-bergman",
          },
        ],
        total: 1,
        totalSeconds: 1800,
        nextCursor: null,
        hasMore: false,
      }),
      workLogSummary: async () => ({
        total: 1,
        totalCapped: false,
        totalSeconds: 1800,
        peopleTotal: 1,
        people: [{ userId: "user-1", userName: "Aurora", seconds: 1800 }],
        kinds: [],
        weeks: [],
      }),
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
//
// R89 BELOW-LG RE-FIX, 19 Sep 2026 — an UNCONDITIONAL assignment now,
// not `??=`: `web/test/setup.ts` already stubs `matchMedia` globally
// (honest jsdom default, `matches: false` for every query), so this line's
// own `??=` had been a no-op since that global landed. `TicketDetailBody`
// now picks its LG-vs-below-lg TREE with a real `matchMedia` breakpoint
// hook (`ticket-detail-body.tsx`'s own `useIsAtLeastLg`), never a `lg:`
// class left for the browser to resolve, so this file's whole assertion
// set — written against the desktop, 2fr/1fr shape — needs that ONE query
// (`64rem`, matching Tailwind's own `lg:`) answered `true`; every other
// query (reduced-motion, `EdgePanel`'s own read) keeps the honest `false`.
window.matchMedia = ((query: string) => ({
  matches: query === "(min-width: 64rem)",
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

// AMENDED 18 Sep 2026, TWICE THE SAME DAY. First: client ruling, verbatim:
// "kill this whole files & links … button. those are visible in the
// conversation itself! the customers can attach images & files. so do we." —
// the ⋯ menu item and its EdgePanel sheet went, and `<HelpAttachmentsPanel>`
// was mounted inline inside the Conversation card instead. Then, reading
// THAT shape deployed, a second ruling pulled it again, verbatim: "wtf is
// his files inside the ocnversation lol thats not what i meant, i meant
// that each message can have images or files, check in the kit because we
// already biult the ui for that." So there is no ⋯ menu item (unchanged
// from the first ruling) AND no inline tray any more either — the panel is
// `PARKED` (shared/rules/registry.ts, "tickets/help-attachments") until
// per-message attachments have a door to read from (help-detail.tsx's own
// header carries the exact migration this needs).
describe("files are neither behind the ⋯ menu nor in a tray inside the conversation", () => {
  it("draws no 'Files and links' item in the ⋯ menu", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    // Scoped to the WIDE actions row (`shared/web/head-actions.tsx`'s own
    // `HEAD_ACTIONS_ROW_CLASS`, 18 Sep 2026's narrow-width fold) — the chip
    // row now carries a SECOND "More actions" trigger for the folded width
    // (`HeadActionsFoldMenu`), same accessible name by design (both are the
    // record's one overflow menu; only jsdom, which loads no CSS and so
    // never resolves either `@min-[24rem]` half of the fold, would find both
    // at once). `web/test/head-actions-fold.test.tsx` owns the fold's own
    // contract; this test still only means the row it always meant.
    const trigger = within(
      document.querySelector('[data-slot="head-actions-row"]') as HTMLElement
    ).getByRole("button", { name: "More actions" })
    fireEvent.pointerDown(trigger, { button: 0, pointerId: 1 })
    fireEvent.pointerUp(trigger, { button: 0, pointerId: 1 })
    fireEvent.click(trigger)
    expect(screen.queryByRole("menuitem", { name: "Files and links" })).toBeNull()
  })

  it("draws no attachments tray inside the conversation card either — the panel is parked, not inline", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    const conversation = (document.querySelector('[data-slot="ticket-thread"]') as HTMLElement).closest(
      '[data-slot="card"]'
    ) as HTMLElement
    // Neither the tray's own caption nor the panel's empty-state sentence
    // (help-attachments.tsx) renders anywhere — the whole panel is unmounted
    // on this screen, not merely relabelled.
    expect(within(conversation).queryByText("Files and links")).toBeNull()
    expect(within(conversation).queryByText("Nothing attached to this ticket yet.")).toBeNull()
    // THE COMPOSER'S OWN ATTACH BUTTON IS BACK (team migration 0105) — see
    // this file's own composer describe block below for the dedicated
    // assertion of what it does now that per-message attachments have a door.
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
    // NO ATTACHMENTS TRAY WAITS THERE ANY MORE — the 18 Sep 2026 correction
    // (see this file's own "files are neither behind the ⋯ menu nor in a
    // tray" describe block, above) pulled it; `files` now lands on the
    // nearest real panel, Conversation, and nothing more.
    expect(screen.queryByText("Nothing attached to this ticket yet.")).toBeNull()
  })

  it("lands on the page with no error for a plain deep link (no ?tab= at all)", async () => {
    window.history.pushState({}, "", "/tickets/help-1")
    openTicket()
    expect(await screen.findByRole("heading", { level: 1 })).toBeTruthy()
    expect(screen.getByText("Related stories")).toBeTruthy()
  })
})

// SUPERSEDED TWICE, R89 "footer-on-the-edge" — the CLIENT RULING this
// describe block originally proved ("the addition of the three of the
// right, same as conversation") was answered, 18 Sep 2026, by a LATER and
// different ruling read against the deployed page: "On ticket detail, the
// footer should be at the very bottom. The position is still fucking
// wrong. Fix it once and for all." That construction (a `grid-cols-
// [2fr_1fr]` row, `items-stretch`, both cells `h-full min-h-0`, the side
// column independently `overflow-y-auto`) held through the round-19
// below-lg re-fix and was proved at every width THAT round tested.
//
// ROUND 23, 19 Sep 2026, REPLACES IT AGAIN — Aurora, over a screenshot at
// 1991×842 with the assistant panel open (a combination none of the
// earlier rounds' own proof widths had measured): "THE PROBLEM IS WHERE
// THE FOOTER IS!!! SHOULD BE AT THE VERY BOTTOM!" Rather than keep
// bounding the conversation card's own height against a `flex-1 min-h-0`
// chain that kept re-breaking on each new width/height/assistant-state
// combination, `TicketDetailBody` now pulls the composer fully OUTSIDE any
// scrolling region — its own root's last child, `sticky` (with a
// negative, padding-compensated `bottom` offset — a plain `bottom-0`
// measured a live 24px gap, since sticky anchors to the scrollport's own
// padding edge) as a second, independent guarantee — and the grid this
// describe block once
// asserted `h-full`/`items-stretch`/independent-scroll for is now a
// NATURAL-HEIGHT grid (`items-start`, no `h-full` on either cell) nested
// ONE level inside the ticket body's own single scrolling region, which
// scrolls the grid AND the side column TOGETHER rather than letting the
// side column scroll independently of it. `ticket-detail-body.tsx`'s own
// header carries the full account.
describe("at lg, the scroll region's own grid pairs the thread with the side panels (R89 round 23)", () => {
  it("the conversation anchor's grandparent is TicketDetailBody's own root; its parent is the one scroll region; the grid sits one level inside that", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    const conversationAnchor = document.getElementById(TICKET_PANEL_ANCHOR.conversation) as HTMLElement
    const grid = conversationAnchor.parentElement as HTMLElement
    expect(grid.className).toContain("grid-cols-[2fr_1fr]")

    const scrollRegion = grid.parentElement as HTMLElement
    expect(scrollRegion.className).toContain("overflow-y-auto")
    expect(scrollRegion.className).toContain("flex-1")
    expect(scrollRegion.className).toContain("min-h-0")

    const ticketBodyRoot = scrollRegion.parentElement as HTMLElement
    expect(ticketBodyRoot.getAttribute("data-slot")).toBe("ticket-detail-body")
    expect(ticketBodyRoot.firstElementChild).toBe(scrollRegion)

    // THE SIDE PANELS SHARE THE SAME GRID, ONE CELL — not three separate
    // grid rows, and no longer independently scrollable: round 23 scrolls
    // the grid and the side column TOGETHER, inside the one scroll region
    // above, rather than giving the side column its own second scroller.
    const storiesAnchor = document.getElementById(TICKET_PANEL_ANCHOR.stories) as HTMLElement
    const timeAnchor = document.getElementById(TICKET_PANEL_ANCHOR.time) as HTMLElement
    const stakeholdersAnchor = document.getElementById(TICKET_PANEL_ANCHOR.stakeholders) as HTMLElement
    const sideColumn = storiesAnchor.parentElement as HTMLElement
    expect(sideColumn.parentElement).toBe(grid)
    expect(timeAnchor.parentElement).toBe(sideColumn)
    expect(stakeholdersAnchor.parentElement).toBe(sideColumn)
    expect(sideColumn.className).toContain("flex-col")
    expect(sideColumn.className).not.toMatch(/\boverflow-y-auto\b/)
  })

  it("the conversation card holds only its own scrolling thread — no CardFooter nests inside it any more", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    const conversationCard = (document.querySelector('[data-slot="ticket-thread"]') as HTMLElement).closest(
      '[data-slot="card"]'
    ) as HTMLElement
    expect(conversationCard.querySelector('[data-slot="card-footer"]')).toBeNull()
  })

  it("the composer is the ticket body's own pinned last child, outside the grid and its scroll region entirely", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    const composerForm = document.querySelector('[data-slot="reply-composer"]') as HTMLElement
    const composerFooter = composerForm.parentElement!.parentElement as HTMLElement
    expect(composerFooter.getAttribute("data-slot")).toBe("card-footer")
    const ticketBodyRoot = composerFooter.parentElement as HTMLElement
    expect(ticketBodyRoot.getAttribute("data-slot")).toBe("ticket-detail-body")
    expect(ticketBodyRoot.lastElementChild).toBe(composerFooter)
    expect(composerFooter.className).toContain("sticky")
    // NOT bottom-0 — see ticket-detail-body.tsx's own header: sticky's
    // offset anchors to the scrollport's PADDING edge, so bottom-0
    // measured a 24px gap live at lg; the negative, padding-compensated
    // offset is what actually reaches the pane's true bottom edge.
    expect(composerFooter.className).toContain("bottom-[calc(-1*var(--space-5))]")
    expect(composerFooter.className).toContain("lg:bottom-[calc(-1*var(--space-6))]")
    expect(composerFooter.className).toContain("flex-none")
    expect(composerFooter.className).toContain("w-full")
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
// customers can attach images & files. so do we." — drew a Paperclip button
// on the composer, wired to `HelpAttachmentsPanel`'s own file picker, for
// one day. THE SAME DAY'S LATER CORRECTION pulled the panel it opened
// ("wtf is his files inside the ocnversation … thats not what i meant",
// help-detail.tsx's own header), and named what she actually wanted instead:
// each MESSAGE carrying its own files. Team migration 0105 is that door, and
// the button is back for real — `ReplyComposer` draws it unconditionally now
// (reply-composer.tsx), staging a pick through `useReplySend`'s own
// `uploadFile`. The full pick → tile → send → per-message render path is
// `reply-attachments.test.tsx`'s own suite; this file only has to prove the
// control is on screen, on THIS host, wired to something real.
describe("the composer's attach button is back", () => {
  it("draws a Paperclip / 'Attach a file' control on the composer", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    expect(screen.getByRole("button", { name: "Attach a file" })).toBeTruthy()
  })
})
