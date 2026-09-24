# 5. Buttons and actions (part 7 of 8)

*Split from [documents/UI-RULEBOOK.md](../UI-RULEBOOK.md) — moved verbatim, cut rather than copied.*

### B43: stories are English only, carry no goal, derive their category, and the Build notes sheet uses the kit's own drop zone

**The rulings.** Aurora, 21 Sep 2026, four verbatim sentences over the story form and the
story page. On translation: *"stories are always in englihs - so remov ethe translate from
there."* On the goal flag: *"Remove the goal from the stories. I don't even know what that
is, but remove it."* On the category: *"The category 'Client Requested' or 'Enabler': don't
put it on the edit screen. You must detect it automatically. If it's related to a ticket,
it's 'Client Requested.' If not, not."* On the Build notes sheet's own image picker: *"On
build nodes, use the already existing component to upload images. Do not invent anything
new. Also, don't show that there's nothing attached."*

**No translate.** `TranslateAction`/`useHumanTranslation` (`translate-human-text.tsx`, the
ticket page's own seam) are gone from `story-detail.tsx` entirely — never unmounted, never
parked, simply not imported: a story's own words are English, full stop, unlike a ticket's.
Every field that used to read `translation.of(...)` (title, detail, acceptance criteria,
build notes) now renders what is actually stored. Translate stays exactly as it was on
tickets and everywhere else.

**No goal, deleted. AMENDED 21 Sep 2026.** First landed as a parked flag: the "contributes
to the phase's goal" checkbox pulled off the story form, the story rows and the story list,
while `Story.contributesToGoal`/`stories.contributes_to_goal` and the create/update doors
kept the field untouched underneath, each UI surface moved to a file of its own
(`work/goal-field.tsx`, `work/goal-row-toggle.tsx`, `work/goal-badge.tsx`) and named in
`PARKED` (`shared/rules/registry.ts`). Aurora, reading that shape back the same day,
verbatim: *"not parked, kill it."* The flag is deleted, not paused: the three component
files are gone, every `PARKED` entry for them is gone, `Story.contributesToGoal` is gone from
`shared/types.ts`, `create_story`/`update_story` no longer accept or return
`contributesToGoal` (`shared/workers/tool-catalog.ts`, `documents/MCP.md` §3), every read and
write of it is gone from `workers/content/src/lib/stories.ts`, and team migration 0114 drops
`stories.contributes_to_goal` from the column itself. The phase's own one-sentence goal
(`sprints.goal_summary`, "Phase goal") is a different fact, untouched by any of this: only
the per-story flag that claimed to serve it is gone.

**Category, derived.** The two-pill Category control is gone from the story form. The
content door now derives it instead of reading it: `deriveCategory(ticketId)`
(`workers/content/src/lib/stories.ts`) answers Client-requested when the resolved
`ticketId` is set and Enabler otherwise, on both `createStory` and `updateStory` —
replacing `refuseEnablerWithNoTicket`, the 20 Sep 2026 rule this inverts: that rule REFUSED
an Enabler story with no ticket; this one is never given a choice to refuse, because there
is no longer a category a caller can choose against the ticket. Re-pointing an existing
story's ticket on an edit re-derives the category the same way — link one and it reads
Client-requested, drop it (an edit that omits `ticketId`, cleared like every other field
this door replaces whole) and it reads Enabler again. Neither `create_story` nor
`update_story` accepts a `category` field on the wire any more (`documents/MCP.md` §3). The
story page shows the derived word as a plain, read-only fact — an uncoloured pill beside
"Category" in the Related tickets panel (R86: the one coloured chip is status) — never a
control.

**The Build notes sheet's own drop zone.** `story-build-notes-sheet.tsx` no longer draws
`StoryAttachmentsPanel` (`work/story-attachments.tsx`, over
`records/record-attachments.tsx`) — a hand-built list-and-upload widget with its own
"Nothing attached yet." empty line, exactly the two things the ruling refuses. It draws
`FileUpload` (`@shared/ui/components/file-upload/file-upload`) instead, the SAME kit drop
zone `reply-composer.tsx`'s Paperclip and `reply-edit-sheet.tsx`'s own Attachments field
already draw through, wired straight to `story_attachments` (the identical door
`story-form-dialog.tsx`'s own file field and the story page's inline preview both read).
Uploads happen the moment a file is picked, never deferred — the story already exists by
the time this sheet opens (R41). `work/story-attachments.tsx` is unmounted and PARKED
(`shared/rules/registry.ts`), not deleted: `records/record-attachments.tsx` it wraps stays
mounted elsewhere (the ticket's own attachments, `reply-composer.tsx`,
`work-logs-panel.tsx`), and the thin story-side wrapper is exactly the shape a future
standalone "Files and links" surface for a story would reach for again.

**VALIDATED 21 Sep 2026.** Aurora reviewed staging this round and confirmed stories are English only, carry no goal, derive their category, and the Build notes sheet uses the kit's own drop zone.

**Status: validated, 21 Sep 2026.** All four surfaces changed; `documents/MCP.md`
and the tool catalogue updated for the derived category and the parked goal field; content
tests covering category derivation on create, on an update that links a ticket, and on an
update that drops one; web tests covering the parked goal surfaces, the absent translate
control, the derived category fact, and the Build notes sheet's own drop zone.

**Law.** None new. Governed by R86 (the one coloured chip is status, for the Category
pill), R41 (a picked file is either sent or refused, never dropped, for the Build notes
sheet's own upload), R28/R33 (the translation catalogue, for every string this round moved
or removed).

**AMENDED, 21 Sep 2026 (the drop zone, proved rather than only claimed).** Aurora, over a
screenshot of the kit's own dashed drop zone (the rounded box, the upload glyph, "Drop
files here", the pill "Choose a file"), reading the shipped round back: *"that's not what
i neant. imeant a compmntet liek inscreenshot."* The mount named above was already the
kit's `FileUpload` (`@shared/ui/components/file-upload/file-upload`), unconditionally
rendered under the Notes editor, with no wrapping `files.length > 0` gate the way
`reply-composer.tsx` takes it (that composer only ever mounts `<FileUpload>` once a tile
already exists, reached instead through its own Paperclip button, so its empty state never
draws the dashed box at all), so the component was already the one in her screenshot, and
the gap was proof, not code: `story-b43-parked.test.tsx`'s own case only greps the source
for `<FileUpload`, and nothing had rendered the sheet and read its own words back. A new
case, `web/test/story-detail.test.tsx` ("draws the kit's own dashed drop zone under the
editor, never an 'Add a file' control"), opens the sheet and asserts "Drop files here" and
the "Choose a file" button are actually on the page, and that neither of
`record-attachments.tsx`'s own two words, "Add a file", "Add a link", the hand-built
widget this ruling already retired, nor a "nothing attached" sentence is.

---

### B44: the Effort card carries its own metrics, and a count sits beside its title like Stakeholders'

**The ruling.** Aurora, verbatim, 21 Sep 2026: *"Include the metrics inside the effort
card. On the effort card, remove the value entries and put the number next to the effort
title, just as you do, for example, for stakeholders."*

**What changed.** The story page's separate "Metrics" panel is gone. Its three lines —
Cycle time, Effort, Flow efficiency — are the Effort card's own body now, and
`WorkLogsPanel`'s own list of rows (the "value entries" the ruling names) is gone from this
page too: the card never mounts `WorkLogsPanel` at all any more. The Effort card's own
title carries the total logged hours as its count, through the SAME title-with-count
register `help-stakeholders.tsx`'s own "Stakeholders 4" already renders through
(`TicketSidePanel title={t("Effort")} count={hoursLabel(...)}`,
`ticket-detail-body.tsx`) — the identical `<h3>{title}{count}</h3>` shape, not a second one
invented for this card. Related tickets and Related stories already carried their own
counts the same way; nothing changed there.

**Logging time still works.** The "Log time" door survives, now a plain `TimeFormDialog`
(`time-form-dialog.tsx`) mounted directly on the story page and opened from the Effort
card's own title-row action, writing through the identical `contentApi.logTime` call
`WorkLogsPanel`'s own `log()` made. A write refreshes the page's existing `refresh()`
(which already re-reads `story:metrics:<id>`), so the card's count and its three lines
catch up the same way every other write on this page does.

**Why not `EmptyGatedPanel`.** The Effort card is no longer a COLLECTION that can hold
zero rows — it always shows three facts, with a textual fallback ("Not started" / "0h" /
"No time log") standing in for none logged rather than an empty-collection state — so
`EmptyGatedPanel` (R88's own shell, built for a header that disappears while a list is
empty) is the wrong register now. The card is the same plain `TicketSidePanel` every other
fact panel on this page already uses, and its own "Log time" `<AddButton>` carries a
reasoned, permanent `empty={false}` (`EMPTY_TOOLBAR_EXEMPT`/`EMPTY_STATE_SINGLE_DOOR_EXEMPT`,
`shared/rules/registry.ts`) — the same reasoning `roles-matrix.tsx`'s own fixed-catalogue
entry already argues: there is no collection here to be empty.

**VALIDATED 21 Sep 2026.** Aurora reviewed staging this round and confirmed effort metric tiles on raised kit cards, with the count beside the title like Stakeholders.

**Status: validated, 21 Sep 2026.** The Metrics panel removed, its three lines
merged into the Effort card, the count wired through the Stakeholders register, the Log
time door rebuilt on `TimeFormDialog` directly, `web/test/story-detail.test.tsx` updated
for the new panel order and the merged card.

**Law.** None new. Governed by R88 (empty-state single door, and the reasoned exemption
this card now carries), R50 (the empty-toolbar census, same exemption), R16 (a collection's
count through one seam — the count here is a computed hours figure through the same
register, not a second one).

**Amended, 21 Sep 2026 (the same day, over the deployed card).** Aurora, verbatim: *"ok,
but i still want to see the individual records of time og! also show avatar of perosn.
bring back the old cards with the metrics inside effort"* and, the same message: *"in
effort card inside stories or tickets, rmeove the + button (we have the start on top!)."*

**What changed, this round.** The rows are back, and they carry a face. A new shared
`EffortCard` (`web/components/work/effort-card.tsx`) replaces both the story page's own
inline card AND the ticket page's `EmptyGatedPanel`-wrapped `WorkLogsPanel`, so the two
draw the identical shape rather than two hand-kept copies of it: the title with the total
hours as its count, the three metric lines, then the individual time log rows — newest
first, each with a face (`RecordMark`/`memberFace`, R35/R90), the name, the date, the
duration and the note — with a load-more door once the list is long (R14, `<LoadMore>`).
The ticket page gets the SAME three metric lines now too, off a new door,
`getTicketMetrics` (`POST /api/content/help/metrics`, `workers/content/src/lib/help.ts`),
computed the identical way `getStoryMetrics` already is — cycle time from the first work
log to the record's own "done" moment (a story's latest `story_status_events` row, a
ticket's own `resolved_at` column directly), effort summed, flow efficiency from the two —
returning `TicketMetrics` (`shared/types.ts`, a plain alias of `StoryMetrics`, since the
two shapes are identical and a real alias is what keeps them from drifting).

**The "+" is gone, everywhere on this card.** Her second sentence retires the "Log time"
door this same entry rebuilt a few paragraphs up: there is no add control on the Effort
card any more, on either page, empty or not. The head's own Start/Stop timer button
(`RecordTimerButton`) is the one way a new row is written now; correcting a row already
on the record stays (the pencil), because correcting one is not adding one.

**R88 applies again, for real.** With the rows back, the card is a genuine collection once
more — the reasoning this entry's own earlier paragraph gave for standing `EmptyGatedPanel`
down ("there is no collection here to be empty") no longer holds, so `EffortCard` IS
`EmptyGatedPanel` again: at zero logged rows the whole header (title, count) drops, and
the body reads one sentence, no door — "No time logged yet." (never "Add the first": there
is nothing left on this card to add from). The `EMPTY_TOOLBAR_EXEMPT`/
`EMPTY_STATE_SINGLE_DOOR_EXEMPT` entries this same round's earlier shape needed for
story-detail.tsx are gone from `shared/rules/registry.ts` along with the button they
excused.

**Status: amended and shipped, 21 Sep 2026.** `EffortCard` extracted and drawn by both
pages; `getTicketMetrics`/`POST /api/content/help/metrics` added, with its own door-level
suite (`workers/content/test/ticket-metrics.test.ts`); `web/test/story-detail.test.tsx` and
`web/test/ticket-detail-no-tabs.test.tsx` updated for the rows, the faces, the metrics, the
count and the missing add button.

**Law.** Governed by R88 (empty-state single door — the card's own shell again, not an
exemption this time), R50 (empty-toolbar, the reasoned entries retired), R14 (paged rows,
`<LoadMore>`), R35/R90 (a record's own face, on every row), R16 (the one count register).

**Amended a third time, 21 Sep 2026 (reviewing the deployed card again).** Aurora, verbatim:
*"remove the pencil. when clicking one detail in slide in, and there have the option to
edit. make the metrics cards inside the container, like in the metrics artifact you did for
me! next to effort show the count of record, not the total hours (that has a metric on
itself)."* And, the same round, from the task review: *"if no time logged yet, hide that
component. when time logged, as i said before, i want to see the avatar in each row."*

**What changed, this round.** Four things, on `EffortCard` alone:

1. **The title's own count is a record count now, not an hour total** — "6", never "6.5h".
   The hours already have a tile of their own (below), so the same figure said twice was
   exactly what her parenthetical objects to. Read off the SAME `workLogs` list door this
   card already calls for its rows — the door's own exact `total` (R14's `pagedJson`, a real
   `COUNT(*)`) — primed into `workLogsTotalKey` (`work-logs-panel.tsx`), the identical
   sidecar a Time tab badge on this record would already read. `recordTimeSummaryKey`'s own
   separate aggregate read is gone from this file: nothing here needs a second door for a
   fact the first one already carried.
2. **The three metric lines are stat tiles now**, drawn through the kit's own `<StatGrid>`
   (`shared/ui/components/stat-grid/stat-grid.tsx`) rather than the hand-rolled three-column
   `font-mono` grid this file drew by hand before — the same primitive
   `work-logs-panel.tsx`'s own Numbers band and `pulse.tsx`'s dashboard already call, read
   off the Delivery Metrics artifact's own tile wording. The middle tile reads "Effort
   hours", not "Effort": the title's own count already answers "Effort" (point 1), so the
   tile answers a different question beside it instead of repeating the word.
   `COUNT_REGISTER_EXEMPT`'s own entry for this file (`shared/rules/registry.ts`) moves from
   "pending her word" to settled — she has now explicitly asked for these three as tiles,
   which R97's own ruling names as the one way out ("unless explicitly said").
3. **No pencil.** A row is a real `<button>` (keyboard reachable): clicking one opens the
   SAME slide-in sheet a pencil used to open — `TimeFormDialog`, already built on
   `FormShellDialog`'s own `Sheet` (R59), the row's own fields, Save/Cancel — through the
   identical `correct()` call the pencil used to make. A row still needs `work:update`
   (`canEdit`) plus a settled, non-discarded entry to be a button at all; correcting a
   still-running or already-discarded row was never offered before and is not being offered
   now, only the door into a correction moved from a small icon onto the row itself.
4. **Zero records draws nothing.** Not `EmptyGatedPanel`'s own header-only drop — the WHOLE
   card, no sentence, no card, nothing at all. The head's own Start/Stop timer button is the
   one way in, and a card that says "No time logged yet." beside a Start button that already
   says the same thing is the component her words ask to hide.

The face on every row (R35/R90) and the load-more door (R14) are unchanged from the previous
amendment; her second sentence this round ("when time logged... i want to see the avatar in
each row") restates what was already shipped rather than asking for something new.

**Status: amended and shipped, 21 Sep 2026.** `EffortCard` updated alone (its test files, and
`TimeFormDialog` reused unmodified); `web/test/story-detail.test.tsx` and
`web/test/ticket-detail-no-tabs.test.tsx` updated for the record count, the stat tiles, the
missing pencil, and the stricter zero-records case.

**Law.** Governed by R88 (amended again by this round, stricter than the shell's own
contract — the whole card, not only its header, drops at zero rows), R97 (a count never gets
its own card — `COUNT_REGISTER_EXEMPT` settled for this file), R35/R90 (a face on every row,
unchanged), R59 (a form slides in, never centres — the row opens the existing sheet rather
than a new modal), R16 (the one count register, now the title's own record count rather than
an hour total).

**Amended a fourth time, 21 Sep 2026 (same day, reviewing the deployed tiles).** Aurora,
verbatim: *"good. add kind of card background behind cards, this is a metric, like in kit."*

**What changed, this round.** The three stat tiles (Cycle time, Effort hours, Flow
efficiency) drew no visible card fill. `StatGrid`'s own `tone` prop only reaches `Card`
variant `default` ("quiet", `bg-surface-panel`), `brand` or `inverse`, never `raised`, and
these tiles sit inside `EmptyGatedPanel`'s own `<Card variant="default">`, so a `default`
tile nested inside a `default` panel painted the identical soft-paper tone over itself
(measured contrast 1.000, the exact pairing `card.tsx`'s own header warns against: "off-beige
over soft paper … only reads as raised when it sits inside a `--surface-panel` band"). Since
`StatGrid` has no prop for the raised tone, each of the three tiles is now its own
`<StatGrid items={[…]} surface="bare">` (the label/value register only, one item, no card of
its own) wrapped by hand in the kit's own `<Card variant="raised">`, the kit's stat markup
inside the kit's card, never a hand-rolled fill, border or radius. The three tiles are
written out one by one rather than `.map()`-ed over an array, because a kit `<Card>` carrying
React's own `key=` reads, to `web/test/rules.test.ts`'s R65 census, as a per-row record card
that owes a chip a `<CardTitle>` to sit above; these three are fixed metrics, not rows, so
naming each by hand keeps them off that census honestly instead of fighting it.

**Status: amended and shipped, 21 Sep 2026.** `EffortCard` updated alone;
`web/test/story-detail.test.tsx` and `web/test/ticket-detail-no-tabs.test.tsx` each gained a
case proving a tile's own figure sits inside a `[data-slot="card"]` ancestor carrying
`data-variant="raised"`.

**Law.** Governed by kit-conformance (no raw borders, no hand-rolled background outside a
kit token or variant), R97 (a count never gets its own card: unaffected, the tiles are
measurements, not counts, and `COUNT_REGISTER_EXEMPT`'s entry for this file already covers
them), R31 (two radii: the kit's own `raised` variant carries `--radius`, nothing new
introduced), R65 (chip above title: the three tiles are named by hand, never keyed, so the
record-card census does not reach them).

---

### B45: backlog tabs reordered, Everyone's renamed to All

**The ruling.** Aurora, verbatim, 21 Sep 2026: *"Reorganize backlog tabs: Now, Planned,
Review, Completed, Backlog, Everyone's. Rename everyone to All."*

**What changed.** `STORY_TABS`/`EVERYONE_TAB` (`web/components/work/stories-screen.tsx`)
draw the same six tabs K27 named, in the order she asked for — **Now · Planned · Review ·
Completed · Backlog · All** — and the sixth tab's own word changed from Everyone's to All.
Nothing else moved: the gate (`all_stories:read`), the predicates, and every tab's own
views and facets stay exactly as K27 and the rulings after it left them.

**Law.** None new. Governed by R53 (the toolbar's slot set is the row's, and its sort slot
is a default) — the tab strip is still `STORY_TABS`/`EVERYONE_TAB` as data, so the strip,
the fetch key and the badge cannot fall out of step.

---

### B46: phase days are working days, the prefill, and the Timeline's expected spans

**The ruling.** Aurora, verbatim, 21 Sep 2026: *"Yes, ship. mind you, all of this is Monday
to Friday, so when I say 5, it's actually a full week, but I, of course, don't count the
weekends. Make sure we can adjust this on the settings in Waves. * the prefill * Audit 5 *
Plan 5 * Build 15 * Pilot 5 * Revision 10 * Deploy 3 * Hypercare 7."*

**What changed.** B32's own placeholder defaults (Audit 5, Plan 5, Build 20, Pilot 10,
Revision 10, Deploy 3, Hypercare 10) are replaced by the seven numbers she named here (Audit
5, Plan 5, Build 15, Pilot 5, Revision 10, Deploy 3, Hypercare 7,
`PHASE_DAY_DEFAULTS`, `shared/waves.ts`), and every one of them, on every wave's own
Settings panel too, is now a WORKING day rather than a calendar one. One shared helper,
`shared/working-days.ts` (`addWorkingDays`, `workingDaysBetween`, `workingDaySpan`,
`isWorkingDay`), Monday through Friday, a weekend start rolling forward to the next
Monday before it counts, is the one arithmetic every day count in this app now reads
through. `wave-phase-days-panel.tsx`'s own unit label reads "working days" instead of
"days," with one line under the seven rows, through `t()`, saying "Monday to Friday,
weekends are not counted."

**The prefill.** `sprint-form-dialog.tsx`'s phase form (`prefillEndDate`) fills the end
date in, still editable, the moment a type is chosen and a start date is in hand, or a
start is picked with a type already chosen: the start plus that wave's own day count for
the type (its `phaseDays` row, off the wave detail door the "Plan a phase" dialog already
holds), falling back to the placeholder default where the wave carries no row of its own.
It never overwrites an end date a person has typed by hand, tracked from the moment their
own pick lands on the end field, not from this effect's own write.

**The Timeline.** `waves-screen.tsx#buildWaveTimelineRows` draws an undated, active
phase's own expected span end to end from the previous phase's end (the wave's own
recorded end once a dated phase exists), or the wave's own start, or today, using that
phase type's day count, toned "expected" (`record-timeline.tsx`), a lighter fill than a
dated phase's real state, and titled with the word "Expected." A wave carrying only
undated phases now reaches the axis at all, where before it was left off entirely. The
wave's own forecast total, `waveExpectedWorkingDays`, sums every active phase's own
working-day length (a dated phase read back as its real span, an undated one off its own
day count) and shows on the wave's own head, a new "Expected length" row on its Overview
tab.

**The burndown's ideal line.** `storyBurndown`'s (`workers/content/src/lib/stories.ts`)
ideal line now falls only on working days, flat across a Saturday or a Sunday inside the
phase, off the same `isWorkingDay` the rest of this ruling reads through.

**VALIDATED 21 Sep 2026.** Aurora reviewed staging this round and confirmed phase days are working days (Monday to Friday), the prefill with the team default phase days, and the Timeline's expected spans, including the Waves main page module settings gear.

**Status: validated, 21 Sep 2026.** Defaults changed, `shared/working-days.ts`
added with its own unit tests, the prefill wired and tested, the Timeline's expected spans
and the wave head's forecast total built and tested, the Settings panel's copy changed and
its test updated, the burndown's ideal line fixed and tested, strings seeded (de/es/ca).

**Law.** None new. Governed by R33 (every extracted position asks for its translation) for
the panel's new unit label and explainer line, and R28 (the translation catalogue) for
every new sentence this ruling adds.

**AMENDED 21 Sep 2026: settings needed a door of its own.** Aurora, verbatim, on the
wave's own phase days: *"missing the settings button in waves to adjust that!!!"* The
Settings panel sat inline on the Overview tab, under "Expected length," and she could not
find it there. It now opens from a gear button in the wave head's own actions row, beside
the "..." overflow trigger, the same fold `shared/web/head-actions.tsx` already gives
`task-detail.tsx` and `help-detail.tsx`, into a slide-in sheet titled "Settings" holding
the same seven rows, the same Monday-to-Friday line, and the same Save and Cancel this
entry already describes. `WavePhaseDaysPanel` (`wave-phase-days-panel.tsx`) is unchanged in
substance; it draws no Card and no "Settings" heading of its own any more, since the sheet
now says that once. The Overview tab keeps "Expected length" and draws the panel nowhere
else. `web/test/wave-phase-days-panel.test.tsx` covers the panel and the new
`WavePhaseDaysSheet`; `web/test/wave-detail.test.tsx` covers the gear opening it.

**AMENDED 21 Sep 2026: the MODULE's own gear was still missing.** Aurora, verbatim: *"i
still dont see the gear button on main page waves."* The gear the amendment above built
opens a single WAVE's own phase days; she meant the Waves MODULE's own main (sidebar)
screen (`waves-screen.tsx`), which — unlike every other module with something to set —
carried no `<ModuleSettingsGear>` at all, R61's own two-door law standing unmet on this one
module since the day the gear pattern shipped. Two things landed together, because R61
holds them to one derivation: **(i)** `waves-screen.tsx`'s own `<CollectionHeading
sectionKey="waves">` gains `action={<ModuleSettingsGear teamId={teamId} segment="waves"
/>}`, the door out, last (and only) control in the action slot. **(ii)** `MODULE_SETTINGS`
(`module-settings-screen.tsx`) gains a `"waves"` entry, one section, a new FOURTH `kind`
(`"phaseDays"`, beside `vocabulary`/`automations`/`meetingTypes`) — a team-WIDE default,
never a `selectable_data` group and never a switch — its own "Phase days" tab, drawn
through `TeamPhaseDayDefaultsPanel` (`wave-phase-days-panel.tsx`), the identical seven-row
`WavePhaseDaysPanel` body the per-wave sheet already draws, now standing on its own `Card`
(R67 — a titled section stands on paper) rather than the sheet's own surface. **A new
wave's per-wave days now start from the team's own default, not the code constant
directly** — `PHASE_DAY_DEFAULTS` (`shared/waves.ts`) is the fallback OF the fallback,
read only where the team has never set one either. Stored in the existing `automations`
table (`workers/tenancy/src/lib/automations-config.ts`), module `"waves"`, reserved key
`"phaseDayDefaults"` — the same shape `setAutomationOverride`'s own `overrides` key
already takes in that column, so no migration was needed. Two new tenancy doors, `GET`/
`POST /api/tenancy/waves/phase-day-defaults` (`work:read`/`work:update`, refusing a portal
caller like every other wave door), and their MCP counterparts,
`get_wave_phase_day_defaults`/`update_wave_phase_day_defaults`. The per-wave Settings
sheet is unchanged — its own row still wins over the team default the moment somebody
sets one. Tested: `workers/tenancy/test/waves.test.ts` (the team default itself, and that a
new wave reads it before the code's placeholder), `web/test/wave-phase-days-panel.test.tsx`
(`TeamPhaseDayDefaultsPanel`), `web/test/module-settings-waves-phase-days.test.tsx` (the
page renders the seven rows and saves), `web/test/waves-screen-settings-gear.test.tsx` (the
module screen's own gear); strings seeded (de/es/ca).

---
