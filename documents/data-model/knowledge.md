### knowledge_sources + knowledge_chunks + knowledge_terms + knowledge_ingest + knowledge_sightings + knowledge_names + knowledge_chunks_fts. KEEP (BUILT 2026-08-11, team migrations `0012_knowledge` + `0020_knowledge_vectors` + `0022_knowledge_files`; rebuilt 10 Sep 2026, `0073_the_knowledge_base_is_rebuilt` + `0074_cards_and_the_fence_land_together` + `0075_the_fence_the_fold_cannot_ship_without` + `0076_the_source_gets_its_own_team_visible`, .plans/BUILD-5-knowledge-rebuild.md). THE KNOWLEDGE BASE
One knowledge base, many **compartments**, chosen for the reader rather than by
them. Seven tables, one per job. **This rebuild landed in pieces across several
lanes moving at different speeds, and this section says exactly which parts
are live as of 10 Sep 2026, because a schema doc that reads as a finished
pipeline is how the next person budgets work that no longer exists — or
misses work that already shipped.** LIVE: `generated_only` (the ingest sweep
writes it, retrieval reads it, below); `team_visible` on all three tables it
touches — source, chunks, terms (below); `knowledge_chunks_fts` (written on
every chunk write, read as the actual BM25 scorer — it now REPLACES
`knowledge_terms` for ranking, though `knowledge_terms` is still written
alongside it); `knowledge_names` (rebuilt by its own sweep, read in place of
`accountNamedIn`); and the FOLD itself — Google readers now build
`origin_row_id` from the thing's own id, reader stripped, so the multi-person
duplicate this whole rebuild exists to close is actually closed, on the
ALREADY-EXISTING `origin_table`/`origin_row_id` pair (0012), see
`knowledge_sources` below for why that is a different mechanism from the new
`identity_key` column. NOT YET WIRED: `identity_key` itself (a forward-looking
column nothing writes, see below for why the fold does not need it to work
today) and `knowledge_sightings` — the one-time migration backfill gave
`identity_key` its correct starting value (NULL), and the write paths that
keep both current are separate, in-progress lanes. This paragraph will go
stale FAST — it is a snapshot, not a promise, and whoever
reads it after the next lane merges should re-grep before trusting it. Said
at all because a schema that exists and a capability
that works are two different sentences, and this
document has been the one to conflate them before.

