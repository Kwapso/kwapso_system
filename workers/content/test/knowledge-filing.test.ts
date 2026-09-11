// FILING vs FENCING (BUILD-5 §1) — accounts[]/apps[]/shared_with exist on
// knowledge_sources and no door writes any of them yet. The hub's ruling, in
// three parts:
//
//   PART 1 — shared_with fences nothing (no read function consults it) and
//   stays unwired here; what it should fence is a paragraph handed to the
//   owner, not code.
//
//   PART 2 — a REAL BUG in updateSource: for a MIRRORED Google source, the
//   "private to me" edit writes owner_user_id, and the very next sweep
//   clobbers it right back (the generic engine's unconditional
//   `owner_user_id = excluded.owner_user_id`, knowledge-ingest.ts:2107). The
//   fix is a deletion — stop writing owner_user_id on the mirrored branch at
//   all, since nothing that branch writes there survives the next tick
//   anyway. File-backed and note sources have no sweep touching them, so the
//   write stays real there.
//
//   PART 3 — accounts[]/apps[] ARE filing (verified: appClause fences only on
//   the singular visible_to_app_id scalar, never the plural array) and get
//   wired for real.
//
// THIS FILE PROVES PART 2 THROUGH THE REAL DOOR. A unit test on the SQL
// string could show the statement no longer names the column; it could not
// show that a caller who submits "only me" against a mirrored source gets a
// response that does not lie about what happened, which is the actual bug —
// so every case here calls POST /api/content/knowledge/update and reads the
// row back out of the database afterward.

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

const db = () => holder.db as DatabaseSync
let vectorIndex = fakeVectorize()

function env(userId: string) {
  const base = makeEnv(() => db(), userId) as unknown as Record<string, unknown>
  return {
    ...base,
    INTERNAL_KEY: "k",
    KNOWLEDGE_INDEX: vectorIndex.binding,
    KNOWLEDGE_MIN_SCORE: "0.35",
    AI: { run: async (_model: string, input: { text: string[] }) => ({ data: input.text.map(() => [1]) }) },
    REALTIME: { fetch: async () => new Response("{}") },
  } as never
}

