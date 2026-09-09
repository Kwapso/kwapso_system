# architecture_review — 94 / 100

At commit `d2e50c8f631b19509305d8e199095446b1a678e9`, measured read-only in the
PRIMARY checkout `/Users/alaap_kanchwala_apple/Desktop/kwapso_cpaa`. HEAD verified
before anything else (`git rev-parse HEAD` → `d2e50c8f6…`). Nothing edited, no
branch, no gate, no deploy, no Cloudflare call.

The prior measurement (`.session-notes/reviews/2-structure-remeasure.md`,
**93** at `30102296`) was read for its criteria map only. Every row below was
re-earned. `30102296` is an ancestor of HEAD (`git merge-base --is-ancestor`,
42 commits between), so this measures a tree that includes it plus the six
merged lanes.

---

## The score

| # | criterion | method | score | weight | product |
|---|---|---|---|---|---|
| 1 | Dependencies point one way | defect | 97 | 16 | 1552 |
| 2 | Blast radius is contained (**GATE**) | coverage | 98 | 18 | 1764 |
| 3 | Every fact has one owner | defect | 100 | 16 | 1600 |
| 4 | A request can be followed end to end | coverage | 87 | 12 | 1044 |
| 5 | Environments match | defect | 93 | 10 | 930 |
| 6 | Live data can be recovered | coverage | 97 | 12 | 1164 |
| 7 | The next module is cheap | coverage | 88 | 10 | 880 |
| 8 | The platform is a choice, not a cage | coverage | 76 | 6 | 456 |

Σ = 1552 + 1764 + 1600 + 1044 + 930 + 1164 + 880 + 456 = **9390**
9390 ÷ 100 = 93.90 → **94**

**Gate:** criterion 2 = 98, far above the 40 floor. No cap. Uncapped = capped = 94.

Per-criterion arithmetic:

- **1 · Direction** — 100 − 3 (one minor) = **97**
- **2 · Blast** — 30 + 18 + 20 + 15 + 15 = **98**
- **3 · Ownership** — no confirmed finding = **100**
- **4 · Traceability** — 30 + 18 + 14 + 15 + 10 = **87**
- **5 · Parity** — 100 − 7 (one medium, clustered) = **93**
- **6 · Recovery** — 30 + 22 + 20 + 15 + 10 = **97**
- **7 · Evolvability** — 30 + 25 + 13 + 10 + 10 = **88**
- **8 · Coupling** — 18 + 20 + 18 + 20 = **76**

### The worst case, stated

**If `kwapso-auth` is down, 0 of 8 workers stop serving — somebody already
signed in keeps working, and nobody new can get in.** Every gated request still
asks who the caller is, and `shared/workers/gating.ts:203`'s catch answers it
from the core database (`sessionFromCore`) when auth cannot. What is lost is
what auth alone can do: signing in, signing out, changing an email, editing a
profile, minting a machine-surface session. **If the CORE DATABASE is down, 8 of
8 stop:** nothing can say who is asking, every gated call returns
`503 auth_unavailable`, and the user sees an app that renders and can do nothing.
Core is the real single point of failure; auth was only ever the visible one.
`documents/RESILIENCE.md` §1 now says exactly this, which is the correction that
moved criterion 2.

---

## Probe fields overridden, and why

The probe (`~/.claude/skills/architecture_review/assets/probe.mjs`) ran clean
(exit 0, 30,513 bytes). Four of its fields are wrong for this repo.

