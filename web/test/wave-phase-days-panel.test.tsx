// WAVE PHASE-DAYS SETTINGS PANEL. Aurora's ruling, 20 Sep 2026, verbatim: "on
// waves i am missing the settings (we'l adjust the duration of pahses in
// days)." This proves the shape the ruling asks for: seven rows, one per
// `PHASE_TYPES` name, in PHASE_TYPES order; Save calls the door with only the
// rows that actually changed; and the panel is read-only for a caller who
// does not hold the wave update right.

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

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

import { WavePhaseDaysPanel } from "@/components/work/wave-phase-days-panel"
import { PHASE_TYPES } from "@shared/sprint-types"
import type { WavePhaseDay } from "@shared/waves"

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
