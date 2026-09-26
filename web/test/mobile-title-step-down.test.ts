// M7/M8 (25 Sep 2026, Alaap, documents/ui-rulebook/30-9-mobile.md): below
// `sm` a collection screen's title steps down one rung. `mobile-audit
// findings-agency.md` cause 1 measured `Headline size="display-m"` at 63px
// live on a phone (this account's scale setting), on every collection
// screen and on Home — ~30px of the ~430px a phone has for the whole
// collection above the fold, spent on the title alone.
//
// The fix is one `<Headline size="display-m">`, unchanged, with
// `max-sm:text-3xl` added to its own className: `display-m`'s `text-5xl`
// and the h2 rung's `text-3xl` are the same utility group, so tailwind-merge
// (this repo's `cn`) keeps exactly one winner per breakpoint scope and `sm`
// and up render byte-identical to before this ruling. One node, not two —
// deliberately, so the element stays the card's own preceding sibling
// (`toolbar-lead-gap-card.test.tsx`'s own law) at every width.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { stripComments } from "@shared/rules/source-scan"

const WEB = join(__dirname, "..")
const read = (rel: string) => stripComments(readFileSync(join(WEB, rel), "utf8"))

describe("collection and Home titles step down below sm (M7/M8)", () => {
  it("collection-heading.tsx's Headline carries max-sm:text-3xl beside size=\"display-m\"", () => {
    const src = read("components/records/collection-heading.tsx")
    const idx = src.indexOf('size="display-m"')
    expect(idx, 'size="display-m" not found in collection-heading.tsx').toBeGreaterThan(-1)
    const window = src.slice(Math.max(0, idx - 80), idx + 300)
    expect(
      /<Headline\b/.test(window),
      "the display-m size must belong to a <Headline>"
    ).toBe(true)
    expect(
      /\bmax-sm:text-3xl\b/.test(window),
      "collection-heading.tsx's Headline must carry max-sm:text-3xl to step the title down below sm"
    ).toBe(true)
    // Exactly one Headline carrying display-m — not a second node duplicating it.
    const displayMHeadlines = (src.match(/<Headline\b[^>]*size="display-m"/g) ?? []).length
    expect(
      displayMHeadlines,
      "collection-heading.tsx must render exactly one display-m Headline, not a fragment of two"
    ).toBe(1)
  })

  it("home-screen.tsx's team-name Headline carries max-sm:text-3xl beside size=\"display-m\"", () => {
    const src = read("components/screens/home-screen.tsx")
    const idx = src.indexOf('size="display-m"')
    expect(idx, 'size="display-m" not found in home-screen.tsx').toBeGreaterThan(-1)
    const window = src.slice(Math.max(0, idx - 80), idx + 300)
    expect(
      /<Headline\b/.test(window),
      "the display-m size must belong to a <Headline>"
    ).toBe(true)
    expect(
      /\bmax-sm:text-3xl\b/.test(window),
      "home-screen.tsx's team-name Headline must carry max-sm:text-3xl to step the title down below sm"
    ).toBe(true)
    const displayMHeadlines = (src.match(/<Headline\b[^>]*size="display-m"/g) ?? []).length
    expect(
      displayMHeadlines,
      "home-screen.tsx must render exactly one display-m Headline for the team name, not a fragment of two"
    ).toBe(1)
  })
})
