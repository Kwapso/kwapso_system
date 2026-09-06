"use client"

// THE TICKETS DASHBOARD — the Monday screen.
//
// Five panels over one door read (`content.helpDashboard`), which is the whole
// architecture of this file: every number here was counted by the database, and
// nothing on this tab is a list. The backlog is a GROWING collection (R14) the
// browser only ever holds page one of, so a chart drawn from loaded rows would
// be a picture of the newest fifty tickets under a heading that says backlog.
// That single sentence decides almost everything below — why the toolbar's
// filters are door parameters rather than a sieve, why there is no sort control,
// and why this component fetches one object and draws it rather than reducing
// arrays of tickets.
//
// …AND THE SAME SCREEN NARROWED TO ONE SYSTEM (2026-09-06). The app record's
// Tickets tab has two views now — a list and this — and the dashboard view is
// this component with an `appId`: the same door, the same panels, one more
// clause in the WHERE. Two of the five panels stand down there because one app
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
// boundary) draws a bar, an area and a stacked bar over a category axis. Four of
// the five panels here are none of those: a pipeline grid, a recategorisation
// matrix, and a box-and-whisker of a duration distribution have no Recharts
// shape in the vendored kit at all, and the fifth — the twelve-month trend — is
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
import { ShapeStateBody } from "@shared/ui/compositions/states/states"
import { useFilterBar } from "@shared/web/screen-engine/filter-bar"
import type { FilterFacet } from "@shared/web/screen-engine/config"
import { useCached } from "@shared/web/store"
import { useT } from "@shared/web/language"

import { ToolbarRow, type ToolbarViewSlot } from "@/components/deep-link/screen-bits"
import { HELP_STATUS } from "@/components/deep-link/shape"
import { content as contentApi, tenancy } from "@/lib/api"
import type { TicketDashboard } from "@/lib/api/content"
import { accountsKey, helpDashboardKey } from "@/lib/live-resources"
import { orderTicketTypes, ticketTypeColour } from "@/lib/type-colours"
import type { Account } from "@shared/types"
import {
  CLOSURE_TREND_MIN_CLOSURES,
  CLOSURE_WINDOW_DAYS,
  OPEN_HELP_STATUSES,
  ticketTypeWaitsForValidation,
} from "@shared/types"

/** THE TRACK EVERY BAR IS READ AGAINST. A comparison needs a unit, and "twice"
 * is only visible against something — `pulse-charts.tsx` makes the same argument
 * for keeping the kit chart's axis on. `--muted` is the app's quiet fill and
 * flips with the palette, so one value works on both papers. */
const TRACK = "var(--muted)"

/** How many systems the "which app" panel names before it stops. The door caps
 * at a hundred (R14) — this is the SECOND, smaller ceiling, and it is about
 * legibility rather than bounds: past about eight bars in a third of a row, a
 * chart has stopped being a chart. What is left over is said as a number rather
 * than silently dropped. */
const APPS_DRAWN = 8

/* ══════════════════════════════════════════════════════════════════════════
   The small marks every panel is built from.
   ══════════════════════════════════════════════════════════════════════════ */

