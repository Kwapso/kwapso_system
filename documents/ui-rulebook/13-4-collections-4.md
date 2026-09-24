# 4. Collections (part 4 of 8)

*Split from [documents/UI-RULEBOOK.md](../UI-RULEBOOK.md) — moved verbatim, cut rather than copied.*

### K25: Inputs — the third Accounts tab, three server views, no Mine tab

**The rule.** What we are waiting on a client for gets its own sidebar page,
third in the Accounts group beside Accounts and Contacts — the client's own
ruling, 15 Sep 2026, verbatim: *"Do you remember that we already decided on
the naming for the 'tasks' that we assigned to customers? I would like to
see this in the third section of the accounts section on the sidebar. Find
this name and make me a proposal for how the main screen could look."* The
name was not a new decision — `shared/glossary.ts`'s `todo` entry has read
`{ term: "Input", … }` since 31 Aug 2026 — and the screen is the home the
client asked for when Tasks' own K19 redesign removed the "waiting on
clients" panel from that screen outright: *"This is a completely different
module, and we will put this somewhere else, but remove it from tasks."*
This is somewhere else.

Shown three directions for the main screen (a plain list; grouped by
account with the account manager's own worklist reading; a board by
nudge-state), she chose the first, in her own words: *"the view that I want
is the first one you suggested, I1: just a list… I like the column that
flags how long we are waiting. Also, show the account and add a filter for
account."*

**Three tabs, three SERVER views (R14/R16), no Mine tab.** Waiting (open,
not yet due or carrying no due date at all) · Overdue (open, past its due
date) · Received (done, under the word this screen's tab reads it by — the
identical pile the account/contact panel's own `TodosPanel` still calls
Done, untouched). `TODO_VIEWS` (`shared/types.ts`) carries all five names
now; the door's own `todoViewClause`
(`workers/content/src/lib/todos.ts`) is the one place the split is decided,
so the list and its three badges can never disagree about which row is in
which pile. NO FOURTH TAB for "mine": an input is owed *by* a client *to*
us, so nobody on staff owns one the way they own a task, and a caller-name
column would have nowhere honest to point. What Tasks' own `all_tasks:read`
decides about a task, `all_inputs:read` decides about an input — without
it, a reader sees only the accounts they themselves manage
(`account_manager_user_id`), narrowed at the door
(`getTodos`), never refused.

**The row, R80's shape.** Input (the title) · Account (a real face, R35 —
logo mark + name, the same `<RecordMark picture={…} name={…}/>` pairing
every other list in the app draws for its own Account cell) · Contact (who
completed it, R54 — blank until it has, because a to-do carries no
"addressed to" field before that) · Due · Waiting (days since the input was
raised, `Badge` toned quiet under a week, `warning` past it, `destructive`
on the Overdue tab; blank on Received) · Received on (the Received tab's
own eighth-column shape, blank on the other two — the identical furniture
reasoning K19's own `closed`/Everyone's column already carries one module
along). Through `<PagedFind>` + `<RecordTable>`, the same pairing
`contacts-screen.tsx` draws: search (R14, door-side — Received keeps every
completed input for ever, so a browser search over a loaded page would
answer about the wrong fifty), a facet on Account (the client's own words,
door-side, `accountId`), and the toolbar's own sort (R53) offering Due and
Waiting longest (`TODO_SORTS.waiting`, oldest raised first). "+" is the
existing ask-a-client dialog (`todo-form-dialog.tsx`); the row's own act is
Mark received, the panel's existing `completeTodo` door, offered wherever
completing it would move the row (never on Received itself — R17).

