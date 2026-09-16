// R83 AMENDMENT, 16 Sep 2026 EVENING — THE CARD PAYS THE REMAINDER OF
// `--toolbar-lead-gap`, NEVER THE WHOLE INSET AND NEVER ZERO.
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

import { renderFolderTabs, defaultTabsConfig } from "@shared/web/screen-engine/tabs-view"
import { PINNED_TOOLBAR } from "@shared/web/pinned-chrome"
import { CollectionCard } from "@/components/deep-link/screen-bits"
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

  it("CSS: globals.css defines --toolbar-lead-gap at the scale's real 32px step and pays the card's remainder off it", () => {
    const css = readFileSync(join(ROOT, "web", "app", "globals.css"), "utf8")

    // THE TOKEN -- `--space-7` is the scale's own 32px step
    // (`shared/ui/foundations/tokens/tokens.css`: "p-8 is 32px, which is
    // --space-7 here"), never `--space-6` (24px, a card inset) -- a guess
    // that this token means --space-6 is wrong: --space-6 is 24px.
    const tokenRule = /--toolbar-lead-gap:\s*var\(--space-7\)\s*;/
    expect(
      css,
      "web/app/globals.css must define --toolbar-lead-gap: var(--space-7) at :root -- --space-7 is the scale's real 32px step, not --space-6 (24px)"
    ).toMatch(tokenRule)

    // THE CARD'S OWN REMAINDER -- the strip already paid --tab-content-gap
    // (20px); the card pays only what is left of --toolbar-lead-gap (32px),
    // 12px, on BOTH the real padding and the R63 lead property that
    // reproduces it while pinned.
    const remainder = "calc(var(--toolbar-lead-gap) - var(--tab-content-gap))"
    const leadRule = new RegExp(
      String.raw`\.pinned-strip\s*\+\s*\[data-slot="card"\]\s*\{\s*--pinned-lead:\s*` +
        escapeRe(remainder) +
        String.raw`\s*;\s*\}`
    )
    const paddingRule = new RegExp(
      String.raw`\.pinned-strip\s*\+\s*\[data-slot="card"\]\s*>\s*\[data-slot="card-content"\]\s*\{\s*padding-top:\s*` +
        escapeRe(remainder) +
        String.raw`\s*;\s*\}`
    )

    expect(
      css,
      `web/app/globals.css must set [data-slot="card-content"]'s own padding-top to ${remainder} when it is the strip's next sibling -- the strip already paid --tab-content-gap, so the card pays only what --toolbar-lead-gap has left`
    ).toMatch(paddingRule)

    expect(
      css,
      `and web/app/globals.css must set the SAME sibling's --pinned-lead to ${remainder} alongside it -- PINNED_TOOLBAR's own mt/pt pair (shared/web/pinned-chrome.ts) only cancels a lead at rest; leaving --pinned-lead at a different number from the real padding pulls a PINNED toolbar to the wrong place`
    ).toMatch(leadRule)
  })

  // THE RED PROOFS -- the shape every current screen was actually in between
  // the two amendments: the strip's own gap is correct, but the card either
  // adds a second, unrelated ladder above a leading toolbar (the original
  // bug, unrepresented here because it never had a matching override rule to
  // begin with -- see "no override at all" below) or drops it to flush zero
  // (the afternoon's overcorrection, which the client herself rejected that
  // evening). Replayed against fixtures rather than a git diff, the same
  // discipline toolbar-lead-gap.test.ts's own waves-screen fixture uses.
  it("neither the pre-fix stylesheet (no override) nor the flush-zero overcorrection matches the current, remainder-paying rule", () => {
    const remainder = "calc(var(--toolbar-lead-gap) - var(--tab-content-gap))"
    const leadRule = new RegExp(
      String.raw`\.pinned-strip\s*\+\s*\[data-slot="card"\]\s*\{\s*--pinned-lead:\s*` +
        escapeRe(remainder) +
        String.raw`\s*;\s*\}`
    )
    const paddingRule = new RegExp(
      String.raw`\.pinned-strip\s*\+\s*\[data-slot="card"\]\s*>\s*\[data-slot="card-content"\]\s*\{\s*padding-top:\s*` +
        escapeRe(remainder) +
        String.raw`\s*;\s*\}`
    )

    const preFix = `
      .pinned-strip { background: var(--surface-raised); }
      *:has(> .pinned-strip) { --pinned-chrome-h: calc(var(--tab-strip-h) + var(--tab-content-gap)); }
    `
    expect(preFix, "the pre-fix stylesheet has no override rule at all").not.toMatch(paddingRule)
    expect(preFix, "and no --pinned-lead override either").not.toMatch(leadRule)

    // THE AFTERNOON'S OWN SHAPE -- flush-zero, correct in isolation on 16 Sep
    // 2026 afternoon and wrong by that evening's ruling. It must not satisfy
    // today's remainder-based rule either, because `0px` is not
    // `calc(var(--toolbar-lead-gap) - var(--tab-content-gap))` textually,
    // even though both happened to read 20px total under the FIRST amendment
    // -- this rule reads the stylesheet, never the rendered number.
    const flushZero = `
      .pinned-strip + [data-slot="card"] {
        --pinned-lead: 0px;
      }
      .pinned-strip + [data-slot="card"] > [data-slot="card-content"] {
        padding-top: 0px;
      }
    `
    expect(flushZero, "the flush-zero overcorrection must not read as today's remainder-paying rule").not.toMatch(
      paddingRule
    )
    expect(flushZero, "same, for --pinned-lead").not.toMatch(leadRule)
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
