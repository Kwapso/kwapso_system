// WAVE PHASE-DAYS SETTINGS PANEL, AND THE SHEET IT OPENS IN NOW. Aurora's
// ruling, 20 Sep 2026, verbatim: "on waves i am missing the settings (we'l
// adjust the duration of pahses in days)." This proves the shape the ruling
// asks for: seven rows, one per `PHASE_TYPES` name, in PHASE_TYPES order;
// Save calls the door with only the rows that actually changed; and the
// panel is read-only for a caller who does not hold the wave update right.
//
// UPDATED 21 Sep 2026 FOR THE SHEET. Her very next ruling, verbatim: "missing
// the settings button in waves to adjust that!!!" The panel no longer draws
// its own Card or its own "Settings" heading (both moved to the slide-in that
// now hosts it, `WavePhaseDaysSheet` below, titled by the sheet itself) so
// nothing here changes: the same seven fields, the same unit, the same
// explainer line, the same Save/Cancel row this suite already pinned. The
// second `describe` block below is new, and proves the sheet wrapper itself:
// its own title, that it draws nothing while closed, and that it will not
// close mid-save.

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { clearCache } from "@shared/web/store"

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return {
    ...actual,
    tenancy: {
      ...actual.tenancy,
      // Empty on purpose: `useSprintTypes` falls back to `PHASE_TYPES`' own
      // seven names when the team's live vocabulary has not loaded, which is
      // what makes the row order deterministic in this suite.
      selectable: async () => ({ values: [] }),
    },
  }
})

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

// `TeamPhaseDayDefaultsPanel` asks `work:update` itself (its own
// `usePermissions` call, the same split `ModuleAutomations` takes) rather
// than taking `canEdit` as a prop — see that component's own header for why.
const perms = vi.hoisted(() => ({ can: vi.fn(() => true) }))
vi.mock("@/lib/perms", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/perms")>()
  return { ...actual, usePermissions: () => ({ can: perms.can }) }
})

import {
  TeamPhaseDayDefaultsPanel,
  WavePhaseDaysPanel,
  WavePhaseDaysSheet,
} from "@/components/work/wave-phase-days-panel"
import { PHASE_TYPES } from "@shared/sprint-types"
import { PHASE_DAY_DEFAULTS, type WavePhaseDay } from "@shared/waves"

afterEach(cleanup)

const PHASE_DAYS: WavePhaseDay[] = [
  { phaseType: "Audit", days: 5 },
  { phaseType: "Plan", days: 5 },
  { phaseType: "Build", days: 20 },
  { phaseType: "Pilot", days: 10 },
  { phaseType: "Revision", days: 10 },
  { phaseType: "Deploy", days: 3 },
  { phaseType: "Hypercare", days: 10 },
]

