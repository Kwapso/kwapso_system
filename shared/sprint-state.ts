// WHAT STATE A SPRINT IS IN — derived from its dates, in ONE place.
//
// IT LIVED IN `web/components/work/sprints-screen.tsx` UNTIL 15 SEP 2026, and it
// moved because a DOOR now has to ask the same question. Feedback may only be
// raised while a Validation sprint is RUNNING on the ticket's app (the client's
// ruling that day), and the refusal is at the door — the ticket form withholds
// the chip for the same condition, but the machine surface and the importer
// reach `createTicket` with no picker at all. Two expressions of "is this sprint
// running" — one in a browser, one in a worker — is the shape where a screen
// offers what the door refuses, or worse, offers nothing the door would accept.
//
// A SPRINT HAS NO STATUS COLUMN, on purpose: the table records two MOMENTS
// instead — the one it was completed at and the one it was switched off at — and
// everything else is arithmetic against today. `shared/selectable-homes.ts`
// records `Sprint status` as a `"labels"` group for exactly this reason: nothing
// stores a sprint's state, so nothing can rewrite it.

import type { AppStageDotTone } from "./app-stages"

/** THE THREE STATES. */
export type SprintState = "running" | "upcoming" | "wrapped"

/** THE THREE FACTS THE STATE IS MADE OF, and nothing else.
 *
 * A STRUCTURAL SHAPE RATHER THAN A `Sprint`, deliberately. The screen holds a
 * full `Sprint` off the door; the worker holds three columns off a `SELECT` it
 * wrote itself and has no business assembling the other twenty. Both satisfy
 * this, and neither can pass something that merely looks similar — the field
 * names are the payload's (`completedAt`, `startsOn`) rather than the column's,
 * so the worker converts once, at its own query, where the columns are in view. */
export type SprintTiming = {
  /** the MOMENT it completed, not a status word. */
  completedAt: string | null
  /** false once somebody has switched it off — a cancelled sprint. */
  active: boolean
  /** `YYYY-MM-DD`, or null for a block that is agreed and not yet scheduled. */
  startsOn: string | null
}

/** Today, as the day it is where the caller is sitting, in the shape a stored
 * date column already has. Lexical order on `YYYY-MM-DD` is chronological order,
 * which is why the comparison in `sprintState` is a string compare rather than a
 * parse — and it is the same slice the month grid keys its squares on, so the
 * grouping and the calendar can never disagree about which day today is.
 *
 * IN A WORKER "WHERE THE CALLER IS SITTING" IS UTC, and that is the honest
 * answer rather than a bug: a Worker has no timezone of its own to be wrong
 * about. The most it can cost is a sprint that starts today being called
 * "upcoming" for a few hours at one end of the world — a refusal that resolves
 * itself, on a rule whose subject is a two-week block. Nothing here is worth a
 * timezone column. */
export function todayKey(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function sprintState(s: SprintTiming, today: string): SprintState {
  // WRAPPED is TWO endings, which is why it is not called "completed": a sprint
  // somebody switched off was cancelled, and it is over too. An overview that
  // quietly dropped those would show fewer sprints than the badge above it
  // counts, so they are here and their own row says which ending it was.
  if (s.completedAt || !s.active) return "wrapped"
  const starts = s.startsOn ? s.startsOn.slice(0, 10) : ""
  // RUNNING is a start day that has arrived, on a sprint nobody has closed. An
  // end date in the past does NOT move it out: work that overran is still the
  // work in front of the team, and a late sprint quietly leaving the screen is
  // the exact thing the sprints view exists to stop. The Feedback door inherits
  // that reading, which is the right one — an overrunning Validation block is
  // still the fortnight the client is looking at the app in.
  if (starts && starts <= today) return "running"
  // Everything else has not begun — including a sprint nobody has dated yet,
  // which is a block that has been agreed and not scheduled. It is still coming,
  // so it sits with the rest of what is coming rather than in a fourth pile
  // nobody asked for.
  return "upcoming"
}

/** IS THIS SPRINT RUNNING RIGHT NOW? The one question the ticket door asks, said
 * once so the door does not have to restate `=== "running"` and cannot mistype
 * it. Defaults to today so a caller with nothing else to say need not build a
 * date to ask. */
export function sprintIsRunning(s: SprintTiming, today: string = todayKey()): boolean {
  return sprintState(s, today) === "running"
}

// ── THE STATUS DOT, ADDED 17 SEP 2026 ────────────────────────────────────────
//
// SPRINTS HAD NO STATUS COLOUR AT ALL until the client's ruling this session,
// read together with the rest of that day's palette: "sprints: wrapped
// complete green, wrapped cancelled gray, running now black, coming up
// purple." Every other coloured kind in this app answers "which dot" through
// one map beside its own state predicate (`HELP_STATUS_DOT_TONE`,
// `APP_STAGES`, `WAVE_STATE_DOT`) — this is a sprint's own register, in the
// same file as `sprintState` because the dot is DERIVED from the identical
// three facts (`completedAt`, `active`, `startsOn`) that function already
// reads, not a new column.
//
// FOUR DISPLAY STATES, NOT THREE — `sprintState`'s own "wrapped" answers
// "is it over", and the client's ruling wants that told apart by WHICH
// ending it was (delivered vs switched off), the same split
// `waves-screen.tsx`'s own `waveStateLabel` already makes for a wave whose
// package ran to term. `SprintDisplayState` widens `sprintState`'s three
// words into the four her ruling names, built from that function rather than
// re-deriving the same three facts a second way.

/** THE FOUR WORDS HER RULING NAMES. `"running"` and `"upcoming"` are spelled
 * identically to `SprintState`'s own two words on purpose — they are the
 * same two states, unsplit — so a caller who already has one can widen it
 * with a single extra branch (`sprintDisplayState` below) rather than a
 * second lookup. */
export type SprintDisplayState = "wrapped_complete" | "wrapped_cancelled" | "running" | "upcoming"

/** `sprintState`, with "wrapped" told apart by which ending it was —
 * `completedAt` wins when a record somehow carries both, the same order
 * `sprintState`'s own comment reads them in ("a block that was delivered and
 * later switched off was still delivered"). */
export function sprintDisplayState(s: SprintTiming, today: string = todayKey()): SprintDisplayState {
  const state = sprintState(s, today)
  if (state === "wrapped") return s.completedAt ? "wrapped_complete" : "wrapped_cancelled"
  return state
}

/** THE DOT, her exact four tones: green (`shipped`) for a sprint delivered,
 * grey (`archived`) for one called off, black (`building` — this app's own
 * token for the ink tone she calls "black", never "charcoal") for one
 * running right now, and purple for one still to come. `AppStageDotTone`
 * (`shared/app-stages.ts`) is the same widened ten-tone union every other
 * re-ruled kind this session reaches for, imported rather than restated. */
const SPRINT_DISPLAY_DOT_TONE: Record<SprintDisplayState, AppStageDotTone> = {
  wrapped_complete: "shipped",
  wrapped_cancelled: "archived",
  running: "building",
  upcoming: "purple",
}

/** The dot tone for a sprint's own status — the list row, the board card (if
 * any — sprints have none today) and the record head chip all read this one
 * function, never their own copy of the ternary. */
export function sprintDotTone(s: SprintTiming, today: string = todayKey()): AppStageDotTone {
  return SPRINT_DISPLAY_DOT_TONE[sprintDisplayState(s, today)]
}
