// TRACKER `b-upload-dup`, 11 Sep 2026: "uploading the same file twice is
// refused with a link." MUST: the second upload says "already in the
// library since…" and points at the existing source, rather than silently
// filing a second copy.
//
// `uploadIdentity()` (knowledge-identity.ts) has existed, and been unit-tested
// in isolation, since the R68 identity rebuild — but nothing ever CALLED it.
// `createFileSource` inserted a `knowledge_sources` row with `origin_table`/
// `origin_row_id` both left NULL, so the one thing that could have deduped an
// upload was computed nowhere near the door that needed it. Confirmed by
// reading `createFileSource` (knowledge.ts) directly: no call to
// `uploadIdentity`, `contentHash`, or any existing-source lookup anywhere in
// its body, before this fix.
//
// PROVED AGAINST THE REAL ROUTE, the real SQLite schema (including the real
// `idx_knowledge_sources_origin` UNIQUE index), same harness as
// knowledge.test.ts — this is `POST /api/content/knowledge/upload` called
// twice, not a unit test of a helper in isolation.

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

beforeEach(() => {
  h.db = buildSpineDb()
  db().exec(
    `INSERT INTO role_permissions (id, role_id, module, can_read, can_create, can_edit, can_delete)
     VALUES ('${IDS.adminRole}_knowledge', '${IDS.adminRole}', 'knowledge', 1, 1, 1, 1);`
  )
})

describe("b-upload-dup: the second upload of the same file is refused, not duplicated", () => {
  it("uploads once cleanly", async () => {
    const res = await upload(IDS.staffUser, "contract.txt", "The full text of the Bergman contract.")
    expect(res.status, await res.text().catch(() => "")).toBe(200)
  })

  it("refuses an exact re-upload — same words, different file name — pointing at the existing source", async () => {
    const first = await upload(IDS.staffUser, "contract.txt", "The full text of the Bergman contract.")
    expect(first.status).toBe(200)
    const { source: original } = (await first.json()) as { source: { id: string; title: string } }

    const second = await upload(IDS.staffUser, "contract-copy.txt", "The full text of the Bergman contract.")
    expect(second.status, "a duplicate upload must be refused, not silently filed as a second copy").toBe(409)
    // shared/workers/http.ts `fail()` — the flat ApiError shape: { error: code, message }.
    const body = (await second.json()) as { error?: string; message?: string }
    expect(body.message ?? "").toMatch(/already in the library/i)
    // Points at the existing source, not merely a generic refusal.
    expect(body.message ?? "").toContain(original.title)

    const rows = db()
      .prepare("SELECT COUNT(*) n FROM knowledge_sources WHERE kind = 'file'")
      .get() as { n: number }
    expect(rows.n, "still exactly one row — no silent second copy").toBe(1)
  })

  it("a genuinely different file uploads normally, uncontested", async () => {
    const first = await upload(IDS.staffUser, "a.txt", "Alpha document text.")
    expect(first.status).toBe(200)
    const second = await upload(IDS.staffUser, "b.txt", "Completely different beta document text.")
    expect(second.status).toBe(200)
    const rows = db()
      .prepare("SELECT COUNT(*) n FROM knowledge_sources WHERE kind = 'file'")
      .get() as { n: number }
    expect(rows.n).toBe(2)
  })
})
