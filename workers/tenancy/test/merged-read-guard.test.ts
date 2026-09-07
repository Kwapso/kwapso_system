// A CONCATENATION CANNOT PAGE, SORT OR COUNT — SO IT IS NOT A CONCATENATION ANY
// MORE (7 Sep 2026).
//
// `d1QueryAcross` runs one statement against several databases. Until today it
// returned every row as one list and REFUSED the three shapes a flat
// concatenation gets wrong. That refusal was correct, and it was also the reason
// the mover's relief valve could not be turned on: every collection read in this
// app is sorted at the door and paged (R14), so a merged read that "worked"
// would have thrown on the first list request after a move.
//
// What changed, and what did not:
//
//   • LIMIT n + ORDER BY → MERGED. Each shard answers its own top n under the
//     same ordering, so the global top n is a SUBSET of the union of those
//     answers; the seam sorts the union by the statement's OWN keys (parsed off
//     the tail, never restated by the caller) and cuts to n. Exactly the rows
//     one database would have given.
//   • COUNT(…) and the other aggregates → STILL REFUSED. One row per shard, and
//     every caller in this base reads `rows[0].n`. `countCollectionAcross` folds
//     a count properly and the message points there.
//   • OFFSET → STILL REFUSED, and this one is new. Skipping m rows per shard
//     skips a different m in the merged order, and there is no local answer to a
//     global skip. R14's keyset paging carries no OFFSET, so nothing needs it.
//   • an ORDER BY the parse cannot read as plain columns → STILL REFUSED. A
//     merge that guesses at `CASE`/`COLLATE`/a function is the wrong answer
//     wearing the right shape.
//
// The direction is unchanged where it is unchanged: fail loud rather than answer
// wrong.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it, vi, afterEach } from "vitest"

import { sourceFiles } from "@shared/rules/source-scan"
import { d1QueryAcross, mergeAndCut, mergePlan } from "@shared/workers/d1-rest"

import { SPLIT_READS_WIRED } from "../src/lib/sharding"
import { moveModule } from "../src/routes/admin"

const CFG = { accountId: "a", apiToken: "t" }

afterEach(() => vi.unstubAllGlobals())

/** Every database answers one row, so a concatenation is visibly a concatenation. */
function stubShards() {
  vi.stubGlobal("fetch", async () =>
    new Response(JSON.stringify({ success: true, errors: [], result: [{ results: [{ n: 1 }] }] }), {
      status: 200,
    })
  )
}

describe("one database is a plain read — nothing is refused", () => {
  it("allows a LIMIT, an ORDER BY and a COUNT against a single database", async () => {
    stubShards()
    // Every read in the base today is this call. It must be untouched.
    await expect(
      d1QueryAcross(CFG, ["only"], "SELECT COUNT(*) AS n FROM help ORDER BY created_at DESC LIMIT 51")
    ).resolves.toEqual([{ n: 1 }])
  })
})

describe("two or more databases MERGE what a merge can honestly reproduce", () => {
  const SHARDS = ["one", "two"]

  /** Two shards, each already sorted by `created_at DESC` — which is what a
   * database returns for the statement below. Interleaved on purpose: a seam
   * that concatenated would answer them in shard order and pass a test whose
   * fixtures did not overlap. */
  function stubTwoShards(
    first: Record<string, unknown>[],
    second: Record<string, unknown>[]
  ) {
    let call = 0
    vi.stubGlobal("fetch", async () => {
      const results = call++ === 0 ? first : second
      return new Response(JSON.stringify({ success: true, errors: [], result: [{ results }] }), { status: 200 })
    })
  }

  it("returns the top n OVERALL, not the top n of each shard", async () => {
    stubTwoShards(
      [{ id: "a", created_at: "2026-09-05" }, { id: "b", created_at: "2026-09-01" }],
      [{ id: "c", created_at: "2026-09-04" }, { id: "d", created_at: "2026-09-03" }]
    )
    // Two shards × LIMIT 2 = four rows in flight; the merged answer is the two
    // newest across both, in order. A concatenation would answer a, b.
    await expect(
      d1QueryAcross(CFG, SHARDS, "SELECT id FROM help ORDER BY created_at DESC LIMIT 2")
    ).resolves.toEqual([{ id: "a", created_at: "2026-09-05" }, { id: "c", created_at: "2026-09-04" }])
  })

  it("sorts ASCENDING when the statement does, and on several keys in order", async () => {
    stubTwoShards(
      [{ id: "b", rank: 1, title: "z" }],
      [{ id: "a", rank: 1, title: "a" }, { id: "c", rank: 0, title: "m" }]
    )
    await expect(
      d1QueryAcross(CFG, SHARDS, "SELECT id FROM stories ORDER BY rank ASC, title ASC")
    ).resolves.toEqual([
      { id: "c", rank: 0, title: "m" },
      { id: "a", rank: 1, title: "a" },
      { id: "b", rank: 1, title: "z" },
    ])
  })

  it("puts NULLs where SQLite puts them, so the merged order matches one database's", async () => {
    stubTwoShards([{ id: "a", due: "2026-01-01" }], [{ id: "b", due: null }])
    await expect(d1QueryAcross(CFG, SHARDS, "SELECT id FROM todos ORDER BY due ASC")).resolves.toEqual([
      { id: "b", due: null },
      { id: "a", due: "2026-01-01" },
    ])
  })

  it("still allows a plain row read across shards — the thing the path is FOR", async () => {
    stubShards()
    await expect(
      d1QueryAcross(CFG, SHARDS, "SELECT id, title FROM help WHERE account_id = ?", ["A1"])
    ).resolves.toEqual([{ n: 1 }, { n: 1 }])
  })
})

