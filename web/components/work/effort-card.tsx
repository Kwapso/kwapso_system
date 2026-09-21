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
// that account. This round puts the rows BACK, with a face on every one
// (R35/R90), and takes the "Log time" door back OUT: the head's own
// Start/Stop timer button (`RecordTimerButton`) is the one way a new row is
// ever written from either of these two pages now — correcting a row ALREADY
// written stays (the pencil), because correcting one is not adding one.
//
// R88 — EMPTY-STATE SINGLE DOOR, and now for real: while this card drew no
// rows at all, "could this ever be empty" had an honest "no" (three metric
// lines are always something to say — `EMPTY_TOOLBAR_EXEMPT`'s own retired
// entry for this file argued exactly that). With the rows back, the card is
// an ordinary collection again, so it is `EmptyGatedPanel` once more: at zero
// logged entries the header (title, count) drops entirely and the body reads
// one sentence, no door — "No time logged yet." (never "Add the first": there
// is nothing here to add from).
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
// sheet, 21 Sep 2026), the three-line grid (Cycle time / Effort / Flow
// efficiency) does not draw at all, never three placeholder sentences for a
// concept the record does not have. The title's own hour count still needs a
// real server total rather than a sum of whatever page of rows happens to be
// loaded (R16, and this file's own rows are a LoadMore page) — so without a
// caller-supplied `metrics.effortSeconds` it falls back to the same generic
// `workLogSummary` aggregate `WorkLogsPanel`'s own Numbers band already
// reads, fetched only when there is no metrics prop to read it from instead.
//
// THE ROWS THEMSELVES are the one thing genuinely shared at the data layer
// too: `recordTimeKey(targetTable, targetId)` is the SAME cache key
// `WorkLogsPanel` reads for a task or a meeting, already a `time-of:` R15
// live listener, so a timer stopped from the header bar updates this card
// with no reload exactly as it always has.

import * as React from "react"

import { Badge } from "@shared/ui/components/badge/badge"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { toast } from "@shared/ui/components/sonner/sonner"
import { RecordMark } from "@shared/web/record-mark"
import { EditPenButton } from "@shared/web/edit-pen-button"
import { EmptyGatedPanel } from "@/components/deep-link/screen-bits"
import { CollectionEmptyState } from "@shared/web/screen-engine/collection-frame"
import { LoadMore } from "@/components/records/load-more"
import { TimeFormDialog, type TimeFormValues } from "@/components/work/time-form-dialog"
import { content as contentApi } from "@/lib/api"
import { cursorKey, recordTimeKey, recordTimeSummaryKey } from "@/lib/live-resources"
import { memberFace } from "@/components/tickets/tickets-collection"
import type { TeamMember, WorkLog, WorkLogSummary } from "@shared/types"
import { staffNameFromSnapshot } from "@shared/staff-name"
import { invalidate, primeCache, useCached } from "@shared/web/store"
import { useLanguage } from "@shared/web/language"

/** THE SAME SHAPE `StoryMetrics`/`TicketMetrics` CARRY (shared/types.ts) —
 * read structurally rather than importing either name, so this file draws
 * whichever door's answer its caller hands it without caring which one. */
export type EffortMetrics = {
  cycleTimeSeconds: number | null
  effortSeconds: number
  flowEfficiency: number | null
}

