# NOTE — A-H1 crashed `retrieve()` with a real SQLite compound-SELECT error

**Lane** `kb_E` · branch `fix/kb-exam-keys` · 2026-09-11. Hub independently
reproduced the same error by hand against the same database and asked for
this write-up; not something I'm asked to fix (`workers/content` is out of
this lane's scope).

## The row and the exact error

- **Row:** `A-H1` — "Across all clients, what did we ship in the first week
  of September?" (tags `synth, latest`), keyed to two `knowledge_sources.id`
  values (`01M27GYXDYVR1S6QTEBSYJT1BN`, `01M27GZ5073K9NRVV33QAZ8NZ3`).
- **Run:** `node --experimental-transform-types scripts/kb-exam-run.mjs
  --verbose`, retrieval-only, against `kwapso-knowledge-staging`
  post-rebuild, asking as the owner (the harness's default guard).
- **Exact error, caught by the loop's own try/catch (nothing else in that
  run failed this way — 100 other rows ran clean):**
  ```
  Error: Cloudflare D1 API failed: too many terms in compound SELECT: SQLITE_ERROR
  ```

## What I could and couldn't pin down

I don't have the runtime term/branch count for this specific call — I
didn't instrument the crash site before it threw, and re-running just to
capture that would cost another retrieve() for no diagnostic gain the hub's
own reproduction hasn't already covered. What I *can* say from reading the
source (not running anything further):

`workers/content/src/lib/knowledge.ts` has exactly **one** query in the
whole file built as a true compound SELECT (`UNION ALL` joining separate
`SELECT` statements, which is what SQLite's "too many terms in a compound
SELECT" error is about — distinct from its "too many SQL variables" error,
which is what an oversized `IN (...)` list would throw instead, and which is
not the error we got):

- `lexicalArm` (~line 3087): `terms.map(() => 'SELECT ... FROM
  knowledge_chunks_fts WHERE knowledge_chunks_fts MATCH ?').join(" UNION
  ALL ")` — **one UNION-ALL branch per question term**, and `terms` comes
  from `questionTerms(question, MAX_QUESTION_TERMS)` with `MAX_QUESTION_TERMS
  = 24` (line 407) — a hard cap, so this can never emit more than 24
  branches.

The function's own comment (~line 3029) budgets against a *different* D1
ceiling — bound parameters ("about 76 against D1's ceiling of 100") — and
never mentions a compound-SELECT term ceiling at all. Vanilla SQLite's stock
default for that limit is 500, which 24 branches wouldn't come close to. But
the error we got is real, on this exact database, so one of two things is
true and I can't tell which from the source alone:

1. **D1 enforces a stricter compound-SELECT term limit than SQLite's own
   default** (plausibly well under 24), and `MAX_QUESTION_TERMS` was tuned
   against the wrong ceiling — the parameter budget, not this one.
2. **Something upstream of `lexicalArm` hands it more than 24 terms** for a
   richly-worded, multi-topic question like A-H1's (a `synth` row asking
   about "all clients" across "the first week of September") — i.e.
   `questionTerms`'s own cap isn't actually being respected in some path.

Either way, this is the only `UNION ALL` in the file, A-H1 is exactly the
kind of question (synthesizing, many distinct topic words) that would push
term count toward whatever the real cap turns out to be, and the hub's own
independent reproduction on staging confirms it isn't specific to this
harness's guard or my keys.
