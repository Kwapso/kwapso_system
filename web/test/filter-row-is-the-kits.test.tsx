// THE FILTER ROW IS THE KIT'S, AND THE WAYS IT COULD QUIETLY STOP BEING.
//
// THE FINDING THAT EARNED THIS FILE (2026-08-27). The design kit has shipped
// `components/filter-bar/filter-bar.tsx` — exporting `FilterBar`,
// `SearchableFacet` and `RangeFacet` — since it landed, and NOTHING in `web/`,
// `web-portal/` or `shared/web/` imported a line of it. The app had hand-written
// its own three, under the SAME THREE NAMES, in `shared/web/screen-engine/`. So
// every other control in this app converged with the designer's build by
// construction, and this one could not: we were not drawing her component at
// all, and no check could tell, because a file called `filter-bar.tsx` exporting
// `FilterBar` is exactly what a correct adoption looks like from the outside.
//
// That is why the first assertion below is about IMPORTS rather than markup. The
// kit's own vendoring guard (`vendored-kit.test.ts`) proves the kit is
// unmodified; `kit-supplies-the-ui` (R39) proves nothing ELSE supplies a
// control. Neither can see a control the kit supplies and the app declines.
//
// The rest are the ways the adoption could survive as an import and die as a
// behaviour, each one measured in a real browser on the day it was written and
// each one invisible in a screenshot. Three of them are the client's rulings of
// 2026-09-02, and the FIRST of those is here because it had already broken
// twice with nothing catching it:
//
//   · THE PANEL EXPANDS THE SPACE. An open filter panel pushes the collection
//     down and the toolbar's own pill does not change shape. Pass one made the
//     panel a flex child of the pill and drew a giant oval; pass two made it
//     `position: absolute` and it floated over the rows. Both were shipped,
//     both were caught by a person looking at a screenshot, and nothing in this
//     suite could see either. It can now: the test below opens the panel and
//     asserts the pill track's own subtree is BYTE-IDENTICAL open and closed.
//   · THE TOOLBAR SAYS A COUNT, NEVER THE FILTERS. No chip for an active facet,
//     anywhere in the row.
//   · THE THREE PILLS ARE ONE FAMILY. Filter's box matches sort's and view's,
//     derived from the kit's own source at both ends rather than pinned.

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import * as React from "react"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"
import { toast } from "@shared/ui/components/sonner/sonner"
import { useFilterBar } from "@shared/web/screen-engine/filter-bar"
import type { FacetOption, FilterFacet } from "@shared/web/screen-engine/config"
import { COLLECTION_FILTERS } from "@/lib/collection-filters"
import { BASE_RECIPES } from "@/lib/screens"

const ROOT = join(__dirname, "..", "..")
const ADAPTER = "shared/web/screen-engine/filter-bar.tsx"
const KIT_FILTER_BAR = "@shared/ui/components/filter-bar/filter-bar"
const KIT_COMPACT_FACET = "CompactFacet"

const adapterSource = () => readFileSync(join(ROOT, ADAPTER), "utf8")
const kitSource = (rel: string) => readFileSync(join(ROOT, "shared", "ui", rel), "utf8")

/** Radix measures itself and captures the pointer; jsdom does neither, and
 * without these a panel never opens — which would make every assertion below
 * pass by never running. */
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
  // THE WIDTH THESE TESTS ARE WRITTEN AT. `test/setup.ts`'s blanket
  // `matchMedia` answers `false` to every query, which for `useHasRoom`
  // (`shared/ui/lib/use-has-room.ts`) means "a phone" — so without this every
  // assertion below would be made against the bottom-sheet form and never
  // against the two this file is about. A `false` answer here is a real,
  // separate case and it has its own file
  // (`web/test/filters-open-as-an-overlay.test.tsx`, which drives all three).
  answerRoom(true)
})

/** Say how wide the window is, the one way anything in this app asks: one
 * media query, answered honestly. `(min-width: 45rem)` is the kit's own
 * threshold and the only query these components read. */
