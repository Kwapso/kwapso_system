// THE DOOR BEHIND `describe_tool` — the half of every tool description that is
// no longer in the manifest.
//
// On 8 Sep 2026 the shared catalogue's summaries were cut from 69,892 characters
// to 19,494 and everything they said moved onto `detail`, which no `tools/list`
// carries. That trade is only honest if the detail can actually be FETCHED, and
// "the prose is still in the source file" is not the same sentence: the file is
// on a worker nobody outside can read. So this drives the real route table and
// asks the real door.
//
// THE POSITIVE CONTROL IS THE POINT. A door that answered 400 to everything
// would pass a refusals-only suite perfectly and leave the manual unreachable —
// which is the failure this whole change would be judged by, weeks later, as
// "the assistant got worse". So the first assertion is that a real tool comes
// back with prose LONGER than its summary, quoted from the catalogue itself
// rather than from a string typed here.

import { DatabaseSync } from "node:sqlite"
import { beforeEach, describe, expect, it, vi } from "vitest"

const holder = vi.hoisted(() => ({ db: null as DatabaseSync | null }))

vi.mock("@shared/workers/d1-rest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/d1-rest")>()
  const { d1Impl } = await import("./d1-sqlite")
  return { ...actual, ...d1Impl(() => holder.db as DatabaseSync) }
})

import { SHARED_TOOLS } from "@shared/workers/tool-catalog"
import worker from "../src/index"
import { buildSpineDb, IDS, makeEnv } from "./spine-harness"

beforeEach(() => {
  holder.db = buildSpineDb()
})

/** The door, as whichever signed-in person is named. */
async function describeTool(
  userId: string,
  qs: string
): Promise<{ status: number; body: Record<string, unknown> }> {
  const request = new Request(`https://tenancy/api/tenancy/tools/describe${qs}`, {
    headers: { Cookie: "session=x" },
  })
  const res = await worker.fetch(request, makeEnv(() => holder.db as DatabaseSync, userId))
  return { status: res.status, body: (await res.json()) as Record<string, unknown> }
}

/** A tool that really was trimmed, chosen from the catalogue rather than named
 * here — so this suite cannot outlive the tool it tests. */
const TRIMMED = SHARED_TOOLS.find((t) => t.detail && t.detail.length > 800)!

describe("describe_tool hands back the prose the manifest stopped carrying", () => {
  it("the catalogue really has a long detail to serve (or every assertion below is empty)", () => {
    expect(TRIMMED, "no tool carries a detail over 800 characters — the trim was undone").toBeDefined()
    expect(TRIMMED.summary.length).toBeLessThanOrEqual(160)
  })

  it("answers a real tool with its summary AND its detail", async () => {
    const { status, body } = await describeTool(IDS.staffUser, `?tool=${TRIMMED.name}`)
    expect(status).toBe(200)
    expect(body.tool).toBe(TRIMMED.name)
    expect(body.summary).toBe(TRIMMED.summary)
    expect(body.trimmed).toBe(true)
    // The whole point: what came back is LONGER than what the manifest carries.
    expect(String(body.detail).length).toBeGreaterThan(String(body.summary).length)
    expect(body.detail).toBe(TRIMMED.detail)
  })

  it("a short tool answers honestly rather than repeating itself", async () => {
    const short = SHARED_TOOLS.find((t) => !t.detail)!
    expect(short, "every tool was trimmed — re-point this case").toBeDefined()
    const { status, body } = await describeTool(IDS.staffUser, `?tool=${short.name}`)
    expect(status).toBe(200)
    expect(body.trimmed).toBe(false)
    expect(body.detail, "a tool with nothing more to say must not invent a second half").toBeUndefined()
  })

  it("a name that is not a tool is a 400 that says what to try", async () => {
    const { status, body } = await describeTool(IDS.staffUser, "?tool=list_help_ticket")
    expect(status).toBe(400)
    expect(body.error).toBe("unknown_tool")
    // Named, not just refused — a model handed "no such thing" asks again.
    expect(String(body.message)).toContain("list_help_tickets")
  })

  it("no name at all is a 400, not a catalogue", async () => {
    // R14's posture: the caller is already holding every name (the manifest is
    // what sent them here), so "list them all" would be a second copy of the
    // thing that was too big in the first place.
    const { status, body } = await describeTool(IDS.staffUser, "")
    expect(status).toBe(400)
    expect(body.error).toBe("invalid_input")
  })

  it("a client login is refused at the door (R21)", async () => {
    // The agency's tool catalogue names the agency's own doors. A client login
    // is an ordinary team member at the other hostname, so the refusal is the
    // door's, not the gateway's.
    const { status, body } = await describeTool(IDS.contactUser, `?tool=${TRIMMED.name}`)
    expect(status).toBe(403)
    expect(body.error).toBe("client_login")
  })
})
