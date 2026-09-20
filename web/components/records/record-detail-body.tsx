"use client"

// THE SHARED RECORD-DETAIL LAYOUT — the SAME SHAPE `ticket-detail-body.tsx`'s
// own `TicketDetailBody` draws (round 21 UI/UX story detail lane, 21 Sep
// 2026, built for the story detail page), so a second record can draw R89's
// whole proved shape — one page scroll, the footer flush at the screen's own
// bottom edge with the panel gap above it, the side column that never
// scrolls — without hand-copying it a second time.
//
// TICKET-DETAIL-BODY.TSX ITSELF STAYS INLINED, ON PURPOSE, AND DOES NOT CALL
// THIS COMPONENT. `web/test/footer-on-the-edge.test.ts` (R89) proves the
// whole construction by reading `TicketDetailBody`'s own function body as
// TEXT — exact source positions, nine rounds of live-injection debugging
// behind every one of them — so moving that JSX into a different file would
// turn a green law red for a refactor that changes no pixel. What DOES move:
// `useIsAtLeastLg`, below, the one piece with no source position for that
// suite to care about, imported by `ticket-detail-body.tsx` rather than kept
// as a second, independently-subscribed copy of the identical media query.
//
// SO THIS COMPONENT'S OWN SHAPE IS PROVED BY CONSTRUCTION, AGAINST THAT SAME
// FILE, RATHER THAN BY A SHARED CALL: read `TicketDetailBody`'s return JSX
// side by side with `RecordDetailBody`'s own below — root flex column
// (`gap-6`, no `min-h-0`), one normal-flow region switching between the `lg`
// grid and the below-`lg` stack, the footer band `mt-auto` last — and they
// agree line for line, on purpose, because both answer the identical R89
// argument. A future change to one is a change this file's own comment asks
// to be made to the other in the same commit.
//
// WHAT GENERALISES AND WHAT DOES NOT. The ticket's own conversation card
// SCROLLS internally and must contribute ZERO intrinsic height to the grid's
// own row sizing (round 27's `fill="absolute"` trick) — that mechanism stays
// owned by `TicketDetailBody`, which builds its own `conversation` cell (the
// exact responsive class it always computed) before handing the FINISHED
// node to whichever layout draws it. A caller that hands THIS component an
// ordinary, non-scrolling `main` (the story page's own left column: Detail,
// Acceptance criteria, Build notes) needs none of that machinery —
// `items-stretch` on the `lg` grid still lets the shorter of the two
// ordinary columns stretch to match the taller one, the same visual result a
// ticket's side column gets against its own scrolling conversation, just
// reached by ordinary content height instead of an absolute-positioned
// escape hatch.
//
// `dataSlot`/`footerDataSlot` default to a NEUTRAL pair of names — never the
// literal `"ticket-detail-body"`/`"ticket-footer-band"` strings, which stay
// owned by `ticket-detail-body.tsx`'s own inlined JSX and nowhere else, so
// two different DOM subtrees can never carry the same marker.

import * as React from "react"

/** Tailwind's `lg` breakpoint — the identical number `ticket-detail-body.tsx`
 * already pins, kept private HERE for the same reason its own comment gives:
 * "a second file with its own reason to ask 'are we at lg' gets its own
 * threshold constant, the same way `use-is-phone.ts` keeps `PHONE_QUERY` and
 * `COLUMNS_QUERY` private rather than daisy-chaining every caller onto one
 * shared number." */
const LG_QUERY = "(min-width: 64rem)"

function queryLg(): MediaQueryList | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return null
  return window.matchMedia(LG_QUERY)
}

function subscribeLg(onChange: () => void): () => void {
  const mq = queryLg()
  mq?.addEventListener("change", onChange)
  return () => mq?.removeEventListener("change", onChange)
}

/** `false` on the server and on the very first client render — the same
 * conservative default `ticket-detail-body.tsx`'s own `useIsAtLeastLg` banks,
 * so a person on a genuinely narrow screen never sees a one-frame flash of
 * the two-column tree before it corrects. */
export function useIsAtLeastLg(): boolean {
  return React.useSyncExternalStore(subscribeLg, () => queryLg()?.matches ?? false, () => false)
}

export function RecordDetailBody({
  main,
  side,
  footer,
  dataSlot = "record-detail-body",
  footerDataSlot = "record-footer-band",
}: {
  /** THE LEFT COLUMN AT `lg`, FIRST BELOW IT — a finished node, already
   * carrying whatever responsive class its own content needs (a scrolling
   * card that must not dictate the row's height, or an ordinary stack of
   * panels that just wants its own content height). This file adds no class
   * of its own to it. */
  main: React.ReactNode
  /** THE RIGHT COLUMN AT `lg`, STACKED FIRST BELOW IT — one or more panels,
   * already in their own final order; this file wraps them in the one
   * `flex flex-col gap-6` column and nothing more. */
  side: React.ReactNode
  /** THE BLACK BAND — `RecordFooterBand` (`@/components/records/
   * record-chrome`), this component's own `flex-none` LAST child, `mt-auto`
   * so it reaches the root's own bottom edge on a short page and sits right
   * after the region on a tall one (round 28, R89/R91 — see this file's own
   * header). */
  footer: React.ReactNode
  dataSlot?: string
  footerDataSlot?: string
}) {
  const isAtLeastLg = useIsAtLeastLg()
  return (
    <div data-slot={dataSlot} className="flex min-w-0 flex-1 flex-col gap-6">
      <div className="min-w-0">
        {isAtLeastLg ? (
          <div className="grid min-w-0 grid-cols-[2fr_1fr] items-stretch gap-6">
            {main}
            <div className="flex min-w-0 flex-col gap-6">{side}</div>
          </div>
        ) : (
          <div className="flex min-w-0 flex-col gap-6">
            {side}
            {main}
          </div>
        )}
      </div>
      <div data-slot={footerDataSlot} className="flex-none mt-auto w-full">
        {footer}
      </div>
    </div>
  )
}
