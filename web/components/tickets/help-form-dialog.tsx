"use client"

// Ticket form dialog — raise a NEW ticket, or EDIT one (when `initial` is present).
//
// WHAT THIS FORM DEMANDS, in one place, because "which fields are required?" is a
// question people keep having to read 1,000 lines to answer. FIVE:
//   Description  — always (`descField`).
//   Title        — since 2026-09-09, her ruling; grandfathered on an imported
//                  ticket that arrived without one (`titleGrandfathered`).
//   Type         — since 2026-09-07, her ruling; stands down for a team with no
//                  ticket types and for a ticket that arrived without one.
//   Module       — once an app with modules is chosen, and never otherwise.
//   Raised by    — since 2026-09-10, her ruling ("not said should not exist");
//                  once the chosen client HAS contacts on file, and never
//                  otherwise, and grandfathered on a ticket that arrived without
//                  one (`contactGrandfathered`). It answers itself with the
//                  account's main contact, so in practice it only ever asks when
//                  no main contact is flagged (`mainContactId`).
// AND TWO IT DOES NOT: Client and App are optional, each for a reason written at
// its own config. She named those two and "Raised by" on 2026-09-09 while ruling
// about Title; being named in a sentence is not being ruled about — and the
// sentence that DID rule about "Raised by" came a day later.
//
// Type, App
// and "Raised by" are all LINES OF CHIPS, not dropdowns (the client, 2026-09-07)
// — the type's words come from the team's own "Ticket type" dropdown values
// (selectable_data), the apps from the team's own systems, the people from the
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
import { ManageDropdownsLink } from "@/components/choices/manage-dropdowns-link"
import { RecordPicker } from "@/components/records/record-picker"
// `NEUTRAL_TYPE_COLOUR` USED TO BE IMPORTED HERE, for the dot on the "No type"
// chip. The chip is gone (see `typeField` below) and it was that row's only
// reader in the app, so the import goes with it — the constant itself stays
// exactly where it was, because `ticketTypeColour` still answers with it for a
// word its map has never heard of, which is that constant's real job.
import { orderTicketTypes, ticketTypeColour } from "@/lib/type-colours"
import { appStageMark } from "@shared/app-stages"
import { ticketTypeKeptForMigration } from "@shared/types"
import type { AppModule, AppRow } from "@shared/types"
import { readFileAsDataUrl } from "@shared/web/file"
import { useT } from "@shared/web/language"

/** THE TICKET'S NAME, and since 2026-09-09 a ticket raised here HAS one.
 *
 * `title_en` is not a new column — it has been on the row since the Glide
 * import, `updateTicket` and the create door both accept it, `help-detail`
 * shows it and `ticketTitle` reads it first. Only the FORM never asked, so
 * every ticket raised through this app fell to the last resort in that chain:
 * the first eighty characters of the description, shown above the paragraph it
 * was cut from. The card was repeating itself because nothing else existed.
 *
 * CLIENT, 2026-09-09, verbatim: *"in titcket: client, title, raised by app,
 * title is required"*. She is naming the fields of this form and then ruling
 * about ONE of them. Client, App and "Raised by" are the three she listed and
 * they are NOT made required by having been named — each is optional for a
 * stated reason that has not changed (see their own configs below: the agency's
 * own housekeeping questions are about no system, for no client, and were asked
 * by nobody outside the building). Type was already required, from her ruling of
 * 2026-09-07. Title joins it, and nothing else moves.
 *
 * SO IT IS REQUIRED THROUGH THE SEAM THIS FORM ALREADY HAS, and there is still
 * exactly one: a boolean into `submit.disabled` and the SAME boolean into the
 * field's `required`, so the marker at the row's trailing edge (kit v1.2.71
 * owns that position) and the button that refuses can never disagree. That is
 * `typeField`'s shape and `moduleField`'s before it; a third validation style
 * would be the drift both of those exist to avoid.
 *
 * REQUIRED ONLY WHERE IT CAN BE ANSWERED — the same sentence, for the same
 * reason, one case bigger than Type's. `title_en` is nullable and 788 imported
 * tickets have none (they carry a German one, or nothing at all), so this can be
 * a rule about the tickets this form RAISES and never about the ones it OPENS.
 * See `titleGrandfathered`.
 *
 * THE DOOR IS UNCHANGED AND STAYS PERMISSIVE. `updateTicket` reads the title
 * through `optionalText` and the portal's own raise dialog cannot send one at
 * all, so this is a requirement of THIS screen, exactly as Type's is. A door
 * that refused an untitled ticket would break the portal and the 788. */
const titleField = (required: boolean) => ({
  ...defaultFieldConfig,
  label: "Title",
  required,
})
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
/** THE TYPE, AND A TICKET NOW HAS ONE.
 *
 * CLIENT, 2026-09-07, twice in two separate sentences on the same screenshot:
 * "no type is not an option", and then "good, but o type does not exist". The
 * row used to end in a chip labelled "No type", drawn black whenever nothing
 * was chosen, and the paragraph that defended it is replaced by this one at the
 * chip's own call site below rather than deleted — it argued honestly from the
 * row's mechanics (a chip line commits on the click, so "leave it off" has to be
 * reachable or a mis-click is permanent), and the client's answer is not that
 * the mechanics were wrong but that the ESCAPE ITSELF is: a ticket is one of the
 * four things, and a fifth chip meaning "none of them" is a category she does
 * not have.
 *
 * SO IT IS REQUIRED — through the seam this form already validates with, and no
 * second one. `moduleField` directly below takes its `required` as an argument
 * and pairs with a `moduleMissing` flag feeding `submit.disabled`; this does the
 * identical thing with `typeRequired`/`typeMissing`, so the marker a person sees
 * and the button that refuses them are computed from one boolean rather than
 * from two rules that can drift apart.
 *
 * AND REQUIRED ONLY WHERE IT CAN BE ANSWERED, which is the same sentence
 * `moduleField` makes and is not a softening of the rule. Two cases, both real:
 *
 *   · A TEAM WITH NO TICKET TYPES. Every word on the Choices screen can be
 *     switched off, and then the row draws no chips at all and says so. Demanding
 *     one there would be a door with no handle — a form nobody in that team could
 *     ever submit, on a screen that offers them nothing to press.
 *   · A TICKET THAT ARRIVED WITHOUT ONE. See `typeGrandfathered` below. */
