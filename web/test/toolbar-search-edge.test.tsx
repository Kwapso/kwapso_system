// THE SEARCH FIELD SITS AT THE CONTENT EDGE, EVERYWHERE — AND "EVERYWHERE"
// MEANS THE SAME WRAPPER REGISTER, NOT A NUMBER MEASURED SCREEN BY SCREEN.
//
// Her ruling, 22 Sep 2026, over the Triage/Ready pair of screenshots: "Look
// at the search bar in the toolbar. It has different distances from the
// left. Make sure that you make this exactly the same everywhere, by the
// way. The correct one on the screenshots is the one on status ready."
//
// ── WHAT WAS ACTUALLY DIFFERENT ─────────────────────────────────────────────
//
// Ready's own toolbar is `<PagedFind>`'s (paged-find.tsx) — `ToolbarColumn`
// there paints no fill, no radius and carries no inset of its own, so the
// track's edge is the plain frame's own edge. `<ToolbarRow>`
// (screen-bits.tsx), which Triage (triage-queue.tsx) and seventeen other
// screens draw, still carried the OLD painted-pill shape from before
// `CollectionCard`'s default flipped to `"plain"` (rulebook L43, 21 Sep
// 2026): `bg-surface-raised`, a radius chosen by `Boolean(toolbarPanel)`, and
// — the one that actually moved the search field — `py-1.5 pe-1.5 ps-4` on
// the track. `<WaveFinder>` (wave-finder.tsx), the app's other hand-copy of
// the row (`TOOLBAR_CONTROL_OWNERS`), carried the identical shape under
// different names (`bg-surface-panel`, same `ps-4`). Both are fixed now —
// see each file's own header comment for the account — and this file is the
// census that keeps a fifth bespoke row, or a regression on these three, from
// reintroducing the gap.
//
// ── WHAT THIS FILE CAN ACTUALLY HOLD ────────────────────────────────────────
//
// jsdom lays nothing out, so a pixel distance is a browser measurement and
// stays one (`toolbar-search-floor.test.tsx`'s own header makes the identical
// point). What a census CAN hold is the DECLARATION: that the track every
// collection toolbar draws carries no horizontal inset utility of its own,
// that the column around it carries no fill or radius either (the two are
// the same subtraction, made the same day, for the same reason), and that
// nothing else under `web/` quietly grows a fourth copy of either slot.
//
// `.tsx`, NOT `.ts` — the render half below needs real JSX (oxlint's own
// `react/no-children-prop` refuses a `React.createElement(…, { children })`
// call, the same constraint `plain-surface-scope.test.tsx`'s own header
// states); the census half needs no JSX at all and does not care which
// extension hosts it.
//
// REGISTERED AS R101 (`toolbar-search-edge`), 22 Sep 2026, the way R100 was:
// RULES.md, `shared/rules/registry.ts` and CLAUDE.md's own law walk now name
// it. Every check below stays exactly as it was, the CENSUS this law's own
// registry text points at; the two failing assertions (i and ii) now route a
// finding through `TOOLBAR_SEARCH_EDGE_EXEMPT`, keyed by `{file, expression}`
// (the ROW'S OWN NAME, and the offending class string), the same reasoned,
// rot-checked way out every other law in this file's own family takes, and
// empty on the day this law shipped: the two rows the sweep found carrying
// the old inset were fixed, not exempted.

import { join } from "node:path"
import { cleanup, render } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it } from "vitest"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"
import { SearchInput } from "@shared/ui/components/search-input/search-input"
import { ToolbarRow } from "@/components/deep-link/screen-bits"
import { PagedFind } from "@/components/records/paged-find"
import { EMPTY_WAVE_QUERY, WaveFinder } from "@/components/work/wave-finder"
import { TOOLBAR_SEARCH_EDGE_EXEMPT, type ToolbarSearchEdgeExempt } from "@shared/rules/registry"

const ROOT = join(__dirname, "..", "..")

