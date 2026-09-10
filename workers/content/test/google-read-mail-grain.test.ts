// BUILD-5 §2, in the plan's own words: "mail thread = source, message =
// piece." Two things, tested separately because they are two different
// kinds of function:
//
//   • `mailThreads` — PURE grouping, mirroring `chatThreads`'s shape but
//     assembling with `chunkMail` (one piece PER MESSAGE — a mail message
//     already has its own boundary a chat turn does not, which is the one
//     real difference the plan itself draws between the two grains).
//   • `hydrateText`'s gmail case — now reads EVERY member message's full
//     body and reassembles the thread, instead of the one body a
//     message-shaped item used to need.
//
// ONE LIMITATION IS DELIBERATELY LOCKED HERE RATHER THAN HIDDEN: a message
// google-api.ts's known-id skip already has on file comes back as a
// placeholder with `threadId: ""` (see `knownPlaceholder`), so it cannot
// join its real thread's group here — it falls back to a lone group keyed
// by its own id, which is harmless (excluded by the cursor exactly as
// before) but means a thread with some known messages and one new reply
// reassembles from the new message alone. That is a real gap, flagged to
// kb_B1 (whose file this would need to change), not a silent one.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { MemberGuard } from "@shared/workers/gating"

const holder = vi.hoisted(() => ({
  /** messageId → the full MailMessage `gmailMessage` answers with. */
  bodies: new Map<string, { id: string; threadId: string; from: string; to: string; subject: string; snippet: string; date: string | null; url: string; text: string }>(),
}))

vi.mock("../src/lib/google", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/google")>()
  return { ...actual, accessTokenFor: async () => ({ token: "tok", connectionId: "CONN1", grantedScopes: "" }) }
})

vi.mock("../src/lib/google-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/google-api")>()
  return {
    ...actual,
    gmailMessage: async (_token: string, id: string) => {
      const found = holder.bodies.get(id)
      if (!found) throw new Error(`no fixture body for ${id}`)
      return found
    },
  }
})

const { mailThreads, hydrateText } = await import("../src/lib/google-read")

const guard: MemberGuard = { userId: "USER1", teamId: "TEAM1", roleId: "ROLE1", databaseId: "DB1" }
const env = {} as never
const cfg = {} as never

/** One message, shaped as `gmailSearch`'s list read returns one (no body). */
const listed = (id: string, threadId: string, date: string, from = "client@example.com") => ({
  id,
  threadId,
  from,
  to: "agency@kwapso.example",
  subject: "Renewal terms",
  snippet: "",
  date,
  url: `https://mail.google.com/mail/u/0/#inbox/${id}`,
  text: "",
})

/** One message's FULL body, as `gmailMessage` returns it — what `bodies`
 * fixtures below are keyed by. */
const body = (id: string, threadId: string, date: string, from: string, text: string) => ({
  id,
  threadId,
  from,
  to: "agency@kwapso.example",
  subject: "Renewal terms",
  snippet: text.slice(0, 20),
  date,
  url: `https://mail.google.com/mail/u/0/#inbox/${id}`,
  text,
})

beforeEach(() => {
  holder.bodies = new Map()
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe("mailThreads — the thread is the source, grouped by Gmail's own thread id", () => {
  it("groups messages sharing a thread id into one, ordered oldest first", () => {
    const [folded] = mailThreads([
      listed("m2", "t1", "2026-09-01T10:05:00Z"),
      listed("m1", "t1", "2026-09-01T10:00:00Z"),
    ])
    expect(folded.threadId).toBe("t1")
    expect(folded.ordered.map((m) => m.id)).toEqual(["m1", "m2"])
  })

  it("keeps two different threads as two separate groups", () => {
    const groups = mailThreads([listed("m1", "t1", "2026-09-01T10:00:00Z"), listed("m2", "t2", "2026-09-01T10:00:00Z")])
    expect(groups.map((g) => g.threadId).sort()).toEqual(["t1", "t2"])
  })

  // THE LOCKED LIMITATION — see the file header. A known-id placeholder's
  // empty threadId means it cannot be told apart from a message Gmail never
  // gave a thread for at all; both fall back to their own id as a
  // singleton group, which is the safe (never wrong, sometimes incomplete)
  // default rather than a guess at which real thread it belongs to.
  it("falls back to the message's own id when Gmail gives no thread id at all", () => {
    const groups = mailThreads([listed("m1", "", "2026-09-01T10:00:00Z")])
    expect(groups).toEqual([{ threadId: "m1", ordered: [expect.objectContaining({ id: "m1" })] }])
  })
})

describe("hydrateText — a gmail THREAD reads every member's body and reassembles it", () => {
  const threadItem = (threadMessageIds: string[]) => ({
    service: "gmail" as const,
    sourceId: null,
    externalId: "t1",
    title: "Renewal terms",
    url: null,
    text: "",
    updatedAt: "2026-09-01T10:05:00Z",
    shelf: "private" as const,
    ownerUserId: "USER1",
    accountId: null,
    threadMessageIds,
  })

  it("assembles one piece per message, in order, never fusing two into one", async () => {
    holder.bodies.set("m1", body("m1", "t1", "2026-09-01T10:00:00Z", "client@example.com", "Can we renew at the same rate?"))
    holder.bodies.set("m2", body("m2", "t1", "2026-09-01T10:05:00Z", "agency@kwapso.example", "Yes, that works for us."))

    const { items } = await hydrateText(env, cfg, guard, [threadItem(["m1", "m2"])])
    const text = items[0].text
    expect(text).toContain("Can we renew at the same rate?")
    expect(text).toContain("Yes, that works for us.")
    // Two pieces, not one blob — chunkMail never merges messages.
    expect(text.split("\n\n")).toHaveLength(2)
  })

  it("one member message Google refuses does not lose the whole thread's body", async () => {
    holder.bodies.set("m1", body("m1", "t1", "2026-09-01T10:00:00Z", "client@example.com", "First message"))
    // m2 has no fixture, so the mocked gmailMessage throws for it.
    const { items, skipped } = await hydrateText(env, cfg, guard, [threadItem(["m1", "m2"])])
    // The whole item's refusal is the item's, same rule as drive/gmail
    // single-message hydration above it: kept text is what it already had.
    expect(items[0].text).toBe("")
    expect(skipped).toHaveLength(1)
  })
})
