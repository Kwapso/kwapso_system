// THE BOTTOM EDGE, NOW THE KIT'S OWN — Aurora, 21 Sep 2026, the Minimal Kit
// page's decisions, item "the bottom edge": "go and imlpement tis appwide,
// also implement the to the bottom edge for main content and assistant like
// in yur previous artifact." The app lane first answered this with six
// arbitrary-variant overrides on `app-shell.tsx`'s own `<ScreenShell
// className={cn(...)}>` (zero the content column's and the aside dock's
// bottom gutter, square the two corners that meet the window's edge). Kit
// v1.2.149 reaches the same result from the kit's own side instead:
// `compositions/templates/screen-shell.tsx`'s content column pays only the
// TOP half of the block-axis gutter, the aside dock's own className pays no
// bottom padding at all, and `screen-shell-content` always carries
// `CARD_FLUSH` (`rounded-b-none`). With the kit doing this itself,
// `app-shell.tsx`'s own six-class override is dead weight sitting on top of
// an identical kit default — removed, and this suite now censuses the KIT's
// source for the flush foot instead of `app-shell.tsx`'s className, plus
// proves `app-shell.tsx` carries no override of its own any more.
//
// A CENSUS, NOT A RENDER — same reasoning the previous round of this file
// gave: `AppShell` needs a live session to mount, and `ScreenShell` is a
// vendored, hash-pinned dependency nothing here may render through a
// component test without a full kit devDependency set. This reads source.
//
// COMMENTS ARE STRIPPED before any of the kit's prose is searched — the
// kit's own comment blocks narrate this exact history in words ("the `pb-`
// IS GONE AS OF 21 SEP 2026", "`py-[var(--shell-gutter)]` MAKES THE
// ASSISTANT END…"), so a naive substring search for `pb-`/`py-` would match
// the prose describing the fix rather than a live class and pass on a kit
// that silently regressed. Stripping `/* … */` first means every assertion
// below is about an actual class token in a quoted string.
//
// SABOTAGE: give the kit's content-column div back a `pb-`/`py-` class, add
// one to the aside dock's className, make `CARD_FLUSH` conditional at its
// call site (`breadcrumb ? CARD_FLUSH : undefined`), rename/delete
// `CARD_FLUSH`, or reintroduce any of app-shell.tsx's six retired override
// classes (or a `cn(` wrapper) on its `<ScreenShell>` call →
//   × one of the assertions below fails.

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import { stripComments } from "@shared/rules/source-scan"

const HERE = dirname(fileURLToPath(import.meta.url))
const WEB = join(HERE, "..")
const ROOT = join(WEB, "..")

const APP_SHELL_SRC = readFileSync(join(WEB, "components/shell/app-shell.tsx"), "utf8")
const KIT_SRC = readFileSync(join(ROOT, "shared", "ui", "compositions", "templates", "screen-shell.tsx"), "utf8")

/** Strips comments so a census below can never match a class token the
 *  comments merely talk about. THE SHARED STRIPPER, NOT A RETYPED REGEX:
 *  `web/test/source-scan.test.ts` censuses exactly this — an inline
 *  `/\*…\*\/` pattern of one's own is blind to a comment marker inside a
 *  string literal, which is how a law quietly starts reading prose as
 *  source. `keepLength` so every `indexOf`/`lastIndexOf` offset below still
 *  lines up with the file it came from. */
const stripBlockComments = (src: string) => stripComments(src, { keepLength: true })

