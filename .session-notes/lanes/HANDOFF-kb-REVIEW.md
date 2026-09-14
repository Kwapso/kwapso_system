# Handoff — kb_review (adversarial reviewer, knowledge-base rebuild)

Written 2026-09-11, at the hub's request, at a natural stopping point after the fence
deep-review report and its one follow-up comment both landed. This is the lightest of
the seven lanes by turn count — this file exists so a fresh session (after compaction,
or a different lane picking up review duty) has the history without re-deriving it.

## Mandate, and the one hard rule everything else follows from

Standing, adversarial, fresh-eyes reviewer of the knowledge-base rebuild. **Never fix
anything — report findings only.** One explicit, narrow exception the hub granted twice
this session: writing a TEST is not a fix (it changes no behaviour), and once, a doc
COMMENT recording a mutation-testing result (also no behaviour change). Everything else —
every SQL clause, every seam, every disclosure question — gets read, attacked, and
mutation-proven, never patched. Work from clean checkouts (`.worktrees/kb-review`), never
the working copy of another lane. No spawning agents, ever. Cost stays low ($0 baseline,
raised once to a $5 cap for the quality-trio skills — never actually spent past compute).
`cf-exec` for any Cloudflare command is reads-only. `npm run check` is read by EXIT CODE,
never by grepping output — a suite that fails to load reports green to a naive grep.

**The one meta-rule that survived every round unchanged:** a finding you cannot make fail
by breaking the code is not a finding. Mark something "cannot be assessed" rather than
falsely "HELD" when its subject doesn't exist yet. Never soften a finding because the
author's reasoning is persuasive. Prefer an honest, ugly, low number to a padded,
reassuring one.

## What this lane did, in order

1. **Round 1** — reviewed the sightings-model design (`knowledge-identity.ts`,
   `knowledge_sightings` schema) while it was still unwired on `main`: schema + pure
   functions existed, zero production callers. Reported that honestly rather than
   guessing at claims whose subject didn't exist yet.
