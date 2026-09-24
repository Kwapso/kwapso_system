// @vitest-environment node
//
// A pure source scan: it reads globals.css off disk and never touches a DOM.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE BASE WEIGHT MUST BE SET, AND MUST BE THE TOKEN.
// ─────────────────────────────────────────────────────────────────────────────
//
// Saans ships exactly two faces — Light 300 and Medium 500 (the @font-face
// block in the kit's foundations/tokens/tokens.css) — and no 400 face. Neither
// front door's <body> used to set a font-weight, so text fell back to the UA's
// `normal` (400); CSS font matching resolves an unavailable 400 to the nearest
// AVAILABLE weight at or above it, which is 500 — so every weight in the app
// rendered as Medium and any light/medium step meant to signal something (the
// ticket stage ladder's current-step cue among them) carried no signal at all.
// Measured live: a string at 300/400/500/`normal` rendered three identical
// widths and one different one. The kit's own demo sets the light weight on
// its body (demo/demo.css), which is why this looked correct in the kit and
// was wrong in the app.
//
// THE FIX IS ONE DECLARATION ON <body>, IN BOTH FRONT DOORS: `font-weight:
// var(--font-weight-light)`. This census holds it down. It checks the TOKEN
// name rather than the literal `300` on purpose — a literal would keep this
// test green even if the kit ever renumbers its light weight, silently
// drifting the app out of step with the kit it is meant to track.
//
// SCOPED TO A `body {` RULE, not merely "the string appears somewhere in the
// file" — globals.css is long enough, and edited by enough hands, that the
// declaration could land on the wrong selector and still make a naive
// substring check pass.

import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const ROOT = join(import.meta.dirname, "..", "..")

const FRONT_DOORS = [
  { name: "agency (web/)", path: join(ROOT, "web", "app", "globals.css") },
  { name: "portal (web-portal/)", path: join(ROOT, "web-portal", "app", "globals.css") },
] as const

/** The first `body { ... }` rule's own contents, or null if none is found. */
function firstBodyRuleBody(css: string): string | null {
  const start = css.indexOf("body {")
  if (start === -1) return null
  const open = css.indexOf("{", start)
  const close = css.indexOf("}", open)
  if (open === -1 || close === -1) return null
  return css.slice(open + 1, close)
}

describe("base-font-weight", () => {
  for (const door of FRONT_DOORS) {
    it(`${door.name} sets body's base weight to the light token`, () => {
      const css = readFileSync(door.path, "utf8")
      const body = firstBodyRuleBody(css)
      expect(body, `${door.path} has no "body {" rule to read`).not.toBeNull()

      expect(
        body,
        `${door.path}'s first body rule does not set font-weight: var(--font-weight-light). ` +
          "Saans has no 400 face, so an unset body weight resolves to the Medium (500) " +
          "face by CSS font matching, and every light/medium step in the app (the ticket " +
          "stage ladder's current-step cue among them) collapses to no signal at all.",
      ).toMatch(/font-weight:\s*var\(--font-weight-light\)\s*;/)

      // A literal 300 would satisfy the visual result today and silently stop
      // tracking the kit's own token if it is ever renumbered.
      expect(
        body,
        `${door.path}'s body rule spells the base weight as a literal number rather ` +
          "than var(--font-weight-light) — spell it as the token so it tracks the kit.",
      ).not.toMatch(/font-weight:\s*300\s*;/)
    })
  }
})