/** One horizontal bar on a track: the track is the scale, the fill is the value.
 *
 * `rounded` (4px) rather than either of R31's two radii, deliberately — R31's
 * own text says bare `rounded` is outside the rule, and the kit names 4px as the
 * radius of a bar. A 24px corner on a 20px-tall bar is a lozenge. */
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
    <div className="bg-muted h-5 min-w-0 flex-1 overflow-hidden rounded" title={title}>
      <div
        className="h-full rounded"
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
    <div className="bg-muted flex h-5 min-w-0 flex-1 overflow-hidden rounded">
      {segments.map((s) => (
        <div
          key={s.type}
          title={`${s.type}: ${s.n}`}
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

/** A panel: a heading, an optional line under it, an optional chip on the right,
 * and whatever the panel draws. Every panel on this screen is this shape, so the
 * screen reads as one thing rather than five. */
function Panel({
  title,
  sub,
  chip,
  children,
}: {
  title: string
  sub?: string
  chip?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Card className="min-w-0">
      <CardContent className="flex min-w-0 flex-col gap-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h3 className="text-base font-[var(--font-weight-medium)]">{title}</h3>
            {sub ? <p className="text-muted-foreground text-xs">{sub}</p> : null}
          </div>
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
  const openStages = OPEN_HELP_STATUSES.filter((s) => types.some((ty) => at(ty, s) > 0))

  // A GRID OF DASHES IS NOT AN ANSWER. The stage axis keeps its empty rows while
  // there is anything open at all — an empty stage is information — but a
  // pipeline with nothing anywhere in it is a picture of nothing wearing the
  // clothes of information, which is `pulse.tsx`'s own second rule.
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
 * site in `TicketsDashboard` below — not rewriting the panel around it. */
function AppsStackedByType({
  rows,
  types,
  t,
}: {
  rows: TicketDashboard["openByApp"]
  types: string[]
  t: (s: string, vars?: Record<string, string | number>) => string
}) {
  // The door already ordered these — busiest system first, every one of a
  // system's kinds kept together — so the grouping preserves that order rather
  // than sorting again. Re-sorting here would be a second opinion about a
  // question the door already answered, and the two would drift.
  const systems: { appId: string | null; name: string; open: number; byType: Map<string, number> }[] = []
  for (const row of rows) {
    if (row.open === 0) continue
    let system = systems.find((s) => s.appId === row.appId)
    if (!system) {
      system = {
        appId: row.appId,
        name: row.appName ?? t("No system named"),
        open: 0,
        byType: new Map(),
      }
      systems.push(system)
    }
    system.open += row.open
    system.byType.set(row.helpType, (system.byType.get(row.helpType) ?? 0) + row.open)
  }
  const scale = Math.max(1, ...systems.map((s) => s.open))
  const drawn = systems.slice(0, APPS_DRAWN)
  const rest = systems.length - drawn.length

  if (systems.length === 0)
    return <p className="text-muted-foreground text-xs">{t("Nothing is open right now.")}</p>

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {drawn.map((s) => (
        <div key={s.appId ?? "none"} className="flex min-w-0 items-center gap-2">
          <span className="w-28 shrink-0 truncate text-xs" title={s.name}>
            {s.name}
          </span>
          <StackedBar
            scale={scale}
            segments={types
              .map((type) => ({ type, n: s.byType.get(type) ?? 0 }))
              .filter((seg) => seg.n > 0)}
          />
          <span className="w-6 shrink-0 text-right text-xs tabular-nums">{s.open}</span>
        </div>
      ))}
      {rest > 0 ? (
        <p className="text-muted-foreground text-xs">{t("And {count} more systems.", { count: rest })}</p>
      ) : null}
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
 * THE CLIENT to confirm (`ticketTypeWaitsForValidation`, shared/types.ts), which
 * matches case-insensitively against whatever the team has typed. That is the
 * same predicate the ticket lifecycle itself uses, so this panel and the
 * lifecycle can never disagree about which kinds are the ones that cost money. */
function WhoHasMore({
  rows,
  types,
  t,
}: {
  rows: TicketDashboard["byAccountAndType"]
  types: string[]
  t: (s: string, vars?: Record<string, string | number>) => string
}) {
  const scoped = types.filter(ticketTypeWaitsForValidation)
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
            {list.clients.map((c) => (
              <div key={c.accountId} className="flex min-w-0 items-center gap-2">
                <span className="w-24 shrink-0 truncate text-xs" title={c.accountName ?? undefined}>
                  {c.accountName ?? t("Unnamed client")}
                </span>
                <Bar fraction={c.open / scale} colour={ticketTypeColour(list.type)} />
                <span className="w-6 shrink-0 text-right text-xs tabular-nums">{c.open}</span>
              </div>
            ))}
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
 * zero. */
function RaisedAsMatrix({
  rows,
  notRecorded,
  types,
  t,
}: {
  rows: TicketDashboard["raisedVsCurrent"]
  notRecorded: number
  types: string[]
  t: (s: string, vars?: Record<string, string | number>) => string
}) {
  const cell = (arrived: string, became: string) =>
    rows.find((r) => r.raisedAsType === arrived && r.helpType === became)?.n ?? 0
  const counted = rows.reduce((n, r) => n + r.n, 0)
  const moved = rows.reduce((n, r) => (r.raisedAsType === r.helpType ? n : n + r.n), 0)
  const heaviest = Math.max(1, ...rows.filter((r) => r.raisedAsType !== r.helpType).map((r) => r.n))

  if (counted === 0)
    return (
      <div className="flex flex-col gap-2">
        <p className="text-muted-foreground text-xs">
          {t(
            "Nothing has been triaged since we started recording what a ticket arrived as, so there is nothing to compare yet."
          )}
        </p>
        {notRecorded > 0 ? (
          <p className="text-muted-foreground text-xs">
            {t("{count} older tickets have no record of what they arrived as.", { count: notRecorded })}
          </p>
        ) : null}
      </div>
    )

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <p className="text-sm">
        {t("{moved} of {counted} tickets left triage as a different kind from the one they arrived as.", {
          moved,
          counted,
        })}
      </p>
      <div className="min-w-0 overflow-x-auto">
        <div
          className="grid min-w-[18rem] gap-1 text-xs"
          style={{ gridTemplateColumns: `6rem repeat(${types.length}, minmax(2.5rem, 1fr))` }}
        >
          <span className="text-muted-foreground self-end">{t("Became")}</span>
          {types.map((type) => (
            <span key={type} className="text-muted-foreground truncate text-center" title={type}>
              {type}
            </span>
          ))}
          {types.map((arrived) => (
            <React.Fragment key={arrived}>
              <span className="flex items-center gap-1.5 truncate" title={arrived}>
                <span
                  aria-hidden="true"
                  className="size-2 shrink-0 rounded-pill"
                  style={{ backgroundColor: ticketTypeColour(arrived) }}
                />
                {arrived}
              </span>
              {types.map((became) => {
                const n = cell(arrived, became)
                const kept = arrived === became
                return (
                  <span
                    key={became}
                    // A TWO-LAYER CELL, so the tint can be faded without fading
                    // the number written on it. `opacity` on one element would
                    // take the digits with it, which is how a heat grid ends up
                    // with its strongest cells the hardest to read.
                    className="relative flex h-8 items-center justify-center rounded tabular-nums"
                    title={`${arrived} → ${became}`}
                  >
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 rounded"
                      style={{
                        backgroundColor: n === 0 || kept ? TRACK : ticketTypeColour(arrived),
                        opacity: n === 0 || kept ? 1 : 0.2 + 0.6 * Math.min(1, n / heaviest),
                      }}
                    />
                    <span className={n === 0 ? "text-muted-foreground relative" : "relative"}>
                      {n === 0 ? "–" : n}
                    </span>
                  </span>
                )
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
      {notRecorded > 0 ? (
        <p className="text-muted-foreground text-xs">
          {t("{count} older tickets have no record of what they arrived as.", { count: notRecorded })}
        </p>
      ) : null}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   3A · WHAT IT IS NOW — the middle ticket and the middle half.
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
 * words, on the row it belongs to. */
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
        {t("Nothing has closed in the last {count} days.", { count: CLOSURE_WINDOW_DAYS })}
      </p>
    )

  const axis = Math.max(1, ...drawn.map((r) => r.p75Days)) * 2
  const pct = (v: number) => `${Math.min(100, (v / axis) * 100)}%`

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {drawn.map((r) => {
        const colour = ticketTypeColour(r.helpType)
        return (
          <div key={r.helpType} className="flex min-w-0 flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2">
              <TypeKey type={r.helpType} />
              <span className="text-muted-foreground text-xs tabular-nums">
                {t("{count} closed", { count: r.n })}
              </span>
            </div>
            <div className="bg-muted relative h-5 min-w-0 rounded">
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
                className="absolute inset-y-0 rounded"
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
            </div>
            {/* THE THREE FIGURES, AT REST, ON EVERY ROW THAT IS DRAWN — never
                behind a hover, and checked rather than assumed (client, 6 Sep
                2026: "it brings me a lot of value … but I wonder: this
                information only appears when I hover over the type"). It reads
                as a paragraph under its own bar, and it always has: this panel
                has never had a hover affordance of any kind. What IS
                hover-only on this screen is the browser's native `title` on the
                pipeline bars, the stacked per-system bars and the matrix cells,
                which is the likeliest thing she was looking at. Locked by a
                test now (`dashboard-says-what-it-left-out`), so if anybody ever
                does put it behind an interaction the build says so. */}
            <p className="text-muted-foreground text-xs tabular-nums">
              {t("Middle ticket {median} days · middle half {low} to {high} · longest {max}", {
                median: r.medianDays.toFixed(r.medianDays % 1 === 0 ? 0 : 1),
                low: r.p25Days,
                high: r.p75Days,
                max: r.maxDays,
              })}
            </p>
          </div>
        )
      })}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   3B · WHICH WAY IT IS GOING — the middle ticket, month by month.
   ══════════════════════════════════════════════════════════════════════════ */

/** THE MONTH A TICKET CLOSED IN, filled to the baseline so the height is the
 * wait.
 *
 * WHAT IS NOT DRAWN, AND WHY IT IS SAID RATHER THAN LEFT OUT QUIETLY. A
 * (month, kind) bucket with fewer than `CLOSURE_TREND_MIN_CLOSURES` closures
 * never leaves the door — a median of six is one ticket wearing a statistic, and
 * a chart cannot refuse to be read. In a normal team that means the two kinds
 * that close in real numbers are drawn and the two that trickle are not, so the
 * sentence under the chart explains the absence rather than leaving a reader to
 * assume those kinds are perfect.
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
 * The plot used to be a flat `h-40`, so the two halves of one panel were a
 * distribution as tall as its own content and a trend as tall as a number
 * somebody typed — and the two sit in the SAME `lg:grid-cols-2` row, which
 * already stretches both columns to one height. So the fix is not a bigger
 * number: the plot CLAIMS the leftover space (`flex-1` down the column, `h-40`
 * demoted to a floor for the stacked, single-column case). It is the same
 * height as the distribution because it is measured from it, rather than
 * agreeing with it until either one changes.
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

  if (months.length < 2 || series.length === 0)
    return (
      <p className="text-muted-foreground text-xs">
        {t(
          "No kind has closed at least {count} tickets in two of the last months, so there is no trend to draw yet.",
          { count: CLOSURE_TREND_MIN_CLOSURES }
        )}
      </p>
    )

  const top = Math.max(...rows.map((r) => r.medianDays)) * 1.15
  // The viewBox is a unit square scaled to the box by CSS, which is what lets the
  // months and the scale live outside it as real text.
  const x = (i: number) => (i / (months.length - 1)) * 100
  const y = (v: number) => 100 - (v / top) * 100

  /** WHAT ONE MONTH SAYS, as the lines a person reads — in the client's fixed
   * kind order, and only for the kinds that actually cleared the floor that
   * month. A kind with no point in a month is ABSENT from its card rather than
   * written as a zero: the door dropped that bucket because a median of six is
   * one ticket wearing a statistic, and printing "0 days" would be the chart
   * telling exactly the lie the floor exists to prevent. */
  const monthLines = (m: string) =>
    series
      .map((type) => ({ type, hit: rows.find((r) => r.helpType === type && r.month === m) }))
      .filter((l): l is { type: string; hit: TicketDashboard["closureTrend"][number] } =>
        Boolean(l.hit)
      )

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <div className="flex min-w-0 flex-1 items-stretch gap-2">
        <div className="text-muted-foreground flex w-8 shrink-0 flex-col justify-between text-right text-xs tabular-nums">
          <span>{Math.round(top)}</span>
          <span>0</span>
        </div>
        {/* `relative`, because the month hit areas below are HTML laid OVER the
            plot rather than shapes inside it — the same argument this file's
            header makes about every other mark here: an element hit area keeps
            its own geometry under `preserveAspectRatio="none"`, where an SVG
            `<rect>` would be stretched with everything else. `min-h-40` is the
            old fixed height, demoted to a FLOOR: it is what the plot falls back
            to when the panel stacks into one column and there is no sibling to
            match. */}
        <div className="bg-muted relative min-h-40 min-w-0 flex-1 overflow-hidden rounded">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            role="img"
            aria-label={t("The middle ticket, month by month")}
            className="block size-full"
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
              // A month a kind did not clear the floor in is a HOLE, not a zero:
              // the line stops and starts again rather than diving to the
              // baseline and claiming that month was instant.
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
                        // "this kind cleared the floor once". A zero-length line
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
                      className="absolute inset-y-0 rounded hover:bg-background/50 data-[state=open]:bg-background/50"
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
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {series.map((type) => (
          <TypeKey key={type} type={type} />
        ))}
      </div>
      <p className="text-muted-foreground text-xs">
        {t(
          "Only a month where at least {count} of a kind closed is drawn — a middle ticket out of six is one ticket wearing a statistic.",
          { count: CLOSURE_TREND_MIN_CLOSURES }
        )}
      </p>
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

  // ONE CACHE ENTRY PER QUESTION (`helpDashboardKey` carries every narrowing —
  // both filters AND the system, when there is one), so switching client does
  // not overwrite the unfiltered answer, one app's dashboard can never be served
  // another's, and switching back paints instantly from the cache —
  // CACHING.md's cache-first rule, applied to a picture instead of a list.
  const dashQ = useCached<TicketDashboard>(
    helpDashboardKey(teamId, accountId, helpType, appId ?? ""),
    () =>
      contentApi.helpDashboard({
        accountId: accountId || undefined,
        helpType: helpType || undefined,
        appId,
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

  return (
    <>
      {/* THE TOOLBAR (client ruling, 2026-09-06: "dashboard should also have
          toolbar / filter by client and type / no sort", and later the same day
          "on the dashboard, I'm missing the full toolbar, so go ahead and
          implement that" — which was this row's `actions` slot standing empty
          while every sibling ticket tab drew a create button in it).

          NO SEARCH BOX and NO SORT CONTROL, both recorded in the registry
          (`TOOLBAR_EXEMPT` and `TOOLBAR_SORT_EXEMPT`) rather than decided here:
          there is nothing on this tab to search through and no row order to
          offer, because there are no rows. Both filters are door PARAMETERS —
          they land in the cache key above and in the WHERE clause of every read
          behind it — which is the only shape that can work when every number on
          screen is a COUNT(*) somebody else took.

          `empty` is the WHOLE collection's count and never this tab's own
          answer (R50): the row must disappear for a team with no tickets, and
          must not disappear because somebody filtered to a quiet client. */}
      <ToolbarRow
        empty={ticketTotal === 0}
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
      {loading ? (
        <Skeleton className="h-64 w-full rounded-[var(--radius)]" />
      ) : ticketTotal === 0 ? (
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
      ) : (
        <div className="flex min-w-0 flex-col gap-4">
          <Panel
            title={t("The open work")}
            sub={t("Every open ticket, as one pipeline per kind down a shared set of stages.")}
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
            <Panel
              title={t("Raised as, then triaged as")}
              sub={t("What your morning is actually spent on.")}
            >
              <RaisedAsMatrix
                rows={data?.raisedVsCurrent ?? []}
                notRecorded={data?.raisedAsNotRecorded ?? 0}
                types={types}
                t={t}
              />
            </Panel>
          ) : (
            <div className="grid min-w-0 gap-4 lg:grid-cols-3">
              {/* 6A — the reading the client picked. See `AppsStackedByType` for
                  the two she did not, and for why swapping one in is a change at
                  this line rather than a rewrite of the panel. */}
              <Panel title={t("Which app")} sub={t("Open tickets against the thing you built.")}>
                <AppsStackedByType rows={data?.openByApp ?? []} types={types} t={t} />
              </Panel>
              <Panel
                title={t("Who has more")}
                sub={t("Open work by client, for the kinds that wait for a client to confirm.")}
              >
                <WhoHasMore rows={data?.byAccountAndType ?? []} types={types} t={t} />
              </Panel>
              <Panel
                title={t("Raised as, then triaged as")}
                sub={t("What your morning is actually spent on.")}
              >
                <RaisedAsMatrix
                  rows={data?.raisedVsCurrent ?? []}
                  notRecorded={data?.raisedAsNotRecorded ?? 0}
                  types={types}
                  t={t}
                />
              </Panel>
            </div>
          )}

          {/* NO SUBTITLE ANY MORE (client, 6 Sep 2026: "remove the subtitle
              'working days only.' It's not needed. We already know it."). The
              line said the weekend does not count towards a duration, and it
              came from the ruling that put `workingDaysSql` under both reads on
              this panel in the first place. ONLY THE SENTENCE IS GONE: every
              figure below is still counted Monday to Friday, by the one shared
              seam (`shared/business-days.ts`), which is where that promise
              actually lives — a caption is a description of the arithmetic, not
              the arithmetic, and she is telling us she already knows which one
              we used. */}
          <Panel title={t("How long a ticket takes to close")}>
            {/* `items-stretch` is the default and is what makes the trend
                beside the distribution the SAME HEIGHT as it (her words) — the
                trend's plot then claims whatever the taller column leaves,
                rather than being pinned to a number somebody typed. */}
            <div className="grid min-w-0 gap-6 lg:grid-cols-2">
              <div className="flex min-w-0 flex-col gap-2">
                <p className="text-muted-foreground text-xs uppercase">
                  {t("What it is now")}
                </p>
                <ClosureSpread rows={data?.closureDays ?? []} types={types} t={t} />
              </div>
              <div className="flex min-w-0 flex-col gap-2">
                <p className="text-muted-foreground text-xs uppercase">
                  {t("Which way it is going")}
                </p>
                <ClosureTrend rows={data?.closureTrend ?? []} t={t} />
              </div>
            </div>
          </Panel>
        </div>
      )}
    </>
  )
}