| probe field | probe says | measured | how |
|---|---|---|---|
| `crossServiceCalls.guardedPct` | **46 %** (16 of 35) | **100 %** of production sites | The probe counts `web/test/rules.test.ts:1602` and an import line (`workers/auth/src/routes/internal.ts:2`) as call sites, and decides "guarded" from a text window. Hand-censused every site (command below): 18 production sites, all guarded. |
| `traceability.propagatedHeaders` | **false** | **true**, 9 of 12 seams | The probe looks for one header shape. The id travels three ways: `traceHeaders(id)` spread into an init, `stampTrace(request, id)` at both public doors, and a required `traceId` parameter on `forwardToDoor` (7 call sites). Command below. |
| `sharedWriteTables` | **30 tables** | **4** | The probe attributes `TEAM_MIGRATIONS` DDL under `workers/tenancy/src/team-schema/` to tenancy as a runtime writer, and matches table names inside prose. Independent census below returns exactly the four `RESILIENCE.md` names. |
| `recoverability.restoreScripts` | 10 files incl. `shared/i18n-seed.ts`, `import-plan.ts` | 1 real restore path | Every one of those ten is an *import/seed* path, not a database restore. The real restore is `scripts/backup.mjs` + the two documented `wrangler d1` paths, rehearsed by `workers/auth/test/restore-rehearsal.test.ts`. |

Commands, so each override is recomputable:

```
# guarded census — every production cross-service call site
grep -rn -E "(env|cfg\.env|c\.env)\.(AUTH|TENANCY|CONTENT|DATAOPS|MCP|REALTIME)\.fetch\(" \
  --include="*.ts" workers/ shared/ web/ web-portal/ scripts/ | grep -v "/test/" | grep -v "\.test\.ts"
grep -n "\.fetch(" workers/portal-gateway/src/index.ts      # the dynamic env[upstream] site

# trace propagation
grep -rn "traceHeaders\|stampTrace\|requestId(" --include="*.ts" workers/ shared/ \
  | grep -v "/test/" | grep -v "^shared/workers/trace.ts"

# ownership: writes by component, filtered to tables the schema declares,
# with workers/tenancy/src/team-schema/ (the migration runner) excluded
#   → 4 shared-write tables: error_logs, selectable_data, sprints, users
```

## Overrides of my own first numbers

**I undercounted the traced console sites by more than half, and caught it by
listing them instead of counting them.** My first pass grepped
`requestId\|traceId\|trace` and returned **6 of 86**. Printing the matches showed
eight further sites carrying `tick` — the cron tick id from
`shared/workers/error-log.ts:87` (`tickId(job, scheduledTime)`), which is a
joinable correlation id by construction and is written to the same
`error_logs.request_id` column. True figure: **14 of 86** console sites carry a
joinable id (16 %), not 6 (7 %). Criterion 4's structured-logging row moved on
that correction alone.

**Two zeros proved before being believed.** "No worker imports another worker's
source" and "no front door imports a worker's source" are both load-bearing
claims about criterion 1, and both came back 0. Sentinels fired before I trusted
either: the same pattern finds 859 `@shared/workers` imports inside `workers/`,
and 13 `lib/screens` imports inside `web/`, so the mechanics work; and
`web/test/rules.test.ts` reaches worker source three times by `readFileSync`,
never by import, which is *why* the second zero is zero. Both are true zeros.

**My own SQL census matched prose before I fenced it.** The first run reported 10
shared-write tables including `and`, `carrying`, `rather`, `that`, `the` and
`with` — comments containing the words "UPDATE the …". Filtering against the 88
tables the schema actually declares (`CREATE TABLE` across `db/` plus the team
schema) left exactly 4. `users` (auth 6 / tenancy 6) served as the canary: a
census that stops seeing it means nothing below it counts.

---

## Criterion notes

**1 · Direction — 97.** 0 production cycles. 0 worker-to-worker source imports
(every cross-worker edge is a service binding). 0 front-door imports of worker
source. One upward import survives: `scripts/every-page-has-a-name.mjs:50`
imports `../web/lib/pages.ts` — a smoke script deriving its walk list from the
app's own nav, with a comment explaining that a hand-kept list would narrow its
own coverage and still report PASS. Minor (one file, clear reason), −3.

**2 · Blast — 98** (was 92). Rows in full:
- **30/30 guarded.** 18 production cross-service sites, every one wrapped. The 8
  gateway/portal-gateway pass-throughs sit inside `handle`, which both default
  exports wrap in try/catch (`workers/gateway/src/index.ts:109`).
