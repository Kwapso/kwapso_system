"use client"

// THE LOGS DASHBOARD — Aurora's rulings, 23 Sep 2026, verbatim:
//
//   1. "tabs: dahsbaord, entries."
//   2. "kind of work is what its related to"
//   3. "implement everything you suggested for dashboard - exclude running now.
//      add toolbar w filters by person, account."
//
// The Logs module had a heading, one bar chart of the last eight weeks and a
// flat list of every entry. The DOOR has always computed far more than the
// screen asked for, and `work_logs.account_id` — written on every row since
// migration 0015, inherited from whatever the time was logged against, indexed
// — had never been drawn anywhere in the app at all. This tab is the first
// reader of it.
//
// ── WHAT IS NOT HERE ────────────────────────────────────────────────────────
//
// NO "RUNNING NOW" SECTION. She excluded it by name, and the header bar already
// carries every running timer on every screen (`timer-bar.tsx`), so a second
// copy on one tab would be the same fact in two places with two moments in it.
//
// NO FREE-TEXT `kind`. Her ruling settles what "kind of work" means, and then
// sharpens it the same day: "on logs this kind of work shoudl not be manual,
// but automatic to where it was created: if it was creted in a story its
// stories, in a ticket its a ticke, in a meeting its a meeting, etc". So it is
// the TYPE OF RECORD the time was logged against — `target_table`, which is NOT
// NULL on every row by construction — and nobody is asked to type one any more
// (the field is gone from the log form and the correction sheet; see
// `time-form-dialog.tsx`'s own note). The free-text column and every word
// already stored in it survive untouched; nothing here reads it and nothing
// here deletes it.
//
// ── THE SHAPE, BORROWED RATHER THAN INVENTED ────────────────────────────────
//
// `accounts-dashboard.tsx` is the established pattern for exactly this kind of
// tab in this app, and `tickets-dashboard.tsx` before it. This file follows the
// same three states (loading, error, nothing yet), the same plain surface
// (R67/R103 — no card around a grouping section), the same figure register
// borrowed from the kit's `StatGrid` with the BOX left behind (R97: a count
// never gets its own card), the same section eyebrow (R108) and the same HOVER
// LANGUAGE: a real `<button>` hit area, the kit's `HoverCard` on it (which
// opens on focus as well as on hover), and the whole readout repeated as the
// button's accessible name so what a screen reader hears and what a sighted
// reader sees can never be two different claims.
//
// TWO PALETTES, AND THE LINE BETWEEN THEM, the same split the accounts tab
// keeps: the donut takes the kit's data sequence (`--chart-1..5`) because its
// whole job is telling four things apart; every bar and the weekly line take
// ONE neutral ink, because a hue on a single series is a legend entry with
// nothing to distinguish.

import * as React from "react"

import { Card, CardContent } from "@shared/ui/components/card/card"
import { Donut } from "@shared/ui/components/donut/donut"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@shared/ui/components/hover-card/hover-card"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { StatGrid } from "@shared/ui/components/stat-grid/stat-grid"
import { Button } from "@shared/ui/components/button/button"
import { ShapeStateBody } from "@shared/ui/compositions/states/states"
import { useCached } from "@shared/web/store"
import { useT } from "@shared/web/language"
import { formatDayMonth } from "@shared/web/format"
import { RecordMark } from "@shared/web/record-mark"
import { RecordRef } from "@shared/web/record-ref"
import { staffNameFromSnapshot } from "@shared/staff-name"
import type { Language } from "@shared/i18n"
import type { LogsDashboard as LogsDashboardData } from "@shared/types"

import { content as contentApi } from "@/lib/api"
import type { LogQuery } from "@/lib/api/content"
import { logsDashboardKey } from "@/lib/live-resources"
import { WORK_LOG_TARGET_WORD } from "@/lib/collection-filters"

type T = (s: string, vars?: Record<string, string | number>) => string

/** THE ONE MARK ON EVERY SINGLE-SERIES PICTURE here — see this file's header
 * for why one neutral ink is the whole palette on a line or a bar rank, and why
 * the donut beside them is the one thing on this tab that takes data hues. */
const INK = "var(--ink-tertiary)"

