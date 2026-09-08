# BRIEF — lane `err95` · branch `fix/errors-spend-95` · worktree `~/kwapso-lanes/err95`

Read `/Users/alaap_kanchwala_apple/kwapso-lanes/LANE-COMMON.md` first and obey it, including the
per-lane scratchpad rule at the end.

## Goal
TWO scores to ≥95: `error_log_review` (independently measured **93**, a lane claimed 96) and
`spend_review` (independently measured **94**, up from 91 — the owner had accepted 91 as a
permanent exception and it is now within reach, so this lane may change his mind).
Read `~/kwapso-lanes/REPORT-measure-errors.md` in full — it is your map and it names every item
with its arithmetic. Verify rather than trust.

## error_log 93 → 95. The single highest-value line on either review is first.

1. **`workers/auth/src/routes/google.ts:118` — worth +1.2 alone, one line (crit 8: 75 → 90).**
   The Google sign-in callback catches, prints `console.error("google callback failed:", e)` and
   **returns** `302 → /login?error=google_failed`. The person sees a failed sign-in; the store
   sees nothing. An expired Google client secret, a Google outage or clock skew on the ID-token
   verification are all invisible. **If your Google client secret expires tonight, every Google
   sign-in fails and nothing will ever say why.**
   Fix: `await recordWorkerError(env.DB, "auth", "GET /api/auth/google/callback", e)` before the
   redirect. It also fixes crit 4's −2 (that door's non-2xx never reaches a central catch).
2. **Five failure paths print and record nothing (crit 1: 95 → 97, +0.3).** Two lines each:
   - `shared/workers/rate-limit.ts:96` — **the sharpest. The limiter FAILS OPEN and says so only
     on the console**, so abuse protection can be off and nothing knows. Recording this is
     security-adjacent, not cosmetic.
   - `shared/workers/retention.ts:136` — a per-table sweep failure is console-only and
     `SweepReport` carries no failure list, so a table that stopped being swept is invisible.
   - `workers/auth/src/lib/email-change.ts:207` (the "your email was changed" security notice
     failing), `workers/auth/src/lib/account-activity.ts:63`.
3. **`workers/content/src/lib/knowledge-files.ts:210` (crit 8's medium, −7).** A file-conversion
   crash tells the person honestly "We couldn't read this file just now" — right — and **drops
   the cause**: nothing says which reader crashed on which file. R42 exists because that is
   precisely the fact somebody must act on.
4. **Crit 3, 93 → 96 (+0.33).** `data-ops` and `mcp` answer a health door nothing asks. Add both
   as service bindings on tenancy and two lines to `probeWorkerHealth`'s array. **Check the
   deploy order first** — tenancy deploys BEFORE data-ops and mcp, so a binding may invert it. If
   it does, say so and skip this item rather than breaking the deploy.

Arithmetic: 92.55 + 1.2 + 0.3 + 0.33 ≈ 94.4. **You will likely need item 3 AND all of 1, 2, 5.**
5. Crit 9 (−3): 120 near-identical rows an hour before the ceiling stops it. A `signature` column
   with `UNIQUE(signature, hour)` on the INSERT. Bigger than a one-liner; take it if needed.

## spend 94 → 95. Two of the three are documentation honesty.

6. **COSTS.md §4 says "LIFECYCLE — set, and never by age. `scripts/r2-lifecycle.mjs` applies
   rules to every bucket." THAT IS FALSE** — verified against the live account:
   `cf-exec npx wrangler r2 bucket lifecycle list kwapso-media-staging` returns only
   Cloudflare's own default multipart-abort rule, and `grep -c lifecycle workers/*/wrangler.jsonc`
   is 0 (sentinel: `grep -c r2_buckets` is 10, so the zero is real). The script exists, is correct
   and is tested; **it has never been applied to any bucket.** A written claim that a control is
   set where it is not is worse than silence.
   - (a) Correct or delete the sentence — one line, +0.16.
   - (b) **Actually run it**: `cf-exec node scripts/r2-lifecycle.mjs` against the buckets, turning
     the claim into a control — +0.48. Read the script first and report what rules it applies to
     which buckets BEFORE running it; if it would delete anything, stop and report instead.
7. **COSTS.md is stale in three places (crit 10: 92 → 100, +0.32).** Re-run
   `node scripts/measure-preamble.mjs` and paste the block into §2 (the tree measures
   `135,144 / 35,357`; the doc says `134,447 / 35,175`). Add the nightly's two new
   service-binding health fetches and its `SELECT … LIMIT 50` to §3's nightly row, which still
   says "≤ 4 bounded SELECTs and at most one digest email".
8. Crit 2 (+0.42): `scripts/walk-mobile.mjs:317` is the one uncapped billed loop — a dev script.
   Give it a `MAX_`.

Arithmetic: 94.06 + 0.16 + 0.48 + 0.32 + 0.42 ≈ 95.4.

## Do NOT
- Deploy anything, or apply a migration. **`db/core/0029_cron_heartbeats.sql` is NOT applied to
  staging** — the cron watch is built, tested and not live, and crit 6 is docked 5 for it. That is
  the planner's to run in the ship sequence; note it, do not do it.
- Chase error_log crit 2 (no errors screen — the owner's ruling, the doors take a key no browser
  can hold) or crit 7 (the identity fix is wired everywhere and observed nowhere; only a deploy
  moves it honestly). State both.
- Chase spend crit 1's −7 (the digest fans out to every staff member when nobody is on triage
  duty) — Tier 3, the owner's call on behaviour.
- Touch `shared/ui/`. Spend neurons.

## Report
Both criteria tables recomputed at your tip with arithmetic; for the lifecycle item, the live
`bucket lifecycle list` output before and after; every recorder added with the test that proves
it fires; `npm run check` exit code unpiped. Judge honestly — three lanes have now been caught
scoring their own work high. Write `/Users/alaap_kanchwala_apple/kwapso-lanes/REPORT-err95.md`
AND return its full text.
