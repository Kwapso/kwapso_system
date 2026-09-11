# kb_CD handoff — 11 Sep 2026, before compact

Session has run 3,000+ turns without ever compacting. Owner wants to clear
that at a safe moment; this is that moment — nothing in flight, gate green,
pushed, hub has the report. Read this first if you're picking the lane back
up cold.

## Where things are right now

- **Branch:** `fix/kb-followup`, pushed to origin @ `1dda0325`. `npm run check`
  exit 0 (full suite, every workspace). Not yet merged — hub said "push when
  green, I merge."
- **`d-fanout`** (confirm `NAMED_ACCOUNTS_CAP` actually binds): done, verified
  by the hub independently against main, accepted. Commit `d1935c1e`.
- **`d-followup`** (follow-up questions carrying conversation context): done
  for the design the hub ruled on — `q` description + system-prompt line, no
  door parameter, R23 untouched. Commit `1dda0325`. Full writeup with the two
  read-only measurement scripts is `.session-notes/lanes/REPORT-kb-followup.md`
  — read that before touching this area again, it has the exact route from
  "a follow-up was typed" to "here's the q the model sent" (two tables, one
  JSON column, not where the hub first guessed).

## What's NOT done

- **The actual PROVE step for d-followup** is the owner trying a real
  follow-up with a pronoun on staging. That's his to do, not this lane's —
  the hub said as much.
- **The caveat that matters**: the free-evidence check found the model
  already resolving follow-ups correctly on ONE team's full history (51
  ask_knowledge calls, zero bare fragments). That is evidence the fix is
  low-risk, not evidence the failure mode never happens elsewhere. Don't let
  it get rounded up in a later report.
- **The general multi-hop fan-out case** (a question naming no entity but
  needing more than one compartment) — explicitly deferred by the hub until
  the refusal log (`knowledge_refusals`, migration 0079) has real measured
  question frequency to design against. Not a TODO for this lane right now,
  just don't reopen it without that data.
- Nothing else queued. No open hub message waiting on a reply from me as of
  this write.

## Things that bit me this session, worth knowing before you repeat them

- **`agent_usage_log.summary` is not the tool's argument.** For a read-only
  turn it's `usageSummary(opts.message)` — the raw user prompt
  (`workers/data-ops/src/lib/agent.ts:264-267`) — because a read never
  populates `tally.actions` (`agent.ts:1120-1124`). What a tool actually
  received lives in the per-TEAM `agent_messages.tool_calls_json`
  (`workers/data-ops/src/lib/threads.ts`), written for every call, read or
  write. Two different tables answer two different questions ("what did the
  person type" vs "what did the model send") and it's easy to reach for the
  wrong one.
- **`ask_knowledge`'s `summary` field is the one line sent on EVERY manifest**
  (`tool-diet.test.ts` holds a 160-char ceiling) — `detail` is fetched only
  on request via `describe_tool` and is NOT guaranteed to reach the model
  before a first call. If you need the model to reliably see something before
  it decides what to call, it has to fit in `summary`, under the cap. It was
  already at 157/160 before this change; fitting a new instruction meant
  trimming, and it's tight — check the cap before you add anything else here.
- **Migration numbers need fetch-then-claim.** Collided with a concurrent
  non-lane session's `0077`/`0078` earlier this session; renumbered to
  `0079` by hand. `workers/tenancy/src/team-schema/migrations.ts` is
  append-only — never renumber a merged entry, only your own unmerged one.
- **`npm run check`, read by exit code, never by piping through `tail`/`grep`
  and checking `$?`** — that captures the pipe's last command, not the check.

## Standing hard rules for this lane (unchanged, restate on resume)

No agent spawning, ever. Zero model spend without the hub's explicit written
clearance (cap is $5, this session is at $0). `cf-exec` on every Cloudflare
command, reads only, no deploys. Every folder lives inside
`Kwapso_cpaa` on the Desktop. `git add` after the last edit, or commit
`-a` — never leave an edit unstaged going into a commit.

READY TO COMPACT.
