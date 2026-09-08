// THE APPROVAL GATE HAS ONE JOB: a dangerous call runs when — and only when —
// the person approved it. It ran TWICE on a double-tap, and it ran AFTER A "NO".
//
// confirmAndRun read the stored proposal, executed every call in it, and only
// then marked it "done" with an UPDATE that checked nothing. So two /confirm
// posts (a double-click, a retried request, a reconnecting stream) both read the
// same "proposed" calls and both executed them — a second invite, a second row,
// a second of whatever the model had asked permission for.
//
// The shape is CONCURRENCY.md's "a retryable operation that must run at most once
// claims it first" — the CSV importer's planned→running flip is its twin, locked
// the same way next door in import-idempotency.test.ts.
//
// AND THE OTHER ANSWER. This suite locked the approve path thoroughly and never
// touched decline — so it stayed green over a gate that only half worked. The
// decline branch appended "Okay — I've left that alone." and RETURNED, without
// spending the proposal, and it does not shadow it either: appendMessage writes
// tool_calls_json = NULL while getPendingProposal reads the newest assistant row
// that HAS a proposal. The refused calls therefore stayed "proposed" for ever and
// a later {approve:true} on the same thread executed exactly what the person had
// turned down. Sharpest on MCP, where agent_confirm is a tool an autonomous
// client calls: the operator declines, the client retries, the write lands.
//
// The decline half below is BEHAVIOURAL, against the real schema, because that is
// the only way to prove the thing that actually matters — that the refused call
// never reaches its door.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { DatabaseSync } from "node:sqlite"
import type { ChatOutcome } from "@shared/types"
import { beforeEach, describe, expect, it, vi } from "vitest"

const holder = vi.hoisted(() => ({ db: null as DatabaseSync | null }))

vi.mock("@shared/workers/d1-rest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/d1-rest")>()
  const { d1Impl } = await import("../../tenancy/test/d1-sqlite")
  return { ...actual, ...d1Impl(() => holder.db as DatabaseSync) }
})

import { confirmAndRun } from "../src/lib/agent"
import { appendMessage, createThread, getPendingProposal } from "../src/lib/threads"
import { buildSpineDb, IDS, makeEnv } from "../../tenancy/test/spine-harness"
import { AGENT_PROPOSAL_TTL_MS } from "@shared/workers/limits"
import { stripComments } from "@shared/rules/source-scan"

/** THE PROSE COMES OUT FIRST, through the one stripper every other law uses.
 *
 * It did not until 2026-09-08, and the two functions this file reads are the
 * densest commentary in the worker — `confirmAndRun`'s decline branch alone
 * carries a nine-line paragraph ABOUT the claim, naming the very calls the
 * assertions below locate by name. Deriving "where is the claim" from source
 * that still holds sentences about the claim is asking a question of the wrong
 * text: every position this file computes could be a position inside an
 * explanation. (It also cuts the other way — the SQL assertion further down
 * would have been satisfied by a comment quoting the SQL.) */
const lib = (name: string) => stripComments(readFileSync(join(__dirname, "..", "src", "lib", name), "utf8"))
const threads = lib("threads.ts")
const agent = lib("agent.ts")

const confirmBody = (() => {
  const start = agent.indexOf("export async function confirmAndRun")
  const next = agent.indexOf("\nexport ", start + 1)
  return agent.slice(start, next === -1 ? undefined : next)
})()

