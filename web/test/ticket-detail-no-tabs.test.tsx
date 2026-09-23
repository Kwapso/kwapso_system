// V1 — THE TICKET'S ONE-PAGE BODY. Client ruling, 17 Sep 2026, verbatim: "I
// want to see, on one single screen with no tabs, the content of tickets:
// the stages, the kind of conversation with the customer, related stories,
// work logs, stakeholders. We currently, in our legacy system, have it on
// one page, and it's very practical. We don't want to change that." And her
// pick, the same day, over the decision page
// (https://claude.ai/artifact/34udsj1HpzcojN15Sq97tt): "For ticket 1 page, I
// choose to implement it v1."
//
// This file proves the shape the brief asked for, over a real render:
//   · no `tablist` renders anywhere on the ticket detail;
//   · the two-column body renders all four panels — Conversation, Related
//     stories, Work logs, Stakeholders;
//   · a `?tab=stories` deep link still resolves — it scrolls to the panel
//     rather than switching to a tab that no longer exists;
//   · Files and links is reachable from NEITHER the ⋯ menu NOR a tray inside
//     the conversation — see this file's own describe block below, and
//     help-detail.tsx's own header, for the two 18 Sep 2026 rulings that
//     took it there and then pulled it back out.
// `ticket-close-moved-to-top.test.tsx` already proves the mango Close button
// stays the title's one primary action, and the standalone Edit pen beside
// it — unaffected by this file's own change, so neither is re-proved here.
//
// AMENDED 17 Sep 2026 — the client's review of the deployed page retired the
// Stakeholders panel's own fact list (Type/App/Raised by/Raised on/Title/
// Raised from/Screen recording/Resolved) and its member picker, and asked
// that every related story show, uncapped, with no "Show all". The two
// describe blocks below that used to prove the OLD shapes ("the stakeholders
// panel carries the raiser facts") are replaced with what the page does now;
// `help-stakeholders.test.tsx` proves the panel component alone, and
// `help-form-dialog-loop-field.test.tsx` proves the picker's NEW home, in
// the edit sheet.

import * as React from "react"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type {
  HelpMessage,
  HelpStakeholder,
  HelpTicket,
  HelpStatus,
  Story,
  TeamMember,
  TicketMetrics,
  TicketStageHistory,
} from "@shared/types"

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

// THE EFFORT CARD'S OWN TWO FIXTURES — Aurora's ruling, 21 Sep 2026, B44
// amended: the ticket page gets the same three metric lines a story's
// already had, computed off `getTicketMetrics`. 90000s = 25h = 1d 1h;
// 5400s = 1.5h; 6%.
const TICKET_METRICS: TicketMetrics = { cycleTimeSeconds: 90000, effortSeconds: 5400, flowEfficiency: 6 }
const NO_TICKET_METRICS: TicketMetrics = { cycleTimeSeconds: null, effortSeconds: 0, flowEfficiency: null }

// THE WORK LOG ROW'S OWN FACE — matched to the fixture row's `userId`
// ("user-1") through `memberFace` (tickets-collection.tsx), the same lookup
// `<RecordMark>` reads.
const MEMBER_WITH_FACE: TeamMember = {
  userId: "user-1",
  email: "aurora@kwapso.com",
  firstName: "Aurora",
  lastName: null,
  imageUrl: "https://kwapso.example/aurora.png",
  roleId: "role-1",
  roleTitle: "Staff",
  isYou: false,
  isAdmin: false,
  isClient: false,
} as unknown as TeamMember

// THE RAISER — origin: "raiser", so the Raised-by tile itself renders
// (`(raiser || raisedByContactId)` in help-stakeholders.tsx) and the round-26
// horizontal-card describe block below has something to find.
const RAISER: HelpStakeholder = {
  userId: "u-raiser",
  name: "Marta Bergman",
  email: "marta@bergman.example",
  imageUrl: null,
  origin: "raiser",
} as unknown as HelpStakeholder

// Today, computed rather than hardcoded — `storyStatusWord`'s own default
// clock, the same shape `story-status-board.test.ts`'s own `TODAY`/`addDays`
// take, so this file never races a fixed date.
const TODAY = new Date().toISOString().slice(0, 10)
function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number)
  const dt = new Date(y!, (m ?? 1) - 1, (d ?? 1) + n)
  const pad = (v: number) => String(v).padStart(2, "0")
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
}

// FOUR RELATED STORIES — enough to prove "no cap" means something (V1 capped
// at five; two is not a cap-proving number on its own, but the type/status
// chip assertions below need only one, and a second row is what proves nothing
// besides `.slice(0, N)` was quietly reintroduced under a different name) —
// plus two more (story-3/story-4, below) proving the row's own status word
// now reads `storyStatusWord`, not the retired `STORY_STATUS_LABEL`: an open
// story reads "To Do" only inside an active phase, "Backlog" otherwise
// (Aurora's ruling, 21 Sep 2026).
const RELATED_STORIES = [
  {
    id: "story-1",
    ref: "BERG-S0188",
    title: "Fix the dispatch board's stuck spinner",
    status: "in_review",
    storyType: "Bug",
    ticketId: "help-1",
  },
  {
    id: "story-2",
    ref: "BERG-S0189",
    title: "Add a retry button to the dispatch board",
    status: "open",
    storyType: "Feature",
    ticketId: "help-1",
  },
  {
    id: "story-3",
    ref: "BERG-S0190",
    title: "Open story scheduled in a phase running today",
    status: "open",
    storyType: "Feature",
    ticketId: "help-1",
    sprintStartsOn: addDays(TODAY, -5),
    sprintEndsOn: addDays(TODAY, 5),
  },
  {
    id: "story-4",
    ref: "BERG-S0191",
    title: "Open story with no phase scheduled at all",
    status: "open",
    storyType: "Feature",
    ticketId: "help-1",
    sprintStartsOn: null,
    sprintEndsOn: null,
  },
] as unknown as Story[]

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

