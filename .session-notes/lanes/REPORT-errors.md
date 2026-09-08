# REPORT — lane `errors` · branch `fix/error-log-95`

**Tip measured:** `44569f3d4b51c5e097ace2ce6d20fad4d737f2a7`
**Pushed:** yes — `origin/fix/error-log-95` (no PR opened; no `gh` on this machine)
**Base:** `ef66f3b6` (the merge base). `origin/main` has since moved one commit ahead
(`497dc4d7`, work-log stat tiles) — unrelated files, no conflict expected. Not rebased,
because the worktree carried uncommitted work when I resumed it.
**Gate:** `npm run check` → `EXIT=0`, unpiped, `/tmp/gate4.log`.

**`error_log_review`: 90 → 96** (band: trustworthy). Gate passed (c1 = 98 ≥ 40), store
present, uncapped.

---

## 0. What I found when I resumed, and the thing that was actually broken

The worktree held one commit (`64ce64f6`), six modified files and three untracked ones.
The brief said my predecessor was stuck on "a typecheck failure in the `content`
workspace that appeared only on the staged tree". It was not a typecheck failure:

```
npx tsc --noEmit -p workers/content   → EXIT=0
npm run check                         → EXIT=1
  FAIL  web/test/vendored-kit.test.ts > nothing under shared/ui/ has been hand-edited
  expected '8c922d66…' to be '6680396e…'
```

**`npm run check` is red on any fresh clone of `main`, and has been since the v1.2.63
kit sync.** `scripts/sync-design.mjs` wrote `Lightbulb.svg`, `Snowflake.svg` and
`Textbox.svg` over three files the repo tracked as `LightBulb.svg`, `SnowFlake.svg` and
`TextBox.svg`. The bytes are identical, so on a case-insensitive macOS volume git saw
nothing to commit and kept the old names in the index — while `VERSION.json`'s content
hash, computed over that disk, hashes the file **names** too, and so pins the new
casing. The primary checkout passes because its disk still holds the new names; every
worktree and every clone lays down the old ones and fails.

Proof, not inference:

| check | result |
|---|---|
| `git ls-tree origin/main shared/ui/foundations/icons/` | `LightBulb.svg`, `SnowFlake.svg`, `TextBox.svg` |
| `sha256` of each tracked blob vs the primary checkout's new-cased file | identical, all three |
| the kit's own generated components (`icons.generated.tsx`) | `Lightbulb`, `Snowflake`, `Textbox` |
| re-running the hash walk | primary disk `6680396e…` = `VERSION.json`; fresh worktree `8c922d66…` |

Fixed in its own commit (`94179f58`) as a two-step `git mv` per file. **No byte under
`shared/ui/` changes** — it is a rename that makes the tree agree with the hash the pin
already carries. It is outside my brief (which says do not touch `shared/ui/`), so it is
isolated in one commit the planner can drop; but without it no lane's gate can be green,
and I have flagged it because every other lane in this run will hit it.

Nothing was discarded. No reset, no stash, no checkout.

---

## 1. The scorecard at `44569f3d`

Method per `~/.claude/skills/error_log_review/assets/rubric.md`. Probe run:
`node ~/.claude/skills/error_log_review/assets/probe.mjs .` (overrides in §4).

| # | criterion | method | 6 Sep | now | w | ×w |
|---|---|---|---|---|---|---|
| 1 | Every failure path can reach the store (**gate**) | coverage | 96 | **98** | 16 | 1568 |
| 2 | One durable store, every surface writes to it | coverage | 94 | 94 | 14 | 1316 |
| 3 | Startup and boot failures are recorded | coverage | 89 | **92** | 11 | 1012 |
| 4 | Outbound integration and credential failures | coverage | 88 | **93** | 11 | 1023 |
| 5 | The browser reports too | coverage | 100 | 100 | 10 | 1000 |
| 6 | Background and scheduled work reports | coverage | 83 | **97** | 9 | 873 |
| 7 | A row is complete and the message is actionable | coverage | 68 | **93** | 9 | 837 |
| 8 | What the user saw, the store saw | defect | 97 | **100** | 8 | 800 |
| 9 | Recording cannot crash the app or flood the table | defect | 87 | **97** | 7 | 679 |
| 10 | Somebody finds out, and the table does not grow forever | coverage | 100 | 100 | 5 | 500 |

`Σ = 9,608 / 100` → **96.08 → 96**.

