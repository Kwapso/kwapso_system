// EVERY MIGRATION EVERY TEAM DATABASE HAS EVER BEEN CARRIED THROUGH — an
// APPEND-ONLY LEDGER, and that is why it is a file of its own.
//
// Split out of team-schema.ts on 6 Sep 2026. Nothing here changed: the array is
// the same array, in the same order, with the same SQL, and the split was proved
// by dumping every migration's text plus the generated seed script before and
// after and comparing the SHA-256. What changed is that the 200 lines a person
// actually reads and edits — the starting vocabularies, the sprint-type
// catalogue, the seed builder — no longer sit at the bottom of a 4,233-line file
// behind 3,900 lines of history nobody reads top to bottom.
//
// TWO THINGS THAT MUST STAY TRUE OF THIS FILE, both load-bearing:
//
//   1. `TEAM_MIGRATIONS` IS AN ARRAY LITERAL, right here, in one piece. The
//      migration gate (scripts/check-team-migrations.mjs) reads the LAST entry's
//      version off this file's syntax tree — never a copied constant, because a
//      copied version number is a gate that goes green while the estate is
//      behind. Composing the array from spreads, or moving it again, breaks that
//      derivation. It throws rather than returning nothing, so the failure is
//      loud, but the file it names is THIS one.
//   2. ORDER IS THE SCHEMA. `migrateTeams` applies these in sequence from
//      wherever a team has reached, so a new migration is APPENDED and an
//      existing one is never edited — a team that already ran 0042 will never
//      run it again.
//
// Adding a future team-table = appending an entry here; the migration runner
// (POST /api/tenancy/admin/migrate-teams) rolls it out to every team.

import { sqlString } from "@shared/workers/d1-rest"
import {
  canonicalRef,
  canonicalRefSql,
  REF_ALIAS_TABLE,
  refNumberSql,
  staleRefSql,
  TEAM_REF_KINDS,
  TEAM_REF_TABLES,
  type TeamRefKind,
} from "@shared/workers/refs"
import { TASK_DEPARTMENTS } from "@shared/departments"
import { APP_STAGES } from "@shared/app-stages"
import { DELIVERABLE_KINDS, SELECTABLE_GROUPS } from "@shared/selectable-groups"

import { COMPANY_VOCABULARY, INTERNAL_VOCABULARY, SPRINT_TYPE_CATALOGUE } from "./seed"

/** THE APP ORDER THE CLIENT DICTATED, 2026-09-01, TRANSCRIBED EXACTLY.
 *
 * POSITION IS THE NUMBER. Index 0 is `A0001`, index 21 is `A0022`. This is a
 * lookup table and not a sequence: nothing here is sorted, deduplicated or
 * renumbered, and an entry that matches no live app leaves the number it names
 * unissued rather than shifting the entries after it up. 0072's own header
 * argues that at length. It named TWO entries that matched nothing in the live
 * estate and why neither could be resolved by inference; the client answered
 * one of them on 9 Sep 2026 (#28 is the app the PLATINUM account holds, under
 * either of its two names — see `alsoKnownAs` at that entry), and #29 is still
 * unanswered and still leaves its number unissued.
 *
 * SPELLINGS ARE HERS AND ARE COMPARED EXACTLY, case included — `aWs` at #15 is
 * how the account is really spelled in the database, `re-green` really has a
 * hyphen in it, `196+` really has a plus. A case-insensitive or trimmed compare
 * would be a kindness that hides a genuine mismatch, which is the one thing this
 * job must not do.
 *
 * IT LIVES IN THE LEDGER because the ledger is what actually wrote the numbers,
 * and a list of proper nouns that only a script remembers is a list nobody can
 * audit a stored reference against afterwards. It is read by exactly one
 * migration, which is frozen the moment it ships;
 * `scripts/backfill-refs-2026-09-01.mjs` holds the same 29 entries as the
 * PROVENANCE record of where they came from, and no longer writes anything. */
const APP_ORDER_2026_09_01: { name: string; account: string; alsoKnownAs?: string[] }[] = [
  { name: "CONFIA", account: "Confia" },
  { name: "S4Y Office", account: "Safety4You" },
  { name: "196+ awards", account: "196+" },
  { name: "EmployR", account: "HOGO" },
  { name: "MAKLAR Pickl", account: "Pickl" },
  { name: "IFNW", account: "Institut Vividus" },
  { name: "S4Y Mitarbeiter", account: "Safety4You" },
  { name: "Comunitapp", account: "Cardenal Reig" },
  { name: "Padelbase", account: "Padelbase" },
  { name: "S4Y Schulungszentrum", account: "Safety4You" },
  { name: "S4Y Extern", account: "Safety4You" },
  { name: "Looom", account: "Looom" },
  { name: "VU Solutions", account: "VU Solutions" },
  { name: "Amstella", account: "Amstella" },
  { name: "AWS", account: "aWs" },
  { name: "Amstella Ops", account: "Amstella" },
  { name: "Assecuranz", account: "Assecuranz" },
  { name: "re-green", account: "re-green" },
  { name: "Fuhrpark", account: "HOGO" }, // #19 — the OTHER Fuhrpark is #25
  { name: "HORST", account: "HOGO" },
  { name: "ETZI", account: "Etzi Haus" },
  { name: "Kwapso System", account: "Kwapso" },
  { name: "FluClinic", account: "FluClinic" },
  { name: "Academy", account: "Padelbase" },
  { name: "Fuhrpark", account: "DEMO" }, // #25 — the OTHER Fuhrpark is #19
  { name: "Kwapso Portal", account: "Kwapso" },
  { name: "Ontime Fuhrpark", account: "Ontime Logistics" },
  // #28 — SHE ANSWERED ON 9 SEP 2026: "Yes, what we now call Platinum (this is
  // the current name) is what we before called Kennogroup." So this entry names
  // a real app, and `alsoKnownAs` is the only reason the migration can find it:
  // her sentence is a statement that TWO NAMES DENOTE ONE APP, and the database
  // was last seen wearing the older of them. See 0072's header for the full
  // reasoning and for why the pair guard, not this list, is what proves it.
  { name: "Platinum", account: "PLATINUM", alsoKnownAs: ["ERP Kennogroup"] },
  { name: "Players", account: "Padelbase" }, // matches nothing live — see 0072's header
]

