"use client"

// THE ONLY WAY TO WRITE A LINK TO A PLACE INSIDE THE APP.
//
// THE BUG IT EXISTS FOR. The whole post-auth app is ONE shell that mounts once
// and never unmounts (deep-link-screen.tsx), and every move inside it is a
// History-API push through `softNavigate` — no reload, warm cache, a running
// agent left alone. A plain `<a href="/t/…">` opts out of all of that: the
// browser throws the document away and fetches a new one, every module re-runs
// from nothing, the in-memory session cache resets, and the boot mark plays
// again because "no session yet" has become true a second time.
//
// It happened three times. First to the knowledge base, which was missing from
// TOP_LEVEL_MODULES so every tap on it left the History API (the note is still
// in web/components/deep-link/route.ts). Then to "Manage dropdowns", which the
// owner could reproduce on demand — "I can see the app reload because I see the
// boot loading animation". Then to the internal rate card, whose own comment
// says it copied the dropdowns link. Three occurrences, one class.
//
// WHY THE EXISTING CHECK MISSED TWO OF THEM. `web/test/shell-nav.test.ts` reads
// six HAND-LISTED files for one spelling of the mistake, `router.push`. A bare
// anchor is a different spelling, and two hundred components are not on the
// list. That is R21's lesson in a different module: enumerate by what NAVIGATES,
// never by a list somebody maintains.
//
// SO THE SHAPE IS THE FIX. There is now one component to write an in-app link
// with, and a rule (`web/test/shell-nav.test.ts`, in-app-anchors) that reads
// EVERY component off disk and fails on any raw anchor whose href points inside
// the app. A new link is either this component or a red build.
//
// IT IS A REAL ANCHOR, deliberately. A button cannot be middle-clicked into a
// new tab, cannot be copied as an address, and tells a screen reader the wrong
// thing. So the href is real — but since 17 Sep 2026 the app intercepts more
// than a plain left click.
//
// ── THE CLIENT'S RULING, 17 SEP 2026, verbatim ──────────────────────────────
//
//   "Unless I do it on purpose to open a new tab, everything happens on the
//    same tab. This means that I would navigate in the app, and this would
//    just keep making the breadcrumbs longer. Unless I press Command and
//    click, this would open a new tab, and the same behavior in Windows,
//    just replicating Google Chrome."
//
// A PLAIN LEFT CLICK still does exactly what it always did: `preventDefault`
// and hand the address to `onNavigate`/`softNavigate`, which the workspace-
// tab store (`web/lib/workspace-tabs.ts`) observes and pushes onto the tab
// she is on — that push is the store's own job now (`visitTrail`), not this
// component's; this file only ever decides WHICH tab a click means.
//
// CMD/CTRL-CLICK, AND A MIDDLE-CLICK (mouse button 1), MEAN "OPEN BESIDE".
// Both used to be a modified click this component let the browser have —
// Chrome's own gesture for "open this link in a new tab" — and the ruling
// above asks for the SAME gesture to mean the SAME thing one level down, an
// in-app tab rather than a real browser one. Left to the browser, either
// gesture would open `safe` in a genuine new tab/window: a second, cold copy
// of this whole shell (R37), with no workspace tab set, no running agent, no
// warm cache — not a faithful replica of "open beside" at all. So both are
// taken here, `preventDefault`ed, and turned into `openBeside` plus an
// ordinary navigation of THIS document to the same address — the client
// asked to land in the new tab ("the same behavior... just replicating
// Google Chrome" — Chrome itself SWITCHES focus on a plain cmd-click on
// macOS in most builds; nothing here reads as "silently open behind you" on
// a product with no glanceable background-tab chrome of its own). A plain
// Shift-click or Alt-click (save-as, a real new WINDOW) is left to the
// browser exactly as before — those are not the gesture the ruling names.
//
// EVERY ROW, CHIP AND CARD THAT LINKS SOMEWHERE INSIDE THE APP GOES THROUGH
// THIS ONE COMPONENT (R37's own census, `web/test/shell-nav.test.ts`), so
// this file is the only place this behaviour has to be taught.

import * as React from "react"

import { softNavigate } from "@/lib/nav"
import { safeHref } from "@shared/web/rich-text"
import { openBeside } from "@/lib/workspace-tabs"

/** A plain string label reads straight off the link's own children; anything
 * richer (an icon plus text, a record's coloured mark) falls back to the
 * address itself — the same "two strings, no fetch" posture `OpenTab`'s own
 * doc holds the rest of the store to. A tab opened this way is corrected the
 * next time it is actually visited, exactly as a stale ancestor crumb is. */
function beside_label(children: React.ReactNode, fallback: string): string {
  if (typeof children === "string") return children
  if (typeof children === "number") return String(children)
  return fallback
}

export function InAppLink({
  href,
  className,
  children,
  onNavigate,
}: {
  /** A path inside the app — "/t/<teamId>/…" or a top-level module page. */
  href: string
  className?: string
  children: React.ReactNode
  /** The host's own `go()`, when the caller has one. Falls back to the shared
   * bus, which resolves to the same function once the shell has registered it. */
  onNavigate?: (path: string) => void
}) {
  // THROUGH THE URL SEAM, even though every caller builds this from a literal
  // and a ULID. The rule is positional on purpose (web/test/rich-text.test.ts):
  // a URL that reaches an href without passing the checker is the shape that
  // eventually carries one somebody typed, and this component is now the single
  // place every in-app link is written — so it is the single place that would
  // carry it everywhere. The fallback is Home rather than nothing, because a
  // link that renders with no destination is a dead control.
  const safe = safeHref(href) ?? "/home"
  const go = onNavigate ?? softNavigate
  return (
    <a
      href={safe}
      onClick={(e) => {
        // Shift/Alt belong to the browser (save-as, a real new window) —
        // never this component's to take.
        if (e.shiftKey || e.altKey) return
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault()
          openBeside(safe, beside_label(children, safe))
          go(safe)
          return
        }
        // A plain left click only from here down — a right-click, or any
        // other button `onAuxClick` below does not cover, is left alone.
        if (e.button !== 0) return
        e.preventDefault()
        go(safe)
      }}
      onAuxClick={(e) => {
        // Middle-click (button 1) never reaches `onClick` in a browser — it
        // fires `auxclick` instead, the same reason `app-shell.tsx`'s own
        // tab-strip middle-click-to-close handler lives here rather than on
        // `onClick`.
        if (e.button !== 1) return
        e.preventDefault()
        openBeside(safe, beside_label(children, safe))
        go(safe)
      }}
      className={className}
    >
      {children}
    </a>
  )
}
