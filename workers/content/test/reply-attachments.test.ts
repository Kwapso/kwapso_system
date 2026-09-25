// A REPLY CAN CARRY ITS OWN FILES — team migration 0105, against the REAL
// migrations run into real SQLite (spine-harness.ts), the real route handlers,
// and the real `lib/help.ts`/`lib/help-attachments.ts` seam. Three things:
//
//   1. THE ROUND TRIP. Stage a file (POST /api/content/help/attachments, the
//      SAME door the ticket-level Files panel already uses), reply naming its
//      id (POST /api/content/help/reply), and read the thread back
//      (GET /api/content/help/thread) — the file must be on THAT reply, in
//      the exact `{id, name, href, mime, size}` shape `HelpMessageAttachment`
//      promises, and it must NOT also show up unlinked at the ticket level
//      once claimed.
//   2. R20/R41: A FOREIGN ATTACHMENT ID IS REFUSED, WHOLE. An id that names a
//      real, live, file-kind attachment — just not one sitting on THIS ticket,
//      unlinked — is a 400, and nothing is written: no reply row, no link.
//   3. THE SAME REFUSAL FOR AN ID THAT NAMES NOTHING AT ALL.
//
// `help-fence.test.ts` (this worker's own burglar suite) already proves the
// ACCOUNT fence around a reply; this file is about the ATTACHMENT relation
// specifically and does not re-run that proof.

import type { DatabaseSync } from "node:sqlite"
import { beforeEach, describe, expect, it, vi } from "vitest"

const holder = vi.hoisted(() => ({ db: null as DatabaseSync | null }))

vi.mock("@shared/workers/d1-rest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/d1-rest")>()
  const { d1Impl } = await import("../../tenancy/test/d1-sqlite")
  return { ...actual, ...d1Impl(() => holder.db as DatabaseSync) }
})

import worker from "../src/index"
import { buildSpineDb, IDS, makeEnv } from "../../tenancy/test/spine-harness"

const db = () => holder.db as DatabaseSync

// A tiny, real 1x1 PNG — the same fixture `stories.test.ts` already uses for
// its own attachment doors, so a decode failure here would be a regression in
// the shared upload-parse seam and not a fixture mistake.
const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

