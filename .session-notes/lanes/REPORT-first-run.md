# REPORT — lane `first-run` · branch `fix/first-run-95`

**Tip measured: `e2723a33`** (pushed to `origin/fix/first-run-95`, rebased onto
`origin/main` = `497dc4d7`). Two commits:

| commit | what |
|---|---|
| `efa9f8b8` | fix(kit): record the three icon renames the case-insensitive filesystem swallowed |
| `e2723a33` | fix(first-run): an empty state everywhere, and a live patch that never eats a draft |

**`first_run_review` 92 -> 94** (measured fresh at `e2723a33`; the prior 92 is
`.session-notes/reviews/8-fresh-eyes-remeasure.md` §1 at `30102296`).

**94 is the ceiling under the two owner rulings the brief told me not to lift,
and I could not exceed it.** Criterion 4 is capped at 80 by "0/20 waits on a
person" (team creation is closed) and criterion 9 is capped at 20 by the owner
dropping sample data. Together they hold back 6.4 points — 4 of them on sample
data alone. Nothing else on the table is above 80. If the owner reverses either
ruling the arithmetic is written out at the bottom.

---

## 0 · I was resumed, and here is what I found on disk

The worktree held 17 modified files and 2 untracked test files, uncommitted and
unpushed, and no commit. I read every one before touching anything. My
predecessor had done the bulk of both rulings and was stopped reading the exit
code of a gate. **Nothing was discarded.** What I added: the vendored-kit fix
below, the mutation proofs, the full ten-file re-census for criterion 6, the
extract/ceiling reconciliation, the gate, the push and this report.

---

## 1 · THE THING THE PLANNER NEEDS FIRST — `main` is RED on a fresh clone

`npm run check` fails on `origin/main` in **any fresh clone or git worktree**,
and passes on the machine the kit sync ran on. That asymmetry is the bug, and it
would have been every lane's blocker today.

```
web/test/vendored-kit.test.ts
  AssertionError: shared/ui/ differs from what sync-design.mjs vendored at v1.2.63
  Expected: "6680396e1223d25e3558a9e015a124e4ad8dcb430310d49706fbf97f33847be0"
  Received: "8c922d66b6a697c316630f12541df0d7739d7961574b73d3b89611beb8795c05"
```

**Cause.** Kit v1.2.63's own CHANGELOG says three glyph files were renamed to
the spelling phosphor.dev uses: `LightBulb.svg`->`Lightbulb.svg`,
`SnowFlake.svg`->`Snowflake.svg`, `TextBox.svg`->`Textbox.svg`.
`scripts/sync-design.mjs` wrote them under the new names and pinned
`VERSION.json.hash` over that directory — and that hash **includes each file's
relative path**, so the case is part of it. macOS APFS is case-insensitive, so
git saw identical bytes at a path it already had and kept the OLD index entries.
Commit `ef66f3b6` therefore shipped a tree that hashes to `8c922d66…` against a
pin of `6680396e…`.

**Proved, not inferred** — origin/main's committed tree extracted into a clean
directory, hashed by the test's own walk:

```
git archive origin/main shared/ui | tar -x -C <clean dir>
  -> LightBulb.svg / SnowFlake.svg / TextBox.svg
  -> contentHash = 8c922d66b6a697c316630f12541df0d7739d7961574b73d3b89611beb8795c05

contentHash(<primary checkout's working copy>)
  -> 6680396e1223d25e3558a9e015a124e4ad8dcb430310d49706fbf97f33847be0   = the pin
```

**Fix (`efa9f8b8`): the rename is recorded and nothing else.** Not one byte of
any file changes. No source imports these paths — the glyphs are React
components in `foundations/icons/icons.generated.tsx`, and the kit's own
`manifest.json`, `ATTRIBUTION.md` and `CHANGELOG.md` already say `Lightbulb`,
`Snowflake`, `Textbox`. **This is not a hand-edit of the vendored kit**; it is
the sync's own result, finally in the tree. `web/test/vendored-kit.test.ts` 3
passed afterwards, in a worktree.

Planner: this commit is independent of everything else in the branch and can be
landed on its own.

---

## 2 · The gate — green by unpiped exit code

```
npm run check > /tmp/fr-gate2.log 2>&1; echo EXIT=$?
EXIT=0
```

Per workspace, off the log's own lines (not a sum I did in my head):

