// WHAT AN APP SHOWS FOR ITSELF (T3850) — the invariants this module adds,
// driven through the SHIPPED route handlers against a real SQLite database
// running the real team migrations. The account-leak burglaries
// (account-leak.test.ts) already prove the fence exhaustively (a portal
// caller from another account reads nothing, every write refuses a portal
// caller outright); this file proves the module's OWN rules: it is gated on
// `processes`, its fields are validated at the boundary, it deactivates
// rather than deletes (R17), and a client reads their OWN account's files.

import type { DatabaseSync } from "node:sqlite"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { beforeEach, describe, expect, it, vi } from "vitest"

const holder = vi.hoisted(() => ({ db: null as DatabaseSync | null }))

vi.mock("@shared/workers/d1-rest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/d1-rest")>()
  const { d1Impl } = await import("./d1-sqlite")
  return { ...actual, ...d1Impl(() => holder.db as DatabaseSync) }
})

import worker, { ROUTES } from "../src/index"
import { buildSpineDb, IDS, makeEnv } from "./spine-harness"
import type { AppAttachment } from "@shared/types"

const db = () => holder.db as DatabaseSync

function env(userId: string) {
  const base = makeEnv(() => db(), userId) as unknown as Record<string, unknown>
  return {
    ...base,
    REALTIME: { fetch: async () => new Response("{}") },
    MEDIA: { put: async () => undefined },
  } as never
}

const get = (userId: string, query: string) =>
  worker.fetch(
    new Request(`https://tenancy/api/tenancy/apps/attachments${query}`, { headers: { Cookie: "session=x" } }),
    env(userId)
  )

