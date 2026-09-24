# Working agreement

<!--
  Moved out of CLAUDE.md verbatim on the lean_foundation pass (see MEMORY /
  the lean_foundation skill) so CLAUDE.md can stay an index. This is the
  operational rulebook: lane discipline, deploy order, ship gate,
  credentials, migrations, kit tags, artifacts. CLAUDE.md points here; this
  is the only copy of this text.
-->

- **EVERY FOLDER YOU MAKE LIVES INSIDE THIS PROJECT.** The owner's rule, in his
  own words (8 Sep 2026): *"any and all folders you make will be within your
  parent folder, which is Kwapso_cpaa on the desktop. Anything else that you try
  to create elsewhere will be deleted. If that's stopping your work, too bad."*
  So a lane worktree is `.worktrees/<LANE>` (git-ignored), scratch files go under
  the project, and nothing is written to the Desktop, to `~/`, or beside the
  repo. Written down here on 2026-09-10 because until that day the rule existed
  in exactly ONE file in the whole repository — `.session-notes/lanes/LANE-COMMON.md`,
  a lane brief that no check reads, that no doc map indexes, and which until
  2026-09-09 told every lane to do the OPPOSITE (`~/kwapso-lanes/<LANE>`, and
  "NEVER create a folder on the owner's Desktop"). The planner session surfaced
  it on 2026-09-10 and `story_checks_out_review` verified it and filed it high —
  a rule whose only home is a chat log is a rule the next agent breaks. 407 MB had already
  accumulated outside the project by the time it was noticed.
- **`npm run check` must stay green** (the lint, then TypeScript across every workspace, then the full test suite including the rule + seam tests). Run it before you commit. It is the gate. The lint (`npm run lint`, oxlint, ~15ms over the whole repo) runs FIRST because it is the cheapest of the three: dead imports, unused dependencies in a hook's array, a React hook rule broken. Its first clean run found an `ErrorBoundary` imported into the root layout and rendered nowhere.
- **Ship gate** (before `/ship-staging`): `npm run check`, then the quality skills, `lean_mean` (≥ 92), `story_checks_out`, and `security_sentry` (no critical/high), then deploy. Adversarially verify your own findings.
- **Deploy order is realtime-FIRST**, then auth → tenancy → content → data-ops → mcp → gateway → portal-gateway. Both gateways go last, for the same reason: each service-binds the domain workers it forwards to. Migrations (core + team) are applied first; production follows staging at the same commit. See OPERATIONS.md.
- **Every change ships to staging, then to production, in the same session.** The owner's ruling, 16 Sep 2026: a change is done only when it is built, `npm run check` is green, it is verified in the browser on staging at 1280, 768 and 375 px, pushed to GitHub, shipped to staging with the bundle proven, and shipped to production at the SAME commit staging verified. This line is the standing authorization; nobody asks the owner for a per-change production go-ahead any more, and it is written here so that it survives a compacted or cleared chat. What still stops a production ship: main moved since staging verified (re-stage first), a red check, a failed smoke, or a destructive data step (a reset, a delete), which stays owner-gated. Ship only through `npm run ship:staging` / `npm run ship:production` (scripts/deploy-from-worktree.mjs): a clean worktree at origin/main, one deployer at a time behind `.worktrees/deploy.lock`; the planner session sequences who ships next.
- **Commit messages** end with the Co-Authored-By line. Branch off `main`; don't commit straight to it.
- **Resetting data:** `node scripts/reset-all.mjs <staging|production|both>` (destructive; schema + migrations survive). Confirm production explicitly.
- **Never pipe a check.** `npm run check` (lint → tsc → every suite) runs on its own,
  backgrounded with a log file if it is long; `| tail` or `| grep` hides a failing
  exit code and once shipped a broken kit tag.
- **Translations:** `TRANSLATION_CEILING` is 0/0/0. Hand translations go in
  `shared/i18n-seed.ts`; never edit the generated catalogue; `npm run lang` extracts
  and prunes.
