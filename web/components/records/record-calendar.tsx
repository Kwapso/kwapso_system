"use client"

// THE CALENDAR — one component, every calendar screen, and every record on it
// opens.
//
// REBUILT ON THE KIT (30 Aug 2026). UI-GAPS #22's blocker — the library's
// `CalendarView` took no click prop of any kind, so a record on the grid was a
// picture of a record — was fixed upstream in kit v1.2.9: `CalendarViewProps`
// now carries `onSelectDay` / `onSelectEvent` / `onSelectItem`. This file's two
// exports are each composed from one kit part rather than hand-rolling either
// — the same reason `roles-matrix.tsx` reaches for the kit's parts instead of
// drawing its own: `RecordCalendar` (below) from `CalendarView`, the month
// grid; `RecordAgenda` (the file's tail) from `Agenda`, the day-by-day list.
//
// WHY A CELL IS NEVER A BUTTON. The kit makes a day cell a real `<button>` when
// `onSelectDay` is given, wrapping its event chips — and a chip becomes its OWN
// `<button>` when `onSelectEvent` is given, which would nest a button inside a
// button. So this file never sets `onSelectDay`: only entries are clickable,
// exactly as before, and the overflow ("+N more") is composed as one more
// `CalendarEvent` per day rather than a second, unclickable line the kit draws
// on its own — the same "+6 more must open something" reasoning UI-GAPS #22
// raised in the first place.
//
// THE PHONE'S OWN WAY IN, kit v1.2.86. Below `sm:` the kit swaps chips for
// chapter 18's dots, which used to be `aria-hidden` decoration with nothing
// wired to them — a busy day on a phone could be SEEN and not opened at all,
// because the desktop "+N more" chip this file builds into `events` (above)
// is itself inside the `sm:flex` chip column the kit hides below `sm:`. The
// kit's `onSelectMore` is now also what the compact dots call, so this file
// wires it to the exact same `setOpenDay` the overflow chip's `onSelectEvent`
// branch already calls — one dialog, two doors in. The kit hands back the
// day and its events, but this file re-reads `byDay` by `day.key` instead
// (the second argument is the kit's own shaped `CalendarEvent[]`, not this
// file's `CalendarEntry[]`), exactly as the overflow-chip branch already
// does.
//
// ONE WAY TO READ ONE MONTH, since the client's ruling of 2026-09-15: *"Agenda
// is a different component than month. Inside the calendar, the whole month
// agenda: disable that. When I mean calendar, I mean the month view."* This
// file used to offer the month as EITHER a grid or an agenda (a day-by-day
// list drawn through the kit's own `Agenda`), with a phone opening on the
// agenda by default because "a month grid at 375px is six rows of cells about
// three characters wide, which is not information". That second reading is
// gone — no `ToggleGroup`, no `Mode`, no device check — and a phone now gets
// the same grid a desktop does (verified at 375px: `CalendarView`'s grid is a
// fluid `repeat(7, 1fr)`, so the cells narrow rather than break; a chip's own
// `truncate` keeps a long title from wrapping the row). What the kit calls
// "agenda" — day by day, chronological — is a DIFFERENT component now, never
// a mode switch inside this one.
//
// WHAT IT DELIBERATELY IS NOT. It is not a scheduler: nothing here drags, and
// no record moves by being dropped on a day. A calendar in this app is a way
// IN to records that already have a date; the date itself is changed on the
// record's own form, where it is validated at the door like every other field.
//
// TWO EXPORTS, ONE KIT COMPONENT EACH, since 2026-09-15. `RecordCalendar`
// (above) is a MONTH GRID, only — its own navigation, its own fetch of
// whichever month is on screen. `RecordAgenda` (below) is the "different
// component" the ruling names: a caller-narrowed set of entries (a week,
// never a month this file would have to filter down to), read day by day,
// with no navigation of its own — the Meetings screen's own "This week"
// Agenda view is its first caller. Both are the "ONE CALENDAR" law's answer
// to the same question, `web/test/rules.test.ts`'s `one-calendar`: nothing
// outside this file may import the kit's own `calendar-view` or `agenda`
// directly, so a record on either shape is never a picture with no click
// (UI-GAPS #22).
//
// TODAY'S CHIPS ARE INK, NOT BEIGE, since the same 2026-09-15 ruling: *"On the
// calendar view, on today, make the tasks' background black instead of
// beige, and always show the priority color circle."* Two separate changes —
// see `buildDayEvents` below for both.

