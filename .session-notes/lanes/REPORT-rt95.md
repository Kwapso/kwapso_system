# REPORT — lane `rt95` · branch `fix/round-trip-95`

**Worktree** `/Users/alaap_kanchwala_apple/kwapso-lanes/rt95`
**Cut from** `d2e50c8f` (= `origin/main` at start)
**Tip** `c54b590c` — three commits: `f9bd84a1`, `bb509d33`, `c54b590c`
**Pushed** `git push -u origin fix/round-trip-95` → new branch. No PR opened.
**`npm run check`** → **EXIT=0**, read unpiped. Per-workspace lines in §5.

---

## The headline, said plainly

**I did not reach 95, and the reason is not that the work fell short — the 94 I
was asked to lift was itself measured on one screen.**

- All three of the brief's levers are **refuted by my own measurement**. Each
  refutation is a real finding about the codebase, not a disagreement about
  method.
- Widening the cold-path census from one screen to four found the real problem:
  **a person opening a ticket from an email waited through THIRTEEN requests to
  read one sentence.** The budget constant said five and had only ever been
  tested on the one screen it was written for.
- I fixed that. Every record screen is now inside the budget (3–5 requests), and
  a page of stories lost 39.2% of its bytes.
- Measured fresh at my tip per `~/.claude/skills/round_trip_review/SKILL.md`:
  **85 → 93.** An +8 move on a board the brief said was at 94 needing +1.

One sentence for the owner: *four screens got meaningfully faster, and the score
went down against the previous claim because the previous claim had not looked at
three of them.*

---

## 1 · The ten criteria, recomputed with arithmetic

Measured by me at `d2e50c8f` (before) and `c54b590c` (after). Method per
`assets/rubric.md`: `total = round( Σ(criterion × weight) / Σweights )`.

| # | criterion | key | method | w | before | after | before×w | after×w |
|---|---|---|---|---|---|---|---|---|
| 1 | Hops per action are counted and bounded | `hops` | coverage · **GATE** | 15 | **65** | **100** | 975 | 1500 |
| 2 | No question is asked twice | `duplicates` | defect | 13 | 100 | 100 | 1300 | 1300 |
| 3 | Fetch the row, not the list | `overfetch` | defect | 13 | 85 | 85 | 1105 | 1105 |
| 4 | Nothing already in hand is fetched again | `reuse` | coverage | 12 | 90 | 90 | 1080 | 1080 |
| 5 | No request per row | `nplusone` | defect | 12 | 85 | 85 | 1020 | 1020 |
| 6 | Independent calls run together | `parallel` | defect | 11 | 97 | 97 | 1067 | 1067 |
| 7 | A write updates in place | `writeback` | coverage | 9 | 100 | 100 | 900 | 900 |
| 8 | The payload is shaped for the screen | `payload` | coverage | 6 | **60** | **70** | 360 | 420 |
| 9 | First paint does not wait for everything | `firstpaint` | coverage | 5 | **60** | **100** | 300 | 500 |
| 10 | Someone has measured it | `measured` | coverage | 4 | 100 | 100 | 400 | 400 |
| | | | | **100** | | | **8507** | **9292** |

**Before = 8507 / 100 = 85.07 → 85.**
**After = 9292 / 100 = 92.92 → 93.**

**The gate:** criterion 1 caps the total at 45 if it falls below 40. It is 65
before and 100 after, so **no cap applies** to either figure; capped and uncapped
are the same.

`transport.endpointsMapped = 214` at both commits, so the probe's discovery is
sound and nothing below it rests on zeros.

### Where each number comes from

**1 · hops — 65 → 100. All of the movement.**
Rows: 35 *busiest ≤5* · 25 *median 1–2* · 20 *a budget written down* · 20 *≤3
services*. The rubric's own instruction is "follow the chain by hand for the top
three screens … write down the true end-to-end hop count", so I measured it by
rendering the real shell cold and stamping each request with whether the record
was already on screen — the instrument `web/test/cold-screen-hops.test.tsx`
already used on one screen, widened to four screens and both cold arrivals.

|  | before (page 1 / past cursor) | after |
|---|---|---|
| a process | 3 / 3 | 3 / 3 |
| a ticket | **12 / 13** | 4 / 5 |
| an account | **11 / 11** | 5 / 5 |
| a meeting | 8 / 9 | 4 / 5 |