export const TEAM_MIGRATIONS: { version: string; sql: string }[] = [
  {
    version: "0001_team_base",
    sql: `
CREATE TABLE _migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE member_roles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT,
  updated_at TEXT, editor_id TEXT, editor_email TEXT, editor_name TEXT,
  deactivated_at TEXT, deactivator_id TEXT, deactivator_email TEXT, deactivator_name TEXT
);

-- Tall permission sheet (locked): role | module | the four switches.
CREATE TABLE role_permissions (
  id TEXT PRIMARY KEY,
  role_id TEXT NOT NULL REFERENCES member_roles (id),
  module TEXT NOT NULL,
  can_read INTEGER NOT NULL DEFAULT 0,
  can_create INTEGER NOT NULL DEFAULT 0,
  can_edit INTEGER NOT NULL DEFAULT 0,
  can_delete INTEGER NOT NULL DEFAULT 0,
  UNIQUE (role_id, module)
);

CREATE TABLE selectable_data (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  value TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT,
  updated_at TEXT, editor_id TEXT, editor_email TEXT, editor_name TEXT,
  deactivated_at TEXT, deactivator_id TEXT, deactivator_email TEXT, deactivator_name TEXT
);

-- Activity log — the team's whole change trail, birth to death, in ONE table.
--
-- THIS COMMENT USED TO SAY THE OPPOSITE, and said it for a year: "edits,
-- deactivations, activations ONLY — creations live on each row's own audit
-- columns". The code has never done that. It writes "Account created", "Ticket
-- raised", "Story created", "Meeting arranged"; shared/workers/activity.ts has
-- said "log everything" at the top of the file the whole time; and DATA-MODEL's
-- Q3 resolution settled it in writing (18 Aug 2026). This was the odd one out,
-- and it is the one a developer reads while adding a table — so it was the one
-- sentence in the codebase that could talk somebody into starting a new module's
-- trail at its first EDIT, deliberately, to comply with a rule nothing else
-- follows. The trail would then be silently incomplete for that module alone,
-- and would read as finished because every other module's does.
--
-- LOG EVERYTHING: creations, edits, activations, deactivations, joins, invites,
-- import stages, milestones. Per-row audit columns answer "who made this"; they
-- cannot answer "show me this record's life in order", which is the whole point.
--
-- APPEND-ONLY. Nothing in the application updates or deletes a row here, the
-- nightly retention sweep excludes the table by name, and there is exactly one
-- way in from outside a migration (insertActivity, private, behind logActivity
-- and writeActivity). That was true before it was written down anywhere, which
-- is the problem with it having been true: an invariant nobody states is one the
-- next person can break without knowing it existed. Stated here, and asserted by
-- workers/tenancy/test/activity-trail.test.ts ("no worker updates or deletes a
-- row in the activity table"), which fails on any UPDATE or DELETE against this
-- table anywhere in the workers.
--
-- verb and origin arrive in 0062 and are NULL on every row older than it —
-- see that migration for why neither is backfilled.
CREATE TABLE activity (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  related_table TEXT,
  related_row_id TEXT,
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT
);
CREATE INDEX idx_activity_related ON activity (related_table, related_row_id);
`,
  },
  {
    // Screen-engine config: a team's per-screen recipe OVERRIDES. The base
    // recipes ship in app code (one definition every team inherits); a row here
    // overrides one screen for THIS team — the runtime-editable layer that lets
    // an admin/agent reshape a screen with no deploy. `recipe` is opaque JSON to
    // the worker (the web app owns the ScreenRecipe shape + validates it).
    version: "0002_screens",
    sql: `
CREATE TABLE screens (
  module TEXT PRIMARY KEY,          -- the screen/recipe key, e.g. "members" | "member_roles"
  recipe TEXT NOT NULL,             -- a ScreenRecipe as JSON (overrides the base)
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT,
  updated_at TEXT, editor_id TEXT, editor_email TEXT, editor_name TEXT
);
`,
  },
  {
    // Per-team invite audit (DATA-MODEL §invite_logs). The full record for an
    // invite lives HERE in the team DB: a frozen inviter snapshot + the invitee +
    // the proposed role + shelf life + acceptance stamp. The GLOBAL invite_index
    // stays the thin routing copy (find invites by email without opening team DBs);
    // its `invite_row_id` is this row's id. `shelf_life_in_hours` defaults to 168
    // (the 7-day expiry). Acceptance is stamped when the invite is accepted.
    version: "0003_invite_logs",
    sql: `
CREATE TABLE invite_logs (
  id TEXT PRIMARY KEY,                       -- = invite_index.invite_row_id
  inviter_user_row_id TEXT,
  inviter_email TEXT,
  inviter_full_name TEXT,
  inviter_image TEXT,
  invitee_user_row_id TEXT,                  -- null if they have no account yet
  invitee_email TEXT NOT NULL,
  proposed_member_role_id TEXT NOT NULL,
  created_on TEXT NOT NULL,
  shelf_life_in_hours INTEGER NOT NULL DEFAULT 168,
  invite_accepted INTEGER NOT NULL DEFAULT 0,
  invite_acceptance_timestamp TEXT
);
`,
  },
  {
    // The next-build modules (help + import + the agent's saved conversations),
    // all per-team. See AGENT-MODULES-PLAN.md + the design notes.
    // Tickets are team-wide (My/All tabs = a creator filter, no row-level privacy).
    // Agent conversations get their OWN tables (not help's). Module file storage
    // lives in per-module R2 buckets with a per-team key prefix (not in D1).
    //
    // THIS MIGRATION USED TO CREATE `learning` AND `learning_progress` TOO.
    // The Learning module was purged on 17 Aug 2026 (the owner's ruling: the
    // material had already been indexed into the knowledge base, so the module
    // was a second home for words that had a first one). The CREATEs are gone
    // from HISTORY rather than merely dropped afterwards, because a fresh clone
    // must not rebuild the module even for a moment — and 0025 drops the tables
    // for the teams that already ran this version. Git history keeps the shape
    // for anyone who needs to read it; this file is what a new database becomes.
    version: "0004_modules",
    sql: `
-- Tickets (team-wide). The built-in status (open/in_progress/resolved/
-- reopened) is the source of truth the code trusts; help_type is a cosmetic
-- selectable value. source_* captures the screen/record a ticket was raised from.
CREATE TABLE help (
  id TEXT PRIMARY KEY,
  help_type TEXT,
  description TEXT NOT NULL,
  screen_recording_link TEXT,
  source_screen TEXT,
  source_related_table TEXT,
  source_related_row_id TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  resolved INTEGER NOT NULL DEFAULT 0,
  resolved_at TEXT,
  resolver_id TEXT, resolver_email TEXT, resolver_name TEXT,
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT,
  updated_at TEXT, editor_id TEXT, editor_email TEXT, editor_name TEXT
);
CREATE INDEX idx_help_creator ON help (creator_id);
CREATE INDEX idx_help_status ON help (status);

-- Threaded replies on a ticket. tagged_user_ids = JSON array (mention = notify
-- only). is_agent marks the AI-drafted first reply.
CREATE TABLE help_threads (
  id TEXT PRIMARY KEY,
  help_id TEXT NOT NULL REFERENCES help (id),
  message_body TEXT NOT NULL,
  tagged_user_ids TEXT,
  is_agent INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT
);
CREATE INDEX idx_help_threads_help ON help_threads (help_id);

-- The 3-stage data import (file validation -> extraction -> import via API) +
-- completion. table_id/name point at the GLOBAL importable_databases target;
-- preview_json is what the owner reviews before the write.
CREATE TABLE data_import_sessions (
  id TEXT PRIMARY KEY,
  table_id TEXT NOT NULL,
  table_name TEXT,
  required_columns_json TEXT,
  auto_populate_columns_json TEXT,
  column_mapping_json TEXT,
  overall_status TEXT NOT NULL DEFAULT 'started',
  uploaded_file_url TEXT,
  file_validated INTEGER NOT NULL DEFAULT 0,
  extraction_response TEXT,
  extraction_status_code INTEGER,
  preview_json TEXT,
  extraction_complete INTEGER NOT NULL DEFAULT 0,
  import_response TEXT,
  import_initiated INTEGER NOT NULL DEFAULT 0,
  import_response_code INTEGER,
  import_complete INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT,
  updated_at TEXT
);

-- Saved agent conversations (per-team, the agent's memory). OWN tables, distinct
-- from help_threads (ticket-shaped). agent_messages records each turn + the
-- tool-calls (actions) the agent took, and the source (in-app vs which MCP client).
CREATE TABLE agent_threads (
  id TEXT PRIMARY KEY,
  title TEXT,
  last_message_at TEXT,
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT,
  updated_at TEXT
);
CREATE INDEX idx_agent_threads_creator ON agent_threads (creator_id);

-- WHAT WAS ASKED AND WHAT WAS ANSWERED, AND content IS NEVER REWRITTEN.
--
-- (No backticks anywhere in this comment: it lives inside a TEMPLATE LITERAL,
-- so a backtick here ends the SQL string and the file stops parsing. The lint
-- caught it in 15ms; it is worth the sentence because the next person to
-- document a column in this file will reach for them exactly as I did.)
--
-- Nothing in any worker issues an UPDATE against this column. The ONE update
-- this table takes is on tool_calls_json (data-ops lib/threads.ts), and it is a
-- compare-and-swap -- AND tool_calls_json = the value we just read -- so even
-- that cannot silently overwrite a concurrent decision.
--
-- Said out loud because the property is LOAD-BEARING and was carried by nothing
-- but the absence of code. This is the assistant's own trail: it is what the
-- team is shown when they ask what the assistant did on their behalf, and the
-- one place a machine's account of its own actions is kept. A trail whose text
-- can be edited after the fact answers a different question from the one people
-- think they are asking it, and the edit would leave no mark. The activity
-- table states the same guarantee for the same reason; this one had it and
-- never claimed it.
--
-- If a message ever needs to CHANGE, append a new row and leave this one alone.
CREATE TABLE agent_messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES agent_threads (id),
  role TEXT NOT NULL,
  content TEXT,
  tool_calls_json TEXT,
  source TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_agent_messages_thread ON agent_messages (thread_id);
`,
  },
  {
    // Manually-added ticket stakeholders. Add-only by design (no edit/remove path):
    // the raiser, team admins, and thread @mentions are DERIVED at read time and are
    // not stored here — only explicit manual adds live as rows.
    version: "0005_help_stakeholders",
    sql: `
CREATE TABLE help_stakeholders (
  id TEXT PRIMARY KEY,
  help_id TEXT NOT NULL REFERENCES help (id),
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT,
  UNIQUE (help_id, user_id)              -- adding the same person twice is a no-op
);
CREATE INDEX idx_help_stakeholders_help ON help_stakeholders (help_id);
`,
  },
  {
    // Agentic multi-file import (AGENTIC-IMPORT.md). A BATCH groups several uploaded
    // files, the agent-built PLAN (targets, mappings, normalization, references,
    // dependency order), and the per-row REPORT — all as JSON here. Per-file parsing
    // reuses the single-target session engine; this table is the batch shell.
    // Creator-scoped like data_import_sessions (a batch belongs to who started it).
    version: "0006_import_batches",
    sql: `
CREATE TABLE data_import_batches (
  id TEXT PRIMARY KEY,
  overall_status TEXT NOT NULL DEFAULT 'draft',   -- draft|analyzing|planned|running|complete
  files_json TEXT,          -- [{fileId,name,headers,sampleRows,rowCount,rawRows}]
  plan_json TEXT,           -- the agent plan (steps, order) the user reviews
  report_json TEXT,         -- the per-target result + rejections
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT,
  updated_at TEXT, completed_at TEXT
);
CREATE INDEX idx_import_batches_creator ON data_import_batches (creator_id, created_at DESC);
`,
  },
  {
    // THE CUSTOMER SPINE (SCOPE ch.03 "People — one table" + ch.05 "Data model").
    // Every company and every person is ONE row in `accounts`; `account_type`
    // says which. Nothing else in the app gets a second people-table.
    version: "0007_customer_spine",
    sql: `
-- The hierarchy is a SELF-POINTER with unlimited depth (a holding company's
-- businesses, a business's divisions). A move that would close a loop is refused
-- by the write itself — the cycle test rides the UPDATE's WHERE (lib/accounts.ts
-- setAccountParent), so two people re-parenting at the same instant cannot
-- co-operate their way into a ring that makes roll-ups count twice or run forever.
--
-- \`code\` is the human REFERENCE staff assign when work starts (BERG). Unique so
-- two people can't mint the same one at the same instant (CONCURRENCY rule 2),
-- nullable because most rows never earn one — and NEVER an identifier: every
-- route addresses a row by its ULID \`id\`, so re-coding an account can never
-- re-point its tickets, its files or its history.
--
-- \`deactivated_at\` is ARCHIVE — the everyday remove, which keeps the row, its
-- children and its history intact. It is the ONLY thing that says whether an
-- account is live.
--
-- \`status\` is still a column and is read by NOTHING (0042). History stays true —
-- dropping a column is the one migration you cannot take back — but the app no
-- longer writes it, reads it, filters on it, sorts by it or shows it. It had
-- been a free-text second answer to the question the flag above already
-- answers, and free text is how it grew four spellings of two ideas. The same
-- shape as \`meetings.status\`, retired for the same reason.
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  account_type TEXT NOT NULL CHECK (account_type IN ('entity', 'individual')),
  parent_account_id TEXT REFERENCES accounts (id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  code TEXT,
  currency TEXT,
  locale TEXT,
  timezone TEXT,
  commercials_visible INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT,
  updated_at TEXT, editor_id TEXT, editor_email TEXT, editor_name TEXT,
  deactivated_at TEXT, deactivator_id TEXT, deactivator_email TEXT, deactivator_name TEXT,
  CHECK (parent_account_id IS NULL OR parent_account_id <> id)
);
-- The race guard: two staff assigning "BERG" at the same instant. Partial, so the
-- (many) rows with no code don't collide with each other.
CREATE UNIQUE INDEX idx_accounts_code ON accounts (code) WHERE code IS NOT NULL;
CREATE INDEX idx_accounts_parent ON accounts (parent_account_id);
CREATE INDEX idx_accounts_name ON accounts (name);

-- A PERSON's relationship to an account. This is what the parent pointer cannot
-- say: Marta is a contact of Bergman AND of Delaval, and a single parent has room
-- for only one of them. "Contact" is a role word, not a table — it is THIS row.
CREATE TABLE account_links (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts (id),        -- the company side
  person_account_id TEXT NOT NULL REFERENCES accounts (id), -- the person's own row
  relationship TEXT,                                        -- "Operations manager"…
  is_main_stakeholder INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT,
  updated_at TEXT, editor_id TEXT, editor_email TEXT, editor_name TEXT,
  deactivated_at TEXT, deactivator_id TEXT, deactivator_email TEXT, deactivator_name TEXT,
  CHECK (account_id <> person_account_id)
);
-- Race guard: two staff adding the same person to the same company at once. Partial
-- on ACTIVE rows, so unlinking and re-linking later is allowed (the old row stays).
CREATE UNIQUE INDEX idx_account_links_pair ON account_links (account_id, person_account_id) WHERE deactivated_at IS NULL;
CREATE INDEX idx_account_links_person ON account_links (person_account_id);

-- THE LOGIN SWITCH. Linking and logging in are fully independent: an individual can
-- be linked with no login, and a freelancer can hold a login on their own account
-- with no parent. Granting writes a row here and sends the invite; REVOKING
-- deactivates it — login dies, every record stays (SCOPE ch.06 offboarding). The
-- audit block IS the grant record: creator_* is who granted it, deactivator_* is
-- who revoked it, so there is no second granted_by column to keep in step.
-- app_restriction: null = the whole account's world.
CREATE TABLE portal_users (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts (id),
  user_id TEXT NOT NULL,
  app_restriction TEXT,
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT,
  updated_at TEXT, editor_id TEXT, editor_email TEXT, editor_name TEXT,
  deactivated_at TEXT, deactivator_id TEXT, deactivator_email TEXT, deactivator_name TEXT
);
-- Race guard AND the pin itself: at most ONE live grant per person, so the guard
-- corridor always resolves a caller to exactly one account set. Two concurrent
-- grants can't leave a person straddling two fences.
CREATE UNIQUE INDEX idx_portal_users_user ON portal_users (user_id) WHERE deactivated_at IS NULL;
CREATE INDEX idx_portal_users_account ON portal_users (account_id);

-- Existing teams: the locked Admin role gains the two new modules in full (it is
-- DEFINED as full access, and it can't be edited afterwards to grant them). Every
-- other role gains nothing — a migration must never hand out sight of customer
-- data that nobody granted. \`is_default\` is 1 on Admin alone, so it doubles as
-- the bit. New teams don't reach this: their seed writes the rows already.
INSERT INTO role_permissions (id, role_id, module, can_read, can_create, can_edit, can_delete)
SELECT lower(hex(randomblob(16))), r.id, m.module, r.is_default, r.is_default, r.is_default, r.is_default
  FROM member_roles r
  CROSS JOIN (SELECT 'accounts' AS module UNION ALL SELECT 'portal_users') m
 WHERE NOT EXISTS (
   SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.module = m.module
 );
`,
  },
  {
    version: "0008_portal_current_account",
    sql: `
-- A client login stands in ONE company at a time and switches between them
-- (owner decision, 10 Aug 2026) — the same bargain the team switcher makes.
-- This is that pointer, and nothing more: it NARROWS the fence to one of the
-- companies the person already belongs to, it can never widen it. NULL means
-- "not chosen yet", which the guard corridor reads as their first company, so
-- every existing grant keeps working without a backfill.
ALTER TABLE portal_users ADD COLUMN current_account_id TEXT REFERENCES accounts (id);
`,
  },
  {
    version: "0009_help_account",
    sql: `
-- WHOSE QUESTION IS THIS? (owner decision, 11 Aug 2026.) A client contact used
-- to see only the tickets they personally raised, because the only thing on the
-- row that could fence them was \`creator_id\`. At a real client the finance
-- person and the ops person were invisible to each other, which is not what a
-- company's portal means. The owner's ruling: a contact sees their COMPANY's
-- world — the company they are standing in and everything nested beneath it,
-- which is the account fence, already written, already tested.
--
-- So the ticket carries the account it was raised for, and the fence becomes the
-- ORDINARY one (\`accountScopeClause\`) instead of a second idea of who you are.
-- A staff-raised ticket stays NULL: it belongs to no client, and NULL never
-- matches an IN list, so the agency's own questions stay the agency's.
ALTER TABLE help ADD COLUMN account_id TEXT REFERENCES accounts (id);
CREATE INDEX idx_help_account ON help (account_id);

-- BACKFILL, in the SAFE direction. An existing ticket has no record of which
-- company it was raised for (the raiser may belong to two), so guessing a
-- company could hand one client another's question — the exact failure this
-- change exists to end. Instead each old ticket lands on its raiser's OWN person
-- row, which is inside that person's fence and nobody else's unless their record
-- genuinely hangs under the company. Old tickets therefore keep EXACTLY today's
-- visibility; the widening starts with the next question raised.
UPDATE help SET account_id = (
  SELECT pu.account_id FROM portal_users pu WHERE pu.user_id = help.creator_id
   ORDER BY (pu.deactivated_at IS NULL) DESC LIMIT 1
) WHERE account_id IS NULL AND creator_id IS NOT NULL;
`,
  },
  {
    version: "0010_ticket_vocabulary",
    sql: `
-- THE SECTION IS CALLED TICKETS (owner ruling, 11 Aug 2026). The dropdown
-- vocabulary carried the old name in its DATA, not its code: every team's
-- selectable_data holds rows typed 'Help type' and 'Help status', and that
-- string is what the Dropdown values screen prints as a group heading and what
-- the ticket form filters on. Renaming the seed alone would rename it for teams
-- created AFTER this deploy and leave every existing team's type picker empty,
-- because the reader looks for the new name and the rows still say the old one.
--
-- So the rows move too. Only the LABEL changes — each value ('Bug report',
-- 'resolved') and each id is untouched, so a ticket that already names a type
-- goes on naming it.
UPDATE selectable_data SET type = 'Ticket type' WHERE type = 'Help type';
UPDATE selectable_data SET type = 'Ticket status' WHERE type = 'Help status';

-- The same sentence about the screen-recipe store, which is keyed by the recipe
-- key and whose key changed with the URL segment ('help.list' -> 'tickets.list').
-- A team that had reshaped its ticket list would find its override silently
-- ignored: the resolver would ask for a key nobody wrote and fall back to the
-- base recipe. INSERT OR IGNORE-shaped on purpose — if somebody has already
-- written the new key, theirs wins and the stale row is dropped.
UPDATE OR IGNORE screens SET module = 'tickets.list' WHERE module = 'help.list';
DELETE FROM screens WHERE module = 'help.list';
`,
  },
  {
    // THE WORK ENGINE, part one: the ticket grows into the thing SCOPE ch.07
    // describes. Columns on the table that already exists, never a second ticket
    // beside it — a second one means a second conversation, a second fence, a
    // second activity trail and two things called a ticket forever.
    version: "0011_ticket_work_engine",
    sql: `
-- The five states (SCOPE ch.07: new -> triaged -> in progress -> ready ->
-- resolved). The two old names move onto the two new ones that mean the same
-- thing: 'open' was a ticket nobody had read yet, which is 'new'; 'reopened' was
-- one a staff member had deliberately pulled back into play, which is 'triaged'
-- — it has been read, and it is not being worked on yet.
--
-- The redundant \`status <> \` half of each predicate is not decoration. A
-- migration is recorded in _migrations and runs once, but the one time anybody
-- types these statements again is during a recovery, by hand, under pressure —
-- and a status move that is safe to re-run is one less thing to be frightened of
-- then. It is also the law the rest of the file lives under (R17).
UPDATE help SET status = 'new' WHERE status = 'open' AND status <> 'new';
UPDATE help SET status = 'triaged' WHERE status = 'reopened' AND status <> 'triaged';

-- THE REFERENCE NUMBER (SCOPE ch.02, "BERG-T0412"). Per ACCOUNT, not global:
-- Glide's are global and fully interleaved, so continuity was never on offer, and
-- a number a client quotes should count THEIR requests, not ours and every other
-- client's. Nullable because most of the agency's own tickets have no account and
-- no code to build one from — a ticket with no client has nobody to quote it to.
ALTER TABLE help ADD COLUMN ref TEXT;
-- The race guard AND the promise: two people raising a ticket on one account at
-- the same instant cannot end up quoting the same number. Partial, so the many
-- rows with no ref don't collide with each other.
CREATE UNIQUE INDEX idx_help_ref ON help (ref) WHERE ref IS NOT NULL;

-- DRAG-RANK — the only priority signal there is (SCOPE ch.07: no priority
-- dropdown, ever). Sparse text keys, so moving one ticket writes one row; see
-- shared/workers/rank.ts for why it is a string.
ALTER TABLE help ADD COLUMN rank TEXT;
-- Every existing ticket starts ranked by its own id, which is a ULID and
-- therefore already in the order they were raised. So the list looks EXACTLY as
-- it did the moment before this migration ran, and the first drag is the first
-- change anybody sees.
UPDATE help SET rank = id WHERE rank IS NULL;
CREATE INDEX idx_help_rank ON help (rank);

-- THE LOCK (SCOPE ch.07: "editing and ranking lock at first staff touch"). The
-- account owns the wording while nobody here has read it; once we have, the
-- record of what they asked for stops moving under the conversation about it.
-- A timestamp rather than a flag, because "when" is the question anyone asks.
ALTER TABLE help ADD COLUMN locked_at TEXT;
-- A ticket that has already been worked is already locked — its wording was
-- settled long ago, and back-dating that to the row's own last edit is the
-- closest true answer available.
UPDATE help SET locked_at = COALESCE(updated_at, created_at) WHERE status <> 'new';

-- THE DRAFT REPLY the closing note of each story appends to (SCOPE ch.07,
-- "story close is a transaction"). It is a draft, not a message: it becomes a
-- reply only when a person sends it.
ALTER TABLE help ADD COLUMN draft_resolution TEXT;

-- ARCHIVE, available from any state (SCOPE ch.07) — the base's deactivate-never-
-- delete, wearing the word the glossary already uses for it.
ALTER TABLE help ADD COLUMN archived_at TEXT;
ALTER TABLE help ADD COLUMN archiver_id TEXT;
ALTER TABLE help ADD COLUMN archiver_email TEXT;
ALTER TABLE help ADD COLUMN archiver_name TEXT;

-- BOTH TITLES, kept (build brief §8). 1,764 of the tickets coming from Glide have
-- a German title, 1,010 English, and 788 exist ONLY in German. The original is
-- never overwritten by a translation — that is the whole reason there are two
-- columns rather than one column and a language flag.
ALTER TABLE help ADD COLUMN title_de TEXT;
ALTER TABLE help ADD COLUMN title_en TEXT;

-- THE REFERENCE COUNTER, one row per (account, kind of thing). Allocation is a
-- SINGLE statement — INSERT … ON CONFLICT DO UPDATE … RETURNING — so two
-- simultaneous writers cannot both read "11" and both write "12" (CONCURRENCY.md
-- rule 1: the counter rides the write, never a read-then-write).
CREATE TABLE ref_counters (
  account_id TEXT NOT NULL REFERENCES accounts (id),
  kind TEXT NOT NULL,                -- 'T' ticket, 'S' story, 'SPR' sprint, …
  next_no INTEGER NOT NULL,
  PRIMARY KEY (account_id, kind)
);

-- THE FOUR TICKET TYPES SCOPE names (feedback / bug / question / extra). Added,
-- never swapped: SCOPE calls this an EDITABLE list, and a team's existing types
-- are on tickets already — deleting them would blank the type of every ticket
-- that names one. The old values stay pickable until somebody retires them on
-- the Dropdown values screen, which is what that screen is for.
INSERT INTO selectable_data (id, type, value, is_default, created_at, creator_name)
SELECT lower(hex(randomblob(16))), 'Ticket type', v.value, 1, datetime('now'), 'kwapso'
  FROM (SELECT 'Feedback' AS value UNION ALL SELECT 'Bug' UNION ALL SELECT 'Question' UNION ALL SELECT 'Extra') v
 WHERE NOT EXISTS (
   SELECT 1 FROM selectable_data s WHERE s.type = 'Ticket type' AND s.value = v.value
 );
`,
  },
  {
    // THE KNOWLEDGE BASE — one knowledge base, many COMPARTMENTS, chosen for the
    // reader rather than by them (.plans/BUILD-2-knowledge-base.md §1).
    //
    // WHY THE VECTORS LIVE HERE, in the team's own database, rather than in one
    // account-wide index: "every vector, every chunk and every source row belongs
    // to exactly one team, and retrieval can never cross that line." A per-team
    // database makes that STRUCTURAL — a caller's guard resolves one database id
    // and the SQL cannot name another. An account-global index with a team id in
    // the metadata makes it a filter somebody wrote correctly today. The whole
    // argument, and what would change our mind, is at the top of
    // workers/content/src/lib/knowledge.ts.
    version: "0012_knowledge",
    sql: `
-- A SOURCE is one piece of material the assistant may read. Two families in one
-- table, because a person edits them in the same list:
--   • TYPED here (kind 'note') — the body IS the truth, written in the app;
--   • MIRRORED from a row we already own (kind 'ticket' / 'article' / 'account')
--     — the ROW is the truth and the sweep keeps the body in step with it.
-- Deactivating either means "stop reading this": the sweep SKIPS an excluded
-- source rather than re-adding it, which is what makes "take out something
-- wrong" stick. Deactivate-never-delete, so the decision and who made it survive.
--
-- \`compartment\` is the design in one column: 'agency' for our own material,
-- 'account:<id>' for one client's. DERIVED on write from the row the source
-- mirrors, correctable by hand, never free-typed.
--
-- \`owner_user_id\` is the second fence, and the one a personal Google connection
-- will land on: NULL means the team's (what the organisation can see), a value
-- means one person's. Retrieval ANDs it, so material that arrived through one
-- member's own sight of it cannot be read out of somebody else's answer.
CREATE TABLE knowledge_sources (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  origin_table TEXT,
  origin_row_id TEXT,
  compartment TEXT NOT NULL DEFAULT 'agency',
  account_id TEXT REFERENCES accounts (id),
  title TEXT NOT NULL,
  body TEXT,
  source_url TEXT,
  owner_user_id TEXT,
  content_hash TEXT,
  indexed_at TEXT,
  chunk_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT,
  updated_at TEXT, editor_id TEXT, editor_email TEXT, editor_name TEXT,
  deactivated_at TEXT, deactivator_id TEXT, deactivator_email TEXT, deactivator_name TEXT
);
-- The mirror's identity: ONE source per row mirrored, so a sweep that runs twice
-- — or two sweeps at once — updates rather than duplicates. Partial, because a
-- typed note has no origin and they must not collide with each other.
CREATE UNIQUE INDEX idx_knowledge_sources_origin ON knowledge_sources (origin_table, origin_row_id) WHERE origin_row_id IS NOT NULL;
CREATE INDEX idx_knowledge_sources_compartment ON knowledge_sources (compartment);

-- A CHUNK is a readable piece of a source: what retrieval scores, and what an
-- answer cites. \`embedding\` is the quantised vector (lib/knowledge-vector.ts);
-- NULL means "not embedded yet", which retrieval survives by falling back to the
-- lexical score alone — an index half-built still answers, it just ranks worse.
CREATE TABLE knowledge_chunks (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES knowledge_sources (id),
  compartment TEXT NOT NULL,
  owner_user_id TEXT,
  seq INTEGER NOT NULL,
  text TEXT NOT NULL,
  embedding TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_knowledge_chunks_source ON knowledge_chunks (source_id);
CREATE INDEX idx_knowledge_chunks_compartment ON knowledge_chunks (compartment, id);

-- THE INVERTED INDEX — retrieval's first stage, as an ordinary indexed table
-- rather than an FTS5 virtual one. Deliberate, and the reason is the DELETE: a
-- re-index removes a source's postings, and on FTS5 that is a scan of every
-- posting in the team (a virtual table has no index on a non-text column), while
-- here it is one keyed delete. It also behaves identically in the test harness
-- and in D1, which a virtual table kept in step by triggers does not — and a
-- search path that cannot be run in a test is a search path we cannot prove.
--
-- \`compartment\` and \`owner_user_id\` are COPIES of the chunk's, so stage one is
-- a single-table read. They can only change when the chunk is rewritten, which
-- rewrites these rows too.
CREATE TABLE knowledge_terms (
  term TEXT NOT NULL,
  chunk_id TEXT NOT NULL REFERENCES knowledge_chunks (id),
  compartment TEXT NOT NULL,
  owner_user_id TEXT,
  weight INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (term, chunk_id)
);
CREATE INDEX idx_knowledge_terms_chunk ON knowledge_terms (chunk_id);

-- WHERE THE SWEEP GOT TO. One row per source kind: the position it reached, when
-- it last ran, when it last SUCCEEDED, and what went wrong when it didn't (R12 —
-- unattended work has nobody watching, so a failure has to leave a mark someone
-- can find). The cursor is what makes ingestion resumable: a tick that dies
-- halfway, or a source that is an hour behind, costs the next tick nothing but
-- the rows it has not reached yet.
CREATE TABLE knowledge_ingest (
  kind TEXT PRIMARY KEY,
  cursor TEXT,
  last_run_at TEXT,
  last_ok_at TEXT,
  last_error TEXT,
  runs INTEGER NOT NULL DEFAULT 0,
  sources_indexed INTEGER NOT NULL DEFAULT 0
);

-- Existing teams: the locked Admin role gains the new module in full (it IS full
-- access by definition, and it cannot be edited afterwards to grant it). Every
-- other role gains nothing — a migration must never hand out sight of the
-- agency's own material that nobody granted. \`is_default\` is 1 on Admin alone.
INSERT INTO role_permissions (id, role_id, module, can_read, can_create, can_edit, can_delete)
SELECT lower(hex(randomblob(16))), r.id, 'knowledge', r.is_default, r.is_default, r.is_default, r.is_default
  FROM member_roles r
 WHERE NOT EXISTS (
   SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.module = 'knowledge'
 );
`,
  },
  {
    // PROCESS MAPS, THEIR VERSIONS, AND THE MONEY (SCOPE ch.02 + .plans/BUILD-3).
    //
    // The number 0012 leaves 0011 to the work-engine lane, which is building
    // alongside this one and has already taken it (`0011_ticket_work_engine`).
    // The runner applies this array in order and records each `version` string,
    // so a gap is a key that never existed, not a missing step — and when the two
    // lanes merge the order is already right.
    //
    // WHAT THIS BUILD OWNS, and what it borrows: it owns the chain App → Process
    // → Step, the versions cut over it, the comments a client leaves on a map,
    // and the two rate cards. It borrows exactly two facts from the work engine —
    // a story's `step` (which step a piece of work changed) and a sprint's
    // `sold_price` (what was sold) — and it never writes either.
    version: "0013_process_maps_and_money",
    sql: `
-- AN APP is the built system: the thing with its own address and its own stage
-- (SCOPE ch.02). Not the goal — a client wanting dispatch fixed, served by a
-- driver app and a back-office screen, is TWO rows here.
--
-- \`account_id\` is whose system it is, and it is written once at creation and
-- never edited: every process, version, step and comment beneath it carries the
-- same account so the fence rides one clause with no join (the shape
-- \`help.account_id\` already has). There is deliberately no "move this app to
-- another account" door — moving one would silently re-publish a whole map, its
-- savings and its conversation into somebody else's portal. NULL is the agency's
-- own system, which belongs to no client and so appears in no portal.
--
-- \`tool_cost_cents_per_month\` is what this app costs US to keep running
-- (hosting, the services behind it). It is a column rather than a table because
-- a cost line with no history is one number about one app, and margin is the
-- only thing that reads it — internal, always.
CREATE TABLE apps (
  id TEXT PRIMARY KEY,
  account_id TEXT REFERENCES accounts (id),
  name TEXT NOT NULL,
  url TEXT,
  stage TEXT,
  tool_cost_cents_per_month INTEGER NOT NULL DEFAULT 0 CHECK (tool_cost_cents_per_month >= 0),
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT,
  updated_at TEXT, editor_id TEXT, editor_email TEXT, editor_name TEXT,
  deactivated_at TEXT, deactivator_id TEXT, deactivator_email TEXT, deactivator_name TEXT
);
CREATE INDEX idx_apps_account ON apps (account_id);

-- A PROCESS is a way of working inside an app. It is the thing that is VERSIONED
-- — v1 is the pre-kwapso baseline, and every later version is what we changed it
-- to — so the process row itself carries no durations at all. They live on the
-- steps of each version, which is what makes "where does 208 hours come from?"
-- answerable rather than assertable.
CREATE TABLE processes (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL REFERENCES apps (id),
  account_id TEXT REFERENCES accounts (id),
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT,
  updated_at TEXT, editor_id TEXT, editor_email TEXT, editor_name TEXT,
  deactivated_at TEXT, deactivator_id TEXT, deactivator_email TEXT, deactivator_name TEXT
);
CREATE INDEX idx_processes_app ON processes (app_id);
CREATE INDEX idx_processes_account ON processes (account_id);

-- A VERSION is the process as it stood at one moment. Version 1 is the BASELINE
-- (how they worked before us) and is created with the process itself, because a
-- process with no baseline can never produce a saving and would quietly report
-- zero forever.
--
-- A VERSION IS CUT BY HAND, AND ONLY BY HAND (owner, 24 Aug 2026). An earlier
-- plan had a completing sprint cut one automatically; nothing was ever wired to
-- do it, and the decision was purged rather than switched off (migration 0051).
-- \`cut_from_sprint_id\` is what is left of it: nothing reads it, nothing writes
-- it, and it stays only because this codebase does not drop columns.
--
-- R17 for a write that is an INSERT rather than an UPDATE lives on the unique
-- index below: two quick presses both read version N and both try to insert
-- N+1, and the loser is refused by the database rather than by a check somebody
-- could race past. \`cutVersion\` reads that refusal as "already cut".
CREATE TABLE process_versions (
  id TEXT PRIMARY KEY,
  process_id TEXT NOT NULL REFERENCES processes (id),
  account_id TEXT REFERENCES accounts (id),
  version_no INTEGER NOT NULL CHECK (version_no >= 1),
  label TEXT,
  cut_from_sprint_id TEXT,
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT
);
CREATE UNIQUE INDEX idx_process_versions_no ON process_versions (process_id, version_no);

-- A STEP is one part of a process, in ONE version. Two identifiers, and the
-- difference between them is the whole savings calculation:
--   • \`id\`       — this row, in this version.
--   • \`step_key\` — THE SAME STEP, across every version. Minted when the step
--                  first appears and copied forward by the cut, so "the baseline
--                  duration" and "the latest duration" are two rows that can be
--                  subtracted rather than two names that have to be matched.
--
-- \`removed_at\` is how a step that STOPPED HAPPENING stays honest. Deleting the
-- row would drop it out of the join and report no saving at all for the work we
-- removed entirely — the largest saving there is. So the cut carries it forward
-- with its frequency intact and its duration at zero, and the plain sentence
-- from SCOPE still holds: the baseline minus the latest, times how often it runs.
CREATE TABLE process_steps (
  id TEXT PRIMARY KEY,
  process_id TEXT NOT NULL REFERENCES processes (id),
  version_id TEXT NOT NULL REFERENCES process_versions (id),
  account_id TEXT REFERENCES accounts (id),
  step_key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  seconds_per_run INTEGER NOT NULL DEFAULT 0 CHECK (seconds_per_run >= 0),
  runs_per_month INTEGER NOT NULL DEFAULT 0 CHECK (runs_per_month >= 0),
  removed_at TEXT,
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT,
  updated_at TEXT, editor_id TEXT, editor_email TEXT, editor_name TEXT
);
-- One row per step per version: the cut copies forward, it never doubles up.
CREATE UNIQUE INDEX idx_process_steps_version_key ON process_steps (version_id, step_key);
CREATE INDEX idx_process_steps_process ON process_steps (process_id, step_key);

-- A CLIENT MAY COMMENT ON A PROCESS MAP (SCOPE ch.06 — one of the six things a
-- contact can do). A comment is a CONVERSATION, never an edit: it changes no
-- duration and cuts no version.
--
-- \`explains_step_key\` is the other half of the regression rule. Internal
-- dashboards ALWAYS show a step that got slower, because that is information;
-- the portal shows one only when a staff member has attached the explanation,
-- and this is that attachment. It is a comment, deliberately — an explanation
-- the client can reply to, rather than a field they can only read.
CREATE TABLE process_comments (
  id TEXT PRIMARY KEY,
  process_id TEXT NOT NULL REFERENCES processes (id),
  account_id TEXT REFERENCES accounts (id),
  body TEXT NOT NULL,
  explains_step_key TEXT,
  is_staff INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT
);
CREATE INDEX idx_process_comments_process ON process_comments (process_id, created_at);

-- ── THE TWO RATE CARDS, AND WHY THEY ARE TWO TABLES ──────────────────────────
--
-- One is what an ACCOUNT IS CHARGED. The other is what an hour of our own work
-- COSTS US. They are the same shape — a label and a number per hour — which is
-- exactly the danger: one table with a \`kind\` column would put both numbers a
-- single wrong WHERE clause apart, and the wrong one of them is the one figure
-- SCOPE says a client must never see under any flag, ever.
--
-- Two tables cannot be confused by a forgotten predicate. A door that reads
-- \`account_rates\` cannot accidentally return an internal rate, because the
-- internal rate is not in the table it named. The same reasoning splits the code
-- (lib/rates.ts vs lib/internal-money.ts) and is the law R24 checks.
CREATE TABLE account_rates (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts (id),
  label TEXT NOT NULL,
  cents_per_hour INTEGER NOT NULL CHECK (cents_per_hour >= 0),
  currency TEXT,
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT,
  updated_at TEXT, editor_id TEXT, editor_email TEXT, editor_name TEXT,
  deactivated_at TEXT, deactivator_id TEXT, deactivator_email TEXT, deactivator_name TEXT
);
-- Race guard: two people naming the same kind of work on one account at once.
CREATE UNIQUE INDEX idx_account_rates_label
  ON account_rates (account_id, label) WHERE deactivated_at IS NULL;

-- WHAT AN HOUR COSTS US. No account column, on purpose: an internal rate is a
-- fact about the agency, not about a client — and a table with an account on it
-- is a table somebody eventually joins to an account-fenced read.
-- \`is_default\` is the rate margin applies to an hour of logged time while the
-- work log does not yet say WHICH kind of work it was. It is one column rather
-- than a guess: a margin that silently blended every rate on the card would be a
-- number nobody could check, which is the one thing this build exists to avoid.
CREATE TABLE internal_rates (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  cents_per_hour INTEGER NOT NULL CHECK (cents_per_hour >= 0),
  currency TEXT,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT,
  updated_at TEXT, editor_id TEXT, editor_email TEXT, editor_name TEXT,
  deactivated_at TEXT, deactivator_id TEXT, deactivator_email TEXT, deactivator_name TEXT
);
CREATE UNIQUE INDEX idx_internal_rates_label
  ON internal_rates (label) WHERE deactivated_at IS NULL;
-- At most ONE default, enforced by the database rather than by whoever writes the
-- next screen: two defaults would make the margin depend on row order.
CREATE UNIQUE INDEX idx_internal_rates_default
  ON internal_rates (is_default) WHERE is_default = 1 AND deactivated_at IS NULL;

-- Existing teams: the locked Admin role gains both new modules in full (it is
-- DEFINED as full access and cannot be edited afterwards to grant them). Every
-- other role gains nothing — a migration must never hand out sight of an
-- agency's margin, or of a client's world, that nobody granted. Same shape as
-- 0007, for the same reason. New teams don't reach this: their seed already
-- writes the rows.
INSERT INTO role_permissions (id, role_id, module, can_read, can_create, can_edit, can_delete)
SELECT lower(hex(randomblob(16))), r.id, m.module, r.is_default, r.is_default, r.is_default, r.is_default
  FROM member_roles r
  CROSS JOIN (SELECT 'processes' AS module UNION ALL SELECT 'commercials') m
 WHERE NOT EXISTS (
   SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.module = m.module
 );
`,
  },
  {
    // THE WORK ENGINE, part two: what WE DO about a ticket (.plans/BUILD-1 §2).
    //
    // A ticket is what an account ASKS FOR. A story is one piece of work we do,
    // and it is the only place an assignee and a due date live — the ticket
    // deliberately has neither and derives its picture from its stories
    // (BUILD-1 §2, "no assignee and no due date on a ticket… do not add them").
    //
    // A SPRINT is the block of work sold to one account. It carries the flat
    // price, which is the revenue half of the margin the money lane already
    // reads (workers/tenancy/src/lib/work-engine.ts declares the contract from
    // the other side: `sprints.sold_price_cents` and `work_logs.seconds`). Whole
    // CENTS, like every other money column in this database — a price in major
    // units loses a half-penny somewhere between a float and a subtraction.
    version: "0014_stories_and_sprints",
    sql: `
-- A SPRINT belongs to ONE app or goal, and an account may have several running
-- at once (BUILD-1 §3). \`sprint_type\` is the editable vocabulary Planning /
-- Implementation / Iteration — a "blueprint" is a PRICED PLANNING sprint, not a
-- fourth type, so it is a price on a planning row and not a value here.
--
-- \`completed_at\` rather than a status word for "finished": the money lane's
-- version cut keys off the MOMENT a sprint completed (process_versions
-- .cut_from_sprint_id), and a moment is the thing that question actually asks.
CREATE TABLE sprints (
  id TEXT PRIMARY KEY,
  ref TEXT,
  account_id TEXT REFERENCES accounts (id),
  app_id TEXT REFERENCES apps (id),
  name TEXT NOT NULL,
  sprint_type TEXT,
  goal TEXT,
  starts_on TEXT,
  ends_on TEXT,
  sold_price_cents INTEGER NOT NULL DEFAULT 0 CHECK (sold_price_cents >= 0),
  currency TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT,
  updated_at TEXT, editor_id TEXT, editor_email TEXT, editor_name TEXT,
  deactivated_at TEXT, deactivator_id TEXT, deactivator_email TEXT, deactivator_name TEXT
);
-- The same race guard the ticket's reference carries: two sprints sold on one
-- account in the same instant cannot end up quoting the same number.
CREATE UNIQUE INDEX idx_sprints_ref ON sprints (ref) WHERE ref IS NOT NULL;
CREATE INDEX idx_sprints_account ON sprints (account_id);
CREATE INDEX idx_sprints_app ON sprints (app_id);

-- A STORY is one piece of work we do. The field list is BUILD-1 §2's, and that
-- list is the spec:
--   ref, ticket?, app?, process?, step?, sprint_id, assignee, due dates,
--   reviewer?, status, closing_note.
--
-- STORIES HAVE NO TYPE, settled by the owner: the ticket carries the type and
-- the process step carries the classification that matters. Do not add one.
--
-- \`ticket_id\` IS NULLABLE, also settled: four out of five stories in the real
-- history stand on their own, with no request behind them.
--
-- \`step_key\` and \`changes_no_step\` are the pair BUILD-1 §2 requires: "a story
-- cannot close without naming the process step it changes, or explicitly saying
-- it changes none". Two columns rather than one nullable one, because "nobody
-- filled this in" and "we looked, and it changes no step" are different answers
-- and the savings maths later has to be able to tell them apart. It is a step
-- KEY rather than a step id on purpose — a key is the same step across every
-- version of a map (see process_steps), and a story outlives the version it was
-- written against.
--
-- \`title\` is not in §2's list and is added deliberately: a piece of work with
-- no name cannot be read in a list, assigned, or said out loud on a call. It is
-- the only field here the plan does not name.
CREATE TABLE stories (
  id TEXT PRIMARY KEY,
  ref TEXT,
  account_id TEXT REFERENCES accounts (id),
  ticket_id TEXT REFERENCES help (id),
  app_id TEXT REFERENCES apps (id),
  process_id TEXT REFERENCES processes (id),
  step_key TEXT,
  changes_no_step INTEGER NOT NULL DEFAULT 0,
  sprint_id TEXT REFERENCES sprints (id),
  title TEXT NOT NULL,
  detail TEXT,
  assignee_id TEXT,
  assignee_name TEXT,
  reviewer_id TEXT,
  reviewer_name TEXT,
  starts_on TEXT,
  due_on TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  closed_at TEXT,
  closing_note TEXT,
  rank TEXT,
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT,
  updated_at TEXT, editor_id TEXT, editor_email TEXT, editor_name TEXT
);
CREATE UNIQUE INDEX idx_stories_ref ON stories (ref) WHERE ref IS NOT NULL;
-- The two reads that matter most: "what is left on this ticket" (the Ready flip
-- asks it on every story close) and "what is in this sprint".
CREATE INDEX idx_stories_ticket ON stories (ticket_id);
CREATE INDEX idx_stories_sprint ON stories (sprint_id);
CREATE INDEX idx_stories_account ON stories (account_id);
CREATE INDEX idx_stories_assignee ON stories (assignee_id);
CREATE INDEX idx_stories_rank ON stories (rank);

-- The sprint vocabulary SCOPE names, seeded the same way the ticket types were:
-- ADDED, never swapped, because a team's existing values are on rows already.
INSERT INTO selectable_data (id, type, value, is_default, created_at, creator_name)
SELECT lower(hex(randomblob(16))), 'Sprint type', v.value, 1, datetime('now'), 'kwapso'
  FROM (SELECT 'Planning' AS value UNION ALL SELECT 'Implementation' UNION ALL SELECT 'Iteration') v
 WHERE NOT EXISTS (
   SELECT 1 FROM selectable_data s WHERE s.type = 'Sprint type' AND s.value = v.value
 );

-- Existing teams: the locked Admin role gains the new module in full (it IS full
-- access by definition and cannot be edited afterwards to grant it). Every other
-- role gains nothing — a migration must never hand out sight of the agency's own
-- delivery plan, its assignees or its dates that nobody granted.
INSERT INTO role_permissions (id, role_id, module, can_read, can_create, can_edit, can_delete)
SELECT lower(hex(randomblob(16))), r.id, 'work', r.is_default, r.is_default, r.is_default, r.is_default
  FROM member_roles r
 WHERE NOT EXISTS (
   SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.module = 'work'
 );
`,
  },
  {
    // WORK LOGS — the row of time this whole build is measured by.
    //
    // The owner named "logging time takes too many clicks" as the single thing
    // most likely to make him quietly abandon this and go back to a spreadsheet
    // (.plans/BUILD-1 §5). Everything about the shape below is downstream of
    // that: a timer is a work log with no end yet, so starting one is ONE insert
    // and stopping it is ONE update, and there is no second table, no session
    // object and no state machine between a person and a click.
    version: "0015_work_logs",
    sql: `
-- A ROW OF TIME: who, what they worked on, and how long, in whole seconds.
--
-- WHAT IT MAY ATTACH TO — a story, a ticket or a task, and nothing else (BUILD-1
-- §5, settled by the owner). NOT a to-do: that is somebody else's time, not ours.
-- NOT an account on its own: the owner was explicit that an account-level-only
-- log must not exist, because a figure with no work behind it is a figure nobody
-- can check. TICKETS are in the list deliberately — reading, triaging and
-- resolving a request is real work and has to be loggable against the request.
--
-- There is NO CHECK constraint on \`target_table\`, and that is a decision rather
-- than an omission. The allow-list is WORK_LOG_TARGETS in
-- workers/content/src/lib/work-logs.ts, which is also where the 400 comes from
-- and where each target's existence is proved before a row is written. A CHECK
-- would be a second copy of the same list that only SQLite can see — and in
-- SQLite a CHECK cannot be altered, so the day a fourth thing becomes loggable
-- the migration would be a full table rebuild of the largest table here.
--
-- \`kind\` is the kind of work, and it is nullable ON PURPOSE. BUILD-1 §5 says a
-- work log will eventually name it so the margin can group by it; until then
-- lib/internal-money.ts applies the DEFAULT internal rate and says so on screen,
-- which is the honest answer while the column is empty.
--
-- \`discarded_at\` is how a runaway timer is binned without deleting anything
-- (BUILD-1 §5: somebody starts one on Friday and goes home). Deactivate-never-
-- delete: the row, and the fact that somebody chose to bin it, both survive —
-- every sum in the app subtracts it instead.
CREATE TABLE work_logs (
  id TEXT PRIMARY KEY,
  account_id TEXT REFERENCES accounts (id),
  target_table TEXT NOT NULL,
  target_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT,
  kind TEXT,
  note TEXT,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  seconds INTEGER NOT NULL DEFAULT 0 CHECK (seconds >= 0),
  billable INTEGER NOT NULL DEFAULT 1,
  discarded_at TEXT, discarder_id TEXT, discarder_email TEXT, discarder_name TEXT,
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT,
  updated_at TEXT, editor_id TEXT, editor_email TEXT, editor_name TEXT
);
-- THE ONE THING A TIMER MAY NOT DO: run twice on the same work, for the same
-- person. Parallel timers on DIFFERENT targets are allowed (BUILD-1 §5) — that
-- is a real day — but the same person clocking the same story twice is a double
-- count nobody would ever notice in a total. A partial unique index, so the
-- database refuses it rather than a read-then-write racing itself.
CREATE UNIQUE INDEX idx_work_logs_running
  ON work_logs (user_id, target_table, target_id) WHERE ended_at IS NULL;
CREATE INDEX idx_work_logs_target ON work_logs (target_table, target_id);
CREATE INDEX idx_work_logs_account ON work_logs (account_id);
CREATE INDEX idx_work_logs_user ON work_logs (user_id, started_at);

-- ONE PERSON'S OWN PREFERENCES about their timers. One row per person, and today
-- one column: whether starting a timer stops the ones they already have running.
-- OFF by default, because parallel timers are legitimate and a setting that
-- silently stopped your other work would be discovered by losing an hour.
CREATE TABLE work_prefs (
  user_id TEXT PRIMARY KEY,
  auto_stop INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT
);
`,
  },
  {
    // THE OTHER TWO NOUNS (.plans/BUILD-1 §2). The owner's own test for telling
    // them apart: "Aurora spends forty minutes writing kwapso's own quarterly VAT
    // return" is a TASK; "Marta at Bergman still hasn't sent us her brand logo and
    // we can't finish without it" is a TO-DO.
    //
    // TWO TABLES, NOT ONE WITH A `kind` COLUMN, and the reason is the same one
    // that split the two rate cards in 0013: they are the same SHAPE and opposite
    // AUDIENCES. A to-do is aimed at the client and appears in their portal; a
    // task is our own admin and must never leave the building. One table with a
    // flag would put both a wrong WHERE clause apart, and the wrong one of them
    // is a list of the agency's internal chores rendered on a client's screen.
    // Two tables cannot be confused by a forgotten predicate.
    version: "0016_todos_and_tasks",
    sql: `
-- A TO-DO is something we are waiting on the CLIENT for. It is the only row in
-- the work engine a client login can WRITE to, and one of only two things in the
-- whole product that emails them (BUILD-1 §7).
--
-- \`account_id\` is NOT NULL, unlike everywhere else in this build: a to-do with
-- no client is a to-do aimed at nobody, and the fence that decides who may see it
-- reads exactly this column. There is no such thing as an agency to-do — that is
-- a task, in the table below.
--
-- \`file_url\` is what they uploaded against it. One file, not a collection: the
-- request is "send us the logo", and a second attachment is a second to-do or a
-- comment on the ticket it hangs off.
--
-- NO WORK LOG EVER ATTACHES TO ONE (BUILD-1 §5, settled by the owner) — it is
-- somebody else's time, not ours. That is enforced in
-- workers/content/src/lib/work-logs.ts by \`todos\` not being in WORK_LOG_TARGETS,
-- and asserted against the list itself so it survives this table existing.
CREATE TABLE todos (
  id TEXT PRIMARY KEY,
  ref TEXT,
  account_id TEXT NOT NULL REFERENCES accounts (id),
  ticket_id TEXT REFERENCES help (id),
  story_id TEXT REFERENCES stories (id),
  title TEXT NOT NULL,
  detail TEXT,
  due_on TEXT,
  completed_at TEXT, completer_id TEXT, completer_name TEXT,
  file_url TEXT,
  file_name TEXT,
  cancelled_at TEXT, canceller_id TEXT, canceller_email TEXT, canceller_name TEXT,
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT,
  updated_at TEXT, editor_id TEXT, editor_email TEXT, editor_name TEXT
);
CREATE UNIQUE INDEX idx_todos_ref ON todos (ref) WHERE ref IS NOT NULL;
CREATE INDEX idx_todos_account ON todos (account_id, completed_at);
CREATE INDEX idx_todos_ticket ON todos (ticket_id);

-- A TASK is kwapso's own internal admin. Nobody outside the agency ever sees one,
-- so unlike every other table in this build it carries no fence and no portal
-- story at all — every door on it refuses a client login outright.
--
-- \`account_id\` is nullable and usually null: our own VAT return belongs to no
-- client. A task that IS about a client (chasing an invoice, preparing a review)
-- may name one, which is what lets its time land in the right margin.
--
-- WORK LOGS DO ATTACH (BUILD-1 §2), which is the whole reason this is a table
-- rather than a checklist somewhere: forty minutes on the VAT return is real
-- time, it is ours, and it costs us the same as forty minutes of delivery.
--
-- The reference number is nullable here for a duller reason than elsewhere: a
-- reference is built out of an ACCOUNT's short code, and most tasks have no
-- account. A number nobody can quote is worse than none.
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  ref TEXT,
  account_id TEXT REFERENCES accounts (id),
  title TEXT NOT NULL,
  detail TEXT,
  assignee_id TEXT,
  assignee_name TEXT,
  due_on TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  completed_at TEXT,
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT,
  updated_at TEXT, editor_id TEXT, editor_email TEXT, editor_name TEXT
);
CREATE UNIQUE INDEX idx_tasks_ref ON tasks (ref) WHERE ref IS NOT NULL;
CREATE INDEX idx_tasks_status ON tasks (status, due_on);
CREATE INDEX idx_tasks_assignee ON tasks (assignee_id);

-- Existing teams: the locked Admin role gains the to-do module in full. Every
-- other role gains nothing — including, deliberately, the Client role an owner
-- may already have built: handing a client sight of their to-dos is a decision
-- somebody makes on the Roles screen, not one a migration makes for them.
-- (Tasks need no row: they live under \`work\`, which 0014 already granted.)
INSERT INTO role_permissions (id, role_id, module, can_read, can_create, can_edit, can_delete)
SELECT lower(hex(randomblob(16))), r.id, 'todos', r.is_default, r.is_default, r.is_default, r.is_default
  FROM member_roles r
 WHERE NOT EXISTS (
   SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.module = 'todos'
 );
`,
  },
  {
    // TRIAGE DUTY (.plans/BUILD-1 §6). "One named person is on triage duty, and
    // it is visible whose week it is."
    //
    // A ROTA, not a flag on a member. Whose week it is changes every Monday and
    // the answer to "whose week was it when this was missed?" has to survive —
    // so it is a row per week, and the week is the key.
    version: "0017_triage_duty",
    sql: `
CREATE TABLE triage_duty (
  id TEXT PRIMARY KEY,
  week_start TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT,
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT,
  updated_at TEXT, editor_id TEXT, editor_email TEXT, editor_name TEXT
);
-- ONE NAMED PERSON, and the database is what makes it one. "Visible whose week
-- it is" has no answer if two rows claim the same week, and a check in code is a
-- check two simultaneous writers race past.
CREATE UNIQUE INDEX idx_triage_duty_week ON triage_duty (week_start);
`,
  },
  {
    // THE AGENCY'S OWN HOUSEKEEPING — the seven Glide tables that describe how
    // the agency runs itself. Six tables here, four permission modules, and two
    // legacy tables that deliberately became dropdown GROUPS instead (see the
    // INSERT at the bottom): a table of bare labels is a vocabulary, and the base
    // already has one place for those.
    //
    // WHAT EVERY TABLE HERE HAS IN COMMON, and it is the whole security story:
    // no `account_id` column, anywhere. These rows belong to the agency, not to a
    // customer, so there is nothing for the account fence to fence — and a fence
    // that could be forgotten is worse than one that was never needed. The
    // defence is at the door instead: every handler on all four modules opens
    // with `refusePortalCaller` (R21), and the refusal-symmetry suite holds both
    // halves of each module to the same answer.
    version: "0018_agency_internal",
    sql: `
-- THIS MIGRATION USED TO CREATE \`marketing_posts\` AND \`programs\` TOO.
-- Both were purged on 17 Aug 2026 by the owner's ruling — Marketing the MODULE
-- goes (Marketing the task DEPARTMENT stays, and it is a dropdown value, not a
-- table), and the Delivery method PAGE goes with its programme half folded onto
-- the sprint type a person actually picks. The CREATEs are gone from HISTORY
-- rather than merely dropped afterwards, so that a fresh clone never builds
-- either one; 0025 drops them for the teams that already ran this version, after
-- carrying every programme field across.

-- THE BRAND LIBRARY: 74 rows of the material everything else is made with —
-- logos, decks, templates. \`file_url\` is either an object we host (a
-- /media/internal/… URL minted by the upload door) or a link somewhere else, and
-- the column does not care which: the legacy rows arrive as Google-hosted links
-- that have to be re-hosted before Glide is switched off, and a schema that
-- insisted on one shape would make that migration a rewrite instead of a copy.
CREATE TABLE brand_assets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  file_url TEXT,
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT,
  updated_at TEXT, editor_id TEXT, editor_email TEXT, editor_name TEXT,
  deactivated_at TEXT, deactivator_id TEXT, deactivator_email TEXT, deactivator_name TEXT
);
CREATE INDEX idx_brand_assets_category ON brand_assets (category);

-- A MEETING PURPOSE is why we meet — and it is the one legacy lookup that could
-- NOT become a dropdown value, because a purpose belongs to a department and a
-- dropdown row is a single label with nowhere to put the second fact. Dropping
-- the link to make the table fit the vocabulary seam would have been a silent
-- loss of the only structure the table has. So the purpose is a record, and the
-- DEPARTMENT it belongs to is the dropdown value (pick-or-created against the
-- "Department" group) — each of the two facts stored the way its own shape asks.
CREATE TABLE meeting_purposes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT,
  description TEXT,
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT,
  updated_at TEXT, editor_id TEXT, editor_email TEXT, editor_name TEXT,
  deactivated_at TEXT, deactivator_id TEXT, deactivator_email TEXT, deactivator_name TEXT
);
CREATE INDEX idx_meeting_purposes_department ON meeting_purposes (department);

-- THE PERSON BEHIND THE MEMBER ROW. Six staff rows in the legacy app carry a
-- personality profile — strengths, weaknesses, the people they look up to — and
-- the reconciliation's recommendation was to leave them behind as "a team page,
-- not a system record". The owner overruled it and asked for real storage, so
-- this is a table with an audit block and a history like every other record.
--
-- \`user_id\` is the GLOBAL user id, held as plain TEXT with no REFERENCES — the
-- members themselves live in the core database, so a foreign key here would name
-- a table this database does not have. \`google_connections.user_id\` has exactly
-- the same shape for exactly the same reason.
--
-- The partial unique index is the invariant: ONE live profile per person. It
-- rides the database rather than a read-then-write in a handler, so two tabs
-- saving a profile at the same instant cannot make two of them (CONCURRENCY
-- rule 2) — and it is partial so that deactivating a profile and writing a fresh
-- one is still allowed, which a plain UNIQUE would refuse.
CREATE TABLE staff_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  headline TEXT,
  personality_type TEXT,
  strengths TEXT,
  weaknesses TEXT,
  role_models TEXT,
  about TEXT,
  photo_url TEXT,
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT,
  updated_at TEXT, editor_id TEXT, editor_email TEXT, editor_name TEXT,
  deactivated_at TEXT, deactivator_id TEXT, deactivator_email TEXT, deactivator_name TEXT
);
CREATE UNIQUE INDEX idx_staff_profiles_user
  ON staff_profiles (user_id) WHERE deactivated_at IS NULL;

-- A CERTIFICATE a member holds. Five rows in the legacy app, described there as
-- course completions — which is why the columns are a CREDENTIAL's rather than a
-- completion's (an issuer, the day it was granted, the day it lapses, the paper
-- itself). A completion fits inside a credential; the reverse does not, and a
-- credential is the fact that outlives the course it came from.
CREATE TABLE staff_certificates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  issuer TEXT,
  issued_on TEXT,
  expires_on TEXT,
  file_url TEXT,
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT,
  updated_at TEXT, editor_id TEXT, editor_email TEXT, editor_name TEXT,
  deactivated_at TEXT, deactivator_id TEXT, deactivator_email TEXT, deactivator_name TEXT
);
CREATE INDEX idx_staff_certificates_user ON staff_certificates (user_id);

-- Existing teams: the locked Admin role gains all four new modules in full (it
-- is DEFINED as full access and cannot be edited afterwards to grant them).
-- Every other role gains nothing — a migration must never hand out sight of the
-- agency's own material that nobody granted. Same shape as 0007 and 0013, for
-- the same reason. New teams don't reach this: their seed already writes the rows.
INSERT INTO role_permissions (id, role_id, module, can_read, can_create, can_edit, can_delete)
SELECT lower(hex(randomblob(16))), r.id, m.module, r.is_default, r.is_default, r.is_default, r.is_default
  FROM member_roles r
  CROSS JOIN (
    SELECT 'marketing' AS module
    UNION ALL SELECT 'brand_assets'
    UNION ALL SELECT 'delivery'
    UNION ALL SELECT 'staff_profiles'
  ) m
 WHERE NOT EXISTS (
   SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.module = m.module
 );

-- THE SIXTEEN UNGROUPED LEGACY VALUES, ANSWERED AS TWO GROUPS.
--
-- Sixteen of the legacy app's 154 dropdown values carried no group at all: ten
-- country names, five company-size bands and one stray hyphen. The alternative
-- was to make them two FIELDS on the account; the owner overruled it, and the
-- reason holds up — a country typed free into an address is a country spelled
-- five ways by five people, and the whole point of the dropdown module is that
-- the fifth person picks what the first one wrote.
--
-- So the two groups are created here, seeded with the bands (five, as the legacy
-- data has) and with the countries the customer records themselves evidence: the
-- language field is German, Spanish, Catalan or English, and the addresses are
-- European. The legacy labels arrive with the migration and pick-or-create into
-- these same two groups, which is the part that was at risk — a group that
-- exists is a group the import lands IN, instead of sixteen more homeless rows.
-- The stray hyphen is not carried across: it is not a value, it is a typo.
-- ONE STATEMENT PER VALUE, and that is not style — it is D1's hard limit.
-- This was a single INSERT feeding off an eleven-term UNION ALL chain, which is
-- ordinary SQLite and which D1 REFUSES: its compound-SELECT ceiling is FIVE
-- terms, not SQLite's 500. The whole migration rolled back with "too many terms
-- in compound SELECT" and every existing team stayed on the previous schema
-- while the code above it had already shipped. Generated from
-- INTERNAL_VOCABULARY below so the chain can never grow back.
${INTERNAL_VOCABULARY.map(
  (v) => `INSERT INTO selectable_data (id, type, value, is_default, created_at, creator_id, creator_email, creator_name)
SELECT lower(hex(randomblob(16))), '${v.type}', '${v.value}', 1, datetime('now'), NULL, NULL, 'System'
 WHERE NOT EXISTS (SELECT 1 FROM selectable_data s WHERE s.type = '${v.type}' AND s.value = '${v.value}');`
).join("\n")}
`,
  },
  {
    version: "0019_google_connections",
    sql: `
-- GOOGLE, CONNECTED ONE PERSON AT A TIME.
--
-- The decision the whole shape follows: each person connects their OWN Google
-- account, and the assistant acting for them sees exactly what they can see and
-- nothing else. There is no team-wide service account anywhere in this module,
-- and there is deliberately nowhere to put one — the row hangs off a USER id, so
-- "connect the agency's Drive once and let everybody read it" is not a
-- configuration mistake somebody could make, it is a column that does not exist.
--
-- \`user_id\` is the GLOBAL user id, plain TEXT with no REFERENCES, for the same
-- reason \`staff_profiles.user_id\` is: the
-- members themselves live in the core database, so a foreign key here would name
-- a table this database does not have.
--
-- THE TOKENS ARE ENCRYPTED IN THE COLUMN, not merely at rest under Cloudflare's
-- own disk encryption. A refresh token is a standing key to somebody's mailbox
-- that survives every password change, and this database is reachable by
-- anything holding the account's D1 REST token — a backup, an export, a debug
-- query. So both token columns hold AES-GCM ciphertext, and the one key lives in
-- a secret the database has no copy of (workers/content/src/lib/google-crypto.ts).
-- A dump of this table without that secret is a table of email addresses.
--
-- \`scopes\` is what Google ACTUALLY granted, not what we asked for. A person can
-- untick a box at the consent screen, and a connection that quietly works for
-- less than it claims is how an assistant ends up saying "there is nothing in
-- that folder" about a folder full of things.
CREATE TABLE google_connections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  -- SET ONCE AND NEVER CHANGED, deliberately: \`service\` is not a property of a
  -- connection, it is WHICH connection this is. It rides the live unique index
  -- below (one per person per service) and the consent it was granted under, so
  -- turning a Drive grant into a Gmail one by writing a word would leave a row
  -- claiming a scope Google never gave it. Reconnect instead; disconnect and
  -- connect again is already the ordinary way to fix a grant.
  service TEXT NOT NULL,
  google_email TEXT NOT NULL,
  scopes TEXT NOT NULL DEFAULT '',
  access_token TEXT,
  access_expires_at TEXT,
  refresh_token TEXT NOT NULL,
  last_used_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT,
  updated_at TEXT, editor_id TEXT, editor_email TEXT, editor_name TEXT,
  deactivated_at TEXT, deactivator_id TEXT, deactivator_email TEXT, deactivator_name TEXT
);

-- ONE LIVE CONNECTION PER PERSON PER SERVICE — on the database, not in a
-- handler. Connecting is a browser round-trip that a person can genuinely finish
-- twice (two tabs, an impatient second click on "Connect"), and a read-then-write
-- in the handler would make two rows holding two different refresh tokens, one of
-- which nothing would ever revoke (CONCURRENCY rule 2). Partial, so that
-- disconnecting and connecting again is still allowed — which a plain UNIQUE
-- would refuse, and which is the ordinary way somebody fixes a broken grant.
CREATE UNIQUE INDEX idx_google_connections_live
  ON google_connections (user_id, service) WHERE deactivated_at IS NULL;
CREATE INDEX idx_google_connections_user ON google_connections (user_id);

-- THE CONTAINERS SOMEBODY NAMED. Drive is not "your Drive" and Chat is not "your
-- Chat": both are reached only through rows in this table, so the unnamed rest of
-- a person's Drive is out of reach by construction rather than by a filter
-- somebody has to remember to write.
--
-- SINCE 0058 GMAIL AND CALENDAR HAVE ROWS HERE TOO, and they mean the mirror
-- image. A Drive folder is SHARED — nothing in a Drive is in reach until somebody
-- hands it over. A calendar or a Gmail label is SCOPED — everything is in reach
-- the moment the connection exists, and naming one is how a person says "this,
-- and not the rest". Same table, same audit, same switch, opposite verb.
--
-- WHICH IS WHY THE MEANING OF "NO ROWS" CANNOT LIVE HERE. For Drive it is "read
-- nothing"; for Gmail it is "read everything". \`google_connections.scope_mode\`
-- carries that decision instead — see 0058's own header for the trap it closes.
--
-- \`shelf\` is the answer to the question the design round said we must answer at
-- the moment of sharing: who will be able to read this? 'private' means this
-- person alone (and the assistant acting as them); 'team' means anybody whose
-- role can read it. It is stored on the SOURCE rather than inferred later,
-- because "I thought that folder was just mine" is the failure this column
-- exists to make impossible.
--
-- \`user_id\` is denormalised off the connection on purpose: every read here is
-- "mine", and a join to answer that on every list is a join to answer the
-- cheapest question in the module.
CREATE TABLE google_sources (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL REFERENCES google_connections(id),
  user_id TEXT NOT NULL,
  -- SET ONCE, like the connection's own: a source IS a folder, or a mailbox, or
  -- a calendar, and \`service\` says which of those \`external_id\` is an id in. An
  -- edit here would point the same id at a different Google API and read
  -- somebody else's material, or nothing at all. Share the thing again to move it.
  service TEXT NOT NULL,
  external_id TEXT NOT NULL,
  name TEXT NOT NULL,
  shelf TEXT NOT NULL DEFAULT 'private',
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT,
  updated_at TEXT, editor_id TEXT, editor_email TEXT, editor_name TEXT,
  deactivated_at TEXT, deactivator_id TEXT, deactivator_email TEXT, deactivator_name TEXT
);
CREATE UNIQUE INDEX idx_google_sources_live
  ON google_sources (connection_id, external_id) WHERE deactivated_at IS NULL;
CREATE INDEX idx_google_sources_user ON google_sources (user_id, service);

-- Existing teams: the locked Admin role gains all three new modules in full (it
-- is DEFINED as full access and cannot be edited afterwards to grant them).
-- Every other role gains nothing — including, deliberately, the Client role an
-- owner may have made, which must never hold one of these: clients get no
-- assistant and no Google surface at all. Same shape as 0007, 0013 and 0018.
INSERT INTO role_permissions (id, role_id, module, can_read, can_create, can_edit, can_delete)
SELECT lower(hex(randomblob(16))), r.id, m.module, r.is_default, r.is_default, r.is_default, r.is_default
  FROM member_roles r
  CROSS JOIN (
    SELECT 'google' AS module
    UNION ALL SELECT 'google_mail'
    UNION ALL SELECT 'google_events'
  ) m
 WHERE NOT EXISTS (
   SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.module = m.module
 );
`,
  },
  {
    // THE KNOWLEDGE BASE MOVES ITS SEARCH TO VECTORIZE, and grows the two things
    // 0012 could not give it: a record's own SUMMARY (so the router knows what
    // each record is ABOUT before it searches anything), and a size ceiling that
    // is a product decision rather than an accident of a validator.
    //
    // 0012's own note said the vectors lived here because a per-team database
    // makes tenancy structural. That argument is answered, not abandoned — see
    // the header of workers/content/src/lib/knowledge-vectors.ts: the namespace
    // is the partition, and the passages an answer is built from are still read
    // out of THIS database under the caller's own fence. What changed is that the
    // SEARCH no longer has to fit in a SQL statement.
    version: "0020_knowledge_vectors",
    sql: `
-- WHAT A RECORD IS ABOUT, in a sentence or two. Written by the sweep from the
-- row itself (never by a model — see knowledge-summary.ts), embedded, and
-- searched FIRST: the router reads the summaries to decide which records to look
-- inside, which is the difference between routing and guessing. It is also what
-- a list screen shows instead of dragging a 300-page body over the wire.
ALTER TABLE knowledge_sources ADD COLUMN summary TEXT;
ALTER TABLE knowledge_sources ADD COLUMN summary_embedding TEXT;

-- THE LABELS THE ROUTER NARROWS BY. \`account_id\` and \`compartment\` were
-- already here; these are the rest of the notebook the owner asked for, each one
-- a metadata index on the vector as well as a column here.
ALTER TABLE knowledge_sources ADD COLUMN app_id TEXT;
ALTER TABLE knowledge_sources ADD COLUMN ticket_id TEXT;
ALTER TABLE knowledge_sources ADD COLUMN sprint_id TEXT;
-- WHEN THE MATERIAL IS FROM, which is not when we indexed it: a transcript of
-- Tuesday's call filed on Friday is Tuesday's. Kept as an ISO string here (it is
-- read by people) and as whole seconds on the vector (it is filtered by ranges).
ALTER TABLE knowledge_sources ADD COLUMN record_date TEXT;

-- STAGED INGEST — how far through a source the indexer got, and why it stopped.
-- A 300-page contract cannot be embedded inside one request: the work is done in
-- slices and this is the resume point, so a source that is half-indexed is
-- FINISHED by the next slice rather than started again. \`indexed_chunks\` = 0
-- with a chunk_count above it is the readable form of "still going".
ALTER TABLE knowledge_sources ADD COLUMN indexed_chunks INTEGER NOT NULL DEFAULT 0;
ALTER TABLE knowledge_sources ADD COLUMN index_error TEXT;
-- The size of the material, in bytes, so a screen can say what it is holding and
-- the ceiling can be explained rather than just enforced.
ALTER TABLE knowledge_sources ADD COLUMN body_bytes INTEGER NOT NULL DEFAULT 0;

CREATE INDEX idx_knowledge_sources_pending ON knowledge_sources (indexed_chunks, id) WHERE deactivated_at IS NULL;

-- NO "WHAT CHANGED" TABLE, DELIBERATELY — the sweep's own cursor already IS one.
--
-- The obvious build for "instant re-index" is a dirty queue every write marks.
-- It was rejected: it is an invariant fifty call sites have to remember, across
-- three workers, and the one that forgets is silent. The cursor cannot be
-- forgotten. Each kind is read in \`COALESCE(updated_at, created_at)\` order, so
-- a row that changes sorts AFTER the cursor by construction — whoever changed
-- it, through whichever door, including an import and the agent. What made it
-- feel periodic was only WHEN it ran. So now it runs on a write, on a read, and
-- on the cron (see knowledge-ingest.ts), and the cron's job shrinks to the one
-- thing an event cannot do: notice what nobody was there to tell us about.

-- THE OLD INDEX IS DISCARDED, DELIBERATELY AND ONCE.
--
-- Chunk ids are now DERIVED (\`<sourceId>:<seq>\`) so that a vector can be
-- overwritten and deleted without a lookup table, and the old rows carry random
-- ids that no vector will ever match. Blanking the content hash is what makes
-- the base rebuild itself: every source now looks changed, so the next drain and
-- the next sweep re-chunk, re-embed and re-upsert it. Nothing is lost — a
-- mirrored source's truth is the row it mirrors and a typed note's is its own
-- body, both of which are untouched here.
DELETE FROM knowledge_terms;
DELETE FROM knowledge_chunks;
UPDATE knowledge_sources SET content_hash = NULL, indexed_at = NULL, chunk_count = 0, indexed_chunks = 0;
`,
  },
  {
    version: "0021_meetings",
    sql: `
-- MEETINGS — the section the owner asked for, and the one noun the legacy import
-- had nowhere to put.
--
-- Glide held 350 of them and the reconciliation folded every one into a WORK LOG,
-- because a work log was the only row that carried a date, a duration and a
-- client. That kept the hours and threw away the meeting: what was on the agenda,
-- what was decided, and who it was with. A work log answers "how long did that
-- take"; it has no field that can answer "what did we agree in March".
--
-- So this is a record of its own, and the two things on it that nothing else in
-- the app holds are \`agenda\` and \`notes\`. Time still goes on a work log — a
-- meeting is not a timesheet — and the two are joined by nothing on purpose: a
-- meeting that ran long is two facts, not one.
--
-- WHY IT IS ITS OWN MODULE and not four more rights on \`delivery\`:
-- \`meeting_purposes\` is a TAXONOMY of why we meet (a settled list somebody
-- curates once a year). A meeting is a record that accumulates forever. Sharing
-- one permission row would mean granting the right to read every note ever taken
-- in order to let somebody see the list of purposes.
--
-- \`purpose_id\` points at that taxonomy, so "why did we meet" is a dropdown value
-- rather than a fifth spelling typed into a title.
--
-- \`status\` is two words, not five: a meeting is scheduled, or it has been held.
-- Cancelling is \`deactivated_at\` like every other retirement in the base — the
-- row survives, so a client asking "didn't we have a call in March?" is answerable
-- either way.
--   SUPERSEDED 18 Aug 2026 (see 0037): the held status is retired and nothing
--   reads \`status\` or \`held_at\` any more — a meeting's own \`starts_at\` says
--   whether it has happened. The columns stay, because what people ticked while
--   the idea existed is still history. The sentence about cancelling still holds.
--
-- \`google_event_id\` is what makes the calendar push idempotent. Pressing "put it
-- in my calendar" twice must not make two entries, and the row is the only place
-- that memory can live (SCOPE ch.03: Google being an hour behind breaks nothing —
-- Google holding two copies of one meeting is not the same kind of harmless).
--   SUPERSEDED 18 Aug 2026: there is no calendar push, the calendar is one-way.
--   The column and its unique index do the same work from the other direction —
--   they are how the sweep recognises an entry it has already made a record of.
CREATE TABLE meetings (
  id TEXT PRIMARY KEY,
  ref TEXT,
  account_id TEXT REFERENCES accounts(id),
  purpose_id TEXT REFERENCES meeting_purposes(id),
  title TEXT NOT NULL,
  agenda TEXT,
  notes TEXT,
  location TEXT,
  starts_at TEXT NOT NULL,
  ends_at TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  held_at TEXT,
  google_event_id TEXT,
  google_event_url TEXT,
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT,
  updated_at TEXT, editor_id TEXT, editor_email TEXT, editor_name TEXT,
  deactivated_at TEXT, deactivator_id TEXT, deactivator_email TEXT, deactivator_name TEXT
);
-- The list's own sort (newest first, id breaking ties) — the keyset the paged
-- read walks, so page two is an index seek rather than an offset scan.
CREATE INDEX idx_meetings_when ON meetings (starts_at DESC, id DESC);
CREATE INDEX idx_meetings_account ON meetings (account_id);
-- ONE meeting per calendar entry, on the database rather than in a handler: two
-- tabs pressing "add to my calendar" at the same instant would otherwise write
-- two ids over each other and leave an orphan event nothing in kwapso names
-- (CONCURRENCY rule 2). Partial, so the overwhelming majority of rows — which
-- have no event at all — are not competing for one NULL.
CREATE UNIQUE INDEX idx_meetings_event ON meetings (google_event_id) WHERE google_event_id IS NOT NULL;

-- WHICH CLIENT A NAMED FOLDER OR SPACE IS ABOUT. Nullable, and null means the
-- agency's own — the same sentence \`knowledge_sources.account_id\` already
-- speaks, which is what lets a Drive folder and a typed note land in the same
-- compartment by the same rule.
--
-- ASKED, NOT GUESSED. The alternative was to read the folder's contents and
-- match a client's name in them, and that is the failure the compartment idea
-- exists to prevent: a document filed under the wrong client is worse than one
-- filed under nobody, because the assistant will quote it confidently at the
-- wrong person. The person naming the folder knows whose it is; the screen asks
-- them, beside the question about who may read it.
ALTER TABLE google_sources ADD COLUMN account_id TEXT;
CREATE INDEX idx_google_sources_account ON google_sources (account_id);

-- Existing teams: the locked Admin role gains the new module in full (it is
-- DEFINED as full access and cannot be edited afterwards to grant it). Every
-- other role gains nothing — including the Client role an owner may have made,
-- which must never hold this one: a meeting's notes are our own record of a
-- conversation, and no client login reaches any door on it. Same shape as 0007,
-- 0013, 0018 and 0019.
INSERT INTO role_permissions (id, role_id, module, can_read, can_create, can_edit, can_delete)
SELECT lower(hex(randomblob(16))), r.id, 'meetings', r.is_default, r.is_default, r.is_default, r.is_default
  FROM member_roles r
 WHERE NOT EXISTS (
   SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.module = 'meetings'
 );
`,
  },
  {
    version: "0022_knowledge_files",
    sql: `
-- A FILE IS THE THIRD WAY INTO THE KNOWLEDGE BASE, and it is a fourth family in
-- a table that already holds three:
--   • TYPED here (kind 'note') — the body is the truth;
--   • MIRRORED from a row we own — the row is the truth, the sweep keeps up;
--   • ARRIVED through somebody's Google connection — their shelf, their answers;
--   • UPLOADED (kind 'file') — THE FILE is the truth, and the body is a READING
--     of it. That last sentence is why these columns exist rather than the
--     upload being a note with a link glued to it: the words in \`body\` were
--     produced by a converter, and a reader who disagrees with an answer has to
--     be able to open the thing the words came from and check.
--
-- \`file_url\` is a capability URL into the agency's OWN media bucket
-- (/media/internal/ — served by the agency gateway and by no other door), for
-- the reason SCOPE ch.06 records about every other upload in the product.
--
-- \`file_type\` is the type the browser DECLARED. It is a LABEL and nothing else:
-- the object itself is stored as application/octet-stream, so this string is
-- never handed to a renderer (shared/workers/image.ts says why at length).
--
-- \`file_note\` is the honest half. Some files cannot be read — a deck, an
-- archive, a design file — and the ruling was that those are still STORED and
-- still LISTED rather than refused, because "any type of file" was the ask and
-- refusing half of them is not that. What must never happen is pretending one
-- was indexed, so the reason lives on the row, in words, and every screen that
-- shows the source shows it. It is a separate column from \`index_error\` on
-- purpose: that one belongs to the INDEXER and is rewritten on every pass, and a
-- fact about the file would be wiped by the next re-index of the text.
ALTER TABLE knowledge_sources ADD COLUMN file_url TEXT;
ALTER TABLE knowledge_sources ADD COLUMN file_name TEXT;
ALTER TABLE knowledge_sources ADD COLUMN file_type TEXT;
ALTER TABLE knowledge_sources ADD COLUMN file_bytes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE knowledge_sources ADD COLUMN file_note TEXT;
`,
  },
  {
    // THE FEED GETS THE INDEX ITS OWN PAGING ASKS FOR.
    //
    // `activity` is the fastest-growing table in a team's database by
    // construction: R1 makes every mutation publish and R18's feed records one
    // row for each, so at the yardstick this table is the tens-of-millions one.
    // It has paged by keyset since R14 — `ORDER BY created_at DESC, id DESC`,
    // with `created_at < ? OR (created_at = ? AND id < ?)` as the cursor — and
    // the only index on it since 0001 leads with `related_table`.
    //
    // So the record scope (`related_table = ? AND related_row_id = ?`) was
    // indexed and the TEAM scope, which is the feed everybody opens, was not:
    // every page did a full scan and a sort of the whole table to hand back
    // fifty rows, and page two paid it again. `meetings` already carries exactly
    // this index for exactly this reason ("the keyset the paged read walks, so
    // page two is an index seek rather than an offset scan") — the feed that
    // grows fastest was the one missing it.
    //
    // TWO INDEXES, because the feed has two shapes and they are not the same
    // seek. The plain one serves an unfiltered page; the composite one serves
    // R18's `related_table IN (…)` page AND lets the R16 COUNT(*) beside it read
    // an index rather than the table. Neither makes that COUNT cheaper than
    // O(rows-it-counts) — that is R16's price and it is named in the scaling
    // report — but an index-only scan over one narrow column is a different
    // order of cost from a scan of the widest table in the database.
    version: "0023_activity_feed_index",
    sql: `
CREATE INDEX IF NOT EXISTS idx_activity_feed ON activity (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_activity_table_feed ON activity (related_table, created_at DESC, id DESC);
`,
  },
  {
    // COMPANIES AND CONTACTS: ONE TABLE, TWO SCREENS, TWO PERMISSIONS.
    //
    // The owner ruled twice that a company and a person stay ONE row shape in
    // `accounts` — two tables would cap a person at one company, and the agency
    // has contacts who sit at two (Marta is at Bergman and at Delaval). So this
    // migration splits nothing in the database. It splits the two things that
    // were actually being complained about:
    //
    //   • the SIGHT of people, which becomes its own module (`contacts`), off
    //     for every role but Admin — "people of the development team does not
    //     need to know who are the contacts" (Aurora);
    //   • the SHAPE of a company, which gains the fields a company record was
    //     always missing: a real postal address rather than one free-text line,
    //     the industry it is in, a paragraph about it, a logo, a cover image.
    //
    // THE ADDRESS IS SPLIT AND THE OLD COLUMN IS BACKFILLED, NOT DROPPED.
    // `street` starts life holding whatever `address` held, so nothing anybody
    // typed is lost and no read has to know which of the two it is looking at.
    // `address` stops being written and stops being read the day this ships —
    // every surface (the form, the CSV export, the import target, the machine
    // tools) names the four fields instead. It is left in the table because
    // dropping a column is the one migration you cannot take back, and there is
    // nothing to gain by taking it back.
    //
    // `locale` is not re-invented here: the LANGUAGE an account is written to is
    // the column that has held it since 0007, and this only puts a control on it.
    version: "0024_contacts_and_company_shape",
    sql: `
ALTER TABLE accounts ADD COLUMN street TEXT;
ALTER TABLE accounts ADD COLUMN postal_code TEXT;
ALTER TABLE accounts ADD COLUMN city TEXT;
ALTER TABLE accounts ADD COLUMN country TEXT;
ALTER TABLE accounts ADD COLUMN industry TEXT;
ALTER TABLE accounts ADD COLUMN about TEXT;
ALTER TABLE accounts ADD COLUMN logo_url TEXT;
ALTER TABLE accounts ADD COLUMN cover_url TEXT;

-- The one line anybody ever typed becomes the street line. Chosen over guessing
-- at commas: a postal code parsed out of free text wrongly is worse than one
-- somebody types once, and this way every character survives somewhere visible.
UPDATE accounts SET street = address WHERE address IS NOT NULL AND address <> '';

-- Existing teams: the locked Admin role gains the new module in full (it is
-- DEFINED as full access and cannot be edited afterwards to grant it). Every
-- other role gains nothing — which is the whole point of this one: an address
-- book is a separate grant, and a migration must never hand out sight of
-- somebody's people that nobody granted. Same shape as 0007, 0013, 0018, 0019
-- and 0021. New teams don't reach this: their seed writes the rows already.
INSERT INTO role_permissions (id, role_id, module, can_read, can_create, can_edit, can_delete)
SELECT lower(hex(randomblob(16))), r.id, 'contacts', r.is_default, r.is_default, r.is_default, r.is_default
  FROM member_roles r
 WHERE NOT EXISTS (
   SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.module = 'contacts'
 );

-- The vocabularies the company form picks from. Country already had a group
-- (0018); Industry is new, and both are ordinary dropdown values a team edits on
-- its own Dropdown values screen. Pick-or-create, so a team that already typed
-- its own words keeps them. (An Account status group was seeded here too, and
-- 0042 deactivates it — a team upgraded through this migration ran it, so those
-- rows exist and have to be put away rather than never written.)
--
-- ONE STATEMENT PER VALUE, generated from an array — D1's compound-SELECT
-- ceiling is FIVE terms, and 0018 is the migration that learned it the hard way.
${COMPANY_VOCABULARY.map(
  (v) => `INSERT INTO selectable_data (id, type, value, is_default, created_at, creator_id, creator_email, creator_name)
SELECT lower(hex(randomblob(16))), '${v.type}', '${v.value}', 1, datetime('now'), NULL, NULL, 'System'
 WHERE NOT EXISTS (SELECT 1 FROM selectable_data s WHERE s.type = '${v.type}' AND s.value = '${v.value}');`
).join("\n")}
`,
  },
  {
    // THE PURGE, AND THE ONE THING IT REFUSED TO THROW AWAY.
    //
    // The owner's ruling of 17 Aug 2026 retires three things: Marketing the
    // MODULE (Marketing the task DEPARTMENT stays — it is a dropdown value and
    // always was), Learning, and the Delivery method PAGE. The CREATE statements
    // are already gone from 0004 and 0018, so a database built from this file
    // today never has these four tables at all; this migration is for the teams
    // that were built before the ruling.
    //
    // NOTHING READABLE IS LOST BY EITHER DROP:
    //   • Learning's 41 articles were indexed into the knowledge base before the
    //     module was retired (measured, not assumed) — the sources survive with
    //     kind `article`, which is why lib/knowledge.ts keeps that kind with no
    //     sweep behind it any more;
    //   • the ten programmes were the sprint types wearing a second name, and
    //     everything they carried is folded onto the sprint type below;
    //   • marketing posts are the one genuine loss, and the ruling is explicit
    //     that the module goes. An owner who wants the 251 legacy posts still
    //     has them in the Glide export.
    //
    // THE FOUR COLUMNS GO ON `selectable_data` RATHER THAN ON A SPRINT-TYPE
    // TABLE, because a sprint type is a dropdown value and a table for it would
    // be a second vocabulary seam beside the one that already exists. Every one
    // of them is nullable and every one is meaningful beyond sprint types: a
    // mark is what UI-RULEBOOK's type mark reads, a description is what a
    // picker's hint line shows, a curated foreign label is what an agency writes
    // once for a client who reads another language. `standard_days` is the only
    // narrow one, and it is a number nobody else has to look at.
    version: "0025_purge_learning_marketing_programmes",
    sql: `
ALTER TABLE selectable_data ADD COLUMN mark TEXT;
ALTER TABLE selectable_data ADD COLUMN name_de TEXT;
ALTER TABLE selectable_data ADD COLUMN description TEXT;
ALTER TABLE selectable_data ADD COLUMN standard_days INTEGER;

-- THE FOLD. One statement per value, generated from the catalogue — D1's
-- compound-SELECT ceiling is FIVE terms, and 0018 is the migration that learned
-- it the hard way. Pick-or-create for the row, then a plain UPDATE for the
-- enrichment: a team that already has "Implementation" keeps its own row, its
-- own id and its own history, and simply gains the mark, the German name, the
-- sentence and the length. A team that retired one keeps it retired.
${SPRINT_TYPE_CATALOGUE.map(
  (t) => `INSERT INTO selectable_data (id, type, value, is_default, created_at, creator_id, creator_email, creator_name)
SELECT lower(hex(randomblob(16))), 'Sprint type', ${sqlString(t.value)}, 1, datetime('now'), NULL, NULL, 'System'
 WHERE NOT EXISTS (SELECT 1 FROM selectable_data s WHERE s.type = 'Sprint type' AND s.value = ${sqlString(t.value)});
UPDATE selectable_data
   SET mark = ${sqlString(t.mark)}, name_de = ${sqlString(t.nameDe)},
       description = COALESCE(description, ${sqlString(t.description)}),
       standard_days = ${t.standardDays === null ? "NULL" : t.standardDays}
 WHERE type = 'Sprint type' AND value = ${sqlString(t.value)};`
).join("\n")}

-- AND THE TABLES GO. IF EXISTS on every one: a database built after the CREATEs
-- left 0004 and 0018 reaches this migration with none of them, and a migration
-- that only works on the old shape is a migration that breaks every new team.
-- learning_progress first — it is the one with the foreign key.
DROP TABLE IF EXISTS learning_progress;
DROP TABLE IF EXISTS learning;
DROP TABLE IF EXISTS marketing_posts;
DROP TABLE IF EXISTS programs;
`,
  },
  {
    // THE 26 DUPLICATES EVERY TEAM BORN BEFORE THE SEED WAS GUARDED IS CARRYING.
    //
    // `createTeam` applies every migration and THEN runs the seed. Several
    // migrations back-fill a default vocabulary into existing teams (0009's four
    // ticket types, 0016's three sprint types, 0018's six countries and five
    // company-size bands) and they guard themselves with WHERE NOT EXISTS,
    // because they have to be safe against a team that already has the value.
    // The seed did not, because when it was written it ran into an empty table —
    // so a brand-new team got each of those 26 values twice, and every picker in
    // the app offered each word twice. That is exactly what a tester meant by
    // "ticket types appear two, three and four times".
    //
    // The seed is guarded now, so no NEW team can be born with them. This is the
    // other half: the teams that already were.
    //
    // WHICH COPY SURVIVES, and why it cannot be "the one with the most
    // references". A dropdown value is referenced by its STRING, everywhere in
    // this app — a ticket's \`help_type\` holds the word "Question", not the id
    // of a row. Two live rows reading (Ticket type, Question) are therefore
    // indistinguishable to every reference in the database: there is no count to
    // compare. So the rule is the only one that can be applied honestly — the
    // OLDEST row survives, ties broken by id, which is the row every earlier
    // reference was looking at anyway.
    //
    // DEACTIVATED, NEVER DELETED (ARCHITECTURE §4). A retired duplicate keeps
    // its id, its audit block and its history, shows up greyed on the Dropdown
    // values screen with an Activate button, and can be brought back by anybody
    // who thinks this was wrong. \`deactivator_name\` says 'System' because that
    // is who did it.
    //
    // IDEMPOTENT: run it twice and the second pass finds nothing live to retire,
    // because the survivor of each group is the only row still matching.
    version: "0026_retire_duplicate_dropdown_values",
    sql: `
UPDATE selectable_data
   SET deactivated_at = datetime('now'),
       deactivator_id = NULL,
       deactivator_email = NULL,
       deactivator_name = 'System',
       updated_at = datetime('now')
 WHERE deactivated_at IS NULL
   AND EXISTS (
     SELECT 1 FROM selectable_data keeper
      WHERE keeper.type = selectable_data.type
        AND keeper.value = selectable_data.value
        AND keeper.id <> selectable_data.id
        AND keeper.deactivated_at IS NULL
        AND (keeper.created_at < selectable_data.created_at
             OR (keeper.created_at = selectable_data.created_at AND keeper.id < selectable_data.id))
   );
`,
  },
  {
    // TASKS, REBUILT (CHECKLIST §4). Six columns on the table we already have,
    // because every one of them is a fact ABOUT a task rather than a record of
    // its own — the shape rule this file has followed since 0016.
    //
    // `important` + `urgent` REPLACE a priority word. The score they make is
    // `(important × 2) + urgent + 1`, 1 to 4, and it is computed in
    // shared/departments.ts rather than stored: a derived number in a column is
    // a number that can disagree with the two ticks it came from. The old
    // high/medium/low never reached this table, so there is nothing to migrate.
    //
    // `department` is a WORD, not a foreign key — the five live in the
    // `Department` dropdown group (seeded below), which is the one home this base
    // has for a team's editable vocabulary. A department renamed on that screen
    // leaves old rows reading truthfully, exactly as a renamed ticket status does.
    //
    // `app_id` is the second field a Production task asks for; the account column
    // 0016 already added is the one Sales and Admin ask for. Both nullable: a
    // department that asks nothing leaves both empty, and NOT NULL here would
    // make the form's rule a schema fact that the next department breaks.
    //
    // `file_url` / `file_name` are the one attachment a task carries, the same
    // pair and the same reasoning as a to-do's: the ask is "a photo of the
    // letter", and a second file is a second task or a note on the one it is on.
    // It lands in INTERNAL_MEDIA, which only the AGENCY gateway serves (R21) —
    // a task is our own admin and its evidence must not be redeemable at the
    // client's hostname.
    //
    // The due-date index is what the six views cost: Overdue, Upcoming and the
    // "due today or earlier" progress bar all ask about `due_on` on every read.
    version: "0027_task_admin",
    sql: `
ALTER TABLE tasks ADD COLUMN important INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN urgent INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN department TEXT;
ALTER TABLE tasks ADD COLUMN app_id TEXT REFERENCES apps (id);
ALTER TABLE tasks ADD COLUMN file_url TEXT;
ALTER TABLE tasks ADD COLUMN file_name TEXT;
CREATE INDEX idx_tasks_due_on ON tasks (due_on);

-- The five departments the agency already runs on, as ordinary dropdown values
-- so they are editable (the owner's answer to c1). Pick-or-create, like every
-- other vocabulary this file seeds: a team that already typed "Marketing" for a
-- meeting purpose keeps the row it has, and the two nouns share one word.
--
-- ONE STATEMENT PER VALUE, generated from the shared list — D1's compound-SELECT
-- ceiling is FIVE terms, which 0018 learned the hard way.
${TASK_DEPARTMENTS.map(
  (d) => `INSERT INTO selectable_data (id, type, value, is_default, created_at, creator_id, creator_email, creator_name)
SELECT lower(hex(randomblob(16))), '${SELECTABLE_GROUPS.department}', '${d.name}', 1, datetime('now'), NULL, NULL, 'System'
 WHERE NOT EXISTS (SELECT 1 FROM selectable_data s WHERE s.type = '${SELECTABLE_GROUPS.department}' AND s.value = '${d.name}');`
).join("\n")}
`,
  },
  {
    // A STATUS IS A FACT, NOT A BUTTON (CHECKLIST §5 and §6, 17 Aug 2026).
    //
    // Everything below exists so that the app can REPORT what happened instead of
    // asking somebody to declare it. The two lifecycles gained the facts they were
    // missing, and the two records gained the relations that make those facts
    // computable at all.
    //
    // ON THE TICKET:
    //   `app_id`                which system it is about (5.8). Without it a
    //                           request cannot be routed, scheduled or told to the
    //                           right stakeholder;
    //   `raised_by_contact_id`  WHO ASKED (5.9), which is not who typed it: 220 of
    //                           the 221 seeded requests were typed by staff on a
    //                           client's behalf. It points at an `accounts` row of
    //                           type `individual` — a contact is a person's own
    //                           account row (there is no contacts table, and 15.1
    //                           says why);
    //   `validated_at`          when the client's main stakeholder said yes (5.13).
    //                           Only the kinds that WAIT ever carry one.
    //
    // ON THE STORY:
    //   `story_type`            Fix / Feature / Change, editable like every other
    //                           vocabulary here (6.2). Nullable, because 3,677
    //                           stories arrived from the previous system with no
    //                           type and a NOT NULL would have made the import the
    //                           first thing this migration broke;
    //   `review_note` + the two file columns  what was done, and optionally
    //                           something to show for it (6.9 — Aurora's ruling
    //                           that the file is required only when there IS one).
    //
    // AND TWO TABLES, because both are genuinely many:
    //   `help_attachments`      several files AND several links on one ticket, from
    //                           both front doors (5.10). One shape for both kinds:
    //                           "here is the thing I mean" is one act, and a
    //                           second table would have meant two lists, two
    //                           counts and two ways to be wrong about the order;
    //   `story_processes`       a story links to one or MORE processes (6.5). The
    //                           `process_id` column on `stories` stays and is the
    //                           first of these — the savings maths and the import
    //                           both address a story's map by one id, and dropping
    //                           a column is the one migration you cannot take back.
    //
    // THE TWO NEW STATUSES ARE NOT SCHEMA. `status` is a free TEXT column the code
    // validates against `HELP_STATUSES`, so `awaiting_validation` and `scheduled`
    // need no DDL — and no back-fill either, deliberately: an existing ticket sits
    // in a state somebody genuinely put it in, and quietly re-deciding history is
    // how a report stops being believable. New tickets get the new ladder.
    //
    // TWO TICKET TYPES ARE ADDED, never swapped. The sub-tabs (5.1) are DERIVED
    // from the team's own live `Ticket type` values, so this migration only has to
    // make sure the two words the feedback names — Issue and Request — exist.
    // Retiring Feedback and Bug is CHECKLIST 2.1 and belongs to the words lane;
    // adding here and retiring there compose, whichever order they land in.
    version: "0028_ticket_and_story_facts",
    sql: `
ALTER TABLE help ADD COLUMN app_id TEXT REFERENCES apps (id);
ALTER TABLE help ADD COLUMN raised_by_contact_id TEXT REFERENCES accounts (id);
ALTER TABLE help ADD COLUMN validated_at TEXT;
CREATE INDEX idx_help_app ON help (app_id);

ALTER TABLE stories ADD COLUMN story_type TEXT;
ALTER TABLE stories ADD COLUMN review_note TEXT;
ALTER TABLE stories ADD COLUMN review_file_url TEXT;
ALTER TABLE stories ADD COLUMN review_file_name TEXT;

-- FILES AND LINKS ON A TICKET. \`kind\` is checked in the schema rather than in
-- code because it decides how \`url\` is READ — a key inside the tickets bucket,
-- or an address a browser follows — and a third value would be a row nothing
-- knows how to render.
CREATE TABLE help_attachments (
  id TEXT PRIMARY KEY,
  help_id TEXT NOT NULL REFERENCES help (id),
  kind TEXT NOT NULL CHECK (kind IN ('file', 'link')),
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  content_type TEXT,
  size_bytes INTEGER,
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT,
  deactivated_at TEXT, deactivator_id TEXT, deactivator_email TEXT, deactivator_name TEXT
);
CREATE INDEX idx_help_attachments_help ON help_attachments (help_id);

-- EVERY PROCESS ONE STORY TOUCHES. The pair is unique on LIVE rows only, so
-- unlinking a map and linking it again later is allowed and the old row stays.
CREATE TABLE story_processes (
  id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL REFERENCES stories (id),
  process_id TEXT NOT NULL REFERENCES processes (id),
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT
);
CREATE UNIQUE INDEX idx_story_processes_pair ON story_processes (story_id, process_id);
CREATE INDEX idx_story_processes_story ON story_processes (story_id);

-- The story types SCOPE names, seeded the way every other vocabulary here is:
-- ADDED, never swapped, and one statement per value (D1's compound-SELECT
-- ceiling is five terms, which 0018 learned the hard way).
${["Fix", "Feature", "Change"]
  .map(
    (v) => `INSERT INTO selectable_data (id, type, value, is_default, created_at, creator_id, creator_email, creator_name)
SELECT lower(hex(randomblob(16))), 'Story type', ${sqlString(v)}, 1, datetime('now'), NULL, NULL, 'System'
 WHERE NOT EXISTS (SELECT 1 FROM selectable_data s WHERE s.type = 'Story type' AND s.value = ${sqlString(v)});`
  )
  .join("\n")}

-- The two ticket types the sub-tabs need a word for.
${["Issue", "Request"]
  .map(
    (v) => `INSERT INTO selectable_data (id, type, value, is_default, created_at, creator_id, creator_email, creator_name)
SELECT lower(hex(randomblob(16))), 'Ticket type', ${sqlString(v)}, 1, datetime('now'), NULL, NULL, 'System'
 WHERE NOT EXISTS (SELECT 1 FROM selectable_data s WHERE s.type = 'Ticket type' AND s.value = ${sqlString(v)});`
  )
  .join("\n")}
`,
  },
  {
    // ── AN APP BECOMES A RECORD, not a name with a URL on it ──────────────────
    //
    // FOUR CONTEXT FIELDS, and they are the reason this migration exists. An app
    // row carried a name, an address and a free-typed stage: enough to list one,
    // nowhere near enough to brief anybody. The tester was emphatic that these
    // earn their keep twice over, for onboarding a person and for the assistant
    // answering a question about the system. They are long prose, so they are
    // TEXT columns rather than a table — one app has exactly one answer to each,
    // and a table would be four rows pretending to be a collection.
    //
    // \`key_actors\` is prose too, deliberately. "Who this is for" is a sentence
    // about the CLIENT's world ("the two dispatchers, and whoever is on the
    // counter"), not a list of our users — the people an app is about rarely
    // hold a login here at all.
    //
    // STAGE STOPS BEING TYPED. The column does not change; what changes is that
    // the eight names the agency already uses arrive as ordinary dropdown values
    // with the mark it already recognises each one by, so the form offers them
    // instead of asking somebody to remember whether they wrote "live" or "Live"
    // last time. Pick-or-create like every other vocabulary this file seeds: a
    // team that typed its own stage keeps it, and the eight sit beside it. The
    // names, marks and order are read off the legacy data, not invented — see
    // shared/app-stages.ts, which also carries the one thing a dropdown row
    // cannot say: whether a stage means the app is still being worked on.
    //
    // WHICH APP A MEETING WAS ABOUT. Nullable: plenty of meetings are about the
    // account rather than one of its systems, and NOT NULL here would make the
    // meetings list refuse the first kickoff call.
    version: "0029_app_record",
    sql: `
ALTER TABLE apps ADD COLUMN about TEXT;
ALTER TABLE apps ADD COLUMN client_context TEXT;
ALTER TABLE apps ADD COLUMN solution TEXT;
ALTER TABLE apps ADD COLUMN key_actors TEXT;

ALTER TABLE meetings ADD COLUMN app_id TEXT REFERENCES apps (id);
CREATE INDEX idx_meetings_app ON meetings (app_id);

-- ONE STATEMENT PER VALUE, generated from the shared list — D1's compound-SELECT
-- ceiling is FIVE terms, which 0018 learned the hard way.
${APP_STAGES.map(
  (s) => `INSERT INTO selectable_data (id, type, value, mark, is_default, created_at, creator_id, creator_email, creator_name)
SELECT lower(hex(randomblob(16))), ${sqlString(SELECTABLE_GROUPS.appStage)}, ${sqlString(s.name)}, ${sqlString(s.mark)}, 1, datetime('now'), NULL, NULL, 'System'
 WHERE NOT EXISTS (SELECT 1 FROM selectable_data s WHERE s.type = ${sqlString(SELECTABLE_GROUPS.appStage)} AND s.value = ${sqlString(s.name)});`
).join("\n")}
`,
  },
  {
    // WHO IS ON AN APP, AND WHO THE CLIENT'S PERSON IS (CHECKLIST 8.10 + 8.5).
    //
    // Two tables and not one, because the two questions are about two different
    // populations that live in two different databases. STAFF are our own people
    // — a `user_id` from the GLOBAL core's `team_members`, which is why there is
    // no foreign key here and cannot be. STAKEHOLDERS are the client's people —
    // an `accounts` row of type individual, in THIS database, which is why that
    // one does carry its reference. A single table with a "kind" column would
    // have had one pointer meaning two incompatible things, which is the shape
    // that produces a join nobody can write.
    //
    // WHY THEY MATTER MORE THAN THEY LOOK. Three separate asks were blocked on
    // the staff table alone: "my tickets" means tickets on the apps I am staffed
    // to (2.3), a story's assignee narrows to that app's staff (6.6), and the
    // Done button belongs to the app's team lead (6.10). None of them is a
    // feature on its own — each is one clause once this row exists.
    //
    // ONE LEAD, ONE MAIN, ENFORCED BY THE INDEX RATHER THAN BY A CHECK. A
    // partial unique index is the only version of "exactly one" that survives
    // two people pressing save at the same moment (CONCURRENCY.md): a read-then-
    // write check would let both through. The partial clause is what lets a
    // RETIRED lead's row stay on the record — deactivate, never delete — without
    // occupying the one live slot.
    //
    // THE MEMBERSHIP INDEX IS UNIQUE ACROSS BOTH STATES, deliberately: adding
    // somebody who was taken off the app again re-activates the row they already
    // have rather than inserting a second one, so the record keeps one history
    // per person instead of a pile of tombstones.
    version: "0030_app_staff_and_stakeholders",
    sql: `
CREATE TABLE app_staff (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL REFERENCES apps (id),
  user_id TEXT NOT NULL,
  is_lead INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT,
  updated_at TEXT, editor_id TEXT, editor_email TEXT, editor_name TEXT,
  deactivated_at TEXT, deactivator_id TEXT, deactivator_email TEXT, deactivator_name TEXT
);
CREATE UNIQUE INDEX idx_app_staff_person ON app_staff (app_id, user_id);
CREATE INDEX idx_app_staff_user ON app_staff (user_id);
CREATE UNIQUE INDEX idx_app_staff_lead ON app_staff (app_id) WHERE is_lead = 1 AND deactivated_at IS NULL;

CREATE TABLE app_stakeholders (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL REFERENCES apps (id),
  contact_id TEXT NOT NULL REFERENCES accounts (id),
  is_main INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT,
  updated_at TEXT, editor_id TEXT, editor_email TEXT, editor_name TEXT,
  deactivated_at TEXT, deactivator_id TEXT, deactivator_email TEXT, deactivator_name TEXT
);
CREATE UNIQUE INDEX idx_app_stakeholders_person ON app_stakeholders (app_id, contact_id);
CREATE UNIQUE INDEX idx_app_stakeholders_main ON app_stakeholders (app_id) WHERE is_main = 1 AND deactivated_at IS NULL;
`,
  },
  {
    // WHAT AN HOUR OF A ROLE COSTS US, AND WHICH ROLE DOES A PROCESS (8.13).
    //
    // Aurora's model for "hours and money given back", settled over the owner's:
    // the money is the hours saved times THE RATE OF THE ROLE THAT DOES THE WORK,
    // before minus after. The app had two rate cards and neither could answer it
    // — `rates` is what an ACCOUNT is charged, `internal_rates` is what a KIND OF
    // WORK costs us — so this is the third: a price per role.
    //
    // IT IS AN INTERNAL NUMBER AND R24 IS ABSOLUTE ABOUT IT. The table is read
    // only from workers/tenancy/src/lib/internal-money.ts, every door that reads
    // it refuses a portal caller, and nothing in web-portal/ may name it. The
    // rule's own sentence is why it lives beside the internal rate card rather
    // than beside the account one: a condition can be inverted, an import cannot
    // be forgotten.
    //
    // \`role_name\` ON THE PROCESS, not on the step. The feedback's sentence is
    // "for each process, record which role does it" — one process is one kind of
    // work done by one kind of person, and a role per step would ask somebody to
    // answer the same question eleven times to get one number. Free text against
    // the team's own role vocabulary rather than a foreign key to `member_roles`:
    // the person who does a client's invoicing is THEIR bookkeeper, not one of
    // our logins, so the roles being priced are not roles anybody here holds.
    version: "0031_role_rate_card",
    sql: `
CREATE TABLE internal_role_rates (
  id TEXT PRIMARY KEY,
  role_name TEXT NOT NULL,
  cents_per_hour INTEGER NOT NULL DEFAULT 0 CHECK (cents_per_hour >= 0),
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT,
  updated_at TEXT, editor_id TEXT, editor_email TEXT, editor_name TEXT,
  deactivated_at TEXT, deactivator_id TEXT, deactivator_email TEXT, deactivator_name TEXT
);
CREATE UNIQUE INDEX idx_internal_role_rates_role ON internal_role_rates (role_name) WHERE deactivated_at IS NULL;

ALTER TABLE processes ADD COLUMN role_name TEXT;
`,
  },
  {
    // MEETINGS LEARNS THREE THINGS (CHECKLIST 9.2, 9.4 and 9.7).
    //
    // \`transcript_file_id\` + \`transcript_captured_at\` — WHICH transcript was
    // read off Drive and WHEN. Two columns rather than one because they answer
    // two different questions: the id is what a person opens, and the timestamp
    // is the idempotence predicate. Capturing a transcript ticks "held" and
    // writes a work log per participant, and both of those are things that must
    // happen exactly once however many times the button is pressed — so the
    // write rides \`transcript_captured_at IS NULL\`, which is R17 for a job
    // rather than a status.
    //
    // \`recurring_event_id\` — the Google series an entry belongs to. It was
    // being thrown away: the calendar read asks for \`singleEvents=true\`, which
    // expands a series into instances and hands back the parent's id on each
    // one, and nothing kept it. Without it the app cannot tell the eleventh
    // Monday stand-up from a one-off, which is the whole of 9.7.
    //
    // NOT A UNIQUE INDEX, unlike \`google_event_id\` beside it: a series has many
    // instances and every one of them carries the same parent id. The instance's
    // own id is what stays unique, and it already is.
    //
    // AND A WORK LOG MAY NOW POINT AT A MEETING. The allow-list is code
    // (\`WORK_LOG_TARGETS\`), not schema — the column deliberately has no CHECK —
    // so this migration adds the INDEX that makes the new target cheap to read
    // and the allow-list is widened in the same commit.
    version: "0032_meeting_transcripts_and_series",
    sql: `
ALTER TABLE meetings ADD COLUMN transcript_file_id TEXT;
ALTER TABLE meetings ADD COLUMN transcript_captured_at TEXT;
ALTER TABLE meetings ADD COLUMN recurring_event_id TEXT;
CREATE INDEX idx_meetings_recurring ON meetings (recurring_event_id);
`,
  },
  {
    // WHO MAY READ WHAT, IN TWO PLACES THAT ASK THE SAME QUESTION (12.3 + 4.9).
    //
    // ── ONE COLUMN, AND WHY IT IS NOT \`app_id\` ─────────────────────────────
    // The knowledge base had exactly two settings: the team's, or one person's
    // (\`owner_user_id\`). The owner asked to "choose what information in the
    // knowledge base is accessible by whom", and the gap was the middle: a source
    // somebody wants kept off a wider audience INSIDE the agency without making
    // it answerable to themselves alone.
    //
    // The answer rides a fence the app already has rather than inventing an
    // access-control list. 8.11 already decided that only the staff on an app
    // (plus an admin) open it, and \`app_staff\` is where that lives — so a source
    // can now say "the people on this app", and the sentence a reader has to
    // learn is one they already know.
    //
    // A SECOND COLUMN RATHER THAN A MEANING ON \`app_id\`, and this is the load-
    // bearing bit: \`app_id\` is the SWEEP's. It says what a mirrored source is
    // ABOUT and is rewritten on every pass (knowledge-ingest.ts's upsert sets
    // \`app_id = excluded.app_id\`). A person's decision about who may read
    // something cannot live in a column a background job overwrites. Two columns,
    // two owners, no collision.
    //
    // NULL means the team's, so every row that exists keeps exactly the reach it
    // had. No back-fill: the absence IS the old behaviour.
    //
    // ── AND THE PERMISSION ROW BESIDE IT ───────────────────────────────────
    // "Everything with permissions should be configurable" (Aurora, 17 Aug). Who
    // may see everyone ELSE's tasks was hard-coded to "everybody" — so it becomes
    // an ordinary module row on the tall sheet, and the door narrows a caller
    // without it to their own name through the \`assigneeId\` filter it already
    // parses. \`is_default\` is 1 on the locked Admin role alone, so it doubles as
    // the bit: Admin gains it in full, every other role gains nothing. The same
    // shape as 0007, 0013, 0018, 0019, 0021 and 0024. New teams don't reach this
    // — their seed writes the rows already, and it writes this one OFF.
    version: "0033_knowledge_visibility_and_task_sight",
    sql: `
ALTER TABLE knowledge_sources ADD COLUMN visible_to_app_id TEXT REFERENCES apps (id);

INSERT INTO role_permissions (id, role_id, module, can_read, can_create, can_edit, can_delete)
SELECT lower(hex(randomblob(16))), r.id, 'all_tasks', r.is_default, r.is_default, r.is_default, r.is_default
  FROM member_roles r
 WHERE NOT EXISTS (
   SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.module = 'all_tasks'
 );
`,
  },
  {
    // ── THE WORDS, AND THE GLYPH BESIDE EACH ONE ──────────────────────────────
    //
    // CHECKLIST 2.1 and 2.2 settle the vocabulary: a ticket is a Question, an
    // Issue, a Request, an Extra or Requirements, and a story is a Fix, a
    // Feature or a Change. Two of the old ticket words go — Aurora retired
    // Feedback and Bug, and this is a "what", so hers is the answer.
    //
    // RETIRED, NEVER DELETED. Every ticket ever filed as a Bug still says Bug:
    // the row is deactivated, so it vanishes from the pickers and from its
    // sub-tab while every historic record reads exactly as it was written. That
    // is deactivate-not-delete applied to a WORD, and it is the whole reason the
    // Dropdown values screen has an Activate button.
    //
    // AND THE MARK (CHECKLIST 11.8, UI-RULEBOOK G2). One glyph per type, in the
    // slot an icon would take, so a list of forty is readable without reading.
    // It is set as DATA rather than written into a component, which is the
    // fourth of the four conditions UI-CONVENTIONS §5 puts on a type mark: a
    // team changes any of these on its own Dropdown values screen. Only rows
    // with no glyph yet are touched, so a team that has already chosen one keeps
    // it. Sprint types already carry theirs (0025).
    //
    // THE GLYPH IS A TWO-LETTER CODE, not a pictograph — the client's ruling,
    // 2026-08-31: "i said no emojis. why are there still emojis? kill them!"
    // (`shared/workers/validate.ts`'s `optionalMark` is the door that refuses
    // one going forward; this migration is the seed side of the same ruling.)
    //
    // Extra and Requirements deliberately get none: the agency's legacy data has
    // no glyph for either, and an invented one would be a guess wearing the
    // authority of a seeded default. A missing mark costs nothing — the WORD is
    // always beside it (condition three), so it is never the only thing carrying
    // the meaning.
    version: "0034_ticket_and_story_vocabulary",
    sql: `
INSERT INTO selectable_data (id, type, value, is_default, created_at, creator_id, creator_email, creator_name)
SELECT lower(hex(randomblob(16))), 'Ticket type', 'Requirements', 1, datetime('now'), NULL, NULL, 'System'
 WHERE NOT EXISTS (SELECT 1 FROM selectable_data s WHERE s.type = 'Ticket type' AND s.value = 'Requirements');

UPDATE selectable_data SET deactivated_at = datetime('now'), deactivator_name = 'System'
 WHERE type = 'Ticket type' AND value IN ('Feedback', 'Bug') AND deactivated_at IS NULL;

UPDATE selectable_data SET mark = 'Q' WHERE type = 'Ticket type' AND value = 'Question' AND mark IS NULL;
UPDATE selectable_data SET mark = 'IS' WHERE type = 'Ticket type' AND value = 'Issue' AND mark IS NULL;
UPDATE selectable_data SET mark = 'RQ' WHERE type = 'Ticket type' AND value = 'Request' AND mark IS NULL;
UPDATE selectable_data SET mark = 'FX' WHERE type = 'Story type' AND value = 'Fix' AND mark IS NULL;
UPDATE selectable_data SET mark = 'FT' WHERE type = 'Story type' AND value = 'Feature' AND mark IS NULL;
UPDATE selectable_data SET mark = 'CH' WHERE type = 'Story type' AND value = 'Change' AND mark IS NULL;
`,
  },
  {
    // THE WHOLE CALENDAR ENTRY, NOT A LINK TO IT — and a Drive share that can be
    // one FILE.
    //
    // ── WHY THE MIRROR COLUMNS ────────────────────────────────────────────────
    // The owner: "All the other information, like location, stakeholders, or any
    // other calendar data or metadata, should be pulled in and organised
    // correctly." Until now a meeting kept two facts about its calendar event — the
    // id and the link — and every other fact (who was invited, who accepted, who
    // called it, where to join, what was attached) was reachable only by asking
    // Google again, live, with the reader's own token.
    //
    // That is not a small inconvenience. It means the facts are unavailable to
    // ANYBODY BUT THE PERSON WHOSE CONNECTION PUSHED THE MEETING, unreadable when
    // Google is slow, and impossible to put in a list — fifty rows would be fifty
    // calls. A meeting record that cannot say who was in the room is a record of
    // a conversation with the conversation left out.
    //
    // THEY ARE A MIRROR AND THEY SAY SO. Every one is prefixed \`google_\`, and
    // \`google_synced_at\` says when it was last true. Nothing in the app WRITES
    // to Google through these columns — the four calendar doors do that, against
    // the live entry — so there is no direction in which they can disagree with
    // Google and win. If they are stale, the sweep is behind; the entry is right.
    //
    // TWO OF THEM ARE JSON, which this database already does in a dozen places
    // (\`files_json\`, \`plan_json\`, \`tool_calls_json\`, \`preview_json\`) and for the
    // same reason: a guest list is a LIST OF THE EVENT, not a table of its own.
    // Nothing joins to it, nothing sorts by it, and nothing outside the meeting
    // ever asks a question of it — an \`event_attendees\` table would be five
    // hundred rows a week whose only reader is the row above them.
    //
    // ── \`from_calendar\`, AND WHY IT DECIDES WHAT A RE-SYNC MAY OVERWRITE ──────
    // Two kinds of meeting carry a \`google_event_id\` and they are NOT the same
    // record. One was typed in kwapso and pushed out; the other was read IN off
    // somebody's calendar. A re-sync that rewrote the title of both would quietly
    // undo a person's own words the moment Google's copy differed — which it
    // will, because the push writes "BERG-M0007 · Kickoff" and the calendar says
    // "Kickoff".
    //
    // So the flag records WHERE THE ROW CAME FROM, once, at insert. Google owns
    // the words of a row it authored; kwapso owns the words of a row it authored;
    // and the \`google_*\` mirror is refreshed on both, because those are Google's
    // facts either way. \`notes\` is never touched by a sync at all — it is the one
    // column in this module that only a person writes.
    //
    // ── AND A SHARE THAT IS ONE FILE ─────────────────────────────────────────
    // \`google_sources.kind\` splits what was one word. The owner: "In Drive, why
    // is it that it's only folder-wise? What if it had to be file-wise?" It did
    // not have to — a folder was only ever the thing the form could spell, which
    // made sharing one contract mean sharing everything filed beside it. The
    // fence does not change shape: what is named is the only thing readable, and
    // a named file is exactly one file.
    version: "0035_calendar_depth_and_file_shares",
    sql: `
ALTER TABLE meetings ADD COLUMN google_join_url TEXT;
ALTER TABLE meetings ADD COLUMN google_organizer TEXT;
ALTER TABLE meetings ADD COLUMN google_attendees_json TEXT;
ALTER TABLE meetings ADD COLUMN google_attachments_json TEXT;
ALTER TABLE meetings ADD COLUMN google_status TEXT;
ALTER TABLE meetings ADD COLUMN google_recurrence TEXT;
ALTER TABLE meetings ADD COLUMN google_time_zone TEXT;
ALTER TABLE meetings ADD COLUMN google_updated_at TEXT;
ALTER TABLE meetings ADD COLUMN google_synced_at TEXT;
ALTER TABLE meetings ADD COLUMN from_calendar INTEGER NOT NULL DEFAULT 0;

-- WHAT WAS SAID, ON THE MEETING ITSELF.
--
-- The owner: "For older meetings, the call transcript should automatically be
-- here." HERE is the word that decides these four columns. A transcript reachable
-- only by whoever holds the Drive connection, only while Google answers, is not
-- on the meeting — it is a link to somewhere else, and the reason this module
-- exists at all is that \`agenda\` and \`notes\` had nowhere else to live either.
--
-- AND IT IS WHAT MAKES THE TRANSCRIPT ANSWERABLE WITHOUT A SECOND INGESTION
-- PATH. The knowledge base sweeps rows of THIS database on a cron, as nobody in
-- particular; everything Google is swept per person, with that person's token,
-- only when they are here (lib/knowledge-google.ts's header says why that
-- separation is load-bearing). Text sitting in a column is on the near side of
-- that line: the ordinary \`meeting\` ingest kind reads it like any other row, in
-- the client's own compartment, with no token and no special case.
--
-- \`transcript_text\` is CUT to what one row may hold and \`transcript_note\` says
-- so when it was — the same rule and the same words a knowledge file uses
-- (\`capToRow\`), because "never silently trimmed" is the promise, not "never
-- trimmed".
--
-- \`transcript_found_by\` records WHICH of the three hunts found it — the event's
-- own attachments, a shared Drive folder, or a Google notice in the mail. It is
-- kept because the three are not equally trustworthy and a person asking "how do
-- you know that is the transcript of THIS call" deserves an answer.
ALTER TABLE meetings ADD COLUMN transcript_text TEXT;
ALTER TABLE meetings ADD COLUMN transcript_note TEXT;
ALTER TABLE meetings ADD COLUMN transcript_url TEXT;
ALTER TABLE meetings ADD COLUMN transcript_found_by TEXT;

-- EXISTING ROWS THAT CAME OUT OF A CALENDAR. Before this migration the only
-- writer of \`recurring_event_id\` was the series sweep, so a row carrying one is
-- a row Google authored — which makes this back-fill a reading of history rather
-- than a guess about it. A meeting pushed OUT of kwapso never had one.
UPDATE meetings SET from_calendar = 1 WHERE recurring_event_id IS NOT NULL;

-- The backward sweep asks "which of these event ids do I already have?" over a
-- window of a few dozen. The unique index on \`google_event_id\` already serves
-- that lookup; this one is for the OTHER question the sweep asks — which rows
-- Google owns the words of — on a table where nearly every row answers no.
CREATE INDEX idx_meetings_from_calendar ON meetings (from_calendar) WHERE from_calendar = 1;

-- A FOLDER, A FILE, OR A SPACE. Defaulting to 'folder' keeps every Drive row
-- exactly what it already was; the one UPDATE names the Chat rows for what they
-- have always been, so no row is left describing itself wrongly.
ALTER TABLE google_sources ADD COLUMN kind TEXT NOT NULL DEFAULT 'folder';
UPDATE google_sources SET kind = 'space' WHERE service = 'chat';
`,
  },
  {
    // WHAT WE HAND OVER (CHECKLIST 8.7). A DELIVERABLE is a piece of material we
    // hand over on an app: a handover doc, an API reference, a recorded
    // walkthrough, an SOP. The owner's own list, and the reason the item sat
    // parked for weeks is that nobody had said what the word meant.
    //
    // IT BELONGS TO AN APP, NOT TO AN ACCOUNT, and \`app_id\` is NOT NULL because
    // of it. The legacy app hung these off the app too (glide/RECONCILIATION.md:
    // 8 rows, "Name, type, a content URL and a thumbnail"), and the reason is the
    // one that whole file opens with: the customer is the owner, the APP is the
    // unit of work. A handover doc with no system to hand over is not a record
    // anybody could file.
    //
    // \`account_id\` IS DENORMALISED FROM THE APP, exactly as \`processes\`,
    // \`process_versions\` and \`process_steps\` carry it: written once from the
    // app at creation, never edited, so the account fence rides ONE clause with
    // no join the day a client is ever shown these. It is the fence built now,
    // switched off now (R21: every door on this module refuses a portal caller);
    // what it is NOT is a column somebody has to back-fill later under pressure.
    //
    // \`url\` IS ONE COLUMN FOR TWO SHAPES — an object we host (a
    // /media/internal/… URL the upload door mints) or a link we do not (a Loom
    // recording, a Google Doc, an API reference). The same sentence
    // \`brand_assets.file_url\` makes, and for the same reason help_attachments
    // gives at length: "here is the thing I mean" is ONE act, and two columns
    // would be two lists, two counts and two ways to be wrong about which is set.
    //
    // \`image_url\` is the picture on the card. Separate from \`url\` because a
    // Loom link has no thumbnail of its own and a PDF is not its own preview —
    // "some have a picture worth showing" is a fact about the deliverable, not
    // about its material.
    //
    // \`kind\` is the word in small caps on the card (VIDEO, SOP). A dropdown
    // vocabulary rather than an enum, like every other word this app lets a team
    // choose: the five below are the starting set, and a team that hands over
    // something we have not thought of adds it on its own Dropdown values screen.
    //
    // \`dated_on\` is a calendar DAY, written YYYY-MM-DD through \`optionalDate\` —
    // nobody hands a deck over at 14:32:07.
    version: "0036_deliverables",
    sql: `
CREATE TABLE deliverables (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL REFERENCES apps (id),
  account_id TEXT REFERENCES accounts (id),
  title TEXT NOT NULL,
  kind TEXT,
  dated_on TEXT,
  url TEXT,
  image_url TEXT,
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT,
  updated_at TEXT, editor_id TEXT, editor_email TEXT, editor_name TEXT,
  deactivated_at TEXT, deactivator_id TEXT, deactivator_email TEXT, deactivator_name TEXT
);
-- The one question this table is ever asked: what has been handed over on this
-- app, newest first. The date leads the index because it leads the order.
CREATE INDEX idx_deliverables_app ON deliverables (app_id, dated_on);
CREATE INDEX idx_deliverables_account ON deliverables (account_id);

-- ONE STATEMENT PER VALUE, generated from the shared list — D1's compound-SELECT
-- ceiling is FIVE terms, which 0018 learned the hard way. Guarded by WHERE NOT
-- EXISTS so a team that already types one of these words keeps its own row.
${DELIVERABLE_KINDS.map(
  (v) => `INSERT INTO selectable_data (id, type, value, is_default, created_at, creator_id, creator_email, creator_name)
SELECT lower(hex(randomblob(16))), ${sqlString(SELECTABLE_GROUPS.deliverableKind)}, ${sqlString(v)}, 1, datetime('now'), NULL, NULL, 'System'
 WHERE NOT EXISTS (SELECT 1 FROM selectable_data s WHERE s.type = ${sqlString(SELECTABLE_GROUPS.deliverableKind)} AND s.value = ${sqlString(v)});`
).join("\n")}
`,
  },
  {
    // THE ONE RECORD IN THIS APP A PERSON RECOGNISES BY SIGHT, and the only one
    // whose picture had nowhere to live.
    //
    // The apps screen is a wall of tiles precisely because an app is known by
    // its mark (\`app-tiles.tsx\`, UI-RULEBOOK K9) — and every tile drew the same
    // stage glyph, because the column this migration adds did not exist. The
    // legacy app it replaced showed the client's real logo on all twenty-eight,
    // which is how the gap was noticed: two screens side by side, one of them
    // full of gears.
    //
    // The data settles the argument rather than taste: 26 of Glide's 28 apps
    // carry a picture (glide/RECONCILIATION.md § the work engine), so this is a
    // column with rows waiting for it, not a field somebody might one day fill.
    //
    // ONE COLUMN, NOT TWO. An account has a logo AND a cover because a company
    // record has a masthead to fill; an app is only ever seen as a square in a
    // grid or a square on its own heading, so a second image would be a column
    // no screen has a place for.
    //
    // It holds what the two doors that write it produce: a \`/media/<key>\` path
    // minted by \`storeImageDataUrl\`, the same seam the account logo has used
    // since 0024. Nothing else — the picker downsizes in the browser, the door
    // puts the bytes in R2, and the row keeps the path.
    version: "0037_app_logo",
    sql: `
ALTER TABLE apps ADD COLUMN logo_url TEXT;
`,
  },
  {
    // THE CALENDAR BECOMES ONE-WAY, AND THE WALK THAT MAKES "EVERYTHING" TRUE.
    //
    // The owner, 18 August 2026: "disable the ability to create, edit, or delete
    // anything in the calendar from the frontend… just make it one-way so we only
    // grab and update the information", and beside it "anything in my calendar
    // should be up to date here. That's all."
    //
    // ── \`calendar_swept_through\` ─────────────────────────────────────────────
    // ONE column, holding ONE moment: how far a forward-only walk over the whole
    // calendar has read. The live window (a fortnight back, four weeks on) is
    // swept on every call and keeps the meetings list current; this cursor is what lets a
    // FIVE-YEAR window be read a ninety-day slice at a time without any single
    // request being unbounded (R14). It sits on the CONNECTION because the walk
    // is one person's own calendar read with one person's own token — a team-level
    // cursor would mean one colleague's progress deciding another's.
    //
    // NULL means "never walked", which the reader turns into the floor. There is
    // deliberately no back-fill: a null that reads as "start at the beginning" is
    // the only value that cannot be wrong.
    //
    // ── AND THE SWITCH THAT NOW SWITCHES NOTHING ────────────────────────────
    // \`google_events\` ("Calendar on your behalf") existed to carry one right:
    // may kwapso put an event in your calendar. Nothing can, on any surface, so
    // the row is deleted rather than left on the Roles screen offering a
    // capability the code does not have. That is the same reasoning R24 makes
    // structurally: a permission somebody can grant, guarding nothing, is a
    // sentence the app cannot keep.
    //
    // Deleting a permission ROW is not deleting data about the agency's work —
    // the deactivate-never-delete rule is about records, and this is a column of
    // the permission matrix being retired. Same shape as 0025, which purged two
    // whole modules.
    version: "0038_calendar_one_way",
    sql: `
ALTER TABLE google_connections ADD COLUMN calendar_swept_through TEXT;

DELETE FROM role_permissions WHERE module = 'google_events';
`,
  },
  {
    // THE MODULE NOBODY COULD SEE — 0036 built the handover shelf and forgot to
    // hand anybody the key.
    //
    // Every migration that adds a MODULE carries two halves: the tables, and a
    // back-fill giving the locked Admin role the new right on every team that
    // already exists. 0007, 0013, 0018, 0019, 0021, 0027 and 0033 all do it.
    // 0036 shipped the first half only. So `deliverables` went into TEAM_MODULES,
    // the doors went up, the screens went up, the tools went up — and on every
    // team created before that day, including staging and production, NO ROLE
    // HELD THE RIGHT. Not Admin, which is defined as full access and cannot be
    // edited afterwards to grant itself anything. The module was unreachable for
    // the entire agency.
    //
    // WHY IT HID. A brand-new team is fine: `createTeam` runs the migrations and
    // then the seed, and the seed walks TEAM_MODULES and writes the whole tall
    // sheet. So every test that builds a fresh database saw the right and passed.
    // The bug only exists for a team that was born BEFORE the module, which is
    // every real team and no test one. Add a portal fence that was switched off
    // and there was nothing to look at from either side, and a module can be
    // invisible to everybody for a week under a green build.
    //
    // THE SHAPE IS 0021's, WORD FOR WORD, and deliberately not a fresh idea:
    //   • `r.is_default` supplies all four rights, which is 1 for the locked
    //     Admin role and 0 for every role somebody built by hand. A migration
    //     must never hand out a sight nobody granted — a Client role does not
    //     quietly gain the handover shelf because we fixed our own bug.
    //   • `WHERE NOT EXISTS` makes it idempotent, which matters more than usual
    //     here: at least one staging team already has this row, inserted BY HAND
    //     on 18 Aug 2026 to get testing unblocked. This migration must meet that
    //     team and do nothing, not fail on a unique index and not write a second
    //     row. Same predicate-rides-the-write shape as R17.
    //   • A brand-new team never reaches it either, for the same reason: its
    //     seed has already written the row, and `NOT EXISTS` sees it.
    //
    // `workers/tenancy/test/team-schema.test.ts` now holds the general version of
    // this, derived from TEAM_MODULES rather than from anybody remembering: a
    // module in that list with no grant in any migration turns the build red, so
    // the NEXT module to ship half of itself does not get a week.
    version: "0039_deliverables_permission",
    sql: `
INSERT INTO role_permissions (id, role_id, module, can_read, can_create, can_edit, can_delete)
SELECT lower(hex(randomblob(16))), r.id, 'deliverables', r.is_default, r.is_default, r.is_default, r.is_default
  FROM member_roles r
 WHERE NOT EXISTS (
   SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.module = 'deliverables'
 );
`,
  },
  {
    // A DELIVERABLE BECOMES THE CLIENT'S WHEN SOMEBODY SAYS SO, ONE AT A TIME.
    //
    // The owner, 18 August 2026, asked whether clients should see deliverables:
    // "yes of course.. the deliverables are for them! but only once we mark it
    // as visible yeah?" — which is two rulings, not one. The material IS theirs,
    // so the module opens. And it opens PER ROW, because the shelf is where a
    // handover is assembled: a draft SOP, a recording with the wrong audio, an
    // API doc that names a staging host all sit on it while they are being
    // worked on. Opening the module wholesale would publish the workbench.
    //
    // ONE COLUMN, AND ITS DEFAULT IS THE WHOLE SAFETY ARGUMENT. `ALTER TABLE …
    // ADD COLUMN` gives every row that already exists NULL, and NULL is "not
    // visible" — so the twenty-eight apps' worth of handover material already
    // filed stays exactly as private the second after this migration runs as it
    // was the second before. There is no back-fill to get right and no DEFAULT 1
    // to mistype. The read demands `visible_to_client_at IS NOT NULL`, so the
    // safe state is the one the database hands out for free.
    //
    // A MOMENT, NOT A FLAG, and `help.validated_at` is the precedent: the column
    // answers "since when", which is a fact the client's own screen can say out
    // loud ("shared with you on 4 March"), and a boolean could not. WHO shared it
    // is not stored beside it — that is what the activity row this write logs is
    // for, read back through the one generic (table, id) path (R5). A column
    // duplicating the feed is a second answer that can disagree with the first.
    //
    // NOT AN AUDIT QUARTET like `archived_at`/`archiver_*`. Archiving is the end
    // of a record's working life and its actor is worth denormalising onto the
    // row; this is a reversible disclosure switch that will be flipped both ways
    // by whoever is assembling the handover, and every flip is already a line of
    // history.
    //
    // NO INDEX. `idx_deliverables_account` already narrows the client's read to
    // the accounts in their fence, and a shelf is a handful of rows per app —
    // the CURATED collection lib/deliverables.ts caps rather than pages. An
    // index on a two-value column behind an already-narrow one buys nothing.
    version: "0040_deliverable_client_visibility",
    sql: `
ALTER TABLE deliverables ADD COLUMN visible_to_client_at TEXT;
`,
  },
  {
    // ONE SPELLING OF ONE INSTANT — so the text order IS the time order.
    //
    // `meetings.starts_at` is TEXT, SQLite compares TEXT byte by byte, and the
    // meetings list is ordered and PAGED by that column (MEETING_ORDER, and the keyset
    // cursor minted from the same value). That is only chronological while every
    // row is written the same way, and sixty-three were not: Google gives an
    // hour in the event's own offset — `2026-08-18T12:00:00+05:30` — and the
    // calendar sweep stored the string exactly as it arrived, beside every other
    // row's `…Z`. `+05:30` sorts as though the meeting were at noon when it is
    // at 06:30Z, so the day sheet interleaved: on staging a 15:30 review sorted
    // below everything after it. Not a display bug — the ORDER BY is wrong, so
    // page two of the meetings list starts somewhere page one did not stop.
    //
    // WHY THE DATA AND NOT THE QUERY. The alternative is to order by
    // `datetime(starts_at)` instead, and it is the wrong fix twice.
    // shared/workers/sorting.ts requires the ORDER BY expression and the cursor
    // key to be THE SAME VALUE (a keyset page is three things that must agree),
    // so changing one means changing the row-reader to match, in every sort menu
    // that touches a moment — and every future filter, comparison and index on
    // the column would still be reading the raw text. Normalising what is STORED
    // makes the property hold everywhere at once, including places nobody has
    // written yet. `utcMoment` in workers/content/src/lib/meetings.ts is the
    // other half: it keeps new rows in this shape.
    //
    // WHAT IS AND IS NOT TOUCHED. Only a value that carries a real offset — the
    // last six characters are `+HH:MM` or `-HH:MM`. A bare `2026-08-18` (an
    // all-day entry: a day, not an hour) ends `-08-18`, has no colon in that
    // position, and is left alone; it already sorts before every timed entry on
    // its own day, which is where it belongs. Anything already ending in `Z` is
    // untouched. `%f` rather than `%S` so the result is byte-identical to
    // JavaScript's `toISOString()`, which is what every other writer of this
    // column produces.
    //
    // NUMBERED 0041, NOT 0039. Two other lanes landed 0039 and 0040 on `main`
    // between this being written and being committed, and a duplicate version is
    // the one collision git will merge WITHOUT a conflict: two entries in one
    // array, both claiming the same name, and whichever the runner sees second
    // is silently skipped. The number is checked against `main` at commit time
    // for exactly that reason.
    //
    // NOTHING IS LOST AND IT CAN BE RE-RUN. `strftime` answers NULL for a value
    // it cannot read, and a NULL start time would delete the meeting from every
    // view keyed on it, so the guard keeps such a row exactly as it was. After
    // the run every converted value ends in `Z`, so the predicate matches
    // nothing on a second pass.
    version: "0041_meeting_moments_in_utc",
    sql: `
UPDATE meetings
   SET starts_at = strftime('%Y-%m-%dT%H:%M:%fZ', starts_at)
 WHERE starts_at IS NOT NULL
   AND substr(starts_at, -6, 1) IN ('+', '-')
   AND substr(starts_at, -3, 1) = ':'
   AND strftime('%Y-%m-%dT%H:%M:%fZ', starts_at) IS NOT NULL;

UPDATE meetings
   SET ends_at = strftime('%Y-%m-%dT%H:%M:%fZ', ends_at)
 WHERE ends_at IS NOT NULL
   AND substr(ends_at, -6, 1) IN ('+', '-')
   AND substr(ends_at, -3, 1) = ':'
   AND strftime('%Y-%m-%dT%H:%M:%fZ', ends_at) IS NOT NULL;
`,
  },
  {
    // ONE FACT, NOT TWO. An account was carrying its own free-text `status`
    // beside `deactivated_at`, and the two answered the same question: is this
    // account live? The flag is the half that is true — it is what the Archive
    // button writes, what the list filters on and what every child row survives.
    //
    // WHAT THE SECOND ANSWER COST, measured on the live data before this ran:
    // 24 companies held FOUR spellings of two ideas — `client` (13),
    // `past client` (6), `active` (4) and `active_client` (1, the raw token
    // somebody copied out of the form's own placeholder, because the field was
    // a pick-or-TYPE box). All 106 contacts said `active`, which is 106 rows
    // carrying no information and one word printed on every row of the list.
    // And not one of the 130 accounts had ever been archived, so the mechanism
    // that DOES answer the question had never been used.
    //
    // THE COLUMN STAYS. Dropping one is the migration you cannot take back
    // (0024 says the same about `address`), and the words a team typed are their
    // record of what they once thought. Nothing reads it: the row type, the
    // SELECT, the sort, the door's filter, create, update, the audit diff, the
    // CSV column, the two MCP tools and both detail screens all lost it in the
    // same commit. The same shape as `meetings.status`, retired before it.
    //
    // WHAT THIS DOES RUN is the half that would otherwise rot in front of a
    // person: the `Account status` dropdown group. It is CONFIG, not a customer
    // record, and left alone it would sit on the Dropdown values screen offering
    // to edit a vocabulary nothing consumes. Deactivated rather than deleted —
    // the same choice 0034 made for two retired ticket types — so the rows and
    // their history survive and the screen stops offering them.
    //
    // Re-runnable: the predicate excludes what it has already put away.
    version: "0042_account_status_retired",
    sql: `
UPDATE selectable_data
   SET deactivated_at = datetime('now'),
       deactivator_name = 'System'
 WHERE type = 'Account status'
   AND deactivated_at IS NULL;
`,
  },
  {
    // A COLOUR IS NOT A PICTURE OF A COLOUR.
    //
    // Twenty-four of the twenty-five `Color` rows in the brand library held a
    // LINK to a flat rectangle rendered by somebody else's website. Every other
    // category — Avatar, Graphic, Icon, Isotype, Kit, Logo, Presentation, 46
    // rows — is hosted here. Colour was the whole of the library's external
    // surface, and the hex was sitting in the URL the entire time.
    //
    // NINE OF THE TWENTY-FOUR WERE ON A TYPOSQUAT: `corhexa.com`, which is not
    // `colorhexa.com` and is not ours. A domain we do not control, named one
    // letter away from one we meant, returning bytes into the agency's own brand
    // library. Nothing rendered them as an image — a brand asset's `file_url` is
    // shown as TEXT today — so this was dormant rather than live. It would not
    // have stayed dormant: the collection row is getting a picture slot (the
    // library's `leading`, UI-GAPS #16), and `brand.list` carrying "the asset's
    // own file" is named in that entry as one of the four lists that gain one.
    // The fix lands before the thing that would have made it matter.
    //
    // The two hosts wrote two shapes — `…/FDE0F8.png` and `…/png/600x300/f4c600`
    // — and both end in the six hex digits, before an optional `.png`. So: strip
    // the extension, take six, and guard each character one at a time. SIX
    // SEPARATE SINGLE-CHARACTER GLOBS rather than one six-class pattern, because
    // D1 refuses that as "LIKE or GLOB pattern too complex" — the whole
    // statement fails and the migration dies, which is a worse outcome than any
    // colour. A row that does not match keeps its URL and is converted by
    // nobody: losing a link is cheap, inventing a colour is not.
    //
    // `file_url` is CLEARED on the rows that convert. The link is what the fix is
    // about; leaving it would leave the typosquat in the database, one query away
    // from whatever reads `file_url` next.
    //
    // Re-runnable: `color_hex IS NULL` excludes everything a previous pass did.
    version: "0043_a_colour_is_not_a_picture",
    sql: `
ALTER TABLE brand_assets ADD COLUMN color_hex TEXT;

UPDATE brand_assets
   SET color_hex = '#' || upper(substr(
         CASE WHEN lower(file_url) LIKE '%.png'
              THEN substr(file_url, 1, length(file_url) - 4)
              ELSE file_url END, -6)),
       file_url = NULL
 WHERE category = 'Color'
   AND color_hex IS NULL
   AND file_url IS NOT NULL
   AND (file_url LIKE '%colorhexa.com/%' OR file_url LIKE '%corhexa.com/%')
   AND substr(CASE WHEN lower(file_url) LIKE '%.png' THEN substr(file_url, 1, length(file_url) - 4) ELSE file_url END, -1, 1) GLOB '[0-9A-Fa-f]'
   AND substr(CASE WHEN lower(file_url) LIKE '%.png' THEN substr(file_url, 1, length(file_url) - 4) ELSE file_url END, -2, 1) GLOB '[0-9A-Fa-f]'
   AND substr(CASE WHEN lower(file_url) LIKE '%.png' THEN substr(file_url, 1, length(file_url) - 4) ELSE file_url END, -3, 1) GLOB '[0-9A-Fa-f]'
   AND substr(CASE WHEN lower(file_url) LIKE '%.png' THEN substr(file_url, 1, length(file_url) - 4) ELSE file_url END, -4, 1) GLOB '[0-9A-Fa-f]'
   AND substr(CASE WHEN lower(file_url) LIKE '%.png' THEN substr(file_url, 1, length(file_url) - 4) ELSE file_url END, -5, 1) GLOB '[0-9A-Fa-f]'
   AND substr(CASE WHEN lower(file_url) LIKE '%.png' THEN substr(file_url, 1, length(file_url) - 4) ELSE file_url END, -6, 1) GLOB '[0-9A-Fa-f]';
`,
  },
  {
    // A SPRINT'S STATE HAD NO GLYPH, because it had no vocabulary row to hang
    // one on. Ticket status and Story status have been `"labels"` groups since
    // they shipped — the code owns the state, the dropdown row owns the word a
    // person reads and the mark beside it — and a sprint's three states were the
    // one set that skipped the pattern and stayed bare words on screen.
    //
    // They are DERIVED, not stored: `sprintState()` reads the dates. So these
    // rows can never move a sprint, and the words are exactly the three
    // `STATE_HEADING` already renders, which is what lets the screen look the
    // mark up by the word it is already showing.
    //
    // Also the two ticket types that shipped without a glyph. Only where the
    // mark is still NULL, so a team that has already chosen its own keeps it.
    //
    // THE GLYPH IS A TWO-LETTER CODE, not a pictograph — the client's ruling,
    // 2026-08-31: "i said no emojis. why are there still emojis? kill them!"
    // Same substitution as 0034 above.
    //
    // Re-runnable: every statement is guarded on the row being absent or unset.
    version: "0044_a_sprint_state_has_a_face",
    sql: `
INSERT INTO selectable_data (id, type, value, is_default, mark, created_at, creator_name)
SELECT lower(hex(randomblob(16))), 'Sprint status', v.value, 1, v.mark, datetime('now'), 'kwapso'
  FROM (SELECT 'Running now' AS value, 'RN' AS mark
        UNION ALL SELECT 'Coming up', 'CU'
        UNION ALL SELECT 'Wrapped', 'WR') v
 WHERE NOT EXISTS (
   SELECT 1 FROM selectable_data s WHERE s.type = 'Sprint status' AND s.value = v.value
 );

UPDATE selectable_data SET mark = 'EX' WHERE type = 'Ticket type' AND value = 'Extra' AND mark IS NULL;
UPDATE selectable_data SET mark = 'RM' WHERE type = 'Ticket type' AND value = 'Requirements' AND mark IS NULL;
`,
  },
  {
    // A STORY GOES FOR REVIEW WITH SOMETHING TO LOOK AT.
    //
    // The owner's ruling, 19 Aug 2026: "An explanation text plus one or more
    // files or images are required to send a story for review." That REVERSES a
    // recorded decision of Aurora's — the file was deliberately optional,
    // because "a required upload on work with nothing to show is a rule people
    // satisfy with a blank image", and that reasoning is still worth knowing.
    // The owner overruled it knowing so; the docstrings that argued the other
    // way have been rewritten rather than left contradicting the code.
    //
    // The story carried ONE typed-in link (`review_file_url`, `review_file_name`
    // from 0028) and no way to attach anything. This is `help_attachments` one
    // table along, same shape and same reasons: one table for files AND links
    // because "here is the thing I mean" is one act; `kind` decides only how
    // `url` is read; the shared MEDIA bucket because both gateways serve it;
    // deactivate, never delete.
    //
    // The old two columns stay. They hold real links on real stories, and a
    // migration that dropped them would lose the proof somebody already gave.
    version: "0045_a_story_shows_its_work",
    sql: `
CREATE TABLE IF NOT EXISTS story_attachments (
  id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL REFERENCES stories (id),
  kind TEXT NOT NULL CHECK (kind IN ('file', 'link')),
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  content_type TEXT,
  size_bytes INTEGER,
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT,
  deactivated_at TEXT, deactivator_id TEXT, deactivator_email TEXT, deactivator_name TEXT
);
CREATE INDEX IF NOT EXISTS idx_story_attachments_story ON story_attachments (story_id);

-- THE LINK ALREADY GIVEN BECOMES AN ATTACHMENT, so a story that satisfied the
-- old rule still satisfies the new one and nobody is asked to re-upload proof
-- they already provided. Re-runnable: the NOT EXISTS excludes anything a
-- previous pass carried over.
INSERT INTO story_attachments (id, story_id, kind, label, url, created_at, creator_name)
SELECT lower(hex(randomblob(16))), s.id, 'link',
       COALESCE(NULLIF(TRIM(s.review_file_name), ''), 'What was shown'),
       s.review_file_url, COALESCE(s.updated_at, s.created_at), 'kwapso'
  FROM stories s
 WHERE s.review_file_url IS NOT NULL AND TRIM(s.review_file_url) <> ''
   AND NOT EXISTS (
     SELECT 1 FROM story_attachments a WHERE a.story_id = s.id AND a.url = s.review_file_url
   );
`,
  },
  {
    // THE SAME MEETING, FILED TWICE, 250 TIMES OVER.
    //
    // Two lanes write knowledge sources about the same conversation and neither
    // knew about the other. The meetings sweep files a meeting — title, purpose,
    // who was there, the transcript when there is one, averaging 431 characters.
    // The calendar sweep files the same Google event straight off the calendar: a
    // title and a date, averaging THIRTY-FOUR.
    //
    // Measured on the owner's staging base on 20 Aug 2026: 251 calendar entries
    // in the knowledge base and 250 of them the same event as a meeting row,
    // matched on Google's own event id. "Week Planning" 108 times. "Pickleball"
    // 99. An eighth of the whole base was a thinner copy of something already in
    // it — and not merely wasted: retrieval hands back the passages that match,
    // so a hundred near-identical thirty-four-character titles compete for room
    // with the passages that could answer the question. Asked to summarise the
    // Team Assembly meeting, the assistant returned SIX citations and all six
    // were the same calendar entry.
    //
    // WHY A MIGRATION AND NOT THE SWEEP. `readGoogleMaterial` stopped PRODUCING
    // these the same day, so nothing new is filed. But retirement asks Google
    // "is this event still there?" — and it is, so the existing 250 would have
    // stayed for ever. They are not gone from Google; they are no longer
    // something this app should hold a second copy of, which is a decision, not
    // a discovery, and a decision belongs here.
    //
    // DEACTIVATED, NEVER DELETED, like everything else. The chunks DO go, because
    // a chunk is what an answer is built from and leaving them would leave the
    // duplicates quotable while claiming they were retired.
    version: "0046_one_meeting_one_source",
    sql: `
DELETE FROM knowledge_chunks WHERE source_id IN (
  SELECT s.id FROM knowledge_sources s
   WHERE s.kind = 'event' AND s.deactivated_at IS NULL
     AND EXISTS (SELECT 1 FROM meetings m
                  WHERE m.google_event_id IS NOT NULL AND m.google_event_id <> ''
                    AND s.origin_row_id LIKE '%:' || m.google_event_id)
);
UPDATE knowledge_sources
   SET deactivated_at = datetime('now'),
       deactivator_name = 'Automatic clean-up'
 WHERE kind = 'event' AND deactivated_at IS NULL
   AND EXISTS (SELECT 1 FROM meetings m
                WHERE m.google_event_id IS NOT NULL AND m.google_event_id <> ''
                  AND origin_row_id LIKE '%:' || m.google_event_id);
`,
  },
  {
    // A TABLE THAT WAS RECORDED AS CREATED AND WAS NOT THERE.
    //
    // Found on 20 Aug 2026 in the error log, not by anybody using the app:
    // `GET /api/tenancy/config/screens` failing 25 times in six hours with "no
    // such table: screens". The owner's team database was missing it. Every
    // OTHER team database has it, `0002_screens` is recorded as applied on his,
    // and nothing in this file ever drops it — so it was lost by hand, in a
    // project where migrations are applied by hand because the maintenance key
    // has never been set.
    //
    // WHY A NEW MIGRATION RATHER THAN EDITING 0002. A migration already recorded
    // as applied will never run again, so correcting 0002 would fix nothing on
    // the database that needs it. This one is written to be harmless where the
    // table exists (which is everywhere else) and curative where it does not.
    //
    // IT IS AN OVERRIDES TABLE, so empty is not a loss — it is the default. A
    // row here replaces one screen's recipe for one team; no rows means every
    // team screen comes from app code, which is what all of them do today.
    version: "0047_screens_exists",
    sql: `
CREATE TABLE IF NOT EXISTS screens (
  module TEXT PRIMARY KEY,
  recipe TEXT NOT NULL,
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT,
  updated_at TEXT, editor_id TEXT, editor_email TEXT, editor_name TEXT
);
`,
  },
  {
    // ── A MODULE: THE SECTION OF AN APP A TICKET IS ABOUT ────────────────────
    //
    // WHY IT COMES BACK. It was deferred on 12 Aug 2026 with the note "the base
    // has no module noun — an app's stories carry the module NAME in their
    // detail instead, which is where staff already look for it". That reasoning
    // did not survive contact: `stories` has `process_id` and `step_key` and no
    // module column, so the name was only ever typed into free prose, and
    // TICKETS — the thing people actually file all day — got nothing at all.
    // The designer's report on 19 Aug 2026 was that she could not organise the
    // tickets she was creating, which is precisely the hole that leaves.
    //
    // THE LEGACY DATA SETTLES WHAT IT IS. 246 rows across 24 apps, median 11 per
    // app: Einstellungen, Team, Dokumente, Aufgaben, Onboarding. They are the
    // SECTIONS OF THE DELIVERED APP. And 1,727 of 1,820 real tickets — 94% —
    // carried one over two years, which is why the field is required at creation
    // rather than hopefully filled in later.
    //
    // ── WHY A TABLE AND NOT A DROPDOWN GROUP ────────────────────────────────
    //
    // The owner's first instinct was `selectable_data`, to get a rename, an
    // emoji and a translation without a bespoke admin screen. Those are the
    // right things to want and this table carries every one of them. What it
    // does not do is flatten: 160 of the 246 names are DISTINCT and 124 belong
    // to exactly ONE app, so a team-wide vocabulary offers 160 options on a
    // ticket where 11 apply. Scoping `selectable_data` instead would have made
    // one group app-aware in a seam built to be uniform — `VOCABULARY_HOMES`
    // rewrites records on rename by (table, column) with no notion of a scope,
    // and `(type, value)` would stop identifying a row.
    //
    // ── AND WHY A TICKET STORES THE ID, NOT THE WORD ────────────────────────
    //
    // Every existing vocabulary stores the WORD on the record, because the word
    // is what the door filters by, what the CSV carries and what four MCP tools
    // take as an argument (selectable-homes.ts argues it at length). A module
    // has none of those contracts yet, so it can afford the tidier model the
    // note there calls out of reach: the id is the join, and a rename is then a
    // lookup that reaches every ticket for free — no rewrite script, and no
    // app-aware special case in one.
    //
    // SHAPED LIKE `processes`, deliberately: same parent, same denormalised
    // `account_id`, same audit block, same deactivate-never-delete. A reader who
    // knows one knows this. `mark` and `name_de` mirror `selectable_data`'s own
    // enrichment columns so the editing affordances are identical.
    //
    // The unique index is on ACTIVE rows only: two apps may both have a
    // "Settings", one app may not, and a deactivated name can be reused.
    version: "0048_app_modules",
    sql: `
CREATE TABLE app_modules (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL REFERENCES apps (id),
  account_id TEXT REFERENCES accounts (id),
  name TEXT NOT NULL,
  mark TEXT,
  name_de TEXT,
  description TEXT,
  benefit TEXT,
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT,
  updated_at TEXT, editor_id TEXT, editor_email TEXT, editor_name TEXT,
  deactivated_at TEXT, deactivator_id TEXT, deactivator_email TEXT, deactivator_name TEXT
);
CREATE INDEX idx_app_modules_app ON app_modules (app_id);
CREATE INDEX idx_app_modules_account ON app_modules (account_id);
CREATE UNIQUE INDEX idx_app_modules_name ON app_modules (app_id, name) WHERE deactivated_at IS NULL;

ALTER TABLE help ADD COLUMN module_id TEXT REFERENCES app_modules (id);
CREATE INDEX idx_help_module ON help (module_id);
`,
  },
  {
    // ── WHO users/1001836… IS, REMEMBERED ────────────────────────────────────
    //
    // THE OWNER, 20 Aug 2026: "make sure that we always have the sender names
    // because it keeps saying somebody in this space."
    //
    // EVERY ROUTE GOOGLE OFFERS WAS TRIED AND MEASURED, and the results are why
    // this table exists rather than another API call:
    //
    //   • `messages.list` populates `displayName` for an APP and leaves it EMPTY
    //     for every human.
    //   • `spaces.members.list`, with `chat.memberships.readonly` granted and
    //     re-approved, answers {"name":"users/100183…","type":"HUMAN"} — the
    //     roster, with no names on it. There is no Chat scope that returns one.
    //   • People API `people:batchGet` answers for the caller and their own
    //     contacts, and for nobody else.
    //   • `people.listDirectoryPeople` returns {} unless domain-wide contact
    //     sharing is switched on for the whole Workspace — an organisation-wide
    //     privacy setting, which is a far larger thing to change than a
    //     knowledge base deserves.
    //
    // ONE ROUTE WORKS, and it is the conversation itself. When somebody writes
    // "@Ishita Goyal", Google attaches an annotation carrying that person's
    // resource id AND the character range of their name in the message text —
    // the exact pair every endpoint above withheld.
    //
    // IT WAS BEING LEARNED AND THROWN AWAY. The join happened per page of
    // messages and the map died with the request, so a name was known only while
    // a mention happened to be in the same fifty messages. That is why the
    // owner kept seeing "Somebody in this space" beside people the app had
    // already identified minutes earlier.
    //
    // So it is remembered. Learned once, from any space, and applied everywhere
    // afterwards — which is also what makes the coverage go UP over time instead
    // of depending on what is in the current page. A row is a fact Google gave
    // us about a person, never a guess: nothing writes here without both halves
    // arriving together.
    version: "0049_chat_people",
    sql: `
CREATE TABLE chat_people (
  user_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  learned_at TEXT NOT NULL,
  learned_from TEXT
);
`,
  },
  {
    // ── THREE PERMISSION MODULES THAT DECIDED NOTHING ───────────────────────
    //
    // The owner opened the Roles screen and asked what all of it was for. The
    // honest answer was that some of it was for nothing.
    //
    // `learning` and `marketing` were PURGED FROM THE PRODUCT on 17 Aug 2026 —
    // tables, routes, screens, tools, nav, glossary, the CREATE TABLE in their
    // own migrations. What nobody removed was their permission rows, because
    // migration 0021 had CROSS JOINed `marketing` onto every role that existed
    // and a purge deletes forward, not backward. Six roles × two modules = 12
    // rows in staging, gating nothing and rendering nowhere (they are not in
    // TEAM_MODULES, so the screen never drew them).
    //
    // `screens` is the other kind of dead. It IS in TEAM_MODULES, it DOES draw
    // four boxes on the Roles screen, and not one door has ever asked for it:
    // `getScreen` and `postScreen` both gate on `teams:edit`, which is the
    // right answer — a screen recipe is a team setting. So the row offered four
    // grants that decided nothing, and the file defining the modules documents
    // every OTHER inert switch and said nothing about this one. Removed from
    // TEAM_MODULES in the same commit; this deletes the rows behind it.
    //
    // THE `screens` TABLE ITSELF STAYS. 0047 exists precisely because it went
    // missing once. The recipe store is real and is reached through `teams:edit`.
    //
    // DELETE, NOT DEACTIVATE. The base's rule protects records a person made
    // and an audit may need; a permission row for a module that does not exist
    // is neither. `role_permissions` has no deactivated_at, and leaving these
    // would mean the next reader has to re-derive what we just derived.
    version: "0050_no_permission_without_a_door",
    sql: `
DELETE FROM role_permissions WHERE module IN ('learning', 'marketing', 'screens');
`,
  },
  {
    // A VERSION IS CUT BY HAND, AND ONLY BY HAND (owner, 24 Aug 2026).
    //
    // The plan said a completing sprint cut one automatically and called it
    // confirmed. Round two of the audit-module questions settled the opposite —
    // hand editing only — and the owner ruled the older decision purged rather
    // than switched off.
    //
    // IT WAS NEVER SWITCHED ON. `cutVersion` took an optional `sprintId`, the
    // route parsed one, the column held one and the index enforced it, and not a
    // single caller in the app ever sent one: the only code that did was tests.
    // So nobody has ever had a version cut for them, and this removes a promise
    // rather than a behaviour.
    //
    // R17 IS UNAFFECTED, and it is worth being exact about why rather than
    // assuming. The sprint index was described as the idempotence guard for a
    // write that is an INSERT rather than an UPDATE. It was never the only one:
    // `idx_process_versions_no` on (process_id, version_no) has sat beside it
    // since the table was written, and THAT is the one that actually stops a
    // double press. Two quick presses both read version N and both try to insert
    // N+1; the loser hits that constraint, and `cutVersion` already reads a
    // duplicate as "already cut" — a 200, no activity row, no ping.
    //
    // So this drops a promise and a dead index, and takes no protection with it.
    //
    // THE COLUMN STAYS, inert. This codebase has never dropped one, and the first
    // time it does should be a decision of its own rather than a side effect of
    // tidying. Nothing reads it and nothing writes it any more.
    version: "0051_a_version_is_cut_by_hand",
    sql: `
DROP INDEX IF EXISTS idx_process_versions_sprint;
`,
  },
  {
    // WHO DOES THE WORK, AND WHAT IT COSTS THEM — the client's own organisation,
    // which is the half of a process map that has never been written down.
    //
    // A step already knows what it IS and how long it takes. It has never known
    // WHO does it, beyond \`processes.role_name\`: one free-typed word on the
    // whole map, so "Dispatch clerk" and "dispatch clerk" were two roles, a role
    // could not span two maps, and nothing could say what an hour of it costs.
    // That last one is why this matters — the savings figure is minutes saved
    // TIMES the cost of the person who was spending them, and without a cost per
    // role there is no money in it at all, only hours.
    //
    // THEIRS, NOT OURS, AND THE DISTINCTION IS THE WHOLE POINT (R24). The agency
    // already has three things that look like a rate: what our hour costs us
    // (\`internal_rates\`), what one of OUR roles costs us (\`internal_role_rates\`)
    // and what we charge a client (\`account_rates\`). None of them is this. This
    // is what a CLIENT'S OWN staff member costs the CLIENT, it belongs to that
    // client, and it is the only one of the four a client may ever read — which
    // is exactly why it gets its own tables rather than a flag on an existing
    // one. BUILD-3 says it in one line: two things that both look like "a rate"
    // are kept apart in the schema, not just in the UI.
    //
    // A PERSON IS A CONTACT YOU ALREADY HAVE. There is no new person table here
    // and there must not be: the customer spine already holds every company and
    // every person as an \`accounts\` row, linked through \`account_links\`. A new
    // one would be a second address book to keep in step with the first. So
    // \`client_role_people\` joins a role to the person's own account row.
    //
    // FOUR JOINS, BECAUSE BOTH SIDES ARE MANY (owner + Aurora, round two): one
    // role can sit in several departments — a smaller company runs that way —
    // and one person can hold several roles.
    //
    // A ROLE MAY HAVE NO COST YET (Aurora's answer, round two). You map a process
    // in the room with the client, before anybody has looked up what anyone is
    // paid; refusing to save the role would stop the session that the whole
    // module exists to support. \`cents_per_hour\` is NULL until somebody knows,
    // and the saving reads as incomplete rather than as zero.
    version: "0052_the_client_organisation",
    sql: `
CREATE TABLE client_departments (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts (id),
  name TEXT NOT NULL,
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT,
  updated_at TEXT, editor_id TEXT, editor_email TEXT, editor_name TEXT,
  deactivated_at TEXT, deactivator_id TEXT, deactivator_email TEXT, deactivator_name TEXT
);
CREATE INDEX idx_client_departments_account ON client_departments (account_id);
-- One name per client, while it is live. Retiring and re-adding is allowed.
CREATE UNIQUE INDEX idx_client_departments_name
  ON client_departments (account_id, name) WHERE deactivated_at IS NULL;

CREATE TABLE client_roles (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts (id),
  name TEXT NOT NULL,
  -- What an hour of this role costs the CLIENT. NULL = not known yet, which is a
  -- real answer and not a zero: a saving computed from it reads as incomplete.
  cents_per_hour INTEGER CHECK (cents_per_hour IS NULL OR cents_per_hour >= 0),
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT,
  updated_at TEXT, editor_id TEXT, editor_email TEXT, editor_name TEXT,
  deactivated_at TEXT, deactivator_id TEXT, deactivator_email TEXT, deactivator_name TEXT
);
CREATE INDEX idx_client_roles_account ON client_roles (account_id);
CREATE UNIQUE INDEX idx_client_roles_name
  ON client_roles (account_id, name) WHERE deactivated_at IS NULL;

CREATE TABLE client_role_departments (
  id TEXT PRIMARY KEY,
  role_id TEXT NOT NULL REFERENCES client_roles (id),
  department_id TEXT NOT NULL REFERENCES client_departments (id),
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT
);
CREATE UNIQUE INDEX idx_client_role_departments_pair
  ON client_role_departments (role_id, department_id);
CREATE INDEX idx_client_role_departments_dept ON client_role_departments (department_id);

CREATE TABLE client_role_people (
  id TEXT PRIMARY KEY,
  role_id TEXT NOT NULL REFERENCES client_roles (id),
  -- The person's OWN accounts row, the same one the contacts list shows.
  person_account_id TEXT NOT NULL REFERENCES accounts (id),
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT
);
CREATE UNIQUE INDEX idx_client_role_people_pair
  ON client_role_people (role_id, person_account_id);
CREATE INDEX idx_client_role_people_person ON client_role_people (person_account_id);

-- A TOOL is anything a step uses, digital or physical, with an optional cost
-- (SCOPE ch.02). Four fields and no more — Aurora's ruling in round two, and
-- Alaap deferred to it: "keep it to name, cost, billing period and icon; the
-- rest is clutter on the form".
--
-- ITS PRICE IS DATED, like a role's cost and unlike the first draft of this.
-- \`client_tool_prices\` is what a map set to March reads, so a tool that cost
-- EUR 240 then and EUR 300 now does not rewrite March's arithmetic. The tool row
-- carries no price at all, which is what stops the two ever disagreeing.
CREATE TABLE client_tools (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts (id),
  name TEXT NOT NULL,
  mark TEXT,
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT,
  updated_at TEXT, editor_id TEXT, editor_email TEXT, editor_name TEXT,
  deactivated_at TEXT, deactivator_id TEXT, deactivator_email TEXT, deactivator_name TEXT
);
CREATE INDEX idx_client_tools_account ON client_tools (account_id);
CREATE UNIQUE INDEX idx_client_tools_name
  ON client_tools (account_id, name) WHERE deactivated_at IS NULL;

CREATE TABLE client_tool_prices (
  id TEXT PRIMARY KEY,
  tool_id TEXT NOT NULL REFERENCES client_tools (id),
  -- SET ONCE, AND THAT IS THE WHOLE POINT OF THE TABLE (see client_tools above).
  -- A price is DATED: a tool that cost EUR 240 in March and EUR 300 now must not
  -- rewrite March's arithmetic, so a new price is a NEW ROW with a later
  -- \`effective_on\`, never an edit to this one. Editing \`cents\` in place would
  -- silently restate every map already drawn against it.
  cents INTEGER NOT NULL CHECK (cents >= 0),
  billing_period TEXT NOT NULL CHECK (billing_period IN ('month', 'year')),
  -- The day this price started being true. A map set to a date reads the newest
  -- row on or before it.
  effective_on TEXT NOT NULL,
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT
);
CREATE UNIQUE INDEX idx_client_tool_prices_on
  ON client_tool_prices (tool_id, effective_on);

-- EVERY ROLE SOMEBODY ALREADY TYPED becomes a record, with no department yet
-- (the owner, 24 Aug 2026: "make them real records"). The word is kept exactly
-- as it was written, minus surrounding space, so nothing is lost and nobody has
-- to remember what a map used to say. Cost unknown, because it always was.
--
-- Only maps that HAVE an account: a role belongs to a client, and a map with no
-- client has nobody to own one. Those keep their typed word until somebody files
-- the map under a client.
INSERT INTO client_roles (id, account_id, name, cents_per_hour, created_at, creator_name)
SELECT lower(hex(randomblob(16))), p.account_id, p.role_name, NULL,
       strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'Carried over'
  FROM (
        -- DISTINCT ON THE TRIMMED WORD, and this is the whole correctness of it.
        -- Distincting on the raw column makes "Dispatch clerk" and
        -- "  Dispatch clerk  " two rows, which then TRIM to the same name and
        -- collide on the unique index -- and because both are inserted by ONE
        -- statement, the NOT EXISTS below cannot see the first while writing the
        -- second. The whole migration would throw and roll back, on real data,
        -- the first time anybody had ever left a stray space in that box.
        SELECT DISTINCT account_id, TRIM(role_name) AS role_name FROM processes
         WHERE role_name IS NOT NULL AND TRIM(role_name) <> '' AND account_id IS NOT NULL
       ) p
 WHERE NOT EXISTS (
   SELECT 1 FROM client_roles r
    WHERE r.account_id = p.account_id AND r.name = p.role_name
 );

-- …and the map points at the record instead of repeating the word. The old
-- column stays and stops being read, for the reason every other retired column
-- stays: this codebase does not drop them.
ALTER TABLE processes ADD COLUMN role_id TEXT REFERENCES client_roles (id);
UPDATE processes
   SET role_id = (SELECT r.id FROM client_roles r
                   WHERE r.account_id = processes.account_id
                     AND r.name = TRIM(processes.role_name))
 WHERE role_name IS NOT NULL AND TRIM(role_name) <> '' AND account_id IS NOT NULL;
CREATE INDEX idx_processes_role ON processes (role_id);
`,
  },
  {
    // WHERE MINUTES MEET AN HOURLY COST — a STEP names who does it and what they
    // do it in.
    //
    // 0052 gave a whole MAP one role. That was already an improvement on a
    // free-typed word, and it is still the wrong altitude: a real process is
    // handed between people. "Recording a damage case" is a clerk taking the
    // call, an adjuster assessing it and a bookkeeper paying it — three roles at
    // three different hourly costs inside one map. Priced at the map's single
    // role, the saving is wrong by whatever the mix is, and wrong in a direction
    // nobody can see. So the role moves onto the step, which is the row that
    // already carries the minutes.
    //
    // \`processes.role_id\` STAYS, and is not now redundant: it is the DEFAULT a
    // new step starts from, and the answer for a map nobody has broken down yet.
    // The step's own role wins when it has one.
    //
    // ONE ROLE, MANY TOOLS, and the asymmetry is the real shape rather than an
    // omission. A step is done BY somebody — one person's hour is what the
    // arithmetic multiplies, and two would mean two steps. A step is done IN
    // whatever it takes: open the spreadsheet, copy it into the portal, send the
    // email. Both sides of that second one are many, which is the same test
    // 0052's four joins were built on.
    //
    // THE JOIN HANGS OFF (version_id, step_key), NOT off the step's id, and that
    // is load-bearing. Cutting a version copies every step forward as a NEW row
    // with a new id and the SAME key — the key is what makes "this step, one
    // version later" a subtraction rather than a name match (see cutVersion). A
    // join keyed on the id would need every new id mapped back to the old one to
    // travel; keyed on the pair, it travels in one INSERT … SELECT, and version 1
    // goes on saying which tools version 1 used.
    version: "0053_a_step_names_its_role_and_its_tools",
    sql: `
ALTER TABLE process_steps ADD COLUMN client_role_id TEXT REFERENCES client_roles (id);
CREATE INDEX idx_process_steps_role ON process_steps (client_role_id);

CREATE TABLE process_step_tools (
  id TEXT PRIMARY KEY,
  -- The step, by the pair that survives a cut. There is no FK on the pair
  -- because SQLite wants a composite one and the unique index it would point at
  -- is already there; the fence and the reads both join through it.
  version_id TEXT NOT NULL REFERENCES process_versions (id),
  step_key TEXT NOT NULL,
  tool_id TEXT NOT NULL REFERENCES client_tools (id),
  -- Carried so the account fence can be applied to THIS row rather than only to
  -- the step it hangs off, the same reason process_steps carries one.
  account_id TEXT REFERENCES accounts (id),
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT
);
-- A tool is on a step once. Naming it twice is the same sentence, not two.
CREATE UNIQUE INDEX idx_process_step_tools_triple
  ON process_step_tools (version_id, step_key, tool_id);
CREATE INDEX idx_process_step_tools_tool ON process_step_tools (tool_id);
CREATE INDEX idx_process_step_tools_step ON process_step_tools (version_id, step_key);

-- EVERY EXISTING STEP INHERITS ITS MAP'S ROLE, so nothing that already had an
-- answer loses it. A map with no role leaves its steps NULL, which reads as "not
-- said yet" and prices as hours with no money beside them — the same honest
-- incompleteness 0052 chose for a role with no cost.
UPDATE process_steps
   SET client_role_id = (SELECT p.role_id FROM processes p WHERE p.id = process_steps.process_id)
 WHERE client_role_id IS NULL;
`,
  },
  {
    // THE AUDIT MODULE, FINISHED — every ruling from round two of the
    // questionnaire, in one migration because they are one shape.
    //
    // ── ONE TOOL PER STEP, not several. 0053 built a joining table because both
    // sides looked many. Both respondents had already answered otherwise, and
    // Aurora's reason is better than the shape I chose: "if it's multiple tools —
    // it's multiple steps". A step done in two systems has a handoff in the
    // middle of it, and the handoff is the thing a process map exists to show. So
    // the tool comes onto the step row. `process_step_tools` STAYS on disk with
    // nothing reading it, which is this codebase's rule for a retired structure;
    // its rows are carried across first so nothing is lost.
    //
    // ── HOW OFTEN, IN THE PERIOD THE PERSON SAYS IT IN. "Twice a day" and "forty
    // times a month" are the same fact, and asking somebody to convert it in
    // their head at the moment they are describing their own job is how a wrong
    // number gets typed. Stored as the pair (count, period); everything downstream
    // converts to months, which is where the arithmetic lives.
    //
    // ── THE COST IS FROZEN ONTO THE STEP. The owner, and this is the architecture
    // half of the tie-breaker: "even if the cost changes, they have to be retained
    // as they were at the time we recorded them". A saving computed from today's
    // rate would silently rewrite last year's agreed figure the day somebody gave
    // a payroll rise — the client's own number changing because of something the
    // client did, with nothing on screen to say so. `role_cents_per_hour` is
    // copied at write time and never recomputed.
    //
    // ── THE SHAPE OF A PROCESS, in three columns and no graph table. The owner's
    // own proposal: two nodes at the SAME position are a fork, and the branches
    // rejoin where a single node appears again. `branch_label` is the word on the
    // fork ("if rejected"), and `loops_back_to` is the arrow home — "feedback
    // loops are real. We need to find a way to include them." A graph table would
    // hold the same three facts and cost a join on every read.
    //
    // ── THE AUDIT DATE is what a saving is measured FROM (Aurora's ruling): one
    // date per map, Alex's visit, not "version 1". Versions stay, as NAMED
    // BOOKMARKS on the timeline — "Version 2, After CONFIA" is a readable name for
    // a moment — while the dated revisions below are what the arithmetic reads.
    //
    // ── REVISIONS. The map as it was on any day. One row per (step, date), so the
    // map "as of D" is the newest revision on or before D for each step key. The
    // existing versions are CONVERTED into revisions using each version's own
    // date, which is exactly what the owner asked for; a map with no versions
    // still gets one revision per step, dated at the map's own creation.
    //
    // ── LINKS. "Many times the last step of a process is the first step — or
    // connected to — another process." Loose, by ruling: naming a link changes no
    // duration, no frequency and no saving on either side.
    //
    // ── WAVES. What a client bought. No price column and no reference to our own
    // rates, because the owner ruled the internal money out of this module's first
    // version four separate times.
    //
    // ── DRAFTS. What the extraction produces and a person approves. It is NOT the
    // record: "Nothing — the draft is not the record" was the comprehension check
    // both respondents passed, and this table is why that sentence is true.
    version: "0054_the_audit_module_finished",
    sql: `
-- ── one tool, on the step ────────────────────────────────────────────────────
ALTER TABLE process_steps ADD COLUMN client_tool_id TEXT REFERENCES client_tools (id);
CREATE INDEX idx_process_steps_tool ON process_steps (client_tool_id);
UPDATE process_steps
   SET client_tool_id = (
     SELECT st.tool_id FROM process_step_tools st
      WHERE st.version_id = process_steps.version_id
        AND st.step_key = process_steps.step_key
      ORDER BY st.created_at ASC LIMIT 1)
 WHERE client_tool_id IS NULL;

-- ── how often, in the period somebody actually says it in ────────────────────
ALTER TABLE process_steps ADD COLUMN frequency_period TEXT NOT NULL DEFAULT 'month'
  CHECK (frequency_period IN ('day', 'week', 'month', 'year'));

-- ── what an hour of that role cost WHEN THIS WAS RECORDED ────────────────────
ALTER TABLE process_steps ADD COLUMN role_cents_per_hour INTEGER
  CHECK (role_cents_per_hour IS NULL OR role_cents_per_hour >= 0);
UPDATE process_steps
   SET role_cents_per_hour = (SELECT r.cents_per_hour FROM client_roles r WHERE r.id = process_steps.client_role_id)
 WHERE client_role_id IS NOT NULL;

-- ── the shape: forks, the words on them, and the way back ────────────────────
ALTER TABLE process_steps ADD COLUMN branch_label TEXT;
ALTER TABLE process_steps ADD COLUMN loops_back_to TEXT;

-- ── the day the saving is measured from ──────────────────────────────────────
ALTER TABLE processes ADD COLUMN audit_date TEXT;
UPDATE processes SET audit_date = date(created_at) WHERE audit_date IS NULL;

-- ── the map, on any day ──────────────────────────────────────────────────────
CREATE TABLE process_step_revisions (
  id TEXT PRIMARY KEY,
  process_id TEXT NOT NULL REFERENCES processes (id),
  account_id TEXT REFERENCES accounts (id),
  -- THE SAME STEP ACROSS TIME. Not the step row's id, which is per version.
  step_key TEXT NOT NULL,
  -- The day this description of the step started being true.
  effective_on TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  seconds_per_run INTEGER NOT NULL DEFAULT 0 CHECK (seconds_per_run >= 0),
  runs_per_period INTEGER NOT NULL DEFAULT 0 CHECK (runs_per_period >= 0),
  frequency_period TEXT NOT NULL DEFAULT 'month'
    CHECK (frequency_period IN ('day', 'week', 'month', 'year')),
  client_role_id TEXT REFERENCES client_roles (id),
  -- Frozen. See the note above: a rate corrected in 2027 must not move a figure
  -- a client agreed in 2026.
  role_cents_per_hour INTEGER CHECK (role_cents_per_hour IS NULL OR role_cents_per_hour >= 0),
  client_tool_id TEXT REFERENCES client_tools (id),
  branch_label TEXT,
  loops_back_to TEXT,
  -- The work stopped happening on this date. Never a delete: a removed step is
  -- the largest saving there is, and deleting it would report none.
  removed INTEGER NOT NULL DEFAULT 0 CHECK (removed IN (0, 1)),
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT
);
-- One description of one step per day. Saying it twice on one day is a
-- correction, not a second revision.
CREATE UNIQUE INDEX idx_process_step_revisions_on
  ON process_step_revisions (process_id, step_key, effective_on);
CREATE INDEX idx_process_step_revisions_process ON process_step_revisions (process_id, effective_on);

-- EVERY EXISTING VERSION BECOMES A DATED REVISION, using that version's own date
-- — the owner's answer, word for word. A version cut on 3 March says what the
-- map looked like from 3 March, which is what a version always meant; this only
-- writes it down in the form the slider can read.
INSERT INTO process_step_revisions
  (id, process_id, account_id, step_key, effective_on, name, description, position,
   seconds_per_run, runs_per_period, frequency_period, client_role_id, role_cents_per_hour,
   client_tool_id, removed, created_at, creator_name)
SELECT lower(hex(randomblob(16))), s.process_id, s.account_id, s.step_key,
       date(v.created_at), s.name, s.description, s.position,
       s.seconds_per_run, s.runs_per_month, 'month', s.client_role_id, s.role_cents_per_hour,
       s.client_tool_id, CASE WHEN s.removed_at IS NULL THEN 0 ELSE 1 END,
       strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'Carried over'
  FROM process_steps s
  JOIN process_versions v ON v.id = s.version_id
 -- ONE ROW PER (STEP, DAY), AND THE LAST WORD WINS. Two versions cut on the SAME
 -- DAY both date to that day, so a plain insert collides on the unique index —
 -- and a NOT EXISTS guard cannot see rows the SAME statement is inserting, which
 -- is precisely the trap 0052's own carry-over comment was written about. It
 -- happened here on real data: 24 versions across 12 maps, several cut minutes
 -- apart while somebody was setting them up.
 --
 -- The HIGHEST version number for that day is the one kept, because that is what
 -- "the map as it was at the end of that day" means. Nothing is lost: an earlier
 -- cut on the same day described a state that was superseded before the day was
 -- out, and the slider's grain is a day.
 WHERE v.version_no = (
   SELECT MAX(v2.version_no)
     FROM process_steps s2
     JOIN process_versions v2 ON v2.id = s2.version_id
    WHERE s2.process_id = s.process_id
      AND s2.step_key = s.step_key
      AND date(v2.created_at) = date(v.created_at)
 )
 AND NOT EXISTS (
   SELECT 1 FROM process_step_revisions r
    WHERE r.process_id = s.process_id AND r.step_key = s.step_key
      AND r.effective_on = date(v.created_at)
 );

-- ── one map, connected to another ────────────────────────────────────────────
CREATE TABLE process_links (
  id TEXT PRIMARY KEY,
  account_id TEXT REFERENCES accounts (id),
  from_process_id TEXT NOT NULL REFERENCES processes (id),
  to_process_id TEXT NOT NULL REFERENCES processes (id),
  -- What the connection IS, in the team's own words ("hands over to").
  note TEXT,
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT
);
CREATE UNIQUE INDEX idx_process_links_pair ON process_links (from_process_id, to_process_id);
CREATE INDEX idx_process_links_to ON process_links (to_process_id);

-- ── what a client bought ─────────────────────────────────────────────────────
CREATE TABLE waves (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts (id),
  name TEXT NOT NULL,
  goal TEXT,
  -- Derived from the sprints in it, and STORED so a list does not recompute it
  -- per row. Recalculated whenever a sprint is added, moved or removed.
  starts_on TEXT,
  ends_on TEXT,
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT,
  updated_at TEXT, editor_id TEXT, editor_email TEXT, editor_name TEXT,
  deactivated_at TEXT, deactivator_id TEXT, deactivator_email TEXT, deactivator_name TEXT
);
CREATE INDEX idx_waves_account ON waves (account_id);
CREATE UNIQUE INDEX idx_waves_name ON waves (account_id, name) WHERE deactivated_at IS NULL;
ALTER TABLE sprints ADD COLUMN wave_id TEXT REFERENCES waves (id);
CREATE INDEX idx_sprints_wave ON sprints (wave_id);

-- ── what the extraction proposes, before anybody agrees to it ────────────────
CREATE TABLE process_drafts (
  id TEXT PRIMARY KEY,
  account_id TEXT REFERENCES accounts (id),
  app_id TEXT REFERENCES apps (id),
  -- The map it revises, or null when it proposes a new one.
  process_id TEXT REFERENCES processes (id),
  -- Where the words came from: a meeting we hold, or text somebody pasted.
  source_meeting_id TEXT,
  source_text TEXT,
  -- The proposal itself, as JSON. It is deliberately NOT normalised into the
  -- real tables: a draft that lived in process_steps would be indistinguishable
  -- from the record the moment anybody read it wrong, and "the draft is not the
  -- record" is the sentence this whole table exists to keep true.
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed', 'applied', 'discarded')),
  applied_at TEXT,
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT
);
CREATE INDEX idx_process_drafts_process ON process_drafts (process_id, status);
CREATE INDEX idx_process_drafts_account ON process_drafts (account_id, status);
`,
  },
  {
    // A TRANSCRIPT TRY THAT THROWS IS NOT A TRANSCRIPT THAT ISN'T THERE YET.
    // The autopilot retries a meeting every fifteen minutes until its horizon —
    // free when Google quietly has nothing, but a meeting Google REFUSES
    // (google_refused, forbidden) threw on every tick for as long as the
    // horizon runs: twelve stuck meetings put ~550 identical rows in the error
    // log in twelve hours. The counter records thrown attempts only; the sweep
    // stops selecting a meeting once it crosses the cap, and the manual button
    // on the meeting keeps working (it never reads the counter).
    version: "0055_transcript_gives_up",
    sql: `
ALTER TABLE meetings ADD COLUMN transcript_attempts INTEGER NOT NULL DEFAULT 0
  CHECK (transcript_attempts >= 0);
`,
  },
  {
    // ── A BRANCH THAT CARRIES ON ALONE ──────────────────────────────────────
    //
    // THE OWNER, 26 Aug 2026: "What if I want to add more steps under a branched
    // step? … under the split step, which says 'Schedule stories', I then want to
    // add step number four underneath it in the same split. I don't want it to be
    // a join step."
    //
    // The map's shape came from `position` alone, and that shape can say exactly
    // two things: steps sharing a position are a fork, and the column count going
    // back to one is the rejoin. It had no way to say "this arm continues and
    // that arm is finished", so a fourth step drew itself centred under both and
    // read as a join. The picture library has drawn branch CHAINS since it landed
    // (`FlowBranch.chain`); nothing here had a fact to feed it.
    //
    // `branch_of` is that fact and nothing more: the step_key of the branch HEAD
    // this step continues. Null on every ordinary step, which is nearly all of
    // them, so no row needs a back-fill and the old shape is unchanged.
    //
    // WHY THE HEAD'S KEY AND NOT THE STEP DIRECTLY ABOVE. Because a chain is
    // identified by the arm it belongs to, not by its neighbour: deleting the
    // middle step of a three-step arm must leave the third one still in that arm,
    // and a pointer to its predecessor would leave it pointing at nothing.
    // BOTH TABLES, because the dated map is drawn from the revisions and not
    // from the live rows: without it, asking what the map looked like in June
    // would show June's times on today's shape — and an arm that carried on
    // would silently become a join every time somebody looked backwards.
    version: "0056_a_branch_carries_on",
    sql: `
ALTER TABLE process_steps ADD COLUMN branch_of TEXT;
ALTER TABLE process_step_revisions ADD COLUMN branch_of TEXT;
`,
  },
  {
    // ── ONE CONTROL WHERE THERE WERE TWO ────────────────────────────────────
    //
    // THE OWNER, 26 Aug 2026: "If I switch pages after I hit the Sync button…
    // the button just shows me 'Bring it in' again. That means there is a high
    // possibility that people would launch two simultaneous syncs." Then, once
    // the per-tab fix (`shared/web/running-jobs.ts`) landed: "would be nice if
    // this could also persist across the same user's multiple sessions on
    // different devices and different pages… never should there be 2 of the
    // same syncs running simultaneously."
    //
    // A per-tab map answers "is THIS TAB already doing it" and cannot answer
    // the cross-device question — a phone and a laptop signed into the same
    // person do not share a JS module. The door itself has to refuse the
    // second caller, which means the fact has to live where both callers can
    // see it: a row in this database.
    //
    // ONE TABLE, KEYED BY THE ACT (`google-knowledge:<userId>`,
    // `google-calendar:<userId>`) — the same key the client-side registry
    // already uses, so the two layers agree on what "the same sync" means.
    // `expires_at` rather than a bare "is it running" flag: a worker that dies
    // mid-sweep (a killed request, a crashed tab) must not leave a lease no
    // living caller can ever clear, so the claim is a lease with a TTL, not a
    // permanent lock (CONCURRENCY.md's "atomic conditional SQL" — the claim and
    // the takeover-when-expired are the same UPSERT's WHERE clause; see
    // `workers/content/src/lib/sync-lease.ts`).
    version: "0057_one_control_where_there_were_two",
    sql: `
CREATE TABLE sync_leases (
  lease_key TEXT PRIMARY KEY,
  expires_at TEXT NOT NULL
);
`,
  },
  {
    // WHAT THIS PERSON LETS US READ — the two columns that turn a Google
    // connection from all-or-nothing into a decision somebody made.
    //
    // WHY IT EXISTS. On 25 August 2026 a live password was said out loud on a
    // call, transcribed into the meeting notes and indexed. It was rotated. The
    // fix offered was a scanner over transcripts and the owner refused it, in
    // his words: "no it should not scan anything.. give content as it is." He is
    // right — a scanner tuned to catch a spoken secret also silently drops real
    // material, and silent dropping is the failure this knowledge base has
    // already been bitten by twice. So the lever is SCOPE instead: the answer to
    // "that should never have been read" is "that source was never in scope",
    // decided by the person whose connection it is.
    //
    // ── scope_mode: WHY A MODE AND NOT JUST A LIST ──────────────────────────
    //
    // The containers themselves are rows in \`google_sources\` — a calendar and a
    // Gmail label join the folder, the file and the space already in there, and
    // no new table is needed for them. But that table already carries a MEANING
    // for "this person has named nothing", and it is the opposite of the one
    // Gmail and Calendar need: an unnamed Drive is read NOWHERE, an unscoped
    // mailbox is read ENTIRELY.
    //
    // One table cannot hold both meanings silently. Without a mode, a person who
    // switches off their last named label gets their whole mailbox back — a
    // WIDENING caused by an act that reads as a narrowing, which is exactly the
    // shape of bug this column exists to prevent. So the mode is the fact and
    // the rows are the detail:
    //
    //   'everything' — the default, and bit-for-bit what every existing
    //                  connection does today. Named rows are ignored.
    //   'only'       — read the named containers and nothing else. Nothing
    //                  named means NOTHING READ, which is the safe direction
    //                  and is said on screen in those words.
    //
    // Defaulting to 'everything' is what makes this migration invisible to every
    // team it lands on: nobody's sweep changes until somebody decides it should.
    //
    // ── scope_event_types: WHICH KINDS OF EVENT ────────────────────────────
    //
    // A space-separated allow-list, the same shape as \`scopes\` fourteen lines
    // above it, holding Google's OWN event-type words (default, outOfOffice,
    // focusTime, workingLocation, birthday, fromGmail). It is passed straight to
    // events.list as repeated \`eventTypes\`, so an excluded kind is never
    // fetched rather than fetched and dropped.
    //
    // '' means every kind — the untouched state, and the only way to spell it.
    // The door refuses an EMPTY list rather than storing one, because "untick
    // them all" would otherwise round-trip back into "every kind" and be a
    // second way for a narrowing gesture to widen.
    //
    // It sits on the connection rather than in \`google_sources\` because an event
    // type is not a container: it is not a thing anybody shared, it has no
    // shelf, no client and nothing to link to, and putting a filter in a table
    // of sources would be the overloading the rest of this schema avoids.
    version: "0058_what_this_person_lets_us_read",
    sql: `
ALTER TABLE google_connections ADD COLUMN scope_mode TEXT NOT NULL DEFAULT 'everything';
ALTER TABLE google_connections ADD COLUMN scope_event_types TEXT NOT NULL DEFAULT '';
`,
  },
  {
    // THE 2026-08-31 RULING: ticket / story / sprint / meeting references drop
    // the account-code prefix and mint TEAM-WIDE instead of per account — see
    // shared/workers/refs.ts for the full reasoning. Short version: once the
    // account code is gone from the string, two different clients' tickets can
    // both mint "T0001", and the ticket triage queue (tickets-collection.tsx)
    // shows exactly that kind of cross-account list with nothing but the ref on
    // the row — so the counter has to be scoped so that collision cannot
    // happen, not merely made unlikely. STORY's letter moves to `B` (its old
    // `S` goes to SPRINT, which also drops the three-letter `SPR`). TASK stops
    // minting a reference at all — it never reached a screen, same category as
    // a process, a role or a dropdown value. APP and WAVE gain a reference for
    // the first time.
    version: "0059_the_reference_drops_the_account",
    sql: `
-- ONE COUNTER PER KIND, TEAM-WIDE — the new home for ticket, story, sprint,
-- meeting, app and wave references. Same race-safety as ref_counters below
-- (INSERT … ON CONFLICT DO UPDATE … RETURNING is one statement, so two
-- simultaneous mints of the same kind cannot land on the same number); the
-- only difference is there is no account_id in the key, because the team's
-- own database already IS the boundary a "per team" counter needs.
CREATE TABLE team_ref_counters (
  kind TEXT PRIMARY KEY,        -- 'T' ticket, 'B' story, 'S' sprint, 'M' meeting, 'A' app, 'W' wave
  next_no INTEGER NOT NULL
);

-- ref_counters IS NOW THE TO-DO'S ALONE. Every other kind it ever held (T
-- ticket, S story, SPR sprint, M meeting, K task) either moved to
-- team_ref_counters above or, for the task's K, stopped minting altogether —
-- so their rows here are dead counter state, not a customer's own record.
-- Deleting them costs nothing and a team that mints a new ticket tomorrow
-- starts team_ref_counters fresh regardless of what this row used to say.
DELETE FROM ref_counters WHERE kind <> 'D';

-- APP AND WAVE GAIN A REFERENCE FOR THE FIRST TIME. Nullable, like every ref
-- column before it (help's own note, migration 0011): existing rows get none
-- — there is nothing to mint one FROM after the fact — only an app or a wave
-- created from here on carries one. Partial unique index so the many null
-- rows already on the books never collide with each other.
ALTER TABLE apps ADD COLUMN ref TEXT;
CREATE UNIQUE INDEX idx_apps_ref ON apps (ref) WHERE ref IS NOT NULL;
ALTER TABLE waves ADD COLUMN ref TEXT;
CREATE UNIQUE INDEX idx_waves_ref ON waves (ref) WHERE ref IS NOT NULL;
`,
  },
  {
    // THE CLIENT'S OWN FOLLOW-UP, a moment after 0059: the to-do (renamed Input
    // on both screens) was the one kind that ruling deliberately left alone,
    // because nobody had asked for it yet. She has now, by name — same team-wide,
    // no-account-code shape as every other kind, kind letter `I`. See
    // shared/workers/refs.ts for the full reasoning `nextTeamRef` already
    // carries; this migration only needs to retire what the old shape leaves
    // behind.
    //
    // `todos.ref` and its unique index (`idx_todos_ref`) already exist —
    // migration 0016 gave the table both the moment it was created, and
    // `nextTeamRef` writes the same column, just from a different counter. There
    // is no new column to add.
    //
    // `ref_counters` IS NOW EMPTY OF LIVE WORK. 0059 already cut every kind but
    // the to-do's own ('D') out of it; the to-do minting team-wide is the last
    // reader and the last writer this table ever had, so the table itself is
    // dead rather than merely smaller — kept around it would be a second
    // reference-counter mechanism with nothing left to count. Dropped whole,
    // the same way 0059 judged its dead rows: a team that mints a new Input
    // tomorrow reads `team_ref_counters` and nothing here.
    version: "0060_the_last_holdout_gets_a_name",
    sql: `
DROP TABLE ref_counters;
`,
  },
  {
    // THE TWO READS THAT HAD NO INDEX TO USE.
    //
    // Measured 5 Sep 2026 with EXPLAIN QUERY PLAN: `SCAN w | USE TEMP B-TREE FOR
    // ORDER BY` on the team-wide time view, and `SCAN selectable_data` on the
    // dropdown read that nearly every screen in the app makes. Both are
    // milliseconds today (240 work logs, 125 dropdown values) and both are
    // SHAPES that get slower exactly as the product gets used.
    //
    // WORK LOGS — a PARTIAL index, because `w.discarded_at IS NULL` is the one
    // predicate `logWhere` always emits and the three existing indexes all lead
    // with something optional (`user_id`, `target_table`, `account_id`). So the
    // team-wide view — no person filter — had no usable index at all, and the
    // time screen asks that same WHERE SEVEN times in one load: the paged list,
    // a bounded COUNT, an exact unbounded SUM(seconds), a DISTINCT people count,
    // a group by person, a group by kind, and eight conditional week sums.
    //
    // The column order is those seven reads, not a guess. `started_at DESC, id
    // DESC` is the list's own keyset ORDER BY (so the temp b-tree goes) and the
    // period filter's range; `user_id`, `kind` and `seconds` ride along so the
    // counts, the sums and both group-bys are answered out of the index without
    // touching the table. Discarded rows are left out of the index entirely,
    // which is also why it stays small: a bin that grows never costs a read.
    //
    // DROPDOWN VALUES — `selectable_data` had NO index of any kind beyond its
    // primary key, and five call sites across three workers filter it by `type`,
    // four of those pairing `type` with `value`. `(type, value)` serves all of
    // them and both of the unfiltered `ORDER BY type, value` list/export reads.
    // NOT unique, deliberately: this table has carried duplicate (type, value)
    // rows before and a unique index would REFUSE TO BUILD on any team that
    // still holds one. A speed change may not become a migration that fails.
    version: "0061_reads_that_can_use_an_index",
    sql: `
CREATE INDEX IF NOT EXISTS idx_work_logs_live
  ON work_logs (started_at DESC, id DESC, user_id, kind, seconds)
  WHERE discarded_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_selectable_type_value ON selectable_data (type, value);
`,
  },
  {
    // WHO, WHAT — AND, AT LAST, WHERE AND WHAT KIND. Plus the index for the one
    // question this table could not answer.
    //
    // THREE THINGS, ONE MIGRATION, because they are one finding. `activity` is
    // the app's whole audit story and an audit row has to answer three
    // questions: who did it, what it was about, and where it came from. It
    // answered two.
    //
    // 1 · `origin` — WHICH FRONT DOOR. Four surfaces act as the SAME PERSON
    //     through the SAME gated doors: the agency app, the client portal, a
    //     personal access token on the MCP surface, and the in-app assistant
    //     acting as its caller. That identity is the security design and it is
    //     right — the agent never exceeds the rights of the person it acts for —
    //     but it made their rows byte-identical. So after a leaked token the
    //     first question an owner asks, WHICH of these did this, had no answer
    //     in the one table that exists to answer it. Stamped at the two public
    //     gateways and carried by `forwardToDoor`; see shared/workers/origin.ts.
    //
    // 2 · `verb` — WHAT KIND OF EVENT. `type` is a human sentence and stays one:
    //     it is what the feed shows and it is right for a reader. It is also 157
    //     distinct free-text literals across 139 call sites, so "every archive
    //     last quarter" was a LIKE over prose that silently missed `retired`,
    //     `withdrawn`, `taken down`, `switched off` and `binned` — the same
    //     event in five coats. Eight values, DERIVED from the sentence in the
    //     one writer (shared/workers/activity-verbs.ts) so no call site had to
    //     change and none can forget, and rot-checked so a sentence the mapping
    //     cannot read turns the build red rather than shipping unfindable.
    //
    // 3 · `idx_activity_actor_feed` — WHAT HAS THIS PERSON DONE. Three indexes
    //     stood on this table and none led with `creator_id`, so the actor-
    //     scoped question was a full scan and a sort of what 0023 calls "the
    //     fastest-growing table in a team's database by construction… the
    //     tens-of-millions one". With four write surfaces acting as one person,
    //     that is the query that matters most and it was the one shape the table
    //     was not built for — guaranteed to time out at exactly the moment it is
    //     first needed. Same shape as the two feed indexes beside it, for the
    //     same keyset (`created_at DESC, id DESC`), so an actor page is an index
    //     seek and page two is too.
    //
    // NULLABLE, AND THAT IS THE HONEST SHAPE. Every row written before today has
    // no origin and no verb, and a backfill would have to INVENT the first one —
    // there is nothing on an old row that says which surface wrote it. A NULL
    // here reads as "written before the column existed", which is true, and is
    // distinguishable from the string `unknown`, which means "we asked and could
    // not tell". Two different facts, two different values, neither guessed.
    // (The verb COULD be backfilled from `type` by the same mapping; it is not,
    // because a mixed table where some old rows are classified and some are not
    // is harder to reason about than one where the line is the migration date.)
    version: "0062_an_activity_row_says_where_it_came_from",
    sql: `
ALTER TABLE activity ADD COLUMN verb TEXT;
ALTER TABLE activity ADD COLUMN origin TEXT;
CREATE INDEX IF NOT EXISTS idx_activity_actor_feed ON activity (creator_id, created_at DESC, id DESC);
`,
  },
  {
    // AN IMPORT THAT DIED CAN BE PICKED UP WHERE IT STOPPED.
    //
    // The batch claim is deliberately one-way (`planned` → `running`, never
    // back) because a re-runnable claim is how one import writes its rows twice.
    // The cost was that a run which did not come home was UNRECOVERABLE: the
    // rows already written stayed written, the batch sat on `running` for ever,
    // and the only way forward was to upload the file again — which duplicates
    // every row the dead run had already made. A 1,000-row import is minutes
    // long and the thing at the other end is a person with a browser, so "it
    // died half way" is not a rare case.
    //
    // `cursor_json` is where it got to: the target it was inside, how many of
    // that target's rows were done, and the report so far. Written after every
    // WAVE, so the unfinished work is bounded by one wave rather than by the
    // whole file. `import-batch.ts` explains what that boundary does and does
    // not promise.
    version: "0063_an_import_can_be_resumed",
    sql: `
ALTER TABLE data_import_batches ADD COLUMN cursor_json TEXT;
`,
  },
  {
    // A SOURCE THAT CANNOT BE EMBEDDED STOPS BEING RETRIED FOR EVER.
    //
    // `embed` is best-effort by design and rightly so: an embedding failure must
    // not lose the material, so a failed batch stores NULL vectors and leaves
    // `content_hash` un-stamped. The sweep's skip is "hash matches AND indexing
    // finished", so an un-stamped source is picked up again — every fifteen
    // minutes, for ever, with no counter anywhere and nothing that could ever
    // say "this one is not going to work".
    //
    // For a transient Workers AI wobble that is exactly right, and it is why the
    // retry exists. For a source that fails REPEATABLY — text the model refuses,
    // a size that always times out — it is a billed call every tick until
    // somebody notices, and the error row it writes says the same thing each
    // time, so the ninety-day log fills with one sentence.
    //
    // `transcript_attempts` on meetings is the same shape and the precedent
    // (TRANSCRIPT_ATTEMPT_CAP): count the tries, stop at a cap, leave the row and
    // its words alone. NOT NULL DEFAULT 0 so every existing row starts with a
    // clean slate — the honest value, since nothing before today counted.
    version: "0064_an_unembeddable_source_stops_being_retried",
    sql: `
ALTER TABLE knowledge_sources ADD COLUMN embed_attempts INTEGER NOT NULL DEFAULT 0;
`,
  },
  {
    // A TICKET REMEMBERS WHAT IT ARRIVED AS.
    //
    // `help_type` is OVERWRITTEN IN PLACE when a ticket is recategorised
    // (`updateTicket`, workers/content/src/lib/help.ts). That is right for the
    // column — the type is what the ticket IS now, and every tab, filter and
    // badge in the app asks that question. It also means the app has never been
    // able to answer the other one: what did it arrive as? Somebody raises a
    // "Question", triage reads it and makes it an "Issue", and the fact that it
    // came in as a question is gone the instant the UPDATE lands.
    //
    // Today the only trace is the activity feed, as FREE PROSE inside a sentence
    // (… edited T-0412, Type: "Question" → "Issue"). That is a record for a
    // person reading one ticket's history; it is not a column anything can group
    // by, and `describeChanges` is free to reword it tomorrow. The owner asked
    // for the rate at which she recategorises, across the whole backlog, which is
    // a question about a COLUMN.
    //
    // ── WHY IT IS NEVER UPDATED ─────────────────────────────────────────────
    //
    // This column's whole value is that it disagrees with `help_type`. The moment
    // any write path can move it, the pair stops being "arrived as / is now" and
    // becomes two copies of the same fact — and the chart built on it reads zero
    // recategorisations for ever, which is a wrong answer wearing a right one's
    // clothes. So it is stamped ONCE, in the INSERT in `createTicket`, from the
    // same value `help_type` gets in that same statement, and no UPDATE anywhere
    // in the codebase names it. That is asserted rather than described:
    // workers/content/test/raised-as-is-stamped-once.test.ts reads every worker
    // source off disk and fails if a second writer ever appears.
    //
    // THE ONE WRITE THAT IS NOT AN UPDATE OF IT. Renaming a dropdown value
    // rewrites the word on every record that stored it (`updateSelectable` +
    // VOCABULARY_HOMES in shared/selectable-homes.ts) — because in this app the
    // WORD is the join key, not an id. `raised_as_type` is declared as a second
    // home of the `Ticket type` group and is carried by that rewrite, and that is
    // not an exception to the paragraph above, it is the same rule read
    // carefully: a rename changes the SPELLING of a value and never a ticket's
    // identity. If it were left behind, renaming "Request" to "Ask" would make
    // every historical request look like a ticket that arrived as one thing and
    // was recategorised into another — a recategorisation nobody performed,
    // manufactured by a spelling change — and the column would hold a word the
    // team's own vocabulary no longer contains, so the chart's axis would have
    // no label to draw.
    //
    // ── THE BACKFILL, AND WHY THERE ISN'T ONE ───────────────────────────────
    //
    // EVERY ROW THAT EXISTS TODAY STAYS NULL. Deliberately, and it is the part of
    // this migration most likely to be "improved" later, so here is what was
    // considered and refused:
    //
    //   1. TAKE THE FIRST `Type: "X" → "Y"` OUT OF THE ACTIVITY FEED. The history
    //      is genuinely there and it parses. It fills EXACTLY the tickets that
    //      were recategorised and NONE of the ones that were not — which is the
    //      numerator of the owner's question with none of its denominator. A
    //      matrix built on that reads "every ticket gets recategorised", which is
    //      a number nobody measured. It is also incomplete in a way nothing can
    //      see: `logActivity` is best-effort and swallows its own failures, and
    //      the sentence it writes is prose that has been reworded before.
    //   2. ASSUME AN UNCHANGED TICKET AROSE AS WHAT IT IS NOW (copy `help_type`
    //      wherever the feed records no change). This is the tempting one, and it
    //      is the one that would quietly invent the most: it would stamp all ~788
    //      tickets imported from Glide as "arrived as this, never recategorised",
    //      when they arrived here carrying whatever they had ENDED at in a system
    //      that had its own triage. Their creation is not an event that ever
    //      happened in this app, so there is nothing here to record.
    //
    // Both would put INFERRED values in the same column as STAMPED ones with no
    // way to tell them apart afterwards. 0062 made the same call about `origin`
    // and `verb` for the same reason, and its sentence is the right one here too:
    // NULL reads as "this system did not record it", which is TRUE, and is a
    // different fact from any type we could have guessed at.
    //
    // So the honest shape is: the column means one thing, the 5A chart names the
    // rows it has no record for rather than folding them into a total, and the
    // series starts today. If the history is ever wanted, it is a DATED ONE-OFF
    // SCRIPT over the activity feed (the shape scripts/backfill-ticket-raisers.mjs
    // already has) which can also record what it inferred and how — never a
    // migration that blends two grades of evidence into one column in silence.
    //
    // NO INDEX, on purpose. The one question this column answers is a GROUP BY
    // over the whole fenced table (the raised-as × current-type matrix); an index
    // on a handful of repeated words serves no seek and would only be a second
    // thing every ticket INSERT has to write. 0061 is where the ticket reads that
    // DO want an index live, and this is not one of them.
    version: "0065_a_ticket_remembers_what_it_arrived_as",
    sql: `
ALTER TABLE help ADD COLUMN raised_as_type TEXT;
`,
  },
  {
    // A TICKET REMEMBERS THE STAGES IT WENT THROUGH.
    //
    // THE CLIENT, 2026-09-06: "we need record on category when it arrived vs the
    // category we assigned / also how long it sat on each stage / also how often
    // sth is reopened". 0065 answered the first clause. This answers the other
    // two, and it answers them with ONE table rather than two, because they are
    // one fact asked twice.
    //
    // ── WHY TIME-IN-STAGE AND REOPEN-COUNT ARE NOT TWO THINGS ───────────────
    //
    // A ticket's stage history is a sequence of transitions. Given the sequence,
    // TIME IN A STAGE is the gap between consecutive rows — no column needed —
    // and a REOPEN is a transition whose `from_status` is `resolved` and whose
    // `to_status` is not. A `reopen_count` column beside this table would be a
    // SECOND SOURCE OF TRUTH for a fact this table already holds, and the two
    // would disagree the first time a row was written and the counter was not
    // (or the counter incremented and the row lost). One table, two questions,
    // no arithmetic anybody has to keep in sync.
    //
    // It is also the record that survives a REOPEN, which is the reason this is
    // worth a table at all. `setStatus` (workers/content/src/lib/help.ts) NULLs
    // `resolved_at` and the whole resolver block on any move to a non-resolved
    // status — deliberately: those columns mean "the answer that stands NOW",
    // and a reopened ticket has no standing answer. The owner blessed exactly
    // that and named where the fact should go instead: "Reopening a ticket nulls
    // its closing timestamp, yeah — but keep it in activity, like closed on x,
    // reopen on y, closed again on z". A row here carries the actor and the
    // instant of every transition, resolves included, so who answered it and
    // when is no longer erased by the reopen — it is one row up the sequence.
    //
    // ── WHAT A TICKET WITH NO ROWS REPORTS ──────────────────────────────────
    //
    // NOTHING. Not zero. Every ticket that exists on the day this runs has an
    // EMPTY history and cannot be given one, and every reader of this table has
    // to say so in those words. `readTicketStages` returns `recorded: false` and
    // the Activity tab prints "This ticket has no record of the stages it went
    // through." — never "0 days in each stage", which is a measurement nobody
    // took wearing the clothes of one that was.
    //
    // A PARTIAL history is the second shape and it is just as real: a ticket
    // raised last month and moved tomorrow gets its first row tomorrow, with a
    // `from_status` that names a stage nothing recorded the START of. So the
    // reader reports `fromCreation: false` for it and the panel says the earlier
    // stages are not recorded — the SEQUENCE is honest from the first row on,
    // and the duration of the stage before it is simply not a number we have.
    // That is why `from_status` is stored at all rather than inferred from the
    // previous row: on the first row there IS no previous row, and "what it came
    // out of" is the only thing that says whether the sequence is whole.
    //
    // ── THE BACKFILL, AND WHY THERE ISN'T ONE ───────────────────────────────
    //
    // 0065 refused to reconstruct `raised_as_type` from the activity feed's
    // prose and its argument is the same one here, only stronger. The feed does
    // carry a sentence per status move ("Alaap set T-0412 to in progress") and
    // it does parse. It is still the wrong source:
    //
    //   1. `logActivity` is BEST-EFFORT and swallows its own failures, so the
    //      feed is incomplete in a way nothing can measure — and a duration
    //      computed across a MISSING transition is not a slightly-wrong number,
    //      it is two stages reported as one long one. A gap in a list of events
    //      is visible; a gap inside an arithmetic answer is not.
    //   2. The sentence is PROSE and `describeChanges` has been reworded before.
    //      A parser over it is a build that goes green while reading nothing.
    //   3. `bulkSetStatusByFilter` writes ONE activity row for a whole SET of
    //      tickets, naming a count rather than the ids — so for every ticket in
    //      every bulk move ever run there is no per-ticket sentence to read.
    //   4. The ~788 tickets imported from Glide never had their transitions
    //      happen in this app at all. Whatever stages they went through happened
    //      in another system with its own ladder, and there is nothing here to
    //      recover.
    //
    // So the series starts today, an empty history says "not recorded" in those
    // words, and if the past is ever wanted it is a DATED ONE-OFF SCRIPT that
    // records what it inferred and how (the shape scripts/backfill-ticket-
    // raisers.mjs already has) — never a migration that blends a stamped event
    // with a guessed one in a table nothing can tell them apart in afterwards.
    //
    // ── THE SHAPE ───────────────────────────────────────────────────────────
    //
    // `from_status` NULL means "no recorded stage before this one". It is the
    // honest value in exactly two places: the row `createTicket` stamps (there
    // was nothing before it — the ticket did not exist), and the one race in
    // `bulkSetStatusByFilter`, which reads the set's statuses and then moves the
    // set in two statements and so can be beaten to a row by a concurrent write.
    // Both mean the same sentence, which is why they share the same value.
    //
    // NO FOREIGN KEY TO A STATUS VOCABULARY, because there isn't one: `status`
    // on `help` is a free TEXT column the CODE validates against `HELP_STATUSES`
    // (0028 says why), and a CHECK constraint here would make adding a stage a
    // schema migration on a table whose whole job is to record history. It would
    // also make this table REFUSE to record a move the app performed, which is
    // the one thing a history table must never do.
    //
    // THE INDEX IS THE ONLY READ THERE IS: one ticket's rows, oldest first. That
    // is the panel, the durations and the reopen count, all three, so
    // `(help_id, created_at, id)` is a single seek plus a scan of one ticket's
    // own rows and there is no second question to serve.
    //
    // `id` RIDES THE KEY FOR THE SEEK, NOT FOR THE ORDER, and the difference is
    // worth writing down because it looks like a tie-break and is not one. Two
    // moves on one ticket inside the same millisecond sort equal on
    // `created_at`, and a ULID's low half is RANDOM (shared/workers/id.ts), so
    // `id` cannot say which came first — it reversed a resolve and the reopen
    // after it the first time this was tested. The reader breaks the tie on
    // `rowid`, which is the insertion order and which nothing can recycle here
    // because nothing ever deletes from this table (a source scan in
    // workers/content/test/status-history-has-no-holes.test.ts holds that shut).
    version: "0066_a_ticket_remembers_its_stages",
    sql: `
CREATE TABLE help_status_events (
  id TEXT PRIMARY KEY,
  help_id TEXT NOT NULL REFERENCES help (id),
  from_status TEXT,
  to_status TEXT NOT NULL,
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT
);
CREATE INDEX idx_help_status_events_ticket ON help_status_events (help_id, created_at, id);
`,
  },
  {
    // THE CLIENT SAYS HOW WE DID.
    //
    // THE OWNER, 2026-09-06: "let's store sentiment (1-3) on the portal for how
    // did we do it to see if client is happy", then "sentiment they can add a
    // text (optional)".
    //
    // ── WHY IT IS A TABLE AND NOT TWO COLUMNS ON `help` ─────────────────────
    //
    // A score on the ticket row would be overwritten the second time somebody
    // answered, and the second answer is a DIFFERENT FACT from the first: "we
    // did badly, and then we fixed it" is the most useful thing this data can
    // ever say, and a column cannot say it. The question is "how did we do",
    // past tense, asked about a moment — so the row records WHO said it and WHEN
    // beside the score, and a later change of mind is a new row rather than an
    // edit of the old one. Nothing here is ever UPDATEd.
    //
    // MANY ROWS PER PERSON, ON PURPOSE, and the standing answer is the newest of
    // them. A UNIQUE (help_id, rater_id) with an upsert behind it was the
    // obvious alternative and it is exactly the shape the paragraph above rules
    // out: it answers "what do they think now" perfectly and destroys "what did
    // they think then" to do it. Readers take the latest row per rater, so the
    // portal can still show one person one answer; the table keeps the rest.
    //
    // ── WHEN IT MAY BE GIVEN ────────────────────────────────────────────────
    //
    // ONLY ON A RESOLVED TICKET, and that is enforced at the door
    // (`rateTicket`, workers/content/src/lib/help-ratings.ts) rather than left
    // to the screen. "How did we do" is a question about work that is FINISHED.
    // Asked on a ticket still in progress it measures how a person feels about
    // waiting, which is a different quantity that would sit in the same column
    // and could never be separated out afterwards. The schema does not carry
    // that rule — a CHECK cannot see the `help` row — but the door does, and
    // the ticket's own stage history (0066) is what makes the pair readable
    // later: the rating's timestamp against the resolve it followed.
    //
    // A REOPEN does not delete anything. A ticket answered, rated 1, reopened
    // and answered again keeps the 1 and gains a second row, which is the whole
    // point of the shape.
    //
    // ── OPTIONAL MEANS OPTIONAL ─────────────────────────────────────────────
    //
    // `comment` is nullable and nothing anywhere may refuse or nag on its
    // absence: a score with no words is a COMPLETE rating, said in full. The
    // owner's second message added the text as an extra, not as a second half.
    //
    // `score` carries its CHECK in the schema rather than only in code, and this
    // is the opposite call from `help.status` above — deliberately. A status is
    // a vocabulary that has grown twice and will grow again; a three-point scale
    // is the WHOLE instrument, and a 4 in this column would not be a new value,
    // it would be a row nothing knows how to average. The door validates it too
    // (a CHECK failure is a 500 and a person deserves a 400), so this is the
    // floor under the door and not a substitute for it.
    //
    // THE INDEX is the one read: one ticket's ratings, newest first, so "what
    // does this person currently say" and "everything anybody ever said" are the
    // same seek. No index on the score — nothing groups by it yet, and 0065's
    // sentence about an index on a handful of repeated words holds here too.
    //
    // `id` IS IN THE KEY FOR THE SEEK AND NOT FOR THE ORDER, the same caveat
    // 0066 above carries: two answers inside one millisecond sort equal on
    // `created_at`, and a ULID's low half is random, so the reader breaks that
    // tie on `rowid` — which is safe because nothing ever deletes from here
    // either, and "which of these is the standing answer" is the whole question.
    version: "0067_the_client_says_how_we_did",
    sql: `
CREATE TABLE help_ratings (
  id TEXT PRIMARY KEY,
  help_id TEXT NOT NULL REFERENCES help (id),
  score INTEGER NOT NULL CHECK (score IN (1, 2, 3)),
  comment TEXT,
  created_at TEXT NOT NULL, creator_id TEXT, creator_email TEXT, creator_name TEXT
);
CREATE INDEX idx_help_ratings_ticket ON help_ratings (help_id, created_at DESC, id DESC);
`,
  },
  {
    // THE REFERENCE THE CLIENT ALREADY QUOTED KEEPS WORKING — the 2026-09-07
    // ruling, in one word: "alias yes".
    //
    // ── WHAT WAS ACTUALLY WRONG ───────────────────────────────────────────
    //
    // 0059 and 0060 moved the MINT to the team-wide shape and rewrote NOT ONE
    // STORED ROW. `shared/workers/refs.ts` said the old account-coded shape
    // "is GONE" and it was gone only from the code: measured against staging
    // on 7 Sep 2026, the Kwapso team held 1,896 ticket references, 275 story,
    // 100 sprint, 45 meeting and 1 input, and every single one of them was
    // still \`<account name>-<letters><digits>\` — "VU Solutions-T1183",
    // "196+ awards-SPR0001", "TEST-D0001". The client was reading those off
    // her own screens for six days while the file describing them claimed
    // they did not exist. That gap is why R55 exists; this migration is the
    // half that fixes the data.
    //
    // ── WHY AN ALIAS AND NOT JUST A REWRITE ───────────────────────────────
    //
    // A reference's whole job is to be QUOTED — in an email, on a call, in a
    // client's own spreadsheet. Rewriting the column alone would break every
    // one of those retrospectively: a client types the number we gave her and
    // the search says there is no such ticket. So the string a record used to
    // wear is kept and stays findable. That is the client's own answer to the
    // choice she was shown, and it is also what makes the renumbering below
    // defensible at all — see "WHOSE NUMBER SURVIVES".
    //
    // ── WHY A TABLE AND NOT A COLUMN ──────────────────────────────────────
    //
    // A \`ref_was TEXT\` on each row was the smaller change and it is wrong on
    // three counts, in rising order of seriousness. It holds exactly ONE
    // previous name, and a record can be renumbered more than once over its
    // life (this migration renumbers 202 tickets that were ALREADY renumbered
    // once, by the Glide import). It would be eight columns across eight
    // tables, so "where do we look up an old reference" would have eight
    // answers. And it records a fact about the ROW when the fact is about a
    // MOMENT: which name, retired when, replaced by what, by which act. A
    // column can hold the string; it cannot hold the sentence.
    //
    // NO \`id\` COLUMN, which is the one place this table breaks the house
    // shape. Every other table here has a ULID primary key, and a ULID is
    // generated in TypeScript — there is no \`ulid()\` inside SQLite, and this
    // table is populated entirely by \`INSERT … SELECT\` from rows that already
    // exist. Its natural key is real and it is unique: one alias per table.
    //
    // ── WHOSE NUMBER SURVIVES, WHICH IS THE HARD PART ─────────────────────
    //
    // The old scheme counted PER ACCOUNT, so every client's tickets started at
    // 1. Strip the account off and keep the digits — the obvious reading of
    // "preserve the numbers" — and two clients' "T0001" become the same string,
    // which is precisely the cross-account collision refs.ts says the whole
    // team-wide shape exists to make impossible. It is not merely unwise: the
    // partial unique indexes (\`idx_help_ref\` and its six siblings) are live,
    // so most of those writes would simply fail.
    //
    // Measured on staging, this is not a corner case. Tickets reformat to 1,694
    // distinct numbers out of 1,896 rows. STORIES reformat to 34 distinct
    // numbers out of 275 — every story in the team collides with a sibling, so
    // "preserve the numbers" is not merely risky there, it is arithmetically
    // impossible.
    //
    // So the rule is per ROW and not per kind, and it is the same rule
    // everywhere: KEEP THE NUMBER WHERE THE NUMBER IS FREE, REISSUE WHERE IT
    // IS NOT. On staging that preserves 1,694 of 1,896 ticket numbers (89%),
    // 25 of 100 sprints, 14 of 45 meetings, 1 of 1 input, and 34 of 275
    // stories. One rule, and it produces "almost everything kept" for tickets
    // and "almost everything reissued" for stories because those are the two
    // true answers about that data, not because two rules were written.
    //
    // THE SEAT GOES TO THE OLDEST ROW, tie-broken on \`id\`. Not the biggest
    // account, not the busiest — \`created_at\` is objective, it needs no
    // judgement about which client matters more, it is stable across re-runs
    // (which is what makes this idempotent), and the oldest row is the one
    // whose number has had the longest time to end up in somebody's inbox.
    //
    // AND THE LOSERS ARE NOT HARMED THE WAY THEY LOOK, which is the whole
    // reason the alias had to come first: a reissued row's old string still
    // finds it. Renumbering without the alias would have been a data change
    // nobody could undo; renumbering WITH it is a change to what we print
    // next time.
    //
    // Reissued numbers go ABOVE the high-water mark, in creation order, so the
    // sequence a client sees stays chronological and no reissue can land on a
    // number some other row already holds.
    //
    // ── THE COUNTER, WHICH IS THE QUIET WAY THIS COULD HAVE GONE WRONG ────
    //
    // \`team_ref_counters\` mints the next number. Renumber a ticket to T3447 and
    // leave the counter at 168 — which is exactly what staging reads, 168 with
    // not one row to show for it — and the next 3,279 tickets each try to mint
    // a number a row already has, against a live unique index. So every
    // counter is raised to the high-water mark this migration leaves behind.
    //
    // WITH \`MAX()\`, so it can only ever go UP. The Kwapso team's T counter is
    // ahead of every row it has: 167 numbers were minted and the rows are gone
    // (deleted, or replaced by a Glide re-import). Lowering it to match the
    // rows would re-mint numbers that have already been handed out. A counter
    // that is too high costs a gap in the sequence; a counter that is too low
    // costs a collision, and only one of those is a fault.
    //
    // \`nextTeamRef\` IS NOT TOUCHED. It is still the single
    // \`INSERT … ON CONFLICT DO UPDATE … RETURNING\` CONCURRENCY.md rule 1 asks
    // for; this only moves where it starts counting from.
    //
    // ── IDEMPOTENT, AND SAFE ON A TEAM THAT IS ALREADY DONE ───────────────
    //
    // A migration that rewrites identifiers is very close to irreversible, so
    // it is built to be run twice with no second effect:
    //
    //   · the plan selects only STALE rows — a reference that does not equal
    //     what the formula would make of the number it carries. After one run
    //     nothing is stale, so a second run plans nothing.
    //   · the alias insert is \`INSERT OR IGNORE\` against the unique key.
    //   · the UPDATE reads its answer out of \`ref_aliases\` rather than out of
    //     a CTE over the table it is writing to. That is not tidiness: a
    //     correlated subquery over the SAME table would have rows changing
    //     under the window function that is seating them, and the seat numbers
    //     would depend on the order SQLite happened to visit rows in. And it
    //     still carries the staleness predicate, so a completed row is skipped
    //     rather than rewritten to the value it already has.
    //   · the counter is a \`MAX\`, so applying it again cannot move it.
    //
    // A FRESH DATABASE replays this whole ledger, and there every one of these
    // statements matches zero rows. The table and its indexes are the only
    // thing a newborn team takes from here.
    //
    // ── WHAT IT DELIBERATELY LEAVES ALONE ─────────────────────────────────
    //
    // \`tasks\` has a \`ref\` column, a unique index and 109 old \`<account>-K####\`
    // strings, and it is NOT in this migration. A task mints no reference at
    // all — \`createTask\` writes a literal NULL and the 2026-08-31 ruling is
    // explicit that a task is the agency's own admin, in the same category as
    // a process or a dropdown value. There is no kind to carry those strings
    // to. Rewriting them would mean inventing a scheme the client never asked
    // for; NULLing them would be destroying data to make a law look tidier.
    // So they stay, and \`REF_TABLES_WITHOUT_A_KIND\` in the registry is where
    // that decision is written down and rot-checked — the day \`tasks\` gains a
    // kind, that entry has to go and R55 covers the table automatically.
    //
    // \`apps\` and \`waves\` hold no reference at all (0059 gave them the column
    // and said existing rows get none). There is nothing here to rewrite, and
    // MINTING one for 28 existing apps is a different decision the client
    // half-made on 1 Sep 2026 with an exact 29-name order that did not match
    // live data. Not folded in here.
    version: "0068_the_reference_keeps_its_old_name",
    sql: refBackfillSql("0068_the_reference_keeps_its_old_name"),
  },
  {
    // THE STAGE THE CLIENT RETIRED — 7 Sep 2026, in her own words: "kill
    // awaiting_validation".
    //
    // A ticket used to open in `awaiting_validation` when its kind was an extra,
    // a request or a piece of feedback, and waited there for the company paying
    // for it to confirm they wanted it (CHECKLIST 5.13). The stage is gone from
    // `HELP_STATUSES` (shared/types.ts carries the full argument), the door that
    // cleared it is gone, and every ticket now opens in `new`. This is the
    // stored half of that: the rows still sitting in the retired word.
    //
    // ── WHERE THE ROWS GO, AND WHY `new` IS NOT AN ARBITRARY PICK ───────────
    //
    // MEASURED FIRST, because "where do they go" is a different question when
    // the answer turns out to be "there are none". Counted across all eleven
    // team databases on 7 Sep 2026 (two of which have no `help` table at all):
    // ZERO rows in `awaiting_validation`. The live client team holds 2,051
    // tickets — 1,597 resolved, 437 new, 11 triaged, 3 in progress, 3 ready —
    // and not one of them is waiting. The gate was barely exercised in
    // production: 343 tickets of the kinds that were supposed to wait sit in
    // `new` because they were imported rather than raised through the door, and
    // `validated_at` is set on exactly one row in the whole estate.
    //
    // So this moves nothing today, and it is written anyway, because "nothing to
    // migrate" is a fact about the databases that existed at the moment it was
    // measured — not about one somebody creates between now and the deploy, or a
    // staging team seeded from an older path. A row left behind in the retired
    // word would render as a badge with no label on BOTH front doors: every
    // status map is a closed `Record<HelpStatus, …>` and the word is no longer
    // one of its keys.
    //
    // `new` IS THE DESTINATION, and it is the same move the client would have
    // made herself. `validateTicket` moved a confirmed ticket
    // `awaiting_validation` → `new`; retiring the gate means we stop asking
    // permission before we look at the thing, so a ticket that was still waiting
    // on permission is simply in the queue. `triaged` was the alternative and it
    // would be a lie: it asserts that a person here READ and sorted the ticket,
    // which is a judgement nobody made, and the triage door has a pre-triage
    // gate of its own these rows have never been through.
    //
    // ── WHAT IT DOES NOT TOUCH ─────────────────────────────────────────────
    //
    // `help_status_events` IS NOT REWRITTEN. A ticket that genuinely passed
    // through that stage passed through it, and 0066's whole ethic is that the
    // record of what happened is not editable by a later opinion about the
    // vocabulary. The reader keeps drawing those rungs in the words we used at
    // the time — "Waiting on you" (`stageLabel`,
    // web/components/tickets/ticket-stages.tsx, typed on `HelpStatusEver` for exactly
    // this reason).
    //
    // `validated_at` IS NOT CLEARED. It records a real act by a real person on a
    // real date. A column emptied because the feature behind it ended is a fact
    // deleted, not a feature removed.
    //
    // `updated_at` IS NOT STAMPED. A migration is not a person, and touching it
    // would push every moved ticket to the top of "recently updated" on both
    // front doors as though somebody had edited it.
    //
    // ── THE EVENT ROW, AND WHY IT IS WRITTEN BEFORE THE MOVE ───────────────
    //
    // The move is REAL — a row really does leave one stage for another — so it
    // gets a rung like every other move (0066: one seam, and a history missing
    // one writer is worse than no history, because the gap is invisible and the
    // durations either side of it silently merge). Its actor columns are NULL,
    // which is the shape 0066 already defines for "a move whose actor was not
    // recorded" and is the honest answer here: no person pressed anything.
    //
    // It is written BEFORE the UPDATE, which INVERTS the rule the runtime seam
    // follows (help-stages.ts: always after, so a failed UPDATE cannot leave a
    // phantom event). The inversion is forced — after the UPDATE there is no row
    // matching `status = 'awaiting_validation'` left to select from — and it is
    // safe here for a reason the runtime does not have: a migration RE-RUNS. The
    // `NOT EXISTS` guard means a second run inserts nothing, and if a run dies
    // between the two statements the next one completes the move the event
    // already claims. The runtime's worst case is a permanent lie; this one's is
    // a temporary one the next run repairs.
    //
    // IDEMPOTENT BOTH WAYS: once this has run, the INSERT's SELECT finds no rows
    // and the UPDATE matches none.
    //
    // `status IN ('awaiting_validation')` RATHER THAN `status = …` ON THE MOVE,
    // for a single value — the same sentence, and the spelling the ticket module
    // uses everywhere (`validateTicket` carried that note verbatim before it was
    // removed). R17's census reads this file: web/test/rules.test.ts scans every
    // worker source for a status move on this table and accepts exactly three
    // spellings of a current-status predicate, of which a bare `=` is not one.
    // The law is right to be narrow — a status move with no predicate is the
    // double-click bug — and a migration is not exempt from it just because it
    // is meant to run once.
    //
    // AND THE CENSUS READS COMMENTS TOO, WHICH IS WHY THIS ONE IS WORDED AROUND
    // THE PHRASE IT MATCHES. The first draft of this note quoted the scanned
    // string verbatim to explain the rule, and turned the build red against
    // prose. Worth leaving as a warning rather than silently avoiding: a
    // source-scanning law cannot tell an example from an instance.
    version: "0069_the_stage_the_client_retired",
    sql: `
INSERT INTO help_status_events (id, help_id, from_status, to_status, created_at, creator_id, creator_email, creator_name)
SELECT lower(hex(randomblob(16))), h.id, 'awaiting_validation', 'new',
       strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, NULL, NULL
  FROM help h
 WHERE h.status = 'awaiting_validation'
   AND NOT EXISTS (
     SELECT 1 FROM help_status_events e
      WHERE e.help_id = h.id
        AND e.from_status = 'awaiting_validation'
        AND e.to_status = 'new'
        AND e.creator_id IS NULL
   );

UPDATE help SET status = 'new' WHERE status IN ('awaiting_validation');
`,
  },
  {
    // A SOURCE SAYS WHICH CALL IT CAME FROM — and says nothing where Google did
    // not say it.
    //
    // ── THE FAULT, IN THE OWNER'S OWN WORDS (8 Sep 2026) ────────────────────
    //
    // One Padelbase call produced a calendar invite, two "the call was moved"
    // notices, three acceptance notices, a one-minute transcript from somebody
    // who joined by accident, and the real transcript. Every one of those is its
    // own knowledge source, separately embedded, and all of them compete as
    // STRANGERS in the same search. That day the assistant answered a question
    // about the week-planning call from a 1,179-character stub while the
    // 73,141-character notes sat beside it, unrelated as far as anything here
    // could tell.
    //
    // Measured on staging before this migration was written (7 sources for one
    // 30-minute call, and 3,967 live sources in the base): nothing in the schema
    // could say that two of them were about the same half-hour.
    //
    // ── ONE COLUMN, AND WHAT IS ALLOWED TO FILL IT ─────────────────────────
    //
    // `event_id` is GOOGLE'S OWN calendar event id and nothing else.
    // lib/record-map.ts already states the principle this obeys: "Nothing here
    // infers a relationship. Every edge is a foreign key this app has always
    // stored." So there is no title matching here, no timestamp proximity, no
    // fuzzy grouping and no embedding. Where Google does not say which event an
    // artefact belongs to, the column stays NULL — and that is a CORRECT answer,
    // not a gap to be filled by a guess. A wrong grouping is worse than none,
    // because it makes the base answer confidently from the wrong artefact,
    // which is the very failure above.
    //
    // AN EVENT IS OPTIONAL, DELIBERATELY. The owner's own correction the same
    // day: "an email thread that is probably nothing to do with a call or just a
    // conversation with the client will still fall into the larger umbrella of
    // accounts and apps." A stray thread has an account and no event, and
    // inventing an event for it would reproduce the duplicate problem one layer
    // up. `account_id` and `app_id` are the universal parents and they have been
    // on this table since 0012 and 0020 — this migration deliberately adds no
    // second spelling of either. Measured the same day: of every mirrored source
    // whose own row names a client or a system, ZERO disagreed with that row, so
    // there is nothing here to repair and a new column would only be a second
    // place for the answer to drift.
    //
    // ── WHY A SECOND COLUMN SAYING HOW WE KNOW ─────────────────────────────
    //
    // `event_id_from` records WHICH statement of Google's was read, exactly as
    // `meetings.transcript_found_by` does for the transcript hunt beside it. The
    // three do not prove the same thing and a reader deserves to be able to tell:
    //
    //   'origin'  the source IS the calendar entry — Google's event id is the
    //             tail of its own `origin_row_id`. Nothing can be wrong here.
    //   'meeting' the source mirrors a `meetings` row that already carries
    //             `google_event_id`, a column this app has stored since 0012.
    //   'mail'    Google's robot wrote the event into the notice as
    //             `…/calendar/event?eid=<base64url of "<eventId> <calendarId>">`.
    //             Read by the backfill script, which cannot be done in SQL —
    //             SQLite has no base64 — see scripts/backfill-source-events.mjs.
    //
    // ── WHAT THIS MIGRATION CANNOT PLACE, SAID OUT LOUD ────────────────────
    //
    // The Gemini notes DOCUMENT — the artefact that actually holds the answer —
    // carries no event id at all. Measured over every Google-sourced row on
    // staging: 0 of 80 live Drive sources mention a calendar link, an `eid` or
    // even a Meet link in their text, and 0 of them is named by any calendar
    // entry this app has read. The only place Google states that link is the
    // event's own `attachments[]`, which is a live Calendar call rather than a
    // column, and today it names a THIRD document for the week-planning call —
    // neither of the two the Drive sweep filed. The 121 "Notes:" emails carry
    // nothing either: no eid, no Meet link, only the event's title in quotes.
    // Those rows keep a NULL, honestly, until a lane exists that can ask the
    // event what is hanging off it.
    //
    // NOTHING ABOUT THE SEARCH CHANGES HERE. The vector carries nine metadata
    // keys (lib/knowledge-vectors.ts) and this is not a tenth: the index is not
    // rewritten, the namespace is still the team's, and every passage is still
    // read back out of this database under the caller's own fence (R26). What
    // is searched is a later decision, made with this column in front of it.
    version: "0070_a_source_says_which_call_it_is_from",
    sql: `
ALTER TABLE knowledge_sources ADD COLUMN event_id TEXT;
ALTER TABLE knowledge_sources ADD COLUMN event_id_from TEXT;

-- Partial, because the column is NULL on most rows by design and an index over
-- those nulls would be a write cost with no reader — the ruling of 0061.
CREATE INDEX idx_knowledge_sources_event ON knowledge_sources (event_id) WHERE event_id IS NOT NULL;

-- ROUTE 'origin' — the source IS the calendar entry. \`origin_row_id\` is built as
-- \`<readerUserId>:<googleEventId>\` (lib/knowledge-google.ts's \`rowId\`), so the
-- tail after the FIRST colon is Google's own id, read rather than matched. A row
-- with no colon is not a Google calendar row and is left alone.
UPDATE knowledge_sources
   SET event_id = substr(origin_row_id, instr(origin_row_id, ':') + 1),
       event_id_from = 'origin'
 WHERE origin_table = 'google_calendar'
   AND event_id IS NULL
   AND origin_row_id IS NOT NULL
   AND instr(origin_row_id, ':') > 0
   AND length(substr(origin_row_id, instr(origin_row_id, ':') + 1)) > 0;

-- ROUTE 'meeting' — the source mirrors a meeting, and a meeting has carried
-- \`google_event_id\` since 0012. An ID join, never a title one.
UPDATE knowledge_sources
   SET event_id = (SELECT m.google_event_id FROM meetings m WHERE m.id = knowledge_sources.origin_row_id),
       event_id_from = 'meeting'
 WHERE origin_table = 'meetings'
   AND event_id IS NULL
   AND EXISTS (SELECT 1 FROM meetings m
                WHERE m.id = knowledge_sources.origin_row_id
                  AND m.google_event_id IS NOT NULL AND m.google_event_id <> '');
`,
  },

  {
    // A LOSING CANDIDATE IS STILL A CANDIDATE, AND THE HUNT NOW SAYS SO.
    //
    // 0055/8153a8e5 taught route 1 to read EVERY attachment a calendar entry
    // carries and keep the fullest — a false start and a real transcript are the
    // same shape, so length is what decides. That fixed which ONE file id a
    // meeting quotes. It did not touch the OTHER file ids: the Drive lane mirrors
    // every shared file into `knowledge_sources` on its own, so the document that
    // lost the hunt — Gemini's abandoned three-second stub, sitting beside the
    // hour it actually recorded — goes on existing as its own `document` source,
    // unrelated in the fold's eyes to the meeting whose hunt already read and
    // discarded it.
    //
    // `superseded_transcript_ids` is the file ids of every OTHER candidate a
    // hunt for THIS meeting has ever read words out of and not chosen — the
    // losers of `fromAttachments`'s own contest, plus (on a refresh) whichever
    // file id `transcript_file_id` is about to stop being. Comma-joined text, not
    // JSON: a Drive file id never carries a comma, and every reader of this
    // column only ever asks "is X in here", never "give me the list back
    // ordered". NULL means "none", exactly like every other optional mirror
    // column on this table.
    //
    // It is written ONLY where the winner already is — `meetings.ts`'s two
    // transcript-writing statements — so it costs no new door and no new write
    // path, and it is read in exactly one place: `readFoldTargets`
    // (knowledge-google.ts) widens the SAME set `transcript_file_id` already
    // feeds, so the existing ID-join fold retires a runner-up exactly as it
    // retires the winner's own duplicate — no new fold logic, a wider set for
    // the one that already exists.
    version: "0071_a_losing_candidate_is_still_a_candidate",
    sql: `
ALTER TABLE meetings ADD COLUMN superseded_transcript_ids TEXT;
`,
  },

  {
    // THE APP AND THE WAVE GET THEIR NUMBER — the last two kinds still wearing
    // nothing, on the client's own instruction, 9 Sep 2026, verbatim: "number
    // them. i already gave you the list of the order for exisitng apps!"
    //
    // ── WHAT WAS ACTUALLY MISSING ──────────────────────────────────────────
    //
    // 0059 gave `apps` and `waves` a `ref` column and a partial unique index and
    // said, in its own words, that "existing rows get none — there is nothing to
    // mint one FROM after the fact". 0068 then carried every OTHER kind to the
    // formula, and could not help these two either: its whole plan starts at
    // `WHERE ref IS NOT NULL`, so a column that is null on every row is a table
    // it correctly skips. Measured on staging 9 Sep 2026, the team holding real
    // client data: 28 apps, 28 nulls; 3 waves, 3 nulls; and no `A` or `W` row in
    // `team_ref_counters` at all. Every other kind reads back clean — T to 3650,
    // B to 285, S to 102, M to 45, I to 1, each with a counter one past it.
    //
    // So this is a FIRST MINT and not a carry, and that difference decides three
    // things: nothing is renumbered, nothing is retired, and NOT ONE ROW GOES
    // INTO `ref_aliases`. There is no old string to remember. An alias row with
    // nothing on its left-hand side would be a lie in the one table whose whole
    // job is to be believed.
    //
    // ── THE ORDER IS THE CLIENT'S, AND POSITION IS THE NUMBER ──────────────
    //
    // `APP_ORDER_2026_09_01` below is her list as given, 29 entries, and its
    // 1-based position IS the number: entry 1 is `A0001`, entry 22 is `A0022`.
    // It is not a counter and it is not a sort — it is a lookup table, so a
    // position whose app is missing leaves a GAP and the numbers either side of
    // it do not move. Closing a gap would renumber the apps after it, which is
    // the one thing her instruction forbids: she gave an order, not a count.
    //
    // MATCHED ON (app name, account name), BOTH, NEVER THE NAME ALONE. Two live
    // apps are called `Fuhrpark` and only the account tells them apart — she
    // named both explicitly, HOGO at #19 and DEMO at #25. A name-only match
    // would put one of them on the other's number with no way to tell which, so
    // the plan below joins `accounts` and additionally REFUSES any entry whose
    // (name, account) pair does not identify exactly one unnumbered app. That
    // guard is what makes the Fuhrpark case provable rather than lucky.
    //
    // ── THE TWO ENTRIES THAT MATCH NOTHING, AND WHY THEY ARE STILL HERE ────
    //
    // Her list has 29 entries; the database has 28 apps; and the residue is not
    // one-for-one. Diagnosed individually against live staging on 9 Sep 2026:
    //
    // ── #28 IS ANSWERED, AND THIS ENTRY WAS AMENDED RATHER THAN SUPERSEDED ──
    //
    // She replied the same day, 9 Sep 2026, verbatim: "Yes, what we now call
    // Platinum (this is the current name) is what we before called Kennogroup."
    // So position #28 IS the app the PLATINUM account holds, and the paragraph
    // below — which refused to guess it — is kept word for word because it is
    // the record of what was and was not known before she said so.
    //
    // AN EDIT TO A SHIPPED MIGRATION IS NORMALLY A LIE, and the header of this
    // file says so in its second load-bearing sentence: `migrateTeams` applies
    // these in sequence from wherever a team has reached, so a team that has run
    // 0072 will never run it again and an edit here would be invisible to it.
    // That is why the amendment had to be established rather than assumed, and
    // this is how: **0072 exists only on this branch.** It was introduced by the
    // HEAD commit (`f29755be`, 9 Sep 2026) and `origin/main`'s copy of this
    // ledger still ends at `0071_a_losing_candidate_is_still_a_candidate`. The
    // robot is not a tool, it is the DEPLOYED tenancy worker applying the list
    // BUNDLED INTO IT (scripts/check-team-migrations.mjs writes that lesson out
    // at length — it is the deadlock of 27 Aug 2026), and no deployed tenancy
    // has ever carried this entry. A worker that has never heard of 0072 cannot
    // have run it, on staging or anywhere else. `npm run migrations:check --
    // staging` reads `teams.schema_version` off the core database and will say
    // the same thing out loud for anyone who wants it from the estate rather
    // than from the history.
    //
    // WHICH NAME THE MATCH IS WRITTEN AGAINST. Her sentence says the app is NOW
    // called Platinum; the diagnosis below found the row still called `ERP
    // Kennogroup` on the morning of the same day, with `updated_at` NULL. Both
    // can be true — "what we call it" is not "what the row says" — and the
    // difference is not something this file may guess at, so the entry names
    // BOTH (`alsoKnownAs`) and lets the guards decide. The COUNT(*) = 1 test is
    // widened with the match, so if that account ever holds one app under each
    // name the pair identifies two rows and numbers neither, exactly as it does
    // for the two Fuhrparks. There is no spelling of this that numbers the wrong
    // app: the worst case is the gap we already had.
    //
    //   #28 "Platinum" (account PLATINUM) — the ACCOUNT called PLATINUM exists
    //       and holds exactly one app, which is named `ERP Kennogroup`. That app
    //       has `updated_at` NULL and not a single `activity` row: it has been
    //       called `ERP Kennogroup` since the 13 Aug 2026 import, a fortnight
    //       BEFORE she wrote the list, so it was never renamed and "Platinum" is
    //       not a name it has ever worn. There is a chat space called "Platinum"
    //       in this team, shared with everyone twice in late August, and that is
    //       the only other thing in the database wearing the word.
    //   #29 "Players" (account Padelbase) — no app anywhere is called `Players`,
    //       and none ever was. What IS called `Players` is an app MODULE, and
    //       there are two of them, one inside `Padelbase` and one inside
    //       `Academy` — both apps she had already listed at #9 and #24.
    //
    // #29 SETTLES #28. If the list were 29 apps, "Platinum" would be a safe read
    // for the one app left over. But #29 is demonstrably NOT an app, which means
    // the list is not a list of apps only — so "the one entry left must be the
    // one app left" stops being arithmetic and becomes a guess, and the guess
    // would be printed on a client-facing record forever. `ERP Kennogroup`
    // therefore ended the FIRST draft of this migration with no number, and the
    // honest question went back to her: is #28 the system we hold as "ERP
    // Kennogroup"? One sentence from her turns into one number; a wrong number
    // does not come back. **She said yes** — see the amendment above, which is
    // where #28 now gets its number and why an edit to this entry is honest.
    // #29 IS STILL UNANSWERED AND STILL UNNUMBERED, and the argument above is
    // unchanged for it: it is demonstrably not an app, so nothing may be
    // inferred into it. A0029 stays unissued.
    //
    // BOTH ENTRIES ARE NEVERTHELESS TRANSCRIBED BELOW, at their own positions,
    // and #29's still matches nothing because the SQL requires an exact (name,
    // account) pair. Dropping either from the list would silently shorten it and
    // move every position after it; leaving them in records what she actually
    // said, and costs a comparison.
    //
    // ── THE COUNTER, AND WHY IT IS PARKED PAST THE WHOLE LIST ──────────────
    //
    // Two statements raise `A`, and both only ever go UP (`MAX`, the rule 0068
    // wrote down):
    //
    //   1. to one past the highest number now stored, so the next app minted
    //      cannot collide with `idx_apps_ref`. This is 0068's statement 3,
    //      unchanged, and it is the one that matters on a team this list has
    //      nothing to do with — the smoke team already holds A0001 and A0002,
    //      minted through the door, and its counter must stay at 3.
    //   2. to one past the LENGTH OF HER LIST, but ONLY on a team where this
    //      migration actually numbered something from it. Without this the next
    //      app created here would mint a number she has already spoken for.
    //      IT IS STILL 30 NOW THAT #28 IS FILLED, and that is the property to
    //      re-check whenever this list is touched: the floor is the list's
    //      LENGTH plus one, and answering a position does not change how many
    //      positions there are — 29 entries, `A0030` reserved, before and after.
    //      What changed is which floor binds: statement 1 now reaches A0029
    //      (one past the highest number stored) instead of A0028, and 30 is
    //      still the higher of the two, so #29 stays hers until she answers.
    //      A burnt number costs nothing (gaps are already the correct outcome
    //      here) while a stolen position costs the order she dictated.
    //
    // ── WAVES HAD NO ORDER, SO THEY GET THE OBJECTIVE ONE ──────────────────
    //
    // Waves are not in her list at all. They are numbered by the same rule 0068
    // uses everywhere it has to choose for itself — oldest `created_at` first,
    // tie-broken on `id` — which is stable across re-runs and depends on nothing
    // a person remembers. On staging that produced W0001 `probe wave A
    // (renamed)`, W0002 `Autumn automation package (example)`, W0003 `Test
    // draft`, all three created 25 Aug 2026.
    //
    // ── WHY THERE IS A SCRATCH TABLE ───────────────────────────────────────
    //
    // 0068 learned this the hard way and wrote it down: a window function
    // seating rows in the table it is writing to has no defined answer. So the
    // plan is computed into `_numbering_0072` first and the two UPDATEs read
    // their answer back out of it, exactly as 0068 reads its answer out of the
    // alias rows it wrote a statement earlier. The table is created IF NOT
    // EXISTS and emptied on entry (so a run that died half way is not a wedge)
    // and dropped on the way out, so it is invisible to every schema census —
    // including R55's own, which scans this ledger for `ref TEXT` columns.
    //
    // ── IDEMPOTENT, AND SILENT ON A NEWBORN TEAM ───────────────────────────
    //
    // Every plan is gated on `ref IS NULL`, so a second run finds nothing to do:
    // the UPDATEs match no rows, the scratch table stays empty, and the counter
    // statements are `MAX`-ed against what is already there. A fresh database
    // replaying the whole ledger has no apps and no waves, so `HAVING COUNT(*) >
    // 0` leaves it with no counter rows at all — the state R55 asserts a newborn
    // team must come out in.
    version: "0072_the_app_and_the_wave_get_their_number",
    sql: appAndWaveNumberSql(),
  },
  {
    // BUILD-5-knowledge-rebuild.md, LANE A. The team-database shape the
    // rebuild's other lanes are built on: one identity per thing, who saw it
    // and where, chat/meeting grain on a chunk, the account/app/contact alias
    // index, and BM25 over chunk text. Nothing here is read by anything yet
    // (Lanes B–F wire the ingest, the index and the screens); this migration
    // only has to be a shape those lanes can build on without a second one.
    //
    // ── ONE IDENTITY PER THING (KB-AUDIT.md §1, "multi-person duplicates") ──
    //
    // `origin_row_id` is `<readerUserId>:<externalId>` for every Google-sourced
    // row (see 0070's header), which is why the same Drive file shared with
    // two people has always filed as two `knowledge_sources` rows. `identity_key`
    // is the OTHER half — Google's own id, a message id, an event id, or a
    // content hash for a typed note — with the reader stripped out, so ONE row
    // exists per thing regardless of how many people have seen it. The unique
    // index enforces that at write time rather than trusting the ingest to dedupe
    // itself; `WHERE identity_key IS NOT NULL` because SQLite already treats
    // every NULL as distinct, and a typed note with no external identity has
    // nothing to collide over. Who saw it, where, and when moves to
    // `knowledge_sightings` below — a second reader is a second sighting, never
    // a second source.
    //
    // ── accounts[] / apps[] (KB-AUDIT.md §1, "one copy tagged with every
    //    account/app it concerns") ─────────────────────────────────────────
    //
    // `account_id` (0012) and `app_id` (0020) are each ONE reference — right for
    // a mirrored record, wrong for a shared Drive file or a chat thread that
    // concerns several accounts or apps at once. `accounts`/`apps` are JSON
    // arrays of ids, additive: the singular columns are untouched, and reading
    // either shape is Lane B/C's decision, not this migration's.
    //
    // ── shared_with, separate from owner_user_id ───────────────────────────
    //
    // `owner_user_id` (0012) already answers "whose SIGHT of it is this" — NULL
    // for the team's, a value for one person's personal Google connection — and
    // is left exactly as it was. `shared_with` answers a DIFFERENT question the
    // plan's owner ≠ shared-with ruling asked for: who may READ it once it's in
    // — 'private' (the owner alone), 'agency' (every agency role that can read
    // the module), or 'agency_client' (the account's own portal login too, once
    // the portal door in §5 of the plan exists). Defaulting new rows to 'agency'
    // matches the ruling's other half: Gmail is shared with the agency by
    // default, and nothing here narrows a room that used to be open.
    //
    // ── relevancy_date ──────────────────────────────────────────────────────
    //
    // The plan's own definition: happened-at for a frozen thing (a meeting, a
    // sent email), last-change for a living one (a Drive doc, a ticket mirror).
    // Which of a source's several dates that resolves to is an ingest decision
    // (Lane B); the column just gives it somewhere to live that isn't
    // overloading `created_at` (audit metadata) or `record_date` (0020, the
    // mirrored record's own single date field, kept for what it already means).
    version: "0073_the_knowledge_base_is_rebuilt",
    sql: `
ALTER TABLE knowledge_sources ADD COLUMN identity_key TEXT;
ALTER TABLE knowledge_sources ADD COLUMN accounts TEXT NOT NULL DEFAULT '[]';
ALTER TABLE knowledge_sources ADD COLUMN apps TEXT NOT NULL DEFAULT '[]';
ALTER TABLE knowledge_sources ADD COLUMN shared_with TEXT NOT NULL DEFAULT 'agency';
ALTER TABLE knowledge_sources ADD COLUMN relevancy_date TEXT;

CREATE UNIQUE INDEX idx_knowledge_sources_identity ON knowledge_sources (identity_key) WHERE identity_key IS NOT NULL;

-- ONE PERSON'S SIGHT OF ONE THING, FROM ONE PLACE. The row a second (or
-- third) reader of one Google item gets, now that \`identity_key\` above means
-- they no longer get a second \`knowledge_sources\` row of their own. Shaped
-- against Lane B's own \`Sighting\` type ({ userId, shelf: 'private'|'team',
-- goneAt }, \`knowledge-identity.ts\` — named by basename only, R58: the file
-- ships on Lane B's own branch, not yet merged as this migration lands, and a
-- comment pointing at the full path would be a path that is not there). This
-- table carries one column beyond that type, \`seen_where\` — read below for why
-- that is not a contradiction.
--
-- TWO FACTS THAT LOOK LIKE ONE AND ARE NOT. \`seen_where\` is a PLACE — which
-- Drive folder, which mailbox, which space a sweep found the thing in.
-- \`shelf\` is a VISIBILITY — private or team — and it is the FENCE:
-- \`readableBy\` gates on it, not on where something sits. One column cannot
-- hold both without losing one of the two facts, and the second draft of this
-- migration made exactly that mistake — collapsing \`seen_where\` into
-- \`shelf\` on the reasoning that B1's TS type only names one of them. It does,
-- because \`identityKey()\`/\`readableBy()\` only ever need the fence; the PLACE
-- is read and written by the ingest lane that fills this table, never by the
-- fence logic, which is why it does not appear in the type Lane B showed and
-- is still a real column this schema needs. The same person can see the same
-- source from two different places (a shared Drive folder AND a direct email
-- share, say), and that is two sightings worth keeping, not a duplicate to
-- collapse — which is also why \`seen_where\` sits inside the unique index
-- below rather than beside it.
--
-- \`shelf\` is folding what \`knowledge_sources.owner_user_id\` used to answer
-- alone (NULL = team, a value = one person's) onto the SET of a source's
-- sightings instead — necessary the moment one source can hold two people's
-- rows, because a single column can no longer carry two people's different
-- answers (Aurora filed a folder privately; Alex filed the same folder as the
-- team's). \`readableBy\`/\`stillLive\` decide from the whole set: some live
-- sighting on the team shelf, or one that is the caller's own — the same set
-- \`owner_user_id IS NULL OR = me\` used to return, proved equivalent by Lane
-- B's own test rather than asserted here. CHECK-constrained to the type's own
-- two values, matching this file's own precedent (\`account_type\`, 0007).
--
-- \`gone_at\` is when this person stopped being able to see it (un-shared,
-- left the space, removed from the team) — stamped, never deleted (deactivate
-- never delete, CLAUDE.md), so "she never saw it" and "she saw it until
-- Tuesday" stay different answers, and so \`liveSightings\`/\`stillLive\` have a
-- column to filter on at all. Without it a sighting can be recorded but never
-- retired, and the owner's own tracker item — a removed source or sighting
-- drops out of answers within one sweep — has nowhere to write its ending.
--
-- \`seen_by_user_id\` is NOT NULL: a sighting is BY DEFINITION somebody's own
-- sight of something, never a team-wide anonymous one. Material nobody
-- personally saw (a ticket, an account, any of the app's own mirrored
-- records) has ZERO sighting rows, not one anonymous one — its readability
-- keeps coming from the source row exactly as it always did. That is what
-- makes the unique index below a real guarantee rather than a courtesy:
-- every column in it is NOT NULL, so SQLite's NULL-is-distinct rule (the
-- caveat \`identity_key\`'s partial index above exists to route around) never
-- comes into play here at all.
CREATE TABLE knowledge_sightings (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES knowledge_sources (id),
  seen_where TEXT NOT NULL,
  seen_by_user_id TEXT NOT NULL,
  shelf TEXT NOT NULL CHECK (shelf IN ('private', 'team')),
  seen_at TEXT NOT NULL,
  gone_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_knowledge_sightings_source ON knowledge_sightings (source_id);
CREATE UNIQUE INDEX idx_knowledge_sightings_unique ON knowledge_sightings (source_id, seen_where, seen_by_user_id);

-- CHAT/MEETING GRAIN (KB-AUDIT.md §4.9's "chunk 47 has no idea which meeting
-- it is from", and the plan's "chat = who said what when"). \`context_line\` is
-- the cheapest-model-written sentence that situates a chunk in its document —
-- Lane B writes it, this just gives it a column. \`speaker\`/\`said_at\` are the
-- per-message identity a chat/transcript chunk carries when it is a run of
-- messages rather than prose; both NULL for an ordinary document chunk.
ALTER TABLE knowledge_chunks ADD COLUMN context_line TEXT;
ALTER TABLE knowledge_chunks ADD COLUMN speaker TEXT;
ALTER TABLE knowledge_chunks ADD COLUMN said_at TEXT;

-- THE NAME INDEX — accounts, apps, contacts, colleagues, aliases and
-- misspellings, replacing \`accountNamedIn\` (KB-AUDIT.md §4.2: single-token
-- account names like "VU Solutions" → "solutions" hijacking ordinary
-- questions). \`ref_id\` is the id of the named thing under \`kind\`; \`alias_of\`
-- is NULL on the canonical name and the canonical name's own text on every
-- alias, so a reader never has to walk a second table to resolve one. Scoped
-- by \`compartment\`, the same fence every other knowledge table carries, so a
-- name index lookup can never leak which accounts exist across a fence it has
-- no right to see. The unique index is the one honest guarantee this
-- migration can make on its own: alias GENERATION (which spellings exist at
-- all) is Lane C's job, not this table's.
CREATE TABLE knowledge_names (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  ref_id TEXT NOT NULL,
  name TEXT NOT NULL,
  alias_of TEXT,
  compartment TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_knowledge_names_ref ON knowledge_names (kind, ref_id);
CREATE INDEX idx_knowledge_names_name ON knowledge_names (name);
CREATE UNIQUE INDEX idx_knowledge_names_unique ON knowledge_names (kind, ref_id, name);

-- BM25 OVER CHUNK TEXT (KB-AUDIT.md §4.4 — \`knowledge_terms\`'s raw
-- term-frequency scorer has no IDF, so the finding that "hybrid search hurts
-- here" was measured against something that isn't BM25). FTS5's own bm25()
-- replaces that scorer; \`knowledge_terms\` itself is untouched by this
-- migration — Lane C reads from the new table and retires the old one once
-- the new arm is measured, so a re-index mid-rollout still has a working
-- lexical arm either way.
--
-- EXTERNAL-CONTENT MODE, NO TRIGGERS. \`content_rowid='knowledge_chunks'\` ties
-- every fts row to \`knowledge_chunks.rowid\` instead of storing the text
-- twice, and the KEYED delete (\`INSERT INTO knowledge_chunks_fts
-- (knowledge_chunks_fts, rowid, text) VALUES ('delete', ?, ?)\`) is the fix
-- KB-AUDIT.md §4.4 names for the old design's actual complaint — a re-index
-- was a scan of every posting in the team, and a keyed delete by rowid is one
-- row. What it is NOT is trigger-synced, on purpose: this repo's own migration
-- executor (\`splitStatements\`, shared/workers/d1-rest.ts) splits a script on
-- every un-quoted \`;\` with no idea a \`CREATE TRIGGER … BEGIN … END;\` body's
-- internal semicolons are not statement boundaries, so a trigger written here
-- would parse and run fine against node:sqlite in a test and then shatter
-- into broken fragments the first time \`migrateTeams\` tried to apply it for
-- real. Application code (Lane C) keeps this table in step, the same way
-- \`knowledge_terms\` always was.
CREATE VIRTUAL TABLE knowledge_chunks_fts USING fts5(
  text,
  content='knowledge_chunks',
  content_rowid='rowid'
);

-- Backfills whatever this team already holds, so a team migrated mid-rollout
-- (before Lane C's rebuild script runs) still has a searchable index rather
-- than a silently empty one.
INSERT INTO knowledge_chunks_fts(rowid, text) SELECT rowid, text FROM knowledge_chunks;
`,
  },
  {
    // FINDABLE, BUT NOT QUOTABLE (KB-AUDIT.md §4.3 — templated record mirrors
    // eating answer slots; a person/account/contact stub winning a passage
    // slot over somebody's actual words). Three designs were tried and
    // failed before this column, worth recording because the failures are
    // what prove a column is the right shape rather than a convenience:
    //
    //   1. A CENSUS ("every live source of this kind produces exactly one
    //      short chunk") measured 2,589 of 3,933 sources, 1,309 of them
    //      tickets — a short ticket is not a stub, so length alone cannot
    //      tell the two apart.
    //   2. A KIND-LEVEL FLAG ("declare person/account/contact as card-only
    //      kinds") turned out false on inspection: every kind the audit
    //      named has a reader that folds in real free text a person wrote
    //      (person: headline/strengths/weaknesses; account: about plus its
    //      apps/sprints/tickets by name; task: detail and logged-time
    //      notes). The audit's stubs were rows where those fields happened
    //      to be EMPTY, not a property of the kind. Only \`dropdown\` and
    //      \`portal_login\` fold no free text at all — 22 of 3,933 live
    //      sources — so a kind-level flag would read as "the audit's
    //      complaint is fixed" while leaving it exactly where it was.
    //   3. So: card-ness is a property of the ROW, decided by the READER,
    //      at the moment it builds the body — the only moment "did this row
    //      say anything beyond the sentence the app generated for it" is
    //      still a fact anybody holds. Once the two halves are joined into
    //      one body string they are indistinguishable, and nothing
    //      downstream (chunking, embedding, a later re-read of the row) can
    //      recover which case a given source was. THAT is why this cannot
    //      be derived later, by a census or by anything else — it has to be
    //      recorded at ingest or not at all.
    //
    // DEFAULT 0 is the safe direction, not a guess: a wrong 0 (a real stub
    // marked quotable) costs one weak answer slot — the pre-existing bug,
    // unchanged. A wrong 1 (real material marked generated-only) SILENTLY
    // stops a person's own words from ever being quoted, which is worse and
    // invisible. So every row that predates this column, and every kind's
    // reader until it is taught to set the flag, reads as quotable — the
    // behaviour this base already has today, not a new restriction imposed
    // by a column nobody has wired up yet.
    //
    // Plain INTEGER NOT NULL DEFAULT 0, no CHECK: this schema's own 0/1
    // boolean convention throughout (role_permissions.can_read, 0007;
    // dropdown_values.is_default, 0001), never constrained beyond the type.
    version: "0074_findable_but_not_quotable",
    sql: `
ALTER TABLE knowledge_sources ADD COLUMN generated_only INTEGER NOT NULL DEFAULT 0;
`,
  },
  {
    // THE FENCE THE FOLD CANNOT SHIP WITHOUT (kb_B1's analysis, hub tick 8).
    //
    // Retrieval's compartment fence reads \`owner_user_id\` straight off
    // \`knowledge_chunks\`/\`knowledge_terms\` today: NULL means the team's, a
    // value means one person's — a single column answering a question about
    // ONE person's sight of a source. 0073 folded the multi-person duplicate
    // so two people's DIFFERENT answers about the same source both have
    // somewhere to live (\`knowledge_sightings\`, one row per person, each
    // with its own \`shelf\`) — which is exactly what makes a single
    // \`owner_user_id\` column on the chunk unable to answer for a folded
    // source any more: whichever sighting last touched it would silently
    // decide the OTHER person's visibility too.
    //
    // \`team_visible\` is the team half of \`readableBy\`'s two conditions
    // (knowledge-identity.ts, fix/kb-gate) — true when SOME live sighting
    // (\`gone_at IS NULL\`) sits on the 'team' shelf — denormalised onto the
    // chunk and its terms for the same reason \`compartment\`/\`owner_user_id\`
    // already are: retrieval's first stage has to be a single-table read.
    //
    // ── WHAT THIS MIGRATION DOES AND DOES NOT DO ───────────────────────────
    //
    // It adds the column and backfills it from the ONLY fact available at
    // this moment — every existing row's own \`owner_user_id\`, because no
    // source has been folded yet and \`knowledge_sightings\` holds nothing to
    // read instead. That backfill is proved to preserve the exact population
    // \`owner_user_id IS NULL\` already returns (see the migration test) —
    // nothing gains or loses team visibility AT THE MIGRATION BOUNDARY.
    //
    // It does NOT keep the flag correct AFTER a fold, and cannot: the moment
    // a source gains a second sighting, or a sighting's \`shelf\`/\`gone_at\`
    // changes, \`team_visible\` is a claim about a fact that just moved. That
    // recompute is the write path's job (kb_B1's — the read/write side this
    // migration was commissioned beside), and it is a REQUIREMENT ON THAT
    // CODE rather than something SQL here can enforce: every write that
    // touches a sighting's \`shelf\` or \`gone_at\` must recompute
    // \`team_visible\` for every chunk/term of that sighting's source in the
    // SAME statement or transaction, never a follow-up write that can be
    // skipped or fail independently. (Same reason this is not a trigger as
    // every other denormalised-copy column in this file is not one — see
    // 0073's \`knowledge_chunks_fts\` header for why a trigger cannot even be
    // expressed through this repo's own migration executor. Here the
    // reason is sharper still: the source of truth for a recompute is
    // ANOTHER table's SET of rows, which a single-row \`BEGIN...END\` trigger
    // body cannot aggregate over even where triggers work at all.) A test
    // that recomputes \`team_visible\` from \`knowledge_sightings\` across a
    // whole corpus and asserts equality is what keeps that promise honest —
    // kb_B1's, not this file's, because it has to run against the sightings
    // the write path actually produced.
    //
    // ── THE DEFAULT IS THE OPPOSITE DIRECTION FROM 0074's, ON PURPOSE ──────
    //
    // 0074's \`generated_only\` defaults to 0 (quotable) because a forgotten
    // flag there should not silently withhold a person's own words. Here a
    // forgotten flag should not silently WIDEN who can read something, so
    // the safe default flips: 0 (NOT team-visible, private) is the direction
    // that costs a missed answer rather than an over-shared one for any row
    // written by code that has not yet been taught to set this column.
    version: "0075_the_fence_the_fold_cannot_ship_without",
    sql: `
ALTER TABLE knowledge_chunks ADD COLUMN team_visible INTEGER NOT NULL DEFAULT 0;
ALTER TABLE knowledge_terms ADD COLUMN team_visible INTEGER NOT NULL DEFAULT 0;

UPDATE knowledge_chunks
   SET team_visible = 1
 WHERE owner_user_id IS NULL;

UPDATE knowledge_terms
   SET team_visible = 1
 WHERE owner_user_id IS NULL;
`,
  },
  {
    // THE SOURCE'S OWN team_visible — 0075 gave the fence's team half to
    // \`knowledge_chunks\` and \`knowledge_terms\`, the two tables retrieval
    // reads from, and missed the table the flag is actually COMPUTED against.
    // \`knowledge_sightings\` is keyed to \`knowledge_sources\`, not to a chunk
    // or a term, so kb_B1's write path needs a home on the SOURCE to stamp
    // \`team_visible\` from the sightings SET before it can denormalise that
    // same value down onto every chunk and term the source owns. Without this
    // column the source itself never learns its own fence, and 0075's two
    // copies would have nothing correct to be copies OF once a real fold runs.
    //
    // Not folded into 0075 because 0075 already merged (\`main\`) before this
    // gap surfaced — the ledger is append-only, so the fix is a new entry,
    // never an edit to a shipped one.
    //
    // **THREE THINGS THAT MUST STAY TRUE, each a conclusion somebody will
    // otherwise reverse as an optimisation** (restated here because this is
    // where a reader following \`knowledge_sources.team_visible\` will land,
    // and 0075's own comment is now only half the story):
    //
    //   1. team_visible IS A NARROWING AID, NEVER THE AUTHORITATIVE ANSWER.
    //      The real fence is \`readerClause = ownerClause AND appClause\`
    //      (workers/content, knowledge.ts:602) — THREE settings, not two:
    //      private (\`owner_user_id\`), APP (\`knowledge_sources.visible_to_app_id\`,
    //      riding \`app_staff\`), and team. \`team_visible\` only ever models the
    //      OWNER half. The authoritative check is still the read-back JOIN to
    //      \`knowledge_sources\` that applies \`appClause\` (\`readerClause\`'s own
    //      doc comment makes exactly this argument already, in R26's words:
    //      the index — and now this flag — narrows, the team's database
    //      decides) — an optimiser who trusts this flag alone and drops that
    //      join silently bypasses the app fence.
    //   2. \`knowledge_terms.team_visible\` (0075) is DELIBERATELY the owner
    //      half only, with no app-tier column beside it, inheriting exactly
    //      the asymmetry \`knowledge_terms.owner_user_id\` already has and
    //      \`readerClause\`'s own comment defends: a restricted chunk may
    //      reach the candidate pool through its terms and cost a relevant
    //      passage its ranking slot, but it cannot reach an answer, because
    //      the chunk-level join still applies the full fence before anything
    //      is read back.
    //   3. THIS DOES NOT FORECLOSE \`visible_to_app_id\`'s OWN FOLD PROBLEM,
    //      still open: two sources merging, one app-restricted and one not,
    //      is a second one-column-two-values fault the same shape as
    //      \`owner_user_id\`'s, one column over — measurement in progress
    //      (kb_B1). This column says nothing about how that merge resolves
    //      and does not need to change once it is decided.
    //
    // Backfilled the same way 0075 backfilled the other two — from the only
    // fact available before any fold has run, \`owner_user_id IS NULL\` —
    // proved (migration test) to preserve exactly today's population.
    // Default 0 for the same reason as every column in this pair: the safe
    // direction costs a missed answer, never an over-shared one.
    version: "0076_the_source_gets_its_own_team_visible",
    sql: `
ALTER TABLE knowledge_sources ADD COLUMN team_visible INTEGER NOT NULL DEFAULT 0;

UPDATE knowledge_sources
   SET team_visible = 1
 WHERE owner_user_id IS NULL;
`,
  },
]

