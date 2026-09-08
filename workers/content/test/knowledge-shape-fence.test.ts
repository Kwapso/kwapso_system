// THE PICTURE'S FENCE, RUN RATHER THAN READ — and the bound beside it.
//
// A MAP LEAKS BY AGGREGATION, WHICH IS THE FAILURE ONLY A PICTURE HAS. Every
// other read in this module is fenced row by row, and a row the caller may not
// see is simply not in the list. A SHAPE is different: the dots can each be
// perfectly fenced and the DRAWING still says something none of them does — a
// dense blob labelled "Confia" tells a reader that account exists and that we
// know a great deal about it, which is exactly what withholding `accounts:read`
// was for. So "the nodes are fenced" is not the property to test; "the GROUPING
// is fenced" is.
//
// Both are tested the same way the Google fences are: by CALLING the function
// with the deny case and proving it answers with nothing rather than with
// everything. An empty right-set and an absent fence look identical from the
// outside, and "no restriction" is what you get by leaving a restriction out.
//
// AND THE BOUND (R14), by reading the source: this file's reads are not `list*`
// or `search*`, so `bounded-lists` never looks at them — the one law that would
// have caught an unbounded read here is spelled to a naming convention this
// door does not match. Rather than rename the door to be seen by a regex, the
// obligation is asserted where it belongs, on the file itself.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it, vi } from "vitest"

import type { MemberGuard } from "@shared/workers/gating"

/** Every statement the builder issued, in order, so a test can ask what was
 * ASKED as well as what came back — a fence that returns nothing after reading
 * every account has already read every account. */
const asked = vi.hoisted(() => [] as { sql: string; params: unknown[] }[])

vi.mock("@shared/workers/d1-rest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/d1-rest")>()
  return {
    ...actual,
    d1Query: async (_cfg: unknown, _db: string, sql: string, params: unknown[] = []) => {
      asked.push({ sql, params })
      // THE CORPUS COUNT runs for real through this transport rather than being
      // stubbed out, so the picture's `total` is proved to come through the same
      // bounded seam the list's own badge uses (R16) — that is the property, not
      // the number.
      if (/COUNT\(\*\) AS n/.test(sql)) return [{ n: 3967 }]
      // ONE SOURCE, carrying every anchor, so a dropped hub is visible as an
      // absence rather than hidden by the row not having had one.
      if (/FROM knowledge_sources s\b/.test(sql) && /s\.kind/.test(sql))
        return [
          {
            id: "SRC1",
            kind: "ticket",
            title: "A source",
            account_id: "ACC1",
            app_id: "APP1",
            sprint_id: "SPR1",
          },
        ]
      if (/GROUP BY s\.account_id/.test(sql)) return [{ account_id: "ACC1", c: 12 }]
      if (/FROM accounts a\b/.test(sql)) return [{ id: "ACC1", name: "Confia" }]
      if (/FROM apps a\b/.test(sql)) return [{ id: "APP1", name: "Dispatch" }]
      if (/FROM sprints p\b/.test(sql)) return [{ id: "SPR1", name: "Sprint one" }]
      return []
    },
  }
})

import { buildShape } from "../src/lib/knowledge-shape"

const guard: MemberGuard = { userId: "U1", teamId: "T1", roleId: "R1", databaseId: "DB1" }
const cfg = {} as never
const run = (readable: string[]) => {
  asked.length = 0
  return buildShape(cfg, guard, { compartment: null, readable: new Set(readable) })
}

const EVERYTHING = ["knowledge_sources", "accounts", "apps", "sprints"]

