// T3658/B0295 — A TICKET CANNOT BE CLOSED WITHOUT A SCREENSHOT. The client's
// own rule: `POST /api/content/help/resolve` refuses (400 `screenshot_required`)
// unless at least one of the `attachmentIds` it is handed is an IMAGE
// attachment that actually belongs to THIS ticket. R17 (the idempotent
// already-resolved no-op) is checked FIRST, before the screenshot rule is even
// asked — a second press of "resolve" is not a second question about whether a
// screenshot exists.

import type { DatabaseSync } from "node:sqlite"
import { withDeferred } from "./deferred"
import { beforeEach, describe, expect, it, vi } from "vitest"

const holder = vi.hoisted(() => ({ db: null as DatabaseSync | null }))

vi.mock("@shared/workers/d1-rest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/d1-rest")>()
  const { d1Impl } = await import("../../tenancy/test/d1-sqlite")
  return { ...actual, ...d1Impl(() => holder.db as DatabaseSync) }
})

vi.mock("@shared/workers/notify", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/notify")>()
  return { ...actual, sendBrandedEmail: async () => true }
})

import worker from "../src/index"
import { buildSpineDb, IDS, makeEnv, seedImageAttachment } from "../../tenancy/test/spine-harness"

const db = () => holder.db as DatabaseSync

function env(userId: string) {
  const base = makeEnv(() => db(), userId) as unknown as Record<string, unknown>
  return {
    ...base,
    INTERNAL_KEY: "k",
    PUBLIC_APP_URL: "https://kwapso.example",
    REALTIME: { fetch: async () => new Response("{}") },
  } as never
}

const call = (userId: string, route: string, body?: unknown, query = "") => {
  const [method, path] = route.split(" ")
  return withDeferred((ctx) =>
    worker.fetch(
      new Request(`https://content${path}${query}`, {
        method,
        headers: { Cookie: "session=x", "Content-Type": "application/json" },
        body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
      }),
      env(userId) as never,
      ctx as never
    )
  )
}

const ticketRow = (id: string) =>
  db().prepare(`SELECT * FROM help WHERE id = ?`).get(id) as Record<string, string | number | null>

async function newTicket(description: string): Promise<string> {
  const res = await call(IDS.staffUser, "POST /api/content/help", { description, accountId: IDS.victimAccount })
  const body = (await res.json()) as { id?: string; tickets?: { id: string }[] }
  const id = body.id ?? body.tickets?.[0]?.id
  if (!id) throw new Error(`raise failed ${res.status}`)
  return id
}

/** A NON-image attachment on `ticketId` — a PDF, say. Same table, same fence,
 * `content_type` the one thing that differs from `seedImageAttachment`. */
function seedNonImageAttachment(ticketId: string): string {
  const id = `att_${Math.random().toString(36).slice(2)}`
  db().exec(
    `INSERT INTO help_attachments (id, help_id, kind, label, url, content_type, size_bytes, created_at, creator_id, creator_email, creator_name)
     VALUES ('${id}', '${ticketId}', 'file', 'notes.pdf', '/media/test/notes.pdf', 'application/pdf', 2048, '2026-02-01T00:00:00.000Z', '${IDS.staffUser}', 'staff@kwapso.app', 'Staff');`
  )
  return id
}

beforeEach(() => {
  holder.db = buildSpineDb()
})

describe("resolve refuses without a screenshot (T3658/B0295)", () => {
  it("no attachmentIds at all — 400 screenshot_required", async () => {
    const id = await newTicket("Nothing attached")
    const res = await call(IDS.staffUser, "POST /api/content/help/resolve", { id, resolution: "Done." })
    expect(res.status).toBe(400)
    expect((await res.json()) as { error: string }).toMatchObject({ error: "screenshot_required" })
    expect(ticketRow(id).status).toBe("new")
  })

  it("attachmentIds present but every one an EMPTY array — 400 screenshot_required", async () => {
    const id = await newTicket("Empty list")
    const res = await call(IDS.staffUser, "POST /api/content/help/resolve", { id, resolution: "Done.", attachmentIds: [] })
    expect(res.status).toBe(400)
    expect((await res.json()) as { error: string }).toMatchObject({ error: "screenshot_required" })
  })

  it("a non-image attachment (a PDF) does not satisfy it — 400 screenshot_required", async () => {
    const id = await newTicket("Only a PDF attached")
    const attachmentId = seedNonImageAttachment(id)
    const res = await call(IDS.staffUser, "POST /api/content/help/resolve", {
      id,
      resolution: "Done.",
      attachmentIds: [attachmentId],
    })
    expect(res.status).toBe(400)
    expect((await res.json()) as { error: string }).toMatchObject({ error: "screenshot_required" })
    expect(ticketRow(id).status).toBe("new")
  })

  it("an image that belongs to a DIFFERENT ticket does not satisfy it — 400 screenshot_required", async () => {
    const id = await newTicket("The real ticket")
    const otherTicket = await newTicket("A different ticket entirely")
    const foreignImageId = seedImageAttachment(db(), otherTicket)
    const res = await call(IDS.staffUser, "POST /api/content/help/resolve", {
      id,
      resolution: "Done.",
      attachmentIds: [foreignImageId],
    })
    expect(res.status).toBe(400)
    expect((await res.json()) as { error: string }).toMatchObject({ error: "screenshot_required" })
    expect(ticketRow(id).status).toBe("new")
    // The OTHER ticket is untouched — this call named it, but never gated on
    // whether the CALLER may resolve it.
    expect(ticketRow(otherTicket).status).toBe("new")
  })

  it("an image on THIS ticket resolves it — 200", async () => {
    const id = await newTicket("A real screenshot")
    const imageId = seedImageAttachment(db(), id)
    const res = await call(IDS.staffUser, "POST /api/content/help/resolve", {
      id,
      resolution: "Fixed it.",
      attachmentIds: [imageId],
    })
    expect(res.status, await res.clone().text()).toBe(200)
    expect((await res.json()) as { sent: boolean }).toMatchObject({ sent: true })
    expect(ticketRow(id).status).toBe("resolved")
  })

  it("one non-image AND one image in the same list still resolves — 'at least one' is the rule", async () => {
    const id = await newTicket("A mixed bag")
    const pdfId = seedNonImageAttachment(id)
    const imageId = seedImageAttachment(db(), id)
    const res = await call(IDS.staffUser, "POST /api/content/help/resolve", {
      id,
      resolution: "Fixed it.",
      attachmentIds: [pdfId, imageId],
    })
    expect(res.status).toBe(200)
    expect(ticketRow(id).status).toBe("resolved")
  })

  it("R17 — a second resolve on an already-answered ticket is a no-op, and needs no screenshot at all", async () => {
    const id = await newTicket("Answered once")
    const imageId = seedImageAttachment(db(), id)
    await call(IDS.staffUser, "POST /api/content/help/resolve", { id, resolution: "First answer.", attachmentIds: [imageId] })
    expect(ticketRow(id).status).toBe("resolved")

    // No attachmentIds on the SECOND call at all — the R17 no-op path is
    // checked before the screenshot rule, so this must NOT 400.
    const res = await call(IDS.staffUser, "POST /api/content/help/resolve", { id, resolution: "Second answer." })
    expect(res.status, await res.clone().text()).toBe(200)
    expect((await res.json()) as { sent: boolean; alreadyResolved: boolean }).toMatchObject({
      sent: false,
      alreadyResolved: true,
    })
    expect(ticketRow(id).status).toBe("resolved")
  })
})
