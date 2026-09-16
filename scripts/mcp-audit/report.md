# Is our MCP good? — audit, 2026-09-15

Branch `feat/mcp-quality`. Audited: `shared/workers/tool-catalog.ts` (137 tools, shared with the in-app agent) + `workers/mcp/src/lib/tools.ts` (18 record-toggle tools + 1 generic toggle + 23 MCP-only tools) = **179 tools on the live surface today**, re-counted off the deployed catalogue on staging, not trusted from memory. (The brief's "161" and MCP.md's "184" are both stale — see §6.)

## Score: 82 / 100

| Dimension | Weight | Score | Weighted |
|---|---|---|---|
| Per-tool description quality (name/summary/detail/schema/errors, see §1) | 30% | 84.0 | 25.2 |
| Reveal depth — can `describe_tool` actually deliver the second half? (§2) | 20% | 76.5 | 15.3 |
| Bloat control — manifest size, and who pays for it (§3) | 15% | 70.0 | 10.5 |
| Traceability — can a call be reconstructed after the fact? (§4) | 15% | 85.0 | 12.75 |
| Measured real-world usability — 10 questions, fresh models, live data (§5) | 20% | 92.0 | 18.4 |
| **Total** | | | **82.15 → 82** |

Each sub-score's own arithmetic is in its section. Recompute with different weights if you disagree with mine — every number behind them is in `scripts/mcp-audit/scored-table.csv` and `catalog-dump.json` (regenerate with `scripts/mcp-audit/README.md`'s Part A commands).

**The headline:** the two-step reveal itself — one-line summaries on `tools/list`, full prose on request — is a *good* design, proven by the fact that a fresh Haiku model with zero other context answered all 10 real questions correctly from the one-liners alone, calling `describe_tool` only twice in ninety tool calls. What drags the score down is not the prose, it's two structural gaps behind it: `describe_tool` cannot actually reach 42 of the 179 tools (23%) it promises to explain, and `tools/list` sends the same full manifest to every caller regardless of role, a problem the in-app agent catalogue already solved for itself. Both are door/architecture changes, out of this PR's "descriptions only" scope — see §7.

---

## §1 — Per-tool description quality

Scored 0–3 per column, 179 rows, full table in `scored-table.csv`. Methodology: name and schema-field-description scores are mechanical (checked against the real schema shapes); summary and detail scores are a length/content heuristic cross-checked by reading every one of the 119 `detail` fields and all 18 (now 17) detail-less-but-reachable tools by hand; error-message quality is assessed against the shared validation seam (`shared/workers/validate.ts`) plus direct reads of ~15 representative door handlers and door-refusal paths, not an exhaustive per-tool code read of all 179 doors — noted so the number isn't overstated.

| Column | Avg /3 | /100 | Note |
|---|---|---|---|
| Name says the action + record | 2.97 | 99 | Near-perfect. `{verb}_{resource}`, consistent, every name maps cleanly. No real outliers. |
| Summary says what/needs/returns, one line | 2.75 | 92 | Strong and consistent. The raw `summary` field is *always* ≤160 chars (`tool-diet.test.ts` enforces it, 0 failures) — but see §3 for what actually ships on the wire. |
| Detail adds only what the summary can't | 2.98 (n=137 reachable) | 99 | Excellent where it exists. 120/137 shared+toggle tools carry one; the other 17 are short, single-field, already-guarded writes that genuinely don't need one (I read every one — see below). For the 42 tools `describe_tool` can't reach at all, this column is moot — that's §2, not a quality problem. |
| Schema fields carry descriptions where the name isn't enough | 1.19 | 40 | The real finding. `obj()`/`S`/`B`/`N` in `shared/workers/tool-args.ts` have **no structural support for a field-level JSON-Schema `description`** — nothing in the whole catalogue has one, enum fields aside. Field names are consistently good single glossary words, and `detail` compensates for a caller who asks — but a client that renders a form straight from JSON Schema (several do) shows undocumented fields. Out of "descriptions only" scope to fix broadly; see §7. |
| Error messages tell the caller what to do next | ~2.7 (sampled) | 90 | A real strength. `requireText`/`optionalText`/`queryText` throw one consistent, actionable `GuardError` shape everywhere: "X is required", "X is too long (max N characters)", and the good ones go further — `describe_tool`'s unknown-tool refusal names the 5 nearest names, `result_too_large` says "filter, page, or use the export tool", the document-too-large refusal says the two numbers and "split it and add the parts separately." |

