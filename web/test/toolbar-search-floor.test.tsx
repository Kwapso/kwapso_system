// THE SEARCH BOX HAS A FLOOR, AND THE FLOOR IS ON THE FIELD.
//
// ── THE BUG THIS FILE EXISTS FOR, MEASURED ON STAGING, 11 SEP 2026 ──────────
//
// `/settings/tickets` draws `SelectableScreen`'s toolbar, which that day grew
// two buttons — Export CSV and Import CSV, which moved onto each module's own
// settings page when the whole-vocabulary Choices tab was retired. The search
// input's rendered width, signed in, on the deployed staging app:
//
//     1680 → 603px     1440 → 363px     1280 → 203px
//     1100 →  23px     900  → 201px     375  → 171px
//
// At 1100 — a 13" laptop, or any window not maximised — the box is a hole with
// a magnifier in it and "Search values…" is clipped to "Sea".
//
// ── WHY A FLOOR ON THE SLOT WOULD HAVE BEEN A NO-OP ─────────────────────────
//
// `<ToolbarRow>`'s growing slot ALREADY carried `min-w-[10rem]`, and at 1100 it
// was never reached: the slot measured 253px. The slot is a CONTAINER a call
// site fills — `search` is the one slot R53 left as a `React.ReactNode` — and
// this screen puts TWO controls in it, a `SearchInput` and a `w-40` status
// `Select`. Of the slot's 253px the Select took 160 and the gap 8, leaving the
// search pill 85: 36 of inline padding, a 16 glyph, a 10 gap, and 23 of text.
//
// `flex-1` is `flex: 1 1 0%`, and a zero-basis item has zero shrink WEIGHT, so
// every pixel of the slot's shortfall comes out of the one item with no minimum
// of its own. A floor on the BOX cannot see that. Only a floor on the FIELD
// can, which is why every assertion below is about where the rule LANDS and not
// about whether a floor exists.
//
// The same two buttons broke a second toolbar differently, and the difference is
// the proof: on Accounts (`PagedFind`'s row) the search slot has ONE tenant, so
// the slot's own floor held the field at a readable width and the TRACK gave
// instead — 104px, two lines, at 1100 and at 900, against the client's own
// "one row, always". Where the floor works, the row wraps. Where the floor is
// aimed at the wrong box, the field collapses.
//
// ── WHAT CAN BE HELD HERE, AND WHAT CANNOT ─────────────────────────────────
//
// A RENDERED WIDTH IS NOT SOMETHING THIS SUITE CAN SEE. jsdom lays nothing out
// and no Tailwind sheet is loaded, so "23px" is a browser measurement and stays
// one. What a test CAN hold is the DECLARATION, read off a real render: that the
// rule exists, that it addresses the kit's own search control rather than the
// box around it, that it carries the kit's own number, and that all three of the
// app's bespoke toolbar rows make the same promise. Those are exactly the four
// things that were untrue this morning.

import { cleanup, render } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import * as React from "react"
import { afterEach, beforeAll, describe, expect, it } from "vitest"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"
import { SearchInput } from "@shared/ui/components/search-input/search-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/ui/components/select/select"
import { Download } from "@shared/ui/foundations/icons"
import { ToolbarAction, ToolbarRow } from "@/components/deep-link/screen-bits"
import { PagedFind } from "@/components/records/paged-find"
import { EMPTY_WAVE_QUERY, WaveFinder } from "@/components/work/wave-finder"

const ROOT = join(__dirname, "..", "..")
const SLOT_OWNER = "web/components/deep-link/screen-bits.tsx"
const KIT_ROW = "shared/ui/components/toolbar-row/toolbar-row.tsx"

/** Radix measures itself and captures the pointer; jsdom does neither. Without
 * these the status `Select` below never mounts, and the multi-tenant case —
 * the whole reason this file exists — would pass by never rendering. */
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

/** THE GROWING SLOT, FOUND FROM THE FIELD RATHER THAN BY NAME — the nearest
 * ancestor of the kit's search pill that declares itself the row's elastic box.
 * Walking UP from the control is deliberate: the fault was a rule sitting one
 * box too far out, so a helper that trusted a `data-slot` name would be asking
 * the wrong question. */
function growingSlotAround(field: Element): HTMLElement {
  let node = field.parentElement
  while (node) {
    if (/\bflex-1\b/.test(node.className)) return node
    node = node.parentElement
  }
  throw new Error("the search field is not inside any growing slot")
}

const field = () => {
  const el = document.querySelector("[data-slot=search-input]")
  expect(el, "every row under test must actually draw the kit's search pill").toBeTruthy()
  return el as HTMLElement
}