function answerRoom(hasRoom: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: query.includes("min-width: 45rem") ? hasRoom : false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

afterEach(cleanup)


/** The knowledge base's own shape: a closed vocabulary and a facet over rows. */
const CLIENTS: FacetOption[] = [
  { value: "a1", label: "Bergman S.A." },
  // 45 characters. The strings these facets carry are account and client names,
  // which is why the "the toolbar never names one" case below is not
  // hypothetical — it is the case a chip used to have to truncate.
  { value: "a2", label: "Northwind Traders International Holdings Ltd." },
]

const FACETS: FilterFacet[] = [
  {
    field: "kind",
    label: "Type",
    control: "select",
    options: [
      { value: "meeting", label: "From a meeting" },
      { value: "note", label: "A note" },
    ],
  },
  { field: "compartment", label: "Filed under", control: "select", options: CLIENTS },
]

/** The bar as a screen holds it: the selection is the SCREEN's state, which is
 * the only way `onChange` can be observed doing what it says.
 *
 * ONE NODE NOW (client ruling, 2026-09-23 — `useFilterBar` returns the Filter
 * control WITH the overlay it opens, because the facets no longer land
 * anywhere but a portaled surface). These standalone tests only ever query by
 * ROLE across the whole document, so they never cared where the two halves
 * went; `ToolbarRowHarness` below is the one that does. */
function Harness({ facets = FACETS }: { facets?: FilterFacet[] }) {
  const [values, setValues] = React.useState<Record<string, string>>({})
  const filter = useFilterBar({
    facets,
    values,
    data: [],
    onChange: (field, value) =>
      setValues((s) => {
        const next = { ...s }
        if (value === "") delete next[field]
        else next[field] = value
        return next
      }),
    onClearFacets: () => setValues({}),
  })
  return (
    <>
      {filter}
      <span data-testid="values">{JSON.stringify(values)}</span>
    </>
  )
}

/** Open the facet panel and choose a word. The panel opens once and stays open;
 * pressing the slot again would toggle it shut.
 *
 * TWO OPENINGS, NOT ONE, since the facets became compact fields (2026-09-02):
 * the PANEL opens off the "Filter" pill, and then the facet's own trigger
 * opens its own popover.
 *
 * THE TRIGGER IS A BUTTON, NOT A COMBOBOX (v1.2.27, `CompactFacet`). It used
 * to be the kit's `Select`, whose trigger claims `role="combobox"` and opens
 * on `pointerdown` — the one event Radix's `Select` trigger listens for, so a
 * bare `click` used to open nothing. Adopting `CompactFacet` swapped that for
 * the kit's own disclosure-button trigger over a Radix `Popover`
 * (`CompactFacet`'s own doc: "NOT A COMBOBOX, deliberately... it does not
 * claim `role="combobox"` the way `SelectTrigger` does"), and `Popover`'s own
 * trigger opens on a plain `click` (`@radix-ui/react-popover`'s own
 * `onClick`), not `pointerdown` — so this now finds a plain `button`, the only
 * one inside the facet's own `role="group"` (the group holds nothing but its
 * label and this trigger), and clicks it the ordinary way.
 *
 * The list is PORTALLED, so the option is found on `screen` rather than inside
 * the facet's own group; the facet is still addressed by its heading first, so
 * a test cannot pass by operating the facet beside it. */
async function pick(label: string, option: string) {
  if (screen.queryAllByRole("group", { name: label }).length === 0) openPanel()
  const facet = await screen.findByRole("group", { name: label })
  fireEvent.click(within(facet).getByRole("button"))
  const listbox = await screen.findByRole("listbox")
  fireEvent.click(within(listbox).getByRole("option", { name: option }))
}

/** Open the overlay off the toolbar's own Filter control. */
const openPanel = () => fireEvent.click(screen.getByRole("button", { name: /^Filter/, hidden: true }))

/** WHAT THE TOOLBAR SAYS — the pill's own words, which since 2026-09-02 are
 * the only thing it says about what is narrowing the list. The label
 * ("Filter") and the count are two DOM nodes since 2026-09-03 — a real
 * `Badge` beside the word, not a number folded into one string (client
 * ruling: "Mango round background with no border behind the number") — so
 * this reads them separately rather than concatenating textContent, which
 * would run the two together with no space (e.g. "Filter1") and obscure
 * which half changed. Returns `null` for the count when the badge renders
 * nothing (`Badge`'s own zero law: `count <= 0` is `null`, not "0"). */
const pillSays = () => {
  const add = document.querySelector('[data-slot="filter-bar-add"]')
  const badge = add?.querySelector('[data-slot="badge"]')
  return {
    label: add?.firstChild?.textContent ?? "(no pill)",
    count: badge?.textContent ?? null,
  }
}

/** The kit's own chip, which this app must now never draw one of. */
const chips = () => document.querySelectorAll('[data-slot="filter-chip"]')

/** THE OPEN OVERLAY, whichever of the three forms it took. One slot name for
 * all three, so a test asks "are the facets on screen" without asking which
 * geometry answered. */
const panelNode = () => document.querySelector('[data-slot="filter-overlay"]')

describe("the app's filter row is the design kit's", () => {
  it("every control in the filter row is one the kit draws, and none is ours", () => {
    const adapter = adapterSource()
    for (const name of ["FilterBar as KitFilterBar", "RangeFacet"])
      expect(
        adapter.includes(name),
        `${ADAPTER} must draw the kit's ${name} — that is the whole point of this file`
      ).toBe(true)
    expect(adapter).toContain(KIT_FILTER_BAR)
    // THE COMPACT FACET FIELD IS THE KIT'S OWN `CompactFacet` (v1.2.27). It
    // used to be the kit's `SearchableFacet`, an always-expanded heading +
    // search pill + checkbox list, which is what her screenshot caught
    // hanging under the Apps toolbar where her artifact draws one short field
    // reading "Any client" — then a hand-assembled compact field built out of
    // the kit's bare `Select` (client ruling, 2026-09-02), because the kit's
    // filter-bar file shipped no compact facet of its own yet. It does now:
    // the assertion moves with it rather than being dropped, because the
    // thing this file refuses is a HAND-ROLLED or hand-ASSEMBLED control, not
    // a particular kit export. A `SelectTrigger` (or a `CompactFacet`
    // look-alike) written out here in divs would look identical and be
    // exactly the regression of 2026-08-27 again.
    expect(
      adapter.includes(KIT_COMPACT_FACET),
      `${ADAPTER}'s compact facet must be the kit's own CompactFacet, never a hand-rolled or hand-assembled trigger`
    ).toBe(true)

    // …and NOBODY declares a control of their own under one of those names,
    // which is the exact shape the app shipped for months. Read off the disk,
    // not off a hand-list: the last one was three files nobody had listed.
    // `SelectFacet` is on the list for the same reason the other three are —
    // it is the adapter's own name for the compact field, and a second one
    // anywhere else would be the same drift under a newer word.
    const roots = ["web", "web-portal", "shared/web"].map((d) => join(ROOT, d))
    const declared: string[] = []
    for (const f of sourceFiles(roots, {
      extensions: [".tsx"],
      relativeTo: ROOT,
      skipTests: true,
    })) {
      if (f.rel === ADAPTER) continue
      const src = stripComments(f.source)
      for (const name of ["FilterBar", "SearchableFacet", "RangeFacet", "SelectFacet"])
        if (new RegExp(`\\b(?:function|const|class)\\s+${name}\\b`).test(src))
          declared.push(`${f.rel}: ${name}`)
    }
    expect(
      declared,
      `these declare a filter control of their own. The kit draws all three — ` +
        `import them through ${ADAPTER} instead:\n  ${declared.join("\n  ")}`
    ).toEqual([])
  })

  it("A SELECTED FACET IS NOT MANGO — the filter row decides no colour, except the one count it now names on purpose", () => {
    // THE OWNER'S RULING, and the reason it is checked by ABSENCE. The old row
    // drew a selected facet as `Badge variant="default"`, which is the brand
    // fill (measured rgb(254,208,105)); the kit's file says three times over
    // that a selected facet is not one, and kit RULES.md §2.5 says mango is
    // never a status. A rendered colour cannot be measured here — jsdom
    // resolves no custom property — so what is asserted is the only thing that
    // can make the ruling untrue from this side: this file naming a colour.
    const src = stripComments(adapterSource())
    const colour = src.match(
      /\b(?:bg|text|border|fill|ring)-(?:primary|brand|surface-brand|\[var\(--(?:primary|surface-brand)\)\])/g
    )
    expect(
      colour,
      `R32 and the kit's §2.5: the filter row names no colour. Found: ${colour?.join(", ")}`
    ).toBeNull()

    // THE ONE NAMED EXCEPTION, ADDED 2026-09-03 — a COUNT is not a SELECTED
    // FACET. The client's own words: "The count design should replicate the
    // count design that we have on the top lines, like this Mango round
    // background with no border behind the number" — asking FOR the mango
    // fill on this one control, the toolbar's own count, which is a fact
    // about how many facets are on rather than a status any one facet
    // carries. §2.5 rules the latter; this is the former. Matched as an
    // exact string rather than a loose pattern, so a typo'd or duplicated
    // exemption fails loudly instead of silently widening the hole.
    const COUNT_BADGE = '<Badge count={activeCount} variant="default" />'
    expect(
      src.match(new RegExp(COUNT_BADGE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")),
      "the one named mango exception must appear exactly once, as exactly this JSX"
    ).toHaveLength(1)
    const srcWithoutCountBadge = src.replace(COUNT_BADGE, "")

    // THE BLANKET `variant=` BAN IS NARROWED, and this is the narrowing rather
    // than a hole in it. It was a proxy for "no colour", because the breach it
    // was written against was `Badge variant="default"` — the brand fill under
    // a neutral-sounding word. Since the chips went (client ruling,
    // 2026-09-02) this row draws exactly one Button, the panel's "Clear
    // filters", and a Button cannot be drawn without a variant: `Button`'s own
    // default IS the mango. So the check now READS the word instead of banning
    // the prop, which is strictly stronger — `variant="default"` was invisible
    // to the old regex the moment it was written as `variant={x}` and is not
    // spellable at all under this one. Run on the source with the ONE named
    // exception already removed, so it still catches a SECOND `variant=
    // "default"` anywhere else in the file.
    const NEUTRAL = new Set(["secondary", "ghost", "text", "link"])
    const named = [...srcWithoutCountBadge.matchAll(/variant="([a-zA-Z]+)"/g)].map((m) => m[1])
    const dynamic = srcWithoutCountBadge.match(/variant=\{/g)
    expect(
      dynamic,
      "a computed variant cannot be read here — name the neutral one in the markup"
    ).toBeNull()
    expect(
      named.filter((v) => !NEUTRAL.has(v)),
      `only a neutral variant may appear in the filter row, besides the one named count exception. Found: ${named.join(", ")}`
    ).toEqual([])
  })

  it("THE TOOLBAR SAYS A COUNT AND NEVER THE FILTERS — no chip, at any width, at all times", async () => {
    // CLIENT RULING, 2026-09-02, verbatim: "when activce filters, do not
    // display them in the toolbar. only a count niside the filter pill (like
    // in artifact)". The kit's chip half is not rendered at all — and that is
    // asserted with a LONG client name on, because the chip it replaces
    // existed precisely to carry strings this size and had its own truncation
    // bug for it. A count cannot clip.
    render(<Harness />)
    expect(pillSays()).toEqual({ label: "Filter", count: null })

    // `pick` opens the panel to reach the facet (there is nowhere else to
    // click one from), so the panel is OPEN the instant this resolves.
    await pick("Filed under", "Northwind Traders International Holdings Ltd.")
    await waitFor(() =>
      expect(screen.getByTestId("values").textContent).toBe('{"compartment":"a2"}')
    )

    expect(chips().length, "the toolbar draws no chip for an active facet").toBe(0)

    // THE COUNT IS VISIBLE WITH THE PANEL OPEN — CLIENT RULING, 2026-09-03,
    // SUPERSEDING THE OLD "bare word while open" READING. Verbatim: "Even if
    // the filter is open, I want to see the count pill at all times... When
    // the filter toolbar modal is open, I also want the count visible." The
    // panel is open right now (see above), and the pill already reports one
    // — as a real `Badge` beside the label now (client ruling, 2026-09-03:
    // "Mango round background with no border behind the number"), not a
    // number folded into the label string.
    await waitFor(() => expect(pillSays()).toEqual({ label: "Filter", count: "1" }))

    // …and the badge STAYS up the moment the panel is shut — the count is
    // the same fact whether the fields it describes are on screen or not.
    openPanel()
    await waitFor(() => expect(panelNode()).toBeNull())
    expect(pillSays()).toEqual({ label: "Filter", count: "1" })

    // …and with the panel shut the WHOLE toolbar says that and nothing else.
    // Scoped to the kit bar's own root rather than to the document, because
    // the value is of course ALSO on screen while the panel is open — that is
    // the field the person is looking at. The ruling is about the toolbar,
    // and this is the toolbar: no chip, no facet name, no client name, one
    // count, in both states. Concatenated textContent has no space between
    // the label and the badge (two DOM nodes, CSS `gap` between them, not a
    // text character), which is exactly why `pillSays()` reads them apart.
    const toolbar = document.querySelector('[data-slot="filter-bar"]')
    expect(toolbar, "the kit's bar draws the row").toBeTruthy()
    expect(
      toolbar!.textContent,
      "the toolbar reports a count and never what the filters are"
    ).toBe("Filter1")

    // …and a SECOND facet moves the COUNT LIVE, rather than adding a second
    // thing to the row (the shape a chip cluster could not have: two chips is
    // two nodes and a wider toolbar, two filters is one badge one digit
    // longer) and rather than waiting for the panel to close to say so (the
    // old snapshot-on-close behaviour this pass replaces).
    await pick("Type", "From a meeting")
    await waitFor(() => expect(pillSays()).toEqual({ label: "Filter", count: "2" }))
    expect(chips().length).toBe(0)
    expect(document.querySelector('[data-slot="filter-bar"]')!.textContent).toBe("Filter2")

    // …and TICKING A FACET OFF drops the count live too, panel still open —
    // the client's own words, "when I'm selecting and unselecting filters".
    await pick("Type", "Any type")
    await waitFor(() => expect(pillSays()).toEqual({ label: "Filter", count: "1" }))
  })

  it("ONE VALUE PER FACET — a second pick REPLACES, it does not add", async () => {
    // The kit's facet is MULTI-select and every door this feeds takes ONE value
    // per query parameter, validated positionally (R20). If the adapter ever
    // let the array grow, the extra word would be dropped on the way to the
    // door and the pill would count two filters for a question that answered
    // one — the same class of lie as a facet that narrows the loaded page.
    render(<Harness />)
    await pick("Type", "From a meeting")
    await waitFor(() => expect(screen.getByTestId("values").textContent).toBe('{"kind":"meeting"}'))
    await pick("Type", "A note")
    await waitFor(() => expect(screen.getByTestId("values").textContent).toBe('{"kind":"note"}'))
    openPanel()
    await waitFor(() =>
      expect(pillSays(), "one facet, one count").toEqual({ label: "Filter", count: "1" })
    )

    // …and TURNING THE FACET OFF is its own row, "Any type", which is what the
    // field says while nothing is on. It used to be "pick the word that is
    // already on"; a compact select (2026-09-02) has no such gesture — picking
    // the chosen row again is a no-op in every select in the app, and inventing
    // an exception here would make this one control behave unlike the rest. The
    // value that reaches the caller is still `""`, never the sentinel the row
    // carries so Radix will accept it.
    await pick("Type", "Any type")
    await waitFor(() => expect(screen.getByTestId("values").textContent).toBe("{}"))
    openPanel()
    await waitFor(() => expect(pillSays()).toEqual({ label: "Filter", count: null }))
  })

  it("AN OPTION TAKEN AWAY UNDER AN ACTIVE FACET still cannot make the row lie", async () => {
    // A facet over ROWS offers what the screen is holding, so a client filtered
    // out of the loaded page — or an app archived while its filter is on —
    // takes its own option away with it. That used to be a real hazard: the
    // chip fell back to the raw value and the screen named a ULID at somebody,
    // and the adapter carried a `said` ref remembering every picked label to
    // survive it. Since the toolbar names nothing (2026-09-02) the hazard is
    // gone by construction and the ref went with it — this asserts the
    // property that replaced it, so nobody re-adds a naming control without
    // re-adding the memory too.
    const { rerender } = render(<Harness />)
    await pick("Filed under", "Northwind Traders International Holdings Ltd.")
    await waitFor(() =>
      expect(screen.getByTestId("values").textContent).toBe('{"compartment":"a2"}')
    )

    rerender(
      <Harness
        facets={FACETS.map((f) =>
          f.field === "compartment" ? { ...f, options: [CLIENTS[0]] } : f
        )}
      />
    )
    openPanel()
    await waitFor(() =>
      expect(pillSays(), "the facet is still on, and still counted").toEqual({
        label: "Filter",
        count: "1",
      })
    )
    expect(
      document.querySelector('[data-slot="filter-bar-add"]')?.textContent,
      "the pill reports a NUMBER — never the value whose words just went away"
    ).not.toContain("a2")
  })

  it("THE FILTER PILL'S BOX IS THE SORT AND VIEW PILLS' BOX", () => {
    // CLIENT RULING, 2026-09-02, verbatim: "the filter button-pill it's still
    // differnet than the other 2. fix and uniform it". SUPERSEDED, v1.2.27:
    // the kit closed the gap upstream in its own `CHIP_ADD`, so this test's
    // job flipped from "the app-side override matches the kit" to "the
    // app-side override is gone, because the kit needs none". Both ends are
    // still DERIVED from the kit's own source rather than a number typed here.
    const trigger = kitSource("components/select/select.tsx")
    const view = kitSource("components/collection-frame/view-switch.tsx")
    const kitBar = kitSource("components/filter-bar/filter-bar.tsx")
    const adapter = adapterSource()

    const padding = trigger.match(/px-\[var\(--space-[\w-]+\)\]/)?.[0]
    const weight = view.match(/font-\[var\(--font-weight-medium\)\]/)?.[0]
    expect(padding, "the kit's select trigger no longer states its inline padding").toBeTruthy()
    expect(weight, "ViewSwitch no longer states its label weight").toBeTruthy()
    expect(trigger, "the kit's select trigger no longer states its type step").toContain("text-sm")

    // The kit's own "+ filter" chip, which is the pill the app draws.
    const addChip = kitBar.match(/const CHIP_ADD = \[([\s\S]*?)\];/)?.[1]
    expect(addChip, "the kit's CHIP_ADD could not be read — the derivation broke").toBeTruthy()

    for (const cls of [padding!, "text-sm", weight!]) {
      // THE KIT NOW STATES ALL THREE ITSELF (v1.2.27) — the fix this test used
      // to wait for. An app-side override of any of them would be three lines
      // free to drift out of step with the very thing they claim to match.
      expect(
        addChip!.includes(cls),
        `the kit's CHIP_ADD no longer carries \`${cls}\` — the upstream fix ` +
          `regressed, or the derivation broke`
      ).toBe(true)
      expect(
        adapter.includes(`filter-bar-add]]:${cls}`),
        `\`${cls}\` is the kit's job on all three pills since v1.2.27 — it must ` +
          `not be restated in ${ADAPTER}`
      ).toBe(false)
    }

    // WHAT THE KIT ALREADY AGREES ON IS NOT RESTATED. Height, radius and fill
    // are identical on all three pills in the kit's own source; an override
    // repeating them would be three more lines free to drift out of step with
    // the very thing they claim to match.
    for (const already of ["h-[var(--control-height-button)]", "rounded-pill", "--btn-secondary-fill"])
      expect(
        addChip!.includes(already) && !adapter.includes(`filter-bar-add]]:${already}`),
        `\`${already}\` is the kit's job on all three pills — it must not be restated in ${ADAPTER}`
      ).toBe(true)

    // AND THE STALE HOVER IS GONE. The adapter used to force `--accent` onto
    // this pill, which was right while the kit drew it `bg-transparent` (a 5%
    // wash tinting the page behind it) and wrong the moment it became an
    // opaque `--btn-secondary-fill` pill: the wash REPLACES the fill instead
    // of tinting it, so against the dark palette the pill DIMMED on hover
    // where the other two lit up.
    expect(
      adapter.includes("filter-bar-add]]:hover:bg-accent"),
      `the kit hovers this pill to --btn-secondary-hover, the same token the other two use`
    ).toBe(false)
    expect(addChip!).toContain("--btn-secondary-hover")
  })
})

/* ══════════════════════════════════════════════════════════════════════════
   THE FILTERS CASCADE — client ruling, 2026-09-09.

   Her screenshot: Client "Any client", App "Kwapso Portal", and underneath
   "Nothing matched. Try fewer words, or clear the filters." Verbatim: "very
   wrong! filter the apps by selected client! Until clint is not selected, show
   nothing." — "filter by selected client only!" — "whe using fulters this is
   how they shoudl work: is client has sth (f.e. Kwapos) the filter apps should
   only show apps of this client. and so on".

   WHAT THESE TESTS ARE FOR, given the ruling is already written out at length
   on `FilterFacet.dependsOn` and in the adapter's own header. Every one of the
   three behaviours below is INVISIBLE in a screenshot of a correct screen and
   invisible to every census in this repo: a prop-presence check (R48/R50/R53's
   shape) can see that a facet exists and cannot see which options it offers,
   and the whole fault she reported was a control offering the wrong ones. So
   they are driven through the real hook, in a real DOM, off real values.

   THE FOURTH IS A CENSUS, and it guards the one thing a declaration can get
   wrong silently: a `dependsOn` naming a facet that is not in the same row
   leaves a control that can never be unlocked — permanently reading "Choose a
   client first." beside no Client control at all.
   ══════════════════════════════════════════════════════════════════════════ */

/** THE OWNERSHIP EDGE, in the shape a real screen declares it: an App facet
 * hanging off a Client one, its options carrying the app row's own
 * `accountId` as `within` — and one app owned by NOBODY, which is the agency's
 * own system and the case the null clause exists for. */
const CASCADING: FilterFacet[] = [
  { field: "accountId", label: "Client", control: "select", options: CLIENTS },
  {
    field: "appId",
    label: "App",
    control: "select",
    dependsOn: { field: "accountId", emptyText: "Choose a client first." },
    options: [
      { value: "p1", label: "Bergman Dispatch", within: "a1" },
      { value: "p2", label: "Northwind Portal", within: "a2" },
      { value: "p3", label: "Our own dashboard", within: null },
    ],
  },
]

/** The App facet's own closed field, by the words it is showing. `CompactFacet`
 * draws the placeholder or the chosen option's label inside its trigger, so
 * this is what a reader actually sees on the control. */
const facetField = (label: string) => {
  const group = screen.getByRole("group", { name: label })
  return within(group).getByRole("button")
}

/** The kit draws a shut facet as a real disabled `<button>` (`CompactFacet`
 * state 5: "a fill and an ink. Never an opacity"), so this asks the DOM rather
 * than a class name — jest-dom is deliberately not set up in this workspace. */
const isDisabled = (el: HTMLElement) => (el as HTMLButtonElement).disabled === true

/** WHAT THE ROW SAID OUT LOUD. Spied rather than module-mocked: the real toast
 * seam is the kit's own (R39) and half this file's other assertions read the
 * adapter's real imports, so swapping the module out here would be a second
 * truth about the file under test. */
const said: string[] = []
beforeAll(() => {
  vi.spyOn(toast, "info").mockImplementation(((message: string) => {
    said.push(String(message))
    return ""
  }) as never)
})
beforeEach(() => {
  said.length = 0
})

describe("a filter that hangs off another (client ruling, 2026-09-09)", () => {
  it("offers nothing until its parent is answered, and says what to do first", () => {
    render(<Harness facets={CASCADING} />)
    openPanel()
    const app = facetField("App")
    // "Until clint is not selected, show nothing" — read as its OPTIONS and
    // not as the control. The field keeps its place, exactly as the ticket
    // form's own App row does, so nothing below it moves as the row is filled
    // in; what it says is the next act rather than "Any app".
    expect(app.textContent).toContain("Choose a client first.")
    expect(isDisabled(app)).toBe(true)
    // …and the Client control beside it is untouched. A cascade runs DOWN an
    // ownership edge and only down it: an app does not own its client, so
    // nothing here may ever narrow the parent's own list.
    expect(isDisabled(facetField("Client"))).toBe(false)
  })

  it("offers that client's apps and ours, and no other client's", async () => {
    render(<Harness facets={CASCADING} />)
    await pick("Client", "Bergman S.A.")
    const app = facetField("App")
    expect(isDisabled(app)).toBe(false)
    fireEvent.click(app)
    const listbox = await screen.findByRole("listbox")
    const offered = within(listbox)
      .getAllByRole("option")
      .map((o) => o.textContent)
    // Bergman's own app, and the one owned by nobody. Northwind's is the
    // combination her screenshot proves cannot match, and it is gone.
    expect(offered).toContain("Bergman Dispatch")
    // OURS SURVIVES THE NARROWING, and this is the assertion most likely to be
    // "fixed" by somebody reading the client's sentence literally. The ticket
    // door has no opinion about which client an app belongs to and the ticket
    // form deliberately offers our own systems for a client's ticket, so those
    // rows are real; dropping the option would make every one of them
    // unreachable from this control. See `FacetOption.within`.
    expect(offered).toContain("Our own dashboard")
    expect(offered).not.toContain("Northwind Portal")
  })

  it("clears a stranded selection when the parent moves, and says so", async () => {
    render(<Harness facets={CASCADING} />)
    await pick("Client", "Bergman S.A.")
    await pick("App", "Bergman Dispatch")
    expect(JSON.parse(screen.getByTestId("values").textContent!)).toEqual({
      accountId: "a1",
      appId: "p1",
    })
    // The reader now picks a DIFFERENT client. The app they chose is no longer
    // a pair that can match — her own fault, arriving from the other direction
    // — so the toolbar drops it rather than holding an impossible combination.
    await pick("Client", "Northwind Traders International Holdings Ltd.")
    await waitFor(() =>
      expect(JSON.parse(screen.getByTestId("values").textContent!)).toEqual({ accountId: "a2" })
    )
    // NEVER SILENTLY. A filter somebody deliberately set may not disappear
    // without a word — the pill's count dropping by one is a signal only to
    // whoever was already watching it.
    expect(said.at(-1)).toContain("App")
    expect(said.at(-1)).toContain("Client")
  })

  it("clears the child when the parent is turned off altogether", async () => {
    // The other way a selection is stranded, and the one a narrowing test
    // cannot reach: the reader does not switch clients, they go back to "Any
    // client". The App value they set is then hanging off nothing — the
    // control shuts and says "Choose a client first." again — so a value left
    // behind it would be a filter still narrowing the list from inside a
    // control that has stopped showing it. That is worse than the fault she
    // reported: at least hers was visible.
    render(<Harness facets={CASCADING} />)
    await pick("Client", "Bergman S.A.")
    await pick("App", "Bergman Dispatch")
    await pick("Client", "Any client")
    await waitFor(() =>
      expect(JSON.parse(screen.getByTestId("values").textContent!)).toEqual({})
    )
    expect(isDisabled(facetField("App"))).toBe(true)
    expect(said.at(-1)).toContain("App")
  })

  it("derives the narrowing off the ROWS where a facet declares no options", async () => {
    // The other half of the mechanism, and the one the sprints list uses: a
    // BOUNDED collection the browser holds whole, whose facets take their
    // options from the rows. Nothing tags an option here — the rows say which
    // app sat under which client, so the option list comes off the rows the
    // chosen client leaves.
    const derived: FilterFacet[] = [
      { field: "account", label: "Client", control: "select" },
      {
        field: "app",
        label: "App",
        control: "select",
        dependsOn: { field: "account", emptyText: "Choose a client first." },
      },
    ]
    const rows = [
      { account: "Bergman S.A.", app: "Bergman Dispatch" },
      { account: "Northwind", app: "Northwind Portal" },
      // No client at all — ours, and offered under every client for the same
      // reason `within: null` is.
      { account: "", app: "Our own dashboard" },
    ]
    function DerivedHarness() {
      const [values, setValues] = React.useState<Record<string, string>>({})
      const filter = useFilterBar({
        facets: derived,
        values,
        data: rows,
        onChange: (field, value) =>
          setValues((s) => {
            const next = { ...s }
            if (value === "") delete next[field]
            else next[field] = value
            return next
          }),
        onClearFacets: () => setValues({}),
      })
      return <>{filter}</>
    }
    render(<DerivedHarness />)
    openPanel()
    expect(isDisabled(facetField("App"))).toBe(true)
    await pick("Client", "Bergman S.A.")
    fireEvent.click(facetField("App"))
    const offered = within(await screen.findByRole("listbox"))
      .getAllByRole("option")
      .map((o) => o.textContent)
    expect(offered).toContain("Bergman Dispatch")
    expect(offered).toContain("Our own dashboard")
    expect(offered).not.toContain("Northwind Portal")
  })

  it("every declared `dependsOn` names a facet standing beside it", () => {
    // A `dependsOn` pointing at a field no facet in the same row offers is a
    // control that can NEVER be unlocked: it reads "Choose a client first."
    // for good, beside no Client control at all. Nothing else in this repo can
    // see that — it is a correct-looking declaration and a dead control — and
    // it is the one way a pair can be mis-declared rather than mis-derived.
    const rows: [string, { field: string; dependsOn?: { field: string } }[]][] = [
      ...Object.entries(COLLECTION_FILTERS),
      ...Object.entries(BASE_RECIPES).flatMap(([key, r]) =>
        r.collection ? ([[key, r.collection.filterFacets]] as [string, FilterFacet[]][]) : []
      ),
    ]
    // The census must be measuring something: the pairs are real declarations
    // and a walk that found none would report success for all of it.
    const withParents = rows.flatMap(([key, facets]) =>
      facets.filter((f) => f.dependsOn).map((f) => `${key}.${f.field}`)
    )
    expect(withParents.length, "the dependsOn census found nothing to check").toBeGreaterThan(0)
    for (const [key, facets] of rows)
      for (const f of facets)
        if (f.dependsOn)
          expect(
            facets.some((other) => other.field === f.dependsOn!.field),
            `${key}.${f.field} hangs off "${f.dependsOn.field}", which no facet beside it offers — ` +
              `that control can never be unlocked`
          ).toBe(true)
  })
})
