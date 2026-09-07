-- WHO TOPPED UP THIS TEAM, AND WHEN. The one write in the estate that creates
-- money out of nothing, and until today it left no record of having happened.
--
-- `agent_credits` carries a running `balance` and a cumulative `lifetime_granted`
-- (db/core/0010), so after a top-up you can read the TOTAL ever granted and the
-- minute the row last moved — and nothing else. Not who granted, not in how many
-- increments, not which of them was the odd one. The door
-- (POST /api/data-ops/admin/grant-credits) opens on `adminGuard`, the owner's
-- key, so a leaked key could top a balance up untraceably and the only evidence
-- would be a number that got bigger.
--
-- ONE ROW PER GRANT, WRITTEN IN THE SAME `env.DB.batch` AS THE BALANCE ITSELF
-- (shared/workers/credits.ts `grantCredits`), exactly as the email switch and its
-- audit row commit together in workers/auth/src/lib/email-change.ts. The record
-- is not best-effort and cannot be skipped: it is a required argument of the one
-- function that moves the balance, so the payment integration that wires into
-- that same seam later cannot forget it either.
--
-- `actor` IS AS HONEST AS THE DOOR CAN BE. `adminGuard` proves possession of a
-- key, not the identity of a person, so the row says 'owner-key' and does not
-- invent a name. `request_id` is what makes two grants distinguishable — the id
-- the gateway minted for that click (shared/workers/trace.ts), the same value
-- `error_logs.request_id` joins on, so a grant and anything that failed around it
-- line up in one query.
--
-- KEPT FOREVER, like every other audit table here (account_activity, the team
-- activity feed, the usage ledgers). The nightly retention sweep takes
-- diagnostics, never anything anyone might have to answer for later.
CREATE TABLE IF NOT EXISTS credit_grants (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  granted_at TEXT NOT NULL,
  amount INTEGER NOT NULL,   -- credits this grant added (always positive)
  actor TEXT NOT NULL,       -- 'owner-key' — the door, not a person we resolved
  request_id TEXT            -- the click this grant rode in on (db/core/0020)
);

-- Newest-first, per team: "when was this balance last topped up, and by how much".
CREATE INDEX IF NOT EXISTS idx_credit_grants_team
  ON credit_grants (team_id, granted_at DESC);
