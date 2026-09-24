"use client"

// Stakeholders on a ticket — the people kept in the loop: the raiser, your team's
// admins, anyone @mentioned, plus people manually added. ADD-ONLY BY DESIGN for
// the LOOP half, you can pull a teammate in, but no one is ever removed. See
// `workers/content/src/lib/stakeholders.ts`'s own
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
//
// ASSIGNED TO, ADDED 21 SEP 2026, THEN MOVED OUT THE SAME DAY. Aurora's first
// ruling, verbatim: "both on story detail and ticket detail we need to see to
// whom it's assigned, normally this gets inherited from the app." landed the
// row INSIDE this card, above Raised by. Her second ruling, reading that back,
// verbatim: "nono assigned to on the very top, a different card from
// stakeholders!" moved it back OUT: `AssignedToCard` (below, exported
// separately) is now its own top-level `Card`, rendered as the FIRST panel in
// the ticket page's own right column, above Stories/Time/Stakeholders and
// everything else (`web/components/tickets/ticket-detail-body.tsx`'s own
// `assignedTo` slot, `help-detail.tsx`'s own call site). `variant="default"`,
// not `variant="raised"` the way it read while nested inside this card: R67's
// own ground rule (`ticket-detail-body.tsx`'s header) is that a panel standing
// DIRECTLY on the page takes the soft-paper tone, and a raised card would
// repeat the exact "raised standing on its own ground" bug that file spent a
// full pass fixing, one level up. Everything else about the card was
// unchanged at the time: the same horizontal `PersonCard`, the same
// `size="row"`, the same padding override, the muted "Inherited from <app>"
// line (`shared/effective-assignee.ts`'s `effectiveAssignee`), the pen
// opening the kit `Select` (R90 faces), and the "Nobody yet." words when
// there is truly nobody to show. `HelpStakeholders` below carries none of
// this any more, no props, no state, no render, "a different card from
// stakeholders" taken literally. THE TILE ITSELF IS SUPERSEDED, 21 SEP 2026:
// see `StakeholderTile`'s own header, above, for the chip shape ("same with
// assigned to (chiplike)") that replaced `size="row"` and the padding
// override with the loop's own `size="choice"` and no card around it.
//
// THE WAY BACK TO THE APP'S LEAD IS A SEPARATE ACTION, NOT A "NOBODY" ROW,
// reverted 20 Sep 2026. A 21 Sep 2026 pass had put a "Nobody, inherit from
// the app" row back into this card's own `Select`, and reintroduced the
// `allowNobody`/`nobodyLabel` prop pair Aurora's 16 Sep 2026 ruling killed on
// `StaffPillPicker` itself: "Kill the 'nobody' option for staff. If we leave
// it empty, it's not an option. Remove it from tasks and everywhere else.
// This 'nobody', just kill it." A staff picker never offers Nobody, this
// card's own assignee `Select` included, so the Select offers people only
// (R75 sorted, R90 faced) and clearing the ticket's own assignee back to
// inherited is a plain text button beside the person row, offered only when
// there is somewhere to fall back TO (the record carries its own assignee
// AND the app has a lead); when the app has no lead, no clear action is
// offered at all, once assigned, a ticket or story keeps a person.
import * as React from "react"

import { CardTitle } from "@shared/ui/components/card/card"
import type { HelpStakeholder } from "@shared/types"
import { nameInitials } from "@/lib/identity"
import { PersonCard } from "@shared/web/person-card"
import { useLanguage } from "@shared/web/language"
import { staffNameFromSnapshot } from "@shared/staff-name"
import { effectiveAssignee } from "@shared/effective-assignee"
import { formatCount } from "@shared/web/format-count"
import { TicketSidePanel } from "@/components/tickets/ticket-detail-body"

/** One team member this ticket may be assigned to, the same shape
 * `assignableMembers` (`web/lib/members.ts`) already hands every other
 * assignee picker in the app: agency staff only, never a client login.
 * EXPORTED since 21 Sep 2026 so `help-form-dialog.tsx`'s own "Assigned to"
 * field (the one remaining door onto `assigneeId`, see this file's header
 * below) can type its own `members` prop off the identical shape, rather
 * than declaring a second one, and on purpose NOT `PickablePerson`
 * (`web/lib/members.ts`): that is the type `web/test/staff-pill-row.test.ts`
 * (R79) holds to the pill row, and Aurora asked for this field to wear the
 * same kit `Select` this card's own assignee picker always wore, not a new
 * pill row. */
