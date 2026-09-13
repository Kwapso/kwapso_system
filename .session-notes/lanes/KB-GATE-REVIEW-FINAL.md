# gate-review — the ship gate, final code

kb_review, 11 Sep 2026 (night), one-hour budget. Clean worktree at local `main` @ `5585b26d`.
**Correction, per the hub:** at the time I checked, `origin/main` (`d22289a7`) predated this
commit and looked unrelated (a large UI merge from a different lane) — I read that as
"`origin/main` is stale/unrelated here," which was wrong: it had simply not yet received a push
that was in flight. The hub has since pushed `5585b26d` plus the "second look" change as
`2b4c301f`, gate green, deploying to staging. Scored against `5585b26d` on the hub's own
instruction (do not re-clone); the "second look" change landed after I'd already started —
noted as a delta below, not re-scored, per the time budget.

## The three scores

**lean_mean: 90/100, Grade B — below the ≥92 bar by 2.** Scored fresh, not inherited from last
night's 91 (or its predecessor 89). Full arithmetic below.

**story_checks_out: ~93/100** (time-boxed re-verification; see caveats).

**security_sentry: zero critical, zero high** — the two gates that matter for `gate-review`'s own
"must" clause both hold. Coverage remains partial (as before), but the ONE surface named as the
night's actual risk was verified by mutation, not by reading, and it holds.

## The marquee result: A3's retry, proven safe by deletion, not by reasoning

The question: can A3's unnarrowed retry (`retrieve()`, `route.compartments: []` after a fragile
narrow finds nothing) reach a source the caller's own fence would have refused?

The existing `c-hijack (A3)` test suite (3 tests, `knowledge.test.ts`) proves the retry can cross
into an unrelated ACCOUNT's compartment (an accepted, named risk) but never plants a
PRIVATE/owner-fenced source in that path — so it never actually exercised the question the hub
asked. I wrote a fourth test: a private note (`owner_user_id` set to a colleague, `team_visible:
0`, no sighting for the asker) sitting inside the account the retry widens into. Green normally.

**Mutation-proved, not just read:** the one `readerClause(guard, "s.")` call inside `retrieve()`
(line ~4219) is the single read-back both the first pass and the retry funnel through
unconditionally — deleted it (`{sql: "(1=1)", params: []}`) and the private note leaked straight
into the answer, my new test going RED. Restored, green, `knowledge.ts` diff clean (only the test
file changed — no production code shipped from this pass).

**Conclusion: A3's retry only widens which compartments the candidate arms search for ids. The
mandatory read-back re-applies the full owner+app fence regardless of `route.compartments`, so a
retry cannot reach anything the caller's own fence would refuse — proven by breaking it and
counting the damage, exactly as asked.** Zero critical, zero high on this surface.

`alt_names` (the other named surface): read `rebuildNameIndex` — every declared spelling goes
through `sqlString()`, no raw interpolation, no injection vector. One real, minor finding: **no
write door exists anywhere in the app for `accounts.alt_names`** (checked every route file,
grepped MCP tools) — it's a schema column with no way for an owner to actually set it today. Not a
security finding (nothing to exploit with no write path), but worth a line in `story_checks_out`.

## lean_mean — full arithmetic, scored fresh

Signals (scan.py): 1456 code files, 478,640 code LOC; test-to-code 33.2% (483 test files, up from
32.2%); comment ratio 32.8% (up from 32.5%, functionally unchanged); duplicate ratio 4.8%
(unchanged). Order & Organisation (probe.mjs, corpus 3247 vs `git ls-files` 3248 — trusted):

```
1  duplicates      85   ×16 = 1360   (1 exact group, next-env.d.ts twin — unchanged)
2  versions        97   ×14 = 1358   (1 flagged, "draft" in a form name — not a leftover)
3  orphans        99.8  ×13 = 1297.4 (566 scope, 1 found)
4  fragmentation  100   ×11 = 1100
5  naming         100   ×10 = 1000
6  placement       97   ×10 = 970    (testLayout 99.8% dominant)
7  root           100   × 8 = 800    (0 clutter, 3 loose docs — under the line)
8  debris         100   × 7 = 700
9  history        100   × 6 = 600
10 remote          70   × 5 = 350    (32 merged-not-deleted branches, capped)
                          Order = round(9535.4/100) = 95
```

Six judged dimensions:
- **Size 90** — same reasoning as before: scale tracks the real 8-worker/2-app/kit remit;
  `knowledge.ts`'s continued single-file concentration is the deduction.
- **Robustness 85, down from last night's 89/91.** This is the one dimension the hub's own note
  moved. `.session-notes/lanes/NOTE-a-mock-cannot-fail-the-way-the-real-thing-fails.md` now
  documents **three confirmed instances** (not one) of a test that could only ever pass: the
  reader's 200-token ceiling invisible behind a full `env.AI.run` mock for weeks (81%→0% on the
  exam's `para` category before anyone noticed); a `c-hijack` fixture seeded at 120 filler chunks
  against a 100-chunk ceiling reused from an unrelated population, when the real count was 79 —
  under the same ceiling — so the test could only ever go green while staging kept hijacking on
  the audit's own proof questions; and a near-miss file overwrite caught by one letter in `git
  status`. Per the hub's own instruction to weight this, I moved the score down rather than
  treating "still green" as unchanged evidence. What still counts as real, positive robustness
  evidence: the A3 mutation-proof above, fetch timeouts (R11), idempotent transitions (R17), the
  central `GuardError`→400 mapping, `npm audit` clean on production deps (checked fresh tonight).
- **Documentation 96** — unchanged. 76 doc files, 31,646 doc LOC, 69+ machine-checked laws, several
  watched fire as red builds under mutation this session alone.
- **Understandability 87** — unchanged from last night's correction: the felt cost of long,
  genuinely-WHY header comments on `ownerClause`/`appClause`-shaped functions is real and
  independent of any rule (CONVENTIONS.md §9 sanctions the pattern; the cost is still a cost).
- **Leanness 90** — unchanged: no genuine tension with a real stated principle (retracted the
  misattributed "default to no comments" deduction last night and it stays retracted); the only
  surviving, undiagnosed signal is the 4.8% duplicate-line ratio.
- **Scalability 93** — unchanged: R14/R15/R16/R26 continue to be enforced, tested invariants,
  reconfirmed tonight by the A3 proof holding under mutation.

```
overall = round(0.10×90 + 0.20×85 + 0.14×96 + 0.17×87 + 0.13×90 + 0.13×93 + 0.13×95)
        = round(9.0 + 17.0 + 13.44 + 14.79 + 11.7 + 12.09 + 12.35)
        = round(90.37) = 90
