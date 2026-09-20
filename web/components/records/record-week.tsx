"use client"

// THE WEEK VIEW — a caller-narrowed week, drawn as five workday columns
// (Monday–Friday) plus ONE folded weekend column (Saturday and Sunday,
// stacked). Client ruling, 15 Sep 2026, choosing this shape over three other
// designs sketched in the same session's artifact (2175565d-5459-4d2d-80cd-
// c06379943aa6, "W4 — Mon–Fri plus weekend folded"): *"For the agenda [the
// week design], I love your designs. I will go with W4, Monday to Friday,
// plus weekend folded. Just make sure that on each card, you add an eyebrow
// with the time."*
//
// WHY THIS FILE IS APP-SIDE, NOT A THIRD KIT EXPORT BESIDE `CalendarView`
// AND `Agenda`. The vendored kit (`shared/ui/`) draws a month grid
// (`calendar-view/calendar-view.tsx`) and a day-by-day list
// (`agenda/agenda.tsx`); it has no week-columns primitive, and `shared/ui/`
// is pinned and hand-edits there turn the build red (CLAUDE.md, `web/test/
// vendored-kit.test.ts`) — a gap gets logged and worked upstream, never
// patched here. So this is built from three of the kit's own PARTS instead
// of a fourth kit COMPONENT: `Card` (`components/card/card`, each entry's
// own bordered box — `variant="raised"` + `hairline`, which is a shadow-
// based stroke, never a literal CSS `border`: BUILD-A-SCREEN.md §6.1, "no
// CSS border, ever"), `Badge` (`components/badge/badge`, the "+N more"
// overflow chip — a label-only badge is exactly what that chip is), and
// `ScrollArea` (`components/scroll-area/scroll-area`, the phone pager's
// single-day body, which can run longer than the viewport once a day's own
// cap is lifted — see below).
//
// THE ONE-CALENDAR LAW STILL HOLDS (`web/test/rules.test.ts`'s
// `one-calendar`, this module's file header on `RecordCalendar`/
// `RecordAgenda` above it in the same folder): nothing outside
// `record-calendar.tsx` may import the kit's `calendar-view` or `agenda`
// directly. This file imports NEITHER — it is a third, independent shape,
// same as `RecordAgenda` is a third shape reached through its own door
// rather than a mode switch inside `RecordCalendar` (2026-09-15: "Agenda is
// a different component than month... When I mean calendar, I mean the
// month view"). `RecordWeek` reads `CalendarEntry` (`record-calendar.tsx`,
// this same folder) so all three shapes bucket the identical rows.
//
// THE EYEBROW IS THE TIME, AND ONLY THE TIME. `CalendarEntry.time` (extended
// there, this ruling's own paragraph) is drawn exactly the way
// `RecordFooterEyebrow` draws the ink footer's own eyebrow — `text-micro`
// uppercase `text-ink-tertiary` (`shared/ui/components/record-detail/
// record-detail.tsx`) — because that IS the kit's eyebrow style, the same
// treatment `record-chrome.tsx`'s own header points at for the identical
// reason. A card with no `time` draws no eyebrow: there is no placeholder
// dash, no reserved blank line: the row is one line shorter.
//
// THE PRIORITY DOT IS `dotTone` ONLY, NEVER `accent`. `RecordCalendar`'s own
// chips fall back to `accent`'s department hash when `dotTone` is absent
// (`dotClass`, that file); this component does not, because the ruling this
// file answers is specifically about the PRIORITY circle — "always show the
// priority color circle" (2026-09-15, quoted in full on `CalendarEntry.
// dotTone` itself) — not the department hash, which is a Month-grid-only
// convention. A card with no `dotTone` draws no dot, exactly as a card with
// no `time` draws no eyebrow.
//
// NO SORT CONTROL, ANYWHERE IN IT — client ruling, the same session:
// *"Never put the sort in calendar components. Make this a law. Makes no
// sense."* That law is R78 (`shared/rules/registry.ts`, enforced centrally in
// `web/components/deep-link/screen-bits.tsx`'s `<ToolbarRow>`, which drops
// its own sort control the moment a caller's `view.value` is "calendar",
// "week" or "agenda"): a screen that wires this component into its own
// `<ToolbarRow view={...}>` gets the suppression for free, structurally, the
// moment its view value is `"week"`. `RecordWeek` itself never had a sort
// slot to begin with — it draws no toolbar of any kind — so there is nothing
// here for R78 to guard; the guarantee lives one layer up, at the seam every
// calendar-shaped view already shares.
//
// PHONE = A DAY PAGER, SIX PAGES — the artifact's own W4 phone note: "Day
// pager, six pages. Continues the same compression: five weekday pages, one
// combined weekend page." So the phone pager does not offer seven pages for
// seven days; it offers the same five-plus-one shape the desktop grid draws,
// paged. Below `sm:` the grid is `hidden` and the pager takes over — a CSS
// breakpoint switch, not a device check in JS (the ADR `record-calendar.tsx`
// itself draws on, since kit v1.2.86 killed its own last device branch: "no
// device check any more").
import * as React from "react"

