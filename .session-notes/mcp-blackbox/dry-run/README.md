# Dry-run fixture (Smoke team) — not the real test

This was the first pass at this sandbox, built on staging's "Smoke team"
(3 tickets, 3 accounts). The planner sent it back: that team is too small
to reproduce the owner's real complaint (slow, error-prone runs and reply
sizes big enough to crash a chat, against 2,047 tickets / 112 sprints / 134
accounts on the real Kwapso team). Kept here — untouched, still internally
consistent — as a fixture for testing `scripts/mcp-blackbox/score.mjs`
against a small known transcript, and as a record of the setup mechanics
that carried over to the real run.

**The actual test lives one level up**: `../tasks.md`, `../answer-key.md`,
`../scoring.md`, `../tester-prompt.md`, `../cleanup.md`, against the
Kwapso team (`01KZWXFD86N0K3RZRBHKMKRWYS`).
