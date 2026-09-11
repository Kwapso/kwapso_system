# c-hijack (B) — the declared-safety write door, named but not built

Written 11 Sep 2026, after (A) a re-measured rarity threshold and (A2) the
ambiguous-shared-token refusal both shipped (`fix/kb-hijack-single-token-collapse`
or wherever this lands — see that branch's commit for the full account).

**One sentence for the owner**: after A and A2, the router can still be
wrongly narrowed by **a single ordinary word that names exactly one account
and happens to be rare in the team's own material so far** — "Bergman S.A."
is a live example on staging today (the surname appears in only one chunk,
which is as rare as a real word can measure, and it is still an ordinary
Swedish surname a completely unrelated question could use).

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

## What's separately proposed, not this

A3 (weighed, not built, same investigation): when a narrow came from a
single collapsed token and the narrowed search finds nothing, search again
unnarrowed rather than refusing outright. This repairs the Bergman-shaped
case from the OUTCOME side rather than the word side — it doesn't need to
know "bergman" is an ordinary word, only that betting on it paid nothing.
Real costs named in the investigation's own report (an extra round trip on
every legitimately-empty single-token question; a route-sentence rewrite to
stay honest about the retry; a real, if pre-existing, risk that the wider
search surfaces off-topic material once the fence lifts). Complements B
rather than replacing it — A3 catches the WORST outcome of a hijack even
before a person has ever reviewed the name; B is what stops the narrow from
happening in the first place.
