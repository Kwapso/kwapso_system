"use client"

// A TIDY ROW OF PILLS — Settings › Appearance's Size, Appearance and
// Background groups, replacing the kit's card-grid `AppearanceOptionGroup`
// for these three compact groups only.
//
// WHY THIS EXISTS, 2026-09-14. The client rejected the shipped preview-led
// panel a second time, pointing at the design lane's own comparison artifact
// (`appearance-layouts.html`, option 3 · "Preview-led"): "appearance display
// still not right. do it like in the artifact." The artifact's three compact
// groups are a single horizontal row of small pill buttons (`.l3-pillrow` /
// `.l3-pill`) — a border, the label, a ring on the pressed one — never the
// kit's own two-column card grid `AppearanceOptionGroup` draws once a group
// has no picture and no description left to justify a card's height
// (`ScaleSection` / `ThemeSection` / `SpineSection`'s own compact options
// already carry neither, since the live `AppearancePreview` beside them took
// over that argument). A card sized for a picture, holding only a word, is
// the "loose two-column row with a floating badge" she is rejecting.
//
// THE ROW ITSELF IS APP-SIDE, NOT A KIT ROUND-TRIP. `AppearanceOptionGroup`
// is not edited or duplicated — its card shape is still correct for
// onboarding (which has no live preview beside it, and keeps the picture)
// and for any group a real picture still earns its keep on. This is a NEW,
// narrower control for the one shape neither `AppearanceOptionGroup` nor a
// hand-rolled toggle already covers: a plain, bare `<button role="radio">`
// row (the same primitive the kit's own option card is built from, never a
// `<Button variant={x===y?…}>` fake — R3's own ban), styled with nothing but
// kit ROLE tokens, so it stays inside the app's own R31 (`rounded-pill` for
// the pill, `rounded-[var(--radius-sm)]` for the swatch) and R32 (every
// colour a token, never a hex or a Tailwind ramp) — and inside the vendored
// kit's own stricter conformance laws (`shared/ui/foundations/rules/`,
// `npm run check`'s `kit-conformance` suite), which read the app's border
// utilities and bare `rounded` more narrowly than R31/R32's own prose:
// `shadow-[var(--hairline)]` in place of a CSS `border`, and no bare
// `rounded` anywhere in this file.
//
// THE SWATCH IS OPTIONAL AND SHARED. Background's three pills carry a small
// colour mark before the word (the artifact's own `.l3-swatch`); Size has no
// colour to show and carries none. `SpineSwatch` reaches `--spine-fill`, a
// ROLE token resolved off tokens.css §7b's `[data-spine]` cascade — reachable
// from app code because it is semantic, not raw palette.
//
// `ThemeSwatch` — HER SECOND INSTRUCTION THE SAME MESSAGE, "also in
// appearance add colors (like in background)" — IS THE ONE PART THAT NEEDED
// THE KIT. Light/Dark/System has no role token to reach for: a light/dark
// swatch is PALETTE-FIXED by definition (the same reason the kit's own
// `ThemePicture` pins hex rather than riding the theme cascade — a swatch of
// what dark mode looks like must not flip when the reader is already in dark
// mode), and the app's own closed-palette law (R32) forbids a raw `--kw-*`
// reference outside `shared/ui/`. So `ThemeSwatch` is drawn in the kit
// (`compositions/screens/settings.tsx`, kit v1.2.80) beside `ThemePicture`,
// at a swatch's scale rather than a thumbnail's, and re-exported here rather
// than rebuilt — matched to `SpineSwatch` in size, shape and position.

import * as React from "react"

import { ThemeSwatch } from "@shared/ui/compositions/screens/settings"
import { cn } from "@shared/ui/lib/utils"

export { ThemeSwatch }

/** One pill on the row. */
export interface AppearancePillOption {
  /** Stable key, and the value reported on select. */
  value: string
  /** The word on the pill. */
  label: React.ReactNode
  /** A small colour mark before the word — omitted where there is no colour
   * to show (Size). */
  swatch?: React.ReactNode
}

export function AppearancePillGroup({
  options,
  value,
  onValueChange,
  disabled = false,
  ariaLabel,
  className,
}: {
  options: readonly AppearancePillOption[]
  /** Which one is set. */
  value: string
  /** A different pill was pressed. */
  onValueChange?: (value: string) => void
  disabled?: boolean
  ariaLabel: string
  className?: string
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn("flex flex-wrap gap-1.5", className)}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={
              onValueChange === undefined || selected
                ? undefined
                : () => {
                    onValueChange(option.value)
                  }
            }
            className={cn(
              "inline-flex items-center gap-1.5 rounded-pill bg-background px-3 py-1.5",
              // The kit's own boundary law: a fill or an inset shadow, never a
              // CSS `border` — `--hairline` is `inset 0 0 0 1px var(--border)`,
              // the same token a `border-border` utility would have painted.
              "shadow-[var(--hairline)]",
              "text-sm text-foreground",
              disabled && "cursor-not-allowed opacity-60",
              // Override 33's own ring — the selection mark every option card
              // in this panel already carries, so a pressed pill and a
              // ringed card read as the same state. Replaces the resting
              // hairline rather than stacking with it (one inset shadow).
              selected && "font-[var(--font-weight-medium)] shadow-[var(--hairline-ink)]",
            )}
          >
            {option.swatch}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

/** Background's own mark, resolved off tokens.css §7b's `[data-spine]`
 * cascade exactly as the kit's own `SpinePicture` reads it
 * (`shared/ui/compositions/screens/settings.tsx`) — never a second copy of
 * the fill per spine. `--radius-sm` (4px, "bars, heat cells, nodes" per
 * tokens.css's own comment): the kit's conformance law reads bare `rounded`
 * more narrowly than R31's own prose allows, so the swatch spells its
 * radius as a token like everything else here. */
export function SpineSwatch({ spine }: { spine: "ink" | "paper" | "mango" }) {
  return (
    <span
      aria-hidden="true"
      data-spine={spine}
      className="h-3.5 w-3.5 shrink-0 rounded-[var(--radius-sm)] bg-[var(--spine-fill)] shadow-[var(--hairline)]"
    />
  )
}