const typeField = (required: boolean) => ({
  ...defaultFieldConfig,
  label: "Type",
  required,
})
const accountField = {
  ...defaultFieldConfig,
  label: "Account",
  required: false,
  helpText: "The company this is for. Their contacts see it in their portal; leave it off for our own questions.",
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
  helpText: "Which system this is about. It is what routes the request and who gets told when it is answered.",
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
  helpText: "Which part of the app it is about, like Settings or Documents. Choose the app first.",
})
// THE PERSON WHO ASKED IS NOT OPTIONAL ANY MORE — client, 2026-09-10: "when
// creating ticket, raised by not said should not exist. always default main
// contact person." Two halves of one sentence, and the second is what makes the
// first liveable: the escape hatch goes, and the account's own MAIN CONTACT
// (`account_links.is_main_stakeholder`, which `listAccountLinks` already sorts
// first and both front doors already badge "Main contact") answers the field
// before anybody touches it.
//
// REQUIRED ONCE THERE IS SOMEBODY TO NAME, exactly the shape `moduleField` one
// field up already carries and for the same honest reason. Two real states have
// no possible answer: an agency ticket with no client at all ("Ours, no
// account", which this form offers on purpose), and a client whose contacts
// nobody has written down yet. Demanding a name there would be a door with no
// handle — it would make a ticket unraisable to enforce a field that has no
// options. So the demand is `contactOptions.length > 0`, and it tightens by
// itself as the contact lists fill in.
const contactField = (required: boolean) => ({
  ...defaultFieldConfig,
  label: "Raised by",
  required,
  helpText: "The person at that account who asked. Not always whoever types it in.",
})

// "NOTHING CHOSEN", as a value a control can actually hold. Radix Select can't
// hold an empty string, and the draft this form saves has to round-trip the
// answer either way, so every optional record field on this form parks on this
// sentinel until somebody picks something and `submit` maps it back to
// `undefined`. It is no longer OFFERED anywhere on the type row — see
// `typeField` — but it is still what that row's value IS before a chip is
// pressed, which is the state `typeMissing` reads.
const NONE = "__none__"

/** THE SCREENSHOT FIELD. Same words as the story form's, because it is the same
 * act and a second phrasing would be a second idea. */
