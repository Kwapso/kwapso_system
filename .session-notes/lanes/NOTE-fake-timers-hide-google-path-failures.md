# A faked clock around a Google path can pass while testing nothing

Found by kb_A, 2026-09-11, while building migration 0082's five-year Google
backfill. Filed here because the hazard is not specific to that migration —
it is a property of this repo's test harness plus the Google lanes, and any
future test that reaches for `vi.useFakeTimers()` around a sweep-google or
meetings-sync call is at risk of it.

## What happened

A test wanted to prove "a backfill walk that has already reached its done
state does not restart when `now` moves days forward" — the regression a
`BACKFILL_DONE`-style sentinel exists to prevent. The first draft wrapped a
real `POST /api/content/knowledge/sync-google` call in
`vi.useFakeTimers()` / `vi.setSystemTime(now + 30 days)`.

It passed. Zero bounded (backfill) calendar calls were recorded — exactly
the expected outcome.

It was checked anyway, by logging the full call array rather than trusting
the assertion, because a green result on a first draft of a new mechanism is
exactly the moment this session's own standing rule says to look harder
("verify the instrument, not just the result"). The call array was **empty
outright** — not "zero backfill calls, some live calls", but zero calls of
ANY kind. The sweep had not merely skipped the backfill; it had failed to
run at all under the faked clock, most likely because some part of the
Google connect/token-expiry path (`access_expires_at` compared against
`Date.now()`, or a sync-lease timestamp) depends on real wall-clock
behaviour that `vi.useFakeTimers()` does not (or cannot) faithfully replay
end-to-end through a full worker request. The exception this produced was
swallowed by `sweepKinds`' own per-kind `catch` (knowledge-ingest.ts) —
the same seam that exists specifically so one bad kind cannot fail a whole
tick — which recorded it as a clean, empty run.

**The test reported that it RAN. It never reported that it CHECKED
anything.** Same shape as the vacuous-census pattern this session has
named several times over (a check whose population is empty or
forced-by-construction passes for the wrong reason) — here the population
was "calls made under a faked clock", and it was empty because the harness
broke, not because the code under test was correct.

## The fix, and why it is better than patching the fake-timer test

Rewrote the test to call the pure function directly instead:

```ts
const now = new Date()
const daysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
expect(risingBackfillWindow(now, { done: true })).toBeNull()
expect(risingBackfillWindow(daysLater, { done: true })).toBeNull()
```

`risingBackfillWindow` (knowledge-google.ts) already took `now: Date` as an
explicit parameter rather than reading the clock itself — a design already
in place for the ordinary reason (determinism, no global state) — which
turned out to also be the reason a clock-dependent regression could be
tested with no clock to fake at all. The function was exported for exactly
this. No worker, no D1, no mocked Google API, no fake timer — and it
mutation-proves cleanly (confirmed: disabling the `done` short-circuit
reddens it immediately).

## The standing hazard for the next person

Any test in this repo that wraps `vi.useFakeTimers()` around a call that
travels through `accessTokenFor`/the Google OAuth token-expiry check, a
sync-lease (`withSyncLease`), or anything else keyed on real wall-clock
comparisons is at risk of the SAME failure mode: the faked clock breaks
something upstream of the thing actually under test, the call silently
returns empty/success, and a per-kind or per-route catch swallows the
resulting exception before it ever reaches the test's own assertions.

**Before trusting a green test that used `vi.useFakeTimers()` on a Google
or scheduled-sync path, log what actually ran** (the mock's own call array,
a spy's call count, an activity-log row) rather than only asserting the
absence of a side effect. An empty "it did nothing" and a correct "it did
nothing" produce identical assertions and require different evidence to
tell apart.

**Prefer testing the pure decision function directly over faking the clock
around the whole pipeline**, wherever one exists (or can reasonably be
pulled out) — it is faster, has no environment to get wrong, and mutation-
proves cleanly. This is not a rule to add a check for; it is a habit to
carry into the next test that reaches for `vi.useFakeTimers()` on this kind
of path.
