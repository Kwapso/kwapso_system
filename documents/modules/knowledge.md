<!--
  documents/modules/knowledge.md — the Knowledge module. Shape follows
  agent_skills/lean_foundation/templates/module-doc.md.
-->
# Knowledge

## What it is

Knowledge is "everything the assistant is allowed to read, in one place, you
can add to it, correct it, and take things out" (`shared/glossary.ts`,
`knowledgeBase`). Each piece of material in it is a **source** — a note
somebody typed, a file somebody uploaded, or a mirror of a record the app
already owns (a ticket, an account, a process map, and so on). A question is
answered from one **compartment** at a time — one account's world, or the
agency's own — and every answer carries its **citation**, the source it came
from, and the **passage**, the part of that source the answer quotes: "an
answer with no source isn't one." This module is also the retrieval layer the
in-app assistant stands on, so its rules are as much about who may read what
back out of it as about what goes in.

## Screens

| Screen | Kind | Route / deep link |
|---|---|---|
| Knowledge (list) | collection, recipe (`knowledgeListRecipe`, `web/lib/screens.ts`) | `/knowledge` (sidebar, top-level module) |
| Source detail | bespoke detail | `/t/<teamId>/knowledge/<id>` (`web/components/knowledge/knowledge-detail.tsx`, host-composed) |
| Add / edit a source | form dialog | `web/components/knowledge/knowledge-form-dialog.tsx` |
| Upload a file | form dialog | `web/components/knowledge/knowledge-upload-dialog.tsx` |
| Glossary editor | list + form | `web/components/knowledge/glossary-list.tsx` + `glossary-form-dialog.tsx` |
| Google connections | settings panel | `web/components/knowledge/google-connections.tsx` |
| Connect a Drive folder / Chat space | dialog | `google-source-dialog.tsx`, `google-scope-dialog.tsx` |
| Match a Google account to a known contact | sheet | `google-account-match-sheet.tsx` |
| Google sync status | panel | `google-sync.tsx` |

## Doors

Knowledge (and its Google connections) is served by `workers/content/src/index.ts`
(`ROUTES`, from line 506) — verified by grepping `knowledge`/`google`/`drive`
across every worker's `ROUTES` table; nothing knowledge-shaped sits on
tenancy or another worker.

| Route | Does |
|---|---|
| `GET /api/content/knowledge` | list sources — `knowledge:read` |
| `GET /api/content/knowledge/ask` | ask a question, get back a `knowledgeAnswer` (found/passages/citations) — `knowledge:read` |
| `GET /api/content/knowledge/map` | the compartment map | `knowledge:read` |
| `GET /api/content/knowledge/shape` | one source's own shape (kind, fence) | `knowledge:read` |
| `POST /api/content/knowledge` | create a note source — `knowledge:create` |
| `POST /api/content/knowledge/upload` | upload a file as a source — `knowledge:create` |
| `POST /api/content/knowledge/update` | edit a source — `knowledge:update` |
| `POST /api/content/knowledge/active` | deactivate / reactivate a source — `knowledge:update` |
| `POST /api/content/knowledge/glossary` | add one glossary word — `knowledge:create` |
| `POST /api/content/knowledge/sync` | run a slice of the ingest sweep by hand — `knowledge:create` |
| `POST /api/content/knowledge/sync-google` | the personal half of the sweep, reading through the CALLER's own Google token — `knowledge:create` |
| `GET /api/content/google/connections` | a person's own Google connections — identity-scoped |
| `POST /api/content/google/connect` / `disconnect` | connect / disconnect the caller's own Google account | identity-scoped |
| `GET /api/content/google/drive/files` | browse a connected Drive | `google:read` |
| `POST /api/content/google/sources` | name a shared folder/space for kwapso to index | `knowledge:create` |

Every knowledge and Google door opens with `refusePortalCaller` (agency
only) — confirmed by grepping `refusePortalCaller` across
`workers/content/src/routes/knowledge.ts`, present on every handler that
reads or writes a source.

## Business rules

- An answer from the knowledge base never ships without its sources:
  `found`, `passages` and `citations` are one decision made in one seam
  (`knowledgeAnswer`) — no citation means no passage, and a sentence the
  assistant must say ("we have nothing on that") instead of inventing one —
  `R23`, proven by `workers/content/test/cited-answers.test.ts`.
