// THE MCP-ONLY TOOLS, DECLARED HERE SO A TENANCY DOOR CAN READ THEM.
//
// `whoami`, the CSV exports, the agentic-import batch flow, the AI allowance +
// saved conversations, the assistant bridge, and `set_record_active` (beside
// the twenty-one `set_<record>_active` toggles, whose own data lives in
// record-toggles.ts) exist ONLY on the MCP surface — `workers/mcp/src/lib/
// tools.ts` is where they are wired to their doors and projected into the
// running catalogue. But `describe_tool` (workers/tenancy/src/routes/tools.ts)
// used to answer only from `SHARED_TOOLS`, because that was the one catalogue
// a TENANCY door could reach without importing another worker's `src` — this
// repo's shared code lives in `shared/`, not by workers reading each other's
// bundles, and `SharedTool.binding` was TENANCY or CONTENT only, so a
// data-ops-bound tool (most of these) could not be described from here at all.
//
// So the DESCRIPTIVE half of these forty-two tools — `summary` (the one line
// the manifest carries) and `detail` (what `describe_tool` hands back on
// request, same contract as a SharedTool's) — is declared here, in `shared/`,
// exactly where `SHARED_TOOLS` already sits for the same reason. The EXECUTABLE
// half — `inputSchema`, `binding`, `method`, `path`, `buildBody`, `buildQuery`
// — travels with it, because none of it touches an `Env` or does gated work;
// it is data a forwarder reads, same as `SharedTool`'s. `workers/mcp/src/lib/
// tools.ts` still does the actual forwarding (`forwardTool`) and still owns
// `MCP_TOOLS`, the manifest tenancy never needs to see the whole of.

import { N, obj, S } from "@shared/workers/tool-args"
import { RECORD_TOGGLES } from "@shared/workers/record-toggles"

export type McpOnlyTool = {
  name: string
  /** The one line `tools/list` carries. Never grows past what it already was —
   * the owner's rule: the first call stays supply-on-demand, nothing here may
   * make it bigger. */
  summary: string
  /** What `describe_tool` hands back on request. Omitted where the summary
   * already says everything there is to say — same convention as a
   * `SharedTool`'s `detail`. */
  detail?: string
  inputSchema: Record<string, unknown>
  binding: "AUTH" | "TENANCY" | "CONTENT" | "DATAOPS"
  method: "GET" | "POST"
  path: string
  buildBody?: (input: Record<string, unknown>) => Record<string, unknown>
  buildQuery?: (input: Record<string, unknown>) => string
}