/* ══════════════════════════════════════════════════════════════════════════
   THE TWO CALLS THAT LOOK ALIKE, AND THE FALSE GREEN THAT COST (2026-09-08).

   `confirmAndRun` calls `consumePendingProposal` TWICE, and the two calls are
   opposites. The first spends the proposal on a DECLINE, high up in the
   `!opts.approve` branch. The second is the CLAIM — the compare-and-swap that
   this whole suite exists for, the one that has to happen before a single tool
   call runs.

   Every assertion in this describe used to find its subject with
   `confirmBody.indexOf("consumePendingProposal(")`, which is the DECLINE call.
   It sits near the top of the function, unconditionally above `runToolCall(`
   and above `consumeAiUnit(`, so "the claim comes before the run" and "the
   loser is turned away before the team is charged" were both true of a call
   that is neither the claim nor the loser's path. They were true of the text.
   They said nothing about the code.

   MEASURED, NOT REASONED. The original defect was restored in `agent.ts` —
   the claim moved back to AFTER the tool loop, exactly the double-run this
   file was written for — and all eleven tests here passed, as did all 406 in
   the worker. The suite was green over the bug it names in its own header.

   (The third assertion, `/if\s*\([\s\S]{0,120}consumePendingProposal\(/`, is
   worth its own sentence: it searched the WHOLE function for ANY `if (` within
   120 characters of ANY of the two calls. Under the restored bug it matched
   `if (!ok) failed = true` — the tool loop's error flag, three lines above the
   misplaced claim. A window that wide is not looking at the subject at all.)

   So the calls are told apart by WHAT THEY WRITE — the outcome each one
   records, which is the only thing that distinguishes them and is the same
   word the function's own signature takes — and the claim is then required to
   sit in a condition that RETURNS, ahead of everything it guards.
   ══════════════════════════════════════════════════════════════════════════ */

/** Both `consumePendingProposal(…)` calls in `confirmAndRun`, with the outcome
 * each one writes. Derived, never counted: "the first one" is what went wrong. */
const claims = [...confirmBody.matchAll(/consumePendingProposal\(([^()]*)\)/g)].map((m) => ({
  at: m.index,
  outcome: /"(done|declined)"/.exec(m[1])?.[1],
}))

/** The condition a call sits inside, if it sits inside one: walk back to the
 * unbalanced `(` that opens the group, check the word before it, then read the
 * block that group guards. This is what "the answer is read" means structurally
 * — a call whose result is thrown away has no such group. */
const guardingIf = (src: string, at: number): { cond: string; block: string } | null => {
  // OUTWARD, not to the first bracket. `if (!a.length || !(await claim(…)))`
  // wraps the call in a group of its own, so stopping at the nearest unbalanced
  // `(` finds `!(` and concludes there is no guard — which is a check failing
  // on the ordinary way of writing the thing it is looking for. Every enclosing
  // group is tried, out to the end of the statement.
  let depth = 0
  let i = at
  let found = -1
  for (; i >= 0; i--) {
    const c = src[i]
    if (c === ")") depth++
    else if (c === "(") {
      if (depth > 0) depth--
      else if (/\bif\s*$/.test(src.slice(Math.max(0, i - 8), i))) {
        found = i
        break
      }
    } else if (depth === 0 && (c === ";" || c === "{" || c === "}")) break
  }
  if (found === -1) return null
  i = found
  let close = i
  depth = 0
  for (; close < src.length; close++) {
    if (src[close] === "(") depth++
    else if (src[close] === ")" && --depth === 0) break
  }
  const open = src.indexOf("{", close)
  if (open === -1) return null
  let end = open
  depth = 0
  for (; end < src.length; end++) {
    if (src[end] === "{") depth++
    else if (src[end] === "}" && --depth === 0) break
  }
  return { cond: src.slice(i, close + 1), block: src.slice(open, end + 1) }
}

