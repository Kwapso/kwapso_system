# lean_mean_review — kb_REVIEW, 11 Sep 2026

Target: clean checkout, `.worktrees/kb-review` on branch `review-trio`, `origin/main` @ `d308ddfb`.
Review only. No repairs applied, no files touched outside this report.

## Corpus trust check (guard c)

`git ls-files | wc -l` = **3211** tracked files (42 under `documents/`).
`probe.mjs`'s own `totals.files` = **3212**. Off by exactly 1 (the one untracked scratch file,
`.plans/kb-exam-draft.md`, per `git status`). **TRUSTED** — this is a real, near-exact match, not
a blind probe.

`documents/` produced zero individual findings (no duplicate/orphan/naming/placement hit inside
it), but its 42 files are inside the total count above, so the walker opened them — it did not
skip the directory. I could not fully rule out that placement/naming rules are *scoped* to source
directories only and simply have nothing to say about a clean docs tree; either explanation is
consistent with what the probe returned. Flagging as a residual uncertainty, not a failure.

## Guards (a), (b) — already fixed in this probe version

- **(a) `.worktrees` exclusion**: `probe.mjs` line 25's `IGNORE_DIR` set includes `.worktrees`
  explicitly ("caught at any depth"), plus a separate legacy-path skip for `.claude/worktrees/`.
  Confirmed by inspection before running — the 3212 total is consistent with one copy of the repo,
  not nine.
- **(b) remote-branch git call**: uses `execFileSync('git', args, ...)` (no shell), not the old
  `execSync(cmd)` that silently died. Confirmed it returns real data: `remote.available: true`,
  `branchCount: 44`, a non-empty `mergedNotDeleted` list. Not a silent empty result.

## Part B — Order & Organisation (computed), full arithmetic

