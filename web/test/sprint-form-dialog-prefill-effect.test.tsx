// THE PREFILL, WIRED INTO THE ACTUAL FORM — `sprint-form-dialog-prefill.test.ts`
// already pins the pure arithmetic (`prefillEndDate`); this file proves the
// component actually calls it at the right moments and stops once a person
// has typed their own end date. The kit's `DatePicker` is a full calendar
// popover with no plain input to type into, so it is swapped for a bare
// `<input type="date">` here — the same shape `date-fromYMD`/`ymdFromDate`
// already convert to and from, so the swap changes no behaviour this test
// cares about, only how a date is entered in a browser that has no calendar.

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/use-active-team", () => ({
  useActiveTeam: () => ({ user: null, ctx: { team: { id: "t1" } }, loading: false }),
}))

vi.mock("@/lib/api", () => ({
  ApiFailure: class extends Error {},
  tenancy: { selectable: async () => ({ values: [], total: 0 }) },
}))

vi.mock("@shared/ui/components/sonner/sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}))

vi.mock("@shared/ui/components/date-picker/date-picker", () => ({
  DatePicker: ({
    id,
    value,
    onValueChange,
    disabled,
  }: {
    id: string
    value: Date | null
    onValueChange: (d: Date | null) => void
    disabled?: boolean
  }) => {
    const ymd = value
      ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`
      : ""
    return (
      <input
        id={id}
        aria-label={id}
        type="date"
        disabled={disabled}
        value={ymd}
        onChange={(e) => {
          const v = e.target.value
          if (!v) return onValueChange(null)
          const [y, m, d] = v.split("-").map(Number)
          onValueChange(new Date(y!, (m ?? 1) - 1, d ?? 1))
        }}
      />
    )
  },
}))

import { SprintFormDialog } from "@/components/work/sprint-form-dialog"

afterEach(() => {
  cleanup()
  sessionStorage.clear()
})

const FIXED_APP = { id: "app1", name: "Dispatch system" }
const FIXED_ACCOUNT = { id: "acct1", name: "Acme" }

describe("SprintFormDialog - the end-date prefill, wired", () => {
  it("prefills the end date once a type is chosen and a start date follows", () => {
    render(
      <SprintFormDialog
        open
        onOpenChange={() => {}}
        apps={[]}
        fixedApp={FIXED_APP}
        fixedAccount={FIXED_ACCOUNT}
        wavePhaseDays={[{ phaseType: "Build", days: 3 }]}
        onSubmit={vi.fn(async () => {})}
      />
    )
    fireEvent.click(screen.getByRole("radio", { name: /Build/ }))
    const start = screen.getByLabelText("sprint-start") as HTMLInputElement
    fireEvent.change(start, { target: { value: "2026-09-21" } }) // a Monday
    const end = screen.getByLabelText("sprint-end") as HTMLInputElement
    // 3 working days after Monday 09-21 is Thursday 09-24.
    expect(end.value).toBe("2026-09-24")
  })

  it("never overwrites an end date the person typed by hand, even if start or type changes again", () => {
    render(
      <SprintFormDialog
        open
        onOpenChange={() => {}}
        apps={[]}
        fixedApp={FIXED_APP}
        fixedAccount={FIXED_ACCOUNT}
        wavePhaseDays={[{ phaseType: "Build", days: 3 }]}
        onSubmit={vi.fn(async () => {})}
      />
    )
    fireEvent.click(screen.getByRole("radio", { name: /Build/ }))
    const start = screen.getByLabelText("sprint-start") as HTMLInputElement
    fireEvent.change(start, { target: { value: "2026-09-21" } })
    const end = screen.getByLabelText("sprint-end") as HTMLInputElement
    expect(end.value).toBe("2026-09-24") // the prefill

    // The person overrides it by hand.
    fireEvent.change(end, { target: { value: "2026-12-25" } })
    expect(end.value).toBe("2026-12-25")

    // Picking a new start (still with a type chosen) must not clobber it.
    fireEvent.change(start, { target: { value: "2026-09-22" } })
    expect(end.value).toBe("2026-12-25")
  })

  it("an edit form opened on a phase that already carries an end date never prefills over it", () => {
    render(
      <SprintFormDialog
        open
        onOpenChange={() => {}}
        apps={[]}
        fixedApp={FIXED_APP}
        fixedAccount={FIXED_ACCOUNT}
        wavePhaseDays={[{ phaseType: "Build", days: 3 }]}
        initial={{
          name: "Onboarding",
          goal: null,
          goalSummary: null,
          sprintType: "Build",
          accountName: FIXED_ACCOUNT.name,
          appName: FIXED_APP.name,
          startsOn: "2026-09-21",
          endsOn: "2026-11-30",
          soldPriceCents: 0,
          currency: null,
        }}
        onSubmit={vi.fn(async () => {})}
      />
    )
    const end = screen.getByLabelText("sprint-end") as HTMLInputElement
    expect(end.value).toBe("2026-11-30")
    // Re-picking the same start (a no-op start change is still a change the
    // effect sees) must not pull the end back to the prefilled value.
    const start = screen.getByLabelText("sprint-start") as HTMLInputElement
    fireEvent.change(start, { target: { value: "2026-09-22" } })
    expect(end.value).toBe("2026-11-30")
  })
})
