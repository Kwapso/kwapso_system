"use client"

// THE TICKETS DASHBOARD — the Monday screen.
//
// Six panels over one door read (`content.helpDashboard`), which is the whole
// architecture of this file: every number here was counted by the database, and
// nothing on this tab is a list. The backlog is a GROWING collection (R14) the
// browser only ever holds page one of, so a chart drawn from loaded rows would
// be a picture of the newest fifty tickets under a heading that says backlog.
// That single sentence decides almost everything below — why the toolbar's
// filters AND its search box are door parameters rather than a sieve, why there
// is no sort control, and why this component fetches one object and draws it
// rather than reducing arrays of tickets.
//
// …AND THE SAME SCREEN NARROWED TO ONE SYSTEM (2026-09-06). The app record's
// Tickets tab has two views now — a list and this — and the dashboard view is
// this component with an `appId`: the same door, the same panels, one more
// clause in the WHERE. Two of the six panels stand down there because one app
// empties them of MEANING (the reasons are at their own call sites, in the
// screen at the foot of this file), and that is the only thing the narrowing
// changes. It is not a second dashboard and there is no second copy of any
// panel — the client asked for "a mini version, a filtered version", and a
// filtered version of a screen is that screen with a filter on it, never a
// smaller one built beside it.
//
// ── WHY THE PICTURES ARE DRAWN HERE AND NOT BY THE KIT ──────────────────────
//
// The kit's `Chart` (Recharts, reached through `pulse-charts.tsx`'s one lazy
// boundary) draws a bar, an area and a stacked bar over a category axis. Five of
// the six panels here are none of those: a pipeline grid, a recategorisation
// matrix, and a box-and-whisker of a duration distribution have no Recharts
// shape in the vendored kit at all, and the sixth — the twelve-month trend — is
// an area whose x-axis is months with gaps in it. R39 rules that the kit
// supplies the UI and nothing else does; it forbids reaching for a SECOND UI
// PACKAGE, which nothing here does. These are plain elements and one inline
// `<svg>` path, coloured through tokens (R32) and the chart series
// (`ticketTypeColour`), the same way `relationship-map.tsx` and
// `process-map.tsx` already draw their own pictures app-side.
//
// TOLD, NOT HIDDEN: if the kit grows a box plot, a heat grid or a gapped area,
// these should be replaced by it. That is a gap in the kit, not a decision to
// live outside it.
//
// ── WHY THE MARKS ARE HTML AND THE TREND IS SVG ─────────────────────────────
//
// A bar is a box with a width, and a box with a width is a `<div>` that reflows,
// wraps and reads at the reader's own text size. An `<svg>` scaled to its
// container scales its TEXT with it, so the same chart is unreadable at 320px
// and cartoonish at 1400. So everything that is a bar, a cell or a dot is drawn
// as elements, and the one shape that genuinely needs a path — the filled trend
// — is an SVG with `preserveAspectRatio="none"` holding NO TEXT at all: its
// months and its scale are HTML beside it, at real size, and its strokes carry
// `vector-effect="non-scaling-stroke"` so the non-uniform scale cannot squash
// them.
//
// ── EVERY COLOUR COMES FROM THE SERIES ──────────────────────────────────────
//
// `ticketTypeColour` (web/lib/type-colours.ts), never a raw `--kw-*` pigment:
// that file's own header explains why (the raw palette has no dark half and the
// series does). And the WORD always sits beside the mark — poppy and forest
// measure the same luminance, so a dot on its own is a mark nobody can read.

import * as React from "react"

import { Card, CardContent } from "@shared/ui/components/card/card"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { Button } from "@shared/ui/components/button/button"
// THE KIT'S OWN FLOATING PANEL, opened by hover AND by focus (client, 6 Sep
// 2026: "I want that when I hover over the graphic on a specific day, it has a
// little modal that gives me the info for this date"). It is the kit's part
// rather than a panel drawn here, and it is the HOVER CARD rather than the
// TOOLTIP because the kit rules the difference itself: its tooltip is a
// charcoal pill holding ONE line (`whitespace-nowrap` "is the design, not a
// convenience"), and a month's readout is a stack — the month, then one line
// per kind. The kit's own hover-card header names that exact trade ("putting
// that on the charcoal pill would either force the pill to grow into a panel …
// or force the record to shrink into a sentence"). Adopting it retires its
// `KIT_COMPONENT_EXEMPT` line, which said the app had no candidate; it has one
// now. Nothing in the kit is changed or needed.
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@shared/ui/components/hover-card/hover-card"
import { SearchInput } from "@shared/ui/components/search-input/search-input"
// THE KIT'S OWN DEBOUNCE, the one the record picker already asks the door
// through — see `askDoor` in the screen below for why a search box on THIS tab
// needs one at all.
import { useDebouncedCallback } from "@shared/ui/components/use-debounce/use-debounce"
import { ShapeStateBody } from "@shared/ui/compositions/states/states"
import { useFilterBar } from "@shared/web/screen-engine/filter-bar"
import type { FilterFacet } from "@shared/web/screen-engine/config"
import { useCached } from "@shared/web/store"
import { useT } from "@shared/web/language"

import { Sankey } from "@shared/ui/components/sankey/sankey"
import { ToolbarRow, type ToolbarViewSlot } from "@/components/deep-link/screen-bits"
import { HELP_STATUS } from "@/components/deep-link/shape"
// THE ONLY LEGAL WAY TO WRITE A LINK INSIDE THE APP (R37). Read its own header
// before writing one here — and read `shared/web/ticket-chips.tsx`'s app chip
// too, because the alignment trap it names is exactly the one a chart row walks
// into: `InAppLink` forwards `className` onto a BARE anchor and adds nothing, so
// an anchor in a row of `items-center` is centred by its LINE BOX rather than by
// its text and sits visibly low beside the bar next to it. Every link below
// carries `inline-flex items-center` for that reason and no other.
import { InAppLink } from "@/components/in-app-link"
// THE URL SEAM, called where the anchor is written — see `RowName` below for
// why it is called again there even though `InAppLink` also calls it.
import { safeHref } from "@shared/web/rich-text"
import { content as contentApi, tenancy } from "@/lib/api"
import type { TicketDashboard } from "@/lib/api/content"
import { accountsKey, helpDashboardKey } from "@/lib/live-resources"
import { orderTicketTypes, ticketTypeColour } from "@/lib/type-colours"
import type { Account, HelpStatus } from "@shared/types"
import {
  CLOSURE_WINDOW_MONTHS,
  OPEN_HELP_STATUSES,
  isScopedTicketType,
} from "@shared/types"

/** THE ORDER THE PIPELINE IS READ DOWN, which is now exactly the order the
 * lifecycle is DEFINED in — and it took a retirement to make that true.
 *
 * THIS USED TO REORDER ONE STAGE, and the reason is worth keeping because it
 * explains why the reorder is gone rather than broken. Client, 6 Sep 2026: "in
 * the open work add waiting before ready". `awaiting_validation` ("Waiting on
 * you") led `OPEN_HELP_STATUSES`, because that array is `HELP_STATUSES` minus
 * the closed one and `HELP_STATUSES` is written in the order the STATE MACHINE
 * names its states. Read top to bottom as a journey, that put the stage where a
 * ticket sits waiting for the client ABOVE "New" — before anybody had looked at
 * it — so this file lifted it out and put it back immediately above "Ready",
 * where a reader expects the step just before a thing can be sent.
 *
 * The client retired that stage on 7 Sep 2026 (shared/types.ts,
 * `HELP_STATUSES`), so there is nothing left to lift: the five remaining open
 * stages already read as a journey in their own lifecycle order. The shared
 * array is taken unchanged, which is what the old note said it wanted anyway —
 * "a stage added to the shared list tomorrow appears here in its own lifecycle
 * place without anybody editing this file".
 *
 * WAITING ITSELF DID NOT LEAVE THE PRODUCT, and it is deliberately not a row
 * here: it is a PREDICATE over the ticket's conversation (`waitingClause`,
 * workers/content/src/lib/help.ts), so it has no `byStatus` bucket for this
 * panel to count. The Open board's fifth column is where it is drawn, off a
 * read of its own. */
const PIPELINE_STAGES: HelpStatus[] = [...OPEN_HELP_STATUSES]

/* ══════════════════════════════════════════════════════════════════════════
   The small marks every panel is built from.
   ══════════════════════════════════════════════════════════════════════════ */

/** One horizontal bar on a track: the track is the scale, the fill is the value.
 *
 * THE 4px CORNER IS THE KIT'S, AND IT HAS A NAME. This comment used to end
 * "the kit names 4px as the radius of a bar" and then write bare `rounded`
 * anyway — Tailwind's own 4px key, which happens to agree with the kit today
 * and is answerable to nothing if either moves. It was written by somebody
 * looking for the kit's 4px token and not finding it. It exists:
 * `--radius-sm` (4px · "bars, heat cells, nodes"), and `--radius-bar` is the
 * name pointed at it for exactly this, bridged in the kit's `@theme inline`.
 *
 * So every bar here is `rounded-[var(--radius-bar)]`. The value on screen is
 * unchanged — 4px either way — and what changes is what it is answerable to:
 * the kit's shape law reads the token, and bare `rounded` was invisible to
 * R31 too (its own regex needs a hyphen), so this file's corners were checked
 * by nothing at all. The bracket spelling rather than the word `rounded-bar`
 * is R31's requirement, not the kit's — the kit blesses both (§4.1), and
 * R31's allow-list is written around `var(--radius…)`.
 *
 * The original point stands and is why this is not `--radius`: a 24px corner
 * on a 20px-tall bar is a lozenge. */
function Bar({
  fraction,
  colour,
  title,
}: {
  fraction: number
  colour: string
  title?: string
}) {
  return (
    <div className="bg-muted h-5 min-w-0 flex-1 overflow-hidden rounded-[var(--radius-bar)]" title={title}>
      <div
        className="h-full rounded-[var(--radius-bar)]"
        style={{ width: `${Math.max(fraction * 100, fraction > 0 ? 3 : 0)}%`, backgroundColor: colour }}
      />
    </div>
  )
}

/** A bar split into one segment per ticket type, in the order the caller hands
 * them over — the order is the caller's because it is the same order the legend
 * beside it is drawn in, and two orders is a puzzle rather than a chart. */
function StackedBar({
  segments,
  scale,
}: {
  segments: { type: string; n: number }[]
  scale: number
}) {
  return (
    <div className="bg-muted flex h-5 min-w-0 flex-1 overflow-hidden rounded-[var(--radius-bar)]">
      {/* NO `title` ON A SEGMENT ANY MORE. It used to carry "{kind}: {n}", which
          is the browser's own tooltip — the affordance the client asked this
          screen to move OFF for the closing-time readout. The figures behind
          this bar are the hover card `TallyBar` opens instead: reachable by
          focus, coloured beside the word, and complete rather than one segment
          at a time. */}
      {segments.map((s) => (
        <div
          key={s.type}
          style={{ width: `${(s.n / scale) * 100}%`, backgroundColor: ticketTypeColour(s.type) }}
        />
      ))}
    </div>
  )
}

/** THE WORD BESIDE THE COLOUR, every time. `type-colours.ts`'s own closing
 * paragraph is the reason this exists as a component rather than as a dot: four
 * of the series members pair off at identical luminance, so in greyscale or to a
 * reader with a colour-vision deficiency the dot alone is one mark drawn four
 * times. */
