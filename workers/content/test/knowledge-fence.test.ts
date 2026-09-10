// THE FENCE THE FOLD CANNOT SHIP WITHOUT — `ownerClause`, live against a
// source's own sightings, exercised end to end through the real door rather
// than as a unit test on a SQL string.
//
// ── WHY THIS HAS TO BE A REAL DOOR CALL ─────────────────────────────────────
//
// A unit test on the SQL fragment can prove the string is well-formed. It
// cannot prove the WHERE clause actually excludes a row the caller may not
// see, because that is a property of what D1 does with the statement, not of
// the statement's text. So every case here calls `GET /api/content/knowledge`
// as a real caller and reads back what came out — which is what caught the
// gap this file exists to hold down: an early draft of `ownerClause` OR'd
// `owner_user_id IS NULL` in UNCONDITIONALLY, so a source with two private
// sightings and no team sighting — the calendar fold's own shape, measured on
// staging as 100% of what the fold produces — would have read as team-visible
// to a caller with no relationship to it at all, the moment a fold-writer
// (not yet built) correctly nulled its `owner_user_id` because no single value
// could name two people. The bug never showed on a source with ONE sighting or
// none, which is every row the rest of this suite's fixtures already cover.
//
// ── THE SHAPE THE CALENDAR FOLD ACTUALLY PRODUCES, measured on staging ─────
//
// scripts/measure-source-identity.mjs: 27 of 33 folded calendar sources are
// held by two or three DIFFERENT people, every one of them on the PRIVATE
// shelf, none on the team's. That is the case this file is built around —
// seeded directly via `knowledge_sightings` inserts, because the sweep that
// would produce it by folding duplicate rows is a separate, unbuilt piece
// (kb_B1's tick 14 report names it: the fold-merge write path).

import type { DatabaseSync } from "node:sqlite"
import { beforeEach, describe, expect, it, vi } from "vitest"

const holder = vi.hoisted(() => ({ db: null as DatabaseSync | null }))

vi.mock("@shared/workers/d1-rest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/d1-rest")>()
  const { d1Impl } = await import("../../tenancy/test/d1-sqlite")
  return { ...actual, ...d1Impl(() => holder.db as DatabaseSync) }
})

import worker from "../src/index"
import { fakeVectorize } from "./fake-vectorize"
import { buildSpineDb, IDS, makeEnv } from "../../tenancy/test/spine-harness"
import { execKnowledgeScript, teamVisibleRecomputeSql } from "../src/lib/knowledge"

const db = () => holder.db as DatabaseSync
let vectorIndex = fakeVectorize()

function env(userId: string) {
  const base = makeEnv(() => db(), userId) as unknown as Record<string, unknown>
  return { ...base, INTERNAL_KEY: "k", KNOWLEDGE_INDEX: vectorIndex.binding } as never
}

/** One source by id, as the caller may see it. `rows` is empty when the fence
 * excludes it — the same shape a colleague's own screen would show. */
async function readAs(userId: string, sourceId: string): Promise<boolean> {
  const res = await worker.fetch(
    new Request(`https://content/api/content/knowledge?id=${sourceId}`, {
      headers: { Cookie: "session=x" },
    }),
    env(userId)
  )
  expect(res.status).toBe(200)
  const body = (await res.json()) as { sources: unknown[] }
  return body.sources.length > 0
}

const COLLEAGUE = "U_COLLEAGUE"
const STRANGER = "U_STRANGER"

