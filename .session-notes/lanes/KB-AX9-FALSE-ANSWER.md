# A-X9 — the invented dinner answer, root-caused

kb_review, 11 Sep 2026. Branch `review-ax9-false-answer` (no commits — read-only reproduction
against real staging data, plus a temporary instrumentation edit to `knowledge.ts` that was
reverted immediately after capture; `git diff --stat` is empty at the time of writing this).
Retrieval-only throughout: `compose` and `read` both omitted from the `retrieve()` call, exactly
matching how `kb-exam-run.mjs` runs every non-`--full-loop` row. The only spend was one embedding
call for the question, explicitly authorized for this task.

## The verdict, in one line

**This is a retrieval bug, not a composition bug, and it is a different mechanism from the
reader-floor widening — not the same dial.** The lexical arm's "a rare exact token bypasses the
term-share floor" rule (built for ticket numbers and invoice codes) treated the ordinal date
fragment `"14th"` as strong evidence because it is statistically rare in this corpus (6 chunks
team-wide, against a 100-chunk ceiling) — but statistical rarity is not semantic specificity, and
an ordinal day-of-month is exactly the kind of token that is rare by chance, not by meaning.

## Reproduced, with the real pipeline, real data, real numbers

Asked as `alaap@kwapso.com` (the default reader `kb-exam-run.mjs` resolves for any row with no
persona override — A-X9 has none) exactly A-X9's question: *"What did Alaap discuss at dinner on
the 14th?"*

```
terms:      ["14th", "discuss", "dinner", "alaap"]
exactTerms: ["14th"]                                    — the only digit-bearing term
top1Score:  0.46628729   floor: 0.5   hits: 100   vector(post-floor): 0
```

