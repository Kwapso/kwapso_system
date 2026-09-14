"use client"

// HOW BIG THE APP IS — a compact card row, beside the shared Appearance
// preview rather than carrying its own picture.
//
// PREVIEW-LED, CLIENT RULING 2026-09-14. She chose the preview-led layout of
// four Settings · Appearance options a lane put in front of her: one live
// `AppearancePreview` (`shared/ui/compositions/screens/settings.tsx`, kit
// v1.2.77) beside compact controls, replacing twelve small option pictures
// with one shared preview that is always current. This section used to draw
// its own `SettingsSection` box and a `ScalePicture` on every card; both are
// gone — the box is now the shared panel's (`shared/web/appearance-panel.tsx`)
// and the picture's job is the live preview's, which shows the SAME
// mechanism (one root font size, nothing added or removed) at a size worth
// looking at instead of three 58px thumbnails.
//
// `onChosenChange` IS NEW AND IS THE WHOLE POINT: the preview beside this
// group has to know what is chosen the instant a card is pressed, before the
// save round-trip settles — the same "instant, then persisted" contract this
// file already keeps for the person pressing the card, extended one level up
// so the picture is never a frame behind the control that drives it.
//
// OPTIMISTIC, THEN PERSISTED, exactly as before. A card presses, the size
// resizes instantly and the save follows; if the save fails the size snaps
// back and says so. The preference lives on the person's own row, so it
// follows them between devices rather than living in one browser
// (UI-RULEBOOK S4), and it is the ONLY way to make this app bigger, because
// the viewport is locked against pinch-zoom (S5).

import * as React from "react"

import { toast } from "@shared/ui/components/sonner/sonner"

import { AppearancePillGroup, type AppearancePillOption } from "./appearance-pill-group"
import { SCALE_STEPS, scaleFontSize } from "../scale"
import { useLanguage } from "./language"

/** Put the size on the document. One place, called by the provider on load and
 * by a click before the save, so the screen and the stored preference can never
 * be two different sizes for longer than one request. */
export function applyScale(value: string | null | undefined, door: "agency" | "portal"): void {
  if (typeof document === "undefined") return
  document.documentElement.style.fontSize = `${scaleFontSize(value, door)}px`
}

/** `SCALE_STEPS`' own order maps positionally onto the preview's three steps
 * — `AppearancePreview`'s own header states the same convention `ScalePicture`
 * already used: only the WORD and the picture move, `value` stays
 * `SCALE_STEPS[*].value`, which this app has stored since before the card row
 * existed (`"compact" | "comfortable" | "large"`, not the kit's own
 * `"default"` middle key). A value this build does not recognise reads as the
 * middle step, matching `shared/scale.ts`'s own `toScale` fallback. */
export function previewScaleStep(value: string | null | undefined): "compact" | "default" | "large" {
  const index = SCALE_STEPS.findIndex((s) => s.value === value)
  return index === 0 ? "compact" : index === 2 ? "large" : "default"
}

export function ScaleSection({
  /** what the person currently reads at, from their own session row */
  value,
  /** Persist the choice. The agency app passes its own `auth.setScale`. */
  save,
  /** which front door's baseline the steps mean */
  door = "agency",
  /** Told the resting value on mount and again on every press, so the
   * shared preview beside this group is never a frame behind it. */
  onChosenChange,
}: {
  value: string | null
  save: (scale: string) => Promise<unknown>
  door?: "agency" | "portal"
  onChosenChange?: (value: string) => void
}) {
  const { t } = useLanguage()
  // The chosen step is local so the buttons answer instantly; the session row
  // catches up when `me` is re-read. Seeded from the session, and re-seeded if
  // another device changes it while this tab is open.
  const [chosen, setChosen] = React.useState(value)
  const [saving, setSaving] = React.useState<string | null>(null)
  React.useEffect(() => setChosen(value), [value])

  const resting = chosen ?? SCALE_STEPS[1].value
  React.useEffect(() => onChosenChange?.(resting), [resting, onChosenChange])

  async function choose(next: string) {
    if (next === chosen || saving) return
    const previous = chosen
    setChosen(next)
    applyScale(next, door)
    setSaving(next)
    try {
      await save(next)
      toast.success(t("Size changed."))
    } catch {
      setChosen(previous)
      applyScale(previous, door)
      toast.error(t("That didn't save. Try again."))
    } finally {
      setSaving(null)
    }
  }

  // PILLS: no picture, no per-option description, no swatch — the live
  // preview beside this group carries the picture and Size has no colour of
  // its own to show. Only the label and the pressed ring survive.
  const options: readonly AppearancePillOption[] = [
    { value: SCALE_STEPS[0].value, label: t("Compact") },
    { value: SCALE_STEPS[1].value, label: t("Regular") },
    { value: SCALE_STEPS[2].value, label: t("Large") },
  ]

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-muted-foreground text-micro uppercase">{t("Size")}</h3>
      <AppearancePillGroup
        options={options}
        value={resting}
        disabled={saving !== null}
        onValueChange={(next) => void choose(next)}
        ariaLabel={t("Size")}
      />
    </div>
  )
}