import { cn } from "@shared/ui/lib/utils"
import { Button } from "@shared/ui/components/button/button"
import { Card } from "@shared/ui/components/card/card"
import { Badge } from "@shared/ui/components/badge/badge"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { ScrollArea } from "@shared/ui/components/scroll-area/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@shared/ui/components/dialog/dialog"
import { CaretLeft, CaretRight } from "@shared/ui/foundations/icons"
import { List } from "@shared/web/list-compat"

import { formatDate } from "@shared/web/format"
import { useLanguage } from "@shared/web/language"
import type { Language, Vars } from "@shared/i18n"

import type { CalendarEntry, EntryDotTone } from "./record-calendar"

/* --------------------------------- dates ----------------------------------- */

const pad = (n: number) => String(n).padStart(2, "0")

/** Local `YYYY-MM-DD` — the same shape `record-calendar.tsx`'s own `dayKey`
 * builds, and for the identical reason: never `toISOString()`, which is UTC
 * and renders a meeting on the wrong side of midnight for anybody east of
 * Greenwich. */
function dayKeyOf(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** The reverse of `dayKeyOf` — LOCAL midnight, never `new Date(iso)` (that
 * constructor reads a bare date string as UTC). A key that is not three
 * numbers falls back to today rather than throwing. */
function parseLocalDay(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number)
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return new Date()
  return new Date(y, m - 1, d)
}

function mondayOf(d: Date): Date {
  const offset = (d.getDay() + 6) % 7 // days since Monday
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset)
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

/** Mon…Sun, in the reader's own locale — `record-calendar.tsx`'s own
 * `weekdayLabels`, copied rather than imported (it is not exported, and this
 * file owns no edit to that one beyond `CalendarEntry`). */
function weekdayShortLabels(lang: Language): string[] {
  return Array.from({ length: 7 }, (_, i) =>
    // 5 Jan 1970 was a Monday.
    new Date(1970, 0, 5 + i).toLocaleDateString(lang, { weekday: "short" })
  )
}

/** "Sep 14–20, 2026" (or "Sep 28 – Oct 4, 2026" across a month boundary) —
 * `record-calendar.tsx`'s own `monthLabel` reasoning, read the same way:
 * `Intl` directly, with the reader's own `lang`, never the ambient runtime
 * locale `undefined` would ask for. */
function weekRangeLabel(monday: Date, lang: Language): string {
  const sunday = addDays(monday, 6)
  const sameMonth =
    monday.getMonth() === sunday.getMonth() && monday.getFullYear() === sunday.getFullYear()
  const start = monday.toLocaleDateString(lang, { month: "short", day: "numeric" })
  const end = sunday.toLocaleDateString(
    lang,
    sameMonth ? { day: "numeric" } : { month: "short", day: "numeric" }
  )
  const year = sunday.toLocaleDateString(lang, { year: "numeric" })
  return `${start} to ${end}, ${year}`
}

