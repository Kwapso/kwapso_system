// THE TWO LANGUAGE SWITCHERS — one shape rule and one sentence rule.
//
// THE SHAPE, REWRITTEN 2026-09-14. Twenty-nine languages once arrived as
// twenty-nine buttons, wrapping to six lines of flags across the middle of
// Settings — the reason Settings moved to a Select in the first place, and
// the reason this file used to assert one. `LANGUAGES` is FOUR entries now
// (shared/i18n.ts's own header: "the twenty-five were only ever LARGE"), and
// the client ruled on the shape directly the same day she staged Size,
// Appearance and Background behind a Save button: "also, make the language
// choice also be like the rest: size, appearance, background." Those three
// already draw through `AppearancePillGroup`
// (`shared/web/appearance-pill-group.tsx`) — a bare `<button role="radio">`
// row, the SAME primitive R3 already blesses for exactly this shape (see
// that file's own header: "never a `<Button variant={x===y?…}>` fake — R3's
// own ban"), not a menu, so moving Language onto the identical row is R3
// answered the same way its three neighbours already are, not a violation of
// it. THE PORTAL'S COMPACT TWIN DID NOT MOVE — `language-menu.tsx` still
// draws the library DropdownMenu, unrelated to either ruling and unaffected
// by this change.
//
// THE SENTENCE, which is the one that was a real bug and is untouched by any
// of this. A switch is OPTIMISTIC: `setLang(next)` re-renders the app before
// the save comes back — LANGUAGE ALONE KEPT THIS CONTRACT, deliberately, when
// Size/Appearance/Background staged behind Save the same day (her own answer,
// put to her directly: "keep language instant" — see
// `appearance-panel.tsx`'s own header for the fuller account). But `t` was
// bound when the component rendered, so a confirmation written through it
// says "Language changed." in the language they just LEFT — a small thing
// that tells somebody the feature is a veneer. And the FAILURE has to go the
// other way: a switch to Catalan that did not happen must be reported in the
// language they can still read, because telling somebody in Catalan that
// Catalan failed to load is a joke at their expense. So the success is
// composed in `next` and the refusal in `previous`, and both are asserted
// here rather than left as a comment that was true once.
//
// Read off disk, this repo's house style for a rule about how a file is
// written.

import { readFileSync } from "node:fs"
import { join } from "node:path"

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { LANGUAGES } from "@shared/i18n"
import { LanguageProvider } from "@shared/web/language"
import { LanguageSection } from "@shared/web/language-section"

const ROOT = join(__dirname, "..", "..")
const read = (p: string) => readFileSync(join(ROOT, p), "utf8")

const SECTION = "shared/web/language-section.tsx"
const MENU = "shared/web/language-menu.tsx"

