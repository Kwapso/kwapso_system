// EDIT STAKEHOLDERS FROM THE APP'S OWN STAKEHOLDERS TAB (T3849) — the client's
// ask: "for a first-time user, give the option to add or edit stakeholders of
// an existing app inside the Stakeholders tab of that app," today only
// reachable through the app's whole edit form.
//
// THIS FILE PROVES:
//   1. A caller who may update apps (`processes:update`, the same right the
//      app's own Edit action gates on) is offered an "Edit stakeholders"
//      action on the client's own side.
//   2. A reader without that right sees none — no pen, no create door on the
//      empty register either.
//   3. Saving from the sheet sends the FULL, current stakeholder list to
//      `tenancy.updateApp` — including a REMOVAL (unticking somebody drops
//      them from the body, it is not appended to) — the door replaces
//      whatever it is sent (`savePeople`, workers/tenancy/src/routes/
//      processes.ts).
//
// SCOPED TO THE CLIENT'S SIDE ONLY (this lane's own default, noted in its
// report): "Ours" stays read-only, set from the app's edit form.

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

const { updateApp, accountDetail } = vi.hoisted(() => ({
  updateApp: vi.fn(async () => ({ ok: true as const })),
  accountDetail: vi.fn(async () => ({
    account: { id: "acct-1", name: "Bergman & Co" },
    links: [
      { personAccountId: "c1", personName: "Alice Bergman", active: true },
      { personAccountId: "c2", personName: "Bob Bergman", active: true },
    ],
  })),
}))

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return {
    ...actual,
    tenancy: {
      ...actual.tenancy,
      accountDetail,
      updateApp,
    },
  }
})

vi.mock("@shared/ui/components/sonner/sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}))

/** Radix measures itself and captures the pointer; jsdom does neither — the
 * same polyfill every Sheet/Select test in this file family carries. */
beforeAll(() => {
  Object.assign(window.HTMLElement.prototype, {
    scrollIntoView: () => {},
    hasPointerCapture: () => false,
    releasePointerCapture: () => {},
    setPointerCapture: () => {},
  })
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

import { StakeholdersPanel } from "@/components/apps/stakeholders-panel"

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const BASE_PROPS = {
  staff: [],
  memberNames: new Map<string, string>(),
  memberPhotos: new Map<string, string | null>(),
  contactNames: new Map([
    ["c1", "Alice Bergman"],
    ["c2", "Bob Bergman"],
  ]),
  host: { base: "/apps/app-1" },
  appId: "app-1",
  appName: "Dispatch",
  teamId: "team-1",
  accountId: "acct-1",
}

const STAKEHOLDERS = [
  { contactId: "c1", isMain: true },
  { contactId: "c2", isMain: false },
]

describe("editing stakeholders from the app's own Stakeholders tab (T3849)", () => {
  it("an editor sees the Edit stakeholders action on the client's own side", async () => {
    render(
      <StakeholdersPanel {...BASE_PROPS} stakeholders={STAKEHOLDERS} canEdit={true} />
    )
    expect(await screen.findByRole("button", { name: "Edit stakeholders" })).toBeTruthy()
  })

  it("an editor sees the same action as the empty register's own door, when nobody is on it yet", async () => {
    render(
      <StakeholdersPanel {...BASE_PROPS} stakeholders={[]} canEdit={true} />
    )
    expect(await screen.findByRole("button", { name: "Edit stakeholders" })).toBeTruthy()
  })

  it("a reader (no processes:update) sees no edit door, empty or not", async () => {
    render(<StakeholdersPanel {...BASE_PROPS} stakeholders={STAKEHOLDERS} canEdit={false} />)
    // Give the async account-detail read a turn, so a door that only ever
    // appeared after data arrived would still have been caught.
    await waitFor(() => expect(accountDetail).not.toHaveBeenCalled())
    expect(screen.queryByRole("button", { name: "Edit stakeholders" })).toBeNull()

    cleanup()
    render(<StakeholdersPanel {...BASE_PROPS} stakeholders={[]} canEdit={false} />)
    expect(screen.queryByRole("button", { name: "Edit stakeholders" })).toBeNull()
  })

  it("no editor at all on one of our own systems (no account) — nobody to add", async () => {
    render(
      <StakeholdersPanel {...BASE_PROPS} accountId={null} stakeholders={[]} canEdit={true} />
    )
    expect(screen.queryByRole("button", { name: "Edit stakeholders" })).toBeNull()
    expect(accountDetail).not.toHaveBeenCalled()
  })

  it("removing a stakeholder in the sheet sends the FULL remaining list to updateApp, main stakeholder untouched", async () => {
    render(
      <StakeholdersPanel {...BASE_PROPS} stakeholders={STAKEHOLDERS} canEdit={true} />
    )

    fireEvent.click(await screen.findByRole("button", { name: "Edit stakeholders" }))

    // The sheet's own checklist, fed by the mocked account-detail read. The
    // panel's own "Theirs" row also says "Bob Bergman", so this waits for a
    // SECOND match (the checklist's own `<label>`) rather than the first.
    await waitFor(() => expect(screen.getAllByText("Bob Bergman").length).toBe(2))
    const bobLabel = screen
      .getAllByText("Bob Bergman")
      .map((el) => el.closest("label"))
      .find((el): el is HTMLLabelElement => el !== null)
    if (!bobLabel) throw new Error("the checklist's own Bob Bergman label never rendered")
    const bobCheckbox = within(bobLabel).getByRole("checkbox")
    expect(bobCheckbox.getAttribute("aria-checked")).toBe("true")
    fireEvent.click(bobCheckbox)
    expect(bobCheckbox.getAttribute("aria-checked")).toBe("false")

    const submit = screen.getByRole("button", { name: "Submit" })
    fireEvent.click(submit)

    await waitFor(() => expect(updateApp).toHaveBeenCalledTimes(1))
    expect(updateApp).toHaveBeenCalledWith({
      id: "app-1",
      name: "Dispatch",
      stakeholderContactIds: ["c1"],
      mainStakeholderContactId: "c1",
    })
  })
})
