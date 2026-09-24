// THE FILTERS OPEN AS AN OVERLAY, AND NEVER AS A SECOND ROW.
//
// Aurora, 2026-09-02, verbatim: the filters must open as "a temporary overlay
// not a second row". Aurora, 2026-09-23, choosing among five drawn designs:
// "filter drop sheet popover".
//
// This is the check behind R110, the law those two rulings make — minted
// 23 Sep 2026, when three lanes had each proposed the number and the manager
// assigned it here. It is written to fail in each of the specific ways the
// filter row has failed before, because every one of those shipped green:
//
//   · a panel nested inside the toolbar's own pill track (a giant oval),
//   · a panel absolutely positioned but still inside the toolbar's column,
//   · a panel in NORMAL FLOW under the track, pushing the collection down,
//   · two same-toned boxes with a seam between them, read as a second toolbar.
//
// All four are one shape: the facets landing somewhere in the toolbar's own
// box. So the assertion is structural rather than visual, and it is made at
// all three widths: nothing the toolbar renders in flow changes when the
// overlay opens, and the overlay itself is not a descendant of the toolbar at
// all.
//
// WHY THE DECISION IS TESTED AS A FUNCTION AND AS A RENDER. `filterOverlayForm`
// is a pure function of what the facets cost, which is the property the ruling
// asks for ("the sheet is simply a popover that ran out of room"), so the
// threshold is asserted directly rather than inferred from a width. The render
// half then proves the component actually asks it.

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import * as React from "react"
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"
import type { FilterFacet } from "@shared/web/screen-engine/config"
import { useFilterBar } from "@shared/web/screen-engine/filter-bar"
import {
  FACET_SPAN,
  FILTER_ANCHOR_ATTR,
  FILTER_POPOVER_BUDGET,
  filterOverlayForm,
} from "@shared/ui/components/filter-bar/filter-bar"
import { ToolbarRow } from "@/components/deep-link/screen-bits"

const ROOT = join(__dirname, "..", "..")

/* ── The room the harness is standing in ──────────────────────────────────── */

/** Say how wide the window is, the one way anything here asks: `useHasRoom`'s
 * own single media query (`shared/ui/lib/use-has-room.ts`). `test/setup.ts`'s
 * blanket stub answers `false` to everything, which reads as "a phone" — a
 * real case, but only one of three, so every test here states which it is. */
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

