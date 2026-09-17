// B0294/T3657 — "Send and close button too easy to hit by accident … the
// close button needs to move to the top." Until this fix the top "Answer and
// close" action on the title existed only at `ticket.status === "ready"`; at
// every earlier status closing was the bottom composer's "Send and close",
// beside plain Send, where a stray click could reach it. That bottom control
// is gone (web/test/one-send-and-a-hold.test.tsx pins its absence); this file
// pins the OTHER half — that the top control now covers every status the
// bottom one used to.
//
// DRIVEN, NOT SCANNED, for the same reason web/test/story-born-on-a-ticket.test.tsx
// gives: a comment can say the right thing beside a prop that does the wrong
// one, and only a render that reads the button back catches that.

import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { HelpTicket, HelpStatus } from "@shared/types"

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
  resolvedAt: null,
  draftResolution: null,
  createdAt: "2026-08-18T09:00:00.000Z",
  updatedAt: null,
  editorName: null,
} as unknown as HelpTicket

const perms = vi.hoisted(() => ({ can: vi.fn(() => true) }))
vi.mock("@/lib/perms", () => ({ usePermissions: () => ({ can: perms.can }) }))

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
      helpStakeholders: async () => ({ stakeholders: [] }),
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

import { HelpDetailScreen } from "@/components/tickets/help-detail"

afterEach(cleanup)
beforeEach(() => {
  perms.can.mockReset().mockReturnValue(true)
})

const openTicket = (status: HelpStatus) => {
  api.ticket = { ...BASE_TICKET, status } as HelpTicket
  return render(<HelpDetailScreen teamId="team-1" helpId="help-1" myUserId="u-1" basePath="/tickets" />)
}

/** The title row — `data-record-region="header"`, where the kit's `Title`
 * draws the mark, the chips and `actions` together (RECORD-DETAIL's own
 * region marker, unrelated to any line number). */
const titleRegion = () => document.querySelector('[data-record-region="header"]') as HTMLElement

describe("the top close action, at every status the bottom composer used to cover", () => {
  it.each(["new", "triaged", "scheduled", "in_progress", "ready"] as HelpStatus[])(
    "is offered at status %s",
    async (status) => {
      openTicket(status)
      expect(await screen.findByRole("button", { name: /answer and close/i })).toBeTruthy()
    }
  )

  it("is not offered once the ticket is resolved — nothing is left to close", async () => {
    openTicket("resolved")
    // Let the screen settle before asserting an absence, or this could pass
    // for the wrong reason (nothing has rendered yet).
    await screen.findByRole("heading", { level: 1 })
    expect(screen.queryByRole("button", { name: /answer and close/i })).toBeNull()
  })

  it("stays black (R84) — mango is reserved for the title's own primary slot rule, and this button is superseded on colour, not on rank", async () => {
    openTicket("triaged")
    const button = await screen.findByRole("button", { name: /answer and close/i })
    expect(button.className).toContain("--btn-inverse-fill")
    expect(button.className).not.toContain("--btn-primary-fill")
  })

  it("keeps the title to at most two visible actions beside the overflow menu (B1)", async () => {
    openTicket("triaged")
    const region = titleRegion()
    await within(region).findByRole("button", { name: /answer and close/i })
    const buttons = within(region).getAllByRole("button")
    const overflow = buttons.filter((b) => b.getAttribute("aria-label") === "More actions")
    const visible = buttons.filter((b) => b.getAttribute("aria-label") !== "More actions")
    expect(overflow.length).toBe(1)
    // "Answer and close" (primary) + the timer (secondary) — B1's ceiling.
    expect(visible.length).toBeLessThanOrEqual(2)
  })
})
