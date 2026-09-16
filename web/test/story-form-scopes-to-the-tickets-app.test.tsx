// T3651 — "Creating a story from an app's detail screen only shows 3
// processes; creating from inside a ticket shows processes from every app.
// Filter isn't scoped to the current app."
//
// `onThisApp` (story-form-dialog.tsx) has always filtered correctly ONCE
// `appId` is known — the bug is that opening the dialog from a ticket
// (`fixedTicket`, no `fixedApp`) left `appId` at its blank default until
// somebody picked one by hand, so every process/sprint/ticket in the team was
// offered regardless of which app the ticket itself was about. The fix reads
// the ticket's own `appId` straight out of the `tickets` prop the dialog
// already receives, the same way `fixedApp` has always settled the field —
// so the app is a fact about where the dialog was opened, not a second
// question, no matter which of the two entry points asked.

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { StoryFormDialog } from "@/components/work/story-form-dialog"

vi.mock("@/lib/api", () => ({ ApiFailure: class extends Error {} }))

afterEach(() => {
  cleanup()
  sessionStorage.clear()
})

const APP_A = "APP_A"
const APP_B = "APP_B"

function renderFromTicket() {
  return render(
    <StoryFormDialog
      open
      onOpenChange={() => {}}
      teamId="team-1"
      sprints={[]}
      apps={[
        { id: APP_A, name: "Driver app" },
        { id: APP_B, name: "Ops console" },
      ]}
      fixedTicket={{ id: "T1", label: "T0412 · Something is broken" }}
      tickets={[
        { id: "T1", label: "Something is broken", appId: APP_A },
        { id: "T2", label: "A different app's request", appId: APP_B },
      ]}
      members={[]}
      appStaff={new Map()}
      processes={[
        { id: "P1", name: "Only the driver app's own process", appId: APP_A },
        { id: "P2", name: "The other app's process", appId: APP_B },
      ]}
      storyTypes={["Feature"]}
      categories={["Client-requested", "Internal"]}
      draftKey="story:add:ticket:T1"
      onSubmit={vi.fn(async () => {})}
    />
  )
}

describe("the story form scopes to the ticket's own app, not just the app screen's", () => {
  it("settles the App field on the ticket's own app — a fact, not a picker", async () => {
    renderFromTicket()
    // A SETTLED field is text, not a control: no "Search apps…" button, no
    // "Required" marker left over the fact it used to gate (settledAppField).
    expect(await screen.findByText("Driver app")).toBeTruthy()
    expect(screen.queryByText("Ops console")).toBeNull()
    expect(screen.queryByPlaceholderText(/Search apps/i)).toBeNull()
  })

  it("offers only the ticket's own app's processes, never the whole team's", async () => {
    renderFromTicket()
    const trigger = await screen.findByRole("combobox", { name: /Processes/i })
    fireEvent.click(trigger)
    const listbox = await screen.findByRole("listbox")
    expect(within(listbox).getByText("Only the driver app's own process")).toBeTruthy()
    expect(within(listbox).queryByText("The other app's process")).toBeNull()
  })
})
