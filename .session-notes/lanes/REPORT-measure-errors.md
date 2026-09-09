# REPORT — `error_log_review` and `spend_review`, measured at `d2e50c8f`

**Commit:** `d2e50c8f631b19509305d8e199095446b1a678e9` — `fix(merge): six lanes' new checks meet six lanes' moved files`. Verified with `git rev-parse HEAD` in the PRIMARY checkout before anything else; working tree clean.
**Run:** 2026-09-07, read-only, from `/Users/alaap_kanchwala_apple/Desktop/kwapso_cpaa`. No fixes, no branch, no deploy, no model call.
**Prior measurement:** `.session-notes/reviews/6-money-errors-MEASURED.md` at `30102296` (error_log 90, spend 91). Read for the criteria map. **Every criterion re-derived on this tree.**

| review | score | band | prior (`30102296`) | the lane's claim |
|---|---|---|---|---|
| `error_log_review` | **93 / 100** | trustworthy (85–100) | 90 | 96 — **not reproduced** |
| `spend_review` | **94 / 100** | — (gate passed: c1 = 93) | 91 | — |

**Neither reaches 95.** I did not take the lane's 96. Where I land below it is named in the arithmetic and reconciled at the end of Part 1.

---

## The one fact that governs both reviews

**Nothing in this tree is deployed.** Two independent proofs:

```
cf-exec npx wrangler deployments list --name kwapso-{tenancy,realtime,auth,content}-staging
  last code deploys  2026-09-07 06:47 UTC (tenancy, realtime, auth), 08:02 UTC (content, a Secret Change)

TZ=UTC git log --format='%h %cd' --date=iso-local d2e50c8f
  every commit after 30102296 has a committer date of 2026-09-07 07:43 UTC or later
  d2e50c8f itself   2026-09-07 08:34:48 UTC
```

```
cf-exec npx wrangler d1 execute kwapso-core-staging --remote \
  --command "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('cron_heartbeats','error_logs')"
  → [ { "name": "error_logs" } ]        cron_heartbeats DOES NOT EXIST
```

Core migration `0029_cron_heartbeats.sql` has not been applied. So every "after" figure the error lane offered for `team_id` / `user_id` / `request_id` is a **projection derived from call sites**, and I say at each criterion which half I scored.

And the meter says the same thing from the money side:

```
cf-exec node --experimental-transform-types scripts/ai-spend.mjs --days 90
  183 commands · 504 AI units · 1 team · since 2026-06-09
  input 7,194,070 · output 105,145 · cache-read 7,724,103
  COST $14.59   per command $0.0797   per AI unit $0.0290
  busiest days end 2026-09-01
  NOTE 56 of 183 carry no token counts → a FLOOR
```

Byte-identical to the 6 September reading. **No assistant turn has run since.** The two-stage tool split is in `main`, is not deployed, and even if it were, there is nothing in the meter to have measured it with. The token cut has never been observed in money — scored as it is.

---

## Probe overrides (rule 2), with the commands

### `error_log_review` probe

| field | probe said | what the source says | command |
|---|---|---|---|
| `recorders` | `['logError','since','fold','reportError']` | `since` and `fold` are private helpers in `ops-alert.ts` and record nothing. Missing: `recordWorkerError` (**48** sites), `recordSendFailure` (9), `recordGatewayCrash` (2), `recordClientError` (2). So `capture.overall.recorded: 20` is meaningless. | `grep -rn "\brecordWorkerError\s*(" workers shared web web-portal scripts \| grep -v /test/ \| grep -v shared/ui/ \| wc -l` — sentinel first: `grep -rn "export async function logError" shared/` must match, and does (`shared/workers/error-log.ts:121`) |
| `terminalPaths` (60 sampled) | 60 candidates | **31 are in the vendored, hash-pinned `shared/ui/` kit** — ordinary React early returns (`if (row === undefined) return null`) which the probe should exclude the way it excludes tests — plus 1 dev script. 28 are app code. Third run in a row with this defect. | opened all 60 |
| `store.columns` | 12, no `request_id` | the probe reads only `CREATE TABLE` in `0012`; `0020_error_request_id.sql` adds it, and the live table has it | `grep -rn "error_logs" db/core/*.sql` |
| `platform.scheduledHandlerRecords` | `false` | every cron catch on both scheduled handlers calls `recordWorkerError` with a `tickId` | `grep -rn "recordWorkerError(" workers/*/src/index.ts` |
| `boot.migrationsDir` / `migrationFailureHandled` | `false` / `false` | `db/core/` holds 29 migrations; `npm run migrations:check` gates **both** deploy scripts; `applyMigration` records and now NAMES the database that refused | `ls db/core/`, `grep migrations:check package.json` |
| `parity.recordedNearby` | 10 of 165 | proximity-based and unreliable. Replaced with a census of catches in `workers/` + `shared/workers/` whose next 12 lines hold a `console.error` and no recorder, no rethrow → 15 hits, all opened | python census, printed in Part 1 §c1 |

### `spend_review` probe