import * as React from "react"

import { Button } from "@shared/ui/components/button/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@shared/ui/components/dialog/dialog"
import { List } from "@shared/web/list-compat"
import { CalendarView, type CalendarDay, type CalendarEvent } from "@shared/ui/components/calendar-view/calendar-view"
import { Agenda, type AgendaDay } from "@shared/ui/components/agenda/agenda"
import { CalendarDots, CaretLeft, CaretRight } from "@shared/ui/foundations/icons"

import { formatDate } from "@shared/web/format"
import { useLanguage } from "@shared/web/language"
import type { Language, Vars } from "@shared/i18n"
// The same six dot tones `Badge`'s own `dot` prop and `Kanban`'s `ColumnDot`
// read (badge.tsx's `BadgeDot`, kanban.tsx's `KanbanColumnDot` — one enum,
// three names). `DotTone` is the app-level name for it, already the type
// `PRIORITY_DOT_TONE` (`shared/departments.ts`) is keyed to, so this file
// types `CalendarEntry.dotTone` to the exact same union rather than a bare
// `string` a typo could slip past.
import type { DotTone } from "@shared/app-stages"
// PRIORITY'S OWN FOUR TONES (kit v1.2.89: `--dot-red`/`--dot-orange`/
// `--dot-purple`/`--dot-blue`), a SEPARATE type from `DotTone` on purpose —
// `shared/departments.ts`'s own header on `PriorityTone` says why widening
// `DotTone` itself would be wrong (it would silently demand a fifth/sixth/
// seventh/eighth entry in every exhaustive `Record<DotTone, …>` this app
// keeps, none of which have anything to do with a task's priority). `Badge`'s
// `dot` prop and `Kanban`'s `ColumnDot` both already accept `PriorityTone`'s
// four names too, so a chip built from either union paints correctly either
// way — `EntryDotTone` below is the UNION a caller may hand this file,
// exactly where `PRIORITY_DOT_TONE[priority]` (tasks-screen.tsx) meets
// `CalendarEntry.dotTone`.
import type { PriorityTone } from "@shared/departments"

/* ------------------------------- what it takes ---------------------------- */

/** EVERY DOT A CALENDAR CARD MAY WEAR — the app-stage six (`DotTone`) plus
 * priority's own four (`PriorityTone`), exported so a caller (or this
 * folder's own `record-week.tsx`) can type a variable against the exact
 * union `CalendarEntry.dotTone` accepts rather than re-deriving it. The two
 * source unions stay separate (see the import comment above); this is the
 * one place they are combined, for the one field that has to accept either. */
export type EntryDotTone = DotTone | PriorityTone

/** ONE RECORD, on a calendar. The screens map their own rows to this, which is
 * why three collections that share no columns share one calendar. */
