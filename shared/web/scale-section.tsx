"use client"

// HOW BIG THE APP IS — one row on Settings · Appearance's row layout, a
// specimen chip on every pill.
//
// A ROW, NOT A CARD-COLUMN ENTRY — 22 SEP 2026, THE SIDE-BY-SIDE ARTIFACT SHE
// PICKED. The preview-led layout (below, kept as the historical record) drew
// this as a compact pill group under its own micro-label, beside one shared
// live preview. She rejected the pre-visualisation outright ("i dont like
// how to previsualize") and, over a fresh side-by-side artifact, picked
// option one and asked for more: "i want each card to have some kind of
// preview (also for font size)" and named the shape for THIS control
// specifically: "do a speciment chip". `shared/web/appearance-panel.tsx` now
// draws the row furniture (the name, the short line, the layout) — this file
// draws only the pills, each one carrying a specimen: the same two letters,
// `Aa`, set at the size that OPTION actually sells, through `ScaleSwatch`
// below. No heading, no box, no live preview elsewhere on the page to carry
// the argument instead — every option previews itself now.
//
// APPLIES AT ONCE, ON PRESS — THE SAME RULING, OVER THE WHOLE TAB. "Let's go
// back to when clicking it gets implemented (without needing to save)." The
// pending/Save contract two rulings below installed is gone again: this file
// holds no state and calls neither `applyScale` nor a `save` door — it never
// did either, even mid-2026-09-14 to 22 Sep 2026 — `AppearancePanel` is the
// one place that owns "what is showing right now" and reaches for both, the
// instant a pill is pressed, with no staging step between the two.
//
// `applyScale` SURVIVES, EXPORTED. It is still the one function that puts a
// scale on the document (`web/components/shell/app-shell.tsx` calls it on
// load, from the person's saved preference, and `AppearancePanel` calls it
// again, optimistically, the instant a pill is pressed).
//
// ═══════════════════ THE PREVIEW-LED HISTORY (superseded) ═══════════════════
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
// STAGED, SAME DAY, SECOND RULING (REVERSED 22 SEP 2026, ABOVE). "We need …
// some kind of save button so that I can first preview it and, once I'm
// happy with what I see, implement it across the app." This component used
// to be OPTIMISTIC — a press resized the whole app immediately (`applyScale`
// on `<html>`) and the save followed, reverting the size if it failed. That
// contract went, briefly, to a plain controlled pill row fed a PENDING value
// from `AppearancePanel`'s own Save button — and is gone again now, back to
// (a version of) the original: optimistic, immediate, reverted on failure,
// just owned by the panel rather than by this file.

import * as React from "react"

import { AppearancePillGroup, ScaleSwatch, type AppearancePillOption } from "./appearance-pill-group"
import { SCALE_STEPS, scaleFontSize } from "../scale"
import { useLanguage } from "./language"

/** Put the size on the document. One place, called by the provider on load and
 * by `AppearancePanel` on Save, so the screen and the stored preference can
 * never be two different sizes for longer than one request. */
export function applyScale(value: string | null | undefined, door: "agency" | "portal"): void {
  if (typeof document === "undefined") return
  document.documentElement.style.fontSize = `${scaleFontSize(value, door)}px`
}

/** `SCALE_STEPS`' own order maps positionally onto the three steps
 * `ScaleSwatch` draws: only the WORD and the specimen size move, `value`
 * stays `SCALE_STEPS[*].value`, which this app has stored since before the
 * card row existed (`"compact" | "comfortable" | "large"`, not the kit's own
 * `"default"` middle key). A value this build does not recognise reads as the
 * middle step, matching `shared/scale.ts`'s own `toScale` fallback.
 * FILE-PRIVATE — no `export` any more (22 Sep 2026, `dead-exports.test.ts`'s
 * own fix): the only caller left, `AppearancePanel`'s retired live preview,
 * is deleted; this file is the only one left that needs the mapping, to draw
 * each of its own three options' specimen chips. */
function previewScaleStep(value: string | null | undefined): "compact" | "default" | "large" {
  const index = SCALE_STEPS.findIndex((s) => s.value === value)
  return index === 0 ? "compact" : index === 2 ? "large" : "default"
}

export function ScaleSection({
  /** The CURRENT step — `AppearancePanel`'s own state, applied to the
   * document the instant it changes. This file never touches the document
   * itself; it only reports which pill was pressed. */
  value,
  /** A different pill was pressed. The panel applies it at once — see its
   * own header. */
  onChange,
  /** True while `AppearancePanel`'s own write for THIS control is in flight. */
  disabled = false,
}: {
  value: string
  onChange: (next: string) => void
  disabled?: boolean
}) {
  const { t } = useLanguage()

  // PILLS: the specimen chip is the picture now — her own words, "do a
  // speciment chip" — the same two letters set at the size that option
  // sells, through `ScaleSwatch`. `previewScaleStep` maps each option's own
  // stored value onto its own step positionally, the identical mapping it
  // always made; only who calls it moved.
  const options: readonly AppearancePillOption[] = [
    { value: SCALE_STEPS[0].value, label: t("Compact"), swatch: <ScaleSwatch step={previewScaleStep(SCALE_STEPS[0].value)} /> },
    { value: SCALE_STEPS[1].value, label: t("Regular"), swatch: <ScaleSwatch step={previewScaleStep(SCALE_STEPS[1].value)} /> },
    { value: SCALE_STEPS[2].value, label: t("Large"), swatch: <ScaleSwatch step={previewScaleStep(SCALE_STEPS[2].value)} /> },
  ]

  return (
    <AppearancePillGroup
      options={options}
      value={value}
      disabled={disabled}
      onValueChange={onChange}
      ariaLabel={t("Size")}
    />
  )
}
