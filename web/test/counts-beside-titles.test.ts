// R97, A COUNT NEVER GETS ITS OWN CARD. Aurora, verbatim, 21 Sep 2026: "While
// it is a rule that when it's a count, unless explicitly said, it doesn't
// deserve its own card. Just by rule, same as related tickets or related
// stories or stakeholders: just a count next to the title." Read against the
// register the app already builds correctly for exactly the case she named:
// `web/components/tickets/ticket-detail-body.tsx`'s `TicketSidePanel` draws
// `{title} {count}` on the panel's own heading line
// (`text-muted-foreground shrink-0 font-[var(--font-weight-normal)]` beside
// the truncated title span) — "Stakeholders 4", never a separate card or tile
// holding the number 4 alone. `web/components/records/collection-heading.tsx`
// carries the same register one level up, for a whole screen's own count. A
// number that COUNTS THINGS (how many tickets, how many stories, how many
// stakeholders) never earns a card, a tile or a stat box of its own; it sits
// beside its panel's own title, in one of those two registers.
//
// TWO SHAPES OF THE SAME MISTAKE, one census each:
//
//   1. THE KIT'S OWN STAT TILE. `<StatGrid>` (shared/ui/components/stat-grid/
//      stat-grid.tsx) is the kit's purpose-built "number + label, its own
//      card" primitive — every `items` entry it draws IS a stat box by
//      construction. Three call sites exist today (`web/components/screens/
//      pulse.tsx`'s dashboard, `web/components/assistant/agent-blocks.tsx`'s
//      metric blocks, `web/components/work/work-logs-panel.tsx`'s hours
//      strip), and her own ruling names this shape without saying whether the
//      DASHBOARD is the "explicitly said" exception a count-shaped tile is
//      allowed to be — a dashboard's whole point is a wall of numbers, which
//      reads differently from a ticket's "Stakeholders" panel. Nothing here
//      decides that either way: every `<StatGrid` call site found is named in
//      `COUNT_REGISTER_EXEMPT`, reason "pending her word", per the brief that
//      shipped this law, rather than silently kept or silently ripped out.
//   2. A HAND-ROLLED METRICS GRID. `story-detail.tsx`'s own "Metrics" panel
//      (cycle time / effort / flow efficiency, three columns, each an
//      uppercase label over a `font-mono text-sm font-semibold` value) is the
//      same shape by hand rather than through `<StatGrid>` — a card whose
//      only content is a row of number-and-label pairs, standing beside
//      "Related tickets", "Related stories" and the rest on the story's own
//      side column instead of folding into one of them. THE STORY LANE IS
//      MOVING THIS INTO THE EFFORT CARD THE SAME SESSION THIS LAW SHIPPED
//      (see this file's own header note below) — `story-detail.tsx` is one of
//      the files this lane's brief forbids editing, so the finding is
//      reported and tolerated through a dated `COUNT_REGISTER_EXEMPT` entry,
//      removed once that lane reports rather than fixed here.
//
// DERIVED, NOT HAND-LISTED: the second census does not name `story-detail.tsx`
// anywhere in its own logic. It looks for the STYLING SIGNATURE a hand-rolled
// metrics grid actually carries — `font-mono text-sm font-semibold` used two
// or more times in one file, the exact combination this app uses nowhere else
// for anything but a KPI tile's own value (confirmed by grep across both front
// doors the day this law shipped: zero other files carry it even once) — so a
// second hand-rolled grid anywhere else in the app is caught the same way,
// never only the one Aurora happened to be looking at.

import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"
import { COUNT_REGISTER_EXEMPT } from "@shared/rules/registry"

const REPO_ROOT = join(__dirname, "..", "..")

const ROOTS = [
  join(REPO_ROOT, "web", "components"),
  join(REPO_ROOT, "web-portal", "components"),
]

/** THE KIT'S OWN STAT TILE — every call site is a card/tile whose content is
 * a number and a label, by the primitive's own design. */
