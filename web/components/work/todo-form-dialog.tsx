"use client"

// ASK A CLIENT FOR SOMETHING — the one form in the agency app whose Save button
// reaches into a customer's inbox. Through the shared FormShell (Law R4) with a
// per-session draft (Law R7).
//
// The subtitle says the email out loud rather than burying it in a tooltip: a
// to-do is one of only two things in the whole product that emails a client
// (.plans/BUILD-1 §7), and somebody typing one should know that before they
// finish typing, not after.

import * as React from "react"

import { DatePicker } from "@shared/ui/components/date-picker/date-picker"
import { DialogDescription, DialogTitle } from "@shared/ui/components/dialog/dialog"
import { Field } from "@shared/web/field"
import { FactRow } from "@shared/web/fact-row"
import { Input } from "@shared/ui/components/input/input"
import { Notes } from "@shared/web/notes-editor/notes-editor"
import { toast } from "@shared/ui/components/sonner/sonner"
import { PaperPlaneTilt } from "@shared/ui/foundations/icons"
import { defaultFieldConfig } from "@shared/web/screen-engine/config"
import { TITLE_MAX_CHARS } from "@shared/types"

import { ApiFailure, tenancy } from "@/lib/api"
import { pickerKey, searchAccounts } from "@/lib/picker-sources"
import { useActiveTeam } from "@/lib/use-active-team"
import { RecordPicker } from "@/components/records/record-picker"
import { AccountAppPicker, type AccountScopedApp } from "@/components/records/account-app-picker"
import { FormShellDialog, fieldSpacing } from "@shared/web/form-shell"
import { richTextValue } from "@shared/web/rich-text"
import { dateFromYMD, ymdFromDate } from "@shared/web/format"
import { useFormDraft } from "@shared/web/use-form-draft"
import { useCached } from "@shared/web/store"
import { useLanguage } from "@shared/web/language"

export type TodoFormValues = {
  accountId: string
  title: string
  detail: string
  dueOn: string
  /** WHICH SYSTEM — optional, client ruling 17 Sep 2026. "" means none named. */
  appId: string
  /** WHO AT THE CLIENT — optional, same ruling. "" means nobody named. */
  assignedContactId: string
}

const accountField = { ...defaultFieldConfig, label: "Which account", required: true }
// R87 (title-length, RULES.md): every title field reads the one shared
// ceiling, so the marker, the counter and the door can never disagree about
// what "too long" means.
const titleField = {
  ...defaultFieldConfig,
  label: "What we need from them",
  required: true,
  validation: { ...defaultFieldConfig.validation, maxLength: TITLE_MAX_CHARS },
}
const detailField = { ...defaultFieldConfig, label: "Anything else they should know", required: false }
/** WHEN THE CLIENT HAS TO COME BACK TO US. Called Deadline, which is the word
 * every other screen in the app uses for the same fact (CHECKLIST 2.5) — this
 * form said "By when" and was the last place a second word for it survived. */
const dueField = { ...defaultFieldConfig, label: "Deadline", required: false }
/** WHICH OF THE CLIENT'S OWN SYSTEMS — client ruling, 17 Sep 2026: "it is
 * optional to select an app." Never required. */
const appField = { ...defaultFieldConfig, label: "App", required: false }
/** WHO AT THE CLIENT — same ruling: "I want to be able to select who this
 * gets assigned to." Never required — this door has no gate that needs one. */
const assignedField = { ...defaultFieldConfig, label: "Assigned to", required: false }

