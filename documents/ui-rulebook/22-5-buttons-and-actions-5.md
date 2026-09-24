# 5. Buttons and actions (part 5 of 8)

*Split from [documents/UI-RULEBOOK.md](../UI-RULEBOOK.md) — moved verbatim, cut rather than copied.*

### B36: the Waves screen's default view drew no door on a team with zero waves

**The defect.** Found by a proof on staging, 20 Sep 2026. A team with no waves at all
lands on the Waves screen's DEFAULT view (Timeline, both tabs,
`waves-screen.tsx`'s own `useRemembered<WaveView>("view", "timeline")`), and had no
way at all to sell the first wave. The toolbar carrying "Sell a wave" was correctly
withdrawn (R50: no toolbar at all over an empty collection), but `RecordTimeline`'s own
`emptyBody`, the body Timeline fell into, is a plain sentence with no door, and
`RecordCalendar`'s `emptyText` carried the identical gap. Only the List view (reachable
from the All tab, never the screen's own default) fell through to `CollectionEmptyState`
and its "Add the first": one working door on a screen with three bodies, none of them
the one a person actually landed on.

**The fix.** R88 (empty-state-single-door) already names the register; this screen just
was not reaching it from two of its three views. `all.length === 0` (the tab/account
scoped collection itself, never the search-narrowed `rows`) is hoisted above the
per-view branches in `waves-screen.tsx`, so Timeline, Calendar and List all draw the
identical `CollectionEmptyState`: title, description, and the one door, gated on the
create right and on there being a client to sell to (`canCreate && clients.length > 0`),
exactly the real-world gate the toolbar's own button already carried. A reader without
the right sees the sentence and no button, R88's own second clause. The toolbar stays
withdrawn (R50, untouched). The FILTERED zero (a search or facet narrowing a non-empty
collection to nothing) is unaffected: Timeline and Calendar keep their own "no match in
this window" sentence, and List's `CollectionEmptyState filtered` still stands, now
provably reachable only when the collection is not the genuinely empty case above.

**Status: fixed, 20 Sep 2026.**

**Law.** R88 (`empty-state-single-door`), reinforced. No new registry entry: the
existing law's own register was simply not wired to two of the screen's three views.

---

### B37: a wave's own stage is read off its active phase

**The rule.** Aurora, verbatim, 21 Sep 2026: *"stage wave: read the active pahse that
sit. makes sense?"* - read literally: a wave carries no stage column of its own
(`shared/waves.ts` - "a wave is a wave"); what a wave row or its head SHOWS as its
stage is the wave's own ACTIVE phase.

**What it decides.** Four cases, in the order she named them: the phase whose start
and end dates contain today is the stage; if none does, the earliest phase that has
neither started nor completed (upcoming) is; if every phase has ended, the wave reads
"Complete"; if the wave carries no phases at all, "No phases yet". Icon only, no
colour - the same ruling that put an icon on a sprint/phase type in the first place
(`shared/sprint-types.ts`): the stage reads the active (or upcoming) phase's own TYPE
through the identical pill a phase already wears on the wave's own Sprints list
(`SprintTypeGlyph`, `web/lib/sprint-type-icon.tsx`).

**Where it is wired.** One shared helper, `shared/wave-stage.ts` (`phaseState`,
`waveStage`), pure and date-only - no `completedAt`/`active` flag decides a phase's
state, only whether its `startsOn`/`endsOn` bracket today. One presentational
component reads it on both sides of the app, `WaveStageMark`
(`web/components/work/waves-screen.tsx`, two variants: `"text"` for the wave row's
own Phases cell and the T3 timeline's sublabel, `"chip"` for the wave head's own chip
row, `wave-detail.tsx`). A deactivated phase never counts - every call site filters
to `s.active` before handing its phases to the helper.

**Status: shipped, 21 Sep 2026.**

**Law.** None registered - an arrangement decision, not a machine-checked law. Proved
by `web/test/wave-stage.test.ts` (the helper's four cases) and
`web/test/wave-stage-mark.test.tsx` (the row and the head, through the one shared
component both draw).

**AMENDED 20 Sep 2026 - two fallbacks, found in the live proof.** The rule above
named four cases for the STAGE and said nothing about what a phase with no TYPE, or
a wave with no DATES of its own, should draw - and the live proof of this same work
found both gaps, on the row and on the head alike.

1. **A typeless active/upcoming phase is still a phase, never a blank chip.**
   `WaveStageMark` read a `null` `sprintType` as `sprintTypeHasGlyph(type)` false and
   `type ? t(type) : ""` - an icon-less `Badge`/span with an EMPTY label, which reads
   as nothing at all, on the row's own Phases cell and on the wave head's own chip
   row. The fallback: the phase's own NAME (every phase carries one; a phase cannot
   be created without it), under the GENERIC phase icon - `CalendarDots`, the same
   Phosphor glyph `CONCEPT_ICON.sprints` gives the Phases nav item (`web/lib/
   pages.ts`) - never the empty label. A phase whose type IS set but is not one this
   app's vocabulary carries a glyph for (a team's own retired or custom word) is
   unaffected: it still reads its own word, with no icon, exactly as before - the
   fallback is for a MISSING type, not an unrecognised one.