| workspace | Test Files | Tests |
|---|---|---|
| workers/auth | 18 passed (18) | 200 passed (200) |
| workers/tenancy | 72 passed (72) | 939 passed (939) |
| workers/content | 77 passed \| 1 skipped (78) | 1002 passed \| 3 skipped (1005) |
| workers/data-ops | 38 passed (38) | 406 passed (406) |
| workers/mcp | 13 passed (13) | 601 passed (601) |
| workers/realtime | 4 passed (4) | 84 passed (84) |
| workers/gateway | 9 passed (9) | 88 passed (88) |
| workers/portal-gateway | 2 passed (2) | 48 passed (48) |
| web | 112 passed (112) | 941 passed \| 8 skipped (949) |
| web-portal | 10 passed (10) | 93 passed (93) |

The 8 web skips are the known worktree thinness (export tripwires + the two
splash-byte suites, which need `web/out` and `web-portal/out`); the 3 content
skips are pre-existing. Lint and `tsc` across all eleven projects passed first.

---

## 3 · Ruling one — "there should be empty states for everything"

### 3a · The known finding, closed and mutation-proved

`web/components/sprints-screen.tsx` — Sprints' **Overview tab, the tab a new
team lands on** — drew a bare `EmptyLine`: a title, no sentence, nothing to
press, while the helpful register sat one tab over. No static check could have
caught it; the recipe was fine. The tab is host-composed, so it never touches
`CollectionFrame` and the engine's `CollectionEmptyState` never reached it.

**Three more tabs had the same fault in a different costume** — a month grid
over a team with nothing in it, captioned truthfully and offering nothing. All
four now draw the shared seam:

| tab | what it says now | first act |
|---|---|---|
| Sprints · Overview | "No sprints yet." | Add the first |
| Sprints · Calendar | "No sprints yet." | Add the first |
| Tasks · Calendar | "No tasks with a deadline yet." | Add the first |
| Meetings · Calendar | "Nothing in Meetings yet." | Add the first · Import a list |

Tasks' Calendar gets its **own** sentence because that tab's collection is the
*dated* tasks: a team with undated tasks lands there too, and "no tasks yet"
would be false for them. Every act is permission-gated on `canCreate`; a reader
who cannot start one is drawn no button.

Locked by **`web/test/cold-tabs.test.tsx`** (new, 8 tests). Every tab is
rendered as the real screen with warm, empty caches — and **each is drawn a
second time with ONE row**, which must show that row and NOT the register,
because "nothing in it" is exactly what a broken render looks like.

**Mutation-proved:** Sprints' Overview reverted to `EmptyLine` ->
`cold-tabs 1 failed | 7 passed`. Restored; `git diff --stat` identical.

### 3b · The census — every screen, tab, panel and nested list, both front doors

**Fixed this lane (14 bodies).** Each moved from a grey line to the kit's 27.21
register (headline, one sentence, up to two buttons):

| screen / panel | says | first act |
|---|---|---|
| Sprints · Overview | No sprints yet. | Add the first |
| Sprints · Calendar | No sprints yet. | Add the first |
| Tasks · Calendar | No tasks with a deadline yet. | Add the first |
| Meetings · Calendar | Nothing in Meetings yet. | Add the first · Import a list |
| Apps · Inactive tab | Nothing is finished or put away yet. | none — an app reaches this pile from its own screen |
| Access tokens | No tokens yet. | Add the first (opens the create dialog) |
| Agent history dialog | No conversations yet. | none — the first conversation starts in the box it opened from |
| Agent usage dialog | No usage yet today. | none — usage is recorded, not added |
| Ticket attachments | Nothing attached to this ticket yet. | Add a file / Add a link, under the list |
| Story attachments | Nothing attached yet. | Add a file / Add a link, under the list |
| Meeting · Who was invited | Nobody else is on the invitation. | none — the invitation is Google's |
| Kwapso · Brand library panel | Nothing in the brand library yet. | Open the brand library, in the panel header |
| Relationship map · link list | Nothing is linked to this yet. | none — a link is made on the record it links from |
| Stakeholders · Ours / Theirs | (the panel's own sentence) | none — who is on a system is set on the system's form |

The stakeholders panel keeps the **plain line for "nobody MATCHED"** — the same
split every find bar in the app makes, because "nothing matched your search" and
"there is nothing here yet" are different sentences and only one of them wants a
first act.

**Censused and deliberately left alone, with reasons:**

- **Internal rates / Role rates** (`web/components/internal-rate-card.tsx`).
  Both cards guard zero rows with an honest sentence that names the consequence,
  and both have a real act on screen: a labelled "New internal rate" button in
  the header, and for role rates a labelled Role / An-hour form sitting
  permanently under the list. I **drafted** the register here and **reverted
  it**: splitting the two sentences at their own full stops would have retired
  two sentences already translated into German, Spanish and Catalan and shipped
  four untranslated halves in their place (`TRANSLATION_CEILING` measured
  213->217). That is a real regression on three languages bought for a change of
  shape on a screen that already names its act, and the owner's key may not be
  spent to undo it. Scored against me in the strict reading below.
- **Thirteen "Nothing here matches that." lines** — search-narrowed states, the
  deliberate split above.
- **Four field-level lines inside forms** — `app-form-dialog` "Nobody on the
  team yet.", `review-dialog` "Nothing attached yet.", `knowledge-detail` "No
  text yet.", `meeting-detail` "Nothing written down yet.". A centred register
  with a big button inside a form field would be the wrong control; these are
  correctly lines.
- **Triage strip** "Nothing has been sitting unread." — a *good* state, not a
  first-run gap.
- **The client portal's five empty screens** (tickets, deliverables, impact,
  home, company contacts) already carry the same register with a labelled button
  from the 2026-09-05 run; `web-portal/components/ticket-attachments.tsx` says
  "Nothing attached yet. A screenshot often explains it faster than a paragraph."
  with both acts under the list. **No portal file needed changing and none was.**

