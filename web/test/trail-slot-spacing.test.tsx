// S3's TRAIL SPACING, LOCKED AT THE ONLY TWO PLACES IT CAN DRIFT.
//
// Staging measured 12px above the trail line and 40px between the trail and
// the title, against S3's ruling of 20 above and 8 below. The kit's own
// `screen-shell.tsx` (v1.2.112) produces 20/8 by construction — one token
// above the trail (`DENSITY_TRAIL`'s `pt`), one token after it (`TRAIL_GAP`'s
// `mb`), a hairline `<Separator />` inside that same padded box, and the
// title band's own leading `pt` zeroed to `pt-0` whenever a trail renders so
// the two tokens never stack into a "30px, not 8" bug a second time.
//
// So the rule this file locks is NOT "the numbers are 20/8" — that is the
// kit's own job and belongs to the kit's repo. It is: THE APP MUST NOT OWN
// TRAIL SPACING. `app-shell.tsx` hands the kit's `trail` prop a bare node
// (no `className` of its own) and lets `screen-shell.tsx` decide where the
// gap comes from — the first describe below proves the kit's slot really is
// what wraps a trail and really does zero the title's leading `pt`; the
// second reads `app-shell.tsx` off disk and proves it never reintroduces a
// spacing class of its own around what it hands to that slot, which is the
// one place a future edit could quietly bring the app-owned gap back.

import { cleanup, render } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { afterEach, describe, expect, it } from "vitest"

import { ScreenShell } from "@shared/ui/compositions/templates/screen-shell"

afterEach(cleanup)

const HERE = dirname(fileURLToPath(import.meta.url))
const WEB = join(HERE, "..")

describe("the kit's own trail slot — screen-shell.tsx, v1.2.112", () => {
  // SABOTAGE: delete `TRAIL_GAP`/`DENSITY_TRAIL` from the trail slot's
  // className (or drop the `<Separator />` inside it) →
  //   × wraps a trail in one padded box, S3's own two tokens, with a hairline
  //     AssertionError: expected null not to be null (or the separator query fails)
  it("wraps a trail in one padded box, S3's own two tokens, with a hairline", () => {
    const { container } = render(
      <ScreenShell trail={<div data-testid="trail-stub">trail</div>} title="Tasks">
        <div>content</div>
      </ScreenShell>
    )
    const slot = container.querySelector('[data-slot="screen-shell-trail"]')
    expect(slot, "a trail must render through the kit's own screen-shell-trail slot").toBeTruthy()
    // ABOVE THE TRAIL — DENSITY_TRAIL's own `pt`, S3's 20, at the shell's
    // default (comfortable) density.
    expect(slot!.className, "20 above, DENSITY_TRAIL's pt, not an app-owned class").toContain(
      "pt-[var(--space-5)]"
    )
    // AFTER THE TRAIL — TRAIL_GAP's own `mb`, S3's 8.
    expect(slot!.className, "8 after, TRAIL_GAP's mb, not an app-owned class").toContain(
      "mb-[var(--space-2)]"
    )
    // IT IS THE WRAPPER, not a sibling — the node this file hands the `trail`
    // prop renders INSIDE the slot.
    expect(slot!.querySelector('[data-testid="trail-stub"]'), "the slot must wrap the trail node, not sit beside it").toBeTruthy()
    // THE HAIRLINE — S3's third sentence, "maybe we could add a divider
    // line," is the kit's own `<Separator />` inside the same padded box.
    expect(slot!.querySelector('[data-slot="separator"]'), "the hairline lives inside the trail slot's own box").toBeTruthy()
  })

  // SABOTAGE: drop the `trail ? "pt-0" : undefined` clause from the header
  // band's className →
  //   × zeroes the title band's own leading pt so the two tokens above never stack
  //     AssertionError: expected 'min-w-0 shrink-0 px-[var(--space-6)]...' not to contain 'pt-0'
  it("zeroes the title band's own leading pt so the two tokens above never stack", () => {
    const withTrail = render(
      <ScreenShell trail={<div>trail</div>} title="Tasks">
        <div>content</div>
      </ScreenShell>
    )
    const bandWithTrail = withTrail.container.querySelector('[data-slot="screen-shell-header"]')
    expect(bandWithTrail, "a title still draws its own band when a trail is present").toBeTruthy()
    expect(bandWithTrail!.className, "the band's own pt must be zeroed — TRAIL_GAP already supplied the gap").toContain("pt-0")
    withTrail.unmount()

    // CONTRAST: no trail, the band keeps its own leading pt exactly as
    // before — proving `pt-0` is trail-conditional, not a constant that
    // happened to pass above.
    const { container } = render(
      <ScreenShell title="Tasks">
        <div>content</div>
      </ScreenShell>
    )
    expect(container.querySelector('[data-slot="screen-shell-trail"]'), "no trail, no slot").toBeNull()
    const bandNoTrail = container.querySelector('[data-slot="screen-shell-header"]')
    expect(bandNoTrail, "a title-only screen still draws its band").toBeTruthy()
    expect(bandNoTrail!.className, "a trail-less screen keeps its own space above the title").toContain(
      "pt-[var(--space-6)]"
    )
    expect(bandNoTrail!.className, "…and must not carry the trail-only override").not.toContain("pt-0")
  })
})

describe("app-shell.tsx hands the trail to that slot as a bare node", () => {
  // SABOTAGE: wrap the `<TrailLine>` this file builds in a `<div className="mt-3 mb-10">`
  // (an app-owned spacing guess, the shape of the staging bug: 12 above, 40
  // below instead of the kit's 20/8) →
  //   × the trail prop's own wrapper carries no className of its own
  //     AssertionError: expected the trail prop's block not to match /<div\s[^>]*className=/
  it("the trail prop's own wrapper carries no className of its own", () => {
    const src = readFileSync(join(WEB, "components/shell/app-shell.tsx"), "utf8")
    const trailPropStart = src.indexOf("trail={")
    expect(trailPropStart, "app-shell.tsx must hand the kit's ScreenShell a trail prop").toBeGreaterThan(-1)
    const headerPropStart = src.indexOf("header={", trailPropStart)
    expect(headerPropStart, "the trail prop must be followed by the header prop, so the block below is bounded").toBeGreaterThan(trailPropStart)
    const trailPropBlock = src.slice(trailPropStart, headerPropStart)
    // The node handed to `trail` may open exactly one wrapper div (for the
    // click-capture interception, R37) — it must own no spacing class. A
    // `className` anywhere in this block would mean the app is deciding the
    // trail's own margin/padding again, which is the bug this file exists to
    // catch.
    expect(trailPropBlock, "the block between trail={ and header={ must not spend a className").not.toMatch(/className=/)
    // And it really is the kit's own TrailLine landing in that prop, not a
    // hand-rolled stand-in.
    expect(trailPropBlock, "the trail prop must hand the kit's own TrailLine to the slot").toContain("<TrailLine")
  })
})
