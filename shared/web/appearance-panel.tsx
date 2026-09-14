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
// THE THIRD ROUND, SAME DAY: "appearance display still not right. do it like
// in the artifact." — pointing at the design lane's own comparison page,
// `appearance-layouts.html`, option 3 · "Preview-led". Diagnosed against it
// directly: the artifact's Size/Appearance/Background groups are a tidy
// horizontal row of small pill buttons, never the kit's own card grid
// `AppearanceOptionGroup` draws once a card holds nothing but a word — no
// picture, no description, the live preview above having taken over both
// arguments — which is what read as "loose two-column rows with a floating
// badge". `ScaleSection` / `ThemeSection` / `SpineSection` (its `compact`
// path only; onboarding is untouched) now draw through the new
// `AppearancePillGroup` (`shared/web/appearance-pill-group.tsx`) instead — a
// bare `<button role="radio">` row styled off kit tokens, app-side rather
// than a kit round-trip, because the shape neither the card grid nor a
// hand-rolled toggle already covers is this file's problem to solve, not the
// vendored kit's. The artifact's own caption, "Live preview — updates as you
// press a control", is added under the frame here for the same reason it sat
// under the artifact's mock: nothing in the preview announces itself as
// reactive on its own. AND HER SECOND SENTENCE THE SAME MESSAGE — "also in
// appearance add colors (like in background)" — is `ThemeSwatch`, the same
// file: Light/Dark/System now carry a small colour mark before the word,
// matched to Background's own `SpineSwatch` in size, shape and position,
// through the kit's palette-fixed tokens (`--kw-off-beige` / `--kw-unlit-
// page`), never a hex written here (R32).
//
// WHY THE PREVIEW ITSELF DID NOT MOVE, THEN. `AppearancePreview` already
// carried the artifact's own diagnosis from the previous round — the spine
// ground, the rail, the floating card and the placeholder rows the
// artifact's mock argues for were already drawn there, in lorem. That
// round's complaint was about the CONTROLS beside it, not the picture
// itself. THE PICTURE DID MOVE LATER THE SAME DAY (kit v1.2.81): the client
// looked at the shipped preview again and asked for "the bars on top of the
// preview" removed outright — a fake breadcrumb the kit had tried twice (a
// single grey bar, then two thicker segments) and rejected both times. See
// `AppearancePreview`'s own header in the kit for the full account; nothing
// in this file changed for it, because this file only ever consumed the
// preview's props.
//
// ── SAVE, PREVIEW FIRST — THE SECOND RULING THIS SAME DAY ─────────────────
//
// "We need, in Settings > Appearance, when I'm changing it, to have some
// kind of save button so that I can first preview it and, once I'm happy
// with what I see, implement it across the app." Until this pass every
// control here applied INSTANTLY, app-wide, the moment it was pressed:
// `ScaleSection` resized `<html>`, `ThemeSection` flipped `data-theme` and
// wrote `localStorage`, `SpineSection` called `save` and the rail repainted
// on the next `active.refresh()`. That is gone for three of the four.
//
// SIZE, APPEARANCE AND BACKGROUND ARE NOW PENDING, HELD HERE. `ScaleSection`,
// `ThemeSection` and `SpineSection` no longer own any state, call `save`, or
// touch the document at all — see each file's own header. They are plain
// controlled pill rows now: this panel holds one PENDING value per control
// (`pendingScale` / `pendingTheme` / `pendingSpine`) and one SAVED baseline
// per control (`savedScale` / `savedTheme` / `savedSpine` — what is actually
// live in the app right now), and `AppearancePreview` reads the PENDING
// three. Nothing outside this tab moves until Save: the preview shows what
// pressing a pill would do, and the rest of the app — the real font size,
// the real `data-theme`, the real rail colour — keeps showing the SAVED
// three until she presses it.
//
//   SAVE commits whichever of the three actually changed, in one pass
//   (`handleSave`): `applyScale` + the `saveScale` door for Size,
//   `applyThemeMode` (document + `localStorage`, device-local, cannot fail)
//   for Appearance, and the `saveSpine` door for Background — which already
//   calls `active.refresh()` itself (see `settings-screen.tsx`'s own
//   comment on that prop), the same call that used to fire on every press
//   and now fires once, on Save. A control that failed to save reverts its
//   OWN applied effect (Size's optimistic `applyScale` un-does itself) but
//   NOT its pending value — the pill stays pressed and Save stays enabled,
//   so trying again is one more press rather than re-choosing from scratch.
//
//   DISCARD sets all three pending values back to saved — the preview
//   snaps back to what the app is actually showing, with nothing sent
//   anywhere.
//
//   BOTH ARE INERT WITH NOTHING STAGED (`dirty` false): a Save that does
//   nothing is a lie about state, so the row disables both buttons rather
//   than leaving a press with nothing to commit.
//
//   THE SEAM THAT MOVES IS "WHEN", NEVER "WHERE". Size and Background were
//   already persisted on the person's own session row through `saveScale`/
//   `saveSpine` (`auth.setScale`/`auth.setSpine`, `settings-screen.tsx`);
//   Appearance was already device-local, in `localStorage`. Both seams are
//   reused exactly as they were — this file still calls the same two doors
//   and the same two document/storage functions it always did. The only
//   change is that a press now stages a value instead of calling any of
//   them, and Save is the one place that finally does.
//
// LANGUAGE IS THE FOURTH SECTION AND STAYS INSTANT — A SEPARATE, DIRECT
// RULING, NOT AN OVERSIGHT. The obvious reading of "make the language choice
// also be like the rest" was to stage it too, and that reading was put to
// the client plainly: the preview shows a chip, a title and a lorem body,
// none of which read differently in another language, so staging Language
// would show her nothing changing while she waited to press Save — the one
// control where "preview it first" has nothing to preview. Her answer:
// "keep language instant." So `LanguageSection` (`shared/web/
// language-section.tsx`) is unchanged in behaviour — it still applies and
// persists the instant a pill is pressed, exactly as its `<Select>`
// predecessor did — and it is NOT wired into `dirty`, Save or Discard here:
// picking a language never arms this panel's Save button, and Discard never
// touches it. Item 3 of the SAME ruling ("also, make the language choice
// also be like the rest") is answered on its own, narrower terms:
// `LanguageSection` draws through the identical `AppearancePillGroup` the
// other three use now, flag in the swatch position, so the row LOOKS like
// its neighbours even though it does not BEHAVE like them. See that file's
// own header for the full account of both rulings.
//
// THE ROW THAT LOOKS THE SAME BUT ACTS DIFFERENTLY IS THE ONE THING HERE A
// FUTURE READER IS MOST LIKELY TO "FIX". It is not a bug: it is the client's
// own answer to the exact question this file's own asymmetry raises, asked
// of her directly rather than assumed. The caption below (and
// `language-section.tsx`'s own header) are where that answer is written
// down, on purpose, so the next person to read this file meets the reason
// before they meet the itch to make all four rows match.
//
// ── SAVE / DISCARD MOVED TO A PINNED BAR AT THE TOP, 14 SEP 2026 ───────────
//
// The client, over a screenshot of this panel and `roles-matrix.tsx`, the
// same session as the ruling above: "We need some kind of hint or flag, very
// visible, probably not at the bottom, that allows me to save or to
// restart… to not save the changes." The design lane's own five-option
// artifact settled the shape (Option A, a quiet band pinned directly under
// the tab strip, reusing R63's own pinned-toolbar idiom) and the kit shipped
// it as `UnsavedChangesBar` (`shared/ui/components/unsaved-changes-bar`,
// v1.2.82). Save and Discard used to dock at the very bottom of the control
// column, under the caption — invisible on any viewport taller than the
// panel, which was her exact complaint. They are gone from there; the bar
// above draws both now, reading this file's own `dirty` and calling the same
// `handleSave`/`discard` this file already had. NOTHING ELSE about staging,
// the pending/saved split, or the caption's own sentence changed — only
// where the two buttons live.
//
// THE BAR IS `SettingsSection`'s OWN FIRST CHILD, NOT A SIBLING ABOVE IT —
// R67 (`sections-stand-on-paper`) says why. A titled section's own body must
// stand on paper, and this section's `<section>` already paints
// `bg-surface-panel`; a pinned band sitting BESIDE the section, on the bare
// tab-panel ground, is exactly the uncontained shape that check exists to
// catch (it did, the first time this shipped — see the fix note in this
// file's own commit). Riding inside costs one thing, stated plainly: the pin
// is inset by the section's own padding rather than flush with its outer
// rounded corners, because reaching the true edge would need
// `shared/web/settings-section.tsx` (not this lane's file) to publish the
// `--pinned-lead`/`--pinned-inset-x` pair `CollectionCard`
// (`web/components/deep-link/screen-bits.tsx`) already publishes for exactly
// that reason. `ground` is left at `UnsavedChangesBar`'s own default
// (`"bare"`) for the same reason every other `PINNED_TOOLBAR` call site in
// this app leaves the row it wraps unpainted: the wrapper already paints
// `--pinned-ground`, resolved automatically off the section's own
// `bg-surface-panel` — a second fill on the row itself would be the exact
// "arbitrary form silently freezes every ground-aware token beneath it" trap
// `ToolbarRow`'s own header warns about.

