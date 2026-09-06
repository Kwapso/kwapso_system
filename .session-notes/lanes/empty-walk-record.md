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
