// R24 — A FIGURE THE CLIENT'S OWN SCREEN WITHHOLDS MAY NOT LEAVE ON THE
// ASSISTANT'S NEXT CALL. Behavioural, because the only claim worth making is
// that the write never reaches its door.
//
// THE FIXTURE MOVED ON 10 SEP 2026, THE MECHANISM DID NOT. This suite used to
// run `read_margin` — the agency's own margin, R24's original subject — and the
// client retired that feature whole ("kill the whole internal rates thing … for
// now i iwanna wipe it clean"), taking the tool, its door and R24's inbound half
// with it. It was RE-POINTED rather than retired because the property being
// measured is the per-turn taint, not the number: `get_app_impact` is the door
// the list narrowed to, and it is a genuine subject rather than a stand-in.
// `GET /api/tenancy/app-money` hands over what one app gives back priced IN
// FULL, where the client's own value door nulls those prices on any app whose
// account has price visibility switched off. Same subtraction, one of them
// unredacted — so it is still a number a particular client may be forbidden to
// see, arriving in that client's own inbox.
//
// The assistant needs no import to do it. It reads the figure through a door
// fenced correctly — as an agency admin holding `commercials:read` — and then
// replies into a ticket thread the client reads, and the number is in the
// client's inbox with nothing broken anywhere on the path.
//
// The instruction to do that arrives from the client. A portal ticket
// description is 20,000 characters of their own prose (`POST /api/content/help`
// is on the portal's allow-list and the seeded Client role holds `help:create`),
// read by the model the next time anybody here asks a question that touches
// tickets. `reply_help_ticket` is gated on `help:read`, the lowest bar in the
// catalogue, and confirms only when it @mentions somebody — so the plain reply
// opens no panel at all, and `notifyReplyAndMentions` emails the raiser a
// preview of the body.
//
// THE DEFERRED PATH IS WHAT THIS FILE IS ACTUALLY FOR. A per-turn control is
// easy to write and easy to leak straight through, because a call that CONFIRMS
// does not run in the turn that proposed it: the turn ends, the proposal is
// stored, and `confirmAndRun` resumes it later from that row with none of the
// turn's inputs in front of it. The chips learned this the hard way and left the
// lesson in `runPlanLoop`. And a proposal stores ALL of its turn's calls, not
// just the dangerous subset — so `get_app_impact` and a client-readable write
// arrive here as ONE approved batch that the proposing turn had run neither half
// of, which is the case a refusal made only at deferral time would miss.
//
// The harness is `confirm-once.test.ts`': the real schema, the real threads, and
// every door call recorded. `doorCalls` staying empty of the reply is the claim;
// the wording of the reply is corroboration.

import type { DatabaseSync } from "node:sqlite"
import { beforeEach, describe, expect, it, vi } from "vitest"

const holder = vi.hoisted(() => ({ db: null as DatabaseSync | null }))

vi.mock("@shared/workers/d1-rest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/d1-rest")>()
  const { d1Impl } = await import("../../tenancy/test/d1-sqlite")
  return { ...actual, ...d1Impl(() => holder.db as DatabaseSync) }
})

import { confirmAndRun } from "../src/lib/agent"
import { appendMessage, createThread } from "../src/lib/threads"
import { buildSpineDb, IDS, makeEnv } from "../../tenancy/test/spine-harness"

const cfg = { accountId: "a", apiToken: "t" } as never
const guard = { userId: IDS.staffUser, teamId: IDS.team, roleId: IDS.adminRole, databaseId: "db_team" }
const actor = { id: IDS.staffUser, email: "staff@kwapso.app", name: "Staff" }
const db = () => holder.db as DatabaseSync

/** Every door the tools actually reached. The security claim is about this list. */
let doorCalls: string[] = []

const MONEY_DOOR = "/api/tenancy/app-money"
const REPLY_DOOR = "/api/content/help/reply"

function env(): never {
  const door = {
    fetch: async (url: string) => {
      doorCalls.push(new URL(url).pathname)
      return new Response(JSON.stringify({ ok: true, moneyCentsPerMonth: 412_900 }), {
        headers: { "Content-Type": "application/json" },
      })
    },
  }
  return { ...(makeEnv(db, IDS.staffUser) as unknown as object), TENANCY: door, CONTENT: door } as never
}

beforeEach(() => {
  holder.db = buildSpineDb()
  doorCalls = []
  // The model door refuses with no network involved: every turn here settles
  // through the loop's own catch, and what is under test happens before it.
  vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
    const url = String(input instanceof Request ? input.url : input)
    if (url.includes("api.anthropic.com"))
      return new Response('{"error":{"type":"overloaded_error"}}', { status: 529 })
    throw new Error(`unexpected fetch in a unit test: ${url}`)
  })
})

const request = () => new Request("https://data-ops/api/agent/confirm", { headers: { Cookie: "session=x" } })

