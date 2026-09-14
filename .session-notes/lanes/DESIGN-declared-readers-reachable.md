# Design note: every declared reader is reachable from a real door

kb_review, 11 Sep 2026. Design only, per the hub's own instruction — not built, no code changed.
Proposed as a sibling to R42 (`declared-readers`), not a replacement: R42 makes sure no door
invents its own reader outside `source-readers.ts`'s table; this closes the direction R42 leaves
open — a reader can be perfectly declared and still be unreachable in practice.

## The gap, stated precisely

R42's own text: "Every accepted type resolves to a declared reader ON EVERY DOOR... no door chooses
its own." That is a **downward** check — it walks from a door to the table and confirms the door
didn't skip it. It says nothing about the **upward** direction: whether the table's own entries are
ever actually exercised by a door that a real route or cron can reach. Three independent ways a
reader can rot invisibly, none of which R42's own census would catch:

1. A `ReaderName` is added to `SOURCE_TYPES`/`LINK_TYPES` (declared) but `runReader`/`readLink`'s
   own dispatcher never grew a branch for it — it silently falls through to whatever the dispatcher
   does for an unmatched case (here, the `markdown` fallback), so the table's ORDER lies: the
   declared preference is never actually tried.
2. `runReader`/`readLink` grows a branch for a reader name that no `SOURCE_TYPES`/`LINK_TYPES` row
   ever selects any more (a table entry removed or edited, the branch left behind) — dead code that
   looks alive.
3. The entry FUNCTION itself (`readSource`, `readLink`) is correctly wired end-to-end inside
   `source-readers.ts`/`knowledge-files.ts`, and nothing outside that file ever calls it — no route
   handler, no cron/sweep entry. R42 is silent here by construction: it only ever asks "does a door
   that reads a file choose its own reader," which presupposes a door is reading files at all.

## The census — three derived facts, each read off disk, never hand-listed

**(a) Declared reader names** — every string literal used as a `readers:` array element across
`SOURCE_TYPES` and `LINK_TYPES` in `source-readers.ts`, plus the full `ReaderName` union itself (so
a union member nothing ever selects is caught the same way `runReader`'s own comment already warns
about — "a name here that nothing declares is as much a defect as a type that resolves to
nothing").

**(b) Dispatched reader names** — every reader name `runReader`/`readLink` actually branches on
(`if (reader === "X")` / an equivalent `case`), read by parsing the dispatcher's own source rather
than trusted from a comment.

**(c) Doors that reach the entry functions** — every real call site of `readSource`/`readLink`,
traced to a `ROUTES` table handler (the same door census R19/R22/R47 already stand on) or a cron
entry (the sweep). A call from a `.test.ts` file does not count — a unit test calling the function
directly proves the function works, not that a real request can ever reach it.

## Two directions, both required, matching this repo's own pattern (R36, R40)

- **Declared, not dispatched** — every name in (a) must appear in (b). Catches failure shape 1: a
  reader that exists on paper and is never actually tried.
- **Dispatched, not declared** — every name in (b) must appear in (a). Catches failure shape 2:
  dead dispatcher code nothing selects any more.
- **Entry function, not reached** — `readSource` and `readLink` must each have at least one real
  call site per (c). Catches failure shape 3 directly: the whole table wired correctly and reached
  by nothing.

A reader declared in (a) but never dispatched in (b), or dispatched but never declared, or the
whole entry point unreached — any of the three turns the build red, the same shape as R42's own
"both doors ask it" and R36's "asked but unoffered is the dangerous half."

## Why this needed R42 to exist first, and doesn't compete with it

R42 answers "did a door that reads a file skip the table." This answers "is the table's OWN content
real." A codebase could pass R42 perfectly (every door that reads a file asks the table, none
chooses its own) while still shipping a reader nobody can reach — R42 has no opinion on whether any
door reads a file in the first place, or on the table's own internal consistency. Distinct
questions over the same table, same as R19 and R22 are distinct questions over the same door.

## CORRECTION — there is a live instance, found by the hub after my spot check missed it

My first pass checked whether the FILE `knowledge-files.ts` was reached from a door and stopped
there — which proves nothing about any one entry function inside it. That is the exact
substitution this design exists to name, and my own spot check committed it.

**Measured (`grep -rn` over `workers/content/src/`):**

```
extractFile(   →  routes/knowledge.ts:536 and :827      — reached from a door, twice
extractLink(   →  nothing but its own declaration        — reached from nowhere
```

