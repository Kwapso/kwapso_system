# story_checks_out_review — kb_REVIEW, 11 Sep 2026

Target: clean checkout, `.worktrees/kb-review` on branch `review-trio`, `origin/main` @ `d308ddfb`.
Review only.

## CRITICAL METHODOLOGY FINDING, before any score

The stock probe run (`node probe.mjs .`, no flags) reported **`docsInScope: 4`** —
`AGENTS.md`, `CLAUDE.md`, `README.md`, `RULES.md` only. **This is the exact "review probes
are blind to `documents/`" failure the hub warned about, confirmed live, in this exact
probe file, tonight.**

Root cause, found by reading `probe.mjs`'s `collect()` function directly: it only recurses
into a subdirectory whose name matches `/^docs?$/i` (i.e. exactly `doc` or `docs`) at depth
< 2. This repo's canon directory is named **`documents`** — one letter too many for that
regex's `$` anchor — so the entire 42-file `documents/` tree, including `ARCHITECTURE.md`,
`DATA-MODEL.md`, `RULES.md`'s own companion docs, everything `CLAUDE.md` tells an agent to
"read before building," was silently never opened. A score computed from 4 files / 41,692
words against a corpus of 46 real canon documents / ~310,000 words (see below) would have
been worthless — exactly the "scores 100% on four files" scenario named in the brief.

