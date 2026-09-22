// @vitest-environment node
//
// THE AIR ABOVE THE WORKSPACE TAB ROW, HALVED — TWICE. Aurora, verbatim,
// 22 Sep 2026, pointing at her own screenshot: "look at my screenshot. athts
// the spacing i want reduced" — the empty band between the window's own top
// edge and the workspace tab row (the open-tab strip, `BreadcrumbFolders` in
// tab-set mode, `data-slot="breadcrumb-folders"`), never the folder tabs
// INSIDE a page (that is `--heading-strip-gap`, this file's own sibling
// test, `heading-strip-gap.test.ts`) and never the gap above a page title.
//
// FIRST HALVING (SAME DAY, EARLIER): a diagnosis lane found the band is one
// token, `--shell-gutter-top`, declared by the kit's own outer screen wrapper
// (`data-slot="screen-shell-card"`, `shared/ui/compositions/templates/
// screen-shell.tsx`, `DENSITY_GUTTER_TOP`) and inherited down to the content
// column's own `pt-[var(--shell-gutter-top)]`, the tab row's immediate
// parent — and patched it APP SIDE, redeclaring the token in
// `web/app/globals.css` on a plain selector matching the kit's own
// `data-slot`. That lane's own report named the real fix: this app's
// standing rule is that the kit is the only UI input, so an app-side patch
// of a kit token is a kit bug, not a legitimate fix.
//
// SECOND HALVING (THIS ONE): the real fix, upstream. `DENSITY_GUTTER_TOP`
// now reads `var(--space-3)` (12px, half of the 24px her own 21 Sep ruling
// asked for) at both densities in kwapso-design, and the app-side override
// this file used to census is DELETED from `globals.css` the same day —
// `web/app/globals.css` carries no `[data-slot="screen-shell-card"]` rule at
// all any more. This suite now censuses the KIT's own source for the
// halving, exactly as `shell-bottom-edge.test.ts` already does for the flush
// foot on the same file, plus proves the app-side override stays gone.
//
// THIS FILE CANNOT GO FULLY GREEN UNTIL THE KIT TAG SYNCS. `shared/ui/` is
// vendored and pinned (`shared/ui/VERSION.json`); the kit fix landed in the
// kwapso-design repo but is not pulled into this checkout yet. The
// "app carries no override" half of this suite is true today and green now;
// the "kit itself reads --space-3" half reads the vendored copy on disk,
// which still reads v1.2.162's `var(--space-6)` until
// `node scripts/sync-design.mjs <tag>` (+ `design-imports.mjs` +
// `build-screen-builder.mjs`, `npm run kit:drift` saying IN SYNC) pulls the
// tag this fix ships in. That second describe block is expected RED until
// then — see its own comment for exactly which assertions clear on the sync.
//
// PROVED BY RESTORING THE OLD OVERRIDE AND WATCHING THIS FAIL: `cp
// web/app/globals.css` to a scratch copy, appended the retired
// `[data-slot="screen-shell-card"] { --shell-gutter-top: var(--space-6); }`
// rule back onto the live file, re-ran this suite ("the override is gone"
// went red), then restored the file from the `cp` copy (never
// `git checkout --`) and re-ran (green again).

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import { stripComments } from "@shared/rules/source-scan"

const HERE = dirname(fileURLToPath(import.meta.url))
const WEB = join(HERE, "..")
const ROOT = join(WEB, "..")

const GLOBALS_CSS = join(WEB, "app", "globals.css")
const KIT_SCREEN_SHELL = join(ROOT, "shared", "ui", "compositions", "templates", "screen-shell.tsx")

/** Strips comments so a census below can never match a class token, or a
 *  retired rule, that the comments merely talk about in prose. Same shared
 *  stripper `shell-bottom-edge.test.ts` uses, never a retyped regex —
 *  `web/test/source-scan.test.ts` censuses exactly this. */
const stripBlockComments = (src: string) => stripComments(src, { keepLength: true })