**Two things the design pass drew that the door cannot answer today, said
here rather than faked on screen.** No "Last nudge" column and no "Nudge"
row action: `Todo` (`shared/types.ts`) carries no reminder/nudge timestamp
at all, and neither `workers/content/src/routes/todos.ts` nor the portal's
own to-do surface has a resend-reminder door — a real gap, not an
oversight, the same discipline this file's own K24 entry previously kept about the
Waves calendar's multi-day span (which has since shipped in kit v1.2.90, 16 Sep 2026). And the Account MANAGER facet the I1 mock
also drew is left out for a cheaper reason: this screen has no full
accounts list loaded to build real options from, and a `Todo` row carries
no manager id or name of its own to derive one cheaply the way the Account
facet does (off the rows already on screen, `apps-screen.tsx`'s own idiom).
The door already supports narrowing by it (`accountManagerId`,
`TodoFilter`) — it is what `all_inputs:read`'s own narrowing is built out
of — so the facet is one array entry the day this screen also carries a
company list.

**The permission rename.** The module gating every to-do door was `todos`
since the base's earliest days; this screen renamed it to `inputs`
(team migration `0096_todos_permission_renamed_inputs`,
`shared/team-modules.ts`) — the label had already read "Inputs" since
31 Aug 2026, so the box was the last place still carrying the old word.
Every existing role's grants move with it, untouched (an owner who had
handed a Client role `todos: read + update` now reads `inputs: read +
update` on the exact same role row). `all_inputs` is new, off for every
role but the locked Admin, the identical shape `all_tasks`/`all_stories`
already take.

**Law.** [R14](../RULES.md), [R16](../RULES.md), [R36](../RULES.md)
(`offered-rights` — `inputs`/`all_inputs` join the matrix), [R53](../RULES.md),
[R54](../RULES.md), [R80](../RULES.md) (`rows-are-a-list`). The two
omissions above are recorded here for the next reader rather than a
registry entry, the same footing K24's own Calendar descope stands on.

---

### K26: Story type is five words, not three, and a story now says where it came from

**The rule.** The client's ruling, 15 Sep 2026, verbatim: *"story TYPE changes from
{Fix, Feature, Change} to exactly Data · Tech · Bug · Feature · Change"* — Data is
changing values inside records, Tech is under-the-hood and invisible to users, Bug
is something that should work being broken, missing or wrong, Feature is a
brand-new capability, and Change is the default, modifying something that already
works (copy or email wording is Change; there is no "Content" type). *"And a new
field, Category: Client-requested (default, traces to a client ticket or ask) or
Internal (Kwapso-initiated upkeep)."* And, closing the door on a third dimension
before anybody asked for one: *"Do NOT assign any priority or urgency. Stories do
not have that."*

**The vocabulary, added never swapped.** Team migration `0094_story_type_and_category`
(`workers/tenancy/src/team-schema/migrations.ts`) inserts Data/Tech/Bug as new
PROTECTED `Story type` rows (`is_default = 1`, [R76](../RULES.md)'s own word for
the state) beside the Feature/Change rows migration 0028 already planted, and
DEACTIVATES Fix rather than deleting it — every story that still names it keeps
reading correctly until a separate reclassification lane rewrites them; the door
(`requireActiveSelectableValue`, `workers/content/src/lib/vocabulary.ts`) now
refuses `storyType` on create or update unless it names a currently ACTIVE row,
which is what makes "Fix no longer creatable" true structurally rather than by
convention. A new group, "Story category", is seeded the same protected way with
Client-requested and Internal. `shared/selectable-homes.ts` carries the new
group's home (`{ table: "stories", column: "category" }`) so the vocabulary
census (R-whatever governs it) knows where its words are stored.