/** 0068's SQL, WRITTEN OUT OF THE KIND MAP RATHER THAN TYPED SEVEN TIMES.
 *
 * Seven kinds, three statements each, and the only thing that differs between
 * one kind's three and another's is a table name and a letter. Typed out, that
 * is 21 statements holding the same arithmetic 21 times, and the failure mode is
 * not "somebody makes a typo" — it is the one this whole migration is repairing:
 * a rule spelled in several places, one of which is later edited alone. So the
 * kinds come from `TEAM_REF_TABLES` and the arithmetic from `refs.ts`'s own SQL
 * twins, which are the same functions R55 checks the TypeScript formula against.
 *
 * A GENERATED MIGRATION IN AN APPEND-ONLY LEDGER, said plainly, because it is a
 * real trade and the header two hundred lines up forbids editing history. Adding
 * an eighth kind to `TEAM_REF_TABLES` tomorrow WOULD change this string, and a
 * team that already ran 0068 would never see the new kind's clauses. That is
 * survivable and it is not luck: an eighth kind is a table that has just gained a
 * `ref` column, so it has no old-shaped rows to carry, and its own migration is
 * where its own backfill would belong. What must NOT happen is the eighth kind
 * arriving unnoticed, and that is R55's census — a table with a `ref` column and
 * no place in the map turns the build red.
 *
 * @param version the migration's own name, stamped on every alias row so the
 *   act that retired a reference is recoverable from the data rather than from
 *   a changelog.
 */
