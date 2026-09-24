# 4. Collections (part 8 of 8)

*Split from [documents/UI-RULEBOOK.md](../UI-RULEBOOK.md) — moved verbatim, cut rather than copied.*

### K60: every timer-start button reads "Start", with the stopwatch icon

**The rule.** Aurora's ruling, 21 Sep 2026, verbatim: *"everywhere where there's button to
start timer, rename to just 'start' and change icon for a stopwatch (same as in navbar for
logs)."*

**The shape.** The Logs rail entry's own glyph is `CONCEPT_ICON.time` (`web/lib/pages.ts`),
`"timer"`, the kit's `Timer` Phosphor component, so "the stopwatch" and "the same as the
Logs rail" name one glyph. The app's one shared start/stop toggle, `useRecordTimerAction` /
`RecordTimerButton` (`web/components/shell/timer-bar.tsx`), is what the ticket head and the
story head both read; its "not mine" branch now defaults to `t("Start")` and `<Timer>`
rather than `t("Start timer")` and `<Play>`. The Stop half is untouched on purpose: it has
always drawn `StopCircle`, never `Play`, so it was never in the icon family this ruling
retired. The Stories page's own per-story quick-launch strip (`StartTimerStrip`,
`web/components/work/time-panel.tsx`) took the same glyph swap; its label stays each story's
own title rather than the bare word "Start", since five buttons in a row read alike
otherwise, and the word this ruling names is what the CONTROL says, not what identifies
which record it starts. Task detail's own button is a separate, same-day lane (its own
21 Sep 2026 ruling, "beside the mango Done") wiring a `startLabel`/`startIcon` override on
the same shared control; it inherits this default for free and is not re-touched here.

**VALIDATED 21 Sep 2026.** Aurora reviewed staging this round and confirmed every timer-start button reads "Start" with the stopwatch icon.

