"use client"

// THE EFFORT CARD — one shared shell for the story page and the ticket page,
// so the two draw the identical thing rather than two hand-kept copies of it
// (Aurora's ruling, 21 Sep 2026, B44 amended, verbatim: "ok, but i still want
// to see the individual records of time og! also show avatar of perosn.
// bring back the old cards with the metrics inside effort" and, the same
// round, over the "+" this card used to carry: "in effort card inside
// stories or tickets, rmeove the + button (we have the start on top!)").
//
// THE ROUND BEFORE THIS ONE HAD ALREADY FOLDED THE THREE METRIC LINES (Cycle
// time / Effort / Flow efficiency) INTO THIS CARD AND DROPPED THE PER-LOG
// ROWS — `WorkLogsPanel`'s own list, story-detail.tsx's own header carries
// that account. That round put the rows BACK, with a face on every one
// (R35/R90), and took the "Log time" door back OUT: the head's own
// Start/Stop timer button (`RecordTimerButton`) is the one way a new row is
// ever written from either of these two pages now — correcting a row ALREADY
// written stayed (a pencil beside it), because correcting one is not adding
// one.
//
// THE METRICS ARE HANDED IN, NOT READ HERE. A story's three figures come off
// `getStoryMetrics` (`POST /api/content/stories/metrics`) and a ticket's off
// `getTicketMetrics` (`POST /api/content/help/metrics`) — two different doors
// over two different "done" moments (`story_status_events` vs. `help.
// resolved_at`, see that function's own header) — so this component only
// draws whatever `TicketMetrics`-shaped object its caller already fetched,
// rather than knowing which target table means which door.
//
// `metrics` IS OPTIONAL — a task carries neither a cycle-time clock nor a
// status-event trail, so there is no third door to hand in. Left off (task
// sheet), the three-tile row (Cycle time / Effort hours / Flow efficiency)
// does not draw at all, never three placeholder tiles for a concept the
// record does not have.
//
// AMENDED, 22 SEP 2026 — Aurora, verbatim, reviewing the deployed card:
// "remove the pencil. when clicking one detail in slide in, and there have
// the option to edit. make the metrics cards inside the container, like in
// the metrics artifact you did for me! next to effort show the count of
// record, not the total hours (that has a metric on itself)." And, the same
// round, from the task review: "if no time logged yet, hide that component.
// when time logged, as i said before, i want to see the avatar in each row."
//
// A SIXTH CHANGE, THE SAME DAY, OVER THE VALIDATED ARTIFACT — Aurora,
// verbatim: "Fifth screenshot. That's definitely not what you showed me on
// the artifact. Make sure that you review your artifact, and please correct
// that. What's wrong is the alignment and margin in the metrics cards, and
// that the rows below should not have a background." Read against
// `${SCRATCH}/no-containers-exploration.html`'s own Effort mock
// (`.mk-stats`/`.mk-tile`, three figure tiles, then `.mk-row` log lines): the
// tiles are a `display:flex; gap:16px` row, no inset of its own beyond the
// section's, and the log rows carry no fill at all, `padding:6px 0`, flush
// with the same left edge. Two fixes: the tile grid's own gap moves from
// `--space-3h` (14px) to `--space-4` (16px), the mock's own figure, and the
// per-log `<ul>` loses its `bg-surface-panel`/`rounded`/`divide-y` (a border
// utility) — the kit `Separator` sits between rows instead, and each row
// drops its own horizontal inset so it lands on the section's left edge, the
// same edge the title and the tiles already stand on. The three tiles keep
// their own paper (`PAPER_ON_PURPOSE`, `shared/rules/registry.ts` — "this is
// a metric, like in kit"); only the log rows below them go plain.
//
// FOUR CHANGES, THIS ROUND:
//
//   1. THE TITLE'S OWN COUNT IS A RECORD COUNT NOW, not an hour total — "6",
//      never "6.5h": the hours already have their own tile (2), so the same
//      figure said twice was exactly what her sentence in parentheses
//      objects to. Read off the SAME `workLogs` list door this card already
//      calls for its rows — the door's own exact `total` (R14/R16,
//      `pagedJson`'s own COUNT(*)) — primed into `workLogsTotalKey`
//      (`work-logs-panel.tsx`), the identical sidecar a Time tab badge on
//      this record would already read. Never a second door: the row-count
//      question and the row-list question are one fetch, which is also why
//      `recordTimeSummaryKey`'s own separate aggregate read is gone from
//      this file — nothing here needs it any more.
//   2. THE THREE METRIC LINES ARE STAT TILES NOW, drawn through the kit's own
//      `<StatGrid>` (`shared/ui/components/stat-grid/stat-grid.tsx`) rather
//      than the hand-rolled three-column grid this file used to draw by
//      hand — the same primitive `work-logs-panel.tsx`'s own Numbers band
//      and `pulse.tsx`'s dashboard already call. The middle tile reads
//      "Effort hours" rather than "Effort": the title's own count already
//      answers "Effort" (change 1), so the tile answers the different
//      question beside it instead of repeating the word. See
//      `COUNT_REGISTER_EXEMPT` (`shared/rules/registry.ts`) for why R97 (a
//      count never gets its own card) does not forbid this — she has now
//      explicitly asked for these three as tiles.
//   3. NO PENCIL. A row is a real `<button>` (keyboard reachable): clicking
//      one opens the SAME slide-in sheet a pencil used to open
//      (`TimeFormDialog`, already `FormShellDialog`-built on the kit's own
//      `Sheet`, R59 — the row's own fields, Save/Cancel), through the
//      identical `correct()` call. A row still needs `work:update`
//      (`canEdit`) plus a settled, non-discarded entry to be a button at
//      all — correcting a still-running or already-discarded row was never
//      offered before and is not being offered now; only the door into a
//      correction moved from a small icon onto the row itself.
//   4. ZERO RECORDS DRAWS NOTHING — not `EmptyGatedPanel`'s own header-only
//      drop, the WHOLE card, no sentence, no card, nothing at all: the
//      head's own Start/Stop timer button is the one way in, and a card
//      that says "No time logged yet." beside a Start button that already
//      says the same thing is the component her words ask to hide.
//
// THE ROWS THEMSELVES are the one thing genuinely shared at the data layer
// too: `recordTimeKey(targetTable, targetId)` is the SAME cache key
// `WorkLogsPanel` reads for a task or a meeting, already a `time-of:` R15
// live listener, so a timer stopped from the header bar updates this card
// with no reload exactly as it always has.
//
// A FIFTH CHANGE, SAME DAY: Aurora, verbatim, reviewing the deployed tiles,
// "good. add kind of card background behind cards, this is a metric, like in
// kit." The three tiles drew no visible card fill. `StatGrid`'s own `tone`
// only maps to `Card` variant `default` ("quiet", `bg-surface-panel`, chosen
// upstream precisely because a dashboard's strip sits BARE on the off-beige
// body pane), `brand` or `inverse`, never `raised`, and this card's own
// tiles sit inside `EmptyGatedPanel`'s `<Card variant="default">`, so a
// `default` tile nested in a `default` panel painted the identical soft-paper
// tone on top of itself (contrast 1.000, the exact K1/override-77 collision
// `card.tsx`'s own header describes: "off-beige over soft paper … only reads
// as raised when it sits inside a `--surface-panel` band"). `StatGrid` has no
// prop for the raised tone, so each tile is wrapped in the kit's own
// `<Card variant="default">` by hand, with `<StatGrid surface="bare">`'s
// register (label / value, no card of its own) drawn inside it: the kit's
// stat markup, the kit's card, never a hand-rolled fill or border.