2. **The head's own "Runs" line derives from its phases when the wave carries no
   dates of its own.** `waveDates` read only the wave's own `startsOn`/`endsOn` and
   fell straight to "No phases planned yet" the moment either was unset - even with
   a dated phase sitting right there on the Phases tab, because the door's own
   `recalcWaveDates` recalculation can lag a read, or a phase can be attached the
   same moment the screen renders. `waveDates` now takes an optional third argument,
   the wave's own active phases; when the wave itself carries neither date, Runs is
   the EARLIEST phase start to the LATEST phase end (mirroring the door's own
   recalculation), and only when no phase carries a date either does the sentence
   stand. A wave that carries even one of its own two dates is unaffected - the
   phases are read only when the wave itself answers neither.

**Where it is wired.** Both fixes live in the same two functions B37 already names -
`WaveStageMark` and `waveDates` (`web/components/work/waves-screen.tsx`) - so the
row and the head still draw through the one shared component and the one shared
helper; nothing new was built. Proved by `web/test/wave-stage-mark.test.tsx`'s own
new cases: the typeless-phase fallback on both the `"text"` (row) and `"chip"`
(head) variants, plus the same fixture read through `waveListRows` for the row
specifically, and the `waveDates` phase-derivation cases (one date, several phases,
neither date and no phases either).

**VALIDATED 21 Sep 2026.** Aurora reviewed staging this round and confirmed the rule
live, verbatim: *"confirm."*

**Status: validated, 21 Sep 2026.**

---

### B38: "To Do" means scheduled in an active phase, not merely open

**The rule.** Aurora, verbatim, 21 Sep 2026: *"Backlog, To Do: nono, to do means its
scheduled in an active phase."* - a correction over the 20 Sep round (B27) that gave
`open` two unconditional words, "Backlog" on the List and "To Do" on the kanban
column, and never asked whether the story was actually scheduled anywhere.

**What it decides.** The stored statuses are unchanged (`open`/`in_progress`/
`in_review`/`done`). The WORD for an open story is now derived off the same test B37's
own helper answers for a wave: "To Do" when the story sits in a phase active today,
"Backlog" otherwise (no phase, a future phase, or one that has already ended).

**Where it is wired.** One shared label helper, `shared/story-status-word.ts`
(`storyStatusWord`/`openStoryWord`/`storyInActivePhase`), reading `phaseState` off a
`Story`'s own `sprintStartsOn`/`sprintEndsOn` (the second of the two joined beside the
first, 21 Sep 2026, `workers/content/src/lib/stories.ts`). Every screen that draws an
open story's status word now calls it: the Backlog list (`stories-screen.tsx`'s
`shapeStories`), the story detail's chip and its Overview row (`story-detail.tsx`),
the nested Stories panel's own line (`work-panels.tsx`'s `storyLine`), and the kanban
board's own "To Do" column, which now holds only a story whose own phase is active
(`storyBelongsOnKanbanColumn`, `stories-screen.tsx`). **The board decision, said out
loud:** `stories-screen.tsx`'s own board has three fixed columns and no Backlog
column, so an open story outside an active phase is simply left off the board, the
same way a finished story already is - it stays reachable on the List and Backlog
tabs. `work-panels.tsx` never had a stories board at all (List only, through
`PagedPanelBody`), so there was no second board to decide about there; its own facet
now offers "Backlog" and "To Do" as two choices (`backlog`/`to_do`) that map to the
derived rule rather than to a stored value - new virtual words the door itself
resolves (`OpenStoryFacetStatus`, `workers/content/src/lib/stories.ts`:
`status=to_do`/`status=backlog` both narrow to the stored `open` status, told apart by
the same phase-active predicate in SQL).

**AMENDED 21 Sep 2026 - the Backlog TAB gets the identical facet, door-narrowed.** Until
this pass only `work-panels.tsx`'s own nested Stories panel offered Status as a facet,
through `<PagedFind>`'s own door-forwarding; the top-level Backlog tab (`stories-screen.tsx`,
built on `useFilterBar` rather than `PagedFind`) offered Category alone, filtered in the
browser. Aurora's own ruling names the filter itself as the point ("the filter offers them
as two choices"), so the Backlog tab's `facets` array now carries a Status facet too, gated
to that one tab (`view === "backlog"` - Reviews and Now keep whatever facets they already
had, untouched), four choices in that order - Backlog, To Do, In Review, Done, no In
Progress, because the everyday backlog is never the board. Narrowed through the DOOR, never
client side (R14/R16): picking a value changes `storiesQ`'s own cache key
(`storiesKeyForView`, `stories-screen.tsx`) and re-asks `contentApi.stories({ view:
"backlog", status })` from page one, the identical `OpenStoryFacetStatus` words the door
already answers for the nested panel's own facet; `<LoadMore>` carries the same narrowed key
and status forward so paging past page one keeps the same question.

