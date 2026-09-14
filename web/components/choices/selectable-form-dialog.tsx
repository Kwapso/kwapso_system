"use client"

// Add-a-dropdown-value dialog — the form overlay for creating a Selectable value
// (a group + a value). Opened from the Dropdown values screen's "New value"
// button. Like every other create in the base it goes through the shared FormShell
// (Law R4: title/subtitle · separator · fields · separator · action) and persists a
// per-session draft (Law R7 · CACHING.md §11). The caller does the create + cache
// refresh; this owns the form + busy + error toast. Library primitives.
//
// ── ONE COMPONENT, TWO STARTING POINTS (client, 14 Sep 2026) ────────────────
//
// *"In settings choices, of course, we need the add button. When it opens, I
// should be able to select the module and, once I have selected the module,
// enter the value."* Her sentence describes a screen where the module is NOT
// yet known — the system-wide Choices tab (settings-choices-panel.tsx) — and
// this dialog already served the OTHER shape, where it is: mounted from a
// single module's own settings page (`SelectableScreen`), the group a new
// value belongs to is never in doubt (`scope.types` names it, one or two
// entries, always this page's own).
//
// So `modules` is the ONE new, OPTIONAL prop that turns the first shape on:
//
//   · ABSENT (`SelectableScreen`'s call, unchanged) → exactly today's form.
//     "Group" is a free-text field with a datalist over `types` (the page's
//     own group or two), "Value" is enabled from the first frame.
//   · PRESENT (`settings-choices-panel.tsx`'s call, new) → a MODULE `<Select>`
//     is the first field, built off the same list the Choices tab's own
//     Module COLUMN and FILTER already derive from `moduleSettingsIndex` —
//     one derivation read three ways, never a second list. Picking a module
//     resolves its own group(s): ONE group resolves silently (most modules —
//     Tickets, Stories, Sprints, Brand assets — own exactly one), MORE THAN
//     ONE (Accounts: Industry/Country; Apps: App stage/Deliverable kind)
//     reveals a second, CLOSED `<Select>` naming exactly those groups — a
//     stricter version of the free-text field above, because here the valid
//     answers are actually finite and known, not a suggestion. "Value" stays
//     DISABLED until the group resolves either way, because the create door
//     needs a type to accept a value (`postCreateSelectable`,
//     workers/tenancy/src/routes/selectable.ts) — there is no "value with no
//     group yet" for it to hold onto.
//
// THE SUBMIT IS THE SAME DOOR EITHER WAY (R10/R1/R15/R20 already gate,
// publish, live-sync and validate it) — `onSubmit(type, value, mark)`, this
// file's own contract since it was written. Nothing about the door changes;
// only how `type` gets chosen before the same call reaches it.

import * as React from "react"

import {
  DialogDescription,
  DialogTitle,
} from "@shared/ui/components/dialog/dialog"
import { Field } from "@shared/web/field"
import { Input } from "@shared/ui/components/input/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/ui/components/select/select"
import { toast } from "@shared/ui/components/sonner/sonner"
import { Plus } from "@shared/ui/foundations/icons"
import { defaultFieldConfig } from "@shared/web/screen-engine/config"

import { ApiFailure } from "@/lib/api"
import { FormShellDialog, fieldSpacing } from "@shared/web/form-shell"
import { useFormDraft } from "@shared/web/use-form-draft"
import { useLanguage } from "@shared/web/language"
import { sortedOptions } from "@shared/web/sorted-options"

/** ONE MODULE'S OWN VOCABULARY GROUP(S), for the module-first shape. Built by
 * the caller off `moduleSettingsIndex` (`settings-choices-panel.tsx`'s own
 * `modulesWithChoices` walk) — never re-derived here, the same rule
 * `ChoiceGroupHome` already states for the Choices table itself. */
export type ChoiceModuleOption = { segment: string; title: string; types: string[] }

