// `googlePresence` DIRECTLY, for the first time — every existing caller
// mocks it away entirely (google-ingest.test.ts, google-scope.test.ts), so
// its real fetch/URL/goneWhen logic has never actually run under test. That
// is how a real bug hid behind a green build: the mock's `holder.binned.has(id)`
// shortcut fails in the SAFE direction when an id's shape changes underneath
// it, and the real implementation fails in the DANGEROUS one.
//
// ══════════════════════════════════════════════════════════════════════════
// THE BUG, CORRECTED ONCE BEFORE THIS FILE WAS RIGHT ABOUT WHICH CASE MATTERS
//
// The first draft of this file asserted that a Gmail thread id 404s against
// the messages endpoint "essentially always", on the premise that a thread id
// and a message id are different id spaces. kb_B1 corrected that, stating its
// own confidence honestly rather than asserting it as fact (neither of us can
// verify this without a live token, which nobody should spend to find out):
// **Gmail sets a thread's id to the id of its FIRST message** — same id
// space. For a single-message thread (74% of live threads on kb_B1's
// staging sample), `GET /messages/{threadId}` returns 200, not 404.
//
// THAT DOES NOT CHANGE THE FIX. It changes which case actually distinguishes
// the threads probe from the messages probe it replaces, and therefore which
// case this file has to test:
//
//   • THE PREMISE THIS FILE HAD: a threadId 404s essentially always — every
//     thread merely aged out of the recent-messages window would retire.
//     Catastrophic, obvious, visible on the very first tick.
//   • WHAT IS ACTUALLY BELIEVED TRUE: the messages probe returns 200 for most
//     threads and 404s exactly when a thread's FIRST message was
//     individually deleted while the thread lives on through later replies.
//     Rare. Silent. Destroys a live conversation. Looks like the feature
//     working correctly for every other thread — which is why it is the more
//     expensive bug: it does not announce itself, and it would have survived
//     a suite that only tested the common case.
//
// So the test below is the RARE case, not the common one — the one case
// where the two probes actually disagree. A test asserting "a threadId 404s
// on /messages" would have encoded a premise likely to be false and gone
// green against an implementation that was still wrong: the same failure
// this file's own opening paragraph describes, one level up, in the test
// meant to catch it.
//
// ONE CONSEQUENCE WORTH STATING: "resolve the source's id to one of its
// member messages and keep the existing messages probe" — an alternative
// this lane considered and rejected — is not a weaker design next to the
// threads probe. Under kb_B1's premise, THE THREAD ID ALREADY IS THE FIRST
// MEMBER MESSAGE'S ID, so that alternative is not a different design at all;
// it is the current, broken behaviour. Rejecting it kept a bug fix a bug fix.
//
// `absent is not gone` is the invariant every presence probe here has to
// hold — this codebase's fourth run-in with it (the calendar probe's own
// `primary`-only comment, the gmail known-id skip, this one, and kb_B1's
// `heldSources` id-prefix lookup) — and this file exists to prove the probe
// actually asks about the thing its own id names, in the one case that can
// tell a right answer from a wrong one dressed as a right answer.

import { afterEach, describe, expect, it, vi } from "vitest"

import { googlePresence } from "../src/lib/google-api"

const realFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = realFetch
  vi.restoreAllMocks()
})

describe("googlePresence('gmail') asks about a THREAD, because that is what a gmail source's id names now", () => {
  // THE ONE CASE THAT DISTINGUISHES THE TWO PROBES — see the file header.
  // Gmail's thread id is its first message's id, so a thread whose first
  // message was individually deleted while a later reply keeps it alive is
  // exactly the scenario the OLD (messages) probe would have gotten wrong: it
  // would 404 on that specific, now-gone message id and read the whole,
  // still-live conversation as "gone". The threads endpoint answers about
  // the CONVERSATION, so a message inside it going away does not make the
  // conversation itself 404 as long as another message remains.
  it("a live thread whose FIRST message (the thread's own id) was individually deleted is still THERE, not gone", async () => {
    const urls: string[] = []
    globalThis.fetch = vi.fn(async (url: unknown) => {
      urls.push(String(url))
      // The first message (M1, sharing the thread's own id TH_1) is gone;
      // the thread lives on through M2, a later reply.
      return new Response(
        JSON.stringify({ id: "TH_1", messages: [{ id: "M2", labelIds: ["INBOX"] }] }),
        { status: 200 }
      )
    }) as unknown as typeof fetch

    expect(await googlePresence("gmail", "tok", "TH_1")).toBe("there")
    // Confirms the probe asks about the CONVERSATION rather than the specific
    // message id that happens to equal the thread id — the property that
    // makes the answer right regardless of which message inside the thread
    // was the one that went away.
    expect(urls[0]).toContain("/threads/TH_1")
    expect(urls[0]).not.toContain("/messages/")
  })

  it("a live thread with none of its messages touched reads as THERE — not gone", async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: "TH_1",
            messages: [{ id: "TH_1", labelIds: ["INBOX"] }, { id: "M2", labelIds: ["INBOX"] }],
          }),
          { status: 200 }
        )
    ) as unknown as typeof fetch
    expect(await googlePresence("gmail", "tok", "TH_1")).toBe("there")
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