Both functions live in the same file, `knowledge-files.ts`. `extractFile` is real; `extractLink`
(and everything under it — `readLink`, `classifyLink`, `readersForLink`, the whole `LINK_TYPES`
table) is dead code today. `routes/knowledge.ts` never calls it; every link-shaped source is
answered by `unreadableNote` instead (confirmed at lines 820 and 832 — a link is never fetched,
only refused with an honest reason). This is not hypothetical: it is the reason two tracker rows
described a link-reading feature nobody could reach, and the reason one of them was ticked, then
unticked an hour later, on a refusal sentence no user can ever see.

**THE DISCRIMINATOR, WRITTEN OUT because it is the whole check and my own spot check skipped it:**
reachability is asked of the ENTRY FUNCTION, never of the file it lives in. Confirming
`knowledge-files.ts` is imported by a route proves that SOME export of that file is reachable, not
that a NAMED one is — the census in part (c) above must trace call sites of `readSource` and
`readLink` BY NAME, never by proximity to a sibling export that happens to be reachable. This is
the same substitution R21 was bitten by twice, in its own words: "enumerate by what a client can
REACH, never by what a module owns." A file is not a door's worth of reachability any more than a
module is a client's worth of exposure — both times the fix was to stop asking the question one
level too coarse.

**Whether this is a bug or a deliberate absence changes nothing about the census, which is the
point.** The owner has reportedly ruled links are not fetched (27 Aug: "we don't open the page for
you," naming the Tella URL directly) — if so, `extractLink` being unreachable is intentional, not
a defect. That does not weaken this design; it is exactly the shape every other law here already
handles a deliberate absence in (R58's `GONE_ON_PURPOSE`, R47's `ASSISTANT_BLIND_MODULES`,
R64's `SECTION_HOSTED_ELSEWHERE`): a reasoned, named, rot-checked exemption line — `LINK_READER_
EXEMPT`, say — rather than dead code that reads identically to a bug and that nothing distinguishes
from one until somebody reads the source by hand, the way this session just had to.

## SECOND LIVE INSTANCE — kb_A, 11 Sep 2026, tracker b-upload-dup

Not this design's own shape (`uploadIdentity` is not a *reader*, and `knowledge-identity.ts` is
not `source-readers.ts`/`knowledge-files.ts`), but the SAME failure shape 3 this note names: an
entry function, correct and unit-tested in isolation, with zero real call sites anywhere in
`workers/content/src/`. `uploadIdentity(hash)` has existed since the R68 identity rebuild
(`knowledge-identity.ts`), is covered by `knowledge-identity.test.ts` (pure-function tests, same
category this note's own §(c) explicitly excludes: "a call from a `.test.ts` file does not
count"), and until tonight `grep -rn "uploadIdentity" workers/content/src/` found exactly one
hit — its own declaration. `createFileSource` (knowledge.ts) inserted every uploaded file's row
with `origin_table`/`origin_row_id` left NULL, so the one function that could have deduped an
upload never ran near the door that needed it. Confirmed by reading `createFileSource` directly
before writing any fix: no `uploadIdentity`, no `contentHash`, no existing-source lookup anywhere
in its body.

This makes TWO measured instances of shape 3 in one night (`extractLink`, then `uploadIdentity`),
found by two different lanes independently, neither looking for the other. The hub's own read:
"a pattern with five instances, not an anecdote" once the reader's 200-token ceiling, c-hijack's
120-chunk fixture and the file-overwrite near-miss are counted alongside these two — none of
which this design's own census shape would catch (they are not entry-function reachability
gaps), but all five share the same root failure: something correct and tested, wired to nothing
that a real request or a real measurement ever exercises, discovered only by a person reading
source by hand rather than by a check. Fixed tonight (`fix/kb-tracker-b-upload-dup`, pushed and
merged) by wiring `uploadIdentity` into `createFileSource`'s own pre-INSERT check — which is
itself the THIRD failure-shape answer this design's census doesn't yet have a name for: not
"declared but not dispatched," not "dispatched but not declared," but "entry function now
reached, by a caller that checks-and-refuses rather than reading its return value into a fold" —
worth a line in this design if `PRE_CHECK_REFUSAL_OK`-shaped callers turn out to be common enough
to need their own clause, alongside `ON CONFLICT`-shaped ones, when whoever builds this census
gets to `knowledge_sources`'s own INSERT sites.

## What I did not do

Did not write the check, the registry entry, or the law text for `RULES.md` — per the hub's
explicit "design it, do not build it." Did not verify the 27 Aug commit's exact wording myself
(searched this checkout's log for it and did not find the phrasing quoted — reporting the hub's
own citation as given, not independently confirmed). If this gets built,
`declared-readers-reachable` (or a name that reads better in this file's own voice) is the natural
check name, sibling to `declared-readers`, and `extractLink` is its first real test case: it must
turn the build red today, on this exact commit, until either a door calls it for real or a reasoned
exemption line names it on purpose.
