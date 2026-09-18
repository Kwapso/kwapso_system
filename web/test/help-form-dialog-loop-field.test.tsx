// "WHO TO KEEP IN THE LOOP" — moved into the ticket edit sheet from the page's
// own Stakeholders panel. Client ruling, 17 Sep 2026, reading the deployed V1
// page back, verbatim: "Remove all of this from stakeholders 'Pick someone to
// keep in the loop … You can add members, but no one is ever removed.'" The
// picker moves here; help-stakeholders.test.tsx proves it left the page.
//
// THIS FILE PROVES:
//   1. The field renders only on EDIT, and only once there is somebody left
//      to add — never on a create, never with an empty addable list.
//   2. It carries NO caption and NO trailing sentence (R81 — a form carries
//      no hints; the field's own label is the whole instruction).
//   3. A click calls the SAME add-only door the page used to call directly.

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
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

afterEach(cleanup)

const EDIT_INITIAL = {
  titleEn: "The dispatch board will not load",
  description: "<p>None of my drivers can see today's routes.</p>",
  helpType: "Bug",
  accountId: null,
  appId: null,
  moduleId: null,
  raisedByContactId: null,
}

const STAKEHOLDER = { userId: "u-2", name: "Aurora", email: "aurora@kwapso.com", imageUrl: null, origin: "admin" as const }
const ADDABLE = { id: "u-4", name: "Blackbox", photo: null }

describe("the loop field renders only where it can be answered", () => {
  it("does not render on a CREATE — there is no ticket to add a stakeholder to yet", () => {
    render(
      <HelpFormDialog
        open
        onOpenChange={() => {}}
        onSubmit={vi.fn(async () => {})}
        helpTypeOptions={["Issue"]}
        teamId="team-1"
        stakeholders={[]}
        loopMembers={[ADDABLE]}
        canAddToLoop
        onAddStakeholder={vi.fn(async () => {})}
      />
    )
    expect(screen.queryByText("Who to keep in the loop")).toBeNull()
  })

  it("does not render on an edit when nobody is left to add", () => {
    render(
      <HelpFormDialog
        open
        onOpenChange={() => {}}
        onSubmit={vi.fn(async () => {})}
        helpTypeOptions={["Bug"]}
        teamId="team-1"
        initial={EDIT_INITIAL}
        helpId="help-1"
        stakeholders={[STAKEHOLDER]}
        loopMembers={[]}
        canAddToLoop
        onAddStakeholder={vi.fn(async () => {})}
      />
    )
    expect(screen.queryByText("Who to keep in the loop")).toBeNull()
  })

  it("does not render when the caller has not gated the picker on (canAddToLoop false)", () => {
    render(
      <HelpFormDialog
        open
        onOpenChange={() => {}}
        onSubmit={vi.fn(async () => {})}
        helpTypeOptions={["Bug"]}
        teamId="team-1"
        initial={EDIT_INITIAL}
        helpId="help-1"
        stakeholders={[]}
        loopMembers={[ADDABLE]}
        canAddToLoop={false}
        onAddStakeholder={vi.fn(async () => {})}
      />
    )
    expect(screen.queryByText("Who to keep in the loop")).toBeNull()
  })

  it("renders on an EDIT, once there is somebody left to add, gated on", async () => {
    render(
      <HelpFormDialog
        open
        onOpenChange={() => {}}
        onSubmit={vi.fn(async () => {})}
        helpTypeOptions={["Bug"]}
        teamId="team-1"
        initial={EDIT_INITIAL}
        helpId="help-1"
        stakeholders={[STAKEHOLDER]}
        loopMembers={[ADDABLE]}
        canAddToLoop
        onAddStakeholder={vi.fn(async () => {})}
      />
    )
    expect(await screen.findByText("Who to keep in the loop")).toBeTruthy()
    expect(screen.getByText("Blackbox")).toBeTruthy()
  })
})

describe("R81 — the field carries no hint, only its own label", () => {
  it("renders neither the old caption nor the old trailing sentence", async () => {
    render(
      <HelpFormDialog
        open
        onOpenChange={() => {}}
        onSubmit={vi.fn(async () => {})}
        helpTypeOptions={["Bug"]}
        teamId="team-1"
        initial={EDIT_INITIAL}
        helpId="help-1"
        stakeholders={[STAKEHOLDER]}
        loopMembers={[ADDABLE]}
        canAddToLoop
        onAddStakeholder={vi.fn(async () => {})}
      />
    )
    await screen.findByText("Who to keep in the loop")
    expect(screen.queryByText("Pick someone to keep in the loop")).toBeNull()
    expect(screen.queryByText("You can add members, but no one is ever removed.")).toBeNull()
  })
})

