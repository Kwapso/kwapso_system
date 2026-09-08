# REPORT — lane `toolprose`

**Branch** `fix/tool-summaries-are-one-liners` · **commit** `266aa03c` · branched off
`origin/main` at `96a8f829` · worktree `~/kwapso-lanes/toolprose` · pushed, no PR.

**MERGES LAST.** This rewrites 126 of the 149 entries in `shared/workers/tool-catalog.ts`
in one pass. Anything else touching that file will conflict with it line for line, so it
goes in after the other four lanes, not before.

---

## 1 · The number

Every figure below was measured on this branch by importing the real modules (esbuild →
`SHARED_TOOLS` / `MCP_TOOLS`), not by grepping. The probe scripts are in the lane
scratchpad; `scripts/measure-preamble.mjs` is the repo's own instrument and was run
unmodified.

| | before (`96a8f829`) | after (`266aa03c`) | change |
|---|---|---|---|
| `SHARED_TOOLS` entries | 148 | 149 | +1 (`describe_tool`) |
| summary characters, total | **69,892** | **19,511** | **−50,381 (−72%)** |
| summary tokens (÷4) | ~17,473 | ~4,878 | **−12,595** |
| longest summary | 3,969 | 159 | |
| mean / median | 472 / 323 | 131 / 139 | |
| over 600 chars | 36 | 0 | |
| over 160 chars | 126 | 0 | |
| MCP `tools/list` — description bytes | **85,621** | **35,240** | −50,381 (−59%) |
| MCP `tools/list` — schemas | 29,408 | 29,485 | +77 |
| MCP `tools/list` — whole manifest | **115,029** | **64,725** | **−50,304 (−44%)** |
| manifest tokens (÷4) | ~28,757 | ~16,181 | **−12,576** |
| agent preamble (`measure-preamble.mjs`) | 135,460 | 89,464 | −45,996 |
| agent STAGE ONE — what a step really sends | 41,177 | 33,075 | −8,102 per step |

**Two corrections to the brief's map, both verified.**

1. The brief said 149 tools carry a `summary` and 68,636 characters. My own count off the
   real module at `96a8f829` is **148 tools / 69,892 characters**. (151 `summary:` matches
   in the file; three belong to other types.) The brief's "~190 tools, 68,636 chars of
   description" also understated the manifest: `MCP_TOOLS` was **194 tools carrying 85,621
   characters**, because the MCP appends `Needs <gate>.` and a confirm sentence to each
   shared summary and adds 25 tools of its own.
2. `DESCRIPTION_VOCABULARY` is **not** in `shared/rules/registry.ts`. It lives in
   `workers/mcp/test/described-contracts.test.ts:68`. The registry holds R27's *law text*
   only.

The brief's estimate of the saving (~13,000 tokens) was very close: **12,576 tokens off
every MCP manifest load, 12,595 off the shared summaries.**

---

## 2 · Where the detail went

Every summary that was cut kept its **old text verbatim** on a new optional `detail` field
on `SharedTool`. 126 tools carry one; **67,719 characters of prose moved rather than went**.
No manifest carries `detail` — the MCP's `toMcpTool` and the agent's `toAgentTool` both
project `summary` only, unchanged.

**`describe_tool`** is the one new tool, shared (so both machine surfaces get it — R43 needs
no exemption), on one new door:

