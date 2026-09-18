// THE LADDER, SHRUNK — client ruling, 17 Sep 2026, verbatim (the third ruling
// on this component the same day, straight after placing it above the tabs):
// "in the ticket stages, remove the stages. Make the dots smaller, and the
// date should take only one line. Unless it's a different year, just put the
// month, the day, and the hour in 24-hour format. Only put the hour, not the
// minutes, and don't put the [stage word] here. We can see the colors. My
// whole goal is that this component is just smaller."
//
// WHAT THIS FILE PROVES, over a real render: no stage word reaches the DOM
// (`stageLabel` is deleted, not merely unused — see ticket-stages.tsx's own
// header), the date line collapses to the new one-line
// `formatStageMoment` shape (month, day, year only outside the current
// calendar year, hour alone in 24-hour with no minutes), the working-day
// count and "Still here" text are gone with the old two-line drawing, and the
// wrapper carries the smaller-dot rebind (`--control-height-pill: 1.25rem`,
// the kit's own next size down from the 26px "pill" geometry).
//
// WHAT THIS FILE DOES NOT PROVE: a pixel height on real staging. The
// project's own measuring ritual (CLAUDE.md, "measure on staging, not in the
// harness") calls for a headless Playwright run against
// https://agency-staging.kwapso.app, logged in through the admin test-login
// key in the macOS Keychain (`test-login-key-kwapso`) — that key could not be
// read in this session (the harness's own credential-materialization gate
// refused it, correctly: a Bash command reading a keychain secret is exactly
// the action that gate exists to stop). So the before/after HEIGHT comparison
// the brief asked for is not in this suite; it needs a session with Keychain
// access to run the real Playwright recipe and report the two numbers. This
// suite proves the shape the shrink is supposed to produce instead — no stage
// words, one date line, the smaller rebind — which is what a height
// difference would actually be caused BY.

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

// EVERY WORD `stageLabel` USED TO PRINT — the retired stage included, since
// `HelpStatusEver` still carries it in real history rows. If any of these
// reaches the DOM the removal regressed.
const RETIRED_STAGE_WORDS = ["Waiting on you", "New", "Triaged", "Scheduled", "In progress", "Ready", "Resolved"]

function renderLadder(status: HelpStatus, h: TicketStageHistory) {
  history.value = h
  return render(<TicketStages ticketId="help-1" status={status} />)
}

describe("the ladder shrink, 17 Sep 2026 — no stage word, one date line, a smaller mark", () => {
  it("prints no visible 'Stages' title any more, 18 Sep 2026 — the name survives as an aria-label", async () => {
    renderLadder("new", {
      recorded: false,
      fromCreation: false,
      events: [],
      spans: [],
      reopens: null,
    })
    // "inside tickets temove the 'stages' as a title" — the eyebrow that
    // used to print the word is gone outright, so nothing in the rendered
    // DOM reads "Stages" as text.
    expect(await screen.findByRole("group", { name: "Stages" })).toBeTruthy()
    expect(screen.queryByText("Stages")).toBeNull()
  })

  it("prints no stage word anywhere on the ladder, once the history has loaded", async () => {
    renderLadder("in_progress", {
      recorded: true,
      fromCreation: true,
      events: [],
      spans: [
        { status: "new", from: "2026-09-01T09:00:00.000Z", to: "2026-09-02T14:00:00.000Z", workingDays: 1 },
        { status: "triaged", from: "2026-09-02T14:00:00.000Z", to: "2026-09-16T14:00:00.000Z", workingDays: 10 },
        { status: "in_progress", from: "2026-09-16T14:00:00.000Z", to: null, workingDays: 0 },
      ],
      reopens: null,
    })
    // Wait for the async stage history to land — the date line only appears
    // once a span is attached to its rung.
    await screen.findByText(/Sep 16/)
    const region = screen.getByRole("group", { name: "Stages" })
    for (const word of RETIRED_STAGE_WORDS) {
      expect(within(region).queryByText(word), `"${word}" must not print on the ladder any more`).toBeNull()
    }
  })

  it("draws the recorded moment as one line — month, day, no year (current year), hour only, 24h", async () => {
    const thisYear = new Date().getFullYear()
    renderLadder("in_progress", {
      recorded: true,
      fromCreation: true,
      events: [],
      spans: [
        {
          status: "in_progress",
          from: `${thisYear}-09-16T14:00:00.000Z`,
          to: null,
          workingDays: 3,
        },
      ],
      reopens: null,
    })
    const line = await screen.findByText(/^Sep 16 · \d{2}h$/)
    expect(line).toBeTruthy()
    // NO WORKING-DAY COUNT, NO "Still here" — both belonged to the retired
    // two-line drawing this ruling replaced.
    expect(screen.queryByText(/\d+d$/)).toBeNull()
    expect(screen.queryByText("Still here")).toBeNull()
  })

  it("adds the year only for a moment outside the current calendar year", async () => {
    renderLadder("resolved", {
      recorded: true,
      fromCreation: true,
      events: [],
      spans: [{ status: "resolved", from: "2024-12-01T14:00:00.000Z", to: null, workingDays: 2 }],
      reopens: null,
    })
    expect(await screen.findByText(/^Dec 1, 2024 · \d{2}h$/)).toBeTruthy()
  })

  it("rebinds the mark to the kit's own smaller pill geometry, scoped to this component", async () => {
    renderLadder("new", {
      recorded: false,
      fromCreation: false,
      events: [],
      spans: [],
      reopens: null,
    })
    const wrapper = await screen.findByRole("group", { name: "Stages" })
    expect(wrapper.className).toContain("--control-height-pill:1.25rem")
  })

  it("still marks the reopen, which is not a stage word — the one thing besides the date this rail draws", async () => {
    renderLadder("in_progress", {
      recorded: true,
      fromCreation: true,
      events: [],
      spans: [
        { status: "new", from: "2026-08-01T09:00:00.000Z", to: "2026-08-02T09:00:00.000Z", workingDays: 1 },
        { status: "resolved", from: "2026-08-10T09:00:00.000Z", to: "2026-09-01T09:00:00.000Z", workingDays: 5 },
        { status: "in_progress", from: "2026-09-01T09:00:00.000Z", to: null, workingDays: 2 },
      ],
      reopens: null,
    })
    expect(await screen.findByText("Reopened")).toBeTruthy()
  })
})
