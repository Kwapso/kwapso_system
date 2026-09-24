# Accountability & history

Lean cross-index for the `lean_foundation` score. Judges whether a record change, through the UI,
an agent, or an API, gets written down, and whether that stays true whichever door it came
through. See `~/.claude/skills/criterion-review/criteria/04-accountability.md` for the full
rubric. Source of truth for every law remains RULES.md + `shared/rules/registry.ts`.

- **R5** — Every module's record history is read back through one generic `(table, id)` path; no module writes its own per-table activity read SQL. (check: `generic-activity-path`, enforced)
- **R18** — See `03-security.md`: the same activity-feed rights-subtraction also is this file's concern, since it's the audit trail a reader sees. (check: `activity-gate-coverage`, enforced)
- **R30** — Every outbound branded email is classified as record-related or not; a record-related one carries its way back to that record through one shared link helper. (check: `linked-emails`, enforced)