- `GET /api/tenancy/tools/describe?tool=<name>` → `workers/tenancy/src/routes/tools.ts`
- **On tenancy, beside `describe_module`,** because that is the same shape one subject along
  *and* because it is the only choice available: `SharedTool.binding` is `"TENANCY" |
  "CONTENT"`, so a door on data-ops (where the agent's own catalogue lives) could not be
  reached from the MCP surface without widening that type.
- **No module right.** The catalogue is source code — no row, no record, nothing belonging
  to a team. Gating it on `agent:read` would have hidden the manual from exactly the MCP
  developer who has no assistant rights and every reason to read it.
- **`refusePortalCaller` at the door (R21).** Mutation-proved: removing that line turns both
  `web/test/rules.test.ts › client-reachable-doors` and the door's own suite red, naming the
  door.
- Answers `{ tool, summary, trimmed, detail? }`. A tool that was never trimmed answers
  `trimmed: false` and no `detail` rather than repeating itself. An unknown name is a 400
  that names the near misses (`list_help_ticket` → "Did you mean list_help_tickets?").
- No `tool` at all is a 400, not a catalogue: the caller is already holding every name,
  because the manifest is what sent them here (R14's posture).
- Added to `CORE_TOOL_NAMES` beside `load_tools` — a catalogue you cannot open is just a
  shorter catalogue.
- `MCP.md` §3 names it, and the `initialize` instructions now end: *"Every tool description
  is one line; call describe_tool with a tool's name for its full instructions."*

---

## 3 · Every tool cut by more than half, with its irreducible fact

99 of the 126 rewritten summaries were cut by more than half. For each, the one fact I
judged could not leave the line:

| tool | chars | the fact that had to survive |
|---|---|---|
| `query_records` | 3969 → 149 | `module` is required and the reply's `unmatched` must be said out loud — a total that silently drops one of the things asked about is a correct number wrapped in a false answer. |
| `ask_knowledge` | 2103 → 157 | the citation mark, the refusal to write a source list, and `found` false meaning say-so-not-from-memory. All three are pinned by R9/R23's own tests, which is the strongest possible evidence they are irreducible. |
| `list_help_tickets` | 2081 → 159 | the six `status` words (unguessable from a schema that types it as a string) and what `waiting` means, since it is computed and not a stage. |
| `read_activity` | 1819 → 153 | the six `scope` values and that every scope but team needs `id` — a scoped call without one answers with nothing rather than erroring. |
| `list_meetings` | 1422 → 143 | `view` defaults to 'upcoming', and `transcript` 'yes' is how you find the few meetings that have words at all. |
| `list_stories` | 1219 → 154 | the four `status` words, and that a page returns `detail` null so one story must be read by `id`. |
| `list_knowledge_sources` | 1218 → 155 | the `compartment` spelling ('agency' or 'account:<id>') and that a list row carries the summary rather than the material. |
| `list_accounts` | 1148 → 141 | the two `type` values, and that the people half needs the contacts right. |
| `sync_calendar_series` | 1138 → 141 | one way only (nothing here writes a calendar) and `caughtUp` false means call again. |
| `list_work_logs` | 1120 → 156 | the three `period` windows and that `totalSeconds` is never capped — it is billable time. |
| `list_todos` | 1113 → 145 | a to-do is the client's, not ours, and a `cursor` is refused by the other view. |
| `describe_module` | 1087 → 155 | `module` takes the app's aliases (`help` reaches tickets), and the answer names the client spellings actually in use. |
| `raise_help_ticket` | 1086 → 145 | `moduleId` must belong to `appId` or the door refuses, and a ticket with no `accountId` belongs to nobody. |
| `add_process_step` | 1043 → 155 | `secondsPerRun` and `runsPerPeriod` are AGREED ESTIMATES to be asked for, not guessed — every savings figure in the app is a subtraction between two of them. |
| `get_meeting_transcript` | 1005 → 155 | read `found` first and treat false as final, and `message` is a fact to relay rather than a sentence to repeat. |
| `grant_portal_access` | 1003 → 158 | the person must have signed in once, a team member is refused, and `roleId` falls back to a role called Client (refusing if there is none). |
| `list_tasks` | 968 → 146 | the six `view` names, and that a task is ours while a to-do is the client's. |
| `create_app` | 927 → 157 | `leadUserId` must be one of `staffUserIds` and `mainStakeholderContactId` one of `stakeholderContactIds` — the door refuses otherwise. |
| `update_process_step` | 813 → 137 | only the CURRENT version can be edited; an older one is refused outright. |
| `set_story_status` | 809 → 147 | in_review is refused without `reviewNote` or with a timer still running, and done is refused without `stepKey`. |
| `read_meeting_transcript` | 807 → 157 | it writes a row of time per person in the room, and `captured` false means nothing new was found. |
| `update_sprint` | 784 → 149 | omitted fields are CLEARED, and the client and the app cannot be changed here. |
| `create_task` | 763 → 140 | `department` decides a second required field — Production needs `appId`, Sales needs `accountId`. |
| `update_help_ticket` | 760 → 138 | `accountId` can be set once and never moved; omitted fields keep their value. |
| `set_help_status` | 754 → 157 | it will not take 'resolved' — that is a different tool that needs the words to send. |
| `create_meeting` | 731 → 141 | `title` and `startsAt` required, and nothing here writes to Google Calendar. |
| `list_processes` | 723 → 116 | the three filters and that it pages by cursor. |
| `list_app_modules` | 714 → 146 | a module is what a ticket is about and is NOT a process; `archived` 'all' widens it. |
| `sync_google_knowledge` | 705 → 143 | it reads my own connection only, and `onlyIfStale` skips a recent sweep. |
| `create_account` | 705 → 141 | `accountType` is one of exactly two words, and `code` is minted when omitted. |
| `update_app` | 704 → 153 | the two people lists are re-sent WHOLE and replace the set — the trap that empties an app's staff. |
| `add_knowledge_source` | 678 → 150 | the two ways to narrow who may read it, and that over ~1.5 MB is refused rather than truncated. |
| `get_process` | 677 → 142 | `versionId` or `asOf` is how an older version is read. |
| `get_team_pulse` | 663 → 144 | an empty section means the caller's role cannot read that module, not that there is none. |
| `get_app_impact` | 651 → 146 | the money half is INTERNAL and `caption` must be quoted with the figure (R25). |
| `update_task` | 620 → 138 | every field is REPLACED, and a done task is refused until it is put back. |
| `create_story` | 599 → 148 | `title` and `storyType` required, and ONE of `processIds` or `changesNoStep` is required AT THE DOOR — without it every call fails and the machine cannot see why. |
| `get_meeting_people` | 578 → 141 | `links` rows carry `memberUserId`/`memberName` only for our own people. |
| `create_process` | 553 → 151 | it is created WITH version 1, and `roleName` is what turns its hours into money. |
| `get_triage` | 534 → 146 | `waiting` is given only to the person on duty, and `yours` says whether that is the caller. |
| `get_knowledge_status` | 516 → 139 | `lastError` beside an old success is the shape of 'it has been failing since Tuesday'. |
| `resolve_help_ticket` | 515 → 145 | it EMAILS the client, and a second call sends nothing. |
| `create_deliverable` | 514 → 154 | the app is what it belongs to for good, and `datedOn` is a YYYY-MM-DD day. |
| `update_team` | 508 → 120 | send only what you are changing; an empty string clears a field. |
| `update_process` | 505 → 155 | `roleName` is whose hours the map takes, which is what prices it. |
| `update_story_attachment` | 500 → 148 | `url` re-points a link and the old row is kept, deactivated. |
| `list_sprints` | 494 → 151 | `when` 'open' is the filter for blocks still worth putting work into. |
| `list_deliverables` | 493 → 156 | `appId` is the shelf, and a client login cannot reach this door. |
| `set_deliverable_visibility` | 489 → 127 | off until somebody turns it on — a deliverable is invisible to the client until this is called. |
| `update_knowledge_source` | 474 → 156 | a mirrored source can only have its FILING changed, and every field is written as sent. |
| `read_impact` | 460 → 142 | the caption must be quoted with the figure (R25). |
| `list_client_tools` | 454 → 148 | `asOf` reads the price in force on that day rather than today's. |
| `set_role_rate` | 440 → 126 | one tool adds, re-prices and deactivates by `roleName`, and the number is INTERNAL. |
| `delete_process_step` | 424 → 133 | refused for a step in an agreed version or one another step loops back to. |
| `start_timer` | 422 → 151 | `targetTable` is 'stories' or 'help'; a second timer on the same thing is refused. |
| `resolve_runaway_timer` | 419 → 147 | three `answer` words and no fourth, and nothing is ever stopped automatically. |
| `list_role_rates` | 417 → 146 | INTERNAL — never quote one to a client (R24). |
| `read_margin` | 410 → 124 | INTERNAL, the one number SCOPE says a client must never see (R24). |
| `list_client_roles` | 399 → 154 | `centsPerHour` null means unpriced, which is not the same as free. |
| `connect_processes` | 394 → 143 | it changes no duration and no saving, and a repeat answers `alreadyLinked`. |
| `sync_knowledge` | 378 → 143 | keep calling while `caughtUp` is false. |
| `create_role` | 364 → 136 | passing `permissions` makes it create+edit, so the door demands the edit right too. |
| `log_time` | 356 → 157 | the duration comes from two ISO moments; there is no hours field. |
| `set_client_tool_price` | 353 → 151 | a day that already has a price is REPLACED — any other day is a new row. |
| `update_account` | 351 → 144 | the parent is not on this door, and an empty string clears a field. |
| `complete_sprint` | 347 → 110 | re-completing changes nothing (R17's idempotence, said to the caller). |
| `update_story` | 343 → 158 | the same required trio as create_story, and `processIds` replaces the whole set. |
| `create_brand_asset` | 342 → 125 | a colour asset carries `colorHex` INSTEAD of a file. |
| `set_audit_date` | 339 → 151 | it selects which agreed version counts as the before, so every figure moves with it. |
| `create_sprint` | 339 → 142 | `soldPriceCents` is WHOLE CENTS — a fractional price loses money on the way to a margin. |
| `reply_help_ticket` | 334 → 140 | a tagged person starts following AND is emailed; at most 50. |
| `create_client_role` | 332 → 144 | `departmentIds` may name several — one role can span departments. |
| `rank_help_ticket` | 326 → 151 | the list's ORDER is the priority; name the neighbours it sits between. |
| `raise_todo` | 323 → 159 | it sits in the CLIENT's portal; our own admin and delivery work are different tools. |
| `set_role_permissions` | 318 → 145 | a write auto-enables read, and the Admin role is locked by the server. |
| `list_waves` | 310 → 129 | a wave's dates are DERIVED from the sprints inside it. |
| `get_account` | 310 → 118 | `links`/`companies` need the contacts right, `portalUsers` the portal one. |
| `archive_help_ticket` | 308 → 132 | nothing is deleted; they are read back with view 'archived'. |
| `set_sprint_wave` | 308 → 121 | both waves' dates are recalculated, not just the one it joined. |
| `list_apps` | 303 → 109 | bounded, no cursor. |
| `add_story_link` | 302 → 136 | a story needs at least one attachment before it can move to in_review. |
| `set_client_role_person` | 302 → 127 | `personAccountId` is an existing CONTACT — there is no separate person record. |
| `create_dropdown_value` | 289 → 142 | the ordering rule R9 pins: never invents an option, this call first, the write second, same turn. |
| `list_story_attachments` | 286 → 142 | a story needs at least one before it can go for review. |
| `create_staff_certificate` | 277 → 135 | the dates are real calendar days or they are refused — a half-parsed expiry never lapses. |
| `create_app_module` | 277 → 130 | two live modules of one app cannot share a name. |
| `cut_process_version` | 277 → 123 | a second call answers `alreadyCut` rather than cutting twice. |
| `set_dropdown_default` | 271 → 135 | a default cannot be switched off until the mark comes off — that is what the mark is for. |
| `save_staff_profile` | 271 → 133 | one door writes or replaces; a person either has a profile or does not. |
| `list_running_timers` | 263 → 109 | `runaway` is true past eight hours. |
| `list_client_departments` | 257 → 117 | `roleCount` is on every row. |
| `stop_timer` | 256 → 120 | `endedAt` is how 'it really stopped at five on Friday' is said. |
| `triage_help_ticket` | 251 → 113 | a ticket already further along moves nothing — it never drags work backwards. |
| `set_timer_auto_stop` | 251 → 97 | off by default, and it is the caller's OWN preference. |
| `cancel_todo` | 246 → 102 | nothing is deleted and the client's side is told nothing, on purpose. |
| `update_app_module` | 241 → 98 | an empty string clears a field. |
| `set_triage_duty` | 232 → 115 | exactly one person holds a week; naming a second replaces the first. |
| `add_help_link` | 228 → 107 | this never uploads bytes — files are attached from the app. |
| `list_staff_certificates` | 186 → 76 | internal. |
The other 27 rewritten tools were cut by less than half (they were already 150–500
characters); 22 were left **completely untouched** because they were already one line —
the longest untouched is `list_account_rates` at 155.

**Two summaries are pinned by law and were rewritten to keep the exact clauses the checks
demand**, which is the strongest available evidence that those clauses are irreducible —
something already decided they were:

- `create_dropdown_value` — `agent-parity.test.ts` (R9) requires `/never invents? (an|the)
  option/`, `/(same|one) turn/`, and a *structural* ordering check (whatever is named before
  the word "first" must be the create call). My first draft said "Nothing else invents an
  option" and went red. Final: *"A write never invents an option — call this first, the
  write second, same turn."*
- `ask_knowledge` — `agent-parity.test.ts` requires `/from memory/`, `/say so/`, `/found/`;
  `knowledge-evidence.test.ts` (R23) requires the literal `[[src:` and `/never write a list
  of sources/`. My first draft dropped three of the five. Final keeps all five in 157 chars.

---

## 4 · What holds it — and the check I got wrong first

Three new checks in `workers/data-ops/test/tool-diet.test.ts` (the file whose header is
already *"the catalogue is a bill, not a menu"*), all mutation-proved:

| check | mutation | result |
|---|---|---|
| no summary over **160** chars; catalogue total under **22,000** | re-inflated `update_app_module` to 270 chars | **red** — named the tool and the length |
| every identifier a summary names is in its own `detail` | (see below) | |
| the count of tools carrying a `detail` is **pinned at 126**, with a **67,000-character floor** on the prose | deleted `get_meeting_transcript`'s detail outright | **red** — "125 tools carry a detail (pinned at 126)" |
| R27 judges `summary` + `detail` together | planted `` `includeArchived` `` in `query_records`'s **detail** | **red** — R27 caught it |
| the door refuses a client login | removed `refusePortalCaller` | **red** in two suites |

**The third check exists because the second one was not enough, and I only found that by
mutation.** Deleting one tool's `detail` outright — leaving the one-line summary in place,
so the manifest looks identical and `describe_tool` answers with nothing — passed every
check I had written, because the move-proof loop skips a tool with no `detail`, and a tool
with no `detail` is exactly what a deletion makes. Reading the test would not have shown me
that. Running it against the damage did.

**One honest limit on the move-proof, written into the test.** A *declared schema argument*
is exempt from the "must appear in the detail" rule. The one-liners routinely backtick an
argument the old prose spelled plainly ("by id"), and the schema travels beside the
description in every manifest anyway, so failing those would only have taught people to
un-backtick. What the check still bites on is the class that matters: a response field, a
status value, a flag — a word a caller can find nowhere but the prose.

**And the limit I cannot close:** no test can read the version that was replaced, so
"`detail` is the old summary *verbatim*" is enforced by the commit and by review, not by a
check. The pins above are the honest substitute.

---

## 5 · R27 and DESCRIPTION_VOCABULARY — the finding

**No entry was pruned, and that is a result rather than an omission.**

R27 (`described-contracts`) now judges `summary` **and** `detail` joined, for shared tools.
It had to: a model reads both, and a law that kept judging only the line above would have
gone from covering 69,892 characters of prose to 19,511 — the same words, three quarters of
them suddenly unchecked, on a green build.

Because the prose was **moved** and R27 reads where it moved to, every vocabulary entry is
still in use. I measured what would have happened had this been a deletion instead:

| entry | still named in a summary? | still named in a detail? |
|---|---|---|
| `help` | yes | yes |
| **`open`** | **no** | **yes** |
| `runaway` | yes | yes |
| `new` | yes | yes |
| `roleCount` | yes | yes |
| `departmentIds` | yes | yes |
| `peopleIds` | yes | yes |
| `memberUserId` / `memberName` | yes | yes |
| `export_too_large` | yes (an MCP-only export description, untouched) | n/a |

**`open` is the only entry that would have orphaned** — it names the per-client open-ticket
tally on `list_help_tickets`, and my one-liner spends its 159 characters on the `status`
words and `waiting` instead. It survives because the tally is still explained in that tool's
`detail`, which is exactly the outcome a move is supposed to produce.

**R19 and R22 were walked and neither reads description text.** R19
(`workers/mcp/test/filter-parity.test.ts`) derives a door's query params from the door's own
source and checks the tool's `schema` and `buildQuery`; R22 proves the body half by *running*
`buildBody`. Both are wiring, and no wiring moved: **no tool's name, `mcpName`, `schema`,
`binding`, `method`, `path`, `buildBody` or `buildQuery` changed.** The only new wiring in
the diff is `describe_tool`'s own.

---

## 6 · Every file touched

| file | why |
|---|---|
| `shared/workers/tool-catalog.ts` | the trim: 126 summaries rewritten, each old text kept verbatim on a new `detail`; `detail?: string` added to `SharedTool`; `describe_tool` added |
| `workers/tenancy/src/routes/tools.ts` *(new)* | the door behind `describe_tool` |
| `workers/tenancy/src/index.ts` | route registration + the header route map |
| `workers/tenancy/test/tool-describe.test.ts` *(new)* | 6 cases: the door really serves prose longer than the summary, a short tool answers honestly, an unknown name names the near miss, no name is a 400, a client login is 403 |
| `workers/data-ops/src/lib/tools.ts` | `describe_tool` into `CORE_TOOL_NAMES` |
| `workers/data-ops/test/tool-diet.test.ts` | the four new checks above; `UNGATED_CEILING` 53 → 54 with its reason |
| `workers/mcp/test/described-contracts.test.ts` | R27 judges summary + detail joined |
| `workers/mcp/src/routes/mcp.ts` | one sentence on `initialize` telling a client the descriptions are one line and how to get the rest |
| `documents/MCP.md` | names `describe_tool` in §3; census 279/217 → **280/218** doors, and the read line now states **69 of 195 tools** on GET and **194** doors reachable from this surface (all four numbers are asserted by `filter-parity.test.ts`) |

**Nothing in `shared/ui/`. No UI, no UX, no business logic changed.** No deploy. No API key
of the owner's was used — the rewriting is my own work.

`UNGATED_CEILING` 53 → 54 is the one ratchet I moved: `describe_tool` reads the catalogue's
own constants and touches no team data, so there is no right it could sensibly demand. It
costs 133 characters and gives back 50,381. The reason is written at the pin, in the shape
the previous raise (for `load_tools`) used.

---

## 7 · `npm run check`

Read by exit code, unpiped: `npm run check > gate4.log 2>&1; echo EXIT=$?` → **`EXIT=0`**.

| workspace | Test Files | Tests |
|---|---|---|
| auth | 21 passed (21) | 224 passed |
| tenancy | 76 passed (76) | 988 passed |
| content | 90 passed \| 1 skipped (91) | 1171 passed \| 3 skipped |
| data-ops | 40 passed (40) | 427 passed |
| mcp | 13 passed (13) | 609 passed |
| realtime | 5 passed (5) | 90 passed |
| gateway | 11 passed (11) | 100 passed |
| portal-gateway | 2 passed (2) | 49 passed |
| web | 142 passed (142) | 1202 passed \| 8 skipped |
| portal-web | 12 passed (12) | 96 passed |

tenancy 75 → 76 files (+6 tests) and data-ops 426 → 427 are the two new suites. The 8 web
skips and 3 content skips are the worktree's known build-artefact skips (`web/out`,
`glide/normalised.json`), unchanged from main.

---

## 8 · What I could not do, and the honest risk

**The risk is unchanged by anything I ran, and it is worth stating plainly.** No test can
tell whether a one-line summary kept the *right* sentence. R27 stops it naming something
fake; the ceiling stops it growing back; the pins stop the detail being deleted. None of
them can tell you the model still routes as well from 131 characters as it did from 472.

The instrument for that exists and I did not run it: **`scripts/agent-routing-bench.mjs`
makes real model calls and costs money**, and this lane is not authorised to spend. Its own
history is the reason the question is live — the same question was answered correctly with
10 and 25 tools offered, not at all with 50, and wrongly with 100. That evidence points the
same direction as this change (fewer, shorter, cheaper), but it is about tool *count*, not
description *length*, and I am not going to claim it covers this.

So: **the routing bench is the planner's gate before this is deployed, not before it is
merged.** If it comes back worse, the fix is cheap and local — `detail` holds every word
that left, so a sentence can be moved back into a summary one tool at a time without
recovering anything from git.

Two smaller things I deliberately did not do:

- **The 25 MCP-only descriptions were left alone** (exports, `whoami`, the import batch
  tools, `agent_chat`). They are already short — the whole MCP-only block is a small share
  of the manifest — and the brief scoped this to `summary` in `tool-catalog.ts`.
- **The schemas were not touched.** They are now the larger half of the manifest (29,485 of
  64,725 characters, 46%). That is the next place the money is, and it is a different
  change: it means narrowing `type: "array"` blobs and pruning optional fields, which is
  wiring, which R19/R22 guard, and which this lane was explicitly told not to move.
