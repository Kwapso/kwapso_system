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
// full pass fixing, one level up. Everything else about the card is
// unchanged: the same horizontal `PersonCard`, the same `size="row"`, the
// same padding override, the muted "Inherited from <app>" line
// (`shared/effective-assignee.ts`'s `effectiveAssignee`), the pen opening the
// kit `Select` (R90 faces), and the "Nobody yet." words when there is truly
// nobody to show. `HelpStakeholders` below carries none of this any more, no
// props, no state, no render, "a different card from stakeholders" taken
// literally.
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

import { Button } from "@shared/ui/components/button/button"
import { Card, CardContent, CardTitle } from "@shared/ui/components/card/card"
import type { HelpStakeholder } from "@shared/types"
import { nameInitials } from "@/lib/identity"
import { PersonCard } from "@shared/web/person-card"
import { useLanguage } from "@shared/web/language"
import { staffNameFromSnapshot } from "@shared/staff-name"
import { EditPenButton } from "@shared/web/edit-pen-button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type SelectFace,
} from "@shared/ui/components/select/select"
import { sortedOptions } from "@shared/web/sorted-options"
import { effectiveAssignee } from "@shared/effective-assignee"

/** One team member this ticket may be assigned to, the same shape
 * `assignableMembers` (`web/lib/members.ts`) already hands every other
 * assignee picker in the app: agency staff only, never a client login. */
type AssignableMember = { id: string; name: string; photo?: string | null }

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

  return (
    <div className="flex flex-col gap-[var(--space-3)]">
      {stakeholders.length === 0 && !raisedByContactId ? (
        <p className="text-muted-foreground text-sm">{t("Just the person who raised it and your admins so far.")}</p>
      ) : (
        <>
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
              {/* STILL 102px ON STAGING, NOT 60px — the kit's own `CardContent`
                  (shared/ui/components/card/card.tsx) carries
                  `py-6 lg:py-[var(--space-7)]`, and this call's `py-3` only wins
                  at the BASE breakpoint: it shares no prefix with `lg:py-…`, so
                  the kit's own `lg` padding keeps winning above that width,
                  which is exactly the 102px the live page measured. Fixed here,
                  not in the kit (kit changes are the kit repo's, never a local
                  workaround) — `lg:py-3` names the same override at the same
                  breakpoint the kit's own class does, so this one card reads
                  ≈60px at every width. */}
              <CardContent className="flex flex-col gap-2 px-4 py-3 lg:py-3">
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
        </>
      )}
    </div>
  )
}

