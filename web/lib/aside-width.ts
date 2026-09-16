"use client"

// THE ASSISTANT COLUMN'S WIDTH — variation A "drag the seam", client ruling
// 16 Sep 2026: "A — drag the seam, with B's three widths as its snap
// points." The kit's ScreenShell (v1.2.91) draws the drag, the keyboard, the
// snap points and the live readout; this file is the app's other half of the
// contract — asideWidth/onAsideWidthChange are CONTROLLED props, and
// something on this side has to hold the value between renders and mirror it
// to storage so a reload (or a fresh tab) opens the column at the width the
// person left it. Same job `web/lib/agent-open.ts` already does for
// asideOpen/onAsideOpenChange, one module-level store, two files.
//
// PERSISTED PER PERSON, NOT PER DEVICE — the one place this store departs
// from agent-open.ts's own pattern. `ss-assistant-open` (whether the column
// shows at all) is a device preference, same reasoning as the rail's own
// collapse: nobody minds two people at one desk agreeing on that. A WIDTH
// is closer to `workspace-tabs.ts`'s own open tabs — "the PERSON is in the
// key because this is localStorage on a shared device" — and the brief asks
// for exactly that scoping ("persists per person"). `setAsideWidthScope`
// takes the signed-in person's id (`active.user?.id`, the same value
// `deep-link-screen.tsx` already reads to scope the tab strip) and re-reads
// storage under that id; `null` (signed out, or between renders before the
// id is known) falls back to the uncontrolled default with nothing
// persisted, so a screen with no session never throws reading `localStorage`
// under a key that does not exist yet.
//
// TRY/CATCH THROUGHOUT, MATCHING `agent-open.ts` — private mode, a full
// storage quota, or a policy blocking `localStorage` outright must never
// throw under the shell for what is, at most, a remembered preference. The
// module variable still carries the value for the rest of this document's
// life; only the mirror to the next reload is lost.

import { useSyncExternalStore } from "react"

import {
  ASIDE_WIDTH_DEFAULT,
  ASIDE_WIDTH_MIN,
  ASIDE_WIDTH_MAX,
} from "@shared/ui/compositions/templates/screen-shell"

export { ASIDE_WIDTH_DEFAULT, ASIDE_WIDTH_MIN, ASIDE_WIDTH_MAX }

const KEY_PREFIX = "ss-aside-width"

function clamp(px: number): number {
  return Math.min(ASIDE_WIDTH_MAX, Math.max(ASIDE_WIDTH_MIN, Math.round(px)))
}

let scope: string | null = null
let width = ASIDE_WIDTH_DEFAULT
const subscribers = new Set<() => void>()

function announce(): void {
  for (const fn of subscribers) fn()
}

function storageKey(): string | null {
  return scope ? `${KEY_PREFIX}:${scope}` : null
}

function readPersisted(): number {
  const key = storageKey()
  if (!key) return ASIDE_WIDTH_DEFAULT
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return ASIDE_WIDTH_DEFAULT
    const n = Number(raw)
    return Number.isFinite(n) ? clamp(n) : ASIDE_WIDTH_DEFAULT
  } catch {
    return ASIDE_WIDTH_DEFAULT
  }
}

function persist(next: number): void {
  const key = storageKey()
  if (!key) return
  try {
    localStorage.setItem(key, String(next))
  } catch {
    /* private mode / storage blocked — the module variable still carries it
       this session; only the mirror to the next reload is lost. */
  }
}

/** WHOSE WIDTH — called from an effect keyed to the signed-in person's id,
 * the same shape `workspace-tabs.ts`'s own `setWorkspaceScope` takes. A
 * no-op on the same id twice (an effect re-running on an unrelated render),
 * so nothing already dragged this document is thrown away; a genuinely
 * different id (a new sign-in on a shared device) re-reads that person's own
 * stored width, or the uncontrolled default if they never set one. */
export function setAsideWidthScope(next: string | null): void {
  if (scope === next) return
  scope = next
  width = next ? readPersisted() : ASIDE_WIDTH_DEFAULT
  announce()
}

/** Set (and persist) the width — `ScreenShell`'s own `onAsideWidthChange`. */
export function setAsideWidth(px: number): void {
  const next = clamp(px)
  if (width === next) return
  width = next
  persist(next)
  announce()
}

/** The current width, live — `ScreenShell`'s own `asideWidth`. SSR snapshot
 * is always the default: the persisted value is a client-only fact, so the
 * server never renders a width nobody asked for and hydration corrects it
 * from storage on mount, the same `agent-open.ts` already does for the
 * column's open state. */
export function useAsideWidth(): number {
  return useSyncExternalStore(
    (cb) => {
      subscribers.add(cb)
      return () => subscribers.delete(cb)
    },
    () => width,
    () => ASIDE_WIDTH_DEFAULT
  )
}
