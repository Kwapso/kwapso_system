# 2. Page layout and width (part 4 of 4)

*Split from [documents/UI-RULEBOOK.md](../UI-RULEBOOK.md) — moved verbatim, cut rather than copied.*

### L32: any choice over a person, a contact, an account or an app shows the same face the lists show

**The rule.** Aurora, verbatim, about the new Raised-by `Select` on the ticket form and page:
*"every time there is an avatar, I want to also see it in the choice component, so I also want
to see the avatars here."* A picker's own row is not exempt from the face law the rest of the
app already carries ([R35](#), "a record never appears without its face"): the photograph where
a record has one, initials on the record's own tone where it does not — and, new here, it shows
in the TRIGGER's own chosen value too, not only the open list.

**Why the trigger needed its own fix.** `SelectItem` already carried an `image` prop, but it
rendered a bare `<img>` with no fallback — the exact silhouette mismatch RULES.md §4.4 already
named for a picker's mark disagreeing with the record's own. And nothing drew a mark in the
trigger at all: Radix clones the chosen option's `ItemText` children into the closed field, and
an `<img>` cloned there would have been a second, unasked-for drawing inside the 44px pill — so
the mark was deliberately kept OUTSIDE `ItemText`, which is exactly what kept it out of the
trigger too.

**The shape.** kwapso-design v1.2.127 gave `SelectItem` and `SelectTrigger` a shared `face`
prop — `{ src, name, tone, shape }` — both rendered through one `SelectFaceMark` helper over the
kit's own `Avatar`/`AvatarImage`/`AvatarFallback` primitive (a real photo-or-initials fallback,
never a bare image). The trigger's face is handed in by the call site, because it already knows
which option is selected (it is what supplies the placeholder text); the mark is keyed on its
own identity so a stale `Avatar` load-status left over from a PRIOR photo selection can never
bleed into a new no-photo one. Wired in this app: the ticket form's and the ticket page's
"Raised by" contact pickers, and the work-logs panel's "Logged by" staff filter (initials only —
the door behind that one carries no photo field yet, an open, named gap rather than a silent
workaround).

**Status: ruled and in build, 19 Sep 2026.**

**Law.** [R90](../RULES.md) (`faces-in-choices`) — scoped to the kit's `<Select>`, since R35
already holds `RecordPicker`/`PickerOption` to this account through a different, structural
mechanism (the TYPE, not a prop). A static census, `web/test/faces-in-choices.test.ts`, detects
a choice over a record by its own options array's field names (`personName`/`contactId`/
`memberId`/`accountId`/`avatar`/`photo`/`initials`) and fails when a `<SelectItem>` inside one
carries no `face=`.

---

### L33: at lg the conversation card stretches to match the side column's stack height; below lg it keeps its floor

**The rule (SUPERSEDED 19 Sep 2026 ~12:15).** Aurora's ruling, 19 Sep 2026 ~10:55, verbatim: *"i want that the conversation has more heugh - use the heig set by the ocmponents on the left column."* On the ticket detail, at the `lg` breakpoint and above, the conversation card (the thread + composer) grows to match the height of the side column's own stack of cards (the stage ladder, stakeholders, assignees, etc.) — the two scrolling independently side by side when either overflows its own container. Below `lg` the card keeps its own floor of 420px (`min-h-[420px]`), as the current layout already does.

**The shape (SUPERSEDED 19 Sep 2026 ~12:15).** At `lg` the conversation cell is `flex-1 min-h-0`, making it claim all remaining vertical space after the top card's content settles, and the card itself is `h-full`, growing its own content to fill that space. The thread inside it is `overflow-y-auto` with a `min-h-0` floor on its container, so it scrolls when taller than the column. The composer is the card's own `CardFooter`, the last child, sitting at the card's own foot as D21 already proves. Below `lg` a media query releases both constraints (`lg:min-h-0` on the cell and container), returning the card to its natural height plus the 420px floor.

