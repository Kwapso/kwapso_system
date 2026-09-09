# BRIEF — lane `rt95` · branch `fix/round-trip-95` · worktree `~/kwapso-lanes/rt95`

Read `/Users/alaap_kanchwala_apple/kwapso-lanes/LANE-COMMON.md` first and obey it.
**Use a PER-LANE scratchpad subdirectory** — a measuring agent had its probe output clobbered
mid-run today by another lane writing the same shared filename.

## Goal
`round_trip_review` from **94 to ≥95**, measured fresh with
`~/.claude/skills/round_trip_review/SKILL.md`.

A lane claimed 96; an independent measurement at `d2e50c8f` says **94** (93.69). It agreed with
the lane on `speed` (96) and disagreed here, and it named the two cheapest points on the board.
Together they are worth ~+1.65 → 95.3. Read its full report first if the planner has saved it;
otherwise this brief carries everything you need.

## The two changes, in order of value

1. **Criterion 8, payload — 80, worth up to +1.2, and it is now UNBLOCKED.**
   `workers/content/src/lib/help.ts:212` — `TICKET_COLS` carries `description`, and **the list
   door and the by-id door share the same constant** (`:519` and `:247`). `description` is
   **34.9% of the ticket list payload**, measured. The rubric's 30-point row is "list endpoints
   omit heavy fields until asked" and it is unearned.
   **Split it**: give `listTickets` a column list without `description`; leave the by-id door's
   list whole. One constant, one call site.
   **Why this is safe NOW and was not before:** the client portal's ticket screen used to render
   a list row AS the detail, so dropping the column would have shown a client half their own
   ticket. `42013880` fixed that — `web-portal/components/ticket-screen.tsx` now reads by id
   always. **Verify that yourself before you cut the column**, and check every other consumer of
   `listTickets` for the same shape. R19/R22/R27 touch a door's response contract, so walk them:
   if any tool description or filter-parity census names `description` on the list door, it must
   move with it.

2. **Criterion 1, hops — 97, worth +0.45, and it is purely an evidence gap.**
   A cold deep link measures **3 requests before first paint** (verified today by instrumenting
   the shipped test), but only ONE screen was measured, and the rubric's sentence is about the
   BUSIEST screen. `web/test/cold-screen-hops.test.tsx` already does the hard part.
   **Parameterise it over three more record screens** — tickets, accounts, meetings. If they come
   in at 3–4 the criterion is 100 and the claim stops resting on one screen. If one comes in
   higher, that is a real finding and you report it rather than tuning the test.

## Also available if the two above fall short
- **Criterion 3, overfetch — 90.** `workers/content/src/lib/triage.ts:228` reads the growing
  `work_logs` and filters in JS. Push the predicate into the SQL. Worth ~+0.9. The four
  `notify.ts` minors are on a cron path and are fine — leave them.

## Do NOT try to move these two — both are correct as they are
- **Criterion 4, reuse — 90.** Ten of those points are structural: R38 forbids passing a loaded
  list row down as a detail, because a row past the page cursor reports itself missing. The law
  is right. This criterion cannot reach 100 in this codebase and should not.
- **Criterion 5, no request per row — 85.** The import's one gated write per row buys the audit
  trail and the per-row rejection report. Already scored down from critical to high for that
  reason. Record the decision; do not change it.

## Do not
Touch `shared/ui/`. Deploy. Spend neurons. Change UI. Widen a door's response without walking
R19/R22/R27.

## Report
The ten-criterion table recomputed at your tip with arithmetic; the measured before/after size of
the ticket list payload; the hop count for EVERY screen you parameterised, named; `npm run check`
exit code unpiped with per-workspace lines.
Write `/Users/alaap_kanchwala_apple/kwapso-lanes/REPORT-rt95.md` AND return its full text.
