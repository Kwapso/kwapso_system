### invite_logs. BUILT (per-team, team migration `0003_invite_logs`) + invite_index (GLOBAL, built)
`invite_logs` (full record in the team DB): audit + a FROZEN inviter snapshot
(`inviter_user_row_id`, `inviter_email`, `inviter_full_name`, `inviter_image`),
invitee (`invitee_user_row_id` if they have an account, `invitee_email`,
`proposed_member_role_id`), `created_on`, `shelf_life_in_hours` (default 168h =
the 7-day expiry), `invite_accepted`, `invite_acceptance_timestamp`. Its `id` =
`invite_index.invite_row_id`. Written on invite-create, stamped accepted on
accept (both best-effort, the global index is the routing truth, so a team-DB
hiccup never fails the invite/join). Surfaced on the invite detail (inviter +
acceptance) and as the `invite` activity scope. The GLOBAL `invite_index`
(already built) is the thin routing copy so onboarding can find invites by email
without opening every team DB.

### activity (Glide "All activity"). KEEP (table BUILT, per-team; feed + read path shipped). **Q3 RESOLVED.**
Purpose: the human-readable change feed. Glide referenced the subject row via
**one relation column per table** (`Invite logs/Teams/Member roles/Team members/
Data import sessions Row ID`). The Kwapso System uses a generic `(related_table,
related_row_id)` pair instead → scales to any module without new columns.

**WHAT ONE ROW SAYS (team migration `0062`, activity review 2026-09-05).** `id`,
`type`, `verb`, `origin`, `description`, `(related_table, related_row_id)`,
`created_at`, and the frozen actor snapshot `(creator_id, creator_email,
creator_name)`. An audit row has to answer three questions — WHO did it, WHAT it
was about, and WHERE it came from — and for a year it answered two.

- **`origin` — which front door.** Four surfaces act as the SAME PERSON through
  the SAME gated doors: the agency app, the client portal, a personal access
  token on the MCP surface, and the in-app assistant acting as its caller. That
  identity is the security design and it is right — the agent never exceeds the
  rights of the person it acts for — but it made their rows byte-identical, so
  after a leaked token the first question an owner asks (*which of these did
  this?*) had no answer in the one table that exists to answer it. One of seven:
  `app`, `portal`, `mcp`, `assistant`, `import`, `automation`, `unknown`. Stamped
  at the two public gateways (which SET the header, so a browser cannot label its
  own request) and carried by `forwardToDoor` on every act-as-user hop. **Nothing
  gates on it** — it is a label on history, never an authorisation, deliberately,
  because the moment a surface label decides something, forging it becomes worth
  trying. See `shared/workers/origin.ts`.
- **`verb` — what kind of event.** `type` is a human sentence and stays one; it
  is what the feed shows. It is also 157 distinct free-text literals across 139
  call sites, so "every archive last quarter" was a `LIKE` over prose that
  silently missed `retired`, `withdrawn`, `taken down`, `switched off` and
  `binned` — one event in five coats. Eight values (`created`, `edited`,
  `status`, `archived`, `restored`, `deleted`, `viewed`, `other`), DERIVED from
  the sentence in the one writer so no call site had to change and none can
  forget. See `shared/workers/activity-verbs.ts`.

Both are NULL on every row written before `0062` and neither is backfilled: there
is nothing on an old row that says which surface wrote it, so a backfill would
have to invent it. A NULL means *written before the column existed*; the string
`unknown` means *we asked and could not tell*. Two different facts, two different
values, neither guessed.

**Indexes (team migrations `0023_activity_feed_index` and `0062`).**
This is the fastest-growing table in a team database by construction: R1 makes every
mutation publish and this feed records a row for each, so at the yardstick it is the
tens-of-millions one. It pages by keyset (R14) on `ORDER BY created_at DESC, id DESC`,
and from `0001` until `0023` its only index led with `related_table`. So the RECORD
scope was indexed and the TEAM scope, the feed everybody opens, was not: every page
scanned and sorted the whole table to hand back fifty rows, and page two paid it
again. `idx_activity_feed (created_at DESC, id DESC)` serves the unfiltered page;
`idx_activity_table_feed (related_table, created_at DESC, id DESC)` serves R18's
`related_table IN (…)` page and lets the R16 `COUNT(*)` beside it read an index
rather than the widest table in the database. (`meetings` has carried exactly this
index for exactly this reason since `0021`.) The count is still O(rows-it-counts),
that is R16's price, and it is settled in [ARCHITECTURE.md §7](ARCHITECTURE.md) (the scaling decision, LOCKED). *(It used to cite `scaling-review.md`, the audit report behind that section — deleted 29 Aug 2026 and in no clone; README's document map says so under that name.)*
`idx_activity_actor_feed (creator_id, created_at DESC, id DESC)` is the third, added
in `0062` for the question the other two cannot answer: **what has this person
done?** None of the first three led with `creator_id` and nothing queried the table
that way, so an actor-scoped read was a full scan and a sort of the largest table in
the database — guaranteed to time out at exactly the moment it is first needed, which
is the hour after a token leaks. With four write surfaces acting as one person, that
is the query that matters most and it was the one shape the table was not built for.
*The INDEX is here; the READ PATH is not — `getActivity` still scopes by
`(related_table, related_row_id)` only, and an actor-scoped door is an owner's
decision (it names what one colleague did to another's records, so it is a
permission question before it is an index question).*

**HOW FAST IT GROWS — rows per active record per month.** Derived from the
write census, not estimated: 150 mutation doors, 146 of which write exactly one
row (three write one row for a whole bulk move or sweep, which makes them
cheaper, not dearer). So the rate is **one row per mutation, and a record's
history is exactly as long as the number of times somebody changed it.** In the
agency's own shape that is roughly:

| record | changes per month, each | rows/month |
|---|---|---|
| an open ticket | raised, triaged, ready, scheduled, in progress, edited ×2, resolved | ~8 |
| a story in a live sprint | created, edited ×3, in progress, done | ~6 |
| a company record | edited ~1 | ~1 |
| a dormant record (archived, or nobody touched it) | — | 0 |

A team running 200 open tickets and 100 live stories writes on the order of
2,200 rows a month, ~26k a year — kilobytes, not gigabytes, at this size. The
number that matters is not the agency's, it is the **yardstick's**: the same
arithmetic at a quarter of a million people in one tenant is where "tens of
millions" comes from, and it is why every read over this table pages by key and
why `0062`'s index exists before anybody needs it. Growth is watched by
`db_growth` / `db_alerts` like every other table.

**RETENTION: FOREVER, DELIBERATELY.** The nightly retention sweep excludes this
table by name — "anything anyone might have to answer for later… stay" — and
nothing archives or destroys a row. That is a decision, not an omission: a trail
with a horizon answers "what happened to this record?" only for records younger
than the horizon, and nobody knows in advance which ones they will be asked
about. If it is ever revisited, the answer is an ARCHIVE (export the tail to R2
and drop it), never a delete.

**APPEND-ONLY.** Nothing in the application updates or deletes a row here, and
there is exactly one way in from outside a migration — `insertActivity`, private,
behind `logActivity` (swallows and records its own failure) and `writeActivity`
(throws, for the callers where the row IS the point: a user-authored note, and
the one hard delete). Stated in the schema comment on the table and asserted by
`workers/tenancy/test/activity-trail.test.ts`, which fails on any `UPDATE`
or `DELETE FROM` against it anywhere in the workers, and on a second `INSERT`.

**WHAT IS DELIBERATELY NOT LOGGED**, in one place rather than in nobody's head:
the reviewed silences live beside the worker they describe, in each
`activity-seam.test.ts` (`SILENT`), one line each with its reason, and the seam
fails both ways — a route that leaves no line and has no entry turns the build
red, and so does an entry whose route has quietly started logging. Today there
are four across 150 mutations: a ticket REPLY, a work log, stopping a timer
(each is itself the record rather than a change to one, and each carries its own
audit block and is displayed as history where it belongs) and the owner's
AI-credit grant, which changes no team record and so has no `related_table` to
hang on. Everything else writes a line.

**READING ONE PERSON'S HISTORY ACROSS BOTH TABLES.** There are two trails and
they are split by DATABASE BOUNDARY, not by feature: identity events live in the
global `account_activity` (the person's own history, across every team) and team
events live in each team's `activity`. That is legitimate — a per-team table
cannot hold "you changed your email", which belongs to the person and not to any
one team — but it means a full history is two reads, and until now nothing said
how to do them:

> **A RECORD's history is NOT two reads, and this heading used to say it was.**
> `account_activity` has exactly five columns — `id`, `user_id`, `type`,
> `description`, `created_at` (`db/core/0007`) — and no `related_table` /
> `related_row_id` pair, so it cannot name a record even in principle; its `type`
> is one of `name_changed` / `photo_changed` / `email_changed`. **A ticket's or a
> story's whole life is in the team `activity` table alone**, and step 1 below is
> the entire recipe for it. Only a PERSON spans both, which is why the join
> further down is on the person and could not have been on anything else.

1. **The team half** — `GET /api/tenancy/activity?scope=record&table=<t>&id=<id>`
   for one record, `?scope=team` for the whole team (R18 subtracts the caller's
   denied modules; R14 pages by keyset). `?scope=user|role|invite` are the same
   read with the table supplied by the scope name.
2. **The identity half** — `GET /api/auth/activity`, the signed-in person's own
   `account_activity`, newest 50.

They are joined on the PERSON (`activity.creator_id` = `account_activity.user_id`
= the core `users.id`) and ordered on `created_at`, which is an ISO-8601 UTC
string in both. Nothing joins them server-side today and nothing should without a
decision: the identity half is the person's own and is read under their own
session, while the team half is fenced per module and per account. **The reason
they are two doors is the reason they are two tables.**

Per the
Q3 resolution below, **log EVERYTHING** (creations, edits, activations/
deactivations, milestones), superseding the earlier "edits/deactivations only",
the SAME rows are surfaced four ways by the read path
(`?scope=team|user|role|invite`).

### data_import_sessions. REMOVED (BUILT 2026-06-23, team migration `0004_modules`; DROPPED 2026-09-14, migration `0087`). THE ORIGINAL SINGLE-TARGET IMPORT

**Superseded, not ruled on.** Unlike the rate cards below, nobody said "kill
this" — `data_import_batches` (BUILT 2026-07-04, `0006_import_batches`) simply
replaced it eleven days later with the agentic multi-file import
(AGENTIC-IMPORT.md), and every door, lib and screen moved onto the new shape at
the same time. The old table was never dropped when the new one landed; it was
just the thing nothing pointed at any more, found by a read-only audit on
14 Sep 2026.

What it held, while it was live: audit + the target (`table_key`/display), the
column schema, a `reference_dataset_url`, an `overall_status`, and the three
stages of a file → mapping → confirm session (uploaded CSV text + auto-mapped
columns + preview + the write result) — one file, one target, three stages as
columns on one row. See `data_import_batches` below for the shape that replaced
it, and its own migration `0087` for the two-method proof nothing read this
table any more (a whole-repo grep and a read of the import pipeline's SQL
literals both agreed) and why the drop needed no deploy ordering, unlike
`0077`/`0078`.