**The form.** Type keeps the control it already drew (`RecordPicker`,
`story-form-dialog.tsx`) — the vocabulary underneath it changed, the control did
not, because the words are the team's to rename on the Choices screen exactly as
they were before. Category is new: a two-pill row (`ToggleGroup`/
`ToggleGroupItem`, the kit's own segmented control — "two to four options that
change how the same data is drawn," and Client-requested/Internal is exactly
that shape) defaulting to Client-requested, wrapped in a `shape="group"` `Field`
so the required ring boxes the whole pair rather than one pill
([K12](#k12-the-toolbars-slots-are-the-rows-in-one-order-and-sort-is-a-default)'s
own discipline about a control the Field clones onto). Never hardcoded English:
`categories` is a prop threaded from the live `Story category` vocabulary the
same way `storyTypes` already is, at all five `<StoryFormDialog>` call sites.

**The row and the record.** A story's List row and Board card both carry the
type mark and a small Category chip ([K16](#k16-on-a-card-that-stands-for-a-record-the-chip-sits-above-the-title)'s
own idiom, a quiet secondary badge rather than a second colour). The record
screen shows both Type and Category on its overview, side by side, the same
list the client's ruling put them in. No priority anywhere on a story, in either
place — the ruling's own last sentence, held to by absence rather than a field
nobody draws.

**Amended 2026-09-16.** The client's ruling, verbatim: *"Assign an icon to each
type, and when I'm editing or creating, make it a horizontal pick. Also, the
client requested or internal should be at the very bottom and prefilled. If it
comes from a ticket, it's client requested. If it's created from scratch, it's
prefilled with internal. … Everywhere I'm selecting an app or an account, in
this case, when I'm creating a story, I want to see the icons of the app or the
image of the account on the choice component."*

- **An icon per type, in code, not a column.** The five words are still the
  live `Story type` vocabulary (`selectable_data`, unchanged); only the GLYPH
  moved to code, `shared/story-types.ts` — Data → `Database`, Tech →
  `Wrench`, Bug → `Bug`, Feature → `Sparkle`, Change → `ArrowsClockwise`
  (not `PencilSimple`: CLAUDE.md's own action-icon table already fixes that
  glyph as "edit," and `story-detail.tsx`'s own overflow menu draws it a few
  pixels from where a Change chip would sit). A column was considered and
  rejected the same way the task brief itself flagged: the five types are
  PROTECTED (K26 above, `is_default = 1`), so a closed code map costs nothing
  a migration would have bought, and `shared/ticket-types.ts`/`shared/meeting-
  icons.ts` already carry the identical pattern for their own closed sets.
  The row/card/detail chip is now **icon + word on the same neutral pill**
  `categoryChip` already draws — REPLACING the two-letter text tile, not a
  dot: a colour dot for a type has only ever been a TICKET pattern
  (`web/lib/type-colours.ts`), never a story one.
- **Type is a horizontal pick.** `story-form-dialog.tsx`'s Type field is now
  `RecordPicker layout="row"` — the same idiom the staff row on this form and
  the ticket form's own Type row already draw — carrying the new
  `PickerOption.icon` (`record-picker.tsx`, a React node, additive: every
  caller that only ever set the text `mark` keeps working unchanged).
- **Category, last and prefilled.** Moved from right after Type to the very
  last field on the form. The default now reads the dialog's own `fixedTicket`
  prop — set at exactly the one call site that opens this dialog off a
  ticket's own Related stories tab (`help-detail.tsx`) — Client-requested when
  it is set, Internal otherwise. Still an ordinary default: both pills stay
  live and pressable.
- **App/account marks on the choice components.** The story form's App field
  now passes the app's own `logoUrl` as `picture` (`face: true`, so a logo-less
  app still draws its own initial rather than a blank row) — the same
  `picture`/`face` pair the ticket form's own App row and `accountOption`
  (`web/lib/pickable.ts`) already carry for the identical ruling on 2026-09-07/
  09-09. The task form's App field, which shares `RecordPicker`, got the
  identical targeted fix; its Account field already had one (`accountOption`).
- **The process selector — CORRECTED THE SAME DAY.** An earlier pass at this
  ruling read "kill the whole process selector when creating a story … this
  will come from somewhere else" as removing it from the form outright. The
  client's own correction, minutes later, verbatim: *"stop the agent removing
  the processes from CRUD - keep it!! But make it a dropdown."* So the field
  never left CHECKLIST 6.5's own two facts (`processIds`, `changesNoStep`) —
  only the CONTROL changed, from an always-expanded checkbox stack to the
  kit's own `Select` (an "add a process" trigger; the chosen set renders above
  it as a removable list, the same idiom this file already uses for its own
  attached/pending files), because Radix `Select` commits one value per open
  and "one or more processes" is still real.

