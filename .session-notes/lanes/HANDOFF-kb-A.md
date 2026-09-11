# Handoff — kb_A (team-database schema seam, knowledge-base rebuild)

Written 2026-09-11, at the hub's request, immediately after R68's re-pointing
landed and was pushed. This lane has run 3,600+ turns without compacting;
this file exists so whoever reads next (a fresh kb_A after compaction, or
another lane) doesn't have to reconstruct the history from git log alone.

## Mandate

Own the team-database schema seam for the knowledge-base rebuild
(BUILD-5-knowledge-rebuild.md): the migration ledger
(`workers/tenancy/src/team-schema/migrations.ts`), `scripts/wipe-knowledge.mjs`,
`scripts/rebuild-knowledge.mjs`, and the "Laws of the Base" that police this
subsystem (RULES.md + `shared/rules/registry.ts`). Hard constraints throughout:
never duplicate a column between `team-schema.ts` and the migration ledger,
red-first tests, `npm run check` green, no spawning agents, zero Cloudflare
AI spend, record doubt in commit bodies not just chat.

## Migrations shipped by this lane

- **0073** — the knowledge base rebuild schema: `knowledge_sources`
  (accounts[]/apps[] JSON arrays, shared_with, relevancy_date, and originally
  `identity_key` — since retired, see 0080), `knowledge_sightings`,
  `knowledge_chunks` (context_line/speaker/said_at), `knowledge_names`,
  `knowledge_chunks_fts` (BM25, external-content mode).
- **0074** — `generated_only` column.
- **0075** — `team_visible` denormalized onto `knowledge_chunks`/`knowledge_terms`.
- **0076** — `team_visible` denormalized onto `knowledge_sources` too (three
  copies total: source computes, chunks/terms denormalize — this was disputed
  twice by the hub and confirmed correct both times after independent
  re-verification).
- **0080_identity_key_retired_the_fold_was_never_on_it** — drops
  `identity_key` and its unique index. See "R68" below for why.

Migrations 0077–0079 landed from concurrent, unrelated lanes (internal-rates
removal, account-rate-card removal, a refusal-memory column) — not mine, just
noting the ledger tail so nobody double-claims a number. **Always `git fetch`
and re-check the tail before claiming the next migration number** — there is
no lock, and this rebuild hit two numbering collisions with concurrent
sessions (see "Law numbering" below).

The ledger is strictly append-only. Never edit a shipped migration; fix
forward with a new one.

## FTS5 / external-content gotcha (load-bearing, easy to re-break)

`knowledge_chunks_fts` uses **external-content mode**
(`content='knowledge_chunks', content_rowid='rowid'`) rather than a
`CREATE TRIGGER`-based sync, because `shared/workers/d1-rest.ts`'s
`d1ExecScript`/`splitStatements` is a naive semicolon-splitter with no
`BEGIN`/`END` awareness — a trigger works fine in a `node:sqlite` unit test
(green!) and is fundamentally unusable through this repo's real migration
executor (a "green test proving the opposite of the truth"). Application
code must sync the FTS table itself. Two consequences that bit me and will
bite the next person:
- A full wipe needs the `'delete-all'` FTS5 command; a plain `DELETE FROM`
  on an external-content table after the base rows are already gone is a
  **silent no-op**.
- Readback verification needs `'integrity-check'`; a row count on an
  external-content table is meaningless (it reads through `content_rowid`).

## Law history on this seam

- Laws were originally numbered R65 in this lane's own work, then collided
  with main (which already had R65/R66/R67 from concurrent lanes) →
  renumbered to R68. Then collided a SECOND time with the hub's own new R69,
  minted concurrently. Both collisions required manual git-conflict
  resolution across the RULES.md/registry.ts/test pair. The hub's own
  resolution of the second collision briefly put a duplicate-key bug on
  `main` (two law objects concatenated into one malformed literal) — caught
  by checking out `origin/main` directly and running `npm run check`
  (`eslint(no-dupe-keys)`), reported with exact line numbers, fixed by the
  hub in `d308ddfb`. **Lesson: verify a merge against `origin/main` directly,
  never trust the merge commit message alone.**

