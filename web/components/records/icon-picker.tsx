"use client"

// ONE GRID FOR PICKING A KIT ICON BY NAME — the client's ruling, 17 Sep 2026,
// over the app record's own Modules tab: "When I add a module, I should be
// able to select an icon for it."
//
// A GRID OF BUTTONS, not a `<Select>`: the whole point is to SEE the glyph
// before choosing it (the same reason the vocabulary fields on this form are
// pick-or-create text inputs rather than a dropdown for a different reason —
// here the reason is legibility, not growth). Each button draws the kit's own
// `Icon`, so what is offered is never a name the kit fails to resolve —
// `web/test/module-icons.test.tsx` also asserts that of the whole list this
// reads, but the picker itself can only ever show what actually renders.
//
// NO SEARCH BOX: the list this draws is meant to stay small (curated,
// "app-relevant" glyphs — see shared/module-icons.ts's own header), a wall a
// person can scan in one glance rather than a catalogue to search.
//
// GENERIC ON PURPOSE — `names`/`value`/`onChange`/`defaultName`, not
// module-specific — so the next form that needs one (a Choices vocabulary
// value, a meeting type) reaches for this rather than a second hand-rolled
// grid.

import { Icon, type IconName } from "@shared/web/screen-engine/icon"
import { cn } from "@shared/ui/lib/utils"

import { useT } from "@shared/web/language"

export function IconPicker({
  names,
  value,
  onChange,
  defaultName,
  disabled,
}: {
  /** The offered glyphs, already narrowed to what is "relevant" here — the
   * picker draws every one of them and nothing else. */
  names: readonly IconName[]
  /** The chosen name, or empty when nobody has picked one yet — the cell for
   * `defaultName` then draws with the SELECTED look, since "nothing chosen"
   * and "the default" are the same glyph on screen. */
  value: string
  onChange: (name: IconName) => void
  /** Drawn (and treated as selected) when `value` is empty — the same glyph
   * the record falls back to when nothing was ever saved. */
  defaultName: IconName
  disabled?: boolean
}) {
  const t = useT()
  const selected = value || defaultName
  return (
    <div
      role="group"
      aria-label={t("Icon")}
      className="grid grid-cols-6 gap-2 sm:grid-cols-8"
    >
      {names.map((name) => (
        <button
          key={name}
          type="button"
          aria-pressed={name === selected}
          aria-label={name}
          disabled={disabled}
          onClick={() => onChange(name)}
          className={cn(
            // THE PICKED CELL'S RING IS AN INSET SHADOW, NOT A BORDER — the
            // kit's own borders law (shared/ui/foundations/rules/, run
            // through web/test/kit-conformance.test.ts) refuses a raw CSS
            // border outright; this is the identical treatment
            // google-source-dialog.tsx's mode cards already use for the same
            // "which one is chosen" ring, kit §2.7.
            "flex size-9 items-center justify-center rounded-[var(--radius)] motion-hover",
            name === selected
              ? "bg-accent shadow-[inset_0_0_0_0.0625rem_var(--primary)]"
              : "hover:bg-accent"
          )}
        >
          <Icon name={name} className="size-4" />
        </button>
      ))}
    </div>
  )
}
