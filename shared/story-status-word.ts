// AN OPEN STORY'S OWN WORD - Aurora's ruling, 21 Sep 2026, verbatim: "Backlog,
// To Do: nono, to do means its scheduled in an active phase." The stored
// statuses stay `open`/`in_progress`/`in_review`/`done` (shared/types.ts,
// `STORY_STATUSES`) - this is only the WORD `open` reads as, and it is now
// DERIVED rather than the fixed re-spelling two screens used to hand out
// unconditionally for the same status (`work-panels.tsx`'s old
// `STORY_STATUS_LABEL`, open -> "Backlog"; `stories-screen.tsx`'s old
// `KANBAN_STATUS_LABEL`, open -> "To Do"). Today's ruling reads both off one
// question: "To Do" when the story sits in a phase that is ACTIVE today
// (`shared/wave-stage.ts`'s own `phaseState`, the identical test a wave's own
// stage is read off), "Backlog" otherwise - no phase at all, a future phase,
// or one that has already ended.
//
// ONE HELPER, used everywhere an open story's status word is drawn: the
// Backlog list, the story detail chip, the kanban board's own column and
// card, and the filters/facets that offer a status word.

import { phaseState, type PhaseWindow } from "./wave-stage"
import type { StoryStatus } from "./types"

/** A story's own phase window - whatever a caller has on hand. `null`/
 * `undefined` for a story with no phase at all, which is never active. */
export type StoryPhase = PhaseWindow | null | undefined

/** True when a story's own phase is active today - the one test both the
 * List word and the Board column ask. */
export function storyInActivePhase(phase: StoryPhase, today?: string): boolean {
  if (!phase) return false
  return phaseState(phase, today) === "active"
}

/** THE WORD for an OPEN story - "To Do" in an active phase, "Backlog"
 * otherwise. The other three statuses carry a fixed word and never reach
 * this question, so callers ask it only for `status === "open"`. */
export function openStoryWord(phase: StoryPhase, today?: string): "To Do" | "Backlog" {
  return storyInActivePhase(phase, today) ? "To Do" : "Backlog"
}

/** THE WORD for any of the four stored statuses - the one call every screen
 * that draws a story's status word makes now, in place of a static
 * `Record<StoryStatus, string>` lookup. Sentence case ("In progress"), the
 * List's own convention; a caller that wants the Board's Title Case columns
 * ("In Progress"/"In Review") spells those two directly, the same way
 * `stories-screen.tsx`'s old `KANBAN_STATUS_LABEL` already did - only the
 * `open` cell ever disagreed between the two, and that disagreement is
 * exactly what this ruling closed. */
export function storyStatusWord(status: StoryStatus, phase: StoryPhase, today?: string): string {
  if (status === "open") return openStoryWord(phase, today)
  if (status === "in_progress") return "In progress"
  if (status === "in_review") return "In review"
  return "Done"
}
