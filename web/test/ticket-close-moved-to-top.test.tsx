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

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { HelpMessage, HelpTicket, HelpStatus, RunningTimer } from "@shared/types"

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
  // RUNNING TIMERS, MUTABLE PER TEST (R99), empty by default, same as every
  // other suite that mounts this screen.
  timers: [] as RunningTimer[],
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
      runningTimers: async () => ({ timers: api.timers }),
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

// V1 (17 Sep 2026) DRAWS EVERY PANEL AT ONCE — no tab strip left to keep
// `<WorkLogsPanel>` (and the `<TimeFormDialog>`s it always mounts, open or
// not) off the tree until somebody clicked into it. `TimeFormDialog` reads
// `useActiveTeam()` unconditionally (time-form-dialog.tsx:99), which needs a
// mounted app router — this harness gives it none, so every ticket-detail
// render needs this mock now, the same one `stories-sort.test.tsx` already
// uses for the same reason.
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
  // R99's own cases are the first in this file to vary a CROSS-TEST cache key
  // (`runningTimersKey("team-1")` never changes across cases here); every
  // earlier case in this suite happened not to need this, and
  // story-detail.test.tsx already carries the identical clear for the same
  // reason.
  clearCache()
  perms.can.mockReset().mockReturnValue(true)
  api.replies = []
  api.timers = []
})

const openTicket = (status: HelpStatus, replies: HelpMessage[] = []) => {
  api.ticket = { ...BASE_TICKET, status } as HelpTicket
  api.replies = replies
  return render(<HelpDetailScreen teamId="team-1" helpId="help-1" myUserId="u-1" basePath="/tickets" />)
}

const RUNNING_ON_TICKET: RunningTimer = {
  id: "log-1",
  targetTable: "help",
  targetId: "help-1",
  targetLabel: "The dispatch board will not load",
  targetRef: "BERG-T0412",
  startedAt: "2026-09-21T09:00:00.000Z",
  elapsedSeconds: 600,
  runaway: false,
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
  // "new" DROPPED FROM THIS LIST, 20 Sep 2026 — Aurora's ruling: "when
  // ticket is in status triage, also in main screen the visible buttons
  // should change: same as in queue." A ticket at `new` is still IN triage,
  // so Close/the timer are replaced there (see the describe block below)
  // rather than drawn-and-disabled the way every later status still is.
  it.each(["triaged", "scheduled", "in_progress", "ready"] as HelpStatus[])(
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

  // AMENDED 17 Sep 2026 — B1's own ceiling ("two visible actions maximum on
  // any title", UI-RULEBOOK.md) named ONE primary and ONE secondary; the
  // client's ruling reviewing the deployed page, same day, verbatim: "The
  // edit button: put it outside, just the pen" — a THIRD control on this one
  // title row, specifically the standalone edit icon, never folded into the
  // "one primary, one secondary" count B1 states for the rest of the app.
  // `help-detail.tsx`'s own comment beside the button carries the ruling and
  // the R84 reasoning for why it is `variant="inverse"`, not mango. Flagged
  // here rather than left as a quiet test change: UI-RULEBOOK.md's own B1
  // entry has not yet been updated with this ticket-detail-specific
  // amendment (see the session report).
  it("keeps the title to at most three visible actions beside the overflow menu (B1, amended 17 Sep 2026 for this screen's standalone Edit)", async () => {
    openTicket("triaged", [message("m1", false)])
    const region = titleRegion()
    await within(region).findByRole("button", { name: "Close" })
    const buttons = within(region).getAllByRole("button")
    // SCOPED PAST THE FOLD, 18 Sep 2026 ("h3, and aign the menu to the
    // chips") — the chip row now carries its OWN "More actions" trigger too
    // (`shared/web/head-actions.tsx`'s `HeadActionsFoldMenu`, folded into
    // `chips` below `RecordScreen`), same accessible name as the wide row's
    // `RecordActionsMenu` by design (one overflow menu, two widths). This
    // ceiling is about the WIDE row B1 actually named, so only a button
    // inside `[data-slot="head-actions-row"]` counts toward either bucket —
    // `web/test/head-actions-fold.test.tsx` owns the fold's own trigger.
    const wideRow = document.querySelector('[data-slot="head-actions-row"]') as HTMLElement
    const wideButtons = buttons.filter((b) => wideRow.contains(b))
    const overflow = wideButtons.filter((b) => b.getAttribute("aria-label") === "More actions")
    const visible = wideButtons.filter((b) => b.getAttribute("aria-label") !== "More actions")
    expect(overflow.length).toBe(1)
    // "Close" (primary) + the timer (secondary) + the standalone Edit pen —
    // B1's ceiling for THIS screen, amended 17 Sep 2026.
    expect(visible.length).toBeLessThanOrEqual(3)
  })

  // AMENDED 18 Sep 2026 — client ruling, verbatim: "edit button is never
  // black (even when it's only one). f.e. in ticket detail the edit buton is
  // black." This test used to pin `--btn-inverse-fill` (black) as the
  // CORRECT colour, reasoning "Close already claims the one mango slot, so
  // the pen is black"; her ruling corrects that reasoning rather than
  // confirming it — the pen is quiet (`--btn-secondary-fill`, the kit's own
  // icon-only answer) on every record screen, black or not.
  it("draws the standalone Edit pen — client ruling, 17 Sep 2026: \"just the pen\" — quiet, never black and never mango (R84's 18 Sep 2026 amendment)", async () => {
    openTicket("triaged", [message("m1", false)])
    const region = titleRegion()
    const edit = await within(region).findByRole("button", { name: "Edit" })
    expect(edit.className).toContain("--btn-secondary-fill")
    expect(edit.className).not.toContain("--btn-inverse-fill")
    expect(edit.className).not.toContain("--btn-primary-fill")
    // JUST THE PEN — an icon-only control, no visible label text beside it.
    expect(edit.textContent?.trim()).toBe("")
  })
})

