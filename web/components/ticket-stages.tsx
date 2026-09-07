"use client"

// THE STAGES A TICKET WENT THROUGH — "closed on x, reopen on y, closed again on
// z", which is the owner's own sentence for what she wanted to be able to read
// (2026-09-06). Team migration 0066 is the table; this is the one place a person
// reads it.
//
// ── WHY IT SITS ON THE ACTIVITY TAB AND NOT ANYWHERE ELSE ───────────────────
//
// She named the place: "keep it in activity". The Activity tab is already where
// this record's history is read, and every status move has been written there as
// PROSE for as long as the module has existed ("Alaap set T-0412 to in
// progress"). So this is deliberately NOT a second telling of those sentences —
// it would be the same facts twice, in the same tab, once as a list and once as
// a feed, and the feed would win because it is longer.
//
// What the feed cannot do is the SEQUENCE and the ARITHMETIC. Its rows are
// interleaved with replies, edits, attachments and notes; they are paged, so the
// stage moves on a busy ticket are not all on the screen at once; and none of
// them says how LONG anything took, because a sentence about an event cannot.
// This strip answers exactly the three questions the feed cannot — which rungs,
// in what order, for how long each — in about six lines above it, and then gets
// out of the way.
//
// ── WHAT IT SAYS WHEN THERE IS NOTHING TO SAY ───────────────────────────────
//
// Words, never numbers. Every ticket that existed before 0066 has an empty
// history and cannot be given one, so `recorded: false` prints "This ticket has
// no record of the stages it went through." — the same posture the dashboard's
// raised-as panel already takes about its own missing rows ("{count} older
// tickets have no record of what they arrived as"). Drawing zeroes there would
// be a measurement nobody took, wearing the clothes of one that was.
//
// And the half-recorded case gets its own line: a ticket raised before the table
// existed and moved after it has a REAL sequence that does not start at the
// beginning, so the first stage's own start is unknown and the strip says so
// rather than drawing a rung that begins where the recording does.
//
// ── THE NUMBER IS WORKING DAYS ──────────────────────────────────────────────
//
// The owner, twice and with emphasis: "the time counts monday-friday! saturday
// and sunday do not count towards how long it took!" The arithmetic is the
// server's, through the one seam (`shared/business-days.ts`), so the strip never
// has to know the rule — and there is no caption saying "working days only",
// deliberately: she had exactly that subtitle removed from the closing-time
// panel on 6 Sep 2026 with "It's not needed. We already know it."

import * as React from "react"

import { Badge } from "@shared/ui/components/badge/badge"
import { Card } from "@shared/ui/components/card/card"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"

import type { HelpStatus, TicketStageHistory } from "@shared/types"
import { content as contentApi } from "@/lib/api"
import { helpStagesKey } from "@/lib/live-resources"
import { useCached } from "@shared/web/store"
import { useT } from "@shared/web/language"

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
function stageLabel(status: HelpStatus, t: (s: string) => string): string {
  switch (status) {
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

export function TicketStages({ ticketId }: { ticketId: string }) {
  const t = useT()
  const stagesQ = useCached<TicketStageHistory>(helpStagesKey(ticketId), () =>
    contentApi.helpStages(ticketId)
  )
  const history = stagesQ.data

  // NEVER SWALLOW (ERROR-HANDLING.md), and the three states are checked in the
  // order the portal's thread checks them: a failed read has not come back, not
  // come back empty, so `error` is asked first and `loading` second.
  if (stagesQ.error && history === undefined)
    return (
      <p className="text-muted-foreground text-caption">
        {t("We can't show this right now")} {t("Try again in a moment.")}
      </p>
    )
  if (history === undefined) return <Skeleton className="h-16 w-full rounded-[var(--radius)]" />

  if (!history.recorded)
    return (
      <p className="text-muted-foreground text-caption">
        {t("This ticket has no record of the stages it went through.")}
      </p>
    )

  // A REOPEN IS DRAWN WHERE IT HAPPENED, not counted in a corner. The owner's
  // sentence is a SEQUENCE — "closed on x, reopen on y, closed again on z" — so
  // the badge sits on the rung the ticket came back out of `resolved` INTO,
  // which is the row a person's eye lands on when they ask "what happened after
  // we answered it". The count she also asked for is that badge, counted: it is
  // on the page, in the right places, and there is no second number beside it to
  // disagree with them.
  const reopenAt = new Set<number>()
  history.spans.forEach((span, i) => {
    if (i > 0 && history.spans[i - 1].status === "resolved" && span.status !== "resolved")
      reopenAt.add(i)
  })

  return (
    <div className="flex flex-col gap-2">
      <span className="text-muted-foreground text-caption">{t("Stages")}</span>
      {/* UI-RULEBOOK K5: one card around the whole list, hairline between rows,
          never a box per row. */}
      <Card className="flex flex-col p-0">
        {history.fromCreation ? null : (
          <p className="text-muted-foreground text-caption px-3 py-2">
            {t("Earlier stages have no record.")}
          </p>
        )}
        <ul className="divide-border divide-y">
          {history.spans.map((span, i) => (
            <li key={span.from + span.status} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-caption">{stageLabel(span.status, t)}</span>
                {reopenAt.has(i) ? (
                  <Badge variant="warning" size="pill">
                    {t("Reopened")}
                  </Badge>
                ) : null}
              </span>
              <span className="text-muted-foreground text-caption flex items-center gap-2">
                {/* THE OPEN RUNG. `to === null` is the stage the ticket is in
                    NOW, and its number is counted to the moment the door
                    answered — so it is marked rather than left to read as a
                    finished span that happens to be last. */}
                {span.to === null ? <span>{t("Still here")}</span> : null}
                <span>{t("{count}d", { count: span.workingDays })}</span>
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