**Law.** [R20](../RULES.md) (the door checks the position, never trusts the
body), [R76](../RULES.md) (`protected-is-active`), [R35](../RULES.md).

### K27: Stories — five tabs ported from Tasks, Backlog instead of All

**The rule.** The client's ruling, 15 Sep 2026, verbatim: *"For stories, we need
to recreate a bit of tasks. Stories are inside sprints, so I would need
different tabs where you can see: overdue or the ones you have to do now, the
ones that are active, and for you only / the planned ones that are not in any
active sprint and are somewhere in the future / all / the completed ones /
everyone's. Think about this and make me a proposal."* Shown a design proposal
built on that brief, she answered with one change over its own recommendation:
*"I agree with all you suggested — except use Backlog instead of All."*

**Five tabs, four of them mine unconditionally.** `STORY_TABS`/`EVERYONE_TAB`
(`web/components/work/stories-screen.tsx`) draws **Now · Planned · Backlog ·
Completed · Everyone's** — five SERVER views ([R14](../RULES.md)/[R16](../RULES.md),
`StoryViewName` in `shared/types.ts`), the identical shape
[K19](#k19-tasks--three-tabs-of-your-own-and-a-fourth-for-everyones) already
drew for Tasks one collection over. Now/Planned/Backlog/Completed narrow to
the caller's own name at the door UNCONDITIONALLY (`MINE_VIEWS`,
`workers/content/src/routes/stories.ts`), including a story with no assignee
at all riding along (`includeUnassigned`) — this backlog is old enough that
plenty of it was never claimed by anybody. Everyone's is the fifth tab, last
in the strip, shown only when the caller holds a NEW right, `all_stories:read`
— seeded exactly like `all_tasks:read` (team migration `0095_everyones_stories`,
`shared/team-modules.ts`), off for every role but the locked Admin.

**The predicates.** Now is mine, not done, and either overdue (the sprint's own
end date where there is a sprint, the story's legacy due date where there is
not) or its sprint is RUNNING right now (`sprintState`'s own reading, ported to
SQL — a late sprint stays "running," which is why Now catches it on the other
side of its OR too). Planned is mine, not done, not overdue, and its sprint
either has not started or it has none at all — the future, not yet claimed by a
running block. Backlog is mine, any state — the file's own old comment already
called this the backlog, and the client's correction landed on the same word
for the tab itself. Completed is mine and done. Everyone's narrows nothing at
all.