function refBackfillSql(version: string): string {
  const now = `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`
  const kinds = (Object.keys(TEAM_REF_TABLES) as (keyof typeof TEAM_REF_TABLES)[]).map((name) => ({
    table: TEAM_REF_TABLES[name],
    kind: TEAM_REF_KINDS[name],
  }))

  /** THE PLAN FOR ONE TABLE: every stale row, and the number it ends up with.
   *
   * `src`    every row that has a reference at all, with the trailing number it
   *          carries — see `refNumberSql` for why that is read off the END of
   *          the string and the account prefix is never parsed.
   * `canon`  the rows already wearing the shape the formula makes. On staging
   *          this is empty everywhere except the smoke team, but a team that has
   *          minted since 0059 has some, and their numbers are TAKEN.
   * `stale`  everything else — what this migration is for.
   * `seated` stale rows ranked within their wanted number, oldest first. The
   *          window function is the collision resolver: seat 1 is the one row
   *          that may keep that number.
   * `kept`   seat 1, where the number is real (> 0, so a reference with no
   *          digits at all cannot claim "0") and not already taken by a
   *          canonical row.
   * `mark`   the high-water mark nothing may be reissued below: the highest
   *          canonical number, the highest kept number, and the counter's own
   *          position, whichever is greatest. The counter is in there because a
   *          team can have minted numbers whose rows are gone — staging's ticket
   *          counter reads 168 with no row to show for it — and reissuing under
   *          it would hand out a number twice.
   * `lost`   everyone else, numbered from the mark upwards in creation order.
   */
  const plan = (table: string, kind: TeamRefKind) => `
WITH src AS (
  SELECT id, ref, created_at, ${refNumberSql("ref")} AS n
    FROM ${table} WHERE ref IS NOT NULL AND ref <> ''
),
canon AS (SELECT n FROM src WHERE ref = ${canonicalRefSql(kind, "ref")}),
stale AS (SELECT * FROM src WHERE ref <> ${canonicalRefSql(kind, "ref")}),
seated AS (
  SELECT s.*, ROW_NUMBER() OVER (PARTITION BY s.n ORDER BY s.created_at ASC, s.id ASC) AS seat
    FROM stale s
),
kept AS (SELECT id, ref, n FROM seated WHERE n > 0 AND seat = 1 AND n NOT IN (SELECT n FROM canon)),
mark AS (
  SELECT MAX(hw) AS hw FROM (
    SELECT COALESCE((SELECT MAX(n) FROM canon), 0) AS hw
    UNION ALL SELECT COALESCE((SELECT MAX(n) FROM kept), 0)
    UNION ALL SELECT COALESCE((SELECT next_no - 1 FROM team_ref_counters WHERE kind = '${kind}'), 0)
  )
),
lost AS (
  SELECT id, ref,
         (SELECT hw FROM mark) + ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS n
    FROM seated WHERE id NOT IN (SELECT id FROM kept)
),
plan AS (
  SELECT id, ref AS was, ('${kind}' || printf('%04d', n)) AS becomes FROM kept
  UNION ALL
  SELECT id, ref AS was, ('${kind}' || printf('%04d', n)) AS becomes FROM lost
)`

  const perKind = kinds
    .map(
      ({ table, kind }) => `
-- ${table} · kind ${kind} ────────────────────────────────────────────────────
-- 1 · REMEMBER THE NAME FIRST. Nothing below may run before this: once the
--     column is overwritten the old string is gone, and it is the only thing
--     that makes the rewrite reversible in the sense that matters — a person
--     can still find the record by what they were told to quote.
${plan(table, kind)}
INSERT OR IGNORE INTO ${REF_ALIAS_TABLE}
  (entity_table, alias, row_id, kind, replaced_by, retired_at, source)
SELECT '${table}', was, id, '${kind}', becomes, ${now}, '${version}' FROM plan;

-- 2 · CARRY THE REFERENCE. Reads its answer out of the alias rows written a
--     statement ago rather than recomputing the plan over the table it is
--     writing to — a window function seating rows in a table that is changing
--     underneath it has no defined answer. Still guarded on staleness, so a
--     re-run after a half-finished one skips what is already done.
UPDATE ${table} SET ref = (
    SELECT ra.replaced_by FROM ${REF_ALIAS_TABLE} ra
     WHERE ra.entity_table = '${table}' AND ra.row_id = ${table}.id AND ra.source = '${version}'
  )
 WHERE ${staleRefSql(kind, "ref")}
   AND id IN (SELECT row_id FROM ${REF_ALIAS_TABLE}
               WHERE entity_table = '${table}' AND source = '${version}');

-- 3 · MOVE THE COUNTER UP TO THE ROWS. \`MAX\` both ways: never below the highest
--     number now stored (which would mint a duplicate against the unique index)
--     and never below where the counter already stands (which would re-mint a
--     number already handed out). \`HAVING COUNT(*) > 0\` so a team with no rows
--     of this kind — every newborn database replaying this ledger — is left
--     without a counter row rather than given one that says nothing.
INSERT INTO team_ref_counters (kind, next_no)
SELECT '${kind}', MAX(${refNumberSql("ref")}) + 1
  FROM ${table} WHERE ref = ${canonicalRefSql(kind, "ref")}
 HAVING COUNT(*) > 0
    ON CONFLICT(kind) DO UPDATE SET next_no = MAX(team_ref_counters.next_no, excluded.next_no);
`
    )
    .join("")

  return `
-- WHAT A RECORD USED TO BE CALLED. One row per retired reference: which table
-- and row it belongs to, the kind it wears now, what replaced it, when, and the
-- act that did it. Rows accumulate — a record renumbered twice has two — which
-- is the half a \`ref_was\` column could not have held.
--
-- THE UNIQUE KEY IS (entity_table, alias) and it is doing two jobs. It makes the
-- alias insert above idempotent, and it is the promise the doors rely on: one
-- old string names at most one record in a table, so a search on it cannot
-- multiply a row (R16 — the count on a paged list has to agree with its page).
--
-- The second index is the one every read actually uses: the doors ask "what has
-- THIS row been called", per row, so (entity_table, row_id) is a seek to the
-- nothing-at-all most rows have. No index on \`alias\` alone: nothing looks a
-- reference up without knowing which collection it is searching, and the
-- ruling of 0061 stands: an index nothing reads is a write cost with no reader.
CREATE TABLE IF NOT EXISTS ${REF_ALIAS_TABLE} (
  entity_table TEXT NOT NULL,
  alias TEXT NOT NULL,
  row_id TEXT NOT NULL,
  kind TEXT,
  replaced_by TEXT,
  retired_at TEXT NOT NULL,
  source TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ref_aliases_alias ON ${REF_ALIAS_TABLE} (entity_table, alias);
CREATE INDEX IF NOT EXISTS idx_ref_aliases_row ON ${REF_ALIAS_TABLE} (entity_table, row_id);
${perKind}`
}

