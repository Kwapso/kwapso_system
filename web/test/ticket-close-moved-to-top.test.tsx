// B0294/T3657 — "Send and close button too easy to hit by accident … the
// close button needs to move to the top." Until this fix the top "Answer and
// close" action on the title existed only at `ticket.status === "ready"`; at
// every earlier status closing was the bottom composer's "Send and close",
// beside plain Send, where a stray click could reach it. That bottom control
// is gone (web/test/one-send-and-a-hold.test.tsx pins its absence); this file
// pins the OTHER half — that the top control now covers every status the
// bottom one used to.
//
// AMENDED 17 Sep 2026 — the client's ruling, verbatim: "Okay, but reduce to
// close and make it only available, but still visible at all times, only
// when the latest answer is from our side. Make it mango. And put a more
// appropriate icon for closing." Four changes to the SAME control, so this
// file now pins five things instead of two: the label ("Close", not "Answer
// and close"), that it is DRAWN at every open status regardless of who spoke
// last (never withheld — only disabled), that it is ENABLED only when the
// thread's own last word was ours, mango rather than black, and the
// CheckCircle glyph rather than the paper plane.
//
// DRIVEN, NOT SCANNED, for the same reason web/test/story-born-on-a-ticket.test.tsx
// gives: a comment can say the right thing beside a prop that does the wrong
// one, and only a render that reads the button back catches that.

import { cleanup, render, screen, within } from "@testing-library/react"
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
  resolvedAt: null,
  draftResolution: null,
  createdAt: "2026-08-18T09:00:00.000Z",
  updatedAt: null,
  editorName: null,
} as unknown as HelpTicket

/** One message on the thread, ours or theirs — the only field the enable
 * gate reads (`authorIsClient`). Everything else here is filler the render
 * needs but the gate does not. */
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
  // THE THREAD, MUTABLE PER TEST. Empty by default — "no messages", the
  // gate's own most-closed state (nothing has been answered back yet).
  replies: [] as HelpMessage[],
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
  api.replies = []
})

const openTicket = (status: HelpStatus, replies: HelpMessage[] = []) => {
  api.ticket = { ...BASE_TICKET, status } as HelpTicket
  api.replies = replies
  return render(<HelpDetailScreen teamId="team-1" helpId="help-1" myUserId="u-1" basePath="/tickets" />)
}

/** The title row — `data-record-region="header"`, where the kit's `Title`
 * draws the mark, the chips and `actions` together (RECORD-DETAIL's own
 * region marker, unrelated to any line number). */
const titleRegion = () => document.querySelector('[data-record-region="header"]') as HTMLElement

/** The exact button, by its exact name — `/close/i` alone would also match
 * a Cancel/Close control somewhere else on the page (a dialog that has not
 * even opened yet does not draw one, but the label itself is a common word,
 * and an exact match is what this file means to pin anyway). */
const closeButton = () => screen.findByRole("button", { name: "Close" })
const queryCloseButton = () => screen.queryByRole("button", { name: "Close" })

describe("the top close action, at every status the bottom composer used to cover", () => {
  it.each(["new", "triaged", "scheduled", "in_progress", "ready"] as HelpStatus[])(
    "is drawn at status %s even with no messages yet (visible always; the gate below decides clickable)",
    async (status) => {
      openTicket(status, [])
      expect(await closeButton()).toBeTruthy()
    }
  )

  it("is not offered once the ticket is resolved — nothing is left to close", async () => {
    openTicket("resolved", [message("m1", false)])
    // Let the screen settle before asserting an absence, or this could pass
    // for the wrong reason (nothing has rendered yet).
    await screen.findByRole("heading", { level: 1 })
    expect(queryCloseButton()).toBeNull()
  })

  it("is drawn but DISABLED when there are no messages on the thread yet", async () => {
    openTicket("triaged", [])
    const button = (await closeButton()) as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })

  it("is drawn but DISABLED when the client wrote the last word", async () => {
    openTicket("triaged", [message("m1", false), message("m2", true)])
    const button = (await closeButton()) as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })

  it("is ENABLED when our side wrote the last word", async () => {
    openTicket("triaged", [message("m1", true), message("m2", false)])
    const button = (await closeButton()) as HTMLButtonElement
    expect(button.disabled).toBe(false)
  })

  it('is labelled "Close", not "Answer and close"', async () => {
    openTicket("triaged", [message("m1", false)])
    expect(await closeButton()).toBeTruthy()
    expect(screen.queryByRole("button", { name: /answer and close/i })).toBeNull()
  })

  it("is mango (R84) — the client's 17 Sep 2026 ruling reverses the 16 Sep 2026 black, and it sits inside RecordScreen's own actions prop, the title component", async () => {
    openTicket("triaged", [message("m1", false)])
    const button = await closeButton()
    expect(button.className).toContain("--btn-primary-fill")
    expect(button.className).not.toContain("--btn-inverse-fill")
  })

  it("carries the CheckCircle glyph, not the old paper plane — a more appropriate mark for closing, per the same ruling", async () => {
    openTicket("triaged", [message("m1", false)])
    const button = await closeButton()
    const path = button.querySelector("svg path")
    expect(path).toBeTruthy()
    // CheckCircle's own path data (icons.generated.tsx) — a solid ring with a
    // check cut through it. Unique enough among this file's other icons
    // (TrayArrowUp, Archive, Translate, PencilSimple, MonitorPlay) to tell
    // them apart without a test id the kit's icons don't carry.
    expect(path?.getAttribute("d")).toContain("104.11,104.11,0,0,0,128,24Z")
  })

  it("keeps the title to at most two visible actions beside the overflow menu (B1)", async () => {
    openTicket("triaged", [message("m1", false)])
    const region = titleRegion()
    await within(region).findByRole("button", { name: "Close" })
    const buttons = within(region).getAllByRole("button")
    const overflow = buttons.filter((b) => b.getAttribute("aria-label") === "More actions")
    const visible = buttons.filter((b) => b.getAttribute("aria-label") !== "More actions")
    expect(overflow.length).toBe(1)
    // "Close" (primary) + the timer (secondary) — B1's ceiling.
    expect(visible.length).toBeLessThanOrEqual(2)
  })
})
