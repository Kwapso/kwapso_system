# COSTS.md — what this app costs to run

**§2's "One knowledge question" revised 2026-09-10** (owner tracker item `g-costs`) —
BUILD-5-knowledge-rebuild.md's Stage 2 added a SECOND optional spender to the door
(`read`, the reader that re-reads a shortlist before deciding what is evidence — Kimi
K2.6, gated and metered exactly like the existing `compose`) alongside the ORIGINAL
optional spender (`compose`, the answer writer, unchanged). The old figure priced
embedding + compose only, which was already stale the day `read` shipped and would have
stayed that way silently. See the section for the measured reader cost and the planner's
own estimate, written and reviewed BEFORE any planner code exists — the hub's own
condition for authorising it.

**Written 2026-09-05. Per-action figures revised 2026-09-06**, when the two-stage tool
catalogue cut what a model step sends by 69.8% and left this file's headline 3.4× too
high — see §2. The PRICES are unchanged and still as read on 2026-09-05; what moved is
the number of tokens they are multiplied by.
**§2's preamble block, §3's two cron rows and §4's lifecycle bullet re-checked
against the tree and the live account on 2026-09-07** — the lifecycle bullet was
claiming a control that had never been applied to a single bucket, which is the
one kind of staleness that is worse than none.
**§3's "Google autopilot" row priced only half of what that cron does, until
2026-09-10** — it counted the transcript capture and said nothing about the
ingestion sweep that runs first in the same function, which is where a real,
currently-live Gmail rate-limit incident was actually coming from. See the row
and the paragraph beneath it.

Every price below was read off the vendor's own public page on
that date and is repeated as data in [`shared/workers/pricing.ts`](../shared/workers/pricing.ts),
which is what the code and the scripts compute from. **Nothing here was measured by
spending**: no billed model call, no benchmark run, no assistant turn was made to produce
this file. The measured figures come from tables the app already writes.

Before this file the repository held **no price at all** — `grep -rn '\$' *.md` returned
nothing, and every cost fact lived in a source comment or a test, in neurons and units
rather than money.

**Re-read the prices together, or not at all.** When a vendor changes one, change it in
`shared/workers/pricing.ts`, move `PRICES_READ_ON`, and re-run
`node --experimental-transform-types scripts/ai-spend.mjs` — the estate's real spend is
computed from those constants, so a stale rate is a wrong answer rather than a stale
comment.

---

## 1 · Every surface that bills — the whole list

Nine, and there is no tenth. Each one names the feature behind it and where it is called.

| # | surface | what it is for | where it is called | included / free |
|---|---|---|---|---|
| 1 | **Workers AI — the assistant** | every agent turn (`@cf/moonshotai/kimi-k2.6`) | `model.ts` (`env.AI.run`), through `selectModel` | 10,000 neurons/day per account |
| 2 | **Workers AI — knowledge answers + inline text** | R23's composed answer, summaries (`llama-4-scout`) | `shared/workers/model-text.ts` | same pool |
| 3 | **Workers AI — embeddings** | one vector per knowledge chunk (`bge-m3`) | `knowledge.ts` `embed()` | same pool |
| 4 | **Vectorize** | the account-wide knowledge index (R26) | `knowledge-vectors.ts` upsert/query/delete | 50M queried + 10M stored dims/month |
| 5 | **Resend (email)** | login codes, invites, member notices, client ticket + to-do mails, the growth alarm, the nightly ops digest | `shared/workers/notify.ts` | 3,000/month **and** 100/day |
| 6 | **Workers + D1** | every request and every write | everywhere | 10M requests, 50M row-writes, 5 GB |
| 7 | **R2** | uploaded files: knowledge documents, ticket attachments, learning media, brand assets | `storeImageDataUrl` and the bucket writes R40 censuses | 10 GB, 1M Class A ops, **zero egress** |
| 8 | **Durable Objects** | the realtime `TeamChannel` | `workers/realtime` | 1M requests, 400,000 GB-s |
| 9 | **Anthropic** | **development only**, from `scripts/` — `i18n-translate.mjs`, `agent-routing-bench.mjs` (historic), `kb-bench.mjs`, one backfill | never from a worker | none — the owner's PERSONAL key |

**Surface 9 is the one that had never been written down anywhere.** No worker in this
repository calls Anthropic; `no-quiet-downgrade.test.ts` asserts the adapter cannot come
back. But four scripts still bill the owner's own account, and one of them
(`i18n-translate.mjs`) has rate-limited it before. It is a development cost, not the
product's, and it belongs on the list precisely because a surface nobody has written
down is the one that surprises somebody.

### The prices, with their sources

