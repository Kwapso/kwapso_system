// R87 AMENDMENT (I1), 18 Sep 2026, her pick verbatim: "l1." The fifty-character
// title cap (`TITLE_MAX_CHARS`, shared/types.ts) binds what a person TYPES —
// it does not bind a title that arrives already written somewhere else. A
// knowledge upload with no typed `title` falls back to the file's own
// `fileName`, and `fileName` is validated against `TEXT_LIMITS.short` (200),
// never against `TITLE_MAX_CHARS` — so it was ALREADY kept whole before this
// ruling; this suite pins that shape down as the rule rather than leaving it
// an accident of the fallback's own order (documents/UI-RULEBOOK.md F18's own
// 18 Sep 2026 amendment, RULES.md's R87 row).
//
// TWO DOORS, ONE LAW: `POST /api/content/knowledge/upload` (a file, `title`
// optional, imported) must accept a name past the cap and store it whole;
// `POST /api/content/knowledge` (a typed note, `title` required) must still
// refuse a person-typed title past the same cap. Same harness as
// knowledge-upload-dedup.test.ts and knowledge.test.ts: the real route
// handlers, the real SQLite team schema, only the D1 REST transport and the
// embedding model stubbed.

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
import { TITLE_MAX_CHARS } from "@shared/types"

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

function call(userId: string, path: string, body: unknown) {
  return worker.fetch(
    new Request(`https://content${path}`, {
      method: "POST",
      headers: { Cookie: "session=x", "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    env(userId) as never
  )
}

function upload(userId: string, fileName: string, extra: Record<string, unknown> = {}) {
  const dataUrl = `data:text/plain;base64,${Buffer.from("the file's own words", "utf8").toString("base64")}`
  return call(userId, "/api/content/knowledge/upload", { fileName, fileDataUrl: dataUrl, ...extra })
}

beforeEach(() => {
  h.db = buildSpineDb()
  db().exec(
    `INSERT INTO role_permissions (id, role_id, module, can_read, can_create, can_update, can_delete)
     VALUES ('${IDS.adminRole}_knowledge', '${IDS.adminRole}', 'knowledge', 1, 1, 1, 1);`
  )
})

describe("R87 amendment (I1): an imported title is kept whole, a typed one is still capped", () => {
  it("a 90-character file name, no typed title, uploads clean and stores the whole name as the title", async () => {
    const fileName = `${"B".repeat(86)}.pdf` // 90 characters, well past TITLE_MAX_CHARS (50)
    expect(fileName.length).toBe(90)
    expect(fileName.length).toBeGreaterThan(TITLE_MAX_CHARS)

    const res = await upload(IDS.staffUser, fileName)
    const bodyText = await res.clone().text()
    expect(res.status, bodyText).toBe(200)
    const { source } = (await res.json()) as { source: { title: string } }
    expect(source.title).toBe(fileName)
    expect(source.title.length).toBe(90)
  })

  it("a 60-character TYPED title on the note door is still refused at 400", async () => {
    const title = "A".repeat(60) // 60 characters, over TITLE_MAX_CHARS (50)
    expect(title.length).toBe(60)
    expect(title.length).toBeGreaterThan(TITLE_MAX_CHARS)

    const res = await call(IDS.staffUser, "/api/content/knowledge", {
      title,
      body: "Some real material for the source to carry.",
    })
    expect(res.status).toBe(400)
    const { message } = (await res.json()) as { message: string }
    expect(message).toMatch(/too long/i)

    // Nothing was written — a refused create leaves no row behind.
    expect((db().prepare("SELECT COUNT(*) n FROM knowledge_sources").get() as { n: number }).n).toBe(0)
  })
})
