// TICKETFACE: THE TYPE AS THE ICON, ON EVERY PICKER OF A TICKET.
//
// Aurora, verbatim, 21 Sep 2026: "on every choice component where I can
// choose a ticket, show me the type as the icon everywhere." `ticketFace`
// (shared/web/ticket-face.tsx) is the one seam a ticket picker builds its
// `SelectItem`/`SelectTrigger` `face` prop from, reading the same type-icon
// map the tickets list already draws through (`ticketTypeIconName`,
// shared/ticket-types.ts) rather than a second one invented for pickers.

import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { ticketFace } from "@shared/web/ticket-face"

afterEach(cleanup)

describe("ticketFace: the SelectFace for a ticket, built from its type", () => {
  it("draws the bug glyph for an Issue", () => {
    const face = ticketFace({ helpType: "Issue" })
    const { container } = render(<>{face.icon}</>)
    expect(container.querySelector("svg"), "an icon was drawn at all").toBeTruthy()
  })

  it("draws a DIFFERENT glyph for a Question than for an Issue", () => {
    const issue = ticketFace({ helpType: "Issue" })
    const question = ticketFace({ helpType: "Question" })
    const issueHtml = render(<>{issue.icon}</>).container.innerHTML
    const questionHtml = render(<>{question.icon}</>).container.innerHTML
    expect(issueHtml).not.toBe(questionHtml)
  })

  it("still resolves a renamed word the same tolerant way ticketTypeIconName does (trailing s, case)", () => {
    const plain = render(<>{ticketFace({ helpType: "Issue" }).icon}</>).container.innerHTML
    const plural = render(<>{ticketFace({ helpType: "issues" }).icon}</>).container.innerHTML
    expect(plural).toBe(plain)
  })

  it("never renders nothing for an untyped ticket; a neutral ticket glyph, not a blank option", () => {
    const untyped = ticketFace({ helpType: null })
    const { container } = render(<>{untyped.icon}</>)
    expect(container.querySelector("svg"), "the neutral fallback still draws a glyph").toBeTruthy()
  })

  it("never renders nothing for a ticket type this map has never heard of", () => {
    const renamed = ticketFace({ helpType: "Whatever the team called it" })
    const { container } = render(<>{renamed.icon}</>)
    expect(container.querySelector("svg")).toBeTruthy()
  })

  it("accepts null or undefined outright, so a caller mapping a list never has to guard it first", () => {
    expect(() => ticketFace(null)).not.toThrow()
    expect(() => ticketFace(undefined)).not.toThrow()
    const { container } = render(<>{ticketFace(null).icon}</>)
    expect(container.querySelector("svg")).toBeTruthy()
  })

  it("carries no src and no name; this is the glyph face variant, not the photo/initials one", () => {
    const face = ticketFace({ helpType: "Issue" })
    expect(face.src).toBeUndefined()
    expect(face.name).toBeUndefined()
    expect(face.icon).toBeTruthy()
  })
})
