// THE STAGE WORD RETURNS — client ruling, 19 Sep 2026, verbatim: "on the
// stages in tickets, above the date i need te sateg name!" ("the stage
// name.") ticket-stages.tsx's own header ("AND THEN BACK") carries the full
// account of why this supersedes the 17 Sep "don't put the [stage word]
// here" ruling `ticket-stages-shrink.test.tsx` still proves the rest of.
//
// WHAT THIS FILE PROVES, over a real render: every rung on the ladder draws
// its stage's name (the six live words `HELP_STATUS` already carries, plus
// "Waiting on you" for the one retired stage a real ticket can still show),
// the name sits ABOVE the date inside the same rung, a rung with a recorded
// span draws name + date, and a rung with none — because it is still ahead
// of the ticket, or because it is a gap in the recording — draws the name
// alone.

import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { HelpStatus, TicketStageHistory } from "@shared/types"

const history = vi.hoisted(() => ({ value: null as unknown as TicketStageHistory }))

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return {
    ...actual,
    content: {
      ...actual.content,
      helpStages: async () => history.value,
    },
  }
})

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

import { TicketStages } from "@/components/tickets/ticket-stages"

afterEach(cleanup)
beforeEach(() => {
  history.value = null as unknown as TicketStageHistory
})

function renderLadder(status: HelpStatus, h: TicketStageHistory) {
  history.value = h
  return render(<TicketStages ticketId="help-1" status={status} />)
}

// The live ladder, in state-machine order — the same order `buildRungs`
// draws an ordinary (never-reopened) ticket's rungs in.
const LIVE_NAMES = ["New", "Triaged", "Scheduled", "In progress", "Ready", "Resolved"]

describe("the stage name, restored 19 Sep 2026 above the date on every rung", () => {
  it("draws every live stage's name, even with no history recorded at all", async () => {
    renderLadder("new", {
      recorded: false,
      fromCreation: false,
      events: [],
      spans: [],
      reopens: null,
    })
    const region = await screen.findByRole("group", { name: "Stages" })
    for (const name of LIVE_NAMES) {
      expect(within(region).getByText(name), `"${name}" must print on the ladder`).toBeTruthy()
    }
  })

  it("draws a reached, recorded rung as name + date; a reached-but-unrecorded rung as the name alone; a later rung as the name alone", async () => {
    renderLadder("in_progress", {
      recorded: true,
      fromCreation: true,
      events: [],
      spans: [
        { status: "new", from: "2026-09-01T09:00:00.000Z", to: "2026-09-02T14:00:00.000Z", workingDays: 1 },
        { status: "triaged", from: "2026-09-02T14:00:00.000Z", to: "2026-09-16T14:00:00.000Z", workingDays: 10 },
        // NOTE: no "scheduled" span — the gap this file's own header calls
        // out, said by the missing date rather than by a sentence.
        { status: "in_progress", from: "2026-09-16T14:00:00.000Z", to: null, workingDays: 0 },
      ],
      reopens: null,
    })
    await screen.findByText(/Sep 16/)
    const region = screen.getByRole("group", { name: "Stages" })
    const items = within(region).getAllByRole("listitem")
    expect(items).toHaveLength(6)
    const [newItem, triagedItem, scheduledItem, inProgressItem, readyItem, resolvedItem] = items

    // REACHED AND RECORDED — name above its own date.
    expect(within(newItem).getByText("New")).toBeTruthy()
    expect(within(newItem).getByText(/Sep 1/)).toBeTruthy()
    expect(within(triagedItem).getByText("Triaged")).toBeTruthy()
    expect(within(triagedItem).getByText(/Sep 2/)).toBeTruthy()

    // REACHED, BUT NO RECORD OF THE MOVE — name only, the gap said by the
    // date's absence rather than by a sentence (this file's own header,
    // carried over from ticket-stages.tsx's own).
    expect(within(scheduledItem).getByText("Scheduled")).toBeTruthy()
    expect(within(scheduledItem).queryByText(/\d{2}h/)).toBeNull()

    // CURRENT, WITH AN OPEN (still-recording) SPAN — name + date.
    expect(within(inProgressItem).getByText("In progress")).toBeTruthy()
    expect(within(inProgressItem).getByText(/Sep 16/)).toBeTruthy()

    // LATER — name only, no date, in the kit's own disabled ink.
    expect(within(readyItem).getByText("Ready")).toBeTruthy()
    expect(within(readyItem).queryByText(/\d{2}h/)).toBeNull()
    expect(within(resolvedItem).getByText("Resolved")).toBeTruthy()
    expect(within(resolvedItem).queryByText(/\d{2}h/)).toBeNull()

    // THE LATER INK IS THE KIT'S OWN — `status-stepper.tsx`'s label wrapper
    // colours whatever node it is handed by the rung's position, so a later
    // rung's name inherits `text-ink-tertiary` for free rather than this
    // component drawing its own disabled colour.
    const readyLabel = readyItem.querySelector('[data-slot="status-stepper-label"]')
    expect(readyLabel?.className).toContain("text-ink-tertiary")
    const newLabel = newItem.querySelector('[data-slot="status-stepper-label"]')
    expect(newLabel?.className).not.toContain("text-ink-tertiary")
  })

  it("draws the retired stage's own word, 'Waiting on you', on a ticket that really passed through it", async () => {
    renderLadder("resolved", {
      recorded: true,
      fromCreation: true,
      events: [],
      spans: [
        {
          status: "awaiting_validation",
          from: "2026-08-01T09:00:00.000Z",
          to: "2026-08-03T09:00:00.000Z",
          workingDays: 2,
        },
        { status: "new", from: "2026-08-03T09:00:00.000Z", to: "2026-08-04T09:00:00.000Z", workingDays: 1 },
        { status: "resolved", from: "2026-08-10T09:00:00.000Z", to: null, workingDays: 4 },
      ],
      reopens: null,
    })
    const region = await screen.findByRole("group", { name: "Stages" })
    expect(within(region).getByText("Waiting on you")).toBeTruthy()
  })
})
