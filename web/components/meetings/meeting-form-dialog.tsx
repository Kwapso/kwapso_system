"use client"

// MEETING FORM — arrange a conversation, and set out what it is meant to cover.
//
// THE LONG FIELD IS THE POINT. Everything above it (who with, when, why, where)
// is the kind of thing every calendar holds; the AGENDA is what the previous
// system had nowhere to put, so it folded 350 meetings into work logs and kept
// only the hours.
//
// NOTES ARE GONE FROM THIS FORM — Aurora's ruling, 23 Sep 2026, verbatim: *"on
// meetings: rmeove notes (we have transcript for that)"*. A UI removal and
// nothing else: `meetings.notes` is still a column, every row that holds text
// still holds it, and the door still reads and writes it (`workers/content/
// src/lib/meetings.ts`). What changed is that no screen in this app offers to
// TYPE into it any more, and therefore this form no longer carries a `notes`
// value at all — which is why `meeting-detail.tsx`'s own `save()` hands the
// meeting's EXISTING `notes` straight back to the update door rather than a
// blank: that door REPLACES what it is given, so omitting the field would have
// quietly wiped what is stored the first time anybody edited a meeting.
//
// ITS DRAFT MATTERS more than most (R7). An agenda is typed while somebody is
// still on the phone agreeing it — a moment where a mis-tap costs a
// conversation rather than a field. FormShell (R4) + a per-session draft.

import * as React from "react"

import { DatePicker } from "@shared/ui/components/date-picker/date-picker"
import { DialogDescription, DialogTitle } from "@shared/ui/components/dialog/dialog"
import { Field } from "@shared/web/field"
import { FactRow } from "@shared/web/fact-row"
import { Input } from "@shared/ui/components/input/input"
import { Notes } from "@shared/web/notes-editor/notes-editor"
import { toast } from "@shared/ui/components/sonner/sonner"
import { defaultFieldConfig } from "@shared/web/screen-engine/config"
import { TITLE_MAX_CHARS } from "@shared/types"

import { ApiFailure } from "@/lib/api"
import { pickerKey, searchAccounts } from "@/lib/picker-sources"
import { RecordPicker } from "@/components/records/record-picker"
import { AccountAppPicker, type AccountScopedApp } from "@/components/records/account-app-picker"
import { accountOption, type PickableRecord } from "@/lib/pickable"
import { sortedOptions } from "@shared/web/sorted-options"
import { FormShellDialog, fieldSpacing } from "@shared/web/form-shell"
import { richTextValue } from "@shared/web/rich-text"
import { toLocalInput, toMoment } from "@shared/web/format"
import { useFormDraft } from "@shared/web/use-form-draft"
import { useLanguage } from "@shared/web/language"
import { brand } from "@shared/brand"

/** THE APP'S OWN NAME, THROUGH THE SEAM THAT OWNS IT. `shared/brand.ts` calls
 * itself "THE one place to brand this app" and twenty-three files read it; the
 * sentences below used to spell the name out instead, which meant a rebrand — or
 * a fork of this base for the next product — would have left them saying the old
 * one, in four languages, on a screen that looked finished. Written as a `{brand}`
 * hole rather than concatenated, because a hole is the only shape a translator
 * can reorder (shared/i18n.ts, `fill`). */
const BRAND = { brand: brand.name }


/** A picker can't hold an empty value, so "nobody in particular" needs a
 * sentinel — the same one the knowledge form uses for the agency's own material. */
const NONE = "__none__"

// R87 (title-length, RULES.md): every title field reads the one shared
// ceiling, so the marker, the counter and the door can never disagree about
// what "too long" means.
const titleField = {
  ...defaultFieldConfig,
  label: "What it is about",
  required: true,
  validation: { ...defaultFieldConfig.validation, maxLength: TITLE_MAX_CHARS },
}
const whenField = { ...defaultFieldConfig, label: "When", required: true }
const untilField = { ...defaultFieldConfig, label: "Until", required: false }
const clientField = { ...defaultFieldConfig, label: "Who it is with", required: false }
// WHICH SYSTEM IT WAS ABOUT. Optional on purpose: plenty of meetings are about
// the account rather than one of its systems, and the first kickoff call is one
// of them. It is what fills the app record's own Meetings tab.
const appField = { ...defaultFieldConfig, label: "Which app", required: false }
const purposeField = { ...defaultFieldConfig, label: "Why we are meeting", required: false }
const whereField = { ...defaultFieldConfig, label: "Where", required: false }
const agendaField = { ...defaultFieldConfig, label: "Agenda", required: false }

