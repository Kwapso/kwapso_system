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
// R67, READ FORWARDS FOR ONCE. `RecordScreen`'s `panel` region is ALREADY
// paper — the kit's `RecordDetail` wraps whatever it is handed in ONE `Card`,
// `variant="default"` (`bg-surface-panel`, the kit's own soft-paper tone,
// `record-detail.tsx`: "The panel is `--card` at radius 24 — the one opaque
// region"). A section dropped straight into that region stands on its OWN
// ground — contrast 1.000, the exact "false offender" shape the rulebook's
// R67 account describes, read the other way round: not a titled section
// with no container, but a container that is the SAME tone as the one
// already under it. `TicketSidePanel`/`TicketConversationPanel` below are
// `variant="raised"` (`bg-card`) for exactly that reason — raised-on-soft-
// paper, the kit's own §2.6 pairing (UI-RULEBOOK, "bg-card is a fine
// container on a panel"), never the default `Card`, which would repaint the
// same tone the ambient region already wears.
//
// NEITHER WRAPPER DRAWS A `<section>`. `web/test/sections-stand-on-paper.test.ts`
// (R67) reads that one tag, walking whether IT stands on paper — asking it
// of a `<div>` that already carries `Card`'s own `bg-card` fill would be
// asking a question this file has already answered structurally, not
// dodging one it owes.

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
 * link scrolls to. */
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
    <div className="grid min-w-0 grid-cols-1 items-start gap-6 lg:grid-cols-3">
      <div id={TICKET_PANEL_ANCHOR.conversation} className="min-w-0 lg:col-span-2">
        {conversation}
      </div>
      {/* THE RIGHT COLUMN STACKS UNDER THE CONVERSATION ON A PHONE — one flex
          column at every width; `lg:grid-cols-3` above is what turns this
          into a real second column, not a class here. */}
      <div className="flex min-w-0 flex-col gap-6">
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
    <Card variant="raised">
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
 * the whole page's scroll. */
export function TicketConversationPanel({
  thread,
  composer,
}: {
  thread: React.ReactNode
  composer: React.ReactNode
}) {
  return (
    <Card variant="raised" className="flex h-[min(78vh,760px)] min-h-[420px] flex-col">
      <CardContent className="flex min-h-0 flex-1 flex-col gap-[var(--space-5)] p-4">
        <div className="min-h-0 flex-1 overflow-y-auto">{thread}</div>
        <div className="shrink-0">{composer}</div>
      </CardContent>
    </Card>
  )
}
