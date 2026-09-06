import { describe, expect, it } from "vitest"
import {
  workingDaysAgo,
  workingDaysBetween,
  workingHoursBetween,
} from "../../../shared/business-days"

/* THE WEEKEND DOES NOT COUNT.
 *
 * Client, 2026-09-06: "the time counts monday-friday! saturday and sunday do
 * not count towards how long it took! very very important!" — and, asked
 * directly, "ignore public holidays. only mo-fri."
 *
 * These are the cases that were wrong before, written as the client would read
 * them. 2026-09-04 is a Friday; 09-05 Saturday; 09-06 Sunday; 09-07 Monday.
 */
const at = (iso: string) => new Date(iso)

describe("working days", () => {
  it("stops the clock at Friday midnight and restarts it on Monday", () => {
    // Raised Friday teatime, read first thing Monday: 8 working hours on the
    // Friday plus 9 on the Monday. The calendar said three days.
    expect(workingDaysBetween(at("2026-09-04T16:00Z"), at("2026-09-07T09:00Z"))).toBe(0)
    expect(workingHoursBetween(at("2026-09-04T16:00Z"), at("2026-09-07T09:00Z"))).toBe(17)
  })

  it("does not age a ticket over a weekend it slept through", () => {
    // Friday 10:00 to Monday 10:00 is exactly one working day, not three.
    expect(workingDaysBetween(at("2026-09-04T10:00Z"), at("2026-09-07T10:00Z"))).toBe(1)
  })

  it("counts a full week as five, not seven", () => {
    expect(workingDaysBetween(at("2026-09-04T10:00Z"), at("2026-09-11T10:00Z"))).toBe(5)
  })

  it("is zero for a span that lies entirely inside a weekend", () => {
    expect(workingDaysBetween(at("2026-09-05T01:00Z"), at("2026-09-06T23:00Z"))).toBe(0)
  })

  it("drops the weekend out of a span that crosses one", () => {
    // Raised Wednesday midnight, looked at on Sunday midnight. The calendar
    // said 4; the working clock ran Wed, Thu and Fri and stopped — 3.
    expect(workingDaysBetween(at("2026-09-02T00:00Z"), at("2026-09-06T00:00Z"))).toBe(3)
  })

  it("never returns a negative age when the clocks disagree", () => {
    expect(workingDaysBetween(at("2026-09-07T10:00Z"), at("2026-09-04T10:00Z"))).toBe(0)
  })

  it("takes a string as readily as a Date, since rows carry ISO text", () => {
    expect(workingDaysBetween("2026-09-04T10:00Z", "2026-09-11T10:00Z")).toBe(5)
  })

  describe("the cutoff a query compares against", () => {
    it("walks back over the weekend, landing at the same clock time", () => {
      // Three working days before Monday 09:00 is the previous WEDNESDAY 09:00
      // — not Friday, which the calendar arithmetic gave.
      expect(workingDaysAgo(at("2026-09-07T09:00Z"), 3).toISOString()).toBe(
        "2026-09-02T09:00:00.000Z"
      )
    })

    it("is the exact inverse of the count, so SQL and JS agree", () => {
      for (const days of [1, 3, 5, 10]) {
        const now = at("2026-09-07T09:00Z")
        expect(workingDaysBetween(workingDaysAgo(now, days), now)).toBe(days)
      }
    })

    it("returns the instant itself for zero or nonsense", () => {
      const now = at("2026-09-07T09:00Z")
      expect(workingDaysAgo(now, 0).getTime()).toBe(now.getTime())
      expect(workingDaysAgo(now, -2).getTime()).toBe(now.getTime())
    })
  })
})