export type CalendarEntry = {
  /** the record's id — what `onOpen` is handed, so its detail screen can open */
  id: string
  /** the day it sits on, as `YYYY-MM-DD` (lexical order is chronological order) */
  day: string
  /** what the entry says — the record's own name */
  title: string
  /** the value the colour is derived from ("" = one neutral colour) */
  accent?: string
  /**
   * THE PRIORITY COLOUR CIRCLE (client ruling, 2026-09-15: "always show the
   * priority color circle"). Added for the Tasks lane's board, which sets it
   * from `PRIORITY_DOT_TONE[priority]` (`shared/departments.ts`) — never a
   * hash like `accent`. When both are given, `dotTone` is what draws: a chip
   * earns at most one dot (the same "the mark never carries the meaning
   * alone, and never carries two" reasoning `tickets-collection.tsx`'s own
   * `DOT_TONE_FILL` states), and a meaningful, named priority outranks an
   * arbitrary per-department hash.
   *
   * WIDENED TO `EntryDotTone` (this file, above) the same day priority grew
   * its own four tones (kit v1.2.89) instead of borrowing four of the
   * app-stage six: `PRIORITY_DOT_TONE` now returns a `PriorityTone`, which a
   * field typed bare `DotTone` would refuse — this is the one place that
   * widening happens, and `DOT_FILL` below is kept exhaustive over the same
   * union so a tone this file cannot paint fails to compile rather than
   * painting nothing.
   */
  dotTone?: EntryDotTone
  /** the second line the "+N more" day view reads. A grid cell has no room for
   *  it; a list has, and it is the difference between "Standup" and
   *  "09:30 · Standup · Northwind". */
  detail?: string
  /**
   * WHEN, ALREADY FORMATTED BY THE CALLER — client ruling, 2026-09-15, over
   * the week design: "make sure that on each card, you add an eyebrow with
   * the time." Added for `RecordWeek` (`web/components/records/record-
   * week.tsx`), which draws it as the card's EYEBROW — the small-caps line
   * above the title, `RecordFooterEyebrow`'s own `text-micro` uppercase
   * `text-ink-tertiary` treatment (`shared/ui/components/record-detail/
   * record-detail.tsx`) — and never reformats it. A CONTRACT DECISION, the
   * same one `AgendaEntry.time` above already made and for the identical
   * reason: the value is EITHER an already-formatted "09:30" string, or the
   * caller has run it through the app's own formatter first
   * (`shared/web/format.ts`'s `formatTime`, if the kit ever needs it
   * un-formatted) — never a bare ISO instant handed to this file to parse,
   * because a calendar entry can come from three different screens with
   * three different ideas of what "the time" means (a task's due time, a
   * meeting's start, a sprint's own single-date placement), and only the
   * caller knows which. `RecordCalendar`'s own month grid and the day-view
   * dialog do not read this field at all — it is `RecordWeek`'s alone — so
   * adding it here costs the two existing readers nothing. Undefined, same
   * as `detail`: a card with no time draws no eyebrow.
   */
  time?: string
}

/* --------------------------------- colour --------------------------------- */

// The five chart accents, and the stable hash into them. Copied in shape from
// the library's own calendar (`accentIndex`) rather than imported, because the
// library exports the component and not the helper — so the grid keeps exactly
// the colours it shipped with, and a department that was chart-3 yesterday is
// chart-3 today. The kit's own chip `tone`/`dot` are a small fixed enum
// (status words, not an arbitrary hash), which cannot carry "one colour per
// department" — so the dot is drawn into the chip's own `label` node instead,
// the one slot the kit hands the caller whole.
const ACCENTS = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"]

function accentClass(value: string): string {
  let h = 0
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) >>> 0
  return ACCENTS[h % ACCENTS.length]
}

/** THE PRIORITY DOT'S OWN FILL — badge.tsx's `DOT_FILL`, copied in shape for
 * the same reason `ACCENTS` above is: the kit exports the component, not the
 * class map, and a `Record<EntryDotTone, …>` (not a template literal) means a
 * ninth tone the kit ever grew fails this file's type check instead of
 * silently painting nothing (`tickets-collection.tsx`'s own `DOT_TONE_FILL`
 * makes the identical argument). Written as Tailwind classes, not an inline
 * style, to match this file's existing `accentClass` dot exactly — the two
 * can sit in the same `label` node with the same shape.
 *
 * EXTENDED TO THE FOUR PRIORITY TONES (kit v1.2.89, `--dot-red`/`--dot-
 * orange`/`--dot-purple`/`--dot-blue`, `shared/ui/foundations/tokens/
 * tokens.css`) the same day `PriorityTone` stopped borrowing four of the six
 * above it — `shared/departments.ts`'s own header names this file and
 * `record-week.tsx`'s identical map as the two that had to grow to match. */
const DOT_FILL: Record<EntryDotTone, string> = {
  shipped: "bg-[var(--dot-shipped)]",
  building: "bg-[var(--dot-building)]",
  review: "bg-[var(--dot-review)]",
  blocked: "bg-[var(--dot-blocked)]",
  archived: "bg-[var(--dot-archived)]",
  done: "bg-[var(--dot-done)]",
  red: "bg-[var(--dot-red)]",
  orange: "bg-[var(--dot-orange)]",
  purple: "bg-[var(--dot-purple)]",
  blue: "bg-[var(--dot-blue)]",
}

/** One entry's own dot class — `dotTone` (the priority circle) wins over
 * `accent` (the department hash) when both are given; see `CalendarEntry.
 * dotTone`'s own comment for why. `null` draws nothing, exactly as before. */
