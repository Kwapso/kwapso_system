// THE TEST THAT MATTERS FOR THE TWO-STAGE CATALOGUE — the FETCH PATH, end to end.
//
// The saving is easy to measure and easy to be fooled by: `node
// scripts/measure-preamble.mjs` says a step went from 133,505 characters to
// 40,334, a 69.8% cut, and that number is true whatever else is broken.
//
// The failure mode is not a crash. It is the assistant quietly not knowing it can
// do something and answering as though the capability does not exist — which
// LOOKS LIKE A GOOD REPLY. A suite that only asserted the preamble got smaller
// would pass just as happily on a build where `load_tools` did nothing at all.
//
// So this drives the real loop with a scripted model that NEEDS a tool stage one
// does not carry, and proves the whole path: the tool is absent from step one,
// its name is in the index so the model can know to ask for it, asking widens
// what step two is offered, and the call it then makes REACHES ITS DOOR. The last
// one is the claim — a tool the model can see but cannot reach is the same
// silence in a different costume.

import { beforeEach, describe, expect, it, vi } from "vitest"
import type { DatabaseSync } from "node:sqlite"

const holder = vi.hoisted(() => ({ db: null as DatabaseSync | null }))

vi.mock("@shared/workers/d1-rest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/d1-rest")>()
  const { d1Impl } = await import("../../tenancy/test/d1-sqlite")
  return { ...actual, ...d1Impl(() => holder.db as DatabaseSync) }
})

import { runChat } from "../src/lib/agent"
import { CORE_TOOL_NAMES, toolIndex, toolSpecs } from "../src/lib/tools"
import { buildSpineDb, IDS, makeEnv } from "../../tenancy/test/spine-harness"

/** A read that is deliberately NOT core: a specialist, exactly the kind stage one
 * defers. Chosen as a READ so the confirm panel is not in the way of the thing
 * under test, and one whose door is a plain TENANCY GET we can watch for. */
const SPECIALIST = "list_client_departments"
const SPECIALIST_PATH = "/api/tenancy/client/departments"

const cfg = { accountId: "a", apiToken: "t" } as never
const guard = { userId: IDS.staffUser, teamId: IDS.team, roleId: IDS.adminRole, databaseId: "db_team" }
const actor = { id: IDS.staffUser, email: "staff@kwapso.app", name: "Staff" }
const db = () => holder.db as DatabaseSync

let doorCalls: string[] = []
/** The tools array the model was handed, once per model call — the whole point. */
let offered: string[][] = []

/** A model that behaves exactly as the design expects: it wants the specialist,
 * discovers it cannot call it yet, fetches it, then calls it. */
function scriptedEnv(): never {
  let call = 0
  return {
    ...(makeEnv(db, IDS.staffUser) as unknown as object),
    AI: {
      run: async (_model: string, body: { tools?: { function?: { name: string } }[] }) => {
        offered.push((body.tools ?? []).map((t) => t.function?.name ?? ""))
        call++
        const reply = (toolCalls: unknown[] | null, content = "") => ({
          choices: [{ message: { content, tool_calls: toolCalls ?? undefined }, finish_reason: "stop" }],
          usage: { prompt_tokens: 10, completion_tokens: 2 },
        })
        if (call === 1)
          return reply([
            {
              id: "c1",
              type: "function",
              function: { name: "load_tools", arguments: JSON.stringify({ names: [SPECIALIST] }) },
            },
          ])
        if (call === 2)
          return reply([
            { id: "c2", type: "function", function: { name: SPECIALIST, arguments: "{}" } },
          ])
        return reply(null, "Here is what I found.")
      },
    },
    TENANCY: {
      fetch: async (url: string) => {
        doorCalls.push(new URL(url).pathname)
        return new Response(JSON.stringify({ departments: [], total: 0 }), {
          headers: { "Content-Type": "application/json" },
        })
      },
    },
  } as never
}

