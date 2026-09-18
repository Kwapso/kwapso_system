"use client"

// A FACE, A CHIP AND A NAME — the one small "person as a card" shape, so a
// wall of people (Settings › Team's members gallery) and a stack of people
// (a ticket's stakeholders panel) draw the identical cell rather than two
// hand-rolled ones that agree today and drift the first time either is
// touched.
//
// EXTRACTED FROM `members-gallery.tsx`, 18 Sep 2026 — client ruling, over the
// ticket's stakeholders panel: "show them like cards (like settings
// members)." Copying that card's `<CardContent>` block a second time would
// have been the exact drift `record-mark.tsx`'s own header warns about (this
// file's sibling: "seventeen implementations… collapsing to thirteen visibly
// different answers"), so the CELL's LAYOUT — the mark, the chip/title/
// secondary column, vertical or horizontal — is this one component; what
// still differs between the two walls (the outer `Card`'s own tone, whether
// the cell is a link, the grid it sits in) stays the caller's.
//
// `title` IS THE CALLER'S OWN `<CardTitle>`, NOT BUILT HERE — the one
// deliberate seam this file does NOT own. R65 ("chip above title") reads the
// kit's `<CardTitle>` TEXTUALLY, inside the `<Card key=…>` block of the file
// that DRAWS the card (`web/test/rules.test.ts`'s own census: "a title
// hand-rolled into a `<span>` has no position a census can read" — the exact
// evasion a `<CardTitle>` built INSIDE this shared file, and merely rendered
// through it, would be). So every caller writes
// `title={<CardTitle className="text-sm">{name}</CardTitle>}` itself, right
// there in its own `<Card>…</Card>` markup — this component only POSITIONS
// that node (and the `chip` above it), it never constructs it. The one thing
// genuinely shared is the mark's two seams (`RecordMark`, `personInitials`/
// `nameInitials`) and the column geometry, not the title element R65 needs to
// see in place.
//
// `chip` SITS ABOVE `title` (R65, "chip on top of title" — the client's own
// words, twice: the Kanban card 2026-09-07, the members gallery 2026-09-10).
// The vertical shape reads it as an overline; the horizontal shape — a
// narrow side panel has no room for a wide vertical tile — keeps the same
// relative order, chip then title, in a column beside the mark instead.
import * as React from "react"

import { RecordMark } from "./record-mark"

/** `RecordMark` names its own four (soon five) sizes as `keyof typeof BOX`,
 * a local, unexported const — derived here rather than duplicated, so a
 * fifth size named there needs no edit here to stay in sync. */
type RecordMarkSize = NonNullable<React.ComponentProps<typeof RecordMark>["size"]>

export function PersonCard({
  picture,
  mark,
  markName,
  chip,
  title,
  secondary,
  orientation = "vertical",
  size = "band",
}: {
  /** The stored path to their picture, if they have one. */
  picture?: string | null
  /** Their initials — the fallback the mark draws when there is no picture. */
  mark: string
  /** The plain name, for the mark's own `aria-hidden` fallback ONLY — never
   * rendered as text here. The visible name is the caller's `title`. */
  markName?: string
  /** Above `title` — a role chip (the members wall) or a relation label
   * ("Raised by" — the stakeholders panel). */
  chip?: React.ReactNode
  /** The caller's OWN `<CardTitle>{name}</CardTitle>` — see this file's
   * header for why it is not built in here. */
  title: React.ReactNode
  /** Under the title (vertical) or beside it (horizontal) — an email, or
   * nothing. */
  secondary?: React.ReactNode
  /** `vertical` (the members wall's own wide tile) or `horizontal` (a narrow
   * side panel, where a tall centred card would waste the one dimension the
   * panel has plenty of). */
  orientation?: "vertical" | "horizontal"
  size?: RecordMarkSize
}) {
  const face = <RecordMark picture={picture} mark={mark} name={markName} shape="round" size={size} />

  if (orientation === "horizontal") {
    return (
      <div className="flex min-w-0 items-center gap-3">
        {face}
        <span className="flex min-w-0 flex-col items-start gap-1">
          {chip}
          {title}
          {secondary}
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      {face}
      <span className="flex flex-col items-center gap-1">
        {chip}
        {title}
      </span>
      {secondary}
    </div>
  )
}
