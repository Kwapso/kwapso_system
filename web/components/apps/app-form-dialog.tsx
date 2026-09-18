"use client"

// Record-an-app dialog — the system we built, the thing with its own address.
//
// The ACCOUNT is written once and never edited: moving an app to another client
// would silently republish its whole map, its savings and its conversation into
// somebody else's portal, so there is no move-app door and this is the only
// place it is decided.
//
// TWO FIELDS THIS FORM NO LONGER ASKS FOR, and the difference between them.
// The owner's ruling of 17 Aug 2026 took the ADDRESS off the form — an app's URL
// was one more thing to type at the moment somebody is trying to record that the
// app exists — and deferred WHAT IT COSTS US A MONTH to version two, in Aurora's
// own words: "it's a much more complex topic, not a single number".
//
// Both COLUMNS stay, and so do both values on this form's state. An app's monthly
// cost is an input to the agency's own margin (lib/internal-money.ts sums it),
// and a form that stopped asking for a number while still SENDING one would
// quietly zero every app it was used to edit. So `url` and `toolCostCentsPerMonth`
// ride through from `initial` untouched on an edit, and a newly recorded app
// simply starts without them.
//
// FormShell (R4) + a per-session draft (R7), like every other write.

import * as React from "react"

import { Checkbox } from "@shared/ui/components/checkbox/checkbox"
import { FileUpload } from "@shared/ui/components/file-upload/file-upload"
import { DialogDescription, DialogTitle } from "@shared/ui/components/dialog/dialog"
import { Field } from "@shared/web/field"
import { Label } from "@shared/ui/components/label/label"
import { Input } from "@shared/ui/components/input/input"
import { Notes } from "@shared/web/notes-editor/notes-editor"
import { Textarea } from "@shared/ui/components/textarea/textarea"
import { toast } from "@shared/ui/components/sonner/sonner"
import { defaultFieldConfig } from "@shared/web/screen-engine/config"

import { ApiFailure, tenancy } from "@/lib/api"
import { listFetch } from "@/lib/live-resources"
import { APP_STAGES, appStageDotTone, appStageMark } from "@shared/app-stages"
import { AppearancePillGroup } from "@shared/web/appearance-pill-group"
import { SELECTABLE_GROUPS } from "@shared/selectable-groups"
import type { SelectableValue } from "@shared/types"
import { pickerKey, searchAccounts } from "@/lib/picker-sources"
import { RecordPicker } from "@/components/records/record-picker"
import { accountOption, type PickableRecord } from "@/lib/pickable"
import type { PickablePerson } from "@/lib/members"
import { RecordMark } from "@shared/web/record-mark"
import { StaffPillPicker } from "@shared/web/staff-pill-picker"
import { FormShellDialog, fieldSpacing } from "@shared/web/form-shell"
import { richTextValue, safeSrc } from "@shared/web/rich-text"
import { fileToDataUrl } from "@/lib/image"
import { storedFileToUploadItem } from "@shared/web/upload-items"
import { useCached } from "@shared/web/store"
import { useFormDraft } from "@shared/web/use-form-draft"
import { useLanguage } from "@shared/web/language"
import { sortedOptions } from "@shared/web/sorted-options"

export type AppFormValues = {
  name: string
  accountId: string
  url: string
  stage: string
  /** THE CLIENT'S OWN MARK. A data URL on the way out of this form (the picker
   * downsizes it in the browser) and a `/media/...` path on the way back in,
   * because the door stores the bytes and keeps the path. */
  logoUrl: string
  /** whole cents a month — converted from the amount the form asks for */
  toolCostCentsPerMonth: number
  // THE FOUR CONTEXT FIELDS. They are on the form, not on a second "describe it"
  // screen, because the moment somebody records an app is the moment they know
  // the answers — a field asked for later is a field left empty.
  about: string
  clientContext: string
  solution: string
  keyActors: string
  // ── WHO IS ON IT ───────────────────────────────────────────────────────────
  // CHECKLIST 8.10 and 8.5, and they are asked HERE rather than on a second
  // screen for the same reason the four context fields are: the moment somebody
  // records an app is the moment they know who is on it. Three other asks were
  // blocked on the answer — my tickets (2.3), who a story goes to (6.6), and
  // who may press Done (6.10) — so a field deferred is three features deferred.
  staffUserIds: string[]
  /** one of `staffUserIds`, or empty. The door refuses a lead who is not on it. */
  leadUserId: string
  stakeholderContactIds: string[]
  /** one of `stakeholderContactIds`, or empty. Who a resolved ticket is mailed to. */
  mainStakeholderContactId: string
}