- **18/20 timeouts.** 10 discretionary hops; 9 carry an `AbortSignal.timeout`
  (5 s identity ceilings ×3, 2 s live-layer, 3 s cosmetic name read, 15 s email,
  5 s `REPORT_HOP_MS` ×3). **One does not:** `recordMaintenanceRefusal`
  (`workers/gateway/src/index.ts:334`), new since the last measurement. It rides
  `ctx.waitUntil`, so it cannot hold a response — but it is the one uncapped
  discretionary hop, and the regression against "all 16 sites capped" is real.
- **20/20 graceful degradation.** Four independent examples: `publishChange`
  swallows and records; `sendBrandedEmail` swallows and records; `resolveNames`
  returns null names rather than failing the agent turn; identity falls back to
  core.
- **15/15 documented SPOF with a stated consequence.** `RESILIENCE.md` §1 is now
  true, and better than true — it records what it used to say, why the false
  sentence was worse than none, and names core as the real SPOF. This is the row
  that moved (was 7/15).
- **15/15 no single non-public component without a fallback.** auth (fan-in 7)
  has `sessionFromCore`; realtime (fan-in 6) degrades by design.
- **New, not scored anywhere:** `cron_heartbeats` (`db/core/0029`) with content's
  morning digest and tenancy's nightly each calling `reportStaleCrons` over the
  whole estate — two watchers on two workers on two schedules. A dead cron is now
  an `error_logs` row in the ops digest. The rubric has no row for it; it belongs
  in the record.

**3 · Ownership — 100.** My own census (declared tables only, migration runner
excluded) returns exactly four shared-write tables: `error_logs`,
`selectable_data`, `sprints`, `users` — precisely the four `RESILIENCE.md` §2
documents, each with a named owner and a stated column split, none of them a
shared field. `cron_heartbeats` is written by ONE seam (`beatCron`) that two
workers call, so it is not a fifth. `workers/tenancy/test/ownership.test.ts`
derives the set both ways off disk, refuses an undocumented shared writer AND a
documented row that stopped being shared, and carries a canary asserting the
walker can still see `users` and still sees >40 tables. Run unpiped:
`npm run test --workspace=kwapso-tenancy -- test/ownership.test.ts
test/cron-heartbeat.test.ts` → **exit 0, 22 passed**.

**4 · Traceability — 87** (was 88).
- **30/30** id minted at both public doors (`stampTrace(request, requestId(request))`
  at `gateway/src/index.ts:108` and `portal-gateway/src/index.ts:253`).
- **18/25** propagation. 12 internal-hop seams; 8 carry the id fully, 1 partially,
  3 not at all. Missing: `publishChange` (`shared/workers/realtime.ts:273`),
  `sendBrandedEmail` (`shared/workers/notify.ts:55`), and — new —
  `recordMaintenanceRefusal` (`gateway/src/index.ts:334`), which is itself an
  error-reporting hop, so its rows land under a fresh ULID. Partial: the client
  beacon's `/me` hop (`front-door.ts:407`) carries no header, though the
  `log-error` post beside it puts the id in the body.
- **14/20** structured logs (was 12). The durable half is complete and now
  *richer*: `recordWorkerError` takes `identityFor(request)`, so every central
  catch stamps request id **plus team plus caller** — six workers, from 0 of
  2,026 staging rows carrying either column. The console half went from 7 % to
  16 % joinable (14 of 86), because the three crons now log their tick id.
  72 console lines still carry nothing to join on.
- **15/15** durable store · **10/10** observability enabled on 8 of 8 workers, in
  both environments.

**5 · Parity — 93.** My own key-diff of all eight wrangler configs (independent
JSONC parser, not the probe) agrees with the probe exactly: no binding, var,
service or Durable Object exists in production and not in staging — the high
severity case is clean, and that is a real result. One medium, clustered: `TEAM_DB_0`
(D1) and `TEAM_DB_0_ID` (var) are staging-only on content, data-ops and tenancy.
Same fact three times, −7 once. Cron counts and `observability.enabled` match on
all eight.