function statGridFindings(): string[] {
  const files = sourceFiles(ROOTS, { extensions: [".tsx"], relativeTo: REPO_ROOT, skipTests: true })
  const out: string[] = []
  for (const f of files) {
    const src = stripComments(f.source)
    if (/<StatGrid\b/.test(src)) out.push(f.rel)
  }
  return out
}

/** A HAND-ROLLED METRICS GRID — the one styling signature this app uses only
 * for a KPI tile's own value, `font-mono text-sm font-semibold`, appearing
 * two or more times in one file. One occurrence is an ordinary figure (a
 * price, a duration) sitting beside other content; two or more, in the same
 * file, is a repeated tile shape — a grid of number/label pairs standing on
 * its own rather than folded beside a title. */
const TILE_VALUE_CLASS = /font-mono text-sm font-semibold/g

function handRolledGridFindings(): string[] {
  const files = sourceFiles(ROOTS, { extensions: [".tsx"], relativeTo: REPO_ROOT, skipTests: true })
  const out: string[] = []
  for (const f of files) {
    const src = stripComments(f.source)
    const hits = src.match(TILE_VALUE_CLASS)
    if (hits && hits.length >= 2) out.push(f.rel)
  }
  return out
}

function excused(rel: string): (typeof COUNT_REGISTER_EXEMPT)[number] | undefined {
  return COUNT_REGISTER_EXEMPT.find((e) => e.file === rel)
}

describe("R97, a count never gets its own card", () => {
  it("every <StatGrid> call site is named in COUNT_REGISTER_EXEMPT", () => {
    const found = statGridFindings()
    const unexempt = found.filter((rel) => !excused(rel))
    expect(
      unexempt,
      `these draw the kit's own stat-tile grid, a card whose content is a number and a label. Fold the count ` +
        `into its panel's own title line (TicketSidePanel's/CollectionHeading's count register), or name the ` +
        `file in COUNT_REGISTER_EXEMPT with the reason:\n  ` + unexempt.join("\n  ")
    ).toEqual([])
  })

  it("no hand-rolled grid repeats the kit's KPI-tile value styling without being named", () => {
    const found = handRolledGridFindings()
    const unexempt = found.filter((rel) => !excused(rel))
    expect(
      unexempt,
      `these build a hand-rolled grid of number/label pairs (font-mono text-sm font-semibold, 2+ times in one ` +
        `file) — the same "its own card" shape R97 forbids. Fold the counts into the panel's own title line, or ` +
        `name the file in COUNT_REGISTER_EXEMPT with the reason:\n  ` + unexempt.join("\n  ")
    ).toEqual([])
  })

  it("COUNT_REGISTER_EXEMPT names only real, still-open findings", () => {
    const stillFound = new Set([...statGridFindings(), ...handRolledGridFindings()])
    const stale = COUNT_REGISTER_EXEMPT.filter((e) => !stillFound.has(e.file))
    expect(
      stale,
      `these COUNT_REGISTER_EXEMPT entries no longer match a real finding. Fixed, or the source moved on, ` +
        `delete the entry:\n  ` + stale.map((e) => e.file).join("\n  ")
    ).toEqual([])
  })

  // PROVEN NOT VACUOUS, against synthetic source only.
  it("catches a synthetic hand-rolled metrics grid", () => {
    const synthetic = [
      "export function X() {",
      "  return (",
      '    <div className="grid grid-cols-3 gap-4">',
      '      <span className="font-mono text-sm font-semibold">{a}</span>',
      '      <span className="font-mono text-sm font-semibold">{b}</span>',
      "    </div>",
      "  )",
      "}",
      "",
    ].join("\n")
    const hits = synthetic.match(TILE_VALUE_CLASS)
    expect(hits?.length ?? 0).toBeGreaterThanOrEqual(2)
  })

  it("catches a synthetic <StatGrid> call", () => {
    const synthetic = ['<StatGrid items={items} />'].join("\n")
    expect(/<StatGrid\b/.test(synthetic)).toBe(true)
  })
})
