"use client"

// THE TICKET'S ONE-PAGE BODY — client ruling, 17 Sep 2026, verbatim: "I want
// to see, on one single screen with no tabs, the content of tickets: the
// stages, the kind of conversation with the customer, related stories, work
// logs, stakeholders. We currently, in our legacy system, have it on one
// page, and it's very practical. We don't want to change that." And her pick
// the same day, over the decision page
// (https://claude.ai/artifact/34udsj1HpzcojN15Sq97tt): "For ticket 1 page, I
// choose to implement it v1."
//
// V1 IS THIS FILE'S WHOLE JOB, AND NOTHING ELSE. The stage ladder is not
// drawn here — it still rides `RecordScreen`'s `headerExtra` slot, above
// this component entirely (see help-detail.tsx). This file is the body
// under it: a two-column layout at `lg` — the conversation (2/3) beside
// three stacked panels (1/3) — that stacks to one column on a phone, the
// client's own "right column stacks under the conversation."
//
// R67, READ AGAINST THE NEW GROUND — client ruling, 18 Sep 2026, verbatim:
// "the ticket detail is completely wrong in terms of containers. what you
// have now is one big container and small ones underneath. why did you do
// 2 levels? no. let's change that. remove the 'overall' container, make each
// thing its own container (like tickets dashboard)." That "overall
// container" was `RecordScreen`'s own `panel` region — the kit's
// `RecordDetail` wrapping whatever `children` holds in ONE `Card`,
// `variant="default"` (`bg-surface-panel`) — and it is off now:
// `help-detail.tsx` passes `panelVisible={false}` and renders this whole
// body as a SIBLING of `<RecordScreen>` instead of its `children`, the same
// shape `tickets-dashboard.tsx`'s own panels take (a plain layout `<div>`,
// never a `Card`, holding several `Card` siblings). The head — the trail,
// the chips, the title, the stage ladder, the actions — still rides
// `RecordScreen` exactly as before; only the body moved out from under its
// second, redundant wrapper.
//
// SO THE GROUND UNDER `TicketSidePanel`/`TicketConversationPanel` CHANGED,
// AND THEIR OWN TONE HAS TO FOLLOW. They stood on `--surface-panel` (the old
// outer Card) and answered it `variant="raised"` (`--card`) — correct then,
// the kit's own raised-on-soft-paper pairing. They now stand directly on the
// PAGE (`--background`, the transparent header band's own ground), and
// `record-detail.tsx`'s own header is explicit that `--card` and
// `--background` are the SAME #FFFEF9 in light — painting `raised` here now
// would be the exact "contrast 1.000, standing on its own ground" bug R67
// exists to catch, just moved one level up. So both wrappers below take
// `variant="default"` (`--surface-panel`, soft paper) instead — the same
// answer `tickets-dashboard.tsx`'s own sibling `<Card>`s (no `variant` at
// all, which IS `default`) give the identical page ground.
//
// NEITHER WRAPPER DRAWS A `<section>`. `web/test/sections-stand-on-paper.test.ts`
// (R67) reads that one tag, walking whether IT stands on paper — asking it
// of a `<div>` that already carries `Card`'s own fill would be asking a
// question this file has already answered structurally, not dodging one it
// owes.

import * as React from "react"

import { Card, CardContent, CardFooter } from "@shared/ui/components/card/card"

/** Stable DOM anchors for the four panels a ticket's page draws, so a link
 * built before the tab strip existed — `?tab=stories`, the rail, anywhere
 * else in the app — still lands ON THIS RECORD and can scroll to the right
 * block now that there is nothing to switch. See `help-detail.tsx`'s own
 * deep-link effect, which is the one reader of this table. */
export const TICKET_PANEL_ANCHOR = {
  conversation: "ticket-panel-conversation",
  stories: "ticket-panel-stories",
  time: "ticket-panel-time",
  stakeholders: "ticket-panel-stakeholders",
} as const

export type TicketPanelName = keyof typeof TICKET_PANEL_ANCHOR

