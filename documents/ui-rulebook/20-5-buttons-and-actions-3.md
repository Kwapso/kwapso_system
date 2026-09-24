# 5. Buttons and actions (part 3 of 8)

*Split from [documents/UI-RULEBOOK.md](../UI-RULEBOOK.md) — moved verbatim, cut rather than copied.*

### B18: every Choices table carries a Details column between Name/Module and Status

**The rule.** The client's ruling, 16 Sep 2026, verbatim: *"regarding the fact that some
Choices components can have more properties, for example, meeting types have department, but
sprint types have duration. Why don't you add, everywhere where you have Choices on the
module and on the general, an in-between column with details or info or whatever, and
include this from each case."* Both the global Choices table (Settings › Choices) and a
module's own scoped Choices mounting (`settings-choices-panel.tsx`, one component, B11) gain
a **Details** column, sitting between Value/Module and Status — a decoration, never a fact
the table sorts or searches by, the same shape its neighbour `actions` column already takes.
`shapeChoicesTable` (`web/components/deep-link/shape.tsx`) decides what a row's own type
carries; the column only draws the cell already built:

- **Sprint type** — the type's own icon (`sprintTypeIcon`) plus its DURATION
  (`v.standardDays`, a real column the list door already reads) — the client's own example.
- **Story type** — an icon only (`storyTypeIconName`); no duration is ever seeded for a
  story type, so the column does not invent one.
- **App stage** — a dot TONE only (`appStageDotTone`), the same tone D17 tabulates, never a
  colour of its own.
- **Meeting type** — carries its department in its OWN table already (K30's own Department
  column), so it is out of this ruling's reach rather than a second, duplicate Details cell.
- Any Choices type this file has not yet met draws no Details cell — adding one for a type
  that does not exist yet would be dead code, not a decoration.

R82's own ceiling still holds: Value + Module + Details + Status + actions is five columns
on the global table, one under six, and Details is dropped along with Module wherever a
scoped mounting already narrows to one module (its own tab strip names it).

**Law.** [R82](../RULES.md) (`table-column-budget`) governs the column COUNT as it does any
table; the Details cell's own CONTENT is not separately censused — `shapeChoicesTable` is
the one seam, so a fifth Choices type reaching for its own ad hoc cell elsewhere would be
the shape to watch for.

---

### B19: the close button moves to the top, labeled and available when the latest reply is ours

