# BRIEF — lane `errors` · branch `fix/error-log-95` · worktree `~/kwapso-lanes/errors`

Read `/Users/alaap_kanchwala_apple/kwapso-lanes/LANE-COMMON.md` first and obey it.

## Goal
`error_log_review` from 90 to ≥95, measured fresh with its SKILL.md. Start from
`.session-notes/reviews/6-money-errors-MEASURED.md` Part 2 — the ten-criterion scorecard and the
live-store census (read-only against `kwapso-core-staging` via `cf-exec npx wrangler d1
execute … --remote`).

## Where the points are (≈ +8.8 available; you need +4.6)
- **Crit 7 row complete & actionable = 68, weight 9 — the big one.** On the live store:
  `team_id` on 13.0% of rows, `user_id` 10.5%, `request_id` 7.4%, and **"try again" is the
  message on 39.7% of exception rows**. Every request already carries a trace id
  (`stampTrace`, `forwardToDoor`) and most carry a guard with team + user — stamp all three on
  every row the recorder can see them for (one seam, `logError`/`recordWorkerError`, not 45
  call sites). Replace "try again" with the cause: `GuardError` now carries `detail` — surface
  the detail's sentence in the row's message (never the user's), name the door and the
  operation. Measure the four percentages before and after on staging.
- **Crit 6 background & scheduled = 83, weight 9.** Every cron, sweep, digest and backfill
  records a failure with the job's name and the tick it was on; the report says which do not.
- **Crit 4 outbound = 88.** A timeout and a 500 read the same to the caller — make the
  caller's sentence distinguish them (one word is enough), keep the detail.
- **Crit 9 recording cannot crash or flood = 87.** The per-hour cap exists; close whatever the
  report names (a recorder that can throw, a bucket that is per-person).
- **Crit 3 boot = 89.** The health door names what is missing but "nothing polls it, so a
  person still has to ask" — a scheduled probe (an existing cron tick, not a new worker) that
  records a row when any worker reports itself misconfigured.
- **Crit 1 = 96.** `web/lib/use-active-team.ts:200` is console-only — record it.
- **Crit 2 = 94, "no screen".** The owner ruled the error log is his alone (`adminGuard` +
  `x-admin-key`; a browser screen would hand out the key). Leave it; say so.
- **The slow-door rows carry no stack by design** (265 rows, all `source=slow-door`). Make the
  store say that at the source level so "stack missing" stops reading as a defect.

## Do not
Deploy. Change UI. Touch `shared/ui/`. Spend neurons. Write to the live store except through
the app's own recorders.

## Report
The ten-row table recomputed at your tip; the four percentages before/after with the query;
the list of background jobs and what each now records; every recorder change with its test.