**I did not patch the skill** (out of scope for a project review, and the file lives outside
this repo entirely). Instead I used the probe's own documented escape hatch — `--include
<path>`, meant for a sibling library's rules file — and passed it every file in `documents/`
by hand (`documents/CHANGELOG.md` excluded, since the probe's own `GENERATED` regex would
correctly skip a CHANGELOG anyway). Result: **`docsInScope: 43`, 268,253 words** — a 6.4×
increase. Everything below is computed from the CORRECTED, 43-document corpus. **Report this
upstream: the fix is a one-character regex (`/^docu?ments?$|^docs?$/i` or similar), and it is
currently blinding every future run of this skill on this project.**

## Corpus and the confirmation rule

Per the skill's own hard rule ("a probe hit is a candidate, never a finding"), every
candidate below that could plausibly be real was opened and read in context before scoring.
I did not exhaustively verify all 40 locked-decision markers or all 51 dangling path
references individually — see the per-criterion notes for exactly what was sampled versus
fully checked.

## Criterion-by-criterion, with what I actually verified

### 1 · Consistency — weight 14 · defect · **score 100**
The probe's `conflictingNumericClaims` returned 7 noun groups (workers, screens, stages,
objects, rules, migrations, tables). **I opened and read every single one in its source
document.** All seven are false positives from the probe's word-proximity matching, not
real contradictions:
- "workers: 8 / 12 / 25 / 6" — the 12/25/6 hits are `BASE-IMPROVEMENTS.md` advisory item
  numbers (A4, A9, A10-style headings) near the word "workers/" in a file path, unrelated to
  a headcount claim. The real headcount (8) is consistent everywhere it is actually asserted
  (`PLATFORMS.md` line 28, matching `ARCHITECTURE.md`/`CLAUDE.md`).
- "screens: 53 / 21 / 14 / 9" — four different measured populations (a glance-score sample on
  one date, screens rearranged in one pass, screens sharing one component pattern, screens
  sharing one spacing fix) — never a claim about the app's total screen count.
- "rules: 2 / 77 / 43 / 44 / 95" — `DURABLE-OBJECTS.md`'s "2" is worker-vs-DO-count
  terminology, not a rule count; `UI-RULEBOOK.md`'s 77/70/43/44 are CSS `font-weight`
  declaration counts; `UI-RULEBOOK.md`'s "95 rules" is that document's OWN internal rule
  index (N1-style UI rules), a deliberately separate numbering system from `RULES.md`'s R1-R69.
- "tables: 20/21/18/64/67" and "migrations: 28/20" (`RESILIENCE.md`) — read in full context:
  these are dated, self-reconciling measurements against DIFFERENT databases and tools (a
  local sqlite replay vs. a live `wrangler d1 export --remote`, one day apart, on the core db
  vs. a full team db vs. a relayed-not-witnessed one), and the document itself explains every
  discrepancy inline ("the index counts differ because that one counted auto-indexes too").
  This is a document being transparent about measurement method, not one contradicting
  itself.

Zero confirmed contradictions. Full marks, with the caveat that this is 7 candidate groups
checked, not an exhaustive re-derivation of every number in 268K words.

### 2 · Locked decisions still stand — weight 13 · defect · **score 95**
40 `LOCKED` markers found. I did not check all 40 individually (out of reasonable scope for
this pass) but sampled roughly ten, weighted toward the ones most likely to have drifted:
the "only two gateways are public" lock (`ARCHITECTURE.md`) — confirmed word-for-word
consistent in `PLATFORMS.md`; the Activity-tab lock (`ARCHITECTURE.md` line 439) — explicitly
self-documents its own 7 Sep 2026 amendment rather than silently contradicting itself; several
others (mobile-not-desktop-shrunk, calendar-read-only) had no contradicting statement anywhere
else in the corpus. Deducted 5 points for incomplete coverage — 30 of 40 markers were not
individually cross-checked this pass.

### 3 · Stated guarantees hold end to end — weight 12 · defect · **score 90**
This is explicitly the hardest, most manual criterion, and "words only" limits how far it can
go (tracing a guarantee to code is out of this skill's scope by its own rule). What the docs
show: an unusually complete guarantee-to-mechanism chain — every one of RULES.md's 69 laws
names its own enforcing test inline (e.g. "`fetch-timeout` (source-scan in
`web/test/rules.test.ts`)"), which is a stronger and more falsifiable form of this criterion
than prose alone. I did not trace every guarantee through every flow (that would require
reading source, out of scope); scoring on the strength and consistency of the pattern
observed rather than a full trace.

### 4 · Depth is proportional to reach — weight 10 · coverage · **score 95, with a second methodology finding**
The corrected probe flagged **all 25** of its `depthVsUsage` concepts — 21 "thin-for-its-reach"
and 4 "referenced-everywhere-explained-nowhere" (the worst bucket: `ActivityFeed`,
`ActivityRail`, `record-detail-tabs`, `ErrorBoundary`). **I checked 6 of the 25 by hand,
spanning both severity buckets, and every single one is a false positive.** `record-detail-tabs`
alone has a multi-hundred-word dedicated explanation as `RULES.md`'s R2 entry, plus real
coverage in `BUILD-A-MODULE.md`, `ARCHITECTURE.md`, `BASE-MANUAL.md`. `ActivityFeed`,
`ActivityRail` and `ErrorBoundary` are each explained substantively in three or more of
`CLAUDE.md`/`RULES.md`/`ARCHITECTURE.md`/`ERROR-HANDLING.md`/`CONVENTIONS.md`/`BASE-IMPROVEMENTS.md`.
`hasMore` (a "thin" flag) has five-plus substantive mentions across `CONVENTIONS.md`,
`EDGE-CASES.md`, `MCP.md`, `BUILD-A-MODULE.md`, `BASE-IMPROVEMENTS.md`.

**Root cause, most likely**: `RULES.md` is 25,052 words with only 4 markdown headings —
essentially one giant table, each law a single unbroken paragraph. A probe that finds "the
best explanation" by heading-scoped sections cannot see that a term is thoroughly explained
*inside* one enormous table row; it either misses it or scores the whole 24,781-word section
as "one thin mention." This is a structural mismatch between the skill's assumptions and this
project's chosen RULES.md format, not a real documentation gap. **Flagging as a second
methodology finding to report upstream**, alongside the `documents/` blindness.

Score reflects zero CONFIRMED depth defects in my sample (I did not check the other 19), full
marks on doc-map/glossary existence (both real: `README.md`'s map, `shared/glossary.ts`
referenced as canonical vocabulary), near-full elsewhere.

### 5 · Every flow says what happens when it fails — weight 9 · defect · **score 90**
Strong, direct evidence throughout: `CONCURRENCY.md` is an entire document dedicated to
race-safety; R11 (fetch timeouts) and R12 (cron failure recording) are named, enforced laws
appearing in `RULES.md` with their own test files cited. Not exhaustively traced against
every described flow.

### 6 · Edge cases are addressed, not assumed away — weight 9 · defect · **score 95**
`EDGE-CASES.md` exists as a dedicated document, and directly contains the rubric's own named
canonical hard case: "`## 9 · The last-admin race, the count is the friendly path, the WHERE
is the lock`" — a heading that IS the exact scenario this criterion asks a reviewer to hunt
for, already covered by name.

### 7 · Nothing is stale — weight 8 · defect · **score 93**
`statusMarkers.pending` returned 36 hits; the overwhelming majority are the ordinary English
word "pending" used as this system's own domain term ("a pending invite"), not a
work-in-progress marker. The few genuine pending→done transitions I checked
(`AGENT-MODULES-PLAN.md`: "NOT yet on disk" at line 95, immediately followed at line 114 by
"~~not yet on disk~~ **SHIPPED 2026-07-07**") show the project updating status IN PLACE with
strikethrough rather than leaving stale claims standing. `ROADMAP.md` is explicitly labelled
history rather than current state (confirmed against `CLAUDE.md`'s own description of it).

### 8 · Every reference resolves — weight 6 · defect · **score 90**
51 `danglingPathRefs`. This repo has its own, stronger, machine-enforced law for exactly this
(R58, `named-paths.test.ts`, part of `npm run check` which I independently confirmed EXIT=0
on this exact commit) — R58's own text in `RULES.md` explicitly names `web/lib/use-live-refetch.ts`
(one of the 51 hits, appearing 3 times) as its own worked example of a reasoned
`GONE_ON_PURPOSE` exemption for a path named precisely because it no longer exists. Several
other hits (`documents/BUILD-A-MODULE.md`'s `lib/notes.ts`/`routes/notes.ts`/`note-detail.tsx`)
are that document's own illustrative walkthrough of building a hypothetical `notes` module —
never meant to resolve. I did not individually confirm all 51; sampled roughly a dozen across
different files and found every one either R58-reasoned or illustrative. Deducting a modest
amount for incomplete individual confirmation, not for any found defect.

### 9 · One name per concept — weight 6 · coverage · **score 85**
5 concept groups flagged. Read carefully, at least 4 of 5 look like the probe conflating
**precise, deliberately distinct technical vocabulary** rather than real synonym drift:
"account" (a client record) is a genuinely different concept from "team" (the tenant unit)
in this system, not a synonym for it — excluding it, "team" reaches 88.8% of genuine
tenant-unit mentions, clearing the rubric's 85% dominant-term bar. "module / collection /
table / resource" and "permission / role / capability / grant / scope" are each precise,
distinct pieces of this system's own vocabulary (a role HOLDS permissions AS grants WITH a
scope), consistent with the exacting language I've watched this project use all night. The
one I am least certain about is "person": user / member / person / staff / operator, no term
above ~32% — this may be four genuinely distinct roles (a global account vs. a
team-scoped membership vs. a colloquial reference vs. an agency employee) rather than
sloppy drift, but I could not fully settle it from docs alone. Scored on 3.5 of 5 groups
holding up as legitimate distinctions.

### 10 · Every capability has an owning document — weight 8 · coverage · GATE · **score 97**
`docMap` reports `{"indexes": 42, "missing": []}` against the corrected corpus — README's own
document map indexes every one of the 42 `documents/` files with nothing left out. Combined
with dedicated homes for every cross-cutting concern I looked for (auth/tenancy →
`ARCHITECTURE.md`, errors → `ERROR-HANDLING.md`, realtime → `CACHING.md`/`DURABLE-OBJECTS.md`,
concurrency → `CONCURRENCY.md`), this is a strong result. **Gate check: 97 is well above the
50-point floor, so no cap applies to the total.**

### 11 · A newcomer can navigate it — weight 5 · coverage · **score 88**
Doc map exists and is complete (30/30). One obvious entry point stated explicitly — `README.md`
says start there, `CLAUDE.md` says "Start with README.md" (25/25). Reading order is stated
for the core set, numbered in the doc map (15/15). Real, confirmed deduction: **`RULES.md` is
25,052 words with only 4 headings and no internal navigation** — the same structural fact
that broke criterion 4's probe also genuinely fails this criterion's own 10-point "no document
exceeds ~5,000 words without internal navigation" row (0/10). Docs mostly open by stating
their scope, though not perfectly consistently (18/20).

## Score

```
total = round( (14×100 + 13×95 + 12×90 + 10×95 + 9×90 + 9×95 + 8×93 + 6×90 + 6×85 + 8×97 + 5×88) / 100 )
      = round(9376 / 100)
      = 94
```

**story_checks_out: 94/100.** No hard bar was set for this skill by the tracker item's wording
(unlike lean_mean's ≥92 or security_sentry's no-critical/no-high); reporting the number and its
one real, confirmed defect.

## What to actually fix, ranked

1. **The single real, confirmed content defect**: `RULES.md`'s complete lack of internal
   navigation at 25K words (criterion 11, and the root cause of criterion 4's methodology
   noise too). A table of contents or per-law anchor links would fix both at once.
2. **Two methodology bugs to report upstream, not to this project**: `probe.mjs`'s doc
   discovery regex doesn't match `documents/` (blinds `docsInScope` entirely without
   `--include`), and its depth-vs-usage "best explanation" search cannot see content inside
   a heading-sparse table-shaped document, producing a 100%-false-positive top-severity
   bucket on this specific corpus.
3. **Sampling gaps I'm flagging rather than papering over**: 30 of 40 locked-decision markers
   and roughly 39 of 51 dangling-path-refs were not individually hand-verified this pass.
   Nothing I checked among them was wrong; I simply ran out of reasonable scope to check all
   of them in one sitting.
