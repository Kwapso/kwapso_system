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

// THE RAISER — origin: "raiser", so the Raised-by tile itself renders
// (`(raiser || raisedByContactId)` in help-stakeholders.tsx) and the round-26
// horizontal-card describe block below has something to find.
const RAISER: HelpStakeholder = {
  userId: "u-raiser",
  name: "Marta Bergman",
  email: "marta@bergman.example",
  imageUrl: null,
  origin: "raiser",
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
  // Defaults to STAKEHOLDER alone (no "raiser" origin) so the Raised-by tile
  // stays OFF for every test that doesn't opt in — the pre-existing "fact
  // list is gone" test below relies on "Raised by" not rendering at all.
  // Only the round-26 horizontal-card describe block overrides this.
  stakeholders: null as unknown as unknown[],
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
      helpStakeholders: async () => ({ stakeholders: api.stakeholders }),
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
  api.stakeholders = [STAKEHOLDER]
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

// SUPERSEDED FOUR TIMES, R89 "footer-on-the-edge" — see the earlier
// accounts kept in this file's own git history (the original "addition of
// the three of the right" grid, round 23's composer-pinned-outside-
// every-card construction, and round 24's h-full/overflow-y-auto-on-both-
// cells grid, replaced below).
//
// ROUND 27, 19 Sep 2026, THE SIDE COLUMN NEVER SCROLLS — Aurora, over the
// live page: "there should be no scrolling to see all right column items —
// expand the height!" / "scroll only on conversation when taller than
// right column." Round 24's grid (`h-full min-h-0` on the grid AND the
// side column, `overflow-y-auto` on the side column) forced the row to
// fill the whole scrolling region regardless of content, so a short ticket
// showed the side column scrolling in its own little box while the
// conversation card sat mostly empty beside it — backwards. Now: the grid
// itself carries NEITHER `h-full` NOR `min-h-0` (content-sized, like any
// ordinary block); the side column carries NEITHER `h-full` NOR
// `overflow-y-auto` (natural height, never scrolling — proof lives in
// `ticket-detail-body.tsx`'s own header); the conversation CELL carries
// `relative min-h-0`, no height class of its own — `items-stretch`
// resolves it to whatever the row resolved to (the side column's own
// height); and the conversation CARD is pulled out of flow
// (`fill="absolute"`, `position: absolute; inset: 0`) so it contributes
// ZERO intrinsic height to the row, the one piece that keeps a forty-
// message thread from dragging the whole row (and the side column with
// it) taller. `ticket-detail-body.tsx`'s own header carries the full
// account and the live proof numbers (`${SCRATCH}/row-proof.json`).
describe("at lg, the scroll region's own grid pairs the conversation with the side panels (R89 round 27)", () => {
  it("the grid and the side column are content-sized (no h-full/min-h-0/overflow-y-auto); the conversation cell is relative min-h-0, stretched by the grid to the side column's own height", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    const conversationAnchor = document.getElementById(TICKET_PANEL_ANCHOR.conversation) as HTMLElement
    const grid = conversationAnchor.parentElement as HTMLElement
    expect(grid.className).toContain("grid-cols-[2fr_1fr]")
    expect(grid.className).toContain("items-stretch")
    // ROUND 27 — an explicit-height grid with one `auto` row would let
    // `align-content`'s own default `stretch` hand that row the FULL
    // container height regardless of content, which is what forced the
    // side column's own internal scrollbar. The grid is content-sized now.
    expect(grid.className).not.toContain("h-full")
    expect(grid.className).not.toContain("min-h-0")

    // THE CONVERSATION CELL — no height class of its own; `relative` is
    // what lets its own Card resolve `inset-0` against ITS bounds once
    // `items-stretch` has sized the cell to the row.
    expect(conversationAnchor.className).toContain("relative")
    expect(conversationAnchor.className).toContain("min-h-0")
    expect(conversationAnchor.className).not.toContain("h-full")

    const scrollRegion = grid.parentElement as HTMLElement
    expect(scrollRegion.className).toContain("overflow-y-auto")
    expect(scrollRegion.className).toContain("flex-1")
    expect(scrollRegion.className).toContain("min-h-0")

    const ticketBodyRoot = scrollRegion.parentElement as HTMLElement
    expect(ticketBodyRoot.getAttribute("data-slot")).toBe("ticket-detail-body")
    expect(ticketBodyRoot.firstElementChild).toBe(scrollRegion)

    // THE SIDE PANELS SHARE THE SAME GRID, ONE CELL, NATURAL HEIGHT,
    // NEVER SCROLLING (round 27 — the whole point of this round).
    const storiesAnchor = document.getElementById(TICKET_PANEL_ANCHOR.stories) as HTMLElement
    const timeAnchor = document.getElementById(TICKET_PANEL_ANCHOR.time) as HTMLElement
    const stakeholdersAnchor = document.getElementById(TICKET_PANEL_ANCHOR.stakeholders) as HTMLElement
    const sideColumn = storiesAnchor.parentElement as HTMLElement
    expect(sideColumn.parentElement).toBe(grid)
    expect(timeAnchor.parentElement).toBe(sideColumn)
    expect(stakeholdersAnchor.parentElement).toBe(sideColumn)
    expect(sideColumn.className).toContain("flex-col")
    expect(sideColumn.className).toContain("gap-6")
    expect(sideColumn.className).not.toContain("h-full")
    expect(sideColumn.className).not.toContain("min-h-0")
    expect(sideColumn.className).not.toContain("overflow-y-auto")
  })

  it("the conversation card holds the composer again, as its own CardFooter, absolutely positioned to fill its cell — 'rewind here', by construction now", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    const conversationCard = (document.querySelector('[data-slot="ticket-thread"]') as HTMLElement).closest(
      '[data-slot="card"]'
    ) as HTMLElement
    const footer = conversationCard.querySelector('[data-slot="card-footer"]')
    expect(footer, "the composer's own CardFooter must nest inside the conversation card again").toBeTruthy()
    expect(conversationCard.lastElementChild).toBe(footer)
    // ROUND 27 — `fill="absolute"` at lg: taken out of flow so the CELL
    // (not the card) is what the grid stretches, and the card itself
    // contributes no intrinsic height back to the row.
    expect(conversationCard.className).toContain("absolute")
    expect(conversationCard.className).toContain("inset-0")
    expect(conversationCard.className).toContain("min-h-0")
    expect(conversationCard.className).not.toContain("h-full")
  })

  it("the composer form's own width equals the card's inner width, never the page's", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    const composerForm = document.querySelector('[data-slot="reply-composer"]') as HTMLElement
    expect(composerForm.className).toContain("w-full")
    const composerFooter = composerForm.parentElement!.parentElement as HTMLElement
    expect(composerFooter.getAttribute("data-slot")).toBe("card-footer")
    const conversationCard = composerFooter.parentElement as HTMLElement
    expect(conversationCard.getAttribute("data-slot")).toBe("card")
    // The composer's own CardFooter is NOT the ticket body's root any
    // more — that is the band's own place now (below).
    expect(conversationCard.contains(composerFooter)).toBe(true)
  })

  it("the band (Latest activity + Record) is the ticket body's own pinned last child, outside the grid and its scroll region entirely", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    const band = document.querySelector('[data-slot="ticket-footer-band"]') as HTMLElement
    expect(band, "the ticket body must render its own pinned band").toBeTruthy()
    const ticketBodyRoot = band.parentElement as HTMLElement
    expect(ticketBodyRoot.getAttribute("data-slot")).toBe("ticket-detail-body")
    expect(ticketBodyRoot.lastElementChild).toBe(band)
    // ROUND 26 — the panel gap above the band (R89), by token.
    expect(ticketBodyRoot.className).toContain("gap-6")
    expect(band.className).toContain("sticky")
    // NOT bottom-0 — see ticket-detail-body.tsx's own header: sticky's
    // offset anchors to the scrollport's PADDING edge, so bottom-0
    // measured a 24px gap live at lg; the negative, padding-compensated
    // offset is what actually reaches the pane's true bottom edge.
    expect(band.className).toContain("bottom-[calc(-1*var(--space-5))]")
    expect(band.className).toContain("lg:bottom-[calc(-1*var(--space-6))]")
    expect(band.className).toContain("flex-none")
    expect(band.className).toContain("w-full")
    // THE REAL FOOTER CARD (kit's own ink footer, CH27.8) lives inside it —
    // and nowhere else on the page (RecordScreen's own copy is switched off).
    expect(band.querySelectorAll('[data-record-region="footer"]').length).toBe(1)
    expect(document.querySelectorAll('[data-record-region="footer"]').length).toBe(1)
  })
})