describe("an approved proposal runs at most once", () => {
  it("the consume is a compare-and-swap, not a blind overwrite", () => {
    const body = (() => {
      const start = threads.indexOf("export async function consumePendingProposal")
      const next = threads.indexOf("\nexport ", start + 1)
      return threads.slice(start, next === -1 ? undefined : next)
    })()
    expect(body, "consumePendingProposal must exist").toBeTruthy()
    // The row must still hold the text we read — that predicate IS the claim.
    expect(
      /UPDATE agent_messages[\s\S]*WHERE[\s\S]*AND tool_calls_json = /.test(body),
      "the claim must ride the write, or two confirms both 'win' it"
    ).toBe(true)
    // …and it must report who won, or checking it is impossible.
    expect(/Promise<boolean>/.test(body)).toBe(true)
  })

  it("spends the proposal on BOTH answers, and the two are told apart by what they write", () => {
    // THE BLINDNESS TRIPWIRE, and here it is load-bearing rather than
    // ceremonial: every assertion below picks its subject out of this list by
    // the outcome it records, so a list that came back short or unlabelled
    // would leave those assertions comparing `undefined` to `undefined` and
    // reporting all clear. Two calls, one of each word — a "yes" and a "no"
    // both spend the proposal (the decline half is why this suite was widened;
    // see the header), and nothing else in this function may touch it.
    expect(confirmBody, "confirmAndRun must exist").toBeTruthy()
    expect(
      claims.map((c) => c.outcome),
      "confirmAndRun must spend the proposal exactly twice — once per answer — and each call must say which"
    ).toEqual(["declined", "done"])
  })

  it("confirmAndRun claims the proposal BEFORE it runs anything, and before it charges", () => {
    const claimAt = claims.find((c) => c.outcome === "done")?.at
    const runAt = confirmBody.indexOf("runToolCall(")
    const meterAt = confirmBody.indexOf("consumeAiUnit(")
    expect(claimAt, "the approve path's claim must be in confirmAndRun").toBeDefined()
    expect(runAt, "the calls must be in confirmAndRun").toBeGreaterThan(-1)
    expect(meterAt, "the meter must be in confirmAndRun").toBeGreaterThan(-1)
    // ORDER, against the claim ITSELF — not against the decline branch's call,
    // which is what this line used to compare and which is above everything.
    expect(runAt, "claim first, execute second — or a lost race still executes").toBeGreaterThan(
      claimAt as number
    )
    expect(
      meterAt,
      "the loser must be turned away before the team is charged for a turn it won't run"
    ).toBeGreaterThan(claimAt as number)
  })

  it("…and the caller that LOSES the claim proceeds no further", () => {
    // Not fire-and-forget: the answer has to be READ, and reading it has to
    // DECIDE something. Structural rather than a window — the claim must sit
    // inside an `if` condition, negated, whose block returns. A call whose
    // result is dropped has no such condition to find, whatever the layout.
    const claimAt = claims.find((c) => c.outcome === "done")?.at
    expect(claimAt, "the approve path's claim must be in confirmAndRun").toBeDefined()
    const guard = guardingIf(confirmBody, claimAt as number)
    expect(
      guard,
      "the claim's result is not read by any `if` — a claim nobody checks is a claim that cannot turn a loser away"
    ).not.toBeNull()
    expect(
      /!\s*\(?\s*await\s+consumePendingProposal\(/.test((guard as { cond: string }).cond),
      `the claim is inside a condition but is not what the condition turns on: ${(guard as { cond: string }).cond}`
    ).toBe(true)
    expect(
      /\breturn\b/.test((guard as { block: string }).block),
      "the loser's branch must RETURN — falling through it would run the calls anyway"
    ).toBe(true)
  })
})

/* ------------------------------- and a "no" ------------------------------- */

const cfg = { accountId: "a", apiToken: "t" } as never
const guard = { userId: IDS.staffUser, teamId: IDS.team, roleId: IDS.adminRole, databaseId: "db_team" }
const actor = { id: IDS.staffUser, email: "staff@kwapso.app", name: "Staff" }
const db = () => holder.db as DatabaseSync

/** Every call the agent's tools would make to a real door. A refused proposal must
 * leave this EMPTY — that, not the wording of the reply, is the security claim. */
let doorCalls: string[] = []

/** The worker Env, plus the tenancy binding executeTool posts through. Without the
 * stub a sabotaged fix would crash instead of failing an assertion, and a red for
 * the wrong reason teaches nobody anything. */
function env(): never {
  return {
    ...(makeEnv(db, IDS.staffUser) as unknown as object),
    // A KEY, AND A MODEL DOOR THAT REFUSES. Until 2026-08-27 this env had no
    // key at all and `selectModel` quietly handed back the Workers AI adapter
    // with no `AI` binding, so the model call threw and the loop settled the
    // turn — which is the path this suite actually exercises. The escape hatch
    // is gone, so the same shape is now stated out loud: a key is present, the
    // model door answers 503, the loop's own catch turns it into a settled
    // turn, and what is under test (the proposal is spent exactly once, the
    // approved call reaches its door) is unchanged.
    TENANCY: {
      fetch: async (url: string) => {
        doorCalls.push(new URL(url).pathname)
        return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } })
      },
    },
  } as never
}

