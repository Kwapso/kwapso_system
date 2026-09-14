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
// LANGUAGE STAYS INSTANT — RULED ON DIRECTLY, NOT AN OVERSIGHT. Size,
// Appearance and Background all became PENDING this same day (see
// `AppearancePanel`'s own header): a press only moves the preview, and
// nothing outside this tab changes until Save. Language was asked to stage
// the same way and the asymmetry was put to her plainly — the preview shows a
// chip, a title and a lorem body, none of which read differently in another
// language, so staging Language would show her nothing changing while she
// waited to press Save. Her answer: "keep language instant." So this control
// alone keeps its pre-existing contract — `choose()` below still applies the
// instant the pill is pressed and persists right behind it, exactly as it did
// before Size/Appearance/Background staged — and it is NOT part of
// `AppearancePanel`'s dirty/Save/Discard state: picking a language never
// arms Save, and Discard never touches it. THE NEXT READER'S OWN INSTINCT
// WILL BE TO "FIX" THIS BY FOLDING LANGUAGE INTO THE PENDING STATE, because
// four pill rows that look alike and behave differently is the one thing
// about this panel that reads as unfinished. It is not: it is the client's
// own ruling, asked for directly and answered directly, and folding it back
// in would be reverting a decision rather than completing one.
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
// OPTIMISTIC, THEN PERSISTED — UNCHANGED, SEE "LANGUAGE STAYS INSTANT" ABOVE.
// The choice re-renders the app instantly and the save follows. If the save
// fails the language snaps back and says so, in the language they were
// reading a moment ago rather than the one they asked for — because the one
// they asked for is precisely what did not happen.

import * as React from "react"

import { toast } from "@shared/ui/components/sonner/sonner"

import { AppearancePillGroup, type AppearancePillOption } from "./appearance-pill-group"
import { coverage, LANGUAGES, translate, type Language } from "../i18n"
import { useLanguage } from "./language"

export function LanguageSection({
  /** Persist the choice. Both apps pass their own `auth.setLanguage`. */
  save,
  /* NO `className` OVERRIDE. It had one call site and that call site passed
   * nothing, so the "default" was what shipped — and the box is
   * `AppearancePanel`'s single `SettingsSection` now, same as its three
   * neighbours. A prop whose only purpose was to let a host restyle a box
   * this file no longer owns is the door R67 has been shut through five
   * rulings. */
}: {
  save: (lang: Language) => Promise<unknown>
}) {
  const { lang, setLang, t } = useLanguage()
  const [saving, setSaving] = React.useState(false)
  const done = React.useMemo(() => coverage(), [])

  /** How much of the app this language can say, as a whole number — or null for
   * English, which IS the key and is therefore complete by definition. Saying
   * "100% translated" under English would be noise. Read per pill below, the
   * one place this number is still said now that the sentence under the
   * control is gone (see the header). */
  const percent = (code: string): number | null =>
    code === "en" ? null : Math.round((done[code as keyof typeof done] ?? 0) * 100)

  async function choose(next: Language) {
    if (next === lang || saving) return
    const previous = lang
    setLang(next) // instant: the screen is already in the new language
    setSaving(true)
    try {
      await save(next)
      // In the language they JUST CHOSE, not the one `t` was bound to when this
      // component rendered. `t` is captured before the optimistic switch, so
      // using it here confirms a change to German in English — which is a small
      // thing that says the feature is skin deep.
      toast.success(translate("Language changed.", next))
    } catch {
      // Back to what they could read. The message is deliberately composed in
      // `previous`, not through the `t` above — telling somebody in Catalan that
      // Catalan failed to load is a joke at their expense.
      setLang(previous)
      toast.error(translate("That didn't save. Try again.", previous))
    } finally {
      setSaving(false)
    }
  }

  // PILLS: flag in the swatch position (matching Background's own colour
  // mark), the language's own name for itself, its English name beside it
  // where the two differ, and the completion figure where it is under 100 —
  // the same three facts the old trigger + dropdown carried, now all on one
  // row instead of split between a closed control and an opened menu.
  const options: readonly AppearancePillOption[] = LANGUAGES.map((l) => {
    const pct = percent(l.code)
    return {
      value: l.code,
      label: (
        <span className="flex items-center gap-1.5">
          <span>{l.native}</span>
          {l.english !== l.native && (
            <span className="text-muted-foreground text-xs">{l.english}</span>
          )}
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
        value={lang}
        disabled={saving}
        onValueChange={(next) => void choose(next as Language)}
        ariaLabel={t("Language")}
      />
    </div>
  )
}