export const MCP_ONLY_TOOLS: McpOnlyTool[] = [
  {
    name: "whoami",
    summary: "The token's owner + the team this token is pinned to.",
    detail:
      "Answers with the person the token acts as (their id, name and email) and the one team the token is pinned to at mint time — a token is never re-pinned to a different team later. Call this first when a client connects: it is the cheapest way to confirm a token is live and to show a person which identity a script is about to act under, before it does anything. my_permissions is the next call after this one — whoami says who and where, my_permissions says what that person may do there.",
    inputSchema: obj({}),
    binding: "AUTH",
    method: "GET",
    path: "/api/auth/me",
  },
  {
    name: "my_permissions",
    summary:
      "What this token may DO in its team: the caller's own access rights, module by module (read / create / edit / delete). whoami says who and where; this says what. Every door re-checks the same rights on every call, so this is how a client knows before it asks instead of learning from a 403.",
    inputSchema: obj({}),
    binding: "TENANCY",
    method: "GET",
    path: "/api/tenancy/my-permissions",
  },
  {
    name: "get_team",
    summary:
      "The pinned team's own record, its name, when it was created and by whom. The read half of update_team.",
    inputSchema: obj({}),
    binding: "TENANCY",
    method: "GET",
    path: "/api/tenancy/team-meta",
  },
  {
    name: "export_roles_csv",
    summary: "Every member role as CSV, full fields incl. the flattened permission matrix.",
    detail:
      "One row per role, every module's four rights (read / create / edit / delete) as its own column — the same flattened shape get_role_permissions answers for one role, here for all of them at once. A bounded collection (a team's roles are curated by hand and do not grow the way tickets or accounts do), so it is whole in one file, never paged.",
    inputSchema: obj({}),
    binding: "TENANCY",
    method: "GET",
    path: "/api/tenancy/roles/export",
  },
  {
    name: "export_dropdown_values_csv",
    // R19 — the door grew a `groups` filter on 11 Sep 2026 (each module's
    // settings page exports its own vocabulary), so this tool exposes AND
    // forwards it. R27 — every backticked word below is this tool's own
    // argument or a column the CSV really carries.
    summary:
      "Every dropdown value as CSV (full fields + audit), one row per option. Narrow it to named groups with `groups`.",
    detail:
      "`groups` is comma-separated and spelled exactly as the group is (\"Ticket type,Story type\") — leave it out for the team's whole vocabulary. Naming a group the team has no rows in is not an error, it answers with the header and nothing under it. The columns lead with the import format, so a file exported here goes straight back in through the importer.",
    inputSchema: obj({ groups: S }),
    binding: "TENANCY",
    method: "GET",
    path: "/api/tenancy/selectable/export",
    buildQuery: (i) => (i.groups ? `?groups=${encodeURIComponent(String(i.groups))}` : ""),
  },
  {
    name: "export_brand_assets_csv",
    summary: "The whole brand library as CSV (full fields + audit).",
    inputSchema: obj({}),
    binding: "CONTENT",
    method: "GET",
    path: "/api/content/brand-assets/export",
  },
  {
    name: "export_meeting_purposes_csv",
    summary: "Every meeting purpose as CSV, with its department (full fields + audit).",
    inputSchema: obj({}),
    binding: "CONTENT",
    method: "GET",
    path: "/api/content/delivery/purposes/export",
  },
  {
    name: "export_accounts_csv",
    summary:
      "Every account you can see as CSV, companies and people, full fields + audit. Narrows by the same seven filters as list_accounts.",
    detail:
      "The columns lead with the import format, so the file goes straight back in through the importer. Narrows by the SAME seven filters as list_accounts: `q` (name, reference, email), `type` ('entity' or 'individual'), `archived` ('yes' or 'no'), `portal` ('yes' for only the people who can sign in to the client portal, 'no' for only those who cannot), `parentId`, `manager` (a staff member's user id), `country` (an exact match against the team's Country vocabulary). Without the contacts right the file is the COMPANIES, the same way the list is. THE FILE IS WHOLE OR IT IS AN ERROR — a collection bigger than one file comes back `export_too_large` rather than as a short CSV that looks complete; narrow it, or read list_accounts a page at a time.",
    inputSchema: obj({ q: S, type: S, archived: S, portal: S, parentId: S, manager: S, country: S }),
    binding: "TENANCY",
    method: "GET",
    path: "/api/tenancy/accounts/export",
    buildQuery: (i) => {
      const q: string[] = []
      for (const key of ["q", "type", "archived", "portal", "parentId", "manager", "country"])
        if (typeof i[key] === "string" && i[key]) q.push(`${key}=${encodeURIComponent(String(i[key]))}`)
      return q.length ? `?${q.join("&")}` : ""
    },
  },
  {
    name: "list_import_targets",
    summary:
      "What this team may import into: every active import target, with the table key you pass to get_import_sample. Read this before building a file, the catalogue is per-team, and an owner can switch a target off.",
    inputSchema: obj({}),
    binding: "DATAOPS",
    method: "GET",
    path: "/api/data-ops/import/targets",
  },
  {
    name: "get_import_sample",
    summary:
      "A sample CSV for one import target (`tableKey` from list_import_targets): the column headers the importer expects, plus one example row. It is a template, no team data in it.",
    inputSchema: obj({ tableKey: S }, ["tableKey"]),
    binding: "DATAOPS",
    method: "GET",
    path: "/api/data-ops/import/sample",
    buildQuery: (i) => `?tableKey=${encodeURIComponent(String(i.tableKey ?? ""))}`,
  },
  {
    name: "start_import",
    summary:
      "Start a file import: opens a batch. Add files with add_import_file, then plan_import, then run_import.",
    inputSchema: obj({}),
    binding: "DATAOPS",
    method: "POST",
    path: "/api/data-ops/import/batch",
    buildBody: () => ({}),
  },
  {
    name: "add_import_file",
    summary: "Attach one CSV (text) to an import batch.",
    inputSchema: obj({ batchId: S, name: S, csv: S }, ["batchId", "csv"]),
    binding: "DATAOPS",
    method: "POST",
    path: "/api/data-ops/import/batch/file",
    buildBody: (i) => ({ batchId: i.batchId, name: i.name ?? "file.csv", csv: i.csv }),
  },
  {
    name: "plan_import",
    summary:
      "Build the import plan (which table each file feeds, column mapping, dependency order, rows that will be skipped + why). Uses one AI request from the team's quota.",
    detail:
      "The plan is read-only until run_import (or continue_import) actually writes anything — nothing here touches a team's rows. Re-reading a plan you already paid for is free through get_import; re-calling plan_import spends the quota a second time for the same answer, so a client that dropped a response should go there first.",
    inputSchema: obj({ batchId: S }, ["batchId"]),
    binding: "DATAOPS",
    method: "POST",
    path: "/api/data-ops/import/batch/plan",
    buildBody: (i) => ({ batchId: i.batchId }),
  },
  {
    name: "run_import",
    // R22 — the door grew an optional `groups` scope on 11 Sep 2026, so this
    // tool offers the door's whole contract rather than a narrower one. R27 —
    // every backticked word below is this tool's own argument or another tool's
    // name.
    summary:
      "Run a PLANNED import in dependency order. Writes through the same gated doors the screens use (full audit trail); returns the per-row report.",
    detail:
      "`groups` narrows the run to named dropdown groups, which is what a module's own settings page sends when somebody imports from there: a row in any other group is skipped with a reason instead of written, and a file that feeds anything but dropdown values is refused outright. Leave it out to run the plan as plan_import built it. A run that dies part way — a dropped connection, a worker restart — leaves its batch marked running rather than finished; continue_import picks it up from the last checkpoint instead of starting over, which is what re-sending the file would do and would write every already-written row a second time. get_import shows a batch's current state at any point, mid-run included.",
    inputSchema: obj({ batchId: S, groups: { type: "array", items: S, maxItems: 8 } }, ["batchId"]),
    binding: "DATAOPS",
    method: "POST",
    path: "/api/data-ops/import/batch/confirm",
    buildBody: (i) => ({ batchId: i.batchId, groups: i.groups }),
  },
  {
    name: "continue_import",
    // R27 keeps this honest: a backticked name here must be this tool's own
    // argument, a field ITS door reads or answers with, or another tool's name.
    // The place a dead run stopped is real but it is `get_import`'s field, not
    // this door's — so it is described in words and named by the tool that
    // actually carries it.
    summary:
      "Pick up an import that did not finish, from its last checkpoint. Takes the same `batchId` and `groups` as run_import; refused when there is nothing to pick up.",
    detail:
      "A run that dies part way leaves its batch marked running, remembering which table it was inside and how many of that table's rows were done — get_import shows that. This continues from there instead of starting again, which is what re-running the file would do and would write every finished row a second time. It answers with the same `report` as run_import, covering the whole import rather than this one leg. `groups` is NOT remembered from the run being picked up, so a resume that leaves it out finishes the file unnarrowed — pass the same value again if the original run did. Up to eleven rows either side of the interruption may be written twice; the report says where it resumed.",
    inputSchema: obj({ batchId: S, groups: { type: "array", items: S, maxItems: 8 } }, ["batchId"]),
    binding: "DATAOPS",
    method: "POST",
    path: "/api/data-ops/import/batch/continue",
    buildBody: (i) => ({ batchId: i.batchId, groups: i.groups }),
  },
  {
    name: "list_imports",
    summary: "The team's import history (who ran what, when, totals).",
    inputSchema: obj({}),
    binding: "DATAOPS",
    method: "GET",
    path: "/api/data-ops/import/batches",
  },
  {
    name: "get_import",
    summary:
      "One import batch in full (by `id`): its files, the plan, the column mapping, rows that will be skipped and why, and, once it has run, the per-row report.",
    detail:
      "Re-READING a plan is free; re-PLANNING it with plan_import spends one of the team's assistant credits, so a client that lost a plan_import answer should come here first rather than plan again. Mid-run, this is also how to check a batch's progress before deciding whether continue_import has anything to pick up.",
    inputSchema: obj({ id: S }, ["id"]),
    binding: "DATAOPS",
    method: "GET",
    path: "/api/data-ops/import/batch",
    buildQuery: (i) => `?id=${encodeURIComponent(String(i.id ?? ""))}`,
  },
  {
    name: "get_ai_allowance",
    summary:
      "How many assistant credits this team has left (the free daily ones plus any an admin has added). Needs agent:read.",
    detail:
      "agent_chat, agent_confirm and plan_import each draw on this allowance, one credit per model step; every other tool on this surface is free. When it runs out those three answer 429 until it resets or an admin adds credits — this is how a client sees that coming instead of discovering it mid-conversation. It is the app's own daily allowance, shared by everyone on the team including every human in the app, not a developer's own Anthropic account and not a bill anyone outside this app sees.",
    inputSchema: obj({}),
    binding: "DATAOPS",
    method: "GET",
    path: "/api/data-ops/agent/usage",
  },
  {
    name: "list_ai_usage",
    summary:
      "Where the allowance went: the team's AI usage trail, newest first, one row per assistant turn. `limit` caps how many rows come back (default 50, most 200). Needs agent:read.",
    detail: "Other members' prompts are redacted — a role that can read this can see WHEN and HOW MUCH was spent, never what a colleague asked.",
    inputSchema: obj({ limit: N }),
    binding: "DATAOPS",
    method: "GET",
    path: "/api/data-ops/agent/usage-log",
    buildQuery: (i) => (Number.isFinite(Number(i.limit)) ? `?limit=${Number(i.limit)}` : ""),
  },
  {
    name: "list_agent_threads",
    summary: "The caller's own saved assistant conversations (newest first). Needs agent:read.",
    inputSchema: obj({}),
    binding: "DATAOPS",
    method: "GET",
    path: "/api/data-ops/agent/threads",
  },
  {
    name: "get_agent_thread",
    summary:
      "One saved conversation's messages, oldest first (by `id` from list_agent_threads), what was asked, what the assistant answered, and which actions it took. Needs agent:read.",
    inputSchema: obj({ id: S }, ["id"]),
    binding: "DATAOPS",
    method: "GET",
    path: "/api/data-ops/agent/thread",
    buildQuery: (i) => `?id=${encodeURIComponent(String(i.id ?? ""))}`,
  },
  {
    name: "agent_chat",
    summary:
      "Talk to the team's assistant, it can answer from live data or act (as the token's owner, capped by their permissions). If it proposes a guarded action, call agent_confirm with the returned threadId.",
    detail:
      "`sources` narrows which doors the assistant may read the KNOWLEDGE BASE through for this whole conversation — a list of any of: meetings, mail, drive, chat, records, articles. It is ENFORCED rather than suggested: the named set is put onto every retrieval the assistant makes on this turn, so a door left out cannot be read from however the assistant phrases its own call. Leave it off and it reads all of them, which is the normal case. A reply whose outcome says it is still carrying on ran out of its request before it ran out of work: call again with the same `threadId` and `continue` true (the `message` is ignored then) and it carries on from the results it already saved, up to four requests in all. There is no confirm PANEL on this surface the way there is in the app — the connecting client owns that UI, and a well-behaved one puts a person in front of any tool whose own description says to.",
    inputSchema: obj({ message: S, threadId: S, sources: { type: "array" }, continue: { type: "boolean" } }, ["message"]),
    binding: "DATAOPS",
    method: "POST",
    path: "/api/data-ops/agent/chat",
    buildBody: (i) => ({
      message: i.message,
      ...(i.threadId ? { threadId: i.threadId } : {}),
      ...(Array.isArray(i.sources) && i.sources.length ? { sources: i.sources } : {}),
      ...(i.continue === true ? { continue: true } : {}),
    }),
  },
  {
    name: "agent_confirm",
    summary: "Approve (or decline) the action(s) the assistant proposed on a thread.",
    inputSchema: obj({ threadId: S, approve: { type: "boolean" } }, ["threadId", "approve"]),
    binding: "DATAOPS",
    method: "POST",
    path: "/api/data-ops/agent/confirm",
    buildBody: (i) => ({ threadId: i.threadId, approve: i.approve === true }),
  },
]

