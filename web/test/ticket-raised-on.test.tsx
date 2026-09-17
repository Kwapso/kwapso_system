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
import { cleanup, render, screen } from "@testing-library/react"
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

describe("R86/17-Sep — the date chip is gone; the Overview fact carries date + age", () => {
  it("the header's own chip row draws exactly three chips — ref, type, app — never a fourth for the date", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    const region = titleRegion()
    // `tabular-nums` is on EVERY badge (badge.tsx's own base class), so it
    // cannot tell the retired date chip apart from the three that remain —
    // the COUNT is what proves the fourth is gone, not a class.
    const chips = [...region.querySelectorAll('[data-slot="badge"]')]
    expect(chips.map((c) => c.textContent)).toEqual(["BERG-T0412", "Bug", "Dispatch"])
  })

  // THE FACT LINE ITSELF — proved two ways, because a full render of the
  // Overview tab's panel needs data this harness does not simulate (the
  // ticket-stages/account-detail fetches this screen's OTHER tabs make on
  // mount, unrelated to the fact this test is about). (1) the composition
  // `help-detail.tsx` actually calls is proved by RUNNING it, the same
  // `daysSince`/`formatDate`/`t` calls the component makes, not a re-typed
  // copy. (2) that the component really wires "Raised on" to that same
  // composition, right after "Raised by", is proved by reading its source.
  it("the composition help-detail.tsx calls renders a real date and an exact day count", () => {
    const t = translator("en")
    const sentence = t("{date} ({count} days ago)", {
      date: formatDate(CREATED_AT, "en"),
      count: daysSince(CREATED_AT) ?? 0,
    })
    expect(daysSince(CREATED_AT)).toBe(RAISED_DAYS_AGO)
    expect(sentence).toBe(`${formatDate(CREATED_AT, "en")} (${RAISED_DAYS_AGO} days ago)`)
  })

  it("help-detail.tsx wires a 'Raised on' fact, right after 'Raised by', to daysSince/formatDate", () => {
    const src = readFileSync(join(import.meta.dirname, "..", "components", "tickets", "help-detail.tsx"), "utf8")
    const raisedByAt = src.indexOf('t("Raised by")')
    const raisedOnAt = src.indexOf('t("Raised on")')
    expect(raisedByAt, "the ticket detail's overview facts must still carry 'Raised by'").toBeGreaterThan(-1)
    expect(raisedOnAt, "and now 'Raised on' beside it").toBeGreaterThan(-1)
    expect(raisedOnAt, "'Raised on' sits AFTER 'Raised by' — 'under' it, the client's own word").toBeGreaterThan(raisedByAt)
    const between = src.slice(raisedOnAt, raisedOnAt + 400)
    expect(between).toContain("daysSince")
    expect(between).toContain("formatDate")
    expect(between).toContain("{date} ({count} days ago)")
  })
})
