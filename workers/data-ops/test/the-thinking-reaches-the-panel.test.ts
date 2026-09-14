// THE MODEL'S THINKING IS STREAMED TO THE PERSON, AND NEVER INTO THE ANSWER.
//
// Before 14 Sep 2026 a reasoning model's hidden thinking was thrown away on the
// way through `parseOpenAiStream`, so a step that spent a hundred seconds
// thinking looked, on the panel, exactly like a step that had died — and the
// one fact that explained a wrong average ("divide by the 15 accounts that
// have any") was visible to nobody. It is now handed over live as its own
// event (`thought`), which the panel draws as a strip a person may open.
//
// WHAT THIS PINS:
//   1. the stream adapter hands each reasoning delta to `onThought` and never
//      to `onText` — thinking in the answer bubble would be the worse bug;
//   2. the loop wires that callback to a `thought` event, and to nothing that
//      counts as the assistant having SPOKEN;
//   3. the event is a declared member of the shared wire type, so the client
//      cannot be sent a frame its own union does not name.
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { parseOpenAiStream } from "../src/lib/model"

const AGENT = readFileSync(join(__dirname, "../src/lib/agent.ts"), "utf8")
const TYPES = readFileSync(join(__dirname, "../../../shared/types.ts"), "utf8")
const CLIENT = readFileSync(join(__dirname, "../../../web/lib/api/stream.ts"), "utf8")

function sse(events: unknown[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder()
  return new ReadableStream({
    start(c) {
      for (const ev of events) c.enqueue(enc.encode(`data: ${JSON.stringify(ev)}\n\n`))
      c.close()
    },
  })
}

describe("the thinking reaches the panel", () => {
  it("each reasoning delta goes to onThought, and none of it to onText", async () => {
    const said: string[] = []
    const thought: string[] = []
    const reply = await parseOpenAiStream(
      sse([
        { choices: [{ delta: { reasoning_content: "First, count " } }] },
        { choices: [{ delta: { reasoning_content: "the open ones." } }] },
        { choices: [{ delta: { content: "There are 433." } }] },
        { choices: [{ delta: {}, finish_reason: "stop" }] },
      ]),
      (d) => said.push(d),
      (d) => thought.push(d)
    )
    expect(thought).toEqual(["First, count ", "the open ones."])
    expect(said).toEqual(["There are 433."])
    expect(reply.text).toBe("There are 433.")
    expect(reply.reasoning).toBe("First, count the open ones.")
  })

  it("a caller with no strip to fill may pass nothing, and the words still land on the reply", async () => {
    const reply = await parseOpenAiStream(sse([{ choices: [{ delta: { reasoning_content: "hm" } }] }]), () => {})
    expect(reply.reasoning).toBe("hm")
  })

  it("the loop forwards it as a `thought` event that does not count as speaking", () => {
    const call = AGENT.slice(AGENT.indexOf("const onThought"), AGENT.indexOf("model.complete(convo"))
    expect(call).toContain('emit!({ t: "thought", d })')
    expect(call).toContain("}, onThought))")
    // `spoke` is what decides whether the answer's first word gets a blank
    // line before it; thinking must not flip it.
    const thoughtArm = call.slice(0, call.indexOf("model.stream!("))
    expect(thoughtArm).not.toContain("spoke = true")
  })

  it("both ends of the wire declare the event", () => {
    expect(TYPES).toContain('| { t: "thought"; d: string }')
    expect(CLIENT).toContain('| { t: "thought"; d: string }')
  })
})
