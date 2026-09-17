// THE ROLES TOOLBAR, FIXED — client, 17 Sep 2026, over a screenshot of
// Settings › Roles, verbatim: "The toolbar in roles is kind of broken. Go and
// fix it." Three more asks rode the same message: delete "— Locked by
// policy: <role>" from the Module column, put the module's own icon before
// its name, and add a sort control for Module name.
//
// WHAT WAS ACTUALLY BROKEN, diagnosed off `roles-matrix.tsx` itself rather
// than guessed at: `sort` was omitted (named in `TOOLBAR_SORT_EXEMPT` on the
// argument that a fixed module catalogue has no second order — her own next
// sentence answers that directly), and "Deactivated" sat in the `actions`
// slot as a secondary button standing in for a FACET, the exact "eight
// screens put a control in the wrong slot" shape R53's own header describes
// for `sort` a year of screens earlier. Both are fixed at the row's own
// slots; there is still exactly one `<ToolbarRow>` in this file.
//
// THIS FILE PROVES FOUR THINGS, split the way this codebase's own suites
// split a fault: a STATIC CENSUS over the source for the structural claims
// (one container, the right props on it, no leftover hand-rolled toolbar,
// the exemption gone) — the same discipline `roles-matrix-boxes.test.tsx`'s
// own "the screen sends what this suite renders" block already uses on this
// exact file — and a REAL RENDER of `<RolesMatrix>` for the two claims a
// source census cannot see: that the sort control actually reorders the
// rows, and that the module's icon actually reaches the screen.

import { readFileSync } from "node:fs"
import { join } from "node:path"

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import * as React from "react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import { stripComments } from "@shared/rules/source-scan"
import { TEAM_MODULE_CATALOG } from "@shared/team-modules"
import type { RolePermissions, TeamRole } from "@shared/types"

const ROOT = join(__dirname, "..", "..")
const MATRIX_PATH = join(ROOT, "web", "components", "team", "roles-matrix.tsx")
const REGISTRY_PATH = join(ROOT, "shared", "rules", "registry.ts")
const source = () => stripComments(readFileSync(MATRIX_PATH, "utf8"))

