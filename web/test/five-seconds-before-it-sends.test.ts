// A FEATURE WHOSE WHOLE POINT IS "IT HAS NOT HAPPENED YET" NEEDS A TEST THAT IT
// DID NOT HAPPEN.
//
// The client asked for five seconds between pressing send and anything actually
// being sent, with an Undo inside them (6 Sep 2026). The cheap way to build that
// is optimistic — post it, then delete it if she presses Undo — and the cheap way
// PASSES an ordinary test: the reply is there afterwards either way, so an
// assertion on the end state cannot tell the two implementations apart. What
// separates them is a negative: at second three, with Undo pressed, HOW MANY
// TIMES WAS THE DOOR CALLED? Zero, or it is the wrong build.
//
// So almost every assertion here is about `sends.length`. The five ways the hold
// can end are each their own case, because each of them was a real decision:
//
//   · Undo before zero          → nothing is posted, ever, and the words come back
//   · the five seconds elapse   → posted exactly once
//   · a second send arrives     → the first is posted immediately, the second waits
//   · she navigates away        → posted immediately (leaving is not a mistake)
//   · the tab closes            → posted, with `keepalive`, so it outlives the page
//
// The sixth — the browser being killed — is the one case with no test and no
// code, and that is the correct outcome rather than a gap: nothing was ever
// posted, so the ticket is untouched and nobody was emailed. Her words survive in
// the composer's own draft (`useFormDraft`), which is asserted in the component
// test beside this one.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { SEND_HOLD_SECONDS, createSendHold, type SendHoldView } from "@/lib/send-hold"

/** One recorded door call. `keepalive` is part of the record because the
 * tab-closing path is only correct if it is true there and false everywhere
 * else — a `keepalive` fetch on the ordinary path would be a different request. */
type Sent = { text: string; keepalive: boolean }

function harness(options?: { fail?: boolean }) {
  const sends: Sent[] = []
  const failures: string[] = []
  const views: SendHoldView<{ text: string }>[] = []
  const hold = createSendHold<{ text: string }>({
    send: (payload, { keepalive }) => {
      sends.push({ text: payload.text, keepalive })
      return options?.fail ? Promise.reject(new Error("refused")) : Promise.resolve()
    },
    onFailed: (payload) => failures.push(payload.text),
    onChange: (view) => views.push(view),
  })
  return { hold, sends, failures, views }
}

/** Walk the clock forward whole seconds. The hold ticks once a second and fires
 * on the tick that reaches zero, so this is the only time control the test
 * needs. */
const tick = (seconds: number) => vi.advanceTimersByTime(seconds * 1000)

/** LET THE QUEUED DOOR CALL ACTUALLY GO. Sends are chained behind one another so
 * the thread reads in the order she typed (`tail` in send-hold.ts), and a chain
 * link is a microtask — so a send that has been DECIDED is not yet a send that
 * has been MADE until the queue drains. Every assertion about `sends` after a
 * fire goes through here; without it the test would be asserting about promise
 * scheduling rather than about the feature. */
const settle = () => vi.advanceTimersByTimeAsync(0)