import * as React from "react"

import { Badge } from "@shared/ui/components/badge/badge"
import { Card, CardContent } from "@shared/ui/components/card/card"
import { Separator } from "@shared/ui/components/separator/separator"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { StatGrid } from "@shared/ui/components/stat-grid/stat-grid"
import { toast } from "@shared/ui/components/sonner/sonner"
import { RecordMark } from "@shared/web/record-mark"
import { EmptyGatedPanel } from "@/components/deep-link/screen-bits"
import { LoadMore } from "@/components/records/load-more"
import { TimeFormDialog, type TimeFormValues } from "@/components/work/time-form-dialog"
import { content as contentApi } from "@/lib/api"
import { cursorKey, recordTimeKey, workLogsTotalKey } from "@/lib/live-resources"
import { memberFace } from "@/components/tickets/tickets-collection"
import type { TeamMember, WorkLog } from "@shared/types"
import { staffNameFromSnapshot } from "@shared/staff-name"
import { formatCount } from "@shared/web/format-count"
import { invalidate, primeCache, useCached, useCachedValue } from "@shared/web/store"
import { useLanguage } from "@shared/web/language"

/** THE SAME SHAPE `StoryMetrics`/`TicketMetrics` CARRY (shared/types.ts) —
 * read structurally rather than importing either name, so this file draws
 * whichever door's answer its caller hands it without caring which one. */