- *busiest ≤5*: before, the busiest is **13** → the "13+" band → **0**. After it
  is **5** → **35**.
- *median 1–2 hops*: probe `hopsPerUnit.median = 1` → **25** both.
- *a budget written down*: `MAX_REQUESTS_BEFORE_FIRST_PAINT = 5`
  (`shared/workers/limits.ts:845`), plus `MAX_D1_TRIPS_PER_DOOR`,
  `LATENCY_BUDGET_MS` and the dated `MEASURED_MS` table → **20** both.
- *≤3 services*: the busiest cold path reaches two workers behind the gateway
  (tenancy + content) → **20** both.

**2 · duplicates — 100.** The probe reports 18 groups; every one I read is a
grouping artefact. `web/lib/use-active-team.ts` is reported as calling
`/api/tenancy/active` three times inside `load()`; it calls it **once** (line
151), and the file carries an in-flight join (`booting`) and a freshness window
(`bootedAt` / `BOOT_FRESH_MS`) written against exactly this fault. The other
`…/active` pairs are a component's read matched against its own write. Asserted
rather than argued: the census's "nothing is asked TWICE on the way to that
paint" passes on **all eight cold arrivals across four screens**.

**3 · overfetch — 85, unchanged.** All 12 probe hits read. Three are in
`scripts/` (operator tools, not a click). The nine in app code are cron or
housekeeping reads, each carrying a WHERE and an R14 cap. The **−15 (high)** that
remains is the rubric's own row *"a list endpoint called to render a single
record's detail"*: on a cold deep link the ticket, account and meeting record
screens each read their whole collection. Clustered as one finding with one fix.
**I did not move it** — see §6.

**4 · reuse — 90, unchanged**, per the brief (ten points are structural: R38
forbids handing a loaded list row down as a detail). One **probe defect** worth
recording: `helpers.clientCache` reports `false`, and the client cache plainly
exists — `shared/web/store.ts`, 611 lines, with a stated freshness rule
(`MAX_CACHE_AGE_MS`, stale-while-revalidate) and CACHING.md behind it. I scored
that 25-point row off the source, not the probe.

**5 · nplusone — 85, unchanged.** All 30 probe hits are in `scripts/`; **zero in
app code**. The one real per-row loop is the import's one gated write per row,
which buys the audit trail and the per-row rejection report. Recorded as decided.

**6 · parallel — 97.** Eleven probe waterfalls; the multi-await ones
(`useScreenActions` 6, `google-connections.disconnect` 5) are the same
enclosing-function artefact. The one real chain is a record screen's by-id read
waiting on its list read (`help-detail.tsx:116`) — but each call genuinely feeds
the next under the current design, which the rubric calls **minor (−3)**, not a
waterfall.

**7 · writeback — 100.** `refetchAfterWrite` is empty; ticket and story mutations
answer with `pagedJson` and the client merges it (`mergePage` + `primeCache` of
the facet badges, `tickets-collection.tsx:640-656`); drag-rank is optimistic.

**8 · payload — 60 → 70.** Rows: 40 *fields the screen uses* · 30 *list omits
heavy fields until asked* · 30 *pagination or a cap*.
- 40-row: list doors still return whole rows (the ticket list sends 31 fields for
  a row that draws three) → **20** both.
