# REPORT — kb5 · the knowledge base reads whole documents

**Branch** `fix/knowledge-reads-whole-documents` · **commit** `8153a8e5` · off `96a8f829`
**Worktree** `~/kwapso-lanes/kb5` · **gate** `npm run check` EXIT=0
**Coordination** session 3 (`syncguard`, `aae6a92a`) is in `google-read.ts`; this lane is in
`meetings.ts` / `google-transcript.ts` / `google-autopilot.ts`. No overlap, nothing duplicated.

---

## LEAD WITH THIS — the layer I was told was broken is fine, and the one called "works" was not asked about

The brief's stated belief was that **layer 1 is broken**: the Drive door exports every
Google-native file as `text/plain`, so the reader must be losing content, and R42 forbids a door
choosing its own reader anyway.

**The plain-text export returns EVERY tab. The reader is fine, and I did not change it.**

The words were being lost one lane over, in a place nothing in the brief pointed at: the
**meeting transcript capture**, which reads the Gemini notes document once and treats whatever it
got as final for ever. On the owner's own test meeting it got **2½ minutes of a 61-minute call**.

---

## PHASE 1 — the five-layer verdict, measured BEFORE any change (at `96a8f829`)

| # | Layer | Verdict | Evidence |
|---|---|---|---|
| 1 | **READ** | **GREEN — the brief's hypothesis is refuted** | `export?mimeType=text/plain` on the test document returns **all three tabs**: `✍️ Quick notes` (line 1), `📝 Full notes` (line 70), `📖 Transcript` (line 159), ending "Transcription ended after 01:01:00". 73,141 characters. Confirmed through **two independent Google read paths** that agree. |
| 2 | **CHUNK** | **GREEN — never examined before, examined now** | Shipped `chunkText` run in Node on that exact text: **88 chunks**, 72,174 of 73,141 characters retained (the rest is whitespace collapse), every tab present. Ceilings do not bite: `DRIVE_TEXT_CAP` 100,000 > 73,141; `MAX_CHUNKS_PER_SOURCE` = 2,334 > 88. |
| 3 | **EMBED** | **GREEN — never examined before, examined now** | Staging's row for that document: 88 chunks, **`no_vector = 0`**, and the inverted index carries `zapier`×16, `paddlebase`×5, `cloudflare`×7, `placement`×11, `hobo`×3. |
| 4 | **RETRIEVE** | **AMBER — honest over a corrupted corpus** | Reproduced the symptom exactly. The **vague** question cites two bare `⏩ Week planning` records and misses the document; the **three specific** questions all cite the document correctly. Retrieval is ranking honestly; the corpus contains a stub twin that outranks the real material because the stub is shaped like a summary. |
| 5 | **ANSWER** | **GREEN — as reported** | Not re-measured (composing costs a model call). Layer 4's evidence is upstream of it and is where the fault is. |

### What the export actually returns (the owner's challenge, settled)

He asked: *"even if you receive everything from a Google Sheet or a document in plain text, you
still get the full data, right?"* — and he is right twice over. Richness does not matter, **and
completeness is not lost either**. The brief's fork said: if the export returns every tab, say so
plainly, do not change the reader, and report where the words are being lost instead. That is
this report.

`workers/content/src/lib/source-readers.ts` genuinely declares no Google-native type, and
`google-api.ts:694` genuinely branches inline on `mimeType.startsWith("application/vnd.google-apps")`.
**That is a declaration gap, not a defect** — the behaviour it produces is correct and complete.
Adding four table entries would have been a change that measured as an improvement and fixed
nothing, which is the exact pattern the brief sent me to break. I left it alone and am naming it
here so the next person does not "fix" it either.

---

## WHERE THE WORDS WERE ACTUALLY LOST

`⏩ Week planning`, 2026-09-07, ran as **two Meet sessions on one calendar entry**, so Gemini
wrote **two** notes documents:

| document | created | last modified | size |
|---|---|---|---|
| `1xzt7sZZ…` "…**11:00** CEST" | 09:05:24 | 09:05:**27** | 4,159 bytes |
| `1UDYSA1A…` "…**11:28** CEST" | 10:33:45 | 10:48:55 | 1,165,858 bytes |

The first was abandoned **3.7 seconds after creation** and never touched again. Route 1 of the
hunt took the **first matching attachment**, the sweep captured it at 09:16:53, stored **1,179
characters** ending `Transcription ended after 00:02:30`, and stamped `transcript_captured_at` —
the column whose own comment says it means *"do not look again"*. The other 58 minutes never
entered the base through that door.

They were not lost from the product: the Drive lane filed the fuller document separately as a
`document` source. So **the conversation is in the base twice over, and the MEETING holds the
stub** — and a vague question lands on the stub.

**What that costs a reader**, measured through the shipped retriever: the second passage returned
for *"What did we agree in the week planning meeting?"* is that stub — a placeholder whose entire
content is *"A summary wasn't produced for this meeting"* and *"Transcription ended after
00:02:30"*. A citation slot spent on a row that says nothing.

**Why 74 previous fixes missed it.** The last repair in this exact function fixed the neighbour:
a transcript of **zero** characters used to tick a meeting held, so the hunt now proves a
candidate is readable before claiming it. That is a test of *"are there words"* — and it **passes
on two minutes of them**. Empty and incomplete are indistinguishable to it. Empty was mended;
incomplete outlived the mend, under a green build, for as long as the column has existed.

---

## PHASE 2 — the diff

`shared/workers/limits.ts` · `google-autopilot.ts` · `google-transcript.ts` · `meetings.ts` ·
`routes/meetings.ts` + two test files. **471 insertions, 14 deletions.**