function dotClass(e: CalendarEntry): string | null {
  if (e.dotTone) return DOT_FILL[e.dotTone]
  if (e.accent) return accentClass(e.accent)
  return null
}

/* ---------------------------------- days ---------------------------------- */

/** Local `YYYY-MM-DD` — the same shape the screens slice their date columns to,
 * so a square and a record can never disagree about which day it is. Built from
 * the local parts rather than `toISOString()`, which would be UTC: for anybody
 * east of Greenwich that is the difference between a meeting on Monday and the
 * same meeting on Sunday. */
function dayKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

/** A day key as the sentence a person reads, through the ONE shared formatter.
 *
 * The three lines in the middle are the reason this is a function: the language
 * itself parses a bare `"2026-08-07"` as UTC midnight, which renders as 6 August
 * for everybody west of Greenwich. So the key is read as LOCAL parts first, and
 * a key that is not three numbers renders nothing rather than throwing. */
function formatDayKey(key: string | null, lang: Language): string {
  if (!key) return ""
  const [y, m, d] = key.split("-").map(Number)
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return ""
  return formatDate(new Date(y, m - 1, d).toISOString(), lang)
}

/** The 42 squares a month grid draws: the Monday on or before the 1st, then six
 * weeks. Monday because all three screens already asked the library for
 * `weekStartsOn: "monday"` — one behaviour, not a setting nobody would change. */
function monthSquares(month: Date): Date[] {
  const first = startOfMonth(month)
  const offset = (first.getDay() + 6) % 7
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - offset)
  return Array.from(
    { length: 42 },
    (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
  )
}

/** The month's name and the weekday headings in the READER'S own locale, the way
 * `shared/web/format.ts` already writes every other date in this app. The
 * library's calendar hard-codes twelve English month names; this one does not,
 * so a person reading the app in German reads a German month.
 *
 * Not routed through `shared/web/format.ts` — nothing there produces "long
 * month name + year" (`formatMonth` is deliberately the short-month AXIS shape)
 * — so this calls `Intl` directly, but with the app's own `lang`, never
 * `undefined`: passing `undefined` asks for the RUNTIME's ambient locale
 * (Node during server rendering, the browser during hydration), which is the
 * exact bug format.ts's own header warns about. */
function monthLabel(month: Date, lang: Language): string {
  return month.toLocaleDateString(lang, { month: "long", year: "numeric" })
}

// Monday first, matching `monthSquares`. The kit's own `quietColumns` default
// ([5, 6], the last two) is exactly right for this order — Saturday and Sunday.
// Same reasoning as `monthLabel`: no formatter here produces a bare weekday
// name, so this is `Intl` directly, with the reader's own `lang`.
function weekdayLabels(lang: Language): string[] {
  return Array.from({ length: 7 }, (_, i) =>
    // 5 Jan 1970 was a Monday, so this is Mon…Sun with no magic numbers.
    new Date(1970, 0, 5 + i).toLocaleDateString(lang, { weekday: "short" })
  )
}

/* ------------------------------ the overflow ------------------------------- */

// The sentinel id for the "+N more" chip this file adds to a day's own events.
// Unique only WITHIN one day's array (it is a React key there, and the
// argument `onSelectEvent` is handed back), never across the grid.
const OVERFLOW_ID = "__overflow__"

