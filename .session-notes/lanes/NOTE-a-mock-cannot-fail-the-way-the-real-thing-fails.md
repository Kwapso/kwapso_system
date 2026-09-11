# A mock cannot fail the way the thing it replaces fails

Found by kb_A, 2026-09-11, while chasing the reader token-budget bug
(kb-reader-token-budget). Filed here because it generalises well past that one
bug — it is a property of how this repo tests every call to an outside
service, and the hub's own words are the header this note keeps: *"a mock
cannot fail the way the thing it replaces fails, so an integration test built
on one proves the integration and never the boundary."*

**A second instance below (kb_CD, same day) widens the claim.** kb_A's finding
is about a mock that stands in for a call it cannot faithfully reproduce —
this repo's own second instance is about a FIXTURE NUMBER seeded to be
"clearly" on the right side of a threshold rather than measured against the
real one. Different mechanism, same shape: a test that can only ever pass,
built without noticing, and a green tick standing in for a measurement
nobody took.

## Instance 1 — the reader's "proved end to end" test

## What happened

`READER_MAX_TOKENS` was set to 200, picked without measurement. In production
this truncated every real call to `@cf/moonshotai/kimi-k2.6` mid-reasoning —
the model emits an extended `reasoning_content` BEFORE its short id-list
answer, billed against the same ceiling — and collapsed the exam's `para`
category 81%→0%. It shipped and stayed green under `npm run check` for weeks.