| field | probe said | what the source says | command |
|---|---|---|---|
| `billed.vendors` | `stripe: 153 calls`, `sms: 17`, `email: 53`, `anthropic: 8` | **Every Stripe and SMS hit, and most email hits, are strings inside `glide/data/*.json`** — legacy customer records, not code. `grep -rni "stripe\|twilio" workers shared` = 12 hits: 3 prose comments about a meeting, 9 a kit icon called `StripeLogo`. `grep -rn "api.anthropic.com\|@anthropic-ai" workers shared web web-portal` = **3 hits, all in data-ops TEST files asserting the provider is NOT called.** | as shown |
| `meterWatch.limitChecks` | 12 files | all 12 are `glide/data/*.json` and `glide/normalised.json` — same defect | `python3 -c` on the probe JSON |
| `amplifiers` | `[]` | a zero on a codebase with three crons is not a pass. Opened all three scheduled handlers by hand, as the rubric requires. Findings in Part 2 §c1. | `sed -n` on `workers/content/src/index.ts` and `workers/tenancy/src/index.ts` |
| `unbounded.uncapped` | 1 (`scripts/walk-mobile.mjs:317`) | correct, and it is a dev script. The real billed census in worker source: 4 `env.AI.run`, 3 Vectorize, 1 Resend door behind 5 `sendEmail` sites, 15 R2 puts. All capped. | `grep -rn "AI.run(\|KNOWLEDGE_INDEX\.\|api.resend.com" workers/*/src shared/workers` |

---

# Part 1 — `error_log_review`: 93 / 100

## What the live store actually holds (OBSERVED, read-only, 2026-09-07)

```
cf-exec npx wrangler d1 execute kwapso-core-staging --remote --command "…" --json

rows              6,719      2026-08-14T08:20:29Z → 2026-09-07T09:00:31Z
sources               7      content 2,754 · realtime 2,022 · slow-door 1,627 ·
                             tenancy 253 · web 47 · data-ops 11 · auth 5
resolved            223      most recent 2026-08-17 (21 days ago)
distinct messages 1,541

slow-door is a MEASUREMENT source, declared in code (MEASUREMENT_SOURCES in
error-log.ts) and announced by the errors door. It carries no stack by design.
EXCEPTION ROWS = 6,719 − 1,627 = 5,092.

              exception rows       %          all rows        %
stack           5,092 / 5,092   100.0%
team_id           531 / 5,092    10.4%     1,784 / 6,719    26.6%
user_id           562 / 5,092    11.0%       562 / 6,719     8.4%
request_id        394 / 5,092     7.7%       394 / 6,719     5.9%

by shape:   cron 2,667 rows — team 343, user 343, request_id 0
            request 2,415 rows — team 188, user 219, request_id 394
            inner 10 rows — none
```

The absolute counts for `user_id` (562) and `request_id` (394) are **identical** to the 6 September reading. Nothing has changed in the store, because nothing has been deployed.

## Scorecard

| # | criterion | method | score | weight | ×w |
|---|---|---|---|---|---|
| 1 | Every failure path can reach the store (**gate**) | coverage | 95 | 16 | 1520 |
| 2 | One durable store, every surface writes to it | coverage | 94 | 14 | 1316 |
| 3 | Startup and boot failures are recorded | coverage | 93 | 11 | 1023 |
| 4 | Outbound integration and credential failures | coverage | 98 | 11 | 1078 |
| 5 | The browser reports too | coverage | 100 | 10 | 1000 |
| 6 | Background and scheduled work reports | coverage | 90 | 9 | 810 |
| 7 | A row is complete and the message is actionable | coverage | 81 | 9 | 729 |
| 8 | What the user saw, the store saw | defect | 75 | 8 | 600 |
| 9 | Recording cannot crash the app or flood the table | defect | 97 | 7 | 679 |
| 10 | Somebody finds out, and the table does not grow forever | coverage | 100 | 5 | 500 |

`Σ = 1520+1316+1023+1078+1000+810+729+600+679+500 = 9,255`
`9,255 / 100 = 92.55` → **93**. Gate: c1 = 95 ≥ 40; `store.present` true. Uncapped.

---

### 1 · reach — 95 (16)

**Row 1, 44/45.** The probe flags 98 terminal of 476 failure points and samples 60. I classified all 60:

| class | n |
|---|---|
| vendored kit `shared/ui/` — React early returns, not failure paths | 31 |
| dev script (`scripts/smoke-mcp.mjs`) | 1 |
| **records** (the recorder sits one line past the probe's window) | 17 |
| **correctly silent**, each with a documented fallback | 10 |
| **should be recorded and is not** | 1 |

The 17 that record: `content/index.ts:829,937`, `data-ops/routes/agent.ts:110`, `tenancy/index.ts:554,588,593,649`, `content/lib/notify.ts:466,556,624` (via `recordSendFailure`), `tenancy/lib/invites.ts:218`, `tenancy/lib/notify.ts:49,70,94`, `tenancy/lib/sharding.ts:438`, `tenancy/lib/teams.ts:80,124`.

The 10 correctly silent: two injected boot-script `catch(_){}` **string literals** in `splash.ts`, the same in `theme-provider.tsx`, `store.ts:335/372` (`patchRow`/`reconcile` → invalidate-and-refetch, CACHING.md), `cron-heartbeat.ts:72` and `error-log.ts:171` (the recorder's own contract — the rubric says explicitly not to penalise this), `knowledge.ts:1367` (documented; the run is recorded, not each chunk), `realtime/index.ts:345,581` (documented degradation, RESILIENCE.md).

Scaled: `98 × (1/60) = 1.63` of 476 → `(476 − 1.63)/476 = 99.66%` → `0.9966 × 45 = 44.8`.

**Then I censused what the probe never flagged**, because a sample of a flagged set is not the failure-path set. Catches in `workers/` and `shared/workers/` whose body prints and neither records nor rethrows: 15 hits. Ten are false positives (`sharding.ts:358` records four lines below my grep window; `teams.ts:202` `throw e`s to the central catch; `google-api.ts:179` rides the `detail` to a recording catch; the rest documented). **Five are real:**

| path | what is lost |
|---|---|
| `shared/workers/retention.ts:136` | a per-table sweep failure is console-only and `SweepReport` carries no failure list, so a table that stopped being swept is invisible to the store |
| `workers/auth/src/routes/google.ts:118` | the whole Google sign-in callback: cause console-only (also c8) |
| `workers/auth/src/lib/email-change.ts:207` | the "your email address was changed" security notice failing |
| `shared/workers/rate-limit.ts:96` | the limiter **fails open** and says so only on the console — abuse protection silently off |
| `workers/auth/src/lib/account-activity.ts:63` | the person's own account-history write failing |

Re-scaled with all five: `(476 − 5.63)/476 = 98.82%` → `0.988 × 45 = 44.5` → **44**. (Rule 5: the smaller true number.)

**Row 2, 16/20.** Three of the five are non-throwing guard/fallback shapes. `rate-limit.ts:96` is the sharpest — "fail open, and say so" is the right policy and the console is the wrong place to say it.
**Row 3, 20/20.** All eight workers and both front doors have a recording last-resort handler: 48 `recordWorkerError`, 2 `recordGatewayCrash`, 2 `recordClientError`.
**Row 4, 15/15.** No terminal path on a money route; `refundAiUnits` records a lost refund.

`44 + 16 + 20 + 15 = 95`.

### 2 · store — 94 (14)

`40/40` one durable, queryable store (`error_logs`, core D1) · `22/25` nine surfaces wired, **seven observed** — `mcp`, `gateway` and `portal-gateway` have recorders and zero rows · `20/20` the browser lands in the same table, 47 `web` rows prove it · **`12/15` there is still no errors screen.** `grep -rn "admin/errors" web web-portal` → 3 hits, **all in `web/test/reachable-screens.test.ts`**, where the dead-end lane added the three doors as `reached: "scripts/errors.mjs"` / `"documents/RUNBOOK.md"` exemptions. That documents the gap; it does not close it. Listing and resolving remain terminal-only.

### 3 · boot — 93 (11)

`35/35` a module-scope throw fails the deploy on Workers — the legitimate answer · **`24/25`** `migrations:check` gates both deploy scripts, `applyMigration` records, and since `86c09d86` the migration robot **names the database that refused** in `failed` and reports `remaining`, so a half-applied run is visible instead of a 500 · **`17/20`** a missing secret is now detected and recorded without a person: `configReport(env, TENANCY_REQUIRED)` → a `cron/config` row, plus `probeWorkerHealth` of auth and realtime over tenancy's own bindings, plus content's self-check off `CONTENT_REQUIRED` on its morning tick. **Not at boot — up to 24 h late**, and `data-ops`, `mcp`, `gateway`, `portal-gateway` are unprobed (the first two answer a health door nothing asks; the reason is written in the source) · **`17/20`** a broken deploy is detectable without a user reporting it, for 4 of the 6 workers with health doors, mailed by the ops digest, 24 h latency.

### 4 · outbound — 98 (11)

**The most improved criterion, and the improvement is real code.**

`33/35` non-2xx recorded: a `GuardError` carries a `detail`, `causeOf` records it, the caller's sentence is unchanged. Docked 2 because `google.ts:118` **returns** instead of throwing, so that one door's non-2xx never reaches a central catch · **`25/25` timeouts recorded distinctly from a bad response** — closed by `44569f3d`: both remaining doors now classify `TimeoutError`/`AbortError` and say *"Cloudflare D1 API did not answer within 15000ms on `<path>` (R11 deadline, attempt 3 of 3)"* against *"could not be reached on `<path>`"*, and the same pair in Resend's name, with the deadline a named constant because the sentence quotes it. Six tests, four mutation-proved. The finding is measurable in the store: **29 live rows say only `"The operation was aborted due to timeout"`** — no service, no call, no deadline · `20/20` 401/403 recorded as a credential problem — Google's 401 names the connection as dead, and **1,821 live rows** say `cloud_key_rejected: the Cloudflare D1 token was refused (Authentication error), it has probably been rotated` · `20/20` the record names the integration, method, path and status.

### 5 · browser — 100 (10)

`window.onerror`, `unhandledrejection`, a recording `ErrorBoundary`, a working beacon transport — all four, both front doors, and 47 live `web` rows prove the transport. `web/lib/use-active-team.ts`'s console-only refresh failure — the one gap on 6 Sep — now calls `reportError("active-team refresh", e)`.

### 6 · background — 90 (9)

`30/30` unattended work records before giving up, now with `tickId(job, scheduledTime)` in `request_id` and `team_id` on the per-team sweep rows · `20/25` no queues; ingest state readable and the digest reports nightly, but nothing **alarms** on depth · **`20/25`** — and this is the one the brief asked me to check.

**Does `0029_cron_heartbeats.sql` and the mutual cron watch do what criterion 6 asks?** The code does, exactly:

- `cron_heartbeats(job, last_run_at, last_ok_at)`, **seeded** at apply time with all three jobs, so a schedule that never fires after a fresh deploy is caught after two periods rather than never.
- `beatCron` is called **last** in each handler, so a tick that died partway leaves no beat. Wired at `content/index.ts:836` (knowledge-sweep), `content/index.ts:944` (morning-digest), `tenancy/index.ts:656` (nightly).
- `reportStaleCrons` is genuinely **mutual**: `tenancy/index.ts:630` and `content/index.ts:881`, each reading all three rows, so either watcher covers the other's jobs. `STALE_AFTER_PERIODS = 2`.
- A stale beat becomes an `error_logs` row naming the job, the worker, when it last fired, and what to check — written so `foldSignature` folds the date and the count into one signature.
- If the table is unreadable, that is itself a row (`cron/watch`), which is the right failure.
- "If every cron dies at once nobody watches the watchers" is stated in the seam's header rather than left to be found.
- `workers/tenancy/test/cron-heartbeat.test.ts` — **16 tests, exit 0**, holding the job list equal to the two wranglers' cron triggers *and* to the migration's seeded rows.

**And it is not live.** `cron_heartbeats` does not exist in `kwapso-core-staging` (query above). On the only environment that runs a cron today, `reportStaleCrons` takes its own catch branch and writes the "could not read `cron_heartbeats`, so no schedule on the estate is being watched" row. A correct, tested control that is one `wrangler d1 migrations apply` from being a control. `20/25`.

`20/20` no fire-and-forget — `afterResponse` → `waitUntil`.

### 7 · row — 81 (9) — the lowest on this review, and the one the brief flagged

**Row 1, 28/40.** OBSERVED and DERIVED disagree, and I scored the observed with a bounded credit for the derived.

- **OBSERVED** (5,092 exception rows): message 100%, stack 100%, place 100%, timestamp 100%, **tenant 10.4%, actor 11.0%, request id 7.7%**. Four of seven fields complete → `(4 + 0.104 + 0.110 + 0.077)/7 = 61.3%` → `24/40`.
- **DERIVED** (this tree): every central catch on all six recording workers passes `requestId(request)` **and** `identityFor(request)`; every cron recorder passes `tickId(job, scheduledTime)`; per-team sweep rows pass `{ teamId }`. Verified at all 48 call sites.
- **The derivation's ceiling is below 100%, and the lane's projection does not say so.** `identityFor` reads a `WeakMap` that `teamContext`/`noteIdentity` fills, so a crash **before** the gate resolves a caller still records neither column. That is exactly the **2,021 realtime `GET /?team= (fence lookup)` rows** — the fence lookup *is* the identity resolution — and every validation or parse crash. And **2,667 of 5,092 exception rows are cron rows**, which have no user at all; those gain a tick id, not an actor.

**I scored 28/40** — four points of credit for a change wired at every call site and locked by tests, and no more, because nothing has been observed and the ceiling is demonstrably not 100%.

**Row 2, 26/30 — and here is the brief's second question, verified.**

Whole store, by opening the messages rather than grepping one phrase:

| message | n | names what failed? |
|---|---|---|
| `Error: Google couldn't answer that just now. Try again.` | 1,991 | **no** — our own user-facing sentence, quoted back at us |
| `cloud_key_rejected: the Cloudflare D1 token was refused (Authentication error)…` | 1,821 | yes |
| `Error: D1_ERROR: no such table: sync_leases: SQLITE_ERROR` | 231 | yes |
| `Cloudflare D1 API failed: Authentication error` | 150 | yes |
| D1 overloaded / storage timeout / network lost (four variants) | 381 | yes |
| `Error: Google wouldn't complete that connection…` | 114 | yes |
| `Something went wrong on our side. Try again.` | 31 | **no** |
| `Script error.` | 7 | **no** |

Non-naming = `1,991 + 31 + 7 = 2,029 / 5,092 = 39.85%` → naming **60.15%**. That is the 39.7% figure, essentially unchanged.

**The lane's claim is CORRECT on the substance and WRONG on one clause.** The 1,991 rows run:

```
SELECT MIN(at), MAX(at), COUNT(*) FROM error_logs WHERE message LIKE 'Error: Google couldn%'
  → 2026-08-21T07:39:05Z  →  2026-08-26T14:46:46Z   n = 1,991
```

A **six-day burst that ended 26 August**, exactly as claimed. Since 28 August: **7 non-naming of 424 rows = 1.65%**, i.e. **98.35% naming**. So 39.7% is a 24-day average dominated by a closed burst, and the lane is right to say so.

Where the lane is wrong: it said the burst was *"already fixed before it started"*. `git log -S causeOf` puts `causeOf` at **`d52c4a20`, 2026-09-05** — generalised across all six central catches at `64ce64f6`, 2026-09-07. That is **ten days after the burst ended**. The burst stopped on its own; the fix arrived later and has six rows of evidence behind it.

So: the average is genuinely stale, the recent rate is genuinely 98%, and the code that would guarantee it is real, locked and unobserved at volume. `26/30`.

**Row 3, 15/15.** Environments separated by database.
**Row 4, 12/15.** `place` carries the route or `cron/<job>` plus team and record ids on sweep rows; `tickId` joins one tick's rows and `request_id` one click's — both derived, neither observed.

`28 + 26 + 15 + 12 = 81`.

### 8 · parity — 75 (8) — where I differ most from the lane

Two findings the prior report did not have. It said so honestly: *"the probe's `recordedNearby` is proximity-based and unreliable… I have not proven the absence of others."* I ran the census it did not, and it found two.

- **`high (−15)` — `workers/auth/src/routes/google.ts:118`.** The Google sign-in callback catches, prints `console.error("google callback failed:", e)`, and **returns** `302 → /login?error=google_failed`. The person sees a failed sign-in; the store sees nothing. An expired Google client secret, a Google outage, or clock skew on the ID-token verification are all invisible. This is the rubric's row-2 shape word for word: *"a toast or error state is rendered from a caught error that is not recorded."*
- **`medium (−7)` — `workers/content/src/lib/knowledge-files.ts:210`.** A file-conversion crash returns the honest note *"We couldn't read this file just now"* — the person is told it failed, which is right — and the **cause is dropped**: nothing in the store says which reader crashed on which file. R42 exists because a reader failure is exactly the fact somebody must be able to act on.
- **`minor (−3)`** — the user-facing and recorded messages cannot be correlated on the **92.3%** of live rows with no `request_id`.

`100 − 15 − 7 − 3 = 75`.

### 9 · safety — 97 (7)

No critical: the recorder cannot throw, every field is capped, the hourly budget rides the INSERT's own `WHERE`. **`minor (−3)`** a rate limit (`MAX_ERROR_LOGS_PER_HOUR = 120` per bucket) but no dedupe at write time.

**Two penalties from 6 September are closed, and I checked the code rather than the claim:**
- the `medium (−7)` for the client beacon storing `location.href` whole: `pageOf()` in `error-log.ts` now returns `${u.origin}${u.pathname}` — query string and fragment gone, with the `?token=` on a sign-in landing named as the reason.
- the `minor (−3)` for a dropped recording being silent: **both** branches now print — the over-ceiling drop names the bucket and the place, the catch names the source and the place. That is the counter the rubric asks for.

### 10 · alerting — 100 (5)

`40` a new signature notifies a person (`ops-alert.ts` mails `fresh` to `ALERT_TO`, wired at `tenancy/src/index.ts`) · `25` a spike notifies (`SPIKE_FACTOR` 3, `SPIKE_FLOOR` 10) · `20` retention stated (`ERROR_LOG_RETENTION_DAYS = 90`) and swept nightly, bounded, reporting its own ceiling · `15` somebody looked: `MAX(resolved_at) = 2026-08-17`, 21 days ago — inside the month, just.

### Reconciling against the lane's 96

| I scored | lane's implied | difference |
|---|---|---|
| c7 = 81 | ~93 (row 1 at the projection, ~38/40) | **−1.08** on the total |
| c8 = 75 | 97 | **−1.76** on the total |

`92.55 + 1.08 + 1.76 = 95.4 → 95`. The lane's 96 is what you get by trusting the projected identity coverage and not censusing the console-only catches. Both of my departures are evidence, not judgement: the store's `user_id` count is still 562 and `google.ts:118` is on disk.

### The one-sentence verdict

**If your Google client secret expires tonight, every Google sign-in fails with `?error=google_failed` on the login screen and nothing in the error store will ever say why.**

---

# Part 2 — `spend_review`: 94 / 100

## Measured on this tree

```
node scripts/measure-preamble.mjs                          (no model call, no spend)
  tools in catalogue  166
  PREAMBLE            135,144 chars   ~35,357 tokens
  STAGE ONE            40,864 chars   ~10,691 tokens   (7 core tools + 3,023 chars of names for 159)
  cut                 69.8%                            on every step of every turn
  trim floor          65,578 chars    (53 of 166 ungated)
```

`STAGE ONE` is **unchanged** from 6 September (40,864 / 10,691), so every per-action figure in COSTS.md still recomputes. `PREAMBLE` has drifted +697 chars (+0.5%) from today's merges, and COSTS.md still quotes the old `134,447 / 35,175` — noted at c10.

Prices from `shared/workers/pricing.ts`, `PRICES_READ_ON = "2026-09-05"`, vendor URLs in COSTS.md §1. **No placeholders.**

Recomputed independently (kimi-k2.6, $0.950/M in, $4.000/M out; `RESULT_CHARS` 2,000 ≈ 523 tokens):

```
one stage-one step   10,691 × $0.950/M = $0.010156  +  400 × $4.000/M = $0.001600  = $0.011756
typical 3-step turn  in (3 × 10,691) + 523×(1+2)  = 33,642 tok × $0.950/M = $0.031960
                     out 3 × 400                  =  1,200 tok × $4.000/M = $0.004800   TURN = $0.0368
worst 12-step turn   in (12 × 10,691) + 523×(1+…+11) = 162,810 tok × $0.950/M = $0.154670
                     out 12 × 400                    =   4,800 tok × $4.000/M = $0.019200  TURN = $0.1739
```

At the owner's standing estimate of 20,000 replies/month (an estimate, not a measurement): `20,000 × $0.0368 = $736/month`.

**And it has never been observed.** The meter reads the same 183 commands and $14.59 it read on 6 September, from turns run 28 Aug – 1 Sep, all on the pre-split shape. Whether or not the split deploys, there is nothing in the meter to have measured it with.

## Scorecard

| # | criterion | method | score | weight | ×w |
|---|---|---|---|---|---|
| 1 | Work is proportional to the trigger (**gate**) | defect | 93 | 15 | 1395 |
| 2 | Nothing bills in an uncapped loop | defect | 94 | 14 | 1316 |
| 3 | Every paid call is inventoried | coverage | 100 | 13 | 1300 |
| 4 | Cost per user action is computed | coverage | 95 | 13 | 1235 |
| 5 | Something watches the meter | coverage | 100 | 12 | 1200 |
| 6 | Scheduled work is priced | coverage | 96 | 9 | 864 |
| 7 | Storage and egress are priced | coverage | 66 | 8 | 528 |
| 8 | Retries and failures are priced | coverage | 100 | 6 | 600 |
| 9 | Each surface has a sourced price | coverage | 100 | 6 | 600 |
| 10 | The numbers are written down and dated | coverage | 92 | 4 | 368 |

`Σ = 1395+1316+1300+1235+1200+864+528+600+600+368 = 9,406`
`9,406 / 100 = 94.06` → **94**. Gate: c1 = 93 ≥ 40. Uncapped.

---

### 1 · amplification — 93 (15) · GATE

Probe returned `amplifiers: []`. **I opened all three scheduled handlers by hand and say so**, per the rubric.

| trigger | what fires it | one firing does | should it |
|---|---|---|---|
| knowledge sweep (`*/15`) | cron | rotating `teamSlice`, `INGEST_SOURCES_PER_TICK = 25`, unchanged text skipped on a content hash **before** any embed call | already incremental — no penalty |
| morning digest (`0 7`) | cron | rotating `teamSlice`; per team, when nobody is on triage duty it emails **every staff member** | work grows with team size, not with what changed |
| nightly (`10 3`) | cron | bounded retention passes, `OWNED_DB_CAP` size check, + 2 service-binding health fetches and one `SELECT … LIMIT 50` (both new, both constant) | proportional — no penalty |

**`medium (−7)`** — the digest fan-out. Bounded by `SEND_FAN_CAP = 100` (extras dropped and named, never silently sent) and priced in COSTS.md §3, which is why it is medium and not high. It also got *smaller* this round: `clientUserIds` now subtracts client logins from the recipient list, so it no longer fans the agency's backlog out to every client contact.

**Closed this round:** `migrateTeams` read **every** ready team with no LIMIT and applied every missing migration with no bound. It is now chunked at `MIGRATE_TEAMS_PER_RUN = 25` with a stated resume (`_migrations` + `schema_version`) and a `failed` list. Operator-triggered rather than scheduled, and D1 writes are cheap, so it was never large money — but it was the one unbounded fan-out over the estate and the shape is now right.

`100 − 7 = 93`.

### 2 · uncapped loops — 94 (14)

Real billed call sites in worker source, after overriding the probe's `glide/data/` vendors: 4 `env.AI.run` (`knowledge.ts:1362`, `model.ts:435,463`, `model-text.ts:72`), 3 Vectorize (`upsert`, `deleteByIds`, `query`), 1 Resend door behind 5 `sendEmail` sites, 15 R2 puts (per-request, not looped). **Every one under a numeric cap** — `EMBED_BATCH`, `EMBED_ATTEMPT_CAP = 5`, `SEND_FAN_CAP = 100`, `CRON_TEAM_CAP`, `INGEST_SOURCES_PER_TICK`.

`minor (−3)` the digest recipient loop is bounded only by team size beneath the fan cap · `minor (−3)` `scripts/walk-mobile.mjs:317`, a dev script with no production cost. `100 − 6 = 94`.

### 3 · inventory — 100 (13)

`35` COSTS.md §1 is the list and CLAUDE.md points at it · `25` each tied to its feature · `20` model choice deliberate and measured — kimi-k2.6, gpt-oss-120b and llama-4-scout priced side by side, bge-m3 for embeddings at `$0.012/M` · `20` **nothing bills from an unknown path**, and I proved it rather than accepting it: 0 Anthropic, 0 Stripe, 0 Twilio in `workers/`, `shared/`, `web/`, `web-portal/`; the only Anthropic strings in the repo outside scripts are three test assertions that the provider is **not** called; §1 row 9 names `scripts/i18n-translate.mjs` and `scripts/kb-bench.mjs` as running on the owner's personal key.

### 4 · peraction — 95 (13)

`35/40` four headline actions costed with the arithmetic shown, and I recomputed the step from the tree's own `STAGE ONE` and `pricing.ts` — it reconciles to the cent. **Docked 5 because the input is a projection**: the meter reads the same pre-split $0.0797/command it read yesterday, so `$0.0368` has never been observed in money and cannot be until turns run on a deployed split. COSTS.md says this plainly in §2 (*"in `main` but not deployed. So $0.1149 is a true measurement of the OLD shape"*), which is why this is 35 and not lower · `25/25` every vendor an action touches · `20/20` a per-tenant month exists · `15/15` the worst case identified and priced (`$0.1739`, the 12-step turn).

This is the criterion that moved most: it was **73** on 6 September because the headline was wrong by 3.4×. `5f3622c8` and `927c1a92` fixed it.

### 5 · meter — 100 (12)

`35` usage checked **before** the work, race-safe — the cap rides the `UPDATE`, per step · `25` an alert fires **before** the limit — `ops-alert.ts` mails `nearQuota` at 80% of the daily allowance, nightly, to `ALERT_TO` · `20` a real per-tenant cap in **both** environments: `AGENT_FREE_DAILY` = 50 production / 2,000 staging, and `AGENT_NO_DAILY_CAP` is gone from staging as of 2026-09-06 · `20` spend visible in money without the vendor dashboard — `scripts/ai-spend.mjs` (run today, works) and the digest's own `spend` line.

### 6 · scheduled — 96 (9)

**`36/40`** COSTS.md §3 gives a per-tick cost for every cron — the knowledge sweep `$0` on a quiet tick, the digest `≤ $0.04/day`, the nightly "under a cent a day". **The nightly's row is now stale**: it says *"plus ≤ 4 bounded SELECTs and at most one digest email"*, and this commit added two service-binding health fetches and one `SELECT … LIMIT 50` to it, plus the same watch to content's morning tick. Both are constant work in fractions of a penny — and unpriced is unpriced · `30/30` frequency justified · `30/30` all three exit cheaply on a quiet tick.

### 7 · storage and egress — 66 (8) — the criterion holding this review down

`25/35` §4 carries a **measured** R2 reading (138 MiB, 368 objects, 1.3% of the 10 GB allowance, every production bucket empty) — a point-in-time measurement, not a per-tenant growth **rate**, though the deactivated-file slope is now derived (25 MB/week → 1.3 GB/year/team) · `25/25` egress understood: R2 charges none · `8/20` **orphans** — `reclaimMedia` handles supersession at the door across nine columns; there is still no orphan sweep, and the fact is written down, which is worth something and is not a control · **`8/20` retention**, down from 10 on 6 September, and here is why:

> COSTS.md §4 asserts **"LIFECYCLE — set, and never by age. `scripts/r2-lifecycle.mjs` applies rules to every bucket."** I checked it against the live account:
> ```
> cf-exec npx wrangler r2 bucket lifecycle list kwapso-media-staging
>   name: Default Multipart Abort Rule   (Cloudflare's own)
> ```
> and against the configs: `grep -c lifecycle workers/*/wrangler.jsonc` = **0**, with the sentinel `grep -c r2_buckets workers/*/wrangler.jsonc` = **10** so the zero is real and not a broken grep. `r2-lifecycle.mjs` exists, is correct, is tested, and **has never been applied to any bucket**. A written claim that a control is set, where it is not, is worth less than the prior report's silence.

`25 + 25 + 8 + 8 = 66`.

### 8 · retries — 100 (6)

`40` every retry bounded by a number in the code — `RETRIES` in `d1-rest.ts`, `EMBED_ATTEMPT_CAP = 5`, and **new this commit** `twice()` on `KNOWLEDGE_INDEX.upsert` and `deleteByIds`, the retry `upsertVectors`'s own doc comment had promised since the day it shipped and the loop under it did not have · `30` no billed operation can retry indefinitely · `30` the failure path is counted, and `refundAiUnits` records a lost refund rather than swallowing it.

### 9 · sourced prices — 100 (6)

Every surface priced from `shared/workers/pricing.ts` with `PRICES_READ_ON = "2026-09-05"` and vendor URLs in §1. **No placeholders.** Three rows (Workers Paid, R2, Durable Objects) come from `~/.claude/skills/cloudflare_usage/references/pricing.md` dated `2026-07` — dated and sourced, which is what the row asks. Free-tier boundaries stated (10,000 neurons/day, 3,000 emails/month, 10 GB R2, 10M stored dims).

### 10 · written down and dated — 92 (4)

`50` the costs live in `documents/COSTS.md` · `30` dated and attributed (*"Written 2026-09-05. Per-action figures revised 2026-09-06"*) · **`12/20`** updated since the change that invalidated it — the 3.4× headline is fixed and the split is described honestly, but three things have gone out of date within a day: (a) the whole-catalogue line reads `134,447 chars (~35,175 tokens)` where this tree measures `135,144 / 35,357`, a 0.5% drift that no per-action figure depends on; (b) §4's lifecycle claim is **false** against the live account; (c) the nightly's two new probes are unpriced in §3.

### The one-sentence verdict

**The most expensive action is a worst-case 12-step assistant turn at `$0.1739`** — arithmetic from `scripts/measure-preamble.mjs` on this tree (10,691 tokens a step) at `shared/workers/pricing.ts` rates read 2026-09-05 — and **not one turn has yet run on the shape that produces it**, so the meter's $0.0797/command remains the only figure anyone has actually been billed.

---

# For every criterion under 100 — what it costs, and the smallest change

## `error_log_review`

| c | score | what it costs | the smallest change that moves it |
|---|---|---|---|
| 1 | 95 | five failure paths print and record nothing; the sharpest is a rate limiter that fails **open** with only a console line, so abuse protection can be off and nothing knows | add a `logError` beside the `console.error` at `shared/workers/rate-limit.ts:96` and `shared/workers/retention.ts:136` (2 lines each; +2 on c1, +0.3 total) |
| 2 | 94 | listing and resolving errors is terminal-only; nobody without a shell can read the store | out of reach as a small change — the doors take an `x-admin-key` no browser can hold. The 3 points are the honest price of that architecture |
| 3 | 93 | a cleared secret is found on the next nightly tick, up to 24 h after the first failed request; `data-ops` and `mcp` answer a health door nothing asks | add `data-ops` and `mcp` service bindings to tenancy and two lines to the `probeWorkerHealth` array (+3 on c3, +0.33 total) |
| 4 | 98 | the Google OAuth callback's non-2xx never reaches a central catch | same one-line fix as c8 below — it moves both |
| 6 | 90 | the cron watch is built, tested and **not applied**: on staging today nothing watches any schedule | `cf-exec npx wrangler d1 migrations apply kwapso-core-staging --remote` (+5 on c6, +0.45 total) — no code change at all |
| 7 | 81 | *whose*, *which tenant*, *which click* are answerable on ~10% of rows; the fix is wired everywhere and observed nowhere | **deploy.** Then re-measure; the fix is already in the tree and locked by tests. Nothing smaller moves this criterion honestly |
| 8 | 75 | a failed Google sign-in shows the person an error and leaves no trace; a crashed file reader tells the person it failed and drops the cause | one `await recordWorkerError(env.DB, "auth", "GET /api/auth/google/callback", e)` before `return back("google_failed")` at `workers/auth/src/routes/google.ts:118` (+15 on c8, +1.2 total — **the single highest-value line on either review**) |
| 9 | 97 | one bad loop writes 120 near-identical rows an hour before the ceiling stops it | a signature column with a `UNIQUE(signature, hour)` on the INSERT; more than a one-liner, and worth only 3 |
| 10 | 100 | — | — |

**Deploy + the one Google line + the migration = 93 → ~96.**

## `spend_review`

| c | score | what it costs | the smallest change that moves it |
|---|---|---|---|
| 1 | 93 | on a morning with nobody on triage duty the digest emails every staff member; work grows with team size | Tier 3 — change the trigger to "only when the backlog changed". Behaviour, and the owner's call. The 7 points are honestly priced |
| 2 | 94 | nothing in production; the two `minor`s are a fan bounded by team size and a dev script | give `scripts/walk-mobile.mjs:317` a `MAX_` (+3 on c2, +0.42 total) |
| 4 | 95 | the headline per-reply price is arithmetic nobody has been billed for | **deploy the split and let ten turns run**, then re-read `scripts/ai-spend.mjs`. No code change |
| 6 | 96 | §3's nightly row understates the tick by two service-binding fetches and a SELECT | one sentence in COSTS.md §3's nightly row (+4 on c6, +0.36 total) |
| 7 | 66 | **the largest single loss on either review — 2.72 points.** A deactivated record's file is kept for ever, no orphan sweep exists, and the doc says a lifecycle control is set when it is not | two moves, in order: (1) delete or correct the "LIFECYCLE — set" bullet, which is one line and buys back 2 of the 20 (+0.16 total); (2) actually run `node scripts/r2-lifecycle.mjs` against the nine buckets — it is written, correct and tested, and running it turns a claim into a control (+6 on c7, +0.48 total). The orphan sweep and the deactivated-bytes decision are the owner's and are worth the remaining 12 |
| 10 | 92 | three figures went stale inside a day | re-run `node scripts/measure-preamble.mjs` and paste the block into §2, fix the lifecycle sentence, add the two probes to §3 (+8 on c10, +0.32 total) |

**The lifecycle sentence + the lifecycle run + the COSTS.md refresh = 94 → ~95.**

---

# Canaries that fired

| canary | why it was run | what it said |
|---|---|---|
| `git rev-parse HEAD` before anything | a measurement of the wrong commit is worthless | `d2e50c8f631b19509305d8e199095446b1a678e9`, tree clean — proceed |
| **a test suite read by exit code and counts, unpiped** | a suite that fails to LOAD reports green | **fired.** `npx vitest run test/cron-heartbeat.test.ts` printed `Test Files 1 failed (1) · Tests no tests` with **EXIT=0**. Cause was my invocation, not the tree — without `--config ../../vitest.workers.config.ts` the `@shared/*` alias is unresolved. Re-run through the workspace script: `npm run test --workspace=kwapso-tenancy` → **74 files, 968 tests, exit 0**; the heartbeat suite alone → **16 passed**. A grep for "fail" would have had me report a red tree |
| sentinel before believing a zero (lifecycle) | a zero is a claim | `grep -c lifecycle workers/*/wrangler.jsonc` = 0 **and** `grep -c r2_buckets` = 10 — file set and grep both work, so the zero is real. Confirmed independently against the live account with `wrangler r2 bucket lifecycle list` |
| sentinel before believing the recorder census | the probe's recorder list has been wrong three runs running | `grep -rn "export async function logError" shared/` matched at `shared/workers/error-log.ts:121` before I trusted any call-site count |
| **`cron_heartbeats` in the live store** | "built and tested" and "live" are the same shape on disk | **fired, and changed a score.** The table does not exist on staging; migration 0029 is unapplied. c6 row 3 would have been 25 on the code alone |
| the AI meter's figures against the prior run | byte-identical output is what "no turns ran" looks like **and** what "the script broke and served a cache" looks like | distinguished: the window opens at `2026-06-09` (recomputed from today, one day later than the prior run's `2026-06-08`) and the busiest-days list ends 2026-09-01. The script ran; there is genuinely no new traffic |
| opening every console-only catch instead of trusting the 12-line grep window | a recorder one line past the window reads as a gap | **fired twice.** `tenancy/lib/sharding.ts:358` records four lines below my window and `tenancy/lib/teams.ts:202` `throw e`s to the central catch. Both would have shipped as false findings; opening the files moved them out |
| `causeOf` dated against the burst | the lane's clause "already fixed before it started" is checkable | **fired.** `git log -S causeOf` → `d52c4a20`, 2026-09-05. The burst ended 2026-08-26. The fix is ten days LATER, not earlier — the substance of the claim survives, the clause does not |

# What I could not measure

1. **Whether the identity fix produces the rows it projects.** It needs a deploy and traffic. The WeakMap ceiling means it will not reach 100%, and the 2,021 realtime fence-lookup rows are the class most likely to stay empty.
2. **Whether the cron watch fires.** `cron_heartbeats` is not applied on staging.
3. **Post-split cost in money.** No turn has run since 1 September on any shape.
4. **Production's error store.** Every row here is staging.
5. **Whether `mcp`, `gateway` and `portal-gateway` really record.** Recorders read and verified in source; none has fired. Forcing one throw on each would settle it.
6. **Whether the nightly ops digest has actually sent.** A successful send leaves no row, so an absence of failures is not proof of delivery.
