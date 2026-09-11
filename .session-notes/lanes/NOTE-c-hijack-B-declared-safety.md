# c-hijack (B) — the declared-safety write door, named but not built

Written 11 Sep 2026, after (A) a re-measured rarity threshold, (A2) the
ambiguous-shared-token refusal, and (A3) the retry-on-empty-narrow all
shipped. A3 was proposed here as "separately proposed, not this" when this
note was first written; it has since been weighed, approved, and built
(`fix/kb-hijack-a3-retry-on-empty`) — updated below to say so.

**One sentence for the owner**: after A, A2 and A3, the router can still be
WRONGLY NARROWED — narrowed WITHOUT going on to refuse outright, which is
the one thing A3 does not touch — by **a single ordinary word that names
exactly one account, is rare in the team's own material so far, AND has
some real content of its own for the narrow to (wrongly) succeed on**.
"Bergman S.A." is a live example on staging today (the surname appears in
only one chunk, which is as rare as a real word can measure, and it is
still an ordinary Swedish surname a completely unrelated question could
use) — A3 repairs the WORST outcome of asking about it (an outright refusal
on a corpus that had the answer, R23's own worst case), but if Bergman S.A.
ever has real material of its own, a genuinely unrelated question sharing
its surname would still narrow to it and find something there, correctly
by A3's own rules and wrongly by what the person actually meant.

## Why A and A2 don't close this

- **A** (a threshold, properly measured against the right population this
  time) cannot exclude a word with a corpus count of 1 — there is no positive
  ceiling below 1. The measurement behind A's own number
  (`ACCOUNT_TOKEN_MAX_CHUNKS`'s header, `workers/content/src/lib/knowledge.ts`)
  shows this precisely: an ordinary word can be corpus-rare purely because the
  topic hasn't come up yet, not because it's a safe identifier.
- **A2** (a shared token naming 2+ accounts resolves to neither) only fires
  when a SECOND real account genuinely collides on the same collapsed token.
  Checked directly against staging: no second account currently shares
  Bergman S.A.'s exact token. A2 is real, worthwhile prevention for whenever
  that changes — it closes zero CURRENT cases on this corpus, by design, and
  that is stated plainly rather than rounded up.

## The one thing that makes this more acceptable than it sounds

The route sentence is a receipt. When it hijacks, the person reads "The
question names Bergman S.A., so I searched Bergman S.A.'s material" and can
see, in one sentence, that it went to the wrong place. That is a visible
failure, not a silent one — the opposite of the mistake this whole knowledge
rebuild keeps finding and fixing elsewhere.

## The shape of B, if it gets funded

Same principle c-misspell's `alt_names` already shipped on: **declared beats
inferred.** A single-token account name is either declared safe by a person
who has looked at it, or it doesn't get the unsupervised bypass.

- **The derived half already exists, for free.** `rebuildNameIndex` already
  computes, per account, whether its canonical name collapses to fewer
  surviving tokens than its raw word count — that's exactly the
  "this name is fragile" signal, computed once per rebuild, no new query.
- **The declared half needs a person and a door.** Whoever reviews a
  single-token account name (at creation, or via a small triage list —
  `knowledge_refusals` is one candidate source, per the separate
  refusal-log-sourced proposal already estimated at ~1.5–2 days) marks it
  reviewed-safe. Until reviewed, the account either doesn't get the
  single-token bypass at all (a miss, the safe failure direction this
  codebase already prefers), or gets it provisionally with the rarity floor
  as the only guard, same as today.
- **Not estimated in detail** — this note exists so the gap is named and
  findable, not so the work is scoped. A real estimate needs the same kind
  of write-door + R19/R22 MCP-parity work the `alt_names` door already
  needed and did not get built (c-misspell's own report), plus wherever the
  review UI actually lives (R61's two-doors rule likely puts it under the
  account's own settings, next to `alt_names` once THAT door exists too —
  the two probably want to be one door, not two).

## What's now built, and what it does and does not close

**A3 shipped** (`fix/kb-hijack-a3-retry-on-empty`): when a narrow came from a
single FRAGILE collapsed token (never an alias/code match, never a
multi-token match, never standing on a record) and the narrowed search finds
nothing, it searches again unnarrowed rather than refusing outright — the
route sentence says so honestly ("I first searched X's material — found
nothing there, so I searched the whole knowledge base instead"), which is
the receipt that keeps the residual risk visible rather than silent.

**What A3 does NOT touch, on the record, tested and named rather than
discovered later**: if the fragile-matched account genuinely HAS material —
Bergman S.A. gets real content indexed one day — a completely unrelated
question sharing its surname still narrows to it and finds something there.
A3 only fires on EMPTY; a wrong narrow that succeeds was never its target.
That is still exactly what B closes: a person reviewing the name before it
gets the unsupervised bypass at all, regardless of whether material exists
yet.

A3's own test suite has this named explicitly too (a homonym case — "Lumen"
the account and "lumen" the unit of light) as an ACCEPTED risk: the retry can
answer from genuinely unrelated material once the fence lifts, mitigated by
R23's citations and the honest reason sentence, never by pretending it can't
happen.
