# HUB — knowledge-base rebuild, running record

The hub's own log. One entry per tick. Written here rather than in a chat log
because a decision whose only home is a transcript is a decision the next agent
re-litigates.

---

## Tick 1 — 10 Sep 2026, ~13:45

**Lanes running:** kb_A (model), kb_B1 (gate & identity), kb_B2 (grain & readers),
kb_E (exam). All four branched off `main` before `8d034e79` and were told to rebase.

**Three corrections to my own lane briefs, all mine:**
- `knowledge-shape.ts` is the knowledge MAP feature, not a grain file. I inferred
  a job from a filename — the exact trap CLAUDE.md warns about for the kit. kb_B2
  refused to touch it and was right. Its real grain seam is `google-read.ts:282`,
  where a whole chat thread is flattened to one `sender: text` blob.
- `knowledge-files.ts` ("turning a file into words") was missing from B2.
- `knowledge-summary.ts` ("what each record is about") was missing from B1 — it is
  where a record's CARD content is made.

Found the last two by re-reading every file I had named for every lane, rather
than only fixing the one that was caught.

**The seam between B1 and B2, restated:** B2 decides what the material IS; B1
decides what it is the same as, and where it is filed.

## THE COST METER — and why the obvious instrument is the wrong one

The owner cut the cap from $10 to **$5** on 10 Sep.

Cloudflare's GraphQL `aiInferenceAdaptiveGroups` answers in neurons by model, and
it works — baseline 8–11 Sep: kimi-k2.6 8,272 · bge-m3 518 · llama-4-scout 151,
about $0.10 at `NEURON_USD_PER_1000`.

**But it is ACCOUNT-WIDE and this account holds three apps.** 35 workers, 17 ours,
18 belonging to rest-o and hogo-matching — and `rest-o-data-ops` runs an agent of
its own. Our agent is pinned to `@cf/moonshotai/kimi-k2.6`
(`workers/data-ops/wrangler.jsonc:57`), which is very likely what rest-o's runs
too. So a neuron total by model cannot tell our spend from theirs. BUILD-5 §3 said
"meter read per worker, not per account" without saying how; this is why.

**The only per-worker meter is the app's own rows.** `scripts/ai-spend.mjs`
already prices `agent_usage_log` with the same rate card COSTS.md quotes — but it
covers ASSISTANT turns only. The rebuild's two big spends, embeddings and context
lines, are INGESTION and are recorded nowhere.

**Requirement for lanes C and D:** ingestion spend is recorded into the same log
the assistant writes, so `ai-spend.mjs` answers the whole question and the gate's
"under $5" is a figure off our own meter rather than an account total that
includes another company's app. Until that lands, the account reading is used as
an UPPER BOUND — it can only overstate.

**Revised allocation under $5** (was $10):

| Item | Model | Was | Now |
|---|---|---|---|
| Re-embed everything, twice | bge-m3 | $0.05 | $0.05 |
| Context lines, ~10k pieces | scout | $1.70 | $1.70 |
| Name-index aliases | scout | $0.10 | $0.10 |
| Exam, retrieval-only grading | bge-m3 | cents | $0.15 |
| Exam, full-loop runs | kimi-k2.6 | ~$5 (10 runs) | **~$3.00 (~6 runs)** |
| Headroom | — | ~$3 | $0 |

The economy that makes this fit: **grade retrieval-only for every iteration**
(bge-m3, cents) and spend kimi ONLY on the final validation runs. Ten cheap
iterations and three expensive ones beats ten expensive ones. `FREE_NEURONS_PER_DAY`
is 10,000, so heavy one-off work spread across days rides the free allowance —
which also means a naive neuron total OVERSTATES the bill, and the meter must
subtract the free tier per day rather than multiply the total.

## Tick 2 — 10 Sep 2026, ~19:25

The hub's chat was cleared by accident between ticks. Nothing was lost, and that
is the whole argument for this file: every decision below was recoverable from
disk, the worktrees and the commit bodies. A hub whose state lives in a
transcript is a hub that dies with the transcript.

**kb_B2 reported (report 1).** `fix/kb-grain` pushed, check green, $0 spent.
Delivered `LINK_TYPES` + `contextLineFor` in `source-readers.ts` and
`chunkChat`/`chunkMail`/`chunkSheetTab` in `knowledge-text.ts`, test-first.

**MY FAILURE, recorded rather than smoothed over.** kb_B2 asked before starting
whether `knowledge-shape.ts` was really its file. I answered that question in
Tick 1 above — it is the knowledge MAP feature, not a grain file — and never
relayed the answer to the lane. It sat blocked on a question I had already
resolved, and said so in its report. Writing a correction in my own log is not
the same act as sending it. Relay, then log.

**Three findings from checking the report rather than accepting it:**

