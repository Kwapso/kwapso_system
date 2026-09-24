# CLAUDE.md. Read this first

- The Kwapso System: the multi-tenant SaaS base every future app forks from (auth, teams, roles, invites, tickets, the knowledge base, dropdowns, CSV import, an in-app AI agent), on Cloudflare Workers.
- This file is the entry point — the two prime directives, the planning ritual, and pointers to every document. It does not duplicate them.

## The two prime directives

- **Stay lean.** Add the least code that solves the problem; reuse the existing seams. "Too much code" is a defect here.
- **Obey the Laws of the Base.** Machine-checked, not aspirational — breaking one turns `npm run check` red.

## The Laws of the Base

- Canonical text: [`RULES.md`](RULES.md), pinned to `shared/rules/registry.ts`, checked by `web/test/rules.test.ts` (`registry-integrity`).
- Grouped, short-form summaries by what each law actually governs — read the file for the criterion your change touches, before you build:

| Criterion | File |
|---|---|
| 1. Architecture | [`documents/rules/01-architecture.md`](documents/rules/01-architecture.md) |
| 2. Data | [`documents/rules/02-data.md`](documents/rules/02-data.md) |
| 3. Security | [`documents/rules/03-security.md`](documents/rules/03-security.md) |
| 4. Accountability | [`documents/rules/04-accountability.md`](documents/rules/04-accountability.md) |
| 5. Caching | [`documents/rules/05-caching.md`](documents/rules/05-caching.md) |
| 6. Concurrency | [`documents/rules/06-concurrency.md`](documents/rules/06-concurrency.md) |
| 7. Resilience | [`documents/rules/07-resilience.md`](documents/rules/07-resilience.md) |
| 8. Agent/MCP | [`documents/rules/08-agent.md`](documents/rules/08-agent.md) |
| 9. Knowledge | [`documents/rules/09-knowledge.md`](documents/rules/09-knowledge.md) |
| 10. UI | [`documents/rules/10-ui.md`](documents/rules/10-ui.md) |
| 11. Language | [`documents/rules/11-language.md`](documents/rules/11-language.md) |
| 12. Hygiene | [`documents/rules/12-hygiene.md`](documents/rules/12-hygiene.md) |

- A law cannot be added without its check: the rule, the registry entry, and a check, all three, or the build fails.

## Business modules

- Every business module has its own document: what it owns, its screens, its doors, and its business rules, each tagged with its enforcement (a law, a test, a DB constraint, or honestly `unenforced`).

| Module | Doc |
|---|---|
| Tickets | [`documents/modules/tickets.md`](documents/modules/tickets.md) |
| Work (tasks/stories/sprints) | [`documents/modules/work.md`](documents/modules/work.md) |
| Accounts | [`documents/modules/accounts.md`](documents/modules/accounts.md) |
| Apps | [`documents/modules/apps.md`](documents/modules/apps.md) |
| Process maps | [`documents/modules/process.md`](documents/modules/process.md) |
| Team | [`documents/modules/team.md`](documents/modules/team.md) |
| Knowledge base | [`documents/modules/knowledge.md`](documents/modules/knowledge.md) |
| Meetings | [`documents/modules/meetings.md`](documents/modules/meetings.md) |
| Choices (dropdowns) | [`documents/modules/choices.md`](documents/modules/choices.md) |

## Security

- [`documents/SECURITY.md`](documents/SECURITY.md): trust boundaries, identity/sessions, the permission spine, tenant/account isolation, the agent's scope, secrets, uploads, boundary validation — each claim naming its enforcement.

## Before you build, the planning ritual

- Answer these, in order, before you write code:

| # | Question | Anchor |
|---|---|---|
| 1 | Say it in one glossary sentence, never a synonym | `shared/glossary.ts` |
| 2 | Which Laws bite? Name every one that applies, in your plan | the 12 files above |
| 3 | Which seams do I reuse, not rebuild? | `shared/workers/d1-rest.ts`, `requireRight`, `shared/workers/validate.ts`, `publishChange`, `FormShell`, the recipe engine, the tool catalog |
| 4 | What's the smallest shape? A route not a worker, a column not a table, a recipe not a bespoke screen, a flag not a code path | — |
| 5 | What could break? Name the failure path before the happy path: tenant isolation, a concurrent write, a partial failure, a hung fetch | — |
| 6 | What test locks it? A new invariant gets its test first (red), then green | — |
| 7 | Gate before ship | `npm run check` + [`documents/WORKING-AGREEMENT.md`](documents/WORKING-AGREEMENT.md)'s ship gate |

- For anything security-shaped, a fresh, no-prior-context review on top of the gate above.

## Build style

- How code here is written (worker/handler shape, the screen engine, the vendored design kit, component folders, voice, the action-icon mapping) is documented, not repeated here:

| Topic | Doc |
|---|---|
| Build style detail | [`documents/BUILD-STYLE.md`](documents/BUILD-STYLE.md) |
| Code house style | [`documents/CONVENTIONS.md`](documents/CONVENTIONS.md) |
| How the base works and why | [`documents/BASE-MANUAL.md`](documents/BASE-MANUAL.md) |
| How screens are built | [`documents/UI-CONVENTIONS.md`](documents/UI-CONVENTIONS.md) |
| UI rulings, by topic | [`documents/UI-RULEBOOK.md`](documents/UI-RULEBOOK.md) (index into `documents/ui-rulebook/`) |

## Working agreement

- The operational rules — lane discipline, deploy order, ship gate, credentials, team migrations, kit tags, artifacts — live in [`documents/WORKING-AGREEMENT.md`](documents/WORKING-AGREEMENT.md). Read it before deploying, resetting data, or running a multi-lane change.

## Where the canon lives

- The full doc map, read order, and "what to read for this kind of change" table: [`README.md`](README.md). Start there for anything not linked above.
- If a request conflicts with a Law of the Base or a locked decision in [`documents/ARCHITECTURE.md`](documents/ARCHITECTURE.md), say so and propose the in-rule way. Don't quietly break the rule.
