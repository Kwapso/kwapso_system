# MCP blackbox — scoring sheet

Run `node scripts/mcp-blackbox/score.mjs <transcript.jsonl>` on the tester's
exported transcript first — it fills every column below except **correct?**,
which needs `answer-key.md` and a human. Paste its per-call table in, then
match rows to the ten tasks by reading them in order (the tester works one
task at a time, so the calls cluster in task order even though the
transcript carries no explicit boundary).

**SCORED 2026-09-17**, tester session `mcp_blackbox_tester`
(`local_484dbc5e-ef19-40c3-bbf0-21f5e59ea32d`), transcript exported via
`export_transcript` and run through `score.mjs`. **Reply-byte column is
CORRECTED, not the scorer's raw output** — see "Scorer gap" below;
`score.mjs`'s own auto-scored table undercounts three calls by 40–60x
because the harness truncates any oversized tool reply into a short
pointer message before it ever reaches the transcript `score.mjs` reads.
Corrected sizes came from the pointer message's own stated character
count (e.g. "result (71,419 characters across 1 line)") cross-checked
against the harness's saved `tool-results/*.txt` files, which are the
verbatim replies.

**Also corrected: which token actually ran this.** `mcp_call_log` (core
DB, staging) shows all 16 calls landing under token `01M284X2D7SG3GF30A80YNEXFX`
("kwapso_02", owned by `alaap@kwapso.com`, full Admin rights on Kwapso) —
**not** the narrow "Machine tester" sandbox token
`01M2N1JV4Y23M64E6W7SRG6662` that `setup.mjs` minted and `cleanup.md`
names. See findings.md's lead finding for why, and what this means for
reading "0 errors" below.

## Per-task

