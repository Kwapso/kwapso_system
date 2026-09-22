"use client"

// THE SHELL'S FOOTER SLOT, REACHED FROM A PAGE COMPONENT — 22 Sep 2026, kit
// v1.2.155.
//
// AURORA, VERBATIM, 21 SEP 2026: "The latest activity always has to be at the
// very bottom", and, the same round: "also, make footer not inside a
// container, but the full row side to side (withing the main content)".
//
// WHAT THIS FILE IS FOR. `ScreenShell` (shared/ui/compositions/templates/
// screen-shell.tsx) has had a `footer` SLOT since the 2026-09-02 collapse
// ("just define which pages have a footer"), and since kit v1.2.155 that slot
// is the record footer band's home: the kit renders it inside the one
// scroller and OUTSIDE the body's padded stack, as the last child of a
// `min-h-full` column with `mt-auto` on the footer itself, so a short record's
// band lands on the pane's own bottom edge and a long record's lands after its
// content. Nothing measures anything, and there is no padding under the band
// to escape.
//
// BUT `ScreenShell` IS RENDERED IN `app-shell.tsx`, AND THE BAND IS BUILT
// FIFTEEN LEVELS DOWN, inside whatever record page the router put on screen.
// A prop cannot travel that distance: `app-shell.tsx` renders `{children}`
// and has no idea whether they are a ticket, a story or a collection. The
// trail and the figure strip do not have this problem — both are built FROM
// the store, in `app-shell.tsx` itself, and handed straight to the kit's own
// `trail`/`figures` slots — so there was no existing mechanism to reuse.
//
// A PORTAL, AND NOT A `setState` SLOT. The obvious shape (context carrying a
// setter, the page calling `setFooter(node)` in an effect) re-renders forever:
// the node is a new object on every render, so the effect's dependency never
// settles and each `setState` schedules the render that schedules the next
// one. A portal has no such loop — the HOST ELEMENT is the state, it is set
// once when `app-shell.tsx` mounts its footer div, and everything after that
// is ordinary React rendering into a different part of the tree. The band
// stays mounted in its own page's component tree (its props, its hooks, its
// language context all resolve where it is WRITTEN) and paints where the kit
// puts it.
//
// A PAGE WITH NO SLOT RENDERS NOTHING, ON PURPOSE. The host reads `null`
// until `app-shell.tsx` has mounted it (the first client
// render, and every render on a host that does not provide one at all).
// Returning `null` rather than falling back to rendering the band in place is
// deliberate: an in-place fallback would draw the band twice the moment the
// host appeared, and a band drawn inside the padded stack is the exact defect
// this slot exists to end.

import * as React from "react"
import { createPortal } from "react-dom"

const FooterSlotContext = React.createContext<HTMLElement | null>(null)

export function FooterSlotProvider({
  host,
  children,
}: {
  host: HTMLElement | null
  children: React.ReactNode
}) {
  return <FooterSlotContext.Provider value={host}>{children}</FooterSlotContext.Provider>
}

/** The host element `ScreenShell`'s own footer slot mounted, or `null` where
 *  there is no shell (a sheet, a dialog, the very first render). Private to
 *  this file: `ScreenFooterSlot` below is the whole public surface, so a
 *  caller cannot read the host and then decide to render the band somewhere
 *  else, which is the one thing this file exists to prevent. */
function useFooterSlotHost(): HTMLElement | null {
  return React.useContext(FooterSlotContext)
}

/** Renders its children into `ScreenShell`'s own footer slot — outside the
 *  body's padded stack, full width of the pane, flush with the pane's bottom
 *  edge. Renders nothing at all where there is no slot. */
export function ScreenFooterSlot({ children }: { children: React.ReactNode }) {
  const host = useFooterSlotHost()
  if (host === null) return null
  return createPortal(children, host)
}
