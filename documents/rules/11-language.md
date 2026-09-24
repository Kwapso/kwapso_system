# Language & glossary

Lean cross-index for the `lean_foundation` score. The laws prove every string is wrapped,
catalogued and answered; this file indexes those laws so a criterion-review pass can judge
whether what got translated or worded is actually *right*. See
`~/.claude/skills/criterion-review/criteria/11-language.md` for the full rubric. Source of truth
for every law remains RULES.md + `shared/rules/registry.ts`.

- **R6** — Every product term lives in exactly one glossary, one clear, brief definition each, so the app speaks a single dictionary. (check: `glossary-wellformed`, enforced)
- **R28** — The translation catalogue is exactly the set of user-visible English sentences the two front doors say, re-derived from the code on every build. (check: `catalogued-strings`, enforced)
- **R33** — Every position the catalogue extractor finds must sit inside a translation call (or a translated field config); a sentence can't ship wrapped in nothing. (check: `wrapped-strings`, enforced)
- **R34** — Every user-visible English sentence is checked against a narrow deny-list of known synonyms for a glossary term; a screen may not invent its own word for a defined concept. (check: `glossary-in-copy`, enforced)
- **R44** — Per translated language, the count of catalogued strings with no translation is pinned to a ceiling that can only fall, and only after the real count falls first. (check: `translation-ceiling`, enforced)
- **R54** — Agency staff are named by first name only, everywhere in the app, through one shared naming seam; nobody else is. (check: `staff-names-are-first-names`, enforced)
- **R66** — No emoji appears in any user-visible sentence or in the vocabulary data behind it; the one exception is a real country/language flag. (check: `no-emoji-in-copy`, enforced)
- **R71** — The agent's human-facing labels use the app's own glossary word, never the internal alias a tool description happened to offer the model. (check: `agent-label-vocabulary`, enforced)
- **R95** — No em dash or en dash anywhere a person reads: the UI, emails, or the glossary itself. (check: `no-em-dash`, enforced)
