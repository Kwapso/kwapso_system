// THE CONFIRM PANEL'S OWN RunSteps: the cap lives HERE, not at the call site.
// web/components/assistant/agent-panel.tsx must hand this component the
// whole confirm list (web/test/agent-confirm-panel.test.tsx reads the
// panel's own source for `steps={chat.confirmSteps}`), so five-then-more has
// to happen inside @/components/assistant/run-steps instead, with no
// `overflow-y-auto` and no `max-h-*` anywhere (R91,
// web/test/no-nested-scroll.test.ts).

import { cleanup, fireEvent, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { RunSteps } from "@/components/assistant/run-steps"
import type { RunStep } from "@shared/ui/components/run-steps/run-steps"

afterEach(cleanup)

function stepsOf(count: number): RunStep[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `s${i}`,
    label: `Step ${i + 1}`,
    state: "pending",
  }))
}

describe("the confirm panel's RunSteps caps at five, with a door for the rest", () => {
  // `rail={false}`: the kit's own `StatusStepper` rail repeats every label
  // above the rows ("Step 1" twice over), which is real and correct kit
  // behaviour but would make a plain `getByText` ambiguous here — this
  // test's subject is the ROW list the cap acts on, not the rail beside it.
  it("paints only the first five rows when the list runs longer, with a door naming the rest", () => {
    const { container, getByText, queryByText } = render(<RunSteps steps={stepsOf(8)} rail={false} />)

    const rows = container.querySelectorAll('[data-slot="run-step"]')
    expect(rows).toHaveLength(5)
    expect(getByText("Step 1")).toBeTruthy()
    expect(getByText("Step 5")).toBeTruthy()
    expect(queryByText("Step 6")).toBeNull()
    expect(getByText("Show 3 more")).toBeTruthy()
  })

  it("pressing the door reveals the rest, and pressing it again collapses back to five", () => {
    const { container, getByText, queryByText } = render(<RunSteps steps={stepsOf(8)} rail={false} />)

    fireEvent.click(getByText("Show 3 more"))
    expect(container.querySelectorAll('[data-slot="run-step"]')).toHaveLength(8)
    expect(getByText("Step 8")).toBeTruthy()
    expect(getByText("Show less")).toBeTruthy()

    fireEvent.click(getByText("Show less"))
    expect(container.querySelectorAll('[data-slot="run-step"]')).toHaveLength(5)
    expect(queryByText("Step 6")).toBeNull()
  })

  it("draws no door, and every row, when the list is five or fewer", () => {
    const { container, queryByText } = render(<RunSteps steps={stepsOf(5)} rail={false} />)

    expect(container.querySelectorAll('[data-slot="run-step"]')).toHaveLength(5)
    expect(queryByText(/Show/)).toBeNull()
  })

  it("carries no overflow-y-auto or max-h class anywhere in its own tree (R91)", () => {
    const { container } = render(<RunSteps steps={stepsOf(8)} />)
    const classy = [...container.querySelectorAll("[class]")].map((el) => el.className).join(" ")
    expect(classy).not.toMatch(/overflow-y-auto|overflow-auto|overflow-y-scroll|overflow-scroll|max-h-/)
  })
})
