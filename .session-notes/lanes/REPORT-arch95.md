# REPORT — lane `arch95` · `architecture_review` 94 → 95

**Branch** `fix/architecture-95` · **worktree** `/Users/alaap_kanchwala_apple/kwapso-lanes/arch95`
**Cut from** `origin/main` = `d2e50c8f631b19509305d8e199095446b1a678e9`
**Measured at tip** `61aa0735` (five commits: `134aaf2b`, `5e067b13`, `bd2ef00a`, `97780b10`, `61aa0735`)
**Pushed** `origin/fix/architecture-95`

Every number below was re-earned on this branch. Where the brief or the
independent measurement (`REPORT-measure-architecture.md`) made a claim, I
checked it and say so; two of its claims were incomplete and one probe field
moved for a reason that has nothing to do with the code.

---

## The score

The probe was run at `d2e50c8f` (30,513 bytes, matching the independent
measurement byte for byte — so this worktree reproduces the tree it measured) and
again at the tip `61aa0735`. At the tip it reports `cycles: []`, one layer
violation (`scripts/every-page-has-a-name.mjs:50`), the same three `envParity`
rows, `observabilityEnabled: 8 / workersTotal: 8`, and the same blast-radius
fan-ins (auth 7, realtime 6, content 4, tenancy 4, data-ops 2, mcp 1, both
gateways 0). Two of its fields are overridden, with the mechanism named, below.

| # | criterion | method | weight | **before** | **after** | product after |
|---|---|---|---|---|---|---|
| 1 | Dependencies point one way | defect | 16 | 97 | **97** | 1552 |
| 2 | Blast radius is contained (**GATE**) | coverage | 18 | 98 | **100** | 1800 |
| 3 | Every fact has one owner | defect | 16 | 100 | **100** | 1600 |
| 4 | A request can be followed end to end | coverage | 12 | 87 | **94** | 1128 |
| 5 | Environments match | defect | 10 | 93 | **93** | 930 |
| 6 | Live data can be recovered | coverage | 12 | 97 | **97** | 1164 |
| 7 | The next module is cheap | coverage | 10 | 88 | **88** | 880 |
| 8 | The platform is a choice, not a cage | coverage | 6 | 76 | **78** | 468 |

Σ = 1552 + 1800 + 1600 + 1128 + 930 + 1164 + 880 + 468 = **9522**
9522 ÷ 100 = **95.22 → 95**

**Gate:** criterion 2 = 100, far above the 40 floor. No cap; uncapped = capped = 95.

**Before was 9390 ÷ 100 = 93.90 → 94.** Delta **+1.32**, which is the figure the
independent measurement predicted, arrived at independently:

| change | criterion row moved | arithmetic |
|---|---|---|
| `AbortSignal.timeout` on the one uncapped hop | 2's timeout row 18/20 → 20/20 | +2 × 18/100 = **+0.36** |
| three internal hops keep the request's name | 4's propagation row 18/25 → 25/25 | +7 × 12/100 = **+0.84** |
| `PLATFORMS.md`'s core-DB count corrected **and derived** | 8's "cost of moving is written down" 18/20 → 20/20 | +2 × 6/100 = **+0.12** |
| | | **+1.32 → 95.22** |

Per-criterion arithmetic, in full:

- **1 · Direction** — 100 − 3 (one minor) = **97**
- **2 · Blast** — 30 + 20 + 20 + 15 + 15 = **100** (was 30 + 18 + …)
- **3 · Ownership** — no confirmed finding = **100**
- **4 · Traceability** — 30 + 25 + 14 + 15 + 10 = **94** (was 30 + 18 + 14 + …)
- **5 · Parity** — 100 − 7 (one medium, clustered) = **93**
- **6 · Recovery** — 30 + 22 + 20 + 15 + 10 = **97**
- **7 · Evolvability** — 30 + 25 + 13 + 10 + 10 = **88**
- **8 · Coupling** — 18 + 20 + 20 + 20 = **78** (was 18 + 20 + 18 + 20)

