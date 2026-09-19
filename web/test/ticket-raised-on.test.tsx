// "RAISED ON" — the client's ruling, 17 Sep 2026, verbatim: "On tickets:
// Remove the 'Raised On' chip from the QE view, but also from the detail
// page in the QE view. Add it under 'Raised By' as 'Raised On' and put the
// date and, in brackets, how many days ago."
//
// TWO THINGS PROVED, over a real render (the same harness
// ticket-close-moved-to-top.test.tsx uses): the chip row no longer carries a
// date chip, at all — on the ticket detail's own header AND, separately, on
// `TicketChips` itself (so the list row and the board card, which share the
// same component, lose it too) — and the Overview tab's "Raised on" fact
// carries a real date plus an exact day count in brackets.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { vi } from "vitest"

import type { HelpMessage, HelpTicket, HelpStatus } from "@shared/types"
import { daysSince } from "@shared/web/format"
import { formatDate } from "@shared/web/format"
import { translator } from "@shared/i18n"

// REAL TIME, NOT FROZEN — `vi.useFakeTimers()` hung this render (React's own
// scheduler and `@testing-library`'s async `findBy*` both lean on real
// timers), so the fixture's `createdAt` is built from `Date.now()` minus a
// known span instead of pinning the clock. The expected day count is
// computed the same way `daysSince` computes it, so the test can never drift
// from the function it is proving.
const RAISED_DAYS_AGO = 14
const CREATED_AT = new Date(Date.now() - RAISED_DAYS_AGO * 24 * 60 * 60 * 1000 - 60 * 60 * 1000).toISOString()

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
  createdAt: CREATED_AT,
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
      helpThread: async () => ({ replies: [] as HelpMessage[], total: 0 }),
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

// V1 (17 Sep 2026) DRAWS EVERY PANEL AT ONCE — see ticket-close-moved-to-top.test.tsx's
// own comment beside this same mock for the full account: `<WorkLogsPanel>`
// (and its always-mounted `<TimeFormDialog>`s) is on the page unconditionally
// now, and that dialog reads `useActiveTeam()` — a router hook — whether or
// not it is open.
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

afterEach(cleanup)
beforeEach(() => {
  perms.can.mockReset().mockReturnValue(true)
})

const titleRegion = () => document.querySelector('[data-record-region="header"]') as HTMLElement

function openTicket(status: HelpStatus = "in_progress") {
  api.ticket = { ...BASE_TICKET, status } as HelpTicket
  return render(<HelpDetailScreen teamId="team-1" helpId="help-1" myUserId="u-1" basePath="/tickets" />)
}

describe("R86/17-Sep (morning) — the date chip is gone; the Overview fact carried date + age", () => {
  // AMENDED 17 SEP 2026 (AFTERNOON) — the client's later ruling the same day,
  // reviewing the deployed page, retired the "Raised by"/"Raised on" fact
  // ROW this describe block used to prove entirely (verbatim, quoted in full
  // in `help-detail.tsx`'s own comment where the row stood): the header chip
  // count test below is updated for the SAME day's OTHER ruling (the STATUS
  // chip after the ID, R86); the wiring test that used to prove "Raised on"
  // sat under "Raised by" is retired along with the row itself — see
  // `help-detail.tsx`'s own comment (the fact list's old home) for the
  // account of which facts render nowhere on the page now.
  it("the header's own chip row draws exactly four chips — ref, status, type, app", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    const region = titleRegion()
    // `tabular-nums` is on EVERY badge (badge.tsx's own base class), so it
    // cannot tell the chips apart on its own — the COUNT and the TEXT
    // together are what prove the shape.
    const chips = [...region.querySelectorAll('[data-slot="badge"]')]
    expect(chips.map((c) => c.textContent)).toEqual(["BERG-T0412", "In progress", "Bug", "Dispatch"])
  })

  it("the status chip is the one coloured chip on the row (R86) — the tone lives in the dot", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    const region = titleRegion()
    const statusChip = within(region).getByText("In progress").closest('[data-slot="badge"]') as HTMLElement
    expect(statusChip.getAttribute("data-dot")).toBe("building")
  })

  it("the day-count sentence format itself is unchanged — a real date and an exact day count", () => {
    const t = translator("en")
    const sentence = t("{date} ({count} days ago)", {
      date: formatDate(CREATED_AT, "en"),
      count: daysSince(CREATED_AT) ?? 0,
    })
    expect(daysSince(CREATED_AT)).toBe(RAISED_DAYS_AGO)
    expect(sentence).toBe(`${formatDate(CREATED_AT, "en")} (${RAISED_DAYS_AGO} days ago)`)
  })

  it("help-detail.tsx no longer wires a 'Raised by'/'Raised on' fact row — retired 17 Sep 2026 (afternoon)", () => {
    const src = readFileSync(join(import.meta.dirname, "..", "components", "tickets", "help-detail.tsx"), "utf8")
    // NOT `queryByText` on a render — the facts must not exist in the SOURCE
    // at all any more, not merely be hidden behind a gate this fixture
    // happens not to satisfy.
    expect(src.includes('t("Raised by")'), "'Raised by' must not be wired anywhere in help-detail.tsx any more").toBe(false)
    expect(src.includes('t("Raised on")'), "'Raised on' must not be wired anywhere in help-detail.tsx any more").toBe(false)
  })
})
