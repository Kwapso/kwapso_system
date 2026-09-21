// THE ACCOUNT IS THE FIRST FIELD ON THE APP FORM, AND THE CREATE DIALOG OPENS
// FOCUSED THERE. Aurora, verbatim, 21 Sep 2026: "when creating app, first
// thing should be to select account."
//
// TWO THINGS PROVED HERE, both against the real `AppFormDialog`
// (web/components/apps/app-form-dialog.tsx) rather than by reading its
// source, for `ticket-form-settles-the-apps-account.test.tsx`'s own reason: a
// form that opens focused on the right field is a different claim from a
// function whose values object happens to be in the right shape.
//
//   1 · ORDER. On a NEW app, the account `Field` ("Whose system it is") sits
//       in the DOM before the name `Field` ("What it's called") — not merely
//       above it visually, but earlier in document order, which is what
//       "first field" means to both a sighted reader tabbing down the form
//       and a screen reader reading it top to bottom.
//   2 · FOCUS. The dialog's own opening focus lands on the account picker's
//       trigger on a NEW app (nothing else carries `autoFocus`), and on the
//       name input on an EDIT (where the account field never renders at all
//       — see that field's own comment in app-form-dialog.tsx for why it
//       disappears rather than showing disabled).
//
// `RecordPicker` grew an `autoFocus` prop for this ruling
// (web/components/records/record-picker.tsx) — the kit's `Button` already
// spreads onto a real `<button>`, so passing the native attribute through is
// the whole of the new surface.

import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@shared/ui/components/sonner/sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}))

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

import { AppFormDialog, type AppFormValues } from "@/components/apps/app-form-dialog"

afterEach(() => {
  cleanup()
  sessionStorage.clear()
})

const INITIAL: AppFormValues = {
  name: "Dispatch",
  accountId: "acct-bergman",
  url: "",
  stage: "Live",
  logoUrl: "",
  toolCostCentsPerMonth: 0,
  about: "",
  clientContext: "",
  solution: "",
  keyActors: "",
  staffUserIds: [],
  leadUserId: "",
  stakeholderContactIds: [],
  mainStakeholderContactId: "",
}

describe("the app form's account field comes first, and opens focused (Aurora, 21 Sep 2026)", () => {
  it("a NEW app: the account Field sits before the name Field in document order", () => {
    render(
      <AppFormDialog
        open
        onOpenChange={() => {}}
        accounts={[]}
        members={[]}
        onSubmit={vi.fn(async () => {})}
        teamId="t1"
      />
    )
    // The kit's Dialog portals its content onto `document.body` rather than
    // rendering inline under `render()`'s own container, so this reads off
    // the document the way a real reader (or a screen reader) would, not off
    // the render root.
    const accountField = document.querySelector("#app-account") as HTMLElement
    const nameField = document.querySelector("#app-name") as HTMLElement
    expect(accountField, "the account picker never rendered on a new app").toBeTruthy()
    expect(nameField, "the name input never rendered").toBeTruthy()
    // DOCUMENT_POSITION_FOLLOWING on nameField (relative to accountField) means
    // accountField comes first — the same check R83-style tab-order suites in
    // this file family already use.
    expect(accountField.compareDocumentPosition(nameField) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("a NEW app: the dialog opens with focus on the account picker, not the name field", () => {
    render(
      <AppFormDialog
        open
        onOpenChange={() => {}}
        accounts={[]}
        members={[]}
        onSubmit={vi.fn(async () => {})}
        teamId="t1"
      />
    )
    expect(document.activeElement?.id).toBe("app-account")
    expect(document.activeElement?.id).not.toBe("app-name")
  })

  it("an EDIT: the account field never renders (whose system it is cannot be changed), and the name field carries the opening focus instead", () => {
    render(
      <AppFormDialog
        open
        onOpenChange={() => {}}
        accounts={[]}
        members={[]}
        initial={INITIAL}
        teamId="t1"
        onSubmit={vi.fn(async () => {})}
      />
    )
    expect(document.querySelector("#app-account")).toBeNull()
    expect(document.activeElement?.id).toBe("app-name")
  })
})