/** A day key read as a full sentence, for the overflow dialog's own title —
 * `record-calendar.tsx`'s `formatDayKey`, same construction. */
function formatDayLong(key: string, lang: Language): string {
  return formatDate(parseLocalDay(key).toISOString(), lang)
}

/* --------------------------------- colour ----------------------------------- */

/** THE PRIORITY DOT'S OWN FILL — copied in shape from `badge.tsx`'s own
 * `DOT_FILL` (the app-stage six `--dot-*` tokens, plus priority's own four)
 * for the same reason `record-calendar.tsx` already copies it rather than
 * importing it: the kit exports the `Badge` COMPONENT, not this map, and
 * `Badge` itself is reserved in this file for the overflow chip (see
 * `WeekOverflowChip` below) — a card wearing a `Badge` around its whole body
 * would nest one rounded, coloured surface inside another. A
 * `Record<EntryDotTone, …>` (never a template literal) means a ninth tone
 * the kit ever grows fails this file's type check instead of silently
 * painting nothing.
 *
 * EXTENDED TO THE FOUR PRIORITY TONES (kit v1.2.89, `--dot-red`/`--dot-
 * orange`/`--dot-purple`/`--dot-blue`) the day `PRIORITY_DOT_TONE`
 * (`shared/departments.ts`) stopped borrowing four of the app-stage six —
 * `record-calendar.tsx`'s own identical map grew the same four, the same
 * day, for the same reason. */
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

/* ------------------------------- the pieces --------------------------------- */

const MAX_PER_DAY = 3 // same default `RecordCalendar`'s own month grid ships

function EntryDot({ tone }: { tone: EntryDotTone }) {
  return <span aria-hidden className={cn("size-1.5 shrink-0 rounded-pill", DOT_FILL[tone])} />
}

/** ONE ENTRY, drawn as its own bordered card — the mockup's `.task-card`.
 * `Card` supplies the box (`variant="raised"` + `hairline`, a shadow-based
 * stroke); a real `<button>` inside it is the whole target, so the click
 * target, the focus ring and the hover state are all the browser's, not
 * hand-rolled. Undefined `onSelect` still draws the card — a caller with
 * nothing to open on select still gets a face for the record — it just
 * is not a button. */
function EntryCard({
  entry,
  onSelect,
}: {
  entry: CalendarEntry
  onSelect?: (entry: CalendarEntry) => void
}) {
  const body = (
    <>
      {/* THE EYEBROW — the file header's own ruling. Undefined `time` draws
          nothing at all, never a placeholder line. */}
      {entry.time ? (
        <span className="text-micro block font-[var(--font-weight-medium)] uppercase text-ink-tertiary">
          {entry.time}
        </span>
      ) : null}
      <span className="flex min-w-0 flex-wrap items-center gap-1.5">
        {entry.dotTone ? <EntryDot tone={entry.dotTone} /> : null}
        <span className="min-w-0 truncate text-sm">{entry.title}</span>
      </span>
    </>
  )
  return (
    <Card variant="raised" hairline className="min-w-0">
      {onSelect ? (
        <button
          type="button"
          onClick={() => onSelect(entry)}
          className="flex w-full min-w-0 flex-col gap-0.5 rounded-[var(--radius)] p-2 text-start"
        >
          {body}
        </button>
      ) : (
        <div className="flex min-w-0 flex-col gap-0.5 p-2">{body}</div>
      )}
    </Card>
  )
}

/** The "+N more" chip — the mockup's own wording, reused verbatim from
 * `record-calendar.tsx`'s identical overflow ("+{n} more"), so the two
 * shapes never disagree about how a hidden count is said. A real `Badge`
 * (never a hand-rolled pill): a label-only chip is exactly its job. */