const api = vi.hoisted(() => ({
  ticket: null as unknown as HelpTicket,
  replies: [] as unknown as HelpMessage[],
  // Defaults to STAKEHOLDER alone (no "raiser" origin) so the Raised-by tile
  // stays OFF for every test that doesn't opt in — the pre-existing "fact
  // list is gone" test below relies on "Raised by" not rendering at all.
  // Only the round-26 horizontal-card describe block overrides this.
  stakeholders: null as unknown as unknown[],
  metrics: null as unknown,
  updateWorkLog: vi.fn(),
  members: [] as unknown[],
  workLogs: null as unknown as unknown[],
  timers: [] as unknown[],
}))

// THE DEFAULT WORK LOG ROW — ONE, NOT ZERO (R88, see the mock's own comment
// below).
const WORK_LOG_ROW = {
  id: "log-1",
  targetTable: "help",
  targetId: "help-1",
  targetLabel: "BERG-T0412",
  targetRef: "BERG-T0412",
  userId: "user-1",
  userName: "Aurora",
  kind: null,
  note: null,
  startedAt: "2026-08-18T09:00:00.000Z",
  endedAt: "2026-08-18T09:30:00.000Z",
  seconds: 1800,
  discarded: false,
  accountId: "acct-bergman",
}

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
      stories: async () => ({ stories: RELATED_STORIES, total: RELATED_STORIES.length, nextCursor: null, hasMore: false }),
      sprints: async () => ({ sprints: [], total: 0 }),
      // ONE ROW, NOT ZERO (R88) — this file's own panels are proved
      // POPULATED (the grid/card/paper structure every `it` below asserts),
      // and a genuinely empty Work logs panel now draws no title row at all
      // (`EmptyGatedPanel`, deep-link/screen-bits.tsx) — the shape
      // `empty-state-single-door.test.ts` proves on its own. A zero-row
      // fixture here would be testing that law by accident, on a title this
      // file needs present to find the panel by.
      workLogs: async () => ({
        logs: api.workLogs,
        total: api.workLogs.length,
        totalSeconds: 1800,
        nextCursor: null,
        hasMore: false,
      }),
      workLogSummary: async () => ({
        total: 1,
        totalCapped: false,
        totalSeconds: 1800,
        peopleTotal: 1,
        people: [{ userId: "user-1", userName: "Aurora", seconds: 1800 }],
        kinds: [],
        weeks: [],
      }),
      helpAttachments: async () => ({ attachments: [], total: 0 }),
      runningTimers: async () => ({ timers: api.timers }),
      helpMetrics: async () => api.metrics,
      updateWorkLog: api.updateWorkLog,
      // START/STOP — wired for "the Effort card's stat tiles update after a
      // real start/stop" below, the ticket page's own copy of the story
      // page's identical test (both read the same shared `refreshTimers`
      // seam, `web/components/shell/timer-bar.tsx`). BY REASSIGNMENT, never
      // in place — `useCached` compares by reference (see the story test's
      // own note).
      startTimer: async (targetTable: string, targetId: string) => {
        const startedAt = new Date().toISOString()
        const id = `timer-${targetTable}-${targetId}`
        api.timers = [
          ...api.timers,
          { id, targetTable, targetId, targetLabel: null, targetRef: null, startedAt, elapsedSeconds: 0, runaway: false },
        ]
        api.workLogs = [
          ...(api.workLogs as unknown[]),
          {
            id,
            targetTable,
            targetId,
            targetLabel: null,
            targetRef: null,
            userId: "user-1",
            userName: "Aurora",
            kind: null,
            note: null,
            startedAt,
            endedAt: null,
            seconds: 0,
            discarded: false,
            accountId: "acct-bergman",
          },
        ]
        return { timers: api.timers }
      },
      stopTimer: async (id: string) => {
        api.timers = (api.timers as { id: string }[]).filter((t) => t.id !== id)
        const stoppedAt = new Date().toISOString()
        api.workLogs = (api.workLogs as { id: string; startedAt: string }[]).map((l) =>
          l.id === id ? { ...l, endedAt: stoppedAt, seconds: 3 } : l
        )
        const totalSeconds = (api.workLogs as { seconds: number }[]).reduce((sum, l) => sum + (l.seconds || 0), 0)
        api.metrics = { cycleTimeSeconds: 3, effortSeconds: totalSeconds, flowEfficiency: 100 }
        return { timers: api.timers }
      },
    },
    tenancy: {
      ...actual.tenancy,
      members: async () => ({ members: api.members }),
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

// `EdgePanel` (the Files sheet, the Related-stories "Show all" sheet) reads
// this to size itself against the viewport — undefined in jsdom otherwise.
//
// R89 BELOW-LG RE-FIX, 19 Sep 2026 — an UNCONDITIONAL assignment now,
// not `??=`: `web/test/setup.ts` already stubs `matchMedia` globally
// (honest jsdom default, `matches: false` for every query), so this line's
// own `??=` had been a no-op since that global landed. `TicketDetailBody`
// now picks its LG-vs-below-lg TREE with a real `matchMedia` breakpoint
// hook (`ticket-detail-body.tsx`'s own `useIsAtLeastLg`), never a `lg:`
// class left for the browser to resolve, so this file's whole assertion
// set — written against the desktop, 2fr/1fr shape — needs that ONE query
// (`64rem`, matching Tailwind's own `lg:`) answered `true`; every other
// query (reduced-motion, `EdgePanel`'s own read) keeps the honest `false`.
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

import { FooterSlotProvider } from "@/components/shell/footer-slot"
import { HelpDetailScreen } from "@/components/tickets/help-detail"
import { TICKET_PANEL_ANCHOR } from "@/components/tickets/ticket-detail-body"

afterEach(cleanup)
beforeEach(() => {
  perms.can.mockReset().mockReturnValue(true)
  window.history.pushState({}, "", "/tickets/help-1")
  api.replies = []
  api.stakeholders = [STAKEHOLDER]
  api.metrics = TICKET_METRICS
  api.updateWorkLog.mockReset().mockResolvedValue({ logs: [], total: 0, totalSeconds: 0, nextCursor: null, hasMore: false })
  api.members = [MEMBER_WITH_FACE]
  api.workLogs = [WORK_LOG_ROW]
  api.timers = []
})

/* THE SHELL'S FOOTER SLOT, STOOD IN FOR, 22 Sep 2026, kit v1.2.155.
 *
 * The dark band is not the page's own last child any more: the page renders
 * it through `<ScreenFooterSlot>`, which portals it into the host
 * `app-shell.tsx` hands `ScreenShell`'s own `footer` slot. The kit then draws
 * that host inside the one scroller and OUTSIDE the body's padded stack, as
 * the `mt-auto` last child of a `min-h-full` column, which is the whole
 * point: a short record's band lands on the pane's own bottom edge with no
 * paper under it.
 *
 * `AppShell` is not mounted in these tests, so the host is stood in for here
 * AND PLACED LAST inside the same container, exactly where the kit places it
 * relative to the body. That keeps any reading-order assertion a real
 * statement about the rendered page rather than an artefact of where the
 * stand-in happens to sit. */
function WithFooterSlot({ children }: { children: React.ReactNode }) {
  const [host, setHost] = React.useState<HTMLDivElement | null>(null)
  return (
    <>
      <FooterSlotProvider host={host}>{children}</FooterSlotProvider>
      <div data-slot="screen-shell-footer" ref={setHost} />
    </>
  )
}

const openTicket = (status: HelpStatus = "triaged") => {
  api.ticket = { ...BASE_TICKET, status } as HelpTicket
  return render(
    <WithFooterSlot>
      <HelpDetailScreen teamId="team-1" helpId="help-1" myUserId="u-1" basePath="/tickets" />
    </WithFooterSlot>
  )
}

describe("the ticket detail draws no tabs", () => {
  it("renders no tablist anywhere on the screen", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    expect(screen.queryByRole("tablist")).toBeNull()
    expect(screen.queryByRole("tab")).toBeNull()
  })
})

