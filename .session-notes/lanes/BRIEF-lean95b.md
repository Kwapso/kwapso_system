# BRIEF — lane `lean95b` · branch `fix/lean-95-second` · worktree `~/kwapso-lanes/lean95b`

Read `/Users/alaap_kanchwala_apple/kwapso-lanes/LANE-COMMON.md` first and obey it.

## Goal
`lean_mean_review` from **94 to ≥95**, measured fresh with
`~/.claude/skills/lean_mean_review/SKILL.md`.

**A first lane claimed 95; an independent measurement at `d2e50c8f` says 94**
(`~/kwapso-lanes/REPORT-measure-lean.md` — read it in full, it is your map). It also refuted
that lane's reasoning: the first lane thought Scalability alone decided 94 vs 95, and the
arithmetic says that dimension would need **98** to get there. So this is not a rounding
argument. Real work moves it, and the measurement named which.

Current dimensions: Size 90 (.10) · Robustness 96 (.20) · Documentation 93 (.14) ·
Understandability 93 (.17) · Leanness 94 (.13) · Scalability 93 (.13) · Order 96 (.13).
`0.10×90 + 0.20×96 + 0.14×93 + 0.17×93 + 0.13×94 + 0.13×93 + 0.13×96 = 93.82 → 94`.
**You need about +0.7. The items below are worth ~+1.8 together, so you do not need all of
them — take the ones that are honest.**

## The items the measurement named, with what each is worth

1. **Documentation 93 → 95 (+0.28).** Four dangling `web/components/<file>.tsx` references
   in `documents/` (`BUILD-A-MODULE.md:43`, `COMPOSITION-MISMATCHES.md:259`,
   `CONTROL-SWAP-LANES.md:111`, `NEEDS-A-SPEC.md:99–100`). **All four were already stale
   before the folder fold** — do not report them as fold damage. Fix them, then add the
   ~12-line test that greps `documents/**` for `web/components/**.tsx` and asserts each
   resolves, which retires the class. Also correct CLAUDE.md's overstated claim that "every
   law that reads components off disk goes through `sourceFiles()`" — five files hold literal
   `components/<folder>/<file>` paths.
2. **Robustness 96 → 98 (+0.40).** Nothing checks that a **path inside a comment** resolves;
   the fold left one and a human found it, not a check. Extend the `@/components` specifier
   census in `web/test/source-scan.test.ts` to comment text as well as import statements —
   the walk is already there.
3. **Understandability 93 → 95 (+0.34).** The taxonomy has two axes: `home-screen.tsx` is in
   `screens/` but `tickets-screen.tsx` is in `tickets/`; `collection-heading.tsx` is in
   `records/` but `collection-content.tsx` is in `deep-link/`. A newcomer must read the rule,
   not guess it. Write `web/components/README.md`: one line per folder saying what belongs
   there. Cheaper and better than moving anything — **do not re-home components.**
4. **Scalability 93 → 95 (+0.26).** The taxonomy is documented and **unenforced**, in a repo
   with 52 machine-checked laws. Add a rule test: `web/components` has zero top-level files,
   and every subfolder is in the documented set. Turns a convention into a law.
5. **Leanness 94 → 96 (+0.26).** Four real near-duplicate pairs. The biggest is
   `tickets/help-attachments.tsx` ↔ `work/story-attachments.tsx` (74 duplicated 8-line
   windows) — fold into one `<RecordAttachments>` in `records/`. **Leave
   `money/account-rate-card.tsx` ↔ `money/internal-rate-card.tsx` alone: they are separate by
   R24's ruling** and folding them would breach a law.
6. **Size 90 → 92 (+0.20).** 94 app-owned files exceed 600 lines. The worst is
   `web/test/rules.test.ts` at **4,167 lines** holding many laws. Split it by law family into
   `web/test/rules/*.test.ts` — the suite loads by glob, so it is a move, not a rewrite.
7. **Order is already 97, not 96** — the planner deleted the six merged remote branches on
   7 Sep after the measurement. Re-measure it; do not redo it.

## Do not
Touch `shared/ui/`. Deploy. Spend neurons. Change UI, copy or behaviour — `shared/i18n-strings.json`
must stay byte-identical (if `i18n-extract` reports a change, something moved that should not
have). Re-home components (item 3 replaces that with a README).

## Report
The seven-dimension table recomputed at your tip with the arithmetic and each dimension's
basis; for every dimension you moved, the measured before/after of the thing that moved it;
`npm run check` exit code unpiped with per-workspace lines.
**Judge honestly — a previous lane's self-judgement was one point optimistic and an
independent pass caught it.** If it lands at 94, say so and say why.
Write `/Users/alaap_kanchwala_apple/kwapso-lanes/REPORT-lean95b.md` AND return its full text.