/** THE DATA SEQUENCE, SERVING BOTH MARKS ON THIS TAB — the donut's legend dots
 * and the weekly chart's one line per person.
 *
 * `donut.tsx`'s own `SEGMENT_COLOURS`, in the same order. RESTATED rather than
 * imported because the kit does not export it — the identical decision
 * `accounts-dashboard.tsx` made and wrote down, and `web/test/logs-dashboard.test.tsx`
 * reads BOTH files off disk and fails if they ever disagree. A colour key that
 * has drifted from its own ring is worse than no key.
 *
 * ONE ARRAY RATHER THAN TWO, because two marks reading two copies of one
 * sequence is exactly the drift that check exists to catch, one file in. */
const SERIES_COLOURS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const

/** HOURS, THE UNIT THIS WHOLE TAB READS IN — never the `h:mm:ss` clock the
 * timer bar and a single row of time use. A clock is what a running timer is;
 * a dashboard is a set of totals, and "128.5" is a number somebody can compare
 * to the one beside it at a glance where "128:31:07" is not. One decimal,
 * because the shortest thing anybody logs is a few minutes and a whole-number
 * hour would round a morning's work to nothing. */
function hours(seconds: number): number {
  return Math.round((seconds / 3600) * 10) / 10
}

/** ONE FIGURE — THE EFFORT SECTION'S OWN TILE, PART FOR PART.
 *
 * Aurora's ruling, 24 Sep 2026, verbatim: "kpi need background". This used to
 * be a bare column — the kit's stat REGISTER borrowed with the BOX left behind,
 * which is what `accounts-dashboard.tsx` still draws. She has now asked for the
 * background, so the tile is the one this app already has rather than a second
 * one that nearly agrees with it: `<Card variant="default">` + `<CardContent>`
 * + `<StatGrid surface="bare">`, which is `effort-card.tsx`'s own three tiles
 * exactly (R107, and `PAPER_ON_PURPOSE`'s own entry for them).
 *
 * IT IS A FILL, NOT A STROKE. R67 as amended forbids separation drawn as a
 * stroke around a container, so "a background" can only mean a paper TONE, and
 * `Card variant="default"` is the kit's own soft paper. Nothing here draws a
 * border.
 *
 * R97 IS NOT BROKEN BY THIS, it is exercised. "A count never gets its own card,
 * UNLESS EXPLICITLY SAID" is her own wording, and this is the saying — the same
 * clause `COUNT_REGISTER_EXEMPT`'s `effort-card.tsx` entry already records for
 * the identical tiles, where she asked for them by name.
 *
 * NOT `.map()`-ED AT THE CALL SITE, and that is load-bearing rather than
 * stylistic: R65's census reads any kit `<Card>` carrying React's own `key=` as
 * a per-row RECORD card and requires a `<CardTitle>` a chip could sit above.
 * `effort-card.tsx` writes its three tiles out by hand for exactly this reason
 * and says so; this component keeps the `<Card>` inside itself, where no `key`
 * is ever spelled, and the four call sites below are four literal elements.
 *
 * `note` rides the kit's own `support` slot — `stat-grid.tsx`'s caption step,
 * one ink tier below the figure. Three of the four figures carry something the
 * number alone would misrepresent (which way it moved, how many people, and —
 * the one that matters most — WHO the denominator is), and inventing a third
 * type step for it would be a register this app does not have. */
function Figure({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card variant="default">
      <CardContent>
        <StatGrid items={[{ id: "figure", label, value, support: note }]} surface="bare" label={label} />
      </CardContent>
    </Card>
  )
}

/** R108's OWN EYEBROW, the same small-caps register every record section's
 * title already carries — spelled out here because this tab has no record to
 * stand on, but the class is theirs, verbatim, so one style means "a title over
 * a section" everywhere in the app. */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-micro text-muted-foreground uppercase">{children}</h3>
}

/** WHICH WAY THE WEEK MOVED — a sentence, never a coloured arrow. More hours
 * than last week is not good news and fewer is not bad news; it is a fact about
 * a workload, and a green/red pair would be this screen making a judgement
 * about somebody's week that nobody asked it to make.
 *
 * A week with nothing in it before it has no PERCENTAGE — dividing by zero is
 * "infinitely more", which is a true statement and a useless one — so it says
 * the plain thing instead. */
function weekChange(thisWeek: number, lastWeek: number, t: T): string {
  if (lastWeek === 0) return thisWeek === 0 ? t("Same as last week") : t("Nothing logged last week")
  const delta = Math.round(((thisWeek - lastWeek) / lastWeek) * 100)
  if (delta === 0) return t("Same as last week")
  return delta > 0
    ? t("{percent}% more than last week", { percent: delta })
    : t("{percent}% less than last week", { percent: Math.abs(delta) })
}

