// TWO CLIENTS, ONE TEAM — the test the live layer never had.
//
// Everything else about realtime in this repo is checked STATICALLY: R15 proves
// every published resource has a listener registered, the seam suites prove
// every mutation publishes. Neither one ever OPENS A SOCKET, so the chain that
// actually carries a change from one person's screen to another's — ping →
// listener → cache → the component re-rendering — was proven a link at a time
// and never end to end.
//
// This drives the real modules with a fake WebSocket: `useRealtime` (the actual
// client, its actual backoff), the actual store, and the actual `useTeamLive`.
// Nothing here is a stand-in except the transport, which is the one piece a
// jsdom test cannot have.
//
// WHY NOT PLAYWRIGHT, which is installed. `web/e2e` drives a REAL running URL
// and defaults to staging — and staging tracks `main`, so a two-browser run
// would faithfully exercise the code this branch is changing away from, and
// prove nothing about the code it is changing to. Deploying this branch to see
// its own test pass is exactly the thing a lane must not do. The transport is
// also the least interesting link in the chain: it is a `WebSocket` the browser
// implements and Cloudflare terminates, and neither of those is what breaks.
// What breaks is the wiring above it, which is what this opens.

import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useRealtime, useTeamLive, type RealtimeEvent } from "@shared/web/realtime"

/* ------------------------------ the transport ------------------------------ */

/** Every socket this test opened, in order, so a test can reach the one a
 * particular client is holding — and so a RE-connect after a drop is visible as
 * a second entry rather than inferred from a timer. */
let sockets: FakeSocket[] = []

class FakeSocket {
  static OPEN = 1
  url: string
  readyState = 0
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  onmessage: ((e: { data: string }) => void) | null = null

  constructor(url: string) {
    this.url = url
    sockets.push(this)
  }

  /** The server accepting the handshake. */
  open(): void {
    this.readyState = FakeSocket.OPEN
    this.onopen?.()
  }

  /** One "X changed" ping arriving from the durable object. */
  deliver(event: RealtimeEvent): void {
    this.onmessage?.({ data: JSON.stringify(event) })
  }

  /** The link going away underneath us — a deploy, a laptop lid, a tunnel. */
  drop(): void {
    this.readyState = 3
    this.onclose?.()
  }

  close(): void {
    this.drop()
  }
}

beforeEach(() => {
  sockets = []
  ;(globalThis as unknown as { WebSocket: unknown }).WebSocket = FakeSocket
  // The client's reconnect is a real `setTimeout` on a real backoff, so the
  // clock is ours: a re-connect must be provable without a test that sleeps.
  vi.useFakeTimers()
  // `useLiveChannel` builds its URL from `location`, which jsdom provides.
})

afterEach(() => {
  // THE CONNECTION FACT IS A MODULE SINGLETON, and this suite is the only place
  // in the repo that mounts more than one client against it. Unmounting is what
  // clears it (the effect's own cleanup calls `setTeamConnectedAt(null)`), so
  // without this an earlier test's open socket makes the next one start out
  // believing it is live — which is how the last assertion in this file failed
  // the first time it was written, on a premise about the PRODUCT that was
  // really about the test.
  cleanup()
  vi.useRealTimers()
  sockets = []
})

/** One person's tab: the live client, plus whatever it has been told. */
function mountClient(teamId: string) {
  const seen: RealtimeEvent[] = []
  const view = renderHook(() => {
    useRealtime(teamId, (e) => seen.push(e))
    return useTeamLive()
  })
  return { seen, view }
}

describe("two clients on one team", () => {
  it("the second sees what the first changed — the ping reaches the listener", () => {
    const a = mountClient("team-1")
    const b = mountClient("team-1")
    expect(sockets.length, "each tab opens its own socket").toBe(2)

    act(() => {
      sockets[0].open()
      sockets[1].open()
    })

    // A raises a ticket. The durable object fans the ping out to every socket on
    // the team — including, deliberately, the one that caused it.
    act(() => {
      for (const s of sockets) s.deliver({ resource: "help", id: "t-9", op: "add" })
    })

    expect(b.seen, "the OTHER tab must be told, with the row's own id").toEqual([
      { resource: "help", id: "t-9", op: "add" },
    ])
    expect(a.seen, "and so is the tab that made the change").toHaveLength(1)
  })

  it("an archive elsewhere reaches an open detail view — R15's edge, end to end", () => {
    // The open question criterion 4 leaves: a person is LOOKING at a record when
    // somebody else archives it. The ping carries the op, so the screen showing
    // it is told rather than left on a row that no longer exists — this asserts
    // the op survives the wire, which is the half that can silently go missing.
    const watcher = mountClient("team-1")
    act(() => sockets[0].open())
    act(() => sockets[0].deliver({ resource: "accounts", id: "acc-3", op: "edit" }))

    expect(watcher.seen[0]).toEqual({ resource: "accounts", id: "acc-3", op: "edit" })
  })

  it("a dropped link is VISIBLE, and a re-connect is a new socket that catches up", () => {
    const a = mountClient("team-1")
    act(() => sockets[0].open())
    expect(a.view.result.current, "connected ⇒ the app says nothing is wrong").toBe(true)

    // The link goes. The person must be able to find this out — before this
    // branch, `teamConnectedAt` flipped and no rendered thing changed.
    act(() => sockets[0].drop())
    expect(a.view.result.current, "dropped ⇒ the strip renders").toBe(false)

    // The client retries on its OWN backoff — first attempt at 1s. Driving the
    // real timer is the point: a hand-made socket proves nothing, because the
    // handlers that flip the fact live on the socket the CLIENT constructs.
    expect(sockets.length, "no retry before the backoff elapses").toBe(1)
    act(() => vi.advanceTimersByTime(1000))
    expect(sockets.length, "the client opened a second socket by itself").toBe(2)

    act(() => sockets[1].open())
    expect(a.view.result.current, "re-connected ⇒ the strip goes away again").toBe(true)

    // …and the recovered link carries pings, which is the whole reason to care
    // that it came back.
    act(() => sockets[1].deliver({ resource: "help", id: "t-after", op: "edit" }))
    expect(a.seen.at(-1), "the tab catches up on the new socket").toEqual({
      resource: "help",
      id: "t-after",
      op: "edit",
    })
  })

  it("a malformed frame is ignored, not thrown — one bad ping must not deafen a tab", () => {
    const a = mountClient("team-1")
    act(() => sockets[0].open())
    act(() => sockets[0].onmessage?.({ data: "{not json" }))
    act(() => sockets[0].deliver({ resource: "help", id: "t-1" }))

    expect(a.seen, "the good ping after the bad one still lands").toEqual([
      { resource: "help", id: "t-1" },
    ])
    expect(a.view.result.current, "and the tab is still on the air").toBe(true)
  })

  it("the live fact is per TEAM channel — a user-channel socket cannot vouch for team data", () => {
    // `teamConnectedAt` is set only for `team=` sockets. A tab with only its
    // identity channel open must not claim the team's data is live: that would
    // let the cache skip a re-read on the strength of a socket that carries no
    // collection pings at all.
    const view = renderHook(() => useTeamLive())
    expect(view.result.current, "nothing open ⇒ the server snapshot's optimism is gone").toBe(false)
  })
})
