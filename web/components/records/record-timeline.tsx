"use client"

// RECORD TIMELINE — the Waves T3 ruling's own week-gridded, segmented bar.
//
// WHY THIS IS NOT THE KIT'S `Gantt` (shared/ui/components/gantt/gantt.tsx).
// `Gantt` draws a lane per record with several non-overlapping bars inside
// it, which technically covers "one wave, several sprint segments" — but
// three of its own CH27.26 laws are load-bearing and none of them is this
// ruling's shape:
//   · SIX PERIODS IS A CEILING, NOT A HINT — this screen wants the whole
//     Sep–Nov window in view at once, never a paged six-week slice.
//   · THE STEPPER IS THE ONLY WAY TO MOVE, and below 720 the grid is
//     REPLACED by one row per lane — this ruling asks for prev/next/today
//     "like RecordCalendar" on every width, and a phone that scrolls the
//     grid itself with snap (the artifact's own pick), never a fallback that
//     drops the grid.
//   · FIVE FIXED TONES, NONE OF THEM NEUTRAL — a wave's own gap between two
//     sprints (its "base bar") has no accent to wear; `Gantt`'s tone enum has
//     no fifth, quiet option and cannot be given one without a kit change,
//     which is out of this lane's authorised scope (Waves owns the app side
//     only; the kit touch this brief authorises is the Calendar's span
//     primitive, not the Gantt).
//
// Reusing `Gantt` here would mean either the timeline is honest about its
// own axis and silently breaks the kit's stated law, or it is bent to fit
// six periods and a stepper the client did not ask for. So this is a second,
// bespoke, HOST-COMPOSED component instead — built only from the kit's own
// primitives (`Button`, its icons, its colour tokens) — the same category
// CLAUDE.md already names for `roles-matrix.tsx`: "a this-app-specific
// control still belongs in web/components/, never in shared/ui/." R39 stays
// intact: nothing here imports a UI package the kit does not already carry.
//
// ONE HOST, the same pattern the "ONE CALENDAR" law uses: `waves-screen.tsx`
// is this file's only caller today. A second screen that wants a
// week-gridded, segmented bar reaches for this component rather than
// growing a third copy.
//
// PHONE: the whole grid scrolls horizontally with CSS scroll-snap
// (`overflow-x-auto` + `snap-x snap-mandatory`, each week column
// `snap-start`) on every width — the artifact's own pick for T3 — rather
// than the kit's own "grid becomes rows below 720" fallback, which this file
// does not draw at all.

import * as React from "react"

import { Button } from "@shared/ui/components/button/button"
import { CaretLeft, CaretRight } from "@shared/ui/foundations/icons"
import { cn } from "@shared/ui/lib/utils"
import { useLanguage } from "@shared/web/language"
import { CollectionEmptyState } from "@shared/web/screen-engine/collection-frame"

/** ONE SEGMENT of one row's bar. Columns are WEEKS, zero-based against the
 * caller's own `weeks` window — the same start/span-in-columns shape the
 * kit's own `GanttBar` uses, so a caller already comfortable with that
 * arithmetic (`waves-screen.tsx`'s own `waveTimelineWindow`, before this
 * ruling read it in months) finds nothing new here. */
export type TimelineSegment = {
  id: string
  label: React.ReactNode
  /** first week-column this segment covers. */
  start: number
  /** how many week-columns it spans — the caller floors this at 1. */
  span: number
  /** upcoming/running/wrapped are a sprint's own three states
   * (`sprintState`, shared/sprint-state.ts); `gap` is the wave's own base
   * bar between two sprints, or the whole bar for a wave this file could
   * not find a sprint row for. `expected` (added 21 Sep 2026, Aurora's phase
   * days ruling) is a phase that carries no dates of its own yet, drawn as a
   * projected span off its type's day count, a forecast, never a fact, so
   * it wears a lighter fill than the three real sprint states above. */
  tone: "upcoming" | "running" | "wrapped" | "gap" | "expected"
  /** the exact dates, already formatted by the caller (ruling 07) — the
   * hover/focus tooltip and the accessible name both read this. */
  title?: string
  /** absent on a `gap` segment: a gap is not a record and opens nothing. */
  onSelect?: () => void
}

export type TimelineRow = {
  id: string
  label: React.ReactNode
  /** A SECOND, MUTED LINE under `label` — added for the client's 16 Sep 2026
   * ruling ("what I want in the left column is the name of the app and the
   * icon"): the left column now carries the row's FACE (an app's mark and
   * name, or the row's own name where it has no face), and whatever used to
   * be the whole of `label` moves down here rather than onto the bar itself.
   * A T3 segment is `h-6` (24px) and already carries its own sprint's name —
   * there is no room in there for a second tier of text, so the caller's own
   * choice (see `waves-screen.tsx#buildWaveTimelineRows`) is this line,
   * always, rather than a conditional squeeze that depends on how short the
   * bar happens to be this week. Omitted where there is nothing more to say
   * (the row's face already IS its only name). */
  sublabel?: React.ReactNode
  segments: TimelineSegment[]
  /** clicking the row's own name opens the wave; absent draws plain text. */
  onSelectLabel?: () => void
}

