// A WAVE'S OWN STAGE - Aurora's ruling, 21 Sep 2026, verbatim: "stage wave:
// read the active pahse that sit." A wave carries no stage column of its
// own (`shared/waves.ts` - "a wave is a wave"); what a wave row or its head
// shows as its "stage" is DERIVED from the phases inside it (`WaveSprint`,
// shared/waves.ts, or the fuller `Sprint`, shared/types.ts - both carry the
// two dates this file reads). ONE HELPER, so the wave list, the wave's own
// timeline and its record head can never work this out three different ways.
//
// FOUR CASES, in the order Aurora named them:
//   1. ACTIVE - the phase whose start and end dates contain today.
//   2. UPCOMING - if none is active, the EARLIEST phase that has neither
//      started nor completed. A caller hands phases in whatever order it
//      has them; the door's own read already sorts a wave's phases
//      chronologically (`workers/tenancy/src/lib/waves.ts`'s `ORDER BY
//      COALESCE(starts_on, created_at), name`), so the first match in that
//      order is the earliest one.
//   3. COMPLETE - every phase has ended.
//   4. NONE - the wave carries no phases at all.
//
// A phase's own three-way state (below, `phaseState`) is the same test
// `shared/story-status-word.ts` reuses for a different question - "is this
// story's own phase active today" - so the two rulings the client made the
// same session (wave stage, and "to do means scheduled in an active phase")
// read off one definition of "active" rather than two.
//
// DATES ONLY, deliberately: a phase with no end date yet is read as still
// running rather than falling out of the wave's stage the moment its end
// date goes unset, and a phase with neither date is read as not yet
// scheduled (upcoming) rather than active or completed. This partition is
// exhaustive and mutually exclusive for every combination of null/non-null
// dates - see `phaseState`'s own comment.

export type PhaseWindow = {
  startsOn: string | null
  endsOn: string | null
}

/** Today, as the ISO date every stored `startsOn`/`endsOn` is in. A plain
 * argument default everywhere below, never read off the clock inside the
 * pure functions themselves, so a test can pin "today" instead of racing it. */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function hasStarted(p: PhaseWindow, today: string): boolean {
  return p.startsOn != null && p.startsOn <= today
}

function hasEnded(p: PhaseWindow, today: string): boolean {
  return p.endsOn != null && p.endsOn < today
}

/** ONE PHASE'S OWN STATE, purely off its dates. Exhaustive and mutually
 * exclusive for every combination of null/non-null dates: neither date set
 * reads "upcoming" (not yet scheduled), started with no end date yet reads
 * "active" (still running), and an end date already past reads "completed"
 * regardless of whether it ever carried a start. */
export function phaseState(p: PhaseWindow, today: string = todayISO()): "active" | "upcoming" | "completed" {
  if (hasEnded(p, today)) return "completed"
  if (hasStarted(p, today)) return "active"
  return "upcoming"
}

export type WaveStage<P extends PhaseWindow> =
  | { kind: "active"; phase: P }
  | { kind: "upcoming"; phase: P }
  | { kind: "complete" }
  | { kind: "none" }

/** THE ONE HELPER - a wave's own stage, off its phases. */
export function waveStage<P extends PhaseWindow>(
  phases: readonly P[],
  today: string = todayISO()
): WaveStage<P> {
  if (phases.length === 0) return { kind: "none" }
  const active = phases.find((p) => phaseState(p, today) === "active")
  if (active) return { kind: "active", phase: active }
  const upcoming = phases.find((p) => phaseState(p, today) === "upcoming")
  if (upcoming) return { kind: "upcoming", phase: upcoming }
  return { kind: "complete" }
}
