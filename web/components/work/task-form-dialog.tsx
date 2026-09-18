"use client"

// A PIECE OF OUR OWN ADMIN — the quarterly VAT return, a domain renewal, next
// week's review. Nobody outside the agency ever sees one, which is why this form
// has no Send in it. Through the shared FormShell (Law R4) with a per-session
// draft (Law R7).
//
// ── WHAT THE DEPARTMENT DECIDES ────────────────────────────────────────────────
//
// Picking a department REVEALS the second field it needs: Production names the
// app the work is on, Sales names the client it is for, Admin may name one. The
// field appears the moment the department is chosen rather than being discovered
// on save, which is the whole complaint — and the rule itself lives in
// shared/departments.ts, once, so what this form SHOWS and what the door
// REQUIRES cannot drift apart.
//
// ── WHY THE FILE IS NOT IN THE DRAFT ───────────────────────────────────────────
//
// The draft is session storage, and a 10 MB base64 attachment in session storage
// is a form that stops saving drafts at all. So the picked file lives in ordinary
// component state: reopening a half-finished task restores every word and asks
// for the file again, which is the honest half to lose.

import * as React from "react"

import { Checkbox } from "@shared/ui/components/checkbox/checkbox"
import { DatePicker } from "@shared/ui/components/date-picker/date-picker"
import { DialogDescription, DialogTitle } from "@shared/ui/components/dialog/dialog"
import { Field } from "@shared/web/field"
import { Input } from "@shared/ui/components/input/input"
import { Label } from "@shared/ui/components/label/label"
import { Notes } from "@shared/web/notes-editor/notes-editor"
import { toast } from "@shared/ui/components/sonner/sonner"
import { Plus } from "@shared/ui/foundations/icons"
import { defaultFieldConfig } from "@shared/web/screen-engine/config"
import { TITLE_MAX_CHARS } from "@shared/types"

import { FilePicker } from "@/components/records/file-picker"
import { ApiFailure } from "@/lib/api"
import { PRIORITY_LABEL, departmentAsks, departmentGlyph, priorityScore } from "@shared/departments"
import { pickerKey, searchAccounts } from "@/lib/picker-sources"
import { RecordPicker } from "@/components/records/record-picker"
import { accountOption, type PickableRecord } from "@/lib/pickable"
import { sortedOptions } from "@shared/web/sorted-options"
import { StaffPillPicker } from "@shared/web/staff-pill-picker"
import type { PickablePerson } from "@/lib/members"
import { FormShellDialog, fieldSpacing } from "@shared/web/form-shell"
import { richTextValue } from "@shared/web/rich-text"
import { dateFromYMD, ymdFromDate } from "@shared/web/format"
import { useFormDraft } from "@shared/web/use-form-draft"
import { useLanguage } from "@shared/web/language"

export type TaskFormValues = {
  title: string
  detail: string
  /** WHEN IT HAS TO BE DONE. Called Deadline everywhere a person reads it. */
  dueOn: string
  assigneeId: string
  department: string
  /** the second field, whichever one the department asked for */
  appId: string
  accountId: string
  important: boolean
  urgent: boolean
  /** the picked file, as a data URL — never held in the draft (see above) */
  fileDataUrl: string
  fileName: string
}

/** "Nothing chosen" as a real Select value: an empty string is not selectable in
 * the library's Select, so the absence of a department has to be a value of its
 * own rather than a blank the control silently rejects. */
const NONE = "__none__"

// R87 (title-length, RULES.md): every title field reads the one shared
// ceiling, so the marker, the counter and the door can never disagree about
// what "too long" means.
const titleField = {
  ...defaultFieldConfig,
  label: "What needs doing",
  required: true,
  validation: { ...defaultFieldConfig.validation, maxLength: TITLE_MAX_CHARS },
}
const detailField = { ...defaultFieldConfig, label: "Detail", required: false }
const dueField = { ...defaultFieldConfig, label: "Deadline", required: false }
const assigneeField = {
  ...defaultFieldConfig,
  label: "Who's doing it",
  required: false,
}
const departmentField = { ...defaultFieldConfig, label: "Department", required: false }
const fileField = { ...defaultFieldConfig, label: "A photo or a file", required: false }
const priorityField = { ...defaultFieldConfig, label: "How it ranks", required: false }

