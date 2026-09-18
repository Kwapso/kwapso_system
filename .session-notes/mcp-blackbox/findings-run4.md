# MCP blackbox — run 4 (narrow role), scoring and findings

Session `mcp_blackbox_tester_4`, curl direct against `/mcp` under the
Keychain token `mcp-blackbox-token-kwapso` — no Claude connector, no
transcript. Answers at `~/Desktop/kwapso-mcp-blackbox/answers.md` (mtime
2026-09-18T13:19:03+0530, matches the planner's stated write time
exactly). Graded against `answer-key.md` + `expected-rights.md` on
`feat/mcp-blackbox` (`f2a74abf`).

## Token, confirmed from the row — not assumed

`01M2S9B44A9Y1VRFRX74YMVBJ5`, label "MCP blackbox sandbox", owned by the
dedicated machine-tester account (`01M2N0N8GFQ042H68AQFWAVR88`) — the
real narrow "Machine tester" role this time, not a standing personal
token (see run 1's `findings.md` for that earlier failure mode).
`last_used_at` 2026-09-18T07:48:10Z, `revoked_at` 07:52:03Z.

`mcp_call_log` under this token holds 48 rows in two clearly separated
batches:
- **Rows 1–12, 03:35:50–03:37:57 UTC**: `answer-key.md`'s own disclosed
  capture pass ("every write/read attempt below was run live against the
  sandbox token itself on 2026-09-18, before handing this off") —
  excluded from the tester's grade by construction, not by eyeballing.
- **Rows 13–48, 07:42:32–07:48:11 UTC**: the tester's real run — falls
  inside 07:42–07:49 UTC (13:12–13:19 IST, this Mac's own offset,
  `date +%z` → `+0530`), converted directly rather than through
  `datetime("now",…)`, which silently drops ISO rows per the planner's
  note. **36 calls, 10 refused (`ok=0`), 26 succeeded.**

## Score: 19/20

| # | task | outcome |
|---|---|---|
| 1 | workspace name | PASS — "Kwapso" |
| 2 | account count | PASS — 134 |
| 3 | app count | PASS — 28 |
| 4 | apps in stage Maintenance | **FAIL — see below, not the tester's fault** |
| 5 | Confia's tickets | PASS — 380 / 30, via `query_records countOnly` (avoided the fat reply entirely) |
| 6 | sprint → app chain | PASS — A0028 "ERP Kennogroup", Not started |
| 7 | ticket → account chain | PASS — Amstella |
| 8 | raise + correct a ticket | PASS — verified independently (`T3835`, description exact) |
| 9 | raise a to-do | PASS — verified independently (`I0003`) |
| 10 | knowledge question | PASS — `found:true`, 2 citations (app + account), both facts correct against source-of-truth |
| 11 | own rights | PASS — matches `expected-rights.md` module for module |
| 12 | two plain reads | PASS — 134 accounts (exact), 581 meetings (verified live, exact) |
| 13 | create an account | PASS — refused, exact message; called by name despite being off `tools/list` (the "best" outcome the key names) |
| 14 | edit Confia | PASS — refused, exact message |
| 15 | admin-only door (×2) | PASS — both refused, exact messages |
| 16 | remove a member | PASS — refused, exact message (tried own membership — an imprecise probe per the key's own note, but the rights check fired before any self-removal guard could, so the message is the intended one regardless) |
| 17 | delete a to-do | PASS — raise worked, cancel refused; **verified at the data level**: the to-do's `cancelledAt` is `null`, so the refusal actually held, not just the response text |
| 18 | add a knowledge source | PASS — refused, exact message |
| 19 | add a meeting purpose | PASS — refused, exact message; correctly notes it names `delivery`, not `meetings` |
| 20 | cross-module reach | PASS — `list_agent_threads` refused naming `agent`/`read` |

**Wrong-allows: zero.** Every one of the 9 fence refusal points (tasks
13–20) came back refused, with the right reason named, and — where I
could check independently — actually held at the data layer (task 17).
**Wrong-refusals on 11/12: zero**, both allowed as expected. The
permission fence itself is clean this run, including on six tools
(`create_account`, `update_account`, `create_role`, `set_role_permissions`,
`remove_member`, `cancel_todo`, `add_knowledge_source`,
`create_meeting_purpose`) that are trimmed off this role's own
`tools/list` — the door re-checked rights anyway, which is the
defense-in-depth the catalogue trim is supposed to be backed by, and it
held.

## Task 4's FAIL is a real product bug, not a tester mistake

The tester tried `query_records` `{"module":"apps","where":[{"field":"stage","op":"eq","value":"Maintenance"}],"countOnly":true}` — refused:

> `"Maintenance" isn't a stage. It is one of: Not started, Audit, Plan, Build, Validation, Refinements, Enhancement, Archived.`

Checked live, this session, read-only:

- `query_records({"module":"apps","groupBy":["stage"]})` — **"Maintenance" is a real, live value, 11 rows** (plus "Completed", 7 rows) — reproduces the answer key's own 11.
- `describe_module({"module":"apps"})` — reports the field `stage` as `enum` with values `["Not started","Audit","Plan","Build","Validation","Refinements","Enhancement","Archived"]` — the exact same wrong list, missing "Maintenance" and "Completed" entirely.
- Re-ran the tester's own `where` call verbatim — reproduced the identical refusal.

So the `where` clause's validator for `apps.stage` reads a **stale enum**
that disagrees with the module's own `groupBy` and the real column data —
and `describe_module`, the tool `tasks.md`/`tester-prompt.md` explicitly
tell a caller to consult first, reports that same wrong enum. A tester
who did exactly what they were told (check the description, trust what
it says) was actively misled into reporting "this value doesn't exist"
about a value that is live on 18 of 28 rows (64%). This traces to the
"Vocabulary settled 16 Sep 2026" change in CLAUDE.md — sprint type's new
enum (`Not started · Audit · Plan · Build · Validation · Refinements ·
Enhancement`) appears to have been wired into the `apps.stage` validator
while the underlying data was never migrated off the old Glide-imported
values (`Maintenance`, `Completed`) — consistent with CLAUDE.md's own
note that "the model is pending the client's pick, so app stage pills
stay coloured meanwhile."

**Not traced to a file/line this pass** (which file owns the `apps.stage`
enum both `describe_module` and the `where` validator read from) — that's
the next step, not done here since the instruction was read-only,
grade-only. This is the single highest-value finding of this run: a
correctness bug reachable by any caller who follows the tool's own
documented advice, not a verbosity/usability complaint like the ones
below.

## Reply sizes — same two recurring shapes, one call avoided

No transcript exists for this run (raw curl, no Claude harness), so
sizes below are re-measured live this session against the identical
calls the tester made, rather than read off a transcript.

**Over 20,000 characters, this run:**

1. **`list_meetings({"view":"all"})`, task 12 — 71,699 bytes.** Reproduced
   live: `total: 581` (the only thing task 12 asked for) sits inside a
   50-row `meetings` array nobody asked for. Same shape as run 1's
   `list_help_tickets` finding — a list door with no rows-free/aggregate-only
   mode, so a plain "how many" question pays for the full page.
2. **`list_accounts()`, task 12 — ~42,000 bytes** (reproduced live,
   consistent with run 1's exact 41,956-byte measurement of the identical
   unfiltered call). Same shape.
3. **`create_help_ticket`, task 8 — not re-measured this run** (a write
   call; re-triggering it would only create more BLACKBOX test data for
   no new evidence). Per run 1's `findings.md` #1, same unfixed code path
   (`workers/content/src/routes/help.ts`'s `ticketPage`), expect ~65KB.
4. **`update_help_ticket`, task 8 — same, not re-measured, expect ~65KB.**

**What improved since run 1**: task 5 (Confia's tickets) went straight to
`query_records` with `countOnly` and never touched `list_help_tickets` at
all — the single biggest waste in run 1 (71,844 bytes for a two-number
answer) didn't recur here. The tester's own method got better; the two
write doors and `list_meetings` didn't change, because nothing in this
repo was fixed between runs (per instruction, this session doesn't fix
either).

**Ranking, by what wasted the most, unchanged from run 1's list**: the two
write-door replies (#1 in `findings.md`, ~130KB for one ticket's id
across create+update) remain the single largest cost; `list_meetings`
joins `list_help_tickets` as the second recurring shape (a list door
with no aggregate-only mode). Task 4's enum bug is not a byte-waste
finding — it's a correctness finding, and the most valuable one here.

## Wrong-allows, refusals, and biggest replies — summary line for the planner

- **Score: 19/20.** One FAIL (task 4), zero wrong-allows, zero
  wrong-refusals.
- **Wrong-allows: none.**
- **Biggest replies**: `list_meetings` 71,699 bytes (task 12, confirmed
  live); `list_accounts` ~42,000 bytes (task 12, confirmed live);
  `create_help_ticket`/`update_help_ticket` ~65KB each (task 8, not
  re-measured — same known-unfixed code as run 1).
- **New finding, not in run 1**: `apps.stage`'s enum (read by both
  `describe_module` and `query_records`'s `where` validator) is stale
  against the real column data — "Maintenance" and "Completed" are live
  on 64% of apps and both tools deny they exist.

## Cleanup

Done independently, commit `0a2864bc` (`docs(mcp-blackbox): run 4
complete`): token `01M2S9B44A9Y1VRFRX74YMVBJ5` revoked at
`2026-09-18T07:52:04Z` — the identical second `mcp_tokens.revoked_at`
reports, cross-confirming the same event rather than two separate
revokes. Nothing left for this session to do there; scoring only.
