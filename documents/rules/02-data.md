# Data model & state

Lean cross-index for the `lean_foundation` score. Judges whether two copies of the same fact can
disagree, whether live data can be recovered, and whether the schema holds up as real tables
grow. See `~/.claude/skills/criterion-review/criteria/02-data.md` for the full rubric. Source of
truth for every law remains RULES.md + `shared/rules/registry.ts`.

- **R55** — A record's reference id is produced by one formula (a JS function and its SQL twin, proved to agree by running both), never rebuilt ad hoc by a caller. (check: `refs-match-the-formula`, enforced)
- **R76** — A protected (default) row is always treated as active; there is no valid state where something is both protected and deactivated. (check: `protected-is-active`, enforced)