describe("the two-column body renders all four panels", () => {
  it("draws the conversation, Related stories, Effort and Stakeholders together, nothing behind a click", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })

    // CONVERSATION — the request itself, on the thread.
    expect(await screen.findByText("None of my drivers can see today's routes.")).toBeTruthy()
    expect(document.querySelector('[data-slot="ticket-thread"]')).toBeTruthy()
    expect(document.querySelector('[data-slot="reply-composer"]')).toBeTruthy()

    // RELATED STORIES — the panel's own title.
    expect(screen.getByText("Related stories")).toBeTruthy()

    // EFFORT, the panel's own title — a heading, disambiguated from the
    // metrics grid's own "Time log" line inside the same card.
    expect(screen.getByRole("heading", { name: /^Time log/ })).toBeTruthy()

    // STAKEHOLDERS — the panel's own title, and the people pill inside it.
    expect(screen.getByText("Stakeholders")).toBeTruthy()
    expect(await screen.findByText("Aurora")).toBeTruthy()

    // ALL FOUR IN ONE RENDER — no tab press got any of them onto the page.
  })

  it("stands each panel on its own paper — plain (rulebook L43) for Related stories/Effort/Stakeholders, still boxed for the conversation", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    const stories = screen.getByText("Related stories").closest('[data-slot="card"]')
    const time = screen.getByRole("heading", { name: /^Time log/ }).closest('[data-slot="card"]')
    const stakeholders = screen.getByText("Stakeholders").closest('[data-slot="card"]')
    const conversation = (document.querySelector('[data-slot="ticket-thread"]') as HTMLElement).closest(
      '[data-slot="card"]'
    )
    // R67 (18 Sep 2026) put these four on `default` (`--surface-panel`, soft
    // paper), NOT `raised` (`--card`), once `RecordScreen` stopped wrapping
    // the body in its own outer Card. RULEBOOK L43 (Aurora, 21 Sep 2026) goes
    // one step further for three of them: the grouping cards around Related
    // stories, Effort and Stakeholders drop their box entirely —
    // `Card variant="plain"` (kit v1.2.145, `surface="plain"` at
    // help-detail.tsx's own call sites) — and sit directly on the page's own
    // white main content. The conversation card is untouched by the ruling
    // (help-detail.tsx never passes `surface` to `TicketConversationPanel`)
    // and stays `default`, exactly R67's own answer.
    for (const card of [stories, time, stakeholders]) {
      expect(card, "every one of the three panels stands on a real Card").toBeTruthy()
      expect(card!.getAttribute("data-variant")).toBe("plain")
      expect(card!.getAttribute("data-surface")).toBe("plain")
    }
    expect(conversation, "the conversation panel stands on a real Card").toBeTruthy()
    expect(conversation!.getAttribute("data-variant")).toBe("default")
  })

  it("draws no second, outer panel card around the four of them (18 Sep 2026 container ruling)", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    // The kit's own record panel region carries this attribute
    // (record-detail.tsx: `data-record-region="panel"`) — `RecordScreen`'s
    // `panelVisible={false}` means `RecordDetail` never draws that Card at
    // all, so the attribute must not appear anywhere on the page.
    expect(document.querySelector('[data-record-region="panel"]')).toBeNull()
  })
})