**Status: validated, 21 Sep 2026** (`web/components/shell/timer-bar.tsx`,
`web/components/work/time-panel.tsx`); census in `web/test/timer-start-word.test.ts`, which
walks every call site that wires a timer-start control and fails on a leftover "Start timer"
string or `Play` icon, task detail/task form named out (another lane's own file).

**Not a law.** No registry entry, a plain copy/icon rename recorded here for the next
reader, checked only by the census test named above.

---

### K61: the billable flag on work logs is killed, not hidden

**The rule.** Aurora's ruling, 21 Sep 2026, verbatim: *"remove the billable from logs, not
hide, remove."*

**The shape.** `WorkLog.billable` (`shared/types.ts`) is gone, along with every surface that
read or wrote it: the time form's Billable switch (`web/components/work/time-form-dialog.tsx`),
the Logs screen's "not billable" chip (`web/components/work/time-panel.tsx`), the `billable`
field on `log_time`/`update_work_log` on both the web door
(`workers/content/src/routes/work-logs.ts`, `workers/content/src/lib/work-logs.ts`) and the MCP
tool catalogue (`shared/workers/tool-catalog.ts`'s `log_time`), the meeting-capture INSERT that
used to mark every log it wrote billable (`workers/content/src/lib/meetings.ts`), the
`work_logs.billable` facet (`shared/workers/query-grammar.ts`) and the automations census entry
that named it (`shared/automations.ts`, renamed `meetings.time-log`). The column itself is
dropped, not left unmounted: team migration `0115_the_billable_flag_is_killed`
(`workers/tenancy/src/team-schema/migrations.ts`) runs `ALTER TABLE work_logs DROP COLUMN
billable`. No hours summary ever split billable from non-billable time — `totalSeconds`
(`WorkLogSummary`, `shared/types.ts`) was already one total — so nothing there needed changing.

**VALIDATED 21 Sep 2026.** Aurora reviewed staging this round and confirmed billable is gone from work logs entirely, the column included.

**Status: validated, 21 Sep 2026** (`workers/tenancy/src/team-schema/migrations.ts`,
`workers/content/src/lib/work-logs.ts`, `web/components/work/time-form-dialog.tsx`,
`web/components/work/time-panel.tsx`); proven by
`workers/tenancy/test/migration-0115-billable-column-dropped.test.ts` and
`workers/content/test/work-logs.test.ts`.

**Not a law.** No registry entry, a field removal recorded here for the next reader, checked
only by the migration and door tests named above.

---

### K62: the "not live" hint is a compact pill, bottom centre

**The rule.** Aurora's ruling, 21 Sep 2026, verbatim, choosing option A off the side by side
design page over a full width bar: *"for not live implement A Compact pill, bottom centre."*

**The shape.** `LiveStatus` (`shared/web/live-status.tsx`) no longer draws an inline warning
strip above a screen's own content, pushing it down while the socket is out. It is now a
fixed, bottom centred pill in the kit's own toast register: `rounded-pill`, `bg-warning
text-warning-foreground`, the kit's overlay shadow, the cloud icon it already used, one line
("Not updating live right now.", shortened from the old two sentence strip so it reads like a
toast rather than a paragraph), a Refresh action in the toast's own dense light wash button
style, and a small close mark that hides it for this disconnection only (a fresh drop shows it
again). Its base offset is the version toast's own, `var(--space-7)` on a wide screen and
`var(--space-4)` on a phone, the same two tokens `<Toaster>` passes as `offset` and
`mobileOffset`. Two more clearances stack on top through custom properties each shell sets on
its own root wrapper, the same shape `app-shell.tsx`'s own `--shell-top` already uses:
`--live-status-tab-clear` for the phone's own fixed bottom tab bar (agency only, zero at `md`;
the portal's own bottom nav shows at every width, so its wrapper carries no `md` override), and
`--live-status-band-clear`, raised only on a ticket screen through a
`has-[[data-slot=ticket-footer-band]]` selector, so it clears R89's dark Latest activity /
Record band without a prop the component would have no honest way to fill in on its own. Both
shells now mount it as a sibling of the routed screen (`app-shell.tsx`, after `</ScreenShell>`;
`portal-shell.tsx`, after `</main>`) rather than inside the page width column, so it never adds
a box, a height or a width to whatever a screen is showing.

**VALIDATED 21 Sep 2026.** Aurora reviewed staging this round and confirmed the "not live" hint is a compact pill at the bottom centre in both apps, and the design page was deleted at her ask.

**Status: validated, 21 Sep 2026** (`shared/web/live-status.tsx`,
`web/components/shell/app-shell.tsx`, `web-portal/components/portal-shell.tsx`,
`shared/i18n-seed.ts`); proven by `web/test/live-status-pill.test.tsx`.

**Not a law.** No registry entry, a presentation change recorded here for the next reader,
checked only by the test named above.

---

### K63: the filters open as an overlay, never as a second row, and the overlay picks its own form

**The rulings, two of them, a Chapter apart.** Aurora, 2 Sep 2026, verbatim: the filters
must open as *"a temporary overlay not a second row"*. Aurora, 23 Sep 2026, choosing among
five drawn designs: *"filter drop sheet popover"*. The first says where the facets may not
land; the second says what they look like when they land properly. Neither works without
the other.

**The mechanism.** One component decides, and it decides from the CONTENT.
`filterOverlayForm(span, hasRoom)` (`shared/ui/components/filter-bar/filter-bar.tsx`) is a
pure function of what the declared facets cost, never a prop, never a breakpoint, never a
screen's own opinion, so a facet added to a collection tomorrow moves the form on its own,
which is what her *"the sheet is simply a popover that ran out of room"* describes. It
counts HEIGHT rather than heads (`FACET_SPAN`: a field costs 1, a range costs 2, because a
range draws a min and a max side by side with a line kept under them for its error state),
spends that against `FILTER_POPOVER_BUDGET` (3, her own "two or three facets" against "four
or more"), and answers `popover` at or under the budget, `sheet` above it, and
`bottom-sheet` on a phone whatever the content costs. The drop sheet's ANCHOR is the
toolbar's own track, marked once by a shared toolbar with `data-filter-anchor`
(`FILTER_ANCHOR_ATTR`) rather than a ref threaded through every screen that has filters:
that attribute is the difference between a sheet the width of the toolbar and a sheet the
width of the Filter pill.

**What it costs.** Nothing at a call site: a screen hands `useFilterBar` its facets and
puts the ONE node it returns in the toolbar's `filters` slot. What it forbids is the
position. There is no second slot to put anything in, `useFilterBar` no longer returns a
`{ pill, panel }` pair a caller could place separately, and `ToolbarRow`/`ToolbarColumn`
carry no `toolbarPanel` prop (the vendored kit's `CollectionFrame` still declares one, so
the rule is about the APP: nothing here hands anything to that position). A toolbar that
draws its own track owes one thing, the anchor attribute on the same element as
`data-slot="toolbar-row-track"`, and the census is derived rather than listed, so
`wave-finder.tsx`'s registered hand-copy is held to it too.

**Status: ruled 2 Sep 2026, form chosen 23 Sep 2026, enforced the same day.** The four ways
this shipped green before are one shape, the facets landing somewhere in the toolbar's own
box: a panel nested in the pill track (a giant oval), a panel absolutely positioned but
still inside the toolbar's column, a panel in normal flow under the track pushing the
collection down, and two same-toned boxes with a seam between them read as a second
toolbar. So the check is STRUCTURAL rather than visual.

**Law.** [R110](../RULES.md) (`filters-open-as-an-overlay`),
`web/test/filters-open-as-an-overlay.test.tsx`. The decision is proved twice, directly as
the function (`FILTER_POPOVER_BUDGET` is 3; a field plus a field plus a range is 4 and
therefore a sheet; a phone gets neither form) and then as a RENDER, that the component
really asks it (`data-form` on the open dialog). The no-second-row half is asserted at all
three widths: the toolbar's in-flow markup is byte for byte unchanged when the overlay
opens, its column still has exactly one child, the rows below are not displaced, and the
overlay is a descendant of the column, of the pinned box and of the screen's own container:
none of the three. Plus the overlay's own behaviour (Escape closes it, a press on the
ground closes it, focus is trapped and returns to the Filter control), its two foot
controls (Clear all only once something is on; Show N says the live count and closes the
overlay, because the filters are already applied), the phone's kit bottom sheet with its
side marker, grabber and heading, and four censuses over `web/`, `web-portal/` and
`shared/web/`, including that `FilterOverlay` is reached through the KIT with the app-side
twin `shared/web/screen-engine/filter-overlay.tsx` asserted NOT to exist (R39).

---
