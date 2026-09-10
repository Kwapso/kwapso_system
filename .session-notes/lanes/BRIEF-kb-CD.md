# LANE kb_CD — the index, then the loop

You are **kb_CD**, a build lane on the kwapso knowledge-base rebuild. A separate
Opus **hub** session owns the plan, writes briefs, merges and runs the gate. You
build. Report to the hub; the hub merges.

**YOU MAY NOT SPAWN AGENTS. EVER.** No Agent tool, no workflows, no subagents. If
the work is too big, say so and stop. One session, one lane.

---

## 0 · Setup (run this first, exactly)

```
cd /Users/alaap_kanchwala_apple/Desktop/kwapso_cpaa
git fetch origin
git worktree add .worktrees/kb-cd -b fix/kb-index origin/main
cd .worktrees/kb-cd
npm install
npm run check          # must be exit 0 before you change anything
```

**Every folder you make lives inside this project.** The owner's rule, verbatim:
*"any and all folders you make will be within your parent folder, which is
Kwapso_cpaa on the desktop. Anything else that you try to create elsewhere will be
deleted. If that's stopping your work, too bad."* Your worktree is
`.worktrees/kb-cd` (git-ignored). Scratch files go under the project. Nothing on
the Desktop, nothing in `~/`.

## 1 · Read before you build

- `CLAUDE.md` — the Laws of the Base. R10 gating, R14 bounded/paged, R19/R22/R27
  agent parity, R20 validation, R23 cited answers, R26 vector fence, R56 one read
  per door. A change that breaks a law turns the build red.
- `.plans/BUILD-5-knowledge-rebuild.md` — the plan. §4 is your Stage 1, §5–§6 your
  Stage 2. §0 is the ruling: **all derived data is purged and re-pulled**, and AI
  spend during the build is capped at **$5**.
- `.plans/KB-AUDIT.md` — §3 (why paraphrases refuse — the highest-value fix),
  §4.2 (the router hijacked by ordinary words), §4.4 (the lexical arm has no IDF),
  §4.5 (recency), §4.6 (reranking), §4.7 (questions retrieval cannot answer).
- `.session-notes/lanes/HUB-KB-LOG.md` — every ruling made so far, and why. Read
  ticks 8–12; they will save you a day.
- `documents/COSTS.md` and `documents/SEARCH.md`.

## 2 · What already landed (do not rebuild it)

On `main`: migration 0073 (identity, sightings, name index, `knowledge_chunks_fts`
as **external-content FTS5, no triggers**), 0074 `generated_only`, 0075
`team_visible` on chunks and terms. `shared/workers/credits.ts` `TokenUsage` is the
one usage shape. `workers/content/src/lib/knowledge.ts` has `readerClause =
ownerClause AND appClause` — **the fence is two clauses, and there are three
visibility settings, not two.**

**Not yours, and being built in parallel — do not touch:** `knowledge-identity.ts`,
`knowledge-summary.ts`, the fence write path, `google-read.ts`, `google-api.ts`,
`knowledge-text.ts`, `scripts/kb-exam*.mjs`.

## 3 · STAGE 1 — the index (BUILD-5 §4). Stop and report when done.

1. **FTS5 BM25 replaces `knowledge_terms` as the lexical arm.** The table exists
   (`knowledge_chunks_fts`, external-content, `content='knowledge_chunks'`). It has
   **no triggers and cannot have any** — `splitStatements` in
   `shared/workers/d1-rest.ts:593` has no BEGIN/END awareness, so a trigger body
   shatters at its inner `;`. Application code keeps it in step. `DELETE FROM` on an
   already-empty external-content table is a **silent no-op**; use `'delete-all'`,
   and `'integrity-check'` for readback.
2. **Fusion re-measured.** The audit's "hybrid doesn't help" rests on a strawman —
   the keyword arm had no IDF and was muted to 0.1. Re-measure RRF with a real BM25
   arm before choosing weights. Show the arithmetic.
3. **The name index.** `knowledge_names` (kind, ref_id, name, alias_of,
   compartment) exists and is empty. Populate it, and use it to fix §4.2: ordinary
   words must stop hijacking the client filter. "What solutions have we proposed
   for data import?" must NOT narrow to VU Solutions; "Paddlebase" and "Asekurans"
   MUST resolve. The route sentence says which account it named, or that it named
   none.
4. **R26 is not negotiable:** every Vectorize call passes `namespace: guard.teamId`,
   `returnValues:false`, `returnMetadata:"none"`, and every passage is read back out
   of D1 under the caller's own fence.

**STOP HERE. Report to the hub. Do not start Stage 2 without its go-ahead.**

## 4 · STAGE 2 — the loop (BUILD-5 §5–§6), only after the hub says go

Planner → fan-out (**hard cap 12**) → fuse → **reader re-reads the shortlist**
(Kimi K2.6 on Workers AI) → decide → write. Plus: tool routing for counting
questions (§4.7 — counting is not a retrieval problem, it goes to the record
tools); recency on intent; **thinking steps streamed to the screen**; a refusal log
with its shortlist; and metering into the AI allowance.

The answer seam is R23's `knowledgeAnswer` — `found`, `passages` and `citations`
are ONE decision in ONE place. No door assembles that response by hand.

## 5 · How to work

- **Test first.** Write the failing test, watch it fail *for the right reason*,
  then make it pass. A green test asserting the wrong intent is worse than none.
- **Test the case you think it MISSES**, not the one you built it for.
- **Measure before you claim.** Every number in a report carries the population it
  is over. Three lanes have had an arithmetic error caught today.
- **`npm run check` must be exit 0** — read the exit code, not the output. A suite
  that fails to LOAD reports green.
- If a hub instruction contradicts the code, **the code wins — say so.** Three
  hub rulings have been overturned by lanes today and every one of them was right.

## 6 · Cost

**You are on the hub's $5 cap and you may not spend against it without asking.**
Embeddings and re-ranking are real spend. Before any run that calls a model:
report what it will cost and wait. Ingestion usage is recorded through
`shared/workers/credits.ts`'s `TokenUsage` so `scripts/ai-spend.mjs` can price it —
use that shape, do not invent one. **The Gmail sweep's meter is CALLS, not
dollars** (COSTS.md:271); the AI meter is neurons. Do not mix them.

Every lane so far is at **$0**. Stage 1 should also be $0 except for measurement
runs you have cleared with the hub first.

## 7 · Reporting

Report to the hub session (titled **planner**/hub, cwd `kwapso_cpaa`) with
`mcp__ccd_session_mgmt__send_message`. Include: branch + sha, `npm run check` exit
code, what you built, what you MEASURED with populations, what you refused to
guess, and what you are blocked on. Push your branch; the hub merges.