### The worst case, stated

**If `kwapso-auth` is down, 0 of 8 workers stop serving** — somebody already
signed in keeps working, nobody new can get in. Every gated request still asks
who the caller is, and `shared/workers/gating.ts`'s catch answers it from the
core database (`sessionFromCore`) when auth cannot. **If the CORE DATABASE is
down, 8 of 8 stop:** nothing can say who is asking, every gated call returns
`503 auth_unavailable`, and the user sees an app that renders and can do
nothing. Core is the real single point of failure; auth was only ever the
visible one.

---

## What changed, file by file, and why

### 1 · Three internal hops keep the request's name (criterion 4, +0.84)

`db/core/0020` exists so that one failing click is one query in `error_logs`.
Three seams wrote their failure rows under a **fresh ULID**, so the three things
a click can quietly fail at — its live-layer ping, its email, its throttle
refusal — could not be joined to it.

| file | what changed |
|---|---|
| `shared/workers/realtime.ts` | `RealtimeEnv` gains `TRACE?: string`; the publish hop carries `traceHeaders(env.TRACE)`; `note()` writes `requestId: env.TRACE` into `error_logs` and onto its console line |
| `shared/workers/notify.ts` | `MailEnv` gains `TRACE?: string`; same three places |
| `workers/gateway/src/index.ts` | `recordMaintenanceRefusal` takes the request's id, puts it in the body (which is where auth's `/internal/log-error` reads it) **and** on the wire |
| `shared/workers/front-door.ts` | the beacon's `/me` hop — the one report hop carrying the id in its body and not on the wire — now carries both. `REPORT_HOP_MS` exported so the gateway's fourth report hop uses the same number rather than a second `5_000` |
| `workers/{auth,tenancy,content,data-ops}/src/env.ts` | `TRACE?: string` on each worker's `Env`, documented beside `DEFER` |
| `workers/{auth,tenancy,content,data-ops}/src/index.ts` | the per-request shallow copy each dispatcher already builds now carries `TRACE: requestId(request)` |
| `workers/{content,tenancy}/src/index.ts` (`scheduled`) | the crons build the unattended equivalent, `{ ...env, TRACE: tick }`, so the sweep's pings and the nightly's alarm mail join the rest of that tick's rows |

**Not 190 call sites.** Neither seam takes a `Request`; between them they have
186 publish sites (177 `publishChange` + 9 `publishUserChange`, both of which
come through the same `publish`) and 4 `sendBrandedEmail` ones — counted, not
remembered:

```
grep -rnE "publish(User)?Change\(" --include="*.ts" workers/ shared/ \
  | grep -v /test/ | grep -v "\.test\.ts" | grep -v "export async function" \
  | grep -v "^shared/workers/parallel.ts" | wc -l          → 186
grep -rn "sendBrandedEmail(" --include="*.ts" workers/ shared/ \
  | grep -v /test/ | grep -v "\.test\.ts" | grep -v "export async function" | wc -l  → 4
```
 The id rides `env` —
the object every one of those sites already passes — exactly as `DB` and `DEFER`
already do. **Zero call sites changed** (`git diff --stat` below: no file under
`workers/*/src/lib/` or `routes/` is touched).

### 2 · The one uncapped discretionary hop (criterion 2, +0.36)

`recordMaintenanceRefusal` rides `ctx.waitUntil`, so it cannot hold the 429 — but
a stuck auth holds the waitUntil open. It now carries
`signal: AbortSignal.timeout(REPORT_HOP_MS)`, the same five seconds this door's
other three report hops use.

### 3 · `PLATFORMS.md`'s core-database count (criterion 8, +0.12)

`documents/PLATFORMS.md` is the only document that prices a move off Cloudflare,
and the honest half of that price is the core database's raw
`env.DB.prepare(` sites. **The brief said "fix lines 26 and 61". There were
three stale places, not two** — line 51 says
`**151 call sites across 27 production files**` and neither the brief nor the
measurement named it. All three now read 156 / 29.

