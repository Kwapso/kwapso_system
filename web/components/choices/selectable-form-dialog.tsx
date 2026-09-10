"use client"

// Add-a-dropdown-value dialog — the form overlay for creating a Selectable value
// (a group + a value). Opened from the Dropdown values screen's "New value"
// button. Like every other create in the base it goes through the shared FormShell
// (Law R4: title/subtitle · separator · fields · separator · action) and persists a
// per-session draft (Law R7 · CACHING.md §11). The caller does the create + cache
// refresh; this owns the form + busy + error toast. Library primitives.

import * as React from "react"

import {
  DialogDescription,
  DialogTitle,
} from "@shared/ui/components/dialog/dialog"
import { Field } from "@shared/web/field"
import { Input } from "@shared/ui/components/input/input"
import { toast } from "@shared/ui/components/sonner/sonner"
import { Plus } from "@shared/ui/foundations/icons"
import { defaultFieldConfig } from "@shared/web/screen-engine/config"

import { ApiFailure } from "@/lib/api"
import { FormShellDialog, fieldSpacing } from "@shared/web/form-shell"
import { useFormDraft } from "@shared/web/use-form-draft"
import { useT } from "@shared/web/language"

const groupField = { ...defaultFieldConfig, label: "Group", required: true }
const optionField = { ...defaultFieldConfig, label: "Value", required: true }
/** THE TYPE MARK (CHECKLIST 11.8, UI-RULEBOOK G2). One mark, set HERE rather
 * than written into a component, which is the fourth condition UI-CONVENTIONS §5
 * puts on a type mark. Optional on purpose: most groups are plain labels, and a
 * missing mark costs nothing because the word is always beside it.
 *
 * IT ASKED FOR AN EMOJI UNTIL 2026-09-10, and the label was arguing with the
 * door as well as with the client. `optionalMark` (`shared/workers/validate.ts`)
 * has refused a pictograph on this exact field since 2026-08-31 — her ruling,
 * *"i said no emojis. why are there still emojis? kill them!"* — with the
 * sentence "Mark should be a short word or initial, not an emoji." So a field
 * headed "Emoji", whose help text asked for one, was a 400 waiting to happen:
 * the tickets and process sides took the new word that day
 * (`internal-record-dialog.tsx`'s `moduleFields`) and these three Choices
 * screens were the half nobody changed. Her 2026-09-10 *"also kill emojis!!!"*
 * is the same ruling arriving a third time.
 *
 * THE WORDS ARE THE ONES ALREADY IN USE, not new ones: "Mark" and "A short word
 * or initial" are what the internal record dialog says, so the app describes one
 * field one way. */
const markField = {
  ...defaultFieldConfig,
  label: "Mark",
  required: false,
  helpText: "A short word or initial shown beside this option, wherever the type appears. Leave it empty for a plain label.",
}

export function SelectableFormDialog({
  open,
  onOpenChange,
  types,
  onSubmit,
  draftKey,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Existing group names, offered as a pick-or-create datalist. */
  types: string[]
  onSubmit: (type: string, value: string, mark: string) => Promise<void>
  /** Stable id for per-session draft persistence (CACHING.md §11); omit to disable. */
  draftKey?: string
}) {
  const t = useT()
  const [values, setValues, clearDraft] = useFormDraft(draftKey, { type: "", value: "", mark: "" }, open)
  const [busy, setBusy] = React.useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!values.type.trim() || !values.value.trim()) return
    setBusy(true)
    try {
      await onSubmit(values.type.trim(), values.value.trim(), values.mark.trim())
      clearDraft()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof ApiFailure ? err.message : t("Couldn't add that value."))
    } finally {
      setBusy(false)
    }
  }

  return (
    <FormShellDialog
      open={open}
      onOpenChange={onOpenChange}
      busy={busy}
      onSubmit={submit}
      title={<DialogTitle>{t("New dropdown value")}</DialogTitle>}
      subtitle={
        <DialogDescription>
          {t("Pick an existing group or start a new one, then add the value.")}
        </DialogDescription>
      }
      submit={{
        busy,
        disabled: !values.type.trim() || !values.value.trim(),
        icon: <Plus className="size-4" />,
      }}
    >
      <Field config={groupField} htmlFor="selectable-group" className={fieldSpacing}>
        <Input
          id="selectable-group"
          list="dropdown-types"
          value={values.type}
          onChange={(e) => setValues((v) => ({ ...v, type: e.target.value }))}
          placeholder={t("e.g. Ticket type")}
          disabled={busy}
          autoFocus
        />
        <datalist id="dropdown-types">
          {types.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </Field>
      <Field config={optionField} htmlFor="selectable-value" className={fieldSpacing}>
        <Input
          id="selectable-value"
          value={values.value}
          onChange={(e) => setValues((v) => ({ ...v, value: e.target.value }))}
          placeholder={t("e.g. Question")}
          disabled={busy}
        />
      </Field>
      <Field config={markField} htmlFor="selectable-mark" className={fieldSpacing}>
        <Input
          id="selectable-mark"
          value={values.mark}
          onChange={(e) => setValues((v) => ({ ...v, mark: e.target.value }))}
          // "e.g. a question mark" WAS AN INSTRUCTION TO TYPE AN EMOJI — it
          // named the pictograph, not a code, and the value beside it is
          // "Question". Replaced with the sentence the internal record dialog
          // already uses for the same field, so the two say one thing.
          placeholder={t("A short word or initial")}
          disabled={busy}
        />
      </Field>
    </FormShellDialog>
  )
}