// AURORA, 21 SEP 2026, B44 AMENDED, verbatim: "ok, but i still want to see
// the individual records of time og! also show avatar of perosn. bring back
// the old cards with the metrics inside effort" and "in effort card inside
// stories or tickets, rmeove the + button (we have the start on top!)." The
// ticket page draws the same shared `<EffortCard>`
// (web/components/work/effort-card.tsx) the story page draws — metrics
// (computed off `getTicketMetrics`, `POST /api/content/help/metrics`), the
// individual time log rows with a face, and no add door anywhere.
describe("Effort — the ticket gets the same card, metrics and rows and no add door", () => {
  // AMENDED, 22 Sep 2026 — Aurora, verbatim: "next to effort show the count
  // of record, not the total hours (that has a metric on itself)." The
  // title's own count is the NUMBER of time log records now, never hours.
  it("carries the record count beside the Effort title", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    const heading = await screen.findByRole("heading", { name: /^Time log/ })
    // One WORK_LOG_ROW fixture.
    expect(heading.textContent).toBe("Time log1")
  })

  // AMENDED, 22 Sep 2026 — Aurora, verbatim: "make the metrics cards inside
  // the container, like in the metrics artifact you did for me!" Real
  // `<StatGrid>` tiles now; the middle one reads "Hours logged" since the
  // title's own count already answers "Time log".
  it("renders the door's own cycle time, effort hours and flow efficiency as stat tiles", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    // 90000s = 25h = 1d 1h; 5400s = 1.5h; 6%.
    expect(await screen.findByText("1d 1h")).toBeTruthy()
    expect(await screen.findByText("Hours logged")).toBeTruthy()
    expect(await screen.findByText("6%")).toBeTruthy()
    // "1.5h" appears once now — the tile's own figure, not repeated by the
    // title, which carries the record count instead.
    expect(screen.getAllByText("1.5h").length).toBe(1)
  })

  // AMENDED AGAIN, 22 Sep 2026, same day: Aurora, verbatim, "good. add kind
  // of card background behind cards, this is a metric, like in kit." Each
  // tile's own figure sits inside its own kit `<Card>`, proven by walking up
  // from the value to the nearest `[data-slot="card"]`.
  //
  // THE TONE FLIPPED ON 21 SEP 2026 (rulebook L43) AND HER SENTENCE DID NOT.
  // This read `"raised"` while the panel around the tiles was a painted card.
  // The panel is plain now, so a tile's ground is the PAGE, and `raised`
  // (`--card`) IS the page's own colour in light: the tiles would have
  // measured 1.000 and been held up by their shadow alone. `default` is soft
  // paper, 1.103 against the page, and it is what her own comparison already
  // pointed at -- the kit's own `StatGrid` tile is a `Card variant="default"`.
  it("draws each metric tile inside its own kit card, on soft paper, not bare", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    const cycleValue = await screen.findByText("1d 1h")
    const tileCard = cycleValue.closest('[data-slot="card"]')
    expect(tileCard).toBeTruthy()
    expect(tileCard?.getAttribute("data-variant")).toBe("default")
  })

  it("reads 'Not started' and 'No time log' before any work is logged, with the record count beside the title", async () => {
    api.metrics = NO_TICKET_METRICS
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    expect(await screen.findByText("Not started")).toBeTruthy()
    expect(await screen.findByText("No time log")).toBeTruthy()
    // The one WORK_LOG_ROW fixture is still logged even though the metrics
    // door has nothing to say yet.
    const heading = await screen.findByRole("heading", { name: /^Time log/ })
    expect(heading.textContent).toBe("Time log1")
  })

  // DEFECT (live proof, 21 Sep 2026): the Effort card's own stat tiles
  // stayed on their BEFORE-the-timer values after a real Start-then-Stop of
  // a very short (3 second) timer, until a full reload — the ticket page's
  // own copy of the story page's identical bug (both read the same shared
  // `refreshTimers` seam, `web/components/shell/timer-bar.tsx`, which
  // invalidated `recordTimeKey` (the ROWS) on every start/stop but never
  // `help:metrics:<id>` (the door behind these three TILES)).
  it("moves off 'Not started' / 'No time log' once a short timer is stopped, no reload", async () => {
    api.metrics = NO_TICKET_METRICS
    openTicket()
    await screen.findByRole("heading", { level: 1 })

    // BEFORE: the metrics door has nothing to say yet.
    await screen.findByText("Not started")
    expect(screen.getByText("No time log")).toBeTruthy()

    const startButton = await screen.findByRole("button", { name: /^Start/ })
    fireEvent.click(startButton)

    const stopButton = await screen.findByRole("button", { name: /Stop timer/ })
    fireEvent.click(stopButton)

    // AFTER: real figures, not the stale placeholder words.
    await waitFor(() => {
      expect(screen.queryByText("Not started")).toBeNull()
      expect(screen.queryByText("No time log")).toBeNull()
    })
    expect(screen.getByText("100%")).toBeTruthy()
  })

  it("draws the individual time log rows with a face, name, date and duration", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    const panel = screen.getByRole("heading", { name: /^Time log/ }).closest('[data-slot="card"]') as HTMLElement
    const list = panel.querySelector('[data-slot="effort-log-rows"]')
    expect(list, "the row list is drawn").toBeTruthy()
    const row = list!.querySelector('[role="listitem"]') as HTMLElement
    expect(row).toBeTruthy()
    expect(row.textContent).toContain("Aurora")
    expect(row.textContent).toContain("2026-08-18")
    expect(row.textContent).toContain("30m")
    const face = row.querySelector("img")
    expect(face).toBeTruthy()
    expect(face!.getAttribute("src")).toBe(MEMBER_WITH_FACE.imageUrl)
  })

  // AMENDED, 22 Sep 2026 — Aurora, from the task review, verbatim: "if no
  // time logged yet, hide that component." Stricter than R88's own
  // header-only drop: at zero rows the card renders NOTHING at all, not
  // even the body's own "No time logged yet." sentence.
  it("renders nothing at all — no card, no sentence — once the ticket has no time at all", async () => {
    api.metrics = NO_TICKET_METRICS
    api.workLogs = []
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    // The rest of the page still settles.
    await screen.findByText("Stakeholders")
    expect(screen.queryByText("No time logged yet.")).toBeNull()
    expect(screen.queryByRole("heading", { name: /^Time log/ })).toBeNull()
    expect(screen.queryByRole("button", { name: "Add the first" })).toBeNull()
  })

  it("draws no add / Log time button anywhere on the card", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    expect(screen.queryByRole("button", { name: "Log time" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Add the first" })).toBeNull()
  })

  // AMENDED, 22 Sep 2026 — Aurora, verbatim: "remove the pencil. when
  // clicking one detail in slide in, and there have the option to edit."
  // No pencil icon any more: the row itself is the button, and Save writes
  // through the same door the pencil used to.
  it("draws no pencil — clicking a row opens the slide-in sheet, and Save corrects it through the same update door", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    const panel = screen.getByRole("heading", { name: /^Time log/ }).closest('[data-slot="card"]') as HTMLElement
    const row = panel.querySelector('[data-slot="effort-log-rows"] [role="listitem"] button') as HTMLElement
    expect(row, "the row itself is a button now, not a pencil beside it").toBeTruthy()
    fireEvent.click(row)
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByRole("heading", { name: "Correct this time" })).toBeTruthy()
    fireEvent.click(within(dialog).getByRole("button", { name: /submit/i }))
    await waitFor(() => expect(api.updateWorkLog).toHaveBeenCalled())
    expect(api.updateWorkLog.mock.calls[0][0].id).toBe(WORK_LOG_ROW.id)
  })
})

