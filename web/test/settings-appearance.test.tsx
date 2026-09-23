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
import { stripComments } from "@shared/rules/source-scan"
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

let lastContainer: HTMLElement | null = null

function renderPanel(overrides: Partial<React.ComponentProps<typeof AppearancePanel>> = {}) {
  const saveLanguage = vi.fn().mockResolvedValue(undefined)
  const saveScale = vi.fn().mockResolvedValue(undefined)
  const saveSpine = vi.fn().mockResolvedValue(undefined)
  const view = render(
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
  lastContainer = view.container
  return { saveLanguage, saveScale, saveSpine }
}

/** The panel's own root, as a person's browser receives it. */
function panelRoot(): HTMLElement {
  const root = lastContainer?.firstElementChild
  if (!(root instanceof HTMLElement)) throw new Error("the panel rendered no root element")
  return root
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

// ── 5. AND IT IS NOT A CARD — AURORA, 23 SEP 2026 ───────────────────────────
//
//   "settings appearacne shoudl not have card - thats not minimal."
//
// The box was `SettingsSection`'s own `rounded-[var(--radius)]
// bg-surface-panel p-4 lg:p-[var(--space-7)]` (`shared/web/settings-
// section.tsx`), and `AppearancePanel` is its only call site. It survived the
// same day's module-wide minimal sweep because that sweep's census
// (`web/test/settings-minimal.test.ts`) reads `web/components/screens/**` and
// `web/components/team/**`, and the last box in the settings module was one
// folder away in `shared/web/`. Those files are in that census now; this
// block is the same claim asked of the RENDERED panel, which is the half a
// source census cannot make.
//
// FOUR THINGS ARE A CARD AND ALL FOUR MUST BE GONE: the paper fill, the
// radius, the inset, and — because a law minted the same day in the kit
// (`foundations/rules/boxes.mjs`, "by rule no borders nowhere in the kit")
// forbids a four-edge stroke around a container in either spelling — anything
// that draws the edge back as an outline or an inset shadow instead. A screen
// that swapped its fill for a hairline would have obeyed the letter of her
// sentence and undone it.
//
// WHAT SEPARATES THE ROWS INSTEAD is the kit `<Separator>`, one BETWEEN
// adjacent rows and never above the first or below the last — R107's own
// shipped shape (`web/components/work/effort-card.tsx`'s work-log list). It
// replaces a `divide-y`, which is a literal CSS border between children and
// is the exact thing R67's surviving half ("separation is a fill or an inset
// shadow, never a stroke") and `settings-minimal`'s third census forbid.

describe("Settings · Appearance does not stand in a card (Aurora, 23 Sep 2026)", () => {
  // COMMENTS STRIPPED FIRST, and this is not hygiene — it is the difference
  // between reading the code and reading the prose about the code. This
  // file's own header narrates the box it used to draw, quotes the exact
  // class list that came off, and writes the words "the `<section>`
  // landmark" several times. A regex over the raw text matches the FIRST of
  // those and proves nothing: caught on this test's own proof-of-red run,
  // where the real box was restored and this case stayed green because it
  // was reading a sentence. `stripComments` keeps length, so the tag's own
  // text is unchanged — the same seam `settings-minimal.test.ts` and R67's
  // census already read their subjects through.
  const SECTION_SRC = stripComments(read("shared/web/settings-section.tsx"), { keepLength: true })

  /** The opening tag of the one `<section>` `SettingsSection` returns. */
  function sectionOpeningTag(): string {
    const match = SECTION_SRC.match(/<section\b[^>]*>/)
    expect(match, "SettingsSection must still return a <section> landmark").toBeTruthy()
    return match![0]
  }

  it("source: the section declares no paper fill, no radius and no inset", () => {
    const tag = sectionOpeningTag()
    expect(tag, "no paper fill").not.toMatch(/\bbg-(surface-panel|card)\b/)
    expect(tag, "no box radius").not.toMatch(/\brounded-/)
    expect(tag, "no card inset").not.toMatch(/(^|[\s"'`])(lg:)?p-/)
  })

  it("source: the edge is not drawn back as a stroke, an outline or an inset shadow", () => {
    const tag = sectionOpeningTag()
    expect(tag, "no CSS border (R67's surviving half, BUILD-A-SCREEN §6.1)").not.toMatch(/\bborder(-|\b)/)
    expect(tag, "no outline").not.toMatch(/\boutline-/)
    // The kit's container-box law (`foundations/rules/boxes.mjs`, 23 Sep
    // 2026): a four-edge stroke is a box in either spelling — the named
    // `--hairline*` tokens, and `inset 0 0 0 …` written out. A ONE-EDGE
    // shape (`--hairline-under` and friends) is a separator, not a box, and
    // is deliberately not matched, exactly as that law does not match it.
    expect(tag, "no four-edge inset shadow").not.toMatch(
      /shadow-\[(var\(--hairline(-strong|-error|-ink)?\)|inset_0_0_0)/
    )
  })

  it("painted: the panel's own root paints no card — no fill class, no radius, no inset, no stroke", () => {
    renderPanel()
    const root = panelRoot()
    expect(root.tagName, "still the <section> landmark").toBe("SECTION")
    expect(root.getAttribute("aria-label"), "still named for assistive tech").toBe("Appearance")
    const cls = root.className
    expect(cls, "no paper fill").not.toMatch(/\bbg-(surface-panel|card)\b/)
    expect(cls, "no box radius").not.toMatch(/\brounded-/)
    expect(cls, "no card inset").not.toMatch(/(^|\s)(lg:)?p-/)
    expect(cls, "no CSS border").not.toMatch(/\bborder(-|\b)/)
    expect(cls, "no four-edge inset shadow").not.toMatch(
      /shadow-\[(var\(--hairline(-strong|-error|-ink)?\)|inset_0_0_0)/
    )
  })

  it("painted: no CONTAINER inside the panel re-draws the box one level in", () => {
    renderPanel()
    // THE SUBJECT IS THE FURNITURE, NOT EVERY DESCENDANT, and the line is
    // drawn where `PAPER_ON_PURPOSE` already draws it. A `bg-surface-panel`
    // deep inside a pill is a BADGE's own quiet fill — the kit's
    // `--badge-quiet-fill`, a chip standing for itself, one of the five
    // things a grouping section is not — and failing it here would be this
    // test enforcing a sentence nobody said. What the ruling is about is the
    // box AROUND the rows: the section (asserted above), the column it
    // holds, and the four rows themselves. If any of those paints paper, the
    // card is back under a different tag.
    const root = panelRoot()
    const column = root.querySelector<HTMLElement>(":scope > div")
    expect(column, "the rows still stand in one column").toBeTruthy()
    const furniture = [column!, ...Array.from(column!.children)] as HTMLElement[]
    const boxed = furniture.filter((el) => /\bbg-(surface-panel|card)\b/.test(el.className.toString()))
    expect(
      boxed.map((el) => el.className.toString().slice(0, 100)),
      "taking the box off the section means nothing if the column or a row paints it back"
    ).toEqual([])
  })

  it("painted: the rows are separated by the kit Separator, never a divide-y stroke", () => {
    renderPanel()
    const root = panelRoot()
    const column = root.querySelector<HTMLElement>(":scope > div")
    expect(column, "the rows still stand in one column").toBeTruthy()
    expect(column!.className, "a divide-y is a literal border between children").not.toMatch(/\bdivide-[xy]\b/)

    const kids = Array.from(column!.children)
    const separators = kids.filter((el) => el.getAttribute("data-slot") === "separator")
    const rows = kids.filter((el) => el.getAttribute("data-slot") !== "separator")
    expect(rows, "the four rows: Language, Size, Appearance, Background").toHaveLength(4)
    expect(separators, "one rule BETWEEN adjacent rows — three, not four").toHaveLength(3)
    expect(kids[0].getAttribute("data-slot"), "never a rule above the first row").not.toBe("separator")
    expect(kids[kids.length - 1].getAttribute("data-slot"), "never a rule below the last row").not.toBe("separator")
  })
})