function WeekOverflowChip({
  hidden,
  onOpen,
  t,
}: {
  hidden: number
  onOpen: () => void
  t: (english: string, vars?: Vars) => string
}) {
  return (
    <button type="button" onClick={onOpen} className="block w-full">
      <Badge variant="secondary" size="pill" className="w-full justify-center">
        {t("+{n} more", { n: hidden })}
      </Badge>
    </button>
  )
}

/** ONE DAY'S HEADING PILL — ink when `today`, the same ink/quiet split
 * `record-calendar.tsx`'s own month grid draws for the identical reason
 * (client ruling, "make the tasks' background black instead of beige").
 * `compact` is the folded weekend's own smaller pill — one component, two
 * sizes, rather than a second copy. */
function WeekDayHead({
  weekday,
  dateNum,
  today,
  compact,
}: {
  weekday: string
  dateNum: number
  today: boolean
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-1 rounded-pill px-3",
        compact ? "py-1 text-[10px]" : "py-1.5 text-xs",
        today ? "bg-surface-inverse text-ink-on-inverse" : "bg-muted"
      )}
    >
      <span
        className={cn(
          "font-semibold uppercase tracking-wide",
          compact ? "text-[9px]" : "text-[10px]",
          today ? "text-ink-on-inverse-secondary" : "text-muted-foreground"
        )}
      >
        {weekday}
      </span>
      <span className="tabular-nums font-semibold">{dateNum}</span>
    </div>
  )
}

/** ONE DAY'S BODY — loading skeleton, "nothing here" dash, or the entries
 * themselves, capped or not. `cap === null` is the phone pager's own reading
 * (one day, on its own screen, gets everything rather than a second fold). */
function WeekDayBody({
  entries,
  cap,
  loading,
  onSelect,
  onOverflow,
  t,
}: {
  entries: CalendarEntry[]
  cap: number | null
  loading: boolean
  onSelect?: (entry: CalendarEntry) => void
  onOverflow?: () => void
  t: (english: string, vars?: Vars) => string
}) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-12 w-full rounded-[var(--radius)]" label={t("Loading…")} />
        <Skeleton className="h-12 w-full rounded-[var(--radius)]" label={t("Loading…")} />
      </div>
    )
  }
  if (entries.length === 0) {
    return (
      <p aria-hidden className="px-1 py-2 text-center text-xs text-ink-disabled">
        &mdash;
      </p>
    )
  }
  const shown = cap !== null ? entries.slice(0, cap) : entries
  const hidden = entries.length - shown.length
  return (
    <div className="flex flex-col gap-2">
      {shown.map((e) => (
        <EntryCard key={e.id} entry={e} onSelect={onSelect} />
      ))}
      {hidden > 0 && onOverflow ? (
        <WeekOverflowChip hidden={hidden} onOpen={onOverflow} t={t} />
      ) : null}
    </div>
  )
}

/* -------------------------------- the week ---------------------------------- */

