// SETTINGS · APPEARANCE — the client's rulings of 2026-09-17, rendered.
//
// Three of hers, in one session, all over this one tab:
//
//   (a) "In Settings > Appearance > Languages, only put the name of the
//       language in its original language. You don't need to also put it in
//       German." — the deeper, render-level check for `language-switcher.
//       test.tsx`'s own file-level one: painted through `AppearancePanel`
//       itself, not just `LanguageSection` standing alone.
//   (b) "Too many descriptions everywhere. Delete these live preview updates
//       as you press a control, and also delete the language changes right
//       away. ... I want everything to wait for the save. Nothing changes
//       right away." Two claims, both asserted against the RUNNING
//       component rather than its source: no hint sentence anywhere on the
//       tab, and no control — Language included — touches the live document
//       or calls its persistence door before Save is pressed.
//   (c) "I want the preview ... to be slightly taller ... represent more of
//       the real look of the app and include more elements inside, not just
//       one kind of card." — `AppearanceTabPreview` draws the rail, the
//       two-tab strip, one card (a title row, a toolbar bar, a three-row
//       list with a status dot each and one count badge), inside ONE paper
//       container.
//
// `web/test/form-hints.test.ts` already censuses the SOURCE for hint shapes
// across every form file; this file renders the actual tab and asserts what
// a person would see, the same "read the file vs. run it" split
// `language-switcher.test.tsx` already draws.

import type * as React from "react"

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { AppearancePanel } from "@shared/web/appearance-panel"
import { AppearanceTabPreview } from "@shared/web/appearance-tab-preview"
import { LanguageProvider } from "@shared/web/language"

afterEach(() => {
  cleanup()
  document.documentElement.removeAttribute("data-theme")
  document.documentElement.style.colorScheme = ""
  window.localStorage.clear()
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

describe("Settings › Appearance carries no hint sentence (R81, client ruling 2026-09-17)", () => {
  it("neither deleted caption is on the page", () => {
    renderPanel()
    expect(
      screen.queryByText("Live preview — updates as you press a control"),
      "the live-preview caption must be gone"
    ).toBeNull()
    expect(
      screen.queryByText(/Language changes right away/),
      "the language-is-different caption must be gone"
    ).toBeNull()
  })

  it("no bare explanatory <p> stands under any of the four sections", () => {
    renderPanel()
    const paragraphs = Array.from(document.querySelectorAll("p"))
    for (const p of paragraphs) {
      const words = (p.textContent ?? "").trim().split(/\s+/).filter(Boolean)
      expect(
        words.length < 3,
        `a bare sentence-length <p> survives on the tab: "${p.textContent}"`
      ).toBe(true)
    }
  })
})

describe("Settings › Appearance languages show their own name only (client ruling 2026-09-17)", () => {
  it("German's pill carries no English word beside it, painted through the full panel", () => {
    renderPanel()
    const pills = screen.getAllByRole("radio")
    const german = pills.find((p) => p.textContent?.includes("Deutsch"))
    expect(german, "the German pill exists").toBeTruthy()
    expect(german?.textContent, "no second name beside it").not.toContain("German")
  })
})

describe("Settings › Appearance is a draft until Save (client ruling 2026-09-17: \"nothing changes right away\")", () => {
  it("pressing Dark does not touch the document or localStorage — Save does", async () => {
    renderPanel()

    expect(document.documentElement.getAttribute("data-theme"), "untouched before any press").toBeNull()

    fireEvent.click(screen.getByRole("radio", { name: "Dark" }))

    // Still untouched — a press only moves the panel's own PENDING state.
    expect(document.documentElement.getAttribute("data-theme"), "still untouched after the press").toBeNull()
    expect(window.localStorage.getItem("theme"), "storage still untouched after the press").toBeNull()

    const saveButton = await screen.findByRole("button", { name: "Save" })
    fireEvent.click(saveButton)

    await waitFor(() => expect(document.documentElement.getAttribute("data-theme")).toBe("dark"))
    expect(window.localStorage.getItem("theme"), "storage written on Save").toBe("dark")
  })

  it("pressing a language pill does not call saveLanguage — Save does, once", async () => {
    const { saveLanguage } = renderPanel()

    const pills = screen.getAllByRole("radio")
    const german = pills.find((p) => p.textContent?.includes("Deutsch"))
    expect(german).toBeTruthy()
    fireEvent.click(german as HTMLElement)

    expect(saveLanguage, "no door call from the press alone").not.toHaveBeenCalled()

    const saveButton = await screen.findByRole("button", { name: "Save" })
    fireEvent.click(saveButton)

    await waitFor(() => expect(saveLanguage).toHaveBeenCalledTimes(1))
    expect(saveLanguage).toHaveBeenCalledWith("de")
  })

  it("pressing Size/Background pills does not call their doors — Save does", async () => {
    const { saveScale, saveSpine } = renderPanel()

    const radios = screen.getAllByRole("radio")
    const large = radios.find((r) => r.textContent?.includes("Large"))
    // Not "Mango" — `DEFAULT_SPINE` (shared/spine.ts) already IS "mango", so
    // with no `spineValue` prop the pill starts selected and a press on it
    // is a no-op (`AppearancePillGroup` skips `onValueChange` when the
    // pressed pill is already the selected one). "Ink" is a real change.
    const ink = radios.find((r) => r.textContent?.includes("Ink"))
    expect(large, "a Size pill exists").toBeTruthy()
    expect(ink, "a Background pill exists").toBeTruthy()

    fireEvent.click(large as HTMLElement)
    fireEvent.click(ink as HTMLElement)

    expect(saveScale, "no door call from a press alone").not.toHaveBeenCalled()
    expect(saveSpine, "no door call from a press alone").not.toHaveBeenCalled()

    const saveButton = await screen.findByRole("button", { name: "Save" })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(saveScale).toHaveBeenCalledTimes(1)
      expect(saveSpine).toHaveBeenCalledTimes(1)
    })
  })

  it("Discard resets every pending value, including Language, without calling any door", () => {
    const { saveLanguage, saveScale, saveSpine } = renderPanel()

    fireEvent.click(screen.getByRole("radio", { name: "Dark" }))
    const pills = screen.getAllByRole("radio")
    const german = pills.find((p) => p.textContent?.includes("Deutsch"))
    fireEvent.click(german as HTMLElement)

    const discardButton = screen.getByRole("button", { name: "Discard" })
    fireEvent.click(discardButton)

    expect(screen.queryByRole("button", { name: "Save" }), "the bar is gone once nothing is staged").toBeNull()
    expect(saveLanguage).not.toHaveBeenCalled()
    expect(saveScale).not.toHaveBeenCalled()
    expect(saveSpine).not.toHaveBeenCalled()
    expect(document.documentElement.getAttribute("data-theme"), "never applied").toBeNull()
  })
})

