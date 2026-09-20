// R83 RE-SCOPED, 18 Sep 2026 (RULING 7) — "too much!!!! i liked more the
// thinner verison from before! the 10pc above and below, both in main and
// details." `--toolbar-lead-gap` no longer means "the whole visible distance
// from the strip's own bottom edge" (below, superseded but kept for history);
// it means the CARD's own top edge to the toolbar it hosts, paid WHOLE —
// `--space-2h` (10px), no `calc()` remainder against the strip's separate
// `--tab-content-gap`. Measuring staging for this ruling also surfaced a real,
// previously-unproven gap in this file's own coverage: `PagedFind` (paged-
// find.tsx) unconditionally wraps its card in an extra `<div>` when a screen
// calls `renderFolderTabs` itself and passes no `tabs` prop — exactly
// tickets-collection.tsx's shape for the All/Waiting/Open/Ready tabs, ruling
// 6's own named examples — so `.pinned-strip + [data-slot="card"]` (a plain
// adjacent-sibling selector) never matched there, and the card fell back to
// `CollectionCard`'s own un-remediated, now-stale hardcoded inset. Fixed with
// a second selector, `.pinned-strip + * > [data-slot="card"]:first-child`,
// joined to the first so both selectors always carry the identical value.
//
// R83 AMENDMENT, 16 Sep 2026 EVENING (HISTORY) — THE CARD PAID THE REMAINDER
// OF `--toolbar-lead-gap`, NEVER THE WHOLE INSET AND NEVER ZERO.
//
// `toolbar-lead-gap.test.ts` (this file's own sibling) censuses a DIFFERENT
// double-payment — a screen wrapping `renderFolderTabs(...)` and its card in
// a `gap-*`/`space-y-*` column of its own. That census is still correct.
// This file proves the OTHER half, found the same day by measuring staging
// rather than re-reading the census: a `<CollectionCard>` whose first child
// is a pinned toolbar (`data-slot="toolbar-row-pin"`) also spends
// `CardContent`'s own leading `p-4`/`lg:p-[var(--space-7)]` inset on top of
// the strip's own, correct `pb-[var(--tab-content-gap)]` -- a second,
// unrelated 16-to-32px the wrapping-column census has no way to see, because
// there is no wrapping column here at all; the extra space is INSIDE the
// card.
//
// MEASURED, 16 Sep 2026 afternoon: Tasks (1600px) -- tab strip bottom to
// toolbar top 52px, toolbar bottom to content top (the toolbar's own
// `mb-[var(--toolbar-content-gap)]`) 20px. Settings > Team > Members and
// Contacts (1280px) -- 44px above, 20px below. The client's first ruling:
// "reduce the spacing above ALL TOOLBARS. i want it exactly as its currently
// below, make it like that above." The afternoon fix zeroed the card's whole
// leading inset, so above = below = 20px everywhere -- and shipped wrong by
// her own later word, THAT EVENING: "I'm not happy about this. It doesn't
// look good. Can we do an in-between with what it was and what it is now?
// Also, make sure it's the same on every page. I don't understand how task
// was 52 and setting and contacts were 44. It should be the fucking same
// everywhere."
//
// THE FIX, in `web/app/globals.css`: a new token, `--toolbar-lead-gap`
// (`var(--space-7)`, 32px -- the in-between she asked for, and an exact step
// on the scale rather than a guess: `--space-6` is 24px, a card inset;
// `--space-7` is the scale's own 32px step, "p-8 is 32px, which is --space-7
// here"). The strip above a toolbar already pays `--tab-content-gap` (20px)
// as its own trailing padding, so a card that follows it owes only the
// REMAINDER: `.pinned-strip + [data-slot="card"]` now sets both
// `[data-slot="card-content"]`'s own `padding-top` and the R63 `--pinned-lead`
// custom property (`shared/web/pinned-chrome.ts`) to
// `calc(var(--toolbar-lead-gap) - var(--tab-content-gap))` -- 12px -- together,
// so the strip's 20 plus the card's 12 read as ONE 32px distance on every
// screen, at rest and pinned alike. Both halves still have to move together:
// `PINNED_TOOLBAR`'s own `mt-[calc(var(--pinned-lead,0px)*-1)]
// pt-[var(--pinned-lead,0px)]` pair only CANCELS a lead at rest, it does not
// remove one -- leaving `--pinned-lead` at a different number from the real
// padding would pull a pinned toolbar to the wrong place either way.
//
// FOUR PROOFS. First, a REAL RENDER of `renderFolderTabs` + `<CollectionCard>`
// (the exact composition `SectionWithCreate`, `PagedFind`'s `wrap` and
// `tickets-collection.tsx` all draw) shows the DOM adjacency the new CSS rule
// depends on: `.pinned-strip` is the card's own PRECEDING SIBLING, and the
// toolbar is `[data-slot="card-content"]`'s own FIRST CHILD -- a sibling
// selector and a `>` child combinator match nothing otherwise, so a future
// refactor that puts anything between them silently un-fixes this and this
// test catches it structurally, without needing jsdom to compute CSS layout.
// Second, a CENSUS over `web/app/globals.css` itself proves the token and the
// override rule the render above depends on are actually there, spelled
// exactly right (`--toolbar-lead-gap: var(--space-7)`,
// `calc(var(--toolbar-lead-gap) - var(--tab-content-gap))` on both
// properties) -- read fresh off disk, not duplicated as a second copy of the
// string. Third, two red proofs (no override at all; the afternoon's own
// flush-zero shape) neither of which reads as today's rule. Fourth, a CENSUS
// over every `.tsx` source file, off the disk, DERIVES which
// `renderFolderTabs(` call sites the new CSS rule actually reaches -- never a
// hand-typed list -- by finding, for each call, whether a `<CollectionCard>`/
// `<Card>` follows it, directly, by a resolved local variable, or through a
// `wrap` render prop a real caller fills.

import { readFileSync } from "node:fs"
import { join } from "node:path"

import { cleanup, render } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it } from "vitest"
import ts from "typescript"

import { renderFolderTabs, defaultTabsConfig, TabsView } from "@shared/web/screen-engine/tabs-view"
import { PINNED_TOOLBAR } from "@shared/web/pinned-chrome"
import { CollectionCard } from "@/components/deep-link/screen-bits"
import { CollectionHeading } from "@/components/records/collection-heading"
import { STICKY_TABS } from "@/components/records/record-chrome"
import { sourceFiles, stripComments } from "@shared/rules/source-scan"

const ROOT = join(import.meta.dirname, "..", "..")
const ROOTS = [join(ROOT, "web"), join(ROOT, "web-portal")]

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
 * holding `renderFolderTabs(...)` then a `<CollectionCard>` whose first child
 * is a pinned toolbar -- `SectionWithCreate`'s own shape (screen-bits.tsx),
 * `PagedFind`'s `wrap`, and `tickets-collection.tsx`'s direct calls all
 * reduce to this. The toolbar itself is a stand-in for `<ToolbarRow>`/
 * `PagedFind`'s own hand-drawn track -- both wear the SAME `data-slot=
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

describe("R83 amendment -- the card owes no second leading gap above a toolbar it hosts", () => {
  it("DOM: the strip is the card's own preceding sibling, and the toolbar is the card content's first child", () => {
    render(<CollectionFixture />)

    const strip = document.querySelector(".pinned-strip")
    expect(strip, "renderFolderTabs must draw the marked, sticky strip").toBeTruthy()

    const card = document.querySelector('[data-slot="card"]')
    expect(card, 'CollectionCard must render the kit\'s Card, data-slot="card"').toBeTruthy()

    // THE EXACT ADJACENCY THE NEW CSS RULE KEYS OFF --
    // `.pinned-strip + [data-slot="card"]` matches only an IMMEDIATE sibling.
    expect(
      strip!.nextElementSibling,
      'the card must be the strip\'s own next sibling, or `.pinned-strip + [data-slot="card"]` in globals.css matches nothing and the card\'s old top padding comes back'
    ).toBe(card)

    const content = card!.querySelector(':scope > [data-slot="card-content"]')
    expect(content, "CollectionCard must wrap its children in the kit's CardContent, one level in").toBeTruthy()

    // AND THE `>` CHILD COMBINATOR THE SAME RULE USES --
    // `[data-slot="card-content"]` must have the toolbar as its FIRST child,
    // or the padding it adjusts was never the toolbar's own leading space.
    expect(
      content!.firstElementChild?.getAttribute("data-slot"),
      "the pinned toolbar must be the card content's first child"
    ).toBe("toolbar-row-pin")
  })

  it("CSS: globals.css defines --toolbar-lead-gap at the scale's 10px half-step and the card pays it WHOLE, direct sibling or one wrapper deep", () => {
    const css = readFileSync(join(ROOT, "web", "app", "globals.css"), "utf8")

    // THE TOKEN -- ruling 7, 18 Sep 2026: "the 10pc above and below, both in
    // main and details." `--space-2h` is the scale's own 10px half-step
    // (tokens.css: "6/10/14/18 inside a component"), never --space-1 (4px)
    // or --space-2 (8px) -- neither is 10.
    const tokenRule = /--toolbar-lead-gap:\s*var\(--space-2h\)\s*;/
    expect(
      css,
      "web/app/globals.css must define --toolbar-lead-gap: var(--space-2h) at :root -- --space-2h is the scale's real 10px half-step"
    ).toMatch(tokenRule)

    // THE CARD PAYS THE WHOLE TOKEN NOW, NO REMAINDER -- ruling 7 measures the
    // CARD's own top edge to the toolbar, never the strip's separate trailing
    // gap, so there is nothing left to subtract. Asserted on BOTH the direct-
    // sibling shape (`.pinned-strip + [data-slot="card"]`, `SectionWithCreate`/
    // `waves-screen.tsx`'s own literal `<CollectionCard>`) and the one-wrapper
    // shape (`.pinned-strip + * > [data-slot="card"]:first-child`, `PagedFind`'s
    // own unconditional wrapper when a screen calls `renderFolderTabs` itself
    // and passes no `tabs` prop -- tickets-collection.tsx's All/Waiting/Open/
    // Ready tabs, MEASURED live as the actual, un-fixed shape on staging before
    // this rule existed).
    const direct = "var(--toolbar-lead-gap)"
    const leadRule = new RegExp(
      String.raw`\.pinned-strip\s*\+\s*\[data-slot="card"\]\s*,\s*` +
        String.raw`\.pinned-strip\s*\+\s*\*\s*>\s*\[data-slot="card"\]:first-child\s*\{\s*--pinned-lead:\s*` +
        escapeRe(direct) +
        String.raw`\s*;\s*\}`
    )
    const paddingRule = new RegExp(
      String.raw`\.pinned-strip\s*\+\s*\[data-slot="card"\]\s*>\s*\[data-slot="card-content"\]\s*,\s*` +
        String.raw`\.pinned-strip\s*\+\s*\*\s*>\s*\[data-slot="card"\]:first-child\s*>\s*\[data-slot="card-content"\]\s*\{\s*padding-top:\s*` +
        escapeRe(direct) +
        String.raw`\s*;\s*\}`
    )

    expect(
      css,
      `web/app/globals.css must set [data-slot="card-content"]'s own padding-top to ${direct}, on both the direct-sibling selector and the one-wrapper-deep selector, joined so neither can drift from the other`
    ).toMatch(paddingRule)

    expect(
      css,
      `and web/app/globals.css must set the SAME two selectors' --pinned-lead to ${direct} alongside it -- PINNED_TOOLBAR's own mt/pt pair (shared/web/pinned-chrome.ts) only cancels a lead at rest; leaving --pinned-lead at a different number from the real padding pulls a PINNED toolbar to the wrong place`
    ).toMatch(leadRule)
  })

  it("DOM: the one-wrapper-deep shape -- renderFolderTabs called OUTSIDE PagedFind, PagedFind given no tabs prop -- is exactly tickets-collection.tsx's own All/Waiting/Open/Ready shape, and the new selector reaches it", () => {
    // paged-find.tsx's own return, unconditionally: `<div className="flex
    // w-full flex-col">{renderFolderTabs(tabs)}{wrap ? wrap(toolbarAndRows) :
    // toolbarAndRows}</div>` -- with no `tabs` prop, `renderFolderTabs`
    // returns null and this div still wraps the card alone, "one more <div>
    // around exactly the markup this returned before" (paged-find.tsx's own
    // comment). Reproduced here as a fixture rather than rendering the real
    // `<PagedFind>` (which needs a data door this test does not stand up),
    // the same restraint the strip-adjacency fixture above already takes.
    function TicketsShapedFixture() {
      return (
        <div className="flex flex-col">
          {renderFolderTabs({
            config: {
              ...defaultTabsConfig,
              tabs: [{ value: "all", label: "All", icon: "", badge: "", badgeVariant: "" }],
            },
            value: "all",
            onValueChange: () => {},
          })}
          <div className="flex w-full flex-col">
            <CollectionCard>
              <div data-slot="toolbar-row-pin" className={PINNED_TOOLBAR}>
                <div data-slot="toolbar-row-column">the toolbar</div>
              </div>
              <div data-testid="rows">the rows</div>
            </CollectionCard>
          </div>
        </div>
      )
    }
    render(<TicketsShapedFixture />)

    const strip = document.querySelector(".pinned-strip")
    expect(strip).toBeTruthy()

    // THE CARD IS *NOT* THE STRIP'S DIRECT SIBLING HERE -- the wrapper div is.
    expect(
      strip!.nextElementSibling?.getAttribute("data-slot"),
      "PagedFind's own unconditional wrapper sits between the strip and the card -- if this ever changes, the fixture no longer represents the live bug the new selector exists for"
    ).not.toBe("card")

    const wrapper = strip!.nextElementSibling
    const card = wrapper?.firstElementChild
    expect(card?.getAttribute("data-slot"), "the card must still be the wrapper's own first child, which is what `.pinned-strip + * > [data-slot=\"card\"]:first-child` keys off").toBe("card")
  })

  // THE RED PROOFS -- three shapes this rule must NOT read as: no override at
  // all, the OLD remainder formula (correct once, superseded by ruling 7), and
  // a direct-sibling-only rule that never learned to reach through PagedFind's
  // own wrapper div. Replayed against fixtures rather than a git diff, the
  // same discipline toolbar-lead-gap.test.ts's own waves-screen fixture uses.
  it("neither no override, nor the old remainder formula, nor a direct-sibling-only rule matches today's whole-token, two-selector rule", () => {
    const direct = "var(--toolbar-lead-gap)"
    const leadRule = new RegExp(
      String.raw`\.pinned-strip\s*\+\s*\[data-slot="card"\]\s*,\s*` +
        String.raw`\.pinned-strip\s*\+\s*\*\s*>\s*\[data-slot="card"\]:first-child\s*\{\s*--pinned-lead:\s*` +
        escapeRe(direct) +
        String.raw`\s*;\s*\}`
    )
    const paddingRule = new RegExp(
      String.raw`\.pinned-strip\s*\+\s*\[data-slot="card"\]\s*>\s*\[data-slot="card-content"\]\s*,\s*` +
        String.raw`\.pinned-strip\s*\+\s*\*\s*>\s*\[data-slot="card"\]:first-child\s*>\s*\[data-slot="card-content"\]\s*\{\s*padding-top:\s*` +
        escapeRe(direct) +
        String.raw`\s*;\s*\}`
    )

    const preFix = `
      .pinned-strip { background: var(--surface-raised); }
      *:has(> .pinned-strip) { --pinned-chrome-h: calc(var(--tab-strip-h) + var(--tab-content-gap)); }
    `
    expect(preFix, "the pre-fix stylesheet has no override rule at all").not.toMatch(paddingRule)
    expect(preFix, "and no --pinned-lead override either").not.toMatch(leadRule)

    // THE OLD REMAINDER SHAPE -- correct under the pre-ruling-7 token meaning,
    // wrong now: ruling 7 retargets the token to "card top to toolbar," which
    // the card pays WHOLE, and this formula also never reaches PagedFind's own
    // wrapper div (the live bug ruling 6 reports on Tickets All/Waiting/Open/
    // Ready).
    const oldRemainder = `
      .pinned-strip + [data-slot="card"] {
        --pinned-lead: calc(var(--toolbar-lead-gap) - var(--tab-content-gap));
      }
      .pinned-strip + [data-slot="card"] > [data-slot="card-content"] {
        padding-top: calc(var(--toolbar-lead-gap) - var(--tab-content-gap));
      }
    `
    expect(oldRemainder, "the old remainder formula must not read as today's whole-token rule").not.toMatch(
      paddingRule
    )
    expect(oldRemainder, "same, for --pinned-lead").not.toMatch(leadRule)

    // DIRECT-SIBLING-ONLY -- the right VALUE, the wrong REACH: this shape
    // never matches a card sitting one PagedFind wrapper div deep, which is
    // exactly what left Tickets All/Waiting/Open/Ready unreached and is the
    // reason this rule now carries two selectors, joined, rather than one.
    const directSiblingOnly = `
      .pinned-strip + [data-slot="card"] {
        --pinned-lead: var(--toolbar-lead-gap);
      }
      .pinned-strip + [data-slot="card"] > [data-slot="card-content"] {
        padding-top: var(--toolbar-lead-gap);
      }
    `
    expect(
      directSiblingOnly,
      "a rule missing the one-wrapper-deep selector must not read as today's complete, two-selector rule"
    ).not.toMatch(paddingRule)
    expect(directSiblingOnly, "same, for --pinned-lead").not.toMatch(leadRule)
  })
})