// AMENDED 17 Sep 2026 — client ruling, reading the deployed page back,
// verbatim: "Remove all of this from stakeholders 'Pick someone to keep in
// the loop … Type Issue App Kwapso System Raised by Max Mustermann Raised on
// Sep 16, 2026 (1 days ago) Title Title (English) Ticket and story titles
// Raised from Screen recording Resolved … You can add members, but no one is
// ever removed.'" The panel keeps only the people themselves.
describe("the stakeholders panel is faces + names only", () => {
  it("renders the stakeholder's name and no fact list, no picker, no intro sentence", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    const panel = screen.getByText("Stakeholders").closest('[data-slot="card"]') as HTMLElement
    expect(within(panel).getByText("Aurora")).toBeTruthy()

    // THE FACT LIST IS GONE — every label the old OverviewList drew.
    for (const label of ["Type", "Raised by", "Raised on", "Raised from", "Screen recording", "Resolved"]) {
      expect(within(panel).queryByText(label), `"${label}" must not render in the panel any more`).toBeNull()
    }
    // THE PICKER AND ITS SENTENCES ARE GONE — moved to the edit sheet
    // (help-form-dialog-loop-field.test.tsx proves the new home).
    expect(within(panel).queryByText("Pick someone to keep in the loop")).toBeNull()
    expect(within(panel).queryByText("You can add members, but no one is ever removed.")).toBeNull()
    // THE OLD INTRO SENTENCE IS GONE TOO.
    expect(
      within(panel).queryByText("Everyone kept in the loop on this ticket, the person who raised it, your admins, and anyone mentioned.")
    ).toBeNull()
  })
})

// CLIENT RULING, 17 Sep 2026, verbatim: "In the section 'Related Stories',
// also show the type as a chip with the icon and the color dot for the
// status. Remove 'Show All' because you need to show them all."
describe("related stories show every row, uncapped, with a type chip and a status dot", () => {
  it("renders every related story with no 'Show all' link", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    const panel = screen.getByText("Related stories").closest('[data-slot="card"]') as HTMLElement
    expect(within(panel).getByText("Fix the dispatch board's stuck spinner")).toBeTruthy()
    expect(within(panel).getByText("Add a retry button to the dispatch board")).toBeTruthy()
    expect(within(panel).queryByRole("button", { name: "Show all" })).toBeNull()
  })

  it("carries the story's own TYPE as a chip with its icon, and STATUS as a coloured dot", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    const panel = screen.getByText("Related stories").closest('[data-slot="card"]') as HTMLElement
    const row = within(panel).getByText("Fix the dispatch board's stuck spinner").closest("li") as HTMLElement
    // THE TYPE CHIP — plain, quiet (never coloured — R86 reserves colour for
    // status), carrying the word AND an icon glyph beside it.
    expect(within(row).getByText("Bug")).toBeTruthy()
    expect(row.querySelector("svg")).toBeTruthy()
    // THE STATUS — a coloured dot badge, `variant="status"`, never plain
    // `variant="secondary"` the way it drew before this ruling.
    const statusBadge = within(row).getByText("In review").closest('[data-slot="badge"]') as HTMLElement
    expect(statusBadge.getAttribute("data-dot")).toBe("review")
  })

  it("offers 'New story' on the panel's own title row, replacing the old 'Show all' door to it", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    const panel = screen.getByText("Related stories").closest('[data-slot="card"]') as HTMLElement
    expect(await within(panel).findByRole("button", { name: "New story" })).toBeTruthy()
  })

  // R96's own wave-lane finding: `help-detail.tsx` used to import the retired,
  // UNCONDITIONAL `STORY_STATUS_LABEL` (open -> "Backlog", always) for this
  // exact row; every other surface already reads `storyStatusWord`, which asks
  // whether the story's own phase is active TODAY. Proves the row now agrees
  // with the rest of the app rather than carrying its own, older answer.
  it("an open story's status word says 'To Do' only inside an active phase, 'Backlog' otherwise", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    const panel = screen.getByText("Related stories").closest('[data-slot="card"]') as HTMLElement

    const activeRow = within(panel)
      .getByText("Open story scheduled in a phase running today")
      .closest("li") as HTMLElement
    expect(within(activeRow).getByText("To Do")).toBeTruthy()
    expect(within(activeRow).queryByText("Backlog")).toBeNull()

    const noPhaseRow = within(panel)
      .getByText("Open story with no phase scheduled at all")
      .closest("li") as HTMLElement
    expect(within(noPhaseRow).getByText("Backlog")).toBeTruthy()
    expect(within(noPhaseRow).queryByText("To Do")).toBeNull()
  })
})