export type AssignableMember = { id: string; name: string; photo?: string | null }

/** ONE FACE+NAME CHIP, THE LOOP'S OWN SHAPE — Aurora's ruling, 21 Sep 2026,
 * verbatim, reviewing the ticket detail whose side sections are now plain
 * (transparent) cards: "stakeholders raised by design like in the loop (chip
 * like)" and "same with assigned to (chiplike)." RETIRES the paragraph this
 * one replaces (a `Card variant="raised"` tile, `PersonCard
 * orientation="horizontal" size="row"`, the chip drawn INSIDE the
 * `PersonCard` as its own overline): the loop was the reference this
 * paragraph pointed to, and Raised by / Assigned to drew the same shape the
 * loop drew each person with — `PersonCard orientation="horizontal"
 * size="choice"`, the loop's own face size, no raised tile standing around
 * it. The eyebrow ("Raised by" / "Assigned to" / "From the app") sits where
 * the loop keeps its own "On the loop" label: a plain line ABOVE the chip
 * row, never the `PersonCard`'s own `chip` slot any more — the same relative
 * position, read outside the card instead of stacked inside it. `action` is
 * kept, unused today by either caller (the pen was retired 20/21 Sep 2026),
 * as the one trailing-control seam a future caller can still reach without a
 * second tile.
 *
 * AND, 22 SEP 2026, THE LOOP LOSES ITS OWN CARD TOO — Aurora's ruling,
 * verbatim: "On the loop still has a background. Remove that in tickets."
 * The loop's `data-slot="loop-card"` `Card variant="default"` (below) is now
 * a plain `<div>`: the eyebrow, then the chip row, directly on the page —
 * the exact shape Raised by and Assigned to already draw through this same
 * `StakeholderTile`. The loop was the one holdout still wrapped, kept that
 * way on purpose while it was "the reference" the other two were built to
 * match; now that all three read alike, keeping the wrapper on the loop
 * alone would have been the one section still standing on paper for no
 * reason a reader could see. Its `PAPER_ON_PURPOSE` entry
 * (`shared/rules/registry.ts`) is deleted with it. */
