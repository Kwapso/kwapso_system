// THE MIGRATION ROBOT'S OWN SHAPE — a chunk, a resume point, and a failure that
// does not take the rest of the estate with it.
//
// It walked EVERY ready team with no LIMIT, applied every missing migration with
// no bound, and let the first throw out of `applyMigration` end the whole route.
// So on any estate large enough to matter it was a worker killed halfway, with
// some databases migrated and some not, and no response to say which — and on
// any estate at all, one unreachable database meant every team after it in the
// listing was silently never visited (speed_review crit 3, 7 Sep 2026: the one
// bulk path in the product with no ceiling of any kind).
//
// The three properties below are the repair, and each of them is the sentence a
// bulk path has to be able to say about itself:
//
//   the CHUNK      — MIGRATE_TEAMS_PER_RUN teams, never more, however many exist
//   the RESUME     — `remaining: true`, and the next run continues, because each
//                    team's own `_migrations` table is the position (no cursor to
//                    store, and none to get out of step)
//   PARTIAL FAILURE — one database that refuses is named in `failed` and the
//                    other twenty-four are still migrated

import { beforeEach, describe, expect, it, vi } from "vitest"

import { MIGRATE_TEAMS_PER_RUN } from "@shared/workers/limits"

/** Which team databases have been asked for their `_migrations`, and which ones
 * refuse to be written to. */
let asked: string[] = []
let applied: string[] = []
let broken = new Set<string>()

vi.mock("../src/context", () => ({
  whoAmI: vi.fn(),
  toActor: vi.fn(),
  teamContext: vi.fn(),
  adminGuard: () => null,
}))
vi.mock("@shared/workers/d1-rest", async (importOriginal) => ({
  // The REAL module, with ONE door stood in for: the team schema itself imports
  // `sqlString` from here, so replacing the whole module breaks the migrations
  // this suite is about.
  ...(await importOriginal<typeof import("@shared/workers/d1-rest")>()),
  // Every team is at zero, so every team has work to do.
  d1Query: async (_cfg: unknown, databaseId: string) => {
    asked.push(databaseId)
    return []
  },
}))
vi.mock("../src/lib/teams", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/lib/teams")>()),
  d1Config: () => ({}),
  applyMigration: async (_cfg: unknown, databaseId: string) => {
    if (broken.has(databaseId)) throw new Error("that database is not reachable")
    applied.push(databaseId)
  },
}))

const { migrateTeams } = await import("../src/routes/admin")

/** A core database holding `count` ready teams, all behind. */
function coreWith(count: number) {
  const rows = Array.from({ length: count }, (_, i) => ({
    id: `T${String(i).padStart(3, "0")}`,
    database_id: `db-${String(i).padStart(3, "0")}`,
    schema_version: "0001_old",
  }))
  const stamped: string[] = []
  return {
    stamped,
    env: {
      DB: {
        prepare: (sql: string) => ({
          bind: (...args: unknown[]) => ({
            // The robot reads one page: LIMIT is the LAST bound argument.
            all: async () => ({ results: rows.slice(0, Number(args[args.length - 1])) }),
            run: async () => {
              if (sql.includes("UPDATE teams")) stamped.push(String(args[2]))
              return { meta: { changes: 1 } }
            },
            first: async () => null,
          }),
        }),
      },
    } as never,
  }
}

const call = () => migrateTeams(new Request("https://x/api/tenancy/admin/migrate", { method: "POST" }), coreState.env)
let coreState: ReturnType<typeof coreWith>

beforeEach(() => {
  asked = []
  applied = []
  broken = new Set()
})

describe("the migration robot is a bulk path with a shape", () => {
  it(`takes at most ${MIGRATE_TEAMS_PER_RUN} teams however many are behind, and says there is more`, async () => {
    coreState = coreWith(MIGRATE_TEAMS_PER_RUN * 3)
    const body = (await (await call()).json()) as { teamsChecked: number; remaining: boolean }

    expect(body.teamsChecked, "the chunk is the chunk").toBe(MIGRATE_TEAMS_PER_RUN)
    expect(asked, "and no database outside it was even opened").toHaveLength(MIGRATE_TEAMS_PER_RUN)
    // THE RESUME SIGNAL. Without it an operator has no way to know the estate is
    // half-migrated, which is worse than the unbounded loop it replaced.
    expect(body.remaining, "run it again").toBe(true)
  })

  it("says there is NOTHING more when the page is short", async () => {
    coreState = coreWith(3)
    const body = (await (await call()).json()) as { teamsChecked: number; remaining: boolean }
    expect(body.teamsChecked).toBe(3)
    expect(body.remaining).toBe(false)
  })

  it("one unreachable database is NAMED, and the rest are still migrated", async () => {
    // THE REGRESSION THIS FILE EXISTS FOR. The throw used to leave the route, so
    // the operator got a 500 and every team after the broken one was never
    // visited — invisibly, because the response that would have said so was the
    // thing that failed.
    coreState = coreWith(5)
    broken.add("db-002")
    const res = await call()
    const body = (await res.json()) as {
      ok: boolean
      teamsMigrated: number
      failed: { teamId: string; reason: string }[]
    }

    expect(res.status, "a database that refuses is an ANSWER, not a crash").toBe(200)
    expect(body.ok).toBe(false)
    expect(body.failed.map((f) => f.teamId)).toEqual(["T002"])
    expect(body.failed[0].reason).toContain("not reachable")
    expect(body.teamsMigrated, "the other four were carried forward").toBe(4)
    expect(applied, "including every team AFTER the broken one").toContain("db-004")
  })
})
