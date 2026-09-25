// THE EDIT DIALOG SHOWS WHAT THE TICKET ALREADY CARRIES — the other half of
// the 25 Sep 2026 report ("even when I open up the edit screen, I can't see
// any image attachments"). `help-form-dialog.tsx` only ever ADDED files
// (`pending`), so reopening it on a ticket that already had one described the
// ticket as having none — the identical bug `story-form-dialog.tsx` already
// fixed for stories, mirrored here through the same `storedFileToUploadItem`/
// `attachedQ` shape.
//
// THIS FILE PROVES:
//   1. a ticket-level attachment (`threadId: null`) shows as a tile the
//      moment the edit dialog opens, with no pick required;
//   2. a reply's own attachment (`threadId` set) does NOT show here — this
//      dialog edits the TICKET, not one message, and drawing it here too
//      would let it be taken off from the wrong place.

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { HelpAttachment } from "@shared/types"

const api = vi.hoisted(() => ({
  attachments: [] as HelpAttachment[],
}))

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return {
    ...actual,
    tenancy: {
      ...actual.tenancy,
      apps: async () => ({ apps: [], total: 0 }),
      appModules: async () => ({ modules: [] }),
      accountDetail: async () => ({ account: { id: "team-1", name: "Test Team" }, links: [] }),
    },
    content: {
      ...actual.content,
      sprints: async () => ({ sprints: [], total: 0 }),
      helpAttachments: async () => ({ attachments: api.attachments, total: api.attachments.length }),
    },
  }
})

vi.mock("@shared/ui/components/sonner/sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}))

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

import { HelpFormDialog } from "@/components/tickets/help-form-dialog"

afterEach(cleanup)

const EDIT_INITIAL = {
  titleEn: "The dispatch board will not load",
  description: "<p>None of my drivers can see today's routes.</p>",
  helpType: "Bug",
  accountId: null,
  appId: null,
  moduleId: null,
  raisedByContactId: null,
}

describe("the edit dialog draws what the ticket already carries", () => {
  it("shows a ticket-level image as a tile, unprompted", async () => {
    api.attachments = [
      {
        id: "att-1",
        ticketId: "help-1",
        kind: "file",
        label: "board.png",
        url: "/media/team-1/ticket/att-1",
        contentType: "image/png",
        sizeBytes: 4096,
        createdAt: "2026-08-18T09:00:00.000Z",
        addedByName: "Marta Bergman",
        addedByIsClient: true,
        threadId: null,
      },
    ]
    render(
      <HelpFormDialog
        open
        onOpenChange={() => {}}
        onSubmit={vi.fn(async () => {})}
        helpTypeOptions={["Bug"]}
        teamId="team-1"
        initial={EDIT_INITIAL}
        helpId="help-1"
      />
    )
    expect(await screen.findByText("board.png")).toBeTruthy()
  })

  it("never shows a reply's own attachment — that message's to draw, not this dialog's", async () => {
    api.attachments = [
      {
        id: "att-2",
        ticketId: "help-1",
        kind: "file",
        label: "invoice.pdf",
        url: "/media/team-1/ticket/att-2",
        contentType: "application/pdf",
        sizeBytes: 900,
        createdAt: "2026-09-18T10:00:05.000Z",
        addedByName: "Aurora",
        addedByIsClient: false,
        threadId: "reply-1",
      },
    ]
    render(
      <HelpFormDialog
        open
        onOpenChange={() => {}}
        onSubmit={vi.fn(async () => {})}
        helpTypeOptions={["Bug"]}
        teamId="team-1"
        initial={EDIT_INITIAL}
        helpId="help-1"
      />
    )
    // Give the (mocked) read a turn to resolve before asserting an absence.
    await new Promise((r) => setTimeout(r, 0))
    expect(screen.queryByText("invoice.pdf")).toBeNull()
  })

  it("draws nothing extra on a CREATE — there is no ticket yet to read attachments off", () => {
    render(
      <HelpFormDialog
        open
        onOpenChange={() => {}}
        onSubmit={vi.fn(async () => {})}
        helpTypeOptions={["Bug"]}
        teamId="team-1"
      />
    )
    expect(screen.queryByText("board.png")).toBeNull()
  })
})