export function TodoFormDialog({
  open,
  onOpenChange,
  fixedAccount,
  draftKey,
  apps,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Set when the form is opened FROM a client's own record — the client is then
   * a fact about where you are standing rather than a question, so the picker is
   * replaced by their name and cannot be changed by accident. The same shape
   * SprintFormDialog and StoryFormDialog use for a fixed app, and for the same
   * reason: the relation is the whole point of creating it from here. */
  fixedAccount?: { id: string; name: string }
  draftKey?: string
  /** THE TEAM'S APPS, bounded (R14) and already held by the screen this dialog
   * opens from — the same prop `SprintFormDialog`/`WaveFormDialog`/
   * `MeetingFormDialog` take, fed into the identical `AccountAppPicker` (F15).
   * No filter needed here: the picker narrows to the chosen account itself. */
  apps: AccountScopedApp[]
  onSubmit: (values: TodoFormValues) => Promise<void>
}) {
  const { t, lang } = useLanguage()
  const teamId = useActiveTeam().ctx?.team?.id ?? null
  const [values, setValues, clearDraft] = useFormDraft(
    draftKey,
    { accountId: "", title: "", detail: "", dueOn: "", appId: "", assignedContactId: "" },
    open
  )
  const [busy, setBusy] = React.useState(false)
  const accountId = fixedAccount ? fixedAccount.id : values.accountId
  const ready = accountId !== "" && values.title.trim() !== ""

  // THE ACCOUNT'S OWN CONTACTS — the same door and the same cache key
  // `help-form-dialog.tsx`'s raised-by row already reads (R56: one door,
  // asked once), so opening this dialog from a screen that has the account's
  // detail warm in cache costs nothing extra. `AccountDetail.links` is the
  // account's own address book (R35: each carries its face and its full
  // name), the client's own words: "it needs to filter the contacts of this
  // account, including the avatar and full name."
  const detailQ = useCached(accountId ? `account-detail:${accountId}` : null, () =>
    tenancy.accountDetail(accountId)
  )
  const contactOptions = (detailQ.data?.links ?? [])
    .filter((l) => l.active)
    .map((l) => ({
      value: l.personAccountId,
      label: l.personName,
      picture: l.personLogoUrl,
      shape: "round" as const,
      face: true,
    }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!ready) return
    setBusy(true)
    try {
      await onSubmit({
        accountId,
        title: values.title.trim(),
        detail: richTextValue(values.detail),
        dueOn: values.dueOn,
        appId: values.appId,
        assignedContactId: values.assignedContactId,
      })
      clearDraft()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof ApiFailure ? err.message : t("Couldn't ask for that."))
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
      title={<DialogTitle>{t("Ask a client for something")}</DialogTitle>}
      subtitle={
        <DialogDescription>
          {t("This lands in their portal with a due date, and we email them about it. Only for something we genuinely can't get on without.")}
        </DialogDescription>
      }
      submit={{
        busy: busy,
        disabled: !ready,
        icon: <PaperPlaneTilt className="size-4" />,
      }}
    >
      <Field config={accountField} htmlFor="todo-account" className={fieldSpacing}>
        {fixedAccount ? (
          // A FACT, NOT A CONTROL — opened FROM the client's own record, so
          // who this is for is settled rather than asked (this field's own
          // doc comment always claimed this; the control stayed live under
          // it until now).
          <FactRow id="todo-account" name={fixedAccount.name} />
        ) : (
          /* THE DOOR ANSWERS THIS, because accounts PAGE (R14): the list cache
             this used to read holds page one, so an agency past fifty companies
             could not ask the fifty-first for anything. */
          <RecordPicker
            id="todo-account"
            value={values.accountId}
            // CHANGING THE ACCOUNT CLEARS THE TWO FIELDS THAT HANG OFF IT — the
            // same behaviour `help-form-dialog.tsx`'s own account picker takes
            // over its App/Module/Raised-by trio, and for the identical reason:
            // an app row and a contact row that are only offered once an
            // account is named must not keep an answer from before one was.
            onChange={(v) => setValues((s) => ({ ...s, accountId: v, appId: "", assignedContactId: "" }))}
            search={(term) => searchAccounts(term)}
            searchKey={pickerKey("accounts", teamId)}
            placeholder={t("Pick the account")}
            searchPlaceholder={t("Search accounts…")}
            emptyText={t("No account matched.")}
            disabled={busy}
          />
        )}
      </Field>
      {/* THE APP, ONCE AN ACCOUNT IS NAMED — client ruling, 17 Sep 2026:
          "when we already selected an account, this app choice must be in a
          horizontal component," read together with her earlier one this same
          field is built from ("show horizontal choice component," F15,
          `AccountAppPicker`). Optional, and HIDDEN before an account is
          chosen rather than offered as a search-and-pick of every app in the
          team — an Input always has an account (`accountField` above is
          required), so this is only ever the sliver of time before that
          field is answered. `noneLabel` is this form's own opt-in into an
          explicit "None" pill (see that component's own note on the prop):
          `layout="row"` otherwise carries no way back to blank once a chip
          has been pressed. */}
      {accountId && (
        <Field config={appField} htmlFor="todo-app" className={fieldSpacing}>
          <AccountAppPicker
            id="todo-app"
            ariaLabel={t(appField.label)}
            accountId={accountId}
            apps={apps}
            value={values.appId}
            onChange={(appId) => setValues((s) => ({ ...s, appId }))}
            lang={lang}
            disabled={busy}
            placeholder={t("No app")}
            searchPlaceholder={t("Search apps…")}
            emptyOption={{ value: "", label: t("No app") }}
            emptyText={t("No app matched.")}
            noneLabel={t("No app")}
          />
        </Field>
      )}
      {/* WHO AT THE CLIENT — client ruling, 17 Sep 2026: "I want to be able
          to select who this gets assigned to. Of course, it needs to filter
          the contacts of this account, including the avatar and full name,
          in a horizontal choice component with pills." Same row idiom as the
          App field above and as the ticket form's own Raised-by row
          (`help-form-dialog.tsx`), narrowed to THIS account's own contacts
          (`contactOptions`, off `AccountDetail.links`) rather than a shared
          component — the ticket form draws its own row inline for the
          identical reason, and a second abstraction over one `RecordPicker`
          call is not what either form is missing. Hidden until an account is
          chosen, same reasoning as the App field: there is no roster to
          filter before then. */}
      {accountId && (
        <Field config={assignedField} htmlFor="todo-assigned" className={fieldSpacing}>
          <RecordPicker
            id="todo-assigned"
            layout="row"
            ariaLabel={t(assignedField.label)}
            value={values.assignedContactId}
            onChange={(assignedContactId) => setValues((s) => ({ ...s, assignedContactId }))}
            options={contactOptions}
            searchPlaceholder={t("Search contacts…")}
            emptyText={t("No contacts yet.")}
            disabled={busy}
          />
        </Field>
      )}
      <Field
        config={titleField}
        htmlFor="todo-title"
        className={fieldSpacing}
        count={values.title.length}
        countMax={TITLE_MAX_CHARS}
      >
        <Input
          id="todo-title"
          value={values.title}
          onChange={(e) => setValues((s) => ({ ...s, title: e.target.value }))}
          placeholder={t("e.g. Send us your brand logo as an SVG")}
          maxLength={TITLE_MAX_CHARS}
          disabled={busy}
          autoFocus
        />
      </Field>
      <Field config={detailField} htmlFor="todo-detail" className={fieldSpacing}>
        <Notes
          key={open ? "open" : "shut"}
          // THE NAME A SCREEN READER READS. The `htmlFor` above lands the id on
          // the editable node itself, because the kit Field clones it onto its
          // single child — and this is the label that id could never carry, since
          // a label element's `for` attribute binds only to a labelable control
          // and the editable node here is a plain div. Same words as the visible
          // label, taken from the same config, so the two can never drift apart.
          aria-label={t(detailField.label)}
          disabled={busy}
          defaultValue={values.detail}
          onChange={(html) => setValues((s) => ({ ...s, detail: html }))}
          placeholder={t("Where to find it, what format, who to ask.")}
          className="min-h-32"
        />
      </Field>
      <Field config={dueField} htmlFor="todo-due" className={fieldSpacing}>
        <DatePicker
          id="todo-due"
          mode="date"
          locale={lang}
          value={dateFromYMD(values.dueOn)}
          onValueChange={(d) => setValues((s) => ({ ...s, dueOn: ymdFromDate(d) }))}
          disabled={busy}
        />
      </Field>
    </FormShellDialog>
  )
}
