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
// TAKE THIS WORD AWAY IS A DOOR, NOT A DIAL. Aurora, 20 Sep 2026, on this tab:
// "disable the off button (only edit)." The confirm flow and the
// `setKnowledgeActive` call below are unchanged, the same door the record
// screen's own "Stop using this" button still calls; only the row's own
// switch, `GLOSSARY_DEACTIVATE_ENABLED` below, is off (the same shape
// settings-screen.tsx's own `TEAM_SCREENS_HIDDEN` uses to hide, not delete,
// a whole section). Flip it back to draw the button again.
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
import { looksLikeHtml, richTextPlain } from "@shared/web/rich-text"

import { content } from "@/lib/api"
import { knowledgeKey } from "@/lib/live-resources"
import { invalidateFindsOf } from "@/components/records/paged-find"
import { invalidate } from "@shared/web/store"
import type { KnowledgeSource } from "@shared/types"

// See the header note above. Flipping this to `true` is the whole re-enable.
const GLOSSARY_DEACTIVATE_ENABLED = false

const DEFINITION_PREVIEW_MAX_CHARS = 140

/** THE LIST DOOR'S OWN ROW NEVER CARRIES `body` — `shared/types.ts`'s own
 * `KnowledgeSource` doc says so ("on a LIST this is always null"), and
 * `workers/content/src/lib/knowledge.ts`'s `LIST_COLS` reads `NULL AS body`
 * off the row for exactly that reason. What a list row carries instead is
 * `summary` — and for a glossary word specifically, that summary is
 * `buildSummary({ noun: "glossary word", title, accountName: null, detail:
 * body })` (`workers/content/src/lib/knowledge.ts`'s own `createGlossaryWord`
 * / update path), whose fixed opening (`buildSummary`,
 * workers/content/src/lib/knowledge-summary.ts) is always
 * "`${title}, a glossary word.`" followed by as much of the word's own
 * definition as fits — e.g. "Ready, a glossary word. Every story is closed,
 * but nobody's told the client yet." This is that same fixed opening,
 * reproduced rather than imported (a worker-side string, not a shared seam),
 * so the preview can cut it off the front and read the definition that is
 * actually left. */
function glossarySummaryPrefix(title: string): string {
  return `${title}, a glossary word.`
}

/** THE DEFINITION TEXT ITSELF — the body when a caller happens to have one
 * (a detail read, or a future list column that starts carrying it), else the
 * summary with the word's own "<title>, a glossary word." opening stripped,
 * which is what every list row (the overview tab included) actually has. */
function definitionSource(source: { title: string; summary: string | null; body: string | null }): string {
  if (source.body) return source.body
  const summary = source.summary ?? ""
  const prefix = glossarySummaryPrefix(source.title)
  return summary.startsWith(prefix) ? summary.slice(prefix.length).trim() : summary
}

/** One plain-text preview line for the overview row, under the word. The
 * Textarea this tab's own form uses never emits markup, but `body` is typed
 * against every knowledge kind, some of which DO carry rich-text HTML, so
 * this strips it through the one shared seam list/card previews already use
 * (`richTextPlain`, shared/web/rich-text.ts) rather than trusting the source.
 * Cut at the first line break or ~140 characters, whichever comes first, and
 * (R87's own rule for a clipped title, read here for a clipped body) never
 * silently: an ellipsis marks every cut that left something out. */
function definitionPreview(source: { title: string; summary: string | null; body: string | null }): string {
  const raw = definitionSource(source)
  if (!raw) return ""
  const html = looksLikeHtml(raw)
  const flat = html ? richTextPlain(raw) : raw
  const firstLine = (html ? flat : (flat.split(/\r?\n/)[0] ?? "")).replace(/\s+/g, " ").trim()
  const hasMoreLines = !html && flat.split(/\r?\n/).length > 1 && firstLine.length > 0
  if (firstLine.length > DEFINITION_PREVIEW_MAX_CHARS) {
    return `${firstLine.slice(0, DEFINITION_PREVIEW_MAX_CHARS).trimEnd()}…`
  }
  return hasMoreLines ? `${firstLine}…` : firstLine
}

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
  // BOTH KEYS, THE SAME REASON `knowledge-screen.tsx`'s OWN SEED EFFECT NOW
  // NAMES: this tab's `<PagedFind>` always carries `fixed={{ kind: "glossary" }}`,
  // so its rows read from the FOUND cache (`find:${knowledgeKey(teamId)}:…`),
  // never from `knowledgeKey(teamId)` alone — taking a word away has to drop
  // both or the row keeps showing until a reload.
  const { ask, dialog } = useConfirm(() => {
    if (!teamId) return
    invalidate(knowledgeKey(teamId))
    invalidateFindsOf(knowledgeKey(teamId))
  })
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
              <dd className="text-muted-foreground mt-1 truncate text-sm">
                {definitionPreview(source)}
              </dd>
            </div>
            {(canEdit || (GLOSSARY_DEACTIVATE_ENABLED && canDelete)) && (
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
                {GLOSSARY_DEACTIVATE_ENABLED && canDelete && (
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