/** 0072's SQL. Why there is a scratch table, why the two kinds are not one
 * recipe, and what becomes of the two positions that match nothing are all
 * argued at the migration itself; this function only has to be the arithmetic.
 *
 * THE FORMULA COMES FROM `refs.ts` AND IS NOT RESPELLED HERE. The apps half can
 * call `canonicalRef` outright — a position is known while this string is being
 * built, so the number is padded by the same TypeScript function the mint uses.
 * The waves half cannot: its number is a `ROW_NUMBER()` that only exists inside
 * SQLite, so it goes through `canonicalRefSql`, the twin R55 proves agrees with
 * `canonicalRef` by running both over the same numbers rather than by reading
 * them. A migration that wrote `'A' || printf('%04d', …)` itself would be a
 * fifth copy of the rule, which is the fault R55 exists for. */
function appAndWaveNumberSql(): string {
  const app = TEAM_REF_KINDS.app
  const wave = TEAM_REF_KINDS.wave
  const APPS = TEAM_REF_TABLES.app
  const WAVES = TEAM_REF_TABLES.wave

  /** ONE STATEMENT PER POSITION, and that is a rule rather than a style.
   *
   * The first draft of this was a single `WITH wanted(…) AS (VALUES …)` holding
   * all 29 rows, which is unremarkable SQL, passes locally, and D1 REFUSES: a
   * multi-row `VALUES` compiles as a compound SELECT and D1's ceiling is five
   * terms, not SQLite's 500. A migration that throws leaves every existing team
   * on the previous schema with the code that needs the new state already
   * deployed — the 12 Aug 2026 incident, and `workers/tenancy/test/
   * d1-compound-cap.test.ts` is the law that caught this one before it shipped.
   *
   * So the list becomes 29 self-contained statements, generated from the array
   * rather than typed, which is what that law prescribes. Each carries its own
   * three guards, so a position that cannot be filled skips itself and takes
   * nothing else down with it. Every string goes through `sqlString`, so an
   * apostrophe in a client's name is data and not syntax.
   *
   * THREE GUARDS, and every one of them is a refusal rather than a repair:
   *   · `a.ref IS NULL` — an app that already carries a number keeps it. A first
   *     mint never overwrites, and this is also what makes the whole migration
   *     idempotent: on a second run there is nothing left to match.
   *   · the COUNT(*) = 1 subquery — an entry may only claim a row when its
   *     (name, account) pair identifies EXACTLY ONE unnumbered app. This is the
   *     Fuhrpark clause: two live apps share that name and only the account
   *     separates them, so "exactly one" is asserted here rather than assumed by
   *     whoever reads the list. A pair matching two rows numbers neither.
   *   · `NOT EXISTS … x.ref = <the wanted number>` — the number this position
   *     names must be free. `idx_apps_ref` is a live partial UNIQUE index, so a
   *     clash would not corrupt anything; it would ABORT this migration and
   *     every team queued behind it. Skipping leaves a gap, which is already the
   *     correct outcome for a position that cannot be filled.
   *
   * INNER JOIN ON `accounts`, not LEFT: an app with no account at all can never
   * be one of these entries, because every entry names an account. */
  const wanted = APP_ORDER_2026_09_01.map((e, i) => {
    const becomes = sqlString(canonicalRef(app, i + 1))
    const account = sqlString(e.account)
    /** THE NAMES THIS POSITION ANSWERS TO — hers first, then any the client has
     * told us is the SAME APP under a different word.
     *
     * ONE ENTRY HAS ONE TODAY (#28) and the reason is written at the entry. An
     * `IN` list rather than a second statement per alias, because two statements
     * could both match and number one app twice under two positions; one
     * statement with a widened name test cannot. And an `IN` over string
     * LITERALS is an expression list, not a compound SELECT — the D1 ceiling
     * this migration is shaped around (`d1-compound-cap.test.ts`) counts
     * SELECT terms, so this costs nothing against it.
     *
     * IT DOES NOT LOOSEN ONE GUARD. The COUNT(*) test below is widened with it,
     * so an account holding BOTH an `ERP Kennogroup` and a `Platinum` — the one
     * way an alias could become an ambiguity — matches two rows and numbers
     * neither, which is the Fuhrpark refusal doing exactly its job on a second
     * shape. The account is still required, the target number must still be
     * free, and a numbered app is still never overwritten. */
    const names = [e.name, ...(e.alsoKnownAs ?? [])].map(sqlString)
    const nameTest = (col: string) =>
      names.length === 1 ? `${col} = ${names[0]}` : `${col} IN (${names.join(", ")})`
    const pair = `${nameTest("a2.name")} AND ac2.name = ${account} AND a2.ref IS NULL`
    const alias = e.alsoKnownAs?.length ? `  [or ${e.alsoKnownAs.join(", ")}]` : ""
    return `
-- #${i + 1} → ${canonicalRef(app, i + 1)}  ${e.name} (${e.account})${alias}
INSERT INTO _numbering_0072 (entity_table, row_id, becomes)
SELECT '${APPS}', a.id, ${becomes}
  FROM ${APPS} a
  JOIN accounts ac ON ac.id = a.account_id
 WHERE ${nameTest("a.name")} AND ac.name = ${account} AND a.ref IS NULL
   AND (SELECT COUNT(*) FROM ${APPS} a2 JOIN accounts ac2 ON ac2.id = a2.account_id
         WHERE ${pair}) = 1
   AND NOT EXISTS (SELECT 1 FROM ${APPS} x WHERE x.ref = ${becomes});`
  }).join("\n")

  return `
-- THE PLAN LIVES HERE FIRST, then the two UPDATEs read their answer back out of
-- it — 0068's own lesson, written down at its statement 2: a window function
-- seating rows in the table it is writing to has no defined answer. Dropped at
-- the end of this migration, so no schema census ever sees it; \`IF NOT EXISTS\`
-- plus \`DELETE\` on entry so a run that died half way is a re-run and not a
-- wedge. No column here is called \`ref\`, on purpose — that is the name R55's
-- schema scan looks for.
CREATE TABLE IF NOT EXISTS _numbering_0072 (
  entity_table TEXT NOT NULL,
  row_id TEXT NOT NULL,
  becomes TEXT NOT NULL,
  PRIMARY KEY (entity_table, row_id)
);
DELETE FROM _numbering_0072;

-- APPS · the client's dictated order, position by position ────────────────────
--
-- One statement per entry, generated from her list — see the note on \`wanted\`
-- for why this is 29 statements and not one \`VALUES\` chain, and for the three
-- guards each of them carries.
${wanted}

UPDATE ${APPS}
   SET ref = (SELECT becomes FROM _numbering_0072
               WHERE entity_table = '${APPS}' AND row_id = ${APPS}.id)
 WHERE ref IS NULL
   AND id IN (SELECT row_id FROM _numbering_0072 WHERE entity_table = '${APPS}');

-- WAVES · no order was given, so the order is the one nobody has to remember ──
--
-- Oldest \`created_at\` first, tie-broken on \`id\`, counted UP FROM A HIGH-WATER
-- MARK rather than from 1. Same \`mark\` shape as 0068 and for the same two
-- reasons: a team may already hold canonical wave numbers minted through the
-- door, and a team's counter can stand PAST rows that no longer exist. Starting
-- at 1 under either would hand out a number twice, against a live unique index.
WITH canon AS (
  SELECT ${refNumberSql("ref")} AS n FROM ${WAVES} WHERE ref = ${canonicalRefSql(wave, "ref")}
),
mark AS (
  SELECT MAX(hw) AS hw FROM (
    SELECT COALESCE((SELECT MAX(n) FROM canon), 0) AS hw
    UNION ALL SELECT COALESCE((SELECT next_no - 1 FROM team_ref_counters WHERE kind = '${wave}'), 0)
  )
),
-- The seat is materialised in its own CTE so \`canonicalRefSql\` reads a plain
-- INTEGER COLUMN, which is the shape it is written for.
seated AS (
  SELECT id, (SELECT hw FROM mark) + ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS n
    FROM ${WAVES} WHERE ref IS NULL
)
INSERT INTO _numbering_0072 (entity_table, row_id, becomes)
SELECT '${WAVES}', id, ${canonicalRefSql(wave, "n")} FROM seated;

UPDATE ${WAVES}
   SET ref = (SELECT becomes FROM _numbering_0072
               WHERE entity_table = '${WAVES}' AND row_id = ${WAVES}.id)
 WHERE ref IS NULL
   AND id IN (SELECT row_id FROM _numbering_0072 WHERE entity_table = '${WAVES}');

-- THE COUNTERS · never below the rows, never below where they already stand ───
--
-- \`MAX\` both ways, 0068's statement 3 unchanged, so a counter can only go up.
-- \`HAVING COUNT(*) > 0\` so a newborn team replaying this whole ledger ends with
-- no counter row at all rather than one that says nothing — the state R55
-- asserts a fresh database must come out in.
INSERT INTO team_ref_counters (kind, next_no)
SELECT '${app}', MAX(${refNumberSql("ref")}) + 1
  FROM ${APPS} WHERE ref = ${canonicalRefSql(app, "ref")}
 HAVING COUNT(*) > 0
    ON CONFLICT(kind) DO UPDATE SET next_no = MAX(team_ref_counters.next_no, excluded.next_no);

-- AND PAST THE WHOLE OF HER LIST, but ONLY on a team this list actually applied
-- to — the guard is the plan itself, so a team that matched nothing (the smoke
-- team holds A0001 and A0002 and has never heard of any of these names) keeps
-- the counter the statement above gave it. Without this the statement above is
-- the only floor, which is one past the HIGHEST POSITION FILLED — on staging,
-- now that #28 is answered, that is ${canonicalRef(app, APP_ORDER_2026_09_01.length)}, and ${canonicalRef(app, APP_ORDER_2026_09_01.length)} is position #29 on her
-- list, the one she has spoken for and has not yet been asked about. The floor
-- here is one past the END of the list instead (${canonicalRef(app, APP_ORDER_2026_09_01.length + 1)}) — DERIVED from the list's
-- own length, so answering a position never moves it: 29 entries before and 29
-- after, and the reservation stays where it was. Every position she dictated
-- stays hers until she answers. A burnt number costs nothing — gaps are already
-- the correct outcome here — while a stolen position costs the order she dictated.
-- \`MAX(<a constant>)\` and not the bare constant: \`HAVING\` is only legal on an
-- aggregate query, and this needs to be one so that a plan holding NO app rows
-- yields no row at all rather than a counter set on a team that matched nothing.
-- Same shape as the two statements either side of it, deliberately.
INSERT INTO team_ref_counters (kind, next_no)
SELECT '${app}', MAX(${APP_ORDER_2026_09_01.length + 1})
  FROM _numbering_0072 WHERE entity_table = '${APPS}'
 HAVING COUNT(*) > 0
    ON CONFLICT(kind) DO UPDATE SET next_no = MAX(team_ref_counters.next_no, excluded.next_no);

INSERT INTO team_ref_counters (kind, next_no)
SELECT '${wave}', MAX(${refNumberSql("ref")}) + 1
  FROM ${WAVES} WHERE ref = ${canonicalRefSql(wave, "ref")}
 HAVING COUNT(*) > 0
    ON CONFLICT(kind) DO UPDATE SET next_no = MAX(team_ref_counters.next_no, excluded.next_no);

DROP TABLE _numbering_0072;
`
}
