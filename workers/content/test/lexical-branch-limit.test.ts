// TRACKER d-lexical-branch-limit — Cloudflare D1 refuses a compound SELECT
// (UNION ALL, INTERSECT, EXCEPT — "terms" in SQLite's own vocabulary) past
// FIVE branches, measured against the live REST door, staging, 11 Sep 2026:
// harmless `SELECT 1 AS x` branches, no table touched — 5 succeeded, 6 was
// refused every time with {"code":7500,"message":"too many terms in compound
// SELECT: SQLITE_ERROR"}. `lexicalArm`'s old single UNION ALL of one branch
// per term threw, uncaught, on every question that tokenised to 6+ distinct
// terms — and since the vector arm runs FIRST, that threw away already-
// completed work too, not merely the keyword half.
//
// WHY A MOCK, NOT THE REAL SQLITE TEST DOUBLE. node:sqlite — this repo's
// entire local test harness — does not share D1's ceiling: measured directly,
// it accepts 40+ UNION ALL branches without complaint. A test against the
// real local double would prove the QUERY LOGIC correct while proving nothing
// about the CRASH, because the one thing that reproduces the bug (D1's own
// refusal) cannot reproduce locally by any other means. So this mock is an
// INDEPENDENT ORACLE of the measured real ceiling — hardcoded to 5, never
// read from the source under test — and refuses exactly the way D1 does the
// moment any one statement crosses it. That independence is what makes the
// mutation proof mean anything: if `lexicalArm`'s own batch size is ever
// widened past what D1 actually allows, this mock still enforces the real
// number and the test reddens for the right reason.

import { beforeEach, describe, expect, it, vi } from "vitest"

const sent: { sql: string; params: unknown[] }[] = []
/** THE INDEPENDENT ORACLE. D1's own measured ceiling, not `LEXICAL_MAX_BRANCHES`
 * — see this file's header. */
const REAL_D1_BRANCH_LIMIT = 5

vi.mock("@shared/workers/d1-rest", async (importOriginal) => {
  const real = await importOriginal<typeof import("@shared/workers/d1-rest")>()
  return {
    ...real,
    d1Query: vi.fn(async (_cfg: unknown, _db: unknown, sql: string, params?: unknown[]) => {
      sent.push({ sql, params: params ?? [] })
      const branches = (sql.match(/UNION ALL/g) ?? []).length + 1
      if (sql.includes("UNION ALL") && branches > REAL_D1_BRANCH_LIMIT) {
        // THE EXACT SHAPE D1 ANSWERS WITH — measured, not paraphrased (see
        // this file's header and d1-rest.ts's own handling of it).
        throw new Error("Cloudflare D1 API failed: too many terms in compound SELECT: SQLITE_ERROR")
      }
      // A per-batch `scoped`/`counted` call: every term in THIS batch matched
      // the one fixture row, so the merge across batches sums cleanly to
      // every term matching — comfortably clearing any floor this test picks.
      if (sql.includes("FROM scoped GROUP BY row_id")) return [{ row_id: 1, hits: branches, exact: 0 }]
      // The one unbatched call — bm25 over the combined MATCH, which never
      // branches and was never at risk.
      if (sql.includes("bm25(knowledge_chunks_fts)")) return [{ chunk_id: "CHUNK_1", row_id: 1, lex: -5.2 }]
      return []
    }),
  }
})

import { lexicalArm, type LexicalRole } from "../src/lib/knowledge"

const CFG = { accountId: "acct", apiToken: "tok" }
const GUARD = { userId: "U1", teamId: "T1", roleId: "R1", databaseId: "DB1" }

beforeEach(() => {
  sent.length = 0
  vi.clearAllMocks()
})

function askTerms(n: number, role: LexicalRole = "beside") {
  const terms = Array.from({ length: n }, (_, i) => `term${i}`)
  return lexicalArm(CFG as never, GUARD as never, terms, [], [], role)
}

describe("d-lexical-branch-limit: lexicalArm survives past the D1 compound-SELECT ceiling", () => {
  it("a 24-term question (MAX_QUESTION_TERMS) returns keyword results and does not throw", async () => {
    const rows = await askTerms(24)
    expect(rows).toEqual([{ chunk_id: "CHUNK_1", lex: -5.2, exact: 0 }])
  })

  it("REGRESSION, names the real number: no single query ever carries more than 5 UNION ALL branches", async () => {
    await askTerms(24)
    const branchCounts = sent
      .filter((s) => s.sql.includes("UNION ALL"))
      .map((s) => (s.sql.match(/UNION ALL/g) ?? []).length + 1)
    expect(branchCounts.length, "the batched query never ran at all").toBeGreaterThan(0)
    for (const n of branchCounts)
      expect(n, `a query carried ${n} branches — over the measured D1 ceiling of 5`).toBeLessThanOrEqual(5)
    // 24 terms at ≤5 per batch is 5 batches, not fewer — proves it actually
    // batched rather than happening to fit some other way.
    expect(branchCounts.length).toBe(5)
  })

  it("a 5-term question (at the measured ceiling) still runs in exactly one batch", async () => {
    await askTerms(5)
    const scopedCalls = sent.filter((s) => s.sql.includes("FROM scoped GROUP BY row_id"))
    expect(scopedCalls).toHaveLength(1)
  })

  it("an ordinary short question is unaffected — same one-batch shape as before this fix", async () => {
    const rows = await askTerms(2)
    expect(rows).toEqual([{ chunk_id: "CHUNK_1", lex: -5.2, exact: 0 }])
    expect(sent.filter((s) => s.sql.includes("FROM scoped GROUP BY row_id"))).toHaveLength(1)
  })
})
