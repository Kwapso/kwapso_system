"use client"

// THE PREVIEW-LED APPEARANCE PANEL — one live picture of the app, compact
// controls beside it, for Size, Appearance and Background.
//
// THE RULING, 2026-09-14. A lane put four Settings · Appearance layouts in
// front of the client — the shape the tab has drawn since 11 Sep, two
// denser alternatives, and this one — and she picked this one, in her own
// words: "for the settings design use preview led — put language first
// (remove subtitle …) Represent in the preview better the background
// (currently it's the old coloured navbar only). Create a new component in
// ui-ux if needed for this." Four instructions, four things this file (and
// the two it composes with) is:
//
//   1. PREVIEW-LED. Twelve small option pictures — three each on Size,
//      Appearance and Background — become one shared `AppearancePreview`
//      (`shared/ui/compositions/screens/settings.tsx`, kit v1.2.77) beside
//      compact controls (`ScaleSection`, `ThemeSection`, `SpineSection`, each
//      trimmed of its own picture and its own box — see those three files'
//      own headers).
//   2. LANGUAGE FIRST — done one level up, in `settings-screen.tsx`, which
//      renders `<LanguageSection>` before this panel. Nothing here decides
//      that order; this file is Size/Appearance/Background only, same three
//      settings it always was.
//   3. NO SUBTITLE — `language-section.tsx`'s own change; unrelated to this
//      file except that it is the same ruling.
//   4. A NEW KIT COMPONENT — `AppearancePreview`. `SpinePicture` (the kit's
//      existing Background picture) is a 44px rail swatch; it was never
//      built to carry the argument `screen-shell.tsx`'s own 2026-09-02
//      reshape makes — the spine is the ground the WHOLE window stands on,
//      not a stripe down one edge — so a picture that actually shows that
//      was the kit's to build, not this app's: `AppearanceOptionGroup`,
//      `ThemePicture`, `ScalePicture` and `SpinePicture` already lived in the
//      kit for exactly this screen, and a richer preview is the same kind of
//      part. Built in `Kwapso/kwapso-ui-ux`, tagged v1.2.77, pulled with
//      `scripts/sync-design.mjs` — see that repo's CHANGELOG.md entry (and
//      this repo's own lane report) for the round trip.
//
// WHY THE PREVIEW NEEDS THREE RESOLVED VALUES, LIVE. `AppearancePreview`
// takes `theme` ("light"/"dark", already resolved — never "system": a
// picture has no clock), `spine` and `scale`, and is pure and prop-driven —
// no internal state of its own. The three CONTROLS below it each keep their
// own state (the optimistic-then-persisted contract each file's own header
// argues for), so this panel is the one place that LISTENS: each control
// reports its resting value up through an `onChosenChange` / `onResolvedChange`
// callback, fired on mount and on every press, and this panel mirrors that
// into the props the preview reads. Nothing here owns a save; every save is
// still the control's own.
//
// LANGUAGE IS NOT IN THIS PANEL, on purpose — `AppearancePreview`'s own
// header states why: it draws Size, Appearance and Background because those
// three are visual states a picture can show; a language has no visual
// analogue to preview (the picture would have to draw prose in a script the
// reader may not read), so it keeps its own plain control, first on the tab,
// in its own box.

import * as React from "react"

import { AppearancePreview } from "@shared/ui/compositions/screens/settings"

import { ScaleSection, previewScaleStep } from "./scale-section"
import { ThemeSection } from "./theme-section"
import { SpineSection } from "./spine-section"
import { toSpine, type Spine } from "../spine"
import { useLanguage } from "./language"
import { SettingsSection } from "./settings-section"

export function AppearancePanel({
  /** what the person currently reads at, from their own session row */
  scaleValue,
  /** Persist the scale choice. The agency app passes its own `auth.setScale`. */
  saveScale,
  /** what the rail paints today, from the person's own session row */
  spineValue,
  /** Persist the spine choice. */
  saveSpine,
}: {
  scaleValue: string | null
  saveScale: (scale: string) => Promise<unknown>
  spineValue: string | null
  saveSpine: (spine: Spine) => Promise<unknown>
}) {
  const { t } = useLanguage()

  // Mirrors of each control's own resting value, for the preview alone — the
  // controls below stay the source of truth for what is actually saved.
  const [previewScale, setPreviewScale] = React.useState(scaleValue)
  const [previewTheme, setPreviewTheme] = React.useState<"light" | "dark">("light")
  const [previewSpine, setPreviewSpine] = React.useState<Spine>(toSpine(spineValue))

  return (
    <SettingsSection title={t("Appearance")}>
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <AppearancePreview
          theme={previewTheme}
          spine={previewSpine}
          scale={previewScaleStep(previewScale)}
          className="lg:sticky lg:top-4"
        />
        <div className="flex flex-col gap-5">
          <ScaleSection value={scaleValue} save={saveScale} onChosenChange={setPreviewScale} />
          <ThemeSection onResolvedChange={setPreviewTheme} />
          <SpineSection value={spineValue} save={saveSpine} onChosenChange={setPreviewSpine} />
        </div>
      </div>
    </SettingsSection>
  )
}