export function TaskFormDialog({
  open,
  onOpenChange,
  draftKey,
  teamId,
  members,
  apps,
  accounts,
  departments,
  defaultAssigneeId,
  initial,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  draftKey?: string
  /** the team whose clients the client picker searches — accounts PAGE (R14) */
  teamId: string | null
  members: PickablePerson[]
  apps: PickableRecord[]
  accounts: PickableRecord[]
  departments: string[]
  /** THE SIGNED-IN USER — a new task is theirs until they say otherwise, and
   * the 16 Sep 2026 ruling that killed the picker's own "Nobody" pill also
   * means this is the fallback on an EDIT whose stored `assigneeId` is empty
   * (an old row written before an assignee was required to be someone): see
   * the draft's own initial value below. The caller passes the signed-in
   * user either way — there is no longer a call site where this can be
   * omitted, because there is no longer a form state it would leave empty. */
  defaultAssigneeId: string
  /** THE TASK AS IT STANDS, when this form is CORRECTING one rather than writing
   * one. Absent = a new task. It arrived with the update door on 19 Aug 2026:
   * until then a task could be written and ticked and nothing else, so a typo was
   * permanent and — the one that mattered — the two ticks the priority score is
   * derived from were fixed at the moment somebody typed it. */
  initial?: TaskFormValues | null
  onSubmit: (values: TaskFormValues) => Promise<void>
}) {
  const { t, lang } = useLanguage()
  const [values, setValues, clearDraft] = useFormDraft(
    draftKey,
    initial
      ? // EDIT. The stored value wins — except where there is none, an old row
        // predating "an assignee is always somebody" (or this ruling's own
        // rollout), which falls back to the signed-in user the same as a
        // create does, so this form can never open on the one state its own
        // picker can no longer draw.
        { ...initial, assigneeId: initial.assigneeId || defaultAssigneeId }
      : {
          title: "",
          detail: "",
          dueOn: "",
          // THE DEFAULT THE TESTER ASKED FOR, in the draft's own initial value so it
          // survives a reopen: "if we don't assign a responsible when we create it
          // they're just gonna die in the unassigned folder."
          assigneeId: defaultAssigneeId,
          department: "",
          appId: "",
          accountId: "",
          important: false,
          urgent: false,
        },
    open
  )
  const [file, setFile] = React.useState<{ dataUrl: string; name: string } | null>(null)
  const [busy, setBusy] = React.useState(false)

  const asks = departmentAsks(values.department)
  const secondFieldMissing =
    asks.required &&
    ((asks.field === "app" && !values.appId) || (asks.field === "account" && !values.accountId))
  const ready = values.title.trim() !== "" && !secondFieldMissing

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!ready) return
    setBusy(true)
    try {
      await onSubmit({
        title: values.title.trim(),
        detail: richTextValue(values.detail),
        dueOn: values.dueOn,
        assigneeId: values.assigneeId,
        department: values.department,
        // Only the field the department actually asked for is sent — switching
        // from Production to Sales half-way through must not quietly file the
        // task under an app nobody can see on it.
        appId: asks.field === "app" ? values.appId : "",
        accountId: asks.field === "account" ? values.accountId : "",
        important: values.important,
        urgent: values.urgent,
        fileDataUrl: file?.dataUrl ?? "",
        fileName: file?.name ?? "",
      })
      clearDraft()
      setFile(null)
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof ApiFailure ? err.message : t("Couldn't add that task."))
    } finally {
      setBusy(false)
    }
  }

  /** One picker, three times over — person, department, app. Each may be left
   * empty, which the door reads as "not set" rather than "cleared". All three are
   * BOUNDED lists the screen already holds, so the search runs in the browser.
   * The CLIENT picker below is the odd one out: accounts page, so it asks the
   * door. */
  const picker = (
    id: string,
    value: string,
    placeholder: string,
    searchPlaceholder: string,
    // `picture`/`shape`/`face` optional: department below passes none of
    // them, the APP call passes `picture`+`face` (its own logo, always a
    // mark — client ruling, 16 Sep 2026: "I want to see the icons of the
    // app … on the choice component", the same fix story-form-dialog.tsx's
    // identical App field got), and the PERSON one passes `picture`+`shape`
    // — a staff member's own face, the way any Owner/Assignee field does
    // (record-picker.tsx's `shape: "round"` discriminator).
    options: { id: string; label: string; picture?: string | null; shape?: "square" | "round"; face?: boolean }[],
    set: (v: string) => void
  ) => (
    <RecordPicker
      id={id}
      value={value || NONE}
      onChange={(v) => set(v === NONE ? "" : v)}
      options={sortedOptions(options, lang, (o) => o.label).map((o) => ({ value: o.id, label: o.label, picture: o.picture, shape: o.shape, face: o.face }))}
      emptyOption={{ value: NONE, label: placeholder }}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      emptyText={t("Nothing matched.")}
      disabled={busy}
    />
  )

  return (
    <FormShellDialog
      open={open}
      onOpenChange={onOpenChange}
      busy={busy}
      onSubmit={submit}
      title={<DialogTitle>{t("New task")}</DialogTitle>}
      subtitle={<DialogDescription>{t("Our own admin. Time can be logged against it.")}</DialogDescription>}
      submit={{
        busy: busy,
        disabled: !ready,
        icon: <Plus className="size-4" />,
      }}
    >
      <Field
        config={titleField}
        htmlFor="task-title"
        className={fieldSpacing}
        count={values.title.length}
        countMax={TITLE_MAX_CHARS}
      >
        <Input
          id="task-title"
          value={values.title}
          onChange={(e) => setValues((s) => ({ ...s, title: e.target.value }))}
          placeholder={t("e.g. File the quarterly VAT return")}
          maxLength={TITLE_MAX_CHARS}
          disabled={busy}
          autoFocus
        />
      </Field>
      <Field config={detailField} htmlFor="task-detail" className={fieldSpacing}>
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
          className="min-h-32"
        />
      </Field>
      <Field config={assigneeField} htmlFor="task-assignee" className={fieldSpacing}>
        {/* THE HORIZONTAL CHOICES, NOT THE DROPDOWN — the client's ruling,
            15 Sep 2026, said of this exact field first ("On Add Task and
            generally absolutely everywhere..."). Preselected already: the
            draft's own initial value is `defaultAssigneeId` (above), so this
            row opens with the signed-in user's own pill selected on a new
            task, and an edit keeps the stored value (or, for an old row with
            none, the same signed-in-user fallback — see the draft's own
            initial value above). NO "Nobody" pill — 16 Sep 2026 ruling. */}
        <StaffPillPicker
          id="task-assignee"
          ariaLabel={t(assigneeField.label)}
          people={members.map((m) => ({ id: m.id, name: m.name, photo: m.photo }))}
          lang={lang}
          value={values.assigneeId}
          onValueChange={(v) => setValues((s) => ({ ...s, assigneeId: v }))}
          disabled={busy}
        />
      </Field>
      <Field config={departmentField} htmlFor="task-department" className={fieldSpacing}>
        {picker(
          "task-department",
          values.department,
          "No department",
          t("Search departments…"),
          departments.map((d) => ({ id: d, label: `${departmentGlyph(d)} ${d}`.trim() })),
          (v) => setValues((s) => ({ ...s, department: v, appId: "", accountId: "" }))
        )}
      </Field>
      {/* THE SECOND FIELD, revealed by the first. It appears when the department
          is chosen, not on save. */}
      {asks.field === "app" && (
        <Field
          config={{ ...defaultFieldConfig, label: "App", required: asks.required }}
          htmlFor="task-app"
          className={fieldSpacing}
        >
          {picker(
            "task-app",
            values.appId,
            "Which app is it on?",
            t("Search apps…"),
            // THE APP'S OWN LOGO (client, 16 Sep 2026), `face: true` so an
            // app with no logo on file still draws its own initial rather
            // than a blank row — `accountOption` below already does this
            // for the account half of the same ruling.
            apps.map((a) => ({ id: a.id, label: a.name, picture: a.logoUrl, face: true })),
            (v) => setValues((s) => ({ ...s, appId: v }))
          )}
        </Field>
      )}
      {asks.field === "account" && (
        <Field
          config={{
            ...defaultFieldConfig,
            label: "Account",
            required: asks.required,
          }}
          htmlFor="task-account"
          className={fieldSpacing}
        >
          {/* ACCOUNTS PAGE (R14), so this one asks the door. `accounts` is the
              screen's own page one, painted before anything is typed. */}
          <RecordPicker
            id="task-account"
            value={values.accountId || NONE}
            onChange={(v) => setValues((s) => ({ ...s, accountId: v === NONE ? "" : v }))}
            search={(term) => searchAccounts(term)}
            searchKey={pickerKey("accounts", teamId)}
            options={sortedOptions(accounts, lang, (a) => a.name).map(accountOption)}
            emptyOption={{ value: NONE, label: t("Which account is it for?") }}
            placeholder={t("Which account is it for?")}
            searchPlaceholder={t("Search accounts…")}
            emptyText={t("No account matched.")}
            disabled={busy}
          />
        </Field>
      )}
      <Field config={dueField} htmlFor="task-due" className={fieldSpacing}>
        <DatePicker
          id="task-due"
          mode="date"
          locale={lang}
          value={dateFromYMD(values.dueOn)}
          onValueChange={(d) => setValues((s) => ({ ...s, dueOn: ymdFromDate(d) }))}
          disabled={busy}
        />
      </Field>
      {/* THE EISENHOWER PAIR. Two ticks, not a high/medium/low word: "important"
          and "urgent" are different questions and the old picker asked one. The
          line underneath says which of the four the two ticks make, so nobody has
          to know the arithmetic to use it. */}
      <Field config={priorityField} shape="group" htmlFor="task-important" className={fieldSpacing}>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="task-important"
              checked={values.important}
              onCheckedChange={(c) => setValues((s) => ({ ...s, important: c === true }))}
              disabled={busy}
            />
            <Label htmlFor="task-important" className="text-sm font-normal">
              {t("Important, it moves something that matters")}
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="task-urgent"
              checked={values.urgent}
              onCheckedChange={(c) => setValues((s) => ({ ...s, urgent: c === true }))}
              disabled={busy}
            />
            <Label htmlFor="task-urgent" className="text-sm font-normal">
              {t("Urgent, it has to happen soon")}
            </Label>
          </div>
          <p className="text-muted-foreground text-xs">
            {`${t("Priority")} ${priorityScore(values.important, values.urgent)} · ${t(
              PRIORITY_LABEL[priorityScore(values.important, values.urgent)]
            )}`}
          </p>
        </div>
      </Field>
      <Field config={fileField} htmlFor="task-file" className={fieldSpacing}>
        <FilePicker
          id="task-file"
          value={file ? file.name : ""}
          onChange={(v) => {
            if (!v) setFile(null)
          }}
          // NOT AN UPLOAD DOOR OF ITS OWN. The bytes ride the create call, which
          // is the same shape a to-do's attachment uses — one door, one gate, one
          // cap, and nothing orphaned in a bucket if the form is abandoned.
          upload={async (dataUrl, fileName) => {
            setFile({ dataUrl, name: fileName })
            return fileName
          }}
          disabled={busy}
        />
      </Field>
    </FormShellDialog>
  )
}
