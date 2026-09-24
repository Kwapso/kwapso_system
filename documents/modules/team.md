<!--
  documents/modules/team.md — the Team module. Shape follows
  agent_skills/lean_foundation/templates/module-doc.md.
-->
# Team

## What it is

The Team module owns who is on your team, what a **role** lets a **member**
do (`shared/glossary.ts`: "A single thing a role can do: read, create,
update, or delete"), how a person gets on the team in the first place (an
**invite**), and the two surfaces that stand beside membership rather than
inside it: a personal access token (a machine's own way of being "just that
person, reached by a machine" — `documents/MCP.md` §1–2) and a **staff
profile** ("what a colleague is like and how they work best. The team can
read it; a client never can"). It is the one module every other module's
permission check ultimately answers to: `member_roles` + `role_permissions`
is the tall sheet (role × module × the four rights) that `requireRight`
consults on every gated door in the app.

## Screens

| Screen | Kind | Route / deep link |
|---|---|---|
| Members (gallery) | collection | `/settings?tab=members` (`web/components/team/members-gallery.tsx`) |
| Member's own record | detail | `/t/<teamId>/members/<userId>` (`web/components/team/member-screen.tsx`) — the only screen that changes a member's role, removes a member, or shows their staff profile |
| Roles (matrix) | bespoke matrix | `/settings?tab=roles` (`web/components/team/roles-matrix.tsx`) — roles are columns, modules are rows, since 10 Sep 2026 |
| Invites | contextual, no address of its own | the "Invites" button on the Members toolbar (`members-gallery.tsx`); revoke happens from the expanded row beside it |
| Access tokens | collection + create dialog | `/settings?tab=integrations` (`web/components/team/access-tokens.tsx`) |
| Staff profile | form, on the member's own record | inside `member-screen.tsx` (`staff-panel.tsx` / `staff-profile-dialog.tsx`) |
| Team details (name, logo) | form | `/kwapso` (the agency's own record, `web/components/team/team-panel.tsx` + `team-edit-dialog.tsx`) |
| Create team | form dialog | reachable from the team switcher (`create-team-dialog.tsx`) |

Members, Roles and Invites once had their own collection screens at
`/t/<teamId>/members`, `/roles` and `/invites`, each with its own tab strip.
The client retired all three on 2026-09-14 ("Team management is reachable
only from Settings › Team. The team area's own standalone pages must go.");
they still resolve (two legacy shims + a bookmark keep working), but nothing
in the app links to them any more — `SECTION_HOSTED_ELSEWHERE`
(`shared/rules/registry.ts`) names the real host for each (R64).

## Doors

Team, members, roles and invites are served by `workers/tenancy/src/index.ts`
(`ROUTES`, from line 287). **Access tokens are served by `workers/mcp/src/index.ts`
(`ROUTES`, line 66), not tenancy** — verified by grepping `token` across every
worker's `ROUTES` table; the task's assumption that tokens sit on tenancy does
not hold.

| Route | Does |
|---|---|
| `GET /api/tenancy/members` | list the team's members — `team_members:read` |
| `POST /api/tenancy/members/role` | change a member's role — `team_members:update` |
| `POST /api/tenancy/members/remove` | remove (deactivate) a member — `team_members:delete` |
| `GET /api/tenancy/roles` | list roles — `member_roles:read` |
| `POST /api/tenancy/roles` | create a role — `member_roles:create` |
| `POST /api/tenancy/roles/update` | rename / re-describe a role — `member_roles:update` |
| `POST /api/tenancy/roles/active` | deactivate / reactivate a role — `member_roles:update` (the locked Admin role refuses) |
| `GET /api/tenancy/roles/permissions` | read one role's permission sheet — `member_roles:read` |
| `POST /api/tenancy/roles/permissions` | write one role's permission sheet — `member_roles:update` |
| `GET /api/tenancy/invites` | list pending invites — `team_members:read` |
| `POST /api/tenancy/invites` | create an invite — `team_members:create` |
| `POST /api/tenancy/invites/revoke` | revoke a pending invite — `team_members:update` |
| `GET /api/tenancy/invitations` | a person's own received invitations — identity-gated (`whoAmI`), teamless by design |
| `POST /api/tenancy/invitations/accept` | accept an invite — identity-gated (`whoAmI`), the onboarding exception R10 names |
| `POST /api/tenancy/teams/update` | rename the team / change its logo — `teams:update` |
| `GET /api/mcp/tokens` | list the caller's own access tokens — identity-gated (`whoAmI`) |
| `POST /api/mcp/tokens` | mint a new token (secret shown once) — identity-gated (`whoAmI`) |
| `POST /api/mcp/tokens/revoke` | revoke a token — identity-gated (`whoAmI`), caller-private |
| `GET /api/mcp/tokens/calls` | one token's own call log | identity-gated (`whoAmI`) |

## Business rules

- Every state-changing door on this module opens with a permission gate
  (`requireRight`), except the identity-gated exceptions this law itself
  names — teamless invitation accept, and the token doors, which act on a
  row only the caller can ever see — `R10`.
- The token doors are the reviewed identity-gated exception, not an
  oversight: `POST /mcp` and the three `/api/mcp/tokens*` doors gate on
  `whoAmI` rather than a module right, because a token row is caller-private
  in the same reviewed class as auth's own session rows — `R10`, `R1`'s own
  named exception for "auth's user-channel publishes and mcp's
  caller-private token rows".
- Every switch offered on the permission matrix decides something real: the
  offered set (`MODULE_OFFERED_RIGHTS`) and the consulted set (every
  `requireRight`/`gated` pair, every MCP `TOOL_GATES` string, every
  `ACTIVITY_GATE_MAP` module, every import `TARGETS` module) must agree in
  both directions — `R36`, proven by `workers/tenancy/test/roles.test.ts`
  ("never stores a right the module does not offer (R36)").
- A role's own permission-sheet write and its active/inactive flip are
  idempotent: the UPDATE carries the current-status predicate, reads back
  the changed-row count, and writes no activity row when zero rows moved —
  `R17`, proven by `workers/tenancy/test/roles.test.ts` ("a repeat that
  moves ZERO rows returns false and writes NO activity row (R17)").
- The seeded Admin role is locked: it cannot be deactivated and its
  permission sheet cannot be edited — `workers/tenancy/test/roles.test.ts`
  ("refuses the locked Admin role (is_default)", "refuses to deactivate the
  locked Admin role").
- A team keeps at least one admin: changing the last admin's own role, or
  removing the last admin, is refused, including the race where two
  concurrent writes could both report success — `workers/tenancy/test/members.test.ts`
  ("blocks demoting the last admin", "blocks removing the last admin",
  "blocks the race: atomic write reports 0 changes → last_admin").
- A member cannot change their own role or remove themselves through this
  door — `workers/tenancy/test/members.test.ts` ("blocks changing your own
  role", "blocks removing yourself").
- A member row is unique per (team, user): a person cannot join the same
  team twice — `UNIQUE (team_id, user_id)` constraint on `team_members`
  (`db/core/0002_teams.sql`).
- At most one **pending** invite exists per (team, email); revoked, accepted
  and expired rows coexist freely — a partial `UNIQUE INDEX
  idx_invite_pending_unique ON invite_index (team_id, email) WHERE status =
  'pending'` (`db/core/0006_invite_pending_unique.sql`), backstopping the
  application's own check-then-insert.
- A role's permission sheet has at most one row per (role, module) —
  `UNIQUE (role_id, module)` constraint on `role_permissions`
  (`workers/tenancy/src/team-schema/migrations.ts`).
- An access token's secret is never stored, only its hash, and the hash is
  unique — `token_hash TEXT NOT NULL UNIQUE` on `mcp_tokens`
  (`db/core/0013_mcp_tokens.sql`).
- An account may hold at most 10 live (unrevoked, unexpired) access tokens
  at once, enforced even when every request to mint one arrives
  concurrently — `workers/mcp/test/tokens.test.ts` ("the cap holds even when
  every request arrives at once", "revoking frees a slot — the cap counts
  LIVE tokens, not history", "the cap is per person — a teammate's tokens
  don't crowd yours out").
- A token expires (`MCP_TOKEN_TTL_DAYS` = 90) and a missing expiry counts as
  already expired, so no token is immortal; a revoked token stays refused
  even past what would otherwise be its expiry —
  `workers/mcp/test/tokens.test.ts` ("a token with NO deadline is refused,
  not trusted forever", "a revoked token is still refused (expiry didn't
  replace revocation)").
- A live token always stays reachable to revoke, even behind a long history
  of revoked tokens past the list's own cap —
  `workers/mcp/test/tokens.test.ts` ("a live token survives a wall of
  revoked history past the list cap").
- A cross-module read (the team activity feed) subtracts the caller's own
  denied modules, and a client-portal login is refused this module's
  history outright: `member_roles`, `users` (a member's joins/role
  changes/removals) and `invite_logs` are all fenced `null` for a portal
  caller in `PORTAL_ACTIVITY_FENCE` — "the agency's permission structure",
  "the agency's staff, never a client's business", "the agency's own
  hiring, by another name" — `R18`.
- A door on this module reachable by a Client-role login must refuse a
  portal caller, resolve the account fence, or be a door the portal itself
  opens — `R21`; team/role/invite/token management is agency-only material,
  and a client login is an ordinary team member for the purposes of this
  check, so nothing here is exempted by assumption.
- A section that once lived on the team area's own tab strip (Members,
  Roles, Invites) either keeps a real door or names, in writing, the screen
  that carries its acts now — `R64`, `SECTION_HOSTED_ELSEWHERE`
  (`shared/rules/registry.ts`).
- A member row's permission changes are `member_roles`, `team_members` and
  `portal_users` writes, and every one of those is a privilege write on the
  agent/MCP surface: the assistant pauses for a yes/no confirmation before
  executing `set_role_permissions` / `set_member_role` / `create_role` /
  `invite_member` / `remove_member` / `revoke_invite`, derived from each
  tool's own `TOOL_GATES` entry rather than a hand-kept list —
  `documents/EDGE-CASES.md` §7 ("So privilege writes confirm, and the set is
  DERIVED, never listed").
- The permission matrix is never copied into the searchable knowledge base:
  `member_roles` is reachable by the assistant only through the live
  `get_role_permissions` / `query_records` tools, never as an indexed
  passage, because a stale copy of "who can do what" is the one wrong answer
  this app is least able to afford — `R47`, `CORPUS_EXEMPT`
  (`shared/rules/registry.ts`).
- A staff profile is agency-only: it is readable by the team and never
  reaches a client login (`shared/glossary.ts`'s own definition) —
  `unenforced` at the door level beyond the general `R21` client-reachable
  census; no dedicated staff-profile confidentiality test exists today.
- A role holding `member_roles:update` cannot widen its own permission
  sheet — `setRolePermissions` refuses a self-grant (`workers/tenancy/src/lib/roles.ts`,
  the `self_grant` `GuardError`), the general form of "you can't change your
  own role" applied to a custom role rather than the caller's own row —
  `unenforced` by a named regression test today (`workers/tenancy/test/roles.test.ts`
  covers the locked-Admin and last-admin guards but not this one by name), a
  strong candidate for a locked test given it closed a real MED-severity
  finding (`documents/BASE-IMPROVEMENTS.md`, "A role could grant ITSELF
  every right").
- The 2026-08-04 privilege-write confirm requirement itself was a fix for a
  documented HIGH-severity stored-prompt-injection chain into unconfirmed
  privilege grants (`documents/BASE-IMPROVEMENTS.md`), and the derived
  `isPrivilegeWrite()` predicate is what the bullet above about agent/MCP
  confirmation is proving — see `documents/EDGE-CASES.md` §7.

## Edge cases

- Privilege writes were free of any confirmation until 2026-08-04: a
  no-prior-context security review found a concrete injection chain (a
  ticket description carries attacker text, an admin later asks the
  assistant a question that reads that ticket, and `set_role_permissions`
  or `invite_member` could execute as the admin with no pause). The panel
  now required for `member_roles:`/`team_members:`/`portal_users:` writes
  is the hard defence; fencing untrusted content as data is only the soft
  one (`documents/EDGE-CASES.md` §7).
- The account fence half of the same confirm rule (`accountScope()`) is
  derived from the raw inputs a write touches (`FENCE_INPUTS`), not from the
  module name — a write gated on `accounts:*` can still silently hand an
  outside company sight of data it could not see a moment before
  (`documents/EDGE-CASES.md` §7, "the second half, added 2026-08-11").
- `member-screen.tsx`'s own header comment once told the next reader that
  role changes "still live on the member's own record, reached from the
  team area's Members section" — a route that, for six weeks, nothing in
  the app actually linked to. The app's reachability lived in prose, and
  prose does not fail a build (R64's own `why`).

## Open issues

- Team/role/invite management is agency-only and correctly refuses a
  Client-role login (R21), but there is no dedicated test asserting a
  portal caller specifically cannot read a staff profile — it rides the
  general client-reachable-doors census rather than a named case of its
  own.
- The self-grant refusal on `setRolePermissions` (see Business rules) has
  no named regression test — a plausible next `workers/tenancy/test/roles.test.ts`
  case.
- `documents/BASE-IMPROVEMENTS.md` records two already-fixed findings on
  this module (the self-grant hole and the unconfirmed privilege-grant
  injection chain) and no open ones as of this writing; re-grep before
  trusting that stays true.
