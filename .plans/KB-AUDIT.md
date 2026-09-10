# Knowledge base audit — kwapso

**Date:** 9 September 2026 · **Scope:** read-only. Nothing was changed.
**Measured against:** staging (`kwapso-knowledge-staging`, team `01KZWXFD86N0K3RZRBHKMKRWYS`, 4,896 sources / 9,781 live chunks). Production core is empty, so staging *is* the real corpus.

---

## The one-paragraph verdict

The engineering is genuinely good — better documented and more carefully reasoned than most production RAG systems I have seen. The retrieval **architecture** is not why it underperforms. It underperforms for four reasons, in order of size: (1) **the relevance floor throws away correct retrievals** — I measured questions where the right document is the #1 nearest neighbour and the answer is still "we have nothing on that"; (2) **the benchmark that guards all of this is saturated and measures the wrong thing** — 22/22 passing, because nearly every question names the title of the document it should find; (3) **10% of the index is duplicate text**, and the duplicates eat answer slots; (4) **whole classes of question the system cannot answer at all** are answered anyway, from samples. None of these is a rewrite. The first is a handful of lines.

---

## 1. What you have built

| Layer | Choice |
|---|---|
| Store | One Vectorize index per environment, 1024-dim, cosine, **namespace per team** |
| Embeddings | `@cf/baai/bge-m3` (multilingual, 1024d) via Workers AI |
| Chunking | 900 chars, paragraph → sentence → hard cut, **no overlap** |
| Lexical | Hand-rolled inverted index in D1 (`knowledge_terms`) |
| Fusion | Reciprocal rank fusion, k=60, weighted (vector 1.0, lexical 0.1, exact-token 2.0, name 2.0) |
| Floor | `MIN_VECTOR_SCORE = 0.5` — below it, refuse |
| Router | Compartment (agency / account) + a record-summary vector pass |
| Reranker | **None** (built, measured, rejected — see §4.6) |
| Answer | Passages + citations decided in one seam (`knowledgeAnswer`), then composed |
| Ingest | 15-min cron, 25 sources per kind per tick, resumable cursors; Google via per-person OAuth loop |

**Sources ingested:** 14 app record kinds + 4 Google kinds (Drive documents, Gmail, Calendar, Chat).

### What is genuinely strong

These are not consolation prizes — they are things most teams get wrong:

- **Tenancy is a partition, not a filter.** Every query passes `namespace: guard.teamId`, applied *before* the search. A wrong metadata filter cannot leak across teams.
- **The index narrows; the database decides.** `returnValues:false, returnMetadata:"none"` — nothing readable ever leaves Vectorize. Passages are re-read from the team's own D1 under the caller's own fence. This is a stronger permission posture than Notion (≤1h stale), Dropbox Dash (periodic ACL refresh) or OpenAI's synced connectors, all of which enforce against a *copy* of the permissions. Yours re-checks against source of truth on every read. **This is a real differentiator; keep it.**
- **The refusal path exists and works.** "What is the capital of France?" is refused. Most RAG systems answer everything.
- **Decisions carry their measurements.** The 0.5 floor has a distribution study behind it. The 0.1 lexical weight has an experiment. The exact-token weight of 2 has an arithmetic derivation. This is rare and it is why this audit could go deep quickly.
- **`bge-m3` is the right model** for a half-German corpus. It is also 1024d/8k-context at $0.012/M — cheaper *and* longer than `bge-base-en-v1.5` ($0.067/M, 512 tokens). You are not paying for the wrong model.
- **Ingestion is idempotent and resumable.** Content-hash gating, per-slice progress, derived vector ids. A tick that dies costs nothing.

---

## 2. The headline finding: your benchmark is green and your users are not

`scripts/kb-bench.mjs` reports **22/22**. I ran it. It passes.

Then I looked at the questions. **13 of the 17 "finding" questions name the title of the document they are supposed to retrieve** — "week recap" → a source titled *Week recap*; "Team Assembly" → *Team Assembly*; "task 3144" → a ticket numbered 3144. The grader then checks that a cited **title** contains that same string. That measures title matching, which is the easiest retrieval task there is.

