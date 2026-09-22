// SETTINGS · APPEARANCE — Aurora's rulings of 22 Sep 2026, rendered and
// censused.
//
// Two messages, the same session, both over the Appearance tab:
//
//   "reduce backgorund options to only balck or paper (rmoeve mango). i dont
//   like how to previsualize, lets go back to when clicking it gets
//   implemented (without needing to save)."
//
// and, over a side-by-side artifact of the redesign:
//
//   "for Appearance settings i like option one, but i want each card to have
//   some kind of preview (also for font size)" / "i like the artifact for
//   appearance, go implement it. do a speciment chip"
//
// FOUR CLAIMS, proved two ways each — read the SOURCE (a static census, so a
// regression cannot hide behind a jsdom limitation) and RUN the component
// (so "the source says X" and "a person sees X" stay the same claim):
//
//   1. Background offers Ink and Paper only — never Mango again.
//   2. A control writes at once: no pending value, no preview, no Save
//      button, anywhere on this tab.
//   3. A refused write reverts the control to what it showed before the
//      press — it never keeps showing a state the server did not accept.
//   4. Every row: a name and a short line on the left, choices on the right,
//      each choice carrying its own preview chip — Size's own chip is a
//      letter-pair SPECIMEN set at the size it sells ("do a speciment
//      chip").
//
// `web/test/form-hints.test.ts` already censuses hint shapes across every
// form file from the SOURCE; this file renders the actual tab and asserts
// what a person would see, the same "read the file vs. run it" split
// `language-switcher.test.tsx` already draws.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import type * as React from "react"

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@shared/ui/components/sonner/sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

import { AppearancePanel } from "@shared/web/appearance-panel"
import { LanguageProvider } from "@shared/web/language"
import { toast } from "@shared/ui/components/sonner/sonner"

const ROOT = join(__dirname, "..", "..")
const read = (p: string) => readFileSync(join(ROOT, p), "utf8")

const PANEL = "shared/web/appearance-panel.tsx"
const SPINE = "shared/spine.ts"

afterEach(() => {
  cleanup()
  document.documentElement.removeAttribute("data-theme")
  document.documentElement.style.colorScheme = ""
  document.documentElement.style.fontSize = ""
  window.localStorage.clear()
  vi.clearAllMocks()
})

function renderPanel(overrides: Partial<React.ComponentProps<typeof AppearancePanel>> = {}) {
  const saveLanguage = vi.fn().mockResolvedValue(undefined)
  const saveScale = vi.fn().mockResolvedValue(undefined)
  const saveSpine = vi.fn().mockResolvedValue(undefined)
  render(
    <LanguageProvider value="en">
      <AppearancePanel
        saveLanguage={saveLanguage}
        scaleValue={null}
        saveScale={saveScale}
        spineValue={null}
        saveSpine={saveSpine}
        {...overrides}
      />
    </LanguageProvider>
  )
  return { saveLanguage, saveScale, saveSpine }
}

// ── 1. MANGO CANNOT RETURN AS A BACKGROUND OPTION ───────────────────────────
//
// Keyed by the EXPRESSION each fact lives in, never by a line number — a
// line number rots on the next edit above it; the declaration's own shape
// does not. Both censuses would catch a stray `"mango"` slipped back into
// EITHER the allow-list or the type, even though the surrounding file is
// FULL of the word in its own prose (the retirement is a historical fact
// this file records at length) — a whole-file substring check would be
// blind the moment that prose exists, which is why this reads the two
// declarations positionally instead of the file as a whole.

describe("R: mango cannot return as a Background option (shared/spine.ts, 22 Sep 2026)", () => {
  const src = read(SPINE)

  it("the Spine union type names only ink and paper", () => {
    const match = src.match(/export type Spine = ([^\n]+)/)
    expect(match, "the Spine type declaration must be findable").toBeTruthy()
    expect(match![1]).not.toContain("mango")
    expect(match![1]).toContain('"ink"')
    expect(match![1]).toContain('"paper"')
  })

  it("SPINE_VALUES, the door's own allow-list, lists only ink and paper", () => {
    const match = src.match(/export const SPINE_VALUES: readonly Spine\[\] = (\[[^\]]*\])/)
    expect(match, "the SPINE_VALUES declaration must be findable").toBeTruthy()
    expect(match![1]).not.toContain("mango")
    expect(match![1]).toContain("ink")
    expect(match![1]).toContain("paper")
  })

  it("DEFAULT_SPINE, the fallback, is a value SPINE_VALUES still offers", () => {
    const match = src.match(/export const DEFAULT_SPINE: Spine = "([a-z]+)"/)
    expect(match, "the DEFAULT_SPINE declaration must be findable").toBeTruthy()
    expect(["ink", "paper"]).toContain(match![1])
  })

  it("a stored 'mango' row still resolves to the fallback, never a thrown value", async () => {
    const { toSpine, DEFAULT_SPINE } = await import("@shared/spine")
    expect(toSpine("mango")).toBe(DEFAULT_SPINE)
  })

  it("painted: Background offers exactly two pills, and neither says Mango", () => {
    renderPanel()
    const radios = screen.getAllByRole("radio")
    const backgroundPills = radios.filter((r) => /\b(Ink|Paper|Mango)\b/.test(r.textContent ?? ""))
    expect(backgroundPills, "exactly Ink and Paper, never a third").toHaveLength(2)
    expect(backgroundPills.some((r) => r.textContent?.includes("Mango")), "Mango must not be offered").toBe(false)
  })
})

