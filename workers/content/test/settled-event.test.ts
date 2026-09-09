// THE SAME CALL UNDER TWO OF GOOGLE'S OWN IDS.
//
// A recurring occurrence's id is the series id plus the instance's start. When
// the standing call MOVES — the owner's Jourfix went from 10:00 to 10:30 —
// everything Google wrote before the move keeps the old stamp and everything
// after it carries the new one. Both are Google's, both name the same hour of
// the same day, and an equality join matches neither to the other.
//
// Measured on staging, 9 Sep 2026: 142 event ids on live sources matched no
// meeting we hold, and 37 of them were exactly this — the call IS in the base,
// under the other stamp. The strings in the first test are one of those pairs,
// taken off staging unaltered.
//
// THE REJECTED DESIGN IS WHAT THIS SUITE REALLY GUARDS. "Resolve an occurrence
// to the NEAREST occurrence of its series" was proposed first, and the data
// refused it: the median distance to the nearest occurrence we hold is 112
// DAYS, because the calendar sweep fills a series forwards while the knowledge
// base holds artefacts from behind it. Nearest-match would have hung last
// August's minutes on next August's meeting — a wrong answer wearing the shape
// of a right one. So the window is the load-bearing part, and the tests below
// spend most of their effort on what must NOT match.

import { describe, expect, it } from "vitest"

import { settledEvent, type FoldTargets } from "../src/lib/knowledge-google"

/** The owner's Jourfix, as staging holds it. */
const SERIES = "742htcuo14uqtaa8v9f53lq7ef"

const targets = (
  occurrences: [string, { id: string; startsAt: string }[]][] = [],
  events: string[] = []
): FoldTargets => ({
  transcripts: new Set<string>(),
  events: new Set(events),
  occurrences: new Map(occurrences),
})

/** A source row, reduced to the two fields this function reads and writes. */
const row = (eventId: string | null) => ({ eventId, originRowId: "x", title: "t", body: "" }) as never

describe("settledEvent — two of Google's ids for one call", () => {
  it("settles the moved occurrence onto the call we actually hold", () => {
    const t = targets([[SERIES, [{ id: `${SERIES}_20260904T103000Z`, startsAt: "2026-09-04T10:30:00.000Z" }]]])
    const out = settledEvent(row(`${SERIES}_20260904T100000Z`), t)
    expect((out as { eventId: string }).eventId).toBe(`${SERIES}_20260904T103000Z`)
  })

  it("REFUSES a different week of the same series, which is the whole point", () => {
    // 112 days is the real median gap on staging. If this matched, every
    // artefact from a past occurrence would be hung on a meeting next year.
    const t = targets([[SERIES, [{ id: `${SERIES}_20270802T070000Z`, startsAt: "2027-08-02T07:00:00.000Z" }]]])
    const out = settledEvent(row(`${SERIES}_20260831T070000Z`), t)
    expect((out as { eventId: string }).eventId).toBe(`${SERIES}_20260831T070000Z`)
  })

  it("takes the NEAREST inside the window, not the first one it meets", () => {
    const t = targets([
      [
        SERIES,
        [
          { id: "far", startsAt: "2026-09-04T18:00:00.000Z" },
          { id: "near", startsAt: "2026-09-04T10:30:00.000Z" },
        ],
      ],
    ])
    const out = settledEvent(row(`${SERIES}_20260904T100000Z`), t)
    expect((out as { eventId: string }).eventId).toBe("near")
  })

  it("leaves an id that already names a call we hold exactly as it is", () => {
    const exact = `${SERIES}_20260904T100000Z`
    const t = targets([[SERIES, [{ id: "somethingelse", startsAt: "2026-09-04T10:30:00.000Z" }]]], [exact])
    expect((settledEvent(row(exact), t) as { eventId: string }).eventId).toBe(exact)
  })

  it("leaves a one-off event, a null, and a malformed stamp untouched", () => {
    const t = targets([[SERIES, [{ id: "held", startsAt: "2026-09-04T10:30:00.000Z" }]]])
    // No underscore: a one-off id has no series and nothing to be confused with.
    expect((settledEvent(row("plainoneoff"), t) as { eventId: string }).eventId).toBe("plainoneoff")
    expect((settledEvent(row(null), t) as { eventId: string | null }).eventId).toBeNull()
    // The tail is not an occurrence stamp, so it is left exactly as Google gave it.
    expect((settledEvent(row(`${SERIES}_notastamp`), t) as { eventId: string }).eventId).toBe(
      `${SERIES}_notastamp`
    )
  })

  it("does nothing at all when we hold no occurrence of that series", () => {
    const id = `${SERIES}_20260904T100000Z`
    expect((settledEvent(row(id), targets()) as { eventId: string }).eventId).toBe(id)
  })
})
