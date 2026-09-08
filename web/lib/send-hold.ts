// THE FIVE SECONDS IN WHICH NOTHING HAS HAPPENED YET.
//
// THE CLIENT, 6 September 2026, verbatim: "in the modal notification that shows
// temporarily on the bottom of the page — show the button undo / actually wait 5
// seconds to actually send it and marked as closed — enough time to click undo
// (if mistake)."
//
// READ THAT SECOND CLAUSE CAREFULLY, because it rules out the cheap
// implementation. The ordinary way to build an undo is OPTIMISTIC: post the
// thing immediately, draw the toast, and if Undo is pressed, call a second door
// that deletes what the first one wrote. That is NOT what was asked for and it
// is not what this file does. For five seconds NO REQUEST IS MADE — no thread
// row, no status move, no email, nothing another person on the team could see,
// nothing in the client's portal. The message exists in one browser's memory.
// Undo therefore does not undo anything: it stops something that never started.
//
// WHY THAT DISTINCTION IS WORTH THE CODE. `/help/resolve` emails everybody at
// the client with a login (workers/content/src/routes/help.ts), and there is no
// un-sending an email. Reopening the ticket afterwards would not even restore
// the record: `setStatus` with any non-resolved value NULLS `resolver_id`,
// `resolver_email`, `resolver_name` and `resolved_at`, so a compensating undo
// would trade a wrong email for a lost answer. The five seconds exist precisely
// so that Undo never has to mean either of those things.
//
// WHAT LIVES HERE AND WHAT DOES NOT. This file is the state machine and nothing
// else: no React, no toast, no words, no fetch. That is deliberate — the whole
// point of the feature is a sequence of events over time with four ways to go
// wrong, and a machine with no framework around it is one a test can drive with
// fake timers and assert about directly (`web/test/five-seconds-before-it-sends
// .test.ts` covers all four). The component that draws the toast and the
// pending bubble is `web/components/tickets/reply-composer.tsx`.

/** HOW LONG THE HOLD IS, IN SECONDS. The client said five and this is the one
 * place it is written down — the toast counts it, the pending bubble counts it,
 * and the test advances by it, all from here, so the number on screen and the
 * number in the timer cannot drift apart. */
export const SEND_HOLD_SECONDS = 5

/** WHAT A WATCHER SEES. `payload` is null when nothing is held — the composer
 * draws no bubble and no toast then — and `secondsLeft` counts down from
 * `SEND_HOLD_SECONDS` to 1 while one is. */
export type SendHoldView<P> = { payload: P | null; secondsLeft: number }

export interface SendHold<P> {
  /** ARM THE HOLD. If one is already held it is SENT FIRST, immediately, and
   * only then does the new one start its own five seconds — see `start` below
   * for why that is the only defensible answer. */
  start(payload: P): void
  /** STOP IT. Returns what was held so the caller can put the words back in the
   * composer, or null if nothing was held (a stray Escape, a double press of
   * Undo). Nothing is sent, because nothing had been. */
  undo(): P | null
  /** SEND IT NOW, cutting the wait short rather than cancelling it. Leaving the
   * screen and closing the tab both land here; `keepalive` says which. */
  flush(options?: { keepalive?: boolean }): void
  /** What is held right now, or null. */
  pending(): P | null
  /** Stop the clock without sending. For unmount paths that have already
   * flushed, so a stray tick cannot fire into a dead component. */
  dispose(): void
}

export function createSendHold<P>(config: {
  /** THE ACTUAL DOOR CALL, made once, at zero. `keepalive` is true only on the
   * page-teardown path, where the caller must pass it through to `fetch` so the
   * request survives the document being destroyed. */
  send: (payload: P, options: { keepalive: boolean }) => Promise<unknown>
  /** Told on every state change: armed, each tick, and settled. */
  onChange: (view: SendHoldView<P>) => void
  /** The door refused. The words are handed back so the caller can return them
   * to the composer rather than losing what somebody typed to a 500. */
  onFailed?: (payload: P, error: unknown) => void
  /** Overridable for the test only; production is always `SEND_HOLD_SECONDS`. */
  seconds?: number
}): SendHold<P> {
  const total = config.seconds ?? SEND_HOLD_SECONDS

  let held: P | null = null
  let left = 0
  // ONE TIMER, EVER. The client's own edge case — a correction typed while the
  // first message is still counting — is answered by flushing the first rather
  // than by running a second clock beside it, so this is a single handle and
  // not a list. Two clocks would mean two toasts, two Undos that each mean
  // something different, and a thread that can arrive out of the order she
  // typed it.
  let clock: ReturnType<typeof setInterval> | null = null

  // THE ORDER SHE TYPED IT IN, kept across sends. Each door call is chained
  // behind the last one, so a flush-then-new-send pair reaches the worker in
  // the order the two messages were written even if the first request is slow.
  // A thread that reads out of order is worse than a slow one.
  let tail: Promise<unknown> = Promise.resolve()

  function stopClock(): void {
    if (clock !== null) {
      clearInterval(clock)
      clock = null
    }
  }

  function announce(): void {
    config.onChange({ payload: held, secondsLeft: left })
  }

  /** SEND WHAT IS HELD, NOW. Clears the hold FIRST, so a re-entrant call (Undo
   * pressed in the same tick the clock fires, a second `start` arriving inside
   * an `onSent`) finds nothing left to send and cannot post twice. */
  function fire(keepalive: boolean): void {
    const going = held
    // NOTHING HELD IS NOT AN EVENT. Every unmount flushes and every `start`
    // flushes first, so this is the ordinary case, and announcing it would tell
    // the composer to re-render for a state it is already in — once per press,
    // and once more per screen anybody ever leaves.
    if (going === null) {
      stopClock()
      left = 0
      return
    }
    held = null
    left = 0
    stopClock()
    announce()

    if (keepalive) {
      // THE PAGE IS BEING TORN DOWN. No chaining here: queueing behind an
      // in-flight promise defers this call to a microtask that may never run,
      // and a message that does not leave is the one outcome this whole file
      // exists to avoid. `fetch` with `keepalive` is what survives the
      // teardown — and it is `fetch` rather than `navigator.sendBeacon`
      // because a beacon cannot carry the headers the doors are called with.
      void config.send(going, { keepalive: true }).catch(() => {
        // Nothing can be reported: the document is going away, and there is no
        // screen left to put a message on.
      })
      return
    }

    tail = tail
      .then(() => config.send(going, { keepalive: false }))
      .catch((error: unknown) => {
        config.onFailed?.(going, error)
      })
  }

  return {
    start(payload: P): void {
      // A SECOND SEND WHILE ONE IS PENDING sends the pending one immediately
      // and then starts the new one's own five seconds. Not "restart the
      // clock" (the first message would sit unsent while she typed a second,
      // and the correction would delay the thing it corrects), and not "two
      // clocks" (see the note on `clock`). If the pending one was a "Send and
      // close" the ticket closes and the new message lands on it as an
      // ordinary reply, which is what the app already does today: a reply to a
      // resolved ticket appends and touches no status.
      fire(false)
      held = payload
      left = total
      announce()
      clock = setInterval(() => {
        left -= 1
        if (left > 0) {
          announce()
          return
        }
        fire(false)
      }, 1000)
    },

    undo(): P | null {
      const stopped = held
      held = null
      left = 0
      stopClock()
      announce()
      return stopped
    },

    flush(options?: { keepalive?: boolean }): void {
      fire(options?.keepalive === true)
    },

    pending(): P | null {
      return held
    },

    dispose(): void {
      held = null
      left = 0
      stopClock()
    },
  }
}
