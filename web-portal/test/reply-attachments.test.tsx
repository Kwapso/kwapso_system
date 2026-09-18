// THE CUSTOMER'S OWN SIDE OF TEAM MIGRATION 0105 — the client's ruling, 18
// Sep 2026, verbatim: "the customers cann attach fimages & files. so do we.
// tahts why i ask of the attach button on the text input field." The agency
// twin of this file is `web/test/reply-attachments.test.tsx`; this one proves
// the SAME three things over the portal's own `TicketScreen`:
//   1. the composer's attach button stages a picked file as a tile;
//   2. Reply carries the staged file's id to `support.reply` as
//      `attachmentIds`;
//   3. a message the door hands back WITH `attachments` renders a pill chip.
//
// The portal composer has no five-second hold (`ticket-screen.tsx`'s own
// plain `send()`), so there is no fake-timer seam to stand on here at all —
// every wait below is a real `waitFor`.

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { HelpAttachment, HelpMessage, HelpTicket } from "@shared/types"

const BASE_TICKET = {
  id: "help-1",
  ref: "BERG-T0412",
  status: "triaged",
  description: "<p>None of my drivers can see today's routes.</p>",
  createdAt: "2026-08-18T09:00:00.000Z",
} as unknown as HelpTicket

const api = vi.hoisted(() => ({
  replies: [] as unknown as HelpMessage[],
  reply: vi.fn(),
  attach: vi.fn(),
}))

vi.mock("@/lib/api", () => ({
  ApiFailure: class ApiFailure extends Error {},
  support: {
    tickets: async () => ({ tickets: [BASE_TICKET], total: 1, mineTotal: 1, nextCursor: null, hasMore: false }),
    ticket: async () => BASE_TICKET,
    thread: async () => ({ replies: api.replies, total: api.replies.length }),
    reply: api.reply,
    attachments: async () => ({ attachments: [], total: 0 }),
    attach: api.attach,
    detach: async () => ({ attachments: [], total: 0 }),
    rating: async () => ({ ratings: [], mine: null }),
  },
}))

vi.mock("@shared/ui/components/sonner/sonner", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/ui/components/sonner/sonner")>()
  return { ...actual }
})

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
  api.replies = []
  api.reply.mockReset()
  api.attach.mockReset()
})

const openTicket = () => render(<TicketScreen ready={READY} ticketId="help-1" />)

/** The COMPOSER'S OWN hidden native picker — same shape the agency's own
 * `reply-composer.tsx` uses, no accessible name of its own. Scoped to the
 * Reply field's own `Card`: `TicketAttachments` (the ticket-level Files and
 * links panel, above the conversation) mounts a hidden file input of its
 * own too, and a bare `input[type="file"]` query would find that one first. */
function pickFile(name: string, type: string, contents = "hello") {
  const composerCard = screen.getByLabelText("Reply").closest('[data-slot="card"]') as HTMLElement
  const input = composerCard.querySelector('input[type="file"]') as HTMLInputElement
  const file = new File([contents], name, { type })
  Object.defineProperty(input, "files", { value: [file], configurable: true })
  fireEvent.change(input)
}

describe("the portal composer stages a file the instant it is picked", () => {
  it("shows an uploading tile, then a done tile once the door answers", async () => {
    let resolveUpload!: (v: { attachments: HelpAttachment[]; total: number }) => void
    api.attach.mockReturnValue(
      new Promise((resolve) => {
        resolveUpload = resolve
      })
    )
    openTicket()
    await screen.findByText("None of my drivers can see today's routes.")

    pickFile("board.png", "image/png")
    await waitFor(() => expect(screen.getByText("board.png")).toBeTruthy())

    resolveUpload({
      attachments: [
        {
          id: "att-1",
          ticketId: "help-1",
          kind: "file",
          label: "board.png",
          url: "/media/team-1/ticket/att-1",
          contentType: "image/png",
          sizeBytes: 5,
          createdAt: "2026-09-18T10:00:00.000Z",
          addedByName: "Marta",
          addedByIsClient: true,
        },
      ],
      total: 1,
    })
    await waitFor(() => expect(api.attach).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.getByText("board.png")).toBeTruthy())
  })
})

describe("Reply claims the staged file", () => {
  it(
    "carries the staged attachment's id to support.reply",
    async () => {
      api.attach.mockResolvedValue({
        attachments: [
          {
            id: "att-2",
            ticketId: "help-1",
            kind: "file",
            label: "invoice.pdf",
            url: "/media/team-1/ticket/att-2",
            contentType: "application/pdf",
            sizeBytes: 900,
            createdAt: "2026-09-18T10:00:00.000Z",
            addedByName: "Marta",
            addedByIsClient: true,
          },
        ],
        total: 1,
      })
      api.reply.mockResolvedValue({
        replies: [
          {
            id: "reply-1",
            ticketId: "help-1",
            body: "Here's the invoice",
            taggedUserIds: [],
            isAgent: false,
            authorId: "u-1",
            authorName: "Marta",
            authorIsClient: true,
            createdAt: "2026-09-18T10:00:05.000Z",
            attachments: [
              { id: "att-2", name: "invoice.pdf", href: "/media/team-1/ticket/att-2", mime: "application/pdf", size: 900 },
            ],
          },
        ],
        total: 1,
      })
      openTicket()
      await screen.findByText("None of my drivers can see today's routes.")

      pickFile("invoice.pdf", "application/pdf")
      await waitFor(() => expect(api.attach).toHaveBeenCalledTimes(1))
      await waitFor(() => expect(screen.getByText("invoice.pdf")).toBeTruthy())

      const field = screen.getByLabelText("Reply") as HTMLTextAreaElement
      fireEvent.input(field, { target: { value: "Here's the invoice" } })
      fireEvent.click(screen.getByRole("button", { name: "Reply" }))

      await waitFor(() => expect(api.reply).toHaveBeenCalledTimes(1))
      expect(api.reply).toHaveBeenCalledWith("help-1", "Here's the invoice", ["att-2"])
    },
    10000
  )
})

describe("a portal message renders the files it was sent with", () => {
  it("draws a pill chip under the reply's own bubble, carrying the file's name", async () => {
    api.replies = [
      {
        id: "reply-1",
        ticketId: "help-1",
        body: "See the attached screenshot",
        taggedUserIds: [],
        isAgent: false,
        authorId: "u-1",
        authorName: "Marta",
        authorIsClient: true,
        createdAt: "2026-09-18T10:00:05.000Z",
        attachments: [
          { id: "att-3", name: "screenshot.png", href: "/media/team-1/ticket/att-3", mime: "image/png", size: 4096 },
        ],
      },
    ] as unknown as HelpMessage[]
    openTicket()
    await screen.findByText("See the attached screenshot")
    expect(screen.getByText("screenshot.png")).toBeTruthy()
    expect(document.querySelector(`a[href="/media/team-1/ticket/att-3"] img`)).toBeTruthy()
  })
})
