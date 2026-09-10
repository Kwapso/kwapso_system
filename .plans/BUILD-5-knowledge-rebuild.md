# BUILD-5 — the knowledge base, rebuilt

Decided by the owner on 10 Sep 2026 from the audit (`.plans/KB-AUDIT.md`) and the briefing
round (`planning-answers/kwapso-kb-final-round-alaap-k-2026-09-10.json`). This is the
handover document. Hub-and-spoke: ONE Opus planner (the hub) owns this file, writes lane
briefs, merges, and runs the gate. Sonnet lanes build. No lane spawns an agent. Ever.

Supersedes `.plans/BUILD-2-knowledge-base.md` and `.plans/BUILD-4-knowledge-retrieval.md`.

---

## 0. The ruling, in one paragraph

Rebuild the knowledge module from scratch, inside the base. The base — permission fence
(R26), gating (R10), validation (R20), the laws in `shared/rules/registry.ts` and every
seam test — is the CONTRACT the new code must satisfy; none of it is rewritten. All derived
data is purged and everything is re-pulled, re-synced and re-indexed. Cloudflare AI spend
during the build is capped at **$10**, measured on our workers only. Nothing ships to
production until the new exam passes on staging and the owner has asked it his own
questions by hand.

---

## 1. What changes, step by step

For each of the nine steps: what the owner asked · what the audit found · what was broken ·
what we build. (Ahead / level / behind = against Glean, Dropbox Dash, NotebookLM, OpenAI.)

### 1 · Collect
- **Asked:** three lanes (upload, app records, per-person Google); video transcripts;
  compartment per account with sub-compartment per app; one copy of a source tagged with
  every account/app it concerns; owner ≠ shared-with; Gmail shared with agency by default.
- **Found:** no Google material was ever filed to a client; two of three connected people
  contributed nothing; the `app` label already exists in the index (filing never used it).
- **Broken:** filing; multi-person duplicates (one Google item = one source per person).
- **MEASURED 10 Sep, and it corrects the audit's own headline.** KB-AUDIT §4.1 says
  "dedupe on content hash at ingest — removes ~10% of the index". The finding
  reproduces (925 of 9,921 live chunks are exact copies, 9.3%); the FIX does not
  reach it. A source-level content hash reaches **114 of 3,933 sources, 2.9%** —
  about a third — because most repetition sits INSIDE sources whose whole texts
  differ. An identity is a source-level key BY CONSTRUCTION, so lane B1 cannot
  deliver the 10% and nobody should carry that number to the gate. The remainder
  needs a CHUNK-level key (lane C). Two blocks, each needing a different key:
  email+email 668 chunk pairs (182 of 436 live mails), document+meeting 582 chunk
  pairs (20 documents, 15 meetings). Of the mail block, a source content hash folds
  the larger part and the RFC-822 header is required for the rest — the exact split
  is being re-derived (B1's report 2 gave 125/84 against a population of 182, which
  does not add up and is not yet settled). Title+date is the WEAKER key (reaches
  112 where the hash reaches 125): if only one is built, build the hash. And
  `event_id` does NOT express the meeting fold though it looks as though it should
  — coverage is event 66/66, meeting 47/122, email 30/436, **document 0** — because
  a Gemini notes MAIL is not a calendar notice and Drive files carry none.
- **Build:** one gate, one identity per thing (Google id / message id / event id / content
  hash); sightings table; sources carry `accounts[]`, `apps[]`, `owner`, `shared_with`
  (private · agency · agency+client); named folder/space → account confirmed once by a
  person; YouTube captions first-class, Loom/Tella best-effort, no Whisper. → **level**

### 2 · Split into pieces
- **Asked:** every piece carries source id, container, relevancy date; chat = who said what
  when; sheets = one document per tab.
- **Found:** size right (~225 tokens), zero context; transcripts' pieces orphaned.
- **Build:** context line per piece (cheapest capable model); chat pieces = runs of
  messages with speaker + time; mail thread = source, message = piece; sheet tab = source
  with the header line prepended to every piece; relevancy date = happened-at for frozen
  things, last-change for living things. → **level**

