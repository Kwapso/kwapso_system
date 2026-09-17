"use client"

// THE SWITCHER — one control, shown in Settings, FIRST inside the single
// Appearance container now, above Size, Appearance and Background.
//
// CORRECTION, 2026-09-14 (the same day, after she saw the shipped panel).
// "Put language first" landed as its OWN container above a second one holding
// the preview and the other three — two boxes. Her actual words, once she saw
// it live: "What I meant by language first was inside the container, just to
// make it the top section: Language · Size · Appearance · Background." One
// container, four sections, in that order. So this file no longer draws a
// `SettingsSection` of its own — that was the bug — and stands as the first
// group inside `AppearancePanel`'s one box (`shared/web/appearance-panel.tsx`),
// which is where it is mounted now. `settings-screen.tsx` no longer renders
// this component directly.
//
// A PILL ROW NOW, MATCHING ITS THREE NEIGHBOURS — THIRD RULING, SAME DAY.
// "Also, make the language choice also be like the rest: size, appearance,
// background." Size/Appearance/Background all draw through
// `AppearancePillGroup` (`shared/web/appearance-pill-group.tsx`); this control
// drew the library's `<Select>` instead, the one row in the panel that did not
// match its neighbours. `LANGUAGES` (`shared/i18n.ts`) is four entries, which
// is exactly the shape a pill row is for — the twenty-nine-language argument
// against pills, recorded below, does not apply to four. EACH PILL STILL
// CARRIES ITS FLAG, in the swatch position the other three groups use for
// their own colour mark (`AppearancePillOption.swatch`), so the four rows line
// up. AND THE COVERAGE FIGURE IS KEPT, not dropped in the conversion: the old
// `<Select>` said `{pct}%` beside a language only once its dropdown was OPEN;
// a pill row has no closed state to hide it behind, so the same figure now
// sits on every pill that needs it, visible without a click — closer to what
// "so a person choosing needs it" (below) was actually asking for than the
// menu it used to hide behind.
//
// LANGUAGE STAGES TOO NOW — REVERSED, 2026-09-17. "Keep language instant"
// (above, kept as the historical record) held for three days. The client's
// ruling, 2026-09-17, verbatim: "Delete these live preview updates as you
// press a control, and also delete the language changes right away. Size,
// Appearance, and Background: wait for Save. Actually, I want everything to
// wait for the save. Nothing changes right away." So the one exception is
// gone: this file no longer calls `setLang`, no longer calls `save`, no
// longer shows its own toast, and no longer owns a `saving` state of its
// own. It is now a plain, controlled pill row, the identical shape
// `ScaleSection`/`ThemeSection`/`SpineSection` already take — `value` is the
// PENDING language, `onChange` asks `AppearancePanel` to hold a different
// one, and the panel is the one place that seeds the pending value from the
// signed-in session, calls `saveLanguage` and `setLang` on Save, and shows
// the result. See that file's own header for the fuller account.
//
// NO SUBTITLE, THE 2026-09-14 preview-led RULING. She quoted this section's
// own two sentences back verbatim and asked for them gone: "remove subtitle
// 'What people type stays in the language they typed it. 88% translated.'"
// Both are deleted — the fact about typed text, and the coverage sentence
// below the control — and so is the one she did not quote but that stands in
// the identical position, "Choose the language you want {brand} in.": R72's
// own default ("no subtitle under a heading, unless she asks") is the reading
// that explains why she saw ONE subtitle to name where this file drew three
// sentences: they are the same shape, stacked. THE COVERAGE NUMBER IS NOT
// LOST, only its own sentence — see the pill-row note above for where it
// lives now.
//
// IT SPENT THREE WEEKS ON THE PROFILE PAGE (17 Aug – 10 Sep 2026), on the
// reading that a reading language is about a PERSON and Settings is about the
// APP. The client ended that: *"language shoudl be in settings somewhere, not in
// my porfile"* (2026-09-10). She is right, and the giveaway is that the three
// display choices it now sits beside — how big the app is, light or dark, the
// sidebar's colour — are exactly as personal and never left. The line is
// identity against display, not person against app. Your name, your email
// address and your history stayed on the profile page, where a tester looking
// for "change my name" can still find them.
//
// The portal has no settings screen by design, so its own switcher is the
// compact `language-menu.tsx` in the header. That one did not move, and did
// not become a pill row — it is a header control, not a Settings section, and
// was never part of either ruling above.
//
// NATIVE NAME ONLY, NO SECOND RENDERING — CLIENT RULING, 2026-09-17,
// VERBATIM: "In Settings > Appearance > Languages, only put the name of the
// language in its original language. You don't need to also put it in
// German." Each pill used to carry the language's OWN name plus its English
// name beside it wherever the two differ (`Deutsch German`, `Español
// Spanish`, `Català Catalan`) — a second rendering of the same word, in
// whichever language the reader is NOT reading, on a row whose whole job is
// showing four names a person scans for their own. That second `<span>` is
// gone: a pill shows the flag, the language's own name for itself, and
// nothing else but the completion figure where it is under 100.

