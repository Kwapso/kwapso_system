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
// side by side with `RecordDetailBody`'s own below, root flex column
// (`gap-6`, no `min-h-0`) and one normal-flow region switching between the
// `lg` grid and the below-`lg` stack, and they agree line for line, on
// purpose, because both answer the identical R89 argument. A future change
// to one is a change this file's own comment asks to be made to the other in
// the same commit.
//
// NEITHER OF THEM DRAWS THE BAND ANY MORE, 22 Sep 2026, kit v1.2.155. Both
// used to end with it, `mt-auto`, as their own last child; it goes through
// `ScreenShell`'s own footer slot now (`@/components/shell/footer-slot`),
// outside the shell body's padded stack, which is the only place it can sit
// on the pane's own bottom edge with no paper under it. See the note above
// this component's own props for the negative margin that deletion retires.
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
// `dataSlot` defaults to a NEUTRAL name, never the literal
// `"ticket-detail-body"` string, which stays owned by
// `ticket-detail-body.tsx`'s own inlined JSX and nowhere else, so two
// different DOM subtrees can never carry the same marker. Its
// `footerDataSlot` companion is gone with the footer itself.
//
// `side` IS OPTIONAL, FOR A SINGLE-COLUMN RECORD — added for
// knowledge-detail.tsx (the finding, 21 Sep 2026: a knowledge source has one
// tabbed body and no side panels, so the "previous fix" HAND-COPIED this
// shape rather than calling it, one file drifting from the proved one — the
// exact mistake this component exists to rule out). Absent `side`, `main`
// renders alone, at every width; no empty `1fr` track, no `lg` grid at all.

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
  dataSlot = "record-detail-body",
}: {
  /** THE LEFT COLUMN AT `lg`, FIRST BELOW IT — a finished node, already
   * carrying whatever responsive class its own content needs (a scrolling
   * card that must not dictate the row's height, or an ordinary stack of
   * panels that just wants its own content height). This file adds no class
   * of its own to it. */
  main: React.ReactNode
  /** THE RIGHT COLUMN AT `lg`, STACKED FIRST BELOW IT — one or more panels,
   * already in their own final order; this file wraps them in the one
   * `flex flex-col gap-6` column and nothing more.
   *
   * OPTIONAL, for a single-column record with nothing to put beside `main`
   * (a knowledge source: one tabbed body, no side panels) — added for
   * knowledge-detail.tsx (the finding, 21 Sep 2026: it used to hand-copy
   * this whole shape rather than call it, one file drifting from the
   * proved one). Absent, `main` renders alone at every width — no `lg`
   * grid, no empty second track. */
  side?: React.ReactNode
  /** THE BLACK BAND, AND WHERE IT WENT, 22 Sep 2026, kit v1.2.155.
   *
   * THIS COMPONENT NO LONGER DRAWS THE BAND AT ALL. It used to take a
   * `footer` node and render it as its own `flex-none mt-auto w-full` last
   * child, carrying a `footerDataSlot` marker and, on the default marker, a
   * fixed NEGATIVE bottom margin (`mb-[calc(var(--space-5)*-1)]
   * lg:mb-[calc(var(--space-6)*-1)]`) to reach past
   * `[data-slot="screen-shell-body"]`'s own reserved `padding-bottom`. That
   * margin is DELETED, and so is the marker, and so is the prop.
   *
   * WHY THE MARGIN HAD TO GO EVEN THOUGH IT REACHED THE PIXEL. It was a
   * number derived from a padding this file does not own, on a box the kit
   * can change under it: v1.2.153 moved `DENSITY_BODY` off the scroller onto
   * `screen-shell-stack` and the same figure went on being right by
   * coincidence. It is also the third escape in a row from the same fact,
   * after a grown page container and a `:has()` growth rule, and every one of
   * them was an attempt to get OUT of a padded box rather than to stop being
   * inside it.
   *
   * WHAT REPLACES IT. `ScreenShell`'s own footer SLOT, which the kit renders
   * inside the one scroller and OUTSIDE the padded stack, as the `mt-auto`
   * last child of a `min-h-full` column. A caller reaches it with
   * `<ScreenFooterSlot>` (`@/components/shell/footer-slot`) from wherever it
   * is, so there is nothing for this component to thread. `story-detail.tsx`
   * and `knowledge-detail.tsx` both do exactly that, as siblings of their own
   * `<RecordDetailBody>` call.
   *
   * WHAT THIS COMPONENT STILL IS. The shared `lg` grid / below-`lg` stack
   * over `main` and an optional `side`, `gap-6` between them, one column,
   * `flex-1` so it fills the leftover space after the head. That is the half
   * of R89's shape that was never about the band. */
  dataSlot?: string
}) {
  const isAtLeastLg = useIsAtLeastLg()
  return (
    <div data-slot={dataSlot} className="flex min-w-0 flex-1 flex-col gap-6">
      <div className="min-w-0">
        {side === undefined ? (
          main
        ) : isAtLeastLg ? (
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
    </div>
  )
}