export function RecordWeek({
  entries,
  weekOf,
  onSelect,
  onWeekChange,
  loading = false,
}: {
  /** every record with a date, in any order — this component buckets them by
   *  `day` itself, the same contract `RecordCalendar` takes. */
  entries: CalendarEntry[]
  /** WHICH WEEK IS ON SCREEN AT MOUNT, as any ISO day inside it — default
   * today. Read ONCE: exactly like `RecordCalendar`'s own month, the week
   * this component is looking at is state it owns from here on, moved by its
   * own Prev/Next/Today controls, and told to the host through
   * `onWeekChange` rather than fed back in. A caller that needs to jump this
   * component to a specific week after mount remounts it (a fresh `key`),
   * the same escape hatch every other engine-owned piece of state in this
   * app takes. */
  weekOf?: string
  /** open the record — handed the whole entry, never just its id, since a
   *  week's cards do not carry a second lookup table the way `RecordCalendar`
   *  needs one for its `onOpen(id)`. */
  onSelect?: (entry: CalendarEntry) => void
  /** WHICH WEEK IS ON SCREEN, told to the host as the week's own Monday,
   * `YYYY-MM-DD` — on mount and on every move, the identical contract
   * `RecordCalendar`'s `onMonthChange` keeps for its month. */
  onWeekChange?: (weekStartIso: string) => void
  /** busy — every day draws two skeleton bars instead of its cards. Weekly
   *  navigation stays live while loading; only the entries are unknown. */
  loading?: boolean
}) {
  const { t, lang } = useLanguage()
  const weekdayLabels = React.useMemo(() => weekdayShortLabels(lang), [lang])

  const [monday, setMonday] = React.useState(() =>
    mondayOf(weekOf ? parseLocalDay(weekOf) : new Date())
  )
  const weekTag = dayKeyOf(monday)
  React.useEffect(() => {
    onWeekChange?.(weekTag)
  }, [weekTag, onWeekChange])

  const weekDays = React.useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(monday, i)),
    [monday]
  )

  // THE PHONE PAGER'S OWN PAGE — 0..4 are Mon..Fri, 5 is the combined
  // weekend page (the artifact's own "six pages" note, file header above).
  // Clamped rather than wrapped into the next/previous week: the week-level
  // Prev/Next controls (drawn on BOTH breakpoints, above the grid and above
  // the pager alike) are the one door that moves the week; the pager's own
  // arrows step a day at a time inside it and stop at either edge.
  const [pagerIndex, setPagerIndex] = React.useState(() => {
    const todayIdx = weekDays.findIndex((d) => dayKeyOf(d) === dayKeyOf(new Date()))
    return todayIdx === -1 ? 0 : Math.min(todayIdx, 5)
  })

  const [openDay, setOpenDay] = React.useState<string | null>(null)
  const todayKey = dayKeyOf(new Date())

  const byDay = React.useMemo(() => {
    const map = new Map<string, CalendarEntry[]>()
    for (const e of entries) {
      const list = map.get(e.day)
      if (list) list.push(e)
      else map.set(e.day, [e])
    }
    return map
  }, [entries])

  function goToWeek(nextMonday: Date, pagerTo = 0) {
    setMonday(nextMonday)
    setPagerIndex(pagerTo)
  }

  function goToday() {
    const now = new Date()
    const dow = (now.getDay() + 6) % 7 // 0=Mon…6=Sun
    goToWeek(mondayOf(now), Math.min(dow, 5))
  }

  const openEntries = openDay ? (byDay.get(openDay) ?? []) : []

  return (
    <div className="flex w-full flex-col gap-4">
      {/* THE PERIOD, AND THE MOVE — one row, both breakpoints: which week,
          then the three ways to move it. Same shape `RecordCalendar` draws
          for its month (this folder's own header comment on that
          component). */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-medium">{weekRangeLabel(monday, lang)}</div>
        <div className="flex items-center gap-1">
          {/* R98 — a toolbar button is the kit's default height, never `sm`. */}
          <Button variant="secondary" onClick={goToday}>
            {t("Today")}
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="size-8"
            aria-label={t("Previous week")}
            onClick={() => goToWeek(addDays(monday, -7))}
          >
            <CaretLeft />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="size-8"
            aria-label={t("Next week")}
            onClick={() => goToWeek(addDays(monday, 7))}
          >
            <CaretRight />
          </Button>
        </div>
      </div>

      {/* FIVE WORKDAY COLUMNS + ONE FOLDED WEEKEND COLUMN — W4, hidden below
          `sm:`. */}
      <div className="hidden grid-cols-[repeat(5,minmax(0,1fr))_minmax(160px,200px)] gap-3 sm:grid">
        {weekDays.slice(0, 5).map((d, i) => {
          const key = dayKeyOf(d)
          return (
            <div key={key} className="flex min-w-0 flex-col gap-2">
              <WeekDayHead weekday={weekdayLabels[i]} dateNum={d.getDate()} today={key === todayKey} />
              <WeekDayBody
                entries={byDay.get(key) ?? []}
                cap={MAX_PER_DAY}
                loading={loading}
                onSelect={onSelect}
                onOverflow={() => setOpenDay(key)}
                t={t}
              />
            </div>
          )
        })}
        <div className="flex min-w-0 flex-col gap-3">
          <div className="rounded-pill bg-muted px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("Weekend")}
          </div>
          {[5, 6].map((i) => {
            const d = weekDays[i]
            const key = dayKeyOf(d)
            return (
              <div key={key} className="flex min-w-0 flex-col gap-1.5">
                <WeekDayHead
                  compact
                  weekday={weekdayLabels[i]}
                  dateNum={d.getDate()}
                  today={key === todayKey}
                />
                <WeekDayBody
                  entries={byDay.get(key) ?? []}
                  cap={MAX_PER_DAY}
                  loading={loading}
                  onSelect={onSelect}
                  onOverflow={() => setOpenDay(key)}
                  t={t}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* PHONE: ONE DAY AT A TIME, SIX PAGES — hidden at `sm:` and above. No
          cap and no overflow chip here (`cap={null}`): the day already has
          the whole screen, so `ScrollArea` carries whatever does not fit
          rather than folding it a second time. */}
      <div className="flex flex-col gap-3 sm:hidden">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="secondary"
            size="icon"
            className="size-8"
            aria-label={t("Previous day")}
            disabled={pagerIndex === 0}
            onClick={() => setPagerIndex((i) => Math.max(0, i - 1))}
          >
            <CaretLeft />
          </Button>
          <div className="text-sm font-medium">
            {pagerIndex < 5
              ? `${weekdayLabels[pagerIndex]} ${weekDays[pagerIndex].getDate()}`
              : t("Weekend")}
          </div>
          <Button
            variant="secondary"
            size="icon"
            className="size-8"
            aria-label={t("Next day")}
            disabled={pagerIndex === 5}
            onClick={() => setPagerIndex((i) => Math.min(5, i + 1))}
          >
            <CaretRight />
          </Button>
        </div>
        <ScrollArea className="h-[min(60vh,32rem)]">
          <div className="flex flex-col gap-3 pe-3">
            {pagerIndex < 5 ? (
              <WeekDayBody
                entries={byDay.get(dayKeyOf(weekDays[pagerIndex])) ?? []}
                cap={null}
                loading={loading}
                onSelect={onSelect}
                t={t}
              />
            ) : (
              [5, 6].map((i) => {
                const d = weekDays[i]
                const key = dayKeyOf(d)
                return (
                  <div key={key} className="flex min-w-0 flex-col gap-1.5">
                    <WeekDayHead
                      compact
                      weekday={weekdayLabels[i]}
                      dateNum={d.getDate()}
                      today={key === todayKey}
                    />
                    <WeekDayBody
                      entries={byDay.get(key) ?? []}
                      cap={null}
                      loading={loading}
                      onSelect={onSelect}
                      t={t}
                    />
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>
      </div>

      {/* THE DAY, opened from "+N more" — everything on that day, the same
          "a click that opens nothing is the bug" reasoning `record-
          calendar.tsx`'s own dialog carries (UI-GAPS #22). Desktop grid
          only: the phone pager already shows a day's every entry. */}
      <Dialog open={openDay !== null} onOpenChange={(next) => !next && setOpenDay(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{openDay ? formatDayLong(openDay, lang) : ""}</DialogTitle>
          </DialogHeader>
          <List
            surface="none"
            items={openEntries.map((e) => ({
              id: e.id,
              leading: e.dotTone ? (
                <span
                  aria-hidden
                  className={cn("mt-1.5 block size-2.5 shrink-0 rounded-pill", DOT_FILL[e.dotTone])}
                />
              ) : undefined,
              title: e.title,
              subtitle: e.time,
            }))}
            onItemClick={(item) => {
              setOpenDay(null)
              const entry = openEntries.find((e) => e.id === item.id)
              if (entry) onSelect?.(entry)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