**AMENDED 19 Sep 2026 (~12:15) — side column height and scrolling behavior.** Aurora's ruling, verbatim: *"there shoudl be no scrolling to see al right column items<11 expand the height! / scroll only on conversation when taller than right column / is it so hrd to understand me? kmk"* The side column (Related stories, Work logs, Raised by, On the loop) never scrolls and is fully visible; the row is as tall as the side column's natural height; the conversation card matches that height and scrolls inside only when its thread is taller; when the side column is taller than the screen the page scrolls, the band staying pinned last with the panel gap above it; below lg unchanged.

**Status: ruled, in build, 19 Sep 2026.**

**AMENDED 19 Sep 2026 ~13:30–13:40 (Round 27)** — at lg the row is as tall as the right column, which never scrolls; the conversation matches it and the chat scrolls inside it when longer (confirmed by her answer 3, round 27). The two-column row's own height resolves to the side column's content height, never a flex `h-full` on the conversation cell — the side column declares its own natural height and the conversation takes that same height, scrolling only the thread inside the conversation card when the thread is taller than that measure. Below lg the single-column layout applies, with one page scroll and the conversation card keeping its 420px floor.

**Status: amended, in build, 19 Sep 2026.**

**Law.** None registered.

### L34: never need to scroll to see all content

**The rule (R91 `no-nested-scroll`).** Aurora's ruling, 19 Sep 2026 ~13:30–13:40, verbatim: *"never need to scroll to see all content!!! (only exception chat compnents)"* — stated as a standing law to be enforced everywhere. One page scroll only; no scroll area inside a page's content. When a section or component fits its own container, nothing scrolls. When it does not, the section itself becomes a bounded scrolling region with an explicit `overflow-y: auto` / `overflow-x: auto`, never the page scrolling one region and an inner section scrolling another. **Exceptions:** chat components (the conversation thread scrolls inside its card, by this rule's own L31/L33 shape); the rail's own list of sections (pinned height, scrolls on overflow); the assistant pane (one aside scrolling region); true overlays (dialogs, sheets, popovers, listboxes — a modal or a dropdown may scroll internally and holds no relation to the page's own scroll). **Not covered:** horizontal scroll on tables and boards. R91 is a vertical law only, horizontal was never in question.

**AMENDED, 21 Sep 2026: the five pending scrollers and the tables/boards question, both settled.** Five sites (the assistant's History tab, the paused-turn confirm list, the tickets dashboard's chart column, the import wizard's rejected-rows preview, and the meeting transcript preview) were shown to Aurora on a decisions page, one recommendation each, keep or flatten. Her ruling, verbatim: *"confirm"*, she accepts every recommendation. **Kept**, moved from pending to sanctioned in `NO_NESTED_SCROLL_EXEMPT`: the History tab list ("same shape as the rail's own sanctioned list"), the dashboard chart column ("a bounded dashboard widget, not the page itself"), the import preview ("a bounded preview inside one wizard step, the same shape as a dialog body"), and the meeting transcript preview ("a transcript flowing into the page would bury everything else on the record"). **Flattened:** the paused-turn confirm list (`agent-panel.tsx`) no longer scrolls on its own; the page scrolls, and a list longer than five steps is capped by a "Show more" door (L33/R88 style) rather than a second moving region beside the thread's own sanctioned scroll.

Separately, asked whether a table or a kanban board is a sanctioned shape of its own, Aurora's ruling, verbatim: *"like everything else"*, it is not. A table or a board obeys R91 exactly as every other component does, no carve-out: a vertical scroll region inside one is an ordinary offender, caught by a second, narrower census (`findTableBoardOffenders`, same test file) against `TABLE_BOARD_SCROLL_EXEMPT`, empty as of this ruling because no table or board in the app currently scrolls on its own. Horizontal stays exactly as it was: a wide table's or a board's own `overflow-x-auto` is still not this law's subject.

**Status: validated, 21 Sep 2026.** Aurora's "confirm" and "like everything else" close both open items this rule carried.

**Law.** [R91](../RULES.md) (`no-nested-scroll`).

---

### L35: when a main person is chosen, they disappear from the secondary picker over the same pool

**The rule (R92 `main-excludes-secondary`).** Aurora's ruling, 20 Sep 2026, verbatim: *"Generally, always when selecting main/secondary people (staff, contacts, etc.): when I select the main, this person should not be available as secondary. E.g. when I select 'Raised by,' this person should disappear from the 'Keep in the loop' options. Make this law."* Two independent pickers over one shared pool — raised by / keep in the loop, assignee / reviewer, account manager / members, owner / stakeholders — the secondary picker excludes the chosen main's id through `withoutMain()` (`shared/web/without-main.ts`), rather than every call site re-deriving the `.filter()` by hand. **Not this shape:** a "Main X" field chosen FROM an already-narrowed secondary list (`app-form-dialog.tsx`'s "Main stakeholder", picked from the ticked "Stakeholders" checkboxes) — there the main is meant to be a member of the secondary set, the opposite relationship, and this law's own census leaves it alone by field name (`main<Something>Id` is never read as the "picked independently" shape).

**Status: ruled and in build, 20 Sep 2026.**

**Law.** [R92](../RULES.md) (`main-excludes-secondary`) — a source census, `web/test/main-excludes-secondary.test.ts`, pairing a single-value main picker with a `mode="multi"` secondary picker in one file by their shared source array, and requiring the secondary to call `withoutMain(` (or an equivalent exclusion `.filter()`), or be named in `MAIN_EXCLUDES_SECONDARY_EXEMPT`.

---

### L36: every avatar, icon or colour rides beside its text — filters, views and select components alike

**The rule (R93 `visual-accompanies-text`).** Aurora's ruling, 20 Sep 2026, verbatim: *"When selecting a module, also show the module's icon. Make this law: always, if there's a visual (avatar, icon or color), it should always accompany the text everywhere (filters, views, select components…), the only exception being avatars/logos in chips."* Extends L32/R90's own face rule to icons and colours, on an entity that is not a person. Scoped to modules the day this law shipped — the one population this codebase can name without guessing a type from prose: every module array is `AppModule[]` (`shared/types.ts`), carries a real `icon` field, and the module's own gallery card already draws it. A status or ticket/story-type colour already has its own standing rule (K39/R86) and its own picker census, so this rule stays about the module gap her own words named rather than re-litigating that population. **The one named exception is her own:** an avatar or a logo inside a CHIP may still omit it.

**Status: ruled and in build, 20 Sep 2026.**

**Law.** [R93](../RULES.md) (`visual-accompanies-text`) — a source census, `web/test/visual-accompanies-text.test.ts`, over every `<Select>`/`<RecordPicker>` whose options map a module-named source array (in a file that imports `AppModule` from `@shared/types`, so a same-named-but-unrelated array is never caught), requiring the module's own icon (`icon=` on the `<SelectItem>`, or `icon:` in the option literal), or a name in `VISUAL_ACCOMPANIES_TEXT_EXEMPT`.

---

### L37: a record's chips draw in one fixed order — id, status, type, main parent, secondary parent

**The rule (R94 `chip-order`).** Aurora's ruling, 20 Sep 2026, verbatim: *"On story detail, the chips in order: id, status, type, app (underlined), sprint (id, underlined). This must always be the order, everywhere, for other things too: 1 id, 2 status, 3 (if) type, 4 main parent, 5 secondary parent."* One seam, `orderChips()` (`shared/web/chip-order.ts`): every chip is tagged with which of the five kinds it is, and the seam sorts by that tag rather than the order a caller happened to write the JSX in. A kind simply absent from a given record (no type vocabulary, no secondary parent) is left out, never padded. Caught a real, live defect the day this law shipped: `contact-panels.tsx`'s "tickets raised for this contact" row drew the type chip before the status chip, the two swapped from this order, under a green build — fixed by routing the row through `orderChips`.

**Status: ruled and in build, 20 Sep 2026.**

**Law.** [R94](../RULES.md) (`chip-order`) — `orderChips()`'s own unit tests prove the resolved order; a source census, `web/test/chip-order.test.ts`, over every chip row carrying both an id chip (`<RecordRef`) and a status chip (`variant="status"`/`ticketStatusCell(`) within one reading window, requiring an `orderChips(` call, or a name in `CHIP_ORDER_EXEMPT`.

---

### L38: no em dash, anywhere a person reads

**The rule (R95 `no-em-dash`).** Aurora's ruling, 20 Sep 2026, verbatim: *"no em dahses - ABOSLUTLEY NOWHERE. In the ui, in the e-mai,s, in the glossary. They are strictly forbidden. make it law."* No exemptions table — every failure this law finds is fixed at the source. Three surfaces: the translation catalogue and hand-written seed (every language), every JSX text node/`t(...)` argument/visible property reachable from either front door plus `shared/web/`, and every email a worker sends (`shared/workers/email-template.ts` and every derived `sendBrandedEmail(`/`brandedEmail(` site) — and the glossary's own words. En dash (U+2013) is held to the same standard as em dash (U+2014) in prose; a range like "Mon–Fri" is written "Mon to Fri" instead, a numeric range like "10–16" as "10 to 16", and an aside that used to ride a dash takes a comma, a colon or a period, whichever the sentence asks for. Code comments and doc prose carry no obligation.

**Status: ruled and in build, 20 Sep 2026.**

**Law.** [R95](../RULES.md) (`no-em-dash`) — a source census, `web/test/no-em-dash.test.ts`, six censuses (the catalogue, the seed, the front doors' own import closure read at `visitStrings()`'s seven positions, `shared/web/` read the same way directly off disk, the email template plus every derived send site, and the glossary), each stripped of comments first with `stripComments` and each carrying its own tripwire.

**VALIDATED 20 Sep 2026 (Round 30).** Aurora reviewed staging this round and confirmed the law
live: no em dash anywhere a person reads.

**Status: validated, 20 Sep 2026 (Round 30).**

---

### L39: the id chip is black

**The rule (R96 `id-chip-is-black`).** Aurora's ruling, 21 Sep 2026, verbatim: *"id pill must always be black! f..e in backlgoits not black."* Said over the Backlog list, whose standalone ID column drew a story's own reference as plain text, no chip at all. `shared/web/record-ref.tsx` (`RecordRef`) is the one shared id chip register, the kit's own ink fill token pair through `variant="inverse"`, never a literal colour, and it already stands for every record that carries a reference (a ticket, a story, a sprint, an app, a wave, a meeting, an input). Two shapes of the same mistake: a record's reference drawn inside a `Badge` in a quieter tone instead of black, and a standalone `ID` column (her own 20 Sep 2026 ruling adding one to Planned/Backlog) rendered as bare text with no chip around it at all.

**Status: ruled and in build, 21 Sep 2026.** The three Backlog sites this rule was written over — `storyLead()`'s and `ReviewsQueue()`'s own chips, and the standalone `ID` column shared by `PLANNED_BACKLOG_COLUMNS` and `REVIEWS_LIST_COLUMNS` (`web/components/work/stories-screen.tsx`) — now route through the register too: the two badges call `<RecordRef>` directly, and the column wires it through `RecordTable`'s own `TableColumn.render` slot, keyed off the `ref` column, while the shaped row still carries the raw string for search and sort. `ID_CHIP_EXEMPT` carries no entry for `stories-screen.tsx` any more.

**Law.** [R96](../RULES.md) (`id-chip-is-black`), a source census, `web/test/id-chip-is-black.test.ts`, over both front doors plus `shared/web/`: every bare record reference sitting inside a `Badge` that is not `variant="inverse"`, and every standalone `field("ref", "ID")` column, must route through `<RecordRef>` — directly, or through a `render` callback the census recognises by its own wiring shape — or be named in `ID_CHIP_EXEMPT`, keyed by the offending line's own text rather than a line number.

---

### L40: a count never gets its own card

**The rule (R97 `counts-beside-titles`).** Aurora's ruling, 21 Sep 2026, verbatim: *"While it is a rule that when it's a count, unless explicitly said, it doesn't deserve its own card. Just by rule, same as related tickets or related stories or stakeholders: just a count next to the title."* A number that counts things (how many tickets, how many stories, how many stakeholders) never earns a card, a tile or a stat box of its own; it sits beside its panel's own title, in the count register the app already builds for exactly the case she named: `TicketSidePanel`'s own `count` prop (`{title} {count}` on the heading's own line, "Stakeholders 4") and `CollectionHeading`'s own badge, one level up, for a whole screen's own count.

**Status: ruled, and read as open, 21 Sep 2026.** Two shapes found the day this rule was written: the kit's own `<StatGrid>` primitive (a number-and-label card by construction), three call sites, the tickets dashboard's own stat strip, the assistant's metric blocks, and the work-logs summary strip; and a hand-rolled metrics grid, the story page's own "Metrics" panel (cycle time / effort / flow efficiency). Whether a dashboard's own wall of numbers is the "explicitly said" exception her ruling leaves open is not decided here — every `<StatGrid>` site found is named, not removed, reason "pending her word". The story page's own Metrics panel is a known offender another lane owns (it is folding the panel into the Effort card the same session this rule was written); reported rather than fixed here.

**Law.** [R97](../RULES.md) (`counts-beside-titles`), a source census, `web/test/counts-beside-titles.test.ts`, over `web/components` and `web-portal/components`: every `<StatGrid` call site, and every file repeating the app's own KPI-tile value styling (`font-mono text-sm font-semibold`, two or more times in one file) twice or more, must be named in `COUNT_REGISTER_EXEMPT`, keyed by file.

---

### L41: every button is the kit's own height

**The rule (R98 `button-sizes`).** Aurora's ruling, 21 Sep 2026, verbatim, validating the fix to the Knowledge Sync button (`size="sm"` sitting beside toolbar siblings at the kit's own default 40px, K56 above): *"Validated. This is a rule for all buttons, so make sure that I don't find any others like this."* Every button in a toolbar, a page head, a card header or a form foot uses the kit `Button`'s own default size, or `size="icon"` (the same 40px height), never `size="sm"` (32px) or a custom height/padding class.

**Status: ruled and in build, 21 Sep 2026.** Twenty-three call sites across seventeen files carried `size="sm"` in one of the four named surfaces the day this rule was written and were fixed the same session: the `record-calendar`/`record-week`/`record-timeline` "Today" buttons, `filter-bar.tsx`'s "Clear filters", the toolbar `actions=` slots on `account-detail-panels.tsx` and `triage-queue.tsx`, `process-detail.tsx`'s two card-header actions, `read-a-call.tsx`, `wave-phase-days-panel.tsx`'s and `email-change-dialog.tsx`'s form feet, `draft-review.tsx`'s card header, `process-date-slider.tsx`, `triage-strip.tsx`'s page head, `ticket-rating.tsx`'s form foot, `kwapso-screen.tsx`'s panel header, `staff-panel.tsx`'s page head, and `import-screen.tsx`'s two card headers.

**Law.** [R98](../RULES.md) (`button-sizes`), a source census, `web/test/button-sizes.test.ts`, over both front doors plus `shared/web/`: every `<Button` (or a future `<IconButton`) carrying `size="sm"` or a custom `h-`/`py-`/`px-` class, matched past a nested `{…}` expression so an `onClick` arrow's own `=>` never closes the tag early, must sit outside a toolbar, a page head, a card header and a form foot, or be named in `BUTTON_SIZE_EXEMPT`, keyed by `{file, contains}`, the offending Button's own opening-tag text rather than a line number.

---

### L42: no record closes while its own clock is still running

**The rule (R99 `no-close-while-timer-runs`).** Aurora's ruling, 21 Sep 2026, verbatim: *"cannot mark anything as closed (task, story, ticket, whatever) if there's an active time log running."* A story's Done button, a ticket's Close button and a ticket's Archive menu item all ask the same question, whether a timer is running on that record, and are disabled, with the reason *"Stop the timer first,"* while one is. The check lives at the door first (`refuseWhileTimerRuns`, `workers/content/src/lib/work-logs.ts`, `GuardError(409, "timer_running", "Stop the timer first.")`), and the button only reads the same fact back, the shape every mirrored refusal in this app already takes.

**Status: ruled and in build, 21 Sep 2026.** Three doors carry the check: a story's Done (`setStoryStatus`), a ticket's resolve (`setStatus`) and a ticket's archive (`setTicketArchived`). `tasks.ts`'s own Done door already carried this exact check, written inline before the shared helper existed, with its own note asking for the swap the moment it landed; that swap is a known pending site owned by the tasks lane, not made here.

**Law.** [R99](../RULES.md) (`no-close-while-timer-runs`), a source census, `web/test/no-close-while-timer-runs.test.ts`, over `workers/content/src/lib`: every exported function that both compares a status to one of "done", "resolved", "closed" or "completed" and writes a closing column (`status`, `completed_at`, `archived_at`, `resolved`) must call `refuseWhileTimerRuns(`, or be named in the check's own `CLOSE_DOOR_EXEMPT`, keyed by `{file, fn}`, a dated reason and never a line number.

---

### L43: the no-containers experiment, grouped sections lose their box in the tickets module first

**The ruling.** Aurora, verbatim, 21 Sep 2026: *"i am scarde about deploy8nig the o cntainers, is it possible to deploy in tickets module only? i wanna have it there, we review and iterate, and when good ship to the full app and update the ui kit and repo"*

**What changes.** The no-containers change (removing the grouping card box around sections like Assigned to, Related stories, Related tickets, Stakeholders, Effort, Detail and similar sections on detail screens, so they sit on the paper background directly instead of on a raised card) ships to the tickets module first as an experiment, gets reviewed and iterated there, and only then rolls out to the whole app, the UI kit and the repo. Chips, tabs, buttons, tables, toolbars, tiles and the conversation card stay boxed as they are. The No Containers page (five staging screens redrawn) was validated by Aurora on 21 Sep 2026: *"artifact validated, go ahead and deploy tickets when ready"*. Status: design validated, build in the tickets module pending her live review.

**Extended, 21 Sep 2026.** Aurora, verbatim: *"can yo do it also on tickets main?"* The tickets main page follows: the collection frame around the toolbar and the table, board, split or list on every tab, and the Overview chart panels, render plain; the board cards, the rows' washes, the triage well and the error and empty states keep their paper. Still the tickets module only.

**Her review of the live tickets pages, 21 Sep 2026.** Aurora, verbatim:

*"* the search on toolbar needs to have backhogunrd color
* bring abck the color on t stage in board view
* stakeholders raised by design like in the loop (chip like)
* same with assigned to (chiplike)
* on board view the acrds need some kind of border/shape (i like what you did in the artofact - see in screenshot your artifact)
* EVERYWHERE (not only tickets) align the gear settinsvvutton to middle horozotnal of title"*

**Reading it.** The toolbar search takes a fill; the board column head carries the stage colour; Raised by and Assigned to are chips like On the loop; board cards take the kit hairline on a plain ground; the module settings gear centres on the title line on every screen in both apps (a new rule for all modules, not the experiment).

**The rule (R100 `head-actions-centred`).** Her fifth item above, read on its own because it is not scoped to tickets or to this experiment: *"EVERYWHERE (not only tickets) align the gear settinsvvutton to middle horozotnal of title."* Every screen head that draws an action (a module settings gear, an edit pencil, or any other head-mounted control) beside its own title sits on the middle of the title's own line box: `items-center` on the row, never `items-start`/`items-end`/`items-baseline`. A head with a stacked title-plus-subtitle centres the action against the title element alone: split the title onto its own row, away from the subtitle underneath it, rather than centring against the whole two-line block. The kit's own `Title` composition already does this for free, since v1.2.146; this is for the app's own hand-rolled rows that never reached for it. Wired the day this law shipped: `web/components/records/collection-heading.tsx` and `web-portal/components/collection-heading.tsx` (both `action` rows, `items-start`/`items-baseline` → `items-center`), and `web/components/screens/kwapso-screen.tsx` (its title row split from the subtitle underneath it).

**Law.** [R100](../RULES.md) (`head-actions-centred`), a source census, `web/test/head-actions-centred.test.ts`, over `web/components`, `web-portal/components` and `shared/web`: every `<div>`/`<section>` whose `className` carries `flex` (a row, never `flex-col`) and both a title marker (`<h1`, `<Title`, `<Headline`, a bare `{heading}`/`{title}` expression) and an action marker (`ModuleSettingsGear`, a bare `{action}`/`{actions}` expression, `headActions`) in one JSX subtree must also carry `items-center`, or be named in `HEAD_ACTIONS_CENTRED_EXEMPT`, keyed by `{file, contains}`.

**Toolbar rhythm on tickets, 21 Sep 2026.** Aurora, verbatim: *"on tickets, reduce space above and under toolbar to 10px"*. Reading it: on the tickets page the tab strip carries no space of its own below the tabs, so the toolbar sits 10px under the tabs and 10px above the first row.

**Her review of the tickets pages after the toolbar rhythm, 21 Sep 2026.** Aurora, verbatim: *"i really loev the dircteion in which we are going, look sso minimal and clean / but the board component look sso bad :// / please, in artifact go and fix it / also, the ocntent on the main component need a bit more spacing on the sides / i am scraed making this switch will make us have to review all componets!! / for this reason, create an artifact with all components in ui kit that would change (the unchaged do not touch them) and show it to me / do think in ui! so do not just remove the container but make adaptations needed / the goal: make a more minimal clean app / the same spacing thats now before the footer i want above nav and on sides, bring more air"* **Reading it.** The direction is validated. The board needs a real design on the white ground, drawn in a page first. The content pane gets the same air above the nav row and on both sides as it has before the footer band. Before the switch goes app wide, a page inventories every kit component whose look changes under the plain surface, each with the adaptation it needs; unchanged families are left alone. Status: page in progress, decisions pending.

**Her decisions on the Minimal Kit page, 21 Sep 2026.** Aurora, verbatim: *"* board A / * space 6 / go an imlpement tis appwide, also implement the to the bottom edge for main content and assistant like in yur previous artifact / also, make footer not inside a container, but the full row side to side (withing the main content) / use subagents / do think a lot abouot each component, what this minimalising means so that it siill works / do not update the ui repo yet, we will first iterate on this"* **Reading it.** The experiment ends and the plain surface goes app wide: boards take option A (soft paper lanes, white raised cards with the hairline edge, the head inside the lane, a quiet placeholder at the top of an empty lane); the content pane's air is space-6 (24px) above the nav row and on both sides, the same as before the footer band; the main content pane and the assistant reach the viewport bottom with no gutter; the dark footer band spans the pane edge to edge as a full row; the kit changes are committed and tagged locally and synced, not pushed, until she closes the iteration.

**Status, 21 Sep 2026.** App wide, kit v1.2.149 local. The kit side is done and pulled
(`shared/ui/VERSION.json`; its CHANGELOG's top entry is the index to the ten parts). The
app side is done in both front doors: `CollectionCard`, `TicketSidePanel` and
`EmptyGatedPanel` all default to plain, so every module's grouping sections and every
collection frame in `web/` and `web-portal/` render plain without a call site naming it;
the toolbar's painted pill is retired; the collection tab strip's `tight` rhythm is the
only one left; the record footer band spans the pane edge to edge; the boards take the
kit's soft paper lanes by default. The tag is local and unpushed, at her instruction: *"do
not update the ui repo yet, we will first iterate on this"*.

**OVERTURNED under this ruling: K1, the collection panel keeps the card's paper
(2026-08-23).** The kit's own K1 reversal is what gave a collection frame its soft paper
slab in the first place, and every "the frame is the paper" sentence in this rulebook and
in the kit descends from it. It is overturned here rather than edited there: its words
stay exactly as written, because they are the record of what was decided in August and of
why the frame looked the way it did for a month, and a ruling that rewrites the ruling it
replaces leaves nobody able to see that anything changed. What is true after 21 Sep 2026
is this paragraph: a collection's frame paints nothing, and the soft paper the K1 reversal
put there is reachable but unused (`CollectionFrame panel="paper"`, `CollectionCard
surface="boxed"`) for a frame that genuinely stands on off-beige. The same overturning
reaches [R67](../RULES.md) (`sections-stand-on-paper`), whose first sentence was "each
panel stands on paper" and whose surviving clause is now "a section paints the page or the
kit's paper, never a stroke, never a hex".

**Her review of the minimal app, 22 Sep 2026.** Aurora, verbatim:

*"* screenshots: Look at the search bar in the toolbar. It has different distances from the left. Make sure that you make this exactly the same everywhere, by the way. The correct one on the screenshots is the one on status ready.
* Third screenshot: The empty collection now. We need to get rid of the card background.
* Reduce the space for the ID column everywhere. It's too much. And also rename it. I don't want it to be called ID. If it's ID for ticket, call it ticket. If it's ID for story, call it story.
* In the fourth screenshot, on the footer, there should be no white on the sides. Make the black go side to side.
* On the loop still has a background. Remove that in tickets. And everywhere where there is this error
* Fifth screenshot. That's definitely not what you showed me on the artifact. Make sure that you review your artifact, and please correct that. What's wrong is the alignment and margin in the metrics cards, and that the rows below should not have a background.
* 6th screenshot: The latest activity always has to be at the very bottom, and also make it a stripe, not a container. On the other hand, in any kind of screen that requires that the footer displays only one column instead of two, put the record on top and the latest activity on the bottom. On this screen, the whole "Assigned to", details, and deadline should not have a background."*

Reading, item one: the toolbar search field sits at the same left edge everywhere, matched to the status Ready construction (tickets_collection.tsx through paged_find.tsx), never a per screen inset.

Reading, item two: a collection's own empty state stops papering itself, in every ground it can land on, matching the plain page it sits on.

Reading, item three: every table's id column narrows to its own chip width and reads the record's own noun (Ticket, Story, and the rest), never the bare word "ID".

Reading, item four: the record footer's dark band (Latest activity, Record) fills the pane edge to edge, no page gutter left showing white on either side.

Reading, item five: the "On the loop" state and the matching error state drop their paper background in tickets, and on every surface that draws the same shape.

Reading, item six: the metrics cards on the story page take the alignment and margin her artifact showed, and the rows under them stand on no background at all.

Reading, item seven: Latest activity pins as a stripe at the very bottom of the record footer, never inside a container; a footer that must show one column instead of two stacks the record above it and Latest activity below it, and on that one column layout Assigned to, the details, and the deadline stand on no background either.

---
