// THE COLLECTION STRIP PAYS NO TRAILING GAP OF ITS OWN — APP WIDE (R83,
// rulebook L43, 21 Sep 2026). Aurora, verbatim, over the live tickets list:
// "on tickets, reduce space above and under toolbar to 10px." Then, the same
// day, over the Minimal Kit page: "go an implement this appwide".
//
// RENAMED FROM `tickets-strip-gap.test.tsx` THE DAY THE SCOPE WENT, because
// the old name had become a lie: this was a tickets-only flag
// (`FolderTabStrip.tight`) and is now the only rhythm `renderFolderTabs`
// knows. Nothing else in the repo named the old path.
//
// MEASURED LIVE, 1440x900, All tab, before the fix: tab list bottom 227.14,
// frame top 247.14 (20px — the strip's own trailing
// `pb-[var(--tab-content-gap)]`, R63 part 3's tabs-to-container gap), toolbar
// top 257.14 (10px more — the card's own `--toolbar-lead-gap` lead, R83
// ruling 7). 20 + 10 = 30px total above the toolbar, not the ruled 10.
//
// THE SHAPE, AND WHO PAYS WHAT. The strip drops its own trailing padding to
// zero and the CARD under it pays the whole 10px as real `padding-top` — the
// arrangement she validated live, kept rather than rebuilt. The kit names the
// same rhythm as `TABS_STRIP_GAP_PLAIN` (`--space-2h`, tabs.tsx v1.2.149) and
// spends it on the strip's own box instead; the two agree on the NUMBER and
// differ on the payer, and the objection the kit's own note raises against
// the app's payer — that a distance living anywhere but the strip stops
// holding the moment the strip goes sticky — is answered by the
// `--pinned-chrome-h` rule this file's last two cases pin.

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

