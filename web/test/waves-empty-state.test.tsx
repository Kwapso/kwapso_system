// WAVES, R88 ON THE SCREEN'S OWN DEFAULT VIEW.
//
// Live defect, proved on staging 20 Sep 2026: a team with zero waves landed on
// the Waves screen's DEFAULT view (Timeline, `waves-screen.tsx`'s own
// `useRemembered<WaveView>("view", "timeline")`) with no way at all to sell
// the first wave. The toolbar carrying "Sell a wave" is correctly withdrawn
// by R50 (`(wavesLoading || all.length > 0) && <WaveFinder .../>`), and
// `RecordTimeline`'s own `emptyBody`, the body Timeline fell into, is a
// sentence with no door. A reader had to already know to switch to the All
// tab's List view to find "Add the first", which nothing on screen pointed at.
//
// THE FIX (R88, empty-state-single-door): `all.length === 0` is hoisted above
// the per-view branches in `waves-screen.tsx`, so Timeline, Calendar and List
// all draw the identical `CollectionEmptyState` register, one door, "Add the
// first", with the create right and the door withdrawn together for a reader
// who lacks it.
//
// THE CANARY IS THE ONE-ROW RENDER (the same posture `cold-tabs.test.tsx`
// takes): an absence assertion passes against a tree that rendered nothing at
// all, so each empty render is followed by proving the populated path still
// works.

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/api", () => ({
  ApiFailure: class extends Error {},
  content: {
    sprints: async () => ({ sprints: [], total: 0 }),
  },
  tenancy: {
    accounts: async () => ({
      accounts: door.clients,
      total: door.clients.length,
      entityTotal: door.clients.length,
      individualTotal: 0,
      nextCursor: null,
    }),
    apps: async () => ({ apps: [], total: 0 }),
    selectable: async () => ({ values: [], total: 0 }),
    myPermissions: async () => ({ permissions: door.perms }),
  },
}))

vi.mock("@/lib/api/waves", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/waves")>()
  return {
    ...actual,
    waves: {
      ...actual.waves,
      list: async () => ({ waves: door.waves, total: door.waves.length }),
      create: async () => ({ id: "new-wave" }),
    },
  }
})

const door: {
  waves: unknown[]
  clients: { id: string; name: string; active: boolean }[]
  perms: Record<string, Record<string, boolean>>
} = { waves: [], clients: [], perms: {} }

import { primeCache, clearCache } from "@shared/web/store"
import { appsKey, companiesKey, sprintsKey, totalKey } from "@/lib/live-resources"
import { wavesKey } from "@/lib/api/waves"
import { WavesScreen } from "@/components/work/waves-screen"

beforeAll(() => {
  // Radix's Select (the view switch) and Dialog both probe these on mount,
  // the same stub set `wave-finder-toolbar-is-one-container.test.tsx` already
  // needs for this exact screen.
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

afterEach(() => {
  cleanup()
  clearCache()
})

const ADD_THE_FIRST = /Add the first/

let n = 0
/** A team with zero waves, one client to sell one to, and the given create
 * right. Warm caches so the first paint is the one under test, the same
 * `coldTeam()` posture `cold-tabs.test.tsx` takes. */
function renderEmptyWaves(canCreate: boolean) {
  const teamId = `waves-cold-${++n}`
  door.waves = []
  door.clients = [{ id: "acc1", name: "Bergman S.A.", active: true }]
  door.perms = { work: { read: true, create: canCreate, update: canCreate } }

  primeCache(wavesKey(teamId), [])
  primeCache(totalKey("waves", teamId), 0)
  primeCache(companiesKey(teamId), door.clients)
  primeCache(sprintsKey(teamId), [])
  primeCache(appsKey(teamId), [])
  primeCache(`selectable:${teamId}`, [])
  primeCache(`my-perms:${teamId}`, door.perms)

  render(<WavesScreen teamId={teamId} basePath="/waves" />)
  return teamId
}

describe("Waves, the screen's own DEFAULT view (Timeline) on a team with none yet", () => {
  it("draws the one door, 'Add the first', with the create right", async () => {
    renderEmptyWaves(true)

    // The toolbar is withdrawn (R50); its own "Sell a wave" is nowhere on
    // screen, Timeline included.
    expect(await screen.findByText("No waves yet.")).toBeTruthy()
    expect(screen.queryByRole("button", { name: /Sell a wave/ })).toBeNull()

    // Exactly one door, R88's own register.
    const doors = screen.getAllByRole("button", { name: ADD_THE_FIRST })
    expect(doors.length).toBe(1)

    // It opens the SAME form the toolbar button opens: `WaveFormDialog`'s own
    // `DialogTitle`, "Sell a wave" (never editing, since nothing exists yet).
    fireEvent.click(doors[0]!)
    expect(await screen.findByRole("heading", { name: "Sell a wave" })).toBeTruthy()
  })

  it("draws no door at all for a reader without the create right (R88's second clause)", async () => {
    renderEmptyWaves(false)

    expect(await screen.findByText("No waves yet.")).toBeTruthy()
    expect(screen.queryByRole("button", { name: ADD_THE_FIRST })).toBeNull()
    expect(screen.queryByRole("button", { name: /Sell a wave/ })).toBeNull()
  })

  it("CANARY: one wave draws that wave, not the empty register, and Timeline is what's on screen", async () => {
    const teamId = `waves-cold-${++n}`
    door.clients = [{ id: "acc1", name: "Bergman S.A.", active: true }]
    door.perms = { work: { read: true, create: true, update: true } }
    const today = new Date().toISOString().slice(0, 10)
    const oneWave = {
      id: "w1",
      ref: "W-1",
      name: "Onboarding package",
      accountId: "acc1",
      accountName: "Bergman S.A.",
      appId: null,
      appName: null,
      appLogoUrl: null,
      goal: null,
      // Timeline only draws a wave that has both dates ("a wave with no dates
      // at all is left off the axis, it belongs on List, not here",
      // waves-timeline.test.ts). This canary is specifically proving the
      // DEFAULT view, so it needs a date inside the default window.
      startsOn: today,
      endsOn: today,
      sprintCount: 0,
      active: true,
      createdAt: "2026-09-01T00:00:00.000Z",
      createdByName: null,
      updatedAt: null,
      editedByName: null,
    }
    primeCache(wavesKey(teamId), [oneWave])
    primeCache(totalKey("waves", teamId), 1)
    primeCache(companiesKey(teamId), door.clients)
    primeCache(sprintsKey(teamId), [])
    primeCache(appsKey(teamId), [])
    primeCache(`selectable:${teamId}`, [])
    primeCache(`my-perms:${teamId}`, door.perms)
    door.waves = [oneWave]

    render(<WavesScreen teamId={teamId} basePath="/waves" />)

    expect(await screen.findByText(/Onboarding package/)).toBeTruthy()
    expect(screen.queryByText("No waves yet.")).toBeNull()
    expect(screen.queryByRole("button", { name: ADD_THE_FIRST })).toBeNull()
    // The toolbar is back, with the real "Sell a wave" button.
    expect(screen.getByRole("button", { name: /Sell a wave/ })).toBeTruthy()
  })
})
