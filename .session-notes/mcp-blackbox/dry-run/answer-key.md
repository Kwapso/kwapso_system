# MCP blackbox — answer key

**The tester never sees this file.** Captured 2026-09-16 against staging
(`https://agency-staging.kwapso.app`), team **Smoke team**
(`01M1XA0KFQG1TBKGYWTC2XF3QG`), using the sandbox token itself (same role
and rights the tester gets), so every answer is exactly what the tester's
own tools would show.

**Drift warning.** This team is also the scratch team `smoke-mcp.mjs` /
`smoke-staging.mjs` write to on every staging deploy. If a deploy runs
between now and the test, tasks 2/4/5 (counts) could move. Re-run the
matching tool call yourself before grading if the numbers look off —
that's a scoring judgment call, not necessarily a wrong answer from the
tester. Tasks 3/6/7/10 key off fixed smoke fixtures (`T0001`, `I0002`,
the two named accounts) that no smoke suite deletes or renames, so they
should hold. Tasks 8/9 create new BLACKBOX rows and are self-verifying by
construction.

## 1. Team name

**"Smoke team"** — `get_team`, field `name`.

## 2. Account count

**3** — `list_accounts`, field `total`. (As of capture: `PORTAL SMOKE ·
contact`, `PORTAL SMOKE · another company`, `PORTAL SMOKE · their
company`.)

## 3. Ticket ref by description

Description `"PORTAL SMOKE · a request from the other company"` →
ticket id `01M1XVSTF6A2ZA16XSWTPB30MK`, **`ref: "T0001"`**.
Found via `list_help_tickets` (no filter, 3 rows total — small enough to
scan) or `query_records` on module `tickets` with a `q`/description
filter.

## 4. Tickets with helpType "question"

**1** — `query_records` `{"module":"tickets","groupBy":["helpType"]}` →
group `{"helpType":"question"}` count 1. (Full breakdown at capture time:
`question` 1, `Feedback` 1, `null` 1 — total 3.)

## 5. Tasks important AND urgent

**2** — `query_records`
`{"module":"tasks","where":[{"field":"important","op":"eq","value":true},{"field":"urgent","op":"eq","value":true}],"countOnly":true}`
→ `total: 2`. (Titles at capture: "Send Bergman the revised deck" and
"Send Bergman the revised deck (mine)".)

## 6. Account → to-do chain

Account **"PORTAL SMOKE · another company"** = `01M1XA1G3016KP63BVA0H7ZEG8`
(from `list_accounts`). Its to-do: id `01M1XVT42NP2N33SEJTREAJDJT`,
**`ref: "I0002"`**, title "PORTAL SMOKE · something we need from the
other company". Found via `list_todos` (only 1 open row) or
`query_records` module `todos` filtered `accountId eq
01M1XA1G3016KP63BVA0H7ZEG8`.

## 7. Ticket → thread chain

Ticket `ref T0001` = id `01M1XVSTF6A2ZA16XSWTPB30MK` (same ticket as
task 3). `get_help_thread({"id": "01M1XVSTF6A2ZA16XSWTPB30MK"})` →
**1 reply**, body:

> PORTAL SMOKE · a reply no other company may read

by "Smoke Test".

## 8. Raise + correct a ticket

Account `"PORTAL SMOKE · their company"` = `01M1XA1E2CGSRDNESW43BETY39`.
Correct calls:
- `create_help_ticket({"titleEn": "BLACKBOX-1", "description": "Mystery-shopper test ticket", "accountId": "01M1XA1E2CGSRDNESW43BETY39"})`
  → a new ticket id, `status: "new"`.
- `update_help_ticket({"id": "<that id>", "description": "Mystery-shopper test ticket, updated."})`.

**Pass condition:** a ticket exists with `titleEn` "BLACKBOX-1",
`accountId` `01M1XA1E2CGSRDNESW43BETY39`, and final `description`
exactly "Mystery-shopper test ticket, updated." Verify with
`list_help_tickets({"id": "<reported id>"})`.

## 9. Raise a to-do

`raise_todo({"accountId": "01M1XA1E2CGSRDNESW43BETY39", "title":
"BLACKBOX-2", "detail": "Mystery-shopper test to-do."})`.

**Pass condition:** a to-do exists with title "BLACKBOX-2", `accountId`
`01M1XA1E2CGSRDNESW43BETY39`, detail "Mystery-shopper test to-do."
Verify with `list_todos` or `query_records` module `todos` filtered on
that account.

## 10. Knowledge question

`ask_knowledge({"q": "another company"})` → `found: true`, citing the
ticket `ref T0001` ("PORTAL SMOKE · a request from the other company",
`recordPath: tickets/01M1XVSTF6A2ZA16XSWTPB30MK`). The `message` field
says (word for word, at capture): "1 source in the knowledge base answer
this. I checked the live record just now. Say what it says today, not
what the passage says." — a correct answer names that instruction (Law
R23: passages + citations, never invented prose). Took ~30s at capture
time (near the door's own timeout) — a tester's first call timing out
with `door_timeout` once and succeeding on retry is expected, not a
tool failure.
