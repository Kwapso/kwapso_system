# BRIEF — lane `arch95` · branch `fix/architecture-95` · worktree `~/kwapso-lanes/arch95`

Read `/Users/alaap_kanchwala_apple/kwapso-lanes/LANE-COMMON.md` first and obey it.

## Goal
`architecture_review` from **94 to ≥95**, measured fresh with
`~/.claude/skills/architecture_review/SKILL.md`. An independent measurement at `d2e50c8f`
(`~/kwapso-lanes/REPORT-measure-architecture.md`) already did the hard part: it named the
cheapest route to 95, all Tier 1/2, none of them an architecture decision. **+1.32 → 95.1.**
Take that route, verify each claim yourself rather than trusting this brief, and stop when
the re-measure clears 95 honestly.

## The four changes it named, largest first

1. **Three internal hops drop the trace id (+0.84, criterion 4: 18/25 → higher).**
   `publishChange` (`shared/workers/realtime.ts:273`), `sendBrandedEmail`
   (`shared/workers/notify.ts:55`) and `recordMaintenanceRefusal`
   (`workers/gateway/src/index.ts:334`) write their error rows under a **fresh ULID**, so a
   failing click's live-layer, email and throttle failures cannot be joined to it. The last
   one is free — `traceHeaders(...)` at the call site, no signature change. The first two
   take `env` and no `Request`, so **carry the id on `env`/`cfg`** — the object 300+ call
   sites already pass — exactly as `DEFER` and the counted binding already ride it. Do NOT
   change 300 call sites. See the memory `per-request-state-rides-cfg-or-env`.
2. **One uncapped discretionary hop (+0.36, criterion 2).** `recordMaintenanceRefusal` is
   the only cross-service hop with no `AbortSignal.timeout`. It rides `ctx.waitUntil` so it
   cannot hold a response, but a stuck auth holds the waitUntil open. Add
   `signal: AbortSignal.timeout(REPORT_HOP_MS)` — the constant already exists and three
   siblings use it.
3. **`PLATFORMS.md`'s core-database count is stale (+0.12, criterion 8).** It says 151 sites
   in 27 files; the measurement found **156 in 29**. It was 3 stale last round, so it is
   drifting. Fix lines 26 and 61 — and consider whether a test should derive that number
   instead, since a hand-kept count in the one document that prices a platform move is the
   shape this repo keeps getting caught by.
4. **Finding A1, and it is the most embarrassing of the four.** `shared/workers/gating.ts:188`
   says *"There is deliberately NO fallback answer here — no cached identity, no 'assume
   signed in'."* The "no cached identity" half is true and is the point. The first clause is
   **false**: `sessionFromCore` is called from the catch twenty lines below, at :205.
   `RESILIENCE.md` was corrected on 6 Sep and this sentence was not — the identical defect,
   one file away from where it was filed. Correct it to say what is true.

## Also worth doing if it is cheap, both named by the measurement
- **Criterion 6 (+0.36):** Time Travel has never once been used. The planner rehearsed a
  restore on a throwaway staging database on 7 Sep (`wrangler d1 time-travel restore
  --bookmark=…`, 67 tables back). Record that in `RESILIENCE.md` § "When the restore was last
  tested" with the date — do not invent a new rehearsal.
- **Criterion 1 (+0.48):** the one upward import is `scripts/every-page-has-a-name.mjs:50`
  importing `../web/lib/pages.ts`. Move `TEAM_SECTIONS` into `shared/` and import it from
  both. Only if it is genuinely small — the script derives its walk list from the app's own
  nav on purpose, and a hand-kept list would narrow its coverage while still reporting PASS.

## Do not
Touch `shared/ui/`. Deploy. Spend neurons. Add a core-database adapter (criterion 8's
35-point concentration row is a Tier-3 owner decision — leave it and say so). Change UI.

## Report
The eight-criterion table recomputed at your tip with arithmetic; for each change, the
before/after of the criterion row it moved; the trace id proved to reach the store on all
three hops by a test, not by reading; `npm run check` exit code unpiped.
Write `/Users/alaap_kanchwala_apple/kwapso-lanes/REPORT-arch95.md` AND return its full text.
