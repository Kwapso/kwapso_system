# REPORT — `gate-exam` and `e-refusals`, night of 2026-09-11

**Lane** `kb_E` · branch `fix/kb-exam-keys` · rebased onto `main` after
tonight's reader-model default flip (`READER_TEXT_MODEL = CHEAP_TEXT_MODEL`)
and the outage-fallback fix, both verified present in source before this
run.

## The number, as measured, with its caveat attached

```
41 row(s) skipped — not yet keyed. 46/101 scored.
OVERALL   29/46

REFUSAL CEILING (tracker item e-refusals, must be 100%): 6/7
  FAIL — refusal ceiling breached: 1/7 refusal row(s) failed — A-X6
```

**This number is not clean, and the reason is not in the code.** Partway
through this run the team's AI allowance hit its daily ceiling —
`getQuota()` read directly, not estimated: `freeDaily:25, freeUsedToday:25,
freeRemaining:0, creditBalance:0, remaining:0, blocked:true`. From that
point on, every `payToRead` call failed at `consumeAiUnit` before the model
was ever asked anything, and — per the outage-fallback fix landed earlier
tonight — a failed reader call narrows to the strict floor rather than
refusing outright. So an unknown tail of this run's 46 scored rows reflects
**quota-exhausted fallback, not real llama judgment**, and there is no way
to tell which rows those are after the fact without re-running against a
model that has no allowance left to run against, tonight, at any price.

**`e-refusals` is not 100%, and this failure predates the quota running
out.** A-X6 ("What is the capital of France?") — solid on every prior run
tonight — answered `found=true`, citing an unrelated FluClinic transcript
(`01M27EV46Z3ZQA458ZZJ0NR7AT`). Its own refusal-log entries put its top-1
score at 0.335, well inside the reader's widened floor
(`READER_HALLUCINATION_FLOOR`, 0.3 at the time of this run) — the guard
that widened floor was supposed to be was not narrow enough once the
reader became a model that actually finishes a reply and looks at what it
was handed.

## What changed in this same commit, and why

- **A-O1, A-O2** (both `MANDATORY_CANARIES`) keyed for the first time — see
  `.plans/KB-EXAM-UNION.md`'s own detail column for each: A-O2 to an
  exact title+date+chunk-count match; A-O1 to weaker evidence, flagged
  in its own detail as a lower-confidence key, after the two ticket ids
  proposed for it turned out to be about email-delivery mechanics rather
  than the reimbursement process the row actually asks about.
- **A-M6** moved from `gap` to `keyed` — the union's own detail column
  now carries why: the rebuild produced a real, chunked transcript for
  the meeting B's file had marked as left out, so the row's premise (no
  transcript exists) stopped being true. Same shape of correction as
  A-H13's earlier this week, found the other direction (content
  appearing rather than a false gap being asserted).
- Eight more rows keyed by the same exact-chunk-count method as before,
  with a punctuation-tolerant fallback search added (en-dashes and
  colon-spacing variants had been silently defeating the earlier exact
  `LIKE` match): A-O6, A-H14, A-E3, A-E11, A-M4, A-M9, plus a second
  source added to A-H13 (pt 1 of the recruiter's maths now has a real
  transcript too — 12 chunks — where "THIN EVIDENCE" originally said it
  did not).

Structural baseline (`scripts/kb-exam-baseline.json`) updated to match:
`keyed` 73→74, `gap` 7→6, `mustScore100` drops `A-M6`. Both tests that
pinned the old counts, and the two dedicated `A-H13`/`A-M6` disposition
tests, updated to match.

## What is still open

- 41 of 101 rows remain unkeyed (`latest`, `synth`, `multi` — the three
  tags named as highest priority — were not fully swept; time ran out
  before the AI allowance did).
- `A-X6`'s regression needs a real fix, not just this report — a
  hub-side branch (`fix/kb-reader-floor-refuses-noise`, raising the
  hallucination floor 0.3→0.4) was described but not present in the
  shared local ref as of this report; not verified, not applied here.
- No further reader-enabled measurement is possible tonight: zero free
  units, zero purchased credits.