So I ran the same facts twice — once naming the source, once describing it:

| Fact | Asked by title | Asked by description | Result |
|---|---|---|---|
| Monthly assembly organiser | "What came out of the Team Assembly?" → **6 passages** | "Who is responsible for organising the monthly get-together?" → **REFUSED** | ❌ |
| Week recap decisions | "What did we agree in the week recap?" → **6 passages** | "What did the team agree about horsepower and specialisation?" → **REFUSED** | ❌ |
| Pharmacy vouchers | "How are vouchers issued to a pharmacy?" → **6 passages** | "How does a chemist get reimbursed for a jab?" → **REFUSED** | ❌ |
| CPAA feedback | "What was the feedback on Kwapso CPAA?" → 6 passages | "What did people say about spacing and components in our UI kit?" → 6 passages | ✅ |
| HOGO sync | "What was discussed on the HOGO sync?" → 6 passages | "What is the plan for the candidate CV upload workflow?" → 6 passages | ✅ |
| Week planning | "What was the latest week planning about?" → 6 passages | "What are we planning to work on next?" → 6 passages (weak) | ~ |

**3 of 6 paraphrases are refused outright while the title-shaped twin passes.** Your users do not know your document titles. That gap *is* the complaint.

The second row is the sharpest: the bench's own answer key for Q01 lists `"horsepower"` and `"specialis"` as words the correct answer must contain. So the bench asserts those words are in the corpus — and asking for them directly is refused.

---

## 3. Why the paraphrases refuse — and this is the single highest-value fix

I pulled the raw vector scores. The floor is `0.5`:

| Question | Top-1 score | What the top-1 chunk actually is | Verdict |
|---|---|---|---|
| "Who is responsible for organising the monthly get-together?" | **0.444** | 🧡 **Team Assembly** — Notes by Gemini | **correct doc, refused** |
| "What did the team agree about horsepower and specialisation?" | **0.440** | ⏮️ **Week recap** | **correct doc, refused** |
| "How does a chemist get reimbursed for a jab?" | **0.457** | FluClinic: August sprint planning | plausible, refused |
| "What are the most recent decisions we made?" | **0.492** | ⏩ Week planning | plausible, refused |
| "What are the recurring complaints across our clients?" | **0.489** | ⏮️ Week recap | plausible, refused |
| *control:* "How are vouchers issued to a pharmacy?" | 0.664 | Issuing vouchers to a pharmacy | ✅ 20/20 over floor |
| *control:* "What came out of the Team Assembly?" | 0.564 | 🧡 Team Assembly | ✅ 6/20 over floor |

**The retrieval is working. The floor is discarding the win.** In the first two rows the #1 nearest neighbour is exactly the right document, and the system says it holds nothing.

### Why this happened, and why it isn't a tuning mistake

The 0.5 floor was measured honestly — 142 answerable + 16 unanswerable questions, and the numbers in the code are real. But it was measured on a question set with the same shape as the bench: direct, mostly title-anchored. A paraphrase sits **0.05–0.06 lower** than its direct twin, which puts it exactly in the band the floor cuts.

The deeper problem is the **instrument**. You are asking a raw bi-encoder cosine to make a binary "is this evidence?" decision. A bi-encoder cosine is a *ranking* signal, not a *calibrated* one — its absolute value shifts with question phrasing, question length and language. Using it as a threshold means phrasing decides whether the system answers.

**Options, cheapest first:**

1. **Make the floor relative, not absolute.** Keep an absolute floor much lower (~0.35) purely as a hallucination guard, and add a *gap* test — accept the top-k if the top score stands clearly above the corpus's typical background for that question. This alone recovers all three refused paraphrases without letting "capital of France" (0.32 top-1) through.
2. **Decide with a reranker instead of a cosine.** A cross-encoder reads the question and the passage together and gives a far better-calibrated relevance score. This is the standard answer and it is what the literature says buys the most (below).
3. At minimum, **instrument the refusals in production** — log every refusal with its top-1 score. You will see the 0.44–0.49 band immediately.

