// A GROUP OF PEOPLE, AS FACES — the one row of round marks with a "+N" tail.
//
// EXTRACTED FROM `shapeMeetingsList` (web/components/deep-link/shape.tsx), 23
// Sep 2026, when Aurora's ruling — *"meetings week view, show the avatars on
// whos in the meeting after title"* — asked for the SAME row in a second
// place. Copying those eleven lines into `record-week.tsx` would have been a
// second answer to a settled drawing, which is the exact drift
// `shared/web/person-card.tsx`'s own header (this file's sibling) was written
// to stop. So the shape moves here and both callers render it: the meetings
// table's Attendees column and the week view's own card.
//
// WHAT IT DRAWS, unchanged from the cell it came out of:
//   · `RecordMark shape="round" size="choice"` per person — R35 (a record
//     carries its own face), `round` because a person in their own right is a
//     circle (`record-mark.tsx`'s own header), `choice` because that is the
//     kit's smallest face and the one Aurora's 18 Sep 2026 ruling names for a
//     row: "when avatar/icon on list view, make the avatar smaller. should not
//     be the cause of more height to the overall row."
//   · at most `max` of them (three, the number the Attendees column already
//     showed), then the remainder as a quiet "+N".
//
// NOT AN `AvatarStack`. The kit ships one (`shared/ui/components/avatar/
// avatar.tsx`) and it OVERLAPS its marks behind a ground-tone ring — a
// different drawing, which nothing in this app has ever used. This is the row
// the app already had; adopting the kit's stack would change how every
// existing Attendees cell looks, which is not what was asked for. Logged as
// the open question it is rather than answered here.
//
// NO STRING OF ITS OWN. "+3" is a number with a sign, not a sentence, exactly
// as it was in the cell this came from — nothing here asks the catalogue for
// a translation because nothing here says a word (R28/R33).
import * as React from "react"

import { RecordMark } from "./record-mark"

export type PersonFace = {
  /** the row's own key — an email, an id, whatever the caller has that is
   *  unique among the people it is drawing */
  key: string
  /** the visible name behind the face: the initials fall out of it, and it is
   *  what the mark announces to a screen reader */
  name: string
  /** their photograph, where the caller's own read carries one */
  picture?: string | null
  /** ARE THEY FROM OUTSIDE — a client contact rather than one of ours?
   * Aurora, 23 Sep 2026: *"external photos (from contacts) gray scale. keep
   * staff nirmal."* PER PERSON, never per row, because this row is exactly
   * where the two populations meet: a meeting's attendees are our people AND
   * the client's, side by side in one cell, which is the case the greyscale
   * is FOR. A row-level flag would have forced the caller to choose one
   * answer for a mixed list, and it would have chosen wrong on every meeting
   * anybody actually holds. Undefined reads as one of ours — see
   * `RecordMark`'s own `external` for why the safe default is colour. */
  external?: boolean
}

/** THE ROW. `people` is already filtered by the caller — a meeting ROOM is not
 * a stakeholder (`meeting-detail.tsx`'s own split, "a room shown as a
 * stakeholder is a stakeholder nobody can ring"), and which of a caller's rows
 * are people is the caller's question, not this component's. Zero people draws
 * NOTHING — `null`, never an empty box — so a caller can render it
 * unconditionally and still get the honest absence its own fallback decides
 * how to say. */
export function PeopleFaces({
  people,
  max = 3,
  className,
}: {
  people: PersonFace[]
  /** how many faces before the "+N" tail. Three is what the meetings table
   *  has always shown, and is the default so a second caller cannot quietly
   *  pick a different number. */
  max?: number
  className?: string
}) {
  if (people.length === 0) return null
  const shown = people.slice(0, max)
  const hidden = people.length - shown.length
  return (
    // TWO NAMED SLOTS, and they are what the checks read. `RecordMark` carries
    // no `data-slot` of its own (shared/web/record-mark.tsx renders a bare
    // `aria-hidden` span), so "how many faces are on this card" has nowhere to
    // be asked from unless this row says where they are — and asking by CLASS
    // would be a test of Tailwind rather than of the drawing.
    <span
      data-slot="people-faces"
      className={className ? `flex items-center gap-1.5 ${className}` : "flex items-center gap-1.5"}
    >
      <span data-slot="people-faces-row" className="flex items-center gap-1">
        {shown.map((p) => (
          <RecordMark
            key={p.key}
            picture={p.picture ?? null}
            name={p.name}
            shape="round"
            size="choice"
            external={p.external}
          />
        ))}
      </span>
      {hidden > 0 ? <span className="text-muted-foreground text-xs">+{hidden}</span> : null}
    </span>
  )
}
