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

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

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

const openWave = () => render(<WaveDetailScreen teamId="team-1" waveId="wave-1" basePath="/waves" />)

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