describe("the picker fires the same add-only door the page used to call", () => {
  it("calls onAddStakeholder with the picked member's id when a chip is pressed", async () => {
    const onAdd = vi.fn(async () => {})
    render(
      <HelpFormDialog
        open
        onOpenChange={() => {}}
        onSubmit={vi.fn(async () => {})}
        helpTypeOptions={["Bug"]}
        teamId="team-1"
        initial={EDIT_INITIAL}
        helpId="help-1"
        stakeholders={[STAKEHOLDER]}
        loopMembers={[ADDABLE]}
        canAddToLoop
        onAddStakeholder={onAdd}
      />
    )
    const chip = await screen.findByText("Blackbox")
    fireEvent.click(chip.closest("button") as HTMLElement)
    expect(onAdd).toHaveBeenCalledWith("u-4")
  })
})

describe("18 Sep 2026 — 'who to keep in the loop should be horizontal'", () => {
  // Client ruling, verbatim, same batch as the raised-by dropdown. The row
  // was already horizontal (`StaffPillPicker`'s own `flex flex-wrap`); what
  // changed is that it now shows the FULL roster, with whoever is already on
  // the loop pressed and locked rather than filtered out of the list.
  const ALREADY_ON = { id: "u-2", name: "Aurora", photo: null }

  it("shows an already-on-the-loop teammate as a pressed, disabled chip beside the addable ones — one wrapping row, not a vertical list", async () => {
    render(
      <HelpFormDialog
        open
        onOpenChange={() => {}}
        onSubmit={vi.fn(async () => {})}
        helpTypeOptions={["Bug"]}
        teamId="team-1"
        initial={EDIT_INITIAL}
        helpId="help-1"
        stakeholders={[STAKEHOLDER]}
        loopMembers={[ALREADY_ON, ADDABLE]}
        canAddToLoop
        onAddStakeholder={vi.fn(async () => {})}
      />
    )
    // Aurora (STAKEHOLDER.userId === ALREADY_ON.id) is drawn — not hidden —
    // and cannot be clicked off: `aria-pressed`, `disabled`, same shape
    // `StaffPillPicker`'s own `lockedIds` contract draws everywhere else.
    const aurora = await screen.findByText("Aurora")
    const auroraPill = aurora.closest("button") as HTMLButtonElement
    expect(auroraPill.getAttribute("aria-pressed")).toBe("true")
    expect(auroraPill.disabled).toBe(true)

    // Blackbox is still the live add control — clicking it still fires the
    // same add-only door, unchanged by the roster widening.
    const blackbox = screen.getByText("Blackbox")
    const blackboxPill = blackbox.closest("button") as HTMLButtonElement
    expect(blackboxPill.disabled).toBe(false)

    // ONE ROW, WRAPPING — `role="group"` is `StaffPillPicker`'s own
    // `flex flex-wrap` container; both pills share it, never a vertical stack.
    const row = auroraPill.closest('[role="group"]') as HTMLElement
    expect(row).toBeTruthy()
    expect(row).toBe(blackboxPill.closest('[role="group"]'))
    expect(row.className).toContain("flex-wrap")
  })

  it("still fires onAddStakeholder only for an unlocked pill, never for one already on the loop", async () => {
    const onAdd = vi.fn(async () => {})
    render(
      <HelpFormDialog
        open
        onOpenChange={() => {}}
        onSubmit={vi.fn(async () => {})}
        helpTypeOptions={["Bug"]}
        teamId="team-1"
        initial={EDIT_INITIAL}
        helpId="help-1"
        stakeholders={[STAKEHOLDER]}
        loopMembers={[ALREADY_ON, ADDABLE]}
        canAddToLoop
        onAddStakeholder={onAdd}
      />
    )
    const aurora = await screen.findByText("Aurora")
    fireEvent.click(aurora.closest("button") as HTMLElement)
    expect(onAdd).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText("Blackbox").closest("button") as HTMLElement)
    expect(onAdd).toHaveBeenCalledWith("u-4")
  })
})
