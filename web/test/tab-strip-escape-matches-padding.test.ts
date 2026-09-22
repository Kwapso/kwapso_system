// @vitest-environment node
//
// THE STICKY TAB STRIP'S NEGATIVE-MARGIN ESCAPE MUST PAY EXACTLY THE PANEL
// PADDING IT IS ESCAPING FROM. Aurora's screenshot, 22 Sep 2026: a contact
// record whose title was visibly cut off along its bottom by the folder tabs
// strip. Measured and proven by `elementFromPoint`, at rest: the strip's top
// sat 18px above the header band's bottom, at `lg`.
//
// THE CAUSE — see `record-chrome.tsx`'s own comment immediately above
// `STICKY_TABS` for the full account. Short version: `STICKY_TABS`'s
// `-mt-[calc(…)]` escape (and its root's own flex `gap`) used to include a
// term for `CardContent`'s own top padding — correct while a record's panel
// `Card` was always boxed, and wrong once R67 (21 Sep 2026) made a record's
// panel PLAIN by default: `CardContent`'s `isPlain && "px-0 pt-0 lg:pt-0"`
// zeroes exactly that padding, and this app's `RecordChrome` composition has
// no `surface` prop to opt back into `"paper"`, so every caller sits on a
// plain panel unconditionally. The fix dropped the stale padding term from
// both the escape and the root's own flex gap.
//
// THIS CENSUS proves the fix holds by reading the SAME THREE FACTS the fix
// itself depends on, straight off disk, rather than re-deriving pixels:
//
//   1. The kit's `RecordDetail` still defaults `surface` to `"plain"`
//      (`shared/ui/components/record-detail/record-detail.tsx`) — if a
//      future kit pull changes the default back to `"paper"`, `CardContent`
//      would pay real padding again and this formula would need it back.
//   2. `CardContent`'s own `isPlain` branch still zeroes its top padding at
//      every breakpoint (`shared/ui/components/card/card.tsx`) — if the kit
//      ever ships a plain panel that DOES pay a top inset, the same drift
//      applies in the other direction.
//   3. `STICKY_TABS`'s own `-mt-[calc(…)]` escape and its root `gap` spend
//      no `--space-6`/`--space-3`/`--space-7`-shaped padding term — a
//      literal proof that nobody re-added the overshoot this ruling removed.
//
// A change to any one of the three without the other two is exactly "the
// escape and the padding disagree again," and turns this red.

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

describe("tab-strip-escape-matches-padding — STICKY_TABS pays exactly what the plain panel really charges", () => {
  it("the kit's RecordDetail still defaults a record's panel surface to \"plain\"", () => {
    expect(
      /surface\s*=\s*["']plain["']/.test(kitRecordDetail),
      "RecordDetail no longer defaults `surface` to \"plain\" — re-derive STICKY_TABS's escape " +
        "against whatever CardContent now pays on the panel this app's screens actually render."
    ).toBe(true)
  })

  it("this app's RecordChrome composition still declares and forwards no surface prop, so every caller stays plain", () => {
    // Neither a declared prop nor a real pass-through to <RecordDetail — the
    // one incidental mention of the word "surface" this file carries today
    // is an unrelated comment ("FormScreen surface=\"panel\"", a different
    // component), which neither pattern below matches.
    expect(
      /\bsurface\??:\s*["'`]/.test(kitRecordChrome) || /\bsurface\?:\s*"plain"\s*\|\s*"paper"/.test(kitRecordChrome),
      "RecordChromeProps now declares a `surface` field. STICKY_TABS's escape assumes every caller " +
        "sits on a PLAIN panel unconditionally (the padding term was dropped, not conditioned, because " +
        "there was no per-caller state to condition on) — if a caller can now choose \"paper\", the " +
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
      "CardContent's plain branch no longer reads exactly `px-0 pt-0 lg:pt-0` — if a plain panel now " +
        "pays a real top padding again, STICKY_TABS's escape (currently zero-padding) needs it back."
    ).toBe(true)
  })

  it("STICKY_TABS's own -mt escape spends no --space-6/--space-3/--space-7 padding term", () => {
    const mt = STICKY_TABS.match(/-mt-\[calc\(([\s\S]*?)\)\]\s/)
    expect(mt, "STICKY_TABS carries no [role=tablist] -mt-[calc(…)] escape at all — read the constant's own comment before assuming this check is obsolete.").toBeTruthy()
    const calcBody = mt![1]
    expect(
      /--space-(3|6|7)\b/.test(calcBody),
      `STICKY_TABS's escape spends a CardContent-padding-shaped term again: -mt-[calc(${calcBody})]. ` +
        "The panel is plain and pays zero top padding (see the two checks above) — the escape must " +
        "name only --record-tab-strip-h and --record-tab-gap, never a --space-6/--space-7 padding term."
    ).toBe(false)
    expect(calcBody, "the escape should still clear the strip's own height and its trailing gap").toContain(
      "--record-tab-strip-h"
    )
    expect(calcBody).toContain("--record-tab-gap")
  })

  it("STICKY_TABS's own root gap is 0, not a CardContent-padding-shaped value", () => {
    expect(
      / gap-0 /.test(STICKY_TABS),
      "STICKY_TABS no longer reads a bare gap-0 on the <Tabs> root — TabsContent needs to land flush " +
        "with the plain panel's own (zero) top padding, which only a zero root gap gives it once the " +
        "escape above no longer reserves a --space-6/--space-7 remainder for it."
    ).toBe(true)
    expect(
      /gap-\[var\(--space-(3|6|7)\)\]/.test(STICKY_TABS),
      "STICKY_TABS still spends a --space-3/--space-6/--space-7 gap on the <Tabs> root — that was the " +
        "companion term to the dropped padding term in the -mt escape; both must move together."
    ).toBe(false)
  })
})
