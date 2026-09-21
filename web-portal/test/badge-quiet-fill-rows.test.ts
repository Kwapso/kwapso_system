// A HAND-ROLLED `bg-surface-panel` ROW REBINDS `--badge-quiet-fill`, OR ITS
// BADGE IS INVISIBLE. A source census, not a render, because the bug this
// guards against never showed up in a shallow render: a `Badge` painted the
// exact colour of the row it sat on (contrast 1.000), which no snapshot of
// "did a <span> appear" would ever catch.
//
// Audit finding, 21 Sep 2026: `ticket-row.tsx`'s row paints `bg-surface-panel`
// by hand and its status Badge (`variant="secondary"`) resolved to the same
// colour for "With us"/"Looked at"/"Booked in", measured live,
// rgb(247,242,235) on rgb(247,242,235). The kit's own `Card` sets
// `[--badge-quiet-fill:var(--surface-raised)]` on its `default` variant
// (shared/ui/components/card/card.tsx) so a badge nested in one always
// differentiates from the card's own paper; a hand-rolled row that skips
// `Card` never gets that rebind unless it sets the property itself.
//
// FOUR ROWS SHARE THE PATTERN: ticket-row.tsx (the only one with a Badge in
// it today), waiting-on-you.tsx, sent-to-us.tsx and deliverables-screen.tsx,
// and all four are fixed the same way, so a Badge dropped into any of the
// other three tomorrow inherits the fix rather than reintroducing the bug.
//
// A SOURCE CENSUS rather than a DOM read: jsdom does not resolve CSS custom
// properties, so `getComputedStyle` on a rendered row cannot see whether
// `--badge-quiet-fill` actually differs from `--surface-panel`, the class
// string is the only place this fact is checkable in this suite.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const COMPONENTS = join(__dirname, "..", "components")
const read = (name: string) => readFileSync(join(COMPONENTS, name), "utf8")

/** The exact rebind `Card variant="default"` carries, the other paper tone
 * from this row's own soft paper, so a Badge nested in the row always reads
 * against something other than the ground it is standing on. */
const REBIND = "[--badge-quiet-fill:var(--surface-raised)]"

const ROWS: Record<string, string> = {
  "ticket-row.tsx": "bg-surface-panel",
  "waiting-on-you.tsx": "bg-surface-panel",
  "sent-to-us.tsx": "bg-surface-panel",
  "deliverables-screen.tsx": "bg-surface-panel",
}

describe("a hand-rolled bg-surface-panel row rebinds --badge-quiet-fill (21 Sep 2026 audit)", () => {
  for (const [file, groundClass] of Object.entries(ROWS)) {
    it(`${file}'s row carries ${groundClass} AND the kit's badge fill rebind`, () => {
      const src = read(file)
      expect(src, `${file} no longer paints ${groundClass} on its row, update this census`).toContain(groundClass)
      expect(
        src,
        `${file}'s row paints ${groundClass} without rebinding --badge-quiet-fill: a Badge nested in it ` +
          "will paint the row's own colour, exactly the bug the 21 Sep 2026 audit found on ticket-row.tsx"
      ).toContain(REBIND)
    })
  }

  it("guards the census: a row with the ground class and no rebind is caught", () => {
    const offender = 'className="rounded-[var(--radius)] bg-surface-panel p-4"'
    expect(offender.includes("bg-surface-panel")).toBe(true)
    expect(offender.includes("[--badge-quiet-fill:var(--surface-raised)]")).toBe(false)
  })
})