/** A HORIZONTAL BAR RANK — the shape "Who logged it" and "Whose work it was"
 * both take, so they are one component rather than two that drift.
 *
 * The bar is a plain div at a percentage width, not a chart library: one series,
 * one axis, no interaction beyond reading it. `role="list"` and one `listitem`
 * per row, because that is what it is.
 */
function BarRank({
  rows,
  label,
  t,
}: {
  rows: { id: string; name: React.ReactNode; said: string; seconds: number; mark?: React.ReactNode }[]
  label: string
  t: T
}) {
  const top = Math.max(1, ...rows.map((r) => r.seconds))
  return (
    <div role="list" aria-label={label} className="flex min-w-0 flex-col gap-2">
      {rows.map((r) => (
        <div key={r.id} role="listitem" aria-label={r.said} className="flex min-w-0 items-center gap-2">
          {r.mark ? <span className="shrink-0">{r.mark}</span> : null}
          <span className="min-w-0 flex-1 truncate text-sm">{r.name}</span>
          {/* THE BAR. `--radius-bar` is the kit's own bar radius and the one
              named 4px exception R31 leaves room for; the track is the app's
              own muted ground so the mark reads on both papers. */}
          <span aria-hidden="true" className="bg-muted h-2 w-24 shrink-0 overflow-hidden rounded-[var(--radius-bar)] sm:w-40">
            <span
              className="block h-full rounded-[var(--radius-bar)]"
              style={{ width: `${Math.max(2, (r.seconds / top) * 100)}%`, background: INK }}
            />
          </span>
          <span className="w-16 shrink-0 text-end text-sm tabular-nums">
            {t("{count} h", { count: hours(r.seconds) })}
          </span>
        </div>
      ))}
    </div>
  )
}

/** WHERE THE HOURS WENT — her ruling's own donut, by the RELATED RECORD TYPE.
 *
 * THE RING IS THE KIT'S OWN `Donut` and nothing here draws a second one. The
 * LEGEND is this file's, and that is the whole of the deviation — a REPORTED KIT
 * GAP, not a preference: `donut.tsx`'s own state table says "hover — none
 * drawn", there is no per-segment callback and the ring is rendered inside the
 * component, so a hover target cannot be handed in from outside. Her ruling asks
 * for exactly the affordance the kit declines to draw. So the ring comes from the
 * kit (`legend={false}`) and the legend is drawn here as real `<button>`s under
 * the kit's `HoverCard` — the same hover language the accounts tab already uses
 * rather than a third one invented here. When the kit's ring can carry a hover of
 * its own, this legend collapses back into `legend`/`showPercent`.
 *
 * AT REST THE PICTURE IS WHOLE — the ring, and every type's name and colour.
 * What HOVER adds is the VALUE: the hours in that slice and its share. Her own
 * words: "hours and share shown on hover, a legend at rest." */
function WhereTheHoursWent({ rows, t }: { rows: LogsDashboardData["targets"]; t: T }) {
  if (rows.length === 0)
    return <p className="text-muted-foreground text-xs">{t("No time has been logged yet.")}</p>

  const total = rows.reduce((sum, r) => sum + r.seconds, 0)
  const word = (table: string) => t(WORK_LOG_TARGET_WORD[table] ?? table)
  const shareOf = (s: number) => (total > 0 ? Math.round((s / total) * 100) : 0)
  const said = (table: string, seconds: number) =>
    `${word(table)} · ${t("{count} h, {percent}% of the time", { count: hours(seconds), percent: shareOf(seconds) })}`

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-[var(--space-4)]">
      <Donut
        data={rows.map((r) => ({ id: r.targetTable, label: word(r.targetTable), value: r.seconds }))}
        legend={false}
        size="8.5rem"
        label={t("Where the hours went")}
        summary={rows.map((r) => said(r.targetTable, r.seconds)).join(" · ")}
      />
      <div className="flex min-w-0 flex-col gap-1">
        {rows.map((r, i) => (
          <HoverCard key={r.targetTable} openDelay={60} closeDelay={60}>
            <HoverCardTrigger asChild>
              <button
                type="button"
                aria-label={said(r.targetTable, r.seconds)}
                data-slot="hours-slice"
                className="hover:bg-muted data-[state=open]:bg-muted flex min-w-0 items-center gap-2 rounded-[var(--radius-sm)] px-1 text-start text-xs"
              >
                <span
                  aria-hidden="true"
                  className="rounded-pill size-[0.5625rem] shrink-0"
                  style={{ background: SERIES_COLOURS[i % SERIES_COLOURS.length] }}
                />
                <span className="min-w-0 truncate">{word(r.targetTable)}</span>
              </button>
            </HoverCardTrigger>
            <HoverCardContent className="flex flex-col gap-1">
              <p className="text-sm">{word(r.targetTable)}</p>
              <p className="text-muted-foreground text-xs tabular-nums">
                {t("{count} h, {percent}% of the time", {
                  count: hours(r.seconds),
                  percent: shareOf(r.seconds),
                })}
              </p>
            </HoverCardContent>
          </HoverCard>
        ))}
      </div>
    </div>
  )
}

