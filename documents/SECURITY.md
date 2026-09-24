# SECURITY.md, the security model in one place

This is a map of how Kwapso protects a team's data, not a duplicate of the Laws of
the Base. Every claim below names the law, test, or constraint that actually
enforces it; read [RULES.md](../RULES.md) and `shared/rules/registry.ts` for the
full text. Anything with no such citation is `unenforced` — an honest label, not a
gap report.

## 1 · Trust boundaries

Two public front doors reach the outside world:

- **`gateway`** (`workers/gateway`) — serves `web/`, the agency app. Forwards
  `/api/*` to the domain worker owning that prefix.
- **`portal-gateway`** (`workers/portal-gateway`) — serves `web-portal/`, the
  client portal. Forwards only a **named allow-list** of routes, never a prefix.

Every other worker (auth, tenancy, content, data-ops, mcp, realtime) sets
`workers_dev:false` and `preview_urls:false` — no public route can reach a domain
worker's `/internal/*` surface directly. The `mcp` worker is reachable only through
the agency gateway (`/mcp`, `/api/mcp/*`), never on its own.

A third internal boundary sits between a **client login** and the **agency's own
material**: a client-portal contact is an ordinary team member holding an ordinary
role, and could in principle reach any agency route at the agency's own origin
unless that route explicitly refuses a Client-role caller — see §4.

## 2 · Identity and sessions

`workers/auth` is the one place identity is decided. Sign-in is email + a 6-digit
code, no passwords stored. Every request in the product passes through auth first
to resolve who is calling; the resolved session is cached per-request
(`shared/workers/session-fallback.ts`) rather than re-verified per downstream call.
A personal access token (for MCP) is a **bridge to a short-lived, team-pinned
session** — `POST /internal/mcp-session` — never a standing credential with its own
rights (see §6). Session/auth internals sit behind `workers_dev:false`, reachable
only through the gateways (§1).

## 3 · Authorization: the permission spine

Every domain worker gates identically through one shared seam,
`requireRight` (`shared/workers/gating.ts`): who is calling, their active team,
role, and a check against that role's permission sheet, before any handler body
runs. **Every state-changing (non-GET) route opens with a gate** —
`requireRight`, or the `gated`/`gatedBody` wrapper, `requireAnyImportRight`, or
`adminGuard` — except a reviewed identity-gated write (teamless onboarding,
own-pointer, ownership), enforced per-worker by a `gating-seam` test suite that
reads handler source off disk (`R10`). The external MCP surface carries its own
equivalent suite, asserting every non-GET route verifies a token/session before
running (`R10`).

The permission matrix itself is closed-loop: a module only gets the four
read/create/update/delete boxes on the grid if something actually consults that
right — a literal `requireRight` pair, an MCP `TOOL_GATES` entry, an
`ACTIVITY_GATE_MAP` row, or an import `TARGETS` module — so a box that decides
nothing (locking Admin out of a door that exists) or a door nobody asked about
(open to everybody, gate included) both fail the build (`R36`).

## 4 · Tenant and account isolation

- **Per-team data.** Each team's own tables live in a per-team D1 database,
  reached over a REST door (`CF_D1_TOKEN`) rather than the native binding used for
  the global core DB — a team's rows are never one `env.DB` query away from
  another team's.
- **The client-portal fence, at the door.** The portal gateway forwards a named
  allow-list only; the agency gateway forwards by prefix, and a client login is an
  ordinary team member. So every route the portal deliberately withheld was still
  reachable by the same person at the agency's own hostname unless that route
  refuses a Client-role caller itself. Every route a Client-role caller can pass
  must refuse a portal caller, resolve the account fence, be a door the portal
  itself opens, or carry a reviewed exemption — derived from the seed's rights,
  each worker's `ROUTES` table, and the gates in handler source, never
  hand-listed (`R21`).
- **A cross-module read still carries the caller's rights.** The team activity
  feed subtracts whatever modules the caller's role denies; every
  `relatedTable` a worker writes resolves through `ACTIVITY_GATE_MAP` or a
  pinned exemption (`R18`).
- **Knowledge-base retrieval is namespaced per team, not filtered after the
  fact.** The knowledge base searches one account-wide Vectorize index, so every
  call passes `namespace: guard.teamId`, built from the guard in one function, and
  Vectorize applies the partition before the search runs — a wrong label can cost
  a relevant passage, never leak one across teams (`R26`). Nothing readable comes
  back from the index itself either: it returns ids and scores only
  (`returnValues:false`, `returnMetadata:"none"`), and every passage is re-read
  from the team's own database under the caller's own fence (`R26`).
- **Money is shown deliberately, or not at all.** The former internal rate-card
  and margin feature was retired entirely (10 Sep 2026); the surviving money
  surface (`GET /api/tenancy/app-money`) is gated per-account by the client's own
  price-visibility switch, and a conversation that has read a withheld figure may
  not then write somewhere the client reads, refused at the write step before the
  door is called (`R24`, outbound half only — the inbound clause was retired the
  same day).