The vector arm did exactly what it should: 100 raw neighbours, every one of them below
`MIN_VECTOR_SCORE` (0.5), so it correctly reported "nothing in the base is about this" — a
private dinner with no transcript genuinely has no semantic match. `role` became `"overruling"`
(the vector arm looked and found nothing), which is the strictest of the three lexical roles:
`termFloor` demands `Math.ceil(4 × 0.75) = 3` of the question's 4 terms present in one chunk,
UNLESS the chunk carries a rare exact token, in which case the floor is bypassed entirely
(`knowledge.ts`'s own `lexicalArm`, the `HAVING hits >= termFloor(...) OR exact > 0` clause).

**All 6 lexical-arm candidates came back with `exact: 1` — every single one admitted by the
bypass, none by clearing the 3-of-4 share.** None of them contain "dinner." Reading the actual
chunk text pulled back:

```
"...Alaap Kanchwala: I just want to give you a little bit of insight as to what will happen.
So by the 14th and 16th of September, one more proj..."          — FluClinic: Sync up
```

That is a project-deadline mention in an unrelated client sync meeting. The literal token
`"14th"` is there; nothing else about the question is. I checked how many chunks in the whole
team's corpus contain that exact token: **6**, against `EXACT_TERM_MAX_CHUNKS`'s ceiling of 100 —
comfortably "rare" by the code's own measure, and therefore, under the current rule, comfortably
"exact evidence."

Fused, ranked, and read back through the real fence (`readerClause`, all 6 candidates cleared
it — nothing here is a fence problem), the final answer:

```
found: true
reason: "The question named no client, so I searched the whole knowledge base."
candidates: 6
citations: Rest-o — Ishita Goyal · 🧭 Jourfix 2026/09/04 · FluClinic: Sync up ·
           Padelbase: Sync up 2026/09/04
```

Exactly what kb_E captured. Reproduced outside any harness, with the shipped, unmodified
`retrieve()`.

## Answering the hub's four questions directly

**1. Reproduced, with compose=0 (free).** Numbers above. Nothing cleared the vector floor;
6 lexical candidates came through, all via the exact-term bypass.

**2. Where the honest-refusal decision is made, and what it actually tests.** `knowledgeAnswer`
(R23's one seam) computes `found = citations.length > 0` — it is not itself a threshold, it is a
mirror of whether `retrieve()` handed it any passages at all. The REAL decision that let this
through is upstream, in `lexicalArm`'s SQL: `HAVING hits >= termFloor(terms.length, role) OR
exact > 0`. It said yes here because the OR's second branch fired for every candidate — the rare
exact token `"14th"`, not the term-share requirement `"overruling"` is supposed to enforce.

**3. Retrieval, not composition — evidence, not inference.** No `compose` callback was ever
passed to `retrieve()` in this reproduction (matching how the real exam ran, retrieval-only), and
the four distinct, real sourceIds were already in `answer.citations` before any writer could have
touched them. A composition step downstream could only have made this WORSE (turning four
unrelated passages into confident prose) — it did not create the four unrelated passages. The bug
is entirely retrieval's: it selected and returned genuinely unrelated material as if it were
evidence.

**4. Not the same dial as the reader-floor widening — checked directly, not inferred.**
`kb-exam-run.mjs` never passes a `read` callback to `retrieve()`, in either its default mode or
`--full-loop` (I read the file: `--full-loop` only adds `compose`, never `read`). So
`input.read` was falsy for this exam row regardless of which mode produced the original failure,
which means `floor` in this call was always `numberVar(env.KNOWLEDGE_MIN_SCORE, MIN_VECTOR_SCORE)`
— the ORIGINAL, un-widened floor, confirmed at 0.5 in the trace above, never
`KNOWLEDGE_READER_MIN_SCORE`/`READER_HALLUCINATION_FLOOR`. The mechanism responsible
(`lexicalArm`'s `exact > 0` bypass, gated by `EXACT_TERM_MAX_CHUNKS`) is a completely different,
independent control from the reader-floor change, and it predates this rebuild's paraphrase-recall
work — it is the same bypass the code's own comments describe being built FOR ticket references
("3144") and invoice numbers, which are genuinely unambiguous identifiers when present. **The
owner should not read this as the cost of the paraphrase fix.** It is a separate, narrower,
independently fixable gap: the bypass's definition of "exact" conflates statistical rarity
(`COUNT(*) <= 100`) with semantic specificity, and an ordinal date fragment is the textbook case
where those two come apart — genuinely rare in a corpus (nobody writes "14th" often), genuinely
near-meaningless on its own.

## What I did not do, per the standing rule

I did not touch `lexicalArm`, `EXACT_TERM_MAX_CHUNKS`, `exactTerms`, or any other production code
beyond the temporary, fully-reverted trace `console.error` calls used to capture the numbers
above (removed before this report was written; `git diff --stat` on `knowledge.ts` is empty). No
fix proposed or applied — report only, per the assignment.

## UPDATE, 11 Sep 2026 — fixed, on the hub's explicit instruction

The hub reviewed the above and directed a fix, in three steps: size the class first, protect the
`c-exact` identifier-lookup case before touching anything, then propose (not unilaterally pick) a
discriminator. Branch `review-ax9-false-answer` @ `77d491dd`, pushed. All three steps done, in
order, below.

### Step 1 — sizing it: a whole class, not one unlucky token

Read every chunk's text (9,325 chunks, all of them) off staging, read-only, and tokenised it with
the real, imported `tokenise()` — no FTS5 vocab table created (that would be schema DDL against
staging; avoided). Of the digit-bearing tokens sitting under `EXACT_TERM_MAX_CHUNKS` (100):

- **31 ordinal-day tokens** — every one of "1st" through "31st" that appears at all, all under the
  ceiling (the most common, "1st", tops out at 19 chunks).
- **19 bare years** in active use (2013–2032, plus two outliers).
- **13 times-of-day** ("11am" through "45pm"-shaped).
- ~2,449 letter+digit "identifier-shaped" tokens, mostly transcript-formatting artifacts
  (`t0271`, `b0036`) rather than real business identifiers — not touched by this fix, flagged
  here only because my own shape-based classifier bucketed them as identifier-like without
  verifying they're ever actually searched for.
- 531 bare multi-digit numbers plausibly ticket/invoice-shaped (`3154`, `710778`) — the class the
  bypass exists to protect.

**Answer: a whole class** — 31 + 19 + 13 = 63 tokens sharing the exact failure shape "14th" showed,
before counting the noisier "month+day glued" bucket (80 items, many transcript-timestamp noise) I
did not attempt to classify cleanly.

### Step 2 — protecting `c-exact` first, and finding a real problem with the proposed discriminator

Before writing anything for A-X9, I checked the hub's proposed fix (bypass requires co-occurrence
with ≥1 other question term, `hits >= 2` unless the question is genuinely single-term) against the
existing `c-exact` fixtures — and it fails one of them. **"task 3144" (2 terms: "task", "3144")
targets a source whose entire body is "3144 is pending gravity forms confirmation." — the word
"task" never appears in it.** Under the proposed rule this is not a single-term question, so it
would need `hits >= 2` (both terms present) — but the chunk only ever contained "3144". The
existing test `"and the bare reference still works, which is the case that never broke"` would have
gone from green to red under the literal proposal.

**A second, independent problem, found by re-reading the actual A-X9 trace rather than assuming
the fix would work:** four of the six passages that caused A-X9 visibly contain the token "alaap"
in their own preview text — not because they are about Alaap, but because a Gemini transcript
prefixes every line with its speaker's name ("Alaap Kanchwala: ..."). The question asked about
"Alaap," so "alaap" IS one of its terms — meaning a co-occurrence rule would likely have been
satisfied by most or all of the six candidates anyway, fixing nothing. Co-occurrence is defeated by
any question that names a frequent transcript speaker, which "who discussed X" questions do by
construction.

**Reported both problems rather than implementing the proposal as given** (per "if it breaks a real
exact-lookup case, say so and propose something better"), and proposed instead: exclude
calendar-arithmetic-shaped tokens (ordinal days, bare years, times-of-day) from the bypass's rare-
token set entirely, rather than requiring co-occurrence. `isCalendarFragment()` in
`workers/content/src/lib/knowledge.ts`. This targets the actual defect (statistical rarity being
treated as semantic specificity) without touching genuine identifiers, which match none of the
three shapes and are provably untouched (see mutation-proof below).

### Step 3 — implemented, and mutation-proven in both directions

Two new tests in `knowledge.test.ts`, inside the existing `c-exact` describe block:
- `"a genuine reference still waives the floor alone, exactly as before"` — re-asserts the
  original `c-exact` claim at the exact boundary the fix touches.
- `"a bare ordinal day does not waive the floor, even naming a real colleague"` — the actual
  regression, reproduced as a minimal fixture (a real colleague's name prefixing an unrelated
  sentence that happens to mention a day of the month), rather than only against live staging data.

Mutation-proved both ways:
- Reverted the exclusion (`rare = exact.filter(t => terms.includes(t))`, dropping
  `&& !isCalendarFragment(t)`) → the new regression test went RED, reproducing the exact reported
  failure.
- Broadened `isCalendarFragment` to also match any bare number (`/^\d+$/`) → **6 existing
  identifier-lookup tests went RED**, including `c-exact`'s own "task 3144" tests — proof the fix
  is narrow enough to matter and that over-reaching it breaks something real, not hypothetical.
- Restored the correct fix: full content-worker suite green, **1471/1474 passing** (up from the
  1432 baseline by the tests this touches), `npm run check` exit 0 with real counts across every
  workspace.

Pushed to `origin/review-ax9-false-answer`, not merged — yours to merge.

## One narrow, not-fully-explored edge worth naming

I have not checked whether OTHER short, common-but-rare digit-bearing tokens (other ordinal days,
short years, small counts) share this same exposure across the corpus — I checked exactly the one
token this question actually exercised. If the owner wants the blast radius sized before deciding
whether/how to change the bypass's rarity test, that is a natural, cheap follow-up: count how many
distinct digit-bearing tokens sit under the 100-chunk ceiling and eyeball how many of them are
"identifier-shaped" (ticket numbers, invoice codes) versus "date-fragment-shaped" (bare ordinals,
day/month numbers) — I did not do this because it wasn't asked for and would have meant reading a
lot more of the corpus than this one question needed.
