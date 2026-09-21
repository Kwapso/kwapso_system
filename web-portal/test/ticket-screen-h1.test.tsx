// THE PORTAL TICKET SCREEN'S ONE H1 — finding, 21 Sep 2026: the page had no
// `<h1>` at all, and the ticket's own subject was never drawn anywhere; the
// biggest thing on the page ("Files and links", `ticket-attachments.tsx`'s
// own `CollectionHeading level="section"`) read at the SAME `text-sm` as
// everything else. Fixed by drawing `ticketTitle(ticket)`
// (`shared/web/ticket-chips.tsx`, the one function that answers "what is
// this ticket called" everywhere else in the app) as the page's own `<h1>`,
// at the portal's screen-title register — the same `Headline` primitive
// `collection-heading.tsx`'s `level="screen"` draws, `size="h2"` per the
// client's standing typography ruling
// (`shared/web/record-heading.tsx`'s own header carries the full account).
//
// `size="h2"` DOES NOT COMPUTE TO 32px IN THE PORTAL — second finding, same
// day, live measurement on staging: 36px at 1440, 34px at 760. Every kit
// type step is `rem`, and the portal's own `:root` deliberately runs its
// font-size at 17px/18px (`web-portal/app/globals.css`, "Reading size") for
// every OTHER screen's comfort — which multiplies `--text-3xl` (2rem)
// straight past 32 (2 × 18 = 36, 2 × 17 = 34) and does the same to every
// other rung on the ladder, so no step of it lands on 32 at either width.
// This one title has to opt OUT of that bump and hold the literal 32px the
// standing ruling means everywhere else, so `ticket-screen.tsx` pins
// `text-[32px]` on the `<Headline>` — a real pixel value, immune to
// `:root`'s font-size the way `rem` is not — restating the h2 step's own
// line-height/letter-spacing from `--text-3xl--line-height`/
// `--text-3xl--letter-spacing` rather than dropping them (`text-3xl` sets
// all three together; `typography.tsx`'s own comment names the trap of
// overriding only the size). This suite pins that exact class so the
// override cannot silently drift back to a bare `size="h2"`.
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

  it("the h1 pins a literal 32px, immune to the portal's own root font-size bump (finding, 21 Sep 2026)", async () => {
    render(<TicketScreen ready={READY} ticketId="help-1" />)
    const heading = await screen.findByRole("heading", { level: 1 })

    // The literal pixel override — not `text-3xl`/`text-[length:var(--text-3xl)]`,
    // which resolve against `:root`'s font-size and land on 36px/34px in the
    // portal (17px/18px root × the h2 step's 2rem), never 32.
    expect(heading.className, "the h1 must pin a literal 32px").toMatch(/\btext-\[32px\]/)
    // A PLAIN CLASS-NAME MATCH, NOT `\btext-3xl\b` — that regex also matches
    // inside the token REFERENCE this override restates on purpose
    // (`--text-3xl--line-height`), because `\b` sits on the `-` either side
    // of "3xl" there too. Splitting on whitespace first and checking a
    // class list for the exact token is what the codebase's own class
    // assertions elsewhere in this suite already do (`.toContain`).
    expect(
      heading.className.split(/\s+/),
      "the bare h2 rem step must not still be the class that decides this heading's size"
    ).not.toContain("text-3xl")

    // The h2 step's own line-height and letter-spacing, restated from the
    // SAME tokens `text-3xl` itself resolves — not a second, hand-guessed
    // pair, and not silently dropped by overriding only the size.
    expect(heading.className).toMatch(/\bleading-\[var\(--text-3xl--line-height\)\]/)
    expect(heading.className).toMatch(/\btracking-\[var\(--text-3xl--letter-spacing\)\]/)
  })
})
