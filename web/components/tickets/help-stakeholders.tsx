"use client"

// Stakeholders on a ticket — the people kept in the loop: the raiser, your team's
// admins, anyone @mentioned, plus people manually added. ADD-ONLY BY DESIGN for
// the LOOP half — you can pull a teammate in, but no one is ever removed (and
// there's no assignee). See `workers/content/src/lib/stakeholders.ts`'s own
// header: "A HYBRID model (locked): the raiser + current team admins + everyone
// @mentioned … are DERIVED at read time … No remove path exists anywhere —
// 'nothing on a ticket is ever removed' is enforced by physics." That law is
// UNCHANGED by this file's own 18 Sep 2026 rewrite below: nothing here ever
// removes a loop member, and nothing here can, because the door still has no
// route for it.
//
// FACES + NAMES ONLY, ON THE PAGE ITSELF — client ruling, 17 Sep 2026, verbatim,
// reading the deployed V1 page back: "Remove all of this from stakeholders 'Pick
// someone to keep in the loop … [the picker's own pills] … You can add members,
// but no one is ever removed.'" The picker (`StaffPillPicker`, the "Pick someone
// to keep in the loop" caption and the trailing "You can add members…" sentence)
// moved into the ticket EDIT sheet as a field (`help-form-dialog.tsx`'s own
// "Who to keep in the loop" section) — it still calls the same `onAdd`, add-only,
// exactly as it did here; only the door to it moved, off the page body and into
// the sheet a person already opens to change the ticket.
//
// CARDS, LIKE SETTINGS MEMBERS — client ruling, 18 Sep 2026, verbatim: "on
// ticket detail stakeholders, show them like cards (like settings members)
// and show what was before, who raised it and on the loop." `PersonCard`
// (extracted to shared/web the same day) draws the face; every card says WHY
// the person is on the list.
//
// RAISED BY, A DROPDOWN; ON THE LOOP, HORIZONTAL — client ruling, 18 Sep 2026,
// verbatim: "On ticket raised by, there should be a dropdown, and who to keep
// in the loop should be horizontal." This SUPERSEDES the same-day "SQUARE
// TILES, THREE TO A ROW" ruling this file used to carry (`grid-cols-3`,
// `PersonCard` vertical/band, one tile per stakeholder including the loop) —
// that shape is now the RAISED BY tile alone, which she named explicitly:
// "keep Raised by as one tile." The loop is no longer a grid of tiles; it is
// one card holding a single horizontal, wrapping row of face+name chips
// (`PersonCard` `orientation="horizontal"`, `size="choice"` — the compact
// avatar step, because a wrapping row of many people cannot each be a
// `band`-sized square without becoming the wall the client's OWN "3 should
// fit in one row" ruling was reacting against in the first place).
//
// RAISED BY IS HORIZONTAL TOO NOW — client ruling, 19 Sep 2026, verbatim: "for
// stakeholder, raised by, use a horizontal card (avatar on the left, raised
// by + name on the right one on top of the other)." This SUPERSEDES the
// 18 Sep "keep Raised by as one tile" VERTICAL/band shape above — the tile
// stays ONE card (still the one editable door onto `raised_by_contact_id`),
// only its own orientation changes: `PersonCard orientation="horizontal"`,
// avatar left, a column beside it carrying the "Raised by" chip over the
// name — `PersonCard`'s own horizontal branch (`shared/web/person-card.tsx`)
// already stacks `chip` then `title` in that column (the SAME two props this
// tile already passed for the vertical shape), so no new prop was needed
// here or on `PersonCard` itself; only the orientation and the wrapping
// `CardContent`'s own centering classes (built for the vertical/centered
// shape) changed, to a left-aligned column that lets the horizontal card
// fill the panel's own width.
//
// THE LOOP ROW STAYS READ-ONLY, ON PURPOSE. It would be easy to read "a row of
// chips" as "a row of REMOVABLE chips" — the shape a tag input usually takes —
// but that shape does not exist here: `help_stakeholders` has no delete route,
// admins/mentions/the raiser are DERIVED and were never a row to delete, and
// "nothing on a ticket is ever removed" is this module's own locked law (see
// this file's header, above). So the loop chips carry no "×"; the row is the
// same add-only fact it always was, drawn horizontally instead of as tiles.
//
// THE EDIT PEN IS GONE FROM THIS CARD — Aurora's ruling, 20 Sep 2026, verbatim:
// "On ticket detail, remove the pencil from the Stakeholders section (should
// be only on the edit screen)." RETIRES the paragraph this one replaces (which
// described the pen opening an inline `Select` right here, over a
// `tenancy.accountDetail` read this file made itself): that inline editor is
// deleted, not merely hidden, and this card goes back to being a plain fact —
// no `onClick`, no `EditPenButton`, no local editing state, no account-detail
// fetch of its own. `origin: "raiser"` is still `help.creator_id` — who
// literally submitted the ticket — and is still never itself editable, for
// the reason the retired paragraph gave (an audit fact, not a business
// attribute, with no PATCH route). What WAS editable, `raised_by_contact_id`,
// still is — the field just has exactly one door onto it now, the one that
// was always the real one underneath: `help-form-dialog.tsx`'s own
// `contactField` (labelled "Raised by" there too), reached by opening the
// ticket's EDIT screen. This card only ever reused that same door through a
// second, redundant surface; removing the second surface removes no
// capability, only the duplicate path to it (and the extra `accountId`-gated
// read that came with it).
//
// `raisedByContactId`/`raisedByContactName` STILL ARRIVE HERE, unchanged —
// this card still needs to know who to show, only not how to change it.
// `accountId`, `canEditRaisedBy` and `onChangeRaisedBy` stay in this
// component's own prop type, accepted and unused, because the call site in
// `help-detail.tsx` still passes them (that file's own `<HelpStakeholders>`
// call is outside this change's edit — a lane brief scoped to this file, this
// one and person-card.tsx/members-gallery.tsx) and dropping them from the
// type would be a breaking change this file cannot make alone. Removing the
// three properties from the caller, and from this signature together, is a
// one-line follow-up for whoever next opens help-detail.tsx's stakeholders
// panel wiring.
import * as React from "react"