It stayed invisible because **nothing in the repo ever called the real
model for this path.** `knowledge-reader.test.ts` fully mocks `env.AI.run`
via a `fakeAi()` helper that returns a hardcoded string instantly — no token
budget, no `reasoning_content`, no way to be truncated. The one test the
hub's own handoff notes called "proved end to end" —
`knowledge.test.ts`'s "the reader recovers a paraphrase..." describe block —
injects a hand-written `read` callback straight into `retrieve()`, bypassing
`readShortlist`/`cheapAnswer` entirely; its own comment says why ("`read` is
a function and cannot cross that boundary — the door wiring is a separate,
not-yet-built piece"). Both tests proved something real — prompt
construction and defensive parsing in one case, `retrieve()`'s floor/verdict
integration in the other — and **neither could have caught this bug**,
because the bug lives in exactly the seam each one replaced with a
stand-in. Two hypotheses were on the table ("a narrower prompt that used to
fit" vs. "the model changed under us") and neither was right: it never
worked, and nothing ever looked.

The fix pairs a cheap always-on guard (`READER_MAX_TOKENS` pinned above a
measured floor, catches the regression most likely to recur — someone
"optimising" the ceiling back down) with an expensive, explicitly-flagged
real-model test (`RUN_REAL_READER_TEST=1`, ~$0.003-0.005/run) that is the
only thing in the repo that can actually see a truncation. Neither alone is
enough: the cheap one can't tell if its floor is still right, the expensive
one can't run on every save.

## The standing hazard for the next person

A survey of the rest of the codebase for the SAME shape — a real external
call mocked in EVERY test that reaches it, with no real-call test anywhere
as a backstop — found (at minimum) these four, ranked by how closely they
match the confirmed bug:

1. **`contextLineFor`** (`workers/content/src/lib/source-readers.ts`,
   `llama-4-scout-17b-16e-instruct`) — the closest sibling. Mocked via a
   plain `vi.fn()` stand-in in `source-readers.test.ts` and again by hand in
   `knowledge-context-line.test.ts`; no real-call test exists. Same shape of
   risk: a completion-length assumption (`CONTEXT_LINE_MAX_CHARS`, a
   timeout) never exercised against a real reply.
2. **The writer/composer** (`writeAnswer` → `cheapAnswer`, also
   `llama-4-scout`, R23's cited-answer seam) — mocked via the same
   `fakeAi()`-shaped helper in `knowledge-answer.test.ts`. Lower-risk only
   because `ANSWER_MAX_TOKENS=900` is more generous than the reader's old
   200, not because the seam is covered.
3. **Resend email** (`workers/auth/src/lib/email.ts`, `api.resend.com`) —
   `fetch` stubbed in every auth test that reaches it
   (`email-names-its-failure.test.ts`, `silent-failures.test.ts`,
   `email-change-throttle.test.ts`); no test anywhere calls the real API. A
   changed error-body shape or rate-limit response would be invisible.
4. **Google APIs** (`workers/content/src/lib/google-api.ts` — Drive, Gmail,
   Calendar, Chat, People) — ~20 test files, every one mocking either
   `fetch` directly or the whole module. No test anywhere touches a real
   Google account or a live `googleapis.com` call.

(Cloudflare Vectorize came up too, but its fake — `fake-vectorize.ts` —
already says so in its own header: "ANN recall is left to be measured
against the real service." A self-documented gap is a different, better
kind of gap than a silent one; it is named here for completeness, not as a
new finding.)

**None of these are "go mock less."** Most of these mocks are correct and
necessary — a unit test should not make a billed network call by default.
The lesson is narrower: **for a call whose real-world behaviour (a
truncation ceiling, a rate limit, a response shape, a field that does not
mean what the code assumes) can plausibly diverge from what the mock
assumes, the mock needs a real-call backstop somewhere** — even one gated
behind an explicit flag and never run by `npm run check`, the way
`knowledge-reader-real-model.test.ts` now is for the reader. The absence of
that backstop is not visible from reading any single test file; it is only
visible from asking, for a given external seam, "has anything, anywhere,
ever actually called the real thing?" — and that question is worth asking
again the next time a model-shaped bug (a truncation, a schema change, a
rate limit) is hard to explain from the mocked tests alone.

## Instance 2 — c-hijack's fixture, seeded above the wrong ceiling

Found by kb_CD, 2026-09-11, while re-measuring c-hijack after it had already
been ticked fixed once and staging was still hijacking on both of KB-AUDIT
§4.2's own proof questions.

`the account router is not hijacked by a name that is also an ordinary
word (§4.2)`'s own test (`workers/content/test/knowledge.test.ts`) seeded
"solutions" at 120 filler chunks to prove the rarity gate refuses an
ordinary word. 120 was picked to be clearly over `EXACT_TERM_MAX_CHUNKS`
(100) — the ceiling the code compared against, reused from a different
population (digit-bearing reference terms like ticket numbers and years)
and never validated against ordinary account-name words. Staging's REAL
count for "solutions" was 79 — UNDER that same ceiling. So the test's own
fixture sat on the safe side of a line the real corpus sat on the wrong
side of, by construction, before a single assertion ran. The test could
only ever have gone green. It did, the row was ticked fixed, and the base
kept hijacking on the exact two questions the audit named.

No mock involved this time — the fixture was a real SQLite table, queried
for real. The shape is still the same one instance 1 names: a number
chosen to be "clearly" on the right side of whatever the code currently
checks against, rather than measured against what the real system actually
produces. Fixed by re-measuring the real distribution (26 real accounts,
their real corpus counts — `ACCOUNT_TOKEN_MAX_CHUNKS`'s own header in
`workers/content/src/lib/knowledge.ts` has the full table) and reseeding
every fixture at the REAL number, not a round one chosen for convenience.

## The shape, stated once, across both instances

A fixture — mocked or seeded — that is easier to satisfy than the real case
it stands in for is not a smaller version of the real test, it is a
different, weaker claim wearing the real test's name. The tell in both
instances: the number (120 filler chunks; an injected callback standing in
for a real model call) was picked for convenience or to "clearly"
demonstrate the shape, never measured against what the real system actually
does. **Measure the real value first, seed or mock at that number, and only
then decide whether the mechanism holds.**

Before trusting a test that mocks a call or seeds a threshold, ask:

- Is the seeded/injected value MEASURED against the real system, or picked
  to be "clearly" on the right side of whatever number the code currently
  uses?
- If the real ceiling or the real call's behaviour ever moves, does the
  fixture move with it, or does it sit at a fixed distance that could land
  on the wrong side silently?
- Would this test have gone red on the ACTUAL bug, run against the ACTUAL
  measured data or the actual real call, before the fix — not just on a
  constructed worst case?
