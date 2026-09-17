# RULES-INDEX.md — every law, and the file(s) that check it

**GENERATED. Do not hand-edit — run `node --experimental-transform-types scripts/rules-index.mjs` to regenerate.** `npm run check` runs it with `--check` and fails the build if this file disagrees with the checked-in test tree, the same way `kb-exam-merge.mjs --check` guards KB-EXAM-UNION.md.

This file answers WHERE a law is checked. It never restates WHAT a law says — that stays [RULES.md](../RULES.md)'s alone (README.md's own rule: one topic, one owner). Every path below was resolved on disk in the run that produced this file, never typed by hand, so a moved or renamed check file cannot leave a stale link behind — the generator would simply stop finding it and report the law UNRESOLVED instead.

86 laws, 84 resolved to at least one check file, 2 unresolved.

## Architecture (27)

| Law | Status | checkId | Checked in |
|---|---|---|---|
| R1 | enforced | `publish-seam` | `web/test/rules.test.ts`<br>`workers/auth/test/publish-seam.test.ts`<br>`workers/content/test/meetings.test.ts`<br>`workers/content/test/publish-seam.test.ts`<br>`workers/data-ops/test/publish-seam.test.ts`<br>`workers/mcp/test/publish-seam.test.ts`<br>`workers/tenancy/test/publish-seam.test.ts` |
| R5 | enforced | `generic-activity-path` | `web/test/rules.test.ts` |
| R9 | enforced | `agent-app-parity` | `workers/data-ops/test/agent-parity.test.ts` |
| R10 | enforced | `gating-seam` | `workers/auth/test/gating-seam.test.ts`<br>`workers/content/test/gating-seam.test.ts`<br>`workers/data-ops/test/gating-seam.test.ts`<br>`workers/mcp/test/gating-seam.test.ts`<br>`workers/tenancy/test/gating-seam.test.ts` |
| R11 | enforced | `fetch-timeout` | `web/test/rules.test.ts` |
| R12 | enforced | `cron-records` | `web/test/rules.test.ts` |
| R13 | enforced | `catalog-coverage` | `workers/data-ops/test/catalog-coverage.test.ts` |
| R14 | enforced | `bounded-lists` | `web-portal/test/rules.test.ts`<br>`web/test/paged-search.test.ts`<br>`web/test/rules.test.ts`<br>`workers/content/test/knowledge-shape-fence.test.ts`<br>`workers/content/test/paging.test.ts`<br>`workers/content/test/stories.test.ts`<br>`workers/content/test/todos-paged.test.ts`<br>`workers/content/test/work-logs.test.ts`<br>`workers/tenancy/test/accounts.test.ts` |
| R15 | enforced | `live-collections` | `web-portal/test/rules.test.ts`<br>`web/test/rules.test.ts` |
| R17 | enforced | `idempotent-transitions` | `web/test/rules.test.ts`<br>`workers/auth/test/language.test.ts`<br>`workers/content/test/google-mail-bin.test.ts`<br>`workers/content/test/meetings.test.ts`<br>`workers/content/test/stories.test.ts`<br>`workers/tenancy/test/accounts.test.ts`<br>`workers/tenancy/test/waves.test.ts` |
| R18 | enforced | `activity-gate-coverage` | `web/test/rules.test.ts`<br>`workers/tenancy/test/activity-scope.test.ts` |
| R20 | enforced | `validated-bodies` | `web/test/rules.test.ts`<br>`workers/auth/test/language.test.ts`<br>`workers/content/test/meetings.test.ts` |
| R21 | enforced | `client-reachable-doors` | `web/test/rules.test.ts`<br>`workers/content/test/google-ingest.test.ts`<br>`workers/content/test/knowledge.test.ts`<br>`workers/content/test/meetings.test.ts` |
| R24 | enforced | `money-taint-outbound` | `web/test/rules.test.ts`<br>`workers/data-ops/test/money-taint.test.ts` |
| R26 | enforced | `vector-fence` | `workers/content/test/vector-fence.test.ts` |
| R36 | enforced | `offered-rights` | `web/test/rules.test.ts` |
| R37 | enforced | `in-app-anchors` | `web/test/shell-nav.test.ts` |
| R40 | enforced | `reachable-bytes` | `web/test/reachable-bytes.test.ts` |
| R41 | enforced | `picked-files-are-sent` | `web/test/picked-files-are-sent.test.ts` |
| R42 | enforced | `declared-readers` | `workers/content/test/source-readers.test.ts` |
| R55 | enforced | `refs-match-the-formula` | `web/test/refs-match-the-formula.test.ts` |
| R56 | enforced | `one-door-per-unit` | `web/test/rules.test.ts` |
| R58 | enforced | `named-paths` | `web/test/named-paths.test.ts` |
| R69 | enforced | `guarded-sighting-writes` | *unresolved — see below* |
| R68 | enforced | `one-identity-per-source` | `workers/content/test/one-identity-per-source.test.ts` |
| R73 | enforced | `registry-backed-exemptions` | `web/test/rules.test.ts` |
| R76 | enforced | `protected-is-active` | *unresolved — see below* |