- 30-row: before, **one** module split list from detail (`knowledge.ts`
  `LIST_COLS` / `DETAIL_COLS`) → **10**. After, **two** — stories joins it, and
  the one remaining heavy field of comparable size (a ticket's `description`) is
  documented in code with the reason it cannot move → **20**.
- 30-row: R14 is machine-checked → **30** both.

**9 · firstpaint — 60 → 100.** Rows: 40 *renders with what it has* · 30
*secondary panels load after the primary content* · 30 *a slow non-critical call
cannot hold the screen blank*.
- 40-row: cache-first store → **40** both.
- 30-row: before, false on three of four record screens (nine of the ticket's
  thirteen pre-paint requests were secondary) → **0**. After, true on all four
  and now *structural* rather than scheduled — a secondary read is keyed on the
  record existing, so it cannot fire before one does → **30**.
- 30-row: **20** before (per-panel skeletons, but the secondary reads still sat
  in front of the record), **30** after.

**10 · measured — 100.** `shared/workers/timing.ts` (Server-Timing + `logIfSlow`),
`shared/web/splash.ts`, `scripts/speed-bench.mjs`; targets in `limits.ts`; and
`MEASURED_MS` is dated with `speed-bench.mjs` printing each fresh reading beside
the recorded one — a trend, not a single reading.

### Why my "before" (85) is below the independent measurement's 93.69

The whole gap is criterion 1 (65 vs 97) and criterion 9 (60 vs ~100), and both
have one cause: **that measurement's hop count came from one screen.**
`web/test/cold-screen-hops.test.tsx` at `d2e50c8f` instrumented
`/t/<team>/processes/<id>` and nothing else, and processes is the one screen a
previous lane had already repaired. The rubric's sentence is about the *busiest*
screen. Across four screens the busiest was 13.

Nobody has to take that on trust: the census is in the branch, it runs in 14
seconds, and reverting one line of the fix reproduces the old numbers.

---

## 2 · The brief's three levers — all three refuted, with the measurement

### Lever 1 · "cut `description` from the ticket list" — **DO NOT DO THIS**

The brief said `42013880` had made it safe. It has not.

**The measurement first** (staging, team "Kwapso", 2,051 tickets, one page of
fifty, the shipped `listTickets` imported from the worktree and run in Node
against the real D1 REST door — read-only):

```
wholePageChars           60,921
withoutDescriptionChars  36,351
descriptionShareOfPage    40.33%      (the brief carried 34.9%)
meanDescriptionChars         476      max 3,008
```

The prize is real and slightly larger than the brief said. It still cannot be
taken, because **four consumers render a ticket's `description` off a LIST row**:

| where | what it does |
|---|---|
| `web/components/deep-link/shape.tsx:182` | `name: truncate(richTextPlain(t.description))` — **the agency list row's entire title**. Cut the column and every row in the ticket list is blank. |
| `web-portal/components/ticket-row.tsx:70` | `<Clamp lines={2}>{richTextPlain(ticket.description)}</Clamp>` — the client's row body. |
| `web-portal/components/ticket-screen.tsx:151` | `const ticket = oneQ.data ?? fromList ?? null` — `42013880` made the by-id read unconditional, but the list row is still what PAINTS while it lands. A client would see an empty ticket body, then their words. |
| `web/components/tickets/help-detail.tsx:114-118` | `const inPage = …find(…); const oneQ = useCached(ticketsQ.data !== undefined && !inPage ? … : null)`. **The by-id read never fires for a ticket in page one**, so on the agency side the description would be blank *permanently* for the fifty newest tickets. |

The codebase already knew — `web-portal/components/ticket-screen.tsx:142` says in
its own comment: *"the ticket list payload cannot be trimmed: `description` is
34.9% of it, measured, and dropping it would silently show a client half their
own ticket."* That sentence is correct. The brief's premise that `42013880`
retired it is not: that commit fixed the **portal's** R38 violation, not the
agency screen's, and not the paint.

**What I did instead:** found a list door where the same ~40% saving *is* safe —
stories — and took it. §3.

### Lever 3 (fallback) · "push the `triage.ts:228` predicate into the SQL" — it is already there

```sql
SELECT DISTINCT user_id FROM work_logs
 WHERE discarded_at IS NULL AND started_at >= ? AND started_at < ?
 LIMIT ${LIST_HARD_CAP}
```

The predicate is in the SQL, the read is `DISTINCT` so it returns at most one row
per person, and the R14 cap is stated at the statement. The `.filter` the probe
matched is over `members` — **which comes from the global CORE database**, while
this query runs against the team database. "Who logged nothing" is a complement
across two databases and cannot be one statement. Not a defect; not moved.

### Lever 2 · "parameterise the hop test" — done, and it found something

The brief said: *"If one comes in higher, that is a real finding and you report it
rather than tuning the test."* Three did. §3.

---

## 3 · What I changed, and why

### `f9bd84a1` — a page of stories leaves the words of the work behind

| file | change |
|---|---|
| `workers/content/src/lib/stories.ts` | new `STORY_LIST_COLS`, **derived** from `STORY_COLS` by replacing `s.detail,` with `NULL AS detail,`, and **throwing** if that replace matches nothing. `listStories` uses it; `getStory` and `storyOrThrow` keep the whole row. |
| `shared/workers/tool-catalog.ts` | `list_stories`' description now says a page leaves out `detail` and where to get it. R27: `detail` and `id` both name something real. |
| `workers/content/test/list-leaves-the-long-text.test.ts` | **new** — 3 tests, driven through the shipped door against a real SQLite database. |

**Measured, same bench, same staging data, one page of fifty stories:**

```
before  63,374 chars      detail = 25,519 (40.27%)
after   38,555 chars      detail absent
        −24,819 chars, −39.2%
```

**Why this one is safe and the ticket's is not.** `story-detail.tsx:74` reads
`useCached("story:one:${storyId}", () => contentApi.storyOne(storyId))` — **by id,
always, no list fallback** — which `web/lib/live-resources.ts:1114` already stated
in writing (*"story-detail.tsx does not read its row out of the list"*). The
stories list row draws title / status / assignee / deadline
(`stories-screen.tsx:60-83`). The only other reader is the edit dialog's
`initial`, passed from `storyQ.data` at `story-detail.tsx:465` — the by-id read.
Every other `<StoryFormDialog>` call site is a create and passes no `initial`.

Search is untouched: `q` reads the *column*, not the response, and the third test
proves a story is still found by a word that appears only in its detail.

**Mutation-proved:** point `listStories` back at `STORY_COLS` → 2 of the 3 tests
go red; restore → green.

### `bb509d33` + `c54b590c` — the record comes first on every record screen

`web/test/cold-screen-hops.test.tsx` now walks four record screens and both cold
arrivals (the record in page one; the record past the page cursor — of staging's
2,051 tickets, fifty are the former and 2,001 the latter, so a census of page one
alone reports the cheaper number for the rarer case).

**What it found at `d2e50c8f` — the ticket's thirteen, in order:**

```
/api/tenancy/active                              the boot call
/api/tenancy/config/screens                      the screen's recipe overrides
/api/content/help?scope=all&view=live            the list
/api/content/help/thread?id=H1                   the conversation
/api/tenancy/members                             the mentions picker
/api/tenancy/activity?scope=record&table=help    the Activity TAB, unopened
/api/content/record-counts?table=help            the tab badges
/api/tenancy/selectable                          the dropdown values
/api/content/help/stakeholders?id=H1             a panel
/api/content/sprints        ┐
/api/tenancy/apps           ├─ three lists for a story dialog nobody opened
/api/tenancy/processes      ┘
/api/content/help?id=H1                          the ticket itself — LAST
```

**What moved,** nothing deleted and nothing made conditional on a permission, a
flag or a tab:

| file | what now waits |
|---|---|
| `web/components/tickets/help-detail.tsx` | activity, tab badges, members, dropdown values, stakeholders |
| `web/components/accounts/account-detail.tsx` | activity, tab badges, the glyph vocabulary, the impact panel, the apps picker |
| `web/components/meetings/meeting-detail.tsx` | activity, tab badges, the three edit-form pickers |
| `web/components/work/stories-screen.tsx` | `useStoryFormOptions`' six lists (a closed dialog) |

**The gate is `have` — the record being in hand — not a scheduler**, and that is
the third commit correcting the second. My first attempt put these behind
`useAfterPaint`. That hook's own doc forbids it:

> *"WHERE A DETERMINISTIC GATE EXISTS, USE THAT INSTEAD. A secondary panel that
> needs the record anyway should key on the record being in hand (a null cache key
> fetches nothing) — that is exact, needs no scheduler, and cannot be flaky. This
> hook is for the things with no such dependency."*

Every read here is about **this record** or the form that edits it, so every one
of them already has that dependency. `useStoryFormOptions` — the one read with no
record dependency — stays behind the scheduler, which is the case the hook
reserves for itself. The correction fixed fourteen tests my first attempt broke,
and fixed them by being right rather than by being accommodated: rendered alone,
`useRecordActivity` and `useRecordCounts` never go busy-then-quiet, so under the
scheduler they waited the full three-second ceiling and their own suites timed
out. **A shared hook that cannot be exercised on its own is a worse hook.**

Two details worth carrying forward:
- The table name stays a **literal** at both call sites —
  `useRecordCounts("help", have ? helpId : null)`, not
  `useRecordCounts(have ? "help" : null, …)` — because
  `badges-before-the-click.test.tsx` reads that first argument off disk to decide
  which children a screen has claimed. Same behaviour, census unbroken.
- `RAW_DATE_EXEMPT` in `dates-are-formatted.test.ts` pins
  `use-record-activity.ts` **by line number**, so a comment added above it moved
  the pin twice (139 → 153 → 146). Re-pinned, with the cross-reference in the
  entry below it. Anyone editing that file needs to know.

**After: 3/3, 4/5, 5/5, 4/5 — every record screen inside the budget of 5.** A
per-screen ceiling table was written into the census while the numbers were 13
and 11, and **deleted before it shipped** once they came under five: a table of
pins is a table somebody raises.

The file's last test is unchanged and is the assertion in the other direction —
the deferred work still HAPPENS, afterwards. "Fewer requests before paint" and
"the prewarm was deleted" are the same number.

**Mutation-proved:** un-gate `useRecordCounts` alone → 4 of the 9 go red at 6, 7
and 6 requests; restore → 9 pass in 14.5 s (the file was 106 s before I folded
the assertions onto one render per arrival).

---

## 4 · UI / UX / business-logic changes — the owner must be told

Two, both deliberate. Neither changes a layout, a control, or a word of copy.

1. **Every secondary read on the ticket, account and meeting record screens now
   waits for that screen to have its record.** A record's Activity feed, its tab
   count badges, the mentions/assignee picker, the team's dropdown values, a
   ticket's stakeholders panel, an account's impact panel and glyphs and apps
   picker, and a meeting's three edit-form pickers. Each already drew its own
   skeleton meanwhile, and each already needed the record. The story dialog's six
   option lists wait for the browser's next idle moment instead (ceiling 3 s,
   typical 60 ms) because they have no record to key on.