beforeAll(() => {
  // Radix measures itself and captures the pointer; jsdom does neither, and
  // without these the overlay never opens, which would make every assertion
  // below pass by never running.
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

beforeEach(() => answerRoom(true))
afterEach(cleanup)

/* ── The facets, at the two sides of the budget ───────────────────────────── */

const facet = (field: string, label: string): FilterFacet => ({
  field,
  label,
  control: "select",
  options: [
    { value: "a", label: `${label} one` },
    { value: "b", label: `${label} two` },
  ],
})

/** Two facets: a popover by the rule, and the quietest case the ruling names. */
const TWO = [facet("kind", "Type"), facet("owner", "Owner")]
/** Four: over the budget, so a drop sheet. The ruling's own "four or more". */
const FOUR = [...TWO, facet("stage", "Stage"), facet("country", "Country")]

/** The row as a screen wires it: ONE node into `filters`, because there is no
 * second slot to put anything in. A list stands under it so a test can ask
 * whether opening the overlay moved it. */
function Harness({ facets }: { facets: FilterFacet[] }) {
  const [values, setValues] = React.useState<Record<string, string>>({})
  const filter = useFilterBar({
    facets,
    values,
    data: [],
    resultCount: 42,
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
      <ToolbarRow empty={false} search={<input aria-label="Search" />} filters={filter} />
      <ul data-testid="rows">
        <li>A row</li>
      </ul>
      <button type="button">Outside</button>
      <span data-testid="values">{JSON.stringify(values)}</span>
    </>
  )
}

const pillButton = () => document.querySelector<HTMLElement>('[data-slot="filter-bar-add"]')
const overlay = () => document.querySelector<HTMLElement>('[data-slot="filter-overlay"]')
const column = () => document.querySelector<HTMLElement>('[data-slot="toolbar-row-column"]')
const pinBox = () => document.querySelector<HTMLElement>('[data-slot="toolbar-row-pin"]')
const openIt = () => fireEvent.click(screen.getByRole("button", { name: /^Filter/, hidden: true }))
const escape = () => fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" })

/** THE TOOLBAR'S OWN IN-FLOW MARKUP, with the two things that are ALLOWED to
 * change normalised away: the control saying out loud that it is open, and the
 * `aria-hidden` a modal layer puts over the page behind it. Every other
 * difference between the two readings is the toolbar being REARRANGED by an
 * open overlay, which is the whole of what the ruling forbids. */
function inFlowShape(container: HTMLElement): string {
  return (container.innerHTML.match(/<div data-slot="toolbar-row-pin".*?(?=<ul data-testid="rows")/s) ?? [""])[0]
    .replace(/aria-expanded="true"/g, 'aria-expanded="false"')
    .replace(/ data-open="true"/g, "")
    .replace(/ aria-hidden="true"/g, "")
    .replace(/ data-aria-hidden="true"/g, "")
}

/* ── The deciding rule ────────────────────────────────────────────────────── */

describe("the form is a fact about the content, never a screen's choice", () => {
  it("flips from popover to drop sheet at the budget, and the budget is three", () => {
    // The ruling's own words: the popover is "right where there are two or
    // three facets" and "gets cramped beyond that"; the sheet is "right where
    // there are four or more facets".
    expect(FILTER_POPOVER_BUDGET).toBe(3)
    expect(filterOverlayForm(1, true)).toBe("popover")
    expect(filterOverlayForm(2, true)).toBe("popover")
    expect(filterOverlayForm(3, true)).toBe("popover")
    expect(filterOverlayForm(4, true)).toBe("sheet")
    expect(filterOverlayForm(9, true)).toBe("sheet")
  })

  it("counts HEIGHT and not only heads: a range facet costs two field rows", () => {
    // "how many facets, how tall they are" — a `RangeFacet` draws a min and a
    // max side by side with a line kept under them for its error state, so two
    // of them is already the cramped shape the sheet exists to relieve.
    expect(FACET_SPAN.field).toBe(1)
    expect(FACET_SPAN.range).toBe(2)
    const twoFieldsAndARange = FACET_SPAN.field * 2 + FACET_SPAN.range
    expect(twoFieldsAndARange).toBe(4)
    expect(filterOverlayForm(twoFieldsAndARange, true)).toBe("sheet")
  })

  it("a phone gets neither form, whatever the content costs", () => {
    expect(filterOverlayForm(1, false)).toBe("bottom-sheet")
    expect(filterOverlayForm(9, false)).toBe("bottom-sheet")
  })

  it("the rendered overlay asks the same question", async () => {
    render(<Harness facets={TWO} />)
    openIt()
    expect((await screen.findByRole("dialog")).getAttribute("data-form")).toBe("popover")
    escape()
    await waitFor(() => expect(overlay()).toBeNull())
    cleanup()

    render(<Harness facets={FOUR} />)
    openIt()
    expect((await screen.findByRole("dialog")).getAttribute("data-form")).toBe("sheet")
  })

  it("the SHEET spans the toolbar and the POPOVER spans its own control", () => {
    // The one structural difference between the two forms is the anchor, and
    // the anchor is an element a shared toolbar marks, never a ref a screen
    // threads. If this attribute ever leaves the track, a drop sheet silently
    // becomes the width of the Filter pill.
    render(<Harness facets={FOUR} />)
    const track = document.querySelector('[data-slot="toolbar-row-track"]')
    expect(track, "the row draws no track at all any more").not.toBeNull()
    expect(track?.hasAttribute(FILTER_ANCHOR_ATTR)).toBe(true)
  })
})

/* ── Never a second row, at any width ─────────────────────────────────────── */

describe("nothing appears as a second row, at any width, ever", () => {
  const cases: Array<[string, FilterFacet[], boolean, string]> = [
    ["popover", TWO, true, "popover"],
    ["drop sheet", FOUR, true, "sheet"],
    ["phone", FOUR, false, "bottom-sheet"],
  ]

  for (const [name, facets, hasRoom, form] of cases) {
    it(`${name}: the toolbar's own markup is unchanged by opening it`, async () => {
      answerRoom(hasRoom)
      const { container } = render(<Harness facets={facets} />)
      const closed = inFlowShape(container)
      expect(closed, "the harness found no toolbar to measure").toContain("toolbar-row-track")

      openIt()
      await screen.findByRole("dialog")
      expect(overlay()?.getAttribute("data-form")).toBe(form)

      // i · THE TOOLBAR DID NOT GROW A ROW. Byte for byte the same markup in
      // flow, with only the control's own "I am open" normalised away.
      expect(inFlowShape(container)).toBe(closed)

      // ii · THE COLUMN STILL HAS EXACTLY ONE CHILD — the track. Every past
      // failure put a second one here.
      expect(column()?.childElementCount).toBe(1)

      // iii · AND THE OVERLAY IS NOT IN THE TOOLBAR AT ALL. Not in the column,
      // not in the pinned box, not anywhere under the row: it is portaled.
      expect(column()?.contains(overlay()!)).toBe(false)
      expect(pinBox()?.contains(overlay()!)).toBe(false)
      expect(container.contains(overlay()!)).toBe(false)
    })
  }

  it("the list under the toolbar is not displaced", async () => {
    const { container } = render(<Harness facets={FOUR} />)
    const rows = screen.getByTestId("rows")
    const before = {
      parent: rows.parentElement,
      previous: rows.previousElementSibling?.getAttribute("data-slot"),
      index: Array.from(rows.parentElement!.children).indexOf(rows),
    }
    openIt()
    await screen.findByRole("dialog")
    expect(rows.parentElement).toBe(before.parent)
    expect(rows.previousElementSibling?.getAttribute("data-slot")).toBe(before.previous)
    expect(Array.from(rows.parentElement!.children).indexOf(rows)).toBe(before.index)
    // Nothing was inserted between the toolbar and the rows, and the overlay
    // floats outside the container the two of them share.
    expect(container.contains(overlay()!)).toBe(false)
  })
})

/* ── Dismissal and focus ──────────────────────────────────────────────────── */

describe("the overlay behaves like an overlay", () => {
  it("Escape closes it", async () => {
    render(<Harness facets={TWO} />)
    openIt()
    await screen.findByRole("dialog")
    escape()
    await waitFor(() => expect(overlay()).toBeNull())
  })

  it("a press on the ground behind closes it", async () => {
    render(<Harness facets={TWO} />)
    openIt()
    await screen.findByRole("dialog")
    // Radix arms its outside-press listener on a zero timeout, so the press
    // has to come after the current task rather than in it.
    await new Promise((r) => setTimeout(r, 0))
    fireEvent.pointerDown(document.body)
    await waitFor(() => expect(overlay()).toBeNull())
  })

  it("focus is trapped while it is open", async () => {
    render(<Harness facets={TWO} />)
    // Held BEFORE opening: a modal layer marks everything behind it
    // `aria-hidden`, so a role query would no longer find this button, which
    // is itself half the point.
    const outside = screen.getByRole("button", { name: "Outside" })
    openIt()
    const surface = await screen.findByRole("dialog")
    // Focus lands inside on open.
    await waitFor(() => expect(surface.contains(document.activeElement)).toBe(true))
    // And a control on the page behind cannot take it back.
    outside.focus()
    fireEvent.focusIn(outside)
    await waitFor(() => expect(surface.contains(document.activeElement)).toBe(true))
  })

  it("focus returns to the Filter control when it closes", async () => {
    render(<Harness facets={TWO} />)
    openIt()
    await screen.findByRole("dialog")
    escape()
    await waitFor(() => expect(overlay()).toBeNull())
    expect(document.activeElement).toBe(pillButton())
  })
})

/* ── What the surface carries ─────────────────────────────────────────────── */

describe("the overlay carries the design's own two foot controls", () => {
  it("Clear all appears once something is on, and Show N says the live count", async () => {
    render(<Harness facets={TWO} />)
    openIt()
    const surface = await screen.findByRole("dialog")

    // Nothing is on yet, so there is nothing for Clear to do.
    expect(within(surface).queryByRole("button", { name: "Clear all" })).toBeNull()
    expect(within(surface).getByRole("button", { name: "Show 42" })).not.toBeNull()

    // Pick one, and it appears.
    const group = within(surface).getByRole("group", { name: "Type" })
    fireEvent.click(within(group).getByRole("button"))
    const listbox = await screen.findByRole("listbox")
    fireEvent.click(within(listbox).getByRole("option", { name: "Type one" }))
    await waitFor(() => expect(screen.getByTestId("values").textContent).toBe('{"kind":"a"}'))

    const clear = await within(overlay()!).findByRole("button", { name: "Clear all" })
    fireEvent.click(clear)
    await waitFor(() => expect(screen.getByTestId("values").textContent).toBe("{}"))
  })

  it("Show N closes the overlay, because the filters are already applied", async () => {
    render(<Harness facets={TWO} />)
    openIt()
    const surface = await screen.findByRole("dialog")
    fireEvent.click(within(surface).getByRole("button", { name: "Show 42" }))
    await waitFor(() => expect(overlay()).toBeNull())
  })

  it("on a phone it is the kit's own bottom sheet, with a heading", async () => {
    answerRoom(false)
    render(<Harness facets={FOUR} />)
    openIt()
    const surface = await screen.findByRole("dialog")
    expect(surface.getAttribute("data-slot")).toBe("filter-overlay")
    expect(surface.getAttribute("data-form")).toBe("bottom-sheet")
    // The kit's bottom sheet, drawn by the kit and not re-drawn here: its own
    // side marker, its grabber, and the heading a sheet must have.
    expect(surface.getAttribute("data-side")).toBe("bottom")
    expect(surface.querySelector('[data-slot="sheet-grabber"]')).not.toBeNull()
    expect(within(surface).getByText("Filters")).not.toBeNull()
    // Still not a second row.
    expect(column()?.childElementCount).toBe(1)
  })
})

/* ── The census: no host may offer an in-flow position for the facets ─────── */

describe("no toolbar in the app offers a place to put a second row", () => {
  const appFiles = () =>
    sourceFiles(["web", "web-portal", "shared/web"].map((d) => join(ROOT, d)), {
      extensions: [".tsx"],
      relativeTo: ROOT,
      skipTests: true,
    }).map((f) => ({ rel: f.rel, src: stripComments(f.source) }))

  it("nobody passes a `toolbarPanel`, and no toolbar of ours declares one", () => {
    // The slot is how the facets used to reach normal flow. `ToolbarRow` and
    // `ToolbarColumn` no longer have one, and the kit's `CollectionFrame`
    // still does (it is vendored and pinned) — so the rule is about the APP:
    // nothing here hands anything to that position.
    const offenders = appFiles()
      .filter((f) => /toolbarPanel\s*[=:]/.test(f.src))
      .map((f) => f.rel)
    expect(
      offenders,
      `these files still place a filter panel in normal flow:\n  ${offenders.join("\n  ")}`
    ).toEqual([])
  })

  it("`useFilterBar` returns ONE node, and nobody takes it apart", () => {
    // The `{ pill, panel }` pair was the shape that made a second row
    // possible: two values, two slots, and a caller free to put the second one
    // anywhere. A destructure here means the pair has come back.
    const offenders = appFiles()
      .filter((f) => /\{[^}]*\bpanel\b[^}]*\}\s*=\s*useFilterBar\(/.test(f.src))
      .map((f) => f.rel)
    expect(
      offenders,
      `these files destructure a panel out of useFilterBar:\n  ${offenders.join("\n  ")}`
    ).toEqual([])
  })

  it("every toolbar track in the app is an anchor the drop sheet can measure", () => {
    // Derived, not listed: whatever draws the row's own track is held to it,
    // including `wave-finder.tsx`'s registered hand-copy.
    const files = appFiles()
    const tracks = files.filter((f) => f.src.includes('data-slot="toolbar-row-track"'))
    expect(
      tracks.length,
      "the census found no toolbar track at all — it has stopped matching"
    ).toBeGreaterThan(2)
    const offenders = tracks
      .filter((f) => {
        // The attribute has to sit on the SAME element as the slot name, so
        // the window is the element's own attribute list.
        const at = f.src.indexOf('data-slot="toolbar-row-track"')
        return !f.src.slice(at, f.src.indexOf(">", at)).includes(FILTER_ANCHOR_ATTR)
      })
      .map((f) => f.rel)
    expect(
      offenders,
      `these toolbars draw a track the drop sheet cannot measure:\n  ${offenders.join("\n  ")}`
    ).toEqual([])
  })

  it("the overlay itself is the KIT's, reached through no app-side copy", () => {
    // It was app-side for exactly as long as it had to be: `shared/ui` is a
    // vendored kit, pinned and content-hashed, so an unreleased component
    // cannot be imported here until somebody mints the tag. v1.2.166 carries
    // it, so the twin is deleted and this is what keeps it deleted, both ways.
    // A second copy of a kit part is the fault `shared/ui`'s own hash exists
    // to prevent, and a filter overlay that the NEXT app does not inherit is
    // the whole reason the kit is the only UI input (R39).
    const adapter = readFileSync(join(ROOT, "shared/web/screen-engine/filter-bar.tsx"), "utf8")
    expect(
      adapter,
      "the adapter must reach FilterOverlay through the kit, never an app-side file"
    ).toContain('from "@shared/ui/components/filter-bar/filter-bar"')
    expect(adapter).toMatch(/\bFilterOverlay\b/)
    expect(
      existsSync(join(ROOT, "shared/web/screen-engine/filter-overlay.tsx")),
      "the app-side twin was deleted when kit v1.2.166 landed; it must not come back"
    ).toBe(false)
    expect(
      readFileSync(join(ROOT, "shared/ui/components/filter-bar/filter-bar.tsx"), "utf8"),
      "the vendored kit must actually carry the component this app now imports"
    ).toContain("const FilterOverlay = React.forwardRef")
  })
})
