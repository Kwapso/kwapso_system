// THE PHASE FORM'S END-DATE PREFILL — Aurora's ruling, 21 Sep 2026: once a
// type is chosen and a start date is set, the end date defaults to the start
// plus that wave's own day count for the type, working days only. Pure
// function, tested directly — `shared/working-days.ts`'s own suite already
// pins the arithmetic this reuses, so this file is only about WHICH day
// count wins (the wave's own row, the placeholder default, or neither).

import { describe, expect, it } from "vitest"

import { prefillEndDate } from "@/components/work/sprint-form-dialog"
import type { WavePhaseDay } from "@shared/waves"

describe("prefillEndDate", () => {
  it("no start yet: nothing to prefill", () => {
    expect(prefillEndDate("", "Build", [])).toBeNull()
  })

  it("no type chosen yet: nothing to prefill", () => {
    expect(prefillEndDate("2026-09-21", "", [])).toBeNull()
  })

  it("no wave phase days at all: falls back to PHASE_DAY_DEFAULTS", () => {
    // 2026-09-21 is a Monday; Build's default is 15 working days.
    expect(prefillEndDate("2026-09-21", "Build", undefined)).toBe("2026-10-12")
  })

  it("the wave's own row wins over the placeholder default", () => {
    const rows: WavePhaseDay[] = [{ phaseType: "Build", days: 3 }]
    expect(prefillEndDate("2026-09-21", "Build", rows)).toBe("2026-09-24")
  })

  it("the wave carries rows for other types, but not this one: still falls back to the default", () => {
    const rows: WavePhaseDay[] = [{ phaseType: "Audit", days: 20 }]
    // Pilot's default is 5 working days.
    expect(prefillEndDate("2026-09-21", "Pilot", rows)).toBe("2026-09-28")
  })

  it("a type this app has no day count for at all: nothing to prefill", () => {
    expect(prefillEndDate("2026-09-21", "A team's own custom word", [])).toBeNull()
  })

  it("a weekend start rolls to Monday first, same as the shared helper", () => {
    // 2026-09-20 is a Sunday; Deploy's default is 3 working days.
    expect(prefillEndDate("2026-09-20", "Deploy", undefined)).toBe(prefillEndDate("2026-09-21", "Deploy", undefined))
  })
})
