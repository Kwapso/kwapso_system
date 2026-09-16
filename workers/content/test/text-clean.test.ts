// `stripPictographs` (shared/text-clean.ts) — the display/ingest half of the
// client's 16 Sep 2026 ruling on meeting titles: "kill the emojis. Also, when
// they're in the name, just remove them, please." Unlike `optionalMark`
// (shared/workers/validate.ts, tested one file over in `validate.test.ts`),
// which REFUSES a pictograph in a short vocabulary-mark field, this function
// REMOVES one from prose and keeps the words around it — so this suite locks
// the strip-and-collapse behaviour rather than a thrown `GuardError`.

import { describe, expect, it } from "vitest"

import { stripPictographs } from "@shared/text-clean"

describe("stripPictographs", () => {
  it("removes a trailing emoji and trims the space it leaves behind", () => {
    expect(stripPictographs("Kickoff \u{1F680}")).toBe("Kickoff")
  })

  it("removes a mid-string emoji and collapses the doubled space, never leaving one behind", () => {
    expect(stripPictographs("Kickoff \u{1F680} call")).toBe("Kickoff call")
  })

  it("removes two adjacent emoji and still collapses to one space", () => {
    expect(stripPictographs("Call \u{1F680}\u{1F389} today")).toBe("Call today")
  })

  it("removes a leading emoji and trims the result", () => {
    expect(stripPictographs("\u{1F389} Party time")).toBe("Party time")
  })

  it("removes emoji at both ends and trims both", () => {
    expect(stripPictographs(" \u{1F389} Party time \u{1F389} ")).toBe("Party time")
  })

  it("removes a ZWJ-joined sequence (a family emoji) as one glyph, words intact either side", () => {
    // Man + ZWJ + Woman + ZWJ + Girl — every codepoint here is either
    // Extended_Pictographic or the ZWJ combiner, so nothing of the glyph
    // itself should survive.
    const family = "\u{1F468}‍\u{1F469}‍\u{1F467}"
    expect(stripPictographs(`Planning ${family} time`)).toBe("Planning time")
  })

  it("removes a variation-selector-16 emoji (text glyph forced to its emoji style)", () => {
    // U+2708 AIRPLANE is itself Extended_Pictographic; VS16 is the combiner.
    expect(stripPictographs("Flight ✈️ booking")).toBe("Flight booking")
  })

  it("removes the keycap combiners around a digit but keeps the plain digit", () => {
    // "1️⃣" = DIGIT ONE + VS16 + COMBINING ENCLOSING KEYCAP. The digit itself
    // is plain ASCII, not a pictograph, so it is the one character of the
    // three that should survive.
    expect(stripPictographs("Round 1️⃣ results")).toBe("Round 1 results")
  })

  it("removes a flag (a Regional_Indicator pair)", () => {
    // 🇩🇪 — REGIONAL INDICATOR SYMBOL LETTER D + LETTER E.
    const flag = "\u{1F1E9}\u{1F1EA}"
    expect(stripPictographs(`Berlin office ${flag} sync`)).toBe("Berlin office sync")
  })

  it("leaves plain text with no pictograph completely unchanged", () => {
    expect(stripPictographs("Kickoff with Marianne")).toBe("Kickoff with Marianne")
  })

  it("leaves a title that was only an emoji as an empty string — the caller's fallback decides what that becomes", () => {
    expect(stripPictographs("\u{1F680}")).toBe("")
  })

  it("passes null and undefined straight through, the same contract mendMojibake carries", () => {
    expect(stripPictographs(null)).toBeNull()
    expect(stripPictographs(undefined)).toBeUndefined()
  })

  it("never touches a typographic dingbat the app draws on purpose (a close ✕, a department's ★)", () => {
    // These are NOT Extended_Pictographic — the same distinction R66's own
    // `optionalMark` relies on (UI-RULEBOOK.md's B7/R66 note: "the
    // typographic dingbats this app and the pinned kit legitimately draw").
    expect(stripPictographs("Close ✕")).toBe("Close ✕")
    expect(stripPictographs("Priority ★")).toBe("Priority ★")
  })
})
