// AN INPUT MAY NAME AN APP AND WHO AT THE CLIENT IT IS FOR — client ruling,
// 17 Sep 2026, verbatim: "When I'm asking a client for something under which
// account, it is optional to select an app. Remember, when we already
// selected an account, this app choice must be in a horizontal component.
// Also, I want to be able to select who this gets assigned to. Of course, it
// needs to filter the contacts of this account, including the avatar and
// full name, in a horizontal choice component with pills."
//
// Drives the real `TodoFormDialog` (F15's own `AccountAppPicker` for the App
// row, a `RecordPicker layout="row"` for the Assigned-to row, the same shape
// `help-form-dialog.tsx`'s Raised-by row already takes) rather than scanning
// source, for `ticket-form-settles-the-apps-account.test.tsx`'s own reason: a
// picker that renders the right chips is a different claim from a function
// that returns the right ids.
//
// PROVEN NOT VACUOUS the manual way (`account-picker-source-no-email.test.tsx`'s
// own header): before `AccountAppPicker` grew `noneLabel` and before the
// account-change reset was wired, this suite's "clears both, even though
// neither chip was touched" case was confirmed red against a `cp`-backed-up
// copy of the original `todo-form-dialog.tsx`, and green again once the fix
// landed — see the session report for the exact commands.

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

// The only thing this dialog needs that a test cannot give it: the team the
// account picker searches in — `notes-editor-is-named.test.tsx`'s own mock,
// unchanged, because `useActiveTeam` reaches for a Next.js router this
// harness never mounts.
vi.mock("@/lib/use-active-team", () => ({
  useActiveTeam: () => ({ user: null, ctx: { team: { id: "t1" } }, loading: false }),
}))

const ACCOUNTS = [
  { id: "acct-bergman", accountType: "entity" as const, name: "Bergman S.A.", logoUrl: null },
  { id: "acct-other", accountType: "entity" as const, name: "Other Co", logoUrl: null },
]

const LINKS: Record<string, Record<string, unknown>[]> = {
  "acct-bergman": [
    {
      id: "l1",
      accountId: "acct-bergman",
      personAccountId: "p-marta",
      personName: "Marta Nilsson",
      personLogoUrl: null,
      relationship: null,
      isMainStakeholder: false,
      active: true,
    },
  ],
  "acct-other": [
    {
      id: "l2",
      accountId: "acct-other",
      personAccountId: "p-otto",
      personName: "Otto Berg",
      personLogoUrl: null,
      relationship: null,
      isMainStakeholder: false,
      active: true,
    },
  ],
}

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return {
    ...actual,
    tenancy: {
      ...actual.tenancy,
      accounts: async () => ({ accounts: ACCOUNTS, total: ACCOUNTS.length }),
      accountDetail: async (id: string) => ({
        account: ACCOUNTS.find((a) => a.id === id) ?? { id, name: "unexpected" },
        links: LINKS[id] ?? [],
      }),
    },
  }
})