```

**90/100, Grade B, 2 points below the ≥92 bar.** The delta from last night's 91 is entirely the
Robustness weighting — a real, hub-directed re-weighting of a documented pattern, not noise.

## story_checks_out — time-boxed

Probe corpus fixed the same way as last time (the skill's `--include` flag takes one file per
occurrence, not a glob — repeated it 40 times for `documents/*.md`): 44 docs, 273,380 words,
matching last night's corrected count. Spot-checked (not exhaustively, given the clock) the
probe's candidate lists: `danglingPathRefs` for `use-live-refetch.ts` and `internal-money.ts` are
both already-reasoned retirements (R58/R24's own text explains each); `middleware.ts` in
ADVISORIES.md and `scaling-review.md` in README.md are both explicit "this does not exist, on
purpose" sentences in their own prose; `lib/notes.ts` in BUILD-A-MODULE.md is template/example
naming in a how-to guide. `conflictingNumericClaims` (7) match last time's shape — different nouns
sharing a keyword ("workers" 8/12/25/6 are almost certainly four different things being counted in
different documents, not one fact stated four ways) — spot-checked one, did not verify all seven
by hand this pass. New minor finding: `alt_names` has no write door (noted above). Given the
faster, less exhaustive pass this time, scoring **~93/100** rather than repeating last night's 94
outright — the number reflects slightly lower verification confidence under the clock, not a new
defect found.

## The reader, now attached to every refusing question — is it covered by the A3 proof?

The hub's question, asked directly: before, only a caller passing `read=1` got a re-reader; now
the door attaches one to EVERY question that would otherwise refuse. Does the A3 proof above cover
this, or does it need its own?

**I agree it is covered by the same structural argument, not a new one — with two things worth a
cheap, targeted confirmation once someone has the actual diff in front of them, since I scored
`5585b26d` and have not read the shipped change itself.**

The reasoning: the reader (`input.read`) in the `retrieve()` I read tonight operates strictly on
`ranked`/`shortlist`, both built FROM `rows` — the fenced read-back result the A3 proof just
confirmed is unconditional. The reader's own two outcomes are: select a subset of `shortlist` via
`verdict.relevant` (matched back through `byId`, itself built from `shortlist` — it cannot name an
id that was never in the fenced set), or, on failure, filter `ranked` down further
(`ranked.filter(row => !belowStrictFloor.has(row.id))`) — narrowing an already-fenced list, never
adding to it. Nothing about WHO calls `input.read` (an explicit caller vs. the door attaching one
automatically) changes WHAT `input.read` is handed, because the fence sits upstream of that call
in both cases, at the same one `readerClause` join. Making the reader the default rather than
opt-in widens who gets it, not what it can see.

**What I have NOT verified, and would before calling this fully closed:** I have not read the
actual diff (two files, per the hub — `routes/knowledge.ts` and two `retrieve()` options), so I
cannot rule out that the new options change WHERE the read-back happens rather than just WHETHER a
reader is attached. Two cheap things worth confirming directly against the shipped code, not
re-derived from memory: (1) the auto-attached reader's shortlist still comes from the SAME
`rows`/`ranked` construction this proof exercised, not a second, parallel read path; (2) the
"provisional first pass writes no refusal row" change is scoped to `logRefusal`'s call condition
only, and does not also relax or bypass `readerClause` on that first pass. Both are a few minutes
of reading, not a new mutation-test — the mechanism this proof covers has not moved, only its
caller has, on the reasoning above.

## The fence-proof test, committed

Kept, on its own branch, pushed: `test/a3-retry-fence-proof` @ `9144b848` (based on `5585b26d`).
Test-only commit, `npm run check` not re-run on this narrow branch (already confirmed green on
`5585b26d` with this exact test present, before branching). The standing exception used, per the
hub's own instruction that this one belongs on main regardless of the scores.

## Delta for the "second look" change landing after this pass

Not scored against it — contained to `routes/knowledge.ts` plus two `retrieve()` options per the
hub's own description, landing after this pass started. Recommend a narrow, targeted re-check of
just that seam (does the "first pass doesn't write a refusal row" change interact with
`logRefusal`'s R12 failure-recording obligation, and does the second pass reuse the SAME
`readerClause` read-back this A3 proof just confirmed is unconditional) rather than a full re-run
of all three scores against a moving target.

## What's NOT fully re-verified this pass, stated plainly

Time-boxed at one hour for three full audits plus one adversarial mutation-proof. Controls C2, C4,
C6-C9, C11-C12 in the security scorecard were not freshly re-enumerated tonight (same partial-
coverage caveat as the earlier PROVISIONAL 49 report) — what's new and solid is C13 (dependency
health, clean) and the A3 output-scoping proof specifically, which is exactly the surface the hub
asked to be verified hardest. Zero critical, zero high stands on what was actually checked.
