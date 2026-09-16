// RECORD-CALENDAR — S2 "start-and-end caps", client ruling 16 Sep 2026.
//
// `expandEntry` is the one place a `CalendarEntry` with an `endDay` becomes
// the per-day placements the kit's `CalendarView` draws as a span: a chip on
// the first and last day, a thin ghost line on every day between. Pinned
// here as a pure function over plain data, the same reason
// `waves-timeline.test.ts` pins `buildWaveCalendarEntries` without rendering
// a screen.

import { describe, expect, it } from "vitest"

import { expandEntry, type CalendarEntry } from "@/components/records/record-calendar"

function entry(over: Partial<CalendarEntry> & { id: string; day: string; title: string }): CalendarEntry {
  return { ...over }
}

describe("expandEntry — one placement per day of a record's own span", () => {
  it("no endDay — a single 'only' placement, on the record's own day", () => {
    const e = entry({ id: "r1", day: "2026-09-05", title: "Standup" })
    expect(expandEntry(e)).toEqual([{ day: "2026-09-05", entry: e, position: "only" }])
  })

  it("endDay equal to day — still 'only', never a one-item span", () => {
    const e = entry({ id: "r1", day: "2026-09-05", title: "Standup", endDay: "2026-09-05" })
    expect(expandEntry(e)).toEqual([{ day: "2026-09-05", entry: e, position: "only" }])
  })

  it("a two-day span — start and end, nothing in between", () => {
    const e = entry({ id: "r1", day: "2026-09-05", title: "Sprint", endDay: "2026-09-06" })
    expect(expandEntry(e)).toEqual([
      { day: "2026-09-05", entry: e, position: "start" },
      { day: "2026-09-06", entry: e, position: "end" },
    ])
  })

  it("a twelve-day span — one start, ten middles, one end, every day walked", () => {
    const e = entry({ id: "r1", day: "2026-09-01", title: "Sprint", endDay: "2026-09-12" })
    const placements = expandEntry(e)
    expect(placements).toHaveLength(12)
    expect(placements[0]).toEqual({ day: "2026-09-01", entry: e, position: "start" })
    expect(placements[11]).toEqual({ day: "2026-09-12", entry: e, position: "end" })
    expect(placements.slice(1, 11).every((p) => p.position === "middle")).toBe(true)
    // Every LOCAL day in order, no gaps and no duplicates.
    expect(placements.map((p) => p.day)).toEqual([
      "2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-05", "2026-09-06",
      "2026-09-07", "2026-09-08", "2026-09-09", "2026-09-10", "2026-09-11", "2026-09-12",
    ])
  })

  it("crosses a month boundary — the walk is calendar days, not calendar weeks", () => {
    const e = entry({ id: "r1", day: "2026-09-29", title: "Sprint", endDay: "2026-10-02" })
    const placements = expandEntry(e)
    expect(placements.map((p) => p.day)).toEqual(["2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"])
    expect(placements.map((p) => p.position)).toEqual(["start", "middle", "middle", "end"])
  })

  it("a backwards range (endDay before day) is refused, not walked or reversed", () => {
    const e = entry({ id: "r1", day: "2026-09-10", title: "Bad data", endDay: "2026-09-01" })
    expect(expandEntry(e)).toEqual([{ day: "2026-09-10", entry: e, position: "only" }])
  })

  it("a malformed endDay is refused the same way", () => {
    const e = entry({ id: "r1", day: "2026-09-10", title: "Bad data", endDay: "not-a-date" })
    expect(expandEntry(e)).toEqual([{ day: "2026-09-10", entry: e, position: "only" }])
  })

  it("an absurdly long span is capped rather than walked forever", () => {
    const e = entry({ id: "r1", day: "2020-01-01", title: "Runaway", endDay: "2030-01-01" })
    const placements = expandEntry(e)
    expect(placements.length).toBeLessThanOrEqual(366)
    expect(placements[0]!.position).toBe("start")
    expect(placements.at(-1)!.position).toBe("end")
  })
})
