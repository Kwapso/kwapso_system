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
//
// ── THREE MORE RULINGS, 2026-09-17 ──────────────────────────────────────────
//
// (a) LANGUAGE PILLS SHOW THEIR OWN NAME ONLY — answered in
//     `language-section.tsx`, not here; see that file's own header.
//
// (b) NO EXPLANATORY SENTENCE ANYWHERE ON THIS TAB, AND EVERYTHING WAITS FOR
//     SAVE — including Language, reversing "keep language instant" above
//     (kept as the historical record of a ruling that held for three days).
//     Verbatim: "Settings, Appearance. Again, I told you: too many
//     descriptions everywhere. Delete these live preview updates as you
//     press a control, and also delete the language changes right away.
//     Size, Appearance, and Background: wait for Save. Actually, I want
//     everything to wait for the save. Nothing changes right away." Two
//     changes: the two `<p>` captions below this section (the live-preview
//     caption and the "Language changes right away…" sentence) are DELETED
//     outright — R81 (`form-carries-no-hints`) is a form-file census keyed on
//     a `FormShell`/`FormShellDialog` import, and this file imports neither
//     (a Settings tab staged behind Save is a form in every way that matters
//     but that one import), so `web/test/form-hints.test.ts`'s own
//     `importsFormShell` marker now ALSO recognises a file importing the
//     kit's `UnsavedChangesBar` — the same "stages a draft behind Save/
//     Discard" signature R81's own law is about, read off the file rather
//     than restated by hand. And Language joins `pendingScale`/
//     `pendingSpine`/`pendingTheme` as a fourth staged value: `pendingLanguage`/
//     `savedLanguage` below, `dirty` grows a fourth clause, `discard()` resets
//     a fourth value, and `handleSave` calls `saveLanguage` AND `setLang`
//     (the context's own instant re-render, moved from every press to this
//     one commit — the identical move Background's `saveSpine` already made
//     for `active.refresh()`) only when the pending language actually
//     changed. `LanguageSection` no longer takes a `save` prop at all — see
//     that file's own header for its side of this change.
//
// (c) THE PREVIEW ITSELF STANDS ON PAPER, TALLER, MORE POPULATED. Verbatim:
//     "I want the preview on Settings > Appearance to be slightly taller.
//     Currently, it's a container inside a container, so that's not
//     accurate. Try to represent more of the real look of the app and
//     include more elements inside, not just one kind of card." The kit's
//     `AppearancePreview` (`shared/ui/compositions/screens/settings.tsx`) is
//     replaced below by `AppearanceTabPreview`
//     (`shared/web/appearance-tab-preview.tsx`) — that file's own header had
//     the full account of the height token it names, why it is not a card
//     inside a card, and why it reached for real kit parts (`Card`, `Badge`,
//     `List`) rather than hand-drawn boxes. `previewScaleStep` and the
//     `previewTheme` wiring below are unchanged; only which component reads
//     them moved. SUPERSEDED THE SAME DAY — see the next block.
//
// ── (d) "MINIATURE OF THIS VERY PAGE" — THE SAME SESSION, LATER THE SAME
//     DAY, OVER THE PICTURE (c) HAD JUST SHIPPED ────────────────────────────
//
//     Verbatim: "Good, the language part. However, I'm not happy with the
//     pre-visualization. Please create an artifact with multiple options and
//     include the whole settings page…" — and her pick, over the side-by-
//     side artifact: "appearance p1" = "Miniature of this very page". (c)'s
//     picture (a generic Card/Badge/List specimen: a title row, a toolbar
//     bar, three placeholder rows with status dots) is gone; `AppearanceTab
//     Preview` now draws the actual frame this tab sits inside — the rail
//     with its real groups and destinations, the workspace top strip with
//     the open "Settings" tab and the pinned "+", and the content card
//     holding Settings' own tab strip and a miniature of THIS Appearance
//     panel. That file's own header has the full account: why the real
//     `AppShell`/`Rail` cannot be mounted for real (live sockets, live
//     session context, and — even for the kit's own presentational `Rail` —
//     the identical `role="img"` accessibility fault this file's picture
//     already refused for a live `<Tabs>`/`<Button>`), why the rail's real
//     words are transcribed rather than imported (the portal's own tsconfig
//     boundary), and why not one of those words is a new catalogue string.
//     Nothing in THIS file changed for it — `theme`/`spine`/`scale` below
//     are the same three props `AppearanceTabPreview` always read.

import * as React from "react"

