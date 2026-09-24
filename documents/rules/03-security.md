# Security & permission gates

Lean cross-index for the `lean_foundation` score. Judges whether every claimed control actually
covers every site it applies to, not just the sites a law happens to check. See
`~/.claude/skills/criterion-review/criteria/03-security.md` for the full rubric. Source of truth
for every law remains RULES.md + `shared/rules/registry.ts`.

- **R10** — Every state-changing route opens with a permission gate (`requireRight`/`gated`/`adminGuard`, or a reviewed identity-gated write); no ungated door ships. (check: `gating-seam`, enforced)
- **R18** — A cross-module read (the team activity feed) subtracts any module the caller's role denies, through one shared clause, instead of showing every module's history to any reader. (check: `activity-gate-coverage`, enforced)
- **R20** — Every request-body field a worker reads must sit in a checking position (a validator, a `typeof`, an allow-list); a truthiness check or a bare cast doesn't count. (check: `validated-bodies`, enforced)
- **R21** — A door reachable by a Client-role login at the agency origin must refuse the portal caller, resolve the account fence, or be a door the portal itself opens. (check: `client-reachable-doors`, enforced)
- **R24** — A conversation that has read a withheld price figure may not then write it anywhere a client can read it, refused at the step before the door is even called. (check: `money-taint-outbound`, enforced)
- **R36** — Every right offered on the permission matrix must actually be checked somewhere; an offered-but-unconsulted box locks even Admin out of a door that decides nothing. (check: `offered-rights`, enforced)
