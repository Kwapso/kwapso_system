"use client"

// SELL A WAVE — the form overlay for recording a package a client bought, or
// re-wording one. Through the shared FormShell (R4) with a per-session draft
// (R7), like every other write in the base.
//
// TWO FIELDS AND NO THIRD, and each absence is a ruling rather than an omission:
//
//   • NO PRICE. The owner took the money out of the first version four separate
//     times — "leave the whole internal_rates and account_rates out of V1… This
//     is a fix decision" — and there is no price column on `waves` for a field
//     here to write to. A form that asked would be asking for something no door
//     accepts.
//
//   • NO KIND. "A wave consists of multiple sprints. Sprints consist of multiple
//     stories… It makes no sense to label a wave as a particular kind. A wave is
//     a wave."
//
//   • NO DATES. They are the sprints' answer (the wave's own screen recalculates
//     them whenever a sprint is added, moved or removed), so a pair of date
//     inputs here would let somebody type a wave into disagreeing with the work
//     inside it — and the disagreement would look exactly like a fact.

import * as React from "react"

import { DialogDescription, DialogTitle } from "@shared/ui/components/dialog/dialog"
import { Field } from "@shared/web/field"
import { FactRow } from "@shared/web/fact-row"
import { Input } from "@shared/ui/components/input/input"
import { Notes } from "@shared/web/notes-editor/notes-editor"
import { toast } from "@shared/ui/components/sonner/sonner"
import { defaultFieldConfig } from "@shared/web/screen-engine/config"

import { ApiFailure } from "@/lib/api"
import { RecordPicker } from "@/components/records/record-picker"
import { AccountAppPicker } from "@/components/records/account-app-picker"
import { accountOption, type PickableRecord } from "@/lib/pickable"
import { FormShellDialog, fieldSpacing } from "@shared/web/form-shell"
import { richTextValue } from "@shared/web/rich-text"
import { useFormDraft } from "@shared/web/use-form-draft"
import { useLanguage } from "@shared/web/language"
import { sortedOptions } from "@shared/web/sorted-options"

/** "Nothing chosen" as a real Select value — an empty string is not
 * selectable, the same shape `sprint-form-dialog.tsx`'s own `NONE` takes. */
const NONE = "__none__"

export type WaveFormValues = {
  accountId: string
  name: string
  goal: string
  /** THE SYSTEM THIS PACKAGE COVERS — client ruling, 16 Sep 2026: "I want the
   * name of the app." Empty string is "not said", the same "nothing chosen"
   * shape every other optional picker on this form uses; `WaveCollection`
   * turns that into the tri-state `appId` the door actually reads. */
  appId: string
}

// The words on these three reach the screen through `shared/web/field.tsx`,
// which translates a field config's own `label` and `helpText` on the way (R33):
// `t` is a hook and a field config is a module-level constant, so this is the one
// class of string in the app that cannot be wrapped where it is declared.
const clientField = { ...defaultFieldConfig, label: "Account", required: true }
const nameField = { ...defaultFieldConfig, label: "Wave name", required: true }
const appField = {
  ...defaultFieldConfig,
  label: "App",
  required: false,
}
const goalField = {
  ...defaultFieldConfig,
  label: "What the package is for",
  required: false,
}

