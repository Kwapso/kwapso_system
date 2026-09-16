# MCP blackbox — findings and ranked fixes

Scored from the `mcp_blackbox_tester` session transcript (exported
2026-09-17), `scripts/mcp-blackbox/score.mjs`, `mcp_call_log` on staging's
core DB, and the harness's own saved oversized-reply files. Full numbers
in `scoring.md`. Score: **9/10** (task 10 FAIL). **0 errors, 0 wrong
turns, no task over 5 calls.** Read the caveat below before trusting that
"0 errors" as a statement about the sandbox role.

## Before the ranked list: the run didn't test what it meant to

`mcp_call_log` (core DB, staging) shows every one of the 16 calls
running under token `01M284X2D7SG3GF30A80YNEXFX` ("kwapso_02", owned by
`alaap@kwapso.com`, full Admin rights on the Kwapso team) — **not**
`01M2N1JV4Y23M64E6W7SRG6662`, the narrow "Machine tester" sandbox token
`setup.mjs` minted and `cleanup.md` documents. That sandbox token's own
`last_used_at` stops at 17:24 UTC (two calls, `list_apps`/`query_records`
— a setup-verification probe, not the test), hours before the tester's
real run at 20:21–20:24 UTC.

**Root cause**: `scripts/mcp-blackbox/setup.mjs:73`'s `signIn()` helper
unconditionally POSTs `/api/auth/profile` with `firstName: "Blackbox",
lastName: "Tester"` for *whichever* email it just signed in — including
`ADMIN_EMAIL` (`alaap@kwapso.com`), not only the dedicated
`OWNER_EMAIL`. That's why `whoami` on the real, unscoped token now
returns `"firstName":"Blackbox","lastName":"Tester"` — it's Alaap's own
account, renamed by the script's own side effect, not the sandbox
identity. The tester session's MCP connector was never pointed at the
minted sandbox token at all; it inherited whatever standing "kwapso"
connector this project's Claude Code sessions already have configured
(this reviewing session's own `whoami` resolves to the identical user
and team — same connector, same token family).

**Consequences**:
- "0 errors, 0 wrong turns" reflects an unrestricted admin caller hitting
  no permission wall — it says nothing about whether the "Machine
  tester" role's actual rights matrix (read-everywhere, write only on
  help/inputs/work, no delete, no agent) is usable or well-described.
  That was the whole point of building the role, and it went untested.
- The two BLACKBOX-* rows (task 8's ticket, task 9's to-do) were created
  under Alaap's real identity, not a disposable sandbox one.
- `cleanup.md`'s documented token was a decoy: live, never touched by
  the real test, and safe to revoke (done — see below), while the token
  that actually did every read and write was never named in any cleanup
  step and is still live.
- **Not revoked, and not touched, in this session**: `01M284X2D7SG3GF30A80YNEXFX`
  ("kwapso_02"). It is not the token `cleanup.md` names, it predates this
  test by five days (created 2026-09-11), and it is evidently a live,
  standing personal token — this reviewing session's own connector
  resolves to the same user/team. Revoking a live personal token on
  someone else's say-so, without the token's own owner confirming it's
  disposable, is exactly the kind of hard-to-reverse action this project
  asks to be checked first. **Decide with the owner before anyone revokes
  it.**

**Fix, if this test is run again**: `setup.mjs:73` should only rename
`OWNER_EMAIL`'s profile, never `ADMIN_EMAIL`'s — and the tester's actual
MCP connector needs to be verified (via `whoami`) to be standing on the
sandbox token/team *before* the tester starts, not inferred from
`cleanup.md`'s notes afterward.

## Ranked fixes (product code, not test scaffolding)

### 1. Write doors return a full unscoped list instead of the touched row — 130KB+ per ticket write

**What wasted the most.** `create_help_ticket` (task 8) cost **65,167
bytes** to report back one new ticket's id; `update_help_ticket` cost
**65,178 bytes** and doesn't even surface the id. Both return the
identical shape `list_help_tickets` returns for its own unfiltered
50-row page — `tickets[50]`, `total`, `byType`, `byStatus`, `byAccount`
— computed over the **whole team** (2,073 tickets), not scoped to the
account just written to.

