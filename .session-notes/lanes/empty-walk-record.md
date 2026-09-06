# The cold walk — what the app looks like with nothing in it

The standing record of walking this app as a brand-new team. It is tracked on
purpose: everything else about the last walk was not, and that is the whole
reason this file exists.

## Why this file is here

The instrument (`scripts/lane-shots/walk-empty-team.mjs`) landed on **2026-08-29**
in commit `2ab3ffa7`. It was built properly — it walks all twenty agency
destinations against a team created through the app's own doors rather than a D1
seed, and it runs a **canary against a populated team first**, because an empty
screen and a broken screen photograph identically. Two false starts were caught
by that canary before the walk was believed: a fixed 2.5-second wait that read a
132-account screen as empty, and a row selector that matched none of the markup
this app actually renders.

Then the results went into a message to another session, and nowhere else. The
commit body says so in as many words:

> Findings from the actual walk are in the message to kwapso-cpaa-a7, not
> repeated here — this commit is the instrument, not the result.

**Eight days later nobody could say what it found.** The screenshots go to
`/tmp`, the JSON went to a terminal, and `.session-notes/` is gitignored apart
from the one re-admitted folder this file sits in. The 2026-09-05 fresh-eyes
review scored criterion 10 at 20 of 40 for exactly that: the walk happened and
is dated, and what it found is unrecoverable.

**The findings of the 2026-08-29 walk are not reproduced below, because they are
not available to reproduce.** Six empty-state commits landed in the week after it
(`960ae29e`, `6e1da995`, `d27bb196`, `a88fc872`, `ac14b34e`, `98b5d7a7`) and it
is likely several were its doing — but "likely" is not a record, and writing a
finding list inferred from a git log would be inventing the causal link this
review exists to catch. If the original message is ever recovered, paste it here.

**One thing does survive, and it is worth exactly what it is worth.** The staging
account still carries the team that walk stood up: "Empty Walk Team", created
2026-08-29T12:05:25Z by `empty-walk-1788005117614@resend.dev`, database
`ef25a6a9-f41e-47b4-b68a-abc63a198eef`, still active. That is not a finding list
and it must not be read as one — a team name says nothing about what any screen
showed. What it does do is corroborate, independently of the commit message, that
the run happened on that date and went through the app's own doors rather than a
D1 seed. Until it was noticed on 2026-09-06 that claim rested entirely on one
commit body.

**AND IT SHOWS THE INSTRUMENT LITTERS EVERY TIME IT RUNS.** Found while cleaning
up after the 2026-09-06 run, which is the only reason anybody looked at the
account:

```
2026-08-13  ON   Kwapso                        727537f7-653d-4114-af23-332d1aae0f90
2026-08-24  ON   Smoke team                    14efdb40-a2c3-4bf9-b4a7-7f9dc84e3465
2026-08-27  ON   Smoke team                    (no database_id at all)
2026-08-29  ON   Empty Walk Team               ef25a6a9-f41e-47b4-b68a-abc63a198eef
2026-09-06  OFF  Empty walk probe 2026-09-06   40135839-ac1a-4ef2-9dd4-d2e77429dd5c
```

Every walk mints a team, and `createTeam` calls `d1CreateDatabase` — so each run
leaves a durable database on a Cloudflare account this deployment SHARES with
other companies. Nothing in the script registers what it created and nothing
cleans it up; both prior runs were still active when this was written. The
27 August row is a separate shape again: a team with no `database_id`, i.e. a
half-created team the smoke suite's own "doesn't litter team databases" promise
did not cover either.

**So this is a habit of the tool, not a mistake of one run** — which is the whole
reason it went unnoticed for a week. The fix belongs in the script rather than in
a line of this runbook asking somebody to remember, for exactly the reason the
report path taught: an instruction a person has to follow is not a fix. Deferred
to the next round by the planner, deliberately, rather than bolted on here.

**If you run this walk: it will create a team and a database. Deactivate the team
and the user afterwards** (`teams.deactivated_at`, `users.deactivated_at`,
scoped by primary key), and hand the database to the owner — dropping one is
irreversible and on shared infrastructure, so it is not a session's call.

## The 2026-09-06 walk — what it found

Run to prove the tracked-report path actually writes, not for a score. **It
wrote**: `.session-notes/lanes/empty-walk.json`, 20 destinations, canary ran.
That file is the machine record; this is the readable one.

**Team:** `01M1TK6003NMB8KYES7ZCXHNGP`, "Empty walk probe 2026-09-06", staging.
Owned by a THROWAWAY account, `delivered+emptywalk@resend.dev`, deliberately —
`createTeam` does an unconditional `UPDATE users SET current_team_id = ?`, and
`TEAM_SCREENS_HIDDEN = true` hides the switcher, so naming a real person as the
owner of a probe team would have stranded them in an empty world with no control
to get back out. **Both the team and that user can be deactivated.**

