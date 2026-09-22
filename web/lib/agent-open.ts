"use client"

// The assistant's OPEN state. Two jobs:
//  1. Hoisted to a module-level store so it survives SOFT navigation — the panel is
//     mounted once at the root layout (agent-host.tsx), not per-route.
//  2. Mirrored to storage so it also survives a FULL PAGE RELOAD. The base is a
//     static export: crossing from a top-level route INTO the /t shell is a hard reload
//     (EDGE-CASES §1), which wipes all in-memory React state. Without this mirror the
//     panel vanished on that reload (the "panel reset" the owner hit); with it, the root
//     host reopens on load and useAgentChat resumes the saved thread, so the conversation
//     survives the reload even though the live stream was cut.
//
// ONE FLAG, TWO PRESENTATIONS. Since the assistant became `ScreenShell`'s third
// COLUMN (2026-09-03) this flag is what the shell's `asideOpen` is fed and what
// its edge handle toggles; below the shell's narrow breakpoint the same flag
// opens the floating panel instead (agent-host.tsx picks the presentation, this
// store holds the decision). It is one decision — "is the assistant showing" —
// so it is one flag, and the two presentations can never disagree about it.
//
// `localStorage`, AND THE KEY IS SHAPED LIKE THE RAIL'S. It used to be
// `sessionStorage` under `kwapso:agent:open`, which is same-tab only: the column
// would be gone the next morning while the rail's own collapse was still
// remembered, and a column that forgets is a broken mirror of one that does not.
// The kit says the collapse "persists per user" of BOTH columns, so this now
// sits beside `ss-sidebar-collapsed` and `ss-rail-closed-groups` in
// app-shell.tsx: same store, same `ss-` prefix, same per-device honesty (a
// preference about this screen's furniture, not a synced server preference like
// scale or spine).

import { useSyncExternalStore } from "react"

const KEY = "ss-assistant-open"

function readPersisted(): boolean {
  try {
    return localStorage.getItem(KEY) === "1"
  } catch {
    return false
  }
}

function persist(next: boolean): void {
  try {
    if (next) localStorage.setItem(KEY, "1")
    else localStorage.removeItem(KEY)
  } catch {
    /* private mode / storage blocked — the module var still carries it this session */
  }
}

let open = readPersisted()
const subscribers = new Set<() => void>()

/** Open (or close) the assistant from anywhere — the shell's edge handle, the phone's
 * launcher, Esc. Persisted so a reload (e.g. crossing into /t) reopens it instead of
 * dropping the conversation. */
export function setAgentOpen(next: boolean): void {
  if (open === next) return
  open = next
  persist(next)
  for (const fn of subscribers) fn()
}

/** Subscribe to the open state (the root-mounted host). SSR snapshot is always false —
 * the panel is client-only, so the server never renders it open (client hydration then
 * reflects the persisted value). */
export function useAgentOpen(): boolean {
  return useSyncExternalStore(
    (cb) => {
      subscribers.add(cb)
      return () => subscribers.delete(cb)
    },
    () => open,
    () => false
  )
}

/* ---------------------------------------------------------------------------
 * ASKING IT SOMETHING FROM A SCREEN used to live here — a `question` module
 * variable, `askAssistant()` to set it and open the panel, `usePendingQuestion`/
 * `clearPendingQuestion` for `useAgentChat` to pick it up and send it once. It
 * was the knowledge base's own one-shot ask box (`ask-the-assistant.tsx`)
 * handing a typed question to the panel across the same root-mount gap
 * `useAgentOpen` bridges.
 *
 * REMOVED 22 Sep 2026, WITH ITS ONLY CALLER. The knowledge gallery's own "Ask"
 * (`knowledge-screen.tsx`'s `openAskConversation`) replaced the typed-then-handed-off
 * box — Aurora's ruling, 22 Sep 2026, "make ask a button in the toolbar" — with
 * opening a scoped assistant tab directly (`pickAgentTabScope` + `setAgentOpen`)
 * and letting the person type straight into the panel's own composer. Nothing
 * else ever called `askAssistant`, so once the box it served (`ask-the-assistant.tsx`,
 * orphaned the same day the account Knowledge tab stopped mounting it) was deleted,
 * this whole relay had no producer left — checked: no other screen, and neither
 * front door's portal, ever imported it. Kept only as a shape to reach for if a
 * future screen wants to hand the panel a question it did not type — the
 * mechanism was sound, it just has no caller today. */
