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
// THREE, CUT TO TWO, THEN REVERSED BACK TO THREE. v1.2.28 (2026-09-02) cut
// `ink` and `paper` to one muted rail, `quiet`, the same day the client ruled
// "default spine to mango, but everyone can change it during the onboarding
// or anytime at settings" (that half of the ruling is untouched — see
// shared/spine.ts). The client then reversed the cut, verbatim, 2026-09-03:
// "you know, i changed my mind. i want to go back to the 3 options (sorry)"
// — and explained why, which is the point of the reversal: "my goal is that
// in light i can choose to have a 'dark' background option". Appearance
// decides light or dark; Background decides the colour behind everything;
// Ink is how a person running a LIGHT app gets a dark window.
//
// THE CARDS ARE THE KIT'S OWN, not reinvented. `AppearanceOptionGroup` is
// `compositions/screens/settings.tsx`'s own sub-primitive — COMPOSITION-
// MISMATCHES.md names it reusable standalone: the ROUTE around it
// (`SettingsRoute`, its six-tab shape) is what this app has deliberately not
// adopted, never this part.
//
// OPTIMISTIC, THEN PERSISTED — `ScaleSection`'s own shape, copied rather than
// reinvented. A card presses, the choice is live immediately (app-shell.tsx
// reads this same preference off `active.user.spine` and repaints the rail on
// its next render), and the save follows; if it fails the choice reverts and
// says so. It lives on the person's own row for the same reason scale does
// (UI-RULEBOOK S4's argument, one preference along). MANGO is the fallback
// (shared/spine.ts) since the client's ruling of 2026-09-02.
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

import { toast } from "@shared/ui/components/sonner/sonner"
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
    {
      value: "mango",
      label: t("Mango"),
      description: t("Warm colour behind the whole app. Easy to find your place."),
      picture: <SpinePicture spine="mango" />,
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
    {
      value: "mango",
      label: t("Mango"),
      description: t("Warm, and easy to find."),
      picture: <SpinePicture spine="mango" />,
    },
  ]

  /* COMPACT: the artifact's tidy pill row, not the kit's card grid — same
     three names and the same order, no picture and no description (Settings
     · Appearance's own shared preview carries that argument now), but a
     swatch survives (her own "also in appearance add colors (like in
     background)" names this group as the reference). Never used by
     onboarding, which passes no `compact`. */
  const compactOptions: readonly AppearancePillOption[] = [
    { value: "ink", label: t("Ink"), swatch: <SpineSwatch spine="ink" /> },
    { value: "paper", label: t("Paper"), swatch: <SpineSwatch spine="paper" /> },
    { value: "mango", label: t("Mango"), swatch: <SpineSwatch spine="mango" /> },
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
  /** what the rail paints today, from the person's own session row */
  value,
  /** Persist the choice. The agency app passes its own `auth.setSpine`. */
  save,
  /** Told the resting value on mount and again on every press, so the
   * shared preview beside this group is never a frame behind it. */
  onChosenChange,
}: {
  value: string | null
  save: (spine: Spine) => Promise<unknown>
  onChosenChange?: (value: Spine) => void
}) {
  const { t } = useLanguage()

  // Local, exactly as ScaleSection keeps its own: the card answers instantly,
  // the session row catches up when `me` is re-read.
  const [chosen, setChosen] = React.useState<Spine>(toSpine(value))
  const [saving, setSaving] = React.useState<Spine | null>(null)
  React.useEffect(() => setChosen(toSpine(value)), [value])

  React.useEffect(() => onChosenChange?.(chosen), [chosen, onChosenChange])

  async function choose(nextSpine: Spine) {
    if (nextSpine === chosen || saving) return
    const previous = chosen
    setChosen(nextSpine)
    setSaving(nextSpine)
    try {
      await save(nextSpine)
      toast.success(t("Background changed."))
    } catch {
      setChosen(previous)
      toast.error(t("That didn't save. Try again."))
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-muted-foreground text-micro uppercase">{t("Background")}</h3>
      <SpineChoice
        value={chosen}
        disabled={saving !== null}
        onChange={(next) => void choose(next)}
        badgeLabel={t("In use")}
        compact
      />
    </div>
  )
}
