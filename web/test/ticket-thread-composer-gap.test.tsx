// T3820 — "the comment (text entry) bar is very close to the latest comment,
// we should give some gap there." `<TicketThread composer={false}/>` and
// `<ReplyComposer/>` were bare siblings in plain block flow: `TicketThread`
// pays its own `gap-4` only BETWEEN its own children and never after the last
// one, and `composer={false}` means there is no composer child inside it to
// gap against — so with no wrapper the space between the thread and the
// app's own composer was exactly zero.
//
// AMENDED 17 Sep 2026 — V1's "no tabs" body put the whole conversation on
// its own paper (`TicketConversationPanel`, ticket-detail-body.tsx): the
// thread now scrolls INSIDE that card and the composer is pinned below it,
// never scrolling out of view — the client's "she can carry on reading the
// ticket while it counts" (reply-composer.tsx's own header), now read as a
// chat panel that keeps its send row on screen. T3820's own concern — a real
// gap between the latest message and the compose bar — still has to hold in
// this shape: the two regions are direct children of ONE flex column
// (`TicketConversationPanel`'s `CardContent`) carrying the same panel
// spacing token as before, `gap-[var(--space-5)]`, no pixel literal.

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

// V1 (17 Sep 2026) DRAWS EVERY PANEL AT ONCE — see ticket-close-moved-to-top.test.tsx's
// own comment beside this same mock for the full account: `<WorkLogsPanel>`
// (and its always-mounted `<TimeFormDialog>`s) is on the page unconditionally
// now, and that dialog reads a router hook whether or not it is open.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: () => {}, push: () => {} }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}))

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

describe("the conversation and the composer sit in one gapped column, on their own paper", () => {
  it("the thread scrolls inside its own region; the composer sits outside that scroller, pinned below it", async () => {
    render(<HelpDetailScreen teamId="team-1" helpId="help-1" myUserId="u-1" basePath="/tickets" />)

    // V1 draws every panel at once — no tab click needed to reach either.
    await waitFor(() =>
      expect(document.querySelector('[data-slot="ticket-thread"]')).toBeTruthy()
    )
    const thread = document.querySelector('[data-slot="ticket-thread"]') as HTMLElement
    const composerForm = document.querySelector('[data-slot="reply-composer"]') as HTMLElement
    expect(composerForm, "the app's own composer never rendered").toBeTruthy()

    // THE THREAD'S OWN SCROLL REGION. It is the thread's direct parent — the
    // fragment TicketThread sits in (alongside TranslateAction) carries no
    // DOM node of its own, so the first real ancestor IS the scroller.
    const scroller = thread.parentElement as HTMLElement
    expect(scroller.className).toContain("overflow-y-auto")
    expect(scroller.className).toContain("min-h-0")

    // THE COMPOSER IS OUTSIDE IT — never scrolled away with the transcript,
    // the client's own "she can keep reading while it counts" now read as a
    // pinned send row.
    expect(scroller.contains(composerForm)).toBe(false)

    // ONE SHARED PARENT, PAYING THE GAP ONCE — the panel's own column
    // (`TicketConversationPanel`'s `CardContent`). The scroller sits
    // directly inside it; the composer sits one level deeper (its own
    // `shrink-0` wrapper, then `ReplyComposer`'s own root `<div
    // className="flex min-w-0 flex-col gap-4">`, then the form) — either
    // way, one shared ancestor pays the gap, not two children guessing at
    // each other's edge.
    const composerShrinkWrapper = composerForm.parentElement!.parentElement as HTMLElement
    expect(composerShrinkWrapper.className).toContain("shrink-0")
    const column = scroller.parentElement as HTMLElement
    expect(column).toBe(composerShrinkWrapper.parentElement)
    expect(column.className).toContain("flex-col")
    expect(column.className).toContain("gap-[var(--space-5)]")

    // NO PIXEL LITERAL smuggled in beside the token.
    expect(column.className).not.toMatch(/gap-\[\d+px\]/)
  })
})

// LIVE PROOF ON STAGING (T0001): the composer pill's `background-color`
// measured `rgb(255,254,249)` (#FFFEF9), which is `--card` — and, in light,
// `--card` and `--background` are byte-identical (ticket-detail-body.tsx's
// own R67 header), so the "container" read as no container at all, standing
// on the exact tone of the page behind it. Every other composer/input
// container in the app grounds on the soft-paper tone instead
// (`--surface-panel` #F7F2EB) — `agent-panel.tsx` repoints `--card` to reach
// it for the kit's own vendored composer pill it cannot hand-edit; this
// composer is APP-drawn, so the fix is the plain class, no token override
// needed.
describe("the composer pill stands on the panel tone, not the page's own ground", () => {
  it("the composer root carries bg-surface-panel, never bg-card", async () => {
    render(<HelpDetailScreen teamId="team-1" helpId="help-1" myUserId="u-1" basePath="/tickets" />)
    const composerForm = await waitFor(() => {
      const el = document.querySelector('[data-slot="reply-composer"]') as HTMLElement | null
      if (!el) throw new Error("composer not rendered yet")
      return el
    })
    expect(composerForm.className).toContain("bg-surface-panel")
    expect(composerForm.className).not.toMatch(/\bbg-card\b/)
  })
})
