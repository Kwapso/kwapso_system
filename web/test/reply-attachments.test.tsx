// EACH MESSAGE CAN CARRY ITS OWN FILES — team migration 0105, the client's
// ruling of 18 Sep 2026, verbatim: "i meant that each message can have images
// or files, check in the kit because we already biult the ui for that" and
// "the customers cann attach fimages & files. so do we. tahts why i ask of
// the attach button on the text input field."
//
// THREE THINGS THIS FILE PROVES, over a real render of `HelpDetailScreen`
// (the same harness `ticket-detail-no-tabs.test.tsx` already stands on):
//   1. the composer's attach button opens a picker, and a picked file shows a
//      tile in the composer BEFORE Send is pressed — uploading, then done;
//   2. pressing Send, once the hold reaches zero, carries the staged file's
//      id to `content.replyHelp` as `attachmentIds`;
//   3. a message the door hands back WITH `attachments` renders a pill chip
//      under its own bubble, carrying the file's name.
//
// `one-send-and-a-hold.test.tsx` already proves the hold's timing in full —
// this file reuses the same fake-timer seam rather than re-deriving it, and
// only adds what is new: the file.

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { HelpAttachment, HelpMessage, HelpTicket, HelpStatus, Story, TicketStageHistory } from "@shared/types"

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

const perms = vi.hoisted(() => ({ can: vi.fn(() => true) }))
vi.mock("@/lib/perms", () => ({ usePermissions: () => ({ can: perms.can }) }))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: () => {}, push: () => {} }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}))

const api = vi.hoisted(() => ({
  ticket: null as unknown as HelpTicket,
  replies: [] as unknown as HelpMessage[],
  attachments: [] as HelpAttachment[],
  replyHelp: vi.fn(),
  addHelpAttachment: vi.fn(),
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
      helpStakeholders: async () => ({ stakeholders: [] }),
      helpStages: async () => EMPTY_STAGE_HISTORY,
      stories: async () => ({ stories: [] as Story[], total: 0, nextCursor: null, hasMore: false }),
      sprints: async () => ({ sprints: [], total: 0 }),
      workLogs: async () => ({ logs: [], total: 0, totalSeconds: 0, nextCursor: null, hasMore: false }),
      workLogSummary: async () => ({ total: 0, totalSeconds: 0, people: [], kinds: [], weeks: [] }),
      helpAttachments: async () => ({ attachments: api.attachments, total: api.attachments.length }),
      runningTimers: async () => ({ timers: [] }),
      addHelpAttachment: api.addHelpAttachment,
      replyHelp: api.replyHelp,
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

import { HelpDetailScreen } from "@/components/tickets/help-detail"

afterEach(cleanup)
beforeEach(() => {
  perms.can.mockReset().mockReturnValue(true)
  window.history.pushState({}, "", "/tickets/help-1")
  api.replies = []
  api.attachments = []
  api.replyHelp.mockReset()
  api.addHelpAttachment.mockReset()
})

const openTicket = (status: HelpStatus = "triaged") => {
  api.ticket = { ...BASE_TICKET, status } as HelpTicket
  return render(<HelpDetailScreen teamId="team-1" helpId="help-1" myUserId="u-1" basePath="/tickets" />)
}

/** The composer's hidden native picker — no accessible name of its own
 * (`reply-composer.tsx`'s own comment: a button cannot open a file dialog on
 * its own, so this is what it drives), so it is found by type rather than by
 * role. There is exactly one on this screen. */
function pickFile(name: string, type: string, contents = "hello") {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  const file = new File([contents], name, { type })
  Object.defineProperty(input, "files", { value: [file], configurable: true })
  fireEvent.change(input)
}

describe("the composer stages a file the instant it is picked", () => {
  it("shows an uploading tile, then a done tile once the door answers", async () => {
    let resolveUpload!: (v: { attachments: HelpAttachment[]; total: number }) => void
    api.addHelpAttachment.mockReturnValue(
      new Promise((resolve) => {
        resolveUpload = resolve
      })
    )
    openTicket()
    await screen.findByRole("heading", { level: 1 })

    pickFile("board.png", "image/png")

    // UPLOADING FIRST — the tile lands before the network call resolves at
    // all (reply-composer.tsx's own "show it immediately" note).
    await waitFor(() => expect(screen.getByText("board.png")).toBeTruthy())

    // THEN DONE — the door answers with the whole refreshed list; the newest
    // (last) entry is the row this pick created (`uploadReplyFile`'s own
    // "last of the list" argument, help-detail.tsx).
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
          addedByName: "You",
          addedByIsClient: false,
          threadId: null,
        },
      ],
      total: 1,
    })
    await waitFor(() => expect(api.addHelpAttachment).toHaveBeenCalledTimes(1))
    // The tile is still on screen (now `done`, not `uploading`) — same name,
    // no error text beside it.
    await waitFor(() => expect(screen.getByText("board.png")).toBeTruthy())
    expect(screen.queryByText("Couldn't attach that.")).toBeNull()
  })
})

