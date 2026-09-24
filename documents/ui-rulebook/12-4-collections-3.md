# 4. Collections (part 3 of 8)

*Split from [documents/UI-RULEBOOK.md](../UI-RULEBOOK.md) — moved verbatim, cut rather than copied.*

### K23: Apps — gallery and board by stage, never tiles or a table

**The rule.** The client's ruling, 15 Sep 2026, verbatim: *"For the main screen for the
apps, I want the gallery icon laid out. Make sure you add a chip with the status. I also
want you to add an alternate view board by stage. Include the icon, and in both of them, I
want to see the status. In the gallery, make this a chip, then the title and the subtitle:
the name of the account. In the board, make the icon bigger, and as you have it, the title
and subtitle: account name."* This replaces the Tiles/List pair the 2026-08-31/2026-09-01
rulings put on `AppsScreen` (`web/components/apps/apps-screen.tsx`): Tiles becomes Gallery
(a flat `CardGrid`, K18's own shape) and List is dropped outright rather than kept as a
third view — no law pins it (`web/test/rows-are-a-list.test.ts` (R80/K22) governs
`<RecordTable>`'s own shape and never reached Apps, whose old List body rendered through
the screen ENGINE, `ScreenRenderer`, not `RecordTable` — so its removal answers this brief's
own "remove it unless a law pins it" clause honestly: none did).

**"Status" is the app's own stage.** `AppRow` (`shared/types.ts`) carries no separate status
field — an app's lifecycle IS its `stage` (`shared/app-stages.ts`), the same fact
`app-detail.tsx`'s own three pills already draw a coloured `Badge` off. Both new views draw
`<Badge variant="status" dot={appStageDotTone(app.stage)}>{t(app.stage)}</Badge>`, above the
title in source order ([K16](#k16-on-a-card-that-stands-for-a-record-the-chip-sits-above-the-title)/R65).

**The Gallery** is a flat `CardGrid` of kit `Card`/`CardTitle` cells — `RecordMark`
(`size="band"`, the same size K18's own accounts wall draws), the status chip, the title,
and the account name as a subtitle line. THE SUBTITLE IS A CARD FACT, NOT A PAGE HEAD — R72
(`no-default-subtitles.test.ts`) was amended 2026-09-14 to read the kit's own `CardTitle` as
a heading, so the subtitle is built as a variable and interpolated (`{subtitle}`) rather
than written as a literal prose tag the very next JSX sibling of `<CardTitle>` — the same
escape `accounts-screen.tsx`'s own `accountGalleryBody` already takes for its manager chip.

**The Board** is the kit's `Kanban` (`shared/ui/components/kanban/kanban.tsx`), one column
per stage in the team's own "App stage" vocabulary order (`useAppStages`, exported from
`app-form-dialog.tsx` — the identical team-ordered read that picker already made, never a
second one with its own fallback), plus a trailing "No stage yet" column so an app with none
recorded is never invisible. NEVER A→Z: R75's own `ORDERED_OPTIONS_OK` names the class of
list this is (a lifecycle pipeline read left to right), though no registry line was needed
here — the board's columns are a plain array fed to `<Kanban columns=…>`, never a
`<SelectItem>`/`options=` prop, so R75's own picker census does not reach it. Each column's
dot is the stage's own tone (`appStageDotTone`) when the code recognises the stage, absent
otherwise. Cards carry the status chip, the icon — bigger than the Gallery's
(`RecordMark size="board"`, 80px, the fifth NAMED size in `shared/web/record-mark.tsx`,
added for exactly this call site rather than a className fighting the size prop) — beside
the title (the vendored card draws chips, then title, then description, then `content` LAST
always, with no leading-media slot before the chip row to put a big mark in without
hand-editing the pinned kit, R39), and the account name as `description`. Dragging a card
calls the app's existing update door (`POST /api/tenancy/apps/update`, gated
`processes:update`, the same right the app record's own edit form writes through) with the
minimal patch — `id`, the always-required `name`, and the new `stage` — so a drag can never
silently empty an app's staff, logo or context. `emptyColumns="bare"` (client ruling,
2026-09-15, the same sentence that shipped the Tasks board's own): a team with few apps
across many stages draws no boxed "nothing here" registers, only a thin, still-droppable
zone.

**Not a law**, for the identical reason [K18](#k18-a-record-with-a-face-defaults-to-the-gallery-the-list-is-the-alternate-view)
gives: the engine's own `display: "gallery"`/`"list"` would be the obvious chokepoint to
derive a Gallery-default rule from, but `appsListRecipe` (`web/lib/screens.ts`) sets
`display: "list"` and is explicitly VESTIGIAL — the screen renders through neither branch —
so a census built against `recipe.display` would fail on the very screen this entry is
about. Recorded here for the next reader rather than checked, until a real registry of
host-composed screens exists to check against instead.

**Amendment, 16 Sep 2026 — one flat pill ground, the dot is the only thing that
changes.** The client's ruling, verbatim: *"show me the different colors for
the pills for the status, and make sure that there is a space between the
color dot and the name. Make sure that all the pills have a background,
because currently development does not. All of them should have the same
color background. What changes is the color of their dot."* Two defects, one
app-side and one kit-side, both traced rather than guessed.

*The gap.* Both call sites left `size` unset on `<Badge variant="status">`,
which defaults to `size="counter"` — the 20-tall COUNT chip, with no `gap-*`
of its own — never CH11's 26-tall status-pill geometry (`size="pill"`,
`--control-height-pill`, `gap-2` between the dot and the word). Fixed by
naming the size, not by a space character (R28/R66 both forbid a literal
glyph standing in for a token). `record-chrome.tsx`'s own `IDENTITY_ROW`
already forced this geometry for the record head's own chips by a different
route (`[&_[data-slot=badge]]:gap-2` etc.), which is why the detail screen's
three pills were never part of this complaint.

*The background.* `variant="status"`'s own fill, `--pill-fill`
(`shared/ui/foundations/tokens/tokens.css`), is `var(--card)` — CH11 draws
the status pill sitting on `--sheet`, "the OTHER paper tone from the panel it
sits on" (`badge.tsx`'s own header). Both places this chip renders — the
Gallery's `<Card variant="raised">` and the Kanban board's own card — are
THEMSELVES `bg-card`, so the pill's fill paints the exact colour of the card
underneath it, in both palettes: a background that equals its own container,
`card.tsx`'s own documented failure ("a `--card` box on the page draws
nothing at all") one layer further in. It was invisible on every stage, not
only "Development" — a coloured dot beside it still read as "a chip is here"
for the other five; `building`'s dot is close to the label's own ink, so
Development was the one stage with nothing left to read. Fixed the way
`record-chrome.tsx`'s `IDENTITY_ROW` already fixes the identical collision for
the record head — a local `bg-surface-panel`/`text-foreground` rebind at the
two call sites this screen owns (`STAGE_PILL_PROPS`, `apps-screen.tsx`) —
rather than inside `Card`/`Kanban`, which neither this entry nor this lane
touches.

*The kit bug underneath it — PROPOSED, NOT YET SHIPPED.* Ruling 26's dark
clause puts exactly one tone — `building`, the one this app's own vocabulary
uses for three of its eight stages (Development, Documentation, Iteration) —
on a mango fill with a charcoal label and dot in dark mode, the one stage
whose PILL changes colour at all. That directly contradicts this ruling's
second sentence ("all of them should have the same color background"), so
`badge.tsx`'s `status`+`building` compound variant needs to be retired: every
stage's pill would then share one fill and one label ink in both palettes,
and only `DOT_FILL[dot]` — the plain per-tone dot colour every other stage
already uses unmodified — decides what changes. **Not made this session**: a
second kit lane was tagging v1.2.90 (the assistant strip) at the same time,
and this lane's brief was to wait for that tag, pull, then tag v1.2.91 on top
of it. 25 minutes of polling `git ls-remote --tags origin` never saw v1.2.90
land, so the Badge/tokens edit was not made and the app is still on the kit
pin it started the session on. The app-side fix above (`STAGE_PILL_PROPS`)
already gives every stage pill the same visible background regardless of this
— it forces `bg-surface-panel`, which wins over whatever `badge.tsx` computes
internally — so the client's complaint is fixed on screen either way; what is
still open is retiring the dead-in-practice dark-mode special case at its
source so a future caller of `variant="status"` outside this screen does not
inherit it. Next session: check whether v1.2.90 has landed, pull, make this
edit, tag v1.2.91, sync, and update this paragraph.

---

### K24: Waves — Active/All tabs, T3's segmented timeline, day-chip calendar, and a real list

**The rule.** The Waves main screen carries two tabs, **Active** and **All**
(the client's ruling, 15 Sep 2026, on top of the earlier "sprints go inside
waves" ruling K21 already carries): *"For Waves main screen, we need a
timeline… two tabs: Active: I only want the timeline. All: I want a
timeline, calendar, and list. In Active, I also want the calendar, but the
main one stays the timeline."* Both tabs badge their own exact count (R16 —
`formatCount` over the already-loaded, bounded collection, never a second
round trip for a number already in hand) through the same
`renderFolderTabs`/`CountedAbove` arbitration every other tabbed collection
screen uses. Active offers Timeline (default) and Calendar; All offers
Timeline (default), Calendar and List. The toolbar's slot order is
untouched (R53: search → filters → sort → view → actions) — only the sort
slot's own presence changes: it is withdrawn on Timeline and Calendar and
shown only on List, R78's own law, amended the same day to add `"timeline"`
to `NO_SORT_VIEW_VALUES` (`web/components/deep-link/screen-bits.tsx`) —
*"the timeline is time-ordered too."* `web/components/work/wave-finder.tsx`
(a registered `TOOLBAR_CONTROL_OWNERS` hand-copy of `<ToolbarRow>`, since it
predates that row's own `period`/`view` slots) reads the same set directly.

**T3 — one bar per wave, cut into its own sprints.** *"I choose T3"*, over
three drawn variations (nested rows; the wave as a swimlane; the wave as one
bar segmented by its sprints) — T3 is the segmented-bar reading. Each dated
wave is one row on a week-gridded time axis; its bar is sliced into its own
sprints, IN DATE ORDER, each segment toned by `sprintState` (`upcoming` ·
`running` · `wrapped` — the same three-state derivation the Sprints tab
already reads, exported from `sprints-screen.tsx` rather than re-derived),
labelled with the sprint's own name, and a gap between two sprints (or
before the first / after the last) draws as the wave's own quiet base bar.
A wave with dates but no sprint row this window could find for it (the
defensive edge case, never the ordinary one — a wave's dates ARE derived
from its sprints) draws as one plain, unclickable base-toned bar across its
own range — *"a wave with no sprints is a plain bar."* Today is marked;
prev/next/today controls sit above the grid, `RecordCalendar`'s own shape;
clicking a segment opens `/waves/<id>/sprints/<sprintId>`; clicking the row's
own name opens the wave; on a phone the whole grid scrolls horizontally with
CSS scroll-snap (the artifact's own pick) rather than losing the grid.

**Why a bespoke host (`web/components/records/record-timeline.tsx`) and not
the kit's `Gantt` (CH27.26).** `Gantt` genuinely supports several
non-overlapping bars in one lane, which technically covers "one wave, several
sprint segments" — but three of its own laws are load-bearing and none of
them is this ruling's shape: SIX PERIODS IS A CEILING, NOT A HINT (this
screen wants the whole visible window in view, never stepped six at a
time); THE STEPPER IS THE ONLY WAY TO MOVE, and below 720 the grid is
REPLACED by one row per lane (this ruling asks for prev/next/today on every
width, and a phone that scrolls the grid itself with snap, never a
fallback that drops it); and FIVE FIXED TONES WITH NO NEUTRAL ONE (a gap
segment has no accent to wear, and giving `Gantt` a sixth tone is a kit
change outside this round's authorised scope — the Calendar's span
primitive below, not the Gantt). Reusing `Gantt` here would mean the
timeline is either honest about its own axis and silently breaks the kit's
stated law, or bent to fit a shape the client did not ask for — so this is a
second, bespoke, HOST-COMPOSED component instead, built only from the kit's
own primitives (`Button`, its icons, its colour tokens: `bg-chart-1`,
`bg-chart-2`, `bg-surface-inverse`, the hairline shadow tokens, never a
`border` property), the same category CLAUDE.md already names for
`roles-matrix.tsx`. R39 stays intact — nothing here imports a UI package the
kit does not already carry — and `waves-screen.tsx` is this component's only
caller, the same "one host" pattern the ONE CALENDAR law already keeps for
`record-calendar.tsx`.

**Calendar — multi-day spans since v1.2.90.** Waves and sprints draw as multi-day
spans through `RecordCalendar`, the app's one door into the kit's month
grid (the ONE CALENDAR law) — shipped start-day-only on 15 Sep; spans since v1.2.90, 16 Sep. A wave's own span and its sprints' spans share one colour (the same `accentClass` hash keyed off
the wave's id, for free), a sprint's span carries its wave's name as the
detail line, and clicking either opens the record. A wave or a sprint
that runs three weeks shows as three weeks on the grid through `record-calendar.tsx`'s `expandEntry`, which walks each day from `startsOn` to `endsOn` and caps both ends — the kit's own `CalendarEvent.span` renders the multi-day primitive (`spanId`/`position` on `calendar-view.tsx`), and `waves-screen.tsx` passes `endDay` for waves and sprints alongside `day` and `accent`.

**List — R80's shape, All tab only.** Wave (ref + name) · Account (`RecordMark`,
the same choice-sized mark the account picker already draws) · Sprints (the
exact count, plus up to five small state-toned dots for the sprints inside
it) · Start · End · State (the wave's own active/switched-off, `Badge`).
Through `RecordTable`, which by R80 draws exactly one shape now (flush, no
second banded card) — its own chrome stays off (`searchable`/`sortable`/
`showCount: false` in the `CollectionConfig` handed to it) because
`WaveFinder`'s own search and sort, shown only on this view, already answer
those questions once; a second copy would be the "different toolbar
variations" the client has twice ruled out.

**Law.** [R16](../RULES.md), [R53](../RULES.md), [R78](../RULES.md)
(`no-sort-in-calendar-views`, amended this same day — see its own entry,
[K20](#k20-calendar-views-carry-no-sort)), [R80](../RULES.md)
(`rows-are-a-list`). The T3 timeline's own shape and the tab split are recorded here for the next
reader rather than independently checked — the same "not a law" footing
[K18](#k18-a-record-with-a-face-defaults-to-the-gallery-the-list-is-the-alternate-view)/[K23](#k23-apps-gallery-and-board-by-stage-never-tiles-or-a-table)
stand on, until a registry of host-composed screens exists to hold a bespoke
component's own shape to something checked rather than read. The Calendar's
multi-day span capability is now in place as of v1.2.90, 16 Sep 2026.

**Amendment, 16 Sep 2026 — the app's face, a broken toolbar, a new facet, and
a status pill.** The client, over a screenshot of the shipped screen,
verbatim: *"Great work there. However, what I want in the left column is the
name of the app and the icon. Look at the third screenshot. The container
looks broken. Fix it. I want, in Waves, the filter by sprint type. On waves,
all list: make status a colored pill."* Four changes, each recorded where its
reasoning lives:

1. **The T3 timeline's left column is now the wave's APP**, not the wave —
   an app mark (`AppMark`, or `RecordMark` on the initials tile where no
   single app resolves) beside the app's name, `waves-screen.tsx#waveApp`.
   A `Wave` carries no `appId` of its own (only its sprints do, and they are
   not constrained to agree), so this is DERIVED: the one app every live
   sprint in the wave names, when there is exactly one. The wave's OWN name
   moved to a second, muted line under the app's — always, never onto the bar
   itself, which this brief chose over the letter's other option (a label on
   the bar before the segments) because a T3 segment is 24px tall and already
   carries its own sprint's name; see `TimelineRow.sublabel`'s own header
   (`record-timeline.tsx`) for the fuller account. A wave with no single
   resolvable app draws exactly what it drew before this amendment: its own
   name, on the initials tile.
2. **The broken container was `wave-finder.tsx`'s own track wrapping to a
   second line.** The row's comments already claimed "one row, always" (the
   2026-09-01 ruling); the CSS did not keep the promise — `flex-wrap`, no
   scrolling lane, no pinned action group — so the trailing controls (the
   view switch, the "+") dropped to a second line the moment the lane ran
   out of room, and the outer column's `rounded-pill` (a capsule computed off
   the box's own HEIGHT) stretched around the now-two-line box, reading as a
   corner clipping the wrapped controls. Fixed to the kit `ToolbarRow`'s own
   shape (`shared/ui/components/toolbar-row/toolbar-row.tsx`): `flex-nowrap`
   on the track, a `min-w-0 flex-1 overflow-x-auto` lane around
   search/filters/sort/period, and the actions group pinned outside it with
   `ms-auto shrink-0` — nothing wraps, at any width, so the pill's radius is
   always computed against one line. `web/test/wave-finder-toolbar-is-one-container.test.tsx`
   pins the shape.
3. **A Sprint type facet**, `wave-finder.tsx`'s `WaveQuery.sprintType`. A wave
   carries no `sprintType` column (a wave has no kind; only its sprints do),
   so this is answered as an `EXISTS` over the wave's own LIVE sprints —
   computed at the door (`workers/tenancy/src/lib/waves.ts#listWaves`/
   `countWaves`, both now taking an optional `sprintType`) and mirrored,
   for the sidebar collection, off the sprints already resident in the
   browser (`selectWaves`'s own third argument) rather than a second round
   trip for a bounded collection that does not need one — the same
   "everything that can match is already in front of us" reasoning this
   file's header already gives the other two facets. Options are the team's
   own "Sprint type" vocabulary (`useSprintTypes`), A→Z through the one
   render chokepoint every facet passes (R75).
4. **List's Status column is now a coloured pill**, `Badge variant="status"`
   — the kit's own law, one neutral fill for every state, the state living
   only in the dot. A live wave reads `waveState` (`waves-screen.tsx`), the
   same three-part axis the T3 timeline already draws its bar against —
   planned / running / done, off the wave's own `startsOn`/`endsOn` — dotted
   `review` / `building` / `shipped`, the identical three tones
   `sprint-detail.tsx` already draws a sprint's own status pill with. A
   switched-off wave draws `archived` directly, the tone every other
   deactivated record in the app wears, winning over the temporal read.

**Amendment 2, 16 Sep 2026 — a wave's app is STORED, not derived.** The client,
over the shipped amendment 1 above, read the DERIVED left column back to the
coordinator and corrected it: *"No, now you have the name of the wave. I want
the name of the app."* Amendment 1's `waveApp` answered "the one app every
live sprint in the wave agrees on, when there is exactly one" — recomputed on
every render, never settable, and wrong the moment a wave was sold before any
sprint was planned into it. Team migration **0099** replaces the guess with a
real column:

1. **`waves.app_id`**, nullable, `REFERENCES apps (id)`, plus `idx_waves_app`.
   Nullable is ordinary — a wave sold before anybody decided which system it
   covers is exactly as normal as one with no dates yet.
2. **Backfilled once, idempotently, conservatively.** A wave's `app_id` is
   filled from its own LIVE sprints only where they agree on EXACTLY one app —
   the same "agree on one, or draw nothing" reading amendment 1's `waveApp`
   gave in the browser, now computed once in SQL rather than on every render.
   A value already set (through the door) is never overwritten; a wave whose
   sprints disagree, or have none, is left `NULL` rather than guessed at.
3. **The door carries it end to end.** `Wave` (`shared/waves.ts`) gains
   `appId`/`appName`/`appLogoUrl`, joined in on every read
   (`workers/tenancy/src/lib/waves.ts`, `LEFT JOIN apps` beside the existing
   accounts join). `createWave` accepts `appId` (optional, validated against
   the SAME account the wave is sold to — `assertAppInAccount`, the identical
   pairing `wave-detail.tsx`'s own "Plan a sprint" picker already enforces on
   screen). `updateWave` takes it TRI-STATE, the same "absent key = leave it
   alone" contract `updateAccount`'s own `accountManagerUserId` already keeps:
   omit `appId` to leave the wave's app untouched, send `null`/empty to clear
   it, send an id to set it.
4. **The wave form gets an App picker** (`wave-form-dialog.tsx`) — a
   `RecordPicker` narrowed to the selected/fixed account's own apps, the
   app's own logo as the mark (`face: true`, the identical flag the story
   form's own App row uses), no "Not said" pill withheld — an app is a real
   optional field here, unlike App stage.
5. **The T3 timeline's left column reads `wave.appId` directly.** `waveApp`
   (`waves-screen.tsx`) is now a plain lookup against the loaded `apps` list
   for a live app's logo, falling back to the wave's own denormalised
   `appName`/`appLogoUrl` when the app is not in that list (deactivated, most
   likely) — never a scan of the team's sprints. Unset `appId` falls back to
   exactly what the row drew before amendment 1: the wave's own name, on the
   initials tile.
6. **The All list gets an App column**, the same `AppMark` + name pairing the
   Account column already draws, searchable off the resolved app's name.
7. **A Facet by app**, offered only where the team has apps to filter by —
   cheap, since `Wave.appId` is a real column: `selectWaves` narrows with a
   plain equality (`w.appId === query.appId`), no sprint scan, unlike the
   Sprint type facet beside it.
8. **MCP/agent parity (R19/R22).** `list_waves` gains `appId` as a third query
   filter; `create_wave` and `update_wave` both gain `appId` in their body
   schema and `buildBody`, `update_wave`'s through `sent()` so an empty string
   still clears it over the machine surface the same way it does through the
   form.

**Law.** [R19](../RULES.md), [R22](../RULES.md). The rest of this amendment is
recorded here for the next reader rather than independently checked, the same
footing amendment 1 and the entry above it stand on.

**AMENDED A SECOND TIME, 17 Sep 2026 — the End date is back.** The client's ruling,
verbatim: *"Please also add the end date."* `waveListColumns`
(`web/components/work/waves-screen.tsx`) draws six columns, her exact order — Wave ·
Status · Sprints · Start · End · Account — within R82's own six-column ceiling
([K32](#k32-a-table-row-holds-at-most-six-columns-the-seventh-goes-on-a-second-line-never-squeezed-onto-the-end)):
the App fact stays on the Account cell's own second line rather than claiming a column of
its own, the same eighth-turned-seventh-column shape R82 exists to catch before it ships
again.

**Law.** [R82](../RULES.md) (`table-column-budget`).