### 3c · The probe's ten "unguarded" files — all re-opened this round

Criterion 6 sat at 0.95 last round purely because nobody had re-opened these. I
opened all ten. **Every one is a probe false positive**: a file-level heuristic
cannot see a guard that lives in a shared seam or in the caller.

| file | why it is guarded |
|---|---|
| `app-tiles.tsx` | presentational; its sole caller (`apps-screen.tsx:502`) guards `shown.length === 0` before the tiles, and `groupByStage` never yields an empty group |
| `invite-dialog.tsx` | the "collection" is a `RecordPicker`'s options; `emptyText={t("No role matched.")}` |
| `process-form-dialog.tsx` | same; `emptyText={t("No app matched.")}` |
| `wave-form-dialog.tsx` | same; `emptyText={t("No client matched.")}` |
| `margin-panel.tsx` | explicit `nothingYet` branch with a what-to-do sentence ("Sell … a sprint and log some time against it") |
| `overview-list.tsx` | a record's own fact list (`DescriptionList`), never a collection |
| `process-date-slider.tsx` | `dates.length < 2` branch with its own sentence |
| `profile-screen.tsx` | the kit's `ActivityFeed` with `emptyLabel={t("No account activity yet.")}` |
| `settings-screen.tsx` (x2) | `adminSections.length > 0` guards one; the teams list sits behind `TEAM_SCREENS_HIDDEN`, which is on |
| `triage-strip.tsx` | `triage.waiting[0] ? … : …`, guarded on the same expression |

`RecordPicker`'s zero-row body was read to the bottom: it says "Searching…"
while in flight, "Couldn't search just now." on failure, and `emptyText` only on
an **answered, empty** list — which is also criterion 6's "loading and empty
look different", proved rather than assumed.

### 3d · Translation

`node scripts/i18n-extract.mjs` -> **1963 strings** (1730 first seen in `web/`,
143 in `web-portal/`, 90 in `shared/`), and re-running it changes nothing, so
`shared/i18n-strings.json` is current (R28).

**Two** new English sentences: "No tasks with a deadline yet." and "Nothing in
Meetings yet." `TRANSLATION_CEILING` **211 -> 213** in `de`, `es` and `ca`, with
the arithmetic and the reason for each written into the comment block in
`shared/rules/registry.ts` beside the 4 Sep and 5 Sep entries.
`web/test/translation-ceiling.test.ts` recomputes the true count fresh and
requires **exact equality** — it passes at 213, so the pin is neither above nor
below the truth. **`scripts/i18n-translate.mjs` was never run.**

Worth recording: "Nothing in Meetings yet." is the same sentence the meetings
recipe has always carried as its `emptyText`. A recipe's `emptyText` is
translated where it is *read* (`t(c.emptyText)` in `screens.ts`), which the
extractor cannot see — so a screen has been saying it since 5 Sep while it was
in no catalogue. The calendar tab saying it through `t()` is what surfaced it.
**A pre-existing debt made visible, not a new one.**

---

## 4 · Ruling two — last save wins

### The previous behaviour, written down for the owner

**It was already exactly what he asked for, and nothing proved it.**