const moduleField = { ...defaultFieldConfig, label: "Module", required: true }
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
  modules,
  onSubmit,
  draftKey,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Existing group names for THIS module, offered as a pick-or-create
   * datalist — `SelectableScreen`'s own shape, the module already known.
   * Ignored when `modules` is given. */
  types?: string[]
  /** THE MODULE-FIRST SHAPE — see this file's header. Pass exactly one of
   * `types` / `modules`, never both. */
  modules?: ChoiceModuleOption[]
  onSubmit: (type: string, value: string, mark: string) => Promise<void>
  /** Stable id for per-session draft persistence (CACHING.md §11); omit to disable. */
  draftKey?: string
}) {
  const { t, lang } = useLanguage()
  const [values, setValues, clearDraft] = useFormDraft(draftKey, { type: "", value: "", mark: "" }, open)
  const [busy, setBusy] = React.useState(false)

  // DERIVED FROM `values.type`, NEVER A SECOND PIECE OF STATE — a draft
  // restored from a navigation-away carries `type` (`use-form-draft.ts`'s own
  // contract) and nothing else, so re-deriving which module and group that
  // belongs to off the one field the draft actually holds is what makes the
  // Module/Group selects come back showing the truth on return, rather than a
  // placeholder sitting in front of a `type` that is already resolved.
  const activeModule = modules?.find((m) => m.types.includes(values.type))
  const moduleGroups = activeModule?.types ?? []
  // VALUE IS DISABLED UNTIL A GROUP RESOLVES, module-first shape only — the
  // create door needs a type to accept a value at all
  // (`postCreateSelectable`, workers/tenancy/src/routes/selectable.ts), so
  // there is no "value with no group yet" for it to hold. The `types` shape
  // never disables it: the group is already known before the dialog opens.
  const valueDisabled = busy || (modules !== undefined && !values.type)

  function selectModule(segment: string) {
    const m = modules?.find((x) => x.segment === segment)
    // ONE GROUP RESOLVES SILENTLY (most modules own exactly one — see this
    // file's header); more than one clears `type` so the Group select below
    // renders and the reader picks between them explicitly, rather than this
    // guessing.
    setValues((v) => ({ ...v, type: m?.types.length === 1 ? m.types[0] : "" }))
  }

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
          {modules
            ? t("Choose which module this belongs to, then add the value.")
            : t("Pick an existing group or start a new one, then add the value.")}
        </DialogDescription>
      }
      submit={{
        busy,
        disabled: !values.type.trim() || !values.value.trim(),
        icon: <Plus className="size-4" />,
      }}
    >
      {modules ? (
        <>
          <Field config={moduleField} htmlFor="selectable-module" className={fieldSpacing}>
            <Select value={activeModule?.segment ?? ""} onValueChange={selectModule} disabled={busy}>
              {/* eslint-disable-next-line jsx-a11y/no-autofocus -- same rule
                  the free-text Group input below follows: the first field in
                  this form always takes focus on open. */}
              <SelectTrigger id="selectable-module" className="h-9 w-full" autoFocus>
                <SelectValue placeholder={t("Choose a module")} />
              </SelectTrigger>
              <SelectContent>
                {sortedOptions(modules, lang, (m) => t(m.title)).map((m) => (
                  <SelectItem key={m.segment} value={m.segment}>
                    {t(m.title)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {/* THE CLOSED GROUP PICKER — only a module that owns MORE THAN ONE
              vocabulary needs it (Accounts: Industry/Country; Apps: App
              stage/Deliverable kind). A single-group module resolves
              `values.type` the moment it is chosen above and this never
              renders. Unlike `SelectableScreen`'s free-text Group field, this
              list is closed on purpose: the module is already known, so
              every valid answer is already known too. */}
          {moduleGroups.length > 1 && (
            <Field config={groupField} htmlFor="selectable-group" className={fieldSpacing}>
              <Select value={values.type} onValueChange={(v) => setValues((cur) => ({ ...cur, type: v }))} disabled={busy}>
                <SelectTrigger id="selectable-group" className="h-9 w-full">
                  <SelectValue placeholder={t("Choose a group")} />
                </SelectTrigger>
                <SelectContent>
                  {sortedOptions(moduleGroups, lang, (g) => g).map((group) => (
                    <SelectItem key={group} value={group}>
                      {group}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        </>
      ) : (
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
            {(types ?? []).map((ty) => (
              <option key={ty} value={ty} />
            ))}
          </datalist>
        </Field>
      )}
      <Field config={optionField} htmlFor="selectable-value" className={fieldSpacing}>
        <Input
          id="selectable-value"
          value={values.value}
          onChange={(e) => setValues((v) => ({ ...v, value: e.target.value }))}
          placeholder={t("e.g. Question")}
          disabled={valueDisabled}
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