- **R68, "one identity per source", was re-pointed today (2026-09-11), not
  dropped.** Full story, in case the next reader wonders why `identityKey()`
  is gone: 0073 built a new column (`identity_key`) and a new unique index
  to enforce "one identity per real-world thing, reader stripped." That
  sentence was correct but the mechanism was redundant — migration **0012**
  (sixty-one migrations earlier) already had a UNIQUE PARTIAL index,
  `idx_knowledge_sources_origin` on `(origin_table, origin_row_id)`, and the
  real fold (`knowledge-ingest.ts`'s `ON CONFLICT (origin_table,
  origin_row_id)`) has always keyed on THAT pair, never on `identity_key`.
  `grep -rn "identity_key" workers/content/src/` found exactly two hits,
  both comments — nothing ever wrote the column. Clause (ii) of the old law
  (does anything write `identity_key` without the seam) was checking a
  population of zero: a vacuous census. The naive replacement the hub first
  proposed ("does a file exist with the right ON CONFLICT") would have been
  vacuous a *second* way — there's exactly one shared upsert function, so of
  course one file has it. I proposed reframing it as a per-row census over
  all three `INSERT INTO knowledge_sources` sites under
  `workers/content/src/` — does anything that *claims* an origin
  (`origin_table` in its column list) skip the fold it obligates — and the
  hub accepted that over its own narrower instruction. Migration 0080 drops
  the column and its index (DROP INDEX before DROP COLUMN — verified against
  real SQLite that the reverse throws). `identityKey()` is deleted from
  `workers/content/src/lib/knowledge-identity.ts`.
  New test (`workers/content/test/one-identity-per-source.test.ts`)
  mutation-proves both directions: breaking the compliant site's
  `ON CONFLICT` target → red; adding an unfolded origin claim to an exempt
  site → red (the one that actually matters, since it proves the rule
  decides a row rather than counting a population). RULES.md and
  `shared/rules/registry.ts` both carry the re-pointed text — checked
  line-by-line for wording match, though `registry-integrity`'s test only
  checks that law **ids** agree between the two files, not the prose, so
  this needs a human/reviewer re-check if either file is touched again.
  Pushed as `fix/kb-identity-write` @ `f5d82094`, rebased clean onto
  `origin/main` @ `de35082e`, `npm run check` exit 0.

- **`event_id`/`event_id_from`** (migration 0070, not mine but load-bearing
  context for this seam) is a *cross-reference*, not a merge: a calendar
  entry, a meeting-mirror doc, and a mail notice about ONE real meeting stay
  three separate `knowledge_sources` rows (different `origin_table` values:
  `google_calendar`/`google_drive`/`google_gmail`), linked by `event_id`.
  Don't confuse this with the origin-fold (which collapses *duplicate
  sightings of the same origin row*, e.g. two readers sharing one Drive
  file) — they solve different problems and both are real.

## The "vacuous census" pattern (worth carrying forward)

The hub named this pattern after it recurred repeatedly across the whole
rebuild: a check whose population is empty or forced-by-construction passes
for the wrong reason. Named instances: "a ceiling derived from the code it
checks, an equivalence whose empty case was trivially true on both sides, a
loop over a collection that became empty, the right assertion on the wrong
field, and a privilege path with no test at all." R68's old clause (ii) was
this pattern; worth asking of any new census-style law before shipping it:
*what is the population, and could it be empty or trivial by construction?*

## Current branch state

`fix/kb-identity-write`, pushed, `f5d82094`, rebased onto `origin/main`
`de35082e`. `npm run check` exit 0 on the rebased tree. Working tree clean.
Full raw mutation-proof output (migration test, both mutations red, both
restores green, final check) was sent to the hub (`planner`,
`local_af810ae5-ee94-434f-ab8e-df47e44db6b6`) in the same turn this file was
written — that message is the canonical record if this session compacts
before the hub acts on it.

## Open items / not done by this lane

- `scripts/rebuild-knowledge.mjs` was reviewed as a reader (never run —
  zero Cloudflare spend constraint) earlier in the session; no outstanding
  concerns were filed against it at that time, but it has not been
  re-reviewed since the R68 re-pointing landed. Worth a fresh look if
  anything downstream depends on `identity_key`'s presence (it shouldn't —
  the census in this branch confirms nothing writes it — but the script
  itself wasn't re-grepped in this pass).
- DATA-MODEL.md went stale repeatedly during this session as concurrent
  lanes' work landed live faster than docs could track it. Always re-grep
  against current `origin/main` immediately before writing any "as of
  [date]" claim in a doc; treat every such paragraph as liable to go stale
  by the next lane's merge.

## Hard rules that governed this whole session (still standing)

No spawning agents. Zero model spend on Cloudflare (no AI calls, no
embeddings, no `agent_chat`) — cap is $5 total, at $0. Every Cloudflare
command takes `cf-exec`, reads only, no deploys, no staging writes.
`npm run check` read by exit code, never by grepping output. `git add` after
the last edit, or commit with `-a` — the gate reads the working tree, the
commit ships the index; a mismatch here cost a red `main` once already.
Every folder created lives inside this project (`.worktrees/<lane>` for a
worktree, nothing on the Desktop or in `~/`). Migration ledger is
append-only. Report to the hub with raw command output, not conclusions
alone.
