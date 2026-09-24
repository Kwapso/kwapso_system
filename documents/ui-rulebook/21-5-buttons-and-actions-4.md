# 5. Buttons and actions (part 4 of 8)

*Split from [documents/UI-RULEBOOK.md](../UI-RULEBOOK.md) — moved verbatim, cut rather than copied.*

### B28: the Phase rename round, the P0000 id, a Sprint Goal field, and the wave lifecycle order (four rulings, one round)

**The rule.** Aurora's 20 Sep 2026 batch, four rulings read together as one vocabulary move
(`shared/sprint-types.ts`'s own header keeps the identical reading). Verbatim, item by item:

1. *"Rename 'sprint' to 'phase.' Also change the id to P0000."* Every user-facing word moves:
   the nav section, the record's own name, every screen that said "Sprint"/"Sprints" now says
   "Phase"/"Phases" (`shared/i18n-strings.json`, `shared/i18n-seed.ts`), and the record's
   reference prefix moves from S0000 to P0000 (team migration 0107, `shared/workers/refs.ts`).
   The glossary's `sprint` key stays, nothing reads the object key as a word, only its `term`
   changes, to "Phase" (`shared/glossary.ts`). Routes, the permission module and the underlying
   `sprints` table are untouched: none of them is a word a person reads.
2. *"Add a 'Sprint Goal' field to each sprint/cycle, a single sentence describing the main
   outcome the cycle is organized around. A Sprint Goal is the 'why' behind a cycle; every
   story in that cycle should support it, and anything that doesn't probably shouldn't be
   included. Display the goal at the top of the sprint board and let users flag which stories
   contribute to it."* (rendered here without the em dash her own message carried, since every
   new row this book adds carries none, R95.) A Phase Goal field, one sentence, shown at the top
   of the phase's board, and a per-story flag for whether it contributes to that goal
   ("Contributes to the phase's goal").
3. *"Rename the sprint type 'Refinement' to 'Revision.'"* and *"Rename the phase 'Validation'
   to 'Pilot.'"* Two of the seven Phase type words move (`shared/sprint-types.ts`'s
   `PHASE_TYPES`).
