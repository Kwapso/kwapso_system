// R83 AMENDMENT, 16 Sep 2026 — THE CARD OWES NO SECOND LEADING GAP WHEN THE
// STRIP ALREADY PAID ONE.
//
// `toolbar-lead-gap.test.ts` (this file's own sibling) censuses a DIFFERENT
// double-payment — a screen wrapping `renderFolderTabs(…)` and its card in a
// `gap-*`/`space-y-*` column of its own. That census is still correct. This
// file proves the OTHER half, found the same day by measuring staging rather
// than re-reading the census: a `<CollectionCard>` whose first child is a
// pinned toolbar (`data-slot="toolbar-row-pin"`) also spends `CardContent`'s
// own leading `p-4`/`lg:p-[var(--space-7)]` inset on top of the strip's own,
// correct `pb-[var(--tab-content-gap)]` — a second, unrelated 16-to-32px the
// wrapping-column census has no way to see, because there is no wrapping
// column here at all; the extra space is INSIDE the card.
//
// MEASURED, 16 Sep 2026: Tasks (1600px) — tab strip bottom to toolbar top
// 52px, toolbar bottom to content top (the toolbar's own
// `mb-[var(--toolbar-content-gap)]`) 20px. Settings › Team › Members and
// Contacts (1280px) — 44px above, 20px below. The client's ruling: "reduce
// the spacing above ALL TOOLBARS. i want it exactly as its currently below,
// make it like that above."
//
// THE FIX, in `web/app/globals.css`: `.pinned-strip + [data-slot="card"]`
// zeroes two things together — `[data-slot="card-content"]`'s own real
// `padding-top`, and the R63 `--pinned-lead` custom property
// (`shared/web/pinned-chrome.ts`) that reproduces it while a toolbar is
// pinned. Both have to move together: `PINNED_TOOLBAR`'s own
// `mt-[calc(var(--pinned-lead,0px)*-1)] pt-[var(--pinned-lead,0px)]` pair
// only CANCELS a lead at rest, it does not remove one — leaving
// `--pinned-lead` at the card's old 16/32 ladder while the real padding
// dropped to zero would pull a pinned toolbar UP PAST the card's own top
// edge and into the strip above it.
//
// TWO PROOFS. First, a REAL RENDER of `renderFolderTabs` + `<CollectionCard>`
// (the exact composition `SectionWithCreate`, `PagedFind`'s `wrap` and
// `tickets-collection.tsx` all draw) shows the DOM adjacency the new CSS rule
// depends on: `.pinned-strip` is the card's own PRECEDING SIBLING, and the
// toolbar is `[data-slot="card-content"]`'s own FIRST CHILD — a sibling
// selector and a `>` child combinator match nothing otherwise, so a future
// refactor that puts anything between them silently un-fixes this and this
// test catches it structurally, without needing jsdom to compute CSS layout.
// Second, a CENSUS over `web/app/globals.css` itself proves the override
// rule the render above depends on is actually there, spelled exactly right
// (`padding-top: 0px`, `--pinned-lead: 0px`) — read fresh off disk, not
// duplicated as a second copy of the string.

import { readFileSync } from "node:fs"
import { join } from "node:path"

import { cleanup, render } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it } from "vitest"

import { renderFolderTabs, defaultTabsConfig } from "@shared/web/screen-engine/tabs-view"
import { PINNED_TOOLBAR } from "@shared/web/pinned-chrome"
import { CollectionCard } from "@/components/deep-link/screen-bits"

const ROOT = join(import.meta.dirname, "..", "..")

/** Radix's `<Tabs>` measures itself; jsdom does neither of the things it
 * asks for. The same defensive set `paged-find-toolbar-is-one-container.test.tsx`
 * installs for the identical reason. */