- **Team migration numbers are read, never recalled.** Two lines (Alaap's and the
  UI/UX line) mint `TEAM_MIGRATIONS` against ONE shared staging estate and the robot
  matches by NAME. Whoever appends a migration runs `git fetch origin` and reads the
  tail of `workers/tenancy/src/team-schema/migrations.ts` on `origin/main` right
  before appending, and says the number it chose in its report. A brief never hands a
  lane a number. If a collision still lands, renumber ours behind the other line's
  and rename the already-applied rows in each staging team's `_migrations` table
  (`npx wrangler d1 execute team-<id> --remote --env staging`) before the next robot
  run.
- **A deploy with team migrations is three steps.** `npm run deploy:staging` stops at
  `migrations:check` ("TEAM DATABASES ARE BEHIND"); wait about 75 s for the tenancy
  worker to propagate; `curl -X POST https://agency-staging.kwapso.app/api/tenancy/admin/migrate-teams -H "x-admin-key: $(security find-generic-password -s kwapso-admin-key -w)"`; then
  run the chain again. `teamsChecked: 0` means too early, not done. Afterwards prove
  the change on D1 rather than trusting the ledger.
- **Deploy credentials:** `cf-exec` does not exist on this machine. Credentials moved
  off a JSON file into `~/.config/cloudflare/accounts.json` + the macOS Keychain on
  2026-08-31 (`scripts/lib/cf-credentials.mjs` has the full account/token resolution
  this folder maps to, Keychain service `cf-token-kwapso`); in the SAME shell command
  as the deploy, export `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` from that
  source. Never print either value.
- **A green deploy proves nothing.** After every staging deploy compare the md5 of a
  local `web/out/_next/static/chunks/*.js` chunk with the served one. "Ready for
  review" means live on staging with the bundle proven, never "passes check".
- **Kit tags fork.** Before tagging `kwapso-design`, run `git ls-remote --tags` AND
  `git branch -r --contains <latest tag>`; a tag minted on a side branch forks the
  v1.2.x line. Reconcile by merging before minting the next tag, then `node
  scripts/sync-design.mjs <tag>`, `design-imports.mjs`, `build-screen-builder.mjs`,
  and `npm run kit:drift` must say IN SYNC. The template strip and inventory belong to
  Alaap's line; never start them.
- **Lane discipline.** The planner session plans; lanes execute. A lane spawns no
  sub-agents, runs every command in the foreground, and never ends its turn waiting on
  a background run (a background poll never wakes a lane). Lanes own disjoint files,
  re-read a file before a targeted edit, `cp` a file before mutating it for a
  proof-of-red, and never run `git checkout --` on a tracked file.
- **Peer chip sessions edit this same tree.** Background tasks the client starts from a
  chip run as separate sessions in the SAME checkout; their uncommitted edits land in
  `git status` mid-lane and get swept into the next `git add -A`; check `git status`
  before every gate and name what is not ours.
- **Lanes never write inside the repo.** A lane that needs a scratch file writes to the
  session scratchpad, never `scratchpad/` at the repo root (three lanes did today;
  hygiene deletes it).
- **Prove a migration on D1.** After the three-step deploy, `wrangler d1 execute …
  pragma_table_info` on a team database proves the column exists; the ledger alone is
  not proof.
- **Record tabs are not deep-linkable.** `/apps/{id}/tickets` renders the top-level
  Tickets module; an app's own tab opens only by clicking it — proof scripts must
  click.
- **A proof lane never prints a credential.** It reads the Keychain into a variable and
  never `cat`s the saved auth state.
- **Artifacts: delete decided pages, keep open ones.** The client's ruling 18 Sep 2026:
  "keep the ones which are open"; a decision page is deleted the day its decision
  ships.
- **Kit changes the client asks for are still kit-only.** Even a one-line app-side
  workaround (an underline, an overflow class) is a kit bug; file it, fix it in the
  kit, then remove the workaround.
