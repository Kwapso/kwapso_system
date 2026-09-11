// R-CENSUS (tracker item `a-pieces`) — every column the schema declares on
// `knowledge_chunks` must ride the one INSERT that writes a chunk, or the
// column exists and nothing ever fills it. That is exactly how this base
// found itself with `context_line`/`speaker`/`said_at` on 3,954 rows and
// zero of them filled: a migration added three columns, `indexSource`'s
// INSERT never grew a fourth clause, and nothing anywhere said so — the same
// defect shape as `identity_key`, a column the schema declares and no code
// path was ever taught to fill.
//
// Read off disk, positionally, the same way R20/R29/etc already do: the
// schema's own CREATE TABLE + every ALTER TABLE ADD COLUMN is the ground
// truth (never hand-copied here, so a fifth column added next year is
// caught without touching this file), and the INSERT's own column list is
// read from `indexSource`'s literal SQL string, not summarised or assumed.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const MIGRATIONS = join(__dirname, "..", "..", "tenancy", "src", "team-schema", "migrations.ts")
const KNOWLEDGE = join(__dirname, "..", "src", "lib", "knowledge.ts")

/** A column the schema declares that this INSERT genuinely should not carry —
 * reasoned, rot-checked in both directions below. Empty on purpose: every
 * column `knowledge_chunks` has today is meant to ride this one write. */
const CHUNK_INSERT_EXEMPT = new Set<string>([])

function schemaColumns(source: string): string[] {
  const create = source.match(/CREATE TABLE knowledge_chunks \(([^;]+)\);/)
  if (!create) throw new Error("knowledge_chunks CREATE TABLE not found in migrations.ts")
  const columns: string[] = []
  for (const line of create[1].split("\n")) {
    const m = line.trim().match(/^(\w+)\s+(TEXT|INTEGER|REAL|BLOB)\b/)
    if (m) columns.push(m[1])
  }
  for (const m of source.matchAll(/ALTER TABLE knowledge_chunks ADD COLUMN (\w+)/g)) columns.push(m[1])
  if (columns.length < 8) throw new Error(`only found ${columns.length} columns — the parser broke, not the schema`)
  return columns
}

function insertColumns(source: string): string[] {
  const m = source.match(/INSERT INTO knowledge_chunks \(([^)]+)\)/)
  if (!m) throw new Error("knowledge_chunks INSERT not found in knowledge.ts")
  return m[1].split(",").map((c) => c.trim())
}

describe("every knowledge_chunks column the schema declares rides the chunk INSERT", () => {
  it("has no column the schema declares that the write forgets", () => {
    const schema = schemaColumns(readFileSync(MIGRATIONS, "utf8"))
    const insert = new Set(insertColumns(readFileSync(KNOWLEDGE, "utf8")))
    const missing = schema.filter((c) => !insert.has(c) && !CHUNK_INSERT_EXEMPT.has(c))
    expect(missing, `declared but never written: ${missing.join(", ") || "(none)"}`).toEqual([])
  })

  it("carries no exemption for a column the INSERT already writes (rot check)", () => {
    const insert = new Set(insertColumns(readFileSync(KNOWLEDGE, "utf8")))
    const stale = [...CHUNK_INSERT_EXEMPT].filter((c) => insert.has(c))
    expect(stale, `stale — already in the INSERT: ${stale.join(", ")}`).toEqual([])
  })

  it("carries no exemption for a column the schema no longer declares (rot check)", () => {
    const schema = new Set(schemaColumns(readFileSync(MIGRATIONS, "utf8")))
    const stale = [...CHUNK_INSERT_EXEMPT].filter((c) => !schema.has(c))
    expect(stale, `stale — the schema doesn't have these any more: ${stale.join(", ")}`).toEqual([])
  })
})
