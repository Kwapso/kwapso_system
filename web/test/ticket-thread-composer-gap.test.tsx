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
// gap between the latest message and the compose bar — held in THAT shape
// through a flex `gap-[var(--space-5)]` shared by both children of one
// `CardContent`.
//
// REWRITTEN 18 Sep 2026 — client ruling, reading the deployed page back,
// verbatim: "the footer is not on the footer position!! fix that!" The
// `gap`-separated shape above put `thread`/`attachments`/`composer` as three
// siblings inside ONE padded `CardContent`, each `shrink-0` — which reads as
// "three things stacked in a box," not a footer, because `CardContent`'s own
// inset wraps the composer on every side including the bottom, leaving a gap
// between the pill and the card's own bottom edge. `TicketConversationPanel`
// now uses the kit's own `CardFooter` (card.tsx's chapter-13 anatomy —
// "header, body and footer are hairline-separated inside one shell") as the
// composer's home: `CardContent` holds only the scrolling thread,
// `CardFooter` is the LAST child of `Card` and holds the composer, and the
// hairline `CardFooter` already draws (`shadow-[var(--hairline-over)]`) is
// what separates it from the transcript now — not a flex gap token. This
// file's assertions follow that shape: the thread's own scroll region, the
// composer sitting OUTSIDE it as the conversation card's last child, and
// nothing painting a second fill inside the card (the "panel tone" the
// ruling asks the footer to carry falls out of `CardFooter` having no
// background of its own, over `Card`'s own `--surface-panel`).

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

// R89 BELOW-LG RE-FIX, 19 Sep 2026 — `TicketDetailBody` now picks its own
// LG-vs-below-lg TREE with a real `matchMedia` breakpoint hook
// (`ticket-detail-body.tsx`'s own `useIsAtLeastLg`), never a `lg:` class
// left for the browser to resolve — so `web/test/setup.ts`'s own global
// stub (`matches: false` for every query, jsdom's honest default) would
// silently render the BELOW-LG tree here instead of the desktop one this
// file's whole assertion set is written against. Overridden to answer the
// ONE query this app's `lg` breakpoint actually asks (`64rem`, matching
// Tailwind's own `lg:`); every other query (the kit's reduced-motion
// check, `EdgePanel`'s own viewport read) keeps the setup file's honest
// `false`.
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