| surface | price | source | read |
|---|---|---|---|
| Workers AI, over the free tier | $0.011 / 1,000 neurons; **10,000 neurons/day free** | developers.cloudflare.com/workers-ai/platform/pricing | 2026-09-05 |
| `@cf/moonshotai/kimi-k2.6` | $0.950 / M in · $4.000 / M out (86,364 / 363,636 neurons per M) | same | 2026-09-05 |
| `@cf/openai/gpt-oss-120b` (prior engine) | $0.350 / M in · $0.750 / M out (31,818 / 68,182) | same | 2026-09-05 |
| `@cf/meta/llama-4-scout-17b-16e-instruct` | $0.270 / M in · $0.850 / M out (24,545 / 77,273) | same | 2026-09-05 |
| `@cf/baai/bge-m3` (embeddings) | $0.012 / M in (1,075 neurons per M) | same | 2026-09-05 |
| Vectorize | $0.01 / M queried dims (50M/mo incl.) · $0.05 / 100M stored dims (10M incl.) | developers.cloudflare.com/vectorize/platform/pricing | 2026-09-05 |
| Resend | free 3,000/mo **and** 100/day; Pro $20/mo → 50,000; overage $0.90 / 1,000 | resend.com/pricing | 2026-09-05 |
| Workers Paid plan | $5/mo; requests $0.30/M over 10M; D1 writes $1.00/M over 50M; D1 storage $0.75/GB-mo over 5 GB | `~/.claude/skills/cloudflare_usage/references/pricing.md` (from developers.cloudflare.com/workers/platform/pricing) | dated 2026-07 |
| R2 | $0.015/GB-mo over 10 GB; Class A $4.50/M over 1M; Class B $0.36/M over 10M; **egress $0** | same | dated 2026-07 |
| Durable Objects | $0.15/M requests over 1M; $12.50/M GB-s over 400,000 | same | dated 2026-07 |
| Anthropic (scripts only) | not priced here — it is not the product's budget, and no worker can reach it | — | — |

**Placeholders used: none.**

---

## 2 · What one action costs

### The measurement everything rests on

The assistant re-sends its preamble — the system prompt plus the tools it is offered —
on every model call in a turn. Reproduce it in one command, which makes no model call:

```
$ node scripts/measure-preamble.mjs
tools in catalogue  166
tool JSON           109,680 chars  (~28,695 tokens)
system prompt       25,464 chars  (~6,662 tokens)
PREAMBLE            135,144 chars  (~35,357 tokens)
ungated tools       53 of 166 carry no declared gate, so every caller gets them
trim FLOOR          65,578 chars  (~17,157 tokens)

STAGE ONE            40,864 chars  (~10,691 tokens) — what a step ACTUALLY sends
  7 core tools in full, plus 3,023 chars of names for the other 159
  a cut of 69.8% against the whole catalogue above
```

Read on the working tree on **2026-09-07**. `PREAMBLE` drifts by a few hundred
characters every time a tool description is edited — it was 134,447 / 35,175 on
6 September — and **`STAGE ONE` has not moved**, which is the number every figure
below is computed from. So a drift in the top line changes nothing here and is
still worth re-pasting: the day it moves the bill, the two lines will disagree
and somebody will be able to see it.

**TWO NUMBERS, AND THE SECOND ONE IS THE BILL.** Since the two-stage catalogue
(2026-09-06) a step carries the CORE tools in full plus a flat index of every other
tool's NAME, and fetches the rest on demand with `load_tools`. `PREAMBLE` is what the
model could reach — still the right thing to measure, because it is what the bill would
be without the split. `STAGE ONE` is what a step costs today. Every figure below is
computed from **10,691**, and the older figures this file carried (132,528 chars,
34,672 tokens, $0.1149 a reply) described the catalogue before the split — they were
correct when written and are kept nowhere, because a superseded number in a rate card is
worse than none.

Two independent checks agree with the WHOLE-CATALOGUE figure (they predate the split and
measure the un-split shape, which is exactly what they are being used to confirm):

- the **provider's own tokenizer**, recorded in `agent-routing-bench.mjs`'s header on
  29 Aug 2026: 775,265 input tokens over 22 one-call questions = **35,239 per step** (1.6% apart);
- the **account meter**, recorded in the same file on 30 Aug: ~880 neurons per question
  on gpt-oss-120b, which at 31,818 neurons/M input is ~27,700 tokens — the same order,
  for a catalogue that has grown since.

### One agent reply — **measured**, not estimated

`agent_usage_log` records the tokens the provider reported for every command
(core migration 0027). Read on staging, 2026-09-05, over the last 90 days
(`node --experimental-transform-types scripts/ai-spend.mjs --days 90`):

```
assistant commands  183 across 1 team
AI units metered    504
input tokens        7,194,070
output tokens         105,145
cache-read tokens   7,724,103
COST                $14.59      (~1,326,628 neurons)
per command         $0.0797
per AI unit         $0.0290
NOTE  56 of 183 commands carry no token counts (pre-0027 rows)
```

`$14.59 ÷ 127 commands that DO carry tokens = $0.1149 per reply.`

**READ THE WINDOW BEFORE YOU READ THE FIGURE.** Those 183 commands ran between 28 August
and 1 September — **before the two-stage catalogue existed**, and the split is in `main`
but **not deployed**. So $0.1149 is a true measurement of the OLD shape and is not what a
reply costs on this tree. It is kept because it validates the METHOD: the pre-split
published-rate estimate for the same shape was `$0.1093`, and the meter and the rate card
agreed to within 5%. That agreement is why the post-split estimate below can be trusted
before anyone has metered it.

### One agent reply — **after the split**, at published rates

Not yet measured, and it cannot be until the split deploys and somebody uses it. Same
arithmetic, same rate card, the one input that changed:

```
one step             10,691 × $0.950/M = $0.010156   +  400 × $4.000/M = $0.001600  = $0.011756

typical 3-step turn  in  (3 × 10,691) + 523×(1+2)     =  33,642 tok × $0.950/M = $0.031960
                     out  3 × 400                     =   1,200 tok × $4.000/M = $0.004800
                                                                          TURN  = $0.0368
```

**Worst case, from the code's own ceiling.** `MAX_STEPS = 12` (`agent.ts`), each step
re-sending stage one, with tool results accumulating at `RESULT_CHARS = 2000`
characters (≈523 tokens) apiece:

```
input   12 × 10,691 = 128,292  + 523 × (1+…+11) = 34,518  → 162,810 tok × $0.950/M = $0.1547
output  12 ×    400 =   4,800                                         tok × $4.000/M = $0.0192
                                                           WORST TURN  =  $0.174
```

A turn that needs a deferred tool spends one extra step fetching it, which is included in
the step count above rather than added to it.

**The assistant is still the most expensive action in the system by two orders of
magnitude.** What changed is the share that is preamble: it was roughly 90% of a short
turn and is now roughly 70%, because the floor is the system prompt (6,662 tokens) plus
the core tools, and neither of those is per-question waste.

### One signup

One login-code email; the D1 writes and Worker requests sit far inside the plan.

```
1 email × $20 / 50,000 (Resend Pro marginal) = $0.0004
```

At the owner's standing estimate of 1,000 signups/month: **$0.40/month.** The email is
the entire cost.

### One import

`plan_import` makes exactly one model call and passes **no tools**
(`selectModel(env).complete(messages, [])`, `import-agent.ts`), so the 107 KB catalogue
is not sent. `catalogPrompt` is not exported, so the prompt size here is **estimated,
not measured** — roughly 8,000 input and 1,000 output tokens:

```
8,000 × $0.950/M + 1,000 × $4.000/M = $0.0076 + $0.0040 = $0.0116 per import
```

At 500 imports/month: **$5.80/month.**

### One knowledge question

**THE ONLY PART THAT ALWAYS RUNS** — retrieval itself, no model decision, no spend
gate — is the embedding and the index query. Everything below it is OPTIONAL, asked
for by a query parameter (`read=1`, `compose=1`), gated on `agent:create` and metered
through `consumeAiUnit` (`payToRead`/`payToWrite`, `routes/knowledge.ts`) — a caller
that asks for neither spends only the line below.

```
question embedding        ~20 tok × $0.012/M          = $0.0000002
Vectorize, two-stage      2,048 dims × $0.01/M        = $0.0000205
                                    ALWAYS-ON TOTAL  ≈ $0.00002
```

**`read=1` — the reader (BUILD-5 §5-6, Kimi K2.6). MEASURED, not estimated**: the
system prompt and a 12-passage shortlist (`READER_SHORTLIST_CAP`, the fan-out's own
ceiling) built from the SHIPPED prompt functions
(`workers/content/src/lib/knowledge-reader.ts`), character-counted with no model call —
the same method `scripts/measure-preamble.mjs` uses for the assistant's own preamble,
at this file's own chars-per-token ratio (§2's preamble measurement, 3.82):

```
system prompt          1,261 chars  (~330 tok)
12-passage shortlist   8,430 chars  (~2,207 tok)   — READER_SHORTLIST_CAP × up to READER_PASSAGE_CHARS (600) each
                                          INPUT   ≈ 2,537 tok
output ceiling                              200 tok   (READER_MAX_TOKENS)

cost   2,537 × $0.950/M + 200 × $4.000/M = $0.002410 + $0.000800 = $0.0032   (worst case, full shortlist)
```

A thinner shortlist costs proportionally less — a typical 6-passage read is roughly
half the input, ≈$0.0018.

**`compose=1` — the writer (R23, `llama-4-scout`). Unchanged from the prior figure**:

```
composed answer (ANSWER_MAX_TOKENS = 900):
  ~4,000 in × $0.270/M + 900 out × $0.850/M           = $0.0018450
```

**FOUR SHAPES A QUESTION CAN TAKE, and the door lets a caller ask for any of them:**

