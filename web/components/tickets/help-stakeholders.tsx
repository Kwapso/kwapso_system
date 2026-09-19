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
// THE LOOP ROW STAYS READ-ONLY, ON PURPOSE. It would be easy to read "a row of
// chips" as "a row of REMOVABLE chips" — the shape a tag input usually takes —
// but that shape does not exist here: `help_stakeholders` has no delete route,
// admins/mentions/the raiser are DERIVED and were never a row to delete, and
// "nothing on a ticket is ever removed" is this module's own locked law (see
// this file's header, above). So the loop chips carry no "×"; the row is the
// same add-only fact it always was, drawn horizontally instead of as tiles.
//
// RAISED BY IS NOW EDITABLE, THROUGH THE FIELD THAT ALREADY SUPPORTS IT.
// `origin: "raiser"` on a `HelpStakeholder` is `help.creator_id` — WHO LITERALLY
// SUBMITTED THE TICKET — read straight off `workers/content/src/lib/
// stakeholders.ts`: "raiser + current team admins + everyone @mentioned … are
// DERIVED at read time (always recomputed, never stored)." There is no PATCH
// route for `creator_id` anywhere in `lib/help.ts`, and there should not be —
// it is an audit fact (who created this ROW), not a business attribute, and
// making it editable would mean either lying about who wrote a ticket or
// unpicking the locked HYBRID model above. What the door DOES already let a
// staff caller correct is `raised_by_contact_id` — checklist 5.9, "who asked",
// the account CONTACT a ticket was raised on behalf of (`help-form-dialog.tsx`'s
// own `contactField`, already labelled "Raised by" there, already PATCHed
// through `content.updateHelp`). So THIS is the field the edit pen opens: the
// caller hands this component the ticket's own `raisedByContactId` +
// `raisedByContactName` (plumbed from `help-detail.tsx` in one line, see its
// own comment at the `<HelpStakeholders>` call site) and a save callback that
// reuses the SAME `editTicket`/`content.updateHelp` door the edit form already
// calls — no new door, no schema change. Where no contact has been named yet,
// the tile falls back to showing the derived raiser (`origin: "raiser"`) as
// today, so a ticket nobody has corrected still shows who submitted it.
//
// TEAM MEMBERS ARE NOT IN THIS PICKER'S POOL, and that is a conflict flagged
// rather than papered over. `raised_by_contact_id` is a FOREIGN KEY onto this
// team's `accounts` table (`account_type IN ('entity','individual')` —
// DATA-MODEL.md § accounts), and the read that names it
// (`SELECT a.name FROM accounts a WHERE a.id = help.raised_by_contact_id`)
// assumes exactly that. A team member is a GLOBAL `users`/`team_members` row,
// nothing to do with a team's own `accounts` table. Offering a colleague in
// this Select would either silently fail to save (the door's own
// `contactForTicket` refuses any id that is not a live account row linked to
// the ticket's client) or require a real schema decision — a second nullable
// column, or a polymorphic id — which is not a UI change and was not made
// here. Widening the pool to include staff is a follow-up decision for
// Aurora, with a side-by-side, not a unilateral migration from this lane.
import * as React from "react"

import { Card, CardContent, CardTitle } from "@shared/ui/components/card/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type SelectFace,
} from "@shared/ui/components/select/select"
import type { HelpStakeholder } from "@shared/types"
import { nameInitials } from "@/lib/identity"
import { PersonCard } from "@shared/web/person-card"
import { EditPenButton } from "@shared/web/edit-pen-button"
import { useLanguage } from "@shared/web/language"
import { staffNameFromSnapshot } from "@shared/staff-name"
import { tenancy } from "@/lib/api"
import { useCached } from "@shared/web/store"
import { sortedOptions } from "@shared/web/sorted-options"

