-- A CRON THAT STOPPED FIRING LEAVES NOTHING BEHIND — this is what it leaves.
--
-- Every scheduled handler records what goes wrong on a tick (R12). None could
-- say a tick never came: a dropped schedule and a quiet estate write the same
-- nothing. One row per job, `last_run_at` moved on every fire and `last_ok_at`
-- only on a clean one (shared/workers/cron-heartbeat.ts). Tenancy's nightly
-- reads content's beats and content's morning tick reads tenancy's; a beat
-- older than twice its period becomes an error_logs row the ops digest mails.
--
-- SEEDED, NOT EMPTY. A table that starts empty cannot notice a schedule that
-- never fires after a fresh deploy — the exact failure this exists for. The
-- three rows below are stamped with the moment the migration ran, which is the
-- honest "last known" for a job nobody has watched before: two periods after
-- this apply, a job that has not beaten is reported.
--
-- THE JOB NAMES ARE CODE (`CRON_JOBS` in cron-heartbeat.ts) and a test holds the
-- rows here, that table, and the two wranglers' cron triggers equal.
CREATE TABLE IF NOT EXISTS cron_heartbeats (
  job TEXT PRIMARY KEY,
  last_run_at TEXT NOT NULL,
  last_ok_at TEXT
);

INSERT OR IGNORE INTO cron_heartbeats (job, last_run_at, last_ok_at) VALUES
  ('knowledge-sweep', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL),
  ('morning-digest',  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL),
  ('nightly',         strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL);
