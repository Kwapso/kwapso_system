// R83, TICKETS-ONLY, 21 Sep 2026 — Aurora's ruling, verbatim: "on tickets,
// reduce space above and under toolbar to 10px."
//
// MEASURED LIVE, 1440x900, All tab: tab list bottom 227.14, frame top 247.14
// (20px — the strip's own trailing `pb-[var(--tab-content-gap)]`, R63 part
// 3's tabs-to-container gap), toolbar top 257.14 (10px more — the card's own
// `--toolbar-lead-gap` lead, R83 ruling 7). 20 + 10 = 30px total above the
// toolbar, not the ruled 10. The "below" half was already right at the box
// level (toolbar bottom 313.14, table top 323.14 — 10px, `--toolbar-content-
// gap`); what reads bigger there is the kit `TableHead`'s own vertical
// centring inside the fixed 56px row (`--control-height-row`), which is
// vendored and read-only (CLAUDE.md, "the kit is the only UI input") — not
// touched here.
//
// THE FIX: `FolderTabStrip.tight` (shared/web/screen-engine/tabs-view.tsx)
// drops the strip's own trailing `pb-[var(--tab-content-gap)]` to zero on
// the ONE call site that asks for it — `tickets-collection.tsx`'s single
// `renderFolderTabs(...)` call, which every facet (Triage, Dashboard, Open,
// Ready, Waiting, Closed, All) and every view inside them (list, board,
// split) shares, so passing `tight: true` there covers all of them at once.
// Scoped the same way `CollectionCard`'s own `surface="plain"` is scoped — a
// flag on the one call site, never a new default — because every other
// `renderFolderTabs` host still owes R63's ordinary 20px tabs-to-container
// gap. `PINNED_STRIP_TIGHT_MARK` rides the same element as `PINNED_STRIP_MARK`
// so `web/app/globals.css` can correct `--pinned-chrome-h` for the same one
// strip too — that property is computed off `--tab-content-gap` for every
// `.pinned-strip` container (R63 part 3) regardless of `tight`, so without
// the correction a PINNED toolbar would open a 20px hole under the strip the
// moment the page scrolls, even though the two sit flush at rest.

import { readFileSync } from "node:fs"
import { join } from "node:path"

import { cleanup, render } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it } from "vitest"

import {
  renderFolderTabs,
  defaultTabsConfig,
  PINNED_STRIP_TIGHT_MARK,
} from "@shared/web/screen-engine/tabs-view"
import { PINNED_STRIP_MARK, PINNED_TOOLBAR } from "@shared/web/pinned-chrome"
import { CollectionCard } from "@/components/deep-link/screen-bits"
import { sourceFiles, stripComments } from "@shared/rules/source-scan"

const ROOT = join(import.meta.dirname, "..", "..")

/** Radix's `<Tabs>` measures itself; jsdom does neither of the things it
 * asks for — the identical defensive set `toolbar-lead-gap-card.test.tsx`
 * installs for the same reason. */
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

const fixtureConfig = {
  ...defaultTabsConfig,
  tabs: [{ value: "all", label: "All", icon: "", badge: "", badgeVariant: "" as const }],
}

