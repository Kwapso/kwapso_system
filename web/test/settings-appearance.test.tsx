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
//       one kind of card." Superseded the same day by a fourth ruling — see
//       (d) below — but the height floor it set survives unchanged.
//   (d) "Good, the language part. However, I'm not happy with the pre-
//       visualization ... " and her pick over the side-by-side artifact,
//       "appearance p1" = "Miniature of this very page". `AppearanceTab
//       Preview` now draws the actual frame this tab sits inside: the rail
//       with its real groups and destinations, the workspace top strip with
//       the open "Settings" tab and the pinned "+", and the content card
//       holding Settings' own tab strip and a miniature of the Appearance
//       panel itself — see that file's own header for the full account,
//       including why the real shell cannot be mounted live and why its
//       words are transcribed rather than imported.
//
// `web/test/form-hints.test.ts` already censuses the SOURCE for hint shapes
// across every form file; this file renders the actual tab and asserts what
// a person would see, the same "read the file vs. run it" split
// `language-switcher.test.tsx` already draws.

import type * as React from "react"

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { AppearancePanel } from "@shared/web/appearance-panel"
import { AppearanceTabPreview, RAIL_GROUPS } from "@shared/web/appearance-tab-preview"
import { LanguageProvider } from "@shared/web/language"
// THE ROT-CHECK'S OWN ORACLE — this test file lives inside web/'s own
// program (unlike shared/web/, which the portal's tsconfig also compiles),
// so IT may import the live rail registry directly. See appearance-tab-
// preview.tsx's own header, "WALL 3, THE REGISTRY ITSELF", for why the
// component itself may not.
import { NAV_GROUP_LABELS, NAV_GROUP_ORDER, TEAM_SECTIONS } from "@/lib/pages"

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

