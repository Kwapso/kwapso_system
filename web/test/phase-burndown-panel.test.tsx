// PHASE BURNDOWN PANEL, round-28 ruling. Proves the shape the ruling asks
// for: two lines (remaining, ideal) drawn from the door's own series, and the
// empty state (R88) when the phase has no dates or no stories, where the
// panel drops its header along with the chart and says why instead.

import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import { clearCache } from "@shared/web/store"

const storyBurndown = vi.fn()
vi.mock("@/lib/api", () => ({
  ApiFailure: class extends Error {},
  content: { storyBurndown: (...args: unknown[]) => storyBurndown(...args) },
}))

import { PhaseBurndownPanel } from "@/components/work/phase-burndown-panel"

// recharts measures its container, and jsdom reports every box as 0x0, so the
// chart would render nothing at all and the test would pass for the wrong
// reason. Same fixture chart-draws-its-furniture.test.tsx uses.
beforeAll(() => {
  for (const key of ["offsetWidth", "clientWidth"]) {
    Object.defineProperty(HTMLElement.prototype, key, { configurable: true, value: 800 })
  }
  for (const key of ["offsetHeight", "clientHeight"]) {
    Object.defineProperty(HTMLElement.prototype, key, { configurable: true, value: 400 })
  }
  HTMLElement.prototype.getBoundingClientRect = function () {
    return {
      width: 800, height: 400, top: 0, left: 0, bottom: 400, right: 800, x: 0, y: 0,
      toJSON() {},
    } as DOMRect
  }
})

afterEach(() => {
  cleanup()
  clearCache()
  storyBurndown.mockReset()
})

const FIXTURE = {
  startTotal: 4,
  hasPoints: false,
  days: [
    { date: "2026-03-01", remainingCount: 4, remainingPoints: null, idealCount: 4 },
    { date: "2026-03-02", remainingCount: 3, remainingPoints: null, idealCount: 3 },
    { date: "2026-03-03", remainingCount: 3, remainingPoints: null, idealCount: 2 },
    { date: "2026-03-04", remainingCount: 2, remainingPoints: null, idealCount: 1 },
    { date: "2026-03-05", remainingCount: 2, remainingPoints: null, idealCount: 0 },
  ],
}

/** Every `recharts-*` class in the tree, reads what the chart actually built. */
function partsOf(root: HTMLElement): Set<string> {
  const found = new Set<string>()
  for (const node of root.querySelectorAll("*")) {
    for (const cls of (node.getAttribute("class") ?? "").split(/\s+/)) {
      if (cls.startsWith("recharts-")) found.add(cls)
    }
  }
  return found
}

describe("PhaseBurndownPanel", () => {
  it("renders the two lines (remaining, ideal) from a fixture series", async () => {
    storyBurndown.mockResolvedValue(FIXTURE)
    const { container } = render(
      <PhaseBurndownPanel sprintId="sprint-1" startsOn="2026-03-01" endsOn="2026-03-05" storyCount={4} />
    )

    await waitFor(() => expect(storyBurndown).toHaveBeenCalledWith("sprint-1"))
    await screen.findByText("Burndown")

    const lines = await waitFor(() => {
      const found = container.querySelectorAll(".recharts-line")
      expect(found.length).toBe(2)
      return found
    })
    expect(lines).toHaveLength(2)

    // No points column yet, so no count/points toggle is offered.
    expect(screen.queryByRole("radio", { name: "Points" })).toBeNull()
    expect(partsOf(container).has("recharts-cartesian-axis")).toBe(true)
  })

  it("offers a count/points toggle once the door says points exist", async () => {
    storyBurndown.mockResolvedValue({ ...FIXTURE, hasPoints: true })
    render(<PhaseBurndownPanel sprintId="sprint-2" startsOn="2026-03-01" endsOn="2026-03-05" storyCount={4} />)

    await screen.findByText("Burndown")
    expect(await screen.findByRole("radio", { name: "Count" })).toBeTruthy()
    expect(screen.getByRole("radio", { name: "Points" })).toBeTruthy()
  })

  it("shows the empty state, with no header, when the phase has no dates", async () => {
    render(<PhaseBurndownPanel sprintId="sprint-3" startsOn={null} endsOn={null} storyCount={4} />)

    await screen.findByText("This phase has no start and end dates set, so there's nothing to burn down.")
    // R88: the whole header, title included, drops with the empty state.
    expect(screen.queryByText("Burndown")).toBeNull()
    expect(storyBurndown).not.toHaveBeenCalled()
  })

  it("shows the empty state when the phase has dates but no stories", async () => {
    render(<PhaseBurndownPanel sprintId="sprint-4" startsOn="2026-03-01" endsOn="2026-03-05" storyCount={0} />)

    await screen.findByText("No work in this phase yet.")
    expect(screen.queryByText("Burndown")).toBeNull()
    expect(storyBurndown).not.toHaveBeenCalled()
  })
})
