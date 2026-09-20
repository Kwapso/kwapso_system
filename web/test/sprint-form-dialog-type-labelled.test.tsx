// THE PHASE TYPE FIELD'S LABEL REACHES ITS CONTROL - live defect, proved 20
// Sep 2026, in the wave-stage live proof. `sprint-form-dialog.tsx`'s Type
// field wraps `<Field config={typeField} htmlFor="sprint-type">` around an
// `<AppearancePillGroup>` and a conditional description paragraph - TWO
// children, so the kit `Field`'s own single-element clone (which is how
// every other field on this form gets its id: `sprint-name`, `sprint-start`,
// `sprint-end`, `sprint-price`...) never fires, and nothing on screen carried
// `id="sprint-type"`. The label pointed at nothing.
//
// THE FIX: `AppearancePillGroup` (shared/web/appearance-pill-group.tsx) now
// accepts an `id` (and `aria-describedby`), and `sprint-form-dialog.tsx`
// hands it `id="sprint-type"` directly - the same id the label already
// carries as its own `htmlFor`, rather than leaning on a clone that cannot
// reach a field with two children.
//
// PROVEN ON THE REAL DIALOG, not a fixture: this drives `SprintFormDialog`
// itself, in both CREATE mode (the "Add the first" phase off a wave's empty
// state opens exactly this) and EDIT mode (`sprint-detail.tsx`'s own edit
// sheet opens the same form with `initial` set) - the type field is drawn,
// and labelled, identically in both, because there is one component and one
// `htmlFor`/`id` pair for it.

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

// `useActiveTeam` reaches for a Next.js router this harness never mounts -
// same mock `todo-form-app-and-assignee.test.tsx` uses for the identical
// reason.
vi.mock("@/lib/use-active-team", () => ({
  useActiveTeam: () => ({ user: null, ctx: { team: { id: "t1" } }, loading: false }),
}))

vi.mock("@/lib/api", () => ({
  ApiFailure: class extends Error {},
  tenancy: {
    // `useSprintTypes` reads this; an empty vocabulary falls back to the
    // seven built-in words (`FALLBACK_SPRINT_TYPES`), which is plenty to
    // prove a label reaches its control.
    selectable: async () => ({ values: [], total: 0 }),
  },
}))

vi.mock("@shared/ui/components/sonner/sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}))

import { SprintFormDialog, type SprintFormInitial } from "@/components/work/sprint-form-dialog"

afterEach(() => {
  cleanup()
  sessionStorage.clear()
})

const FIXED_APP = { id: "app1", name: "Dispatch system" }
const FIXED_ACCOUNT = { id: "acct1", name: "Acme" }

/** Both an id-for-id assertion (the literal defect: a `<label for>` pointing
 * at nothing) and the practical proof that they are the SAME element - the
 * pill row, `role="radiogroup"`. */
function expectTypeFieldIsLabelled() {
  const label = document.querySelector('label[for="sprint-type"]')
  expect(label, "no <label for=\"sprint-type\"> on screen at all").toBeTruthy()
  expect(label?.textContent).toContain("Type")

  const control = document.getElementById("sprint-type")
  expect(control, "the label's htmlFor points at an id nothing on screen carries").toBeTruthy()
  expect(control?.getAttribute("role")).toBe("radiogroup")
}

describe("the phase type pill group is labelled - the label's htmlFor reaches a real id", () => {
  it("CREATE mode (the 'Add the first' phase off a wave's empty state opens this)", () => {
    render(
      <SprintFormDialog
        open
        onOpenChange={() => {}}
        apps={[]}
        fixedApp={FIXED_APP}
        fixedAccount={FIXED_ACCOUNT}
        onSubmit={vi.fn(async () => {})}
      />
    )
    expectTypeFieldIsLabelled()
    // The pills themselves are real, pickable radios - the fallback
    // vocabulary's own first word is on screen.
    expect(screen.getByRole("radio", { name: /Audit/ })).toBeTruthy()
  })

  it("EDIT mode (sprint-detail.tsx's own edit sheet - same form, type still editable)", () => {
    const initial: SprintFormInitial = {
      name: "Onboarding",
      goal: null,
      goalSummary: null,
      sprintType: "Build",
      accountName: FIXED_ACCOUNT.name,
      appName: FIXED_APP.name,
      startsOn: null,
      endsOn: null,
      soldPriceCents: 0,
      currency: null,
    }
    render(
      <SprintFormDialog
        open
        onOpenChange={() => {}}
        apps={[]}
        fixedApp={FIXED_APP}
        fixedAccount={FIXED_ACCOUNT}
        initial={initial}
        onSubmit={vi.fn(async () => {})}
      />
    )
    expectTypeFieldIsLabelled()
    // EDIT MODE, THE TYPE IS STILL A LIVE CHOICE - unlike Account/App, which
    // become fact rows, the type pill for the stored value is pressed, not
    // inert: it can still be changed, which is the whole point of a phase
    // created with no type (the wave empty-state case) being editable
    // afterwards.
    const pressed = screen.getByRole("radio", { name: /Build/, checked: true })
    expect(pressed).toBeTruthy()
    expect(pressed.hasAttribute("disabled")).toBe(false)
  })
})