beforeEach(() => {
  holder.db = buildSpineDb()
  vectorIndex = fakeVectorize()
  db().exec(
    `INSERT INTO role_permissions (id, role_id, module, can_read, can_create, can_edit, can_delete)
       VALUES ('${IDS.adminRole}_knowledge', '${IDS.adminRole}', 'knowledge', 1, 1, 1, 1);
     -- Two more colleagues in the SAME team, the same role as the staff user,
     -- so a fence result can only ever be about the SIGHTING and never about a
     -- permission difference between them.
     INSERT INTO users (id, email, first_name, current_team_id) VALUES
       ('${COLLEAGUE}', 'colleague@kwapso.app', 'Colleague', '${IDS.team}'),
       ('${STRANGER}', 'stranger@kwapso.app', 'Stranger', '${IDS.team}');
     INSERT INTO team_members (id, team_id, user_id, role_id, created_at) VALUES
       ('m_colleague', '${IDS.team}', '${COLLEAGUE}', '${IDS.adminRole}', '2026-01-01'),
       ('m_stranger', '${IDS.team}', '${STRANGER}', '${IDS.adminRole}', '2026-01-01');`
  )
})

/** Write one source directly, at whatever `owner_user_id`/`team_visible` a
 * case wants to start from — the un-migrated shape a source arrives in before
 * any sighting exists, or an already-ambiguous one, seeded by hand. */
function seedSource(id: string, ownerUserId: string | null, teamVisible: 0 | 1): void {
  db().exec(
    `INSERT INTO knowledge_sources (id, kind, compartment, title, summary, body, body_bytes, owner_user_id,
       team_visible, created_at, creator_name)
     VALUES ('${id}', 'note', 'agency', 'A source', 'A source', 'body', 4,
       ${ownerUserId ? `'${ownerUserId}'` : "NULL"}, ${teamVisible}, '2026-01-01', 'kwapso');`
  )
}

function seedSighting(sourceId: string, userId: string, shelf: "private" | "team", goneAt?: string): void {
  db().exec(
    `INSERT INTO knowledge_sightings (id, source_id, seen_where, seen_by_user_id, shelf, seen_at, gone_at, created_at)
     VALUES ('sg_${sourceId}_${userId}', '${sourceId}', 'x', '${userId}', '${shelf}', '2026-01-01',
       ${goneAt ? `'${goneAt}'` : "NULL"}, '2026-01-01');`
  )
}

describe("a source with no sightings — the legacy rule, unchanged", () => {
  it("answers team material to everyone", async () => {
    seedSource("S_TEAM", null, 1)
    expect(await readAs(IDS.staffUser, "S_TEAM")).toBe(true)
    expect(await readAs(STRANGER, "S_TEAM")).toBe(true)
  })

  it("answers private material only to its owner", async () => {
    seedSource("S_PRIV", IDS.staffUser, 0)
    expect(await readAs(IDS.staffUser, "S_PRIV")).toBe(true)
    expect(await readAs(STRANGER, "S_PRIV")).toBe(false)
  })
})

describe("a source with one sighting", () => {
  it("a private sighting is readable by the person who saw it, and nobody else", async () => {
    seedSource("S1", null, 0)
    seedSighting("S1", COLLEAGUE, "private")
    expect(await readAs(COLLEAGUE, "S1")).toBe(true)
    expect(await readAs(STRANGER, "S1")).toBe(false)
    expect(await readAs(IDS.staffUser, "S1")).toBe(false)
  })

  it("a team sighting is readable by everyone, whoever saw it", async () => {
    seedSource("S2", null, 1)
    seedSighting("S2", COLLEAGUE, "team")
    expect(await readAs(COLLEAGUE, "S2")).toBe(true)
    expect(await readAs(STRANGER, "S2")).toBe(true)
  })

  it("a RETIRED sighting grants nothing — gone is gone", async () => {
    seedSource("S3", null, 0)
    seedSighting("S3", COLLEAGUE, "team", "2026-02-01T00:00:00.000Z")
    expect(await readAs(COLLEAGUE, "S3")).toBe(false)
    expect(await readAs(STRANGER, "S3")).toBe(false)
  })
})