`shared/web/use-form-draft.ts` (R7) reads `initial` on the inactive->active edge
and at no other time (`initialRef`, lines 101-117). So when a colleague saves
the same record two seconds before you and the row-level live patch (`patchRow`,
the R1/R15 seam) hands the host a new `initial`: **the row on screen becomes
theirs, your draft stays yours, nothing prompts, and your save replaces the
record whole.** Sequential, last save wins, in the order the saves happened.

There was **no prompt, no merge dialog, no "this changed under you" banner** —
nothing to remove. The gap was that this was an emergent property of one
`useRef`, and an innocent `useEffect(() => setValues(initial), [initial])` added
to any single dialog tomorrow would overwrite a person's typing with their
colleague's and stay green.

So it is now a stated invariant plus **`web/test/last-save-wins.test.tsx`**
(new, 2 tests), driven through a **real** dialog over a **real** cached read
(store -> host -> dialog -> form), **canaried on the row** so a store that never
patched cannot pass. The second test holds the whole-record shape: a field you
never touched still follows your draft, because a field-level merge would write
a third record neither person authored.

**Mutation-proved:** `useEffect(() => setValuesRaw(initial), [initial])` added
to `use-form-draft.ts` -> `last-save-wins 2 failed`. Restored.

### One comment was wrong, and only the comment changed

`web/components/meeting-detail.tsx` said the Notes editor was "keyed on the ROW
so the editor re-seeds when the saved notes change under it (a colleague typing
into the same meeting)". It is keyed on `item.id`, which does **not** change when
a colleague saves — so it never re-seeded. The comment described the behaviour
the owner has now ruled *against*. **The key always did the right thing; the
sentence above it did not.** Corrected, no code moved.

---

## 5 · The walk

**I did not walk with a fresh account, and I did not create a team or a D1
database.** The brief permits a walk only if nothing is left behind; the score
did not need one, so I did not take the risk on an account where nine of the
databases belong to other companies.

- Criterion 10's 60 points are already earned by the **2026-09-06** cold walk
  (canary-verified, report tracked at `.session-notes/lanes/empty-walk-record.md`).
- Criterion 10's remaining 40 are "what it found was **fixed**, not just noted" —
  and its one finding, Sprints' Overview tab, is fixed and mutation-proved above.

**D1 list before = D1 list after: unchanged, because no `cf-exec` command was
run in this lane at all.** No Cloudflare API was touched, no worker deployed, no
model called, no neuron spent.

My re-measurement is therefore **static plus component-level renders of the real
screens** (54 cold tests: 44 `cold-account` + 8 `cold-tabs` + 2
`last-save-wins`, plus 28 in the three onboarding/empty-frame suites), standing
on that dated walk. I say so rather than implying a live walk happened.

---

## 6 · The scorecard at `e2723a33`

Landing screen, named as the rubric demands: **the agency app's Home
(`web/components/screens/home-screen.tsx`)**. A brand-new member with an empty
team sees a "Start here" block whose every step is a pressable control, and it
disappears the moment the team has anything at all (`cold-account.test.tsx` F1,
3 tests).

