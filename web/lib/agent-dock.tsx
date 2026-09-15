"use client"

// WHERE THE ASSISTANT DRAWS WHEN IT IS A COLUMN — one empty box in the shell's
// `aside`, published to the root-mounted panel, which portals itself into it.
//
// THE PROBLEM THIS SOLVES, AND WHY IT IS NOT "JUST RENDER THE PANEL IN THE
// ASIDE". `ScreenShell`'s third column belongs to `AppShell`, which is BELOW the
// routed screens; the panel is mounted ONCE at the root (agent-host.tsx) and has
// to stay there, because the assistant DRIVES navigation — a multi-step run
// moves the screen underneath itself (web/lib/screen-trace.tsx). A panel that
// lived inside the shell would be torn down by its own trace, which is the
// reported bug agent-host.tsx was created to fix ("the panel closed on
// navigation and the step pills collapsed mid-run") and which web/test/
// agent-host.test.ts still locks.
//
// So the TREE and the DOM part company on purpose: the panel stays a child of
// the root host (its React state, its live stream and its thread survive every
// navigation), and `createPortal` puts its ELEMENTS inside the shell's column.
// React events still bubble through the React tree, so nothing else changes.
//
// ONE SLOT, NEVER TWO — per BOX. The store holds a single node because the app
// draws a single `ScreenShell` (web/components/shell/app-shell.tsx, the one call
// site). A second mount would overwrite the first, and the unmount check below
// makes that self-correcting rather than silent: only the node that is still
// published clears it.
//
// TWO BOXES NOW, NOT ONE — kit v1.2.88's `asideTabs`. The client's ruling,
// 15 Sep 2026, over a screenshot of this app's own conversation tabs nested
// one level below the kit's single "Assistant" tab: *"The tabs need to be at
// the same level as the assistant tab... it's only one tab level."* The kit
// answered with a SECOND slot on `ScreenShell` (`asideTabs`, alongside
// `aside`) rather than widening the one that already existed, because the two
// are different GEOMETRY — `aside` is the panel's own body
// (`screen-shell-aside-body`), `asideTabs` is the tab strip riding above it
// (`screen-shell-aside-tab`) — and a single box cannot be handed to both. So
// this file now publishes two independent nodes, built on the same tiny
// factory below rather than copy-pasted: `AgentDockSlot`/`useAgentDock` for
// the panel body (unchanged since 2026-09-02), `AgentDockTabsSlot`/
// `useAgentDockTabs` for the tab level (`AgentTabStrip`'s new home,
// `agent-panel.tsx`). Each is its own store — a docked panel with no open
// conversation tab yet (still resolving its first render) must not have its
// BODY block on its TABS, or vice versa.

import * as React from "react"

/** ONE PUBLISHED-NODE STORE, PARAMETERISED BY NOTHING — every caller gets its
 * own independent `{ get, subscribe, publish }` trio, module-scoped by the
 * closure rather than by a key, so two dock slots can never read or clear
 * each other's node by accident (no shared `Map`, no string id to collide
 * on). */
function createDock() {
  let node: HTMLElement | null = null
  const subscribers = new Set<() => void>()
  function publish(next: HTMLElement | null): void {
    if (node === next) return
    node = next
    for (const fn of subscribers) fn()
  }
  /** Is THIS node still the published one — the unmount-cleanup guard ("only
   * the node that is still published clears it"), read back rather than
   * assumed so a stale unmount (StrictMode's double-mount, a fast remount)
   * can never clear a newer node out from under it. */
  function isCurrent(candidate: HTMLElement | null): boolean {
    return node === candidate
  }
  function useDock(): HTMLElement | null {
    return React.useSyncExternalStore(
      (cb) => {
        subscribers.add(cb)
        return () => subscribers.delete(cb)
      },
      () => node,
      () => null
    )
  }
  return { publish, isCurrent, useDock }
}

const bodyDock = createDock()
const tabsDock = createDock()

