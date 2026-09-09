"use client"

// THE LADDER A TICKET CLIMBS — every stage, the ones behind it and the ones
// still ahead, with the timestamp on each one we have a record of.
//
// ── WHY IT MOVED OUT OF THE ACTIVITY RAIL, 2026-09-09 ───────────────────────
//
// It used to be handed to `RecordScreen`'s `activityHead` slot, which draws it
// INSIDE the slide-in behind the ink footer's `All · N` door. That was read off
// one client sentence — "keep it in activity", 2026-09-06 — and the reading was
// wrong, which we know because she has now asked three times where the thing
// she commissioned is, most recently: "i still do not see the ticket status
// rail!! itested closing with T3024".
//
// The two asks were never the same ask. On 2026-09-06 she asked for TWO things
// on the same day. One was a history — "closed on x, reopen on y, closed again
// on z" — and she said to keep that in activity. The activity feed already
// does that, in prose, one sentence per move ("Alaap set T-0412 to in
// progress"), and it still does; nothing here takes it away. The other, and
// the older one, was a PROGRESS component: "I want to have visibility of all
// the steps, the ones that are done and the ones that are missing. I also want
// this graphic to show the timestamps." She was shown options and chose the
// timeline. A thing you open a drawer to find is not a thing that gives you
// visibility of where a ticket stands — it is a second history, filed behind
// the first one.
//
// So the placement ruling was applied to the wrong component, and the
// correction is to draw the progression ON the record. `help-detail.tsx`
// carries the argument for the exact spot it landed in.
//
// AND IT IS NOT A DUPLICATE OF ANYTHING. Checked before moving, because "one
// thing in two places" is how screens drift: as of the 2026-09-06 chip ruling
// this screen shows the ticket's stage NOWHERE. The status pill left the header
// with the other three pills, `headerExtra`'s stepper went with the hero, and
// `overviewItems` says so in its own comment ("as of this pass the ticket's
// STAGE is not shown anywhere on this screen"). This is the only thing on the
// ticket that says what stage it is at, which is a second, independent reason
// for it to be visible without opening a drawer.
//
// ── WHAT IT DRAWS WHEN THE HISTORY IS THIN, WHICH IS THE COMMON CASE ────────
//
// Stage recording began with team migration 0066. Most tickets in the live
// database predate it or were moved once after it, so ONE recorded event, or
// none, is the ordinary ticket rather than the edge case — `T3024`, the ticket
// she tested with, is `resolved` and has exactly one. A drawing that only shows
// what was recorded would put a single lonely rung on that screen and nothing
// else, which reads as broken; that is very likely part of why she says she
// cannot see it at all.
//
// So the ladder is not built out of the history. It is built out of
// `HELP_STATUSES` — the stage list itself — and the history is laid ON it:
//
//   · a rung BEHIND the ticket's current stage is done (the kit's tick), and
//     carries its timestamp and its working-day count IF we recorded one;
//   · a rung the ticket is standing on is the current one (the kit's mango);
//   · a rung AHEAD of it is a later stage, in the kit's disabled ink — "later
//     is disabled ink, not hidden", status-stepper.tsx, which is exactly the
//     half she has now asked for twice: "the ones that are missing".
//
// The presence or absence of a TIMESTAMP is what says whether a stage's move
// was recorded. That is the whole statement, and it is made without a sentence:
// a rung with no time under a ticket that has plainly passed it is a gap in the
// recording, said by the gap itself. Two sentences that used to say it in words
// — "This ticket has no record of the stages it went through." and "Earlier
// stages have no record." — are deleted with this pass, because the client has
// twice sent back copy that explains an empty state to her ("It's not needed.
// We already know it.", 6 Sep 2026, about the closing-time panel's subtitle).
// A ticket with nothing recorded now draws a complete, correct ladder standing
// on its own stored status, and says nothing about the recording at all.
//
// THE POSITION COMES FROM THE TICKET ROW, NOT FROM THE READ. `status` is a prop
// rather than something inferred from the last recorded span, and that is what
// makes the paragraph above possible: the screen cannot render at all without
// the ticket row, so the ladder is correct on the first frame and only the
// times arrive late. There is deliberately no skeleton in its place.
// `status-stepper.tsx`'s state 6 says a progression must not be drawn before
// its stages arrive "would state a position the record may not be at" — that
// rule is about not KNOWING the position, and here we know it from the
// authoritative column; what is still in flight is the annotation, not the
// position.
//
// ── THE REOPEN IS DRAWN WHERE IT HAPPENED ───────────────────────────────────
//
// Her sentence is a sequence — "closed on x, reopen on y, closed again on z" —
// so a ticket that came back out of `resolved` gets EXTRA rungs below the first
// climb rather than a counter in a corner: the ladder, then the stages of the
// second climb in the order it really took them, the first of them wearing
// "Reopened", then whatever of the ladder that climb has not reached yet. Read
// top to bottom it is her sentence, with the dates on it.
//
// ── THE NUMBER IS WORKING DAYS ──────────────────────────────────────────────
//
// The owner, twice and with emphasis: "the time counts monday-friday! saturday
// and sunday do not count towards how long it took!" The arithmetic is the
// server's, through the one seam (`shared/business-days.ts`), so this file
// never has to know the rule — and there is no caption saying "working days
// only", deliberately: she had exactly that subtitle removed from the
// closing-time panel on 6 Sep 2026.
//
// ── IT IS THE KIT'S OWN STEPPER, NOT A LADDER DRAWN HERE ────────────────────
//
// `StatusStepper variant="steps" orientation="vertical"` is the kit's wizard
// rail: a column of mark-beside-label rows, and the done / current / later
// skins — the tick, the one mango, the disabled fill and ink — are its, not
// redrawn here. Everything this file adds rides in `label`, which the kit
// types as a `ReactNode` for exactly this. `maxVisible={0}` turns off the
// kit's "over five stages the tail folds into +n": a fold is right for a hero
// pill row a client reads at a glance and wrong here, where the folded tail
// would be precisely the stages she asked to be able to see.