function env(userId: string) {
  return {
    ...(makeEnv(() => db(), userId) as unknown as Record<string, unknown>),
    PUBLIC_APP_URL: "https://kwapso.example",
    // The bytes never have to actually land anywhere real for this suite —
    // only the ROW matters, and the door writes the row after this resolves.
    MEDIA: { put: async () => undefined },
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

/** Stage a file on a ticket — the ticket-level door, unchanged for backwards
 * compatibility (help-attachments.ts's own `addAttachment`). Returns the id
 * of the row it just created, off the end of the refreshed list — the same
 * "newest is last" reading `help-detail.tsx`'s own `uploadReplyFile` relies
 * on, safe here because each call in this file is awaited before the next. */
async function stageFile(userId: string, ticketId: string, label: string): Promise<string> {
  const res = await call(userId, "POST /api/content/help/attachments", {
    id: ticketId,
    kind: "file",
    label,
    fileDataUrl: PNG,
  })
  expect(res.status, await res.clone().text()).toBe(200)
  const body = (await res.json()) as { attachments: { id: string; label: string }[] }
  const row = body.attachments.find((a) => a.label === label)
  if (!row) throw new Error(`stageFile: ${label} did not come back in the refreshed list`)
  return row.id
}

const THIRD_TICKET = "H_ATT_SUITE"

beforeEach(() => {
  holder.db = buildSpineDb()
  // A second ticket, wholly unrelated to the victim's — the foreign-id
  // refusal test needs a REAL attachment that is nonetheless not this
  // ticket's own, and a made-up id alone would only prove the "does not
  // exist" branch, not the "exists, but not here" one.
  db().exec(
    `INSERT INTO help (id, description, status, resolved, account_id, created_at, creator_id, creator_email, creator_name)
     VALUES ('${THIRD_TICKET}', 'A second, unrelated request', 'new', 0, NULL, '2026-03-01', '${IDS.staffUser}', 'staff@kwapso.app', 'Staff');`
  )
})

describe("a reply's staged files round-trip through the door", () => {
  it("a reply naming a staged file's id carries it back, in both the write's own answer and a fresh read", async () => {
    const attId = await stageFile(IDS.staffUser, IDS.victimTicket, "board.png")

    const replyRes = await call(IDS.staffUser, "POST /api/content/help/reply", {
      helpId: IDS.victimTicket,
      body: "Here's what I mean",
      attachmentIds: [attId],
    })
    expect(replyRes.status, await replyRes.clone().text()).toBe(200)
    const replyBody = (await replyRes.json()) as {
      replies: { id: string; body: string; attachments?: { id: string; name: string; href: string; mime: string | null; size: number | null }[] }[]
    }
    const written = replyBody.replies.find((r) => r.body === "Here's what I mean")
    expect(written, "the reply itself must be in the write's own answer").toBeTruthy()
    expect(written!.attachments).toEqual([
      { id: attId, name: "board.png", href: expect.stringMatching(/^\/media\//) as unknown as string, mime: "image/png", size: expect.any(Number) as unknown as number },
    ])

    // AND ON A FRESH READ — not only the optimistic write reply. This is what
    // proves `listReplies` itself joins the column back, not merely that the
    // write echoed what it was handed.
    const threadRes = await call(IDS.staffUser, "GET /api/content/help/thread", undefined, `?id=${IDS.victimTicket}`)
    expect(threadRes.status).toBe(200)
    const thread = (await threadRes.json()) as {
      replies: { id: string; body: string; attachments?: { id: string; name: string }[] }[]
      attachments: { id: string }[]
    }
    const read = thread.replies.find((r) => r.body === "Here's what I mean")
    expect(read?.attachments).toEqual([expect.objectContaining({ id: attId, name: "board.png" })])

    // AND THE THREAD DOOR'S OWN TOP-LEVEL `attachments` — the ticket's own
    // opening files, `threadId`-null only (help-detail.tsx's `ticketFilesFor`
    // reads this; a second, separate `/attachments` call for the same screen
    // would have cost a sixth request on its cold-open budget,
    // cold-screen-hops.test.tsx). This one is CLAIMED now, so it must NOT
    // appear here — it already came back on `read.attachments` above.
    expect(thread.attachments.some((a) => a.id === attId)).toBe(false)
  })

  it("the thread door's own `attachments` names exactly the ticket's threadId-null rows", async () => {
    const ticketLevel = await stageFile(IDS.staffUser, IDS.victimTicket, "board.png")
    const claimed = await stageFile(IDS.staffUser, IDS.victimTicket, "invoice.pdf")
    await call(IDS.staffUser, "POST /api/content/help/reply", {
      helpId: IDS.victimTicket,
      body: "Filed",
      attachmentIds: [claimed],
    })

    const res = await call(IDS.staffUser, "GET /api/content/help/thread", undefined, `?id=${IDS.victimTicket}`)
    const body = (await res.json()) as { attachments: { id: string; label: string; threadId: string | null }[] }
    expect(body.attachments.map((a) => a.id)).toEqual([ticketLevel])
    expect(body.attachments[0].threadId).toBeNull()
  })

  it("the ticket-level door tells the two kinds of row apart by `threadId` (R40's other reader, help-detail.tsx's `ticketFilesFor`)", async () => {
    const attId = await stageFile(IDS.staffUser, IDS.victimTicket, "board.png")

    // BEFORE a reply claims it — an ordinary ticket-level file, same as one
    // picked in `help-form-dialog.tsx`'s own upload zone.
    const beforeRes = await call(IDS.staffUser, "GET /api/content/help/attachments", undefined, `?id=${IDS.victimTicket}`)
    const before = (await beforeRes.json()) as { attachments: { id: string; threadId: string | null }[] }
    expect(before.attachments.find((a) => a.id === attId)?.threadId).toBeNull()

    const replyRes = await call(IDS.staffUser, "POST /api/content/help/reply", {
      helpId: IDS.victimTicket,
      body: "Here's what I mean",
      attachmentIds: [attId],
    })
    expect(replyRes.status, await replyRes.clone().text()).toBe(200)
    const replyBody = (await replyRes.json()) as { replies: { id: string; body: string }[] }
    const replyId = replyBody.replies.find((r) => r.body === "Here's what I mean")?.id
    expect(replyId).toBeTruthy()

    // AFTER — the same row now names the reply it rode in on, so a screen
    // drawing "what the ticket itself carries" can exclude it and leave it to
    // that reply's own bubble.
    const afterRes = await call(IDS.staffUser, "GET /api/content/help/attachments", undefined, `?id=${IDS.victimTicket}`)
    const after = (await afterRes.json()) as { attachments: { id: string; threadId: string | null }[] }
    expect(after.attachments.find((a) => a.id === attId)?.threadId).toBe(replyId)
  })

  it("a reply with no attachmentIds carries none — the field is genuinely optional", async () => {
    const res = await call(IDS.staffUser, "POST /api/content/help/reply", {
      helpId: IDS.victimTicket,
      body: "Just words, no files",
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { replies: { body: string; attachments?: unknown[] }[] }
    const written = body.replies.find((r) => r.body === "Just words, no files")
    expect(written?.attachments).toBeUndefined()
  })
})

describe("R20/R41 — an attachment id that is not a live, unlinked file on THIS ticket is refused whole", () => {
  it("refuses an id belonging to a DIFFERENT ticket, and appends no reply at all", async () => {
    const foreignId = await stageFile(IDS.staffUser, THIRD_TICKET, "elsewhere.png")

    const before = (await (await call(IDS.staffUser, "GET /api/content/help/thread", undefined, `?id=${IDS.victimTicket}`)).json()) as {
      total: number
    }

    const res = await call(IDS.staffUser, "POST /api/content/help/reply", {
      helpId: IDS.victimTicket,
      body: "Trying to claim someone else's file",
      attachmentIds: [foreignId],
    })
    expect(res.status).toBe(400)

    const after = (await (await call(IDS.staffUser, "GET /api/content/help/thread", undefined, `?id=${IDS.victimTicket}`)).json()) as {
      total: number
    }
    expect(after.total, "a refused reply must append nothing").toBe(before.total)
  })

  it("refuses an id that names nothing at all, the same way", async () => {
    const res = await call(IDS.staffUser, "POST /api/content/help/reply", {
      helpId: IDS.victimTicket,
      body: "Trying to claim a made-up file",
      attachmentIds: ["not-a-real-attachment-id"],
    })
    expect(res.status).toBe(400)
  })

  it("refuses an id that IS on this ticket but already claimed by an earlier reply", async () => {
    const attId = await stageFile(IDS.staffUser, IDS.victimTicket, "already-sent.png")
    const first = await call(IDS.staffUser, "POST /api/content/help/reply", {
      helpId: IDS.victimTicket,
      body: "First reply, with the file",
      attachmentIds: [attId],
    })
    expect(first.status).toBe(200)

    const second = await call(IDS.staffUser, "POST /api/content/help/reply", {
      helpId: IDS.victimTicket,
      body: "Second reply, trying to reuse it",
      attachmentIds: [attId],
    })
    expect(second.status).toBe(400)
  })
})
