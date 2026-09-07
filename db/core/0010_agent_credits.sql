-- The CREDIT half of the agent quota (owner's credit-based model). A team gets a
-- free daily allowance (metered in agent_usage with a 'YYYY-MM-DD' period — the
-- free counter) and, once that's used up, spends from this purchasable balance.
-- Lives in the global core DB so the shared agent gate can check + spend a unit
-- without opening a team database. Top-ups are an owner/admin action for now; real
-- payments wire in later against this same balance (the seam is the grant action).
CREATE TABLE agent_credits (
  team_id TEXT PRIMARY KEY REFERENCES teams (id),
  balance INTEGER NOT NULL DEFAULT 0,          -- AI credits remaining (never negative)
  -- Total ever granted. A balance is spent down, so once a team has used its
  -- credits nothing else in the estate can say how much they were ever given.
  -- Read back by the grant door itself (`lifetimeGranted` in the answer to
  -- POST /api/data-ops/admin/grant-credits), which is the operator who needs it.
  -- It said "for admin view" until 7 Sep 2026 and no admin view was ever built,
  -- which is a comment promising a screen rather than describing a column.
  lifetime_granted INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT
);
