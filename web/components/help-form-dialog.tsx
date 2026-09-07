"use client"

// Ticket form dialog — raise a NEW ticket, or EDIT one (when `initial` is present).
// Description is required. Type and "Raised by" are optional and are LINES OF
// CHIPS, not dropdowns (the client, 2026-09-07) — the type's words come from the
// team's own "Ticket type" dropdown values (selectable_data), the people from the
// chosen client's own contacts. Every member can see every ticket (the My/All
// tabs are just a raiser filter), so there's no audience picker.
// Library primitives.
//
// WHO IT IS FOR. A staff ticket may NAME the client it is raised on behalf of, and
// that is the field this form was missing: the door has accepted `accountId` from a
// staff caller since the customer spine landed, and the machine surface has offered
// it all along (`create_help_ticket`, whose own note says that without it "a machine
// can only raise tickets that no client will ever see") — while the screen offered
// no way to say it at all. So every ticket typed in the agency app belonged to
// nobody, and never appeared in the portal of the company that asked for it.
//
// It is SET ONCE. A ticket that already carries a client cannot be moved to another
// (lib/help.ts `updateTicket` refuses with `account_fixed`), because moving it would
// hand a conversation, replies and all, to strangers. So on a ticket that already
// has one the picker is replaced by the client's name — the same shape the sprint
// form uses for a fixed app, and for the same reason: a control that can only be
// refused should not be a control.
//
// A PORTAL caller never reaches this form. Theirs is web-portal's own
// raise-ticket-dialog, which has no picker and needs none — `createTicket` takes a
// client's account from the guard corridor and never consults the body.

import * as React from "react"

import {
  DialogDescription,
  DialogTitle,
} from "@shared/ui/components/dialog/dialog"
import { Button } from "@shared/ui/components/button/button"
import { FileUpload } from "@shared/ui/components/file-upload/file-upload"
import { Input } from "@shared/ui/components/input/input"
import { Paperclip, X } from "@shared/ui/foundations/icons"
import { Field } from "@shared/web/field"
import { FormShellDialog, fieldSpacing } from "@shared/web/form-shell"
import { richTextValue } from "@shared/web/rich-text"
import { Notes } from "@shared/web/notes-editor/notes-editor"
import { toast } from "@shared/ui/components/sonner/sonner"
import { defaultFieldConfig } from "@shared/web/screen-engine/config"

import { ApiFailure, content, tenancy } from "@/lib/api"
import { appModulesKey, appsKey, listFetch } from "@/lib/live-resources"
import { pickerKey, searchAccounts } from "@/lib/picker-sources"
import { useFormDraft } from "@shared/web/use-form-draft"
import { useCached } from "@shared/web/store"
import { ManageDropdownsLink } from "@/components/manage-dropdowns-link"
import { RecordPicker } from "@/components/record-picker"
import { NEUTRAL_TYPE_COLOUR, orderTicketTypes, ticketTypeColour } from "@/lib/type-colours"
import { appStageMark } from "@shared/app-stages"
import { ticketTypeKeptForMigration } from "@shared/types"
import type { AppModule, AppRow } from "@shared/types"
import { readFileAsDataUrl } from "@shared/web/file"
import { useT } from "@shared/web/language"

/** THE TICKET'S NAME, and the first time this form has offered one.
 *
 * `title_en` is not a new column — it has been on the row since the Glide
 * import, `updateTicket` and the create door both accept it, `help-detail`
 * shows it and `ticketTitle` reads it first. Only the FORM never asked, so
 * every ticket raised through this app fell to the last resort in that chain:
 * the first eighty characters of the description, shown above the paragraph it
 * was cut from. The card was repeating itself because nothing else existed.
 *
 * OPTIONAL, because that fallback still works and always will — 788 imported
 * tickets have no English title and a portal caller still cannot send one. A
 * required field here would refuse tickets the door accepts. */
const titleField = { ...defaultFieldConfig, label: "Title", required: false }
/** THE PARAGRAPH, AND IT IS CALLED WHAT IT IS.
 *
 * CLIENT, 2026-09-07: "remove the 'what do you need help with'" — and, two
 * lines later in the same list, "6. Description". So the question is not
 * deleted, it is RENAMED to the word she used, which is also the word the rest
 * of the app already uses for the same thing (`Description` is a field label on
 * the module form, the app form and the story form, and it is already in the
 * catalogue in all three languages — so this rename costs no translation).
 *
 * THE QUESTION SURVIVES AS THE PLACEHOLDER. "What do you need help with?" was
 * doing two jobs — naming the field and telling somebody what to type — and only
 * the first is being taken off it. The worked example underneath ("e.g. I can't
 * invite a new member, the button is greyed out") already says the second thing
 * better, in the box, where a person is looking when they need it, and it is
 * left exactly as it was. A label that asks a question is also the one label
 * shape that cannot be reused: every other field on this form is a NOUN, and a
 * column of nouns with one question in it reads as a form that changed its mind
 * halfway down. */
