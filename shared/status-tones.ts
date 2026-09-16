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
//   blocked   — nothing has happened yet, and RED — a ticket just raised and
//               unread, a story nobody has picked up. AMENDED 16 SEP 2026
//               EVENING, client ruling, verbatim: "let's do red for: apps
//               not started, tickets new, stories open." The six-value
//               `DotTone` this file returns has no literal named `red` (that
//               spelling is `PriorityTone`'s, `shared/departments.ts`) — the
//               red hue is `blocked`'s: `--dot-blocked` and `--dot-red` both
//               resolve to `--kw-poppy`/`--destructive` (`shared/ui/
//               foundations/tokens/tokens.css`), the same pairing `shared/
//               app-stages.ts`'s own header states for its own eight. So
//               "the red tone" for a `HelpStatus`/`StoryStatus` IS `blocked`
//               — the same tone this file's tail note already keeps defined
//               for the "stuck on somebody outside the team" reading, now
//               with a second, unrelated caller the same way `shipped`/
//               `done` already share one hex for two meanings below. This
//               also makes `new`/`open` agree, literally, with App's own
//               "Not started" (`APP_STAGES[0].dotTone`, already `blocked`)
//               rather than only rhyming with it in tier the way the two
//               used to before this ruling.
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
//   archived  — put away, done with. NOTHING IN THIS FILE ASSIGNS IT ANY
//               MORE as of the same 16 Sep 2026 ruling — the client's other
//               half of it, verbatim: "let's always assign gray to
//               archived", read together with the red sentence above, is
//               what MOVED `new`/`open` off this tone rather than leaving
//               them grey: grey is for a record that really is archived
//               (App's own `Archived` stage still reads it, unchanged), not
//               for one that merely has not started. The tone stays in the
//               `DotTone` union and in `Badge`'s own six — a `HelpStatus` or
//               `StoryStatus` that is archived in the ordinary English sense
//               does not exist today, so nothing here claims it, the same
//               "defined, nothing here returns it" shape `blocked` itself
//               used to be in (below) before this same ruling gave it back
//               a caller.
//
// NOTHING IN THIS FILE ANSWERED `blocked` FOR A WHILE, AND THE TIER WAS NEVER
// DEAD — read this before assuming a tone with no caller is safe to delete.
// It lost its last answer in two steps, both the client's, and got a new one
// in a third.
//
//   7 Sep 2026 — she retired `awaiting_validation`, the stage where she had not
//   said yes yet (shared/types.ts, `HELP_STATUSES`, carries her sentence). The
//   MEANING did not go with it: waiting became a PREDICATE over the ticket's
//   conversation rather than a stored word (`waitingClause`,
//   workers/content/src/lib/help.ts: "we spoke last and nobody has answered"). A
//   predicate has no row in a `Record<HelpStatus, …>` by construction, so it got
//   `waitingDotTone()` at the foot of this file instead.
//
//   9 Sep 2026 — "remove the color from the status header!" … "column header
//   should have no color". The ticket board's column heads were that function's
//   only caller, so it is gone too (the note where it stood says the rest).
//
//   16 Sep 2026 EVENING — the red ruling quoted above gave `blocked` a caller
//   again, `HELP_STATUS_DOT_TONE.new` and `STORY_STATUS_DOT_TONE.open`, for a
//   reading that has nothing to do with "stuck on somebody outside the team":
//   a ticket just raised has nobody to be stuck on yet. Two unrelated
//   meanings sharing one tone is not new to this file — `shipped`/`done`
//   already do it for the same reason a six-tone kit is asked to colour more
//   than six ideas — so this is the third caller-count change to `blocked`
//   in this file's life (an answer, then none, then a different answer), not
//   a fourth tone hiding behind the same name.
//
// `blocked` was, for nine days, a TONE this file defined and nothing here
// returned — `DOT_TONE_FILL` on the tickets screen still mapped it in that
// window only because that map is a total `Record<DotTone, …>` on purpose.
// The "stuck on somebody OUTSIDE the team" reading is unchanged and still
// exactly what `awaiting_validation` meant and what the waiting predicate
// means now; it is simply no longer the only reason this file hands the tone
// out.
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
  // Raised, nobody has read it yet — the "Not started" tier, RED since the
  // 16 Sep 2026 evening ruling quoted at the top of this file ("tickets
  // new" is one of her three). `blocked` is the tone that carries red in
  // this six-value union — see that ruling's own paragraph for the hex.
  new: "blocked",
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

/* `waitingDotTone()` STOOD HERE, AND THE CLIENT TOOK ITS ONE CALLER AWAY.
 *
 * It was added on 7 Sep 2026 for the ticket board's fifth column — the one that
 * counts a PREDICATE and not a stage (`waitingClause`,
 * workers/content/src/lib/help.ts: the last reply came from our side and nobody
 * has answered). That column used to ask `helpStatusDotTone("awaiting_validation")`,
 * which borrowed the tone of a STAGE to paint a predicate, and the call died with
 * the stage when she retired it. A named function here kept the property the old
 * call had — the colour was ASKED FOR rather than typed at the column — without
 * the bug.
 *
 * CLIENT, 2026-09-09, over the same board: "remove the color from the status
 * header!" … "column header should have no color". No column head on that board
 * carries a dot any more, so nothing asks this file what colour waiting is, and
 * an exported name nobody imports is a contract nobody agreed to
 * (web/test/dead-exports.test.ts). It is deleted rather than parked: the seam it
 * defended was about which SOURCE answers a colour question, and there is no
 * longer a colour question. The meaning is untouched and was never a colour —
 * `waitingClause` still decides who is waiting, and the board's own column says
 * it in words.
 *
 * If a waiting SWATCH is ever wanted somewhere a colour is genuinely the
 * information (a legend, a chart series), write it back here in this shape
 * rather than typing "blocked" at that call site — that argument was correct and
 * only its subject went away. */

/** A STORY'S FOUR STAGES → THE CHIP'S DOT. Same `Record` shape, same reason:
 * a fifth `StoryStatus` fails here rather than rendering silently. */
const STORY_STATUS_DOT_TONE: Record<StoryStatus, DotTone> = {
  // Written down, nobody has started — the "Not started" tier, RED since the
  // 16 Sep 2026 evening ruling quoted at the top of this file ("stories
  // open" is the third of her three). `blocked` carries red in this
  // six-value union — see that ruling's own paragraph for the hex.
  open: "blocked",
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
