# 6. Forms and dialogs (part 1 of 2)

*Split from [documents/UI-RULEBOOK.md](../UI-RULEBOOK.md) — moved verbatim, cut rather than copied.*

## 6. Forms and dialogs

### F1: every submit button says "Submit"

One word, every form, both front doors. This replaces 30 distinct labels currently in
use, including "Save changes" (13 sites), "Add it" (7), "Save" (4), "Create role",
"Add value", "Add source", "Add file", "Add contact", "Add account",
"Add step", "Record it", "Map it", "Start it", "Log it",
"Share it", "Send it", "Send it from kwapso", "Send and resolve", "Send invite",
"Ask and email", "Raise ticket", "Give access", "Save profile", "Email me a code",
"Continue", "Start my own team".

The busy label is "Submitting…" everywhere, replacing "Saving…", "Sending…",
"Creating…", "Adding…", "Sharing…", "Raising…", "Switching on…".

Implement by giving `FormShell` a footer it renders itself rather than by editing 37 call
sites one at a time. The library's own `Form` collection already defaults
`submitLabel: "Submit"` (`shared/ui/components/form/form.tsx`),
so this aligns the host with the library rather than diverging from it.

Evidence: `P-4.10.31` and `P-4.10.36`, the portal's New Ticket form. The button says
**Submit**, with **Cancel** beside it. It is the only form in either old app.

### F2: the dialog is a three-row grid and never spills

This fixes the reported bug directly. `shared/web/form-shell.tsx` currently renders a
flat `flex flex-col` with no height bound, so a tall form pushes past `DialogContent`.

```tsx
<form className="grid max-h-[85dvh] grid-rows-[auto_1fr_auto]" onSubmit={onSubmit}>
  <div className="flex flex-col gap-1.5 px-6 pt-6 pb-4">{title}{subtitle}</div>
  <div className="overflow-y-auto overscroll-contain border-t px-6 py-5">
    <div className="flex flex-col gap-4">{children}</div>
  </div>
  <div className="bg-card flex flex-wrap justify-end gap-2 border-t px-6 py-4">{footer}</div>
</form>
```

`85dvh` rather than `85vh` so the mobile browser chrome does not clip the action row.

Evidence: `P-4.10.31` (desktop: a fixed header, a scrolling body, an action bar pinned at
the bottom of the sheet) and `P-4.10.36` (mobile: the same, as a bottom sheet with a drag
handle and a sticky Cancel/Submit bar).

### F3: the separator becomes the action bar's top edge

The two `<Separator />` elements at `form-shell.tsx:40` and `:42` are replaced by
`border-t` on the two regions that follow them, as in F2. A hairline that is the top edge
of a padded bar can never collide with the button inside it, at any type scale. This
retires the `pt-6` workaround and its 11-line comment at `form-shell.tsx:43-53`, which
documents the collision being fixed here.

Note that `form-shell.tsx` is the only file in either front door importing
`primitives/separator`, so this change removes the app's last use of it. That is correct:
a separator is a divider between peers, and a form's action bar is not a peer of its
fields.

Evidence: `P-4.10.31`, `P-4.10.36`. The old form has no free-standing rule anywhere; the
bar's own edge does the work. Also the code comment cited above, which records the owner
reporting the collision on staging in August 2026.

### F4: Cancel sits beside Submit, and its position flips on mobile

