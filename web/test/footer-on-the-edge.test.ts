// R89 "footer-on-the-edge" — THE FOOTER IS AT THE SCREEN'S OWN BOTTOM, NOT
// MERELY ITS CARD'S. CLIENT RULING, 18 SEP 2026, VERBATIM: "On ticket
// detail, the footer should be at the very bottom. The position is still
// fucking wrong. Fix it once and for all."
//
// D21 (`web/test/footer-is-last.test.ts`) already proves a `<CardFooter>`/
// `<ReplyComposer>` is the LAST child of its own enclosing card — DOM order,
// nothing about where that card itself sits on the screen. That was not
// enough: measured live on staging (T0001, headless Playwright,
// `${SCRATCH}/footer-measure.json`, BEFORE this law's fix) the conversation
// card's footer closed at y=1298 against the screen body's own y=884 at
// 1440×900 — a footer that was correctly LAST inside a card floating 414px
// past the visible screen. This law checks the CONSTRUCTION that reaches
// the real edge: `app-shell.tsx`'s own R29 page container is a `flex-col`
// box floored at the screen body's visible height (`min-h-full`), and
// `TicketDetailBody`'s own root is a flex item of it (`lg:flex-1
// lg:min-h-0`) — so the grid grows to fill exactly what `<RecordScreen>`'s
// head leaves behind, with the conversation card's own `lg:h-full
// lg:min-h-0` filling that cell in turn, `CardFooter` sitting flush at its
// bottom edge.
//
// THE COMPOSER'S OWN HALF — Aurora's screenshot 4, verbatim: "This composer
// should have a background color that makes it easy to identify, and also
// it should be full width of its own container." Measured live before the
// fix: the composer's own `background-color` and the conversation card's
// were the SAME `rgb(247,242,235)` (`--surface-panel`) — no contrast at
// all — and the composer's own rendered width was 271px against a 769px
// footer. Both checked here: `w-full`, and the SAME background class the
// kit's own `Input` paints every ordinary text field with (`input.tsx`'s
// own `inputVariants`) — read off that file directly, never hand-typed
// here, so a future kit change re-proves parity rather than silently
// drifting from it.
//
// A SOURCE SCAN, LIKE EVERY OTHER STRUCTURAL LAW IN THIS BASE (D21,
// R63, R83): these two files are this law's whole subject, so there is
// nothing a census over `web/` gains by widening past them — a future
// second construction of a full-height record body is exactly what a
// widened version of this check should grow to cover, not guessed at here.

import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const ROOT = join(__dirname, "..", "..")

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8")
}

