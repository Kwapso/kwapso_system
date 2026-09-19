// R91 (working title) — Aurora's ruling, 19 Sep 2026, verbatim: "on 'chat' in
// tickets put the name and time under the message" and "and when 2 messages
// from the same person, only after the last message." Her crop shows the
// shape: the byline ("Alaap · 45m ago") sits UNDER the bubble, aligned to the
// bubble's own side, avatar beside it as before.
//
// THE SPLIT. `help-detail.tsx` owns the RUN computation that decides which
// reply in a consecutive same-author span carries the byline at all: a run
// breaks on author id (never name, never a time gap), and only the run's
// LAST reply carries `author`/`authorMeta`/`initials`/`time`, off
// `nameInitials`/`formatRelative`/`staffNameFromSnapshot`, fed to the kit's
// `TicketThread` via its `messages` prop. THE PLACEMENT is the kit's own,
// as of v1.2.133: `bylinePlacement="below"` (passed at the call site) moves
// the author/authorMeta/time header to follow the bubble instead of leading
// it, aligned to the bubble's own side — `shared/ui/components/ticket-
// thread/ticket-thread.tsx`, pinned by `components/ticket-thread/check-
// ticket-thread.mjs` in the kit repo. This file proves BOTH halves now: the
// run computation (which bubble gets a byline, and which reply's own time it
// carries) AND, now that the kit offers it, that the byline actually lands
// AFTER the bubble in DOM order and aligned to the bubble's own (`mine`)
// trailing edge.

import { cleanup, render, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { HelpMessage, HelpTicket } from "@shared/types"
import { translator, DEFAULT_LANGUAGE } from "@shared/i18n"
import { formatRelative } from "@shared/web/format"

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

// Round day counts so `formatRelative`'s own `Math.round(hrs / 24)` cannot be
// nudged across a bucket by the few milliseconds between building this fixture
// and the component's own `Date.now()` read.
const NOW = Date.now()
const daysAgo = (n: number) => new Date(NOW - n * 24 * 60 * 60 * 1000).toISOString()

// A, A, B — two consecutive replies from the SAME author (by id), then one
// from a different author. Bodies deliberately never contain either author's
// name, so a name appearing in a bubble's own text can only be the byline.
const REPLIES: HelpMessage[] = [
  {
    id: "reply-1",
    ticketId: "help-1",
    body: "First reply in the run.",
    taggedUserIds: [],
    isAgent: false,
    authorId: "user-alaap",
    authorName: "Alaap",
    authorIsClient: false,
    createdAt: daysAgo(6),
  },
  {
    id: "reply-2",
    ticketId: "help-1",
    body: "Second reply, same run.",
    taggedUserIds: [],
    isAgent: false,
    authorId: "user-alaap",
    authorName: "Alaap",
    authorIsClient: false,
    createdAt: daysAgo(2),
  },
  {
    id: "reply-3",
    ticketId: "help-1",
    body: "A different person answers.",
    taggedUserIds: [],
    isAgent: false,
    authorId: "user-priya",
    authorName: "Priya",
    authorIsClient: false,
    createdAt: daysAgo(1),
  },
]

// The exact string the app's own `formatRelative` produces for reply-2's own
// `createdAt`, through the same base-language translator the app falls back
// to outside a `LanguageProvider` (`shared/web/language.tsx`'s own default
// context) — proves "time shown is the last message's" against reply-2's OWN
// moment, not reply-1's or some other value.
const t = translator(DEFAULT_LANGUAGE)
const REPLY_2_TIME = formatRelative(REPLIES[1]!.createdAt, t, DEFAULT_LANGUAGE)

const perms = vi.hoisted(() => ({ can: vi.fn(() => true) }))
vi.mock("@/lib/perms", () => ({ usePermissions: () => ({ can: perms.can }) }))

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
      helpThread: async () => ({ replies: REPLIES, total: REPLIES.length }),
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

// Same override `ticket-thread-composer-gap.test.tsx` carries — the below-lg
// vs desktop tree picks a real `matchMedia` breakpoint, and the setup file's
// honest `matches: false` default would silently render the wrong one here.
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
})

describe("the thread groups consecutive same-author replies into a run, and only the run's last reply carries the byline", () => {
  it("three replies A, A, B: no byline on bubble 1, a byline on bubbles 2 and 3, bubble 2's time is reply-2's own", async () => {
    render(<HelpDetailScreen teamId="team-1" helpId="help-1" myUserId="u-1" basePath="/tickets" />)

    await waitFor(() =>
      expect(document.querySelector('[data-slot="ticket-thread"]')).toBeTruthy()
    )

    // The description ("theirs") is its own message; the three replies are
    // "mine" — Aurora's ticket description is separate from the RUN this
    // block computes over the `replies` array alone.
    const bubbles = Array.from(
      document.querySelectorAll('[data-slot="thread-message"][data-side="mine"]')
    ) as HTMLElement[]
    expect(bubbles).toHaveLength(3)
    const [first, second, third] = bubbles as [HTMLElement, HTMLElement, HTMLElement]

    // BUBBLE 1 — first of the Alaap run: no author text at all.
    expect(within(first).queryByText("Alaap")).toBeNull()

    // BUBBLE 2 — the Alaap run's own last reply: the byline carries the name
    // and THIS reply's own time (never reply-1's, never a placeholder).
    expect(within(second).queryByText("Alaap")).not.toBeNull()
    expect(within(second).queryByText(REPLY_2_TIME)).not.toBeNull()

    // BUBBLE 3 — a new author breaks the run immediately; it carries its own
    // byline even though it is a run of one.
    expect(within(third).queryByText("Priya")).not.toBeNull()
    expect(within(third).queryByText("Alaap")).toBeNull()

    // THE AVATAR — `hasAvatar` in the kit (ticket-thread.tsx) follows the
    // same `initials`/`image` fields this block gates, so it is drawn once
    // per run too: absent on bubble 1, present on bubble 2.
    expect(first.querySelector('[data-slot="avatar-fallback"]')).toBeNull()
    expect(second.querySelector('[data-slot="avatar-fallback"]')).not.toBeNull()

    // THE PLACEMENT — kit v1.2.133's `bylinePlacement="below"`, passed at the
    // call site. Bubble 1 carries no byline at all (checked above by text;
    // this also confirms no `data-slot="thread-byline"` node exists). Bubbles
    // 2 and 3 each carry exactly one, and it must land AFTER its own bubble
    // in DOM order — `compareDocumentPosition` rather than a text-offset
    // comparison, so the assertion holds regardless of how the bubble's own
    // markup is serialized.
    expect(first.querySelector('[data-slot="thread-byline"]')).toBeNull()

    for (const bubble of [second, third]) {
      const content = bubble.querySelector('[data-slot="thread-bubble"]')
      const byline = bubble.querySelector('[data-slot="thread-byline"]')
      expect(content).not.toBeNull()
      expect(byline).not.toBeNull()
      // DOCUMENT_POSITION_FOLLOWING (4): byline comes AFTER the bubble.
      expect(
        content!.compareDocumentPosition(byline!) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy()

      // SIDE ALIGNMENT — every reply in this thread is `side: "mine"`
      // (help-detail.tsx's own `replies.map`), so the byline must align to
      // the bubble's own trailing edge, same as the kit's "above" header
      // always did for `mine`.
      expect(byline!.className).toContain("justify-end")
    }
  })
})