| # | Criterion | Raw probe data | Penalty/score | Weight | Weighted |
|---|---|---|---|---|---|
| 1 | duplicates | 1 exactGroup (`web/next-env.d.ts` ≡ `web-portal/next-env.d.ts`, 5 LOC, Next.js boilerplate), 0 near/similar | −15 (1 high) → **85** | 16 | 1360 |
| 2 | versions | hard=0, soft=0, flagged=1 (`shared/web/use-form-draft.ts` — "draft" in the name, a draft FORM per the skill's own worked example, not a leftover) | −3 → **97** | 14 | 1358 |
| 3 | orphans | scope=563, found=1 (`db/core/0021_retention_scan_indexes.sql`), reachablePct=99.8 | **99.8** | 13 | 1297.4 |
| 4 | fragmentation | dirs=[], count=0 | **100** | 11 | 1100 |
| 5 | naming | conformingPct=100, 0 dirs with 3+ styles | **100** | 10 | 1000 |
| 6 | placement | testLayout mixed but dominantPct=99.8 (≥90 → minor) → −3; synonymDirs=[] | **97** | 10 | 970 |
| 7 | root | clutter=[] (0); looseDocs=[AGENTS.md, CLAUDE.md, RULES.md] = exactly 3, none beyond the third | **100** | 8 | 800 |
| 8 | debris | count=0 | **100** | 7 | 700 |
| 9 | history | gitRepo=true, copyThenEdit=[] | **100** | 6 | 600 |
| 10 | remote | mergedNotDeleted=13 branches → 13×3=39, capped at 30; stale=[] | **70** | 5 | 350 |

Sum of weighted = 9535.4 → **ORDER = round(9535.4/100) = 95**.
Gate check: duplicates score (85) is not below 40, so the cap does not apply.

The one real deduction worth a human's attention: 13 merged-but-undeleted remote branches,
including `origin/fix/kb-gate` (the fence/fold-writer branch I reviewed the last two rounds,
now merged) and several `docs/*` branches. Housekeeping, not a defect in the code itself.

## Part A — the six judged dimensions

**Scope of this judgment**: informed by scan.py's signals below AND by direct, first-hand reading
done across this session — `workers/content/src/lib/knowledge.ts` (4016 LOC), `knowledge-google.ts`,
`knowledge-identity.ts`, `workers/tenancy/src/team-schema/migrations.ts` (5792 LOC, read in large
sections), several test files (`knowledge.test.ts`, `knowledge-fence.test.ts`, `google-ingest.test.ts`,
`knowledge-identity.test.ts`), `CLAUDE.md`, and `RULES.md`'s registry excerpts. This is substantial
but not an exhaustive file-by-file audit of a 1430-file, 468K-LOC monorepo — treat the six scores
below as a grounded sample, not a full census the way Order's numbers are.

**Signals from scan.py**: 1430 code files, 468,782 code LOC; test_to_code_ratio 32.2% (461 test
files); comment_ratio_pct 32.5% (152,491 comment lines); duplicate_ratio_pct 4.8% (22,307 duplicate
extra code lines); 67 TODOs; `docs.has_readme: true` but `docs.readme` reports `scripts/README.md`
— a probe artifact (it appears to take whichever `README*` it walks last rather than preferring
root), not a real finding: the root `README.md` exists, is 497 lines, and is exactly what
`CLAUDE.md` names as the doc-map entry point. Corrected here rather than reported as a defect.

### 1. Size / Scope — 90/100
Large (1430 files / 468K LOC) but the scale tracks a stated, real remit: 8 backend workers, 2 full
front-end apps, a vendored design kit, and tooling — not padding. `shared/ui/foundations/icons/
icons.generated.tsx` (13,620 LOC) and `icon-art.manifest.json` (7,568 LOC) are the two biggest
files and both are GENERATED, not authored — scan.py counts them at face value, which slightly
overstates hand-maintained size. Deduction for `workers/content/src/lib/knowledge.ts` at 4016 LOC
carrying the entire retrieval/routing/fence surface in one file — a single-file concentration of a
lot of independently-changing logic (confirmed by having personally watched three separate PRs
land inside it this session alone).

### 2. Robustness — 89/100
Strong, evidenced patterns I saw directly and repeatedly tonight: fetch timeouts (R11), idempotent
state transitions with zero-row silence (R17), a central `GuardError`→400 mapping so malformed
input never 500s, and — the one I adversarially tested myself — `execKnowledgeScript`'s hard-throw
guard against a stale `team_visible`, which genuinely refuses a malformed write rather than logging
and continuing. 32.2% test-to-code ratio is healthy for this size. Deductions, both real and both
found by me this session rather than inferred: (a) `appClause`'s admin/default-role bypass has zero
test coverage in either direction (`workers/content/src/lib/knowledge.ts`, `appClause`) — I proved
this by removing just that clause and getting 65/65 green; (b) the historical pattern of a security-
relevant function (`googlePresence`) shipping with every caller mocking it away rather than a real
test — since fixed, but its recurrence risk is a process gap, not a one-off.

### 3. Documentation — 96/100
Exceptional. `RULES.md` + `shared/rules/registry.ts` pin 69 named, machine-checked laws — I watched
several of these actually fire as red builds under mutation testing this session, which is a much
stronger form of documentation than prose. `CLAUDE.md` is a genuine, current entry point (not
stale — it accurately named every worker and law I checked it against). 76 doc files, 31,581 doc
LOC. No deduction found; this is the strongest of the six dimensions.

### 4. Understandability — 84/100
The extensive inline "why" comments genuinely helped me reconstruct design intent for code I'd
never seen before (I relied on them heavily to understand three different fence-design iterations
tonight) — that is real, working documentation-as-you-read. But it comes at a cost: functions like
`ownerClause`, `appClause`, `execKnowledgeScript`, and `teamVisibleRecomputeSql` each carry a
comment block 3–8× longer than the code it explains, so finding the actual logic inside a function
means scrolling past a small essay first, every time. Combined with `knowledge.ts`'s 4016-line
concentration, a newcomer's first read of this module is slow going even though every individual
decision is well-justified once found.

### 5. Leanness — 81/100
The dimension most in tension with this codebase's own stated values. `CLAUDE.md` states plainly:
"Default to writing no comments. Only add one when the WHY is non-obvious... If removing the
comment wouldn't confuse a future reader, don't write it." Measured reality: 32.5% comment ratio
across 468K LOC of code, and in every file I read closely tonight the comment-to-code ratio for
individual functions ran far higher than that average — the stated principle and the actual practice
disagree, consistently, not as an occasional lapse. Real duplication signal too: 4.8% duplicate
code lines (22,307 lines) per scan.py's line-level heuristic — I have not personally traced how much
of that is genuine copy-paste logic versus repeated SQL/boilerplate shapes scan.py's heuristic can't
tell apart, so I'm reporting the number as-measured rather than as fully diagnosed.

### 6. Scalability / Structure — 93/100
The strongest structural evidence I have is that I watched these constraints get ENFORCED, not just
described: R14 (every list capped, growing collections keyset-paged), R15 (every published resource
reaches a live listener or a named exemption), R16 (one counted seam), R26 (the vector index
namespaced per team, ids/scores only, nothing readable leaving it). These are load-bearing, tested
invariants, and they held up under my own mutation testing of the fence code this session. Minor
deduction: the same `knowledge.ts` concentration flagged under Size is also a scalability risk as
more retrieval arms get added — which is literally what has been happening, three times, this week.

## Part C — Overall

```
overall = round(0.10×90 + 0.20×89 + 0.14×96 + 0.17×84 + 0.13×81 + 0.13×93 + 0.13×95)
        = round(9.0 + 17.8 + 13.44 + 14.28 + 10.53 + 12.09 + 12.35)
        = round(89.49)
        = 89
```

**Overall: 89/100 — Grade B.** Recomputed once for a transcription check (I had an earlier
robustness draft of 91; corrected to 89 to match the reasoning above) — the arithmetic here is what
actually adds up.

**This is BELOW the gate's ≥92 bar, by 3 points.**

The gap is driven almost entirely by Leanness (81) and Understandability (84) — the two dimensions
where this codebase's famously extensive documentation style is simultaneously its greatest strength
(Documentation: 96) and a real, measurable cost elsewhere. Order itself (95) is not the problem.

**What is a real deduction vs. a probe artefact, stated plainly:**
- Real: the comment-density/leanness tension (measured, 32.5% ratio, consistent across every file I
  read).
- Real: `appClause`'s untested admin bypass — I proved the gap by mutation, not by inspection alone.
- Real: 13 merged-not-deleted remote branches (Order criterion 10, cheap to clean up).
- Artefact, not a finding: `docs.readme` pointing at `scripts/README.md` instead of the root — the
  root README exists and is substantial; scan.py's path-selection is just wrong here.
- Not independently re-verified: the exact proportion of scan.py's 4.8% duplication that is real
  logic duplication vs. boilerplate — reported as measured, not fully diagnosed.

## CORRECTION — 11 Sep 2026, after the hub challenged the sourcing

The hub grepped this repo for the sentence I attributed to `CLAUDE.md` ("Default to writing no
comments... only add one when the WHY is non-obvious") and got zero hits — its own grep was a false
negative (`grep -rn "a|b|c"` without `-E` searches for the literal pipe characters, not alternation),
but the challenge sent me back to the source, and on inspection **the hub's underlying doubt was
right and my citation was wrong**: that sentence is not in this project's `CLAUDE.md`. It is a line
from my own harness's system prompt (the generic Claude Code instructions I operate under), and I
misattributed it as this project's stated convention when I wrote Leanness and Understandability
above. This repo's actual, on-disk standard is `documents/CONVENTIONS.md` §9, "Comments, explain WHY,
not WHAT" — which explicitly *prescribes* what I penalised: "match the density of the surrounding
file: a shared seam gets a header paragraph," and separately states as a known, deliberate property
(not a defect) that "this repo comments densely, and its comments discuss the very seams [other
checks] read." `appClause`'s and `ownerClause`'s header comments — the ones I flagged as
disproportionate — are exactly shared-seam headers explaining a locked design decision, which is the
sanctioned case, not an anti-pattern (CONVENTIONS.md's actual anti-patterns are a comment that
*restates* the code, a *stale* comment, or one apologising for code that should be simpler — I did not
find, and did not report, any instance of those three in the functions I read).

**Re-deriving both dimensions against the real standard, not the one I invented:**

- **Leanness, 81 → 90.** The "tension with the codebase's stated values" argument is retracted in
  full — there is no such stated value to be in tension with, and CLAUDE.md's actual "stay lean"
  directive (prime directive #1) is explicitly about code, dependencies, tables and abstractions, not
  prose volume. What survives, because it is an independent, measured signal: scan.py's 4.8%
  duplicate-*line* ratio (22,307 lines), which I still have not personally traced to real logic
  duplication vs. repeated SQL/boilerplate shapes scan.py's heuristic can't distinguish. That alone
  does not justify an 81.
- **Understandability, 84 → 87.** The "codebase fails its own promise" framing is retracted for the
  same reason. What is NOT retracted, because it is a firsthand, felt observation independent of any
  rule: reading `ownerClause`, `appClause`, `execKnowledgeScript` and `teamVisibleRecomputeSql` cold
  did mean scrolling past a 3-8x-longer comment block before reaching the logic, every time, and that
  is a real (if deliberately accepted) cost to a first read regardless of whether the style is
  sanctioned. I am keeping a smaller deduction for that, reframed as a documented trade-off's real
  cost rather than a violation.

```
overall = round(0.10×90 + 0.20×89 + 0.14×96 + 0.17×87 + 0.13×90 + 0.13×93 + 0.13×95)
        = round(9.0 + 17.8 + 13.44 + 14.79 + 11.7 + 12.09 + 12.35)
        = round(91.17)
        = 91
```

**Corrected overall: 91/100, still BELOW the ≥92 gate, by 1 point instead of 3.** I want to be
explicit about something uncomfortable: 91 is one point shy of a bar the hub is watching, and I did
not pick 90/87 by working backward from that number — I picked them from the reasoning above, before
doing this arithmetic. A different, equally defensible reviewer could reasonably land anywhere from
~88 to ~93 on these two judgment-call dimensions; I'm not claiming false precision on either score.
What doesn't move regardless of exactly where in that range the truth sits: the practical answer is
unchanged — this codebase does not clear lean_mean's ship gate today, on the same evidence as before,
now measured against the right standard instead of a misattributed one. The **root cause of the
original 89** was a sourcing error on my part, not a disagreement about the code.
