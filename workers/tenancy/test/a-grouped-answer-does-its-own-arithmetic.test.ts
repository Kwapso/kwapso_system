// THE DENOMINATOR IS THE ANSWER'S, NOT THE MODEL'S.
//
// Asked "average open tickets per account and per app" three times on 14 Sep
// 2026, on the same 433 tickets, the assistant answered 22.8, 21.7 and 18 per
// app. The groups were identical every time. What moved was the division the
// model did in its head: whether the bucket with no app counted as a group,
// and whether it divided the whole total or only the rows that had one. A
// number that changes between runs on unchanged data is not an answer.
//
// So a grouped count now carries the arithmetic beside the groups, computed
// once and the same way every time — and this pins the way: a group whose key
// is empty is not a group, its rows are `unassigned`, the average is rows per
// group with a value, to one decimal, and a tally cut at the cap gets no
// summary at all rather than a wrong one wearing an honest label.
import { describe, expect, it } from "vitest"
import { summariseGroups } from "../src/lib/query-engine"

describe("a grouped answer does its own arithmetic", () => {
  it("rows with no value for the key are unassigned, never a group, never in the average", () => {
    const s = summariseGroups([
      { key: { appId: null }, count: 110, label: null },
      { key: { appId: "a1" }, count: 52, label: "FluClinic" },
      { key: { appId: "a2" }, count: 47, label: "HORST" },
      { key: { appId: "a3" }, count: 34, label: "Padelbase" },
    ])
    expect(s).toEqual({ groups: 3, rows: 133, average: 44.3, unassigned: 110 })
  })

  it("an empty string is as empty as null — a two-field key needs both halves", () => {
    const s = summariseGroups([
      { key: { accountId: "x", month: "" }, count: 5 },
      { key: { accountId: "x", month: "2026-08" }, count: 4 },
    ])
    expect(s).toEqual({ groups: 1, rows: 4, average: 4, unassigned: 5 })
  })

  it("no groups with a value means no average, not a division by zero", () => {
    expect(summariseGroups([{ key: { appId: null }, count: 9 }])).toEqual({ groups: 0, rows: 0, average: null, unassigned: 9 })
    expect(summariseGroups([])).toEqual({ groups: 0, rows: 0, average: null, unassigned: 0 })
  })
})
