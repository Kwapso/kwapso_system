// THE KNOWLEDGE SOURCE'S FOOTER BAND SITS FLUSH — finding, 21 Sep 2026: the
// dark band on a knowledge source stopped 24px above the pane's own bottom
// edge at 1440 (6px at 760), while the ticket page's band is flush. Cause:
// this screen used to hand `activity`/`onAddNote`/`notePlaceholder` straight
// to `<RecordScreen>` and let ONE combined `<RecordDetail>` call draw the
// footer, which carries none of the pane-edge escape `<RecordFooterBand>`
// pulls for itself (`-mx-[var(--pane-inset-x,0px)]`, record-chrome.tsx) — so
// the band sat inset inside the panel's ordinary padding instead of reaching
// the edge. Fixed the same way help-detail.tsx and story-detail.tsx do it:
// `<RecordScreen panelVisible={false} footerVisible={false}>` draws the head
// alone, and a sibling wraps the body with `<RecordFooterBand>` as its own
// `mt-auto` last child — the identical root shape `record-detail-body.tsx`'s
// own comment proves against `ticket-detail-body.tsx`, minus the `lg` grid
// this single-column screen does not need.
//
// A STATIC CENSUS: the claim is a source-position fact (which component
// draws the band, and whether anything after it carries a trailing inset),
// not a rendered pixel — the same discipline every other R89/R83-shaped law
// in this repo checks off the file rather than through jsdom, which applies
// no CSS box model at all.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { stripComments } from "@shared/rules/source-scan"

const ROOT = join(__dirname, "..", "..")
const DETAIL_PATH = join(ROOT, "web", "components", "knowledge", "knowledge-detail.tsx")
const source = () => stripComments(readFileSync(DETAIL_PATH, "utf8"))

describe("knowledge-detail's footer band sits flush (finding, 21 Sep 2026)", () => {
  it("imports RecordFooterBand and calls it as its own composition, not through RecordScreen's combined footer", () => {
    const src = source()
    expect(src).toMatch(/import \{[^}]*\bRecordFooterBand\b[^}]*\}\s*from\s*"@\/components\/records\/record-chrome"/)
    expect(src, "RecordFooterBand must actually be called").toContain("<RecordFooterBand")
  })

  it("the main <RecordScreen> call turns its own combined footer off (panelVisible + footerVisible false)", () => {
    const src = source()
    // Scoped to the SUCCESS-path call (the one with `collectionLabel`) —
    // the loading/error `<RecordScreen>` calls draw no footer at all and
    // are unrelated to this finding.
    const successCallIdx = src.indexOf("collectionLabel={KNOWLEDGE_KIND[item.kind] ?? item.kind}")
    expect(successCallIdx, "the success-path RecordScreen call must be findable").toBeGreaterThan(-1)
    const callTail = src.slice(successCallIdx, successCallIdx + 2000)
    expect(callTail, "panelVisible={false} must be on the success-path call").toContain("panelVisible={false}")
    expect(callTail, "footerVisible={false} must be on the success-path call").toContain("footerVisible={false}")
    // AND THE OLD DIRECT PROPS ARE GONE FROM THAT CALL — the footer's data
    // now travels through <RecordFooterBand> instead.
    expect(callTail, "activity must no longer be handed to RecordScreen directly").not.toMatch(/^\s*activity=\{activity\}/m)
  })

  it("<RecordFooterBand> sits inside a flex-none, mt-auto wrapper — the R89 flush mechanic", () => {
    const src = source()
    const bandIdx = src.indexOf("<RecordFooterBand")
    expect(bandIdx, "RecordFooterBand must be called").toBeGreaterThan(-1)
    // The wrapper div opens shortly BEFORE the call and must carry both
    // `flex-none` (so it never stretches) and `mt-auto` (so it is pushed to
    // the bottom of its own flex column) — the exact pair
    // `record-detail-body.tsx`'s own footer wrapper carries.
    const before = src.slice(Math.max(0, bandIdx - 400), bandIdx)
    expect(before, "the band's own wrapper must carry mt-auto").toMatch(/className="flex-none mt-auto w-full"/)
  })

  it("nothing renders after <RecordFooterBand>'s own wrapper closes but sibling dialogs (no trailing padded wrapper)", () => {
    const src = source()
    const bandWrapperOpenIdx = src.indexOf('className="flex-none mt-auto w-full"')
    expect(bandWrapperOpenIdx, "the band's own wrapper must be findable").toBeGreaterThan(-1)
    // The body column itself (`data-slot="knowledge-detail-body"`) must
    // close right after the band wrapper, with the fragment closing the
    // whole return after only the two form dialogs — never a further
    // `<div>` carrying its own bottom padding around the band.
    const afterBand = src.slice(bandWrapperOpenIdx, bandWrapperOpenIdx + 300)
    expect(afterBand, "no padded wrapper (pb-*/p-*) trails the band inside its own column").not.toMatch(
      /\bp[bxy]?-\[?[\w.]/
    )
  })

  it("the return closes on a fragment, not a second </RecordScreen> — the body is a sibling, not RecordScreen's child", () => {
    const src = source()
    // Scoped to the success-path return (after the error/loading RecordScreen
    // calls, which are unrelated self-closing calls).
    const successReturnIdx = src.indexOf("collectionLabel={KNOWLEDGE_KIND[item.kind] ?? item.kind}")
    const tail = src.slice(successReturnIdx)
    expect(tail, "the function must close on a fragment").toMatch(/<\/>\s*\)\s*}\s*$/)
  })
})
