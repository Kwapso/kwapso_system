// T3820 — "the comment (text entry) bar is very close to the latest comment,
// we should give some gap there." `<TicketThread composer={false}/>` and
// `<ReplyComposer/>` were bare siblings in plain block flow: `TicketThread`
// pays its own `gap-4` only BETWEEN its own children and never after the last
// one, and `composer={false}` means there is no composer child inside it to
// gap against — so with no wrapper the space between the thread and the
// app's own composer was exactly zero.
//
// THE FIX IS A COLUMN, NOT A MARGIN. One wrapper around both, using the same
// panel spacing token (`gap-[var(--space-5)]`) the stages block above already
// uses — no pixel literal, and the gap is paid once by the column rather than
// by either child guessing at the other's edge.

import { cleanup, render, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { HelpTicket } from "@shared/types"

const TICKET = {
  id: "help-1",
  ref: "BERG-T0412",
  titleEn: "The dispatch board will not load",
  titleDe: null,
  description: "<p>None of my drivers can see today's routes.</p>",
  helpType: "Bug",
  status: "triaged",
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

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return {
    ...actual,
    content: {
      ...actual.content,
      help: async () => ({ tickets: [TICKET], total: 1, nextCursor: null, hasMore: false }),
      helpOne: async () => TICKET,
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

describe("the conversation and the composer sit in one gapped column", () => {
  it("shares a single flex column, spaced by the panel's own token", async () => {
    render(<HelpDetailScreen teamId="team-1" helpId="help-1" myUserId="u-1" basePath="/tickets" />)

    // The default tab is Conversation (useRemembered's own fallback), so both
    // are on screen with no click needed.
    await waitFor(() =>
      expect(document.querySelector('[data-slot="ticket-thread"]')).toBeTruthy()
    )
    const thread = document.querySelector('[data-slot="ticket-thread"]') as HTMLElement
    const composerForm = document.querySelector('[data-slot="reply-composer"]') as HTMLElement
    expect(composerForm, "the app's own composer never rendered").toBeTruthy()

    const composerRoot = composerForm.parentElement as HTMLElement
    const column = thread.parentElement as HTMLElement

    // ONE COLUMN, holding both as DIRECT children — not two components each
    // guessing at a margin of their own.
    expect(column).toBe(composerRoot.parentElement)
    expect(column.className).toContain("flex-col")
    expect(column.className).toContain("gap-[var(--space-5)]")

    // NO PIXEL LITERAL smuggled in beside the token.
    expect(column.className).not.toMatch(/gap-\[\d+px\]/)
  })
})
