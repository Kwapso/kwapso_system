// THE WAVES MODULE SETTINGS PAGE'S "PHASE DAYS" SECTION. Aurora's ruling,
// 21 Sep 2026, closing the loop her 20 Sep 2026 one opened (the per-wave
// Settings sheet, B46, documents/UI-RULEBOOK.md): "Make sure we can adjust
// this on the settings in Waves." This proves the OTHER door onto the same
// fact — `/settings/waves`, reached from the gear
// `web/test/waves-screen-settings-gear.test.tsx` proves is on the module's
// own main screen — renders the seven rows and saves through the team-wide
// door, `update_wave_phase_day_defaults`'s web counterpart.

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { clearCache } from "@shared/web/store"

const teamDefaultsApi = vi.hoisted(() => ({
  phaseDayDefaults: vi.fn(),
  setPhaseDayDefaults: vi.fn(),
}))

vi.mock("@/lib/api/waves", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/waves")>()
  return {
    ...actual,
    waves: {
      ...actual.waves,
      phaseDayDefaults: teamDefaultsApi.phaseDayDefaults,
      setPhaseDayDefaults: teamDefaultsApi.setPhaseDayDefaults,
    },
  }
})

const perms = vi.hoisted(() => ({ can: vi.fn((_module: string, _right: string) => true) }))
vi.mock("@/lib/perms", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/perms")>()
  return { ...actual, usePermissions: () => ({ can: perms.can }) }
})

import { ModuleSettingsScreen } from "@/components/screens/module-settings-screen"
import { PHASE_TYPES } from "@shared/sprint-types"
import { PHASE_DAY_DEFAULTS } from "@shared/waves"
import type { ActiveTeam } from "@/lib/use-active-team"

const ACTIVE = {
  loading: false,
  user: null,
  ctx: { team: { id: "team-1", name: "Acme" }, role: "Admin", rights: {} },
  switchTeam: async () => {},
  createTeam: async () => {},
  refresh: async () => {},
} as unknown as ActiveTeam

afterEach(cleanup)

describe('the waves module-settings page ("Phase days") renders the seven rows and saves', () => {
  beforeEach(() => {
    clearCache()
    perms.can.mockReturnValue(true)
    teamDefaultsApi.phaseDayDefaults.mockReset()
    teamDefaultsApi.setPhaseDayDefaults.mockReset()
    teamDefaultsApi.phaseDayDefaults.mockResolvedValue({
      phaseDays: PHASE_TYPES.map((p) => ({ phaseType: p.name, days: PHASE_DAY_DEFAULTS[p.name] })),
    })
    teamDefaultsApi.setPhaseDayDefaults.mockResolvedValue({ ok: true, phaseDays: [] })
  })

  it('titles the page "Waves" (the nav\'s own word, TEAM_SECTIONS) and draws the "Phase days" tab', async () => {
    render(<ModuleSettingsScreen active={ACTIVE} segment="waves" />)
    expect(await screen.findByRole("heading", { name: "Waves" })).toBeTruthy()
    expect(screen.getByRole("tab", { name: /Phase days/ })).toBeTruthy()
  })

  it("renders all seven phase-type rows, at the team's own default (the code's placeholder, nobody has set one yet)", async () => {
    render(<ModuleSettingsScreen active={ACTIVE} segment="waves" />)
    for (const p of PHASE_TYPES) {
      const input = (await screen.findByLabelText(p.name)) as HTMLInputElement
      expect(input.value).toBe(String(PHASE_DAY_DEFAULTS[p.name]))
    }
    expect(screen.getByText("Monday to Friday, weekends are not counted")).toBeTruthy()
  })

  it("Save calls the team-wide door with only the changed row", async () => {
    // A DELIBERATELY SETTLED READ FIRST, the same shape
    // `wave-phase-days-panel.test.tsx` uses for its own team-defaults panel:
    // resolve the read to a value DIFFERENT from the placeholder, and wait
    // for the screen to show it, so the edit below lands after the fetch's
    // own effect has genuinely committed rather than racing it.
    let resolve!: (v: { phaseDays: { phaseType: string; days: number }[] }) => void
    teamDefaultsApi.phaseDayDefaults.mockReturnValue(
      new Promise((r) => {
        resolve = r
      })
    )
    render(<ModuleSettingsScreen active={ACTIVE} segment="waves" />)
    const build = (await screen.findByLabelText("Build")) as HTMLInputElement
    resolve({ phaseDays: PHASE_TYPES.map((p) => ({ phaseType: p.name, days: 20 })) })
    await waitFor(() => expect(build.value).toBe("20"))

    fireEvent.change(build, { target: { value: "40" } })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() => expect(teamDefaultsApi.setPhaseDayDefaults).toHaveBeenCalledTimes(1))
    expect(teamDefaultsApi.setPhaseDayDefaults).toHaveBeenCalledWith([{ phaseType: "Build", days: 40 }])
  })

  it("is read-only for a caller without work:update — no Save, disabled fields", async () => {
    perms.can.mockImplementation((_module: string, right: string) => right !== "update")
    render(<ModuleSettingsScreen active={ACTIVE} segment="waves" />)
    const build = (await screen.findByLabelText("Build")) as HTMLInputElement
    expect(build.disabled).toBe(true)
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull()
  })

  it("is refused for a caller without work:read at all (NoAccess, not the page)", async () => {
    perms.can.mockReturnValue(false)
    render(<ModuleSettingsScreen active={ACTIVE} segment="waves" />)
    expect(await screen.findByText(/don.t have access/i)).toBeTruthy()
    expect(screen.queryByRole("heading", { name: "Waves" })).toBeNull()
  })
})
