"use client"

// LIGHT, DARK OR THE MACHINE'S OWN — one row on Settings · Appearance's row
// layout (`shared/web/appearance-panel.tsx`), a colour swatch on every pill.
//
// APPLIES AT ONCE, 22 SEP 2026 (AGAIN). Aurora: "lets go back to when
// clicking it gets implemented (without needing to save)." A press here
// applies instantly — `AppearancePanel` flips the document's `data-theme`
// attribute and `colorScheme`, and writes `localStorage`, through
// `applyThemeMode` below, the moment a pill is pressed. This file still owns
// no state, reads no storage and touches no `document` itself — it is a
// plain, controlled pill row exactly as it was mid-2026-09-14 to 22 Sep 2026
// (the staged, Save-gated version, kept below as the historical record) —
// only the CALLER'S contract changed back to immediate.
//
// ═══════════════════ THE STAGED HISTORY (superseded) ═══════════════════════
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
// STAGED, SAME DAY, SECOND RULING (REVERSED 22 SEP 2026, ABOVE). "We need …
// some kind of save button so that I can first preview it and, once I'm
// happy with what I see, implement it across the app." This component used
// to apply instantly, then staged behind a controlled `value`/`onChange`
// with `AppearancePanel`'s own Save doing the writing — the shape this file
// is back to now, just owned by the panel again rather than by a pending
// value it held.
//
// The mechanics that used to live in this file's `choose()` — reading and
// writing `localStorage`, setting `data-theme` / `colorScheme` on
// `document.documentElement` — are still here, just moved to plain exported
// functions (`readStoredMode`, `applyThemeMode`) `AppearancePanel` calls, the
// instant a pill is pressed once more. DEVICE-LOCAL AND UNTOUCHED OTHERWISE:
// there is still no `value`/`save` prop pair passed in from a server round
// trip — the panel's own baseline for this control is whatever storage
// already holds, read the same way `ModeToggle` itself reads it.
//
// `onResolvedChange` IS GONE, 22 SEP 2026, WITH THE PREVIEW IT FED. It
// existed for exactly one reason — telling `AppearanceTabPreview` an already-
// resolved `"light" | "dark"`, because a picture has no clock and cannot
// read "system" itself — and that preview is deleted along with the rest of
// the pending/Save shape (see this file's own header). The `matchMedia`
// resolution it drove went with it: nothing downstream of this component
// needs to know which way "System" currently resolves, only that "system"
// was pressed, which `value` already says.

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
  /** The CURRENT choice — `AppearancePanel`'s own state, applied to the
   * document the instant it changes. This file never touches the document
   * itself; it only reports which pill was pressed. */
  value,
  /** A different pill was pressed. The panel applies it at once. */
  onChange,
  /** True while `AppearancePanel`'s own write for THIS control is in flight
   * — device-local writes never fail, so this stays `false` in practice, but
   * the prop survives for the same controlled shape its three neighbours
   * take. */
  disabled = false,
}: {
  value: ThemeMode
  onChange: (next: ThemeMode) => void
  disabled?: boolean
}) {
  const { t } = useLanguage()

  // PILLS: no picture, no per-option description. A swatch survives, though
  // — her own second instruction, "also in appearance add colors (like in
  // background)": the same mark Background's own pills carry, same size,
  // same shape, same position, resolved through `ThemeSwatch`'s own tokens.
  const options: readonly AppearancePillOption[] = [
    { value: "light", label: t("Light"), swatch: <ThemeSwatch tone="light" /> },
    { value: "dark", label: t("Dark"), swatch: <ThemeSwatch tone="dark" /> },
    { value: "system", label: t("System"), swatch: <ThemeSwatch tone="system" /> },
  ]

  return (
    <AppearancePillGroup
      options={options}
      value={value}
      disabled={disabled}
      onValueChange={(next) => {
        if (isThemeMode(next)) onChange(next)
      }}
      ariaLabel={t("Appearance")}
    />
  )
}