## 5 · The AI agent's scope

The in-app assistant and MCP tools **act as the calling user, through the same
gated doors a person uses** — there is no separate agent role and no elevated
service account. A role without the AI-agent right spends no AI budget at all,
because the agent has no path around the permission check (`documents/MCP.md`
§1). Three parity laws keep the machine surface from silently drifting wider than
what a person could reach through the UI:

- Every list/search tool exposes and forwards every filter its underlying door
  parses, derived from the door's own parsing (`R19`).
- Every write tool exposes and forwards every body field its door reads
  (`R22`).
- A tool's description may only name identifiers that are real — a declared
  argument, a door's own query/body field, a response field the door actually
  returns, another tool's name, or a reasoned exemption (`R27`).

The agent's own system prompt is generated from the import/export catalogue plus
the glossary, so the UI and the agent can never claim different capabilities
(`R9`).

## 6 · The MCP token model

A personal access token is scoped three ways at once, per `documents/MCP.md`:

- **Pinned to one team** at the moment it is minted.
- **Capped by the holder's live role** at call time — change the role later and
  the token's power changes with it, nothing is snapshotted.
- **Time-boxed**: expires after 90 days (no renewal, a fresh secret is the
  point), and a holder may keep at most 10 live tokens at once; an 11th mint is a
  clean refusal.

Only its hash is stored server-side; the secret is shown once at creation and
never again. Revocation takes effect on the very next call. A client-portal login
cannot mint or use a token at all (§4, `R21`).

## 7 · Input validation at the boundary

No worker trusts a request body directly. Every field read off a body or a query
string goes through `shared/workers/validate.ts` (`requireText` / `optionalText`
/ `queryText`): type-checked, NUL-stripped, length-capped, throwing the one
`GuardError` every worker's central catch maps to a clean `400`. The rule is
**positional** — a field must sit inside a checking call (a validator's first
argument, a `typeof`, `Array.isArray`, a literal comparison, an allow-list
`.includes`) — a truthiness check or a cast alone does not count, and a body may
never be destructured straight at the read. Both the body half and the query-string
half are censused independently off the handler source on disk (`R20`).

## 8 · File uploads and stored bytes

- **A stored file must reach a person.** Every write of bytes into an R2 bucket —
  a direct `env.<BUCKET>.put(` on a wrangler-declared `r2_bucket` binding, or the
  shared `storeImageDataUrl` seam — is claimed by a registry entry naming the
  field a person reads the reference back through and the screen that renders it
  (an `href`, `src`, or `picture`, never only a form value) (`R40`).
- **A picked-but-not-yet-uploaded file is either sent or refused, never
  silently dropped.** A create dialog that must defer an upload until the record
  gets its id is named in a registry with the maker function whose id it needs,
  and every create call site of it is censused to prove it actually forwards that
  id rather than discarding the upload result (`R41`).
- **Every accepted source type resolves to one declared reader**, shared by both
  the direct-upload door and the Google Drive lane — no door picks its own reader
  (`R42`).

## 9 · Secrets and credentials

Deploy credentials (`CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`) live in
`~/.config/cloudflare/accounts.json` plus the macOS Keychain, never in a
repository file, and are exported into the shell only for the duration of a
deploy command — never printed. The same pattern holds for the admin key used to
trigger team migrations and the test-login key used by proof scripts: read from
Keychain into a variable, never echoed or `cat`'d. See CLAUDE.md's "Deploy
credentials" and "A proof lane never prints a credential" working-agreement
entries.

## 10 · External calls and background work

- Every external `fetch` this app makes (the D1 REST door, the email sender, an
  AI model call) carries an `AbortSignal` timeout, so a hung socket can never
  stall a worker indefinitely (`R11`).
- Every cron/scheduled handler records its own failures to the 90-day error
  store (`recordWorkerError`) — unattended work has no user watching a failed
  request, so a swallowed background failure would otherwise be invisible
  (`R12`).

## 11 · Open issues

- The team migration numbering scheme (`TEAM_MIGRATIONS`) relies on each
  contributing line fetching `origin/main` and reading the live tail before
  appending — a process discipline, not a machine check; a collision is still
  possible and is resolved by hand (see CLAUDE.md's "Team migration numbers"
  entry). `unenforced`.
- Rate limiting (`shared/workers/rate-limit.ts`, `callerHasBudget`/`TOO_FAST`) is
  wired per-worker where the binding is configured, but is an *optional* slice of
  `GatingEnv` by design — an environment without the binding behaves as if no
  limiter exists at all, rather than failing closed. Worth a follow-up check that
  every production environment actually has the binding configured.
  `unenforced`.
