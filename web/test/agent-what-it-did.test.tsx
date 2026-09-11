// TRACKER `d-steps` — "thinking steps stream on screen" ruled down to the
// honest small thing: a WHAT-IT-DID line under the answer, built from facts
// already on the wire (Law R23's own object), never a fake multi-phase
// stream into a worker that has never streamed. See the hub's ruling: build
// neither the "planning… searching… re-reading… writing" stream nor nothing
// — render `reason`, `candidates` and `reread`, which the app already had
// and showed to nobody.
//
// This is the one behaviour a citation-shape test (assistant-cites.test.tsx)
// does not cover: that line is ALWAYS VISIBLE, not behind the "What I read"
// disclosure, and it says the right sentence for each of `reread`'s two
// values and for a singular vs. plural candidate count.

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { TurnSources } from "@/components/assistant/agent-sources"
import type { TurnEvidence } from "@shared/agent-cites"

afterEach(cleanup)

const base: TurnEvidence = {
  citations: [],
  passages: [],
  reason: "The question names Bergman S.A., so I searched Bergman S.A.'s material and the agency's own.",
  candidates: 12,
  reread: false,
}

describe("the what-it-did line under a knowledge answer (tracker d-steps)", () => {
  it("shows the search's own reason and how many pieces it looked at", () => {
    render(<TurnSources evidence={base} teamId="T1" />)
    // `reason` is server prose, rendered as written — not a t()-wrapped string.
    expect(screen.getByText(/searched Bergman S\.A\.'s material/)).toBeTruthy()
    expect(screen.getByText(/12 pieces of material/)).toBeTruthy()
  })

  it("uses the singular sentence for exactly one candidate", () => {
    render(<TurnSources evidence={{ ...base, candidates: 1 }} teamId="T1" />)
    expect(screen.getByText(/1 piece of material/)).toBeTruthy()
    expect(screen.queryByText(/1 pieces of material/)).toBeNull()
  })

  it("says nothing about re-reading when the reader did not run", () => {
    render(<TurnSources evidence={{ ...base, reread: false }} teamId="T1" />)
    expect(screen.queryByText(/re-read/)).toBeNull()
  })

  it("says the shortlist was re-read when the reader ran", () => {
    render(<TurnSources evidence={{ ...base, reread: true }} teamId="T1" />)
    expect(screen.getByText(/re-read the strongest passages/)).toBeTruthy()
  })

  it("draws nothing at all when there is no reason to show — never a stray line", () => {
    const { container } = render(<TurnSources evidence={{ ...base, reason: "" }} teamId="T1" />)
    expect(container.querySelector("p")).toBeNull()
  })
})
