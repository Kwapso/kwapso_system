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

---

# Tasks 11-20: the fence — answer key

Every write/read attempt below was run live against the sandbox token
itself on 2026-09-18, before handing this off, so these are not
predictions — they're the actual door responses. Cross-reference
`expected-rights.md` for the full per-module table this section only
summarizes.

**Grading rule for 13-20**, per the planner: **PASS** = allowed and it
worked, **PASS** = refused with a clear reason naming the missing right,
**FAIL** = allowed when it should have been refused, **FAIL** = refused
when it should have been allowed, **FAIL** = any 5xx (a crash is never a
correct refusal, however true the underlying denial is).

## 11. Own rights

The tool is `my_permissions`. Expected shape: 21 of 23 modules `read:
true` — everything except `teams` (never a real read right — see
expected-rights.md) and `agent` (deliberately denied). **PASS** if the
tester's report matches `expected-rights.md`'s table; **FAIL** on any
module that disagrees.

## 12. Two plain reads

`list_accounts` → **total 134**. `list_meetings` → **total 576**. (Both
counts can drift by a handful on this live team — re-run yourself if the
tester's numbers are close but not exact; a wildly different number, or
an error on either call, is a **FAIL**.)

## 13. Create an account

Confirmed refused:
> `{"error":"forbidden","message":"You don't have permission to do that, your role is missing the \"create\" right on accounts."}`

**PASS** on a matching refusal (`forbidden`, names `accounts`/`create`).
**Note**: `create_account` doesn't even appear on this role's `tools/list`
— the manifest trims a write tool the role can't use — so a tester who
calls it by name anyway is testing the door's OWN gate, not just the
catalogue. Either the tester notices it's missing and calls it by name
regardless (best), or doesn't notice it's missing at all, tries something
else, and never proves the door-level gate — that's worth noting in
scoring but isn't itself a FAIL, since the task only asks for the
attempt's outcome.

## 14. Edit "Confia"

Confirmed refused:
> `{"error":"forbidden","message":"You don't have permission to do that, your role is missing the \"update\" right on accounts."}`

Same PASS/FAIL rule and the same catalogue note as task 13
(`update_account` is also absent from `tools/list`).

## 15. Admin-only door (two calls)

Both confirmed refused:
- `create_role` →
  `{"error":"forbidden","message":"You don't have permission to do that, your role is missing the \"create\" right on member roles."}`
- `set_role_permissions` →
  `{"error":"forbidden","message":"You don't have permission to do that, your role is missing the \"update\" right on member roles."}`

**PASS** requires BOTH refused correctly; one allowed (or one skipped
without being reported as attempted) is a **FAIL**. Both tools are
absent from `tools/list`, same note as 13/14.

## 16. Remove a member

Confirmed refused:
> `{"error":"forbidden","message":"You don't have permission to do that, your role is missing the \"delete\" right on team members."}`

**PASS** on a matching refusal. Worth noting if the tester's refusal
instead mentions "can't remove yourself" or "last admin" — those are
real guards too, but they're a DIFFERENT reason than the missing right,
and would suggest they targeted their own sandbox account or the sole
admin rather than a real other member; still a pass on "was it refused"
but flag it as an imprecise probe.

## 17. Delete/cancel a to-do

The RAISE half is expected to succeed (`inputs:create` is granted) —
confirm a new to-do exists first. The cancel confirmed refused:
> `{"error":"forbidden","message":"You don't have permission to do that, your role is missing the \"delete\" right on inputs."}`

**PASS** requires the raise to have worked AND the cancel to have been
refused with this reason — this is the one task on the sheet testing
that create+update on a module doesn't imply delete. A cancel that
silently "worked" (no error, to-do actually gone) would be a serious
**FAIL** — `cancel_todo` isn't even on this role's `tools/list`, so that
would mean the door itself failed to re-check, not just the catalogue.

## 18. Add a knowledge source

Confirmed refused:
> `{"error":"forbidden","message":"You don't have permission to do that, your role is missing the \"create\" right on knowledge."}`

**PASS** on a matching refusal. Not on `tools/list`.

## 19. Add a meeting purpose

Confirmed refused:
> `{"error":"forbidden","message":"You don't have permission to do that, your role is missing the \"create\" right on delivery."}`

**PASS** on a matching refusal. Not on `tools/list`.

## 20. Cross-module reach: ticket → agent thread

Both `list_agent_threads` and `get_agent_thread` confirmed refused, e.g.:
> `{"error":"forbidden","message":"You don't have permission to do that, your role is missing the \"read\" right on agent."}`

**Note on this task's framing**: this role's read grants span every
module except `agent` (see expected-rights.md's summary) — there is no
account this role's `accounts:read` right actually hides, so the
literal "an account it cannot see" isn't expressible under this role's
design. The closest real cross-module fence is reaching from a
freely-readable ticket (`help:read` granted) into its related **agent**
material (`agent:read` denied) — a genuine module boundary the ticket's
own readability doesn't cross. Unlike tasks 13-19, `list_agent_threads`
and `get_agent_thread` DO appear on `tools/list` (a denied READ is never
hidden — MCP.md: "a read carries no single permission to check it
against"), so this task also tests something 13-19 don't: a tool the
tester CAN see and call, refused only once it actually runs.

**PASS** on either tool being called and refused with `agent`/`read`
named. **FAIL** if either call returns real thread data.

