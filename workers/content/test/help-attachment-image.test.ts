// T3658/B0295's OWN GAP, CLOSED — `kind: "image"` on `POST /api/content/help/
// attachments`, the shape `add_help_attachment` (the MCP tool, shared/workers/
// tool-catalog.ts) calls: an agent has no file picker, so it names EITHER a
// `url` this door fetches itself (R11-timed, http(s) only, size-capped the
// same as an upload, image/* only) OR bytes it already holds as `fileDataUrl`
// (also image/* only — narrower than `kind: "file"`'s own ANY_FILE_TYPE,
// because this kind exists to satisfy the screenshot-before-close rule and
// nothing else). Stored through the identical seam `kind: "file"` uses
// (`env.MEDIA.put` + `addAttachment`), so the ticket keeps its own copy
// either way.

import type { DatabaseSync } from "node:sqlite"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

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
import { buildSpineDb, IDS, makeEnv } from "../../tenancy/test/spine-harness"

const db = () => holder.db as DatabaseSync

// The same tiny, real 1x1 PNG `reply-attachments.test.ts` already uses.
const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
const PDF_DATA_URL = "data:application/pdf;base64,JVBERi0xLjQK"

function env(userId: string) {
  return {
    ...(makeEnv(() => db(), userId) as unknown as Record<string, unknown>),
    PUBLIC_APP_URL: "https://kwapso.example",
    // The bytes never have to land anywhere real for this suite — only the
    // ROW matters, and the door writes it after this resolves.
    MEDIA: { put: async () => undefined },
    REALTIME: { fetch: async () => new Response("{}") },
  } as never
}

const call = (userId: string, route: string, body?: unknown, query = "") => {
  const [method, path] = route.split(" ")
  return worker.fetch(
    new Request(`https://content${path}${query}`, {
      method,
      headers: { Cookie: "session=x", "Content-Type": "application/json" },
      body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
    }),
    env(userId) as never,
    { waitUntil: () => {}, passThroughOnException: () => {} } as never
  )
}

async function newTicket(description: string): Promise<string> {
  const res = await call(IDS.staffUser, "POST /api/content/help", { description, accountId: IDS.victimAccount })
  const body = (await res.json()) as { id?: string; tickets?: { id: string }[] }
  const id = body.id ?? body.tickets?.[0]?.id
  if (!id) throw new Error(`raise failed ${res.status}`)
  return id
}

beforeEach(() => {
  holder.db = buildSpineDb()
})
afterEach(() => vi.unstubAllGlobals())

describe("kind: \"image\" — a url this door fetches itself", () => {
  it("image ok — fetches, stores, and the row keeps the image's own content type", async () => {
    const id = await newTicket("A url to a real image")
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(new Uint8Array([1, 2, 3, 4]), { status: 200, headers: { "content-type": "image/png" } })
      )
    )
    const res = await call(IDS.staffUser, "POST /api/content/help/attachments", {
      id,
      kind: "image",
      label: "Screenshot",
      url: "https://example.test/shot.png",
    })
    expect(res.status, await res.clone().text()).toBe(200)
    const body = (await res.json()) as { attachments: { label: string; contentType: string | null; kind: string }[] }
    const row = body.attachments.find((a) => a.label === "Screenshot")
    expect(row?.contentType).toBe("image/png")
    expect(row?.kind).toBe("file")
  })

  it("non-image refused — a url answering with anything but image/* is 400", async () => {
    const id = await newTicket("A url to a PDF, not an image")
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("not a picture", { status: 200, headers: { "content-type": "text/plain" } }))
    )
    const res = await call(IDS.staffUser, "POST /api/content/help/attachments", {
      id,
      kind: "image",
      label: "Screenshot",
      url: "https://example.test/notes.txt",
    })
    expect(res.status).toBe(400)
  })

  it("timeout/refusal handled — a fetch that throws is refused cleanly, never a 500", async () => {
    const id = await newTicket("An unreachable url")
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network error") }))
    const res = await call(IDS.staffUser, "POST /api/content/help/attachments", {
      id,
      kind: "image",
      label: "Screenshot",
      url: "https://example.test/gone.png",
    })
    expect(res.status).toBe(400)
  })

  it("bad scheme refused — a non-http(s) url is refused before any fetch is attempted", async () => {
    const id = await newTicket("A file:// url")
    const fetchSpy = vi.fn(async () => new Response("should never run"))
    vi.stubGlobal("fetch", fetchSpy)
    const res = await call(IDS.staffUser, "POST /api/content/help/attachments", {
      id,
      kind: "image",
      label: "Screenshot",
      url: "file:///etc/passwd",
    })
    expect(res.status).toBe(400)
    expect(fetchSpy, "a bad scheme must be refused at the scheme, never handed to fetch").not.toHaveBeenCalled()
  })

  it("over the size cap is refused, even with a truthful content-length", async () => {
    const id = await newTicket("A url claiming to be huge")
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(new Uint8Array(1), {
          status: 200,
          headers: { "content-type": "image/png", "content-length": String(50 * 1024 * 1024) },
        })
      )
    )
    const res = await call(IDS.staffUser, "POST /api/content/help/attachments", {
      id,
      kind: "image",
      label: "Screenshot",
      url: "https://example.test/huge.png",
    })
    expect(res.status).toBe(400)
  })
})