/** The model door, refusing, with no network involved. Every test in this file
 * settles its turn through the loop's own catch; leaving this to a real `fetch`
 * would mean a unit test reaching the internet to find that out. */
beforeEach(() => {
  vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
    const url = String(input instanceof Request ? input.url : input)
    if (url.includes("api.anthropic.com"))
      return new Response('{"error":{"type":"overloaded_error"}}', { status: 529 })
    throw new Error(`unexpected fetch in a unit test: ${url}`)
  })
})

const request = () => new Request("https://data-ops/api/agent/confirm", { headers: { Cookie: "session=x" } })

/** The reply of a FINISHED turn. `ChatOutcome` is a union — a turn paused for another
 * panel carries no reply at all — so reading one means proving the turn ended first.
 * (tsc asked the question; it is a fair one to have to answer.) */
function replyOf(outcome: ChatOutcome): string {
  expect(outcome.done, "the turn must have finished, not paused for another panel").toBe(true)
  return outcome.done ? outcome.reply : ""
}

/** A thread holding exactly one PROPOSED dangerous call, as a paused turn leaves it. */
async function threadAwaitingAnswer(): Promise<string> {
  const threadId = await createThread(cfg, guard, actor, "Grant a login")
  await appendMessage(cfg, guard, actor, threadId, {
    role: "assistant",
    content: "I can do that — may I?",
    toolCallsJson: JSON.stringify([
      { tool: "grant_portal_access", input: { accountId: IDS.victimAccount, personAccountId: IDS.clientPerson }, status: "proposed" },
    ]),
    source: "web",
  })
  return threadId
}

/** The stored statuses on the proposing row — the agent's audit of what happened. */
function storedStatuses(threadId: string): string[] {
  const row = db()
    .prepare(
      "SELECT tool_calls_json FROM agent_messages WHERE thread_id = ? AND role = 'assistant' AND tool_calls_json IS NOT NULL ORDER BY created_at DESC LIMIT 1"
    )
    .get(threadId) as { tool_calls_json: string } | undefined
  return (JSON.parse(row?.tool_calls_json ?? "[]") as { status?: string }[]).map((x) => x.status ?? "")
}

beforeEach(() => {
  holder.db = buildSpineDb()
  doorCalls = []
  // The metering tables and the starting balance now come from the spine
  // harness itself — it runs the REAL core migrations, for the reason this
  // comment used to give here: a fixture that drifts from the shipped schema is
  // a test that stops describing production. It moved when a THIRD suite needed
  // them, because three copies is three chances to drift.
})

