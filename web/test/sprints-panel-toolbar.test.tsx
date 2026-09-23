// T3848 — "Inside any app details screen, there is a tab called Phases, and
// the button UI is kind of broken for sorting and adding a new phase."
//
// TWO SEPARATE FAULTS in `SprintsPanel`'s `CollectionFrame` config, both
// invisible to every rule in this repo (R48/R50/R53/R98 all see a real
// search box, a real `empty` prop, a real structured `SortControl`, a
// kit-sized button — the SHAPE each one draws is what was wrong, not
// whether the slot was filled, the same gap `app-tickets-are-a-table.
// test.tsx`'s own header names for a table that regressed to text lines):
//
//  1. THE CREATE BUTTON DREW AS A BLANK CIRCLE. `createActionButton`
//     (collection-frame.tsx) renders only `{action.icon}` inside the
//     button — every other caller of `CollectionCreateActionProvider`
//     reaches it through `SectionWithCreate`, which always supplies one
//     (`icon="plus"`, screen-bits.tsx). This panel calls the provider
//     directly and never passed one.
//
//  2. THE SORT FIELD DREW BLANK. `defaultCollectionConfig.sortBy` is `""`,
//     which matches none of `sortOptions` ("name"/"startsOn"/"sprintType")
//     — this panel set `sortOptions` but never `sortBy`, so `SortControl`'s
//     `SelectValue` had a current value with no matching option and showed
//     nothing beside the direction arrow. Every other sortable config in
//     the app (waves-screen.tsx, record-table.tsx, paged-find.tsx) sets a
//     real starting key.

import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { Sprint } from "@shared/types"

const SPRINTS: Sprint[] = [
  {
    id: "S1",
    ref: "B0001",
    refWas: null,
    name: "Onboarding rebuild",
    goal: null,
    goalSummary: null,
    sprintType: "Build",
    accountId: "acct-1",
    accountName: "Northwind",
    appId: "AP_1",
    appName: "Driver app",
    waveId: null,
    waveName: null,
    startsOn: "2026-08-01",
    endsOn: "2026-08-30",
    soldPriceCents: 0,
    currency: null,
    completedAt: null,
    active: true,
    storyCount: 3,
    openStoryCount: 1,
    createdAt: "2026-07-01T09:00:00.000Z",
    createdByName: null,
  },
]

vi.mock("@shared/web/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/web/store")>()
  return {
    ...actual,
    useCached: (key: string | null) => ({
      data: key === "sprints-app-of:AP_1" ? SPRINTS : undefined,
      error: undefined,
      refresh: () => {},
    }),
    primeCache: () => {},
  }
})

import { SprintsPanel } from "@/components/work/work-panels"

afterEach(cleanup)

function show(onNew?: () => void) {
  return render(
    <SprintsPanel
      ownerKind="app"
      ownerId="AP_1"
      filter={{ appId: "AP_1" }}
      host={{ base: "/t/T1" }}
      onNew={onNew}
      emptyText="No work has been sold against this app yet."
    />
  )
}

describe("an app's Phases tab draws a real toolbar, not a blank circle and a blank sort field", () => {
  it("draws the create button with a visible glyph inside it, never empty", () => {
    show(() => {})
    const button = screen.getByRole("button", { name: "Start a phase" })
    // `createActionButton` renders exactly `{action.icon}` as its only
    // child — an svg present is the icon; none at all is the blank circle
    // the ticket reported.
    expect(button.querySelector("svg"), "the create button drew no icon at all").toBeTruthy()
  })

  it("draws no create button at all when the caller may not add one (onNew omitted)", () => {
    show(undefined)
    expect(screen.queryByRole("button", { name: "Start a phase" })).toBeNull()
  })

  it("the sort field shows its current key's own label, not a blank", () => {
    show(() => {})
    const sort = screen.getByText("Sort by").closest('[data-slot="sort-control"]')
    expect(sort, "no sort control drew at all").toBeTruthy()
    // The trigger is a real Radix `SelectValue` — its rendered text is the
    // option's label ("Name"), never empty, once `sortBy` names a real key.
    expect(within(sort as HTMLElement).getByText("Name")).toBeTruthy()
  })
})