describe("the calendar fold's own shape — several private sightings, no team one", () => {
  it("is readable by EVERY sighted person and nobody else, whatever owner_user_id says", async () => {
    // owner_user_id = NULL, exactly as an honest fold-writer must leave it
    // once no single value can name every sighter — the case the missing
    // NOT-EXISTS gate would have read as "team", for everyone.
    seedSource("S_FOLD", null, 0)
    seedSighting("S_FOLD", IDS.staffUser, "private")
    seedSighting("S_FOLD", COLLEAGUE, "private")
    expect(await readAs(IDS.staffUser, "S_FOLD")).toBe(true)
    expect(await readAs(COLLEAGUE, "S_FOLD")).toBe(true)
    expect(await readAs(STRANGER, "S_FOLD"), "a caller with no sighting read team material that has none").toBe(
      false
    )
  })

  it("keeps answering for the survivors once one sighter's access ends", async () => {
    seedSource("S_PARTIAL", null, 0)
    seedSighting("S_PARTIAL", IDS.staffUser, "private", "2026-02-01T00:00:00.000Z")
    seedSighting("S_PARTIAL", COLLEAGUE, "private")
    expect(await readAs(IDS.staffUser, "S_PARTIAL")).toBe(false)
    expect(await readAs(COLLEAGUE, "S_PARTIAL")).toBe(true)
  })

  it("one team sighting among several private ones answers for everybody", async () => {
    seedSource("S_MIXED", null, 1)
    seedSighting("S_MIXED", IDS.staffUser, "private")
    seedSighting("S_MIXED", COLLEAGUE, "team")
    expect(await readAs(IDS.staffUser, "S_MIXED")).toBe(true)
    expect(await readAs(COLLEAGUE, "S_MIXED")).toBe(true)
    expect(await readAs(STRANGER, "S_MIXED")).toBe(true)
  })
})

/** A source's chunk and term, so the denormalised copies have somewhere to
 * land — one of each is enough, since `teamVisibleRecomputeSql` writes by
 * `source_id`/`chunk_id` and never reads the text. */
function seedChunkAndTerm(sourceId: string, chunkId: string): void {
  db().exec(
    `INSERT INTO knowledge_chunks (id, source_id, compartment, owner_user_id, team_visible, seq, text, created_at)
       VALUES ('${chunkId}', '${sourceId}', 'agency', NULL, 0, 0, 'x', '2026-01-01');
     INSERT INTO knowledge_terms (term, chunk_id, compartment, owner_user_id, team_visible, weight)
       VALUES ('x', '${chunkId}', 'agency', NULL, 0, 1);`
  )
}

function readTeamVisible(table: "knowledge_sources" | "knowledge_chunks" | "knowledge_terms", where: string): number[] {
  return (db().prepare(`SELECT team_visible v FROM ${table} WHERE ${where}`).all() as { v: number }[]).map(
    (r) => r.v
  )
}

function readOwner(
  table: "knowledge_sources" | "knowledge_chunks" | "knowledge_terms",
  where: string
): (string | null)[] {
  return (db().prepare(`SELECT owner_user_id v FROM ${table} WHERE ${where}`).all() as { v: string | null }[]).map(
    (r) => r.v
  )
}