| # | task | calls made | describe_tool calls | errors | wrong turns | reply bytes (sum, corrected) | wall-clock (s) | correct? |
|---|---|---|---|---|---|---|---|---|
| 1 | workspace name | 2 | 0 | 0 | 0 | 644 | 2.8 | ✅ "Kwapso" |
| 2 | account count | 1 | 0 | 0 | 0 | 41,956 | 5.9 | ✅ 134 |
| 3 | app count | 1 | 0 | 0 | 0 | 17,154 | 6.3 | ✅ 28 |
| 4 | apps in stage Maintenance | 0 (reused task 3's reply) | 0 | 0 | 0 | 0 | 0 | ✅ 11 (hand-counted across the 28 rows already in hand; re-verified live, still 11) |
| 5 | Confia's tickets (total + not resolved) | 2 | 0 | 0 | 0 | **76,543** (4,699 + 71,844 true) | 27.3 | ✅ 380 total / 30 not resolved |
| 6 | sprint → app chain | 2 | 1 | 0 | 0 | 5,466 | 29.5 | ✅ A0028 "ERP Kennogroup", Not started |
| 7 | ticket → account chain | 2 | 0 | 0 | 0 | 1,240 | 15.2 | ✅ Amstella |
| 8 | raise + correct a ticket | 4 | 0 | 0 | 0 | **131,728** (983 + 65,167 true + 65,178 true + 400) | 37.0 | ✅ verified independently (id `01M2NY75A14629CX7MCQQE6H0W`, final description exact) |
| 9 | raise a to-do | 1 | 0 | 0 | 0 | 648 | 6.7 | ✅ verified independently (id `01M2NY7Z291WCDHZD39NJZSR24`) |
| 10 | knowledge question | 1 | 0 | 0 | 0 | 1,690 | 11.9 | ❌ FAIL — see below |

**No task took more than 5 calls** — the run was call-efficient (16 calls
total, 4 the most on any one task, task 8). The waste is entirely in
per-call BYTES on two tasks, not call count: task 8's two write calls
(create/update) cost 130,345 bytes between them to report back one
ticket's id and description, and task 5's `list_help_tickets` cost 71,844
bytes to answer a question fully answerable from its own `byStatus`
aggregate (which was already in the same reply, uncounted bytes and all).

**Task 10 grading** (four-outcome scheme, amended answer-key.md): `found:
true`, `answer: null`, one citation — a ticket ("Filtern nach Beginn
eines Vertrages", T3507, score 0.002, the router's own relevance floor)
— nothing about Confia the account or CONFIA the app. The route's
record-level pass (a separate, coarser search — `records` in the raw
reply) correctly names the CONFIA app as the relevant record, but the
passage-level search that actually produces citations pulled nothing
from either the account or app source, despite the answer-key stating
both are fully, currently indexed. Graded **FAIL**, not PASS: the key is
explicit that "the account/app facts... are what a pass is graded on"
and a ticket citation is "a bonus, not required for a pass" — here the
bonus is all there is. Nothing cited is factually wrong (which is why
this isn't as clear-cut as it reads — there's no false statement, just
an answer that never reached the material the question was actually
about), so FAIL over MISS (found was true, not false).

**Context (corrected 2026-09-17 — an earlier note here claiming a
call-free "rerun" was retracted; the planner's original UTC window was
off by the local IST/UTC offset, and the 16 calls scored above are the
one and only run):** this FAIL was measured at the run's one real call,
20:24:13 UTC 16 Sep — nine minutes after D1's own ticket ingest finished
(20:15 UTC), but 35 minutes before the vector index's own rebuild
cleared roughly 35% dead ids at `topK=20` (finished 20:59 UTC). A
same-day spot check after that rebuild, same question through the same
seam, came back identical (still no account/app source found or cited)
— so the dead-id timing is likely not the explanation. Full detail in
findings.md.

## Scorer gap (read before trusting `score.mjs` output on any future run)

The transcript's own `tool_result.content` is NOT the tool's real reply
once the harness truncates it — it's a fixed ~1,650-byte pointer
("Error: result (N characters...) exceeds maximum allowed tokens...
saved to <file>"). `score.mjs` counts THAT string's bytes, not the
original reply's. This run: `list_accounts` (uncapped, 41,956 bytes,
correctly counted) looked like the largest reply and the only one over
20,000 characters in the auto-scored output; the true answer is `list_help_tickets`
at 71,844 bytes, and there are FOUR oversized replies, not one
(`list_accounts` 41,956; `list_help_tickets` 71,844; `create_help_ticket`
65,167; `update_help_ticket` 65,178). See findings.md's scorer-fix entry.

**wrong turns** — a call that couldn't possibly answer the task: the wrong
tool, a filter that doesn't exist, a write attempted before the read that
should have preceded it, a retry of an identical failed call with no change.
Not a wrong turn: a `describe_tool` call, a first attempt refused for a
missing/wrong argument that gets corrected next call, or a legitimate retry
after `door_timeout` (`ask_knowledge` against this team's real corpus
genuinely timed out twice in a row at answer-key capture time — a
timeout-then-retry on task 10 is expected, not a mistake; see
answer-key.md task 10). Task 5's `list_help_tickets` reply for Confia is
71,835 bytes on its own at capture — reaching for it first isn't a wrong
turn (it does answer the "total" half correctly), but a tester who never
follows up with a narrower `query_records` call for the "not resolved"
half is paying the full page's bytes for nothing.

**correct?** — compare the tester's stated answer for the task to
`answer-key.md`. For tasks 8/9 (writes), "correct" means the row actually
exists in the state the answer key's pass condition describes — verify it
yourself with the same token (`security find-generic-password -s
mcp-blackbox-token-kwapso -w`) before marking it, don't just trust what the
tester reports.

## Per run

- Total MCP calls: **16**
- Total `describe_tool` calls: **1** (before task 6's first `query_records` — appropriate use, not waste)
- Total errors: **0** (confirmed against `mcp_call_log`: all 16 rows `ok=1`)
- Total bytes returned (sum of every tool reply, corrected): **277,069** (score.mjs's own uncorrected total was 79,834 — a 3.5x undercount)
- Largest single reply: **71,844 bytes** (`list_help_tickets`, task 5) — score.mjs's own uncorrected answer was `list_accounts` at 41,956
- Any reply over 20,000 characters? **YES — four**: `list_accounts` (41,956), `list_help_tickets` (71,844), `create_help_ticket` (65,167), `update_help_ticket` (65,178)
- Wall-clock, first call to last: **142.5s**
- Tasks correct: **9 / 10** (task 10 is FAIL, not INFRASTRUCTURE, so it counts in the denominator)
- Task 10 outcome: **FAIL** — `found: true`, one citation (an unrelated ticket, relevance score 0.002), no account/app fact cited; see per-task table above.

## Baseline finding — ask_knowledge on the real corpus (not the tester's fault)

Captured 2026-09-16, ~12:06–12:07 UTC (staging), by this setup — before any
tester touched the sandbox:

- `ask_knowledge({"q": "What is Confia, and what work has been done for them?"})` → `door_timeout` (no answer within 30s).
- `ask_knowledge({"q": "Confia"})`, retried immediately after → `door_timeout` again.

At the same time, `get_knowledge_status` showed the `ticket` ingest kind at
76→81 of 2,065 sourced (climbing slowly, `lastRunAt` `2026-09-16T12:05:19Z`)
— `knowledge_hygiene`'s rebuild was actively running against this team's
real, much larger Vectorize index. **If the tester's task 10 also times
out, that is this same baseline reproducing, not a new tester-caused
failure** — score it as a finding about the surface, not against them.
**Task 10 is FINAL in answer-key.md, amended 2026-09-16.** The tester runs
only after `knowledge_hygiene` reports the base caught up, and by then the
`account` (134 sources) and `app` (28 sources) knowledge kinds are fully,
currently indexed — not a moving target — so this is graded as one of
**four** outcomes, not plain pass/fail. In the per-task table's "correct?"
cell for row 10, write one of:

- **PASS** — `found: true`, cited facts about Confia check out against
  answer-key.md's account/app rows, at least one citation present.
- **FAIL** — `found: true` but a cited fact is wrong (say which, in the
  cell or a footnote).
- **MISS** — `found: false`. The material is already indexed, so this is
  a real miss now, not the expected-empty baseline it was earlier today.
- **INFRASTRUCTURE** — `door_timeout` or any 5xx. Record separately in
  "Per run" below (not counted toward `Tasks correct: ___/10` either
  way) with the elapsed ms — this is the same class of finding as the
  baseline timeouts above, just after the rebuild, so it's worth knowing
  whether it still happens once the base is caught up.

## Reading the result

This measures the MCP surface's usability to a cold caller with no repo
context, not the tester's skill: a lot of `describe_tool` calls before a
write is the surface working as intended (MCP.md's own advice is "ask for
it before a call you are unsure of"); a lot of wrong turns on the same task
points at a description or a filter name that doesn't say what it does; a
reply near or over 20,000 characters on a task that should have been a
single narrow read is the surface handing back more than the question
asked for.
