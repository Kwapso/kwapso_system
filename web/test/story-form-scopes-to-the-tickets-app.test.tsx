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

// F13/R79 — the client's ruling, 16 Sep 2026, verbatim: "That's still not
// correct. For example, on Add Story, I don't see myself preselected. Make
// sure you fix it everywhere, not only here." Reproduced here exactly as
// found on staging: an app WITH staff on file, none of whom is the signed-in
// member, used to drop her from the "Who's doing it" pill row entirely
// (`staffedOn`'s narrowing, `lib/members.ts`) rather than merely leave her
// pill unselected — the prop's own old comment said as much ("" when the
// signed-in user is not assignable here"). She must always be offered AND
// preselected on a create, regardless of the chosen app's own staffing.
describe("the signed-in member is always offered and preselected, even on an app that does not staff her", () => {
  const APP_C = "APP_C"
  const ME = "u-me"
  const OTHER_STAFF = "u-other"

  function renderOnAppWithoutMe() {
    return render(
      <StoryFormDialog
        open
        onOpenChange={() => {}}
        teamId="team-1"
        sprints={[]}
        apps={[{ id: APP_C, name: "Console app" }]}
        fixedApp={{ id: APP_C, name: "Console app" }}
        tickets={[]}
        members={[
          { id: ME, name: "Alaap", photo: null },
          { id: OTHER_STAFF, name: "Priya", photo: null },
        ]}
        // THE APP HAS STAFF — this is not the fail-open case (an app with NO
        // staff, which already offered everybody before this fix). It has a
        // staff list, and the signed-in member is deliberately not on it.
        appStaff={new Map([[APP_C, [OTHER_STAFF]]])}
        processes={[]}
        storyTypes={["Feature"]}
        categories={["Client-requested", "Internal"]}
        draftKey="story:add:app-without-me"
        defaultAssigneeId={ME}
        onSubmit={vi.fn(async () => {})}
      />
    )
  }

  it("still shows her pill in the row (offered)", async () => {
    renderOnAppWithoutMe()
    expect(await screen.findByRole("radio", { name: /Alaap/i })).toBeTruthy()
    // The app's own staff stays offered too — this is a widening, not a
    // replacement of the narrowing.
    expect(screen.getByRole("radio", { name: /Priya/i })).toBeTruthy()
  })

  it("starts her pill selected (preselected)", async () => {
    renderOnAppWithoutMe()
    const mine = await screen.findByRole("radio", { name: /Alaap/i })
    expect(mine.getAttribute("aria-checked")).toBe("true")
    expect(screen.getByRole("radio", { name: /Priya/i }).getAttribute("aria-checked")).toBe("false")
  })
})
