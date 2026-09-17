"use client"

// THE ONE CLICK GRAMMAR, AND THE ONE SEAM A NON-ANCHOR ROW OPENS THROUGH.
//
// Until 18 Sep 2026 this app taught the SAME gesture twice, and the two
// copies disagreed. `InAppLink` (web/components/shell/in-app-link.tsx) turned
// cmd/ctrl-click and a middle-click into `openBeside` PLUS a same-tab
// navigation ("she is taken to the new tab" — wrong, see below); this file's
// own `rowOpenHandlers` turned the identical gestures into `openBeside`
// ALONE. Two grammars, one ruling.
//
// THE RULING (17 Sep 2026, verbatim): "Unless I do it on purpose to open a
// new tab, everything happens on the same tab. ... Unless I press Command
// and click, this would open a new tab, and the same behavior in Windows,
// just replicating Google Chrome." Chrome's OWN grammar, which is what "just
// replicating Google Chrome" actually means: cmd/ctrl-click or a middle-click
// open the destination in a BACKGROUND tab — she stays exactly where she
// is — and only ADDING Shift (cmd/ctrl+Shift-click) also switches her to it.
// A plain Shift-click or an Alt-click alone are Chrome's own gestures
// (save-as, a real new window) and are never this app's to reinterpret.
//
// SO THE GRAMMAR IS WRITTEN ONCE, HERE. `clickGesture` reads four fields off
// anything shaped like a click and returns which of Chrome's four outcomes
// it is — nothing else, no store call, no DOM call, so it can be read by a
// real anchor (`InAppLink`) and by a `<TableRow>`/card with no anchor under
// it at all (`rowOpenHandlers`, this file's other export) without either one
// owning the interpretation. `applyClickGesture` is the second half — what
// the workspace-tab STORE does with a classified gesture — also written
// once, because "open beside without fronting it" needs the identical
// store-side trick (open, then hand the strip straight back) wherever a
// modified click lands.
//
// `rowOpenHandlers` itself is unchanged in shape from the first version of
// this file: it hands back the two handlers a row (or a control inside it)
// mounts as `onClick`/`onAuxClick`, and every caller supplies the three
// things only IT knows — the record's own address, a label for the tab this
// opens, and the plain-click behaviour, already bound to this one row.
//
// A ROW OR A NESTED CONTROL, NEVER BOTH ON THE SAME CLICK — the same
// question `InAppLink` answers for a real anchor (its own modified-click
// branch calls `e.stopPropagation()`) applies here too: `TicketRowsTable`'s
// and `AppTicketsPanel`'s own title controls (a `<Button variant="link">`, a
// `<span>`) sit INSIDE a row already wired to this same seam, and each calls
// `e.stopPropagation()` before handing the event to
// `handlers.onClick`/`handlers.onAuxClick` DIRECTLY — never by letting it
// bubble back up to the row. That is deliberate, not incidental: a guard IN
// HERE that inspected `e.target` for "is this inside an `a`/`button`" could
// not tell that shape apart from a genuine bubble it should ignore — it
// would block the exact, intentional re-dispatch those two controls already
// do. So the row stays exactly what it always was, a plain dispatcher with
// no opinion about where the click came from; the seam against
// double-handling lives at the NESTED CONTROL's own `stopPropagation`
// instead, the one place that actually knows which of the two cases it is.
//
// SHIFT AND ALT NOW CARVE OUT HERE TOO — a change from the first version of
// this file, which deliberately had NO such carve-out ("a `<TableRow>` is
// not [a real anchor], so there is no native behaviour here to leave
// alone"). That reasoning stood while this file kept its own, narrower
// grammar; sharing `clickGesture` with `InAppLink` means sharing its
// classification too; `null` (shift/alt alone) now does nothing on a row,
// exactly as it does nothing on a real anchor — the row simply has no
// native fallback of its own to hand the gesture to, so "left alone" means
// "no beside-open, and no plain-click open either," matching a real anchor's
// own Shift-click (which does not navigate in place either).
import * as React from "react"

import { activateTab, activeTabIdSnapshot, openBeside } from "@/lib/workspace-tabs"

