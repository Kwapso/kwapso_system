# 5. Buttons and actions (part 8 of 8)

*Split from [documents/UI-RULEBOOK.md](../UI-RULEBOOK.md) — moved verbatim, cut rather than copied.*

### B47: task delete, the tick-off renamed "Done" and made mango, and the form's field order

**The ruling.** Aurora, verbatim, 21 Sep 2026: *"i need delete actino for tasks on the ...
button"*; *"in task the main buton is mark as odne, tick it off. finde shorter
alr¡ternative for the word, and make the button mango"*; *"on task add/edit the priority
setting put it under title. omve deadline above whos doing it."*

**What changed.** The task detail head's "…" menu gains a Delete item, confirmed through
the app's `useConfirm` pattern (`shared/web/use-confirm.tsx`) and a soft delete: `POST
/api/content/tasks/delete` (team migration 0113, `deactivated_at`/`deactivator_*`, the
same shape `delete_help_reply` already gave a reply one module along) — nothing is
removed, the row and its history survive, it stops appearing on every view and every one
of their counts. The main head action is the tick-off, one word, "Done" (matching the
story and ticket states, R34), drawn with the kit `Button`'s default variant (mango,
R84), first in the head actions row and its folded menu, while the task is open; once
done it reads "Reopen" as a secondary. It shows disabled, with a `Tooltip` explaining why,
while a work log against the task has no end — *"cannot mark anything as closed... if
there's an active time log running,"* her same-round ruling, held at the door too
(`setTaskDone` answers 409, "Stop the timer first."). The task add/edit form's field order
is now Title, Priority (right under the title), Deadline, Assigned to (who's doing it),
then the rest (Detail, Department, the App/Account picker the department reveals, the
file).

**Status: ruled and shipped, 21 Sep 2026.** Door, migration, MCP tool (`delete_task`) and
UI built and tested; strings seeded (de/es/ca).

**Law.** None new. Governed by R84 (mango lives only in a screen's own title component's
action slot) and R98 (every button the kit's own default size).

---

### B48: account first on the app form

**The ruling.** Aurora, verbatim, 21 Sep 2026: *"when creating app, first thing should be
to select account."*

**What changed.** `AppFormDialog`'s (`web/components/apps/app-form-dialog.tsx`) two
fields swap places on a NEW app: the account picker ("Whose system it is") is now the
first field on the form, above the name field, and the dialog opens with focus already
on it — `RecordPicker` grew an `autoFocus` prop for this (`web/components/records/
record-picker.tsx`, forwarding the native attribute onto the kit `Button` its trigger
already is). The name field's own `autoFocus` is now conditional on the OTHER branch:
an EDIT never shows the account picker at all (whose system it is cannot be changed once
recorded — see this field's own long-standing comment), so the name field keeps the
dialog's opening focus there, exactly as before. Only one field may hold it at a time.

**Status: ruled and shipped, 21 Sep 2026.** Proved by
`web/test/app-form-account-first.test.tsx`: the account `Field` sits before the name
`Field` in document order on a new app; the dialog opens focused on the account picker's
trigger (`#app-account`), never the name input; and on an edit, where the account field
never renders, the name field carries the opening focus instead.