**And the number is now derived**, in `web/test/doc-claims.test.ts` — the file
whose whole subject is "the docs must agree with the roster on disk". It
recomputes the census by the doc's own published grep, matches each of the three
sentences on its own shape (a reworded sentence goes red rather than quiet), and
carries a tripwire so a collapsed walk cannot satisfy a doc corrected to zero.

### 4 · Finding A1 — `whoAmI`'s doc comment (no points; a correctness fix)

`shared/workers/gating.ts:189` said *"There is deliberately NO fallback answer
here — no cached identity, no 'assume signed in'."* `sessionFromCore` is called
from the catch at **:224** (the brief said :205; the line is 224 on this tree).
Corrected to say what is true, keeping the half that was always the point — no
CACHED identity, and the read is of the same live session row, so an expired
session, a sign-out and a deactivated member are all still refused.

### 5 · RESILIENCE.md's Time Travel line — recorded as a RELAY, and it earns nothing

The brief says the planner rehearsed a bookmark restore on a throwaway staging
database on 7 Sep (67 tables back). **I cannot verify it**: no command output, no
database name, no bookmark. `documents/RESILIENCE.md`'s entire value is that it
refuses to claim what it has not done, so I recorded the relay *as a relay*, in
the provenance style `shared/workers/parallel.ts` already uses, with instructions
to replace it with real numbers and delete the paragraph. **Criterion 6 stays at
97 and this lane claims none of the +0.36 the measurement offered for it.**

### 6 · What I did NOT do — criterion 1's +0.48, and the evidence

The measurement offered +0.48 for moving `TEAM_SECTIONS` out of `web/lib/pages.ts`
into `shared/`, deleting the one upward import. The brief said "only if it is
genuinely small". **It is not.** `TEAM_SECTIONS` is a ~190-line table with an
entangled `NavGroup` type, and six things read `web/lib/pages.ts` **by path** and
parse that table:

```
web/test/rules.test.ts:3649           read(join(WEB, "lib", "pages.ts"))
web/test/rail-groups.test.ts:112      readFileSync(join(__dirname,"..","lib","pages.ts"))
web/test/icon-vocabulary.test.ts:83   read(join(ROOT,"web","lib","pages.ts"))
web/test/icon-vocabulary.test.ts:118  read(join(ROOT,"web","lib","pages.ts"))
scripts/seed-knowledge-about-the-app.mjs:189
scripts/icon-map.mjs:62
shared/rules/registry.ts:955          a rot-checked entry keyed on "web/lib/pages.ts"
```

Moving the table would leave several of those reading a file that no longer holds
it — checks that go **quiet** rather than red, which is the exact failure this
codebase keeps getting caught by. The upward edge is one smoke script deriving
its walk list from the app's own nav on purpose, with a comment saying a
hand-kept list would narrow its coverage and still report PASS. I left it and
scored it as the measurement did: minor, −3.