// CLIENT RULING, 19 Sep 2026, VERBATIM: "for stakeholder, raised by, use a
// horizontal card (avatar on the left, raised by + name on the right one on
// top of the other)." Supersedes the 18 Sep "keep Raised by as one tile"
// VERTICAL shape — see help-stakeholders.tsx's own header for the full
// account. `help-stakeholders.test.tsx` proves the component in isolation;
// this describe block proves it renders horizontally on the real page too.
describe("the raised-by tile is a horizontal card (19 Sep 2026 ruling)", () => {
  it("draws the raiser's face on the left, 'Raised by' over the name on the right", async () => {
    api.stakeholders = [STAKEHOLDER, RAISER]
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    const chipEl = await screen.findByText("Raised by")
    // `PersonCard`'s own horizontal branch (shared/web/person-card.tsx) wraps
    // chip+title in a column marked `items-start` — the vertical/band branch
    // this tile drew until 19 Sep marks the same column `items-center`
    // instead, so this is the one class that tells the two shapes apart.
    const column = chipEl.parentElement as HTMLElement
    expect(column.className).toContain("items-start")
    expect(column.className).not.toContain("items-center")
    // Scoped to the column itself — "Marta Bergman" also appears as the
    // thread's own message-sender name, elsewhere on the page.
    const nameEl = within(column).getByText("Marta Bergman")
    expect(column.contains(nameEl), "the name sits under the chip, in the same column").toBe(true)
    // Chip above name, top line over bottom line.
    const children = Array.from(column.children)
    const chipIndex = children.indexOf(chipEl)
    const nameIndex = children.findIndex((c) => c.contains(nameEl))
    expect(chipIndex).toBeGreaterThan(-1)
    expect(nameIndex).toBeGreaterThan(-1)
    expect(chipIndex).toBeLessThan(nameIndex)
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
