# REPORT — independent measurement of `first_run` and `scaling` at `d2e50c8f`

**`first_run_review` — 94 / 100**
**`scaling_review` — 88 / 100**

Measured read-only in the primary checkout, `git rev-parse HEAD` verified as
`d2e50c8f631b19509305d8e199095446b1a678e9` before anything was read. Nothing was
written to the repository, no branch, no gate, no deploy, no neuron spend. Two
Cloudflare reads were made through `cf-exec` (both GETs, both recorded below).

**Headline for the planner: one claim confirmed, one refuted, and one ceiling that
is not a ceiling.**

| lane claim | my finding |
|---|---|
| `first_run` = **94** | **confirmed, 94** — same arithmetic, independently re-derived |
| `first_run` ceiling costs **6.4 points** | **REFUTED — it is 5.6.** The lane's own Σ line proves 5.6 and contradicts its own headline |
| `first_run` cannot reach 95 | **REFUTED.** Either owner ruling reversed *on its own* clears 95 (97 or 96). They are not jointly necessary |
| `scaling` = **90** | **REFUTED — 88.** Four dimensions over-scored; each refutation is proved below |
| `scaling` presigned signal = 1 | **REFUTED — 0**, proved at the infrastructure: the credential is on neither environment |
| `scaling` dim 1 is arguably N/A → 93 | **REFUTED.** The rubric's N/A clause is structural, not commercial. And on my numbers the N/A total would be 91, not 93 |

Note on comparability: `d2e50c8f` is **not** either lane's measured tip. It is the
merge of six lanes plus a merge-resolution commit. `e2723a33` (first-run) and
`30102296` (both priors) are ancestors, verified with `git merge-base
--is-ancestor`. The lean lane moved most of `web/components/` into per-module
folders after the first-run lane measured, so every path below is this tree's.

---

# PART 1 · `first_run_review` — 94 / 100

## The scorecard