| # | criterion | wt | 30102296 | e2723a33 | working |
|---|---|---|---|---|---|
| 1 | Nothing needs a human to seed it | 16 | 97 | **97** | 100 − 3 (minor: a fresh environment's first team needs an operator + `ADMIN_KEY`). `/api/tenancy/bootstrap` present, `buildTeamSeed` automatic at creation. Unchanged. **CAPPED** |
| 2 | Every empty screen says what to do next | 15 | 95 | **100** | 45x(23/23) + 25 pressable + 20 landing screen + 10 wording. See the two readings below |
| 3 | Nothing blanks or crashes on zero rows | 13 | 97 | **100** | 100 − 0. `riskyOnEmpty` **7 -> 5**; all 5 proven |
| 4 | First useful outcome inside five minutes | 12 | 80 | **80** | 40 (7 import targets + the generic screen, linked) + 30 (eight steps) + **0/20 CAPPED** + 10. Unchanged |
| 5 | Sign-up to first screen has no dead end | 11 | 100 | **100** | 35+25+20+20; 28 tests across the three onboarding/empty suites |
| 6 | Every empty screen says something at all | 10 | 97 | **100** | 60x1.0 (all ten probe-"unguarded" files re-opened, §3c) + 25 (R50, `EMPTY_TOOLBAR_EXEMPT` still empty) + 15 (loading != empty, proved in `RecordPicker`/`ServerRows`) |
| 7 | Everything required has a default | 9 | 100 | **100** | 40+30+30; all 40 `requiredNoDefault` are core system columns |
| 8 | The cold path is tested | 6 | 100 | **100** | 50+30+20. Deeper than last round (+8 `cold-tabs`, +2 `last-save-wins`) but the rows were already full |
| 9 | Sample data is offered and removable | 4 | 20 | **20** | 20/50 earned (7 per-target sample files, "New to this? Download a sample:"), 0/50 nothing to remove. **CAPPED** |
| 10 | Someone has walked it with a fresh account | 4 | 80 | **100** | 60 (walked 2026-09-06, report tracked) + **40 — its finding is now fixed**, mutation-proved |

```
Σ = 97·16 + 100·15 + 100·13 + 80·12 + 100·11 + 100·10 + 100·9 + 100·6 + 20·4 + 100·4
  = 1552 + 1500 + 1300 +  960 + 1100 + 1000 +  900 +  600 +  80 +  400
  = 9392
TOTAL = 9392 / 100 = 93.92  ->  94
```
Gate (criterion 1 < 40) did not apply. **92 -> 94.**

### The sensitivity on criterion 2, published so the number can be checked

My denominator is **23 collection destinations** — 19 on the agency door
(members, roles, invites, dropdowns, internal-rates, accounts, contacts, tasks,
meetings, knowledge, tickets, time, apps, processes, sprints, stories, waves,
brand, purposes) and 4 on the portal (home, tickets, deliverables, impact). The
previous reviewer used 17; mine is wider, derived from `web/lib/pages.ts` and
`web/components/deep-link/collection-content.tsx`. The portal's Company-screen
contacts and the fourteen panels in §3b are scored in the census but are panels,
not destinations.

- **The criterion I applied, and the one the previous reviewer applied:** a
  screen is helpful when its empty state names an act the reader can press.
  Sprints failed last round because the whole screen offered "nothing to press".
  On that reading **23/23** -> criterion 2 = **100** -> total **93.92 -> 94**.
- **A stricter reading** — the control must be *inside* the empty body — fails
  two: Internal rates (its button is in the header) and the portal's Home (its
  full-width "Ask us something" sits one element above). Then 45x(21/23) = 41.1,
  criterion 2 = **96**, Σ = 9332, total **93.32 -> 93**.

**The lenient reading is the one that matches the prior measurement, so 94 is
the comparable number; 93 is the floor if the planner prefers the strict one.**
I have not tried to hide the judgement call inside a rounding.

### The probe, overridden where it is wrong, and said so

`probe.mjs` reports `helpfulPct: 32` and `guardedPct: 87` on this tree (75
collection-rendering files, 65 guarded, 24 "tell you what to do"). Both are
wrong for this app in the same way: it looks for an action word near an *inline*
empty branch, and here the act arrives through a React context
(`CollectionCreateActionProvider`) from a host several layers above the body,
and the guard often lives in a shared seam (`RecordPicker`, `ActivityFeed`) or
in the caller. I censused the destinations instead, above, and every override is
itemised so it can be argued with. `riskyOnEmpty` I did **not** override — I
opened all five (app-shell x4 are compile-enforced by the `NonEmpty<T>` type
predicate at `app-shell.tsx:124-128`; triage-strip is guarded inline).

---

## 7 · Every file touched, and why

| file | why |
|---|---|
| `shared/ui/foundations/icons/{Lightbulb,Snowflake,Textbox}.svg` | case-only rename, zero bytes changed — §1. **The only `shared/ui/` change, and it is not a hand-edit** |
| `web/components/sprints-screen.tsx` | the walk's finding: Overview + Calendar draw `CollectionEmptyState` |
| `web/components/tasks-screen.tsx` | Calendar tab draws the register with its own true sentence |
| `web/components/meetings-screen.tsx` | Calendar tab draws the register with both acts |
| `web/components/apps-screen.tsx` | Inactive tab matches the Active tab's register |
| `web/components/access-tokens.tsx` | register + the create act |
| `web/components/agent-history-dialog.tsx` · `agent-usage-dialog.tsx` | register, no act (correctly) |
| `web/components/help-attachments.tsx` · `story-attachments.tsx` | register; acts sit under the list |
| `web/components/meeting-detail.tsx` | invitation list register **+ the wrong comment corrected** (§4) |
| `web/components/screens/kwapso-screen.tsx` | brand-library panel register |
| `web/components/relationship-map.tsx` | link list register instead of a grey `<li>` |
| `web/components/stakeholders-panel.tsx` | register at rest, line when narrowed (`narrowed` prop) |
| `web/components/waves-screen.tsx` | `waveTimelineWindow` takes its group head once through a guard — closes the last 2 `riskyOnEmpty` |
| `shared/web/use-form-draft.ts` | the last-save-wins invariant stated at the seam (comment only, no behaviour change) |
| `shared/i18n-strings.json` | 2 new sentences, from `node scripts/i18n-extract.mjs` |
| `shared/rules/registry.ts` | `TRANSLATION_CEILING` 211 -> 213 x3, with the reason |
| `web/test/cold-tabs.test.tsx` | **new** — the four bypass tabs, cold, each with a one-row canary |
| `web/test/last-save-wins.test.tsx` | **new** — a live patch meets an open draft, canaried on the row |

