// R86's OTHER HALF — an icon per ticket type actually RESOLVES, verified by
// running the two functions rather than reading them: `ticketTypeIconName`
// (shared/ticket-types.ts) against `iconComponent()` (shared/web/screen-engine/
// icon.tsx), the same seam `storyTypeIconName` is already proved through.
//
// Client ruling, 17 Sep 2026, verbatim: "for tickets, we need to find icons
// for the ticket type." Four glyphs, hand-picked and verified against the
// kit's own generated exports (shared/ui/foundations/icons/*.svg): Issue →
// `Bug`, Question → `Question`, Extra → `PlusCircleRegular`, Feedback →
// `ChatCircleText`. Extra moved off the filled `PlusCircle` on 18 Sep 2026,
// her ruling verbatim: "for extra, use the regular icon (not filled)".

import { describe, expect, it } from "vitest"

import { TICKET_TYPES, ticketTypeIconName } from "@shared/ticket-types"
import { iconComponent } from "@shared/web/screen-engine/icon"

describe("R86 — ticketTypeIconName resolves an icon per ticket type", () => {
  it("every one of the four live types names a glyph the kit actually draws", () => {
    const expected: Record<string, string> = {
      Issue: "bug",
      Question: "question",
      Extra: "plus-circle--regular",
      Feedback: "chat-circle-text",
    }
    // THE FOUR, FROM THE SAME LIST THE LOCK NAMES (shared/ticket-types.ts,
    // TICKET_TYPES) — never hand-typed here a second time, so a fifth kind
    // this test doesn't yet know about would fail LOUDLY rather than being
    // silently skipped.
    expect(TICKET_TYPES.map((t) => t.value)).toEqual(["Issue", "Question", "Extra", "Feedback"])
    for (const { value } of TICKET_TYPES) {
      const iconName = ticketTypeIconName(value)
      expect(iconName, `${value} should name an icon`).toBe(expected[value])
      // RUN THE SEAM, NOT READ IT (R19/R22's own posture: prove the wiring by
      // calling the function). A name that resolves to nothing here would be
      // a hole the icon-map's own census (icon-vocabulary.test.ts) might not
      // catch if the census bait ever drifted from this map.
      expect(iconComponent(iconName!), `${iconName} must resolve through iconComponent()`).not.toBeNull()
    }
  })

  it("is forgiving the same way ticketTypeKey is — trailing 's', case, whitespace", () => {
    expect(ticketTypeIconName("issues")).toBe("bug")
    expect(ticketTypeIconName("  QUESTION  ")).toBe("question")
    expect(ticketTypeIconName("Extras")).toBe("plus-circle--regular")
  })

  it("a renamed or retired word, or no type at all, draws no icon — never a guess", () => {
    expect(ticketTypeIconName("General")).toBeNull()
    expect(ticketTypeIconName(null)).toBeNull()
    expect(ticketTypeIconName(undefined)).toBeNull()
    expect(ticketTypeIconName("")).toBeNull()
  })
})