beforeAll(() => {
  Object.assign(window.HTMLElement.prototype, {
    scrollIntoView: () => {},
    hasPointerCapture: () => false,
    releasePointerCapture: () => {},
    setPointerCapture: () => {},
  })
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

afterEach(cleanup)

/** The exact composition every current call site draws: a gapless column
 * holding `renderFolderTabs(…)` then a `<CollectionCard>` whose first child
 * is a pinned toolbar — `SectionWithCreate`'s own shape (screen-bits.tsx),
 * `PagedFind`'s `wrap`, and `tickets-collection.tsx`'s direct calls all
 * reduce to this. The toolbar itself is a stand-in for `<ToolbarRow>`/
 * `PagedFind`'s own hand-drawn track — both wear the SAME `data-slot=
 * "toolbar-row-pin"` + `PINNED_TOOLBAR` pair this file reads off
 * `shared/web/pinned-chrome.ts` directly, so this is not a second, invented
 * shape. */
function CollectionFixture() {
  return (
    <div className="flex flex-col">
      {renderFolderTabs({
        config: {
          ...defaultTabsConfig,
          tabs: [{ value: "a", label: "A", icon: "", badge: "", badgeVariant: "" }],
        },
        value: "a",
        onValueChange: () => {},
      })}
      <CollectionCard>
        <div data-slot="toolbar-row-pin" className={PINNED_TOOLBAR}>
          <div data-slot="toolbar-row-column">the toolbar</div>
        </div>
        <div data-testid="rows">the rows</div>
      </CollectionCard>
    </div>
  )
}

describe("R83 amendment — the card owes no second leading gap above a toolbar it hosts", () => {
  it("DOM: the strip is the card's own preceding sibling, and the toolbar is the card content's first child", () => {
    render(<CollectionFixture />)

    const strip = document.querySelector(".pinned-strip")
    expect(strip, "renderFolderTabs must draw the marked, sticky strip").toBeTruthy()

    const card = document.querySelector('[data-slot="card"]')
    expect(card, "CollectionCard must render the kit's Card, data-slot=\"card\"").toBeTruthy()

    // THE EXACT ADJACENCY THE NEW CSS RULE KEYS OFF —
    // `.pinned-strip + [data-slot="card"]` matches only an IMMEDIATE sibling.
    expect(
      strip!.nextElementSibling,
      "the card must be the strip's own next sibling, or `.pinned-strip + [data-slot=\"card\"]` in globals.css matches nothing and the card's old top padding comes back"
    ).toBe(card)

    const content = card!.querySelector(':scope > [data-slot="card-content"]')
    expect(content, "CollectionCard must wrap its children in the kit's CardContent, one level in").toBeTruthy()

    // AND THE `>` CHILD COMBINATOR THE SAME RULE USES —
    // `[data-slot="card-content"]` must have the toolbar as its FIRST child,
    // or the padding it zeroes was never the toolbar's own leading space.
    expect(
      content!.firstElementChild?.getAttribute("data-slot"),
      "the pinned toolbar must be the card content's first child"
    ).toBe("toolbar-row-pin")
  })

  it("CSS: globals.css zeroes both halves of the card's leading inset, tied to the strip's own marker", () => {
    const css = readFileSync(join(ROOT, "web", "app", "globals.css"), "utf8")

    const leadRule = /\.pinned-strip\s*\+\s*\[data-slot="card"\]\s*\{\s*--pinned-lead:\s*0px;\s*\}/
    const paddingRule =
      /\.pinned-strip\s*\+\s*\[data-slot="card"\]\s*>\s*\[data-slot="card-content"\]\s*\{\s*padding-top:\s*0px;\s*\}/

    expect(
      css,
      "web/app/globals.css must zero [data-slot=\"card-content\"]'s own padding-top when it is the strip's next sibling — that top padding is what pushes a leading toolbar down a second time, on top of the strip's own pb-[var(--tab-content-gap)]"
    ).toMatch(paddingRule)

    expect(
      css,
      "and web/app/globals.css must zero the SAME sibling's --pinned-lead alongside it — PINNED_TOOLBAR's own mt/pt pair (shared/web/pinned-chrome.ts) only cancels a lead at rest; leaving --pinned-lead at the card's old 16/32 ladder while the real padding drops to zero pulls a PINNED toolbar up past the card's own top edge"
    ).toMatch(leadRule)
  })

  // THE RED PROOF — the shape every current screen was actually in before
  // this amendment: the strip's own gap is correct, but nothing stops the
  // card's own ladder padding from adding a second, unrelated number above a
  // leading toolbar. Replayed against a fixture rather than a git diff, the
  // same discipline toolbar-lead-gap.test.ts's own waves-screen fixture uses.
  it("the pre-fix stylesheet (no override at all) is exactly what the CSS census above would have caught", () => {
    const preFix = `
      .pinned-strip { background: var(--surface-raised); }
      *:has(> .pinned-strip) { --pinned-chrome-h: calc(var(--tab-strip-h) + var(--tab-content-gap)); }
    `
    const leadRule = /\.pinned-strip\s*\+\s*\[data-slot="card"\]\s*\{\s*--pinned-lead:\s*0px;\s*\}/
    const paddingRule =
      /\.pinned-strip\s*\+\s*\[data-slot="card"\]\s*>\s*\[data-slot="card-content"\]\s*\{\s*padding-top:\s*0px;\s*\}/
    expect(preFix, "the pre-fix stylesheet has no override rule at all").not.toMatch(paddingRule)
    expect(preFix, "and no --pinned-lead override either").not.toMatch(leadRule)
  })
})