describe("and refuses what it cannot", () => {
  const SHARDS = ["one", "two"]

  it("refuses an aggregate — the one that would make R16's exact count wrong", async () => {
    stubShards()
    for (const sql of [
      "SELECT COUNT(*) AS n FROM help",
      "SELECT SUM(minutes) AS n FROM work_logs",
      "SELECT MAX(rank) AS top FROM stories",
    ])
      await expect(d1QueryAcross(CFG, SHARDS, sql)).rejects.toThrow(/aggregate/)
  })

  it("refuses an OFFSET — there is no local answer to a global skip", async () => {
    stubShards()
    await expect(
      d1QueryAcross(CFG, SHARDS, "SELECT id FROM help ORDER BY created_at DESC LIMIT 20 OFFSET 40")
    ).rejects.toThrow(/OFFSET/)
  })

  it("refuses a LIMIT with nothing to order it by", async () => {
    // "Any 20 rows" is answerable, and answerable DIFFERENTLY on every call.
    stubShards()
    await expect(d1QueryAcross(CFG, SHARDS, "SELECT id FROM help LIMIT 20")).rejects.toThrow(/ORDER BY/i)
  })

  it("refuses an ORDER BY it cannot read as plain columns", async () => {
    stubShards()
    for (const order of [
      "CASE WHEN done THEN 1 ELSE 0 END",
      "LOWER(title)",
      "title COLLATE NOCASE",
      "1",
    ])
      await expect(
        d1QueryAcross(CFG, SHARDS, `SELECT id FROM help ORDER BY ${order} LIMIT 5`),
        `${order} must not be guessed at`
      ).rejects.toThrow(/ORDER BY \/ LIMIT is not one the merge can reproduce/)
  })

  it("says what to do instead, not just that it refused", async () => {
    stubShards()
    await expect(d1QueryAcross(CFG, SHARDS, "SELECT COUNT(*) AS n FROM help")).rejects.toThrow(
      /countCollectionAcross/
    )
  })
})

describe("the merge plan is read off the statement, never restated", () => {
  it("reads the keys and the cut the statement actually asked for", () => {
    expect(mergePlan("SELECT id FROM help ORDER BY created_at DESC LIMIT 51")).toEqual({
      keys: [{ column: "created_at", descending: true }],
      limit: 51,
    })
    expect(mergePlan("SELECT id FROM t ORDER BY t.rank, t.id DESC")).toEqual({
      keys: [
        { column: "rank", descending: false },
        { column: "id", descending: true },
      ],
      limit: null,
    })
    // No ordering and no cut is an ordinary row read and needs no plan at all.
    expect(mergePlan("SELECT id FROM help WHERE account_id = ?")).toEqual({ keys: [], limit: null })
  })

  it("answers null for every tail it would have to guess at", () => {
    for (const sql of [
      "SELECT id FROM help LIMIT 5",
      "SELECT id FROM help ORDER BY LOWER(title) LIMIT 5",
      "SELECT id FROM help ORDER BY created_at DESC LIMIT 5 OFFSET 5",
      "SELECT id FROM (SELECT id FROM a ORDER BY x) ORDER BY LOWER(y)",
    ])
      expect(mergePlan(sql), sql).toBeNull()
  })

  it("cuts a merged list to the page the statement asked for", () => {
    const rows = [{ n: 3 }, { n: 1 }, { n: 2 }]
    expect(mergeAndCut(rows, { keys: [{ column: "n", descending: false }], limit: 2 })).toEqual([
      { n: 1 },
      { n: 2 },
    ])
    // Stable: rows equal on every key keep the order the shards were listed in,
    // which is `resolveModuleDatabases`'s (override first).
    const tied = [{ id: "x", n: 1 }, { id: "y", n: 1 }]
    expect(mergeAndCut(tied, { keys: [{ column: "n", descending: true }], limit: null })).toEqual(tied)
  })
})

