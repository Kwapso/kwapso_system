"use client"

// THE APPEARANCE PANEL — four ROWS on the page itself: Language, Size,
// Appearance, Background. Each row is the setting's name and a short line on
// the left, its choices on the right, and every choice carries its own
// preview chip. A click applies at once — there is no pending state, no
// preview pane and no Save button.
//
// NO CONTAINER SINCE 23 SEP 2026. This read "ONE container, four ROWS" until
// Aurora ruled on it: "settings appearacne shoudl not have card - thats not
// minimal." The box was `SettingsSection`'s, and it came off there
// (`shared/web/settings-section.tsx`'s own header has the full account); what
// changed HERE is the row rule, from a `divide-y` stroke to the kit
// `<Separator>` — see the note at the return below for why the two had to
// move together.
//
// ── THE RULING THAT PUT THIS SHAPE BACK, AURORA, 22 SEP 2026 ───────────────
//
// Over the Appearance settings, in two messages the same session:
//
//   "reduce backgorund options to only balck or paper (rmoeve mango). i dont
//   like how to previsualize, lets go back to when clicking it gets
//   implemented (without needing to save)."
//
// and, after a side-by-side artifact of the redesign:
//
//   "for Appearance settings i like option one, but i want each card to have
//   some kind of preview (also for font size)" / "i like the artifact for
//   appearance, go implement it. do a speciment chip"
//
// THREE THINGS, ALL AT ONCE. (1) Background drops to two options — see
// `shared/spine.ts`'s own header for the mango retirement and why a row
// already holding it needs no migration, just the ordinary fallback. (2) NO
// PENDING STATE, NO PREVIEW, NO SAVE — every one of the four controls below
// writes through the door it already has (or the document, for Appearance)
// the instant it is pressed; `AppearanceTabPreview`, the miniature-of-this-
// page picture the 2026-09-17 staged redesign built, is deleted rather than
// kept unused — nothing shows a "what pressing this WOULD do" any more
// because pressing it simply does it, on the real page, which is the
// preview. (3) ROWS, NOT CARDS — the shape the artifact settled: a
// SettingsRow name and one short line on the left, the pills on the right,
// and every pill carries a preview chip inside itself — a flag, a light/dark/
// split ground, the real ink/paper colour, or (Size, her own words, "do a
// speciment chip") the letter pair `Aa` set AT the size that option sells.
// `SettingsRow` below is this file's own furniture; `LanguageSection`/
// `ScaleSection`/`ThemeSection`/`SpineSection` (`shared/web/*-section.tsx`)
// draw only their own pill row now, no heading of their own — this file
// supplies the name and the short line for all four.
//
// ── WHAT THIS REPLACES ──────────────────────────────────────────────────────
//
// From 2026-09-14 to 22 Sep 2026 this file held one PENDING value per
// control plus a SAVED baseline, rendered a shared live preview
// (`AppearanceTabPreview`) beside a pinned Save/Discard bar
// (`UnsavedChangesBar`), and committed all four only when Save was pressed —
// see this file's own git history for the full account of that shape and the
// two rulings that built it. NONE OF IT SURVIVES: no `pending*`/`saved*`
// state pair, no `dirty`, no `onDirtyChange` prop (nothing here can be left
// unsaved on a tab switch any more, because nothing here is ever unsaved),
// no `UnsavedChangesBar`, no `AppearanceTabPreview`. `web/components/screens/
// settings-screen.tsx` no longer tracks an Appearance draft in its own
// unsaved-tab guard for the same reason.
//
// ── EACH CONTROL WRITES THROUGH THE DOOR IT ALREADY HAD ────────────────────
//
// The four doors this file was handed did not change shape, only WHEN they
// are called — the same "the seam that moves is when, never where" this
// file's own history already established once. `saveScale`/`saveSpine` are
// still the agency's own `auth.setScale`/`auth.setSpine`
// (`settings-screen.tsx`); `saveLanguage` is still `auth.setLanguage`;
// Appearance is still device-local, `applyThemeMode` (document +
// `localStorage`, and, per `theme-section.tsx`'s own header, "cannot fail").
// What is gone is the middleman: a press calls the relevant `choose*`
// function below, and that function is the only place a door is reached now.
//
// EVERY WRITE IS OPTIMISTIC, THE SAME CONTRACT `shared/web/language-menu.tsx`
// (the portal's own compact switcher) ALREADY LIVES BY: the control shows the
// new value the instant it is pressed, the door is awaited, and — THE ONE
// THING THIS FILE HAS TO GET RIGHT FOR ITSELF — a REFUSED write reverts the
// control to what it showed before the press, not merely to what the door
// said back. Size and Background have a second, document-level effect
// (`applyScale`, and, for Background, the live rail via `saveSpine`'s own
// `active.refresh()`) that a failure must ALSO undo, or the pill would read
// correctly while the screen kept showing the value the server refused —
// `chooseScale` undoes both; `chooseSpine` has only the pill to undo, because
// (per `spine-section.tsx`'s own header) Background has no document-level
// side effect to fire optimistically in the first place, the live rail only
// ever moving once `saveSpine` itself has already succeeded. Appearance
// cannot fail (no door, no network — `theme-section.tsx`'s own header states
// this plainly) so it has nothing to revert. A FAILURE SHOWS THE SAME "That
// didn't save. Try again." toast every other door refusal in this app shows
// (`shared/i18n-seed.ts` already carries it, translated); a SUCCESS shows
// nothing — the artifact's own note, "a click is the change", is the whole
// confirmation a person needs, and four toasts for four independent presses
// would be the "too many descriptions everywhere" complaint that built R81,
// said about a different control.
//
// EACH DOOR HAS ITS OWN "BUSY" FLAG, not one shared `saving` boolean —
// pressing a Language pill must not freeze the Size row while its own door
// is still in flight; the four are independent writes to independent doors
// and a refusal on one must not read as a refusal on another.