- **Where**: `workers/content/src/routes/help.ts:97-141` (`ticketPage`,
  the shared response builder for the list GET and both writes),
  `:294-311` (`postCreateHelp` — ends `ticketPage(..., EVERYDAY_LIST, null,
  undefined, id)`, so create's own id at least rides an extra field),
  `:313-325` (`postUpdateHelp` — same call with no `createdId` argument,
  so update never surfaces the id it just touched). The doctrine comment
  at `:214-217` states the intent on purpose: *"WHAT A MUTATION ANSWERS
  WITH: the everyday list, unfiltered. A write re-primes the screen's
  cache."*
- **Same shape, same fix needed**: `workers/content/src/routes/stories.ts:201-239`
  (`postCreateStory`/`postUpdateStory` → `storyPage`),
  `workers/content/src/routes/todos.ts:253-274,542-616,630-668`
  (`postCreateTodo`, `postCreateTask`, `postUpdateTask` →
  `todoPage`/`taskPage`).
- **The leaner pattern already exists in-house**: `workers/tenancy/src/routes/accounts.ts:379-407`
  (`postCreateAccount`) returns just `{ id }`.
- **Shared with the UI, not MCP-specific**: `workers/mcp/src/lib/tools.ts:354,372`
  (`forwardTool`) is a pure pass-through — `res.text()` straight to the
  caller, no reshaping. The web UI's own create-ticket form gets the
  identical oversized body; it's tolerated there because the browser
  cache layer consumes and discards most of it, but an MCP client has to
  receive and read the whole thing over JSON-RPC.
- **Law**: adjacent to **R1** — `publish-seam`'s check only verifies
  `publishChange` fired correctly (which it does, at `help.ts:306,323`),
  not what the synchronous HTTP response body contains, so this doesn't
  fail the build. But CLAUDE.md's own gloss on R1 and `CACHING.md §3`
  state the doctrine this violates word for word: *"patch the changed
  row, never refetch the list."* This is a write door refetching the
  list, on purpose, every time.
- **Fix**: have `ticketPage`/`storyPage`/`todoPage`/`taskPage`'s CREATE
  and UPDATE call sites return `{ id, ...touchedRow }` the way
  `postCreateAccount` already does, instead of re-running the full page
  query. If the web UI's own cache genuinely needs the fatter shape to
  re-prime itself, that's a UI-side call, and MCP/API callers who don't
  want it shouldn't have to pay for it by default.

### 2. `list_help_tickets` always returns the row page even when only its own aggregates answer the question

Task 5 needed exactly two numbers (total: 380, not-resolved: 30). The
tool's reply **already carries the exact `byStatus` aggregate** needed
for both — `{"new":27,"in_progress":1,"triaged":1,"ready":1,"resolved":350}`,
computed server-side over the full 380-row set, not just the visible
page — but the same reply also includes 50 full ticket rows (every
field: description, raiserName, timestamps, …) that answer nothing the
task asked. 71,844 bytes total; the aggregates alone would be a few
hundred.

- **Where**: same `ticketPage` builder, `workers/content/src/routes/help.ts:97-141`.
- **Law**: same R1 doctrine; not an R14 (`bounded-lists`) violation — the
  underlying read is correctly paged/capped, the waste is that a caller
  who wants only the aggregate has no cheaper door than the full page.
- **Fix**: either (a) an opt-in `rows:false`/`summary:true` parameter on
  the paged list tools that skips the row array and keeps the
  aggregates, or (b) since `query_records` with `countOnly`/`groupBy`
  already does exactly this cheaply and the tester DID reach for it
  correctly elsewhere in this same run (tasks 6/7), strengthen
  `list_help_tickets`'s own description with the same kind of redirect
  it already gives for prose ("For prose, ask_knowledge") — e.g. "For a
  count only, query_records with countOnly is cheaper."

### 3. `list_apps` offers no filter, and no redirect to the tool that does

Task 4 (apps in stage Maintenance) forced a hand count across all 28
rows already in hand from task 3 — it landed on the right answer (11,
independently re-verified live), but only because the module is small
and bounded today. `list_apps`'s description says "Bounded: no cursor"
and gives no hint that `query_records` (module `apps`, `where`/`groupBy`)
is the door for a filtered or counted question — unlike
`list_help_tickets`/`list_todos`, which both redirect prose questions to
`ask_knowledge` in their own one-line description.

- **Where**: `shared/workers/tool-catalog.ts` (the `list_apps` entry).
- **Law**: possibly **R19** (`agent-filter-parity` — "a tool on a list
  door exposes + forwards every filter the door parses") if the
  underlying apps door already parses a `stage` query param that
  `list_apps` simply doesn't forward — **not verified in this pass**,
  worth a follow-up read of the door's own route before assuming it's
  only a description gap.
- **Fix**: at minimum, add the same one-line redirect pattern
  (`list_help_tickets`/`list_todos` already carry) pointing a
  filtered/counted apps question at `query_records`; if R19 does apply,
  forward the filter itself.

### 4. Task 10's knowledge answer never reached the account/app material it was asked about

`ask_knowledge({"q":"What do we know about Confia?"})` returned
`found: true` but its only citation was a barely-relevant ticket (score
0.002, the router's own accept floor) about a filtering feature request
— nothing from the Confia account row or the CONFIA app, despite the
answer-key's own note that both are fully, currently indexed. The
route's coarser, record-level pass (a separate search stage, surfaced as
`records` in the raw reply) correctly named the CONFIA app as the
relevant record — so the router knew where to look — but the
passage-level search that actually produces citations pulled nothing
from it.

- **Where** (not fully traced this pass — starting point only):
  `workers/content/src/lib/knowledge.ts`, the passage-level
  `searchVectors` call downstream of the record-level pass around
  `:2941` (`deriveRoute`).
  Speculative root cause, **not verified**: the `account`/`app`
  knowledge kinds may carry too little free text per source (a handful
  of fields — name, code, contact, url, stage) to chunk into any passage
  that clears the same relevance floor a ticket's long free-text body
  clears easily.
- **Law**: **R23** (`cited-answers`) is satisfied on its own narrow
  terms (no citation without a passage, no invented fact); the miss is
  upstream, in retrieval never finding the right passage to cite. R47's
  (`assistant-coverage`) letter is satisfied too (the modules ARE
  indexed) — its spirit (a person can actually get a straight answer
  about a module they can see) is not.
- **Fix**: needs an actual trace of what a source in the `account`/`app`
  knowledge kinds looks like once chunked, before proposing a specific
  change — flagging as the next thing to look at, not a diagnosed root
  cause.

### 5. The scorer itself undercounts oversized replies by 40–60x

Not a product bug — a bug in the grading instrument
(`scripts/mcp-blackbox/score.mjs`) that would silently mis-grade every
future run of this same test. The transcript's own `tool_result.content`
is not the tool's real reply once the harness truncates an oversized one
— it's a short pointer ("Error: result (71,419 characters across 1
line) exceeds maximum allowed tokens... saved to <file>"). `score.mjs`
counts that pointer's bytes (1,650), not the reply's. This run, three of
sixteen replies were undercounted this way, and the auto-scored output's
own conclusions were wrong as a result: it named `list_accounts`
(41,956 bytes, correctly counted) as the largest reply and the only one
over 20,000 characters, when the true largest is `list_help_tickets` at
71,844 and four replies cross 20,000, not one.

- **Where**: `scripts/mcp-blackbox/score.mjs:58-59` (the `results.set`
  line that takes `Buffer.byteLength` of whatever's in `tool_result.content`
  without checking for the harness's own truncation marker).
- **Fix**: the pointer message already states the true original size in
  plain text ("result (N characters across M lines) exceeds maximum
  allowed tokens") — a regex against that line recovers the true count
  with no file access needed. Do this before this scorer is trusted
  again on a run with any large reply, which — per finding #1 — is most
  runs that touch a write door.

---

*Cleanup done this session (see `cleanup.md`): ticket `T3831`
(BLACKBOX-1) archived, to-do `I0002` (BLACKBOX-2) cancelled, sandbox
token `01M2N1JV4Y23M64E6W7SRG6662` revoked and its Keychain entry
dropped — all independently verified after the fact, not just
requested. The token that actually ran the test, `01M284X2D7SG3GF30A80YNEXFX`,
was deliberately left untouched; see the caveat above.*
