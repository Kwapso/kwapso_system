# LANE-COMMON — read this whole file before your brief. Every lane in the 95 run.

You are one lane of a planner-coordinated run on **the Kwapso System**
(`/Users/alaap_kanchwala_apple/Desktop/kwapso_cpaa`, GitHub `Kwapso/kwapso_system`, branch
`main`). The planner verifies every claim you make before merging — so report evidence, not
conclusions. Your goal is one review score reaching **95 or above, measured fresh**.

## Setup — do this first, exactly
1. `cd /Users/alaap_kanchwala_apple/Desktop/kwapso_cpaa && git fetch origin main`
2. `git worktree add .worktrees/<LANE> -b <BRANCH> origin/main`
   — the folder MUST be `.worktrees/` **INSIDE the project**. It is git-ignored.
   **NEVER create a folder anywhere else.** The owner's rule, in his own words
   (8 Sep 2026): "any and all folders you make will be within your parent folder,
   which is Kwapso_cpaa on the desktop. Anything else that you try to create
   elsewhere will be deleted. If that's stopping your work, too bad."
   This step used to say `~/kwapso-lanes/<LANE>` and told you never to create a
   folder on the Desktop — the exact opposite of the rule, and it survived the
   move of the lane records into the project because a document is not a check.
   R58 catches a path that no longer OPENS; `~/kwapso-lanes/` opened fine and was
   still wrong, which is the gap between "this path resolves" and "this path is
   allowed".
3. `cd .worktrees/<LANE> && npm ci --silent` (or `npm install`).
4. Read `CLAUDE.md`, `RULES.md` (the Laws R1–R58) and the review report your brief names.
5. `npm run build` once in the worktree if your brief says a splash/export test matters — a
   worktree gate is 9 tests thinner than the primary checkout (two suites skip on git-ignored
   artefacts: `glide/normalised.json` and `web/out`). Totals match; only passed/skipped moves.

## The review skill you are chasing
The rubric and its probes are on disk: `~/.claude/skills/<name>_review/SKILL.md` + `assets/`.
Read the SKILL.md in full and follow it when you re-measure. Prior measured reports live in
`.session-notes/reviews/` — your brief names the one to start from; its criteria table is the
map of where the points are. **A measurement is evidence about a commit, not a codebase**: say
which commit you measured. Probes have been wrong before (ten catalogued defects) — where a probe
disagrees with the source, census the source and say so.

## Hard rules (the owner's, verbatim where quoted)
- **Never run `scripts/i18n-translate.mjs`** — it spends the OWNER'S OWN API key and rate-limited
  his personal account. That ban stands and always will.
- **But you DO translate, yourself.** The owner's ruling, 8 Sep 2026: *"you, inside of Claude
  Code, are not authorised to use any API key for any AI model... You are not runtime; you are
  the builder. Therefore, you already have access to your own AI models, which you can use for
  translation. Don't use any of my API keys."* So new user-visible English copy is translated
  BY YOU, in the session, into every language `LANGUAGES` declares — write the entries straight
  into the catalogue — and `TRANSLATION_CEILING` in `shared/rules/registry.ts` moves DOWN with
  the count, never up. Run `node scripts/i18n-extract.mjs` (safe) first. Raising the ceiling is
  now the exception that needs a reason, not the default.
- **Every Cloudflare command takes the `cf-exec` prefix** (bare wrangler = the WRONG account).
  Staging is `--env staging`. **Never deploy production.** Deploy staging only if your brief says
  so; otherwise measure with `scripts/speed-bench.mjs` / Node-run worker code against staging data.
- **Never read secrets from files.** Keychain at point of use, piped, never echoed.
- **Do not touch `shared/ui/`** (hash-pinned kit; a hand edit turns the build red). Its version
  is the `tag` in `shared/ui/VERSION.json` — read it there rather than from this sentence, which
  is how the last one went stale. Adopt what the kit draws; never argue with it downstream.
- **Stick with Aurora's UI/UX.** Do not change UI, UX or business logic beyond what your brief
  authorises. Voice: warm, plain, sentence case, no jargon, no emoji, glossary words only.
- **Stay lean**: least code, reuse the seams (`d1-rest`, `requireRight`, `validate`,
  `publishChange`, `FormShell`, the recipe engine, the tool catalog). Too much code is a defect.