> ⚠️ Do not simply lower the constant to 0.44. That trades false refusals for false answers, and R23's honest-refusal property is one of the best things about this system. Change the *shape* of the decision, not the number.

---

## 4. Everything else, ranked

### 4.1 One meeting exists as six sources — 10% of the index is duplicate text

Measured: **990 redundant chunk copies of 9,781 live chunks (10.1%)**. The largest block is **568 chunks shared between `document` and `meeting`** — the Gemini meeting-notes Drive file and the meeting transcript are the same words indexed twice.

The ⏩ Week planning of 7 Sep 2026 exists as **six** live sources:

```
2026-09-07   88 chunks  document  ⏩ Week planning - 2026/09/07 11:28 CEST - Notes by Gemini
2026-09-07    2 chunks  document  ⏩ Week planning - 2026/09/07 11:00 CEST - Notes by Gemini
2026-09-07    2 chunks  meeting   ⏩ Week planning
2026-09-07    5 chunks  email     Notes: "⏩ Week planning" Sep 7, 2026   ×3
```

The de-duplicator (`diversify`) caps passages **per title** — and these titles differ, so it does not fire. Seen live: asked "What did we agree in the week recap?", **4 of 6 slots** went to two meetings × two copies each.

This is exactly your complaint about "unnecessary references to files that were not important". It is not a ranking bug; it is the same document winning twice.

**Fix:** dedupe on content hash at ingest, or make `diversify` group by `(record_date, normalised title)` rather than raw title. The `contentHash` function already exists.

### 4.2 The router is hijacked by ordinary English words

`accountNamedIn` narrows the search when a question names a client. **26 of your 134 accounts have single-token names**, and the token is often a common word:

`VU Solutions → "solutions"` · `re-green → "green"` · `DEMO → "demo"` · `aWs → "aws"` · `196+ → "196"` · plus first names: `Markus`, `Klaus`, `Sandra`, `Manuel`, `Sadia`, `Natalya`, `Alaap K → "alaap"`

Demonstrated live:

- *"What **solutions** have we proposed for data import?"* → **"The question names VU Solutions, so I searched VU Solutions's material and the agency's own."**
- *"Which parts of the product are **green** and ready to ship?"* → routed to **re-green** → **REFUSED**
- *"What has **Markus** been working on?"* → routed to the Markus account → **1 passage: the account stub itself**

The narrowing is silent and the reason string reads confidently. Any client question that happens to contain a hijacking word loses that client's compartment.

**Fix:** require an account name to be ≥2 tokens, or ≥1 token that is *rare in the corpus* (you have the term table to compute that), or match only on `code`. Also: many of these "accounts" are people — the account list itself needs a clean-up.

### 4.3 Templated record mirrors are eating answer slots

**1,142 of 9,781 live chunks (11.7%) are under 200 characters**, and most are machine-generated record mirrors:

| kind | live chunks | avg chars |
|---|---|---|
| `event` | 59 | **40** |
| `contact` | 89 | **97** |
| `app` | 28 | 135 |
| `task` | 256 | 154 |
| `person` | 10 | 195 |

A 40-character chunk ("X is a meeting of ours on 3 Sep") is dense and short, so it scores well against name-shaped questions, and the name arm's weight of 2.0 pushes it higher. Seen live:

- *"What did Alaap say about the design system?"* → **3 of 5 citations were `person` stubs** (Alaap K, Alaap Kanchwala ×2) before any real document.
- *"Who is Aurora and what does she do?"* → `person` stub first.
- *"What has Markus been working on?"* → the *only* passage was the `account` stub.

**Fix:** these belong at the `record` (router) level, not the `chunk` level. A record mirror should help you *find* the right ticket; it should never be quoted as evidence. Excluding kinds whose whole body is a generated sentence from `level: "chunk"` is a small change with a visible effect.

### 4.4 The lexical arm has no IDF — so the "hybrid doesn't help" conclusion rests on a strawman

`knowledge_terms.weight` is the **raw term frequency, capped at 8**. The scorer is `SUM(weight)`. There is **no inverse document frequency and no length normalisation** — a chunk containing "invoice" five times scores the same whether "invoice" appears in 5 chunks or 5,000.

