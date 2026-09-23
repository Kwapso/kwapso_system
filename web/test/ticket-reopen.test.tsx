// T3819 — REOPEN. The client's decision: visible to an agency caller with
// `help:update`, resolved tickets only, an AlertDialog confirm, and it sets
// the ticket back to `in_progress` through the same status door every other
// move on this module uses. Lives in the record's own "⋯" menu (`overflow`,
// help-detail.tsx), the same menu Archive/Translate already sit in — this
// file drives a real render and reads the menu back, the same discipline
// `ticket-close-moved-to-top.test.tsx` states for the SAME menu's own Archive
// item: a comment can say the right thing beside a prop that does the wrong
// one, and only a render that reads the control back catches that.

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { HelpMessage, HelpTicket, HelpStatus } from "@shared/types"

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
  raisedByContactName: null,
  raiserName: "Marta Bergman",
  sourceScreen: null,
  resolvedAt: "2026-09-20T10:00:00.000Z",
  draftResolution: null,
  createdAt: "2026-08-18T09:00:00.000Z",
  updatedAt: null,
  editorName: null,
} as unknown as HelpTicket

const message = (id: string, authorIsClient: boolean): HelpMessage => ({
  id,
  ticketId: "help-1",
  body: `<p>message ${id}</p>`,
  taggedUserIds: [],
  isAgent: false,
  authorId: authorIsClient ? "contact-1" : "staff-1",
  authorName: authorIsClient ? "Marta Bergman" : "Aurora",
  authorIsClient,
  createdAt: "2026-09-16T10:00:00.000Z",
})

const perms = vi.hoisted(() => ({ can: vi.fn(() => true) }))
vi.mock("@/lib/perms", () => ({ usePermissions: () => ({ can: perms.can }) }))

const api = vi.hoisted(() => ({
  ticket: null as unknown as HelpTicket,
  replies: [] as HelpMessage[],
  setStatusCalls: [] as { id: string; status: string }[],
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
      stories: async () => ({ stories: [], total: 0, nextCursor: null, hasMore: false }),
      sprints: async () => ({ sprints: [], total: 0 }),
      workLogs: async () => ({ logs: [], total: 0, totalSeconds: 0, nextCursor: null, hasMore: false }),
      workLogSummary: async () => ({ total: 0, totalSeconds: 0, people: [], kinds: [], weeks: [] }),
      helpAttachments: async () => ({ attachments: [], total: 0 }),
      runningTimers: async () => ({ timers: [] }),
      setHelpStatus: async (id: string, status: string) => {
        api.setStatusCalls.push({ id, status })
        return { tickets: [{ ...api.ticket, status }] }
      },
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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: () => {}, push: () => {} }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock("@shared/ui/components/sonner/sonner", () => ({
  toast: { success: () => {}, error: () => {}, info: () => {} },
  Toaster: () => null,
}))

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

import { HelpDetailScreen } from "@/components/tickets/help-detail"
import { clearCache } from "@shared/web/store"

afterEach(cleanup)
beforeEach(() => {
  clearCache()
  perms.can.mockReset().mockReturnValue(true)
  api.replies = []
  api.setStatusCalls = []
})

const openTicket = (status: HelpStatus, replies: HelpMessage[] = []) => {
  api.ticket = { ...BASE_TICKET, status } as HelpTicket
  api.replies = replies
  return render(<HelpDetailScreen teamId="team-1" helpId="help-1" myUserId="u-1" basePath="/tickets" />)
}

/** Open the "⋯" menu and return it, role="menu". Same choreography
 * `ticket-close-moved-to-top.test.tsx` uses for the same trigger. */
async function openOverflowMenu() {
  await screen.findByRole("heading", { level: 1 })
  const trigger = within(document.querySelector('[data-slot="head-actions-row"]') as HTMLElement).getByRole(
    "button",
    { name: "More actions" }
  )
  fireEvent.pointerDown(trigger, { button: 0, pointerId: 1 })
  fireEvent.pointerUp(trigger, { button: 0, pointerId: 1 })
  fireEvent.click(trigger)
  return screen.findByRole("menu")
}

describe("Reopen — visible only on a resolved ticket, to an editor", () => {
  it("offers Reopen in the ⋯ menu when the ticket is resolved and the caller can edit", async () => {
    openTicket("resolved", [message("m1", false)])
    await openOverflowMenu()
    expect(await screen.findByRole("menuitem", { name: "Reopen" })).toBeTruthy()
  })

  it("does not offer Reopen on an open ticket — there is nothing to reopen", async () => {
    openTicket("triaged", [message("m1", false)])
    await openOverflowMenu()
    expect(screen.queryByRole("menuitem", { name: "Reopen" })).toBeNull()
  })

  it("does not offer Reopen to a caller without help:update", async () => {
    perms.can.mockReturnValue(false)
    openTicket("resolved", [message("m1", false)])
    await screen.findByRole("heading", { level: 1 })
    // Every item in this menu (Reopen included) is gated on the same
    // `canEdit` — without it there is nothing left to offer, so the "⋯"
    // trigger itself does not draw, and Reopen is unreachable a fortiori.
    expect(screen.queryByRole("button", { name: "More actions" })).toBeNull()
    expect(screen.queryByRole("menuitem", { name: "Reopen" })).toBeNull()
  })
})

describe("Reopen — confirms, then moves the ticket to in_progress", () => {
  it("asks first (AlertDialog), and does nothing until confirmed", async () => {
    openTicket("resolved", [message("m1", false)])
    await openOverflowMenu()
    fireEvent.click(await screen.findByRole("menuitem", { name: "Reopen" }))

    const dialog = await screen.findByRole("alertdialog")
    expect(within(dialog).getByText("Reopen this ticket?")).toBeTruthy()
    expect(api.setStatusCalls).toEqual([])
  })

  it("confirming calls setHelpStatus with 'in_progress'", async () => {
    openTicket("resolved", [message("m1", false)])
    await openOverflowMenu()
    fireEvent.click(await screen.findByRole("menuitem", { name: "Reopen" }))

    const dialog = await screen.findByRole("alertdialog")
    fireEvent.click(within(dialog).getByRole("button", { name: "Reopen" }))

    await vi.waitFor(() => expect(api.setStatusCalls).toEqual([{ id: "help-1", status: "in_progress" }]))
  })
})
