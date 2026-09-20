"use client"

// Write-a-story dialog — one piece of work we do. Through the shared FormShell
// (Law R4) with a per-session draft (Law R7), like every other write in the base.
//
// THE APP COMES FIRST, and that is CHECKLIST 6.1 rather than a layout preference.
// Three of the fields below are NARROWED BY IT: the sprints are that app's, the
// open tickets are that app's, and the processes are that app's maps. Asking for
// the app last meant every one of those pickers offered the whole agency's
// inventory until the very field that could narrow them had been answered. First
// the system, then the work on it.
//
// AND THE EDIT SCREEN IS THIS SCREEN. The owner's standing rule — "any change to
// a form must be reflected in the edit screen unless he says otherwise" — is kept
// here by construction rather than by discipline: there is one dialog, `initial`
// decides whether it is a create or an edit, and both call sites hand it the same
// four option lists. A field added below appears on both, or on neither.
//
// WHAT IS ON IT NOW AND WHAT IS NOT:
//   • a TYPE, required (6.2) — Data · Tech · Bug · Feature · Change, editable
//     on the Choices screen. AS A HORIZONTAL PILL ROW WITH AN ICON since
//     16 Sep 2026 (client: "assign an icon to each type … when I'm editing
//     or creating, make it a horizontal pick") — same idiom as the staff row
//     below, `RecordPicker layout="row"`, icons from `shared/story-types.ts`;
//   • the SPRINT list, narrowed to that app and to blocks still worth putting
//     work into, each carrying its mark (6.3);
//   • "Request behind it" is now TICKETS (6.4), narrowed to that app and to the
//     ones still open — a resolved request is not something to hang new work on;
//   • the PROCESSES this work touches, one or more, with an explicit "it changes
//     none" that has to be CHOSEN rather than left blank (6.5, Aurora's ts4) — a
//     `Select` dropdown since 16 Sep 2026 (see the field's own note below for
//     the correction that kept it on this form at all);
//   • CATEGORY IS LAST, AND PREFILLED (16 Sep 2026 ruling): Client-requested
//     when this dialog was opened FROM a ticket (`fixedTicket` set), Internal
//     otherwise — "if it comes from a ticket, it's client requested. If it's
//     created from scratch, it's prefilled with internal." Still editable, and
//     still the two-pill row it already was;
//   • NO DUE DATE. A story is due when the block it was sold inside is due (3.15).

import * as React from "react"

import { LinkSimple, X } from "@shared/ui/foundations/icons"

import { Button } from "@shared/ui/components/button/button"
import { Checkbox } from "@shared/ui/components/checkbox/checkbox"
import { FileUpload } from "@shared/ui/components/file-upload/file-upload"
import { Label } from "@shared/ui/components/label/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/ui/components/select/select"
import { ToggleGroup, ToggleGroupItem } from "@shared/ui/components/toggle-group/toggle-group"
import { DialogDescription, DialogTitle } from "@shared/ui/components/dialog/dialog"
import { Field } from "@shared/web/field"
import { FactRow } from "@shared/web/fact-row"
import { Input } from "@shared/ui/components/input/input"
import { Notes } from "@shared/web/notes-editor/notes-editor"
import { toast } from "@shared/ui/components/sonner/sonner"
import { defaultFieldConfig } from "@shared/web/screen-engine/config"

import { ApiFailure, content as contentApi } from "@/lib/api"
import { storyAttachmentsKey } from "@/lib/live-resources"
import { pickerKey, searchTickets } from "@/lib/picker-sources"
import { RecordPicker } from "@/components/records/record-picker"
import { storyTypeIconName } from "@shared/story-types"
import { iconComponent } from "@shared/web/screen-engine/icon"
import type { PickableRecord } from "@/lib/pickable"
import { staffedOn, type PickablePerson } from "@/lib/members"
import { StaffPillPicker } from "@shared/web/staff-pill-picker"
import { FormShellDialog, fieldSpacing } from "@shared/web/form-shell"
import { readFileAsDataUrl } from "@shared/web/file"
import { primeCache, useCached } from "@shared/web/store"
import type { StoryAttachment } from "@shared/types"
import { TITLE_MAX_CHARS } from "@shared/types"
import { richTextValue } from "@shared/web/rich-text"
import { pickedFileId, storedFileToUploadItem, usePickedFileItems } from "@shared/web/upload-items"
import { useFormDraft } from "@shared/web/use-form-draft"
import { useLanguage } from "@shared/web/language"
import { sortedOptions } from "@shared/web/sorted-options"

export type StoryFormValues = {
  title: string
  detail: string
  sprintId: string
  /** THE SYSTEM THE WORK IS ON. A story hangs off an app ALWAYS and a sprint only
   * sometimes (the owner's ruling), so this is the field that says where the work
   * belongs — and the one every other picker on this form is narrowed by. */
  appId: string
  ticketId: string
  assigneeId: string
  /** Data / Tech / Bug / Feature / Change — required (CHECKLIST 6.2, client
   * ruling 15 Sep 2026). */
  storyType: string
  /** Client-requested / Enabler (the same ruling, "Internal" renamed 20 Sep
   * 2026) — required, defaults to Client-requested. An Enabler story must
   * name a ticket (`ticketId` above) — Aurora's ruling, same day. */
  category: string
  /** Every map this work touches (CHECKLIST 6.5). */
  processIds: string[]
  /** …or the explicit statement that it touches none. Aurora's ruling: it has to
   * be CHOSEN, not left blank, so the door refuses an empty list without it. */
  changesNoStep: boolean
  /** WHAT "DONE" LOOKS LIKE (Aurora's ruling, 20 Sep 2026: "same design as
   * Detail") — optional, rich text. */
  acceptanceCriteria: string
  /** MUST / SHOULD / COULD / WON'T (Aurora's ruling, 20 Sep 2026) — optional;
   * an empty string means "not set", the same convention every other
   * optional pick on this form already reads. */
  moscow: string
  /** DOES THIS STORY CONTRIBUTE TO ITS PHASE'S GOAL? (Aurora's ruling, 20 Sep
   * 2026, paired with the phase's own `goalSummary`.) Only meaningful once a
   * phase is chosen — the field below hides itself when `sprintId` is blank. */
  contributesToGoal: boolean
}