/** THE SPLIT, AND NOTHING INSIDE IT. What each region holds is the caller's —
 * this component's one job is the layout and the anchors a deep link scrolls
 * to.
 *
 * R89 "footer-on-the-edge" — ROUND 24, THE CORRECTION, 19 Sep 2026. Every
 * earlier round (kept in this file's own git history) chased "the footer"
 * meaning the ticket's REPLY COMPOSER. Aurora, this round, over her own
 * screenshot, verbatim: "the black section, the footer, should be at the
 * very bottom / why is the write text space full width?? rewind here / THE
 * FUKING FOOTERRR!" THE FOOTER IS THE BLACK BAND — the dark card holding
 * LATEST ACTIVITY (the recent rows + "Add a note") and RECORD (Created by /
 * Last edited by), the kit's own CH27.8 ink footer — never the composer.
 * Round 23's whole construction pinned the WRONG element and is reversed:
 *
 *  1. THE BAND is this component's own LAST child, `flex-none`, full
 *     content width, pinned at the screen's true bottom edge, always
 *     visible — built by `RecordFooterBand` (`@/components/records/
 *     record-chrome`, its own header has the full account of why a SECOND
 *     call to the kit's `RecordDetail`, not a moved prop, is what answers a
 *     DOM-order question `RecordScreen`'s own single call could not).
 *     `help-detail.tsx` passes it in as `footer`, built from the SAME
 *     `audit`/`activity`/`onAddNote` data it already fed `RecordScreen`
 *     (now `footerVisible={false}` there, so the SAME footer never draws
 *     twice).
 *  2. THE COMPOSER IS BACK INSIDE THE CONVERSATION CARD'S OWN FOOTER —
 *     "rewind here" — `TicketConversationPanel` (below) is UN-retired,
 *     exactly its round-22 shape (`git show d1167183`): `Card` →
 *     `CardContent` (the thread, scrolling) → `CardFooter` (the composer,
 *     `Card`'s own last child, D21). The composer no longer needs a second,
 *     below-`lg` home outside any card — the BAND is what now guarantees
 *     "always visible at the bottom," so the one card shape serves every
 *     width, which is also what answers "why is the write text space full
 *     width??": the composer's own `w-full` is 100% of the CARD's own inner
 *     width now, not the page's.
 *
 * BOUNDED BY CONSTRUCTION, NOT BY `position: sticky` ALONE — proved live
 * this round (40 injected thread bubbles + 6 activity rows, 1991×842 and
 * 1440×842 with the assistant open): a sticky band riding on top of an
 * UNBOUNDED scrolling region rides down WITH it the instant that region's
 * content outgrows the viewport — `ticketBody.clientHeight` measured 7px
 * and the band landed 72–168px below the fold before this fix, because the
 * thread's own scroller had no real height cap (`scrollHeight ===
 * clientHeight`, i.e. it was never actually scrolling — just growing).
 * `data-slot="ticket-detail-body"` is a `flex flex-col flex-1 min-h-0`
 * column with EXACTLY two children, every link `min-h-0` so the chain can
 * never grow past its own real budget: (1) the ONE scrolling region
 * (`flex-1 min-h-0 overflow-y-auto`) — the grid (2fr/1fr) at `lg`, the
 * side-panels-then-thread stack below it — and (2) the band, `flex-none`,
 * last. Inside the scrolling region, `TicketConversationPanel`'s own `Card`
 * takes `h-full min-h-0` from ITS cell (the grid cell at `lg`, a `flex-1
 * min-h-0` stack item below it), so the thread's `CardContent` — `flex-1
 * min-h-0 overflow-y-auto` — is what actually caps and scrolls, never the
 * page and never the band's own position. `position: sticky` with the SAME
 * negative, padding-compensated `bottom` offset round 23 proved
 * (`bottom-[calc(-1*var(--space-5))] lg:bottom-[calc(-1*var(--space-6))]`,
 * cancelling `[data-slot="screen-shell-body"]`'s own `DENSITY_BODY` bottom
 * padding) stays on the band as BELT-AND-BRACES ONLY — a second, redundant
 * guarantee for the case the flex chain above it ever miscalculates again,
 * never the PRIMARY mechanism this round leans on.
 *
 * `app-shell.tsx`'s own `has-[[data-slot=ticket-detail-body]]:h-[calc(…)]`
 * growth rule (round 22b) is unchanged and still load-bearing: it is what
 * lets THIS component's own flex-1 chain reach the vendored pane's true
 * border-box bottom rather than stopping short by its bottom padding,
 * whatever is pinned inside this root.
 *
 * `data-slot="ticket-detail-body"` is this file's own marker — read by
 * `web/test/footer-on-the-edge.test.ts` (R89), by `app-shell.tsx`'s own
 * `has-[…]` rule, and by nothing else.
 *
 * THE EARLIER CONSTRUCTIONS, KEPT FOR THE RECORD (superseded, not deleted —
 * see this file's git history): the "sum of three" shape (matching the two
 * columns to each other, never claiming the screen's own bottom edge), the
 * two-tree LG/below-LG split (round 19 re-fix), and round 23's
 * composer-pinned-outside-every-card construction — correct about WHERE on
 * the screen something had to be pinned, wrong about WHICH element the
 * client meant by "the footer." */

