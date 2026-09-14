// shared_with (0073's tenth Vectorize label) on the FILE half of path 1 —
// createFileSource. The typed-note half (createSource) is mutation-proved in
// knowledge.test.ts; this is the identical one-line pattern's file-upload
// twin, proved against the real route rather than assumed identical because
// it reads the same. The owner's ruling, 12 Sep 2026: "keep it for
// everything." NOTHING READS THIS AS A FENCE (readerClause is ownerClause
// AND appClause, full stop — see IngestRow.sharedWith's own header).
//
// Same harness as knowledge-upload-dedup.test.ts, POST
// /api/content/knowledge/upload called for real.

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

const db = () => h.db as DatabaseSync

function env(userId: string) {
  const base = makeEnv(() => db(), userId) as unknown as Record<string, unknown>
  return {
    ...base,
    INTERNAL_KEY: "k",
    INTERNAL_MEDIA: { put: async () => {} },
    AI: { run: async () => ({ data: [[1, 0, 0]] }) },
    REALTIME: { fetch: async () => new Response("{}") },
  } as never
}

function upload(userId: string, fileName: string, text: string, extra: Record<string, unknown> = {}) {
  const dataUrl = `data:text/plain;base64,${Buffer.from(text, "utf8").toString("base64")}`
  return worker.fetch(
    new Request("https://content/api/content/knowledge/upload", {
      method: "POST",
      headers: { Cookie: "session=x", "Content-Type": "application/json" },
      body: JSON.stringify({ fileName, fileDataUrl: dataUrl, ...extra }),
    }),
    env(userId) as never
  )
}

const rowSharedWith = (fileName: string) =>
  (
    db().prepare("SELECT shared_with AS s FROM knowledge_sources WHERE file_name = ?").get(fileName) as {
      s: string
    }
  ).s

beforeEach(() => {
  h.db = buildSpineDb()
  db().exec(
    `INSERT INTO role_permissions (id, role_id, module, can_read, can_create, can_edit, can_delete)
     VALUES ('${IDS.adminRole}_knowledge', '${IDS.adminRole}', 'knowledge', 1, 1, 1, 1);`
  )
})

describe("shared_with on an uploaded file — createFileSource", () => {
  it("a file marked private writes 'private' — the same boolean that sets owner_user_id", async () => {
    const res = await upload(IDS.staffUser, "notes.txt", "Just for me for now.", { visibility: "private" })
    expect(res.status, await res.text()).toBe(200)
    expect(rowSharedWith("notes.txt")).toBe("private")
  })

  it("an ordinary file (no visibility sent) writes 'agency'", async () => {
    const res = await upload(IDS.staffUser, "shared.txt", "Everyone on the module can read this.")
    expect(res.status, await res.text()).toBe(200)
    expect(rowSharedWith("shared.txt")).toBe("agency")
  })
})