/** HOURS A WEEK, LAST EIGHT — the total as an AREA, with one LINE per person
 * over it. Aurora's ruling, 24 Sep 2026, verbatim: "HOURS A WEEK, show multiple
 * lines, one per staff and area for total."
 *
 * ── THE DATA IS ALREADY IN HAND, AND THAT IS NOT LUCK ──────────────────────
 *
 * The door hands back `people[].weekSeconds` — every person's own share of each
 * of the SAME eight windows the total is cut on — from ONE grouped read
 * (`GROUP BY w.user_id` with eight conditional sums, `logsDashboard`,
 * workers/content/src/lib/work-logs.ts). So a line per person costs nothing:
 * there is no second round trip, and emphatically no read per person in a loop,
 * which is the shape this would otherwise have taken. It was written that way
 * in the first place to give the hover its names; the ruling asks the same
 * grouping to be DRAWN rather than merely read out.
 *
 * ── THE CAP IS THE PALETTE'S, NOT A TASTE ─────────────────────────────────
 *
 * A line per head is readable at four and unreadable at fifteen, so there has to
 * be a ceiling, and the honest one is the number of colours this design system
 * can tell apart: FIVE (`--chart-1..5`). A sixth line would have to repeat a hue
 * — two people drawn identically, which is worse than not drawing one of them —
 * or invent one, which R32 forbids outright. So `DRAWN_LINES` is 5 because the
 * palette is 5, and it moves when the palette does.
 *
 * (The kit's own `chart.tsx` still warns in its header that `--chart-4` and
 * `--chart-5` "currently resolve to `--chart-1` and `--chart-2`". That comment
 * is STALE as of the pinned kit: `tokens.css` at v1.2.167 resolves them to
 * `--kw-lavender` #B1A3CF and `--kw-orange` #F7953E, both admitted 2026-09-02
 * and both distinct from the first three. Read the tokens, not the warning —
 * and the stale warning is reported upstream rather than worked around here.)
 *
 * ── AND NOBODY IS QUIETLY DROPPED ─────────────────────────────────────────
 *
 * A silent top-five would be a lie of omission: the picture would look like the
 * whole team. Two things stop it, and the first is structural rather than
 * editorial. THE AREA IS EVERYBODY — it is `weeks[]`, the door's own exact
 * total over every person, computed without the grouping cap — so a person who
 * gets no line of their own is still inside the shape their colleagues' lines
 * sit under. Then it is SAID, twice: the legend carries an "and N others" row,
 * and every week's hover card carries those others' hours for that week as its
 * own line. N comes from `activePeople`, the door's own exact count of distinct
 * people with time in these eight weeks, so it counts the people past the
 * grouped read's own `WORK_LOG_GROUP_CAP` too.
 *
 * WHO IS DRAWN is ranked by hours IN THE WINDOW (the sum of their eight
 * buckets), never by their all-time total, which is what `people` arrives
 * ordered by: a chart of the last eight weeks that drew the five biggest
 * all-time loggers could draw five flat lines at zero while the people who
 * actually worked these eight weeks went unnamed.
 *
 * The mechanics are `ClosureTrend`'s, unchanged: a unit-square `viewBox` under
 * `preserveAspectRatio="none"` with the strokes kept honest by `vector-effect`,
 * the weeks drawn as rules BEHIND the marks, and one HTML hit area per week laid
 * over the plot (an element hit area keeps its own geometry where an SVG `<rect>`
 * would be stretched with everything else). */
const DRAWN_LINES = 5