/** Radix measures itself and captures the pointer; jsdom does neither.
 * Without these a `<SortControl>`/`<ViewSwitch>` mount inside these rows
 * throws instead of rendering — the identical polyfill block
 * `toolbar-search-floor.test.tsx` carries, for the identical reason. */
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

/** THE TWO SLOTS EVERY BESPOKE TOOLBAR ROW DRAWS, found by `data-slot` rather
 * than by walking up from the field — `<PagedFind>`'s own header names both
 * explicitly as the two things that "stay exactly where they were" once the
 * paint left them, so a census that trusts the name is reading the same
 * contract the source itself declares. */
function trackOf(): HTMLElement {
  const el = document.querySelector('[data-slot="toolbar-row-track"]')
  expect(el, "the row under test must actually draw the shared track slot").toBeTruthy()
  return el as HTMLElement
}

function columnOf(): HTMLElement {
  const el = document.querySelector('[data-slot="toolbar-row-column"]')
  expect(el, "the row under test must actually draw the shared column slot").toBeTruthy()
  return el as HTMLElement
}

function renderToolbarRow() {
  return render(
    <ToolbarRow
      empty={false}
      search={
        <SearchInput
          value=""
          onChange={() => {}}
          placeholder="Search the triage queue…"
          className="w-full"
        />
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
      listKey={`edge:${Math.random()}`}
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

const ROWS: { name: string; file: string; mount: () => unknown }[] = [
  {
    name: "<ToolbarRow> (screen-bits.tsx), Triage's own row",
    file: "components/deep-link/screen-bits.tsx",
    mount: renderToolbarRow,
  },
  {
    name: "<PagedFind> (paged-find.tsx), the Ready tab's own row",
    file: "components/records/paged-find.tsx",
    mount: renderPagedFind,
  },
  {
    name: "<WaveFinder> (wave-finder.tsx)",
    file: "components/work/wave-finder.tsx",
    mount: renderWaveFinder,
  },
]

// A HORIZONTAL INSET UTILITY, ON PURPOSE NARROW: `p-0`/`px-0` are not one (a
// zero inset is the same as none), so the pattern only matches a REAL,
// nonzero value the way `ps-4`/`py-1.5 pe-1.5` were.
const HORIZONTAL_INSET = /\b(?:ps|pl|pr|pe|px|py)-(?!0\b)[\w.[\]/-]+/

/** R101's own reasoned, rot-checked way out, keyed by `{file, expression}`
 * (the row's own file, and the offending inset/fill/radius utility class). */
function excused(file: string, expression: string): ToolbarSearchEdgeExempt | undefined {
  return TOOLBAR_SEARCH_EDGE_EXEMPT.find((e) => e.file === file && expression.includes(e.expression))
}

describe("the collection toolbar's search field sits at the content edge, the same way everywhere", () => {
  // ── i · THE TRACK CARRIES NO INSET OF ITS OWN, on every row the app draws
  // this way. This is the direct census for her sentence: the search field's
  // LEFT EDGE is the track's own left edge, at rest, on all three.
  it.each(ROWS)("$name's track carries no horizontal inset of its own", ({ file, mount }) => {
    mount()
    const track = trackOf()
    const match = track.className.match(HORIZONTAL_INSET)
    const ok = !match || Boolean(excused(file, match[0]))
    expect(
      ok,
      `the track (${track.className}) carries a horizontal padding utility (${match?.[0]}). That is ` +
        "exactly the class that put Triage's search field ~16-24px to the right of " +
        "Ready's, the fix is dropping it, not shrinking it. Or name it in " +
        "TOOLBAR_SEARCH_EDGE_EXEMPT with the reason."
    ).toBe(true)
  })

  // ── ii · THE COLUMN AROUND IT PAINTS NOTHING EITHER — the same subtraction,
  // made the same day, for the same reason (`ToolbarColumn`'s own doc:
  // "no fill, no radius … the plain frame's own CardContent carries zero
  // padding, so this row's edge IS the pane's edge"). A row that dropped the
  // inset but kept the old painted pill would put the field flush against a
  // rounded, filled box with nothing on the other side of it to justify the
  // shape — not what Ready draws.
  it.each(ROWS)("$name's column paints no fill and no radius of its own", ({ file, mount }) => {
    mount()
    const column = columnOf()
    const bgMatch = column.className.match(/\bbg-(?!clip|none)[\w-]+/)
    const bgOk = !bgMatch || Boolean(excused(file, bgMatch[0]))
    expect(
      bgOk,
      `the column (${column.className}) still paints a background utility (${bgMatch?.[0]}), or name it in ` +
        "TOOLBAR_SEARCH_EDGE_EXEMPT with the reason"
    ).toBe(true)
    const roundedMatch = column.className.match(/\brounded-[\w[\]().,%/#-]+/)
    const roundedOk = !roundedMatch || Boolean(excused(file, roundedMatch[0]))
    expect(
      roundedOk,
      `the column (${column.className}) still carries a radius utility (${roundedMatch?.[0]}), or name it in ` +
        "TOOLBAR_SEARCH_EDGE_EXEMPT with the reason"
    ).toBe(true)
  })

  it("TOOLBAR_SEARCH_EDGE_EXEMPT names only real, still-open findings", () => {
    const violations: { file: string; expression: string }[] = []
    for (const row of ROWS) {
      row.mount()
      const track = trackOf()
      const insetMatch = track.className.match(HORIZONTAL_INSET)
      if (insetMatch) violations.push({ file: row.file, expression: insetMatch[0] })
      const column = columnOf()
      const bgMatch = column.className.match(/\bbg-(?!clip|none)[\w-]+/)
      if (bgMatch) violations.push({ file: row.file, expression: bgMatch[0] })
      const roundedMatch = column.className.match(/\brounded-[\w[\]().,%/#-]+/)
      if (roundedMatch) violations.push({ file: row.file, expression: roundedMatch[0] })
      cleanup()
    }
    const stale = TOOLBAR_SEARCH_EDGE_EXEMPT.filter(
      (e) => !violations.some((v) => v.file === e.file && v.expression.includes(e.expression))
    )
    expect(
      stale,
      "these TOOLBAR_SEARCH_EDGE_EXEMPT entries no longer match a real finding. Fixed, or the source moved " +
        "on, delete the entry:\n  " + stale.map((e) => `${e.file}  ${e.expression}`).join("\n  ")
    ).toEqual([])
  })

  // ── iii · NOBODY WRITES A FOURTH COPY. One pair of slot names, three
  // wearers — a fourth bespoke row is exactly how the first two came to
  // disagree with `<PagedFind>` in the first place (each file's own header
  // comment has the account). Rot-checked both ways: fewer than three means
  // the walk broke or a row stopped wearing the slot, which would make (i)
  // and (ii) above measure less than they claim.
  it("exactly the three known rows declare the shared track/column slots, and none carries the old inset in source", () => {
    const files = sourceFiles(join(ROOT, "web"), { extensions: [".tsx"], skipTests: true })
    const wearers = files
      .filter((f) => /data-slot="toolbar-row-track"/.test(stripComments(f.source)))
      .map((f) => f.rel)
      .sort()

    expect(
      wearers,
      "BLINDNESS TRIPWIRE plus the subject itself: exactly the three files that draw " +
        "the app's bespoke collection toolbars. A fourth means a new hand-rolled row " +
        "exists and has not been read for the same inset bug; fewer means the walk, " +
        "or one of these three, stopped matching."
    ).toEqual([
      "components/deep-link/screen-bits.tsx",
      "components/records/paged-find.tsx",
      "components/work/wave-finder.tsx",
    ])

    for (const file of files.filter((f) => wearers.includes(f.rel))) {
      const source = stripComments(file.source)
      expect(
        /ps-4|py-1\.5\s+pe-1\.5/.test(source),
        `${file.rel} still contains the literal old painted-pill inset ` +
          '("ps-4" or "py-1.5 pe-1.5") somewhere in its source, even if not on the ' +
          "track/column classNames the render tests above read."
      ).toBe(false)
    }
  })
})