/** Tailwind's `lg` breakpoint (`64rem`, 1024px — confirmed against the
 * built CSS this session, `min-width:64rem`), the ONE number this
 * component's tree-level decision has to agree with the `lg:`/`grid-cols`
 * classes drawn below. `rem` here is the INITIAL font size by spec (16px),
 * never the root element's — `use-is-phone.ts`'s own note on
 * `COLUMNS_QUERY` explains why that is what keeps a media query safe
 * against this app's own `data-scale` root-font override. Not exported: a
 * second file with its own reason to ask "are we at `lg`" gets its own
 * threshold constant, the same way `use-is-phone.ts` keeps `PHONE_QUERY`
 * and `COLUMNS_QUERY` private rather than daisy-chaining every caller onto
 * one shared number. */
const LG_QUERY = "(min-width: 64rem)"

function queryLg(): MediaQueryList | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return null
  return window.matchMedia(LG_QUERY)
}

function subscribeLg(onChange: () => void): () => void {
  const mq = queryLg()
  mq?.addEventListener("change", onChange)
  return () => mq?.removeEventListener("change", onChange)
}

/** Is the viewport at least `lg`? `false` on the server and on the very
 * first client render (the static export has no `window`; jsdom has one
 * with no `matchMedia`) — the SAME conservative default
 * `useIsPhone`/`useShellColumns` already bank, so a person on a genuinely
 * narrow screen never sees a one-frame flash of the two-column tree before
 * it corrects. */
function useIsAtLeastLg(): boolean {
  return React.useSyncExternalStore(subscribeLg, () => queryLg()?.matches ?? false, () => false)
}

export function TicketDetailBody({
  thread,
  composer,
  stories,
  time,
  stakeholders,
  footer,
}: {
  thread: React.ReactNode
  composer: React.ReactNode
  stories: React.ReactNode
  time: React.ReactNode
  stakeholders: React.ReactNode
  /** THE BLACK BAND — built by `RecordFooterBand`
   * (`@/components/records/record-chrome`), this component's own LAST
   * child. See this file's own header for the whole round-24 account. */
  footer: React.ReactNode
}) {
  const isAtLeastLg = useIsAtLeastLg()

  // TWO DIFFERENT CELLS, NOT ONE CLASS REUSED — at `lg` this is a GRID cell,
  // already at 100% of the row's own height, so it takes `h-full min-h-0`;
  // below `lg` it is a STACK ITEM sharing the column with the side panels'
  // own natural height, so it takes `flex-1 min-h-0` (grow to fill what
  // they leave) instead — `h-full` there would claim 100% of the stack's
  // own height on top of the side panels' natural height, overflowing the
  // stack rather than sharing it with them.
  const conversation = (
    <div
      id={TICKET_PANEL_ANCHOR.conversation}
      className={isAtLeastLg ? "min-w-0 h-full min-h-0" : "min-w-0 flex-1 min-h-0"}
    >
      <TicketConversationPanel thread={thread} composer={composer} />
    </div>
  )

  const sidePanels = (
    <>
      <div id={TICKET_PANEL_ANCHOR.stories}>{stories}</div>
      <div id={TICKET_PANEL_ANCHOR.time}>{time}</div>
      <div id={TICKET_PANEL_ANCHOR.stakeholders}>{stakeholders}</div>
    </>
  )

  return (
    <div data-slot="ticket-detail-body" className="flex min-w-0 flex-1 min-h-0 flex-col">
      {/* THE ONE SCROLLING REGION — everything except the band. Bounded by
          construction: `flex-1 min-h-0 overflow-y-auto` against the root's
          own definite height, so its own content (the grid or the stack)
          can never grow past it — that boundedness is what keeps the band
          below pinned at the true bottom without depending on `sticky`
          alone (see this file's own header for the live proof that a
          sticky element riding on an UNBOUNDED region rides down with it). */}
      <div className="min-w-0 flex-1 min-h-0 overflow-y-auto">
        {isAtLeastLg ? (
          <div className="grid min-w-0 h-full min-h-0 grid-cols-[2fr_1fr] items-stretch gap-6">
            {conversation}
            <div className="flex min-w-0 flex-col gap-6 h-full min-h-0 overflow-y-auto">{sidePanels}</div>
          </div>
        ) : (
          <div className="flex min-w-0 h-full min-h-0 flex-col gap-6">
            {sidePanels}
            {conversation}
          </div>
        )}
      </div>
      {/* THE BAND — LATEST ACTIVITY + RECORD, the kit's own ink footer,
          this component's `flex-none` LAST child, full content width.
          `sticky` with the round-23 negative, padding-compensated offset
          stays as BELT-AND-BRACES ONLY (never the primary mechanism — the
          scrolling region above is bounded by construction instead), so
          if the flex chain above it ever resolves wrong on some future
          width/height/assistant-state combination, the band still cannot
          leave the viewport. */}
      <div
        data-slot="ticket-footer-band"
        className="flex-none sticky z-[1] w-full bottom-[calc(-1*var(--space-5))] lg:bottom-[calc(-1*var(--space-6))]"
      >
        {footer}
      </div>
    </div>
  )
}