The **35-point concentration row on criterion 8** needs a core-database adapter.
That is a Tier-3 owner decision (the rubric's own words: "anything that changes a
component's responsibilities"). Left, and said so.

---

## Every claim, with the command that proves it

### The trace id reaches the store on all three hops — by a test, not by reading

Two new files, written **red first** (9 failing assertions on the first run —
gateway 4 of 4, tenancy 5 of 8), then green:

- `workers/tenancy/test/trace-reaches-the-store.test.ts` — 11 tests
- `workers/gateway/test/trace-reaches-the-store.test.ts` — 4 tests

They assert, on each hop: the id reaches the **durable row** (`error_logs.request_id`,
read positionally off `logError`'s own INSERT bind arguments, with the `source`
column asserted beside it so a shifted argument list cannot read as a missing
id); the id reaches the **wire**; the id reaches the **console line**; and an env
**without** one behaves exactly as before (the row still lands, unnamed, and no
empty header is sent). Plus the clause that makes the rest worth anything — a
census off the disk that every dispatcher and both crons actually **set** it,
because a seam nobody feeds is `undefined` in production with a green suite over
it.

```
npm run test --workspace=kwapso-tenancy -- test/trace-reaches-the-store.test.ts
  → EXIT=0, Tests 11 passed (11)
npm run test --workspace=kwapso-gateway -- test/trace-reaches-the-store.test.ts
  → EXIT=0, Tests 4 passed (4)
```

**Mutation-proved, one revert at a time** (each restored afterwards):

| what was removed | result |
|---|---|
| `requestId: env.TRACE` from `realtime.ts`'s `note` | 1 failed / 8 passed |
| `...traceHeaders(env.TRACE)` from `realtime.ts`'s publish init | 1 failed / 8 passed |
| the id from `realtime.ts`'s `note` **console line** | 1 failed / 10 passed |
| `requestId: env.TRACE` from `notify.ts`'s `note` | 1 failed / 8 passed |
| the id from `notify.ts`'s `note` **console line** | 1 failed / 10 passed |
| `TRACE: requestId(request)` from tenancy's dispatcher | 1 failed / 8 passed |
| …and `{ ...env, TRACE: tick }` from tenancy's cron | 2 failed / 7 passed |
| `requestId: traceId` from the gateway's report body | 2 failed / 2 passed |
| `signal: AbortSignal.timeout(REPORT_HOP_MS)` | 1 failed / 3 passed |
| `...traceHeaders(traceId)` from the report headers | 2 failed / 2 passed |
| — all restored — | **EXIT=0, 11 and 4 passed** |

(The differing denominators are because the file grew: the first five mutations
were run against the 8-test version, the last two console ones against the
11-test version. The cron-census and console-line assertions were written
alongside their fixes rather than red-first, so each is proved here by mutation
instead — which is the stronger of the two, not a substitute I am glossing over.)

### Every internal-hop seam carries the id — derived, 13 of 13

Each seam's own source read around its call expression, looking for
`traceHeaders(`, `requestId: …`, or `stampTrace(`:

```
CARRIES  gateway door (mint+stamp)          workers/gateway/src/index.ts:109
CARRIES  portal-gateway door (mint+stamp)   workers/portal-gateway/src/index.ts:253
CARRIES  forwardToDoor seam (x7)            shared/workers/http.ts:101
CARRIES  gating whoAmI                      shared/workers/gating.ts:215
CARRIES  realtime worker whoAmI             workers/realtime/src/index.ts:473
CARRIES  mcp bridge mcp-session             workers/mcp/src/lib/bridge.ts:109
CARRIES  data-ops resolveNames              workers/data-ops/src/lib/agent.ts:742
CARRIES  front-door /me                     shared/workers/front-door.ts:420   ← was partial
CARRIES  front-door beacon log-error        shared/workers/front-door.ts:452
CARRIES  front-door crash log-error         shared/workers/front-door.ts:502
CARRIES  realtime publish                   shared/workers/realtime.ts:297     ← was DROPS
CARRIES  notify send-email                  shared/workers/notify.ts:73        ← was DROPS
CARRIES  gateway maintenance refusal        workers/gateway/src/index.ts:353   ← was DROPS

13 of 13 internal-hop seams carry the id
```

**A canary fired inside this very census.** My first pass used a ±30-line window
and reported `mcp bridge` and `front-door beacon log-error` as DROPS. Both carry
the id 16 and 18 lines below the call — outside the window, inside the call
expression. The instrument was wrong, not the code; the window was sized to the
call expression and both came back CARRIES. Printed, not counted.

### Every cross-service call is guarded, and every discretionary hop is capped

Hand-censused, because the probe counts a comment line and an import line as call
sites (below). 19 production seams, each read:

```
guarded  —       gateway /api/auth/*        pass-through   (index.ts:139)
guarded  —       gateway /api/tenancy/*     pass-through   (index.ts:140)
guarded  —       gateway /api/content/*     pass-through   (index.ts:142)
guarded  —       gateway /api/data-ops/*    pass-through   (index.ts:143)
guarded  —       gateway /api/mcp/*         pass-through   (index.ts:146)
guarded  —       gateway /mcp               pass-through   (index.ts:147)
guarded  —       gateway /api/realtime      pass-through   (index.ts:149)
guarded  —       portal-gateway allow-list  pass-through   (index.ts:288)
guarded  capped  gateway maintenance refusal report        (index.ts:353)  ← the fix
guarded  capped  gating whoAmI (identity)                  (gating.ts:215)
guarded  capped  realtime-worker whoAmI (identity)         (index.ts:473)
guarded  capped  mcp bridge mcp-session                    (bridge.ts:109)
guarded  capped  data-ops resolveNames (cosmetic)          (agent.ts:742)
guarded  capped  front-door /me (beacon identity)          (front-door.ts:420)
guarded  capped  front-door beacon log-error               (front-door.ts:452)
guarded  capped  front-door gateway-crash log-error        (front-door.ts:502)
guarded  capped  realtime publish (live ping)              (realtime.ts:297)
guarded  capped  notify send-email                         (notify.ts:73)
[seam]   capped  forwardToDoor — guarded at all 7 callers  (http.ts:101)
```

The eight pass-throughs forward the caller's own request and sit inside `handle`,
which both default exports wrap in try/catch. They are not discretionary hops, so
a ceiling is not the right question for them. `forwardToDoor` has no try/catch of
its own; all seven call sites wrap it **and** pass a `timeoutMs` — verified
individually (`staff.ts:45` 30s, `mcp/tools.ts:543` caller-set,
`data-ops/tools.ts:1047` 120s, `import.ts:136` 30s, `import-batch.ts:187` 30s,
`agent.ts:314` and `:359` 30s).

**Every discretionary hop is now capped.** Before this branch, exactly one was
not.

### `PLATFORMS.md`'s count — measured two ways, and mutation-proved

```
grep -rn "env\.DB\.prepare(" --include='*.ts' workers/ shared/ | grep -v test | wc -l   → 156
grep -rln "env\.DB\.prepare(" --include='*.ts' workers/ shared/ | grep -v test | wc -l  → 29
# repo-wide, path-based test exclusion instead of grep -v test:                          → 156 in 29
```

Both filters agree at this commit, which is the canary: the doc publishes
`grep -v test`, and the new check implements exactly that (it filters the whole
`path:line:text`, not just the path).

Mutation-proved — putting `151` / `27` back:

```
the pillar-1 table row: says 151, the source has 156
the paragraph that admits core has no adapter: says 151, the source has 156
the paragraph that admits core has no adapter: says 27, the source has 29
the port estimate: says 151, the source has 156
→ EXIT=1, Tests 1 failed | 8 passed
restored → EXIT=0, Tests 9 passed (9)
```

The drift record, from `git log` and the prior review note rather than invented:
the doc has said 151/27 since it was written (`git log -p --follow` on it shows
no other value); the previous architecture measurement recorded 154/28
(`.session-notes/reviews/2-structure-remeasure.md:136`, which lives in the
PRIMARY checkout — that folder is git-ignored and is not in this worktree); this
measurement 156/29. **One direction only, and invisible to
anybody reading the sentence.**

### Finding A1, confirmed on this tree

```
grep -n "There is deliberately NO fallback\|return await sessionFromCore" shared/workers/gating.ts
189: * There is deliberately NO fallback answer here — no cached identity, no
224:      return await sessionFromCore(request, env)
```

Nothing else in the repo quoted that sentence (`grep -rn "no cached identity\|NO fallback\|assume signed in"` over `*.ts` and `*.md`, excluding the file itself → no output), so correcting it broke no check that reads comments.

---

## Probe fields overridden, and why

The probe ran clean (exit 0, 30,509 bytes). Four fields are wrong for this repo;
two of them are wrong **because of this branch**, which is worth stating plainly.

| probe field | probe says | measured | why the probe is wrong |
|---|---|---|---|
| `crossServiceCalls.guardedPct` | **43 %** (15/35) — and it was 46 % *before* this branch | **100 %** of 19 production seams | The probe's guard test is a **±500-CHARACTER text window** around each `env.X` mention. My documenting comment above `recordMaintenanceRefusal` pushed that site's own `.catch(() => null)` and its new `AbortSignal.timeout` out of the window, so **adding a timeout made the probe's number go down**. It also counts a COMMENT line (`gateway/src/index.ts:245`) and an IMPORT line (`auth/src/routes/internal.ts:2`) as call sites, and `web/test/rules.test.ts:1602`. |
| `traceability.propagatedHeaders` | `false` → **`true`** | **true**, on real evidence | It flipped for the wrong reason: the field is `/headers[\s\S]{0,80}(x-request-id\|…)/` over every code file joined, and my new gateway **test file** contains `init.headers?.["x-request-id"]`. Production code uses `traceHeaders(id)` and never the literal. True by the 13-of-13 census above, not by this. |
| `sharedWriteTables` | 30 tables (`help`, `apps`, `meetings`, …) | **4** | It attributes `TEAM_MIGRATIONS` DDL under `workers/tenancy/src/team-schema/` to tenancy as a runtime writer and counts `scripts/`. The fenced census (declared tables only, migration runner excluded) returns `error_logs`, `selectable_data`, `sprints`, `users` — precisely `RESILIENCE.md` §2, and `workers/tenancy/test/ownership.test.ts` derives it both ways off disk: **EXIT=0, 22 passed**. |
| `recoverability.restoreScripts` | 10 files incl. `shared/i18n-seed.ts`, `import-plan.ts` | **1** real restore path | Every one is an import/seed path. The real restore is `scripts/backup.mjs` + the two documented `wrangler d1` paths, rehearsed every build by `workers/auth/test/restore-rehearsal.test.ts`: **EXIT=0, 12 passed**. |

Fields I did **not** override, because they are right: `cycles: []`,
`layerViolations` (one, `scripts → web`), `envParity` (the same three
`TEAM_DB_0` rows my own read of the configs finds), `observabilityEnabled: 8 /
workersTotal: 8` (each config carries `"enabled": true` twice — production and
staging — on all eight).

---

## `npm run check`

```
cd /Users/alaap_kanchwala_apple/kwapso-lanes/arch95
npm run check > /tmp/gate6.log 2>&1; echo "GATE6 EXIT=$?"
→ GATE6 EXIT=0
```

**EXIT=0, unpiped**, at `61aa0735`, on a machine at load 43–54. Itemised per
workspace, not summed by eye:

| workspace | Test Files | Tests |
|---|---|---|
| kwapso-auth | 20 passed (20) | 218 passed (218) |
| kwapso-tenancy | 75 passed (75) | 979 passed (979) |
| kwapso-content | 79 passed, 1 skipped (80) | 1032 passed, 3 skipped (1035) |
| kwapso-data-ops | 38 passed (38) | 412 passed (412) |
| kwapso-mcp | 13 passed (13) | 601 passed (601) |
| kwapso-realtime | 5 passed (5) | 90 passed (90) |
| kwapso-gateway | 11 passed (11) | 99 passed (99) |
| kwapso-portal-gateway | 2 passed (2) | 48 passed (48) |
| kwapso-web | 115 passed (115) | 953 passed, 8 skipped (961) |
| kwapso-portal-web | 10 passed (10) | 93 passed (93) |

Against `origin/main`'s own figures this branch adds **15 tests** — 4 in
kwapso-gateway (95 → 99), 11 in kwapso-tenancy (968 → 979) — and **1** in
kwapso-web (952 → 953, the derived `PLATFORMS.md` count). The three skipped
kwapso-content tests and the eight skipped kwapso-web ones are the worktree's
usual absence of `glide/normalised.json` and `web/out`; totals match a primary
checkout, only passed/skipped moves.

`npm run lint` (oxlint) → EXIT=0 on its own as well.

`npm run lang:check` → **EXIT=0**, `OK: 1963 strings, shared/i18n-strings.json is
current`; `en + de, es, ca`, nothing to prune. This branch adds no user-visible
English, so `TRANSLATION_CEILING` is untouched. **`scripts/i18n-translate.mjs`
was never run.**

### One thing I had to fix to get there, measured before I touched it

`web/test/dead-exports.test.ts` ran `new RegExp(\bNAME\b)` for every
(export × file) pair — roughly 800 × 1,400 — and timed out against vitest's
20-second default. **Measured both ways before changing anything:**

```
WITH this branch's two new test files:     25.6s, 33.0s, 59.3s   (3 of 3 over 20s)
WITHOUT them (files moved aside):          15.7s PASS, 58.5s FAIL (1 of 2 over 20s)
```

So it exceeds the default **with and without** this branch; my two files move the
median up rather than cause it. It failed as a **timeout**, which is the one
failure that says nothing about the codebase, and it starved the time-sensitive
suites sharing its pool while it ran.

Replaced with a one-pass token index that is a deliberate **superset** of what
the regex can match, so no assertion changes meaning: `\bNAME\b` can only match
where NAME is a maximal run of word characters or a `$`-delimited run inside one
(`$` is not a word character, so it makes a boundary) — both are indexed; a name
containing `$` skips the index and is scanned exactly as before (there are none
today; the fallback exists so the index cannot become wrong if there is). The
20-second default is now a stated 120 seconds, as a decision rather than an
inheritance. **Measured after: 5.7s – 14.1s.** Its own ratchet is the positive
control — `DEAD_EXPORT_OK`'s one entry must still come back an orphan, so a
matcher that started answering "used" to everything fails there.

### And the second thing: the web suite's stopwatch, moved where it was measured wrong

**Five consecutive `npm run check` runs failed on FOUR DIFFERENT web test files**
— `splash`, `cold-screen-hops`, `table-header-sorts`, `wrapped-strings` — every
one a **20-second timeout**, and every one passing when run alone (splash 5 of 5,
`cold-screen-hops` 4 of 4 in a quiet moment). None of their import graphs touches
a file on this branch: my changes are `shared/workers/*`, `workers/*/src`,
`documents/*` and test files; those four are screen renderers and source scans.

What was actually happening, measured rather than guessed:

```
uptime → load averages: 47.82 52.77 45.46 … 62.99 57.01 55.83
ps     → 20 to 33 concurrent vitest/tsc processes from the run's other lanes
web suite's own report → transform 115.34s, environment 820.02s, for tests
                         that read files and render components
cold-screen-hops alone → transform 20.8s / 47.5s
```

That is esbuild and jsdom starved of CPU. So `web/vitest.config.ts`'s
`testTimeout` moves **20s → 60s** — and this is not a new idea I imported: the
line's own comment records that it was **5s** until three tests
(`table-header-sorts`, `splash`, `knowledge-ceiling`) went red on the stopwatch
in one night, and it carries the argument verbatim — *"a gate that goes red when
nothing is wrong teaches people to re-run until green, and then the real red gets
the same treatment."* The same measurement, taken again on a busier machine. It
still does not hide a hang: a hung test never finishes, so it fails at 60s
exactly as it failed at 5s.

**The two sibling configs stay at 20s.** `vitest.workers.config.ts` and
`web-portal/vitest.config.ts` did not fail once across those five runs, and a
ceiling should move where it has been measured wrong and nowhere else.

---

## Files touched

```
documents/PLATFORMS.md                            |  26 ++-   3 stale counts → derived + the drift record
web/vitest.config.ts                              |  41 +-    the stopwatch moves 20s → 60s, measured
documents/RESILIENCE.md                           |  37 +++-  Time Travel relay, recorded AS a relay
shared/workers/front-door.ts                      |  21 +-    /me hop traced; REPORT_HOP_MS exported
shared/workers/gating.ts                          |  16 +-    finding A1: the comment says what is true
shared/workers/notify.ts                          |  27 +-    MailEnv.TRACE → header, row, console line
shared/workers/realtime.ts                        |  34 +-    RealtimeEnv.TRACE → header, row, console line
web/test/dead-exports.test.ts                     |  52 ++-   token index + a stated timeout
web/test/doc-claims.test.ts                       |  83 +++   PLATFORMS.md's core-DB count, derived
workers/auth/src/env.ts                           |  14 ++    TRACE?: string
workers/auth/src/index.ts                         |   4 +-    dispatcher sets TRACE
workers/content/src/env.ts                        |  14 ++
workers/content/src/index.ts                      |  20 +-    dispatcher + the knowledge sweep's tick
workers/data-ops/src/env.ts                       |  14 ++
workers/data-ops/src/index.ts                     |   8 +-
workers/gateway/src/index.ts                      |  35 +-    maintenance refusal: name + ceiling
workers/gateway/test/trace-reaches-the-store.test.ts  |  91 +++  NEW
workers/tenancy/src/env.ts                        |  14 ++
workers/tenancy/src/index.ts                      |  18 +-    dispatcher + the nightly's tick
workers/tenancy/test/trace-reaches-the-store.test.ts | 240 +++  NEW
20 files changed, 754 insertions(+), 60 deletions(-)
```

**No file under `workers/*/src/lib/` or `workers/*/src/routes/` is touched** —
that is the evidence that 190 call sites did not change.

---

## UI, UX and business logic — what the owner must be told

**Nothing changed in any of the three.** No screen, no copy, no route, no gate,
no permission, no schema, no SQL. Every behavioural change is on a
**best-effort failure path** that already swallowed its own errors:

1. Three internal hops now send one extra HTTP header (`x-request-id`) and write
   one extra column (`error_logs.request_id`) **when they fail**. The success
   path is byte-identical.
2. Two console lines gained the id as their second argument.
3. One hop that could hang for ever now gives up after five seconds. It rides
   `ctx.waitUntil` and its result is already discarded, so nothing a person sees
   can change.

**No deploy. No neurons. No secret read. No Cloudflare write.** One read-only
Cloudflare attempt was made — `wrangler deploy --dry-run` on all eight workers,
to catch the bundle-time class of failure `npm run check` cannot see — and
`cf-exec` refused because a worktree is not in the account registry. I did not
work around it. Instead I proved the class is empty: **this branch introduces no
new module specifier anywhere.** `@shared/workers/front-door` and
`@shared/workers/trace` were already imported by the gateway; `./trace` is a
relative import of a file two sibling files in the same folder already import
that way; and `trace.ts`'s only dependency (`./id`) already reaches
`realtime.ts` through `error-log.ts`.

---

## What I could not move, and the honest reason

| criterion | left at | why |
|---|---|---|
| 1 (97) | −3 | The `TEAM_SECTIONS` move would blind six path-based readers of `web/lib/pages.ts` (listed above) — checks that go quiet, not red. Not "genuinely small". |
| 5 (93) | −7 | `TEAM_DB_0` is staging-only on three workers. Adding it to production or deleting it from staging is the owner's ruling about a live binding, not a lane's. |
| 6 (97) | −3 | Time Travel has never been rehearsed by anybody who has written in `RESILIENCE.md`. The 7 Sep rehearsal was relayed and I could not verify it, so it is recorded as a relay and scored as nothing. |
| 7 (88) | −12 | A `scripts/new-module.mjs` scaffold is real new code (the measurement's own +1.20, "if it lands the count in a small predictable set") and a module-shape decision. Out of this brief. |
| 8 (78) | −22 | The 35-point concentration row needs a **core-database adapter**: 156 raw `env.DB.prepare(` sites in 29 files, with `countedDb` (`shared/workers/timing.ts`) as the one chokepoint a future adapter could occupy. Tier 3 — an owner decision, recommended not taken. |

## The single worst structural risk, in one sentence

**The core database is still the one component with no fallback and no adapter:
every worker resolves identity, membership and rights from it, 156 raw
`env.DB.prepare` sites across 29 files reach it with nothing in between, and
`RESILIENCE.md` states the honest boundary itself — if core is down the app is
down, and that is the one outage nothing in the product survives.**
