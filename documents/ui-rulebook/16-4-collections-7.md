# 4. Collections (part 7 of 8)

*Split from [documents/UI-RULEBOOK.md](../UI-RULEBOOK.md) — moved verbatim, cut rather than copied.*

### K50: the assistant tab strip fits its own pane — no clipped tab, "+" never pushed out of view

**The rule.** The client's ruling, 18 Sep 2026, the fourth time she reported the same shape:
*"Nope, the issue's still there. Please tell me what we need to do to fix this once and for
all, because I'm getting very tired of this topic."* — over the assistant's tab strip with
three or more conversations open. Found: at three-plus conversations the strip overflowed the
pane's own width, so the third tab clipped mid-word and the pinned "+" was pushed past the
visible edge — the strip was drawing every tab at its natural width rather than sharing the
pane's own room between them.

**The fix.** The strip fits the pane it is drawn in rather than growing past it: tabs share
the available width and shrink together before any one of them clips, and "+" stays pinned,
always visible, at the strip's own trailing edge. A tab's own title stays the conversation's
own — never truncated to a generic placeholder to make room.

**Status: ruled, not yet built — kit v1.2.125.**

**Law.** None registered — a kit-only fix.

### K51: the new-tab search field carries one icon, not two

**The rule.** The client's ruling, 18 Sep 2026, validating this round's search fix on the
new-tab page: *"Validated, but now there is the search icon on the right and on the left.
Remove the one on the left inside the text bar, the white one."* `SearchInput`'s own leading
icon is switched off on the new-tab page's search field — the trailing icon, the kit's
standing search glyph, is the only one, matching every other search box in the app.

**Status: ruled, not yet built — kit v1.2.125.**

**Law.** None registered — a kit-only fix.

---

### K52: the expanded rail's width is derived from the widest thing it holds

**The rule.** The client's ruling, 19 Sep 2026, verbatim: *"can we make sidebar less wide? assume knowelegde willbe the lngest word there"* The expanded navigation rail's width is not a hand-set constant; it is a token computed from the widest content it can hold — the longest nav label in the app's own language. In English that is "Knowledge" at the nav font size (measured 72px at the 16px reference → `--rail-label-ch`), plus the icon step, gap, and row padding and rail inset on either side. If the logotype (the icon-28 brand mark plus insets on mobile) is wider, the rail takes that width instead, using `max()` to ensure the logo never shrinks. A label longer than "Knowledge" is truncated with an ellipsis. The collapsed rail's width is unchanged.

**The shape.** kit v1.2.130/131: the expanded rail width is `--rail-width`, computed at the theme level from `--rail-label-ch` and the rail's own `--inset-x` and `--icon-width`, through a `max()` with the logotype's measured width. The app's own nav labels sit in `web/lib/pages.ts` and are read by the kit's own width computation at theme generation time, so no hardcoded constant survives a label change — if somebody edits a nav label in the future, the rail recomputes and the app gets the new width on its own. Was 13rem (208px) before the change.

**Proven:** 1440px desktop (Knowledge label + insets = 104px measured; logo path = 68px; rail width = 104px). No regressions at mobile (`icon` nav only, no labels).

**Status: ruled, in build, 19 Sep 2026.**

**Law.** None registered — a kit-only fix.

### K53: the ticket stage line shows the stage name under each mark, above the date

