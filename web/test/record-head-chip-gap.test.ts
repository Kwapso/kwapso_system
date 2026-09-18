// THE IDENTITY CHIPS ROW'S GAP ABOVE THE TITLE — CLIENT RULING, 18 SEP 2026,
// VERBATIM: "reduc the space between chips and title." The side-by-side
// options were built the way this book's own working agreement requires
// ("decisions need a visual… build a side-by-side page and point at it"),
// and her pick, verbatim, was "t1 and c2" — C2 named as half of the gap that
// was live that day. The gap live that day was `--space-4` (16px, the
// 2026-09-01 ruling record-chrome.tsx's own header comment still carries),
// so C2 landed at 8px, `mb-[var(--space-2)]`.
//
// CORRECTED THE SAME DAY, reading the deployed 8px back — CLIENT RULING,
// VERBATIM: "from chips to tile only 10." 8px undershot; the pick is now
// `mb-[var(--space-2h)]` (10px), not `--space-2` any more.
//
// jsdom RUNS NO LAYOUT ENGINE (web/test/setup.ts's own header), so — the same
// discipline record-head-mark.test.tsx already holds to for this exact
// file — the claim is pinned structurally, off the SOURCE, never off a
// measured pixel. This suite reads record-chrome.tsx directly and asserts
// the identity-chips wrapper spends `--space-2h`, not `--space-2`, `--space-4`
// or any other rung, and that the old value is truly gone rather than merely
// joined by the new one.

import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const ROOT = join(__dirname, "..", "..")
const read = (p: string) => readFileSync(join(ROOT, ...p.split("/")), "utf8")

describe("the record head's identity-chips gap above the title (client ruling 2026-09-18, C2 → 10px)", () => {
  it("spends mb-[var(--space-2h)] on the identity chips wrapper", () => {
    const src = read("web/components/records/record-chrome.tsx")
    expect(src).toMatch(/<span className="mb-\[var\(--space-2h\)\]">\{identityChips\}<\/span>/)
  })

  it("no longer spends --space-2 or --space-4 on that span — the pre-correction values are gone, not just superseded", () => {
    const src = read("web/components/records/record-chrome.tsx")
    expect(src).not.toMatch(/<span className="mb-\[var\(--space-2\)\]">\{identityChips\}<\/span>/)
    expect(src).not.toMatch(/<span className="mb-\[var\(--space-4\)\]">\{identityChips\}<\/span>/)
  })

  it("the comment above the span records the 18 Sep 2026 correction, verbatim, and the 10px pick", () => {
    const src = read("web/components/records/record-chrome.tsx")
    expect(src).toMatch(/18 SEP 2026/i)
    expect(src).toMatch(/reduc the space between chips and title/i)
    expect(src).toMatch(/from chips to tile only 10/i)
    expect(src).toMatch(/10px/)
  })
})