/** CHROME'S OWN FOUR OUTCOMES FOR A CLICK, AND NOTHING ELSE. Pure — reads
 * four fields off whatever looks like a `MouseEvent` and decides nothing
 * about the DOM (no `preventDefault`, no store call), so a caller can branch
 * on the result before touching anything.
 *
 * "same": a plain click, unmodified — stays on the current tab.
 * "beside": cmd/ctrl-click, or a middle-click (button 1) — opens the
 *   destination beside the active tab, in the BACKGROUND: she stays put.
 * "beside-switch": the same two gestures PLUS Shift — opens beside AND
 *   switches her to the new tab, Chrome's "open link in new tab and switch
 *   to it."
 * `null`: Alt (alone or combined with anything else — it is always the
 *   browser's, save-as on a real anchor) or a plain Shift-click with no
 *   cmd/ctrl and no middle button (Chrome's own real-new-window gesture) —
 *   the caller's cue to do nothing here and let its own native fallback
 *   run, if it has one. */
export function clickGesture(e: {
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  button: number
}): "same" | "beside" | "beside-switch" | null {
  if (e.altKey) return null
  const opensBeside = e.metaKey || e.ctrlKey || e.button === 1
  if (!opensBeside) {
    if (e.shiftKey) return null
    if (e.button !== 0) return null
    return "same"
  }
  return e.shiftKey ? "beside-switch" : "beside"
}

/** RUN WHAT `clickGesture` DECIDED, ON THE WORKSPACE-TAB STORE — the one
 * place the STORE side of the grammar is written too, not just the
 * classification. `path`/`label` are `openBeside`'s own two strings;
 * `sameTab` is the caller's own plain-click action, arity-zero because the
 * caller already knows what it means in ITS world (`go(safe)` for a real
 * anchor, the bound `onOpen()` for a row) — this function never navigates
 * anything directly, it only decides whether and when to call the one it
 * was handed.
 *
 * "beside" is the one branch `openBeside` cannot do by itself: `openBeside`
 * always FRONTS the tab it just opened (see its own doc in
 * workspace-tabs.ts) because this app has no chrome-level "tab you can see
 * without switching to it" the way a browser window does — so a background
 * open is done by opening it and then handing the strip straight back to
 * whichever tab was active a moment before (`activateTab`), which is also
 * why `sameTab` never runs on this branch: the document she is looking at
 * must not move either. */
export function applyClickGesture(
  gesture: ReturnType<typeof clickGesture>,
  path: string,
  label: string,
  sameTab: () => void
): void {
  if (gesture === null) return
  if (gesture === "same") {
    sameTab()
    return
  }
  if (gesture === "beside-switch") {
    openBeside(path, label)
    sameTab()
    return
  }
  const prevId = activeTabIdSnapshot()
  openBeside(path, label)
  if (prevId) activateTab(prevId)
}

/** `path`/`label` are `openBeside`'s own two strings, always the ADDRESS a
 * plain click on this same row would have taken you to — never a second idea
 * of where the row goes. `onOpen` is the plain-click behaviour, arity-zero
 * because the row's own id (or whatever `onOpen` needs) is already bound by
 * the caller; this file never reads an id off anything. */
export function rowOpenHandlers(
  path: string,
  label: string,
  onOpen: () => void
): {
  onClick: (e: React.MouseEvent) => void
  onAuxClick: (e: React.MouseEvent) => void
} {
  return {
    onClick: (e) => {
      const gesture = clickGesture(e)
      if (gesture === null) return
      if (gesture !== "same") e.preventDefault()
      applyClickGesture(gesture, path, label, onOpen)
    },
    // MIDDLE-CLICK NEVER REACHES `onClick` IN A BROWSER — it fires `auxclick`
    // instead (the same reason `InAppLink`'s own middle-click handler lives
    // on `onAuxClick` rather than `onClick`). Only the two beside-opening
    // outcomes are this handler's to act on; `clickGesture` returns "same"
    // for a plain button-0 auxclick a test may synthesize, and this handler
    // leaves that alone too.
    onAuxClick: (e) => {
      const gesture = clickGesture(e)
      if (gesture !== "beside" && gesture !== "beside-switch") return
      e.preventDefault()
      applyClickGesture(gesture, path, label, onOpen)
    },
  }
}
