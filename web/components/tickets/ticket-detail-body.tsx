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
// this component entirely (see help-detail.tsx, which never changed that
// wiring: the ladder was already above the strip, and it is now above a
// body that has no strip left to be above). This file is the body under it:
// a two-column layout at `lg` — the conversation (2/3) beside three stacked
// panels (1/3) — that stacks to one column on a phone, the client's own
// "right column stacks under the conversation."
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
import { cn } from "@shared/ui/lib/utils"

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
 * R89 "footer-on-the-edge" — THE COMPOSER IS PINNED AT THE BOTTOM OF THE
 * SCREEN AT EVERY WIDTH AND HEIGHT; EVERYTHING ELSE SCROLLS ABOVE IT. This
 * is the law's THIRD and current construction (round 23, 19 Sep 2026),
 * superseding both the two-tree LG/below-LG split (round-19 re-fix, kept
 * below for the record) and the height-chasing `app-shell.tsx` calc it
 * still leans on for the page's own bottom edge.
 *
 * WHAT BROKE THE PREVIOUS CONSTRUCTION: it bounded the CONVERSATION CARD's
 * own height (`h-full min-h-0` at lg, a fixed viewport slice below it) and
 * trusted that bound to always resolve to a real, on-screen number. Aurora,
 * over a screenshot at 1991×842 with the assistant panel OPEN — a width and
 * height this law's own proofs had never measured together (every earlier
 * proof was either a closed assistant at ~900px tall, or an open assistant
 * at 900px tall, never open AND short): "THE PROBLEM IS WHERE THE FOOTER
 * IS!!! SHOULD BE AT THE VERY BOTTOM!" The height chain is real and mostly
 * correct, but it is also long — six or seven `flex-1 min-h-0` links deep,
 * through a vendored shell this file cannot edit (R39) — and a construction
 * that DEPENDS on every one of those links resolving correctly, forever, at
 * every width/height/assistant-state combination nobody has proved yet, is
 * exactly the shape that keeps re-breaking on a new combination each time
 * she looks. This round stops trying to bound the chain and instead makes
 * the ONE thing she cares about — the composer, visible, at the bottom —
 * true BY CONSTRUCTION, with a second, independent mechanism (`position:
 * sticky; bottom: 0`) standing behind the flex chain as belt-and-braces: if
 * the chain above it ever miscalculates again, the composer still cannot
 * leave the viewport, because sticky positioning answers to the nearest
 * SCROLLING ancestor (`[data-slot="screen-shell-body"]`, the vendored
 * shell's own pane) rather than to this file's own flex arithmetic.
 *
 * THE SHAPE, NOW ONE TREE FOR THE COMPOSER'S OWN POSITION (the grid/stack
 * choice below it still varies by width, for the DOM-order reason the next
 * paragraph keeps): `data-slot="ticket-detail-body"` is a `flex flex-col
 * flex-1 min-h-0` column, exactly two children. The FIRST is the one
 * scrolling region (`flex-1 min-h-0 overflow-y-auto`) — everything that
 * is not the composer lives inside it: at `lg` a `grid-cols-[2fr_1fr]`
 * pairing the conversation thread (a plain `<Card><CardContent>`, no
 * footer inside it any more) with the three side panels; below `lg` the
 * same three side panels THEN the thread, stacked — her own "above the
 * content" complaint from the round-19 re-fix, still answered by DOM
 * order, unchanged by this round. The SECOND, and only other, child is the
 * composer's own `<CardFooter>` — `flex-none` (never a share of the
 * scroll region's budget), `w-full` (full width of the content column,
 * her screenshot-4 ruling, unchanged), `sticky` with a NEGATIVE `bottom`
 * offset (the belt-and-braces above, corrected live: `position: sticky`
 * anchors its offset to the nearest scrolling ancestor's PADDING edge —
 * `[data-slot="screen-shell-body"]`'s own `DENSITY_BODY` bottom padding,
 * `--space-5`/`--space-6` — never its border edge, so a plain `bottom-0`
 * measured live as a 24px GAP under the composer at `lg`: sticky was
 * clamping the footer back UP by exactly the padding the app-shell.tsx
 * `has-[...]` growth hack exists to let the flow position grow PAST.
 * `bottom-[calc(-1*var(--space-5))] lg:bottom-[calc(-1*var(--space-6))]`
 * cancels that padding so sticky's own "stuck" threshold coincides with
 * the pane's true border-box bottom instead of stopping short of it —
 * proved live, this session, both numbers: 24px gap with plain `bottom-0`,
 * 0px with the negative offset, at 1991×842/1440×842/1784×981 with the
 * assistant open), carrying `bg-surface-panel` itself because it no
 * longer sits inside any `Card` that would supply it. ONE composer
 * element, in ONE DOM position, at every width — the two-tree split this
 * file used to need existed ONLY because the composer used to live inside
 * `TicketConversationPanel`'s own `CardFooter` at `lg` and outside it
 * below `lg`, two different homes for one stateful control
 * (`reply-composer.tsx`'s own `field` ref, its held-reply countdown, its
 * attach-tile grid) that cannot mount twice. With the composer pulled
 * fully outside the scrolling region for every width, that reason is
 * gone, and `TicketConversationPanel` — the component that used to hold
 * both `CardContent` (thread) and `CardFooter` (composer) together — is
 * gone with it: the thread's own card is built inline, identically, in
 * both branches of the scroll region.
 *
 * THE JS BREAKPOINT HOOK (`useIsAtLeastLg`, below) SURVIVES, NARROWED TO
 * ONE JOB: choosing which of the two scroll-region trees to render, purely
 * for DOM order (side panels before the thread below `lg`, the thread
 * first at `lg` so it lands in the grid's own first, 2fr column) — the
 * same "phone gets a different tree, not a resized one" shape
 * `web/lib/use-is-phone.ts` already banks. It is no longer load-bearing
 * for the composer's OWN position, which is now identical in both
 * branches (outside the hook's condition entirely) — so a bug in the hook
 * can no longer strand the composer the way the LG/below-LG split used to.
 *
 * WHY NOT ALSO COLLAPSE THE GRID/STACK CHOICE TO ONE CSS-ONLY TREE: the
 * round-19 re-fix's own note (kept below) proved a single shared grid with
 * `order-*` reordering crushes to zero on a tight vertical budget when TWO
 * separate `flex-1` regions compete for it. That failure mode does not
 * apply here any more — there is only ONE `flex-1` region in this
 * component now (the scroll wrapper; the composer is `flex-none`) — but
 * reordering via CSS `order` would also decouple visual order from DOM
 * order at `lg`, which is a real (if solvable) accessibility question this
 * round did not need to open. Keeping the hook costs one already-proven,
 * already-tested branch; the win is not worth reopening that question
 * today.
 *
 * `data-slot="ticket-detail-body"` is this file's own marker — read by
 * `web/test/footer-on-the-edge.test.ts` (R89), by `app-shell.tsx`'s own
 * `has-[[data-slot=ticket-detail-body]]` rule (which still matters: it is
 * what lets this component's flex-1 chain reach the vendored pane's real,
 * full border-box height instead of stopping short by its bottom padding —
 * a real gap under the composer even with sticky in place, since sticky
 * only rescues the composer from leaving the viewport, it does not by
 * itself close a gap a shorter flex chain would leave beneath it) — and by
 * nothing else; it draws no CSS of its own and is not a new global
 * selector to keep in step with anything.
 *
 * THE EARLIER TWO CONSTRUCTIONS, KEPT FOR THE RECORD (superseded, not
 * deleted — see this file's git history for the full account of each):
 * the "sum of three" shape (a morning ruling about matching the two
 * columns to EACH OTHER, never claiming to reach the screen's own bottom
 * edge) and the two-tree LG/below-LG split this round replaces (which DID
 * reach the bottom edge, at every width and height it was proved against —
 * proving a new one every time was exactly the problem this round's
 * belt-and-braces answers). */

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
}: {
  thread: React.ReactNode
  composer: React.ReactNode
  stories: React.ReactNode
  time: React.ReactNode
  stakeholders: React.ReactNode
}) {
  const isAtLeastLg = useIsAtLeastLg()

  // THE THREAD'S OWN CARD — no footer inside it any more, at either width.
  // Built once, used by both scroll-region branches below, so the two never
  // drift into two different shapes for the one thing they share.
  const threadCard = (
    <div id={TICKET_PANEL_ANCHOR.conversation} className="min-w-0">
      <Card variant="default">
        <CardContent className="p-4">{thread}</CardContent>
      </Card>
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
      {/* THE ONE SCROLLING REGION — everything except the composer. At `lg`
          a 2fr/1fr grid (the thread first/left, the side panels second/
          right); below `lg` the side panels THEN the thread, stacked (her
          own "above the content" complaint, answered by DOM order). Either
          way this is the column's only `flex-1 min-h-0` item, so there is
          nothing left for it to compete with for vertical space — the
          crush-to-zero failure the round-19 re-fix documented needed TWO
          separate `flex-1` regions, and there is only ever one here. */}
      <div className="min-w-0 flex-1 min-h-0 overflow-y-auto">
        {isAtLeastLg ? (
          <div className="grid min-w-0 grid-cols-[2fr_1fr] items-start gap-6">
            {threadCard}
            <div className="flex min-w-0 flex-col gap-6">{sidePanels}</div>
          </div>
        ) : (
          <div className="flex min-w-0 flex-col gap-6">
            {sidePanels}
            {threadCard}
          </div>
        )}
      </div>
      {/* THE COMPOSER — pinned at the bottom of the screen at every width
          and height; everything else scrolls above it (R89, round 23). The
          kit's own `<CardFooter>`, ONE instance, ONE DOM position, outside
          the scrolling region entirely so nothing it holds can ever push
          the composer down with it. `flex-none` (never a share of the
          scroll region's budget); `w-full` (full width of the content
          column, her screenshot-4 ruling); `sticky` is the belt-and-braces
          this round adds — if the flex-1/min-h-0 chain above this
          component (app-shell.tsx → record-chrome.tsx → this file,
          six-plus links deep through a vendored shell this file cannot
          edit, R39) ever resolves wrong again on some new width/height/
          assistant-state combination nobody has proved yet, the composer
          still cannot leave the viewport: sticky answers to the nearest
          SCROLLING ancestor (`[data-slot="screen-shell-body"]`, the kit's
          own pane), not to this file's own arithmetic. The `bottom` offset
          is NEGATIVE, not `bottom-0` — measured live, `bottom-0` clamps
          sticky to that pane's own PADDING edge (`DENSITY_BODY`'s bottom
          padding, `--space-5`/`--space-6`), a 24px gap at `lg`, because
          sticky's offset anchors to the padding box while app-shell.tsx's
          `has-[...]` rule grows the flow position PAST it, into the
          pane's true border-box bottom; `calc(-1*var(--space-5|6))`
          cancels that padding so the two agree. `z-[1]` only matters in
          the failure case above — ordinarily this element sits in normal
          flow, below the scroll region, painting over nothing.
          `bg-surface-panel` is the
          fill a wrapping `Card` used to supply; standing outside any
          `Card` now (at every width, not just below `lg`), it carries that
          fill itself so the composer's own `bg-card` pill still reads
          against the panel tone rather than the page's. No radius: this
          band spans the screen's own full width, flush with its bottom
          edge, the same shape a fixed app toolbar takes rather than a
          card's own rounded foot. */}
      <CardFooter
        className={cn(
          "sticky z-[1] flex-none w-full bg-surface-panel p-4",
          "bottom-[calc(-1*var(--space-5))] lg:bottom-[calc(-1*var(--space-6))]"
        )}
      >
        {composer}
      </CardFooter>
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

/* `TicketConversationPanel` — the component that used to hold BOTH the
 * thread's `CardContent` and the composer's `CardFooter` inside one `Card`
 * at `lg` — is RETIRED, round 23 (19 Sep 2026), not renamed. R89's current
 * construction (see `TicketDetailBody`'s own header, above) pulls the
 * composer fully outside the thread's card at every width, so there is no
 * width at which anything still wants a card that bundles the two
 * together; the thread's own card is now built inline, identically, in
 * both scroll-region branches of `TicketDetailBody`. An exported component
 * with zero remaining call sites is exactly the "too much code" this
 * base's first prime directive exists to catch. */
