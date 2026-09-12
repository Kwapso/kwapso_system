// THE FOURTH STATE, found by the hub's own review of feat/kb-video-link-ux:
// `read`/`refusedBecause` both null-safe on a door reply is not the same as
// both HONEST. A bare video link whose reply carries neither field (a door
// that hasn't landed the feature yet, or one that genuinely found nothing to
// say) must not fall through to the generic "assistant can now use it" toast
// — the source saved with an empty body, and that toast is a promise it
// cannot keep. `knowledgeCreateOutcome` is the pure decision `createKnowledge`
// (use-screen-actions.ts) dispatches on; tested directly here rather than
// through a rendered hook, the same way `linkReadSentence` beside it is.

import { describe, expect, it } from "vitest"

import { knowledgeCreateOutcome } from "@/lib/use-screen-actions"

// A faithful-enough fake of the real translator for THIS test's purpose:
// proving which outcome and which raw English get chosen, not exercising the
// translation engine itself.
const t = (english: string, vars?: Record<string, string | number>) =>
  vars ? english.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? "")) : english

const BASE = { title: "A talk", sourceUrl: "", body: "" }

describe("knowledgeCreateOutcome — the four things a video-link save can say", () => {
  it("a refusal wins over everything else", () => {
    const outcome = knowledgeCreateOutcome(
      { refusedBecause: "We recognise this host, but it publishes no transcript." },
      { ...BASE, sourceUrl: "https://youtube.com/watch?v=abc" },
      t
    )
    expect(outcome).toEqual({ kind: "refused", refusedBecause: "We recognise this host, but it publishes no transcript." })
  })

  it("a real read produces the warm, specific sentence", () => {
    const outcome = knowledgeCreateOutcome(
      { read: { provider: "YouTube", kind: "captions", words: 1240 } },
      { ...BASE, sourceUrl: "https://youtube.com/watch?v=abc" },
      t
    )
    expect(outcome).toEqual({ kind: "read", message: "Read 1240 words of captions from YouTube." })
  })

  // THE FOURTH STATE — the one this test file exists for.
  it("a bare video link with neither field back says so plainly, never the ordinary toast", () => {
    const outcome = knowledgeCreateOutcome({}, { ...BASE, sourceUrl: "https://youtube.com/watch?v=abc" }, t)
    expect(outcome.kind).toBe("silent-video")
    expect(outcome.kind === "silent-video" && outcome.message).toContain("didn't read anything from the link")
  })

  it("a video link that ALSO has a body typed in is an ordinary note, not the fourth state", () => {
    // A note that happens to carry a link, with words already beside it, is
    // not "a bare video link" — `willReadVideoLink`'s own twin condition in
    // the dialog agrees: only a link with nothing else beside it counts.
    const outcome = knowledgeCreateOutcome(
      {},
      { ...BASE, sourceUrl: "https://youtube.com/watch?v=abc", body: "Notes I wrote myself." },
      t
    )
    expect(outcome.kind).toBe("ordinary")
  })

  it("an ordinary note with no link at all is unaffected", () => {
    const outcome = knowledgeCreateOutcome({}, BASE, t)
    expect(outcome).toEqual({ kind: "ordinary", message: 'The assistant can now use "A talk".' })
  })
})