describe("the kit's own ScreenShell carries the flush foot (kit v1.2.149+)", () => {
  const kitBare = stripBlockComments(KIT_SRC)

  it("the content column pays only the TOP half of the block-axis gutter", () => {
    // Bound to the one div whose opening tag carries this exact class
    // literal — the content column wrapping <main data-slot="screen-shell-
    // content">, per THE CONTENT COLUMN's own comment in the kit.
    const classAt = kitBare.indexOf("flex min-h-0 min-w-0 flex-1 flex-col pt-[var(--shell-gutter-top)]")
    expect(classAt, "the content column's own pt-only class literal must still exist in the kit").toBeGreaterThan(-1)

    const divOpenAt = kitBare.lastIndexOf("<div", classAt)
    const tagCloseAt = kitBare.indexOf(">", classAt)
    expect(divOpenAt, "must find the enclosing <div for the content column").toBeGreaterThan(-1)
    const tag = kitBare.slice(divOpenAt, tagCloseAt)

    // `(?<!:)` excludes a variant-prefixed class (`md:pb-0`, `max-[45rem]:
    // pb-0`) — a breakpoint-scoped padding is a different, legitimate
    // concern; what this round retired was the unconditional base class.
    expect(tag, "the content column must carry no unconditional bottom padding (pb-*)").not.toMatch(/(?<!:)\bpb-\S/)
    expect(
      tag,
      "the content column must carry no unconditional symmetric padding (py-*) that would reintroduce a bottom inset"
    ).not.toMatch(/(?<!:)\bpy-\S/)
  })

  it("the aside dock's own className pays no bottom padding either", () => {
    const dockAt = kitBare.indexOf('data-slot="screen-shell-aside-dock"')
    expect(dockAt, "the aside dock element must still exist in the kit").toBeGreaterThan(-1)

    // Bound to this element's own className, not the whole file below it —
    // the next data-slot the kit renders inside the same subtree, per the
    // render order read off the file (aside-scrim follows aside-dock).
    const nextSlotAt = kitBare.indexOf('data-slot="screen-shell-aside-scrim"', dockAt)
    expect(nextSlotAt, "aside-scrim must still follow aside-dock, to bound the census").toBeGreaterThan(dockAt)
    const dockBlock = kitBare.slice(dockAt, nextSlotAt)

    // Sanity: prove this is really the dock's className block and not an
    // empty slice — it must still carry the gutter class its top half pays.
    expect(dockBlock, "the aside dock must still pay its leading inline gutter").toContain(
      "relative flex flex-none ps-[var(--shell-gutter)]"
    )
    // Same `(?<!:)` exclusion as the content column's own check — a
    // breakpoint-scoped `max-[45rem]:pb-0` (the mobile sheet's own concern)
    // is untouched by this round and must not trip this census; only an
    // UNCONDITIONAL pb-*/py-* is what "the pb- is gone" actually retired.
    expect(dockBlock, "the aside dock must carry no unconditional bottom padding (pb-*)").not.toMatch(/(?<!:)\bpb-\S/)
    expect(dockBlock, "the aside dock must carry no unconditional symmetric padding (py-*) either").not.toMatch(
      /(?<!:)\bpy-\S/
    )
  })

  it("screen-shell-content always carries CARD_FLUSH, unconditionally", () => {
    expect(KIT_SRC, "CARD_FLUSH must still be rounded-b-none").toMatch(/const CARD_FLUSH = "rounded-b-none";/)
    expect(
      kitBare,
      "screen-shell-content's className must hand CARD_FLUSH to cn() as a bare argument, never behind a ternary"
    ).toContain("className={cn(CARD, CARD_FLUSH, breadcrumb ? CARD_JOINED : undefined)}")
  })
})

