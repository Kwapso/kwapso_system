// EVERY MCP CALL LEAVES ONE ROW — token id, tool name, ok or refused, when.
// Reads included, which is the half the team's own activity row never sees (a
// read mutates nothing there). Run against a REAL SQLite database with the
// REAL migrations applied (0013 + 0016 + 0031), for the same reason
// tokens.test.ts does: the fence (a caller only ever reads THEIR OWN rows) and
// the paging (keyset, newest first) are properties of the SQL, and a stub would
// agree with either one, right or wrong.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { DatabaseSync, type SqlValue } from "node:sqlite"
import { describe, expect, it } from "vitest"

import { PAGE_SIZE } from "@shared/workers/paging"
import { countCalls, insertCall, listCalls } from "../src/lib/call-log"

const CORE = join(__dirname, "..", "..", "..", "db", "core")
const migration = (name: string) => readFileSync(join(CORE, name), "utf8")

function coreDb() {
  const db = new DatabaseSync(":memory:")
  const strip = (sql: string) => sql.replace(/ REFERENCES \w+ \(id\)/g, "")
  db.exec(strip(/CREATE TABLE mcp_tokens[\s\S]*?\n\);/.exec(migration("0013_mcp_tokens.sql"))![0]))
  db.exec(migration("0016_mcp_token_life.sql"))
  const m31 = migration("0031_mcp_call_log.sql")
  db.exec(strip(/CREATE TABLE mcp_call_log[\s\S]*?\n\);/.exec(m31)![0]))
  for (const idx of m31.matchAll(/CREATE INDEX[^;]*;/g)) db.exec(idx[0])
  return db
}

/** The slice of the D1 binding call-log.ts uses, over real SQLite. */
function d1(db: DatabaseSync) {
  return {
    prepare(sql: string) {
      const stmt = db.prepare(sql)
      let args: unknown[] = []
      const api = {
        bind(...a: unknown[]) {
          args = a
          return api
        },
        async first<T>(): Promise<T | null> {
          return (stmt.get(...(args as SqlValue[])) ?? null) as T | null
        },
        async all<T>() {
          return { results: stmt.all(...(args as SqlValue[])) as T[] }
        },
        async run() {
          const r = stmt.run(...(args as SqlValue[]))
          return { meta: { changes: Number(r.changes) } }
        },
      }
      return api
    },
  }
}

const TOKEN = "tok_alice"
const USER = "user_alice"

function fresh() {
  const db = coreDb()
  const env = { DB: d1(db) } as never
  return { db, env }
}

describe("every MCP call leaves one row", () => {
  it("a call writes token id, tool name, ok/refused and when — never the payload", async () => {
    const t = fresh()
    await insertCall(t.env, TOKEN, USER, "whoami", true, "trace-1")
    const row = t.db.prepare("SELECT * FROM mcp_call_log").get() as Record<string, unknown>
    expect(row.token_id).toBe(TOKEN)
    expect(row.user_id).toBe(USER)
    expect(row.tool_name).toBe("whoami")
    expect(row.ok).toBe(1)
    expect(row.trace_id).toBe("trace-1")
    expect(row.created_at).toBeTruthy()
  })

  it("a refused call is recorded as refused, not dropped", async () => {
    const t = fresh()
    await insertCall(t.env, TOKEN, USER, "create_role", false, "trace-2")
    const row = t.db.prepare("SELECT ok FROM mcp_call_log").get() as { ok: number }
    expect(row.ok).toBe(0)
  })

  it("a logging failure is swallowed — the tool call it describes must not fail on it", async () => {
    const t = fresh()
    t.db.exec("DROP TABLE mcp_call_log")
    await expect(insertCall(t.env, TOKEN, USER, "whoami", true, "trace-3")).resolves.toBeUndefined()
  })
})

describe("a token's own call log pages, newest first", () => {
  it("reads back what was written, newest first", async () => {
    const t = fresh()
    await insertCall(t.env, TOKEN, USER, "first", true, "t1")
    await new Promise((r) => setTimeout(r, 2))
    await insertCall(t.env, TOKEN, USER, "second", true, "t2")
    const page = await listCalls(t.env, TOKEN, USER, null)
    expect(page.rows.map((r) => r.toolName)).toEqual(["second", "first"])
    expect(page.hasMore).toBe(false)
    expect(page.nextCursor).toBeNull()
  })

  it("pages by key — a second page reaches rows the first page did not", async () => {
    const t = fresh()
    for (let i = 0; i < PAGE_SIZE + 5; i++) {
      t.db
        .prepare(
          "INSERT INTO mcp_call_log (id, token_id, user_id, tool_name, ok, trace_id, created_at) VALUES (?,?,?,?,?,?,?)"
        )
        .run(`c${i}`, TOKEN, USER, `tool_${i}`, 1, `trace_${i}`, new Date(Date.now() + i * 1000).toISOString())
    }
    const first = await listCalls(t.env, TOKEN, USER, null)
    expect(first.rows.length).toBe(PAGE_SIZE)
    expect(first.hasMore).toBe(true)
    expect(first.nextCursor).toBeTruthy()

    const second = await listCalls(t.env, TOKEN, USER, first.nextCursor)
    expect(second.rows.length).toBe(5)
    expect(second.hasMore).toBe(false)
    const firstIds = new Set(first.rows.map((r) => r.id))
    for (const r of second.rows) expect(firstIds.has(r.id), "page two must not repeat page one").toBe(false)
  })

  it("never another user's calls — even for the SAME token id", async () => {
    const t = fresh()
    await insertCall(t.env, TOKEN, USER, "mine", true, "t1")
    await insertCall(t.env, TOKEN, "user_bob", "not-mine", true, "t2")
    const page = await listCalls(t.env, TOKEN, USER, null)
    expect(page.rows.map((r) => r.toolName)).toEqual(["mine"])
  })

  it("the count is exact and matches the page's total", async () => {
    const t = fresh()
    await insertCall(t.env, TOKEN, USER, "a", true, "t1")
    await insertCall(t.env, TOKEN, USER, "b", false, "t2")
    const counted = await countCalls(t.env, TOKEN, USER)
    expect(counted.total).toBe(2)
    expect(counted.totalCapped).toBe(false)
  })
})
