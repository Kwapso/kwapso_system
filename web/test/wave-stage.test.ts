// A WAVE'S OWN STAGE - Aurora's ruling, 21 Sep 2026, verbatim: "stage wave:
// read the active pahse that sit." `shared/wave-stage.ts`'s own `waveStage`
// answers which of a wave's phases the stage reads off, in the four cases
// she named: the phase active today, the earliest upcoming one, every phase
// completed, or no phases at all.

import { describe, expect, it } from "vitest"

import { phaseState, waveStage, type PhaseWindow } from "@shared/wave-stage"

const TODAY = "2026-09-21"

function phase(over: Partial<PhaseWindow> = {}): PhaseWindow {
  return { startsOn: null, endsOn: null, ...over }
}

describe("phaseState - one phase's own three-way state, off its dates alone", () => {
  it("neither date set: upcoming (not yet scheduled)", () => {
    expect(phaseState(phase(), TODAY)).toBe("upcoming")
  })

  it("started, ends in the future: active", () => {
    expect(phaseState(phase({ startsOn: "2026-09-01", endsOn: "2026-09-30" }), TODAY)).toBe("active")
  })

  it("started, no end date yet: active - read as still running, never a guess", () => {
    expect(phaseState(phase({ startsOn: "2026-09-01", endsOn: null }), TODAY)).toBe("active")
  })

  it("starts in the future: upcoming", () => {
    expect(phaseState(phase({ startsOn: "2026-10-01", endsOn: "2026-10-15" }), TODAY)).toBe("upcoming")
  })

  it("ended in the past: completed, regardless of when it started", () => {
    expect(phaseState(phase({ startsOn: "2026-08-01", endsOn: "2026-08-15" }), TODAY)).toBe("completed")
  })

  it("today is exactly the start day: active", () => {
    expect(phaseState(phase({ startsOn: TODAY, endsOn: "2026-09-30" }), TODAY)).toBe("active")
  })

  it("today is exactly the end day: active, not yet completed", () => {
    expect(phaseState(phase({ startsOn: "2026-09-01", endsOn: TODAY }), TODAY)).toBe("active")
  })
})

describe("waveStage - the four cases, in Aurora's own order", () => {
  it("no phases at all: none", () => {
    expect(waveStage([], TODAY)).toEqual({ kind: "none" })
  })

  it("one phase's dates contain today: active, and it names that phase", () => {
    const build = phase({ startsOn: "2026-09-10", endsOn: "2026-09-25" })
    const result = waveStage([build], TODAY)
    expect(result.kind).toBe("active")
    expect(result.kind === "active" && result.phase).toBe(build)
  })

  it("none active: the EARLIEST upcoming phase, by input order", () => {
    const later = phase({ startsOn: "2026-11-01", endsOn: "2026-11-10" })
    const sooner = phase({ startsOn: "2026-10-01", endsOn: "2026-10-10" })
    // Phases arrive pre-ordered chronologically (the door's own ORDER BY);
    // this pins that the helper trusts that order rather than re-sorting.
    const result = waveStage([sooner, later], TODAY)
    expect(result.kind).toBe("upcoming")
    expect(result.kind === "upcoming" && result.phase).toBe(sooner)
  })

  it("every phase has ended: complete", () => {
    const a = phase({ startsOn: "2026-06-01", endsOn: "2026-06-10" })
    const b = phase({ startsOn: "2026-07-01", endsOn: "2026-07-15" })
    expect(waveStage([a, b], TODAY)).toEqual({ kind: "complete" })
  })

  it("a mix of completed and active phases: the active one wins", () => {
    const done = phase({ startsOn: "2026-06-01", endsOn: "2026-06-10" })
    const running = phase({ startsOn: "2026-09-01", endsOn: "2026-09-30" })
    const result = waveStage([done, running], TODAY)
    expect(result.kind).toBe("active")
    expect(result.kind === "active" && result.phase).toBe(running)
  })

  it("a mix of completed and upcoming phases, none active: the upcoming one", () => {
    const done = phase({ startsOn: "2026-06-01", endsOn: "2026-06-10" })
    const next = phase({ startsOn: "2026-10-01", endsOn: "2026-10-10" })
    const result = waveStage([done, next], TODAY)
    expect(result.kind).toBe("upcoming")
    expect(result.kind === "upcoming" && result.phase).toBe(next)
  })
})
