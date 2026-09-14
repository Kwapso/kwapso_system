// THE MODEL'S THINKING, AS ITS OWN ROW IN THE TRANSCRIPT.
//
// A `thought` delta opens a "Working it out" row in the place a tool step
// would sit — before the answer bubble — and every later delta of the same
// model call appends to it. The next thing the model DOES with that thinking
// (a step, the answer's first word) settles the row from spinner to tick; a
// second model call opens a second row. The answer bubble never receives a
// word of it.
import { act, renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/api", () => ({
  ApiFailure: class ApiFailure extends Error {},
  dataOps: {
    agentUsage: async () => ({ quota: { remaining: 5, freeRemaining: 5, freeDaily: 5, creditBalance: 0, blocked: false } }),
    agentThreads: async () => ({ threads: [] }),
    agentThread: async () => ({ messages: [] }),
    agentChatStream: async (_b: unknown, onEvent: (ev: unknown) => void) => {
      onEvent({ t: "thought", d: "I should count " })
      onEvent({ t: "thought", d: "the open tickets first." })
      onEvent({ t: "step_start", tool: "query_records", summary: "Look up tickets" })
      onEvent({ t: "step_end", tool: "query_records", ok: true, summary: "Look up tickets" })
      onEvent({ t: "thought", d: "433, so now the averages." })
      onEvent({ t: "text", d: "There are 433 open tickets." })
      onEvent({
        t: "final",
        outcome: {
          done: true,
          threadId: "t1",
          reply: "There are 433 open tickets.",
          quota: { freeDaily: 5, freeUsedToday: 1, freeRemaining: 4, creditBalance: 0, remaining: 4, blocked: false, unlimited: false },
        },
      })
    },
    agentConfirmStream: async () => {},
  },
}))

describe("the thinking strip", () => {
  it("one row per model call, in sequence, settled by what the model did next", async () => {
    const { useAgentChat } = await import("@/lib/use-agent-chat")
    const { result } = renderHook(() => useAgentChat("team1", true, true))
    await act(async () => {
      await result.current.send("how many open tickets?")
    })
    await waitFor(() => {
      expect(result.current.items.some((i) => i.role === "assistant" && i.content)).toBe(true)
    })
    const rows = result.current.items.filter((i) => i.role === "tool")
    const thoughts = rows.filter((r) => r.role === "tool" && r.thought !== undefined)
    expect(thoughts.map((r) => r.role === "tool" && r.thought)).toEqual([
      "I should count the open tickets first.",
      "433, so now the averages.",
    ])
    // Both settled — the first by the step, the second by the answer.
    expect(thoughts.map((r) => r.status)).toEqual(["done", "done"])
    // Order in the transcript: thinking, step, thinking, then the bubble.
    const kinds = result.current.items.map((i) =>
      i.role === "tool" ? (i.thought !== undefined ? "thought" : "step") : i.role
    )
    expect(kinds).toEqual(["user", "thought", "step", "thought", "assistant"])
    // And not a word of it in the answer.
    const said = result.current.items.find((i) => i.role === "assistant")
    expect(said && said.role === "assistant" ? String(said.content) : "").not.toContain("averages")
  })
})
