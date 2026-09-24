# 5. Buttons and actions (part 2 of 8)

*Split from [documents/UI-RULEBOOK.md](../UI-RULEBOOK.md) — moved verbatim, cut rather than copied.*

### B11: a settings area gets one aggregate tab per cross-module concern

**The rule.** Beside each module's own scoped settings ([B10](#b10-a-modules-settings-have-two-entrances-and-one-page-behind-them)),
Settings draws ONE tab per CROSS-MODULE concern the client asked to see gathered in one
place — every automation in the system, filtered by module and status; every choice value
in the system, together, as a table — never a second, competing home for the same concern.

*Automations*, client, 2026-09-14: *"On Settings, add a tab for Automations and show all
the automations in the system, filtered by module and by status."* One mounting answers
it: the same `ModuleAutomations` (`web/components/screens/module-automations.tsx`) a
module's own settings page mounts with `scope: { kind: "module", segment }` is mounted once
more on the Automations tab with `scope: { kind: "all", modules }`, reading the identical
`AUTOMATIONS` registry and the identical `moduleSettingsIndex(can)` gate — never a second
list built by hand.

*Choices*, client, 2026-09-14, pointing at the Contacts table: *"create a tab in settings
with choices where we see all the choices together… the value itself · module with the
icon · status: active, inactive, and are protected."* `SettingsChoicesPanel`
(`web/components/screens/settings-choices-panel.tsx`) answers it — reading the SAME door
and the SAME cache key (`tenancy.selectable()` under `selectable:<teamId>`) every module's
own `SelectableScreen` already opens, so an edit on a module's own page is seen here live
(R56). It is a NEW component rather than a third mounting of `SelectableScreen`: the shape
asked for is a table with three named columns, not the grouped lists and chip walls
`SelectableScreen` draws. What is shared is the fetch and the door's own idea of what a
value IS; what differs is the presentation.

**The shape repeats even where the component does not.** Automations reuses one component
under a second `scope`; Choices reuses one door under a new presentation component. Both
answer the same brief B10 already answers twice over — a reader who wants the whole
picture across every module never has to open each module's settings page in turn — and
both are gated the identical way B10 already is: `moduleSettingsIndex(can)`, never a second
`can(` call.

**AND THE MODULE-SCOPED HALF IS THE SAME COMPONENT TOO, 15 SEP 2026.** `SettingsChoicesPanel`
took a `scope` prop the day after it shipped — B10's own module-settings page mounted
`SelectableScreen` (the grouped-list/chip-wall editor) for its own "Choices" tab, one editor
for the general table and a different one for every module's own narrowing, which is exactly
the second-editor drift B10's header already refuses ("never a second editor"). `scope`
narrows `modulesWithChoices` to one page's segment, drops the now-redundant Module column and
its filter facet (the page's own tab strip already says which module), and hands the create
dialog that one module's `types` directly rather than asking a question with one answer —
same table, same door, same cache key, two scopes. `SelectableScreen` is retired
(`GONE_ON_PURPOSE`, `shared/rules/registry.ts`).

**A CHOICE THAT IS NOT `selectable_data` GETS ITS OWN ADAPTER, NOT A FORCED FIT.** The
client's ruling on Meetings, same session: *"purpose is a choice component, so make sure you
move it inside meetings, settings, choices. And maybe you find another word for
'purposes.' … Maybe just 'type.'"* Meeting types (`meeting_purposes`, its own table — a
department per row is the one thing a dropdown value cannot carry) cannot be forged into a
`selectable_data` row, so `MeetingTypesPanel` (`web/components/team/internal-screens.tsx`) is
the smallest adapter: the SAME design (a `RecordTable`, one filled create circle, no emoji)
over a different door, mounted from the `meetings` page's own `choices` section
(`ModuleSettingsSection`'s third `kind`, `"meetingTypes"`, beside `"vocabulary"` and
`"automations"`) — sharing the "Choices" TAB with a vocabulary section without sharing its
component. The standalone Purposes screen this replaced is off the Meetings screen's nav
(`SECTION_HOSTED_ELSEWHERE.purposes`, `shared/rules/registry.ts`) — DB table, columns and API
paths unchanged, only the word ("Meeting purpose" → "Meeting type") and the door into the
editor moved.

