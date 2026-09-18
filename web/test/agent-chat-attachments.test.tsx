// PICKED FILES AS CHAT CONTEXT — "assistant a1", the client's decision, 18 Sep
// 2026, verbatim: "A1 Paperclip, files as chat context: paperclip at the left
// inside the pill; a picked file shows as a small tile above the pill; the
// file is read by the assistant for THIS conversation only (not stored
// anywhere else)." Reverses the 13 Sep 2026 removal.
//
// This proves the HOOK's own half of the restored plumbing — `attached` /
// `addAttachments` / `removeAttachment` in use-agent-chat.tsx — the same
// level `agent-chat-survives-remount.test.tsx` already tests this hook at,
// and the level a full `AgentPanel` render has never been exercised at in
// this suite (its dock/tabs/portal dependencies are large enough that every
// other test here targets a smaller piece — the tab strip, the scope picker,
// the hook — rather than the whole panel). The UI half (the tile grid mounts,
// the paperclip opens the picker, the `pe-` strip) is `<FileUpload` itself,
// already proved generically by file-upload-items-feed-tiles.test.ts and
// upload-items.test.ts; this file is what proves the picking, the refusal,
// and the wire shape actually reaching the door.

import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const toastError = vi.hoisted(() => vi.fn())
vi.mock("@shared/ui/components/sonner/sonner", () => ({ toast: { error: toastError, success: vi.fn() } }))

const sentBodies = vi.hoisted(() => [] as unknown[])
vi.mock("@/lib/api", () => ({
  ApiFailure: class ApiFailure extends Error {},
  dataOps: {
    agentUsage: async () => ({
      quota: { remaining: 5, freeRemaining: 5, freeDaily: 5, creditBalance: 0, blocked: false },
    }),
    agentThreads: async () => ({ threads: [] }),
    agentThread: async () => ({ messages: [] }),
    agentChatStream: async (body: unknown, onEvent: (ev: unknown) => void) => {
      sentBodies.push(body)
      onEvent({ t: "final", outcome: { done: true, reply: "Got it.", threadId: "t-attach", quota: null } })
    },
    agentConfirmStream: async () => {},
  },
}))

import { useAgentChat } from "@/lib/use-agent-chat"
import { AGENT_ATTACH_MAX_BYTES, AGENT_ATTACH_MAX_FILES } from "@shared/workers/limits"

const textFile = (name: string, contents: string, type = "text/plain") => new File([contents], name, { type })
const sizedFile = (name: string, bytes: number, type: string) => new File([new Uint8Array(bytes)], name, { type })

// EVERY FIELD THIS HOOK OWNS, INCLUDING `attached`, IS A MODULE-LEVEL CELL —
// deliberately, so a breakpoint-crossing remount cannot lose it (see
// agent-chat-survives-remount.test.tsx). That means it also survives across
// TESTS, teamId included (the app shows one team's assistant at a time, so
// there is one shared cell, never a map). `newChat()` is the one call that
// clears every one of them, `attached` included — reset through it here
// rather than reaching into the module's own unexported cells.
beforeEach(() => {
  toastError.mockClear()
  sentBodies.length = 0
  const { result } = renderHook(() => useAgentChat("team-attach-reset", true, true))
  act(() => result.current.newChat())
})

describe("picking a file stages it, and it is removable before send", () => {
  it("a valid file lands in `attached`", () => {
    const { result } = renderHook(() => useAgentChat("team-attach-1", true, true))
    const file = textFile("notes.txt", "hello")
    act(() => result.current.addAttachments([file]))
    expect(result.current.attached).toEqual([file])
    expect(toastError).not.toHaveBeenCalled()
  })

  it("removeAttachment takes it back off, by the same id the picked-file tile carries", async () => {
    const { result } = renderHook(() => useAgentChat("team-attach-2", true, true))
    const file = textFile("notes.txt", "hello")
    act(() => result.current.addAttachments([file]))
    expect(result.current.attached).toHaveLength(1)

    const { pickedFileId } = await import("@shared/web/upload-items")
    act(() => result.current.removeAttachment(pickedFileId(file)))
    expect(result.current.attached).toEqual([])
  })
})

describe("size/kind limits refuse with a plain toast, and keep everything else picked", () => {
  it("a kind nothing here can read is refused, the rest still lands", () => {
    const { result } = renderHook(() => useAgentChat("team-attach-3", true, true))
    const bad = sizedFile("clip.mp4", 1024, "video/mp4")
    const good = textFile("notes.txt", "hello")
    act(() => result.current.addAttachments([bad, good]))
    expect(result.current.attached).toEqual([good])
    expect(toastError).toHaveBeenCalledTimes(1)
    expect(toastError.mock.calls[0][0]).toContain("clip.mp4")
  })

  it("a file over the cap is refused", () => {
    const { result } = renderHook(() => useAgentChat("team-attach-4", true, true))
    const big = sizedFile("huge.png", AGENT_ATTACH_MAX_BYTES + 1, "image/png")
    act(() => result.current.addAttachments([big]))
    expect(result.current.attached).toEqual([])
    expect(toastError).toHaveBeenCalledTimes(1)
    expect(toastError.mock.calls[0][0]).toContain("huge.png")
  })

  it("more than the file-count ceiling is refused past the limit", () => {
    const { result } = renderHook(() => useAgentChat("team-attach-5", true, true))
    const files = Array.from({ length: AGENT_ATTACH_MAX_FILES + 2 }, (_, i) => textFile(`f${i}.txt`, "x"))
    act(() => result.current.addAttachments(files))
    expect(result.current.attached).toHaveLength(AGENT_ATTACH_MAX_FILES)
    expect(toastError).toHaveBeenCalled()
  })
})

describe("send carries the picked files, and empties the tray", () => {
  it("agentChatStream receives attachments as {name, mime, dataUrl}, and the tray clears", async () => {
    const { result } = renderHook(() => useAgentChat("team-attach-6", true, true))
    const file = textFile("notes.txt", "hello there")
    act(() => result.current.addAttachments([file]))
    expect(result.current.attached).toHaveLength(1)

    await act(async () => {
      await result.current.send("what does this say?")
    })

    expect(sentBodies).toHaveLength(1)
    const body = sentBodies[0] as { attachments?: { name: string; mime: string; dataUrl: string }[] }
    expect(body.attachments).toHaveLength(1)
    expect(body.attachments?.[0]?.name).toBe("notes.txt")
    expect(body.attachments?.[0]?.mime).toBe("text/plain")
    expect(body.attachments?.[0]?.dataUrl).toMatch(/^data:text\/plain;base64,/)
    expect(result.current.attached, "the tray empties the moment the turn is sent").toEqual([])
  })

  it("sending with nothing picked carries no attachments field at all", async () => {
    const { result } = renderHook(() => useAgentChat("team-attach-7", true, true))
    await act(async () => {
      await result.current.send("hello")
    })
    const body = sentBodies[0] as { attachments?: unknown }
    expect(body.attachments).toBeUndefined()
  })
})
