// Audit tooling for "is our MCP good" (2026-09-15) — not part of the
// product's own runtime, but kept under scripts/mcp-audit/ as a reusable way
// to re-run the same measurement later. Reads the real catalogue modules
// directly via Node's built-in TS type-stripping (run with
// --experimental-transform-types and the resolve hooks beside this file), so
// the numbers are read off the actual source, never re-typed by hand.
// Dumps every MCP tool (shared-catalogue projections + the record-toggle,
// generic-toggle and MCP-only tools tools.ts adds beside them) to
// catalog-dump.json, with the per-source classification score-catalog.mjs
// and the report both read.
import { SHARED_TOOLS } from "../../shared/workers/tool-catalog.ts"
import { MCP_TOOLS } from "../../workers/mcp/src/lib/tools.ts"
import { TOOL_GATES } from "../../shared/workers/tool-gates.ts"
import { RECORD_TOGGLES } from "../../shared/workers/record-toggles.ts"

const backtickIds = (s) => (s ? [...s.matchAll(/`([^`]+)`/g)].map((m) => m[1]) : [])
const toggleNames = new Set(Object.keys(RECORD_TOGGLES).map((r) => `set_${r}_active`))

const rows = MCP_TOOLS.map((t) => {
  const shared = SHARED_TOOLS.find((s) => (s.mcpName ?? s.name) === t.name)
  const summary = shared ? shared.summary : null // MCP_ONLY tools carry description directly (no separate summary/detail split)
  const detail = shared ? (shared.detail ?? null) : null
  const isSharedProjection = !!shared
  const source = shared
    ? "shared"
    : t.name === "set_record_active"
      ? "record_active_generic"
      : toggleNames.has(t.name)
        ? "record_toggle"
        : "mcp_only"
  return {
    source,
    name: t.name,
    method: t.method,
    path: t.path,
    binding: t.binding,
    gate: TOOL_GATES[shared?.name ?? t.name] ?? null,
    isSharedProjection,
    wireDescription: t.description, // what tools/list actually sends (summary + " Needs X." + pause, for shared tools)
    summary,
    summaryLen: summary ? summary.length : null,
    detail,
    detailLen: detail ? detail.length : null,
    hasDetail: !!detail,
    wireDescriptionLen: t.description.length,
    schema: t.inputSchema,
    schemaFieldCount: t.inputSchema?.properties ? Object.keys(t.inputSchema.properties).length : 0,
    schemaFieldsWithDescriptions: t.inputSchema?.properties
      ? Object.values(t.inputSchema.properties).filter((v) => v && typeof v === "object" && "description" in v).length
      : 0,
    backtickIdsInWire: backtickIds(t.description),
    backtickIdsInDetail: backtickIds(detail ?? ""),
  }
})

const sharedRows = rows.filter((r) => r.isSharedProjection)
const summaryTotalChars = sharedRows.reduce((a, r) => a + r.summaryLen, 0)
const wireTotalChars = rows.reduce((a, r) => a + r.wireDescriptionLen, 0)
const detailRows = rows.filter((r) => r.hasDetail)
const detailTotalChars = detailRows.reduce((a, r) => a + r.detailLen, 0)
const noDetail = rows.filter((r) => !r.hasDetail)

const bySource = {}
for (const r of rows) bySource[r.source] = (bySource[r.source] ?? 0) + 1

console.log(JSON.stringify({
  totalTools: rows.length,
  bySource,
  // "summary" = the SharedTool.summary field alone (137 shared tools only).
  summaryTotalChars,
  summaryAvgChars: Math.round(summaryTotalChars / sharedRows.length),
  // "wire" = t.description, what tools/list ACTUALLY sends for all 179 tools
  // (summary + " Needs <gate>." + confirm pause, for shared/toggle tools).
  wireTotalChars,
  wireAvgChars: Math.round(wireTotalChars / rows.length),
  detailCount: detailRows.length,
  detailTotalChars,
  detailAvgChars: Math.round(detailTotalChars / detailRows.length),
  noDetailCount: noDetail.length,
  noDetailBySource: noDetail.reduce((a, r) => ((a[r.source] = (a[r.source] ?? 0) + 1), a), {}),
  noDetailNames: noDetail.map((r) => r.name),
  top10DetailByLen: [...detailRows].sort((a, b) => b.detailLen - a.detailLen).slice(0, 10).map((r) => [r.name, r.detailLen]),
  wireOver150: rows.filter((r) => r.wireDescriptionLen > 150).map((r) => [r.name, r.wireDescriptionLen]).sort((a, b) => b[1] - a[1]),
  wireOver150Count: rows.filter((r) => r.wireDescriptionLen > 150).length,
  noSchemaFieldDescriptions: rows.filter((r) => r.schemaFieldCount > 0 && r.schemaFieldsWithDescriptions === 0).map((r) => r.name),
}, null, 2))

import { writeFileSync } from "node:fs"
writeFileSync(new URL("./catalog-dump.json", import.meta.url), JSON.stringify(rows, null, 2))
console.error(`wrote ${rows.length} rows to catalog-dump.json`)