// ============================================================================
// R83 EXTENDED, 18 Sep 2026 -- A RECORD'S OWN TAB PANE PAYS THE SAME
// REMAINDER, NOT THREE STACKED GAPS. Client ruling, verbatim: "on app /
// tickets the space above the toolbar is huge and inocrrect!!! review
// app-wide!"
// ============================================================================
// `.pinned-strip + [data-slot="card"]` above only reaches a card that is the
// STRIP's own next sibling. Inside a record's own tab (App > Tickets,
// Account > Tickets, any `*-detail.tsx` built on `TabsView`'s `renderPanel`),
// the strip (`STICKY_TABS`, record-chrome.tsx) is a SIBLING OF THE WHOLE
// PANE (`TabsContent`), never of the card two levels down -- and it never
// wears `.pinned-strip` either, only a COLLECTION's own strip
// (`STICKY_FOLDER_TABS`) does. So this shape was invisible to the rule above
// on both counts, and the nested card paid its own full leading inset on top
// of the `<Tabs>` root's own flex gap on top of the strip's own
// `--record-tab-gap` -- three numbers where every other screen pays one.
//
// FIXED AT THE SEAM: `TabsView` (shared/web/screen-engine/tabs-view.tsx)
// marks every `TabsContent` it renders through `renderPanel` with
// `data-tab-pane`, unconditionally -- so every record-detail screen is
// covered by construction, never by a per-screen census. `globals.css`
// reaches a card nested inside that pane by a DESCENDANT selector (the card
// sits at variable depth: `ModulesPanel` renders it directly, anything built
// on `PagedPanelBody`/`PagedFind` puts one flow `<div>` in between) narrowed
// by `:first-child`, so only a pane whose collection genuinely leads is
// touched -- the same restraint the strip-adjacency rule above already
// applies to the top-level case.
describe("R83 extended -- a record's own tab pane pays the same remainder, never three stacked gaps", () => {
  it("DOM: TabsView marks every renderPanel TabsContent with data-tab-pane, and the descendant + :first-child selector reaches a card whether it is a direct child (ModulesPanel's own shape) or one flow div deep (PagedPanelBody/PagedFind's own shape)", () => {
    function DirectCardPane() {
      return (
        <TabsView
          config={{
            ...defaultTabsConfig,
            tabs: [{ value: "modules", label: "Modules", icon: "", badge: "", badgeVariant: "" }],
          }}
          value="modules"
          renderPanel={() => (
            <CollectionCard>
              <div data-slot="toolbar-row-pin" className={PINNED_TOOLBAR}>
                <div data-slot="toolbar-row-column">the toolbar</div>
              </div>
              <div data-testid="rows">the rows</div>
            </CollectionCard>
          )}
        />
      )
    }
    render(<DirectCardPane />)

    const pane = document.querySelector("[data-tab-pane]")
    expect(pane, "TabsView must mark the renderPanel TabsContent with data-tab-pane").toBeTruthy()

    const directCard = pane!.querySelector('[data-slot="card"]')
    expect(directCard, "ModulesPanel's own shape: CollectionCard is TabsContent's DIRECT child").toBeTruthy()
    expect(directCard === pane!.firstElementChild, "the card must be the pane's first child here").toBe(true)

    cleanup()

    function NestedCardPane() {
      return (
        <TabsView
          config={{
            ...defaultTabsConfig,
            tabs: [{ value: "tickets", label: "Tickets", icon: "", badge: "", badgeVariant: "" }],
          }}
          value="tickets"
          renderPanel={() => (
            // PagedFind's own shape (paged-find.tsx): one flow <div> around
            // the `wrap`-supplied CollectionCard -- `renderFolderTabs(tabs)`
            // renders null here (no `tabs` prop), so the card is still the
            // wrapper's only real DOM child.
            <div className="flex w-full flex-col">
              <CollectionCard>
                <div data-slot="toolbar-row-pin" className={PINNED_TOOLBAR}>
                  <div data-slot="toolbar-row-column">the toolbar</div>
                </div>
                <div data-testid="rows">the rows</div>
              </CollectionCard>
            </div>
          )}
        />
      )
    }
    render(<NestedCardPane />)

    const pane2 = document.querySelector("[data-tab-pane]")
    const nestedCard = pane2!.querySelector('[data-slot="card"]')
    expect(nestedCard, "PagedPanelBody's own shape: CollectionCard sits one flow div deep").toBeTruthy()
    expect(
      nestedCard === nestedCard!.parentElement?.firstElementChild,
      "the card must still be the FIRST CHILD of its own immediate parent, whatever the depth"
    ).toBe(true)
  })

  it("CSS: globals.css reaches a card nested inside a tab pane by [data-tab-pane] descendant + :first-child, and pays the IDENTICAL whole --toolbar-lead-gap a top-level card does, never a remainder or a third number", () => {
    const css = readFileSync(join(ROOT, "web", "app", "globals.css"), "utf8")
    const direct = "var(--toolbar-lead-gap)"

    const leadRule = new RegExp(
      String.raw`\[data-tab-pane\]\s+\[data-slot="card"\]:first-child\s*\{\s*--pinned-lead:\s*` +
        escapeRe(direct) +
        String.raw`\s*;\s*\}`
    )
    const paddingRule = new RegExp(
      String.raw`\[data-tab-pane\]\s+\[data-slot="card"\]:first-child\s*>\s*\[data-slot="card-content"\]\s*\{\s*padding-top:\s*` +
        escapeRe(direct) +
        String.raw`\s*;\s*\}`
    )

    expect(
      css,
      'web/app/globals.css must set --pinned-lead to the whole --toolbar-lead-gap on [data-tab-pane] [data-slot="card"]:first-child, so a PINNED toolbar inside a record tab lands at the identical 10px distance a top-level one does'
    ).toMatch(leadRule)
    expect(
      css,
      "and the same whole --toolbar-lead-gap on that card's own CardContent padding-top, at rest"
    ).toMatch(paddingRule)
  })

  it("SOURCE: tabs-view.tsx marks every renderPanel TabsContent with data-tab-pane unconditionally -- so a future record-detail screen is covered by construction, never by being added to a list", () => {
    const src = readFileSync(join(ROOT, "shared", "web", "screen-engine", "tabs-view.tsx"), "utf8")
    const stripped = stripComments(src, { keepLength: true })
    expect(
      stripped,
      "the <TabsContent> inside TabsView's renderPanel branch must carry data-tab-pane"
    ).toMatch(/<TabsContent[^>]*\bdata-tab-pane\b/)
  })

  it("RED PROOF: a card that is NOT the tab pane's own leading element -- the app-hosted Knowledge tab's own 'Ask' button sits above its gallery -- is correctly left untouched by the :first-child restraint", () => {
    function AskThenCardPane() {
      return (
        <TabsView
          config={{
            ...defaultTabsConfig,
            tabs: [{ value: "knowledge", label: "Knowledge", icon: "", badge: "", badgeVariant: "" }],
          }}
          value="knowledge"
          renderPanel={() => (
            <div className="flex flex-col gap-4">
              <div className="flex justify-end">
                <button type="button">Ask</button>
              </div>
              <CollectionCard>
                <div data-slot="toolbar-row-pin" className={PINNED_TOOLBAR}>
                  <div data-slot="toolbar-row-column">the toolbar</div>
                </div>
              </CollectionCard>
            </div>
          )}
        />
      )
    }
    render(<AskThenCardPane />)

    const pane = document.querySelector("[data-tab-pane]")
    const card = pane!.querySelector('[data-slot="card"]')
    expect(card, "the card still renders").toBeTruthy()
    expect(
      card === card!.parentElement?.firstElementChild,
      "the card is not its own parent's first child here -- the Ask button leads -- so :first-child correctly does not match, and this pane keeps its own, separately tracked shape rather than being silently pulled into today's fix"
    ).toBe(false)
  })
})

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

// ============================================================================
// THE CALL-SITE CENSUS -- every `renderFolderTabs(` call the new CSS rule
// actually reaches, derived off the disk rather than typed by hand.
// ============================================================================
//
// `.pinned-strip + [data-slot="card"]` is a plain CSS sibling selector: it
// reaches a call site if, and only if, the strip `renderFolderTabs` draws is
// immediately followed -- in the rendered DOM -- by a `<CollectionCard>` (or
// a bare kit `<Card>`, the shape `settings-screen.tsx`'s own Modules panel
// draws) whose `CardContent` starts with a pinned toolbar. Three shapes carry
// that adjacency in this codebase, and the census below resolves all three,
// same-file only -- it never follows an imported component's OWN source,
// which is also what keeps it honest: a component reached only by NAME, like
// `<MembersGallery>`/`<RolesMatrix>` (both bare `<section>`s, never a Card,
// per members-gallery.tsx's own header), never contributes text this file's
// regex could mis-read as a card two components away.
//
//   1. DIRECT -- a `<CollectionCard`/`<Card` tag textually inside the same
//      enclosing JSX box, after the call (`tickets-collection.tsx`'s Triage
//      branch, `waves-screen.tsx`'s literal sibling, and
//      `settings-screen.tsx`'s strip, whose "modules" panel is one of
//      several branches the same box holds).
//   2. BY NAME -- a bare `{identifier}` JSX child after the call, resolved
//      back to a `const <identifier> = ...` in the SAME enclosing function,
//      whose own initializer carries the tag (`screen-bits.tsx`'s
//      `SectionWithCreate`, where `collection` is decided above the `return`
//      and referenced by name inside it).
//   3. DELEGATED -- the call site itself takes a `wrap` render prop and
//      invokes it (`paged-find.tsx`'s own `PagedFind`, which never spells
//      `CollectionCard` itself); covered only when at least one real JSX
//      caller across the app actually fills `wrap` with one
//      (`accounts-screen.tsx`, `contacts-screen.tsx`).
//
// A call site matching none of the three -- `kwapso-screen.tsx` (its panels
// are `TeamPanel`/`BrandPanel`/a plain overview list, never a card) and
// `module-settings-screen.tsx` (its panels are `ModuleAutomations`/
// `SettingsChoicesPanel`, also never a card) -- draws a strip with nothing to
// pin it against, so the CSS rule has nothing to reach there and correctly
// does not. THE ASSERTIONS BELOW deliberately check membership
// (`arrayContaining`) rather than exact-equality on the full population: this
// repo runs more than one lane on the same tree the same day, and a screen
// this fix does not own (settings-screen.tsx's own panel arrangement, say)
// can legitimately gain or lose an unrelated call site between one run and
// the next -- the four/two files asserted below are the ones THIS fix
// actually touches or depends on, and stay true regardless.