/** Whole seconds → "3.5h", "0h" — the same rounding the title's own count and
 * the Effort line share, kept local rather than shared for the reason
 * `story-detail.tsx`'s own former copy of this gave: two call sites is not
 * yet a seam. */
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
}: {
  targetTable: "stories" | "help" | "tasks"
  targetId: string
  /** `work:update` — gates the row's own correction pencil (never an add
   * door: there is none left on this card). */
  canEdit: boolean
  /** For the row's own face (R35/R90) — `memberFace(members, userId)`. */
  members: TeamMember[] | undefined
  /** The door's own Cycle time / Effort / Flow efficiency, `undefined` while
   * that read is still in flight, or OMITTED ENTIRELY by a caller whose
   * record has no such door (a task) — see this file's own header. */
  metrics?: EffortMetrics
}) {
  const { t } = useLanguage()
  const listKey = recordTimeKey(targetTable, targetId)

  const logsQ = useCached<WorkLog[]>(listKey, () =>
    contentApi.workLogs({ filter: { targetTable, targetId } }).then((r) => {
      primeCache(cursorKey(listKey), r.nextCursor)
      return r.logs
    })
  )

  // THE FALLBACK HOUR TOTAL, for a caller with no metrics door of its own —
  // fetched only then, never alongside a caller-supplied `metrics` (a second
  // read of the same fact would be `TWO_READS_ONE_DOOR` territory for
  // nothing this card draws).
  const summaryKey = recordTimeSummaryKey(targetTable, targetId)
  const summaryQ = useCached<WorkLogSummary>(metrics === undefined ? summaryKey : null, () =>
    contentApi.workLogSummary({ targetTable, targetId })
  )
  const effortSeconds = metrics ? metrics.effortSeconds : (summaryQ.data?.totalSeconds ?? 0)

  const [editingLog, setEditingLog] = React.useState<WorkLog | null>(null)

  function refresh() {
    invalidate(listKey)
  }

  /** CORRECT A ROW ALREADY WRITTEN — the one write this card still owns. The
   * identical door `WorkLogsPanel`'s own `correct()` calls. */
  async function correct(values: TimeFormValues) {
    if (!editingLog) return
    await contentApi.updateWorkLog({
      id: editingLog.id,
      startedAt: values.startedAt,
      endedAt: values.endedAt,
      note: values.note,
      kind: values.kind,
      billable: values.billable,
    })
    refresh()
    toast.success(t("Time corrected."))
  }

  const rows = logsQ.data
  // R88/R50 — CONFIRMED empty, never merely "still loading" (`EmptyGatedPanel`'s
  // own doc comment): `false` until the resting list actually answers.
  const empty = rows !== undefined && rows.length === 0

  return (
    <>
      <EmptyGatedPanel title={t("Effort")} count={!empty ? hoursLabel(effortSeconds) : undefined} empty={empty}>
        {rows === undefined ? (
          <Skeleton variant="list" lines={3} />
        ) : empty ? (
          // WORDS ONLY — no door here: there is nothing to add FROM on this
          // card any more, only time the timer itself writes.
          <CollectionEmptyState title={t("No time logged yet.")} description="" />
        ) : (
          <>
            {/* THE THREE-LINE GRID — only for a caller that HAS a metrics
                door (a story or a ticket). Omitted rather than drawn with
                placeholder sentences when there is no such concept for the
                record (a task) — see this file's own header. */}
            {metrics && (
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs uppercase">{t("Cycle time")}</span>
                  <span className="font-mono text-sm font-semibold">
                    {metrics.cycleTimeSeconds !== null ? cycleTimeLabel(metrics.cycleTimeSeconds) : t("Not started")}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs uppercase">{t("Effort")}</span>
                  <span className="font-mono text-sm font-semibold">{hoursLabel(metrics.effortSeconds)}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs uppercase">{t("Flow efficiency")}</span>
                  <span className="font-mono text-sm font-semibold">
                    {metrics.flowEfficiency !== null ? `${Math.round(metrics.flowEfficiency)}%` : t("No time log")}
                  </span>
                </div>
              </div>
            )}

            {/* THE INDIVIDUAL RECORDS OF TIME, newest first (the door's own
                default order) — who, their face, when, how long, and what they
                wrote, the same eight-fact-minus-two row `WorkLogsPanel`'s own
                list draws, with a face added (R35/R90) and no add door beside
                it. */}
            <ul className="divide-border divide-y rounded-[var(--radius)] bg-surface-panel">
              {rows.map((l) => {
                const name = staffNameFromSnapshot(l.userName) || t("Someone who has left")
                return (
                  <li
                    key={l.id}
                    className={`flex flex-wrap items-center gap-2 px-3 py-2 ${l.discarded ? "opacity-60" : ""}`}
                  >
                    <RecordMark picture={memberFace(members, l.userId)} name={name} shape="round" size="choice" />
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {[name, l.startedAt.slice(0, 10)].join(" · ")}
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
                    <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                      {l.endedAt ? durationLabel(l.seconds) : t("running")}
                    </span>
                    {canEdit && l.endedAt && !l.discarded && (
                      <EditPenButton onClick={() => setEditingLog(l)} label={t("Edit")} />
                    )}
                  </li>
                )
              })}
            </ul>

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