That is the weakest possible lexical scorer, and it explains the measured result that fusing it at parity *cost* 9 points of recall (53.5% vs 62.7%). The response was to turn it down to 0.1 and gate it behind exact-token questions. **The conclusion "hybrid search hurts here" was drawn about a scorer that is not BM25.**

This matters because hybrid is one of the two biggest documented levers:

- Anthropic's contextual-retrieval study: contextual embeddings alone cut failures **35%**; adding contextual **BM25** took it to **49%**.
- Dropbox Dash runs BM25 + dense, and their VP of Engineering: *"We found BM25 was very effective on its own… It's an amazing workhorse."*
- OpenAI's `file_search` ships **RRF hybrid by default** with tunable weights.

**And FTS5 is available in D1** — including `fts5vocab` and the porter/unicode61 tokenizers. The stated reason for rejecting it (delete cost on re-index) is real but solvable: FTS5's external-content mode with explicit `'delete'` commands keeps deletes keyed. Worth re-testing before accepting "the word arm doesn't help" as settled.

### 4.5 Recency: the condition your own code names as the trigger has been met

`fuse()` documents exactly when to reopen the recency question: *"a question whose newest material is NOT RETRIEVED AT ALL. Not ranked low — absent."*

Measured, today: *"What changed this week?"* returned one citation — **⏩ Week planning of 31 August**. The 7 September Week planning (88 chunks) exists and was **not retrieved**. *"What are the most recent decisions we made?"* was **refused** against a corpus of hundreds of dated meeting transcripts.

The trigger is met. The code's own recommendation — recency **gated on intent** (apply only when the question says "latest", "recent", "this week") — is the right shape and leaves every measured number untouched.

### 4.6 Reranking: rejected for a good reason, but it is the biggest lever in the literature

You built a cross-encoder rerank, measured it, and it made things *worse* (recall@6 62.7% → 47.9%). That is honest work and the rejection is documented. The research backs your finding that `@cf/baai/bge-reranker-base` is the only reranker Cloudflare exposes, and it is weak.

But reranking is the single most valuable move in the published evidence:

- Anthropic: reranking took failures from 2.9% → **1.9%** (67% total reduction).
- On nDCG, **plain reranking beat contextual retrieval on every dataset tested** (+3.9 to +11.2 points), and reranking *on top of* contextual retrieval added **+8.2 to +15.7**.
- Reranking largely **erases the choice of embedding model** — post-rerank nDCG across six providers spanned 0.4 points.

You are leaving the biggest lever on the table because the one implementation available on-platform is bad. Three ways forward:

1. **LLM-as-reranker on Workers AI.** Ask a cheap instruct model to score 20 passages. Costs one extra call; stays on Cloudflare; almost certainly beats `bge-reranker-base`.
2. **Relax the "stays on Cloudflare" constraint for reranking only.** Cohere Rerank 3.5 / Voyage rerank-2.5 are materially better. This is a *policy* decision about text leaving the platform, not an engineering one — worth making explicitly rather than by default.
3. Re-test `bge-reranker-base` on a *harder* question set. Your rejection was measured on the same title-anchored questions that saturate the bench; a reranker has little to fix when the top hit is already right, and plenty to fix on paraphrases.

> `bge-reranker-base` costs **$0.0031/M input tokens** on Workers AI — about 4× cheaper than `bge-m3` embeddings. Cost is not the obstacle.

### 4.7 Questions retrieval cannot answer are answered anyway

| Question | What came back |
|---|---|
| "How many open tickets does HOGO have right now?" | 4 citations — 2 meetings, 2 arbitrary tickets |
| "Which client has the most tickets?" | 2 passages — one random ticket, one chat message |
| "Which clients have raised concerns about pricing or cost?" | 1 citation, 1 ticket |
| "What are the recurring complaints across our clients?" | REFUSED |

Counting, ranking and "across all X" questions are **not retrieval problems**. Six passages cannot answer "how many", and a system that returns two tickets will have an answer composed from two tickets — confidently, and wrong. This is the most *dangerous* category, because the failure is invisible: it looks like an answer.