4. *"Update the Wave lifecycle stages and set the full order as: Audit → Plan → Build → Pilot →
   Revision → Deploy → Hypercare. Audit: assess the current state and gather requirements
   before work is scoped. Plan: scope, prioritize, and schedule the stories for the wave.
   Build: implement the stories. Pilot: the period where the customer uses the app and
   confirms it meets their needs and signs off, before full release. Revision: implement
   changes and adjustments requested by the customer after they have used the release. Deploy:
   release the accepted work to production — includes the release checklist, smoke tests,
   rollout (phased/canary if needed), release notes, and a rollback plan. Hypercare: a short,
   intensive support window immediately after deploy where the team closely monitors the
   release, fixes urgent issues fast, and supports users during adoption."* Her word "customer"
   and "users" are rendered "account"/"the account" wherever they name the party the work is
   for or the people using the release, R34's own glossary-in-copy law reading this help text
   same as any other user-facing sentence. This reorders and narrows the same Phase type
   vocabulary, read from the wave's own side: "Not started" and "Enhancement" drop out of the
   ordered lifecycle (a phase that has not begun yet is simply absent from a wave's board),
   "Deploy" and "Hypercare" are new. The seven definitions are stored as this vocabulary's own
   help text (`shared/sprint-types.ts`'s `PHASE_TYPES[].description`), shown wherever a phase
   type pill's tooltip draws.

**DECIDE, the wave's own stages ARE the Phase type vocabulary; there is no separate "wave
stage" column.** A wave's screen shows each phase inside it through this exact seven (now
narrowed to five ordered plus two retired) words, `shared/waves.ts`'s `WaveSprint.sprintType`:
reading the ruling's item 4 as the SAME vocabulary from the wave's own side rather than as a
second, independent schema column nothing anywhere else defines.

**DECIDE, proposed colours, not yet a ruling: Deploy black, Hypercare grey.** The vocabulary
stays icon-only at every existing pill (`shared/sprint-types.ts`'s own original 16 Sep 2026
header: "they will not have colors, but icons," the client's own words) until Aurora rules on
colour for it directly. Read strictly against her separate 20 Sep 2026 colour statement over
the OLD five words ("audit orange, plan+build black, validation purple, refinements blue"),
this file's own header proposes the two new words she had not yet seen: Deploy takes the same
black (`building`) tone Plan and Build already share, an active, in-progress release rather
than the green "shipped/done" tone that would misread it as finished; Hypercare takes a
deliberately neutral, winding-down grey (`archived`). NOT WIRED IN: R86 and this vocabulary's
own two live call sites (`sprints-screen.tsx`'s status-only chip, `sprint-detail.tsx`'s
uncoloured type pill) both stand on the icons-never-colour ruling today, so the proposed
mapping was never turned into a `PHASE_TYPE_DOT_TONE` export with no reader — a dead export is
worse than no table, and re-deciding the mapping later costs nothing this draft wouldn't also
cost now.

**DECIDED 20 Sep 2026 (Round 30): icons, no colours.** Aurora's ruling, verbatim: *"i am
thinking well do icons instead of colors. colors bekongin status & stages."* The Deploy-black,
Hypercare-grey proposal above is declined: the Phase type vocabulary stays icon-only, as it
already stood; colour belongs to status and to stage alone (R86). `PHASE_TYPE_DOT_TONE` is not
built.

**VALIDATED 20 Sep 2026 (Round 30).** Aurora reviewed staging this round and confirmed live:
the Sprint-to-Phase rename with the P0000 reference id (ruling 1), the seven Phase types
shown with her own definitions wherever the type is picked (ruling 4), and the Phase Goal
field with the story's "contributes to the goal" flag (ruling 2).

**Status: ruled, in build, 20 Sep 2026. The colour DECIDE above is decided, 20 Sep 2026
(Round 30): icons, no colours. Renamed round, Phase types and the Phase Goal field
validated, 20 Sep 2026 (Round 30).**

**Law.** None registered.

### B29: the Store button is gone, the triage-stage head offers the queue's own decision, and the Triaged rung shows a plain date when no span was recorded

**The rule.** Three of Aurora's rulings, 20 Sep 2026, verbatim: *"on tickets triage list view
rmeove the store button"*; *"when ticket is in status triage, also in main screen the visible
buttons shoudl change: same as in queue"*; and *"pls the vokumne at triage makes me crazy. if
a ticket is closed already (al except 15) of course it went through triage (back in the day,
we dont have the date)."*

**The shape.** The Store button an Extra used to wear filed the ticket and did nothing else,
which "Accept" already says honestly, so it is deleted rather than kept as a second word for
the identical action; an Extra now takes the same Accept path every other triage decision
takes (`triageAct`, `web/components/tickets/tickets-collection.tsx`). A ticket's own detail
head, while its status is `new` (the pre-triage state the Triage queue itself holds), now
offers the identical decision a row in that queue offers for its type, Accept/Assign/Plan,
built off the same `triageAct` function and the same `staffedOn` narrowing the queue's own
`peopleFor` applies, so the two surfaces cannot say different things about one ticket
(`inTriageStage`, `web/components/tickets/help-detail.tsx`). And the Triaged rung on a ticket's
own stage rail, when its CURRENT status is `resolved` and no `triaged` span was ever recorded
(stage recording began with team migration 0066, so an older or single-step ticket has none),
now reads the ticket's plain creation date instead of a blank second line that read as "never
triaged" on a ticket that plainly was, since nothing reaches `resolved` without passing
through it (`triagedRungMoment`, `web/components/tickets/ticket-stages.tsx`). Scoped to exactly
the one rung and the one status she named: an open ticket missing an earlier span is a
different, unasked question, and a reopened ticket is too.

**Amended by B31, 20 Sep 2026.** The third quote above ("if a ticket is closed already ... of
course it went through triage") named the same volume complaint Aurora returned to, sharper,
the same day: *"canot be, i still have 428 to trigae but only 15 open?"* Nothing in this row's
own shape actually changed what the Triage tab's badge or the queue's own total COUNTED: only
the Store button, the stage head and the Triaged rung moved. The undercount's real source is
fixed under B31, not here.

**Status: ruled, in build, 20 Sep 2026. The triage-volume complaint quoted above is amended by
B31 the same day.**

**VALIDATED 20 Sep 2026 (Round 30).** Aurora reviewed staging this round and confirmed live:
the Store button is gone, and a ticket's own head, at the triage stage, offers the same
decision the queue offers.

**Status: validated, 20 Sep 2026 (Round 30).**

**Law.** None registered.

### B30: two kit fixes read together, the assistant strip and the chat message menu (v1.2.138/v1.2.139)

**The rule.** Three of Aurora's rulings, 20 Sep 2026, verbatim: *"loos at screenshot. i see the
bottom of th eincactive tabs for the assistant but they shoudl be behind the shape!"*; *"make
the open assistant mango button same size as the one on the sidebar to compress/oen the
sidebar"*; and, on a separate chat-edit-pencil page, *"for chat edit pencil: i like from p1
that its besides and appears when hover, but make it like p4 wth the 3 options menu (edit,
copy/delete)."* All three ship in `shared/ui/`, the kit's own CHANGELOG carries the full
account (`shared/ui/CHANGELOG.md`, v1.2.138/v1.2.139); this row is the pointer, not a second
copy of it.

**v1.2.138, two rulings.** The assistant strip's inactive/"+"/History tabs were painting their
lower ~17px, the folder-tab overlap band, ON TOP of the panel card instead of behind it: an
`isolation: isolate` stacking context on the strip (v1.2.126, still load-bearing for a rest
tab's own click target) always outranked a plain, unpositioned panel, regardless of DOM order.
Fixed by giving the panel the same `relative z-[2]` its main-content counterpart already reads,
nothing in the strip itself touched. Separately, the shut assistant opener (30.47×30.47px, two
18 Sep rulings had fit it to its own band) is unified on the rail's own handle size,
`--control-height-button`, 40×40px, one constant for both controls, knowingly reopening the
band overlap the 18 Sep fit had closed, because a later, more specific ruling on the same
control supersedes the earlier one.

**v1.2.139, the message menu.** `TicketThread` gains a per-message actions menu, drawn only
when a caller passes `actions`: a small round secondary icon button at the bubble's own outer
corner (P1's placement, hidden until hover or focus, always visible on a coarse pointer), whose
trigger opens Edit/Copy/Delete in that order (P4's contents). Edit swaps the bubble for an
inline field seeded from its own text, Copy always fires (a told-you, not a gated action),
Delete is gated and gets no confirmation of its own, that is the caller's job.

**v1.2.143, the face size.** Aurora, on the same message-actions menu: "make the avatar as big
as this button" (the trigger, `size="icon"`, `--control-height-button`, 40px). `TicketThread`
gained `faceSize?: "sm" | "md"`, defaulting to `"sm"` (`Avatar`'s own 24px, `--avatar-sm`), with
`"md"` reading `Avatar size="control"` (40px, `--avatar-control`) instead; `help-detail.tsx`
wired `faceSize="md"` for the chat thread.

**AMENDED 21 Sep 2026, the face size, again.** Aurora, verbatim, on the same 40px chat face:
"idk, still not happy about the size. make them the same size as 'on the loop'." "On the loop"
is `help-stakeholders.tsx`'s own read-only row of stakeholder chips, whose face
(`PersonCard size="choice"` → `RecordMark size="choice"`) draws at 24px, `--avatar-sm`. The kit
already had a `faceSize` value that reads exactly that box, `TicketThread`'s own default
`"sm"`, so no kit change was needed: `help-detail.tsx`'s call moved from `faceSize="md"` (40px)
to `faceSize="sm"` (24px), the same `--avatar-sm` box the "On the loop" chip's own mark draws.

**Status: ruled, in build, 20 Sep 2026.**

**VALIDATED 20 Sep 2026 (Round 30).** Aurora reviewed staging this round and confirmed live:
the assistant strip's inactive tabs sit behind the panel, and the shut opener is 40×40px,
the same size as the rail handle.

**Status: validated, 20 Sep 2026 (Round 30); the chat face size amended 21 Sep 2026 (40px to
24px, matching "On the loop"), via `help-detail.tsx`'s `faceSize` prop only, no kit change.**

**Law.** None registered.

### B31: the triage volume figure excludes resolved and closed tickets everywhere it is counted, and the triage list view draws no per-row buttons

**The rule.** Two of Aurora's rulings, 20 Sep 2026, verbatim. Reviewing staging: *"canot be, i
still have 428 to trigae but only 15 open?"* The number of tickets waiting for triage cannot
exceed the number of open tickets. A resolved or closed ticket never needs triage, whatever its
triage fields say. And, on the same screen's other surface: *"on tickets triage list view have
no buttons at all (rmeov ethe accept/store/all)"* The triage LIST view (the table, not the queue
card view) shows no action buttons per row at all.

**The volume figure.** `needsTriage` (`workers/content/src/lib/triage.ts`) and the door it backs
(`GET /api/content/triage`, `workers/content/src/routes/triage.ts`) already select
`status = 'new' AND archived_at IS NULL` and nothing else: a resolved or archived ticket was
never in the set this door counts, whatever its four readiness fields (type, client, app,
raised-by) say. `workers/content/test/triage.test.ts` now pins exactly that: a ticket aged well
past the three-working-day line, resolved, with every readiness field cleared, leaves both the
list and the total. The 428-vs-15 gap was never in what the door counted; it was in how long a
STALE answer could keep being shown. `TEAM_RESOURCES.help` (`web/lib/live-resources.ts`) dropped
the cached `triage:<team>` answer on a `triage_duty` ping (naming somebody's week) but never on a
`help` ping, so a ticket resolved, closed or put away anywhere other than this exact screen's
own Accept/Assign/Plan left the Triage tab's badge and this queue's own total unmoved until the
ten-minute `MAX_CACHE_AGE_MS` ceiling (`shared/web/store.ts`) caught up on its own. `triageKey(t)`
now rides `help`'s own `deps`, so any ticket write drops the cached triage answer immediately,
the same live-sync guarantee (R15) every other derived count on this screen already carries.

**The list view.** `TriageQueue`'s `triageView === "list"` branch
(`web/components/tickets/triage-queue.tsx`) drew a fifth `decide` column on `TicketRowsTable`
with the row's own Accept/Assign/Plan button (`triageAct`) and a people-row strip beneath it,
opened by the button when the verb needed a person. Both are gone, along with the one piece of
state (`rowPicker`) that only existed to track which row's strip was open. `TicketRowsTable`
draws its `decide` column only when a caller passes one: the table is called with nothing in
that slot now, exactly as it already was on every other tab (Open, Closed, All). The queue's own
one-ticket-at-a-time card view is untouched and keeps its Accept/Assign/Plan decision, its Skip
and its Undo: her ruling names the LIST, not the card.
`web/test/triage-list-view-no-buttons.test.tsx` is new and drives both bodies: the list view's
table carries no button beyond the row's own ordinary title link (identical on every tab), and
the card view still draws its decision and Skip.

**Status: ruled, in build, 20 Sep 2026.**

**FACT, the 428.** Aurora's item 9 above, verbatim, *"canot be, i still have 428 to trigae but
only 15 open?"*, is answered here as fact, not yet as a rule. On the Kwapso team, 428 tickets
sit in status `new`: 320 came in through the Glide import, 103 were raised by Alaap, and 335
are of type Extra, most of them from May to August 2026. A decision is open on what to do with
them; nothing here decides it.

**Law.** None registered.

### B33: a story's own decision surface already asks for no assignee, there was no queue behaviour to replicate

**The rule.** Aurora, verbatim, 20 Sep 2026: *"on sotries, when acce`ting i have to assigna a
perosn right? rpelicate the quee behaviour for all buttons in the detail screen. maybe i am
worng here."*

**The finding.** She is right to have asked and the answer is: no, not on stories. There is no
"Accept" word or concept anywhere in the stories module, and neither of a story's two moves,
"Ready for review" (open/in_progress to in_review) and "Done" (in_review to done), both on the
story detail head, `web/components/work/story-detail.tsx`, ever reads or writes an
`assigneeId`. The door behind both, `setStoryStatus`
(`workers/content/src/lib/stories.ts`), refuses a `done` move to anybody but the app's own team
lead and refuses it while a checklist step is unfinished; it does not ask who the story belongs
to, and a story has never required an assignee at creation either (`story-form-dialog.tsx`'s
own `assigneeField` is `required: false`). The Stories "Reviews" tab's own "Queue" sub-view
(`ReviewsQueue`, `web/components/work/stories-screen.tsx`) is a same-named but unrelated
thing: a read-only list of stories already at `done`, one card each, whose only behaviour is
opening the story's detail screen. It carries no Accept/Assign button of its own, on the card
or in the Reviews List's table columns, so there was no queue decision to replicate onto the
detail head. The board's own drag-to-status write (`moveStatus`, same file) calls the identical
door with the identical two arguments, no assignee, so all three surfaces already agree.
**The behaviour she was recalling is real, just on a different screen.** Tickets' own Triage
Queue opens a people row before accepting an Issue ("Assign") or a Request ("Plan"), and that
queue behaviour was unified onto the ticket detail head the same day, on her own ruling quoted
in `web/components/tickets/tickets-collection.tsx` (see B29 above). That file belongs to a
different lane and is untouched here.

**The shape.** No door or component changed. Inventing an assignee requirement the doors do
not enforce would have been the bug this row exists to avoid. `web/test/story-accept-asks-no-assignee.test.tsx`
is new and drives the story detail head's two buttons end to end, proving neither call carries
an assignee and the "Done" move matches the board's own door call exactly.

**Status: answered, no build change, 20 Sep 2026.**

**Law.** None registered.

### B32: waves get a Settings panel, days per phase type

**The rule.** Aurora, verbatim, 20 Sep 2026: *"on waves i am missing the settings (we'l adjust
the duration of pahses in days)."*

**The shape.** A wave's own Settings panel (`web/components/work/wave-phase-days-panel.tsx`,
drawn on `wave-detail.tsx`'s Overview tab, alongside its other panels) gives whoever holds the
wave update right seven rows, one per `PHASE_TYPES` name (`shared/sprint-types.ts`, the
Wave-lifecycle order: Audit, Plan, Build, Pilot, Revision, Deploy, Hypercare), each with that
type's own icon and a number-of-days field, Save and Cancel underneath. Read only for a caller
without the right.

The days are the wave's own. Team migration 0109 adds `wave_phase_days`
(`workers/tenancy/src/team-schema/migrations.ts`): wave_id, phase_type, days, the creator and
editor audit pair, one row per (wave, phase type) that has actually been set, never seven rows
seeded the moment a wave is sold. A wave with no rows of its own reads placeholder defaults
instead (Audit 5, Plan 5, Build 20, Pilot 10, Revision 10, Deploy 3, Hypercare 10 days), hers to
adjust, said so in the migration's own comment. `POST /api/tenancy/waves/phase-days`
(`workers/tenancy/src/routes/waves.ts`) gates on the same `work:update` right `update_wave`'s
own door takes, validates each row (a phase type this team's own vocabulary carries, a whole
number of days from 1 to 365) and writes an activity row, "Phase days changed," on the wave.
The MCP surface carries the identical capability, `update_wave_phase_days`
(`shared/workers/tool-catalog.ts`, `documents/MCP.md` §3).

**Status: ruled, in build, 20 Sep 2026.**

**Law.** None registered.

---

### B34: a Glossary tab under Knowledge, the app's own words and their definitions

**The rule.** Aurora, verbatim, 20 Sep 2026: *"Add a tab to Knowledge with a glossary, and
craft me an artifact identifying which words we use and their definitions. Choose which
words you think worthy of being there, for example story, wave, acceptance criteria,
ticket, etc. We'll iterate on definitions, but I want to identify the words already; this
will let our users search there, but should be part of the knowledge base and feed the
assistant."*

**The shape.** A Glossary tab sits beside the Knowledge screen's own kind-tab strip (K2),
always drawn, never derived from a count the way the other tabs are, because it has to be
reachable at a zero count to seed itself. Its 54 starting words (`shared/glossary-seed.ts`)
become team-wide `knowledge_sources` rows of a new kind, `glossary`
(`createGlossaryEntry`/`seedGlossaryEntries`, `workers/content/src/lib/knowledge.ts`),
an ordinary knowledge source, listed alphabetically (`KNOWLEDGE_SORTS.title`), searchable
through the same door every other source is, and read by the assistant the same way, one
passage among the rest `ask_knowledge` already returns. Seeded once per team, idempotently,
the first time a person with the knowledge create right opens the tab
(`POST /api/content/knowledge/glossary/seed`); a word is added by hand from the same tab
(`POST /api/content/knowledge/glossary`, and its own MCP tool, `add_glossary_word`,
`shared/workers/tool-catalog.ts`, `documents/MCP.md` §3), corrected and taken away through
the knowledge base's own existing doors, gated by the same `knowledge:create` /
`:update` / `:delete` rights every other source already carries.

**AMENDED 21 Sep 2026 - a preview in the overview, and the off button disabled.** Aurora,
verbatim, reading the tab back: *"good. include a preview of the description in the
overview. disable the off button (only edit)."* Two changes to the row itself
(`web/components/knowledge/glossary-list.tsx`), the tab's own wiring and doors unchanged.
First, each row now draws a one-line, plain-text preview of its own definition under the
word, the first line or the first ~140 characters, whichever comes first, through the
same `richTextPlain` seam every other list/card preview in the app already reads a body
through (`shared/web/rich-text.ts`), never silently clipped (R87's own rule for a title,
read here for a body): an ellipsis marks every cut that left something out. Second, the
row's own "Take this word away" (deactivate) control no longer draws, for anyone, right or
no right: only "Correct this word" (edit) does. The door stays: `content.setKnowledgeActive`
and the confirm flow are unchanged in the file, the same door the record screen's own "Stop
using this" button still calls, gated behind one switch, `GLOSSARY_DEACTIVATE_ENABLED`,
currently off.

**AMENDED AGAIN 21 Sep 2026 - the same card as "All," not a bespoke list.** Aurora, on the
tab's own rows, verbatim: *"But why did you invent this new design? Why don't you use the
kind of square card, same as in all?"* The dl/dt/dd row this section describes above is
gone: the Glossary tab now maps its words through `KnowledgeSourceCard`, the exact component
and `<CardGrid fluid minItemWidth={KNOWLEDGE_CARD_MIN}>` wall the Knowledge screen's "All" tab
already draws (`web/components/knowledge/knowledge-screen.tsx`), never a second card shape for
one kind of source. The word is the card's own title; the definition preview from the
amendment above is its one body line, through a new `preview` prop on `KnowledgeSourceCard`
(`web/components/knowledge/knowledge-source-card.tsx`) that takes the "Last edited" meta
line's slot when a caller hands one over, unset everywhere else. The card offers the exact
actions "All" offers: none drawn on the cell itself, the whole card is the one press target,
which is "edit stays, no deactivate" read structurally rather than restated: pressing a word's
card opens the same correction dialog its row's pencil used to
(`?panel=edit&module=knowledge-glossary`), and no deactivate control exists on this card, or
ever did, so the ruling two paragraphs above holds without anything here re-asking the
question. Search and load-more are unchanged, the tab's own `<PagedFind>`/`<LoadMore>`. The
preview computation itself (`definitionPreview`, formerly private to the row) is the one thing
that survives from `glossary-list.tsx`, now exported for the card call site to read.

**Status: ruled, in build, 21 Sep 2026.**

**Law.** None registered.

---

### B35: a burndown chart per phase, and cycle time read off the same status history

**The rule.** Aurora, verbatim, 20 Sep 2026: *"Add a burndown chart to each sprint/cycle.
A burndown chart plots work remaining (story points or story count) on the Y-axis against
the days of the cycle on the X-axis, with a straight "ideal" line from the starting total
down to zero so the team can see whether they're ahead or behind. Build a visual artifact
that renders this per sprint and updates the remaining-work line each day as stories move
to Completed."*

Asked how cycle time (how long a story sits in each status) should be captured, she ruled:
*"capture this automatically via timestamps on those status changes."* Asked whether any
status history exists for stories today, she corrected herself in the same breath:
*"No status history exists for stories today: actually, it kind of does. In the old
system, we were only using work logs, so when it entered in progress, it's on the start of
the first related work log. Does that make sense?"*

**The shape.** One history table under both asks, the same way `help_status_events` (team
migration 0066) already serves a ticket's stage history: `story_status_events`
(`story_id`, `from_status`, `to_status`, `created_at`, the usual actor triple), team
migration 0110. Every runtime status writer (`setStoryStatus`, `storyProgressFlip` in
`workers/content/src/lib/stories.ts`) records a row the moment it genuinely moves one
(R17: a zero-row move writes no event either). The migration's own BACKFILL reaches for
the fact she named: a story already past `open` gets an `in_progress` event at the start
of its first work log, or its own `created_at` with none; a story at `in_review` or `done`
gets that event too, at `updated_at`.

The chart reads `POST /api/content/stories/burndown` (`{phaseId}`), a GET-style POST
(the phase id travels as a body field): one row per calendar day of the phase, the
REMAINING count (stories whose latest status event at or before that day is not `done`,
a story pulled back out of done counts as remaining again, computed from the latest event
rather than "ever reached done"), the IDEAL straight line from the phase's starting total
to zero on the last day, and the starting total itself. `hasPoints` is false today,
`stories` carries no points column yet, so the series counts stories until one exists, and
the count/points toggle stays off until it does. Drawn on the phase detail
(`sprint-detail.tsx`'s Stories tab, directly under the phase goal band and above the story
list) through the kit's own `Chart` (`type="line"`, two series: the remaining line in ink,
the ideal line in a lighter tone), empty through `EmptyGatedPanel` (R88) when the phase has
no start/end dates or no stories at all.

**Status: ruled, in build, 20 Sep 2026.**

**Law.** None registered.