/** ONE STACKED PANEL, RAISED ON THE RECORD'S OWN SOFT-PAPER GROUND (R67). A
 * plain title row — never a subtitle under it (R70) — with room for a count
 * and a trailing action (a "Show all" link) ON THE TITLE'S OWN LINE, so a
 * translated sentence never has to carry a number or a link inside it. */
export function TicketSidePanel({
  title,
  count,
  action,
  children,
}: {
  title: string
  /** Already formatted (R16's own `formatCount` seam, or a hand-built "3.5h" —
   * the caller's decision, never re-derived here) — "" draws nothing. */
  count?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  const headingId = React.useId()
  return (
    <Card variant="default">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <h3 id={headingId} className="flex min-w-0 items-baseline gap-1.5 text-sm font-medium">
            <span className="truncate">{title}</span>
            {count ? (
              <span className="text-muted-foreground shrink-0 font-[var(--font-weight-normal)]">
                {count}
              </span>
            ) : null}
          </h3>
          {action}
        </div>
        <div role="group" aria-labelledby={headingId} className="flex min-w-0 flex-col gap-3">
          {children}
        </div>
      </CardContent>
    </Card>
  )
}

/** THE CONVERSATION, ON ITS OWN PAPER TOO — R67's own sentence, "each panel
 * stands on paper; the conversation panel too." `thread`/`composer` are two
 * children rather than one: the thread scrolls inside this card, the
 * composer never does — the client's "she can keep reading the ticket while
 * it counts" (reply-composer.tsx's own header) now means a card that pins
 * the send row while only the transcript above it grows past its own
 * height, the same shape a chat panel always takes once it no longer owns
 * the whole page's scroll.
 *
 * UN-RETIRED, R89 ROUND 24, 19 SEP 2026 — Aurora, verbatim: "rewind here."
 * This is exactly the round-22 shape (`git show d1167183`), restored rather
 * than rebuilt: the composer went to live OUTSIDE every card in round 23,
 * chasing "the footer" as if it meant the composer; round 24 corrects that
 * — the composer is back at the conversation card's own foot, at every
 * width, because `TicketDetailBody`'s own BAND (not the composer) is what
 * now guarantees "always visible at the bottom." One card shape for every
 * width also answers Aurora's "why is the write text space full width??":
 * the composer's `w-full` is 100% of THIS card's own inner width, never the
 * page's.
 *
 * `h-full min-h-0`, UNCONDITIONAL, NO `lg:` PREFIX — this component mounts
 * inside a cell that is ALREADY a real, definite height (the grid row at
 * `lg`, the stack's own `flex-1 min-h-0` item below it), so it only ever
 * has to fill what its own cell already resolved. `min-h-0` is what lets
 * `h-full` resolve SMALLER than the thread's own natural height instead of
 * being floored by it — without it a flex/grid item's default `min-height:
 * auto` would let this card grow past its cell, which is exactly the
 * unbounded-scroll shape this round's own header warns against.
 *
 * THE COMPOSER IS THE CARD'S `CardFooter`, NOT A THIRD FLEX CHILD OF A
 * PADDED `CardContent` — client ruling, 18 Sep 2026, verbatim: "the footer
 * is not on the footer position!! fix that!" `CardContent` holds only the
 * scrolling THREAD; `CardFooter` — the kit's own footer band,
 * hairline-separated from the body, no fill of its own — holds the
 * composer as the LAST child of `Card` (D21). Neither `CardContent` nor
 * `CardFooter` paints a background, so the only fill in the shell is
 * `Card`'s own (`variant="default"`, `--surface-panel`) — "the panel tone"
 * the ruling asks the footer to carry falls out of the shell, not a class
 * added here. */
export function TicketConversationPanel({
  thread,
  composer,
}: {
  thread: React.ReactNode
  composer: React.ReactNode
}) {
  return (
    <Card variant="default" className="flex h-full min-h-0 flex-col">
      <CardContent className="min-h-0 flex-1 overflow-y-auto p-4">{thread}</CardContent>
      <CardFooter className="shrink-0 w-full p-4">{composer}</CardFooter>
    </Card>
  )
}
