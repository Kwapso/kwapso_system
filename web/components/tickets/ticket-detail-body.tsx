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

/** THE SPLIT, AND NOTHING INSIDE IT. What each region holds is the caller's —
 * this component's one job is the layout and the anchors a deep link scrolls
 * to.
 *
 * R89 "footer-on-the-edge", 18 Sep 2026, VERBATIM, SUPERSEDING THE SAME
 * DAY'S EARLIER "sum of three" CONSTRUCTION BELOW: "On ticket detail, the
 * footer should be at the very bottom. The position is still fucking wrong.
 * Fix it once and for all." That landing (fully told in this file's git
 * history and in `shared/rules/registry.ts`'s own R89 entry) made the LG
 * two-column layout correct — measured live, the conversation card's
 * footer sits 24px above the screen body's own bottom edge at 1440×900,
 * 1280×800 and 1024×768.
 *
 * BELOW-LG RE-FIX, 19 SEP 2026, ANSWERING A SECOND, NARROWER RULING —
 * Aurora, verbatim, told the LG fix was still wrong: "No, this is still
 * wrong. The footer is currently under the stages and above the content.
 * … I cannot believe you're so stupid and you cannot fix this." She was
 * not looking at a regression of the LG fix — she was looking at a width
 * the LG fix never touched. Below `lg` the old grid collapsed to ONE
 * column and stacked its two children in DOM order: the conversation
 * (thread + composer together, one `<Card>`) FIRST, the three side panels
 * SECOND — so the composer sat right under the stage ladder, with "the
 * content" (Related stories / Work logs / Stakeholders) rendering AFTER
 * it. That is exactly her sentence, and it was true at every width under
 * 1024px, confirmed live (`${SCRATCH}/footer-below-lg-before.json`): at
 * 760×900 (rail collapsed) the conversation card closed at y=1266 — 434px
 * past the visible screen body (y=832) — and the side panels started at
 * y=1290, AFTER it.
 *
 * A FACT THIS RE-FIX ESTABLISHED THAT THE ORIGINAL TASK ASSUMED WRONG, SO
 * IT DOES NOT COST THE NEXT READER THE SAME RE-DISCOVERY: `lg:` HERE IS A
 * VIEWPORT BREAKPOINT, NOT A CONTAINER QUERY. Opening the assistant panel
 * narrows the CONTENT column (measured live: 805px wide at a 1440px
 * viewport with the assistant open) but the VIEWPORT is still 1440px, and
 * neither this file, `app-shell.tsx` nor `screen-shell.tsx` puts
 * `container-type` anywhere upstream of this component — so Tailwind's
 * `lg:` variant, a plain `@media (min-width: 1024px)` rule, stays ACTIVE
 * the whole time. Proven live (`${SCRATCH}/footer-below-lg-before.json`,
 * `"1440x900-assistant-open"`): the two-column layout is untouched with
 * the assistant open, footer 24px above the screen body's bottom, same as
 * with it closed. So is 1024×768 — 1024 is the breakpoint's own
 * `min-width`, still "lg". The genuinely narrow states are real
 * sub-1024px viewports (a phone, or a desktop window narrowed by hand);
 * 760×900 is this law's own proof width for that reason, not the
 * assistant panel.
 *
 * WHY A REAL JS BREAKPOINT DECIDES THE TREE, NOT A `max-lg:`/`lg:` CLASS
 * PAIR ON ONE TREE. The first draft tried exactly that (a single grid that
 * collapses to one column, `order-*` walking the two columns back to their
 * LG positions, `flex-1 min-h-0` unconditional so the column fills the
 * screen at every width) — and it broke on the FIRST live proof against a
 * real ticket (`${SCRATCH}/footer-below-lg-inject.json`, 760×900): the
 * head (chips, title, stage ladder) alone measured ~434px of a 585px
 * budget at that width, leaving ~151px for TWO separate `flex-1` regions
 * (the side panels and the conversation) to fight over — and a flex item
 * with `flex-basis: 0` and `min-height: 0` shrinks toward its basis, not
 * its content, the instant there is no surplus to grow into. The
 * conversation measured a real, live, on-screen height of 0. Two SEPARATE
 * `flex-1` regions is the wrong shape for a tight budget; ONE shared
 * scrolling region (side panels, then the thread, stacked — never
 * competing for space, always reachable by scrolling however small the
 * budget) is the right one, per Option B this task's own brief named. But
 * that shape needs the composer OUTSIDE that one scrolling region, pinned
 * as its own `flex-none` band — and the composer is ONE stateful control
 * (`reply-composer.tsx`'s own `field` ref, its held-reply countdown, its
 * attach-tile grid), so it cannot ALSO stay nested inside
 * `TicketConversationPanel`'s `CardFooter` for the LG case without being
 * two mounted instances of the same control, sharing one ref, one hidden
 * from the other by CSS — the exact bug class `shared/web/head-
 * actions.tsx`'s own "TWO RENDERS OF THE SAME ACTIONS" pattern is safe for
 * (plain, stateless content) and this composer is not (an interactive
 * control with a DOM ref). So the tree itself has to differ by width, and
 * `web/lib/use-is-phone.ts` already banked the house answer for exactly
 * this shape — "a phone gets a sheet instead of a popover," a real
 * decision, not a resize — reused here at this file's own `lg` threshold
 * (`useSyncExternalStore` + `matchMedia`, so the FIRST client render
 * already knows, no flash of the wrong tree) rather than adding a fourth
 * copy of the same three lines to a shared file this lane does not own.
 *
 * AT LG (`isAtLeastLg`): BYTE-IDENTICAL TO THE FIRST R89 LANDING. A grid,
 * `lg:grid-cols-[2fr_1fr]` — well, plain `grid-cols-[2fr_1fr]` now, since
 * JS already decided this branch only mounts at `lg` — the conversation
 * cell on the left holding the ONE `TicketConversationPanel` (thread AND
 * composer, `CardFooter` last), the side column on the right, both
 * `h-full min-h-0`, the side column `overflow-y-auto`. Nothing here
 * changed from the working LG proof.
 *
 * BELOW LG (`!isAtLeastLg`): `flex flex-col`, filling the SAME
 * `flex-1 min-h-0` budget the LG grid already claimed against
 * `app-shell.tsx`'s own R29 page column (`h-full flex-col`, unchanged,
 * needed no edit). ONE scrolling region (`flex-1 min-h-0 overflow-y-auto`)
 * holds the side panels FIRST (her own "above the content" complaint,
 * answered by DOM order) and the conversation's THREAD second — a plain
 * `<Card><CardContent>{thread}</CardContent></Card>`, no footer inside it,
 * so nothing about it competes for the composer's own space. The composer
 * itself is the kit's own `<CardFooter>` — the SAME component
 * `TicketConversationPanel` uses at LG, never a hand-rolled look-alike —
 * rendered as this flex column's `flex-none` LAST child, given the fill
 * `TicketConversationPanel`'s own `Card` would have supplied
 * (`bg-surface-panel`) since it no longer sits inside one. D21
 * (`footer-is-last.test.ts`) is satisfied the same way it always is: this
 * `<CardFooter>` IS the last real child of its own enclosing box.
 * `TICKET_PANEL_ANCHOR`'s three ids stay singular either way — exactly one
 * tree renders at a time, so there is never a duplicate id for
 * `help-detail.tsx`'s own `getElementById` deep-link scroll to trip on.
 *
 * NEITHER `reply-composer.tsx` NOR `TicketConversationPanel` (below)
 * changed for this re-fix — the composer's own markup, and its one LG
 * home inside `CardFooter`, are untouched; only WHICH TREE this component
 * builds, and where the SAME composer element lands in it, did.
 *
 * `data-slot="ticket-detail-body"` is this file's own marker — read by
 * `web/test/footer-on-the-edge.test.ts` (R89) and by nothing else; it draws
 * no CSS of its own and is not a new global selector to keep in step with
 * anything.
 *
 * THE EARLIER "SUM OF THREE" CONSTRUCTION, KEPT FOR THE RECORD (superseded,
 * not deleted — see this file's git history for the client's own morning
 * ruling it answered and why `lg:grid-rows-3` measured wrong before
 * `row-span-3` fixed it): that construction was correct for the ruling it
 * answered (matching the two columns to EACH OTHER) and was never claiming
 * to reach the screen's own bottom edge — R89, first the LG landing and now
 * this below-lg one, is the later, different ruling that does. */

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

  if (isAtLeastLg) {
    return (
      <div
        data-slot="ticket-detail-body"
        className="grid min-w-0 flex-1 min-h-0 grid-cols-[2fr_1fr] items-stretch gap-6"
      >
        <div id={TICKET_PANEL_ANCHOR.conversation} className="min-w-0 h-full min-h-0">
          <TicketConversationPanel thread={thread} composer={composer} />
        </div>
        {/* ONE CELL, HOLDING ITS OWN SCROLLER — the three anchors stay exactly
            where a deep link (`help-detail.tsx`'s own scroll effect) already
            expects them. */}
        <div className="flex min-w-0 flex-col gap-6 h-full min-h-0 overflow-y-auto">
          <div id={TICKET_PANEL_ANCHOR.stories}>{stories}</div>
          <div id={TICKET_PANEL_ANCHOR.time}>{time}</div>
          <div id={TICKET_PANEL_ANCHOR.stakeholders}>{stakeholders}</div>
        </div>
      </div>
    )
  }

  return (
    <div data-slot="ticket-detail-body" className="flex min-w-0 flex-1 min-h-0 flex-col">
      {/* ONE SCROLLING REGION — side panels, then the thread, NEVER competing
          two separate flex-1 boxes (see the header above for the live proof
          that shape crushes to zero on a tight budget). However small this
          region's own share of the column turns out to be, everything in
          it stays reachable by scrolling it, nothing is silently dropped
          to zero. */}
      <div className="flex min-w-0 flex-1 min-h-0 flex-col gap-6 overflow-y-auto">
        <div id={TICKET_PANEL_ANCHOR.stories}>{stories}</div>
        <div id={TICKET_PANEL_ANCHOR.time}>{time}</div>
        <div id={TICKET_PANEL_ANCHOR.stakeholders}>{stakeholders}</div>
        <div id={TICKET_PANEL_ANCHOR.conversation}>
          <Card variant="default">
            <CardContent className="p-4">{thread}</CardContent>
          </Card>
        </div>
      </div>
      {/* THE COMPOSER, PINNED — the kit's own `CardFooter`, the identical
          component `TicketConversationPanel` uses at `lg`, as this flex
          column's `flex-none` LAST child (D21). `bg-surface-panel` is the
          fill `TicketConversationPanel`'s own `Card` would have supplied
          around it; standing outside any `Card` here, it has to carry that
          fill itself so the composer's own `bg-card` pill still reads
          against the panel tone rather than the page's. No radius: this
          band spans the screen's own full width, flush with its bottom
          edge, the same shape a fixed app toolbar takes rather than a
          card's own rounded foot. */}
      <CardFooter className="shrink-0 bg-surface-panel p-4">{composer}</CardFooter>
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
 * `h-full min-h-0`, UNCONDITIONAL, NO `lg:` PREFIX — R89 BELOW-LG RE-FIX,
 * 19 SEP 2026. This component is the LG-ONLY conversation card now —
 * `TicketDetailBody`'s own header explains why the below-lg case builds a
 * separate, footer-less thread card instead of reusing this one — so it
 * only ever mounts inside a grid cell that is ALREADY a real, definite
 * height (`h-full` of the LG grid row); the earlier `lg:`-gated pair
 * (`lg:h-full lg:min-h-0`, answering a below-lg case this component no
 * longer has to cover) and the viewport-relative guess before that
 * (`h-[min(78vh,760px)]`, and the `min-h-[420px]` floor that used to
 * protect the below-lg STACKED case against it) are both gone — a floor
 * for a case this component no longer renders is dead weight, not
 * caution. `min-h-0` stays (unconditional too): a grid item's own
 * `min-height: auto` defaults to its content's min size, which would stop
 * `h-full` resolving SMALLER than the thread's natural height and break
 * `CardContent`'s own `overflow-y-auto` below.
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
    <Card variant="default" className="flex h-full min-h-0 flex-col">
      <CardContent className="min-h-0 flex-1 overflow-y-auto p-4">{thread}</CardContent>
      <CardFooter className="shrink-0 p-4">{composer}</CardFooter>
    </Card>
  )
}
