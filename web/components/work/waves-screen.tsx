"use client"

// WAVES — the sidebar page: every package a client bought.
//
// A WAVE IS WHAT A CLIENT BOUGHT: a package of sprints. The owner's example is
// the whole definition — "Alex sells Hogo a package — he maps their processes,
// builds two automations, they test it, he trains them. Three weeks later he
// sells a second, identical package." Two waves, told apart by their name and
// their dates.
//
// WHAT A ROW SAYS, AND WHAT IT DELIBERATELY DOES NOT. Whose it is, what it is
// called, when it runs and how many sprints are in it. No price: the owner ruled
// the money out of the first version, and there is no price column on the table
// for a row to read. No kind either — "a wave is a wave".
//
// THE DATES ARE THE SPRINTS' ANSWER. They are stored on the row and recalculated
// by the door whenever a sprint is added, moved or removed, so this screen reads
// them like any other column rather than working them out — which is what keeps
// a list of forty waves one round trip instead of eighty.
//
// Host-composed rather than a recipe, for the same reason the client's own
// organisation panel is: a row here pairs a date range with a count and an
// inline switch-off, and no engine block draws that.

import * as React from "react"
import { cn } from "@shared/ui/lib/utils"
import { useRemembered } from "@shared/web/remembered"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@shared/ui/components/alert-dialog/alert-dialog"
import { Badge, type BadgeDot } from "@shared/ui/components/badge/badge"
import { Button } from "@shared/ui/components/button/button"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { toast } from "@shared/ui/components/sonner/sonner"
import { Calendar as CalendarIcon, ChartBarHorizontal, ListBullets } from "@shared/ui/foundations/icons"
import type { CollectionViewOption } from "@shared/ui/components/collection-frame/view-switch"
import { ShapeStateBody } from "@shared/ui/compositions/states/states"

import { CollectionHeading } from "@/components/records/collection-heading"
import { CountedAbove } from "@/components/records/counted-tabs"
import { RecordTimeline, type TimelineRow, type TimelineSegment } from "@/components/records/record-timeline"
import { RecordCalendar, type CalendarEntry } from "@/components/records/record-calendar"
import { RecordTable, type TableColumn } from "@/components/records/record-table"
import { defaultCollectionConfig, type CollectionConfig } from "@shared/web/screen-engine/config"
import {
  EMPTY_WAVE_QUERY,
  type WaveOrder,
  type WaveView,
  WaveFinder,
  selectWaves,
  waveQueryIsActive,
  type WaveQuery,
} from "@/components/work/wave-finder"
import { AddButton, CollectionCard } from "@/components/deep-link/screen-bits"
import { CollectionEmptyState } from "@shared/web/screen-engine/collection-frame"
import { renderFolderTabs, defaultTabsConfig } from "@shared/web/screen-engine/tabs-view"
import { WaveFormDialog } from "@/components/work/wave-form-dialog"
import { useSprintTypes } from "@/components/work/sprint-form-dialog"
import { AppMark } from "@/components/apps/app-tiles"
import { SprintTypeGlyph } from "@/lib/sprint-type-icon"
import { ApiFailure, tenancy } from "@/lib/api"
import { waves as wavesApi, wavesKey } from "@/lib/api/waves"
import { companiesKey, totalKey, sprintsKey, appsKey, listFetch } from "@/lib/live-resources"
import { softNavigate } from "@/lib/nav"
import { usePermissions } from "@/lib/perms"
import type { Account, AppRow, Sprint } from "@shared/types"
import type { Wave } from "@shared/waves"
import { sprintState } from "@shared/sprint-state"
import { formatDate, formatDayMonth } from "@shared/web/format"
import { formatCount } from "@shared/web/format-count"
import { RecordMark } from "@shared/web/record-mark"
import { invalidate, primeCache, useCached, useCachedValue } from "@shared/web/store"
import { useLanguage } from "@shared/web/language"
import type { Language } from "@shared/i18n"

/** WHEN A PACKAGE RUNS, from the two dates the door derived — or the sentence
 * that says nobody has planned it yet, which is an ordinary state and not a gap:
 * "Alex sells the wave, sprints get planned afterwards." */
export function waveDates(
  wave: { startsOn: string | null; endsOn: string | null },
  t: (s: string) => string,
  lang: Language
): string {
  if (wave.startsOn && wave.endsOn) return `${formatDate(wave.startsOn, lang)} → ${formatDate(wave.endsOn, lang)}`
  return formatDate(wave.startsOn, lang) || formatDate(wave.endsOn, lang) || t("No sprints planned yet")
}

/* ============================================================================
   T3 TIMELINE — the client's ruling, 2026-09-15 ("for waves i choose t3"):
   one bar per WAVE, segmented by the sprints inside it, on a week-gridded
   axis around today, prev/next/today like `RecordCalendar`. See
   `record-timeline.tsx`'s own header for why this reads through a bespoke
   host rather than the kit's `Gantt`.
   ========================================================================= */

/** Thirteen weeks in view at once — roughly a Sep–Nov quarter, the artifact's
 * own reference window — never stepped down to six the way the kit's own
 * `Gantt` ceiling would (that law is `Gantt`'s, not this bespoke grid's). */
const TIMELINE_WEEKS = 13
/** One page of the prev/next stepper — four weeks, a month at a time. */
const TIMELINE_STEP_WEEKS = 4

/** The Monday of the week `d` falls in, at local midnight. Weeks are drawn
 * Monday-first, the same convention `RecordWeek`'s own Mon–Fri board uses. */
function mondayOf(d: Date): Date {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff)
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

/** Local `YYYY-MM-DD`, the same shape every stored date column already has —
 * built from local parts, never `toISOString()` (UTC), for the identical
 * reason `record-calendar.tsx`'s own `dayKey` is. */