describe("teamVisibleRecomputeSql — the write side, exercised for real", () => {
  it("sets team_visible on the source AND denormalises it to the chunk and the term, in one script", async () => {
    seedSource("S_RC", null, 0)
    seedChunkAndTerm("S_RC", "C_RC")
    seedSighting("S_RC", COLLEAGUE, "team")
    db().exec(teamVisibleRecomputeSql("S_RC"))
    expect(readTeamVisible("knowledge_sources", "id = 'S_RC'")).toEqual([1])
    expect(readTeamVisible("knowledge_chunks", "source_id = 'S_RC'")).toEqual([1])
    expect(readTeamVisible("knowledge_terms", "chunk_id = 'C_RC'")).toEqual([1])
    // team_visible=1 means owner_user_id is not the deciding fact for this
    // source any more — the recompute leaves it NULL, never the team sighter's
    // own id, which would be a stale narrow value nobody asked it to keep.
    expect(readOwner("knowledge_sources", "id = 'S_RC'")).toEqual([null])
  })

  it("flips back to 0 the moment the only team sighting retires — the leaking direction", async () => {
    seedSource("S_RC2", null, 1)
    seedChunkAndTerm("S_RC2", "C_RC2")
    seedSighting("S_RC2", COLLEAGUE, "team")
    db().exec(teamVisibleRecomputeSql("S_RC2"))
    expect(readTeamVisible("knowledge_sources", "id = 'S_RC2'")).toEqual([1])
    db().exec(
      `UPDATE knowledge_sightings SET gone_at = '2026-02-01T00:00:00.000Z' WHERE source_id = 'S_RC2';`
    )
    db().exec(teamVisibleRecomputeSql("S_RC2"))
    expect(readTeamVisible("knowledge_sources", "id = 'S_RC2'")).toEqual([0])
    expect(readTeamVisible("knowledge_chunks", "source_id = 'S_RC2'")).toEqual([0])
    expect(readTeamVisible("knowledge_terms", "chunk_id = 'C_RC2'")).toEqual([0])
  })

  it("stays 0 for a source whose sightings are all private", async () => {
    seedSource("S_RC3", null, 0)
    seedChunkAndTerm("S_RC3", "C_RC3")
    seedSighting("S_RC3", IDS.staffUser, "private")
    seedSighting("S_RC3", COLLEAGUE, "private")
    db().exec(teamVisibleRecomputeSql("S_RC3"))
    expect(readTeamVisible("knowledge_sources", "id = 'S_RC3'")).toEqual([0])
    expect(readTeamVisible("knowledge_chunks", "source_id = 'S_RC3'")).toEqual([0])
  })

  it("gives owner_user_id to the single private sighter, denormalised to chunk and term too", async () => {
    seedSource("S_RC4", null, 0)
    seedChunkAndTerm("S_RC4", "C_RC4")
    seedSighting("S_RC4", COLLEAGUE, "private")
    db().exec(teamVisibleRecomputeSql("S_RC4"))
    expect(readOwner("knowledge_sources", "id = 'S_RC4'")).toEqual([COLLEAGUE])
    expect(readOwner("knowledge_chunks", "source_id = 'S_RC4'")).toEqual([COLLEAGUE])
    expect(readOwner("knowledge_terms", "chunk_id = 'C_RC4'")).toEqual([COLLEAGUE])
  })

  it("clears owner_user_id to NULL the instant a second private sighter appears — the calendar fold's own shape", async () => {
    seedSource("S_RC5", null, 0)
    seedChunkAndTerm("S_RC5", "C_RC5")
    seedSighting("S_RC5", COLLEAGUE, "private")
    db().exec(teamVisibleRecomputeSql("S_RC5"))
    expect(readOwner("knowledge_sources", "id = 'S_RC5'")).toEqual([COLLEAGUE])
    seedSighting("S_RC5", IDS.staffUser, "private")
    db().exec(teamVisibleRecomputeSql("S_RC5"))
    expect(
      readOwner("knowledge_sources", "id = 'S_RC5'"),
      "two private sighters and a stale single owner is exactly the locked-out-colleague bug"
    ).toEqual([null])
    expect(readOwner("knowledge_chunks", "source_id = 'S_RC5'")).toEqual([null])
    expect(readOwner("knowledge_terms", "chunk_id = 'C_RC5'")).toEqual([null])
  })

  it("returns to a single owner once retirement leaves exactly one live private sighting", async () => {
    seedSource("S_RC6", null, 0)
    seedChunkAndTerm("S_RC6", "C_RC6")
    seedSighting("S_RC6", COLLEAGUE, "private")
    seedSighting("S_RC6", IDS.staffUser, "private")
    db().exec(teamVisibleRecomputeSql("S_RC6"))
    expect(readOwner("knowledge_sources", "id = 'S_RC6'")).toEqual([null])
    db().exec(`UPDATE knowledge_sightings SET gone_at = '2026-02-01T00:00:00.000Z'
                WHERE source_id = 'S_RC6' AND seen_by_user_id = '${COLLEAGUE}';`)
    db().exec(teamVisibleRecomputeSql("S_RC6"))
    expect(readOwner("knowledge_sources", "id = 'S_RC6'")).toEqual([IDS.staffUser])
  })
})