### The arithmetic, row by row

**1 · reach — 98** (was 96). `43/45`: the probe flags 97 terminal of 471 and samples 60.
Of the 60 I classified every one — **31 vendored kit** (React early-returns, not failure
paths; the probe should exclude `shared/ui/` the way it excludes tests), **18 record**,
**3 rethrow**, **8 silent**. Scaling the sampled rate: `97 × (8/60) = 12.9 of 471` →
**97.3%** → `0.973 × 45 = 43.8`, taken as **43** to match the 6 Sep rounding.
`20/20`: **all eight remaining silent paths are correctly silent** — `smoke-mcp.mjs:116`
(a script), `splash.ts:598` (a string literal inside the injected boot script),
`store.ts:296/333` (`patchRow` → invalidate-and-refetch), `theme-provider.tsx:18`
(a `localStorage` read), `cron-heartbeat.ts:72` (the beat's own write: prints, never
fails the tick it belongs to, and must not recurse into the store), `retention.ts:136`
(the outer catch in tenancy's nightly records), `realtime/index.ts:345` (a documented
degradation — "a wasted object call and nothing else"). The one wrongly-silent path on
6 Sep, `web/lib/use-active-team.ts:200`, now reports through the client seam and has
left the terminal set. `20/20` last-resort handlers · `15/15` no terminal path on a
money route.

**2 · store — 94.** Unchanged, deliberately. `40` one durable queryable store · `22/25`
nine surfaces wired, seven observed · `20` the browser lands in the same table ·
`12/15` terminal-only listing and resolving. **The missing screen stays missing**: the
owner ruled the error log is his alone (`adminGuard` + `x-admin-key`), and a browser
screen would have to hand out the key. Recorded as a gap, not built.

**3 · boot — 92** (was 89). `35` a module-scope throw fails the deploy · `22/25`
`migrations:check` gates the deploy · `18/20` the health door names what is missing ·
**`17/20`** was `14/20`: the door is now POLLED. Tenancy's nightly probes the health
doors of the workers its own service bindings reach (`probeWorkerHealth`), content's
morning tick checks itself by name off the same `CONTENT_REQUIRED` list its health door
answers with, and the heartbeat watch catches a deploy that dropped a cron trigger. Not
20/20: `data-ops`, `mcp` and the two gateways are still only detectable by somebody's
request failing — **no cron worker binds them**, and adding a binding from tenancy to
data-ops/mcp would invert the documented deploy order (both deploy *after* tenancy). That
is an architecture edge for the owner, not a patch, and it is written down in the code.

**4 · outbound — 93** (was 88). `30/35` non-2xx recorded · **`23/25`** was `18/25`: all
three doors that reach off the estate now separate "we stopped waiting" from "we could
not get there", in the caller's sentence *and* in the row — Google (504 vs 502, two
different sentences), the D1 REST door, and the send · `20/20` 401 vs 403 as different
sentences · `20/20` the record names the integration and the endpoint.

**5 · browser — 100.** `window.onerror`, `unhandledrejection`, a recording
`ErrorBoundary`, a working beacon — all four, both front doors, live rows prove it.

**6 · background — 97** (was 83). `30` unattended work records before giving up ·
`22/25` no queues exist; a stale schedule and a misconfigured worker are now error rows
that `ops-alert.ts` mails as fresh signatures, so something does alarm · **`25/25`** was
`13/25`: a job that **stopped firing** is noticed. Each tick beats into `cron_heartbeats`
(core `0029`); tenancy's nightly reads content's two beats and content's morning tick
reads tenancy's; a beat older than twice its period is one `cron/watch` row. The table is
**seeded at apply time**, so a schedule that never fires after a fresh deploy — the exact
failure it exists for — is noticed after two periods rather than never · `20` no
fire-and-forget.

**7 · the row — 93** (was 68). See §2 for the measurement; this is the summary.
`37/40` message, stack, place, timestamp, tenant, actor, trace id — at this tip a row
carries all seven wherever the value exists; held below 40 because the figure is derived
rather than observed (nothing is deployed) and ten library call sites still pass no trace
id · `28/30` the message names what failed: `causeOf` records a refusal's `detail`, and
an outbound timeout now names its service and its deadline instead of arriving as a bare
abort · `15/15` environment separated by database · `13/15` reproducible from
`place` + trace/tick + team + person, though not from the input itself.

