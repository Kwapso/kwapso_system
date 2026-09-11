"use client"

// THE SWITCHER — one control, shown in Settings, in the Appearance tab under
// Size, Appearance and Background.
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
// compact `language-menu.tsx` in the header. That one did not move.
//
// ONE DROPDOWN, NOT TWENTY-NINE BUTTONS. It began as a button per language,
// wrapping, on the argument that a dropdown hides every choice but the current
// one behind a click. That argument was right when the list was the agency's own
// four; it stopped being right at twenty-nine, where the wrapped row was six
// lines of flags that pushed the rest of Settings off the screen and read as
// clutter rather than as a choice. A dropdown is one line at rest and the whole
// list when it is open, which is the correct trade once the list is longer than
// a person can take in at a glance.
//
// It is the LIBRARY's Select (R3 — nothing here hand-rolls a menu), and it stays
// legible to somebody who cannot yet read a word on this screen: the flag, the
// language's own name for itself, and its English name beside it, so a person
// who knows their language only as "Punjabi" and a person who scans for ਪੰਜਾਬੀ
// both find the row.
//
// HOW COMPLETE EACH LANGUAGE IS, still said out loud. A machine fills the
// catalogue in and a language can be part-written; somebody choosing one is told
// so before they discover it a screen later. In the list it is a bare number, so
// twenty-nine rows stay scannable; under the control it is the whole sentence
// for the language actually in force, which is the one that matters.
//
// OPTIMISTIC, THEN PERSISTED. The choice re-renders the app instantly and the
// save follows. If the save fails the language snaps back and says so, in the
// language they were reading a moment ago rather than the one they asked for —
// because the one they asked for is precisely what did not happen.

import * as React from "react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/ui/components/select/select"
import { toast } from "@shared/ui/components/sonner/sonner"

import { coverage, LANGUAGES, translate, type Language } from "../i18n"
import { brand } from "../brand"
import { useLanguage } from "./language"
import { SettingsSection } from "./settings-section"

/** THE APP'S OWN NAME, THROUGH THE SEAM THAT OWNS IT. `shared/brand.ts` calls
 * itself "THE one place to brand this app" and twenty-three files read it; the
 * sentences below used to spell the name out instead, which meant a rebrand — or
 * a fork of this base for the next product — would have left them saying the old
 * one, in four languages, on a screen that looked finished. Written as a `{brand}`
 * hole rather than concatenated, because a hole is the only shape a translator
 * can reorder (shared/i18n.ts, `fill`). */
const BRAND = { brand: brand.name }


export function LanguageSection({
  /** Persist the choice. Both apps pass their own `auth.setLanguage`. */
  save,
  /* NO `className` OVERRIDE ANY MORE. It had one call site and that call site
   * passed nothing, so the "default" was what shipped — and the default was
   * this section's own wrapper, which is now `SettingsSection`'s. A prop whose
   * only purpose was to let a host restyle the box is the door R67 has been
   * shut through five rulings. */
}: {
  save: (lang: Language) => Promise<unknown>
}) {
  const { lang, setLang, t } = useLanguage()
  const [saving, setSaving] = React.useState(false)
  const done = React.useMemo(() => coverage(), [])
  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0]

  /** How much of the app this language can say, as a whole number — or null for
   * English, which IS the key and is therefore complete by definition. Saying
   * "100% translated" under English would be noise. */
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

  const currentPercent = percent(current.code)

  return (
    /* THE FOURTH SECTION ON THE SAME TAB, and it gets the same shape for the
       same reason: client, 2026-09-11, "ticket types should be on top of the
       searchbar inside the container without subtitle, make this. always".
       Its heading was the one thing on this tab still standing on the white
       after its three neighbours came inside — three sections one way and one
       the other, on one tab, is precisely the inconsistency the ruling is
       about.

       THE SENTENCE BELOW STAYS, and it is not a subtitle surviving under
       another name. It is INSIDE the container, directly above the control it
       is about, and it carries a fact the title cannot: what people type stays
       in the language they typed it. That is R67 amendment 4's own line — prose
       is exempt where it is in the thing it describes — read as a design rule
       rather than as a loophole.

       `motion-panel-in` WENT WITH THE WRAPPER. Three of this section's four
       neighbours never had it, so one tab was animating in quarters; one
       behaviour for one tab is the trade, and it is recorded here rather than
       discovered later. */
    <SettingsSection title={t("Language")}>
      <div className="flex flex-col gap-4">
        <p className="text-muted-foreground text-sm">
          {t("Choose the language you want {brand} in.", BRAND)}{" "}
          {t("What people type stays in the language they typed it.")}
        </p>
        <Select
          value={lang}
          onValueChange={(next) => void choose(next as Language)}
          disabled={saving}
        >
          <SelectTrigger className="sm:max-w-xs" aria-label={t("Language")}>
            {/* Given children, the trigger shows THESE rather than the selected
             * row's own text — so the percentage stays in the list, where it
             * helps somebody choose, and out of the resting control, where the
             * sentence below already says it. */}
            <SelectValue>
              <span className="flex items-center gap-2 truncate">
                <span aria-hidden>{current.flag}</span>
                <span>{current.native}</span>
                {current.english !== current.native && (
                  <span className="text-muted-foreground text-xs">{current.english}</span>
                )}
              </span>
            </SelectValue>
          </SelectTrigger>
          {/* LANGUAGES' own order: the agency's own four first, then the world's
           * by how many people speak them. The order is the engine's decision,
           * not this screen's — see shared/i18n.ts. */}
          <SelectContent>
            {LANGUAGES.map((l) => {
              const pct = percent(l.code)
              return (
                <SelectItem key={l.code} value={l.code}>
                  <span className="flex items-center gap-2">
                    <span aria-hidden>{l.flag}</span>
                    <span>{l.native}</span>
                    {l.english !== l.native && (
                      <span className="text-muted-foreground text-xs">{l.english}</span>
                    )}
                    {pct !== null && pct < 100 && (
                      <span className="text-muted-foreground text-xs tabular-nums">{pct}%</span>
                    )}
                  </span>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
        {currentPercent !== null && currentPercent < 100 && (
          <p className="text-muted-foreground text-xs">
            {t("{percent}% translated", { percent: currentPercent })}{" "}
            {t("The rest is shown in English.")}
          </p>
        )}
      </div>
    </SettingsSection>
  )
}
