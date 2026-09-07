// THE THIRD STEP OF A DIRECT UPLOAD — the one where the caller hands us back a
// string and we have to decide whether to believe it.
//
// Steps one and two took the worker out of the byte path: the presign door mints
// a key nothing the caller sent contributed to, and the browser PUTs to R2
// itself. That is the scaling win, and it costs one new thing to be careful
// about. The key was OURS when we minted it; by the time the browser quotes it
// back it is caller input like any other, and it reaches `bucket.head` — a store
// with no session in front of it.
//
// So the four ways this door could give something away, one test each:
//
//   • BELIEVING A KEY FROM ANOTHER TEAM. The whole tenancy fence for objects is
//     the key's leading segment. A confirm door that looked up whatever it was
//     handed would let a member of one team mint a `/media/internal/…` reference
//     to another team's file and hang it on their own record.
//   • BELIEVING A KEY FROM ANOTHER MODULE. The 5 Sep 2026 bug, one layer down: a
//     brand asset's URL pasted into a certificate's file field. The module
//     segment is what makes a reclaim able to say "this module", so it is proved
//     here too and not only the team.
//   • ANSWERING FOR AN OBJECT THAT ISN'T THERE. R40 says a record only ever
//     points at bytes a person can reach. A door that took the caller's word for
//     the upload having succeeded would write a reference to nothing, which is
//     the exact failure R40 was earned by.
//   • READING THE BYTES. `head`, never `get`. A confirm that pulled a 90 MB
//     object into the isolate to check it would put the worker straight back in
//     the byte path and undo the change it is part of.
//
// The knowledge door's own confirm is the same proof plus a row, so it is tested
// beside it: same key rules, and the ONE read-back it is allowed (the assistant
// needs the words) has to be the only one.

import { beforeEach, describe, expect, it, vi } from "vitest"

import { STREAM_UPLOAD_MAX_BYTES } from "@shared/workers/limits"

const ctx = vi.hoisted(() => ({
  guard: { teamId: "team01", databaseId: "db1", userId: "u1" },
  actor: { id: "u1", email: "a@b.c", name: "Ana" },
  cfg: {},
  refused: false,
  body: {} as Record<string, unknown>,
  created: null as Record<string, unknown> | null,
  published: [] as unknown[],
}))

vi.mock("@shared/workers/route", () => ({
  gated: async () => ({ guard: ctx.guard, actor: ctx.actor, cfg: ctx.cfg, user: {} }),
  gatedBody: async () => ({ guard: ctx.guard, actor: ctx.actor, cfg: ctx.cfg, user: {}, body: ctx.body }),
}))

vi.mock("@shared/workers/account-scope", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  refusePortalCaller: async () => {
    if (ctx.refused) throw new Error("portal caller refused")
  },
}))

vi.mock("@shared/workers/realtime", () => ({
  publishChange: async (...args: unknown[]) => {
    ctx.published.push(args)
  },
}))

vi.mock("../src/lib/knowledge", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  createFileSource: async (_e: unknown, _c: unknown, _g: unknown, _a: unknown, input: Record<string, unknown>) => {
    ctx.created = input
    return "src01"
  },
  getSource: async () => ({ id: "src01", title: "t" }),
  countSources: async () => 1,
}))

vi.mock("../src/lib/knowledge-files", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  extractFile: async () => ({ text: "the words", note: null }),
}))

import { postConfirmUpload } from "../src/routes/uploads"
import { postConfirmKnowledgeFile } from "../src/routes/knowledge"
import type { Env } from "../src/env"

/** A stand-in bucket that records which METHOD was reached for. `get` returning
 * bytes rather than throwing is deliberate: a door that read the object would
 * pass on its answer and be caught only by this counter. */
function bucket(object: { size: number; contentType?: string } | null = { size: 12 }) {
  const calls: string[] = []
  return {
    calls,
    head: async (key: string) => {
      calls.push(`head:${key}`)
      return object && { size: object.size, httpMetadata: { contentType: object.contentType ?? "application/pdf" } }
    },
    get: async (key: string) => {
      calls.push(`get:${key}`)
      return { arrayBuffer: async () => new TextEncoder().encode("stored bytes").buffer }
    },
    put: async (key: string) => {
      calls.push(`put:${key}`)
    },
  }
}

const envWith = (b: ReturnType<typeof bucket>): Env => ({ INTERNAL_MEDIA: b, MEDIA: b }) as unknown as Env

/** A key of the shape the presign door mints, for whichever team and module. */
const keyFor = (team: string, module: string) => `${team}/${module}/01J8ZZZZZZZZZZZZZZZZZZZZZZ`
const OURS = keyFor("team01", "knowledge")

const confirm = (body: Record<string, unknown>): Request =>
  new Request("https://x/api/content/uploads/confirm", { method: "POST", body: JSON.stringify(body) })

beforeEach(() => {
  ctx.refused = false
  ctx.body = {}
  ctx.created = null
  ctx.published = []
})

