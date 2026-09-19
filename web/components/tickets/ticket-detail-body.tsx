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
 * ROUND 26, THE MARGIN CORRECTION, 19 Sep 2026. Aurora, reading the round-24/25
 * page back, verbatim: "ok, now the footer is at the bottom, but there's a law
 * about how much margin there must be above!!! add the space!!" The band's own
 * flush bottom edge was already correct and stays exactly 0px; what was
 * missing was the ordinary space ABOVE it — the same panel gap every other
 * pair of stacked panels on this screen already carries
 * (`documents/UI-RULEBOOK.md` S1/N7, "between panels on a screen: gap-6", the
 * `--space-6` step, 24px at the 16px root). This component's own root — a
 * flex column whose only two children are the scrolling region and the band
 * — now carries `gap-6` itself, so the gap sits in NORMAL FLOW between the
 * two children, by TOKEN, never a hand-numbered offset: it applies whether
 * the band is in its own natural flow position or `sticky`-held at the
 * pane's true bottom edge, and it never touches the band's own bottom-edge
 * mechanics (unchanged from round 24). See `web/test/footer-on-the-edge.test.ts`'s
 * own new assertion.
 *
 * ROUND 27 — THE SIDE COLUMN NEVER SCROLLS, 19 Sep 2026. Aurora, over the live
 * page, verbatim: "there should be no scrolling to see all right column items
 * — expand the height!" and "scroll only on conversation when taller than
 * right column." Round 24 had made the `lg` grid row fill the WHOLE scrolling
 * region (`h-full min-h-0` on the grid, then the same on the side column,
 * `overflow-y-auto` so its own three cards would not be clipped once they
 * outgrew that forced height) — so a normal ticket with a short thread showed
 * the side column scrolling inside its own little box while empty space sat
 * below the conversation card beside it. Backwards: the CONVERSATION is the
 * one whose content varies wildly (a two-line ticket vs. a forty-message
 * thread); the side column's three cards are what a person actually needs to
 * see in full, every time, with nothing to page through. Rebuilt by
 * construction, not by swapping which side gets the scrollbar: the SIDE
 * COLUMN wrapper drops `h-full`/`min-h-0`/`overflow-y-auto` entirely — an
 * ordinary block at its own natural content height, never scrolling because
 * it is never asked to fit inside anything shorter than itself. The GRID
 * container drops its own `h-full`/`min-h-0` too (load-bearing: an
 * explicit-height grid with one `auto` row lets `align-content`'s default
 * `stretch` hand that row the FULL container height regardless of content,
 * which is what forced the side column's own internal scroll in the first
 * place) — height `auto`, sized like any ordinary block to its tallest
 * content, which is now the side column. The CONVERSATION CELL
 * (`#ticket-panel-conversation`) drops `h-full` for `relative` — no height
 * class of its own at all, because `items-stretch` (already on the grid) is
 * what resolves it, to whatever the row resolved to. And
 * `TicketConversationPanel`'s own `Card` takes a new `fill="absolute"` at
 * `lg` (`position: absolute; inset: 0`, see that component's own header) —
 * taken OUT of normal flow so the cell it sits in contributes ZERO intrinsic
 * height to the grid's auto-track sizing, which is the one piece that makes
 * the whole chain non-circular: without it, a forty-message thread would
 * push the CELL taller, which would push the ROW taller, which is exactly
 * the "conversation drags the side column down with it" bug this round
 * exists to avoid. The thread still scrolls — inside the now-absolutely
 * positioned card, via its own `CardContent`'s `min-h-0 flex-1
 * overflow-y-auto`, unchanged — only now against a height the SIDE COLUMN
 * set, never the other way round. PROVED FIRST by DOM/style injection
 * against the live page (`${SCRATCH}/row-proof.json`, mirroring this exact
 * construction) at 1800×978, 1991×842 assistant open, 1440×900 and
 * 1280×800: side column `scrollHeight === clientHeight` (never scrolls) and
 * its own bottom exactly matching its last card's bottom (0px) at all four;
 * conversation card height matching the side column's own height exactly
 * (0px diff) at all four; a 40-bubble stress injection at 1991×842 leaving
 * the row height UNCHANGED (810.89px before and after) with the thread
 * still scrolling inside the card; three injected extra side cards at
 * 1440×900 (side column grown to 1620.38px, taller than the 900px screen)
 * making the ONE scrolling region above the band scroll the whole page
 * (`regionScrolls: true`) while the band stayed flush (0px vs. the screen
 * body) with its own round-26 panel gap unchanged (24px, measured after
 * scrolling the region to its own end) above it.
 *
 * THE EARLIER CONSTRUCTIONS, KEPT FOR THE RECORD (superseded, not deleted —
 * see this file's git history): the "sum of three" shape (matching the two
 * columns to each other, never claiming the screen's own bottom edge), the
 * two-tree LG/below-LG split (round 19 re-fix), and round 23's
 * composer-pinned-outside-every-card construction — correct about WHERE on
 * the screen something had to be pinned, wrong about WHICH element the
 * client meant by "the footer."
 *
 * ROUND 25 — THE BELOW-`lg` SQUEEZE, 19 Sep 2026. Round 24 shipped and
 * looked right everywhere it was proved live (1800×978, 1991×842 assistant
 * open, 1440×900, 1280×800) — but `${SCRATCH}/reproof15-results.json` state
 * F (760×900, rail collapsed) caught what those five states could not: the
 * conversation card measured a TRUE 0px height
 * (`conversationCardRect.top === conversationCardRect.bottom`), so the
 * thread and composer were both invisible below `lg`, band and side panels
 * unaffected. Root cause was the below-`lg` STACK itself, not the band or
 * the card: that stack was `flex h-full min-h-0 flex-col gap-6` holding the
 * three side-panel divs (each natural-height, no flex classes of their own)
 * THEN the conversation cell at `flex-1 min-h-0` — a real flex sibling
 * fight. `flex-1` sets `flex-basis: 0%`, so once the panels' own combined
 * natural height (measured ~700px) exceeded the stack's `h-full` budget,
 * CSS flex-shrink distributed the deficit PROPORTIONAL TO EACH ITEM'S OWN
 * BASIS — the panels (large basis) barely shrank, the conversation (zero
 * basis) absorbed the entire deficit and rendered at exactly 0. Fixed by
 * construction, not by tuning a shrink factor: the below-`lg` wrapper is
 * ordinary NORMAL FLOW now (no `h-full`/`min-h-0`, so it has no fixed
 * budget to fight over), sized to its own content, inside the ONE scrolling
 * region this component already wraps everything in — and the conversation
 * cell below `lg` takes `min-h-[60vh]` instead of `flex-1 min-h-0`, a floor
 * rather than a share, so `TicketConversationPanel`'s own unconditional
 * `h-full` always has a real, positive height to resolve against. PROVED
 * FIRST by DOM/inline-style injection against the live (still-buggy)
 * staging page, before this source edit (`${SCRATCH}/
 * reproof16-belowlg-fix-results.json`): conversation card height went from
 * a measured 0px to 721.64px at both 760×900 rail collapsed and 900×800,
 * the composer became reachable after scrolling the one region at both
 * (`composerReachableAfterScroll_PASS: true`), and the band's own distance
 * to the screen body's bottom edge held exactly unchanged through the
 * injection (96px at 760×900 — the pre-existing, unrelated mobile-chrome
 * reservation footer-on-the-edge.test.ts already documents — 0px at
 * 900×800). 1440×900 and 1991×842 assistant-open are `lg` and untouched by
 * a below-`lg`-only fix — measured unchanged at 367.33px and 309.33px
 * conversation card height respectively, band 0px both, matching this
 * file's own round-24 proof (`${SCRATCH}/reproof15-results.json`). */

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
  // ROUND 27 (see this file's own header): `relative min-h-0`, NEVER
  // `h-full`. The cell itself carries no height class at all — it is the
  // grid's `items-stretch` that resolves its height, to whatever the ROW
  // resolves to, and the row resolves to the SIDE COLUMN's own natural
  // height (below), because this cell's only child (`TicketConversationPanel`'s
  // `Card`, `fill="absolute"` at `lg`) is taken out of flow (`position:
  // absolute; inset: 0`) and so contributes ZERO intrinsic height to the
  // grid's own auto-track sizing. Below `lg` it is a NORMAL-FLOW BLOCK
  // (ROUND 25, 19 Sep 2026 — see this file's own header), never `flex-1
  // min-h-0`: that shape made the conversation a FLEX SIBLING of the three
  // side-panel divs inside a `h-full` stack, and `flex-1`'s own
  // `flex-basis: 0%` means it is handed ZERO share of the stack's own
  // shrink budget once the panels' combined natural height (proved on
  // staging at 760×900 to be ~700px) exceeds what the stack's `h-full` had
  // to give — the panels barely shrink (their basis is their own large
  // content height) and the conversation is squeezed to a true 0px, thread
  // and composer both gone. Below `lg` it now takes `min-h-[60vh]` instead:
  // a SENSIBLE FLOOR, never a flex share fought over, so `TicketConversationPanel`'s
  // own `h-full` (`fill="block"` below `lg`) resolves against a real,
  // positive height and the card always renders at least that tall —
  // proved by live injection against staging (this file's own header
  // carries the measured numbers).
  const conversation = (
    <div
      id={TICKET_PANEL_ANCHOR.conversation}
      className={isAtLeastLg ? "min-w-0 relative min-h-0" : "min-w-0 min-h-[60vh]"}
    >
      <TicketConversationPanel thread={thread} composer={composer} fill={isAtLeastLg ? "absolute" : "block"} />
    </div>
  )

  // THE SIDE COLUMN — ROUND 27: NATURAL HEIGHT, NEVER SCROLLS. No
  // `h-full`/`min-h-0`/`overflow-y-auto` here (that was the bug — see this
  // file's own header). Every one of `TicketSidePanel`'s three cards
  // renders at its own content height, this wrapper's own height is the
  // sum of them plus the `gap-6` between, and THAT is what the grid row
  // resolves to (`items-stretch` on the grid stretches the conversation
  // cell — which contributes no height of its own — to match it exactly).
  const sidePanels = (
    <>
      <div id={TICKET_PANEL_ANCHOR.stories}>{stories}</div>
      <div id={TICKET_PANEL_ANCHOR.time}>{time}</div>
      <div id={TICKET_PANEL_ANCHOR.stakeholders}>{stakeholders}</div>
    </>
  )

  return (
    <div
      data-slot="ticket-detail-body"
      className="flex min-w-0 flex-1 min-h-0 flex-col gap-6"
    >
      {/* THE ONE SCROLLING REGION — everything except the band. Bounded by
          construction: `flex-1 min-h-0 overflow-y-auto` against the root's
          own definite height, so its own content (the grid or the stack)
          can never grow past it — that boundedness is what keeps the band
          below pinned at the true bottom without depending on `sticky`
          alone (see this file's own header for the live proof that a
          sticky element riding on an UNBOUNDED region rides down with it). */}
      <div className="min-w-0 flex-1 min-h-0 overflow-y-auto">
        {isAtLeastLg ? (
          // ROUND 27 — no `h-full`/`min-h-0` on the grid itself either: an
          // explicit-height grid container with one `auto` row would let
          // `align-content`'s own default `stretch` distribute the FULL
          // container height onto that one row regardless of content — the
          // exact reason the side column used to need its own internal
          // scrollbar. Height `auto` here (content-sized, like any ordinary
          // block) is what lets the row resolve to the side column's real
          // content height instead.
          <div className="grid min-w-0 grid-cols-[2fr_1fr] items-stretch gap-6">
            {conversation}
            <div className="flex min-w-0 flex-col gap-6">{sidePanels}</div>
          </div>
        ) : (
          // NORMAL FLOW, NOT A BOUNDED STACK (ROUND 25) — no `h-full`/
          // `min-h-0` here: this block's own height is its CONTENT height
          // (the side panels' natural height plus the conversation's own
          // `min-h-[60vh]` floor), and the ONE scrolling region this whole
          // tree already sits inside (this component's other child, `flex-1
          // min-h-0 overflow-y-auto`, one level up) is what scrolls that
          // content when it outgrows the viewport — never a `flex-1` fight
          // between these two siblings for a budget that does not exist here.
          <div className="flex min-w-0 flex-col gap-6">
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
 * `fill` PICKS THE CARD'S OWN SIZING, ROUND 27 (R89, see `TicketDetailBody`'s
 * own header) — NOT a `lg:` PREFIX ON ONE CLASS STRING, because the two
 * shapes are opposite mechanisms, not two breakpoints of the same one.
 * `"block"` (below `lg`) is the ORIGINAL shape: `h-full min-h-0`, resolving
 * against the cell's own `min-h-[60vh]` floor, an ordinary in-flow box.
 * `"absolute"` (`lg`) is new: `position: absolute; inset: 0`, taken OUT of
 * normal flow so this card contributes ZERO intrinsic height to its own
 * cell — which is the mechanism that lets the grid ROW resolve to the SIDE
 * COLUMN's natural height rather than to whatever this card's own thread
 * happens to be tall enough to demand. Either way `min-h-0` is what lets
 * the resolved height (`h-full`'s 100%, or `inset-0`'s exact fill) size
 * SMALLER than the thread's own natural height instead of being floored by
 * it — without it a flex item's default `min-height: auto` would let this
 * card grow past its own bound, which is exactly the unbounded-scroll shape
 * this file's own header warns against.
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
  fill = "block",
}: {
  thread: React.ReactNode
  composer: React.ReactNode
  /** See this component's own header, ROUND 27 (R89). `"absolute"` at `lg`
   * (`TicketDetailBody`'s own conversation cell is `relative`), `"block"`
   * below it (the default — every other caller, if there ever is one,
   * keeps the original in-flow shape). */
  fill?: "absolute" | "block"
}) {
  return (
    <Card
      variant="default"
      className={
        fill === "absolute" ? "absolute inset-0 flex min-h-0 flex-col" : "flex h-full min-h-0 flex-col"
      }
    >
      <CardContent className="min-h-0 flex-1 overflow-y-auto p-4">{thread}</CardContent>
      <CardFooter className="shrink-0 w-full p-4">{composer}</CardFooter>
    </Card>
  )
}
