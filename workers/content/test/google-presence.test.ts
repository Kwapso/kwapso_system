// `googlePresence` DIRECTLY, for the first time — every existing caller
// mocks it away entirely (google-ingest.test.ts, google-scope.test.ts), so
// its real fetch/URL/goneWhen logic has never actually run under test. That
// is how a real bug hid behind a green build: the mock's `holder.binned.has(id)`
// shortcut fails in the SAFE direction when an id's shape changes underneath
// it, and the real implementation fails in the DANGEROUS one.
//
// ══════════════════════════════════════════════════════════════════════════
// THE BUG, AND WHY IT IS THE SAME CLASS AS THE CALENDAR COMMENT TEN LINES
// ABOVE THE RETIRE LOOP THAT CALLS THIS FUNCTION
//
// "An event on a named secondary calendar is a 404 on `primary`, and a 404 is
// the one status this function reads as an answer, so probing the wrong
// calendar would RETIRE A LIVE EVENT and record it as housekeeping." Same
// shape, different service: google-read.ts's `mailThreads` (BUILD-5 §2) made
// a gmail source's externalId a Gmail THREAD id instead of a message id, and
// the gmail probe below asked the MESSAGES endpoint with it. A thread id is
// never a valid message id, so that probe 404s for a thread that is
// completely alive and simply not the id space being asked about — and a 404
// is the one status this function reads as "gone". The very first retire
// tick after a live thread ages out of the recent-messages window (ordinary,
// not a deletion) would retire it.
//
// `absent is not gone` is the one invariant every presence probe here has to
// hold, and this file exists to prove each probe actually asks about the
// thing its own id names.

import { afterEach, describe, expect, it, vi } from "vitest"

import { googlePresence } from "../src/lib/google-api"

const realFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = realFetch
  vi.restoreAllMocks()
})

describe("googlePresence('gmail') asks about a THREAD, because that is what a gmail source's id names now", () => {
  it("a live thread, merely aged out of the recent-messages window, reads as THERE — not gone", async () => {
    const urls: string[] = []
    globalThis.fetch = vi.fn(async (url: unknown) => {
      urls.push(String(url))
      // A real, live thread: two messages, neither trashed.
      return new Response(
        JSON.stringify({
          id: "TH_1",
          messages: [{ id: "M1", labelIds: ["INBOX"] }, { id: "M2", labelIds: ["INBOX"] }],
        }),
        { status: 200 }
      )
    }) as unknown as typeof fetch

    expect(await googlePresence("gmail", "tok", "TH_1")).toBe("there")
    // THE ASSERTION THAT WOULD HAVE CAUGHT THE BUG: the probe must ask about
    // the THREAD, not a message — a probe hitting `/messages/TH_1` against a
    // real mailbox 404s regardless of what this mock answers, because that
    // endpoint and that id are different id spaces. Asserting the URL is what
    // makes this test fail the way production would; asserting only the
    // return value would have passed against either endpoint as long as this
    // mock's `status: 200` was reached, which is not what a real mailbox
    // would do for a thread id sent to the messages endpoint.
    expect(urls[0]).toContain("/threads/TH_1")
    expect(urls[0]).not.toContain("/messages/")
  })

  it("a thread every one of whose messages is trashed reads as gone", async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ id: "TH_2", messages: [{ id: "M1", labelIds: ["TRASH"] }] }),
          { status: 200 }
        )
    ) as unknown as typeof fetch
    expect(await googlePresence("gmail", "tok", "TH_2")).toBe("gone")
  })

  it("a thread with at least one message NOT trashed is still there, even if another was individually deleted", async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: "TH_3",
            messages: [{ id: "M1", labelIds: ["TRASH"] }, { id: "M2", labelIds: ["INBOX"] }],
          }),
          { status: 200 }
        )
    ) as unknown as typeof fetch
    expect(await googlePresence("gmail", "tok", "TH_3")).toBe("there")
  })

  it("a thread Google genuinely has no record of (404) is gone", async () => {
    globalThis.fetch = vi.fn(async () => new Response("", { status: 404 })) as unknown as typeof fetch
    expect(await googlePresence("gmail", "tok", "TH_GONE")).toBe("gone")
  })

  // absent IS NOT GONE — the invariant this whole file exists to hold every
  // probe to. A refusal, a quota limit or a dead socket means "this tick
  // cannot ask", never "the material has gone".
  it("a refusal (403), a quota limit (429) and a timeout are all UNKNOWN, never gone", async () => {
    globalThis.fetch = vi.fn(async () => new Response("", { status: 403 })) as unknown as typeof fetch
    expect(await googlePresence("gmail", "tok", "TH_X")).toBe("unknown")

    globalThis.fetch = vi.fn(async () => new Response("", { status: 429 })) as unknown as typeof fetch
    expect(await googlePresence("gmail", "tok", "TH_X")).toBe("unknown")

    globalThis.fetch = vi.fn(async () => {
      throw new DOMException("The operation was aborted.", "TimeoutError")
    }) as unknown as typeof fetch
    expect(await googlePresence("gmail", "tok", "TH_X")).toBe("unknown")
  })
})