// ── AND THE RELIEF VALVE THAT DEPENDS ON ALL OF THE ABOVE ───────────────────
//
// The header of this file says "nothing paged goes through the split path today"
// and treats that as a tripwire for the future. It is also, read the other way, a
// statement that the MOVER CANNOT BE RUN — and until 5 Sep 2026 nothing said so
// and the door answered `{ ok: true, status: "done" }`.
//
// What the mover does: copy a module's tables into a new database, verify the
// counts, write the routing row, then DRAIN the old home — its own comment saying
// "routing has already flipped: `resolveModuleDatabases` now returns both
// databases and every read is a MERGED read over them."
//
// What the app does: `requireMember` resolves ONE `guard.databaseId` out of
// `teams.database_id`, consults `team_module_databases` nowhere, and every module
// lib reads that id. So the drain empties the database every screen is still
// querying, on both front doors, for every member of that team — and the mover
// reports success and resolves the size alarm that prompted it.
//
// The refusal is now at the door, and this is what keeps the refusal HONEST: the
// flag is checked against a census of the read path's real callers, so it cannot
// be left set the wrong way in either direction.
describe("the module mover refuses while the app cannot read a moved module", () => {
  const ROOT = join(__dirname, "..", "..", "..")

  /** Every production .ts under workers/ and shared/ — no tests, because a test
   * calling the split path proves nothing about whether the APP does. */
  function productionSources(): { rel: string; source: string }[] {
    const dirs = [join(ROOT, "workers"), join(ROOT, "shared")]
    return sourceFiles(dirs, { extensions: [".ts"], relativeTo: ROOT }).filter(
      (f) => !/(^|\/)test(s)?\//.test(f.rel) && !/\.test\.ts$/.test(f.rel)
    )
  }

  it("SPLIT_READS_WIRED agrees with whether anything actually reads across databases", () => {
    // A call to the merged read from anywhere that is not the sharding lib itself.
    // `resolveModuleDatabases` and `queryModule` are the two entry points; the
    // third name is the primitive under them. `queryModule` is deliberately
    // matched only where it is IMPORTED FROM THE SHARDING LIB, because
    // shared/workers/query-grammar.ts exports an unrelated function of the same
    // name and a bare name match would report the read path as wired by a
    // coincidence of vocabulary.
    const callers: string[] = []
    for (const { rel, source } of productionSources()) {
      if (rel.endsWith("workers/tenancy/src/lib/sharding.ts")) continue
      const importsSharding = /from\s+"[^"]*(?:lib\/)?sharding"/.test(source)
      const usesEntry =
        (importsSharding && /\b(resolveModuleDatabases|queryModule)\s*\(/.test(source)) ||
        /\bd1QueryAcross\s*\(/.test(source)
      if (usesEntry) callers.push(rel)
    }

    // THE CANARY. If the census cannot see the sharding lib's own use of the path
    // it is looking for, its zero means nothing — so prove the pattern matches
    // where the thing is definitely present before believing it anywhere else.
    const shardingSrc = readFileSync(
      join(ROOT, "workers", "tenancy", "src", "lib", "sharding.ts"),
      "utf8"
    )
    expect(
      /\bd1QueryAcross\s*\(/.test(shardingSrc),
      "the census pattern must match the merged read where it definitely exists"
    ).toBe(true)

    expect(
      SPLIT_READS_WIRED,
      callers.length
        ? `${callers.join(", ")} now read across databases, so the mover's relief valve may be real — read d1QueryAcross's refusals (LIMIT/ORDER BY/COUNT) and R14/R16 first, then set SPLIT_READS_WIRED to true`
        : "nothing outside sharding.ts reads across databases, so a moved module would be invisible to the app — SPLIT_READS_WIRED must stay false"
    ).toBe(callers.length > 0)
  })

  it("the mover has exactly one caller, and it is the door that refuses", () => {
    // The refusal is at the door rather than in the lib (so the mover's own
    // mechanics stay testable), which is only safe while the door is the whole
    // way in. A second caller would route around it.
    const callers = productionSources()
      .filter(({ rel, source }) => !rel.endsWith("lib/sharding.ts") && /moveModuleToOwnDatabase\s*\(/.test(source))
      .map((f) => f.rel)
    expect(callers, "the mover is reached through the admin door and nowhere else").toEqual([
      "workers/tenancy/src/routes/admin.ts",
    ])
  })

  it("the door refuses without creating a database or copying a row", async () => {
    // The half that matters most: a refusal that arrived AFTER `d1CreateDatabase`
    // would leave an orphan database on a shared Cloudflare account every time
    // somebody tried.
    const touched: string[] = []
    vi.stubGlobal("fetch", async (url: string) => {
      touched.push(url)
      return new Response(JSON.stringify({ success: true, errors: [], result: {} }), { status: 200 })
    })
    const res = await moveModule(
      new Request("https://tenancy/api/tenancy/admin/move-module", {
        method: "POST",
        headers: { "x-admin-key": "k", "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: "t1", module: "help", tables: ["help"] }),
      }),
      { ADMIN_KEY: "k" } as never
    )
    expect(res.status).toBe(503)
    expect((await res.json()) as { error?: string }).toMatchObject({ error: "module_move_unavailable" })
    expect(touched, "nothing was created and nothing was copied").toEqual([])
  })
})