vi.mock("@shared/ui/components/sonner/sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}))

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

import { TodoFormDialog, type TodoFormValues } from "@/components/work/todo-form-dialog"

afterEach(() => {
  cleanup()
  sessionStorage.clear()
})

/** THE TWO SYSTEMS, one per account, exactly as `AccountAppPicker` expects —
 * the same `AccountScopedApp[]` `sprints-screen.tsx`'s own `appsQ` already
 * feeds it, narrowed here by hand since this suite has no door for it. */
const APPS = [
  { id: "app-bergman", name: "Bergman dispatch", accountId: "acct-bergman", logoUrl: null },
  { id: "app-other", name: "Other Co system", accountId: "acct-other", logoUrl: null },
]

const chipRow = (name: string) => screen.getByRole("group", { name })

/** Open the account combobox and pick one by name — the real control, not a
 * shortcut prop, because the picker offering the right OPTIONS is the whole
 * of what this suite is proving. */
const pickAccount = async (name: string) => {
  fireEvent.click(screen.getByLabelText("Which account"))
  const option = await screen.findByRole("option", { name: new RegExp(name) })
  fireEvent.click(option)
}

const name = (title: string) => {
  const box = screen.getByPlaceholderText(/Send us your brand logo/) as HTMLInputElement
  fireEvent.change(box, { target: { value: title } })
}

const submitForm = () => fireEvent.submit(document.querySelector("form") as HTMLFormElement)

describe("the app and the assignee wait for an account, then narrow to it", () => {
  it("is hidden until an account is named", () => {
    render(
      <TodoFormDialog open onOpenChange={() => {}} apps={APPS} onSubmit={vi.fn(async () => {})} />
    )
    expect(screen.queryByRole("group", { name: "App" })).toBeNull()
    expect(screen.queryByRole("group", { name: "Assigned to" })).toBeNull()
  })

  it("draws only the chosen account's own apps, plus a None pill, and only its own contacts wearing their face and full name", async () => {
    render(
      <TodoFormDialog open onOpenChange={() => {}} apps={APPS} onSubmit={vi.fn(async () => {})} />
    )
    await pickAccount("Bergman")

    const appRow = await waitFor(() => {
      const r = chipRow("App")
      expect(within(r).getByRole("button", { name: /Bergman dispatch/ })).toBeTruthy()
      return r
    })
    // ONLY this account's own app…
    expect(within(appRow).queryByRole("button", { name: /Other Co system/ })).toBeNull()
    // …plus the explicit "None" pill (`noneLabel`) — a row otherwise has no
    // way back to blank once a chip is pressed.
    expect(within(appRow).getByRole("button", { name: "No app" })).toBeTruthy()

    const assignedRow = await waitFor(() => {
      const r = chipRow("Assigned to")
      expect(within(r).getByRole("button", { name: /Marta Nilsson/ })).toBeTruthy()
      return r
    })
    // ONLY this account's own contact — Otto Berg belongs to Other Co.
    expect(within(assignedRow).queryByRole("button", { name: /Otto Berg/ })).toBeNull()
    // R35: the contact's own face, round (a person in their own right).
    const marta = within(assignedRow).getByRole("button", { name: /Marta Nilsson/ })
    const face = marta.querySelector(".bg-muted, img")
    expect(face, "the contact's own face never reached the pill").toBeTruthy()
    // FULL NAME — the client's own word, never trimmed to a first name the
    // way a STAFF pill would be (R54 is about staff; a contact is not staff).
    expect(within(marta).getByText("Marta Nilsson")).toBeTruthy()
    // Nothing pre-pressed on a fresh create — a real question, not a guess.
    expect(marta.getAttribute("aria-pressed")).toBe("false")
  })

  it("clears both, even though neither chip was touched, when the account is changed", async () => {
    const onSubmit = vi.fn(async (_v: TodoFormValues) => {})
    render(<TodoFormDialog open onOpenChange={() => {}} apps={APPS} onSubmit={onSubmit} />)
    await pickAccount("Bergman")
    // Press an app AND a contact on Bergman's own row — the state this case
    // proves gets thrown away.
    const appRow = await waitFor(() => {
      const r = chipRow("App")
      expect(within(r).getByRole("button", { name: /Bergman dispatch/ })).toBeTruthy()
      return r
    })
    fireEvent.click(within(appRow).getByRole("button", { name: /Bergman dispatch/ }))
    const assignedRow = await waitFor(() => {
      const r = chipRow("Assigned to")
      expect(within(r).getByRole("button", { name: /Marta Nilsson/ })).toBeTruthy()
      return r
    })
    fireEvent.click(within(assignedRow).getByRole("button", { name: /Marta Nilsson/ }))
    expect(within(appRow).getByRole("button", { name: /Bergman dispatch/ }).getAttribute("aria-pressed")).toBe(
      "true"
    )

    // NOW SWITCH THE ACCOUNT — this is the ruling's own "cleared when the
    // account changes", never touching either chip directly.
    await pickAccount("Other Co")
    await waitFor(() => {
      expect(within(chipRow("App")).getByRole("button", { name: /Other Co system/ })).toBeTruthy()
    })

    name("Send us your brand logo as an SVG")
    submitForm()
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    // BOTH BLANK — never Bergman's stale app or contact id bleeding onto
    // Other Co's input, and never Other Co's own app/contact either, since
    // nobody pressed one on the new row.
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ appId: "", assignedContactId: "" })
  })

  it("the None pill is the only way back to blank once an app chip has been pressed", async () => {
    const onSubmit = vi.fn(async (_v: TodoFormValues) => {})
    render(<TodoFormDialog open onOpenChange={() => {}} apps={APPS} onSubmit={onSubmit} />)
    await pickAccount("Bergman")
    const appRow = await waitFor(() => {
      const r = chipRow("App")
      expect(within(r).getByRole("button", { name: /Bergman dispatch/ })).toBeTruthy()
      return r
    })
    fireEvent.click(within(appRow).getByRole("button", { name: /Bergman dispatch/ }))
    expect(within(appRow).getByRole("button", { name: /Bergman dispatch/ }).getAttribute("aria-pressed")).toBe(
      "true"
    )
    fireEvent.click(within(appRow).getByRole("button", { name: "No app" }))
    expect(within(appRow).getByRole("button", { name: /Bergman dispatch/ }).getAttribute("aria-pressed")).toBe(
      "false"
    )
    expect(within(appRow).getByRole("button", { name: "No app" }).getAttribute("aria-pressed")).toBe("true")

    name("Send us your brand logo as an SVG")
    submitForm()
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ appId: "" })
  })
})