import * as React from "react"

import { AppearancePillGroup, type AppearancePillOption } from "./appearance-pill-group"
import { coverage, LANGUAGES, type Language } from "../i18n"
import { useLanguage } from "./language"

export function LanguageSection({
  /** The PENDING language — `AppearancePanel`'s own state, not this
   * component's. Never applied or persisted by this file any more. */
  value,
  /** A different pill was pressed. The panel decides what happens next —
   * update the pending value, and nothing else, until Save. */
  onChange,
  /** True while `AppearancePanel`'s own Save is in flight. */
  disabled = false,
  /* NO `className` OVERRIDE. It had one call site and that call site passed
   * nothing, so the "default" was what shipped — and the box is
   * `AppearancePanel`'s single `SettingsSection` now, same as its three
   * neighbours. A prop whose only purpose was to let a host restyle a box
   * this file no longer owns is the door R67 has been shut through five
   * rulings. */
}: {
  value: Language
  onChange: (next: Language) => void
  disabled?: boolean
}) {
  const { t } = useLanguage()
  const done = React.useMemo(() => coverage(), [])

  /** How much of the app this language can say, as a whole number — or null for
   * English, which IS the key and is therefore complete by definition. Saying
   * "100% translated" under English would be noise. Read per pill below, the
   * one place this number is still said now that the sentence under the
   * control is gone (see the header). */
  const percent = (code: string): number | null =>
    code === "en" ? null : Math.round((done[code as keyof typeof done] ?? 0) * 100)

  // PILLS: flag in the swatch position (matching Background's own colour
  // mark), the language's own name for itself — its own, only, see the
  // header's "NATIVE NAME ONLY" ruling — and the completion figure where it
  // is under 100.
  const options: readonly AppearancePillOption[] = LANGUAGES.map((l) => {
    const pct = percent(l.code)
    return {
      value: l.code,
      label: (
        <span className="flex items-center gap-1.5">
          <span>{l.native}</span>
          {pct !== null && pct < 100 && (
            <span className="text-muted-foreground text-xs tabular-nums">{pct}%</span>
          )}
        </span>
      ),
      swatch: <span aria-hidden>{l.flag}</span>,
    }
  })

  return (
    /* R72 (no subtitle under a heading, unless she asked): the two sentences
       that used to stand here — one above the control, one below it — are
       both gone; see the header for the ruling and for where the coverage
       number moved instead. No `SettingsSection` any more — the box is
       `AppearancePanel`'s, one level up — just the same compact micro-label
       `ScaleSection` / `ThemeSection` / `SpineSection` each draw, and the
       control itself. */
    <div className="flex flex-col gap-2">
      <h3 className="text-muted-foreground text-micro uppercase">{t("Language")}</h3>
      <AppearancePillGroup
        options={options}
        value={value}
        disabled={disabled}
        onValueChange={(next) => onChange(next as Language)}
        ariaLabel={t("Language")}
      />
    </div>
  )
}