export function HelpStakeholders({
  stakeholders,
  /** The ticket's own client, when it has one — needed to read that client's
   * contacts for the "Raised by" edit Select. `undefined`/`null` means the
   * edit pen has nothing to open (no account, no contacts to pick from), the
   * same gate `help-form-dialog.tsx`'s own contact row already stands down on. */
  accountId,
  /** `help.raised_by_contact_id` / its name off the ticket row — see this
   * file's header for why this, and not `origin: "raiser"`, is the editable
   * half. */
  raisedByContactId,
  raisedByContactName,
  /** Gates the edit pen and the card's own click — `help:update`, the same
   * right that gates the ticket's own edit sheet (`canEdit` at the one call
   * site, `help-detail.tsx`). Undefined/false: the tile is a fact, as before. */
  canEditRaisedBy = false,
  /** Saves through the EXISTING door — `help-detail.tsx` wires this to the
   * same `editTicket`/`content.updateHelp` call its own edit form already
   * makes, passing the ticket's current `description` alongside the new
   * `raisedByContactId` (the door requires it). No new route. */
  onChangeRaisedBy,
}: {
  stakeholders: HelpStakeholder[]
  accountId?: string | null
  raisedByContactId?: string | null
  raisedByContactName?: string | null
  canEditRaisedBy?: boolean
  onChangeRaisedBy?: (contactId: string) => Promise<void>
}) {
  const { t, lang } = useLanguage()
  const [editingRaiser, setEditingRaiser] = React.useState(false)
  const [savingRaiser, setSavingRaiser] = React.useState(false)

  // R54. `origin: "raiser"` is the one value here that can be a client
  // contact — every other way onto this list (an admin, a mention, a
  // colleague added by hand) is one of ours.
  const raiser = stakeholders.find((s) => s.origin === "raiser")
  const loop = stakeholders.filter((s) => s.origin !== "raiser")

  // THE CONTACT LIST FOR THE EDIT SELECT — the same bounded, hard-capped read
  // `help-form-dialog.tsx`'s own `contactField` makes, only fired once editing
  // is actually reachable (a real account, and the caller's own gate on).
  const detailQ = useCached(
    canEditRaisedBy && accountId ? `account-detail:${accountId}` : null,
    () => tenancy.accountDetail(accountId as string)
  )
  const contactChoices = (detailQ.data?.links ?? []).filter((l) => l.active)

  async function saveRaisedBy(contactId: string) {
    if (!onChangeRaisedBy) return
    setSavingRaiser(true)
    try {
      await onChangeRaisedBy(contactId)
    } finally {
      setSavingRaiser(false)
      setEditingRaiser(false)
    }
  }

  // THE RAISED-BY TILE'S FACE + NAME. The named contact wins when the ticket
  // has one; the derived raiser (whoever submitted it) is the fallback, same
  // as today when nobody has corrected the field.
  const raiserName =
    raisedByContactName ||
    (raiser ? (raiser.origin === "raiser" ? raiser.name : staffNameFromSnapshot(raiser.name)) || raiser.email : null)
  const raiserPicture = raisedByContactName ? null : raiser?.imageUrl

  const canOpenEditor = canEditRaisedBy && !!accountId && !!onChangeRaisedBy

  // THE TRIGGER'S OWN FACE (kit v1.2.127's `face` slot). Aurora, verbatim:
  // "every time there is an avatar, I want to also see it in the choice
  // component, so I also want to see the avatars here." Radix cannot clone
  // an option's own mark into the trigger, so the caller hands it the
  // SELECTED contact's face directly — looked up in the same
  // `contactChoices` the options below are drawn from, falling back to the
  // tile's own already-derived `raiserPicture`/`raiserName` for the one case
  // that list cannot answer: the ticket's `raisedByContactId` naming a
  // contact this bounded read did not happen to include.
  const selectedRaiserContact = contactChoices.find((l) => l.personAccountId === raisedByContactId)
  const raisedByTriggerFace: SelectFace | undefined = raisedByContactId
    ? {
        src: (selectedRaiserContact?.personLogoUrl ?? raiserPicture) ?? undefined,
        name: selectedRaiserContact?.personName ?? raiserName ?? undefined,
      }
    : undefined

  if (stakeholders.length === 0 && !raisedByContactId) {
    return <p className="text-muted-foreground text-sm">{t("Just the person who raised it and your admins so far.")}</p>
  }

  return (
    <div className="flex flex-col gap-[var(--space-3)]">
      {/* RAISED BY — ONE TILE (client, 18 Sep 2026: "keep Raised by as one
          tile"). `PersonCard`'s vertical/band shape is unchanged from the
          17 Sep ruling; only the LOOP below moved. */}
      {(raiser || raisedByContactId) && (
        <Card data-slot="stakeholder-card" variant="raised">
          <CardContent
            className={
              canOpenEditor && !editingRaiser
                ? "relative flex flex-col items-center gap-2 p-4 text-center cursor-pointer"
                : "relative flex flex-col items-center gap-2 p-4 text-center"
            }
            // A PLAIN CLICK HANDLER, NOT `role="button"` — the card already
            // nests a real interactive control (the edit pen, and the Select
            // once open); a `role="button"` wrapper AROUND another control is
            // the nested-interactive-element trap. The pen is the keyboard-
            // reachable door; this is a mouse convenience on top of it.
            onClick={canOpenEditor && !editingRaiser ? () => setEditingRaiser(true) : undefined}
          >
            {canOpenEditor && !editingRaiser ? (
              // `EditPenButton`'s own `onClick` is `() => void` (no event) —
              // it sits inside the card's own `onClick` (below) so a press
              // fires both, which is harmless: both only ever set the same
              // `editingRaiser` state to `true`.
              <EditPenButton
                label={t("Edit")}
                onClick={() => setEditingRaiser(true)}
                disabled={savingRaiser}
                className="absolute top-2 right-2"
              />
            ) : null}
            {editingRaiser ? (
              <Select
                defaultOpen
                value={raisedByContactId ?? undefined}
                onValueChange={(v) => void saveRaisedBy(v)}
                onOpenChange={(open) => {
                  if (!open) setEditingRaiser(false)
                }}
                disabled={savingRaiser}
              >
                <SelectTrigger aria-label={t("Raised by")} className="w-full" face={raisedByTriggerFace}>
                  <SelectValue placeholder={t("Choose who raised it")} />
                </SelectTrigger>
                <SelectContent>
                  {sortedOptions(contactChoices, lang, (l) => l.personName).map((l) => (
                    <SelectItem
                      key={l.personAccountId}
                      value={l.personAccountId}
                      face={{ src: l.personLogoUrl ?? undefined, name: l.personName }}
                    >
                      {l.personName}
                      {l.isMainStakeholder ? ` — ${t("Main contact")}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <PersonCard
                picture={raiserPicture}
                mark={nameInitials(raiserName ?? "")}
                markName={raiserName ?? undefined}
                chip={
                  <span className="text-micro text-muted-foreground uppercase">{t("Raised by")}</span>
                }
                title={<CardTitle className="text-sm">{raiserName}</CardTitle>}
              />
            )}
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
