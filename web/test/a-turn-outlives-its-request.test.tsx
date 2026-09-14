// WHEN THE SERVER SAYS `continues`, THE PANEL ASKS FOR THE REST AT ONCE.
//
// The first request ends with the carrying-on note and `continues: true`; the
// panel must call the same door again with `{ threadId, continue: true }` — no
// message, the SAME assistant bubble — and keep doing so until a segment ends
// without `continues`. The answer lands in the one bubble; the steps of every
// segment stay in the transcript above it.
import { act, renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

const calls: unknown[] = []
const quota = { freeDaily: 5, freeUsedToday: 1, freeRemaining: 4, creditBalance: 0, remaining: 4, blocked: false, unlimited: false }

vi.mock("@/lib/api", () => ({
  ApiFailure: class ApiFailure extends Error {},
  dataOps: {
    agentUsage: async () => ({ quota: { remaining: 5, freeRemaining: 5, freeDaily: 5, creditBalance: 0, blocked: false } }),
    agentThreads: async () => ({ threads: [] }),
    agentThread: async () => ({ messages: [] }),
    agentChatStream: async (body: Record<string, unknown>, onEvent: (ev: unknown) => void) => {
      calls.push(body)
      if (body.continue !== true) {
        onEvent({ t: "step_start", tool: "query_records", summary: "Count tickets by accountId" })
        onEvent({ t: "step_end", tool: "query_records", ok: true, summary: "Count tickets by accountId" })
        onEvent({ t: "final", outcome: { done: true, threadId: "t1", reply: "Still working on that one — carrying on from where I got to.", quota, continues: true } })
        return
      }
      onEvent({ t: "step_start", tool: "query_records", summary: "Count ticket moves by movedBy" })
      onEvent({ t: "step_end", tool: "query_records", ok: true, summary: "Count ticket moves by movedBy" })
      onEvent({ t: "text", d: "433 open; Aurora triaged the most." })
      onEvent({ t: "final", outcome: { done: true, threadId: "t1", reply: "433 open; Aurora triaged the most.", quota } })
    },
    agentConfirmStream: async () => {},
  },
}))

describe("a turn can outlive its request", () => {
  it("chains the next segment into the same bubble until the server stops saying continues", async () => {
    const { useAgentChat } = await import("@/lib/use-agent-chat")
    const { result } = renderHook(() => useAgentChat("team1", true, true))
    await act(async () => {
      await result.current.send("how many open tickets, and who triaged the most?")
    })
    await waitFor(() => expect(calls.length).toBe(2))
    expect(calls[1]).toEqual({ threadId: "t1", continue: true })
    expect(calls[0]).toMatchObject({ message: "how many open tickets, and who triaged the most?" })

    const kinds = result.current.items.map((i) => (i.role === "tool" ? `step:${i.actionLabel}` : i.role))
    expect(kinds).toEqual(["user", "step:Count tickets by accountId", "step:Count ticket moves by movedBy", "assistant"])
    const said = result.current.items.find((i) => i.role === "assistant")
    expect(said && said.role === "assistant" ? String(said.content) : "").toBeTruthy()
    expect(result.current.threadId).toBe("t1")
    expect(result.current.busy).toBe(false)
  })
})