**Canary passed first**, as the script requires: the populated smoke team
returned rows=2 on `/accounts` and rows=2 on `/tickets`, so every zero below is
an empty screen rather than a probe that finds nothing.

### What is genuinely good, seen live on a team with nothing in it

- **18 of 20 destinations rendered with zero page errors** and a real empty
  register on each.
- **`/home` opens with "Start here"** and all three acts present and pressable —
  "Add your first account", "Bring a spreadsheet in", "Raise the first ticket".
  This is the fix from `b7f8cc8b` confirmed on a real cold account rather than in
  jsdom.
- **The seed works.** Members = 1 and Member roles = 2 (Admin + Viewer) on a team
  created seconds earlier, with no script run by hand.
- Accounts, Apps, Brand library, Knowledge, Meetings, Meeting purposes, Stories,
  Tasks and Tickets all drew "Add the first", and most drew "Import a list"
  beside it.

### What it found

1. **Sprints' landing tab draws a bare line.** The Overview tab — the one a new
   team lands on — renders `<EmptyLine concept="sprints">No sprints yet.</EmptyLine>`
   (`web/components/sprints-screen.tsx:547`): a title, no sentence, no action.
   The helpful register exists one tab over on "All sprints", and the recipe
   itself is fine (rendering `sprints.list` empty gives "No sprints yet. /
   Whatever you add shows up here. The first one takes a minute. / Add the
   first"). So this is a host-composed tab bypassing the engine's own empty
   state. **No static check caught this and neither did the new cold-account
   render tests** — they exercise the recipe, and this screen does not use it on
   the tab in question. It is exactly what a live walk is for.

### What is NOT a finding, and why — read this before filing either

- **`/time` and `/waves` came back ERR. They are fine.** Both are a 20-second
  `page.goto` timeout, not a broken screen. Re-probed in a real browser they
  returned 200 with zero page errors in ~32s each — and the control in that
  re-probe was `/accounts`, a route this same walk had already probed
  successfully, which took 99s. The reading was about dev-server compile load,
  never about those two screens. The navigation budget is now 120s and
  configurable (`WALK_NAV_TIMEOUT_MS`); see the note at that line for why the
  2026-08-29 fix to the wait-AFTER-load left this one behind.
- **The 403s in the console are the harness, not the app.** Thirteen screens
  logged `[google-catch-up] ApiFailure: That request didn't come from this
  site.` That is `DEV_API_ORIGIN`'s documented blind spot: the walk runs against
  a local dev server rewriting to staging, so a browser WRITE carries
  `Origin: http://localhost:3065` and the CSRF guard in
  `shared/workers/front-door.ts` correctly refuses it. `web/next.config.ts` names
  this trade beside the benefit. Any walk run this way will show it, and it says
  nothing about the product.

**Nothing here spent AI.** The walk only navigates and screenshots; no agent turn
was invoked on any screen.

## What is fixed now

The script writes its results to `.session-notes/lanes/empty-walk.json` on every
run (override with `WALK_REPORT`). That path is tracked, so the last walk is
always in the repo and its history is the file's own `git log`. Commit it — that
is the point.

## How to run it

Needs a running dev server and two live sessions: a **fresh** team with nothing
in it, and a **populated** one for the canary.

```bash
FRESH_COOKIE=<cookie> FRESH_TEAM=<id> CANARY_COOKIE=<cookie> CANARY_TEAM=<id> \
  node scripts/lane-shots/walk-empty-team.mjs
```

The canary is not optional. If it reports zero rows on a team known to have
data, the script exits non-zero and refuses to walk — a probe that cannot see
content when content is there would report every destination as "empty",
indistinguishable from the truth.

## What is checked without a walk, and what still needs one

Since 2026-09-05 the cold path has tests in CI, so a walk is no longer the only
instrument:

- `web/test/cold-account.test.tsx` — the agency door. The landing screen names a
  first act on a team with nothing in it; every declared import target has a way
  in from a screen; each collection's empty sentence is true of that collection;
  and six real collection screens are rendered through the real engine with
  `data={{ rows: [] }}` and must reach their own empty state, name their act
  where one exists, and draw no toolbar over zero rows.
- `web-portal/test/cold-portal.test.tsx` — the client door. Tickets, Deliverables
  and Impact each offer something to press when empty, and the toolbar stays
  away until there is something to search.

Both suites refuse an empty render before believing any absence, for the same
reason the walk runs a canary.

**What a test still cannot see, and a walk can:** anything about layout, real
network timing, a cold Next route compile, a screen that renders correctly in
jsdom and is unreadable on a phone, and any destination not covered by the two
suites above. A live walk with a fresh account still beats every static check
here put together. Run one before a client demo.
