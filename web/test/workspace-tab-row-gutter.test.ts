// @vitest-environment node
//
// THE AIR ABOVE THE WORKSPACE TAB ROW, HALVED. Aurora, verbatim, 22 Sep 2026,
// pointing at her own screenshot: "look at my screenshot. athts the spacing
// i want reduced" — the empty band between the window's own top edge and the
// workspace tab row (the open-tab strip, `BreadcrumbFolders` in tab-set
// mode, `data-slot="breadcrumb-folders"`), never the folder tabs INSIDE a
// page (that is `--heading-strip-gap`, this file's own sibling test,
// `heading-strip-gap.test.ts`) and never the gap above a page title.
//
// MEASURED LIVE ON STAGING before this fix (`topband-measure.mjs`, this
// lane's own scratchpad under the session's scratchpad directory): at
// 1440x900 and again at 768x1024, the workspace tab row's own top edge sat
// exactly 24px below the window's top edge, the whole distance painted by
// ONE box, the kit's own outer screen wrapper
// (`data-slot="screen-shell-card"`, `shared/ui/compositions/templates/
// screen-shell.tsx`) — which is where `--shell-gutter-top` is DECLARED
// (`DENSITY_GUTTER_TOP`, both "comfortable" and "calm" read `var(--space-6)`,
// 24px) and inherited down to the content column's own `pt-[var(--shell-
// gutter-top)]`, the tab row's immediate parent. Below `md` this app draws
// its own fixed header instead (`--shell-top`, unrelated, untouched here);
// at 768px and up — where the workspace tab row with its close crosses
// actually renders — the 24px gutter is the entire band.
//
// NOT A DRAG REGION: this app ships no desktop-window wrapper (no
// `-webkit-app-region`, no Electron/Tauri shell; `shared/web/pwa.ts` goes no
// further than `display: "standalone"`), so nothing here is a titlebar.
//
// `screen-shell.tsx`'s own `density` prop is the only lever this app could
// pass to change the token, and both values it accepts read the identical
// 24px — so there is no prop that produces a smaller number, and the token's
// only other definition is inside the vendored kit, which this app may read
// and may not edit. The fix MOVES THE TOKEN, once, in `web/app/globals.css`:
// a plain selector on the kit's own `data-slot`, later in the stylesheet
// than `@import "tailwindcss"`, so it wins the cascade at equal specificity
// by source order — the exact mechanism the R83 rules elsewhere in the same
// file already rely on (`--pinned-lead`, `--pinned-chrome-h`) — rather than
// a one-off className override at ScreenShell's own single call site in
// app-shell.tsx, which the brief for this change warned against.
//
// PROVED BY RESTORING THE OLD VALUE AND WATCHING THIS FAIL: `cp
// web/app/globals.css` to a scratch copy, changed `var(--space-3)` back to
// `var(--space-6)` in the live file, re-ran this suite (red), then restored
// the file from the `cp` copy (never `git checkout --`) and re-ran (green).

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const REPO_ROOT = join(__dirname, "..", "..")
const GLOBALS_CSS = join(REPO_ROOT, "web", "app", "globals.css")

describe("the band above the workspace tab row is one token, halved, not a per-call-site override", () => {
  it("globals.css redeclares --shell-gutter-top on the kit's own screen-shell-card slot, at var(--space-3) — never the kit's own var(--space-6)", () => {
    const css = readFileSync(GLOBALS_CSS, "utf8")

    // THE OVERRIDE RULE ITSELF — a plain attribute selector on the kit's own
    // data-slot, setting the custom property directly (never inside a
    // Tailwind arbitrary-variant class string at a JSX call site, which is
    // the one-call-site shape this fix was told not to take).
    const overrideRule = /\[data-slot="screen-shell-card"\]\s*\{\s*--shell-gutter-top:\s*var\(--space-3\)\s*;\s*\}/
    expect(
      css,
      'web/app/globals.css must set [data-slot="screen-shell-card"] { --shell-gutter-top: var(--space-3); } — the token redeclared once, where the kit itself declares it, never overridden per call site'
    ).toMatch(overrideRule)

    // THE BAND CANNOT SILENTLY GROW BACK TO THE KIT'S OWN 24PX (OR PAST IT).
    // Read the override's own value out of the rule (never off a recalled
    // number) and refuse anything that resolves to --space-4 (16px) or
    // higher on the scale — --space-3 (12px) or smaller is the only shape
    // that reads as "reduced meaningfully" against the kit's 24px default.
    const REDUCED_OK = new Set(["--space-1", "--space-2", "--space-2h", "--space-3"])
    const match = overrideRule.exec(css)
    expect(match, "the override rule must be present to read its own value").toBeTruthy()
    const valueMatch = /--shell-gutter-top:\s*var\((--space-[\w-]+)\)/.exec(match![0])
    expect(valueMatch, "the override must set --shell-gutter-top to a var(--space-*) token, never a literal").toBeTruthy()
    const token = valueMatch![1]!
    expect(
      REDUCED_OK.has(token),
      `--shell-gutter-top's override reads ${token}, which is not a meaningful reduction from the kit's own --space-6 (24px) — expected one of ${[...REDUCED_OK].join(", ")}`
    ).toBe(true)
  })

  it("RED PROOF: the kit's own un-overridden value (var(--space-6), 24px) does not read as today's reduced rule", () => {
    const overrideRule = /\[data-slot="screen-shell-card"\]\s*\{\s*--shell-gutter-top:\s*var\(--space-3\)\s*;\s*\}/
    const unfixed = `
      [data-slot="screen-shell-card"] {
        --shell-gutter-top: var(--space-6);
      }
    `
    expect(unfixed, "the kit's own 24px value must not satisfy the reduced rule").not.toMatch(overrideRule)
  })

  it("RED PROOF: no override at all does not read as today's rule either", () => {
    const overrideRule = /\[data-slot="screen-shell-card"\]\s*\{\s*--shell-gutter-top:\s*var\(--space-3\)\s*;\s*\}/
    const noOverride = `
      .pinned-strip + [data-slot="card"] { --pinned-lead: var(--toolbar-lead-gap); }
    `
    expect(noOverride, "a stylesheet with no screen-shell-card override at all must not satisfy this rule").not.toMatch(
      overrideRule
    )
  })

  it("the override sits after @import \"tailwindcss\" in source order, so it wins the cascade at equal specificity", () => {
    const css = readFileSync(GLOBALS_CSS, "utf8")
    const importIdx = css.indexOf('@import "tailwindcss"')
    const overrideIdx = css.indexOf('[data-slot="screen-shell-card"] {')
    expect(importIdx, 'globals.css must still import tailwindcss').toBeGreaterThanOrEqual(0)
    expect(
      overrideIdx,
      "the screen-shell-card override must exist"
    ).toBeGreaterThan(-1)
    expect(
      overrideIdx,
      "the override must be written AFTER @import \"tailwindcss\" — an attribute selector and the kit's own generated utility class share specificity (0,1,0), so only source order decides which wins, the same mechanism the R83 rules in this file already depend on"
    ).toBeGreaterThan(importIdx)
  })
})
