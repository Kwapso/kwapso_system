# HANDOFF — kb-F, 11 Sep 2026

Written at the hub's request, at the first natural break after 1,894 turns with
no prior compaction. Self-contained: a fresh kb-F session (or anyone else)
should be able to pick up from this file alone, without the chat history.

## Where things stand

Branch `feat/kb-steps`, pushed to origin at `207241a5`. `npm run check`
EXIT=0 as of this commit (157 test files, 1358 passed, 8 skipped — all named
build-output skips that are expected and absent in every worktree: the
export tripwires and the splash-bytes-survive-build suites, which need an
actual `npm run build` output this worktree has never produced).

**Not merged to main by me.** Per the standing rule, I push and report; the
hub merges.

## What shipped on this branch

Two tracker items, assigned together, built in this order:

### Item 2, `b-filing` (done first — the hub said start immediately)

"Naming a Drive folder or Chat space asks you to confirm its account once."

- New read-only door: `GET /api/content/google/match-account` (content
  worker), reusing the existing `accountsNamedIn` name-matcher (exported for
  this second caller — it already handled free text against the
  `knowledge_names` index with the anti-hijack rarity gate, and a folder name
  is free text same as a question is).
- New sheet component `GoogleAccountMatchSheet`
  (web/components/knowledge/google-account-match-sheet.tsx) wired into
  `google-source-dialog.tsx`: picking exactly one folder/space whose name
  matches an account (and whose account field is still untouched) offers a
  confirm — "File this under {account}?" — and only a YES sets the field.
  Declining leaves it exactly where it was.
- Scoped to a SINGLE item on purpose: the dialog's own header comment
  establishes that "who may read it" and "whose material it is" are ONE
  answer for a whole batch, so a match confident about item one and silent
  about item two would be a second, disagreeing answer to a question the
  form only asks once.
- The dialog's header comment used to argue against guessing a compartment
  from a folder's name at all ("guessing it is precisely the failure the
  compartment idea exists to prevent"). The hub's ruling: a match a person
  must CONFIRM does not have that property, but the comment read as
  contradicting the code sitting under it — so it's rewritten to say what's
  now true (see the TRACKER `b-filing` paragraph added there, 11 Sep 2026).
- R35 (a record shown anywhere carries its own face): the confirm sheet now
  shows the matched account's `RecordMark` (falls back to its name's first
  letter — `accountsNamedIn` only returns `{id, name}`, no `logo_url`).
- Tests: `workers/content/test/google-account-match.test.ts` (backend
  matcher on folder-name-shaped input, including the anti-hijack case — a
  folder called "Client Solutions Archive" must not match an account named
  "solutions" on the strength of one common word),
  `web/test/google-account-match-sheet.test.tsx` (sheet behaviour + the R35
  face). Both mutation-proven.
- `TOOLLESS_DOORS` entry added for the new door (mcp/test/filter-parity.test.ts);
  `documents/MCP.md`'s door-count sentence updated to match.

### Item 1, `d-steps` — ruled down from a stream to a line

"Thinking steps stream on screen. Before: silent wait. After: planning…
searching N ways… re-reading… writing."

Research found: `ask_knowledge` is ONE synchronous GET to the content
worker, which has never streamed — only the data-ops worker's agent chat
streams (SSE), and the whole app has exactly one streaming path. A true
four-phase stream would be new cross-worker plumbing and a second streaming
path, which is an architecture decision, not a tracker row — escalated to
the owner by the hub, with my finding quoted. Not built.

**What was built instead** — the hub's ruling: a what-it-did line under the
answer, always visible (not behind the existing "What I read" disclosure),
built entirely from real facts, no timers, no fake progress:

- `WhatItDid` in `web/components/assistant/agent-sources.tsx`, rendered as
  the first child of `TurnSources`. Shows the search's own `reason` sentence
  VERBATIM (server-composed prose with real account names already spliced
  in by `deriveCompartment` — this is R23's own "reason a person can
  disagree with," which turns out to be meant for a person to actually
  read, not just for the model), then a translated clause on `candidates`
  (singular/plural, two separate `t()` strings — this codebase's own
  established way to avoid needing real pluralization support), then,
  only when true, a translated clause saying the shortlist was re-read.
- `reread: boolean` is NEW on `KnowledgeAnswer` — it didn't exist before
  today. Threaded through: `knowledgeAnswer()`'s input type and both of its
  call sites in `workers/content/src/lib/knowledge.ts` (the early "nothing
  fused" exit gets `reread: false`; the real evidence object gets
  `reread: !!input.read`); the SSE `"sources"` event — which turned out to
  have TWO independently-declared copies of its shape (`shared/types.ts`'s
  `StreamEvent` and `web/lib/api/stream.ts`'s `AgentStreamEvent` — worth
  knowing about if either ever needs a third field, both need editing);
  `TurnEvidence`/`evidenceFrom`/`mergeEvidence` in `shared/agent-cites.ts`
  (`reason`/`candidates` were already flowing through `KnowledgeAnswer` but
  had never been carried into `TurnEvidence` — shown to nobody until now).
- `evidenceFrom` defaults `reread` to `false` on a missing value, on
  purpose: a thread saved before this shipped has no opinion in its stored
  JSON, and "the floor alone decided" is the honest reading of that
  silence, never a guess that the reader ran. Locked by a dedicated test in
  `workers/data-ops/test/knowledge-evidence.test.ts` that constructs the
  exact pre-`d-steps` JSON shape (via destructuring `reread` back out) and
  asserts the recovered evidence still says false.
- Tests: `web/test/agent-what-it-did.test.tsx` (5 cases: reason + count
  shown, singular vs plural, reread on/off, nothing rendered with no
  reason), a `reread`-specific case added to
  `workers/content/test/cited-answers.test.ts`, and the wire-shape
  assertions in `workers/data-ops/test/knowledge-evidence.test.ts` extended
  to cover the new fields. All mutation-proven — broke each one by hand,
  confirmed red, reverted.

### Bookkeeping

`TRANSLATION_CEILING` raised 16 → 19 in `shared/rules/registry.ts` (de/es/ca),
three new strings (the two candidate-count sentences plus the reread
clause), flagged as accepted debt per the hub's note — `npm run lang` run,
`shared/i18n-strings.json` updated. The `reason` sentence itself is
deliberately NOT one of the three: it's server-composed data, never touches
`t()`, and R28's walk never reaches a runtime string held in a variable
(same category as a citation's title or a passage's own text, both already
rendered raw a few lines below it).

## What is NOT done

- No live staging exercise of either feature — that's the hub's, not mine
  (the knowledge base is mid-rebuild right now, per the hub's own message).
- No merge to main. Branch is pushed and green; awaiting the hub.
- The owner's ruling on whether a true four-phase stream is worth a second
  streaming path is still open — if it comes back yes, that is new,
  separately-scoped work, not a return to this tracker row.

## Standing rules that governed this session (unchanged, still apply)

No spawning agents/subagents. $0 model/AI spend — never call
`scripts/i18n-translate.mjs` or any AI model. Work stays inside
`.worktrees/kb-f`; nothing written outside the project (no Desktop, no
`~/`). `npm run check` read by EXIT CODE only, never by grepping output.
Always `git fetch origin` before branching or pushing — main moved multiple
times across this session and every time cleanly, because this was
followed without exception. Push and report; never merge to main. If a hub
instruction contradicts what the code actually says, say so — this came up
twice this session (the streaming claim, corrected; the design-tension flag
on the dialog's own comment, raised and then resolved by updating the
comment rather than the code).

READY TO COMPACT.
