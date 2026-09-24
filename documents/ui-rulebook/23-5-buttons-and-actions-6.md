# 5. Buttons and actions (part 6 of 8)

*Split from [documents/UI-RULEBOOK.md](../UI-RULEBOOK.md) — moved verbatim, cut rather than copied.*

### B41: a ticket shows who is on it, inherited from the app when it has none of its own

**The rule.** Aurora, verbatim, 21 Sep 2026: *"both on story detail and ticket detail we
need to see to woh it's ssigned, normally this gets inherited from the app."* Read as: the
ticket page (and, later, the story page) shows one "Assigned to", a single person; when
the record carries no assignee of its own, it reads the app's own answer and says so
("Inherited from &lt;app&gt;"); a person holding the record's edit right can set one on the
record, which overrides the app's.

**Scope shipped this round, stated explicitly (a same-day scope correction).** The ticket
side, in full: the migration, the door, MCP parity, the resolver, and the "Assigned to" row
on `help-stakeholders.tsx`. The story page is **not** touched, it stays a design artifact
for now, on Aurora's own word ("let's continue on artifact for story"), but the resolver is
generic and ready for it the day that lane opens.

**The data-model decision, and why it is narrower than it first reads.** A ticket (`help`)
gets its own `assignee_id`/`assignee_name` pair (team migration 0111), the same audit-pair
shape `stories.assignee_id`/`assignee_name` already keep. The **app does not** gain a second
column. Investigated first: an app already carries exactly one "who owns this system" fact,
`app_staff.is_lead` (team migration 0030), the row `app-detail.tsx`'s own Lead field already
reads and writes. Adding a disconnected `apps.assignee_id` beside it would be two answers to
one question that can disagree the first time the lead changes and the copy does not follow,
the same shape the codebase's own "two dates for one promise" argument (`sprintEndsOn`,
`shared/types.ts`) warns against. So the app's half of
the inheritance reads `app_staff` directly, a correlated subselect (`app_assignee_id` on the
ticket row, exactly like `app_logo`'s own two lines up in `TICKET_COLS`); the app's existing
lead field and its existing door (`AppFormDialog`'s Lead field, `setAppStaff`) are kept
exactly as they are, never touched.

**The resolver.** One function, `effectiveAssignee(record, app)`
(`shared/effective-assignee.ts`): the record's own `assigneeId`/`assigneeName` wins when it
has one; otherwise the app's own answer (its lead, pre-resolved by the caller off the team's
members cache) wins, with `inherited: true` and the app's name for the "Inherited from"
line; with neither, the row reads nobody. Pure and synchronous, both candidates arrive
pre-resolved, so the resolver never touches a database or a members cache itself, which is
what lets the story page read the identical rule later with no changes here.

**Where it is wired.** `workers/tenancy/src/team-schema/migrations.ts` (0111, `help` only).
`workers/content/src/lib/help.ts`: `TICKET_COLS` carries `assignee_id`/`assignee_name` and the
`app_assignee_id` subselect; `toTicket` redacts all three **unconditionally** to a client
login (not `hideEditor`'s own self-view exception, an assignee is always staff, by
construction, so there is no "the assignee is a client" case to carve, SCOPE ch.06's "the
portal shows work status but never which staff member is doing it"); `updateTicket` takes
`assigneeId`, staff only, ignored outright (not refused) for a portal caller, absent means
leave it alone. `shared/workers/tool-catalog.ts`'s `update_help_ticket` widened the same way
for R22/MCP parity. `web/components/tickets/help-stakeholders.tsx`: the "Assigned to" row,
first, drawn exactly like the "Raised by" row beside it, the same horizontal `PersonCard`,
the same `size="row"`, the same card and padding, with the muted "Inherited from &lt;app&gt;"
line (`PersonCard`'s own `secondary` slot) when inherited, a pen where Raised by's own used to
sit before it was retired (20 Sep 2026), opening the kit `Select` (R90 faces) in its place for
whoever holds the ticket edit right, and the row's own empty-state words when a ticket has
neither an assignee nor an app to inherit from. Unlike Raised by, the row is never folded into
the panel's own "just the raiser and your admins" empty state, an assignee can exist with no
stakeholders at all.

**AMENDED 21 Sep 2026 - a way back to inherited.** The ruling shipped the row but not a way
to undo it: once a ticket carried its own assignee, nothing on the page could clear it back
to the app's own answer. The Select's first option is now a real, pickable row - the `NONE`
sentinel (`__none__`) every other "nothing chosen" Select in this app already uses
(`step-form-dialog.tsx`, `meeting-form-dialog.tsx`, `help-form-dialog.tsx`'s own "Raised by"),
never a bare empty string, which Radix reads as nothing selected rather than as an item
somebody actually picked. It reads "Nobody, inherit from the app" when the app has a lead to
fall back to (`appAssigneeId`), and plain "Nobody" when it has none - the row never promises
an inheritance that would not happen. Choosing it writes `assigneeId: null` through the same
door (`content.updateHelp`), and the door tells "clear it" apart from "leave it alone" on the
RAW wire value: `optionalText` alone answers `undefined` for both a missing field and an
explicit `null`, so `updateTicket`'s own `assigneeCleared` (`workers/content/src/lib/help.ts`)
checks `input.assigneeId === null` before the validator ever sees it - R20's own
literal-comparison form, positional like every other check this door already makes. R90
(faces in choices) still governs this row: it carries the kit's own EMPTY face (`face={{ name:
"" }}`, a blank `Avatar`, no photo and no initials to draw) rather than no face at all, because
there is no record behind "nobody" to draw a real one for, and the census only asks whether a
face slot is present.

**AMENDED A SECOND TIME, SAME DAY, 21 Sep 2026 - a different card from Stakeholders.** Aurora,
reading the shipped row back, verbatim: *"nono assigned to on the very top, a different card
from stakeholders!"* The row above had landed INSIDE `HelpStakeholders`, above Raised by, one
`Card` among several in the Stakeholders panel - correct about the POSITION ("on the very top")
and wrong about the CONTAINER. It is now its own top-level `Card`, `AssignedToCard`, exported
from `help-stakeholders.tsx` beside (never inside) `HelpStakeholders`, which carries none of it
any more - no props, no state, no render. Rendered as the FIRST panel in the ticket page's own
right column, above Stories/Time/Stakeholders and everything else: `TicketDetailBody`
(`web/components/tickets/ticket-detail-body.tsx`) gains a new `assignedTo` slot, first in its
own `sidePanels`, with a matching `TICKET_PANEL_ANCHOR.assignedTo`; `help-detail.tsx` builds
`<AssignedToCard>` from the same ticket/app/member facts the Stakeholders panel's own call used
to hand it, through the same `editTicket` courier. Because this card now stands DIRECTLY on the
page ground rather than nested inside another `Card`, it takes `variant="default"` (soft paper)
in place of the `"raised"` it correctly wore while nested - R67's own ground rule
(`ticket-detail-body.tsx`'s header), the same "a raised card standing on its own ground" bug
that file's several rounds already exist to catch, caught here one level up before it shipped.
Everything else about the card, and last amendment's clear-to-inherited option, are unchanged.

**AMENDED A THIRD TIME, 20 Sep 2026 - the clear-to-inherited option was itself a law
violation, corrected.** The second amendment's own "Nobody, inherit from the app" / plain
"Nobody" row put a live pill back into a STAFF PICKER, which R79's own law already forbids:
Aurora's 16 Sep 2026 ruling, verbatim, quoted in full because this is the sentence the second
amendment should have been checked against and was not: *"Kill the 'nobody' option for staff.
If we leave it empty, it's not an option. Remove it from tasks and everywhere else. This
'nobody', just kill it."* `staff-picker-kills-nobody.test.tsx` (the census half, off disk) is
the standing proof that `allowNobody`/`nobodyLabel` cannot come back on `StaffPillPicker`
itself; this card's own `Select` is a different component, so the census could not see the
"Nobody, inherit from the app" row it grew independently, and it shipped, red against the
ruling, under a green build. **The fix is not "no way back", it is "not a picker entry".**
The Select goes back to offering people only (sorted, R75; faced, R90; no Nobody row, at any
`appAssigneeId` state). Clearing the ticket's own assignee back to inherited is now a plain
text button on the card itself, `variant="link"` (the kit's own quiet, boxless action, `.kw-
link`), reading "Use the app's lead", offered only when there is somewhere to fall back TO:
the record carries its own assignee AND the app has a lead. **When the app has no lead, no
clear action is offered at all** - once a ticket or story is assigned, it keeps a person,
which is the other half of the 16 Sep 2026 ruling ("if we leave it empty, it's not an
option") read correctly this time: emptiness is never reachable by a click, not even a click
disguised as "inherit instead of clear". Pressing the button calls the same door,
`onChangeAssignee(null)`, unchanged - the doors already treat `null` as an explicit clear
(`assigneeCleared`, above), so nothing downstream of the click needed to move.

**AMENDED A FOURTH TIME, 21 Sep 2026 - redesigned as the Stakeholders card's own twin.**
Aurora, over a screenshot of the ticket page's Stakeholders card (its title row reading
"Stakeholders" with the count "4" beside it, and inside it the horizontal "Raised by" tile -
a round face on the left, the small-caps eyebrow "RAISED BY" above the name "Marco Hasler"),
verbatim: *"Look at the screenshot with the stakeholders. I wanted the 'Assigned to' to be
like this: the count and the horizontal card. Redesign it."* Validated the same round: *"4.
Validated but redesigned as explained."* `AssignedToCard` no longer draws its own bare `Card`
with a hand-rolled title row - it opens with `<TicketSidePanel>` (`ticket-detail-body.tsx`),
the SAME title-with-count register "Stakeholders" itself renders through
(`help-detail.tsx`'s own `<TicketSidePanel title={t("Stakeholders")}
count={stakeholderBadge}>` call): the title "Assigned to", and a count beside it in the
identical `formatCount` register (R16) - 1 when the record carries its own assignee or
inherits one from the app, 0 (rendered as nothing, never a bare "0") otherwise. Inside it,
the face+name row is drawn by a new, shared `StakeholderTile` (`help-stakeholders.tsx`) - the
SAME component Raised by's own tile now draws itself with, extracted from Raised by's
pre-existing markup rather than copied, so the two tiles cannot drift the way this file's own
header already warns two hand-rolled copies always do: a face on the left, the small-caps
eyebrow over the name on the right. The eyebrow's own words differ from Raised by's - "Assigned
to" when the record carries its own person, "From the app" (a new, seeded string) when it does
not and the app's lead is answering instead, with the app's own name kept on the existing
second, muted line ("Inherited from &lt;app&gt;") rather than folded into the eyebrow itself.
The pen and the Select it opens keep their own position, now `StakeholderTile`'s own `action`
slot, exactly where Raised by's own pen used to sit on its tile before it was retired (this
book's own account above, "THE EDIT PEN IS GONE"); "Use the app's lead" stays a small text-
button action under the tile, offered only when there is somewhere to fall back to. The empty
state, when neither an assignee nor an app lead exists, is the plain words "Nobody yet." inside
the card - the title row above it already says "Assigned to", so the tile's own eyebrow is not
repeated when there is no tile to carry it. The card still stands DIRECTLY on the page ground
(R67): `TicketSidePanel`'s own `Card` is `variant="default"`, unchanged.

**AMENDED A FIFTH TIME, 21 Sep 2026, read-only, editing moved to the ticket's own edit
screen.** Aurora, reading the redesigned card back, verbatim: *"ok, but rmeove the edit
button (this can be editedfrom dtory edit screen). rmeove the 'use the apps lead' text."*
The pen, the Select it opened and the "Use the app's lead" clear button are all gone from
`AssignedToCard`, not merely hidden: no `onClick`, no local picking state, no `Select`, no
clear control. `canEditAssignee`/`onChangeAssignee` are dropped from the component's own
signature, and both callers (`help-detail.tsx`, `story-detail.tsx`) stop passing them the
same turn. The one remaining door onto a ticket's `assigneeId` is `help-form-dialog.tsx`'s
own new "Assigned to" field, placed right after the ticket's App field, the identical kit
`Select` the card's own picker always wore (R90 faces, R75 sorted A to Z), people only, no
Nobody entry, because a staff picker never offers one (her 16 Sep 2026 ruling). It carries no
clear control of its own either, so this form can only set a person, never explicitly clear
one back to inherited: leaving the field untouched sends nothing at all and keeps whatever
the ticket already had, its own assignee or the app's inherited lead. A story's own assignee
is unaffected by this ruling and is still changed from its own edit screen
(`story-form-dialog.tsx`'s "Who's doing it"), which this pass did not touch. The card still
stands DIRECTLY on the page ground (R67), unchanged.

**Status: ruled and shipped (ticket side), 21 Sep 2026, including the separate clear action
and its own top-level card (both since retired by the fifth amendment above), the 21 Sep 2026
redesign as the Stakeholders card's twin, and the 21 Sep 2026 move to read-only with editing
on the ticket's own edit screen. Story side: parked as a design artifact, resolver ready.**

**Law.** None new for the row itself. Governed by the pre-existing R90 (`faces-in-choices`,
the Select's own faces) and R75 (alphabetical options), both proved by the existing app-wide
censuses, now against `help-form-dialog.tsx`'s own "Assigned to" field rather than the
retired card-level Select. **The "no Nobody entry" half is governed by R79**
(`staff-pill-row`, "there is no 'Nobody' pill") read together with
`staff-picker-kills-nobody.test.tsx`'s own header: *"A STAFF PICKER NEVER OFFERS NOBODY"*, a
picker never offers Nobody, which this form's own field still honours by offering people
only. Behaviour proved at the door
(`workers/content/test/ticket-gets-its-own-assignee.test.ts`: set and read back, inherits the
app's lead, the ticket's own assignee wins, a client login cannot set it, and `assigneeId:
null` clears it, never confused with leaving the field out) and at the app's own wiring
(`web/test/help-stakeholders.test.tsx`'s `AssignedToCard` suite: the inherited line, the
own-assignee-wins case, no pen and no Select rendered ever, even when the old gating props
are still passed; a ticket form test proving the "Assigned to" field renders with faces and
submits `assigneeId`; plus its own "HelpStakeholders no longer draws an Assigned to row"
suite, proving the extraction really left, both at render and positionally on the
component's own signature; and its own "TicketDetailBody, Assigned to is the first panel in
the side column" suite, rendering the real layout component and reading the DOM order directly
rather than trusting a prop name) and the resolver itself (`web/test/effective-assignee.test.ts`).

---

### B42: the story detail page, one page, no tabs, with its own Build notes

**The rulings.** Aurora's design review, 21 Sep 2026, over the story-detail-design.html
artifact — a story is what we do, built the same shape the ticket already is. Two verbatim
sentences of hers this round: *"call it build notes"* — the artifact's own third left-column
section (what was built, and how) offered four candidate words, "Solution" recommended; she
named the one actually shipped, never that one. And, the design's own open question ("should
the Done action refuse to close a story with no Solution written, the same way Ready for
review already asks for a note. Yes or No"), answered verbatim: *"yes, canont be marked as don
if thats not filled in, its required."* Read as: a story cannot reach Done while its Build
notes panel is empty, exactly the shape Ready for review's own review-note requirement already
takes. Dated the same round as B41 above, and the ticket's own "Assigned to" card — parked in
B41 as a story-side artifact — is what this round wires up for real: *"the story gets the same
card."*

**AMENDED, 21 Sep 2026 — the Related panels.** Aurora, verbatim: *"in stories if no related
tickets hide that. same for related stories. only in stories."* The Related tickets panel, when
the story has no ticket, renders nothing at all (no title, no empty state); the Related stories
panel, when there are no sibling stories on that ticket, renders nothing at all. This rule
applies only on the story page, never on the ticket page — the ticket page keeps both panels
visible with their content or their empty state. R88 (empty-state single door) already names
this pattern: when a section is empty, its panel's own header and the section's title both
render nothing, and the single door in the body stands in for it. Here, no body exists to show
("No related tickets" never appears, nor "No related stories") — the whole panel vanishes.

**The data model.** Team migration 0112 gives `stories` one new column, `build_notes TEXT` —
the identical storage `detail`/`acceptance_criteria` already use (rich text, sanitised into the
`Notes` editor, list reads null it out the same way those two do, a by-id read keeps it whole).
`Story.buildNotes: string | null` (`shared/types.ts`), read and written through the SAME door
every other story field already rides, `updateStory`/`createStory`
(`workers/content/src/lib/stories.ts`), which replaces every field it reads — an edit that never
mentions `buildNotes` clears it, the identical contract every other field on that door already
keeps. MCP: `update_story` (and `create_story`, for parity) gained `buildNotes` in schema and
`buildBody`, documented in `documents/MCP.md` §3.

**The Done rule, at the door, and mirrored on the button.** `refuseUndocumented(row)`
(`workers/content/src/lib/stories.ts`, read beside `refuseUnstepped`, the identical CHECKLIST
6.5 step-rule shape) refuses `setStoryStatus(id, "done", …)` with a plain message, *"Write the
build notes before marking it done,"* when `build_notes` is empty or whitespace-only — the
refusal is idempotent (R17), reads the row already resolved, never a second query. The story
detail page's own Done head action mirrors the same fact back as its own `disabled` state, with
a tooltip carrying the identical sentence, so a reader sees why before they ever press it — the
door decides, the button only mirrors it, the same split R17 already asks of every status
button in this app.

**Where the images live.** No second attachment table. Build notes' own images ride the SAME
mechanism the story's retired "Files and links" tab already used, `story_attachments`
(`workers/content/src/lib/story-attachments.ts`) — itself "one table along" from
`help_attachments`, the reply body's own mechanism, by that file's own header. The Build notes
sheet (below) reuses the existing, tested `StoryAttachmentsPanel` for the picker; the rendered
(non-empty) panel shows the prose followed by whichever of the story's own attachments are
pictures, inline, the same `hasPreview`/`AttachmentPreview` pair the ticket thread's own message
media well already draws with.

**The page, one page, no tabs.** `web/components/work/story-detail.tsx`, rewritten whole.
`RecordScreen panelVisible={false} footerVisible={false}` draws the head only (chips through
`orderChips` — id, status, type, app, phase — the title, and the head actions: the timer, Edit,
Ready for review, Done); the body renders as its SIBLING, the identical shape `help-detail.tsx`
already takes for `TicketDetailBody` (`RecordScreen`'s own `panelVisible` doc: the kit's panel
region never reads `children` once it is off). The body itself is `RecordDetailBody`
(`web/components/records/record-detail-body.tsx`, new) — the SAME shape
`ticket-detail-body.tsx`'s own `TicketDetailBody` proves across nine rounds of R89's own
live-injection saga (one page scroll, the footer flush at the screen's bottom edge with the
panel gap above it, the side column that never scrolls), extracted for this second caller
rather than hand-copied. `TicketDetailBody` itself stays inlined and unchanged — its own JSX is
read by `web/test/footer-on-the-edge.test.ts` at exact source position, so delegating it to the
shared component would turn a green law red for a refactor that changes no pixel; only the
`useIsAtLeastLg` hook moved, imported rather than duplicated. Left column, in order: Detail,
Acceptance criteria, Build notes — each its own `TicketSidePanel` Card (that component is
purely generic despite its ticket-flavoured name, reused rather than a second wrapper). Right
column, in order: Assigned to (`AssignedToCard`, `help-stakeholders.tsx`, whole, unmodified —
B41's own "the story page reads the identical rule later with no changes" came true), Related
tickets (the ticket this story was born on, `helpOne` by id, the same `RecordRef`/title/status
chip shape a list row anywhere else in this app takes, routed through `orderChips` for id+status
even on a plain row), Related stories (siblings sharing the same ticket, the identical
`sliceKey("stories-ticket", …)` cache `help-detail.tsx`'s own Related stories panel already
reads — the two pages share one list — no progress bar), Phase and wave (the phase, and its own
wave, read off `sprintOne`), Effort (`WorkLogsPanel`, wrapped in the same `EmptyGatedPanel` +
`AddButton` shape `help-detail.tsx` already wears for the identical reason — that panel draws no
title of its own), Metrics. Below `lg`, the side panels stack first, then the main column, then
the band — `RecordDetailBody`'s own built-in order, unchanged from the ticket's.

**Metrics.** Computed in a content door of its own, `getStoryMetrics`
(`POST /api/content/stories/metrics`, `workers/content/src/lib/stories.ts`) — never a column on
the story read, which every OTHER caller of `getStory` would then pay for unasked. Cycle time:
seconds from the story's first work log to the moment it most recently reached Done (or to now,
while it has not), null — "Not started" — with no work log at all. Effort: whole seconds logged,
a discarded timer never counted. Flow efficiency: effort ÷ cycle time as a percentage, null —
"No time log" — while either side of the division is zero. (The exploratory Delivery Metrics
artifact read for wording proposes a richer working-day-based version for a phase-level
dashboard; this panel follows the simpler arithmetic actually specified for it, and only takes
the artifact's two named words, "Not started" and "No time log", for the two undefined states.)

**The Build notes sheet.** `web/components/work/story-build-notes-sheet.tsx`, new — built like
`reply-edit-sheet.tsx`: a title row, the `Notes` rich text editor (the identical editor Detail
and Acceptance criteria already use, never a second control), the image picker below it, Cancel
and Save at the foot. R88's single door while empty: `EmptyGatedPanel` drops the panel's own
title row entirely, and `CollectionEmptyState`'s one "Write the build notes" button is the whole
panel; once written, the pencil — never a second create control — reopens the identical sheet.
Save spreads the story's own current shape (the update door replaces every field) and overrides
only `buildNotes`, the same pattern `work-panels.tsx`'s own `toggleContributesToGoal` already
takes for the identical reason.

**VALIDATED 21 Sep 2026.** Aurora reviewed staging this round and confirmed stories hide Related tickets and Related stories when empty (round 36).

**Status: ruled and shipped, 21 Sep 2026.** Team migration 0112, the door + its Done refusal,
MCP parity, the one-page rewrite, `RecordDetailBody` extracted and reused, the Build notes
sheet, the Metrics door, strings seeded (de/es/ca).

**Law.** None new. Governed by R88 (empty-state single door), R89 (footer on the edge, proved
by construction through the shared `RecordDetailBody`), R91 (no nested scroll), R94 (chip
order), R17 (idempotent transitions, the Done refusal). Behaviour proved at the door
(`workers/content/test/story-build-notes.test.ts`: writing and reading build notes through the
update door, the list/detail split, the Done refusal and its recovery, an update that omits the
field clearing it, and the metrics door against a real work-log fixture) and at the app's own
wiring (`web/test/story-detail.test.tsx`: the panel order in both columns, the Build notes empty
door opening the sheet and the pencil reopening it, Save writing `buildNotes` while the rest of
the record rides along, the Done button disabled with a reason until build notes are filled, the
Assigned to card first with its inherited line, the Metrics figures from a fixture, and no
nested scroll region anywhere on the page).

---