function WeeksLine({
  weeks,
  people,
  activePeople,
  lang,
  t,
}: {
  weeks: LogsDashboardData["weeks"]
  people: LogsDashboardData["people"]
  /** the door's own exact count of people with time in these eight weeks — the
   * denominator behind "and N others", see this component's own header. */
  activePeople: number
  lang: Language
  t: T
}) {
  if (!weeks.some((w) => w.seconds > 0))
    return <p className="text-muted-foreground text-xs">{t("No time has been logged yet.")}</p>

  // RANKED BY THE WINDOW, not by the all-time total the door ordered them by.
  // Anybody with nothing in these eight weeks is dropped before the cap is
  // applied, so a flat line at zero is never one of the five.
  const inWindow = people
    .map((p) => ({ ...p, windowSeconds: p.weekSeconds.reduce((n, sec) => n + sec, 0) }))
    .filter((p) => p.windowSeconds > 0)
    .sort((a, b) => b.windowSeconds - a.windowSeconds)
  const drawn = inWindow.slice(0, DRAWN_LINES)
  // EVERYONE NOT DRAWN, counted off the door's own exact figure rather than off
  // the capped array — `people` stops at WORK_LOG_GROUP_CAP, so its length is a
  // ceiling and would under-report on a big team.
  const others = Math.max(0, activePeople - drawn.length)

  // THE TOTAL IS THE CEILING OF THE PLOT, because every line sits inside it by
  // construction: one person's week can never exceed the week's own total.
  const top = Math.max(1, ...weeks.map((w) => w.seconds)) * 1.15
  const x = (i: number) => (weeks.length === 1 ? 50 : (i / (weeks.length - 1)) * 100)
  const y = (v: number) => 100 - (v / top) * 100
  const totalPoints = weeks.map((w, i) => `${x(i)},${y(w.seconds)}`)
  const linePoints = (p: { weekSeconds: number[] }) =>
    weeks.map((_, i) => `${x(i)},${y(p.weekSeconds[i] ?? 0)}`).join(" ")

  /** What the others put in, in week `i` — the total minus the drawn lines.
   * Exact whichever way the cap falls, because the total is exact. */
  const othersIn = (i: number) =>
    Math.max(0, (weeks[i]?.seconds ?? 0) - drawn.reduce((n, p) => n + (p.weekSeconds[i] ?? 0), 0))

  const said = (i: number) =>
    [
      formatDayMonth(weeks[i]!.weekStart, lang),
      t("{count} h", { count: hours(weeks[i]!.seconds) }),
      ...drawn
        .filter((p) => (p.weekSeconds[i] ?? 0) > 0)
        .map((p) => `${staffNameFromSnapshot(p.userName)} ${t("{count} h", { count: hours(p.weekSeconds[i] ?? 0) })}`),
      ...(others > 0 && othersIn(i) > 0
        ? [t("and {count} others", { count: others }) + ` ${t("{count} h", { count: hours(othersIn(i)) })}`]
        : []),
    ].join(" · ")

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="bg-muted relative h-40 min-w-0 overflow-hidden rounded-[var(--radius-sm)]">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          role="img"
          aria-label={t("Hours a week, the last eight")}
          className="absolute inset-0 block size-full"
        >
          {weeks.map((w, i) => (
            <line
              key={w.weekStart}
              data-slot="weeks-rule"
              x1={x(i)}
              y1={0}
              x2={x(i)}
              y2={100}
              stroke="var(--border)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {/* THE TOTAL, AS AN AREA — her word. It is everybody's hours, the
              door's own exact figure, and it is drawn FIRST so every line sits
              on top of it. One neutral ink and no stroke of its own: it is the
              ground the lines are read against, not a sixth series competing
              with them for a colour. */}
          <polygon
            data-slot="weeks-total-area"
            points={`${x(0)},100 ${totalPoints.join(" ")} ${x(weeks.length - 1)},100`}
            fill={INK}
            opacity={0.18}
          />
          {/* ONE LINE PER PERSON, in the data sequence's own order — the same
              five hues the donut's legend above reads, so a colour means one
              thing on this tab. */}
          {drawn.map((p, i) => (
            <polyline
              key={p.userId}
              data-slot="weeks-person-line"
              points={linePoints(p)}
              fill="none"
              stroke={SERIES_COLOURS[i % SERIES_COLOURS.length]}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        {/* ── ONE HIT AREA PER WEEK, IN HTML, OVER THE PLOT ────────────────
            Each band runs from the midpoint of the gap before its week to the
            midpoint of the gap after it, so the area a pointer has to find is
            centred on the point it is about. `ClosureTrend`'s own shape. */}
        <div className="absolute inset-0">
          {weeks.map((w, i) => {
            const left = i === 0 ? 0 : (x(i - 1) + x(i)) / 2
            const right = i === weeks.length - 1 ? 100 : (x(i) + x(i + 1)) / 2
            const mine = drawn.filter((p) => (p.weekSeconds[i] ?? 0) > 0)
            const rest = othersIn(i)
            return (
              <HoverCard key={w.weekStart} openDelay={60} closeDelay={60}>
                <HoverCardTrigger asChild>
                  <button
                    type="button"
                    aria-label={said(i)}
                    data-slot="weeks-point"
                    className="hover:bg-background/50 data-[state=open]:bg-background/50 absolute inset-y-0 rounded-[var(--radius-sm)]"
                    style={{ left: `${left}%`, width: `${right - left}%` }}
                  />
                </HoverCardTrigger>
                <HoverCardContent className="flex flex-col gap-1">
                  <p className="text-sm tabular-nums">{formatDayMonth(w.weekStart, lang)}</p>
                  <p className="text-muted-foreground text-xs tabular-nums">
                    {t("{count} h", { count: hours(w.seconds) })}
                  </p>
                  {mine.length === 0 && rest === 0 ? (
                    <p className="text-muted-foreground text-xs">{t("Nobody logged anything.")}</p>
                  ) : (
                    mine.map((p) => (
                      <p key={p.userId} className="flex items-center gap-1.5 text-xs tabular-nums">
                        <span
                          aria-hidden="true"
                          className="rounded-pill size-[0.5625rem] shrink-0"
                          style={{ background: SERIES_COLOURS[drawn.indexOf(p) % SERIES_COLOURS.length] }}
                        />
                        {staffNameFromSnapshot(p.userName)} · {t("{count} h", { count: hours(p.weekSeconds[i] ?? 0) })}
                      </p>
                    ))
                  )}
                  {/* THE OTHERS' OWN HOURS FOR THIS WEEK. Without this line the
                      card's per-person rows would not add up to the total above
                      them, which is a picture inviting somebody to do arithmetic
                      that comes out wrong. */}
                  {others > 0 && rest > 0 ? (
                    <p className="text-muted-foreground text-xs tabular-nums">
                      {t("and {count} others", { count: others })} ·{" "}
                      {t("{count} h", { count: hours(rest) })}
                    </p>
                  ) : null}
                </HoverCardContent>
              </HoverCard>
            )
          })}
        </div>
      </div>
      {/* THE KEY, AND THE ADMISSION BESIDE IT. A legend naming five people over
          a picture that covers twenty would be the lie the cap invites; the last
          row is what stops it, and it is drawn in the same register as the names
          rather than tucked into a footnote. */}
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1" data-slot="weeks-legend">
        {drawn.map((p, i) => (
          <span key={p.userId} className="flex min-w-0 items-center gap-1.5 text-xs">
            <span
              aria-hidden="true"
              className="rounded-pill size-[0.5625rem] shrink-0"
              style={{ background: SERIES_COLOURS[i % SERIES_COLOURS.length] }}
            />
            <span className="min-w-0 truncate">{staffNameFromSnapshot(p.userName)}</span>
          </span>
        ))}
        {others > 0 ? (
          <span className="text-muted-foreground text-xs" data-slot="weeks-others">
            {t("and {count} others, in the total but not drawn", { count: others })}
          </span>
        ) : null}
      </div>
      <div className="text-muted-foreground flex justify-between text-xs">
        <span>{formatDayMonth(weeks[0]!.weekStart, lang)}</span>
        {weeks.length > 1 ? <span>{formatDayMonth(weeks[weeks.length - 1]!.weekStart, lang)}</span> : null}
      </div>
    </div>
  )
}

/** WHAT ATE THE MOST — the records with the most hours against them, with the
 * reference and the title, biggest first.
 *
 * THE REFERENCE IS A `<RecordRef>` (R96: the id chip is black, through the one
 * shared register, never a hand-rolled badge). It is NULLABLE and often null on
 * purpose — a ref needs a client to quote it, so our own internal work has none
 * — and `RecordRef` draws nothing at all for an absent one, which is why the
 * title carries the row either way. */
function TopRecords({ rows, t }: { rows: LogsDashboardData["records"]; t: T }) {
  if (rows.length === 0)
    return <p className="text-muted-foreground text-xs">{t("No time has been logged yet.")}</p>
  return (
    <ul className="flex min-w-0 flex-col gap-2" aria-label={t("What ate the most")}>
      {rows.map((r) => (
        <li key={`${r.targetTable}:${r.targetId}`} className="flex min-w-0 items-center gap-2">
          <RecordRef value={r.targetRef} />
          <span className="min-w-0 flex-1 truncate text-sm">
            {r.targetLabel || t(WORK_LOG_TARGET_WORD[r.targetTable] ?? r.targetTable)}
          </span>
          <span className="text-muted-foreground shrink-0 text-xs">{t(WORK_LOG_TARGET_WORD[r.targetTable] ?? r.targetTable)}</span>
          <span className="w-16 shrink-0 text-end text-sm tabular-nums">
            {t("{count} h", { count: hours(r.seconds) })}
          </span>
        </li>
      ))}
    </ul>
  )
}

/** THE DASHBOARD TAB ITSELF.
 *
 * ONE door read, keyed by the toolbar's two filters (`logsDashboardKey`), so
 * every section on the tab is narrowed by the same sentence the Entries tab
 * beside it sends — her "they narrow every section on the tab, not just one".
 * The TOOLBAR is drawn by the screen above this component, not here: it is
 * shared with the Entries tab, and a filter row that belonged to one body could
 * not narrow the other.
 *
 * NO TOOLBAR OF ITS OWN and no search box, R48's named exception rather than an
 * oversight — there is nothing on this tab for a browser to sieve, the same
 * reasoning the tickets and accounts dashboards give for their own. */
export function LogsDashboard({
  teamId,
  lang,
  filter,
  faceOf,
}: {
  teamId: string
  lang: Language
  /** The toolbar's own two filters, exactly as the Entries tab sends them. */
  filter: { userId?: string; accountId?: string }
  /** A person's face, resolved by the screen above from the team's own members
   * cache — R35/R90: a record shown to be scanned carries its own face. Passed
   * in rather than read here because the screen already holds that cache for the
   * toolbar's own person filter (R56: one door, one key). */
  faceOf: (userId: string) => { picture: string | null; name: string | null }
}) {
  const t = useT()
  const query: LogQuery = { userId: filter.userId, accountId: filter.accountId }
  const dashQ = useCached<LogsDashboardData>(
    logsDashboardKey(teamId, filter.userId ?? "", filter.accountId ?? ""),
    () => contentApi.logsDashboard(query)
  )
  const data = dashQ.data

  // NO PAPER (R67/R103) — `variant="plain"`, the same register the accounts and
  // tickets dashboards draw their own error and empty states in, so the whole
  // dashboard family reads as one surface rather than one tab disagreeing.
  if (dashQ.error)
    return (
      <Card variant="plain" data-surface="plain">
        <CardContent>
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

  if (data === undefined) return <Skeleton className="h-48 w-full rounded-[var(--radius)]" />

  // NOTHING LOGGED AT ALL, under this filter: one sentence rather than six
  // pictures of nothing and a row of zeros. `recordsTouched` is the honest gate
  // — it counts distinct records over the whole filter, so it is zero exactly
  // when there is not one row of time to draw anything from.
  if (data.recordsTouched === 0)
    return (
      <Card variant="plain" data-surface="plain">
        <CardContent>
          <ShapeStateBody
            shape="collectionScreen"
            state="empty"
            copy={{
              emptyTitle: t("No time logged yet."),
              emptyDescription: t("Start a timer, or log an hour by hand, and the figures show here."),
            }}
          />
        </CardContent>
      </Card>
    )

  return (
    <div className="flex min-w-0 flex-col gap-6" data-slot="logs-dashboard">
      {/* THE FOUR FIGURES, EACH ON ITS OWN PAPER — her ruling, "kpi need
          background". The grid is `effort-card.tsx`'s own, part for part:
          `grid-cols-1` with `gap-[var(--space-4)]`, widening to a column each.
          Four rather than Effort's three, because there are four figures; the
          GAP and the TILE are the same, which is what "one treatment across
          both screens" means. Four literal `<Figure>` elements and no `.map()`
          — see `Figure`'s own note on R65. */}
      <div className="grid min-w-0 grid-cols-1 gap-[var(--space-4)] sm:grid-cols-2 lg:grid-cols-4">
        <Figure
          label={t("Hours this week")}
          value={String(hours(data.thisWeekSeconds))}
          note={weekChange(data.thisWeekSeconds, data.lastWeekSeconds, t)}
        />
        <Figure
          label={t("Hours today")}
          value={String(hours(data.todaySeconds))}
          note={t("{count} people", { count: data.todayPeople })}
        />
        {/* THE DENOMINATOR IS PRINTED, NOT IMPLIED. This door holds work logs;
            the team's roster lives in the global core database behind another
            worker, so "who logged nothing" can only honestly be answered over
            the people this door can see. The note says which people those are,
            every time, rather than letting the figure imply a roster. */}
        <Figure
          label={t("Logged nothing last week")}
          value={String(data.quietLastWeek)}
          note={t("of {count} who logged in the last eight weeks", { count: data.activePeople })}
        />
        <Figure label={t("Records worked on")} value={String(data.recordsTouched)} />
      </div>

      {/* TWO SECTIONS IN ONE ROW, HALF AND HALF — her ruling, verbatim: "put
          who logged it next to where they went 1/2 and 1/2". `lg:grid-cols-2`
          and one column below it, which is the SAME arrangement
          `accounts-dashboard.tsx` keeps for its own paired row (country beside
          industry) and `tickets-dashboard.tsx` before it: a stacking rule
          invented here would be a second opinion about a question those screens
          have already answered. The gap is this column's own `gap-6`, so a pair
          side by side is exactly as far apart as two sections stacked.

          THEY ARE THE SAME QUESTION ASKED TWO WAYS, which is why the pairing
          reads: where the hours went (by the kind of record) and who put them
          there. Both are a split of one total, and both are drawn against the
          same five-colour sequence. */}
      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-3">
          <SectionTitle>{t("Where the hours went")}</SectionTitle>
          <WhereTheHoursWent rows={data.targets} t={t} />
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <SectionTitle>{t("Who logged it")}</SectionTitle>
          {data.people.length === 0 ? (
            <p className="text-muted-foreground text-xs">{t("No time has been logged yet.")}</p>
          ) : (
            <BarRank
            label={t("Who logged it")}
            t={t}
            rows={data.people.map((p) => {
              const face = faceOf(p.userId)
              const name = staffNameFromSnapshot(p.userName) || face.name || t("Someone")
              return {
                id: p.userId,
                name,
                said: `${name} · ${t("{count} h", { count: hours(p.seconds) })}`,
                seconds: p.seconds,
                // R35/R90 — the photograph where the person has one, their own
                // initial where they do not. `RecordMark` does both.
                mark: <RecordMark picture={face.picture} name={name} shape="round" />,
              }
            })}
          />
          )}
        </div>
      </div>

      {/* HOURS A WEEK, ON ITS OWN ROW — a line chart is read left to right
          across the whole measure, so it is the one section on this tab that
          does not pair. */}
      <div className="flex min-w-0 flex-col gap-3">
        <SectionTitle>{t("Hours a week, the last eight")}</SectionTitle>
        <WeeksLine
          weeks={data.weeks}
          people={data.people}
          activePeople={data.activePeople}
          lang={lang}
          t={t}
        />
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <SectionTitle>{t("Whose work it was")}</SectionTitle>
        {data.accounts.length === 0 ? (
          <p className="text-muted-foreground text-xs">{t("No time has been logged yet.")}</p>
        ) : (
          <BarRank
            label={t("Whose work it was")}
            t={t}
            rows={data.accounts.map((a) => {
              // OUR OWN WORK IS A ROW, NEVER A DROPPED ONE. A log inherits its
              // client from whatever it was logged against, and our own admin
              // belongs to no client — so a null `accountId` is a real pile with
              // a real total, and a chart that quietly omitted it would be a
              // picture of the billable half presented as the whole.
              const name = a.accountId === null ? t("Our own work") : a.accountName || t("An account")
              return {
                id: a.accountId ?? "none",
                name,
                said: `${name} · ${t("{count} h", { count: hours(a.seconds) })}`,
                seconds: a.seconds,
                mark:
                  a.accountId === null ? undefined : (
                    <RecordMark picture={null} name={a.accountName} shape="square" />
                  ),
              }
            })}
          />
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <SectionTitle>{t("What ate the most")}</SectionTitle>
        <TopRecords rows={data.records} t={t} />
      </div>
    </div>
  )
}