/**
 * THE BOX ITSELF, handed to `ScreenShell` as its `aside`. It draws nothing and
 * measures nothing: the kit's column already owns the width (`ASIDE_WIDTH`),
 * the padding and the scroller, and this only has to fill it so the portalled
 * panel has a full-height box to be `h-full` against.
 *
 * `h-full` IS THE FIX, NOT DECORATION — the comment above stated the intent
 * for a while before the class actually carried it. Its own parent
 * (`screen-shell-aside-body`, kit) is a `min-h-0 flex-1` flex child, so it
 * DOES have a determinate height; without `h-full` here this box's own
 * height was `auto` (a percentage against a determinate parent still needs
 * an explicit `height`/`h-full` on the CHILD, or the child just shrinks to
 * its content). That auto height then defeated every `h-full` the portalled
 * panel and `AgentChat` declare further down (a percentage against an
 * `auto`-height ancestor resolves to `auto` too), so the whole conversation
 * rendered at its full, unclipped content height — the kit's own
 * `screen-shell-aside` still capped and scrolled THAT as one long blob (it
 * never grew past the window), but `AgentChat`'s own turns-only scroller
 * (header and composer pinned, only the messages move) never activated,
 * because it never received a bounded box to scroll within. Reproduced and
 * confirmed in the kit's `verify/shell-chat/` harness by nesting the exact
 * `AgentDockSlot -> PanelFrame -> AgentChat` shape: without `h-full` the
 * panel's own box measured ~7400px tall; with it, ~726px, matching the
 * card's own height to the pixel, with the turns region alone scrolling.
 *
 * A CALLBACK REF RATHER THAN AN EFFECT, so the node is published in the same
 * commit that creates it — an effect would publish one paint later and the
 * panel would flash in at the wrong moment. React 19 calls the returned cleanup
 * on unmount, which is where the column's own disappearance (the shut aside is
 * not rendered at all) is reported.
 */
export function AgentDockSlot() {
  return (
    <div
      data-slot="agent-dock"
      className="flex h-full min-h-0 w-full flex-1 flex-col"
      ref={(node) => {
        bodyDock.publish(node)
        return () => {
          if (bodyDock.isCurrent(node)) bodyDock.publish(null)
        }
      }}
    />
  )
}

/** The live dock node, or null when the aside is shut, dropped (narrow) or the
 * screen is one that draws no shell at all (login, onboarding). The panel
 * renders nothing in that last case rather than inventing a home for itself. */
export function useAgentDock(): HTMLElement | null {
  return bodyDock.useDock()
}

/**
 * THE ASIDE'S OWN TAB LEVEL, handed to `ScreenShell` as its `asideTabs` (kit
 * v1.2.88) — the twin of `AgentDockSlot` above, published to
 * `screen-shell-aside-tab` instead of `screen-shell-aside-body`. Same reason,
 * same mechanism: `AgentTabStrip` needs the live tab list
 * (`agent-conversation-tabs.ts`) and the one live chat (`use-agent-chat.tsx`),
 * both of which belong to `AgentPanel` at the root, not to `AppShell` below
 * it — so the strip is built there and portalled here, exactly as the panel's
 * own body already is.
 *
 * NO `h-full` HERE, UNLIKE THE BODY SLOT ABOVE. `screen-shell-aside-tab`
 * (kit) is `min-w-0 shrink-0` — a shrink-wrapped row, not a flex column with
 * a determinate height to fill — so this box only has to carry the strip's
 * own intrinsic size across the portal boundary, the same `min-w-0` the kit
 * wrapper already supplies doing the overflow-x work a fixed height has
 * nothing to do with.
 */
export function AgentDockTabsSlot() {
  return (
    <div
      data-slot="agent-dock-tabs"
      className="min-w-0 w-full"
      ref={(node) => {
        tabsDock.publish(node)
        return () => {
          if (tabsDock.isCurrent(node)) tabsDock.publish(null)
        }
      }}
    />
  )
}

/** The live tab-strip dock node — null under the identical conditions
 * `useAgentDock()` is: the aside shut, the narrow floating presentation (no
 * `ScreenShell` at all there), or no shell drawn (login, onboarding). */
export function useAgentDockTabs(): HTMLElement | null {
  return tabsDock.useDock()
}
