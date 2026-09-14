"use client"

// WHO IS HOLDING A DRAFT RIGHT NOW — the one registry, and the one confirm a
// navigation raises before it throws one away.
//
// THE GAP THIS CLOSES. `shared/web/appearance-panel.tsx` and
// `web/components/team/roles-matrix.tsx` stage edits behind a pinned
// `UnsavedChangesBar` and both report their own `dirty` upward through an
// `onDirtyChange` prop — see either file's own header. Until now the ONLY
// thing that ever asked was `settings-screen.tsx`'s own tab strip
// (`handleTabChange`), which kept its own private `dirtyTabs` map fed by
// those two callbacks. LEAVING Settings altogether — a nav-rail press, an
// `<InAppLink>` to a record, closing the Settings tab in the workspace
// strip, the browser's own Back, or closing the tab/reloading outright —
// unmounted the dirty panel in silence, because none of those seams had ever
// heard of `dirtyTabs`, which was `settings-screen.tsx`'s own private state.
//
// SO THE REGISTRY MOVED OUT OF THAT SCREEN AND UP TO HERE. This module is
// the ONE source of truth for "is anything dirty" — `settings-screen.tsx`'s
// tab guard reads it instead of keeping a second copy (see its own header
// for the refactor), and `web/lib/nav.ts`'s `guardNavigate` (the bus) and
// `use-host-nav.ts`'s Back handling both ask the SAME question before they
// let a navigation through. A panel never talks to the bus directly — it
// only ever calls `markDirty`, the same call it already made into
// `dirtyTabs`, and every seam that can throw a draft away asks this file,
// never the panel.
//
// A KEY, NOT A PATH. `markDirty("settings:appearance", dirty)` — a stable
// name for the SCREEN holding the draft, not the URL. Switching Settings
// tabs and leaving Settings entirely are the same question about the same
// draft, and a path is two different strings for the first (Settings has one
// URL for every tab) and the wrong granularity for both (nothing here has to
// know or care which of the two staged panels is asking).
//
// THE CONFIRM BUS IS IMPERATIVE ON PURPOSE. `nav.ts`'s `softNavigate` and
// `guardNavigate` are plain functions, not components — they are called from
// deep, unrelated places (the profile menu, the team switcher, a click
// handler inside `deep-link-screen.tsx`) with no dialog in hand and no
// context provider threading one down to them. `requestDiscardConfirm` /
// `answerDiscardConfirm` are the same shape `toast()` already uses to raise
// something from anywhere without a component of its own: a tiny pub/sub a
// root-mounted host (`UnsavedChangesDialogHost`, `web/app/layout.tsx`, beside
// `<Toaster />`) subscribes to and draws the one dialog for.

import * as React from "react"

/* -------------------------------------------------------------------------- */
/*                            the dirty registry                              */
/* -------------------------------------------------------------------------- */

let dirty: Readonly<Record<string, true>> = {}
const dirtySubscribers = new Set<() => void>()
const NO_DIRTY_KEYS: string[] = []

// THE KEY LIST IS CACHED AGAINST `dirty`'S OWN IDENTITY — `useSyncExternalStore`
// requires its snapshot function to return a value that is REFERENCE-STABLE
// across calls when nothing changed (React's own "getSnapshot should be
// cached" contract); `Object.keys(dirty)` is a fresh array on every call, so
// a naive snapshot function reads as a torn store on every render and
// crashes React outright the moment two components ask in the same commit
// (caught live in `verify/appearance-panel`'s own rig, the second render
// loop this file has been the fix for). One cached array per `dirty` object
// is enough: `markDirty`/`clearAllDirty` only ever replace the whole object,
// never mutate it in place, so identity is exactly the change signal.
let dirtyKeysCache: string[] = NO_DIRTY_KEYS
let dirtyKeysCacheFor: Readonly<Record<string, true>> = dirty