/** ASSIGNED TO, ITS OWN TOP-LEVEL PANEL, A DIFFERENT CARD FROM
 * STAKEHOLDERS. Aurora's ruling, 21 Sep 2026, verbatim, correcting her own
 * same-day one that had put this row inside `HelpStakeholders` above: "nono
 * assigned to on the very top, a different card from stakeholders!" Rendered
 * as the FIRST panel in the ticket page's own right column, above
 * Stories/Time/Stakeholders and everything else
 * (`ticket-detail-body.tsx`'s own `assignedTo` slot, `help-detail.tsx`'s
 * call site), never nested inside `<HelpStakeholders>` or a
 * `<TicketSidePanel>` wrapper, so `variant="default"` here, not `"raised"`:
 * this card stands DIRECTLY on the page ground now, the same R67 rule every
 * other top-level panel on this screen already answers
 * (`ticket-detail-body.tsx`'s own header).
 *
 * Otherwise unchanged from the row this replaces: the same horizontal
 * `PersonCard`, the same `size="row"`, the same padding override, the muted
 * "Inherited from <app>" line when the ticket carries no assignee of its own
 * and the app's lead is answering instead (`shared/effective-assignee.ts`'s
 * `effectiveAssignee`), the pen that opens the kit `Select` (R90 faces), and
 * the "Nobody yet." words when there is truly nobody to show. The Select
 * offers people only, no "Nobody" row, Aurora's 16 Sep 2026 ruling, and
 * clearing the ticket's own assignee back to inherited is the card's own
 * "Use the app's lead" text button, not a picker entry (see this file's own
 * header). */
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
  /** Agency staff only (`web/lib/members.ts`'s `assignableMembers`), for the
   * Select's own options AND for resolving the app-inherited candidate's
   * current name/face, a live relationship, never a stored snapshot (see
   * `shared/types.ts`'s `appAssigneeId`). */
  members,
  canEditAssignee,
  onChangeAssignee,
}: {
  assigneeId?: string | null
  assigneeName?: string | null
  appId?: string | null
  appName?: string | null
  appAssigneeId?: string | null
  members?: AssignableMember[]
  canEditAssignee?: boolean
  /** `null` CLEARS the ticket's own assignee back to inherited, called
   * from the card's own "Use the app's lead" text button, never from a
   * picker entry (Aurora's 16 Sep 2026 ruling: a staff picker never offers
   * Nobody). The door's own `assigneeCleared`
   * (`workers/content/src/lib/help.ts`) reads the wire value the same way,
   * so this never collapses "clear it" into "leave it alone" the way an
   * `undefined`-only signature would. */
  onChangeAssignee?: (assigneeId: string | null) => Promise<void>
}) {
  const { t, lang } = useLanguage()
  const [pickingAssignee, setPickingAssignee] = React.useState(false)

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
  // THE TRIGGER'S OWN FACE (R90, kit v1.2.127), off the ticket's OWN
  // assignee, never the inherited candidate: the Select only ever changes
  // the ticket's own field, so its chosen value is exactly that field, blank
  // (the placeholder) until somebody actually picks somebody, even while the
  // card above is showing an inherited name.
  const ownAssigneeMember = assigneeId ? (members ?? []).find((m) => m.id === assigneeId) : undefined
  const assigneeFace: SelectFace | undefined = assigneeId
    ? { src: ownAssigneeMember?.photo ?? undefined, name: assigneeName ?? "" }
    : undefined

  // THE WAY BACK TO THE APP'S LEAD IS A SEPARATE ACTION, NOT A PICKER ENTRY.
  // Aurora's 16 Sep 2026 ruling, verbatim: "Kill the 'nobody' option for
  // staff. If we leave it empty, it's not an option. Remove it from tasks
  // and everywhere else. This 'nobody', just kill it." A picker's list is
  // people only (`StaffPillPicker`'s own law, R79) and this `Select` is no
  // exception, so a 21 Sep 2026 attempt to reopen the clearing door as a
  // "Nobody, inherit from the app" row was reverted 20 Sep 2026: clearing
  // the ticket's own assignee back to inherited is now a plain text button,
  // offered only when there is somewhere to go back TO (the record carries
  // its own assignee AND the app has a lead to fall back on). When the app
  // has no lead, no clear action is offered at all: once a ticket or story
  // is assigned, it keeps a person, exactly as her ruling requires.
  const clearToInherited =
    assigneeId && appAssigneeId && canEditAssignee && onChangeAssignee ? onChangeAssignee : undefined

  return (
    <Card data-slot="assignee-card" variant="default">
      <CardContent className="flex flex-col gap-2 px-4 py-3 lg:py-3">
        <div className="flex min-w-0 items-start justify-between gap-2">
          {assignee.id ? (
            <PersonCard
              orientation="horizontal"
              size="row"
              picture={assigneeMember?.photo}
              mark={nameInitials(assignee.name ?? "")}
              markName={assignee.name ?? undefined}
              chip={
                <span className="text-micro text-muted-foreground uppercase">{t("Assigned to")}</span>
              }
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
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-micro text-muted-foreground uppercase">{t("Assigned to")}</span>
              <p className="text-muted-foreground text-sm">{t("Nobody yet.")}</p>
            </div>
          )}
          {/* THE PEN, WHERE RAISED BY'S OWN USED TO SIT, before it was
              retired (`HelpStakeholders`'s own header, "THE EDIT PEN IS GONE
              FROM THIS CARD"), that pen opened an inline `Select` right on
              that card. This row gets a picker of its own kind, so it gets
              the identical door: press the pen, the kit `Select` (R90 faces)
              opens in its place. */}
          {canEditAssignee && onChangeAssignee && members && members.length > 0 ? (
            <EditPenButton
              onClick={() => setPickingAssignee((v) => !v)}
              label={t("Change who is assigned")}
            />
          ) : null}
        </div>
        {/* THE CLEAR ACTION, A TEXT BUTTON BESIDE THE PERSON ROW, NEVER A
            PICKER ENTRY (see the header note by `clearToInherited` above).
            Writes `assigneeId: null` through the same door the Select
            already calls; the doors already treat `null` as an explicit
            clear, so the card falls straight back to `effectiveAssignee`'s
            own inherited answer once the parent re-renders with the ticket's
            own assignee gone. */}
        {clearToInherited ? (
          <Button
            variant="link"
            className="self-start text-sm"
            onClick={() => void clearToInherited(null)}
          >
            {t("Use the app's lead")}
          </Button>
        ) : null}
        {pickingAssignee && canEditAssignee && onChangeAssignee ? (
          <Select
            value={assigneeId ?? ""}
            onValueChange={(v) => {
              setPickingAssignee(false)
              void onChangeAssignee(v)
            }}
          >
            <SelectTrigger id="help-assignee" aria-label={t("Assigned to")} face={assigneeFace}>
              <SelectValue placeholder={t("Choose someone")} />
            </SelectTrigger>
            <SelectContent>
              {/* PEOPLE ONLY (16 Sep 2026 ruling), A to Z (R75), the same
                  `sortedOptions` seam every other picker on this app reads
                  its options through, and every row carries its own face
                  (R90). No "Nobody" row: this Select only ever ADDS a name;
                  the way back to the app's lead is the text button above. */}
              {sortedOptions(members ?? [], lang, (m) => m.name).map((m) => (
                <SelectItem key={m.id} value={m.id} face={{ src: m.photo ?? undefined, name: m.name }}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </CardContent>
    </Card>
  )
}
