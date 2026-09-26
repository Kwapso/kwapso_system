## Status: what's built vs. to build

- **Built**: users, teams, team_members, invite_index, member_roles,
  role_permissions, selectable_data, activity (table only), team_module_databases,
  db_alerts, db_growth (GLOBAL core `0022`. See below), login_codes (+ `sent_ip` / `sends`, 0015, the send throttle's own
  ledger: WHO asked for each code and how many emails that row has caused, so a
  rotation is counted like a mint), sessions (+ `team_pin`, 0013), account_activity, email_change_logs +
  email_change_codes (the hashed-OTP split; BUILT 2026-06-17), invite_logs
  (per-team audit; BUILT 2026-06-22, M4). **Agent-modules build (BUILT
  2026-06-23)**: importable_databases, agent_usage, agent_credits, mcp_tokens (GLOBAL core
  0008/0009/0010); help, help_threads,
  data_import_sessions (dropped 2026-09-14, `0087`, superseded by
  data_import_batches below), agent_threads, agent_messages (per-team `0004_modules`).
  **Knowledge (BUILT 2026-08-11, retrieval rebuilt 2026-08-12)**:
  knowledge_sources, knowledge_chunks, knowledge_terms, knowledge_ingest
  (per-team `0012_knowledge` + `0020_knowledge_vectors`). The search itself lives
  in Vectorize. See R26 and BOOTSTRAP.md §3b.
  **Since:** agent_usage_log (GLOBAL core `0011`, BUILT 2026-07-01), error_logs
  (GLOBAL core `0012`, the central error store, BUILT 2026-07-03),
  data_import_batches (per-team `0006_import_batches`, the agentic multi-file
  import, BUILT 2026-07-04), the customer spine, accounts + account_links +
  portal_users (per-team `0007_customer_spine`, BUILT 2026-08-09), and
  `portal_users.current_account_id` (per-team `0008_portal_current_account`,
  BUILT 2026-08-10; see below). **The work engine (BUILT 2026-08-11):**
  `help.account_id` (`0009_help_account`), the Tickets rename's data half
  (`0010_ticket_vocabulary`), and the ticket's work-engine columns + `ref_counters`
  (`0011_ticket_work_engine`). **And since (all per-team):** process maps + the two
  rate cards (`0013_process_maps_and_money` — BOTH of those two, `internal_rates`
  and `account_rates`, were dropped again on 10 Sep 2026 by `0077` and `0078`),
  stories + sprints
  (`0014_stories_and_sprints`), work logs (`0015_work_logs`), to-dos + tasks
  (`0016_todos_and_tasks`), triage duty (`0017_triage_duty`), the agency's own
  housekeeping (`0018_agency_internal`), Google connections
  (`0019_google_connections`), the knowledge base's vector columns
  (`0020_knowledge_vectors`) and meetings (`0021_meetings`).
  **The purge (17 Aug 2026):** `0025_purge_learning_marketing_programmes` adds
  the four enrichment columns to `selectable_data`, folds the ten programmes onto
  the sprint types and drops `learning`, `learning_progress`, `marketing_posts`
  and `programs`; `0026_retire_duplicate_dropdown_values` retires the 26
  duplicated dropdown values a team born before the seed was guarded still
  carries. Both are described in full under `selectable_data` above. The CREATE
  statements for those four tables also left migrations `0004` and `0018`
  themselves, so a database built from the file today never has them, `0025`
  drops them `IF EXISTS`, for the teams that ran the old versions.
- **The per-team migration list is `TEAM_MIGRATIONS` in
  `workers/tenancy/src/team-schema/migrations.ts`**, **fifty-five today (26 Aug 2026),
  `0001_team_base` through `0055_transcript_gives_up`** (this line has now
  drifted twice — it said "eleven, through `0011_ticket_work_engine`" while the
  sections above documented `0012` to `0020`, then "twenty-seven, through
  `0027_task_admin`" for another twenty-eight; a count in prose beside the list
  it counts is a copy that only ever drifts one way, so trust the file's own
  count over this sentence). A new team's database runs all of them at creation; existing
  teams get the gap rolled to them by `POST /api/tenancy/admin/migrate-teams`.
  **That file is the source; any list written down elsewhere, here, OPERATIONS,
  BOOTSTRAP, EDGE-CASES, is a copy of it, and the copy is the one to distrust.**
- **To build (tables)**: selectable_data_types (the only remaining one), the
  global authoritative dropdown-GROUP list.

Open questions Q1–Q4 (audit scope, selectable types, activity design, role
defaults) were resolved before the foundation build; the "(later)" questions are
now resolved too — import details shipped first as the 3-stage
`data_import_sessions` (0004_modules, 2026-06-23), superseded by the agentic
`data_import_batches` (0006_import_batches, 2026-07-04) and dropped in its own
right 2026-09-14 (`0087`, see § *data_import_sessions* above) — and
`importable_databases` stayed SEPARATE from the recipe/config system (an
owner-maintained catalog).

---

## Resolutions (2026-06-13), cross-cutting model LOCKED

- **Q1 Audit block → full block on every DATA table** (global core + per-team).
  Pure system/auth tables (sessions, login_codes) stay light, no meaningful
  actor. Actor name+email are point-in-time snapshots.
- **Q2 Dropdowns → global standard GROUPS + per-team VALUES.** The group list
  (file type, ticket type, ticket status, + any the base needs)
  is global + standard so code can rely on a group existing; values inside each
  group are per-team and editable, seeded with defaults. (`selectable_data_types`
  = global; `selectable_data` = per-team, as built.)
- **Q3 Activity → log EVERYTHING (Glide breadth): creations, edits,
  activations/deactivations, and system milestones** (member joined, invite
  sent/accepted, import stage done). Reference the subject row by a **generic
  `(related_table, related_row_id)` pair**, assumption: generic over Glide's
  one-column-per-table, because it scales to any future module without schema
  changes and matches our anti-bloat rule. (Supersedes the earlier
  "edits/deactivations only" rule.)
- **Q4 Roles → Admin locked + team always keeps ≥1 Admin; Viewer is a normal
  editable/deactivatable role.** EDGE, sole admin: the server REFUSES any change
  that would drop a team below one active Admin, and no one can remove or demote
  themselves, so a SOLE admin can't currently leave or be offboarded until they
  promote another member to Admin first. An explicit transfer-ownership /
  leave-team flow (and what becomes of a fully-empty team) is future work, not
  designed, not scheduled, and deliberately not written down as a plan anywhere
  else (this paragraph is the record of it; ROADMAP.md is a closed build history
  and never covered it). Until then the team simply never reaches zero admins. Role changes are direct, instant server
  actions. Glide's async "updated role id + webhook complete" two-step is
  dropped (it was a Glide limitation we don't have).

Resolved in the agent-modules build (2026-06-23): the import-session details
shipped as `data_import_sessions` (the 3-stage session; superseded 2026-07-04 by
`data_import_batches` and dropped 2026-09-14, `0087` — § *data_import_sessions*
above); and `importable_databases` stayed SEPARATE from the recipe/config system
(the locked decision above).