import { AppearanceTabPreview } from "./appearance-tab-preview"
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
   * Called once, from Save, only when Language actually changed — see the
   * header, "(b) NO EXPLANATORY SENTENCE ANYWHERE ON THIS TAB, AND EVERYTHING
   * WAITS FOR SAVE" (2026-09-17, reversing the "stays instant" ruling this
   * file's older prose still describes). */
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
  const { t, lang, setLang } = useLanguage()

  // ── SAVED — what is actually live in the app right now, one per staged
  // control. Size and Background arrive as props (the person's own session
  // row); Appearance has none — it is device-local — so it is read out of
  // `localStorage` once, after mount, the same SSR-guarded way
  // `ThemeSection` itself used to read it. Language is already authoritative
  // in the language context (`SessionUser.language`, R33's own provider), so
  // there is nothing to seed from storage — `lang` IS the saved baseline.
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
  const [pendingLanguage, setPendingLanguage] = React.useState<Language>(lang)
  React.useEffect(() => setPendingScale(savedScale), [savedScale])
  React.useEffect(() => setPendingSpine(savedSpine), [savedSpine])
  React.useEffect(() => setPendingTheme(savedTheme), [savedTheme])
  React.useEffect(() => setPendingLanguage(lang), [lang])

  const dirty =
    pendingScale !== savedScale ||
    pendingSpine !== savedSpine ||
    pendingTheme !== savedTheme ||
    pendingLanguage !== lang
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
    setPendingLanguage(lang)
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

    if (pendingLanguage !== lang) {
      // Persist first, apply second — `setLang` is the instant, optimistic
      // re-render `language-section.tsx`'s own retired `choose()` used to
      // fire on every press; it now fires once, on a successful Save, the
      // identical move Background's `saveSpine` already made for
      // `active.refresh()` above. A failed persist leaves the app reading
      // in whatever `lang` already was — the pill stays pressed and Save
      // stays enabled, so trying again is one more press.
      try {
        await saveLanguage(pendingLanguage)
        setLang(pendingLanguage)
      } catch {
        failed = true
      }
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
        {/* T3662 (mobile sweep, 2026-09-19): below `lg` this grid has ONE
            implicit column, so both children share ONE track — and a grid
            item's default `min-width` is `auto` (its max-content size), not
            0. `AppearanceTabPreview`'s box carries `aspect-[16/10]` with
            `min-h-[22rem]`: with no `min-w-0` here, the UA transfers that
            floor through the ratio into a ~563px min-content WIDTH, the
            track grows to fit it, and the language/size/appearance/
            background column on row two — the OTHER grid item, sharing the
            same track — is dragged out to that same width and clipped by
            the shell's own `overflow-hidden`. `min-w-0` is the standard
            escape from flex/grid's auto min-size floor; every other
            constrained box in this screen's own ancestor chain already
            carries it. Measured live on staging at 375px: the track was
            634px wide and the language pill row's own available width was
            1014px, both cut off with no scroll to reach the rest. */}
        <div data-slot="appearance-preview-column" className="flex min-w-0 flex-col gap-2 lg:sticky lg:top-4">
          {/* NO CAPTION BELOW THE FRAME ANY MORE — R81/2026-09-17: "too many
              descriptions everywhere ... delete these live preview updates
              as you press a control." The picture is `AppearanceTabPreview`
              now (`shared/web/appearance-tab-preview.tsx`), taller and more
              populated — see that file's own header and the block above,
              "THE PREVIEW ITSELF STANDS ON PAPER, TALLER, MORE POPULATED". */}
          <AppearanceTabPreview theme={previewTheme} spine={pendingSpine} scale={previewScaleStep(pendingScale)} />
        </div>
        <div data-slot="appearance-controls-column" className="flex min-w-0 flex-col gap-5">
          {/* LANGUAGE, FIRST — her correction, verbatim in the header above:
              "Language · Size · Appearance · Background", inside this one
              column, not a full-width band over the grid. Staged now, like
              its three neighbours — see the header, "NO EXPLANATORY
              SENTENCE ANYWHERE ON THIS TAB, AND EVERYTHING WAITS FOR SAVE". */}
          <LanguageSection value={pendingLanguage} onChange={setPendingLanguage} disabled={saving} />
          <ScaleSection value={pendingScale} onChange={setPendingScale} disabled={saving} />
          <ThemeSection
            value={pendingTheme}
            onChange={setPendingTheme}
            onResolvedChange={setPreviewTheme}
            disabled={saving}
          />
          <SpineSection value={pendingSpine} onChange={setPendingSpine} disabled={saving} />
        </div>
      </div>
    </SettingsSection>
  )
}
