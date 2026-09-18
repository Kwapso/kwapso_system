"use client"

// Stakeholders on a ticket — the people kept in the loop: the raiser, your team's
// admins, anyone @mentioned, plus people manually added. ADD-ONLY by design — you
// can pull a teammate in, but no one is ever removed (and there's no assignee).
//
// FACES + NAMES ONLY, ON THE PAGE ITSELF — client ruling, 17 Sep 2026, verbatim,
// reading the deployed V1 page back: "Remove all of this from stakeholders 'Pick
// someone to keep in the loop … [the picker's own pills] … You can add members,
// but no one is ever removed.'" The picker (`StaffPillPicker`, the "Pick someone
// to keep in the loop" caption and the trailing "You can add members…" sentence)
// moved into the ticket EDIT sheet as a field (`help-form-dialog.tsx`'s own
// "Who to keep in the loop" section) — it still calls the same `onAdd`, add-only,
// exactly as it did here; only the door to it moved, off the page body and into
// the sheet a person already opens to change the ticket. What is left on the
// page is the fact of who is on the loop — a face and a name each — never the
// control that changes it.
//
// CARDS, LIKE SETTINGS MEMBERS — client ruling, 18 Sep 2026, verbatim: "on
// ticket detail stakeholders, show them like cards (like settings members)
// and show what was before, who raised it and on the loop." Two changes off
// one sentence: the row becomes the member-gallery's own card cell
// (`PersonCard`, extracted to shared/web the same day so this panel does not
// hand-copy its JSX — "what was before" is the fact list that ruling took
// away on 17 Sep 2026, not a request to bring it back), and every card now
// says WHY the person is on the list — "Raised by" for the one raiser, "On
// the loop" for everyone else (the admins, the mentions, the people added by
// hand). `origin` already carried that fact; this screen simply stopped
// reading it out loud until now.
//
// THE INTRO SENTENCE IS STILL GONE, not brought back with the relation label:
// her own words for what should survive were "the stakeholder faces + names"
// plus, now, who raised it and who is on the loop — never a paragraph above
// the cards explaining the mechanism.
//
// NO LINK ON THE CARD. The members wall's card is a door to a staff profile
// (`/t/<team>/members/<id>`) because every row on that wall is a team member
// by construction; a stakeholder can be the ticket's RAISER, and R54 already
// treats a raiser as sometimes a client contact with no staff profile to open
// at all. A card that 404s for the one person it is most often drawn for is
// worse than a card that does not open — so this stays a fact, not a link,
// matching the panel's row shape before this ruling.

import * as React from "react"

import { Card, CardContent, CardTitle } from "@shared/ui/components/card/card"
import type { HelpStakeholder } from "@shared/types"
import { nameInitials } from "@/lib/identity"
import { PersonCard } from "@shared/web/person-card"
import { useLanguage } from "@shared/web/language"
import { staffNameFromSnapshot } from "@shared/staff-name"

export function HelpStakeholders({ stakeholders }: { stakeholders: HelpStakeholder[] }) {
  const { t } = useLanguage()

  if (stakeholders.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("Just the person who raised it and your admins so far.")}</p>
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {stakeholders.map((s) => {
        // R54. `origin: "raiser"` is the one value here that can be a client
        // contact — every other way onto this list (an admin, a mention, a
        // colleague added by hand) is one of ours. A contact keeps their
        // name; we are named by our first.
        const name = (s.origin === "raiser" ? s.name : staffNameFromSnapshot(s.name)) || s.email
        return (
          <Card key={s.userId} data-slot="stakeholder-card" variant="raised">
            <CardContent className="p-3">
              {/* `<CardTitle>` STAYS WRITTEN HERE, not built inside
                  `PersonCard` — R65's own census reads it off THIS file's
                  `<Card>` block, textually (person-card.tsx's own header
                  has the argument). */}
              <PersonCard
                picture={s.imageUrl}
                mark={nameInitials(s.name)}
                markName={name}
                orientation="horizontal"
                size="tile"
                chip={
                  <span className="text-micro text-muted-foreground uppercase">
                    {s.origin === "raiser" ? t("Raised by") : t("On the loop")}
                  </span>
                }
                title={<CardTitle className="min-w-0 truncate text-sm">{name}</CardTitle>}
              />
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
