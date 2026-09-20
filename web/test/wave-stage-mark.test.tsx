// THE WAVE'S OWN STAGE, DRAWN - Aurora's ruling, 21 Sep 2026, verbatim: "stage
// wave: read the active pahse that sit." `WaveStageMark` (waves-screen.tsx) is
// the ONE component the wave row (List's Phases cell, the T3 timeline's own
// sublabel) and the wave head (wave-detail.tsx's chip row) all draw through - // so pinning it here locks the row AND the head at once: neither can drift
// from the other because there is only one function to drift from.

import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import {
  WaveStageMark,
  waveDates,
  waveListRows,
  buildWaveTimelineRows,
  waveWeekWindow,
} from "@/components/work/waves-screen"
import type { Wave } from "@shared/waves"
import type { Sprint } from "@shared/types"

afterEach(cleanup)

const t = (s: string) => s
const TODAY = new Date().toISOString().slice(0, 10)

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number)
  const dt = new Date(y!, (m ?? 1) - 1, (d ?? 1) + n)
  const pad = (v: number) => String(v).padStart(2, "0")
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
}

function phase(
  over: Partial<{
    startsOn: string | null
    endsOn: string | null
    sprintType: string | null
    active: boolean
    name: string
  }> = {}
) {
  return { startsOn: null, endsOn: null, sprintType: null, active: true, name: "Phase", ...over }
}

describe("WaveStageMark - the one component the row and the head both draw through", () => {
  it("no phases at all: 'No phases yet', text variant", () => {
    const { container } = render(<WaveStageMark phases={[]} t={t} />)
    expect(container.textContent).toBe("No phases yet")
  })

  it("every phase completed: 'Complete'", () => {
    const done = phase({ startsOn: addDays(TODAY, -30), endsOn: addDays(TODAY, -10) })
    const { container } = render(<WaveStageMark phases={[done]} t={t} />)
    expect(container.textContent).toBe("Complete")
  })

  it("a phase is active today: the phase's own TYPE word, icon included", () => {
    const build = phase({ startsOn: addDays(TODAY, -5), endsOn: addDays(TODAY, 5), sprintType: "Build" })
    const { container } = render(<WaveStageMark phases={[build]} t={t} />)
    expect(container.textContent).toBe("Build")
    // Icon only, no colour (her own words) - an svg glyph rides beside the
    // word rather than a coloured dot.
    expect(container.querySelector("svg")).toBeTruthy()
  })

  it("none active: the earliest upcoming phase's own type", () => {
    const audit = phase({ startsOn: addDays(TODAY, 10), endsOn: addDays(TODAY, 20), sprintType: "Audit" })
    const plan = phase({ startsOn: addDays(TODAY, 30), endsOn: addDays(TODAY, 40), sprintType: "Plan" })
    const { container } = render(<WaveStageMark phases={[audit, plan]} t={t} />)
    expect(container.textContent).toBe("Audit")
  })

  it("the chip variant draws the same word inside a Badge, for the wave head", () => {
    const build = phase({ startsOn: addDays(TODAY, -5), endsOn: addDays(TODAY, 5), sprintType: "Build" })
    const { container } = render(<WaveStageMark phases={[build]} t={t} variant="chip" />)
    expect(container.textContent).toBe("Build")
    expect(container.querySelector('[data-slot="badge"]') ?? container.firstElementChild).toBeTruthy()
  })

  // LIVE DEFECT, proved 20 Sep 2026: a wave whose active/upcoming phase has no
  // TYPE yet used to draw an icon-less span with an EMPTY label - nothing at
  // all, on the row and on the head alike. The rule: the phase's own NAME,
  // under the generic phase icon (`CalendarDots`, the same glyph
  // `CONCEPT_ICON.sprints` gives the Phases nav item, `web/lib/pages.ts`).
  it("a phase is active today but carries no type: the phase's own NAME, generic icon, never nothing (text variant)", () => {
    const untyped = phase({ startsOn: addDays(TODAY, -5), endsOn: addDays(TODAY, 5), name: "Kickoff" })
    const { container } = render(<WaveStageMark phases={[untyped]} t={t} />)
    expect(container.textContent).toBe("Kickoff")
    expect(container.textContent).not.toBe("")
    expect(container.querySelector("svg")).toBeTruthy()
  })

  it("the earliest upcoming phase carries no type either: the same fallback (text variant)", () => {
    const untyped = phase({ startsOn: addDays(TODAY, 10), endsOn: addDays(TODAY, 20), name: "Discovery" })
    const { container } = render(<WaveStageMark phases={[untyped]} t={t} />)
    expect(container.textContent).toBe("Discovery")
    expect(container.querySelector("svg")).toBeTruthy()
  })

  it("a typeless active phase, chip variant: the phase's own NAME, generic icon, never an empty Badge (the wave head)", () => {
    const untyped = phase({ startsOn: addDays(TODAY, -5), endsOn: addDays(TODAY, 5), name: "Kickoff" })
    const { container } = render(<WaveStageMark phases={[untyped]} t={t} variant="chip" />)
    expect(container.textContent).toBe("Kickoff")
    expect(container.textContent).not.toBe("")
    expect(container.querySelector("svg")).toBeTruthy()
  })

  it("a typed phase with an unrecognised type still reads its own word, no generic icon forced on it", () => {
    // Not the bug this fallback targets - `type` is SET (a team's own custom
    // or retired word), so the original "word, no icon" reading is unchanged.
    const custom = phase({ startsOn: addDays(TODAY, -5), endsOn: addDays(TODAY, 5), sprintType: "Custom thing" })
    const { container } = render(<WaveStageMark phases={[custom]} t={t} />)
    expect(container.textContent).toBe("Custom thing")
    expect(container.querySelector("svg")).toBeNull()
  })
})