export type MeetingFormValues = {
  title: string
  startsAt: string
  endsAt: string
  accountId: string
  appId: string
  purposeId: string
  location: string
  agenda: string
  // NO `notes` — the Notes surface is removed from the meetings UI (23 Sep
  // 2026, this file's own header). A caller that must preserve what is stored
  // sends the meeting's existing value itself.
}

export function MeetingFormDialog({
  open,
  onOpenChange,
  onSubmit,
  teamId,
  accountOptions,
  appOptions,
  purposeOptions,
  fixedApp,
  initial,
  draftKey,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: MeetingFormValues) => Promise<void>
  /** the team whose clients the picker searches. Accounts PAGE (R14), so the
   * question goes to the door rather than to the loaded page. */
  teamId: string | null
  /** the clients the screen already holds — painted while the door's first
   * answer arrives, and where an edited meeting's client gets its NAME. */
  accountOptions: PickableRecord[]
  /** the systems a meeting can be filed against — the same bounded apps list
   * every other form in the work engine picks from, each tagged with whose
   * account it is on so the row below can narrow once one is chosen (ruling
   * 2, 16 Sep 2026). */
  appOptions: AccountScopedApp[]
  /** why we meet, out of the settled taxonomy under Delivery method. */
  purposeOptions: PickableRecord[]
  /** Set when the form is opened FROM an app's own screen — the system the
   * meeting is about is then a fact about where you are standing, so the picker
   * is replaced by its name. Separate from `initial`, which means EDIT: a create
   * with one field already answered must not claim to be an edit. */
  fixedApp?: { id: string; name: string }
  /** Present = EDIT mode (prefilled). */
  initial?: Partial<MeetingFormValues>
  draftKey?: string
}) {
  const { t, lang } = useLanguage()
  const isEdit = !!initial
  const [values, setValues, clearDraft] = useFormDraft(
    draftKey,
    {
      title: initial?.title ?? "",
      startsAt: initial?.startsAt ?? "",
      endsAt: initial?.endsAt ?? "",
      accountId: initial?.accountId || NONE,
      appId: initial?.appId || fixedApp?.id || NONE,
      purposeId: initial?.purposeId || NONE,
      location: initial?.location ?? "",
      agenda: initial?.agenda ?? "",
    },
    open
  )
  const [busy, setBusy] = React.useState(false)
  const ready = values.title.trim() !== "" && values.startsAt !== ""

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!ready) return
    setBusy(true)
    try {
      await onSubmit({
        title: values.title.trim(),
        startsAt: toMoment(values.startsAt),
        endsAt: toMoment(values.endsAt),
        accountId: values.accountId === NONE ? "" : values.accountId,
        appId: fixedApp ? fixedApp.id : values.appId === NONE ? "" : values.appId,
        purposeId: values.purposeId === NONE ? "" : values.purposeId,
        location: values.location.trim(),
        agenda: richTextValue(values.agenda),
      })
      clearDraft()
      onOpenChange(false)
    } catch (err) {
      toast.error(
        err instanceof ApiFailure ? err.message : isEdit ? t("Couldn't save the meeting.") : t("Couldn't arrange that.")
      )
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
      title={<DialogTitle>{isEdit ? t("Edit this meeting") : t("New meeting")}</DialogTitle>}
      subtitle={
        <DialogDescription>
          {isEdit
            ? t("Change what it is about, when it is, and what you mean to cover.")
            : /* IT SAID "You can add it to your own calendar afterwards." AND THAT
                 STOPPED BEING TRUE. Every calendar WRITE was removed from this
                 product (workers/content/src/lib/google-api.ts, above
                 `calendarList`): kwapso reads a person's calendar and cannot change
                 it, from the screen, from the assistant or from a job. A form
                 that promises an action the app refuses to take is worse than a
                 form that says nothing, so it now says what actually happens. */
              t(
                "A conversation, with what you mean to cover. It is kept here. {brand} reads your calendar and never writes to it.",
                BRAND
              )}
        </DialogDescription>
      }
      submit={{
        busy: busy,
        disabled: !ready,
      }}
    >
      <Field
        config={titleField}
        htmlFor="meeting-title"
        className={fieldSpacing}
        count={values.title.length}
        countMax={TITLE_MAX_CHARS}
      >
        <Input
          id="meeting-title"
          value={values.title}
          onChange={(e) => setValues((s) => ({ ...s, title: e.target.value }))}
          placeholder={t("e.g. Quarterly review with Bergman")}
          maxLength={TITLE_MAX_CHARS}
          disabled={busy}
          autoFocus
        />
      </Field>
      <Field config={whenField} htmlFor="meeting-when" className={fieldSpacing}>
        <DatePicker
          id="meeting-when"
          mode="datetime"
          locale={lang}
          value={values.startsAt ? new Date(values.startsAt) : null}
          onValueChange={(d) =>
            setValues((s) => ({ ...s, startsAt: d ? toLocalInput(d.toISOString()) : "" }))
          }
          disabled={busy}
        />
      </Field>
      <Field config={untilField} htmlFor="meeting-until" className={fieldSpacing}>
        <DatePicker
          id="meeting-until"
          mode="datetime"
          locale={lang}
          value={values.endsAt ? new Date(values.endsAt) : null}
          onValueChange={(d) =>
            setValues((s) => ({ ...s, endsAt: d ? toLocalInput(d.toISOString()) : "" }))
          }
          disabled={busy}
        />
      </Field>
      <Field config={clientField} htmlFor="meeting-client" className={fieldSpacing}>
        <RecordPicker
          id="meeting-client"
          value={values.accountId}
          onChange={(v) => setValues((s) => ({ ...s, accountId: v }))}
          search={(term) => searchAccounts(term)}
          searchKey={pickerKey("accounts", teamId)}
          options={sortedOptions(accountOptions, lang, (a) => a.name).map(accountOption)}
          emptyOption={{ value: NONE, label: t("Nobody, it is ours") }}
          placeholder={t("Nobody, it is ours")}
          searchPlaceholder={t("Search accounts…")}
          emptyText={t("No account matched.")}
          disabled={busy}
        />
      </Field>
      <Field config={appField} htmlFor="meeting-app" className={fieldSpacing}>
        {fixedApp ? (
          // A FACT, NOT A CONTROL — opened FROM the app's own record, so
          // which system this meeting is about is settled rather than asked.
          <FactRow id="meeting-app" name={fixedApp.name} />
        ) : (
          /* THE HORIZONTAL CHOICE COMPONENT, once an account is named — client
             ruling, 16 Sep 2026: "when selecting app in cases account has been
             selected first, show horizontal choice component." No account
             named yet keeps the search-and-pick control this field always had. */
          <AccountAppPicker
            id="meeting-app"
            ariaLabel={t(appField.label)}
            accountId={values.accountId === NONE ? null : values.accountId}
            apps={appOptions}
            value={values.appId === NONE ? "" : values.appId}
            onChange={(v) => setValues((s) => ({ ...s, appId: v || NONE }))}
            lang={lang}
            disabled={busy}
            placeholder={t("Not about one app")}
            searchPlaceholder={t("Search apps…")}
            emptyOption={{ value: NONE, label: t("Not about one app") }}
            emptyText={t("No app matched.")}
          />
        )}
      </Field>
      <Field config={purposeField} htmlFor="meeting-purpose" className={fieldSpacing}>
        <RecordPicker
          id="meeting-purpose"
          value={values.purposeId}
          onChange={(v) => setValues((s) => ({ ...s, purposeId: v }))}
          options={sortedOptions(purposeOptions, lang, (p) => p.name).map((p) => ({ value: p.id, label: p.name }))}
          emptyOption={{ value: NONE, label: t("Not said") }}
          placeholder={t("Not said")}
          searchPlaceholder={t("Search reasons…")}
          emptyText={t("Nothing matched.")}
          disabled={busy}
        />
      </Field>
      <Field config={whereField} htmlFor="meeting-where" className={fieldSpacing}>
        <Input
          id="meeting-where"
          value={values.location}
          onChange={(e) => setValues((s) => ({ ...s, location: e.target.value }))}
          placeholder={t("e.g. Their office, or a video call")}
          disabled={busy}
        />
      </Field>
      <Field config={agendaField} htmlFor="meeting-agenda" className={fieldSpacing}>
        <Notes
          key={open ? "open" : "shut"}
          // THE NAME A SCREEN READER READS. The `htmlFor` above lands the id on
          // the editable node itself, because the kit Field clones it onto its
          // single child — and this is the label that id could never carry, since
          // a label element's `for` attribute binds only to a labelable control
          // and the editable node here is a plain div. Same words as the visible
          // label, taken from the same config, so the two can never drift apart.
          aria-label={t(agendaField.label)}
          disabled={busy}
          defaultValue={values.agenda}
          onChange={(html) => setValues((s) => ({ ...s, agenda: html }))}
          placeholder={t("What we mean to cover.")}
          className="min-h-32"
        />
      </Field>
    </FormShellDialog>
  )
}
