"use client"

// THE RUNNING TIMER, in the header of every screen (.plans/BUILD-1 §5: "a running
// timer appears in the header of EVERY screen, and clicking it returns to what it
// is timing").
//
// It counts up in the BROWSER, from the moment the server said it started. The
// alternative — asking the server every second — is a request per second per open
// tab, per person, for the whole working day, to display a number arithmetic can
// produce for free. The server's `startedAt` is the truth; the clock is a
// rendering of it.
//
// It shows NOTHING when nothing is running, which is most of the time and is the
// whole reason it can live in the header at all. And it never renders for a
// client login: the door it reads refuses one (R21), and a portal caller has no
// timers by construction — the shell that mounts it is the agency app's.

import * as React from "react"

import { Button } from "@shared/ui/components/button/button"
import { Stopwatch } from "@shared/ui/components/stopwatch/stopwatch"
import { StopCircle, Timer } from "@shared/ui/foundations/icons"
import { toast } from "@shared/ui/components/sonner/sonner"

import { ApiFailure, content as contentApi } from "@/lib/api"
import {
  TIME_SLICE_PREFIX,
  recordTimeKey,
  runningTimersKey,
  storiesKey,
  workLogsKey,
  workLogsTotalKey,
} from "@/lib/live-resources"
import type { RunningTimer } from "@shared/types"
import { invalidate, invalidatePrefix, primeCache, useCached } from "@shared/web/store"
import { useAfterPaint } from "@shared/web/after-paint"
import { useT } from "@shared/web/language"
import type { HeadActionItem } from "@shared/web/head-actions"

/** Whole seconds as a clock a person reads at a glance: 1:04:09, or 4:09 under an
 * hour. Never "3849s", and never a decimal — a timer is read, not calculated. */
