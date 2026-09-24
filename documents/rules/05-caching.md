# Caching & live sync

Lean cross-index for the `lean_foundation` score. Judges whether the client cache stays bounded,
fresh, and scoped to what the viewer is actually allowed to see. See
`~/.claude/skills/criterion-review/criteria/05-caching.md` for the full rubric. Source of truth
for every law remains RULES.md + `shared/rules/registry.ts`.

- **R1** — Every mutation route publishes a live-change ping, so open screens patch the changed row instead of going stale. (check: `publish-seam`, enforced)
- **R7** — Every form dialog persists its draft per browser session, so unsaved input survives navigating away and back. (check: `forms-persist-drafts`, enforced)
- **R15** — Every resource string a worker publishes must reach a registered listener or a reasoned exemption; no ping fires into the void. (check: `live-collections`, enforced)
- **R56** — A component asks a given cache door once; a repeated read of the same key inside one component is a finding, not a free second network trip. (check: `one-door-per-unit`, enforced)
