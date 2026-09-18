// THE STAGE LADDER, ABOVE THE BODY — client ruling, 17 Sep 2026, verbatim: "In
// ticket detail, put the status progress checkpoints on top of the tabs. I
// already told you this."
//
// `<TicketStages>` sits on `RecordScreen`'s `headerExtra` slot, which
// `record-chrome.tsx` forwards to the kit's `hero` region
// (`data-record-region="hero"`) — a sibling the kit draws BEFORE its own
// panel, inside `RecordDetail`, never inside a panel. That wiring did not
// change the SAME DAY (17 Sep 2026) the client ruled the whole tab strip off
// this screen ("I want to see, on one single screen with no tabs, the
// content of tickets…", help-detail.tsx's own header carries the full
// ruling): the ladder was already above the strip, and it is now above a
// two-column body that has no strip left to be above. This file pins the
// four things that placement still promises: the ladder draws once, it sits
// above the body in DOM order, it stays on screen (nothing here unmounts it
// any more, because nothing here unmounts ANY panel any more), and — new,
// 17 Sep 2026 — there is no `tablist` anywhere on the screen for it to have
// been "above" in the first place.
//
// DRIVEN, NOT SCANNED — same reasoning `ticket-close-moved-to-top.test.tsx`
// gives: a comment can say the right thing beside a prop that does the wrong
// one, and only a render that reads the DOM back catches that.
//
// AMENDED 18 Sep 2026 — client ruling, verbatim: "inside tickets temove the
// 'stages' as a title." `ticket-stages.tsx` no longer prints the word
// "Stages" anywhere on the page; it carries that name as an `aria-label`
// instead. The assertions below that used to prove "the ladder is the one
// thing above the body" by reading that eyebrow's TEXT (`getByText`/
// `getAllByText("Stages")`) now prove the identical thing by its ACCESSIBLE
// NAME instead (`getByRole("group", { name: "Stages" })`), which the
// `aria-label` still satisfies — the ladder's own single mount is still
// provable, the printed word just is not there to read any more.

import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { HelpStatus, HelpTicket, TicketStageHistory } from "@shared/types"

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

const EMPTY_STAGE_HISTORY: TicketStageHistory = {
  recorded: false,
  fromCreation: false,
  events: [],
  spans: [],
  reopens: null,
}

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
      helpStages: async () => EMPTY_STAGE_HISTORY,
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

/** The kit's own region marker for the stage hero — `RecordDetail`'s sibling
 * drawn BEFORE the panel, never inside it (record-detail.tsx §"the stage
 * hero, chapter 23, above the strip" — "above the strip" is now "above the
 * body", the strip having gone the same day). */
const heroRegion = () => document.querySelector('[data-record-region="hero"]') as HTMLElement | null

/** A stable anchor inside the BODY, once there was a strip to anchor on and
 * is not any more — the conversation panel's own thread, which the kit's
 * `TicketThread` always tags `data-slot="ticket-thread"`. */
const bodyAnchor = () => document.querySelector('[data-slot="ticket-thread"]') as HTMLElement | null

describe("the ticket's stage ladder, on top of the body", () => {
  it("draws inside the kit's own hero region, above the body — and no tablist exists anywhere", async () => {
    openTicket("triaged")
    await screen.findByRole("heading", { level: 1 })
    const hero = heroRegion()
    expect(hero).toBeTruthy()
    expect(within(hero!).getByRole("group", { name: "Stages" })).toBeTruthy()

    // NO TABLIST — the whole point of 17 Sep 2026's second ruling. There is
    // nothing left for the ladder to be "above" in the tab-strip sense; it is
    // above the BODY, full stop.
    expect(screen.queryByRole("tablist")).toBeNull()

    // ABOVE THE BODY, IN DOM ORDER — the hero region precedes the
    // conversation panel entirely (DOCUMENT_POSITION_FOLLOWING means the
    // anchor comes AFTER `hero`), never nested inside it.
    const anchor = bodyAnchor()
    expect(anchor).toBeTruthy()
    // eslint-disable-next-line no-bitwise
    expect(hero!.compareDocumentPosition(anchor!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(hero!.contains(anchor!)).toBe(false)
    expect(anchor!.contains(hero!)).toBe(false)
  })

  it("draws exactly once — never a second copy inside a body panel", async () => {
    openTicket("triaged")
    await screen.findByRole("heading", { level: 1 })
    // "Stages" is this component's own accessible name (ticket-stages.tsx —
    // no eyebrow prints it any more, 18 Sep 2026), carried nowhere else on
    // this screen — one hit proves one mount.
    expect(screen.getAllByRole("group", { name: "Stages" })).toHaveLength(1)
  })

  it("stays mounted — nothing on this screen unmounts a panel any more, so nothing can unmount the ladder either", async () => {
    openTicket("triaged")
    await screen.findByRole("heading", { level: 1 })
    expect(heroRegion()).toBeTruthy()

    // The four body panels are all on screen together (V1: no tabs, nothing
    // to switch) — proved here by the Stakeholders panel's own title sitting
    // beside the conversation, with the ladder still exactly once and still
    // in the hero region throughout.
    expect(screen.getByText("Stakeholders")).toBeTruthy()
    expect(screen.getAllByRole("group", { name: "Stages" })).toHaveLength(1)
    expect(within(heroRegion()!).getByRole("group", { name: "Stages" })).toBeTruthy()
  })

  it("the body's own panels draw no second ladder of their own", async () => {
    openTicket("triaged")
    await screen.findByRole("heading", { level: 1 })
    const anchor = bodyAnchor()
    expect(anchor).toBeTruthy()
    // Climb to the panel that holds the conversation and confirm it carries
    // no ladder of its own — the one copy lives in the hero region, proved
    // above.
    const conversationCard = anchor!.closest('[data-slot="card"]') ?? anchor!.parentElement
    expect(conversationCard).toBeTruthy()
    expect(within(conversationCard as HTMLElement).queryByRole("group", { name: "Stages" })).toBeNull()
  })
})
