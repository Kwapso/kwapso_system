"use client"

// AFTER THE PERSON CAN READ THE PAGE — the one gate the secondary half of a
// screen hangs on.
//
// Round-trip criterion 9 is "first paint does not wait for everything", and the
// budget beside it (`MAX_REQUESTS_BEFORE_FIRST_PAINT` in
// shared/workers/limits.ts) is a ceiling on requests made BEFORE the record is
// on screen — not on requests. A screen may ask for anything it likes once the
// thing a person came for is readable.
//
// Nothing in the app could express that. A `useEffect` runs in the same commit
// as every other effect, so a count badge's read, a shell widget's read and the
// record's own read all left the browser together, and the person waited for
// the slowest of them. On a cold deep link from an email (R30) that was
// measured, 7 Sep 2026, as fourteen distinct requests in front of one record.
//
// WHERE A DETERMINISTIC GATE EXISTS, USE THAT INSTEAD. A secondary panel that
// needs the record anyway should key on the record being in hand (a null cache
// key fetches nothing) — that is exact, needs no scheduler, and cannot be
// flaky. This hook is for the things with no such dependency: shell chrome and
// count badges, which are about the whole team rather than about this screen.

import * as React from "react"

import { useIsAnyLoading } from "./store"

/** The browser's idle moment, or the next macrotask where there is no such
 * thing (Safari has no `requestIdleCallback`). A `setTimeout(0)` still lands
 * after the current frame, which is all this needs — it is a "not now", not a
 * scheduling guarantee. Returns its own canceller.
 *
 * NOT `requestAnimationFrame`: a background or hidden tab never fires one, and
 * a screen that quietly never asks for its badges is a worse bug than a screen
 * that asks too early. */
export function whenIdle(run: () => void): () => void {
  const w = globalThis as unknown as {
    requestIdleCallback?: (fn: () => void, opts?: { timeout: number }) => number
    cancelIdleCallback?: (id: number) => void
  }
  if (typeof w.requestIdleCallback === "function") {
    const id = w.requestIdleCallback(run, { timeout: 2_000 })
    return () => w.cancelIdleCallback?.(id)
  }
  const id = setTimeout(run, 0)
  return () => clearTimeout(id)
}

/** A screen that never settles must not starve its own chrome for ever. Past
 * this, the secondary reads go anyway — a badge that is a few seconds late is a
 * detail; a badge that never arrives because one panel is wedged is a bug. */
const SETTLE_CEILING_MS = 3_000

/** How long the screen must have been quiet before its chrome may ask for
 * anything. A CHAINED load goes quiet between its links — the screen's config
 * lands, and the record's own read has not started yet because the component
 * that makes it is one render away — so "not loading right now" is not the same
 * fact as "settled". A beat is what tells them apart, and it is short enough
 * that nobody sees it. */
const QUIET_MS = 60

/** False while the screen is still fetching what it opened with; true once
 * nothing on screen has been waiting on a first answer for a beat. Key a cache
 * read on it (`ready ? key : null`) and that read leaves AFTER the screen is
 * readable rather than beside it. Once true it stays true — a later fetch must
 * not un-warm the chrome that already loaded.
 *
 * WHY IT WATCHES THE STORE RATHER THAN A TIMER ALONE. `useIsAnyLoading` is the
 * store's own broadcast of "some `useCached` on screen has never had an answer"
 * — the exact state a screen already reads to draw its skeleton. A plain timer
 * would say "after a moment", which is not the same sentence as "after the
 * person can read the record", and on a slow connection the two are far apart. */
export function useAfterPaint(): boolean {
  const busy = useIsAnyLoading()
  const [ready, setReady] = React.useState(false)
  // A screen whose reads have not registered yet reads as "not busy" for one
  // commit, which is indistinguishable from "settled". Waiting to have SEEN it
  // busy is what tells those two apart; the ceiling below covers the honest
  // third case, a screen with nothing to fetch at all.
  const wasBusy = React.useRef(false)
  if (busy) wasBusy.current = true
  const busyNow = React.useRef(busy)
  busyNow.current = busy
  React.useEffect(() => {
    if (ready) return
    const ceiling = setTimeout(() => setReady(true), SETTLE_CEILING_MS)
    // Re-read `busyNow` when the beat expires rather than trusting the value
    // this effect closed over: a read that started in between has to count.
    const quiet =
      !busy && wasBusy.current
        ? setTimeout(() => {
            if (!busyNow.current) setReady(true)
          }, QUIET_MS)
        : undefined
    return () => {
      clearTimeout(ceiling)
      if (quiet !== undefined) clearTimeout(quiet)
    }
  }, [busy, ready])
  return ready
}
