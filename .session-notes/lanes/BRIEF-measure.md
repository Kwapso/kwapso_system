# BRIEF — a MEASURING agent, one review, one commit

You measure ONE review score on ONE commit of the Kwapso System and report it. You change
nothing. You are given `<REVIEW>` (e.g. `speed`) and `<COMMIT>` by the planner (this run: d2e50c8f).

## Rules
- Work in the PRIMARY checkout `/Users/alaap_kanchwala_apple/Desktop/kwapso_cpaa`, read-only.
  Do not create a worktree (a worktree cannot run 9 of the tests and some probes need
  `documents/`, `glide/normalised.json` and `web/out`, which only the primary has). First
  verify `git rev-parse HEAD` equals `<COMMIT>`; if not, STOP and report the mismatch —
  a measurement is evidence about a commit, and the wrong commit is worthless.
- Read `~/.claude/skills/<REVIEW>_review/SKILL.md` in full and follow it exactly, including
  its probes under `assets/`. The prior measured report for this review is in
  `.session-notes/reviews/` — read it for the criteria map, then MEASURE FRESH; do not carry
  a number forward.
- **Probes have been wrong ten times this month.** Where a probe's number disagrees with the
  source, census the source, override, and say so with the command. A zero is a claim and
  needs the same proof as a number (grep a sentinel that MUST match before trusting a grep
  that returns 0). Canary every history read (`git show <commit>:<file> | wc -l`).
- Read any test run by exit code unpiped. Itemise before you total.
- No neuron spend. No deploy. `cf-exec` on any Cloudflare read. Never write to the live store.
- Rule 5 of the reviews: a smaller true number beats a larger convenient one.

## Report → `/Users/alaap_kanchwala_apple/kwapso-lanes/REPORT-measure-<REVIEW>.md`
1. `<REVIEW>_review — <score> / 100` at `<COMMIT>`, with the full criteria table (score ×
   weight = points, Σ, ÷100, rounding) recomputable line by line.
2. Every probe field you overrode, and why, with the command.
3. For every criterion under 100: what it costs, and the SMALLEST change that would move it
   (one line each) — this is what the planner acts on if the score is under 95.
4. Canaries that fired.
Return the report's full text as your final message.
