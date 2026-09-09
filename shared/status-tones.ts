// STATUS → COLOUR, for the two record types whose lifecycle is more than a
// single open/closed switch: the ticket (seven stages) and the story (four).
//
// CLIENT RULING, 2026-08-31, verbatim: "the status scheme is not only for
// tickets, identify everywhere where there are status and we need to map
// colors." `shared/app-stages.ts` already answered this for an app's eight
// stages; this file is the same answer for the other two multi-stage
// lifecycles, kept beside neither `types.ts` (which knows nothing of `Badge`)
// nor the stepper components (which draw the TRACK, not the header chip).
//
// THE SIX TONES ARE `Badge`'s OWN (shared/ui/components/badge/badge.tsx) —
// `shipped`, `building`, `review`, `blocked`, `archived`, `done` — never an
// invented seventh (R32, the closed palette). Two of the six render the exact
// same colour (`--dot-shipped` / `--dot-done` both resolve to the forest
// green — badge.tsx's own DOT_FILL), so the split between them here is a
// NAMING one: `shipped` means the record's lifecycle has reached its final,
// closed-out state; `done` means the work itself is finished but the record
// is not yet closed (a ticket with every story done, waiting to be told to
// the client — the reviewer has not pressed the last button yet). That is the
// same reading `shared/app-stages.ts` gives its own two greens: "Completed"
// (closed) is `shipped`; "Maintenance" (still live, still healthy) is `done`.
//
// THE TIERING IS THE SAME SHAPE AS APP-STAGES.TS, READ ACROSS BOTH TRACKS:
//   archived  — nothing has happened yet (App's "Not started"; a ticket just
//               raised and unread; a story nobody has picked up).
//   review    — a person needs to look at it, or has just started to (App's
//               "Blueprint", still being scoped; a ticket somebody has read
//               but not yet scheduled; a story somebody has asked to be
//               reviewed — the literal name match is not a coincidence).
//   building  — work is actively under way (App's Development/Documentation/
//               Iteration; a ticket that is booked in or has a timer running;
//               a story with a timer on it).
//   done      — the work is finished but the record itself is not closed yet
//               (App's "Maintenance" — live and stable; a ticket whose every
//               story closed but nobody has told the client).
//   shipped   — closed out, successfully (App's "Completed"; a ticket that
//               has been answered; a story the reviewer signed off).
//   blocked   — stuck on somebody OUTSIDE the team, and the one tone this
//               file uses that app-stages.ts never needed, because an app
//               has nobody to wait on but the team itself.
//
// NO TICKET STAGE ANSWERS `blocked` ANY MORE, AND THE TIER IS NOT DEAD — read
// this before deleting it. Until 7 Sep 2026 `awaiting_validation` held it: the
// stage where the client had not said yes yet. The client retired that stage
// (shared/types.ts, `HELP_STATUSES`, carries her sentence and the argument),
// and the thing it was reaching for did not go with it — WAITING is now a
// PREDICATE over the ticket's conversation rather than a stored word
// (`waitingClause`, workers/content/src/lib/help.ts: "we spoke last and nobody
// has answered"). A predicate has no row in a `Record<HelpStatus, …>` by
// construction, so it gets `waitingDotTone()` at the foot of this file instead,
// and `blocked` keeps its meaning and its one caller.
//
// The tier's definition never depended on the stage, which is why it survives
// it intact: "stuck on somebody OUTSIDE the team" described `awaiting_validation`
// and describes the waiting predicate at least as exactly.
import type { DotTone } from "./app-stages"
import type { HelpStatus, StoryStatus } from "./types"

/** A TICKET'S SIX STAGES → THE CHIP'S DOT. `Record<HelpStatus, …>` rather
 * than a function with a fallback, on purpose — the same reason the portal's
 * own `STATUS_WORDS` is typed this way (ticket-row.tsx): a seventh stage
 * added to `HELP_STATUSES` fails this file's own type check instead of
 * rendering a chip with no dot.
 *
 * THE RETIRED STAGE IS NOT LISTED, AND MUST NOT BE. This map is keyed by the
 * LIVE vocabulary, so it answers for what a ticket can be in now. A ticket's
 * HISTORY is drawn from words, not dots (`stageLabel`,
 * web/components/tickets/ticket-stages.tsx), so a retired stage needs no row here and
 * adding one back would re-open the `Record` to a word no chip can be handed. */
const HELP_STATUS_DOT_TONE: Record<HelpStatus, DotTone> = {
  // Raised, nobody has read it yet — the "Not started" tier.
  new: "archived",
  // Read and sorted, not yet scheduled — the "somebody is looking at this"
  // tier, same as an app still being scoped.
  triaged: "review",
  // Work exists and is booked into a sprint — real, committed motion.
  scheduled: "building",
  // A timer is literally running against it.
  in_progress: "building",
  // Every story closed; nobody has told the client yet.
  ready: "done",
  // The answer was sent. Closed.
  resolved: "shipped",
}

/** The dot tone for a ticket's status. */
export function helpStatusDotTone(status: HelpStatus): DotTone {
  return HELP_STATUS_DOT_TONE[status]
}

/** WAITING'S OWN TONE — for the ticket board's fifth column, which counts a
 * PREDICATE and not a stage (`waitingClause`, workers/content/src/lib/help.ts:
 * the last reply came from our side and nobody has answered).
 *
 * ── WHY THIS IS A FUNCTION HERE AND NOT `"blocked"` TYPED AT THE COLUMN ─────
 *
 * The board used to ask `helpStatusDotTone("awaiting_validation")` and say so
 * out loud: the point was that the colour be ASKED FOR rather than chosen, so
 * that re-toning "the client owes us an answer" moved the column without an
 * edit. That instinct was right and its subject was wrong — it borrowed the
 * tone of a STAGE to paint a PREDICATE, and when the client retired the stage
 * on 7 Sep 2026 the call went with it. Hard-coding `"blocked"` at the column
 * would have thrown away the property along with the bug.
 *
 * So waiting gets an honest entry of its own, in the file that owns what a
 * status colour MEANS, and the board asks this instead. It resolves to
 * `blocked` — the tier this file defines as "stuck on somebody OUTSIDE the
 * team", which is waiting's own sentence exactly — and it is the same poppy the
 * portal has always drawn for a ticket that needs the reader to act.
 *
 * NOT IN `HELP_STATUS_DOT_TONE`: that map is a closed `Record<HelpStatus, …>`
 * and waiting is not a status. A pseudo-key there would be a lie the type
 * system would then defend. */
export function waitingDotTone(): DotTone {
  return "blocked"
}

/** A STORY'S FOUR STAGES → THE CHIP'S DOT. Same `Record` shape, same reason:
 * a fifth `StoryStatus` fails here rather than rendering silently. */
const STORY_STATUS_DOT_TONE: Record<StoryStatus, DotTone> = {
  // Written down, nobody has started — the "Not started" tier.
  open: "archived",
  // A timer started on it.
  in_progress: "building",
  // "Ready for review" was pressed — literally the tone's own name.
  in_review: "review",
  // The reviewer pressed Done. Closed.
  done: "shipped",
}

/** The dot tone for a story's status. */
export function storyStatusDotTone(status: StoryStatus): DotTone {
  return STORY_STATUS_DOT_TONE[status]
}
