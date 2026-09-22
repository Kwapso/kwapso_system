"use client"

// THE APP'S BACKGROUND — a compact card row in Settings, beside the shared
// Appearance preview; still the full picture+description cards on
// onboarding, which this pass does not touch.
//
// PREVIEW-LED, CLIENT RULING 2026-09-14. She chose the preview-led layout of
// four Settings · Appearance options a lane put in front of her, and ruled on
// the one thing wrong with the layout it replaces: "Represent in the preview
// better the background (currently it's the old coloured navbar only)." The
// picture that used to carry this argument, `SpinePicture`, is a 44px
// `THUMB_RAIL` swatch — never built to show what the setting actually does
// since `screen-shell.tsx`'s 2026-09-02 reshape: the spine is the ground the
// WHOLE window stands on, not a stripe down one edge. `AppearancePreview`
// (`shared/ui/compositions/screens/settings.tsx`, kit v1.2.77) draws that
// hierarchy — ground, rail, floating card, panel, row — and is the shared
// preview beside this group now; the three cards below carry only the name
// and the ring.
//
// THREE, CUT TO TWO, THEN REVERSED BACK TO THREE, THEN CUT TO TWO AGAIN.
// v1.2.28 (2026-09-02) cut `ink` and `paper` to one muted rail, `quiet`, the
// same day the client ruled "default spine to mango, but everyone can change
// it during the onboarding or anytime at settings" (that half of the ruling
// is untouched — see shared/spine.ts). The client then reversed the cut,
// verbatim, 2026-09-03: "you know, i changed my mind. i want to go back to
// the 3 options (sorry)" — and explained why, which is the point of the
// reversal: "my goal is that in light i can choose to have a 'dark'
// background option". Appearance decides light or dark; Background decides
// the colour behind everything; Ink is how a person running a LIGHT app gets
// a dark window.
//
// MANGO RETIRED, 22 SEP 2026 — the client, ruling on the Appearance settings
// redesign: "reduce backgorund options to only balck or paper (rmoeve
// mango)." Two options now, not three: `settingsOptions`, `onboardingOptions`
// and `compactOptions` below each drop their `mango` entry, matching
// `shared/spine.ts`'s own `SPINE_VALUES`, which this file's allow-list has
// always had to agree with (`toSpine` below coerces anything else). See that
// file's header for the fallback (moved to `paper`) and for why a stored
// `mango` row needs no migration of its own.
//
// THE CARDS ARE THE KIT'S OWN, not reinvented. `AppearanceOptionGroup` is
// `compositions/screens/settings.tsx`'s own sub-primitive — COMPOSITION-
// MISMATCHES.md names it reusable standalone: the ROUTE around it
// (`SettingsRoute`, its six-tab shape) is what this app has deliberately not
// adopted, never this part.
//
// STAGED, NOT OPTIMISTIC, CLIENT RULING 2026-09-14. `SpineSection` used to be
// optimistic — a card pressed, the choice held locally, `save` fired, and the
// choice reverted on failure. That is gone from THIS component (the compact
// Settings · Appearance one): "we need … some kind of save button so that I
// can first preview it and, once I'm happy with what I see, implement it
// across the app." `SpineSection` no longer owns any state, calls `save`, or
// shows a toast — it is a plain, controlled pill row exactly like
// `ScaleSection`/`ThemeSection` now are. `value` is the PENDING spine,
// `onChange` asks `AppearancePanel` to hold a different one, and the panel is
// the one place that seeds the pending spine from the person's saved row and
// calls the `save` prop it is handed, on Save — which is also the moment the
// app-wide repaint happens (`app-shell.tsx` reads `active.user.spine`, and
// the panel's own `saveSpine` already refreshes it; see that file's header).
// THE FALLBACK IS `paper` NOW (shared/spine.ts) — moved off mango the day
// mango stopped being a choice (22 Sep 2026); see that file's header for why.
// `SpineChoice`, below, is unchanged in shape — onboarding still owns its own
// submit and was never part of either ruling.
//
// RENAMED FROM "Sidebar" TO "Background", client instruction — untouched by
// this pass; see the git history on this file for the fuller account.
//
// THE CARDS ARE DRAWN IN TWO PLACES, FROM ONE `SpineChoice`, AND THEY NOW
// DISAGREE ABOUT MORE THAN CAPTION LENGTH. Onboarding
// (`web/app/onboarding/page.tsx`) keeps the full picture+description cards —
// it has no live app preview beside it to carry that argument instead, and
// this pass is Settings · Appearance only. `SpineChoice`'s new `compact`
// prop is what lets the two keep disagreeing about PICTURE, same as `short`
// already lets them disagree about caption LENGTH, while staying unable to
// disagree about the names, the values or the order.

import * as React from "react"

