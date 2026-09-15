// R78 — CALENDAR VIEWS CARRY NO SORT.
//
// The client's ruling, 2026-09-15, over the week view design: "Never put the
// sort in calendar components. Make this a law. Makes no sense." R53 already
// lets a screen say "my rows have no order to offer" one exemption at a time
// (`TOOLBAR_SORT_EXEMPT`) — three of those entries were already a month
// grid, a calendar-shaped queue and a grouped pair of lists, the identical
// argument this law makes. What changes here is that a CALENDAR-SHAPED VIEW
// no longer needs a screen to remember to make that argument: `<ToolbarRow>`
// (screen-bits.tsx) drops its own `<SortControl>` the instant its `view`
// slot's ACTIVE value is "calendar", "week" or "agenda" — regardless of
// what `sort` the call site handed it — because the calendar's own date
// axis is already the order, and a control offering a second one would be
// dead UI.
//
// TWO THINGS ARE PROVED, NOT ONE. A STATIC read of `screen-bits.tsx`'s own
// source would tell you the GUARD EXISTS; it would not tell you the guard
// actually stops the control from reaching the DOM. So this file renders the
// real `<ToolbarRow>`, through `@testing-library/react`, exactly as
// `toolbar-search-floor.test.tsx` (R53's own render-based suite) already
// does for the identical component — and only after that behavioural proof
// does it fall back to a static census, for the ONE thing rendering cannot
// check: that no OTHER file in `TOOLBAR_CONTROL_OWNERS` (R53's own list of
// files allowed to build a `<SortControl>`/`<ViewSwitch>` pair of their own)
// quietly offers a calendar/week/agenda view without the identical
// suppression, or a reasoned `NO_SORT_VIEW_EXEMPT` line.

import { cleanup, render } from "@testing-library/react"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import * as React from "react"
import { afterEach, beforeAll, describe, expect, it } from "vitest"

import { stripComments } from "@shared/rules/source-scan"
import { NO_SORT_VIEW_EXEMPT, RULES_REGISTRY, TOOLBAR_CONTROL_OWNERS } from "@shared/rules/registry"
import { ToolbarRow, type ToolbarViewSlot } from "@/components/deep-link/screen-bits"

const ROOT = join(__dirname, "..", "..")
const SEAM = "web/components/deep-link/screen-bits.tsx"

/** Radix measures itself and captures the pointer; jsdom does neither —
 * `toolbar-search-floor.test.tsx`'s own note. `<SortControl>`/`<ViewSwitch>`
 * are both `Select`-backed, so the same three stand-ins are needed here. */
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

const SORT_SLOT = {
  options: [{ value: "value", label: "Value" }],
  value: "value",
  onValueChange: () => {},
  direction: "asc" as const,
  onDirectionChange: () => {},
}

function viewSlot(value: string): ToolbarViewSlot {
  return {
    views: [
      { value: "table", label: "Table" },
      { value, label: value },
    ],
    value,
    onValueChange: () => {},
  }
}

const sortControl = () => document.querySelector('[data-slot="sort-control"]')

function renderRow(view?: ToolbarViewSlot) {
  return render(
    <ToolbarRow
      empty={false}
      search={<div data-slot="search-input" />}
      sort={SORT_SLOT}
      view={view}
    />
  )
}

