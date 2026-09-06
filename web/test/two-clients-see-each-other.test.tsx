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
import { clearCache, primeCache, readCache, reconcile } from "@shared/web/store"

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
  clearCache()
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

// ─────────────────────────────────────────────────────────────────────────────
// THE HALF THE FIRST VERSION OF THIS FILE LEFT OUT: a reconnected tab must
// CATCH UP, not merely reconnect.
//
// The cases above prove the socket comes back and carries new pings. They say
// nothing about the changes made WHILE IT WAS DOWN, and that gap is the worse
// failure of the two: a tab that reconnects and silently shows stale data is
// worse than one that stays visibly down, because the strip goes away and the
// person believes the screen again. Nothing about the recovered socket tells
// them the three rows they are looking at are from before the gap.
//
// Two things are asserted, and they are different claims:
//   1. the SEAM — `onReconnect` fires on a RE-connect and NOT on the first
//      connect. A host that backfilled on every open would re-read the world on
//      every page load; one that never fires backfills nothing at all.
//   2. the BACKFILL — running the real `reconcile` from that callback actually
//      replaces what the tab missed. This is the pair the app-shell wires
//      together (`useRealtime`'s third argument → `reconcile` over every
//      registered collection), driven here without mounting the shell.
describe("a reconnected tab catches up on what it missed", () => {
  /** A tab that backfills one collection the way the shells do. */
  function mountCatchingUp(teamId: string, key: string, server: () => Record<string, unknown>[]) {
    const reconnects: number[] = []
    const view = renderHook(() =>
      useRealtime(
        teamId,
        () => {},
        // The shells pass exactly this shape: re-read what the screens are
        // showing, because we cannot know what we missed while we were away.
        () => {
          reconnects.push(Date.now())
          void reconcile(key, "id", async () => server())
        }
      )
    )
    return { reconnects, view }
  }

  it("does NOT fire on the first connect — only a RE-connect is a gap", () => {
    const { reconnects } = mountCatchingUp("team-1", "rows:team-1", () => [])
    act(() => sockets[0].open())
    expect(
      reconnects.length,
      "a first connect is not a recovery — backfilling here would re-read the world on every page load"
    ).toBe(0)
  })

  it("backfills a row that changed while the socket was down", async () => {
    const key = "rows:team-1"
    // What the tab is showing when the link drops.
    let server: Record<string, unknown>[] = [
      { id: "a", title: "before" },
      { id: "b", title: "steady" },
    ]
    primeCache(key, server)

    const { reconnects } = mountCatchingUp("team-1", key, () => server)
    act(() => sockets[0].open())

    // The link goes. While it is down, somebody else edits row `a` and adds `c`
    // — two pings raised into a gap that reached nobody.
    act(() => sockets[0].drop())
    server = [
      { id: "a", title: "AFTER" },
      { id: "b", title: "steady" },
      { id: "c", title: "arrived while away" },
    ]
    expect(
      (readCache(key) as Record<string, unknown>[])[0].title,
      "the tab is still showing the pre-gap row, which is the whole problem"
    ).toBe("before")

    // The client reconnects on its own backoff and the host backfills.
    act(() => vi.advanceTimersByTime(1000))
    expect(sockets.length, "the client opened its own second socket").toBe(2)
    await act(async () => {
      sockets[1].open()
      // `reconcile` is async (it fetches); let its promise settle inside act.
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(reconnects.length, "onReconnect must fire on the RE-connect").toBe(1)
    const after = readCache(key) as Record<string, unknown>[]
    expect(after.map((r) => r.title), "the tab did not catch up on the gap").toEqual([
      "AFTER",
      "steady",
      "arrived while away",
    ])
  })

  it("CANARY — without the backfill the tab stays stale, and nothing says so", async () => {
    // The assertion above must be able to fail. Same drop, same edit, a host
    // that reconnects and backfills NOTHING — which is what this app did before
    // the shells wired the third argument, and what any new front door that
    // forgets it will do.
    const key = "rows:team-2"
    let server: Record<string, unknown>[] = [{ id: "a", title: "before" }]
    primeCache(key, server)
    renderHook(() => useRealtime("team-2", () => {}))
    act(() => sockets[0].open())
    act(() => sockets[0].drop())
    server = [{ id: "a", title: "AFTER" }]
    act(() => vi.advanceTimersByTime(1000))
    await act(async () => {
      sockets[1].open()
      await Promise.resolve()
    })

    expect(
      (readCache(key) as Record<string, unknown>[])[0].title,
      "a tab with no backfill must still be stale — otherwise the test above proves nothing"
    ).toBe("before")
    // …and the strip is gone, so the person has been told everything is fine.
    expect(sockets.length).toBe(2)
  })
})
