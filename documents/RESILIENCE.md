# RESILIENCE.md, the bad day

Every other doc here describes the system working. This one describes it not
working, and it answers three questions the rest of the canon never asks out
loud:

1. **What falls over when one worker does?**
2. **Who owns a fact, when more than one worker can write it?**
3. **How do the rows come back?**

Written 2026-08-14 out of an architecture review. Nothing here changes a locked
decision in [ARCHITECTURE.md](ARCHITECTURE.md), it writes down consequences the
locked shape already has.

---

## 1 · Blast radius, auth is the single point of failure

**Say it plainly: `kwapso-auth` is depended on by seven of the eight workers.**
Every other worker service-binds it, because every gated request begins by asking
one question, *who is this?*, and there is exactly one master that can answer
(ARCHITECTURE §3: one session system, no auth vendor).

```
                        gateway ─┐                    portal-gateway ─┐
                                 │                                    │
   tenancy ─┐   content ─┐   data-ops ─┐   mcp ─┐   realtime ─┐       │
            └────────────┴─────────────┴────────┴─────────────┴───────┘
                                    ▼
                              kwapso-auth          fan-in 7 of 8
                                    │
                                    ▼
                            kwapso-realtime        fan-in 6 of 8
```

### The worst case, stated

> **If `kwapso-auth` is down, seven of the eight workers stop serving anything
> gated.** Both front doors still answer, the screens load from static assets,
> and cached screens still paint, but every API call behind them returns
> `503 auth_unavailable`, and the user sees an app that renders and cannot do
> anything. Sign-in is also unavailable, so nobody can get in behind them.

This is a deliberate consequence of "one session system, one master", not an
oversight. It is written here so it is a known cost rather than a discovery.

### What softens it, and what does not

| | |
|---|---|
| **A ceiling on the wait** | `AUTH_UNAVAILABLE_MS` (5s) in `shared/workers/gating.ts`. A slow auth degrades the request that hit it, not the worker behind it. Without a ceiling one unwell worker fills five others' queues, and the outage spreads by waiting. |
| **An honest code** | An auth outage throws `503 auth_unavailable`, never `null`. `null` means "not signed in", and callers turn that into a 401 that signs somebody out, so an outage that returned `null` would log every signed-in person out of a healthy app and send them all back to the door that is already struggling. |
| **No fallback identity, on purpose** | There is no cached session, no "assume signed in". Guessing on the identity read is guessing on the gate, and the permission spine is the product. Availability is not bought with a weaker fence. |
| **Realtime degrades, it does not fail** | `kwapso-realtime` has fan-in 6 and is the one dependency that is genuinely optional. `publishChange` is wrapped, capped at 2s, and swallows its own failure: a live-layer outage costs a screen its instant refresh and nothing else, because the write already committed and the client is cache-first ([CACHING.md](CACHING.md)). Same for member-notification email (`sendBrandedEmail`, 15s cap). ARCHITECTURE §5 already locks the state change as the authority. |

### The recommendation this review did NOT act on

A read-through identity cache in the gating seam, a short-lived signed copy of
`/api/auth/me`, would let already-signed-in people keep working through an auth
outage. It is **not** built, because it is a change to how the permission spine
decides, and that is an owner's decision, not a reviewer's. The cost of leaving
it: an auth deploy that goes wrong is a total outage rather than a degraded one.

---

## 2 · Who owns a fact

Two components that can both write the same fact will eventually disagree about
it, and no log will explain why. Four tables in this codebase are written from
more than one worker in production — the rows below are the census, and a new
second writer means a new row. **None of them is a shared field**, each is
a clean split that nothing had written down until now.

| table | owner | the other writer | the split |
|---|---|---|---|
| `users` (core) | **auth** | tenancy | auth owns IDENTITY, the row itself, `email`, and the profile fields. tenancy writes exactly one column, `current_team_id`, because "which team is this person looking at" is a tenancy fact that happens to live on an auth-owned row. Pinned by `workers/tenancy/test/ownership.test.ts`. |
| `selectable_data` (team) | **tenancy** | content | tenancy owns the vocabulary, the Dropdown values screen creates, edits and deactivates. content only ever INSERTs a value that is absent, through the one pick-or-create seam (`ensureSelectableValue`), and never updates or deactivates one. A retired value stays retired. |
| `error_logs` (core) | **shared seam** | data-ops | `logError` is the only thing that ever INSERTs. data-ops' admin door only ever UPDATEs the resolution columns (`status`, `resolved_at`, `resolution_note`). Disjoint columns: the appender and the resolver cannot contradict each other. |
| `sprints` (team) | **content** | tenancy | content owns the sprint — created, priced, completed through the work engine. tenancy's waves module writes exactly one column, `wave_id` (`setSprintWave` in `workers/tenancy/src/lib/waves.ts`), because "which wave holds this sprint" is a fact about what the client bought, which is tenancy's spine — the same one-column shape as `users.current_team_id` above. The predicate rides the UPDATE (R17), and the wave's own derived dates are recalculated in `waves`, never written onto the sprint. |