describe("kind: \"image\" — bytes already held, as a data URL", () => {
  it("a real PNG data URL is accepted and stored", async () => {
    const id = await newTicket("Bytes already in hand")
    const res = await call(IDS.staffUser, "POST /api/content/help/attachments", {
      id,
      kind: "image",
      label: "Screenshot",
      fileDataUrl: PNG,
    })
    expect(res.status, await res.clone().text()).toBe(200)
    const body = (await res.json()) as { attachments: { label: string; contentType: string | null }[] }
    expect(body.attachments.find((a) => a.label === "Screenshot")?.contentType).toBe("image/png")
  })

  it("a non-image data URL (a PDF) is refused — this kind is image-only", async () => {
    const id = await newTicket("A PDF, not an image")
    const res = await call(IDS.staffUser, "POST /api/content/help/attachments", {
      id,
      kind: "image",
      label: "Notes",
      fileDataUrl: PDF_DATA_URL,
    })
    expect(res.status).toBe(400)
  })

  it("url takes precedence over fileDataUrl when both are present", async () => {
    const id = await newTicket("Both given, url wins")
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(new Uint8Array([9]), { status: 200, headers: { "content-type": "image/jpeg" } }))
    )
    const res = await call(IDS.staffUser, "POST /api/content/help/attachments", {
      id,
      kind: "image",
      label: "Screenshot",
      url: "https://example.test/shot.jpg",
      fileDataUrl: PNG,
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { attachments: { label: string; contentType: string | null }[] }
    expect(body.attachments.find((a) => a.label === "Screenshot")?.contentType).toBe("image/jpeg")
  })
})

describe("an attachment added through kind: \"image\" satisfies resolve_help_ticket's own rule", () => {
  it("fetched by url", async () => {
    const id = await newTicket("Closed with a fetched screenshot")
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { "content-type": "image/png" } })
      )
    )
    const added = await call(IDS.staffUser, "POST /api/content/help/attachments", {
      id,
      kind: "image",
      label: "Screenshot",
      url: "https://example.test/shot.png",
    })
    const attachmentId = ((await added.json()) as { attachments: { id: string; label: string }[] }).attachments.find(
      (a) => a.label === "Screenshot"
    )!.id

    const resolved = await call(IDS.staffUser, "POST /api/content/help/resolve", {
      id,
      resolution: "Fixed.",
      attachmentIds: [attachmentId],
    })
    expect(resolved.status, await resolved.clone().text()).toBe(200)
  })

  it("attached from a data URL", async () => {
    const id = await newTicket("Closed with an already-held screenshot")
    const added = await call(IDS.staffUser, "POST /api/content/help/attachments", {
      id,
      kind: "image",
      label: "Screenshot",
      fileDataUrl: PNG,
    })
    const attachmentId = ((await added.json()) as { attachments: { id: string; label: string }[] }).attachments.find(
      (a) => a.label === "Screenshot"
    )!.id

    const resolved = await call(IDS.staffUser, "POST /api/content/help/resolve", {
      id,
      resolution: "Fixed.",
      attachmentIds: [attachmentId],
    })
    expect(resolved.status, await resolved.clone().text()).toBe(200)
  })
})
