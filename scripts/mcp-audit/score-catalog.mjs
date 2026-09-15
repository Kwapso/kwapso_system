// Turns catalog-dump.json into the per-tool scoring table (Part A of the MCP
// quality audit). Scores are heuristic-but-documented: see the rubric in
// mcp-audit-report.md. This script does the mechanical part (length checks,
// keyword signals, describe_tool reachability); a human pass adjusts the
// judgement calls it can't make (does this detail actually add signal?).
import { readFileSync, writeFileSync } from "node:fs"

const rows = JSON.parse(readFileSync(new URL("./catalog-dump.json", import.meta.url)))

// describe_tool's own lookup, reproduced: SHARED_TOOLS.find(name or mcpName).
// Anything not source:"shared" is UNREACHABLE through describe_tool today.
const describeToolReaches = (r) => r.source === "shared"

const VERB_PREFIXES = [
  "get", "list", "create", "update", "set", "remove", "revoke", "add", "delete",
  "cut", "connect", "disconnect", "comment", "resolve", "triage", "archive",
  "reply", "rank", "grant", "link", "start", "stop", "log", "raise", "complete",
  "cancel", "read", "sync", "run", "continue", "plan", "save", "whoami",
  "my_permissions", "ask", "describe", "export",
]
const nameScore = (r) => {
  const firstWord = r.name.split("_")[0]
  if (r.name === "whoami" || r.name === "my_permissions") return 3
  if (VERB_PREFIXES.includes(firstWord)) return 3
  return 1 // flag for manual look — no name in the catalogue actually falls here
}

const summaryScore = (r) => {
  const text = r.wireDescription
  const len = r.wireDescriptionLen
  const hasSignal = /`/.test(text) || /\bpass\b|\bnarrows?\b|needs |confirm/i.test(text)
  if (len === 0) return 0
  if (len <= 160 && hasSignal) return 3
  if (len <= 200) return 2
  if (len <= 260) return 1
  return 0 // gate-suffix pushed it past a model's "one line" budget
}

const detailScore = (r) => {
  if (!describeToolReaches(r)) return null // scored separately — reachability, not quality
  if (!r.hasDetail) return null // filled in by hand for the 18 that matter
  if (r.detailLen < 40) return 1 // barely more than the summary
  return 3
}

const schemaScore = (r) => {
  if (r.schemaFieldCount === 0) return 3 // nothing to document
  // obj()/S/B/N structurally carry no `description` key anywhere in this
  // catalogue — every tool with fields is capped at 1 (self-explanatory
  // names carry the field) unless an enum is present, which teaches the
  // model the values directly.
  const hasEnum = JSON.stringify(r.schema).includes('"enum"')
  return hasEnum ? 2 : 1
}

const table = rows.map((r) => ({
  name: r.name,
  source: r.source,
  method: r.method,
  gate: r.gate,
  wireLen: r.wireDescriptionLen,
  hasDetail: r.hasDetail,
  detailLen: r.detailLen ?? 0,
  describeToolReaches: describeToolReaches(r),
  nameScore: nameScore(r),
  summaryScore: summaryScore(r),
  detailScoreAuto: detailScore(r),
  schemaScore: schemaScore(r),
}))

writeFileSync(new URL("./scored-table.json", import.meta.url), JSON.stringify(table, null, 2))

// Quick rollups for the report.
const unreachable = table.filter((t) => !t.describeToolReaches)
const summaryLow = table.filter((t) => t.summaryScore <= 1)
const schemaLow = table.filter((t) => t.schemaScore <= 1)
console.log(JSON.stringify({
  totalTools: table.length,
  describeToolUnreachableCount: unreachable.length,
  describeToolUnreachableNames: unreachable.map((t) => t.name),
  summaryScoreLowCount: summaryLow.length,
  summaryScoreLow: summaryLow.map((t) => [t.name, t.wireLen]),
  schemaScoreLowCount: schemaLow.length,
  nameScoreAnomalies: table.filter((t) => t.nameScore < 3).map((t) => t.name),
}, null, 2))