> **AMENDED (2026-08-31): the shipped order is Cancel before Submit, right-aligned, and it
> does not flip on mobile.** The client's own pass over `FormShell`, verbatim: *"on
> add/edit - also put the cancel button there. I know I can click out, but also add it."*
> `FormShell`'s action bar (`shared/web/form-shell.tsx`) draws a real Cancel control for the
> first time, mirroring the kit's own `form.tsx` Cancel call site — `variant="cancel"`,
> rendered, in the file's own words, "BEFORE its submit button" — inside one row,
> `flex items-center justify-end gap-2`, the same order and the same alignment at every
> width. There is no responsive flip in the shipped shell: the old-app evidence below (this
> rule's founding source) described a mobile reversal this shell never drew, and the
> dated, sourced ruling above is the later and more specific fact. Read this note before
> acting on the paragraph beneath it.

Old rule, kept as history: desktop was Submit then Cancel, right-aligned; mobile was
Cancel left, Submit right, both `flex-1`.

Evidence for the old rule: `P-4.10.31` (desktop, Submit then Cancel) and `P-4.10.36`
(mobile, Cancel then Submit, each half-width). The old app deliberately reversed them, so
the destructive-ish option was never under the thumb's resting position on a phone — a
concern the shipped shell answers a different way instead (Cancel is `variant="cancel"`, a
quiet dismissal, never styled as the destructive action).

### F5: a field is label left, requirement right, control below

```tsx
<div className="flex items-baseline justify-between">
  <Label className="font-medium">{label}</Label>
  {required && <span className="text-muted-foreground text-xs">Required</span>}
</div>
```

Evidence: `P-4.10.31`, `P-4.10.36`. Every field in the old form carries "Required" as a
small grey word on the right of its label. This app currently marks required fields with
a `.required-ring` and no words.

**AMENDED 17 Sep 2026 — Fact rows for every form's fixed properties.** The client's ruling,
verbatim: *"Keep the fact rows, but make sure they appear everywhere."* One primitive
component `shared/web/fact-row.tsx` implements the label-left, fact-right layout for every
form's fixed, read-only properties (a record's own story, time, sprint, help, meeting, wave,
process, todo — the parent that opened the edit form). Where a form renders a `fact-row`
component with a `fixed` parent type, the layout is one line (label and value) with no
control, and the value sits inline with the label's own line, never below it like an
editable field. Derived test: `web/test/fixed-props-are-fact-rows.test.ts`.

### F6: a character-limited text field shows its counter under the input, right-aligned

`text-xs text-muted-foreground`, format `0/50`.

Evidence: `P-4.10.31`, `P-4.10.36`.

### F7: a short enumerated choice is a row of chips, not a select

Three to five options with a glyph each become pill buttons. Six or more stay a `Select`.

Evidence: `P-4.10.31`, `P-4.10.36`, the Type field: Request, Question, Issue as three
outlined pills, each with its type glyph. They wrap to two rows on mobile rather than
becoming a dropdown.

### F8: the form's explanatory note is a muted callout at the top, inside the scroll region

Never a floating tooltip, never a subtitle longer than one line.