## UI (50)

| Law | Status | checkId | Checked in |
|---|---|---|---|
| R2 | enforced | `record-detail-tabs` | `web/test/rules.test.ts` |
| R3 | enforced | `no-handrolled-toggles` | `web-portal/test/rules.test.ts`<br>`web/test/rules.test.ts` |
| R4 | enforced | `forms-use-formshell` | `web-portal/test/rules.test.ts`<br>`web/test/rules.test.ts` |
| R6 | enforced | `glossary-wellformed` | `web/test/rules.test.ts` |
| R7 | enforced | `forms-persist-drafts` | `web-portal/test/rules.test.ts`<br>`web/test/rules.test.ts` |
| R8 | enforced | `tab-counts-derived` | `web/test/rules.test.ts` |
| R16 | enforced | `counted-collections` | `web-portal/test/rules.test.ts`<br>`web/test/rules.test.ts`<br>`workers/content/test/count-seam.test.ts`<br>`workers/content/test/knowledge.test.ts`<br>`workers/tenancy/test/accounts.test.ts` |
| R25 | enforced | `savings-caption` | `web/test/rules.test.ts` |
| R28 | enforced | `catalogued-strings` | `web/test/catalogued-strings.test.ts` |
| R29 | enforced | `one-page-width` | `web/test/linked-emails.test.ts`<br>`web/test/rules.test.ts` |
| R31 | enforced | `two-radii` | `web/test/rules.test.ts` |
| R32 | enforced | `closed-palette` | `web/test/rules.test.ts` |
| R33 | enforced | `wrapped-strings` | `web/test/wrapped-strings.test.ts` |
| R34 | enforced | `glossary-in-copy` | `web/test/rules.test.ts` |
| R35 | enforced | `records-carry-their-face` | `web/test/rules.test.ts`<br>`workers/content/test/ticket-work-engine.test.ts` |
| R38 | enforced | `details-ask-the-door` | `web/test/rules.test.ts` |
| R39 | enforced | `kit-supplies-the-ui` | `web/test/rules.test.ts` |
| R44 | enforced | `translation-ceiling` | `web/test/translation-ceiling.test.ts` |
| R45 | enforced | `composition-coverage` | `web/test/rules.test.ts` |
| R46 | enforced | `component-coverage` | `web/test/rules.test.ts` |
| R48 | enforced | `toolbar-shows-search` | `web/test/rules.test.ts`<br>`web/test/tickets-dashboard-no-toolbar.test.tsx` |
| R49 | enforced | `toolbar-content-gap` | `web/test/rules.test.ts` |
| R50 | enforced | `empty-toolbar` | `web/test/rules.test.ts` |
| R51 | enforced | `aside-collapse` | `web/test/rules.test.ts` |
| R52 | enforced | `record-title-treatment` | `web/test/rules.test.ts` |
| R53 | enforced | `toolbar-slot-set` | `web/test/rules.test.ts` |
| R54 | enforced | `staff-names-are-first-names` | `web/test/staff-names-are-first-names.test.ts` |
| R57 | enforced | `component-folders` | `web/test/component-folders.test.ts` |
| R59 | enforced | `forms-are-not-overlays` | `web/test/rules.test.ts` |
| R60 | enforced | `image-fills` | `web/test/an-image-fills.test.ts`<br>`workers/tenancy/test/activity-scope.test.ts` |
| R61 | enforced | `module-settings-two-doors` | `web/test/rules.test.ts` |
| R62 | enforced | `one-zero-register` | `web/test/one-zero-register.test.tsx` |
| R63 | enforced | `pinned-toolbar` | `web/test/rules.test.ts` |
| R64 | enforced | `sections-have-a-door` | `web/test/rules.test.ts` |
| R65 | enforced | `chip-above-title` | `web/test/rules.test.ts` |
| R66 | enforced | `no-emoji-in-copy` | `web/test/rules.test.ts` |
| R67 | enforced | `sections-stand-on-paper` | `web/test/knowledge-head.test.tsx`<br>`web/test/sections-stand-on-paper.test.ts` |
| R72 | enforced | `no-default-subtitles` | `web/test/no-default-subtitles.test.ts` |
| R74 | enforced | `import-opens-a-tab` | `web/test/import-opens-a-tab.test.ts` |
| R75 | enforced | `alphabetical-options` | `web/test/alphabetical-options.test.ts` |
| R77 | enforced | `tab-strips-pin` | `web/test/knowledge-kind-tabs.test.tsx`<br>`web/test/tab-strips-pin.test.ts` |
| R78 | enforced | `no-sort-in-calendar-views` | `web/test/no-sort-in-calendar-views.test.tsx`<br>`web/test/staff-pill-row.test.ts` |
| R79 | enforced | `staff-pill-row` | `web/test/staff-pill-row.test.ts` |
| R80 | enforced | `rows-are-a-list` | `web/test/rows-are-a-list.test.ts` |
| R81 | enforced | `form-carries-no-hints` | `web/test/settings-appearance.test.tsx` |
| R82 | enforced | `table-column-budget` | `web/test/table-column-budget.test.ts` |
| R83 | enforced | `toolbar-lead-gap` | `web/test/toolbar-lead-gap-card.test.tsx`<br>`web/test/toolbar-lead-gap.test.ts` |
| R84 | enforced | `mango-in-title-only` | `web/test/mango-title-only.test.ts` |
| R85 | enforced | `rail-labels-one-word` | `web/test/rail-labels-one-word.test.ts` |
| R86 | enforced | `status-owns-the-chip` | `web-portal/test/ticket-row-type-icon.test.tsx`<br>`web/test/status-owns-the-chip.test.ts`<br>`web/test/ticket-type-icons.test.ts` |