const TONE_FILL: Record<TimelineSegment["tone"], string> = {
  // The same three accents `Gantt`'s own BAR_TONE reaches for — sky, then
  // charcoal for what is live right now, forest for what has wrapped —
  // never a fourth colour invented for this file alone.
  upcoming: "bg-chart-1 text-ink-on-accent",
  running: "bg-surface-inverse text-ink-on-inverse",
  wrapped: "bg-chart-2 text-ink-on-accent",
  // The wave's own base bar: a quiet, existing surface token (the same one
  // every plain collection row already stands on), never a new hex.
  gap: "bg-surface-panel text-muted-foreground",
  // A PROJECTED SPAN, NEVER A FACT: the same accent `upcoming` wears
  // (`bg-chart-1`, sky), at a third its strength, so an expected phase reads
  // as kin to a real upcoming one rather than a wholly new colour, and still
  // plainly lighter than every dated segment beside it.
  expected: "bg-chart-1/30 text-foreground",
}

// Bumped from 2.25rem (one line) so a row carrying a `sublabel` — the ordinary
// case now, see `TimelineRow` above — has room for both lines without the bar
// looking cramped against the label column beside it. A row with no sublabel
// simply sits a little taller than it strictly needs to, which reads as more
// consistent than two different row heights on one grid.
const ROW_MIN_HEIGHT = "min-h-[2.75rem]"