describe("waveDates - the wave head's Runs line, phases as the fallback", () => {
  it("a wave with its own two dates reads them, phases or not", () => {
    const wave = { startsOn: "2026-01-01", endsOn: "2026-01-31" }
    expect(waveDates(wave, t, "en", [phase({ startsOn: "2026-05-01", endsOn: "2026-05-10" })])).toBe(
      "Jan 1, 2026 → Jan 31, 2026"
    )
  })

  it("a wave with neither date, no phases either: the empty sentence", () => {
    const wave = { startsOn: null, endsOn: null }
    expect(waveDates(wave, t, "en", [])).toBe("No phases planned yet")
    expect(waveDates(wave, t, "en")).toBe("No phases planned yet")
  })

  // LIVE DEFECT, proved 20 Sep 2026: the head's own "Runs" line read only the
  // wave's own startsOn/endsOn and said "No phases planned yet" even with a
  // dated phase attached. Rule: earliest phase start to latest phase end.
  it("a wave with no dates of its own, but a dated phase attached: derives Runs from the phase", () => {
    const wave = { startsOn: null, endsOn: null }
    const p = phase({ startsOn: "2026-03-01", endsOn: "2026-03-20" })
    expect(waveDates(wave, t, "en", [p])).toBe("Mar 1, 2026 → Mar 20, 2026")
  })

  it("several phases: the EARLIEST start to the LATEST end, not the first phase alone", () => {
    const wave = { startsOn: null, endsOn: null }
    const first = phase({ startsOn: "2026-04-10", endsOn: "2026-04-20" })
    const second = phase({ startsOn: "2026-03-01", endsOn: "2026-05-15" })
    expect(waveDates(wave, t, "en", [first, second])).toBe("Mar 1, 2026 → May 15, 2026")
  })

  it("a phase with only a start date: reads that one date, not the empty sentence", () => {
    const wave = { startsOn: null, endsOn: null }
    const p = phase({ startsOn: "2026-06-01", endsOn: null })
    expect(waveDates(wave, t, "en", [p])).toBe("Jun 1, 2026")
  })
})

