// REPROOF 20, ITEM 3 - "Triage Accept leaves status 'new'." Investigated
// against the actual proof data (T0001/T0002 on staging's Smoke team): both
// tickets are missing required pre-triage fields (an app and who raised it,
// T0002 is even missing its own type), so `markTriaged`
// (workers/content/src/lib/help.ts) correctly and intentionally refuses them
// through the pre-triage gate the owner ruled on 19 Aug 2026
// (`shared/triage-readiness.ts`), 409, with the gap named in the message.
// `workers/content/test/pre-triage-is-a-reason.test.ts` already proves BOTH
// halves of that door: a COMPLETE ticket moves to "triaged", and a ticket
// missing any one of the four fields is refused and stays at "new". So the
// reproof's two tickets are a DATA-completeness gap on that one team, not a
// code defect - no server-side fix belongs here.
//
// What this file adds is the WEB half the task brief also asked for: proof
// that when Accept succeeds (a COMPLETE ticket, the ordinary case), the
// ticket HEAD actually reflects it - no more triage "Accept" button, and the
// triaged-stage actions (Close, the timer) take its place, the same
// transition `inTriageStage`/`canClose` describe in help-detail.tsx. Modelled
// closely on ticket-detail-no-tabs.test.tsx's own render harness.

import { fireEvent, cleanup, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { HelpMessage, HelpStakeholder, HelpTicket, HelpStatus, TicketStageHistory } from "@shared/types"

// A COMPLETE TICKET - every one of the four pre-triage facts present
// (`shared/triage-readiness.ts`'s own `TRIAGE_REQUIRES`), unlike the two
// reproof tickets this file's own header explains. `helpType: "Bug"` keeps
// `triageAct` on its default branch, so the head's own decision button reads
// "Accept" (never "Assign"/"Plan", which open a people row instead of
// deciding straight away).
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
  raisedByContactId: "contact-1",
  raisedByContactName: "Marta Bergman",
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

const STAKEHOLDER: HelpStakeholder = {
  userId: "u-2",
  name: "Aurora",
  email: "aurora@kwapso.com",
  imageUrl: null,
  origin: "admin",
} as unknown as HelpStakeholder

const perms = vi.hoisted(() => ({ can: vi.fn(() => true) }))
vi.mock("@/lib/perms", () => ({ usePermissions: () => ({ can: perms.can }) }))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: () => {}, push: () => {} }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}))

const api = vi.hoisted(() => ({
  ticket: null as unknown as HelpTicket,
  replies: [] as unknown as HelpMessage[],
  stakeholders: [] as unknown as unknown[],
  // COUNTS how many times the door was actually posted to - the test's own
  // proof that a click reached `acceptTriagedTicket` and not merely that the
  // button existed.
  triageReadCalls: 0,
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
      helpStakeholders: async () => ({ stakeholders: api.stakeholders }),
      helpStages: async () => EMPTY_STAGE_HISTORY,
      stories: async () => ({ stories: [], total: 0, nextCursor: null, hasMore: false }),
      sprints: async () => ({ sprints: [], total: 0 }),
      workLogs: async () => ({ logs: [], total: 0, totalSeconds: 0, nextCursor: null, hasMore: false }),
      workLogSummary: async () => ({
        total: 0,
        totalCapped: false,
        totalSeconds: 0,
        peopleTotal: 0,
        people: [],
        kinds: [],
        weeks: [],
      }),
      helpAttachments: async () => ({ attachments: [], total: 0 }),
      runningTimers: async () => ({ timers: [] }),
      // THE DOOR `acceptTriagedTicket` CALLS (tickets-collection.tsx: `return
      // contentApi.triageRead(id)`) - the SAME function `TriageQueue.accept`
      // and `HelpDetailScreen`'s own `triageDecide` both call. Mutates
      // `api.ticket` in place (status → "triaged", exactly what
      // `markTriaged`'s real UPDATE does for a COMPLETE ticket) so a
      // subsequent read off either cache key sees the move, the same as the
      // real door's `ticketMutationReply` does.
      triageRead: async (id: string) => {
        api.triageReadCalls += 1
        expect(id).toBe(api.ticket.id)
        api.ticket = { ...api.ticket, status: "triaged" as HelpStatus }
        return { tickets: [api.ticket], byType: {}, byStatus: {}, byAccount: [], id }
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

vi.mock("@shared/ui/components/sonner/sonner", () => ({
  toast: { success: () => {}, error: () => {}, info: () => {} },
  Toaster: () => null,
}))

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

window.matchMedia = ((query: string) => ({
  matches: query === "(min-width: 64rem)",
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia

import { HelpDetailScreen } from "@/components/tickets/help-detail"

afterEach(cleanup)
beforeEach(() => {
  perms.can.mockReset().mockReturnValue(true)
  window.history.pushState({}, "", "/tickets/help-1")
  api.replies = []
  api.stakeholders = [STAKEHOLDER]
  api.triageReadCalls = 0
})

const openTicket = (status: HelpStatus = "new") => {
  api.ticket = { ...BASE_TICKET, status } as HelpTicket
  return render(<HelpDetailScreen teamId="team-1" helpId="help-1" myUserId="u-1" basePath="/tickets" />)
}

describe("clicking Accept on a COMPLETE ticket's head advances it past 'new' (reproof 20, item 3)", () => {
  it("shows the triage Accept button while status is 'new', and no Close button yet", async () => {
    openTicket("new")
    await screen.findByRole("heading", { level: 1 })
    const row = document.querySelector('[data-slot="head-actions-row"]') as HTMLElement
    expect(within(row).getByRole("button", { name: "Accept" })).toBeTruthy()
    expect(within(row).queryByRole("button", { name: "Close" })).toBeNull()
  })

  it("moves the ticket to 'triaged' and swaps the head to the triaged-stage actions (Close), Accept gone", async () => {
    openTicket("new")
    await screen.findByRole("heading", { level: 1 })
    const row = document.querySelector('[data-slot="head-actions-row"]') as HTMLElement
    const acceptButton = within(row).getByRole("button", { name: "Accept" })

    fireEvent.click(acceptButton)

    // THE DOOR WAS ACTUALLY CALLED - not merely that a click landed somewhere.
    await waitFor(() => expect(api.triageReadCalls).toBe(1))

    // THE HEAD RE-DRAWS FOR THE NEW STAGE: Close appears (`canClose`, now that
    // `inTriageStage` - `ticket.status === "new"` - is false), and the triage
    // Accept button is gone, replacing rather than joining it (the same slot,
    // per help-detail.tsx's own header on this exact swap).
    await waitFor(() => {
      const liveRow = document.querySelector('[data-slot="head-actions-row"]') as HTMLElement
      expect(within(liveRow).getByRole("button", { name: "Close" })).toBeTruthy()
    })
    const liveRow = document.querySelector('[data-slot="head-actions-row"]') as HTMLElement
    expect(within(liveRow).queryByRole("button", { name: "Accept" })).toBeNull()
  })
})