describe("the picture is grouped only for a reader who may open accounts", () => {
  it("draws named, counted clusters when accounts are readable", async () => {
    const shape = await run(EVERYTHING)
    expect(shape.clustered).toBe(true)
    expect(shape.clusters).toEqual([{ id: "ACC1", label: "Confia", total: 12, drawn: 1 }])
    // The cluster is sized by the corpus count, never by what was drawn.
    expect(shape.clusters[0].total).not.toBe(shape.clusters[0].drawn)
  })

  it("WITHOUT accounts:read there is no cluster, no name and no account asked for", async () => {
    const shape = await run(["knowledge_sources", "apps", "sprints"])
    expect(shape.clustered, "the screen must be told the grouping is off").toBe(false)
    expect(shape.clusters, "a named blob is the fact the right was withholding").toEqual([])
    // Every node falls into the one unclustered field — no account id survives
    // on a node either, which would put the fact back through the side door.
    expect(shape.nodes.every((n) => n.cluster === "")).toBe(true)
    expect(
      asked.some((a) => /FROM accounts\b/.test(a.sql) || /GROUP BY s\.account_id/.test(a.sql)),
      "a fence that answers [] AFTER reading every account has already read them"
    ).toBe(false)
  })

  it("WITHOUT the app's module there is no app hub and no line to one", async () => {
    const shape = await run(["knowledge_sources", "accounts", "sprints"])
    expect(shape.nodes.some((n) => n.table === "apps")).toBe(false)
    // ABSENT, not greyed and not counted: a line to a record you may not read is
    // the fact, so there is no line at all.
    expect(shape.links.some((l) => l.to.startsWith("apps:"))).toBe(false)
    expect(asked.some((a) => /FROM apps\b/.test(a.sql))).toBe(false)
    // …and the sprint hub the reader MAY see is still there, so the subtraction
    // is per module rather than all-or-nothing.
    expect(shape.nodes.some((n) => n.table === "sprints")).toBe(true)
  })

  it("WITHOUT the sprint's module there is no sprint hub, and apps are untouched", async () => {
    const shape = await run(["knowledge_sources", "accounts", "apps"])
    expect(shape.nodes.some((n) => n.table === "sprints")).toBe(false)
    expect(shape.links.some((l) => l.to.startsWith("sprints:"))).toBe(false)
    expect(asked.some((a) => /FROM sprints\b/.test(a.sql))).toBe(false)
    expect(shape.nodes.some((n) => n.table === "apps")).toBe(true)
  })

  it("every node the picture draws names a record, so a click has somewhere to go", async () => {
    const shape = await run(EVERYTHING)
    for (const n of shape.nodes) {
      expect(n.table, `${n.id} has no table`).toBeTruthy()
      expect(n.recordId, `${n.id} has no record`).toBeTruthy()
    }
  })

  it("the number under the picture is the corpus, not the sample", async () => {
    const shape = await run(EVERYTHING)
    expect(shape.total).toBe(3967)
    expect(shape.drawn).toBe(1)
  })
})

describe("R14 — the picture is bounded, and the bound is at the statement", () => {
  const src = readFileSync(join(__dirname, "..", "src", "lib", "knowledge-shape.ts"), "utf8")

  it("every SELECT in the builder carries a LIMIT", () => {
    // The template literals this file builds are one statement each, so a
    // SELECT with no LIMIT between it and the end of its own template is an
    // unbounded read. Counted rather than sampled: a scan that finds none has
    // gone blind and would report all-clear exactly like a passing one.
    const statements = [...src.matchAll(/`SELECT[\s\S]*?`/g)].map((m) => m[0])
    expect(statements.length, "the scan found no statements — it has gone blind").toBeGreaterThan(3)
    for (const s of statements)
      expect(s, `an unbounded read: ${s.slice(0, 60)}…`).toMatch(/LIMIT /)
  })

  it("both caps come from shared/workers/limits.ts, never typed in here", () => {
    expect(src).toMatch(/from "@shared\/workers\/limits"/)
    // A number written at the statement is a cap nobody can find; the law's own
    // sentence is that the ceiling lives in one file with its reasoning.
    for (const s of [...src.matchAll(/LIMIT \$\{([^}]+)\}/g)].map((m) => m[1]))
      expect(s, `LIMIT ${s} is a literal, not a named cap`).toMatch(/KNOWLEDGE_SHAPE_/)
  })

  it("the ticket column is not drawn as an edge — it is a self-loop", () => {
    // Measured on staging (2026-09-08): 2,050 of 2,053 live sources carrying a
    // ticket point at their OWN origin row, because the source IS the mirror of
    // that ticket. Drawing it is two thousand loops from a node to itself.
    // Pinned here because the column is right there in the schema and the next
    // person to read it will reach for it.
    //
    // THE STATEMENTS, NOT THE FILE. The header above explains at length why this
    // column is left out, so a scan of the whole source fails on the sentence
    // that documents the rule — a law a truthful comment can break is one people
    // learn to write around, and the `validated-bodies` census says so in its own
    // words. What must not name the column is the SQL.
    for (const st of [...src.matchAll(/`SELECT[\s\S]*?`/g)].map((m) => m[0]))
      expect(st, `a ticket edge crept into: ${st.slice(0, 60)}…`).not.toMatch(/ticket_id/)
  })
})