### 3 · Meaning into numbers
- **Found:** bge-m3 is right (bilingual, 8k context, cheap). Keep.
- **Build:** nothing new except the tenth Vectorize label: `shared_with`. Label budget is
  now spent; documented in BOOTSTRAP.md and pinned by `vector-indexes-mirror.test.ts`.
  → **level**

### 4 · Search twice, at once
- **Asked:** parallel searches, a master index of proper nouns.
- **Found:** keyword arm had no IDF (strawman, then muted to 0.1); router hijacked by
  ordinary words ("solutions" → VU Solutions); record stubs winning slots.
- **Build:** FTS5 BM25 in D1 replaces `knowledge_terms`; RRF fusion re-measured on the new
  exam; the **name index** (accounts, apps, contacts, colleagues, aliases, misspellings →
  kind + id + compartment) replaces `accountNamedIn`; records become find-only **cards**
  (title, summary, account, app, date) never quoted; planner fans out up to 12 branches.
  → **level**

### 5 · Re-read the shortlist
- **Found:** none; the only on-platform reranker measured worse than nothing.
- **Build:** Kimi K2.6 (Workers AI) reads the shortlist against the question, keeps the
  best, drops look-alikes. Owner's trade: stays on Cloudflare, under a cent a question.
  → **behind on model ceiling only**

### 6 · Decide honestly
- **Found:** fixed 0.50 cosine line discarded correct #1 results (0.444).
- **Build:** the reader decides after reading; a low absolute score (~0.30) only guards
  nonsense; thin material → answer and say what is missing; every refusal logged with its
  shortlist. `found` still settles in ONE seam (R23). → **ahead**

### 7 · Answer with receipts
- **Found:** good. Keep.
- **Build:** receipts also say which path answered (index / records); answer in the asker's
  app language; the loop's steps streamed to the screen while it runs. → **level**

### 8 · Send the odd ones elsewhere
- **Found:** counting questions answered from two random tickets — invisible failure.
- **Build:** planner classifies; counting / ranking / "across clients" → record tools,
  receipt = the list itself; no tool can answer → says so. App records are read live,
  Google is never read live. → **level**

### 9 · Mark the homework
- **Found:** 22/22 bench, title-anchored; every constant tuned against it.
- **Build:** the **exam**: 60–100 questions drafted by an agent that never sees titles, the
  owner's eight failed questions mandatory, every row tagged (paraphrase · German · counting
  · latest · absent · multi-hop · person) and keyed to the source id(s) that answer it;
  graded deterministically by id-in-shortlist; no model judges. Ships as
  `scripts/kb-exam.mjs`; `npm run check` fails if the score drops. Old bench kept as a
  regression guard only. → **level**

### The seven the nine missed
10 Permissions — re-checked against live D1 every read → **ahead**. 11 Freshness — 15-min
cron → level. 12 Provenance/dedup — sightings → **ahead**. 13 Query understanding — planner
+ name index → level. 14 Ranking beyond similarity — recency on intent only; engagement
signals out of scope (no usage data yet) → behind, deliberately. 15 Observability & cost —
per-question trace, refusal log, spend drawn from the existing AI allowance with a monthly
cap (€50) → level. 16 Conversation memory — the loop runs inside the assistant thread so
follow-ups carry; verified in Lane D → level.

---

## 2. The lanes

Every lane: own worktree off `main`, Sonnet, ONE seam, test written red first, ends with
`npm run check` green, commit body records any doubt, forbidden from spawning agents or
touching another lane's files. The hub merges in the order below and runs the exam after
each merge that touches retrieval.

