// @vitest-environment node
//
// THE STICKY TAB STRIP'S NEGATIVE-MARGIN ESCAPE MUST PAY EXACTLY THE PANEL
// PADDING IT IS ESCAPING FROM. Aurora's screenshot, 22 Sep 2026: a contact
// record whose title was visibly cut off along its bottom by the folder tabs
// strip. Measured and proven by `elementFromPoint`, at rest: the strip's top
// sat 18px above the header band's bottom, at `lg`.
//
// THE CAUSE - see `record-chrome.tsx`'s own comment immediately above
// `STICKY_TABS` for the full account. Short version: `STICKY_TABS`'s
// `-mt-[calc(…)]` escape used to include a term for `CardContent`'s own top
// padding - correct while a record's panel `Card` was always boxed, and
// wrong once R67 (21 Sep 2026) made a record's panel PLAIN by default:
// `CardContent`'s `isPlain && "px-0 pt-0 lg:pt-0"` zeroes exactly that
// padding, and this app's `RecordChrome` composition has no `surface` prop
// to opt back into `"paper"`, so every caller sits on a plain panel
// unconditionally. The fix dropped the stale padding term from the escape.
//
// SCOPED TO THE ESCAPE ALONE, NOT THE ROOT'S OWN BASE `gap` - A REAL
// CORRECTION, 22 Sep 2026, SAME DAY. A first draft of this fix also dropped
// `STICKY_TABS`'s base `gap-[var(--space-6)] lg:gap-[var(--space-7)]` (the
// flex gap between `[role=tablist]` and its `TabsContent` sibling) to
// `gap-0`, reasoning it was the other half of the same padding calculation.
// `web/test/toolbar-lead-gap-card.test.tsx`'s "R83, decision B" suite caught
// it: that gap's BASE value is not this file's padding computation to make,
// it is Aurora's own 21 Sep 2026 ruling that a pane whose content "starts
// with anything else, fact rows or prose," keeps the strip's ordinary,
// larger gap - only a TOOLBAR-LED active pane goes flush, and it does so
// through `globals.css`'s own selector-keyed override (`[data-slot="tabs"]
// :has(> [data-tab-pane][data-state="active"] [data-slot="card"]:first-child
// > [data-slot="card-content"] > [data-slot="toolbar-row-pin"]:first-child)
// { gap: 0px }`, plus its `CollectionFrame`/`PagedPanelBody` twins), never by
// this file changing the base. Dropping the base to `gap-0` made that
// override permanently redundant and silently changed the fact-rows case
// Aurora explicitly asked to leave alone - moving the red from this suite
// into `toolbar-lead-gap-card.test.tsx` instead of fixing it. So this census
// checks the `-mt` escape only, and separately asserts the base `gap` is
// UNCHANGED, still exactly what R83 decision B's own override needs
// something real to beat.
//
// THIS CENSUS proves the fix holds by reading the SAME FACTS the fix itself
// depends on, straight off disk, rather than re-deriving pixels:
//
//   1. The kit's `RecordDetail` still defaults `surface` to `"plain"`
//      (`shared/ui/components/record-detail/record-detail.tsx`) - if a
//      future kit pull changes the default back to `"paper"`, `CardContent`
//      would pay real padding again and the escape would need it back.
//   2. `CardContent`'s own `isPlain` branch still zeroes its top padding at
//      every breakpoint (`shared/ui/components/card/card.tsx`) - if the kit
//      ever ships a plain panel that DOES pay a top inset, the same drift
//      applies in the other direction.
//   3. `STICKY_TABS`'s own `-mt-[calc(…)]` escape spends no `--space-6`/
//      `--space-3`/`--space-7`-shaped padding term - a literal proof that
//      nobody re-added the overshoot this ruling removed.
//   4. `STICKY_TABS`'s own root `gap` still reads the base
//      `gap-[var(--space-6)] lg:gap-[var(--space-7)]` - the value R83
//      decision B's own `globals.css` override exists to beat for a
//      toolbar-led pane, and the value Aurora's ruling keeps for every
//      other pane. `web/test/toolbar-lead-gap-card.test.tsx` is what proves
//      the override itself still fires; this suite only proves the base
//      value this file owns has not drifted out from under it.
//
// A change to 1, 2 or 3 without the others is "the escape and the padding
// disagree again," and turns this red. A change to 4 alone is a different
// law's regression, and turns `toolbar-lead-gap-card.test.tsx` red instead -
// checked here too so a change made from THIS file's own side is not missed
// by only running that other suite.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { STICKY_TABS } from "@/components/records/record-chrome"

const REPO_ROOT = join(__dirname, "..", "..")

const kitCardContent = readFileSync(
  join(REPO_ROOT, "shared", "ui", "components", "card", "card.tsx"),
  "utf8"
)
const kitRecordDetail = readFileSync(
  join(REPO_ROOT, "shared", "ui", "components", "record-detail", "record-detail.tsx"),
  "utf8"
)
const kitRecordChrome = readFileSync(
  join(REPO_ROOT, "shared", "ui", "compositions", "templates", "record-chrome.tsx"),
  "utf8"
)
const appGlobalsCss = readFileSync(join(REPO_ROOT, "web", "app", "globals.css"), "utf8")

