// A LOOKUP PER STEP COSTS A STEP EACH.
//
// Measured on staging, 14 Sep 2026, the owner's five-part ticket question on
// gpt-oss-120b: ten steps, one lookup in each, 152 seconds, 98,000 fresh input
// tokens — because every step re-sends the ~9,000-token stage-one preamble and
// this engine has no prompt cache to absorb it. The same question on kimi
// asked for nine lookups in ONE step. Nothing in the prompt had ever said that
// several calls may travel together, so the model that does not do it by
// instinct never did it. This pins the two sentences that change that: ask for
// all the lookups you know you need in one step, and read the average off the
// grouped answer's own summary instead of dividing by hand.
import { describe, expect, it } from "vitest"
import { SYSTEM } from "../src/lib/agent"

describe("several lookups in one step", () => {
  it("the prompt says to batch, and says why in the model's own currency (steps)", () => {
    expect(SYSTEM).toContain("ask for ALL of them in ONE step")
    expect(SYSTEM).toContain("a lookup per step costs a step each")
  })

  it("the prompt points at the grouped answer's arithmetic, so no average is worked out by hand", () => {
    expect(SYSTEM).toContain("`groupSummary`")
    expect(SYSTEM).toContain("never worked out by hand")
  })
})