describe("strip gap — every collection strip carries no bottom padding of its own", () => {
  it("DOM: a strip's own rendered element carries pb-0 and the tight mark, not pb-[var(--tab-content-gap)]", () => {
    render(
      <div className="flex flex-col">
        {renderFolderTabs({ config: fixtureConfig, value: "all", onValueChange: () => {} })}
      </div>
    )
    const strip = document.querySelector(`.${PINNED_STRIP_MARK}`)
    expect(strip, "the strip must still draw the marked, sticky strip").toBeTruthy()
    expect(strip!.classList.contains(PINNED_STRIP_TIGHT_MARK), "every strip carries the tight mark now").toBe(
      true
    )
    expect(
      strip!.classList.contains("pb-0"),
      "the strip must override its own trailing gap to zero"
    ).toBe(true)
    expect(
      Array.from(strip!.classList).some((c) => c.startsWith("pb-[var(--tab-content-gap)")),
      "the strip must not still carry the old trailing pb-[var(--tab-content-gap)] utility — tailwind-merge must have dropped it, not merely added pb-0 beside it"
    ).toBe(false)
  })

  // THE HALF THAT USED TO SAY "EVERY OTHER HOST IS UNTOUCHED", READ THE OTHER
  // WAY ROUND. There is no second shape to compare against any more — that is
  // the whole ruling — so the proof that this is not vacuous is that the
  // ONE shape reaches a host that never asked for it: `renderFolderTabs` is
  // called with the plainest possible spec, no flag of any kind, and still
  // draws the tight rhythm.
  it("DOM: a host that passes nothing but config/value/onValueChange still gets the tight rhythm", () => {
    render(
      <div className="flex flex-col">
        {renderFolderTabs({ config: fixtureConfig, value: "all", onValueChange: () => {} })}
      </div>
    )
    const strip = document.querySelector(`.${PINNED_STRIP_MARK}`)
    expect(strip!.classList.contains(PINNED_STRIP_TIGHT_MARK)).toBe(true)
    expect(strip!.classList.contains("pb-0")).toBe(true)
  })

  it("DOM: the frame follows the strip directly — the card is still the strip's own next sibling, and the toolbar is still CardContent's first child", () => {
    render(
      <div className="flex flex-col">
        {renderFolderTabs({ config: fixtureConfig, value: "all", onValueChange: () => {} })}
        <CollectionCard>
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
      "the card must still be the strip's own next sibling — tickets-collection.tsx's exact shape"
    ).toBe(card)

    const content = card!.querySelector(':scope > [data-slot="card-content"]')
    expect(
      content!.firstElementChild?.getAttribute("data-slot"),
      "the pinned toolbar must still be the card content's first child, so R83's own --toolbar-lead-gap rule reaches it"
    ).toBe("toolbar-row-pin")
  })

  // SOURCE: THE FLAG IS GONE, NOT MERELY UNUSED. A `tight` prop left on the
  // type with nobody passing it would read identically at runtime and would
  // be a second door back into the retired shape.
  it("SOURCE: no renderFolderTabs( call site in web/ or web-portal/ passes a tight flag, and the type no longer declares one", () => {
    const offenders: string[] = []
    for (const f of sourceFiles([join(ROOT, "web"), join(ROOT, "web-portal")], {
      extensions: [".tsx"],
      relativeTo: ROOT,
      skipTests: true,
    })) {
      const src = stripComments(f.source)
      if (/renderFolderTabs\(\{[\s\S]{0,400}?tight:\s*true/.test(src)) offenders.push(f.rel)
    }
    expect(
      offenders,
      `the tight flag is retired — every strip draws the one rhythm:\n  ${offenders.join("\n  ")}`
    ).toEqual([])

    const tabsView = stripComments(
      readFileSync(join(ROOT, "shared", "web", "screen-engine", "tabs-view.tsx"), "utf8")
    )
    expect(
      /tight\?:\s*boolean/.test(tabsView),
      "FolderTabStrip must no longer declare a tight flag — the rhythm is unconditional"
    ).toBe(false)
    expect(
      /className=\{cn\(STICKY_FOLDER_TABS,\s*`pb-0 \$\{PINNED_STRIP_TIGHT_MARK\}`\)\}/.test(tabsView),
      "renderFolderTabs must apply pb-0 and the tight mark unconditionally"
    ).toBe(true)
  })

  it("CSS: globals.css computes --pinned-chrome-h from the strip's own painted height alone, and the old tab-content-gap path is deleted", () => {
    // COMMENTS STRIPPED FIRST — this stylesheet quotes the DELETED rule
    // inside its own prose, beside the rule that replaced it, which is the
    // house discipline for an overturned argument (shared/spine.ts). A raw
    // read would find that quotation and report the rule as still live.
    // Through the SHARED stripper, never a regex retyped here: `web/test/
    // source-scan.test.ts` censuses exactly that, because an inline pattern
    // is blind to a comment marker inside a string.
    const css = stripComments(readFileSync(join(ROOT, "web", "app", "globals.css"), "utf8"))
    const tightRule = /\*:has\(>\s*\.pinned-strip\.pinned-strip-tight\)\s*\{\s*--pinned-chrome-h:\s*var\(--tab-strip-h\)\s*;\s*\}/
    expect(
      css,
      "web/app/globals.css must set --pinned-chrome-h to the bare --tab-strip-h for a container whose pinned strip carries .pinned-strip-tight, or a PINNED toolbar opens a 20px hole under the strip on scroll even though the two sit flush at rest"
    ).toMatch(tightRule)

    // AND THE ORDINARY RULE MUST BE GONE. It could only ever be overridden
    // now that every strip is tight, and a rule that can only be overridden
    // is a rule the next reader has to re-derive the deadness of.
    const ordinaryRule = /\*:has\(>\s*\.pinned-strip\)\s*\{\s*--pinned-chrome-h:\s*calc\(/
    expect(
      ordinaryRule.test(css),
      "the old *:has(> .pinned-strip) { --pinned-chrome-h: calc(…) } rule must be deleted — every strip is tight, so it never applies"
    ).toBe(false)
  })

  it("RED PROOF: a stylesheet with only the ordinary rule (no tight correction at all) does not satisfy today's rule", () => {
    const ordinaryOnly = `
      *:has(> .pinned-strip) {
        --pinned-chrome-h: calc(var(--tab-strip-h) + var(--tab-content-gap));
      }
    `
    const tightRule = /\*:has\(>\s*\.pinned-strip\.pinned-strip-tight\)\s*\{\s*--pinned-chrome-h:\s*var\(--tab-strip-h\)\s*;\s*\}/
    expect(
      ordinaryOnly,
      "the pre-fix stylesheet (ordinary rule alone) must not read as today's rule"
    ).not.toMatch(tightRule)
  })
})