**Automations status colours, 2026-09-15:** Every automation status draws its own colour,
shared with Choices — **protected** renders as ink (inverse), **active** renders as success,
**inactive** renders as outline (`AUTOMATION_STATUS_VARIANT`, `web/components/screens/automation-edit-sheet.tsx`).
A row in the Automations list opens a DETAIL sheet showing the automation (chip above title,
Edit pencil top-right like a record head, description, module), and tapping Edit swaps the
same sheet to the form mode for editing.

**AMENDED, 16 Sep 2026, same evening — the filled pill above is a dot now.** The client's
ruling, verbatim: *"For automations, let's change the full color pill to also be a dot.
Inactive gets gray, and active gets green."* Read the same session as *"All dots are always
solid, not rings."* The Automations list's status cell (`module-automations.tsx`'s own row
mapper) now draws `<Badge variant="status" dot={AUTOMATION_STATUS_DOT[status]}>` in place of
the filled `AUTOMATION_STATUS_VARIANT` pill: `shipped` (green) for Active, `archived` (grey)
for Inactive — both her exact words — and `building` (charcoal) for Protected, which she did
not name (flagged in `automation-edit-sheet.tsx`'s own header for her next pass, and see
D17). **This is scoped to the Automations LIST only** — the Choices table's own status cell
(`deep-link/shape.tsx`) still draws the untouched filled pill through
`AUTOMATION_STATUS_VARIANT`, a different screen, out of this ruling's reach. K31's Contacts
Portal column moves to the identical dot shape the same session; see K31's own amendment.

**Badge status fill (16 Sep 2026):** *"go for the kit fix"* — client. The `status` variant never drops its neutral fill; the dark-mode "building → mango" clause is gone (kit v1.2.96).

**Badge dot gap (17 Sep 2026):** Kit v1.2.102: the `Badge` component's dot variant carries
its own `gap-1` between the dot and its label, independent of size. Automations and Contacts
both use the dot badge now; both benefit from the unified gap. `web/test/badge-dot-gap.test.tsx`
asserts every size variant (`sm` / `md` / `lg`) renders the gap consistently.

**AMENDED 17 Sep 2026 — Dots like everywhere else.** Choices and meeting-type status now
draw the status dot from `AUTOMATION_STATUS_DOT` — green for active, charcoal for protected
(meeting type only), grey for retired (Choices) or inactive (meeting type). The Choices
table's own status cell (`deep-link/shape.tsx`) and the meeting-type settings panel now draw
`<Badge variant="status" dot={AUTOMATION_STATUS_DOT[status]}>` in place of the filled
`AUTOMATION_STATUS_VARIANT` pill, matching the Automations list's own shape. `web/test/automations.test.ts`
and `web/test/shape.test.ts` assert the dot use.

**Re-explained, 16 Sep 2026, pending her validation.** Both the Automations tab and the
Choices tab above were walked through with her again, over a side-by-side artifact
("Automations and Choices Explained"). Nothing in this section changed as a result — the
walkthrough confirmed the shape rather than correcting it — but she has not yet signed off,
so treat both as awaiting validation rather than closed until she does.

### B12: settings changes preview first and apply on Save, through the pinned bar

**The rule.** *"We need some kind of hint or flag, very visible, probably not at the
bottom, that allows me to save or to restart… however we call it normally in UI, to not
save the changes."* — client, 14 Sep 2026, over a screenshot of Settings › Appearance and
Settings › Team › Roles — both already staged a draft behind a Save button, Roles with no
way to back out at all. Her own design lane built a five-option comparison artifact against
that sentence and she picked the first, **Option A: a quiet band pinned directly under the
tab strip**, reusing the idiom the app's own collection toolbar already pins with (R63)
rather than a fourth kind of sticky chrome.

**The affordance is the kit's `UnsavedChangesBar`** (`shared/ui/components/unsaved-changes-bar/`,
v1.2.82) — `dirty` / `onSave` / `onDiscard` / `saving?`, every string a prop, nothing
rendered at all while `dirty` is false. Adopted on two screens:

- **Settings › Appearance** (`shared/web/appearance-panel.tsx`) — Size, Appearance
  (light/dark) and Background stage a PENDING value each; `AppearancePreview` renders the
  pending three, and nothing outside the tab moves until Save — the real font size, the
  real `data-theme`, the real rail colour all keep showing the SAVED three until she
  presses it. **Save** commits whichever of the three actually changed, in one pass — the
  same two persistence doors (`saveScale`, `saveSpine`) and the same device-local write
  (`applyThemeMode` + `localStorage`) this panel always called, just called once, from one
  place, instead of once per press. **Discard** sets all three pending values back to
  saved; nothing is sent anywhere.