const descField = { ...defaultFieldConfig, label: "Description", required: true }
const typeField = { ...defaultFieldConfig, label: "Type", required: false }
const accountField = {
  ...defaultFieldConfig,
  label: "Client",
  required: false,
  hint: "The company this is for. Their contacts see it in their portal; leave it off for our own questions.",
}
// CHECKLIST 5.8 and 5.9. Neither is `required: true` on the FORM, and that is
// deliberate rather than a shortcut: the agency's own housekeeping questions are
// about no system and were raised by nobody outside the building, so a hard
// requirement here would make the internal ticket unraisable. What the two fields
// change is that a client's ticket can finally SAY which app it is about and who
// asked, which is what routes it and who gets told when it is answered.
const appField = {
  ...defaultFieldConfig,
  label: "App",
  required: false,
  hint: "Which system this is about. It is what routes the request and who gets told when it is answered.",
}
// WHICH SECTION OF IT (Aurora, 19 Aug 2026). It sits directly under the app
// because it is meaningless without one, and the hint says so rather than
// leaving somebody to discover it by finding the list empty.
// REQUIRED, BUT ONLY WHERE IT CAN BE ANSWERED — and the two exceptions are not
// softenings of the rule, they are the rule staying true.
//
// Aurora asked for it required and 94% of the legacy tickets carried one, so the
// default is required. But a ticket about NO APP has no section to name — the
// agency's own housekeeping questions are exactly that, and the app field is
// optional for the same reason ("a hard requirement here would make the internal
// ticket unraisable"). And an app whose modules nobody has written down yet has
// nothing to offer, so requiring one would be a door with no handle.
//
// So: required once an app with modules is chosen, and silent otherwise. It
// tightens by itself as the apps get their sections written down, which is the
// opposite of a rule somebody has to remember to switch on.
const moduleField = (required: boolean) => ({
  ...defaultFieldConfig,
  label: "Module",
  required,
  hint: "Which part of the app it is about, like Settings or Documents. Choose the app first.",
})
const contactField = {
  ...defaultFieldConfig,
  label: "Raised by",
  required: false,
  hint: "The person at that client who asked. Not always whoever types it in.",
}

// Radix Select can't hold an empty value, so "no type" uses a sentinel.
const NONE = "__none__"

/** THE SCREENSHOT FIELD. Same words as the story form's, because it is the same
 * act and a second phrasing would be a second idea. */
const fileField = {
  ...defaultFieldConfig,
  label: "Something to show",
  required: false,
  hint: "A screenshot, a recording, a document somebody can open.",
}

