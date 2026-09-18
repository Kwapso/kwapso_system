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

/** THE GRID, AND NOTHING INSIDE IT. What each region holds is the caller's —
 * this component's one job is the two-column split and the anchors a deep
 * link scrolls to.
 *
 * THE LEFT COLUMN SPANS THE RIGHT COLUMN'S THREE ROWS — client ruling,
 * 18 Sep 2026, verbatim: "the ticket detail conversation should have more
 * height, depending on the height of the right column components. they
 * should be, the addition of the three of the right, same as conversation."
 *
 * CORRECTED THE SAME DAY, MEASURED LIVE ON STAGING (T0001): the first cut
 * used `lg:grid-rows-3`, Tailwind's `grid-template-rows: repeat(3, minmax(0,
 * 1fr))` — three EQUAL, flexible tracks. An `fr` track in an auto-height
 * grid still sizes to the tallest CONTENT it is asked to hold before
 * dividing the space evenly, so the spanning conversation cell (whose own
 * intrinsic height dwarfs any single right-column card) dragged all three
 * tracks up to a third of ITS height each — the right column's three cards
 * stayed their own short height, and the "gap" between their stack and the
 * conversation's own bottom edge was blank leftover track space, not a
 * uniform 24px gap. Measured: conversation 1015.78px against the three
 * right cards' own 136.3 + 322.59 + 208.3 plus two 24px gaps = 901.49px —
 * 114px of exactly this kind of dead space.
 *
 * THE FIX IS THE ROWS' OWN SIZE, NOT A SPAN. `lg:grid-rows-[auto_auto_auto]`
 * sizes each of the right column's three tracks to ITS OWN cell's content —
 * Related stories/Work logs/Stakeholders auto-placed into them exactly as
 * before — so the conversation's `row-span-3` height becomes the SUM of
 * three tracks the right column alone decided, which is the client's own
 * arithmetic ("the addition of the three of the right, same as
 * conversation") drawn structurally rather than approximated. The
 * conversation cell also carries `lg:min-h-0` beside `lg:h-full`: a grid
 * item's default min-height is `auto` (its own content's min-content size),
 * which — spanning three auto tracks — would otherwise feed the
 * conversation's OWN tall intrinsic height back into the very rows it is
 * trying to measure FROM, inflating them again by the back door
 * `grid-rows-3` used the front one for. `min-h-0` floors that contribution
 * to zero, so only the right column's three cells set the tracks.
 * `items-stretch` (the grid default, stated here rather than left implicit)
 * then stretches the conversation cell to the FULL sum of those tracks, and
 * `TicketConversationPanel`'s own `lg:h-full` fills whatever height that
 * cell resolves to — a grid item's used size is definite for a descendant's
 * percentage height the same way a flex item's is, so `h-full` there
 * resolves against a real number rather than `auto`. The thread scrolls
 * inside (`overflow-y-auto`, `min-h-0`, already on `TicketConversationPanel`
 * below) so a long conversation never forces the card — and therefore the
 * tracks — taller than the right column's own three cards decided. Below
 * `lg` there is no second column to measure against and the grid collapses
 * to one, exactly as before. */