describe("the app carries no override of --shell-gutter-top any more", () => {
  it("globals.css declares no [data-slot=\"screen-shell-card\"] rule at all — the kit fix replaced it, not widened it", () => {
    const css = stripBlockComments(readFileSync(GLOBALS_CSS, "utf8"))

    // THE OVERRIDE RULE, IN EITHER OF ITS TWO SHAPES — the halved one this
    // app shipped first (var(--space-3)) and the kit's own pre-fix value
    // (var(--space-6)), so this assertion catches the override coming back
    // at ANY value, not only the one it happened to hold before deletion.
    const overrideRule = /\[data-slot="screen-shell-card"\]\s*\{[^}]*--shell-gutter-top:[^}]*\}/
    expect(
      css,
      'web/app/globals.css must not declare [data-slot="screen-shell-card"] { --shell-gutter-top: … } — the kit ' +
        "now declares the reduced value itself (DENSITY_GUTTER_TOP, screen-shell.tsx), so an app-side rule here " +
        "would be a stale, redundant patch of a kit bug that is already fixed upstream, the same shape this app's " +
        "standing rule (\"the kit is the only UI input\") refuses everywhere else."
    ).not.toMatch(overrideRule)
  })

  it("RED PROOF: the retired app-side override, restored at any value, does not read as today's truth", () => {
    const overrideRule = /\[data-slot="screen-shell-card"\]\s*\{[^}]*--shell-gutter-top:[^}]*\}/
    const restored = stripBlockComments(`
      [data-slot="screen-shell-card"] {
        --shell-gutter-top: var(--space-6);
      }
    `)
    expect(restored, "the retired override, put back at the kit's own old value, must fail the rule above").toMatch(
      overrideRule
    )
  })
})

describe("the kit itself declares the reduced value — expected RED until the coordinator syncs the tag this fix ships in", () => {
  const kitSrc = readFileSync(KIT_SCREEN_SHELL, "utf8")
  const kitBare = stripBlockComments(kitSrc)

  it("DENSITY_GUTTER_TOP reads var(--space-3) at both densities, never the pre-fix var(--space-6)", () => {
    // CLEARS ON SYNC. Red today against the vendored v1.2.162 copy (still
    // var(--space-6) at both densities); green once shared/ui/ is synced to
    // the kwapso-design tag this fix ships in.
    const declaration =
      /const DENSITY_GUTTER_TOP: Record<ScreenDensity, string> = \{\s*comfortable: "\[--shell-gutter-top:var\((--space-[\w-]+)\)\]",\s*calm: "\[--shell-gutter-top:var\((--space-[\w-]+)\)\]",\s*\};/
    const match = declaration.exec(kitBare)
    expect(match, "shared/ui/compositions/templates/screen-shell.tsx must still declare DENSITY_GUTTER_TOP in the shape this reads").toBeTruthy()
    const [, comfortable, calm] = match!
    expect(comfortable, "comfortable density must read --space-3 (12px), half of the pre-fix --space-6 (24px)").toBe(
      "--space-3"
    )
    expect(calm, "calm density must read --space-3 too — the token has never varied by density, on purpose").toBe(
      "--space-3"
    )
  })

  it("ASIDE_TAB still reads the same token — the standing invariant that the two columns' tabs start at one y", () => {
    // ALREADY GREEN, SYNC OR NOT. ASIDE_TAB reads the custom property by
    // name, not its value, so this holds before and after the sync alike —
    // pinned here so a future edit cannot detach the assistant's own tab
    // from the token this suite is about.
    expect(
      kitBare,
      "ASIDE_TAB must still read pt-[var(--shell-gutter-top)] — the assistant's folder tab moves with the " +
        "content column's own top gutter by construction, not by two literals agreeing"
    ).toMatch(/const ASIDE_TAB = cn\("pt-\[var\(--shell-gutter-top\)\]"\);/)
  })

  it("the content column still pays only the top half of the gutter — no bottom padding returned", () => {
    // ALREADY GREEN, SYNC OR NOT. Guards the 21 Sep bottom-edge ruling
    // (shell-bottom-edge.test.ts's own subject) against this change
    // reintroducing a py- here instead of a pt-only class.
    expect(kitBare).toMatch(/"flex min-h-0 min-w-0 flex-1 flex-col pt-\[var\(--shell-gutter-top\)\]",/)
  })

  it("RED PROOF: the kit's own pre-fix value does not read as today's reduced rule", () => {
    const declaration =
      /const DENSITY_GUTTER_TOP: Record<ScreenDensity, string> = \{\s*comfortable: "\[--shell-gutter-top:var\(--space-3\)\]",\s*calm: "\[--shell-gutter-top:var\(--space-3\)\]",\s*\};/
    const unfixed = `
      const DENSITY_GUTTER_TOP: Record<ScreenDensity, string> = {
        comfortable: "[--shell-gutter-top:var(--space-6)]",
        calm: "[--shell-gutter-top:var(--space-6)]",
      };
    `
    expect(unfixed, "the kit's own pre-fix 24px value must not satisfy the reduced rule").not.toMatch(declaration)
  })
})