**The rule.** The client's ruling, 17 Sep 2026, verbatim: *"Okay, but reduce to close and
make it only available, but still visible at all times, only when the latest answer is from
our side. Make it mango. And put a more appropriate icon for closing."* A **Close** button
sits in the title bar (`RecordChrome`'s own actions slot), labeled "Close", styled mango
(`variant="default"`) per [R84](#b17-mango-lives-only-in-the-title-component-every-other-button-is-black),
and drawn at every open status (new, triaged, scheduled, in progress, ready). It is enabled
ONLY when the newest reply's author is not the client — checked through `latestIsOurs`
(`help-detail.tsx`) — and renders a `CheckCircle` icon per [UI-CONVENTIONS](UI-CONVENTIONS.md).

**Where this reaches today.** `web/components/tickets/help-detail.tsx` reads the latest
reply's author and passes `latestIsOurs` to `RecordChrome`; the title actions mount the
Close button when the ticket is open, disabling it when a client reply is the most recent.
`web/test/ticket-close-moved-to-top.test.tsx` asserts the Close button appears in the title
band, stays visible at all times, and toggles enabled/disabled based on `latestIsOurs`.

**Law.** [R84](../RULES.md) (`mango-in-title-only`), as the title-action ceiling; the
action placement is a structural change to the detail screen layout.

**Cross-reference, 18 Sep 2026 ~06:40 (Round 17).** The ticket detail's own ⋯ menu — the
pattern this rule's own title bar shares its title component with — no longer carries "Files
and links" at all; [D20](#d20-a-tickets-own-detail-is-one-page-no-tabs-the-stage-ladder-above-a-two-column-body-conversation-two-thirds-stories-work-logs-stakeholders-stacked-beside-it)'s
own fourth amendment retires that entry outright, because every attachment now renders
inline in the conversation thread. Recorded there, not here, because it is a menu-contents
ruling and this rule is about the Close button's own placement and styling.

### B20: the edit pencil is never black, even when it is the only button

**The rule.** The client's ruling, 18 Sep 2026 ~06:00, verbatim: *"edit button is never
black (even when it's only one). f.e. in ticket detail the edit buton is black."*
[B17](#b17-mango-lives-only-in-the-title-component-every-other-button-is-black) sends every
button outside a screen's own title component to black `variant="inverse"` by default — the
icon-only edit pencil this book's [D20](#d20-a-tickets-own-detail-is-one-page-no-tabs-the-stage-ladder-above-a-two-column-body-conversation-two-thirds-stories-work-logs-stakeholders-stacked-beside-it)
amendment moved outside the ticket detail's own title is the named exception: an edit action
never renders in that black fill, whether or not another button sits beside it. Its own
icon-only treatment beyond "not black" is otherwise unspecified by this ruling and is a
build decision for whoever implements it.

**Status: ruled, in build, 18 Sep 2026.**

**Law.** [R84](../RULES.md) (`mango-in-title-only`) governs the general black-everywhere-
else case this rule carves an exception out of; the exception itself is not yet separately
registered.

### B21: raised by is a horizontal person card; who to keep in the loop is one horizontal row, the full roster

**The rule.** The client's ruling, 18 Sep 2026, verbatim: *"On ticket raised by, there should
be a dropdown, and who to keep in the loop should be horizonta[l]."* Two fields on the ticket
form, two separate changes. AMENDED 19 Sep 2026 ~10:55: the "dropdown" is now a horizontal person card with the avatar on the left and the contact's name (prefixed with the label "Raised by") stacked on the right, still opening the contacts picker on click.

**Raised by.** Supersedes her own 7 Sep 2026 ruling on the same field ("the raise by, no
dropdown but visible all chips") — said here rather than left to be discovered as a silent
contradiction. The data and the default are unchanged: the same contact options, the same
default (the picked contact, else the account's main one), the same door fence refusing any id
that is not a live contact of this client. The control is now a horizontal card: `<Avatar>`
on the left (the contact's photo or initials), and on the right the name stacked under the
label "Raised by", opening the same contact picker dialog on click. Team members are not
offered here — a colleague is a different table from a contact, and offering one would need
a real schema decision, not a control swap.

**On the loop.** Already a horizontal, wrapping row of pills (`StaffPillPicker`); what changes
is who it draws. Before, a person already on the loop was filtered OUT of the row while
somebody else was being added, so mid-add nobody could see who was already on it. Now the row
always shows the FULL roster, with everyone already on the loop drawn pressed and locked
rather than dropped from the row — the same "row of chips, current members shown, more
addable at the end" shape, and the already-add-only rule (nothing on a ticket is ever removed)
stays: a locked pill carries no "×". **On the loop: unchanged in 19 Sep 2026 amendment.**

**Status: ruled, in build, 18 Sep 2026.**

**Law.** None registered.

### B22: the Accounts door excludes individuals who are a company's own contact

**The rule.** Aurora's ruling, 19 Sep 2026, verbatim: *"why am i seeing ocntacts under
accounts? thats wrong>"* An individual linked to a company as that company's contact
(`account_links`) is not also a row on the Accounts door — that person belongs on Contacts,
and inside the company's own record, not as a peer account in its own right. The Accounts
count and its CSV export narrow the same way, so neither disagrees with what the screen shows.

**The residual.** A standalone individual — one carrying no `account_links` row to any company
— still appears in a `type: "individual"` read, because the link dialog (picking who to attach
to a company) needs the full individual roster to choose from; this is the one place the
exclusion does not apply, named rather than silently inconsistent.

**Status: ruled, in build, 19 Sep 2026.**

**Amendment, 20 Sep 2026 (Round 28): the residual above is gone too. Accounts lists
companies only, no exception.** Aurora's review of the fix above, verbatim: *"no, i still see
contacts udner accounts! f.e. Jonathan Sargent Alexander Kaulich"* A standalone individual
(no `account_links` row to any company) was still reaching the Accounts door through the
`type: "individual"` read the link dialog's own roster needed. That narrowing moves off the
screen and into the door itself: `accountsWhere` (`workers/tenancy/src/lib/accounts.ts`) now
resolves an untyped read to `account_type = 'entity'`, so every one of the Accounts screen's
three tabs (Active, Inactive, All) shows companies only, linked or standalone. Every person,
Jonathan Sargent Alexander Kaulich included, lives on Contacts and nowhere else. The link
dialog keeps its own separate, explicitly-typed read of individuals, unaffected.

**Status: amended, in build, 20 Sep 2026.**

**VALIDATED 20 Sep 2026 (Round 30).** Aurora reviewed staging this round and confirmed live:
Accounts lists companies only, and every person lives on Contacts.

**Status: validated, 20 Sep 2026 (Round 30).**

**Law.** None registered.

### B23: Contacts gets a Gallery/List toggle and its own add door

**The rule.** Aurora's ruling, 19 Sep 2026, verbatim: *"on contacts, add the view gallery and
the button to add."* The Contacts screen gains a Gallery/List view switch, List resting by
default, and a real add door.

**The shape.** Gallery tiles draw as `PersonCard`, each carrying the contact's own account chip
and status dot — the same face-and-status discipline the rest of the app already carries.
"New contact" opens through the existing contact create dialog, its Account picker showing
faces, A→Z ([R75](../RULES.md)). The header's own add button draws only when the collection is
not empty — [R88](#d22-an-empty-section-draws-exactly-one-door-in-no-header-no-second-)'s
empty-state single door standing otherwise: the empty state's own "Add the first" is the only
door when there is nothing yet.

**Status: ruled, in build, 19 Sep 2026.**

**VALIDATED 20 Sep 2026 (Round 30).** Aurora reviewed staging this round and confirmed live:
Contacts carries its Gallery/List toggle and its own add door.

**Status: validated, 20 Sep 2026 (Round 30).**

**Law.** None registered.

### B24: avatars are always a round image, and "Raised by" is a smaller tile

**The rule.** Aurora's ruling, 20 Sep 2026, verbatim: *"Avatars are always a round image
('Raised by' must be a round image too)."* and *"Make 'Raised by' smaller — less height."*

**The shape.** `RecordMark`'s own `shape="round"` is now the one shape every avatar in this
app draws, the Raised-by tile included — the tile's own comment names the specific reason it
needed saying: an earlier squared-corner carve-out on that one tile is gone with it. Height:
the Stakeholders panel's Raised-by tile drops from `PersonCard`'s "band" default
(`size="band"`, 56/72px face, `p-4` padding ≈ 104px total) to `size="row"` (36px face) inside
a tighter `py-3` inset (≈ 60px total) — both kit spacing steps, not hand-picked pixels.

**Status: ruled, in build, 20 Sep 2026.**

**VALIDATED 20 Sep 2026 (Round 30).** Aurora reviewed staging this round and confirmed live:
the Raised-by card is shorter.

**Status: validated, 20 Sep 2026 (Round 30).**

**Law.** None registered.

### B25: the Stakeholders pencil moves to the edit screen only, related stories carry a two-colour progress bar, and a ticket's first message is never an edit field

**The rule.** Three of Aurora's rulings, 20 Sep 2026, verbatim: *"On ticket detail, remove
the pencil from the Stakeholders section (should be only on the edit screen)."*; *"On ticket
detail, on the related-stories card, after all stories show a progress bar with completed
(I'm even thinking: show in progress and completed in the bar — completed as green, the
first part, then the ones in progress in the in-progress color)."*; and *"On add/edit
tickets, we can't edit the first message — it's not a description (that was the old model),
so rather multiple messages under the same ticket."*

**The shape.** The Stakeholders panel (`help-stakeholders.tsx`) draws the Raised-by tile and
the On-the-loop row as plain fact, no `onClick`/`cursor-pointer`, no pencil — editing
`raised_by_contact_id` is reached only from the ticket's own edit screen
(`help-form-dialog.tsx`'s Raised-by field). The related-stories card (`help-detail.tsx`)
draws its progress bar as two layers over the kit's single-fill `<Progress>` primitive
(whose own header forbids a second colour on it): the real bar sized to done + in-progress of
the total, and a `bg-success` `aria-hidden` div absolutely positioned over the DONE fraction
only, reading green, then charcoal, then empty track — hidden entirely at zero related
stories ([R88](#d22-an-empty-section-draws-exactly-one-door-in-no-header-no-second-)). And
the ticket's opening text renders as its own editor only on a raise (`!isEdit`); on an edit,
message one is `TicketThread`'s own first "theirs" bubble, never a field an edit dialog
rewrites in place — the write door still accepts `description` on an edit unchanged, only
this form's own field is retired.

**Status: ruled, in build, 20 Sep 2026.**

**Law.** None registered.

### B26: the triage queue's Raised-by cell carries the raised-on date, and the Closed tab folds Closed-by into the Closed-on cell

**The rule.** Aurora's ruling, 20 Sep 2026, verbatim: *"On tickets triage queue, under
'Raised by' add the raised-on date."* and *"On tickets tab 'Closed,' before 'Closed on' add
'Closed by.'"*

**The shape.** `TriageQueue`'s own `TicketRowsTable` call site takes a new
`raisedByShowsDate` prop, scoped to Triage alone — Open, Closed and All keep the 18 Sep
separation of the date into its own column. **Decided (R82):** the Closed tab is already at
the six-column ceiling (id, title, type, raisedBy, created, closed), so "Closed by" is not
given a seventh column — it follows R82's own prescription for a fact arriving once a table
is at the ceiling, "fold the extra fact onto an existing column's own second line", the
identical technique the raiser cell already uses for its own date. The resolver's face + name
(R35/R54, via `memberFace`) sits above the closed date in the same cell, "Closed by" reading
literally before "Closed on".

**Status: ruled, in build, 20 Sep 2026.**

**Amendment, 20 Sep 2026 afternoon (Round 29): the Triage date under Raised by is gone
again.** Aurora's ruling, verbatim: *"on tickets triage list view remove the dabe from under
the raised by person (we have an own coumn for that!)"* The `raisedByShowsDate` line this rule
added that same morning lasted a matter of hours: the `created` column beside `raisedBy`
already carries the identical date, so the second line
was the exact duplicate she is naming. `TicketRowsTable` no longer carries the prop at all,
never a caller passed `false`, the shape does not exist to turn off. Proved by
`web/test/ticket-raised-by-avatar-and-app-link.test.tsx`'s own "the triage list view never
repeats the raised date under Raised by" block: exactly one date on a row carrying both
`raisedBy` and `created`.

**Status: amended, in build, 20 Sep 2026.**

**VALIDATED 20 Sep 2026 (Round 30).** Aurora reviewed staging this round and confirmed live:
the triage list view carries no date under Raised by.

**Status: validated, 20 Sep 2026 (Round 30).**

**Law.** None registered.

### B27: the stories model round — statuses, tabs, kanban, new fields and icons (12 rulings, one round)

**The rule.** Aurora's 20 Sep 2026 batch, restructuring the Stories model in one pass.
Verbatim, item by item:

1. *"Let's rename the story statuses: Scheduled becomes 'To Do (Selected for Sprint),'
   Completed becomes 'Done,' Open becomes 'Backlog' (the story exists but isn't scheduled
   yet)."* **Her words "Scheduled"/"Completed" had no referent** — the codebase's own status
   keys were never `scheduled`/`completed`, only `open`/`in_progress`/`in_review`/`done`
   (`shared/types.ts`'s `StoryStatus`) — so the rename landed on the keys that actually
   exist: `open` → "Backlog" (`STORY_STATUS_LABEL`, `work-panels.tsx`), `done` unchanged as
   "Done".
2. *"Rename the 'Stories' tab to 'Backlog.'"* — done (`web/lib/pages.ts`'s `stories` nav
   entry now titles "Backlog").
3. *"In stories kanban, the columns are: In Progress, To Do, In Review."* —
   `KANBAN_STATUSES`/`KANBAN_STATUS_LABEL` (`stories-screen.tsx`) now hold exactly these
   three, a deliberately separate word set from `STORY_STATUS_LABEL` (the board answers
   "which column", the ordinary label answers "what kind of thing").
4. *"On stories/new, remove the 'done' column and expand the other three to full width —
   only 3 instead of 4."* — the same `KANBAN_STATUSES` narrowing; Done is off the board.
5. *"On stories 'Planned,' add id as the first column. Same on the 'Backlog' tab."* — done,
   the standalone id column both tabs now share.
6. *"On stories main, add a tab for reviews, views Queue and List. Columns: id, name, type,
   app, who did it, date marked as done. For Queue, same chips as the story detail page
   except sprint … title, description, completed by, completed on."* — done, the Reviews
   tab with its Queue/List views (`stories-screen.tsx`).
7. *"Add an 'acceptance criteria' field to stories (same design as 'Detail')."* — done,
   `story-form-dialog.tsx`/`story-detail.tsx`, team migration 0106.
8. *"Rename story origin 'Internal' to 'Enabler.'"* and *"When a story's origin is Enabler,
   must select a related ticket!"* — done, `story-form-dialog.tsx`'s category field plus its
   required-ticket validation.
9. *"Add a MoSCoW priority field to every story … Render the priority as a colored tag on
   each story card and let users filter and sort the backlog by it."* — done: `MoscowChip`
   (R86 exemption, `COLOURED_CHIP_OK`), filterable and sortable (`stories-screen.tsx`).
10. *"Add 'Spike' to the story Type options"*, *"Rename the 'Tech' story type to 'Chore.'"*
    and *"For Bug, use the bug-beetle icon."* — done, `shared/story-types.ts`'s six-icon map
    (team migration 0106 widens the protected set to six).
11. *"On story detail, the chips in order: id, status, type, app (underlined), sprint (id,
    underlined) … for other things too."* — this is R94/L37 above, already its own row and
    not duplicated here.
12. *"Inside stories and tickets, let's rename 'effort' to 'time log.'"* — **NOT FOUND in
    the tree.** No "Time log"/"Effort" label change turned up in `stories-screen.tsx`,
    `work-panels.tsx` or the ticket detail files this pass searched; still open.
    **AMENDED 20 Sep 2026, same day.** Nothing in the app was ever labelled "Effort": the
    thing she means is the section that lists the hours logged against a record, which the
    app calls Work log(s). The reading: inside a STORY or a TICKET, "Work log" becomes
    "Time log" and "Work logs" becomes "Time logs", the tab label (`story-detail.tsx`), the
    panel title (`help-detail.tsx`), and the matching test assertions
    (`ticket-detail-no-tabs.test.tsx`). The rail entry "Hours" (the whole team's logs screen,
    R85) is a different ruling and stays "Hours", untouched. Task and meeting detail keep
    "Work logs" too; only these two records' own screens said "Effort" to her. Door names,
    the data model and the glossary term ("Work log", `shared/glossary.ts`) are unchanged,
    only the words a person reads on these two screens changed.
    **AMENDED 21 Sep 2026.** Aurora, reviewing the hours section inside a ticket and a story
    that now read "Time logs," verbatim: *"no, we said we call taht effort niside ticket or
    story, no?"* Reverts the 20 Sep amendment above: inside a ticket and inside a story the
    section is called "Effort" again, not "Time logs": the tab label (`story-detail.tsx`),
    the panel title (`help-detail.tsx`), and the matching test assertions
    (`ticket-detail-no-tabs.test.tsx`). The rail entry "Hours" and the task and meeting
    detail tabs are unaffected, unchanged, still "Work logs"/"Hours".

**Status: ruled, mostly in build, 20 Sep 2026. Item 12 (effort to time log) landed same day,
reverted to "Effort" 21 Sep 2026.**

**VALIDATED 20 Sep 2026 (Round 30).** Aurora reviewed staging this round and confirmed live:
the Stories nav entry reads Backlog.

**Status: validated, 20 Sep 2026 (Round 30).**

**Law.** None new beyond R86/R94, both already registered.
