// R24 ON THE SURFACE THAT HAS NO CONTEXT TO TAINT.
//
// THE SUBJECT NARROWED ON 10 SEP 2026 AND THE FILE STAYED, which is worth
// reading before the rest. This suite used to name `read_margin` and
// `/api/tenancy/margin`: the agency's own cost card and the margin computed from
// it, R24's original subject. The client retired that feature whole ("kill the
// whole internal rates thing … for now i iwanna wipe it clean"), so five of the
// six doors on `INTERNAL_MONEY_DOORS` stopped existing and R24's structural
// inbound half was retired with them.
//
// WHAT IS LEFT IS `GET /api/tenancy/app-money`, and it is a real subject rather
// than a stand-in: it hands over what one app gives back priced IN FULL, where
// the client's own value door nulls those prices on any app whose account has
// price visibility switched off. NOTHING WAS ADDED to the list in place of what
// left — deliberately, and the account rate card is the case that says why. It
// is the same shape of argument and it was refused, because refusing it would
// newly withhold four PUBLISHED MCP tools, which is a product decision about an
// external contract and not a security lane's to make. `money-taint.ts`'s own
// header carries that reasoning at length.
//
// `shared/workers/money-taint.ts` closed the agent's half properly: if a TURN has
// read a withheld figure, that turn may not then write through a door the
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
// not include a mailbox." A price we have not shown a particular client is the
// second thing that blast radius must not include — and the mitigation is the
// same one Google gets: reach it through `agent_chat`, under the same rights,
// where the per-turn taint check genuinely applies.
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
// so it also covers a generic tool being POINTED at a money door per call — the
// case no catalogue filter could have caught. `readsInternalMoney` is the same
// derived predicate the agent's taint uses and the same one
// `money-taint-outbound` rot-checks against tenancy's own ROUTES.

import { describe, expect, it } from "vitest"

import { INTERNAL_MONEY_DOORS, readsInternalMoney } from "@shared/workers/money-taint"
import { RECORD_TOGGLES } from "@shared/workers/record-toggles"
import { SHARED_TOOLS } from "@shared/workers/tool-catalog"
import { forwardTool, MCP_TOOLS } from "../src/lib/tools"

describe("the agency's own money is not on the machine surface", () => {
  // TRIPWIRE, first and loudest. Every assertion below is a "nothing matched"
  // shape, and a census that has gone blind reports exactly the same green as one
  // that passed. So: the door list must be real, and the catalogue must actually
  // contain tools on those doors — otherwise the rest of this file proves nothing.
  it("the derivation is alive (a blind census would pass every test below)", () => {
    // THE THRESHOLD FELL FROM FOUR TO ONE ON 10 SEP 2026, and a falling tripwire
    // is exactly the move that turns a law blind, so it is argued rather than
    // adjusted. The number was never the property: it was a proxy for "the
    // census still finds the doors". What replaces it is a NAMED door and a
    // NAMED tool below, which is strictly harder to satisfy vacuously than any
    // count — a rename empties the set and the name says so, where a count of
    // one is met by any door at all.
    expect(INTERNAL_MONEY_DOORS.length, "INTERNAL_MONEY_DOORS is empty").toBeGreaterThanOrEqual(1)
    expect(INTERNAL_MONEY_DOORS).toContain("/api/tenancy/app-money")
    const onMoneyDoors = SHARED_TOOLS.filter((t) => readsInternalMoney(t))
    expect(
      onMoneyDoors.length,
      "no shared tool sits on a money door — either the catalogue moved or readsInternalMoney stopped matching, and this whole file is measuring nothing"
    ).toBeGreaterThanOrEqual(1)
    // The tool this now stands on, by name, so a rename cannot quietly empty the
    // set above while leaving the count intact.
    expect(onMoneyDoors.map((t) => t.name)).toContain("get_app_impact")
    // AND THE LOOP BELOW REALLY RUNS. `MCP_TOOLS` is a different projection from
    // `SHARED_TOOLS`, and the per-tool refusals are generated from it — so a
    // catalogue that carried the tool while the surface did not would leave the
    // only behavioural assertions in this file generating zero tests.
    expect(
      MCP_TOOLS.filter((t) => readsInternalMoney(t)).map((t) => t.name),
      "no money tool on the MCP surface — the refusal tests below would be an empty loop"
    ).toContain("get_app_impact")
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
    // THE RECORD THIS USED TO NAME WAS `internal_rate`, whose door was
    // `/api/tenancy/internal-rates/active` — a money door the toggle could be
    // pointed at. It was retired on 10 Sep 2026 with the rest of the internal
    // rates. The case was then re-pointed at `account_rate`, whose door was
    // `/api/tenancy/rates/active`; the client retired THAT an hour later ("the
    // whole account rates also killed it"), so this file has now outlived both
    // of the records it was written about.
    //
    // NO SURVIVING TOGGLE RESOLVES TO A MONEY DOOR, and there is no longer a
    // money door with a toggle to resolve to: `app-money` is a read.
    //
    // SO THIS IS NOW A NEGATIVE CONTROL RATHER THAN A REFUSAL, and it is kept
    // for the reason the refusal was written: what is being asserted is that the
    // decision is made against `dest` — the door this call will actually open —
    // and not against the tool's name. Proved by RUNNING the router over EVERY
    // record the toggle still names, so the day a money door grows a toggle,
    // this test says so by going red on its own terms.
    //
    // The single hand-named `dest` that stood here is gone with its record, and
    // the census below is what was doing the work all along — it was already
    // written to name any offender rather than to check one. What replaces the
    // hand-named line is a TRIPWIRE on the census itself: a router that stopped
    // resolving anything would make the empty result below meaningless.
    const resolved = Object.keys(RECORD_TOGGLES).map((record) =>
      generic!.route!({ record, id: "x", roleId: "x", active: false })
    )
    expect(
      resolved.length,
      "the toggle names no records at all — the census below would be empty for the wrong reason"
    ).toBeGreaterThan(10)
    expect(
      resolved.every((d) => d.path.startsWith("/api/")),
      "the toggle must resolve a real door from its own input, for every record it names"
    ).toBe(true)
    const pointable = Object.keys(RECORD_TOGGLES).filter((record) =>
      readsInternalMoney(generic!.route!({ record, id: "x", roleId: "x", active: false }))
    )
    expect(
      pointable,
      `${pointable.join(", ")} resolves to a money door — the guard is asked of \`dest\`, so it WILL refuse this, but the test that proves it must name the record. Add it above.`
    ).toEqual([])
  })

  it("the escape route named in that refusal is real and still on this surface", () => {
    expect(
      MCP_TOOLS.map((t) => t.name),
      "the refusal sends an outside developer to agent_chat — if that tool ever leaves this surface the message becomes a lie"
    ).toContain("agent_chat")
  })
})