| # | criterion | wt | score | working (recomputable) |
|---|---|---|---|---|
| 1 | Nothing needs a human to seed it | 16 | **97** | 100 − 3 (minor: a fresh *environment's* first team needs an operator holding `ADMIN_KEY`). A new **team** is fully self-seeding — see below. |
| 2 | Every empty screen says what to do next | 15 | **100** | 45×(23/23)=45 · +25 pressable · +20 landing screen · +10 wording. Lenient reading; strict reading below. |
| 3 | Nothing blanks or crashes on zero rows | 13 | **100** | 100 − 0. Five probe candidates, all five opened and all five explicitly guarded. |
| 4 | First useful outcome inside five minutes | 12 | **80** | 40 (7/7 import targets + generic screen, linked) + 30 (step count) + **0/20 — OWNER-BLOCKED** + 10. |
| 5 | Sign-up to first screen has no dead end | 11 | **100** | 35 + 25 + 20 + 20. Every branch, including teamless and wrong-door, has a forward action. |
| 6 | Every empty screen says something at all | 10 | **100** | 60×1.0 (all ten probe-"unguarded" files re-opened here) + 25 + 15. |
| 7 | Everything required has a default | 9 | **100** | 40 + 30 + 30. All 40 `requiredNoDefault` columns are core system columns. |
| 8 | The cold path is tested | 6 | **100** | 50 + 30 + 20. |
| 9 | Sample data is offered and removable | 4 | **20** | 20/50 earned + 0/50. **OWNER-BLOCKED.** |
| 10 | Someone has walked it with a fresh account | 4 | **100** | 60 + 40. The walk's one finding is fixed on this tree. |

```
Σ = 97·16 + 100·15 + 100·13 + 80·12 + 100·11
  + 100·10 + 100·9  + 100·6  +  20·4 + 100·4

  = 1552 + 1500 + 1300 + 960 + 1100
  + 1000 +  900 +  600 +  80 +  400

  = 9392
TOTAL = 9392 / 100 = 93.92  ->  94
```

Gate (criterion 1 < 40) did not apply. Criterion 1 is 97.

## The arithmetic the brief asked me to verify — the lane is WRONG by 0.8

The lane's headline: *"Together they hold back 6.4 points — 4 of them on sample
data alone."*

```
criterion 4:  (100 − 80) × 12 / 100  =  2.4 points
criterion 9:  (100 − 20) ×  4 / 100  =  3.2 points        <- NOT 4.0
                                        -----
                                          5.6 points      <- NOT 6.4
```

**The lane's own Σ line proves 5.6 and contradicts its own prose.** Their §9
reads `Σ = 9392 + 20·12 + 80·4 = 9392 + 240 + 320 = 9952`, and 240 + 320 = 560,
which is 5.6 points. The 6.4 comes from charging criterion 9 its **full** weight
of 4.0, as though it scored 0 — but their own table scores it 20, and 20/50 of
it is genuinely earned (seven per-target sample CSVs behind *"New to this?
Download a sample:"* at `web/components/screens/import-screen.tsx:334`). The
"4 of them on sample data alone" is the tell.

**The owner is being told the wrong number. It is 5.6.**

## The ceiling is NOT a ceiling — either ruling alone clears 95

This is the finding that matters most, and the lane's framing hides it. They
presented the two rulings as a joint block and only published the both-reversed
case. Taken **one at a time**:

| scenario | Σ | total |
|---|---|---|
| today | 9392 | **94** |
| **criterion 9 alone** → 100 (sample data loadable + removable) | 9392 + 320 = 9712 | **97** |
| **criterion 4 alone** → 100 (team creation reopened) | 9392 + 240 = 9632 | **96** |
| both | 9952 | **100** |
| criterion 1 alone → 100 (the ADMIN_KEY minor forgiven) | 9440 | 94 — inside the rounding |

**Either ruling on its own clears 95, and the cheaper of the two clears it by
more.** Criterion 9 is Tier 2 in the skill's own protocol (loadable, removable
example data) — no product decision, no change to what a new tenant is given, no
change to the sign-up flow. Criterion 4 requires reversing
`TEAM_CREATION_CLOSED`, which is a product decision documented three times over.

**So the honest sentence for the owner is: 94 is one decision away from 97, and
the decision is "may a new team load and then remove example data", not "should
anyone be able to create a team".**

## Is anything ELSE recoverable? No.

Three criteria sit under 100 and only three:

- **crit 1 = 97** costs 0.48 points. The residual is that a fresh *Cloudflare
  environment's* very first team needs an operator with `ADMIN_KEY`
  (`POST /api/tenancy/admin/create-team`, the one carve-out named in
  `shared/product.ts`). **This arguably should not be a penalty at all** under
  this rubric, whose gate asks whether *a new tenant* is unusable until someone
  runs a script — and a new team is not: `createTeam`
  (`workers/tenancy/src/lib/teams.ts:155-200`) creates the D1, applies every
  migration, runs `buildTeamSeed` (Admin + Viewer roles, `role_permissions` for
  every `TEAM_MODULES` entry, the dropdown defaults), writes the membership row
  and flips `db_status` to ready — all inside one call, with no human step. Even
  forgiving it entirely, the total stays 94.
- **crit 4 = 80**, owner-blocked, verified below.
- **crit 9 = 20**, owner-blocked.

**There is no third lever.** Every other criterion is already at 100 on my
measurement.

## The two owner blocks, verified rather than accepted

**Criterion 4's 0/20 is real.** `shared/product.ts:24` — `export const
TEAM_CREATION_CLOSED = true`, an owner decision dated 10 Aug 2026 and reaffirmed
three times in the same file. The consequence is in
`workers/tenancy/src/routes/team.ts:58`:

```
if (accepted === 0 && !TEAM_CREATION_CLOSED) { await createTeam(...) }
```

A person who signs up with no invitation waiting gets **no team**. The rubric's
row is *"nothing in that path waits on an email, an admin approval or support"* —
it waits on all three. **0/20 is correct and it is closed by an owner ruling.**

**Criterion 9's cap is real but its 20 is earned.** Seven downloadable sample
CSVs, one per import target, on the import screen. What is missing is the other
half of the rubric's row: nothing *loads* example data into the app in one act,
and nothing removes it — imported sample rows are indistinguishable from real
ones afterwards. **0/50 on the second row is correct.**

## The sensitivity on criterion 2 — my view is 94, and 93 is not rounding

The lane published 94 lenient / 93 strict. **I take the lenient reading, and here
is why, on the two screens the strict reading fails.**

- **Internal rates** (`web/components/money/internal-rate-card.tsx:173-176`): the
  empty body reads *"No internal rates yet. Until one is set, an hour of our time
  counts as costing nothing."* and the `New internal rate` button sits eight lines
  above it, **inside the same card**.
- **Portal Home** (`web-portal/components/home-screen.tsx:156-158`): the empty
  body reads *"You haven't asked us for anything yet. When you do, it'll live
  here, and so will our reply."*, and a full-width `Ask us something` button sits
  directly above the section.

In both, the empty sentence and the act **name the same thing** ("no internal
rates" / "New internal rate"; "you haven't asked us" / "Ask us something"). The
criterion's question is whether a person with no data knows what to press, and on
both screens they do. The rubric puts pressability in its own separate 25-point
row precisely so the 45-point row is not also a placement test.

**Strict reading, for the record:** 45×(21/23) = 41.09, criterion 2 = 96,
Σ = 9392 − 60 = 9332 → 93.32 → **93**.

**Criterion 3 sensitivity, which the lane did not publish:** the rubric's defect
table lists *"minor — a guarded case that only looks risky"*, which the prior
reviewer applied (97) and the lane did not (100). Taking the prior's stricter
line: Σ = 9392 − 39 = 9353 → 93.53 → **94**. It does not move the headline either
way. I score 100 because all five candidates are *explicitly* guarded rather than
safe-by-construction — see the overrides.

## Probe overrides — every field I did not take at face value

The probe is `~/.claude/skills/first_run_review/assets/probe.mjs`, run as
`node ~/.claude/skills/first_run_review/assets/probe.mjs .` (exit 0, 23,427 bytes).

| probe field | probe says | I score | why, with the command |
|---|---|---|---|
| `helpfulPct` | **32** | census instead | The probe looks for an action word near an *inline* empty branch. Here the act arrives through `CollectionEmptyState` (`shared/web/screen-engine/collection-frame.tsx:147-214`) — a headline, a sentence, an `Add the first` button and an optional `Import a list` — reached from the recipe engine, so no action word sits near the caller's own branch. `grep -rn "CollectionEmptyState" web/ web-portal/ shared/web/` shows **35 non-test files** carrying it. |
| `guardedPct` | **87** (65/75) | **100** | All ten `unguarded` files re-opened at this commit — table below. |
| `riskyOnEmpty` | 5 candidates | **0 findings** | All five opened — table below. |
| `firstRunTests` | 10 files | censused instead | The list is the first ten test files alphabetically (`agent-blocks`, `attachment-preview`, `backup-covers-r2`…) — it is not a first-run census. I counted the real cold-path suites myself: `cold-account` 11, `cold-tabs` 8, `cold-screen-hops` 4, `onboarding-dead-ends` 5, `onboarding-offers-the-spine` 10, `collection-frame-empty` 1, `last-save-wins` 2 = **41 tests**. |
| `seeding.scripts` | 4 seed scripts | not a criterion-1 defect | `i18n-seed-merge`, `seed-staging`, `seed-knowledge-about-the-app`, `seed-the-quiet-screens` are all operator/demo tooling. Team creation seeds itself — verified in `createTeam` above. |

### The ten "unguarded" files, all re-opened at `d2e50c8f`

| file | verdict |
|---|---|
| `web/components/apps/app-tiles.tsx` | presentational tile grid; its caller `apps-screen.tsx` carries 3 `CollectionEmptyState`. False positive. |
| `web/components/money/margin-panel.tsx` | `"Nothing to weigh up yet."` + a `NothingYet` component (line 130, 195). Guarded. |
| `web/components/process/process-date-slider.tsx` | `"This map has only ever said one thing. There is nothing to slide through yet."` Guarded. |
| `web/components/process/process-form-dialog.tsx` | `emptyText={t("No app matched.")}` — a narrowed picker inside a dialog, not a collection screen. |
| `web/components/records/overview-list.tsx` | 41-line wrapper round the kit's `DescriptionList`; not a collection screen at all. False positive. |
| `web/components/screens/profile-screen.tsx` | `emptyLabel={t("No account activity yet.")}`. Guarded. |
| `web/components/screens/settings-screen.tsx` | `pendingInvites.length > 0`, `roles.length > 0`, `adminSections.length > 0` all guarded; `ctx.teams.map` cannot be empty for a signed-in member. |
| `web/components/team/invite-dialog.tsx` | `emptyText={t("No role matched.")}` — narrowed picker. |
| `web/components/tickets/triage-strip.tsx` | `emptyText={t("Nobody here matched.")}` — narrowed picker. |
| `web/components/work/wave-form-dialog.tsx` | `emptyText={t("No client matched.")}` — narrowed picker. |

**Ten of ten resolve. `guardedPct` = 1.0 for criterion 6's 60-point row.**

### The five `riskyOnEmpty` candidates

| file:line | verdict |
|---|---|
| `web/components/shell/app-shell.tsx:580,581,582,1596` — `group[0].…` | **Compile-enforced.** `type NonEmpty<T> = [T, ...T[]]` at line 124, `function nonEmpty<T>(xs: T[]): xs is NonEmpty<T>` at 128, and both arrays are typed `NonEmpty<ShellLink>[]` and produced by `.filter(nonEmpty)` (lines 550, 566). `group[0]` cannot be undefined. |
| `web/components/tickets/triage-strip.tsx:78` — `waiting[0].days` | Sits inside `triage.waiting[0] ? … : …` (lines 76-80). Guarded inline. |

No confirmed finding. Criterion 3 = 100.

## Corrections to BOTH prior reports, and to CLAUDE.md

**`EMPTY_TOOLBAR_EXEMPT` is not empty and never has been.** The prior
(`8-fresh-eyes-remeasure.md`, criterion 6) says *"`EMPTY_TOOLBAR_EXEMPT` empty"*;
the lane says *"`EMPTY_TOOLBAR_EXEMPT` still empty"*; CLAUDE.md's R50 entry says
*"empty today"*. All three are wrong:

```
git show 30102296:shared/rules/registry.ts | grep -A 4 "^export const EMPTY_TOOLBAR_EXEMPT"   -> 2 entries
git show e2723a33:shared/rules/registry.ts | grep -A 6 "^export const EMPTY_TOOLBAR_EXEMPT"   -> 3 entries
grep -A 10 "^export const EMPTY_TOOLBAR_EXEMPT" shared/rules/registry.ts                      -> 3 entries (lines 1335-1342)
```

Canary: `grep -c "TOOLBAR_EXEMPT" shared/rules/registry.ts` -> **6**, so the file
is being read.

**It does not change the score.** Reading the three reasons: two
(`contact-panels.tsx`, `tickets-collection.tsx`) are reached only past an early
`length === 0` return and can never actually render empty; the one live exception
(`account-detail-panels.tsx`, ContactsPanel) draws the register **plus** two icon
buttons, which is not "an empty table with headers and nothing else". Criterion
6's 25-point row still earns. **But the claim shipped three times unchecked and
CLAUDE.md now documents a fact that is false.**

## Everything I confirmed by opening the code

- **Landing screen named:** `/home`, titled "Welcome"
  (`web/lib/pages.ts:110`), rendered by `web/components/screens/home-screen.tsx`.
  A brand-new customer sees a **"Start here"** panel with three pressable rows —
  *Add your first account*, *Bring a spreadsheet in*, *Raise the first ticket* —
  each permission-gated, drawn only while `pulseIsQuiet(data)`. That is the
  criterion-2 landing-screen row (20) and the pressability row (25), earned.
- **7/7 import targets** in `workers/data-ops/src/lib/targets.ts:105`
  (`selectable_data`, `member_roles`, `accounts`, `meetings`, `stories`,
  `brand_assets`, `meeting_purposes`), every one named in web files.
  **Canary:** `nonexistent_target_xyz` -> **0 web files**, the seven -> 4 to 68.
- **All 40 `requiredNoDefault` columns** are core-DB system columns —
  `email`×4, `expires_at`×4, `code_hash`×2, `token_hash`×2, `size_bytes`×2,
  `database_name`×2 and so on. None is a value a customer must choose.
- **The teamless dead end is closed** — `web/app/onboarding/page.tsx:407-421`
  renders `InvitationsPanel` with a refresh **and** a `SignOutEscape`, with the
  comment *"Without this button that is where the app ends."*
- **The walk's finding is fixed** — `web/components/work/sprints-screen.tsx:555`
  now builds `sprintsEmpty` from `CollectionEmptyState` with the recipe's own
  title and `onCreate` gated on `canCreate`, drawn at line 564 for the Overview
  tab a new team lands on.

## Criterion-by-criterion: the smallest change that would move it

| # | score | cost | smallest change | blocked? |
|---|---|---|---|---|
| 1 | 97 | 0.48 | Nothing to build — either accept that "new tenant" means a new **team** (fully self-seeding) and score 100, or leave it. The `ADMIN_KEY` carve-out is BOOTSTRAP.md's day-zero path, not a customer's. | **Not blocked** — but worth 0 in the headline (still 94). |
| 2 | 100 | — | — | — |
| 3 | 100 | — | — | — |
| 4 | 80 | 2.4 | Set `TEAM_CREATION_CLOSED = false` in `shared/product.ts`. | **BLOCKED — owner ruling, 10 Aug 2026, reaffirmed 3×.** Tier 3 in the skill's own protocol. |
| 5 | 100 | — | — | — |
| 6 | 100 | — | — | — |
| 7 | 100 | — | — | — |
| 8 | 100 | — | — | — |
| 9 | 20 | 3.2 | One act on the import screen that loads a sample CSV **into** the team, tagging the rows, plus one act that removes exactly those rows. Tier 2 — draft and ask. | **BLOCKED — owner dropped it.** But this is the *only* lever that clears 95 on its own, and it changes no product decision. |
| 10 | 100 | — | — | — |

---

# PART 2 · `scaling_review` — 88 / 100

Platform, from the scan and confirmed against the wrangler configs: **Cloudflare
Workers (isolates) + D1 + R2 + Durable Objects**, eight workers, two Durable
Object classes (`TeamChannel`, `TeamInterest`), 1,170 files scanned. `warm
capacity`, `autoscale config` and `connection pooling` are excluded from every
denominator as inapplicable on isolates against an HTTP-native store — the
rubric's applicability table.

Weights are the rubric's **authoritative table** (which sums to 100). The
per-dimension section headers in the same file sum to 113 and are inconsistent
with it; the table wins, as both priors also took it.

## The scorecard

| # | dimension | coverage | penalties | score | wt | product | lane |
|---|---|---|---|---|---|---|---|
| 1 | Data partitioning & sharding | 100 | blocker 25 + major 12 | **63** | 12 | 756 | 63 |
| 2 | Query shape & indexing | 100 | major 12 + major 12 | **76** | 13 | 988 | 76 |
| 3 | Endpoint contract stability | 100 | major 12 | **88** | 7 | 616 | **100** |
| 4 | Growth triggers & headroom | 100 | none | **100** | 8 | 800 | 100 |
| 5 | Client data volume & lazy loading | 100 | none | **100** | 9 | 900 | 100 |
| 6 | Client cache freshness & bounds | 100 | none | **100** | 9 | 900 | 100 |
| 7 | Surge self-protection | 100 | none | **100** | 6 | 600 | 100 |
| 8 | Sequential, atomic & contended | 100 | minor 4 | **96** | 11 | 1056 | **100** |
| 9 | Write fan-out & realtime | 100 | none | **100** | 7 | 700 | 100 |
| 10 | Bulk paths, migrations & lifecycle | 80 | minor 4 | **76** | 5 | 380 | **84** |
| 11 | Elastic response time | 100 | none | **100** | 5 | 500 | 100 |
| 12 | File & object storage | 86 | major 12 + minor 4 | **70** | 8 | 560 | **84** |

```
Σ =  756 + 988 + 616 + 800 + 900 + 900
   + 600 +1056 + 700 + 380 + 500 + 560

   =  756
   + 988 = 1744
   + 616 = 2360
   + 800 = 3160
   + 900 = 4060
   + 900 = 4960
   + 600 = 5560
   +1056 = 6616
   +  700 = 7316
   +  380 = 7696
   +  500 = 8196
   +  560 = 8756

TOTAL = 8756 / 100 = 87.56  ->  88
```

**The four refutations, in order of cost:**

| dimension | lane | mine | delta on the total | why |
|---|---|---|---|---|
| 12 storage | 84 | 70 | **−1.12** | presigned signal is 0, proved at the infrastructure |
| 3 contract | 100 | 88 | **−0.84** | the merge refuses four of the app's real list ORDER BYs |
| 8 atomic | 100 | 96 | **−0.44** | two `MAX(x)+1` sort-key sequences outside a transaction |
| 10 lifecycle | 84 | 76 | **−0.40** | the per-team `activity` table has no retention or archival at all |
| | | | **90.36 − 2.80 = 87.56** | |

## Question 1 — is dimension 1 N/A on "single-tenant forever"? NO.

**The rubric does not support it, and the lane was right to refuse.**

The N/A clause reads: *"If a dimension genuinely does not apply (**no client
surface, no database, no file storage**), mark it N/A."* Every example is a
**structural absence** — the thing does not exist. The applicability table beside
it is likewise entirely about what a **platform** can have ("A Workers project has
no connection pool; a Lambda project has no Durable Object"). Nothing in either
admits a commercial decision as grounds for N/A.

Kwapso has a database and it has a tenant. Dimension 1 asks *"when one table gets
too big for one place, is there a plan, and does the plan exist in code?"* —
which is not only still live under single-tenancy, it is **more** live: the
rubric's Level 2 (*"sharding by tenant does nothing for the largest tenant"*) is
now the **only** level, and that is exactly where the blocker sits. Ruling
dimension 1 N/A would delete the one question the product's own shape makes
unavoidable.

Two further points the lane did not make:

- The yardstick itself is an **owner confirmation** dated 9 Aug 2026 that *"any
  single tenant may reach 250,000 people"*. "Single-tenant forever" says there
  will be no *second* team; it says nothing about the first one staying small.
  The two rulings are about different things and the later one does not retire
  the earlier one.
- **The 93 figure is not available on any measurement, including the lane's own
  logic applied honestly.** On my numbers, removing dimension 1's weight gives
  `(8756 − 756) / (100 − 12) = 8000 / 88 = 90.9 -> 91`, not 93. The lane's 93 is
  their own inflated dimensions 3, 8, 10 and 12 carried into a denominator
  change.

**Recommendation to the planner: do not put "93 with dimension 1 removed" in
front of the owner. It is neither rubric-supported nor arithmetically reachable.**

## Question 2 — the presigned-upload signal. It is **0**, proved at the infrastructure.

The lane scored it **1** on the argument that *"what changed between then and now
is a secret, not a code path"*. **That argument is backwards for a review whose
whole subject is behaviour under load.** A code path that never executes provides
exactly zero scaling headroom, and this is the project's own hard-won lesson —
*"an unrun script is not a control: a correct, tested script that never ran looks
exactly like a live control on disk; ask the infrastructure, not the repo."*

**So I asked the infrastructure.** Two `cf-exec` GETs, 7 Sep 2026:

```
cf-exec curl .../workers/scripts/kwapso-content/secrets
  -> CF_D1_TOKEN, GOOGLE_CONNECT_CLIENT_ID, GOOGLE_CONNECT_CLIENT_SECRET,
     GOOGLE_TOKEN_KEY, INTERNAL_KEY                          (5, success: true)

cf-exec curl .../workers/scripts/kwapso-content-staging/secrets
  -> the same five                                            (5, success: true)
```

**Canary:** `CF_D1_TOKEN` is present in both, so the read works and an absence is
a real absence. **`R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` are on neither
worker, in neither environment.**

The code agrees with the infrastructure, in its own words:

- `shared/workers/presign.ts:78` — `return Boolean(env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY)`
- `workers/content/src/env.ts:56-57` — *"A SECRET, and **absent everywhere until
  somebody decides to create it** — `presignConfigured` is false without it and
  every upload door behaves exactly as it does today"*, and *"which is **every
  environment** until the credential below exists"*
- `workers/content/src/routes/uploads.ts:115` — `if (!presignConfigured(env)) return json({ direct: false })`
- `web/lib/api/content.ts:88-92` — `putDirect` sees `{direct:false}`, latches
  `directUploadsOff = true` for the tab, and returns null on every subsequent
  call. `sendFile` then posts the bytes to the streaming door.

**Every byte of every upload, in every deployed environment, still passes through
a worker.** Fifteen `.put(` sites still carry bytes (four of them streaming
`request.body`, the rest buffered `parsed.bytes`).

**Dimension 12's coverage in full, seven signals:**

| signal | score | evidence |
|---|---|---|
| presigned direct upload | **0** | above |
| multipart / streaming | 1 | four `env.INTERNAL_MEDIA.put(key, request.body, …)` sites stream. *(Probe override: `stream-to-storage` reports 0.)* |
| tenant key prefix | 1 | `teamMediaKey` -> `<team>/<module>/<ulid>`, one shape (`shared/workers/image.ts:33-52`), used at 15 sites. |
| metadata in DB | 1 | `metadata-in-db` 59 hits / 30 files; R40 requires every stored file be claimed by a field a screen reads. |
| objects cached | 1 | `Cache-Control: public, max-age=31536000, immutable` at `workers/gateway/src/index.ts:165`. |
| lifecycle rules | 1 | **Verified live, not from the repo** — see below. *(Probe override: `storage-lifecycle` reports 0.)* |
| range reads | 1 | 553 hits / 160 files; `workers/gateway/test/media-range.test.ts`. |

`6 / 7 = 0.857 -> coverage 86`. Penalties: **major 12** (bytes proxied through a
worker on every upload and download, in every environment) + **minor 4** (no
reference-independent reclaim; garbage survives a row deleted outside a door that
calls `reclaimMedia`). **86 − 16 = 70.**

`time-ordered-key` excluded as N/A — R2 hashes keys internally.

## Probe overrides — every field I did not take at face value

Scan: `node ~/.claude/skills/scaling_review/assets/scan.mjs .` (exit 0, 66,853
bytes).

| scan field | scan says | I score | why, with the command |
|---|---|---|---|
| `storage.presigned-upload` | **104 hits / 16 files** (good) | **0** | The scan counts the word "presign". Confirmed inert at the infrastructure — the two `cf-exec` secret reads above. |
| `storage.storage-lifecycle` | **0** | **1** | Asked R2 directly: `cf-exec curl .../r2/buckets/kwapso-media/lifecycle` -> `{"success":true,"result":{"rules":[{"id":"Default Multipart Abort Rule","enabled":true,"abortMultipartUploadsTransition":{"condition":{"type":"Age","maxAge":604800}}}]}}`. **The rule is live on production.** The prior overrode this from `scripts/r2-lifecycle.mjs` alone, which would have been the "unrun script" trap; this is the bucket's own answer. |
| `storage.stream-to-storage` | **0** | **1** | Four `.put(key, request.body, …)` sites: `brand-assets.ts:221`, `deliverables.ts:312`, `knowledge.ts:595`, `staff.ts:219`. |
| `storage.bucket-listing` | 2 hits, risk | **not a finding** | Both are `scripts/backup.mjs:233,445` — the nightly backup, not a user-facing path. |
| `headroom.size-check` | **0** | **not missing** | `D1_MAX_DATABASE_BYTES` and `ACCOUNT_STORAGE_ID = "account:d1-storage"` in `workers/tenancy/src/lib/sharding.ts:84-95`, written to `db_growth` / `db_alerts` on the `10 3 * * *` cron. |
| `clientvolume.offset-pagination` | **214 hits / 90 files**, risk | **1 real site** | Almost all hits are the *word* "offset" in comments and in `batch.map((_, offset) => …)`. Censused the SQL: **one** `OFFSET` in production, `workers/content/src/index.ts:346`, the cron's window over `teams` in the core DB, reasoned in the comment above it ("the Nth window of the whole estate, which is what an offset IS"). No user-facing offset paging anywhere. |
| `surge.unbounded-parallel` | 8 hits / 6 files, risk | **0 findings** | All three material sites are wave-bounded: `help.ts:1496` (`BULK_CONCURRENCY` slices), `import-batch.ts:365` (`wavefront` slices, resumable), `count.ts:151` (`databaseIds`, a fixed short list). |
| `atomic.sequence-generation` | **0** | **2 real sites** | The scan misses them. `MAX(position)+1` at `workers/tenancy/src/lib/processes.ts:3036-3044` and `MAX(COALESCE(rank, id))` at `workers/content/src/lib/help.ts:675-682`. See dimension 8. |
| `lifecycle.archival` | 1,124 hits / 187 files (good) | **half** | The word "archive" is everywhere in the deactivate-not-delete vocabulary. Actual retention sweeps exist **only on the core DB** (`shared/workers/retention.ts` — `login_codes`, `login_sends`, `sessions`, `error_logs`). See dimension 10. |
| `queries.count-star` | 319 hits / 134 files | 1 confirmed major | Clustered: one `formatCount`/`countRaw` seam (`shared/workers/count.ts`). One finding, not 319. |

## Dimension 3 — the refutation, proved by running the code's own regexes

The lane moved dimension 3 from 88 to 100 on *"`d1QueryAcross` merges instead of
refusing"*. The merge does exist (`shared/workers/d1-rest.ts:466` `mergePlan`,
`:506` `mergeAndCut`). **But the lane never asked whether the app's actual
`ORDER BY` clauses are ones the merge can read. Four real list doors' are not.**

`mergePlan`'s term regex accepts only `[table.]column [ASC|DESC]`; anything else
returns `null`, and `d1QueryAcross` then throws *"this statement's ORDER BY /
LIMIT is not one the merge can reproduce"* (line 550).

I extracted both regexes verbatim from the file and ran them:

```
staff certs      null      workers/content/src/lib/staff.ts:275
                           ORDER BY COALESCE(issued_on, created_at) DESC LIMIT ${LIST_HARD_CAP}
threads          null      workers/data-ops/src/lib/threads.ts:53
                           ORDER BY COALESCE(last_message_at, created_at) DESC LIMIT ${LIST_HARD_CAP}
tokens           null      workers/mcp/src/lib/tokens.ts:107
                           ORDER BY (revoked_at IS NULL) DESC, created_at DESC LIMIT ${LIST_HARD_CAP}
internal rates   null      workers/tenancy/src/lib/internal-money.ts:133
                           ORDER BY (deactivated_at IS NULL) DESC, is_default DESC, label ASC
CANARY plain     {"keys":["created_at"],"limit":50}
```

**The canary fired** — a plain `ORDER BY created_at DESC LIMIT 50` parses, so the
four nulls are the parser's real answer and not a broken harness.

The rubric's question is *"pick three endpoints — could you move their table to
two shards **without editing the route file**?"* For these four the answer is no:
the query itself would have to be rewritten before the merge could serve it.
**Major 12. Dimension 3 = 88**, exactly where the prior had it.

## Dimension 8 — the refutation

The scan reports `sequence-generation: 0`. **A zero is a claim.** Canary: `grep
-rn "MAX(" workers/ shared/` returns six production sites, so the search sees the
source. Two of them are sequence generators:

- `workers/tenancy/src/lib/processes.ts:3036` — `nextPosition()`:
  `SELECT MAX(position) … ` then `return (rows[0]?.n ?? 0) + 1`, outside any
  transaction. Schema has `UNIQUE(version_id, step_key)` but **no unique on
  `(version_id, position)`** (`migrations.ts:829-830`).
- `workers/content/src/lib/help.ts:675` — `topRank()`:
  `SELECT MAX(COALESCE(rank, id)) AS top FROM help` then `rankAtTop(...)`. **No
  unique index on `rank`.**

Two people creating at the same millisecond both read the same MAX and both write
the same value. **Minor, not blocker** — the rubric's blocker language is about a
number that must be *unique* (an invoice number); these are **sort keys**, so the
consequence is a stable-but-arbitrary ordering tie, not corruption and not a
duplicate identifier. **Minor 4. Dimension 8 = 96.**

## Dimension 10 — the refutation

Coverage, five signals: imports stream (1), bulk writes chunked **and resumable**
(1 — `import-batch.ts:365` waves with a `"Resumed here"` reject row), online-safe
schema change (0.5 — migrations run per-team but nothing documents the path for a
large-table `ALTER`), retention/archival on append-only tables (**0.5**), tested
restore path (1 — `workers/auth/test/restore-rehearsal.test.ts` runs every build).
`4 / 5 = 80`.

**The half that is missing:** `shared/workers/retention.ts` sweeps four tables and
all four are in the **core** database. The per-team `activity` table —
`CREATE TABLE activity` at `migrations.ts:106`, written by every mutation in the
app under R1 — has **no `DELETE`, no archival and no retention anywhere**. Canary:
`grep -rc "DELETE FROM" workers/tenancy/src/lib/*.ts` returns 2 and 3 on other
files, so the search works; `grep -rn "DELETE FROM activity"` returns nothing.

The rubric: *"Which tables only ever grow? Without retention or archival, each is
a slow blocker — say when it becomes one."* It becomes one when a team database
approaches `D1_MAX_DATABASE_BYTES` (10 GB), and at the yardstick's "tens of
millions of rows" the fastest-growing table is the only one nothing prunes.
**Minor 4** rather than major, because reads on it are keyset-paged and capped,
and the growth *is* watched by dimension 4's cron — charging it a major here would
re-charge dimension 1's blocker. **Dimension 10 = 76.**

## The eight dimensions where I agree with the lane, and what I checked

- **1 · Partitioning = 63.** Both penalties re-verified. **Blocker 25:** one tenant
  is one D1, D1 serialises reads, and per-tenant is the only partitioning in
  force. **Major 12:** the relief valve is still unavailable —
  `workers/tenancy/src/lib/sharding.ts:806` is `export const SPLIT_READS_WIRED:
  boolean = false`, and `merged-read-guard.test.ts:279` states why: *"nothing
  outside sharding.ts reads across databases, so a moved module would be
  invisible to the app."*
- **2 · Queries = 76.** Both majors stand. `TOTAL_COUNT_CAP` is still `1_000_000`
  (`shared/workers/limits.ts:29`) with **no maintained counter anywhere** (canary:
  `shared/workers/count.ts` has 6 `COUNT(*)`, so the search sees it). And D1 read
  replication remains unreachable in production — `TEAM_DB_0` appears **only
  inside the staging env block** of all three of content, tenancy and data-ops
  (`workers/content/wrangler.jsonc:140`), so production has zero native team-DB
  bindings and every statement pays the REST door.
- **4 · Headroom = 100.** The account's 1 TB ceiling is watched, trended and
  alarmed (`ACCOUNT_STORAGE_ID`, `db_growth`, `db_alerts`, the `10 3 * * *` cron).
- **5 · Client volume = 100.** Caps everywhere, keyset cursors, virtualisation,
  and the single production `OFFSET` is a cron window over the estate.
- **6 · Client cache = 100.** Eviction bounds, realtime invalidation, reconnect
  and a resync-after-gap path all present.
- **7 · Surge = 100.** Rate limits (including a `CALLER_LIMIT` binding at
  600/60s), backoff, 80 timeout sites, edge cache, and no unbounded `Promise.all`.
- **9 · Fan-out = 100.** The prior's major is genuinely closed:
  `shared/workers/realtime.ts:104` — `REALTIME_SHARDS =
  Math.ceil(REALTIME_PEAK_LISTENERS_PER_TEAM / REALTIME_SHARD_WATCH_SOCKETS)` =
  `ceil(25,000 / 3,000)` = **9**, derived from the yardstick's own peak, giving
  27,000 watched sockets against a 25,000 target. And an import publishes **one
  change per module**, not per row (`routes/import.ts:136,169`).
- **11 · Elastic = 100.** Isolates; capacity arrives in milliseconds; the three
  inapplicable signals are excluded rather than scored 0.

## The two levels of the yardstick

**Across tenants.** The 1 TB account ceiling is watched, trended and alarmed, and
the watch correctly counts the two other products sharing this Cloudflare account
(`sharding.ts:66` — *"the 1 TB is charged to the ACCOUNT, so their bytes fill our
ceiling"*). Level 1 is answered.

**Inside one tenant.** Unchanged and unaddressed. One tenant is one D1; D1
processes one query at a time per database; the mover's relief valve is
deliberately disabled; and in production every statement additionally pays the
REST door because no native team binding exists outside staging.

D1 limits as recorded in the code with a live-check date of **5 Sep 2026**
(two days before this measurement): 10 GB per database, 1 TB per account on
Workers Paid.

## The first ceiling, in one sentence

**A single tenant's D1 serialises every read, so one tenant reaching the yardstick
stalls at roughly 2,000–5,000 concurrent sessions — five to ten times short of the
25,000 target — and the relief valve for it is deliberately disabled
(`SPLIT_READS_WIRED = false`); the second ceiling behind it is that every uploaded
and downloaded byte still passes through a worker, because the presign credential
exists on no deployed environment.**

## Dimension-by-dimension: the smallest change that would move it

| # | score | cost | smallest change | blocked? |
|---|---|---|---|---|
| 1 | 63 | 4.44 | Two moves, in order: (a) add `tables_json` to `team_module_databases` so a routing map has something to key on; (b) carry `splits?: Record<table, string[]>` on `cfg` in `requireMember` exactly as `natives` already rides, then flip `SPLIT_READS_WIRED`. 642 `guard.databaseId` call sites change nothing. That closes the **major 12** only. | **Major: NOT blocked** — Tier C, needs an owner decision on timeline, but the plan is written and the rollback is deleting rows. **Blocker 25: not fixable in this codebase** — it is D1's single-writer/single-reader shape. |
| 2 | 76 | 3.12 | For the first major: a maintained per-collection counter written on the same statement as the insert/delete, replacing the capped `COUNT(*)`. For the second: nothing — D1 read replication needs a native binding production cannot carry at scale. | **First major: NOT blocked**, ~2 days, and it is the single largest unblocked lever in this review. **Second: blocked by Cloudflare.** |
| 3 | 88 | 0.84 | Widen `mergePlan` to accept `COALESCE(a, b)` and `(x IS NULL)` terms — four doors, one regex — **or** rewrite those four `ORDER BY`s as plain columns backed by a generated column. | **NOT blocked.** Hours. Cheapest point on the board. |
| 4 | 100 | — | — | — |
| 5 | 100 | — | — | — |
| 6 | 100 | — | — | — |
| 7 | 100 | — | — | — |
| 8 | 96 | 0.44 | `CREATE UNIQUE INDEX` on `process_steps(version_id, position)` and on `help(rank)`, plus a retry on conflict. | **NOT blocked.** Hours. |
| 10 | 76 | 1.20 | Add the per-team `activity` table to a retention sweep with a stated window, on the existing `10 3 * * *` cron beside `sweepCoreRetention`. | **NOT blocked** — but the *window* is an owner decision (how much history a client is owed). |
| 11 | 100 | — | — | — |
| 12 | 70 | 2.40 | **One secret.** `wrangler secret put R2_ACCESS_KEY_ID` (+ the pair) on content, staging and production, scoped write-only to the two buckets. Everything else is built, tested and proven against live R2. | **NOT blocked by engineering** — blocked only by the decision to create an account-scoped R2 key, which is why it was removed. This is 2.4 points for one credential. |

**If every unblocked item above landed** — dim 1's major closed (63 -> 75), dim 2's
count major closed (76 -> 88), dim 3 -> 100, dim 8 -> 100, dim 10 -> 88 (coverage
5/5, penalty gone), dim 12 -> 92 (coverage 7/7, the upload half of the major
closed by the credential, the **download** half surviving as a minor because
`/media/*` still serves bytes through the gateway, plus the reclaim minor):

```
Σ = 75·12 + 88·13 + 100·7 + 100·8 + 100·9 + 100·9
  + 100·6 + 100·11 + 100·7 + 88·5 + 100·5 + 92·8

  = 900 + 1144 + 700 + 800 + 900 + 900
  + 600 + 1100 +  700 + 440 + 500 + 736

  = 9420
TOTAL = 9420 / 100 = 94.20 -> 94
```

**94, still not 95** — because dimension 1's blocker 25 and dimension 2's
replication major are both Cloudflare's shape and not ours. Together they are
`25·12/100 + 12·13/100` = **4.56 points** that no work in this repository can
recover.

**The margin is thin and the planner should know it.** If the download path also
left the worker (a signed read URL, closing dimension 12's residual major
entirely -> 96), the same sum reaches `9420 + 32 = 9452 -> 94.52 -> 95`. So 95 is
reachable *in principle*, but only by clearing **every** unblocked item in the
table above **and** taking bytes off the worker in both directions — which is
five separate pieces of work, one of them a credential decision the owner already
reversed once.

**The lane's core conclusion that scaling cannot practically reach 95 is
CORRECT.** What is wrong is the number it starts from (88, not 90), the reasons it
gives (four dimensions are over-scored), and the suggestion that 93 is available
by declaring dimension 1 N/A — which is available on neither the rubric nor the
arithmetic.

---

# Canaries that fired

1. **`EMPTY_TOOLBAR_EXEMPT` was never empty.** `git show 30102296:` -> 2 entries,
   `git show e2723a33:` -> 3, HEAD -> 3. Canary: `grep -c "TOOLBAR_EXEMPT"
   registry.ts` -> 6. **Three documents claim otherwise, CLAUDE.md included.**
2. **My own false zero on `OFFSET`.** A multi-path `grep -rn "OFFSET" workers/
   shared/workers/` returned nothing, and I nearly recorded "no OFFSET in
   production SQL" as a clean result. Re-run single-path: `grep -rn "OFFSET"
   workers/ | wc -l` -> **16**, three of them non-test, including the one at
   `workers/content/src/index.ts:346` the scan had already shown me. **A zero is a
   claim.** The corrected finding (one deliberate cron OFFSET) is stronger than
   the one I nearly published.
3. **`mergePlan` canary.** A plain `ORDER BY created_at DESC LIMIT 50` parses to
   `{"keys":["created_at"],"limit":50}` while all four real doors return `null` —
   so the four nulls are the parser's answer, not a broken harness.
4. **Import-target canary.** `nonexistent_target_xyz` -> 0 web files while all
   seven real targets -> 4 to 68.
5. **Secret-listing canary.** `CF_D1_TOKEN` is present in both workers' secret
   lists, so the absence of `R2_ACCESS_KEY_ID` is a real absence.
6. **`MAX(` canary.** `sequence-generation: 0` from the scan, but `grep -rn
   "MAX("` returns six production sites — two of them sequence generators the
   scan cannot see.
7. **`DELETE FROM` canary.** Before believing "nothing deletes from `activity`",
   confirmed `DELETE FROM` appears 2-3 times in neighbouring team libs.
8. **History reads.** Every `git show <commit>:<file>` was line-counted first
   (`registry.ts` at `e2723a33` -> 2,599 lines) before anything was concluded
   from its contents.

# What I did NOT do, said plainly

- **No `npm run check`.** The brief says read-only in the primary checkout, and a
  build writes `.next` / `web/out` that another lane may be sharing. Both scores
  are therefore **static measurements**, as both priors were. The first-run lane
  reported `EXIT=0` on `e2723a33`; that is **not** evidence about `d2e50c8f`,
  which is a merge-resolution commit six lanes later.
- **No live walk with a fresh account.** Criterion 10 is scored on the tracked
  2026-09-06 walk (`.session-notes/lanes/empty-walk-record.md`,
  `empty-walk.json`) plus source-level re-verification that its finding is fixed.
- **No re-derivation of the 2,000–5,000 concurrent-session figure.** Carried from
  the prior with attribution; it is an estimate of D1's serialisation ceiling and
  nothing in this repository measures p95 per endpoint, so every latency-shaped
  number in the scaling review is an estimate. Stated as the rubric requires.
- **No write of any kind** to Cloudflare. Both `cf-exec` calls were GETs.