export function clockFrom(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n: number) => String(n).padStart(2, "0")
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`
}

/** Where clicking a timer goes: THE RECORD IT IS TIMING, not the list the record
 * is in. It used to land on the backlog for anything that was not a ticket,
 * because a story had no screen to land on — it does now, and "returns to what
 * it is timing" can finally mean the thing itself. The three tables a work log
 * may sit against each have a record screen; anything else falls back to the
 * backlog rather than to a dead URL. */
function targetPath(t: RunningTimer, teamId: string): string {
  const segment =
    t.targetTable === "help"
      ? "tickets"
      : t.targetTable === "stories"
        ? "stories"
        : t.targetTable === "tasks"
          ? "tasks"
          : // MEETINGS WERE MISSING, and they are a real work-log target
            // (`WORK_LOG_TARGETS` in workers/content/src/lib/work-logs.ts) — a
            // transcript capture writes one per attendee. So a meeting timer's
            // "return to what it is timing" quietly landed on the backlog.
            t.targetTable === "meetings"
            ? "meetings"
            : null
  return segment ? `/t/${teamId}/${segment}/${t.targetId}` : `/t/${teamId}/stories`
}

/** WHAT THE BADGE CALLS THE THING IT IS TIMING, shortest honest answer first.
 *
 * A person running two clocks saw two durations and nothing else — the label was
 * in the native `title` tooltip, which is invisible on a phone and needs a hover
 * everywhere else. The short reference is the right size for a pill and is the
 * name these records are already known by on their own screens.
 *
 * It is NULLABLE, and often null: a ref needs an account with a short code, so
 * the agency's own work has none. Then the label, clipped — a ticket's label is
 * its whole description, which is why nobody put it here in the first place.
 * Then the kind of record, which is always true and never nothing. */
function badgeName(t: RunningTimer): string {
  if (t.targetRef) return t.targetRef
  const label = t.targetLabel?.trim()
  if (label) return label.length > 18 ? `${label.slice(0, 17)}…` : label
  return t.targetTable === "help"
    ? "ticket"
    : t.targetTable === "stories"
      ? "story"
      : t.targetTable === "tasks"
        ? "task"
        : t.targetTable === "meetings"
          ? "meeting"
          : "work"
}

/** WHAT IS RUNNING RIGHT NOW, as a plain array — `TimerBar`'s own read,
 * pulled out as a named step rather than inlined into the component below.
 *
 * NOT EXPORTED ANY MORE, 22 Sep 2026. It used to be a second seam `AppShell`
 * called directly, to decide whether to draw the `ScreenShell` header BAND
 * `TimerBar` sat in at all — that band carried the shell's own header padding
 * whether or not anything was inside it, so an unconditional band cost ~90px
 * of empty space on every screen with nobody timing anything, and asking this
 * hook one level up let the shell skip drawing the band rather than draw it
 * empty. Both call sites are gone with that band (`app-shell.tsx` now hands
 * `TimerBar` straight to `ScreenShell`'s `asideLead`, a slot that paints no
 * fill and costs nothing when its child renders `null`), so the only reader
 * left is `TimerBar` itself, three lines down, and a name nothing outside
 * this file uses buys nothing by staying public.
 *
 * IT IS STILL NOT A SECOND REQUEST — unchanged by the above. `useCached` goes
 * through `loadShared`, which is keyed and de-duplicates in flight, so a
 * second `TimerBar` mounted elsewhere (the mobile bar's own copy) shares one
 * fetch, one cache entry and one live-sync listener with this one (R15 —
 * `runningTimersKey` is in the registry already). `null` for the team is the
 * teamless case and reads nothing at all. */
function useRunningTimers(teamId: string | null): RunningTimer[] {
  // AND IT WAITS FOR THE PAINT. This is shell chrome — a band that says whose
  // timer is running — and it has nothing to do with the screen a person came
  // for. On a cold deep link it was one of the requests in front of the record
  // (`MAX_REQUESTS_BEFORE_FIRST_PAINT`, shared/workers/limits.ts). The band is
  // omitted while there are no timers, which is exactly what it draws for the
  // first moment anyway, so nothing on screen moves.
  const ready = useAfterPaint()
  const timersQ = useCached<RunningTimer[]>(teamId && ready ? runningTimersKey(teamId) : null, () =>
    contentApi.runningTimers().then((r) => r.timers)
  )
  return timersQ.data ?? []
}

export function TimerBar({
  teamId,
  onNavigate,
}: {
  teamId: string
  onNavigate?: (href: string) => void
}) {
  const t = useT()
  // One tick a second, and only while something is actually running — an interval
  // that keeps firing over an empty bar is a wake-up per second for nothing.
  const running = useRunningTimers(teamId)
  const [, tick] = React.useState(0)
  React.useEffect(() => {
    if (running.length === 0) return
    const h = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(h)
  }, [running.length])

  if (running.length === 0) return null

  async function stop(timer: RunningTimer) {
    try {
      const { timers } = await contentApi.stopTimer(timer.id)
      // THE SAME SEAM `useRecordTimerAction` USES BELOW, not a hand-picked
      // subset of it (live proof, 21 Sep 2026). This used to invalidate only
      // the running timers, the work-log list, the stories badge and the
      // `time-of:` family — never `workLogsTotalKey` or a story's/ticket's
      // own `story:metrics:`/`help:metrics:` keys, so stopping a clock from
      // THIS pill (the header, rather than the record's own Start/Stop
      // button) left the Effort card's title count and stat tiles stale
      // until a reload: the exact defect `refreshTimers`'s own header names,
      // left unfixed on this second path. One function says what a
      // start/stop makes stale; this bar asks it too, rather than keeping a
      // second, drifted copy of the list.
      refreshTimers(teamId, timer.targetTable, timer.targetId, timers)
      toast.success(t("Timer stopped."))
    } catch (err) {
      toast.error(err instanceof ApiFailure ? err.message : t("Couldn't stop that timer."))
    }
  }

  return (
    <div className="flex items-center gap-1">
      {running.map((timer) => {
        // Elapsed at the moment the SERVER answered, plus the wall time since —
        // so a tab left open overnight is right, not an hour of re-renders out.
        // Passed to Stopwatch as a CONTROLLED value (in ms), so its own display
        // rides this bar's 1s tick rather than ticking a second clock itself.
        const since = Math.max(0, Math.floor((Date.now() - Date.parse(timer.startedAt)) / 1000))
        const elapsed = Number.isFinite(since) ? since : timer.elapsedSeconds
        return (
          <Stopwatch
            key={timer.id}
            running
            elapsed={elapsed * 1000}
            onRunningChange={(next) => {
              if (!next) void stop(timer)
            }}
            label={badgeName(timer)}
            stopLabel={t("Stop the timer")}
            // WHICH RECORD — the name is what tells two running clocks apart;
            // the kit's own clock glyph and count answer "how long". Its own
            // click, not the pill's, is what returns to what it is timing —
            // the stop disc alongside it needs a target of its own.
            leading={
              <button
                type="button"
                onClick={() => onNavigate?.(targetPath(timer, teamId))}
                className="max-w-[9ch] truncate font-medium sm:max-w-[14ch]"
              >
                {badgeName(timer)}
              </button>
            }
            className={timer.runaway ? "shadow-[var(--hairline-error)] text-destructive" : undefined}
          />
        )
      })}
    </div>
  )
}

/** Everything a start or a stop makes stale, in one place, because four screens
 * do it and a screen that forgets one of them shows a timer that isn't running.
 * `recordTimeKey` is the record's OWN Time tab — the family the live registry
 * drops when a row of time moves, and the one a generic refresh does not name.
 *
 * DEFECT (live proof, 2026-09-21): the task sheet and the shared `EffortCard`
 * stayed on the state from before a start/stop until a full reload. Two keys
 * this function did NOT touch, both fed straight into what those two draw:
 *
 *   • `workLogsTotalKey` — the Effort card's own title count and a record's
 *     Time tab badge (`meeting-detail.tsx`'s own read), a `total:` sidecar
 *     OUTSIDE `TIME_SLICE_PREFIX` on purpose (R16 — it is a count, not a row
 *     slice), so `invalidatePrefix(TIME_SLICE_PREFIX)` above never reached
 *     it;
 *   • the record's own EFFORT METRICS (`story:metrics:<id>`, `help:metrics:
 *     <id>`) — the Cycle time / Effort hours / Flow efficiency tiles
 *     `EffortCard`'s `metrics` prop draws, fed by a door of their own
 *     (`getStoryMetrics`/`getTicketMetrics`) that a timer's start or stop
 *     moves exactly as much as the rows underneath it, and which neither
 *     `story-detail.tsx` nor `help-detail.tsx` re-fetches except through
 *     their own `refresh()` (called after an edit or a status move, never
 *     after a timer toggle). A task carries neither key (no metrics door of
 *     its own — task-sheet.tsx's own header says why), so nothing is
 *     invalidated for "tasks" and `EffortCard` draws no tiles for it either.
 *
 * A SECOND DEFECT, SAME SHAPE (live proof, 21 Sep 2026, clause a): even with
 * every right key named, `invalidate` alone only DROPS an entry and tells a
 * subscriber to refetch (`shared/web/store.ts`) — it paints nothing until
 * that refetch's own round trip lands. The task sheet's own Done button
 * reads `runningTimersKey` through a SEPARATE `useCached` call
 * (`task-sheet.tsx`), so after Start it stayed enabled, with no tooltip,
 * for one whole extra network round trip after the timer had actually
 * started — not a proof that ran too early, a real second wait nothing on
 * screen explained. Both `startTimer` and `stopTimer` already answer with
 * the fresh running-timers list in the SAME response
 * (`{ timers }`, `web/lib/api/content.ts`), so a caller that has just
 * awaited one hands it to `timers` here: `primeCache` writes it and
 * notifies every subscriber SYNCHRONOUSLY, landing Done's disabled state
 * (and this bar's own pill) in the SAME render cycle the door answered,
 * never a second fetch for an answer already in hand. A caller with no
 * answer to hand in (none left today, but the fallback stays honest for
 * whatever calls this next) still invalidates. */
function refreshTimers(
  teamId: string,
  targetTable: string,
  targetId: string,
  timers?: RunningTimer[]
): void {
  if (timers) primeCache(runningTimersKey(teamId), timers, true)
  else invalidate(runningTimersKey(teamId))
  invalidate(workLogsKey(teamId))
  invalidate(storiesKey(teamId))
  invalidate(recordTimeKey(targetTable, targetId))
  invalidate(workLogsTotalKey(targetTable, targetId))
  invalidatePrefix(TIME_SLICE_PREFIX)
  if (targetTable === "stories") invalidate(`story:metrics:${targetId}`)
  if (targetTable === "help") invalidate(`help:metrics:${targetId}`)
}

/** THE CLOCK ON ONE RECORD, NORMALIZED FOR A FOLDED MENU — extracted from
 * `RecordTimerButton` below, 18 Sep 2026, so `shared/web/head-actions.tsx`'s
 * record-head fold can offer "Start"/"Stop timer" as an ordinary menu
 * item at a narrow width without re-deriving the running-timer state or
 * duplicating the toggle's own error handling. `RecordTimerButton` is now a
 * thin `Button` wrapper around this hook's own return value — same running-
 * timers cache, same toggle, same copy, same errors, unchanged for every
 * existing caller (`help-detail.tsx`, `task-detail.tsx`, `story-detail.tsx`).
 *
 * `null` exactly where `RecordTimerButton` would have rendered nothing
 * (`!canLog`) — a caller folding this into a menu drops it the same way
 * `HeadActionsFoldMenu` already drops any other falsy item.
 *
 * `enabled` (default `true`) IS THE DETERMINISTIC GATE `shared/web/
 * after-paint.ts` asks a caller to prefer over its own scheduler — a `null`
 * cache key fetches nothing. A caller forced to call this hook AHEAD OF its
 * own record (a head-fold reader, hooks can't sit after a conditional
 * return) passes `enabled: !!record` so the running-timers read leaves only
 * once the record itself is in hand, the same moment `RecordTimerButton`
 * below — an ordinary child mounted after that guard — has always read it.
 * Left `true`, unchanged, for every caller that already only mounts this
 * once its own record is on screen. */
export function useRecordTimerAction({
  teamId,
  targetTable,
  targetId,
  canLog,
  disabled,
  enabled = true,
  // PER-CALLER OVERRIDE, ADDITIVE ONLY, added for the task detail head's own
  // 21 Sep 2026 ruling ("beside the mango Done"). Aurora's SAME-DAY app-wide
  // ruling ("everywhere where there's button to start timer, rename to just
  // 'start' and change icon for a stopwatch") landed the moment after, on
  // this file's own default below, so every caller now reads "Start" with
  // the Logs rail's own glyph whether or not it passes these. Left in place
  // rather than unwound: a caller is still free to name its own words here,
  // it simply has nothing left to differ from.
  startLabel,
  startIcon,
}: {
  teamId: string
  targetTable: "stories" | "help" | "tasks"
  targetId: string
  canLog: boolean
  disabled?: boolean
  enabled?: boolean
  startLabel?: string
  startIcon?: React.ReactNode
}): HeadActionItem | null {
  const t = useT()
  const [busy, setBusy] = React.useState(false)
  const timersQ = useCached<RunningTimer[]>(enabled ? runningTimersKey(teamId) : null, () =>
    contentApi.runningTimers().then((r) => r.timers)
  )
  const mine = (timersQ.data ?? []).find(
    (x) => x.targetTable === targetTable && x.targetId === targetId
  )

  async function toggle() {
    setBusy(true)
    try {
      if (mine) {
        // THE DOOR'S OWN ANSWER, HANDED STRAIGHT TO `refreshTimers` — see
        // that function's own header (clause a). Priming with it lands the
        // caller's Done/RecordTimerButton state in THIS render cycle,
        // never a second round trip through invalidate-then-refetch.
        const { timers } = await contentApi.stopTimer(mine.id)
        refreshTimers(teamId, targetTable, targetId, timers)
        toast.success(t("Timer stopped."))
      } else {
        const { timers } = await contentApi.startTimer(targetTable, targetId)
        refreshTimers(teamId, targetTable, targetId, timers)
        toast.success(t("Timer started."))
      }
    } catch (err) {
      toast.error(
        err instanceof ApiFailure ? err.message : mine ? t("Couldn't stop that timer.") : t("Couldn't start the timer.")
      )
    } finally {
      setBusy(false)
    }
  }

  if (!canLog) return null

  return {
    key: "timer",
    label: mine ? t("Stop timer") : (startLabel ?? t("Start")),
    icon: mine ? <StopCircle className="size-3.5" /> : (startIcon ?? <Timer className="size-3.5" />),
    onSelect: () => void toggle(),
    disabled: busy || disabled,
  }
}

/** THE CLOCK ON ONE RECORD — start it, and stop the one you started.
 *
 * A record's own screen is where a person decides to begin working on it, so it
 * is where the control belongs, and it exists here rather than three times over
 * because it was written once and then not repeated: the ticket and the task had
 * NO way to start a timer at all, while the server has accepted all three targets
 * since work logs shipped (WORK_LOG_TARGETS: stories, help, tasks).
 *
 * IT SAYS WHICH WAY IT GOES. The story's button was a permanent "Start timer"
 * that did not know a timer was already running on that very story, so the second
 * press answered "You already have a timer running on this" — the door refusing
 * correctly, and the screen having asked the wrong question. It reads the same
 * running-timers cache the header bar reads, so the two can never disagree.
 *
 * The variant is CONSTANT on purpose: the label and the glyph carry the state,
 * and a `variant={running ? … : …}` is the shape R3's check hunts for.
 *
 * NOW A THIN WRAPPER around `useRecordTimerAction`, above — same output,
 * unchanged, for every existing caller. */
export function RecordTimerButton({
  teamId,
  targetTable,
  targetId,
  /** `work:update` at the call site — the same right the door gates on. */
  canLog,
  /** A finished piece of work has nothing left to time. */
  disabled,
  /** Per-caller override — see `useRecordTimerAction`'s own note. Every
   * caller but the task head leaves both off. */
  startLabel,
  startIcon,
}: {
  teamId: string
  targetTable: "stories" | "help" | "tasks"
  targetId: string
  canLog: boolean
  disabled?: boolean
  startLabel?: string
  startIcon?: React.ReactNode
}) {
  const action = useRecordTimerAction({ teamId, targetTable, targetId, canLog, disabled, startLabel, startIcon })
  if (!action) return null
  return (
    <Button variant="secondary" className="gap-1" disabled={action.disabled} onClick={action.onSelect}>
      {action.icon}
      {action.label}
    </Button>
  )
}
