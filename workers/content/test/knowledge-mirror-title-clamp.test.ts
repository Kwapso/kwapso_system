// R87 I1 (RULES.md), amended 21 Sep 2026, her pick verbatim: "clmap on
// import." The sweep (INGEST_KINDS, knowledge-ingest.ts) mirrors the app's
// own rows into knowledge_sources through ONE upsert, so a title too long to
// have ever been TYPED into the account's or the ticket's own form (a
// legacy row from before TITLE_MAX_CHARS existed, or a field R87 never
// capped at all: a process's own name is deliberately NOT a title-shaped
// field) could still reach the knowledge base's title column whole. The
// 21 Sep ruling narrows what stays whole: an imported KNOWLEDGE title now
// clamps through `clampTitle` (shared/clamp-title.ts) at every kind's own
// `read()` except two, `ticket` and `story` keep their own title AS IS,
// because I1's original protection is still theirs by name.
//
// Same harness as knowledge-import-title.test.ts and knowledge-coverage.test.ts:
// the real route handlers, the real SQLite team schema (spine-harness), only
// the D1 REST transport and the embedding model stubbed.

import type { DatabaseSync } from "node:sqlite"
import { beforeEach, describe, expect, it, vi } from "vitest"

const h = vi.hoisted(() => ({ db: null as DatabaseSync | null }))

vi.mock("@shared/workers/d1-rest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/d1-rest")>()
  const { d1Impl } = await import("../../tenancy/test/d1-sqlite")
  return { ...actual, ...d1Impl(() => h.db as DatabaseSync) }
})

import worker from "../src/index"
import { buildSpineDb, IDS, makeEnv } from "../../tenancy/test/spine-harness"
import { clampTitle } from "@shared/clamp-title"
import { TITLE_MAX_CHARS } from "@shared/types"

const db = () => h.db as DatabaseSync

function env(userId: string) {
  const base = makeEnv(() => db(), userId) as unknown as Record<string, unknown>
  return {
    ...base,
    INTERNAL_KEY: "k",
    AI: { run: async () => ({ data: [[1, 0, 0]] }) },
    REALTIME: { fetch: async () => new Response("{}") },
  } as never
}

function call(userId: string, path: string) {
  return worker.fetch(
    new Request(`https://content${path}`, {
      method: "POST",
      headers: { Cookie: "session=x", "Content-Type": "application/json" },
      body: "{}",
    }),
    env(userId) as never
  )
}

/** Runs the sweep door until every kind reports caught up, the same loop
 * knowledge-coverage.test.ts's own sweepUntilCaughtUp runs against the same
 * door, kept local here so this suite has no dependency on that file. */
async function sweepUntilCaughtUp(max = 40): Promise<void> {
  for (let tick = 1; tick <= max; tick++) {
    const res = await call(IDS.staffUser, "/api/content/knowledge/sync")
    expect(res.status).toBe(200)
    if (((await res.json()) as { caughtUp: boolean }).caughtUp) return
  }
  throw new Error(`the sweep never caught up in ${max} ticks`)
}

function titleFor(table: string, rowId: string): string {
  const row = db()
    .prepare("SELECT title FROM knowledge_sources WHERE origin_table = ? AND origin_row_id = ?")
    .get(table, rowId) as { title: string } | undefined
  expect(row, `nothing was mirrored from ${table}/${rowId}`).toBeTruthy()
  return (row as { title: string }).title
}

beforeEach(() => {
  h.db = buildSpineDb()
  db().exec(
    `INSERT INTO role_permissions (id, role_id, module, can_read, can_create, can_update, can_delete)
     VALUES ('${IDS.adminRole}_knowledge', '${IDS.adminRole}', 'knowledge', 1, 1, 1, 1);`
  )
})

describe("R87 I1 (amended 21 Sep 2026): the mirror clamps an imported knowledge title, except a ticket's or a story's own", () => {
  it("clamps an account's own name when it is longer than TITLE_MAX_CHARS", async () => {
    const longName = `Bergman Shipping and Logistics Family Holding Group ${"S.A.".repeat(3)}`
    expect(longName.length).toBeGreaterThan(TITLE_MAX_CHARS)
    db().exec(`UPDATE accounts SET name = '${longName.replace(/'/g, "''")}' WHERE id = '${IDS.victimAccount}'`)

    await sweepUntilCaughtUp()
    const title = titleFor("accounts", IDS.victimAccount)

    expect(title).toBe(clampTitle(longName))
    expect(title.length).toBeLessThanOrEqual(TITLE_MAX_CHARS)
    expect(title.endsWith("…")).toBe(true)
    expect(title).not.toBe(longName)
  })

  it("clamps a process's own name, a field R87's form cap never covers at all", async () => {
    const longName = `How Bergman approves and reconciles a supplier invoice against the delivery note`
    expect(longName.length).toBeGreaterThan(TITLE_MAX_CHARS)
    db().exec(`UPDATE processes SET name = '${longName.replace(/'/g, "''")}' WHERE id = '${IDS.victimProcess}'`)

    await sweepUntilCaughtUp()
    const title = titleFor("processes", IDS.victimProcess)

    expect(title).toBe(clampTitle(longName))
    expect(title.length).toBeLessThanOrEqual(TITLE_MAX_CHARS)
  })

  it("keeps a ticket's own title WHOLE, I1's own exemption, unmoved by the 21 Sep narrowing", async () => {
    const longTitle = "The Bergman dispatch board keeps logging every driver out after exactly one hour"
    expect(longTitle.length).toBeGreaterThan(TITLE_MAX_CHARS)
    db().exec(`UPDATE help SET title_en = '${longTitle.replace(/'/g, "''")}' WHERE id = '${IDS.victimTicket}'`)

    await sweepUntilCaughtUp()
    const title = titleFor("help", IDS.victimTicket)

    expect(title).toBe(longTitle)
    expect(title.length).toBeGreaterThan(TITLE_MAX_CHARS)
  })

  it("keeps a story's own title WHOLE too", async () => {
    const longTitle = "Show the whole March invoice run history on the Bergman dispatch board, not just today"
    expect(longTitle.length).toBeGreaterThan(TITLE_MAX_CHARS)
    db().exec(
      `INSERT INTO stories (id, ref, account_id, app_id, ticket_id, title, detail, status, story_type, created_at, creator_id)
       VALUES ('STO_LONG', 'BERG-W9', '${IDS.victimAccount}', '${IDS.victimApp}', '${IDS.victimTicket}',
         '${longTitle.replace(/'/g, "''")}', 'A real one, for the sweep to mirror.', 'open', 'Feature',
         '2026-03-05', '${IDS.staffUser}');`
    )

    await sweepUntilCaughtUp()
    const title = titleFor("stories", "STO_LONG")

    expect(title).toBe(longTitle)
    expect(title.length).toBeGreaterThan(TITLE_MAX_CHARS)
  })
})