async function updateSourceDoor(
  userId: string,
  id: string,
  body: Record<string, unknown>
): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await worker.fetch(
    new Request("https://content/api/content/knowledge/update", {
      method: "POST",
      headers: { Cookie: "session=x", "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    }),
    env(userId)
  )
  return { status: res.status, body: (await res.json()) as Record<string, unknown> }
}

function ownerOf(id: string): string | null {
  const row = db().prepare("SELECT owner_user_id FROM knowledge_sources WHERE id = ?").get(id) as {
    owner_user_id: string | null
  }
  return row.owner_user_id
}

/** A source the sweep keeps in step — origin_table/origin_row_id set, exactly
 * what updateSource's own `mirrored = before.originRowId !== null` reads. */
function seedMirroredSource(id: string): void {
  db().exec(
    `INSERT INTO knowledge_sources (id, kind, origin_table, origin_row_id, compartment, title, summary, body,
       body_bytes, owner_user_id, team_visible, created_at, creator_name)
     VALUES ('${id}', 'email', 'google_gmail', 'thread-${id}', 'agency', 'A mirrored source',
       'A mirrored source', 'body', 4, NULL, 1, '2026-01-01', 'kwapso');`
  )
}

/** A typed note — no sweep ever touches this row, so the write stays real. */
function seedNoteSource(id: string): void {
  db().exec(
    `INSERT INTO knowledge_sources (id, kind, compartment, title, summary, body, body_bytes, owner_user_id,
       team_visible, created_at, creator_name)
     VALUES ('${id}', 'note', 'agency', 'A typed note', 'A typed note', 'body', 4, NULL, 1, '2026-01-01', 'kwapso');`
  )
}

const APP = "APP_FILING"

function ownerRow(id: string): { accounts: string; apps: string } {
  return db().prepare("SELECT accounts, apps FROM knowledge_sources WHERE id = ?").get(id) as {
    accounts: string
    apps: string
  }
}

beforeEach(() => {
  holder.db = buildSpineDb()
  vectorIndex = fakeVectorize()
  db().exec(
    `INSERT INTO role_permissions (id, role_id, module, can_read, can_create, can_edit, can_delete)
       VALUES ('${IDS.adminRole}_knowledge', '${IDS.adminRole}', 'knowledge', 1, 1, 1, 1);
     INSERT INTO apps (id, name, created_at) VALUES ('${APP}', 'Dispatch', '2026-01-01');
     -- appClause admits either the app's own staff or the locked default role,
     -- and this harness's adminRole is NOT is_default=1 (spine-harness.ts's
     -- grantAll always writes 0), so the staff user needs a real app_staff row
     -- to open ${APP} at all — same requirement 8.11 puts on anyone else.
     INSERT INTO app_staff (id, app_id, user_id, created_at) VALUES ('AS1', '${APP}', '${IDS.staffUser}', '2026-01-01');`
  )
})

describe("PART 2 — a mirrored source's owner_user_id is never written by this door", () => {
  it("a private-to-me edit on a MIRRORED source leaves owner_user_id untouched", async () => {
    seedMirroredSource("KS_MIRROR")
    expect(ownerOf("KS_MIRROR")).toBeNull()

    const { status } = await updateSourceDoor(IDS.staffUser, "KS_MIRROR", {
      title: "A mirrored source",
      visibility: "private",
    })

    expect(status).toBe(200)
    // THE ACTUAL BUG THIS FILE EXISTS FOR: the old code wrote owner_user_id =
    // guard.userId here, and the caller's screen said "only me" for exactly
    // one sweep tick before the generic engine's unconditional upsert put it
    // back. Writing nothing is honest; writing something the next sweep
    // erases is not.
    expect(ownerOf("KS_MIRROR")).toBeNull()
  })

  it("a NOTE — no sweep ever touches it — still writes owner_user_id for real", async () => {
    seedNoteSource("KS_NOTE")
    expect(ownerOf("KS_NOTE")).toBeNull()

    const { status } = await updateSourceDoor(IDS.staffUser, "KS_NOTE", {
      title: "A typed note",
      visibility: "private",
    })

    expect(status).toBe(200)
    expect(ownerOf("KS_NOTE")).toBe(IDS.staffUser)
  })
})

describe("PART 3 — accounts[]/apps[] are wired (filing, not fencing — verified before this was built)", () => {
  it("writes accounts[]/apps[] on a NOTE through the update door", async () => {
    seedNoteSource("KS_FILE")
    expect(ownerRow("KS_FILE")).toEqual({ accounts: "[]", apps: "[]" })

    const { status } = await updateSourceDoor(IDS.staffUser, "KS_FILE", {
      title: "A typed note",
      accounts: [IDS.victimAccount],
      apps: [APP],
    })

    expect(status).toBe(200)
    const row = ownerRow("KS_FILE")
    expect(JSON.parse(row.accounts)).toEqual([IDS.victimAccount])
    expect(JSON.parse(row.apps)).toEqual([APP])
  })

  it("writes accounts[]/apps[] on a MIRRORED source too — filing stays editable when the words don't", async () => {
    seedMirroredSource("KS_FILE_MIRROR")

    const { status } = await updateSourceDoor(IDS.staffUser, "KS_FILE_MIRROR", {
      title: "A mirrored source",
      accounts: [IDS.victimAccount],
      apps: [APP],
    })

    expect(status).toBe(200)
    const row = ownerRow("KS_FILE_MIRROR")
    expect(JSON.parse(row.accounts)).toEqual([IDS.victimAccount])
    expect(JSON.parse(row.apps)).toEqual([APP])
  })

  it("refuses an account id this caller cannot reach, rather than file it silently", async () => {
    seedNoteSource("KS_FILE_BAD")

    const { status } = await updateSourceDoor(IDS.staffUser, "KS_FILE_BAD", {
      title: "A typed note",
      accounts: ["A_DOES_NOT_EXIST"],
    })

    expect(status).toBe(404)
    expect(ownerRow("KS_FILE_BAD")).toEqual({ accounts: "[]", apps: "[]" })
  })

  it("also writes accounts[]/apps[] through the CREATE door, not just edit", async () => {
    const res = await worker.fetch(
      new Request("https://content/api/content/knowledge", {
        method: "POST",
        headers: { Cookie: "session=x", "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "A new note",
          body: "Some material",
          accounts: [IDS.victimAccount],
          apps: [APP],
        }),
      }),
      env(IDS.staffUser)
    )
    expect(res.status).toBe(200)
    const { source } = (await res.json()) as { source: { id: string } }
    const row = ownerRow(source.id)
    expect(JSON.parse(row.accounts)).toEqual([IDS.victimAccount])
    expect(JSON.parse(row.apps)).toEqual([APP])
  })
})