const nameField = { ...defaultFieldConfig, label: "What it's called", required: true }
const accountField = {
  ...defaultFieldConfig,
  label: "Whose system it is",
  required: false,
}
const stageField = { ...defaultFieldConfig, label: "Stage", required: false }
const logoField = {
  ...defaultFieldConfig,
  label: "Logo",
  required: false,
}
const aboutField = { ...defaultFieldConfig, label: "About", required: false }
const contextField = {
  ...defaultFieldConfig,
  label: "Account context",
  required: false,
}
const solutionField = { ...defaultFieldConfig, label: "Solution", required: false }
const actorsField = {
  ...defaultFieldConfig,
  label: "Key actors",
  required: false,
}
const staffField = {
  ...defaultFieldConfig,
  label: "Who is on it",
  required: false,
}
const leadField = {
  ...defaultFieldConfig,
  label: "Team lead",
  required: false,
}
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

/** The team's App stage vocabulary, newest answer first: the rows somebody has
 * curated on the Dropdown values screen, and the eight the agency already uses
 * as the fallback while that read is in flight or a team has retired the lot.
 * The mark rides the label, never the stored value — a stage is its WORD, and
 * the pictograph is a mark in an icon slot (UI-CONVENTIONS §5).
 *
 * EXPORTED, 15 Sep 2026 — the apps board (`apps-screen.tsx`) reads the exact
 * same team-ordered vocabulary for its Kanban columns, and a second read of
 * `selectable_data` with its own fallback would be the two-copies-that-drift
 * shape this file's own `ORDERED_OPTIONS_OK` entry already names once. */
export function useAppStages(teamId: string): { value: string; mark: string }[] {
  const valuesQ = useCached<SelectableValue[]>(`selectable:${teamId}`, () => listFetch.selectable(teamId))
  const rows = (valuesQ.data ?? [])
    .filter((v) => v.active && v.type === SELECTABLE_GROUPS.appStage)
    .map((v) => ({ value: v.value, mark: v.mark ?? appStageMark(v.value) }))
  return rows.length > 0 ? rows : APP_STAGES.map((s) => ({ value: s.name, mark: s.mark }))
}


