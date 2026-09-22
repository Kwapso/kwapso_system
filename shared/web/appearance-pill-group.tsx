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

import { type BadgeDot } from "@shared/ui/components/badge/badge"
import { ThemeSwatch } from "@shared/ui/compositions/screens/settings"
import { cn } from "@shared/ui/lib/utils"
import { useLanguage } from "./language"

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
  /** THE STATUS/STAGE TONE DOT — client ruling, 18 Sep 2026, verbatim:
   * "everywhere where choice component is status/stage add the points."
   * `Badge variant="status"` draws this same dot (`shared/ui/components/
   * badge/badge.tsx`'s `BadgeDot`, ten named tones); this row is a bare
   * `<button>`, never a `Badge`, so the dot is drawn here instead, at the
   * same size and shape, through `--dot-status`/`--dot-<tone>` (R32 — a
   * token, never a hex).
   *
   * NEVER A SECOND MAP: a caller hands over the tone a status/stage ALREADY
   * resolves to through its own existing map — `appStageDotTone`
   * (shared/app-stages.ts) for App stage, the one live caller today — the
   * same function the record's own LIST already reads for its `Badge`.
   * Mutually exclusive with `swatch` in practice (a status/stage pill has no
   * separate colour mark to carry); `swatch` wins if a caller somehow sets
   * both, drawn first either way. */
  dot?: BadgeDot | null
  /** THIS ONE PILL is inert — never a real choice, only a truthful account of
   * what is already stored. Added 16 Sep 2026 for a record whose value has
   * fallen out of its own vocabulary (an app stage a migration retired): the
   * pill still SHOWS the word rather than hiding it (a picker that silently
   * dropped the stored value would look like the record had none), but a
   * click on it does nothing — the same "no dead-end empty state" instinct
   * the client's own "kill the Nobody option" ruling carries, read for a
   * value rather than an absence. Independent of the group's own `disabled`
   * (a busy form), so one stale pill can be inert while every live one stays
   * pickable. */
  disabled?: boolean
}

export function AppearancePillGroup({
  id,
  options,
  value,
  onValueChange,
  disabled = false,
  ariaLabel,
  "aria-describedby": ariaDescribedby,
  className,
}: {
  /** THE FIELD'S OWN ID - never invented here. The kit `Field`
   * (`shared/ui/components/field/field.tsx`) mints an id from its `htmlFor`
   * prop and CLONES it onto its single child alongside `aria-describedby`;
   * a component that does not declare the prop simply drops what was
   * cloned onto it, which is what left a `<label htmlFor="sprint-type">`
   * pointing at nothing (live defect, proved 20 Sep 2026, `sprint-form-
   * dialog.tsx`'s own Type field). Landed on the row itself, the same node
   * `role="radiogroup"` sits on - the label of an ARIA `radiogroup` is
   * every bit as reachable through `htmlFor`/`id` as an `<input>`'s. */
  id?: string
  options: readonly AppearancePillOption[]
  /** Which one is set. */
  value: string
  /** A different pill was pressed. */
  onValueChange?: (value: string) => void
  disabled?: boolean
  ariaLabel: string
  /** Joined in by the kit `Field` the same way - a help or error line this
   * row's own value announces alongside its label. */
  "aria-describedby"?: string
  className?: string
}) {
  return (
    <div
      id={id}
      role="radiogroup"
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedby}
      className={cn("flex flex-wrap gap-1.5", className)}
    >
      {options.map((option) => {
        const selected = option.value === value
        const inert = disabled || option.disabled === true
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={inert}
            onClick={
              onValueChange === undefined || selected || inert
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
              inert && "cursor-not-allowed opacity-60",
              // Override 33's own ring — the selection mark every option card
              // in this panel already carries, so a pressed pill and a
              // ringed card read as the same state. Replaces the resting
              // hairline rather than stacking with it (one inset shadow).
              selected && "font-[var(--font-weight-medium)] shadow-[var(--hairline-ink)]",
            )}
          >
            {option.swatch ?? (option.dot ? <PillDot tone={option.dot} /> : null)}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

/** THE DOT ITSELF — the same shape `record-picker.tsx`'s own `Swatch` draws
 * for a `RecordPicker` row's status/stage tone (`--dot-status`, the kit's
 * one dot size, `rounded-pill`), kept local here rather than imported: this
 * file is `shared/web/`, and `record-picker.tsx` is app-side (`web/`) —
 * importing "up" out of `shared/` would invert the dependency every other
 * file in this tree keeps one direction. `aria-hidden` for the same reason
 * `Swatch`'s own copy is: the pill's label already says the word the colour
 * repeats. */
function PillDot({ tone }: { tone: BadgeDot }) {
  return (
    <span
      aria-hidden="true"
      className="size-[var(--dot-status)] shrink-0 rounded-pill"
      style={{ background: `var(--dot-${tone})` }}
    />
  )
}

/** Background's own mark, resolved off tokens.css §7b's `[data-spine]`
 * cascade exactly as the kit's own `SpinePicture` reads it
 * (`shared/ui/compositions/screens/settings.tsx`) — never a second copy of
 * the fill per spine. `--radius-sm` (4px, "bars, heat cells, nodes" per
 * tokens.css's own comment): the kit's conformance law reads bare `rounded`
 * more narrowly than R31's own prose allows, so the swatch spells its
 * radius as a token like everything else here. */
export function SpineSwatch({ spine }: { spine: "ink" | "paper" }) {
  return (
    <span
      aria-hidden="true"
      data-spine={spine}
      className="h-3.5 w-3.5 shrink-0 rounded-[var(--radius-sm)] bg-[var(--spine-fill)] shadow-[var(--hairline)]"
    />
  )
}

/** Size's own mark — a SPECIMEN, not a colour swatch. Aurora, 22 Sep 2026,
 * over the side-by-side artifact: "i want each card to have some kind of
 * preview (also for font size) ... do a speciment chip." The same two
 * letters, `Aa`, set at the size that ONE option actually sells — never a
 * fixed box scaled by a picture, the way `SpineSwatch`/`ThemeSwatch` are: a
 * specimen's whole argument is that the pill grows with the text inside it.
 * `--text-micro`/`--text-sm`/`--text-lg` (tokens.css) are the three type
 * steps, never a literal px — the same "read a token, never invent a size"
 * discipline `--radius-sm` and `--font-weight-bold` below already answer to.
 * `bg-surface-panel` gives the chip a ground of its own inside the pill's
 * own `bg-background`, the same paper-step boundary `settings-section.tsx`'s
 * own header names as the kit's first remedy for a boundary, never a stroke. */
export function ScaleSwatch({ step }: { step: "compact" | "default" | "large" }) {
  const { t } = useLanguage()
  const sizeClass = step === "compact" ? "text-micro" : step === "large" ? "text-lg" : "text-sm"
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-surface-panel px-1 leading-none text-foreground font-[var(--font-weight-bold)]",
        sizeClass
      )}
    >
      {t("Aa")}
    </span>
  )
}
