"use client"

// ONE RECORD'S CONNECTIONS TAB — the read, its four states, and the picture.
//
// EXTRACTED RATHER THAN COPIED, on the day a second screen wanted it. It was
// written inside `knowledge-detail.tsx` when the knowledge base was the only
// screen that drew a map; the meeting screen now draws one too (the owner's
// ruling, 9 Sep 2026: "yes ofc"), and the four states below are precisely the
// part that must not drift between them. Two of them are bug fixes with their
// own suites — a failed read that used to sit as a loading skeleton for ever,
// and a PERMANENT refusal that used to offer a "Try again" that could only
// refuse again — and a copy is how a fix comes to live on one screen and not
// the other.
//
// THE FOURTH STATE IS THE COMMON ONE HERE, which is why it is a prop rather
// than a constant. Measured on staging, 9 Sep 2026: of 460 live meetings, 268
// have no account, no app, no purpose and no artefacts filed against them —
// 58% of this tab's openings on that screen end in the empty register. That is
// not a failure and must not read like one, and the sentence that is honest on
// a meeting ("nothing has been filed against this call") is not the sentence
// that is honest on a knowledge source. So each screen says its own, and the
// register itself is the kit's (27.21) rather than an invention.

import * as React from "react"

import { Button } from "@shared/ui/components/button/button"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { useT } from "@shared/web/language"

import { ApiFailure } from "@/lib/api"
import { RelationshipMap, type MapLink, type MapNode } from "@/components/records/relationship-map"

export type ConnectionsRead = {
  data:
    | {
        focus: MapNode | null
        nodes: MapNode[]
        links: MapLink[]
        total: number
        capped: boolean
      }
    | undefined
  error: unknown
  refresh: () => void
}

export function ConnectionsPanel({
  teamId,
  read,
  emptyTitle,
  emptyDescription,
  refusedText,
}: {
  teamId: string
  /** The caller's own `useCached(recordMapKey(table, id), …)`. Passed in rather
   * than opened here, because the badge on the tab is counted off the SAME read
   * (R16) and a hook inside this panel would be a second one. */
  read: ConnectionsRead
  /** What this record says when it is connected to nothing yet — the kit's
   * register, in the screen's own words. */
  emptyTitle: string
  emptyDescription?: string
  /** What a PERMANENT refusal (400) says on this screen. */
  refusedText: string
}) {
  const t = useT()
  if (read.data)
    return (
      <RelationshipMap
        teamId={teamId}
        focus={read.data.focus}
        nodes={read.data.nodes}
        links={read.data.links}
        total={read.data.total}
        capped={read.data.capped}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
      />
    )
  if (read.error)
    // A FAILED READ SAYS SO — the house failure pattern by name (CLAUDE.md).
    // This used to fall through to the loading skeleton on any error, four grey
    // rows sitting there for ever for a door that had already answered "no".
    //
    // BUT NOT EVERY REFUSAL IS THE SAME REFUSAL. `getKnowledgeMap`'s 400 ("that
    // is not a kind of record this map draws") is PERMANENT: seeing it means the
    // fence moved between the read that built the tab strip and this one, not
    // that the door is having a bad moment. A "Try again" on a refusal that will
    // refuse again for ever teaches the wrong lesson, so a 400 gets the honest
    // sentence and no button; anything else (a 5xx, a dropped connection) keeps
    // the retry.
    return read.error instanceof ApiFailure && read.error.status === 400 ? (
      <p className="text-muted-foreground text-sm">{refusedText}</p>
    ) : (
      <p className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
        {t("Couldn't load this record's connections.")}
        <Button variant="secondary" size="sm" onClick={() => read.refresh()}>
          {t("Try again")}
        </Button>
      </p>
    )
  return <Skeleton variant="list" lines={4} />
}
