// THE SCREEN NEVER ASKED THE READER FOR HELP, AND THE REFUSALS WERE ITS BEST CASE.
//
// `GET /api/content/knowledge/ask` only re-read the shortlist when the caller
// passed `read=1` — which, in practice, meant the assistant and nobody else.
// The knowledge screen's own `askKnowledge` never set it. So the three
// paraphrases the owner complained about were refused by the floor alone, on a
// build that could answer all three with receipts, because the one mechanism
// that could rescue them was never invoked on the one path where it mattered.
//
// Now the door takes a SECOND LOOK before giving up: search normally, and only
// if that comes back with nothing, re-read and try again. Same shape as
// c-hijack's A3 retry-on-empty, for the same reason — a question that already
// answers pays exactly what it paid before, and the unit is spent only where it
// might rescue something.
//
// THE CASE THAT MUST NOT REGRESS is the third test. A role without the
// assistant right cannot spend a unit, `payToRead` throws a GuardError saying
// so, and the person asked an ordinary question the base has nothing on. They
// must get the honest refusal they would have got yesterday — never a 403.
// Turning "we have nothing on that" into an error page for somebody whose role
// simply cannot pay is a worse failure than the one this fixes.

import { describe, expect, it, vi } from "vitest"

import { secondLook } from "../src/routes/knowledge"

describe("a second look before giving up", () => {
  it("does not re-read when the first search already answered", async () => {
    const calls: boolean[] = []
    const retrieve = vi.fn(async ({ read }: { read?: unknown }) => {
      calls.push(!!read)
      return { found: true, passages: [{}], citations: [{}] }
    })
    const answer = await askTwice(retrieve)
    expect(answer.found).toBe(true)
    // One search, no reader. The unit is not spent on a question that works.
    expect(calls).toEqual([false])
  })

  it("re-reads once, and only once, when the first search found nothing", async () => {
    const calls: boolean[] = []
    const retrieve = vi.fn(async ({ read }: { read?: unknown }) => {
      calls.push(!!read)
      return read ? { found: true, passages: [{}], citations: [{}] } : { found: false, passages: [], citations: [] }
    })
    const answer = await askTwice(retrieve)
    expect(answer.found).toBe(true)
    expect(calls).toEqual([false, true])
  })

  it("keeps the honest refusal when the reader cannot be paid for", async () => {
    const calls: boolean[] = []
    const retrieve = vi.fn(async ({ read }: { read?: unknown }) => {
      calls.push(!!read)
      if (read) throw new Error("forbidden: this role may not spend an AI unit")
      return { found: false, passages: [], citations: [], message: "we have nothing on that" }
    })
    const answer = await askTwice(retrieve)
    // The refusal survives. Not a 403, not a throw, not an empty body.
    expect(answer.found).toBe(false)
    expect(answer.message).toBe("we have nothing on that")
    expect(calls).toEqual([false, true])
  })

  it("still answers honestly when the second look also finds nothing", async () => {
    const retrieve = vi.fn(async () => ({ found: false, passages: [], citations: [] }))
    const answer = await askTwice(retrieve)
    expect(answer.found).toBe(false)
    // Two searches, and the refusal is the first one's — not a third shape
    // invented by the retry.
    expect(retrieve).toHaveBeenCalledTimes(2)
  })
})

/** THE REAL DECISION, CALLED — never a copy of it. `secondLook` is exported
 * from the door for exactly this reason: a helper that MIRRORED the handler's
 * tail would keep passing for ever after the tail changed, which is the failure
 * this repo has now recorded three times. The stub here is the SEARCH, which
 * genuinely must be stood in for; the branch under test is the real one. */
async function askTwice(
  retrieve: (opts: { read?: unknown }) => Promise<{ found: boolean } & Record<string, unknown>>
): Promise<{ found: boolean } & Record<string, unknown>> {
  const reader = () => Promise.resolve({ relevant: [] })
  return secondLook(await retrieve({ read: undefined }), () => retrieve({ read: reader }))
}
