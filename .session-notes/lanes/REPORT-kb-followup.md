# d-followup — measurement + fix, kb_CD, 2026-09-11

Branch `fix/kb-followup`, off main `d308ddfb`. Two tracker items: `d-followup`
(follow-up questions carrying conversation context) and `d-fanout` (confirm
`NAMED_ACCOUNTS_CAP` actually binds). This report covers both, in the order
they happened, so the next person doesn't have to re-derive the two-table
route to "what `q` did the model actually send" from scratch.

## d-fanout — real bug, fixed

`accountsNamedIn` (workers/content/src/lib/knowledge.ts) capped its SQL at a
bare `LIMIT 10`, which predated `NAMED_ACCOUNTS_CAP = 12`. The cap could never
bind at its own number — a question naming 12+ equally-matching accounts
always topped out at 10. Caught with a test written `toBe(12)`, deliberately
not `toBeLessThanOrEqual(12)` (the looser form would have passed against the
broken value too): 13 real accounts seeded, named in one question, asserted
exactly 12 compartments. Went red at "named 10 of 13", fixed by raising the
SQL limit to `NAMED_ACCOUNTS_CAP * 2` (not every candidate row survives
confirmation, so the fetch window is wider than the final cap). Committed as
`d1935c1e`.

## d-followup — Step 1: measure before building

Three questions, answered with file:line citations, sent to the hub:

- (a) The `ask` door (`workers/content/src/routes/knowledge.ts:297-330`) and
  `knowledgeAnswer`'s input type (`workers/content/src/lib/knowledge.ts:2559-2579`)
  carry no prior-turn parameter. `q`, `limit`, `compose`, `read`, `sources`,
  `accountId` — nothing conversational.
- (b) Conversation history lives entirely in `workers/data-ops/src/lib/agent.ts`
  (`MAX_HISTORY = 24`, `replayable()`, `listMessages`). The knowledge door is
  stateless.
- (c) Hypothesis: this is a prompting problem, not a missing mechanism — the
  model already has full recent history when it decides what to call.

**Hub's ruling: do NOT add a parameter.** A `previousAnswer`/`threadId` on the
knowledge door would make a stateless door stateful and duplicate context the
model already has — "a mechanism built to solve a prompting problem." The fix
is the surface the model actually reads: the `q` PARAMETER DESCRIPTION (R27 —
"a description's words are the one unchecked surface"), plus a matching
system-prompt line. Do not touch R23's seam.

## The free-evidence check (before any live spend)

The hub's first instruction was to check `agent_usage_log` for the tool's `q`
argument — reasoning that `ask_knowledge`'s `summarize()` renders as `Ask the
knowledge base: "…"` and that string should be sitting in the log already.

**That's not quite where it lives**, and it's worth writing down precisely,
because it crosses two tables and a JSON column:

- `agent_usage_log` (core DB, `workers/tenancy`) — `summary` for a
  `kind='prompt'` row is `usageSummary(opts.message)`
  (`workers/data-ops/src/lib/agent.ts:264-267`): the RAW USER-TYPED PROMPT.
  A read-only turn never populates `tally.actions`
  (`agent.ts:1120-1124` — "a READ isn't an action the user 'did'"), so
  `ask_knowledge`'s `summarize()` never reaches this table for a plain
  question. This table tells you WHAT THE PERSON TYPED.
- `agent_messages` (per-TEAM DB, `workers/data-ops/src/lib/threads.ts`) —
  `tool_calls_json` on the `role='tool'` row carries
  `{tool, summary, status}` for EVERY tool call, read or write
  (`agent.ts:1131-1142`), and `summary` there IS `t.summarize(tc.input)` =
  `Ask the knowledge base: "<q, first 60 chars>"`. This table tells you WHAT
  THE MODEL ACTUALLY SENT.

Both are free reads (no model call). Scripts below (not committed —
`scripts/` is shipped code and these are one-off diagnostics; pasted here
per the hub's instruction instead).

### Script 1 — core `agent_usage_log`, same-actor prompt pairs within 5 minutes

```js
#!/usr/bin/env node
// READ-ONLY, staging core DB only.
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { cloudflareCredentials } from "<REPO>/scripts/lib/cf-credentials.mjs"