Evidence: `P-4.10.31` (the "Please fill in all fields carefully…" grey box) and
`P-4.09.52`. See [C9](#c9-an-informational-callout-is-muted-not-coloured).

### F9: a dialog on a phone is a bottom sheet

Below `sm`, use the library `Sheet` with `side="bottom"` and a `rounded-t-3xl` top, not
a centred `Dialog`. Keep `FormShell` inside it unchanged, which keeps R4 satisfied.

Evidence: `P-4.10.36`, `A-3.58.16`. Both old apps present forms as bottom sheets on a
phone, with a drag handle.

### F10: a form is a slide-in; a warning is an overlay

**The rule.** The client, over a screenshot of the "New access token" dialog: *"This should
be a slide-in, like all the other screens. The only ones that are overlays are the
warnings, such as archive or delete, and so on."*

- A surface that **collects** — a form, an editor, a picker — is the kit's `Sheet`. It
  slides in from the inline end on desktop and, below 45rem, becomes the bottom sheet
  capped at 85dvh that [F9](#f9-a-dialog-on-a-phone-is-a-bottom-sheet) asks for.
- A surface that **asks a yes/no question about something that already exists** is an
  `AlertDialog`, centred.

**The rule is written the other way round from how you would read it**, and that is
deliberate: nothing tries to recognise a form, because a pattern that decides what a form
looks like has a hole the week somebody writes one differently. Instead **every centred
overlay** in either front door needs a written reason on file (`CENTRED_DIALOG_OK`). A new
form reaches for a `Dialog`, has no line, and is red on the day it is written. Detecting
the fault directly was tried first and found four of the five live cases — it missed a
picker outright, because a radio group and an onClick that writes is a form with no
`<form>` in it.

**What it costs.** The kit's own `presentation` prop looks like the answer and is not: of
its four values, `overlay` and `responsive` are both CENTRED on a desktop, `sheet` is a
bottom sheet on a 1920 monitor, and `fullscreen` is a page. So a centred overlay is a
finding whatever it carries, and the shape she asked for is a different component.

**And an exemption cannot be used to smuggle the thing back**: an exempt overlay that grows
form machinery — a `<form>`, a `FormShell`, a `<Field>`, an `<Input>` — turns the build red
where it stands.

**Two entries are open questions rather than settled exceptions**: a read-only usage panel
and a record calendar are neither forms nor warnings, and she has ruled on neither.

**Law.** [R59](../RULES.md) (`forms-are-not-overlays`).

---

### F11: staff is picked from a pill row, never a dropdown — and the signed-in user starts selected

**The rule.** The client's ruling, 15 Sep 2026, verbatim: *"On Add Task and generally
absolutely everywhere where we are selecting staff, do the horizontal choices, not the
dropdown. By default, in all of these where I'm selecting staff, always put the user
preselected by default."*

Every field that picks a team member — an assignee, an account manager, an app's staff and
lead, a ticket's stakeholders, who is on triage duty — draws through `StaffPillPicker`
(`shared/web/staff-pill-picker.tsx`), the same pill idiom [F7](#f7-a-short-enumerated-choice-is-a-row-of-chips-not-a-select)
already names, but unconditional: unlike a glyph choice, a staff list is never
"six or more, so fall back to a `Select`" — it wraps to as many lines as it needs and stays
pills whatever the team's size.

- **One person** (an assignee, a lead, an account manager): `role="radiogroup"` of
  `role="radio"` pills. **A staff picker never offers Nobody** — the client's second
  ruling, 16 Sep 2026, verbatim: *"Kill the 'nobody' option for staff. If we leave it
  empty, it's not an option. Remove it from tasks and everywhere else. This 'nobody',
  just kill it."* The component's own `allowNobody`/`nobodyLabel` props are gone, not
  merely unused — there is no click left inside `StaffPillPicker` that can clear a
  single-mode selection.
- **Several people** (an app's staff, a ticket's stakeholders): `role="group"` with
  `aria-pressed` on each pill. Already-set, un-removable people (R54's ADD-ONLY sets) show
  pressed and disabled rather than being left off the row.
- Every pill wears the person's own `RecordMark` (round — a person in their own right,
  never a client/app square) and their **first name alone**: a name disambiguated with an
  email in parens (two colleagues sharing a first name) keeps the face as the
  disambiguator on a pill, not a longer string.
- A→Z by name, locale-aware, called once inside the component — no call site can forget it
  ([K17](#k17-the-options-a-control-offers-are-a-to-z-in-the-readers-own-language)'s own
  seam).

**The default.** On a **create** form, the field opens with the signed-in user's own pill
already selected — `TaskFormDialog`'s pre-existing `defaultAssigneeId`, and the same shape
added to `StoryFormDialog`, `AccountFormDialog` (account manager) and `AppFormDialog`
(staff and lead both). An **edit** form keeps the stored value; the signed-in user is never
substituted for one that is already there — **except** where the stored value is itself
empty (an old row from before this field existed, or from before the 16 Sep 2026 "kill
Nobody" ruling), where the signed-in user is the fallback there too: the killed "Nobody"
pill left no other state for an edit to open on, so `AppFormDialog`'s Lead field falls back
further still, to the first staffed person, when the signed-in user is not themselves
staffed on that app. An **action row that commits on the click** —
`TriageStrip`'s on-duty pick, the triage queue's own "who is picking this up?" rows (already
`RecordPicker`'s `layout="row"`, unaffected by this law) — has no submit step to preselect
into, so nothing there is preselected: a pill that looked already-chosen would be a click
that does nothing.

**Evidence.** The task form's own field ("Who's doing it") was the client's named example;
the account manager field, an app's staff checklist and lead, and a ticket's
`HelpStakeholders` add control were four more dropdowns/checklists this ruling converted
the same day.

**Reiterated, 16 Sep 2026, verbatim:** *"By default, every time they have to assign it to
someone, it needs to preselect the active user. For example, on the add story, it should
preselect the active user at the bottom."* An audit of every create form with a staff field
(task, story, account manager, an app's lead/staff) against every one of its call sites
found the four dialogs themselves already correct — including the story form's own
assignee, which already sits at the bottom of the form and already opens on the signed-in
user — but one CALL SITE had never been wired: `contact-detail.tsx`'s own
`<AccountFormDialog>` (the contact screen's edit dialog for the same account record
`account-detail.tsx`'s edit dialog already gets right) opened with no
`defaultAccountManagerId` at all, so an account with no manager on file opened this dialog
with nobody selected. Fixed the same day, and held down by a second census,
`web/test/staff-preselect-call-sites.test.ts`, over the CALL SITES rather than the dialogs'
own bodies: every `<TaskFormDialog>`/`<StoryFormDialog>`/`<AccountFormDialog>`/`<AppFormDialog>`
mount in `web/` must pass its dialog's `default*Id` prop. Three forms an assignment-shaped
field was checked for and genuinely has none — a ticket (routed through Triage's own
on-duty pick, already an action row this law exempts), a to-do/Input (addressed to a
client's account, never to a team member) and a meeting (no staff-attendee field at all) —
are out of this law's population, not a gap in it.

**Law.** [R79](../RULES.md) (`staff-pill-row`). A static census, `web/test/staff-pill-row.test.ts`:
no `<Select>` and no `<RecordPicker>` without `layout="row"`, on either front door, may be
fed a staff/member list (traced off `useAssignableMembers`/`assignableMembers`/`staffedOn`,
or a value typed `PickablePerson[]`) — including through a local picker-factory closure,
whose own JSX never names the list by its caller's variable.

---

### F12: a form carries no hints

**The rule.** The client's ruling, 16 Sep 2026, verbatim: *"You put too many explanations
and hints that are not necessary, especially on the forms, on the create and edit. Please,
can you delete all of that? I will give you a few examples, but I want you to clean it
everywhere. If we need hints, I will tell you explicitly, but by default, there are no
explanations, just the choice, text, or the form components."* Her two named examples were
both `FieldConfig.helpText` sentences: *"The system this work is on. Everything below is
narrowed by it."* (the story form's App field) and *"A recording, a page, a document
somebody can open."* (the story form's and the review dialog's file field). A create/edit
form shows the label and the control, nothing else — the label already says what a field
is.

- No `FieldConfig` object (`{ ...defaultFieldConfig, … }`) may set a non-empty `helpText`.
- No bare `<p>` sitting between a form's fields may hold one static explanatory sentence
  (`{t("…")}`, three words or more, `text-muted-foreground`).

**What survives, on purpose.** A validation/refusal message, shown only on a bad state
(`text-warning`/`text-destructive`, never `text-muted-foreground`); a placeholder that is
the field's own example value; a picker option's own differentiating description (`Choice`'s
`description` prop, telling two options apart — the choice's own words, not an explanation
of the field); and a field showing the record's own settled value where a control would
otherwise be (the "fact, not control" pattern — [F5](#f5-a-field-is-label-left-requirement-right-control-below)'s
own shape, one line with nothing to choose). A loading indicator ("Reading what's
attached…") is a status, not a hint, and is named in `FORM_HINT_OK` rather than taught to
the census as a fourth colour to special-case.

**What it costs.** Forty-nine `helpText` hints and a dozen bare-paragraph captions came out
across both front doors in one sweep — an account's own contacts panel that read "Nobody is
on this account's books yet.", a knowledge source picker that read "Nothing found in your
Google account.", a process step's Role field that explained why it had no roles to offer.
None of it was wrong information; all of it was a sentence the label and the empty control
already said without words.

**Law.** [R81](../RULES.md) (`form-carries-no-hints`). Two static censuses,
`web/test/form-hints.test.ts`, over the same `appFiles()` walk R33's
`wrapped-strings.test.ts` stands on: no `FieldConfig` literal sets a non-empty `helpText`,
and no file that renders a form (imports `FormShell`/`FormShellDialog`) draws a bare `<p>`
whose entire content is one static translated sentence. `FORM_HINT_OK`
(`shared/rules/registry.ts`) is the reasoned, rot-checked way out — empty, and meant to
stay that way, except for the one shape her own ruling names as a real exception: a hint
carrying something the user cannot know otherwise belongs in the CONFIRM dialog that asks
about the action, never the create/edit form beside it.

### F13: every create form with a staff picker preselects the signed-in member — everywhere, not just where it was checked

**The rule.** The client's ruling, 16 Sep 2026, verbatim: *"That's still not correct. For
example, on Add Story, I don't see myself preselected. Make sure you fix it everywhere, not
only here."* [F11](#f11-staff-is-picked-from-a-pill-row-never-a-dropdown-and-the-signed-in-user-starts-selected)
already states the rule; this ruling is the correction that the POPULATION it applies to
must be derived, never a hand-list somebody forgot a form on. Every create form with a
single-pick staff picker seeds the signed-in member as its default. The signed-in member is
ALWAYS OFFERED in the pill row even when the chosen app's staffing narrows everyone else out —
that was the actual Add Story gap on the Kwapso team: `staffedOn` (web/lib/members.ts) now
keeps the signed-in member; the story form and the ticket triage row use it.

**The check.** The population is DERIVED, not typed: `web/test/staff-preselect-call-sites.test.ts`
censuses every `*FormDialog` mount carrying a `default*Id` prop and requires it be passed at
every call site, over the call sites rather than the dialogs' own bodies — the shape that
caught `contact-detail.tsx`'s own `<AccountFormDialog>` opening with no
`defaultAccountManagerId`, the one call site among four that had never been wired. The
signed-in member's presence is verified by `web/test/assignable-members.test.ts` and
`web/test/story-form-scopes-to-the-tickets-app.test.tsx`.

**Law.** [R79](../RULES.md) (`staff-pill-row`) — see F11's own account of the census.

### F14: the automation sheet has no close button, and reads Module (with icon) above Description

**The rule.** The client's ruling, 16 Sep 2026, verbatim: *"That's kind of good. Remove the
X button to close it and put the module first, and underneath the description."* The
automation edit/view sheet closes by clicking the backdrop or pressing Escape, never a
drawn ✕. Its head reads the Module (with the module's own icon) first, and the Description
sits beneath it — the reverse of the order it shipped in.

**Law.** None registered.

### F15: once an account is chosen, the app field becomes a horizontal pill row of that account's own apps

**The rule.** The client's ruling, 16 Sep 2026, verbatim: *"when selecting app in cases
account has been selected first, show horizontal choice componet."* Where a form picks both
an account and an app, choosing the account first turns the app field into a pill row —
that account's own apps, each carrying its mark — instead of the plain picker
(`web/components/records/account-app-picker.tsx`). With no account chosen yet, the field
stays the existing picker; with an account chosen that has no apps of its own, the field
shows nothing and no hint explaining why (R81 — a form carries no hints).

**AMENDED 17 Sep 2026 — the app choice stays optional.** The client's ruling, verbatim:
*"When I'm asking a client for something under which account, it is optional to select an
app. Remember, when we already selected an account, this app choice must be in a
horizontal component."* Confirms the shape above and settles what it left open: the app
field is never required — a form may submit with an account chosen and no app picked —
the horizontal pill row it becomes once an account is chosen is still that same optional
field, never a forced choice.

**Law.** None registered — `AccountAppPicker` is a form field, held to R81 like any other.

### F16: an account picker on any add screen shows the account's icon and name, and nothing else

**The rule.** The client's ruling, 17 Sep 2026, verbatim: *"On all add screens, when I'm
picking an account, do only show me the icon and the name, no email or anything else."*
Every create form's account field draws the account's mark and its name, and drops every
other fact a picker option might otherwise carry — an email, a code, a status — the same
face-only reading [R35](../RULES.md) already asks of any record shown anywhere.

**Status: ruled, in build, 17 Sep 2026.**

**Law.** None registered — held to [R35](../RULES.md) (`records-carry-their-face`) like any
other record picker.

### F17: once an account is chosen, who a ticket gets assigned to is a horizontal pill row of that account's own contacts

**The rule.** The client's ruling, 17 Sep 2026, verbatim: *"Also, I want to be able to
select who this gets assigned to. Of course, it needs to filter the contacts of this
account, including the avatar and full name, in a horizontal choice component with
pills."* Once an account is chosen on a form that asks a client for something, the
assignee field is a horizontal pill row —
[F11](#f11-staff-is-picked-from-a-pill-row-never-a-dropdown-and-the-signed-in-user-starts-selected)'s
own pattern, read onto a different roster — narrowed to that account's own contacts, each
pill carrying the contact's avatar and full name. With no account chosen yet the field has
no roster to filter and stays the existing picker, the same fallback
[F15](#f15-once-an-account-is-chosen-the-app-field-becomes-a-horizontal-pill-row-of-that-accounts-own-apps)
takes for the app field beside it.

**Status: ruled, in build, 17 Sep 2026.**

**Law.** None registered.
