# Concurrency & scaling

Lean cross-index for the `lean_foundation` score. Judges whether the system holds up under a
contended write, a growth curve, and a surge, not just the demo load. See
`~/.claude/skills/criterion-review/criteria/06-concurrency.md` for the full rubric. Source of
truth for every law remains RULES.md + `shared/rules/registry.ts`.

- **R14** — No list/search endpoint is unbounded, and a collection that grows with use pages by an opaque cursor instead of a hard `LIMIT`. (check: `bounded-lists`, enforced)
- **R17** — A deactivate/reactivate write carries the current-status predicate and reads back the changed-row count; zero rows moved writes no duplicate activity row. (check: `idempotent-transitions`, enforced)
- **R38** — A screen showing one record of a paged, growing collection reads it by id, never by finding it inside the loaded (and possibly incomplete) cached page. (check: `details-ask-the-door`, enforced)
- **R99** — A record can't close (a story done, a ticket resolved or archived) while one of its own time logs is still running; the door refuses and the UI mirrors the refusal. (check: `no-close-while-timer-runs`, enforced)