describe("app-shell.tsx carries NO bottom-edge override of its own — the kit owns it now", () => {
  // Same bounding technique the previous round of this file used: the
  // <ScreenShell call, its className prop, then the next prop (spine) as
  // the right edge — narrow enough that nothing elsewhere in this 2,000+
  // line file (a comment, an unrelated className) can satisfy an assertion.
  const screenShellAt = APP_SHELL_SRC.indexOf("<ScreenShell")
  const classNamePropAt = APP_SHELL_SRC.indexOf("className=", screenShellAt)
  const spinePropAt = APP_SHELL_SRC.indexOf("spine={spine}", classNamePropAt)

  it("still hands the kit's ScreenShell a className prop, bounded before the next prop", () => {
    expect(screenShellAt, "app-shell.tsx must still render the kit's <ScreenShell>").toBeGreaterThan(-1)
    expect(classNamePropAt, "the ScreenShell call must still carry a className prop").toBeGreaterThan(screenShellAt)
    expect(spinePropAt, "className must still be followed by the spine prop, so the block below is bounded").toBeGreaterThan(
      classNamePropAt
    )
  })

  const classNameBlock = () => APP_SHELL_SRC.slice(classNamePropAt, spinePropAt)

  it("still flushes the top edge, and pays the phone bar's clearance out here rather than inside the scroller", () => {
    expect(classNameBlock(), "the pre-existing top-edge override must survive untouched").toContain(
      'className="pt-[var(--shell-top)] pb-24 md:pb-0 [&_[data-slot=screen-shell-body]]:pt-0"'
    )
  })

  it("the phone tab bar's 96px clearance is paid on the PAGE, never inside the pane", () => {
    // 22 Sep 2026, kit v1.2.155. This clearance used to sit on the content
    // div INSIDE the scroller (`pb-24 md:pb-0` there), where it was 96px of
    // paper between a record's own footer band and the pane's bottom edge:
    // measured on staging at 760 tall, the story page's band was flush at
    // desktop and exactly 96px short there. Paid on the PAGE level instead
    // (`h-dvh`, border-box, so the padding comes out of the window rather
    // than adding to it) it ends the CARD above the fixed bar, and the band
    // lands flush on the pane's own bottom edge at every width.
    expect(classNameBlock(), "the page level must carry the clearance").toContain("pb-24 md:pb-0")
    const contentDivAt = APP_SHELL_SRC.indexOf('"mx-auto flex w-full max-w-none min-w-0 h-full flex-col')
    expect(contentDivAt, "app-shell.tsx must still draw its one page-width content div").toBeGreaterThan(-1)
    const contentDiv = APP_SHELL_SRC.slice(contentDivAt, APP_SHELL_SRC.indexOf("\n", contentDivAt))
    expect(contentDiv, "the content div inside the scroller must carry no bottom padding of its own").not.toContain("pb-24")
  })

  it("the kit's own footer slot is declared, with a host and narrowFooter", () => {
    // The band's home since kit v1.2.155: the kit renders this node inside
    // the one scroller and OUTSIDE the body's padded stack, as the `mt-auto`
    // last child of a `min-h-full` column. `narrowFooter` is required ,
    // the kit's own default hides a footer below `sm`, and the record band
    // has drawn on a phone since the day it shipped.
    const callEnd = APP_SHELL_SRC.indexOf("header={", screenShellAt)
    const call = APP_SHELL_SRC.slice(screenShellAt, callEnd)
    expect(call, "the ScreenShell call must declare the footer slot").toContain("footer={<div ref={setFooterHost}")
    expect(call, "the footer must survive the narrow width").toMatch(/^\s*narrowFooter$/m)
    expect(
      APP_SHELL_SRC,
      "the host must be provided to the tree through FooterSlotProvider, so a page at any depth can portal into it"
    ).toContain("<FooterSlotProvider host={footerHost}>")
  })

  it("is a plain string again, not a cn(...) call — the six-class override is gone, not just emptied", () => {
    expect(classNameBlock(), "className must no longer open with cn(, now that only one class string remains").not.toContain(
      "className={cn("
    )
  })

  it("no longer zeroes the content column's or the aside dock's own bottom gutter", () => {
    expect(
      classNameBlock(),
      "the content-column pb-0 override must be gone — the kit's own content column already pays no bottom padding"
    ).not.toContain("[&_[data-slot=screen-shell-card]>div:has(>[data-slot=screen-shell-content])]:pb-0")
    expect(
      classNameBlock(),
      "the aside-dock pb-0 override must be gone — the kit's own aside dock already pays no bottom padding"
    ).not.toContain("[&_[data-slot=screen-shell-aside-dock]]:pb-0")
  })

  it("no longer squares the card's or the assistant panel's corners — CARD_FLUSH already does", () => {
    expect(classNameBlock(), "no card corner override").not.toMatch(/\[border-end-(?:start|end)-radius:0px\]/)
    expect(classNameBlock(), "no agent-dock corner override").not.toContain("agent-dock")
  })

  it("never reaches for the physical -b- corners some earlier draft might restore", () => {
    expect(classNameBlock(), "logical corners only, and none at all now").not.toMatch(
      /border-bottom-(?:left|right)-radius/
    )
  })
})

describe("the pane's own scroller still pays its own bottom padding", () => {
  // This file's whole job was always the OUTER gutter around the card; the
  // padded scroller the kit draws INSIDE it (`screen-shell-body`,
  // DENSITY_BODY) is untouched — the `[&_[data-slot=screen-shell-body]]:pt-0`
  // override app-shell.tsx already carries zeroes only the TOP, never the
  // bottom, so scrolled content still clears the card's own floor instead of
  // sitting glued to the now-flush edge.
  it("the pre-existing pt-0 override on screen-shell-body says nothing about its bottom padding", () => {
    expect(APP_SHELL_SRC).not.toMatch(/\[&_\[data-slot=screen-shell-body\]\]:pb-/)
  })
})
