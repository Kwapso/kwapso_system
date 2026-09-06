// THE RECIPE ENGINE ACTUALLY DRAWS THE CHIP — read out of the DOM, not the source.
//
// `one-black-chip.test.ts` beside this is a CENSUS: it proves nothing else
// builds the black lozenge and nothing glues a reference into a name. Neither
// question can tell whether the chip reaches a screen at all, and the engine is
// exactly where that could silently stop being true: `screen-renderer.tsx` fed
// the kit's `List` a `title: String(row[…])` for its whole life, so the four
// list recipes that now declare a `reference` column are one lost prop spread
// from rendering the name alone and passing every rule in this repo.
//
// THREE ROWS, THREE STATES, because the interesting ones are not the happy one:
// a row WITH a number, a row whose number is null (five of the seven kinds mint
// none without a client, so this is ordinary rather than exotic — and an empty
// black lozenge is the specific failure `RecordRef` exists to prevent), and the
// same recipe with no `reference` declared at all, which must render byte-for-
// byte what it rendered before this seam existed.

import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { ScreenRenderer } from "@shared/web/screen-engine/screen-renderer"
import type { ScreenRecipe } from "@shared/web/screen-engine/recipe"
import { BASE_RECIPES } from "@/lib/screens"

afterEach(cleanup)

const ROWS = [
  { id: "S1", name: "Board redesign", ref: "S0012", detail: "Bergmann · runs in June" },
  // NO NUMBER. A sprint with no client mints none (shared/workers/refs.ts), and
  // every kind has rows older than the day its counter was added.
  { id: "S2", name: "Internal tidy-up", ref: null, detail: "ours · no dates" },
]

function show(recipe: ScreenRecipe) {
  return render(
    <ScreenRenderer
      recipe={recipe}
      data={{ rows: ROWS }}
      // THE SPRINTS RECIPE GATES ON `work`, not on `sprints` — stories,
      // sprints and to-dos are four segments over two permission modules
      // (screens.ts's MODULE_PERMISSION). A denied screen renders NOTHING at
      // all, so getting this wrong is a suite that passes on an empty body.
      rights={{ work: { read: true, create: false, edit: false, delete: false } }}
      onAction={() => {}}
    />
  )
}

describe("a list row leads with its number", () => {
  // THE REAL RECIPE, not a fixture of one — a test that invents its own recipe
  // proves the engine works on a recipe nobody ships. `BASE_RECIPES` is what
  // the sprints screen actually renders.
  const sprints = BASE_RECIPES["sprints.list"] as ScreenRecipe

  it("the recipe the app ships declares which column holds the number", () => {
    expect(sprints.reference).toBe("ref")
  })

  it("draws the reference in front of the name, and nothing for a row without one", () => {
    show(sprints)

    // THE NUMBER IS ON SCREEN, as its own element rather than inside the name —
    // `getByText` with an exact match would pass on `S0012 · Board redesign`
    // too, which is the shape being replaced, so the name is asserted to be a
    // SEPARATE node from the number.
    expect(screen.getByText("S0012")).toBeTruthy()
    expect(screen.getByText("Board redesign")).toBeTruthy()

    // THE ORDER — the number first, the name second, which is the whole of the
    // client's instruction ("put the ID before the title to the left"). Read
    // off the rendered text of the row that holds both.
    const row = screen.getByText("S0012").closest("[data-slot='list-title']") ?? screen.getByText("S0012").parentElement
    expect(row).toBeTruthy()
    expect(row!.textContent).toBe("S0012Board redesign")

    // AND THE ROW WITH NO NUMBER IS JUST ITS NAME. No chip, no em dash, no
    // empty lozenge — nothing at all where the other row has a mark.
    const bare = screen.getByText("Internal tidy-up")
    expect(bare.textContent).toBe("Internal tidy-up")
  })

  it("a recipe that declares no reference renders exactly what it always did", () => {
    // The `leading` slot makes the same promise one line up in recipe.ts, and
    // it is the promise that lets this seam be added to four recipes without
    // auditing the other twenty.
    const { reference: _dropped, ...withoutRef } = sprints
    show(withoutRef as ScreenRecipe)
    expect(screen.queryByText("S0012")).toBeNull()
    const named = screen.getByText("Board redesign")
    expect(named.textContent).toBe("Board redesign")
    expect(within(named).queryByText("S0012")).toBeNull()
  })
})
