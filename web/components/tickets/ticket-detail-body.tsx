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

import { Card, CardContent } from "@shared/ui/components/card/card"

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
 * A real CSS GRID does this with no JS measuring: `lg:grid-rows-3` gives the
 * right column three explicit rows, the conversation cell carries
 * `lg:row-span-3` (grid-row: span 3), and grid auto-placement puts Related
 * stories/Work logs/Stakeholders into the three column-2 cells it leaves
 * behind — the standard "one tall cell beside a stack" trick, not a manual
 * `grid-row` on each of the three. `items-stretch` (the grid default, stated
 * here rather than left implicit) is what makes the SPANNING cell's height
 * follow the stack's own natural height rather than the other way round:
 * `TicketConversationPanel` drops its old viewport-relative
 * `h-[min(78vh,760px)]` for `lg:h-full` so it fills whatever the grid hands
 * it, keeping the old height only below `lg`, where there is no second
 * column to measure against and the panel is on its own again. */
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
    <div className="grid min-w-0 grid-cols-1 items-stretch gap-6 lg:grid-cols-[2fr_1fr] lg:grid-rows-3">
      <div
        id={TICKET_PANEL_ANCHOR.conversation}
        className="min-w-0 lg:row-span-3"
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
 * `attachments`, OPTIONAL, BETWEEN THE THREAD AND THE COMPOSER — client
 * ruling, 18 Sep 2026: "kill this whole files & links… button. fyi those are
 * visible in the conversation itself." A tray, not a scrolling list item: it
 * sits in this same gapped column, `shrink-0` like the composer beside it,
 * so it never scrolls out of reach with the transcript and never eats into
 * the composer's own fixed row. Absent draws nothing, which is the shape
 * `story-detail.tsx`'s files tab (unaffected by this ruling) still uses. */
export function TicketConversationPanel({
  thread,
  attachments,
  composer,
}: {
  thread: React.ReactNode
  attachments?: React.ReactNode
  composer: React.ReactNode
}) {
  return (
    <Card variant="default" className="flex h-[min(78vh,760px)] min-h-[420px] flex-col lg:h-full">
      <CardContent className="flex min-h-0 flex-1 flex-col gap-[var(--space-5)] p-4">
        <div className="min-h-0 flex-1 overflow-y-auto">{thread}</div>
        {attachments ? <div className="shrink-0">{attachments}</div> : null}
        <div className="shrink-0">{composer}</div>
      </CardContent>
    </Card>
  )
}