describe("the switcher is a pill row in Settings, and a menu in the portal header", () => {
  it("Settings matches Size/Appearance/Background — AppearancePillGroup, not the library Select", () => {
    const src = read(SECTION)
    expect(
      src,
      "Language now draws through the same pill row its three neighbours use"
    ).toContain("AppearancePillGroup")
    expect(
      src.includes("components/select/select"),
      "the library Select this replaced must not grow back here"
    ).toBe(false)
  })

  it("the portal's compact twin is still the library DropdownMenu — untouched by the Settings ruling", () => {
    expect(read(MENU)).toContain("components/dropdown-menu/dropdown-menu")
  })

  it("Settings still says how complete a part-written language is, on every pill that needs it", () => {
    // The honest half of shipping a machine-filled catalogue, still true after
    // the 2026-09-14 ruling deleted the sentence UNDER the control (the client
    // quoted it back verbatim and asked for it gone, alongside the preview-led
    // Settings · Appearance redesign — see language-section.tsx's own header).
    // The old Select said the number only inside its OPEN dropdown; a pill row
    // has no closed state to hide behind, so the same figure now sits on every
    // pill that needs it. `coverage()` is still the engine's one seam for it,
    // so a component computing its own would still be a second answer to "how
    // much of this can I read".
    const src = read(SECTION)
    expect(src, "the per-pill percentage").toContain("{pct}%")
    expect(src, "the number comes from the engine's own seam").toContain("coverage()")
    expect(
      src.includes("{percent}% translated"),
      "the sentence under the control was deleted by the 2026-09-14 ruling and must not grow back"
    ).toBe(false)
  })

  it("each pill carries its flag, in the swatch position Background's own pills use", () => {
    // Her own instruction, the same message: "Each language already draws a
    // flag — keep it, in the swatch position the other groups use for their
    // colour swatch, so the four rows line up."
    const src = read(SECTION)
    expect(src, "the flag rides AppearancePillOption's own swatch slot").toMatch(
      /swatch:\s*<span[^>]*>\{l\.flag\}<\/span>/
    )
  })

  for (const [name, path] of [
    ["Settings", SECTION],
    ["the portal header", MENU],
  ] as const) {
    it(`${name} offers every language, derived from LANGUAGES`, () => {
      // Derived, never hand-listed: adding a language to the engine's one array
      // has to be the only edit, which is the promise shared/i18n.ts makes.
      const src = read(path)
      expect(src, `${path} must map LANGUAGES`).toMatch(/LANGUAGES\.map\(/)
      for (const l of ["de", "es", "ca"])
        expect(
          LANGUAGES.some((row) => row.code === l),
          "the agency's own languages are still in the engine's list"
        ).toBe(true)
    })
  }
})

describe("the confirmation speaks the language that was just chosen", () => {
  for (const path of [SECTION, MENU]) {
    it(`${path} confirms in the NEW language and refuses in the old one`, () => {
      const src = read(path)
      // `t(...)` here would be the bug: `t` is bound to the language the render
      // started in, which is the one they are leaving.
      expect(src, "the success toast must be composed in `next`").toContain(
        'toast.success(translate("Language changed.", next))'
      )
      expect(src, "the failure toast must be composed in `previous`").toContain(
        'toast.error(translate("That didn\'t save. Try again.", previous))'
      )
    })
  }

  it("both sentences are in the catalogue, in the agency's own languages", async () => {
    // These two live in shared/web/, which the extractor does not walk (it reads
    // the two front doors) — so they are SEED entries, and a seed entry that
    // quietly disappeared would put the confirmation back into English for
    // everybody. Asserted against the seed rather than the generated catalogue:
    // the seed is the half a person maintains.
    const { SEED } = await import("@shared/i18n-seed")
    for (const sentence of ["Language changed.", "That didn't save. Try again."])
      for (const lang of ["de", "es", "ca"] as const)
        expect(SEED[sentence]?.[lang], `${sentence} needs its ${lang}`).toBeTruthy()
  })
})

// AND THE SAME THING, RENDERED. The check above reads the file; this one runs
// it, because "imports AppearancePillGroup" and "puts a row of pills on the
// screen" are two different claims and the second is the one the ruling was
// actually about.
describe("what Settings actually paints", () => {
  afterEach(cleanup)

  const paint = (lang: string) =>
    render(
      <LanguageProvider value={lang}>
        <LanguageSection save={async () => {}} />
      </LanguageProvider>
    )

  it("is one radiogroup, one pill per language — matching Size/Appearance/Background's own shape", () => {
    paint("en")
    // No `combobox` any more — the Select is gone. A `radiogroup` with one
    // `radio` per entry is exactly what `AppearancePillGroup` draws for its
    // three other callers, and `LANGUAGES` being four rather than
    // twenty-nine is what makes painting one pill per language the RIGHT
    // shape here rather than the wrapping row this file used to guard
    // against.
    expect(screen.queryAllByRole("combobox"), "the Select must be gone").toHaveLength(0)
    expect(screen.getByRole("radiogroup"), "one pill row").toBeTruthy()
    expect(
      screen.getAllByRole("radio"),
      "one pill per language, derived from LANGUAGES"
    ).toHaveLength(LANGUAGES.length)
  })

  it("names the language in its own words AND in English", () => {
    paint("de")
    const pills = screen.getAllByRole("radio")
    const german = pills.find((p) => p.textContent?.includes("Deutsch"))
    expect(german, "the endonym, for somebody scanning for their own language").toBeTruthy()
    expect(german?.textContent, "and the English name, for somebody who cannot read the script")
      .toContain("German")
  })

  it("says how complete a part-written language is, and stays quiet about English", () => {
    // The percentage is the honest half of shipping a machine-filled catalogue:
    // somebody choosing a language is told what to expect rather than finding
    // out a screen later. English IS the key, so it is complete by definition and
    // saying so would be noise.
    paint("en")
    const pills = screen.getAllByRole("radio")
    const english = pills.find((p) => p.textContent?.includes("English"))
    expect(english?.textContent, "nothing to report about English").not.toMatch(/%/)
  })
})
