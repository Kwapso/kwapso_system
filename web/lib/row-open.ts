"use client"

// THE ONE SEAM A NON-ANCHOR ROW OPENS THROUGH.
//
// `<InAppLink>` (web/components/shell/in-app-link.tsx) is the door for a real
// `<a href>` — cmd/ctrl-click and a middle-click open the address BESIDE the
// active tab (`openBeside`, workspace-tabs.ts), a plain left click stays on
// this one. A COLLECTION ROW is not an anchor — the click target is a whole
// `<TableRow>`, often with a second, narrower control (a title's own
// `<Button variant="link">`) doing the same thing inside it — so neither
// `InAppLink` nor the browser's own modifier handling ever sees it, and the
// gesture has to be taught by hand.
//
// IT WAS TAUGHT BY HAND ONCE ALREADY, on the ticket row alone
// (`TicketRowsTable`, tickets-collection.tsx's own `openRow`/`auxOpenRow`),
// after the client reproduced the gap live on staging: "the command that I'm
// clicking is not opening a new tab." `web/components/records/record-table.tsx`
// draws the identical `<TableRow onClick={() => onRowClick(row)}>` shape for
// every OTHER collection in the app — Accounts, Tasks, Waves, Contacts,
// Stories, Meetings, and any future recipe table — with the same defect and
// no fix. Fixing it twice, by hand, in two files was exactly the shape R37's
// ONE COMPONENT (InAppLink) argument warns against for a link: the app now has
// TWO rows to keep drawing the same gesture the same way as more modules gain
// a table body of their own.
//
// SO THIS IS THE ONE PLACE THE GESTURE IS WRITTEN. `rowOpenHandlers` never
// touches a DOM node — it hands back the two handlers a row (or a control
// inside it) mounts as `onClick`/`onAuxClick`, and every caller supplies the
// three things only IT knows: the record's own address (the same
// `/t/<teamId>/<module>/<id>` form `InAppLink` would carry it under), a label
// for the tab this opens (falls back to the address itself when a caller has
// nothing nicer — the identical "two strings, no fetch" posture
// `InAppLink`'s own `beside_label` keeps), and the plain-click behaviour,
// already bound to this one row (never `(id) => …` — the caller closed over
// the row when it built these handlers, the same way `TicketRowsTable`'s own
// per-row closures already did).
//
// NO SHIFT/ALT CARVE-OUT, unlike `InAppLink`. Those keys are the BROWSER's own
// save-as / real-new-window gesture on a genuine `<a>`; a `<TableRow>` is not
// one, so there is no native behaviour here to leave alone, and the ticket
// row's own hand-rolled version never checked for them either — this keeps
// that exact behaviour rather than inventing a carve-out nothing asked for.
import * as React from "react"

import { openBeside } from "@/lib/workspace-tabs"

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
    // A PLAIN CLICK CALLS `onOpen`, UNCHANGED — same tab, same dispatch.
    // Cmd/ctrl-click opens `path` beside the active tab instead, the same
    // gesture `InAppLink` already teaches every real anchor.
    onClick: (e) => {
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault()
        openBeside(path, label)
        return
      }
      onOpen()
    },
    // MIDDLE-CLICK NEVER REACHES `onClick` IN A BROWSER — it fires `auxclick`
    // instead (the same reason `InAppLink`'s own middle-click handler lives
    // on `onAuxClick` rather than `onClick`).
    onAuxClick: (e) => {
      if (e.button !== 1) return
      e.preventDefault()
      openBeside(path, label)
    },
  }
}
