"use client"

/** R62 — THE CLIENT PORTAL'S ONE ZERO-STATE REGISTER, AND IT DRAWS BOTH ZEROS.
 *
 * The client's ruling, 2026-09-09, verbatim: "the empty because of filters
 * hosul look the same as empty collection but the add button."
 *
 * There are two zeros on both front doors and they are different FACTS. A
 * RESTING empty collection holds nothing at all — first run, and the screen
 * exists to be filled, so it names the one act. An EMPTY RESULT holds rows that
 * a search has narrowed to none — nothing is wrong, and offering "Ask us
 * something" there invites a second ticket about a question already on the
 * list. Same body, same words-then-button rhythm; the button is the only
 * difference, and it is subtracted HERE rather than at each call site, for the
 * reason R50's `empty` prop is required rather than optional.
 *
 * NO CARD ANY MORE, 22 SEP 2026. Her ruling over the A0013 Stakeholders tab,
 * generalised to both front doors: "the empty collection now. We need to get
 * rid of the card background." This SUPERSEDES the reasoning that used to sit
 * here (kept below for the record): a centred `bg-surface-panel` card,
 * reasoned as "the portal has no collection panel, so the box is its own"
 * against the 2026-09-09 "nothing sits on a bare background" rule. That
 * reasoning is overruled outright — an empty register is one of the FIVE
 * things `PAPER_ON_PURPOSE` names a grouping card may still be (R67:
 * conversation card, tile, well, not-a-section — never an empty state), and
 * this was the sixth thing pretending to be one. THE REGISTER NOW STANDS ON
 * THE PAGE GROUND, unpapered, left-aligned rather than centred, carrying the
 * same `--space-6` (24px) top inset the agency door's `CollectionEmptyState`
 * carries above its own text (`shared/web/screen-engine/collection-frame.tsx`)
 * — the two registers draw the same LAW again, in the portal's own layout,
 * never a second card.
 *
 * NO ILLUSTRATION, EVER — 27.21's own words: "no empty-box drawing, no mascot,
 * no dashed placeholder rectangle. Type and one button carry it." That line
 * survives unchanged; only the box around the type is gone. */

import * as React from "react"

import { Button } from "@shared/ui/components/button/button"
import { Plus } from "@shared/ui/foundations/icons"
import { Headline, Text } from "@shared/ui/components/typography/typography"
import { useT } from "@shared/web/language"

export function PortalEmpty({
  title,
  filteredTitle,
  description,
  filteredDescription,
  filtered = false,
  action,
}: {
  /** What the RESTING state says. Read only at rest: it is a claim about the
   * collection ("Nothing here yet.") and it is untrue while a search is on. */
  title: string
  /** What the FILTERED state says instead. Defaults to "Nothing matched that."
   * — the sentence both searched screens already said. */
  filteredTitle?: string
  /** The resting sentence under it. */
  description?: string
  /** The filtered one. Defaults to the "try fewer words" line both screens
   * already said. */
  filteredDescription?: string
  /** R62 — WHICH ZERO THIS IS. True when a search term is narrowing a list
   * that does hold rows. Never guessed: a caller passes it because it knows
   * what it asked. */
  filtered?: boolean
  /** The one labelled act, at rest. WITHDRAWN when `filtered`, by this
   * component rather than by the caller — the whole of the client's ruling. */
  action?: { label: string; onClick: () => void }
}) {
  const t = useT()
  // R62 — THE BUTTON IS THE ONLY DIFFERENCE, and it is subtracted here so a
  // call site cannot forget to. Everything below is drawn the same either way.
  const act = filtered ? undefined : action
  // NO PAPER, ANYWHERE, PERIOD — 22 SEP 2026, her ruling over the A0013
  // Stakeholders tab, generalised to the portal. `items-start`/`text-left`
  // replace the old centred, boxed read; `pt-[var(--space-6)]` is the same
  // top inset `CollectionEmptyState`'s own `bodyClassName` carries (the
  // card's own former inset token, not the larger page pad) so the two
  // registers read as one law rather than two hand-tuned numbers.
  return (
    <div
      data-slot="portal-empty"
      className="flex min-w-0 flex-col items-start gap-3 pt-[var(--space-6)] pb-[var(--space-6)] text-left"
    >
      <Headline as="h3" size="h3">
        {filtered ? (filteredTitle ?? t("Nothing matched that.")) : title}
      </Headline>
      {(filtered ? (filteredDescription ?? t("Try fewer words, or clear the search to see everything.")) : description) ? (
        <Text as="p" size="sm" tone="secondary" measure>
          {filtered
            ? (filteredDescription ?? t("Try fewer words, or clear the search to see everything."))
            : description}
        </Text>
      ) : null}
      {act ? (
        // R84 — an empty state's "add the first" is not inside a title
        // component, so black now.
        <Button variant="inverse" className="gap-1" onClick={act.onClick}>
          <Plus className="size-3.5" />
          {act.label}
        </Button>
      ) : null}
    </div>
  )
}