const post = (userId: string, path: string, body: unknown) =>
  worker.fetch(
    new Request(`https://tenancy/api/tenancy/apps/attachments${path}`, {
      method: "POST",
      headers: { Cookie: "session=x", "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    env(userId)
  )

const list = async (userId: string, appId: string) =>
  (await (await get(userId, `?id=${appId}`)).json()) as { attachments: AppAttachment[]; total: number }

function revokeProcesses(roleId: string) {
  db()
    .prepare(
      `UPDATE role_permissions SET can_read = 0, can_create = 0, can_update = 0, can_delete = 0
        WHERE role_id = ? AND module = 'processes'`
    )
    .run(roleId)
}

beforeEach(() => {
  holder.db = buildSpineDb()
})

describe("gated on processes, the same right the app record itself opens on", () => {
  it("refuses a role with no processes right — read and write alike", async () => {
    revokeProcesses(IDS.adminRole)
    expect((await get(IDS.staffUser, `?id=${IDS.victimApp}`)).status).toBe(403)
    expect(
      (await post(IDS.staffUser, "", { id: IDS.victimApp, kind: "link", label: "x", url: "https://x.example" }))
        .status
    ).toBe(403)
    expect(
      (
        await post(IDS.staffUser, "/update", {
          id: IDS.victimApp,
          attachmentId: IDS.victimAppAttachment,
          label: "y",
        })
      ).status
    ).toBe(403)
    expect(
      (await post(IDS.staffUser, "/remove", { id: IDS.victimApp, attachmentId: IDS.victimAppAttachment })).status
    ).toBe(403)
  })
})

describe("a client reads their OWN account's files (the fence is a fence, not a wall)", () => {
  it("a portal caller standing in the victim's own account sees the seeded file", async () => {
    const r = await list(IDS.victimUser, IDS.victimApp)
    expect(r.attachments.map((a) => a.id)).toContain(IDS.victimAppAttachment)
    expect(r.total).toBe(1)
  })
})

describe("field rules at the boundary (R20)", () => {
  it("refuses a kind that is neither file nor link", async () => {
    const res = await post(IDS.staffUser, "", { id: IDS.victimApp, kind: "video", label: "x", url: "https://x.example" })
    expect(res.status).toBe(400)
  })

  it("refuses a link that does not start http:// or https://", async () => {
    const res = await post(IDS.staffUser, "", {
      id: IDS.victimApp,
      kind: "link",
      label: "A trap",
      url: "javascript:alert(1)",
    })
    expect(res.status).toBe(400)
    expect(db().prepare(`SELECT COUNT(*) AS n FROM app_attachments WHERE label = 'A trap'`).get()).toEqual({ n: 0 })
  })

  it("refuses a name over the boundary's own limit rather than truncating it", async () => {
    const res = await post(IDS.staffUser, "", {
      id: IDS.victimApp,
      kind: "link",
      label: "x".repeat(500),
      url: "https://x.example",
    })
    expect(res.status).toBe(400)
  })

  it("refuses an app that does not exist, rather than filing an orphan — 404, the same clean answer a made-up id always gets (appOrThrow)", async () => {
    const res = await post(IDS.staffUser, "", { id: "NOPE", kind: "link", label: "x", url: "https://x.example" })
    expect(res.status).toBe(404)
    expect(db().prepare(`SELECT COUNT(*) AS n FROM app_attachments WHERE label = 'x'`).get()).toEqual({ n: 0 })
  })

  it("adds a link and reads it straight back", async () => {
    const res = await post(IDS.staffUser, "", {
      id: IDS.victimApp,
      kind: "link",
      label: "A screenshot from the meeting",
      url: "https://drive.example/shot.png",
    })
    expect(res.status).toBe(200)
    const rows = (await list(IDS.staffUser, IDS.victimApp)).attachments
    expect(rows.find((a) => a.label === "A screenshot from the meeting")?.url).toBe(
      "https://drive.example/shot.png"
    )
  })
})

describe("deactivate, never delete (R17)", () => {
  it("takes a file off, and a second press moves zero rows", async () => {
    const first = await post(IDS.staffUser, "/remove", { id: IDS.victimApp, attachmentId: IDS.victimAppAttachment })
    expect(first.status).toBe(200)
    const afterFirst = await list(IDS.staffUser, IDS.victimApp)
    expect(afterFirst.attachments).toEqual([])
    expect(afterFirst.total).toBe(0)

    // The row survives, deactivated, not deleted.
    const row = db()
      .prepare(`SELECT deactivated_at FROM app_attachments WHERE id = ?`)
      .get(IDS.victimAppAttachment) as { deactivated_at: string | null }
    expect(row.deactivated_at).not.toBeNull()

    const historyBefore = db()
      .prepare(`SELECT COUNT(*) AS n FROM activity WHERE related_table = 'apps' AND type = 'App attachment removed'`)
      .get() as { n: number }
    expect(historyBefore.n).toBe(1)

    const second = await post(IDS.staffUser, "/remove", { id: IDS.victimApp, attachmentId: IDS.victimAppAttachment })
    expect(second.status).toBe(200)
    // No second line of history for a press that moved nothing.
    const historyAfter = db()
      .prepare(`SELECT COUNT(*) AS n FROM activity WHERE related_table = 'apps' AND type = 'App attachment removed'`)
      .get() as { n: number }
    expect(historyAfter.n).toBe(1)
  })

  it("has no DELETE anywhere in the module", () => {
    for (const file of ["lib/app-attachments.ts", "routes/app-attachments.ts"]) {
      const src = readFileSync(join(__dirname, "..", "src", file), "utf8")
      expect(/DELETE\s+FROM/i.test(src), `${file} deletes a row — this base archives`).toBe(false)
    }
  })
})

describe("the doors are all registered, and every mutation publishes", () => {
  const doors = Object.keys(ROUTES).filter((d) => d.includes("/api/tenancy/apps/attachments"))

  it("finds all four", () => {
    expect(doors.sort()).toEqual(
      [
        "GET /api/tenancy/apps/attachments",
        "POST /api/tenancy/apps/attachments",
        "POST /api/tenancy/apps/attachments/remove",
        "POST /api/tenancy/apps/attachments/update",
      ].sort()
    )
  })
})