- **Measure on staging, not in the harness.** Screenshots from the desktop harness lie about
  the app — no tab shoulders, no boot. Proof of a UI claim is a headless Playwright run
  (installed in this repo's `node_modules`) against https://agency-staging.kwapso.app, logged
  in through POST `/api/auth/admin/test-login` with the key in the macOS Keychain item
  `test-login-key-kwapso` (never print the key). Three defects were only found this way: a
  flat icon-only tab corner, a 4px gap with no nesting, pointer capture killing tab clicks.
- **A hidden browser pane never boots the app.** The app holds its boot mark (`useMarkHold`)
  until the pane is visible, so every route shows "Loading…" forever when the desktop browser
  pane is hidden. Do not diagnose from it; use the Playwright recipe above.
- **Deploy every round.** The client's standing order, 17 Sep 2026: "Deploy every time you
  have something ready." Ready means deployed to staging AND bundle-verified (md5 of local
  `web/out/_next/static/chunks/*.js` and css against what staging serves). Nothing is reported
  as ready to review before that.
- **Cheapest capable model per lane.** The client's rule: "use the cheapest model that can
  perform the job. You are the judge." Haiku for mechanical edits with an exact recipe, Sonnet
  for anything that needs judgement or touches several files, the planner never executes ("I
  don't want you to do anything. You are the planner and manager.").
- **Hygiene pass before every gate.** Parallel lanes leave drift the gate catches late:
  duplicate keys in `shared/i18n-seed.ts`, untranslated new strings, stale generated files.
  Before `npm run check`: `npm run lang`, `node --experimental-transform-types
  scripts/rules-index.mjs`, `node scripts/icon-map.mjs` when icons changed, and a grep for
  dead exports and stale exemption-table entries. A Sonnet hygiene lane does this; the planner
  does not.
- **Lanes never name a path they have not opened.** A Haiku docs lane invented
  `citation-offset-at-mobile.test.tsx` and `ticket-thread-composer.tsx`;
  `test/named-paths.test.ts` failed the build. Every brief says: verify with `ls` before
  naming a file in a document, comment or string.
- **Kit changes live in the kit repo only.** Never edit vendored `shared/ui`; fix in
  `/Users/aurora/Developer/Claude/kwapso/kwapso-design`, tag (after `git ls-remote --tags` and
  `git branch -r --contains`), push, then `node scripts/sync-design.mjs <tag>`, `node
  scripts/design-imports.mjs`, `node scripts/build-screen-builder.mjs`, and `npm run
  kit:drift` must say IN SYNC.
- **Every client ruling is written down the same session.** UI/UX rulings go into
  `documents/UI-RULEBOOK.md`; a ruling that is a law also gets RULES.md,
  `shared/rules/registry.ts` and a check, and `node scripts/rules-index.mjs --check`
  regenerates `documents/RULES-INDEX.md`. A rule whose only home is a chat log is a
  rule the next agent breaks.
- **Decisions need a visual.** Never ask the client to choose from prose; build a
  side-by-side page and point at it. Suggest the right term proactively (check the
  glossary and the neighbouring labels). When asked "what is ready", list only what is
  live on staging, every held item on its own numbered line.
- **Vocabulary settled 16 Sep 2026.** "Sprint type" = Not started · Audit · Plan ·
  Build · Validation · Refinements · Enhancement, told apart by ICONS
  (`shared/sprint-types.ts`); colours belong to STATUS. App status is to be DERIVED
  from waves and sprints (only Archived is set by hand); the model is pending the
  client's pick, so app stage pills stay coloured meanwhile. Waves carry an app
  (`waves.app_id`) and the timeline shows the app's name. Content tabs open next to
  the current tab, one tab per page, drag to reorder; the assistant strip is
  conversations · History · "+", with History and "+" layered behind the active tab;
  the assistant column resizes by dragging an invisible seam with 320/400/520 snaps.