describe("tickets strip gap — the tickets strip carries no bottom padding of its own", () => {
  it("DOM: a tight strip's own rendered element carries pb-0 and the tight mark, not pb-[var(--tab-content-gap)]", () => {
    render(
      <div className="flex flex-col">
        {renderFolderTabs({ config: fixtureConfig, value: "all", onValueChange: () => {}, tight: true })}
      </div>
    )
    const strip = document.querySelector(`.${PINNED_STRIP_MARK}`)
    expect(strip, "a tight strip must still draw the marked, sticky strip").toBeTruthy()
    expect(strip!.classList.contains(PINNED_STRIP_TIGHT_MARK), "a tight strip must carry the tight mark too").toBe(
      true
    )
    expect(
      strip!.classList.contains("pb-0"),
      "a tight strip must override the strip's own trailing gap to zero"
    ).toBe(true)
    expect(
      Array.from(strip!.classList).some((c) => c.startsWith("pb-[var(--tab-content-gap)")),
      "a tight strip must not still carry the ordinary strip's trailing pb-[var(--tab-content-gap)] utility — tailwind-merge must have dropped it, not merely added pb-0 beside it"
    ).toBe(false)
  })

  it("DOM: an ordinary (non-tight) strip is untouched — still carries pb-[var(--tab-content-gap)], never pb-0 or the tight mark", () => {
    render(
      <div className="flex flex-col">
        {renderFolderTabs({ config: fixtureConfig, value: "all", onValueChange: () => {} })}
      </div>
    )
    const strip = document.querySelector(`.${PINNED_STRIP_MARK}`)
    expect(strip, "an ordinary strip must still draw the marked, sticky strip").toBeTruthy()
    expect(
      strip!.classList.contains(PINNED_STRIP_TIGHT_MARK),
      "an ordinary strip must never carry the tight mark — every other renderFolderTabs host keeps R63's ordinary 20px gap"
    ).toBe(false)
    expect(
      Array.from(strip!.classList).some((c) => c.startsWith("pb-[var(--tab-content-gap)")),
      "an ordinary strip must keep its real trailing gap"
    ).toBe(true)
  })

  it("DOM: the frame follows a tight strip directly — the card is still the strip's own next sibling, and the toolbar is still CardContent's first child", () => {
    render(
      <div className="flex flex-col">
        {renderFolderTabs({ config: fixtureConfig, value: "all", onValueChange: () => {}, tight: true })}
        <CollectionCard surface="plain">
          <div data-slot="toolbar-row-pin" className={PINNED_TOOLBAR}>
            <div data-slot="toolbar-row-column">the toolbar</div>
          </div>
          <div data-testid="rows">the rows</div>
        </CollectionCard>
      </div>
    )
    const strip = document.querySelector(`.${PINNED_STRIP_MARK}`)
    const card = document.querySelector('[data-slot="card"]')
    expect(
      strip!.nextElementSibling,
      "the card must still be the tight strip's own next sibling — tickets-collection.tsx's exact shape"
    ).toBe(card)

    const content = card!.querySelector(':scope > [data-slot="card-content"]')
    expect(
      content!.firstElementChild?.getAttribute("data-slot"),
      "the pinned toolbar must still be the card content's first child, so R83's own --toolbar-lead-gap rule reaches it"
    ).toBe("toolbar-row-pin")
  })

  it("SOURCE: tickets-collection.tsx's own renderFolderTabs call passes tight: true", () => {
    const src = stripComments(
      readFileSync(join(ROOT, "web", "components", "tickets", "tickets-collection.tsx"), "utf8")
    )
    expect(
      /renderFolderTabs\(\{[\s\S]{0,400}?tight:\s*true/.test(src),
      "tickets-collection.tsx's own renderFolderTabs( call must pass tight: true — the one call site every tickets facet and view (list/board/split) shares"
    ).toBe(true)
  })

  it("SOURCE: no other renderFolderTabs( call site in web/ or web-portal/ passes tight — the flag is tickets-only, never a new default", () => {
    const offenders: string[] = []
    for (const f of sourceFiles([join(ROOT, "web"), join(ROOT, "web-portal")], {
      extensions: [".tsx"],
      relativeTo: ROOT,
      skipTests: true,
    })) {
      if (f.rel === "web/components/tickets/tickets-collection.tsx") continue
      const src = stripComments(f.source)
      if (/renderFolderTabs\(\{[\s\S]{0,400}?tight:\s*true/.test(src)) offenders.push(f.rel)
    }
    expect(
      offenders,
      `only tickets-collection.tsx may pass tight: true to renderFolderTabs — every other host still owes R63's ordinary 20px tabs-to-container gap:\n  ${offenders.join("\n  ")}`
    ).toEqual([])
  })

  it("CSS: globals.css corrects --pinned-chrome-h for a tight, pinned strip, keyed to the tight mark alongside the ordinary strip mark — never a rule that reaches every strip", () => {
    const css = readFileSync(join(ROOT, "web", "app", "globals.css"), "utf8")
    const tightRule = /\*:has\(>\s*\.pinned-strip\.pinned-strip-tight\)\s*\{\s*--pinned-chrome-h:\s*var\(--tab-strip-h\)\s*;\s*\}/
    expect(
      css,
      "web/app/globals.css must set --pinned-chrome-h to the bare --tab-strip-h (no --tab-content-gap) for a container whose pinned strip also carries .pinned-strip-tight, or a PINNED toolbar opens a 20px hole under a tight strip on scroll even though the two sit flush at rest"
    ).toMatch(tightRule)

    // AND THE ORDINARY RULE MUST STILL BE THERE, UNTOUCHED — every other
    // renderFolderTabs host (SectionWithCreate, PagedFind's own tabs prop)
    // still owes the real 20px, and the tight rule must not have replaced it.
    const ordinaryRule = /\*:has\(>\s*\.pinned-strip\)\s*\{\s*--pinned-chrome-h:\s*calc\(var\(--tab-strip-h\)\s*\+\s*var\(--tab-content-gap\)\)\s*;\s*\}/
    expect(
      css,
      "the ordinary *:has(> .pinned-strip) rule must still set --pinned-chrome-h to tab-strip-h + tab-content-gap — untouched by the tickets-only correction"
    ).toMatch(ordinaryRule)
  })

  it("RED PROOF: a stylesheet with only the ordinary rule (no tight correction at all) does not satisfy today's tight rule", () => {
    const ordinaryOnly = `
      *:has(> .pinned-strip) {
        --pinned-chrome-h: calc(var(--tab-strip-h) + var(--tab-content-gap));
      }
    `
    const tightRule = /\*:has\(>\s*\.pinned-strip\.pinned-strip-tight\)\s*\{\s*--pinned-chrome-h:\s*var\(--tab-strip-h\)\s*;\s*\}/
    expect(
      ordinaryOnly,
      "the pre-fix stylesheet (ordinary rule alone) must not read as today's tight correction"
    ).not.toMatch(tightRule)
  })
})
