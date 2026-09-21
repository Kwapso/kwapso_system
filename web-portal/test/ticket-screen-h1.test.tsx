// THE PORTAL TICKET SCREEN'S ONE H1 — finding, 21 Sep 2026: the page had no
// `<h1>` at all, and the ticket's own subject was never drawn anywhere; the
// biggest thing on the page ("Files and links", `ticket-attachments.tsx`'s
// own `CollectionHeading level="section"`) read at the SAME `text-sm` as
// everything else. Fixed by drawing `ticketTitle(ticket)`
// (`shared/web/ticket-chips.tsx`, the one function that answers "what is
// this ticket called" everywhere else in the app) as the page's own `<h1>`,
// at the portal's screen-title register — the same `Headline` primitive
// `collection-heading.tsx`'s `level="screen"` draws, capped to the `h2`
// step (32px) per the client's standing typography ruling
// (`shared/web/record-heading.tsx`'s own header carries the full account).
//
// This proves the real component renders exactly one h1, that it carries
// the ticket's title when one exists, that it falls back to the
// description (`ticketTitle`'s own last-resort branch) when it does not,
// and that the reference/status chips still render ahead of it in the DOM.

import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { HelpTicket } from "@shared/types"

const { TITLED_TICKET, UNTITLED_TICKET, api } = vi.hoisted(() => {
  const titled = {
    id: "help-1",
    ref: "BERG-T0412",
    status: "triaged",
    titleEn: "Drivers can't see today's routes",
    titleDe: null,
    description: "<p>None of my drivers can see today's routes since the update.</p>",
    createdAt: "2026-08-18T09:00:00.000Z",
  } as unknown as HelpTicket
  const untitled = {
    id: "help-2",
    ref: "BERG-T0413",
    status: "new",
    titleEn: null,
    titleDe: null,
    description: "<p>The export button on the reports page does nothing when I click it twice quickly.</p>",
    createdAt: "2026-08-19T09:00:00.000Z",
  } as unknown as HelpTicket
  return { TITLED_TICKET: titled, UNTITLED_TICKET: untitled, api: { ticket: titled } }
})

vi.mock("@/lib/api", () => ({
  ApiFailure: class ApiFailure extends Error {},
  support: {
    tickets: async () => ({ tickets: [api.ticket], total: 1, mineTotal: 1, nextCursor: null, hasMore: false }),
    ticket: async () => api.ticket,
    thread: async () => ({ replies: [], total: 0 }),
    attachments: async () => ({ attachments: [], total: 0 }),
    attach: async () => ({ attachments: [], total: 0 }),
    detach: async () => ({ attachments: [], total: 0 }),
    rating: async () => ({ ratings: [], mine: null }),
  },
}))

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

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

import { TicketScreen } from "@/components/ticket-screen"
import type { PortalReady } from "@/components/portal-shell"

const READY: PortalReady = {
  state: "ready",
  user: {
    id: "u-1",
    email: "marta@bergman.example",
    firstName: "Marta",
    lastName: "Bergman",
    imageUrl: null,
    onboardingComplete: true,
    currentTeamId: "team-1",
  },
  teamId: "team-1",
  accounts: [{ id: "acct-bergman", name: "Bergman S.A." }],
  currentAccountId: "acct-bergman",
} as unknown as PortalReady

afterEach(cleanup)
beforeEach(() => {
  api.ticket = TITLED_TICKET
})

describe("the portal ticket screen draws exactly one h1, carrying the ticket's subject", () => {
  it("a titled ticket's h1 is titleEn, not the description", async () => {
    render(<TicketScreen ready={READY} ticketId="help-1" />)
    const heading = await screen.findByRole("heading", { level: 1 })
    expect(heading.textContent).toBe("Drivers can't see today's routes")

    // Exactly one h1 on the whole screen.
    expect(screen.getAllByRole("heading", { level: 1 }).length).toBe(1)

    // The description still renders, in full, below it — ticketTitle's own
    // contract never hides the body once a real title exists.
    await screen.findByText(/None of my drivers can see today's routes since the update\./)
  })

  it("an untitled ticket's h1 falls back to ticketTitle's own last resort (the description, plain)", async () => {
    api.ticket = UNTITLED_TICKET
    render(<TicketScreen ready={READY} ticketId="help-2" />)
    const heading = await screen.findByRole("heading", { level: 1 })
    expect(heading.textContent).toContain("The export button on the reports page")
    expect(screen.getAllByRole("heading", { level: 1 }).length).toBe(1)
  })

  it("the reference and status chips render ahead of the h1 in the request card (R94)", async () => {
    render(<TicketScreen ready={READY} ticketId="help-1" />)
    const heading = await screen.findByRole("heading", { level: 1 })
    const card = heading.closest('[data-slot="card"]') as HTMLElement
    expect(card, "the h1 must sit inside the request card").toBeTruthy()

    const cardText = within(card).getByText("BERG-T0412")
    const refPosition = cardText.compareDocumentPosition(heading)
    // Node.DOCUMENT_POSITION_FOLLOWING (4): the id chip comes BEFORE the h1.
    expect(refPosition & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    const statusChip = within(card).getByText("Looked at")
    const statusPosition = statusChip.compareDocumentPosition(heading)
    expect(statusPosition & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
