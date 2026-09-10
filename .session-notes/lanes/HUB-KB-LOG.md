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