export function RecordTimeline({
  weeks,
  rows,
  todayIndex,
  onPrevious,
  onNext,
  onToday,
  windowLabel,
  loading = false,
  empty = false,
  emptyTitle,
  label,
}: {
  /** the week-column headers, already formatted by the caller. */
  weeks: string[]
  rows: TimelineRow[]
  /** which column is "this week" — undefined when today falls outside the
   * visible window, in which case nothing is marked. */
  todayIndex?: number
  /** move the window back a page. Without it the control is not rendered —
   * the same "an arrow with no handler is not drawn dead" shape
   * `GanttPeriodStepper` uses. */
  onPrevious?: () => void
  onNext?: () => void
  /** jump back to the window centred on today. Absent hides the button. */
  onToday?: () => void
  windowLabel?: React.ReactNode
  /** the rows have not arrived yet. */
  loading?: boolean
  /** force the empty register — no rows already reads as empty on its own. */
  empty?: boolean
  /** THE R62 FILTERED SENTENCE, papered through `CollectionEmptyState`. This
   * branch is never the genuinely-empty collection — the caller's own
   * `all.length === 0` check owns that zero above every view branch (R88) —
   * it is always "the collection holds rows, none fall in what's on screen
   * right now": a search that narrowed to nothing, or a window with no
   * dated wave in it. Read as `CollectionEmptyState`'s own `filteredTitle`,
   * so it papers itself the same as every other zero on this screen and
   * carries no create door (`filtered` withdraws it). */
  emptyTitle?: string
  /** the grid's accessible name. */
  label?: string
}) {
  const { t } = useLanguage()
  const count = Math.max(1, weeks.length)
  const isEmpty = empty || (!loading && rows.length === 0)

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {/* M8, below `sm`: this nav row plus the week-grid beneath it is chrome
          no other collection screen carries (mobile audit — Waves' own
          "date-range navigator/week strip"). `flex-wrap` let a long window
          label push Today/◀/▶ onto a second line there; `flex-nowrap` plus a
          truncatable label keeps it one line instead. `sm:flex-wrap` restores
          the exact original behaviour at `sm` and above. */}
      <div className="flex flex-nowrap items-center justify-between gap-2 sm:flex-wrap">
        <div className="min-w-0 truncate text-sm font-medium">{windowLabel}</div>
        <div className="flex shrink-0 items-center gap-1">
          {onToday ? (
            // R98 — a toolbar button is the kit's default height, never `sm`.
            <Button variant="secondary" onClick={onToday}>
              {t("Today")}
            </Button>
          ) : null}
          {onPrevious ? (
            <Button
              variant="secondary"
              size="icon"
              className="size-8"
              aria-label={t("Earlier")}
              onClick={onPrevious}
            >
              <CaretLeft />
            </Button>
          ) : null}
          {onNext ? (
            <Button
              variant="secondary"
              size="icon"
              className="size-8"
              aria-label={t("Later")}
              onClick={onNext}
            >
              <CaretRight />
            </Button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="text-muted-foreground flex items-center gap-2 py-6 text-sm">
          {t("Loading…")}
        </div>
      ) : isEmpty ? (
        <CollectionEmptyState
          filtered
          title={emptyTitle ?? t("Nothing matched.")}
          filteredTitle={emptyTitle}
        />
      ) : (
        // THE SCROLL, ON EVERY WIDTH — `snap-x snap-mandatory` and each week
        // header carries `snap-start`, so a phone drags the grid itself
        // (the artifact's own pick for T3) rather than losing the grid the
        // way the kit's own narrow fallback would.
        <div className="overflow-x-auto rounded-[var(--radius)] bg-card" style={{ scrollSnapType: "x mandatory" }}>
          <div className="min-w-max" aria-label={label ?? t("Waves timeline")}>
            <div
              // The rule under the head, an inset shadow — never a `border`
              // property (the kit's own borders law: a bare `border-b`
              // resolves to full-strength ink under Tailwind v4's preflight
              // where the kit's own hairline is an 8% edge; `Gantt` draws its
              // own head rule the identical way).
              className="grid gap-px px-3 pt-2 pb-2 shadow-[var(--hairline-under)]"
              style={{ gridTemplateColumns: `10rem repeat(${count}, minmax(3.25rem, 1fr))` }}
            >
              <span aria-hidden="true" />
              {weeks.map((w, i) => (
                <span
                  key={i}
                  style={{ scrollSnapAlign: "start" }}
                  aria-current={i === todayIndex ? true : undefined}
                  className={cn(
                    "truncate px-1 text-center text-xs tabular-nums",
                    i === todayIndex ? "font-medium text-foreground" : "text-muted-foreground"
                  )}
                >
                  {w}
                </span>
              ))}
            </div>

            {rows.map((row) => (
              <div
                key={row.id}
                className={cn(
                  "grid items-center gap-px px-3 py-2 shadow-[var(--hairline-under)] last:shadow-none",
                  ROW_MIN_HEIGHT
                )}
                style={{ gridTemplateColumns: `10rem repeat(${count}, minmax(3.25rem, 1fr))` }}
              >
                {/* TWO LINES, ONE GRID CELL — the row's face (an icon +
                    name, or plain text) on top, `sublabel` muted underneath.
                    Neither line forces `truncate` on `row.label`/`sublabel`
                    directly any more: the content can be a flex row (a mark
                    beside a name), and truncating an ARBITRARY node clips it
                    without the ellipsis text-overflow was meant to draw — the
                    caller truncates its own name text where it actually is
                    one (waves-screen.tsx's own icon+name spans do exactly
                    that, the same pattern waveListRows already uses for the
                    account cell). */}
                <div className="flex min-w-0 flex-col gap-0.5 pe-2">
                  {row.onSelectLabel ? (
                    <button
                      type="button"
                      onClick={row.onSelectLabel}
                      className="min-w-0 text-start text-sm font-medium underline-offset-2 hover:underline"
                    >
                      {row.label}
                    </button>
                  ) : (
                    <span className="min-w-0 text-sm font-medium">{row.label}</span>
                  )}
                  {row.sublabel ? (
                    <span className="text-muted-foreground min-w-0 truncate text-xs">{row.sublabel}</span>
                  ) : null}
                </div>

                <div
                  className="relative grid h-6"
                  style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`, gridColumn: `2 / span ${count}` }}
                >
                  {weeks.map((_, i) => (
                    <span
                      key={i}
                      aria-hidden="true"
                      style={{ gridRow: 1, gridColumn: i + 1, scrollSnapAlign: "start" }}
                      className={cn(i === todayIndex && "bg-accent")}
                    />
                  ))}
                  {row.segments.map((seg) => {
                    const span = Math.max(1, Math.floor(seg.span))
                    const start = Math.max(0, Math.floor(seg.start))
                    const style: React.CSSProperties = {
                      gridRow: 1,
                      gridColumn: `${start + 1} / span ${Math.min(span, count - start)}`,
                    }
                    const classes = cn(
                      // `rounded-[var(--radius-sm)]` — the kit's own bar radius
                      // (`Gantt`'s identical bars use it too), not the bare
                      // Tailwind `rounded` key the kit's own conformance law
                      // refuses on sight (radii.mjs).
                      "flex min-w-0 items-center truncate rounded-[var(--radius-sm)] px-2 text-xs font-medium",
                      TONE_FILL[seg.tone]
                    )
                    return seg.onSelect ? (
                      <button
                        key={seg.id}
                        type="button"
                        style={style}
                        title={seg.title}
                        aria-label={seg.title}
                        onClick={seg.onSelect}
                        className={cn(classes, "cursor-pointer hover:opacity-90")}
                      >
                        {seg.label}
                      </button>
                    ) : (
                      <span key={seg.id} style={style} title={seg.title} className={classes}>
                        {seg.tone === "gap" ? null : seg.label}
                      </span>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
