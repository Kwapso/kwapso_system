# 4. Collections (part 2 of 8)

*Split from [documents/UI-RULEBOOK.md](../UI-RULEBOOK.md) — moved verbatim, cut rather than copied.*

### K18: a record with a face defaults to the gallery; the list is the alternate view

**The rule.** *"for accounts main: use gallery and add table as alternate view. filter by
account manager, country, status. sort by name - in the table columns: name status,
account manager, country."* — client, 14 Sep 2026. **The second body's WORD changed the next
day** — see [K22](#k22-rows-are-a-list-never-a-banded-table): "table" is retired everywhere,
including here, so the switch this entry describes is Gallery/List now, not Gallery/Table.
Nothing else about the rule moved: same second body, same `<RecordTable>`, same four columns.
The general shape: a collection whose records carry a picture or a logo opens on the gallery
(`CardGrid` + `RecordMark`, the same wall `members-gallery.tsx` already composes), offers the
list through `<ToolbarRow>`'s structured `view` slot ([K12](#k12-the-toolbars-slots-are-the-rows-in-one-order-and-sort-is-a-default),
the kit's `ViewSwitch`), and the list's own first column is the record's name carrying its
mark — never a bare label. Accounts is the first screen built to the shape:
`AccountsScreen` (`web/components/accounts/accounts-screen.tsx`) opens on
`view === "gallery"` ("the one on first load"), and its table draws four columns in her own
order — Name · Status · Account manager · Country — with only Name sortable
(`ACCOUNT_SORTS` has no order for the other three).

**Not a law, and the reason is on the record.** The engine's own `display: "gallery"`
(`screen-renderer.tsx`) would be the obvious chokepoint to derive this from — census every
recipe carrying a `picture`/`logoUrl`-shaped field for `display: "gallery"` — but Accounts'
own recipe (`accountsListRecipe`, `web/lib/screens.ts`) sets `display: "list"` and says so
itself: the screen no longer renders through `ScreenRenderer` at all, and `display`,
`leading` and `fields` on that recipe are explicitly VESTIGIAL, "kept in case a team's JSON
override still reads them, never consulted by the live screen." A census built against
`recipe.display` would therefore fail on the very screen the ruling is about — reading a
field the shipped code has already said it ignores is not an honest check, so this stays a
rulebook entry rather than a law until a real registry of host-composed screens exists to
check against instead.

### K19: Tasks — three tabs of your own, and a fourth for everyone's

**The rule.** The client's ruling, 2026-09-15, verbatim: *"For tasks in tab 'Overdue', I
want the board view by priority. This would be the secondary view. The main view would be
a table, and this is my tasks. This is my overdue tasks. Put the table, and the columns
would be: Task / Priority (has a color here) / Deadline / Department / Account / App /
Whatever you think relevant. Filters by priority, by department. For the tab 'Completed',
I want the view table only. Kill the tabs 'List' and 'Calendar' and replace them with a
new tab called 'Planned' or something like this. You choose the word. Here, I would like a
table view to be the main one, and then, as a secondary option, a board by priority and a
calendar by deadline. Also kill upcoming."* Her separate, standing ruling — "replace the
tab 'All' with 'Everyone's'" — reaches this screen too, in the follow-up the same day: the
old six-tab strip's status-agnostic "All tasks" is not retired with List/Calendar/Upcoming,
it is RENAMED and kept as a fourth tab, because it is the one tab that genuinely answers a
different question than the first three (team-wide rather than "this is my tasks").

**The tab strip.** `TASK_TABS`/`EVERYONE_TAB` (`web/components/work/tasks-screen.tsx`) is
now **Overdue · Planned · Completed · Everyone's** — four SERVER views (R14/R16), replacing
the six-tab strip (Overdue/List/Calendar/Completed/Upcoming/All tasks) this screen drew
before. The first three are MINE ("this is my tasks") — they narrow to the caller's own
name at the door unless the caller holds `all_tasks:read`; **Everyone's is the fourth, last
in the strip, and drawn only when the caller holds that same right** (`seesEveryones`) —
a caller who cannot see past their own name at the door would find it answering identically
to the first three tabs combined, so it is not offered. It is the door's own `all` view,
unchanged: no status filter, every task regardless of who has it. **Planned** is the
tester's own word for a precise definition: every OPEN task that is NOT overdue, whether or
not it carries a deadline at all — the exact complement of Overdue among the open ones, and
a strictly wider set than the old "Upcoming" view (dated, not yet due), which never included
an undated task. The door grew a matching `planned` view (`shared/types.ts`'s `TASK_VIEWS`,
`workers/content/src/lib/tasks.ts`'s `viewClause`) rather than relabelling Upcoming, which
stays defined (nothing else asked to lose it).

**The views, per tab, through the toolbar's structured `view` slot** ([K12](#k12-the-toolbars-slots-are-the-rows-in-one-order-and-sort-is-a-default)):
Overdue offers Table + Board by priority, **BOARD DEFAULT** (amended 2026-09-15, third pass —
"the default view on tasks overdue is board"; Planned's own default stays Table, the client
named Overdue alone and the two tabs answer different questions); Planned offers Table
(default) + Board by priority + Calendar by deadline; Completed offers Table only (the kit
still draws a static one-view label, kit v1.2.60, rather than the switch vanishing);
Everyone's offers the same pair Overdue does, Table (default) + Board by priority. All views
within one tab read the SAME search/priority/department-narrowed page — narrowing happens
once, ahead of the view switch, so Table→Board keeps what was typed.

**"TABLE" IS CALLED "LIST" NOW, EVERYWHERE — a later ruling the same evening, verbatim: "I
don't like this table anywhere, so anywhere in the app where you have it, replace it with
list. I don't want to say this again." The word above and everywhere else in this entry is
the SHAPE, unchanged (rows and columns, still `<Table>`/`<RecordTable>`, still literally a
table structurally); what changed is the LABEL a reader sees on the view switch —
`tableViewOption` (tasks-screen.tsx) reads `t("List")` now, value still `"table"` (nothing
stored, keyed or compared by that word changes), the identical word and glyph
(`ListBullets`) `tickets-collection.tsx`'s own view switch already uses for its own `list`
option. Applies to the word on every tab that offers it — Overdue, Planned, Completed's
static one-view label, Everyone's — from the one shared `tableViewOption` object.

**The table's seven columns**, one set for the three MINE tabs (replacing the old
everyday/completed split, since the Priority chip already carries what the two dropped
boolean columns — Important, Urgent — used to): Task, Priority (a coloured chip,
`Badge variant="status" dot={PRIORITY_DOT_TONE[level]}`, `shared/departments.ts` — the
first time anything in the app has coloured a task's priority), Deadline, Department,
Account, App, Who has it (Assignee). Completed adds an eighth, Closed. Status is
deliberately NOT a column: every tab is already a status scope (Overdue/Planned show only
open tasks, Completed only done ones, and Everyone's carries no filter of its own to
narrow it further), so a Status column would repeat one word down every row of whichever
tab is open. **Everyone's reorders rather than adds** (`EVERYONE_COLUMNS`): the same seven
fields, Assignee moved second — right after Task, ahead of Priority — because "whose is
this" is the first question a team-wide scan asks, where on the three MINE tabs it is a
fact about the reader themselves and belongs at the quiet end of the row.

**The board is editable, Everyone's included.** `content.updateTask` already replaces the
two ticks (`important`/`urgent`) that derive `priority`, the same door the edit form writes
through, so a drop sends the task's whole current shape back with the two ticks set for the
column it landed in (`movePriority`, tasks-screen.tsx) — contrast the tickets board
(tickets-collection.tsx's `OpenBoard`), which stays read-only because its stages are
flipped by OTHER events a drag would fight. Gated on `work:update`, on every tab that draws
a board — on Everyone's, that means a reader with the right can correct someone else's
priority from the board, exactly as they already could from that task's own record.

**The filter menu's own quirk, written down rather than hidden.** Priority's four options
are the app's own SCALE — 4→1, the door's own default order — but the shared facet reader
(`useFilterBar`'s `optionsFor`, [K17](#k17-the-options-a-control-offers-are-a-to-z-in-the-readers-own-language))
sorts every facet's options A→Z unconditionally, with no per-facet escape hatch at that one
chokepoint. So the FILTER DROPDOWN reads alphabetically ("Do it now" · "Important" ·
"Urgent" · "Whenever") while the table column and the board columns both read the true
4→1 order — an accepted, R75-driven consequence rather than a bug.

**AMENDED 2026-09-15, SAME DAY, A FEW HOURS LATER — six more rulings over the freshly
shipped strip.** Each is the client's own words.

1. *"On the toolbar, there is an add button with a plus, but there is also one underneath.
   There should only be one, and the correct one is in the toolbar."* The Table view's own
   `<RecordTable useKitPanel>` read the AMBIENT create action `<SectionWithCreate onCreate={…}>`
   publishes downward (`CollectionCreateActionProvider`,
   `shared/web/screen-engine/collection-frame.tsx`) and drew its own icon-only button in its
   ready-state toolbar even with every other kit-panel control switched off. Fixed the way
   `apps-screen.tsx`'s own list body already had to be: the Table render is wrapped in
   `<CollectionCreateActionProvider action={null}>`, so only the screen's own toolbar
   `<AddButton>` remains.
2. *"On overdue tasks, it's only mine, so make sure you filter it to me and remove the
   column 'Who has it'."* Until this the door's `all_tasks:read` gate decided the narrowing
   for EVERY view, so a caller who could see everyone's got everyone's on Overdue/Planned/
   Completed too — the fourth tab bought that reader nothing the first three did not already
   show. `getTasks` (`workers/content/src/routes/todos.ts`) now narrows those three views to
   `assignee_id = caller` UNCONDITIONALLY (`MINE_VIEWS`); `all_tasks:read` decides only whether
   `all` — the door's status-agnostic view, the Everyone's tab — comes back un-narrowed. "Who
   has it" (Assignee) is dropped from `TASK_COLUMNS`/`COMPLETED_COLUMNS` for the identical
   reason Status was already dropped: a column reading the same name (yours) down every row is
   furniture. `EVERYONE_COLUMNS` keeps it, second, right after Task.
3. *"also, add the logos to account and app."* The Account and App cells now draw
   `<RecordMark picture={…} name={…} />` beside the word — the same node `shape.tsx`'s
   `shapeAccountsList` draws for the Accounts table's own Name cell — fed by two fields the
   door did not carry before this pass, `accountLogoUrl`/`appLogoUrl` (`shared/types.ts`'s
   `Task`, joined in `workers/content/src/lib/tasks.ts`'s `TASK_COLS` off
   `accounts.logo_url`/`apps.logo_url`).
4. *"On tasks, on the list, add the sort to the toolbar and add sort by task priority and
   deadline. That's it. Make sure you remove it from the headers."* / *"the default sort is
   always by priority, so top priority on top, and after that, the deadline. I mean, within
   the same priority."* Tasks was `TOOLBAR_SORT_EXEMPT` until this pass — the exemption argued
   the Table view ordered by its own column headers, which R53 [K12](#k12-the-toolbars-slots-are-the-rows-in-one-order-and-sort-is-a-default)
   otherwise requires a reasoned exemption to skip. The exemption is DELETED
   (`shared/rules/registry.ts`) and so is the Table's own header-click sort: no `TableColumn`
   carries a `sort` key any more, so a header renders as plain text and `record-table.tsx`'s
   own `ordered()` is never reached (`if (!by) return rows`). ONE comparator now
   (`compareTasks`, `tasks-screen.tsx`), computed over the raw `Task[]` before the row is
   shaped: the toolbar's `<SortControl>` offers exactly Priority (default, descending — 4→1)
   and Deadline (default, ascending — soonest first), and picking either lands on that field's
   own default direction. TIES are fixed by the PRIMARY field and do not themselves flip with
   the direction toggle: sorting by Priority breaks a tie by deadline ascending, undated last;
   sorting by Deadline breaks a tie by priority descending (the app's own 4→1 scale) — the
   mirror-image sentence the client gave for each.
5. *"The whole 'waiting on clients': remove it from tasks. This is a completely different
   module, and we will put this somewhere else, but remove it from tasks."* The to-do panel,
   its two dialogs and its Open/Done counts are gone from the Tasks screen only — the door
   (`workers/content/src/routes/todos.ts`), the lib (`workers/content/src/lib/todos.ts`), the
   types (`shared/types.ts`'s `TODO_VIEWS`) and the cache key (`todosKey`) are untouched, and
   `TodosPanel` still renders on an account's own record (`account-detail.tsx`) and a contact's
   (`contact-detail.tsx`), each with its own raise/cancel controls — so the door keeps a
   working front door and this was never its only one. Awaiting the new home the client named.
6. *"on the board view for overdue, in the headers, I want to see the color of this priority,
   and the sort inside should be by deadline. On the top, the earliest deadline."* / *"on the
   tasks board view, when empty, don't show anything at this stage, but nothing on this
   priority."* Applied to every tab that draws a board (Overdue/Planned/Everyone's). The kit's
   own `KanbanColumn.dot` takes the identical tone union `PRIORITY_DOT_TONE` already resolves a
   priority to, so the column head carries it directly; the cards inside are sorted deadline
   ascending, undated last, FIXED — independent of whatever the toolbar's own Priority/Deadline
   sort is set to, because the board's within-column order was never that control's question.
   An empty column passes `emptyLabel: ""` so no placeholder sentence draws; the kit's own
   `EmptyRegister` box (also the column's drop target) still occupies the space at rest, which
   is as far as an app-side screen can take the ruling without a kit change — filed as a
   finding rather than patched around `shared/ui/`.

Rulings 2, 4 and 6 apply to Planned and Completed too, not only Overdue (Completed: table
only, still mine, still no "Who has it"); Everyone's keeps the assignee column and reads the
same sort/filters/logos as the three MINE tabs.

**AMENDED AGAIN, SAME EVENING, STILL LATER — "why now don't I see any task on any tab?"**
The unconditional narrowing ruling 2 shipped a few hours earlier had an unintended second
effect: read against the Kwapso team's own staging data, 254 of 259 tasks carry no
`assignee_id` at all, so `assignee_id = caller` left Overdue/Planned/Completed showing
almost nothing for almost anyone — unclaimed work included — not "one reader's tasks
specifically gone missing". The client's own words for the fix: *"a task nobody has is on
my list too."* `getTasks` now narrows those three views to `assignee_id = caller OR
assignee_id IS NULL` (`includeUnassigned`, `workers/content/src/lib/tasks.ts`'s
`TaskFilter`/`taskWhere`/`countTasks`) — an unclaimed task rides every caller's MINE tabs
alongside their own, badges included (R16: `countTasks` takes the identical OR-NULL clause,
never a narrower one than the rows it counts). Scoped to exactly those three views: Everyone's
already shows every row, claimed or not, and a caller who reaches for `all` without
`all_tasks:read` is still narrowed down to their own name only, no unclaimed bonus — the
OR-NULL widening is a MINE-tab question, not a permission grant. The by-id lookup
(`GET /api/content/tasks?id=`) was widened to match — `one.assigneeId === null` reads as
"mine" there too, unconditionally, so a task a MINE tab just showed never 404s one click
later. Proved in `workers/content/test/todos-tasks.test.ts`, describe block "an unassigned
task rides the three MINE views too, not only its own".

**FOUR MORE ITEMS, THE SAME EVENING'S THIRD PASS.** Each the client's own words, each
applied in `web/components/work/tasks-screen.tsx`.

- *"the task list is not correctly aligned. It is missing some width. Just replicate the
  list component as we have it in tickets."* The Table view's own toolbar
  (`<SectionWithCreate useKitPanel={false}>`) already sits inside its own card; nesting
  `<RecordTable useKitPanel>`'s DEFAULT row frame — a second, rounded `bg-surface-panel`
  card (`record-table.tsx`'s `renderItems`) — inside it read as inset and narrower than the
  flush toolbar above. `<RecordTable>` gained an opt-in `frame="bare"` prop (default
  `"panel"`, unchanged everywhere else) that drops the extra card, leaving a plain
  `<Table>` — the identical frame `tickets-collection.tsx`'s `TicketRowsTable` already
  draws for its own tabs. Tasks is the only call site that passes it; the other six
  (Accounts, Contacts, Meetings, and the two settings screens) are untouched.
- *"The default view on tasks overdue is board."* `overdueView`'s `useRemembered` default
  changed from `"table"` to `"board"`. Planned's own default stays Table — the client named
  Overdue alone, and the two tabs answer different questions (Overdue is "what is on fire,
  worst first"; Planned is still the wider list of what is not yet due). A reader who has
  already switched either tab keeps what they chose (`useRemembered` persists per reader
  from the first switch).
- *"adding a chip inside the board component with the app, account, or department, whatever
  is the most detailed… if it has app I only see the app; if only account, the account; if
  only department, department — in a chip on top of the title, like we have it already
  somewhere else."* That "somewhere else" is [K16](#k16-on-a-card-that-stands-for-a-record-the-chip-sits-above-the-title)/R65:
  `KanbanCard.badges` is the exact slot, the same one the tickets board already draws its
  own chip through. **AMENDED 2026-09-16 by client ruling, verbatim: "Replace the chip for
  always the department."** The board chip ALWAYS shows the task's department (plain text,
  no mark); a task with no department shows no chip. App and account no longer appear in the
  board chip — they remain in the list's Account/App columns and the week view's detail
  line, which was simplified to department-only for consistency.
- *"On Everyone's, add the column 'Closed On' or 'Finished On'."* `EVERYONE_COLUMNS` gains
  an eighth column, `closed`, reading the identical row key Completed's own eighth column
  does (`t.completedAt`, blank "—" for a task still open) — labelled "Closed on" rather than
  Completed's plain "Closed", because Everyone's mixes open and done rows where Completed's
  are all done, so the fuller label reads correctly beside a row with no answer yet.
  Overdue/Planned do not gain it: every row there is open by construction, so the column
  would read "—" down every line — the same furniture reasoning Status and "Who has it"
  were already dropped for.

### K19a: Priority has its own four colours, never App Stage's

**The rule.** The client's ruling, 2026-09-15, verbatim, the same day K19's "Priority (has
a color here)" shipped: *"For the priorities: 4: keep the red. 3: use the orange. Urgent:
use the purple. Whenever: use the blue."* Checked against `PRIORITY_LABEL`
(`shared/departments.ts`), never assumed: 4 is "Do it now", 3 is "Important", 2 is
"Urgent", 1 is "Whenever" — so the ruling reads **4 → red · 3 → orange · 2 (Urgent) →
purple · 1 (Whenever) → blue**.

**What shipped first, and why it moved.** `PRIORITY_DOT_TONE` had no existing chip to
reuse, so it borrowed four of `Badge`'s six App Stage lifecycle tones —
`archived`/`review`/`building`/`blocked` — "the only reusable name in reach", not because a
priority is a stage. One borrowing was a real defect, not a style question: `building` is
charcoal, the exact hex `--surface-inverse` is in light, so a priority-3 dot vanished
wherever the two met, and in dark it tripped `Badge`'s `building`-on-mango special case by
accident, painting the whole chip the one colour this system reserves for the brand — one
rank below "Do it now". The artifact at
`claude.ai/code/artifact/895888b7-ca1a-4df0-ae2d-c61b9127fb4e` measures the old mapping
against the new, side by side, with the contrast numbers for each.

**The tokens.** Four new tones, kit v1.2.89 (`shared/ui/foundations/tokens/tokens.css`):

| Priority | Word | Tone | Token | Source |
|---|---|---|---|---|
| 4 | Do it now | `red` | `--dot-red` | `--destructive` (`--kw-poppy` light / `--kw-poppy-lift` dark) |
| 3 | Important | `orange` | `--dot-orange` | `--warning` (`--kw-orange`, admitted 2026-09-02) |
| 2 | Urgent | `purple` | `--dot-purple` | `--kw-lavender` (admitted 2026-09-02, chart series 4) |
| 1 | Whenever | `blue` | `--dot-blue` | `--kw-sky` (the same hex `--info` reaches, under a name that means priority rather than "informational") |

No new hex for any of the four — every one is a colour the kit had already admitted.
`PriorityTone` (`shared/departments.ts`) is a type SEPARATE from `DotTone`
(`shared/app-stages.ts`), not four members bolted onto it — `record-week.tsx` and
`tickets-collection.tsx` each hold an exhaustive `Record<DotTone, …>` over the app-stage
six, and widening `DotTone` would have silently demanded four more entries in both, neither
of which has anything to do with a task's priority. `Badge`'s `dotTone` variant and
`Kanban`'s `KanbanColumnDot` both grew the matching four entries in the kit itself,
additively: none of the four is `building`, so the dark-mode mango special case stays
scoped to that one App Stage tone and can never fire for a priority chip again.

**Not a law.** Like K18, this is an arrangement/vocabulary decision recorded for the next
reader, not a registry check — `shared/departments.ts`'s own comment on `PRIORITY_DOT_TONE`
carries the same ruling and is the source to trust if the two ever disagree.

### K20: calendar views carry no sort

**The rule.** When a collection's active view is a calendar, a week or an agenda, its
toolbar draws no sort control at all — even where the screen still hands `<ToolbarRow>` a
`sort` config, because its OTHER views (Table, Board) genuinely want one. The suppression
lives in the row itself: `<ToolbarRow>` (`web/components/deep-link/screen-bits.tsx`) checks
its `view` slot's active value against `NO_SORT_VIEW_VALUES` (`"calendar" | "week" |
"agenda"`, the same file) and drops the `<SortControl>` it would otherwise build, on every
render, regardless of what `sort` is given. No call site can opt back in by continuing to
pass `sort` once its view lands on one of those three.

**Why it exists.** The client's ruling, 2026-09-15, over the week view design (see
[K12](#k12-the-toolbars-slots-are-the-rows-in-one-order-and-sort-is-a-default), R53, the
sort slot's own law): *"Never put the sort in calendar components. Make this a law. Makes
no sense."* K12 already lets a screen say "my rows have no order to offer" one exemption at
a time (`TOOLBAR_SORT_EXEMPT`) — three of those entries were already a month grid, a
calendar-shaped queue and a grouped pair of lists, the identical argument this law makes.
What changed is that a CALENDAR-SHAPED VIEW no longer gets to make that argument
screen-by-screen: it is a fact about the shape, decided once, centrally, rather than a
decision every future calendar/week/agenda screen has to remember to re-make.

**Law.** [R78](../RULES.md) (`no-sort-in-calendar-views`).

---

### K21: Sprints live inside Waves; no Sprints main page

**The rule.** A sprint has no sidebar destination and no top-level collection screen of
its own. It is planned and opened from the wave it belongs to: wave-detail.tsx's own
Sprints tab lists the sprints already in the package, and its "Plan a sprint" button
(plus "Put a sprint in this wave" for moving one already on the books) is the only door
that creates one. Opening a sprint from there lands at the nested address
`/waves/<waveId>/sprints/<sprintId>`, so its breadcrumb trail reads Wave → Sprint — never
a generic "Sprints" rung in between, the same nested-crumb shape `/apps/<id>/sprints/<id>`
already used. Waves leads the Build section of the sidebar now, first rather than last.

The `sprints` MODULE itself is unchanged: Settings › Modules and the roles matrix still
list it, and its permission right still gates the wave's own Sprints tab. Only the
stand-alone collection screen — the sidebar row, the `/sprints` top-level route, and the
render branch that drew it — is gone.

**Why it exists.** The client's ruling, 2026-09-15, verbatim: *"Regarding sprints and
waves, sprints go inside waves. I would suggest killing the sprints main page completely
and just keeping the waves one on top of the build section on the sidebar."* A wave IS
its sprints — putting one in or taking one out is the only thing that changes what the
package runs between — so a second, parallel place to browse sprints outside their wave
was two doors to the one fact, and the client asked for the redundant one closed rather
than kept in sync.

**Law.** [R64](../RULES.md) (`sections-have-a-door`) — `SECTION_HOSTED_ELSEWHERE.sprints`
(`shared/rules/registry.ts`) is the reasoned line that keeps the census honest about
where the capability lives now.

---

### K22: rows are a list, never a banded table

**The rule.** `RecordTable` (`web/components/records/record-table.tsx`) — the one
row-collection component every screen but Tickets' own bespoke `TicketRowsTable` draws
through — draws exactly ONE shape now: a flush, full-width `<Table>` with plain uppercase
column heads over hairlines, no hover wash on the header row, and nothing wrapping it. It
used to draw a second shape by DEFAULT — that same table boxed a second time in
`overflow-hidden rounded-[var(--radius)] bg-surface-panel`, a grey, rounded, inset card —
and that second box is gone from the component's source entirely, not merely switched off.
Every caller already sits inside ONE surface of its own (a `CollectionCard` from
`<PagedFind>`'s `wrap`, or the kit's own `useKitPanel` collection panel), so the banded
shape was always a redundant, doubly-nested box standing beside Tickets' own flush one —
never a legitimate alternative. The `frame` prop that used to choose between the two shapes
still exists, for source compatibility with the Tasks lane's own pre-existing call site, but
it accepts only the literal `"bare"` now and is never read: no call site can even ask for
the old look at compile time. A view switch that used to offer "Table" as a body offers
"List" instead — Accounts' own Gallery/Table switch is Gallery/List now, with the kit's list
glyph (`ListBullets`) beside it, matching Tickets' own view switch rather than the kit's
plain table icon.

**Why it exists.** The client's ruling, 2026-09-15, verbatim: *"On accounts, I want the
views to be gallery and list. I don't like this table anywhere, so anywhere in the app
where you have it, replace it with list. I don't want to say this again."* Earlier the same
day, about Tasks: *"Just replicate the list component as we have it in tickets. It's
already good there."* `<RecordTable>` had grown an opt-in `frame="bare"` a few hours before
that second ruling, for exactly one caller (`tasks-screen.tsx`, over a screenshot: "the task
list is not correctly aligned, it is missing some width") — proof the banded box was
visible and wrong, patched for the one screen she happened to be looking at. Her later
ruling, read literally, is the opposite of an opt-in: a component that defaults to the
wrong shape and offers an escape hatch is a rule with one way around it per call site that
forgets to ask, which is exactly how six screens ended up drawing the band while one did
not. So the escape hatch is deleted along with the shape it escaped, rather than widened
into six more `frame="bare"` call sites.

**Law.** [R80](../RULES.md) (`rows-are-a-list`) — `web/test/rows-are-a-list.test.ts` reads
`record-table.tsx` off disk for the banded fill and walks every `<RecordTable` mount across
`web/` for a `frame` prop carrying anything other than the literal `"bare"`.

**SETTLED, 16 SEP 2026** — the word for the whole app, not only the screens above: "List"
names this shape, the flush `RecordTable`/`TicketRowsTable` column list, and never
`shared/web/list-compat.tsx`'s two-line row, which Meetings briefly drew under that same
name and the client corrected by name ([B7](#b7-a-view-switch-is-a-labelled-pill-not-a-plus),
this document, carries the ruling verbatim).

---