/** `set_record_active`, described here for the same reason the twenty-one
 * named toggles' `detail` lives on `RECORD_TOGGLES`: the routing logic
 * (`route`, `buildBody`) still lives in `workers/mcp/src/lib/tools.ts`, next to
 * `RECORD_TOGGLES` it dispatches through, but the words a developer reads have
 * to be reachable from a TENANCY door too. */
export const RECORD_ACTIVE_GENERIC_DESC = {
  // The confirm caveat stays IN the summary, not pushed to `detail` — MCP.md's
  // whole point about the 26 Aug 2026 change ("every tool the app would stop
  // for says so in its own description") is that a client reads this off
  // `tools/list` alone, without needing to call `describe_tool` first.
  summary:
    "Switch a record off, or back on, across every record kind this surface also " +
    "publishes as named tools (set_account_active, set_role_active, …) — this is the same operation, " +
    "generic. Destructive or access-widening for SOME record kinds, never for others: confirm with a " +
    "person before calling this unless you already know the kind you are calling it for is one of the " +
    "ones that runs straight through.",
  detail:
    "`record` says WHICH KIND: account, contact_link, portal_access, role, dropdown_value, app, app_module, process, wave, client_department, client_role, client_tool, meeting, knowledge_source, deliverable, brand_asset, meeting_purpose or staff_profile. `id` is that record's id — except a role, which takes `roleId` — and a deliverable also needs `appId`. `active` false switches it off (archive, deactivate, revoke, cancel, unlink, depending on the kind) and true brings it back. NOTHING IS EVER DELETED, and calling it twice changes nothing the second time. Each kind needs its own module's right — see the matching set_<kind>_active tool's own description for its exact gate and for what switching it off or on really does to the record. The twenty-one named tools remain the primary, pinned contract; this exists for an integration that would rather send one shape for every record kind than remember twenty-one names.",
}

