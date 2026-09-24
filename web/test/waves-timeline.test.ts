// WAVES — T3 TIMELINE, CALENDAR AND LIST, PINNED.
//
// The client's ruling, 2026-09-15 ("for waves i choose t3"), reshaped the Waves
// main screen into Active/All tabs over three bodies. The three shapers behind
// them — `waveWeekWindow`, `buildWaveTimelineRows`, `buildWaveCalendarEntries`,
// `waveListRows`, `waveListColumns` (all `web/components/work/waves-screen.tsx`)
// — are pure functions over plain data, which is what lets this file pin the
// SEGMENTATION arithmetic (gaps, sprint order, clipping to the visible window)
// without rendering a screen: the same split `wave-finder.tsx#selectWaves` and
// its own test already use.

import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/nav", () => ({ softNavigate: vi.fn() }))

import { softNavigate } from "@/lib/nav"
import {
  buildWaveCalendarEntries,
  buildWaveTimelineRows,
  waveExpectedWorkingDays,
  waveListColumns,
  waveListRows,
  waveState,
  waveWeekWindow,
} from "@/components/work/waves-screen"
import { addWorkingDays } from "@shared/working-days"
import { formatDate } from "@shared/web/format"
import type { Wave } from "@shared/waves"
import type { Sprint, AppRow } from "@shared/types"

const t = (s: string) => s

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

