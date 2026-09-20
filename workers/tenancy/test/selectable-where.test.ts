// EVERY SEEDED GROUP HAS A "WHERE" ENTRY.
//
// `shared/selectable-where.ts`'s own header explains the derivation
// (`storedWordColumns`/`VOCABULARY_HOMES`, `shared/selectable-homes.ts`); this
// is the completeness proof the brief for K59 (documents/UI-RULEBOOK.md,
// Aurora, 21 Sep 2026) asked for: read the seed a newborn team actually gets
// and a migration back-fills an existing one with, and fail the build the day
// a group ships that `selectableFieldWords` cannot answer for.

import { describe, expect, it } from "vitest"

import { selectableFieldWords } from "@shared/selectable-where"
import { DEFAULT_SELECTABLE, INTERNAL_VOCABULARY, COMPANY_VOCABULARY } from "../src/team-schema/seed"

/** Every distinct `type` the app ever seeds — a newborn team's own starting
 * vocabulary (`DEFAULT_SELECTABLE`) plus the two back-filled-only-to-existing-
 * teams sets (`INTERNAL_VOCABULARY`, `COMPANY_VOCABULARY`, both read by
 * `migrations.ts`). Read off the arrays themselves rather than typed here by
 * hand, so a group added to any of the three tomorrow is in this set without
 * anybody remembering to extend a second list. */
function seededGroups(): string[] {
  const all = [...DEFAULT_SELECTABLE, ...INTERNAL_VOCABULARY, ...COMPANY_VOCABULARY]
  return Array.from(new Set(all.map((row) => row.type)))
}

describe("selectableFieldWords answers for every group the app seeds", () => {
  it("the seed is not itself empty — a tripwire against reading the wrong export", () => {
    expect(seededGroups().length).toBeGreaterThan(5)
  })

  for (const group of seededGroups()) {
    it(`"${group}" resolves without throwing`, () => {
      expect(() => selectableFieldWords(group)).not.toThrow()
    })
  }

  it("every seeded group that stores a word somewhere answers at least one field", () => {
    // Every group a newborn team is actually handed a starting VALUE for is a
    // real, columned vocabulary today (never "labels"/"unused" — those ship
    // with no seed rows, see `shared/selectable-groups.ts`'s own header), so
    // this is the stronger claim `.not.toThrow()` above cannot make: not just
    // "answers", but "answers something".
    for (const group of seededGroups()) {
      const words = selectableFieldWords(group)
      expect(words, `"${group}" seeds real rows and must resolve a real field`).not.toBeNull()
      expect(words!.length, `"${group}" resolved to zero field words`).toBeGreaterThan(0)
    }
  })
})
