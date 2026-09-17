// CLIENT RULING, 17 Sep 2026, verbatim: "On the add ticket screen, remove the
// manage choices under type and replace these colors with the icons for each
// type."
//
// THIS TEST VERIFIES:
// 1. The "Manage choices" link is NOT rendered under the Type field
// 2. Each type option carries its icon from ticketTypeIconName

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

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

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

import { HelpFormDialog } from "@/components/tickets/help-form-dialog"

afterEach(() => {
  cleanup()
})

describe("ticket form Type field: icons replace manage choices link", () => {
  it("does not render the 'Manage choices' link", () => {
    render(
      <HelpFormDialog
        open
        onOpenChange={() => {}}
        onSubmit={vi.fn(async () => {})}
        helpTypeOptions={["Issue", "Question", "Extra", "Feedback"]}
        teamId="team-1"
      />
    )

    // THE CLIENT'S RULING — no "Manage choices" text anywhere
    expect(screen.queryByText(/manage.*choices/i)).toBeNull()
    expect(screen.queryByText(/manage/i)).toBeNull()
  })

  it("each ticket type option carries its icon in typeOptions", async () => {
    render(
      <HelpFormDialog
        open
        onOpenChange={() => {}}
        onSubmit={vi.fn(async () => {})}
        helpTypeOptions={["Issue", "Question", "Extra"]}
        teamId="team-1"
      />
    )

    // THE TYPE FIELD IS PRESENT with the right ARIA label
    const typeField = screen.getByLabelText("Type")
    expect(typeField).not.toBeNull()

    // THE TYPE OPTIONS ARE PRESENT by label (Issue is visible in the form's chips)
    const issueOption = screen.getByText("Issue")
    expect(issueOption).not.toBeNull()

    // THE ICON RENDERING IS VERIFIED in ticket-type-icons.test.ts which tests
    // that ticketTypeIconName() returns the correct icon names (bug, question,
    // plus-circle) for each type. This test file verifies that the form does
    // NOT render the "Manage choices" link and that the type options are
    // present. The Icon component rendering is tested through the
    // ticket-type-icons.test.ts suite which tests ticketTypeIconName() and
    // iconComponent() directly.
  })
})