import * as React from "react"

import { Separator } from "@shared/ui/components/separator/separator"
import { toast } from "@shared/ui/components/sonner/sonner"

import { ScaleSection, applyScale } from "./scale-section"
import { ThemeSection, applyThemeMode, readStoredMode, type ThemeMode } from "./theme-section"
import { SpineSection } from "./spine-section"
import { LanguageSection } from "./language-section"
import { toSpine, type Spine } from "../spine"
import { SCALE_STEPS } from "../scale"
import { useLanguage } from "./language"
import { type Language } from "../i18n"
import { SettingsSection } from "./settings-section"

/** One row: the setting's name and a short line on the left, its choices on
 * the right. Below `sm` the two stack — the choices cannot sit beside a
 * name once the row runs out of width to give them, so the row becomes a
 * column instead of squeezing pills into a shrinking track (the same
 * min-width failure T3662's own note on the retired preview grid already
 * named once for a different layout). */
function SettingsRow({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="flex flex-col gap-0.5 sm:max-w-[16rem] sm:shrink-0">
        <div className="text-sm font-[var(--font-weight-medium)]">{title}</div>
        <div className="text-muted-foreground text-xs">{description}</div>
      </div>
      <div className="flex flex-wrap gap-1.5 sm:justify-end">{children}</div>
    </div>
  )
}