describe("R78 — calendar views carry no sort", () => {
  // ── i · BEHAVIOUR: THE CONTROL ITSELF, ON A REAL RENDER ────────────────────
  it("draws the sort control when the active view is not a calendar shape", () => {
    renderRow(viewSlot("board"))
    expect(
      sortControl(),
      "a Board (or Table, or any non-calendar) view must still get the sort control it was handed"
    ).toBeTruthy()
  })

  it("draws the sort control when no view slot is given at all", () => {
    renderRow(undefined)
    expect(sortControl(), "a row with no `view` prop has nothing to suppress on").toBeTruthy()
  })

  it.each(["calendar", "week", "agenda", "timeline"])(
    'draws NO sort control when the active view is "%s", even though `sort` was passed',
    (value) => {
      renderRow(viewSlot(value))
      expect(
        sortControl(),
        `<ToolbarRow view={{ value: "${value}" }}> still rendered a <SortControl> — R78's own ` +
          "guard (NO_SORT_VIEW_VALUES in screen-bits.tsx) is not suppressing it"
      ).toBeNull()
    }
  )

  // A CANARY, so the three assertions above cannot be quietly true because
  // NOTHING rendered. `toolbar-search-floor.test.tsx` earns its own canary the
  // same way, for the same reason: an absence test that never proves presence
  // anywhere is not evidence.
  it("the harness itself can draw a sort control (canary)", () => {
    renderRow(viewSlot("table"))
    expect(
      sortControl(),
      "the canary render found no <SortControl> at all — the test harness itself is broken " +
        "(a changed data-slot name, a Radix mount failure), so the three absence assertions " +
        "above are not proving anything either"
    ).toBeTruthy()
  })

  // ── ii · THE LAW IS REGISTERED, THE WAY EVERY LAW IS ───────────────────────
  it("R78 is a real, enforced row in the registry, pointed at this file's own checkId", () => {
    const row = RULES_REGISTRY.find((r) => r.id === "R78")
    expect(row, "shared/rules/registry.ts must carry an R78 row").toBeTruthy()
    expect(row!.dimension).toBe("ui")
    expect(row!.status).toBe("enforced")
    expect(row!.checkId).toBe("no-sort-in-calendar-views")
  })

  // ── iii · STATIC CENSUS: NOBODY ELSE'S SORT/VIEW PAIR IS EXEMPT FROM THIS ──
  //
  // R53's own `TOOLBAR_CONTROL_OWNERS` is the full list of files the kit lets
  // build a `<SortControl>`/`<ViewSwitch>` pair of their own — `screen-bits.tsx`
  // (this law's own seam, excluded below) plus whichever others exist today.
  // A file on that list offering a calendar/week/agenda view has to make R78's
  // promise itself, since it never asks `<ToolbarRow>` to make it. None does,
  // as of this law's own writing (2026-09-15) — this census is what keeps that
  // true rather than a sentence nobody re-checks.
  it("no-sort-in-calendar-views: every other sort/view-owning file honours the same rule, or says why not", () => {
    // Widened 2026-09-15 alongside `NO_SORT_VIEW_VALUES` itself (screen-bits.tsx):
    // Timeline is time-ordered the same way a calendar/week/agenda is, so a
    // TOOLBAR_CONTROL_OWNERS file offering one must make the same promise.
    const CALENDAR_SHAPED = /value:\s*["'](calendar|week|agenda|timeline)["']/
    const SORT_TAG = /<SortControl[\s/>]/

    const offenders: string[] = []
    const exemptUsed = new Set<string>()
    let filesChecked = 0

    for (const rel of Object.keys(TOOLBAR_CONTROL_OWNERS)) {
      if (rel === SEAM) continue // the seam this law lives in, not a call site of it
      const abs = join(ROOT, rel)
      if (!existsSync(abs)) continue // R53's own rot-check owns a missing file; not this one's job
      const source = stripComments(readFileSync(abs, "utf8"))
      filesChecked++
      if (!SORT_TAG.test(source) || !CALENDAR_SHAPED.test(source)) continue
      if (rel in NO_SORT_VIEW_EXEMPT) {
        exemptUsed.add(rel)
        continue
      }
      offenders.push(
        `${rel}: builds its own <SortControl> AND offers a calendar/week/agenda view value — ` +
          "either suppress the sort control on that view yourself, or name this file in " +
          "NO_SORT_VIEW_EXEMPT (shared/rules/registry.ts) with the reason it is safe not to"
      )
    }

    expect(
      filesChecked,
      "the TOOLBAR_CONTROL_OWNERS census walked nothing — R53's own list is empty or every " +
        "path in it is missing; fix the scan before trusting this result"
    ).toBeGreaterThan(0)
    expect(offenders, offenders.join("\n  ")).toEqual([])

    const stale = Object.keys(NO_SORT_VIEW_EXEMPT).filter((k) => !exemptUsed.has(k))
    expect(
      stale,
      `these NO_SORT_VIEW_EXEMPT entries match no file that still needs them — the file no ` +
        `longer offers a calendar/week/agenda view (or was folded into <ToolbarRow>/deleted), ` +
        `so delete the entry: ${stale.join(", ")}`
    ).toEqual([])
  })

  // Sanity on the fixture the census above borrows rather than re-derives:
  // R53's own list still names the seam this law guards, and the seam still
  // exists on disk.
  it("sanity: TOOLBAR_CONTROL_OWNERS still names screen-bits.tsx as the seam this law guards", () => {
    expect(SEAM in TOOLBAR_CONTROL_OWNERS).toBe(true)
    expect(existsSync(join(ROOT, SEAM)), `${SEAM} must exist on disk`).toBe(true)
  })
})
