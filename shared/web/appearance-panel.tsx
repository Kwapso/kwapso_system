"use client"

// THE PREVIEW-LED APPEARANCE PANEL — ONE container, four sections: Language,
// Size, Appearance, Background. A live picture beside the last three; the
// first has nothing for the picture to show, so it sits above the other
// three in the same compact control column.
//
// THE RULING, 2026-09-14, IN TWO PARTS THE SAME DAY. First: a lane put four
// Settings · Appearance layouts in front of the client and she picked
// preview-led, in her own words: "for the settings design use preview led —
// put language first (remove subtitle …) Represent in the preview better the
// background (currently it's the old coloured navbar only). Create a new
// component in ui-ux if needed for this." That shipped as TWO containers —
// Language in its own box above a second box holding the preview and the
// other three — and she corrected it once she saw it live: "What I meant by
// language first was inside the container, just to make it the top section:
// Language · Size · Appearance · Background." One container, four sections,
// in that order. This file now owns all four; `settings-screen.tsx` mounts
// only `<AppearancePanel>` on this tab.
//
//   1. PREVIEW-LED. Twelve small option pictures — three each on Size,
//      Appearance and Background — become one shared `AppearancePreview`
//      (`shared/ui/compositions/screens/settings.tsx`, kit v1.2.77) beside
//      compact controls (`ScaleSection`, `ThemeSection`, `SpineSection`, each
//      trimmed of its own picture and its own box — see those three files'
//      own headers).
//   2. LANGUAGE FIRST, INSIDE THE ONE CONTAINER. `LanguageSection`
//      (`shared/web/language-section.tsx`) lost its own `SettingsSection` the
//      same way `ScaleSection` et al. already had — a bare micro-label plus
//      its control — and is the first thing in the control column below,
//      above `ScaleSection`. NOT above the preview row: the preview only
//      pictures Size/Appearance/Background, so putting Language above the
//      whole grid would draw it as a different KIND of thing from its three
//      neighbours (a full-width band versus a card-column entry), which is a
//      layout choice she did not ask for — her own list is a flat run of
//      four, the shape the column already had for three. The sticky preview
//      is unaffected either way; it does not react to Language and did not
//      react to Size/Appearance/Background moving beneath it before either.
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
//      part. Built in `Kwapso/kwapso-ui-ux`, tagged v1.2.77, then reworked in
//      v1.2.78 after the client saw it live and called it "shit" beside a
//      reference she liked better — see that repo's CHANGELOG.md and this
//      repo's own lane report for both round trips.
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
// still the control's own — Language's included, now that it saves through
// this panel too.

import * as React from "react"

import { AppearancePreview } from "@shared/ui/compositions/screens/settings"

import { ScaleSection, previewScaleStep } from "./scale-section"
import { ThemeSection } from "./theme-section"
import { SpineSection } from "./spine-section"
import { LanguageSection } from "./language-section"
import { toSpine, type Spine } from "../spine"
import { useLanguage } from "./language"
import { type Language } from "../i18n"
import { SettingsSection } from "./settings-section"

export function AppearancePanel({
  /** Persist the language choice. Both apps pass their own `auth.setLanguage`. */
  saveLanguage,
  /** what the person currently reads at, from their own session row */
  scaleValue,
  /** Persist the scale choice. The agency app passes its own `auth.setScale`. */
  saveScale,
  /** what the rail paints today, from the person's own session row */
  spineValue,
  /** Persist the spine choice. */
  saveSpine,
}: {
  saveLanguage: (lang: Language) => Promise<unknown>
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
          {/* LANGUAGE, FIRST — her correction, verbatim in the header above:
              "Language · Size · Appearance · Background", inside this one
              column, not a full-width band over the grid. */}
          <LanguageSection save={saveLanguage} />
          <ScaleSection value={scaleValue} save={saveScale} onChosenChange={setPreviewScale} />
          <ThemeSection onResolvedChange={setPreviewTheme} />
          <SpineSection value={spineValue} save={saveSpine} onChosenChange={setPreviewSpine} />
        </div>
      </div>
    </SettingsSection>
  )
}
