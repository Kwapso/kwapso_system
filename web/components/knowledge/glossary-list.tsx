"use client"

// THE GLOSSARY, AS A LIST: the words this team uses and what each one means,
// alphabetical (the door's own "title" sort, `KNOWLEDGE_SORTS.title`,
// workers/content/src/lib/knowledge.ts), one row per word.
//
// A DEFINITION LIST, NOT `KnowledgeSourceCard`'s GRID (R80) AND NOT A HEADING
// WITH A SUBTITLE (R72). A word and its meaning is content, not a section
// with a descriptive blurb under it, so it is marked up as what it actually
// is, `<dl>`/`<dt>`/`<dd>`, the same pair the HTML standard names for exactly
// this shape and one a heading census (R72's own `<h1>`-`<h4>` set) never
// reads as a heading at all.
//
// EDIT AND DELETE, THE SAME TWO ACTS EVERY KNOWLEDGE SOURCE ALREADY HAS
// (knowledge-detail.tsx's own "correct" and "stop using this"), just reached
// from the row instead of from a record screen nobody would otherwise open
// for a one-line definition. Delete here is the ordinary knowledge-base
// "delete" (deactivate-never-delete, CLAUDE.md): the row survives with
// `active: false` and the assistant stops reading it, through `setKnowledgeActive`,
// the exact door the record screen's own "Stop using this" button calls.
//
// THE ROW RULE IS THE KIT'S OWN SEPARATOR, never a `border-b` class: the
// kit's borders law (shared/ui/foundations/rules/conformance.mjs) refuses a
// bare CSS border, so the divider between two same-tone rows is the same
// `<Separator>` app-shell.tsx already reaches for between its own stacked
// blocks.

import * as React from "react"

import { Button } from "@shared/ui/components/button/button"
import { Separator } from "@shared/ui/components/separator/separator"
import { PencilSimple, Power } from "@shared/ui/foundations/icons"
import { useConfirm } from "@shared/web/use-confirm"
import { useLanguage } from "@shared/web/language"

import { content } from "@/lib/api"
import { knowledgeKey } from "@/lib/live-resources"
import { invalidate } from "@shared/web/store"
import type { KnowledgeSource } from "@shared/types"

export function GlossaryList({
  rows,
  teamId,
  canEdit,
  canDelete,
  onEdit,
}: {
  rows: KnowledgeSource[]
  teamId?: string | null
  canEdit: boolean
  canDelete: boolean
  onEdit: (id: string) => void
}) {
  const { t, lang } = useLanguage()
  const { ask, dialog } = useConfirm(() => teamId && invalidate(knowledgeKey(teamId)))
  // DEFENSIVE, NOT LOAD-BEARING. The door already returns these sorted by
  // title (the tab's own `defaultSort`); re-sorting a loaded page of ~50
  // rows costs nothing and keeps the list alphabetical even on the resting
  // (unsearched) fallback, which reads off the whole-base list rather than
  // this tab's own sorted fetch.
  const sorted = [...rows].sort((a, b) => a.title.localeCompare(b.title, lang))

  return (
    <dl className="flex flex-col gap-4">
      {sorted.map((source, i) => (
        <React.Fragment key={source.id}>
          {i > 0 && <Separator />}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <dt className="text-sm font-semibold">{source.title}</dt>
              <dd className="text-muted-foreground mt-1 text-sm">{source.body}</dd>
            </div>
            {(canEdit || canDelete) && (
              <div className="flex shrink-0 items-center gap-1">
                {canEdit && (
                  <Button
                    variant="secondary"
                    size="icon"
                    aria-label={t("Correct this word")}
                    onClick={() => onEdit(source.id)}
                  >
                    <PencilSimple className="size-3.5" />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="secondary"
                    size="icon"
                    aria-label={t("Take this word away")}
                    onClick={() =>
                      ask({
                        title: t("Take this word away?"),
                        body: t(
                          "The assistant stops reading it right away. Nothing is deleted, so you can bring it back any time from the knowledge base."
                        ),
                        action: t("Take this away"),
                        run: () => content.setKnowledgeActive(source.id, false).then(() => true),
                      })
                    }
                  >
                    <Power className="size-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </React.Fragment>
      ))}
      {dialog}
    </dl>
  )
}