describe("tab-strip-escape-matches-padding - STICKY_TABS's escape pays exactly what the plain panel really charges", () => {
  it("the kit's RecordDetail still defaults a record's panel surface to \"plain\"", () => {
    expect(
      /surface\s*=\s*["']plain["']/.test(kitRecordDetail),
      "RecordDetail no longer defaults `surface` to \"plain\" - re-derive STICKY_TABS's escape " +
        "against whatever CardContent now pays on the panel this app's screens actually render."
    ).toBe(true)
  })

  it("this app's RecordChrome composition still declares and forwards no surface prop, so every caller stays plain", () => {
    // Neither a declared prop nor a real pass-through to <RecordDetail - the
    // one incidental mention of the word "surface" this file carries today
    // is an unrelated comment ("FormScreen surface=\"panel\"", a different
    // component), which neither pattern below matches.
    expect(
      /\bsurface\??:\s*["'`]/.test(kitRecordChrome) || /\bsurface\?:\s*"plain"\s*\|\s*"paper"/.test(kitRecordChrome),
      "RecordChromeProps now declares a `surface` field. STICKY_TABS's escape assumes every caller " +
        "sits on a PLAIN panel unconditionally (the padding term was dropped, not conditioned, because " +
        "there was no per-caller state to condition on) - if a caller can now choose \"paper\", the " +
        "formula needs a real per-caller branch instead of a flat drop."
    ).toBe(false)
    expect(
      /<RecordDetail[\s\S]{0,600}?\bsurface=\{/.test(kitRecordChrome),
      "RecordChrome now passes surface={…} to <RecordDetail>. Same reason as above: the escape's " +
        "zero-padding assumption is unconditional today and needs re-deriving per caller if this changes."
    ).toBe(false)
  })

  it("CardContent's own plain branch still zeroes its top padding at every breakpoint", () => {
    expect(
      /isPlain\s*&&\s*["']px-0 pt-0 lg:pt-0["']/.test(kitCardContent),
      "CardContent's plain branch no longer reads exactly `px-0 pt-0 lg:pt-0` - if a plain panel now " +
        "pays a real top padding again, STICKY_TABS's escape (currently zero-padding) needs it back."
    ).toBe(true)
  })

  it("STICKY_TABS's own -mt escape spends no --space-6/--space-3/--space-7 padding term", () => {
    const mt = STICKY_TABS.match(/-mt-\[calc\(([\s\S]*?)\)\]\s/)
    expect(mt, "STICKY_TABS carries no [role=tablist] -mt-[calc(…)] escape at all - read the constant's own comment before assuming this check is obsolete.").toBeTruthy()
    const calcBody = mt![1]
    expect(
      /--space-(3|6|7)\b/.test(calcBody),
      `STICKY_TABS's escape spends a CardContent-padding-shaped term again: -mt-[calc(${calcBody})]. ` +
        "The panel is plain and pays zero top padding (see the two checks above) - the escape must " +
        "name only --record-tab-strip-h and --record-tab-gap, never a --space-6/--space-7 padding term."
    ).toBe(false)
    expect(calcBody, "the escape should still clear the strip's own height and its trailing gap").toContain(
      "--record-tab-strip-h"
    )
    expect(calcBody).toContain("--record-tab-gap")
  })

  it("STICKY_TABS's own root gap is UNCHANGED - still the base value R83 decision B's override exists to beat", () => {
    // NOT gap-0 - that was the over-wide first draft. The base stays the
    // toolbar-lead-gap-card suite's own SANITY assertion ("the root must
    // actually carry STICKY_TABS's own base gap"), so both suites agree on
    // what the base is, from either side.
    expect(
      /(?:^|\s)gap-\[var\(--space-6\)\]/.test(STICKY_TABS),
      "STICKY_TABS no longer carries its base gap-[var(--space-6)] on the <Tabs> root - R83 decision B's " +
        "own globals.css override has nothing left to beat for a fact-rows/prose pane, which Aurora's " +
        "21 Sep 2026 ruling explicitly left at this larger gap. Restore the base; fix the escape (-mt) " +
        "alone if the title-cutoff bug reopens."
    ).toBe(true)
    expect(
      /(?:^|\s)lg:gap-\[var\(--space-7\)\]/.test(STICKY_TABS),
      "STICKY_TABS no longer carries its base lg:gap-[var(--space-7)] on the <Tabs> root - same reason " +
        "as the base-width case just above."
    ).toBe(true)
  })

  it("globals.css still carries R83 decision B's own zero-gap override for a toolbar-led active pane", () => {
    // A light cross-check, not a restatement of toolbar-lead-gap-card.test
    // .tsx's own much fuller proof (DOM match, CSS regex, arithmetic, a red
    // proof) - just enough that a change made from THIS file's side (the
    // base gap above) is caught here too, without waiting on that other
    // suite to be the only place it can go red.
    expect(
      appGlobalsCss,
      'globals.css no longer carries the [data-slot="tabs"]:has(…toolbar-row-pin:first-child) { gap: 0px } ' +
        "override - without it, STICKY_TABS's base gap (checked above) would apply UNBEATEN even on a " +
        "toolbar-led active pane, reopening the untouched 24/32px R83 decision B closed."
    ).toMatch(/\[data-slot="tabs"\]:has\(/)
    expect(appGlobalsCss).toMatch(/toolbar-row-pin"\]:first-child\s*\)\s*(?:,[\s\S]*?)?\{\s*gap:\s*0px\s*;\s*\}/)
  })
})