export type EffortMetrics = {
  cycleTimeSeconds: number | null
  effortSeconds: number
  flowEfficiency: number | null
}

/** Whole seconds → "3.5h", "0h" — the Effort hours tile's own figure. */
function hoursLabel(seconds: number): string {
  const hours = Math.round((seconds / 3600) * 10) / 10
  return `${hours}h`
}

/** Cycle time, as a sentence read at a glance — "2d 3h", "6h", never a bare
 * decimal. Days first: a story's or a ticket's own cycle is ordinarily
 * measured in days, not fractions of an hour. */
function cycleTimeLabel(seconds: number): string {
  const totalHours = Math.round(seconds / 3600)
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`
  return `${hours}h`
}

/** Whole seconds → the hours and minutes a row shows — the same rounding
 * `WorkLogsPanel`'s own `spell` used for the identical fact. */
function durationLabel(seconds: number): string {
  const m = Math.round(seconds / 60)
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`
}

export function EffortCard({
  targetTable,
  targetId,
  canEdit,
  members,
  metrics,
  onEmptyChange,
}: {
  targetTable: "stories" | "help" | "tasks"
  targetId: string
  /** `work:update` — gates whether a row opens as an EDITABLE slide-in sheet
   * (never an add door: there is none left on this card). */
  canEdit: boolean
  /** For the row's own face (R35/R90) — `memberFace(members, userId)`. */
  members: TeamMember[] | undefined
  /** The door's own Cycle time / Effort / Flow efficiency, `undefined` while
   * that read is still in flight, or OMITTED ENTIRELY by a caller whose
   * record has no such door (a task) — see this file's own header. */
  metrics?: EffortMetrics
  /** BUBBLED UP, the same shape `WorkLogsPanel`'s own `onEmptyChange` already
   * takes for the identical fact on a different record — true once this
   * card has CONFIRMED zero time logged and therefore rendered NOTHING at
   * all (see this file's own header, "ZERO RECORDS DRAWS NOTHING"). A
   * caller with a plain-surface side column (`ticket-detail-body.tsx`'s
   * `timeEmpty`) reads this to keep its own separator off a section that
   * is not actually on the page. */
  onEmptyChange?: (empty: boolean) => void
}) {
  const { t } = useLanguage()
  const listKey = recordTimeKey(targetTable, targetId)

  // THE TITLE'S OWN COUNT — the exact record total the SAME list door below
  // already answers (R14's `pagedJson`), primed into the identical sidecar a
  // Time tab badge on this record would already read (`workLogsTotalKey`,
  // R15/R16 — one COUNT(*), one place it is kept). Never a second door: the
  // row-count question and the row-list question are one fetch.
  const countKey = workLogsTotalKey(targetTable, targetId)
  const recordCount = useCachedValue<number>(countKey)

  const logsQ = useCached<WorkLog[]>(listKey, () =>
    contentApi.workLogs({ filter: { targetTable, targetId } }).then((r) => {
      primeCache(cursorKey(listKey), r.nextCursor)
      primeCache(countKey, r.total)
      return r.logs
    })
  )

  const [editingLog, setEditingLog] = React.useState<WorkLog | null>(null)

  function refresh() {
    invalidate(listKey)
  }

  /** CORRECT A ROW ALREADY WRITTEN — the one write this card still owns, now
   * opened by clicking the row itself rather than a pencil beside it. The
   * identical door `WorkLogsPanel`'s own `correct()` calls. */
  async function correct(values: TimeFormValues) {
    if (!editingLog) return
    await contentApi.updateWorkLog({
      id: editingLog.id,
      startedAt: values.startedAt,
      endedAt: values.endedAt,
      note: values.note,
      // NO `kind` — see `time-form-dialog.tsx`. Omitting it preserves whatever
      // the row already holds rather than wiping it.
    })
    refresh()
    toast.success(t("Time corrected."))
  }

  const rows = logsQ.data
  // R88 — CONFIRMED empty, never merely "still loading": `false` until the
  // resting list actually answers.
  const empty = rows !== undefined && rows.length === 0

  // BUBBLED TO THE CALLER, the same `WorkLogsPanel`'s own `onEmptyChange`
  // shape — a plain-surface side column reads this to keep its own
  // separator off this section once it has confirmed there is nothing here
  // to separate. Run every render (never after the early `return null`
  // below): the rule of hooks, and also the only way a caller is told the
  // card went FROM empty BACK to non-empty on a later render.
  React.useEffect(() => {
    if (rows !== undefined) onEmptyChange?.(empty)
  }, [rows, empty, onEmptyChange])

  // ZERO RECORDS DRAWS NOTHING (22 Sep 2026 amendment) — not even
  // `EmptyGatedPanel`'s own header-only drop: the head's own Start/Stop
  // timer button is the one way in, and a sentence on this card saying so
  // again would be the same thing said twice.
  if (empty) return null

  return (
    <>
      {/* NO `surface` PROP ANY MORE — rulebook L43 went app wide on 21 Sep
          2026 and EmptyGatedPanel's own default is plain. The forwarding prop
          this card carried for the tickets-only experiment had exactly one
          caller, which passed the value that is now the default. */}
      <EmptyGatedPanel title={t("Logs")} count={formatCount(recordCount)} empty={false}>
        {rows === undefined ? (
          <Skeleton variant="list" lines={3} />
        ) : (
          <>
            {/* THE THREE STAT TILES — only for a caller that HAS a metrics
                door (a story or a ticket). Omitted rather than drawn with
                placeholder tiles when there is no such concept for the
                record (a task) — see this file's own header. Each tile is
                the kit's own stat register (`<StatGrid surface="bare">`, the
                same label/value markup `pulse.tsx`'s dashboard and
                `work-logs-panel.tsx`'s Numbers band draw) inside the kit's
                own `<Card variant="default">`, a card background `StatGrid`
                itself cannot give a tile nested this deep (see this file's
                own header, the fifth change).

                SOFT PAPER, NOT OFF-BEIGE — rulebook L43 going app wide, 21
                Sep 2026. These three were `variant="raised"` while the panel
                around them was a painted card; the panel is plain now, so a
                tile's ground is the PAGE, and `raised` (`--card`) IS the
                page's own colour in light (#FFFEF9) — the tiles would have
                measured 1.000 and been held up by their shadow alone. The
                Minimal Kit page ruled exactly this, on this exact row: "the
                tiles take soft paper instead, which is what `Card
                variant="default"` already paints, and they lift off the page
                at the same 1.103 the search pill does", plus the sweep it
                asked for, "check that nobody passed `raised` explicitly for
                a tile row that used to sit on a panel". Aurora's own word
                for what a tile is, the same day: "this is a metric, like in
                kit" — and the kit's own `StatGrid` tile is `default`.

                THREE FIXED TILES, WRITTEN OUT RATHER THAN `.map()`-ED. R65's
                own census reads any kit `<Card>` carrying React's own `key=`
                as a per-row RECORD card (one drawn per item of a collection)
                and requires it to carry a `<CardTitle>` a chip could sit
                above, the right rule for an actual list of records, and a
                false match here, where the three tiles are fixed metrics,
                not rows, and a second title inside the card would only
                repeat the stat register's own label. Naming each tile by
                hand keeps it off that census instead of fighting it with an
                exemption the census has no slot for. */}
            {metrics && (
              <div className="grid grid-cols-1 gap-[var(--space-4)] sm:grid-cols-3">
                <Card variant="default">
                  <CardContent>
                    <StatGrid
                      items={[
                        {
                          id: "cycle",
                          label: t("Cycle time"),
                          value:
                            metrics.cycleTimeSeconds !== null
                              ? cycleTimeLabel(metrics.cycleTimeSeconds)
                              : t("Not started"),
                        },
                      ]}
                      surface="bare"
                      label={t("Cycle time")}
                    />
                  </CardContent>
                </Card>
                <Card variant="default">
                  <CardContent>
                    {/* "Hours logged", not "Logs" — the title's own count is
                        the record count now, so the tile answers a different
                        question beside it rather than repeating the word.
                        The section title itself went Effort -> "Time log"
                        (B0386, 22 Sep 2026) -> "Logs" (Aurora, 23 Sep 2026:
                        "word is logs only"); this tile's own word has been
                        "Hours logged" through both and is unchanged. */}
                    <StatGrid
                      items={[
                        {
                          id: "effort",
                          label: t("Hours logged"),
                          value: hoursLabel(metrics.effortSeconds),
                        },
                      ]}
                      surface="bare"
                      label={t("Hours logged")}
                    />
                  </CardContent>
                </Card>
                <Card variant="default">
                  <CardContent>
                    <StatGrid
                      items={[
                        {
                          id: "flow",
                          label: t("Flow efficiency"),
                          value:
                            metrics.flowEfficiency !== null
                              ? `${Math.round(metrics.flowEfficiency)}%`
                              // "No logs", not "No time log" — Aurora, 23 Sep
                              // 2026, "word is logs only". Flow efficiency is
                              // hours divided by cycle time, so with no hours
                              // logged there is nothing to divide.
                              : t("No logs"),
                        },
                      ]}
                      surface="bare"
                      label={t("Flow efficiency")}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* THE INDIVIDUAL RECORDS OF TIME, newest first (the door's own
                default order) — a face, who, when, how long, and what they
                wrote. NO PENCIL: a settled (`endedAt`), non-discarded row a
                reader may correct (`canEdit`) is itself a real `<button>`
                (keyboard reachable); clicking it opens the same slide-in
                sheet a pencil used to. A row that fails any of those three
                stays a plain, non-interactive row — a still-running or
                already-discarded entry was never offered for correction
                before, and a reader without `work:update` still cannot open
                one now.

                NO BACKGROUND, NO BORDER UTILITY (Aurora, 22 Sep 2026, over
                the validated artifact's own `.mk-row`: plain lines, no fill).
                The old `bg-surface-panel`/`rounded`/`divide-y` list is gone —
                `divide-y` draws a border between rows, which the ruling
                refuses as plainly as a fill — and the kit `Separator` sits
                between rows instead, never above the first or below the
                last. Each row drops its own horizontal inset (`px-3`) so its
                content starts at the same left edge as the title and the
                tiles above it, the mock's own alignment. `role="list"`/
                `"listitem"` keep the list semantics a plain `<div>` would
                otherwise drop, since a `Separator` between `<li>` siblings is
                not valid inside a `<ul>`. */}
            <div role="list" aria-label={t("Logs")} data-slot="effort-log-rows" className="flex flex-col">
              {rows.map((l, index) => {
                const name = staffNameFromSnapshot(l.userName) || t("Someone who has left")
                const editable = canEdit && !!l.endedAt && !l.discarded
                const rowContent = (
                  <>
                    <RecordMark picture={memberFace(members, l.userId)} name={name} shape="round" size="choice" />
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {[name, l.startedAt.slice(0, 10)].join(" · ")}
                    </span>
                    <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                      {l.endedAt ? durationLabel(l.seconds) : t("running")}
                    </span>
                    {l.note && (
                      <span className="text-muted-foreground min-w-0 basis-full truncate text-xs sm:basis-auto">
                        {l.note}
                      </span>
                    )}
                    {l.discarded && (
                      <Badge variant="secondary" className="text-muted-foreground shrink-0 text-badge">
                        {t("Discarded")}
                      </Badge>
                    )}
                  </>
                )
                return (
                  <React.Fragment key={l.id}>
                    {index > 0 && <Separator />}
                    <div role="listitem" className={l.discarded ? "opacity-60" : undefined}>
                      {editable ? (
                        <button
                          type="button"
                          onClick={() => setEditingLog(l)}
                          className="flex w-full flex-wrap items-center gap-2 py-2 text-start hover:bg-accent"
                        >
                          {rowContent}
                        </button>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2 py-2">{rowContent}</div>
                      )}
                    </div>
                  </React.Fragment>
                )
              })}
            </div>

            {/* R14 — the list is PAGED; a load-more door reaches the rest. */}
            <LoadMore
              listKey={listKey}
              label={t("Load more time")}
              fetchPage={(cursor) =>
                contentApi
                  .workLogs({ filter: { targetTable, targetId }, cursor })
                  .then((r) => ({ rows: r.logs, nextCursor: r.nextCursor }))
              }
            />
          </>
        )}
      </EmptyGatedPanel>
      <TimeFormDialog
        open={!!editingLog}
        onOpenChange={(o) => !o && setEditingLog(null)}
        draftKey={editingLog ? `work-log:edit:${editingLog.id}` : undefined}
        initial={editingLog}
        onSubmit={correct}
      />
    </>
  )
}