// AMENDED 18 Sep 2026, TWICE THE SAME DAY. First: client ruling, verbatim:
// "kill this whole files & links … button. those are visible in the
// conversation itself! the customers can attach images & files. so do we." —
// the ⋯ menu item and its EdgePanel sheet went, and `<HelpAttachmentsPanel>`
// was mounted inline inside the Conversation card instead. Then, reading
// THAT shape deployed, a second ruling pulled it again, verbatim: "wtf is
// his files inside the ocnversation lol thats not what i meant, i meant
// that each message can have images or files, check in the kit because we
// already biult the ui for that." So there is no ⋯ menu item (unchanged
// from the first ruling) AND no inline tray any more either — the panel is
// `PARKED` (shared/rules/registry.ts, "tickets/help-attachments") until
// per-message attachments have a door to read from (help-detail.tsx's own
// header carries the exact migration this needs).
describe("files are neither behind the ⋯ menu nor in a tray inside the conversation", () => {
  it("draws no 'Files and links' item in the ⋯ menu", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    // Scoped to the WIDE actions row (`shared/web/head-actions.tsx`'s own
    // `HEAD_ACTIONS_ROW_CLASS`, 18 Sep 2026's narrow-width fold) — the chip
    // row now carries a SECOND "More actions" trigger for the folded width
    // (`HeadActionsFoldMenu`), same accessible name by design (both are the
    // record's one overflow menu; only jsdom, which loads no CSS and so
    // never resolves either `@min-[24rem]` half of the fold, would find both
    // at once). `web/test/head-actions-fold.test.tsx` owns the fold's own
    // contract; this test still only means the row it always meant.
    const trigger = within(
      document.querySelector('[data-slot="head-actions-row"]') as HTMLElement
    ).getByRole("button", { name: "More actions" })
    fireEvent.pointerDown(trigger, { button: 0, pointerId: 1 })
    fireEvent.pointerUp(trigger, { button: 0, pointerId: 1 })
    fireEvent.click(trigger)
    expect(screen.queryByRole("menuitem", { name: "Files and links" })).toBeNull()
  })

  it("draws no attachments tray inside the conversation card either — the panel is parked, not inline", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    const conversation = (document.querySelector('[data-slot="ticket-thread"]') as HTMLElement).closest(
      '[data-slot="card"]'
    ) as HTMLElement
    // Neither the tray's own caption nor the panel's empty-state sentence
    // (help-attachments.tsx) renders anywhere — the whole panel is unmounted
    // on this screen, not merely relabelled.
    expect(within(conversation).queryByText("Files and links")).toBeNull()
    expect(within(conversation).queryByText("Nothing attached to this ticket yet.")).toBeNull()
    // THE COMPOSER'S OWN ATTACH BUTTON IS BACK (team migration 0105) — see
    // this file's own composer describe block below for the dedicated
    // assertion of what it does now that per-message attachments have a door.
  })
})

describe("?tab= still resolves — it scrolls instead of switching", () => {
  it("scrolls to the Related stories panel for a ?tab=stories deep link", async () => {
    window.history.pushState({}, "", "/tickets/help-1?tab=stories")
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled())
    // Called ON the Related stories panel's own DOM anchor, not some other
    // element — the anchor is the ancestor `scrollIntoView` was invoked on.
    const storiesHeading = screen.getByText("Related stories")
    const calledOn = scrollIntoView.mock.instances[0] as unknown as HTMLElement
    expect(calledOn.contains(storiesHeading)).toBe(true)
  })

  it("scrolls to the Conversation panel for a ?tab=files deep link, rather than opening a sheet that no longer exists", async () => {
    window.history.pushState({}, "", "/tickets/help-1?tab=files")
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled())
    const thread = document.querySelector('[data-slot="ticket-thread"]') as HTMLElement
    const calledOn = scrollIntoView.mock.instances[0] as unknown as HTMLElement
    expect(calledOn.contains(thread)).toBe(true)
    // NO ATTACHMENTS TRAY WAITS THERE ANY MORE — the 18 Sep 2026 correction
    // (see this file's own "files are neither behind the ⋯ menu nor in a
    // tray" describe block, above) pulled it; `files` now lands on the
    // nearest real panel, Conversation, and nothing more.
    expect(screen.queryByText("Nothing attached to this ticket yet.")).toBeNull()
  })

  it("lands on the page with no error for a plain deep link (no ?tab= at all)", async () => {
    window.history.pushState({}, "", "/tickets/help-1")
    openTicket()
    expect(await screen.findByRole("heading", { level: 1 })).toBeTruthy()
    expect(screen.getByText("Related stories")).toBeTruthy()
  })
})

