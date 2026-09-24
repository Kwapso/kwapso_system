# Architecture & boundaries

Lean cross-index for the `lean_foundation` score. Judges whether the system's shape answers
cleanly if a service were deleted, its data lost, or a request traced end to end — dependency
direction, blast radius, environment parity, and whether the next module is cheap to add. See
`~/.claude/skills/criterion-review/criteria/01-architecture.md` for the full rubric. Source of
truth for every law remains RULES.md + `shared/rules/registry.ts`; this file only regroups the
existing ids by what they actually govern.

- **R13** — Every module either registers as an import TargetDef or carries a reviewed exemption, and the catalogue self-heals against the code so a fresh environment's picker is never empty. (check: `catalog-coverage`, enforced)
- **R37** — The whole post-auth app is one client-resolved shell; in-app links use soft navigation so a click never re-mounts the shell or drops the live cache. (check: `in-app-anchors`, enforced)
