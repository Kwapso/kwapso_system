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
// THE INTRO SENTENCE AND THE ORIGIN BADGE ARE GONE WITH THE SAME PASS, not
// separately reasoned: her own words for what should survive were "the
// stakeholder faces + names" — a face, a name, nothing labelling WHY each
// person is on the list (raiser / admin / mentioned / added) and no paragraph
// explaining the mechanism above them. The origin is still on the row's own
// `HelpStakeholder.origin` for whatever reads it next; this screen simply
// stopped printing it.

import * as React from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@shared/ui/components/avatar/avatar"

import type { HelpStakeholder } from "@shared/types"
import { letterMark } from "@/lib/identity"
import { useLanguage } from "@shared/web/language"
import { staffNameFromSnapshot } from "@shared/staff-name"

export function HelpStakeholders({ stakeholders }: { stakeholders: HelpStakeholder[] }) {
  const { t } = useLanguage()

  if (stakeholders.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("Just the person who raised it and your admins so far.")}</p>
  }

  return (
    <ul className="divide-border divide-y rounded-[var(--radius)] bg-surface-panel">
      {stakeholders.map((s) => (
        <li key={s.userId} className="flex flex-wrap items-center gap-2 px-3 py-2">
          <Avatar className="size-8">
            {s.imageUrl && <AvatarImage src={s.imageUrl} alt="" />}
            <AvatarFallback>{letterMark(s.name || s.email)}</AvatarFallback>
          </Avatar>
          {/* R54. `origin: "raiser"` is the one value here that can be a client
              contact — every other way onto this list (an admin, a mention, a
              colleague added by hand) is one of ours. A contact keeps their
              name; we are named by our first. */}
          <p className="min-w-0 flex-1 basis-[12rem] truncate text-sm font-medium">
            {(s.origin === "raiser" ? s.name : staffNameFromSnapshot(s.name)) || s.email}
          </p>
        </li>
      ))}
    </ul>
  )
}