/** "Nothing chosen" as a real Select value: an empty string is not selectable in
 * the library's Select, so the absence of a sprint has to be a value of its own
 * rather than a blank the control silently rejects. */
const NONE = "__none__"

/** THE PROCESS DROPDOWN'S OWN "picked none of them" ANSWER — kept apart from
 * `NONE` above, which means "nothing chosen yet" on every other field on this
 * form. Here the two are different facts: `NONE` still means the Select has
 * nothing to show (the fresh, unanswered state — CHOOSING it is a no-op), and
 * this sentinel is the CHOICE Aurora's ruling asks for, ticked rather than
 * left blank. Conflating them would make "I haven't answered yet" and "I have
 * answered: none" the same value, which is exactly the ambiguity the door's
 * own `resolveProcesses` refuses (workers/content/src/lib/stories.ts). */
const PROCESS_NONE = "__changes_no_process__"

/** A sprint, with the mark CHECKLIST 6.3 asks for. Derived from the two facts the
 * row already carries rather than stored: a mark computed on the fly can never
 * disagree with the dates it came from. */
export type SprintOption = { id: string; name: string; mark: "Active" | "Upcoming" | "Completed" }

const appField = {
  ...defaultFieldConfig,
  label: "App",
  required: true,
}

/** THE SAME FIELD WITH NOTHING LEFT TO ASK. When the dialog is opened from an
 * app, the app is SETTLED and the control is replaced by the value — so the
 * `required` marker has to go with the control it belonged to. The kit draws
 * that marker as the word "Required", which is an instruction to the reader:
 * printed over a fact they cannot touch it tells them to do something that
 * cannot be done. The owner, 8 Sep 2026: "If I can't choose it or interact with
 * it, why show it?" Same reasoning as `workField`/`settledWorkField` in
 * time-form-dialog.tsx, which met this first. */
const settledAppField = { ...appField, required: false }
// R87 (title-length, RULES.md): every title field reads the one shared
// ceiling, so the marker, the counter and the door can never disagree about
// what "too long" means.
const titleField = {
  ...defaultFieldConfig,
  label: "What needs doing",
  required: true,
  validation: { ...defaultFieldConfig.validation, maxLength: TITLE_MAX_CHARS },
}
const typeField = {
  ...defaultFieldConfig,
  label: "Type",
  required: true,
}
/** WHERE THIS WORK CAME FROM — client ruling, 15 Sep 2026. Always answered
 * (defaults to Client-requested), so `required` here reads as "always has a
 * value" rather than "must be chosen" — the same sense `typeField` already
 * carries for a control that can never sit empty. */
const categoryField = {
  ...defaultFieldConfig,
  label: "Category",
  required: true,
}
const detailField = { ...defaultFieldConfig, label: "Detail", required: false }
// SAME DESIGN AS DETAIL (Aurora's ruling, 20 Sep 2026, verbatim): identical
// field shape, one line down.
const acceptanceCriteriaField = { ...defaultFieldConfig, label: "Acceptance criteria", required: false }
// MUST / SHOULD / COULD / WON'T (Aurora's ruling, 20 Sep 2026). PARKED,
// 21 Sep 2026 ("pause everything to do with moscow"). The field's own config
// and its rendered control moved to `moscow-field.tsx`, unmounted
// (`PARKED["work/moscow-field"]`); this form still carries `values.moscow`
// untouched, so an edit on an existing story keeps whatever priority it
// already had.
const sprintField = {
  ...defaultFieldConfig,
  label: "Phase",
  required: false,
}
// CONTRIBUTES TO THE GOAL (Aurora's ruling, 20 Sep 2026) — a plain checkbox,
// never required; only shown once a phase is chosen (render site, below).
const contributesToGoalField = { ...defaultFieldConfig, label: "Goal", required: false }
const ticketField = {
  ...defaultFieldConfig,
  label: "Tickets",
  required: false,
}
/** THE SAME FIELD, REQUIRED — Aurora's ruling, 20 Sep 2026, verbatim: "When a
 * story's origin is Enabler, must select a related ticket!" Read at render
 * time off `values.category` rather than baked into `ticketField` itself,
 * because whether this is required changes as somebody picks a different
 * category on the SAME open dialog. */
const enablerTicketField = { ...ticketField, required: true }
const processField = {
  ...defaultFieldConfig,
  label: "Processes",
  required: true,
}
const fileField = {
  ...defaultFieldConfig,
  label: "Something to show",
  required: false,
}
const assigneeField = { ...defaultFieldConfig, label: "Who's doing it", required: false }

