#!/usr/bin/env node
// The ONLY door a measurement subagent gets. Proxies one tools/call to the
// real staging MCP endpoint using a token this process reads from an
// out-of-repo path (never shown to the caller). Refuses anything that is not
// a read tool or describe_tool, server-side — not just by instruction — so a
// subagent that goes off-script cannot write anything real.
//
// Usage: node mcp-call.mjs <tool_name> '<json_arguments>'
// Prints the tool's result JSON (or an error) to stdout. Nothing else.
import { readFileSync } from "node:fs"
import { makeRpc } from "../lib/api.mjs"
import { FRONT_DOORS } from "../lib/front-doors.mjs"
import { TOKEN_PATH } from "./token-path.mjs"

// Every write/mutation tool name pattern in the catalogue, refused here
// regardless of what's asked. describe_tool + every list_*/get_*/query_records/
// describe_module/whoami/my_permissions/ask_knowledge/read_activity/export_* pass.
const WRITE_PREFIXES = ["create_", "update_", "set_", "remove_", "revoke_", "add_", "delete_",
  "cut_", "connect_", "disconnect_", "comment_", "resolve_", "triage_", "archive_",
  "reply_", "rank_", "grant_", "link_", "start_", "stop_", "log_", "raise_",
  "complete_", "cancel_", "sync_", "run_", "continue_", "plan_", "save_"]
const EXTRA_WRITE_NAMES = new Set(["agent_chat", "agent_confirm"])

const [toolName, argsJson] = process.argv.slice(2)
if (!toolName) {
  console.error(JSON.stringify({ error: "usage", message: "node mcp-call.mjs <tool_name> '<json_arguments>'" }))
  process.exit(1)
}
const isWrite = EXTRA_WRITE_NAMES.has(toolName) || WRITE_PREFIXES.some((p) => toolName.startsWith(p))
if (isWrite) {
  console.log(JSON.stringify({ error: "refused_by_harness", message: `${toolName} looks like a write/agent tool. This measurement only allows reads and describe_tool.` }))
  process.exit(0)
}

let args = {}
if (argsJson) {
  try { args = JSON.parse(argsJson) } catch {
    console.log(JSON.stringify({ error: "bad_arguments", message: "arguments must be valid JSON" }))
    process.exit(0)
  }
}

const secret = readFileSync(TOKEN_PATH, "utf8").trim()
const rpc = makeRpc(FRONT_DOORS.staging.agency)
const r = await rpc(secret, "tools/call", { name: toolName, arguments: args })
const text = r.body?.result?.content?.[0]?.text ?? JSON.stringify(r.body?.error ?? { error: "no_response" })
process.stdout.write(text + "\n")