function isoDay(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Which week-column (against `windowStart`) a stored date falls in — may
 * land outside `[0, count)`, which the caller clips. */
function weekOf(iso: string, windowStart: Date): number {
  const d = new Date(iso.slice(0, 10))
  return Math.floor((d.getTime() - windowStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
}

export type WaveWeekWindow = {
  /** the thirteen week-start dates, ISO */
  weekStarts: string[]
  /** already formatted for the head row ("1 Sep") */
  weeks: string[]
  /** the column "today" sits in, or undefined when today is outside the window */
  todayIndex?: number
  windowLabel: string
}

/** The visible thirteen-week window, `offset` weeks from the default (which
 * opens two weeks behind today, so the axis reads as "recent past → most of
 * a quarter ahead" — the same "today near the front, not centred" shape
 * `Gantt`'s own CH27.26 draws, minus the stepping-by-six-only ceiling). */
export function waveWeekWindow(offset: number, t: (s: string) => string, lang: Language): WaveWeekWindow {
  const today = new Date()
  const base = addDays(mondayOf(today), -14 + offset * 7)
  const todayIso = isoDay(today)
  const weekStarts: string[] = []
  const weeks: string[] = []
  let todayIndex: number | undefined
  for (let i = 0; i < TIMELINE_WEEKS; i++) {
    const start = addDays(base, i * 7)
    const iso = isoDay(start)
    weekStarts.push(iso)
    weeks.push(formatDayMonth(iso, lang))
    if (todayIso >= iso && todayIso < isoDay(addDays(start, 7))) todayIndex = i
  }
  const windowLabel =
    weeks.length > 0
      ? `${weeks[0]} – ${weeks[weeks.length - 1]}`
      : t("This week")
  return { weekStarts, weeks, todayIndex, windowLabel }
}

/**
 * ONE ROW PER WAVE, its bar cut into its own sprints in date order — gaps
 * between two sprints (or before the first / after the last) drawn as the
 * wave's own base bar (`tone: "gap"`), a sprint segment toned by
 * `sprintState` (the SAME three-state derivation the Sprints tab and the
 * Sprints screen already read, imported rather than re-derived) and clicking
 * it opens `/waves/<id>/sprints/<sprintId>`; clicking the row's own name
 * opens the wave.
 *
 * A WAVE WITH NO DATES (no sprint has ever been planned into it —
 * `waveDates`'s own header) cannot sit on an axis of time and is left off the
 * grid entirely, same as before — it is still on List, which is where it
 * belongs. A wave that DOES carry dates (so it has, or once had, a sprint)
 * but for which this window's own sprint read turned up none is drawn as one
 * plain, unclickable `gap`-toned bar across its own range — the client's own
 * words for the case, "a wave with no sprints is a plain bar".
 *
 * THE LEFT COLUMN IS THE WAVE'S APP, NOT THE WAVE — client ruling, 16 Sep
 * 2026: "what I want in the left column is the name of the app and the
 * icon," and, corrected the same day, over the DERIVED answer this row first
 * shipped with: "No, now you have the name of the wave. I want the name of
 * the app." `Wave.appId` (team migration 0099, `shared/waves.ts`) is now a
 * REAL COLUMN, settable on the wave form, so this row reads it directly
 * rather than guessing from the sprints inside — `waveApp` below is a plain
 * lookup against the already-loaded `apps` list (for a live app's own logo),
 * falling back to the wave's own denormalised `appName`/`appLogoUrl`
 * (`toWave`, workers/tenancy/src/lib/waves.ts) when the app is not in that
 * list — deactivated, say, but still named on the wave. Where `appId` is
 * unset the row falls back to exactly what it drew before this ruling: its
 * own name, on the initials tile ("A wave without an app shows the wave name
 * with the initials tile" — this brief's own words for the fallback).
 *
 * THE WAVE'S OWN NAME MOVES TO A SECOND LINE, always, rather than onto the
 * bar itself: see `TimelineRow.sublabel`'s own header
 * (record-timeline.tsx) for why a fixed second line was chosen over a
 * squeeze-dependent label on the bar.
 */
function waveApp(w: Wave, appsById: Map<string, AppRow>): AppRow | null {
  if (!w.appId) return null
  const full = appsById.get(w.appId)
  if (full) return full
  // THE APP IS NOT IN THE LOADED (LIVE) LIST — deactivated, most likely —
  // but the wave still names it. A synthetic, `AppMark`-shaped stand-in built
  // from the wave's own denormalised fields (`toWave`, workers/tenancy/src/
  // lib/waves.ts): `AppMark` reads only `logoUrl`, `stage` and `name` off
  // whatever it is handed, so the fields this repo cannot know here
  // (`stage`, notably) are `null` rather than guessed at — `AppMark` falls
  // back to the plain initials tile exactly as it does for any other app
  // with no stage.
  return w.appName
    ? ({ id: w.appId, name: w.appName, logoUrl: w.appLogoUrl, stage: null } as AppRow)
    : null
}

export function buildWaveTimelineRows(
  rows: Wave[],
  sprints: Sprint[],
  window_: WaveWeekWindow,
  basePath: string,
  lang: Language,
  apps: AppRow[] = []
): TimelineRow[] {
  const windowStart = new Date(window_.weekStarts[0] ?? isoDay(new Date()))
  const count = window_.weeks.length
  const today = isoDay(new Date())
  const byWave = new Map<string, Sprint[]>()
  for (const s of sprints) {
    if (!s.waveId || !s.startsOn || !s.endsOn) continue
    const list = byWave.get(s.waveId)
    if (list) list.push(s)
    else byWave.set(s.waveId, [s])
  }
  const appsById = new Map(apps.map((a) => [a.id, a]))

  const timelineRows: TimelineRow[] = []
  for (const w of rows) {
    if (!w.startsOn || !w.endsOn) continue
    // Captured once, as plain `string`s — a property access narrowed by the
    // guard above does not reliably survive the nested loop below, where a
    // fresh read of `w.endsOn` would be `string | null` again.
    const waveStart = w.startsOn
    const waveEnd = w.endsOn
    const sortedSprints = (byWave.get(w.id) ?? []).slice().sort((a, b) => (a.startsOn ?? "").localeCompare(b.startsOn ?? ""))

    // ONE RANGE PER SEGMENT (a sprint, or the gap before/after/between two),
    // built in date order, before any of it touches a week column.
    const ranges: { from: string; to: string; sprint: Sprint | null }[] = []
    let cursor = waveStart
    for (const s of sortedSprints) {
      if (s.startsOn! > cursor) ranges.push({ from: cursor, to: s.startsOn!, sprint: null })
      ranges.push({ from: s.startsOn!, to: s.endsOn!, sprint: s })
      if (s.endsOn! > cursor) cursor = s.endsOn!
    }
    if (cursor < waveEnd) ranges.push({ from: cursor, to: waveEnd, sprint: null })
    // THE DEFENSIVE FALLBACK — dated, but this window's own sprint read found
    // none for it (see this function's own header).
    if (ranges.length === 0) ranges.push({ from: waveStart, to: waveEnd, sprint: null })

    const segments: TimelineSegment[] = []
    for (const r of ranges) {
      const start = weekOf(r.from, windowStart)
      const end = weekOf(r.to, windowStart)
      if (end < 0 || start >= count) continue
      const clippedStart = Math.max(0, start)
      const clippedSpan = Math.min(count, end + 1) - clippedStart
      if (clippedSpan < 1) continue
      if (r.sprint) {
        segments.push({
          id: r.sprint.id,
          // THE TYPE'S ICON, BEFORE THE NAME — no colour of its own (client
          // ruling, 16 Sep 2026: "they will not have colors, but icons"); the
          // segment's own fill is the sprint's STATE (upcoming/running/
          // wrapped), a different axis this icon does not touch.
          label: (
            <span className="flex min-w-0 items-center gap-1">
              <SprintTypeGlyph type={r.sprint.sprintType} className="shrink-0" />
              <span className="min-w-0 truncate">{r.sprint.name}</span>
            </span>
          ),
          start: clippedStart,
          span: clippedSpan,
          tone: sprintState(r.sprint, today),
          title: `${r.sprint.name}${r.sprint.sprintType ? ` · ${r.sprint.sprintType}` : ""} · ${formatDate(r.sprint.startsOn, lang)} – ${formatDate(r.sprint.endsOn, lang)}`,
          onSelect: () => softNavigate(`${basePath}/${w.id}/sprints/${r.sprint!.id}`),
        })
      } else {
        segments.push({
          id: `${w.id}:gap:${r.from}`,
          label: "",
          start: clippedStart,
          span: clippedSpan,
          tone: "gap",
        })
      }
    }
    if (segments.length === 0) continue
    const app = waveApp(w, appsById)
    timelineRows.push({
      id: w.id,
      label: app ? (
        <span className="flex min-w-0 items-center gap-1.5">
          <AppMark app={app} size="choice" />
          <span className="min-w-0 truncate">{app.name}</span>
        </span>
      ) : (
        <span className="flex min-w-0 items-center gap-1.5">
          <RecordMark picture={null} name={w.name} size="choice" />
          <span className="min-w-0 truncate">{w.name}</span>
        </span>
      ),
      // The wave's own name, only where the top line stopped being it (an app
      // was found) — the fallback already IS the wave's name, and a second
      // copy of it right below would be the row talking to itself.
      sublabel: app ? w.name : undefined,
      segments,
      onSelectLabel: () => softNavigate(`${basePath}/${w.id}`),
    })
  }
  return timelineRows
}

/* ============================================================================
   CALENDAR — waves and sprints as spans through `RecordCalendar`, the app's
   one door into the kit's month grid. S2 "start-and-end caps" (client ruling
   16 Sep 2026) replaces the start-day-chip-only shape this section used to
   draw: a wave with `endsOn` now hands `endDay` too, so `record-calendar.tsx`'s
   `expandEntry` walks its own days and caps both ends — a package that runs
   three weeks reads as three weeks on the grid, not as one chip on the day it
   was sold. A sprint does the same INSIDE its own wave's month: its `endDay`
   is its own `endsOn`, never clipped to the wave's — S2 draws whatever range
   it is handed, one span per record, and two overlapping spans (a sprint
   inside its wave) already stack for free (`calendar-view.tsx`'s own header).
   ========================================================================= */

export function buildWaveCalendarEntries(
  rows: Wave[],
  sprints: Sprint[],
  t: (s: string) => string
): CalendarEntry[] {
  const waveIds = new Set(rows.map((w) => w.id))
  const entries: CalendarEntry[] = []
  for (const w of rows) {
    if (!w.startsOn) continue
    entries.push({
      id: `w:${w.id}`,
      day: w.startsOn.slice(0, 10),
      endDay: w.endsOn ? w.endsOn.slice(0, 10) : undefined,
      title: w.name,
      // THE HOVER CARD'S OWN KIND LINE (kit v1.2.94's `renderEventCard`,
      // client ruling 16 Sep 2026: "when I hover over the card in the
      // calendar, it expands and I see what it is?").
      kind: t("Wave"),
      detail: w.accountName ?? undefined,
      accent: w.id,
    })
  }
  for (const s of sprints) {
    if (!s.waveId || !waveIds.has(s.waveId) || !s.startsOn) continue
    entries.push({
      id: `s:${s.waveId}:${s.id}`,
      day: s.startsOn.slice(0, 10),
      endDay: s.endsOn ? s.endsOn.slice(0, 10) : undefined,
      title: s.name,
      kind: t("Sprint"),
      detail: s.waveName ?? undefined,
      // The SAME hash as the wave's own entry above — a sprint's chip lands
      // in its wave's own colour, for free, off the identical `accentClass`
      // hash `record-calendar.tsx` already keys every chip by.
      accent: s.waveId,
    })
  }
  return entries
}

/* ============================================================================
   LIST — R80's shape, through `RecordTable`. Wave · Account · Sprints (count
   + state dots) · Start · End · State.
   ========================================================================= */

/** ONE ROW, shaped for `RecordTable` — a `render`-per-cell only ever sees its
 * OWN field (`row[key]`, never a sibling), so a composite cell (Account's
 * mark + name, Sprints' count + dots) is built once here, at the moment this
 * row also has the wave, the account and its own matched sprints in hand,
 * rather than reconstructed inside a column's `render`. */
type WaveListRow = {
  id: string
  ref: string | null
  name: string
  // ACCOUNT CARRIES THE APP TOO, AS A MUTED SECOND LINE — R82's own fix
  // (`table-column-budget`). The App fact (client ruling, 16 Sep 2026: "I
  // want the name of the app") used to be its own, eighth-turned-seventh
  // column; a table row's ceiling is six (UI-RULEBOOK N1, "the fifth fact
  // moves to a second line … it does not get squeezed onto the end"), and
  // this collection was already at six before it landed. So the app rides
  // the SAME cell the account does, on its own line, the identical
  // primary-plus-muted-subline shape `record-timeline.tsx`'s own
  // `TimelineRow.sublabel` already draws one column along — never a
  // seventh column.
  account: React.ReactNode
  accountName: string
  sprints: React.ReactNode
  state: React.ReactNode
  start: React.ReactNode
  end: React.ReactNode
  // An index signature — `RecordTable<T extends TableRowData>` constrains T
  // to `Record<string, unknown>`, which a plain object type only satisfies
  // structurally with one of these.
  [key: string]: unknown
}

const SPRINT_DOT_TONE: Record<ReturnType<typeof sprintState>, string> = {
  upcoming: "bg-chart-1",
  running: "bg-surface-inverse",
  wrapped: "bg-chart-2",
}

/** THE WAVE'S OWN TEMPORAL STATE — client ruling, 16 Sep 2026: "on waves, all
 * list: make status a colored pill." A wave has no status WORD of its own
 * (`shared/waves.ts` — "a wave is a wave", no kind and, by the same
 * reasoning, no separate status column): what List used to show was only the
 * `active`/`deactivated` fact. This reads the SAME three-part axis the T3
 * timeline already draws the wave's own bar against — planned (has not
 * started), running (started, not yet over) or done (its own end date has
 * passed) — off the wave's OWN `startsOn`/`endsOn`, the earliest/latest of
 * its live sprints (`recalcWaveDates`, workers/tenancy/src/lib/waves.ts).
 *
 * NOT `sprintState` ITSELF: that function has no "done" at all by design —
 * an overrunning sprint stays "running" until somebody closes it, because a
 * SPRINT is closed by a hand on its own record. A wave is never closed by
 * hand (there is no such act); the honest reading of "is this package still
 * running" is whether its own end date, the latest date any sprint in it
 * carries, has passed — so this is its own function, over the same three
 * words, rather than a call into one built to answer a different question. */
export type WaveDisplayState = "planned" | "running" | "done"

export function waveState(w: { startsOn: string | null; endsOn: string | null }, today: string): WaveDisplayState {
  if (!w.startsOn || w.startsOn > today) return "planned"
  if (w.endsOn && w.endsOn < today) return "done"
  return "running"
}

/** THE SAME NEUTRAL PILL FOR EVERY STATE — `variant="status"`'s own law
 * ("neutral fill, charcoal label, the state lives in the dot"), so only the
 * DOT differs; `planned`/`running`/`done` reuse the identical three tones
 * `sprint-detail.tsx` already draws for a sprint's own status pill
 * (`{sprint.completedAt ? "shipped" : sprint.active ? "building" : "archived"}`),
 * word for word: not-yet-started reads as the kit's "review" tone (the
 * portal's own "awaiting" pill wears it too), live reads `building`, and
 * done reads `shipped` — the same tone an app's own "Completed" stage wears.
 * A switched-off wave never reaches this map at all: it draws `archived`
 * directly, the tone every other deactivated record in the app wears. */
const WAVE_STATE_DOT: Record<WaveDisplayState, BadgeDot> = {
  planned: "review",
  running: "building",
  done: "shipped",
}

function waveStateLabel(state: WaveDisplayState, t: (s: string) => string): string {
  if (state === "done") return t("Done")
  if (state === "running") return t("Running")
  return t("Planned")
}

export function waveListRows(
  rows: Wave[],
  sprints: Sprint[],
  t: (s: string) => string,
  lang: Language,
  apps: AppRow[] = []
): WaveListRow[] {
  const today = isoDay(new Date())
  const byWave = new Map<string, Sprint[]>()
  for (const s of sprints) {
    if (!s.waveId) continue
    const list = byWave.get(s.waveId)
    if (list) list.push(s)
    else byWave.set(s.waveId, [s])
  }
  const appsById = new Map(apps.map((a) => [a.id, a]))
  return rows.map((w) => {
    const ws = byWave.get(w.id) ?? []
    const app = waveApp(w, appsById)
    return {
      id: w.id,
      ref: w.ref,
      name: w.name,
      accountName: w.accountName ?? "",
      // THE APP RIDES THIS CELL'S SECOND LINE — client ruling, 16 Sep 2026:
      // "I want the name of the app." Same `waveApp` lookup the T3 timeline
      // draws its own left column from (`w.appId`, team migration 0099), so
      // List and Timeline can never name a different app for the same wave.
      // Blank is ordinary — a wave sold before anybody named the system it
      // covers — and draws no second line at all rather than an em dash
      // nobody asked for (R82: a fact that is not there does not reserve
      // the row's height either).
      account: (
        // flex-wrap on the top line — harmless here (mark + name, two
        // children) and keeps this span out of the wrapped-rows census's own
        // false-positive shape: the census reads by source PROXIMITY, not by
        // React tree, and this cell sits textually close to the `state`
        // cell's own `<Badge>` a few lines below in this same row-shaping
        // function.
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            <RecordMark picture={null} name={w.accountName ?? ""} size="choice" />
            <span className="min-w-0 truncate">{w.accountName ?? "—"}</span>
          </span>
          {app ? (
            <span className="text-muted-foreground flex min-w-0 flex-wrap items-center gap-1 text-xs">
              <AppMark app={app} size="choice" />
              <span className="min-w-0 truncate">{app.name}</span>
            </span>
          ) : null}
        </span>
      ),
      sprints: (
        <span className="flex items-center gap-2">
          <span className="tabular-nums">{w.sprintCount}</span>
          {ws.length > 0 ? (
            <span className="flex items-center gap-1">
              {ws.slice(0, 5).map((s) => (
                <span
                  key={s.id}
                  aria-hidden="true"
                  className={cn("size-1.5 rounded-pill", SPRINT_DOT_TONE[sprintState(s, today)])}
                />
              ))}
            </span>
          ) : null}
        </span>
      ),
      start: formatDate(w.startsOn, lang) || "—",
      end: formatDate(w.endsOn, lang) || "—",
      // A COLOURED PILL, ALWAYS — client, 16 Sep 2026: "make status a
      // colored pill." Deactivated wins over the temporal read (a wave that
      // ran to its own end date and was then switched off is switched off,
      // not "done" — the same order every other record's status/active pair
      // resolves in this app).
      state: w.active ? (
        <Badge variant="status" dot={WAVE_STATE_DOT[waveState(w, today)]}>
          {waveStateLabel(waveState(w, today), t)}
        </Badge>
      ) : (
        <Badge variant="status" dot="archived">
          {t("Switched off")}
        </Badge>
      ),
    }
  })
}

/** SIX COLUMNS, HER EXACT ORDER (client ruling, 17 Sep 2026: "Please also add
 * the end date.") — Wave · Status · Sprints · Start · End · Account, within
 * R82's own six-column ceiling (`table-column-budget`, UI-RULEBOOK N1: "at
 * most … six in a table row … it does not get squeezed onto the end"). The
 * App fact still lives inside the Account cell's own second line (`waveListRows`
 * above) rather than claiming a column of its own — the eighth-turned-seventh
 * column from 16 Sep 2026's ruling that almost grew here, which is exactly the
 * shape R82 now catches before it ships again. */
export function waveListColumns(t: (s: string) => string): TableColumn[] {
  return [
    { key: "name", label: t("Wave") },
    // "Status", not "State" — the word every other column header in this app
    // already uses for the identical fact (accounts-screen.tsx,
    // task-detail.tsx, wave-finder.tsx's own filter facet), already fully
    // translated. R34's own argument: a word already means this, so this
    // column does not invent a second one for it.
    { key: "state", label: t("Status") },
    { key: "sprints", label: t("Sprints") },
    { key: "start", label: t("Start") },
    { key: "end", label: t("End") },
    { key: "account", label: t("Account"), searchKey: "accountName" },
  ]
}

/** Page one of the team's waves, priming the exact server total the heading
 * badges (R16). One fetcher, so the badge and the rows always came from the same
 * round trip. */
function fetchWaves(teamId: string): Promise<Wave[]> {
  return wavesApi.list().then((r) => {
    primeCache(totalKey("waves", teamId), r.total)
    return r.waves
  })
}

/**
 * THE WAVES COLLECTION, wherever it is drawn.
 *
 * The sidebar page and the client's own record show the SAME list with the same
 * search, the same sort and the same actions; the only difference is whether the
 * client is already decided. So it is one component with one optional argument,
 * rather than two lists that agree until somebody edits one of them.
 */
export function WaveCollection({
  teamId,
  basePath,
  accountId,
}: {
  teamId: string
  /** the waves list in the URL form we arrived through (/waves or /t/<team>/waves) */
  basePath: string
  /** set on a client's own record: the list is that client's, and the client
   * filter is not offered because it has already been answered */
  accountId?: string
}) {
  const { t, lang } = useLanguage()
  const { can } = usePermissions(teamId)
  // A wave is a package of SPRINTS, so it is the work engine's module — the same
  // right that lets somebody start a sprint. The doors gate; this only decides
  // what to draw, so a control we hide is never the defence.
  const canCreate = can("work", "create")
  const canEdit = can("work", "update")

  const wavesQ = useCached<Wave[]>(wavesKey(teamId), () => fetchWaves(teamId))
  // The exact server total (R16) — never the loaded page's length.
  const total = useCachedValue<number>(totalKey("waves", teamId))
  // COMPANIES ONLY, and ALL of them. A wave is sold to a company, so the
  // people on the spine do not belong in this picker — and the paged accounts
  // list's page one cannot be trusted to hold every company (it is where
  // Confia went missing, 25 Aug 2026). The door answers the narrow question
  // itself, and the accounts registry entry keeps this key live.
  const clientsQ = useCached<Account[]>(companiesKey(teamId), () =>
    tenancy.accounts({ type: "entity" }).then((r) => r.accounts)
  )
  // EVERY SPRINT ON THE TEAM, the same bounded cache `wave-detail.tsx` reads
  // for its own Sprints tab — the T3 timeline, the Calendar and the List's
  // own sprint-state dots all read the wave's OWN sprints out of this one
  // round trip rather than three narrower fetches.
  const sprintsQ = useCached<Sprint[]>(sprintsKey(teamId), () => listFetch.sprints(teamId))
  // EVERY APP ON THE TEAM — the same cache key `wave-detail.tsx` already
  // reads (and keeps live, R15), read here only for its LOGO: the timeline's
  // left column draws the wave's own app, and a `Sprint` row only ever
  // carries the app's id and name (`shared/types.ts`), never its picture.
  const appsQ = useCached<AppRow[]>(appsKey(teamId), () => listFetch.apps(teamId))
  // THE TEAM'S OWN "Sprint type" VOCABULARY — the new filter facet's options
  // (client, 16 Sep 2026: "I want, in Waves, the filter by sprint type").
  const sprintTypes = useSprintTypes(teamId)

  // WHAT SHE WAS ASKING THIS COLLECTION, remembered with the screen (see
  // web/lib/nav-memory.ts). The search, the client, the on/off filter and the
  // order are one question and are remembered as one slot.
  //
  // A REMEMBERED FILTER IS CHECKED AGAINST TODAY'S VOCABULARY. The two closed
  // lists — the on/off filter and the sort — are validated outright. The CLIENT
  // is validated only once the client list is actually loaded (it is a cached
  // read and this runs at mount); a client switched off while she was away and
  // not yet loaded therefore survives one render, and what she sees is her own
  // filter matching nothing, with "Clear all" beside it. That is a degraded
  // answer rather than a wrong one, and it is the honest limit of validating
  // against a list that arrives asynchronously.
  const [query, setQuery] = useRemembered<WaveQuery>("find", EMPTY_WAVE_QUERY, (found) => {
    if (!found || typeof found !== "object") return undefined
    const was = found as Record<string, unknown>
    const known = clientsQ.data
    const accountId =
      typeof was.accountId === "string" &&
      (!known || known.some((c) => c.id === was.accountId))
        ? was.accountId
        : ""
    // Revalidated the same way `accountId` is above: `appsQ` carries a real
    // loading state, so "not loaded yet" and "no longer exists" are two
    // different answers, not one degraded one.
    const knownApps = appsQ.data
    const appId =
      typeof was.appId === "string" && (!knownApps || knownApps.some((a) => a.id === was.appId))
        ? was.appId
        : ""
    return {
      q: typeof was.q === "string" ? was.q : "",
      accountId,
      status: was.status === "on" || was.status === "off" ? was.status : "",
      // Not revalidated against the team's own vocabulary the way `accountId`
      // is above: `useSprintTypes` always answers something (a real list or
      // three fallback words, never "not yet loaded"), so there is no moment
      // to tell "not loaded yet" from "no longer exists" apart the way the
      // client list's genuine loading state lets `accountId` do it. A type
      // that was since renamed or removed degrades the same honest way a
      // switched-off client does above: the filter survives and matches
      // nothing, with "Clear all" beside it.
      sprintType: typeof was.sprintType === "string" ? was.sprintType : "",
      appId,
      sortBy: (["name", "runs", "sprints", "client", "newest"] as const).includes(
        was.sortBy as WaveOrder
      )
        ? (was.sortBy as WaveOrder)
        : EMPTY_WAVE_QUERY.sortBy,
      dir: was.dir === "asc" || was.dir === "desc" ? was.dir : EMPTY_WAVE_QUERY.dir,
    }
  })
  // ACTIVE / ALL — the client's own two tabs, 2026-09-15: "two tabs: Active …
  // All". Remembered per screen, the same slot the view/query questions use.
  const [tab, setTab] = useRemembered<"active" | "all">("tab", "active", (found) =>
    found === "active" || found === "all" ? found : undefined
  )
  // WHICH BODIES THIS TAB OFFERS — Active: Timeline (default), Calendar.
  // All: Timeline (default), Calendar, List. Timeline leads both, the
  // client's own ruling ("Active: I only want the timeline … In Active, I
  // also want the calendar, but the main one stays the timeline").
  const tabViews: CollectionViewOption[] =
    tab === "active"
      ? [
          { value: "timeline", label: t("Timeline"), icon: <ChartBarHorizontal size={16} /> },
          { value: "calendar", label: t("Calendar"), icon: <CalendarIcon size={16} /> },
        ]
      : [
          { value: "timeline", label: t("Timeline"), icon: <ChartBarHorizontal size={16} /> },
          { value: "calendar", label: t("Calendar"), icon: <CalendarIcon size={16} /> },
          { value: "list", label: t("List"), icon: <ListBullets size={16} /> },
        ]
  // ONE VIEW SLOT, remembered the same way the search/filter/sort question
  // is — the view is "how she wants to look", the query is "what she is
  // looking for", and R16 already has its one badge on the tab strip below,
  // so this slot adds a body, never a second count. Clamped to whatever the
  // CURRENT tab actually offers, so switching from All/List to Active never
  // strands the reader on a body that tab does not draw.
  const [rawView, setView] = useRemembered<WaveView>("view", "timeline")
  const allowedViews = new Set(tabViews.map((v) => v.value))
  const view: WaveView = allowedViews.has(rawView) ? rawView : "timeline"
  // THE VISIBLE WEEK WINDOW THE TIMELINE SHOWS. Ephemeral, unlike `view` and
  // `query`: it is a scroll position over a window that only exists while
  // the Timeline is on screen, not "where she was" in the sense
  // nav-memory.ts means it, so a plain `useState` is the honest weight.
  const [weekOffset, setWeekOffset] = React.useState(0)
  const [addOpen, setAddOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Wave | null>(null)
  const [switchingOff, setSwitchingOff] = React.useState<Wave | null>(null)

  async function run(work: () => Promise<unknown>, whenItFails: string): Promise<void> {
    try {
      await work()
      invalidate(wavesKey(teamId))
    } catch (e) {
      toast.error(e instanceof ApiFailure ? e.message : whenItFails)
    }
  }

  // A FAILED READ SAYS SO. A skeleton that never resolves is indistinguishable
  // from a screen that is merely slow, and the person waits for something that
  // is never coming.
  if (wavesQ.error)
    return (
      <ShapeStateBody
        shape="collectionScreen"
        state="error"
        copy={{ errorTitle: t("Couldn't load the waves.") }}
        action={
          <Button variant="secondary" onClick={() => wavesQ.refresh()}>
            {t("Try again")}
          </Button>
        }
      />
    )
  // WAS A WHOLE-SCREEN EARLY RETURN (2026-09-03 audit — "nine screens blank
  // their entire toolbar while loading"): this unmounted the card, the
  // `WaveFinder` toolbar and "Sell a wave" along with the rows. Fixed the same
  // way every sibling screen was: keep the chrome drawn and swap only the
  // rows region below.
  const wavesLoading = wavesQ.data === undefined

  // ON A CLIENT'S RECORD the list is narrowed before anything else is asked, so
  // the count under the search box and the empty state both speak about that
  // client rather than about the team.
  const loadedWaves = wavesQ.data ?? []
  const scopedWaves = accountId ? loadedWaves.filter((w) => w.accountId === accountId) : loadedWaves
  // ACTIVE / ALL — the tab itself narrows BEFORE the search/filter/sort
  // question does, the same order `scopedWaves` already narrows by account:
  // Active IS the "still switched on" collection, not a filter a reader can
  // clear back out of it.
  const all = tab === "active" ? scopedWaves.filter((w) => w.active) : scopedWaves
  // Read BEFORE `rows`: the Sprint type facet is answered off this array
  // (`selectWaves`'s own EXISTS-over-sprints, mirroring the door's).
  const sprints = sprintsQ.data ?? []
  const rows = selectWaves(all, query, sprints)
  const clients = (clientsQ.data ?? []).filter((a) => a.active)
  const asking = waveQueryIsActive(query)
  const apps = appsQ.data ?? []

  // R16 — THE TAB STRIP'S OWN BADGES, an exact count each. Waves is a
  // BOUNDED, fully-loaded collection (no pager — the file header says why),
  // so counting the already-loaded, already-scoped array IS the exact count
  // the door would answer, the same way every other bounded collection's tab
  // badge is computed off its own loaded page rather than a second round
  // trip for a number already in hand.
  const activeBadge = wavesLoading ? "" : formatCount(scopedWaves.filter((w) => w.active).length)
  const allBadge = wavesLoading ? "" : formatCount(scopedWaves.length)

  // THE TIMELINE READS THE SAME NARROWED ROWS the other two bodies do — a
  // search or a filter narrows every body alike, so switching views
  // mid-search never silently widens what she was asking. Built only when
  // it is actually on screen.
  const weekWindow = view === "timeline" ? waveWeekWindow(weekOffset, t, lang) : null
  const timelineRows =
    weekWindow ? buildWaveTimelineRows(rows, sprints, weekWindow, basePath, lang, apps) : []

  const calendarEntries = view === "calendar" ? buildWaveCalendarEntries(rows, sprints, t) : []
  const listRows = view === "list" ? waveListRows(rows, sprints, t, lang, apps) : []
  // PLAIN VALUES, NOT `useMemo` — both are cheap array/object literals built
  // from what is already in hand, and a hook here would sit AFTER this
  // component's own early error return above, which is the one thing rules
  // of hooks forbids: the same call must run on every render, not only the
  // ones that get this far.
  const listColumns: TableColumn[] = waveListColumns(t)
  const listConfig: CollectionConfig = {
    ...defaultCollectionConfig,
    dataSource: "waves",
    // NO CHROME OF ITS OWN — `WaveFinder`'s own search/sort (shown only on
    // List, R78) is the one control this body is narrowed and ordered by;
    // a second copy here would be the "different toolbar variations" the
    // client has twice ruled out.
    sortable: false,
    searchable: false,
    showCount: false,
    scrollToTop: false,
    emptyText: asking ? t("No waves match that.") : t("No waves yet."),
  }

  // R16 iii — THE TAB STRIP CARRIES THE COUNT; THE HEADING STANDS DOWN. The
  // sidebar page used to badge nowhere (no tab strip existed) and the
  // client's own record showed no count at all — both now read it once, off
  // the strip below, through the identical arbitration every other tabbed
  // collection screen uses (`CountedAbove`/`useCountStandsDown`,
  // records/counted-tabs.tsx).
  const heading = accountId ? null : <CollectionHeading sectionKey="waves" total={total} />

  const tabsConfig = {
    ...defaultTabsConfig,
    tabs: [
      { value: "active", label: t("Active"), icon: "", badge: activeBadge, badgeVariant: "" as const },
      { value: "all", label: t("All"), icon: "", badge: allBadge, badgeVariant: "" as const },
    ],
  }

  return (
    <CountedAbove active>
    <div className="flex flex-col gap-6">
      {heading}

      {/* THE STRIP AND ITS CARD SHARE ONE GAPLESS COLUMN (R83 —
          `toolbar-lead-gap`). `renderFolderTabs`' own strip pays the WHOLE
          distance to what it labels as its own trailing padding
          (`STICKY_FOLDER_TABS`'s `pb-[var(--tab-content-gap)]`,
          `shared/web/screen-engine/tabs-view.tsx`) — exactly the way
          `<ToolbarRow>` pays its OWN trailing `--toolbar-content-gap` rather
          than leaving it to a caller (R49). Every other `renderFolderTabs`
          call site in the app (`paged-find.tsx`, `tickets-collection.tsx`,
          `kwapso-screen.tsx`, `settings-screen.tsx`,
          `module-settings-screen.tsx`, `screen-bits.tsx`'s own
          `SectionWithCreate`) wraps the strip and what it labels in a column
          with NO `gap-*` of its own, in as many words: "this column has
          nothing to say about [the gap] either way and must not grow a
          `gap-*` of its own — that would be a second opinion about one
          number" (`paged-find.tsx`). This file was the one call site that
          disagreed — the strip and `<CollectionCard>` used to sit directly
          in the OUTER `gap-6` column with `{heading}`, so the tab strip's own
          20px trailing pad was paid AND a second, unrelated 24px heading gap
          was spent again on top of it, above the toolbar and nowhere else.
          The inner column below is that second opinion, retracted — `heading`
          stays in the outer `gap-6` (a real, single gap: heading to the strip
          below it), and the strip-to-card distance goes back to being the
          strip's own number, spent once. */}
      <div className="flex w-full flex-col">
        {/* ACTIVE / ALL — the client's own two tabs, drawn flush against the
            card exactly as `renderFolderTabs` draws every other collection's
            strip (tasks-screen.tsx's own `folderTabs` slot is the direct
            precedent; Waves is bespoke throughout, so this file calls the
            same exported helper directly rather than adopting the whole
            `SectionWithCreate` engine for a screen that already owns its own
            toolbar and create button). */}
        {renderFolderTabs({
          config: tabsConfig,
          value: tab,
          onValueChange: (v) => {
            setTab(v as "active" | "all")
            // A fresh tab starts its Timeline at the current week — carrying
            // an old scroll position across from the other tab would land on
            // a window the reader never chose from this one.
            setWeekOffset(0)
          },
        })}

        {/* THE CANONICAL SHAPE — ONE card holding the toolbar and the rows,
            with "Sell a wave" at the FAR RIGHT of the toolbar's own first line
            rather than a row of its own above it (client ruling, 2026-08-31:
            an action button never gets a separate row from the toolbar it
            belongs to). */}
        <CollectionCard>
        {/* R50 — never toolbar on an empty collection. `wavesLoading ||` is
            the same fold every sibling screen's own `empty` gate carries
            (2026-09-03 audit): `all` defaults to `[]` before the read
            resolves, which reads exactly like a genuinely empty collection
            unless the loading state says otherwise. */}
        {(wavesLoading || all.length > 0) && (
          <WaveFinder
            query={query}
            onChange={setQuery}
            clients={clients}
            showClientFilter={!accountId}
            sprintTypes={sprintTypes}
            apps={apps}
            resultCount={rows.length}
            views={tabViews}
            view={view}
            onViewChange={(v) => {
              setView(v)
              setWeekOffset(0)
            }}
            actions={
              canCreate && clients.length > 0 && (
                <AddButton label={t("Sell a wave")} onClick={() => setAddOpen(true)} />
              )
            }
          />
        )}
        {wavesLoading ? (
          // ROWS ONLY — the toolbar above is already real.
          <Skeleton variant="list" lines={4} />
        ) : view === "timeline" && weekWindow ? (
          // T3 — ONE BAR PER WAVE, cut into its own sprints. See
          // `record-timeline.tsx`'s own header for why this reads through a
          // bespoke host rather than the kit's `Gantt`.
          <RecordTimeline
            weeks={weekWindow.weeks}
            rows={timelineRows}
            todayIndex={weekWindow.todayIndex}
            windowLabel={weekWindow.windowLabel}
            onPrevious={() => setWeekOffset((o) => o - TIMELINE_STEP_WEEKS)}
            onNext={() => setWeekOffset((o) => o + TIMELINE_STEP_WEEKS)}
            onToday={() => setWeekOffset(0)}
            emptyBody={
              asking
                ? t("No waves match that in this window.")
                : t("No waves have both a start and an end in this window yet.")
            }
            label={t("Waves timeline")}
          />
        ) : view === "calendar" ? (
          // WAVES AND SPRINTS AS DAY CHIPS — one chip per day, the START day
          // only (this round's own descope; see the file header for why a
          // multi-day span was not built into the kit this time). The same
          // door every other calendar screen reaches through, R80's sibling
          // law for a month grid ("ONE CALENDAR").
          <RecordCalendar
            entries={calendarEntries}
            onOpen={(id) => {
              if (id.startsWith("w:")) return softNavigate(`${basePath}/${id.slice(2)}`)
              const [, waveId, sprintId] = id.split(":")
              if (waveId && sprintId) softNavigate(`${basePath}/${waveId}/sprints/${sprintId}`)
            }}
            emptyText={
              asking ? t("No waves match that.") : t("No waves or sprints have a start date yet.")
            }
          />
        ) : rows.length === 0 ? (
          asking ? (
            /* R62 — THE SAME REGISTER, MINUS THE ADD BUTTON (client,
               2026-09-09). A bare grey line beside the full register one branch
               down; one body now, and "Sell a wave" is withdrawn by the
               component while a search is narrowing the list. */
            <CollectionEmptyState filtered title={t("No waves yet.")} />
          ) : (
            // GENUINELY EMPTY — R50's own carve-out (composition 27.21): the
            // toolbar above is gone, so this is the only "Sell a wave" left
            // on screen. `clients.length > 0` is the same real-world gate the
            // toolbar's own button carried (a wave needs a client to sell it
            // to) — offering a button that would open a dialog with nowhere
            // to point would be worse than none.
            <CollectionEmptyState
              title={t("No waves yet.")}
              description={t(
                "A wave is a package of sprints an account bought: sell it first, plan the sprints inside it afterwards."
              )}
              onCreate={canCreate && clients.length > 0 ? () => setAddOpen(true) : undefined}
            />
          )
        ) : (
          // LIST (All tab only) — R80's shape, through `RecordTable`.
          <RecordTable
            columns={listColumns}
            rows={listRows}
            config={listConfig}
            refColumn="ref"
            onRowClick={(row) => softNavigate(`${basePath}/${row.id}`)}
            actions={
              canEdit
                ? [
                    {
                      label: t("Edit"),
                      onSelect: (row) => {
                        const w = rows.find((x) => x.id === row.id)
                        if (w) setEditing(w)
                      },
                    },
                    {
                      label: t("Switch off"),
                      onSelect: (row) => {
                        const w = rows.find((x) => x.id === row.id && x.active)
                        if (w) setSwitchingOff(w)
                      },
                    },
                    {
                      label: t("Bring back"),
                      onSelect: (row) => {
                        const w = rows.find((x) => x.id === row.id && !x.active)
                        if (w)
                          void run(
                            () => wavesApi.setActive(w.id, true),
                            t("That didn't save. Try again, and tell us if it keeps happening.")
                          )
                      },
                    },
                  ]
                : []
            }
          />
        )}
      </CollectionCard>
      </div>

      <WaveFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        clients={clients}
        apps={apps}
        draftKey={`wave:add:${teamId}`}
        onSubmit={async (v) => {
          await wavesApi.create({
            accountId: v.accountId,
            name: v.name,
            goal: v.goal || undefined,
            appId: v.appId || undefined,
          })
          invalidate(wavesKey(teamId))
          toast.success(t("Wave sold."))
        }}
      />

      <WaveFormDialog
        open={editing !== null}
        onOpenChange={(open) => (open ? null : setEditing(null))}
        clients={clients}
        apps={apps}
        draftKey={editing ? `wave:edit:${editing.id}` : undefined}
        initial={
          editing
            ? { accountId: editing.accountId, name: editing.name, goal: editing.goal ?? "", appId: editing.appId }
            : undefined
        }
        onSubmit={async (v) => {
          if (!editing) return
          // `appId` ALWAYS SENT ON EDIT — never `|| undefined` the way `goal`
          // is above: the door's own tri-state (`updateWave`'s own header,
          // workers/tenancy/src/lib/waves.ts) reads an ABSENT key as "leave
          // it alone", and this form always knows and means the app it is
          // submitting, empty string included (clear it).
          await wavesApi.update({ id: editing.id, name: v.name, goal: v.goal || undefined, appId: v.appId || null })
          invalidate(wavesKey(teamId))
          invalidate(`activity:record:waves:${editing.id}`)
          toast.success(t("Wave updated."))
        }}
      />

      {/* SWITCHING A WAVE OFF ASKS FIRST — it is the destructive-coloured action
          on this screen, and the record stays (deactivate, never delete), which
          is the sentence the dialog says rather than implies. */}
      <AlertDialog open={switchingOff !== null} onOpenChange={(open) => (open ? null : setSwitchingOff(null))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Switch this wave off?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("It stops being offered when a sprint is filed, and stays on the record with everything already in it. You can bring it back.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Keep it")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const wave = switchingOff
                setSwitchingOff(null)
                if (wave)
                  void run(
                    () => wavesApi.setActive(wave.id, false),
                    t("That didn't save. Try again, and tell us if it keeps happening.")
                  )
              }}
            >
              {t("Switch it off")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </CountedAbove>
  )
}

/** THE SIDEBAR PAGE. The tab strip's own badges carry the count now (R16
 * iii — the heading stands down through `CountedAbove`, above). */
export function WavesScreen({
  teamId,
  basePath,
}: {
  teamId: string
  basePath: string
}) {
  return <WaveCollection teamId={teamId} basePath={basePath} />
}