/** THE KIT'S OWN FLOOR, READ OFF THE KIT — never a number typed here.
 *
 * `shared/ui/components/toolbar-row/toolbar-row.tsx` puts `min-w-[var(--…)]`
 * on the box around its OWN search node, with the `flex: 1 1 0%` argument
 * spelled out beside it, and 8rem chosen because it "RESCALES with the
 * text-size control instead of pinning a pixel". The app's three bespoke rows
 * borrow that decision rather than re-making it, so if the kit ever moves the
 * number this goes red and somebody re-reads both. */
function kitSearchFloorToken(): string {
  const source = readFileSync(join(ROOT, KIT_ROW), "utf8")
  const m = /min-w-\[var\((--[\w-]+)\)\]\s+flex-1"[^>]*>\{search\}/.exec(source)
  expect(
    m,
    `${KIT_ROW} no longer declares a floor on its own search slot in the shape this ` +
      `check reads. The kit's row is where this number comes from — re-read both ` +
      `before changing the expectation.`
  ).toBeTruthy()
  return m![1]
}

function renderToolbarRow({ withStatusSelect }: { withStatusSelect: boolean }) {
  return render(
    <ToolbarRow
      empty={false}
      search={
        <>
          <SearchInput value="" onChange={() => {}} placeholder="Search values…" className="flex-1" />
          {withStatusSelect && (
            // THE CALL SITE'S OWN SECOND TENANT, spelled exactly as
            // `selectable-screen.tsx` spells it — a 160px rigid box sharing the
            // one growing slot with the field. This is the shape that took the
            // search input to 23px, and the census below holds the real call
            // site to still having it, so this harness cannot quietly stop
            // modelling the bug.
            <Select value="active" onValueChange={() => {}}>
              <SelectTrigger className="h-9 w-full sm:w-40" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
              </SelectContent>
            </Select>
          )}
        </>
      }
      sort={{
        options: [{ value: "value", label: "Value" }],
        value: "value",
        onValueChange: () => {},
        direction: "asc",
        onDirectionChange: () => {},
      }}
    />
  )
}

function renderPagedFind() {
  return render(
    <PagedFind<{ id: string }>
      listKey={`floor:${Math.random()}`}
      placeholder="Search accounts…"
      matches={{ none: "No matches", one: "1 match", many: "{count} matches" }}
      restingEmpty={false}
      fetchPage={async () => ({ rows: [{ id: "a" }], nextCursor: null, total: 1 })}
    >
      {() => <div />}
    </PagedFind>
  )
}

const renderWaveFinder = () =>
  render(<WaveFinder query={EMPTY_WAVE_QUERY} onChange={() => {}} clients={[]} />)

const ROWS: { name: string; mount: () => unknown }[] = [
  { name: "<ToolbarRow> (screen-bits.tsx)", mount: () => renderToolbarRow({ withStatusSelect: true }) },
  { name: "<PagedFind> (paged-find.tsx)", mount: renderPagedFind },
  { name: "<WaveFinder> (wave-finder.tsx)", mount: renderWaveFinder },
]

