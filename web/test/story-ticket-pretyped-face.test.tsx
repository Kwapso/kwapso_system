// THE STORY FORM'S TICKET PICKER, PRE-TYPED HALF — Aurora's ruling, 21 Sep
// 2026, verbatim: "on every choice component where I can choose a ticket,
// show me the type as the icon everywhere."
//
// `web/lib/picker-sources.ts`'s `searchTickets` already handed the SEARCHED
// half of this picker a face (`ticketFace`, shared/web/ticket-face.tsx) —
// proven by `ticket-face.test.tsx`. The PRE-TYPED list, painted before
// anything is typed (`useStoryFormOptions`'s own `tickets`,
// stories-screen.tsx), used to map a ticket down to `{ id, label, appId }`,
// dropping `helpType` on the way, so that half of the same picker stayed
// faceless. This suite drives the real `StoryFormDialog` over a pre-typed
// `tickets` prop the way `useStoryFormOptions` now builds it (carrying
// `helpType`) and proves the option rows it paints before any search settles
// carry the type's own icon, and that two different types draw two
// different icons — the same "not vacuous" shape `ticket-face.test.tsx`
// itself checks.

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

// THE SEARCH DOOR STAYS UNRESOLVED ON PURPOSE. `RecordPicker` (server mode)
// paints `options` — the pre-typed list — until its own `search` call
// answers; rejecting it here keeps that first paint the ONLY paint, so the
// rows this suite reads are provably the pre-typed ones and not a search
// result that happened to look the same.
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return {
    ...actual,
    ApiFailure: class extends Error {},
    content: {
      ...actual.content,
      help: async () => {
        throw new Error("not used in this suite — the pre-typed list is what is read")
      },
    },
  }
})

import { StoryFormDialog } from "@/components/work/story-form-dialog"

afterEach(() => {
  cleanup()
  sessionStorage.clear()
})

function renderDialog() {
  return render(
    <StoryFormDialog
      open
      onOpenChange={() => {}}
      teamId="team-1"
      sprints={[]}
      apps={[{ id: "app-1", name: "Driver app" }]}
      fixedApp={{ id: "app-1", name: "Driver app" }}
      tickets={[
        { id: "t-issue", label: "T0001 · The board will not load", appId: "app-1", helpType: "Issue" },
        { id: "t-question", label: "T0002 · How does dispatch work", appId: "app-1", helpType: "Question" },
      ]}
      members={[]}
      appStaff={new Map()}
      processes={[]}
      storyTypes={["Feature"]}
      categories={["Client-requested", "Enabler"]}
      draftKey="story:add:pretyped-face-test"
      onSubmit={vi.fn(async () => {})}
    />
  )
}

describe("the story form's pre-typed ticket options carry the type's own face", () => {
  it("paints an icon on the pre-typed row, before any search has answered", async () => {
    renderDialog()
    const trigger = document.getElementById("story-ticket")
    expect(trigger, "the ticket picker's own trigger").toBeTruthy()
    fireEvent.click(trigger!)

    const option = await screen.findByRole("option", { name: /T0001/ })
    expect(within(option).getByText(/The board will not load/)).toBeTruthy()

    // THE FACE — the same box `PickerOption.icon` draws through everywhere
    // else in the app (record-picker.tsx's own `row`), `aria-hidden` because
    // a face carries no meaning the label does not.
    const face = option.querySelector("span.bg-muted[aria-hidden]")
    expect(face, "the pre-typed row draws a face at all").toBeTruthy()
    expect(face?.querySelector("svg"), "the face is a real icon, not empty").toBeTruthy()
  })

  it("draws a DIFFERENT icon for a different ticket type — not one fixed glyph for every row", async () => {
    renderDialog()
    fireEvent.click(document.getElementById("story-ticket")!)

    const issueRow = await screen.findByRole("option", { name: /T0001/ })
    const questionRow = await screen.findByRole("option", { name: /T0002/ })
    const issueFace = issueRow.querySelector("span.bg-muted[aria-hidden]")
    const questionFace = questionRow.querySelector("span.bg-muted[aria-hidden]")
    expect(issueFace?.innerHTML).toBeTruthy()
    expect(questionFace?.innerHTML).toBeTruthy()
    expect(issueFace?.innerHTML).not.toBe(questionFace?.innerHTML)
  })
})