describe("Settings › Appearance's grid columns can shrink below their content (T3662, mobile sweep 2026-09-19)", () => {
  // Below `lg` the panel's `grid` has ONE implicit column, so the preview
  // and the controls column share ONE track — and a grid item's default
  // `min-width` is `auto` (its max-content size), never 0. The preview box
  // carries `aspect-[16/10]` with `min-h-[22rem]`; with no `min-w-0` on its
  // column, the browser transfers that height floor through the ratio into
  // a ~563px min-content WIDTH, the shared track grows to fit it, and the
  // language/size/appearance/background column on the other row — sharing
  // the same track — is dragged out to that same width and clipped by the
  // shell's own `overflow-hidden`. Measured live on staging at a 375px
  // viewport (agency-staging.kwapso.app/settings, alaap@kwapso.com): the
  // track rendered 634px wide and the language pill row's own available
  // width was 1014px, both cut off with no scroll to reach "Català" or
  // anything past it. jsdom does not run real layout (no aspect-ratio, no
  // grid track sizing), so this cannot reproduce the pixel overflow itself —
  // it instead locks the one class that prevents it, the same way every
  // other constrained box already surviving in this screen's ancestor chain
  // carries it.
  it("both grid-item columns carry min-w-0", () => {
    renderPanel()
    const preview = document.querySelector('[data-slot="appearance-preview-column"]')
    const controls = document.querySelector('[data-slot="appearance-controls-column"]')
    expect(preview, "the preview column exists").toBeTruthy()
    expect(controls, "the controls column exists").toBeTruthy()
    expect(preview?.className, "preview column must allow shrinking below its aspect-ratio content").toMatch(
      /\bmin-w-0\b/
    )
    expect(controls?.className, "controls column must allow shrinking below the preview's forced track width").toMatch(
      /\bmin-w-0\b/
    )
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

// A minimal ResizeObserver double for the "scales with the container" test
// below — jsdom ships none, and the component itself already guards for
// that (`typeof ResizeObserver === "undefined"`, the same guard the kit's
// own `Clamp` uses). Recording the constructed instance is enough to fire
// its callback by hand, standing in for a real layout resize.
class FakeResizeObserver {
  static instances: FakeResizeObserver[] = []
  private readonly callback: ResizeObserverCallback
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
    FakeResizeObserver.instances.push(this)
  }
  observe() {
    /* no-op — the test drives `trigger()` directly */
  }
  unobserve() {}
  disconnect() {}
  trigger() {
    this.callback([] as unknown as ResizeObserverEntry[], this as unknown as ResizeObserver)
  }
}

describe("The Appearance preview — a miniature of this very page (client ruling 2026-09-17, 'appearance p1')", () => {
  beforeEach(() => cleanup())

  it("draws the rail's real groups and destinations, the workspace top strip, and the Settings content card — once each, inside one paper container", () => {
    render(
      <LanguageProvider value="en">
        <AppearanceTabPreview theme="light" spine="paper" />
      </LanguageProvider>
    )

    // ONE paper container — R67's own "not a card inside a card": a single
    // floating <Card>, standing for ScreenShell's own card, never a card
    // standing inside another.
    const cards = document.querySelectorAll('[data-slot="card"]')
    expect(cards.length, "exactly one floating card").toBe(1)
    expect(
      cards[0]?.querySelector('[data-slot="card"]'),
      "no card nested inside the one card"
    ).toBeNull()

    // THE RAIL — three real groups (My work / Build / Accounts,
    // NAV_GROUP_ORDER in web/lib/pages.ts), each carrying its own real
    // destinations, never a bare empty strip.
    expect(document.querySelectorAll('[data-slot="preview-rail"]').length, "one rail").toBe(1)
    const railGroups = document.querySelectorAll('[data-slot="preview-rail-group"]')
    expect(railGroups.length, "three named rail groups").toBe(3)
    const railText = document.querySelector('[data-slot="preview-rail"]')?.textContent ?? ""
    for (const destination of ["Tasks", "Meetings", "Knowledge", "Waves", "Apps", "Backlog", "Accounts", "Tickets", "Contacts", "Inputs"]) {
      expect(railText.includes(destination), `the rail names the real destination "${destination}"`).toBe(true)
    }
    // Never a fabricated destination — the rail draws nothing this app does
    // not actually navigate to.
    expect(railText.includes("Lorem"), "no placeholder text in the rail").toBe(false)

    // THE WORKSPACE TOP STRIP — the open "Settings" tab (this very page,
    // always active in the picture) and the pinned "+".
    const openTabs = document.querySelectorAll('[data-slot="preview-tab"]')
    expect(openTabs.length, "one open tab").toBe(1)
    expect(openTabs[0]?.textContent, "the open tab is this very page").toBe("Settings")
    expect(document.querySelector('[data-slot="preview-tab-new"]'), "the pinned + tab").toBeTruthy()

    // THE CARD'S OWN CONTENT — Settings' real tab strip (Appearance leads
    // and is active, since the picture is always drawn from that tab), and
    // a miniature of the Appearance panel's own four sections.
    const settingsTabs = document.querySelectorAll('[data-slot="preview-settings-tab"]')
    expect(settingsTabs.length, "seven Settings tabs").toBe(7)
    expect(settingsTabs[0]?.textContent, "Appearance leads").toBe("Appearance")
    expect(settingsTabs[0]?.getAttribute("data-active"), "Appearance is the active tab").toBe("")
    for (const label of ["Members", "Roles", "Integrations", "Modules", "Automations", "Choices"]) {
      expect(cards[0]?.textContent?.includes(label), `Settings' own "${label}" tab is drawn`).toBe(true)
    }

    const miniPanel = document.querySelector('[data-slot="preview-appearance-panel"]')
    expect(miniPanel, "the mini Appearance panel").toBeTruthy()
    expect(cards[0]?.contains(miniPanel), "the mini panel sits inside the card").toBe(true)
    for (const label of ["Language", "Size", "Appearance", "Background"]) {
      expect(miniPanel?.textContent?.includes(label), `the mini panel names its "${label}" section`).toBe(true)
    }
  })

  it("names the height token — taller than the kit's retired 17rem picture", async () => {
    const { APPEARANCE_PREVIEW_MIN_HEIGHT } = await import("@shared/web/appearance-tab-preview")
    expect(APPEARANCE_PREVIEW_MIN_HEIGHT).toBe("min-h-[22rem]")
  })

  it("reflects a draft theme change on its own subtree while the document root stays unchanged", () => {
    render(
      <LanguageProvider value="en">
        <AppearanceTabPreview theme="dark" spine="paper" />
      </LanguageProvider>
    )
    const box = document.querySelector('[role="img"]')
    expect(box?.getAttribute("data-theme"), "the box carries the pending theme").toBe("dark")
    expect(
      document.documentElement.getAttribute("data-theme"),
      "the real document root never moves — nothing here waits for Save"
    ).toBeNull()
  })

  it("scales the fixed 1280px design frame to the container's own measured width", async () => {
    const originalRO = globalThis.ResizeObserver
    // A test double standing in for the browser's own ResizeObserver — `Reflect.set`
    // rather than a direct assignment so no `@ts-expect-error` is needed for the
    // narrower constructor shape.
    Reflect.set(globalThis, "ResizeObserver", FakeResizeObserver)
    FakeResizeObserver.instances = []
    try {
      render(
        <LanguageProvider value="en">
          <AppearanceTabPreview theme="light" spine="paper" />
        </LanguageProvider>
      )
      const box = document.querySelector('[role="img"]') as HTMLElement
      const frame = document.querySelector('[data-slot="preview-frame"]') as HTMLElement
      Object.defineProperty(box, "clientWidth", { value: 640, configurable: true })
      const observer = FakeResizeObserver.instances.at(-1)
      expect(observer, "the component observed the box").toBeTruthy()
      observer?.trigger()
      await waitFor(() => expect(frame.style.transform).toBe("scale(0.5)"))
    } finally {
      Reflect.set(globalThis, "ResizeObserver", originalRO)
    }
  })
})

describe("The preview's rail transcription does not drift from the live registry (rot-check)", () => {
  it("RAIL_GROUPS names exactly the live sidebar groups, in the live order, each with its real destinations", () => {
    // Rebuilt straight off web/lib/pages.ts — the same derivation web-shell.tsx's
    // own `namedGroups` uses (NAV_GROUP_ORDER, then each group's `placement:
    // "sidebar"` rows in file order) — never hand-typed here, so a rename or a
    // re-order in the live registry fails THIS assertion instead of rotting
    // inside the transcription silently.
    const expected = NAV_GROUP_ORDER.map((group) => ({
      heading: NAV_GROUP_LABELS[group],
      items: TEAM_SECTIONS.filter((s) => s.placement === "sidebar" && (s.group ?? "my-work") === group).map(
        (s) => s.title
      ),
    })).filter((g) => g.items.length > 0)

    expect(RAIL_GROUPS.map((g) => g.heading)).toEqual(expected.map((g) => g.heading))
    expect(RAIL_GROUPS.map((g) => [...g.items])).toEqual(expected.map((g) => g.items))
  })

  // SETTINGS_TABS (the Settings screen's own tab strip) has no equivalent
  // oracle: `web/components/screens/settings-screen.tsx`'s `tabsConfig` is a
  // local literal inside the component function, not an exported table, and
  // exporting one is a change to a file outside this lane's ownership
  // (shared/web/appearance-tab-preview.tsx, shared/web/appearance-panel.tsx
  // and their tests only). Logged rather than silently skipped: a future
  // lane that touches settings-screen.tsx should export `tabsConfig.tabs`'
  // label list so this file can grow the same rot-check RAIL_GROUPS has.
})
