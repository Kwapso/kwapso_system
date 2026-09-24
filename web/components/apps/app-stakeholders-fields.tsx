"use client"

// THE CLIENT'S CONTACTS, ON AN APP (8.5) — the checklist + Main stakeholder
// picker, shared between the app's own edit form (`app-form-dialog.tsx`) and
// the Stakeholders tab's own "Edit stakeholders" sheet
// (`app-stakeholders-sheet.tsx`). Extracted rather than copied (CLAUDE.md's
// "which seams do I reuse" question): the two doors ask the identical
// question — who at the client is on this, and which of them is the main
// one — over the same `stakeholderContactIds` + `mainStakeholderContactId`
// pair the update door reads (`workers/tenancy/src/routes/processes.ts`'s
// `savePeople`), so one component answers it once.
//
// STAFF/LEAD STAY ON THE FORM ONLY. The Stakeholders tab's own edit sheet is
// scoped to the client's side on purpose — the default the tab's own lane
// picked, noted in its report: our own people are staffed from the app's
// edit form, same as the app's stage, logo and cost.

import * as React from "react"

import { Checkbox } from "@shared/ui/components/checkbox/checkbox"
import { Label } from "@shared/ui/components/label/label"
import { Field } from "@shared/web/field"
import { defaultFieldConfig } from "@shared/web/screen-engine/config"
import { fieldSpacing } from "@shared/web/form-shell"
import type { Language } from "@shared/i18n"
import { RecordMark } from "@shared/web/record-mark"
import { RecordPicker } from "@/components/records/record-picker"
import { sortedOptions } from "@shared/web/sorted-options"
import { useT } from "@shared/web/language"

const stakeholderField = {
  ...defaultFieldConfig,
  label: "Their contacts",
  required: false,
}
const mainStakeholderField = {
  ...defaultFieldConfig,
  label: "Main stakeholder",
  required: false,
}

/** The word for nobody. A Select cannot hold an empty string as a value, so the
 * absence has to be spelled — the same sentinel the ticket form uses. */
const NOBODY = "__none__"

export function AppStakeholdersFields({
  contacts,
  lang,
  busy,
  stakeholderContactIds,
  onStakeholderContactIdsChange,
  /** already resolved to "" when the picked id fell off the ticked list —
   * see `AppFormDialog`'s own `mainHolder` for the shape both callers keep. */
  mainStakeholderContactId,
  onMainStakeholderContactIdChange,
}: {
  contacts: {
    id: string
    name: string
    /** THEIR PHOTOGRAPH, where the client's own record carries one —
     *  `AccountLink.personLogoUrl`, straight off the door, never re-fetched.
     *  Added 23 Sep 2026 for Aurora's "where there's avatar show it- only
     *  initials when avatar is empty": both callers already held this field
     *  and dropped it on the way in, so the checklist drew a letter tile for
     *  contacts who have a face on file. `null` is the ordinary case and the
     *  one the mark falls through to an initial for. */
    photo?: string | null
  }[]
  lang: Language
  busy?: boolean
  stakeholderContactIds: string[]
  onStakeholderContactIdsChange: (ids: string[]) => void
  mainStakeholderContactId: string
  onMainStakeholderContactIdChange: (id: string) => void
}) {
  const t = useT()
  return (
    <>
      <Field config={stakeholderField} shape="group" htmlFor="app-stakeholders" className={fieldSpacing}>
        <div className="flex flex-col gap-2" id="app-stakeholders">
          {contacts.length === 0
            ? null
            : sortedOptions(contacts, lang, (c) => c.name).map((c) => (
                <Label key={c.id} className="flex">
                  <Checkbox
                    checked={stakeholderContactIds.includes(c.id)}
                    onCheckedChange={(ch) =>
                      onStakeholderContactIdsChange(
                        ch === true
                          ? [...stakeholderContactIds, c.id]
                          : stakeholderContactIds.filter((x) => x !== c.id)
                      )
                    }
                    disabled={busy}
                  />
                  {/* A CONTACT IS A PERSON (R35's "round" shape).
                      `size="choice"` — the client called `row` (36px) "too big"
                      on this exact checklist, so it draws the 24px checklist
                      size instead.

                      THEIR PHOTOGRAPH, NOT THEIR INITIALS — Aurora, 23 Sep
                      2026: "where there's avatar show it- only initials when
                      avatar is empty." The comment that stood here said "no
                      photo comes through `listAccountLinks` today", and that
                      has been untrue since `AccountLink.personLogoUrl` landed
                      — the door has carried the face at the other end of the
                      link, with its own header naming R35 as the reason, and
                      BOTH callers of this component flattened it away in their
                      own `.map` (`{ id, name }`) before it could arrive. So
                      every client contact on this checklist drew a letter
                      tile even where a photograph existed: not a missing
                      fact, a dropped one, which is the shape this ruling is
                      about. A contact with no photograph still falls through
                      to their initial, unchanged.

                      AND THE PHOTOGRAPH IS GREY — Aurora, same day:
                      "external photos (from contacts) gray scale. keep staff
                      nirmal." A contact is external by construction here:
                      this list IS the client's own people (`listAccountLinks`
                      off the app's account), which is the one thing this
                      component is for, so `external` is a constant rather
                      than a fact any row has to carry. */}
                  <RecordMark picture={c.photo} name={c.name} shape="round" size="choice" external />
                  {c.name}
                </Label>
              ))}
        </div>
      </Field>
      {stakeholderContactIds.length > 0 && (
        <Field config={mainStakeholderField} htmlFor="app-main-stakeholder" className={fieldSpacing}>
          <RecordPicker
            id="app-main-stakeholder"
            value={mainStakeholderContactId || NOBODY}
            onChange={(v) => onMainStakeholderContactIdChange(v === NOBODY ? "" : v)}
            // `face: true` (R90) is what asks for the fallback-to-initial face;
            // `shape` alone names the box, not whether one is drawn at all.
            // `picture` is what makes that face a PHOTOGRAPH where the contact
            // has one — Aurora, 23 Sep 2026, whose ruling was found on exactly
            // this kind of surface: "on choices adde by show avatar, not
            // initials… always: where there's avatar show it- only initials
            // when avatar is empty." `face: true` alone only ever bought the
            // FALLBACK, so this picker drew a letter tile for every contact,
            // photograph or not, on the same screen whose checklist one field
            // up drew the same people the same wrong way. `external` because
            // every person in this list is a client contact by construction.
            options={sortedOptions(contacts, lang, (c) => c.name)
              .filter((c) => stakeholderContactIds.includes(c.id))
              .map((c) => ({
                value: c.id,
                label: c.name,
                shape: "round" as const,
                face: true,
                picture: c.photo ?? null,
                external: true,
              }))}
            emptyOption={{ value: NOBODY, label: t("Not said") }}
            placeholder={t("Not said")}
            searchPlaceholder={t("Search contacts…")}
            emptyText={t("Nobody here matched.")}
            disabled={busy}
          />
        </Field>
      )}
    </>
  )
}