describe("WavePhaseDaysPanel, seven rows, in PHASE_TYPES order", () => {
  it("renders exactly one number field per phase type, Audit through Hypercare", async () => {
    render(
      <WavePhaseDaysPanel teamId="team-1" phaseDays={PHASE_DAYS} canEdit={true} busy={false} onSave={vi.fn()} />
    )
    const inputs = await Promise.all(PHASE_TYPES.map((p) => screen.findByLabelText(p.name)))
    expect(inputs).toHaveLength(7)
    expect(PHASE_TYPES.map((p) => p.name)).toEqual([
      "Audit",
      "Plan",
      "Build",
      "Pilot",
      "Revision",
      "Deploy",
      "Hypercare",
    ])
    // Each field starts at the value the wave was read with.
    PHASE_DAYS.forEach((row, i) => {
      expect((inputs[i] as HTMLInputElement).value).toBe(String(row.days))
    })
  })

  it("the unit beside each field reads 'working days', and the explainer line sits under the seven rows", async () => {
    render(
      <WavePhaseDaysPanel teamId="team-1" phaseDays={PHASE_DAYS} canEdit={true} busy={false} onSave={vi.fn()} />
    )
    await screen.findByLabelText("Audit")
    expect(screen.getAllByText("working days")).toHaveLength(7)
    expect(screen.getByText("Monday to Friday, weekends are not counted")).toBeTruthy()
  })

  it("Save calls the door with only the rows that changed", async () => {
    const onSave = vi.fn(async () => {})
    render(
      <WavePhaseDaysPanel teamId="team-1" phaseDays={PHASE_DAYS} canEdit={true} busy={false} onSave={onSave} />
    )
    const build = (await screen.findByLabelText("Build")) as HTMLInputElement
    fireEvent.change(build, { target: { value: "30" } })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(onSave).toHaveBeenCalledWith([{ phaseType: "Build", days: 30 }])
  })

  it("Cancel drops the edit back to what the wave answered with", async () => {
    render(
      <WavePhaseDaysPanel teamId="team-1" phaseDays={PHASE_DAYS} canEdit={true} busy={false} onSave={vi.fn()} />
    )
    const build = (await screen.findByLabelText("Build")) as HTMLInputElement
    fireEvent.change(build, { target: { value: "30" } })
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(build.value).toBe("20")
  })

  it("is read-only, with no Save or Cancel, for a caller without the wave update right", async () => {
    render(
      <WavePhaseDaysPanel teamId="team-1" phaseDays={PHASE_DAYS} canEdit={false} busy={false} onSave={vi.fn()} />
    )
    const build = (await screen.findByLabelText("Build")) as HTMLInputElement
    expect(build.disabled).toBe(true)
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull()
  })
})

