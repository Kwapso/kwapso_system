# The knowledge-base read fence — deep, adversarial review

kb_review, 11 Sep 2026. Clean checkout, branch `review-fence-deep`, `origin/main` @ `5d75286c`
(nine merges past my last pass on this file). Report only — no production code changed. All
mutations below were applied, tested, and reverted; `git diff` on `knowledge.ts` is clean at the
end of this document.

**Verdict up front: I found no new live disclosure or access bug.** Everything the hub asked me to
attack — the seams the nine merges touched, the `reason`/`compartments`/`candidates` disclosure
shape, and every branch of `ownerClause` and `appClause` — is either fenced correctly and
mutation-provably tested, or is a documented non-fence (filing metadata that says so in its own
comment). The one thing worth a human's attention is not a bug: it's that `appClause`'s branch A
(`visible_to_app_id IS NULL`) and `ownerClause`'s branch 2 (no-sightings legacy rule) are so heavily
exercised by ordinary tests that a real regression there would be caught by dozens of unrelated
failures rather than a clean, readable one — noted under mutation results below, not filed as a
finding, because "well covered" is not a defect.

## 1 · Every door that reads knowledge material, and its fence

Off `workers/content/src/routes/knowledge.ts` and `workers/content/src/lib/knowledge.ts`, not from
memory:

| Door | Fence | Confirmed |
|---|---|---|
| `GET /api/content/knowledge` (list, and `?id=` single) | `listSources`/`getSource` → `sourcesWhere` → `readerClause` (owner AND app) | read the call chain, `sourcesWhere:1030` |
| `GET /api/content/knowledge/ask` | `retrieve()`: candidate arms narrow with `ownerClause`/`fastOwnerClause`/`appClause` alone, but every row that reaches an answer crosses the mandatory read-back `readerClause(guard, "s.")` at `retrieve:3611`, `AND s.deactivated_at IS NULL` | traced, and mutation-confirmed below (neutering `reader.sql` to `1=1` at that join is the R26 test's own proof, already in `vector-fence.test.ts`) |
| `GET /api/content/knowledge/sync` | Not a source read — the caller's own Google ingest state, keyed to `guard.userId` | out of scope for this fence |
| `GET /api/content/knowledge/map`, `/shape` | `readableTables(cfg, guard)` — a DIFFERENT, R18-style cross-module fence (`ACTIVITY_GATE_MAP`) for the record-neighbourhood graph feature, not `knowledge_sources`' own fence | confirmed by reading; out of scope of "the knowledge base's read fence" as the hub scoped it (no `ownerClause`/`appClause`/`readerClause` anywhere in this path) |
| `POST /api/content/knowledge/update` | Read gate is `sourceOrThrow` → `getSource` → `readerClause`, so editing a row you cannot read 404s before any write; edit RIGHT is `knowledge:edit` (module-level), not per-row | confirmed; see §3 for the mirrored-branch specifics |
| `POST /api/content/knowledge/active` | Same: `setSourceActive` reads the row through the fence first | confirmed |
| `POST /api/content/knowledge`, `/upload*` (create) | No read fence needed (nothing exists yet); `requireOpenableApp`/`requireAccount` gate WHICH app/account a NEW source may be filed under, both of which reuse `appClause`/existence | confirmed |

Every door in `knowledge.ts` also opens with `await refusePortalCaller(cfg, guard)` immediately
after `gated(...)` — I checked this is a DATA-driven resolution (`portal_users` row keyed on
`guard.userId`, `shared/workers/account-scope.ts:267`), not a hostname or header check, so it holds
regardless of which gateway a request reaches, which is the R21 contract. No door in this file skips
the call — I grep'd every `export async function get`/`post` in the file and confirmed the line is
present in each read/write handler that touches `knowledge_sources`.

## 2 · The disclosure shape — `reason`, `compartments`, `candidates` (hub item 3)

This is the sharpest question in the brief, because it has already bitten twice: `sourceTitles()`
leaked an app-restricted title through `reason` on 11 Sep, fixed on this same tip, and now the
what-it-did line renders `reason` **verbatim, always visible**, in `agent-sources.tsx`.

**Checked, and still fixed.** `sourceTitles()` (`knowledge.ts:2414`) uses `readerClause(guard)` —
BOTH halves — not `ownerClause` alone. Its own header comment names the exact bug and the exact
reason it exists now. `deriveRoute()` (`knowledge.ts:2360`) is the only caller that puts a title into
`reason`, via `sourceTitles`, so this is the one path that matters and it is fenced.

**The other source of names in `reason`: account names, from `deriveCompartment`.** Three sentence
shapes ("You asked from X's record...", "The question names X...", "The question names no
client..."), all naming ACCOUNTS, not sources. I checked whether this is a comparable leak and
concluded it is not, for a reason specific to this codebase rather than an assumption: `accountById`
and `requireAccount` (both in `knowledge.ts`) run **no fence at all** beyond the team's own database
boundary — no `account_staff` table exists anywhere in this repo, and neither function consults one.
Unlike apps (`app_staff`, SCOPE 8.11's staffing model), accounts have no per-staff visibility
restriction in this codebase — any team member who can reach `GET /api/tenancy/accounts` can already
see every account's name. So `reason` naming an account to a staff caller discloses nothing that
door doesn't already. And a CLIENT login — the caller class that genuinely must not learn about
other clients — never reaches `deriveCompartment` at all: `refusePortalCaller` throws before
`retrieve()` is called. I did not just read this; `knowledge.test.ts` lines 611-761 already assert
`reason` naming multiple accounts by name for a staff caller, and the file's own header comment (line
15) states the client-refusal is asserted for this exact door.

**`compartments`/`candidates`**: opaque compartment tags (`account:<id>`, `agency`) and an integer
count. Neither carries a title or a name a reader doesn't already have from `reason`. Not a vector.

**Conclusion: no live disclosure bug found in `reason`/`compartments`/`candidates` on this tip.**

## 3 · The seams the nine merges actually changed

- **`accounts[]`/`apps[]` written by the update door (`95e49e5e`).** Confirmed these two array
  columns are validated (existence + reachability, reusing `requireAccount`/`requireOpenableApp`)
  but **read by no fence anywhere** — the code's own comment at `updateSource:1497` says so, and I
  grepped every `WHERE`/filter/fence-shaped read in `knowledge*.ts` for `.accounts`/`.apps` and found
  none. This is filing metadata (what the record CARDS say), not access control, and it says so in
  writing at the point a future reader would otherwise wonder. Not a finding.
- **`owner_user_id` no longer written on the mirrored branch of `updateSource` (`95e49e5e` PART 2).**
  Read the current code (`knowledge.ts:1554-1562`): the mirrored-source UPDATE statement genuinely
  omits `owner_user_id` from its column list. This is correct, not a regression — that column is
  owned by the live Google sweep's `writeSightings`/`teamVisibleRecomputeSql` for a mirrored source,
  and the bug this fixed (a form write silently clobbered by the next sweep tick) was worse than the
  fix. I checked there's no residual path where a mirrored source's `owner_user_id` is now
  **never** set by anything (which would make private-mirrored sources permanently un-privatizable) —
  `knowledge-google.ts`'s `writeSightings` still calls `teamVisibleRecomputeSql`, which still computes
  `owner_user_id` via the `singleOwner` CASE I mutation-tested in an earlier round. Confirmed live,
  not stale.
- **R68 re-pointed (`f5d82094`, `0db72dcd`).** This is a data-integrity census (one-identity-per-
  source, keyed to the real unique index `idx_knowledge_sources_origin`), not an access-control rule.
  Re-read its current clauses; neither touches `ownerClause`/`appClause`/`readerClause`. Out of scope
  for a read-fence finding, and I don't have one to report here.
- **Wipe ordering (`36a688dc`).** Fixes a crash-safety gap where a wipe interrupted mid-flight could
  leave a source looking "fully indexed" while its vectors were gone — an **availability** defect
  (search silently finds nothing), the opposite direction of risk from a disclosure bug. I checked
  whether the reverse could ever happen — a stale Vectorize entry surviving past its source's real
  deletion and being cited — and it cannot: the read-back join at `retrieve:3629` is an INNER JOIN
  keyed on `s.id = c.source_id` with `s.deactivated_at IS NULL AND readerClause`, so a vector with no
  living, readable `knowledge_chunks`/`knowledge_sources` row behind it contributes nothing. This is
  R26's own bargain holding under a crash-safety edge case, not a gap in it.

## 4 · Mutation-proof, every branch, both fence functions

Baseline: `npx vitest run --config vitest.workers.config.ts workers/content` → **108 files / 1432
tests passing** (12.4s). Each row below: one branch neutered to always-false (parameter count
preserved — see the note under branch 2, the shape that bit me on the LAST round), full content
suite re-run, then reverted and re-confirmed green before moving to the next branch.

**`ownerClause` (3 branches, `knowledge.ts:651`):**

| Branch | Mutation | Tests reddened |
|---|---|---|
| 1. `team_visible = 1` | → `0=1` | **2** (`knowledge-fence.test.ts`: "a team sighting is readable by everyone", "one team sighting among several private ones answers for everybody") |
| 2. No-sightings legacy rule (`NOT EXISTS(...) AND (owner IS NULL OR owner = ?)`) | condition → `0=1` | **85**, across 9 files — this is the pre-sightings default path nearly every fixture source in the suite takes |
| 3. Live own-sighting `EXISTS(...)` | condition → `0=1` (kept the bound param via `WHERE 0=1 AND sg.gone_at...`, to avoid the parameter-count trap from the last round) | **3** (`knowledge-fence.test.ts`: "a private sighting is readable by the person who saw it", "is readable by EVERY sighted person...", "keeps answering for the survivors once one sighter's access ends") |

**`appClause` (3 branches, `knowledge.ts:954`):**

| Branch | Mutation | Tests reddened |
|---|---|---|
| A. `visible_to_app_id IS NULL` | → `0=1` | **91**, across 9 files — almost nothing in the suite is app-restricted, so this is the dominant default |
| B. `app_id IN (SELECT ... FROM app_staff ...)` | inner condition → `0=1` (staffing lookup always empty) | **8** — the 5 "app fence" describe-block tests, both `appClause`'s-third-branch tests (their `addSource` call reuses `requireOpenableApp`, which is also gated by this same clause), and, interestingly, the 3 `accounts[]`/`apps[]` filing tests, which file a source under `IDS.victimApp` as a side detail |
| C. `is_default = 1` role bypass | already mutation-proven both ways in `test/app-fence-clause` (merged `803fe6de`) — re-ran here for completeness: delete → 1 red (my "admits" test); widen to `1=1` → 1 red (my "refuses" test) | confirmed still holds on this tip |

All six branches of the two functions have real, non-trivial test coverage — every one of them, not
just the two the hub already knew about (branch C, and the app admin bypass from two nights ago).
There is no unguarded branch left in either function as of `5d75286c`.

**R26 vector fence, checked structurally rather than just by test:** exactly one call site of
`KNOWLEDGE_INDEX.query` in the whole content worker (`knowledge-vectors.ts:314`), passing
`namespace: namespaceFor(guard)` (== `guard.teamId`, validated non-empty and ≤64 chars),
`returnValues: false`, `returnMetadata: "none"` — matched against the law's own text word for word.

**R69 sighting-write guard:** exactly two files write `knowledge_sightings` in the whole repo
(`knowledge.ts`, the exempted wrapper that exports `execKnowledgeScript`, and `knowledge-google.ts`,
the one real writer) — both call sites in `knowledge-google.ts` go through `execKnowledgeScript`.
No raw `d1ExecScript` write to that table exists anywhere.

## 5 · Findings

None ranked, because none survived. Every angle the hub named — the disclosure shape, the specific
seams nine merges touched, and every branch of both fence functions — checked out fenced, tested,
and (where I could mutation-prove it cheaply) confirmed load-bearing. I would rather report a clean,
specific list of what I checked and how than pad this section, per the standing rule: a finding I
cannot make fail is not a finding, and I made every mutation above fail exactly where it should and
nowhere it shouldn't.

If anything here deserves a human's continued attention it's process, not code: `appClause` branch A
and `ownerClause` branch 2 are covered so heavily (91 and 85 tests respectively) that a future
regression in either would show up as a wall of unrelated-looking failures across nine files rather
than one clean, diagnostic one — worth knowing before the next person sees 85 red tests and assumes
something is badly broken everywhere, when the honest read is "one two-line clause, tested from
every direction."

`git diff --stat` on `knowledge.ts` at the time of writing this report: empty. Every mutation above
was reverted immediately after its count was recorded.