export function StoryFormDialog({
  open,
  onOpenChange,
  teamId,
  sprints,
  apps,
  fixedApp,
  fixedTicket,
  tickets,
  members,
  appStaff,
  processes,
  storyTypes,
  categories,
  storyId,
  initial,
  draftKey,
  defaultAssigneeId,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The team whose tickets the request picker searches — tickets PAGE (R14), so
   * that one question goes to the door rather than to the loaded page. */
  teamId: string | null
  /** Every sprint the caller could pick, each tagged with which app it is on and
   * its mark. Narrowed to the CHOSEN app here rather than by the caller, so the
   * list updates as the person changes their mind about the app. */
  sprints: (SprintOption & { appId: string | null })[]
  apps: PickableRecord[]
  /** Set when the form is opened FROM an app's own screen — the app is then a
   * fact about where you are standing rather than a question, so the picker is
   * replaced by its name and cannot be changed by accident. */
  fixedApp?: { id: string; name: string }
  /** The same, from a TICKET's own Related stories tab: NEW work that answers
   * this request.
   *
   * READ THE VERB. This is not "turn this request into a piece of work" — that
   * control (and the prompt after triage) went on 17 Aug 2026 and is not coming
   * back, because a ticket never BECOMES a story. This is the other sentence,
   * which survives: a request may need several stories and a story may answer
   * several requests, so writing another one changes nothing about the ticket at
   * all. Removing the conversion took this create action with it by accident,
   * and it is the only way to get a request to triaged from its own record — so
   * if the two ever look like the same button again, they are not.
   *
   * Fixed rather than picked for the ordinary reason: the request behind the
   * work is a fact about where you are standing, and the one thing about a new
   * story nobody should be able to mistype. */
  fixedTicket?: { id: string; label: string }
  /** OPEN tickets only (6.4), each tagged with the app it is about. */
  tickets: { id: string; label: string; appId: string | null }[]
  members: PickablePerson[]
  /** WHO IS ON EACH APP (CHECKLIST 6.6) — app id → the staff user ids on it. The
   * assignee picker narrows to the chosen app's people, and the DOOR refuses
   * anybody else, so this is the courtesy half of a rule that is enforced on the
   * server. An app nobody has been staffed to narrows to nobody, so the picker
   * falls back to the whole team rather than becoming unusable — the same
   * fail-open the door takes, said in the same place. */
  appStaff: Map<string, string[]>
  /** The team's process maps, each tagged with the app it sits inside (6.5). */
  processes: { id: string; name: string; appId: string | null }[]
  /** The team's own `Story type` dropdown values (6.2). */
  storyTypes: string[]
  /** The team's own `Story category` dropdown values — Client-requested and
   * Internal as seeded, editable like every other vocabulary here (never a
   * hardcoded word, the same reason `storyTypes` is a prop and not a
   * constant). Drawn as a two-pill row rather than a picker: unlike Type
   * this is a genuinely SHORT, closed choice, and the kit's own segmented
   * control (`ToggleGroup`/`ToggleGroupItem`) is built for exactly "two to
   * four options that change how the same data is drawn." */
  categories: string[]
  /* `typeMarks` USED TO SIT HERE — the two-letter glyph beside each word, as
     a `Map<string, string>` a caller could pass instead of richer options.
     REMOVED 2026-09-16 for `help-form-dialog.tsx`'s own exact reason
     (see that file's identical note, dated 2026-09-07, for the ticket
     form's own version of this move): not one of this dialog's five call
     sites ever passed it (a census of all of them, not an absent grep — none
     of stories-screen.tsx, story-detail.tsx, sprint-detail.tsx,
     app-detail.tsx or help-detail.tsx did), and the Type field is now a
     `RecordPicker layout="row"` whose glyph is a real Phosphor icon
     (`shared/story-types.ts`, `PickerOption.icon`) rather than a two-letter
     text mark a caller could hand in. The glyph is not lost from the rest of
     the app: `web/lib/type-marks.ts` still supplies the team's OWN mark to
     any screen keyed on a story's word, this dialog just no longer accepts
     one nobody was sending. */
  /** THE STORY BEING EDITED, when this is an edit. Present here for one
   * reason: the file field below has to know where to hang what somebody
   * picked, and on an edit that is known before the submit rather than after
   * it. See `onSubmit` for the create half. */
  storyId?: string
  /** Present = editing an existing story. */
  initial?: StoryFormValues
  draftKey?: string
  /** THE SIGNED-IN USER, preselected on a new story — the client's ruling,
   * 15 Sep 2026: "always put the user preselected by default" everywhere staff
   * is picked. Read into the draft's own initial value (below), the same shape
   * `TaskFormDialog`'s own `defaultAssigneeId` already uses, so a reopened
   * draft keeps whatever was actually chosen rather than reverting to it.
   * `initial` wins on an EDIT — except where `initial.assigneeId` is itself
   * empty (an old story with no assignee on file), where this is the
   * fallback too: the 16 Sep 2026 ruling killed the picker's own "Nobody"
   * pill, so there is no state left for an edit to open on if the stored
   * value is blank.
   *
   * ALSO HANDED TO `staffedOn` BELOW (16 Sep 2026 correction, over this very
   * form: "on Add Story, I don't see myself preselected. Make sure you fix it
   * everywhere, not only here"). A picked-but-unstaffed app used to drop the
   * signed-in user from `assignable` along with everyone else not on that
   * app's rota — a stricter fate than "not assignable", since she was never
   * offered a pill to become unselected from. `staffedOn`'s own fourth
   * argument keeps her in the list regardless, so this id is always both the
   * preselected VALUE (below) and a real OFFERED pill. "" only when the
   * caller itself has no signed-in id yet (`myUserId ?? ""` at every call
   * site, session not loaded) — `staffedOn` treats that the same as
   * omitted. */
  defaultAssigneeId?: string
  /** RETURNS THE NEW STORY'S ID on a create, when the caller has one.
   *
   * An attachment needs a story to belong to, and on a create there is no
   * story until the submit returns — so the id comes back out rather than the
   * form guessing which row is new (rank ordering means the newest is not
   * reliably first). An edit already knows it, as `storyId`, and returns
   * nothing; the upload below reads whichever of the two it has. */
  onSubmit: (values: StoryFormValues) => Promise<string | void>
}) {
  const { t, lang } = useLanguage()
  const editing = initial !== undefined
  const [values, setValues, clearDraft] = useFormDraft(
    draftKey,
    initial
      ? // EDIT. The stored assignee wins — except where there is none, an old
        // row predating "an assignee is always somebody", which falls back to
        // the signed-in user the same as a create does (16 Sep 2026 ruling:
        // the picker itself can no longer draw an empty state at all).
        { ...initial, assigneeId: initial.assigneeId || (defaultAssigneeId ?? "") }
      : {
          title: "",
          detail: "",
          sprintId: "",
          appId: "",
          ticketId: "",
          assigneeId: defaultAssigneeId ?? "",
          storyType: "",
          // PREFILLED BY ORIGIN (client ruling, 16 Sep 2026): a ticket raised
          // it, so a story answering it traces back the same way; nothing did,
          // so it defaults to our own upkeep. `fixedTicket` IS "opened from a
          // ticket" — it is set at exactly the one call site that opens this
          // dialog off a ticket's own Related stories tab (help-detail.tsx)
          // — so it is the fact to read rather than a second flag saying the
          // same thing. Still an ordinary default: the field below stays
          // editable, same as `typeField`'s own "always answered" one field up.
          //
          // "INTERNAL" IS "ENABLER" NOW (20 Sep 2026 rename) — same default
          // logic, new word, and the new word carries a new requirement (an
          // Enabler needs a ticket, `ready` below), so a scratch create that
          // opens on this default is not submittable until a ticket is
          // picked or the category is switched — the ordinary shape of a
          // form whose default answer is not yet a complete one.
          category: fixedTicket ? "Client-requested" : "Enabler",
          processIds: [],
          changesNoStep: false,
          acceptanceCriteria: "",
          moscow: "",
          contributesToGoal: false,
        },
    open
  )
  const [busy, setBusy] = React.useState(false)
  // T3651/T3655 — the app is also a settled fact when the STORY arrives via a
  // ticket: `fixedTicket` names a real request, and that request is already
  // filed against one app (`tickets` carries it per row, same as `apps` gives
  // a name for it below). Without this, only the app's OWN screen resolved
  // `appId`, so opening this same dialog from a ticket left it blank until
  // somebody picked one by hand — the exact gap T3651 reported ("shows
  // processes from every app" from a ticket, "only 3" from the app itself, one
  // dialog answering the same question two different ways depending on where
  // it was opened).
  const ticketApp = fixedTicket
    ? (tickets.find((tk) => tk.id === fixedTicket.id)?.appId ?? null)
    : null
  const derivedApp =
    fixedApp ?? (ticketApp ? apps.find((a) => a.id === ticketApp) : undefined)
  const appId = derivedApp ? derivedApp.id : values.appId
  // THE THREE NARROWED LISTS. Everything with no app at all stays offered: an
  // unfiled sprint or a request nobody attributed yet is still a legitimate
  // answer, and hiding it would make the form unable to describe the data.
  const onThisApp = <T extends { appId: string | null }>(rows: T[]): T[] =>
    appId ? rows.filter((r) => r.appId === appId || r.appId === null) : rows
  const sprintOptions = onThisApp(sprints)
  const ticketOptions = onThisApp(tickets)
  const processOptions = onThisApp(processes)
  // WHO'S DOING IT, narrowed to the staff on the chosen app (CHECKLIST 6.6).
  // FAIL-OPEN on an app nobody is staffed to, exactly as the door does: a rule
  // that made the assignee un-pickable on precisely the apps nobody has been
  // assigned to would stop the work being recorded at all.
  //
  // THE TWO LINES THAT USED TO BE HERE ARE `staffedOn` NOW (lib/members,
  // 2026-09-06). The triage card asks the identical question of the identical
  // pair of lists — "who could pick this up?" — and the fail-open above is the
  // half that is easy to leave out of a second copy. It moved beside
  // `assignableMembers`, which is the seam that already decides WHICH people are
  // ours at all, for the reason that file's own header gives: a rule copied
  // twice is a rule that holds once.
  //
  // THE SIGNED-IN USER RIDES ALONG AS `staffedOn`'s FOURTH ARGUMENT (16 Sep
  // 2026 correction) — the same fail-open reasoning one level up: an app THAT
  // HAS staff, and simply does not name her, is not a reason to make her
  // un-offered either. `defaultAssigneeId` is read here rather than a second
  // prop, because it already names exactly the person this form treats as
  // "me": the preselected VALUE below and the guaranteed OFFERED pill are the
  // same fact, asked once. Recomputed on every render off the live `appId`
  // (derived above from `values.appId`), so picking a different app inside
  // this same open dialog can never drop her either — there is no snapshot of
  // "the staff list when the dialog opened" for her to fall out of.
  const assignable = staffedOn(members, appStaff, appId, defaultAssigneeId)
  // A story is describable once it has a name, a kind, and an answer about which
  // maps it changes — the same three the door insists on, so the button is never
  // enabled into a refusal.
  //
  // THE ENABLER RULE (Aurora's ruling, 20 Sep 2026) rides the same READY flag
  // rather than a separate disabled reason — the door's own refusal
  // (`refuseEnablerWithNoTicket`, workers/content/src/lib/stories.ts) is the
  // one place this is actually enforced; this only keeps the button from
  // being enabled into that exact refusal, `resolveProcesses`'s own reason
  // one field up. `fixedTicket` counts as a ticket — it is a real one, just
  // not editable on this form (see its own doc above).
  const effectiveTicketId = fixedTicket ? fixedTicket.id : values.ticketId
  const ready =
    values.title.trim() !== "" &&
    values.storyType !== "" &&
    (values.changesNoStep || values.processIds.length > 0) &&
    (values.category !== "Enabler" || effectiveTicketId !== "")

  // WHAT SOMEBODY PICKED, held until there is a story to hang it on.
  //
  // A developer reading a story needs to SEE the thing being described, and a
  // screenshot chosen while writing it is the moment they are most likely to
  // get one. The files wait here rather than riding the create payload because
  // R2 storage is addressed by story id, and on a create that id does not exist
  // until the door answers.
  const [pending, setPending] = React.useState<File[]>([])
  /** A pick that is in flight. Separate from `busy` (which means "the form is
   * submitting") because these are now two different waits and the person is
   * allowed to keep typing through this one. */
  const [uploading, setUploading] = React.useState(false)

  // …AND WHAT IT ALREADY CARRIES. The owner attached two screenshots here, saved,
  // reopened the form and saw an empty field — this form only ever ADDED, so on
  // an edit it described the story as having nothing on it. Half of his report is
  // that sentence; the other half is the Files and links tab beside this dialog.
  //
  // THROUGH THE PANEL'S OWN CACHE KEY, not a fetch of its own. One key means the
  // tab behind this dialog and the list inside it are the same list: attach here
  // and the tab has it when the dialog closes, take one off there and this field
  // never shows it. `null` on a create — there is no story to read yet, which is
  // the same reason `pending` exists at all.
  const attachedQ = useCached<StoryAttachment[]>(
    storyId ? storyAttachmentsKey(storyId) : null,
    () => contentApi.storyAttachments(storyId as string).then((r) => {
      primeCache(`total:${storyAttachmentsKey(storyId as string)}`, r.total)
      return r.attachments
    })
  )
  const attached = attachedQ.data ?? []
  // THE TILES THE FIELD BELOW DRAWS — client ruling, 17 Sep 2026: "I can
  // really see the images that I have already uploaded." Both halves feed
  // one grid, through the one shared seam every FileUpload call site now
  // builds its items with (shared/web/upload-items.ts): what the story
  // already carries (a served URL, safeSrc-checked) and what is still only
  // picked in this browser (an object URL, revoked when it is removed or
  // this dialog unmounts). A "link" attachment is not a file — `AttachmentPreview`
  // never previews one either — so only `kind === "file"` rows join the grid.
  const attachedFileItems = attached
    .filter((a) => a.kind === "file")
    .map((a) =>
      storedFileToUploadItem({ id: a.id, name: a.label, href: a.url, mime: a.contentType, size: a.sizeBytes })
    )
  const pendingItems = usePickedFileItems(pending)
  const fileTiles = [...attachedFileItems, ...pendingItems]

  /** Keep the one cache both this field and the tab read. */
  function keepAttached(target: string, r: { attachments: StoryAttachment[]; total: number }) {
    primeCache(storyAttachmentsKey(target), r.attachments)
    primeCache(`total:${storyAttachmentsKey(target)}`, r.total)
  }

  /** Take one off from in here. `work:update` gates the door, and this dialog is
   * only ever opened by somebody who holds it. */
  async function detach(attachmentId: string) {
    if (!storyId) return
    try {
      keepAttached(storyId, await contentApi.removeStoryAttachment(storyId, attachmentId))
    } catch (err) {
      toast.error(err instanceof ApiFailure ? err.message : t("Couldn't take that off."))
    }
  }

  /** ONE FILE AT A TIME, and a failure here never fails the story.
   *
   * The story is already written by the time this runs. Turning a rejected
   * upload into a thrown submit would close nothing, clear no draft, and tell
   * somebody their work was not saved when it was — so the toast names the
   * attachment and the story stands. */
  async function attach(target: string, files: File[]) {
    for (const file of files) {
      try {
        keepAttached(
          target,
          await contentApi.addStoryAttachment({
            id: target,
            kind: "file",
            label: file.name,
            fileDataUrl: await readFileAsDataUrl(file),
          })
        )
      } catch (err) {
        toast.error(err instanceof ApiFailure ? err.message : t("Couldn't attach that."))
      }
    }
  }

  /** WHAT HAPPENS THE MOMENT SOMEBODY PICKS A FILE.
   *
   * ON AN EDIT, IT UPLOADS NOW. The story exists, so there is nothing to wait
   * for — and waiting was actively losing files. The old shape deferred every
   * upload to the submit, which ran AFTER `onSubmit` had already fired its
   * "Story updated." toast, and held the dialog open until 4 MB of base64 had
   * gone up. The owner read the toast, saw a form still sitting there, and
   * force-reloaded three times; a reload during that window kills the request,
   * so there is no row, no bytes and no error — the success message was
   * literally causing the data loss it denied. Uploading on pick removes the
   * window rather than narrowing it. `review-dialog.tsx` has always done it this
   * way; this is the same shape, not a second one.
   *
   * ON A CREATE THERE IS STILL NOTHING TO HANG IT ON, so those files wait for
   * the id the submit hands back (R41). That half cannot be fixed here — R2 is
   * addressed by the story's id and the story does not exist yet. */
  async function pick(files: File[]) {
    if (!storyId) {
      setPending((f) => [...f, ...files])
      return
    }
    setUploading(true)
    try {
      await attach(storyId, files)
    } finally {
      setUploading(false)
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!ready) return
    setBusy(true)
    try {
      const madeId = await onSubmit({
        title: values.title.trim(),
        detail: richTextValue(values.detail),
        sprintId: values.sprintId,
        appId,
        ticketId: fixedTicket ? fixedTicket.id : values.ticketId,
        assigneeId: values.assigneeId,
        storyType: values.storyType,
        category: values.category,
        processIds: values.changesNoStep ? [] : values.processIds,
        changesNoStep: values.changesNoStep,
        acceptanceCriteria: richTextValue(values.acceptanceCriteria),
        moscow: values.moscow,
        contributesToGoal: values.contributesToGoal,
      })
      // THE FILES, ONCE THERE IS SOMETHING TO HANG THEM ON. `storyId` on an
      // edit, the id the create door just handed back otherwise.
      const target = storyId ?? (typeof madeId === "string" ? madeId : null)
      if (target && pending.length) await attach(target, pending)
      setPending([])
      clearDraft()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof ApiFailure ? err.message : t("Couldn't save the story."))
    } finally {
      setBusy(false)
    }
  }

  /** One picker, three times over — app, sprint, person. Each may be left empty,
   * which the door reads as "not set" rather than "cleared to nothing".
   *
   * All three are BOUNDED lists the screen already holds (a team's systems, the
   * sprints that are open, the staff on this app), so their search runs in the
   * browser and costs nothing. The REQUEST picker below is the odd one out: it
   * reads tickets, which page, so it asks the door instead. */
  const picker = (
    id: string,
    value: string,
    placeholder: string,
    searchPlaceholder: string,
    // `picture`/`shape`/`face` optional: the sprint call below passes none of
    // them, the APP call passes `picture`+`face` (its own logo, always a
    // mark — client ruling, 16 Sep 2026: "I want to see the icons of the
    // app … on the choice component"), and the PERSON one passes `picture`+
    // `shape` — a staff member's own face, on the closed control and in the
    // list, the way any Owner/Assignee field does (record-picker.tsx's
    // `shape: "round"` discriminator).
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
      title={<DialogTitle>{editing ? t("Edit story") : t("New story")}</DialogTitle>}
      subtitle={
        <DialogDescription>
          {editing
            ? t("Change what it says, who has it, or what it touches.")
            : t("One piece of work, on one app. Start with the app and the rest narrows to it.")}
        </DialogDescription>
      }
      submit={{
        busy: busy,
        disabled: !ready,
      }}
    >
      {/* FIRST, and everything below is narrowed by it (CHECKLIST 6.1). */}
      <Field
        config={derivedApp ? settledAppField : appField}
        htmlFor="story-app"
        className={fieldSpacing}
      >
        {derivedApp ? (
          // A FACT, NOT A CONTROL — shared/web/fact-row.tsx, the one shape
          // every settled parent value renders through on both front doors.
          <FactRow id="story-app" name={derivedApp.name} />
        ) : (
          picker(
            "story-app",
            values.appId,
            "No app yet",
            t("Search apps…"),
            // THE APP'S OWN LOGO (client, 16 Sep 2026). `face: true` so an app
            // with no logo on file still draws its own initial rather than a
            // blank row — the same flag `accountOption`/the ticket form's own
            // App row use for the identical reason (web/lib/pickable.ts).
            apps.map((a) => ({ id: a.id, label: a.name, picture: a.logoUrl, face: true })),
            (v) => setValues((s) => ({ ...s, appId: v }))
          )
        )}
      </Field>
      <Field
        config={titleField}
        htmlFor="story-title"
        className={fieldSpacing}
        count={values.title.length}
        countMax={TITLE_MAX_CHARS}
      >
        <Input
          id="story-title"
          value={values.title}
          onChange={(e) => setValues((s) => ({ ...s, title: e.target.value }))}
          placeholder={t("e.g. Move dispatch onto the driver app")}
          maxLength={TITLE_MAX_CHARS}
          disabled={busy}
          autoFocus
        />
      </Field>
      {/* A HORIZONTAL PICK, NOT A DROPDOWN (client ruling, 16 Sep 2026: "when
          I'm editing or creating, make it a horizontal pick") — the same
          `RecordPicker layout="row"` idiom the staff row below and the
          ticket form's own Type row already draw. Still required and still
          the team's own live words (`storyTypes`, never hardcoded); only the
          GLYPH beside each is code now (`storyTypeIconName` + `iconComponent()`,
          `PickerOption.icon` — a real node, not `typeMarks`' two-letter text,
          which is why this field no longer reads that prop). */}
      <Field config={typeField} htmlFor="story-type" className={fieldSpacing}>
        <RecordPicker
          id="story-type"
          layout="row"
          ariaLabel={t(typeField.label)}
          value={values.storyType}
          onChange={(v) => setValues((s) => ({ ...s, storyType: v }))}
          options={storyTypes.map((v) => {
            const iconName = storyTypeIconName(v)
            const Icon = iconName ? iconComponent(iconName) : null
            return { value: v, label: v, icon: Icon ? <Icon className="size-3.5" /> : undefined }
          })}
          searchPlaceholder={t("Search types…")}
          emptyText={t("Your team has no story types set up yet.")}
          disabled={busy}
        />
      </Field>
      <Field config={detailField} htmlFor="story-detail" className={fieldSpacing}>
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
          placeholder={t("What good looks like when it's finished.")}
          className="min-h-32"
        />
      </Field>
      {/* ACCEPTANCE CRITERIA — Aurora's ruling, 20 Sep 2026: "same design as
          Detail." The identical `Notes` editor, one field down. */}
      <Field config={acceptanceCriteriaField} htmlFor="story-acceptance-criteria" className={fieldSpacing}>
        <Notes
          key={open ? "open" : "shut"}
          aria-label={t(acceptanceCriteriaField.label)}
          disabled={busy}
          defaultValue={values.acceptanceCriteria}
          onChange={(html) => setValues((s) => ({ ...s, acceptanceCriteria: html }))}
          placeholder={t("What has to be true for this to count as done.")}
          className="min-h-32"
        />
      </Field>
      {/* THE SCREENSHOT, beside the words that describe it. On BOTH halves of
          this dialog, which the header above makes a rule: one field, one code
          path, and the upload simply knows a different id on an edit. */}
      <Field config={fileField} htmlFor="story-files" className={fieldSpacing}>
        <div className="flex flex-col gap-2">
          {/* A LINK STAYS A PLAIN LIST — the tile grid below is for FILES,
              and a link has no tile to become: `AttachmentPreview` never
              previews one either ("the kind decides, not the content
              type"). This dialog never creates one itself (`pick`/`attach`
              only ever send `kind: "file"`), but one can arrive on the same
              cache key from the story's own Files and links tab. */}
          {attached.some((a) => a.kind === "link") && (
            <ul className="divide-border divide-y rounded-[var(--radius)] bg-surface-panel">
              {attached
                .filter((a) => a.kind === "link")
                .map((a) => (
                  <li key={a.id} className="flex items-center gap-2 px-3 py-2">
                    <LinkSimple className="text-muted-foreground size-3.5 shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-sm">{a.label}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      aria-label={t("Take it off")}
                      disabled={busy || uploading}
                      onClick={() => void detach(a.id)}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </li>
                ))}
            </ul>
          )}
          {/* THE FILES THEMSELVES, AS TILES — client ruling, 17 Sep 2026.
              `fileTiles` is what the story already carries plus what is
              still only picked in this browser, both built through the one
              shared seam (shared/web/upload-items.ts). */}
          <FileUpload
            multiple
            files={fileTiles}
            onFilesSelected={(files) => void pick(files)}
            onRemove={(id) => {
              if (attached.some((a) => a.id === id)) void detach(id)
              else setPending((f) => f.filter((file) => pickedFileId(file) !== id))
            }}
            removeLabel={t("Take it off")}
            className={busy || uploading ? "pointer-events-none opacity-60" : undefined}
          />
        </div>
      </Field>
      <Field config={sprintField} htmlFor="story-sprint" className={fieldSpacing}>
        {picker(
          "story-sprint",
          values.sprintId,
          "No phase yet",
          t("Search phases…"),
          // THE MARK RIDES THE LABEL (CHECKLIST 6.3). A person picking a sprint is
          // choosing between "the one running now" and "the one starting in
          // October", and the two are otherwise two names.
          sprintOptions.map((s) => ({ id: s.id, label: `${s.name}, ${s.mark.toLowerCase()}` })),
          (v) => setValues((s) => ({ ...s, sprintId: v }))
        )}
      </Field>
      {/* CONTRIBUTES TO THE GOAL (Aurora's ruling, 20 Sep 2026), only offered
          once a phase is actually chosen — the flag means nothing against no
          phase at all, and unchecked-and-hidden is the honest default for a
          story with no phase rather than a control nobody can read. */}
      {values.sprintId && (
        <Field config={contributesToGoalField} shape="group" htmlFor="story-contributes-to-goal" className={fieldSpacing}>
          <div className="flex items-center gap-2">
            <Checkbox
              id="story-contributes-to-goal"
              checked={values.contributesToGoal}
              onCheckedChange={(c) => setValues((s) => ({ ...s, contributesToGoal: c === true }))}
              disabled={busy}
            />
            <Label htmlFor="story-contributes-to-goal" className="text-sm font-normal">
              {t("Contributes to the phase's goal")}
            </Label>
          </div>
        </Field>
      )}
      {/* REQUIRED WHEN THE ORIGIN IS ENABLER (Aurora's ruling, 20 Sep 2026) —
          `enablerTicketField`'s own doc says why this reads `values.category`
          rather than a static config. */}
      <Field
        config={values.category === "Enabler" ? enablerTicketField : ticketField}
        htmlFor="story-ticket"
        className={fieldSpacing}
      >
        {fixedTicket ? (
          <FactRow id="story-ticket" name={fixedTicket.label} />
        ) : (
          /* TICKETS PAGE (R14), so this one asks the DOOR — narrowed to the
             same app the rest of the form is narrowed to, which is what the
             in-memory `onThisApp` was doing over a loaded page. `ticketOptions`
             stays as the list painted before anything is typed. */
          <RecordPicker
            id="story-ticket"
            value={values.ticketId || NONE}
            onChange={(v) => setValues((s) => ({ ...s, ticketId: v === NONE ? "" : v }))}
            search={(term) => searchTickets(term, { appId: appId || undefined })}
            searchKey={pickerKey(`tickets:${appId || "any"}`, teamId)}
            options={sortedOptions(ticketOptions, lang, (o) => o.label).map((o) => ({ value: o.id, label: o.label }))}
            emptyOption={{ value: NONE, label: t("No ticket") }}
            placeholder={t("No ticket")}
            searchPlaceholder={t("Search tickets…")}
            emptyText={t("No ticket matched.")}
            disabled={busy}
          />
        )}
      </Field>
      {/* CHECKLIST 6.5. The tick is the explicit "no process" Aurora asked
          for: an empty list on its own is refused by the door
          (`resolveProcesses`, workers/content/src/lib/stories.ts), so a
          person cannot skip the question by not answering it.

          A DROPDOWN NOW, NOT A CHECKBOX LIST — CLIENT CORRECTION, 16 Sep
          2026, over an earlier draft of this exact change that had dropped
          the field from this form entirely ("this will come from somewhere
          else … definitely do not need to see it on the add or edit
          screen"): "stop the agent removing the processes from CRUD - keep
          it!! But make it a dropdown." So the field stays, both fields it
          always had stay (`processIds`, `changesNoStep`), and only the
          CONTROL changes — the kit's own `Select` (`shared/ui/components/
          select/select.tsx`), the same closed-list idiom every other
          single-pick dropdown in this app draws, in place of an
          always-expanded stack of checkboxes.

          RADIX SELECT COMMITS ONE VALUE PER OPEN, and "one or more
          processes" is still real (CHECKLIST 6.5's own words), so this
          Select is an ADD control rather than a value holder: picking a
          process appends it to `processIds` (skipping a duplicate) and
          picking "This changes no process" clears the list and ticks
          `changesNoStep`. The chosen set renders above as a removable list —
          the identical idiom this file already uses for `attached`/`pending`
          files a few fields up, not a new one. The Select's own displayed
          value stays on the sentinel that means "add a process": showing the
          last-picked item as if it were a single answer would say "one
          process" about a field that can hold several. */}
      <Field config={processField} htmlFor="story-processes" className={fieldSpacing}>
        <div className="flex flex-col gap-2">
          {!values.changesNoStep && values.processIds.length > 0 && (
            <ul className="divide-border divide-y rounded-[var(--radius)] bg-surface-panel">
              {values.processIds.map((id) => (
                <li key={id} className="flex items-center gap-2 px-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {processOptions.find((p) => p.id === id)?.name ?? id}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    aria-label={t("Take it off")}
                    disabled={busy}
                    onClick={() =>
                      setValues((s) => ({ ...s, processIds: s.processIds.filter((x) => x !== id) }))
                    }
                  >
                    <X className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <Select
            value={NONE}
            onValueChange={(v) => {
              if (v === NONE) return
              if (v === PROCESS_NONE) {
                setValues((s) => ({ ...s, changesNoStep: true, processIds: [] }))
                return
              }
              setValues((s) => ({
                ...s,
                changesNoStep: false,
                processIds: s.processIds.includes(v) ? s.processIds : [...s.processIds, v],
              }))
            }}
            disabled={busy}
          >
            {/* `aria-label` RATHER THAN LEANING ON THE FIELD'S OWN `htmlFor`
                — the same wall `detailField`'s Notes hits a few fields up,
                one layer further out: the kit Field clones its `id` onto
                its DIRECT child, which here is the wrapping `div` (the
                removable chip list needs somewhere to live beside the
                control), not this trigger — so the visible `<label for>`
                would bind to a plain `<div>` and this button would carry no
                accessible name at all. Named explicitly instead, off the
                same config the visible label reads. */}
            <SelectTrigger id="story-processes" aria-label={t(processField.label)}>
              <SelectValue placeholder={t("Add a process")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>{t("Add a process")}</SelectItem>
              <SelectItem value={PROCESS_NONE}>{t("This changes no process")}</SelectItem>
              {/* A→Z (R75) — the same `sortedOptions` seam every other picker on
                  this form reads its options through. */}
              {sortedOptions(processOptions, lang, (p) => p.name).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Field>
      <Field config={assigneeField} htmlFor="story-assignee" className={fieldSpacing}>
        {/* THE HORIZONTAL CHOICES, NOT THE DROPDOWN, preselected to the
            signed-in user on a new story — the client's ruling, 15 Sep 2026.
            `assignable` is `staffedOn`'s own fail-open list (see above),
            with the signed-in user kept in it even on an app whose own
            staffing does not name her (16 Sep 2026 correction — see the
            call above and `defaultAssigneeId`'s own comment). NO "Nobody"
            pill (16 Sep 2026 ruling) — an edit whose stored assignee is
            empty falls back to the signed-in user too, in the draft's own
            initial value above. */}
        <StaffPillPicker
          id="story-assignee"
          ariaLabel={t(assigneeField.label)}
          people={assignable.map((m) => ({ id: m.id, name: m.name, photo: m.photo }))}
          lang={lang}
          value={values.assigneeId}
          onValueChange={(v) => setValues((s) => ({ ...s, assigneeId: v }))}
          disabled={busy}
        />
      </Field>
      {/* MOSCOW, PARKED, 21 Sep 2026 ("pause everything to do with moscow,
          but remind me at later stages"). The field used to sit here, a
          segmented control over `values.moscow`; `moscow-field.tsx` carries
          it now, unmounted. `values.moscow` itself is untouched (see the
          note on `useFormDraft`'s own defaults, above), so this is silent on
          an edit, not a data loss. */}
      {/* CATEGORY, LAST AND PREFILLED — client ruling, 16 Sep 2026: "the
          client requested or internal should be at the very bottom and
          prefilled." Moved here from right after Type; the default (Client-
          requested opened from a ticket, Internal from scratch) is set once,
          in the draft's own initial value above, and this row only ever
          shows what that answered — still editable, still the two-pill row
          it always was. */}
      <Field config={categoryField} shape="group" htmlFor="story-category" className={fieldSpacing}>
        <ToggleGroup
          id="story-category"
          type="single"
          value={values.category}
          onValueChange={(v) => {
            // Radix's own contract: re-pressing the active segment reports an
            // empty string rather than leaving it selected. A required field
            // with a default is never genuinely empty, so that press is a
            // no-op instead of a value the door would refuse.
            if (v) setValues((s) => ({ ...s, category: v }))
          }}
          disabled={busy}
          aria-label={t("Category")}
        >
          {categories.map((c) => (
            <ToggleGroupItem key={c} value={c} disabled={busy}>
              {c}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Field>
    </FormShellDialog>
  )
}