function currentDirtyKeys(): string[] {
  if (dirtyKeysCacheFor !== dirty) {
    const keys = Object.keys(dirty)
    dirtyKeysCache = keys.length === 0 ? NO_DIRTY_KEYS : keys
    dirtyKeysCacheFor = dirty
  }
  return dirtyKeysCache
}

function announceDirty(): void {
  for (const fn of dirtySubscribers) fn()
}

/** A panel with a staged draft calls this — `false` the moment it saves,
 * discards, or unmounts (see `appearance-panel.tsx` / `roles-matrix.tsx`'s
 * own `onDirtyChange` effects, which already call it with `false` on the way
 * out). A no-op when the flag would not change, so an unrelated re-render
 * upstream never announces a change that did not happen. */
export function markDirty(key: string, isDirty: boolean): void {
  const was = key in dirty
  if (was === isDirty) return
  if (isDirty) {
    dirty = { ...dirty, [key]: true }
  } else {
    const next = { ...dirty }
    delete next[key]
    dirty = next
  }
  announceDirty()
}

/** Every key currently holding an unsaved draft — `[]` when nothing is. The
 * one question `guardNavigate` (`nav.ts`) and the Back handler
 * (`use-host-nav.ts`) ask before a navigation is allowed to unmount whatever
 * is showing. */
export function anyDirty(): string[] {
  return currentDirtyKeys()
}

/** `true` while this one key is holding a draft — what `settings-screen.tsx`'s
 * tab guard asks instead of its old private `dirtyTabs[tab]` lookup. */
export function isDirty(key: string): boolean {
  return key in dirty
}

/** After a confirmed Discard: forget every draft, the same state a panel's
 * own Discard button leaves it in. Never called on Keep editing. */
export function clearAllDirty(): void {
  if (Object.keys(dirty).length === 0) return
  dirty = {}
  announceDirty()
}

/** A live view of the set, for a component that wants to react to it —
 * `UnsavedChangesDialogHost` uses this to hold the `beforeunload` listener
 * registered for exactly as long as something is dirty (see its own header)
 * and no longer. */
export function useDirtyKeys(): string[] {
  return React.useSyncExternalStore(
    (cb) => {
      dirtySubscribers.add(cb)
      return () => dirtySubscribers.delete(cb)
    },
    currentDirtyKeys,
    () => NO_DIRTY_KEYS
  )
}

/* -------------------------------------------------------------------------- */
/*                    the confirm bus, imperative side                       */
/* -------------------------------------------------------------------------- */

// ONE PENDING QUESTION AT A TIME. Nothing in this app can ask two navigations
// to leave a screen at once — R37 is one shell, one route — so a second
// `requestDiscardConfirm` call can only happen after the first has been
// answered, never while it is open.
let resolvePending: ((discard: boolean) => void) | null = null
const hostSubscribers = new Set<() => void>()

function announceHost(): void {
  for (const fn of hostSubscribers) fn()
}

/** Raise the one unsaved-changes confirm and wait for the answer — called
 * ONLY from `nav.ts`'s `guardNavigate`. A screen never calls this itself; it
 * stages its own draft through `markDirty` and lets the bus decide when to
 * ask. */
export function requestDiscardConfirm(): Promise<boolean> {
  return new Promise((resolve) => {
    resolvePending = resolve
    announceHost()
  })
}

/** Whether the confirm is open right now — read by
 * `<UnsavedChangesDialogHost>`, mounted once in `web/app/layout.tsx`. */
export function useDiscardConfirmOpen(): boolean {
  return React.useSyncExternalStore(
    (cb) => {
      hostSubscribers.add(cb)
      return () => hostSubscribers.delete(cb)
    },
    () => resolvePending !== null,
    () => false
  )
}

/** Answer the open confirm. `true` (Discard) resolves the waiting
 * `guardNavigate` call, which clears the registry and performs the
 * navigation it held; `false` (Keep editing) leaves everything exactly where
 * it was — nothing moves, nothing is cleared. */
export function answerDiscardConfirm(discard: boolean): void {
  const resolve = resolvePending
  resolvePending = null
  announceHost()
  resolve?.(discard)
}
