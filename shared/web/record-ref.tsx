"use client"

// THE NUMBER A RECORD IS KNOWN BY — the black chip, drawn once, for every kind
// that has one and on every surface that shows one.
//
// ── WHAT A REFERENCE IS ────────────────────────────────────────────────────
//
// `shared/workers/refs.ts` mints ONE sequence per kind, team-wide, with no
// account code in the string: `T0412` a ticket, `B0188` a story, `S0012` a
// sprint, `M0009` a meeting, `A0003` an app, `W0001` a wave, `I0007` an input.
// It is the short code a person reads down the phone, types into a search box
// and quotes back in an email. It is a FACT about the record, in the same
// category as its type and its age, and never a record you could go and open —
// which is the line `ticket-chips.tsx` already draws between a chip and a link.
//
// ── WHY THIS FILE, AND WHY NOT INSIDE `ticket-chips.tsx` ───────────────────
//
// The client approved this treatment on tickets twice: "Chip 1 in black for the
// ID" (August) and "put the ID before the title to the left, with the usual
// black chip design" (September). By 6 Sep 2026 the app was drawing that same
// black lozenge in FOUR places — `ticket-chips.tsx`'s chip line, the ticket
// rows table (`tickets-collection.tsx`), an app's tickets table
// (`work-panels.tsx`) and every record detail header (`record-chrome.tsx`'s
// `recordNumber`) — three of them agreeing on `shrink-0 tabular-nums` by
// copy-paste and one of them not carrying it at all. Four copies of one mark is
// the exact shape `RecordMark`'s own header counted seventeen of: none of them
// wrong on its own screen, and drift only ever visible in aggregate.
//
// SO WHY A SIBLING RATHER THAN GENERALISING `ticket-chips.tsx`. That file's
// whole job is to pin WHICH FOUR FACTS a ticket wears and in what order — the
// client ruled on the set, not on the chips. Generalising it into "a row of
// however many facts a caller passes" would delete the one thing it exists to
// hold. And six of the seven kinds do not want a chip LINE at all; they want
// this ONE mark, in front of a name, in a row or a header that already has its
// own furniture. So the ticket's four-fact line stays exactly what it is and
// becomes a CALLER of this, the same way it is already a caller of `Badge`.
//
// It sits beside `record-mark.tsx` on purpose and the pair reads as one idea:
// `RecordMark` is the face a record is recognised by, `RecordRef` is the number
// it is quoted by. Both are in `shared/web/` because both front doors may draw
// them, and neither reaches for anything app-side (`@/...` resolves to two
// different folders depending on which door is compiling).
//
// ── NO KNOBS, ON PURPOSE ───────────────────────────────────────────────────
//
// There is no `className`, no `size`, no `variant`. Every one of those is a
// place a future surface could draw the reference SLIGHTLY differently and stay
// green, which is the failure this component is here to make impossible —
// `web/test/one-black-chip.test.ts` is the census that holds the door shut.
// What is baked in, and why:
//
//   • `variant="inverse"` — the kit's word for the black chip: charcoal fill,
//     off-beige label, and it FLIPS with the palette, so it is still the
//     loudest thing on the screen in dark mode where an actual black would
//     disappear into the paper. R32 is satisfied by construction: the fill is a
//     token pair the kit owns and this file names no colour at all.
//   • `size="pill"` — the 26px geometry the client asked for ("i want the pills
//     a bit bigger and with more spacing"). The detail header reaches the same
//     size a second way, through `IDENTITY_ROW`'s own rebind, so naming it here
//     changes nothing there and stops every other surface from having to know.
//   • `shrink-0` — a reference with its tail cut off is not merely useless, it
//     is WRONG: `T041` is a different ticket from `T0412`. In a flex row the
//     title truncates and the number never does.
//   • `tabular-nums` — what "monospaced" means everywhere else in this app. Two
//     references under one another line up digit for digit, which is the whole
//     reason a person scans a column of them.
//
// ── A RECORD WITH NO REFERENCE DRAWS NOTHING ───────────────────────────────
//
// `null` is a real state on five of the seven kinds — a ticket, a story, a
// sprint and a meeting mint one only when they name a client (a reference is
// "the number a client quotes", so an internal one would be a promise nobody
// can keep), and every kind has rows older than the day its counter was added.
// An empty black lozenge is worse than nothing: it reads as a value that failed
// to load rather than as a record that never had one. So the component returns
// `null` and the row simply has one fewer thing in it. That is why the guard is
// HERE and not at each call site — a call site that forgets it draws the empty
// lozenge, and the person who sees it cannot tell which of the two happened.
//
// ── COPYING IT ─────────────────────────────────────────────────────────────
//
// A reference exists to be quoted, so it has to be selectable — and it already
// is, in the one gesture people use: a reference is a single unbroken token with
// no space or punctuation inside it, so a double-click word-select grabs exactly
// the whole thing, `T0412` and not `T041` or `T0412 The dispatch board`.
// Nothing here adds `user-select: all`, and that is a decision rather than an
// omission: most of these chips sit inside a row whose own click opens the
// record, so a click that ALSO selected text would put two behaviours on one
// gesture — and the surface where somebody actually copies a number is the
// detail header, which is not clickable and where the default already works.

import * as React from "react"

import { Badge } from "@shared/ui/components/badge/badge"

/** THE ROW THAT PUTS THE NUMBER IN FRONT OF THE NAME — the client's own
 * instruction, "put the ID before the title to the left", as one string rather
 * than as a shape five call sites each remember.
 *
 * `flex items-center` so the chip sits true against the text beside it (a chip
 * in an inline box is centred on its LINE box, not on itself, and stands low —
 * the client noticed: "what's wrong with alignment chips??"). `min-w-0` so the
 * NAME is what shrinks when the row runs out of room, which only works because
 * the chip itself is `shrink-0`. `gap-2` is the same 8px every other chip row
 * in the app uses. */
export const REF_LEADS_NAME = "flex min-w-0 items-center gap-2"

export function RecordRef({
  /** The record's own `ref` — `null`/`undefined`/`""` all draw nothing at all.
   * Passed straight off the row: this component does the absent case so no
   * caller has to remember it. */
  value,
}: {
  value: string | null | undefined
}): React.ReactElement | null {
  if (!value) return null
  // NOT A LINK AND NOT A BUTTON. `Badge` takes no `asChild` (the kit's own
  // signature), so making the number clickable would mean either a hand-rolled
  // lozenge — a second black chip in the system — or an upstream change to a
  // vendored file this repo may not edit. The number is a FACT; opening the
  // record is a control the row or the header already offers some other way,
  // and a control inside a clickable row is two destinations decided by pixels.
  return (
    <Badge variant="inverse" size="pill" className="shrink-0 tabular-nums">
      {value}
    </Badge>
  )
}