describe("the confirm door proves the key before it reaches the bucket", () => {
  it("answers the reference for a key we minted, and never reads the bytes", async () => {
    const b = bucket({ size: 4_000_000, contentType: "application/pdf" })
    const res = await postConfirmUpload(confirm({ module: "knowledge", key: OURS }), envWith(b))
    expect(res.status).toBe(200)
    const out = (await res.json()) as { url: string; contentType: string }
    // The streaming door's answer, shape for shape — so the form field holding
    // the reply cannot tell which path ran.
    expect(out.url.startsWith(`/media/internal/${OURS}?v=`)).toBe(true)
    expect(out.contentType).toBe("application/pdf")
    // THE ONE THAT KEEPS THE WORKER OUT OF THE BYTE PATH.
    expect(b.calls).toEqual([`head:${OURS}`])
  })

  it("refuses a key from ANOTHER TEAM without looking it up", async () => {
    const b = bucket()
    const res = await postConfirmUpload(
      confirm({ module: "knowledge", key: keyFor("team99", "knowledge") }),
      envWith(b)
    )
    expect(res.status).toBe(400)
    expect(b.calls, "a key we did not mint must never reach the store").toEqual([])
  })

  it("refuses a key from ANOTHER MODULE of our own team", async () => {
    const b = bucket()
    const res = await postConfirmUpload(confirm({ module: "knowledge", key: keyFor("team01", "brand") }), envWith(b))
    expect(res.status).toBe(400)
    expect(b.calls).toEqual([])
  })

  it("refuses a path, a traversal and a folder-shaped key", async () => {
    for (const key of [
      "team01/knowledge/deeper/01J8ZZZZZZZZZZZZZZZZZZZZZZ",
      "team01/knowledge/",
      "../team99/knowledge/01J8ZZZZZZZZZZZZZZZZZZZZZZ",
      "/media/internal/team01/knowledge/01J8ZZZZZZZZZZZZZZZZZZZZZZ",
    ]) {
      const b = bucket()
      const res = await postConfirmUpload(confirm({ module: "knowledge", key }), envWith(b))
      expect(res.status, `${key} must be refused`).toBe(400)
      expect(b.calls).toEqual([])
    }
  })

  it("refuses a module that is not an upload target, and says which are", async () => {
    const res = await postConfirmUpload(confirm({ module: "payroll", key: OURS }), envWith(bucket()))
    expect(res.status).toBe(400)
    expect(await res.text()).toMatch(/knowledge/)
  })

  it("says the file never arrived rather than answering a reference to nothing", async () => {
    // R40's failure, at the only moment it can still be caught: the bytes were
    // supposed to be PUT and were not.
    const res = await postConfirmUpload(confirm({ module: "knowledge", key: OURS }), envWith(bucket(null)))
    expect(res.status).toBe(404)
  })

  it("refuses an empty object and one past the target's ceiling", async () => {
    for (const size of [0, STREAM_UPLOAD_MAX_BYTES + 1]) {
      const res = await postConfirmUpload(confirm({ module: "knowledge", key: OURS }), envWith(bucket({ size })))
      expect(res.status, `${size} bytes must not be confirmed`).toBe(404)
    }
  })

  it("refuses a portal caller, exactly as the presign door does", async () => {
    ctx.refused = true
    await expect(postConfirmUpload(confirm({ module: "knowledge", key: OURS }), envWith(bucket()))).rejects.toThrow()
  })

  it("refuses a request with no body at all", async () => {
    const res = await postConfirmUpload(
      new Request("https://x/api/content/uploads/confirm", { method: "POST" }),
      envWith(bucket())
    )
    expect(res.status).toBe(400)
  })
})

describe("the knowledge confirm: the same proof, plus a row", () => {
  const good = { key: OURS, fileName: "notes.pdf", contentType: "application/pdf" }
  const request = () => new Request("https://x/api/content/knowledge/upload-confirm", { method: "POST" })

  it("makes the source, points it at the stored object, and publishes it", async () => {
    ctx.body = { ...good, title: "Onboarding notes" }
    const b = bucket({ size: 4_000 })
    const res = await postConfirmKnowledgeFile(request(), envWith(b))
    expect(res.status).toBe(200)
    expect(ctx.created?.title).toBe("Onboarding notes")
    const file = ctx.created?.file as { url: string; bytes: number }
    expect(file.url).toBe(`/media/internal/${OURS}`)
    // The SIZE comes from the object, never from the caller — the one number a
    // browser could otherwise lie about after the fact.
    expect(file.bytes).toBe(4_000)
    expect(ctx.published).toHaveLength(1)
    // Proved, then read back ONCE for the assistant — the only time these bytes
    // are ever inside a worker.
    expect(b.calls).toEqual([`head:${OURS}`, `get:${OURS}`])
  })

  it("refuses another team's key, and writes no row", async () => {
    ctx.body = { ...good, key: keyFor("team99", "knowledge") }
    const b = bucket()
    const res = await postConfirmKnowledgeFile(request(), envWith(b))
    expect(res.status).toBe(400)
    expect(ctx.created).toBeNull()
    expect(ctx.published).toEqual([])
    expect(b.calls).toEqual([])
  })

  it("refuses a file that never arrived, and writes no row", async () => {
    ctx.body = { ...good }
    const res = await postConfirmKnowledgeFile(request(), envWith(bucket(null)))
    expect(res.status).toBe(404)
    expect(ctx.created).toBeNull()
    expect(ctx.published).toEqual([])
  })

  it("holds the declared type to the same allow-list the streaming door uses", async () => {
    ctx.body = { ...good, contentType: "not a media type" }
    const res = await postConfirmKnowledgeFile(request(), envWith(bucket()))
    expect(res.status).toBe(400)
    expect(ctx.created).toBeNull()
  })

  it("falls back to the file's name when no title is given", async () => {
    ctx.body = { ...good }
    await postConfirmKnowledgeFile(request(), envWith(bucket({ size: 10 })))
    expect(ctx.created?.title).toBe("notes.pdf")
  })
})
