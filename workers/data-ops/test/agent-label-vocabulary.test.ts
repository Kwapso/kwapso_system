// THE WORD A PERSON READS is not always the word the model was told it could
// TYPE. CLAUDE.md's own "don't finish the rename" keeps `help` as the
// permission module, the table, the API path and the MCP tool names — and
// `describe_module`/`query_records` deliberately TELL the model it may use
// that alias ("`help` reaches tickets"). Nothing stops the model reaching for
// exactly the word its own tool description just offered it, and the step
// chip / confirm panel used to build its label straight from that raw
// argument (shared/workers/tool-catalog.ts's `queryLabel` is the fix — see the
// commit this test ships beside).
//
// The owner's own report, 13 Sep 2026, reading the assistant's step chips on
// staging verbatim: "See what help can be asked", "Look up help", "Count help
// by account", "Count help by app". A person reads those, and the product has
// no help section — it has Tickets.
//
// THE CENSUS IS DERIVED, not a hand-list of the two tools that leaked. A
// record's own id is never named `module`, `table` or `targetTable` anywhere
// in this catalogue — those three names are how this schema language spells
// "which kind of thing", so any tool that declares one of them, today or in a
// module built next year, is in scope automatically.

import { describe, expect, it } from "vitest"

import { TOOL_CATALOG } from "../src/lib/tools"

/** Schema field NAMES whose value picks a database table or a query-grammar
 * module, never a record's own id. Derived off usage, not invented: these are
 * the only three spellings this catalogue's schemas use for "which kind of
 * thing" (`describe_module`/`query_records`'s `module`, `read_activity`'s
 * `table`, `start_timer`/`log_time`/`list_work_logs`'s `targetTable`). */
const CATEGORY_FIELDS = ["module", "table", "targetTable"] as const

/** The one banned word, word-boundary and case-insensitive — the same shape
 * R34's glossary-in-copy check (web/test/rules.test.ts) uses for its own
 * deny-list, so "helpful", "helps" and "won't help" (ordinary English, said
 * elsewhere in this app on purpose) never false-positive. Only the bare word
 * "help" is CLAUDE.md's leaked internal name. */
const LEAKS_HELP = /(?<![\w-])help(?![\w-])/i

function schemaFields(tool: { schema: unknown }): string[] {
  const props = (tool.schema as { properties?: Record<string, unknown> } | undefined)?.properties
  return props ? Object.keys(props) : []
}

describe("agent step-chip / confirm labels never leak the internal module alias", () => {
  it("the census is non-empty — a walk that finds nothing is not a check", () => {
    const inScope = TOOL_CATALOG.filter(
      (t) => typeof t.summarize === "function" && schemaFields(t).some((f) => (CATEGORY_FIELDS as readonly string[]).includes(f))
    )
    expect(inScope.length, "no tool declares module/table/targetTable — this census is reading nothing").toBeGreaterThan(0)
  })

  it("every tool whose schema takes module, table or targetTable speaks the app's word for `help`, never the alias itself", () => {
    const offenders: string[] = []
    for (const tool of TOOL_CATALOG) {
      if (typeof tool.summarize !== "function") continue
      const fields = schemaFields(tool)
      for (const field of CATEGORY_FIELDS) {
        if (!fields.includes(field)) continue
        // Every OTHER field is left unset on purpose: `str()` reads a missing
        // field as "" rather than throwing (tool-args.ts's own contract —
        // "this stays lenient so it can also be used in the step SUMMARIES"),
        // so a summarize function that can run at all runs on this alone.
        let label: string
        try {
          label = tool.summarize({ [field]: "help" })
        } catch (e) {
          offenders.push(`${tool.name}.${field}="help" threw: ${e instanceof Error ? e.message : String(e)}`)
          continue
        }
        if (LEAKS_HELP.test(label)) offenders.push(`${tool.name}.${field}="help" -> "${label}"`)
      }
    }
    expect(
      offenders,
      "a human-facing label named the internal module alias `help` instead of the app's own word, `tickets` " +
        "(CLAUDE.md: the module, the table, the API path and the tool names stay `help` on purpose — nothing SPOKEN " +
        "to a person may). Route the raw argument through shared/workers/tool-catalog.ts's `queryLabel` (or the " +
        "canonicalModule it wraps) before it reaches a summarize() string."
    ).toEqual([])
  })

  // MUTATION PROOF, inline rather than only in the PR description: the same
  // assertion the census above makes, pinned to the two tools the owner's
  // report actually named, so a reviewer can see the exact before/after
  // without re-deriving it. Revert the `queryLabel` fix and this goes red on
  // its own — no census machinery required to see why.
  it("describe_module and query_records specifically say tickets, not help", () => {
    const describeModule = TOOL_CATALOG.find((t) => t.name === "describe_module")!
    const queryRecords = TOOL_CATALOG.find((t) => t.name === "query_records")!
    expect(describeModule.summarize({ module: "help" })).toBe("See what tickets can be asked")
    expect(queryRecords.summarize({ module: "help" })).toBe("Look up tickets")
    expect(queryRecords.summarize({ module: "help", groupBy: ["accountId"] })).toBe("Count tickets by accountId")
    expect(queryRecords.summarize({ module: "help", groupBy: ["appId"] })).toBe("Count tickets by appId")
  })
})
