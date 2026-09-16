# MCP blackbox — answer key (Kwapso team)

**The tester never sees this file.** Captured 2026-09-16 against staging
(`https://agency-staging.kwapso.app`), team **Kwapso**
(`01KZWXFD86N0K3RZRBHKMKRWYS`), using the sandbox token itself (same role
and rights the tester gets).

**Drift warning.** This is the real, actively-used staging team — other
sessions and the owner touch it. Counts (tasks 2/3/4/5) can move by a
handful between capture and test; re-run the matching call yourself before
marking a count wrong. Tasks 6/7 key off a specific sprint/ticket `ref`
(`S0102`, `T0001`) that nothing deletes or renumbers, so they should hold
exactly. Tasks 8/9 create new BLACKBOX rows and are self-verifying.

## 1. Workspace name

**"Kwapso"** — `get_team`, field `name`.

## 2. Account count

**134** — `list_accounts`, field `total`.

## 3. App count

**28** — `list_apps`, field `total`.

## 4. Apps in stage "Maintenance"

**11** — `query_records` `{"module":"apps","groupBy":["stage"]}` → group
`{"stage":"Maintenance"}` count 11. (Full breakdown at capture: Maintenance
11, Completed 7, Build 6, Not started 3, Archived 1 — total 28.)

## 5. Confia's tickets

Account "Confia" = `01KZXBT5T6CVY065QVW9M2S47G`.
- **Total: 380** — the busiest account on the team by ticket count
  (confirmed via `query_records {"module":"tickets","groupBy":["accountId"]}`,
  or `list_help_tickets({"accountId":"01KZXBT5T6CVY065QVW9M2S47G"})` → `total`).
- **Not resolved: 30** — `query_records`
  `{"module":"tickets","where":[{"field":"accountId","op":"eq","value":"01KZXBT5T6CVY065QVW9M2S47G"},{"field":"status","op":"ne","value":"resolved"}],"countOnly":true}`.

**This is the deliberate big-reply task.** `list_help_tickets` for Confia's
one page (50 rows, the door's own cap) came back **71,835 bytes** at
capture — well past the 20,000-character line `scoring.md` and MCP.md's
own `result_too_large` cap (400,000) both care about. A tester who reaches
for `list_help_tickets` first (the obvious tool) rather than
`query_records` with `countOnly` pays that cost for a question that never
needed the rows, which is exactly the "oversized replies" complaint this
run exists to measure. Both paths get a correct answer; only one of them
is cheap.

## 6. Sprint → app chain

Sprint `ref S0102` = id `01M20ATGN9J734MSBX7CF8DGXG`, `appId`
`01KZXD67BZW38R1ZN1ZH8DBRRG`. That app: **`ref A0028`, name "ERP
Kennogroup", stage "Not started"**. Found via `list_sprints` (or
`query_records` module `sprints` where `ref eq S0102`), then
`query_records` module `apps` where `id eq 01KZXD67BZW38R1ZN1ZH8DBRRG`
(`list_apps` itself has no id/ref filter — only `accountId` and `q`).

## 7. Ticket → account chain

Ticket `ref T0001` = id `01KZXC4EQKPZENZDTREJ1R1EG0`, `accountId`
`01KZXBT09VCBGNZNDHXE75YXEV` = **"Amstella"**. Status at capture:
`resolved` (not part of the question, but worth checking the tester didn't
report the wrong account off a stale row). Found via `query_records`
module `tickets` where `ref eq T0001`, then account name via
`list_accounts` or `query_records` module `accounts` where `id eq`.

## 8. Raise + correct a ticket

Account `"PLATINUM"` = `01KZXBTAJXJXE3J1GYX7MFYYXB` (0 tickets at capture
— picked deliberately so the write is easy to spot and doesn't add noise
to a real client's queue). Correct calls:
- `create_help_ticket({"titleEn": "BLACKBOX-1", "description": "Mystery-shopper test ticket", "accountId": "01KZXBTAJXJXE3J1GYX7MFYYXB"})`
- `update_help_ticket({"id": "<that id>", "description": "Mystery-shopper test ticket, updated."})`

**Pass condition:** a ticket exists with `titleEn` "BLACKBOX-1",
`accountId` `01KZXBTAJXJXE3J1GYX7MFYYXB`, final `description` exactly
"Mystery-shopper test ticket, updated." Verify with
`list_help_tickets({"id": "<reported id>"})`.

## 9. Raise a to-do

`raise_todo({"accountId": "01KZXBTAJXJXE3J1GYX7MFYYXB", "title":
"BLACKBOX-2", "detail": "Mystery-shopper test to-do."})`.

**Pass condition:** a to-do exists with title "BLACKBOX-2", `accountId`
`01KZXBTAJXJXE3J1GYX7MFYYXB`, detail "Mystery-shopper test to-do." Verify
with `list_todos` or `query_records` module `todos` filtered on that
account.

## 10. Knowledge question — FINAL (amended 2026-09-16 per planner)

**Graded against the real team-database rows below, read directly
(`query_records`/`list_apps`, never `ask_knowledge`).** The tester runs
only after `knowledge_hygiene` reports the base has caught up, and as of
23:00 the `account` (134 live sources) and `app` (28 sources) knowledge
kinds are **already fully, currently indexed** — not partial, not a
moving target. That changes what counts as a pass: the material is
already in the base, so the answer seam finding nothing is a real miss,
not an expected outcome.

**Source-of-truth facts about "Confia"** (account id
`01KZXBT5T6CVY065QVW9M2S47G`), read straight from the team database:

- Account: name **"Confia"**, code **CONFIA**, type `entity`, contact
  email **m.hasler@confia.at**, active (no `deactivatedAt`).
- One app: `ref A0001`, name "CONFIA", url
  `www.confia-maklar.glide.page`, stage **Maintenance**, active.
- Tickets: **380 total, 30 not resolved** (task 5's own numbers — the
  busiest account on the team). Ticket ingest may or may not be fully
  caught up by test time — a ticket citation is a bonus, not required for
  a pass; the account/app facts above are what a pass is graded on.

**Grade the tester's actual `ask_knowledge({"q": "Confia"})` result as
one of four outcomes, not pass/fail alone:**

- **PASS** — `found: true`, the cited facts about Confia are correct
  against the rows above (the account row, code CONFIA, or the app
  "CONFIA"/A0001/Maintenance), and at least one citation is present.
- **FAIL** — `found: true` but a cited fact is wrong against the rows
  above (say which fact, and what it claimed instead) — Law R23's whole
  point is that a citation is only as good as the record behind it.
- **MISS** — `found: false`. The account and app material is already
  fully indexed, so this means the answer seam failed to find something
  that is actually there — a real miss, not an expected empty result.
- **INFRASTRUCTURE** (neither pass nor fail, recorded separately with
  the elapsed time in ms) — `door_timeout`, or any 5xx. Note in
  scoring.md if this happens: it says something about the surface's
  reliability under load, independent of whether the tester "got the
  task right."