- Retrieval is namespaced by team: every Vectorize call passes `namespace:
  guard.teamId`, built from the caller's own guard and never from the
  request, so a query cannot see another tenant's vectors even if every
  metadata filter were wrong — `R26`, proven by `workers/content/test/vector-fence.test.ts`.
  Vectorize itself is asked for ids and scores only
  (`returnValues: false`, `returnMetadata: "none"`); every passage in an
  answer is then re-read out of the team's own database under the caller's
  own owner clause, so a mislabelled or stale vector can cost a relevant
  passage but can never produce one the caller was not allowed to read —
  `R26`.
- Every source type accepted by either door (a direct upload, or a file
  found in a connected Drive) resolves to the SAME declared reader table, so
  a PDF reads the same whether it arrived by upload or by Drive, and no door
  is allowed to pick its own reader — `R42`, proven by
  `workers/content/test/source-readers.test.ts`.
- A Google item's identity is its own external id (the reader who saw it
  stripped out), so the same Drive folder shared with two colleagues files
  once rather than once per person — enforced by the ORIGINAL unique
  partial index `idx_knowledge_sources_origin ON knowledge_sources
  (origin_table, origin_row_id) WHERE origin_row_id IS NOT NULL`
  (team migration `0012`), not by the later, now-retired `identity_key`
  column (dropped in migration `0080` — "identity_key retired, the fold was
  never on it") — `R68`, proven by
  `workers/content/test/one-identity-per-source.test.ts`.
- A write that changes a `knowledge_sightings` row's `shelf` or `gone_at`
  must go through `execKnowledgeScript`, the one wrapper that recomputes
  `team_visible` in the same script — a writer that reaches for the raw
  `d1ExecScript` primitive instead can leave the fence answering from a
  stale value — `R69`.
- Every module a person can see, the assistant can answer about: knowledge
  itself is the corpus (not a module indexed inside itself —
  `CORPUS_EXEMPT`, "filing the index inside the thing it indexes would put
  every source's metadata into competition with its content"), and a module
  reachable only by tool must say in writing why its material stays out of
  the searchable pile — `R47`.
- A knowledge door refuses a client-portal login outright (agency-only
  material): every handler in `workers/content/src/routes/knowledge.ts`
  opens with `refusePortalCaller` — `R21`.
- A source's own compartment (`agency`, or `account:<id>`) is derived on
  write, never free-typed by a caller — `unenforced` at the type level
  beyond the write door's own derivation; no dedicated test asserts a
  request cannot smuggle an arbitrary compartment string past it.
- Deactivating a source stops it being read (its chunks and vectors are
  removed, the sweep will not repopulate them) but the row itself survives
  — the module's own `deactivate` rule (`shared/glossary.ts`) — `unenforced`
  by a named test beyond the general deactivate-not-delete convention.

## Edge cases

- A wrong parent event is worse than no parent: `event_id`/`event_id_from`
  deliberately leave most rows NULL rather than match a meeting transcript
  to a calendar entry by title — measured on staging, 0 of 80 live Drive
  sources carried a calendar link at all (`documents/DATA-MODEL.md` §
  `knowledge_sources`).
- A composed answer (the Knowledge tab's own "ask" flow) hands the model
  untrusted prose from tickets and Google mail as ordinary data, the same
  fencing discipline the agent's own chat relies on —
  `documents/EDGE-CASES.md` §7.
- The rebuilt schema (10 Sep 2026) shipped across several lanes moving at
  different speeds; `documents/DATA-MODEL.md`'s own knowledge section warns
  it is "a snapshot, not a promise" and to re-grep before trusting which
  columns are actually wired versus merely present.

## Open issues

- `identity_key` is fully retired (migration `0080`); a doc or comment that
  still describes it as the live fold mechanism is stale — the real
  constraint is `idx_knowledge_sources_origin` (R68).
- No dedicated test was found asserting a knowledge write cannot set an
  arbitrary `compartment` string outside the derived `agency`/`account:<id>`
  shape — a plausible candidate for a locked boundary test.