import { AppearanceOptionGroup, SpinePicture, type AppearanceOption } from "@shared/ui/compositions/screens/settings"

import { AppearancePillGroup, SpineSwatch, type AppearancePillOption } from "./appearance-pill-group"
import { toSpine, type Spine } from "../spine"
import { useLanguage } from "./language"

/** THE CARDS AND NOTHING ELSE — no heading, no save.
 *
 * Both places a person picks a spine draw this: Settings · Appearance through
 * `SpineSection` below, and the onboarding screen. It is a CONTROLLED control
 * and it persists nothing, because the two callers disagree about when the
 * choice is saved — Settings saves on press and can revert a failure,
 * onboarding folds it into the one submit that also writes the name. What
 * they must NOT disagree about is the names, the values and the order; what
 * they MAY disagree about is caption length (`short`) and, since the
 * preview-led redesign, whether the card carries its own picture at all
 * (`compact` — Settings' shared `AppearancePreview` carries that argument
 * for it now; onboarding has no preview beside it and keeps the picture). */
export function SpineChoice({
  /** the spine the cards show as set */
  value,
  /** a different card was pressed */
  onChange,
  /** nothing may be changed (a save in flight, a form busy) */
  disabled = false,
  /** 26.05 draws "In use" on the set card; 27.14 draws "Picked" in onboarding */
  badgeLabel,
  /** onboarding's captions — `compositions/screens/onboarding.tsx`'s own
   * shorter SPINES, verbatim, not settings.tsx's longer ones truncated here. */
  short = false,
  /** Settings · Appearance only: no picture, no description — the shared
   * `AppearancePreview` beside this group carries that argument instead. */
  compact = false,
  className,
}: {
  value: Spine
  onChange: (spine: Spine) => void
  disabled?: boolean
  badgeLabel: React.ReactNode
  short?: boolean
  compact?: boolean
  className?: string
}) {
  const { t } = useLanguage()

  /* settings.tsx's own Background cards, verbatim — transcribed from its
     SPINES, the words this app has not adopted the route to draw itself. */
  const settingsOptions: readonly AppearanceOption[] = [
    {
      value: "ink",
      label: t("Ink"),
      description: t("A dark background of its own, whatever your light or dark setting is."),
      picture: <SpinePicture spine="ink" />,
    },
    {
      value: "paper",
      label: t("Paper"),
      description: t("A calm, light background that lets the work stand out."),
      picture: <SpinePicture spine="paper" />,
    },
  ]

  /* onboarding.tsx's own shorter Background cards, verbatim — transcribed
     from its own SPINES, same names and pictures, fewer words. */
  const onboardingOptions: readonly AppearanceOption[] = [
    {
      value: "ink",
      label: t("Ink"),
      description: t("Dark, whatever your theme."),
      picture: <SpinePicture spine="ink" />,
    },
    {
      value: "paper",
      label: t("Paper"),
      description: t("Calm, and out of the way."),
      picture: <SpinePicture spine="paper" />,
    },
  ]

  /* COMPACT: the artifact's tidy pill row, not the kit's card grid — same
     two names and the same order Settings' own row layout uses, no picture
     and no description, but a swatch survives (her own "also in appearance
     add colors (like in background)" names this group as the reference) —
     the REAL ink and paper colours now carry the whole preview argument.
     Never used by onboarding, which passes no `compact`. */
  const compactOptions: readonly AppearancePillOption[] = [
    { value: "ink", label: t("Ink"), swatch: <SpineSwatch spine="ink" /> },
    { value: "paper", label: t("Paper"), swatch: <SpineSwatch spine="paper" /> },
  ]

  if (compact) {
    return (
      <AppearancePillGroup
        className={className}
        options={compactOptions}
        value={value}
        disabled={disabled}
        onValueChange={(next) => onChange(toSpine(next))}
        ariaLabel={t("Background")}
      />
    )
  }

  return (
    <AppearanceOptionGroup
      className={className}
      options={short ? onboardingOptions : settingsOptions}
      value={value}
      disabled={disabled}
      onValueChange={(next) => onChange(toSpine(next))}
      badgeLabel={badgeLabel}
    />
  )
}

export function SpineSection({
  /** The CURRENT spine — `AppearancePanel`'s own state, applied through its
   * `saveSpine` door the instant it changes. This file never calls that door
   * itself; it only reports which pill was pressed. */
  value,
  /** A different pill was pressed. The panel applies it at once. */
  onChange,
  /** True while `AppearancePanel`'s own write for THIS control is in flight. */
  disabled = false,
}: {
  value: Spine
  onChange: (next: Spine) => void
  disabled?: boolean
}) {
  const { t } = useLanguage()

  return <SpineChoice value={value} disabled={disabled} onChange={onChange} badgeLabel={t("In use")} compact />
}