describe("the five seconds before a reply is sent", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it("posts NOTHING while it is counting", async () => {
    const { hold, sends } = harness()
    hold.start({ text: "Happy to — which address?" })

    // Four of the five seconds gone. This is the assertion the optimistic
    // implementation fails.
    tick(SEND_HOLD_SECONDS - 1)
    await settle()
    expect(sends, "no door may be called before the hold reaches zero").toEqual([])
    expect(hold.pending()?.text).toBe("Happy to — which address?")
  })

  it("undo before zero posts nothing, ever, and hands the words back", async () => {
    const { hold, sends } = harness()
    hold.start({ text: "Happy to — which address?" })
    tick(3)

    const stopped = hold.undo()
    expect(stopped?.text, "undo returns what was held so it can go back in the composer").toBe(
      "Happy to — which address?"
    )
    expect(sends).toEqual([])

    // And it stays nothing. A cancelled hold whose timer was merely paused
    // would fire here, which is the bug this line exists for.
    tick(60)
    await settle()
    expect(sends, "a stopped hold never fires later").toEqual([])
    expect(hold.pending()).toBeNull()
  })

  it("posts exactly once when the five seconds elapse", async () => {
    const { hold, sends } = harness()
    hold.start({ text: "The 4th, same as every month." })

    tick(SEND_HOLD_SECONDS)
    await settle()
    expect(sends).toEqual([{ text: "The 4th, same as every month.", keepalive: false }])
    expect(hold.pending(), "nothing is held once it has gone").toBeNull()

    // Not twice, not on every subsequent tick: the interval is cleared when it
    // fires, and firing clears what it held before it calls the door.
    tick(60)
    await settle()
    expect(sends).toHaveLength(1)
  })

  it("counts down from five to one and then stops", () => {
    const { hold, views } = harness()
    hold.start({ text: "one" })
    tick(SEND_HOLD_SECONDS)
    expect(views.map((v) => v.secondsLeft)).toEqual([5, 4, 3, 2, 1, 0])
    // The last view is the settle: nothing held, so no bubble and no toast.
    expect(views[views.length - 1].payload).toBeNull()
  })

  it("a second send flushes the first immediately, then starts its own five seconds", async () => {
    const { hold, sends } = harness()
    hold.start({ text: "first" })
    tick(2)

    hold.start({ text: "second — a correction" })
    await settle()
    // The first went the moment the second was pressed. It is NOT dropped (she
    // meant to send it) and NOT left running beside the new one (two clocks
    // would mean two Undos and a thread out of order).
    expect(sends).toEqual([{ text: "first", keepalive: false }])

    // …and the second gets the WHOLE five, not the three the first had left.
    tick(SEND_HOLD_SECONDS - 1)
    await settle()
    expect(sends).toHaveLength(1)
    tick(1)
    await settle()
    expect(sends.map((s) => s.text)).toEqual(["first", "second — a correction"])
  })

  it("navigating away sends it there and then, rather than cancelling it", async () => {
    const { hold, sends } = harness()
    hold.start({ text: "on my way out" })
    tick(1)

    // What the composer does in its unmount cleanup.
    hold.flush()
    await settle()
    expect(sends).toEqual([{ text: "on my way out", keepalive: false }])
    expect(hold.pending()).toBeNull()

    // And the clock it cut short cannot fire a second copy afterwards.
    tick(60)
    await settle()
    expect(sends).toHaveLength(1)
  })

  it("closing the tab sends it with keepalive, so it outlives the page", async () => {
    const { hold, sends } = harness()
    hold.start({ text: "closing the laptop" })
    tick(1)

    // What the composer does on `pagehide`.
    hold.flush({ keepalive: true })
    await settle()
    expect(
      sends,
      "the teardown path must ask for a keepalive request — a normal fetch dies with the document"
    ).toEqual([{ text: "closing the laptop", keepalive: true }])
  })

  it("flushing with nothing held calls no door at all", async () => {
    const { hold, sends } = harness()
    // Every unmount runs this, on every ticket screen, whether or not anything
    // was ever typed.
    hold.flush()
    hold.flush({ keepalive: true })
    await settle()
    expect(sends).toEqual([])
  })

  it("hands the words back when the door refuses", async () => {
    const { hold, failures } = harness({ fail: true })
    hold.start({ text: "this one is refused" })
    tick(SEND_HOLD_SECONDS)
    await settle()
    expect(
      failures,
      "a refusal must never cost somebody the sentence they wrote"
    ).toEqual(["this one is refused"])
  })

  it("keeps the order she typed in, even when the first door call is slow", async () => {
    const order: string[] = []
    let releaseFirst: (() => void) | null = null
    const hold = createSendHold<{ text: string }>({
      send: (payload) => {
        if (payload.text === "first")
          return new Promise<void>((resolve) => {
            releaseFirst = () => {
              order.push("first")
              resolve()
            }
          })
        order.push(payload.text)
        return Promise.resolve()
      },
      onChange: () => {},
    })

    hold.start({ text: "first" })
    hold.start({ text: "second" }) // flushes the first, which now hangs
    await settle()
    tick(SEND_HOLD_SECONDS)
    await settle()
    expect(order, "the second must wait behind the first").toEqual([])

    releaseFirst!()
    await settle()
    expect(order).toEqual(["first", "second"])
  })

  it("disposing stops the clock without sending", async () => {
    const { hold, sends } = harness()
    hold.start({ text: "never mind" })
    hold.dispose()
    tick(60)
    await settle()
    expect(sends).toEqual([])
  })
})
