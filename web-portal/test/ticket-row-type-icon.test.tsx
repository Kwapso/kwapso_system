// R86 ON THE PORTAL'S OWN ROW — the icon reaches the client's front door too.
//
// Client ruling, 17 Sep 2026, verbatim: "for tickets, we need to find icons
// for the ticket type." `TicketRow` (components/ticket-row.tsx) is read by
// both Home (the newest few) and Tickets (all of them), so this is the one
// component to prove — a real render, over a typed ticket and an untyped one,
// read off the DOM rather than the source.

import * as React from "react"
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import type { HelpTicket } from "@shared/types"

const { TicketRow } = await import("@/components/ticket-row")

function ticket(overrides: Partial<HelpTicket> = {}): HelpTicket {
  return {
    id: "tkt_1",
    ref: "T0412",
    description: "The booking page shows last month's prices",
    status: "in_progress",
    helpType: "Issue",
    createdAt: "2026-08-01T09:00:00.000Z",
    updatedAt: "2026-08-01T09:00:00.000Z",
    storyCount: 0,
    doneStoryCount: 0,
    ...overrides,
  } as HelpTicket
}

describe("R86 — the portal's ticket row draws the type icon, never a colour", () => {
  let root: Root | null = null
  let host: HTMLDivElement

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    host = document.createElement("div")
    document.body.append(host)
    root = createRoot(host)
  })

  afterEach(async () => {
    await act(async () => root?.unmount())
    host.remove()
    root = null
  })

  const render = async (t: HelpTicket) => {
    await act(async () => {
      root?.render(React.createElement(TicketRow, { ticket: t }))
    })
  }

  // ONE SVG ALWAYS RENDERS REGARDLESS — the row's own trailing `CaretRight` —
  // so "an icon drew" is measured as a SECOND glyph, not merely a non-zero
  // count, and "no icon drew" is measured as exactly that one baseline.
  const BASELINE_GLYPHS = 1

  it("a typed ticket (Issue) draws a second svg glyph, named for a screen reader", async () => {
    await render(ticket({ helpType: "Issue" }))
    // THE GLYPH ITSELF — Bug.svg, resolved through iconComponent(), renders
    // as an inline <svg>. aria-hidden on the glyph (Icon's own contract) and
    // the WORD carried in an sr-only span beside it — the mark never carries
    // the meaning alone.
    expect(host.querySelectorAll("svg").length, "the type icon plus the row's own caret").toBe(BASELINE_GLYPHS + 1)
    expect(host.textContent).toContain("Issue")
  })

  it("no inline background-colour rides the type icon — colour is the status's alone (R86)", async () => {
    await render(ticket({ helpType: "Question" }))
    const svgs = [...host.querySelectorAll("svg")]
    for (const svg of svgs) {
      const style = svg.getAttribute("style") ?? ""
      expect(style).not.toContain("background")
    }
  })

  it("a ticket with no type draws no icon — never a broken glyph", async () => {
    await render(ticket({ helpType: null }))
    expect(host.querySelectorAll("svg").length, "only the row's own caret").toBe(BASELINE_GLYPHS)
  })

  it("a retired word the map has never heard of draws no icon either", async () => {
    await render(ticket({ helpType: "General" }))
    expect(host.querySelectorAll("svg").length).toBe(BASELINE_GLYPHS)
  })
})