- **Settings › Team › Roles** (`web/components/team/roles-matrix.tsx`) — the whole
  permission grid stages every switch behind Save, the way it has since the matrix
  shipped, but with no way to back out short of un-toggling each cell by hand: the design
  lane's own artifact named it outright, *"there is no Discard control on Roles today."*
  The bottom Save button — invisible on any viewport shorter than the whole matrix, the
  same "probably not at the bottom" complaint the bar exists to answer — is gone; `save()`
  is unchanged, only what calls it moved. **Discard** is new, and it is the draft's own
  reset, not a door call: `discardDraft` rebuilds the same `server` object the
  reconciliation effect already computes — the last-saved value of every active role's
  sheet — and writes it straight back over `draft`.

**Both are inert with nothing staged** (`dirty` false) — a Save that would do nothing is a
lie about state, so the row disables both rather than leaving a press with nothing to
commit.

**The one documented exception, in her own words: *"keep language instant."*** Language is
the fourth section of the Appearance panel and stays wired the way it always was — applied
and persisted the instant a pill is pressed, never staged, never part of `dirty`, untouched
by Discard. Put to her plainly before it shipped that way: the preview shows a chip, a
title and a lorem body, none of which read differently in another language, so staging
Language would show her nothing changing while she waited to press Save — the one control
where "preview it first" has nothing to preview. Recorded here as a decision rather than
left to read as an inconsistency the next reader notices between Language and its
neighbours.

