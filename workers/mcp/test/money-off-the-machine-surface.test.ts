// R24's OUTBOUND HALF, ON THE SURFACE THAT HAS NO CONTEXT TO TAINT.
//
// `shared/workers/money-taint.ts` closed the agent's half properly: if a TURN has
// read an internal number, that turn may not then write through a door the
// client's own browser opens. It works because the agent can be asked what it has
// already run — the check reads the same messages the model is reading.
//
// THAT QUESTION HAS NO ANSWER ON THIS SURFACE. An MCP `tools/call` is one HTTP
// request carrying a bearer token. There is no turn, no conversation, no prior
// tool list — so `moneyIsInContext` over a single call is ALWAYS false, and the
// agent's predicate, ported here verbatim, would be a check that passes with the
// bug fully present. That is the exact failure this codebase keeps re-earning, so
// it is written down rather than discovered again: the fix here could not be the
// agent's fix, because the agent's fix depends on a thing this surface does not
// have.
//
// SO THE DEFENCE IS STRUCTURAL, WHICH IS R24's OWN DOCTRINE — "a condition can be
// inverted and a permission can be granted, an import cannot be forgotten." A
// surface whose context we cannot see is not handed the number at all.
//
// AND THE PRECEDENT IS THIS SURFACE'S OWN. Twenty-one Google tools are already
// agent-only for a sentence that transfers word for word (MCP.md §3, quoted in
// agent-mcp-tool-parity.test.ts): "a personal access token is a secret that ends
// up pasted into somebody's CI config, and the blast radius of a leaked one must
// not include a mailbox." The agency's own cost card and its margin are the
// second thing that blast radius must not include — SCOPE names the margin as the
// one number a client must never see — and the mitigation is the same one Google
// gets: reach it through `agent_chat`, under the same rights, where the per-turn
// taint check genuinely applies.
//
// THE DEFENCE IS THE FORWARD PATH, not the catalogue. A filter on `MCP_TOOLS`
// was written first and reverted: the twenty-one `set_*_active` names are
// PUBLISHED EXTERNAL CONTRACTS (record-toggles.test.ts forbids removing one),
// and dropping eight names also inverted R43's stated direction and staled two
// hard-coded census counts and MCP.md — a product decision about a published
// API, which is not a security lane's to make. The refusal closes the hole
// identically: the figure never leaves the building through MCP either way.
//
// It is asked of the DOOR the call will actually open, never of the tool name,
// so it also covers `set_record_active` being POINTED at a money door per call —
// the case no catalogue filter could have caught. `readsInternalMoney` is the
// same derived predicate the agent's taint uses and the same one
// `internal-money-never-in-portal` rot-checks against tenancy's own source.

import { describe, expect, it } from "vitest"

import { INTERNAL_MONEY_DOORS, readsInternalMoney } from "@shared/workers/money-taint"
import { SHARED_TOOLS } from "@shared/workers/tool-catalog"
import { forwardTool, MCP_TOOLS } from "../src/lib/tools"

describe("the agency's own money is not on the machine surface", () => {
  // TRIPWIRE, first and loudest. Every assertion below is a "nothing matched"
  // shape, and a census that has gone blind reports exactly the same green as one
  // that passed. So: the door list must be real, and the catalogue must actually
  // contain tools on those doors — otherwise the rest of this file proves nothing.
  it("the derivation is alive (a blind census would pass every test below)", () => {
    expect(INTERNAL_MONEY_DOORS.length, "INTERNAL_MONEY_DOORS is empty").toBeGreaterThanOrEqual(4)
    expect(INTERNAL_MONEY_DOORS).toContain("/api/tenancy/margin")
    const onMoneyDoors = SHARED_TOOLS.filter((t) => readsInternalMoney(t))
    expect(
      onMoneyDoors.length,
      "no shared tool sits on a money door — either the catalogue moved or readsInternalMoney stopped matching, and this whole file is measuring nothing"
    ).toBeGreaterThanOrEqual(4)
    // The one the finding was written about, by name, so a rename cannot quietly
    // empty the set above while leaving the count intact.
    expect(onMoneyDoors.map((t) => t.name)).toContain("read_margin")
  })

  // A DOOR THAT FAILS THE TEST IF IT IS EVER OPENED. A refusal proved against a
  // stub that quietly returned something would be indistinguishable from a
  // forward that worked — the throw is what makes "it refused" mean "the door was
  // never opened", rather than "the door answered and we liked the answer".
  const mustNotBeCalled = () =>
    ({
      TENANCY: {
        fetch: async () => {
          throw new Error("the money door was OPENED — forwardTool did not refuse")
        },
      },
    }) as never

  // EVERY money tool on the surface, one test each, named — not a loop with one
  // assertion at the end, so a failure says WHICH door opened.
  for (const tool of MCP_TOOLS.filter((t) => readsInternalMoney(t)))
    it(`refuses ${tool.name} without opening ${tool.path}`, async () => {
      const out = await forwardTool(mustNotBeCalled(), tool, {}, "cookie", "trace-test")
      expect(out.ok, `${tool.name} must not answer on this surface`).toBe(false)
      const body = JSON.parse(out.text) as { error: string; message: string }
      expect(body.error).toBe("not_on_this_surface")
      // The refusal has to tell an outside developer what to do instead, or they
      // file it as a bug and the next person "fixes" it by deleting the guard.
      expect(body.message).toMatch(/agent_chat/)
    })

  it("…and refuses a money door reached PER CALL, which no catalogue filter could have caught", async () => {
    // `set_record_active` resolves its door from its own input. Its canonical
    // `path` is an accounts door, so it is not a money tool by the catalogue's
    // reading — it is a tool that can be POINTED at one, which is exactly why the
    // refusal is asked of `dest` rather than of the tool.
    const generic = MCP_TOOLS.find((t) => t.name === "set_record_active")
    expect(generic, "the generic toggle is the per-call case this test exists for").toBeDefined()
    expect(readsInternalMoney(generic!), "…and it must NOT be a money tool by its own path").toBe(false)
    const out = await forwardTool(
      mustNotBeCalled(),
      generic!,
      { record: "internal_rate", id: "x", active: false },
      "cookie",
      "trace-test"
    )
    expect(out.ok, "pointing the generic toggle at a money door must still refuse").toBe(false)
    expect(JSON.parse(out.text).error).toBe("not_on_this_surface")
  })

  it("the escape route named in that refusal is real and still on this surface", () => {
    expect(
      MCP_TOOLS.map((t) => t.name),
      "the refusal sends an outside developer to agent_chat — if that tool ever leaves this surface the message becomes a lie"
    ).toContain("agent_chat")
  })
})