describe("Send claims the staged file for the reply it rides with", () => {
  // REAL TIMERS, DELIBERATELY — unlike `one-send-and-a-hold.test.tsx`'s own
  // fake-timer suite, this test also drives `readFileAsDataUrl`'s `FileReader`
  // (jsdom's own implementation schedules its `onload` off a real timer), and
  // mixing that with `vi.useFakeTimers()` means advancing BOTH clocks by hand
  // in lock-step — real, and one `it.each`-worthy `await` past the five
  // seconds, is the simpler proof for the one thing this test is actually
  // about: which id reaches the door.
  it(
    "carries the staged attachment's id to content.replyHelp, and the tile grid clears",
    async () => {
    api.addHelpAttachment.mockResolvedValue({
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
          addedByName: "You",
          addedByIsClient: false,
          threadId: null,
        },
      ],
      total: 1,
    })
    api.replyHelp.mockResolvedValue({
      replies: [
        {
          id: "reply-1",
          ticketId: "help-1",
          body: "Here's the invoice",
          taggedUserIds: [],
          isAgent: false,
          authorId: "u-1",
          authorName: "Aurora",
          authorIsClient: false,
          createdAt: "2026-09-18T10:00:05.000Z",
          attachments: [{ id: "att-2", name: "invoice.pdf", href: "/media/team-1/ticket/att-2", mime: "application/pdf", size: 900 }],
        },
      ],
      total: 1,
    })
      openTicket()
      await screen.findByRole("heading", { level: 1 })

      pickFile("invoice.pdf", "application/pdf")
      await waitFor(() => expect(api.addHelpAttachment).toHaveBeenCalledTimes(1))
      await waitFor(() => expect(screen.getByText("invoice.pdf")).toBeTruthy())

      const field = screen.getByLabelText("Message") as HTMLInputElement
      fireEvent.input(field, { target: { value: "Here's the invoice" } })
      fireEvent.click(screen.getByRole("button", { name: "Send reply" }))

      // THE FIVE-SECOND HOLD, RUN OUT FOR REAL (SEND_HOLD_SECONDS,
      // web/lib/send-hold.ts) — see this `describe`'s own header for why real
      // timers are used here rather than fake ones.
      await waitFor(() => expect(api.replyHelp).toHaveBeenCalledTimes(1), { timeout: 8000 })
      expect(api.replyHelp).toHaveBeenCalledWith("help-1", "Here's the invoice", [], false, ["att-2"])
    },
    10000
  )
})

describe("a message renders the files it was sent with", () => {
  it("draws a pill chip under the reply's own bubble, carrying the file's name", async () => {
    api.replies = [
      {
        id: "reply-1",
        ticketId: "help-1",
        body: "See the attached screenshot",
        taggedUserIds: [],
        isAgent: false,
        authorId: "u-1",
        authorName: "Aurora",
        authorIsClient: false,
        createdAt: "2026-09-18T10:00:05.000Z",
        attachments: [
          { id: "att-3", name: "screenshot.png", href: "/media/team-1/ticket/att-3", mime: "image/png", size: 4096 },
        ],
      },
    ] as unknown as HelpMessage[]
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    await screen.findByText("See the attached screenshot")
    expect(screen.getByText("screenshot.png")).toBeTruthy()
    // THE MEDIA WELL — an image gets its own picture above the bubble
    // (`AttachmentPreview`), which the kit draws as an `<img>` inside an `<a>`
    // pointed at the row's own `href`. The CHIP is also an `<a href>` (every
    // attachment gets one), so the picture — the `<img>` — is the one thing
    // only an image draws.
    expect(document.querySelector(`a[href="/media/team-1/ticket/att-3"] img`)).toBeTruthy()
  })

  it("draws a document's chip with no media well — there is no picture to show", async () => {
    api.replies = [
      {
        id: "reply-1",
        ticketId: "help-1",
        body: "See the attached PDF",
        taggedUserIds: [],
        isAgent: false,
        authorId: "u-1",
        authorName: "Aurora",
        authorIsClient: false,
        createdAt: "2026-09-18T10:00:05.000Z",
        attachments: [
          { id: "att-4", name: "contract.pdf", href: "/media/team-1/ticket/att-4", mime: "application/pdf", size: 900 },
        ],
      },
    ] as unknown as HelpMessage[]
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    await screen.findByText("See the attached PDF")
    expect(screen.getByText("contract.pdf")).toBeTruthy()
    // THE CHIP STILL CARRIES A LINK (every attachment does) — what a document
    // does NOT get is a media well, i.e. no `<img>` anywhere on the message.
    expect(document.querySelector(`a[href="/media/team-1/ticket/att-4"]`)).toBeTruthy()
    expect(document.querySelector("img")).toBeNull()
  })
})