const CARD_TAG = /<(?:CollectionCard|Card)(?=[\s/>])/

type CallSite = { rel: string; line: number }

/** The JSX element that is the direct BOX around `call` -- fragments walked
 * through, the identical five-line shape `toolbar-lead-gap.test.ts`'s own
 * `enclosingBox` uses, re-derived here rather than imported so this file's
 * census stays independent of that one's internals. */
function enclosingBox(call: ts.CallExpression): ts.JsxElement | undefined {
  let cur: ts.Node | undefined = call.parent
  while (cur) {
    if (ts.isJsxElement(cur)) return cur
    if (ts.isJsxExpression(cur) || ts.isJsxFragment(cur)) {
      cur = cur.parent
      continue
    }
    return undefined
  }
  return undefined
}

/** The nearest enclosing function (declaration, expression, or arrow) AROUND
 * a node -- used to resolve a bare `{identifier}` JSX child back to the
 * `const`/`let` that assigned it. An AST walk, not a regex on the text: this
 * codebase writes no semicolons (`const collection = ... <CollectionCard>...`
 * has none), so a text pattern anchored on `;` never matches here. */
function enclosingFunction(node: ts.Node): ts.Node | undefined {
  let cur: ts.Node | undefined = node.parent
  while (cur) {
    if (ts.isFunctionDeclaration(cur) || ts.isFunctionExpression(cur) || ts.isArrowFunction(cur)) return cur
    cur = cur.parent
  }
  return undefined
}

/** The initializer text of `const <name> = ...` (or `let`) anywhere inside
 * `fn`, found by walking the AST rather than matching text -- the same
 * semicolon-free reason `enclosingFunction` gives. `undefined` when no such
 * declarator exists in this function. */
function resolveConstInitializer(fn: ts.Node, name: string, sf: ts.SourceFile): string | undefined {
  let found: string | undefined
  const visit = (n: ts.Node): void => {
    if (found) return
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === name && n.initializer) {
      found = n.initializer.getText(sf)
      return
    }
    ts.forEachChild(n, visit)
  }
  visit(fn)
  return found
}

/** Every `renderFolderTabs(` call across the population, classified as
 * covered (a card follows it, one of the three shapes above) or not. */
