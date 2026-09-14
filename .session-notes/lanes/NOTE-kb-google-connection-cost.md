# NOTE — the Google sweep re-derives the same connection/scope six-plus times
# a tick; nobody shares a read. Cost, not correctness. Not built tonight.

**Lane** `kb_CD` · branch (this note) `docs/kb-google-connection-cost-note`,
off `main` at `89fd6523` · 2026-09-12. Written at the hub's explicit request,
after diagnosing (not fixing) a loose thread flagged during the backfill
watermark investigation: six live `google_connections` rows with
`service='gmail'` for one person, and a SLOW DOOR log line reading
`SELECT google_connections ×25` on a single `sync-google` tick. The hub's
call: real improvement, wrong night to touch a file that just stopped losing
data and is mid-recovery — write it up instead. This is that write-up.

## Part 1 — the six-connection question, CLOSED, do not re-open

**Is the pick stable?** Moot. `activeConnection` (`workers/content/src/lib/google.ts:223-237`)
is a bare `WHERE user_id = ? AND service = ? AND deactivated_at IS NULL LIMIT 1`
with no `ORDER BY` — which would be a real risk over an ambiguous set. It
isn't one. `idx_google_connections_live` (migration `0019_google_connections`,
`workers/tenancy/src/team-schema/migrations.ts:1540-1541`) is a **UNIQUE**
index on `(user_id, service) WHERE deactivated_at IS NULL`. Confirmed against
staging's *live* schema, not just the migration file — `SELECT name, sql FROM
sqlite_master WHERE type='index' AND tbl_name='google_connections'` on the
real database returned the index with that exact definition. At most one row
can ever satisfy `activeConnection`'s WHERE clause. There is nothing for a
missing `ORDER BY` to disambiguate.

**Same mailbox or different?** All six of alaap's gmail rows carry
`google_email = 'alaap@kwapso.com'`. One account throughout.

**Why six at all?** Reconnect does deactivate the previous row. Checked
directly — five of the six carry a real `deactivated_at`, each landing
seconds to a day before the *next* row's `created_at`:

| id (short) | created_at | deactivated_at |
|---|---|---|
| `01M07E78…` | 08-17 08:43:14 | 08-18 05:50:43 |
| `01M09PRH…` | 08-18 05:50:58 | 08-19 03:57:50 |
| `01M0C2Y5…` | 08-19 04:02:14 | 08-20 08:14:52 |
| `01M0F3T9…` | 08-20 08:15:18 | 08-25 08:09:31 |
| `01M0W9M0…` | 08-25 11:06:52 | 08-25 18:59:01 |
| `01M0Y5RP…` | 08-26 04:38:00 | **null — live** |

`SELECT COUNT(*) WHERE deactivated_at IS NULL` → 1, right now. A clean,
sequential trail of nine days of reconnects — almost certainly repeated
staging/dev sign-ins, not a leak or a bug. **Working as designed.**

## Part 2 — the cost question, real, NOT built tonight

**The observation.** One `POST /api/content/knowledge/sync-google` tick,
staging, 2026-09-12 14:16:07: `406932ms` (6.8 minutes) over a 250ms write
budget, `1210 D1 trips`, `INSERT knowledge_sources ×152`,
`SELECT google_connections ×25`. Contrast: ordinary ticks on the same door
logged `SELECT google_connections ×3` at a few hundred ms each. The ×25 tick
was heavier (more kinds actually had work), which is consistent with — but
does not on its own prove — the mechanism below; I did not instrument a live
tick to get an exact per-call count, only walked the call graph.

**The mechanism, named.** At least six independent call sites in one
`sweepGoogle` tick each separately ask "what's this person's active
connection / scope for this service", and none of them share a read with any
other:

1. `sweepGoogle`'s own pre-check loop (`workers/content/src/lib/knowledge-google.ts:1770`)
   calls `googleScope(cfg, guard, service)` once per scoped service
   (`GOOGLE_SCOPED_SERVICES` = gmail, calendar) — up to 2 reads, purely to
   decide whether a closed scope should skip the kind entirely.
2. `readGoogleMaterial` (`workers/content/src/lib/google-read.ts`) calls
   `tokenOrNull(...)` once per requested service — but gmail and calendar
   are each asked for TWICE per tick (once for the live/forward slice, once
   for the backfill slice — `knowledge-google.ts`'s gmail `read:` at line
   ~1354 and calendar's at ~1450 both call `slice()` twice). That alone is
   ~7 token reads across drive(1) + gmail(2) + calendar(2) + chat(1-2).
3. `scopedGmailSearch` (`google-read.ts:488`) calls `googleScope(cfg, guard,
   "gmail")` **internally, every time it's called** — no way to hand it a
   cached scope. Since it's reached twice a tick (forward + backfill), that's
   2 more reads with no escape hatch available at all.
4. `scopedCalendarWindow` (`google-read.ts:505-517`) **does** accept a
   `known?: GoogleScope` parameter — built for exactly this problem, for
   `meetings.ts`'s own case of four windows in one breath, and its own doc
   comment says so explicitly: *"a caller taking four windows in one breath
   … would otherwise pay for the same two database round trips four times
   over, and the REST door is the expensive thing in this worker."* But
   `readGoogleMaterial`'s own calendar branch (`google-read.ts:810`) calls it
   as `scopedCalendarWindow(cfg, guard, token, { from, to })` — **without**
   passing `known`. The plumbing exists; this call site doesn't use it. 2
   more un-cached reads a tick.
5. `chatBackfillRows` (`knowledge-google.ts:1280`) does its own separate
   `tokenOrNull(env, cfg, guard, "chat")`, on top of whatever
   `readGoogleMaterial`'s own chat branch already did.
6. `retireVanished` (`knowledge-google.ts:2139-2204`), which runs once at
   the end of every sweep, loops over every service that was actually read
   and calls `accessTokenFor(env, cfg, guard, service)` again for each one
   (line 2190) — up to 4 more — and for calendar specifically also calls
   `scopedCalendarIds` (line 2200 → `knowledge-google.ts:2066`), which
   re-derives `googleScope("calendar")` yet again.

Hand-tallying the call graph (not a live trace): 3 + 7 + 2 + 2 + 1 + 4 + 1 ≈
20 independent `google_connections` reads for one person's one tick, before
counting whatever `accessTokenFor` itself does internally (I did not trace
expiry/refresh logic for a second read). Same order of magnitude as the
observed 25; close enough that the mechanism is the right explanation even
without an exact per-call trace to confirm the last few.

## Why it was not fixed tonight

The hub's reasoning, recorded here because it's a judgement call and not a
rule: this is the same file (`knowledge-google.ts`) that carried two
independent silent-data-loss bugs found and fixed earlier today (the
watermark-undercount fix, `67a7ad3c`/`6eda95dd`, and the advance-function
stall fix, `c26e5f00`/`89fd6523`'s ancestor), and it is *right now* the path
actively recovering a real person's lost mail (74 sources filed since the
reset and climbing, per the hub's own count). A performance change here
tonight risks destabilizing the one thing currently working, to save SELECTs
nobody is blocked on — the sweep being slow costs nothing that's waiting on
it; the recovery isn't gated on it, the smokes pass, the owner is asleep.

## The shape of the fix, for whoever picks this up

Not attempted — sketched only. `readGoogleMaterial` already reads `contacts`
once for the whole call rather than once per branch (see its own comment:
"Read ONCE for the whole call, not per service"); the same discipline could
extend to `GoogleScope`: read `googleScope("gmail")`/`googleScope("calendar")`
once per `readGoogleMaterial` invocation (not per forward/backfill call), and
give `scopedGmailSearch` the same `known?: GoogleScope` parameter
`scopedCalendarWindow` already has, threading it through from
`readGoogleMaterial` on both branches. `sweepGoogle`'s own pre-check loop and
`retireVanished`'s per-service loop are separate top-level passes and would
need their own read regardless — but collapsing the 2-per-tick duplication
inside `readGoogleMaterial`/`scopedGmailSearch`/`scopedCalendarWindow` alone
would cut a meaningful fraction of the ~20 without touching the
watermark/advance logic those two bug fixes just hardened. Test it the way
this lane tested the advance-function fix: a spy on `d1Query`/`activeConnection`
counting calls per tick, mutation-proved by reverting the cache and watching
the count climb back up.