**6 · Recovery — 97.** `scripts/backup.mjs` dumps core + every team database core
points at, **plus every R2 object**, with the bucket as its own inventory and the
databases as a cross-check; an uncovered bucket fails the run.
`web/test/backup-covers-r2.test.ts` derives both halves from source. Restore is
documented two ways (Time Travel; dump reload) and rehearsed **every build** by
`workers/auth/test/restore-rehearsal.test.ts` against every migration on disk —
run unpiped with `session-fallback-matches.test.ts`: **exit 0, 12 passed**. The
remote half was rehearsed against staging on 2026-09-06, both tiers, PASS.
Per-tenant restore is the normal case. What is not backed up is written down, with
`GOOGLE_TOKEN_KEY` named as the one secret that cannot be reissued. −3: **Time
Travel has still never been used**, and the document says so rather than claiming
otherwise.

**7 · Evolvability — 88** (was 87). 30/30 documented path —
`documents/BUILD-A-MODULE.md` names **all 52** laws (`comm -23` on the R-numbers
in `RULES.md` vs `BUILD-A-MODULE.md` returns empty). 25/25 registries and
catalogues (`shared/rules/registry.ts`, `shared/workers/tool-catalog.ts`,
`web/lib/screens.ts`, `web/lib/pages.ts`, import `TARGETS`). **13/20** (was 12):
the file count has not fallen — recent feature commits run 1 to 32 non-test files
and a real module addition is still ~23 — but `web/components` is now **148 files
in 15 module folders with 0 at the root**, so a new module has a named home
rather than a flat pile. 10/15: still no scaffold generator (`scripts/` has only
`gen-icons.mjs`). 10/10 seams named concretely.

**8 · Coupling — 76.** Informational: Cloudflare is a settled decision.
18/35 concentration — team D1, the live layer, email, presigning and images each
go through one seam, but the CORE database has no adapter and is reached raw from
**156 `env.DB.prepare(` sites in 29 files**. 20/25 adapter layer. 18/20 the cost
of moving is written down — `PLATFORMS.md` maps five pillars across eight
providers with a 7-step port method, and admits the core-DB gap; its count is
stale (says 151 sites in 27 files, measured 156 in 29). 20/20 business rules are
testable without the platform runtime — the whole rule suite reads source off
disk under plain vitest, no miniflare. `countedDb` (`shared/workers/timing.ts:380`)
wraps `env.DB` on 4 of the 5 core-DB workers but preserves the D1 shape exactly,
so it is instrumentation, not a port — it is, however, the one chokepoint a future
adapter could occupy.

---

## For every criterion under 100: the cost, and the smallest change

| # | score | what it costs | smallest change that moves it |
|---|---|---|---|
| 1 | 97 | a smoke script is the one edge pointing the wrong way; harmless today, and the shape a real violation would hide behind | move `TEAM_SECTIONS` from `web/lib/pages.ts` into `shared/` and import it from both — deletes the only upward edge (**+0.48** to the total) |
| 2 | 98 | one uncapped hop to auth; a stuck auth holds a `waitUntil` open, and the failing report is the one that cannot be joined | add `signal: AbortSignal.timeout(REPORT_HOP_MS)` to `workers/gateway/src/index.ts:334` (**+0.36**) |
| 4 | 87 | three internal hops write error rows under a fresh ULID, so a failing click's live-layer, email and throttle failures cannot be joined to it | thread the id into the three: `traceHeaders(...)` on `gateway/src/index.ts:334` (free — no signature change), then a `traceId` on `publishChange` / `sendBrandedEmail` carried on `env`/`cfg` rather than 300 call sites (**+0.84** for all three) |
| 5 | 93 | `TEAM_DB_0` exists only on staging, so the native-binding read path has never run in production | either add the production binding or delete the staging one; whichever the owner rules, the diff goes clean (**+0.70**) |
| 6 | 97 | Time Travel is the restore most likely to be reached for and has never been used once | restore one staging team database to a bookmark and record the date in `RESILIENCE.md` § "When the restore was last tested" (**+0.36**) |
| 7 | 88 | a module addition is ~23 non-test files, hand-placed each time | a `scripts/new-module.mjs` writing the table, the permission rows, the worker route stub, the recipe and the test skeleton (**+1.20** if it lands the count in a small predictable set) |
| 8 | 76 | nobody can price a move off Cloudflare accurately, because the core database's 156 raw sites are undercounted in the one document that estimates it | correct `PLATFORMS.md` lines 26 and 61 to 156 sites in 29 files (**+0.12**) — the 35-point concentration row needs a core-DB adapter and is a Tier-3 owner decision |