export function HelpFormDialog({
  open,
  onOpenChange,
  onSubmit,
  helpTypeOptions,
  fixedApp,
  initial,
  draftKey,
  teamId,
  helpId,
  canAttach = true,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (input: {
    titleEn?: string
    description: string
    helpType?: string
    accountId?: string
    appId?: string
    moduleId?: string
    raisedByContactId?: string
    /** RETURNS THE NEW TICKET'S ID on a create, when the caller has one.
     *
     * An attachment needs a ticket to belong to, and on a create there is no
     * ticket until the door answers — so the id comes back out rather than the
     * form guessing which row is new (the list is drag-ranked, so the newest is
     * not reliably first). An edit already knows it, as `helpId`. */
  }) => Promise<string | void>
  /** The team's active "Ticket type" dropdown values. */
  helpTypeOptions: string[]
  /* `typeMarks` USED TO SIT HERE — the two-letter glyph beside each word, as a
     `Map<string, string>` a caller could pass instead of richer options. It is
     gone as of 2026-09-07 rather than left accepted-and-ignored, and the reason
     is that BOTH halves of it stopped being true on the same day: not one of
     this dialog's five call sites ever passed it (a census of all of them, not
     an absent grep), and the control it fed is now a line of chips whose mark is
     the type's COLOUR — the client's own ruling, "horizontal chips with the
     color". `RowChip` draws a picture or a glyph in PREFERENCE to a swatch, so a
     prop nobody passed would have silently replaced the four colours she asked
     for with two-letter codes the first time somebody did pass it. The glyph is
     not lost: `web/lib/type-marks.ts` still supplies it to the tab strip, the
     list rows and the ticket's own header band, which is where a code is read
     rather than compared. */
  /** Set when the form is opened FROM an app's own screen — the system the
   * request is about is then a fact about where you are standing rather than a
   * question, so the picker is replaced by its name. Separate from `initial`,
   * which means EDIT: this is a create with one field already answered, and
   * folding the two together would make a new ticket claim to be an edit. */
  fixedApp?: { id: string; name: string }
  /** Present = EDIT mode (prefilled). */
  initial?: {
    titleEn?: string | null
    description: string
    helpType?: string | null
    accountId?: string | null
    appId?: string | null
    moduleId?: string | null
    raisedByContactId?: string | null
  }
  /** stable id for per-session draft persistence (CACHING.md §11); omit to disable */
  draftKey?: string
  /** active team — drives the gated "Manage dropdowns" link */
  teamId?: string | null
  /** THE TICKET BEING EDITED, when one is. Attachments hang off it; on a create
   * the id arrives from `onSubmit`'s answer instead. */
  helpId?: string
  /** Whether this person may attach at all. The door gates on `help:edit`, so a
   * control that always refused would be worse than none. */
  canAttach?: boolean
}) {
  const t = useT()
  const isEdit = !!initial
  // THE CLIENT PICKER ASKS THE DOOR, and page one is exactly why. This used to
  // read `accountsKey(teamId)` — the accounts LIST cache, whose fetcher primes a
  // cursor, because accounts is a GROWING_COLLECTIONS row (R14). So the picker
  // offered the newest fifty companies and had no opinion about the rest, which
  // is the owner's own report from a phone: "not all clients or contacts are
  // showing per account". `searchAccounts` puts the question to the accounts
  // door's `q`, the same door and the same gate the accounts screen reads.
  //
  // The apps this ticket could be about stay a loaded list: apps are BOUNDED (a
  // team's systems, not a feed), so the browser can match them for nothing.
  const appsQ = useCached<AppRow[]>(teamId ? appsKey(teamId) : null, () =>
    listFetch.apps(teamId as string)
  )
  // EVERY MODULE THE TEAM HAS, narrowed below to the app in hand. One bounded
  // read held whole, so changing the app above re-filters instantly instead of
  // putting a spinner inside a form somebody is halfway through.
  const modulesQ = useCached<AppModule[]>(teamId ? appModulesKey(teamId) : null, () =>
    tenancy.appModules().then((r) => r.modules)
  )
  const initialValues = {
    titleEn: initial?.titleEn ?? "",
    description: initial?.description ?? "",
    helpType: initial?.helpType || NONE,
    accountId: initial?.accountId || NONE,
    appId: initial?.appId || fixedApp?.id || NONE,
    moduleId: initial?.moduleId || NONE,
    raisedByContactId: initial?.raisedByContactId || NONE,
  }
  // Per-session draft: restores what you typed if you navigate away and reopen.
  const [values, setValues, clearDraft] = useFormDraft(draftKey, initialValues, open)
  const [busy, setBusy] = React.useState(false)
  /** WHAT SOMEBODY PICKED, held until there is a ticket to hang it on.
   *
   * THE OWNER, 26 Aug 2026: "add the ability to attach screenshots and files to
   * tickets while adding or editing them, just like we have at the story level."
   *
   * The doors have existed since attachments shipped — the detail screen has a
   * Files and links tab reading them — but the FORM never offered one, so the
   * moment a person is most likely to have the screenshot in hand (while
   * describing the fault) was the one moment they could not add it.
   *
   * They wait here rather than riding the create payload because storage is
   * addressed by ticket id, and on a create that id does not exist until the
   * door answers. Deliberately NOT in the draft: a File cannot be serialised
   * into sessionStorage, and a draft that silently dropped them would be worse
   * than one that never held them. */
  const [pending, setPending] = React.useState<File[]>([])
  React.useEffect(() => {
    if (!open) setPending([])
  }, [open])
  // WHICH CLIENT THE CONTACT LIST BELONGS TO — the one already on the ticket, or
  // the one being picked. Read from the same door the account screen reads, so
  // "who is a contact here" has one answer in the app.
  const chosenAccountId = initial?.accountId ?? (values.accountId === NONE ? null : values.accountId)
  // WHICH APP THE MODULE LIST BELONGS TO — the one pinned by the screen this
  // form was opened from, or the one being picked.
  const chosenAppId = fixedApp?.id ?? (values.appId === NONE ? null : values.appId)
  const appModules = (modulesQ.data ?? []).filter((m) => m.active && m.appId === chosenAppId)
  // Only demanded once there is something to demand — see `moduleField`.
  const moduleRequired = Boolean(chosenAppId) && appModules.length > 0
  const moduleMissing = moduleRequired && values.moduleId === NONE
  const detailQ = useCached(chosenAccountId ? `account-detail:${chosenAccountId}` : null, () =>
    tenancy.accountDetail(chosenAccountId as string)
  )
  // The client already on the ticket — the one value on this form that is a fact
  // rather than a question, because the door will refuse any attempt to change
  // it. Its NAME now comes from the account's own record rather than from a page
  // of the list: the detail is already being read for the contacts below it, and
  // a company past page one used to be shown to its own ticket as "this client".
  const fixedAccount = initial?.accountId
    ? { id: initial.accountId, name: detailQ.data?.account.name ?? t("this client") }
    : null

  /* ── THE TYPE CHIPS ────────────────────────────────────────────────────────
     CLIENT, 2026-09-07: "The type: I also don't want it as a dropdown, but I
     want it as horizontal chips with the color, in the order that we
     predetermine. Remember, with issue first."

     Three separate rulings in one sentence, and all three already have a home
     in this codebase, which is why none of them is decided here:

       · THE SHAPE is `RecordPicker layout="row"` — the chip line she approved
         on the triage card the day before, on the SAME vocabulary. A second
         chip row written by hand here would be the two drifting apart by the
         end of the month; `TriageChips` and this field are now one component
         drawing one list.
       · THE ORDER is `orderTicketTypes` (issue, question, request, extra, then
         anything the order has never heard of, in the order it arrived) —
         `web/lib/type-colours.ts` holds it for every chart, the tab strip and
         the list's own facet, and its header explains at length why a fifth
         type is one line there rather than a decision on five screens. "Issue
         first" is that function's first element and this call site does not
         restate it.
       · THE COLOUR is `ticketTypeColour`, which resolves through the CHART
         SERIES rather than the raw palette (R32; the same file argues it out).
         It is drawn as `swatch` — a small dot before the word — and never as a
         `mark`: a 24px filled box with no content reads as a picture that
         failed to load, and the word beside the dot is what actually carries
         the meaning for a reader who cannot tell poppy from forest.

     RETIRED WORDS ARE SUBTRACTED, not special-cased. `ticketTypeKeptForMigration`
     is the one predicate that knows which words are being retired and still sit
     on old rows ("Requirements", "General"); every other screen that offers this
     vocabulary already filters through it, and a chip line that offered a word
     the rest of the app has stopped showing would be the one place a retired
     type could be freshly assigned. */
  const typeChoices = React.useMemo(() => {
    const live = helpTypeOptions.filter((v) => !ticketTypeKeptForMigration(v))
    /* AND THE TICKET'S OWN WORD, WHEN THE LIST NO LONGER HAS IT. Only on an
     * EDIT, and only when it is genuinely missing — a ticket filed last March as
     * "Requirements", or under a type somebody has since switched off on the
     * Choices screen. Without this the row would draw five chips none of which
     * is pressed, which reads as "this ticket has no type" about a ticket that
     * plainly does; the value would survive a save (nothing here clears it) and
     * the SCREEN would still have lied about it, which is the worse half.
     *
     * It is the same ruling `orderTicketTypes` makes one file over about a word
     * its order has never heard of, and the same one migration 0034 made about
     * "Bug" and "Feedback": deactivate the row, never orphan the record that
     * already says it. It is added for THIS ticket only — a create never sees a
     * retired word, so nothing new can be filed under one. */
    const held = initial?.helpType?.trim()
    const missing = !!held && !live.some((v) => v.trim().toLowerCase() === held.toLowerCase())
    return orderTicketTypes(missing ? [...live, held as string] : live)
  }, [helpTypeOptions, initial?.helpType])
  /** The chips, with "no type" as the LAST of them.
   *
   * WHAT "NO TYPE" LOOKS LIKE, and it is a real chip rather than an absence.
   * The row layout has no clear X and no `emptyOption` by design — a chip line
   * commits on the click, so "leave it off" has to be one of the choices or it
   * is not reachable at all, and a type set by a mis-click would then be
   * permanent for the length of the form. So it is a chip, it wears the neutral
   * (`ticketTypeColour`'s own answer for a word it does not know, so every chip
   * in the line has a dot and none of them reads as the broken one), and when
   * nothing is chosen it is the one drawn BLACK — which is how "no type" says
   * itself out loud instead of being four unlit chips a person has to interpret.
   *
   * LAST, not first, and that is the client's ruling deciding it: "in the order
   * that we predetermine … with issue first". Issue is first. Anything that is
   * not one of the four sorts after them, and "no type" is the most not-one-of-
   * the-four thing on the row. */
  const typeOptions = [
    ...typeChoices.map((v) => ({ value: v, label: v, swatch: ticketTypeColour(v) })),
    { value: NONE, label: t("No type"), swatch: NEUTRAL_TYPE_COLOUR },
  ]

  /* ── THE PEOPLE CHIPS ──────────────────────────────────────────────────────
     CLIENT, 2026-09-07: "the raise by, no dropdown but visible all chips."

     THE FENCE DOES NOT MOVE. These are the chosen client's OWN contacts, read
     from `listAccountLinks` through the account detail — one BOUNDED, hard-capped
     read the browser holds whole — and the door refuses a contact who is not on
     that account. A chip line that offered anybody else would be a control whose
     only possible outcome is a refusal, which is the shape this app removes on
     sight. So the chips are exactly the list the old picker filtered to; only the
     presentation changed.

     AND ALL OF THEM, WITH NO CAP, which is the part worth defending because a
     hundred chips would be a wall. Three reasons it is not one here: this is ONE
     COMPANY's contacts and not the team's address book (the fence above is what
     makes the number small — the report that named "a hundred and four contacts"
     was counting every contact in the agency, across every client); the row wraps
     by itself, so a long one costs height in a dialog that already scrolls rather
     than becoming unreachable; and the alternative — chips up to some N and a
     dropdown above it — reintroduces at an unpredictable threshold the exact
     control she asked to remove, which is worse than a tall row and impossible to
     explain. If a real account ever does make a wall of this, the honest fix is a
     cap she can SEE ("and 40 more"), not a control that changes shape behind her.

     NO FACE ON THESE CHIPS, and that is the data's limit rather than a choice:
     `AccountLink` carries `personName` and no picture at all, so R35's face has
     nothing to draw from here. `shape: "round"` rides anyway — it is what the
     row will draw a person WITH the day the link row carries a photo, and it is
     already what the closed picker passed. */
  const contactChoices = (detailQ.data?.links ?? []).filter((l) => l.active)
  /** The chips, and the TWO empty states this field has that the type row does
   * not — which is why "Not said" is appended only when there is somebody to
   * say it instead of.
   *
   * NOBODY CHOSEN YET is the first, and the field is no longer HIDDEN for it.
   * It used to disappear until a client was picked, on the reasoning that a
   * contact belongs to a company and the question has no possible answer before
   * one is named. That reasoning is still true and the answer to it has changed:
   * this form now has a FIXED ORDER the client dictated field by field, and a
   * row that appears and disappears inside a fixed order moves every field under
   * it as somebody fills the form in. So the field keeps its place and SAYS why
   * it is empty ("Choose a client first.", the same sentence the module picker
   * has always said one field up about its app), which is a reason rather than a
   * vanishing act — and it is honest about the agency's own tickets, which have
   * no client on purpose and will read that line for good.
   *
   * A CLIENT WITH NO CONTACTS is the second, and it gets the sentence rather
   * than a lone "Not said" chip: one black chip on an otherwise empty line looks
   * like a row that failed to load its options, which is precisely the reading
   * `RecordPicker`'s own empty-row note exists to prevent. */
  const contactOptions =
    !chosenAccountId || contactChoices.length === 0
      ? []
      : [
          ...contactChoices.map((l) => ({
            value: l.personAccountId,
            label: l.personName,
            hint: l.isMainStakeholder ? t("Main contact") : (l.relationship ?? undefined),
            shape: "round" as const,
          })),
          // "Not said" is the same escape hatch "No type" is, in the same place
          // for the same reason: the row commits on the click, so naming the
          // wrong person has to be undoable without closing the form.
          { value: NONE, label: t("Not said"), shape: "round" as const },
        ]

  /** ONE FILE AT A TIME, and a failure here never fails the ticket.
   *
   * The ticket is already raised by the time this runs. Turning a rejected
   * upload into a thrown submit would close nothing, clear no draft, and tell
   * somebody their request was not saved when it was — so the toast names the
   * attachment and the ticket stands. The same argument the story form settled. */
  async function attach(target: string, files: File[]) {
    for (const file of files) {
      try {
        await content.addHelpAttachment({
          id: target,
          kind: "file",
          label: file.name,
          fileDataUrl: await readFileAsDataUrl(file),
        })
      } catch (err) {
        toast.error(err instanceof ApiFailure ? err.message : t("Couldn't attach that."))
      }
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const madeId = await onSubmit({
        // Blank means "don't set one" rather than "set it to empty": the door's
        // `optionalText` leaves the stored title alone on undefined, so clearing
        // the box on an edit keeps whatever the row already had. Nobody has
        // asked to DELETE a title, and inventing that here would let a stray
        // keystroke silently unname an imported ticket.
        titleEn: values.titleEn.trim() || undefined,
        description: richTextValue(values.description),
        helpType: values.helpType === NONE ? undefined : values.helpType,
        // On a ticket that already has a client, send the one it has — the door
        // accepts naming the SAME client and refuses naming a different one, so
        // this is the value that can never be a surprise.
        accountId: fixedAccount
          ? fixedAccount.id
          : values.accountId === NONE
            ? undefined
            : values.accountId,
        appId: fixedApp ? fixedApp.id : values.appId === NONE ? undefined : values.appId,
        moduleId: values.moduleId === NONE ? undefined : values.moduleId,
        raisedByContactId:
          values.raisedByContactId === NONE ? undefined : values.raisedByContactId,
      })
      // THE FILES, ONCE THERE IS SOMETHING TO HANG THEM ON. `helpId` on an edit,
      // the id the create door just handed back otherwise.
      const target = helpId ?? (typeof madeId === "string" ? madeId : null)
      if (target && pending.length) await attach(target, pending)
      setPending([])
      clearDraft()
      onOpenChange(false)
    } catch (err) {
      toast.error(
        err instanceof ApiFailure
          ? err.message
          : isEdit
            ? t("Couldn't save the ticket.")
            : t("Couldn't raise the ticket.")
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
      title={<DialogTitle>{isEdit ? t("Edit this ticket") : t("Raise a ticket")}</DialogTitle>}
      subtitle={
        <DialogDescription>
          {isEdit
            ? t("Update what you're asking for. Everyone on the ticket will see the change.")
            : t("Describe the problem you're facing. Chat with others, or use this ticket as a forum to discuss solutions.")}
        </DialogDescription>
      }
      submit={{
        busy: busy,
        disabled: !richTextValue(values.description) || moduleMissing,
      }}
    >
      {/* THE ORDER IS THE CLIENT'S, 2026-09-07, and it is her own list of seven
          verbatim: 1. Client 2. App 3. Module 4. Type 5. Title 6. Description
          7. Attachments. The one change from her 2026-09-06 ordering is TYPE,
          which moves from last — where the note below this form used to argue
          it belonged, because "most of the times tickets always come in as
          issue, so I recategorize them" — into FOURTH. That argument is not
          being overruled by anybody here: she asked for the chips and she
          placed them, and a screen that keeps a field where an old comment
          reasoned it should be is a screen arguing with its owner.

          IT IS STILL THE ORDER THE DATA DEPENDS IN, which is the property worth
          not losing: the app list is the team's, the module list belongs to the
          app above it, and the contact list belongs to the client at the top —
          so answering downward never asks a question that has no answer yet.
          Type sitting fourth costs nothing there, because a ticket's type
          depends on none of the three above it.

          RAISED BY IS NOT IN HER SEVEN, and it has not been dropped. She asked
          for it as CHIPS (item 5 of her list of asks) and then did not place it
          in the ordering, so it is put where the previous ordering had "author"
          — directly after Description, before Attachments — and said out loud
          here so she can move it in one line rather than discover it somewhere
          she did not expect. */}
      {/* The picker reads `values.accountId || NONE` rather than the bare value:
          a draft saved in this tab before this field existed restores an object
          without it, and an undefined value would quietly make the control
          uncontrolled. The COMPANIES only (`type: "entity"`), which is the same
          narrowing the old in-memory filter did, asked of the door instead. */}
      <Field config={accountField} htmlFor="help-account" className={fieldSpacing}>
        {fixedAccount ? (
          <p className="text-muted-foreground text-sm" id="help-account">
            {fixedAccount.name}, a ticket can&apos;t be moved to another client.
          </p>
        ) : (
          <RecordPicker
            id="help-account"
            value={values.accountId || NONE}
            onChange={(accountId) => setValues((v) => ({ ...v, accountId }))}
            search={(term) => searchAccounts(term, { type: "entity" })}
            searchKey={pickerKey("companies", teamId)}
            emptyOption={{ value: NONE, label: t("Ours, no client") }}
            placeholder={t("Ours, no client")}
            searchPlaceholder={t("Search companies…")}
            emptyText={t("No company matched.")}
            disabled={busy}
          />
        )}
      </Field>
      {/* WHICH SYSTEM (CHECKLIST 5.8), now BELOW the client in the markup too.
          This block used to carry a note conceding it sat "above the client
          picker in the markup but BELOW it in meaning" — the dependency ran
          client → app → module → contact while the eye ran the other way. The
          client's ordering (2026-09-06) puts markup and meaning in the same
          direction, so the four read top to bottom as one sentence and the note
          has nothing left to apologise for. */}
      {/* AND EACH APP WEARS ITS OWN MARK (client, 2026-09-07: "when I select the
          app, I want to see the icons"). The list screen's app facet answers the
          same ask with `<AppMark app={a} size="choice" />`; a picker OPTION
          cannot be handed that node, because `PickerOption.mark` is the GLYPH
          STRING `RecordMark` takes rather than a component — so the two fields
          `AppMark` reads are passed straight through instead, and the picker
          builds the identical `RecordMark` at the identical `choice` size on the
          other side. Same component, same size, same fallback chain (the
          client's logo where there is one, the stage mark where there is not,
          the name's own initial where there is neither) — one treatment drawn
          from two call sites, not a second treatment invented here. */}
      <Field config={appField} htmlFor="help-app" className={fieldSpacing}>
        <RecordPicker
          id="help-app"
          value={values.appId || NONE}
          onChange={(appId) => setValues((v) => ({ ...v, appId, moduleId: NONE }))}
          options={(appsQ.data ?? [])
            .filter((a) => a.active)
            .map((a) => ({
              value: a.id,
              label: a.name,
              picture: a.logoUrl,
              mark: appStageMark(a.stage),
              // ALWAYS, even for an app with no logo AND no stage —
              // `appStageMark` answers "" for a stage nobody has written down,
              // and without this flag that app would be the one blank line in a
              // list of icons. `AppMark` on the ticket LIST has no such hole
              // because it hands `RecordMark` the job unconditionally; `face`
              // is how a picker option says the same thing.
              face: true,
            }))}
          emptyOption={{ value: NONE, label: t("No app") }}
          placeholder={t("No app")}
          searchPlaceholder={t("Search apps…")}
          emptyText={t("No app matched.")}
          disabled={busy}
        />
      </Field>
      {/* WHICH SECTION OF IT. Offered only once an app is chosen, because a
          module belongs to one and the door refuses a pair that does not match —
          a picker that can only produce a refusal is worse than no picker.
          Changing the app CLEARS it, which is the one behaviour that keeps the
          two honest: a section of the old app is not a section of the new one. */}
      <Field config={moduleField(moduleRequired)} htmlFor="help-module" className={fieldSpacing}>
        <RecordPicker
          id="help-module"
          value={values.moduleId || NONE}
          onChange={(moduleId) => setValues((v) => ({ ...v, moduleId }))}
          options={appModules.map((m) => ({ value: m.id, label: m.name, mark: m.mark }))}
          emptyOption={{ value: NONE, label: t("No module") }}
          placeholder={chosenAppId ? t("No module") : t("Choose an app first")}
          searchPlaceholder={t("Search modules…")}
          emptyText={chosenAppId ? t("This app has no modules yet.") : t("Choose an app first.")}
          disabled={busy || !chosenAppId}
        />
      </Field>
      {/* THE TYPE, AS A LINE OF COLOURED CHIPS, AND FOURTH (client, 2026-09-07).
          It was the last field on this form and a searchable dropdown; it is now
          the fourth and a chip row, which is two of her rulings in one block.
          The list itself — which words, in what order, wearing which colour — is
          built above beside the reasoning for each of the three; nothing about
          the vocabulary is decided here.

          NO `leadValue`, AND THAT IS THE ONE PLACE THIS ROW DIFFERS FROM THE
          TRIAGE CARD'S. There the lead is the ticket's CURRENT type, promoted to
          the front of the line with a divider after it, because triage is a
          person re-reading one ticket and "start from what it says now" is the
          honest first offer. Here the client has just ruled the order fixed and
          named its first element — "in the order that we predetermine … with
          issue first" — so promoting the ticket's existing type would reorder
          the row per ticket and Issue would stop being first the moment somebody
          edited a Question. A fixed order and a promoted lead are two different
          promises about the same line, and she made the first one. The chosen
          chip is still drawn BLACK wherever it sits, which is what actually
          answers "which one is it" without moving anything. */}
      <Field config={typeField} htmlFor="help-type" className={fieldSpacing}>
        <RecordPicker
          id="help-type"
          layout="row"
          // The row is a `div role="group"`, not a labelable control, so the
          // Field's `<label for>` above cannot name it — the same wall the
          // description editor hits two fields down, answered the same way and
          // out of the same config, so the visible label and the spoken one
          // cannot drift.
          ariaLabel={t(typeField.label)}
          value={values.helpType}
          onChange={(helpType) => setValues((v) => ({ ...v, helpType }))}
          options={typeOptions}
          searchPlaceholder={t("Search types…")}
          // A ROW CANNOT SAY "nothing matched" — there is no search box in it —
          // so this is the state where the team's own `Ticket type` list is
          // EMPTY, every word deactivated on the Choices screen. The same
          // sentence the triage card's row says about the same vocabulary.
          emptyText={t("Your team has no ticket types set up yet.")}
          disabled={busy}
        />
        <ManageDropdownsLink teamId={teamId ?? null} />
      </Field>
      {/* WHAT TO CALL IT, above the paragraph rather than below it: this is the
          line the triage card, the list's title column and the ticket's own
          screen all show, so it is asked in the position it is read.

          NO PLACEHOLDER, on purpose. An example sentence here would be a new
          English string, and a new string is a translation the catalogue does
          not have — R44 pins the untranslated count exactly, so one placeholder
          costs either a real translation in three languages or a raised
          ceiling. The label is already translated, and the description field
          directly below carries the worked example ("e.g. I can't invite a new
          member, the button is greyed out") that this one would have echoed. */}
      <Field config={titleField} htmlFor="help-title" className={fieldSpacing}>
        <Input
          id="help-title"
          value={values.titleEn}
          onChange={(e) => setValues((v) => ({ ...v, titleEn: e.target.value }))}
          maxLength={200}
          disabled={busy}
        />
      </Field>
      <Field config={descField} htmlFor="help-desc" className={fieldSpacing}>
        <Notes
          key={open ? "open" : "shut"}
          // THE NAME A SCREEN READER READS. The `htmlFor` above lands the id on
          // the editable node itself, because the kit Field clones it onto its
          // single child — and this is the label that id could never carry, since
          // a label element's `for` attribute binds only to a labelable control
          // and the editable node here is a plain div. Same words as the visible
          // label, taken from the same config, so the two can never drift apart.
          aria-label={t(descField.label)}
          disabled={busy}
          defaultValue={values.description}
          onChange={(html) => setValues((v) => ({ ...v, description: html }))}
          placeholder={t("Tell us what's going on, e.g. I can't invite a new member, the button is greyed out.")}
          className="min-h-32"
        />
      </Field>
      {/* WHO ASKED (CHECKLIST 5.9), AS CHIPS (client, 2026-09-07: "the raise by,
          no dropdown but visible all chips"), and PLACED HERE ON PURPOSE. Her
          list of seven does not mention this field at all, so it keeps the slot
          the previous ordering gave "author" — after the description, before the
          attachments. Said out loud in the order note at the top of this form so
          it is one line to move rather than a surprise.

          THE FENCE IS UNCHANGED and is the reason the list stays client-side:
          a company's contact list is BOUNDED (`listAccountLinks`, one hard-capped
          read), the browser holds all of it, and the narrowing to one company's
          own people is what the DOOR enforces — so a wider list would offer names
          the server refuses. Removing the search box removes a convenience, never
          a limit. The options themselves, the no-cap decision and the two empty
          states are worked out above. */}
      <Field config={contactField} htmlFor="help-contact" className={fieldSpacing}>
        <RecordPicker
          id="help-contact"
          layout="row"
          // Same wall, same answer as the type row above: a group of chips is
          // not a labelable control, so the name a screen reader reads comes
          // from the field's own config rather than from the `<label for>`.
          ariaLabel={t(contactField.label)}
          value={values.raisedByContactId || NONE}
          onChange={(raisedByContactId) => setValues((v) => ({ ...v, raisedByContactId }))}
          options={contactOptions}
          searchPlaceholder={t("Search contacts…")}
          emptyText={chosenAccountId ? t("No contacts yet.") : t("Choose a client first.")}
          disabled={busy}
        />
      </Field>
      {/* THE SCREENSHOT, BESIDE THE WORDS THAT DESCRIBE IT — and on BOTH halves
          of this dialog, which is the whole of the owner's ask: "while adding or
          editing them, just like we have at the story level." One field, one
          code path; the upload simply knows a different id on an edit.
          Behind `help:edit`, because that is what the attachments door gates on
          and a control that always refused would be worse than none. */}
      {canAttach && (
        <Field config={fileField} htmlFor="help-files" className={fieldSpacing}>
          <div className="flex flex-col gap-2">
            {pending.length > 0 && (
              <ul className="divide-border divide-y rounded-[var(--radius)] bg-surface-panel">
                {pending.map((file, i) => (
                  <li key={`${file.name}-${i}`} className="flex items-center gap-2 px-3 py-2">
                    <Paperclip className="text-muted-foreground size-3.5 shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      aria-label={t("Take it off")}
                      disabled={busy}
                      onClick={() => setPending((f) => f.filter((_, j) => j !== i))}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <FileUpload
              multiple
              onFilesSelected={(files) => setPending((f) => [...f, ...files])}
              className={busy ? "pointer-events-none opacity-60" : undefined}
            />
          </div>
        </Field>
      )}
      {/* TYPE USED TO BE HERE, last and outside the sequence, with a note
          arguing that triage is where a type is actually decided — "most of the
          times tickets always come in as issue, so I recategorize them". The
          client put it fourth on 2026-09-07 and it is drawn there now. */}
    </FormShellDialog>
  )
}
