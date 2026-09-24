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
