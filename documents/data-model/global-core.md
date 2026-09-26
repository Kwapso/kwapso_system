## GLOBAL core (the card catalog, `kwapso-core`)

### users . KEEP (built)

> **USER, MEMBER, PERSON — three words, three different things, and this is the
> one place that says so.** They are not synonyms and none of them is drift:
>
> - a **user** is an IDENTITY — one row here, one email, one human who has signed
>   in. It belongs to no team, one team, or several. This is engineering
>   vocabulary and the screens never say it (see below).
> - a **member** is that identity ON A TEAM — a `team_members` row joining a user
>   to a team with a role. It is the glossary term ("A member is a person on your
>   team") and it is the word both front doors use.
> - a **person** is anybody at all, including people who are neither: the contact
>   who raised a ticket, the name on an account. It is ordinary English, and it is
>   the word inside the glossary's own definition of Member.
>
> The distinction is load-bearing rather than stylistic. `portal_users.user_id`
> below points at the GLOBAL users row for a client contact who is deliberately
> NOT a member of the agency's team; the whole account fence rests on those being
> two different things. And **the screens say `user` zero times on purpose**: R34
> bans it in favour of Member (`GLOSSARY_SYNONYMS` in `shared/rules/registry.ts`),
> which is why "user" is safe to use freely in these documents and nowhere a
> person can read it.
>
> *Written 2026-09-06, after a terminology audit counted `user` 264 times,
> `member` 226 and `person` 231 across the documents and read it as drift. It was
> not: the audit had counted DOCUMENT PROSE, and the corpus that governs product
> language is `shared/i18n-strings.json`, where `user` appears in none of the
> 1,955 sentences. The three words were already being used correctly by everyone;
> what was missing was a sentence saying which is which.*

Real data: `id`, `email`, `image_url`, `first_name`, `last_name`,
`onboarding_completed_at`, `current_team_id`. Glide `Row owners/Team keys
string` (the teams a user belongs to) = our **team_members** table.
Dropped: all transformer/onboarding-JSON/tab-view/device columns.
**No-name fallback (2026-06-21):** members can exist pre-onboarding, so
`first_name`/`last_name` may both be empty, display the `email` as the name in
that case; with no `image_url`, show initials (or a placeholder avatar when even
initials aren't derivable).

### teams. KEEP (built)
Real data: `id`, `name` (`Identity/Team name`), `logo_url`. The Kwapso System adds
`database_id`, `db_status`, `schema_version` (the per-team-DB architecture).

### team_members. KEEP (built, GLOBAL)
Real data: `team_id` (`Row owners/Team key`), `user_id`, `role_id`
(`Member roles/Member role ID`). Glide's `Change member role/Updated member
role ID` + `webhook complete` were async-webhook scaffolding, **dropped**;
role change is a direct server action. Membership is global (answers "which
teams am I in?" before we open any team DB).

### email_change_logs. KEEP (BUILT 2026-06-17, GLOBAL, no team key in the export; `db/core/0005_email_change.sql`)
Purpose: change a user's email safely. Real data: audit block + `current_email`,
`new_email`, `expires_at`, `verification_code` (numeric OTP to the NEW email),
`user_input_code`, `email_change_successful`, `email_change_timestamp`. Flow:
request → OTP to new email → match → swap on the user row.
**UPDATED 2026-06-21:** shipped in Phase 2 (`db/core/0005_email_change.sql`).
The login/email-change codes were **split out into a separate hashed
`email_change_codes` table** (the OTP is stored hashed, not in clear on the log
row); `email_change_logs` remains the human-readable security record (old/new
email, outcome, timestamps). The old address is warned on change.

### account_activity. KEEP (BUILT 2026-06-18, GLOBAL, `db/core/0007`)
Purpose: the person's OWN identity history, shown in Settings → Account. NOT
team-tied (per-team `activity` lives in each team DB; identity events belong to
the user across all teams). Real data: `id`, `user_id`, `type`
(`name_changed`/`photo_changed`/`email_changed`), `description` (human
sentence), `created_at`. No actor-snapshot block, the actor is always the user
themselves. Written best-effort by the auth worker on profile/email change
(`workers/auth/src/lib/account-activity.ts`); read via `GET /api/auth/activity`;
rendered with the library `ActivityFeed`. `email_change_logs` is kept alongside
it as the security record (old/new email).

**THE OTHER HALF OF A PERSON'S HISTORY** is the per-team `activity` table, and
the split is by DATABASE BOUNDARY rather than by feature — see *activity* below
for the two-read recipe that puts them back together, and why nothing joins them
server-side.

### importable_databases. KEEP (BUILT 2026-06-23, GLOBAL reference, `db/core/0008`)
Purpose: the owner-maintained catalog for the data-import feature, which target
tables can be imported into. Real data: `id`, `table_key` (the target the import
writes into, unique), `display_name`, `description`, `required_columns_json` (the
schema the agent maps an uploaded file onto), `auto_populate_columns_json`
(columns the import may fill itself, e.g. creator + team key),
`reference_dataset_url` (both **unused today**, the code's `TARGETS` is the
truth), `is_active`, + the audit block (creator/editor). Shared across all teams,
so it lives in the global core DB. **The catalogue SELF-HEALS against the code on
read (LAW R13):** `reconcileCatalog` (`lib/import.ts`) INSERT-only upserts a row
for every code `TargetDef` (`ON CONFLICT DO NOTHING`), so a fresh environment's
picker is never empty and a target the owner deliberately switched OFF (its row
exists, `is_active=0`) stays off, the picker filters `is_active` **in memory**,
never in SQL, or "switched off" and "never existed" would look identical. The
by-key door heals on a miss only (the per-import path pays nothing). The owner
seed door (`POST /api/data-ops/admin/seed-targets`, x-admin-key) now only refreshes
LABELS (display name / description / schema) and never re-activates a switched-off
target, it is no longer a step anyone must remember. Seven targets are wired
today: `selectable_data` (Dropdown values), `member_roles`, `accounts`,
`meetings`, `stories`, `brand_assets` and `meeting_purposes`
(`team_members`/`help`/`teams`/`screens`/`agent` and the rest are pinned
non-importable in `CATALOG_EXEMPT`, each with its reason); the agentic multi-file
importer (AGENTIC-IMPORT.md) orders them by their declared references.

### agent_usage. KEEP (BUILT 2026-06-23, GLOBAL, `db/core/0009`)
Purpose: the per-team **free** half of the AI agent quota. Real data: `team_id`,
`period` (the metering window, a `'YYYY-MM-DD'` day, the free counter resets
daily), `used` (AI units consumed this window), `updated_at`. One unit = one
model call, metered before EACH call inside a turn (a multi-step turn costs one
unit per step, capped by `MAX_STEPS`; declining a confirm costs nothing; running
dry mid-plan stops the turn with a saved, plain reply). **A unit is spent the
moment the model answers**, so exactly one thing is refundable: the unit metered
for a step whose model call THREW, which bought no completion at all
(`refundUnspentUnit`, and only from the paid pool, the free allowance is the
daily BOUND on how much model spend a team can cause, and a refund dissolves the
bound). A REFUSED ACTION IS NOT REFUNDED: it used to be, and that made the credit
lane the unbounded one, asking to invite someone already on the team fails on
demand, every time, burning real tokens and handing the credit straight back, so
the same turn could run forever for nothing. Once a team is over the app's own daily allowance (`AGENT_FREE_DAILY`:
code default **25/day**, but both environments ship **50**), the gate spends from
the credit balance instead. Lives in
the global core DB so the gate can check it without opening a team database.

### agent_credits. KEEP (BUILT 2026-06-23, GLOBAL, `db/core/0010`)
Purpose: the **purchasable** half of the AI agent quota (the owner's credit-based
model). Real data: `team_id`, `balance` (AI credits remaining, never negative),
`lifetime_granted` (total ever granted, returned as `lifetimeGranted` by the grant
door itself — a balance is spent down, so nothing else records what a team was ever
given; it said "for the admin view" until 7 Sep 2026 and no admin view was ever
built), `updated_at`. Once a
team's free daily allowance is used up it spends from this balance; when both are
empty the agent is blocked. Top-ups are an owner action today
(`POST /api/data-ops/admin/grant-credits`, x-admin-key); real payments wire in
later against this same balance (the grant action is the seam). Lives in the
global core DB so the gate can spend a unit without opening a team database.
**This table says what the balance IS, never who moved it** — `updated_at` is a
timestamp and not an audit block. Who granted is `credit_grants`, below.

### credit_grants. KEEP (BUILT 2026-09-07, GLOBAL, `db/core/0030`)
Purpose: **who topped this team up, and when.** One row per grant. Real data:
`id`, `team_id`, `granted_at`, `amount` (always positive), `actor`, `request_id`.
Written by `grantCredits` (`shared/workers/credits.ts`) in the SAME `env.DB.batch`
as the balance it moves, so the money and its record commit together or neither
does — the shape `email_change_logs` and the email switch already use
(`workers/auth/src/lib/email-change.ts`). The record is a REQUIRED ARGUMENT of
that function rather than a follow-up call, so the payment integration that wires
into the same seam later cannot grant silently either.

**Why it is its own table and not a row in `agent_usage_log`:** that log is a
SPEND ledger — its own migration calls a row "how many AI units that command
consumed", and three readers sum it as spend (`readUsageLog` behind the quota
badge, `scripts/ai-spend.mjs`, the nightly ops digest). A +500 top-up sitting in
it would be counted as a turn and as five hundred credits spent by every one of
them unless all three learned to subtract, which is three subtractions a future
reader can forget. It is also why grants do NOT appear in the assistant's usage
dialog: that view answers "where did our credits go", and an arrival is not a
departure.

**`actor` is as honest as the door can be.** `POST /api/data-ops/admin/grant-credits`
opens on `adminGuard`, which proves possession of the owner's key and nothing
about a person, so the row says `owner-key` and invents no name. `request_id` is
the id the gateway minted for that click (`shared/workers/trace.ts`, the same
value `error_logs.request_id` joins on) — it is what tells two identical grants a
second apart apart. Before this table a leaked owner key could top a balance up
untraceably: you could read the total ever granted and the minute the row last
moved, and nothing else. Kept forever, like every other audit table here.

### agent_usage_log. KEEP (BUILT 2026-07-01, GLOBAL, `db/core/0011`)
Purpose: the usage TRAIL behind the panel's "where did my credits go" view.
Real data: `id`, `team_id`, `actor_id`, `actor_name`, `created_at`, `credits`
(units this command consumed), `source` (`free` / `credit` / `mixed`), `summary`,
**`kind`** (`db/core/0014`: `'action'` | `'prompt'` | NULL), and the **four token
columns** (`db/core/0027`): `input_tokens`, `output_tokens`, `cache_write_tokens`,
`cache_read_tokens` — the provider's own `usage` block recorded per command, because
`credits` counts REQUESTS and two one-unit turns can differ tenfold in tokens, so
"what did this month cost" is a query rather than an estimate, and the prompt-cache
hit rate (`cache_read ÷ (cache_read + cache_write + input)`) can only be written
down while the turn is happening. All four NULLABLE on purpose: a row from before
the migration was never measured, and a back-filled 0 would read as "measured, and
it cost nothing". **Visibility rides
`kind` (C3, the log tells the TEAM where its credits went):** an `action` row's
summary is TEAM-VISIBLE (the team is entitled to see what was done in its name); a
`prompt` row's summary is the author's OWN (a teammate sees who spent how much and
when, never the question typed); a back-filled NULL row stays private (it can't be
classified after the fact, and a wrong guess publishes somebody's question). The
old "only my own rows" rule showed an admin four blank rows with a teammate's name
on them, withholding the one thing the team is owed. The summary is titled by the
**WRITE action(s) the assistant took** (e.g. `Create the role
"Test" · Invite alaap@… as Test`, with `(failed)` on a refused call), falling
back to the user's prompt for a plain question OR a read-only turn. A READ isn't
an action the user "did", so it never titles the row, a clarifying reply reads as
the question, not "List roles" (the credit-log-clarity feedback). A role-choice
reply like "anything" still leads to a write (the invite), so that write titles
the row; only a turn that makes no change is titled by the prompt. **One row per
user COMMAND**,
written best-effort (a
log hiccup never fails the turn). A command that pauses for a yes/no confirm runs
as two turns (propose + confirm); the confirm turn FOLDS its units into the
propose row (`credits.ts` `foldUsageIntoLatest`) rather than adding a second
row, so the history stays one entry per command and reconciles exactly with the
balance drop (fixed 2026-07-10: a confirmed command used to split into a row +
a cryptic "(continued)" row). The fold **APPENDS** its actions to the row's title,
never replaces, one command can pause for confirmation more than once, and
replacing left a 10-credit turn titled by its last step alone. Read newest-first, team-scoped, via
`GET /api/data-ops/agent/usage-log`. Lives in the global core DB beside the
quota tables it explains.

### mcp_tokens. KEEP (BUILT 2026-07-07, GLOBAL, `db/core/0013`)

Personal access tokens for the MCP front desk: `id, user_id, team_id, label,
token_hash (sha256; the secret is shown ONCE and never stored), created_at,
**`expires_at`** (`db/core/0016`, every token has a deadline,
`MCP_TOKEN_TTL_DAYS` = 90; a MISSING one counts as expired, so nothing is
immortal), `last_used_at`, `revoked_at` (deactivate-not-delete). An account may
hold **10 live tokens** (`MAX_ACTIVE_MCP_TOKENS_PER_USER`, enforced inside the
INSERT), and the settings list sorts unrevoked rows first, together that is what
keeps every usable token inside the 1,000-row list cap and therefore revocable
from the app. Verified on EVERY /mcp request. The same migration adds **`sessions.team_pin`**, a session minted for
a token is PINNED to the token's team (auth answers /me with the pinned team;
short-lived, never slid), so a token can never act outside the team it was
created for.

### mcp_call_log. KEEP (BUILT 2026-09-16, GLOBAL, `db/core/0031`)

Every MCP call leaves one row — reads included, which is the half `origin: "mcp"`
on the team's own activity row never sees, a read mutates nothing there. Real
data: `id`, `token_id` (→ `mcp_tokens`), `user_id`, `tool_name`, `ok` (1/0 — the
door answered, or refused/errored/timed out), `trace_id` (the same id
`routes/mcp.ts` mints per request and forwards to the door — the link a failed
call's own `error_logs.request_id` joins on, so this table never duplicates
what a write already logs on the team's own `activity` row), `created_at`.
CALLER-PRIVATE, the same reviewed class `mcp_tokens` itself is: no
`publishChange`, no live listener, read back on demand from Settings → Access
tokens, per token, paged (R14, `GROWING_COLLECTIONS.mcpCallLog`) with an exact
count (R16). Swept nightly past **`MCP_CALL_LOG_RETENTION_DAYS` = 90**
(`shared/workers/retention.ts`) — diagnostics a token's owner might read weeks
later, not an audit block that stays forever.

### error_logs. KEEP (BUILT 2026-07-03, GLOBAL, `db/core/0012`)
Purpose: the central error store (ERROR-HANDLING.md), one row per UNEXPECTED
failure (worker crash or client-side error), never a clean GuardError refusal.
Real data: `id`, `at`, `source`, `place`, `message` (the CAUSE — a refusal's
`detail` where it has one, never our own sentence), `stack` (capped; absent by
declaration on a MEASUREMENT source such as `slow-door`, see
`MEASUREMENT_SOURCES` in `shared/workers/error-log.ts`), optional
`team_id`/`user_id`/`url` (the page only, query string stripped) and
`request_id` (`db/core/0020`; the request's trace id, or on unattended work the
tick's own `tick:<job>:<ISO>`), and the resolve workflow (`status`
open→resolved, `resolved_at`, `resolution_note`). Owner-only doors (x-admin-key):
`GET /api/data-ops/admin/errors` + `POST /api/data-ops/admin/errors/resolve`.
Lives in the global core DB, system health is cross-team; each environment has
its own core DB so staging/production histories never mix.

### selectable_data_types. KEEP (TO BUILD). Q2 RESOLVED (see Resolutions:
global standard GROUPS + per-team VALUES)
Glide: 3 rows (`File type`, `Learning category`, `Help type`), no team key, no
audit → a tiny GLOBAL reference of dropdown GROUPS. But the values table also
uses `Help status` (not listed as a type) and `Learning category` has no
values. (We seed the two `Help` ones as **`Ticket type`** and **`Ticket
status`**, the module is called Tickets, and team migration
`0010_ticket_vocabulary` relabelled the rows every existing team already had.
`Learning category` has no successor at all: it named a module that was purged on
17 Aug 2026, and it arrived with no values to carry across.) So the types list
and the values were loosely coupled in Glide.

### Retention in core, the ONE place rows are actually deleted

"Deactivate, never delete" is a rule about **records**: a person, a role, an
account, a ticket. It has never been a rule about **spent sign-in artefacts**,
and treating it as one is how the shared database grew with no ceiling and no
sweep.

Three tables in core are written by callers who are not signed in, anyone who
types an email address mints a `login_codes` row and a `login_sends` row, so
their totals were bounded by nothing at all, in the one database whose 10GB cap
takes the whole product down rather than one tenant. A nightly sweep
(`shared/workers/retention.ts`, run from tenancy's cron beside the size alarms)
takes:

| table | what goes | why it is safe |
| --- | --- | --- |
| `login_codes` | older than `AUTH_RETENTION_HOURS` (24h) | a code lives ten minutes; the per-address cap looks back one hour |
| `login_sends` | older than `AUTH_RETENTION_HOURS` | the send budget's whole window is one hour |
| `sessions` | already past their own `expires_at` | that cookie is already dead, every read re-checks expiry |
| `error_logs` | older than `ERROR_LOG_RETENTION_DAYS` (90) | diagnostics, not a record, and 90 days is the window `db/core/0012` has claimed since the table was created |

Sessions are judged by **expiry, not age**: `expires_at` slides forward while a
session is in use, so an age-based sweep would sign out every long-lived user.

Nothing anyone might have to answer for is touched: activity, account activity,
`agent_usage_log`, `credit_grants`, invite audits and every audit block stay. `error_logs` is the
one that moved, and only because it was already documented as a 90-day history
with nothing enforcing it, a rate ceiling (`db/core/0019`) bounds how fast a
store fills, never how full it gets. **A retention window for `account_activity`
or the usage ledgers is an owner's decision, not an index's**, and it is still
open (scaling review 2026-08-14).

**A statement is bounded; a NIGHT is bounded separately** (scaling review
2026-08-14). Each delete takes at most `RETENTION_DELETE_CAP` rows, that is the
cap on what can time out, and the tick runs that statement up to
`RETENTION_PASSES_PER_TICK` (40) times per table, stopping the moment one comes
back short. Only the first of those existed, and the difference was the finding:
5,000 rows a night against a shared database taking sign-ins from every tenant is
not retention, and at the yardstick (a quarter of a million people in one tenant,
plus everyone else) the tables grew monotonically while a green nightly job
reported success. 40 × 5,000 = 200,000 rows per table per night, no statement any
larger than the one that already worked. A run that hits the PASS ceiling is
recorded to `error_logs`, not merely logged (R12).

### cron_heartbeats. KEEP (BUILT 2026-09-07, GLOBAL, `db/core/0029`). DID THE TICK COME
Purpose: the one fact every scheduled handler could not record — that a tick
never came. One row per job (`knowledge-sweep`, `morning-digest`, `nightly`;
the list is `CRON_JOBS` in `shared/workers/cron-heartbeat.ts`, held equal to
the two wranglers' cron triggers and to the rows the migration seeds):
`last_run_at` moves on every tick that ran to its end, `last_ok_at` only on a
tick that recorded no failure. Tenancy's nightly reads content's two beats and
content's morning tick reads tenancy's; a beat older than twice its period is
one `error_logs` row (`cron/watch`) the ops digest mails. Seeded at apply time
so a schedule that never fires on a fresh environment is still noticed. Three
rows, upserted; nothing to retain or sweep.

### db_growth. KEEP (BUILT 2026-08-14, GLOBAL, `db/core/0022`). HOW LONG HAVE I GOT
Purpose: the half of the growth watch the size alarm never had. `db_alerts` says a
database has crossed 80% of D1's 10 GB cap, and 80% is a POSITION, not a warning,
two databases at 8.1 GB raise the identical alarm and are in completely different
trouble, one having sat there a year and the other having crossed 6 GB last week.
The mover takes a while and needs a person, so the question that follows every alarm
is "how long have I got", and nothing recorded the two readings a rate needs.

**One row per database, not one per night.** A sample table is the obvious shape and
the wrong one: an estate near the platform's 50,000-database limit would add 50,000
rows a night to the very database this mechanism keeps small, a growth watch that is
itself the growth. Each row holds tonight's `size_bytes`/`at` and the previous
reading (`prev_size_bytes`/`prev_at`), and the nightly upsert shifts current into
previous **inside one statement** (`excluded` vs the bare columns), so there is no
read-then-write pair to race.

**The interval is stored, not assumed.** A rate computed against a presumed 24 hours
is quietly wrong exactly when the cron has been late, skipped or re-fired, which is
when you are most likely reading it. `daysUntilFull()` (one exported function, beside
the rows it reads) is headroom-from-the-CAP ÷ (Δsize ÷ Δtime), and it returns **null**
rather than a number whenever it cannot answer honestly: one reading only, no elapsed
time, or a database that held still or shrank. "Not growing" and "growing slowly" are
different answers and only one of them is a number.

Bounded at `CRON_GROWTH_CAP` (200) readings a night, taking the LARGEST databases,
a trend only matters where there is a ceiling to reach. Written on quiet nights too
(a trend you start measuring at 80% is a trend you measured too late), and wrapped so
a failed reading can never cost somebody the alarm that a database is nearly full.
Read through the owner-gated `GET /api/tenancy/admin/db-sizes` as `filling`, soonest
first. Locked by `workers/tenancy/test/db-growth.test.ts`.

**Every sweep predicate has an index behind it** (`db/core/0015`, `0017`, `0021`).
`sessions` did not: the only index on it led with `user_id`, so the sweep meant to
keep the shared database under D1's 10 GB cap was full-scanning the largest table in
it, every night, to find 5,000 rows, a sweep whose predicate scans is the timeout
this whole mechanism exists to avoid, wearing a `LIMIT`.

The other half of the same problem is RATE, and a sweep does not solve it: every
repeatable core write now carries a per-caller ceiling that rides its INSERT
(`ACCOUNT_ACTIVITY_PER_HOUR`, the login-send budget). And the nightly size alarm
watches **every** database in the account, core included, it used to filter
`team-*`, so `kwapso-core` could never raise one.

### Where a tenant's FILES live — the object-key prefixes

R2 has no folders; a prefix is whatever the keys happen to start with. So "find,
count, move or delete one tenant's objects" is answered by the SET of prefixes its
uploads are minted under, and that set is pinned with a reason each in
`workers/content/test/media-keys.test.ts` (`PREFIXES`), derived off the doors' own
`mediaKey(...)` calls and failing both ways — a shape nobody described, and a
described shape nothing mints.

Three conventions are live at once and a key cannot be renamed once written, so
the set is documented rather than unified: kind-first (`ticket/<team>/`,
`story/<team>/`, `todo/<team>/`, from before the team-first convention),
team-first (`<team>/accounts/`, `<team>/apps/`, `<team>/tasks/`,
`<team>/knowledge/`, `<team>/brand/`, `<team>/staff/`, `<team>/deliverables/`),
and two that are keyed by the thing they belong to rather than by a team
(`teams/<team>/` for the team's own logo, `users/<user>/` for a profile photo —
the one shape with no team in it at all, because a photo follows a person between
teams).

Four of the team-first segments were added on 5 Sep 2026. Those modules shared a
bare `<team>/` prefix into one bucket, which meant an ownership proof could say
"this team's" and never "this module's" — enough for a read, not enough for a
delete. Objects already written under the bare shape stay where they are and are
never reclaimed.

There is no tenant-DELETE path today (deactivate, never delete), so this is
latent — it becomes real the first time a client asks for erasure.

### team_module_databases + team_module_moves. KEEP (BUILT: routing `db/core/0004`, the resumable ledger `db/core/0023`). WHERE A MODULE LIVES, AND HOW IT GETS THERE
*(Sections added 26 Aug 2026 — both tables predate them, and "the canonical
data-model reference" was carrying two core tables it never named.)*

**`team_module_databases`** (`0004_sharding`) is the routing override: by default a
team's data lives in its one database (`teams.database_id`), and when a module gets
heavy the mover relocates that module's tables to a dedicated database and records
it here — `team_id`, `module`, `database_id`, `created_at`, `UNIQUE (team_id,
module)`. The mover flips it LAST, so an interrupted move is never a doubled read.

**IT IS WRITTEN AND NOT YET READ (measured 5 Sep 2026).** No data door consults
this table: `requireMember` resolves one `guard.databaseId` from
`teams.database_id`, and `resolveModuleDatabases`/`queryModule` — the merged-read
entry points — have no callers outside `workers/tenancy/src/lib/sharding.ts`. So
the mover is refused at its own door (`SPLIT_READS_WIRED`) rather than left able to
empty a module out of the app while reporting success. ARCHITECTURE §7 and
BASE-MANUAL §"What's built today" carry the full argument, including why wiring the
reads is not the whole job (a merged read cannot page, sort or count).
`0004` also creates `db_alerts`, the 80%-of-10-GB size alarms `db_growth` above
turns into a rate.

**AND ONE ROW IN EACH IS NOT A DATABASE (5 Sep 2026).** D1 caps TOTAL storage per
ACCOUNT at 1 TB, and nothing watched that: about 120 databases at 8.5 GB each are
over the ceiling while every single per-database alarm reads a comfortable no, and
the named remedy for those alarms — run the module mover — CREATES another
database and spends the very thing that has run out. So the nightly check sums the
whole account listing and writes it to both tables under the sentinel id
`account:d1-storage` (`ACCOUNT_STORAGE_ID`), named
`ALL D1 STORAGE ON THIS CLOUDFLARE ACCOUNT` for a human reading the row. A D1 uuid
is 36 hex-and-dashes, so a colon cannot collide with one. The sum covers the
WHOLE listing including the other two products sharing this account — counted,
never named — because the 1 TB is charged to the account and not to the app; our
own share rides back beside it as `ourBytes`. A reader of `db_growth` must measure
that row against `D1_MAX_ACCOUNT_BYTES` and not the 10 GB per-database cap, which
is what `daysUntilFull`'s `ceilingBytes` parameter exists for.

**`team_module_moves`** (`0023_module_moves`) is what makes a killed move a
CONTINUATION rather than an orphaned second database (ARCHITECTURE §7 marks the
mover **RESUMED 2026-08-17** on the strength of it). One row per (team, module)
move: the `database_id` created for it (written BEFORE the first byte is copied, so
a retry reuses it — the field whose absence caused the orphan), `source_database_id`,
`tables_json` (the set the caller named, so a resume moves the SAME set), `status`
(`copying` → `copied` → `routed` → `drained` → `done`, named after what has ALREADY
happened), `cursors_json` (per-table last-id-copied — a cursor, not a row count,
because the copy walks by key and can stop at any moment), `verified_json` ("the
counts agreed" is a separate fact from "I reached the last row", and only it
licenses a drain), `drained_json`, `rows_copied`, `claimed_at` (the claim IS the
lock: an UPDATE with the current status in its WHERE, zero rows changed means
somebody else has it), `last_error`, and the audit timestamps. A partial unique
index (`status <> 'done'`) holds ONE live move per (team, module) — two rows would
mean two databases and a merged read counting everything twice.

---

