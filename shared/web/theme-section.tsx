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
// STAGED, SAME DAY, SECOND RULING. "We need … some kind of save button so
// that I can first preview it and, once I'm happy with what I see, implement
// it across the app." Until this pass every press here applied instantly —
// the document's `data-theme` attribute and `colorScheme` flipped, and
// `localStorage` was written, the moment a pill was pressed. That is gone:
// this component no longer owns any state, reads storage, writes storage or
// touches `document` at all. It is now a plain, controlled pill row — `value`
// is the PENDING choice, `onChange` asks the panel to hold a different one —
// and `AppearancePanel` (`shared/web/appearance-panel.tsx`) is the one place
// that seeds the pending value from storage, applies it to the document, and
// writes it back, all on Save. See that file's own header for the full
// account, including why Language (the fourth control on this same panel) is
// the one exception that still applies the moment it is pressed.
//
// The mechanics that used to live in this file's `choose()` — reading and
// writing `localStorage`, setting `data-theme` / `colorScheme` on
// `document.documentElement` — are still here, just moved to plain exported
// functions (`readStoredMode`, `applyThemeMode`) the panel calls once, on
// Save. DEVICE-LOCAL AND UNTOUCHED OTHERWISE: there is still no `value`/`save`
// prop pair passed in from a server round trip — the panel's own "saved"
// baseline for this control is whatever storage already holds, read the same
// way `ModeToggle` itself reads it.
//
// `onResolvedChange` IS UNCHANGED. The shared preview beside this group takes
// an ALREADY RESOLVED `"light" | "dark"` — `AppearancePreview`'s own header
// states why it cannot take `"system"` itself: a picture has no clock. So
// this file still resolves "system" the one place that already knows how —
// `matchMedia`, the same source `ModeToggle`'s own dusk-switch reads — off
// the PENDING value now rather than an internally-owned one, and reports the
// answer up, live: a `change` listener keeps the preview correct across a
// system flip while the tab is open on "System".

import * as React from "react"

import { type ThemeMode } from "@shared/ui/components/mode-toggle/mode-toggle"

import { AppearancePillGroup, ThemeSwatch, type AppearancePillOption } from "./appearance-pill-group"
import { useLanguage } from "./language"

export type { ThemeMode }

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
 * lets clearing site data return a reader to system rather than to a guess.
 * This is `AppearancePanel`'s own "what is currently saved" baseline for
 * this control, called once on mount and again after every successful Save. */
export function readStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "system"
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored === "light" || stored === "dark" ? stored : "system"
  } catch {
    return "system"
  }
}

/** Put the choice on the document AND in storage. `light`/`dark` write the
 * attribute and the matching `colorScheme`, and the key; `system` removes
 * all three, so the media query in tokens.css keeps deciding, including when
 * the machine flips at dusk. Called ONLY from `AppearancePanel`'s Save now —
 * see this file's own header for why nothing here calls it on a press any
 * more. */
export function applyThemeMode(mode: ThemeMode): void {
  if (typeof document === "undefined") return
  const root = document.documentElement
  if (mode === "system") {
    root.removeAttribute(THEME_ATTRIBUTE)
    root.style.colorScheme = "light dark"
  } else {
    root.setAttribute(THEME_ATTRIBUTE, mode)
    root.style.colorScheme = mode
  }
  try {
    if (mode === "system") window.localStorage.removeItem(STORAGE_KEY)
    else window.localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    // Storage refused (private mode, blocked storage). The attribute above
    // still landed, so the choice holds for this page view; it just will not
    // survive a reload — the same trade `ModeToggle` itself makes, and
    // swallows the same way.
  }
}

export function ThemeSection({
  /** The PENDING choice — `AppearancePanel`'s own state, not this
   * component's. Never applied to the document by this file any more. */
  value,
  /** A different card was pressed. The panel decides what happens next —
   * update the pending value, and nothing else, until Save. */
  onChange,
  /** Told the resolved value ("light"/"dark", never "system") on mount,
   * on every press, and again whenever the machine's own scheme flips while
   * "System" is chosen — so the shared preview beside this group is never a
   * frame behind it. */
  onResolvedChange,
  /** True while `AppearancePanel`'s own Save is in flight. */
  disabled = false,
}: {
  value: ThemeMode
  onChange: (next: ThemeMode) => void
  onResolvedChange?: (resolved: "light" | "dark") => void
  disabled?: boolean
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

  // The resolved value the preview actually draws, kept correct across a
  // live system flip while "System" is the PENDING choice — unchanged from
  // before except that it now tracks `value` (a prop) instead of `chosen`
  // (a state this file no longer owns).
  const [systemDark, setSystemDark] = React.useState(false)
  React.useEffect(() => {
    if (value !== "system" || typeof window === "undefined" || typeof window.matchMedia !== "function") return
    const mql = window.matchMedia("(prefers-color-scheme: dark)")
    setSystemDark(mql.matches)
    const onMqlChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mql.addEventListener("change", onMqlChange)
    return () => mql.removeEventListener("change", onMqlChange)
  }, [value])

  const resolved: "light" | "dark" = value === "system" ? (systemDark ? "dark" : "light") : value
  React.useEffect(() => onResolvedChange?.(resolved), [resolved, onResolvedChange])

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-muted-foreground text-micro uppercase">{t("Appearance")}</h3>
      <AppearancePillGroup
        options={options}
        value={value}
        disabled={disabled}
        onValueChange={(next) => {
          if (isThemeMode(next)) onChange(next)
        }}
        ariaLabel={t("Appearance")}
      />
    </div>
  )
}