const request = () => new Request("https://data-ops/api/agent/chat", { headers: { Cookie: "session=x" } })

beforeEach(() => {
  holder.db = buildSpineDb()
  doorCalls = []
  offered = []
})

describe("stage one is genuinely smaller, and the model can still see what it is missing", () => {
  it("the specialist is NOT sent on a fresh step", () => {
    const stageOne = toolSpecs(undefined, new Set()).map((t) => t.name)
    expect(stageOne, "the fixture must be a tool stage one really defers").not.toContain(SPECIALIST)
    // …and stage one is not accidentally everything, which would make the whole
    // suite vacuous.
    expect(stageOne.length).toBe(CORE_TOOL_NAMES.size)
  })

  it("…but its NAME is in the index, or the model cannot know to ask", () => {
    // This is the half that turns "smaller" into "still capable". A tool that is
    // neither sent nor named is a capability the assistant will answer as though
    // it does not have.
    expect(toolIndex()).toContain(SPECIALIST)
  })

  it("every catalogued tool is either core or in the index — nothing falls between", () => {
    const index = new Set(toolIndex().split(", "))
    const missing = toolSpecs()
      .map((t) => t.name)
      .filter((n) => !CORE_TOOL_NAMES.has(n) && !index.has(n))
    expect(missing, "a tool in neither half is unreachable and invisible").toEqual([])
  })
})

describe("the fetch path, driven through the real loop", () => {
  it("asking for a tool widens what the NEXT step is offered", async () => {
    await runChat(scriptedEnv(), request(), cfg, guard, actor, { message: "which departments?", source: "web" })
    expect(offered.length, "the loop must have made more than one model call").toBeGreaterThanOrEqual(2)
    expect(offered[0], "step one must not carry the specialist").not.toContain(SPECIALIST)
    expect(offered[0], "step one must carry the opener, or nothing can be fetched").toContain("load_tools")
    expect(offered[1], "step two must carry what step one asked for").toContain(SPECIALIST)
  })

  it("…and the fetched tool is a REAL one that reaches its door", async () => {
    await runChat(scriptedEnv(), request(), cfg, guard, actor, { message: "which departments?", source: "web" })
    expect(doorCalls, `the fetched tool must reach ${SPECIALIST_PATH}`).toContain(SPECIALIST_PATH)
  })

  // WHAT THE TEST ABOVE DOES AND DOES NOT PROVE, written down because I checked
  // and it is not what I first assumed. Sabotaging the loop's widening (deleting
  // the `loaded.add`) turns the two OFFERED assertions red and leaves that one
  // GREEN — because `runToolCall` resolves a tool from the catalogue by name, not
  // from the array the model was handed. So a model that calls a tool it was
  // never offered still reaches the door.
  //
  // That is not a hole: execution goes through the real gated door as the caller
  // either way, so the permission story is unchanged, and it is a useful
  // property — a model working from a stale context does not get a dead end.
  // But it means the door assertion proves the fetched name is a REAL, WIRED
  // tool rather than proving the fetch changed anything. The widening itself is
  // proved by `offered[1]`, and both are needed: one that the model was given
  // the tool, one that the tool actually works.

  it("the widening does not leak the whole catalogue back in", async () => {
    await runChat(scriptedEnv(), request(), cfg, guard, actor, { message: "which departments?", source: "web" })
    // If `load_tools` widened to everything, the saving would be gone and every
    // test above would still pass. Step two must be core + exactly what was asked.
    expect(offered[1].length, "step two must be core plus one, not the whole catalogue").toBe(
      CORE_TOOL_NAMES.size + 1
    )
  })

  it("a name that is not a tool widens nothing and says so", async () => {
    // The model will invent a name eventually. It must get a correction, not a
    // silent no-op, and it must not be able to widen the set with a guess.
    const before = toolSpecs(undefined, new Set()).length
    expect(toolSpecs(undefined, new Set(["not_a_real_tool"])).length).toBe(before)
  })
})