**The 18 tools with no `detail` (now 17 — `set_account_parent` gained one), read by hand:** `describe_tool`, `list_members`, `list_roles`, `list_help_stakeholders`, `update_role`, `set_member_role`, `remove_member`, `revoke_invite`, `update_dropdown_value`, `set_task_done`, `add_help_stakeholder`, `update_client_department`, `list_brand_assets`, `list_meeting_purposes`, `update_meeting_purpose` — genuinely simple enough (single-field renames, already-guarded writes with the guard named inline) that a detail would repeat the summary, not add to it. Two are borderline: `get_help_thread` (no note on ordering for a long thread) and `update_brand_asset` ("same fields as creating one" — technically self-contained since the schema is in `tools/list`, but a caller has to cross-reference). Left as-is: the editorial judgment behind which 137 tools got a `detail` and which didn't is sound.

---

## §2 — Reveal depth: does the two-step reveal actually work?

**No, not universally — this is the most important finding in the audit.**

`initialize`'s own instructions promise: *"Every tool description is one line; call describe_tool with a tool's name for its full instructions."* That promise is unconditional. The mechanism behind it is not: `getToolDescribe` (`workers/tenancy/src/routes/tools.ts`) looks a name up in `SHARED_TOOLS` only —

```
const found = SHARED_TOOLS.find((t) => t.name === name || t.mcpName === name)
```

`SHARED_TOOLS` is 137 of the 179 tools. The other 42 — the 18 `set_<record>_active` toggles, the generic `set_record_active`, and all 23 MCP-only tools (`whoami`, every CSV export, the whole import pipeline `start_import`→`run_import`→`continue_import`, `agent_chat`, `agent_confirm`, the AI-allowance reads…) — are declared in `workers/mcp/src/lib/tools.ts`'s own arrays and never enter `SHARED_TOOLS` at all. Verified live against staging:

```
describe_tool(whoami)              -> {"error":"unknown_tool","message":"There is no tool called \"whoami\" in the shared catalogue."}
describe_tool(set_account_active)  -> {"error":"unknown_tool", …"Did you mean set_account_parent, …
describe_tool(agent_chat)          -> {"error":"unknown_tool","message":"There is no tool called \"agent_chat\" in the shared catalogue."}
describe_tool(run_import)          -> {"error":"unknown_tool","message":"There is no tool called \"run_import\" in the shared catalogue."}
```

A caller that follows the server's own advice on exactly the tools it would most want more detail on (`run_import`, `agent_chat`, `set_record_active`) gets a confusing, wrong-looking refusal — the tool plainly exists (it's right there in `tools/list`), but the manual for it claims not to. This didn't happen to bite any of the 10 measured questions (none of them needed detail on a non-shared tool — see §5), but it's a latent, structural bug in the reveal mechanism, not a documentation nit. **Score: 137/179 = 76.5%.**