const REPO = "<REPO>"
function coreDatabaseId() {
  const src = readFileSync(join(REPO, "workers", "tenancy", "wrangler.jsonc"), "utf8")
  const ids = [...src.matchAll(/"CORE_DATABASE_ID":\s*"([^"]+)"/g)].map((m) => m[1])
  return ids[1] // staging is the second pin, production the first
}
const { account: ACCOUNT, token: TOKEN } = cloudflareCredentials(REPO)
const CORE = coreDatabaseId()
const CF = "https://api.cloudflare.com/client/v4"
async function sql(dbId, statement, params = []) {
  const res = await fetch(`${CF}/accounts/${ACCOUNT}/d1/database/${dbId}/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ sql: statement, params }),
    signal: AbortSignal.timeout(60_000),
  })
  const json = await res.json()
  if (!json.success) throw new Error(JSON.stringify(json.errors))
  return json.result[0].results
}

const bursts = await sql(
  CORE,
  `SELECT team_id, actor_id, actor_name, created_at, summary
     FROM agent_usage_log WHERE kind = 'prompt' ORDER BY team_id, actor_id, created_at`
)
let prevKey = null, prevTime = null, prevSummary = null
const closePairs = []
for (const row of bursts) {
  const key = `${row.team_id}:${row.actor_id}`
  const t = new Date(row.created_at).getTime()
  if (key === prevKey && prevTime !== null && t - prevTime < 5 * 60 * 1000)
    closePairs.push({ team: row.team_id, first: prevSummary, second: row.summary, gapSec: Math.round((t - prevTime) / 1000) })
  prevKey = key; prevTime = t; prevSummary = row.summary
}
// Bare-follow-up shape: second message starts "and…", "what about…", etc.
const FOLLOWUP_SHAPE = /^\s*(and |what about|and what about|and last|and this|and that|those|these|it\?|that\?|and\?)/i
console.log(closePairs.filter((p) => FOLLOWUP_SHAPE.test(p.second)))
```

**Result** (staging, all-time): 179 `kind='prompt'` rows, 110 same-actor pairs
within 5 minutes, **4 with a bare-follow-up shaped second message**, e.g.:

```
"How many accounts are there?"              → "And how many tickets in total?"          (9s)
"Which ticket was updated most recently?"   → "And which one if you include archived
                                                tickets?"                                 (22s)
"flu clinic"                                → "And what was discussed in the latest
                                                call with FluClinic? Feel free to use
                                                the Knowledge Base."                     (39s)
```

Real users on staging type bare follow-ups. Not hypothetical.

### Script 2 — per-team `agent_messages`, trace one thread end to end

```js
#!/usr/bin/env node
// READ-ONLY. Same credentials helper as above; looks up the team's
// database_id from core `teams`, then reads that team's own `agent_messages`.
const team = (await sql(CORE, `SELECT database_id FROM teams WHERE id = ?`, [TEAM_ID]))[0]
const rows = await sql(
  team.database_id,
  `SELECT role, content, tool_calls_json, created_at FROM agent_messages
    WHERE thread_id = ? ORDER BY created_at ASC`,
  [threadId]
)
for (const r of rows) {
  if (r.role === "tool" && r.tool_calls_json) {
    const parsed = JSON.parse(r.tool_calls_json)
    console.log(`[tool] ${parsed[0].tool}: ${parsed[0].summary}`)
  } else console.log(`[${r.role}] ${r.content}`)
}
```

**Traced the third pair above** (team "Kwapso", `01KZWXFD86N0K3RZRBHKMKRWYS`,
thread `01M13QXDEZZC`):

```
[user]  "flu clinic"
[tool]  list_apps, list_accounts, list_help_tickets ×4  (a different question — chasing bugs)
[asst]  "There's no fresh bug activity on FluClinic right now..."
[user]  "And what was discussed in the latest call with FluClinic? Feel free to use the Knowledge Base."
[tool]  ask_knowledge: "What was discussed in the latest meeting with FluClinic?"
[asst]  "The most recent one on record was 'FluClinic: Stripe integration QC'..." [[src:...]]
```

**The model rewrote the bare follow-up into a standalone `q` on its own —
under the description that existed BEFORE this change, which said nothing
about standalone questions.** No pronoun, no "And", nothing conversational
reached the tool call.

Checked all 51 `ask_knowledge` calls this team has ever made (full history,
same script, no thread filter). None look like a bare fragment; every `q`
reads as a complete question.

**Caveat, stated plainly because it matters**: this shows the failure mode is
not common on ONE team's history, not that it never happens. No counter-example
(a bare fragment actually reaching `q`) turned up in this team's data. Don't
round that up to "solved."

## Implementation (Step 2 + Step 4)

Per the hub's ruling: no door parameter, no touch to R23's seam. Two surfaces,
same pattern `KNOWLEDGE_CITATION_RULE` already uses for R23 (system prompt +
tool description, cross-checked by a parity test):

- `shared/workers/tool-catalog.ts` — `ask_knowledge`'s `summary` (the ONE
  line sent on every manifest, `tool-diet.test.ts` holds a 160-char ceiling —
  it was already at 157/160, so this took real trimming, not just appending)
  now reads: `"Ask the knowledge base; \`q\` stands alone. Mark claims
  [[src:…]] by \`sourceId\`; never write a list of sources. \`found\` false:
  say so, not from memory."` (151 chars). `detail` (fetched via
  `describe_tool`, not sent upfront) got the full explanation with the worked
  example.
- `workers/data-ops/src/lib/agent.ts` — a new bullet in
  `KNOWLEDGE_CITATION_RULE`, beside the R23 sentence the hub pointed at
  (line 146): *"Before you call ask_knowledge, make sure `q` STANDS ALONE.
  Retrieval sees only that string, never the rest of the conversation, so
  resolve any pronoun or follow-up shorthand from what was already said —
  'and last week?' becomes the question it's actually asking..."*
- `workers/data-ops/test/agent-parity.test.ts` — new test, same shape as the
  existing R23 "both surfaces" test: asserts the tool's `summary` AND
  `SYSTEM` both say the question stands alone (`/stands? alone/`), both name
  `q`, and `SYSTEM` names the concrete failure shape (`/pronoun/`) so the
  test can't be satisfied by an unrelated sentence.

**Mutation proof, run twice** (once per surface, both against the final
committed code):

1. Deleted the new `KNOWLEDGE_CITATION_RULE` bullet from `agent.ts` → test
   red: `expected [full SYSTEM string] to include 'Before you call
   ask_knowledge, make sure \`q\` STANDS ALONE.'` → restored → green (1
   passed).
2. Deleted `; \`q\` stands alone` from the tool's `summary` in
   `tool-catalog.ts` → test red: `expected 'ask the knowledge base. mark
   claims [[src:…]]…' to match /stands? alone/` → restored → green (1
   passed).

Both halves independently catch a regression — neither surface can silently
drift from the other.

`npm run check`: exit 0 (lint, typecheck across every workspace, full test
suite including rule/seam tests — 1348+96+... all green, the usual
build-output-only skips for `check:built`).

## What's still open

- The failure-mode caveat above — not measured as absent, only as uncommon
  on one team.
- `d-followup`'s actual PROVE step, per the hub: the owner trying a real
  follow-up with a pronoun on staging. Not something this lane can do.
- Staging retrieval is unreliable right now — the rebuild's wipe failed
  halfway (vectors deleted, D1 rows untouched) and the hub is re-running it.
  Don't trust a fresh `ask_knowledge` result against staging until that
  lands.

$0 spent throughout. No model turn run.