/* --------------------------------------------------------------------------
 * WHAT `describe_tool` (workers/tenancy/src/routes/tools.ts) READS BESIDE
 * `SHARED_TOOLS` — every tool this file (and record-toggles.ts) knows about
 * that SHARED_TOOLS does not, so the door reaches all 179 without importing
 * the mcp worker's own `src`.
 * ---------------------------------------------------------------------- */

/** `set_<record>_active` -> that record's own `{ summary, detail }`, or
 * undefined if `name` doesn't match the shape or names no record. */
function describeRecordToggle(name: string): { summary: string; detail?: string } | undefined {
  const m = /^set_(.+)_active$/.exec(name)
  if (!m) return undefined
  const entry = RECORD_TOGGLES[m[1]]
  return entry ? { summary: entry.summary, detail: entry.detail } : undefined
}

/** Every tool name + description OUTSIDE `SHARED_TOOLS`: the 23 MCP-only
 * tools, the generic `set_record_active`, and the 18 named
 * `set_<record>_active` toggles. `describe_tool` tries `SHARED_TOOLS` first
 * (unchanged) and falls back to this for the rest of the 179. */
export function describeMcpOnly(name: string): { summary: string; detail?: string } | undefined {
  const own = MCP_ONLY_TOOLS.find((t) => t.name === name)
  if (own) return { summary: own.summary, detail: own.detail }
  if (name === "set_record_active") return RECORD_ACTIVE_GENERIC_DESC
  return describeRecordToggle(name)
}

/** Every name `describeMcpOnly` can answer for — the "did you mean" list
 * `describe_tool` offers alongside `SHARED_TOOLS`' own names when a caller
 * misspells one. */
export function mcpOnlyToolNames(): string[] {
  return [
    ...MCP_ONLY_TOOLS.map((t) => t.name),
    "set_record_active",
    ...Object.keys(RECORD_TOGGLES).map((record) => `set_${record}_active`),
  ]
}