// THE TRIAGE STAGE'S OWN ACTIONS, ON THE HEAD — Aurora's ruling, 20 Sep
// 2026, verbatim: "when ticket is in status triage, also in main screen the
// visible buttons shoudl change: same as in queue." A ticket at `new` is the
// triage queue's own set (`status === "new"` IS the pre-triage state,
// triage-queue.tsx's own undo comment); this proves Close and the timer are
// replaced there by the same decision `triageAct` gives a row in the Triage
// tab's own list, and that Edit is untouched.
describe("the triage stage's own actions replace Close/the timer on the head (Aurora, 20 Sep 2026)", () => {
  it("draws no Close button at status new", async () => {
    openTicket("new", [])
    await screen.findByRole("heading", { level: 1 })
    expect(queryCloseButton()).toBeNull()
  })

  it("draws no Start button at status new either", async () => {
    openTicket("new", [])
    await screen.findByRole("heading", { level: 1 })
    expect(screen.queryByRole("button", { name: "Start" })).toBeNull()
  })

  // BASE_TICKET carries `helpType: "Bug"`, which falls to `triageAct`'s
  // default case — the SAME word and non-assigning act a Question or an
  // Extra gets in the queue (tickets-collection.tsx's `triageAct`), since
  // the Store button an Extra used to wear was removed the same session.
  it("draws the triage queue's own decision word in Close's place, for a type that needs nobody", async () => {
    openTicket("new", [])
    const region = titleRegion()
    expect(await within(region).findByRole("button", { name: "Accept" })).toBeTruthy()
  })

  it("still draws the standalone Edit pen at status new", async () => {
    openTicket("new", [])
    const region = titleRegion()
    expect(await within(region).findByRole("button", { name: "Edit" })).toBeTruthy()
  })

  it("keeps Close/the timer at every OTHER status — only the triage stage swaps them out", async () => {
    openTicket("triaged", [])
    expect(await closeButton()).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Accept" })).toBeNull()
  })
})

// R99, Aurora's 21 Sep 2026 ruling, verbatim: "cannot mark anything as
// closed (task, story, ticket, whatever) if there's an active time log
// running." The door's own copy is `refuseWhileTimerRuns`
// (workers/content/src/lib/work-logs.ts), wired into `setStatus`'s resolve
// branch and into `setTicketArchived`; the Close button and the Archive menu
// item below only mirror the same fact back, `ticketTimerRunning`
// (help-detail.tsx).
describe("the close action is disabled while a timer on the ticket is still running (R99)", () => {
  it("Close is disabled even when the thread would otherwise allow it", async () => {
    api.timers = [RUNNING_ON_TICKET]
    openTicket("triaged", [message("m1", false)]) // our own last word, would enable it
    await closeButton()
    // The running-timers read lands a beat after the button first paints,
    // and swaps the ENABLED button for the Tooltip-wrapped disabled one, a
    // different element rather than a mutated prop, so this re-queries
    // instead of polling a reference captured before the swap.
    await waitFor(() => {
      expect((screen.getByRole("button", { name: "Close" }) as HTMLButtonElement).disabled).toBe(true)
    })
  })

  it("a timer running on a DIFFERENT record never disables Close", async () => {
    api.timers = [{ ...RUNNING_ON_TICKET, id: "log-2", targetTable: "stories", targetId: "story-9" }]
    openTicket("triaged", [message("m1", false)])
    const button = (await closeButton()) as HTMLButtonElement
    expect(button.disabled).toBe(false)
  })

  it("Close is enabled again once no timer runs on the ticket", async () => {
    api.timers = []
    openTicket("triaged", [message("m1", false)])
    const button = (await closeButton()) as HTMLButtonElement
    expect(button.disabled).toBe(false)
  })

  it("Archive, in the ⋯ menu, is disabled the same way", async () => {
    api.timers = [RUNNING_ON_TICKET]
    openTicket("triaged", [])
    await screen.findByRole("heading", { level: 1 })
    const trigger = within(
      document.querySelector('[data-slot="head-actions-row"]') as HTMLElement
    ).getByRole("button", { name: "More actions" })
    fireEvent.pointerDown(trigger, { button: 0, pointerId: 1 })
    fireEvent.pointerUp(trigger, { button: 0, pointerId: 1 })
    fireEvent.click(trigger)
    const archive = await screen.findByRole("menuitem", { name: "Archive" })
    expect(archive.getAttribute("aria-disabled")).toBe("true")
  })
})