describe('a declined proposal is spent — "no" is durable', () => {
  it("the fixture really is a thread awaiting an answer (or every test below is hollow)", async () => {
    const threadId = await threadAwaitingAnswer()
    const pending = await getPendingProposal(cfg, guard, threadId)
    expect(pending.map((p) => p.name), "the proposal must be pending BEFORE the decline").toEqual([
      "grant_portal_access",
    ])
  })

  it("declining spends it, so nothing is left waiting", async () => {
    const threadId = await threadAwaitingAnswer()
    await confirmAndRun(env(), request(), cfg, guard, actor, { threadId, approve: false, source: "web" })
    expect(
      await getPendingProposal(cfg, guard, threadId),
      "a refused proposal must not stay pending — a later approval would run it"
    ).toEqual([])
  })

  it("…and a later YES on the same thread runs nothing", async () => {
    const threadId = await threadAwaitingAnswer()
    await confirmAndRun(env(), request(), cfg, guard, actor, { threadId, approve: false, source: "web" })
    doorCalls = [] // only what the RETRY does counts

    const retry = await confirmAndRun(env(), request(), cfg, guard, actor, {
      threadId,
      approve: true,
      source: "mcp:acme", // the shape that matters: an autonomous client retrying
    })

    // The claim, in the only terms that matter: the refused write never reached
    // its door. The reply's wording is the corroboration, not the proof.
    expect(doorCalls, "a call the person REFUSED must never reach the door").toEqual([])
    expect(replyOf(retry)).toBe("There's nothing waiting for your approval.")
  })

  it("and the audit says refused, not done", async () => {
    const threadId = await threadAwaitingAnswer()
    await confirmAndRun(env(), request(), cfg, guard, actor, { threadId, approve: false, source: "web" })
    // These rows ARE the agent's audit log. "proposed" would mean still live;
    // "done" would say the app carried out the thing the person turned down.
    expect(storedStatuses(threadId)).toEqual(["declined"])
  })

  it("an APPROVED proposal still runs — the fix must not deafen the yes", async () => {
    const threadId = await threadAwaitingAnswer()
    const ok = await confirmAndRun(env(), request(), cfg, guard, actor, {
      threadId,
      approve: true,
      source: "web",
    })
    expect(doorCalls, "the approved call must reach its door").toContain("/api/tenancy/portal-users")
    expect(replyOf(ok), "and it must not be turned away as if nothing were waiting").not.toBe(
      "There's nothing waiting for your approval."
    )
    expect(storedStatuses(threadId)).toEqual(["done"])
  })
})

/* ------------------------ …and a proposal that went stale ------------------ */
//
// The gate had one more hole and it was TIME. `getPendingProposal` read the most
// recent assistant row carrying a proposal, `ORDER BY created_at DESC LIMIT 1`,
// with no floor under it — so a dangerous call proposed on a Tuesday and never
// answered stayed one click from running for ever. The person clicking would be
// answering a question they could not see, about a team that had moved on.
//
// BEHAVIOURAL, against the real schema, for the same reason the decline half is:
// the bound lives inside a SQL string, and a source-reading test that greps for
// `created_at >` would pass just as happily on a statement that compared it to
// the wrong thing.

describe("a proposal expires — an unanswered yes/no cannot run for ever", () => {
  /** Age the proposing row by hand. `AGENT_PROPOSAL_TTL_MS` is what the code
   * uses, so the test moves with the constant instead of pinning a number. */
  function ageProposal(threadId: string, byMs: number): void {
    const at = new Date(Date.now() - byMs).toISOString()
    db()
      .prepare(
        "UPDATE agent_messages SET created_at = ? WHERE thread_id = ? AND role = 'assistant' AND tool_calls_json IS NOT NULL"
      )
      .run(at, threadId)
  }

  it("one minute inside the window is still approvable", async () => {
    const threadId = await threadAwaitingAnswer()
    ageProposal(threadId, AGENT_PROPOSAL_TTL_MS - 60_000)
    expect(
      (await getPendingProposal(cfg, guard, threadId)).map((p) => p.name),
      "a proposal inside the window must survive — the fix must not deafen an ordinary pause"
    ).toEqual(["grant_portal_access"])
  })

  it("one minute past it is gone", async () => {
    const threadId = await threadAwaitingAnswer()
    ageProposal(threadId, AGENT_PROPOSAL_TTL_MS + 60_000)
    expect(
      await getPendingProposal(cfg, guard, threadId),
      "a stale proposal must read as nothing pending"
    ).toEqual([])
  })

  it("and approving a stale one reaches no door at all", async () => {
    const threadId = await threadAwaitingAnswer()
    ageProposal(threadId, AGENT_PROPOSAL_TTL_MS + 60_000)
    await confirmAndRun(env(), request(), cfg, guard, actor, { threadId, approve: true, source: "web" })
    // The claim is the empty door log, not the wording: a stale "yes" must not
    // grant a portal login.
    expect(doorCalls, "a stale approval must execute nothing").toEqual([])
    // …and the row is left as it was, so nothing pretends this was carried out.
    expect(storedStatuses(threadId)).toEqual(["proposed"])
  })
})
