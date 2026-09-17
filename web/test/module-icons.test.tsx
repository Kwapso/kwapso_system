// THE MODULE ICON CHOICES ACTUALLY RESOLVE, AND THE PICKER OFFERS ONLY THOSE.
//
// Client's ruling, 17 Sep 2026, verbatim: "Inside an app, the tabs module: I
// want it to look exactly like the settings modules, this kind of gallery
// with the icons. When I add a module, I should be able to select an icon
// for it."
//
// TWO PROOFS:
//   1. `MODULE_ICON_NAMES` (shared/module-icons.ts) is a reasoned, rot-checked
//      allow-list — every name in it must resolve to a real glyph through the
//      SAME seam the rest of the app draws icons through
//      (`iconComponent`, shared/web/screen-engine/icon.tsx), so a name that
//      stops being drawn (an icon pack swap, a kit regeneration that drops a
//      glyph) turns THIS build red rather than shipping a blank well.
//   2. `IconPicker` (web/components/records/icon-picker.tsx), the control the
//      add/edit form's own `moduleFields()` wires up, renders EXACTLY the
//      names it is handed — one button per name, nothing invented, nothing
//      dropped — proved by actually rendering it (not by reading the source),
//      so it locks the CONTRACT rather than today's implementation.

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { DEFAULT_MODULE_ICON, MODULE_ICON_NAMES } from "@shared/module-icons"
import { iconComponent } from "@shared/web/screen-engine/icon"
import { IconPicker } from "@/components/records/icon-picker"

vi.mock("@shared/web/language", () => ({ useT: () => (s: string) => s }))

afterEach(cleanup)

describe("MODULE_ICON_NAMES — the reasoned allow-list rot-checks against the kit's own census", () => {
  it("every name resolves to a real glyph through iconComponent", () => {
    const unresolved = MODULE_ICON_NAMES.filter((name) => iconComponent(name) === null)
    expect(unresolved, `these module icon names draw nothing at all: ${unresolved.join(", ")}`).toEqual([])
  })

  it("has no duplicate names", () => {
    expect(new Set(MODULE_ICON_NAMES).size).toBe(MODULE_ICON_NAMES.length)
  })

  it("DEFAULT_MODULE_ICON is itself one of the offered names", () => {
    expect(MODULE_ICON_NAMES).toContain(DEFAULT_MODULE_ICON)
  })
})

describe("IconPicker — renders exactly the names it is handed, never the kit's whole catalogue", () => {
  it("draws one button per name in `names`, and nothing outside that list", () => {
    render(
      <IconPicker names={MODULE_ICON_NAMES} value="" defaultName={DEFAULT_MODULE_ICON} onChange={() => undefined} />
    )
    const buttons = screen.getAllByRole("button")
    expect(buttons).toHaveLength(MODULE_ICON_NAMES.length)
    for (const name of MODULE_ICON_NAMES) expect(screen.getByLabelText(name)).toBeTruthy()
  })

  it("marks the current value as pressed, and calls back with the name clicked", () => {
    const onChange = vi.fn()
    const chosen = MODULE_ICON_NAMES[3]
    render(
      <IconPicker names={MODULE_ICON_NAMES} value={chosen} defaultName={DEFAULT_MODULE_ICON} onChange={onChange} />
    )
    expect(screen.getByLabelText(chosen).getAttribute("aria-pressed")).toBe("true")
    const other = MODULE_ICON_NAMES[7]
    screen.getByLabelText(other).click()
    expect(onChange).toHaveBeenCalledWith(other)
  })

  it("an empty value reads as the default — the default's cell is the one marked pressed", () => {
    render(
      <IconPicker names={MODULE_ICON_NAMES} value="" defaultName={DEFAULT_MODULE_ICON} onChange={() => undefined} />
    )
    expect(screen.getByLabelText(DEFAULT_MODULE_ICON).getAttribute("aria-pressed")).toBe("true")
  })
})
