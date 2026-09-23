// T3843/T3842 — regressions of T3821/T3822. A story created from a ticket's
// own Related stories tab saved with no app at all (so it could never show
// on the app's own Stories tab, no matter what cache key was patched — see
// story-from-ticket-reaches-the-apps-tab.test.tsx's own header for the half
// of this that a cache-key test cannot see), and the same ticket's process
// picker fell back to the whole team's list.
//
// `story-form-dialog.tsx` has always settled the App field either off
// `fixedApp` directly, or by searching `fixedTicket.id` inside the `tickets`
// prop (T3651/T3655's own fix, proved by
// story-form-scopes-to-the-tickets-app.test.tsx). The SEARCH half is the
// fault: `tickets` is `useStoryFormOptions`'s own `options.tickets`, which
// reads a PAGED list (R14, `listFetch.help`, page one only) — once a team
// has enough tickets that the one being viewed has scrolled off page one,
// the search misses, `derivedApp` comes back undefined, and the App field
// silently reopens as an unanswered picker. `help-detail.tsx` now passes
// `fixedApp` straight off the `ticket` record it already holds (the same
// shape `app-detail.tsx` and `sprint-detail.tsx` have always used), so this
// dialog is never left to guess. Proved here by handing it a `tickets` list
// that does NOT contain the fixed ticket at all — a page-one miss, plain and
// exact — with `fixedApp` set, the way `help-detail.tsx` now calls it.

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

function renderWithFixedAppAndNoMatchingTicket() {
  const onSubmit = vi.fn(async () => undefined)
  render(
    <StoryFormDialog
      open
      onOpenChange={() => {}}
      teamId="team-1"
      sprints={[]}
      apps={[
        { id: APP_A, name: "Driver app" },
        { id: APP_B, name: "Ops console" },
      ]}
      // THE TICKET BEING VIEWED IS NOT IN THIS LIST — the page-one miss.
      // `story-form-scopes-to-the-tickets-app.test.tsx` proves the search
      // path when the ticket IS present; this proves the fallback when it
      // is not, which is exactly what a team with thousands of tickets hits.
      fixedApp={{ id: APP_A, name: "Driver app" }}
      fixedTicket={{ id: "T-not-on-page-one", label: "T9999 · Something is broken" }}
      tickets={[{ id: "T-some-other-ticket", label: "A different request", appId: APP_B }]}
      members={[]}
      appStaff={new Map()}
      processes={[
        { id: "P1", name: "Only the driver app's own process", appId: APP_A },
        { id: "P2", name: "The other app's process", appId: APP_B },
      ]}
      storyTypes={["Feature"]}
      categories={["Client-requested", "Internal"]}
      draftKey="story:add:ticket:T-not-on-page-one"
      onSubmit={onSubmit}
    />
  )
  return onSubmit
}

describe("the story form settles its App field from fixedApp, never only by searching a paged tickets list", () => {
  it("settles the App field on the ticket's own app — a fact, not a picker", async () => {
    renderWithFixedAppAndNoMatchingTicket()
    expect(await screen.findByText("Driver app")).toBeTruthy()
    expect(screen.queryByPlaceholderText(/Search apps/i)).toBeNull()
  })

  it("offers only that app's processes, never the whole team's", async () => {
    renderWithFixedAppAndNoMatchingTicket()
    const trigger = await screen.findByRole("combobox", { name: /Processes/i })
    fireEvent.click(trigger)
    const listbox = await screen.findByRole("listbox")
    expect(within(listbox).getByText("Only the driver app's own process")).toBeTruthy()
    expect(within(listbox).queryByText("The other app's process")).toBeNull()
  })

  it("submits with the app's real id, never blank", async () => {
    const onSubmit = renderWithFixedAppAndNoMatchingTicket()
    fireEvent.change(await screen.findByPlaceholderText(/Move dispatch/i), {
      target: { value: "Fix the thing" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Feature" }))
    fireEvent.click(screen.getByRole("combobox", { name: /Processes/i }))
    fireEvent.click(await screen.findByRole("option", { name: "Only the driver app's own process" }))
    fireEvent.click(screen.getByRole("button", { name: /^Submit$/i }))
    expect(onSubmit).toHaveBeenCalled()
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ appId: APP_A, ticketId: "T-not-on-page-one" })
  })
})