2. **Round 2** — the read fence (`ownerClause`/`appClause`/`readerClause`) landed on
   `fix/kb-gate`. Found and reproduced a real, exploitable bug: `sourceTitles()` used
   `ownerClause` alone instead of `readerClause`, leaking an app-restricted source's
   title into the router's `reason` sentence for an unauthorized colleague. Reported;
   fixed elsewhere; regression test now lives at `knowledge.test.ts` ("does not name an
   app's material to a colleague outside it, not even in the reason").
3. **Round 3** — the fold-writer (`knowledge-google.ts`'s `writeSightings`,
   `retireSighting`) landed on the same branch. Found `retireSighting` had never been
   independently tested for "one colleague's retirement doesn't affect a surviving
   colleague" — wrote a temporary probe test to prove the gap, mutation-confirmed it was
   the only one of 55 tests in that file that caught the regression, then reverted the
   probe (not mine to keep; the hub's own lane owns that file).
4. **Quality trio** (`lean_mean`, `story_checks_out`, `security_sentry`) on a clean
   `main` checkout. Results: lean_mean 89→**91/100** (see correction below), Grade B,
   below the ≥92 ship bar; story_checks_out 94/100; security_sentry 49/100 PROVISIONAL
   (~15% sweep coverage, zero critical/high — an honest partial spot-check, not a
   failing grade). Reports: `KB-REVIEW-TRIO-LEAN-MEAN.md`, `KB-REVIEW-TRIO-STORY-CHECKS-
   OUT.md`, `KB-REVIEW-TRIO-SECURITY-SENTRY.md`.
5. **The lean_mean correction** — the hub challenged a citation ("default to writing no
   comments...") with a grep that itself had a bug (`grep` without `-E` treats `|` as
   literal). Went back to the source and found the HUB'S underlying doubt was right
   anyway: that sentence isn't in this repo's `CLAUDE.md` at all — I'd misattributed a
   line from my own harness's system prompt as this project's stated convention. This
   repo's real standard, `CONVENTIONS.md` §9, *prescribes* the long header comments I'd
   penalized ("a shared seam gets a header paragraph") and states densely-commented code
   is deliberate here, not a defect. Re-derived Leanness 81→90, Understandability
   84→87, overall 89→**91**. Correction appended (not overwritten) to the original
   report — the record shows both numbers and why they differ.
6. **`appClause`'s admin/default-role bypass** — found, mutation-proven (deleting the
   clause left 65/65 tests in `knowledge.test.ts` green), and — the hub's one standing
   exception — I wrote the test myself. Two tests, both directions: a caller whose role
   IS the account's default sees an app-restricted source even unstaffed; an ordinary
   colleague with every right but neither the default role nor staffing is still
   refused. Mutation-proved BOTH ways (delete the clause → test 1 reds; widen it to
   `1=1` → test 2 reds). Branch `test/app-fence-clause` @ `976e4143`, **merged**
   (`803fe6de`).
7. **The fence deep review** (this session's last substantial piece) — full report at
   `KB-FENCE-DEEP-REVIEW.md`. Enumerated every door that reads knowledge material and
   its fence off the source; checked the `reason`/`compartments`/`candidates`
   disclosure shape the hub flagged as newly risky (clean — no `account_staff` table
   exists in this codebase, so account names in `reason` disclose nothing a staff
   caller can't already see via the accounts door; a client login never reaches this
   code, `refusePortalCaller` throws first); attacked the specific seams nine merges
   touched (`accounts[]`/`apps[]` write door, `owner_user_id` no longer written on the
   mirrored `updateSource` branch, R68's re-pointing, the wipe-order fix); mutation-
   proved **every branch** of both `ownerClause` (3) and `appClause` (3), not just the
   two already known. **No new findings** — everything checked out fenced and tested.
8. **The follow-up comment** — the hub asked for one operationally useful thing from
   that report to be made durable: `ownerClause`'s no-sightings branch and `appClause`'s
   IS-NULL default are so heavily covered (~85 and ~91 tests) that a real regression
   there presents as a wall of unrelated failures, not one clean diagnostic one.
   Added as a doc comment on both functions (no behaviour change, `npm run check` exit
   0). Branch `docs/fence-wall-warning` @ `35c820b7`, pushed, **awaiting merge**.

## Facts worth carrying forward, not just today's answer

- **`refusePortalCaller` (`shared/workers/account-scope.ts`) is data-driven, not
  hostname-driven** — resolved from a `portal_users` row keyed on `guard.userId`. This
  is why R21 holds "regardless of gateway," and it's the exact substitution R21's own
  prose warns about. Worth checking directly (not assuming) on any future door review.
- **There is no `account_staff` table anywhere in this codebase.** Accounts have no
  per-staff visibility restriction — unlike apps, which have `app_staff` (SCOPE 8.11).
  Any staff caller can see every account's name via the accounts door already. This is
  why naming an account in the knowledge assistant's `reason` sentence is not a
  disclosure bug; it would be the opposite conclusion if `account_staff` existed.
- **`ownerClause`'s branch 2 (no-sightings legacy rule) and `appClause`'s branch A
  (`visible_to_app_id IS NULL`) are each covered by ~85-91 tests** — both functions now
  carry a comment saying so, so a future 2am debugging session doesn't mistake a wall of
  red for the app being on fire.
- **The mutation-testing parameter-count trap**: neutering a branch by deleting a SQL
  clause outright can leave a bound-parameter array with one too many entries, producing
  mass unrelated 500s instead of a clean, diagnostic red. Fix: replace the clause's
  condition with an always-false expression that still consumes its own `?` (e.g.
  `WHERE 0 = 1 AND sg.seen_by_user_id = ?`), never delete the whole clause.
- **`echo $? ` after a `> file 2>&1` redirect does not write into that file** — it goes
  to whatever stdout the shell (or in this environment, the background task's own
  captured output) reports. Read the exit code from there, not from `grep`-ing the log.

## Standing branches, state at handoff

- `test/app-fence-clause` @ `976e4143` — **merged** (`803fe6de`).
- `docs/fence-wall-warning` @ `35c820b7` — pushed, awaiting the hub's merge.
- No other branch owned by this lane. No uncommitted changes anywhere in this worktree
  (`git status --short` shows only the four untracked report files under
  `.session-notes/lanes/`, all intentional).

## What's next, and what is explicitly NOT next

The hub was explicit: **stop and wait.** The next assignment is re-running the quality
trio on final code, once the rebuild settles — not now, and not on a moving target. The
tree has had eleven+ merges since this lane's first pass; a trio run today would produce
a third number nobody could trust. Rebuild status at handoff time, per the hub: 1,245 of
~3,900 sources migrated, with a just-found third rebuild-path defect (`rebuild-
knowledge.mjs` never drives the Google door — it calls `/knowledge/sync` only, and
Google needs `sync-google` separately) being handled by the hub directly, not this lane.

Do not re-run the trio, re-review the fence, or touch `knowledge.ts` again until the hub
sends the next assignment. If asked for status in the meantime: both review rounds are
complete and reported, one branch is merged, one is pushed and awaiting merge, and this
lane is idle by design.