export function AppearancePanel({
  /** Persist the language choice. Both apps pass their own `auth.setLanguage`. */
  saveLanguage,
  /** what the person currently reads at, from their own session row. */
  scaleValue,
  /** Persist the scale choice. The agency app passes its own `auth.setScale`. */
  saveScale,
  /** what the rail paints today, from the person's own session row. */
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
  const { t, lang, setLang } = useLanguage()

  // ── SIZE ───────────────────────────────────────────────────────────────
  const [scale, setScale] = React.useState(() => scaleValue ?? SCALE_STEPS[1].value)
  const [scaleBusy, setScaleBusy] = React.useState(false)
  // A prop changing under this panel — another device changed Size while
  // this tab was open — moves what is shown here the same way the old
  // per-control `useEffect` always did.
  React.useEffect(() => setScale(scaleValue ?? SCALE_STEPS[1].value), [scaleValue])

  async function chooseScale(next: string) {
    if (next === scale || scaleBusy) return
    const previous = scale
    setScale(next)
    applyScale(next, "agency") // optimistic, matches this door's own old contract
    setScaleBusy(true)
    try {
      await saveScale(next)
    } catch {
      setScale(previous)
      applyScale(previous, "agency") // undo the optimistic paint too — the document must never show what the door refused
      toast.error(t("That didn't save. Try again."))
    } finally {
      setScaleBusy(false)
    }
  }

  // ── APPEARANCE (light/dark/system) ────────────────────────────────────
  const [theme, setTheme] = React.useState<ThemeMode>("system")
  React.useEffect(() => setTheme(readStoredMode()), [])

  function chooseTheme(next: ThemeMode) {
    if (next === theme) return
    setTheme(next)
    applyThemeMode(next) // device-local: no door, no network, cannot fail — see theme-section.tsx's own header
  }

  // ── BACKGROUND ─────────────────────────────────────────────────────────
  const [spine, setSpine] = React.useState<Spine>(() => toSpine(spineValue))
  const [spineBusy, setSpineBusy] = React.useState(false)
  React.useEffect(() => setSpine(toSpine(spineValue)), [spineValue])

  async function chooseSpine(next: Spine) {
    if (next === spine || spineBusy) return
    const previous = spine
    setSpine(next)
    setSpineBusy(true)
    try {
      // `saveSpine` (the agency app's own prop, `settings-screen.tsx`) already
      // calls `active.refresh()` after `auth.setSpine` — the app-wide repaint.
      // Unlike Size, there is no document-level effect to fire optimistically
      // here (spine-section.tsx's own header states why), so a failure only
      // has the pill itself to undo.
      await saveSpine(next)
    } catch {
      setSpine(previous)
      toast.error(t("That didn't save. Try again."))
    } finally {
      setSpineBusy(false)
    }
  }

  // ── LANGUAGE ───────────────────────────────────────────────────────────
  const [languageBusy, setLanguageBusy] = React.useState(false)

  async function chooseLanguage(next: Language) {
    if (next === lang || languageBusy) return
    const previous = lang
    setLang(next) // optimistic — the identical contract language-menu.tsx's own `choose()` already lives by
    setLanguageBusy(true)
    try {
      await saveLanguage(next)
    } catch {
      setLang(previous)
      toast.error(t("That didn't save. Try again."))
    } finally {
      setLanguageBusy(false)
    }
  }

  return (
    <SettingsSection title={t("Appearance")}>
      {/* NO BOX, AND THE ROW RULE IS A `<Separator>` RATHER THAN A STROKE —
          Aurora, 23 Sep 2026: "settings appearacne shoudl not have card -
          thats not minimal." `settings-section.tsx`'s own header carries the
          ruling and what came off. Two things had to move together, not one.
          The fill/radius/inset went there; the row rule had to change HERE,
          because `divide-y` (which is what this column drew) is a literal CSS
          border between children, and R67's surviving half is that separation
          is a fill or an inset shadow, NEVER a stroke — the same finding
          `web/test/settings-minimal.test.ts`'s third census already fails
          eleven other settings files for. Inside a box it was invisible
          enough to survive; on the bare page it is the one thing the ruling
          was against. The kit `<Separator>` is the house's own answer and is
          already shipped in exactly this shape by R107
          (`web/components/work/effort-card.tsx`'s work-log rows: no fill, one
          `<Separator>` between adjacent rows and never above the first or
          below the last). It is a 1px `bg-border` ELEMENT, not a border and
          not a four-edge inset shadow, so it is untouched by the kit's own
          container-box law of the same day.

          `index > 0` RATHER THAN A SEPARATOR PER ROW: a rule belongs BETWEEN
          two rows, so there is none above the first and none below the last,
          and `SettingsRow`'s own `first:pt-0 last:pb-0` still lands — the
          first row is still this column's `:first-child` and the last is
          still its `:last-child`, because a `<Separator>` only ever sits
          between them. */}
      <div className="flex flex-col">
        {[
          <SettingsRow key="language" title={t("Language")} description={t("What the app speaks to you.")}>
            <LanguageSection value={lang} onChange={(next) => void chooseLanguage(next)} disabled={languageBusy} />
          </SettingsRow>,
          <SettingsRow key="size" title={t("Size")} description={t("Text and controls, throughout the app.")}>
            <ScaleSection value={scale} onChange={(next) => void chooseScale(next)} disabled={scaleBusy} />
          </SettingsRow>,
          <SettingsRow
            key="appearance"
            title={t("Appearance")}
            description={t("Follow the system, or choose light or dark.")}
          >
            <ThemeSection value={theme} onChange={chooseTheme} />
          </SettingsRow>,
          <SettingsRow key="background" title={t("Background")} description={t("The ground the whole window stands on.")}>
            <SpineSection value={spine} onChange={(next) => void chooseSpine(next)} disabled={spineBusy} />
          </SettingsRow>,
        ].map((row, index) => (
          <React.Fragment key={row.key}>
            {index > 0 && <Separator />}
            {row}
          </React.Fragment>
        ))}
      </div>
    </SettingsSection>
  )
}