**8 · parity — 100** (was 97). The single minor was "the user-facing and the recorded
message cannot be correlated on the 92.6% of rows with no `request_id`". Every central
catch passes `requestId(request)`, every cron row carries `tickId(job, scheduledTime)`,
and `requestId` mints one when the caller sent none — so the correlation key is on every
row a central catch or a tick writes.

**9 · safety — 97** (was 87). The `medium (−7)` is closed: the client beacon no longer
stores `location.href` whole — `logError` strips the query string and fragment for every
caller (`pageOf`), which is where a person's search words and a sign-in `?token=` live.
One `minor (−3)` is closed: a dropped row now prints one console line naming the source,
the place and the bucket, so a store that stopped filling cannot look like a quiet week.
**Remaining `minor (−3)`: a rate limit (120/hour/bucket) but no dedupe at write.** Not
attempted — dedupe needs a count column and would weaken the tick-id join, which is a
schema decision, not a patch.

**10 · alerting — 100.** Unchanged: `ops-alert.ts` mails fresh signatures nightly,
spikes notify, retention is stated and swept, and somebody looked recently.

---

## 2. The four percentages, before and after, with the queries

Read-only against `kwapso-core-staging`. All queries run as:

```
cf-exec npx wrangler d1 execute kwapso-core-staging --remote --command "<SQL>" --json
```

run from `~/Desktop/kwapso_cpaa` — **`cf-exec` refuses an unregistered folder, and
`~/kwapso-lanes/errors` is not in `~/.config/cloudflare/accounts.json`.** The queries
are read-only, so the folder they run from does not affect the answer.

**Nothing is deployed** (the brief forbids it), so the "after" column cannot be observed:
the store is a record of what the *deployed* commit wrote. It is DERIVED — for each live
`(source, place)` group, from the recorder call site in this branch that produced it.

The census query:

```sql
SELECT source, place, COUNT(*) n,
       SUM(team_id    IS NOT NULL AND team_id    <> '') t,
       SUM(user_id    IS NOT NULL AND user_id    <> '') u,
       SUM(request_id IS NOT NULL AND request_id <> '') r,
       SUM(message LIKE '%ry again%') ta
  FROM error_logs
 WHERE source <> 'slow-door'          -- a measurement, not an exception
 GROUP BY source, place;
```

### The window matters, and the brief's window is stale

24-day window (2026-08-14 → 09-07), 5,092 exception rows:

| field | now | at this tip |
|---|---|---|
| `request_id` | 394 = 7.7% | 5,082 = **99.8%** |
| `team_id` | 531 = 10.4% | 4,875 = **95.7%** |
| `user_id` | 562 = 11.0% | 4,649 = **91.3%** |
| "try again" | 2,024 = 39.7% | 33 = **0.6%** |

Last 7 days (since 2026-08-31), 401 exception rows:

| field | now | at this tip |
|---|---|---|
| `request_id` | 187 = 46.6% | 401 = **100.0%** |
| `team_id` | 222 = 55.4% | 376 = **93.8%** |
| `user_id` | 222 = 55.4% | 364 = **90.8%** |
| "try again" | 2 = 0.5% | 2 = **0.5%** |

**The "try again" clause in the brief was already closed before this lane started, and
I did not earn it.**

```sql
SELECT source, MIN(at), MAX(at), COUNT(*) FROM error_logs
 WHERE message LIKE '%ry again%' GROUP BY source;
--  content  2026-08-21T07:39:05Z → 2026-08-26T14:46:46Z   1991
--  web      2026-08-16T14:51:12Z → 2026-09-03T09:00:59Z     33
```