import { Card, CardContent, CardTitle } from "@shared/ui/components/card/card"
import type { HelpStakeholder } from "@shared/types"
import { nameInitials } from "@/lib/identity"
import { PersonCard } from "@shared/web/person-card"
import { useLanguage } from "@shared/web/language"
import { staffNameFromSnapshot } from "@shared/staff-name"

export function HelpStakeholders({
  stakeholders,
  /** `help.raised_by_contact_id` / its name off the ticket row — see this
   * file's header for why this, and not `origin: "raiser"`, is the one that
   * can be corrected (through `help-form-dialog.tsx` now, not here). */
  raisedByContactId,
  raisedByContactName,
}: {
  stakeholders: HelpStakeholder[]
  /** ACCEPTED, UNUSED — see this file's header ("THE EDIT PEN IS GONE"). The
   * call site still passes it; this card no longer reads a client's contacts
   * itself. */
  accountId?: string | null
  raisedByContactId?: string | null
  raisedByContactName?: string | null
  /** ACCEPTED, UNUSED — same note. Editing moved to `help-form-dialog.tsx`. */
  canEditRaisedBy?: boolean
  /** ACCEPTED, UNUSED — same note. */
  onChangeRaisedBy?: (contactId: string) => Promise<void>
}) {
  const { t } = useLanguage()

  // R54. `origin: "raiser"` is the one value here that can be a client
  // contact — every other way onto this list (an admin, a mention, a
  // colleague added by hand) is one of ours.
  const raiser = stakeholders.find((s) => s.origin === "raiser")
  const loop = stakeholders.filter((s) => s.origin !== "raiser")

  // THE RAISED-BY TILE'S FACE + NAME. The named contact wins when the ticket
  // has one; the derived raiser (whoever submitted it) is the fallback, same
  // as today when nobody has corrected the field.
  const raiserName =
    raisedByContactName ||
    (raiser ? (raiser.origin === "raiser" ? raiser.name : staffNameFromSnapshot(raiser.name)) || raiser.email : null)
  const raiserPicture = raisedByContactName ? null : raiser?.imageUrl

  if (stakeholders.length === 0 && !raisedByContactId) {
    return <p className="text-muted-foreground text-sm">{t("Just the person who raised it and your admins so far.")}</p>
  }

  return (
    <div className="flex flex-col gap-[var(--space-3)]">
      {/* RAISED BY — ONE TILE, A PLAIN FACT NOW (Aurora, 20 Sep 2026: no pen
          here any more — see this file's header). No `onClick`, no
          `cursor-pointer`: editing `raised_by_contact_id` is reached from the
          ticket's own edit screen (`help-form-dialog.tsx`'s "Raised by"
          field) instead.

          SMALLER, TOO — Aurora, 20 Sep 2026: "Make 'Raised by' smaller — less
          height." `size="row"` (36px, one `RecordMark` step down from this
          `PersonCard`'s own "band" default of 56/72px) and a tighter, still
          token-based vertical inset (`py-3` = 0.75rem/12px a side, down from
          `p-4`'s 1rem/16px) — both spacing steps, not hand-picked pixels.
          BEFORE (band + p-4): 2 × 16px padding + a 72px face ≈ 104px.
          AFTER (row + py-3): 2 × 12px padding + a 36px face = 60px. */}
      {(raiser || raisedByContactId) && (
        <Card data-slot="stakeholder-card" variant="raised">
          <CardContent className="flex flex-col gap-2 px-4 py-3">
            <PersonCard
              orientation="horizontal"
              size="row"
              picture={raiserPicture}
              mark={nameInitials(raiserName ?? "")}
              markName={raiserName ?? undefined}
              chip={
                <span className="text-micro text-muted-foreground uppercase">{t("Raised by")}</span>
              }
              title={<CardTitle className="text-sm">{raiserName}</CardTitle>}
            />
          </CardContent>
        </Card>
      )}
      {/* ON THE LOOP — ONE HORIZONTAL, WRAPPING ROW OF FACE+NAME CHIPS (client,
          18 Sep 2026: "who to keep in the loop should be horizontal"). No
          "×" — see this file's header on why the loop stays read-only. */}
      {loop.length > 0 && (
        <Card data-slot="loop-card" variant="raised">
          <CardContent className="flex flex-col gap-2 p-4">
            <p className="text-micro text-muted-foreground uppercase">{t("On the loop")}</p>
            <div className="flex flex-wrap gap-3">
              {loop.map((s) => {
                const name = staffNameFromSnapshot(s.name) || s.email
                return (
                  <PersonCard
                    key={s.userId}
                    orientation="horizontal"
                    size="choice"
                    picture={s.imageUrl}
                    mark={nameInitials(s.name)}
                    markName={name}
                    title={<span className="text-sm">{name}</span>}
                  />
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
