"use client"

// LIGHT, DARK OR THE MACHINE'S OWN — a compact card row, beside the shared
// Appearance preview rather than carrying its own picture.
//
// PREVIEW-LED, CLIENT RULING 2026-09-14. She chose the preview-led layout of
// four Settings · Appearance options a lane put in front of her: one live
// `AppearancePreview` (kit v1.2.77) beside compact controls, replacing
// twelve small option pictures with one shared preview that is always
// current. This section used to draw its own `SettingsSection` box and a
// `ThemePicture` on every card; both are gone — the box is now the shared
// panel's (`shared/web/appearance-panel.tsx`) and the picture's job is the
// live preview's.
//
// DEVICE-LOCAL, NOT ON THE PERSON'S ROW — untouched by this pass.
// `AppearanceSection`'s own header said it plainly: "It is remembered on
// this device." So there is no `value`/`save` pair here, same as before —
// this component owns its own state, seeded from `localStorage` and applied
// straight to the document, using exactly the mechanism `ModeToggle` itself
// documents as its public contract: the `data-theme` attribute on
// `document.documentElement`, values `"light"` / `"dark"` (system removes
// the attribute entirely), `documentElement.style.colorScheme` set
// alongside it, and the `"theme"` `localStorage` key.
//
// `onResolvedChange` IS NEW. The shared preview beside this group takes an
// ALREADY RESOLVED `"light" | "dark"` — `AppearancePreview`'s own header
// states why it cannot take `"system"` itself: a picture has no clock. So
// this file resolves "system" the one place that already knows how —
// `matchMedia`, the same source `ModeToggle`'s own dusk-switch reads — and
// reports the answer up, live: a `change` listener keeps the preview correct
// across a system flip while the tab is open on "System", which nothing
// before this pass needed to do.
//
// SSR-GUARDED THE SAME WAY `ModeToggle` GUARDS ITSELF. Its own
// `getServerSnapshot` answers "system" for the server render and the
// hydrating first paint, and only reads storage afterwards. This component
// does the same: `chosen` starts at `"system"`, and the real stored value is
// read in a `useEffect` — after mount, never during render — so there is
// nothing for React to flag as a hydration mismatch.

import * as React from "react"

import { toast } from "@shared/ui/components/sonner/sonner"
import { type ThemeMode } from "@shared/ui/components/mode-toggle/mode-toggle"

import { AppearancePillGroup, ThemeSwatch, type AppearancePillOption } from "./appearance-pill-group"
import { useLanguage } from "./language"

/** The one attribute name `ModeToggle`'s own header states tokens.css §6 and
 * §7 are written against. Transcribed rather than imported: the kit exports
 * the component, not this constant. */
const THEME_ATTRIBUTE = "data-theme"

/** The `localStorage` key `ModeToggle` itself reads and writes by default,
 * and the one the head-script snippet in its header comment agrees with. */
const STORAGE_KEY = "theme"

function isThemeMode(value: string): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system"
}

/** What is stored, guarded for SSR exactly as `ModeToggle`'s own
 * `readStoredMode` guards it: no `window`, an unreadable key, or a value the
 * code does not recognise all read as "system" — the same discipline that
 * lets clearing site data return a reader to system rather than to a guess. */
function readStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "system"
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored === "light" || stored === "dark" ? stored : "system"
  } catch {
    return "system"
  }
}

/** Put the choice on the document. `light`/`dark` write the attribute and the
 * matching `colorScheme`; `system` removes both, so the media query in
 * tokens.css keeps deciding, including when the machine flips at dusk. */
function applyThemeMode(mode: ThemeMode): void {
  if (typeof document === "undefined") return
  const root = document.documentElement
  if (mode === "system") {
    root.removeAttribute(THEME_ATTRIBUTE)
    root.style.colorScheme = "light dark"
  } else {
    root.setAttribute(THEME_ATTRIBUTE, mode)
    root.style.colorScheme = mode
  }
}

export function ThemeSection({
  /** Told the resolved value ("light"/"dark", never "system") on mount,
   * on every press, and again whenever the machine's own scheme flips while
   * "System" is chosen — so the shared preview beside this group is never a
   * frame behind it. */
  onResolvedChange,
}: {
  onResolvedChange?: (resolved: "light" | "dark") => void
}) {
  const { t } = useLanguage()

  // PILLS: no picture, no per-option description — the live preview beside
  // this group carries that argument now. A swatch survives, though — her
  // own second instruction, "also in appearance add colors (like in
  // background)": the same mark Background's own pills carry, same size,
  // same shape, same position, resolved through `ThemeSwatch`'s own tokens.
  const options: readonly AppearancePillOption[] = [
    { value: "light", label: t("Light"), swatch: <ThemeSwatch tone="light" /> },
    { value: "dark", label: t("Dark"), swatch: <ThemeSwatch tone="dark" /> },
    { value: "system", label: t("System"), swatch: <ThemeSwatch tone="system" /> },
  ]

  // Seeded "system" for the server render and the hydrating first paint —
  // the same value `ModeToggle`'s own `getServerSnapshot` answers with —
  // and only ever read from storage afterwards, in an effect.
  const [chosen, setChosen] = React.useState<ThemeMode>("system")
  React.useEffect(() => {
    setChosen(readStoredMode())
  }, [])

  // The resolved value the preview actually draws, kept correct across a
  // live system flip while "System" is the resting choice.
  const [systemDark, setSystemDark] = React.useState(false)
  React.useEffect(() => {
    if (chosen !== "system" || typeof window === "undefined" || typeof window.matchMedia !== "function") return
    const mql = window.matchMedia("(prefers-color-scheme: dark)")
    setSystemDark(mql.matches)
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [chosen])

  const resolved: "light" | "dark" = chosen === "system" ? (systemDark ? "dark" : "light") : chosen
  React.useEffect(() => onResolvedChange?.(resolved), [resolved, onResolvedChange])

  // Applies immediately: there is no server round trip for a device-local
  // preference, so the card's own selection state IS the source of truth
  // the moment it is pressed — no `saving` state to hold in between.
  function choose(next: string) {
    if (!isThemeMode(next) || next === chosen) return
    setChosen(next)
    applyThemeMode(next)
    if (typeof window !== "undefined") {
      try {
        if (next === "system") window.localStorage.removeItem(STORAGE_KEY)
        else window.localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // Storage refused (private mode, blocked storage). The attribute
        // above still landed, so the choice holds for this page view; it
        // just will not survive a reload — the same trade `ModeToggle`
        // itself makes, and swallows the same way.
      }
    }
    // There is no save round trip to wait on (see the header — this is
    // device-local), but the other two cards in this panel both confirm
    // their own presses with a toast, and a card that applies instantly with
    // no feedback at all reads as broken next to those two.
    toast.success(t("Theme changed."))
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-muted-foreground text-micro uppercase">{t("Appearance")}</h3>
      <AppearancePillGroup
        options={options}
        value={chosen}
        onValueChange={choose}
        ariaLabel={t("Appearance")}
      />
    </div>
  )
}