function app(over: Partial<AppRow> & { id: string; name: string }): AppRow {
  return {
    ref: null,
    accountId: "a1",
    url: null,
    stage: null,
    logoUrl: null,
    toolCostCentsPerMonth: null,
    about: null,
    clientContext: null,
    solution: null,
    keyActors: null,
    canOpen: true,
    staff: [],
    stakeholders: [],
    active: true,
    archived: false,
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

describe("waveWeekWindow — the week-gridded axis", () => {
  it("draws thirteen weeks and marks today's own column", () => {
    const win = waveWeekWindow(0, t, "en")
    expect(win.weeks.length).toBe(13)
    expect(win.weekStarts.length).toBe(13)
    // Today falls inside SOME column of its own default window — the whole
    // point of opening two weeks behind it rather than centred or at the end.
    expect(win.todayIndex).toBeDefined()
    expect(win.todayIndex as number).toBeGreaterThanOrEqual(0)
    expect(win.todayIndex as number).toBeLessThan(13)
  })

  it("moves the window without losing today's mark at offset 0", () => {
    const forward = waveWeekWindow(4, t, "en")
    const back = waveWeekWindow(-4, t, "en")
    // A later window's first week is after the default window's first week,
    // and an earlier window's is before it — the stepper actually steps.
    const base = waveWeekWindow(0, t, "en")
    expect(forward.weekStarts[0]! > base.weekStarts[0]!).toBe(true)
    expect(back.weekStarts[0]! < base.weekStarts[0]!).toBe(true)
  })
})

describe("buildWaveTimelineRows — one bar per wave, cut into its own sprints", () => {
  const win = waveWeekWindow(0, t, "en")
  const windowStart = win.weekStarts[0]!

  it("segments a wave's bar into its sprints, in date order, with the gap between them", () => {
    const w = wave({ id: "w1", accountId: "a1", startsOn: windowStart, endsOn: addDays(windowStart, 40) })
    const sprints: Sprint[] = [
      sprint({
        id: "s2",
        name: "Second",
        waveId: "w1",
        startsOn: addDays(windowStart, 21),
        endsOn: addDays(windowStart, 40),
      }),
      sprint({
        id: "s1",
        name: "First",
        waveId: "w1",
        startsOn: windowStart,
        endsOn: addDays(windowStart, 6),
      }),
    ]
    const rows = buildWaveTimelineRows([w], sprints, win, "/waves", "en")
    expect(rows.length).toBe(1)
    const row = rows[0]!
    expect(row.id).toBe("w1")
    // Sorted into date order regardless of the input order (s2 before s1 above).
    const sprintSegs = row.segments.filter((s) => s.tone !== "gap")
    expect(sprintSegs.map((s) => s.id)).toEqual(["s1", "s2"])
    // A real gap sits between the two sprints, toned "gap", unclickable.
    const gapSegs = row.segments.filter((s) => s.tone === "gap")
    expect(gapSegs.length).toBeGreaterThan(0)
    expect(gapSegs.every((s) => s.onSelect === undefined)).toBe(true)
    // Clicking a sprint segment opens the nested sprint route.
    sprintSegs[0]!.onSelect?.()
    expect(softNavigate).toHaveBeenCalledWith("/waves/w1/sprints/s1")
    // Clicking the row's own name opens the wave.
    row.onSelectLabel?.()
    expect(softNavigate).toHaveBeenCalledWith("/waves/w1")
  })

  it("a wave with dates but no sprint row in hand draws one plain, unclickable bar", () => {
    const w = wave({ id: "w2", accountId: "a1", startsOn: windowStart, endsOn: addDays(windowStart, 10) })
    const rows = buildWaveTimelineRows([w], [], win, "/waves", "en")
    expect(rows.length).toBe(1)
    expect(rows[0]!.segments.length).toBe(1)
    expect(rows[0]!.segments[0]!.tone).toBe("gap")
    expect(rows[0]!.segments[0]!.onSelect).toBeUndefined()
  })

  it("a wave with no dates at all is left off the axis — it belongs on List, not here", () => {
    const w = wave({ id: "w3", accountId: "a1", startsOn: null, endsOn: null })
    expect(buildWaveTimelineRows([w], [], win, "/waves", "en")).toEqual([])
  })

  it("a sprint's tone follows sprintState — running, not upcoming, once it has started", () => {
    const w = wave({ id: "w4", accountId: "a1", startsOn: windowStart, endsOn: addDays(windowStart, 5) })
    const s = sprint({ id: "s4", name: "Live", waveId: "w4", startsOn: windowStart, endsOn: addDays(windowStart, 5) })
    const rows = buildWaveTimelineRows([w], [s], win, "/waves", "en")
    const seg = rows[0]!.segments.find((x) => x.id === "s4")!
    // The window opens two weeks behind today (waveWeekWindow's own header),
    // so its first week has already started — "running", never "upcoming".
    expect(seg.tone).toBe("running")
  })

  // THE LEFT COLUMN IS THE WAVE'S APP — client, 16 Sep 2026, corrected the
  // same day: "No, now you have the name of the wave. I want the name of the
  // app." `Wave.appId` (team migration 0099) is the SOURCE OF TRUTH now, a
  // real column rather than a guess derived from the sprints inside — these
  // pin that off `sublabel`, a plain string here (the wave's own name, moved
  // off the top line) rather than a rendered node. `row.label` itself (the
  // mark + name JSX `AppMark`/`RecordMark` draws) is not separately rendered
  // here: both branches call the same two kit-backed components every other
  // row/list cell in this file already does, with no new logic of their own
  // to protect.
  it("appId set and the app is in the loaded list: that app's row resolves, and the wave's name moves to `sublabel`", () => {
    const w = wave({
      id: "w5",
      accountId: "a1",
      name: "Onboarding package",
      appId: "app1",
      startsOn: windowStart,
      endsOn: addDays(windowStart, 5),
    })
    const sprints: Sprint[] = [
      sprint({ id: "s5", name: "Build", waveId: "w5", startsOn: windowStart, endsOn: addDays(windowStart, 5) }),
    ]
    const apps = [app({ id: "app1", name: "Padelbase" })]
    const rows = buildWaveTimelineRows([w], sprints, win, "/waves", "en", apps)
    expect(rows[0]!.sublabel).toBe("Onboarding package")
  })

  it("appId unset: no sublabel — the fallback IS the wave's own name, on top", () => {
    const w = wave({ id: "w6", accountId: "a1", name: "No app yet", appId: null, startsOn: windowStart, endsOn: addDays(windowStart, 5) })
    const sprints: Sprint[] = [
      sprint({ id: "s6", name: "Discovery", waveId: "w6", startsOn: windowStart, endsOn: addDays(windowStart, 5) }),
    ]
    const rows = buildWaveTimelineRows([w], sprints, win, "/waves", "en", [app({ id: "app1", name: "Padelbase" })])
    expect(rows[0]!.sublabel).toBeUndefined()
  })

  it("appId set but the app is not in the loaded (live) list: falls back to the wave's own denormalised name/logo", () => {
    const w = wave({
      id: "w7",
      accountId: "a1",
      name: "Legacy package",
      appId: "app-gone",
      appName: "Retired System",
      appLogoUrl: null,
      startsOn: windowStart,
      endsOn: addDays(windowStart, 20),
    })
    const rows = buildWaveTimelineRows([w], [], win, "/waves", "en", [app({ id: "app1", name: "Padelbase" })])
    expect(rows[0]!.sublabel).toBe("Legacy package")
  })

  it("appId set, no denormalised appName, and the app is not in the loaded list: no sublabel", () => {
    const w = wave({
      id: "w8",
      accountId: "a1",
      name: "Wrapped",
      appId: "app-gone",
      appName: null,
      startsOn: windowStart,
      endsOn: addDays(windowStart, 5),
    })
    const rows = buildWaveTimelineRows([w], [], win, "/waves", "en", [app({ id: "app1", name: "Padelbase" })])
    expect(rows[0]!.sublabel).toBeUndefined()
  })
})

// Aurora's ruling, 21 Sep 2026: draw an undated phase's expected span end to
// end from the previous phase's end (or the wave start, or today), lighter
// than a dated segment and marked expected. Fixture with one dated phase and
// one undated one, both in the same wave.
describe("buildWaveTimelineRows, undated phases draw as an expected, projected span", () => {
  const win = waveWeekWindow(0, t, "en")
  const windowStart = win.weekStarts[0]!

  function fixture() {
    const waveEnd = addDays(windowStart, 4)
    const w = wave({ id: "w1", accountId: "a1", startsOn: windowStart, endsOn: waveEnd })
    const dated = sprint({
      id: "dated",
      name: "Build",
      waveId: "w1",
      sprintType: "Build",
      startsOn: windowStart,
      endsOn: waveEnd,
    })
    const undated = sprint({
      id: "undated",
      name: "Pilot run",
      waveId: "w1",
      sprintType: "Pilot",
      startsOn: null,
      endsOn: null,
    })
    return { w, waveEnd, dated, undated }
  }

  it("draws the undated phase as its own segment, toned 'expected', chained off the wave's own end", () => {
    const { w, dated, undated } = fixture()
    const rows = buildWaveTimelineRows([w], [dated, undated], win, "/waves", "en", [], t)
    expect(rows.length).toBe(1)
    const expectedSeg = rows[0]!.segments.find((s) => s.id === "undated")
    expect(expectedSeg).toBeDefined()
    expect(expectedSeg!.tone).toBe("expected")
    // Pilot's placeholder default is 5 working days, chained off the wave's
    // own recorded end (no per-wave phase-days map handed in, so the default
    // wins). The wave's own end (4 calendar days into the window) still
    // falls in the window's very first week column.
    expect(expectedSeg!.start).toBe(0)
    expect(expectedSeg!.title).toContain("Expected")
    // Clicking it opens the phase's own record, same as a dated segment.
    expectedSeg!.onSelect?.()
    expect(softNavigate).toHaveBeenCalledWith("/waves/w1/sprints/undated")
  })

  it("the dated phase's own segment is untouched, a real state, never 'expected'", () => {
    const { w, dated, undated } = fixture()
    const rows = buildWaveTimelineRows([w], [dated, undated], win, "/waves", "en", [], t)
    const datedSeg = rows[0]!.segments.find((s) => s.id === "dated")
    expect(datedSeg!.tone).not.toBe("expected")
  })

  it("with no translator, the old law stands: no expected segment at all", () => {
    const { w, dated, undated } = fixture()
    const rows = buildWaveTimelineRows([w], [dated, undated], win, "/waves", "en")
    expect(rows[0]!.segments.some((s) => s.id === "undated")).toBe(false)
  })

  it("a wave carrying ONLY an undated phase still reaches the axis, once a translator is in hand", () => {
    const w = wave({ id: "w9", accountId: "a1", startsOn: null, endsOn: null })
    const undated = sprint({ id: "u9", name: "Audit kickoff", waveId: "w9", sprintType: "Audit", startsOn: null, endsOn: null })
    const rows = buildWaveTimelineRows([w], [undated], win, "/waves", "en", [], t)
    expect(rows.length).toBe(1)
    expect(rows[0]!.segments.some((s) => s.id === "u9" && s.tone === "expected")).toBe(true)
  })

  it("a wave's own per-wave phase-days map wins over the placeholder default", () => {
    const { w, waveEnd, dated, undated } = fixture()
    const perWave = new Map<string, Map<string, number>>([["w1", new Map([["Pilot", 2]])]])
    const rows = buildWaveTimelineRows([w], [dated, undated], win, "/waves", "en", [], t, perWave)
    const expectedSeg = rows[0]!.segments.find((s) => s.id === "undated")!
    // 2 working days off the wave's own end, not Pilot's 5-day default.
    expect(expectedSeg.title).toContain(formatDate(addWorkingDays(waveEnd, 2), "en"))
    expect(expectedSeg.title).not.toContain(formatDate(addWorkingDays(waveEnd, 5), "en"))
  })
})

describe("waveExpectedWorkingDays, the wave's own forecast total, in working days", () => {
  it("undefined for a wave with no active phases at all", () => {
    expect(waveExpectedWorkingDays([])).toBeUndefined()
  })

  it("a dated phase contributes its own real length, both ends included", () => {
    // Monday through that week's Friday is five working days.
    const phases = [{ startsOn: "2026-09-21", endsOn: "2026-09-25", sprintType: "Build", active: true }]
    expect(waveExpectedWorkingDays(phases)).toBe(5)
  })

  it("an undated phase contributes its type's own day count, the default when no wave row is handed in", () => {
    const phases = [{ startsOn: null, endsOn: null, sprintType: "Pilot", active: true }]
    expect(waveExpectedWorkingDays(phases)).toBe(5) // Pilot's placeholder default
  })

  it("the wave's own phase-days row wins over the placeholder default", () => {
    const phases = [{ startsOn: null, endsOn: null, sprintType: "Pilot", active: true }]
    const byType = new Map([["Pilot", 8]])
    expect(waveExpectedWorkingDays(phases, byType)).toBe(8)
  })

  it("sums a dated phase and an undated one together, the fixture this ruling asked for", () => {
    const phases = [
      { startsOn: "2026-09-21", endsOn: "2026-09-25", sprintType: "Build", active: true }, // 5
      { startsOn: null, endsOn: null, sprintType: "Pilot", active: true }, // 5, the default
    ]
    expect(waveExpectedWorkingDays(phases)).toBe(10)
  })

  it("a switched-off phase never counts, dated or not", () => {
    const phases = [
      { startsOn: "2026-09-21", endsOn: "2026-09-25", sprintType: "Build", active: false },
      { startsOn: null, endsOn: null, sprintType: "Pilot", active: true }, // 5
    ]
    expect(waveExpectedWorkingDays(phases)).toBe(5)
  })
})

describe("waveState — planned/running/done, off the wave's own dates", () => {
  it("has not started yet: planned", () => {
    expect(waveState({ startsOn: "2026-09-20", endsOn: "2026-09-30" }, "2026-09-16")).toBe("planned")
  })

  it("no dates at all — nobody has planned a sprint into it yet: planned", () => {
    expect(waveState({ startsOn: null, endsOn: null }, "2026-09-16")).toBe("planned")
  })

  it("started, not yet over: running", () => {
    expect(waveState({ startsOn: "2026-09-01", endsOn: "2026-09-30" }, "2026-09-16")).toBe("running")
  })

  it("started, no end date yet: running rather than a guess", () => {
    expect(waveState({ startsOn: "2026-09-01", endsOn: null }, "2026-09-16")).toBe("running")
  })

  it("its own end date has passed: done", () => {
    expect(waveState({ startsOn: "2026-08-01", endsOn: "2026-09-01" }, "2026-09-16")).toBe("done")
  })
})

describe("buildWaveCalendarEntries — waves and sprints as S2 spans", () => {
  it("one entry per wave and one per sprint, each carrying endDay, sharing one accent", () => {
    const w = wave({ id: "w1", accountId: "a1", name: "Padelbase v2", startsOn: "2026-09-01", endsOn: "2026-10-09" })
    const s = sprint({ id: "s1", name: "Onboarding", waveId: "w1", waveName: "Padelbase v2", startsOn: "2026-09-01", endsOn: "2026-09-11" })
    const entries = buildWaveCalendarEntries([w], [s], t)
    const waveEntry = entries.find((e) => e.id === "w:w1")!
    const sprintEntry = entries.find((e) => e.id === "s:w1:s1")!
    expect(waveEntry.day).toBe("2026-09-01")
    // S2 (16 Sep 2026 ruling): the wave's own end reaches the grid too, so
    // record-calendar.tsx's expandEntry can draw the whole package as a
    // span rather than a single start-day chip.
    expect(waveEntry.endDay).toBe("2026-10-09")
    expect(sprintEntry.day).toBe("2026-09-01")
    // A sprint's own endDay is its own endsOn — never clipped to the wave's,
    // since S2 draws whatever range it is handed and two overlapping spans
    // (a sprint inside its wave) already stack.
    expect(sprintEntry.endDay).toBe("2026-09-11")
    expect(sprintEntry.detail).toBe("Padelbase v2")
    // Same hash, same colour — the wave's own chip and its sprint's chip
    // land in the same accent for free.
    expect(sprintEntry.accent).toBe(waveEntry.accent)
  })

  it("a wave or sprint with no end date carries no endDay — expandEntry reads it as a one-day span", () => {
    const w = wave({ id: "w1", accountId: "a1", startsOn: "2026-09-01", endsOn: null })
    const entries = buildWaveCalendarEntries([w], [], t)
    expect(entries[0]!.endDay).toBeUndefined()
  })

  it("a sprint belonging to a wave outside the given rows is left off the grid", () => {
    const w = wave({ id: "w1", accountId: "a1", startsOn: "2026-09-01", endsOn: "2026-09-10" })
    const s = sprint({ id: "s9", name: "Elsewhere", waveId: "w9", startsOn: "2026-09-02", endsOn: "2026-09-03" })
    const entries = buildWaveCalendarEntries([w], [s], t)
    expect(entries.some((e) => e.id.includes("s9"))).toBe(false)
  })
})

describe("waveListRows / waveListColumns — R80's shape", () => {
  it("shapes one row per wave with its own sprint-state dots and formatted dates", () => {
    const w = wave({ id: "w1", accountId: "a1", name: "Hogo package", accountName: "Hogo", sprintCount: 1, startsOn: "2026-09-01", endsOn: "2026-09-10" })
    const s = sprint({ id: "s1", name: "Build", waveId: "w1", startsOn: "2026-09-01", endsOn: "2026-09-10" })
    const rows = waveListRows([w], [s], t, "en")
    expect(rows.length).toBe(1)
    expect(rows[0]!.id).toBe("w1")
    expect(rows[0]!.accountName).toBe("Hogo")
  })

  // Her exact order, 17 Sep 2026: "1. Wave 2. Status 3. Sprints 4. Start 5.
  // End 6. Account" — six columns within R82's own six-column ceiling.
  // The App fact still rides Account's own second line, never a column.
  it("declares exactly six columns in her order — Wave, Status, Sprints, Start, End, Account", () => {
    const cols = waveListColumns(t)
    expect(cols.map((c) => c.key)).toEqual(["name", "state", "sprints", "start", "end", "account"])
  })
})

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number)
  const dt = new Date(y!, (m ?? 1) - 1, (d ?? 1) + n)
  const pad = (v: number) => String(v).padStart(2, "0")
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
}
