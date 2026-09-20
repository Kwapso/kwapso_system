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
// ASSIGNED TO, NEW, FIRST, 21 SEP 2026. Aurora's ruling, verbatim: "both on
// story detail and ticket detail we need to see to whom it's assigned,
// normally this gets inherited from the app." Drawn EXACTLY like the Raised
// by tile below it (same horizontal `PersonCard`, same `size="row"`, same
// card/padding), with a muted "Inherited from <app>" line when the ticket
// carries no assignee of its own and the app's lead is answering instead
// (`shared/effective-assignee.ts`'s `effectiveAssignee`), and a pen where
// Raised by's own used to sit before it was retired (above), pressing it
// opens the kit `Select` (R90 faces) in its place, for whoever holds the
// ticket edit right. UNLIKE Raised by, this row is NOT folded into the
// component's own "just the raiser and your admins" early return: an
// assignee can exist with no stakeholders and no raiser correction at all,
// so the card renders unconditionally, with its own "Nobody yet." words
// when there truly is nobody to show.
import * as React from "react"

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
  /** THE TICKET'S OWN ASSIGNEE, and the app's answer to fall back to when it
   * has none. Aurora's ruling, verbatim, 21 Sep 2026: "both on story detail
   * and ticket detail we need to see to whom it's assigned, normally this
   * gets inherited from the app." Resolved through the one shared seam both
   * the ticket page and (later) the story page read,
   * `shared/effective-assignee.ts`'s `effectiveAssignee`. */
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
  assigneeId?: string | null
  assigneeName?: string | null
  appId?: string | null
  appName?: string | null
  appAssigneeId?: string | null
  members?: AssignableMember[]
  canEditAssignee?: boolean
  onChangeAssignee?: (assigneeId: string) => Promise<void>
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
      {/* ASSIGNED TO, FIRST, above Raised by (Aurora's ruling, 21 Sep 2026:
          "both on story detail and ticket detail we need to see to whom
          it's assigned"), and drawn EXACTLY like the Raised by tile below:
          the same horizontal `PersonCard`, the same `size="row"`, the same
          card and padding (see that tile's own comment for the 60px-at-
          every-width fix this one shares). Always rendered, never folded
          into the early-return below, a ticket can carry an assignee (its
          own, or the app's) with no stakeholders and no raiser correction
          at all. */}
      <Card data-slot="assignee-card" variant="raised">
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
                retired (this file's header, "THE EDIT PEN IS GONE FROM THIS
                CARD"), that pen opened an inline `Select` right on this
                card. This row gets a picker of its own kind, so it gets the
                identical door: press the pen, the kit `Select` (R90 faces)
                opens in its place. */}
            {canEditAssignee && onChangeAssignee && members && members.length > 0 ? (
              <EditPenButton
                onClick={() => setPickingAssignee((v) => !v)}
                label={t("Change who is assigned")}
              />
            ) : null}
          </div>
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
                {/* A to Z (R75), the same `sortedOptions` seam every other
                    picker on this app reads its options through. */}
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
