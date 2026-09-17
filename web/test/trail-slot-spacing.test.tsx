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

  // SABOTAGE: put `pt-[var(--space-6)] lg:pt-[var(--space-7)]` (or any other
  // `pt-`/`mt-` utility) back on this div UNCONDITIONALLY →
  //   × the body wrapper never pays an unconditional pt/mt when a trail can render
  //     AssertionError: expected false to be true (or the `!hasTrail &&` guard is missing)
  //
  // THIS IS THE OTHER HALF OF THE 40-VS-8 BUG THE FIRST DESCRIBE LOCKS. That
  // one proves the kit's OWN trail slot carries S3's two tokens and nothing
  // app-owned; this proves the SAME thing about the one box downstream of it
  // the kit cannot reach — `ScreenShell`'s body pane is rendered by
  // `screen-shell.tsx`, but what app-shell.tsx puts INSIDE that pane, as its
  // own ordinary (non-sticky) child, is this file's. Staging measured 40px
  // between the trail's hairline and the title against S3's ruled 8: the
  // kit's own boxes (the trail slot, the header band, the body pane) all read
  // `pt-0`/0 the moment a trail renders, so a second, app-owned `pt` here was
  // the entire 32px difference. It exists at all only because the body pane
  // is ALSO a `position: sticky` scrollport for `PINNED_TOOLBAR` (R63) and a
  // sticky child of a PADDED scrollport never pins flush at the true top —
  // see the div's own comment, in place, for the full account — so the gap
  // moved here rather than disappearing, and it must move again, to zero,
  // whenever a trail is already paying it instead.
  it("the body wrapper never pays an unconditional pt/mt when a trail can render", () => {
    const src = readFileSync(join(WEB, "components/shell/app-shell.tsx"), "utf8")
    // The wrapper is identified positionally, the same way R20/R29 identify
    // their own targets: by the one signature of classes only this div
    // carries (`mx-auto` + `flex` + `w-full` + `max-w-none` + `min-h-full` +
    // `overflow-x-clip`), never by a line number, which rots the moment a
    // comment above it grows or shrinks.
    const marker = "mx-auto flex w-full max-w-none min-w-0 min-h-full flex-col overflow-x-clip"
    const markerAt = src.indexOf(marker)
    expect(markerAt, "app-shell.tsx must still carry the screen-shell body's own content wrapper").toBeGreaterThan(-1)
    // Bound the search at the div's own opening tag, from the `<div` before
    // the marker to the first `>` after it — wide enough to hold a `cn(...)`
    // call's full argument list, narrow enough never to reach the next
    // element.
    const divStart = src.lastIndexOf("<div", markerAt)
    const tagEnd = src.indexOf(">", markerAt)
    expect(divStart, "the marker must sit inside a <div ...> opening tag").toBeGreaterThan(-1)
    expect(tagEnd, "the wrapper's own opening tag must close within the file").toBeGreaterThan(markerAt)
    const wrapperTag = src.slice(divStart, tagEnd)
    // The guard itself must be present and must be the thing gating the
    // leading-space utility — not merely present somewhere unrelated in the
    // tag (a `pb-24`/`mb-` on a different concern would not satisfy this).
    expect(
      wrapperTag,
      "a trail-conditional guard (`!hasTrail && \"pt-...\"`) must gate this wrapper's own leading space"
    ).toMatch(/!hasTrail\s*&&\s*"[^"]*\b(pt|mt)-/)
    // And the part of the tag OUTSIDE that guard — the plain string literals
    // — must carry no `pt-`/`mt-` utility of its own. Strip the guarded
    // expression out first so its own `pt-`/`mt-` (which is SUPPOSED to be
    // there) cannot trip this half.
    const withoutGuard = wrapperTag.replace(/!hasTrail\s*&&\s*"[^"]*"/, "")
    expect(
      withoutGuard,
      "the wrapper's own unconditional classes must not carry a pt-/mt- utility outside the trail guard"
    ).not.toMatch(/[\s"](?:pt|mt)-\S/)
  })
})