**The views, per tab** ([K12](#k12-the-toolbars-slots-are-the-rows-in-one-order-and-sort-is-a-default)):
Now offers Board by status (default) + List; Planned offers List (default) +
Board by sprint + Week by due date; Backlog offers List (default) + Board by
status; Completed offers List only; Everyone's offers List (default) + Board by
status. The List view's Sprint column carries the sprint's own name and the
wave it was sold inside as a quiet second line, reading off the sprints this
screen's own create-dialog options already load — no new field on `Story`. A
story with no sprint reads "No sprint," never a blank cell. The Board's status
columns carry `storyStatusDotTone` in the header, the same coloured-dot seam
Tasks' own priority board already reads from `shared/status-tones.ts`; dropping
a card writes through `setStoryStatus`, gated on `work:update`. The Board by
sprint (Planned only) is READ-ONLY — dragging a card there would mean
reassigning the story's sprint, a different write than a status move, and out
of this pass; its columns are the sprints actually present on the loaded page,
plus "No sprint" last, never the fixed four-column status shape. Week carries
no sort control ([K20](#k20-calendar-views-carry-no-sort)).

**The list, R80's shape.** `<RecordTable>` draws the bare shape unconditionally
now ([K22](#k22-rows-are-a-list-never-a-banded-table)), so Stories' own List
never asks for the retired banded frame. Columns per tab: Story (the type mark,
the reference in its own black chip, the title), Category, Status, Sprint — and
Everyone's alone keeps Assignee, second, right after Story, the one tab not
already narrowed to the caller's own name ([K19](#k19-tasks--three-tabs-of-your-own-and-a-fourth-for-everyones)'s
own reasoning for the identical column, one module along). Search and sort
(Order — the drag-rank every story already carries — and Deadline) run over
whichever tab's loaded page is showing, in the toolbar, never a per-column
header click. No door-side facets any more: the flat backlog's old
`COLLECTION_FILTERS.stories`/`<PagedFind>` pairing is retired with the screen
that used it, the narrowing question now belongs to `StoryView` itself.

**Law.** [R14](../RULES.md), [R16](../RULES.md), [R19](../RULES.md) (`stories`
gains a `narrow` declaration on `all_stories:read` — `shared/workers/query-grammar.ts`
— the identical shape `tasks` already carries for `all_tasks:read`),
[R20](../RULES.md), [R36](../RULES.md) (`offered-rights` — `all_stories` joins
the matrix), [R53](../RULES.md), [R78](../RULES.md) (`no-sort-in-calendar-views`
— Week), [R80](../RULES.md) (`rows-are-a-list`).

### K28: Sprint type is the seven with icons; App stage's status is HELD

**The rule, and the correction.** The client's ruling, 16 Sep 2026, verbatim: *"the sprint types are: not started, audit (this is new), plan (the old blueprint), build (the old development), validation, refinements and enhancement (in this order). They will not have colors, but icons. Let's keep colors for status."* The first pass read this onto `shared/app-stages.ts` (team migration 0097) — she said "sprint types," and the two words she named, Blueprint and Development, happened to be two of App stage's own eight values that day, which is what made the misread possible. **Her own correction, the same day, verbatim:** *"No, no, no, no, no. You got this completely wrong. These are the sprint types... status has a color. It's the sprint types that have an icon. You got that wrong. Hold this until we define what the status is from the apps."* And on Waves, the same conversation: *"No, now you have the name of the wave. I want the name of the app."* (K24's own amendment below carries that half.)

**So there are two vocabularies in this entry, not one, and they resolve in opposite directions.**

**Sprint type (the seven words, with their icons) — `shared/sprint-types.ts`, team migration 0098.**

| # | Sprint type | Icon | Old word it replaces |
|---|---|---|---|
| 1 | Not started | `Circle` | new to this vocabulary |
| 2 | Audit | `MagnifyingGlass` | Assessment (renamed); Diagnostic too, only when Assessment is absent |
| 3 | Plan | `Compass` | Planning (renamed) |
| 4 | Build | `Hammer` | Implementation (renamed) |
| 5 | Validation | `CheckCircle` | Validation (kept) |
| 6 | Refinements | `Sliders` | Refinement (renamed) |
| 7 | Enhancement | `TrendUp` | Enhancement (kept) |

Iteration, Foundation, Data Migration, Process Optimization and Training fold into nothing — deactivated, never deleted; a sprint already carrying one of the ten old catalogue words (`SPRINT_TYPE_CATALOGUE`, `workers/tenancy/src/team-schema/seed.ts`) keeps that exact word. Diagnostic's fold is CONDITIONAL, the one genuine branch in the migration: it becomes Audit only when no live row is still spelled Assessment (so the two do not collide into one row); where Assessment is present, Diagnostic deactivates alongside the rest. `selectable_data.position` (the column 0097 added) now carries 1..7 for these rows too — the second vocabulary to use it, never a second column — and `sprints.sprint_type` is rewritten wherever a stored word actually renamed, so a sprint's own history reads the team's current spelling.

Drawn as an icon + word on a NEUTRAL pill, no colour, everywhere a sprint's type shows: the sprint form's own picker (`AppearancePillGroup`, a horizontal pill row, `sprint-form-dialog.tsx`), the sprint detail head, each sprint row on its wave's own Sprints tab, the T3 timeline's segment label and tooltip, and the Waves screen's Sprint type facet. Icons resolved in `web/lib/sprint-type-icon.tsx`, the same split `shared/app-stages.ts` uses for its own mark. Ordinal, not A→Z: registered in R75's `ORDERED_OPTIONS_OK` (`sprint-form-dialog.tsx#sprintTypes`) and `FACET_ORDER_OK` (`wave-finder.tsx#sprintType`).

**App stage — `shared/app-stages.ts`, UNCHANGED by this correction.** The eight words and their order stand exactly as migration 0097 left them (Not started · Audit · Plan · Build · Validation · Refinements · Enhancement · Archived, `selectable_data.position` 1..8) — that half of 0097 was never in question, only which vocabulary its ICON belonged to. **The pill goes back to a coloured DOT** — "status has a color" — never an icon, on the gallery chip, the board card chip, the board-by-stage column heads, and the detail head pill. `AppStage.dotTone` (widened past `Badge`'s own six `DotTone` names to also reach the four `PriorityTone` names, the same combined union `record-calendar.tsx`'s `EntryDotTone` already takes) assigns each of the eight stages a distinct dot — Not started `blocked`, Audit `review`, Plan `purple`, Build `building`, Validation `orange`, Refinements `shipped`, Enhancement `done`, Archived `archived`. **One pair shares an actual pixel: `shipped`/`done` (Refinements/Enhancement) both resolve to `--kw-forest`** — the kit's closed palette (R32) has exactly SEVEN distinct hues across all ten named dot tones, and eight stages cannot each take a hue that does not exist; every other stage below takes a hue none of its seven siblings wears. `AppStageGlyph`/`web/lib/app-stage-icon.tsx` are deleted; the app form's own stage picker keeps its pill row (`AppearancePillGroup`, unchanged in shape) but draws no icon and no colour — a plain word row — because the pill CONTROL survived the correction even though its glyph did not.

**App STATUS ITSELF IS HELD.** The eight words above are not a fresh, considered answer to "what is an app's status" — only the set 0097 happened to leave behind when its icon moved elsewhere. Her own words: *"hold this until we define what the status is from the apps."* A follow-up ruling — what app status means, how many stages it has, and whether it should be inherited from the app's own waves and sprints rather than typed by hand — is still owed, and an artifact is being drawn for it. Until it lands, `shared/app-stages.ts` keeps the 0097 shape and this entry's dot mapping is the interim answer, not the final one.

**Not a law.** Like K26's type-icon binding, this is a vocabulary and icon-code decision recorded here for the next reader rather than independently checked. The seven Sprint type rows and the eight App stage rows are each created by their own migration; `shared/ui/` carries the icons and the dot tokens; no rule census enforces either exact order because the ordering IS the gating rule, through `position` + `PROTECTED` and each migration's own order.

### K29: Meetings — the List view, and emojis stripped from titles

**The rule.** Two parts, both client's ruling, 16 Sep 2026. First: *"meetings List = the Tickets column list"* — the Meetings main screen's List view draws the same columns as the Tickets collection does, a real `<RecordTable>` carrying the app's settled column discipline (R80), with the meeting-specific columns Meetings adds (the type, the purpose, the attendees count, the next action). Second: *"emojis stripped from meeting titles"* — meeting titles may no longer carry emoji, in the data or in the display; any existing row carrying a pictograph is either edited to remove it or the system strips it silently on read (the latter is the approach already taken for other emoji-stripped fields under R66). The meeting's own `notes` field is untouched.

**Not a law.** The column order, the table shape, and the emoji handling are each recorded here for the next reader; no census independently checks them.

### K30: Meetings — the Meeting types block is removed from the main screen

**The rule.** The client's ruling, 16 Sep 2026, implicit in the cleanup: the Meetings main screen previously drew a separate "Meeting types" panel; this is removed, and the meeting type remains a vocabulary choice available only through the Choices module (Meetings › Choices, the same door `shared/selectable-homes.ts` calls home for the `{ table: "meetings", column: "purpose" }` group). Meetings' own type vocabulary is still live (the column stays, the rows stay, the picker stays on the form and in filters), only the dedicated panel on the main screen is gone.

**Not a law.** This is a screen layout descope recorded here for the next reader.

### K31: All Contacts shows a fourth column, whether the contact is in the portal

**The rule.** The client's ruling, 16 Sep 2026, verbatim: *"In the All Contacts, add a
column to show if they are in the portal or not."* A fourth column, "Portal" / "No
portal", draws as a kit badge — shown only to a reader holding `portal_users:read`, since a
portal login is exactly the fact that right gates elsewhere in the app — and is unsortable,
the same as the Account and Role columns beside it.

**Law.** None registered — a column addition to an existing `<RecordTable>`, held to R82's
six-column ceiling like any other (see K32).

**AMENDED, 16 Sep 2026, same day — the column is a dot, not a full pill.** Read together
with the automations ruling below (B11): *"For contacts, portal: no portal, same as with
automations. Let's switch the design to the color dot. Portal: make it green, and no
portal: gray."* — and, the same breath, *"All dots are always solid, not rings."* The
Portal column now draws `<Badge variant="status" dot="shipped">` (green, "Portal") for a
live grant and `<Badge variant="status" dot="archived">` (grey, "No portal") for none
(`shapeContactsTable`, `web/components/deep-link/shape.tsx`) — the same shape the
automations status cell below moved to, and the same D17 tone table (`shipped` = green,
`archived` = grey). Still unsortable, still gated on `portal_users:read`, still one column
of the six.

**AMENDED, 17 Sep 2026 — the dot carries its own gap to the label.** The client's ruling,
verbatim: *"Validated the colors, but it's missing the space between the dot and the word.
Fix that."* Kit v1.2.102: the `Badge` component's dot variant carries its own `gap-1`
between the dot and its label, independent of size. `web/test/badge-dot-gap.test.tsx`
asserts every size variant (`sm` / `md` / `lg`) renders the gap consistently.

### K32: a table row holds at most six columns — the seventh goes on a second line, never squeezed onto the end

**The rule.** The client's ruling, 16 Sep 2026, over the Waves List view: *"the right side
of the container in waves is shape wrong. fix it and write the law."* N1 already named the
ceiling in prose — "at most … six in a table row … it does not get squeezed onto the end" —
but until this ruling it was prose, not a check. `waveListColumns`
(`web/components/work/waves-screen.tsx`) broke it silently: the same change that gave the
timeline's left column the wave's own App also gave List a seventh column for it, on a
collection already at six. A seventh column does not overflow the frame — the kit's own
`<Table>` self-scrolls inside its own container (R39) — it SQUEEZES every column, most
visibly at the row's own right end, where Start/End/Status crowd together against the
card's own inset.

**The fix** is N1's own prescription: the App fact rides the Account cell's own second
line, the identical primary-plus-muted-subline shape a collection row's title already draws
one column along (`record-timeline.tsx`'s `TimelineRow.sublabel`), never a seventh column of
its own.

**The check.** A static census reads every literal array in `web/`, `web-portal/` and
`shared/web/` whose elements ALL carry both a `key` and a `label` (the shape
`TableColumn` needs of both) and fails past six entries, unless the array's enclosing
function is named in `TABLE_COLUMN_BUDGET_EXEMPT` with the real reason. A recipe-driven
column list built by `.map()` over a config array (Tasks, Stories, Contacts' own
`contactColumnHeaders`) is out of reach by construction — it is not a literal array of
object literals at all, and its own ceiling is the recipe's `fields` array.

**Law.** [R82](../RULES.md) (`table-column-budget`), `web/test/table-column-budget.test.ts`.

**AMENDED, 16 Sep 2026, same day — the final column order, named exactly.** The client's
ruling, verbatim, over the fixed List view: *"this is the order of the columns that I want:
1. Wave 2. Status 3. Sprints 4. Start 5. Account."* `waveListColumns`
(`web/components/work/waves-screen.tsx`) now returns exactly those five, in that order —
Wave, Status, Sprints, Start, Account — one under the six-column ceiling with room to
spare. **End is dropped** (the sixth column the pre-fix table also carried is gone rather
than kept and squeezed); **App still rides the Account cell's own second line** the way
this rule's own fix above already prescribed, never a column of its own.
