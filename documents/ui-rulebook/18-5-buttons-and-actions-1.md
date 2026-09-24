# 5. Buttons and actions (part 1 of 8)

*Split from [documents/UI-RULEBOOK.md](../UI-RULEBOOK.md) — moved verbatim, cut rather than copied.*

## 5. Buttons and actions

### B1: two visible actions maximum on any title

A record title carries at most **one primary** and **one secondary** button. Everything
else goes into a three-dot menu at the end of the group.

Ranking, when you have to choose which two survive:

1. The action that **moves the record forward** in its lifecycle (Answer, Start, Complete,
   In progress). This is the primary, `variant="default"`.
2. The action a person takes **most often that is not destructive**. Secondary,
   `variant="outline"`.
3. Everything else: Edit, Archive, Deactivate, Translate, Reply by email, Make it a
   story, Move up, Move down, Read the transcript, Take it back out.

Concrete target, `web/components/tickets/help-detail.tsx:418-539`, which is Aurora's seven:

| Action | Line today | Where it goes |
|---|---|---|
| Answer | 434 | primary button |
| Reply by email | 446 | menu |
| Translate | 419 | menu |
| Make it a story | 460 | menu |
| Edit | 471 | menu |
| Archive / Take it back out | 486, 497 | menu, destructive styling |
| Move up / Move down | 520, 530 | menu |

That is one visible button and a menu. `story-detail.tsx` keeps "Start timer" as primary
and "Edit" as secondary, moving "Move up" and "Move down" into the menu.
`sprint-detail.tsx`, `account-detail.tsx`, `app-detail.tsx` and `meeting-detail.tsx`
already have two or fewer and need no change.

Evidence: `A-4.05.52` shows exactly this: one "In progress" primary and a three-dot menu
containing Blocked, Edit, Archive, Delete. `A-3.58.01` shows "Start" plus a menu with
Edit and Delete. `P-4.10.05` shows "Open App" plus "New Ticket" and nothing else.
`A-3.57.42` and `A-4.07.25` show a menu alone.

> **AMENDED (2026-09-17): a third, standalone control is allowed when it is the pen.**
> The client's ruling, reading the deployed ticket detail page, verbatim: *"The edit
> button: put it outside, just the pen."* Edit left the ⋯ menu B1's own table put it in
> and became a standalone icon-only `PencilSimple` button in the title's own actions row
> (`web/components/tickets/help-detail.tsx`, the `actions` block) — never mango
> (`variant="inverse"`, since Close already claims the one primary slot this row is
> allowed), and never counted against the "most often, not destructive" secondary slot
> either, because it is not competing for a rank: it is *always* offered wherever
> `canEdit` is true, the same unconditional posture Files and links kept. The ticket
> title now carries three visible controls — Close (primary, mango), the pen (inverse,
> standalone) and the ⋯ trigger — plus the unrelated timer button, which was never one
> of B1's two counted slots to begin with. **The ceiling is now three where a pen edit
> exists as its own standalone control**, not two: one primary, one pen, and the menu
> trigger. This does not reopen the menu to a third competing action — Translate, Files
> and links, and Archive/Restore stay exactly where B1's original table put them, inside
> the ⋯. Only the pen moved, and only the pen earns the third slot.

### B2: the three-dot menu

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline" size="icon" aria-label="More actions">
      <MoreHorizontal className="size-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem>…</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem className="text-destructive">…</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

Every item keeps the icon from the UI-CONVENTIONS.md §4 mapping at `size-3.5`.
Destructive items sit last, after a `DropdownMenuSeparator`, in `text-destructive`, and
still open their confirm step. Only these `DropdownMenu*` names exist; there is no
`DropdownMenuRadioGroup` in this library.

Evidence: `A-4.05.52` (Blocked, Edit, Archive, Delete, with Delete last), `A-4.06.01`
(the same menu on mobile, In progress promoted into it), `A-3.57.48` (Edit, Delete).

### B3: the add button is a plus glyph with no text, everywhere

```tsx
<Button size="icon" onClick={onCreate} aria-label={`New ${nounSingular}`}>
  <Plus className="size-4" />
</Button>
```

`Button` already has `size="icon"` (`size-9`, `rounded-full`), which produces the round
dark button the old app uses. Change `web/components/deep-link/screen-bits.tsx:95-98`,
which is the single seam for every collection add button in the agency app, and
`web-portal/components/tickets-screen.tsx:62`.