import * as React from "react"

import { Badge } from "@shared/ui/components/badge/badge"
import { StatusStepper, type StatusStage } from "@shared/ui/components/status-stepper/status-stepper"

import { HELP_STATUSES, RETIRED_HELP_STATUSES } from "@shared/types"
import type { HelpStatus, HelpStatusEver, TicketStageHistory, TicketStageSpan } from "@shared/types"
import type { Language } from "@shared/i18n"
import { content as contentApi } from "@/lib/api"
import { formatDateTime } from "@shared/web/format"
import { helpStagesKey } from "@/lib/live-resources"
import { useCached } from "@shared/web/store"
import { useLanguage } from "@shared/web/language"

/** THE LADDER, IN THE WORDS THE REST OF THE APP USES FOR IT.
 *
 * A FUNCTION OF `t` RATHER THAN A COPY TABLE, and the difference matters: the
 * app's other status map (`HELP_STATUS`, web/components/deep-link/shape.tsx) is
 * keyed by DATABASE words, so none of its values is an extracted position and
 * `t(HELP_STATUS[s])` would look up keys the catalogue does not hold — handing
 * every non-English reader the English word on a screen that looks finished.
 * `tickets-collection.tsx` carries the same note about its own three literals.
 * So the sentences are written out here as literals, and five of the seven were
 * already in the catalogue because other screens say them. */
function stageLabel(status: HelpStatusEver, t: (s: string) => string): string {
  switch (status) {
    // A RETIRED STAGE STILL GETS ITS WORDS. `awaiting_validation` left the
    // lifecycle on 7 Sep 2026 (shared/types.ts, `HELP_STATUSES`), and this case
    // is why the parameter is `HelpStatusEver` and not `HelpStatus`: the rows
    // behind this strip are `help_status_events`, which is append-only, so a
    // ticket that really sat waiting on a client still has that rung and always
    // will. The stage is unreachable going forward and perfectly readable
    // looking back — the sentence a person is owed about their own ticket's
    // past is the one we used at the time, not the raw enum and not a blank.
    case "awaiting_validation":
      return t("Waiting on you")
    case "new":
      return t("New")
    case "triaged":
      return t("Triaged")
    case "scheduled":
      return t("Scheduled")
    case "in_progress":
      return t("In progress")
    case "ready":
      return t("Ready")
    case "resolved":
      return t("Resolved")
  }
}