describe("waveListRows - the wave row carries its own stage as a second line", () => {
  function wave(over: Partial<Wave> & { id: string; accountId: string }): Wave {
    return {
      ref: null,
      name: "Wave",
      accountName: "Acme",
      appId: null,
      appName: null,
      appLogoUrl: null,
      goal: null,
      startsOn: null,
      endsOn: null,
      sprintCount: 0,
      active: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      createdByName: null,
      updatedAt: null,
      editedByName: null,
      ...over,
    }
  }

  function sprint(over: Partial<Sprint> & { id: string; name: string; waveId: string }): Sprint {
    return {
      ref: null,
      refWas: null,
      goal: null,
      goalSummary: null,
      sprintType: null,
      accountId: null,
      accountName: null,
      appId: null,
      appName: null,
      waveName: null,
      startsOn: null,
      endsOn: null,
      soldPriceCents: 0,
      currency: null,
      completedAt: null,
      active: true,
      storyCount: 0,
      openStoryCount: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      createdByName: null,
      ...over,
    }
  }

  it("draws the wave's own stage under the phase count and dots", () => {
    const w = wave({ id: "w1", accountId: "a1", sprintCount: 1 })
    const s = sprint({
      id: "s1",
      name: "Build",
      waveId: "w1",
      sprintType: "Build",
      startsOn: addDays(TODAY, -5),
      endsOn: addDays(TODAY, 5),
    })
    const rows = waveListRows([w], [s], t, "en")
    const { container } = render(<>{rows[0]!.sprints}</>)
    expect(container.textContent).toContain("Build")
  })

  it("a wave with no phases reads 'No phases yet' on the row too", () => {
    const w = wave({ id: "w2", accountId: "a1", sprintCount: 0 })
    const rows = waveListRows([w], [], t, "en")
    const { container } = render(<>{rows[0]!.sprints}</>)
    expect(container.textContent).toContain("No phases yet")
  })

  // LIVE DEFECT, proved 20 Sep 2026, ON THE ROW: a wave whose active phase has
  // no type yet used to draw an empty stage line - the count and dots stayed,
  // and the second line under them said nothing at all. The row falls back to
  // the phase's own name, the same as the head.
  it("a typeless active phase still names itself on the row, never a blank second line", () => {
    const w = wave({ id: "w4", accountId: "a1", sprintCount: 1 })
    const s = sprint({
      id: "s4",
      name: "Kickoff",
      waveId: "w4",
      sprintType: null,
      startsOn: addDays(TODAY, -5),
      endsOn: addDays(TODAY, 5),
    })
    const rows = waveListRows([w], [s], t, "en")
    const { container } = render(<>{rows[0]!.sprints}</>)
    expect(container.textContent).toContain("Kickoff")
    expect(container.textContent).not.toContain("No phases yet")
  })

  it("a deactivated phase never carries the stage - the row falls back to 'No phases yet'", () => {
    const w = wave({ id: "w3", accountId: "a1", sprintCount: 1 })
    const s = sprint({
      id: "s3",
      name: "Old build",
      waveId: "w3",
      sprintType: "Build",
      startsOn: addDays(TODAY, -5),
      endsOn: addDays(TODAY, 5),
      active: false,
    })
    const rows = waveListRows([w], [s], t, "en")
    const { container } = render(<>{rows[0]!.sprints}</>)
    expect(container.textContent).toContain("No phases yet")
  })
})

describe("buildWaveTimelineRows - the T3 row carries the stage in its sublabel when a translator is passed", () => {
  it("omits the stage (the exact pre-21-Sep shape) when no `t` is passed", () => {
    const win = waveWeekWindow(0, t, "en")
    const windowStart = win.weekStarts[0]!
    const w: Wave = {
      ref: null,
      name: "Legacy",
      accountName: "Acme",
      appId: null,
      appName: null,
      appLogoUrl: null,
      goal: null,
      startsOn: windowStart,
      endsOn: addDays(windowStart, 10),
      sprintCount: 0,
      active: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      createdByName: null,
      updatedAt: null,
      editedByName: null,
      id: "w1",
      accountId: "a1",
    }
    const rows = buildWaveTimelineRows([w], [], win, "/waves", "en")
    expect(rows[0]!.sublabel).toBeUndefined()
  })

  it("carries the active phase's own word in the sublabel when `t` is passed", () => {
    const win = waveWeekWindow(0, t, "en")
    const windowStart = win.weekStarts[0]!
    const w: Wave = {
      ref: null,
      name: "Onboarding",
      accountName: "Acme",
      appId: null,
      appName: null,
      appLogoUrl: null,
      goal: null,
      // Wide enough to cover both the timeline's own visible window
      // (windowStart) and the sprint's real-today dates below - this test
      // is about the STAGE word, not the segment-clipping arithmetic
      // `buildWaveTimelineRows`'s own suite already pins elsewhere.
      startsOn: windowStart,
      endsOn: addDays(TODAY, 30),
      sprintCount: 1,
      active: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      createdByName: null,
      updatedAt: null,
      editedByName: null,
      id: "w2",
      accountId: "a1",
    }
    const s: Sprint = {
      ref: null,
      refWas: null,
      goal: null,
      goalSummary: null,
      sprintType: "Build",
      accountId: null,
      accountName: null,
      appId: null,
      appName: null,
      waveId: "w2",
      waveName: null,
      // Genuinely active TODAY, not merely inside the visible window - // `waveStage` reads real dates, not the timeline's own axis.
      startsOn: addDays(TODAY, -5),
      endsOn: addDays(TODAY, 5),
      soldPriceCents: 0,
      currency: null,
      completedAt: null,
      active: true,
      storyCount: 0,
      openStoryCount: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      createdByName: null,
      id: "s2",
      name: "Build",
    }
    const rows = buildWaveTimelineRows([w], [s], win, "/waves", "en", [], t)
    expect(rows[0]!.sublabel).toBeDefined()
    const { container } = render(<>{rows[0]!.sublabel}</>)
    expect(container.textContent).toContain("Build")
  })
})
