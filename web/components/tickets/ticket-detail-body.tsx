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
 * R89 "footer-on-the-edge", 18 Sep 2026, VERBATIM, SUPERSEDING THE SAME
 * DAY'S EARLIER "sum of three" CONSTRUCTION BELOW: "On ticket detail, the
 * footer should be at the very bottom. The position is still fucking wrong.
 * Fix it once and for all." Measured live on staging (T0001, headless
 * Playwright, `${SCRATCH}/footer-measure.json`) BEFORE this fix: the screen
 * body (`[data-slot="screen-shell-body"]`) closed at y=884 at 1440×900, and
 * the conversation card's own footer closed at y=1298 — 414px past the
 * visible screen, because the earlier construction (below) sized the
 * conversation card to the SUM of the three side panels' own content
 * height, never to the screen's actual available height. A footer at the
 * bottom of a card that is itself floating in the middle of a scrolled page
 * is not a footer "at the very bottom" in the sense she means it — the
 * screen's own bottom edge.
 *
 * THE FIX IS BY CONSTRUCTION, THE SAME STANDARD EVERY OTHER LAW IN THIS
 * BASE HOLDS TO: no magic pixel offset, no viewport-relative guess. This
 * component's own root is a FLEX ITEM of `app-shell.tsx`'s own R29 page
 * container (`className="mx-auto flex w-full max-w-none min-w-0 h-full
 * flex-col …"`, the ONE thing that div wraps besides `<LiveStatus/>`) — a
 * `flex-col` box sitting on the screen body's own visible height
 * (`[data-slot="screen-shell-body"]`, `min-h-0 flex-1 overflow-y-auto`,
 * ScreenShell's own scroller).
 *
 * RE-PROVEN LIVE, 18 SEP 2026 EVENING, AND CORRECTED IN TWO PLACES THIS
 * PARAGRAPH USED TO GET WRONG. The FIRST landing of this law claimed
 * `min-h-full` on `app-shell.tsx`'s page container was already enough and
 * needed no edit — false: `min-height` is only ever a FLOOR a `height:auto`
 * block can grow PAST, and the instant real content (a ticket with an
 * actual conversation, not an empty fixture) is taller than that floor,
 * there is no leftover space left for any descendant's `flex-grow` to
 * consume — every `flex-1 min-h-0` box downstream, this grid included, just
 * rendered at its own natural content size, because nothing above them was
 * ever DEFINITE. Measured before this correction: the page container stood
 * 1312px tall against a 785px pane. `app-shell.tsx` now uses `h-full`
 * (`height: 100%`, a real, definite number, not a floor) — see that file's
 * own note for why this is safe for every OTHER screen (nothing here sets
 * `overflow`, so taller content still paints past the box and
 * `screen-shell-body` still scrolls all of it, proved against the tickets
 * dashboard and an account detail page, pixel-identical before/after).
 *
 * SECOND: with the column finally definite, `RecordScreen`'s own head
 * (`RecordChrome`, rendered above this grid as a SIBLING because
 * `help-detail.tsx` passes `panelVisible={false}`) was ALSO carrying
 * `flex-1 min-h-0` — so the column's real height split 50/50 between the
 * head and this grid, never "everything the head doesn't need". Fixed in
 * `web/components/records/record-chrome.tsx` (`HEAD_ONLY`, read off
 * `panelVisible` directly): the head now takes exactly its own content
 * height, and this grid's `lg:flex-1` claims everything left over — which
 * is what "fills exactly what `<RecordScreen>`'s head leaves behind" always
 * meant, just not what the first landing's CSS actually did.
 *
 * ONE ROW NOW, NOT THREE — the grid's own tracks have to be able to
 * STRETCH to fill that definite height, and CSS Grid's default
 * `align-content: normal` behaves as `stretch` for a SINGLE track but
 * would split the leftover space three ways across three separate `auto`
 * tracks, which is not "the side cards scroll independently" this law also
 * asks for. So the right column collapsed from three grid cells (Related
 * stories / Work logs / Stakeholders each auto-placed into its own row) to
 * ONE cell holding a `flex flex-col gap-6 overflow-y-auto` wrapper around
 * the same three panels — the identical `gap-6` the grid's own column-gap
 * already spent between the two columns, not a new number. `items-stretch`
 * (the grid default, stated rather than left implicit) then stretches BOTH
 * column cells to the row's own full height: the conversation cell
 * (`lg:h-full lg:min-h-0`, unchanged) and the side wrapper
 * (`lg:h-full lg:min-h-0 lg:overflow-y-auto`) end up the SAME height,
 * exactly matching the ground `screen-shell-body` sits on — and the side
 * wrapper scrolls its own three cards independently the moment they are
 * TALLER than that height, rather than pushing the conversation card's
 * footer down with them the way the old row-span-3 sum did.
 *
 * `data-slot="ticket-detail-body"` is this file's own marker — read by
 * `web/test/rules.test.ts` (R89) and by nothing else; it draws no CSS of
 * its own and is not a new global selector to keep in step with anything.
 *
 * BELOW `lg` NOTHING HERE CHANGED: the grid collapses to one column, the
 * flex-fill classes are all `lg:`-gated, and the page scrolls as a whole
 * exactly as it did before this law, because there is no second column's
 * height to match on a phone.
 *
 * THE EARLIER "SUM OF THREE" CONSTRUCTION, KEPT FOR THE RECORD (superseded,
 * not deleted, because a later reader asking "why isn't this `grid-rows-3`"
 * deserves the same measured answer the first ruling got): the client's
 * ruling that morning, verbatim, "the ticket detail conversation should
 * have more height, depending on the height of the right column
 * components. they should be, the addition of the three of the right, same
 * as conversation" — first tried as `lg:grid-rows-3` (three EQUAL `1fr`
 * tracks), which measured wrong (the spanning conversation cell dragged all
 * three tracks up to a third of ITS OWN height each, 114px of dead space
 * between the right column's real bottom and the conversation's), then
 * fixed with `lg:grid-rows-[auto_auto_auto]` + `row-span-3` so the
 * conversation's height became the right column's own sum. That
 * construction was correct FOR THE RULING IT ANSWERED — it never claimed to
 * reach the screen's own bottom edge, only to match the two columns to each
 * other — and R89 is a different, later ruling entirely: "at the very
 * bottom" names the SCREEN, not the sidebar. */
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
    <div
      data-slot="ticket-detail-body"
      className="grid min-w-0 grid-cols-1 items-stretch gap-6 lg:grid-cols-[2fr_1fr] lg:flex-1 lg:min-h-0"
    >
      <div id={TICKET_PANEL_ANCHOR.conversation} className="min-w-0 lg:h-full lg:min-h-0">
        {conversation}
      </div>
      {/* ONE GRID CELL, HOLDING ITS OWN SCROLLER — see the header above for
          why three separate auto-placed rows cannot stretch to the grid's
          own full height the way a single cell can. The three anchors stay
          exactly where a deep link (`help-detail.tsx`'s own scroll effect)
          already expects them, nested inside the scroller rather than
          removed. */}
      <div className="flex min-w-0 flex-col gap-6 lg:h-full lg:min-h-0 lg:overflow-y-auto">
        <div id={TICKET_PANEL_ANCHOR.stories}>{stories}</div>
        <div id={TICKET_PANEL_ANCHOR.time}>{time}</div>
        <div id={TICKET_PANEL_ANCHOR.stakeholders}>{stakeholders}</div>
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
 * `lg:h-full`, NOT A FIXED VIEWPORT HEIGHT AT THAT WIDTH — R16's sibling
 * ruling on this same file (18 Sep 2026, `TicketDetailBody`'s own header):
 * the card's height is now the GRID's to decide (it spans the right
 * column's three rows), so `h-[min(78vh,760px)]` would fight the stretch
 * rather than express it. Below `lg` there is no second column to stretch
 * against, so the old viewport-relative height stays exactly as it was.
 *
 * `lg:min-h-0` RELEASES `min-h-[420px]` AT `lg` TOO — R89 RE-PROOF, 18 Sep
 * 2026 evening. `min-h-[420px]` is a BELOW-`lg` floor (so a short viewport
 * never crushes the card thinner than a usable chat panel while it is
 * stacked full-width above the side column) — measured live once the grid
 * actually had a real height to give this card (`${SCRATCH}/
 * check-sel2.json`): with a heavy head + audit footer above it, the grid's
 * own real budget can measure LESS than 420px, and `min-height` always
 * wins over a smaller `height` regardless of which utility the cascade
 * would otherwise prefer — so the card sat pinned at exactly 420px, 48px
 * past the grid's own row, the same "min-height floor outlives the
 * breakpoint it was written for" shape `tickets-dashboard.tsx` already
 * names and releases with `lg:min-h-0` on its own stacked panels. Same
 * fix, same reason, here.
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
    <Card variant="default" className="flex h-[min(78vh,760px)] min-h-[420px] flex-col lg:h-full lg:min-h-0">
      <CardContent className="min-h-0 flex-1 overflow-y-auto p-4">{thread}</CardContent>
      <CardFooter className="shrink-0 p-4">{composer}</CardFooter>
    </Card>
  )
}
