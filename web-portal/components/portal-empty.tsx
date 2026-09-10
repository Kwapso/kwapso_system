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
 * list. Same body, same box, same words-then-button rhythm; the button is the
 * only difference, and it is subtracted HERE rather than at each call site, for
 * the reason R50's `empty` prop is required rather than optional.
 *
 * WHY THE PORTAL HAS ITS OWN REGISTER AND DOES NOT IMPORT THE AGENCY'S.
 * The agency door's `CollectionEmptyState` (shared/web/screen-engine/
 * collection-frame.tsx) is LEFT-ALIGNED and un-boxed: it sits inside a
 * collection panel that is already the box. The portal has no collection panel
 * — its sections sit straight on the page ground — so every one of these five
 * states was written as a centred `bg-surface-panel` card, which is also the
 * client's standing rule that nothing sits on a bare background. Importing the
 * agency register here would have swapped a considered portal treatment for a
 * measure that only reads correctly inside a panel. So: the same LAW, the
 * portal's own drawing, one component instead of five copies.
 *
 * NO CSS BORDER. `bg-surface-panel` is a fill, and that is deliberate: every
 * one of these five boxes was `border border-dashed` until 2026-09-01 — a bare
 * `border-*` in Tailwind v4 carries no colour and falls back to `currentColor`,
 * which drew near-white ink in dark mode. Separation here is a fill, never a
 * stroke (BUILD-A-SCREEN.md §6.1).
 *
 * NO ILLUSTRATION, EVER — 27.21's own words: "no empty-box drawing, no mascot,
 * no dashed placeholder rectangle. Type and one button carry it." */

import * as React from "react"

import { Button } from "@shared/ui/components/button/button"
import { Plus } from "@shared/ui/foundations/icons"
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
  return (
    <div
      data-slot="portal-empty"
      className="text-muted-foreground flex flex-col items-center gap-1 rounded-[var(--radius)] bg-surface-panel p-8 text-center"
    >
      <p>{filtered ? (filteredTitle ?? t("Nothing matched that.")) : title}</p>
      {(filtered ? (filteredDescription ?? t("Try fewer words, or clear the search to see everything.")) : description) ? (
        <p className="text-sm">
          {filtered
            ? (filteredDescription ?? t("Try fewer words, or clear the search to see everything."))
            : description}
        </p>
      ) : null}
      {act ? (
        <Button className="mt-3 gap-1" onClick={act.onClick}>
          <Plus className="size-3.5" />
          {act.label}
        </Button>
      ) : null}
    </div>
  )
}