/**
 * TODAY'S CHIPS ARE INK (client ruling, 2026-09-15, quoted at the file
 * header). The kit's own event-chip `tone` enum is a fixed six —
 * `quiet | brand | info | success | destructive | inverse` — and none of them
 * is named "ink"; `inverse` is the one that draws it: `bg-surface-inverse
 * text-ink-on-inverse`, the exact "charcoal fill, off-beige label" pair this
 * app already calls ink everywhere else (the record footer — CLAUDE.md's "ink
 * footer" — binds `--surface-record-footer` to the same token). So `inverse`
 * is the closest tone, used here, not a new one: `quiet` (the beige the
 * client rejected) for every other day, `inverse` for today's.
 *
 * THE DOT GETS A PAPER RING ON INK, because one tone's own fill defeats it
 * there: `--dot-building` is `var(--foreground)`, which IS the ink chip's own
 * fill — measured at 1.00:1, invisible, in both palettes (`--foreground` and
 * `--surface-inverse` swap the same two colours between light and dark, so
 * the collision survives the flip). `shadow-[var(--hairline-ink)]` is not a
 * new ring invented for this: it is the kit's own halo for exactly "a ring
 * that must read on an inverse ground" (tokens.css's `.bg-surface-inverse`
 * block rebinds `--hairline-ink` from `var(--foreground)` to
 * `var(--ink-on-inverse)` there — the same mechanism `card.tsx`'s selection
 * ring and `flowchart.tsx`'s selected-node ring already take). Applied to
 * every tone's dot on an ink chip, not only `building`'s, so one rule draws
 * all six rather than a tone-shaped special case — and left OFF the quiet
 * (beige) chip, where every tone already clears the fill on its own and a
 * ring would be noise.
 *
 * One day's events, capped at `maxPerDay`, with the hidden count folded into
 * one more `CalendarEvent` rather than left as the kit's own dead more-line
 * (`formatMoreEvents` only changes the WORDS; the kit draws no click for it).
 * So the overflow is a real chip too, and `onSelectEvent` tells it apart from a
 * record by its id. It takes today's tone too, for the same reason the day's
 * OTHER entries do: a "+N more" on today's square is still today's square.
 */
function buildDayEvents(
  entries: CalendarEntry[],
  maxPerDay: number,
  t: (english: string, vars?: Vars) => string,
  isToday: boolean
): CalendarEvent[] {
  const tone = isToday ? "inverse" : "quiet"
  const dotRing = isToday ? " shadow-[var(--hairline-ink)]" : ""
  const shown = entries.slice(0, maxPerDay)
  const hidden = entries.length - shown.length
  const events: CalendarEvent[] = shown.map((e) => ({
    id: e.id,
    title: e.title,
    tone,
    label: (
      <span className="flex min-w-0 items-center gap-1">
        {dotClass(e) ? (
          <span aria-hidden className={`size-1.5 shrink-0 rounded-pill ${dotClass(e)}${dotRing}`} />
        ) : null}
        <span className="min-w-0 truncate">{e.title}</span>
      </span>
    ),
  }))
  if (hidden > 0) {
    events.push({ id: OVERFLOW_ID, tone, label: t("+{n} more", { n: hidden }) })
  }
  return events
}

/** A day's records as a LIST — the shape the "+N more" dialog opens into.
 * Same dot, same precedence (`dotTone` over `accent`) as the chip it was
 * opened from — a record does not change colour between the square and the
 * dialog. Never drawn on ink: the dialog is its own surface, not today's
 * square, so it keeps the quiet-list reading it always had. */
function DayRows({
  entries,
  onOpen,
}: {
  entries: CalendarEntry[]
  onOpen: (id: string) => void
}) {
  return (
    <List
      surface="none"
      items={entries.map((e) => ({
        id: e.id,
        // `block` on purpose: the list wraps its leading slot in a plain div, so
        // an inline span would take no width or height at all and the colour
        // would simply not be there. (It was not, for one screenshot.)
        leading: dotClass(e) ? (
          <span aria-hidden className={`mt-1.5 block size-2.5 shrink-0 rounded-pill ${dotClass(e)}`} />
        ) : undefined,
        title: e.title,
        subtitle: e.detail,
      }))}
      onItemClick={(item) => onOpen(item.id)}
    />
  )
}

/* ------------------------------- the calendar ------------------------------ */