/** EVERY RUNG THIS COMPONENT MAY DRAW, IN THE ORDER A TICKET CLIMBS THEM.
 *
 * `HELP_STATUSES` is written in the order the state machine moves
 * (shared/types.ts), so the live half of the ladder is that array verbatim —
 * never a second list typed out here, which is the shape that stops matching
 * the day a stage is added.
 *
 * The retired half goes IN FRONT of it, and that position is not arbitrary:
 * `awaiting_validation` led `HELP_STATUSES` while it existed (it is why
 * `OPEN_HELP_STATUSES` used to begin with it), because a ticket waited for a
 * client's go-ahead before anybody triaged it. A rung from this half is only
 * ever DRAWN on a ticket that really stood on it — see `buildRungs` — so a
 * modern ticket never grows a dead first rung. If a stage is ever retired from
 * the MIDDLE of the ladder, this concatenation is the line that has to change,
 * and `RETIRED_HELP_STATUSES` having exactly one member today is why it is
 * written as the simple thing rather than as a position map nobody can check. */
const LADDER: readonly HelpStatusEver[] = [...RETIRED_HELP_STATUSES, ...HELP_STATUSES]

function isRetired(status: HelpStatusEver): boolean {
  return (RETIRED_HELP_STATUSES as readonly string[]).includes(status)
}

/** One row of the drawing: a stage, and the visit to it we can prove. */
type Rung = {
  key: string
  status: HelpStatusEver
  /** Position on the LADDER, 1-based — not the row's own index, which repeats
   * a stage's number when a ticket climbs past it twice. That repeat is the
   * point: a reopened ticket really is back at stage 04. */
  number: number
  /** The recorded visit, or null where there is no record of one. */
  span: TicketStageSpan | null
  /** First rung of a second (or third) climb — the moment it came back. */
  reopened: boolean
}

/** THE WHOLE DRAWING, WORKED OUT ONCE.
 *
 * `status` is the ticket's own stored stage and is the authority on where the
 * ticket IS; `spans` are the moves we have rows for and are the authority on
 * WHEN. The two are read separately on purpose — see this file's header — so a
 * missing history costs the screen its timestamps and never its position. */
function buildRungs(
  spans: readonly TicketStageSpan[],
  status: HelpStatus
): { rungs: Rung[]; current: number } {
  // A retired stage earns its rung only by having been stood on.
  const stoodOn = new Set<HelpStatusEver>(spans.map((s) => s.status))
  const ladder = LADDER.filter((s) => !isRetired(s) || stoodOn.has(s))
  const rank = (s: HelpStatusEver) => ladder.indexOf(s)

  // ONE CLIMB PER CYCLE. A move that is not strictly FORWARD along the ladder
  // is a reopen — which covers the client's own case (`resolved` → anything)
  // and every other way back down, without this file having to name `resolved`
  // and so without it having to be corrected the next time the lifecycle is.
  const climbs: TicketStageSpan[][] = []
  for (const span of spans) {
    const climb = climbs[climbs.length - 1]
    const previous = climb?.[climb.length - 1]
    if (climb && previous && rank(span.status) > rank(previous.status)) climb.push(span)
    else climbs.push([span])
  }

  const rungs: Rung[] = []
  // THE FIRST CLIMB IS THE WHOLE LADDER — the stages it has rows for and the
  // stages it does not, which is the half she asked for twice.
  const first = climbs[0] ?? []
  for (const stage of ladder)
    rungs.push({
      key: `climb0:${stage}`,
      status: stage,
      number: rank(stage) + 1,
      span: first.find((s) => s.status === stage) ?? null,
      reopened: false,
    })
  // EVERY LATER CLIMB IS DRAWN AS IT HAPPENED, not folded back into the rungs
  // above: only the stages it really took, in order, the first of them marked.
  for (const [c, climb] of climbs.slice(1).entries())
    for (const [i, span] of climb.entries())
      rungs.push({
        key: `climb${c + 1}:${span.from}:${span.status}`,
        status: span.status,
        number: rank(span.status) + 1,
        span,
        reopened: i === 0,
      })
  // …and then the rest of the ladder that second climb has not reached, so a
  // reopened ticket still shows what is left rather than ending on its last
  // recorded move.
  const last = climbs[climbs.length - 1]
  const top = last?.[last.length - 1]
  if (climbs.length > 1 && top)
    for (const stage of ladder.slice(rank(top.status) + 1))
      rungs.push({ key: `ahead:${stage}`, status: stage, number: rank(stage) + 1, span: null, reopened: false })

  // WHERE THE TICKET IS STANDING: the LAST rung carrying its stored status, so
  // a reopened ticket is marked on the climb it is actually on rather than on
  // the first pass through the same stage. Searched from the bottom for that
  // reason. `status` is a live `HelpStatus` and the live half of the ladder is
  // never filtered, so this always finds one; the fallback is belt and braces.
  let current = rungs.length - 1
  for (let i = rungs.length - 1; i >= 0; i--)
    if (rungs[i].status === status) {
      current = i
      break
    }
  return { rungs, current }
}

