// @vitest-environment node
//
// A WEEK VIEW'S CARDS KEEP THEIR AIR — every gap around and between a week
// card stays one rung above where the 23 Sep 2026 ruling found it.
//
// ── THE RULING ────────────────────────────────────────────────────────────
//
// The client, 23 Sep 2026, verbatim: *"everywhere week view add a bit more
// spacingto the cards, and by rule no borders nowhere in the kit"*. This
// file is the first half of that sentence. The second half is a kit law
// (`kwapso-design/docs/RULES.md` §2.8 and `foundations/rules/borders.mjs`)
// and is not this test's business.
//
// ── WHAT "EVERYWHERE" IS ──────────────────────────────────────────────────
//
// Three screens draw a week in this app, and all three draw it through ONE
// component:
//
//   web/components/work/tasks-screen.tsx      Tasks → Week (Planned, Everyone)
//   web/components/work/stories-screen.tsx    Stories → Week
//   web/components/meetings/meetings-screen.tsx   Meetings → Week
//
// each mounting `<RecordWeek>` (`web/components/records/record-week.tsx`)
// and nothing else. So "everywhere" is one file, and the first assertion
// below is the one that keeps it that way: the day a fourth screen hand-
// rolls its own week grid instead of mounting `RecordWeek`, this test is
// what says so, because the spacing ruling would then have a second home
// nobody updated.
//
// ── WHAT IS PINNED ────────────────────────────────────────────────────────
//
// `record-week.tsx` names its three gaps once, at the top of the file, and
// every week stack in it reads one of those three names:
//
//   WEEK_CARD_GAP     gap-[var(--space-3)]   between two cards in a day, and
//                                            a day head to its first card
//   WEEK_COLUMN_GAP   gap-[var(--space-4)]   between two day columns, and the
//                                            phone pager's own stack
//   WEEK_WEEKEND_GAP  gap-[var(--space-2)]   inside the folded weekend column
//
// Each is one rung above the step it replaced (8→12, 12→16, 6→8) on the
// kit's own ladder — `--space-*`, `shared/ui/foundations/tokens/tokens.css`
// §2 — never a typed pixel, which kit RULES.md §1.1 refuses outright because
// it freezes while the type around it grows with `data-scale`.
//
// THE CARD'S OWN INSET IS NOT PINNED HERE. `EntryCard`'s `p-2` is the card's
// business; she asked for spacing to the cards, not inside them.
//
// This is a SOURCE CENSUS, not a render test, deliberately: the defect this
// guards against is somebody rewriting a `className` during a refactor, and
// that is visible in the source before it is visible in a DOM.

import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

const ROOT = path.resolve(__dirname, "..", "..")
const WEEK = "web/components/records/record-week.tsx"

const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8")

/** The three names, and the rung each must resolve to. */
const GAPS: ReadonlyArray<readonly [string, string, string]> = [
  ["WEEK_CARD_GAP", "gap-[var(--space-3)]", "between two cards in a day, and a day head to its first card"],
  ["WEEK_COLUMN_GAP", "gap-[var(--space-4)]", "between two day columns, and the phone pager's own stack"],
  ["WEEK_WEEKEND_GAP", "gap-[var(--space-2)]", "inside the folded weekend column"],
]

/** Every screen that offers a `"week"` view value in this app. */
const WEEK_SCREENS = [
  "web/components/work/tasks-screen.tsx",
  "web/components/work/stories-screen.tsx",
  "web/components/meetings/meetings-screen.tsx",
]

describe("a week view's cards keep their air", () => {
  it("names each of the three week gaps exactly once, at the rung the ruling put it on", () => {
    const src = read(WEEK)
    for (const [name, rung, role] of GAPS) {
      const decl = new RegExp(`^const ${name} = "([^"]*)"`, "m").exec(src)
      expect(
        decl,
        `${WEEK} no longer declares \`${name}\` (${role}). The 23 Sep 2026 ruling is decided in ` +
          "one place in that file; deleting the name scatters it again.",
      ).not.toBeNull()
      expect(
        decl?.[1],
        `${WEEK}: \`${name}\` (${role}) reads \`${decl?.[1]}\`, not \`${rung}\`. That is the ruling ` +
          "walked back a rung.",
      ).toBe(rung)
    }
  })

  it("routes every week stack through one of the three names — no gap written inline", () => {
    const src = read(WEEK)
    // The week's own stacks: the day columns, the day bodies, the weekend
    // column and the phone pager's list. Each is a `flex …flex-col` or the
    // desktop `grid`, and each must reach a gap through a NAME.
    const inline = [...src.matchAll(/className="([^"]*\bflex-col\b[^"]*)"/g)]
      .map((m) => m[1])
      .filter((c) => /\bgap-(?:2|3|1\.5|\[var\(--space-[1-9]h?\)\])\b/.test(c))
    expect(
      inline,
      `${WEEK} writes a week gap inline instead of reading WEEK_CARD_GAP / WEEK_COLUMN_GAP / ` +
        "WEEK_WEEKEND_GAP. One place decides this spacing; a second spelling is how it drifts back.",
    ).toEqual([])
  })

  it("refuses a typed pixel anywhere in the week view", () => {
    const src = read(WEEK)
    const px = [...src.matchAll(/\b(?:gap|p|px|py|m|mx|my)-\[\d+(?:\.\d+)?px\]/g)].map((m) => m[0])
    expect(
      px,
      `${WEEK} writes a px literal. Kit RULES.md §1.1: a px value freezes at its literal size while ` +
        "the text beside it grows with `data-scale`, so the scale control silently stops working.",
    ).toEqual([])
  })

  it("keeps every week screen on the one shared component", () => {
    const strays: string[] = []
    for (const rel of WEEK_SCREENS) {
      const src = read(rel)
      if (!/\bRecordWeek\b/.test(src)) {
        strays.push(`${rel} offers a "week" view but no longer mounts <RecordWeek>`)
      }
    }
    expect(
      strays,
      "A week view that does not go through `RecordWeek` has its own spacing, which the ruling above " +
        "cannot reach. Mount the shared component, or move the three gap names somewhere both can read.",
    ).toEqual([])
  })
})
