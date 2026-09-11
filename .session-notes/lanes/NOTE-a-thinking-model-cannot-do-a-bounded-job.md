# A model that thinks out loud cannot do a job with a small answer

**Measured 11 Sep 2026.** The knowledge base's re-reader — one model call whose
entire output is a JSON array of passage ids — has never once worked in
production. Two people, on two different days, diagnosed it as a token budget.
Both were wrong in the same way.

## What the failure looks like

`finish_reason: "length"`, `completion_tokens` exactly at the ceiling, `content`
empty. The reply parses to `null`, and `retrieve()` reads `null` as NO EVIDENCE.
A confident refusal, every time, with nothing in any log saying a model ran out
of room.

## The two wrong fixes, in order

**200 → 1500.** The ceiling was picked without measurement and clipped every
reply mid-reasoning. Raising it was correct and did not work: measured against a
real twelve-passage shortlist, 1500 clips too. The model reaches passage 8 of 12
and stops. 3000 did not return inside 60 seconds.

**"Measure a bigger number."** This is the trap, and it is worth naming because
it is where a whole evening goes. There is no ceiling that fixes it, because the
thing consuming the budget is not the answer — it is `reasoning_content`, which
`@cf/moonshotai/kimi-k2.6` emits BEFORE `content` and bills against the SAME
`max_tokens`. The output being small is not a reason the job is cheap. It is the
reason the job is impossible for this model: the whole budget is spent on
deliberation that is thrown away, and the caller pays for a reply it never gets.

## The actual answer

Ask a model that does not think out loud. Same shipped prompt, same real
shortlists off staging:

```
question                                  kimi-k2.6            llama-4-scout
chemist reimbursed for a jab (A-O1)       NULL   32,636ms      2 ids  1,243ms
Asekurans extraction transcript (A-O2)    NULL   36,396ms      2 ids  1,906ms
what is happening with Paddlebase (A-O5)  NULL   34,503ms      5 ids  2,833ms
who organises our monthly get-together    2 ids  30,380ms      2 ids  1,576ms
```

**The last row is the whole argument.** It is the only question the reasoning
model finished, and both models returned the IDENTICAL ids in the identical
order. So this is not a cheap model doing a worse job. Where the two can be
compared at all it is the SAME judgment, twenty times faster, and on three
questions of four it is the only one that produces a judgment.

## How it got chosen, and the sentence to distrust

`READER_TEXT_MODEL`'s own comment: *"a shortlist judgment is a harder read than a
one-paragraph write."* Plausible, never tested, and load-bearing for months. It
reads like a measurement and is an intuition — the same shape as `READER_MAX_TOKENS
= 200`, which was also a number somebody felt.

## The rule

**A job whose OUTPUT is small and bounded — ids, a label, a yes/no, a JSON
array — should default to a model that does not emit chain-of-thought.** "Harder
judgment" is not a reason to reach for a reasoning model when the ceiling that
model needs is set by its deliberation rather than by its answer.

And the structural half, which is why this took two days to find: **a model
choice written as a constant with an argument in a comment cannot be refuted.**
`kb-bench.mjs` has let anyone re-measure the WRITER's model since the day it
shipped (`KB_COMPOSE_MODEL`), and the writer's model has never been a mystery.
The reader's was a constant, so the only way to question it was to read the
comment and believe it. `KNOWLEDGE_READER_MODEL` and
`KNOWLEDGE_READER_MAX_TOKENS` exist now for that reason and for no other — they
change no default.

## Related

- [[NOTE-a-mock-cannot-fail-the-way-the-real-thing-fails]] — the reader's
  "proved end to end" test injected a hand-written callback and never called a
  model at all, which is why none of this surfaced from the suite.
- The spend meter could not have caught it either: `payToRead` calls `logUsage`
  without the `tokens` argument, so every one of these 30-second, budget-
  exhausting calls priced as $0.
