# Code hygiene, workflow & documentation

Lean cross-index for the `lean_foundation` score. Judges whether the docs agree with each other
and with the code, whether stated guarantees actually hold, and whether a newcomer can navigate
the doc set without help. See `~/.claude/skills/criterion-review/criteria/12-hygiene.md` for the
full rubric. Source of truth for every law remains RULES.md + `shared/rules/registry.ts`.

- **R57** — `web/components` has no top-level files; every component sits in a module or kind folder the README describes. (check: `component-folders`, enforced)
- **R58** — Any path this repo names in a document, a comment or a string must actually resolve on disk, or be marked gone on purpose. (check: `named-paths`, enforced)
- **R73** — A law's reviewed exceptions (a deny-list) live as data in the registry, never as a `const` declared inside the test file that reads it. (check: `registry-backed-exemptions`, enforced)