2. **`list_stories` on the machine surface no longer carries `detail` in a page.**
   It comes back `null` in a page and whole on the single story asked for by `id`,
   and the tool description now says so. An assistant summarising a page of
   stories from the page alone will see titles and not the prose; it must ask for
   the story. This is the same bargain `list_knowledge` has made with `body` for
   months, but it is a narrowing of a machine contract and the owner should know.

Nothing in `shared/ui/` was touched. No deploy. No neurons spent. No new
user-visible English — the tool description is a worker string, outside the
translation catalogue, and `catalogued-strings` is green.

---

## 5 · `npm run check` — exit code, unpiped, per workspace

`npm run check > /tmp/gate-rt95c.log 2>&1; echo EXIT=$?` → **`EXIT=0`**

| workspace | Test Files | Tests |
|---|---|---|
| kwapso-auth | 20 passed (20) | 218 passed (218) |
| kwapso-tenancy | 74 passed (74) | 968 passed (968) |
| kwapso-content | 80 passed \| 1 skipped (81) | 1035 passed \| 3 skipped (1038) |
| kwapso-data-ops | 38 passed (38) | 412 passed (412) |
| kwapso-mcp | 13 passed (13) | 601 passed (601) |
| kwapso-realtime | 5 passed (5) | 90 passed (90) |
| kwapso-gateway | 10 passed (10) | 95 passed (95) |
| kwapso-portal-gateway | 2 passed (2) | 48 passed (48) |
| kwapso-web | 115 passed (115) | 957 passed \| 8 skipped (965) |
| kwapso-portal-web | 10 passed (10) | 93 passed (93) |

