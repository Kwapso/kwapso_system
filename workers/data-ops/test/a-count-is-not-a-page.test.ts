// A COUNT IS NOT A PAGE, AND NEITHER IS A GROUPBY.
//
// `pagingGuard` exists for a real failure (30 Aug 2026): the owner asked about
// one meeting and the model called `list_meetings` twelve times, a different
// page or filter each time, until MAX_STEPS ran out — twelve assistant credits
// and no answer. It counted calls per tool NAME, which was right while every
// module had its own list tool.
//
// `query_records` is not that. It is the ONE read door for every module, so
// "the same tool" stopped meaning "the same question" and the guard began
// firing on somebody asking DIFFERENT ones.
//
// MEASURED ON STAGING, 13 Sep 2026. The owner asked "how many total open
// tickets (to be triaged) are there? and avg per account and per app? and how
// many more than 1 week old?" — four genuinely different questions, correctly
// four calls. The fifth tripped the limit and from then on EVERY call came back
// as the nudge. The model read it, agreed out loud ("I'm being throttled on
// repeated calls, let me run one clean query at a time"), tried again, was
// nudged again — eleven times, until MAX_STEPS ended the turn with nothing. The
// nudge hands back `ok: true`, so no failure counter ever saw it and nothing
// stopped it. A livelock.
//
// AND THE ADVICE WAS UNFOLLOWABLE. The nudge recommends `total` and `groupBy`
// as the cheaper route — and two of the calls it refused WERE groupBy calls. It
// told him to do the thing it had just stopped him doing.
//
// So a call that reads no rows is not counted and never nudged. A ROW READ
// still is, which keeps every tooth the 30 Aug case earned.

import { describe, expect, it } from "vitest"

import { pagingGuard } from "../src/lib/agent"

/** Past the limit on purpose — SAME_TOOL_LIMIT is 4 and is not exported; these
 *  tests are about the SHAPE of a call, not about where the number sits. */
const PAST_THE_LIMIT = 12

describe("the paging guard counts pages, not questions", () => {
  it("REGRESSION — the owner's four questions, then more, are never nudged", () => {
    const g = pagingGuard()
    // His question, as the door actually receives it: a total, a count per
    // account, a count per app, and an age-filtered total.
    const asked = [
      { module: "help", countOnly: true },
      { module: "help", groupBy: ["accountId"] },
      { module: "help", groupBy: ["appId"] },
      { module: "help", countOnly: true, where: [{ field: "createdAt", op: "lt", value: "2026-09-06" }] },
    ]
    for (const input of asked) {
      expect(g.check(false, "query_records", input), `"${JSON.stringify(input)}" is a question, not a page`).toBeNull()
    }
    // And it does not become a page by being asked often: none of these read a
    // row, so no number of them is a walk through a collection.
    for (let i = 0; i < PAST_THE_LIMIT; i++) {
      expect(g.check(false, "query_records", { module: "help", countOnly: true })).toBeNull()
      expect(g.check(false, "query_records", { module: "help", groupBy: ["accountId"] })).toBeNull()
    }
  })

  it("…and a ROW READ is still caught, which is the whole 30 Aug case", () => {
    const g = pagingGuard()
    // A row read: no countOnly, no groupBy. The arguments are nudged each time,
    // exactly as they were on 30 Aug, so nothing keyed on them would catch it.
    const nudges: string[] = []
    for (let i = 0; i < PAST_THE_LIMIT; i++) {
      const out = g.check(false, "query_records", { module: "help", cursor: `page-${i}` })
      if (out) nudges.push(out)
    }
    expect(nudges.length, "a page-walk must still be stopped").toBeGreaterThan(0)
    expect(nudges[0]).toContain("Stop paging")
  })

  it("a count does not shelter a row read beside it", () => {
    // The counter must not be resettable by interleaving a cheap call — that
    // would hand a determined page-walk an unlimited supply of pages.
    const g = pagingGuard()
    let nudged = 0
    for (let i = 0; i < PAST_THE_LIMIT; i++) {
      g.check(false, "query_records", { module: "help", countOnly: true })
      if (g.check(false, "query_records", { module: "help", cursor: `p${i}` })) nudged++
    }
    expect(nudged, "the row reads are still counted through the counts").toBeGreaterThan(0)
  })

  it("a WRITE is never touched, counted or refused", () => {
    const g = pagingGuard()
    for (let i = 0; i < PAST_THE_LIMIT; i++) {
      expect(g.check(true, "create_help_ticket", { title: "x" }), "a write always runs").toBeNull()
    }
  })

  it("an empty groupBy is not a groupBy — it reads rows like any other call", () => {
    // The discriminator has to be what the call DOES, not which keys it happens
    // to carry. `groupBy: []` groups by nothing and comes back as rows.
    const g = pagingGuard()
    let nudged = 0
    for (let i = 0; i < PAST_THE_LIMIT; i++) {
      if (g.check(false, "query_records", { module: "help", groupBy: [], cursor: `p${i}` })) nudged++
    }
    expect(nudged, "an empty groupBy must not buy immunity").toBeGreaterThan(0)
  })
})
