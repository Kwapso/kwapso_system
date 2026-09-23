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

/** `donut.tsx`'s own `SEGMENT_COLOURS`, in the same order. RESTATED rather than
 * imported because the kit does not export it — the identical decision
 * `accounts-dashboard.tsx` made and wrote down, and `web/test/logs-dashboard.test.tsx`
 * reads BOTH files off disk and fails if they ever disagree. A colour key that
 * has drifted from its own ring is worse than no key. */
const DONUT_SEGMENT_COLOURS = [
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

/** ONE FIGURE — the kit's own stat register, by hand and deliberately NOT
 * through `<StatGrid>`, which is a number-and-label CARD by construction where
 * R97 is explicit that a count never gets one. The two type steps are
 * `stat-grid.tsx`'s own, verbatim, so a reader sees one treatment for "a
 * headline number" whether it arrived through the kit component or through this
 * tab — the identical borrowing `accounts-dashboard.tsx` documents.
 *
 * `note` is the half that file did not need: three of the four figures here
 * carry something the number alone would misrepresent (which way it moved, how
 * many people, and — the one that matters most — WHO the denominator is). */
function Figure({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-micro text-muted-foreground font-[var(--font-weight-medium)] uppercase">
        {label}
      </span>
      <span className="text-4xl font-[var(--font-weight-medium)] tabular-nums">{value}</span>
      {note ? <span className="text-muted-foreground text-xs">{note}</span> : null}
    </div>
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
                  style={{ background: DONUT_SEGMENT_COLOURS[i % DONUT_SEGMENT_COLOURS.length] }}
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

/** HOURS A WEEK, LAST EIGHT — the line that replaces the bar card this screen
 * used to draw above its timesheet (`HoursByWeekCard`, which stays on Home,
 * where it is the only picture of the week anybody has).
 *
 * Her ruling: "a line, hovering a point gives that week's hours and who logged
 * them." It is `ClosureTrend`'s arrangement, copied rather than re-invented — a
 * unit-square `viewBox` under `preserveAspectRatio="none"` with the strokes kept
 * honest by `vector-effect`, the weeks drawn as rules BEHIND the mark, and one
 * HTML hit area per week laid over the plot (an element hit area keeps its own
 * geometry where an SVG `<rect>` would be stretched with everything else).
 *
 * WHO LOGGED THEM comes off `people[].weekSeconds`, the door's own per-person
 * share of each of the same eight windows, so the names under a point and the
 * height of the point are one read of one grouping. That list is the top
 * `WORK_LOG_GROUP_CAP` people by hours (R14), which is why the card names the
 * people it has rather than claiming to be the whole week: the TOTAL above them
 * is the exact figure and is computed without the cap. */
function WeeksLine({
  weeks,
  people,
  lang,
  t,
}: {
  weeks: LogsDashboardData["weeks"]
  people: LogsDashboardData["people"]
  lang: Language
  t: T
}) {
  if (!weeks.some((w) => w.seconds > 0))
    return <p className="text-muted-foreground text-xs">{t("No time has been logged yet.")}</p>

  const top = Math.max(1, ...weeks.map((w) => w.seconds)) * 1.15
  const x = (i: number) => (weeks.length === 1 ? 50 : (i / (weeks.length - 1)) * 100)
  const y = (v: number) => 100 - (v / top) * 100
  const points = weeks.map((w, i) => `${x(i)},${y(w.seconds)}`)

  /** Who put time into week `i`, biggest first — the door already ordered
   * `people` by their whole-filter total, so this only drops the ones who
   * logged nothing that week rather than re-sorting anything. */
  const whoIn = (i: number) =>
    people.filter((p) => (p.weekSeconds[i] ?? 0) > 0).map((p) => ({ ...p, seconds: p.weekSeconds[i] ?? 0 }))

  const said = (i: number) =>
    [
      formatDayMonth(weeks[i]!.weekStart, lang),
      t("{count} h", { count: hours(weeks[i]!.seconds) }),
      ...whoIn(i).map((p) => `${staffNameFromSnapshot(p.userName)} ${t("{count} h", { count: hours(p.seconds) })}`),
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
          <polygon
            points={`${x(0)},100 ${points.join(" ")} ${x(weeks.length - 1)},100`}
            fill={INK}
            opacity={0.2}
          />
          <polyline
            data-slot="weeks-line"
            points={points.join(" ")}
            fill="none"
            stroke={INK}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {/* ONE HIT AREA PER WEEK, IN HTML, OVER THE PLOT. Each band runs from
            the midpoint of the gap before its week to the midpoint of the gap
            after it, so the area a pointer has to find is centred on the point
            it is about. `ClosureTrend`'s own shape and its own reasons. */}
        <div className="absolute inset-0">
          {weeks.map((w, i) => {
            const left = i === 0 ? 0 : (x(i - 1) + x(i)) / 2
            const right = i === weeks.length - 1 ? 100 : (x(i) + x(i + 1)) / 2
            const who = whoIn(i)
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
                  {who.length === 0 ? (
                    <p className="text-muted-foreground text-xs">{t("Nobody logged anything.")}</p>
                  ) : (
                    who.map((p) => (
                      <p key={p.userId} className="text-xs tabular-nums">
                        {staffNameFromSnapshot(p.userName)} · {t("{count} h", { count: hours(p.seconds) })}
                      </p>
                    ))
                  )}
                </HoverCardContent>
              </HoverCard>
            )
          })}
        </div>
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
      {/* THE FOUR FIGURES. A real grid so they line up on one baseline and each
          owns a column at every width; no card and no `<StatGrid>` (R97), the
          register borrowed from the kit and the box left behind. */}
      <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <div className="flex min-w-0 flex-col gap-3">
        <SectionTitle>{t("Where the hours went")}</SectionTitle>
        <WhereTheHoursWent rows={data.targets} t={t} />
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <SectionTitle>{t("Hours a week, the last eight")}</SectionTitle>
        <WeeksLine weeks={data.weeks} people={data.people} lang={lang} t={t} />
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