367 test files, **4,517 passed**, 11 skipped, 0 failed. Zero ` FAIL ` lines in
the log. The 3 skipped in content are the Glide backfill suite —
`glide/normalised.json` is git-ignored customer data, absent from every worktree
(LANE-COMMON §5 names this).

**Two earlier runs came back `EXIT=1` and neither was a regression; recording
both rather than quietly re-running.** Machine load was **44.85 on a 10-core box**
with 44 vitest processes from other lanes — roughly 4.5× oversubscribed.
- Run 1 (15:30): `workers/content/test/latency-budget.test.ts > "runs them at the
  same time, not one after another"`, which asserts three 40 ms timers finish
  under 110 ms and measured 269 ms. Alone it passes in 139 ms, and it exercises
  `shared/workers/parallel.ts`, which this branch does not touch.
- Run 2 (15:41): 7 web files. **Two were real and are fixed** (the `RAW_DATE_EXEMPT`
  line pin, and the two hook censuses that the scheduler gate broke — the reason
  for commit `c54b590c`). The other five were timeouts under the same load:
  `dead-exports.test.ts` needs 53 s of test time on a starved box against a 20 s
  default, and passes with `--testTimeout=180000`.

---

## 6 · What I could not move, and the honest reason

- **Criterion 3 (85), and the −15 holding it there.** The ticket, account and
  meeting record screens each read their whole collection on a cold deep link to
  draw one record — the rubric's own "high" row. The fix is to stop the record
  screen depending on the list, which the portal's ticket screen already did in
  `42013880`; on the agency side that is a restructure of three record screens, it
  *adds* a request for the common case, and it is outside what this brief
  authorises. **The single biggest remaining point on the board: +1.95.**
