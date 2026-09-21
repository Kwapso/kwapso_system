// THE WAVE DETAIL HEAD'S GEAR OPENS THE SETTINGS SHEET. Aurora, on the wave's
// phase days, 21 Sep 2026, verbatim: "missing the settings button in waves to
// adjust that!!!" She could not find `WavePhaseDaysPanel` sitting under
// "Expected length" on the Overview tab, so it moved into a slide-in sheet off
// a gear button in the head's own actions row (`wave-detail.tsx`), beside the
// "…" overflow trigger, wired through `shared/web/head-actions.tsx`'s own fold
// the way `task-detail.tsx` and `help-detail.tsx` already are.
//
// COVERS: the gear opens the sheet (titled "Settings", the seven phase-type
// rows, the Monday-to-Friday line); the sheet is closed at first render, so
// "Settings" says nothing on the page until the gear is pressed; the Overview
// tab no longer carries its own copy of the panel (one place, not two).

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import type { Wave, WaveOverlap, WavePhaseDay, WaveSprint } from "@shared/waves"

function wave(overrides: Partial<Wave> = {}): Wave {
  return {
    id: "wave-1",
    ref: "W1",
    accountId: "acc-1",
    accountName: "Acme Inc.",
    name: "Onboarding package",
    appId: null,
    appName: null,
    appLogoUrl: null,
    goal: null,
    startsOn: null,
    endsOn: null,
    sprintCount: 0,
    active: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    createdByName: "Priya N",
    updatedAt: null,
    editedByName: null,
    ...overrides,
  }
}

const PHASE_DAYS: WavePhaseDay[] = [
  { phaseType: "Audit", days: 5 },
  { phaseType: "Plan", days: 5 },
  { phaseType: "Build", days: 15 },
  { phaseType: "Pilot", days: 5 },
  { phaseType: "Revision", days: 10 },
  { phaseType: "Deploy", days: 3 },
  { phaseType: "Hypercare", days: 7 },
]

const api = vi.hoisted(() => ({
  one: vi.fn(),
  setPhaseDays: vi.fn(),
}))
const perms = vi.hoisted(() => ({ can: vi.fn(() => true) }))

vi.mock("@/lib/perms", () => ({ usePermissions: () => ({ can: perms.can }) }))

vi.mock("@/lib/api/waves", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/waves")>()
  return {
    ...actual,
    waves: {
      ...actual.waves,
      one: api.one,
      setPhaseDays: api.setPhaseDays,
    },
  }
})

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return {
    ...actual,
    content: {
      ...actual.content,
      // Empty on purpose, same reason `wave-phase-days-panel.test.tsx` gives:
      // no sprints to narrow, no round trip this test needs to answer.
      sprints: async () => ({ sprints: [], total: 0 }),
    },
    tenancy: {
      ...actual.tenancy,
      apps: async () => ({ apps: [], total: 0 }),
      activity: async () => ({ activity: [], total: 0, nextCursor: null, hasMore: false }),
      // Empty on purpose, the same fallback `wave-phase-days-panel.test.tsx`
      // relies on: `useSprintTypes` falls back to `PHASE_TYPES`' own seven
      // names when the team's live vocabulary has not loaded, which is what
      // makes the row order (and labels) deterministic here.
      selectable: async () => ({ values: [] }),
    },
  }
})

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: () => {}, push: () => {} }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock("@shared/ui/components/sonner/sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
  Toaster: () => null,
}))

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

import { WaveDetailScreen } from "@/components/work/wave-detail"
import { clearCache } from "@shared/web/store"

afterEach(cleanup)
beforeEach(() => {
  // Same reason `story-detail.test.tsx` clears it in every case: the shared
  // module-level cache (`shared/web/store.ts`) must not serve a PREVIOUS
  // case's own cached read to this one.
  clearCache()
  perms.can.mockReset().mockReturnValue(true)
  api.one.mockReset().mockResolvedValue({
    wave: wave(),
    sprints: [] as WaveSprint[],
    overlaps: [] as WaveOverlap[],
    phaseDays: PHASE_DAYS,
  })
  api.setPhaseDays.mockReset().mockResolvedValue({ ok: true, phaseDays: PHASE_DAYS })
})