const fileField = {
  ...defaultFieldConfig,
  label: "Something to show",
  required: false,
  helpText: "A screenshot, a recording, a document somebody can open.",
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
  //
  // AND BOTH WAIT FOR THE DIALOG TO BE OPEN. This component is MOUNTED by the
  // screens that can raise a ticket — the write panels, the tickets collection,
  // an app's own screen — whether or not anybody has pressed the button, so its
  // two option lists were read on arrival at any of those screens. On a cold
  // deep link that put two requests for a form nobody had opened in front of the
  // record a person came for (`MAX_REQUESTS_BEFORE_FIRST_PAINT`,
  // shared/workers/limits.ts). Both are bounded, cached and live, so the first
  // press pays at most one round trip and every press after that pays none.
  const appsQ = useCached<AppRow[]>(teamId && open ? appsKey(teamId) : null, () =>
    listFetch.apps(teamId as string)
  )
  // EVERY MODULE THE TEAM HAS, narrowed below to the app in hand. One bounded
  // read held whole, so changing the app above re-filters instantly instead of
  // putting a spinner inside a form somebody is halfway through.
  const modulesQ = useCached<AppModule[]>(teamId && open ? appModulesKey(teamId) : null, () =>
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
  // a company past page one used to be shown to its own ticket as "this account".
  const fixedAccount = initial?.accountId
    ? { id: initial.accountId, name: detailQ.data?.account.name ?? t("this account") }
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
  /** The chips, and there is no longer a "no type" one at the end of them.
   *
   * WHAT USED TO BE HERE, kept because the ruling that removed it only makes
   * sense against it. The row ended in a fifth chip labelled "No type", wearing
   * the neutral colour, drawn BLACK whenever nothing was chosen — the argument
   * being that a chip line has no clear X and no `emptyOption` (the row commits
   * on the click), so "leave it off" had to be one of the choices or a type set
   * by a mis-click would be permanent for the length of the form.
   *
   * CLIENT, 2026-09-07: "no type is not an option" … "o type does not exist."
   * Twice, in two sentences, which is how a person rejects a thing rather than
   * queries it. The mechanical argument above was never the disputed half — the
   * row does still commit on the click — she is refusing the CATEGORY. A ticket
   * is an issue, a question, a request or an extra; "none of those" is not a
   * fifth kind of ticket, it is a ticket nobody has read yet, and offering it as
   * a chip made the unread state look like a decision somebody took.
   *
   * WHAT THE MIS-CLICK COSTS NOW, said out loud rather than left as a surprise:
   * pressing the wrong chip is undone by pressing the right one, and the only
   * thing that is no longer reachable is getting BACK to nothing. That is the
   * whole of what she asked for, and it is why Type is required below — a
   * control with no way to mean "empty" and a form that still accepts empty
   * would be the two halves disagreeing.
   *
   * The words, their order and their colours are all decided above; nothing
   * about the vocabulary is decided on this line. */
  const typeOptions = typeChoices.map((v) => ({
    value: v,
    label: v,
    swatch: ticketTypeColour(v),
  }))
  /** THE TICKET THAT ARRIVED WITH NO TYPE, and there are about sixty of them.
   *
   * Type is required from here on, and that is a rule about the tickets this
   * form RAISES. It cannot be a rule about the ones it OPENS: `help_type` is
   * nullable, about sixty rows are null (the count reported on 2026-09-07; the
   * exact number is a property of the data and not of this file, which is why
   * nothing here is written against it), and a person who opens
   * one of those to fix a typo in the description would meet a dialog whose
   * Submit is dead until they categorise somebody else's two-year-old request.
   * That is the trap, and it is worse than the hole it would close — it turns a
   * one-word correction into a judgement call, and a person in a hurry makes
   * that judgement by pressing whichever chip is nearest, which is how sixty
   * honest nulls become sixty wrong answers nobody can tell from real ones.
   *
   * So a ticket that arrived without a type is GRANDFATHERED: the row draws
   * every chip unpressed (it does not invent one — `values.helpType` stays on
   * the sentinel, `submit` maps that to `undefined`, and `updateTicket`'s
   * `optionalText` leaves the stored null exactly as it found it), the field
   * shows no required marker, and Submit works. Setting a type is offered and
   * never demanded, which is the same shape `moduleField` already uses one field
   * up and the same shape `ticketTypeKeptForMigration` uses for a retired word:
   * never orphan the record that already says something, and never make the
   * screen lie about a record that says nothing.
   *
   * It is narrow on purpose. It reads `initial`, which is the ticket AS OPENED,
   * so it cannot leak into a create (there is no `initial`), and it does not
   * follow `values` — once somebody picks a type in this session the field is
   * answered anyway, and once they SAVE one the next open is an ordinary
   * required edit. The exemption dies with the row it was written for. */
  const typeGrandfathered = isEdit && !initial?.helpType?.trim()
  /** Demanded once there is something to demand and something to demand it OF —
   * see `typeField`. Both conditions are real states, not defensive coding: a
   * team can switch every ticket type off on the Choices screen, and sixty
   * imported tickets carry no type. */
  const typeRequired = typeOptions.length > 0 && !typeGrandfathered
  const typeMissing = typeRequired && values.helpType === NONE
  const typeConfig = typeField(typeRequired)

  /** THE TICKET THAT ARRIVED WITH NO TITLE, AND THERE ARE 788 OF THEM.
   *
   * Title is required from 2026-09-09, and that is a rule about the tickets this
   * form RAISES. `typeGrandfathered` one field up makes the identical argument
   * about about sixty null `help_type`s; this is the same shape over a hole an
   * order of magnitude bigger, and the trap it avoids is worse in one specific
   * way. A person who opens an imported ticket to correct a typo would meet a
   * dead Submit until they NAMED somebody else's two-year-old request — and
   * unlike a type, which is a choice among four words the app already knows, a
   * title is a sentence they have to invent. A person in a hurry invents it from
   * the first line of the description, which is precisely what `ticketTitle`
   * already shows them for free (`shared/web/ticket-chips.tsx`: English title,
   * then German, then the first eighty characters of the body). So the form would
   * be extracting, by hand and one row at a time, a value the app already
   * derives — and freezing it, wrongly, in a column that then outranks the
   * derivation forever.
   *
   * SO AN UNTITLED TICKET OPENS, SAVES, AND KEEPS ITS DERIVED NAME: no required
   * marker, Submit works, and `submit` sends `undefined` for an empty box (never
   * `""`), which `optionalText` leaves as the stored null it found. Nothing is
   * invented and nothing is cleared.
   *
   * IT READS `initial.titleEn` — THE FORM'S OWN FIELD, ON THE TICKET AS OPENED —
   * and that is deliberate twice over. A ticket with a GERMAN title and no
   * English one is grandfathered, correctly: `ticketTitle` is already showing
   * `title_de` everywhere and this form has no box for it, so demanding an
   * English one would be demanding a translation. And reading `initial` rather
   * than `values` means it cannot leak into a create (there is no `initial`) and
   * does not flicker as somebody types: once they save a title, the next open is
   * an ordinary required edit. The exemption dies with the row it was written
   * for. */
  const titleGrandfathered = isEdit && !initial?.titleEn?.trim()
  const titleRequired = !titleGrandfathered
  const titleMissing = titleRequired && !values.titleEn.trim()
  const titleConfig = titleField(titleRequired)

  /* ── THE APP CHIPS ─────────────────────────────────────────────────────────
     CLIENT, 2026-09-07: "make app not openable until client is selected, and
     whe it is horizontal pills instead of dropdown."

     TWO RULINGS, and the second is the same one the type row and the people row
     already answer, so it is the same component with the same prop: `layout=
     "row"`. A third hand-written chip line would be three ideas of what a
     selected chip looks like inside one dialog.

     THE ICONS SURVIVE, which she asked for by name a sentence earlier ("when I
     select the app, I want to see the icons"). The three fields the closed
     picker was passing — `picture` (the client's own logo), `mark` (the stage
     glyph) and the `face` flag that makes an app with NEITHER draw its own
     initial rather than a blank — are `PickerOption`'s, not the control
     layout's, and `RowChip` reads the identical three in the identical
     precedence. So the chips wear exactly what the dropdown's rows wore, at the
     same `choice` size, out of the same `RecordMark`.

     NO CAP, AND THE NUMBER IS KNOWN RATHER THAN HOPED. The people row one field
     down leaves its chips uncapped and argues it from the client fence keeping
     the number small; the same conclusion holds here for a stronger reason,
     because the ceiling is not an estimate. The agency's own record
     (glide/RECONCILIATION.md, pulled from the live Glide app on 10 Aug 2026) is
     TWENTY-EIGHT apps across TWENTY customers — 1.4 apps per client, and 28 is
     the whole agency's list, which is the most this row can ever draw even with
     the fence off. A wrapping line of twenty-eight chips in a scrolling dialog
     is a tall row, not a wall, and the alternative — chips up to some N and a
     dropdown above it — reintroduces at an unpredictable threshold the exact
     control she asked to remove. If a team ever does make a wall of this, the
     honest fix is a cap she can SEE, not a control that changes shape behind
     her.

     "NO APP" IS STILL A CHIP, and that is not an inconsistency with the type row
     losing its escape. She ruled that a ticket has a type; she ruled nothing of
     the sort about the app, and the field's own note two screens up is why —
     the agency's housekeeping questions are about no system at all, so "no app"
     is a real and common answer rather than an unread state. The row commits on
     the click, so a real answer has to be one of the chips.

     THE GATE IS AN ORDERING RULE AND THE LIST IS NARROWED TOO — client,
     2026-09-09: *"very wrong! filter the apps by selected client! Until clint is
     not selected, show nothing."* Both halves of that sentence are here, and
     only the first of them used to be.

     WHAT THIS BLOCK USED TO SAY, because the argument was real and the reader
     deserves it rather than a silent deletion. It read: the gate is an ordering
     rule, not a fence, because the door has no opinion — `moduleForTicket`
     refuses a module that is not part of the named app, so THAT picker is shut
     because an open one could only produce a refusal, while `appForTicket`
     checks only that the app is a live row in the team, so every app on this
     list would be accepted for every client. And then, in as many words: *"Said
     plainly so nobody later 'fixes' it by narrowing the list to the client's own
     apps: that would hide the agency's own systems (`AppRow.accountId` is null
     on those) from every client's ticket, and the door has never asked for it."*

     THE CLIENT HAS RULED, TWICE IN ONE DAY, AND A RULING BEATS A COMMENT. But
     the comment was arguing against a narrowing nobody has to write. Its cost —
     our own systems disappearing off every client's ticket — is a cost of
     narrowing by EQUALITY (`a.accountId === chosenAccountId`), and that is not
     the narrowing her second correction the same day asks for. She ruled that
     the toolbar's filters CASCADE, and the cascade she got is already written,
     already shipped and already hers: `useFilterBar`'s `optionsFor`
     (shared/web/screen-engine/filter-bar.tsx) narrows a child facet by
     OWNERSHIP — `o.within == null || o.within === parent` — where `within` is
     the app row's own `accountId` passed straight through. Its own note carries
     the same sentence this block used to end on, and answers it: *"`within ==
     null` is 'owned by nobody' and survives every parent: our own systems are
     legitimately on a client's ticket, and dropping them would make those
     tickets unreachable from this control."*

     SO THIS ROW APPLIES THAT EXACT RULE, and the reason to reuse the words
     rather than invent a second answer is that both controls narrow the same
     column on the same screen: the toolbar's App facet on the tickets
     collection and this form's App row. Two rules would be two ideas of which
     apps belong to a client inside one product, which is the drift she has told
     us twice to stop.

     WHAT THE ROW OFFERS, exactly:

       · NO CLIENT AND NO APP ON THE TICKET → nothing. Her first sentence,
         unchanged, drawn by the gate below.
       · A CLIENT CHOSEN → that client's own apps, plus the agency's own
         systems (`accountId` null), plus "No app".
       · NO CLIENT BUT THE TICKET ALREADY NAMES ONE (a housekeeping ticket, the
         `appAlreadyNamed` case below) → the agency's own systems, which is what
         `a.accountId === chosenAccountId` resolves to when both are null, and
         is the right answer rather than a coincidence: a ticket with no client
         is about one of ours or about nothing.

     AND NOTHING EXISTING IS STRANDED. The one row the ownership rule can
     exclude is an app belonging to a DIFFERENT client, which a ticket can
     legally hold — the door accepts any live app for any client, exactly as the
     retired paragraph said. So the app the ticket ALREADY NAMES is kept on the
     list whatever it belongs to, off `initial` for `appAlreadyNamed`'s own
     reason (the ticket AS OPENED, so the row cannot change under a hand that is
     using it). Without that clause an edit would draw a row with no chip
     pressed while `values.appId` still held the app, and `submit` would send a
     value the screen had stopped showing — the same silent-hidden-value bug the
     paragraph below describes, arriving from a third direction.

     `a.active` IS NOT RELAXED FOR IT, and that asymmetry is deliberate. An
     ARCHIVED app is not excluded by this narrowing — it was already excluded,
     and it has to stay excluded, because `appForTicket` refuses one
     (`deactivated_at IS NULL`): offering it would be a chip whose only possible
     outcome is a refusal, which is the shape the module row one field down
     exists to avoid. An app of another client is the opposite case — the door
     takes it — so keeping that one costs nothing and losing it costs a ticket. */
  const appChoices = (appsQ.data ?? []).filter(
    (a) =>
      a.active && (a.accountId == null || a.accountId === chosenAccountId || a.id === initial?.appId)
  )
  /** THE TICKET THAT ALREADY NAMES AN APP AND NO CLIENT, which the gate above
   * would otherwise hide and then silently save.
   *
   * The door allows the pair: `createTicket` stamps a null account on the
   * agency's own questions and `appForTicket` never asks which client an app
   * belongs to, so a housekeeping ticket about one of our own systems is a legal
   * row. Open one under a bare client-gate and the row would read "Choose a
   * client first." while `values.appId` still held that app — and `submit` would
   * send it, because nothing on this form clears a value the screen has stopped
   * showing. That is the same silent-hidden-value bug the client picker's own
   * `onChange` note describes, arriving from the other direction.
   *
   * So the gate asks whether there is anything to SAY about the app yet, which
   * is a client OR an app the ticket already had, rather than a client alone.
   * Read off `initial` (the ticket AS OPENED) and not off `values`, for
   * `typeGrandfathered`'s reason one field up: a row that closed itself the
   * moment somebody pressed "No app" would jump under their hand.
   *
   * THE SAME FACT IS NOW LOAD-BEARING TWICE, and the second use is why it is
   * worth saying so here. This boolean OPENS the row; the `a.id ===
   * initial?.appId` clause in `appChoices` above keeps the named app ON it once
   * it is open. An opened row that then offered no chip for the app the ticket
   * actually has would be the same defect wearing a different shape. */
  const appAlreadyNamed = !!initial?.appId
  /** The chips, with the SAME two empty states the people row has and for the
   * same reasons — the sentence rather than a lone escape chip, because one
   * black chip on an otherwise empty line reads as a row that failed to load
   * its options. */
  const appOptions =
    (!chosenAccountId && !appAlreadyNamed) || appChoices.length === 0
      ? []
      : [
          ...appChoices.map((a) => ({
            value: a.id,
            label: a.name,
            picture: a.logoUrl,
            mark: appStageMark(a.stage),
            // ALWAYS, even for an app with no logo AND no stage —
            // `appStageMark` answers "" for a stage nobody has written down,
            // and without this flag that app would be the one blank chip in a
            // line of icons. `AppMark` on the ticket LIST has no such hole
            // because it hands `RecordMark` the job unconditionally; `face` is
            // how a picker option says the same thing.
            face: true,
          })),
          { value: NONE, label: t("No app") },
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

     AND EVERY CHIP CARRIES A ROUND AVATAR — client, 2026-09-09: *"in raides by
     ticket add screen: add avatar in round"*. It is ONE FLAG, `face: true`, and
     nothing here draws a circle:

       · `shape: "round"` was already on these options and had been since the
         closed picker, parked for exactly this day. It is the BOX — R35 /
         `record-mark.tsx`'s ruling that a person in their own right is a circle
         and a client, an app, a thing is a rounded square.
       · `face` is what makes the box appear AT ALL. `RowChip` draws its
         `RecordMark` only `if (picture || mark || face)`, and that gate is right
         for most pickers — a list of dropdown values with no pictures would
         otherwise wear a column of grey letters, "inventing an identity none of
         them has". A contact is not that. `face` is how a picker option says
         "this is a person, draw them", the identical flag the APP row above
         passes for the same reason, and the exact case `PickerOption`'s own
         header says it exists for.
       · What lands on screen is `<RecordMark shape="round" size="choice">`, the
         app's ONE person-mark seam, at 24px — which is `--avatar-sm`, the kit
         avatar's own smallest size, taken from it by name rather than guessed
         (`BOX` in record-mark.tsx says so). It brings the picture-with-fallback
         state machine, the cold-load `naturalWidth` check and the `aria-hidden`
         with it. Reaching past it for the kit's `Avatar` directly would be an
         eighteenth answer to "what to draw when there is no picture", which is
         the census that component exists to have ended.

     WHAT A CONTACT ACTUALLY HAS, said plainly because the answer decides what is
     drawn: A NAME AND, SINCE THE DOOR CHANGE, A FACE. `AccountLink`
     (shared/types.ts) carries `id`, `accountId`, `personAccountId`,
     `personName`, `personLogoUrl`, `relationship`, `isMainStakeholder`,
     `active`. The picture is the field this block used to say was missing, and
     the paragraph that used to stand here is worth keeping in full because it
     names its own remedy: *"A contact IS an account row, and 31 of the 106
     individual accounts hold a real face in `logo_url` (`scripts/glide-visuals.mjs`
     put them there, and record-mark.tsx's header counts them) — so the
     photographs exist and are one `p.logo_url` away in that SELECT. Adding it is
     a door change, not a screen one … the day `AccountLink` carries the person's
     picture, this call site passes it as `picture` and `RecordMark` prefers it
     over the initial with no other edit anywhere."*

     THAT IS EXACTLY WHAT HAPPENED, and it is one line at each end: `p.logo_url`
     joined the SELECT in `listAccountLinks` and `picture` joined the option
     below. Nothing else moved — no new component, no second mark, no fallback
     logic here. `RecordMark` already prefers a picture and falls through to the
     initial, so a contact with a photograph draws their face and one without
     draws the letter tile the whole row used to be, in the same round box at the
     same size.

     A CLIENT LOGIN GETS NULL AND THEREFORE THE LETTER, decided at the door
     rather than here (`listAccountLinks`' own note carries the argument: the
     fence is on the company, the photograph is read off a person row beside it,
     and a person can be a contact at two companies). It costs this screen
     nothing — the ticket form is the AGENCY's, and a portal caller never renders
     it — and it is said here so the next reader of this block knows the field
     can be null for a reason other than "no photograph".

     THE ROW IS ALL PEOPLE NOW, AND THAT IS THE CHANGE OF 2026-09-10. It used to
     end in a "Not said" chip — an escape hatch, not a person, drawn with
     `shape: "round"` and deliberately no `face` so it would not show a round
     grey "N" for a colleague nobody has. The client removed the answer, not the
     drawing: "raised by not said should not exist. always default main contact
     person." So every chip in this row is now a real contact with a real face,
     the asymmetry is gone with the option, and the question of what to do when
     nobody has been named moved to `mainContactId` below. */
  const contactChoices = (detailQ.data?.links ?? []).filter((l) => l.active)
  /** The chips, and the TWO empty states this field has that the type row does
   * not — which is why the row is empty rather than short when either bites.
   *
   * NOBODY CHOSEN YET is the first, and the field is no longer HIDDEN for it.
   * It used to disappear until a client was picked, on the reasoning that a
   * contact belongs to a company and the question has no possible answer before
   * one is named. That reasoning is still true and the answer to it has changed:
   * this form now has a FIXED ORDER the client dictated field by field, and a
   * row that appears and disappears inside a fixed order moves every field under
   * it as somebody fills the form in. So the field keeps its place and SAYS why
   * it is empty ("Choose an account first.", the same sentence the module picker
   * has always said one field up about its app, and — since 2026-09-07, the
   * client's own second correction — the very same sentence the APP row says
   * about its client), which is a reason rather than a vanishing act, and it is
   * honest about the agency's own tickets, which have no client on purpose and
   * will read that line for good.
   *
   * AND SINCE 2026-09-09 IT IS SAID INSIDE A LOCKED CONTROL rather than as a
   * bare line of text — her ruling that every "choose x first" gate wears the
   * shape the Module row already wore. The argument is written out on the App
   * row above; nothing in this call site changed, because the change is in the
   * one component both rows are drawn from (`RecordPicker`'s row layout, whose
   * empty state is now the control layout's own shell). This row inherits it,
   * and so does its SECOND empty state below.
   *
   * A CLIENT WITH NO CONTACTS is the second, and it gets the sentence rather
   * than an empty line: a row with no chips at all looks like a row that failed
   * to load its options, which is precisely the reading `RecordPicker`'s own
   * empty-row note exists to prevent. */
  const contactOptions =
    !chosenAccountId || contactChoices.length === 0
      ? []
      : // A PLAIN MAP, NOT A SPREAD INTO AN ARRAY LITERAL. This was a literal
        // while the escape hatch was appended to the end of it; with "Not said"
        // gone there is one term left, and `[...xs.map(…)]` is a second array
        // built for nothing — oxlint's `no-useless-spread`, and it is right.
        contactChoices.map((l) => ({
          value: l.personAccountId,
          label: l.personName,
          hint: l.isMainStakeholder ? t("Main contact") : (l.relationship ?? undefined),
          // THE ROUND AVATAR (client, 2026-09-09), now with a real face in it.
          // Four fields and each answers a different question: `picture` is
          // WHO — the photograph off their own account row, which `RecordMark`
          // prefers over everything else; `shape` is the BOX (a person is a
          // circle); `face` is whether a box is drawn AT ALL, which is what
          // keeps the letter tile for the many contacts who have no
          // photograph; and the initial inside it is `RecordMark`'s own last
          // resort rather than anything decided here. All four argued above.
          picture: l.personLogoUrl,
          shape: "round" as const,
          face: true,
        }))

  /** WHO IT DEFAULTS TO, AND WHY IT IS DERIVED RATHER THAN WRITTEN INTO STATE.
   *
   * CLIENT, 2026-09-10: "always default main contact person." The main contact
   * is `account_links.is_main_stakeholder` — one flag, one row per company,
   * already sorted first by `listAccountLinks` and already badged "Main contact"
   * on the account screen, the contact screen and the client portal. It reaches
   * this form on `AccountLink.isMainStakeholder`, which the chip above is
   * ALREADY reading for its hint, so nothing new is asked of any door.
   *
   * IT IS AN EXPRESSION, NOT AN EFFECT, and that is the whole of how this
   * default stays out of the ticket's data. An effect would `setValues` — into
   * a per-session DRAFT (`useFormDraft`) that outlives the dialog — the moment
   * the contact list arrived, so merely OPENING an old ticket's form would have
   * written a name into it, which is the failure this had to avoid. Derived, the
   * form holds `NONE` until somebody picks, and the default only ever becomes a
   * fact at the moment they press Submit.
   *
   * NO INVENTED FALLBACK WHEN NOBODY IS FLAGGED. `listAccountLinks` sorts the
   * main contact first, so "take the first row" would look like a default and
   * would in fact be an arbitrary person the moment no flag is set — and a
   * ticket that names a human who never asked for anything is worse than a
   * ticket that names nobody. So the field simply stays empty, and (see
   * `contactRequired`) it is then the one case where this form asks somebody to
   * choose.
   *
   * AND NOT ON A TICKET THAT PREDATES THE RULE. `titleGrandfathered` and
   * `typeGrandfathered` above make the same argument about the same shape: it
   * reads `initial` — the ticket AS OPENED — so it cannot leak into a create,
   * and 'this row has no raised-by' is a fact about a row that was written
   * before the field was demanded. Without it, opening an imported ticket to fix
   * a typo would silently attach its client's main contact to somebody else's
   * two-year-old request. The exemption dies with the row it was written for:
   * once a name is saved, the next open is an ordinary required edit. */
  const contactGrandfathered = isEdit && !initial?.raisedByContactId
  const mainContactId = contactGrandfathered
    ? null
    : (contactChoices.find((l) => l.isMainStakeholder)?.personAccountId ?? null)
  /** The value the row actually shows and the value `submit` actually sends —
   * what somebody picked, else the main contact, else nothing. */
  const raisedByValue =
    values.raisedByContactId !== NONE ? values.raisedByContactId : (mainContactId ?? NONE)
  /** Demanded once there is somebody to name — see `contactField`. A ticket with
   * no client, or a client with no contacts on file, has no possible answer and
   * is not asked for one. */
  const contactRequired = !contactGrandfathered && contactOptions.length > 0
  const contactMissing = contactRequired && raisedByValue === NONE
  const contactConfig = contactField(contactRequired)

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
        // WHAT THE ROW SHOWS IS WHAT GETS SENT — `raisedByValue`, which is what
        // somebody picked, else the account's main contact, else nothing. The
        // default is applied HERE and never written into the draft, so an old
        // ticket opened and closed again is byte-identical to the one that was
        // opened (see `mainContactId`). `undefined` means "don't set one": the
        // door's `optionalText` leaves the stored value alone.
        raisedByContactId: raisedByValue === NONE ? undefined : raisedByValue,
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
        // HOW THIS FORM REFUSES, and there is only one way it does it. Every
        // required field on this form is a boolean in this expression and
        // nothing else: no submit-time throw, no per-field error text, no
        // second validation style. `typeMissing` joined `moduleMissing` here on
        // 2026-09-07 and `titleMissing` joins both on 2026-09-09 (see
        // `titleField`) — and the marker each field draws comes from the SAME
        // boolean, so the button and the label can never disagree about what is
        // still outstanding.
        //
        // FIVE TERMS NOW. `contactMissing` joined on 2026-09-10 — the client
        // removed "Not said" from the Raised by row ("always default main
        // contact person"), and a row with no way to say "nobody" is a row that
        // has to be answered. It is a CONDITIONAL demand, like `moduleMissing`
        // beside it: it is false whenever there is nobody to name (no client, or
        // a client with no contacts on file) and false on a ticket that predates
        // the rule, so it never makes an existing ticket unsaveable. Client and
        // App remain unasked for.
        disabled:
          !richTextValue(values.description) ||
          titleMissing ||
          typeMissing ||
          moduleMissing ||
          contactMissing,
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
            {fixedAccount.name}, a ticket can&apos;t be moved to another account.
          </p>
        ) : (
          <RecordPicker
            id="help-account"
            value={values.accountId || NONE}
            // CHANGING THE CLIENT CLEARS THE THREE FIELDS THAT HANG OFF IT, the
            // same behaviour changing the app already had over the module and
            // for the same reason: an app row that is only offered once a client
            // is named must not keep an answer from before one was. Without
            // this, picking a client, picking an app and then going back to
            // "Ours, no account" leaves the row showing "Choose an account first."
            // while `values.appId` still holds an app — and that one WOULD be
            // saved, silently, because `appForTicket` has no opinion about which
            // client an app belongs to. The contact rides along because it has
            // always depended on the client outright (the door refuses a contact
            // of another company), so a stale one was a refusal waiting to
            // happen rather than a silent write.
            onChange={(accountId) =>
              setValues((v) => ({
                ...v,
                accountId,
                appId: NONE,
                moduleId: NONE,
                raisedByContactId: NONE,
              }))
            }
            // THE NAME AND NOTHING ELSE — client, 2026-09-09: *"in add/edit for
            // tickets for accounts, i only need the nme (no email no others)."*
            //
            // WHAT THE OPTION CARRIED. `searchAccounts` (web/lib/picker-sources.ts)
            // builds every account option through the one `accountOption` seam
            // — value, label, picture, `shape: "square"`, `face: true` — and
            // then adds a `hint` of its own: `[a.code, a.email].join(" · ")`.
            // `PickerOption.hint` is drawn by `RecordPicker` as a SECOND LINE
            // under the name, in `text-xs text-muted-foreground`. So a row read
            // "Bergström Handels AB" over "KW-0031 · info@bergstrom.se" — the
            // email and the "others" she named, and the only two things on the
            // row that are not the name.
            //
            // WHAT IT CARRIES NOW: the name, and the ROUND MARK BESIDE IT,
            // which is deliberately kept. A face is not "email and others" —
            // it is the same icon the accounts list, the app facet and every
            // other select in the app now draw, put there by her OWN ruling of
            // the same day ("for accounts include icon in select components and
            // filters", `accountOption`'s header). Two rulings from one person
            // on one day: one adds the picture, one removes the text. Taking the
            // icon out here would be answering the second by undoing the first.
            //
            // AND ONLY ON THIS FORM, because that is the scope of her sentence
            // — "in add/edit for tickets". Nine other dialogs ask the same door
            // for the same accounts and still show the hint, which is where the
            // code and the email earn their place: they are two of the three
            // fields the door SEARCHES, so a row that matched on an email
            // nobody could see looks like a wrong answer. That argument is
            // weakest exactly here, on a form where the person raising a ticket
            // already knows which client they mean. So the subtraction is a
            // `.map` at this call site rather than a flag on the shared
            // function: one screen changed, nine untouched, and no second way
            // to ask the accounts door.
            search={(term) =>
              searchAccounts(term, { type: "entity" }).then((rows) =>
                rows.map(({ hint: _hint, ...option }) => option)
              )
            }
            searchKey={pickerKey("companies", teamId)}
            emptyOption={{ value: NONE, label: t("Ours, no account") }}
            placeholder={t("Ours, no account")}
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
          from two call sites, not a second treatment invented here. AS CHIPS
          since 2026-09-07 ("horizontal pills instead of dropdown"), which
          changes the surface those three fields are drawn on and nothing about
          the fields: `RowChip` reads them in the same precedence the open list
          did. The options, the gate and the no-cap decision are all worked out
          above.

          THE FIELD KEEPS ITS SLOT WHEN IT HAS NOTHING TO OFFER, which is the
          same ruling the people row states at length: this form has a FIXED
          ORDER the client dictated field by field, and a row that appears and
          disappears inside a fixed order moves every field under it as somebody
          fills the form in. So it stays where it is and SAYS why it is empty,
          in the same sentence the module row one field down has always said
          about ITS app.

          AND SINCE 2026-09-09 IT SAYS IT IN THE SAME SHAPE. Client ruling, on a
          staging screenshot of this dialog: *"unify how to 'choose x first'
          looks. i prefer how currently is the modules. make the same for
          apps."* Both rows already said the identical sentence; they DREW it
          two different ways, and her screenshot is the pair side by side. The
          MODULE row below is a control-layout picker held `disabled` with its
          placeholder in it — a real select, visibly locked. THIS row is a chip
          row, and a chip row with no chips drew the sentence as a bare
          paragraph in the space the control should occupy: grey text floating
          in a column of form fields, which reads as a note ABOUT the form
          rather than as the form's own control, and which is 16px shorter than
          the chips that replace it, so every field below jumped the moment a
          client was named.

          NOTHING IS CHANGED HERE FOR IT, and that is the point. `RecordPicker`
          now draws its row-layout empty state in the control layout's own
          locked shell (`PickerShell`, off the shared `shellClass`), so "the app
          field looks like the module field" is one piece of geometry rather
          than two that agree on the day somebody wrote them. This call site
          still passes the same sentence it always passed; the ruling landed on
          the component both rows are built from. The App row, the Raised-by row
          below and any future one-row picker all inherit it — which is what
          stops the next gate from being a third drawing of one idea. */}
      {/* ── HER OTHER TWO RULINGS OF 2026-09-09 ARE ON THIS FORM TOO ─────────
          The Account picker directly above shows the NAME ALONE (its own note
          carries what the option used to carry and why the icon stayed), and
          the Closed tab's columns changed for the SECOND time that day — see
          `helpTabColumns`, web/lib/live-resources.ts.

          AND ON AN APP'S OWN SCREEN THERE IS NO QUESTION TO ASK. `fixedApp`
          means the form was opened from the app itself, so which system this is
          about is a fact about where you are standing — the prop's own note has
          always said the picker is "replaced by its name", and until today it
          was not: the row rendered anyway, `submit` sent `fixedApp.id` whatever
          it said, and the module list followed `fixedApp` too, so a person could
          press a different chip and change nothing at all. It is drawn as the
          name now, the same shape `fixedAccount` uses directly above and the
          same shape the sprint and story forms already use for this exact prop.
          It is also what keeps the gate honest: the app is known on that screen
          even when no client is, so a chip row asking for a client first would
          be refusing to state a fact it already has. */}
      <Field config={appField} htmlFor="help-app" className={fieldSpacing}>
        {fixedApp ? (
          <p className="text-muted-foreground text-sm" id="help-app">
            {fixedApp.name}
          </p>
        ) : (
          <RecordPicker
            id="help-app"
            layout="row"
            // Same wall, same answer as the type and people rows: a group of
            // chips is not a labelable control, so the name a screen reader
            // reads comes from the field's own config rather than from the
            // `<label for>` above it.
            ariaLabel={t(appField.label)}
            value={values.appId || NONE}
            onChange={(appId) => setValues((v) => ({ ...v, appId, moduleId: NONE }))}
            options={appOptions}
            searchPlaceholder={t("Search apps…")}
            emptyText={
              chosenAccountId || appAlreadyNamed
                ? t("No apps yet.")
                : t("Choose an account first.")
            }
            disabled={busy}
          />
        )}
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
          answers "which one is it" without moving anything.

          AND IT IS REQUIRED, which is what the config carries here: `typeConfig`
          is `typeField(typeRequired)`, so the `Required` marker at the row's
          trailing edge (form-shell.tsx puts it there — "title always left,
          required always right", her ruling of the same day) is drawn from the
          same boolean that disables Submit, and stands down on the two states
          that genuinely cannot answer. Nothing is preselected on a NEW ticket:
          the row opens with four unpressed chips and Submit refused until one is
          pressed, which is the honest picture of a question nobody has answered
          — and it is the reason the old black "No type" chip had to go rather
          than merely stop being the default, because a black chip at rest said
          an answer had been given. */}
      <Field config={typeConfig} htmlFor="help-type" className={fieldSpacing}>
        <RecordPicker
          id="help-type"
          layout="row"
          // The row is a `div role="group"`, not a labelable control, so the
          // Field's `<label for>` above cannot name it — the same wall the
          // description editor hits two fields down, answered the same way and
          // out of the same config, so the visible label and the spoken one
          // cannot drift.
          ariaLabel={t(typeConfig.label)}
          value={values.helpType}
          onChange={(helpType) => setValues((v) => ({ ...v, helpType }))}
          options={typeOptions}
          searchPlaceholder={t("Search types…")}
          // A ROW CANNOT SAY "nothing matched" — there is no search box in it —
          // so this is the state where the team's own `Ticket type` list is
          // EMPTY, every word deactivated on Settings › Tickets (the Choices
          // screen it used to name was retired on 2026-09-11). The same
          // sentence the triage card's row says about the same vocabulary.
          emptyText={t("Your team has no ticket types set up yet.")}
          disabled={busy}
        />
        {/* THE SIGNPOST POINTS AT THE MODULE, not at a wall of every group the
            team has — `tickets`, because the row above it is the `Ticket type`
            vocabulary and `MODULE_SETTINGS` puts that group on Settings ›
            Tickets (client, 2026-09-11, retiring the general Choices tab). */}
        <ManageDropdownsLink teamId={teamId ?? null} segment="tickets" />
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
          member, the button is greyed out") that this one would have echoed.

          AND IT IS REQUIRED (client, 2026-09-09: "title is required"), which is
          what `titleConfig` carries: `titleField(titleRequired)`, so the
          `Required` marker at the row's trailing edge — kit v1.2.71 owns that
          position, "title always left, required always right" — is drawn from
          the same boolean that disables Submit, and stands down on the one state
          that genuinely cannot answer, an imported ticket that arrived with no
          English title. The `<Input>` states nothing about this itself — the kit
          Field clones `required` onto its single child, so the attribute a
          screen reader reads, the word a sighted person reads and the button
          that refuses all come off the one boolean and there is nowhere for a
          fourth answer to live. */}
      <Field config={titleConfig} htmlFor="help-title" className={fieldSpacing}>
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
      <Field config={contactConfig} htmlFor="help-contact" className={fieldSpacing}>
        <RecordPicker
          id="help-contact"
          layout="row"
          // Same wall, same answer as the type row above: a group of chips is
          // not a labelable control, so the name a screen reader reads comes
          // from the field's own config rather than from the `<label for>`.
          ariaLabel={t(contactConfig.label)}
          // THE DEFAULT IS VISIBLE, WHICH IS THE POINT OF IT. `raisedByValue`
          // resolves the main contact for the row as well as for `submit`, so
          // the chip somebody would be agreeing to is the one already lit.
          value={raisedByValue}
          onChange={(raisedByContactId) => setValues((v) => ({ ...v, raisedByContactId }))}
          options={contactOptions}
          searchPlaceholder={t("Search contacts…")}
          emptyText={chosenAccountId ? t("No contacts yet.") : t("Choose an account first.")}
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