function censusCallSites(roots: string[]): { covered: CallSite[]; uncovered: CallSite[] } {
  // PASS 1 -- every `wrap={...}` JSX attribute across the whole population,
  // so shape 3 (DELEGATED) can ask "does a REAL caller fill wrap with a
  // card" rather than reading the render-prop's own, card-free body.
  let someCallerWrapsInACard = false
  for (const f of sourceFiles(roots, { extensions: [".tsx"], relativeTo: ROOT, skipTests: true })) {
    const src = stripComments(f.source, { keepLength: true })
    if (!src.includes("wrap=")) continue
    const sf = ts.createSourceFile(f.path, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const visit = (node: ts.Node): void => {
      if (
        ts.isJsxAttribute(node) &&
        node.name.getText(sf) === "wrap" &&
        node.initializer &&
        CARD_TAG.test(node.initializer.getText(sf))
      ) {
        someCallerWrapsInACard = true
      }
      ts.forEachChild(node, visit)
    }
    visit(sf)
  }

  // PASS 2 -- every `renderFolderTabs(` call, classified.
  const covered: CallSite[] = []
  const uncovered: CallSite[] = []
  for (const f of sourceFiles(roots, { extensions: [".tsx"], relativeTo: ROOT, skipTests: true })) {
    const src = stripComments(f.source, { keepLength: true })
    if (!src.includes("renderFolderTabs(")) continue
    const sf = ts.createSourceFile(f.path, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "renderFolderTabs") {
        const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1
        const site: CallSite = { rel: f.rel, line }
        const box = enclosingBox(node)
        let isCovered = false

        if (box) {
          const boxText = box.getText(sf)
          const callEndInBox = node.getEnd() - box.getStart(sf)
          const afterCall = boxText.slice(callEndInBox)

          // Shape 1 -- direct tag.
          if (CARD_TAG.test(afterCall)) {
            isCovered = true
          } else {
            // Shape 2 -- a bare `{identifier}` resolved to a local const,
            // by AST rather than by text (see `resolveConstInitializer`'s
            // own doc for why: no semicolons to anchor a regex on).
            const idMatches = afterCall.matchAll(/\{\s*([A-Za-z_$][\w$]*)\s*\}/g)
            const fn = enclosingFunction(node)
            for (const m of idMatches) {
              const name = m[1]!
              const init = fn ? resolveConstInitializer(fn, name, sf) : undefined
              if (init && CARD_TAG.test(init)) {
                isCovered = true
                break
              }
            }
            // Shape 3 -- this call site itself delegates through `wrap`.
            if (!isCovered && /\bwrap\s*\(/.test(afterCall) && someCallerWrapsInACard) {
              isCovered = true
            }
          }
        }

        if (isCovered) covered.push(site)
        else uncovered.push(site)
      }
      ts.forEachChild(node, visit)
    }
    visit(sf)
  }
  return { covered, uncovered }
}

describe("R83 amendment -- the census of renderFolderTabs( call sites the card rule reaches", () => {
  it("finds the call sites that lead a CollectionCard/Card, derived off the disk", () => {
    const { covered, uncovered } = censusCallSites(ROOTS)

    const coveredRels = [...new Set(covered.map((s) => s.rel))].sort()
    const uncoveredRels = [...new Set(uncovered.map((s) => s.rel))].sort()

    // A CALL SITE IS NEVER BOTH -- one line, one classification. (A FILE can
    // legitimately be on both lists at once, if it makes more than one
    // renderFolderTabs( call and only some lead a card; that is not a bug,
    // it is why this census is keyed by call site rather than by file.)
    for (const site of covered) {
      const alsoUncovered = uncovered.some((u) => u.rel === site.rel && u.line === site.line)
      expect(alsoUncovered, `${site.rel}:${site.line} was classified both covered and uncovered`).toBe(false)
    }

    // THE FOUR STABLE CALL SITES this lane's own fix touches directly --
    // present regardless of unrelated work landing elsewhere in the app the
    // same day (this repo runs several lanes on one shared tree at once).
    // Each renders a `<CollectionCard>` a CSS rule keyed on `.pinned-strip +
    // [data-slot="card"]` must actually reach.
    expect(coveredRels, `covered call sites: ${coveredRels.join(", ")}`).toEqual(
      expect.arrayContaining([
        "web/components/deep-link/screen-bits.tsx",
        "web/components/records/paged-find.tsx",
        "web/components/tickets/tickets-collection.tsx",
        "web/components/work/waves-screen.tsx",
      ])
    )

    // THE TWO STRIPS WITH NOTHING TO PIN AGAINST -- kwapso-screen.tsx (Team/
    // Brand/Overview panels) and module-settings-screen.tsx (Automations/
    // Choices panels) draw a tab strip whose panel is never a card, so the
    // CSS rule reaches neither and correctly does not.
    expect(uncoveredRels, `uncovered call sites: ${uncoveredRels.join(", ")}`).toEqual(
      expect.arrayContaining([
        "web/components/screens/kwapso-screen.tsx",
        "web/components/screens/module-settings-screen.tsx",
      ])
    )

    // AND AT LEAST ONE CALL SITE COVERS THROUGH EACH OF THE THREE SHAPES --
    // proof this census actually exercises all three resolution paths rather
    // than only ever matching a direct tag.
    expect(coveredRels, "screen-bits.tsx covers by resolving a bare {collection} to its const declaration").toContain(
      "web/components/deep-link/screen-bits.tsx"
    )
    expect(coveredRels, "paged-find.tsx covers only through a real caller's wrap prop").toContain(
      "web/components/records/paged-find.tsx"
    )
    expect(coveredRels, "tickets-collection.tsx covers through a direct <CollectionCard> tag").toContain(
      "web/components/tickets/tickets-collection.tsx"
    )
  })
})

describe("R83 generalised, 17 Sep 2026 -- a card led by a HEADING pays the whole --toolbar-lead-gap", () => {
  it("DOM: a CollectionHeading with an action wraps the headline in a row div, and that row is the card's own preceding sibling", () => {
    // THE EXACT KNOWLEDGE SHAPE -- a heading WITH an `action` (Ask/Sync/gear),
    // so `CollectionHeading` wraps its `<Headline data-slot="headline">` in a
    // plain `justify-between` row rather than returning it bare
    // (collection-heading.tsx's own branch) -- immediately followed, in a
    // GAPLESS column, by the same `<CollectionCard>` fixture the strip proof
    // above uses.
    render(
      <div className="flex flex-col">
        <CollectionHeading sectionKey="knowledge" total={5} action={<button>Ask</button>} />
        <CollectionCard>
          <div data-slot="toolbar-row-pin" className={PINNED_TOOLBAR}>
            <div data-slot="toolbar-row-column">the toolbar</div>
          </div>
          <div data-testid="rows">the rows</div>
        </CollectionCard>
      </div>
    )

    const headline = document.querySelector('[data-slot="headline"]')
    expect(headline, "CollectionHeading must render the kit's Headline, data-slot=\"headline\"").toBeTruthy()

    const card = document.querySelector('[data-slot="card"]')
    expect(card, 'CollectionCard must render the kit\'s Card, data-slot="card"').toBeTruthy()

    // THE HEADLINE ITSELF IS NOT THE CARD'S PRECEDING SIBLING -- `action`
    // wraps it in a row div, which IS the sibling. `:has(> […])` in
    // globals.css exists precisely to still reach it.
    expect(headline!.nextElementSibling, "the headline sits inside a row, not beside the card directly").not.toBe(card)
    expect(
      headline!.parentElement?.nextElementSibling,
      "the headline's own wrapping row must be the card's preceding sibling, or the generalised selector in globals.css matches nothing"
    ).toBe(card)

    const content = card!.querySelector(':scope > [data-slot="card-content"]')
    expect(content, "CollectionCard must wrap its children in the kit's CardContent, one level in").toBeTruthy()
    expect(
      content!.firstElementChild?.getAttribute("data-slot"),
      "the pinned toolbar must still be the card content's first child"
    ).toBe("toolbar-row-pin")
  })

  it("DOM: a CollectionHeading with NO action returns the bare headline, which is then the card's own preceding sibling directly", () => {
    render(
      <div className="flex flex-col">
        <CollectionHeading sectionKey="knowledge" total={5} />
        <CollectionCard>
          <div data-slot="toolbar-row-pin" className={PINNED_TOOLBAR}>
            <div data-slot="toolbar-row-column">the toolbar</div>
          </div>
        </CollectionCard>
      </div>
    )
    const headline = document.querySelector('[data-slot="headline"]')
    const card = document.querySelector('[data-slot="card"]')
    expect(headline!.nextElementSibling, "no action, no wrapping row -- the headline is the sibling itself").toBe(card)
  })

  it("CSS: globals.css reaches a card led by a headline (bare, or wrapped for an action) off data-slot alone, and pays the WHOLE --toolbar-lead-gap, never the strip's remainder", () => {
    const css = readFileSync(join(ROOT, "web", "app", "globals.css"), "utf8")

    const selector = String.raw`:is\(\[data-slot="headline"\],\s*:has\(>\s*\[data-slot="headline"\]\)\)\s*\+\s*\[data-slot="card"\]`

    const leadRule = new RegExp(selector + String.raw`\s*\{\s*--pinned-lead:\s*var\(--toolbar-lead-gap\)\s*;\s*\}`)
    expect(
      css,
      'web/app/globals.css must set --pinned-lead to the WHOLE var(--toolbar-lead-gap) (never a calc() remainder -- a heading pays no --tab-content-gap of its own to subtract) when the card follows a bare or action-wrapped headline'
    ).toMatch(leadRule)

    const paddingRule = new RegExp(
      selector + String.raw`\s*>\s*\[data-slot="card-content"\]\s*\{\s*padding-top:\s*var\(--toolbar-lead-gap\)\s*;\s*\}`
    )
    expect(
      css,
      "web/app/globals.css must set the same sibling's CardContent padding-top to the whole var(--toolbar-lead-gap)"
    ).toMatch(paddingRule)
  })

  it("RED PROOF: a stylesheet with only the strip's remainder rule (no headline generalisation at all) does not satisfy today's rule", () => {
    const stripOnly = `
      .pinned-strip + [data-slot="card"] {
        --pinned-lead: calc(var(--toolbar-lead-gap) - var(--tab-content-gap));
      }
      .pinned-strip + [data-slot="card"] > [data-slot="card-content"] {
        padding-top: calc(var(--toolbar-lead-gap) - var(--tab-content-gap));
      }
    `
    const selector = String.raw`:is\(\[data-slot="headline"\],\s*:has\(>\s*\[data-slot="headline"\]\)\)\s*\+\s*\[data-slot="card"\]`
    const leadRule = new RegExp(selector + String.raw`\s*\{\s*--pinned-lead:\s*var\(--toolbar-lead-gap\)\s*;\s*\}`)
    expect(stripOnly, "the strip-only stylesheet (pre-generalisation) must not read as today's heading rule").not.toMatch(
      leadRule
    )
  })
})

// THE OLD GAPLESS-COLUMN PROOF ABOVE THIS COMMENT IS RETIRED, 17 Sep 2026 (K2
// by kind). It proved collection-content.tsx's own knowledge branch paid no
// SECOND gap on top of the heading-only CSS rule below (`:is([data-slot=
// "headline"], …) + [data-slot="card"]`) — the special case that rule exists
// for, because the knowledge collection drew no tab strip at all. Now it
// does: the branch moved into its own component (knowledge-screen.tsx) and
// gained a kind-tab strip (`tabs` on `<PagedFind>`), so it is STRIP-LED like
// accounts-screen.tsx one collection over — the FIRST census below already
// covers it (`.pinned-strip + [data-slot="card"]`, through `paged-find.tsx`'s
// own `wrap` delegation), and the heading-only rule this block proved no
// longer reaches it at all (the second census, further down, says so
// explicitly). The heading-to-strip gap it used to police is no longer
// regulated by anything — `.pinned-strip + [data-slot="card"]` only cares
// about the strip's OWN preceding sibling, never what sits above it — so
// knowledge-screen.tsx spends the ordinary `gap-4` accounts-screen.tsx does
// between its own heading and its own `<PagedFind>`.

// ============================================================================
// THE SECOND CENSUS -- R83, GENERALISED 17 SEP 2026. A card can also be led by
// a HEADING instead of a strip (the knowledge collection: K36 gives it no
// tabs, so it never draws `renderFolderTabs(...)` at all). globals.css now
// reaches that shape too, off the identical DOM-adjacency idea, keyed on
// `Headline`'s own `data-slot="headline"` rather than `.pinned-strip`:
// `:is([data-slot="headline"], :has(> [data-slot="headline"])) +
// [data-slot="card"]`. This census derives, off the disk, every
// `<CollectionHeading` call whose IMMEDIATE next JSX sibling really is a
// `<CollectionCard>`/`<Card>` -- directly, or through a `wrap` a caller fills,
// the same two shapes the first census resolves -- so a future refactor that
// slides another element between the heading and the card (exactly the fault
// this file's own first census guards against for a strip) fails this one
// instead of shipping unproved.
//
// STRIP-LED SCREENS ARE DELIBERATELY *NOT* "COVERED" HERE, even where a
// `<CollectionHeading>` sits above a `<PagedFind wrap={...} tabs={...}>`
// (accounts-screen.tsx, contacts-screen.tsx, inputs-screen.tsx,
// meetings-screen.tsx): passing `tabs` makes `PagedFind` draw its own
// `renderFolderTabs(...)` strip BEFORE the card, so the card's true DOM
// PRECEDING SIBLING is the strip, not the heading -- the shape the FIRST
// census already proves, off `.pinned-strip`. Counting it twice here would
// assert something the CSS selector above does not actually do (a heading
// selector cannot also match through an intervening strip), so the "wrap
// without tabs" guard below is load-bearing, not a simplification.
// ============================================================================

const HEADING_TAG = "CollectionHeading"

/** The nearest enclosing JSX container (`<div>…</div>` or a fragment) around
 * `node`, and which of that container's own `children` entries `node` sits
 * inside -- climbing through wrapping expressions the same way `enclosingBox`
 * does, but returning the SLOT rather than just the box, so the census below
 * can ask "what comes right after this one." */
function siblingSlot(
  node: ts.Node
): { parent: ts.JsxElement | ts.JsxFragment; child: ts.Node } | undefined {
  let child: ts.Node = node
  let parent: ts.Node | undefined = node.parent
  while (parent) {
    if (ts.isJsxElement(parent) || ts.isJsxFragment(parent)) {
      if ((parent.children as readonly ts.Node[]).includes(child)) return { parent, child }
    }
    child = parent
    parent = parent.parent
  }
  return undefined
}

/** The next MEANING-BEARING child after `child` in `parent.children` --
 * whitespace-only JSX text and a comment blanked to an empty `{}` (this
 * file's own `stripComments(..., { keepLength: true })` leaves exactly that
 * shape) are skipped, the same way a browser skips them when it resolves
 * `element.nextElementSibling`. */
function nextRealSibling(
  parent: ts.JsxElement | ts.JsxFragment,
  child: ts.Node,
  sf: ts.SourceFile
): ts.JsxChild | undefined {
  const kids = parent.children
  const idx = kids.findIndex((k) => k === child)
  if (idx === -1) return undefined
  for (let i = idx + 1; i < kids.length; i++) {
    const k = kids[i]!
    if (ts.isJsxText(k) && k.getText(sf).trim() === "") continue
    if (ts.isJsxExpression(k) && !k.expression) continue
    return k
  }
  return undefined
}

function tagNameOf(el: ts.JsxSelfClosingElement | ts.JsxElement, sf: ts.SourceFile): string {
  return (ts.isJsxSelfClosingElement(el) ? el.tagName : el.openingElement.tagName).getText(sf)
}

function attributesOf(el: ts.JsxSelfClosingElement | ts.JsxElement): readonly ts.JsxAttributeLike[] {
  return ts.isJsxSelfClosingElement(el) ? el.attributes.properties : el.openingElement.attributes.properties
}

function findAttr(el: ts.JsxSelfClosingElement | ts.JsxElement, name: string, sf: ts.SourceFile): ts.JsxAttribute | undefined {
  for (const a of attributesOf(el)) {
    if (ts.isJsxAttribute(a) && a.name.getText(sf) === name) return a
  }
  return undefined
}

/** Is `sib` a card the heading rule actually reaches -- directly, or through
 * a `wrap` prop a caller filled with one, PROVIDED nothing else on that same
 * element (a `tabs` prop) draws a strip first. */
function siblingIsCard(sib: ts.JsxChild, sf: ts.SourceFile): boolean {
  if (!ts.isJsxSelfClosingElement(sib) && !ts.isJsxElement(sib)) return false
  const tag = tagNameOf(sib, sf)
  if (tag === "CollectionCard" || tag === "Card") return true

  // DELEGATED -- the element itself draws no card, but hands `wrap` to one
  // that does, e.g. `<PagedFind wrap={(inner) => <CollectionCard>...}>`.
  const wrapAttr = findAttr(sib, "wrap", sf)
  if (!wrapAttr?.initializer) return false
  if (!CARD_TAG.test(wrapAttr.initializer.getText(sf))) return false

  // …BUT ONLY IF NOTHING ON THIS SAME ELEMENT ALSO DRAWS A STRIP FIRST. A
  // `tabs` prop makes `PagedFind` render `renderFolderTabs(...)` ahead of the
  // card it wraps, so the card's real preceding sibling is the STRIP, not
  // this heading -- the shape the FIRST census (`.pinned-strip`) already
  // proves. Counting it here too would claim the heading selector reaches a
  // card it structurally cannot.
  if (findAttr(sib, "tabs", sf)) return false

  return true
}

type HeadingSite = { rel: string; line: number }

function censusHeadingCallSites(roots: string[]): { covered: HeadingSite[]; uncovered: HeadingSite[] } {
  const covered: HeadingSite[] = []
  const uncovered: HeadingSite[] = []
  for (const f of sourceFiles(roots, { extensions: [".tsx"], relativeTo: ROOT, skipTests: true })) {
    const src = stripComments(f.source, { keepLength: true })
    if (!src.includes(`<${HEADING_TAG}`)) continue
    const sf = ts.createSourceFile(f.path, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const visit = (node: ts.Node): void => {
      const isHeading =
        (ts.isJsxSelfClosingElement(node) || ts.isJsxElement(node)) && tagNameOf(node, sf) === HEADING_TAG
      if (isHeading) {
        const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1
        const site: HeadingSite = { rel: f.rel, line }
        const slot = siblingSlot(node)
        const sib = slot ? nextRealSibling(slot.parent, slot.child, sf) : undefined
        const isCovered = sib ? siblingIsCard(sib, sf) : false
        if (isCovered) covered.push(site)
        else uncovered.push(site)
        // Do not descend into a JsxSelfClosingElement's own attribute
        // initializers looking for a nested `<CollectionHeading` -- there
        // isn't one, `action` holds buttons -- but JsxElement forms (none
        // today) could, so this still walks children normally below.
      }
      ts.forEachChild(node, visit)
    }
    visit(sf)
  }
  return { covered, uncovered }
}

describe("R83 generalised -- the census of <CollectionHeading> call sites the heading rule reaches", () => {
  it("finds no <CollectionHeading> covered by the heading rule today -- knowledge (the last one) gained a strip 17 Sep 2026", () => {
    const { covered, uncovered } = censusHeadingCallSites(ROOTS)

    const coveredRels = [...new Set(covered.map((s) => s.rel))].sort()
    const uncoveredRels = [...new Set(uncovered.map((s) => s.rel))].sort()

    for (const site of covered) {
      const alsoUncovered = uncovered.some((u) => u.rel === site.rel && u.line === site.line)
      expect(alsoUncovered, `${site.rel}:${site.line} was classified both covered and uncovered`).toBe(false)
    }

    // THE KNOWLEDGE COLLECTION LEFT THIS LIST, 17 Sep 2026 (K2 by kind) --
    // it used to be the one call site this rule reached (a heading with no
    // strip above its card, K36's "this collection has no tabs to switch").
    // It gained a kind-tab strip the same day and moved into its own
    // component (knowledge-screen.tsx); its `<CollectionHeading>` is now
    // immediately followed by `<PagedFind wrap={...} tabs={...}>`, the exact
    // "wrap without tabs" exception `siblingIsCard` below carves out -- so it
    // is asserted UNCOVERED here instead, alongside accounts-screen.tsx,
    // which already stood for the identical shape.
    expect(coveredRels, `covered call sites: ${coveredRels.join(", ")}`).not.toContain(
      "web/components/deep-link/collection-content.tsx"
    )
    expect(coveredRels, `covered call sites: ${coveredRels.join(", ")}`).not.toContain(
      "web/components/knowledge/knowledge-screen.tsx"
    )

    // THE OTHER <CollectionHeading> CALL SITES THIS LANE CHECKED AND FOUND
    // NOT TO MATCH THE SAME SHAPE -- present regardless of unrelated work
    // landing elsewhere the same day (this repo runs more than one lane on
    // one shared tree), so membership rather than exact equality, exactly
    // like the first census above.
    //
    //   · stories-screen.tsx -- the heading is followed by
    //     `<SectionWithCreate folderTabs={...}>`, which draws its OWN strip
    //     ahead of its own card; the heading's real next sibling is that
    //     strip+card column, never the card alone.
    //   · time-screen.tsx -- followed by `<HoursByWeekCard>`, a bare
    //     `<section>` (pulse.tsx), never the kit's `Card` at all.
    //   · processes-screen.tsx -- followed by `<PagedFind>` with no `wrap`
    //     prop; this screen draws no `CollectionCard` around its toolbar yet,
    //     so there is no card here for any rule to reach.
    //   · accounts-screen.tsx, knowledge-screen.tsx -- both followed by
    //     `<PagedFind wrap={...} tabs={...}>`: `wrap` fills a card, but
    //     `tabs` means the strip drawn inside `PagedFind` sits between the
    //     heading and that card, so this is the FIRST census's shape
    //     (`.pinned-strip`), not this one.
    expect(uncoveredRels, `uncovered call sites: ${uncoveredRels.join(", ")}`).toEqual(
      expect.arrayContaining([
        "web/components/work/stories-screen.tsx",
        "web/components/work/time-screen.tsx",
        "web/components/process/processes-screen.tsx",
        "web/components/accounts/accounts-screen.tsx",
        "web/components/knowledge/knowledge-screen.tsx",
      ])
    )
  })
})

// ============================================================================
// THE THIRD CENSUS -- A TOOLBAR NEVER GETS ITS OWN CONTAINER (R83, 17 Sep
// 2026). Client ruling, over Tickets › Dashboard: "Look at the second
// screenshot. It is a mess, the space between and after the toolbar. Really,
// it's too much before, so go and uniform this abso-freaking-everywhere,
// please."
//
// THE SHAPE SHE NAMED, PRECISELY: the Dashboard tab used to build a SECOND
// `<Card>` around nothing but its own toolbar (`tickets-dashboard.tsx`, fixed
// the same session) -- a `toolbar-row-*` element whose only sibling, inside
// the card that held it, was itself. That is not "the content card"; it is a
// card whose entire reason to exist is the toolbar. This census derives the
// shape off the disk: a `<ToolbarRow>` reference (a literal tag, or a bare
// `{identifier}` resolved the same by-name way the FIRST census resolves a
// `<CollectionCard>` reference above) whose immediate enclosing JSX box is a
// `CardContent`/`CollectionCard` carrying no OTHER real content.
//
// UNDER-REACHES ON PURPOSE, the same direction every census in this file
// already takes: a toolbar embedded through ANOTHER component (`TriageQueue`,
// which returns a bare fragment and lets ITS OWN caller supply the card one
// file over, in tickets-collection.tsx) is invisible to a same-file walk --
// there is no card in triage-queue.tsx for this census to judge, so that call
// site is UNCOVERED rather than asserted clean. Proving THAT shape needs the
// cross-file resolution the render-based DOM proofs above already do for a
// fixed fixture; this census's job is the fault a single file can commit by
// itself, which is exactly the bug that shipped.
// ============================================================================

const TOOLBAR_TAG = "ToolbarRow"

function isCardHoldingBox(tag: string): boolean {
  return tag === "CardContent" || tag === "CollectionCard"
}

/** True when `child` is a JSX reference to the toolbar row -- a literal
 * `<ToolbarRow .../>`/`<ToolbarRow>...</ToolbarRow>` tag, or a bare
 * `{identifier}` resolved (in `fn`, the nearest enclosing function) to a
 * `const` whose own initializer carries one -- the identical BY-NAME
 * resolution `censusCallSites`'s own Shape 2 already uses for
 * `<CollectionCard>`, re-pointed at `<ToolbarRow>` instead. */
function isToolbarReference(child: ts.JsxChild, fn: ts.Node | undefined, sf: ts.SourceFile): boolean {
  if ((ts.isJsxSelfClosingElement(child) || ts.isJsxElement(child)) && tagNameOf(child, sf) === TOOLBAR_TAG)
    return true
  if (ts.isJsxExpression(child) && child.expression && ts.isIdentifier(child.expression) && fn) {
    const init = resolveConstInitializer(fn, child.expression.text, sf)
    if (init && new RegExp(`<${TOOLBAR_TAG}(?=[\\s/>])`).test(init)) return true
  }
  return false
}

type OwnContainerSite = { rel: string; line: number }

/** Judges every `CardContent`/`CollectionCard` box in one already-parsed
 * source file: OFFENDING when a toolbar reference is among its real children
 * and is the ONLY one; CLEAN when a toolbar reference sits there ALONGSIDE
 * other real content (the fixed shape -- `Panel`'s own `leadToolbar` slot, or
 * a loading/empty body beside it). A box with no toolbar reference at all
 * says nothing here either way. Pulled out of the file-walking census below
 * so the red proof can call it directly, against a source string this file
 * owns, without writing to disk. */
function judgeCardBoxes(sf: ts.SourceFile, rel: string): { offenders: OwnContainerSite[]; clean: OwnContainerSite[] } {
  const offenders: OwnContainerSite[] = []
  const clean: OwnContainerSite[] = []
  const visit = (node: ts.Node): void => {
    if (ts.isJsxElement(node) && isCardHoldingBox(tagNameOf(node, sf))) {
      const fn = enclosingFunction(node)
      const kids = node.children as readonly ts.JsxChild[]
      const real = kids.filter((k) => {
        if (ts.isJsxText(k)) return k.getText(sf).trim() !== ""
        if (ts.isJsxExpression(k)) return !!k.expression
        return true
      })
      const toolbarKids = real.filter((k) => isToolbarReference(k, fn, sf))
      if (toolbarKids.length > 0) {
        const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1
        const site: OwnContainerSite = { rel, line }
        if (real.length === toolbarKids.length) offenders.push(site)
        else clean.push(site)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return { offenders, clean }
}

function censusOwnContainer(roots: string[]): { offenders: OwnContainerSite[]; clean: OwnContainerSite[] } {
  const offenders: OwnContainerSite[] = []
  const clean: OwnContainerSite[] = []
  for (const f of sourceFiles(roots, { extensions: [".tsx"], relativeTo: ROOT, skipTests: true })) {
    // `screen-bits.tsx` DECLARES `<ToolbarRow>` (and `CollectionCard`) -- it
    // is not a call site of either, the same exclusion the FIRST census in
    // this file already makes for `renderFolderTabs(`.
    if (f.rel.endsWith("deep-link/screen-bits.tsx")) continue
    const src = stripComments(f.source, { keepLength: true })
    if (!src.includes(`<${TOOLBAR_TAG}`)) continue
    const sf = ts.createSourceFile(f.path, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const { offenders: o, clean: c } = judgeCardBoxes(sf, f.rel)
    offenders.push(...o)
    clean.push(...c)
  }
  return { offenders, clean }
}

describe("R83 -- a toolbar never gets its own container, only the content card's own first row", () => {
  it("finds no CardContent/CollectionCard whose only real content is the toolbar, off the disk", () => {
    const { offenders } = censusOwnContainer(ROOTS)
    expect(
      offenders.map((s) => `${s.rel}:${s.line}`),
      "R83 -- a toolbar sits inside a Card/CollectionCard/CardContent that holds nothing else, which is a " +
        "container built for the toolbar alone rather than the first row of the card that also holds the " +
        "collection's content -- the client's 17 Sep 2026 ruling over Tickets › Dashboard (\"too much " +
        "[space] before ... uniform this abso-freaking-everywhere\"). Merge it into the content card instead " +
        "(`Panel`'s own `leadToolbar` slot, or the toolbar as CardContent's first child alongside real content):"
    ).toEqual([])
  })

  // THE TRIPWIRE, both halves -- the same discipline every census in this
  // file is held to: a scan that finds nothing (`clean` always empty) passes
  // an "everything is fine" assertion exactly as well as one that works.
  it("the census really reaches CardContent/CollectionCard boxes that hold a toolbar alongside other content", () => {
    const { clean } = censusOwnContainer(ROOTS)
    expect(
      clean.length,
      "no CardContent/CollectionCard box in the whole app was found holding a toolbar reference PLUS other " +
        "real content -- the predicate that tells a correctly-merged toolbar from an offending one has gone " +
        "blind, and the empty offenders list above would now pass for the wrong reason"
    ).toBeGreaterThan(0)
  })

  it("RED PROOF: a Card built only to hold the toolbar -- the exact shape tickets-dashboard.tsx shipped -- fails this census", () => {
    const fixture = `
      function Old() {
        return (
          <div data-slot="toolbar-row-pin">
            <Card>
              <CardContent className="p-4 pb-0 lg:pb-0">
                <ToolbarRow empty={false} />
              </CardContent>
            </Card>
          </div>
        )
      }
    `
    const sf = ts.createSourceFile("fixture.tsx", fixture, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const { offenders, clean } = judgeCardBoxes(sf, "fixture.tsx")
    expect(offenders, "a CardContent holding only <ToolbarRow/> must be flagged").toEqual([
      { rel: "fixture.tsx", line: 6 },
    ])
    expect(clean, "a box with nothing else in it is not the clean shape").toEqual([])
  })

  it("GREEN PROOF: the fixed shape -- the toolbar merged into the same card as real content -- passes", () => {
    const fixture = `
      function Fixed() {
        return (
          <Card>
            <CardContent className="flex min-w-0 flex-col p-4">
              <ToolbarRow empty={false} />
              <Skeleton />
            </CardContent>
          </Card>
        )
      }
    `
    const sf = ts.createSourceFile("fixture.tsx", fixture, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const { offenders, clean } = judgeCardBoxes(sf, "fixture.tsx")
    expect(offenders, "a toolbar sharing its card with real content must not be flagged").toEqual([])
    expect(clean, "the shared card must register as the clean shape").toEqual([{ rel: "fixture.tsx", line: 5 }])
  })

  it("GREEN PROOF: Panel's own leadToolbar slot -- a toolbar reference resolved by name, not spelled inline -- passes", () => {
    // THE BY-NAME SHAPE, the second half of `isToolbarReference` -- Panel's
    // own `leadToolbar` prop is filled with a `const toolbar = (<ToolbarRow
    // .../>)` declared above the return, never the literal tag inline
    // (`tickets-dashboard.tsx`'s own shape, this fixture's whole reason to
    // exist beside the literal-tag proof above).
    const fixture = `
      function Fixed() {
        const toolbar = (<ToolbarRow empty={false} />)
        return (
          <Card>
            <CardContent className="flex min-w-0 flex-col p-4">
              {toolbar}
              <div>the title row and the content</div>
            </CardContent>
          </Card>
        )
      }
    `
    const sf = ts.createSourceFile("fixture.tsx", fixture, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const { offenders, clean } = judgeCardBoxes(sf, "fixture.tsx")
    expect(offenders, "a by-name toolbar reference sharing its card with real content must not be flagged").toEqual([])
    expect(clean.length, "the by-name resolution must still find the card clean").toBeGreaterThan(0)
  })
})

// ============================================================================
// THE BELOW GAP — TOOLBAR BOTTOM TO THE FIRST VISIBLE ROW, MEASURED 16px ON
// EVERY TICKETS TAB AGAINST THE RULED 10 (R49/ruling 7, "the 10pc above and
// below, both in main and details").
// ============================================================================
// `<ToolbarRow>` (screen-bits.tsx) pays `--toolbar-content-gap` correctly, as
// a real token reference on its own inner `data-slot="toolbar-row-column"`:
// `mb-[var(--toolbar-content-gap)]`, so ruling 7's shrink to `--space-2h`
// (10px) reached it automatically. `<PagedFind>` (paged-find.tsx) drew the
// IDENTICAL two-box pinned shape by hand and never wired its own copy to the
// token — its outer `data-slot="toolbar-row-pin"` carried a literal `pb-4`
// (`--space-4`, 16px) instead, a number with no reference to
// `--toolbar-content-gap` at all, so it never moved when the token did.
// Every Tickets tab (List AND Board — All, Waiting, Open, Ready) draws
// through `<PagedFind>`, so the table header row sat 16px under the toolbar
// on all of them, measured live on staging (kit v1.2.120) — 6px over the
// ruled 10.
//
// FIXED AT THE SOURCE, 18 Sep 2026 — paged-find.tsx now pays
// `pb-[var(--toolbar-content-gap)]` directly on its own outer pin wrapper,
// the same token `<ToolbarRow>` pays on its inner column, rather than the
// globals.css-scoped `[data-slot="toolbar-row-pin"].pb-4` override that used
// to reach the literal from outside. That override is deleted; it would now
// be a no-op.
// ============================================================================

describe("the below gap — PagedFind's own pinned toolbar tracks --toolbar-content-gap, not a bare 16px", () => {
  it("SOURCE: paged-find.tsx pays --toolbar-content-gap directly on its own pinned wrapper, no literal pb-4 left", () => {
    const source = readFileSync(join(ROOT, "web", "components", "records", "paged-find.tsx"), "utf8")
    expect(
      source,
      'paged-find.tsx must set pb-[var(--toolbar-content-gap)] on its data-slot="toolbar-row-pin" wrapper — the same token <ToolbarRow> pays directly, rather than a literal pb-4 relying on a CSS override to reach it'
    ).toContain('pb-[var(--toolbar-content-gap)]')
    expect(
      source,
      'paged-find.tsx must carry no bare "pb-4" any more — it was replaced by the token reference directly'
    ).not.toMatch(/(?:^|[\s,"'`])pb-4(?:[\s,"'`]|$)/)
  })

  it('CSS: globals.css no longer carries the scoped [data-slot="toolbar-row-pin"].pb-4 override — the fix lives at the source now', () => {
    const css = readFileSync(join(ROOT, "web", "app", "globals.css"), "utf8")
    const overrideRule = /\[data-slot="toolbar-row-pin"\]\.pb-4\s*\{\s*padding-bottom:\s*var\(--toolbar-content-gap\)\s*;\s*\}/
    expect(
      css,
      'web/app/globals.css must not carry the scoped [data-slot="toolbar-row-pin"].pb-4 override any more — paged-find.tsx pays the token directly now, so the override became a no-op and was deleted'
    ).not.toMatch(overrideRule)
  })

  it("DOM: PagedFind's own pinned wrapper carries the token reference directly, the same one <ToolbarRow> pays", () => {
    // Reproduced as a fixture, the same restraint every DOM proof in this
    // file already takes for `<PagedFind>` (it needs a data door this suite
    // does not stand up) — paged-find.tsx's own literal wrapper today:
    // `<div data-slot="toolbar-row-pin" className={cn(PINNED_TOOLBAR, "pb-[var(--toolbar-content-gap)]")}>`.
    function PagedFindToolbarFixture() {
      return (
        <div data-slot="toolbar-row-pin" className={`${PINNED_TOOLBAR} pb-[var(--toolbar-content-gap)]`}>
          <div data-slot="toolbar-row-column" className="flex min-w-0 flex-col bg-surface-raised rounded-pill">
            <div data-slot="toolbar-row-track">the track</div>
          </div>
        </div>
      )
    }
    render(<PagedFindToolbarFixture />)
    const pin = document.querySelector('[data-slot="toolbar-row-pin"]') as HTMLElement
    expect(pin, "PagedFind must render the pinned wrapper").toBeTruthy()
    expect(
      pin.className,
      "the wrapper must carry the --toolbar-content-gap token reference directly, not a bare pb-4"
    ).toContain("toolbar-content-gap")
    expect(pin.className, "the wrapper must carry no bare pb-4 any more").not.toMatch(/(?:^|\s)pb-4(?:\s|$)/)
    // AND THE INNER COLUMN STILL CARRIES NO mb-[var(--toolbar-content-gap)]
    // OF ITS OWN — the outer pb- is the only payer, same as before.
    const column = pin.querySelector('[data-slot="toolbar-row-column"]') as HTMLElement
    expect(
      column.className,
      "PagedFind's own inner column must carry no --toolbar-content-gap margin of its own — the outer pb- is the only payer"
    ).not.toContain("toolbar-content-gap")
  })

  it("DOM: <ToolbarRow>'s own pinned wrapper carries no pb-4 and no padding-bottom of its own — its gap lives on the CHILD's mb-", () => {
    // screen-bits.tsx's own literal shape: `<div data-slot="toolbar-row-pin"
    // className={PINNED_TOOLBAR}>` — no `pb-4`, no padding-bottom of its own
    // at all — with the gap paid one element down, on
    // `data-slot="toolbar-row-column"`'s own `mb-[var(--toolbar-content-gap)]`.
    function ToolbarRowFixture() {
      return (
        <div data-slot="toolbar-row-pin" className={PINNED_TOOLBAR}>
          <div
            data-slot="toolbar-row-column"
            className="flex min-w-0 flex-col bg-surface-raised rounded-pill mb-[var(--toolbar-content-gap)]"
          >
            <div data-slot="toolbar-row-track">the track</div>
          </div>
        </div>
      )
    }
    render(<ToolbarRowFixture />)
    const pin = document.querySelector('[data-slot="toolbar-row-pin"]') as HTMLElement
    expect(pin, "ToolbarRow must render the pinned wrapper").toBeTruthy()
    expect(pin.className, "ToolbarRow's own wrapper must carry no pb-4").not.toMatch(/(?:^|\s)pb-4(?:\s|$)/)
    const column = pin.querySelector('[data-slot="toolbar-row-column"]') as HTMLElement
    expect(column.className, "ToolbarRow's own gap must still live on the child's mb-").toContain(
      "toolbar-content-gap"
    )
  })

  it("RED PROOF: a bare pb-4 with no token reference does not read as today's fixed shape", () => {
    function PreFixFixture() {
      return (
        <div data-slot="toolbar-row-pin" className={`${PINNED_TOOLBAR} pb-4`}>
          <div data-slot="toolbar-row-column" className="flex min-w-0 flex-col bg-surface-raised rounded-pill">
            <div data-slot="toolbar-row-track">the track</div>
          </div>
        </div>
      )
    }
    render(<PreFixFixture />)
    const pin = document.querySelector('[data-slot="toolbar-row-pin"]') as HTMLElement
    expect(
      pin.className,
      "a bare pb-4 with no --toolbar-content-gap reference is the pre-fix shape, not today's"
    ).not.toContain("toolbar-content-gap")
  })
})

// ============================================================================
// THE LAW MEASURES ITSELF (R49/R83, ROUND 30, 21 Sep 2026). Aurora, verbatim:
// "review sping aboe toolbar everyhwere. f.e. in app / phases its completey
// off." Four outliers this round were found by a PERSON reading screen after
// screen: App detail's Phases tab drew the vendored kit's own
// `<CollectionFrame>` (`data-slot="collection-frame-toolbar"`), a slot none
// of R49/R83's card-keyed selectors had ever been written to reach; Account
// detail's Contacts panel fell through to `CollectionCard`'s own stale,
// un-tokened default; Work logs paid an ordinary inter-panel `gap-6` where
// the toolbar's own lead belonged. A person cannot re-read every screen every
// round, so this is that census, off the disk: a FIFTH slot that draws a
// `PINNED_TOOLBAR`-family toolbar tomorrow, through a shape none of
// `web/app/globals.css`'s rules already reach, is caught here, red, before
// it ships to staging for somebody to notice by eye a second time.
// ============================================================================
describe("R83 self-check, every pinned-toolbar data-slot is one this round's CSS actually reaches", () => {
  const GLOBALS_CSS_PATH = join(ROOT, "web", "app", "globals.css")
  const PINNED_CHROME_PATH = join(ROOT, "shared", "web", "pinned-chrome.ts")

  // WHERE A TOOLBAR CAN BE DRAWN FROM, so this census reads exactly the files
  // R83's own registers already treat as in scope: the two front doors' own
  // components, the app-shared screen engine, and the vendored kit (whose OWN
  // toolbar-pinning shape, `collection-frame.tsx`, is what this round's fix
  // had to reach around, never edit, R39/`kit-supplies-the-ui`).
  const SCAN_ROOTS: { root: string; extensions: string[] }[] = [
    { root: join(ROOT, "web", "components"), extensions: [".tsx"] },
    { root: join(ROOT, "web-portal", "components"), extensions: [".tsx"] },
    { root: join(ROOT, "shared", "web"), extensions: [".tsx", ".ts"] },
    { root: join(ROOT, "shared", "ui", "components"), extensions: [".tsx"] },
  ]

  /** Every `data-slot="…"` this codebase gives to an element that ALSO reads
   * `PINNED_TOOLBAR` or `PINNED_TOOLBAR_IN_KIT_PANEL` on the same opening
   * tag, the one shared shape every pinned toolbar in this app draws
   * through (`shared/web/pinned-chrome.ts`'s own header: "the pin belongs to
   * the ROW, nothing else writes a `sticky top-…` on a toolbar of its
   * own"). Comments stripped first, so a paragraph of prose that happens to
   * say both words within one window (this very file has several) is never
   * misread as a second call site. The window is generous (one JSX tag can
   * run long with a `cn(...)` className) but bounded, so it cannot walk into
   * an unrelated element two tags later. */
  function pinnedToolbarSlots(): Set<string> {
    const found = new Set<string>()
    for (const { root, extensions } of SCAN_ROOTS) {
      for (const file of sourceFiles(root, { extensions, skipTests: true })) {
        const stripped = stripComments(file.source, { keepLength: true })
        const re = /data-slot="([\w-]+)"[^>]{0,600}?\bPINNED_TOOLBAR(?:_IN_KIT_PANEL)?\b/g
        for (const m of stripped.matchAll(re)) found.add(m[1])
      }
    }
    return found
  }

  it("DERIVED: the app draws a pinned toolbar through exactly one self-tagged slot, toolbar-row-pin, every <ToolbarRow>/<PagedFind>/<WaveFinder>/roles-matrix/appearance-panel call site names it, and none names a second word", () => {
    const slots = pinnedToolbarSlots()
    expect(
      [...slots],
      "every element wearing PINNED_TOOLBAR must carry data-slot=\"toolbar-row-pin\", a second name here is a toolbar this round's globals.css coverage was never written to find"
    ).toEqual(["toolbar-row-pin"])
  })

  it("CSS: toolbar-row-pin's own lead is reached through its CARD ancestor, not its own name, proving the mechanism this census's ONE allowed slot actually depends on is still on disk", () => {
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8")
    // The three shapes R83 covers a toolbar-row-pin-hosting card through:
    // strip-adjacency, the nested tab pane, and a heading-led card. Any ONE
    // missing is the exact class of outlier this round fixed a member of.
    expect(css, "the strip-adjacency rule must still set --pinned-lead to the token").toMatch(
      /\.pinned-strip \+ \[data-slot="card"\][\s\S]{0,200}--pinned-lead:\s*var\(--toolbar-lead-gap\)/
    )
    expect(css, "the nested-tab-pane rule must still set --pinned-lead to the token").toMatch(
      /\[data-tab-pane\] \[data-slot="card"\]:first-child\s*\{\s*--pinned-lead:\s*var\(--toolbar-lead-gap\)/
    )
    expect(css, "the heading-led rule must still set --pinned-lead to the token").toMatch(
      /:has\(> \[data-slot="headline"\]\)\) \+ \[data-slot="card"\][\s\S]{0,200}--pinned-lead:\s*var\(--toolbar-lead-gap\)/
    )
  })

  it("CSS: every OTHER pinned-toolbar family's own fixed target slot is named in globals.css's lead rule, derived off pinned-chrome.ts rather than hand-typed", () => {
    const pinnedChrome = readFileSync(PINNED_CHROME_PATH, "utf8")
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8")
    // `PINNED_TOOLBAR_IN_KIT_PANEL` is the one other pin family. Its own
    // fixed target is read off ITS OWN source rather than typed here a
    // second time, so a future third family (or a renamed slot) is read
    // fresh every run.
    const targetMatch = /\[&_\[data-slot=([\w-]+)\]\]:sticky/.exec(pinnedChrome)
    expect(targetMatch, "PINNED_TOOLBAR_IN_KIT_PANEL must still target a data-slot").toBeTruthy()
    const target = targetMatch![1]
    expect(target, "PINNED_TOOLBAR_IN_KIT_PANEL's own known target").toBe("collection-frame-toolbar")
    // AND THE PANEL THAT HOSTS IT. collection-frame-toolbar has no
    // [data-slot="card"] ancestor to be reached through the way toolbar-row-pin
    // is, so this round's fix names the PANEL directly (globals.css, added
    // 21 Sep 2026). Both halves, the custom property and the real padding,
    // exactly as every rule above keeps them.
    expect(
      css,
      `globals.css must set --pinned-lead to the token on [data-slot="collection-frame-panel"], the container of [data-slot="${target}"]`
    ).toMatch(/\[data-slot="collection-frame-panel"\][\s\S]{0,120}--pinned-lead:\s*var\(--toolbar-lead-gap\)/)
    expect(
      css,
      `globals.css must set the real padding-top to the token on [data-slot="collection-frame-panel"]`
    ).toMatch(/\[data-slot="collection-frame-panel"\][\s\S]{0,220}padding-top:\s*var\(--toolbar-lead-gap\)/)
  })

  it("RED PROOF: a slot this census does not know about fails the exact-equality check above, rather than silently passing", () => {
    // Not a call into pinnedToolbarSlots(). A literal fixture proving the
    // ASSERTION SHAPE itself is a trap, not merely today's data. `toEqual`
    // against a fixed one-item array fails on any extra or renamed entry.
    const hypothetical = new Set(["toolbar-row-pin", "screen-toolbar-pin"])
    expect(() => expect([...hypothetical]).toEqual(["toolbar-row-pin"])).toThrow()
  })

  it("SOURCE: every renderPanel TabsContent still carries data-tab-pane, the marker the nested-tab-pane rule above depends on, so App detail's Stories/Tickets tabs (which host their own toolbar through exactly this path) keep the 10px this round confirmed rather than losing it to a future edit", () => {
    const src = readFileSync(join(ROOT, "shared", "web", "screen-engine", "tabs-view.tsx"), "utf8")
    const stripped = stripComments(src, { keepLength: true })
    expect(
      stripped,
      "TabsView's renderPanel branch must still mark every TabsContent with data-tab-pane, unconditionally, never behind a per-screen flag a future record detail could omit"
    ).toMatch(/renderPanel\s*&&[\s\S]{0,2000}<TabsContent[^>]*\bdata-tab-pane\b/)
  })
})

// ============================================================================
// R83 self-check, second miss -- THE CARD'S OWN OVERRIDE MUST BEAT THE KIT'S
// RESPONSIVE LADDER AT EVERY STEP, NOT ONLY BELOW `lg` (found live on
// staging, 21 Sep 2026, against commit 3b1014c3 -- already deployed, "already
// fixed" by the commit that shipped the round above).
// ============================================================================
// Every proof above this block confirms the THREE ancestor rules
// (strip-adjacency, nested-tab-pane, heading-led) still reach the cards they
// always reached -- App detail's Phases/Stories/Tickets tabs among them,
// still correctly 10px live. What none of them cover is the FOURTH shape,
// `CollectionCard`'s own DEFAULT, read live on Account detail's Contacts
// panel (nothing else reaches this card: no `.pinned-strip` sibling, no
// `[data-tab-pane]` ancestor, no leading `CollectionHeading`).
//
// `--pinned-lead` itself measured correctly, 10px, at every width -- the
// custom property fix (screen-bits.tsx's own `[--pinned-lead:var(
// --toolbar-lead-gap)]`, a flat token, no `lg:` step) landed exactly as
// intended. The REAL `padding-top`, on `CardContent`, did not follow it: the
// override read `pt-[var(--pinned-lead)]` alone, unprefixed, competing only
// with the kit's own unprefixed `py-6` half of `CARD_CONTENT_INSET_Y`
// (`shared/ui/components/card/card.tsx`) -- never with its OTHER half,
// `lg:py-[var(--space-7)]`, a rule Tailwind emits inside an `lg:` media
// query, after the unprefixed rules, regardless of the order classes are
// written in the source. Two classes of equal specificity, and the later one
// in the compiled stylesheet wins the tie: below `lg` the unprefixed
// override correctly beat the unprefixed `py-6` (measured live, 10px at
// 760px); at and above `lg` there was no `lg:pt-[var(--pinned-lead)]`
// counterpart to beat `lg:py-[var(--space-7)]`, so the kit's own 32px kept
// winning (measured live, 32px at 1440px, same class list both widths).
//
// Fixed the same way every other half of this round's fix was: the SAME
// token, read twice, once per step of the kit's own ladder --
// `pt-[var(--pinned-lead)] lg:pt-[var(--pinned-lead)]` -- never a second,
// different number for the wide case.
describe("R83 self-check, second miss -- CollectionCard's own default pt- override reaches the kit's lg: step too", () => {
  const SCREEN_BITS_PATH = join(ROOT, "web", "components", "deep-link", "screen-bits.tsx")

  it("SOURCE: CollectionCard's CardContent carries the --pinned-lead override at BOTH the unprefixed and the lg: step, matching the kit's own py-6 lg:py-[var(--space-7)] ladder step for step", () => {
    const src = readFileSync(SCREEN_BITS_PATH, "utf8")
    const stripped = stripComments(src, { keepLength: true })
    const match = /<CardContent className="([^"]*)">\{children\}<\/CardContent>/.exec(stripped)
    expect(
      match,
      "CollectionCard must still wrap its children in a literal CardContent with a plain className string this census can read"
    ).toBeTruthy()
    const cls = match![1]
    expect(
      cls,
      "the unprefixed override must still read --pinned-lead for padding-top, or a card nothing else reaches falls back to the kit's own unprefixed py-6 (24px)"
    ).toMatch(/(?:^|\s)pt-\[var\(--pinned-lead\)\]/)
    expect(
      cls,
      "an lg: companion must ALSO read --pinned-lead for padding-top -- without it, the kit's own lg:py-[var(--space-7)] (32px) wins at and above the lg breakpoint no matter what the unprefixed override says, the exact live miss on Account detail's Contacts panel (10px at 760px, 32px at 1440px, one unchanged class list)"
    ).toMatch(/(?:^|\s)lg:pt-\[var\(--pinned-lead\)\]/)
  })

  it("DOM: a real render of CollectionCard's CardContent carries both the unprefixed and the lg: pt- override", () => {
    const { container } = render(
      <CollectionCard>
        <div data-testid="child">child</div>
      </CollectionCard>
    )
    const content = container.querySelector('[data-slot="card-content"]')
    expect(content, "CollectionCard must render a [data-slot=\"card-content\"]").toBeTruthy()
    const cls = content!.className
    expect(cls).toMatch(/(?:^|\s)pt-\[var\(--pinned-lead\)\]/)
    expect(cls).toMatch(/(?:^|\s)lg:pt-\[var\(--pinned-lead\)\]/)
  })

  it("RED PROOF: the unprefixed override alone -- the shape 3b1014c3 actually shipped -- fails today's stricter, two-step check", () => {
    const onlyBase = "px-4 pb-4 pt-[var(--pinned-lead)]"
    expect(onlyBase).toMatch(/(?:^|\s)pt-\[var\(--pinned-lead\)\]/)
    expect(
      onlyBase,
      "the pre-fix shape carries no lg: companion, so it must fail the second half of the check above"
    ).not.toMatch(/(?:^|\s)lg:pt-\[var\(--pinned-lead\)\]/)
  })
})

// ============================================================================
// R83, DECISION B, 21 Sep 2026 -- THE <Tabs> ROOT'S OWN gap-6/gap-7 IS A
// FOURTH, STILL-UNCOUNTED NUMBER. Aurora's ruling: the toolbar under a
// detail page's own tab strip (an app's own Phases/Stories/Tickets tabs, an
// account's Contacts panel and its other tabbed panels) sits 10px under the
// strip, exactly Ruling 7's "10 above and below, both in main and details."
// ============================================================================
// Every proof above this block already establishes that a first-child card
// nested inside a record's own tab pane pays the WHOLE --toolbar-lead-gap
// (10px) as its own --pinned-lead/padding-top, cancelled at rest by
// PINNED_TOOLBAR's own mt/pt pair the identical way a top-level toolbar's
// lead cancels. What none of them touch is `STICKY_TABS`
// (web/components/records/record-chrome.tsx), which puts
// `gap-[var(--space-6)] lg:gap-[var(--space-7)]` on the <Tabs> root itself --
// the flex gap between [role=tablist] and its TabsContent sibling -- so the
// card's correctly cancelled 10px still sat under an untouched 24px (below
// lg) / 32px (lg and up) nothing here had ever reached.
//
// FIXED AT THE SEAM: globals.css now zeroes that gap, but ONLY when the
// ACTIVE tab pane's own leading card hosts a toolbar as its first child --
// jsdom's own selector engine (nwsapi, the same one Element.matches() and
// querySelector use) supports :has() well enough to prove the exact
// selector text globals.css carries actually matches a REAL render of this
// composition, not a hand-simplified stand-in.
describe("R83, decision B -- the <Tabs> root's own gap-6/gap-7 is zeroed for a toolbar-led active pane, and left alone for anything else", () => {
  const GLOBALS_CSS_PATH = join(ROOT, "web", "app", "globals.css")
  const TOKENS_CSS_PATH = join(ROOT, "shared", "ui", "foundations", "tokens", "tokens.css")

  /** The literal selector text globals.css must carry -- read once, used by
   * both the CSS proof (does the file contain it) and the DOM proof (does a
   * real render match it), so the two can never quietly drift apart. */
  const ZERO_GAP_SELECTOR =
    '[data-slot="tabs"]:has(> [data-tab-pane][data-state="active"] [data-slot="card"]:first-child > [data-slot="card-content"] > [data-slot="toolbar-row-pin"]:first-child)'

  function TabbedRecordFixture({ toolbarActive }: { toolbarActive: boolean }) {
    return (
      <TabsView
        className={STICKY_TABS}
        config={{
          ...defaultTabsConfig,
          tabs: [
            { value: "toolbar", label: "Tickets", icon: "", badge: "", badgeVariant: "" },
            { value: "facts", label: "Overview", icon: "", badge: "", badgeVariant: "" },
          ],
        }}
        value={toolbarActive ? "toolbar" : "facts"}
        renderPanel={(t) =>
          t.value === "toolbar" ? (
            <CollectionCard>
              <div data-slot="toolbar-row-pin" className={PINNED_TOOLBAR}>
                <div data-slot="toolbar-row-column">the toolbar</div>
              </div>
              <div data-testid="rows">the rows</div>
            </CollectionCard>
          ) : (
            <div data-testid="facts">fact rows, prose, nothing a toolbar draws</div>
          )
        }
      />
    )
  }

  it("DOM: a real STICKY_TABS-classed <Tabs> root, with the toolbar tab active, matches the exact selector globals.css carries", () => {
    render(<TabbedRecordFixture toolbarActive={true} />)

    const tabsRoot = document.querySelector('[data-slot="tabs"]') as HTMLElement
    expect(tabsRoot, "TabsView must render the kit's Tabs root, data-slot=\"tabs\"").toBeTruthy()

    // SANITY -- this is the real, un-simplified composition: STICKY_TABS's
    // own gap-6/lg:gap-7 classes are on this exact element, so a rule that
    // beats them has something real to beat.
    expect(tabsRoot.className, "the root must actually carry STICKY_TABS's own base gap").toMatch(
      /(?:^|\s)gap-\[var\(--space-6\)\]/
    )
    expect(tabsRoot.className, "and its lg: step").toMatch(/(?:^|\s)lg:gap-\[var\(--space-7\)\]/)

    const activePane = document.querySelector('[data-tab-pane][data-state="active"]')
    expect(activePane, "the active pane must carry both data-tab-pane and data-state=active").toBeTruthy()
    const card = activePane!.querySelector('[data-slot="card"]')
    expect(card === activePane!.firstElementChild, "the card must be the active pane's own first child").toBe(true)
    const content = card!.querySelector(':scope > [data-slot="card-content"]')
    expect(
      content!.firstElementChild?.getAttribute("data-slot"),
      "the toolbar must be the card content's own first child"
    ).toBe("toolbar-row-pin")

    expect(
      tabsRoot.matches(ZERO_GAP_SELECTOR),
      "the real, rendered <Tabs> root must match the exact selector globals.css keys the gap override on"
    ).toBe(true)
  })

  it("DOM: the SAME fixture, with the fact-rows tab active instead, does NOT match -- STICKY_TABS's own gap-6/gap-7 must stay untouched here", () => {
    render(<TabbedRecordFixture toolbarActive={false} />)

    const tabsRoot = document.querySelector('[data-slot="tabs"]') as HTMLElement
    const activePane = document.querySelector('[data-tab-pane][data-state="active"]')
    expect(activePane!.querySelector('[data-testid="facts"]'), "the active pane must be the fact-rows one").toBeTruthy()

    // VERIFIED, NOT ASSUMED -- this app's own Tabs (shared/ui/components/
    // tabs/tabs.tsx) passes no forceMount to Radix's TabsContent, so the
    // inactive tab is not merely hidden, it is not mounted at all: no
    // toolbar-row-pin exists anywhere in this render. The RUN itself is the
    // proof (querySelector across the whole document, not scoped to any
    // pane), and it is why the CSS selector's own [data-state="active"]
    // guard is a defensive second line, not the only reason this passes.
    expect(
      document.querySelector('[data-slot="toolbar-row-pin"]'),
      "with the fact-rows tab active and no forceMount anywhere in this Tabs composition, the toolbar tab's own content is not mounted at all -- confirming there is nothing here for an unguarded :has() to have falsely matched either"
    ).toBeNull()

    expect(
      tabsRoot.matches(ZERO_GAP_SELECTOR),
      "a Tabs root whose ACTIVE pane starts with fact rows must not match the toolbar-only selector -- the gap between the strip and a pane that starts with anything else must not change"
    ).toBe(false)
  })

  it('CSS: globals.css carries the exact zero-gap rule on [data-slot="tabs"]:has(...), unconditionally (no @media wrapper, so the same rule applies at every width, lg and below alike)', () => {
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8")
    // TOLERANT OF A JOINED SECOND SELECTOR, 21 Sep 2026 -- the collection-frame
    // extension (further down this file) comma-joins a second selector onto
    // this SAME rule rather than opening a second one, so the card selector's
    // own closing paren is no longer always followed straight by `{` -- it may
    // be followed by `, <second selector> {` instead. `(?:,[\s\S]*?)?` makes
    // that join optional rather than assumed, so this proof still reads as
    // "the card selector zeroes the gap" whether or not anything else is
    // joined to it; the joined-selector shape ITSELF is proved separately,
    // by name, in the collection-frame describe block below.
    const rule = new RegExp(
      String.raw`\[data-slot="tabs"\]:has\(\s*>\s*\[data-tab-pane\]\[data-state="active"\]\s+\[data-slot="card"\]:first-child\s*` +
        String.raw`>\s*\[data-slot="card-content"\]\s*>\s*\[data-slot="toolbar-row-pin"\]:first-child\s*\)\s*(?:,[\s\S]*?)?\{\s*gap:\s*0px\s*;\s*\}`
    )
    expect(
      css,
      "web/app/globals.css must zero the gap on the exact selector this suite's DOM proof above renders and matches"
    ).toMatch(rule)

    // NO lg: COMPANION -- the fix is one flat value at every width, unlike
    // STICKY_TABS's own base/lg pair it is overriding. web/app/globals.css
    // carries no @media block anywhere today (this repo does its
    // responsive work through Tailwind's lg: class prefix, never a raw
    // media query in this file), so the simplest true statement is also the
    // exact guard: this file gaining ANY @media block would be the first
    // one, and a future edit that wraps THIS rule in one would have to add
    // it.
    expect(
      css,
      "web/app/globals.css must carry no @media block -- the zero-gap rule above must apply at every width, lg and below alike, never scoped to one breakpoint"
    ).not.toMatch(/@media/)
  })

  it("ARITHMETIC: the pane's own padding-top plus the (now zeroed) tabs gap equals the same 10px token a top-level toolbar's lead already reads, at every width", () => {
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8")
    const tokens = readFileSync(TOKENS_CSS_PATH, "utf8")

    // THE CARD'S OWN CONTRIBUTION -- proved elsewhere in this file
    // (the nested-tab-pane rule) to be var(--toolbar-lead-gap), and
    // --toolbar-lead-gap itself resolves to var(--space-2h).
    expect(css, "--toolbar-lead-gap must still resolve to --space-2h").toMatch(
      /--toolbar-lead-gap:\s*var\(--space-2h\)\s*;/
    )
    const spaceMatch = /--space-2h:\s*([0-9.]+)rem/.exec(tokens)
    expect(spaceMatch, "shared/ui's own tokens.css must define --space-2h in rem").toBeTruthy()
    const spaceTwoHRem = Number(spaceMatch![1])
    const rootFontPx = 16
    const cardLeadPx = spaceTwoHRem * rootFontPx
    expect(cardLeadPx, "--space-2h must be the scale's 10px half-step").toBe(10)

    // THE TABS ROOT'S OWN CONTRIBUTION, ONCE THIS RULE FIRES -- 0px, proved
    // by the CSS test above and the DOM match proof before it.
    const tabsGapPxOnceFired = 0

    // THE SUM -- the same 10px Ruling 7 names for a top-level toolbar,
    // reached the same way (a cancelled lead, not a literal margin), at
    // every width: the zero-gap rule carries no lg: step, so this sum holds
    // identically below lg and at lg and above.
    expect(cardLeadPx + tabsGapPxOnceFired, "card lead (10) + tabs-root gap (0, once fired) must equal 10").toBe(10)
  })

  it("RED PROOF: a stylesheet missing the zero-gap rule does not satisfy the CSS proof above", () => {
    const preFix = `
      [data-tab-pane] [data-slot="card"]:first-child {
        --pinned-lead: var(--toolbar-lead-gap);
      }
      [data-tab-pane] [data-slot="card"]:first-child > [data-slot="card-content"] {
        padding-top: var(--toolbar-lead-gap);
      }
    `
    const rule = new RegExp(
      String.raw`\[data-slot="tabs"\]:has\(\s*>\s*\[data-tab-pane\]\[data-state="active"\]\s+\[data-slot="card"\]:first-child\s*` +
        String.raw`>\s*\[data-slot="card-content"\]\s*>\s*\[data-slot="toolbar-row-pin"\]:first-child\s*\)\s*\{\s*gap:\s*0px\s*;\s*\}`
    )
    expect(preFix, "the pre-fix stylesheet (card lead alone, no root-gap override) must not match today's rule").not.toMatch(
      rule
    )
  })

  // ==========================================================================
  // A LIVE PROOF OF COMMIT dc8e76b2 -- THE KIT'S OWN CollectionFrame IS A
  // DIFFERENT SHAPE, NEVER REACHED ABOVE. `ZERO_GAP_SELECTOR` keys on THIS
  // app's own `[data-slot="card"]`/`[data-slot="card-content"]` wrapper
  // (`<CollectionCard>`, published by `<ToolbarRow>`'s own `data-slot=
  // "toolbar-row-pin"` one level down) -- never the vendored kit's own
  // `CollectionFrame` (shared/ui/components/collection-frame/collection-
  // frame.tsx), whose panel is `[data-slot="collection-frame-panel"]` and
  // whose toolbar is `[data-slot="collection-frame-toolbar"]`, no
  // `[data-slot="card"]` anywhere in that subtree. The app detail's Phases
  // tab (`SprintsPanel`, work-panels.tsx, drawn through `useKitPanel`) is
  // exactly this shape, and measured LIVE, still carried the untouched 24/
  // 32px gap this whole describe block exists to zero: 32px at 1440, 24px at
  // 760, against 20px on a main list.
  // ==========================================================================
  const COLLECTION_FRAME_ZERO_GAP_SELECTOR =
    '[data-slot="tabs"]:has(> [data-tab-pane][data-state="active"] [data-slot="collection-frame"]:first-child [data-slot="collection-frame-toolbar"]:first-child)'

  /** The kit's own `CollectionFrame` shape, reproduced as a fixture rather
   * than mounting the real vendored component (the same restraint every
   * other fixture in this file already takes for `<PagedFind>`/
   * `<CollectionCard>`): `collection-frame` > `collection-frame-stack` >
   * `collection-frame-panel` > `collection-frame-toolbar` first, exactly the
   * nesting `collection-frame.tsx`'s own JSX carries when neither a heading
   * nor a `band` is passed -- SprintsPanel's own case. */
  function CollectionFrameTabbedFixture({ frameActive }: { frameActive: boolean }) {
    return (
      <TabsView
        className={STICKY_TABS}
        config={{
          ...defaultTabsConfig,
          tabs: [
            { value: "phases", label: "Phases", icon: "", badge: "", badgeVariant: "" },
            { value: "facts", label: "Overview", icon: "", badge: "", badgeVariant: "" },
          ],
        }}
        value={frameActive ? "phases" : "facts"}
        renderPanel={(t) =>
          t.value === "phases" ? (
            <section data-slot="collection-frame">
              <div data-slot="collection-frame-stack" className="flex min-w-0 flex-col">
                <div data-slot="collection-frame-panel">
                  <div data-slot="collection-frame-toolbar">the toolbar</div>
                  <div data-testid="rows">the rows</div>
                </div>
              </div>
            </section>
          ) : (
            <div data-testid="facts">fact rows, prose, nothing a toolbar draws</div>
          )
        }
      />
    )
  }

  it("DOM: a real STICKY_TABS-classed <Tabs> root, with the collection-frame tab active, matches the collection-frame selector globals.css carries", () => {
    render(<CollectionFrameTabbedFixture frameActive={true} />)

    const tabsRoot = document.querySelector('[data-slot="tabs"]') as HTMLElement
    expect(tabsRoot, 'TabsView must render the kit\'s Tabs root, data-slot="tabs"').toBeTruthy()

    const activePane = document.querySelector('[data-tab-pane][data-state="active"]')
    expect(activePane, "the active pane must carry both data-tab-pane and data-state=active").toBeTruthy()
    const frame = activePane!.querySelector('[data-slot="collection-frame"]')
    expect(frame === activePane!.firstElementChild, "the collection frame must be the active pane's own first child").toBe(
      true
    )
    const toolbar = frame!.querySelector('[data-slot="collection-frame-toolbar"]')
    expect(
      toolbar === toolbar?.parentElement?.firstElementChild,
      "the collection-frame toolbar must be its own parent's first child -- no band drawn above it"
    ).toBe(true)

    expect(
      tabsRoot.matches(COLLECTION_FRAME_ZERO_GAP_SELECTOR),
      "the real, rendered <Tabs> root must match the collection-frame selector globals.css keys the gap override on"
    ).toBe(true)

    // THE CARD SELECTOR MUST NOT ALSO CLAIM THIS -- the two selectors are
    // joined on one rule (same `{ gap: 0px }` block), never a coincidence:
    // this fixture carries no `[data-slot="card"]` anywhere, so the FIRST
    // selector in the rule has nothing here to match either.
    expect(
      tabsRoot.matches(ZERO_GAP_SELECTOR),
      "the card selector must not match a pane that never draws a [data-slot=\"card\"] at all"
    ).toBe(false)
  })

  it("DOM: the SAME fixture, with the fact-rows tab active instead, does NOT match the collection-frame selector", () => {
    render(<CollectionFrameTabbedFixture frameActive={false} />)

    const tabsRoot = document.querySelector('[data-slot="tabs"]') as HTMLElement
    const activePane = document.querySelector('[data-tab-pane][data-state="active"]')
    expect(activePane!.querySelector('[data-testid="facts"]'), "the active pane must be the fact-rows one").toBeTruthy()

    // No forceMount on this app's own Tabs (shared/ui/components/tabs/
    // tabs.tsx) -- the inactive Phases pane is not mounted at all, so there
    // is nothing here for an unguarded :has() to have falsely matched.
    expect(
      document.querySelector('[data-slot="collection-frame"]'),
      "with the fact-rows tab active, the Phases pane's own collection frame is not mounted at all"
    ).toBeNull()

    expect(
      tabsRoot.matches(COLLECTION_FRAME_ZERO_GAP_SELECTOR),
      "a Tabs root whose ACTIVE pane starts with fact rows must not match the collection-frame selector either"
    ).toBe(false)
  })

  it('CSS: globals.css joins the collection-frame selector to the card selector on the SAME rule, one `{ gap: 0px }` block, comma-separated', () => {
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8")
    // TOLERANT OF A JOINED THIRD SELECTOR, 21 Sep 2026 -- the PagedPanelBody
    // wrapper extension (further down this file) comma-joins a third selector
    // onto this SAME rule after the collection-frame one, so the
    // collection-frame selector's own closing paren is no longer always
    // followed straight by `{` -- it may be followed by `, <third selector>
    // {` instead. `(?:,[\s\S]*?)?` makes that join optional rather than
    // assumed, the identical tolerance this file's own card-selector proof
    // above already applies for the same reason.
    const rule = new RegExp(
      String.raw`\[data-slot="tabs"\]:has\(\s*>\s*\[data-tab-pane\]\[data-state="active"\]\s+\[data-slot="card"\]:first-child\s*` +
        String.raw`>\s*\[data-slot="card-content"\]\s*>\s*\[data-slot="toolbar-row-pin"\]:first-child\s*\)\s*,\s*` +
        String.raw`\[data-slot="tabs"\]:has\(\s*>\s*\[data-tab-pane\]\[data-state="active"\]\s+\[data-slot="collection-frame"\]:first-child\s+` +
        String.raw`\[data-slot="collection-frame-toolbar"\]:first-child\s*\)\s*(?:,[\s\S]*?)?\{\s*gap:\s*0px\s*;\s*\}`
    )
    expect(
      css,
      "web/app/globals.css must carry both selectors, comma-joined, on the SAME rule this suite's DOM proofs above render and match -- two selectors sharing one declaration, never two separate rules that could drift apart"
    ).toMatch(rule)
  })

  it("RED PROOF: the card-only rule (this describe block's own pre-extension shape) does not satisfy the joined-selector CSS proof above", () => {
    const cardOnly = `
      [data-slot="tabs"]:has(
          > [data-tab-pane][data-state="active"] [data-slot="card"]:first-child
            > [data-slot="card-content"] > [data-slot="toolbar-row-pin"]:first-child
        ) {
        gap: 0px;
      }
    `
    const rule = new RegExp(
      String.raw`\[data-slot="tabs"\]:has\(\s*>\s*\[data-tab-pane\]\[data-state="active"\]\s+\[data-slot="card"\]:first-child\s*` +
        String.raw`>\s*\[data-slot="card-content"\]\s*>\s*\[data-slot="toolbar-row-pin"\]:first-child\s*\)\s*,\s*` +
        String.raw`\[data-slot="tabs"\]:has\(\s*>\s*\[data-tab-pane\]\[data-state="active"\]\s+\[data-slot="collection-frame"\]:first-child\s+` +
        String.raw`\[data-slot="collection-frame-toolbar"\]:first-child\s*\)\s*(?:,[\s\S]*?)?\{\s*gap:\s*0px\s*;\s*\}`
    )
    expect(
      cardOnly,
      "a rule missing the collection-frame selector must not read as today's extended, two-selector rule"
    ).not.toMatch(rule)
  })

  // ==========================================================================
  // R83 EXTENDED AGAIN, 21 Sep 2026 -- A PagedPanelBody-NESTED PANE (the app
  // detail's Stories and Tickets tabs among them) STILL PAID THE UNTOUCHED
  // 32/24px. Diagnosed live with Playwright against staging: `[data-slot=
  // "card-content"]`'s own first child there is never `[data-slot="toolbar-
  // row-pin"]` directly, it is one plain wrapper `<div class="flex w-full
  // flex-col">` -- `PagedFind`'s own `toolbarAndRows` node (paged-find.tsx),
  // which every `PagedPanelBody` caller (work-panels.tsx: Stories, Processes,
  // App meetings, App tickets, To-dos) gets for free through its own
  // `wrap={(toolbarAndRows) => <CollectionCard>{toolbarAndRows}</
  // CollectionCard>}` -- with the toolbar as THAT wrapper's own first child
  // instead of card-content's. The `>` combinator between card-content and
  // the toolbar was the step that failed, never `:first-child` on either
  // side, and never the pane/card half above it (already reached through a
  // descendant combinator, proved by the ORIGINAL card describe block).
  // ==========================================================================
  const WRAPPED_CARD_ZERO_GAP_SELECTOR =
    '[data-slot="tabs"]:has(> [data-tab-pane][data-state="active"] [data-slot="card"]:first-child > [data-slot="card-content"] > :first-child > [data-slot="toolbar-row-pin"]:first-child)'

  /** `PagedPanelBody`'s exact real shape (work-panels.tsx's own `wrap`):
   * `CollectionCard`'s `CardContent` wraps `PagedFind`'s own `toolbarAndRows`
   * div, and THAT div, never `CardContent` itself, holds the toolbar as its
   * first child -- reproduced as a fixture rather than mounting the real
   * `<PagedFind>`, the same restraint every other fixture in this file takes. */
  function PagedPanelBodyTabbedFixture({ toolbarActive }: { toolbarActive: boolean }) {
    return (
      <TabsView
        className={STICKY_TABS}
        config={{
          ...defaultTabsConfig,
          tabs: [
            { value: "stories", label: "Stories", icon: "", badge: "", badgeVariant: "" },
            { value: "facts", label: "Overview", icon: "", badge: "", badgeVariant: "" },
          ],
        }}
        value={toolbarActive ? "stories" : "facts"}
        renderPanel={(t) =>
          t.value === "stories" ? (
            <CollectionCard>
              <div className="flex w-full flex-col">
                <div data-slot="toolbar-row-pin" className={PINNED_TOOLBAR}>
                  <div data-slot="toolbar-row-column">the toolbar</div>
                </div>
                <div data-testid="rows">the rows</div>
              </div>
            </CollectionCard>
          ) : (
            <div data-testid="facts">fact rows, prose, nothing a toolbar draws</div>
          )
        }
      />
    )
  }

  it("DOM: a real STICKY_TABS-classed <Tabs> root, with a PagedPanelBody-shaped toolbar tab active (the app detail's Stories/Tickets tabs), matches the wrapped-card selector globals.css carries, and NOT the direct-child card selector", () => {
    render(<PagedPanelBodyTabbedFixture toolbarActive={true} />)

    const tabsRoot = document.querySelector('[data-slot="tabs"]') as HTMLElement
    const activePane = document.querySelector('[data-tab-pane][data-state="active"]')
    const card = activePane!.querySelector('[data-slot="card"]')
    expect(card === activePane!.firstElementChild, "the card must be the active pane's own first child").toBe(true)
    const content = card!.querySelector(':scope > [data-slot="card-content"]')
    const wrapper = content!.firstElementChild
    expect(
      wrapper?.getAttribute("data-slot"),
      "card-content's own first child must be a plain wrapper, never the toolbar directly -- PagedFind's own toolbarAndRows div"
    ).toBeNull()
    expect(
      wrapper?.firstElementChild?.getAttribute("data-slot"),
      "the toolbar must be the wrapper's own first child"
    ).toBe("toolbar-row-pin")

    expect(
      tabsRoot.matches(WRAPPED_CARD_ZERO_GAP_SELECTOR),
      "the real, rendered <Tabs> root must match the wrapped-card selector globals.css keys the gap override on"
    ).toBe(true)

    // THE DIRECT-CHILD CARD SELECTOR MUST NOT ALSO CLAIM THIS -- the whole
    // point of the original selector's failure on this exact shape, proved
    // structurally rather than merely asserted.
    expect(
      tabsRoot.matches(ZERO_GAP_SELECTOR),
      "the direct-child card selector must not match a card-content whose first child is a wrapper, not the toolbar itself"
    ).toBe(false)
  })

  it("DOM: the SAME fixture, with the fact-rows tab active instead, does NOT match the wrapped-card selector", () => {
    render(<PagedPanelBodyTabbedFixture toolbarActive={false} />)

    const tabsRoot = document.querySelector('[data-slot="tabs"]') as HTMLElement
    const activePane = document.querySelector('[data-tab-pane][data-state="active"]')
    expect(activePane!.querySelector('[data-testid="facts"]'), "the active pane must be the fact-rows one").toBeTruthy()

    expect(
      document.querySelector('[data-slot="toolbar-row-pin"]'),
      "no forceMount on this app's own Tabs -- the inactive Stories pane is not mounted at all"
    ).toBeNull()

    expect(
      tabsRoot.matches(WRAPPED_CARD_ZERO_GAP_SELECTOR),
      "a Tabs root whose ACTIVE pane starts with fact rows must not match the wrapped-card selector either"
    ).toBe(false)
  })

  it("RED PROOF: a wrapper that itself leads with prose before the toolbar does not match the wrapped-card selector -- :first-child on the toolbar's own side of the chain still refuses it", () => {
    function ProseLeadFixture() {
      return (
        <TabsView
          className={STICKY_TABS}
          config={{
            ...defaultTabsConfig,
            tabs: [{ value: "stories", label: "Stories", icon: "", badge: "", badgeVariant: "" }],
          }}
          value="stories"
          renderPanel={() => (
            <CollectionCard>
              <div className="flex w-full flex-col">
                <p>a fact row ahead of the toolbar</p>
                <div data-slot="toolbar-row-pin" className={PINNED_TOOLBAR}>
                  <div data-slot="toolbar-row-column">the toolbar</div>
                </div>
              </div>
            </CollectionCard>
          )}
        />
      )
    }
    render(<ProseLeadFixture />)
    const tabsRoot = document.querySelector('[data-slot="tabs"]') as HTMLElement
    expect(
      tabsRoot.matches(WRAPPED_CARD_ZERO_GAP_SELECTOR),
      "a wrapper whose own first child is prose, not the toolbar, must not match -- the toolbar is no longer :first-child of ITS parent either"
    ).toBe(false)
  })

  it('CSS: globals.css carries the wrapped-card selector as a third, comma-joined alternative on the SAME rule', () => {
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8")
    const rule = new RegExp(
      String.raw`\[data-slot="tabs"\]:has\(\s*>\s*\[data-tab-pane\]\[data-state="active"\]\s+\[data-slot="card"\]:first-child\s*` +
        String.raw`>\s*\[data-slot="card-content"\]\s*>\s*:first-child\s*>\s*\[data-slot="toolbar-row-pin"\]:first-child\s*\)\s*\{\s*gap:\s*0px\s*;\s*\}`
    )
    expect(
      css,
      "web/app/globals.css must carry the wrapped-card selector (one first-child wrapper between card-content and the toolbar) on the same zero-gap rule"
    ).toMatch(rule)
  })

  it("RED PROOF: the rule without the wrapped-card selector (this round's own pre-fix shape) does not satisfy the CSS proof above", () => {
    const preFix = `
      [data-slot="tabs"]:has(
          > [data-tab-pane][data-state="active"] [data-slot="card"]:first-child
            > [data-slot="card-content"] > [data-slot="toolbar-row-pin"]:first-child
        ),
      [data-slot="tabs"]:has(
          > [data-tab-pane][data-state="active"] [data-slot="collection-frame"]:first-child
            [data-slot="collection-frame-toolbar"]:first-child
        ) {
        gap: 0px;
      }
    `
    const rule = new RegExp(
      String.raw`\[data-slot="tabs"\]:has\(\s*>\s*\[data-tab-pane\]\[data-state="active"\]\s+\[data-slot="card"\]:first-child\s*` +
        String.raw`>\s*\[data-slot="card-content"\]\s*>\s*:first-child\s*>\s*\[data-slot="toolbar-row-pin"\]:first-child\s*\)\s*\{\s*gap:\s*0px\s*;\s*\}`
    )
    expect(preFix, "the pre-fix rule (no wrapped-card selector) must not match today's extended proof").not.toMatch(rule)
  })
})
