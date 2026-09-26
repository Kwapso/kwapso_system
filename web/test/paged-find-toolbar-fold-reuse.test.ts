// M7/M8 (25 Sep 2026, Alaap, documents/ui-rulebook/30-9-mobile.md), and the
// mobile audit's cause 2 (`.worktrees/notes/mobile-audit/findings-agency.md`):
// `ToolbarRow` (shared/ui/components/toolbar-row/toolbar-row.tsx) has folded
// its filters/view-switch lanes behind a "···" trigger below its own 48rem
// container width since the kit shipped it — but `PagedFind`'s own track
// (`ToolbarColumn`, this file's own header comment says "same treatment as
// `ToolbarRow`") hand-copied the slot names without the one class that makes
// the fold work, so it wrapped into up to three rows on a phone instead.
//
// The kit now exports the fold itself — `TOOLBAR_ROW_FOLD_CONTAINER`,
// `TOOLBAR_ROW_FOLD_LANE`, `ToolbarRowFold` — so a caller reuses it rather
// than copying it a second time. This is a structural, source-level test
// (matching this suite's own `content-inset.test.ts`) rather than a mounted
// render: it proves the SEAM is reused, not the pixels, which is what a
// future edit could otherwise quietly stop doing while `npm run check` stays
// green.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { stripComments } from "@shared/rules/source-scan"

const WEB = join(__dirname, "..")
const src = stripComments(
  readFileSync(join(WEB, "components", "records", "paged-find.tsx"), "utf8")
)

describe("PagedFind's toolbar reuses the kit's own fold (M7/M8)", () => {
  it("imports ToolbarRowFold, TOOLBAR_ROW_FOLD_CONTAINER and TOOLBAR_ROW_FOLD_LANE from the kit", () => {
    expect(
      /import\s*\{[^}]*\bToolbarRowFold\b[^}]*\}\s*from\s*"@shared\/ui\/components\/toolbar-row\/toolbar-row"/.test(
        src
      ),
      "paged-find.tsx must import ToolbarRowFold from the kit rather than building its own trigger"
    ).toBe(true)
    expect(
      /import\s*\{[^}]*\bTOOLBAR_ROW_FOLD_CONTAINER\b[^}]*\}\s*from\s*"@shared\/ui\/components\/toolbar-row\/toolbar-row"/.test(
        src
      ),
      "paged-find.tsx must import TOOLBAR_ROW_FOLD_CONTAINER rather than a bare \"@container\" literal"
    ).toBe(true)
    expect(
      /import\s*\{[^}]*\bTOOLBAR_ROW_FOLD_LANE\b[^}]*\}\s*from\s*"@shared\/ui\/components\/toolbar-row\/toolbar-row"/.test(
        src
      ),
      "paged-find.tsx must import TOOLBAR_ROW_FOLD_LANE rather than a bare \"hidden @min-[48rem]:flex\" literal"
    ).toBe(true)
  })

  it("the track carries TOOLBAR_ROW_FOLD_CONTAINER and never wraps", () => {
    const trackIdx = src.indexOf('data-slot="toolbar-row-track"')
    expect(trackIdx, 'data-slot="toolbar-row-track" not found').toBeGreaterThan(-1)
    const window = src.slice(trackIdx, trackIdx + 500)
    expect(
      window.includes("TOOLBAR_ROW_FOLD_CONTAINER"),
      "the track's own className must spend TOOLBAR_ROW_FOLD_CONTAINER, the kit's own @container value"
    ).toBe(true)
    expect(
      /\bflex-nowrap\b/.test(window),
      "the track must carry flex-nowrap — the fold exists precisely so this row never wraps"
    ).toBe(true)
    expect(
      /(?<!flex-no)\bflex-wrap\b/.test(window),
      "the track must not carry a bare flex-wrap — that is the three-row bug this fix closes"
    ).toBe(false)
  })

  it("renders a ToolbarRowFold trigger fed by the filters and sort/view lanes", () => {
    expect(
      /<ToolbarRowFold\b/.test(src),
      "paged-find.tsx must render <ToolbarRowFold> so filters/sort/view fold behind it below 48rem"
    ).toBe(true)
    // The two lanes it stands in for must carry the exported lane-hidden
    // class, the same one ToolbarRow's own inline lanes carry.
    const foldLaneCount = (src.match(/TOOLBAR_ROW_FOLD_LANE/g) ?? []).length
    expect(
      foldLaneCount,
      "TOOLBAR_ROW_FOLD_LANE must be spent at least twice: the filters lane and the sort/view lane"
    ).toBeGreaterThanOrEqual(2)
  })
})