import * as React from "react"

import { AppearancePreview } from "@shared/ui/compositions/screens/settings"
import { UnsavedChangesBar } from "@shared/ui/components/unsaved-changes-bar/unsaved-changes-bar"
import { toast } from "@shared/ui/components/sonner/sonner"
import { PINNED_TOOLBAR } from "@shared/web/pinned-chrome"
import { cn } from "@shared/ui/lib/utils"

import { ScaleSection, applyScale, previewScaleStep } from "./scale-section"
import { ThemeSection, applyThemeMode, readStoredMode, type ThemeMode } from "./theme-section"
import { SpineSection } from "./spine-section"
import { LanguageSection } from "./language-section"
import { toSpine, type Spine } from "../spine"
import { SCALE_STEPS } from "../scale"
import { useLanguage } from "./language"
import { type Language } from "../i18n"
import { SettingsSection } from "./settings-section"

export function AppearancePanel({
  /** Persist the language choice. Both apps pass their own `auth.setLanguage`.
   * Called the instant a pill is pressed — see this file's own header,
   * "LANGUAGE IS THE FOURTH SECTION AND STAYS INSTANT". */
  saveLanguage,
  /** what the person currently reads at, from their own session row —
   * `AppearancePanel`'s own SAVED baseline for Size. */
  scaleValue,
  /** Persist the scale choice. The agency app passes its own `auth.setScale`.
   * Called once, from Save, only when Size actually changed. */
  saveScale,
  /** what the rail paints today, from the person's own session row —
   * `AppearancePanel`'s own SAVED baseline for Background. */
  spineValue,
  /** Persist the spine choice. Called once, from Save, only when Background
   * actually changed. */
  saveSpine,
  /** Told every time this panel's own `dirty` changes, and `false` once more
   * on unmount — the Settings tab strip has no `forceMount` (R59's sibling
   * gap this callback exists to close), so switching tabs unmounts this panel
   * outright and a staged Size/Appearance/Background draft would vanish with
   * no Save, no Discard, no warning. `settings-screen.tsx` is the one caller:
   * it keeps a `dirtyTabs` map from this and the matching prop on
   * `RolesMatrix`, and its own tab-change handler asks that map before it
   * ever lets a switch through. Optional because nothing else mounts this
   * panel today. */
  onDirtyChange,
}: {
  saveLanguage: (lang: Language) => Promise<unknown>
  scaleValue: string | null
  saveScale: (scale: string) => Promise<unknown>
  spineValue: string | null
  saveSpine: (spine: Spine) => Promise<unknown>
  onDirtyChange?: (dirty: boolean) => void
}) {
  const { t } = useLanguage()

  // ── SAVED — what is actually live in the app right now, one per staged
  // control. Size and Background arrive as props (the person's own session
  // row); Appearance has none — it is device-local — so it is read out of
  // `localStorage` once, after mount, the same SSR-guarded way
  // `ThemeSection` itself used to read it.
  const [savedScale, setSavedScale] = React.useState(() => scaleValue ?? SCALE_STEPS[1].value)
  const [savedSpine, setSavedSpine] = React.useState<Spine>(() => toSpine(spineValue))
  const [savedTheme, setSavedTheme] = React.useState<ThemeMode>("system")
  React.useEffect(() => setSavedTheme(readStoredMode()), [])

  // A prop changing under this panel — another device changed Size or
  // Background while this tab was open — moves the saved baseline the same
  // way the old per-control `useEffect(() => setChosen(value), [value])`
  // always did.
  React.useEffect(() => setSavedScale(scaleValue ?? SCALE_STEPS[1].value), [scaleValue])
  React.useEffect(() => setSavedSpine(toSpine(spineValue)), [spineValue])

  // ── PENDING — what the preview shows, and what Save would commit. Seeded
  // from saved, and re-seeded whenever saved moves: either an external
  // change above (nothing staged here yet, so following it is correct) or
  // this panel's own Save just having moved it (see `handleSave`, which
  // sets both to the same value on success — this effect then confirms it,
  // a harmless no-op).
  const [pendingScale, setPendingScale] = React.useState(savedScale)
  const [pendingSpine, setPendingSpine] = React.useState<Spine>(savedSpine)
  const [pendingTheme, setPendingTheme] = React.useState<ThemeMode>(savedTheme)
  React.useEffect(() => setPendingScale(savedScale), [savedScale])
  React.useEffect(() => setPendingSpine(savedSpine), [savedSpine])
  React.useEffect(() => setPendingTheme(savedTheme), [savedTheme])

  const dirty = pendingScale !== savedScale || pendingSpine !== savedSpine || pendingTheme !== savedTheme
  const [saving, setSaving] = React.useState(false)

  // REPORT UPWARD, AND `false` ON THE WAY OUT — see the prop's own doc. The
  // cleanup fires both on every re-run (a `dirty` flip stages the new value
  // through `false` first, which is harmless: the caller's next line is
  // `onDirtyChange(dirty)` again) and on unmount, which is the one that
  // matters — the moment the Settings tab strip throws this panel away, its
  // caller's `dirtyTabs` entry is corrected to match rather than lingering
  // stale.
  React.useEffect(() => {
    onDirtyChange?.(dirty)
    return () => onDirtyChange?.(false)
  }, [dirty, onDirtyChange])

  // The preview's resolved theme ("light"/"dark", never "system") — fed by
  // `ThemeSection` itself, which is the one place that already knows how to
  // resolve "system" (`matchMedia`). Tracks the PENDING theme, not saved.
  const [previewTheme, setPreviewTheme] = React.useState<"light" | "dark">("light")

  function discard() {
    setPendingScale(savedScale)
    setPendingSpine(savedSpine)
    setPendingTheme(savedTheme)
  }

  async function handleSave() {
    if (!dirty || saving) return
    setSaving(true)
    let failed = false

    if (pendingScale !== savedScale) {
      applyScale(pendingScale, "agency") // optimistic, matches ScaleSection's old contract
      try {
        await saveScale(pendingScale)
        setSavedScale(pendingScale)
      } catch {
        applyScale(savedScale, "agency") // undo the optimistic paint; the pill stays pressed
        failed = true
      }
    }

    if (pendingSpine !== savedSpine) {
      try {
        // `saveSpine` (the agency app's own prop, `settings-screen.tsx`)
        // already calls `active.refresh()` after `auth.setSpine` — the
        // app-wide repaint, moved from every press to this one commit.
        await saveSpine(pendingSpine)
        setSavedSpine(pendingSpine)
      } catch {
        failed = true
      }
    }

    if (pendingTheme !== savedTheme) {
      // Device-local: no door, no network, cannot fail — the same fact
      // `ThemeSection`'s own old `choose()` stated about itself.
      applyThemeMode(pendingTheme)
      setSavedTheme(pendingTheme)
    }

    setSaving(false)
    if (failed) toast.error(t("That didn't save. Try again."))
    else toast.success(t("Saved."))
  }

  return (
    <SettingsSection title={t("Appearance")} hideTitle>
      {/* THE PINNED BAR — see the header, "SAVE / DISCARD MOVED TO A PINNED
          BAR AT THE TOP". A child of `SettingsSection`, not a sibling: R67
          (`sections-stand-on-paper`) holds every body a titled section draws
          to standing on paper, and this section's own `<section>` already
          paints `bg-surface-panel` — so mounting the bar here, rather than
          beside the section on the bare tab-panel ground, is what keeps it
          contained without this file reaching into `settings-section.tsx`
          (not this lane's file) to publish the inset pair a truly edge-to-
          edge pin would need. The one cost, stated: the bar pins inset by the
          section's own padding rather than flush with its outer corners —
          `pb-4 -mb-4` below is the section's own `gap-4` (this row is its
          FIRST child, so the gap that needs painting is the one BELOW it,
          between the bar and the grid), paid inside the pinned box and given
          back, the identical pair every other `PINNED_TOOLBAR` call site in
          this app spends so the gap stays painted rather than a hole the
          grid scrolls through once this bar is stuck (R63). Renders nothing
          at all while `!dirty`, so there is nothing to conditionally wrap. */}
      {dirty && (
        <div data-slot="toolbar-row-pin" className={cn(PINNED_TOOLBAR, "pb-4 -mb-4")}>
          <UnsavedChangesBar
            dirty={dirty}
            saving={saving}
            message={t("You have unsaved changes")}
            saveLabel={t("Save")}
            savingLabel={t("Saving…")}
            discardLabel={t("Discard")}
            onSave={() => void handleSave()}
            onDiscard={discard}
          />
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <div className="flex flex-col gap-2 lg:sticky lg:top-4">
          <AppearancePreview
            theme={previewTheme}
            spine={pendingSpine}
            scale={previewScaleStep(pendingScale)}
          />
          {/* THE CAPTION — the artifact's own option 3 (`appearance-layouts.html`,
              "Preview-led"), centred beneath the frame: nothing here reacts to
              a control on its own, so the sentence says what the picture is
              for before somebody presses one. */}
          <p className="text-muted-foreground text-center text-xs">
            {t("Live preview — updates as you press a control")}
          </p>
        </div>
        <div className="flex flex-col gap-5">
          {/* LANGUAGE, FIRST — her correction, verbatim in the header above:
              "Language · Size · Appearance · Background", inside this one
              column, not a full-width band over the grid. Applies and
              persists the instant a pill is pressed — see the header,
              "LANGUAGE IS THE FOURTH SECTION AND STAYS INSTANT". */}
          <LanguageSection save={saveLanguage} />
          <ScaleSection value={pendingScale} onChange={setPendingScale} disabled={saving} />
          <ThemeSection
            value={pendingTheme}
            onChange={setPendingTheme}
            onResolvedChange={setPreviewTheme}
            disabled={saving}
          />
          <SpineSection value={pendingSpine} onChange={setPendingSpine} disabled={saving} />

          {/* THE CAPTION — Save/Discard moved to the pinned bar above (14
              Sep 2026); this sentence stays exactly where it was and says
              exactly what it always said, because it is still true: the
              row above it (Language) looks identical to the three it sits
              beside and behaves nothing like them — see the header, "THE
              ROW THAT LOOKS THE SAME BUT ACTS DIFFERENTLY". */}
          <p className="text-muted-foreground pt-2 text-xs">
            {t("Language changes right away. Size, appearance and background wait for Save.")}
          </p>
        </div>
      </div>
    </SettingsSection>
  )
}