export function AppFormDialog({
  open,
  onOpenChange,
  accounts,
  members,
  initial,
  draftKey,
  onSubmit,
  teamId,
  defaultStaffUserId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  accounts: PickableRecord[]
  /** the team, for the "who is on it" list (8.10). Every member is offerable —
   * staffing is not a permission, it is a rota. */
  members: PickablePerson[]
  /** Present = editing an existing app. The ACCOUNT picker disappears in that
   * mode rather than being disabled: whose system it is was decided once, there
   * is no door to change it, and a greyed-out control that can never be used is
   * a question the form should not be asking. */
  initial?: AppFormValues
  draftKey?: string
  onSubmit: (values: AppFormValues) => Promise<void>
  /** the team, so the stage picker can read the team's own vocabulary */
  teamId: string
  /** THE SIGNED-IN USER, preselected on a NEW app as both staff and lead —
   * client ruling, 15 Sep 2026: "always put the user preselected by default."
   * On an EDIT, `initial` wins for the staff list; the LEAD is different (see
   * `lead`, below the draft) because it must also be one of the staff — the
   * 16 Sep 2026 ruling that killed the picker's own "Nobody" pill means an
   * old app with no lead on file, or one whose lead was since unstaffed,
   * cannot be allowed to open the field with no pill pressed, so this is one
   * of the fallbacks `lead` tries. "" (the default) is a legitimate answer
   * (no session yet, or the caller has no opinion). */
  defaultStaffUserId?: string
}) {
  const { t, lang } = useLanguage()
  const editing = initial !== undefined
  const stages = useAppStages(teamId)
  const [values, setValues, clearDraft] = useFormDraft(
    draftKey,
    initial
      ? {
          name: initial.name,
          accountId: initial.accountId,
          url: initial.url,
          stage: initial.stage,
          logoUrl: initial.logoUrl,
          cost: initial.toolCostCentsPerMonth ? String(initial.toolCostCentsPerMonth / 100) : "",
          about: initial.about,
          clientContext: initial.clientContext,
          solution: initial.solution,
          keyActors: initial.keyActors,
          staffUserIds: initial.staffUserIds,
          leadUserId: initial.leadUserId,
          stakeholderContactIds: initial.stakeholderContactIds,
          mainStakeholderContactId: initial.mainStakeholderContactId,
        }
      : {
          name: "",
          accountId: "",
          url: "",
          // A STAGE IS NEVER EMPTY — the client's "kill the Nobody option"
          // instinct (16 Sep 2026), read for a stage rather than a person: a
          // new app starts at the FIRST word in the team's own ruled order,
          // never blank. `APP_STAGES[0]` rather than the literal "Not
          // started" — position 1 is the definition, the word is only today's
          // spelling of it (shared/app-stages.ts).
          stage: APP_STAGES[0].name,
          logoUrl: "",
          cost: "",
          about: "",
          clientContext: "",
          solution: "",
          keyActors: "",
          staffUserIds: defaultStaffUserId ? [defaultStaffUserId] : ([] as string[]),
          leadUserId: defaultStaffUserId ?? "",
          stakeholderContactIds: [] as string[],
          mainStakeholderContactId: "",
        },
    open
  )
  const [busy, setBusy] = React.useState(false)
  const ready = values.name.trim() !== ""
  // WHOSE PEOPLE THE STAKEHOLDER LIST IS — the account already on the app, or
  // the one being chosen. Read through the same door the account screen reads,
  // so "who is a contact here" has one answer in the app (the shape the ticket
  // form already has for the same question).
  const clientId = (editing ? initial.accountId : values.accountId) || null
  const contactsQ = useCached(clientId ? `account-detail:${clientId}` : null, () =>
    tenancy.accountDetail(clientId as string)
  )
  const contacts = (contactsQ.data?.links ?? [])
    .filter((l) => l.active)
    .map((l) => ({ id: l.personAccountId, name: l.personName }))
  /** A picked file becomes a data URL on the form, downsized in the browser
   * first — the same seam the account logo and the team logo use, so the body
   * that reaches the door is ~60 KB rather than a phone photo. */
  const pickLogo = async (files: File[]) => {
    if (!files[0]) return
    try {
      const dataUrl = await fileToDataUrl(files[0])
      setValues((s) => ({ ...s, logoUrl: dataUrl }))
    } catch {
      toast.error(t("Couldn't read that image. Try another one."))
    }
  }
  // The preview is either the file just picked (a `data:` URL that has not left
  // the browser) or the stored path the door minted, which goes through the URL
  // boundary like every other stored URL this app renders.
  const logoPreview = values.logoUrl.startsWith("data:") ? values.logoUrl : safeSrc(values.logoUrl)

  // WHO IS STAFFED, IN THE ORDER THE PICKER DRAWS THEM — shared by the fallback
  // below and the `people` list the Lead picker renders, so the two can never
  // disagree about who is even offered.
  const staffedInOrder = sortedOptions(members, lang, (m) => m.name).filter((m) =>
    values.staffUserIds.includes(m.id)
  )
  // A lead who has been unticked is no longer a lead — worked out on the fly so
  // the form can never send the pair the door would refuse. And since the 16
  // Sep 2026 ruling killed this picker's own "Nobody" pill, once ANYBODY is
  // staffed this can never come out empty: the ticked value first, then the
  // signed-in user if they are staffed, then whoever is first on the row —
  // so unstaffing a lead, or opening an old app with no lead on file, never
  // leaves the field with no pill pressed.
  const lead =
    (values.leadUserId && values.staffUserIds.includes(values.leadUserId) && values.leadUserId) ||
    (defaultStaffUserId && values.staffUserIds.includes(defaultStaffUserId) ? defaultStaffUserId : "") ||
    staffedInOrder[0]?.id ||
    ""
  const mainHolder = values.stakeholderContactIds.includes(values.mainStakeholderContactId)
    ? values.mainStakeholderContactId
    : ""

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!ready) return
    setBusy(true)
    try {
      // Whole units in, whole cents out. The form no longer ASKS for this, so on
      // a new app the amount is empty and lands as zero; on an edit it is the
      // app's existing cost, carried through the draft so saving a rename cannot
      // wipe a number nobody was shown.
      const amount = Number(values.cost.trim())
      await onSubmit({
        name: values.name.trim(),
        accountId: values.accountId,
        url: values.url.trim(),
        stage: values.stage.trim(),
        logoUrl: values.logoUrl,
        toolCostCentsPerMonth:
          values.cost.trim() !== "" && Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : 0,
        about: richTextValue(values.about),
        clientContext: richTextValue(values.clientContext),
        solution: richTextValue(values.solution),
        keyActors: values.keyActors.trim(),
        staffUserIds: values.staffUserIds,
        leadUserId: lead,
        stakeholderContactIds: values.stakeholderContactIds,
        mainStakeholderContactId: mainHolder,
      })
      clearDraft()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof ApiFailure ? err.message : t("Couldn't save the app."))
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
      title={<DialogTitle>{editing ? t("Edit app") : t("Record an app")}</DialogTitle>}
      subtitle={
        <DialogDescription>
          {editing
            ? t("Change what it's called, or where it has got to.")
            : t("A system we built for somebody. Processes live inside one.")}
        </DialogDescription>
      }
      submit={{
        busy: busy,
        disabled: !ready,
      }}
    >
      <Field config={nameField} htmlFor="app-name" className={fieldSpacing}>
        <Input
          id="app-name"
          value={values.name}
          onChange={(e) => setValues((s) => ({ ...s, name: e.target.value }))}
          placeholder={t("e.g. Dispatch")}
          disabled={busy}
          autoFocus
        />
      </Field>
      {!editing && (
      <Field config={accountField} htmlFor="app-account" className={fieldSpacing}>
        {/* The COMPANIES, asked of the door (accounts PAGE, R14). `accounts` is
            still passed in: the screen's own page one, painted while the first
            answer arrives, and where an app already on a client gets its name. */}
        <RecordPicker
          id="app-account"
          value={values.accountId}
          onChange={(v) => setValues((s) => ({ ...s, accountId: v }))}
          search={(term) => searchAccounts(term, { type: "entity" })}
          searchKey={pickerKey("companies", teamId)}
          options={sortedOptions(accounts, lang, (a) => a.name).map(accountOption)}
          placeholder={t("One of ours")}
          searchPlaceholder={t("Search companies…")}
          emptyText={t("No company matched.")}
          disabled={busy}
        />
      </Field>
      )}
      {/* STAGE IS A CHOICE, not a typed word. It was free text until 17 Aug 2026,
          which is how one inventory came to carry "live", "Live" and "in dev" for
          the same three systems.
          A HORIZONTAL PILL ROW, STILL — the shape stays (16 Sep 2026's first
          pass put it here), but it draws NO ICON any more: her correction the
          same day moved the icon vocabulary to Sprint type ("it's the sprint
          types that have an icon") and left App stage's own status HELD
          pending a fresh definition ("hold this until we define what the
          status is from the apps"). THAT DEFINITION LANDED 18 Sep 2026:
          "everywhere where choice component is status/stage add the points"
          — so each pill now carries `dot: appStageDotTone(s.value)`, the
          SAME tone map the apps board's own `Badge` already reads for this
          exact stage (`apps-screen.tsx`), never a second one. `AppearancePillGroup`
          (shared/web/appearance-pill-group.tsx) is the row the Appearance
          settings pills already draw; its `dot` slot is this picker's own
          reason to exist, the same way the Background pills use its
          `swatch` slot for a spine fill.
          NO "NOT SAID" PILL — the coordinator's own follow-up, 16 Sep 2026,
          the client's "kill the Nobody-style empties" instinct read for a
          stage: a stage is never blank. A new app defaults to `APP_STAGES[0]`
          above; an edit shows whatever is already stored, which can never be
          "" once creation no longer offers it.
          A RETIRED VALUE STILL SHOWS, INERT — an app already sitting in a
          stage migration 0097 deactivated (Completed, Documentation,
          Iteration, Maintenance) or one a team retyped by hand keeps
          reading that exact word (`shared/app-stages.ts`'s own header), so
          the picker appends it as one extra pill, disabled: it tells the
          truth about what is stored without offering it as a live pick —
          the same "show it, don't let it be chosen again" answer the
          disabled-pill shape gives everywhere else this form needed it. */}
      <Field config={stageField} shape="group" htmlFor="app-stage" className={fieldSpacing}>
        <AppearancePillGroup
          options={[
            ...stages.map((s) => ({
              value: s.value,
              label: t(s.value),
              dot: appStageDotTone(s.value),
            })),
            ...(values.stage && !stages.some((s) => s.value === values.stage)
              ? [{ value: values.stage, label: t(values.stage), dot: appStageDotTone(values.stage), disabled: true }]
              : []),
          ]}
          value={values.stage}
          onValueChange={(v) => setValues((s) => ({ ...s, stage: v }))}
          ariaLabel={t(stageField.label)}
          disabled={busy}
        />
      </Field>
      {/* THE MARK, IN THE SQUARE IT WILL APPEAR IN — ONLY ONCE THERE IS ONE.
          Client-reported on this exact dialog: "do not show the avatar on
          left when empty (makes no sense)". On a brand-new app, `logoPreview`,
          the stage mark AND the name are all still blank, so this used to draw
          an empty grey circle with nothing in it — not a placeholder standing
          for the record, a box standing for nothing. So the square is HIDDEN
          until there is a real picture to show, and appears the moment one is
          picked: "hide when empty, show when populated," never removed
          outright — the preview is still how a chosen file is confirmed
          before it uploads. A `data:` preview cannot pass `safeSrc` — it is
          not a stored URL and never leaves the browser — so it is named
          rather than checked, exactly as the account form does. */}
      <Field config={logoField} htmlFor="app-logo" className={fieldSpacing}>
        <div className="flex items-center gap-2">
          {logoPreview && (
            <span
              aria-hidden
              className="bg-muted grid size-12 shrink-0 place-items-center overflow-hidden rounded-[var(--radius)] text-2xl leading-none"
            >
              {/* FILL, NEVER FIT (R60, client 2026-09-09), and this is the site
                  where the ruling is easiest to argue AGAINST and still right.
                  The tempting exemption: a preview of a file somebody has just
                  picked and not yet uploaded should show them the file, whole,
                  so a crop cannot make them "fix" artwork that is fine. It reads
                  well and it is backwards. This box is a PREVIEW of the app's
                  mark, and that mark is an `AppMark` -> `RecordMark` everywhere
                  else in the product (the apps grid, the tiles, every picker
                  option, the ticket facets) — all of which now crop. A contained
                  preview would be the one place in the app that shows the logo
                  as it will NEVER appear again, which is the misleading version:
                  the person would approve a wordmark whole and meet its middle
                  third on the next screen. Same box, same crop, same size class
                  the mark uses, so what is confirmed here is what ships. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoPreview} alt="" className="size-full object-cover" />
            </span>
          )}
          {/* THE TILE GRID SHOWS THE SAME MARK THE BOX ABOVE DOES — client
              ruling, 17 Sep 2026 — through the one shared seam
              (shared/web/upload-items.ts) every FileUpload call site now
              feeds its items with. No `onRemove`: picking a new logo is the
              only action this field has ever offered. */}
          <FileUpload
            accept="image/*"
            multiple={false}
            files={
              logoPreview
                ? [storedFileToUploadItem({ id: "app-logo", name: t(logoField.label), href: logoPreview })]
                : []
            }
            onFilesSelected={pickLogo}
          />
        </div>
      </Field>
      <Field config={aboutField} htmlFor="app-about" className={fieldSpacing}>
        <Notes
          key={open ? "open" : "shut"}
          // THE NAME A SCREEN READER READS. The `htmlFor` above lands the id on
          // the editable node itself, because the kit Field clones it onto its
          // single child — and this is the label that id could never carry, since
          // a label element's `for` attribute binds only to a labelable control
          // and the editable node here is a plain div. Same words as the visible
          // label, taken from the same config, so the two can never drift apart.
          aria-label={t(aboutField.label)}
          disabled={busy}
          defaultValue={values.about}
          onChange={(html) => setValues((s) => ({ ...s, about: html }))}
          placeholder={t("What this system does, and for whom.")}
          className="min-h-32"
        />
      </Field>
      <Field config={contextField} htmlFor="app-client-context" className={fieldSpacing}>
        <Notes
          key={open ? "open" : "shut"}
          // THE NAME A SCREEN READER READS. The `htmlFor` above lands the id on
          // the editable node itself, because the kit Field clones it onto its
          // single child — and this is the label that id could never carry, since
          // a label element's `for` attribute binds only to a labelable control
          // and the editable node here is a plain div. Same words as the visible
          // label, taken from the same config, so the two can never drift apart.
          aria-label={t(contextField.label)}
          disabled={busy}
          defaultValue={values.clientContext}
          onChange={(html) => setValues((s) => ({ ...s, clientContext: html }))}
          placeholder={t("How they were working before, and what it was costing them.")}
          className="min-h-32"
        />
      </Field>
      <Field config={solutionField} htmlFor="app-solution" className={fieldSpacing}>
        <Notes
          key={open ? "open" : "shut"}
          // THE NAME A SCREEN READER READS. The `htmlFor` above lands the id on
          // the editable node itself, because the kit Field clones it onto its
          // single child — and this is the label that id could never carry, since
          // a label element's `for` attribute binds only to a labelable control
          // and the editable node here is a plain div. Same words as the visible
          // label, taken from the same config, so the two can never drift apart.
          aria-label={t(solutionField.label)}
          disabled={busy}
          defaultValue={values.solution}
          onChange={(html) => setValues((s) => ({ ...s, solution: html }))}
          placeholder={t("What we built, and the decisions behind it.")}
          className="min-h-32"
        />
      </Field>
      <Field config={actorsField} htmlFor="app-key-actors" className={fieldSpacing}>
        <Textarea
          id="app-key-actors"
          rows={2}
          value={values.keyActors}
          onChange={(e) => setValues((s) => ({ ...s, keyActors: e.target.value }))}
          placeholder={t("e.g. the two dispatchers, and whoever is on the counter")}
          disabled={busy}
        />
      </Field>
      {/* WHO IS ON IT (8.10) — THE HORIZONTAL CHOICES, NOT THE DROPDOWN, and not
          a checklist either (client ruling, 15 Sep 2026). `mode="multi"` is a
          `role="group"` row of pills with `aria-pressed`, preselected with the
          signed-in user on a new app (`defaultStaffUserId`, above). */}
      <Field config={staffField} shape="group" htmlFor="app-staff" className={fieldSpacing}>
        {members.length === 0 ? null : (
          <StaffPillPicker
            id="app-staff"
            mode="multi"
            ariaLabel={t(staffField.label)}
            people={members.map((m) => ({ id: m.id, name: m.name, photo: m.photo }))}
            lang={lang}
            value={values.staffUserIds}
            onValueChange={(ids) => setValues((s) => ({ ...s, staffUserIds: ids }))}
            disabled={busy}
          />
        )}
      </Field>
      {/* THE LEAD IS CHOSEN FROM THE PEOPLE ALREADY TICKED, and the field is not
          there until somebody is: a lead is one of the staff by definition, and
          a picker with nothing in it is a question with no possible answer.
          Once it IS there, `lead` (above) guarantees a pill is always pressed —
          NO "Nobody" pill (16 Sep 2026 ruling). */}
      {values.staffUserIds.length > 0 && (
        <Field config={leadField} htmlFor="app-lead" className={fieldSpacing}>
          <StaffPillPicker
            id="app-lead"
            ariaLabel={t(leadField.label)}
            people={staffedInOrder.map((m) => ({ id: m.id, name: m.name, photo: m.photo }))}
            lang={lang}
            value={lead}
            onValueChange={(v) => setValues((s) => ({ ...s, leadUserId: v }))}
            disabled={busy}
          />
        </Field>
      )}
      {/* THEIR CONTACTS (8.5), from the client's own contacts. Absent entirely on
          one of our own systems, which has no client to have contacts at. */}
      {clientId && (
        <Field config={stakeholderField} shape="group" htmlFor="app-stakeholders" className={fieldSpacing}>
          <div className="flex flex-col gap-2" id="app-stakeholders">
            {contacts.length === 0 ? null : (
              sortedOptions(contacts, lang, (c) => c.name).map((c) => (
                <Label key={c.id} className="flex">
                  <Checkbox
                    checked={values.stakeholderContactIds.includes(c.id)}
                    onCheckedChange={(ch) =>
                      setValues((s) => ({
                        ...s,
                        stakeholderContactIds:
                          ch === true
                            ? [...s.stakeholderContactIds, c.id]
                            : s.stakeholderContactIds.filter((x) => x !== c.id),
                      }))
                    }
                    disabled={busy}
                  />
                  {/* A CONTACT IS A PERSON (R35's "round" shape) — the same face
                      the Main stakeholder picker below draws them with. No photo
                      comes through `listAccountLinks` today, so this falls back
                      to their initial like every unphotographed person.
                      `size="choice"` — see the staff checklist's own `RecordMark`
                      comment above: the client called `row` (36px) "too big" on
                      this exact pair of checklists a second time, so both now
                      draw the 24px checklist size instead. */}
                  <RecordMark name={c.name} shape="round" size="choice" />
                  {c.name}
                </Label>
              ))
            )}
          </div>
        </Field>
      )}
      {values.stakeholderContactIds.length > 0 && (
        <Field config={mainStakeholderField} htmlFor="app-main-stakeholder" className={fieldSpacing}>
          <RecordPicker
            id="app-main-stakeholder"
            value={mainHolder || NOBODY}
            onChange={(v) =>
              setValues((s) => ({ ...s, mainStakeholderContactId: v === NOBODY ? "" : v }))
            }
            // A CONTACT IS A PERSON (R35's "round" shape), the same face
            // `StakeholdersPanel` already draws them with on the app's own
            // Stakeholders tab — no photo comes through `listAccountLinks`
            // today, so this falls back to their initial the way every
            // unphotographed person does, never to a client/company square.
            options={sortedOptions(contacts, lang, (c) => c.name)
              .filter((c) => values.stakeholderContactIds.includes(c.id))
              .map((c) => ({ value: c.id, label: c.name, shape: "round" as const }))}
            emptyOption={{ value: NOBODY, label: t("Not said") }}
            placeholder={t("Not said")}
            searchPlaceholder={t("Search contacts…")}
            emptyText={t("Nobody here matched.")}
            disabled={busy}
          />
        </Field>
      )}
    </FormShellDialog>
  )
}
