// THE KNOWLEDGE SOURCE'S FOOTER BAND SITS FLUSH — finding, 21 Sep 2026,
// PROVED STILL LIVE ON STAGING AT COMMIT e30fa49e: the dark band on a
// knowledge source was still inset 24px from each pane edge (band x 188 to
// 1399 on a pane 164 to 1423 at 1440) despite the FIRST fix (git history) —
// which put `<RecordFooterBand>` in this file's OWN hand-rolled
// `<div className="flex-1 flex-col gap-6">` sibling of `<RecordScreen>`,
// "flex-none mt-auto w-full" wrapper and all. That construction reads, byte
// for byte, like `record-detail-body.tsx`'s own `<RecordDetailBody>` — and
// is not it: a second, parallel hand-copy of a proved shape, exactly the
// mistake `RecordDetailBody`'s own header warns against ("without
// hand-copying it a second time").
//
// THE FIX: this screen now CALLS `<RecordDetailBody>` — the same component
// `story-detail.tsx` calls for the ticket/story two-column shape — with no
// `side` (a knowledge source has no side column, one tabbed body only;
// `side` is optional for exactly this reason, see `record-detail-body.tsx`'s
// own doc comment on it). One construction, not a look-alike of it.
//
// A STATIC CENSUS: the claim is a source-position fact (which component
// draws the band, and whether this file still hand-rolls its own copy of
// `RecordDetailBody`'s wrapper), not a rendered pixel — the same discipline
// every other R89/R83-shaped law in this repo checks off the file rather
// than through jsdom, which applies no CSS box model at all.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { stripComments } from "@shared/rules/source-scan"

const ROOT = join(__dirname, "..", "..")
const DETAIL_PATH = join(ROOT, "web", "components", "knowledge", "knowledge-detail.tsx")
const BODY_PATH = join(ROOT, "web", "components", "records", "record-detail-body.tsx")
const source = () => stripComments(readFileSync(DETAIL_PATH, "utf8"))
const bodySource = () => stripComments(readFileSync(BODY_PATH, "utf8"))

describe("knowledge-detail's footer band sits flush, through the SAME construction the ticket/story pages use (finding, 21 Sep 2026)", () => {
  it("imports RecordDetailBody — the shared, proved root, not a hand-rolled look-alike", () => {
    const src = source()
    expect(src).toMatch(/import \{[^}]*\bRecordDetailBody\b[^}]*\}\s*from\s*"@\/components\/records\/record-detail-body"/)
    expect(src, "RecordDetailBody must actually be called").toContain("<RecordDetailBody")
  })

  it("imports RecordFooterBand and hands it to RecordDetailBody's own footer prop, not RecordScreen's combined footer", () => {
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

  it("<RecordDetailBody> is called with dataSlot, main and footer — never a second data-slot wrapper of this file's own", () => {
    const src = source()
    const callIdx = src.indexOf("<RecordDetailBody")
    expect(callIdx, "RecordDetailBody must be called").toBeGreaterThan(-1)
    const closeIdx = src.indexOf("\n    />", callIdx)
    expect(closeIdx, "the RecordDetailBody call must close").toBeGreaterThan(callIdx)
    const call = src.slice(callIdx, closeIdx)
    expect(call, "the call must name its own dataSlot").toMatch(/dataSlot="knowledge-detail-body"/)
    expect(call, "the call must pass main").toContain("main={")
    expect(call, "the call must pass footer").toContain("footer={")
    // NO `side` — a knowledge source has no side column, one tabbed body
    // only (record-detail-body.tsx's own doc comment on the prop).
    expect(call, "the call must NOT pass side — one tabbed body, no side column").not.toMatch(/\bside=\{/)
    // AND NO HAND-ROLLED "flex-none mt-auto w-full" WRAPPER ANY MORE — that
    // shape now lives exactly once, inside record-detail-body.tsx, and this
    // file calling it rather than re-typing it is the whole fix.
    expect(
      call,
      "this file must not still hand-roll RecordDetailBody's own wrapper class string"
    ).not.toContain("flex-none mt-auto w-full")
  })

  it("the same wrapper string this file used to hand-roll now lives ONLY in record-detail-body.tsx, never duplicated here", () => {
    const src = source()
    expect(
      src,
      "knowledge-detail.tsx must not carry its own copy of the root's flex/gap classes any more"
    ).not.toMatch(/data-slot="knowledge-detail-body" className="flex min-w-0 flex-1 flex-col gap-6"/)
    // record-detail-body.tsx is the one file that still says it, twice: the
    // root and the footer wrapper.
    const body = bodySource()
    expect(body).toContain('className="flex min-w-0 flex-1 flex-col gap-6"')
    expect(body).toContain('className="flex-none mt-auto w-full"')
  })

  it("RecordDetailBody's own `side` prop is genuinely optional, and absent it renders `main` alone (no lg grid, no empty second track)", () => {
    const body = bodySource()
    expect(body, "side must be typed optional").toMatch(/side\?:\s*React\.ReactNode/)
    expect(
      body,
      "absent side must skip the lg/below-lg grid entirely and render main by itself"
    ).toMatch(/side === undefined \? \(\s*main\s*\)/)
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
