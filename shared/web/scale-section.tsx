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
// STAGED, SAME DAY, SECOND RULING. "We need … some kind of save button so
// that I can first preview it and, once I'm happy with what I see, implement
// it across the app." This component used to be OPTIMISTIC — a press resized
// the whole app immediately (`applyScale` on `<html>`) and the save followed,
// reverting the size if it failed. That contract is gone: this file no
// longer holds any state, calls `applyScale`, calls `save`, or shows a toast.
// It is now a plain, controlled pill row — `value` is the PENDING step,
// `onChange` asks `AppearancePanel` to hold a different one — and the panel
// is the one place that seeds the pending step from the person's saved row,
// calls `applyScale` and the `save` prop it is handed, and shows the result,
// all on Save. See that file's own header for the fuller account.
//
// `onChosenChange` IS GONE. It existed to tell the shared preview what was
// chosen the instant a card was pressed, before the save settled. Now that
// this component takes its pending value as a controlled `value` prop, the
// panel already has that value the moment it changes state — there is
// nothing left for a callback to forward.
//
// `applyScale` SURVIVES, EXPORTED, BUT NO LONGER CALLED FROM THIS FILE. It is
// still the one function that puts a scale on the document
// (`web/components/shell/app-shell.tsx` calls it on load, from the person's
// SAVED preference) and `AppearancePanel` now calls it too, once, on Save —
// never from a press in this file any more.

import * as React from "react"

import { AppearancePillGroup, type AppearancePillOption } from "./appearance-pill-group"
import { SCALE_STEPS, scaleFontSize } from "../scale"
import { useLanguage } from "./language"

/** Put the size on the document. One place, called by the provider on load and
 * by `AppearancePanel` on Save, so the screen and the stored preference can
 * never be two different sizes for longer than one request. */
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
  /** The PENDING step — `AppearancePanel`'s own state, not this component's.
   * Never applied to the document by this file any more. */
  value,
  /** A different card was pressed. The panel decides what happens next —
   * update the pending value, and nothing else, until Save. */
  onChange,
  /** True while `AppearancePanel`'s own Save is in flight — frozen for the
   * same reason a `saving` press used to freeze this row, just decided one
   * level up now that the commit is the panel's, not this row's. */
  disabled = false,
}: {
  value: string
  onChange: (next: string) => void
  disabled?: boolean
}) {
  const { t } = useLanguage()

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
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        ariaLabel={t("Size")}
      />
    </div>
  )
}