export function RecordCalendar({
  entries,
  onOpen,
  emptyText,
  maxPerDay = 3,
  onMonthChange,
}: {
  /** every record with a date, in any order — the grid buckets them itself */
  entries: CalendarEntry[]
  /** open the record. The screens hand this straight to the engine's `open`
   *  intent, so a calendar reaches exactly the detail screen its list does. */
  onOpen: (id: string) => void
  /** what an empty month says, in the screen's own noun */
  emptyText: string
  /** how many entries a square shows before it collapses to "+N more" */
  maxPerDay?: number
  /** WHICH MONTH IS ON SCREEN, told to the host as `YYYY-MM`, on mount and on
   * every move.
   *
   * The calendar owns the month — a person moves it with the arrows, and that is
   * the right place for it. But a screen over a collection that answers "what's
   * in this month" one month at a time (meetings-screen.tsx's own `monthQ`)
   * cannot answer for a month it was never given, so the calendar says what it
   * is showing and the screen goes and gets it. Without this the grid would
   * render whatever happened to already be in hand and call the rest an empty
   * month — R14's failure mode, not this file's to reintroduce. */
  onMonthChange?: (month: string) => void
}) {
  const { t, lang } = useLanguage()
  const weekdays = React.useMemo(() => weekdayLabels(lang), [lang])
  const [month, setMonth] = React.useState(() => startOfMonth(new Date()))
  // Told on mount as well as on every move: the first month a person sees is a
  // month somebody has to fetch, and it is the one they see most often.
  const monthTag = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`
  React.useEffect(() => {
    onMonthChange?.(monthTag)
  }, [monthTag, onMonthChange])
  // Which day the "+N more" control opened, or null. One piece of state: the
  // dialog IS the overflow, so there is no second way to be looking at a day.
  const [openDay, setOpenDay] = React.useState<string | null>(null)

  const byDay = React.useMemo(() => {
    const map = new Map<string, CalendarEntry[]>()
    for (const e of entries) {
      const list = map.get(e.day)
      if (list) list.push(e)
      else map.set(e.day, [e])
    }
    return map
  }, [entries])

  const squares = monthSquares(month)
  const today = dayKey(new Date())

  const dayEntries = openDay ? (byDay.get(openDay) ?? []) : []

  // THE GRID'S OWN CELLS. Never `onSelectDay` — see the file header on nested
  // buttons — so a cell stays a plain `<div>` and only its chips, the overflow
  // chip, and (below `sm:`, kit v1.2.86) the compact dot summary are real
  // buttons. Every phone AND every desktop reads this same grid now — see the
  // file header's 2026-09-15 ruling — so there is no device check here any
  // more.
  const calendarDays: CalendarDay[] = squares.map((d) => {
    const key = dayKey(d)
    const isToday = key === today
    return {
      key,
      label: d.getDate(),
      dateTime: key,
      events: buildDayEvents(byDay.get(key) ?? [], maxPerDay, t, isToday),
      outside: d.getMonth() !== month.getMonth(),
      today: isToday,
    }
  })

  const emptyState = (
    <p className="text-muted-foreground flex items-center gap-2 text-sm">
      <CalendarDots aria-hidden className="size-4 shrink-0" />
      {emptyText}
    </p>
  )

  return (
    <div className="flex w-full flex-col gap-4">
      {/* THE PERIOD, AND THE MOVE — one row: which month, then the three ways to
          move it. No mode switch any more (2026-09-15: "when I mean calendar, I
          mean the month view") — one shape, so this row is two flex children,
          not three, and `justify-between` alone keeps the button group from
          being pushed off either edge when it wraps (UI-CONVENTIONS C4). */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-medium">{monthLabel(month, lang)}</div>
        <div className="flex items-center gap-1">
          <Button variant="secondary" size="sm" onClick={() => setMonth(startOfMonth(new Date()))}>
            {t("Today")}
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="size-8"
            aria-label={t("Previous month")}
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          >
            <CaretLeft />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="size-8"
            aria-label={t("Next month")}
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          >
            <CaretRight />
          </Button>
        </div>
      </div>

      <CalendarView
        view="month"
        weekdayLabels={weekdays}
        days={calendarDays}
        maxEvents={maxPerDay + 1}
        onSelectEvent={(event, day) => {
          if (event.id === OVERFLOW_ID) setOpenDay(day.key)
          else onOpen(event.id)
        }}
        // THE PHONE'S OWN WAY IN (kit v1.2.86, file header) — the compact
        // dots below `sm:` call this instead of `onSelectEvent`, since a dot
        // is never individually a chip. Same dialog the desktop overflow
        // chip opens; `day.key` is all either door needs, `byDay` does the
        // rest.
        onSelectMore={(day) => setOpenDay(day.key)}
        emptyState={emptyState}
        label={t("Calendar")}
      />

      {/* THE DAY, opened from "+N more". Everything on that day, not just the
          overflow: a person who clicked "+6 more" on a square showing three is
          looking for one of nine, and showing six of them would be a second way
          to hide records. */}
      <Dialog open={openDay !== null} onOpenChange={(next) => !next && setOpenDay(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{formatDayKey(openDay, lang)}</DialogTitle>
          </DialogHeader>
          <DayRows
            entries={dayEntries}
            onOpen={(id) => {
              setOpenDay(null)
              onOpen(id)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ------------------------------- the agenda -------------------------------- */

/** ONE ROW OF `RecordAgenda` — the kit's own `AgendaItem` (time / title / who),
 * minus the fields this file supplies itself (`id` doubles as the React key and
 * the handle `onOpen` gets, so it is not repeated as a separate prop here). */
export type AgendaEntry = {
  id: string
  /** the day it falls on, `YYYY-MM-DD` — grouped and headed the same way
   * `RecordCalendar`'s own month agenda groups `CalendarEntry.day`. */
  day: string
  /** when, already formatted by the caller (ruling 07) — the kit's own
   * time column. */
  time?: React.ReactNode
  /** the machine-readable instant, for the kit's `<time datetime>` — never
   * shown, never formatted for reading (RAW_DATE_EXEMPT, shared/rules/
   * registry.ts, carries the reasoning). Sorts rows within a day when two
   * share no other order. */
  dateTime?: string
  /** what it is — the kit's one full-measure column. */
  title: React.ReactNode
  /** who it is with, at the inline end — the kit's own "who". */
  who?: React.ReactNode
}

/**
 * A CHRONOLOGICAL LIST OF RECORDS, GROUPED BY DAY — no month, no grid, no
 * navigation: the caller has already decided which records and which days
 * (`meetings-screen.tsx`'s own Agenda view hands it a server-answered week,
 * never a month `RecordCalendar` would have to fetch and filter down).
 *
 * STILL THE KIT'S `Agenda`, THROUGH THIS ONE FILE — the "ONE CALENDAR" law
 * (`web/test/rules.test.ts`'s `one-calendar`) requires every screen that wants
 * `shared/ui/components/agenda/agenda.tsx` to reach it here rather than
 * importing it directly, so a record on it is never a picture with no click
 * (UI-GAPS #22, the same reason `RecordCalendar` above exists at all). This is
 * the ONLY door into that kit component now — `RecordCalendar` reads a month
 * as a grid, never as an agenda (2026-09-15: "Agenda is a different component
 * than month") — and it takes ANY set of entries the caller already narrowed
 * (a week, never a month this file would filter down), read day by day,
 * ending at the identical `onItemSelect={(item) => onOpen(item.id)}` wiring
 * `RecordCalendar`'s own grid ends at with `onSelectEvent`.
 *
 * "TODAY" IS MARKED the same way `RecordCalendar`'s own grid marks a day. */
export function RecordAgenda({
  entries,
  onOpen,
  emptyText,
}: {
  entries: AgendaEntry[]
  /** open the record — the screen's own `onIntent`, exactly as `RecordCalendar` above takes. */
  onOpen: (id: string) => void
  /** what an empty answer says, in the caller's own words — this file does no
   * narrowing of its own, so it does not know whether "empty" means "nothing
   * on the books" or "nothing matched a search". */
  emptyText: string
}) {
  const { t, lang } = useLanguage()
  const today = dayKey(new Date())
  const byDay = new Map<string, AgendaEntry[]>()
  for (const e of entries) {
    const list = byDay.get(e.day)
    if (list) list.push(e)
    else byDay.set(e.day, [e])
  }
  const days: AgendaDay[] = [...byDay.keys()].sort().map((day) => ({
    key: day,
    label: `${formatDayKey(day, lang)}${day === today ? ` · ${t("Today")}` : ""}`,
    items: [...(byDay.get(day) ?? [])]
      .sort((a, b) => (a.dateTime ?? "").localeCompare(b.dateTime ?? ""))
      .map((e) => ({ id: e.id, time: e.time, dateTime: e.dateTime, title: e.title, who: e.who })),
  }))
  return (
    <Agenda
      days={days}
      onItemSelect={(item) => onOpen(item.id)}
      empty={entries.length === 0}
      emptyState={
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <CalendarDots aria-hidden className="size-4 shrink-0" />
          {emptyText}
        </p>
      }
      label={t("Agenda")}
    />
  )
}