**Law.** None new. A field-order and focus fix within the existing F-series form rules
(F2/F9, the dialog's own three-row grid).

---

### B49: the task slide-in

**The ruling.** Aurora, verbatim, 21 Sep 2026, over the side-by-side proposal at
`task-slide-in-design.html`: *"implement the slide-in design for tasks, only 1 change:
the start button on the left and the done on the right (keep done yellow). remove the
status chip and replace for priority chip."*

**What changed.** A task no longer opens a full tabbed page. Clicking a row, a board
card, a calendar entry or a week entry opens a slide-in sheet over the task list
(`web/components/work/task-sheet.tsx`), the kit's own `Sheet`/`SheetContent` at the same
`clamp(26.25rem,34vw,40rem)` width every other panel-form settles on — one screen, no
tabs, everything that used to be Overview and Work logs reading top to bottom in a
single scroller. `/t/<teamId>/tasks/<id>` still opens it: the URL's own record id drives
the sheet (`TasksScreen`'s `openTaskId`), so a deep link and a click land on the same
address. The old tabbed detail component, `web/components/work/task-detail.tsx`, is
**deleted, replaced by the sheet** — not kept as a redirect, since a sheet needs no
separate screen to redirect to.

Top to bottom: the title row (the task's title, no status chip, a priority chip instead,
drawn with the kit's `Badge variant="status"` over `PRIORITY_DOT_TONE` — K19a's own
named exception to R86 — and the "…" menu carrying Edit and Delete, always visible,
never folded, because a fixed-width sheet is never wide enough to need
`HeadActionsFoldMenu`'s responsive split); the actions row, **Start on the left, Done on
the right** (the one change Aurora asked for over the proposal, which had drawn Done
first) — Done stays mango (R84), disabled with "Stop the timer first." while the task's
own clock runs (R99's mirror, the identical refusal `task-detail.tsx` carried); Assigned
to, as the read-only Stakeholders-style tile (`PersonCard orientation="horizontal"`, the
same face+chip+name shape `help-stakeholders.tsx`'s `StakeholderTile` draws); Priority
and Deadline as fact rows (`OverviewList`); Description; Work logs (the Effort card
another lane is extracting into `web/components/work` for stories and tickets does not
exist yet, so this mounts `WorkLogsPanel` read-only — `canLog={false}`,
`showAddButton={false}` — until it does); and the dark Latest activity / Record band
(`RecordFooterBand`) at the very end, the sheet's own last element. The sheet scrolls as
one region — the R91 sheet exception, nothing pinned inside it.

**VALIDATED 21 Sep 2026.** Aurora reviewed staging this round and confirmed the task slide-in sheet with Assigned to, Details and Deadline merged into one container.

**Status: validated, 21 Sep 2026.** Proved by `web/test/task-sheet.test.tsx`: the
sheet opens from a row click and from a deep link with no click at all; the section
order top to bottom; the priority chip renders and no status chip does; Start precedes
Done in the actions row's own DOM order; Done disables while a timer runs; Delete sits
in the "…" menu; the footer band is the sheet's own last element. `web/test/
head-actions-fold.test.tsx` and `web/test/head-actions-everywhere.test.ts` are amended
for the retirement of `task-detail.tsx`'s own responsive fold (a sheet has one menu, not
two definitions of one).

**Law.** None new. Governed by R91 (the sheet's own scroller, the law's named overlay
exception), R99 (no record closes while its own clock runs, mirrored in the Done
button's tooltip), R84 (mango lives only in the screen's own title action slot — Done
keeps it, Start is `variant="secondary"`), R98 (the kit's own button sizes, never
`size="sm"`) and K19a (the priority chip's own four colours).

**Amended, 21 Sep 2026.** Aurora, verbatim, reading the sheet back: *"on slide in detail
pages, the ... button must be aligned with title, not with pills. priority is already a
chip, remove it from above deadline. assigned to needs a background, same description,
same deadline. description and deadline same design. bring the pencil icon out of the
..., next to it. if no time logged yet, hide that component. when time logged, as i said
before, i want to see the avatar in each row."*

Five changes to `task-sheet.tsx`. (1) The "…" menu moves off the chips row onto the
title row, right of the title text and vertically centred with it, never with the
priority pill above. (2) Edit leaves the menu for its own icon button (`size="icon"`,
R98), `variant="secondary"`, beside the "…" on that same row — the menu now carries only
Delete. (3) The Priority fact row is gone from the `OverviewList` below: the title row's
own priority chip already says it. (4) Assigned to, Description and Deadline become
three sections of ONE design — each a kit `Card` standing on the panel background, a
small title, the content — the exact shape `TicketSidePanel`
(`web/components/tickets/ticket-detail-body.tsx`) already draws for the ticket's own
side panels, reused here rather than rebuilt; Assigned to keeps its own eyebrow tile
(the Stakeholders-style `PersonCard`) inside its card, and Deadline moves out of the
fact-row list into its own matching card, with "No deadline set." as its own fallback
sentence. (5) The Effort card's own emptiness and its per-row avatar are the shared
`EffortCard`'s (`web/components/work/effort-card.tsx`) own job, owned by another lane —
the sheet only mounts it, unchanged, exactly as before.

**Status: amended and shipped, 21 Sep 2026.** Proved by `web/test/task-sheet.test.tsx`:
the title row holds the title, the Edit pencil and the "…" menu, in that order, aligned
with the title rather than the chips row; the "…" menu opens on Delete alone, no Edit
item; no Priority fact row renders anywhere on the sheet; Assigned to, Deadline and
Description render as three cards of the one `TicketSidePanel` shape, in that order; and
the Effort section is absent when the task carries no logged time.

**Amended again, 21 Sep 2026.** Aurora, verbatim, reading the three-card version back:
*"great work. however merge assigned to details and deadline in the same container
together (in this order)."*

The three matching `TicketSidePanel` cards above (Assigned to, Deadline, Description)
become ONE card — the same `TicketSidePanel` `Card`, called once rather than three
times — holding, in this order: Assigned to (the eyebrow tile, its own "Assigned to"
chip label standing in for a section heading, so none repeats it), Details (the
description, renamed off "Description" now that it sits inside the merged card), then
Deadline. The kit's own `Separator` sits between each of the three parts; no nested
cards. The File row keeps its own place, immediately after the merged card, exactly
where it sat after the old Deadline card.

**Status: amended and shipped, 21 Sep 2026.** Proved by `web/test/task-sheet.test.tsx`:
the merged card renders as ONE kit `Card` (`data-slot="card"`, singular, inside the
wrapper); Assigned to, Details and Deadline sit inside it in that order; exactly two
`Separator`s divide the three parts; and the section order top to bottom stays title
row, Start/Done, the merged card, Effort, the footer band last.

---