## Workflow (2)

| Law | Status | checkId | Checked in |
|---|---|---|---|
| R30 | enforced | `linked-emails` | `web/test/linked-emails.test.ts` |
| R70 | enforced | `automations-are-visible` | `web/test/automations.test.ts` |

## AI / agent (7)

| Law | Status | checkId | Checked in |
|---|---|---|---|
| R19 | enforced | `agent-filter-parity` | `workers/mcp/test/filter-parity.test.ts` |
| R22 | enforced | `agent-body-parity` | `workers/mcp/test/filter-parity.test.ts` |
| R23 | enforced | `cited-answers` | `workers/content/test/cited-answers.test.ts`<br>`workers/content/test/knowledge-answer.test.ts`<br>`workers/content/test/knowledge.test.ts` |
| R27 | enforced | `described-contracts` | `workers/mcp/test/described-contracts.test.ts` |
| R43 | enforced | `agent-mcp-tool-parity` | `workers/mcp/test/agent-mcp-tool-parity.test.ts` |
| R47 | enforced | `assistant-coverage` | `workers/mcp/test/assistant-coverage.test.ts` |
| R71 | enforced | `agent-label-vocabulary` | `workers/data-ops/test/agent-label-vocabulary.test.ts` |

## Unresolved

None of the three patterns this generator looks for matched anywhere under the check roots it walks (`workers/*/test`, `web/test`, `web-portal/test`): no dedicated `<checkId>.test.ts` file, no `it("<checkId>: …")` case, and no top-level `describe("… R<n> …")` naming the law's own number. Not necessarily unchecked — a law can be enforced by a shared helper none of the three recognise — but this generator refuses to guess, so read the law's own entry in `shared/rules/registry.ts` and RULES.md directly.

- R69 (`guarded-sighting-writes`, enforced)
- R76 (`protected-is-active`, enforced)

---

Regenerated by `scripts/rules-index.mjs`, which imports `RULES_REGISTRY` from `shared/rules/registry.ts` and walks the check roots through the one shared file-reading seam every law that scans source stands on (`shared/rules/source-scan.ts`'s `sourceFiles`). No hand-typed path in this file, and none permitted — see the header of the generator.