describe("the collection toolbar's search box has a floor, and it is on the field", () => {
  // ── i · THE FLOOR LANDS ON THE KIT'S SEARCH CONTROL, IN EVERY APP-OWNED ROW.
  //
  // Proved by RENDERING, the discipline R62 already writes down for the two
  // empty registers: "every previous attempt to settle a question about this
  // file by reading it reached a confident wrong answer". The rule is read off
  // the element that is actually in the document, and it is found by walking UP
  // from the field, so a floor moved back onto the slot fails here.
  it.each(ROWS)("$name floors the search field itself, not the box around it", ({ mount }) => {
    mount()
    const slot = growingSlotAround(field())
    const token = kitSearchFloorToken()

    expect(
      slot.className,
      "the growing slot must carry a rule ADDRESSED to the kit's own search control. " +
        "A bare `min-w-*` here floors the BOX, which is what shipped: at 1100 that box " +
        "measured 253px — above its own floor — while the field inside it rendered 23px, " +
        "because a `w-40` status Select shared the slot and `flex: 1 1 0%` has no shrink " +
        "weight. See this file's header for the six measurements."
    ).toMatch(/\[&_\[data-slot=search-input\]\]:min-w-\[var\(--[\w-]+\)\]/)

    expect(
      slot.className,
      `the floor must be the kit's own number (\`${token}\`, read out of ${KIT_ROW}), ` +
        "not a second one minted here"
    ).toContain(`[&_[data-slot=search-input]]:min-w-[var(${token})]`)
  })

  // ── ii · AND THE SLOT REALLY IS SHARED, which is the whole reason (i) says
  // "the field". If this ever stops being true the bug is gone for a different
  // reason and (i) is measuring nothing — so it is asserted rather than assumed.
  it("the growing slot holds more than the search field, so a floor on it buys the field nothing", () => {
    renderToolbarRow({ withStatusSelect: true })
    const slot = growingSlotAround(field())
    const statusFilter = document.querySelector('[aria-label="Filter by status"]')
    expect(statusFilter, "the harness must draw the call site's own second tenant").toBeTruthy()
    expect(
      slot.contains(statusFilter!),
      "the status filter shares the ONE growing slot with the search field — that is " +
        "the shape a slot-level floor cannot see"
    ).toBe(true)
  })

  // ── iii · THE REAL CALL SITE STILL HAS THAT SHAPE. Without this the harness
  // above can drift into modelling a screen the app no longer draws, and (i)
  // would keep passing over a bug nobody can reach.
  it("`selectable-screen.tsx` still hands two controls to one `search` slot", () => {
    const source = stripComments(
      readFileSync(join(ROOT, "web/components/choices/selectable-screen.tsx"), "utf8")
    )
    const slot = /search=\{[\s\S]*?sort=\{/.exec(source)?.[0] ?? ""
    expect(slot, "the search slot's own JSX must be readable here").toContain("<SearchInput")
    expect(
      slot,
      "the settings page packs a status Select in beside the search box; if that stops " +
        "being true, re-read whether this whole file is still measuring the reported bug"
    ).toContain("<SelectTrigger")
  })

  // ── iv · NOBODY SPELLS THE GROWING SLOT BY HAND. One string, three wearers.
  // A fourth bespoke row is exactly how the first three came to disagree.
  it("every app-owned toolbar row wears the one declared slot, and nothing writes its own", () => {
    const files = sourceFiles(join(ROOT, "web"), { extensions: [".tsx"], skipTests: true })
    const wearers = files.filter((f) => /\bTOOLBAR_SEARCH_SLOT\b/.test(stripComments(f.source)))
    expect(
      wearers.map((f) => f.rel).sort(),
      "BLINDNESS TRIPWIRE plus the subject itself: three files — the one that DECLARES " +
        "the slot (and draws `<ToolbarRow>` with it) and the app's two other bespoke " +
        "rows. Matching fewer means a row stopped wearing it or the walk broke, and " +
        "either way the assertions above are measuring less than they claim."
    ).toEqual([
      "components/deep-link/screen-bits.tsx",
      "components/records/paged-find.tsx",
      "components/work/wave-finder.tsx",
    ])

    const handRolled = files
      .filter((f) => f.rel !== SLOT_OWNER.replace(/^web\//, ""))
      .filter((f) => /min-w-\[10rem\]/.test(stripComments(f.source)))
      .map((f) => f.rel)
    expect(
      handRolled,
      "the growing slot is declared once, in TOOLBAR_SEARCH_SLOT (screen-bits.tsx). " +
        "A hand-written copy is a row that will not get the next fix."
    ).toEqual([])
  })
})

describe("a toolbar action keeps its name when it folds to its glyph", () => {
  // CLAUDE.md: "Keep the icon-for-action mapping consistent across the app; on
  // narrow screens icon-only is acceptable." B4 (UI-RULEBOOK) keeps import and
  // export LABELLED wherever the label fits, and `ToolbarAction` is where those
  // two sentences are reconciled once. The one thing that may never vary across
  // the fold is what a screen reader hears.
  it("the accessible name is present at every width, and the visible word is what folds", () => {
    render(<ToolbarAction label="Export CSV" icon={<Download className="size-4" />} href="/x.csv" />)
    const control = document.querySelector('[aria-label="Export CSV"]') as HTMLElement
    expect(control, "the name is an aria-label, so it survives the glyph-only state").toBeTruthy()

    const word = [...control.querySelectorAll("span")].find((s) => s.textContent === "Export CSV")
    expect(word, "the word is a real element, so it can be withdrawn from the layout").toBeTruthy()
    expect(
      word!.className,
      "folded it must be OUT of the layout (`hidden`), not clipped — a clipped label is " +
        "the 23px search box one control along"
    ).toMatch(/\bhidden\b/)
    expect(word!.className, "and it comes back at the row's declared breakpoint").toMatch(
      /\bxl:inline\b/
    )
  })

  // The two hand-rolled CSV pairs are what earned this component. A third one
  // written by hand is a third screen that will not fold.
  it("the CSV doors go through the row's own action, not a hand-built button", () => {
    const files = sourceFiles(join(ROOT, "web"), { extensions: [".tsx"], skipTests: true })
    const offenders = files
      .filter((f) => f.rel !== "components/deep-link/screen-bits.tsx")
      .filter((f) => {
        const source = stripComments(f.source)
        return /t\("(?:Export|Import) CSV"\)/.test(source) && /buttonVariants\(/.test(source)
      })
      .map((f) => f.rel)
    expect(
      offenders,
      "an Export/Export CSV control built out of `buttonVariants` is a toolbar action " +
        "that will not fold when the row runs out of room. Use `ToolbarAction`."
    ).toEqual([])
  })
})
