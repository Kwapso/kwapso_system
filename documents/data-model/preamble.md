# Data model. Glide Base v3 → the Kwapso System (the mental model)

Every table and column from the user's Glide "Base v3" export (14 CSVs),
re-read 2026-06-13, mapped to the Kwapso System's design. Marks what we KEEP (real
persisted data), what we DROP (Glide UI/computed artifacts), our additions, and
OPEN questions. This is the canonical data-model reference. Keep it accurate.

## What's in here

Sixteen and a half thousand words (recounted 26 Aug 2026) is far too many to
scroll, so: the two tiers, in order.

**Preamble**, [Glide patterns that are NOT persisted data](#glide-patterns-that-are-not-persisted-data-dropped-everywhere) · [The audit block](#the-audit-block-standard-every-table)

**GLOBAL core** (`kwapso-core`, reached by `env.DB`), identity and billing across teams:
`users` · `teams` · `team_members` · `email_change_logs` · `account_activity` ·
`importable_databases` · `agent_usage` · `agent_credits` · `credit_grants` · `agent_usage_log` ·
`mcp_tokens` · `mcp_call_log` · `error_logs` · the sharding machinery, `team_module_databases` +
`team_module_moves` + `db_alerts` + `db_growth` (where a module lives, the mover's
resumable ledger, and the size + rate watch) ·
`selectable_data_types` (the one still to build) ·
*Retention in core*, the only place rows are really deleted.

**[PER-TEAM](#per-team-each-lives-in-that-teams-own-database)** (one D1 database per team, reached over the REST door), everything a team owns:

| Subsystem | Tables |
|---|---|
| Permissions + vocabulary | `member_roles` + `role_permissions` · `selectable_data` |
| Content | `help` + `help_threads` (**Tickets**) · `help_status_events` · `help_ratings` · `help_stakeholders` · `team_ref_counters` · `ref_aliases` |
| History + invites | `activity` · `invite_logs` |
| Import | `data_import_batches`. `data_import_sessions`, the table it superseded, was dropped 2026-09-14 (migration `0087`) |
| The assistant | `agent_threads` + `agent_messages` |
| The customer spine | `accounts` + `account_links` + `portal_users` (+ `current_account_id`) |
| The knowledge base | `knowledge_sources` + `_chunks` + `_terms` + `_ingest` (+ Vectorize) |
| Process maps + the money | `apps` (+ `app_staff` + `app_stakeholders` + `app_modules` + `app_attachments`) + `processes` + `process_versions` + `process_steps` (+ `process_step_tools` + `process_step_revisions`) + `process_comments` · `process_links` · `process_drafts`. All three rate-card tables were removed on 10 Sep 2026: `internal_rates` was removed, `internal_role_rates` was removed, `account_rates` was removed |
| The client's own organisation | `client_departments` · `client_roles` (+ `client_role_departments` + `client_role_people`) · `client_tools` + `client_tool_prices` |
| What we hand over | `deliverables` |
| The work engine | `stories` (+ `story_attachments` + `story_processes`) + `sprints` · `waves` · `work_logs` + `work_prefs` · `todos` + `tasks` · `triage_duty` · `meetings` |
| The agency's own housekeeping | `brand_assets` · `meeting_purposes` · `staff_profiles`. `staff_certificates` was removed on 14 Sep 2026 |
| One person's own Google | `google_connections` + `google_sources` · `chat_people` |

**Closing**, [Status: what's built vs. to build](#status-whats-built-vs-to-build) · *Resolutions (2026-06-13), cross-cutting model LOCKED*

## Glide patterns that are NOT persisted data (dropped everywhere)

Glide columns are a mix of stored data and live "computed columns." These
recur across tables and are **not** real columns in our databases, they are
done at runtime, in the UI, or by an action:

- **Transformers / builders**: `Email transformer/*`, `*/Request body JSON
  object(/string)`, `*/New team JSON object(/string)`, `Onboarding JSON
  object(/string)`, `Accept pending invites JSON(/string)`, `Summary/JSON
  object string`, these built strings/JSON for Glide webhooks. Our workers
  build any payload in code.
- **UI/navigation state**: `*/Detail screen tab view`, `Home/Tab view`,
  `Edit screen/Type`, `Edit screen/Screen title`, `Identity/Current screen
  link`, `App information/*`, `*/Play link`, `Shortcuts/Total count`,
  `Device/Screen size`. This is per-session view state, it belongs to the
  screen engine's runtime state, never the database.
- **Clocks**: `Time/Now`, `Time/Now + 11 minutes`. Glide had no server clock;
  we use real timestamps in workers.
- **Derived values**: `Identity/Full name` (first+last), `Onboarding/Completion
  percentage`, `Profile is filled`, `Is complete`, `*/Is valid email`,
  `Change is available`, `Invite member is possible`, counts, all computed on
  read, not stored.

So: where a Glide table looks like it has 30 columns, most are computed; the
real persisted shape is small. Each table below lists only what we store.

## The audit block (standard, every table)

Glide put this on most tables; we standardize it. **OPEN Q1** = which tables.

- `created_at`, `creator_id`, `creator_email`, `creator_name`
- `updated_at`, `editor_id`, `editor_email`, `editor_name`
- `deactivated_at`, `deactivator_id`, `deactivator_email`, `deactivator_name`

Actor email+name are **snapshots at the time of the action** (so the trail
stays truthful even if that person later changes their name/email). "Archived"
in Glide = our `deactivated_at` (non-null = archived/deactivated).

---