export function WaveFormDialog({
  open,
  onOpenChange,
  clients,
  apps,
  fixedClient,
  initial,
  draftKey,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The clients a wave can be sold to. Carries each one's face (R35). */
  clients: PickableRecord[]
  /** EVERY APP ON THE TEAM — narrowed to the wave's own account below, the
   * same pairing `wave-detail.tsx`'s own "Plan a sprint" picker already
   * enforces (`apps.filter((a) => a.accountId === wave.accountId)`), because
   * a wave can only cover a system sold to the same client it was sold to. */
  apps: (PickableRecord & { accountId: string | null })[]
  /** Opened FROM a client's record, so whose it is is a fact rather than a
   * question — the picker disappears and a sentence takes its place, the same
   * shape the sprint and process forms already use. */
  fixedClient?: { id: string; name: string }
  /** Present = editing an existing wave (whose it is, is settled — carried
   * here rather than re-offered, so the App picker below can still narrow to
   * the right client's systems). */
  initial?: { accountId: string; name: string; goal: string; appId: string | null }
  draftKey?: string
  onSubmit: (values: WaveFormValues) => Promise<void>
}) {
  const { t, lang } = useLanguage()
  const editing = initial !== undefined
  const [values, setValues, clearDraft] = useFormDraft(
    draftKey,
    {
      accountId: initial?.accountId ?? fixedClient?.id ?? "",
      name: initial?.name ?? "",
      goal: initial?.goal ?? "",
      appId: initial?.appId ?? "",
    },
    open
  )
  const [busy, setBusy] = React.useState(false)

  const ready = values.name.trim() !== "" && (editing || values.accountId !== "")

  // THE ONE ACCOUNT THIS FORM KNOWS ABOUT, whichever way it arrived — fixed,
  // freely picked, or (editing) the wave's own settled one — so the App
  // picker below narrows the same way whether or not the Account picker is
  // even on screen. `AccountAppPicker` does the narrowing itself now (ruling
  // 2, 16 Sep 2026); this is still the one place that resolves WHICH account,
  // fixed or chosen, for it to narrow by.
  const accountId = fixedClient?.id ?? values.accountId

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!ready) return
    setBusy(true)
    try {
      await onSubmit({
        accountId: values.accountId,
        name: values.name.trim(),
        goal: richTextValue(values.goal),
        appId: values.appId,
      })
      clearDraft()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof ApiFailure ? err.message : t("Couldn't save the wave."))
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
      title={<DialogTitle>{editing ? t("Edit wave") : t("Sell a wave")}</DialogTitle>}
      subtitle={
        <DialogDescription>
          {editing
            ? t("Rename it, or say more about what the package covers.")
            : t("A package of sprints an account bought. You'll plan the sprints inside it next.")}
        </DialogDescription>
      }
      submit={{ busy: busy, disabled: !ready }}
    >
      {!editing && (
        <Field config={clientField} htmlFor="wave-client" className={fieldSpacing}>
          {fixedClient ? (
            // A FACT, NOT A CONTROL — opened FROM the account's own record, so
            // which one this wave is for is settled rather than asked.
            <FactRow id="wave-client" name={fixedClient.name} />
          ) : (
            <RecordPicker
              id="wave-client"
              value={values.accountId}
              onChange={(v) => setValues((s) => ({ ...s, accountId: v }))}
              // `accountOption`, not the bare `asOption` this used to call: an
              // account always wears a mark (client, 2026-09-09), and on staging
              // 48 of 134 hold a picture — so without `face` two rows in three
              // drew nothing beside the ones that do.
              options={sortedOptions(clients, lang, (c) => c.name).map(accountOption)}
              placeholder={t("Pick the account")}
              searchPlaceholder={t("Search accounts…")}
              emptyText={t("No account matched.")}
              disabled={busy}
            />
          )}
        </Field>
      )}
      <Field config={nameField} htmlFor="wave-name" className={fieldSpacing}>
        <Input
          id="wave-name"
          value={values.name}
          onChange={(e) => setValues((s) => ({ ...s, name: e.target.value }))}
          placeholder={t("e.g. Onboarding package")}
          disabled={busy}
          autoFocus
        />
      </Field>
      {/* THE APP THIS PACKAGE COVERS — client ruling, 16 Sep 2026: "No, now
          you have the name of the wave. I want the name of the app." Narrowed
          to the account above, through `AccountAppPicker`
          (`web/components/records/account-app-picker.tsx`) — the same pairing
          the "Plan a sprint" picker already enforces on the wave's own
          Sprints tab, and since her SAME-DAY ruling on the horizontal choice
          component, a pill row rather than a dropdown once the account is
          known. THE APP'S OWN LOGO AS THE MARK (`face: true`), the same flag
          the story form's own App row uses (`story-form-dialog.tsx`), so a
          system with no logo on file still draws its own initial rather than
          a blank row. */}
      <Field config={appField} htmlFor="wave-app" className={fieldSpacing}>
        {/* THE HORIZONTAL CHOICE COMPONENT, once the account is answered —
            client ruling, 16 Sep 2026: "when selecting app in cases account
            has been selected first, show horizontal choice component." No
            account yet keeps the picker this field always had
            (`AccountAppPicker`'s own header explains the split). */}
        <AccountAppPicker
          id="wave-app"
          ariaLabel={t(appField.label)}
          accountId={accountId || null}
          apps={apps}
          value={values.appId}
          onChange={(v) => setValues((s) => ({ ...s, appId: v }))}
          lang={lang}
          disabled={busy}
          placeholder={t("No app yet")}
          searchPlaceholder={t("Search apps…")}
          emptyOption={{ value: NONE, label: t("No app yet") }}
          emptyText={t("No app matched.")}
        />
      </Field>
      <Field config={goalField} htmlFor="wave-goal" className={fieldSpacing}>
        <Notes
          key={open ? "open" : "shut"}
          // THE NAME A SCREEN READER READS. The `htmlFor` above lands the id on
          // the editable node itself, because the kit Field clones it onto its
          // single child — and this is the label that id could never carry, since
          // a label element's `for` attribute binds only to a labelable control
          // and the editable node here is a plain div. Same words as the visible
          // label, taken from the same config, so the two can never drift apart.
          aria-label={t(goalField.label)}
          disabled={busy}
          defaultValue={values.goal}
          onChange={(html) => setValues((s) => ({ ...s, goal: html }))}
          placeholder={t("Map the processes, build two automations, test, train.")}
          className="min-h-32"
        />
      </Field>
    </FormShellDialog>
  )
}
