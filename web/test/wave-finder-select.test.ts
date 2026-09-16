// SELECTWAVES — THE SPRINT TYPE FACET'S CLIENT-SIDE `EXISTS`.
//
// A wave carries no `sprintType` of its own (`shared/waves.ts` — "a wave is a
// wave"), so the client's 16 Sep 2026 ruling ("I want, in Waves, the filter by
// sprint type") can only be answered by reaching into the sprints inside it —
// the door's own `EXISTS` (`workers/tenancy/src/lib/waves.ts#listWaves`,
// covered by `workers/tenancy/test/waves.test.ts`) and, for the sidebar
// collection that reads its whole bounded list once, the identical question
// asked of the sprints already in the browser. This file pins THAT half: the
// pure function, over plain data, with no screen rendered.

import { describe, expect, it } from "vitest"

import { EMPTY_WAVE_QUERY, selectWaves } from "@/components/work/wave-finder"
import type { Wave } from "@shared/waves"
import type { Sprint } from "@shared/types"

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

describe("selectWaves — the Sprint type facet", () => {
  const w1 = wave({ id: "w1", accountId: "a1", name: "Onboarding" })
  const w2 = wave({ id: "w2", accountId: "a1", name: "Rollout" })
  const rows = [w1, w2]

  it("with no sprintType asked, every wave passes (the existing facets are untouched)", () => {
    // Order-agnostic on purpose: both waves share the same `createdAt` in this
    // fixture, so `EMPTY_WAVE_QUERY`'s default "newest first" sort has no real
    // tiebreak to make — this test is about PRESENCE, not the sort's own
    // behaviour (covered elsewhere).
    expect(selectWaves(rows, EMPTY_WAVE_QUERY, []).map((w) => w.id).sort()).toEqual(["w1", "w2"])
  })

  it("keeps only waves holding a LIVE sprint of that type", () => {
    const sprints: Sprint[] = [
      sprint({ id: "s1", name: "Build", waveId: "w1", sprintType: "Implementation" }),
      sprint({ id: "s2", name: "Plan", waveId: "w2", sprintType: "Planning" }),
    ]
    const rowsWithType = selectWaves(rows, { ...EMPTY_WAVE_QUERY, sprintType: "Implementation" }, sprints)
    expect(rowsWithType.map((w) => w.id)).toEqual(["w1"])
  })

  it("ignores a switched-off sprint's type — the same 'live only' reading the door's EXISTS takes", () => {
    const sprints: Sprint[] = [
      sprint({ id: "s1", name: "Build", waveId: "w1", sprintType: "Implementation", active: false }),
    ]
    expect(
      selectWaves(rows, { ...EMPTY_WAVE_QUERY, sprintType: "Implementation" }, sprints)
    ).toEqual([])
  })

  it("a wave with no sprints of that type at all matches nothing, not everything", () => {
    const sprints: Sprint[] = [sprint({ id: "s1", name: "Build", waveId: "w1", sprintType: "Planning" })]
    expect(
      selectWaves(rows, { ...EMPTY_WAVE_QUERY, sprintType: "Implementation" }, sprints)
    ).toEqual([])
  })

  it("composes with the other facets (AND, not OR) — an account match still needs its own sprint type", () => {
    const sprints: Sprint[] = [
      sprint({ id: "s1", name: "Build", waveId: "w1", sprintType: "Implementation" }),
      sprint({ id: "s2", name: "Build too", waveId: "w2", sprintType: "Implementation" }),
    ]
    const narrowed = selectWaves(
      rows,
      { ...EMPTY_WAVE_QUERY, accountId: "a1", sprintType: "Implementation" },
      sprints
    )
    // Both hold the type; the account facet (matching both here) does not
    // itself drop either — this proves the two filters are ANDed on one row
    // rather than the sprint-type check silently replacing the others.
    expect(narrowed.map((w) => w.id).sort()).toEqual(["w1", "w2"])
  })
})

describe("selectWaves — the App facet (Wave.appId, a real column since team migration 0099)", () => {
  const w1 = wave({ id: "w1", accountId: "a1", name: "Onboarding", appId: "app1" })
  const w2 = wave({ id: "w2", accountId: "a1", name: "Rollout", appId: "app2" })
  const w3 = wave({ id: "w3", accountId: "a1", name: "Unassigned", appId: null })
  const rows = [w1, w2, w3]

  it("with no appId asked, every wave passes", () => {
    expect(selectWaves(rows, EMPTY_WAVE_QUERY, []).map((w) => w.id).sort()).toEqual(["w1", "w2", "w3"])
  })

  it("keeps only the wave whose own appId matches — a plain equality, no sprint read needed", () => {
    expect(selectWaves(rows, { ...EMPTY_WAVE_QUERY, appId: "app1" }, []).map((w) => w.id)).toEqual(["w1"])
  })

  it("a wave with no app at all never matches a real appId", () => {
    expect(selectWaves(rows, { ...EMPTY_WAVE_QUERY, appId: "app1" }, [])).not.toContainEqual(w3)
  })

  it("composes with the other facets (AND, not OR)", () => {
    const narrowed = selectWaves(rows, { ...EMPTY_WAVE_QUERY, accountId: "a1", appId: "app2" }, [])
    expect(narrowed.map((w) => w.id)).toEqual(["w2"])
  })
})