- **`knowledge_sources`**, one row per piece of material the assistant may read.
  Three families in one table, because a person edits them in one list: a `note`
  somebody typed here (the body IS the truth), a `file` somebody uploaded (THE
  FILE is the truth and the body is a READING of it), and a MIRROR of a row we
  already own — `ticket` / `account` / `contact` / `app` / `process` / `sprint` /
  `story` / `meeting` / `todo` / `task`, where the row is the truth and the sweep
  keeps the body in step. **Every table that can carry an account id is on that
  list**, which is the point of it: a question about a client lands on whatever
  the client's world is made of, and until 18 Aug 2026 six of those ten were
  missing — most glaringly the process map, the record that says what we actually
  DO for a client. A kind must also be named in `KNOWLEDGE_KINDS`
  (`workers/content/src/lib/knowledge.ts`), or `toSource` coerces it to `note`
  and every source of it lists and filters as one; `meeting` shipped a reader
  before it was named there, and nothing about that was visible. **`article` is a kind with no
  mirror behind it any more, and deliberately kept:** the Learning module was
  purged on 17 Aug 2026 and its table went with it, but its 41 articles had
  already been indexed here, so the material outlived the module. Dropping the
  kind would orphan those rows, the sweep no longer writes one, nothing reads a
  learning table, and the word is now only what an existing source calls itself
  and what a person filters by to find one. `compartment` is the design in one
  column (`agency`, or `account:<id>`), DERIVED on write and correctable by hand,
  never free-typed. `owner_user_id` is the second fence: NULL = the team's, a
  value = one person's (what THEY can see, through their own connection).
  `content_hash` + `indexed_chunks` are what let the sweep skip a row that is
  both unchanged AND finished, before it costs a model call, the hash says WHICH
  text is being indexed and is stamped at the start of a rebuild, so a source
  whose text changed halfway through starts again rather than finishing a
  document that no longer exists. `summary` is what the record is ABOUT, derived
  from the row itself and never generated (knowledge-summary.ts says why in
  four reasons); it is what a LIST carries instead of the material, because a
  source can be a 300-page contract and a page of fifty of them would be tens of
  megabytes on the way to a screen showing titles. `app_id` / `ticket_id` /
  `sprint_id` / `record_date` are the rest of the notebook a question is routed
  by. `event_id` / `event_id_from` (team migration
  `0070_a_source_says_which_call_it_is_from`) say WHICH CALL a source came from,
  where Google itself said so and nowhere else: one meeting produces a calendar
  entry, several RSVP notices, a Gemini notes document and a "Notes:" mail, and
  before this nothing in the schema could say two of them were about the same
  half-hour — on 8 Sep 2026 the assistant answered about that week's planning
  call from a 1,179-character stub while a 73,141-character transcript sat beside
  it. Three routes fill it and `event_id_from` names which was read, exactly as
  `meetings.transcript_found_by` does beside it: `origin` (a calendar source's
  own `origin_row_id` IS the event id), `meeting` (`meetings.google_event_id`,
  stored since 0012) and `mail` (the `eid=` Google's robot writes into a notice,
  base64url of `"<eventId> <calendarId>"` — read by
  `scripts/backfill-source-events.mjs`, because SQLite has no base64). **NULL is
  a correct answer and most rows keep one.** Measured on staging that day: the
  Gemini notes DOCUMENT states no event anywhere — 0 of 80 live Drive sources
  carry a calendar link, an `eid` or even a Meet link — and neither do the 121
  "Notes:" mails that hold the minutes. Matching those on their title is the one
  thing this must never do; a wrong parent is worse than none, because the base
  then answers confidently from the wrong artefact. It is NOT on the vector: the
  index's ten metadata keys (the tenth, `shared`, spent on `shared_with` — see
  BOOTSTRAP.md §3b) do not include it, so nothing about what is searched
  changed with it (R26). `body_bytes` is how much material there really is, so a screen can say
  "the first part of 412 KB" rather than presenting an excerpt as the whole
  thing. `index_error` is why a source could not be indexed whole, in words,
  nothing here is ever silently trimmed. Deactivating means "stop reading this":
  the row survives, its chunks and its vectors do not, and the sweep will not put
  it back, and a row that leaves the app (an archived ticket, a switched-off
  app) deactivates itself the same way, because the readers now RETURN those rows
  marked `retired` rather than filtering them out, which is what stopped an
  archived ticket answering questions forever.

  **Six columns from the 10 Sep 2026 rebuild (0073, 0074).**
  `identity_key` is ONE identity per real-world thing — Google's own file/
  message/event id, or a content hash for an upload — with the READER who
  saw it stripped out, so the same Drive folder shared with two colleagues
  files ONCE rather than once per person (the fault the rebuild exists to
  close: a Google source's key used to be `<readerId>:<externalId>`, so two
  people's sight of one folder was two rows, each chunked, embedded and
  stored separately). A UNIQUE INDEX enforces it, partial on `identity_key IS
  NOT NULL` because a typed note has no external identity and every NULL is
  its own value to SQLite. Who saw a de-duplicated source, where, and
  whether they still can moved to `knowledge_sightings`, below — a second
  reader is now a second SIGHTING, never a second source. `accounts`/`apps`
  are JSON arrays (additive beside the pre-existing singular `account_id`/
  `app_id`): a shared Drive file or a chat thread can concern more than one
  account or app at once, which a single reference column could not say.
  `shared_with` ('private' / 'agency' / 'agency_client') answers who may
  READ a source once it is in, a different question from `owner_user_id`'s
  "whose personal connection surfaced it" — defaults to 'agency', matching
  Gmail's own default of being shared with the whole agency.
  `relevancy_date` is happened-at for a frozen thing (a meeting, a sent
  email) or last-change for a living one (a Drive doc, a ticket mirror);
  which of a source's several dates that resolves to is an ingest decision,
  not something the column itself enforces. `generated_only` is a source
  saying it produced nothing beyond the sentence the app wrote for it — a
  card, findable but never quotable (KB-AUDIT.md §4.3: a person/account/
  contact stub winning a passage slot over somebody's actual words). It has
  to be set by the READER, at ingest, because building the body is what
  destroys the fact: once free text and a generated sentence are joined into
  one string they are indistinguishable, and a census run later (measured:
  1,309 false-positive tickets) or a kind-level flag (measured: every kind
  the audit named has a reader that folds in real free text; only 22 of
  3,933 sources fold none at all) both failed to recover it. **LIVE, unlike
  the rest of this rebuild** (`workers/content/src/lib/knowledge-ingest.ts`
  writes it per reader, `knowledge.ts` reads it at index time: a card gets
  zero chunks — `chunkText` is never called on it — and keeps only its
  record vector, so the router still finds it and nothing about it is ever
  quotable).

  **`team_visible` (0076) is here too, and it is LIVE — the source is where
  it is COMPUTED, not just another copy of it.** `knowledge_sightings` keys
  to `source_id`, so the fence's team half has to be derived from the
  sightings SET once, and the source row is where that single computation
  naturally lands; `knowledge_chunks`/`knowledge_terms` (0075) then carry
  their own denormalised copies of THIS value, for the same stage-one,
  single-table-read reason `compartment`/`owner_user_id` already do. One
  recompute (`workers/content/src/lib/knowledge.ts`) writes all three —
  source, then every chunk and term the source owns — in one script, run
  whenever a sighting's `shelf`/`gone_at` changes. This was nearly built as
  two copies instead of three: a read-side census of the fence's six
  source-level call sites (`knowledge.ts:644`, `:734`, `:1826`, `:2185`,
  `:2535`, `knowledge-shape.ts:150`) showed they already share one seam and
  could afford a live `EXISTS` against `knowledge_sightings` instead of a
  stored column — a real argument, and the hub ruled on it twice before
  landing here: two copies, then three again once the WRITE side was
  actually built and needed exactly one place to compute from before
  denormalising down. Read-side and write-side reasoning pointed the same
  way from opposite ends, which is why three copies stood.
  `workers/content/test/knowledge-fence.test.ts` proves the recompute can
  actually SEE drift before trusting it to prevent one: a stale-high case, a
  stale-low ("leaking") case, and a clean-corpus case once every source has
  been recomputed.

  **As of 10 Sep 2026, three of these six are LIVE.** `generated_only` and
  `team_visible` — see them, above, where they stop being a plan.
  `shared_with` too, one direction only:
  its value rides onto every chunk's vector as the `shared` metadata label
  (`workers/content/src/lib/knowledge.ts`), though no reader narrows by it
  yet and every row still defaults to `'agency'`, so nothing has actually
  changed what anybody can find — the wire is live, the switch at the other
  end is not.

  **The FOLD itself is now real, one layer down from where this document said
  it wasn't a few hours ago — worth the correction in place, because it is
  exactly the kind of thing a stale doc gets backwards.** `knowledge-google.ts`'s
  Drive/Gmail/Calendar/Chat readers now call `googleIdentity()` and take its
  `originRowId` — the thing's OWN id, reader stripped — for `origin_row_id`,
  so two colleagues naming the same folder build the SAME `origin_table` +
  `origin_row_id` pair and land on the ALREADY-EXISTING partial unique index
  from 0012 (`idx_knowledge_sources_origin`), one row rather than two. That is
  the actual bug 0073 was rebuilt to close, and it is closed. **What is still
  NOT wired is the separate `identity_key` COLUMN this section and R68
  describe** — a deliberate split, per `knowledge-google.ts`'s own comment: an
  earlier draft wrote `identityKey()`'s composite `"table id"` string into
  `origin_row_id` itself, which reads as correct (both come from the same
  function) and is caught only by `origin_row_id` visibly carrying a table
  name inside it. So the fold runs on the ORIGIN pair today; `identity_key`
  remains a forward-looking column with nothing writing it, its own partial
  unique index enforcing nothing yet because nothing is inserted under it.
  `accounts`, `apps` and `relevancy_date` likewise default to the behaviour
  that already existed (`'[]'` / no fold) until the ingest/index lanes reach
  them (BUILD-5-knowledge-rebuild.md's Lanes B–D). `knowledge-identity.ts`
  (`workers/content/src/lib/`) has the
  types and pure functions (`identityKey`, `readableBy`, `stillLive`) that
  work builds on, and holds no database call of its own yet.
- **`knowledge_chunks`**, a readable piece of a source: what retrieval scores
  and what an answer cites. Its id is DERIVED (`<sourceId>:<seq>`, zero-padded),
  which is what lets a vector be overwritten or deleted without a lookup table
  and lets a source that got shorter lose only its tail. `embedding` is the
  quantised vector (1024 dimensions → ~1,368 characters); it is no longer what
  the search reads. Vectorize is, and it is kept for two jobs the index cannot
  do: rebuilding the index without paying to re-embed everything, and answering
  at all when no index is bound. NULL means "not embedded yet", which retrieval
  survives by falling back to the word index alone. **`context_line` / `speaker`
  / `said_at`** (0073) are chat/meeting grain: `context_line` is a cheap
  model's sentence situating a chunk in its document (chunk 47 of a transcript
  otherwise has no idea which meeting it is from); `speaker`/`said_at` are the
  per-message identity a run-of-messages chunk carries, both NULL for an
  ordinary document chunk. **`team_visible`** (0075) denormalises the TEAM half
  of `readableBy`'s two conditions (some live sighting on the 'team' shelf) onto
  the row retrieval's stage-one read actually touches — needed the moment 0073
  let one source carry several people's sightings, because a single
  `owner_user_id` can no longer answer for a folded source (whichever sighting
  wrote it last would silently decide everyone else's visibility too). **It is
  a NARROWING AID, never the authoritative answer**: the real fence is
  `readerClause = ownerClause AND appClause` (`workers/content/src/lib/knowledge.ts:602`)
  — three settings, not two (private/`owner_user_id`, app/`visible_to_app_id`,
  team) — and the app half is only ever decided by the read-back JOIN to
  `knowledge_sources`, the same R26 argument this file already makes about the
  vector index: the flag narrows, the team's database decides. **LIVE as of
  10 Sep 2026**: recomputed on every write that touches a sighting's
  `shelf`/`gone_at`, in the same statement or transaction, never a trigger
  (this repo's migration executor cannot run one at all, and the source of
  truth here is another table's SET of rows regardless) — see
  `knowledge_sources`, above, for where that computation actually happens
  before this column gets its copy.
- **`knowledge_terms`**, the inverted index. Was an ORDINARY indexed table
  rather than an FTS5 virtual one, and the original reason (2026-08-11) was
  the DELETE: a re-index removes a source's postings, which on a
  TRIGGER-synced FTS5 table sounded like a scan of every posting in the team
  against one keyed delete here, and a trigger-kept-in-step table behaves
  differently in the test harness than in D1. That reasoning held for a
  trigger-synced table — which, per SEARCH.md, cannot actually be built
  through this repo's own migration executor at all — and stopped holding
  once EXTERNAL-CONTENT mode was tried for real: `knowledge_chunks_fts`,
  below, gets the same keyed delete this table was built to have, kept in
  step by application code exactly like this one, behaving identically under
  `node:sqlite` and real D1 because nothing about it is trigger-synced. This
  table has no IDF and no length normalisation (KB-AUDIT.md §4.4). **As of
  10 Sep 2026 this table is SUPERSEDED for ranking** — `knowledge_chunks_fts`,
  below, is the arm retrieval actually scores with now — but it is still
  WRITTEN alongside it, kept in step on every chunk write. `team_visible`
  (0075) is the owner half only, deliberately: no
  app-tier column is denormalised here, the same asymmetry `owner_user_id`
  already has on this table, defended in `readerClause`'s own doc comment —
  a restricted chunk may reach the candidate pool through its terms and cost
  a relevant passage its ranking slot, but it cannot reach an answer, because
  the chunk-level join still applies the full fence before anything is read
  back.
- **`knowledge_sightings`** (0073). ONE PERSON'S SIGHT OF ONE THING, from one
  place: `source_id`, `seen_where` (which folder/mailbox/space — a plain
  ingest-defined string, not an FK, because no one table spans Drive/Gmail/
  Calendar/Chat), `seen_by_user_id` (NOT NULL — a sighting is by definition
  somebody's own sight of something; material nobody personally saw has ZERO
  sighting rows, not one anonymous one, and keeps reading its visibility off
  the source row as it always did), `shelf` ('private' | 'team', CHECK-
  constrained), and `gone_at` (NULL while they can still see it, stamped —
  never deleted — the moment they stop: un-shared, left the space, left the
  team). UNIQUE on `(source_id, seen_where, seen_by_user_id)`: the same
  person seeing the same source from a DIFFERENT place is a second real
  sighting worth keeping (a shared Drive folder and a direct email share of
  the same file are different provenance), not a duplicate — which is why
  `seen_where` sits inside the key rather than beside it. **STALE, corrected
  18 Sep 2026**: the line above said "as of 10 Sep 2026 this table is empty
  on every team; nothing writes to it yet" — `writeSightings`
  (`workers/content/src/lib/knowledge-google.ts`) has been live since, and
  by 18 Sep it held real rows (e.g. a `private` sighting for an individual
  colleague's own Gmail thread). Left uncorrected for over a week; caught
  while writing the ruling below.

  **THE DEFAULT SHELF PER READER, AND THE ONE RULING AGAINST IT.** Every
  item `readGoogleMaterial` (`workers/content/src/lib/google-read.ts`)
  reads carries a `shelf` decided AT THE READ, before it ever reaches this
  table — a gmail thread and a personal calendar entry are hard-coded
  `private` ("a mailbox is nobody's team material"), the owner's own
  20 Aug 2026 ruling that opened the net (removed the known-contact fence)
  without moving the shelf. **Owner's ruling, 18 Sep 2026, verbatim:**
  *"whatever gets shared through Google Calendar or email regarding call
  transcripts should be synced to the knowledge base, and by default, the
  right is that the team owns it. That can, of course, be changed later."*
  One narrow exception now exists inside the gmail path:
  `isCallNotesEmail` (same file) recognises Google Meet's own
  auto-generated "Notes from…" email — subject `Notes: "<title>" …`
  (Gemini's template, never a human's) AND a snippet naming what it is
  ("sent to invited guests in your organization" / "auto-generated on…"),
  both required — and files it `shelf: "team"` instead. `team_visible`
  (`knowledge_sources`, above) follows automatically:
  `teamVisibleRecomputeSql` (`workers/content/src/lib/knowledge.ts`) reads
  `EXISTS (a live sighting with shelf = 'team')`, so ONE such sighting is
  already sufficient — this is not a multiple-attendee vote. The
  "changed later" the owner names is not built: a per-team override would
  add a `defaultTeamOwns` parameter to `isCallNotesEmail`'s caller, read
  from a team setting; `google-read.ts`'s own comment on the function marks
  where. Every OTHER personal Google item — an ordinary mail thread, a
  personal calendar entry, a Drive file nobody named — is unaffected and
  stays `private` by the same default it always had.
- **`knowledge_names`** (0073). The account/app/contact/colleague ALIAS
  INDEX, **LIVE as of 10 Sep 2026**, replacing `accountNamedIn`'s
  single-token account-name matching (KB-AUDIT.md §4.2 — "VU Solutions"
  hijacking any question containing the word "solutions"). `kind` + `ref_id`
  name the real entity; `name` is one spelling of it (canonical, an alias, or
  a misspelling); `alias_of` is NULL on the canonical name and the canonical
  name's own text on every alias; `compartment` is the same fence every
  other knowledge table carries, so a lookup can never leak which accounts
  exist across a fence it has no right to see. UNIQUE on `(kind, ref_id,
  name)`. Rebuilt whole by its own sweep (`workers/content/src/lib/knowledge.ts`
  — the table is emptied and repopulated rather than diffed), and read in
  the same file wherever `accountNamedIn` used to be asked.
- **`knowledge_chunks_fts`** (0073). BM25 over chunk text, **LIVE as of
  10 Sep 2026 and now the arm retrieval actually scores with** — it REPLACES
  `knowledge_terms` for ranking (KB-AUDIT.md §4.4: that table's scorer was a
  raw term-frequency sum with no IDF and no length normalisation, so the
  audit's "hybrid search costs recall" finding was measured against a scorer
  that was never real BM25). FTS5,
  EXTERNAL-CONTENT mode (`content='knowledge_chunks', content_rowid='rowid'`
  — no text of its own, only postings keyed to the base table's rowid). NO
  TRIGGERS: `shared/workers/d1-rest.ts`'s migration executor
  (`d1ExecScript`/`splitStatements`) splits a script on every un-quoted `;`
  with no `BEGIN`/`END` awareness, so a trigger body's internal semicolons
  read as statement boundaries and shatter a `CREATE TRIGGER` into broken
  fragments the moment `migrateTeams` applies it for real — a green
  `node:sqlite` test would have proved the opposite of the truth. Kept in
  step by application code instead: an ordinary `INSERT` on write, and a
  KEYED `'delete'` command (by rowid, the row's own old values) on removal —
  the exact fix `knowledge_terms`'s original design wanted and could not
  build with the tool it had. Emptying the whole table uses FTS5's own
  `'delete-all'`, never a bare `DELETE`: measured, a plain `DELETE FROM` issued
  once the base rows are already gone throws nothing and removes nothing,
  leaving stale postings a reused rowid can resurrect; reading the result back
  uses `'integrity-check'`, never a row count (an external-content table's own
  `SELECT` reads through `content_rowid` to the base table, so it reports
  whatever THAT says regardless of the postings' real state).
- **`knowledge_ingest`**, one row per source KIND: the cursor it reached, when it
  last ran, when it last SUCCEEDED, and what went wrong when it didn't (R12). The
  cursor is what makes ingestion resumable, a tick that dies halfway costs the
  next one nothing but the rows it has not reached.

  **The cursor carries the TEXT BUILDER that wrote it** (`v<n>|<sort>|<id>`).
  The content hash answers "has this row changed?", which is a different question
  from "has the way we WRITE this row changed?" — and the cursor makes the second
  one fatal, because every row already behind it is invisible forever unless
  somebody touches it. So improving what a kind SAYS reaches every future ticket
  and not one existing one. A stored cursor whose version is not the kind's
  current `textVersion` reads as null, the kind walks its table again, and the
  hash then does its ordinary job. Bump the version when a reader's text changes;
  `workers/content/test/knowledge-coverage.test.ts` pins a digest of every reader
  (and of the helpers they share) to the number declared, so a change without a
  bump turns the build red.

  **A ROLLUP kind starts again when it catches up.** An account's source is built
  from rows its own cursor cannot see — its apps, sprints, tickets, maps, people
  — none of which moves `accounts.updated_at`. So `rollup: true` drops the
  position at the end of the table and the next tick starts over, refreshing every
  account's text on a rolling cycle. It is not `windowed`: a windowed kind
  re-walks in the same tick and therefore never reports `caughtUp`, which is the
  signal `scripts/knowledge-backfill.mjs` loops on.

**Where the search lives, and why the tenancy argument survived the move.** The
SEARCH is Cloudflare Vectorize, one account-wide index, with every team in its
own NAMESPACE and every chunk carrying the labels a question is routed by. The
original decision kept vectors here precisely because a per-team database makes
tenancy structural where "one index with a team id in the metadata" makes it a
filter somebody wrote correctly today. That objection is answered rather than
dropped, and both halves are Law R26: a namespace is a PARTITION Vectorize
applies before the search, not a filter; and nothing readable ever comes out of
the index, it is asked for ids and scores alone, and every passage in every
answer is read back out of THIS database, under the caller's own full fence
(`readerClause` — owner AND app, `knowledge.ts:602`), with excluded sources
gone. The vector store narrows; the database decides. The
full argument, and what would change our mind, is at the top of
`workers/content/src/lib/knowledge-vectors.ts`; the numbers that forced the move
are in `.plans/BUILD-4-knowledge-retrieval.md`.

**The edge the move creates: a reset does NOT empty the index.**
`scripts/reset-all.mjs` deletes every team database and blanks the core, the two
things it can reach. Vectorize is a third store outside both, so after a reset the
account-wide index still holds the vectors of teams that no longer exist, and a
deleted team's namespace is still there with rows in it. **This is harmless to
READS, and R26 is exactly why**: nothing readable comes out of the index (ids and
scores only), so a stranded vector can at worst score a chunk id that the team
database no longer has a row for, and the passage read-back returns nothing. It
cannot produce text, and it cannot cross a namespace. What it does cost is
**storage you are paying for and a count that no longer means anything**, so treat
it as housekeeping, not as a leak:

- After a reset you intend to keep clean, delete and recreate the index rather than
  trying to prune it: `npx wrangler vectorize delete kwapso-knowledge-staging`, then
  re-run BOOTSTRAP §3b **including all ten metadata indexes** (they do not survive
  the delete, and Vectorize will not index metadata retrospectively).
- A team deleted on its own leaves its namespace behind. There is no per-namespace
  delete today; the next full index rebuild is when it goes.
- Nothing here is on a cron. It is deliberate: an automatic vector sweep keyed on
  "teams that no longer exist" would be a destructive job reading a table a reset
  has just emptied, which is the worst possible moment to trust it.

---