**Status: shipped, 21 Sep 2026.**

**Law.** None registered - an arrangement decision. Proved by
`web/test/story-status-word.test.ts` (the label helper), `web/test/story-status-board.test.ts`
(the List's own cell and the board's own column predicate, plus the nested panel's facet's
five choices), `web/test/stories-backlog-status-facet.test.tsx` (the Backlog tab's own four
choices, in order, gated to that tab, and a live render proving a pick issues a real
`status=to_do` request rather than a client-side filter), and
`workers/content/test/stories.test.ts` (the door's own `to_do`/`backlog` filter, driven end
to end).

---

### B39: MoSCoW is paused

**The rule.** Aurora, verbatim, 21 Sep 2026: *"pause everything to do with moscow, but
remind me at later stages."* Every MoSCoW surface a person can SEE is withdrawn; the
data and the doors are untouched, so nothing here needs re-entering the day she asks
for it back.

**What it narrows.** The MoSCoW tag on a story row/board card and on the record's own
Overview row (`MoscowChip`); the stories screen's own facet and sort option
(filtering/ordering the backlog by priority); and the segmented Must/Should/Could/
Won't control on the story form. `Story.moscow`/`MOSCOW_VALUES` (`shared/types.ts`)
and the `create_story`/`update_story` doors keep accepting and returning the field
exactly as before - an existing story's priority is neither cleared nor hidden from an
edit's own submit, only from every screen that used to SHOW or SET it.

**Where it is wired.** The app's own PARKED mechanism (`shared/rules/registry.ts`,
proved by `web/test/orphan-components.test.ts`): each surface moved out of
`stories-screen.tsx`/`story-detail.tsx`/`story-form-dialog.tsx` into a file of its
own - `web/components/work/moscow-chip.tsx`, `moscow-field.tsx`, `moscow-filters.tsx` - and nothing imports any of the three any more, so the census that catches an
unmounted component proves these are unmounted on purpose rather than by accident.
Three `PARKED` entries (`work/moscow-chip`, `work/moscow-field`,
`work/moscow-filters`) each say in writing where the surface went and how to wire it
back. The MCP tool catalogue's own `moscow` mention (`create_story`/`update_story`'s
field description) is untouched, per her own ruling's shape - the field stays
accepted; `list_stories` never advertised `moscow` as a filter, so there was nothing
to withdraw there.

**Status: shipped, 21 Sep 2026.**

**Law.** None registered - a product pause, not a UI conformance rule. Proved by
`web/test/moscow-parked.test.tsx`: the three files are named in `PARKED` and mounted
nowhere, the story form and the backlog's own row/toolbar carry no trace of the field,
and each moved-out surface still renders correctly when called directly ("parked, not
dead").

---

### B40: who may edit a chat reply on a ticket

**The rule.** Aurora, verbatim, 21 Sep 2026: *"who may edit: A author onñy."* Read as
offered to her (option A, of however many she was shown): the author may edit and delete
their own reply; a person holding the ticket edit right (`help:update`) may DELETE any
reply but never edit someone else's words; a client from the portal may only touch their
own, unchanged from before this ruling.

**What it narrows.** Until this ruling, `help:update` reached both halves: the same
colleague who could take a reply back out could also rewrite it. That is no longer true.
Edit is the author's own fence and nothing else reaches it now; Delete keeps the wider
one it always had, the author or anyone holding the ticket edit right. The chat
edit/copy/delete menu (B30) narrows with it: a colleague holding `help:update` still
sees Copy and Delete on somebody else's reply, never Edit.

**Where it is wired.** The fence itself splits into two functions,
`assertMayEditReply`/`assertMayDeleteReply` (`workers/content/src/lib/help.ts`), one per
door (`POST /api/content/help/reply/update` refuses a non-author outright, in plain
words; `POST /api/content/help/reply/delete` is unchanged). The app's own menu
(`help-detail.tsx`'s `TicketThread` call site) offers `onEditRequest` only to the
author, and `onDelete` to the author or anyone the ticket edit right already governs.
The external surface carries the same split: `update_help_reply` is author only,
`delete_help_reply` keeps the wider fence (`documents/MCP.md` §3).

**Status: ruled, in build, 21 Sep 2026.**

**Law.** None registered. A permission fence, proved at the door
(`workers/content/test/help-reply-actions.test.ts`) and at the app's own wiring
(`web/test/ticket-thread-actions.test.tsx`), not a UI conformance check this book's
registry enforces.

---
