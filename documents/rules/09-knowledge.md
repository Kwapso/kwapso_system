# Knowledge & retrieval

Lean cross-index for the `lean_foundation` score. Judges whether the right search mechanism was
picked per screen ("what do we know about X" vs. "find this row"), and whether a person can tell
which one they're getting. See `~/.claude/skills/criterion-review/criteria/09-knowledge.md` for
the full rubric. Source of truth for every law remains RULES.md + `shared/rules/registry.ts`.

- **R23** — A knowledge-base answer never writes prose from nothing: retrieval hands back passages and their sources in one seam, and no citation means no passage and an honest "don't know" instead. (check: `cited-answers`, enforced)
- **R26** — The knowledge base's vector search is tenant-partitioned by namespace and returns only ids/scores, never readable content; every passage is read back under the caller's own database fence. (check: `vector-fence`, enforced)
- **R42** — Every accepted knowledge-source type resolves to a declared, ordered list of readers (or an honest "unreadable" entry) in one shared table both the upload door and the Drive lane consult. (check: `declared-readers`, enforced)
- **R68** — A knowledge source's identity is computed by one shared seam, so the same external item (a shared Drive folder, say) never files as two separately-embedded sources. (check: `one-identity-per-source`, enforced)
- **R69** — A knowledge-source sighting is written only through the guarded seam that keeps its denormalised visibility copy in sync, never a raw write that can leave the access fence stale. (check: `guarded-sighting-writes`, enforced)