function TypeKey({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span
        aria-hidden="true"
        className="size-2 rounded-pill"
        style={{ backgroundColor: ticketTypeColour(type) }}
      />
      {type}
    </span>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   THE ROW OF A RANKED CHART — a name you can follow, and a bar you can ask.
   ══════════════════════════════════════════════════════════════════════════ */

/** TWO THINGS THE CLIENT ASKED FOR ON THE SAME ROW, AND HOW THEY WERE SPLIT.
 *
 * "on which app and who has more i want the name apps as links" (2026-09-07,
 * her second time asking) and "on dashboard tickets, which app / i want that
 * when i hover on client i see the details of the numbers of tickets" are two
 * requests about one line of pixels, and a row that is BOTH a link and a hover
 * target is a row where the reader does not know what a press will do.
 *
 * SO THE NAME IS THE LINK AND THE BAR IS THE READOUT. The split is not
 * arbitrary; it is the one arrangement where each gesture lands on the thing it
 * is about:
 *
 *   · THE NAME IS THE RECORD. It is the only part of the row that names an app
 *     or an account, and following a name to its record is the most ordinary
 *     thing a name does in this app — it is what `TicketChips`' app chip, the
 *     breadcrumbs and the relationship map all already do.
 *   · THE BAR IS THE FIGURE. It is the mark the numbers were drawn as, and the
 *     numbers are what the hover card holds. It is also the largest hit area on
 *     the row and the one a pointer lands on without aiming — the same argument
 *     `ClosureSpread` makes one panel down, where "the bar IS the button".
 *
 * A link that also opened a panel would have to choose between navigating and
 * explaining on one press; a bar that also navigated would send a reader to a
 * record they had only meant to read a number off.
 *
 * BOTH ARE REACHABLE FROM THE KEYBOARD, and that is the half that decides
 * whether this split is honest or just tidy. The name is a real anchor and the
 * bar is a real `<button>`, so a row is two tab stops: the first opens the
 * record on Enter, the second opens the hover card on FOCUS (Radix does hover
 * and focus, which is the whole reason this screen uses the kit's hover card
 * rather than a mouse-only tooltip). And because a floating panel is a poor
 * place to keep the only copy of a fact, the button carries the whole readout as
 * its accessible NAME, so a screen reader hears the figures whether or not the
 * card ever opens — the same rule `ClosureSpread` and `ClosureTrend` already
 * follow, from the same reasoning in this file's own hover-card import note.
 *
 * NOT THE BROWSER'S `title`. That is the affordance she was looking at when she
 * asked for the closing-time readout to move off hover, and the per-segment
 * `title` this file's `StackedBar` used to carry went with this change for the
 * same reason. A native tooltip cannot be reached by focus, cannot be styled to
 * put the colour beside the word, and arrives about a second late. */
function RowName({
  path,
  name,
  width,
}: {
  /** WHERE THIS ROW'S RECORD LIVES, or undefined when the row names no record —
   * the "work nobody has said which system it is about" bar, and a client row
   * whose account row no longer answers with a name. Undefined draws plain
   * text: a dead link is worse than no link, because it looks like the app
   * losing the record rather than the row never having had one.
   *
   * A PATH, NOT AN `href`, and the name is the whole point: it is a string until
   * this component binds it to an attribute, and the binding below is where the
   * URL seam is called. Naming the prop `href` would put an unchecked URL
   * attribute at every call site for `web/test/rich-text.test.ts` to read,
   * which is that rule doing its job on a value that had not become a URL yet.
   * (Written in words rather than in markup on purpose: that check scans the
   * SOURCE, comments included, so an example of the shape it forbids, written
   * inside a comment explaining why this avoids it, is itself an offender.) */
  path?: string
  name: string
  /** the row's own label column, the one thing the caller decides */
  width: string
}) {
  if (!path)
    return (
      <span className={`${width} shrink-0 truncate text-xs`} title={name}>
        {name}
      </span>
    )
  return (
    // `inline-flex items-center` IS THE ALIGNMENT FIX, not a layout preference —
    // see this section's header and `shared/web/ticket-chips.tsx`. The underline
    // is on hover only: fourteen permanently underlined names down a chart is a
    // page of rules where the eye is meant to be reading bar lengths, and the
    // kit's own focus ring carries the keyboard half.
    // THROUGH THE SEAM, at the one line that makes this a URL — the positional
    // rule in `web/test/rich-text.test.ts`, and the same shape `record-chrome`
    // already writes. `InAppLink` checks again inside itself, which is not
    // redundancy worth removing: the rule is that a URL is checked where it is
    // BOUND, not that somebody downstream can be trusted to have done it. The
    // fallback is Home rather than nothing, for that component's own reason —
    // a link that renders with no destination is a dead control.
    <InAppLink
      href={safeHref(path) ?? "/home"}
      className={`${width} inline-flex shrink-0 items-center text-xs underline-offset-2 hover:underline`}
    >
      <span className="truncate" title={name}>
        {name}
      </span>
    </InAppLink>
  )
}

/** ONE KIND'S SHARE OF A ROW: what is open, out of everything ever raised. */
type KindTally = { type: string; open: number; total: number }

/** THE BAR, AS THE THING YOU ASK FOR THE BREAKDOWN — the hover half of the split
 * above, written once and used by both ranked panels so the two cannot become
 * two different readings of one gesture.
 *
 * The readout is BUILT ONCE and said twice, as the button's accessible name and
 * as the lines inside the card, exactly as `ClosureSpread` and `ClosureTrend` do
 * — one translation read two ways, so what a screen reader hears and what a
 * sighted reader sees can never be two different claims about one row.
 *
 * WHY "OPEN OF TOTAL" RATHER THAN JUST THE OPEN COUNT. Both panels rank OPEN
 * work, and the open number alone cannot tell a system nobody has finished
 * anything on from one that has closed two hundred tickets and has four left.
 * The door already carries both figures per (row, kind) and has since it was
 * written; this is the first thing on the screen that reads the second one. */
function TallyBar({
  name,
  tallies,
  t,
  children,
}: {
  /** the row's own name, so the card says which row it is about */
  name: string
  /** the kinds behind this row, already in the client's order */
  tallies: KindTally[]
  t: (s: string, vars?: Record<string, string | number>) => string
  /** the mark itself — the row's bar, which this makes the hit area of */
  children: React.ReactNode
}) {
  const lines = tallies.map((k) => ({
    type: k.type,
    said: t("{count} open of {total}", { count: k.open, total: k.total }),
  }))
  const said = [name, ...lines.map((l) => `${l.type}: ${l.said}`)].join(" · ")
  return (
    <HoverCard openDelay={60} closeDelay={60}>
      <HoverCardTrigger asChild>
        {/* THE BAR IS THE BUTTON, rather than a button beside one: the mark is
            what a pointer is already on. It draws nothing of its own — no ring
            of its own either, the kit's stylesheet owns that one rule — so the
            row looks exactly as it did before it could be asked a question. */}
        <button
          type="button"
          aria-label={said}
          className="flex min-w-0 flex-1 items-center rounded-[var(--radius-bar)]"
        >
          {children}
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="flex flex-col gap-2">
        <p className="text-sm">{name}</p>
        {lines.map((l) => (
          <div key={l.type} className="flex flex-col gap-0.5">
            <TypeKey type={l.type} />
            <span className="text-muted-foreground text-xs tabular-nums">{l.said}</span>
          </div>
        ))}
      </HoverCardContent>
    </HoverCard>
  )
}

/** A panel: a heading, an optional chip on the right, and whatever the panel
 * draws. Every panel on this screen is this shape, so the screen reads as one
 * thing rather than six.
 *
 * ── NO SUBTITLES ANY MORE (client, 6 Sep 2026) ──────────────────────────────
 *
 * She listed four of them by their exact words and asked for all four gone:
 * "Every open ticket, as one pipeline per kind down a shared set of stages",
 * "Open tickets against the thing you built", "Open work by client, for the
 * kinds that wait for a client to confirm", "What your morning is actually
 * spent on". THE PROP WENT WITH THEM rather than being left behind unused: a
 * `sub?` nothing passes is an invitation to write the fifth one, and this
 * screen's own argument against them is that every panel here is a picture with
 * its own axes written on it — a sentence restating the axes is a caption
 * telling a reader what they can already see. The captions that SURVIVE are the
 * ones that say what a picture LEFT OUT (the dropped months, the tickets with
 * no recorded arrival), and those have never been subtitles: they sit under the
 * marks they are about, where they can be read against them.
 *
 * `h-full` because panels sit in grid rows as siblings and a grid stretches its
 * items to the row's height; the Card is `flex flex-col` and `CardContent` is
 * `flex-1`, so the height reaches the body and a panel whose body wants to fill
 * (the trend's plot, the per-system list) can actually claim it. `className` is
 * the one thing a call site may say about the box itself, and today it says
 * exactly one thing: which fraction of a row the panel spans. */
function Panel({
  title,
  chip,
  className,
  children,
}: {
  title: string
  chip?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <Card className={className ? `min-w-0 h-full ${className}` : "min-w-0 h-full"}>
      <CardContent className="flex min-w-0 flex-col gap-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="min-w-0 text-base font-[var(--font-weight-medium)]">{title}</h3>
          {chip}
        </div>
        {children}
      </CardContent>
    </Card>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   1B · THE OPEN WORK — one pipeline per type, down a shared stage axis.
   ══════════════════════════════════════════════════════════════════════════ */

/** Read a column top to bottom for how one kind moves; read across the row for
 * how the kinds compare at one stage. The stage axis is written ONCE, down the
 * left, which is what makes the second reading possible at all.
 *
 * THE STAGES ARE THE LIFECYCLE'S ORDER AND NEVER THE TALLY'S. A row that
 * reordered itself as the numbers moved would be unreadable week to week, and a
 * stage nobody is in stays on the axis at zero because an empty row is
 * information — the same ruling `TicketStagesCard` already writes for the same
 * data. The KINDS across the top are the client's fixed order
 * (`orderTicketTypes`), applied once by the screen below and simply obeyed here.
 *
 * ── ONE GRID, AND WHY IT REPLACED A STACK OF FOUR-COLUMN GRIDS ──────────────
 *
 * CLIENT, 6 Sep 2026, two sentences of one complaint: "on the open work, on top
 * of each column, put the name of the legend like you did in your artifact, and
 * each status should have only one row. I don't know why some of them have two.
 * Makes no sense."
 *
 * THEY WERE ONE BUG. This panel used to draw a stage as a LABEL LINE followed by
 * its own `grid sm:grid-cols-2 lg:grid-cols-4` of bars, with the legend written
 * once above the whole panel. That `4` was a constant, and the number of kinds
 * is not one: `Ticket type` is the team's OWN editable vocabulary and the base
 * SEEDS FIVE of them (Question, Issue, Request, Extra, Requirements —
 * `workers/tenancy/src/team-schema/seed.ts`), before the screen's own `types`
 * memo appends any further kind found only on historical tickets. Five cells in
 * a four-column grid is two rows, under every stage, for ever — and which
 * stages LOOKED doubled depended on whether the wrapped fifth cell held a bar or
 * just the em dash for zero, which is why it read as "some of them". The legend
 * being a separate strip above is the other half of the same fault: with the
 * bars wrapping, nothing on screen tied the fifth bar to a word at all.
 *
 * SO THE COLUMN COUNT IS DERIVED FROM THE VOCABULARY, never typed, and the
 * kind's own name heads its column — the treatment the approved artifact used,
 * and the one `RaisedAsMatrix` below already uses for the same vocabulary on
 * both of its axes. One grid row per stage now, whatever the team calls its
 * work and however many words it uses for it. Wide vocabularies SCROLL
 * sideways rather than wrapping, for the same reason the matrix does: a chart
 * that reflows into a second line stops being a row anybody can read across. */
function OpenWork({
  rows,
  types,
  t,
}: {
  rows: TicketDashboard["openByTypeAndStatus"]
  types: string[]
  t: (s: string, vars?: Record<string, string | number>) => string
}) {
  const at = (type: string, status: string) =>
    rows.find((r) => r.helpType === type && r.status === status)?.n ?? 0
  // ONE SCALE FOR ALL FOUR PIPELINES. Per-column scales would draw a column of
  // two tickets exactly like a column of twenty, which is the one comparison
  // this layout exists to make.
  const scale = Math.max(1, ...rows.map((r) => r.n))
  // A ROW OF DASHES IS NOT AN ANSWER (client, 6 Sep 2026: "whe a status is
  // completely empty do not show it"). COMPLETELY is the whole of the rule and
  // it is why the test is `some` rather than `every`: a stage drops out only
  // when EVERY kind is at nothing in it. A stage holding a single ticket still
  // draws its whole row, dashes and all, because the zeros beside that one bar
  // are the comparison the row exists to make.
  //
  // The axis is `PIPELINE_STAGES`, so the survivors keep the reading order she
  // asked for — waiting on the client sits above ready — and never the order
  // the tallies happen to be in.
  const openStages = PIPELINE_STAGES.filter((s) => types.some((ty) => at(ty, s) > 0))

  // …and a pipeline with nothing anywhere in it is a picture of nothing wearing
  // the clothes of information, which is `pulse.tsx`'s own second rule. That is
  // a sentence rather than an empty grid.
  if (openStages.length === 0)
    return <p className="text-muted-foreground text-xs">{t("Nothing is open right now.")}</p>

  return (
    <div className="min-w-0 overflow-x-auto">
      <div
        // NAMED FOR THE SUITE THAT PROVES IT IS ONE GRID — the whole defect this
        // panel was rewritten out of is invisible to a text query: five bars in
        // a four-column grid say exactly the same words as five bars in a
        // five-column one. `dashboard-says-what-it-left-out` counts this grid's
        // cells and reads its column template instead.
        data-slot="open-work"
        className="grid min-w-[20rem] items-center gap-x-3 gap-y-2 text-xs"
        // ONE COLUMN PER KIND, COUNTED OFF THE VOCABULARY. The stage names take
        // the first, fixed track; every kind takes an equal share of what is
        // left, with a floor so a bar never collapses to nothing on a narrow
        // card — past that floor the whole grid scrolls rather than wrapping.
        style={{ gridTemplateColumns: `7rem repeat(${types.length}, minmax(4.5rem, 1fr))` }}
      >
        {/* THE HEADING ROW — the corner is empty because the stage column's own
            heading is the panel's title, and a word here ("Stage") would be the
            third place this screen says what the left column is. */}
        <span aria-hidden="true" />
        {types.map((type) => (
          // THE LEGEND, ON TOP OF ITS OWN COLUMN (the client's own words). It is
          // the SAME `TypeKey` the other four panels draw, so the dot beside a
          // word means one thing everywhere on this screen — and it is why the
          // separate legend strip this panel used to carry is gone rather than
          // duplicated: a chart with its key written twice is a chart a reader
          // has to check for agreement.
          <TypeKey key={type} type={type} />
        ))}
        {openStages.map((status) => (
          <React.Fragment key={status}>
            <span className="text-muted-foreground truncate" title={t(HELP_STATUS[status])}>
              {t(HELP_STATUS[status])}
            </span>
            {types.map((type) => (
              <div key={type} className="flex min-w-0 items-center gap-2">
                <Bar
                  fraction={at(type, status) / scale}
                  colour={ticketTypeColour(type)}
                  // BOTH COORDINATES, now that the bar sits in a grid rather
                  // than under its own stage label: a cell read on its own has
                  // to say which kind AND which stage it is, or it says neither.
                  title={`${type} · ${t(HELP_STATUS[status])}`}
                />
                <span className="w-6 shrink-0 text-right tabular-nums">
                  {at(type, status) || "–"}
                </span>
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   6A · WHICH APP — bars, stacked by type (reading 6A·1).
   ══════════════════════════════════════════════════════════════════════════ */

/** WHICH SYSTEM THE OPEN WORK IS AGAINST, one bar per system, split by kind.
 *
 * THIS IS ONE OF THREE READINGS OF THE SAME ROWS, and the panel is built so the
 * other two could take its place without the panel changing. The design laid out
 * all three side by side and the client picked this one:
 *
 *   6A·1 (this)  bars stacked by type — rank and mix in one read.
 *   6A·2         the ISSUE SHARE of each system on a 0–100% axis — separates a
 *                bad app from a busy one, and needs a floor under it (an app
 *                with five open tickets at 80% would top the chart and mean
 *                nothing). It is this same `openByApp` result DIVIDED, not a
 *                second read.
 *   6A·3         open tickets against how big the app is — the only reading that
 *                names an app nobody was already suspicious of, and the only one
 *                that needs a SECOND read (a module count per app), which is why
 *                it is not built.
 *
 * So the shape of this component is the contract: it takes the door's rows and
 * returns a body. Swapping the reading is swapping the component at the one call
 * site in `TicketsDashboard` below — not rewriting the panel around it.
 *
 * ── AS LONG AS THE PANEL BESIDE IT, AND NOT ONE ROW LONGER ──────────────────
 *
 * CLIENT, 6 Sep 2026: "on which app do not 'and 14 more systems' - make it as
 * long as the who has more container."
 *
 * TWO THINGS WENT, and they were one thing. This panel used to draw the busiest
 * eight systems and then write the leftovers as a sentence, which is the shape
 * she is refusing: a chart that stops early and apologises. Both the ceiling and
 * the apology are gone, so every system the door answered with (its own cap is a
 * hundred, R14) is in the list and reachable.
 *
 * WHAT BOUNDS IT NOW IS THE ROW, MEASURED RATHER THAN TYPED. The list sits in a
 * `relative` box that this panel's own content does NOT get to make taller: the
 * rows are `absolute inset-0` inside it, so they contribute no intrinsic height
 * at all. The panel's natural height is therefore its heading plus its legend,
 * which is shorter than either sibling — so the grid row's height is set by
 * "Who has more" and the matrix, and `flex-1` hands every pixel of it to this
 * list. The two panels match because one is measured FROM the other, which is
 * the same argument the trend's plot already makes one panel down, and it is
 * why there is no number here to go stale when either neighbour changes.
 *
 * WHAT DOES NOT FIT SCROLLS, and that is the honest half. Clipping would be the
 * "and 14 more" sentence again with the sentence taken out — a subtraction a
 * reader cannot see, which is the one thing this screen may never do (see
 * `dashboard-says-what-it-left-out`). `min-h-40` is the floor for the stacked,
 * single-column case, where there is no taller sibling to be measured against —
 * the same floor, for the same reason, that the trend's plot keeps. */
function AppsStackedByType({
  rows,
  types,
  teamId,
  t,
}: {
  rows: TicketDashboard["openByApp"]
  types: string[]
  /** WHERE A SYSTEM'S NAME GOES WHEN IT IS PRESSED — the team-scoped address of
   * the app record, built here rather than passed in from the host, because
   * this panel only ever draws on the Tickets SCREEN (inside an app record it
   * stands down entirely; see the call sites). */
  teamId: string
  t: (s: string, vars?: Record<string, string | number>) => string
}) {
  // The door already ordered these — busiest system first, every one of a
  // system's kinds kept together — so the grouping preserves that order rather
  // than sorting again. Re-sorting here would be a second opinion about a
  // question the door already answered, and the two would drift.
  //
  // `named` IS NOT `appName !== undefined`, AND THE DIFFERENCE IS THE LINK. The
  // door LEFT JOINs `apps`, so a null name means one of two things — the bar
  // where `app_id` itself is null (the work nobody has said which system it is
  // about, kept on purpose) or an `app_id` pointing at a row that no longer
  // answers. Neither has a record worth sending a reader to, so both draw plain
  // text: the fallback label is what makes the bar readable, and hanging a link
  // off a placeholder would advertise a record that is not there.
  const systems: {
    appId: string | null
    name: string
    named: boolean
    open: number
    byType: Map<string, number>
    totalByType: Map<string, number>
  }[] = []
  for (const row of rows) {
    if (row.open === 0) continue
    let system = systems.find((s) => s.appId === row.appId)
    if (!system) {
      system = {
        appId: row.appId,
        name: row.appName ?? t("No system named"),
        named: Boolean(row.appId && row.appName),
        open: 0,
        byType: new Map(),
        totalByType: new Map(),
      }
      systems.push(system)
    }
    system.open += row.open
    system.byType.set(row.helpType, (system.byType.get(row.helpType) ?? 0) + row.open)
    // EVERYTHING EVER RAISED against this system and kind, open or closed. It is
    // not drawn as a mark anywhere — the bars rank open work — and it exists
    // only for the hover readout, which needs it to tell "nothing finished here"
    // from "four left out of two hundred".
    system.totalByType.set(row.helpType, (system.totalByType.get(row.helpType) ?? 0) + row.total)
  }
  const scale = Math.max(1, ...systems.map((s) => s.open))

  if (systems.length === 0)
    return <p className="text-muted-foreground text-xs">{t("Nothing is open right now.")}</p>

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      {/* THE BOX THAT TAKES ITS HEIGHT FROM THE ROW — see this component's
          header. `flex-1` claims what the taller sibling left; `min-h-40` is
          the floor when the grid has stacked into one column and there is no
          sibling to claim it from. */}
      <div className="relative min-h-40 min-w-0 flex-1">
        <div className="absolute inset-0 flex flex-col gap-2 overflow-y-auto">
          {systems.map((s) => {
            // ONE ORDER FOR THE MARK AND THE WORDS, taken from `types` — the
            // same array the legend below is drawn from, which is the whole
            // reason `StackedBar` obeys its caller's order rather than sorting.
            const tallies = types
              .map((type) => ({
                type,
                open: s.byType.get(type) ?? 0,
                total: s.totalByType.get(type) ?? 0,
              }))
              .filter((k) => k.open > 0)
            return (
              <div key={s.appId ?? "none"} className="flex min-w-0 shrink-0 items-center gap-2">
                <RowName
                  path={s.named ? `/t/${teamId}/apps/${s.appId}` : undefined}
                  name={s.name}
                  width="w-28"
                />
                <TallyBar name={s.name} tallies={tallies} t={t}>
                  <StackedBar
                    scale={scale}
                    segments={tallies.map((k) => ({ type: k.type, n: k.open }))}
                  />
                </TallyBar>
                <span className="w-6 shrink-0 text-right text-xs tabular-nums">{s.open}</span>
              </div>
            )
          })}
        </div>
      </div>
      {/* THE LEGEND STAYS OUT OF THE SCROLLER, always visible: it is the key to
          the colours above it, and a key that scrolls away is a chart a reader
          has to remember. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {types.map((type) => (
          <TypeKey key={type} type={type} />
        ))}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   2B · WHO HAS MORE — the scoped work, by client.
   ══════════════════════════════════════════════════════════════════════════ */

/** A ticket has no assignee by design, so "who" is the CLIENT.
 *
 * WHICH KINDS ARE RANKED IS NOT HARD-CODED, and it cannot be: the ticket
 * vocabulary is the team's to rename on the Choices screen. The kinds drawn here
 * are the ones the product already calls scoped work — the ones that WAIT FOR
 * SCOPED WORK — an ask for more rather than somebody stuck (`isScopedTicketType`,
 * shared/types.ts), which matches case-insensitively against whatever the team
 * has typed.
 *
 * THAT PREDICATE USED TO BE THE LIFECYCLE'S TOO, under the name
 * `ticketTypeWaitsForValidation`: the same three kinds waited for the client to
 * confirm them before triage. The client retired that gate on 7 Sep 2026 with
 * the `awaiting_validation` stage, and the DIVISION outlived it — these are the
 * kinds that cost money, which is what this panel ranks clients by and always
 * was. The rename is the whole of what changed here. */
function WhoHasMore({
  rows,
  types,
  teamId,
  t,
}: {
  rows: TicketDashboard["byAccountAndType"]
  types: string[]
  /** WHERE A CLIENT'S NAME GOES WHEN IT IS PRESSED — the team-scoped address of
   * the account record. Built here for the same reason `AppsStackedByType`
   * builds its own: this panel draws on the Tickets screen only. */
  teamId: string
  t: (s: string, vars?: Record<string, string | number>) => string
}) {
  const scoped = types.filter(isScopedTicketType)
  const lists = scoped
    .map((type) => ({
      type,
      // The door ordered by open work already; this only takes the head of each
      // kind's own ranking out of one flat, already-ordered result.
      clients: rows.filter((r) => r.helpType === type && r.open > 0).slice(0, 6),
    }))
    .filter((l) => l.clients.length > 0)

  if (lists.length === 0)
    return <p className="text-muted-foreground text-xs">{t("Nothing is open right now.")}</p>

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {lists.map((list) => {
        const scale = Math.max(1, ...list.clients.map((c) => c.open))
        return (
          <div key={list.type} className="flex min-w-0 flex-col gap-1.5">
            <TypeKey type={list.type} />
            {list.clients.map((c) => {
              // WHAT THE HOVER SAYS IS THE CLIENT'S WHOLE LINE, NOT THIS ROW'S.
              //
              // Client: "i want that when i hover on client i see the details of
              // the numbers of tickets." A row here is one (client, kind) pair —
              // the bar's own figure is already printed at the end of it — so a
              // card repeating that one number would be the same fact twice and
              // no detail at all. The DETAIL is the kinds: this client's Issues
              // and Questions beside the Extras they are ranked here for, which
              // is what "the numbers of tickets" means about a client.
              //
              // Every kind, not just the scoped ones the panel ranks. The panel
              // narrows to the kinds that wait for a client to confirm because
              // that is what it is a ranking OF; a reader asking what a client
              // has open is asking about the client, and answering with a subset
              // would be this panel's own filter leaking into a readout about
              // somebody's whole account.
              const tallies = types
                .map((type) => {
                  const hit = rows.find((r) => r.accountId === c.accountId && r.helpType === type)
                  return { type, open: hit?.open ?? 0, total: hit?.total ?? 0 }
                })
                .filter((k) => k.total > 0)
              // NAMED, OR IT IS NOT A LINK. `accountId` is never null on this
              // read (the door's own `WHERE account_id IS NOT NULL`), but the
              // name comes off a LEFT JOIN, so a missing one means the account
              // row does not answer — which is a record not worth sending a
              // reader to. Same ruling as the per-system panel above, for the
              // same reason.
              const name = c.accountName ?? t("Unnamed client")
              return (
                <div key={c.accountId} className="flex min-w-0 items-center gap-2">
                  <RowName
                    path={c.accountName ? `/t/${teamId}/accounts/${c.accountId}` : undefined}
                    name={name}
                    width="w-24"
                  />
                  <TallyBar name={name} tallies={tallies} t={t}>
                    <Bar fraction={c.open / scale} colour={ticketTypeColour(list.type)} />
                  </TallyBar>
                  <span className="w-6 shrink-0 text-right text-xs tabular-nums">{c.open}</span>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   5A · RAISED AS, THEN TRIAGED AS.
   ══════════════════════════════════════════════════════════════════════════ */

/** Rows are what ARRIVED; columns are what you DECIDED. The diagonal is the
 * tickets nobody recategorised, and it is drawn palest on purpose: the whole
 * point of the picture is the traffic OFF the diagonal.
 *
 * THE TICKETS NOTHING RECORDED AN ARRIVAL FOR ARE NAMED, NEVER ABSORBED. Team
 * migration 0065 refused to backfill precisely so this number could be told —
 * folding it into the diagonal would report a rate over a denominator that had
 * quietly changed. It is said under the grid, in words, every time it is not
 * zero.
 *
 * ── THE GRID DRAWS EVEN WITH NOTHING IN IT (client, 6 Sep 2026) ─────────────
 *
 * "in raised as pls display the graphic already even if it's empty."
 *
 * The empty answer used to REPLACE the picture with its own paragraph, which
 * made this the one panel on the screen whose shape a reader could not learn
 * until the data arrived — and this is the panel whose shape is the whole
 * point. Rows are what arrived, columns are what you decided, the diagonal is
 * what nobody moved: none of that is legible from a sentence, and all of it is
 * legible from an axis of zeros.
 *
 * THE SENTENCE STAYED, AND IT MOVED. `raised_as_type` is a new column and
 * migration 0065 deliberately left the old rows null, so an empty grid here is
 * a young column rather than a quiet week — a reader who is not told that will
 * read the zeros as a fact about the work. So the sentence is now written ABOVE
 * the grid, in the same position the "{moved} of {counted}" line takes when
 * there is something to count: one slot, holding whichever of the two is true.
 * The subtraction is announced either way, which is the rule this whole screen
 * is built on. */
/* RAISED AS, THEN TRIAGED AS — drawn as the FLOW she asked for.
 *
 * Client, 2026-09-07, pointing at the chart from the approved design: "for the
 * Raised as, then triaged as i want this graphic you proposed / also, if its not
 * there, include in ui-ux components." It was not there; it is now
 * (`Sankey`, kit v1.2.64), so this panel is a caller rather than a drawing.
 *
 * WHAT THE HEAT GRID WAS AND WHY IT GOES. A 4×4 of tinted cells answered "how
 * many went from X to Y" one cell at a time and never showed the SHAPE — that
 * most of what arrives as an issue leaves as something else. The flow makes that
 * the first thing a reader sees, which is the sentence underneath it in words.
 * Nothing is lost: the kit's own hidden table carries the identical matrix with
 * both margins, so the cell-by-cell reading survives for a screen reader and for
 * anyone who wants the number rather than the picture.
 *
 * THE COLUMNS ARE DRAWN EVEN WITH NOTHING IN THEM — her earlier ruling, "in
 * raised as pls display the graphic already even if it's empty". The kit
 * distinguishes the two nothings for us: no categories at all replaces the plot,
 * while categories with no traffic keep their labels and their zeros. This
 * screen is always the second case, because the type vocabulary exists from the
 * first day and the column feeding it is stamped only from 2026-09-06 onward. */
function RaisedAsFlow({
  rows,
  types,
  t,
}: {
  rows: TicketDashboard["raisedVsCurrent"]
  types: string[]
  t: (s: string, vars?: Record<string, string | number>) => string
}) {
  /* A TICKET THAT ARRIVED LABELLED AND STILL HAS NO KIND IS NOT AN OUTCOME.
   * `raisedVsCurrent` groups by `(raised_as_type, help_type)` and `help_type`
   * is nullable, so a ticket nobody has sorted yet appears with a null on the
   * right. It has not been "triaged as" anything — it is still waiting to be —
   * and drawing it would need a fifth column that is the absence of a decision.
   *
   * It is dropped from the FLOWS and from the SENTENCE together, which is the
   * point: counting it in "180 tickets" while it is missing from the picture
   * would make the two disagree, and the sentence is the thing a person quotes.
   * The untyped pile is real and worth its own reading, but it belongs to the
   * open-work panel above, which is where an unsorted ticket actually sits. */
  const decided = rows.filter((r) => r.helpType !== null)
  const counted = decided.reduce((n, r) => n + r.n, 0)
  const moved = decided.reduce((n, r) => (r.raisedAsType === r.helpType ? n : n + r.n), 0)

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {/* THE SENTENCE ONLY WHEN THERE IS SOMETHING TO SAY. Client, 2026-09-07,
          quoting back every line the empty panel drew: "remove all this text".
          She had four stacked ways of being told the same nothing — this
          panel's own explanation, the kit's "Nothing recorded" register and its
          body, and the count of older tickets underneath.
          
          The columns and their zeros already say it, and they say it in the
          shape a reader will still be looking at once there IS data. So the
          empty case now draws the picture alone. The FULL case keeps its
          sentence, because "58% of what you triage is a relabel" is a finding,
          not a status. */}
      {counted > 0 ? (
        <p className="text-sm">
          {t("{moved} of {counted} tickets left triage as a different kind from the one they arrived as.", {
            moved,
            counted,
          })}
        </p>
      ) : null}
      <Sankey
        fromTitle={t("Raised as")}
        toTitle={t("Became")}
        label={t("Raised as, then triaged as")}
        nodes={types.map((type) => ({ id: type, label: type, color: ticketTypeColour(type) }))}
        flows={decided.map((r) => ({ from: r.raisedAsType, to: r.helpType as string, value: r.n }))}
        /* NO REGISTER OVER THE EMPTY PLOT — the same ruling as the sentences
           above. The kit offers a quiet "Nothing recorded" block for a chart
           with categories and no traffic, which is right for a caller with
           nothing else on the card; here it was the third telling of one fact.
           An empty node passed deliberately, not omitted: omitting it restores
           the default, because the prop falls back rather than being absent. */
        unrecordedState={<></>}
      />

    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   3A · HOW LONG A TICKET TAKES TO CLOSE — the middle ticket and the middle half.
   ══════════════════════════════════════════════════════════════════════════ */

/** A DISTRIBUTION AND NEVER A MEAN. A handful of tickets that sat for a year
 * drag an average clear of every ticket anybody actually experienced, which is
 * why the door hands back quartiles and this draws them: the band is the middle
 * half, the dot is the middle ticket, and the thin line is the tail the average
 * would have followed.
 *
 * THE AXIS IS CLIPPED AT TWICE THE WORST MIDDLE-HALF, not at the longest ticket.
 * Scaling to the longest would squash every band on the chart into the first few
 * pixels the day one ticket is forgotten for a year — which is the same argument
 * against the mean, made about the axis. Whatever falls off the end is SAID, in
 * words, on the row it belongs to.
 *
 * ── AND THOSE WORDS ARE NOW BEHIND A HOVER ON THE ROW ───────────────────────
 *
 * CLIENT, 6 Sep 2026: "the 'Middle ticket 0 days · middle half 0 to 0 · longest
 * 16' i want to see it when hovering over the row."
 *
 * A DELIBERATE REVERSAL, WRITTEN DOWN AS ONE. Earlier the same day she read the
 * same line and asked the opposite — "this information only appears when I hover
 * over the type" — and the answer then was that it had never been behind a
 * hover, plus a test pinning it at rest so it could not drift there. She has now
 * looked at the shipped screen and asked for exactly the thing that test
 * forbade. The test was not deleted: it was rewritten to pin the NEW shape, with
 * the reversal named in it, because a removed test would leave the next reader
 * unable to tell a decision from a regression.
 *
 * IT IS THE KIT'S HOVER CARD ON A REAL BUTTON, which is the pattern the trend
 * panel below settled this morning and not a second one invented here. Three
 * things follow from that and all three are the point: the trigger is a
 * `<button>`, so it is in the tab order and Radix opens the card on FOCUS as
 * well as on hover, and a press works where hover does not exist at all; the
 * whole readout rides the button's accessible NAME, so a screen reader hears
 * the three figures from the row itself whether or not the floating panel ever
 * opens; and it is not the browser's native `title`, which is mouse-only, has
 * no keyboard route, and cannot be styled or read reliably.
 *
 * THE BAR IS THE BUTTON, rather than a button sitting beside one. The row IS
 * the mark — she said "hovering over the row" — so the target is the whole
 * width of the plot, which is also the largest hit area available and the one a
 * pointer lands on without aiming. */
function ClosureSpread({
  rows,
  types,
  t,
}: {
  rows: TicketDashboard["closureDays"]
  types: string[]
  t: (s: string, vars?: Record<string, string | number>) => string
}) {
  const drawn = types
    .map((type) => rows.find((r) => r.helpType === type))
    .filter((r): r is TicketDashboard["closureDays"][number] => Boolean(r) && (r as { n: number }).n > 0)

  if (drawn.length === 0)
    return (
      <p className="text-muted-foreground text-xs">
        {t("Nothing has closed in the last {count} months.", { count: CLOSURE_WINDOW_MONTHS })}
      </p>
    )

  const axis = Math.max(1, ...drawn.map((r) => r.p75Days)) * 2
  const pct = (v: number) => `${Math.min(100, (v / axis) * 100)}%`

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {drawn.map((r) => {
        const colour = ticketTypeColour(r.helpType)
        // THE READOUT, WRITTEN ONCE AND SAID TWICE — as the row's accessible
        // name and as the line inside the card it opens. One translation read
        // two ways, so what a screen reader hears and what a sighted reader
        // sees can never become two different claims about one distribution.
        const said = t("Middle ticket {median} days · middle half {low} to {high} · longest {max}", {
          median: r.medianDays.toFixed(r.medianDays % 1 === 0 ? 0 : 1),
          low: r.p25Days,
          high: r.p75Days,
          max: r.maxDays,
        })
        return (
          <div key={r.helpType} className="flex min-w-0 flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2">
              <TypeKey type={r.helpType} />
              <span className="text-muted-foreground text-xs tabular-nums">
                {t("{count} closed", { count: r.n })}
              </span>
            </div>
            <HoverCard openDelay={60} closeDelay={60}>
              <HoverCardTrigger asChild>
                <button
                  type="button"
                  // THE WHOLE SENTENCE AS THE NAME. A button whose only content
                  // is three absolutely-positioned marks has no text of its
                  // own, so without this it would be an unlabelled control —
                  // and the figures would exist nowhere but inside a floating
                  // panel, which is the shape this file's hover card was
                  // adopted specifically to avoid.
                  aria-label={said}
                  className="bg-muted relative block h-5 w-full min-w-0 rounded-[var(--radius-bar)]"
                >
                  {/* the tail, quiet, so the middle ticket has a reason */}
                  <span
                    aria-hidden="true"
                    className="absolute top-1/2 h-px -translate-y-1/2"
                    style={{
                      left: pct(r.p75Days),
                      width: `calc(${pct(Math.max(r.p75Days, Math.min(r.maxDays, axis)))} - ${pct(r.p75Days)})`,
                      backgroundColor: colour,
                      opacity: 0.5,
                    }}
                  />
                  {/* the middle half */}
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 rounded-[var(--radius-bar)]"
                    style={{
                      left: pct(r.p25Days),
                      width: `calc(${pct(r.p75Days)} - ${pct(r.p25Days)} + 2px)`,
                      backgroundColor: colour,
                      opacity: 0.35,
                    }}
                  />
                  {/* the middle ticket */}
                  <span
                    aria-hidden="true"
                    className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-pill"
                    style={{ left: pct(r.medianDays), backgroundColor: colour }}
                  />
                </button>
              </HoverCardTrigger>
              {/* THE SAME SENTENCE THE BUTTON IS NAMED WITH. Written from the
                  one `said` above rather than re-formatted here, so the panel
                  and the accessible name cannot say two different numbers. */}
              <HoverCardContent className="flex flex-col gap-2">
                <TypeKey type={r.helpType} />
                <span className="text-muted-foreground text-xs tabular-nums">{said}</span>
              </HoverCardContent>
            </HoverCard>
          </div>
        )
      })}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   3B · TENDENCY — the middle ticket, month by month.
   ══════════════════════════════════════════════════════════════════════════ */

/** THE MONTH A TICKET CLOSED IN, filled to the baseline so the height is the
 * wait.
 *
 * EVERY MONTH IS DRAWN NOW, HOWEVER FEW CLOSED IN IT (client, 2026-09-07):
 * "Only months with at least 8 of a kind are thrown. No, even if it's only 1,
 * it should appear there."
 *
 * WHAT WENT, AND WHAT WENT WITH IT. A (month, kind) bucket under eight closures
 * used to be dropped by the door, and a sentence under this chart explained the
 * absence so a reader would not read the missing kinds as perfect. The floor is
 * gone from the SQL and THE SENTENCE IS GONE WITH IT — a caption explaining a
 * rule the code no longer follows is worse than no caption, because it tells a
 * reader that something was left out when nothing was. The reasoning behind the
 * floor is not deleted: it is kept whole where the constant used to live, in
 * `shared/types.ts`, so the argument survives its own defeat.
 *
 * AND NOTHING MARKS A THIN MONTH, WHICH IS A DECISION AND NOT AN OVERSIGHT.
 * With the floor gone this line will jump wherever one ticket closed, and the
 * obvious reflexes — a hollow point, a dashed run, a dimmed area — all need a
 * NUMBER to decide what counts as thin, which is the floor again wearing a
 * different word. She removed a threshold; adding one back to draw with instead
 * of to hide with would be answering her request with the thing she refused.
 * What a reader gets instead is already here and always was: every point's own
 * count rides the hover card and the hit area's accessible name ("{median}
 * days, from {count} closed"), so "how much is this point standing on" is
 * answerable month by month, by the reader, rather than pre-judged by the
 * chart. If she later says the line is unreadable, the fix she has not asked
 * for is one of those treatments — and it will still need a number, and the
 * number will still be hers.
 *
 * THE SVG HOLDS NO TEXT. Its months and its scale are HTML beside it, at the
 * reader's own size — see this file's header for why a scaled `<svg>` is the
 * wrong home for a label.
 *
 * ── AS TALL AS THE PANEL BESIDE IT (client, 6 Sep 2026) ─────────────────────
 *
 * "Regarding the graph, which way it is going, I would need to make it taller.
 * Make it the same height as how long a ticket takes to close, and add me some
 * vertical lines that show the months."
 *
 * The plot used to be a flat `h-40`, so the two halves were a distribution as
 * tall as its own content and a trend as tall as a number somebody typed — and
 * the two sit in the SAME grid row, which already stretches both columns to one
 * height. So the fix is not a bigger number: the plot CLAIMS the leftover space
 * (`flex-1` down the column, `h-40` demoted to a floor for the stacked,
 * single-column case). It is the same height as the distribution because it is
 * measured from it, rather than agreeing with it until either one changes.
 *
 * ── AND THEN IT WAS THE OTHER ONE TOO TALL (client, 7 Sep 2026) ─────────────
 *
 * "the how long it takes evolution is way too high - make take same height as
 * available per the left container."
 *
 * `flex-1` DID claim the leftover space, and the sentence above was still
 * wrong, because a grid row is stretched to whichever sibling is INTRINSICALLY
 * taller and this panel had quietly become that sibling. An in-flow `<svg>`
 * with a `viewBox` is a replaced element with that viewBox's aspect ratio, and
 * `size-full` against a parent whose height is `auto` resolves to `auto` — so
 * the plot was as tall as it was WIDE. Measured at a 1440px viewport: plot
 * 827.5 × 827.5, both cards 992.3 tall, with the distribution's own content
 * ending at 252.6 and 740px of stretched nothing under it. The panel that was
 * supposed to be measured FROM the distribution was setting the distribution's
 * height.
 *
 * SO THE PLOT NOW CONTRIBUTES NO INTRINSIC HEIGHT WHERE THERE IS A SIBLING.
 * The `<svg>` is `absolute inset-0` inside its `relative` box, exactly as the
 * hit areas over it already are and exactly as `AppsStackedByType`'s rows are
 * one panel up, so the box has nothing in flow to be sized by; and `min-h-40`
 * is released at `lg` (`lg:min-h-0`), because that floor is for the STACKED
 * case, where the grid is one column and there is no sibling to measure from.
 * Above `lg` the row's height is the distribution's and this box takes it
 * through the row's `items-stretch`.
 *
 * WHAT THAT COSTS, SAID RATHER THAN PADDED AROUND, because it depends on
 * something neither panel controls: HOW MANY KINDS CLOSED ANYTHING. The
 * distribution draws one row per kind with a closure in the window (no floor,
 * unlike the trend), so its height is the team's vocabulary, and the plot is
 * whatever that leaves. Measured at 1440px, on the Tickets screen:
 *
 *   4 kinds → row 282.6, plot 117.8   (the distribution decides)
 *   3 kinds → row 233.3, plot  68.5   (the distribution decides)
 *   2 kinds → row 195.2, plot  30.4   (this panel still decides, by 11.1px)
 *   1 kind  → row 195.2, plot  30.4   (this panel still decides, by 60.4px)
 *
 * BELOW THREE KINDS THE PANEL IS ITS OWN FLOOR AGAIN, and the floor is not a
 * number anybody typed: this panel's furniture is 164.8px of card before a
 * pixel of picture, and the SCALE COLUMN beside the plot — the two axis
 * figures, `justify-between` — is 30.4px of intrinsic height in the same row,
 * so the plot cannot go under it. A 30px plot is a squashed picture and it is
 * said here rather than fixed with a minimum, because a minimum in this box is
 * this panel deciding the row's height again, which is the thing that was
 * wrong. If it reads as squashed on a young team, the ruling belongs to the
 * ROW — fewer kinds is a shorter distribution, and matching it is what was
 * asked for.
 *
 * THAT STILL HOLDS NOW THAT THEY ARE TWO PANELS RATHER THAN TWO HALVES OF ONE
 * (client, 6 Sep 2026: "the how long, split in 2 containers same row" · "the
 * how long 1/3, the graph 2/3"). Two cards in one `lg:grid-cols-3`, spanning
 * one track and two, is still one grid row stretching both to a single height —
 * the measurement this plot takes did not change, only how many boxes it is
 * taken across.
 *
 * THE MONTH LINES ARE DRAWN, NOT WRITTEN. One rule per month behind the areas,
 * at the exact x the month's point sits on — so a reader can see that September
 * is September rather than inferring it from two labels at the ends. They carry
 * `vector-effect="non-scaling-stroke"` for the reason every stroke in here does:
 * `preserveAspectRatio="none"` would otherwise squash a vertical rule to a
 * hairline at one width and a bar at another.
 *
 * ── AND THE FIGURES BEHIND ONE MONTH ────────────────────────────────────────
 *
 * "I want that when I hover over the graphic on a specific day, it has a little
 * modal that gives me the info for this date." The x-axis here is MONTHS (a
 * median per closing month), so "a specific day" is a month point, and the card
 * says that month's real numbers per kind — the median it drew, and the count
 * that median was taken over, which is the number that says how much the point
 * is standing on.
 *
 * IT IS NOT A MOUSE-ONLY AFFORDANCE, and that is two separate things rather
 * than one. The hit areas are real `<button>`s, so they are in the tab order and
 * the kit's hover card opens on FOCUS as well as on hover (Radix does both, and
 * the kit's own header says so). And because a floating panel is a poor place to
 * put the only copy of a fact — the kit's header says that too — each button
 * carries the whole month's readout as its accessible NAME, so a screen reader
 * hears the figures from the button itself whether or not the card ever opens. */
function ClosureTrend({
  rows,
  t,
}: {
  rows: TicketDashboard["closureTrend"]
  t: (s: string, vars?: Record<string, string | number>) => string
}) {
  const months = [...new Set(rows.map((r) => r.month))].sort()
  // TWO ORDERS OVER ONE SET, and they answer two different questions.
  //
  // `paint` is widest first, so a kind that sits under another is never hidden
  // by it — the areas are translucent, but a smaller shape drawn behind a larger
  // one is a shape nobody can find the edge of. That is a fact about painting
  // and it cannot be the client's order.
  //
  // `series` is the client's fixed order (issue, question, request, extra), and
  // it is what a person READS — the legend under the plot and the lines inside
  // the hover card. So the same four kinds are stacked back-to-front and listed
  // first-to-last, which is the only arrangement that obeys both.
  const paint = [...new Set(rows.map((r) => r.helpType))].sort(
    (a, b) => median(rows, b) - median(rows, a)
  )
  const series = orderTicketTypes(paint)

  // THE ONE THING THAT IS STILL NOT DRAWABLE, and it is arithmetic rather than a
  // policy: a trend needs two points. The old sentence here named the floor
  // ("no kind has closed at least 8 tickets in two of the last months"), which
  // is now a rule that does not exist — so it says what is actually true, that
  // nothing has closed in two different months yet.
  if (months.length < 2 || series.length === 0)
    return (
      <p className="text-muted-foreground text-xs">
        {t("Nothing has closed in two different months yet, so there is no trend to draw.")}
      </p>
    )

  const top = Math.max(...rows.map((r) => r.medianDays)) * 1.15
  // The viewBox is a unit square scaled to the box by CSS, which is what lets the
  // months and the scale live outside it as real text.
  const x = (i: number) => (i / (months.length - 1)) * 100
  const y = (v: number) => 100 - (v / top) * 100

  /** WHAT ONE MONTH SAYS, as the lines a person reads — in the client's fixed
   * kind order, and only for the kinds that actually closed something that
   * month. A kind with no point in a month is ABSENT from its card rather than
   * written as a zero, and that has outlived the floor it was first written for:
   * a kind nothing closed in did not take nought days, it has no answer, and
   * "0 days" is the one reading the chart must never offer. With the floor gone
   * this is the only reason a bucket can be missing, which makes the rule
   * simpler than it was rather than obsolete. */
  const monthLines = (m: string) =>
    series
      .map((type) => ({ type, hit: rows.find((r) => r.helpType === type && r.month === m) }))
      .filter((l): l is { type: string; hit: TicketDashboard["closureTrend"][number] } =>
        Boolean(l.hit)
      )

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      {/* THE LEGEND, AT THE TOP RIGHT, ABOVE THE PLOT (client, 2026-09-07: "put
          the tendency legend on the top right, above the graphic").

          It used to sit under the whole picture, below the month row, which is
          where `AppsStackedByType`'s legend still sits — and on this panel that
          was the wrong end. The plot claims every spare pixel of the row
          (`flex-1`), so a legend below it is separated from the marks it
          explains by the full height of the picture plus the month labels; a
          reader who forgets which colour is which has to travel the whole panel
          to find out. Above the plot it is the first thing read after the
          heading and the last thing seen before the marks.

          `justify-end` is the "top right" half, and it is the only reason this
          is not simply the same strip moved: the heading occupies the top left
          of the card, so a full-width legend here would collide with it in the
          eye even though `Panel` draws them on separate lines. Right-aligned it
          reads as the key TO the picture rather than as a second title.

          It stays inside this component rather than becoming the `Panel`'s
          `chip`, because it is derived from `series` — the kinds that actually
          have points, in the client's order — and only this component knows
          that. A legend assembled at the call site would list kinds the plot
          does not draw. */}
      <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1">
        {series.map((type) => (
          <TypeKey key={type} type={type} />
        ))}
      </div>
      <div className="flex min-w-0 flex-1 items-stretch gap-2">
        <div className="text-muted-foreground flex w-8 shrink-0 flex-col justify-between text-right text-xs tabular-nums">
          <span>{Math.round(top)}</span>
          <span>0</span>
        </div>
        {/* `relative`, because EVERYTHING inside this box is laid over it
            rather than flowing through it — the plot itself and the month hit
            areas both — and that is now two separate arguments.

            THE HIT AREAS are HTML over the picture, the same argument this
            file's header makes about every other mark here: an element hit
            area keeps its own geometry under `preserveAspectRatio="none"`,
            where an SVG `<rect>` would be stretched with everything else.

            THE PLOT IS `absolute` FOR A DIFFERENT REASON — so this box
            contributes NO INTRINSIC HEIGHT, which is what lets the panel
            beside it decide the row. An in-flow `<svg>` with a viewBox is a
            replaced element carrying that viewBox's ASPECT RATIO, and
            `size-full` against an auto-height parent resolves to `auto`, so
            the plot sized itself to its own WIDTH: measured on 2026-09-07 at a
            1440px viewport it was 827.5px tall, being 827.5px wide, and the
            row it shares stretched the distribution beside it to the same
            992.3px. `min-h-40` was never what made it tall and demoting it
            would not have helped — the client's "the how long it takes
            evolution is way too high" is a 1:1 ratio nobody asked for.

            SO THE FLOOR IS ONLY WHERE THERE IS NOTHING TO MEASURE FROM.
            `min-h-40` holds below `lg`, where the grid has stacked into one
            column and this panel has no sibling; at `lg` and up it is released
            (`lg:min-h-0`) and the row's height is the distribution's, which
            the row then hands to this box through `items-stretch`. It is the
            same shape `AppsStackedByType` above uses, and for the same reason:
            a panel that contributes no height is a panel that can be measured
            FROM another one rather than agreeing with it until either
            changes. */}
        {/* `--radius-sm`, not `--radius-bar`: the same 4px (the bar name is
            pointed at this one), but this box is not a bar — it is the plot's
            GROUND, the kit's "heat cells, nodes" step. A 24px corner would eat
            the first and last month of a picture drawn to its own edges. */}
        <div className="bg-muted relative min-h-40 min-w-0 flex-1 overflow-hidden rounded-[var(--radius-sm)] lg:min-h-0">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            role="img"
            aria-label={t("The middle ticket, month by month")}
            className="absolute inset-0 block size-full"
          >
            {/* THE MONTHS, AS RULES BEHIND THE WORK. Drawn first so every area
                and every line sits on top of them — a gridline over a filled
                area reads as part of the data. `--border` is the app's own
                hairline token, which flips with the palette, so one value is
                right on both papers. */}
            {months.map((m, i) => (
              <line
                key={m}
                // NAMED, because the lone-month DOT below is also a `<line>`
                // (a zero-length one with a round cap — see its own comment),
                // and the suite that proves a kind's gap is not joined across
                // counts those. Two marks of one element name need two names,
                // or a test about the data ends up counting the furniture.
                data-slot="trend-month-rule"
                x1={x(i)}
                y1={0}
                x2={x(i)}
                y2={100}
                stroke="var(--border)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {paint.map((type) => {
              const points = months.map((m, i) => {
                const hit = rows.find((r) => r.helpType === type && r.month === m)
                return hit ? `${x(i)},${y(hit.medianDays)}` : null
              })
              // A month a kind closed NOTHING in is a HOLE, not a zero: the
              // line stops and starts again rather than diving to the baseline
              // and claiming that month was instant. (It used to be a month
              // under the floor as well; the floor is gone and this is not,
              // because "nothing closed" was never the same fact as "not many
              // closed".)
              const runs: string[][] = []
              for (const p of points) {
                if (p === null) runs.push([])
                else (runs[runs.length - 1] ?? runs[runs.push([]) - 1]).push(p)
              }
              const colour = ticketTypeColour(type)
              return (
                <g key={type}>
                  {runs
                    .filter((run) => run.length > 0)
                    .map((run, i) =>
                      run.length === 1 ? (
                        // A MONTH WITH NEITHER NEIGHBOUR still has to be drawn,
                        // or a kind sits in the legend with nothing on the plot
                        // — which reads as "this kind has no wait" rather than
                        // "this kind closed something in exactly one month".
                        // There are MORE of these now that no month is dropped:
                        // a kind that closes one ticket in an odd month is a
                        // lone dot, which is exactly what the client asked to
                        // see rather than to have hidden. A zero-length line
                        // with a round cap is a DOT in SVG, and it is the one
                        // dot shape that survives `preserveAspectRatio="none"`:
                        // `vector-effect` makes the cap a true circle in device
                        // pixels, where a `<circle>` would be squashed into an
                        // ellipse by the same non-uniform scale.
                        <line
                          key={i}
                          data-slot="trend-point"
                          x1={run[0].split(",")[0]}
                          y1={run[0].split(",")[1]}
                          x2={run[0].split(",")[0]}
                          y2={run[0].split(",")[1]}
                          stroke={colour}
                          strokeWidth={5}
                          strokeLinecap="round"
                          vectorEffect="non-scaling-stroke"
                        />
                      ) : (
                        <React.Fragment key={i}>
                          <polygon
                            points={`${run[0].split(",")[0]},100 ${run.join(" ")} ${run[run.length - 1].split(",")[0]},100`}
                            fill={colour}
                            opacity={0.35}
                          />
                          <polyline
                            points={run.join(" ")}
                            fill="none"
                            stroke={colour}
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                          />
                        </React.Fragment>
                      )
                    )}
                </g>
              )
            })}
          </svg>
          {/* ── ONE HIT AREA PER MONTH, IN HTML, OVER THE PLOT ───────────────
              Each band runs from the midpoint of the gap before its month to
              the midpoint of the gap after it, so the area a pointer has to
              find is centred on the point it is about rather than on a slice
              of an evenly-cut row — the first and last months own only their
              half, which is why this is arithmetic rather than a flex row of
              equal children.

              A REAL BUTTON, so it is in the tab order and Radix opens the card
              on focus as well as on hover, and so a press works where hover
              does not exist at all. It draws nothing at rest; the tint on
              hover/open is the only mark it makes, because the plot underneath
              is the picture. */}
          <div className="absolute inset-0">
            {months.map((m, i) => {
              const left = i === 0 ? 0 : (x(i - 1) + x(i)) / 2
              const right = i === months.length - 1 ? 100 : (x(i) + x(i + 1)) / 2
              const lines = monthLines(m)
              // THE WHOLE READOUT AS ONE SENTENCE, for the accessible name. The
              // month leads, then a kind and its two figures, in the same words
              // and the same order the card below prints them — one translation,
              // read twice, so what a screen reader hears and what a sighted
              // reader sees can never be two different claims.
              const said = [
                m,
                ...lines.map(
                  (l) =>
                    `${l.type}: ${t("{median} days, from {count} closed", {
                      median: l.hit.medianDays.toFixed(l.hit.medianDays % 1 === 0 ? 0 : 1),
                      count: l.hit.n,
                    })}`
                ),
              ].join(" · ")
              return (
                <HoverCard key={m} openDelay={60} closeDelay={60}>
                  <HoverCardTrigger asChild>
                    <button
                      type="button"
                      aria-label={said}
                      /* The month's hit area over the plot above: the same 4px
                         ground step, because it is a band ON that ground and
                         not a bar of its own. */
                      className="absolute inset-y-0 rounded-[var(--radius-sm)] hover:bg-background/50 data-[state=open]:bg-background/50"
                      style={{ left: `${left}%`, width: `${right - left}%` }}
                    />
                  </HoverCardTrigger>
                  <HoverCardContent className="flex flex-col gap-2">
                    <p className="text-sm tabular-nums">{m}</p>
                    {lines.map((l) => (
                      <div key={l.type} className="flex flex-col gap-0.5">
                        <TypeKey type={l.type} />
                        <span className="text-muted-foreground text-xs tabular-nums">
                          {t("{median} days, from {count} closed", {
                            median: l.hit.medianDays.toFixed(l.hit.medianDays % 1 === 0 ? 0 : 1),
                            count: l.hit.n,
                          })}
                        </span>
                      </div>
                    ))}
                  </HoverCardContent>
                </HoverCard>
              )
            })}
          </div>
        </div>
      </div>
      {/* The month row repeats the scale column's own `w-8` and the same `gap-2`
          rather than paying a single left padding of its own: one number,
          written where it is measured, so the labels stay under the plot if
          either ever moves. (A `pl-10` here would also have been a spacing step
          the kit does not admit — ruling 28 has no 40.) */}
      <div className="flex min-w-0 items-center gap-2">
        <span aria-hidden="true" className="w-8 shrink-0" />
        <div className="text-muted-foreground flex min-w-0 flex-1 justify-between text-xs tabular-nums">
          <span>{months[0]}</span>
          <span>{months[months.length - 1]}</span>
        </div>
      </div>
      {/* NOTHING BELOW THE MONTHS ANY MORE. Two things used to live here and
          both left in the same change: the legend moved to the top right at the
          client's word, and the floor's caption went with the floor itself —
          see this component's header for why a caption outliving its rule is
          worse than no caption at all. */}
    </div>
  )
}

/** The latest median a kind reported, for ordering the areas back to front. */
function median(rows: TicketDashboard["closureTrend"], type: string): number {
  const mine = rows.filter((r) => r.helpType === type)
  return mine.length === 0 ? 0 : mine[mine.length - 1].medianDays
}

/* ══════════════════════════════════════════════════════════════════════════
   THE SCREEN.
   ══════════════════════════════════════════════════════════════════════════ */

export function TicketsDashboard({
  teamId,
  helpTypeOptions,
  ticketTotal,
  appId,
  standsOn = "card",
  viewSlot,
  actions,
}: {
  teamId: string
  /** the team's live `Ticket type` values — the order the pipelines, the legend
   * and the matrix are all drawn in, so a team that renames or reorders its
   * vocabulary is obeyed here without a deploy */
  helpTypeOptions: string[]
  /** R50's own question, and it is the WHOLE collection's raw count rather than
   * this tab's own answer: the toolbar must disappear on a team with no tickets
   * at all, and must NOT disappear because somebody filtered to a client with
   * none. `undefined` while the count is still in flight — which is not empty,
   * for the reason the loading branch below gives. */
  ticketTotal: number | undefined
  /** ONE SYSTEM'S OWN DASHBOARD — the app record's Tickets tab, in its Dashboard
   * view (client, 6 Sep 2026: "make the dashboard a view inside the Tickets tab
   * inside the app, and include whatever you think is relevant from the main
   * dashboard for tickets, like a mini version, a filtered version").
   *
   * IT IS THE SAME SCREEN AND NEVER A SECOND ONE. Absent, this is the Tickets
   * screen's own Dashboard tab and every panel below draws. Present, it is a
   * WHERE clause on all eight of the door's grouped reads (`appId` rides
   * `content.helpDashboard` and the cache key, exactly as the two toolbar
   * filters do), and TWO of the five panels stand down because the narrowing
   * empties them of meaning rather than of rows — each says why at its own call
   * site below.
   *
   * A FACT ABOUT WHERE THE READER IS STANDING, NOT A QUESTION. It never becomes
   * a facet: the app is the record whose page this is, and offering a control to
   * change it would be offering to navigate. */
  appId?: string
  /** WHAT THIS DASHBOARD IS STANDING ON — and the ONE thing it decides is
   * whether the toolbar draws a card of its own.
   *
   * THE CLIENT, 7 Sep 2026, on two screenshots side by side: "the toolbar in
   * dashboard needs some kind of container 😕 think of sth — the most similar
   * possible to the in-card toolbars!" Her Triage screenshot has the well she
   * wants; her Dashboard screenshot has the identical `<ToolbarRow>` and no
   * well at all. NOTHING WAS MISSING FROM THE ROW. `<ToolbarRow>` already
   * draws the well — its own `toolbar-row-column` div, `bg-surface-raised`
   * (= `--card`), `rounded-pill`, `py-1.5 pe-1.5 ps-4` — and the well is only
   * VISIBLE because of what it stands on. Every other toolbar in this app is
   * inside a `<Card>`, whose default variant paints `bg-surface-panel`, so the
   * raised well reads against soft paper: measured 1.103:1 in light
   * (#FFFEF9 on #F7F2EB) and 1.111:1 in dark (#26241F on #1C1B18).
   *
   * THIS SCREEN IS THE ONE THAT IS NOT. `ScreenShell`'s content card and body
   * are `bg-[var(--surface-raised)]` (screen-shell.tsx), so the Tickets
   * screen's Dashboard tab drew a raised well on a raised ground: **1.000:1
   * in BOTH palettes** — the record footer's own defect, on a second screen.
   * Not a light-mode accident either; the two tones are literally the same
   * token, so no palette could ever separate them.
   *
   * SO THE FIX IS THE GROUND AND NEVER THE ROW, and it belongs to the HOST
   * because the two hosts genuinely differ. `"card"` — the app record's
   * Tickets tab (`AppTicketsTab`, work-panels.tsx) — is already inside
   * `RecordChrome`'s soft-paper card, so its well already reads and a second
   * card here would be the card-in-a-card CLAUDE.md's `useKitPanel` note calls
   * the broken combination. `"screen"` — the Tickets screen's Dashboard tab,
   * where the branch deliberately draws no `CollectionCard` (five panels, not
   * one collection) — has no paper under it, so the toolbar brings its own.
   * ONLY the toolbar: the panels stay where they are, outside it.
   *
   * `"card"` IS THE DEFAULT because it is the shape this component has always
   * drawn — omitting it changes nothing on screen, so a host that says nothing
   * gets exactly what it got before this prop existed. */
  standsOn?: "card" | "screen"
  /** THE OTHER BODY THIS COLLECTION HAS, when it has one (R53's `view` slot,
   * passed straight through to `<ToolbarRow>`).
   *
   * The Tickets SCREEN has no such switch — its Dashboard is a folder tab beside
   * Triage and the list, and a screen does not offer two ways to leave one tab.
   * Inside an app RECORD there is no strip to add to (the client's own ruling:
   * "there can never be 2 rows of tabs"), so the list and this dashboard are two
   * VIEWS of one tab and the switch belongs in the toolbar — the same slot the
   * list view's own `<PagedFind>` draws it in, from the same config, so one
   * control appears in one place whichever body is on screen. */
  viewSlot?: ToolbarViewSlot
  /** THE ROW'S OWN ACTION BUTTONS — "Raise ticket", the same control every other
   * ticket tab carries, handed down rather than built here.
   *
   * CLIENT, 6 Sep 2026: "On the dashboard, I'm missing the full toolbar, so go
   * ahead and implement that." What was missing was this slot: the row passed
   * `filters` and `view` and nothing else, so on the one tab of Tickets where
   * the strip and the toolbar are the whole chrome, the right-hand end of the
   * row was empty while every sibling tab had a create button there.
   *
   * A NODE FROM THE HOST, and never a `canCreate`/`onCreate` pair rebuilt into
   * an `<AddButton>` here. Both hosts already hold that control for their OTHER
   * body — `tickets-collection.tsx` hands the identical node to its own
   * `<PagedFind actions>`, and the app record's Tickets tab draws it through
   * `PagedPanelBody`'s `onNew` — so passing the node is what makes "the same
   * button" a fact rather than a claim: one permission check, one label, one
   * glyph, and no second copy to drift. It is the same shape `viewSlot` above
   * already uses for the same reason.
   *
   * Absent is a legitimate answer (a role that cannot raise a ticket), and R50
   * still outranks it: on a team with no tickets at all the whole row goes,
   * this button included. */
  actions?: React.ReactNode
}) {
  const t = useT()
  // THE TWO FILTERS, HELD HERE AND SPENT AT THE DOOR. They are not remembered
  // across sessions on purpose: a dashboard silently narrowed to one client from
  // a choice made last Tuesday is a screen whose every heading lies, and unlike a
  // list there are no rows on it to make the narrowing visible.
  const [facetValues, setFacetValues] = React.useState<Record<string, string>>({})
  const accountId = facetValues.accountId ?? ""
  const helpType = facetValues.helpType ?? ""

  // ── THE SEARCH BOX ────────────────────────────────────────────────────────
  //
  // CLIENT, 7 SEP 2026, HAVING SAID IT TWICE: "on the dashboard, I'm missing the
  // full toolbar", then "still missing full toolbar!". Sort is absent by her own
  // earlier ruling on this exact row ("filter by client and type / no sort"), so
  // the box was the only control a sibling ticket tab carried that this one did
  // not — which is what she was looking at.
  //
  // IT IS A THIRD DOOR PARAMETER AND NOT A DECORATION, which is the only shape
  // that can work here: there are no rows on this tab for a browser to sieve, so
  // a box that narrowed anything client-side would narrow nothing at all. The
  // term rides `content.helpDashboard` beside `accountId` and `helpType`, lands
  // in the WHERE clause of all nine of the door's grouped reads, and every panel
  // below is then a tally over the tickets that mention it. "The dashboard for
  // tickets mentioning invoice" is a real reading of the backlog.
  //
  // IT IS THE LIST'S OWN SEARCH, NOT A SECOND ONE. The door binds `q` into the
  // same `searchClause` — description, reference, title — that
  // `GET /api/content/help?q=` binds it into, so a term finds the same tickets
  // on this tab as on the list tab beside it. Two answers to one question, typed
  // into two boxes on one screen, was the failure worth designing against, and
  // the defence is that neither box owns a matcher of its own.
  //
  // WHAT IS TYPED AND WHAT IS ASKED ARE TWO VALUES, exactly as `record-picker`
  // holds them, and for a sharper reason here: this door takes nine grouped
  // scans of the backlog, so a keystroke that fired one would be nine scans per
  // letter, each landing in its own cache key. The box keeps up with the
  // keyboard; the request runs up to 200ms behind it, through the kit's own
  // `useDebouncedCallback` at the same delay the picker's door search uses.
  //
  // NOT REMEMBERED ACROSS SESSIONS, for the same reason the two facets above are
  // not: a dashboard silently narrowed to a word somebody typed last Tuesday is
  // a screen whose every panel is about a slice while every heading says
  // backlog — and unlike a list there are no rows on it to make that visible.
  // The box being on screen with the word still in it is the whole disclosure.
  const [text, setText] = React.useState("")
  const [term, setTerm] = React.useState("")
  const askDoor = useDebouncedCallback(setTerm, 200)

  // ONE CACHE ENTRY PER QUESTION (`helpDashboardKey` carries every narrowing —
  // both filters AND the system, when there is one), so switching client does
  // not overwrite the unfiltered answer, one app's dashboard can never be served
  // another's, and switching back paints instantly from the cache —
  // CACHING.md's cache-first rule, applied to a picture instead of a list.
  const dashQ = useCached<TicketDashboard>(
    helpDashboardKey(teamId, accountId, helpType, appId ?? "", term),
    () =>
      contentApi.helpDashboard({
        accountId: accountId || undefined,
        helpType: helpType || undefined,
        appId,
        q: term || undefined,
      })
  )
  // THE CLIENT FACET'S OPTIONS. `tenancy.accounts()` is page ONE of a growing
  // list (R14) — the same known limitation the ticket list's own Client facet
  // accepts and writes down (tickets-collection.tsx says why: a searched,
  // door-backed facet option list is a capability no facet control in this app
  // has yet). Filed here too rather than silently inherited.
  //
  // NOT READ AT ALL INSIDE AN APP, because there is no Client facet there to
  // fill (see `facets` below) — a `null` key is `useCached`'s own way of saying
  // "do not ask", so the app record's Tickets tab pays for no accounts page it
  // would never draw.
  const accountsQ = useCached<Account[]>(appId ? null : accountsKey(teamId), () =>
    tenancy.accounts().then((r) => r.accounts)
  )

  const data = dashQ.data
  const loading = data === undefined
  // DID THE QUESTION FIND ANYTHING? Asked of the DOOR's own count of the rows
  // every panel was grouped over (`matched`), never inferred from whether the
  // panel arrays came back empty: a ticket with no kind and nothing closed sits
  // in none of those groupings, so "all the arrays are empty" is a fact about
  // which reads exclude nulls today rather than about whether anything matched.
  //
  // GATED ON SOMETHING HAVING BEEN ASKED. A zero with an untouched toolbar is
  // the collection's own empty state, which the branch above already owns off
  // `ticketTotal` — and that branch has to keep owning it, because it reads the
  // WHOLE collection's count while this reads the narrowed one (R50: the
  // toolbar disappears for a team with no tickets, and must not disappear
  // because somebody typed a word).
  const asked = Boolean(term) || Object.keys(facetValues).length > 0
  const narrowedToNothing = asked && data !== undefined && data.matched === 0
  // WHICH KINDS TO DRAW, AND IN WHICH ORDER — one decision, made once, obeyed by
  // every panel below.
  //
  // WHICH: the vocabulary leads, so the columns are the words this team uses; a
  // kind that only exists on historical tickets (a retired word, an imported
  // one) is appended rather than dropped, because a bar it owns would otherwise
  // vanish from a chart whose total still counts it.
  //
  // IN WHICH ORDER: the client's, fixed — issue, question, request, extra
  // (`orderTicketTypes`, web/lib/type-colours.ts, where the ruling and the
  // unknown-word rule are written down beside the colours they are keyed the
  // same way as). It used to be the vocabulary's own order, which is the seed's
  // order, which starts with Question. Sorting HERE rather than in each panel is
  // the point: `types` is the one array the pipeline, the per-system bars, the
  // by-client lists, the matrix's two axes and the closing-time spread all read,
  // so one sort settles five panels and a fifth kind added tomorrow lands in one
  // decision. The trend is the one panel that does not take this array — its
  // kinds come from its own rows — and it sorts through the same function.
  const types = React.useMemo(() => {
    const seen = new Set<string>()
    const inData = new Set<string>()
    for (const r of data?.openByTypeAndStatus ?? []) inData.add(r.helpType)
    for (const r of data?.raisedVsCurrent ?? []) inData.add(r.raisedAsType)
    for (const r of data?.closureDays ?? []) inData.add(r.helpType)
    const out: string[] = []
    for (const word of helpTypeOptions) {
      if (seen.has(word)) continue
      seen.add(word)
      out.push(word)
    }
    for (const word of inData) if (!seen.has(word)) out.push(word)
    return orderTicketTypes(out)
  }, [data, helpTypeOptions])

  const facets: FilterFacet[] = [
    // THE CLIENT FACET IS ABSENT INSIDE AN APP, and this is the same subtraction
    // the "Who has more" panel makes below, made at the toolbar. An app row
    // carries ONE `accountId` — it is built for one client, or it is ours — so
    // inside one system the choice is between that client's tickets and nothing.
    // A control whose only meaningful setting is the one already in force is not
    // a filter, it is a fact wearing a control's clothes.
    ...(appId
      ? []
      : [
          {
            field: "accountId",
            label: t("Client"),
            control: "select" as const,
            options: (accountsQ.data ?? [])
              .filter((a) => a.active)
              .map((a) => ({ value: a.id, label: a.name }))
              .sort((a, b) => a.label.localeCompare(b.label)),
          },
        ]),
    {
      field: "helpType",
      label: t("Type"),
      control: "select",
      options: helpTypeOptions.map((v) => ({ value: v, label: v })),
    },
  ]
  // CALLED UNCONDITIONALLY — a hook cannot sit after an early return, the same
  // discipline every other `useFilterBar` call site in this app keeps.
  const { pill: filterPill, panel: filterPanel } = useFilterBar({
    facets,
    values: facetValues,
    // The options are given above, so nothing is derived from rows — which is
    // just as well, since this screen has none.
    data: [],
    onChange: (field, value) =>
      setFacetValues((prev) => {
        const next = { ...prev }
        if (value === "") delete next[field]
        else next[field] = value
        return next
      }),
    onClearFacets: () => setFacetValues({}),
  })

  if (dashQ.error)
    return (
      <Card>
        <CardContent className="p-4">
          <ShapeStateBody
            shape="collectionScreen"
            state="error"
            copy={{ errorTitle: t("Couldn't load the dashboard.") }}
            action={
              <Button variant="secondary" onClick={() => dashQ.refresh()}>
                {t("Try again")}
              </Button>
            }
          />
        </CardContent>
      </Card>
    )

  // R50'S OWN QUESTION, ASKED ONCE AND SPENT TWICE. The row takes it as
  // `empty` and returns null; the CARD below is drawn for that row and has to
  // agree with it, because a container around a row that drew nothing is an
  // empty box of soft paper above the collection's own empty state — the same
  // "lone floating furniture" R50 exists to stop, one level out. One
  // expression, so the two answers cannot drift apart.
  const noTickets = ticketTotal === 0

  // THE ROW ITSELF, NAMED SO THE CONTAINER DECISION BELOW CAN BE READ AS ONE
  // LINE rather than as two copies of a fifty-line tag in a ternary.
  const toolbar = (
    /* THE TOOLBAR (client ruling, 2026-09-06: "dashboard should also have
    toolbar / filter by client and type / no sort", and later the same day
    "on the dashboard, I'm missing the full toolbar, so go ahead and
    implement that" — which was this row's `actions` slot standing empty
    while every sibling ticket tab drew a create button in it).

    THE SEARCH BOX IS HERE NOW (client, 7 Sep 2026: "still missing full
    toolbar!"), and `TOOLBAR_EXEMPT`'s line for this file was DELETED
    rather than reworded in the same change — an exemption that no longer
    describes the code is worse than none, because it reads as a decision
    somebody made about the screen in front of you.

    NO SORT CONTROL, and that one is still recorded (`TOOLBAR_SORT_EXEMPT`)
    rather than decided here: a dashboard has no row order to offer,
    because it has no rows. That is not the same sentence as the search
    box's, which is why only one of the two entries died — searching a
    backlog and reordering a picture are different acts.

    ALL THREE NARROWINGS ARE DOOR PARAMETERS — they land in the cache key
    above and in the WHERE clause of every read behind it — which is the
    only shape that can work when every number on screen is a COUNT(*)
    somebody else took.

    `empty` is the WHOLE collection's count and never this tab's own
    answer (R50): the row must disappear for a team with no tickets, and
    must not disappear because somebody filtered to a quiet client, or
    typed a word nothing matches. */
    <ToolbarRow
      empty={noTickets}
      // THE SAME PLACEHOLDER THE LIST TAB'S OWN BOX SAYS, deliberately the
      // same words rather than a dashboard-flavoured variant: it is the same
      // search, over the same tickets, through the same door-side clause, and
      // a second wording would advertise a difference that does not exist.
      search={
        <SearchInput
          value={text}
          onChange={(e) => {
            setText(e.currentTarget.value)
            askDoor(e.currentTarget.value)
          }}
          // CLEARING IS IMMEDIATE ON BOTH VALUES, never debounced: "show me
          // everything again" is one deliberate act, and making somebody
          // watch a stale answer for a fifth of a second after it is the one
          // moment a debounce is felt rather than unnoticed.
          onClear={() => {
            setText("")
            setTerm("")
          }}
          placeholder={t("Search tickets…")}
          className="w-full"
        />
      }
      filters={filterPill}
      toolbarPanel={filterPanel}
      // THE VIEW SWITCH, WHERE THERE IS A SECOND BODY TO SWITCH TO — the app
      // record's Tickets tab, which is this dashboard and a list. `undefined`
      // on the Tickets screen's own Dashboard TAB, where the strip above it
      // already is the way out. `undefined` DRAWS NOTHING and needs no
      // exemption (R53 says so about this exact prop); note that since kit
      // v1.2.60 passing a single view would draw a static label instead, so
      // "omit it" and "pass one" are no longer the same thing on screen.
      view={viewSlot}
      // "RAISE TICKET", at the right of the row — the host's own node, the
      // identical one its other body draws (see the `actions` prop above).
      actions={actions}
    />
  )

  return (
    <>
      {/* THE TOOLBAR'S OWN CONTAINER, AND ONLY WHERE THERE IS NO PAPER UNDER
          IT — client, 7 Sep 2026: "the toolbar in dashboard needs some kind of
          container 😕 think of sth — the most similar possible to the in-card
          toolbars!"

          THE IN-CARD TOOLBAR IS NOT A SECOND TREATMENT TO COPY. It is this
          exact `<ToolbarRow>`, drawing its own `toolbar-row-column` well
          (`bg-surface-raised`, `rounded-pill`, `py-1.5 pe-1.5 ps-4`, R53's
          fixed slot order) inside a `<Card>` whose default variant paints
          `bg-surface-panel`. So there is nothing here to re-tune: the SAME
          component draws the well, and the same two kit parts — `Card` +
          `CardContent` — put soft paper under it, which is `CollectionCard`'s
          whole body (screen-bits.tsx) and this file's own `Panel` (above).
          Reused, not agreed with: the radius, the fill, the inner padding, the
          control sizes and the slot order are all still the row's, so they
          cannot drift from Triage's by a hand-typed number.

          MEASURED, BOTH PALETTES, BECAUSE AN INVISIBLE CONTAINER IS NOT ONE.
          The well against the paper it now sits on is 1.103:1 in light
          (#FFFEF9 on #F7F2EB) and 1.111:1 in dark (#26241F on #1C1B18) —
          byte-identical to Triage, because it is the identical token pair.
          Against the shell it used to sit on it was 1.000:1 in BOTH:
          `ScreenShell`'s card and its body both paint `--surface-raised`
          (screen-shell.tsx, in the arbitrary form) and the row's own fill is
          `--surface-raised` too — one token painted on itself, which no
          palette could ever separate. That is the record footer's defect on a
          second screen, and it is why "the container is missing" was the right
          reading of a row that had been drawing one all along.

          ONE DELIBERATE DIFFERENCE FROM `CollectionCard`, AND IT IS A NUMBER
          THIS ROW ALREADY PAYS. `CollectionCard` is `<CardContent
          className="p-4">` — which keeps `CardContent`'s own `lg:` step
          through `cn()`, so its inset is `--space-4` and `--space-7` above
          `lg`, and this card takes the identical ladder. The BOTTOM inset is
          zeroed at both steps (`pb-0 lg:pb-0`) because the row inside it
          already pays `mb-[var(--toolbar-content-gap)]` on its own
          root (R49 — that gap is the row's and no call site may spend it
          twice). Without the zero the card would stack the two, 30 + 18.75 of
          air under a pill with 30 above it; with it the card is the kit's
          own inset on three sides and the row's own gap below. In Triage the
          same number falls between the toolbar and the ROWS, which is the job
          it was written for — here there are no rows in the card, so it
          becomes the card's last inset instead of a second one.

          `mb-4` IS A DIFFERENT NUMBER FOR A DIFFERENT JOB, and is not a
          second hand on R49's: it is the gap from THIS card to the next
          piece of furniture, the same `gap-4` every panel-to-panel gap on
          this screen already spends.

          NO SORT CONTROL COMES BACK WITH THE PAPER. The container decides
          where the row stands and nothing about what is in it — the row is one
          node, built once above, and `TOOLBAR_SORT_EXEMPT` still carries the
          reason a dashboard offers no order (R53). */}
      {standsOn === "screen" && !noTickets ? (
        <Card className="mb-4">
          <CardContent className="p-4 pb-0 lg:pb-0">{toolbar}</CardContent>
        </Card>
      ) : (
        toolbar
      )}
      {loading ? (
        <Skeleton className="h-64 w-full rounded-[var(--radius)]" />
      ) : noTickets ? (
        <Card>
          <CardContent className="p-4">
            <ShapeStateBody
              shape="collectionScreen"
              state="empty"
              copy={{
                emptyTitle: t("Nothing is open right now."),
                emptyDescription: t(
                  "Every ticket a client raises shows here while it is being worked on."
                ),
              }}
            />
          </CardContent>
        </Card>
      ) : narrowedToNothing ? (
        /* ── THE QUESTION FOUND NOTHING ──────────────────────────────────
           ONE SENTENCE, AND THAT IS THE WHOLE POINT OF THIS BRANCH. Without
           it a term nothing matches is six panels each drawing its own
           private "Nothing is open right now." — six true statements that
           together read as a broken screen rather than as an answer. A
           reader who typed a word wants to be told about the WORD.

           IT NAMES THE TERM when there is one, because "nothing matched" on
           its own is the same sentence a screen would show for any reason at
           all, and the reader's next move (retype it, clear it) depends on
           seeing what was actually asked. With only the facets narrowing,
           the app's existing sentence is the right one and is reused
           verbatim — `PagedFind` says exactly this over a searched-and-
           filtered collection, and one wording for one situation is the
           whole reason it is not written again here.

           IT IS NOT THE COLLECTION'S EMPTY STATE, and the branch above it is
           why the two cannot be confused: `noTickets` is a team with
           no tickets, which is a different fact and gets a different, and
           welcoming, sentence. This one only ever appears once somebody has
           asked something. */
        <Card>
          <CardContent className="p-4">
            <ShapeStateBody
              shape="collectionScreen"
              state="empty"
              copy={{
                emptyTitle: term
                  ? t("Nothing matched “{term}”.", { term })
                  : t("Nothing matched. Try fewer words, or clear the filters."),
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="flex min-w-0 flex-col gap-4">
          <Panel
            title={t("The open work")}
            chip={
              data && data.unopenedPastLine > 0 ? (
                <span className="bg-warning text-warning-foreground rounded-pill px-3 py-1 text-xs tabular-nums">
                  {t("{count} past the three-day line", { count: data.unopenedPastLine })}
                </span>
              ) : null
            }
          >
            <OpenWork rows={data?.openByTypeAndStatus ?? []} types={types} t={t} />
          </Panel>

          {/* ── THE ROW OF THREE, AND THE TWO THAT DO NOT SURVIVE ONE APP ──
              The client asked for "whatever you think is relevant … like a mini
              version, a filtered version", which is a judgement rather than a
              shrink. A panel is DROPPED when the narrowing empties it of
              MEANING, never when it merely has fewer rows — a chart with less in
              it is still a chart, and a chart that can only ever draw one mark
              is furniture.

              6A · WHICH APP — dropped. It is one bar per system, ranked; inside
              one system it is one bar at 100% of a scale it sets itself, under a
              heading naming the record the reader is already standing on. The
              kind SPLIT it carries is the only information left in it, and that
              is the pipeline panel above, drawn properly against the lifecycle.

              2B · WHO HAS MORE, BY CLIENT — dropped, and this one was checked
              rather than assumed. `AppRow` carries a single `accountId` (an app
              is built for one client, or it is ours), so "which client asks for
              the most" inside one app is a ranking of one — the same reason the
              Client FACET is absent from this toolbar. It is NOT structurally
              impossible for a second client to appear: `help.account_id` and
              `help.app_id` are independent columns, and the raise dialog on this
              very record deliberately leaves the client as a question ("a ticket
              about one of our systems may be raised on behalf of a client or be
              our own housekeeping"). So the honest sentence is that the panel
              would draw one bar in the ordinary case and two in an odd one —
              which is a comparison nobody came to this page to make, and it is
              one screen away on the Tickets dashboard where it is the question.

              WHAT IS KEPT ANSWERS A QUESTION SOMEBODY STANDING ON THIS APP ASKS:
              where its open work is stuck (the pipeline), whether what arrives
              about it is what it turns out to be (the matrix), and how long it
              takes us to close things on it (the spread and the trend). */}
          {appId ? (
            <Panel title={t("Raised as, then triaged as")}>
              <RaisedAsFlow
                rows={data?.raisedVsCurrent ?? []}
                        types={types}
                t={t}
              />
            </Panel>
          ) : (
            <div className="grid min-w-0 gap-4 lg:grid-cols-3">
              {/* 6A — the reading the client picked. See `AppsStackedByType` for
                  the two she did not, and for why swapping one in is a change at
                  this line rather than a rewrite of the panel. */}
              {/* THE TWO PANELS THAT LINK, AND THE ONE HOST THEY LINK FROM.
                  Both take `teamId` because both now write an in-app address
                  (R37's `InAppLink`) — and both are inside the `appId` branch's
                  ELSE, which is the whole answer to "does this still make sense
                  inside an app record?": inside one they do not draw at all,
                  for the reasons written above, so neither ever offers a link
                  to the record the reader is already standing on. */}
              <Panel title={t("Which app")}>
                <AppsStackedByType
                  rows={data?.openByApp ?? []}
                  types={types}
                  teamId={teamId}
                  t={t}
                />
              </Panel>
              <Panel title={t("Who has more")}>
                <WhoHasMore
                  rows={data?.byAccountAndType ?? []}
                  types={types}
                  teamId={teamId}
                  t={t}
                />
              </Panel>
              <Panel title={t("Raised as, then triaged as")}>
                <RaisedAsFlow
                  rows={data?.raisedVsCurrent ?? []}
                            types={types}
                  t={t}
                />
              </Panel>
            </div>
          )}

          {/* ── THE CLOSING TIME, IN TWO PANELS ON ONE ROW ─────────────────
              CLIENT, 6 Sep 2026, three notes that are one layout: "same style
              as How long a ticket takes to close put text above the mountain
              graph 'Tendency'" · "the how long, split in 2 containers same
              row" · "the how long 1/3, the graph 2/3".

              THE TWO SUB-HEADINGS ARE GONE AND THE SPLIT IS WHY. "What it is
              now" and "Which way it is going" were small grey labels inside one
              card, doing the job a heading does — which is exactly what she
              refused ("in the how logn ticket takes to close remove subtitle
              'What it is now' and 'Which way it is going'"). Promoting the
              trend to its own titled panel is the same instruction from the
              other end: "Tendency" is now a heading at the same level as "How
              long a ticket takes to close", in the same style, because it is
              the title of a panel and not a label inside one. The distribution
              keeps the original title, which is the question it answers.

              A THIRD AND TWO THIRDS, WHICH IS THE SHAPE OF THE TWO PICTURES.
              The distribution is a handful of short rows and reads at any
              width; the trend is a time axis, and a time axis is the one thing
              on this screen that genuinely needs room — squeeze twelve months
              into a third of a row and the months stop being separable at all.

              IT STILL STACKS. One column below `lg:`, in source order, so on a
              narrow screen the distribution is read first and the trend gets
              its own full width rather than a third of one — and inside the app
              record's Tickets tab, which is a narrower column than the Tickets
              screen, the same rule applies at the same breakpoint. Both panels
              are grid siblings, so the row stretches them to one height and the
              trend's plot measures itself from the distribution beside it (see
              `ClosureTrend`); when it stacks there is no sibling to measure and
              the plot falls back to its own floor.

              NO "WORKING DAYS ONLY" CAPTION ON EITHER (client, earlier the same
              day: "remove the subtitle 'working days only.' It's not needed. We
              already know it."). ONLY THE SENTENCE WENT: every figure in both
              panels is still counted Monday to Friday by the one shared seam
              (`shared/business-days.ts`), which is where that promise actually
              lives. */}
          <div className="grid min-w-0 gap-4 lg:grid-cols-3">
            <Panel title={t("How long a ticket takes to close")}>
              <ClosureSpread rows={data?.closureDays ?? []} types={types} t={t} />
            </Panel>
            <Panel title={t("Tendency")} className="lg:col-span-2">
              <ClosureTrend rows={data?.closureTrend ?? []} t={t} />
            </Panel>
          </div>
        </div>
      )}
    </>
  )
}