beforeAll(() => {
  // Radix measures itself; jsdom does neither of the things it asks for —
  // the same defensive set `roles-matrix-boxes.test.tsx`'s neighbours install
  // for the identical reason.
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

// ============================================================================
// PART ONE — THE STATIC CENSUS. Source-level facts a render cannot mis-time.
// ============================================================================

describe("the roles toolbar's shape, read off the source", () => {
  it("draws exactly one <ToolbarRow> — one container, never a second, hand-rolled one", () => {
    const src = source()
    const matches = src.match(/<ToolbarRow\b/g) ?? []
    expect(
      matches.length,
      "roles-matrix.tsx must draw exactly one <ToolbarRow> — a second one, or a hand-rolled " +
        "<div> beside it, is the 'box inside a box' the client's screenshot is pointing at"
    ).toBe(1)
    // THE OLD BESPOKE ROW MUST NOT HAVE COME BACK. This exact className is
    // what the 2026-09-14 header says was deleted when `<ToolbarRow>` first
    // landed here.
    expect(
      src,
      "the pre-ToolbarRow hand-rolled toolbar div is back"
    ).not.toContain('className="flex flex-wrap items-center justify-end gap-2"')
  })

  it("passes search, filters, sort and actions on that one row", () => {
    const src = source()
    expect(src).toMatch(/<ToolbarRow[\s\S]*?search=\{/)
    expect(src, "the Deactivated facet must sit in ToolbarRow's own `filters` slot")
      .toMatch(/<ToolbarRow[\s\S]*?filters=\{statusPill\}/)
    expect(src, "the sort slot must be a real ToolbarSortSlot config, not omitted")
      .toMatch(/<ToolbarRow[\s\S]*?sort=\{\{/)
    expect(src).toMatch(/<ToolbarRow[\s\S]*?actions=\{/)
  })

  it("no longer wires 'Deactivated' as a bare actions-slot button", () => {
    const src = source()
    expect(
      src,
      "'Deactivated' must not be a secondary Button in the actions slot any more — it is a filter facet"
    ).not.toMatch(/<Button variant="secondary" onClick=\{\(\) => setDeactivatedOpen/)
  })

  it("Module name sort is declared, both directions wired to state", () => {
    const src = source()
    expect(src).toMatch(/label:\s*t\("Module name"\)/)
    expect(src).toMatch(/direction:\s*sortDir/)
    expect(src).toMatch(/onDirectionChange:\s*setSortDir/)
  })

  it("the RolesMatrix#TOOLBAR_SORT_EXEMPT entry is gone from the registry", () => {
    const registry = stripComments(readFileSync(REGISTRY_PATH, "utf8"))
    expect(
      registry,
      "roles-matrix.tsx#RolesMatrix must no longer be a TOOLBAR_SORT_EXEMPT entry now that it passes `sort`"
    ).not.toMatch(/"web\/components\/team\/roles-matrix\.tsx#RolesMatrix":/)
  })

  it("the module row wears an <Icon>, resolved through the app's CONCEPT_ICON vocabulary", () => {
    const src = source()
    expect(src).toMatch(/import \{ Icon,? ?[\s\S]*?\} from "@shared\/web\/screen-engine\/icon"/)
    expect(src).toContain('import { CONCEPT_ICON } from "@/lib/pages"')
    expect(src).toMatch(/<Icon name=\{moduleIconName\(m\.key\)\}/)
  })

  it("'Locked by policy' no longer renders as visible text in the Module column", () => {
    const src = source()
    // UPSTREAM SINCE kit v1.2.108 (17 Sep 2026, same ruling): the kit's own
    // row mark (`data-slot="permission-matrix-locked"`, permission-matrix.tsx)
    // is RETIRED FROM THE KIT ITSELF — its own CHANGELOG entry says "the
    // consuming application was already hiding it" — so the app-side
    // `[&_[data-slot=permission-matrix-locked]]:hidden` className this test
    // used to require is now dead weight: a rule reaching for a data-slot the
    // kit no longer renders. This asserts it has NOT come back, the same
    // rot-check direction every stale-exemption census in this repo takes.
    expect(src).not.toContain("permission-matrix-locked")
  })
})

// ============================================================================
// PART TWO — A REAL RENDER. Sort actually reorders rows; the icon actually
// reaches the DOM; the row mark is present (so the CSS selector above has
// something to reach) but the R/C/U/D cells are untouched.
// ============================================================================

const ROLE: TeamRole = {
  id: "r1",
  title: "Admin",
  description: null,
  active: true,
} as TeamRole

/** Three modules, deliberately out of catalogue order and with names whose
 * A→Z sequence differs from their TEAM_MODULE_CATALOG order — a render that
 * merely reflects the door's own array order would pass a same-order
 * assertion by accident. */
const MODULE_ROWS: RolePermissions["modules"] = [
  { key: "team_members", label: "Members", rights: ["read", "create", "update", "delete"] },
  { key: "accounts", label: "Accounts", rights: ["read", "create", "update", "delete"] },
  { key: "knowledge", label: "Knowledge", rights: ["read", "create", "update", "delete"] },
]

const PERMS: RolePermissions = {
  modules: MODULE_ROWS,
  value: Object.fromEntries(MODULE_ROWS.map((m) => [m.key, { read: true, create: false, update: false, delete: false }])),
  // `isDefault: true` — the one role in this fixture is the locked Admin
  // role, the same shape production always has (`lockedRoleIds` in
  // roles-matrix.tsx is derived off exactly this flag). Without it no cell
  // is ever locked and the "hidden lock mark" test below would be proving
  // nothing.
  isDefault: true,
  title: "Admin",
  canUpdate: true,
}

vi.mock("@/lib/api", async () => {
  const real = await vi.importActual<typeof import("@shared/web/api")>("@shared/web/api")
  return {
    ApiFailure: real.ApiFailure,
    tenancy: {
      rolePermissions: async (_roleId: string) => PERMS,
      saveRolePermissions: async (_roleId: string, value: unknown) => ({ ...PERMS, value }),
      updateRole: async () => ({}),
      setRoleActive: async () => ({}),
      createRole: async () => ({}),
    },
  }
})
vi.mock("@shared/ui/components/sonner/sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

import { RolesMatrix } from "@/components/team/roles-matrix"
import { LanguageProvider } from "@shared/web/language"

function Harness() {
  return (
    <LanguageProvider value={null}>
      <RolesMatrix teamId="t1" roles={[ROLE]} rolesLoading={false} canCreate={false} />
    </LanguageProvider>
  )
}

/** The Module column's name cells, in DOM order — the first `<th>`/row-head
 * cell of each body row. */
function moduleNameCells(): HTMLElement[] {
  const tableEl = screen.getByRole("table")
  return Array.from(tableEl.querySelectorAll("tbody tr")).map(
    (row) => row.querySelector("td, th") as HTMLElement
  )
}

/** The module's own NAME text, out of its name cell — never the cell's whole
 * `textContent`. UPSTREAM SINCE kit v1.2.108: the kit no longer draws a
 * `[data-slot="permission-matrix-locked"]` row mark at all, so there is
 * nothing left for a stylesheet to hide and nothing for a plain
 * `textContent` read to trip over either — this narrower read is kept
 * anyway, because the cell's own accessible name/tooltip text (drawn on the
 * R/C/U/D runs themselves now, not the row) is a different node this helper
 * has no business picking up. `span.truncate` is the exact node
 * `moduleColumns` wraps the translated label in, so this reads only the
 * word a reader sees as the name. */
function moduleNameText(cell: HTMLElement): string | undefined {
  return cell.querySelector("span.truncate")?.textContent?.trim()
}

describe("RolesMatrix, rendered — sort, the module icon, and the retired lock mark", () => {
  it("renders the three module rows before touching sort, in A→Z order (the row's own default direction)", async () => {
    render(<Harness />)
    await waitFor(() => expect(screen.queryByRole("table")).toBeTruthy())

    const names = moduleNameCells().map(moduleNameText)
    expect(names).toEqual(["Accounts", "Knowledge", "Members"])
  })

  it("the sort control's direction button reverses the module rows — Z→A", async () => {
    render(<Harness />)
    await waitFor(() => expect(screen.queryByRole("table")).toBeTruthy())

    // `SortControl` draws one field ("Module name") and a direction toggle
    // beside it — `ToolbarRow` never passes `showDirection: false` (R53's own
    // `ToolbarSortSlot` doc). Found by its accessible name rather than a
    // hand-picked selector, so this test breaks if the control stops being a
    // real button rather than if its markup shuffles.
    const directionButton = screen.getByRole("button", { name: /sort direction/i })
    fireEvent.click(directionButton)

    await waitFor(() => {
      const names = moduleNameCells().map(moduleNameText)
      expect(names).toEqual(["Members", "Knowledge", "Accounts"])
    })
  })

  it("every module row draws an icon before its name", async () => {
    render(<Harness />)
    await waitFor(() => expect(screen.queryByRole("table")).toBeTruthy())

    for (const cell of moduleNameCells()) {
      expect(
        cell.querySelector("svg"),
        `module cell "${cell.textContent}" has no icon before its name`
      ).toBeTruthy()
    }
  })

  it("carries no visible 'Locked by policy' text next to a module name, while the R/C/U/D cells keep their own tooltip", async () => {
    render(<Harness />)
    await waitFor(() => expect(screen.queryByRole("table")).toBeTruthy())

    // UPSTREAM SINCE kit v1.2.108 (17 Sep 2026): the kit no longer draws a
    // `data-slot="permission-matrix-locked"` row mark at all — it retired
    // the mark in favour of a per-SEGMENT fill + tooltip, so there is
    // nothing left in the DOM for this app to hide and nothing this test
    // needs a CSS-hiding rule to prove. The kit's own grid root is still
    // there under its own unconditional `data-slot`.
    const grid = document.querySelector('[data-slot="permission-matrix"]')
    expect(grid, "the kit's own grid root must be in the DOM").toBeTruthy()
    expect(
      document.querySelector('[data-slot="permission-matrix-locked"]'),
      "the kit's retired row mark must not be in the DOM — v1.2.108 stopped drawing it"
    ).toBeNull()

    // THE MODULE NAME ITSELF NEVER CARRIES THE SENTENCE — the client's own
    // ask this whole file is named for.
    for (const cell of moduleNameCells()) {
      expect(moduleNameText(cell)).not.toMatch(/locked by policy/i)
    }

    // AND THE CELLS THEMSELVES STILL RAISE THE SAME PHRASE — moved onto the
    // one locked SEGMENT's own `title` now (kit v1.2.108: a locked segment
    // is a `role="checkbox"` with `aria-disabled="true"` and its own
    // `title="Locked by policy: <role>"`, never restated beside the row).
    const tableEl = screen.getByRole("table")
    const lockedRun = Array.from(tableEl.querySelectorAll('[title*="Locked by policy"]'))
    expect(lockedRun.length, "a locked R/C/U/D run must still announce itself as locked").toBeGreaterThan(0)
  })

  it("the catalogue this suite exercises is really the app's own module list (not a fixture drifted from it)", () => {
    // A tripwire, the same discipline roles-matrix-boxes.test.tsx opens with:
    // every module key this test made up must be real.
    const keys = new Set(TEAM_MODULE_CATALOG.map((m) => m.key))
    for (const m of MODULE_ROWS) expect(keys.has(m.key), `"${m.key}" is not a real TEAM_MODULES key`).toBe(true)
  })
})