function StakeholderTile({
  dataSlot,
  picture,
  mark,
  markName,
  chip,
  title,
  secondary,
  action,
  external,
}: {
  dataSlot: string
  picture?: string | null
  mark: string
  markName?: string
  /** R108, 22 Sep 2026: `undefined` when the section's own title above
   * already says this word (the ticket's own "Assigned to"), so the row
   * below draws no empty header line for nothing to sit on. */
  chip?: React.ReactNode
  title: React.ReactNode
  secondary?: React.ReactNode
  action?: React.ReactNode
  /** ARE THEY FROM OUTSIDE — handed straight to `PersonCard`'s own
   * `external` (Aurora, 23 Sep 2026: "external photos (from contacts) gray
   * scale. keep staff nirmal."). Only the raiser can ever be a client
   * contact on this panel; the loop is always ours (admins/mentions/added
   * colleagues), so this stays `undefined` there and the default (colour)
   * applies. */
  external?: boolean
}) {
  return (
    <div data-slot={dataSlot} className="flex flex-col gap-2">
      {(chip || action) && (
        <div className="flex min-w-0 items-center justify-between gap-2">
          {chip}
          {action}
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <PersonCard
          orientation="horizontal"
          size="choice"
          picture={picture}
          mark={mark}
          markName={markName}
          title={title}
          secondary={secondary}
          external={external}
        />
      </div>
    </div>
  )
}

export function HelpStakeholders({
  stakeholders,
  /** `help.raised_by_contact_id` / its name off the ticket row — see this
   * file's header for why this, and not `origin: "raiser"`, is the one that
   * can be corrected (through `help-form-dialog.tsx` now, not here). */
  raisedByContactId,
  raisedByContactName,
  raiserIsClient,
}: {
  stakeholders: HelpStakeholder[]
  /** ACCEPTED, UNUSED — see this file's header ("THE EDIT PEN IS GONE"). The
   * call site still passes it; this card no longer reads a client's contacts
   * itself. */
  accountId?: string | null
  raisedByContactId?: string | null
  raisedByContactName?: string | null
  /** `help.raiser_is_client` — whoever actually typed the ticket in was a
   * client LOGIN, not one of ours. Read a line away from
   * `raisedByContactName` on `help-detail.tsx`'s own conversation bubble
   * (`external: Boolean(ticket.raisedByContactName) || ticket.raiserIsClient`)
   * and carried here so the Raised-by chip greys the same photograph the
   * thread already greys, for the same reason (R111 photo, 23 Sep 2026
   * "external photos (from contacts) gray scale"). */
  raiserIsClient?: boolean | null
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

  // R111 (photo beats initials) + "external photos (from contacts) gray
  // scale" (Aurora, 23 Sep 2026): the SAME two-way check
  // `help-detail.tsx`'s own conversation bubble makes a line away from
  // `raiserIsClient`, carried here — a named contact (`raisedByContactName`
  // set) is always external, and so is a client LOGIN who typed the ticket
  // in themselves (`raiserIsClient`). A colleague raising it on the
  // client's behalf greys nothing.
  const raiserExternal = Boolean(raisedByContactName) || Boolean(raiserIsClient)

  return (
    <div className="flex flex-col gap-[var(--space-3)]">
      {stakeholders.length === 0 && !raisedByContactId ? (
        <p className="text-muted-foreground text-sm">{t("Just the person who raised it and your admins so far.")}</p>
      ) : (
        <>
          {/* RAISED BY — A CHIP NOW, LIKE THE LOOP (Aurora, 21 Sep 2026: "stakeholders
              raised by design like in the loop (chip like)"). No pen, no
              `onClick`, no `cursor-pointer`: editing `raised_by_contact_id` is
              reached from the ticket's own edit screen (`help-form-dialog.tsx`'s
              "Raised by" field) instead. SUPERSEDES the 20 Sep 2026 "SMALLER, TOO"
              shape this comment used to describe (`size="row"`, a `py-3`/`lg:py-3`
              override on a `Card variant="raised"`, ≈60px tall) — that raised tile
              is gone; the face is `size="choice"` now, the loop's own step, drawn
              with no card around it at all (`StakeholderTile`'s own header,
              above). */}
          {(raiser || raisedByContactId) && (
            <StakeholderTile
              dataSlot="stakeholder-card"
              picture={raiserPicture}
              mark={nameInitials(raiserName ?? "")}
              markName={raiserName ?? undefined}
              chip={<span className="text-micro text-muted-foreground uppercase">{t("Raised by")}</span>}
              title={<CardTitle className="text-sm">{raiserName}</CardTitle>}
              external={raiserExternal}
            />
          )}
          {/* ON THE LOOP — ONE HORIZONTAL, WRAPPING ROW OF FACE+NAME CHIPS (client,
              18 Sep 2026: "who to keep in the loop should be horizontal"). No
              "×" — see this file's header on why the loop stays read-only. */}
          {loop.length > 0 && (
            /* NO CARD ANY MORE — Aurora, 22 Sep 2026: "On the loop still has
               a background. Remove that in tickets." Plain now: the eyebrow,
               then the chip row, directly on the page — the same shape
               Raised by and Assigned to already draw (`StakeholderTile`,
               above). `data-slot="loop-card"` stays on this wrapper (a
               plain `<div>` now, not a kit `Card`) so nothing reaching for
               that slot has to change what it asks for. */
            <div data-slot="loop-card" className="flex flex-col gap-2">
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
            </div>
          )}
        </>
      )}
    </div>
  )
}

/** ASSIGNED TO, REDESIGNED AS THE STAKEHOLDERS CARD'S TWIN. Aurora's
 * ruling, 21 Sep 2026, verbatim, over a screenshot of the Stakeholders card
 * (its title row, "Stakeholders" with a count beside it, and inside it the
 * horizontal "Raised by" tile: a face on the left, the small-caps eyebrow
 * above the name): "Look at the screenshot with the stakeholders. I wanted
 * the 'Assigned to' to be like this: the count and the horizontal card.
 * Redesign it." Validated the same round: "4. Validated but redesigned as
 * explained." SUPERSEDES the previous paragraph here (which described this
 * card as its own bare `Card variant="default"`, no title row, no count):
 * `AssignedToCard` now opens with `<TicketSidePanel>`
 * (`ticket-detail-body.tsx`), THE SAME title-with-count register
 * "Stakeholders" itself renders through (`help-detail.tsx`'s own
 * `<TicketSidePanel title={t("Stakeholders")} count={stakeholderBadge}>`
 * call), never a hand-rolled title row of this card's own, with the count
 * in the identical `formatCount` register (R16): 1 when the record carries
 * its own assignee OR inherits one from the app, 0 (which `formatCount`
 * renders as nothing, same as everywhere else) otherwise. Inside it, the
 * face+name tile is `StakeholderTile` (above), the SAME component Raised by
 * draws itself with, not a second copy: face on the left, the small-caps
 * eyebrow over the name on the right. THE INNER EYEBROW ONLY SURVIVES WHEN
 * IT SAYS SOMETHING NEW (R108, 22 Sep 2026). It used to read "Assigned to"
 * over the tile whenever the record carried its own person, "From the app"
 * when it did not, but once the panel's own title above IS "Assigned to"
 * in the same eyebrow register R108 gave it, repeating the identical word a
 * second time over the tile is a label agreeing with its own heading; her
 * screenshot showed exactly that duplicate. So the tile's own `chip` was
 * made `undefined` for the ticket's own person, and "From the app" was kept
 * for the inherited case on the reading that it said something the title
 * did not.
 *
 * AURORA OVERRULED THAT READING, 22 SEP 2026, verbatim: "under assigned to
 * remove 'From the app'." She had the chip-vs-title-word question already
 * settled by R108's own reasoning above and decided the inherited case the
 * same way regardless: no chip at all over the assignee tile, ever. The
 * app's own name stays exactly where it already was, the second, muted line
 * ("Inherited from <app>", `PersonCard`'s own `secondary` slot) — that
 * sentence still says something the panel's title does not, only the
 * eyebrow above the tile is gone. So `StakeholderTile`'s own `chip` prop is
 * never passed by this call site any more (it stays on the component for
 * Raised by, which still wears one), and the header row it used to sit in
 * (`{(chip || action) && (…)}` inside `StakeholderTile`) draws nothing for
 * this tile, `action` never having had a caller here either — not a dead
 * prop on the shared component, which Raised by still uses, but a dead row
 * for this one call. This card still stands DIRECTLY on the page
 * ground (R67): `TicketSidePanel`'s own `Card` is `variant="default"`,
 * never nested inside `<HelpStakeholders>` or the Stakeholders panel's own
 * `TicketSidePanel`.
 *
 * THE PEN, THE SELECT AND "USE THE APP'S LEAD" ARE GONE. Aurora's ruling,
 * 21 Sep 2026, verbatim, reading this very card back: "ok, but rmeove the
 * edit button (this can be editedfrom dtory edit screen). rmeove the 'use
 * the apps lead' text." RETIRES the paragraph this one replaces (which had
 * the pen sitting in `StakeholderTile`'s own `action` slot, opening a kit
 * `Select` in place, and a "Use the app's lead" text button clearing the
 * ticket's own assignee back to inherited): this card is a plain fact now,
 * the same turn `HelpStakeholders`'s own Raised-by tile took one file up
 * ("THE EDIT PEN IS GONE FROM THIS CARD", this file's header, 20 Sep 2026),
 * with no `onClick`, no local `pickingAssignee` state, no `Select`, no
 * clear button. Editing `assigneeId` moved to the one door Aurora named,
 * the ticket's own edit screen: `help-form-dialog.tsx`'s own "Assigned to"
 * field, the kit `Select` this card's Select used to be, reached by opening
 * the ticket for edit rather than by a pen on this tile. A story's own
 * assignee is still changed from its own edit screen
 * (`story-form-dialog.tsx`'s "Who's doing it"), which this ruling did not
 * touch. `canEditAssignee`/`onChangeAssignee` are dropped from this
 * component's own signature along with the mechanism they drove; both
 * callers (`help-detail.tsx`, `story-detail.tsx`) stopped passing them the
 * same turn. The empty state, when the ticket has no assignee of its own
 * and the app has no lead to inherit either, is still plain words inside
 * the card, "Nobody yet." The title row above it already says "Assigned
 * to", so the tile's own eyebrow is not repeated a second time when there
 * is no tile to carry it. */
export function AssignedToCard({
  /** THE TICKET'S OWN ASSIGNEE, and the app's answer to fall back to when it
   * has none. Resolved through the one shared seam both the ticket page and
   * (later) the story page read, `shared/effective-assignee.ts`'s
   * `effectiveAssignee`. */
  assigneeId,
  assigneeName,
  appId,
  appName,
  appAssigneeId,
  /** Agency staff only (`web/lib/members.ts`'s `assignableMembers`), for
   * resolving the app-inherited candidate's current name/face, a live
   * relationship, never a stored snapshot (see `shared/types.ts`'s
   * `appAssigneeId`), and the ticket's own assignee's photo. No longer feeds
   * a picker of its own here, see this component's own header, "THE PEN,
   * THE SELECT AND 'USE THE APP'S LEAD' ARE GONE". */
  members,
}: {
  assigneeId?: string | null
  assigneeName?: string | null
  appId?: string | null
  appName?: string | null
  appAssigneeId?: string | null
  members?: AssignableMember[]
}) {
  const { t } = useLanguage()

  // THE APP'S OWN ANSWER, resolved to a NAME/FACE off the team's own members
  // list, a lead is a live relationship (`shared/types.ts`'s own note on
  // `appAssigneeId`), so its current name is read the same way every other
  // staff face on this page already is, never a stored snapshot.
  const appAssigneeMember = appAssigneeId ? (members ?? []).find((m) => m.id === appAssigneeId) : undefined
  const assignee = effectiveAssignee(
    { assigneeId: assigneeId ?? null, assigneeName: assigneeName ?? null },
    appId && appName
      ? {
          id: appId,
          name: appName,
          assigneeId: appAssigneeId ?? null,
          assigneeName: appAssigneeMember?.name ?? null,
        }
      : null
  )
  const assigneeMember = (members ?? []).find((m) => m.id === assignee.id)

  return (
    /* NO `surface` PROP ANY MORE — rulebook L43 went app wide on 21 Sep
       2026 and `TicketSidePanel`'s own default is `"plain"`. The forwarding
       prop this card carried for the tickets-only experiment had exactly one
       caller, which passed the value that is now the default, so it was
       retired rather than left as a second way to say nothing. */
    <TicketSidePanel title={t("Assigned to")} count={formatCount(assignee.id ? 1 : 0)}>
      {assignee.id ? (
        <StakeholderTile
          dataSlot="assignee-tile"
          picture={assigneeMember?.photo}
          mark={nameInitials(assignee.name ?? "")}
          markName={assignee.name ?? undefined}
          // R108, 22 Sep 2026, then Aurora's overrule the same day ("under
          // assigned to remove 'From the app'", this component's own header
          // above): no chip at all over this tile, ever, own person or
          // inherited. The panel's own title above already says "Assigned
          // to"; the inherited fact still reads on the muted "Inherited
          // from <app>" line below (`secondary`, below).
          title={<CardTitle className="text-sm">{assignee.name}</CardTitle>}
          secondary={
            assignee.inherited ? (
              <span className="text-muted-foreground text-xs">
                {t("Inherited from")} {assignee.appName}
              </span>
            ) : undefined
          }
        />
      ) : (
        // EMPTY STATE, IN WORDS, INSIDE THE CARD. The title row above
        // already says "Assigned to" (and carries no count), so the tile's
        // own eyebrow is not repeated a second time when there is no tile.
        <p className="text-muted-foreground text-sm">{t("Nobody yet.")}</p>
      )}
    </TicketSidePanel>
  )
}