**Is the branching depth right?** One level, and that's the right depth for what exists: `describe_tool` doesn't chain into "call X first, then Y" branching beyond what the prose says in running text (e.g. `describe_module`'s detail literally says "Call it BEFORE query_records on a module you have not queried this conversation"). That's adequate — deeper structured branching (a graph of "related tools") isn't needed at 179 tools; the one-liners plus this one hop are enough, *when they're reachable*.

**Can a caller act safely on write tools without ever calling `describe_tool`?** Yes, largely: every write tool's one-liner names its required fields, and since 26 Aug 2026 every tool the app itself would pause for says so inline ("Destructive or access-widening: confirm with a person before calling this" — MCP.md §3). The guard rails a write needs (last-admin protection, loop-refusal, idempotency) are consistently either named in the one-liner or enforced by the door regardless of what the caller knew going in.

---

## §3 — Bloat

**The 85,621-character disaster is real, and it's fixed** — that's not in dispute, and it's why this catalogue exists in its current two-step shape at all.

**What's left:**
- **`tools/list` sends the same 179 tools to every caller, whatever their role.** Measured live: 72,858 bytes / ~18,215 tokens (chars÷4), every call, unconditionally. The **agent** catalogue solved exactly this (`tool-diet.test.ts`, `toolSpecs(held)`, R36 `offered-rights`) — a Viewer-role token on the agent side gets a trimmed catalogue; the same Viewer connecting over MCP gets the full 179, including full descriptions of tools it will always be refused on (`remove_member`, `delete_process_step`, …). Not fixable within "descriptions only" — it's a door/logic change. Flagged for the owner in §7.
- **The wire "one-liner" a client actually receives is longer than the catalogue's own 160-char design ceiling for confirm-gated writes.** `t.description` = `summary` + `" Needs <gate>."` + (if confirm) `" Destructive or access-widening: confirm with a person before calling this."` — appended *after* the 160-char test already passed on the bare `summary`. Measured: 110 of 179 wire descriptions exceed 150 characters; the longest confirm-gated ones run to ~260. Not a crisis (nowhere near the old 85K problem) but worth knowing precisely rather than assuming "one line" still means what the test enforces.
- **No near-duplicate `detail` text** between tools, and no `detail` that just repeats its own `summary` (`tool-diet.test.ts` already checks the latter) — checked programmatically across all 119, none found. The catalogue doesn't repeat MCP.md either; they're complementary (MCP.md explains policy/security posture, `detail` explains mechanics).

**Score: 70/100** — excellent absolute size (18K tokens for 179 tools is genuinely reasonable), but the missing role-based trim is a real, fixable-later inconsistency with the sibling surface, and the wire-length overrun means "one line" is a looser promise than it reads.

---

## §4 — Traceability: can a call be reconstructed after the fact?

**Writes: yes, well.** Every write tool forwards to the same gated door a browser click would, over `forwardToDoor`, which stamps `origin: "mcp"` on the request (`shared/workers/origin.ts`) — a value only the two public gateways can set, never a caller. The door's own `logActivity` call picks that origin up via `teamContext` and writes it onto the team's `activity` row alongside the actor (`creator_id`/`creator_name`), a plain-English description, and `related_table`/`related_row_id`. So for any write: **who** (the actor), **what** (the description + related record), **when** (`created_at`), and **that it came from a token, not a browser** (`origin = 'mcp'`) are all on one row, in the same activity trail a person reads in the app (the record's own `ActivityRail`) or through `read_activity` itself — no separate log to go looking for.

**Two real gaps:**
- **Reads leave no per-call trace at all**, beyond a single `last_used_at` timestamp on the `mcp_tokens` row (`workers/mcp/src/lib/tokens.ts`'s `verifyToken`), overwritten on every call. No tool name, no arguments, no per-call row. For a mostly-read surface (65+ of 179 tools answer on a GET) this means "what did this token actually read, and when" is unanswerable after the fact — only "was it used, most recently when."
- **Multiple tokens held by the same person are indistinguishable in the activity feed.** The feed attributes to the actor (`user_id`), not the token (`mcp_tokens.id`) — so if someone holds two live tokens (the product allows up to 10), a write's activity row can't say which one made it. The `last_used_at` field can't help disambiguate either, since it's per-token but carries no reference back to the write.

Neither gap is catastrophic (the write side, which is where irreversible damage happens, is solid), but "can a call be traced afterwards" has a real, honest answer of "yes for writes, no for reads, and not per-token either way." **Score: 85/100.**

---

## §5 — Measured usability: 10 questions, fresh models, live data

Method: minted a real staging token for the Kwapso team's admin (2,047 live tickets, 112 sprints — re-counted, both different from the brief's stale figures), wrote 10 questions against real data (verified by hand first), then spawned a **fresh Haiku subagent per question with zero other context** — only the real `initialize` instructions, the real `tools/list` JSON (179 tools), and the question. It could call any read tool or `describe_tool` through a harness script that refuses writes/`agent_chat`/`agent_confirm` server-side (not just by instruction).

| # | Category | Tool calls | `describe_tool` calls | Wrong turns | Correct? |
|---|---|---|---|---|---|
| Q1 | simple read | 2 | 0 | none | ✅ |
| Q2 | filtered list | 4 | 0 | none | ✅ |
| Q3 | paged read | 5 | 2 | none | ✅ |
| Q4 | knowledge | 13 | 0 | 1 dead-end search | ✅ |
| Q5 | chain | 6 | 0 | none | ✅ |
| Q6 | chain | 5 | 0 | none | ✅ |
| Q7 | simple read | 3 | 0 | none | ✅ |
| Q8 | chain | 4 | 0 | none | ✅ |
| Q9 | filtered list | 2 | 0 | none | ✅ |
| Q10 | simple read | 5 | 0 | none | ✅ |

**10/10 correct. 90 tool calls total across 10 independent runs, `describe_tool` called only twice** — the one-liners alone were essentially always enough to pick the right tool and build correct arguments; the two `describe_tool` calls (both on Q3) were to confirm pagination/sort semantics before committing to a multi-page walk, a reasonable use.

**Full questions and verified answers:** `scripts/mcp-audit/questions.json`.

**The one real inefficiency, investigated properly — and it led somewhere more important than a wording fix.** Q4 ("which tab will show an imported claim email") took 13 tool calls and one dead-end search, and — notably — **never called `ask_knowledge`**, the tool built for exactly this. It answered instead by paging `list_help_tickets`' own `q` filter until it found the right ticket (T0271). My first hypothesis was a weak description: `ask_knowledge`'s one-liner led with citation-marking mechanics ("Mark claims [[src:…]] by `sourceId`…") rather than what it searches, so I reworded it to lead with concrete retrieval framing (tickets, meetings, mail, chat, articles) while keeping the exact phrases two tests require verbatim (`knowledge-evidence.test.ts`, `agent-parity.test.ts` — see the commit).

Re-tested against the **edited** catalogue (branch code, not deployed — `branch-tools-list.json`, generated straight from source) with both Sonnet and a second, independent Haiku run:

- **Sonnet still didn't call `ask_knowledge`** — same choice as before (`list_help_tickets` → `get_help_thread`), 8 tool calls instead of 9, still the right ticket, still the right answer ("Kommunikation"). A stronger model made the identical tool choice with the reworded summary in front of it, which already argues this was never really a description problem.
- **The second Haiku run got the question WRONG.** It found a *different*, superficially similar ticket (T3569, "Improve AI Summary: filter signatures & irrelevant content" — also about Confia, also about AI-summarized claim emails, wrong ticket) via the same `list_help_tickets` free-text search, took 21 tool calls, never found T0271, and — critically — **did not say "I couldn't find this."** It answered "Mails" with "moderate confidence," reasoning from "typical app terminology" rather than from anything in the data. That is exactly the failure R23 (`cited-answers`) and `ask_knowledge`'s own contract exist to make structurally impossible: `found: false` on that tool means "say so, not from memory," enforced by a shared test across the tool description and the assistant's system prompt alike (`agent-parity.test.ts`). `list_help_tickets`' free-text `q` filter carries no such contract — a model that searches with it and doesn't find the right row has nothing stopping it from guessing anyway, and this run is a live, measured instance of exactly that.

**Revised conclusion:** the *efficiency* question (13 vs 2 tool calls) turned out not to be about the description — both models, before and after the edit, made the same reasonable-looking call to search tickets directly rather than reach for a more general "knowledge base" tool, and a stronger model (Sonnet) got the right answer that way both times. But the *safety* question underneath it is real and is a description-and-discoverability problem: when a model bypasses `ask_knowledge` for a raw keyword search, it also bypasses the one place in this catalogue that structurally refuses to answer past what it actually found. The reworded summary is a legitimate, low-risk improvement (still ships in this PR), but on the evidence it did not — and by itself cannot — close this gap; making `ask_knowledge` the more *discoverable* choice for "what does a record say about X" questions is worth more owner attention than the wording alone can deliver. Noted for §7.

**Score: 92/100** — the ORIGINAL run (unedited, deployed catalogue, one pass per question, matching the brief's methodology) went 10/10 correct, 90 tool calls, 2 `describe_tool` calls, nothing dropped for a wrong tool call, a refused write, or a hallucinated answer. The re-test that surfaced the hallucination risk above was additional investigation beyond that baseline, run against the edited branch specifically to separate model weakness from description weakness — and it earned its place in the report by finding something worth knowing that the 10/10 headline alone would have hidden.

---

## §6 — Facts corrected from the brief

- **179 tools total**, not 161 (brief) or 184 (MCP.md's own count, last updated 26 Aug 2026 — stale by the same three tools §6 covers below plus normal drift). Breakdown: 137 shared-catalogue projections + 18 record-toggle tools + 1 generic toggle + 23 MCP-only.
- **137 tools carry a `summary`** (matches the brief) — but the average length is **132 chars**, not 134, and the brief's **"18,373 total" should be 18,122**.
- **119 tools carry a `detail`** (matches the brief, now 120 after this PR's one addition) — average **586 chars**, not 577; **69,721 total chars**, not stated in the brief.
- **`query_records`'s detail is 4,603 chars**, not 4,605; **`ask_knowledge`'s is 3,171**, not 3,181 (both close, both off).
- **60 tools have no detail at all**, not 18 — the brief's "18" is the count of *shared-catalogue* tools with no detail (real and correct for that subset), but 42 more tools (all 42 unreachable through `describe_tool`, §2) structurally have no separate `detail` field at all, because that mechanism doesn't exist for them.
- **`RECORD_TOGGLES` holds 18 record kinds today**, not the "twenty-one" MCP.md states twice (§3, §4 of that doc) — two were removed with the internal/account rate cards (10 Sep 2026) and a third with the certificate module (14 Sep 2026); MCP.md's own removal notes account for the first two by name but the summary count was never updated. Doc-only drift, not a code or tool-description defect, and out of this PR's scope to fix (MCP.md is prose, not a catalogue description).

---

## §7 — What changed, and what's left for the owner

**Changed (this PR, descriptions only):**
- `ask_knowledge`'s summary reworded to lead with what it searches (tickets, meetings, mail, chat, articles) rather than citation mechanics, while keeping every phrase two tests require verbatim.
- `set_account_parent` gained a `detail` — it's one of only two account-fence writes on this surface (changes who a client can *see*, not just where a row sits) and had no detail explaining that at all. `tool-diet.test.ts`'s `DETAILED_TOOLS` pin moved 119→120 in the same commit, with the reason written down.
- `npm run lint` and the full `npm run check` gate: green (see commit).

**Left for the owner — all are door/architecture changes, correctly out of "descriptions only" scope:**
1. **`describe_tool` should reach all 179 tools, not 137.** The fix is small in shape (widen `getToolDescribe`'s lookup from `SHARED_TOOLS` to the full `MCP_TOOLS`, or give the 42 MCP-only/toggle tools a `detail` field of their own) but it's a door change with its own R19/R27-style test implications, and this is the single highest-value fix in the whole audit.
2. **`tools/list` should trim by the caller's role**, the way the agent catalogue already does (`toolSpecs(held)`). Same shape of fix, same reason it's out of scope here.
3. **Per-call read traceability** (§4) — if it's ever worth knowing "what did this token read," it needs a real per-call log, not an extension of the write-side activity trail (reads don't belong there by design — R1's `publishChange` seam is for mutations).
4. **Schema field-level descriptions** (§1) — `tool-args.ts`'s `S`/`B`/`N`/`obj()` would need an optional `description`, which is additive and low-risk, but touching the one file every one of 179 tools' schemas is built from, for every tool, is a bigger and riskier change than this PR's "descriptions only" instruction was meant to authorize without your sign-off on scope.
5. MCP.md's "twenty-one" record kinds (§6) — a two-word prose fix, not a description or door change, just not something I touched since it's a different document.
6. **The `ask_knowledge` discoverability/safety gap found in §5.** A model that answers a "what does this record say" question by paging a `list_*` tool's free-text `q` filter instead of calling `ask_knowledge` loses R23's structural "say so, not from memory" guarantee — measured live, one Haiku run did exactly that and produced a confident, wrong, ungrounded answer. Rewording the summary (done in this PR) didn't change either tested model's tool choice, so the fix isn't more prose. Worth the owner's own judgment call rather than mine: options range from a tool-selection nudge in `initialize`'s instructions, to giving `list_*` tools' own `q` search the same "say what you found, don't guess past it" discipline `ask_knowledge` already has, to leaving it as an accepted tradeoff (a model that guesses past a keyword search is a known LLM failure mode, not unique to this catalogue). I didn't pick one — it's a behavior/policy decision, not a wording fix.

Nothing above was left because it seemed unimportant — (1) and (2) are the two biggest findings in this audit. They're left because fixing them safely means touching gated doors and their test suites, which the brief scoped out of this pass on purpose.

---

## Reproducing this audit

`scripts/mcp-audit/README.md`. Static audit needs no token; the live measurement mints one against staging (`mint-token.mjs`) and revokes it when done (`revoke-token.mjs`) — never committed, never printed.
