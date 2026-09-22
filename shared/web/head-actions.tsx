"use client"

// THE RECORD HEAD'S OWN ACTIONS ROW, FOLDED — Aurora's ruling, 18 Sep 2026, on
// the narrow ticket head: the Close / Start timer / pen / "…" row floated over
// a wrapped title once the head band ran out of room. Her pick, off a
// side-by-side options page, verbatim: "h3, and aign the menu to the chips."
//
// H3 = "Actions fold into the menu." At a narrow width only the "…" trigger
// stays, at the chip row's own right end; Close, Start timer and Edit — every
// control that stood beside the title as its own button — move inside it,
// alongside whatever already lived in the overflow menu. Above the
// breakpoint, nothing changes: the wide row draws exactly what it always has.
//
// A CONTAINER QUERY, NOT A VIEWPORT ONE — the kit's own convention, first laid
// down by `ToolbarRow` (shared/ui/components/toolbar-row/toolbar-row.tsx, "A
// CONTAINER QUERY, NOT A VIEWPORT ONE") and repeated in its own CHANGELOG: "the
// fold pair answers `@min-[48rem]`, never `sm:`/`md:`/`lg:`" — an ARBITRARY
// bracket value, not a named container step, because the number has to be the
// one actually measured rather than a rung on an unrelated scale that happens
// to land near it. `RECORD_HEAD_CONTAINER`
// (shared/web/record-heading.tsx, folded into `RECORD_TITLE_TREATMENT`, so
// every record head wearing R52's one constant already carries it) turns the
// kit's own header band (`[data-record-region=header]`, `RecordDetail`'s
// Region 1) into that container, the element that holds every half of this
// fold: `HeadActionsFoldMenu` (rides in `aboveTitle`, since kit v1.2.158) AND
// the wide row (rides in `actions`, inside `<Title>`) alike. So a width read
// here is a width read against the PANE the record head is drawn in, never
// the window. RETARGETED 22 SEP 2026 from `[data-slot=title]`, which stopped
// containing the chip row the same day the kit gave `aboveTitle` its own
// slot; see `RECORD_HEAD_CONTAINER`'s own comment for the live bug that
// caught it (two overflow triggers on one record head, the narrow one stuck
// permanently visible with no container to query).
//
// THE BREAKPOINT — measured, not guessed. The wide row this fold answers for
// is at most four controls at `--space-2h` (10px) gaps: two labelled
// buttons (a primary/secondary pill, "Close" ≈ 96px, "Start timer" ≈ 143px at
// the kit's `px-5`/40-tall standing size) and two icon-only 40px squares (the
// edit pen, the overflow trigger). Summed with three 10px gaps that is ≈349px
// (21.8rem), matching the ≈334px this file's own live proof measured on
// T0001's actual English row — over Tailwind's `xs` container step
// (20rem/320px) and under `sm` (24rem/384px), so `24rem` (384px) is the
// nearest width that never clips a control mid-word, with ~35–50px of slack
// for a longer translated label ("Iniciar temporizador" and the like).
//
// `@min-[44rem]`, RAISED FROM `@min-[24rem]` — 19 Sep 2026, Aurora's ruling on
// the ticket head overlay: "the title is capped at 50 characters and wraps
// to at most two lines; nothing ever covers the title." 24rem was sized for
// the ACTIONS row alone — it says nothing about how much of the band is left
// for the title once the actions fit. Live-measured on the real defect
// (1024×768 rail expanded, T0001): at a 761px band the actions claimed
// 333.67px, leaving the title exactly 411.33px — comfortable — but at a
// narrower band the SAME 24rem threshold would have kept the wide row
// visible down to the moment the actions alone stopped fitting, handing the
// title a sliver on its way there (a few tens of px, not a readable column).
// The fold now answers a second question the old one didn't: not just "do
// the actions fit", but "is there ALSO still a readable title column left".
// `20rem` (320px) is that column's own floor — the same `xs` container step
// the old comment already used as its lower landmark, chosen for the same
// reason: a title narrower than that is reading as a sliver, not a name. So
// the new threshold is the old one (24rem — the actions' own footprint, with
// its translation slack, unchanged) PLUS the 20rem title floor: `44rem`
// (704px). Below it, the wide row hides and `HeadActionsFoldMenu` (below)
// draws instead, guaranteeing that whenever four buttons are asked to stand
// beside a title, the title is left at least 20rem to stand in.
// Confirmed live, three states, BEFORE this edit (`page.addStyleTag` +
// runtime class swap, not a guess): folds correctly at 760px (rail
// collapsed, 689px band, under 704px) and stays open at 1024px/1440px (761px/
// 781px bands, over 704px) — see this lane's own report for the numbers.
// Written as the literal bracket value per the kit's own convention above,
// not derived from a shared constant — Tailwind's static scanner reads the
// SOURCE TEXT of a class, so a computed template literal would not compile
// to a real utility.
//
// TWO RENDERS OF THE SAME ACTIONS, NOT ONE NODE PHYSICALLY MOVED — the same
// trick `ToolbarRow`'s own fold uses (that file's own "TWO RENDERS OF THE
// SAME PROP" note) for the same reason: a `DropdownMenuItem` and a `Button`
// are different elements, so there is no single node that becomes one or the
// other by width alone. `HEAD_ACTIONS_ROW_CLASS` (the wide copy, a plain
// class a caller applies to the wrapper around its OWN existing controls) and
// `HeadActionsFoldMenu` (the narrow copy, built here from a flat, normalized
// item list) are always both in the tree; CSS is the only thing that decides
// which one a reader sees, and the caller decides what "wide" actually draws
// — this file never touches it.
//
// WHY THIS IS SHARED (shared/web/, not web/components/tickets/). The ticket
// head is the first to fold, but it is not the only record head with its own
// row of standalone buttons beside the title — `web/components/work/
// task-detail.tsx` and `web/components/work/story-detail.tsx` both draw
// `RecordTimerButton` the identical way, beside their own primary/secondary
// buttons and `EditPenButton`. All three are wired to this file now -- the
// ticket head first, `story-detail.tsx` and `task-detail.tsx` joined it, each
// pairing its own `HeadActionsFoldMenu` (narrow) with a `RecordActionsMenu`
// carrying the same `overflow` (wide), so a menu-only action (Archive on a
// ticket, Edit on a story, Delete on a task) is reachable whether or not the
// fold is showing. SINCE THEN, `account-detail.tsx`, `contact-detail.tsx`,
// `app-detail.tsx`, `meeting-detail.tsx`, `process-detail.tsx`,
// `member-screen.tsx`, `sprint-detail.tsx` and `wave-detail.tsx` have wired
// the identical pair too. `knowledge-detail.tsx` is the one bespoke detail
// still unwired, a candidate for the same fold whenever it grows more than
// one standalone action beside its title.

