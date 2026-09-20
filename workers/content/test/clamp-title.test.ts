// `clampTitle` (shared/clamp-title.ts): R87's I1 amendment, dated 21 Sep
// 2026, her verbatim pick: "clmap on import." TITLE_MAX_CHARS (shared/types.ts)
// is the FORM's ceiling, enforced by `requireText`/`optionalText` as a
// refusal, a person over the cap shortens it themselves. This is the OTHER
// half: every writer that hands a knowledge source's title a string nobody
// typed (a file's own name, a mirrored record, a Google import, a seeded
// glossary word) clamps it here instead, so the cut is visible (a single
// ellipsis, U+2026) and never lands mid-word when a space is close enough to
// use instead.

import { describe, expect, it } from "vitest"

import { clampTitle } from "@shared/clamp-title"
import { TITLE_MAX_CHARS } from "@shared/types"

describe("clampTitle", () => {
  it("leaves a short title completely unchanged", () => {
    const title = "Quarterly report"
    expect(clampTitle(title)).toBe(title)
  })

  it("leaves a title of exactly the cap unchanged, byte for byte", () => {
    const title = "A".repeat(TITLE_MAX_CHARS)
    expect(title.length).toBe(50)
    expect(clampTitle(title)).toBe(title)
  })

  it("cuts at a space that sits within the last 12 characters of the cut, never mid-word", () => {
    // 40 "A"s, a space, then 19 "B"s: 60 characters, well past the cap. The
    // hard 49-character cut would land inside the run of "B"s (at the 9th),
    // but the space at index 40 sits inside the last-12 window of that cut
    // (indices 37-48), so the cut must land there instead.
    const title = `${"A".repeat(40)} ${"B".repeat(19)}`
    expect(title.length).toBe(60)
    const result = clampTitle(title)
    expect(result).toBe(`${"A".repeat(40)}…`)
    // Never a half-formed word: the cut is either the whole run of "A"s or
    // nothing of the "B"s at all.
    expect(result).not.toMatch(/B/)
  })

  it("hard-cuts at 49 characters plus the ellipsis when no space is anywhere near the cut", () => {
    const title = "A".repeat(60)
    const result = clampTitle(title)
    expect(result).toBe(`${"A".repeat(49)}…`)
    expect(result.length).toBe(50)
  })

  it("trims a trailing space left behind by the word-boundary cut before appending the ellipsis", () => {
    // 35 "A"s, THREE spaces, then 20 "C"s: the last of those three spaces is
    // the one inside the window and wins the cut, but slicing up to (and
    // excluding) it still leaves the first two spaces trailing; they must be
    // trimmed rather than shown right before the ellipsis.
    const title = `${"A".repeat(35)}   ${"C".repeat(20)}`
    expect(title.length).toBe(58)
    const result = clampTitle(title)
    expect(result).toBe(`${"A".repeat(35)}…`)
    expect(result).not.toMatch(/ …/)
  })

  it("ends every clamped title with exactly one ellipsis character, never three dots", () => {
    const result = clampTitle("A".repeat(80))
    expect(result.endsWith("…")).toBe(true)
    expect(result).not.toMatch(/\.\.\./)
    expect(result.match(/…/g)?.length).toBe(1)
  })

  it("honours a custom cap when one is passed, rather than always TITLE_MAX_CHARS", () => {
    expect(clampTitle("Hello there world", 10)).toBe("Hello…")
  })
})