- **Criterion 8's 40-point row (20).** List doors still return whole rows. Fixing
  it properly means a declared list projection per module, not one field per
  module. Worth up to +1.2.
- **Criteria 4 (90) and 5 (85).** Left exactly as the brief instructed; both are
  correct as they are.
- **95 itself.** 93 is where the honest arithmetic lands. Criterion 3 alone would
  take it to 94.87 → **95**, and it is a real fix rather than a scoring argument —
  but it belongs to a different brief, and I would rather hand the planner an
  accurate 93 than a 95 assembled from judgement calls made after I knew which
  number I needed.

---

## 7 · Every claim, and the command that proves it

| claim | command |
|---|---|
| ticket list payload, `description` = 40.33% | `node --experimental-transform-types <scratch>/payload-bench.mjs` — imports the shipped `listTickets` from the worktree and runs it against staging's own team DB over the D1 REST door. Read-only; credentials from `scripts/lib/cf-credentials.mjs`, resolved against the registered primary checkout because `~/kwapso-lanes/` is not in `accounts.json` |
| per-field breakdown of the ticket / stories / meetings list pages | `<scratch>/fields-bench.mjs`, `story-bench.mjs`, `meet-bench.mjs` |
| stories list 63,374 → 38,555 chars | `story-bench.mjs` run at `d2e50c8f` and at the tip |
| cold hop counts, 8 arrivals × 2 commits | `cd web && npx vitest run test/cold-screen-hops.test.tsx` — replace `MAX_REQUESTS_BEFORE_FIRST_PAINT` with `0` in the assertion to make every arrival print its own list of doors |
| the stories split is real and reversal-detectable | `npx vitest run --config vitest.workers.config.ts workers/content/test/list-leaves-the-long-text.test.ts`, then point `listStories` back at `STORY_COLS` |
| the cold-path fix is real and reversal-detectable | un-gate `useRecordCounts` in the three record screens, re-run the census |
| probe transport discovery is sound | `node ~/.claude/skills/round_trip_review/assets/probe.mjs .` → `transport.endpointsMapped: 214` |
| `latency-budget` is a load flake | `npx vitest run --config vitest.workers.config.ts workers/content/test/latency-budget.test.ts` → 16 passed, 139 ms |
| `dead-exports` is a load flake | `npx vitest run test/dead-exports.test.ts --testTimeout=180000` → 3 passed |
| the machine was oversubscribed | `uptime` → `load averages: 44.85 47.11 51.89`; `sysctl -n hw.ncpu` → 10 |

Per-lane scratchpad, as the brief required:
`/private/tmp/claude-501/-Users-alaap-kanchwala-apple-Desktop-kwapso-cpaa/b61a973a-419c-4fb5-b926-02005c415036/scratchpad/rt95/`

**Two probe defects, catalogued rather than argued around:**
`helpers.clientCache: false` on a codebase whose client cache is
`shared/web/store.ts`; and `hopsPerUnit` attributing a file's every mutation
handler to the last named `async function` above them — `togglePerson` is
reported at 11 hops in `client-org-panel.tsx`, which makes **three** reads and
eleven one-per-click writes.
