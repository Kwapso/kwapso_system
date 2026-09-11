// THE SCREEN NEVER ASKED THE READER FOR HELP, AND ITS REFUSALS WERE THE READER'S
// BEST CASE.
//
// `GET /api/content/knowledge/ask` re-read the shortlist only when a caller
// passed `read=1` — which in practice meant the assistant and nobody else.
// `askKnowledge`, the knowledge screen's own call, never set it. So the three
// paraphrases the owner named were refused by the floor alone on a build that
// answers all three with receipts.
//
// Now the door searches the cheap way first and re-reads only when that came
// back with nothing. Same shape as c-hijack's A3 retry-on-empty, same reason: a
// question that already answers costs exactly what it cost before.
//
// THE REAL DECISION IS CALLED, NEVER COPIED. `secondLook` is exported from the
// lib for this test; a helper that mirrored the door's tail would keep passing
// for ever after the tail changed, which is the failure this repo has recorded
// three times in one file.

import { describe, expect, it } from "vitest"

import { secondLook } from "../src/lib/knowledge"

/** The SEARCH is stood in for — it genuinely must be. The branch under test is
 * the real one. */
const askTwice = (search: (opts: { read?: unknown }) => Promise<{ found: boolean } & Record<string, unknown>>) =>
  search({ read: undefined }).then((first) =>
    secondLook(first, () => search({ read: () => Promise.resolve({ relevant: [] }) }))
  )

describe("a second look before giving up", () => {
  it("does not re-read when the first search already answered", async () => {
    const seen: boolean[] = []
    const answer = await askTwice(async ({ read }) => {
      seen.push(!!read)
      return { found: true }
    })
    expect(answer.found).toBe(true)
    // One search, no reader: the unit is not spent on a question that works.
    expect(seen).toEqual([false])
  })

  it("re-reads once, and only once, when the first search found nothing", async () => {
    const seen: boolean[] = []
    const answer = await askTwice(async ({ read }) => {
      seen.push(!!read)
      return read ? { found: true } : { found: false }
    })
    expect(answer.found).toBe(true)
    expect(seen).toEqual([false, true])
  })

  it("keeps the honest refusal when the reader cannot be paid for", async () => {
    const answer = await askTwice(async ({ read }) => {
      if (read) throw new Error("this role may not spend an AI unit")
      return { found: false, message: "we have nothing on that" }
    })
    // Not a 403, not a throw, not an empty body. The refusal survives.
    expect(answer.found).toBe(false)
    expect(answer.message).toBe("we have nothing on that")
  })

  it("keeps the FIRST refusal when the second look also finds nothing", async () => {
    const answer = await askTwice(async ({ read }) => ({ found: false, pass: read ? "second" : "first" }))
    expect(answer.found).toBe(false)
    // Not the retry's own refusal, and not a third shape invented here.
    expect(answer.pass).toBe("first")
  })
})