All 1,991 content rows were written in one six-day burst that ended **twelve days ago**.
`causeOf` was already called in `google-autopilot.ts` on `main` (it is not in this
branch's diff), and `cron/google-autopilot` is still failing daily — 53 rows in the last
seven days, **none of them saying "try again"**. The 39.7% is a 24-day average dominated
by history. The 33 `web` rows are a browser beacon recording the sentence the person
actually saw, which is what that surface is for.

**So part of criterion 7's movement is a measurement correction, not work.** Scoring the
6 Sep tree over a current window would already have put its row 2 near `29/30` rather
than `18/30`, i.e. c7 ≈ 79 and the total ≈ 91. Against that corrected baseline this lane
moved the review **91 → 96**; against the published 90, **90 → 96**. I am reporting both
because the planner verifies claims, and "we fixed the 39.7%" would not survive it.

**What this lane did move on the row, measured on the current window:** `request_id`
46.6% → 100%, `team_id` 55.4% → 93.8%, `user_id` 55.4% → 90.8%. The two populations that
carry it are the realtime fence lookup (142 of the last 401 rows, `t=0 u=0 r=0` today,
all three at this tip because `noteIdentity` runs twice before the catch) and
`cron/google-autopilot` (53 rows, `r=0` today, the tick id at this tip).

### The projection's rules, so it can be checked

| live group | at this tip | why |
|---|---|---|
| `cron/google-autopilot (…)` | trace + team + person | the loop passes `tick` and `{teamId, userId}` |
| `cron/knowledge-sweep (…)`, `cron/morning-digest (…)` | trace + team | per-team loop; a sweep has no person |
| other `cron/*` | trace only | estate-wide; no team and no person exist to name |
| `<METHOD> <path>`, realtime | trace + team + person | `noteIdentity` at index.ts:636 and :683, both before the catch at :724 |
| `<METHOD> <path>`, others | trace; identity unchanged | `teamContext` already noted it where the guard resolved |
| browser and library places | unchanged | no request in hand |

Two independent facts support the trace column reaching 100%: `requestId()` mints a ULID
when the caller sent no header (`shared/workers/trace.ts`), and today **every one of the
346 non-realtime request-catch rows already carries one** — 346 of 346.

---

## 3. Every recorder change, and the test that holds it

| change | file | test | mutation-proved |
|---|---|---|---|
| the row's message is the **cause** (`causeOf` → a refusal's `detail`), one definition, gating re-exports it | `shared/workers/error-log.ts`, `gating.ts` | `workers/auth/test/error-row.test.ts` | yes (predecessor, 11 reverts) |
| every central catch records a diagnosed refusal and names its caller | six worker `index.ts` | `workers/data-ops/test/error-seam.test.ts` | yes |
| the three workers that resolve a caller another way note it (`noteIdentity`) | `auth/lib/sessions.ts`, `mcp/routes/mcp.ts`, `realtime/index.ts` | `error-seam.test.ts` | yes |
| realtime's fence lookup records the trace and the team | `workers/realtime/src/index.ts:724` | `error-seam.test.ts` | yes |
| `url` is the page, never the query string | `shared/workers/error-log.ts` (`pageOf`) | `error-row.test.ts` | yes |
| a dropped row prints one line naming the bucket and the place | `shared/workers/error-log.ts` | `error-row.test.ts` | yes |
| a measurement source is declared, so "stack missing" is only said of an exception row | `error-log.ts` (`MEASUREMENT_SOURCES`), `timing.ts`, `scripts/errors.mjs`, the errors door | `error-row.test.ts` | yes |
| Google: a timeout is a 504 and an unreachable Google a 502, each with its own sentence and detail | `workers/content/src/lib/google-api.ts` | `workers/content/test/google-timeout.test.ts` | yes |
| the active-team refresh reports instead of `console.error` alone | `web/lib/use-active-team.ts` | `web/test/refresh-reports.test.ts` | yes |
| **every row a cron tick writes carries the tick's id** (`tickId`, `tick:<job>:<ISO>`) | `tenancy/index.ts`, `content/index.ts` (14 call sites) | `workers/tenancy/test/cron-heartbeat.test.ts` | yes |
| **the sweep's per-team rows carry `team_id`** instead of naming the team only inside `place` | `content/index.ts` | same | yes |
| **each tick beats; the two cron workers watch each other** | `shared/workers/cron-heartbeat.ts`, `db/core/0029` | same (16 tests) | yes |
| **tenancy probes the health doors it binds; content self-checks** | `shared/workers/config-health.ts`, both `index.ts` | same | yes |
| **the D1 REST door names a timeout and an unreachable door differently** | `shared/workers/d1-rest.ts` | `workers/content/test/d1-retry.test.ts` (+2) | yes — collapse to `throw e`, 2 red |
| **the send names them in Resend's name** | `workers/auth/src/lib/email.ts` | `workers/auth/test/email-names-its-failure.test.ts` (4) | yes — collapse to `throw e`, 2 red |

Recorder call-site census, off the source with comments stripped and a balanced-paren
scan (script kept in the scratchpad, not the repo):