1. kb_B2 reported `.plans/KB-AUDIT.md` "doesn't exist anywhere in the repo", and
   kb_B1 reported the same gap earlier. It is FALSE as of now, verified four ways:
   `ls-tree fix/kb-grain` returns blob c1f0ed34 (identical to main's),
   `merge-base --is-ancestor 50584950 fix/kb-grain` is YES, the lane's own diff
   shows `.plans/KB-AUDIT.md | 337 ++++`, and the file is in its worktree. Both
   lanes looked before the canon-move commits arrived and neither re-checked
   after rebasing. Two lanes built without the audit. Any lane reporting a
   missing canon file gets re-verified from the hub before I believe it.

2. **§2 has five Build items and only four are built.** Context line, chat runs,
   mail-message pieces and sheet-tab headers all landed. "Relevancy date =
   happened-at for frozen things, last-change for living things" is on NEITHER
   branch — grepped `relevancyDate|relevancy_date|happenedAt|happened_at` across
   `fix/kb-grain` and `fix/kb-gate`, zero hits on both. Unclaimed, not
   misfiled. **Assigned to kb_B2** under the B1/B2 seam: it is a property of what
   the material IS. Not cosmetic — KB-AUDIT §4.5 says the recency trigger the
   code itself names has already been met, so a missing relevancy date is a live
   retrieval fault.

3. The real grain seam is confirmed by reading it: `google-read.ts:282` joins a
   whole thread into `sender: text` lines in one blob. KB-AUDIT §4.9 describes
   the same line independently ("one thread is one ~348-char blob, speakers
   inline"). Two oracles, one seam. `chunkChat` replaces it.

**Added to the ship list (not a lane's to close):** the YouTube `timedtext` and
Loom/Tella oEmbed response shapes are unverified against a live account — no
network egress in the lane sandboxes. A real-link smoke test on staging is a
gate item before any of this ships. This is the same shape as the real PDF that
found the subsetted-font gap in the reader these readers extend.

**Not merged.** B1 (`edf1fdb6`) and B2 (`1b64985a`) are committed and green but
both lanes are still live in their worktrees; merging under a working lane is
how a rebase fight starts. kb_E is merged (525b10ea) and still working.

## Tick 3 — 10 Sep 2026, ~19:35

**THE NEAR-MISS. The grounded exam was in no git object anywhere.**

`.plans/kb-exam-draft.md` was untracked — not on main, not on a branch, not in
any commit's history. `git ls-files --error-unmatch` returned "did not match any
file(s) known to git". Committed as `.plans/KB-EXAM-TRANSCRIPTS.md` (83 rows) on
`docs/the-grounded-exam-was-never-committed`, 81743ce7.

THE TWO EXAM FILES ARE NAMED BACKWARDS FROM THEIR CONTENTS:

  KB-EXAM.md (87 rows, tracked, canon, what kb-exam.mjs loads) — its own header:
  "Drafted by reading 84 CALENDAR EVENTS (titles, dates, attendees)."

  kb-exam-draft.md (83 rows, untracked until now) — its own header: "Only meetings
  whose transcript or Gemini notes exist on staging with 15 or more pieces were
  used (71 sources)". Every row names its source AND that source's piece count.

The file called "draft" is the grounded rewrite. The one called canon is the earlier
calendar pass. The owner settled it today unprompted: the new questions "only come
from scripts, whereas for the old exam prompt, some came from transcripts and some
did not" — exactly what the two headers say about themselves.

ee29a9c7's commit body instructed the next reader to DELETE the stray file, and
`kb-exam.mjs:69` wires it as a fallback BEHIND the weaker file. Both were sound
given the names and wrong given the contents. I relayed nothing to contradict
either. A filename was trusted over a header, which is the same class of error as
Tick 1's `knowledge-shape.ts` — inferring content from a name.

**Not resolved, assigned to kb_E: MEASURE THE OVERLAP FIRST.** The owner wants the
new rows used "along with the old ones" — a union. O1-O8 are verbatim in both files
and an unknown number of E/M/H rows are the same question differently sourced. A
naive concatenation gives 170 rows with duplicate ids and double-counts the
mandatory eight. Number first, union second, baseline re-pinned once.

**kb_E's struck/tool split verified against the file, not accepted:** 7 count-tagged
rows in KB-EXAM.md, 7 `tool` rows; 7 + 6 = the 13 the old `struck` held; 87 + 1
derived = 88. Nothing lost or invented.

**Budget discrepancy resolved (kb_E was right to flag, not act).** Both my
statements were true of different things: EXECUTION of the full-loop runs is kb_E's,
THE BUDGET IS THE HUB'S. Each run authorised singly, spend quoted from
`ai-spend.mjs` after each. A lane holding a standing $3 balance against the owner's
cap is how a cap gets discovered breached rather than enforced.

**kb_A reported done (542c89f7, migration 0073). Both its findings verified:**

1. CREATE TRIGGER is incompatible with this repo's migration executor. Read
   `d1-rest.ts:593`: `splitStatements` handles string literals and `--` comments
   and has NO BEGIN/END awareness, so a trigger body shatters at its inner `;`.
   The asymmetry is what makes it dangerous — a `node:sqlite` `exec()` test passes
   while the real path fails. `SEARCH.md:99-107` is the ONLY `CREATE TRIGGER` in
   the repo and line 127 states a rule ("never write the FTS table from app code")
   for a pattern never once built. Lane G's to fix, not kb_A's.
2. `DELETE FROM <fts>` is a silent no-op on an already-empty external-content
   table; `'delete-all'` + `'integrity-check'` is right.

**Settled kb_A's index question from B1's source instead of relaying it.**
`identityKey()` returns `${originTable} ${originRowId}` with origins google_drive /
google_gmail / google_calendar / google_chat / upload / record-table. Namespaced,
so the GLOBAL unique index is safe. No amend. Told kb_A to stand down.

**Two gaps I found in kb_A's migration and sent back:** `knowledge_sightings`
(source_id, seen_where, seen_by_user_id, seen_at) has no column for B1's
`goneAt` — and a sighting that cannot record that it ENDED cannot express B1's
`liveSightings`/`stillLive` at all. And `relevancy_date` is a column nobody
populates; the write side is kb_B2's §2 item.

**Known limit, now tracked:** the unique index will not dedupe MAIL across
colleagues. Gmail's message id is mailbox-scoped and the cross-mailbox identity is
the RFC-822 header, which the app does not read. B1 wrote this down honestly. It
lands on the owner's tracker item "one meeting arriving three ways becomes one
source": transcript and calendar arms merge, the mail arm does not yet.

**The loop is running again** (self-paced; the owner re-supplied the prompt after
the hub's chat was cleared). Its three exit conditions: BUILD-5 complete, the
46-item tracker complete, spend under $5. The tracker artifact still says $10 in
two places and is STALE against the owner's $5 ruling.

## Tick 4 — 10 Sep 2026, ~19:45

**kb_B1 report 2 — the round's best measurement, and it corrects the audit.**
KB-AUDIT §4.1's fix does not reach its own finding. Reproduces at 925/9,921
chunks (9.3%); a SOURCE-level hash — which is what an identity is, by
construction — reaches 114/3,933 sources (2.9%). Written into BUILD-5 §1 so the
gate cannot inherit a number no lane can satisfy. Remainder is chunk-level, lane
C's. Also: title+date is the weaker key (112 vs 125), build the hash; `event_id`
does not express the meeting fold (event 66/66, meeting 47/122, email 30/436,
**document 0**) because a Gemini notes MAIL is not a calendar notice.

**Sent back for re-derivation: 125 + 84 = 209 against a stated population of
182.** Load-bearing, because it decides whether the RFC-822 header is a required
second build or a rounding error. Recorded in BUILD-5 as unsettled, in those
words, rather than picked.

**MERGE ORDER DECIDED: kb_A FIRST.** B1 is blocked on it and says identity and
sightings must land in one merge. But 0073 is not mergeable yet — I read its DDL
against B1's types and CONFIRMED the gap I had only inferred last tick:
`knowledge_sightings` has NO `gone_at`, while B1's `liveSightings`/`stillLive`/
`readableBy` all filter on `goneAt`. The table cannot store the field the code
filters on, so the owner's tracker item "removing a sighting removes it from
answers within one sweep" is dead on arrival. Two more: `seen_where` (a PLACE)
cannot also carry `shelf` (a VISIBILITY); and the unique index is nullable in its
third column, so SQLite's distinct-NULLs rule means it does not dedupe. kb_A
amends 0073 rather than chasing it with a second migration.

**Told B1 and A to settle the column shape DIRECTLY, copying me.** B1 owns the
type, A owns the DDL; routing it through the hub adds a translation step and no
value. The hub decides ORDER and BOUNDARIES, not column names.

**Granted kb_B1 `knowledge.ts` for the cards piece only** (`level:"chunk"`,
findable-never-quotable), overriding my earlier assignment of that file to Lane
D. Two reasons: the owner's tracker files "app records are cards, never quoted"
under B · Ingest, and Lane D does not exist, so the alternative is waiting on a
lane nobody has started. Boundary stated: indexing only; retrieval or answer
assembly means stop and tell me.

**B1's discriminator kept as derived, not hand-listed:** a card kind is one where
every live source produces exactly one short chunk — task 256/256, contact 89/89,
event 66/66, app 28/28, person 10/10, dropdown 17/17, portal_login 5/5, todo 1/1,
against ticket 2051/2621, document 78/2911, meeting 122/1958. Separates cleanly,
nobody maintains it. Rejected the `body <= summary+40` fallback: B1 showed it is
fuzzier, and which client's material a question routes into is the wrong place to
approximate.

## Tick 5 — 10 Sep 2026, ~19:55

**kb_E measured the overlap. The headline: ID IS NOT A KEY BETWEEN THE FILES.**
83 ids collide, only 29 are the same question. A union deduping on id would have
silently destroyed 54 distinct questions — A.E6 is "HOGO cost-saving" and B.E6 is
"Padelbase WFC porting", same label, unrelated topics. Real duplicates only show
up by READING the text, which is what kb_E did. Union is 100 distinct questions,
not 175 (naive concat) and not 88 (id-collapse).

**MY SECOND PUBLISHED NUMBER WAS WRONG.** I said B was 83 rows in the rescue
commit AND in BUILD-5's note. It is 88. My grep matched `O|E|M|H|X|D` and no `G`,
so it dropped the five `gap` rows — the rows that file exists to contribute. An
instrument that cannot see a category returns a confident number for the
categories it can see. Corrected in the file's header, not by amending history,
because the wrong figure reached two documents. Second census error of the day
after the exam-filename one: both times I trusted a pattern I wrote over the
thing it was pointing at.

**RULINGS:** (1) union keys on TEXT; ids namespaced `A-E6`/`B-E6`, never
renumbered, so no collision can drop a question and prior reports still resolve.
(2) Union = 100. (3) B wins every A/B disposition conflict — verified from B's own
footer, which names nine meetings with no transcript ≥15 pieces on staging as of
10 Sep, against A's calendar-only reading. (4) kb_E's two fuzzy rejections stand.

**kb_E UNDER-SCOPED ITS OWN CONFLICT AND I SENT IT BACK DERIVED.** It flagged
A.E6/A.E12 against B.G1/B.G2. But B's left-out list has NINE entries, and at least
three more A rows resolve to them: A.M6 ← HORST matching test run 25 Aug (B.G3
already covers it), A.M19 ← FluClinic task 3144 meeting 25 Aug, A.H13 ← HOGO ×
Claude math pt 1. Told it to DERIVE the set from B's list rather than hand-list
the five I found, and to report the count the derivation produces — if it is more
than five, that is the finding, not my guess at it.

**`gap` is a FIFTH disposition, not a refusal.** A gap row passes by NAMING the
meeting and saying nothing was recorded; a refusal row passes by refusing. Folding
them would score an invented answer and a correct one identically.

Union goes in a NEW file; neither source is overwritten, because both are now
evidence of how their questions were derived and the derivation is what is under
dispute. Baseline re-pinned ONCE, at the end. Still $0.

## Tick 6 — 10 Sep 2026, ~20:05

**kb_B2 report 2 — fixed the bug §4.9 measured.** `chatThreads` in `google-read.ts`
no longer flattens a conversation into one blob; it is built from `chunkChat`, runs
joined on a blank line so the downstream paragraph-cutter lands between runs rather
than through somebody's turn. It checked `google-ingest.test.ts`'s existing exact-
string assertions BEFORE changing the format instead of discovering them red.

**The `TokenUsage` change is the meter requirement, delivered early.**
`contextLineFor` now returns `{ line, usage }` in `shared/workers/credits.ts`'s own
shape, imported not reinvented. Tick 1 put "ingestion spend recorded into the same
log `ai-spend.mjs` reads" on lanes C and D, because the account-wide neuron API
cannot separate our spend from rest-o's agent on the same kimi model. B2 delivered
the shape at the one moment it was free — before anything is wired. Told it to say
so in the commit body; it currently reads as a refactor.

**MAIL REGROUP: APPROVED, AND IT GOES FIRST.** BUILD-5 §2 says "mail thread =
source, message = piece" in as many words, so it is in scope; §4.9 not naming mail
is the audit being narrower than the plan. B2 was right to ask rather than guess.

The order is the non-obvious part, and it is the OPPOSITE of "wait for B1".
Confirmed `google-read.ts:549` files `externalId: mail.id` — one source per
MESSAGE — and B1's dedup key is a source-level hash "computed over the text the
file reads as". So regrouping changes what a mail source IS, changes the hashed
text, and **invalidates B1's whole mail measurement** (668 chunk pairs, 182 of 436
mails, 125 sharing a hash — every figure is over message-shaped sources). Measuring
a fold against a unit about to change means measuring twice and shipping whichever
number was current. Regroup first; B1 re-measures after; if the number moves, that
is a finding. A thread's full text may be a stronger fingerprint than a message's —
plausibly, and to be measured rather than argued.

**Guarded against an overclaim:** thread-grouping does NOT fix mail identity.
Gmail thread ids are per-mailbox exactly as message ids are. It fixes GRAIN and may
incidentally improve hash folding. The owner's tracker item "one meeting arriving
three ways becomes one source" still has mail as the arm that does not merge.

**Seam: B2 owns the grain, B1 owns what `externalId` becomes.** Told them to settle
it directly and copy me, as A and B1 are already doing on the sightings columns. A
disagreement about where the line falls comes to me; the line itself does not.

## Tick 7 — 10 Sep 2026, ~20:20

**FIRST MERGE. `main` at a32060ce, `npm run check` EXIT 0** — read the exit code,
not the output, per the standing rule that a grep has hidden a red build here
twice. 10 workspaces, 5,236 tests, zero failures. Merged: the docs branch (exam
rescue + the two corrections) and `fix/kb-model` (migration 0073).

Verified A's amended DDL against B1's `Sighting` type BEFORE merging rather than
taking the report: `seen_by_user_id NOT NULL`, `shelf CHECK IN ('private','team')`,
`gone_at TEXT`, unique `(source_id, seen_by_user_id)`. kb_B1 unblocked.

A improved on my instruction: I said decide between one column and two, my read is
two. It read the TYPE, found `seen_where` held a folder id `Sighting` never
carries, and deleted it as its own invention from the plan's prose. Deleting an
invented column beats keeping it company. It also tripped R58 by naming a
cross-branch file by full path in a comment — the rule firing on a case nobody had
exercised.

**THE CARDS DISCRIMINATOR: I ENDORSED IT AND IT IS WRONG. kb_B1 CAUGHT IT.**
Tick 4 I blessed "every live source produces exactly one short chunk" and told B1
to keep it as derived. B1 measured the TRANSLATION before building — which is what
I should have done before endorsing — and `chunk_count = 1 AND length(body) <= 480`
catches 2,589 of 3,933 sources, including **1,309 of 2,051 tickets and 269 of 339
stories**. The ticket it quoted settles it: a person's own words, short, and
quoting them is the entire reason we hold it. **A short ticket is not a stub; it is
a ticket.** It would have shipped green and silently stopped 1,309 tickets being
quotable.

The flaw, named so I stop making it: **an aggregate census and a per-source
predicate are different sentences.** "Every source of this kind is short" is a
property of a KIND; an indexer decides one source at a time and cannot ask about a
population. I approved a census as though it were a rule. Third census error of the
day, same shape each time — trusting a pattern over the thing it points at.

**APPROVED B1's replacement**, seam verified first: `knowledge-ingest.ts:4` opens
"ONE ENGINE, KINDS AS DATA", `INGEST_KINDS` is a plain array at :346,
`SUMMARY_MAX_CHARS = 480` is `knowledge-summary.ts:45` (a ceiling, not a threshold
fitted to data). The true separation is **a card kind is one whose every word the
app generated from columns; a non-card kind folds in something a person wrote** —
knowable in the CODE, not merely in the data. Declaration is the rule, census is
the rot-check, fails both ways, list can only shrink. B1's R13 argument for why the
production census cannot BE the rule is kept verbatim: a fresh environment holds no
rows, so no kind would qualify and NOTHING would be a card.

**MAIL SETTLED, THEN DELIBERATELY UNSETTLED.** B1 re-derived: 436 live email
sources, 182 share exact chunk text, hash catches 125 (69%), misses 57 (31%). The
125/84 error was two `COUNT(DISTINCT source_id)`s over OVERLAPPING sets — one mail
can share text with an equal-hash twin and a different-hash twin at once — so 209
was the overlap itself. **The prize is 66 rows removed across 59 hash groups, not
125**: a fold keeps one per group, and counting members rather than removals
overstates the win by nearly double. B1 volunteered that. In BUILD-5 now.

All five figures go stale when B2's mail regroup lands, BY DESIGN — Tick 6
sequenced the regroup first so B1 measures once against the final shape. Told B1 to
expect it and to treat a moved number as a finding, not an error.

## Tick 8 — 10 Sep 2026, ~20:45

**I MERGED A STALE REF AND SKIPPED A PUSHED COMMIT.** My merge at 23e9dcf3 took
the LOCAL `fix/kb-model` (95d80005) without fetching, while kb_A's third commit
66e015c3 sat on the remote — a commit it had already reported to me BY NAME
before the merge. Main carried a `knowledge_sightings` with no `seen_where` and a
two-column unique index, and kb_B1 rebased onto it.

Caught by kb_A, not me: it read main directly, checked the merge's second parent,
confirmed the remote tip was unchanged, and proposed the cheapest fix without
pushing to main itself. Fixed at `bda6a1c8` — 66e015c3 turned out to be a clean
descendant, so merging the REMOTE ref brought it in whole. Check exit 0.

**THE RULE: fetch immediately before merging, and merge the REMOTE ref.** A lane
that reports "pushed" has a tip past whatever you last fetched.

**Settled a drift BOTH lanes had, against both of them.** kb_B1 — reading my bad
merge — called the two-column key "cleaner than what I asked for". It is not, and
the reason is kb_B1's OWN retire pass: `(source_id, seen_by_user_id)` gives one
row per person per thing, so when Aurora loses the Drive folder but still has the
material in her mail there is NO ROW to stamp `gone_at` on. Three columns retire
the Drive sighting and leave the mail one live. kb_A's test — same person, two
places, not deduped — is exactly that case. The place is an INGEST fact, not a
permission fact: it does not belong on B1's `Sighting` type and it does belong in
the key.

**THE FENCE. The most important finding of the rebuild, and it is kb_B1's.**
The read fence `owner_user_id IS NULL OR owner_user_id = me` is denormalised onto
`knowledge_chunks` and `knowledge_terms` — three copies of one fact — and one
column cannot hold a set. The moment two people's rows fold into one source it
has no correct value. The datum that settles it: **all 66 live calendar rows are
private-shelf**, folding to 33 sources of which 27 have two or three sightings, so
**100% of the fold is the multi-private case**. `owner_user_id = NULL` would
silently make Aurora's private calendar readable by everybody, on 27 sources.

**RULED: build the stored ANSWER** — `team_visible` on chunks/terms, sightings
join only when false. Keeps the single-table stage-one read for the corpus bulk
(3,933 sources; calendar is 66) and pays the join only for private material.
Option 3 (fold only where a team sighting exists) is a no-op dressed as an option
— zero of 33 qualify — and is recorded so nobody revives it.

**The failure mode kb_B1 did not name, and my approval is conditional on it:**
`team_visible` is a DENORMALISED COPY OF A DERIVED FACT, which is what
`owner_user_id` is one level up. It goes stale when a shelf flips private→team or
the last team sighting is retired — a fence widening with no code change and no
deploy. Approved ONLY with (a) recompute in the SAME statement/transaction as any
`shelf`/`gone_at` write, never a follow-up write that can be skipped, and (b) a
test that recomputes `team_visible` from sightings across the corpus and asserts
equality, so a stale flag is a red build rather than a quiet leak.

**Fresh-eyes review sequenced deliberately:** on the IMPLEMENTATION, from a clean
clone, by eyes that have not read this thread — and as a MERGE GATE, not a
follow-up. A review of a design that does not exist yet rationalises a sketch. The
fence does not merge on a green `npm run check` alone.

**kb_B1's dependency-direction catch approved:** the cards declaration goes in the
LOWER layer, not on `INGEST_KINDS`, because `knowledge.ts ← knowledge-ingest.ts`
means importing the kinds table into `knowledge.ts` inverts the arrow into a real
cycle. The rot-check binds declaration to `INGEST_KINDS` instead — same guarantee,
arrow the right way round. R13's argument applied to module structure.

**kb_B2: nine call sites CONFIRMED by my own grep** — `recordDate: r.created_at`
at knowledge-ingest.ts lines 435, 621, 698, 789, 896, 1085, 1371, 1458, 1843, and
`updated_at` defined 40 times in migrations, so the fix is probably possible.
Still unproven, and B2 was right to refuse to assert it: whether each kind's own
SELECT carries an updated-at equivalent. Told it to write the CENSUS down and not
to fix — `knowledge-ingest.ts` is not its file and it is nine gated writes of
blast radius. This is the live mechanism behind KB-AUDIT §4.5's measured symptom.

**Mail regroup answer re-sent** (the first may still be queued): build it, it goes
first, B2 owns grain and B1 owns `externalId`, and neither may claim it fixes the
cross-mailbox fold — both have now independently confirmed a Gmail THREAD id is
per-mailbox exactly as a message id is.

## Tick 9 — 10 Sep 2026, ~21:10

**THE CARDS DESIGN FAILED A THIRD TIME AND kb_B1 CAUGHT IT AGAIN — FROM THE CODE
THIS TIME, NOT THE DATA.** Built as approved, test red first, seven cases red for
the right reason. Then, before choosing WHICH kinds to declare, it read the
readers one at a time:

  person  folds headline / strengths / weaknesses / role_models
  account folds about, plus its apps, sprints, tickets by name
  contact folds about · task folds detail + time-log notes
  app     folds about / client_context / solution / key_actors · todo folds detail

**Every kind §4.3 named as an offender has a reader that can fold in words a
person wrote.** The stubs the audit measured were rows where those fields happened
to be EMPTY. Only `dropdown` and `portal_login` fold no free text: **22 of 3,933
live sources.** Declaring those two would read as "§4.3 addressed" in the plan and
leave the complaint exactly where it is — the same trap as the first two, one
layer further in. kb_B1 refused to ship it and asked. Correct.

**THE SENTENCE THAT ENDS IT: card-ness is a property of the ROW, the reader is the
only thing that knows, and once the body is one string the two halves are
indistinguishable.** The fact is destroyed by the act of building the body, so it
must be recorded while it is still known. Ordered from kb_A:
`knowledge_sources.generated_only INTEGER NOT NULL DEFAULT 0`, set by each reader
at ingest, with the reasoning in the migration comment so nobody simplifies it
away. Default 0 is the safe direction: a wrong 0 costs a slot, a wrong 1 silently
stops a person's words being quotable.

**My score on cards: three designs, three wrong, all three caught by the lane.**
Census-as-rule, then kind-level declaration, then kind-level at all. Every time the
lane measured or read something I had not.

**kb_B1 DELETED its red test rather than skipping it** — a skipped test is a
silent absence that counts as success, and a green test asserting the wrong intent
is the failure the planning ritual names. The finding lives in
`knowledge-summary.ts`'s header with both disproved readings and the numbers that
disproved them.

**Three traps held for whoever wires the column:** no chunks; still write the
`level:"record"` vector or unquotable becomes UNFINDABLE; and do not let the
no-embedded-chunks self-heal blank a card's hash — that is a COST bug, re-reading
and re-embedding every card every fifteen minutes against the €50 ceiling, forever,
looking exactly like normal sweep activity.

**kb_E's union verified from the branch: 100 rows, ids namespaced, `--check`
regenerates and diffs so a hand-edit of a generated artefact is a red build.**
Totals reconcile (72+8+8+7+6 = 101 = 100 + the derived X8-notowner); mustScore100
8 → 16; ten canaries intact.

**MY GAP RULE WAS WRONG AND kb_E's FLAG CAUGHT IT.** I said "any A row whose
source resolves to B's left-out list is a gap". A-H13 asks about the recruiter's
maths over TWO sessions — pt 1 (25 Aug) is left out, pt 2 (26 Aug, 23 pieces) is
on staging and cited by B's own O3 and M7. Under kb_E's own grading, `gap`
requires `found === false`, so **a system that correctly answers from pt 2 would
FAIL the row.** The disposition would have penalised the right behaviour.

Corrected rule: **a row is a gap only if ALL its sources are on the left-out
list.** A row citing one absent and one present source is a THIN-EVIDENCE row —
and A-H13 is the only row in the exam testing partial knowledge, mapping exactly
onto the owner's tracker item "answer and say what is missing". Filed `keyed` to
pt 2, with the gap sentence recorded in its detail for the full loop to grade
later. Derived gaps: 4, not 5. kb_E filed it per the letter of my rule and flagged
the ambiguity instead of resolving it silently — which is the only reason this was
catchable before an exam run.

**Standing: no model call authorised anywhere. Every lane at $0.**

## Tick 10 — 10 Sep 2026, ~21:30

**BUILD-5 §0 STILL SAID $10.** The owner cut the cap to $5 on 10 Sep and only THIS
LOG had caught up — so the plan's opening ruling, the paragraph every lane reads
first, carried twice the room he allowed, for the whole session. Fixed on main,
and §0 now also states what "measured on our workers only" MEANS, since the
obvious instrument cannot separate our spend from rest-o's agent on the same
model. Found by accident while checking something else, which is the only reason
it was found at all.

**kb_B2's mail regroup is mechanically done and holding a red build** — 7 failing
assertions in `google-ingest.test.ts`, all one cause: `externalId` became the
thread id and the fixtures assume per-message identity. It did not commit, and
handed the sequencing to kb_B1 as an identity question.

**RULING: THERE IS NO TRANSITION TO SEQUENCE. THE PLAN ALREADY PURGES.** Both
lanes were sizing this against the 20 Aug chat transition (textVersion bump +
cursor rewind + re-key). BUILD-5 §0: *"All derived data is purged and everything
is re-pulled, re-synced and re-indexed."* The 436 message-keyed email sources are
DELETED and re-pulled under thread identity — no rewind, no re-key, no
compatibility window. So the seven reds are FIXTURE UPDATES that B2 owns, not a
migration to hand B1. Two lanes were solving a problem the plan had already
decided not to have; neither had re-read §0.

**kb_B2's `google-api.ts` finding is real and BIGGER THAN IT REPORTED IT.**
Confirmed at :1390 — `knownPlaceholder()` returns `threadId: ""` while the real
path at :1424 has `str(data.threadId)`. B2 called it free to fix. It is not. The
placeholder's own comment states the invariant: *"nothing downstream may ever read
it: a placeholder's sortAt sorts before any real cursor."* **That holds only while
a source is a MESSAGE.** Under thread-as-source, a new message in an old thread
CHANGES THE TEXT OF AN EXISTING SOURCE, so every message of a touched thread must
be read — and "we know this id, skip it" stops being an optimisation and becomes a
silent truncation assembling a thread's body from its new messages only.

Passing `threadId` through is necessary and NOT sufficient: the skip's premise
needs re-deciding under the new unit. Given to kb_B1 (identity), **with the
arithmetic demanded BEFORE the decision** — that skip is recent, deliberate spend
work (7a0d928c, 8c3848fe: "stop paying for what it already knows"), re-reading
whole threads costs more than re-reading new messages, and the cap is $5. Eating
the cost is an acceptable answer; not pricing it is not. This is precisely the
failure this log's cost section was written about.

**Pattern worth naming across ticks 8-10: three separate times today a lane has
been about to solve a problem that a document already answered** — the audit
kb_B1 and kb_B2 both believed was missing, the purge ruling above, and the $10
cap. In each case the document was right there and stale-looking or assumed-read.
A hub that only answers the questions asked will keep missing these; the answer is
to re-read the plan against each report rather than against memory.

## Tick 11 — 10 Sep 2026, ~21:55

**THE FENCE IS TWO CLAUSES AND EVERY LANE — AND I — HAD BEEN TREATING IT AS ONE.**
Found by reading `knowledge.ts` rather than any lane's summary of it:

    readerClause(guard, prefix) = ownerClause AND appClause          // :602

There are **THREE** visibility settings, not two: `visibility: r.owner_user_id ?
"private" : r.visible_to_app_id ? "app" : "team"` (:521). The middle one is the
app tier — "the middle setting the module was missing (12.3)" — riding `app_staff`
rather than a parallel access-control table. **kb_B1's `Sighting.shelf` is
`"private" | "team"` and kb_A's CHECK allows only those two, so the app tier has
no shelf.** `teamVisible(s) === true` therefore does NOT mean "the team may read
this"; it means "no owner blocks it".

**Three consequences sent to kb_B1, in danger order:**

(a) **`team_visible` must never become the authoritative answer.** The
architecture already separates narrowing from deciding, in R26's own words in
`readerClause`'s doc comment: `knowledge_terms` carries `owner_user_id` and
DELIBERATELY carries no app, because the index NARROWS and the team's database
DECIDES — a restricted chunk may reach the candidate pool and cost a passage its
place, but not an answer, because the read-back joins `knowledge_sources` with the
full clause. So the stored flag is a narrowing aid of the same species as the
existing denormalised `owner_user_id`. An optimiser who later trusts the flag and
drops the read-back join silently bypasses the app fence. To be written into the
flag's own doc comment.

(b) **The fold has a SECOND one-column-two-values fault nobody had looked at.**
Two sources folding, one with `visible_to_app_id = X` and one NULL: NULL widens
(app-restricted becomes team-readable), X narrows. Asked kb_B1 to MEASURE it the
way it measured the calendar — and to record a zero as "a case the design must
still decide", not "a case that does not exist", because the calendar taught us
"surely rare" and "100% of them" can be the same question.

(c) **kb_B1's equality proof is sound and narrower in scope than it reads.** It
pins `teamVisible` to `readableBy` — both its own functions, in its own model. It
does NOT pin `readableBy` to the fence live today. There is no backfill: I grepped
0073 for `INSERT INTO knowledge_sightings` and found none. Under the purge that
may be moot (rows re-pulled, sightings written fresh) — but it must be SAID rather
than assumed. An internally consistent proof over a model nobody tied to reality
is exactly what a fresh reviewer should catch.

**Ruling unchanged, third condition added:** the app fence survives, and the flag
is documented as narrowing-only.

**kb_B1 owned its `seen_where` error** and sharpened the reasoning past mine: with
one row per person the Drive lane and the mail lane FIGHT OVER THAT ROW — one
stamps `gone_at`, the other clears it — the `owner_user_id` fault one level down,
in the very table built to fix it.

**MERGED kb_A's SEARCH.md correction** (`823dd03f`, check exit 0). It fixed the
RULE as well as the example — an example a reader copies is half the damage, a
rule telling them to attempt the unbuildable thing is the other half. It flagged
SEARCH.md:197's "per-team FTS5 terms search" misnomer WITHOUT fixing it, correctly:
outside both findings, and fixing every adjacent imprecision is how a doc
correction becomes an unreviewable diff. Follow-up for whenever that fallback is
rewired.

**A NOTE ON MY OWN GREPS, THIRD TIME TODAY.** My first search for the fence
returned nothing and I nearly reported "no backfill, no fence clause" off it —
`--include=*.ts` is unquoted-glob-expanded by zsh and the command had died. Quoted,
it found four files and 27 occurrences. Ticks 5, 9 and 11: a pattern that omitted a
category, a rule too blunt for a compound row, and a shell that ate the flag. An
empty result is the dangerous one.

## Tick 12 — 10 Sep 2026, ~22:20

**THE KNOWN-ID SKIP AND THREAD-AS-SOURCE ARE INCOMPATIBLE, AND THE FAILURE IS
DATA LOSS.** kb_B1 escalated kb_B2's finding and it is worse than either of them
first put it. Verified in the code:

`google-api.ts:22` — `knownIds?.has(id) ? Promise.resolve(knownPlaceholder(id)) :
gmailMessage(token, id, false)`, and `knownPlaceholder()` at :1390 returns
`threadId: ""`.

1. Every known message from every thread groups under ONE key, `""` — not "missing
   from its thread" but all of them together, in one bogus group holding unrelated
   messages from unrelated conversations. On a rewind (exactly what a `textVersion`
   bump creates) that group is not excluded by the cursor and can file as a single
   subjectless source.
2. **Keeping the real `threadId` fixes the grouping and NOT the text.** A
   placeholder carries no body by design — harmless under per-message identity,
   where a skipped message kept its own untouched source, which is what the
   comment above it means by "nothing downstream may ever read it". Under thread
   identity the source is REBUILT, and rebuilding from a subset DESTROYS WORDS
   ALREADY IN THE BASE. Silent, and worst on the rewind.

**RATIFIED kb_B1's fix: the skip becomes THREAD-SHAPED.** Skip a thread only when
none of its messages is new; when any member is new, fetch every member's body.
Gmail's list response already carries `threadId` beside `id`, so "is any member
new" costs no extra call — affordable under $5 — and the saving survives where it
actually lives: threads nobody has touched, which is nearly all of them.

**ROUTED to kb_B2 as a deliberate scope exception**, with the requirement that it
land in the SAME commit as the regroup: a behaviour change and the thing that makes
it safe cannot merge separately. kb_B1 gave B2 explicit consent to move the gmail
kind's `textVersion` bump — a behaviour change and its cursor bump must be atomic,
or there is a window where main files almost nothing and reports itself caught up,
which is what chat measured on 20 Aug 2026. Identity ruling given by B1:
`externalId = threadId`, as chat does it.

**A CORRECTION TO MY OWN TICK-10 RULING.** I told kb_B2 the purge dissolves the
transition. That was about the MIGRATION and it stands. **This is not a transition
bug.** After a purge nothing is known, so the first rebuild is clean; the loss
appears on every SUBSEQUENT sweep, when a thread with one new message rebuilds
from that message alone. Steady state, not cutover — and I did not separate those
two when I answered, which is why B2 nearly shipped it believing the purge covered
it.

**ORDERED ONE MIGRATION, FOUR COLUMNS** (supersedes "generated_only alone"):
`knowledge_sources.generated_only`, and `team_visible` on `knowledge_sources`,
`knowledge_chunks` and `knowledge_terms`. All `INTEGER NOT NULL DEFAULT 0`, and
kb_B1's sentence for why is going in the migration comment: **the safe direction
is the one that costs an answer, never the one that leaks.** Three things required
in the comments because each is a conclusion somebody will otherwise reverse as an
optimisation: `team_visible` is narrowing-only and never authoritative; the terms
copy is deliberately the owner half only, inheriting `readerClause`'s existing
asymmetry rather than a new one; and `generated_only` is recorded at ingest because
building the body destroys the fact.

**kb_E: A-H13 fixed, and its M19 reasoning is sharper than my rule.** "Ticket
record" is a DIFFERENT DOOR, never a candidate for the ≥15-piece transcript check
that produced the left-out list — so unlike H13's pt 2 it is not a competing
source. H13 names two sources of the same KIND, one absent one present; M19 names
one absent transcript plus a live record reachable by tool. Now written into
`kb-exam-merge.mjs`, so the RULE handles the compound case rather than my sentence
about it. gap 8→7, keyed 72→73, mustScore100 16→15.

**Approved kb_E's own flag: tag A-H3 and A-H12/B-H13 `fence`.** Fence coverage must
be ENUMERABLE BY TAG, not findable by reading detail columns — because when the
fence lands, the first question its fresh reviewer asks is "what does the exam
check about this seam?", and a grep must be a complete answer. Expected set of
five; a different number is a finding. Warned that A-X8's owner/Aurora split still
has no persona-aware grading and tagging must not imply otherwise.