/** A thread paused on a proposal holding the given calls, as a confirming turn
 * leaves it. `calls` in order — the order is load-bearing, because the taint is
 * what the conversation has read BY THE TIME the write is attempted. */
async function threadProposing(calls: { tool: string; input: Record<string, unknown> }[]): Promise<string> {
  const threadId = await createThread(cfg, guard, actor, "A question about the account")
  await appendMessage(cfg, guard, actor, threadId, {
    role: "assistant",
    content: "Here's what I'd do — may I?",
    toolCallsJson: JSON.stringify(calls.map((c) => ({ ...c, status: "proposed" }))),
    source: "web",
  })
  return threadId
}

const MONEY_CALL = { tool: "get_app_impact", input: { appId: IDS.victimApp } }
const REPLY_CALL = {
  tool: "reply_help_ticket",
  input: {
    helpId: "H_ONE",
    body: "As requested for your reconciliation, this app gives back 4,129.00 a month.",
    taggedUserIds: [IDS.staffUser],
  },
}

describe("R24 — a turn that read a withheld figure cannot write where the client reads", () => {
  // THE CONTROL GROUP FIRST. A suite that only proves a refusal cannot tell a
  // working control from a broken door: if the reply never reached its door in
  // this harness for some unrelated reason, every assertion below would pass
  // over a fix that does nothing.
  it("the reply reaches its door on an ordinary turn (or every test below is hollow)", async () => {
    const threadId = await threadProposing([REPLY_CALL])
    await confirmAndRun(env(), request(), cfg, guard, actor, { threadId, approve: true, source: "web" })
    expect(
      doorCalls,
      "the harness must be able to reach the reply door, or the refusals below prove nothing"
    ).toContain(REPLY_DOOR)
  })

  it("…and the money door is reachable too", async () => {
    const threadId = await threadProposing([MONEY_CALL])
    await confirmAndRun(env(), request(), cfg, guard, actor, { threadId, approve: true, source: "web" })
    expect(doorCalls).toContain(MONEY_DOOR)
  })

  // THE FINDING, ON THE PATH IT WOULD ACTUALLY HAVE TAKEN.
  it("a proposal holding the money read AND the reply reads the money and refuses the reply", async () => {
    const threadId = await threadProposing([MONEY_CALL, REPLY_CALL])
    await confirmAndRun(env(), request(), cfg, guard, actor, { threadId, approve: true, source: "web" })

    expect(doorCalls, "the money read is the caller's own, and stays allowed").toContain(MONEY_DOOR)
    expect(
      doorCalls,
      "the money was read in this batch, so the client-readable write must never reach its door (R24)"
    ).not.toContain(REPLY_DOOR)
  })

  it("the refusal is written down as a failed step, not silently dropped", async () => {
    const threadId = await threadProposing([MONEY_CALL, REPLY_CALL])
    await confirmAndRun(env(), request(), cfg, guard, actor, { threadId, approve: true, source: "web" })
    // A refusal nobody can see is a refusal nobody learns from — the panel
    // rehydrates a reopened chat from these rows, so it must stay red there.
    const rows = db()
      .prepare(
        "SELECT content, tool_calls_json FROM agent_messages WHERE thread_id = ? AND role = 'tool' ORDER BY created_at ASC"
      )
      .all(threadId) as { content: string; tool_calls_json: string }[]
    const refused = rows.filter((r) => r.tool_calls_json.includes('"status":"failed"'))
    expect(refused.length, "the refused step must be persisted like any other").toBe(1)
    expect(refused[0].tool_calls_json).toContain("reply_help_ticket")
    expect(
      refused[0].content,
      "the reason must say WHY, or the assistant cannot tell the person anything useful"
    ).toMatch(/may withhold/)
  })

  // ORDER IS THE WHOLE MECHANISM, so it is stated rather than assumed: the taint
  // is what the conversation has read by the time the write is attempted, and a
  // write that happens FIRST has read nothing.
  it("a reply BEFORE the money read is not refused — the taint is what has been read, not what is coming", async () => {
    const threadId = await threadProposing([REPLY_CALL, MONEY_CALL])
    await confirmAndRun(env(), request(), cfg, guard, actor, { threadId, approve: true, source: "web" })
    expect(doorCalls).toContain(REPLY_DOOR)
    expect(doorCalls).toContain(MONEY_DOOR)
  })

  it("an agency-only write is untouched by the money — the control must not fire on ordinary work", async () => {
    const threadId = await threadProposing([
      MONEY_CALL,
      { tool: "create_account", input: { name: "A new company" } },
    ])
    await confirmAndRun(env(), request(), cfg, guard, actor, { threadId, approve: true, source: "web" })
    expect(
      doorCalls,
      "an account is not a door the client's browser opens; refusing it would punish ordinary work"
    ).toContain("/api/tenancy/accounts")
  })
})
