// THE KNOWLEDGE COLLECTION GETS A TAB STRIP BY KIND — the client's ruling,
// 17 Sep 2026, verbatim, from a consultation: "Knowledge page K2 by kind."
// Tabs = All, then one tab per source KIND the data actually has, each with
// its own exact count (R16). Read off disk, the same "real call site" proof
// web/test/knowledge-head.test.tsx already uses for this screen — a render
// would need the whole `PagedFind`/`CollectionHeading` scaffolding to prove
// nothing beyond what the source itself already states plainly: which
// vocabulary the tabs come from, where the counts come from, and that the
// old Kind facet is gone.

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import { KNOWLEDGE_KIND, KNOWLEDGE_KIND_ICON } from "@/components/deep-link/shape"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, "..", "..")

function readKnowledgeScreen(): string {
  return readFileSync(join(ROOT, "web", "components", "knowledge", "knowledge-screen.tsx"), "utf8")
}

describe("the knowledge tab strip is built from the kind vocabulary, with counts", () => {
  it("derives one tab per KNOWLEDGE_KIND the door actually badges, never a hand-typed list", () => {
    const src = readKnowledgeScreen()
    // THE VOCABULARY — the app's own kind labels and icons (shape.tsx), the
    // same table every source's own card already reads (KnowledgeSourceCard),
    // never a second, hand-copied list of kinds.
    expect(src).toMatch(/import\s*\{\s*KNOWLEDGE_KIND,\s*KNOWLEDGE_KIND_ICON\s*\}\s*from\s*"@\/components\/deep-link\/shape"/)
    expect(src, "walks the vocabulary's own keys").toMatch(/Object\.keys\(KNOWLEDGE_KIND\)/)
    expect(src, "a kind with none today draws no tab — the data decides, not the code").toMatch(
      /\.filter\(\(k\)\s*=>\s*\(byKind\[k\]\s*\?\?\s*0\)\s*>\s*0\)/
    )
    expect(src, "the label is the app's own word for the kind").toMatch(/label:\s*KNOWLEDGE_KIND\[k\]/)
    expect(src, "the glyph is the app's own icon for the kind").toMatch(/icon:\s*KNOWLEDGE_KIND_ICON\[k\]/)

    // Every kind KNOWLEDGE_KIND_ICON draws a glyph for also has a word in
    // KNOWLEDGE_KIND — the tab strip reads both off the SAME kind, so a gap
    // between the two tables would draw a badge with no label or a label
    // with no glyph.
    for (const kind of Object.keys(KNOWLEDGE_KIND_ICON)) {
      expect(Object.prototype.hasOwnProperty.call(KNOWLEDGE_KIND, kind), `KNOWLEDGE_KIND has a word for "${kind}"`).toBe(
        true
      )
    }
  })

  it("counts each tab through the door's own sidecar (R16) — never a client-side count of the loaded page", () => {
    const src = readKnowledgeScreen()
    // THE SIDECAR — `byKind` read off `knowledgeByKindKey`, the cache the
    // door's own `countSourceKinds` primes (workers/content/src/lib/
    // knowledge.ts), re-primed by this screen's own `fetchPage` on every
    // search/facet/tab change so a badge never answers a stale question.
    expect(src).toMatch(/useCachedValue<Record<string,\s*number>>\(knowledgeByKindKey\(teamId\)\)/)
    expect(src, "the badge is the exact count, through formatCount").toMatch(/badge:\s*formatCount\(byKind\[k\]\)/)
    expect(src, "re-primes on every real fetch, not only the resting read").toMatch(
      /primeCache\(knowledgeByKindKey\(teamId\),\s*r\.byKind\)/
    )
    // NEVER counted off the loaded rows — `loadedSources.length` (the
    // resting page) must not appear anywhere near a badge computation.
    expect(src).not.toMatch(/badge:\s*(?:formatCount\()?loadedSources\.length/)
  })
})

describe("the Kind facet leaves the toolbar — the strip replaces it", () => {
  it("filters `kind` out of the facet row the door still returns", () => {
    const src = readKnowledgeScreen()
    const at = src.indexOf("facets={translatedFacets(")
    expect(at, "the knowledge screen's own facets prop").toBeGreaterThan(-1)
    const tag = src.slice(at, at + 500)
    expect(tag, 'the tabs replace it — her own words').toMatch(/\.filter\(\(f\)\s*=>\s*f\.field\s*!==\s*"kind"\)/)
    // Compartment and active stay — nothing else about the toolbar's other
    // facets was asked to change.
    expect(tag).toMatch(/compartment:/)
  })
})

describe('"All" is the default tab', () => {
  it("the strip's first tab is All, and an unrecognised/absent ?tab= falls back to it", () => {
    const src = readKnowledgeScreen()
    const tabsAt = src.indexOf("const knowledgeTabs")
    expect(tabsAt).toBeGreaterThan(-1)
    const allAt = src.indexOf('value: "all"', tabsAt)
    const kindTabsSpreadAt = src.indexOf("...kindTabs", tabsAt)
    expect(allAt, '"all" is declared').toBeGreaterThan(tabsAt)
    expect(kindTabsSpreadAt, "the kind tabs are spread in").toBeGreaterThan(tabsAt)
    expect(allAt, "All leads the array, before the kind tabs").toBeLessThan(kindTabsSpreadAt)

    expect(src, "an unbadged/absent tab value falls through to \"all\"").toMatch(
      /const activeTab = tab && byKind\[tab\] \? tab : "all"/
    )
    // THE URL AGREES — pressing back onto the default omits `?tab=` entirely,
    // the same shape accounts-screen.tsx's own Active/Inactive/All strip uses.
    expect(src).toMatch(/onValueChange:\s*\(v\)\s*=>\s*go\(sectionPath,\s*v === "all" \? \{\} : \{ tab: v \}\)/)
  })
})

describe("the strip pins on scroll for free (R77)", () => {
  it("wires `tabs` on <PagedFind>, which draws through the one seam every host of it already pins through", () => {
    const src = readKnowledgeScreen()
    // The strip is never a bare `<TabsView>` here — R77's own census
    // (tab-strips-pin.test.ts) only has to account for a literal `<TabsView`
    // mount, and this screen draws none: `<PagedFind tabs={...}>` delegates
    // to `renderFolderTabs`, which is the one place `STICKY_FOLDER_TABS` is
    // ever spelled, so every host of it — this one included — pins without
    // being told.
    expect(src).not.toMatch(/<TabsView\b/)
    const at = src.indexOf("tabs={{")
    expect(at, "the tabs prop is really wired on <PagedFind>").toBeGreaterThan(-1)
    const tag = src.slice(at, at + 300)
    expect(tag, "built from the shared TabsConfig default, like every other tab strip in the app").toMatch(
      /config:\s*\{\s*\.\.\.defaultTabsConfig,\s*tabs:\s*knowledgeTabs\s*\}/
    )
  })
})