describe("R89 — footer-on-the-edge", () => {
  const shell = read("web/components/shell/app-shell.tsx")
  const body = read("web/components/tickets/ticket-detail-body.tsx")
  const composer = read("web/components/tickets/reply-composer.tsx")
  const inputSource = read("shared/ui/components/input/input.tsx")

  it("app-shell.tsx's own page container is a flex column floored at the screen body's height", () => {
    // The ONE div app-shell.tsx wraps `{children}` in (R29's own page
    // container) — found the same way R51's own aside-dock check finds a
    // named block, by its own distinguishing classes rather than a line
    // number, so an edit above it in the file never rots this key.
    const at = shell.indexOf("mx-auto flex w-full max-w-none")
    expect(at, "app-shell.tsx must still draw its one R29 page container as a flex box").toBeGreaterThan(-1)
    const tag = shell.slice(Math.max(0, at - 200), at + 400)
    expect(tag.includes("flex-col"), "the page container must be a flex COLUMN — TicketDetailBody grows against it").toBe(
      true
    )
    expect(
      /min-h-full|h-full/.test(tag),
      "the page container must be floored at the screen body's own height (min-h-full) so a flex-1 child below it has real space to fill"
    ).toBe(true)
  })

  it("ticket-detail-body.tsx's own root is the flex item that fills the remaining screen height", () => {
    const at = body.indexOf('data-slot="ticket-detail-body"')
    expect(at, 'TicketDetailBody must mark its own root data-slot="ticket-detail-body" — R89 reads this file by it').toBeGreaterThan(
      -1
    )
    const rootTag = body.slice(at, body.indexOf(">", at))
    expect(rootTag.includes("lg:flex-1"), "the grid must be a flex item that grows (lg:flex-1) against app-shell's own flex column").toBe(
      true
    )
    expect(rootTag.includes("lg:min-h-0"), "the grid must allow itself to shrink below its own content height (lg:min-h-0), or it cannot fill anything smaller than its content").toBe(
      true
    )
  })

  it("the conversation cell and the side-panel column both stretch to the grid's full, real height", () => {
    const convAt = body.indexOf("TICKET_PANEL_ANCHOR.conversation")
    expect(convAt, "the conversation anchor div must still exist").toBeGreaterThan(-1)
    const convTag = body.slice(body.lastIndexOf("<div", convAt), body.indexOf(">", convAt) + 1)
    expect(convTag.includes("lg:h-full"), "the conversation cell must carry lg:h-full").toBe(true)
    expect(convTag.includes("lg:min-h-0"), "the conversation cell must carry lg:min-h-0").toBe(true)

    // The side column — ONE cell now, not three separate grid rows (see this
    // file's own header for why three auto tracks cannot stretch the way one
    // can) — must scroll independently once its three panels are taller than
    // the row: lg:h-full to match the conversation, lg:overflow-y-auto to
    // scroll rather than push the row taller.
    const sideAt = body.indexOf("lg:overflow-y-auto")
    expect(sideAt, "the side-panel column must be independently scrollable (lg:overflow-y-auto)").toBeGreaterThan(-1)
    const sideTag = body.slice(body.lastIndexOf("<div", sideAt), body.indexOf(">", sideAt) + 1)
    expect(sideTag.includes("lg:h-full"), "the side-panel column must match the conversation cell's own height (lg:h-full)").toBe(
      true
    )
    expect(sideTag.includes("flex-col"), "the side-panel column must stack its three panels in a flex column").toBe(true)
  })

  it("TicketConversationPanel's own Card fills its cell and CardFooter is its last child (D21)", () => {
    const at = body.indexOf("function TicketConversationPanel")
    expect(at).toBeGreaterThan(-1)
    const closeCard = body.indexOf("</Card>", at)
    expect(closeCard, "TicketConversationPanel must render a closing </Card>").toBeGreaterThan(-1)
    const fn = body.slice(at, closeCard)
    expect(fn.includes("lg:h-full"), "TicketConversationPanel's own Card must carry lg:h-full").toBe(true)
    const contentAt = fn.indexOf("<CardContent")
    const footerAt = fn.indexOf("<CardFooter")
    expect(contentAt, "must render <CardContent").toBeGreaterThan(-1)
    expect(footerAt, "must render <CardFooter").toBeGreaterThan(-1)
    expect(contentAt, "CardContent (the thread) must come before CardFooter (the composer)").toBeLessThan(footerAt)
    // CardFooter must be the LAST thing before </Card> — nothing rendered
    // after it inside the card (D21's own red proof, restated positionally
    // for this one call site).
    expect(
      fn.slice(footerAt + "<CardFooter".length, fn.lastIndexOf("</CardFooter>") + "</CardFooter>".length).length,
      "there is exactly one CardFooter to close"
    ).toBeGreaterThan(0)
    const afterFooter = fn.slice(fn.lastIndexOf("</CardFooter>") + "</CardFooter>".length).trim()
    expect(afterFooter, "nothing may render between CardFooter and the Card's own closing tag").toBe("")
  })

  it("the reply composer pill is full width and matches the kit's own Input background, by construction", () => {
    // Derived, not hand-typed: the kit's own text-field background class,
    // read straight off input.tsx's `inputVariants`. If the kit ever repoints
    // its own field colour this line re-reads the new one and this law keeps
    // asking the same question of a moving target, rather than silently
    // comparing the composer to a colour the kit no longer paints.
    const m = inputSource.match(/"bg-(\S+)\s+text-foreground"/)
    expect(m, "shared/ui/components/input/input.tsx must still paint its base fill as `bg-<token> text-foreground`").not.toBe(
      null
    )
    const inputBgClass = `bg-${m![1]}`

    const at = composer.indexOf('data-slot="reply-composer"')
    expect(at, 'ReplyComposer must mark its pill data-slot="reply-composer"').toBeGreaterThan(-1)
    // The tag's own closing `>` — NOT a naive `indexOf(">", at)`, which would
    // stop at the `=>` inside this tag's own `onSubmit={(event) => {…}}`
    // arrow function, well before `className` is ever reached. JSX
    // formatting puts a multi-line opening tag's own `>` alone on its line,
    // so that is what this looks for instead.
    const afterStart = composer.slice(composer.lastIndexOf("<form", at))
    const closeRel = afterStart.search(/\n\s*>/)
    expect(closeRel, "the <form ...> opening tag must close on its own line").toBeGreaterThan(-1)
    const formTag = afterStart.slice(0, closeRel)
    expect(formTag.includes("w-full"), "the composer pill must carry w-full — full width of its own footer, not a shrink-to-fit pill").toBe(
      true
    )
    expect(
      formTag.includes(inputBgClass),
      `the composer pill must paint its own ground with the SAME class the kit's Input uses (${inputBgClass}), not a new colour — ` +
        `it must also differ from the conversation card's own ground (--surface-panel) so it reads as a distinct field`
    ).toBe(true)
    expect(
      formTag.includes("bg-surface-panel"),
      "the composer must not stand on the SAME ground as the card it sits inside (bg-surface-panel) — that is exactly the no-contrast bug this law fixes"
    ).toBe(false)
  })
})