/** The re-derivation this suite's rot-check reads back against — deliberately
 * a SEPARATE, independently-written expression rather than a re-run of
 * `teamVisibleRecomputeSql`, because a check that just calls the function
 * under test and asks whether it agrees with itself proves nothing (the
 * house rule: verify the instrument, not just the result). */
function freshTeamVisible(sourceId: string): number {
  const [row] = db()
    .prepare(
      `SELECT CASE WHEN EXISTS (
         SELECT 1 FROM knowledge_sightings
          WHERE source_id = ? AND gone_at IS NULL AND shelf = 'team'
       ) THEN 1 ELSE 0 END v`
    )
    .all(sourceId) as { v: number }[]
  return row.v
}

/** Every source that has ever had a sighting, stored vs. freshly derived. A
 * source with NONE is not this check's business — its team_visible answers
 * the "no sightings" case ownerClause's own branch 2 covers, not this one. */
function driftedSources(): { id: string; stored: number; fresh: number }[] {
  const sighted = db()
    .prepare(
      `SELECT DISTINCT s.id, s.team_visible stored FROM knowledge_sources s
         JOIN knowledge_sightings sg ON sg.source_id = s.id`
    )
    .all() as { id: string; stored: number }[]
  return sighted
    .map((r) => ({ ...r, fresh: freshTeamVisible(r.id) }))
    .filter((r) => r.stored !== r.fresh)
}

describe("the corpus-wide rot-check — the hub's own merge condition", () => {
  // PROVING THE INSTRUMENT WORKS, NOT JUST THAT IT PASSES. A rot-check that is
  // only ever run against data the recompute already touched would read green
  // whether or not it can actually SEE drift — the same trap a test that calls
  // the function under test and compares it to itself falls into. So this
  // section deliberately CREATES the staleness `recomputeTeamVisible`'s own
  // doc comment names — a sighting written or changed WITHOUT the recompute
  // running in the same breath — and asserts the check catches it, before
  // proving the corpus is clean once the recompute actually runs.
  it("catches a source whose stored value has drifted from its sightings", async () => {
    seedSource("D1", null, 1) // WRONG on purpose: no team sighting exists yet
    seedSighting("D1", COLLEAGUE, "private")
    const drift = driftedSources()
    expect(drift.map((r) => r.id)).toEqual(["D1"])
    expect(drift[0]).toMatchObject({ stored: 1, fresh: 0 })
  })

  it("catches the LEAKING direction too — stored 0 while a live team sighting exists", async () => {
    seedSource("D2", null, 0)
    seedSighting("D2", COLLEAGUE, "team")
    const drift = driftedSources()
    expect(drift.map((r) => r.id)).toEqual(["D2"])
    expect(drift[0]).toMatchObject({ stored: 0, fresh: 1 })
  })

  it("clears once the recompute actually runs — the same case, made honest", async () => {
    seedSource("D3", null, 1)
    seedSighting("D3", COLLEAGUE, "private")
    expect(driftedSources().map((r) => r.id)).toEqual(["D3"])
    db().exec(teamVisibleRecomputeSql("D3"))
    expect(driftedSources()).toEqual([])
  })

  it("reports a clean corpus across every sighting shape, once every source has been recomputed", async () => {
    // Team-only, private-only-multi, mixed, and retired-down-to-private —
    // every shape this suite's other describe blocks exercise individually,
    // recomputed and then checked together. A source with NO sightings at
    // all (R5) is seeded to prove the check correctly ignores it rather than
    // finding a false drift on material this flag was never meant to model.
    seedSource("R1", null, 0)
    seedSighting("R1", COLLEAGUE, "team")
    seedSource("R2", null, 0)
    seedSighting("R2", COLLEAGUE, "private")
    seedSighting("R2", STRANGER, "private")
    seedSource("R3", null, 0)
    seedSighting("R3", COLLEAGUE, "private")
    seedSighting("R3", IDS.staffUser, "team")
    seedSource("R4", null, 0)
    seedSighting("R4", COLLEAGUE, "team", "2026-02-01T00:00:00.000Z")
    seedSource("R5", IDS.staffUser, 0) // no sightings at all — not this check's business

    for (const id of ["R1", "R2", "R3", "R4"]) db().exec(teamVisibleRecomputeSql(id))

    expect(driftedSources()).toEqual([])
    expect(freshTeamVisible("R1")).toBe(1)
    expect(freshTeamVisible("R2")).toBe(0)
    expect(freshTeamVisible("R3")).toBe(1)
    expect(freshTeamVisible("R4")).toBe(0)
  })
})

