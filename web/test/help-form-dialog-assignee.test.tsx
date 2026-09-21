// "ASSIGNED TO" ON THE TICKET'S OWN EDIT FORM. Aurora's ruling, 21 Sep 2026,
// verbatim, reading `AssignedToCard`'s own pen back: "ok, but rmeove the edit
// button (this can be editedfrom dtory edit screen). rmeove the 'use the apps
// lead' text." The card's own pen, Select and clear button are gone
// (help-stakeholders.test.tsx proves that side); the one remaining door onto
// a ticket's `assigneeId` is this field, placed right after the App field.
//
// THIS FILE PROVES:
//   1. The field renders as the kit's own `Select`, sourced from
//      `assigneeMembers`, with a face (R90) on every option.
//   2. Options are sorted A to Z (R75) and carry no "Nobody" entry (R79,
//      a staff picker never offers one).
//   3. Picking somebody reaches `onSubmit` as `assigneeId`.
//   4. Leaving the field untouched sends `undefined`, never `null`; this
//      form has no clear control, so it can only ever set a person.

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return {
    ...actual,
    tenancy: {
      ...actual.tenancy,
      apps: async () => ({ apps: [], total: 0 }),
      appModules: async () => ({ modules: [] }),
      accountDetail: async () => ({
        account: { id: "team-1", name: "Test Team" },
        links: [],
      }),
    },
    content: {
      ...actual.content,
      sprints: async () => ({ sprints: [], total: 0 }),
    },
  }
})

vi.mock("@shared/ui/components/sonner/sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}))

/** Radix measures itself and captures the pointer; jsdom does neither, the
 * same polyfill `help-form-dialog-raised-by.test.tsx` and
 * `help-stakeholders.test.tsx` carry for the identical reason. */
beforeAll(() => {
  Object.assign(window.HTMLElement.prototype, {
    scrollIntoView: () => {},
    hasPointerCapture: () => false,
    releasePointerCapture: () => {},
    setPointerCapture: () => {},
  })
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

import { HelpFormDialog } from "@/components/tickets/help-form-dialog"

afterEach(cleanup)

const EDIT_INITIAL = {
  titleEn: "The dispatch board will not load",
  description: "<p>None of my drivers can see today's routes.</p>",
  helpType: "Bug",
  accountId: null,
  appId: null,
  moduleId: null,
  raisedByContactId: null,
  assigneeId: null,
}

const MEMBERS = [
  { id: "u-staff", name: "Petya Bletsova", photo: null },
  { id: "u-lead", name: "Alaap Kanchwala", photo: null },
]

/** The dialog renders in a PORTAL, so the form is on the document rather than
 * in render()'s own container, the same helper `ticket-names-its-client.test.tsx`
 * uses. Fires the form's own `onSubmit` directly, bypassing the Submit
 * button's `disabled` state, which is not what this file is about. */
const submitForm = () => fireEvent.submit(document.querySelector("form") as HTMLFormElement)

describe("Assigned to, the kit Select sourced from assigneeMembers", () => {
  it("renders as a combobox, not a pill row, with a face on every option", async () => {
    render(
      <HelpFormDialog
        open
        onOpenChange={() => {}}
        onSubmit={vi.fn(async () => {})}
        helpTypeOptions={["Bug"]}
        teamId="team-1"
        initial={EDIT_INITIAL}
        helpId="help-1"
        assigneeMembers={MEMBERS}
      />
    )
    const trigger = document.getElementById("help-assignee") as HTMLElement
    expect(trigger).toBeTruthy()
    expect(trigger.getAttribute("role")).toBe("combobox")
    fireEvent.click(trigger)
    const options = await screen.findAllByRole("option")
    expect(options.length).toBe(MEMBERS.length)
    for (const option of options) {
      // R90: every SelectItem over a person carries its own face.
      expect(option.querySelector("[aria-hidden]")).toBeTruthy()
      expect(option.textContent?.toLowerCase()).not.toMatch(/nobody/)
    }
  })

  it("sorts the options A to Z (R75), regardless of the order they arrive in", async () => {
    render(
      <HelpFormDialog
        open
        onOpenChange={() => {}}
        onSubmit={vi.fn(async () => {})}
        helpTypeOptions={["Bug"]}
        teamId="team-1"
        initial={EDIT_INITIAL}
        helpId="help-1"
        assigneeMembers={MEMBERS}
      />
    )
    fireEvent.click(document.getElementById("help-assignee") as HTMLElement)
    const options = await screen.findAllByRole("option")
    // MEMBERS arrives Petya-then-Alaap; the row draws Alaap first.
    expect(options[0]?.textContent).toContain("Alaap Kanchwala")
    expect(options[1]?.textContent).toContain("Petya Bletsova")
  })

  it("picking somebody reaches onSubmit as assigneeId", async () => {
    const onSubmit = vi.fn(async (_input: { assigneeId?: string }) => {})
    render(
      <HelpFormDialog
        open
        onOpenChange={() => {}}
        onSubmit={onSubmit}
        helpTypeOptions={["Bug"]}
        teamId="team-1"
        initial={EDIT_INITIAL}
        helpId="help-1"
        assigneeMembers={MEMBERS}
      />
    )
    fireEvent.click(document.getElementById("help-assignee") as HTMLElement)
    const option = await screen.findByRole("option", { name: /Petya Bletsova/ })
    fireEvent.click(option)
    submitForm()
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ assigneeId: "u-staff" })
  })

  it("sends undefined, never null, when nobody touches the field (this form has no clear control)", async () => {
    const onSubmit = vi.fn(async (_input: { assigneeId?: string }) => {})
    render(
      <HelpFormDialog
        open
        onOpenChange={() => {}}
        onSubmit={onSubmit}
        helpTypeOptions={["Bug"]}
        teamId="team-1"
        initial={EDIT_INITIAL}
        helpId="help-1"
        assigneeMembers={MEMBERS}
      />
    )
    submitForm()
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ assigneeId: undefined })
  })

  it("pre-lights the ticket's own assignee when one is already set", () => {
    render(
      <HelpFormDialog
        open
        onOpenChange={() => {}}
        onSubmit={vi.fn(async () => {})}
        helpTypeOptions={["Bug"]}
        teamId="team-1"
        initial={{ ...EDIT_INITIAL, assigneeId: "u-lead" }}
        helpId="help-1"
        assigneeMembers={MEMBERS}
      />
    )
    const trigger = document.getElementById("help-assignee") as HTMLElement
    expect(trigger.textContent).toContain("Alaap Kanchwala")
  })
})