**Switching a Settings tab while a panel is dirty asks first.** The tab strip's own
`onValueChange` is intercepted by one guard (`handleTabChange`,
`web/components/screens/settings-screen.tsx`): when the CURRENT tab is staged and dirty,
the switch does not happen yet — [R59](#f10-a-form-is-a-slide-in-a-warning-is-an-overlay)
(a yes/no warning is the one centred overlay) says this is the kit's `AlertDialog`, never a
second sheet sliding over the first, and the two answers are "Keep editing" (focused by
default, the safe answer) or a destructive "Discard your unsaved changes?" that runs the
tab's own Discard path before switching.

**The navigate-away half, closed 2026-09-15.** Staging a draft behind this bar answers "what
happens if I press Save or Discard" — it does not by itself answer "what happens if I leave
without answering either." Switching the Settings TAB while dirty already asked first
(`settings-screen.tsx`'s own `handleTabChange`); LEAVING Settings altogether — a nav-rail
press, an `<InAppLink>` to a record, closing the Settings tab in the workspace strip, or the
browser's own Back — used to unmount a dirty panel in silence, because none of those seams
had ever heard of the tab guard's private `dirtyTabs` map. `web/lib/unsaved-changes.ts` is
the one registry both now read and feed (`markDirty`/`isDirty`/`anyDirty`), and
`web/lib/nav.ts`'s `guardNavigate` is what asks before ANY navigation is allowed to unmount
whatever is showing — called from `softNavigate` itself and from `go()`
(`deep-link-screen.tsx`, registered as `hostGo`), which is what actually reaches a nav-rail
press or a workspace-tab close, since both call `go` directly rather than through
`softNavigate`. The one dialog (`<UnsavedChangesDialog>`,
`web/components/shell/unsaved-changes-dialog.tsx`) is raised locally by the tab guard and,
for a real navigation, by `<UnsavedChangesDialogHost>` — mounted once in `web/app/layout.tsx`
beside `<Toaster />`, because `guardNavigate` is a plain function with no dialog in hand, the
same shape `toast()` already uses. The browser's own Back is guarded too
(`use-host-nav.ts`'s `useUrlRoute`, which cannot `preventDefault()` a `popstate` and instead
puts the address bar back and asks). Opening a new workspace tab (`openInNewTab`, R74) never
asks — it does not leave the tab you were on — and a `beforeunload` listener covers closing
the browser tab or reloading outright, registered only while something is actually dirty.

**Not a LAW yet, on purpose.** A census could ask "every consumer of the kit's
`<UnsavedChangesBar>` calls `markDirty`" — the shape every other derived rule in this base
takes — but the real wiring is one file removed from the bar itself: `AppearancePanel` and
`RolesMatrix` each render the bar and expose `onDirtyChange`, and it is their CALLER
(`settings-screen.tsx`) that turns a press into a `markDirty` call, through a plain prop with
no marker a source scan can follow back to its origin. With exactly two callers, both wired
by the same hand in the same change, a check built to "derive" that link would really only be
restating two facts this file already asserts in prose — the dishonest shape the brief that
closed this gap warned against, not a rule that could catch a THIRD panel wiring the prop to
a `console.log` instead. Revisit this the day a third staged panel exists: two real call sites
sharing one traceable pattern is what a positional census (R20's own shape) needs to be worth
writing.

**Code.** `shared/web/appearance-panel.tsx` (the staging), `web/lib/unsaved-changes.ts` (the
registry), `web/lib/nav.ts` (the guard), `web/components/shell/unsaved-changes-dialog.tsx`
(the one dialog and its host).

**The bar's colour is warning-tinted, not the container's own tone (2026-09-15).** The client's
ruling, verbatim: *"the 'You have unsaved changes' pinned bar at the top had a different
color. Please implement that because right now it's in the same color as the container,
which makes it not so visible."* The bar renders as `bg-warning/10` plus a warning hairline
(`UnsavedChangesBar`, kit v1.2.84), a distinct warning-tinted band in both light and dark
palettes, never the container's own surface tone. This styling is enforced by the kit
component itself — no app-side law required.

**AMENDED 17 Sep 2026 — the language exception is retired; native names only; a taller,
truer preview.** Three of the client's rulings, one session, all over this same tab.
First, over the panel's own Languages row: *"In Settings > Appearance > Languages, only
put the name of the language in its original language. You don't need to also put it in
German."* Each pill used to carry its own name and its English name beside it wherever
the two differ; the second name is gone. Second, reversing this rule's own documented
exception above: *"Too many descriptions everywhere. Delete these live preview updates as
you press a control, and also delete the language changes right away. ... Actually, I
want everything to wait for the save. Nothing changes right away."* **"Keep language
instant" held for three days and is retired**: `LanguageSection`
(`shared/web/language-section.tsx`) no longer calls `setLang`, no longer calls `save`, no
longer shows its own toast — it is a plain controlled pill row now, `value` the PENDING
language, staged behind Save exactly like Size, Appearance and Background, folded into the
same "Saved."/"That didn't save. Try again." toast the other three already share. Third,
over the panel's own preview card: *"I want the preview ... to be slightly taller ...
represent more of the real look of the app and include more elements inside, not just one
kind of card."* `AppearanceTabPreview` now draws the rail, a two-tab strip, and one card —
a title row, a toolbar bar, a three-row list with a status dot each and one count badge —
inside one paper container, in place of the single kind of card it drew before.

**Tests:** `web/test/settings-appearance.test.tsx`, `web/test/language-switcher.test.tsx`.

**AMENDED AGAIN 17 Sep 2026 — the Appearance preview becomes a full-page artifact, multiple
options, and her pick is P1.** Reviewing the taller preview card above, the client's
ruling, verbatim: *"Good, the language part. However, I'm not happy with the
pre-visualization. Please create an artifact with multiple options and include the whole
settings page, like if it was a screenshot of the full page, not only this component."* A
follow-up artifact was built showing several full-page mock-ups of Settings › Appearance —
not a card-sized preview, the whole screen as it would actually render — and her pick,
verbatim: *"appearance p1"*. `AppearanceTabPreview` is superseded by whichever full-page
layout Option P1 draws; the staging mechanics above (Size/Appearance/Background/Language
behind Save, Discard, the tab-switch guard) are unchanged by this amendment — only what the
preview itself shows changes, from one card to the whole screen.

**Status: ruled, in build, 17 Sep 2026.**

### B13: a protected value is always active — there is no such state as "active, protected"

**The rule.** *"if it's protected, it's always active, so you don't need to put active
protected, just protected."* — client, 14 Sep 2026, over Choices' own status column.
Protection and activity are not two independent flags a reader reconciles by hand: every
screen that shows the state draws ONE word, `Protected`, standing in for the whole thing,
mutually exclusive against `Active`/`Inactive` (`settings-choices-panel.tsx` — its own
header: "every Protected row IS an Active
row, so a second facet asking 'is it protected?' beside a Status facet that already offers
'Protected' as one of its three values" would draw a state that can never match a real
row).

**The door.** `setSelectableActive` already refused to deactivate a protected, active value
(409 `default_value`) before this ruling. The gap was the other order: deactivate a value
first, while it is not yet protected, then protect it, and the row ended up protected AND
inactive with neither door ever having refused either half. `setSelectableDefault`
(`workers/tenancy/src/lib/selectable.ts`) closes it — protecting a value now REACTIVATES it
in the same call, on the same idempotent UPDATE R17 already asks for (a single
current-state predicate, `is_default <> ? OR (protecting AND still deactivated)`), rather
than a second refusal a caller has to route around before protecting something. Migration
`0088_a_pictograph_is_not_a_mark_and_protected_is_always_active` backfills every row the
old two-step gap could already have produced.

**The check.** `workers/tenancy/test/selectable-protected-active.test.ts` already proves
both directions — against a real `node:sqlite` schema rather than a mocked door, because
the invariant lives in a hand-written SQL `UPDATE ... WHERE` predicate a mock would accept
whether or not it was correct. This law is that check's own account, not a second one
written beside it.

**Law.** [R76](../RULES.md) (`protected-is-active`).

### B14: a toolbar button is always a filled circle; the CREATE button is mango; the gear and every other icon button are beige

> **SUPERSEDED ON COLOUR, 16 Sep 2026 evening — the CREATE button is black now, not
> mango.** The client's ruling, verbatim: *"Let's revisit the rule of only one mango
> button per screen. Only mango buttons on the title level. Title means the title
> component on top. Only those can be mango, the others black."* A toolbar is never
> the title component (see B17), so `AddButton` (`web/components/deep-link/
> screen-bits.tsx`) draws `variant="inverse"` now — the SAME beige-adjacent black
> the settings gear already used, not the mango this section's own next paragraph
> describes. The SHAPE below (filled circle, gear and every other icon button
> `secondary`) is unchanged; only the CREATE button's colour moved, from the
> library's bare `default` to `inverse`. Registered as R84.

**The rule, as it stood before 16 Sep 2026.** *"The settings gear should never be mango.
Make it with a beige background."*
— client, 15 Sep 2026, over a screenshot of Tasks' heading where the gear was drawn with the
default mango fill. The CREATE button ("`+`" `AddButton`, `web/components/deep-link/screen-bits.tsx`)
was the one mango control in a toolbar row (`buttonVariants({ size: "icon" })`, the library's
bare `default`). The settings gear and every other toolbar icon button draw `variant:
"secondary"` — the beige filled circle (`--btn-secondary-fill`), the same background the
member page's pencil edit button uses. Every gear mount (module headings, Team toolbar) draws
through this one function (`ModuleSettingsGear`,
`web/components/screens/module-settings-screen.tsx`), so fixing the one function fixes every
toolbar it appears on at once.

**Law.** R84 (`mango-in-title-only`), `web/test/mango-title-only.test.ts` — the CREATE
button's own colour is covered there now. The gear/beige shape one paragraph up is still not
a registry check of its own, for the same reason it never was (a census over every icon-only
`<Button>`/`buttonVariants` call, keyed to whether it sits inside a toolbar, would need to
derive a shape rather than a colour): written down so the next toolbar icon button is built
to this shape from the start.

### B15: on a member's head, Change role sits in the same three-dot menu as Remove

**The rule.** The client's ruling, 16 Sep 2026, verbatim: *"Move the change rule also to
the three buttons."* — read as "the three-dot menu," the same menu D6 already sends every
action to beyond a title's first two buttons. "Change role" joins Remove there, sharing
that action's own handler; the row's own dedicated button for changing role (D13's "one
pencil for change") stays where it is — this ruling is about the member's own detail head,
not the row.

**Law.** None registered.

**AMENDED, 16 Sep 2026, same day — the row's own "Change role" button was a second copy of
the same act.** The client's ruling, verbatim, over a screenshot of the row still carrying
its own "Change role" button NEXT TO the ⋯ menu that already held it a second way: *"why is
it then two times? Keep only the button on the three buttons, not behind the edit. It
should only be on the three buttons."* A prior session had added "Change role" to the
three-dot menu ALONGSIDE the row's own button rather than instead of it — read at the time
as "also," which is exactly the "two times" this rules out. `member-screen.tsx`'s
`buttonActions` now excludes BOTH `members.remove` and `members.changeRole` from the row;
neither ever renders as a row button again, and both live only in the ⋯ menu, sharing the
identical handlers the row buttons used to call. D13's own head **edit pencil** (the record's
generic edit affordance, unrelated to Change role) is untouched by this correction — "not
behind the edit" names what she does NOT want duplicated, not what should be removed.

### B16: Settings' top-level strip is Appearance · Members · Roles · Integrations · Modules · Automations · Choices

**The rule, as it stood before 16 Sep 2026, evening.** The client's ruling, verbatim: *"In
settings, split into tabs: members and roles. Roles deserve their own tab."* The first build
read this as a NESTED strip — a "Team" tab still on the outer row, with Members/Roles one
level down inside it.

**AMENDED, same evening — that reading was wrong.** Her correction, verbatim: *"You got this
wrong. I don't want two tabs under Team. Let's replace Team on the top level of tabs with
Members and Roles."* "Team" comes OFF the outer strip entirely, and Members and Roles take
its place, in that order — never a nested strip under either (`no-handrolled-toggles` stays
satisfied the same way: nothing replaces the strip that is gone, because Members and Roles
simply ARE two of the doors on `tabsConfig`). The outer row goes from five tabs to seven:
**Appearance · Members · Roles · Integrations · Modules · Automations · Choices**. Each
panel still owns its own reads, toolbar and dialogs; each of Members/Roles carries its own
R16 count directly on the outer strip. `?tab=team` is kept as an ALIAS, landing on Members —
a saved link or a stale remembered tab still opens the screen rather than rendering nothing.
This screen is still the only door to member management (change role, remove a member,
revoke a pending invite — R64, `sections-have-a-door`); "This team," the list that used to
link into the team area's own screens, is gone (2026-09-14), and those screens are reached
only from here now.

**Law.** None registered — a `TabsView` reshape, held to the library-tabs rule (R3) like any
other collection tab strip.

### B17: mango lives only in the title component; every other button is black

**The rule.** The client's ruling, 16 Sep 2026 evening, verbatim: *"Let's revisit the rule
of only one mango button per screen. Only mango buttons on the title level. Title means the
title component on top. Only those can be mango, the others black."* This retires B14's own
"the CREATE button is mango" (marked superseded above) and every other mango control this
app had scattered across a screen on the strength of the vendored kit's own "one mango per
view" (`shared/ui/docs/RULES.md` §2.5) — that rule capped the COUNT; this one restricts the
POSITION.

**The title component, named.** On a COLLECTION screen it is `CollectionHeading`
(`web/components/records/collection-heading.tsx` and `web-portal/components/
collection-heading.tsx` — same name, same shape on both front doors: the display-m heading
plus its own `action` prop, the screen's one door, deliberately not the toolbar's). On a
bespoke RECORD DETAIL it is `RecordScreen`'s own `actions` prop
(`web/components/records/record-chrome.tsx`, B1: "at most one primary and one secondary
button" share the title's own row). On the five recipe-driven details (`team.detail`,
`members.detail`, `invites.detail`, `brand.detail`, `purposes.detail`) it is the kit's own
`RecordDetail`/`RecordChrome` (`shared/web/screen-engine/screen-renderer.tsx`). Everywhere
else — a toolbar's own create button, a dialog's Save/Create, a sheet's footer, a card, an
empty state's "Add the first," a form — is `variant="inverse"`, the kit's own black
(charcoal fill, off-beige label), the same tone `recordNumber`'s "the black chip is always
the ID" already uses.

**What moved, in one sweep:** the three shared seams — `FormShell`'s `SubmitButton`, every
form on either front door; `screen-bits.tsx`'s `AddButton`, every toolbar create button
(B14, above); `collection-frame.tsx`'s `createActionButton`/`CollectionEmptyState`, every
collection's icon create button and its "Add the first" — and twenty-seven individual
dialogs, sheets, list rows, cards and forms across both front doors.

**Law.** R84 (`mango-in-title-only`), `web/test/mango-title-only.test.ts` — a static census
over every `<Button variant="default">` (stated or omitted, the kit's own mango default),
walked for an ancestor named `CollectionHeading`, `RecordScreen`, `RecordDetail` or
`RecordChrome` (through a JSX prop's own initializer too, so a Button handed to a title
component through `action={…}` still counts), or named in `MANGO_OUTSIDE_TITLE_OK` with the
real reason.