**The rule.** Aurora's ruling, 19 Sep 2026, verbatim: *"on the stages in tickets, above the
date i need te sateg name!"* Supersedes, for the stage word alone, the 17 Sep clause in
[K38](#k38-the-todays-tasks-progress-strip-and-the-ticket-stage-ladder-beside-it-stand-on-the-bare-page--no-container-behind-either)'s
second amendment — *"don't put the [stage] here"* — nothing else in that amendment changes:
the dots stay at their smaller size, the date stays one line.

**The shape.** The kit's `StatusStepper`
(`shared/ui/components/status-stepper/status-stepper.tsx`) carries a `label` slot per step;
`ticket-stages.tsx` passes each stage's own name back into it, drawn under the mark and above
the date line — the reverse of what K38 collapsed to colour-only. The one stage this app used
to leave unnamed (closed without a resolution) gets a real label for the first time rather than
staying blank now that names render again: **"Waiting on you."**

**Status: ruled, in build, 19 Sep 2026.**

**Law.** None registered — a kit-only fix.

### K54: a message's byline sits under the bubble, and a run from one author carries it once, after the last message

**The rule.** Aurora's ruling, 19 Sep 2026, two sentences the same round: *"on 'chat' in
tickets put the name and time under the message"* and *"and ehn 2 messages from the same
person, only after the last ,essage."* A message bubble's author and time move to directly
under the bubble, at the bubble's own side; when a run of consecutive messages shares one
author, the byline draws once — after the LAST message in that run — rather than once per
bubble, with a tighter gap between the bubbles inside the run than between two different
authors' messages.

**The shape.** kit v1.2.133 gives the thread's message component a `bylinePlacement="below"`
mode: author · time renders under the bubble instead of beside/above it, keyed to the bubble's
own side (left for the other party, right for this account). A run detector groups consecutive
same-author messages and suppresses the byline on every bubble but the run's last, tightening
the inter-bubble gap inside a run relative to the gap between two different authors.

**Status: ruled, in build, 19 Sep 2026 (kit v1.2.133).**

**Law.** None registered — a kit-only fix.

### K55: an avatar draws on every message bubble, not only the run's last — and initials show only when there is no photo

**The rule.** Aurora's ruling, 20 Sep 2026, verbatim: *"On chat, when there are multiple
messages by the same person, keep the name and date only on the bottom one, but show the
avatar for each."* And, the same round, over a ticket thread: *"On chat — and everywhere
there's an avatar — only show initials when there's no avatar. For example, in tickets I
see the initials but should see the avatar image."* Two independent facts about one bubble:
the BYLINE (author + time, K54) collapses to the last message of a run; the AVATAR does not
— it draws on every bubble, keyed off `initials`/`image` alone, never off whether that
bubble carries a byline. And the avatar itself still follows G5's own fallback (picture,
then initial) rather than showing both, or defaulting to initials when a picture exists.

**The shape.** Two independent bugs, one ticket-thread call site (`help-detail.tsx`). First,
`TicketThread`'s own run-suppression had been gating `initials`/`image` to `isLastOfRun`
along with the byline, reading kit v1.2.133's own doc backwards — kit v1.2.136 restates it:
a run's earlier messages "keep their own image/initials even though they carry no
author/time", and `hasAvatar` (`shared/ui/components/ticket-thread/ticket-thread.tsx`) keys
on `initials`/`image` alone. Fixed by passing both on every message, not only the run's
last. Second, every reply's `image` was reading `null` (no photo lookup at all, initials-only
by construction) — now sourced through `memberFace` (`tickets-collection.tsx`'s own seam,
reused rather than rebuilt), the same `members:<teamId>` cache this screen already holds, so
a staff or portal-client sender's real photo shows and initials draw only when `memberFace`
truly has none.

**Status: ruled, in build, 20 Sep 2026.**