describe("The Appearance preview (client ruling 2026-09-17)", () => {
  beforeEach(() => cleanup())

  it("draws each listed element once, inside one paper container", () => {
    render(
      <LanguageProvider value="en">
        <AppearanceTabPreview theme="light" spine="paper" />
      </LanguageProvider>
    )

    // ONE paper container — R67's own "not a card inside a card": a single
    // floating <Card>, never a card standing inside another.
    const cards = document.querySelectorAll('[data-slot="card"]')
    expect(cards.length, "exactly one floating card").toBe(1)
    expect(
      cards[0]?.querySelector('[data-slot="card"]'),
      "no card nested inside the one card"
    ).toBeNull()

    // The rail strip.
    expect(document.querySelectorAll('[data-slot="preview-rail"]').length, "one rail strip").toBe(1)

    // A tab strip with two tabs.
    expect(document.querySelectorAll('[data-slot="preview-tab"]').length, "two tabs").toBe(2)

    // One mango title action, inside the card.
    const titleAction = document.querySelector('[data-slot="preview-title-action"]')
    expect(titleAction, "one title action").toBeTruthy()
    expect(cards[0]?.contains(titleAction), "the title action sits inside the card").toBe(true)

    // A toolbar row, inside the card.
    const toolbar = document.querySelector('[data-slot="preview-toolbar"]')
    expect(toolbar, "one toolbar row").toBeTruthy()
    expect(cards[0]?.contains(toolbar), "the toolbar sits inside the card").toBe(true)

    // A list of three rows, each with its own status dot, and one badge
    // beyond the three dots (the count badge on the third row).
    const rows = document.querySelectorAll('[role="listitem"]')
    expect(rows.length, "three rows").toBe(3)
    const dots = document.querySelectorAll('[data-slot="badge-dot"]')
    expect(dots.length, "one status dot per row").toBe(3)
    const badges = document.querySelectorAll('[data-slot="badge"]')
    expect(badges.length, "three status badges plus one count badge").toBe(4)
  })

  it("names the height token — taller than the kit's retired 17rem picture", async () => {
    const { APPEARANCE_PREVIEW_MIN_HEIGHT } = await import("@shared/web/appearance-tab-preview")
    expect(APPEARANCE_PREVIEW_MIN_HEIGHT).toBe("min-h-[22rem]")
  })
})