beforeAll(() => {
  // Radix's dropdown-menu primitive reads these during open/close; jsdom has
  // none of them. Same polyfill block `head-actions-fold.test.tsx` carries
  // for the identical reason, needed here to open the folded "..." trigger
  // (`HeadActionsFoldMenu`) below.
  Object.assign(window.HTMLElement.prototype, {
    scrollIntoView: () => {},
    hasPointerCapture: () => false,
    releasePointerCapture: () => {},
    setPointerCapture: () => {},
  })
})

const openWave = () => render(<WaveDetailScreen teamId="team-1" waveId="wave-1" basePath="/waves" />)

const openDropdown = (trigger: HTMLElement) => {
  fireEvent.pointerDown(trigger, { button: 0, pointerId: 1 })
  fireEvent.pointerUp(trigger, { button: 0, pointerId: 1 })
  fireEvent.click(trigger)
}

describe("the wave head's gear opens the phase-days settings sheet", () => {
  it("draws no 'Settings' sheet until the gear is pressed", async () => {
    openWave()
    await screen.findByText("Onboarding package")
    expect(screen.queryByText("Settings")).toBeNull()
    expect(screen.queryByLabelText("Audit")).toBeNull()
  })

  it("the gear button opens a sheet titled 'Settings', with the seven phase rows and the Monday-to-Friday line", async () => {
    openWave()
    await screen.findByText("Onboarding package")

    fireEvent.click(screen.getByRole("button", { name: "Settings" }))

    await screen.findByText("Settings")
    for (const name of ["Audit", "Plan", "Build", "Pilot", "Revision", "Deploy", "Hypercare"]) {
      expect(await screen.findByLabelText(name)).toBeTruthy()
    }
    expect(screen.getByText("Monday to Friday, weekends are not counted")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Save" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy()
  })

  it("the Overview tab no longer carries its own copy of the panel", async () => {
    api.one.mockResolvedValue({
      wave: wave({ sprintCount: 1 }),
      sprints: [
        {
          id: "sprint-1",
          waveId: "wave-1",
          accountId: "acc-1",
          ref: "S0001",
          name: "Build",
          sprintType: "Build",
          startsOn: "2026-01-05",
          endsOn: "2026-01-20",
          active: true,
        },
      ] as WaveSprint[],
      overlaps: [] as WaveOverlap[],
      phaseDays: PHASE_DAYS,
    })
    openWave()
    await screen.findByText("Onboarding package")
    // Overview is the remembered default tab (`useRemembered`'s own fallback),
    // and it still reads this wave's own "Expected length" row (the head's
    // forecast total, B46), the one thing the ruling said stays.
    expect(await screen.findByText("Expected length")).toBeTruthy()
    // The seven rows are reachable ONLY through the sheet, never inline here.
    expect(screen.queryByLabelText("Audit")).toBeNull()
  })
})

// ============================================================================
// LIVE DEFECT, 21 Sep 2026. Aurora looked at a wave on her team and said
// "dont see it". Proof against agency-staging.kwapso.app (commit a933c01b,
// PROOF wave W0001, this same round) found the gear already rendering
// correctly at every width the report asked for (1440x900, 1800x978,
// 760x900) and folding into "Settings" exactly as the wide row's own icon
// button does at the narrower width, but nothing in THIS file asserted
// either shape directly, only that the gear opens the sheet at all. These
// two blocks close that gap, the same source-level pattern
// `head-actions-fold.test.tsx` already uses for the ticket head (JSDOM does
// not evaluate `@container`, so the WIDTH claim is proven as a class
// contract, not a resize), plus a runtime proof that the gear itself is
// never gated on the wave-update right, only the sheet's own Save/Cancel
// row is, through `canEdit`, which is `postWavePhaseDays`'s own
// `("work","update")` gate (workers/tenancy/src/routes/waves.ts), so a
// reader without that right still finds the gear, opens the sheet, and sees
// it read-only rather than missing.
// ============================================================================
const ROOT = join(__dirname, "..", "..")
const waveDetailSrc = readFileSync(join(ROOT, "web/components/work/wave-detail.tsx"), "utf8")

describe("the wave head's gear lives in BOTH the wide row and the folded menu", () => {
  it("imports the shared fold from shared/web/head-actions, same as the ticket and task heads", () => {
    expect(waveDetailSrc).toMatch(/from "@shared\/web\/head-actions"/)
    expect(waveDetailSrc).toMatch(/HeadActionsFoldMenu/)
    expect(waveDetailSrc).toMatch(/HEAD_ACTIONS_ROW_CLASS/)
  })

  it("wraps the wide actions row in HEAD_ACTIONS_ROW_CLASS, with the gear as a standalone icon button beside the \"…\" menu (never inside it)", () => {
    expect(waveDetailSrc).toMatch(/data-slot="head-actions-row"\s*className=\{HEAD_ACTIONS_ROW_CLASS\}/)
    const rowStart = waveDetailSrc.indexOf('data-slot="head-actions-row"')
    const rowEnd = waveDetailSrc.indexOf("</div>", rowStart)
    const wideRow = waveDetailSrc.slice(rowStart, rowEnd)
    // The gear is a bare `<Button>`, a sibling of `<RecordActionsMenu>`,
    // not one of that menu's own `actions` entries.
    expect(wideRow).toMatch(/aria-label=\{t\("Settings"\)\}/)
    expect(wideRow).toMatch(/<Gear className="size-4" \/>/)
    expect(wideRow).toMatch(/<RecordActionsMenu actions=\{overflow\}\s*\/>/)
  })

  it("offers a \"Settings\" entry in foldedActions, UNCONDITIONALLY (ahead of the canEdit-gated overflow spread), the folded twin of the wide row's gear", () => {
    const start = waveDetailSrc.indexOf("const foldedActions: HeadActionItem[] = [")
    const end = waveDetailSrc.indexOf("\n  return (", start)
    expect(start, "foldedActions is declared where this test expects it").toBeGreaterThan(-1)
    const block = waveDetailSrc.slice(start, end)
    expect(block).toMatch(/key:\s*"settings"/)
    expect(block).toMatch(/label:\s*t\("Settings"\)/)
    // The settings entry precedes `...overflow`, folded first, matching the
    // wide row's own left-to-right order, and reachable whether or not
    // `overflow` itself is empty (canEdit === false).
    const settingsIdx = block.indexOf('key: "settings"')
    const overflowSpreadIdx = block.indexOf("...overflow")
    expect(settingsIdx).toBeGreaterThan(-1)
    expect(overflowSpreadIdx).toBeGreaterThan(-1)
    expect(settingsIdx).toBeLessThan(overflowSpreadIdx)
  })

  it("renders <HeadActionsFoldMenu items={foldedActions}> inside chips, the trigger's own required place", () => {
    expect(waveDetailSrc).toMatch(/<HeadActionsFoldMenu items=\{foldedActions\}/)
  })
})

describe("the gear is reachable with or without the wave-update right; only the sheet's Save row is gated", () => {
  it("the gear renders and opens the sheet even when the caller lacks work:update, read-only, not hidden", async () => {
    perms.can.mockImplementation(() => false)
    openWave()
    await screen.findByText("Onboarding package")

    // Unconditional in the wide row: still there for a reader.
    const gear = screen.getByRole("button", { name: "Settings" })
    fireEvent.click(gear)

    await screen.findByText("Settings")
    // The seven rows still show (read access to the wave), disabled rather
    // than absent.
    for (const name of ["Audit", "Plan", "Build", "Pilot", "Revision", "Deploy", "Hypercare"]) {
      const field = await screen.findByLabelText(name)
      // jest-dom is deliberately not set up in this workspace
      // (`filter-row-is-the-kits.test.tsx` says so), so this reads the DOM
      // property directly rather than reach for a `toBeDisabled()` matcher
      // nothing else here registers.
      expect((field as HTMLInputElement).disabled).toBe(true)
    }
    // `WavePhaseDaysPanel`'s own gate: no Save/Cancel row for a reader,
    // never a WRITE control offered and then refused by the door.
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull()
  })

  it("the folded \"Settings\" item opens the identical sheet as the wide row's gear", async () => {
    openWave()
    await screen.findByText("Onboarding package")

    const foldTrigger = document.querySelector('[data-slot="head-actions-fold"] button') as HTMLElement
    expect(foldTrigger, "the folded trigger renders beside the chips regardless of container width").toBeTruthy()
    openDropdown(foldTrigger)

    const settingsItem = await waitFor(() => screen.getByRole("menuitem", { name: "Settings" }))
    fireEvent.click(settingsItem)

    await screen.findByText("Monday to Friday, weekends are not counted")
    expect(await screen.findByLabelText("Audit")).toBeTruthy()
  })
})