You already have the machinery: `query_records`, `list_help_tickets`, `read_activity` and the rest of the MCP catalogue answer these **exactly**. What is missing is the **router** that classifies a question as structured-vs-unstructured and sends it to SQL instead of to the index. This is what separates best-in-class from competent: Dropbox routes through one "super tool" over a unified index; OpenAI's Deep Research runs an explicit `search`→`fetch` loop with `max_tool_calls`.

**Interim mitigation that costs almost nothing:** teach the composer to *decline* to quantify. If the question asks "how many" / "which client has most" and the evidence is passages, the answer should say it can't count from documents and point at the ticket list.

### 4.8 Corpus coverage is narrower than it looks

- **Only 3 Drive folders and 8 Chat spaces are live** — out of 29 team folders and 33 team spaces ever named. 26 Drive folders and 25 spaces are deactivated.
- **All of them were named by one person.** Two of your three Google-connected people contribute **zero** Drive documents and **zero** Chat messages (`cursor: null`, `sources_indexed: 0`).
- **All 81 Drive documents and all 163 Chat messages sit in the `agency` compartment.** No Google material is filed to any client account, even where the Chat space is literally named "FluClinic" or "HOGO". They are still reachable (the router searches account **+** agency together), but client narrowing buys nothing for the richest material.
- **102 Drive documents total** is a small footprint for an agency. If the answer to "why didn't it know that?" is sometimes "that folder was never named", the coverage screen is the fix, not the retriever.

### 4.9 Chunking: defensible, but leaving a documented gain on the table