describe("the composer is back inside the conversation card's own CardFooter, at every width (R89 round 24 — 'rewind here')", () => {
  it("the thread scrolls inside CardContent, inside a Card bounded (h-full min-h-0) so CardContent can actually cap it; the composer is that Card's own last child", async () => {
    render(<HelpDetailScreen teamId="team-1" helpId="help-1" myUserId="u-1" basePath="/tickets" />)

    // V1 draws every panel at once — no tab click needed to reach either.
    await waitFor(() =>
      expect(document.querySelector('[data-slot="ticket-thread"]')).toBeTruthy()
    )
    const thread = document.querySelector('[data-slot="ticket-thread"]') as HTMLElement
    const composerForm = document.querySelector('[data-slot="reply-composer"]') as HTMLElement
    expect(composerForm, "the app's own composer never rendered").toBeTruthy()

    // THE THREAD'S OWN SCROLL REGION IS THE KIT'S `CardContent` — the
    // fragment TicketThread sits in (alongside TranslateAction) carries no
    // DOM node of its own, so the first real ancestor IS the scroller.
    const scroller = thread.parentElement as HTMLElement
    expect(scroller.getAttribute("data-slot")).toBe("card-content")
    expect(scroller.className).toContain("min-h-0")
    expect(scroller.className).toContain("overflow-y-auto")

    // ROUND 24 ("rewind here") — TicketConversationPanel is UN-RETIRED:
    // the composer's own CardFooter is this Card's LAST child again, at
    // every width, because the BAND (not the composer) now guarantees
    // "always visible at the bottom."
    const threadCard = scroller.parentElement as HTMLElement
    expect(threadCard.getAttribute("data-slot")).toBe("card")
    expect(threadCard.className).toContain("h-full")
    expect(threadCard.className).toContain("min-h-0")

    const composerFooter = composerForm.parentElement!.parentElement as HTMLElement
    expect(composerFooter.getAttribute("data-slot")).toBe("card-footer")
    expect(threadCard.lastElementChild).toBe(composerFooter)
    expect(Array.from(threadCard.children)).toEqual([scroller, composerFooter])

    // THE COMPOSER NO LONGER CARRIES ROUND 23'S OWN PINNING CLASSES — the
    // BAND does now (see ticket-detail-body.test-level coverage,
    // footer-on-the-edge.test.ts and ticket-detail-no-tabs.test.tsx).
    expect(composerFooter.className).not.toContain("sticky")
    expect(composerFooter.className).not.toContain("bottom-[calc(-1*var(--space-5))]")
    expect(composerFooter.className).toContain("w-full")

    // THE HAIRLINE, NOT A FLEX GAP, IS WHAT SEPARATES THE COMPOSER FROM
    // THE THREAD ABOVE IT — CardFooter's own chapter-13 rule (card.tsx).
    expect(composerFooter.className).toMatch(/shadow-\[var\(--hairline-over\)\]/)
  })

  it("draws no second fill inside the thread's card — the composer's own ground is the CARD's, never a fill it carries itself", async () => {
    render(<HelpDetailScreen teamId="team-1" helpId="help-1" myUserId="u-1" basePath="/tickets" />)
    const thread = await waitFor(() => {
      const el = document.querySelector('[data-slot="ticket-thread"]') as HTMLElement | null
      if (!el) throw new Error("thread not rendered yet")
      return el
    })
    const scroller = thread.parentElement as HTMLElement
    const composerForm = document.querySelector('[data-slot="reply-composer"]') as HTMLElement
    const composerFooter = composerForm.parentElement!.parentElement as HTMLElement
    const threadCard = scroller.parentElement as HTMLElement

    expect(threadCard.getAttribute("data-variant")).toBe("default")
    // The thread's own scroller repaints nothing of its own — the card's
    // `--surface-panel` fill is the only ground inside it.
    expect(scroller.className).not.toMatch(/\bbg-/)
    // The composer's own CardFooter (round 24) stands INSIDE the card
    // again, so it carries no fill of its own either — CardFooter's own
    // chapter-13 rule, no background, just the hairline.
    expect(composerFooter.className).not.toMatch(/\bbg-/)
  })
})

// CORRECTED, R89 "footer-on-the-edge", 18 Sep 2026 — the describe block this
// replaces was true when it was written and stale within the same session:
// `ticket-detail-body.tsx` moved `TicketConversationPanel`'s own `Card` to
// `variant="default"` (R67, "remove the 'overall' container") the SAME day,
// which repainted the conversation card's own ground from `--card`/
// `--background` (#FFFEF9) to `--surface-panel` (#F7F2EB) — and this file's
// old assertion (`bg-surface-panel`, "never bg-card") was never revisited
// against the new ground it was standing on. Live proof on staging (T0001,
// BEFORE this fix): the composer's own `background-color` and the
// conversation card's were the identical `rgb(247,242,235)` — no contrast at
// all, exactly the client's own screenshot-4 complaint ("on the same beige
// as the card"). `bg-card` is correct now, for two reasons together: it
// DIFFERS from the card's own `--surface-panel` ground, so the pill reads as
// its own field again; and it is the SAME class the kit's own `Input`
// (`shared/ui/components/input/input.tsx`'s `inputVariants`) paints every
// ordinary text field with, read straight off that file rather than
// hand-typed, so this composer matches every input in the app by
// construction.
describe("the composer pill stands on a distinct ground from the card, matching the kit's own Input", () => {
  it("the composer root carries bg-card (the kit Input's own fill) and w-full, never the card's own bg-surface-panel", async () => {
    render(<HelpDetailScreen teamId="team-1" helpId="help-1" myUserId="u-1" basePath="/tickets" />)
    const composerForm = await waitFor(() => {
      const el = document.querySelector('[data-slot="reply-composer"]') as HTMLElement | null
      if (!el) throw new Error("composer not rendered yet")
      return el
    })
    expect(composerForm.className).toContain("bg-card")
    expect(composerForm.className).not.toMatch(/\bbg-surface-panel\b/)
    // FULL WIDTH OF ITS OWN CONTAINER — Aurora's screenshot 4, verbatim:
    // "it should be full width of its own container." Measured on staging
    // before this fix: the pill rendered 271px wide inside a 769px footer.
    expect(composerForm.className).toContain("w-full")
  })
})
