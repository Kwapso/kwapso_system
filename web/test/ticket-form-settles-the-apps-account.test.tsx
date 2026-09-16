// T3655 — "When raising tickets or stories on any record from inside its
// parent record (in this case, when I'm creating a ticket from inside the
// detail screen of an app), it does not make sense to select the app or the
// account or anything like that… [it] should just grab already available
// information from the parent."
//
// The App field has always settled correctly when this dialog is opened with
// `fixedApp` (app-detail.tsx's own create button). The Account field did not:
// every app has exactly one owning account (or none, for the agency's own
// systems), so the account is just as much a fact about where you are
// standing as the app itself, and asking it again was the gap. Driven through
// the real dialog because the fault is what a PICKER OFFERS, not whether a
// function returns the right id — a source scan of `fixedApp` usage would
// have found the App field settled and reported nothing wrong with the
// Account field sitting right below it.

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return {
    ...actual,
    tenancy: {
      ...actual.tenancy,
      apps: async () => ({
        apps: [
          { id: "app-with-client", name: "Driver app", accountId: "acct-1" },
          { id: "app-agency-own", name: "Internal tools", accountId: null },
        ],
        total: 2,
      }),
      appModules: async () => ({ modules: [] }),
      accountDetail: async (id: string) => ({
        account: { id, name: id === "acct-1" ? "Bergman S.A." : "unexpected" },
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
  sessionStorage.clear()
})

describe("the ticket form settles the account an app already answers", () => {
  it("shows the app's own client as a fact, never a picker", async () => {
    render(
      <HelpFormDialog
        open
        onOpenChange={() => {}}
        onSubmit={vi.fn(async () => {})}
        helpTypeOptions={["Issue"]}
        fixedApp={{ id: "app-with-client", name: "Driver app" }}
        teamId="team-1"
        draftKey="help:add:app:app-with-client"
      />
    )
    expect(await screen.findByText("Bergman S.A., a ticket can't be moved to another account.")).toBeTruthy()
    expect(screen.queryByPlaceholderText(/Search companies/i)).toBeNull()
  })

  it("settles to 'Ours, no account' for the agency's own app — still a fact, not a question", async () => {
    render(
      <HelpFormDialog
        open
        onOpenChange={() => {}}
        onSubmit={vi.fn(async () => {})}
        helpTypeOptions={["Issue"]}
        fixedApp={{ id: "app-agency-own", name: "Internal tools" }}
        teamId="team-1"
        draftKey="help:add:app:app-agency-own"
      />
    )
    // R81 (16 Sep 2026): the settled text glues the app's own name to the
    // words, so it reads as a value and not a bare hint sentence.
    expect(await screen.findByText("Internal tools — Ours, no account")).toBeTruthy()
    // THE DISCRIMINATING CHECK. The untouched PICKER also shows "Ours, no
    // account" as its own placeholder — so the sentence alone proves nothing;
    // what proves the field settled is that there is no control left to open.
    expect(screen.queryByRole("combobox", { name: "Account" })).toBeNull()
  })
})
