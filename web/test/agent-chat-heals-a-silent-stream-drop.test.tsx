// STAGING BUG (fd220c62, seen signed in as alaap@kwapso.com at 1280px): ask the
// assistant a knowledge question in an existing Conversation tab. The answer
// painted, but the "What I read" citation block never rendered even though the
// server's own retrieval had 2 citations, and the credits badge sat stale
// (1956 vs the server's already-debited 1954). A reload fixed both.
//
// ROOT CAUSE (not the team WebSocket / store.ts live layer at all — the agent
// chat's citations and quota never go through either): the chat stream is a
// plain SSE `fetch` read in a `for(;;)` loop that only throws when the
// underlying read itself rejects. An idle-timeout proxy can close the response
// body CLEANLY after the `text` frames but before the `sources`/`final`
// frames — the loop exits via `done: true`, no exception, so `send()`'s catch
// (which already calls `resyncAfterDrop()` for a real failure) never runs. The
// server had finished the turn; the client just stopped listening one frame
// early.
//
// THE FIX, in `consume()` (web/lib/use-agent-chat.tsx): track whether a
// genuinely terminal event (`final` / `confirm` / `error`) was ever seen. If
// `run()` returns without one, treat it exactly like the existing dropped-
// stream catch does — re-sync from the saved thread, which restores the
// citations and the quota from what the server actually has.
//
// This test drives that exact shape: the mocked stream emits only a `text`
// delta and then resolves (a clean early close), while the mocked saved
// thread already carries the tool row + citation the live stream never
// delivered. Read it and run it red (temporarily undo the `!sawTerminal`
// check) before trusting it green.

import { act, renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { KnowledgeCitation } from "@shared/types"

const CITATION: KnowledgeCitation = {
  sourceId: "src-1",
  title: "Kwapso CPAA - Feedback",
  kind: "meeting",
  url: null,
  recordPath: "/meetings/m1",
  liveStatus: null,
  checkedAt: null,
}

// The exact shape `evidenceFromSaved` (shared/agent-cites.ts) parses back out
// of a saved tool row: the SAVED_RESULT_PREFIX, then the ask_knowledge answer
// JSON — this IS the audit trail R23 wants, and the only place a reopened
// turn's citations come from.
const SAVED_RESULT =
  "OK. Result data: " +
  JSON.stringify({
    found: true,
    citations: [CITATION],
    passages: [],
    reason: "matched the feedback meeting",
    candidates: 1,
    reread: false,
  })

let usageCalls = 0

vi.mock("@/lib/api", () => ({
  ApiFailure: class ApiFailure extends Error {},
  dataOps: {
    // Called once at panel-open (stale) and once more by resyncAfterDrop
    // (fresh) — the second call is what proves the quota badge healed too.
    agentUsage: async () => {
      usageCalls++
      const remaining = usageCalls === 1 ? 1956 : 1954
      return { quota: { remaining, freeRemaining: remaining, freeDaily: 2000, creditBalance: 0, blocked: false } }
    },
    agentThreads: async () => ({ threads: [{ id: "t-drop", teamId: "team-drop", createdAt: "2026-09-16T00:00:00Z" }] }),
    // What the SERVER actually finished saving — the tool row's citation and
    // the settled assistant reply — none of which the truncated stream below
    // ever delivered to the client.
    agentThread: async () => ({
      messages: [
        { id: "u1", threadId: "t-drop", role: "user", content: "What do we know about Kwapso CPAA feedback?", source: null, createdAt: "2026-09-16T20:00:00Z" },
        {
          id: "tool1",
          threadId: "t-drop",
          role: "tool",
          content: SAVED_RESULT,
          toolCalls: [{ tool: "ask_knowledge", status: "done", summary: "Searched the knowledge base" }],
          source: null,
          createdAt: "2026-09-16T20:00:01Z",
        },
        { id: "a1", threadId: "t-drop", role: "assistant", content: "Feedback was positive overall.", source: null, createdAt: "2026-09-16T20:00:02Z" },
      ],
    }),
    // THE DROP: one text delta, then the stream just ENDS — no `sources`, no
    // `final`, and no thrown error. This is the idle-timeout proxy's clean
    // early close, not a network failure `send()`'s catch would ever see.
    agentChatStream: async (_body: unknown, onEvent: (ev: unknown) => void) => {
      onEvent({ t: "text", d: "Feedback was positive" })
    },
    agentConfirmStream: async () => {},
  },
}))

import { useAgentChat } from "@/lib/use-agent-chat"

// Matches the cast web/test/assistant-cites.test.tsx already uses for the
// same union: `.filter` alone can't narrow AgentChatItem's tool/assistant
// branches, and a hand-rolled type guard over it collapses to `never` because
// the kit's own AgentChatMessage type isn't a plain literal-discriminated
// union either.
type SettledAssistant = { role: "assistant"; content?: unknown; evidence?: { citations: { title: string }[] } }

describe("a chat stream that ends without a terminal event heals itself", () => {
  it("re-syncs from the saved thread, restoring the citation and the quota a dropped stream never delivered", async () => {
    const { result } = renderHook(() => useAgentChat("team-drop", true, true))

    await act(async () => {
      await result.current.send("What do we know about Kwapso CPAA feedback?")
    })

    // THE CITATION: absent from the live "text"-only stream, present after the
    // silent-drop resync pulls the saved thread (tool row → evidenceFromSaved).
    await waitFor(() => {
      const assistant = result.current.items.filter((i) => i.role === "assistant") as SettledAssistant[]
      const last = assistant.at(-1)
      expect(last?.evidence?.citations).toHaveLength(1)
      expect(last?.evidence?.citations[0]?.title).toBe("Kwapso CPAA - Feedback")
    })

    // THE QUOTA: the SECOND agentUsage() call — resyncAfterDrop's own refresh —
    // not the stale number the panel opened with.
    expect(result.current.quota?.remaining).toBe(1954)

    // The reply itself still reads right — this was never the broken half.
    const assistant = result.current.items.filter((i) => i.role === "assistant") as SettledAssistant[]
    expect(assistant.at(-1)?.content).toBeTruthy()
  })
})