The thirteen labels this deletes ("New task", "New story", "New meeting", "New role",
"New account", "Invite", "Raise ticket", "Add a source", "Map a process",
"Start a sprint", "Record an app", "Upload a file", plus the portal's) become the
`aria-label` and the tooltip. That also ends the two competing naming families
("New <noun>" and "<verb> a <noun>").

Evidence: `A-3.55.34`, `A-3.59.42`, `A-4.00.30`, `A-4.00.44`, `A-4.06.12`, `A-4.07.02`,
`A-4.07.11`, `A-4.07.34`. The old app uses a bare plus in every one, on desktop and
mobile, on top-level collections and on sub-collections.

The one exception, historically: the portal's "New Ticket" kept its label, because a
client visits rarely and needs the invitation (`P-4.10.05`, `P-4.10.12`, `P-4.10.19`).

> **AMENDED (2026-08-31): the exception is gone — there is no exception.** The client's own
> ruling, quoted verbatim in the portal's own source: *"+ actions never have a word, they
> are only the + icon."* `web-portal/components/tickets-screen.tsx:100-108` ships the
> portal's create action as the identical icon-only pattern every other add button in the
> app uses — the words become the accessible name and the tooltip, the same seam the
> agency's own `AddButton` draws create actions from — and the labelled button moves to the
> empty state instead (composition 27.21's own carved-out exception: "the only place a
> labelled create button is allowed, because there is no toolbar + to lean on and the
> screen exists to be filled"). A later, dated, sourced ruling beats an undated old-app
> screenshot; there is now exactly ONE shape for a collection's create action across both
> front doors.

### B4: import and export keep their labels and their icons

`Upload` plus "Import CSV", `Download` plus "Export CSV". These are rare, consequential
and not guessable from a glyph.

Evidence: (inferred) the old app has no import surface to copy; this follows from
UI-CONVENTIONS.md §4 and from the same reasoning as the portal exception in B3.

**Exception, 2026-09-15:** The Roles settings screen (`roles-matrix.tsx`) has no import or
export buttons. The client's ruling: *"Kill import and export for permissions settings."*
Permissions are maintained through the matrix UI only, never via bulk CSV operations.

### B5: a full-width outlined button is the pattern for a secondary action inside a panel

```tsx
<Button variant="outline" className="w-full gap-1.5">
  <Plus className="size-4" /> Task
</Button>
```

Evidence: `A-4.07.34` ("+ Task"), `A-4.07.25` ("Translate"), `A-3.59.09` ("Edit"),
`P-4.09.55` (the portal's full-width primary).

### B6: destructive stays red and still confirms

Unchanged from UI-CONVENTIONS.md §4. Moving an action into the menu does not remove its
confirm step.

### B7: a view switch is a labelled pill, not a plus

Calendar / Grid / List switches are `Button` with an icon and a label, filled when active.
Do not make them icon-only; they are modes, not actions.

Evidence: `A-4.08.47` and `A-4.08.56` ("Grid" as a filled dark pill with a grid glyph).

**A view switch's OPTION SET may depend on the tab it sits beside** — Meetings,
2026-09-09 ("calendar as a view") and 2026-09-15 (her tabs/views ruling in full, verbatim):
*"In meetings, the tabs that I would like are: This week / Mine / and: Replace 'All' with
'Everyone's'. The views I want in 'This week' are: Agenda chronological (this is only for
mine, unless I say so, and it's always filtered to mine). Same goes for tasks and meetings.
Again, on 'This week', I want the views: Agenda / Calendar / Table. On the 'Mine' tab, this
shows all of my meetings, past and present. I also want the views: Calendar / Table. On
'Everyone's', I want the views: Table / Calendar."* Three tabs, three DIFFERENT view lists —
This week: Agenda · Calendar · Table; Mine: Calendar · Table; Everyone's: Table · Calendar —
the first named in each is that tab's own default, and the choice is remembered PER TAB, not
in one shared slot, so switching tabs never strands a reader on a body their new tab does not
offer. Still one `ToolbarViewSlot` config (R53's fixed slot order), just built from the open
tab rather than a constant. "List" retired everywhere it appeared here in favour of "Table" —
she asked for Table, not List. SUPERSEDED A FEW HOURS LATER, the next paragraph. "Agenda" is
the kit's own `Agenda`
(`shared/ui/components/agenda/agenda.tsx`, CH19 view 10) drawn through the ONE host wrapper
every calendar/agenda in the app is required to go through (`RecordCalendar` /
`RecordAgenda`, `web/components/records/record-calendar.tsx` — see the "ONE CALENDAR" law,
`web/test/rules.test.ts`'s `one-calendar`), never imported directly by a screen. STILL TRUE.

Evidence: `web/components/meetings/meetings-screen.tsx` (the header block above
`MeetingsScreen` carries her words verbatim and the whole redesign).

**TABLE RETIRED A SECOND TIME, IN FAVOUR OF LIST — 2026-09-15 (evening), tested a few
hours after the AM rebuild above shipped, verbatim:** *"On meetings this week, replace the
view table for list."* / *"On meetings, mine: replace table for list. Same in everyone's."*
Every tab now offers List instead of Table, in the exact same slot her AM ruling gave it
(first-named is still that tab's own default): This week is Agenda · Calendar · List; Mine
is Calendar · List; Everyone's is List · Calendar. The row is one shape on every tab — a
`RecordMark`, the title, and a date · time · meeting type · account detail line — drawn
through `shared/web/list-compat.tsx`'s `List` (the same component every other collection's
list body draws through), never the retired `ScreenRenderer` path this base used before
Table existed and never a second hand-rolled row. Alongside it, the same evening: *"On
meetings, kill the import."* The toolbar's "Import CSV" button, the empty state's own
"Import a list" act and the `onImport` prop that fed both are gone from this screen — the
import DOOR itself is untouched, reachable from Home's own generic "Import" tile.

**WEEK JOINS BESIDE CALENDAR, ON EVERY TAB — the fourth ruling, once the week lane's own
`RecordWeek` (`web/components/records/record-week.tsx`) landed.** Order is now This week:
Agenda · Calendar · Week · List; Mine: Calendar · Week · List; Everyone's: List · Calendar ·
Week — Week always sits immediately after Calendar, first-named still each tab's own
default. Each card carries the meeting's start time as `CalendarEntry.time`, drawn as
`RecordWeek`'s own eyebrow (never a placeholder when a meeting has none). `MeetingsWeek`
(`meetings-screen.tsx`, beside `MeetingsAgenda`) builds the rows straight off the tab's own
loaded page, the same choice Agenda already makes, rather than a dedicated week-scoped door
read — Calendar is the one view with that investment, built for the month grid specifically.

Evidence: `web/components/meetings/meetings-screen.tsx` (the header block's "THE VIEW SLOT
STAYS" paragraph and `MeetingsWeek`'s own doc comment).

**RESOLVED, 16 SEP 2026 — the caution above was right to hold, and the instruction it
declined was right too.** The client confirmed it herself, directly, verbatim: *"Also, the
list view on meetings is completely wrong. I want it exactly like the one in tickets. What
you did is something different. Once again, kill the emojis. Also, when they're in the
name, just remove them, please."* So the `list-compat.tsx` row this section used to describe
is gone, a second time, and this time for good: Meetings' "List" is `RecordTable` in the
tickets shape (R80/K22 — see K22's own note below), the same shape the caution above named
almost exactly — Name · Date · Time · Type (`purposeCell`, the meeting type's own Phosphor
icon beside its name) · Attendees (faces, then a `+N` count past three) · Account
(`accountCell`, a mark and a name) — on every tab that offers it, sort staying in the
toolbar's one `<SortControl>`, no column head clickable, matching Tickets' own
`TicketRowsTable` ("deliberately do not sort"). This settles the word for the whole app:
**"List" names the flush, hairline COLUMN list (R80/K22's shape), never the two-line
`list-compat.tsx` row** — the same settlement K22 itself records, one file below. Titles
arriving from Google Calendar are stripped of every emoji/pictograph at ingest
(`workers/content/src/lib/meetings.ts`'s `titleOf`) and again at display for a row synced
before this ruling shipped (`stripPictographs`, `shared/text-clean.ts`), and the "Meeting
types" link at the foot of the main screen is gone outright — the same day's ruling, "this
should not be there because this is already on the meeting settings" — leaving Settings ›
Meetings › Choices as its one door.

Evidence: `web/components/meetings/meetings-screen.tsx` (the file's own header block carries
the 16 Sep 2026 ruling verbatim), `web/test/sorted-columns-declare-their-type.test.ts`
(`DOOR_ORDERED.when`/`.time`), `shared/text-clean.ts`.

**"Calendar" IS THE MONTH VIEW, ONLY — 2026-09-15, the same AM ruling, read further:**
*"Agenda is a different component than month. Inside the calendar, the whole month
agenda: disable that. When I mean calendar, I mean the month view."* `RecordCalendar`
used to offer its OWN month/agenda switch (a `ToggleGroup` inside the component, on
top of whichever view list above put "Calendar" on the tab) — a phone opened on that
inner agenda by default. That inner switch is gone: `RecordCalendar` draws the month
grid and nothing else, on every device, so picking "Calendar" from a `ToolbarViewSlot`
above always lands on the grid. "Agenda" stays exactly what B7 already says it is — the
kit's `Agenda`, reached through `RecordAgenda`, a genuinely different component reading
a caller-narrowed set of entries day by day — never a mode the calendar itself switches
into. `components/toggle-group` is consequently unreached and carries a
`KIT_COMPONENT_EXEMPT` line (`shared/rules/registry.ts`) rather than a live adoption.

Evidence: `web/components/records/record-calendar.tsx` (file header, "ONE WAY TO READ
ONE MONTH").

### B8: action rows wrap and the group is pushed right with `ml-auto`

Already law (UI-CONVENTIONS.md, C4). Restated because [B1](#b1-two-visible-actions-maximum-on-any-title)
shrinks these rows to two items and the wrap rule must survive the edit.

### B9: pagination is numbered, centred, at the foot of the collection

`Button variant="ghost" size="icon"` for previous and next, numbered pages between.

Evidence: `A-4.06.45`. This app currently uses a "Load more" button
(`web-portal/components/tickets-screen.tsx:88`), which R14's keyset paging supports
either way. (inferred: adopting the old app's numbered form; both satisfy R14.)

### B10: a module's settings have two entrances and one page behind them

**The rule.** *"Does every module get the gear? Only the ones with something to set."* A
module that has something to set gets a settings **gear on its own screen** and a row on
the **Modules tab** in Settings, and those are two doors onto ONE page — because
*"everything around settings should be under settings screen concentrated (and 'quick
access' through the gear in each module) but not in random places across the app."*

Four things follow, and none of them is a per-screen decision:

1. every module named in `MODULE_SETTINGS` has **exactly one** gear mounted in `web/`, and
   every gear mounted names a module that table declares. Both directions, because each
   failure is invisible on its own: a settings page with no gear is a page nobody standing
   on that module can find, and a gear on a module with nothing to set renders nothing for
   ever and looks exactly like a module that has no settings;
2. the Modules panel on `web/components/screens/settings-screen.tsx` spells no module of
   its own — its rows are built from the same table, so they cannot be hand-kept;
3. **the permission is asked once.** `visibleModuleSettings`
   (`web/components/screens/module-settings-screen.tsx`) is the one expression that decides
   whether a module has settings THIS reader may open, and the gear, the page and the tab
   row all ask it. Her sentence, held structurally rather than restated three times: *"a
   reader who may see tickets but not the vocabulary should not be offered a door that
   refuses them."*
4. **inside one module's own page, a tab is drawn only where something is behind it, and
   its badge counts ROWS — the same rule R16 states for every collection in the app, not
   an exception to it.** A module that owns both an Automations section and a Choices
   section gets two tabs; a module with only one kind gets a single tab, never a second,
   empty one beside it — the standing refusal against a control that decides nothing, read
   onto a tab instead of a switch (`module-settings-screen.tsx`, reasoned from
   R36/R50/R61). The badge on each follows R16 through the one `formatCount` seam. The
   Automations count is the module's own row count in the `AUTOMATIONS` registry — a code
   constant rather than a query, but still a count of automations, one row per automation.
   **The Choices count RULED TWICE, one day apart, and the second ruling is the one
   standing.** Client, 2026-09-14, pointing at the two tabs: *"show the total count for
   Automations and for Choice Components categories, not for the amount of choices"* — read
   at the time as GROUPS (categories), never the values inside them. Client, 2026-09-15,
   on seeing what that produces on the Tickets page (a badge reading 1 over a panel
   listing 15 values): *"Even though I can see a lot of active ticket choices, it still
   shows me the choices count as 1… I would rather all badge counts show me the count of
   rows rather than types, so please change it."* The second ruling is broader than the one
   screen it was noticed on — every tab badge in the app, ~25 of them, already counted the
   rows its own panel lists; the Choices badge was the lone exception, and the
   inconsistency was the defect. It now counts VALUES, read off the same cache the panel
   below it already primes (R56 — no second door ask), standing down to no badge at all
   (`formatCount(undefined)`) rather than a possibly-wrong one whenever its source is still
   loading or came back at the door's own hard cap — a wrong number is worse than no
   number, the same refusal R23 and R42 make elsewhere in this app.

**Law.** [R61](../RULES.md) (`module-settings-two-doors`).