| Lane | Owns | Depends on |
|---|---|---|
| **Hub** (Opus) | This file, the design note, lane briefs, merges, the gate, COSTS.md numbers, the $10 meter | — |
| **A · Model** | Team migration: sources (identity, `accounts[]`, `apps[]`, owner, shared_with, relevancy date, sightings), pieces (context line, speaker, time), name index table, FTS5 table; wipe + rebuild script | — |
| **B · Ingest** | The gate; three lanes through it; reader table incl. YouTube/Loom/Tella; chat/mail/sheet grain; context lines; records → cards; Google filing with confirm-once; retire pass | A |
| **C · Index** | Vectorize labels incl. `shared_with`; BM25 build; name-index build + alias generation; re-index job under the cost meter | A |
| **D · Loop** | Planner → fan-out (≤12) → fuse → reader → decide → write; tool routing; recency on intent; streamed steps; refusal log; metering into the AI allowance | A, C |
| **E · Exam** | `scripts/kb-exam.mjs`, blind drafting, owner's eight, tags, keys, gate in `check` | A (ids) |
| **F · Screens** | Source row: compartment / app / sharing controls, pieces + sightings + last-modified view; confirm-once filing dialog; thinking steps in the assistant; latest UI kit | A, D |
| **G · Laws & docs** | Registry: new law "one identity per source" + label budget; R23/R26/R47 entries rewired to the new seams; DATA-MODEL, BOOTSTRAP, COSTS, BUILD-A-MODULE; portal future spec | all |

**Order:** A → (B, C, E in parallel) → D → (F, G in parallel) → purge, re-pull, re-sync,
re-index → exam → owner's hand test on staging → production.

**Honest timing:** 5–7 days of lane time with four lanes in parallel. The exam's 60–100
questions need ~1 hour of the owner's approval time.

---

## 3. The $10

| Item | Model | Estimate |
|---|---|---|
| Re-embed everything, twice | bge-m3 | $0.05 |
| Context lines, ~10k pieces | llama-4-scout-17b | $1.70 |
| Name-index alias generation | scout | $0.10 |
| Exam, retrieval-only grading, unlimited runs | bge-m3 | cents |
| Exam, full-loop, ten runs of 100 | Kimi K2.6 | ~$5 |
| Headroom | — | ~$3 |

Rules: heavy one-off work scheduled across days to ride the daily free allowance; meter
read per worker, not per account (three apps share it); the hub reports spend after every
merge; any lane that will exceed its line stops and reports.

---

## 4. The gate

1. `npm run check` green on every merge.
2. Exam: refusal rows 100% correct; non-refusal rows recall@8 at or above the baseline set
   on the first run after re-index, and never lower on any later merge.
3. The owner asks his eight questions on staging by hand and reads the receipts.
4. Spend under $10.
5. Quality trio (`lean_mean`, `story_checks_out`, `security_sentry`) — the fence gets a
   fresh-eyes review, as the base rules require for anything security-shaped.

---

## 5. Decided for later (documented, not built)

- **Client portal answers.** Clients get answers over material shared with their account;
  they can upload into their own account/app compartment; they own it; it is shared with
  them and the agency by default and they cannot restrict it. Needs its own door, fence
  tests and law entry. The compartment and sharing model above is designed so this is
  additive.
- **Per-person sharing** ("Aurora but not Alex"). Not now.
- **Whisper** for videos without captions.
- **Engagement ranking signals** once there is usage data.
- **A frontier reader** (Claude / Gemini) if the exam shows Kimi is the ceiling — a policy
  decision about text leaving Cloudflare, to be made explicitly.

---

## 6. How to hand this over — paste to the planner

> You are the hub. Read `.plans/BUILD-5-knowledge-rebuild.md`, `.plans/KB-AUDIT.md`, CLAUDE.md
> and RULES.md. Write ONE design note (schema, seams, contracts) and get it approved by the
> owner before any lane starts. Then write one self-contained brief per lane (A–G): it
> must carry its own worktree setup, its exact files, its test to write first, its cost
> line from §3, and the sentence "you may not spawn agents, and you stop and report rather
> than work around a law". Run lanes on Sonnet in the order in §2. After every merge run
> `npm run check`; after every retrieval merge run the exam and report the score and the
> spend. If any number in this plan turns out wrong, say so in the commit body and here —
> never in a lane report alone. Production is owner-gated: you never deploy it.