export function TicketDetailBody({
  conversation,
  stories,
  time,
  stakeholders,
}: {
  conversation: React.ReactNode
  stories: React.ReactNode
  time: React.ReactNode
  stakeholders: React.ReactNode
}) {
  return (
    <div className="grid min-w-0 grid-cols-1 items-stretch gap-6 lg:grid-cols-[2fr_1fr] lg:grid-rows-[auto_auto_auto]">
      <div
        id={TICKET_PANEL_ANCHOR.conversation}
        className="min-w-0 lg:row-span-3 lg:h-full lg:min-h-0"
      >
        {conversation}
      </div>
      {/* NO WRAPPING COLUMN HERE ANY MORE — the three panels below are direct
          grid children now (auto-placed into column 2's three rows), which
          is what lets the conversation cell's own row-span measure THEM
          rather than a `flex-col` box with a height of its own. Below `lg`
          the grid collapses to one column and these three simply stack under
          the conversation in DOM order, same as before. */}
      <div id={TICKET_PANEL_ANCHOR.stories}>{stories}</div>
      <div id={TICKET_PANEL_ANCHOR.time}>{time}</div>
      <div id={TICKET_PANEL_ANCHOR.stakeholders}>{stakeholders}</div>
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
 * `lg:h-full`, NOT A FIXED VIEWPORT HEIGHT AT THAT WIDTH — R16's sibling
 * ruling on this same file (18 Sep 2026, `TicketDetailBody`'s own header):
 * the card's height is now the GRID's to decide (it spans the right
 * column's three rows), so `h-[min(78vh,760px)]` would fight the stretch
 * rather than express it. Below `lg` there is no second column to stretch
 * against, so the old viewport-relative height stays exactly as it was.
 *
 * THE COMPOSER IS THE CARD'S `CardFooter` NOW, NOT A THIRD FLEX CHILD OF A
 * PADDED `CardContent` — client ruling, 18 Sep 2026, verbatim: "the footer
 * is not on the footer position!! fix that!" The earlier shape put
 * `thread`/`attachments`/`composer` as three siblings inside ONE
 * `CardContent`, each wrapped `shrink-0` and separated by a flex `gap` —
 * which reads as "three things in a padded box," not a footer, because
 * `CardContent`'s own inset wraps the composer on every side including the
 * bottom, leaving a gap between the pill and the card's own bottom edge/
 * radius. The kit's `Card` already has the shape this ruling asks for
 * (card.tsx's own chapter-13 quote: "Header, body, and footer are
 * hairline-separated inside one 24px shell — never three stacked cards"):
 * `CardContent` holds only the scrolling THREAD now, and `CardFooter` —
 * the kit's own footer band, hairline-separated from the body, no fill of
 * its own — holds the composer as the LAST child of `Card`. Neither
 * `CardContent` nor `CardFooter` paints a background, so the only fill in
 * the shell is `Card`'s own (`variant="default"`, `--surface-panel`) —
 * "the panel tone" the ruling asks the footer to carry is automatic, not a
 * class to add — and `Card`'s own `rounded-[var(--radius)]` with no
 * `overflow: hidden` (card.tsx's own note) means the footer's bottom edge
 * sits flush inside the card's real bottom radius rather than a second,
 * inset box drawing its own.
 *
 * THE "FILES AND LINKS" TRAY THAT USED TO SIT BETWEEN `thread` AND
 * `composer` (an `attachments` prop, added the same day) IS GONE — the
 * SAME DAY'S later ruling, verbatim: "wtf is his files inside the
 * ocnversation lol thats not what i meant, i meant that each message can
 * have images or files." A ticket-wide list box floating inside the
 * conversation was never what was asked for; `help-detail.tsx`'s own
 * header carries the full account of what replaces it — per-message
 * attachments, fed from the kit's `TicketThread`, now shipped behind team
 * migration 0105 (`help_attachments.help_thread_id`). This panel itself
 * needed no change for that: the files ride the MESSAGES `thread` already
 * carries, never a second slot beside it. The `attachments` prop stays
 * deleted rather than restored: its
 * one caller (`help-detail.tsx`) no longer has anything to pass it, and an
 * unused slot to a removed feature is exactly the kind of code this base's
 * first prime directive ("too much code is a defect") exists to catch. */
export function TicketConversationPanel({
  thread,
  composer,
}: {
  thread: React.ReactNode
  composer: React.ReactNode
}) {
  return (
    <Card variant="default" className="flex h-[min(78vh,760px)] min-h-[420px] flex-col lg:h-full">
      <CardContent className="min-h-0 flex-1 overflow-y-auto p-4">{thread}</CardContent>
      <CardFooter className="shrink-0 p-4">{composer}</CardFooter>
    </Card>
  )
}