// SUPERSEDED FOUR TIMES, R89 "footer-on-the-edge" — see the earlier
// accounts kept in this file's own git history (the original "addition of
// the three of the right" grid, round 23's composer-pinned-outside-
// every-card construction, and round 24's h-full/overflow-y-auto-on-both-
// cells grid, replaced below).
//
// ROUND 27, 19 Sep 2026, THE SIDE COLUMN NEVER SCROLLS — Aurora, over the
// live page: "there should be no scrolling to see all right column items —
// expand the height!" / "scroll only on conversation when taller than
// right column." Round 24's grid (`h-full min-h-0` on the grid AND the
// side column, `overflow-y-auto` on the side column) forced the row to
// fill the whole scrolling region regardless of content, so a short ticket
// showed the side column scrolling in its own little box while the
// conversation card sat mostly empty beside it — backwards. Now: the grid
// itself carries NEITHER `h-full` NOR `min-h-0` (content-sized, like any
// ordinary block); the side column carries NEITHER `h-full` NOR
// `overflow-y-auto` (natural height, never scrolling — proof lives in
// `ticket-detail-body.tsx`'s own header); the conversation CELL carries
// `relative min-h-0`, no height class of its own — `items-stretch`
// resolves it to whatever the row resolved to (the side column's own
// height); and the conversation CARD is pulled out of flow
// (`fill="absolute"`, `position: absolute; inset: 0`) so it contributes
// ZERO intrinsic height to the row, the one piece that keeps a forty-
// message thread from dragging the whole row (and the side column with
// it) taller. `ticket-detail-body.tsx`'s own header carries the full
// account and the live proof numbers (`${SCRATCH}/row-proof.json`).
//
// ROUND 28, ONE PAGE SCROLL, NO INNER SCROLLBAR, 19-20 Sep 2026 — the region
// wrapping this grid dropped its own `flex-1 min-h-0 overflow-y-auto`
// (that WAS the inner scrollbar a dark-theme screenshot caught); the root
// dropped `min-h-0` (keeping `flex-1`); the band dropped `sticky` for
// `mt-auto`. See `ticket-detail-body.tsx`'s own header for the full
// account and `${SCRATCH}/onescroll-proof2.json` for the live numbers.
describe("at lg, the scroll region's own grid pairs the conversation with the side panels (R89 round 27)", () => {
  it("the grid and the side column are content-sized (no h-full/min-h-0/overflow-y-auto); the conversation cell is relative min-h-0, stretched by the grid to the side column's own height", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    const conversationAnchor = document.getElementById(TICKET_PANEL_ANCHOR.conversation) as HTMLElement
    const grid = conversationAnchor.parentElement as HTMLElement
    expect(grid.className).toContain("grid-cols-[2fr_1fr]")
    expect(grid.className).toContain("items-stretch")
    // ROUND 27 — an explicit-height grid with one `auto` row would let
    // `align-content`'s own default `stretch` hand that row the FULL
    // container height regardless of content, which is what forced the
    // side column's own internal scrollbar. The grid is content-sized now.
    expect(grid.className).not.toContain("h-full")
    expect(grid.className).not.toContain("min-h-0")

    // THE CONVERSATION CELL — no height class of its own; `relative` is
    // what lets its own Card resolve `inset-0` against ITS bounds once
    // `items-stretch` has sized the cell to the row.
    expect(conversationAnchor.className).toContain("relative")
    expect(conversationAnchor.className).toContain("min-h-0")
    expect(conversationAnchor.className).not.toContain("h-full")

    // ROUND 28 (R89/R91) — the region wrapping the grid is a PLAIN,
    // content-sized block now: no overflow-y-auto (the inner scrollbar
    // Aurora's dark-theme screenshot caught), no flex-1/min-h-0 of its own.
    const scrollRegion = grid.parentElement as HTMLElement
    expect(scrollRegion.className).not.toContain("overflow-y-auto")
    expect(scrollRegion.className).not.toContain("flex-1")
    expect(scrollRegion.className).not.toContain("min-h-0")

    const ticketBodyRoot = scrollRegion.parentElement as HTMLElement
    expect(ticketBodyRoot.getAttribute("data-slot")).toBe("ticket-detail-body")
    expect(ticketBodyRoot.firstElementChild).toBe(scrollRegion)
    // The ROOT itself still grows (flex-1) but no longer carries min-h-0 —
    // flexbox's own automatic minimum size is what lets it grow past its
    // own leftover-space floor instead of clamping to it.
    expect(ticketBodyRoot.className).toContain("flex-1")
    expect(ticketBodyRoot.className).not.toContain("min-h-0")

    // THE SIDE PANELS SHARE THE SAME GRID, ONE CELL, NATURAL HEIGHT,
    // NEVER SCROLLING (round 27 — the whole point of this round).
    const storiesAnchor = document.getElementById(TICKET_PANEL_ANCHOR.stories) as HTMLElement
    const timeAnchor = document.getElementById(TICKET_PANEL_ANCHOR.time) as HTMLElement
    const stakeholdersAnchor = document.getElementById(TICKET_PANEL_ANCHOR.stakeholders) as HTMLElement
    // TWO BOXES SINCE 21 SEP 2026, NOT ONE (rulebook L43, kit v1.2.149): the
    // grid CELL, and the kit's own `RecordSections` inside it, which is the
    // plain section stack that draws a hairline between consecutive visible
    // sections. `ticket-detail-body.tsx` used to run that walk by hand in the
    // cell itself; the kit owns the seam now, so the anchors' parent is the
    // stack and the stack's parent is the cell. Round 27's real invariant is
    // unchanged and is asserted on BOTH: neither may bound its own height or
    // scroll, because the row is meant to resolve to the side column's own
    // natural height.
    const sectionStack = storiesAnchor.parentElement as HTMLElement
    expect(sectionStack.getAttribute("data-slot"), "the stack is the kit's own RecordSections").toBe(
      "record-sections"
    )
    const sideColumn = sectionStack.parentElement as HTMLElement
    expect(sideColumn.parentElement).toBe(grid)
    expect(timeAnchor.parentElement).toBe(sectionStack)
    expect(stakeholdersAnchor.parentElement).toBe(sectionStack)
    expect(sideColumn.className).toContain("flex-col")
    expect(sideColumn.className).toContain("gap-6")
    expect(sectionStack.className, "the kit stack spends the same 24 as a token").toContain(
      "gap-[var(--space-6)]"
    )
    for (const box of [sideColumn, sectionStack]) {
      expect(box.className).not.toContain("h-full")
      expect(box.className).not.toContain("min-h-0")
      expect(box.className).not.toContain("overflow-y-auto")
    }
  })

  it("the conversation card holds the composer again, as its own CardFooter, absolutely positioned to fill its cell — 'rewind here', by construction now", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    const conversationCard = (document.querySelector('[data-slot="ticket-thread"]') as HTMLElement).closest(
      '[data-slot="card"]'
    ) as HTMLElement
    const footer = conversationCard.querySelector('[data-slot="card-footer"]')
    expect(footer, "the composer's own CardFooter must nest inside the conversation card again").toBeTruthy()
    expect(conversationCard.lastElementChild).toBe(footer)
    // ROUND 27 — `fill="absolute"` at lg: taken out of flow so the CELL
    // (not the card) is what the grid stretches, and the card itself
    // contributes no intrinsic height back to the row.
    expect(conversationCard.className).toContain("absolute")
    expect(conversationCard.className).toContain("inset-0")
    expect(conversationCard.className).toContain("min-h-0")
    expect(conversationCard.className).not.toContain("h-full")
  })

  it("the composer form's own width equals the card's inner width, never the page's", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    const composerForm = document.querySelector('[data-slot="reply-composer"]') as HTMLElement
    expect(composerForm.className).toContain("w-full")
    const composerFooter = composerForm.parentElement!.parentElement as HTMLElement
    expect(composerFooter.getAttribute("data-slot")).toBe("card-footer")
    const conversationCard = composerFooter.parentElement as HTMLElement
    expect(conversationCard.getAttribute("data-slot")).toBe("card")
    // The composer's own CardFooter is NOT the ticket body's root any
    // more — that is the band's own place now (below).
    expect(conversationCard.contains(composerFooter)).toBe(true)
  })

  it("the band (Latest activity + Record) renders through the shell's footer slot, never inside the ticket body", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })

    // THE SLOT IS WHERE IT LANDS, 22 Sep 2026, kit v1.2.155. Until then the
    // band was the ticket body's own `flex-none mt-auto w-full` last child,
    // carrying this page's own marker, reaching the bottom of a box that
    // itself stopped `DENSITY_BODY`'s reserved `padding-bottom` short of the
    // pane: 24px of paper under it at every desktop width, 115px at 760.
    // The band is portalled into `ScreenShell`'s own footer node now, which
    // the kit draws OUTSIDE the body's padded stack.
    const footerCards = document.querySelectorAll('[data-record-region="footer"]')
    expect(footerCards.length, "exactly one ink footer on the page, RecordScreen's own copy stays switched off").toBe(1)
    const band = footerCards[0] as HTMLElement

    const slot = document.querySelector('[data-slot="screen-shell-footer"]') as HTMLElement
    expect(slot, "the shell's own footer slot must be the band's host").toBeTruthy()
    expect(slot.contains(band), "the band must render inside the shell's footer slot").toBe(true)

    const ticketBodyRoot = document.querySelector('[data-slot="ticket-detail-body"]') as HTMLElement
    expect(ticketBodyRoot, "the ticket body must still render").toBeTruthy()
    expect(
      ticketBodyRoot.contains(band),
      "the band must NOT be inside the ticket body any more, that box is inside the shell's padded stack, which is what put paper under it"
    ).toBe(false)

    // THE PAGE'S OWN MARKER IS GONE WITH THE WRAPPER IT NAMED. Nothing is
    // left here to mark: the wrapper that carries `mt-auto` is the kit's
    // `screen-shell-footer`, and the column it spends that slack in is
    // `screen-shell-column`.
    expect(document.querySelector('[data-slot="ticket-footer-band"]')).toBeNull()

    // ROUND 26'S PANEL GAP SURVIVES, on the body's own root, between the two
    // things that column actually holds now.
    expect(ticketBodyRoot.className).toContain("gap-6")
    expect(ticketBodyRoot.className).toContain("flex-1")
  })
})