/** The facts hung off a rung's name, in one line, or nothing at all where
 * there is no record of the move. `·` separators rather than a right-aligned
 * column: the kit's vertical rail sizes its label to its own content, so a
 * second column would need this file to override the kit's own layout. */
function rungFacts(span: TicketStageSpan | null, t: (s: string, v?: Record<string, string | number>) => string, lang: Language): string {
  if (!span) return ""
  const facts = [formatDateTime(span.from, lang)]
  // THE OPEN RUNG. `to === null` is the stage the ticket is in NOW, and its
  // number is counted to the moment the door answered — so it is marked rather
  // than left to read as a finished span that happens to be last.
  if (span.to === null) facts.push(t("Still here"))
  facts.push(t("{count}d", { count: span.workingDays }))
  return facts.join(" · ")
}

export function TicketStages({ ticketId, status }: { ticketId: string; status: HelpStatus }) {
  const { t, lang } = useLanguage()
  const stagesQ = useCached<TicketStageHistory>(helpStagesKey(ticketId), () =>
    contentApi.helpStages(ticketId)
  )
  const history = stagesQ.data

  const { rungs, current } = buildRungs(history?.spans ?? [], status)

  const stages: StatusStage[] = rungs.map((rung) => {
    const facts = rungFacts(rung.span, t, lang)
    return {
      id: rung.key,
      label: (
        <span className="inline-flex items-center gap-[var(--space-1h)]">
          <span>{stageLabel(rung.status, t)}</span>
          {rung.reopened ? (
            <Badge variant="warning" size="pill">
              {t("Reopened")}
            </Badge>
          ) : null}
          {facts ? <span className="text-muted-foreground">· {facts}</span> : null}
        </span>
      ),
    }
  })

  return (
    <div className="flex flex-col gap-[var(--space-3)]">
      <span className="text-muted-foreground text-caption">{t("Stages")}</span>
      <StatusStepper
        stages={stages}
        current={current}
        variant="steps"
        orientation="vertical"
        // Every rung, always — see this file's header on the fold.
        maxVisible={0}
        label={t("Stages")}
        // The tick has no words of its own and the kit's default for them is
        // English. The catalogue already answers this one.
        doneLabel={t("Done")}
        // THE NUMBER IS THE LADDER'S, NOT THE ROW'S. The kit hands this the
        // row's 1-based index; a reopened ticket has more rows than stages, so
        // without this a second climb would number its stages 07, 08, 09 and
        // invent a ladder twice as long as the one that exists. Two tabular
        // digits in the reader's own numbering system, exactly as the kit's own
        // default does it — only the value is different.
        formatNumber={(value) =>
          new Intl.NumberFormat(lang, { minimumIntegerDigits: 2, useGrouping: false }).format(
            rungs[value - 1]?.number ?? value
          )
        }
      />
      {/* NEVER SWALLOW (ERROR-HANDLING.md) — but a failed read costs this
          drawing its timestamps, not its position, so the ladder above stays
          and the failure is said under it. This is an ERROR and not an empty
          state: the copy the client sent back twice was copy explaining an
          absence to her, and "we could not load it" is a different sentence
          from "there is nothing here". */}
      {stagesQ.error && history === undefined ? (
        <p className="text-muted-foreground text-caption">
          {t("We can't show this right now")} {t("Try again in a moment.")}
        </p>
      ) : null}
    </div>
  )
}