Everything else the probes flag is a false positive worth knowing about: the
`help` and `knowledge_*` writes attributed to tenancy are
`TEAM_MIGRATIONS` SQL in `workers/tenancy/src/team-schema.ts`. Tenancy owns
rolling team schema forward; that IS its job, and a migration is not a runtime
writer. (`sprints` used to be on that false-positive list too; the waves module
made it a REAL second writer on 24 Aug 2026, which is what the row above records.)

**If you add a second writer to a table, add a row above.** A split nobody wrote
down is a split the next person will not preserve.

---

## 3 · Live data can be recovered

### What is stateful

| store | holds | recoverable by |
|---|---|---|
| `kwapso-core` (D1) | users, teams, team_members, invites, mcp_tokens, error_logs | dump + Time Travel |
| one D1 **per team** | that team's everything: roles, permissions, tickets, work engine, knowledge, accounts, activity | dump + Time Travel, **per team** |
| R2 buckets (4) | uploaded media, ticket attachments, the agency's own files, and the legacy article media nothing writes to any more | object-by-object dump, **no Time Travel**, so the last run is the only copy |
| Vectorize index | knowledge embeddings | **derived**, rebuilt from the team databases |
| Durable Objects | open WebSockets | **nothing to recover**, holds no app data (ARCHITECTURE §2) |

### Taking a backup

```bash
node scripts/backup.mjs production
```

Read-only, refuses to run unless `CLOUDFLARE_ACCOUNT_ID` names this project's
account, and dumps the core database plus **every team database core points at**.
Each dump is read back and must contain real statements before it counts, a
zero-byte file in a backup folder is the most expensive kind of success. A
`manifest.json` lands beside the dumps listing what was captured and what was
not.

### Restoring

**Two paths. Reach for the first one first.**

**a · Time Travel, a database that still exists, inside 30 days.** The fastest
and the one to use for "the migration went wrong an hour ago".

```bash
npx wrangler d1 time-travel restore <database-name> --timestamp <ISO-8601>
```

**b · A dump, a database that is gone, or damage older than 30 days.**

```bash
npx wrangler d1 create <database-name>
npx wrangler d1 execute <database-name> --remote --file backups/<folder>/<database>.sql -y
```

**Per-tenant restore is the normal case, not a special one.** Because each team
has its own database, one team's rows come back without touching anybody else's:
restore that team's database and nothing about any other team moves. This is the
per-team-database decision (ARCHITECTURE §1) paying out on the bad day. If the
team database is recreated rather than restored in place, update
`teams.database_id` in core to the new id, that pointer is what the gating seam
resolves.

### What is NOT backed up, and what that costs

- ~~**R2 buckets.**~~ **Now covered**, `scripts/backup.mjs` copies every object
  in every bucket this environment owns, alongside the database dumps. R2 still
  has no equivalent of Time Travel, so the backup is the only copy: a bucket
  deleted between two runs is gone for the window between them.

  Two properties worth knowing before you trust it. The **bucket is the
  inventory**, not the database, every object is copied whether or not a row
  names it, because a key nobody references is usually an upload whose form was
  abandoned, and guessing from six upload routes' columns was how the first
  attempt would have quietly missed files. The databases are the **cross-check**:
  a row naming a key the bucket does not hold is reported as a failure, and that
  file was already lost before the backup ran. And a bucket the account holds
  that no config covers **fails the run** rather than being skipped, because a
  backup that reports success while incomplete is worse than none.
  `web/test/backup-covers-r2.test.ts` derives both halves from the source.
- **Secrets.** `RESEND_API_KEY`, `GOOGLE_CLIENT_*`, `GOOGLE_CONNECT_*`,
  `GOOGLE_TOKEN_KEY`, `CF_D1_TOKEN`, `INTERNAL_KEY`. Re-set from the owner's
  password manager per [OPERATIONS.md](OPERATIONS.md). **`GOOGLE_TOKEN_KEY` is
  the one that cannot be re-issued**: it decrypts stored Google refresh tokens,
  so losing it means every connected person reconnects.
- **The Vectorize index.** Derived. The knowledge sweep re-embeds from the team
  databases; the cost is model calls and a delay, not data.

### When the restore was last tested

