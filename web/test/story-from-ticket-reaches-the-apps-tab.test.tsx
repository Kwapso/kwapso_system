// T3652 — "A story created inside a ticket's related-stories screen doesn't
// show up in the app's main stories tab."
//
// The row is filed correctly (the owner picks the app by hand in the form,
// same as the real B0290 story on staging, and the door writes it) — the gap
// is live-sync: `help-detail.tsx`'s `onSubmit` for that dialog only ever
// invalidated the TICKET's own related-stories slice
// (`sliceKey("stories-ticket", helpId)`), never the APP's own Stories tab
// slice (`sliceKey("stories-app", appId)`), so a person sitting on that tab
// never learned a new story had landed on it.
//
// The `StoryFormDialog` itself is stubbed to a single button that calls the
// REAL `onSubmit` closure `help-detail.tsx` builds, with the values a person
// filling in the real form would have produced — the picker's own popover
// interaction is a separate, already-trusted control and not what this bug is
// about; what matters here is which cache KEY the closure invalidates once
// the door answers, which a source scan of "does it call invalidate" cannot
// see.

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { HelpTicket } from "@shared/types"

const TICKET: HelpTicket = {
  id: "help-1",
  ref: "T0412",
  description: "The dispatch board will not load on a phone",
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
  titleDe: null,
  titleEn: null,
  resolvedAt: null,
  draftResolution: null,
  createdAt: "2026-08-18T09:00:00.000Z",
  updatedAt: null,
  editorName: null,
} as unknown as HelpTicket

const api = vi.hoisted(() => ({ createStory: vi.fn() }))
const perms = vi.hoisted(() => ({ can: vi.fn(() => true) }))
const storeSpy = vi.hoisted(() => ({ invalidate: vi.fn() }))
// Captures the exact `onSubmit` help-detail.tsx hands to the dialog, so the
// test can call it with values shaped like a real submit — never re-deriving
// them, since the fault is INSIDE that closure and not in how it is reached.
const captured = vi.hoisted(() => ({ onSubmit: null as null | ((v: Record<string, unknown>) => Promise<unknown>) }))

vi.mock("@/lib/perms", () => ({ usePermissions: () => ({ can: perms.can }) }))

vi.mock("@shared/web/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/web/store")>()
  return { ...actual, invalidate: storeSpy.invalidate }
})

vi.mock("@/components/work/story-form-dialog", () => ({
  StoryFormDialog: (props: { open: boolean; onSubmit: (v: Record<string, unknown>) => Promise<unknown> }) => {
    captured.onSubmit = props.onSubmit
    return props.open ? <button onClick={() => void props.onSubmit({ appId: "app-1", ticketId: "help-1" })}>fire onSubmit</button> : null
  },
}))

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return {
    ...actual,
    content: {
      ...actual.content,
      help: async () => ({ tickets: [TICKET], total: 1, nextCursor: null, hasMore: false }),
      helpThread: async () => ({ replies: [], total: 0 }),
      helpStakeholders: async () => ({ stakeholders: [] }),
      stories: async () => ({ stories: [], total: 0, nextCursor: null, hasMore: false }),
      createStory: api.createStory,
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
      apps: async () => ({ apps: [{ id: "app-1", name: "Dispatch", staff: [] }], total: 1 }),
      processes: async () => ({ processes: [], total: 0, nextCursor: null, hasMore: false }),
      activity: async () => ({ activity: [], total: 0, nextCursor: null, hasMore: false }),
    },
  }
})

// V1 (17 Sep 2026) DRAWS EVERY PANEL AT ONCE — see ticket-close-moved-to-top.test.tsx's
// own comment beside this same mock for the full account.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: () => {}, push: () => {} }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock("@shared/ui/components/sonner/sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
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
  storeSpy.invalidate.mockReset()
  captured.onSubmit = null
  api.createStory.mockReset().mockResolvedValue({ id: "story-1" })
})

describe("a story written from a ticket reaches the app's own Stories tab", () => {
  it("invalidates the app's stories slice, not just the ticket's own", async () => {
    render(<HelpDetailScreen teamId="team-1" helpId="help-1" myUserId="u-1" basePath="/tickets" />)
    // AMENDED 17 Sep 2026, TWICE — V1's "no tabs" body first retired the
    // Related stories tab this used to click into, behind a capped preview's
    // "Show all" link opening the real `<StoriesPanel>` (and its `onNew`) in
    // a slide-in. THEN the client, reading the deployed page: "Remove 'Show
    // All' because you need to show them all" (see
    // story-born-on-a-ticket.test.tsx's own `relatedStoriesTab` comment for
    // the full account) — the panel renders every row itself now, and "New
    // story" sits directly on the panel's own title row with nothing left
    // behind a link to open first.
    fireEvent.click(await screen.findByRole("button", { name: "New story" }))

    fireEvent.click(await screen.findByRole("button", { name: "fire onSubmit" }))

    await waitFor(() => expect(api.createStory).toHaveBeenCalled())
    expect(api.createStory.mock.calls[0][0]).toMatchObject({ appId: "app-1", ticketId: "help-1" })

    const invalidated = storeSpy.invalidate.mock.calls.map((c) => c[0])
    expect(invalidated, "the ticket's own slice must still be told").toContain("stories-ticket-of:help-1")
    expect(
      invalidated,
      "and the app's own Stories tab must be told too, not only the ticket's Related stories tab"
    ).toContain("stories-app-of:app-1")
  })
})