describe("WavePhaseDaysSheet, the slide-in the wave head's gear opens", () => {
  it("draws nothing while closed", () => {
    render(
      <WavePhaseDaysSheet
        open={false}
        onOpenChange={vi.fn()}
        teamId="team-1"
        phaseDays={PHASE_DAYS}
        canEdit={true}
        busy={false}
        onSave={vi.fn()}
      />
    )
    expect(screen.queryByText("Settings")).toBeNull()
    expect(screen.queryByLabelText("Audit")).toBeNull()
  })

  it("open: titled 'Settings', the panel's own seven rows and explainer line inside it", async () => {
    render(
      <WavePhaseDaysSheet
        open
        onOpenChange={vi.fn()}
        teamId="team-1"
        phaseDays={PHASE_DAYS}
        canEdit={true}
        busy={false}
        onSave={vi.fn()}
      />
    )
    await screen.findByText("Settings")
    for (const p of PHASE_TYPES) expect(await screen.findByLabelText(p.name)).toBeTruthy()
    expect(screen.getByText("Monday to Friday, weekends are not counted")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Save" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy()
  })

  it("a save in flight refuses the backdrop, the same rule FormShellDialog's own close() enforces", async () => {
    const onOpenChange = vi.fn()
    render(
      <WavePhaseDaysSheet
        open
        onOpenChange={onOpenChange}
        teamId="team-1"
        phaseDays={PHASE_DAYS}
        canEdit={true}
        busy={true}
        onSave={vi.fn()}
      />
    )
    await screen.findByText("Settings")
    // Portalled to document.body, the same reason
    // `google-account-match-sheet.test.tsx` looks up the sheet there rather
    // than the render's own container. `pointerDown`, not `click`: Radix's
    // dismissable layer (`@radix-ui/react-dismissable-layer`) decides on the
    // OUTSIDE `pointerdown`, not a click, so a `click`-only press would pass
    // this case whether or not the busy guard actually works.
    const overlay = document.body.querySelector('[data-slot="sheet-overlay"]')
    expect(overlay, "no sheet overlay found to press").toBeTruthy()
    fireEvent.pointerDown(overlay as Element)
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it("not busy: the backdrop closes it", async () => {
    const onOpenChange = vi.fn()
    render(
      <WavePhaseDaysSheet
        open
        onOpenChange={onOpenChange}
        teamId="team-1"
        phaseDays={PHASE_DAYS}
        canEdit={true}
        busy={false}
        onSave={vi.fn()}
      />
    )
    await screen.findByText("Settings")
    const overlay = document.body.querySelector('[data-slot="sheet-overlay"]')
    fireEvent.pointerDown(overlay as Element)
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })
})

// THE TEAM'S OWN DEFAULTS, ON THE WAVES MODULE SETTINGS PAGE — Aurora's very
// next ruling, 21 Sep 2026, verbatim, closing the loop the two blocks above
// already answer per wave: "Make sure we can adjust this on the settings in
// Waves." Same seven-row panel, its own fetch and save.
describe("TeamPhaseDayDefaultsPanel, the waves module-settings page's own mounting", () => {
  beforeEach(() => {
    clearCache()
    perms.can.mockReturnValue(true)
  })
  afterEach(() => {
    teamDefaultsApi.phaseDayDefaults.mockReset()
    teamDefaultsApi.setPhaseDayDefaults.mockReset()
  })

  it("renders the code's own placeholder while the read is in flight, then the team's own answer once it lands", async () => {
    let resolve!: (v: { phaseDays: WavePhaseDay[] }) => void
    teamDefaultsApi.phaseDayDefaults.mockReturnValue(
      new Promise((r) => {
        resolve = r
      })
    )
    render(<TeamPhaseDayDefaultsPanel teamId="team-1" />)
    const build = (await screen.findByLabelText("Build")) as HTMLInputElement
    expect(build.value).toBe(String(PHASE_DAY_DEFAULTS.Build))

    resolve({ phaseDays: PHASE_TYPES.map((p) => ({ phaseType: p.name, days: 25 })) })
    await waitFor(() => expect(build.value).toBe("25"))
  })

  it("Save calls setPhaseDayDefaults, not the per-wave door", async () => {
    // A DELIBERATELY SETTLED READ FIRST — the placeholder and the team's real
    // answer are the same seven numbers in this suite (nothing has been set
    // yet), so nothing here would ever prove the fetch had actually landed
    // before the edit. Awaiting the resolve explicitly, the same shape the
    // block above already uses, is what removes that race.
    let resolve!: (v: { phaseDays: WavePhaseDay[] }) => void
    teamDefaultsApi.phaseDayDefaults.mockReturnValue(
      new Promise((r) => {
        resolve = r
      })
    )
    teamDefaultsApi.setPhaseDayDefaults.mockResolvedValue({ ok: true, phaseDays: [] })
    render(<TeamPhaseDayDefaultsPanel teamId="team-1" />)
    const build = (await screen.findByLabelText("Build")) as HTMLInputElement
    expect(build.value).toBe(String(PHASE_DAY_DEFAULTS.Build)) // the placeholder, while the read is in flight

    // A DIFFERENT number than the placeholder, on purpose: `waitFor` below can
    // only prove the fetch has genuinely landed (and its own effect settled)
    // by waiting for a value the placeholder could never already show.
    resolve({ phaseDays: PHASE_TYPES.map((p) => ({ phaseType: p.name, days: 20 })) })
    await waitFor(() => expect(build.value).toBe("20"))

    fireEvent.change(build, { target: { value: "40" } })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() => expect(teamDefaultsApi.setPhaseDayDefaults).toHaveBeenCalledTimes(1))
    expect(teamDefaultsApi.setPhaseDayDefaults).toHaveBeenCalledWith([{ phaseType: "Build", days: 40 }])
  })

  it("is read-only for a caller without the wave update right", async () => {
    perms.can.mockReturnValue(false)
    teamDefaultsApi.phaseDayDefaults.mockResolvedValue({
      phaseDays: PHASE_TYPES.map((p) => ({ phaseType: p.name, days: PHASE_DAY_DEFAULTS[p.name] })),
    })
    render(<TeamPhaseDayDefaultsPanel teamId="team-1" />)
    const build = (await screen.findByLabelText("Build")) as HTMLInputElement
    expect(build.disabled).toBe(true)
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull()
  })
})