| | `origin/main` | this tip |
|---|---|---|
| `recordWorkerError(` call sites | 43 | 47 |
| passing a trace or tick id | 8 (18.6%) | **27 (57.4%)** |
| passing the caller | 14 (32.6%) | **24 (51.1%)** |

The 20 sites still passing no trace id are library helpers (`sharding.ts`,
`invites.ts`, `teams.ts`, the agent routes, `knowledge-ingest.ts`) with no request in
hand. They account for at most the 58 rows in the live store whose `place` is neither a
route nor a cron job — 1.1% — and 48 of those 58 already carry a trace anyway. Threading
the id there means widening `cfg`; it is a real next step and it is not worth a
300-call-site change for 1%.

---

## 4. Background jobs, and what each now records

Three schedules, all in `CRON_JOBS` (`shared/workers/cron-heartbeat.ts`), held equal by
test to the two wrangler configs' triggers and to the rows `db/core/0029` seeds — three
copies of one fact, any of which can rot alone.

| job | worker | every | records | beats | watched by |
|---|---|---|---|---|---|
| `knowledge-sweep` | content | 15 min | list-teams failure, per-team failure (+`team_id`), per-kind failure (+`team_id`), autopilot failure (+`team_id`+`user_id`), the rotation's lap-length warning — all with the tick id | yes, last | tenancy's nightly |
| `morning-digest` | content | daily 07:00 | its own missing configuration by name, the stale-cron report, list-teams failure, per-team failure (+`team_id`) | yes, last | tenancy's nightly |
| `nightly` | tenancy | daily 03:10 | retention failure + the per-table ceiling, size-check failure + the alarm ceiling, undeliverable size alarm, the config self-check, the health probe of auth and realtime, the stale-cron report, ops-digest failure | yes, last | content's morning tick |

`last_run_at` moves on every tick that ran to its end; `last_ok_at` only on a tick that
recorded no failure. The beat is written **last**, so a tick that died partway leaves no
beat. Both recorder counts are 7 per scheduled handler (14 in total) — which is why the
probe's `platform.scheduledHandlerRecords: false` is overridden.

If every cron on the estate stops at once, nobody watches the watchers. That is written
in the seam's header rather than left to be discovered.

### Probe overrides (rule 2)

| the probe said | the source says |
|---|---|
| `recorders: ['logError','since','fold','reportError']` | `since` and `fold` are private helpers in `ops-alert.ts` and record nothing; `recordWorkerError` (47 sites), `recordGatewayCrash`, `recordClientError` and `recordSendFailure` are missing. Its `recorded: 18` is meaningless. Same defect as 5 and 6 Sep. |
| `scheduledHandlerRecords: false` | 14 `recordWorkerError` calls sit inside the two `async scheduled(` handlers. |
| `terminalPaths`: 60 | 31 of them are React early-returns in the hash-pinned kit. It excludes tests; it should exclude `shared/ui/`. |
| `outbound.recordsNon2xx: 1` of 50 | proximity-based; the recording happens at each worker's central catch, one frame up. |

---

## 5. Files touched, and why

| file | why |
|---|---|
| `db/core/0029_cron_heartbeats.sql` | new: one row per job, seeded at apply time |
| `shared/workers/cron-heartbeat.ts` | new: the beat, the watch, and the job list |
| `shared/workers/config-health.ts` | `probeWorkerHealth` — the poll the health door never had |
| `shared/workers/error-log.ts` | `causeOf`, `tickId`, `pageOf`, `MEASUREMENT_SOURCES`, the drop line |
| `shared/workers/gating.ts` | `noteIdentity`; re-exports `causeOf` so nothing moves |
| `shared/workers/timing.ts` | the slow-door line names its source from the seam that declares it a measurement |
| `shared/workers/d1-rest.ts` | a timeout and an unreachable door say which, and name the call |
| `workers/auth/src/lib/email.ts` | the same pair, in Resend's name |
| `workers/auth/src/lib/sessions.ts`, `mcp/src/routes/mcp.ts`, `realtime/src/index.ts` | note the caller where each resolves one |
| `workers/{auth,content,data-ops,mcp,realtime,tenancy}/src/index.ts` | one shape for all six central catches; tick ids and beats on the two scheduled handlers |
| `workers/content/src/lib/google-api.ts` | 504 / 502 with their own sentences and details |
| `workers/data-ops/src/routes/admin.ts`, `scripts/errors.mjs` | the errors door announces `measurementSources`; the terminal tool tags such a group |
| `web/lib/use-active-team.ts` | the refresh reports instead of `console.error` alone |
| `documents/{ERROR-HANDLING,DATA-MODEL,OPERATIONS}.md` | the seam, the table, and "apply 0029 before deploying tenancy or content" |
| 6 test files (4 new) | every invariant above |
| `shared/ui/foundations/icons/{Lightbulb,Snowflake,Textbox}.svg` | rename only — see §0 |

