// MCP BLACKBOX SCORER — reads an exported Claude Code transcript (JSONL) and
// fills in the mechanical half of scoring.md so nobody counts tool calls or
// reply bytes by hand.
//
// A transcript line is one JSON object per Claude Code session record. The
// two shapes this cares about:
//   { type: "assistant", timestamp, message: { content: [{ type: "tool_use", id, name, input }, …] } }
//   { type: "user",      timestamp, message: { content: [{ type: "tool_result", tool_use_id, content, is_error }, …] } }
// (get one with the ccd_session_mgmt export_transcript tool, or from
// ~/.claude/projects/<project>/<session>.jsonl directly.)
//
// It does NOT know which of the ten tasks a call belongs to — the transcript
// carries no task boundary, and guessing one from tool names would be a
// worse error than asking a human to look. So it prints one flat,
// chronological table of every MCP call (name, args, reply bytes, error?,
// seconds since the previous MCP call) plus the run-level totals scoring.md
// asks for, and the human doing the scoring matches rows to tasks.md by
// reading them in order — fast, because the tedious counting is already done.
//
//   node scripts/mcp-blackbox/score.mjs <transcript.jsonl> [--out FILE.md]
//
// A tool call counts as "MCP" when its name contains "__" (every MCP tool in
// this app's own transcripts is namespaced `mcp__<server>__<tool>`) — this is
// deliberately permissive about the server-id prefix, because the tester
// connects through their own client and may name the server differently.

import { readFileSync, writeFileSync } from "node:fs"

const [, , transcriptPath, ...rest] = process.argv
if (!transcriptPath) {
  console.log("usage: node scripts/mcp-blackbox/score.mjs <transcript.jsonl> [--out FILE.md]")
  process.exit(1)
}
const outIdx = rest.indexOf("--out")
const outPath = outIdx >= 0 ? rest[outIdx + 1] : null

const lines = readFileSync(transcriptPath, "utf8").split("\n").filter(Boolean)

/** Every tool_use, keyed by its id, with the timestamp it was issued at. */
const calls = new Map()
/** Every tool_result, keyed by the tool_use id it answers. */
const results = new Map()

for (const line of lines) {
  let row
  try {
    row = JSON.parse(line)
  } catch {
    continue // a non-JSON line (this file format tolerates a trailing blank) is skipped, not fatal
  }
  const content = row?.message?.content
  if (!Array.isArray(content)) continue
  for (const item of content) {
    if (item.type === "tool_use" && typeof item.name === "string" && item.name.includes("__")) {
      calls.set(item.id, { name: item.name, input: item.input, timestamp: row.timestamp })
    }
    if (item.type === "tool_result" && item.tool_use_id) {
      const text = typeof item.content === "string" ? item.content : JSON.stringify(item.content ?? "")
      results.set(item.tool_use_id, { bytes: Buffer.byteLength(text, "utf8"), isError: item.is_error === true, timestamp: row.timestamp })
    }
  }
}

/** Chronological, matched pairs only — an unanswered call (still in flight
 * when the transcript was exported) is reported separately rather than
 * silently dropped, since "never got an answer" is itself a finding. */
const rows = []
const unanswered = []
for (const [id, call] of calls) {
  const result = results.get(id)
  if (!result) {
    unanswered.push(call)
    continue
  }
  rows.push({ tool: call.name.split("__").pop(), fullName: call.name, input: call.input, ...result })
}
rows.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

let prevTs = null
for (const r of rows) {
  r.elapsedS = prevTs ? (new Date(r.timestamp) - prevTs) / 1000 : null
  prevTs = new Date(r.timestamp)
}

const totalBytes = rows.reduce((s, r) => s + r.bytes, 0)
const largest = rows.reduce((max, r) => (r.bytes > (max?.bytes ?? -1) ? r : max), null)
const overCap = rows.filter((r) => r.bytes > 20_000)
const errorCalls = rows.filter((r) => r.isError)
const describeToolCalls = rows.filter((r) => r.tool === "describe_tool")
const wallClockS = rows.length > 1 ? (new Date(rows.at(-1).timestamp) - new Date(rows[0].timestamp)) / 1000 : 0

const lines_out = []
lines_out.push(`# MCP blackbox — auto-scored from ${transcriptPath}`)
lines_out.push("")
lines_out.push("## Per-call table (chronological — match rows to tasks.md by hand)")
lines_out.push("")
lines_out.push("| # | tool | args (truncated) | reply bytes | error? | seconds since prev call |")
lines_out.push("|---|---|---|---|---|---|")
rows.forEach((r, i) => {
  const args = JSON.stringify(r.input ?? {}).slice(0, 80)
  lines_out.push(`| ${i + 1} | ${r.tool} | \`${args}\` | ${r.bytes} | ${r.isError ? "YES" : ""} | ${r.elapsedS === null ? "—" : r.elapsedS.toFixed(1)} |`)
})
if (unanswered.length) {
  lines_out.push("")
  lines_out.push(`**${unanswered.length} call(s) with no matching reply in this transcript** (still in flight at export time, or the export was cut mid-call): ${unanswered.map((c) => c.name.split("__").pop()).join(", ")}`)
}
lines_out.push("")
lines_out.push("## Run totals")
lines_out.push("")
lines_out.push(`- Total MCP calls: **${rows.length}** (${describeToolCalls.length} of them \`describe_tool\`)`)
lines_out.push(`- Errors: **${errorCalls.length}**${errorCalls.length ? " — " + errorCalls.map((r) => r.tool).join(", ") : ""}`)
lines_out.push(`- Total bytes returned: **${totalBytes.toLocaleString()}**`)
lines_out.push(`- Largest single reply: **${largest ? largest.bytes.toLocaleString() : 0} bytes** (${largest?.tool ?? "n/a"})`)
lines_out.push(`- Any reply over 20,000 characters: **${overCap.length ? `YES — ${overCap.map((r) => r.tool).join(", ")}` : "no"}**`)
lines_out.push(`- Wall-clock, first call to last: **${wallClockS.toFixed(1)}s**`)
lines_out.push("")

const report = lines_out.join("\n")
if (outPath) {
  writeFileSync(outPath, report)
  console.log(`wrote ${outPath}`)
} else {
  console.log(report)
}
