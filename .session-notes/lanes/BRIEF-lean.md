# BRIEF — lane `lean` · branch `fix/lean-95` · worktree `~/kwapso-lanes/lean`

Read `/Users/alaap_kanchwala_apple/kwapso-lanes/LANE-COMMON.md` first and obey it.

## Goal
`lean_mean_review` from 93 to ≥95, measured fresh with its SKILL.md. Start from
`.session-notes/reviews/4-tidiness-measured.md` §1 — seven components, each with its basis.
The owner knows this is the least certain of the seven scores; if it lands at 94 say exactly
why, with the arithmetic. But the levers are real:

## One folder costs three components
`web/components` is **148 files / 52,410 lines in one flat folder**, docked in Size (88),
Understandability (91) and Scalability & Structure (91). Fold it into subfolders by module
or kind (tickets/, sprints/, records/, shell/, forms/, …) with a **codemod** that rewrites
every import specifier and resolves each new specifier against the disk before writing it
(model: `scripts/kit-layout-codemod.mjs`). **Then prove nothing went blind**: a dozen tests
and scripts census `web/components` off the disk (`web/test/rules.test.ts`, `reachable-bytes`,
`in-app-anchors`, `scripts/lib/i18n-source.mjs` `appFiles()`, `shared/rules/source-scan.ts`,
`kit-coverage`, `doc-claims`…). For each, record the file count it reports BEFORE and AFTER the
move; any that drops is a census that does not recurse, and you fix the census, not the
layout. A green build after a move that blinded a check is the exact failure this repo
catalogues; the counts are the proof.

## The other levers
- **Leanness 93: 21 dead value exports.** Find them with a census (an export nothing imports,
  tests excluded), delete them, keep the census as a test if cheap.
- **Size 88: 89 app-owned files over 600 lines.** Split the worst where a seam is obvious
  (a screen's tabs into files, a lib's read/write halves) — no behaviour change, imports
  rewritten, each split its own commit.
- **Order 95 → 98.** The planner deleted 229 local and 18 remote merged branches on 7 Sep;
  re-measure it, do not redo it.
- **Docs 93** is judged; do not chase it.

## Do not
Touch `shared/ui/`. Change behaviour, UI or copy (a pure move must not touch
`shared/i18n-strings.json` — if extract reports a change, something moved that should not
have). Rename a file's basename (only its folder). Spend neurons.

## Report
The seven-component table recomputed at your tip; the before/after census counts for every
disk-reading check; the list of deleted exports; the split files with line counts.
