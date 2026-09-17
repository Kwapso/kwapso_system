// STAGING BUG (fd220c62): the "Not updating live right now" banner didn't
// appear until a full page reload, even though the team WebSocket had gone
// silently dead mid-session. `onclose`/`onerror` are the ONLY things that ever
// reset `teamConnectedAt` and trigger the existing backoff/reconnect — and a
// proxy that drops the TCP session without forwarding a close frame never
// fires either one. `readyState` still says OPEN; nothing else asks.
//
// THE FIX: an application-level heartbeat in `useLiveChannel`
// (shared/web/realtime.ts) — send "ping" every HEARTBEAT_INTERVAL_MS, and if
// a full interval + HEARTBEAT_TIMEOUT_MS passes with no "pong" back, close the
// socket OURSELVES. That reuses the reconnect path that already exists; it
// does not add a second one. `workers/realtime`'s `webSocketMessage` answers
// "ping" with "pong" (see workers/realtime/test/realtime.test.ts for that half).
//
// This test drives the client half in isolation with a fake WebSocket and
// fake timers: a socket that never answers a ping gets closed by the
// watchdog; a socket that keeps answering never does.

import { renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

class FakeSocket {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSING = 2
  static readonly CLOSED = 3
  static instances: FakeSocket[] = []
  readyState = FakeSocket.CONNECTING
  onopen: (() => void) | null = null
  onmessage: ((e: { data: string }) => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  sent: string[] = []
  closeCalls = 0
  constructor(public url: string) {
    FakeSocket.instances.push(this)
  }
  open() {
    this.readyState = FakeSocket.OPEN
    this.onopen?.()
  }
  send(data: string) {
    this.sent.push(data)
  }
  close() {
    if (this.readyState === FakeSocket.CLOSED) return
    this.closeCalls++
    this.readyState = FakeSocket.CLOSED
    this.onclose?.()
  }
  receive(data: string) {
    this.onmessage?.({ data })
  }
}

const HEARTBEAT_INTERVAL_MS = 20_000
const HEARTBEAT_TIMEOUT_MS = 10_000

describe("the team channel's heartbeat", () => {
  let originalWebSocket: typeof WebSocket

  beforeEach(() => {
    vi.useFakeTimers()
    FakeSocket.instances = []
    originalWebSocket = globalThis.WebSocket
    globalThis.WebSocket = FakeSocket as unknown as typeof WebSocket
  })

  afterEach(() => {
    vi.useRealTimers()
    globalThis.WebSocket = originalWebSocket
  })

  it("pings on schedule, and closes a socket that never answers — readyState alone would never catch it", async () => {
    const { useRealtime } = await import("@shared/web/realtime")
    const { unmount } = renderHook(() => useRealtime("team-hb", () => {}))

    const socket = FakeSocket.instances[0]!
    expect(socket.url).toContain("team=team-hb")
    socket.open()

    // One heartbeat interval: a ping goes out, no pong answers it.
    vi.advanceTimersByTime(HEARTBEAT_INTERVAL_MS)
    expect(socket.sent).toEqual(["ping"])
    expect(socket.closeCalls).toBe(0)

    // The watchdog only re-checks on its own next tick — a FULL interval
    // later, at t = 2×INTERVAL — and by then interval+timeout has passed with
    // still no pong: it gives up on a socket that `readyState` alone still
    // calls OPEN, and closes it, which is what lets the existing
    // onclose→backoff→reconnect path take over.
    vi.advanceTimersByTime(HEARTBEAT_INTERVAL_MS)
    expect(socket.closeCalls).toBe(1)

    unmount()
  })

  it("never closes a socket that keeps answering", async () => {
    const { useRealtime } = await import("@shared/web/realtime")
    const { unmount } = renderHook(() => useRealtime("team-hb-2", () => {}))

    const socket = FakeSocket.instances[0]!
    socket.open()

    for (let round = 0; round < 3; round++) {
      vi.advanceTimersByTime(HEARTBEAT_INTERVAL_MS)
      socket.receive("pong")
      vi.advanceTimersByTime(HEARTBEAT_TIMEOUT_MS)
    }
    expect(socket.closeCalls).toBe(0)

    unmount()
  })

  it("a bare 'pong' frame never reaches the event handler as a malformed frame", async () => {
    const { useRealtime } = await import("@shared/web/realtime")
    const onEvent = vi.fn()
    const { unmount } = renderHook(() => useRealtime("team-hb-3", onEvent))

    const socket = FakeSocket.instances[0]!
    socket.open()
    socket.receive("pong")

    expect(onEvent).not.toHaveBeenCalled()
    unmount()
  })
})