**Cheapest route to 95**, all Tier 1 or Tier 2, none of them an architecture
decision: criterion 2's missing timeout (+0.36) + `PLATFORMS.md`'s count (+0.12)
+ the three untraced seams (+0.84) = **+1.32 → 95.1 → 95**.

---

## Findings

**A1 · `whoAmI`'s own doc comment still says there is no fallback, twenty lines
above the fallback.** `shared/workers/gating.ts:188` reads *"There is deliberately
NO fallback answer here — no cached identity, no 'assume signed in'."* The
"no cached identity" half is still true and is the point; the first clause is not —
`sessionFromCore` is called from the catch at line 205. `RESILIENCE.md` was
corrected on 6 Sep and this sentence was not, which is the identical defect one
file over from where it was filed. Minutes. `shared/workers/gating.ts`.

**A2 · `recordMaintenanceRefusal` is the one uncapped and the one untraced
cross-service hop, and it is an error-reporting hop.** New since the last
measurement. `workers/gateway/src/index.ts:334`. Minutes.

**A3 · `publishChange` and `sendBrandedEmail` still drop the trace id.** Both take
`env` and no `Request`; the id has to ride `env`/`cfg` rather than 300 call sites.
`shared/workers/realtime.ts`, `shared/workers/notify.ts`. Hours.

**A4 · 72 of 86 console lines carry nothing to join on.** The durable store is
fully joinable and now names team and caller; the console stream is 16 % joinable.
A day.

**A5 · `PLATFORMS.md`'s core-DB count is 5 sites and 2 files stale** (151/27 vs
156/29 measured). It was 3 stale at the last measurement, so it is drifting.
Minutes.

## Canaries that fired

- **The traced-console count.** A `grep -c` said 6 of 86; listing the matches said
  14 of 86. Counting hid a whole class of correlation id (`tick`). Every number in
  criterion 4 is now from a printed list, not a count.
- **The ownership census matched prose.** Ten "shared-write tables" included the
  English words `and`, `the`, `that`, `with`, `rather` and `carrying`. Fencing
  against the 88 declared tables left 4. `users` (auth 6 / tenancy 6) was the
  positive control throughout.
- **Two structural zeros, both proved.** 859 `@shared/workers` imports and 13
  `lib/screens` imports confirmed the grep mechanics before either 0 was believed;
  `web/test/rules.test.ts` reaching worker source by `readFileSync` (3 hits)
  explains why the second zero is zero rather than broken.
- **The wrangler parity diff crashed on a URL.** My first comment-stripper treated
  `//` inside a JSON string as a comment and produced a `SyntaxError` on the second
  config — a stripper that had "worked" on the first. A string-aware stripper then
  reproduced the probe's parity result exactly on all 8 workers (`workers checked: 8`
  printed as its own sentinel).
- **Every test run unpiped and read by exit code.** `kwapso-tenancy`
  ownership + cron-heartbeat → exit 0, 22 passed. `kwapso-auth` restore-rehearsal
  + session-fallback-matches → exit 0, 12 passed.

## The single worst structural risk, in one sentence

**The core database is the one component with no fallback and no adapter: every
worker resolves identity, membership and rights from it, 156 raw `env.DB.prepare`
sites across 29 files reach it with nothing in between, and `RESILIENCE.md` states
the honest boundary itself — if core is down the app is down, and that is the one
outage nothing in the product survives.**