| shape | spend | cost |
|---|---|---|
| retrieval only (neither flag) | 0 AI units | ≈ $0.00002 |
| `read=1` alone | 1 unit | ≈ $0.0032 |
| `compose=1` alone (today's Knowledge tab, and every MCP call before 10 Sep) | 1 unit | ≈ $0.0018 |
| `read=1` AND `compose=1` (a full "re-read, then write" turn) | **2 units** | ≈ $0.0050 |

**TWO UNITS IS CORRECT, NOT A BUG TO FIX.** The allowance is metered in REQUESTS
(`shared/workers/credits.ts`'s own opening line: "allowance of AI requests"), and
reading the shortlist
and writing the answer are two separate model calls whichever door reaches them —
charging one for both would be under-metering, the exact hole this cost file exists to
close. Still **2.6× cheaper than an agent turn** even at the most expensive shape
(`$0.0050` vs `$0.0368`), which is what the two-model design intended and remains true
with the reader added.

### With the planner — ESTIMATED, not measured, and not yet built

BUILD-5's loop adds a THIRD optional spender: a planner that decides whether a question
needs decomposing into more than one search (`plan`, hard-capped at 12 fan-out
branches). No code exists yet — this is the arithmetic the hub asked for BEFORE it does,
because the shape of the number is a design input, not a report card.

```
IF every question ran the planner:
  read + compose + plan  = 3 AI units/question
  at the $0.0050 two-unit figure above, a THIRD model call of similar
  size to the reader's system-prompt-only overhead (no shortlist to read yet —
  the planner sees only the question) — call it ~400 in / 150 out tokens:
    400 × $0.950/M + 150 × $4.000/M = $0.00038 + $0.00060 = $0.0010
  THREE-UNIT TURN  ≈ $0.0060                                    (+20% over two units)
```

**That 20% is the number that matters, and it is why the planner ships with a
heuristic fast path (hub condition, 10 Sep 2026): an ordinary, single-topic question
must never pay for a decomposition it did not need.** Most questions — the whole
measured corpus of "chatty near-miss" questions this suite's own fixtures use — are one
topic, one search; only a genuinely multi-hop or ambiguous question needs more than one
branch. **If the fast path holds, the planner's real-world cost is closer to 0% of
questions paying the third unit than 100%**, and the $0.0060 figure above is a CEILING
a caller almost never actually pays — the same shape `MAX_STEPS`'s worst-case agent-turn
figure ($0.174) already is against the typical one ($0.0368). Re-measure this the day
the planner ships and the heuristic's real hit rate is known; until then, treat the
ceiling as the number to budget against and the typical case as unknown.

**A MONTHLY PROJECTION, at the same 20,000-questions/month estimate §2's tenant table
already uses, three ways:**

| shape everyone used | monthly cost | vs the old ($0.0019/question, $38/mo) figure |
|---|---|---|
| retrieval only | $0.40 | −99% (the old figure priced `compose` as always-on; a caller asking for neither flag was never actually this cheap in the old arithmetic) |
| `compose=1` only (today's real usage) | $36 | −5% (rounding — this is the shape the old figure actually described) |
| `read=1` + `compose=1`, every question | $100 | **2.6× the old figure** |
| …if the planner's ceiling were paid by every question too | $120 | **3.2× the old figure** |

**The 2.6×/3.2× multipliers are the headline finding of this section.** They are not a
reason to withhold the reader (KB-AUDIT.md §3's own measured case — a paraphrase
refused with the right document as the #1 nearest neighbour — is the more expensive
failure), but they are the number that should be in front of whoever sets `read=1`'s
default and decides whether the assistant's own knowledge-base calls should ask for it
on every turn or only when a first pass refuses. That default is not this lane's to
set — flagged here so the decision is made with the arithmetic in view rather than
found later in a bill.

**Still cheaper than an agent turn at every shape, though the margin is no longer
one number.** Against the typical 3-step turn (`$0.0368`): retrieval alone is ~1,840×
cheaper, `compose` or `read` alone are 11-20× cheaper, and the most expensive shape —
`read` AND `compose` together — is still **7.4× cheaper** (`$0.0050` vs `$0.0368`), or
**6.1×** even at the planner's own estimated ceiling (`$0.0060`). The two-model design's
core saving holds throughout; what has changed is that "a knowledge question" is no
longer one number, it is four (five once the planner ships), and the caller's own query
parameters pick which one applies.

### A month, per tenant

At the owner's standing volume estimate (24 Aug 2026 — an **estimate**, not a
measurement): 1,000 signups, 500 imports, 20,000 assistant replies per month.

| line | arithmetic | per month |
|---|---|---|
| assistant replies | 20,000 × $0.0368 | **$736** |
| …if every reply hit `MAX_STEPS` | 20,000 × $0.1740 | $3,480 |
| imports | 500 × $0.0116 | $5.80 |
| signup emails | 1,000 × $0.0004 | $0.40 |
| knowledge questions (say 20,000) — TODAY'S SHAPE, `compose=1` as the norm | 20,000 × $0.0018 | $36 |
| plan base | — | $5 |
| everything else (requests, D1, R2, DO) | inside the included allowances at today's volume — see §4 | $0 |
| | | **≈ $783/month** |

**The knowledge-questions row is one of four possible numbers, not one** — see "With
the planner" above for the full table (retrieval-only $0.40/mo up to $120/mo if every
question paid for the reader, the writer AND the planner's ceiling). $36 is kept as the
headline because it is today's actual shape (`compose=1`, no `read` or `plan` default
turned on anywhere yet); the day a default changes, this row changes with it.

**One line is 94% of the bill** — it was 98% and $2,235/month on the pre-split preamble.
Any cost work that is not about the assistant is still rounding, but the preamble is no
longer the obvious next thing to cut: at 10,691 tokens a step, 6,662 of them are the
system prompt, which is the capability brief the assistant needs to know what the app can
do. The next real lever is FEWER STEPS, not a smaller preamble.

**None of this is metered yet.** The split is not deployed, so the $736 is a rate-card
projection standing where a measured $2,186 used to be. It becomes a measurement the
first time `scripts/ai-spend.mjs` is run over a window after the deploy.

---

## 3 · What the scheduled work costs

Three crons. None of them makes an unbounded model call, and each exits cheaply when
there is nothing to do.

| cron | frequency | worst-case work per tick | cost per tick |
|---|---|---|---|
| **knowledge sweep** (`workers/content`) | every 15 min | `CRON_TEAM_CAP` = 200 teams × `INGEST_SOURCES_PER_TICK` = 25 sources | **$0 on a quiet tick.** Unchanged text is skipped on a content hash *before* any embedding call, so a tick with no new material makes no model call at all. A tick that re-embeds a full 25-source slice of ~5,000-char sources is `25 × 5,000 / 3.82 = 32,700 tok × $0.012/M ≈ $0.0004`. |
| **Google autopilot — the ingestion sweep** (same tick, same function, priced separately below because until 2026-09-10 it was not priced at all) | every 15 min | `GOOGLE_SWEEP_PEOPLE_PER_TICK` = 5 people (today's real count: 3) × 4 kinds (drive, gmail, calendar, chat) | **$0 in Google's own billing, and up to ~204 Gmail API calls per connected mailbox on a tick where nothing changed.** See the paragraph below the table — this is the row that had gone missing. |
| **Google autopilot — transcripts** (same tick, after the sweep above) | every 15 min | `GOOGLE_SWEEP_PEOPLE_PER_TICK` people × `TRANSCRIPT_SWEEP_PER_PERSON`, `TRANSCRIPT_ATTEMPT_CAP` | Google's APIs are free at this volume; the cost is the embeddings a captured transcript then produces, priced in the row above. |
| **morning digest** (same worker) | daily | one email per staff member on a team with nobody on triage duty, capped at `SEND_FAN_CAP` = 100 recipients; **plus the cron watch** — one `SELECT job, last_run_at FROM cron_heartbeats LIMIT 50` | `n × $0.0004`, so at most `100 × $0.0004 = $0.04/day` = **$1.20/month per team**. A 20-person agency is $0.24/month. This is the one job whose work grows with TEAM SIZE rather than with what changed — but it grows to a stated ceiling, past which the extra recipients are dropped and named in the log rather than silently sent to. The watch is one bounded read of a three-row table: fractions of a penny a year, and it is listed because unpriced is unpriced. |
| **nightly retention + size check + ops digest** (`workers/tenancy`) | daily, 03:10 UTC | `RETENTION_DELETE_CAP` × `RETENTION_PASSES_PER_TICK` deletes, `CRON_GROWTH_CAP` = 200 upserts, `CRON_ALERT_CAP` = 50 alarms, plus ≤ 4 bounded SELECTs and at most one digest email — **and, since 2026-09-07, two service-binding health fetches** (`probeWorkerHealth` of auth and realtime, `HEALTH_PROBE_MS` each) **and the cron watch's own `SELECT … LIMIT 50`** | D1 writes: ~250 rows = `250 / 1M × $1.00 = $0.00025`. Email: at most `1 + recipients × $0.0004`. The two health fetches are worker-to-worker subrequests, 2/day = 730/year against the 10M-request included tier, i.e. **$0.0000005/day** at `$0.30/M`. **Still under a cent a day.** |

**Nothing here scales with the dataset — except the ingestion sweep above, and the
exception is why it gets its own paragraph.** Every other row is a rotating, bounded
window with a cursor; `teamSlice` warns in the log when the estate outgrows one tick.

### The ingestion sweep's real shape, priced for the first time on 2026-09-10

`googleAutopilot()` (`workers/content/src/lib/google-autopilot.ts:139`) does two things
per connected person, every tick, and only the second one was ever in the table above:
first `sweepGoogle()` (line 168) brings in drive, gmail, calendar and chat material;
only then does the transcript-capture loop the row above prices actually run. The first
half was never counted, in dollars or in calls — and dollars is the wrong unit for it,
because Google does not bill this app per call. Calls are the unit that matters here,
and they explain a real, live symptom: the `google_busy` refusal
(`workers/content/src/lib/google-api.ts:240`, a 403 whose body carries `rateLimitExceeded`
/ `quotaExceeded` / `userRateLimit` / `dailyLimit`) that the sweep has been hitting.

Three of the four kinds stay cheap because each is scoped to a short, named list a
person actually shared — a handful of Drive folders, Chat spaces or calendars. **Gmail
is the one kind that is unscoped by default** (`google-read.ts`: *"I'd read all my
emails,"* the owner, 20 Aug 2026 — the contact fence that used to narrow it was removed
on purpose), so its read is the whole mailbox unless a person has set a label scope.
Per person, per tick, `gmailSearch()` (`google-api.ts:1264`):

```
list     up to GMAIL_SWEEP_PAGES (4) × GOOGLE_PAGE_SIZE (50)  = 200 message ids   (4 calls)
headers  one messages.get(format=metadata) per id, 10 at a time via allSettled    (≤200 calls)
                                    — the cursor is applied AFTER this, in knowledge-google.ts's
                                      slice(), never as a filter Gmail is asked to honour —
hydrate  one messages.get(format=full) per id the cursor kept, ≤ INGEST_SOURCES_PER_TICK (25)
                                                                                   (≤25 calls)
```

Worst case (a mailbox with 200+ brand-new messages): ~229 calls. **Steady state, a
perfectly quiet mailbox with nothing new: ~204 calls** — only the hydrate step is
skipped, because the cursor cannot narrow anything until the list and the headers have
already been paid for. At today's real connection count (3 mailboxes,
`GOOGLE_SWEEP_PEOPLE_PER_TICK` caps at 5) × 96 ticks/day:

```
3 × 204 × 96 ≈ 58,752 Gmail API calls/day, on a day when nothing new arrives at all
```

Read on the working tree, 2026-09-10, against `GMAIL_SWEEP_PAGES`, `GOOGLE_PAGE_SIZE`
(`workers/content/src/lib/google-api.ts`) and `INGEST_SOURCES_PER_TICK`
(`workers/content/src/lib/knowledge-ingest.ts`). This is $0 on Google's own bill and it
is the proximate cause of the rate-limit hits — the two facts are not in tension, they
are the same fact stated in two different units, and only the dollar one was written
down before today.

---

## 4 · Storage, egress and what nothing deletes

### Measured, 2026-09-05 (read-only, against the live account)

**R2 — 138 MiB across nine buckets, 368 objects.**

```
kwapso-glide-archive-staging     78.71 MiB   194 objects
kwapso-internal-media-staging    32.42 MiB    59 objects
kwapso-media-staging             26.85 MiB   115 objects
every production bucket           0.00 MiB     0 objects
```

Against a 10 GB included allowance that is **1.3% used**, and every production bucket is
empty because the product is not live on it yet.

**D1 — the estate, from `db_growth` (the app's own nightly readings).**

```
team-01kzwxfd86n0k3rzrbhkmkrwys   131.86 MB   (was 126.71 MB 24h earlier — +5.15 MB/day)
kwapso-core-staging                 5.04 MB   (+0.01 MB/day)
team-01m0thfjc37525m1wd1ppwtpby     2.62 MB
team-01m16pj3dxhnzvpnbdgz9gx22p     1.22 MB
```

At 5.15 MB/day the busiest team database reaches the 80% alarm line (8 GB) in about
**1,530 days**. The alarm and the trend already exist (`sharding.ts`); this is the first
time the number has been written down.

**Vectorize — and this is the line to watch.**

```
9,173 knowledge chunks × 1,024 dimensions = 9,393,152 stored dimensions
```

The Workers Paid plan includes **10,000,000 stored dimensions**. **One team is at 94% of
the whole account's free allowance.** Past it, storage bills `$0.05 per 100M stored
dims/month` — so ten teams this size is `~94M dims = $0.047/month`, which is negligible
in money and worth knowing because it is the only allowance the current estate is close
to. Query cost is trivial: a two-stage search is 2,048 queried dimensions, and the plan
includes 50M/month, i.e. ~24,000 questions a month before a penny.

### Egress

**R2 charges nothing for egress, at all.** Every file this product serves — a client
downloading a ticket attachment, a staff member opening a knowledge document — costs the
Class B operation and the Worker request, and nothing for the bytes. This is the single
most load-bearing fact in this section and the project had never stated it.

### Superseded bytes are reclaimed; retired ones are kept on purpose

**Updated 5 Sep 2026.** The paragraph this replaces said there was no `.delete(` on
any bucket and no lifecycle rule anywhere. Both halves have moved, and the
distinction that replaced them is the useful one:

- **SUPERSEDED — reclaimed.** A picture or a file that a write stopped pointing at
  is deleted after the row moves, fail-soft, through `reclaimMedia`
  (`shared/workers/image.ts`). Nine columns do this now: the profile photo, the
  team logo, an account's logo and cover, an app's logo, a brand asset's file, a
  deliverable's link file and picture, a staff photo and a certificate. Before
  this, changing a client's logo left the old object in R2 for ever with no row
  pointing at it and no way to find it again — the key was in the column that had
  just been overwritten.
- **RETIRED — kept.** Archiving a record reclaims nothing, deliberately: a row
  that is deactivated can be restored, and deleting its bytes would hand back an
  asset whose file 404s. `setBrandAssetActive` states this in the source and it is
  the rule for every module.
- **LIFECYCLE — set on STAGING, not yet on production, and never by age.**
  `scripts/r2-lifecycle.mjs` (OPERATIONS.md) aborts incomplete multipart uploads
  after `ABORT_INCOMPLETE_DAYS = 7` and can transition old objects to Infrequent
  Access; it does not and will not expire an object by age, because age says
  nothing about whether a row points at it.

  **Where it is applied, and how to check** — because this bullet used to claim a
  control that was not there. Until 7 Sep 2026 it read "applies rules to every
  bucket", and against the live account every one of the nine carried exactly one
  rule and it was **Cloudflare's own** `Default Multipart Abort Rule`, applied
  when a bucket is created. The script existed, was correct, was tested, and had
  never been run. A written claim that a control is set where it is not is worse
  than saying nothing, because it stops anybody checking.

  Run on 7 Sep 2026 against the five STAGING buckets, which now carry our own
  `abort-incomplete-multipart` rule:

  ```
  cf-exec node scripts/r2-lifecycle.mjs staging          # done, 2026-09-07
  cf-exec npx wrangler r2 bucket lifecycle list kwapso-media-staging
    name: abort-incomplete-multipart · enabled: Yes · (all prefixes)
    action: Abort incomplete multipart uploads after 7 days
  ```

  **PRODUCTION IS STILL UNSET, and it is the owner's to set** (the script's own
  header says so: applying rules to live buckets is an infrastructure change). It
  also has one thing to fix first — `bucketsFor("production")` names
  `kwapso-glide-archive`, which does not exist on the account (only the `-staging`
  one was ever created), and it sorts first, so a production run fails on its
  first bucket and sets nothing at all. Create the bucket or drop it from the
  derivation, then:

  ```
  cf-exec node scripts/r2-lifecycle.mjs production --dry-run
  cf-exec node scripts/r2-lifecycle.mjs production
  ```

  What the gap costs today is small and worth stating rather than assuming:
  Cloudflare's default rule does the same job as ours, so incomplete multiparts
  ARE being aborted on production. What is missing there is the guarantee that
  the rule stays if the default ever changes.

What remains, and it is still an owner's decision: a RETIRED record's bytes are
kept for ever, and there is no tenant-delete path at all. Combined with
`KNOWLEDGE_FILE_MAX_BYTES = 25 MB` and `TICKET_FILE_MAX_BYTES = 10 MB`, **a
deactivated record's file stays for ever.**

Today that is 1.3% of an allowance, so it is not urgent — it is *undecided*, which is
different and worse, because the moment it matters the objects are already there.

**The slope, so the decision can be made with a number.** A team that deactivates one
25 MB knowledge document a week leaves `25 × 52 = 1.3 GB/year` of unreachable objects.
Ten such teams pass the 10 GB allowance inside a year and then bill
`13 GB × $0.015 = $0.20/month`, rising. The money is small; the fact that nobody can say
which objects are safe to remove is the real cost.

**This is the owner's call and is deliberately not taken here.** One of the two
questions has been answered by the reclaim above — a SUPERSEDED file goes, and it
is the common case. The two that remain are: does a DEACTIVATED record's file
survive (deactivate-never-delete says the ROW does — it says nothing about the
bytes), and does a hard-deleted team take its bucket prefix with it? Until they are answered, `wrangler r2 bucket info <name>` twice a week apart is the
measurement, and the numbers above are the first reading.

### Retention that DOES exist

D1 has real, enforced retention, swept nightly and bounded, reporting its own ceiling as
an error row when it cannot catch up — and, since 7 Sep 2026, naming the TABLE it failed
on rather than reporting a count of zero that reads exactly like a quiet night:
`ERROR_LOG_RETENTION_DAYS = 90`, `AUTH_RETENTION_HOURS = 24`.

R2 has no retention by age and will not have one, for the reason in the lifecycle bullet
above. What it now has on staging is the multipart-abort rule, which is a lifecycle
control and is not retention: it removes parts nothing can reference, never an object
anybody could reach.

---

## 5 · Retries, failures and what a mistake costs

- **No billed model call is retried automatically, anywhere.** The client's four-retry
  incident on the agent POST is gone from `web/lib/api/`.
- Every retry in the system is bounded by a number in code: `RETRIES = 2` on the data door,
  `TRANSCRIPT_ATTEMPT_CAP`, the realtime client's 15-second backoff ceiling.
- `refundAiUnits` returns exactly the units a thrown model call bought nothing with — and
  since 2026-09-05 a refund that FAILS is recorded rather than swallowed, because a refund
  that never landed is money a customer paid for a turn they did not get.
- **The one unbounded retry left is an embedding outage.** A failed `embed` leaves
  `content_hash` un-stamped, so the sweep re-reads that source every fifteen minutes
  forever with no attempt counter. Each retry costs one embedding batch
  (`$0.012/M input`), so the money is trivial and the silence was not: as of 2026-09-05
  the failure is recorded to the error store with the number of chunks left without a
  vector. **An attempt counter is still wanted** and is a behaviour change, so it is
  written down here rather than made.

---

## 6 · What watches the meter

| watcher | fires | where |
|---|---|---|
| **per-team AI allowance** | *before* the expensive work, race-safe — the cap rides the INSERT's own `WHERE`, checked at the top of every loop iteration | `shared/workers/credits.ts` `consumeAiUnit` |
| **database 80% alarm** | once per NEW alarm, with the trend, by email to `ALERT_TO` | `workers/tenancy/src/lib/sharding.ts` |
| **nightly ops digest** | new + spiking error signatures, and teams at 80% of their AI allowance with no credits behind it, to the same `ALERT_TO` | `workers/tenancy/src/lib/ops-alert.ts` |
| **`scripts/ai-spend.mjs`** | on demand, read-only, in money | this repo |
| **`scripts/measure-preamble.mjs`** | on demand, no model call, with a canary that refuses to print a number it cannot stand behind | this repo |
| **`GET /api/<worker>/health`** | on demand, on all six private workers: whether the worker is missing configuration it cannot work without, by NAME and never by value | `shared/workers/config-health.ts` |

**Two gaps, both deliberate and both the owner's to close.**

1. **Staging enforces no AI ceiling at all.** `AGENT_NO_DAILY_CAP: "true"` in the staging
   block of content, tenancy and data-ops. The flag exists on purpose so testing is never
   refused, and `credits-invariant.test.ts` keeps it off production. The in-rule fix is an
   **account-level neuron alarm** in Cloudflare, not removing the flag.
2. **Spend is visible in the app only in UNITS**, never in neurons or money. Changing that
   is a UI change.

---

## 7 · The one number that does not reconcile

> **THE BENCH MEASURES THE UN-SPLIT SHAPE, and that matters beyond this section.**
> `scripts/agent-routing-bench.mjs:177` calls `toolSpecs()` with no arguments, which
> returns the WHOLE 166-tool catalogue — not stage one, no index, and no `load_tools`.
> That is the right shape for the reconciliation below, which is about the old meter
> reading. It is the WRONG shape for the question the bench is currently being asked to
> answer before the split deploys: run as it stands, it would measure the routing accuracy
> of the catalogue the assistant no longer sends, and pass or fail for reasons that have
> nothing to do with the change. Making it exercise stage one is a small edit —
> `toolSpecs(undefined, new Set())`, the index appended to the system prompt, and a
> `load_tools` reply handled in the loop — and until it is made, "the bench is green" is
> not evidence about the split.


`model.ts` records, off the account meter, *"16,593 neurons for both runs, about $0.18"*
for two 22-question bench runs — 44 model calls, i.e. **$0.0041 per call**. The published
rate for the same shape is **$0.0350 per call**, 8.5× higher.

Three of this repo's own measurements say the meter reading is the odd one out:

- `measure-preamble.mjs` — 35,175 tokens of WHOLE-CATALOGUE preamble per call, which is
  the shape the bench sends (see the note below);
- the bench's own header, from the provider's tokenizer — 35,239 input tokens per step;
- the bench's own note, from the meter six days earlier — ~880 neurons per question on
  gpt-oss-120b **with this catalogue**.

kimi meters 86,364 neurons per M input against gpt-oss's 31,818 — 2.71× — so the same
question should meter roughly **2,400 neurons** on kimi, and 44 of them roughly 105,000,
not 16,593. `agent-routing-bench.mjs --dry` now derives that figure before you agree to
a run: **~65,877 neurons for ONE run.**

**The most likely explanation is the analytics window** — a meter read that missed most of
the calls looks exactly like a cheap run. It is not settled by reasoning. **It is settled
by running a known number of turns and reading `aiInferenceAdaptiveGroups` for exactly
that window.** Until somebody does, treat $0.18 as a floor of unknown depth and the
rate-derived figures in §2 as the ones to plan with.

*(The report that raised this blamed `neurons: usage.neurons ?? 0` in the bench. That
field is real and was fixed to report `null` rather than a silent zero — but nothing has
ever totalled it, so it cannot be the source of the gap. The $0.18 came from the account's
own analytics.)*

---

## 8 · What is still unmeasured, and what would settle it

1. **Whether a turn really costs $0.0345 a step or $0.0041.** → a known number of turns
   against `aiInferenceAdaptiveGroups` for that exact window.
2. **Actual production volumes.** Everything in §2's monthly table is a rate applied to
   the owner's estimate. → `scripts/ai-spend.mjs --production`, or the `cloudflare_usage`
   skill.
3. **What a cached prompt token actually costs on kimi.** Two thirds of September's
   prompt tokens came back cached (measured, §2), and Cloudflare publishes no cached rate
   for this model, so `pricing.ts` charges them at full input rate. Every figure here is
   therefore an **upper bound** on that line. → the account's invoice, or a published
   cached rate.
4. **The import-planning prompt's real size.** `catalogPrompt` is not exported, so
   `$0.0116` per import is estimated. → export it, or log `JSON.stringify(messages).length`
   on one real plan.
5. **R2's growth slope.** One reading exists (§4). → the same command a week later.

---

## 9 · Keeping this file true

- **Prices** live in `shared/workers/pricing.ts` with their source and `PRICES_READ_ON`.
  Change them there; this file quotes them.
- **`workers/data-ops/test/no-quiet-downgrade.test.ts`** reads every `wrangler.jsonc` off
  disk and fails the build if any pins an engine the code does not name, **or** an engine
  `pricing.ts` has no rate for. A cost report computed against the wrong rate card is
  confidently wrong, and it looks exactly like a right one.
- **`workers/tenancy/test/pricing.test.ts`** pins the arithmetic and the published
  constants, so a typo in a rate is a red build rather than a wrong invoice estimate.
- **Re-read the vendor pages together** and move `PRICES_READ_ON` in the same commit.
  A half-refreshed table is worse than a stale one, because nobody can say when the total
  was last true.

**Review this file whenever the assistant's engine changes, whenever a new billing surface
is added, WHENEVER A CODE CHANGE MOVES HOW MUCH IS SENT PER CALL, and otherwise every
quarter.**

That third trigger was missing and it is the one that bit. On 2026-09-06 the two-stage
catalogue cut a step from ~35,175 tokens to ~10,691 — no vendor changed a price, no
billing surface was added, `PRICES_READ_ON` was still correct, and every guard listed
above stayed green. The rate card was right and the bill was wrong by 3.4×, in the
direction that makes the assistant look expensive, for as long as it took somebody to
re-measure. **A rate is only half of a cost; the other half is a number that lives in the
code and can move without anybody touching this file.**

Last full review: **2026-09-05**. Per-action figures re-measured: **2026-09-06**
(`node scripts/measure-preamble.mjs`, no model call). §3's Google-autopilot row
completed: **2026-09-10**, by `spend_review` — the ingestion-sweep half priced for
the first time, against the working tree, no model call and no Google API call
made to produce it.