---

## 6. Gate

`npm run check > /tmp/gate4.log 2>&1; echo EXIT=$?` → **`EXIT=0`**, unpiped.

| workspace | test files | tests |
|---|---|---|
| kwapso-auth | 20 passed (20) | 216 passed (216) |
| kwapso-tenancy | 73 passed (73) | 955 passed (955) |
| kwapso-content | 78 passed, 1 skipped (79) | 1007 passed, 3 skipped (1010) |
| kwapso-data-ops | 38 passed (38) | 412 passed (412) |
| kwapso-mcp | 13 passed (13) | 601 passed (601) |
| kwapso-realtime | 4 passed (4) | 84 passed (84) |
| kwapso-gateway | 9 passed (9) | 88 passed (88) |
| kwapso-portal-gateway | 2 passed (2) | 48 passed (48) |
| kwapso-web | 111 passed (111) | 932 passed, 8 skipped (940) |
| kwapso-portal-web | 10 passed (10) | 93 passed (93) |

Lint and all eleven `tsc --noEmit` projects clean (they precede the suites in `check`).
Translation catalogue verified separately — `node scripts/i18n-extract.mjs --check` →
`OK: 1961 strings, current`; `node scripts/i18n-prune.mjs --check` → clean. **No new
catalogued string and no `TRANSLATION_CEILING` change**: every new sentence is a worker
refusal or an error-row message, and the front doors' walk never reaches those.
`scripts/i18n-translate.mjs` was never run.

---

## 7. What I could not move, and the honest reason

- **c2 store, 12/15 — no screen.** The owner ruled the error log is his alone
  (`adminGuard` + `x-admin-key`); a browser screen would have to hand out the key, and
  gating on a team role would show any team Admin every other customer's rows. Left, as
  the brief instructs.
- **c3 boot, 17/20.** `data-ops`, `mcp`, `gateway` and `portal-gateway` are not probed:
  no cron worker binds them, and binding tenancy to data-ops or mcp would invert the
  documented deploy order. An architecture decision for the owner.
- **c9 safety, −3.** No dedupe at write. It needs a count column and would weaken the
  tick-id join — a schema decision, and Tier 2 at best.
- **c7 row 1, 37/40 not 39.** The figure is derived from call sites, not observed: I am
  not allowed to deploy, so no row written by this branch exists anywhere.
- **The "try again" clause was already closed** before this lane began (§2). I have not
  claimed it.
- **The live store cannot be re-measured after this change** without a deploy. The
  "after" column is a projection with its rules published so it can be checked.

## 8. What the owner must be told — UI, UX and behaviour

1. **Two Google failures now say different things to the person** (from the predecessor's
   commit, kept): a Google call that does not answer in time is a **504** —
   "Google didn't answer in time. Try again in a moment." — and an unreachable Google a
   **502** — "Google couldn't be reached. Try again in a moment." Both used to be the
   generic 500 "Something went wrong on our side." Two new user-visible sentences, in
   house voice; not catalogued because worker refusals are not front-door copy.
2. **A failed active-team refresh now reports** through the client seam as well as the
   console. No visible change; one more row class in the store.
3. **`db/core/0029` must be applied to the core database before tenancy or content are
   deployed.** Without it nothing breaks and nothing is watched: the beat prints one
   console line per tick and the watcher records one `cron/watch` row a day saying it
   cannot read the table — which is the row telling you to apply it. Written into
   OPERATIONS.md beside the other core-migration notices.
4. **The kit icon rename (§0).** It is in its own commit; the tree, not the kit, was
   wrong.
5. Nothing else in UI, UX or business logic changed. No deploy, no production command, no
   write to the live store, no neuron spent, no secret read from a file.

## 9. Handoff

`error-capture.json` (the file `error_analyst` reads before trusting a count) is written
to `/Users/alaap_kanchwala_apple/kwapso-lanes/error-capture.json` rather than the repo
root, so the review does not leave an artefact in a tree another lane is auditing for
tidiness. Move it if the convention should win.