// ── THE RECOMPUTE GUARD — proven against SYNTHETIC scripts, on purpose ──────
//
// Nothing writes a real knowledge_sightings row yet (the fold-writer is a
// separate, unbuilt pass), so there is no genuine call site to test this
// against. That is not a reason to leave it unproven — it is why the proof
// has to be synthetic: a script string built by hand, in the exact shapes a
// future writer might produce, checked against the guard the same way D1
// itself would see it. `execKnowledgeScript` inspects the RESOLVED STRING,
// never the source that built it, so a synthetic string is exactly as valid
// a test subject as a real caller's would be.

describe("execKnowledgeScript — the guard a doc comment could never be", () => {
  it("passes a script that never touches knowledge_sightings straight through", async () => {
    await expect(
      execKnowledgeScript({} as never, "db", "UPDATE knowledge_sources SET title = 'x' WHERE id = 'S1';")
    ).resolves.toBeUndefined()
  })

  it("refuses a sighting INSERT with no recompute at all", async () => {
    await expect(
      execKnowledgeScript(
        {} as never,
        "db",
        "INSERT INTO knowledge_sightings (id, source_id, seen_where, seen_by_user_id, shelf, seen_at, created_at) VALUES ('sg1','S1','x','U1','team','2026-01-01','2026-01-01');"
      )
    ).rejects.toMatchObject({ code: "sighting_not_recomputed" })
  })

  it("refuses an UPDATE that retires a sighting (gone_at) with no recompute", async () => {
    await expect(
      execKnowledgeScript({} as never, "db", "UPDATE knowledge_sightings SET gone_at = '2026-02-01' WHERE id = 'sg1';")
    ).rejects.toMatchObject({ code: "sighting_not_recomputed" })
  })

  it("refuses an UPDATE that moves a shelf (private<->team) with no recompute", async () => {
    await expect(
      execKnowledgeScript({} as never, "db", "UPDATE knowledge_sightings SET shelf = 'team' WHERE id = 'sg1';")
    ).rejects.toMatchObject({ code: "sighting_not_recomputed" })
  })

  it("lets an ORDINARY sighting write through untouched — no shelf, no gone_at", async () => {
    // seen_at is not one of the two columns that can make team_visible stale,
    // so this is not this guard's business.
    await expect(
      execKnowledgeScript({} as never, "db", "UPDATE knowledge_sightings SET seen_at = '2026-02-01' WHERE id = 'sg1';")
    ).resolves.toBeUndefined()
  })

  it("passes the write, correctly spliced, exactly as the header's worked example shows", async () => {
    seedSource("S1", null, 0)
    const script = `
      INSERT INTO knowledge_sightings (id, source_id, seen_where, seen_by_user_id, shelf, seen_at, created_at)
        VALUES ('sg1','S1','x','U1','team','2026-01-01','2026-01-01');
      ${teamVisibleRecomputeSql("S1")}
    `
    await expect(execKnowledgeScript({} as never, "db", script)).resolves.toBeUndefined()
  })

  it("REFUSES the recompute placed BEFORE the write — the self-inflicted staleness the header names", async () => {
    const script = `
      ${teamVisibleRecomputeSql("S1")}
      INSERT INTO knowledge_sightings (id, source_id, seen_where, seen_by_user_id, shelf, seen_at, created_at)
        VALUES ('sg1','S1','x','U1','team','2026-01-01','2026-01-01');
    `
    await expect(execKnowledgeScript({} as never, "db", script)).rejects.toMatchObject({
      code: "sighting_recompute_misordered",
    })
  })

  it("passes the array-join shape this file's OWN two d1ExecScript callers actually use", async () => {
    // The shape a static source census would have had to trace and could not:
    // statements pushed across a loop, joined at the end. The guard does not
    // care, because it reads the string AFTER the join.
    const statements: string[] = []
    statements.push("UPDATE knowledge_chunks SET compartment = 'agency' WHERE id = 'c1';")
    statements.push(
      "UPDATE knowledge_sightings SET shelf = 'private' WHERE id = 'sg1';"
    )
    statements.push(teamVisibleRecomputeSql("S1"))
    await expect(execKnowledgeScript({} as never, "db", statements.join("\n"))).resolves.toBeUndefined()
  })

  it("refuses the array-join shape too, when the recompute is missing", async () => {
    const statements = [
      "UPDATE knowledge_chunks SET compartment = 'agency' WHERE id = 'c1';",
      "UPDATE knowledge_sightings SET shelf = 'private' WHERE id = 'sg1';",
    ]
    await expect(execKnowledgeScript({} as never, "db", statements.join("\n"))).rejects.toMatchObject({
      code: "sighting_not_recomputed",
    })
  })

  it("recomputes for MULTIPLE sources correctly when both precede their own recompute", async () => {
    seedSource("S1", null, 0)
    seedSource("S2", null, 0)
    const script = [
      "INSERT INTO knowledge_sightings (id, source_id, seen_where, seen_by_user_id, shelf, seen_at, created_at) VALUES ('sg1','S1','x','U1','private','2026-01-01','2026-01-01');",
      teamVisibleRecomputeSql("S1"),
      "INSERT INTO knowledge_sightings (id, source_id, seen_where, seen_by_user_id, shelf, seen_at, created_at) VALUES ('sg2','S2','x','U2','team','2026-01-01','2026-01-01');",
      teamVisibleRecomputeSql("S2"),
    ].join("\n")
    await expect(execKnowledgeScript({} as never, "db", script)).resolves.toBeUndefined()
  })

  it("REFUSES two writes back to back with only the LAST one recomputed", async () => {
    // The case "a recompute exists somewhere after this write" cannot tell
    // apart from a correct script: two writes, then one recompute at the very
    // end, satisfies "some recompute follows write1" without write1's OWN
    // interval — the gap BEFORE write2 — ever holding one. Only checking each
    // write's own interval, not "anywhere onward", catches this.
    seedSource("S1", null, 0)
    seedSource("S2", null, 0)
    const script = [
      "INSERT INTO knowledge_sightings (id, source_id, seen_where, seen_by_user_id, shelf, seen_at, created_at) VALUES ('sg1','S1','x','U1','private','2026-01-01','2026-01-01');",
      "INSERT INTO knowledge_sightings (id, source_id, seen_where, seen_by_user_id, shelf, seen_at, created_at) VALUES ('sg2','S2','x','U2','team','2026-01-01','2026-01-01');",
      teamVisibleRecomputeSql("S2"),
    ].join("\n")
    await expect(execKnowledgeScript({} as never, "db", script)).rejects.toMatchObject({
      code: "sighting_recompute_misordered",
    })
  })
})
