# The recency arm's window starved the account side, and the answer still looked plausible

Found by kb_A, 12 Sep 2026, diagnosing why the exam's `synth`/`latest` tags scored
20%/38% (tracker: kb tag-diagnosis). Fixed same day, `fix/kb-recency-arm-topical-fusion`
(merged to main as `d64efe5a`). Filed here because the evidence — and the shape of the
bug — outlives the one commit that fixed it.

## The defect, in the words a person would use

Ask "what's the latest on HOGO?" and the base answered with this morning's Google Chat
sync mirrors — generic "HOGO — Alaap, Aurora" attendee-list stub records — instead of
HOGO's own material. Ask the same shape of question about Padelbase and you got the
*same* wrong answer, mirrored: this morning's chatter again, not Padelbase's. Nobody
would have filed either as a bug, because the answer *looked* like a real one — it named
the right client, it was recent, it had citations. It was simply never the material the
question actually wanted.

## The mechanism

A client-named question searches `[account:X, agency]` together
(`deriveCompartment`'s own comment: "I searched X's material and the agency's own").
`recencyArm` (`workers/content/src/lib/knowledge.ts`) took its `RECENCY_TOP_K` (8)
newest sources **over that union**, with no per-compartment split. `agency` is shared by
*every* client-named question, and it carries far more day-to-day traffic (chat syncs,
attendee mirrors) than any one client's own material — so it filled the entire 8-row
window before the account side ever got a turn.

**The proof that made it undeniable** — the query the hub asked to be preserved, because
it is the kind of evidence that should survive the chat it was found in:

```sql
-- newest 8 across [account:HOGO, agency]
-- newest 8 across [account:Padelbase, agency]
```

Both queries, run against the same staging database at the same moment, returned **the
identical eight rows** — every one from `agency`, every one dated the same day. Two
different clients, two different questions, one shared bottleneck: whichever compartment
carries the most traffic wins the entire recency window, regardless of which client the
question actually named. This is not a ranking flaw (a floor, a weight, a diversify
pass) — it is a **starvation** one: the account-specific side of the search was never in
the running at all, structurally, before a single relevance score was computed.

## Two things this is *not*, ruled out before the fix, not assumed

- **Not fixed by more chunks per source.** The first hypothesis (a source's opening
  chunk being a poor representative of its own newest content) was built, measured, and
  thrown away in that order — it had zero effect on either failing exam row, because the
  keyed sources weren't in the candidate window at all; giving them more chunks changed
  nothing. A change with no measured effect does not earn its place. (This project's own
  standing rule: "too much code is a defect," including code that is defensible in
  principle and inert in practice.)
- **Not the exam's own instrument being wrong.** The hub's own first read of the fix
  found *no* difference between main and the branch — a genuinely alarming result, since
  it would have meant the fix did nothing a person could see. Traced to the hub's
  comparison script (`routeprobe.mjs`) hardcoding its repo path rather than reading the
  `KB_REPO` override the newer probe (`twopass.mjs`) already had — so both of its "before"
  and "after" runs loaded the same, unfixed `knowledge.ts`, and it compared the code with
  itself. Caught by re-running the exact same two questions against both trees directly,
  with commit hashes attached and the fix's own comment string confirmed present in one
  tree and absent in the other. The general lesson, already this session's own standing
  one (`NOTE-a-mock-cannot-fail-the-way-the-real-thing-fails.md`): before trusting an
  instrument's "no difference" result, ask what it would show if the thing being compared
  really did differ — and check that the instrument is actually pointed at both things.

## The fix, and what is still open

`recencyArm` now takes `RECENCY_TOP_K` newest **per compartment searched**, never a cap
moved to cover their union — so the account side always gets its own share of the window
regardless of how much `agency` traffic exists alongside it. Mutation-proven (a fixture
with a client's own older material plus nine fresher, unrelated `agency` sources; the old
union query starves the client's material out, the split keeps it).

**Two exam rows (A-O3, A-H14) are still open**, and they are a *different* problem from
the one this fix closes: their keyed material is itself filed under `agency` (not the
named client's own account), and `agency`'s own volume — not starvation — is what an
eight-row recency window cannot reach three to four weeks back, split or not. Confirmed
by querying `agency` in complete isolation: the same eight today-dated rows come back
either way. Whether that needs a wider window for `agency` specifically, a different
retrieval strategy for agency-filed material, or something else entirely was not opened
the night this was found — it is a real, harder, and separate question for whoever picks
it up next.

## Addendum, same night: a gentler vote was tried on A-H14, and thrown away

A-H14 ("what's the newest thing we know about Padelbase's workflows") looked like the
kind of row a gate might fix without a wider window: `fuse()` was changed so recency
only contributes a candidate's score if that same candidate also appears in the vector
or lexical arm's own list (`fix/kb-recency-fuses-with-relevance`, never merged, never
committed past a working-tree diff on `knowledge.ts`). The hub authorised it for A-H14
specifically. It was reverted the same night, and the reasoning is worth keeping because
the row itself is closed but the underlying question is not:

- **It didn't do the job it was authorised for.** A-H14 didn't flip. Traced to why: the
  wrong winners that beat the real answer today pass the new gate on their own merits —
  they're already relevant by vector/lexical score, recency was never their only
  credential — and the *right* source for A-H14 lives in `agency` and never reaches that
  compartment's own recency top-8 in the first place, gate or no gate. The fix addressed
  a vote recency wasn't the deciding factor in.
- **It bought nothing measured.** 36/47, `byTag` identical to the digit, before and after.
- **It cost a documented guarantee for nothing in return.** Two tests encode KB-AUDIT
  §4.5's canonical case — a recency question recovering a source that shares *zero*
  vocabulary with the question, which is the entire reason the recency arm exists as a
  separate arm rather than leaning on vector/lexical alone. Gating recency's vote on
  vector/lexical agreement is a direct, structural conflict with that guarantee: the
  fixture the tests use (older client material, fresher unrelated `agency` traffic, and a
  question with no shared words) is exactly the shape the gate would now refuse to
  surface. Updating the tests to match the new code was the wrong move here — it would
  have quietly deleted the guarantee rather than admitted the trade-off.
- **The actual finding survives the revert.** A separate experiment (recency arm removed
  entirely from the fused result) *did* surface the right document for A-H14's question
  shape. So the honest statement isn't "the vote needs to be gentler" — it's that **the
  recency arm actively harms this specific question class** (a client-named "what's
  newest" question whose real answer lives in a compartment the recency arm's own window
  can't reach), and the open question is not how recency should vote once it's in the
  race, but **whether it should be entered into this race at all** for a question shaped
  like A-H14/A-O3. That is a bigger design question than a fusion tweak, and it sits
  beside the still-open "agency volume" problem two sections up — they may turn out to be
  the same question asked two ways.