import * as React from "react"

import { Button } from "@shared/ui/components/button/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@shared/ui/components/dropdown-menu/dropdown-menu"
import { DotsThree } from "@shared/ui/foundations/icons"

/** ONE ACTION, NORMALIZED FOR THE FOLDED MENU. Deliberately the same shape
 * `RecordAction` (web/components/records/record-chrome.tsx) already carries
 * — key, label, an optional icon, `onSelect`, `disabled`, `destructive` — so
 * a caller that already built a `RecordAction[]` for its own "…" overflow
 * (Translate, Archive, and the like) can hand that array straight into
 * `items` alongside the record's primary/secondary controls, with no
 * reshaping. This file does not import `RecordAction` itself — that type
 * lives app-side, and a shared component should not have to reach back into
 * `web/` to describe its own prop. */
export type HeadActionItem = {
  key: string
  label: string
  icon?: React.ReactNode
  onSelect: () => void
  disabled?: boolean
  /** Red, and pushed below a separator — the same convention the kit's own
   * `RecordActionsMenu` overflow already draws. */
  destructive?: boolean
}

/** THE WIDE ROW'S OWN WRAPPER. A caller keeps drawing its real controls
 * exactly as before — a `Button`, `RecordTimerButton`, `EditPenButton`,
 * `RecordActionsMenu` for whatever is already an overflow item — and wraps
 * only the OUTER box in this class. `hidden` below the breakpoint, `flex`
 * above it: the inverse of `HeadActionsFoldMenu`'s own wrapper, below. */
export const HEAD_ACTIONS_ROW_CLASS = "hidden @min-[44rem]:flex items-center gap-[var(--space-2h)]"

/** THE CHIP ROW'S OWN TRIGGER — rendered as part of whatever a caller hands
 * `RecordScreen`'s `chips` prop, after its own chips, so it becomes the ROW'S
 * last child. `ml-auto` is what "pushed right" means in a `flex flex-wrap`
 * row (the chip row's own `IDENTITY_ROW` class, record-chrome.tsx) — it
 * claims every pixel of slack on its own line and lands flush with the row's
 * right edge, which is the chip row's own right edge. `align="end"` on the
 * menu content is the other half of "align the menu to the chips": Aurora's
 * own words for what should line up with what, and lining the trigger's
 * right edge up with the chip row's is what makes the popover's right edge
 * agree with it too, rather than the menu spilling out past either side.
 *
 * Renders nothing when there is nothing to fold — the same "an empty menu is
 * a control standing for nothing" rule `RecordActionsMenu` already follows. */
export function HeadActionsFoldMenu({
  items,
  label,
}: {
  items: HeadActionItem[]
  /** The trigger's accessible name. REQUIRED, and never defaulted to a bare
   * English literal here — `EditPenButton`'s own convention
   * (shared/web/edit-pen-button.tsx): a shared/web component takes copy from
   * its caller rather than reaching for its own `useT()`, so the one English
   * word this file would otherwise own can't slip past R28/R33 unwrapped.
   * Callers pass `t("More actions")` — the exact phrase `RecordActionsMenu`
   * already carries in the catalogue, reused rather than a new entry. */
  label: string
}) {
  const visible = items.filter(Boolean)
  if (visible.length === 0) return null
  const ordinary = visible.filter((a) => !a.destructive)
  const destructive = visible.filter((a) => a.destructive)
  return (
    <span data-slot="head-actions-fold" className="ml-auto flex @min-[44rem]:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="icon" className="shrink-0" aria-label={label}>
            <DotsThree className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        {/* `sideOffset` is left to the kit's own default token
           (dropdown-menu.tsx: `sideOffset = 8`) — Aurora's ruling named
           `align="end"` by name and left the offset to what the kit already
           draws, the same restraint `RecordActionsMenu`'s identical menu
           already shows. */}
        <DropdownMenuContent align="end" className="w-56">
          {ordinary.map((a) => (
            <DropdownMenuItem key={a.key} disabled={a.disabled} onSelect={a.onSelect} className="gap-2">
              {a.icon}
              {a.label}
            </DropdownMenuItem>
          ))}
          {ordinary.length > 0 && destructive.length > 0 && <DropdownMenuSeparator />}
          {destructive.map((a) => (
            <DropdownMenuItem
              key={a.key}
              disabled={a.disabled}
              onSelect={a.onSelect}
              className="text-destructive focus:text-destructive gap-2"
            >
              {a.icon}
              {a.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
  )
}