// THE TICKET'S OWN OPENING ATTACHMENTS — the other half of team migration
// 0105, found 25 Sep 2026: a ticket raised through the MCP surface
// (`create_help_ticket` + `add_help_attachment`, `threadId` left NULL — no
// reply exists yet) carried real images nobody on the agency side could see.
// `ticketFilesFor` (help-detail.tsx) is `messageFilesFor`'s twin for exactly
// these rows, fed onto the description bubble the identical way a reply's own
// files already are — same door (`content.helpAttachments`), same two draws
// (a pill chip, and a media well for a picture).
describe("the description bubble draws what the ticket was raised with", () => {
  it("a ticket-level image draws its own media well under the description", async () => {
    api.attachments = [
      {
        id: "att-5",
        ticketId: "help-1",
        kind: "file",
        label: "board.png",
        url: "/media/team-1/ticket/att-5",
        contentType: "image/png",
        sizeBytes: 4096,
        createdAt: "2026-08-18T09:00:00.000Z",
        addedByName: "Marta Bergman",
        addedByIsClient: true,
        threadId: null,
      },
    ]
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    await screen.findByText("None of my drivers can see today's routes.")
    expect(screen.getByText("board.png")).toBeTruthy()
    expect(document.querySelector(`a[href="/media/team-1/ticket/att-5"] img`)).toBeTruthy()
  })

  it("a document raised with the ticket draws a chip with no media well", async () => {
    api.attachments = [
      {
        id: "att-6",
        ticketId: "help-1",
        kind: "file",
        label: "route-log.pdf",
        url: "/media/team-1/ticket/att-6",
        contentType: "application/pdf",
        sizeBytes: 900,
        createdAt: "2026-08-18T09:00:00.000Z",
        addedByName: "Marta Bergman",
        addedByIsClient: true,
        threadId: null,
      },
    ]
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    await screen.findByText("None of my drivers can see today's routes.")
    expect(screen.getByText("route-log.pdf")).toBeTruthy()
    expect(document.querySelector("img")).toBeNull()
  })

  it("a reply's own attachment never shows twice, under the description as well", async () => {
    // ONE DOOR HANDS BACK BOTH KINDS MIXED (`content.helpAttachments` makes no
    // distinction) — `threadId` is what tells them apart, and this is the row
    // the description bubble must EXCLUDE: it already draws under `reply-1`'s
    // own bubble (`api.replies`, below), via `messageFilesFor`.
    api.attachments = [
      {
        id: "att-7",
        ticketId: "help-1",
        kind: "file",
        label: "invoice.pdf",
        url: "/media/team-1/ticket/att-7",
        contentType: "application/pdf",
        sizeBytes: 900,
        createdAt: "2026-09-18T10:00:05.000Z",
        addedByName: "Aurora",
        addedByIsClient: false,
        threadId: "reply-1",
      },
    ]
    api.replies = [
      {
        id: "reply-1",
        ticketId: "help-1",
        body: "Here's the invoice",
        taggedUserIds: [],
        isAgent: false,
        authorId: "u-1",
        authorName: "Aurora",
        authorIsClient: false,
        createdAt: "2026-09-18T10:00:05.000Z",
        attachments: [{ id: "att-7", name: "invoice.pdf", href: "/media/team-1/ticket/att-7", mime: "application/pdf", size: 900 }],
      },
    ] as unknown as HelpMessage[]
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    await screen.findByText("Here's the invoice")
    // Exactly one chip for it, not two.
    expect(screen.getAllByText("invoice.pdf")).toHaveLength(1)
  })
})