// ── 2. NO PENDING STATE, NO PREVIEW, NO SAVE BUTTON ─────────────────────────

describe("R: no pending state and no Save button can come back (shared/web/appearance-panel.tsx, 22 Sep 2026)", () => {
  const src = read(PANEL)

  it("holds no pending/saved state pair, and no dirty flag — the shape a Save button needs to stage behind", () => {
    expect(src).not.toMatch(/\bpending[A-Z]\w*/)
    expect(src).not.toMatch(/\bsaved[A-Z]\w*/)
    // A `const [dirty, ...]`/`useState<boolean>` dirty FLAG, never the bare
    // word — the header legitimately says "no dirty" in prose (stating its
    // own absence), which a whole-file word search cannot tell apart from a
    // real declaration.
    expect(src, "no dirty state declared").not.toMatch(/\[\s*dirty\s*,/)
  })

  it("imports neither the kit's UnsavedChangesBar nor the retired live preview", () => {
    // Positional — the IMPORT line, never a bare substring search: this
    // file's own header names both `AppearanceTabPreview` and
    // `UnsavedChangesBar` several times over, in prose, as the historical
    // record of what it used to render. A whole-file substring check would
    // be blind to that prose the same way a whole-file "mango" check would
    // be blind to spine.ts's own retirement notes — see that file's sibling
    // census above for the identical reasoning.
    expect(src).not.toMatch(/^import .*unsaved-changes-bar.*$/m)
    expect(src).not.toMatch(/^import .*appearance-tab-preview.*$/m)
  })

  it("never composes a Save or Discard label", () => {
    expect(src).not.toMatch(/t\("Save"\)/)
    expect(src).not.toMatch(/t\("Discard"\)/)
  })

  it("painted: no button named Save or Discard exists, before or after every control is pressed", async () => {
    renderPanel()
    for (const radio of screen.getAllByRole("radio")) fireEvent.click(radio)
    await waitFor(() => {
      // give every optimistic press a tick to settle
    })
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Discard" })).toBeNull()
  })

  it("painted: pressing Dark touches the document at once — no Save needed", () => {
    renderPanel()
    expect(document.documentElement.getAttribute("data-theme")).toBeNull()
    fireEvent.click(screen.getByRole("radio", { name: "Dark" }))
    expect(document.documentElement.getAttribute("data-theme"), "applied the instant the pill was pressed").toBe(
      "dark"
    )
    expect(window.localStorage.getItem("theme")).toBe("dark")
  })

  it("painted: pressing a language pill calls saveLanguage at once — no Save needed", async () => {
    const { saveLanguage } = renderPanel()
    const pills = screen.getAllByRole("radio")
    const german = pills.find((p) => p.textContent?.includes("Deutsch"))
    expect(german).toBeTruthy()
    fireEvent.click(german as HTMLElement)
    await waitFor(() => expect(saveLanguage).toHaveBeenCalledWith("de"))
  })

  it("painted: pressing Size/Background pills call their doors at once — no Save needed", async () => {
    const { saveScale, saveSpine } = renderPanel()
    fireEvent.click(screen.getByRole("radio", { name: /Large/ }))
    fireEvent.click(screen.getByRole("radio", { name: /^Ink/ }))
    await waitFor(() => {
      expect(saveScale).toHaveBeenCalledTimes(1)
      expect(saveSpine).toHaveBeenCalledTimes(1)
    })
  })
})

// ── 3. A REFUSED WRITE REVERTS, IT NEVER KEEPS SHOWING WHAT THE SERVER
//    DID NOT ACCEPT ──────────────────────────────────────────────────────────

describe("a refused write reverts the control, not just the toast", () => {
  it("Size: a failed save undoes both the pill and the document's own font size", async () => {
    const saveScale = vi.fn().mockRejectedValue(new Error("nope"))
    renderPanel({ saveScale })

    fireEvent.click(screen.getByRole("radio", { name: /Large/ }))
    // optimistic: the document paints the new size right away
    await waitFor(() => expect(saveScale).toHaveBeenCalled())

    await waitFor(() => expect(screen.getByRole("radio", { name: /Regular/ }).getAttribute("aria-checked")).toBe("true"))
    expect(screen.getByRole("radio", { name: /Large/ }).getAttribute("aria-checked")).toBe("false")
    expect(vi.mocked(toast.error)).toHaveBeenCalled()
  })

  it("Background: a failed save reverts the pill to what it showed before the press", async () => {
    const saveSpine = vi.fn().mockRejectedValue(new Error("nope"))
    renderPanel({ saveSpine })

    fireEvent.click(screen.getByRole("radio", { name: /^Ink/ }))
    await waitFor(() => expect(saveSpine).toHaveBeenCalled())

    await waitFor(() => expect(screen.getByRole("radio", { name: /^Paper/ }).getAttribute("aria-checked")).toBe("true"))
    expect(screen.getByRole("radio", { name: /^Ink/ }).getAttribute("aria-checked")).toBe("false")
    expect(vi.mocked(toast.error)).toHaveBeenCalled()
  })

  it("Language: a failed save reverts the pill to the language that was actually showing", async () => {
    const saveLanguage = vi.fn().mockRejectedValue(new Error("nope"))
    renderPanel({ saveLanguage })

    const pills = screen.getAllByRole("radio")
    const german = pills.find((p) => p.textContent?.includes("Deutsch")) as HTMLElement
    fireEvent.click(german)
    await waitFor(() => expect(saveLanguage).toHaveBeenCalled())

    await waitFor(() => {
      const english = screen.getAllByRole("radio").find((p) => p.textContent?.includes("English"))
      expect(english?.getAttribute("aria-checked")).toBe("true")
    })
    expect(vi.mocked(toast.error)).toHaveBeenCalled()
  })
})

// ── 4. ROWS, AND EVERY CHOICE PREVIEWS ITSELF ───────────────────────────────

describe("Settings · Appearance is a row layout — name and a short line on the left, previewing choices on the right", () => {
  it("draws exactly four rows: Language, Size, Appearance, Background, in that order", () => {
    renderPanel()
    const groups = screen.getAllByRole("radiogroup")
    expect(groups, "one radiogroup per row").toHaveLength(4)
    expect(groups.map((g) => g.getAttribute("aria-label"))).toEqual([
      "Language",
      "Size",
      "Appearance",
      "Background",
    ])
  })

  it("Size's own pills carry a specimen chip — the same two letters, set at three different sizes", () => {
    renderPanel()
    const sizeGroup = screen.getByRole("radiogroup", { name: "Size" })
    const specimens = Array.from(sizeGroup.querySelectorAll("span")).filter((el) => el.textContent === "Aa")
    expect(specimens, "one Aa specimen per Size pill").toHaveLength(3)
    const sizes = new Set(specimens.map((el) => el.className))
    expect(sizes.size, "the three specimens are not all drawn at the same size").toBe(3)
  })

  it("Background's pills carry the real ink and paper colours, not a picture", () => {
    renderPanel()
    const backgroundGroup = screen.getByRole("radiogroup", { name: "Background" })
    const swatches = backgroundGroup.querySelectorAll("[data-spine]")
    expect(Array.from(swatches).map((s) => s.getAttribute("data-spine")).sort()).toEqual(["ink", "paper"])
  })

  it("Appearance's pills carry a light ground, a dark ground, and a split chip for System", () => {
    renderPanel()
    const appearanceGroup = screen.getByRole("radiogroup", { name: "Appearance" })
    for (const label of ["Light", "Dark", "System"])
      expect(
        Array.from(appearanceGroup.querySelectorAll("[role=radio]")).some((r) => r.textContent?.includes(label)),
        `the ${label} pill exists`
      ).toBe(true)
  })

  it("Language's pills carry a flag", () => {
    renderPanel()
    const languageGroup = screen.getByRole("radiogroup", { name: "Language" })
    expect(languageGroup.textContent, "at least one flag glyph is present").toMatch(
      /[\u{1F1E6}-\u{1F1FF}]{2}|\u{1F3F4}/u
    )
  })

  it("each row names its setting and a short line about it, outside the choices themselves", () => {
    renderPanel()
    expect(screen.getByText("What the app speaks to you.")).toBeTruthy()
    expect(screen.getByText("Text and controls, throughout the app.")).toBeTruthy()
    expect(screen.getByText("Follow the system, or choose light or dark.")).toBeTruthy()
    expect(screen.getByText("The ground the whole window stands on.")).toBeTruthy()
  })
})