- **Laws R1–R58 are machine-checked.** Walk them before you build (CLAUDE.md's planning ritual).
  A new invariant gets a test FIRST (red), then the fix (green). "Mutation-proved": revert your
  fix, run the test, see red, restore.
- **Deactivate, never delete.** Audit block on every write.
- **No neuron spend** unless your brief says so. Assistant turns cost money; benches that call a
  model are the planner's to run.
- **Read `npm run check` by EXIT CODE, unpiped**: `npm run check > /tmp/gate.log 2>&1; echo
  EXIT=$?`. `cmd | tail` returns tail's status. This has bitten the planner three times today.
- **Itemise before you total.** Per-workspace `Test Files`/`Tests` lines, not a sum you did in
  your head. A zero is a claim and needs the same proof as a number.
- **Search before you theorise**: when an anomaly has an obvious noun, grep the repo, the
  reports and `~/.claude/projects/-Users-alaap-kanchwala-apple-Desktop-kwapso-cpaa/memory/` for
  that noun before forming a hypothesis.
- `git worktree prune` deletes OTHER lanes' worktrees silently. Never run it.
- Commit messages: imperative subject, a body that says WHY and what was measured, end with
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. Branch off main; never commit to
  main. Small commits, each green.

## Finish
1. `npm run check` green by exit code in your worktree (report the per-workspace lines).
2. Re-measure your review on your branch tip, following the SKILL.md. Report the criteria table
   with arithmetic, the commit hash, and what each moved criterion cost.
3. `git push -u origin <BRANCH>`. Do NOT open a PR (no gh); the planner merges.
4. Write your report to `.session-notes/lanes/REPORT-<LANE>.md` — inside the project, like every
   other folder (step 2), and beside the twenty-two reports already there: commit,
   score before → after with the table, every file touched and why, every claim with the
   command that proves it, what you could NOT move and the honest reason, and anything you
   changed in UI/UX/business logic (the owner must be told). Then return that report as your
   final message.
5. Leave the worktree in place (the planner removes it after merging).

---

## RESUMING A STOPPED LANE (read this if your worktree already has changes in it)

This run was stopped by the owner on 7 Sep 2026 mid-flight and restarted. Your worktree
already exists and already holds work — possibly a lot of it, possibly a commit. **It is the
only copy: nothing was pushed.** So:

1. **Do not re-clone, do not reset, do not `git checkout -- .`, do not stash-and-drop.** The
   first destructive command you run is the one that loses the work.
2. **Read what is there before you write anything**: `git -C <worktree> status`,
   `git log --oneline main..HEAD`, `git diff --stat`, and actually open the changed files.
   Reconstruct what your predecessor had done and what it was about to do next.
3. **Trust the disk over the brief's starting assumptions.** The brief describes the job from
   the beginning; some of it is already done. Work out which parts, from the files.
4. Then carry on to the end of the brief as normal: tests, `npm run check` green by unpiped
   exit code, re-measure, push, report.
5. If you find the tree in a state you cannot make sense of, say so in your report and fix
   forward — never by discarding.

## SCRATCHPAD — use a per-lane subdirectory, always

Three separate agents were corrupted today by this: several lanes wrote `probe.json` (and
`scan.py` output) to the SAME shared scratchpad path, and one lane's file was overwritten by
another's within the same minute — different schema, same filename. One caught it only because
two reads of the same file disagreed about which keys existed.

**Write every probe output, every scratch script and every log to
`<scratchpad>/<your-lane-name>/`.** Never to the scratchpad root. And before you read a JSON
file back, assert it carries a key your own schema requires — a file that parses is not
necessarily your file.

## NEVER APPLY A MIGRATION TO A SHARED DATABASE — added 9 Sep 2026

Measuring against real staging data is encouraged. CHANGING its schema is not.

On 9 Sep 2026 the Kwapso team's staging database was found carrying
`meetings.superseded_transcript_ids` with NO row in `_migrations`. Nobody knows
which session put it there and nothing in any report claims it. The consequence
was not a one-off: `migrateTeams` computes `missing` as TEAM_MIGRATIONS minus
`_migrations` and `applyMigration` has no catch, so the next run would have hit
`duplicate column name`, skipped that team WITHOUT stamping `schema_version`, and
done exactly the same thing on every run after — self-repeating, and invisible
until somebody deployed.

So: read staging freely. Do not `ALTER`, do not `INSERT` into `_migrations`, do
not run a migration by hand to see whether it works. If your work needs a column
that is not there yet, say so in your report and use fixtures — a session that
says "these numbers are fixture-driven because the migration has not run" is
worth more than one that quietly makes them real.

Applying migrations is the planner's, in the deploy sequence, where the whole
estate moves together and a failure is seen.