---

## 8 · UI / UX and business logic changed — the owner must be told

1. **Fourteen empty bodies changed shape.** A grey sentence becomes the kit's
   27.21 register: a headline, one sentence, and up to two labelled buttons.
   Four of them gained a button that was not there before (Sprints x2, Tasks
   Calendar, Meetings Calendar). **No screen with rows on it looks any
   different** — every canary in `cold-tabs.test.tsx` renders the same screen
   with one row and insists the rows draw and the register does not.
2. **Two new English sentences** on screens that previously said something true
   and less useful. They ship in English to a German, Spanish or Catalan reader
   until the next reviewed translation run; that is recorded in
   `TRANSLATION_CEILING` rather than left invisible.
3. **No business logic changed at all.** Ruling two was already the behaviour;
   this lane wrote it down and tested it. No door, no gate, no schema, no
   permission and no worker was touched.

---

## 9 · What I could not move, and the honest reason

- **Criterion 4 -> 80.** The 20 points are "nothing in that path waits on an
  email, an admin approval or support", and team creation waits on a person by
  the owner's own ruling. Closed; I did not try.
- **Criterion 9 -> 20.** 4 weighted points sit in "sample data is offered and
  removable". The 20/50 is *earned* (seven per-target sample files and a
  "Download a sample" link on the import screen), and the other 50 needs
  loadable, removable example data — which the owner dropped. **This is the
  single largest recoverable block on the table**; the planner has asked him
  again and had no answer, so the cap stands.
- **Criterion 1 -> 97.** The residual 3 is a minor: a *fresh environment's* very
  first team needs an operator with `ADMIN_KEY`. That is BOOTSTRAP.md's job, not
  a customer's, and closing it would mean changing what a new tenant is given at
  creation — Tier 3 in the skill's own protocol and the owner's decision.

**If both capped rulings were reversed** (criterion 4 -> 100 and criterion 9 ->
100): Σ = 9392 + 20·12 + 80·4 = 9392 + 240 + 320 = **9952 -> 100**. The ceiling
is entirely those two rulings; nothing technical is holding this score down.

---

## 10 · Commands that prove each claim

```bash
cd /Users/alaap_kanchwala_apple/kwapso-lanes/first-run

# the gate, unpiped exit code
npm run check > /tmp/fr-gate2.log 2>&1; echo EXIT=$?          # EXIT=0

# the catalogue is current (R28) and the ceiling is exact (R44)
node scripts/i18n-extract.mjs                                  # 1963 strings, no diff
(cd web && npx vitest run test/translation-ceiling.test.ts)    # 1 passed

# main is red on a fresh tree; this branch is not
git archive origin/main shared/ui | tar -x -C <clean dir>      # -> 8c922d66…  != the 6680396e… pin
(cd web && npx vitest run test/vendored-kit.test.ts)           # 3 passed at e2723a33

# the probe, both trees
node ~/.claude/skills/first_run_review/assets/probe.mjs .      # branch: riskyOnEmpty 5
(cd ~/Desktop/kwapso_cpaa && node ~/.claude/skills/first_run_review/assets/probe.mjs .)   # main: riskyOnEmpty 7

# the cold path
(cd web && npx vitest run test/cold-tabs.test.tsx test/last-save-wins.test.tsx \
   test/cold-account.test.tsx)                                 # 54 passed

# mutation proofs (both restored afterwards; git diff --stat identical)
#   sprints Overview -> EmptyLine                     => cold-tabs 1 failed | 7 passed
#   useEffect(() => setValuesRaw(initial), [initial]) => last-save-wins 2 failed
```

Worktree left in place at `/Users/alaap_kanchwala_apple/kwapso-lanes/first-run`.
No PR opened. Nothing deployed.