900 chars ≈ 225 tokens, which is inside the range the best public evidence (Chroma's chunking study) finds optimal — 200–512 tokens, with **200 maximising precision at roughly flat recall**. Zero overlap is also defensible: that study finds overlap *costs* precision and buys little recall. So the basic parameters are fine and the reasoning in the code is sound.

What is missing is **contextual retrieval** — prepending a short generated sentence situating each chunk in its document. Anthropic measured **−35% retrieval failures** from that alone. You tested a *title prefix* and correctly found it neutral, but a title is a much weaker signal than a generated context sentence. Given that your richest material is 88–124-chunk meeting transcripts where chunk 47 has no idea which meeting it is from, this is likely the highest-value ingest-side change.

Conversational data (Chat threads, transcripts) is currently chunked identically to prose — one thread is one ~348-char blob, speakers inline. No vendor publishes conversational chunking, so there is no prior art to lose to, but per-turn or per-topic segmentation with speaker and timestamp carried on every chunk is the obvious direction.

### 4.10 Speed

Measured end-to-end from my laptop over REST: **2.3–4.0 s per retrieval**, before composition. In-worker with bindings will be meaningfully faster, so treat that as an upper bound — but the **shape** of the cost is real and network-independent:

One question makes roughly **7–9 sequential round trips**: 1 embedding → 1 Vectorize query (router) → 1 Vectorize query (chunks) → lexical read → 2 name-arm reads → pool read → neighbour widening → live cross-check. **The D1 reads go over the REST door, not a binding** (per your own architecture note), so each is a full HTTPS call.

Two easy wins:

- **The router's Vectorize query is nearly free to skip.** It produces the explanatory sentence and a rare fallback — it does **not** narrow the chunk search. (The header in `knowledge-vectors.ts` says it does: *"searches `record` first… then searches `chunk` narrowed to them."* That is not what `retrieve()` does. Worth correcting either the code or the comment.) Running it in parallel with the chunk search costs nothing and saves a full round trip.
- **The name arm makes two sequential D1 reads on every question**, including ones naming nobody. It can be folded into one, or skipped when no question term is ≥3 chars.

For reference, Dropbox Dash targets **1–2 s for 95% of queries** end-to-end including generation.

---

## 5. Scorecard against best-in-class

| Dimension | kwapso | Best-in-class | Gap |
|---|---|---|---|
| Tenant isolation | Namespace partition, pre-search | Index-time ACL + query trim | **You are ahead** |
| Permission freshness | Re-read from source of truth every query | Notion ≤1h, Dash periodic | **You are ahead** |
| Embedding model | bge-m3, 1024d, multilingual | e5-large / voyage / OpenAI-3-large | Fine — not the bottleneck |
| Chunk size | 900 chars (~225 tok), no overlap | 200–512 tok; OpenAI ships 800/400 | Fine |
| Chunk context | None | Contextual retrieval (−35% failures) | **Gap** |
| Lexical / hybrid | TF-sum, no IDF, weight 0.1, gated | BM25 + dense, RRF, default-on | **Gap** |
| Reranking | None | Table stakes; biggest single lift | **Gap** |
| Query rewriting | None | Dash: named as a core hard problem | **Gap** |
| Agentic / multi-step | Single shot | Deep Research loop; Dash super-tool | **Gap** |
| Structured questions | Answered from passages | Routed to SQL / tools | **Gap — and unsafe** |
| Ranking signals | Similarity + exact + name | Dash: dozens (recency, affinity, engagement); Slack: pinned/reactions/author affinity | **Gap** |
| Recency | None | Universal | **Gap** |
| De-duplication | Per title only | Content-level | **Gap** |
| Citations | Passage-level with record links | OpenAI: character offsets | Good |
| Refusal honesty | Explicit, measured | Rare | **You are ahead** |
| Evaluation | 22 questions, saturated | Dash: MRR/MAP, LLM-judge, RAG-as-judge | **Gap** |

---

## 6. What I would do, in order

**This week — recovers most of the felt quality:**

1. **Change the shape of the refusal decision** (§3). Absolute floor down to ~0.35 as a pure hallucination guard, plus a relative/gap test. Log every refusal's top-1 score first so you can see the band. *Highest impact of anything here.*
2. **Dedupe on content, not title** (§4.1). Removes ~10% of the index and stops one meeting taking four of six slots.
3. **Fix the account-name router** (§4.2). Require ≥2 tokens or a rare token. "solutions" and "green" must stop hijacking searches.
4. **Keep record mirrors out of `level:"chunk"`** (§4.3). Stops person/account stubs being quoted as evidence.
5. **Refuse to quantify from passages** (§4.7). Cheap guard against the most dangerous failure.

**This month:**

6. **Rebuild the question set before touching the ranking.** 60–100 questions, written by whoever actually uses this, in their own words, **without looking at document titles**. Include paraphrases, German, multi-hop, aggregation, recency and things you genuinely don't hold. Measure recall@6 on that. *Do this before any ranking change, or you will be tuning against a bench that already reports 100%.*
7. **Contextual retrieval on ingest** (§4.9) — a generated context sentence per chunk. The measured −35% is on the table and your transcripts are the ideal case.
8. **Re-test hybrid with real BM25** via D1 FTS5 (§4.4), against the new question set.
9. **Recency gated on intent** (§4.5).

**Next quarter:**

10. **Reranking**, by whichever of the three routes in §4.6 you're comfortable with — including the explicit policy call about text leaving Cloudflare.
11. **A question router** that sends counting/ranking/"across all clients" questions to the MCP tools you already have (§4.7).
12. **Coverage**: get the other two connected people's Drive and Chat in, and review the 26 deactivated folders (§4.8).

---

## 7. Two things worth saying plainly

**The system is not broken.** The retrieval finds the right documents far more often than the answers suggest. In the clearest cases I measured, the correct document was the **number-one nearest neighbour** and the answer was still a refusal. That is a *decision layer* problem sitting on top of a working *retrieval* layer, and it is the cheapest class of problem to fix.

**The bench is the reason this went unnoticed.** It is well-built, it runs against real data with no deploy, and it has an authored answer key — all of which is better practice than most teams manage. It just asks the wrong questions, and a green bench is a powerful thing to believe. Every ranking decision in the code was validated against it, which means the tuning is optimal for title-shaped questions and unmeasured for everything else. Fixing the question set is the change that makes all the other changes measurable.

---

### Appendix — evidence index

| Claim | How it was measured |
|---|---|
| 22/22 bench pass | `node --experimental-transform-types scripts/kb-bench.mjs` |
| Paraphrase refusals | Custom probe through the real `retrieve()`, real Vectorize, real D1 |
| Raw scores vs floor | Direct `bge-m3` embed + Vectorize `topK:20`, floor applied manually |
| 990 duplicate chunks | SQL over `knowledge_chunks` joined on identical `text` |
| 26 single-token accounts | Reproduced `tokenise()` over the live `accounts` table |
| 1,142 chunks < 200 chars | SQL over live chunks |
| Coverage / cursors | `google_sources`, `knowledge_ingest`, `knowledge_sources` |
| Latency | Wall-clock per `retrieve()` call, laptop over REST — upper bound |

External benchmarks drawn from research files in the session scratchpad: `research-rag-sota.md`, `research-products.md`, `research-cloudflare.md`.

---

## Addendum — two findings from research that landed after the report was written

### A1. How to rebuild the question set (§6 step 6), done properly

Recommendation 6 says "rebuild the question set". The evaluation research adds three cautions that change *how*, and they are worth heeding because the failure they describe is exactly the one you already have — a metric that looks authoritative and measures the wrong thing.

- **Do not lean on an LLM judge for the pass/fail.** Measured: a judge flips its verdict on **13.6% of identical repeated evaluations**, 28% of questions exceed a 20% flip rate, and **temperature 0 does not fix it**. Recovering a stable verdict takes ~11 repeats. Two different judge models agree at only κ=0.51. For retrieval, grade on something deterministic — *did the correct source id appear in the top-k* — which is what recall@k is, and which needs no judge at all.
- **If you do use RAGAS or similar, know what its numbers rest on.** RAGAS's headline validation is **50 ChatGPT-generated questions judged by 2 annotators on a pairwise-preference task**. An independent meta-evaluation put RAGAS's best metric at **0.48 Pearson with humans where two humans reach 0.70 — and ROUGE-L reaches 0.43**. These metrics are usable for "did change X help?" (they rank configurations well) and close to meaningless for "is 0.82 good enough to ship?".
- **Correlation with human judgement is not evidence a metric catches the failures you care about.** The GroUSE work built unit tests for seven named generator failure modes and found frameworks with good human correlation still miss them — including RAGAS wrongly penalising faithfulness when a passage contains accurate-but-irrelevant statements. **Write your question set around named failure modes** — paraphrase, aggregation, recency, absence, German, multi-hop, duplicate-source — not around a global score. That is what makes it diagnostic rather than decorative.

**Concretely:** 60–100 questions, each tagged with the failure mode it probes and the source id(s) that answer it, graded by exact id membership in the top-k. That is reproducible, judge-free, and tells you *which* thing broke.

### A2. A risk to watch, not yet a finding — filtered-ANN recall

Your chunk query carries a compound filter: `level` + `compartment IN […]` + `owner IN […]` + sometimes `kind`. Filtered approximate-nearest-neighbour search degrades as the filter gets more selective, and the degradation is **silent** — you get topK results back, they are simply not the nearest. The best public measurement (Qdrant, on unaugmented filtered HNSW): **62.9% recall at 20% selectivity, 20.6% at 10%, and 0.1% at 1%** — total collapse, at full speed, no error.

**Two reasons I am flagging this as a watch item rather than a finding:**

1. **Your index is small** — 9,781 live chunks. At that size the whole thing is close to brute-force territory and graph fragmentation is much less likely to bite.
2. **Cloudflare documents namespace-and-filter-before-search semantics but publishes no recall figures under filtering at any selectivity**, and does not say whether a namespace is a physical partition or an allow-list over one shared graph. That distinction decides whether the above applies to you at all, and it is not answerable from the outside.

**Why it will matter later:** the risk grows with corpus size and with filter selectivity. A per-person `owner` filter is inherently selective, and if the corpus grows an order of magnitude while a single member's private material stays small, that member's own email is exactly the slice most likely to be silently under-retrieved. Cheap test when you want it: run the same query with and without the owner filter against a chunk you know is in the fenced set, and check it still comes back.

*(This does not affect the security argument — R26's re-read-from-D1 fence is about what a caller may **read**, and it holds regardless of ANN recall. This is purely about whether the index finds everything it should.)*