> **EVERY BUILD, AND AGAINST EVERY MIGRATION ON DISK.** The rehearsal is no
> longer a date somebody has to keep current — it is
> `workers/auth/test/restore-rehearsal.test.ts`, and it runs in `npm run check`.
>
> **What it does, on every run:** replays every file in `db/core/` in order into
> a scratch SQLite database (D1 *is* SQLite), fills every table with a row typed
> off that table's own `PRAGMA table_info`, dumps schema + data in the shape
> `wrangler d1 export` produces, reloads it into an EMPTY database, and compares
> both sides as the databases describe themselves — `sqlite_master` for the
> schema, row-for-row for the values.
>
> **Measured 2026-09-05, at 28 migrations: 20 tables, 25 named indexes (51
> including the ones a UNIQUE constraint creates), every row byte-identical
> after the round trip.** The 2026-08-14 figures — 20 migrations, 18 tables, 44
> indexes — were a hand-run of the same procedure; the index counts differ
> because that one counted auto-indexes too.
>
> **The four things it would catch:** a migration that will not apply to an empty
> database (a restore starts from nothing); a schema a dump cannot reload; an
> index lost in the round trip (the half a naive dumper forgets, and invisible
> until a query that needed it runs on a full table); and a value that comes back
> changed. It carries its own canary — a dump that wrote no INSERTs at all would
> satisfy every equality in it, so the number of rows compared is asserted too.
>
> **What it still does NOT test:** `wrangler d1 export --remote` against live
> Cloudflare, and Time Travel. Both need a real environment and stay a manual
> rehearsal — run one against staging when you can, and record the date HERE
> rather than in a commit message. That half, and only that half, can still go
> stale.
>
> ---
>
> **THE REMOTE HALF, REHEARSED 2026-09-06 AGAINST STAGING. Export and reload:
> PASS. Time Travel: still not tested.**
>
> `cf-exec npx wrangler d1 export kwapso-core-staging --remote` produced a
> **4,333,058-byte** dump in **9.5 seconds**. Loaded into an empty SQLite with
> `sqlite3 restored.db < dump.sql`: **zero errors, 21 tables, 25 indexes,
> 6,340 rows**, in 3.5 seconds.
>
> The dump reconciles against itself exactly: 6,341 `INSERT INTO` statements =
> 6,340 data rows + one `sqlite_sequence` row, which is internal and correctly
> outside the count.
>
> And it reconciles against the LIVE database, which is the half a dump cannot
> prove on its own. Counted through `wrangler d1 execute --remote` on the seven
> tables that do not take continuous writes:
>
> | table | restored | live | |
> |---|---|---|---|
> | `users` | 19 | 19 | exact |
> | `teams` | 5 | 5 | exact |
> | `d1_migrations` | 28 | 28 | exact |
> | `importable_databases` | 10 | 10 | exact |
> | `invite_index` | 14 | 14 | exact |
> | `mcp_tokens` | 92 | 92 | exact |
> | `team_members` | 13 | **14** | live gained one after the export |
>
> That last row is the useful one: staging is in use, somebody joined a team
> between the export and the comparison, and the check noticed. A comparison
> where everything matches can be a comparison that is not really looking.
> `sessions` (787) and `error_logs` (5,090) were deliberately not compared for
> the same reason — they are written continuously, so equality there would mean
> nothing either way.
>
> `d1_migrations` = 28 also settles the thing that started this: the live staging
> core really is at 28 migrations, the same 28 in `db/core/`, so the schema that
> round-tripped is the schema that is deployed.
>
> **Two cautions, both learned in the doing.** (1) `wrangler d1 export --remote`
> warns that "your D1 database will be unavailable to serve queries" and, in a
> NON-INTERACTIVE shell, auto-answers **yes** — it took 9.5 seconds on a 5 MB
> staging core, but do not let a script run this against production unattended.
> (2) D1 refuses a compound `SELECT` of even six `UNION ALL` terms
> ("too many terms in compound SELECT"), so a per-table census has to be one
> query per table.
>
> **STILL NOT DONE, and deliberately not claimed:** Time Travel has not been
> restored to a bookmark, and the 132 MB **team** database
> (`team-01kzwxfd86n0k3rzrbhkmkrwys`, `TEAM_DB_0_ID`) has not been exported —
> only the 5 MB core. A team database holds the customer data, is 26× larger,
> and is where a real restore would hurt; do not read the pass above as covering
> it.

**An untested restore is not a restore**, and until 2026-09-05 that rule was
enforced by nobody — which is how the recorded rehearsal came to be eight
migrations behind the schema it was reassuring people about. It is enforced now,
for the local half: the suite reads `db/core/` at the moment it runs, so
"20 of 28" cannot happen again, and a migration that breaks the round trip turns
the build red on the commit that adds it rather than on the day somebody needs a
restore.

The REMOTE half is still a manual rehearsal, and it is still the half that runs
on the bad day. **Export-and-reload was rehearsed on 2026-09-06 and passed** —
the figures are in the block above. Two pieces of it remain untested, and they
are the two that matter most:

1. **Time Travel.** Nothing has been restored to a bookmark. This is the path
   RUNBOOK §2 sends you down for a live database inside 30 days, so it is the
   one most likely to be used and the only one never tried.
2. **A team database.** Only the 5 MB core was exported. The customer data lives
   in the team databases; the staging one is 132 MB, 26× larger, and its export
   time, dump size and reload behaviour are all unmeasured.

Do those two in the next staging window and extend the block above. Until then
the honest statement is: *we know the export mechanism works and produces a dump
that reloads faithfully; we do not know what it costs on a real team database,
and we have never used Time Travel.*
