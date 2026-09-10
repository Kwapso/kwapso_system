# REPORT — lane `roundtrip95` · branch `fix/round-trip-to-95`

**Worktree** `.worktrees/roundtrip`
**Cut from** `6bbdb309` (moved from `a747d863` mid-review; diffed both, zero app-code change)
**Tip** `e446f4ef` — one commit, rebased twice as `main` moved during the review
**Pushed** `git push -u origin fix/round-trip-to-95` → new branch.
**Merged** by the coordinating (`planner`) session: `main` `a5b3b52c` → now `717c206b`
(a separate, unrelated `.gitignore`/doc-claims fix landed on top of the merge).
**`npm run check`** → **EXIT=0** at merge time, read unpiped, verified independently by
the merging session with its own mutation test (reverted the source, watched the new
test fail by timeout at 1,538ms/1,555ms, restored it, watched it pass). Per-workspace
lines in §4.

**Score: 92 → 95 / 100.**

---

## 0 · How this was measured

Probe: `~/.claude/skills/round_trip_review/assets/probe.mjs .` —
`transport.endpointsMapped: 214` (sound; nothing below rests on zeros). 163 units, max 11
hops, median 1, 4 units over 5.

Every probe hit was read, not scored on the regex alone (the rubric's own instruction).
19 duplicate/waterfall/overfetch candidates in code added since the last measurement
(knowledge base, Google connections, meetings transcripts, the record map/"neighbourhood"
feature) were independently verified — all 19 are false positives or clustering artefacts
(mutually-exclusive branches, genuine dependencies, or already-bounded reads). The four
record-detail cold-open hop counts (ticket, account, meeting, process) were re-run live:
`web/test/cold-screen-hops.test.tsx`, 9/9 passing, confirming all four stay inside the
5-request budget for both "in page one" and "past the cursor" arrivals.

**The item this lane was told was outstanding was not real.** "Criterion 3, the triage
read that filters in JS" (`workers/content/src/lib/triage.ts`) was investigated by the
lane that produced the prior 93 score and refuted there — the SQL already carries `WHERE`
and `LIMIT`, and the JS `.filter()` reconciles two *different* databases (team-DB work
logs against core-DB membership), which cannot be one SQL statement. Re-verified against
current source: still true, nothing to fix. Do not hand this lead on a third time.

This round was run alongside four other review sessions (`lean_mean`, `story_checks_out`,
`error_log_review`, `spend`) coordinated by a `planner` session, in an isolated worktree
per the project's `.worktrees/<lane>` convention. Two of the findings below were sharpened
through that coordination — the planner challenged two conclusions with direct source
quotes, both were independently re-verified against current code rather than accepted or
dismissed on say-so, and one held in a way that changed the final score. That exchange is
folded into §2 rather than kept separate, because it changed a number, not just a
narrative.

---

## 1 · Scorecard

| # | criterion | method | score | weight | contribution |
|---|---|---|---|---|---|
| 1 | Hops per action are counted and bounded | coverage · **GATE** | **100** | 15 | 1500 |
| 2 | No question is asked twice | defect | **100** | 13 | 1300 |
| 3 | Fetch the row, not the list | defect | **85** | 13 | 1105 |
| 4 | Nothing already in hand is fetched again | coverage | **90** | 12 | 1080 |
| 5 | No request per row | defect | **85** | 12 | 1020 |
| 6 | Independent calls run together | defect | **93** | 11 | 1023 |
| 7 | A write updates in place | coverage | **100** | 9 | 900 |
| 8 | The payload is shaped for the screen | coverage | **70** | 6 | 420 |
| 9 | First paint does not wait for everything | coverage | **100** | 5 | 500 |
| 10 | Someone has measured it | coverage | **100** | 4 | 400 |
| | | | | **100** | **9248** |

```
audit total = 9248 / 100 = 92.48  ->  92
gate:  criterion 1 = 100, well above the 40 floor -> no cap
with the fix in §3: criterion 3 85->100, criterion 6 93->100
  (15x13 + 7x11) / 100 = 2.72
  92.48 + 2.72 = 95.2 -> 95
```

### The arithmetic and evidence behind each score

**1 · hops — 100.** `35` busiest ≤5 (confirmed live: ticket/meeting/account/process all
land at 3–5 requests cold, both arrival types, `cold-screen-hops.test.tsx` 9/9) + `25`
median 1–2 (probe: `hopsPerUnit.median = 1`) + `20` a budget is written down
(`MAX_REQUESTS_BEFORE_FIRST_PAINT = 5`, `shared/workers/limits.ts:960`) + `20` ≤3 services
(busiest cold path reaches two workers behind the gateway). The four probe entries over
budget (`togglePerson` 11, `saveStep` 8, `use-active-team.load` 6, `disconnect` 5) were
each hand-read: all four are the same probe artefact — calls from different, mutually
exclusive branches (an if/else write, or per-click handlers on different rows) attributed
to one "nearest enclosing function." None fires more than 1–2 calls per actual click.

**2 · duplicates — 100.** 18 probe groups, every one read. All are one of: a write
immediately followed by a deliberate refetch of its own `…/active` cache key (not a
duplicate — a read confirming its own write), or two independent, mutually-exclusive
branches (activate vs. deactivate; a `FilePicker` per form field) matched by the probe on
a shared URL substring. Zero same-request-fired-twice cases found.

**3 · overfetch — 85.** All 13 mechanical probe hits (3 in `scripts/`, the rest cron or
admin-batch paths with their own `WHERE`+`LIMIT`) are clean. The `-15` (high — "a list
endpoint called to render a single record's detail") is a real, hand-found pattern the
probe's regex cannot see, present with two different shapes:

- **Tickets and meetings** (`help-detail.tsx:109-135`, `meeting-detail.tsx:98-107`): the
  by-id read is *gated* behind the list read resolving —
  `useCached(listQ.data !== undefined && !inPage ? oneKey : null, ...)`. On a cold deep
  link to a record NOT in the cached page, this is two round trips *in series*: the
  screen cannot even start the read it actually needs until the (unnecessary, for this
  purpose) list request finishes. The comment at `help-detail.tsx:112-129` documents why
  the by-id read exists at all — a real incident, 26 Aug 2026: a ticket 1,030 of 1,820
  was reported "no longer exists" because the only lookup was a `find` over the newest
  fifty rows. **The by-id read is a correctness fix and must never be removed** — the
  fix here is ordering, not deletion.
- **Knowledge-source detail** (`knowledge-detail.tsx:62-79`) is a *different, better*
  pattern and is not part of this finding: the by-id read fires unconditionally, in
  parallel with the list, and wins (`item = oneQ.data ?? inPage ?? null`). It already
  satisfies R38 and matches the documented "list cache as detail source" trap in
  EDGE-CASES.md. Its own narrower residual is in §3a.

One clustered finding for tickets+meetings (same pattern, same fix), one separate,
narrower finding for knowledge-detail.

**4 · reuse — 90.** `shared/web/store.ts` (611 lines, `MAX_CACHE_AGE_MS`,
stale-while-revalidate) and the list/detail column splits (`knowledge.ts`
`LIST_COLS`/`DETAIL_COLS`, `stories.ts` `STORY_LIST_COLS`/`STORY_COLS`) both confirmed
present. Ten of these points are structural — R38 requires a by-id read rather than
trusting a loaded list row, which is correct and caps this criterion by design.

**5 · nplusone — 85.** Probe: 30 hits, zero in application/worker code (all 30 are
`scripts/` — several new from the knowledge-base tooling: `google-sweep.mjs`,
`rechunk-stale-passages.mjs`, `wipe-knowledge.mjs`, none of them a user's click). The one
real per-row loop is the import's per-row gated write (`import-batch.ts` `confirmBatch`),
kept deliberately for the audit trail and per-row rejection report — already scored down
from critical to high for that reason, unchanged.

**6 · parallel — 93.** This is the number that moved. 12 probe waterfalls, all 12 hand-
verified false positives (mutually-exclusive branches or genuine dependencies — e.g.
`account-detail.tsx createContact`, where `linkPerson` needs the id `createAccount` just
returned; a textbook real dependency, not a waterfall). The prior measurement scored the
tickets/meetings list-before-by-id gate as a **minor** deduction here ("each call
genuinely feeds the next," −3). That no longer holds: `knowledge-detail.tsx` proves the
by-id read does not need the list's answer to fire — it only needs the record's id,
already known from the URL. The gate is a *choice* wearing the shape of a dependency, not
a real one, and the working alternative sits in the same codebase. Reclassified **medium**
("two calls, on a path the user hits often" — an emailed ticket link is about as common a
cold entry as this app has): `100 − 7 = 93`.

**7 · writeback — 100.** `refetchAfterWrite: []`, confirmed fresh. Ticket/story mutations
answer with the updated row and the client merges it; no full-page reload anywhere found.

**8 · payload — 70.** `20` (list doors still return whole rows — the ticket list sends
~31 fields for a row that draws three) + `20` (two modules make the list/detail split:
`knowledge.ts`, `stories.ts`) + `30` (R14 hard cap, machine-checked).

**9 · firstpaint — 100.** `40` cache-first store + `30` secondary panels gated on the
record existing (`have ? key : null`, confirmed pervasive including in new knowledge-
detail/meeting-transcript/record-map reads) + `30` no slow call holds the whole screen
blank (per-panel skeletons).

**10 · measured — 100.** `50` Server-Timing + `logIfSlow` (`shared/workers/timing.ts`) +
`30` a written target (`MAX_REQUESTS_BEFORE_FIRST_PAINT`, `LATENCY_BUDGET_MS`,
`MAX_D1_TRIPS_PER_DOOR`) + `20` checked more than once (`MEASURED_MS`, dated,
`scripts/speed-bench.mjs` last touched 2026-09-09 — a trend, not a single reading).

---

## 2 · What moved the score, and the correction that caused it

| | criterion | before this pass | after | why |
|---|---|---|---|---|
| a | 3 · overfetch | 85 | 85 | unchanged — confirmed real, same as the historical measurement |
| b | 6 · parallel | 97 (inherited) | 93 | reclassified minor → medium after comparing against knowledge-detail's working alternative |

Net before any fix: **93 → 92.** The triage correction removed a fix that was never
real; the criterion-6 reclassification found a cost that was under-counted, and the
second was bigger than the first.

The reclassification (b) came from a cross-session exchange worth recording in full,
because a review that shows only its conclusions — not the correction that changed one —
is less trustworthy than one that shows both. The planner challenged two conclusions with
source quotes:

- **Confirmed correct:** `knowledge-detail.tsx` is not the same defect as tickets/
  meetings — folded into §1 (criterion 3) and §3a.
- **Confirmed correct, and the consequential one:** `help:${teamId}` has another real
  owner (`tickets-collection.tsx`, via `helpKey()`) — a literal grep for the template
  string missed the wrapped call. This overturned an initial claim that a proposed
  cache-only-list fix couldn't transfer to tickets, and separately prompted the
  criterion-6 reclassification above.

And one correction ran the other way: the planner's own "the list read isn't wasted, it
backs the breadcrumb and tab badges" framing was checked against `web/components/deep-
link/crumbs.ts` and found true for meetings (`RECORD_FACE.meetings` has `list:
"meetings"`) and **false for tickets** (`RECORD_FACE.tickets` has no `list` key, on
purpose, with its own stated reason — `namedByList` returns `""` for any module without
one). The criterion-3/6 rescore was never grounded in the breadcrumb argument regardless
(it rests on the reads no longer being sequential, the same basis knowledge-detail was
already scored clean on), so this didn't move the score either way — but the asymmetry
was real and is now fixed upstream (`docs(screen-data): two comments disagreed about one
behaviour`).

---

## 3 · The fix — built, tested, gate-verified, merged

**What changed:** in both `help-detail.tsx` and `meeting-detail.tsx`, the by-id read's
cache key changed from `listQ.data !== undefined && !inPage ? key : null` to `!inPage ?
key : null` — it no longer waits for the list to resolve before even starting. Both
screens' loading-gate conditions were updated the same way, so painting no longer waits
on the list once the by-id read has already answered. Neither the by-id read nor the
`inPage ?? oneQ.data` precedence was touched.

**Proof, not assertion:** `cold-screen-hops.test.tsx` gained two new tests that give the
list door a genuine multi-second `setTimeout` delay (a resolved-Promise delay would pass
for the wrong reason) and assert the record still paints well inside that delay. Against
the pre-fix code: both fail by timeout. Against the fix: both pass. The full existing
9-test hop-budget census stays green — the "in page one" arrival now also fires a
wasted-but-parallel by-id read (the same trade-off `knowledge-detail.tsx` already
accepts), landing at exactly the 5-request budget, not over it.

**One unrelated-looking fix this required:** `web/test/one-black-chip.test.ts` failed
after the code change — not a new violation, but the comment lines added above two
pre-existing, already-exempted lines (`REF_AS_STRING_OK`, a registry that pins exemptions
**by line number**) shifted those lines by 9. Re-pinned both, following the exact
convention the registry's own comments already document doing twice before (7 Sep 2026).
Caught only because the full gate was run, not just the targeted test.

**Two further changes were investigated and deliberately NOT shipped, both to full
verification, not left half-checked:**

- A "make the list read cache-only" (`useCachedValue` instead of an actively-fetching
  `useCached`) idea turned out to be safe on its own terms but achieve nothing:
  `web/lib/use-screen-data.ts` already fetches each module's list unconditionally
  whenever ANY screen in that module is open — list or detail — gated on
  `module === "tickets"` or `onScreen("meetings"/"knowledge")`, and `loadShared`'s
  `inFlight` map already dedupes a detail screen's own redundant copy into the same
  request. There was no second asker to stop. (Confirmed independently by the planner
  before either of us trusted it.)
- A `??` precedence flip (`oneQ.data ?? inPage` instead of `inPage ?? oneQ.data`,
  matching `knowledge-detail.tsx`) was built and red/green tested — proven safe
  (`TICKET_COLS`/`MEETING_COLS` are the identical column list on both the list and
  by-id doors on both screens) — then reverted, because with the cache-only idea
  dropped there was no problem left for it to solve, and a diff should show for
  something.

Neither omission cost score: 95 stands on the sequencing fix alone.

### 3a · The narrower, separate finding: knowledge-detail's list read

`knowledge-detail.tsx:62-79`'s `sourcesQ` is correct in shape (parallel, non-blocking) but
is a *fetching* read, not cache-only, so a cold deep link still pays for a full list
request that exists only to paint four fields (title/kind/filing/state) slightly earlier
than the by-id read would anyway. A `useCachedValue(knowledgeKey(teamId))` swap looked
free — the knowledge list screen is confirmed as this key's sole other fetcher — but per
the finding above, `use-screen-data.ts`'s `onScreen("knowledge")` prewarm likely makes
this equally moot without a fresh check. Not verified further this round; noted for
whoever picks it up next.

---

## 4 · Gate

Final state, `e446f4ef` on `origin/fix/round-trip-to-95`, rebased onto `main` at
`019148d1`, read unpiped:

```
EXIT=0
```

| workspace | Test Files | Tests |
|---|---|---|
| kwapso-auth | 21 passed (21) | 224 passed (224) |
| kwapso-tenancy | 77 passed (77) | 1,009 passed (1,009) |
| kwapso-content | 97 passed \| 1 skipped (98) | 1,240 passed \| 3 skipped (1,243) |
| kwapso-data-ops | 40 passed (40) | 427 passed (427) |
| kwapso-mcp | 13 passed (13) | 609 passed (609) |
| kwapso-realtime | 5 passed (5) | 90 passed (90) |
| kwapso-gateway | 11 passed (11) | 100 passed (100) |
| kwapso-portal-gateway | 2 passed (2) | 49 passed (49) |
| kwapso-web | 146 passed (146) | 1,234 passed \| 8 skipped (1,242) |
| kwapso-portal-web | 12 passed (12) | 96 passed (96) |

**5,078 passed, 11 skipped, 0 failed.** 9 of 11 skips are worktree-only artefacts (3
Glide backfill needing `glide/normalised.json`; 6 build-output "splash bytes" tests
needing `web/out`/`web-portal/out`), 2 skip by design everywhere (`REQUIRE_EXPORT=1`
export tripwires). `5,078 + 9 = 5,087` — matches the primary checkout's own count (5,085
passed + 2 skipped) plus this fix's 2 new tests, exactly.

**Verified a second time by the merging session, independently, with its own mutation
test**: reverted `help-detail.tsx`/`meeting-detail.tsx` to the pre-fix source, re-ran only
the two new sequencing tests — both failed by timeout (1,538ms and 1,555ms against the
`PAINT_MUST_BEAT_MS` ceiling), confirming failure-by-timeout rather than failure-by-count.
Restored the fix, both passed. Then merged: `main` `a5b3b52c`, gate re-confirmed there,
exit 0, 5,085 passed + 2 skipped.

---

## 5 · One finding this lane did not fix, flagged for a separate task

`meeting-detail.tsx`'s loading-gate is missing the `&& !oneQ.error` clause
`help-detail.tsx`'s equivalent has — so if a meeting's by-id read errors while the meeting
isn't in the cached list page, the screen spins on a loading skeleton forever instead of
reaching an error state. Pre-existing (not introduced by this fix, not a regression), but
sitting in a file this lane was already editing. Filed as a standalone follow-up
(`task_f4db0ba8`) rather than folded into this lane's diff — it's a correctness bug, not
a round-trip one, and the two shouldn't be reviewed as one change.

---

## 6 · One-sentence verdict

**Opening a ticket or a meeting from a cold link (an email, a bookmark, an old triage
queue entry) cost one more round trip than it needed to, in series rather than in
parallel, for a reason that turned out to be a choice rather than a requirement — proven
by a third screen in the same codebase already doing it correctly. Fixed, tested,
verified twice independently, merged.**
