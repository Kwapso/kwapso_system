# HUB — knowledge-base rebuild, running record

The hub's own log. One entry per tick. Written here rather than in a chat log
because a decision whose only home is a transcript is a decision the next agent
re-litigates.

---

## Tick 1 — 10 Sep 2026, ~13:45

**Lanes running:** kb_A (model), kb_B1 (gate & identity), kb_B2 (grain & readers),
kb_E (exam). All four branched off `main` before `8d034e79` and were told to rebase.

**Three corrections to my own lane briefs, all mine:**
- `knowledge-shape.ts` is the knowledge MAP feature, not a grain file. I inferred
  a job from a filename — the exact trap CLAUDE.md warns about for the kit. kb_B2
  refused to touch it and was right. Its real grain seam is `google-read.ts:282`,
  where a whole chat thread is flattened to one `sender: text` blob.
- `knowledge-files.ts` ("turning a file into words") was missing from B2.
- `knowledge-summary.ts` ("what each record is about") was missing from B1 — it is
  where a record's CARD content is made.

Found the last two by re-reading every file I had named for every lane, rather
than only fixing the one that was caught.

**The seam between B1 and B2, restated:** B2 decides what the material IS; B1
decides what it is the same as, and where it is filed.

## THE COST METER — and why the obvious instrument is the wrong one

The owner cut the cap from $10 to **$5** on 10 Sep.

Cloudflare's GraphQL `aiInferenceAdaptiveGroups` answers in neurons by model, and
it works — baseline 8–11 Sep: kimi-k2.6 8,272 · bge-m3 518 · llama-4-scout 151,
about $0.10 at `NEURON_USD_PER_1000`.

**But it is ACCOUNT-WIDE and this account holds three apps.** 35 workers, 17 ours,
18 belonging to rest-o and hogo-matching — and `rest-o-data-ops` runs an agent of
its own. Our agent is pinned to `@cf/moonshotai/kimi-k2.6`
(`workers/data-ops/wrangler.jsonc:57`), which is very likely what rest-o's runs
too. So a neuron total by model cannot tell our spend from theirs. BUILD-5 §3 said
"meter read per worker, not per account" without saying how; this is why.

**The only per-worker meter is the app's own rows.** `scripts/ai-spend.mjs`
already prices `agent_usage_log` with the same rate card COSTS.md quotes — but it
covers ASSISTANT turns only. The rebuild's two big spends, embeddings and context
lines, are INGESTION and are recorded nowhere.

**Requirement for lanes C and D:** ingestion spend is recorded into the same log
the assistant writes, so `ai-spend.mjs` answers the whole question and the gate's
"under $5" is a figure off our own meter rather than an account total that
includes another company's app. Until that lands, the account reading is used as
an UPPER BOUND — it can only overstate.

**Revised allocation under $5** (was $10):

| Item | Model | Was | Now |
|---|---|---|---|
| Re-embed everything, twice | bge-m3 | $0.05 | $0.05 |
| Context lines, ~10k pieces | scout | $1.70 | $1.70 |
| Name-index aliases | scout | $0.10 | $0.10 |
| Exam, retrieval-only grading | bge-m3 | cents | $0.15 |
| Exam, full-loop runs | kimi-k2.6 | ~$5 (10 runs) | **~$3.00 (~6 runs)** |
| Headroom | — | ~$3 | $0 |

The economy that makes this fit: **grade retrieval-only for every iteration**
(bge-m3, cents) and spend kimi ONLY on the final validation runs. Ten cheap
iterations and three expensive ones beats ten expensive ones. `FREE_NEURONS_PER_DAY`
is 10,000, so heavy one-off work spread across days rides the free allowance —
which also means a naive neuron total OVERSTATES the bill, and the meter must
subtract the free tier per day rather than multiply the total.
