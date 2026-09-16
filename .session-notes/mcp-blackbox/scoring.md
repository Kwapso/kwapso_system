# MCP blackbox — scoring sheet

Run `node scripts/mcp-blackbox/score.mjs <transcript.jsonl>` on the tester's
exported transcript first — it fills every column below except **correct?**,
which needs `answer-key.md` and a human. Paste its per-call table in, then
match rows to the ten tasks by reading them in order (the tester works one
task at a time, so the calls cluster in task order even though the
transcript carries no explicit boundary).

## Per-task

| # | task | calls made | describe_tool calls | errors | wrong turns | reply bytes (sum) | wall-clock (s) | correct? |
|---|---|---|---|---|---|---|---|---|
| 1 | workspace name | | | | | | | |
| 2 | account count | | | | | | | |
| 3 | app count | | | | | | | |
| 4 | apps in stage Maintenance | | | | | | | |
| 5 | Confia's tickets (total + not resolved) | | | | | | | |
| 6 | sprint → app chain | | | | | | | |
| 7 | ticket → account chain | | | | | | | |
| 8 | raise + correct a ticket | | | | | | | |
| 9 | raise a to-do | | | | | | | |
| 10 | knowledge question | | | | | | | |

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

- Total MCP calls:
- Total `describe_tool` calls:
- Total errors:
- Total bytes returned (sum of every tool reply):
- Largest single reply (bytes, and which tool):
- Any reply over 20,000 characters? (Y/N, which one):
- Wall-clock, first call to last:
- Tasks correct: `___ / 10`

## Reading the result

This measures the MCP surface's usability to a cold caller with no repo
context, not the tester's skill: a lot of `describe_tool` calls before a
write is the surface working as intended (MCP.md's own advice is "ask for
it before a call you are unsure of"); a lot of wrong turns on the same task
points at a description or a filter name that doesn't say what it does; a
reply near or over 20,000 characters on a task that should have been a
single narrow read is the surface handing back more than the question
asked for.
