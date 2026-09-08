# BRIEF — lane `speed` · branch `fix/speed-95` · worktree `~/kwapso-lanes/speed`

Read `/Users/alaap_kanchwala_apple/kwapso-lanes/LANE-COMMON.md` first and obey it.

## Goal
TWO scores to ≥95, measured fresh on your branch tip with their SKILL.md:
`speed_review` (now 92) and `round_trip_review` (now 89). Start from
`.session-notes/reviews/3-speed-remeasure-30102296.md` — both scorecards are in it, with
arithmetic. Every point below is a criterion in that file.

## speed_review — where the 8 points are
- **Crit 3 bulk = 60, weight 13 — the big one (+5.2 available).** Twelve product bulk paths;
  7 chunked, 4 resumable, "five of twelve still process everything in one go". Find all twelve
  (the report names the shape; census the source: imports, sweeps, digests, backfills, the
  knowledge sync, reclaim, retention). Give every one a declared chunk size from
  `shared/workers/limits.ts` (said in a comment) and a resume point (a checkpoint row or
  cursor the next run reads), partial failure defined per row, progress visible where a
  person waits. Reuse the import's wave/checkpoint seam — do not invent a second one.
- **Crit 5 writes = 93.** Ticket create is 8 trips in 5 waves, 1,570ms against a 250ms budget.
  Fewer waves (batch the preflight checks into one statement, or one `d1ExecScript`).
- **Crit 2 reads = 97.** 61 product reads whose WHERE does not lead with an indexed column —
  open them, check the PLAN (`EXPLAIN QUERY PLAN` through the REST door against staging), index
  the ones that scan a growing table. A migration in `team-schema/migrations.ts` ONLY (never
  the CREATE TABLE — "duplicate column name, 539 red tests").
- **Crit 9 deferral = 93.** Whatever still blocks a response on deferrable work.

## round_trip_review — where the 6 points are
- **Crit 1 hops = 67, weight 15.** A cold deep link (from an email, R30) costs **14 requests
  before first paint**: boot 2 (`auth.me` + `tenancy.active`) + prewarm 4 + `useScreenData` 1
  + activity feed 1 + module list 1 + process-detail's own 5. Bands: 13+ = 0 pts, 9–12 = 10
  (scored), 6–8 = 20, ≤5 = 25. Get to ≤8, ideally ≤5: one boot call that answers me+active
  team together (or `tenancy.active` folded into the session answer), prewarm AFTER first
  paint, the screen's own reads in one wave, process-detail's five cold reads collapsed.
  **AND write the client half of the hop budget**: `MAX_D1_TRIPS_PER_DOOR` is door→database;
  add a browser→server budget in `limits.ts` (reasoned) with a test that COUNTS the cold
  path's fetches (render the shell cold with a fetch spy, assert ≤ budget; mutation-proved).
  That row alone is +8 of 20.
- **Crit 3 overfetch = 90.** `workers/content/src/lib/triage.ts:228` filters the growing
  `work_logs` in JS — push the predicate into SQL. `notify.ts` ×4 on the cron path.
- **Crit 8 payload = 80, weight 6.** Find the reads whose payload is wider than the screen.
- **Leave alone, owner's rulings:** crit 4 (R38, read by id) and crit 5 (the import's one
  gated write per row buys the audit trail).

## The alarm and the who-am-I door (owner approved both)
- `shared/workers/timing.ts` counts trips only on the REST door (`beginD1Timing` hangs its
  array on the D1 config). The auth worker uses **native `env.DB.prepare` 37×, REST 0×**, so
  every auth line prints "0 D1 trips, 0 rows" and misdirects. Make native core-DB trips
  count (a per-request counted wrapper around `env.DB` handed in through the same
  `{...env}` copy the dispatcher already builds; label with `labelFor(sql)`). Prove with a test.
- `/api/auth/me` measured ~280ms vs a 100ms read budget, 116 breaches in 3 hours on a cold
  staging. Measure it (Node-run worker code against staging core — see
  `scripts/speed-bench.mjs` and the memory `run-shipped-worker-code-in-node`), then cut it:
  one statement for session+user, no redundant reads, nothing awaited that can be deferred.
- Decide from data whether staging deserves a per-environment read budget (cold isolates);
  if so, derive it from the environment in `budgetFor`, reasoned, and say so in the report.

## Do not
Deploy anything. Change UI. Touch `shared/ui/`. Spend neurons. Read `web/lib/live-*` conflict
handling (another lane owns last-save-wins).

## Report
Both criteria tables recomputed at your tip; every hop count measured (say how); every
index with its before/after PLAN; the bulk-path table (12 rows: chunk size, resume point).
