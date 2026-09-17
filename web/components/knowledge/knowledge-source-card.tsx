"use client"

// ONE SOURCE, AS A CARD — the row the knowledge gallery actually needs, and
// the one the generic engine (screen-renderer.tsx's `display: "cards"` path)
// cannot draw on its own: this collection's own kind glyph (KNOWLEDGE_KIND_ICON)
// and a card small enough that four fit across a row, which is exactly what
// the engine's stock card was never asked to be. This stays a host-composed
// component rather than a recipe (CLAUDE.md's "engine-expressible → a
// recipe; bespoke → a host-composed component") for that reason alone now —
// see below for what moved OUT of it.
//
// FOUR FACTS NOW, NOT SIX — client ruling, 17 Sep 2026, verbatim: "On the
// knowledge base, I want the cards smaller, so I want to see at least four in
// one row. Also, the edit button is deleted from the card. It should just be
// on the detail page." Mark, title, kind, one meta line (R81's spirit: no
// hint, no explanatory paragraph riding along with the facts a reader did not
// ask this card for). Compartment, app, sharing, pieces and sightings are
// gone from the CARD — every one of them is still readable, in full, on the
// record's own Overview tab (`knowledge-detail.tsx`'s `overviewItems`), which
// is where a reader who wants the whole picture already goes to open it.
//
// THE EDIT PENCIL IS GONE, NOT MOVED. It used to write `accountId` and
// `visibility`/`visibleToAppId` in place, through `content.updateKnowledge`
// (`onEditFiling`). `knowledge-detail.tsx` already carries an icon-only Edit
// button on the record's own title (client ruling, 2026-08-31: "edit, only
// the pencil icon") that opens the identical `KnowledgeFormDialog` and writes
// the identical fields — so nothing this card's pencil could do is now
// unreachable; it is reachable in exactly one place instead of two, which is
// what she asked for.

import * as React from "react"

import { Badge } from "@shared/ui/components/badge/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@shared/ui/components/card/card"
import { Icon, type IconName } from "@shared/web/screen-engine/icon"
import { formatRelative, type Translate } from "@shared/web/format"
import { useLanguage } from "@shared/web/language"

import { KNOWLEDGE_KIND, KNOWLEDGE_KIND_ICON } from "@/components/deep-link/shape"
import type { KnowledgeSource } from "@shared/types"

/** HOW IT REACHED US — the true fact behind the count, in the hub's own
 * words, never the schema's own term for it ("sighting" was ruled out
 * entirely, not merely undefined: it names an internal modelling concept no
 * person needs, unlike "passage", which named a real product idea and is now
 * a glossary term). Returns `null` at zero — a note nobody has typed a
 * sighting onto, or a source whose Google sweep has not run since the
 * fold-writer shipped — because a zero here is a fact about THIS row, not
 * about every row in the base, and a card that says so reads as broken on
 * one that has simply never been swept. `null` means the line is not drawn
 * at all, not drawn empty.
 *
 * NO LONGER RENDERED ON THE CARD ITSELF (the card's one meta line is "last
 * edited" now, below) — STILL EXPORTED, because `knowledge-form-dialog.tsx`'s
 * mirrored-source edit form says the same fact on its own, reusing the one
 * function that decided the wording rather than drifting into a second
 * sentence for one number. */
export function sightingsLine(source: Pick<KnowledgeSource, "sightingsCount">, t: Translate): string | null {
  if (source.sightingsCount === 0) return null
  if (source.sightingsCount === 1) return t("Reached us through one person")
  return t("Reached us through {count} people", { count: String(source.sightingsCount) })
}

export function KnowledgeSourceCard({
  source,
  onOpen,
}: {
  source: KnowledgeSource
  /** open the record itself — the whole card is the press target, same as
   * every other card in the app (screen-renderer.tsx's own reasoning), and
   * now the ONLY press target: there is no second control on the cell to
   * intercept a click before it reaches this one. */
  onOpen: () => void
}) {
  const { t, lang } = useLanguage()
  return (
    <Card
      variant="raised"
      interactive
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onOpen()
        }
      }}
    >
      <CardHeader className="flex-row flex-wrap items-start gap-2.5">
        <span className="bg-muted text-muted-foreground grid size-8 shrink-0 place-items-center rounded-[var(--radius)]">
          <Icon
            name={(KNOWLEDGE_KIND_ICON[source.kind] ?? "file") as IconName}
            aria-hidden
            className="size-4"
          />
        </span>
        {/* CLAMPED TO TWO LINES, not three — a narrower card (four to a row
            instead of three) has less room for a long title before it starts
            crowding the kind chip and the meta line beneath it. The native
            `title` attribute still carries the name in full, exactly as the
            wider card did. */}
        <CardTitle
          className="min-w-0 flex-1 line-clamp-2 text-sm break-words"
          title={source.active ? source.title : t("{title} (not in use)", { title: source.title })}
        >
          {source.active ? source.title : t("{title} (not in use)", { title: source.title })}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5 text-sm">
        <span className="flex flex-wrap items-center gap-1.5">
          {/* KIND — the one fact a title alone cannot say (a calendar entry
              beside a ticket beside a file somebody uploaded), in the same
              words the record's own Overview tab and the Type facet already
              use (`KNOWLEDGE_KIND`), so this card never coins a second name
              for the same thing. Plain, uncoloured — R86: the one coloured
              chip on this card is the STATUS badge beside it. */}
          <Badge variant="secondary" className="w-fit">
            {KNOWLEDGE_KIND[source.kind] ?? source.kind}
          </Badge>
          {/* STATUS, WITH THE COLOUR — client ruling, 17 Sep 2026: "knowledge
              source in use green dot." Green while in use, grey once not,
              the same `knowledge-detail.tsx` head chip draws for the record
              itself now. */}
          <Badge variant="status" dot={source.active ? "shipped" : "archived"}>
            {source.active ? t("In use") : t("Not in use")}
          </Badge>
        </span>
        {/* THE ONE META LINE. "Last edited" beats a count of pieces or
            sightings here: it is the one fact true of every source (a note,
            a file, a mirrored record) and the one a reader scanning a wall of
            these actually wants at a glance — is this stale? Everything else
            this card used to carry (where it's filed, who may use it, how
            many pieces, how it reached us) is still on the record's own
            Overview tab, one press away through the card itself. */}
        {(source.updatedAt || source.createdAt) && (
          <p className="text-muted-foreground text-xs">
            {t("Last edited {when}", {
              when: formatRelative(source.updatedAt ?? source.createdAt, t, lang),
            })}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