// CLIENT RULING, 19 Sep 2026, VERBATIM: "for stakeholder, raised by, use a
// horizontal card (avatar on the left, raised by + name on the right one on
// top of the other)." Supersedes the 18 Sep "keep Raised by as one tile"
// VERTICAL shape — see help-stakeholders.tsx's own header for the full
// account. `help-stakeholders.test.tsx` proves the component in isolation;
// this describe block proves it renders horizontally on the real page too.
// SUPERSEDED 21 Sep 2026 — Aurora, verbatim, reviewing the ticket detail whose
// side sections are now plain cards: "stakeholders raised by design like in
// the loop (chip like)." The 19 Sep 2026 horizontal-card shape this describe
// block used to prove (the eyebrow drawn INSIDE `PersonCard`'s own column) is
// gone: Raised by is a face+name chip now, the loop's own shape, with the
// eyebrow sitting OUTSIDE the chip, above it — see help-stakeholders.tsx and
// web/test/help-stakeholders.test.tsx for the full account.
describe("the raised-by tile is a face+name chip, like the loop (21 Sep 2026 ruling)", () => {
  it("draws the raiser's face and name as a chip, with 'Raised by' as a label above it, no raised tile around it", async () => {
    api.stakeholders = [STAKEHOLDER, RAISER]
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    const chipEl = await screen.findByText("Raised by")
    const tile = chipEl.closest('[data-slot="stakeholder-card"]') as HTMLElement
    expect(tile).toBeTruthy()
    expect(tile.getAttribute("data-variant")).toBeNull()
    expect(tile.querySelector('[data-slot="card"]')).toBeNull()
    // Scoped to the tile itself — "Marta Bergman" also appears as the
    // thread's own message-sender name, elsewhere on the page.
    const nameEl = within(tile).getByText("Marta Bergman")
    expect(tile.contains(nameEl), "the name sits in the same tile as the eyebrow").toBe(true)
    // The eyebrow is no longer stacked inside the name's own PersonCard
    // column — it sits above the chip row, the loop's own "On the loop"
    // position.
    const nameColumn = nameEl.parentElement as HTMLElement
    expect(nameColumn.contains(chipEl)).toBe(false)
    // Eyebrow row above chip row, top over bottom.
    const children = Array.from(tile.children)
    const eyebrowRowIndex = children.findIndex((c) => c.contains(chipEl))
    const chipRowIndex = children.findIndex((c) => c.contains(nameEl))
    expect(eyebrowRowIndex).toBeGreaterThan(-1)
    expect(chipRowIndex).toBeGreaterThan(-1)
    expect(eyebrowRowIndex).toBeLessThan(chipRowIndex)
  })
})

// CLIENT RULING, 18 Sep 2026, VERBATIM: "missing the avatars of the senders
// … client contacts and staff alike."
describe("every message in the thread carries the sender's face", () => {
  it("draws an avatar for the raiser's own message and for a staff reply", async () => {
    api.replies = [
      {
        id: "msg-1",
        ticketId: "help-1",
        body: "We're looking into it.",
        taggedUserIds: [],
        isAgent: false,
        authorId: "u-2",
        authorName: "Aurora Weber",
        authorIsClient: false,
        createdAt: "2026-08-18T10:00:00.000Z",
      },
    ] as unknown as HelpMessage[]
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    await screen.findByText("We're looking into it.")
    // ONE PER MESSAGE — the description (the raiser) and the one reply
    // (staff) above.
    const avatars = document.querySelectorAll('[data-slot="avatar"]')
    expect(avatars.length).toBe(2)
  })
})

// CLIENT RULING, 18 Sep 2026, VERBATIM: "missing the attach button … the
// customers can attach images & files. so do we." — drew a Paperclip button
// on the composer, wired to `HelpAttachmentsPanel`'s own file picker, for
// one day. THE SAME DAY'S LATER CORRECTION pulled the panel it opened
// ("wtf is his files inside the ocnversation … thats not what i meant",
// help-detail.tsx's own header), and named what she actually wanted instead:
// each MESSAGE carrying its own files. Team migration 0105 is that door, and
// the button is back for real — `ReplyComposer` draws it unconditionally now
// (reply-composer.tsx), staging a pick through `useReplySend`'s own
// `uploadFile`. The full pick → tile → send → per-message render path is
// `reply-attachments.test.tsx`'s own suite; this file only has to prove the
// control is on screen, on THIS host, wired to something real.
describe("the composer's attach button is back", () => {
  it("draws a Paperclip / 'Attach a file' control on the composer", async () => {
    openTicket()
    await screen.findByRole("heading", { level: 1 })
    expect(screen.getByRole("button", { name: "Attach a file" })).toBeTruthy()
  })
})
