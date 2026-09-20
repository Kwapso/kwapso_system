// WORKING DAYS, THE ONE SHARED HELPER. Aurora's ruling, 21 Sep 2026, verbatim:
// "mind you, all of this is Monday to Friday, so when I say 5, it's actually
// a full week, but I, of course, don't count the weekends." Fixed dates, not
// `new Date()`, so this pins the arithmetic rather than today's own calendar.

import { describe, expect, it } from "vitest"

import { addWorkingDays, isWorkingDay, workingDaySpan, workingDaysBetween } from "@shared/working-days"

describe("isWorkingDay", () => {
  it("Monday through Friday are working days", () => {
    expect(isWorkingDay("2026-09-21")).toBe(true) // Monday
    expect(isWorkingDay("2026-09-22")).toBe(true) // Tuesday
    expect(isWorkingDay("2026-09-25")).toBe(true) // Friday
  })

  it("Saturday and Sunday are not", () => {
    expect(isWorkingDay("2026-09-26")).toBe(false) // Saturday
    expect(isWorkingDay("2026-09-27")).toBe(false) // Sunday
  })
})

describe("addWorkingDays - n working days after start, Monday to Friday", () => {
  it("a weekday start plus 5 lands one calendar week later, the following Monday", () => {
    // 2026-09-21 is a Monday.
    expect(addWorkingDays("2026-09-21", 5)).toBe("2026-09-28")
  })

  it("steps over a weekend sitting inside the count", () => {
    // Thursday + 3 working days: Fri, (Sat, Sun skipped), Mon, Tue.
    expect(addWorkingDays("2026-01-29", 3)).toBe("2026-02-03")
  })

  it("steps over a weekend that falls right at a month end", () => {
    // Friday 2026-01-30 + 1 working day skips Sat 31 / Sun 1, lands Monday.
    expect(addWorkingDays("2026-01-30", 1)).toBe("2026-02-02")
  })

  it("a Saturday start rolls forward to Monday first, then counts", () => {
    // 2026-01-31 is a Saturday; rolled to Monday 2026-02-02, then +1 working
    // day lands Tuesday.
    expect(addWorkingDays("2026-01-31", 1)).toBe("2026-02-03")
  })

  it("a Sunday start rolls forward to Monday first, then counts", () => {
    expect(addWorkingDays("2026-02-01", 1)).toBe("2026-02-03")
  })

  it("n of 0 on a weekday returns the same date, unchanged", () => {
    expect(addWorkingDays("2026-02-02", 0)).toBe("2026-02-02")
  })

  it("n of 0 on a weekend rolls to Monday and stops there", () => {
    expect(addWorkingDays("2026-01-31", 0)).toBe("2026-02-02")
  })
})

describe("workingDaysBetween - how many working days sit between two dates", () => {
  it("matches addWorkingDays going forward, from a weekday start", () => {
    expect(workingDaysBetween("2026-01-29", "2026-02-03")).toBe(3)
  })

  it("a weekend between the two dates is not counted", () => {
    expect(workingDaysBetween("2026-01-30", "2026-02-02")).toBe(1)
  })

  it("is negative when end comes before start", () => {
    expect(workingDaysBetween("2026-02-03", "2026-01-29")).toBe(-3)
  })

  it("is zero for the same day", () => {
    expect(workingDaysBetween("2026-01-29", "2026-01-29")).toBe(0)
  })
})

describe("workingDaySpan - a dated span's own length, both ends included", () => {
  it("Monday through that week's Friday is five, not four", () => {
    expect(workingDaySpan("2026-09-21", "2026-09-25")).toBe(5)
  })

  it("a span crossing a weekend does not count it", () => {
    // Friday through the following Monday: Friday and Monday, two days.
    expect(workingDaySpan("2026-01-30", "2026-02-02")).toBe(2)
  })

  it("start and end the same working day: one", () => {
    expect(workingDaySpan("2026-09-21", "2026-09-21")).toBe(1)
  })

  it("start and end the same weekend day: zero", () => {
    expect(workingDaySpan("2026-01-31", "2026-01-31")).toBe(0)
  })

  it("never negative, even when end precedes start", () => {
    expect(workingDaySpan("2026-09-25", "2026-09-21")).toBe(0)
  })
})