**Law.** None new — reinforces [G5](#g5-a-record-never-appears-without-its-face)/R35, a
call-site fix rather than a new rule.

### K56: the Sync button matches its toolbar siblings' height, and the "not synced yet" hint stays in the control's own status slot

**The rule.** Aurora's ruling, 21 Sep 2026, verbatim: *"on knowelegde, the syn button its
to small. unify with law. move the hint not broght in yet."* Two facts about one control,
`GoogleSyncButton` (`web/components/knowledge/google-sync.tsx`). The SIZE: on the knowledge
toolbar the Sync button sits beside the mango Ask button and the settings gear, and both of
those stand at the kit's own default control height; Sync alone was drawing `size="sm"`
(`--control-height-dense`, 32px), the one button in the row not matching its siblings. The
HINT: "Not brought in yet" was never a free-floating toolbar caption to relocate, it already
rendered in the control's own status slot, the same one the "Last brought in …" line takes
once a sync has run; what read as a stray hint sitting beside the button was the size,
`text-xs` next to the button's own `text-sm` label.

**The shape.** `size="sm"` dropped from the Sync button, through the kit Button prop alone,
no custom class, so it reads the kit's standing `--control-height-button` (40px), the same
height the Ask button (no size named) and the gear (`size="icon"`, itself the standing
height) already draw. The status line's own two text-only branches, "Last brought in …" and
its pre-sync fallback "Not brought in yet", both move from `text-xs` to `text-sm`, still in
the exact same ternary slot they already shared, styled alike rather than relocated.

**Status: ruled, in build, 21 Sep 2026.**

**Law.** None new: a call-site fix through the kit's own Button `size` prop; R72's own
point (a control's helper text belongs to the control, not to a heading) is why the hint
stayed in place rather than moving to CollectionHeading's title line.

---

### K57: faces stay visible once selected, kit v1.2.144

**The rule.** Aurora's ruling, 21 Sep 2026, verbatim: *"on choice components, when I have
selected, for example, the app, in the dropdown I see the icon, but I want to continue
seeing it also once it's selected. This app accounts for people everywhere where I select
something with an avatar or an image. Still show it once it's selected, or the icon."*

**The gap.** R90's own kit v1.2.127 face slot only ever showed on a `SelectTrigger` when
the call site passed a `face` prop a SECOND time, by hand, after already resolving which
option was chosen. Nine call sites did that work; every other Select closed back down to a
bare label the instant a face-carrying option was picked.

**The shape.** Kit v1.2.144 (`kwapso-design`): `Select` is now a small wrapping function
component around Radix's own `Root`, carrying a face registry every `SelectItem` populates
with its own `(value, face)` pair as it renders. `SelectTrigger` reads that registry for the
current value and draws the face on its own, no per-call-site prop required, an explicit
`face` still overriding it where one is already given. Works before the list is ever opened
once, because Radix keeps every `SelectItem` mounted (open or shut) the same way it keeps
`SelectValue`'s own text current with no prior open.

**Status: ruled, in build, 21 Sep 2026 (kit `kwapso-design` v1.2.144, synced to
`shared/ui/`; pinned in the kit's own `components/select/check-select.mjs`).**

**Law.** R90 (`faces-in-choices`), amended by this kit tag: the census
(`web/test/faces-in-choices.test.ts`) still asks whether an identity-bearing Select's
options carry `face=`; this rule is what makes the trigger keep showing it afterwards.

**AMENDED 21 Sep 2026, the same day, reviewing it against a screenshot of the app form's
own account field ("Whose system it is: VU Solutions") with no icon on the closed
trigger.** Aurora, verbatim: *"no, look at second screenshot (with VU solutions) icon is
missing there."* The kit fix above closes the gap on the kit's own `<Select>`; the app
form's account field is not one — it is `RecordPicker`
(`web/components/records/record-picker.tsx`), this app's OWN searchable picker, built
before the kit had a face slot at all and never revisited once it grew one. Its closed
trigger carried a parallel, narrower version of the identical bug: a face was drawn only
when the chosen option's own `shape` was `"round"` — a person, told apart from a
client/app's `"square"` by `record-mark.tsx`'s own discriminator — so a person picker's
trigger kept its face and an account or an app picker's did not, silently, since the
gate was never about WHETHER a face existed, only which box it was drawn in. Fixed the
same way the kit fixes its own: the trigger draws whatever face the chosen option
carries — a picture, a glyph or the bare `face` flag through `RecordMark`, in ITS OWN
shape, or the fourth kind of mark (`icon`, a node) where there is no `RecordMark` face —
never gated on `shape` at all. Two accounts/apps censused separately as un-faced options
while looking (`app-form-dialog.tsx`'s own Main stakeholder row carried `shape: "round"`
with no `face: true`, so it drew nothing either) and given one. A phase/wave picker
(`wave-detail.tsx`'s "Put a phase in this wave" row) gained the fourth kind of mark too,
its own type's icon (`SprintTypeGlyph`), the same seam K58 gives a ticket.

**Status: ruled and shipped, 21 Sep 2026 (`web/components/records/record-picker.tsx`,
proved by `web/test/select-trigger-face-persists.test.tsx`'s existing kit-Select suite
plus the widened `web/test/faces-in-choices.test.ts` census, now covering apps, tickets,
phases and waves, not only people/contacts/accounts).**

### K58: ticket pickers show the type icon

**The rule.** Aurora's ruling, 21 Sep 2026, verbatim: *"On every choice component where I
can choose a ticket, show me the type as the icon everywhere."*

**The shape.** `ticketFace(ticket)` (`shared/web/ticket-face.tsx`) builds the `SelectFace`
for a ticket from its own type, through the same map the tickets list already draws
(`ticketTypeIconName`, `shared/ticket-types.ts`): the bug glyph for an Issue, the question
mark for a Question, the regular plus circle for an Extra, the chat bubble for Feedback, and
a neutral ticket glyph for a renamed or untyped ticket rather than a blank option. It reads
through kit v1.2.144's own `SelectFace.icon` variant (K57), so a ticket picker's trigger
keeps the type icon once an option is picked, the same as a face does.

**Status: ruled, in build, 21 Sep 2026 (`shared/web/ticket-face.tsx`); the story form's own
ticket picker (`web/components/work/story-form-dialog.tsx`) is a separate lane's file and
wires the helper on its own turn; a census of `web/components` and `shared/web` on 21 Sep
2026 found no OTHER Select or picker in the app choosing a specific ticket record yet.**

**Law.** R93 (`visual-accompanies-text`): a choice over a record with its own visual draws
that visual beside the text, never text alone; K57/kit v1.2.144 is what keeps it drawn once
chosen.

---

### K59: choices show a Where column and filter, and Added on / Added by, with sort by name and created on

**The rule.** Aurora's ruling, 21 Sep 2026, verbatim: *"everywhere where i edit choices we
need to add a cokumn as for where is taht choiceeee! for exmaple in settibsg sticket: typ
(bug, etc) but in eed to see that 'type'. makes sense no? also have it as a filter. in
choices also show columns added on and added by, and add sort (name, xreated on) this
everywhere where choices."*

**The shape.** One component draws every choices table in the app — the general Settings ›
Choices tab and every per-module Choices panel both mount `SettingsChoicesPanel`
(`web/components/screens/settings-choices-panel.tsx`), scoped or not — so one change reaches
both. A **Where** column (`shared/selectable-where.ts`'s `selectableFieldWords`, derived off
the group-to-table/column map `shared/selectable-homes.ts` already keeps, never a second
list) reads "Tickets: Type", "Stories: Status", "Phases: Type" — the module a group is edited
on beside the field its values fill in. It folds the table's old Module column (module alone)
rather than adding a seventh, and it is drawn even on a scoped, single-module page, because
her own example is written from one ("in settings tickets… I need to see that 'type'"). A
**Where filter** facet reads the same field word, offered only when a reader's visible groups
actually span more than one (a facet with one answer decides nothing). The list door
(`listSelectable`, `workers/tenancy/src/lib/selectable.ts`) already hands back the WHOLE
team vocabulary in one bounded, capped read — never paged, not a `GROWING_COLLECTIONS` entry
— so both the Where and the pre-existing Module/Status filters narrow the already-fetched rows
client-side, the same mechanism the Status facet has always used; R14/R16 (paged/growing
lists) do not apply to this door. **Added on / Added by** fold into one **Added** column
(creator's first name over the date, the same stack shape a record's own footer draws) —
`listSelectable` now selects the audit block (`created_at`/`creator_id`/`creator_name`) on
every row, not only the single-row door, so `SelectableValue.createdAt`/`createdByName` are
never absent from a list read again. **Sort by name** was already the Value column's own
header (`sort: "value"`); **sort by created on** is the new Added column's header
(`sortType: "date"`, comparing the raw instant, never the formatted date).

**VALIDATED 21 Sep 2026.** Aurora reviewed staging this round and confirmed the Choices columns layout: Value with its mark, Status as the second column, Details, Where, Added, Actions, with sort moved to the toolbar.

**Status: validated, 21 Sep 2026** (`shared/selectable-where.ts`,
`web/components/deep-link/shape.tsx`'s `shapeChoicesTable`,
`web/components/screens/settings-choices-panel.tsx`); worker change in
`workers/tenancy/src/lib/selectable.ts`; tests in
`workers/tenancy/test/selectable-where.test.ts` (every seeded group resolves a field word),
`workers/tenancy/test/selectable-doors.test.ts` (the list door's audit block), and
`web/test/shape.test.ts` (the Where/Added cells and the date sort's raw key).

**Law.** R82 (`table-column-budget`): value + where + details + status + added + actions is
six columns, the ceiling itself — Module folded into Where and Added on/Added by folded into
one Added column are what hold the line, so no `TABLE_COLUMN_BUDGET_EXEMPT` entry was needed.
R75 (`sorted-options`): the Where facet's options sort A→Z for free, through
`shared/web/screen-engine/filter-bar.tsx`'s own `optionsFor` chokepoint every facet already
passes through. `sorted-columns-declare-their-type.test.ts`: the Added column's `sortType:
"date"` + raw `sortKey` is what that census requires of any sortable date cell.

**AMENDED the same day, 21 Sep 2026: the Added column splits, and Status folds into Value
instead.** Aurora's ruling, verbatim: *"ok split the who and date added in 2 columns."* The
one folded **Added** cell above did not survive the day it shipped: it is now two real
columns, **Added by** (the creator's face and first name, `RecordMark` drawing the initials
tile alone, since `SelectableValue` carries no picture, the same "no photo field yet" gap the
work-logs panel's own Logged-by filter already carries) and **Added on** (the date alone,
`sortType: "date"` riding the raw instant unchanged from the fold it replaces). Splitting one
column into two put the table at seven, one past R82's ceiling, so something else had to fold.
**Status** is the one that moved: its `<Badge variant="status" dot={…}>` chip now sits beside
the Value cell's own name (a small chip trailing the record's own mark, the identical FOLD
TECHNIQUE the tickets list already uses for its own Closed column, "fold the extra fact onto
an existing column's own second slot", chosen over folding into Details, which reads blank on
most rows already, or into Where, which is already full with two facts of its own). The
toolbar's own three-way Status facet (`statusState`) is untouched, so nothing a reader could
filter by is lost, only the column's own header. Value's own header still reads "Value" and
still sorts by `valueText` alone; the chip beside it is a decoration on the cell, not a second
sort question.

**Law, re-run.** R82: value + where + details + added by + added on + actions is six columns
again, Status's fold (into Value) and Module's fold (into Where, unchanged from the ruling
above) both holding the line, still no `TABLE_COLUMN_BUDGET_EXEMPT` entry needed.
`sorted-columns-declare-their-type.test.ts`: Added on's `sortType: "date"` + raw `sortKey`
(`createdAtRaw`) carries the same law the old Added column held. R90 (`faces-in-choices`) is
read for the PATTERN here rather than enforced on this cell, its own census is scoped to
`<Select>`, never a table column, and R54 (first name only) still governs `addedByText`.

**AMENDED AGAIN, 21 Sep 2026: Status is back to its own column, and Details folds into
Value instead.** Aurora's ruling, verbatim: *"ok, but keep status as its own column!"* The
fold one paragraph up did not survive either: the `<Badge variant="status" dot={…}>` chip
moves back off the Value cell and onto its own `status` column cell, restoring the header
row Value/Where/Status/Added by/Added on/Actions carried before the 21 Sep 2026 evening
reading. Something still has to fold to hold R82's six-column ceiling now that Status has
its seat back, and this time it is **Details** — its own column since 16 Sep 2026 evening —
folding onto the Value cell's own SECOND LINE, muted, rather than beside the name: the value
on the first line, Details underneath it when the row has one, the identical stacking
`tickets-collection.tsx` uses to put a resolver's name over their date in its own Closed
column (and, before her 20 Sep 2026 ruling retired it from that one call site, the way the
same table stacked a raised-on date under the raiser). Details reads as an honest empty cell
on most rows already (this rule's own "shape" paragraph, and `shapeChoicesTable`'s own
header, "THE DETAILS COLUMN") — Sprint type and Story type draw an icon, App stage a dot
tone, and every other seeded type (Industry, Country, the three "labels" groups, and more)
draws nothing at all — so folding it under Value costs a reader less than folding Status
ever did: Status fills a real, filterable word on every row, and Details mostly does not.
The toolbar's own three-way Status facet (`statusState`) is unaffected either way, exactly as
the 21 Sep 2026 fold left it.

**Law, re-run again.** R82: value (with details folded beneath) + where + status + added by +
added on + actions is six columns again — Details' fold (into Value's own second line) and
Module's fold (into Where, unchanged since the first ruling) both holding the line, still no
`TABLE_COLUMN_BUDGET_EXEMPT` entry needed. `sorted-columns-declare-their-type.test.ts`:
Status's restored column reads `sort: "status"` / `searchKey: "statusText"` / `sortKey: (r) =>
r.statusText` — a plain-text comparison, no `sortType` needed, the same shape the column held
before the 21 Sep 2026 fold ever moved it. Tests: `web/test/shape.test.ts` (the status cell
its own node again, and the Value cell's own second line proven present for a type Details
has something to say and absent for one it does not).

**AMENDED YET AGAIN, 21 Sep 2026 (later the same day): the mark moves beside Value, Details
returns as text only, and the header sort moves to the toolbar.** Aurora's ruling, verbatim:
*"no: the icon/color next to the value in first column! details is the next column (however
icon color its not a detail!) make status the second column, the rest ok. remove the sort from
the headers and add it in toolbar!"* Two corrections in one sentence. First, what the previous
reading's Value second line had actually been showing for four of the seeded types (Sprint
type's own glyph, Story type's own glyph, Ticket type's own glyph, App stage's own dot) was
never a DETAIL, it was the same kind of MARK `ChoiceGroupHome.colour`/`.icon` already draw
beside a value's own name, so it moves there now (`choiceValueMark`, deep-link/shape.tsx), a
`Swatch` for a colour/dot tone and an `Icon`/`SprintTypeGlyph` for a glyph, never a second line.
Details returns as its own column, third (after Status, which keeps the second seat the morning
reading above gave it), holding only what is left once the mark is gone: Sprint type's own
day-count `Badge`, the one real case; Story type, Ticket type and App stage had nothing beyond
the mark that just moved out, so their Details cell is now an honest empty one. Second, and
unrelated to the column order: no header sorts any more, every `TableColumn` drops its
`sort`/`sortType`/`sortKey`/`defaultDir`, and a toolbar `SortControl` takes over instead,
offering **Name** (`valueText`) and **Added on** (`createdAtRaw`, the raw instant, never the
formatted string), the same `CollectionConfig.sortable`/`sortOptions` seam Stories' own List
view already drives its toolbar sort through (`shared/web/screen-engine/collection.ts`'s
`selectRows`, executed by `CollectionFrame`, never a second sort engine). And because Added by
and Added on stay split at seven named facts (Value, Status, Details, Where, Added by, Added on,
Actions) the moment Details comes back as its own column, they fold back into one **Added**
cell, creator's face and first name over the date, the exact shape the very first 21 Sep 2026
reading of this rule shipped, before that same-day split, restored rather than reinvented.

**Law, re-run a third time.** R82: value + status + details + where + added + actions is six
columns, Details' return as its own column is paid for by folding Added by/Added on back into
one Added cell, the same six-column accounting the very first 21 Sep 2026 reading held before
the split. `Actions` counts toward the ceiling: `table-column-budget`'s own census
(web/test/table-column-budget.test.ts) asks only whether every element of a `TableColumn[]`
literal carries a `key` AND a `label` property assignment, and this table's own actions column
always has both (`label: ""` included), which is what makes the fold necessary rather than
optional: seven named facts across six seats. `sorted-columns-declare-their-type.test.ts`: no
column declares a `sort` any more, so nothing here is compared in the browser by a header; the
toolbar's two `SortOption`s read `valueText`/`createdAtRaw` directly off the row, the same raw
fields the retired header sort's own `sortKey`s read, never the shaped `value`/`added` cells.
`status-owns-the-chip.test.ts` (R86): App stage's dot moved from a `<Badge variant="status"
dot={…}>` to a `<Swatch colour={…}>` beside the value, so it is a MARK now rather than a second
coloured chip on the row; the census still passes it clean because the `Swatch` reads a local
`stageTone` (named so its own resolved text still says "stage", the census's own oracle).
Tests: `web/test/shape.test.ts` (the mark beside Value for Sprint/Story/Ticket type and App
stage, Details' own text-only cell, and the folded Added cell).

---
