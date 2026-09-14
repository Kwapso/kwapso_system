# NOTE — the reader never produces a verdict: `READER_MAX_TOKENS` is too
# small for `kimi-k2.6`'s own reasoning trace

**Lane** `kb_E` · branch `fix/kb-exam-keys` · 2026-09-11. Found while wiring
`--reader` into `scripts/kb-exam-run.mjs` per the hub's assignment (measure
the reader's delta over the plain retrieval score). Not something I can fix
— `READER_MAX_TOKENS` lives in `workers/content/src/lib/knowledge-reader.ts`,
out of this lane's scope — written up for whoever owns that file.

## The headline

`readShortlist()` (the reader) returns `null` on **every single call** I
made against the real corpus, real prompts, real model. Per `retrieve()`'s
own documented design, a `null` verdict is read as **NO EVIDENCE** — so
turning the reader on didn't rescue borderline questions, it made the system
refuse questions that scored cleanly without it. Running the same 35 scored
rows with `--reader`: OVERALL dropped from 26/35 to 7/35, every content tag
(`para`, `latest`, `synth`, `multi`, `person`) collapsed to 0%, and only the
refusal-shaped tags (`absent`, `fence`) held or improved — exactly the
signature of "the judge never actually judges, so everything reads as
unproven."

## Root cause, confirmed by direct instrumentation

I called the real `readShortlist()` (imported straight from
`knowledge-reader.ts`, no stand-in) with a real, obviously-relevant single
passage (`FluClinic: Changing the Stripe Webhook`, the exact keyed source for
A-E1) and logged the raw Workers AI response underneath `cheapAnswer`:

```
finish_reason: "length"
completion_tokens: 200        (== READER_MAX_TOKENS exactly)
message.content: ""
message.reasoning_content: "The user wants me to evaluate a single
  candidate passage for relevance... [200 tokens of chain-of-thought,
  cut off mid-sentence, never reaches the answer]"
```

`@cf/moonshotai/kimi-k2.6` (`READER_TEXT_MODEL`) is emitting an extended
**reasoning trace** (`reasoning_content`, a separate field from `content`)
before it ever gets to the JSON verdict `parseIds()` expects — and
`READER_MAX_TOKENS = 200` is spent entirely on that reasoning, every time,
before a single character of the actual answer is written. `content` comes
back empty, `parseIds("")` fails, `readShortlist` returns `null` exactly as
its own "NULL ON ANY FAILURE" contract says it should for an unparseable
answer — the function is behaving correctly *given what it was handed*; the
budget handed to the model is what's wrong.

I confirmed the shape of the fix (not applying it — out of scope): the same
question against a simplified, non-production prompt returned a clean
`finish_reason: "stop"` with a valid `["<id>"]` answer at `max_tokens: 600`
(212 completion tokens used) and at `1200` (235 used). I did not determine
the minimum with the REAL `readerSystemPrompt()`/`readerUserPrompt()` — only
that 200 is not enough and something in the 600–1200 range comfortably is,
for a one-passage case. A twelve-passage shortlist (`READER_SHORTLIST_CAP`)
will reason about more material and may need more still.

## Why this matters beyond this exam

This isn't a harness artifact — `payToRead`, `consumeAiUnit`,
`requireRight`, `readShortlist`, the real system/user prompts, the real
model: all exercised through the shipped path (`kb-exam-run.mjs --reader`
passes the identical `read` callback shape `GET
/api/content/knowledge/ask?read=1` builds, per the hub's explicit
instruction not to invent a stand-in). **The reader has, as far as this
measurement shows, never once produced a real verdict in this environment.**
Anyone who has turned `read=1` on against this deployment has been getting
"no evidence" for every question that needed the reader to rescue it — the
exact cases BUILD-5 built the reader to fix.

## One caution on the cost figure

`scripts/ai-spend.mjs --days 1` showed no cost increase across this whole
run ($0.0828 before and after). That's very likely because `payToRead`
refunds the AI-unit spend whenever `readShortlist` returns `null`
(`if (!verdict) { refund; return null }`), and `logUsage` — which is what
`ai-spend.mjs` reads — is only ever called on the SUCCESS path. Every real
Workers AI call still ran (real prompt tokens in, up to 200 reasoning tokens
out, on ~28 keyed + 7 refusal rows), and Cloudflare almost certainly billed
neurons for those regardless of the refund, since the refund is an
application-level ledger entry, not a request Cloudflare charges nothing
for. `ai-spend.mjs`'s own header names the real ground truth
(`aiInferenceAdaptiveGroups` account analytics) as the thing to check
instead of its own log-derived number when a run's actual cost is in
question — I did not run that query.