1. **Route 1 keeps the fullest attachment, not the first.** `.find` → filter every matching
   attachment and keep the one with the most words. A false start and a real transcript are the
   same shape — readable, correctly titled, written after the meeting began — so length is the
   only thing that separates them.
2. **"Captured" now means WE HAVE WORDS, not WE ARE DONE.** A captured meeting re-runs the
   **hunt** and keeps the result only if it holds more of the conversation.
3. **The sweep re-offers a captured meeting** while it is inside `TRANSCRIPT_SETTLE_HOURS` (6) of
   its own **start**.

**The first version of this fix was wrong and the measurement caught it.** I originally re-read
the stored `transcript_file_id`. That document was abandoned — a re-read returns the same 4,159
bytes for ever **and reports success**. It would have looked like a fix and measured like one.
That is why it is a hunt.

**In-rule:** R17 — `LENGTH(?) > LENGTH(COALESCE(transcript_text,''))` rides the UPDATE, so a
settled document moves zero rows (no activity line, no ping) and there is no read-then-write
window; longer-never-shorter also stops a timed-out read replacing an hour with two minutes.
R1 — `refreshed` is a separate flag from `captured` so the door pings `meetings` **without**
pinging `work_logs`; nobody is billed twice. R10/R20/R42 untouched. Bounded twice:
`TRANSCRIPT_SWEEP_PER_PERSON` per tick, and a barren refresh spends an attempt against
`TRANSCRIPT_ATTEMPT_CAP`, so a settled transcript is left alone after eight quiet tries.

### Mutation proof — every invariant bites

| mutation | red |
|---|---|
| restore the early `return nothing(...)` | 2 |
| defeat the LENGTH predicate (`>= 0`) | 3, incl. an **existing** R1 assertion |
| route 1 back to first-match | 2 |
| remove the settle window from the sweep's SELECT | 1 |

---

## PHASE 1 vs PHASE 2 — the same table, re-measured on `8153a8e5`

| # | Layer | Before | After | What moved |
|---|---|---|---|---|
| 1 | READ | GREEN | GREEN | Untouched by design. |
| 2 | CHUNK | GREEN | GREEN | Untouched. |
| 3 | EMBED | GREEN | GREEN | Untouched. |
| 4 | RETRIEVE | AMBER | **AMBER on staging, GREEN in the fixture** | Retrieval code unchanged; the bench returns byte-identical results because staging still holds the stub. The **corpus** fault is fixed at its source and proved end to end. |
| 5 | ANSWER | GREEN | GREEN | Untouched. |

---

## THE THREE PROOFS THE BRIEF REQUIRED

1. **"The test document round-trips with every tab's content present."** ✅ Proved, and it already
   did before my change — 73,141 characters across all three tabs out of Google, 88 chunks in,
   88 chunks and 0 missing vectors on staging.
2. **"A file that cannot be read sits in the same folder and everything else still syncs."**
   Session 3's `aae6a92a`. Coordinated, not duplicated.
3. **"The week-planning question is asked again and the answer cites the DOCUMENT."**
   **Partially, and I will not overstate it.** The fixture end-to-end suite reproduces the exact
   two-document shape and proves the whole hour lands on the meeting and is answerable. On
   **staging** the bench still cites the stub, and will until the fix is deployed and a tick runs
   — which this lane is not authorised to do. The three specific questions already cite the
   document today; the vague one will stop citing a placeholder once the meeting row holds the
   words.

---

## WHAT I COULD NOT MOVE, HONESTLY

- **The three meetings already frozen on staging** (`⏩ Week planning` 7 Sep, `HOGO: Workflow
  optimisation sync` 31 Aug, `HOGO: Quick sync` 13 Aug) are outside any honest settle window.
  They are repaired by **pressing the meeting's own transcript button**, which now re-hunts —
  the case `TRANSCRIPT_HORIZON_DAYS`' own comment already reserves for it. I deliberately wrote
  **no repair script**: an unrun script is not a control, and I could not have run one anyway
  (minting a Drive token needs Google secrets I must not read).
- **Layer 5 not re-measured.** Composing costs a model call.
- **The duplication itself.** The same conversation exists as a `meeting` and as a `document`
  (31 such title-prefix pairs among live documents). Fixing the stub removes the *harm*; folding
  the twins is a separate, larger decision and I did not take it unasked.

## UI / UX / BUSINESS LOGIC CHANGES THE OWNER MUST BE TOLD ABOUT

- **The transcript button is no longer one-shot.** Pressing it on a meeting that already has a
  transcript now re-hunts and takes a fuller document if one exists. It still cannot log anyone's
  hours twice and it cannot replace a longer transcript with a shorter one.
- **A new activity line** can appear on a meeting: *"…read more of the transcript of X — a fuller
  record of the call had been written since it was first read."* No new English elsewhere, so no
  catalogue change (R28/R33/R44 untouched — activity descriptions are composed server-side and
  were already outside the catalogue).
- **A little more Google traffic**: up to eight extra hunts per meeting during the six hours after
  it starts, then never again.

## GATE

`npm run check > /tmp/kb5-gate.log 2>&1; echo EXIT=$?` → **EXIT=0**

| workspace | Test Files | Tests |
|---|---|---|
| auth | 21 | 224 |
| tenancy | 75 | 982 |
| content | 90 passed, 1 skipped | 1,180 passed, 3 skipped |
| data-ops | 40 | 422 |
| mcp | 13 | 599 |
| realtime | 5 | 90 |
| gateway | 11 | 100 |
| portal-gateway | 2 | 49 |
| web | 142 | 1,202 passed, 8 skipped |
| portal-web | 12 | 96 |
| **total** | **411 files (1 skipped)** | **4,944 passed, 11 skipped** |

The 11 skips are the known worktree-thinner suites (git-ignored `glide/normalised.json` and
`web/out`), not anything this change touched.
