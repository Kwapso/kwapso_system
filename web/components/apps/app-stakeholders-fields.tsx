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
  contacts: { id: string; name: string }[]
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
                  {/* A CONTACT IS A PERSON (R35's "round" shape). No photo comes
                      through `listAccountLinks` today, so this falls back to
                      their initial like every unphotographed person.
                      `size="choice"` — the client called `row` (36px) "too big"
                      on this exact checklist, so it draws the 24px checklist
                      size instead. */}
                  <RecordMark name={c.name} shape="round" size="choice" />
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
            options={sortedOptions(contacts, lang, (c) => c.name)
              .filter((c) => stakeholderContactIds.includes(c.id))
              .map((c) => ({ value: c.id, label: c.name, shape: "round" as const, face: true }))}
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
