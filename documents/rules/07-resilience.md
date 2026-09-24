# Errors, resilience & recovery

Lean cross-index for the `lean_foundation` score. Judges whether a break gets captured and
diagnosed, and whether the whole system can be rebuilt from what's documented by someone other
than whoever built it. See `~/.claude/skills/criterion-review/criteria/07-resilience.md` for the
full rubric. Source of truth for every law remains RULES.md + `shared/rules/registry.ts`.

- **R11** — Every external `fetch()` (a bare call out to the internet, not a Cloudflare service binding) carries an `AbortSignal` timeout, so a hung socket can't stall a worker. (check: `fetch-timeout`, enforced)
- **R12** — Every cron/`scheduled` handler records its own failures to the error store, since unattended background work has nobody watching it fail live. (check: `cron-records`, enforced)
