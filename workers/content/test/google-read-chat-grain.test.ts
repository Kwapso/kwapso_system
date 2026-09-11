// BUILD-5 §2's grain rule for chat, at the one place it actually lives:
// `chatThreads` folds a space's messages into one source per conversation
// (existing behaviour), and within that conversation the body is now cut into
// RUNS by `chunkChat` rather than joined as one undifferentiated blob.
//
// KB-AUDIT.md §4.9, measured against the agency's own corpus: "one thread is
// one ~348-char blob, speakers inline… per-turn or per-topic segmentation
// with speaker and timestamp carried on every chunk is the obvious
// direction." A long thread whose body has no boundary in it hands the
// generic paragraph cutter (`chunkText`, which splits on a blank line before
// it ever looks at a sentence) nothing to prefer over any other cut point —
// so a chunk can land mid-turn, and the citation that comes back loses which
// half of an exchange it is quoting.

import { describe, expect, it } from "vitest"

import { chatThreads } from "../src/lib/google-read"
import { chunkGrainText } from "../src/lib/knowledge-text"

/** One message, shaped exactly as `chatMessages` returns one — the fields
 * `chatThreads` actually reads. */
const msg = (id: string, thread: string, sender: string, at: string, text: string) => ({
  id,
  space: "spaces/AAA",
  thread,
  sender,
  senderNamed: true,
  senderIsApp: false,
  url: `https://chat.google.com/room/AAA/${id}`,
  text,
  createdAt: at,
})

describe("chatThreads — the body is runs, not one blob", () => {
  it("keeps a short exchange's line-by-line attribution unchanged", () => {
    const [folded] = chatThreads([
      msg("m1", "t1", "Ana", "2026-09-07T10:00:00Z", "first thing said"),
      msg("m2", "t1", "Aurora", "2026-09-07T10:01:00Z", "second thing said"),
    ])
    // `folded.text` itself now carries a grain mark in front of the run (tracker
    // `a-pieces`, so the run's speaker/time survive being flattened into this
    // one field) — `google-ingest.test.ts` asserts the RAW body with `.toContain`,
    // which the mark doesn't disturb. What must still hold BYTE FOR BYTE is the
    // prose a citation would actually show, which is what `chunkGrainText`
    // recovers.
    const [piece] = chunkGrainText(folded.text)
    expect(piece.text).toBe("Ana: first thing said\nAurora: second thing said")
    expect(piece.speaker).toBe("Ana, Aurora")
  })

  it("cuts a long thread into runs separated by a blank line, never mid-message", () => {
    const messages = Array.from({ length: 20 }, (_, i) =>
      msg(`m${i}`, "t1", i % 2 === 0 ? "Ana" : "Aurora", `2026-09-07T10:${String(i).padStart(2, "0")}:00Z`, `line number ${i}`)
    )
    const [folded] = chatThreads(messages)
    const pieces = chunkGrainText(folded.text)
    expect(pieces.length).toBeGreaterThan(1)
    // Nothing is lost, and nothing is fused across a run boundary mid-message:
    // every "line number N" appears whole, exactly once.
    const joined = pieces.map((p) => p.text).join(" ")
    for (let i = 0; i < 20; i++) expect(joined.match(new RegExp(`line number ${i}\\b`, "g"))?.length).toBe(1)
    // Each run is still attributed, both in its own prose and in its recovered
    // `speaker` field — never re-attributed by anything upstream. A run can mix
    // both voices (alternating messages, one run of up to six), so `speaker`
    // is one name or a comma-joined few, never something outside that set.
    for (const p of pieces) {
      expect(p.text).toMatch(/^(Ana|Aurora): /)
      expect(p.speaker?.split(", ").every((s) => s === "Ana" || s === "Aurora")).toBe(true)
    }
  })

  it("still folds to the newest message's time and every voice, run-cutting aside", () => {
    const [folded] = chatThreads([
      msg("m1", "t1", "Ana", "2026-09-07T10:00:00Z", "hello"),
      msg("m2", "t1", "Aurora", "2026-09-07T10:05:00Z", "hi back"),
    ])
    expect(folded.createdAt).toBe("2026-09-07T10:05:00Z")
    expect(folded.sender).toBe("Ana, Aurora")
  })
})
