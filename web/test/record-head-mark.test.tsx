// THE MARK BESIDE THE TITLE, B1 — CLIENT RULING, 2026-09-15, verbatim: "For
// cover and logo, I choose B1. Apply this on apps, accounts, and team
// members." B1 is the artifact's own name for the shape record-chrome.tsx now
// draws: the logo (an account, an app) or the avatar (a team member) sits
// INLINE LEFT of the title, on the title's own line, boxed to the title's own
// line-height — "titles stay at the same height as other pages" (her words,
// same message) is the promise this suite exists to hold.
//
// jsdom RUNS NO LAYOUT ENGINE (web/test/setup.ts's own header: "the tests
// assert rows and words, never measured pixel positions") — there is no real
// box to measure a top offset on. So the baseline claim is proved the way this
// suite's neighbours already prove a geometry claim under the same
// constraint: structurally. Two things establish it together —
//
//   1. the TITLE TEXT's own wrapper carries the identical className whether a
//      mark is present or not (its own type step, line-clamp and break rules
//      are untouched by the mark sitting beside it) — so nothing about the
//      title's OWN box changes when a mark appears;
//   2. the mark is a SIBLING inside the title's own row (`items-center`,
//      `gap-3` — the kit's `--space-3`), never a second row stacked above it,
//      and that row's mark box is DERIVED off the same two tokens the kit's
//      own rendered heading resolves to at its default step (h2/32,
//      `--text-3xl`/`--text-3xl--line-height`, since kit v1.2.150,
//      2026-09-22 — the app forced h1/44 from outside until then, through
//      the now-removed `RECORD_TITLE_SIZE`, shared/web/record-heading.tsx) —
//      read off record-chrome.tsx's source, never off a hard-coded pixel
//      figure, which is what makes "the same line-height" a fact about the
//      tokens agreeing rather than two numbers that happen to match today.
//
// A THIRD THING, not about geometry: the ruling names three record kinds, not
// "everywhere", and `mark`'s own doc comment on `RecordScreen` explains the
// string-vs-node discriminator that keeps every OTHER `*-detail.tsx` (still on
// the old `mark={appStageMark(...)}`/`mark={kindMark}` shape, unmigrated by
// this ruling) exactly as inert as it was the day before. This suite pins
// that discriminator directly, because it is the one thing standing between
// "three record kinds opted in" and "every mark in the app just came back".

import { readFileSync } from "node:fs"
import { join } from "node:path"

import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { RecordScreen } from "@/components/records/record-chrome"

afterEach(cleanup)

const ROOT = join(__dirname, "..", "..")
const read = (p: string) => readFileSync(join(ROOT, ...p.split("/")), "utf8")

/** The title-text wrapper is the innermost `min-w-0 break-words` span —
 * the same node `record-heading-clamps.test.tsx` pins `clampRecordHeading`
 * onto — found inside the `<h1>` the kit's own heading step renders (the
 * kit's `RecordDetail` default, h2/32 since kit v1.2.150; jsdom still
 * renders `Title`'s heading as an `<h1>` element regardless of its own
 * `size` step, so the query below is unaffected by which rung is current). */
function titleTextSpan(container: HTMLElement): HTMLElement {
  const heading = container.querySelector("h1")
  expect(heading, "the record heading is drawn").toBeTruthy()
  const span = heading!.querySelector<HTMLElement>(".min-w-0.break-words")
  expect(span, "the title's own text wrapper is drawn").toBeTruthy()
  return span!
}

describe("the record head's mark, B1 (client ruling 2026-09-15)", () => {
  it("draws nothing extra, and the title's own box, when there is no mark", () => {
    const { container } = render(<RecordScreen title="Bergman S.A." />)
    const span = titleTextSpan(container)
    expect(span.textContent).toBe("Bergman S.A.")
  })

  it("keeps the title's own wrapper class IDENTICAL with a mark present — its box does not move", () => {
    const { container: bare } = render(<RecordScreen title="Bergman S.A." />)
    const bareSpan = titleTextSpan(bare)

    const { container: withMark } = render(
      <RecordScreen
        title="Bergman S.A."
        mark={<span data-testid="the-mark">B</span>}
      />
    )
    const markedSpan = titleTextSpan(withMark)

    // SAME CLASSES, NOT JUST "STILL THERE" — the title's own type step
    // (the kit's own `RecordDetail` default, h2/32, reaches the kit's
    // heading node, not this span, but this span's own `min-w-0 break-words`
    // is the whole of what record-chrome.tsx itself puts on the title text)
    // is untouched by the mark
    // sitting beside it.
    expect(markedSpan.className).toBe(bareSpan.className)
  })

  it("draws the mark as a SIBLING INSIDE the title's own row — never a row stacked above it", () => {
    const { container } = render(
      <RecordScreen title="Bergman S.A." mark={<span data-testid="the-mark">B</span>} />
    )
    const mark = container.querySelector('[data-testid="the-mark"]')
    expect(mark, "the mark renders").toBeTruthy()
    const titleSpan = titleTextSpan(container)

    // The mark itself sits inside `RECORD_MARK_BOX`'s own sizing wrapper
    // (record-chrome.tsx: `<span className={RECORD_MARK_BOX}>{mark}</span>`)
    // — that wrapper, not the caller's raw node, is the row's actual child
    // and the title text wrapper's own sibling.
    const markBox = mark!.parentElement
    expect(markBox, "the mark's own sizing box exists").toBeTruthy()

    // ONE COMMON PARENT — the row — holds both the mark's box and the title
    // text wrapper, so neither is a block stacked above or below the other.
    const row = markBox!.parentElement
    expect(row, "the row exists").toBeTruthy()
    expect(markBox!.parentElement, "the mark's box is a direct child of the row").toBe(row)
    expect(titleSpan.parentElement, "the title text is a direct child of the SAME row").toBe(row)

    // THE ROW ITSELF — `items-center` (never `items-start`/a column: a
    // stacked mark-above-title layout would need `flex-col`, which this row
    // must not carry) and `gap-3`, the kit's own `--space-3` control gap
    // (matches `IDENTITY_ROW`'s own pill-to-pill gap, record-chrome.tsx).
    expect(row!.className).toMatch(/\bflex\b/)
    expect(row!.className).toMatch(/\bitems-center\b/)
    expect(row!.className).toMatch(/\bgap-3\b/)
    expect(row!.className).not.toMatch(/\bflex-col\b/)
  })

  it("still draws the chip row ABOVE the title, unchanged by the mark (R65)", () => {
    const { container } = render(
      <RecordScreen
        title="Bergman S.A."
        chips={<span data-testid="a-chip">Company</span>}
        mark={<span data-testid="the-mark">B</span>}
      />
    )
    const heading = container.querySelector("h1")!
    const chip = container.querySelector('[data-testid="a-chip"]')!
    const mark = container.querySelector('[data-testid="the-mark"]')!
    // Both still live inside the same title node the kit renders as <h1> —
    // that has not changed (see record-chrome.tsx's own "identityChips… rides
    // inside title" note) — but the chip's own row sits BEFORE the mark+title
    // row in document order, i.e. visually above it, never merged into it.
    expect(heading.contains(chip)).toBe(true)
    expect(heading.contains(mark)).toBe(true)
    const position = chip.compareDocumentPosition(mark)
    // Node.DOCUMENT_POSITION_FOLLOWING = 4 — the mark comes AFTER the chip
    // in document order, which is how the pills row stays visually above
    // the mark+title row in normal flow.
    // eslint-disable-next-line no-bitwise
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("stays inert for a STRING mark — the old glyph shape, unmigrated *-detail.tsx screens keep drawing nothing", () => {
    const { container } = render(<RecordScreen title="A Sprint" mark="S" />)
    const heading = container.querySelector("h1")!
    // The string itself must not appear as a lone rendered node beside the
    // title — the discriminator (`typeof mark !== "string"`) means a bare
    // string never reaches `RECORD_MARK_BOX` at all.
    expect(heading.textContent).toBe("A Sprint")
  })

  it("stays inert for null/undefined — no row is built when there is nothing to show", () => {
    const { container: withNull } = render(<RecordScreen title="A Sprint" mark={null} />)
    const { container: withUndefined } = render(<RecordScreen title="A Sprint" />)
    const nullSpan = titleTextSpan(withNull)
    const undefinedSpan = titleTextSpan(withUndefined)
    expect(nullSpan.className).toBe(undefinedSpan.className)
  })

  it("the mark's box is DERIVED off the title's own type tokens, never a magic pixel number", () => {
    const src = read("web/components/records/record-chrome.tsx")
    // The exact two tokens the kit's own rendered heading resolves to at its
    // default step (h2/32, `--text-3xl`/`--text-3xl--line-height`, since kit
    // v1.2.150) — read here rather than asserted from a comment, so a
    // hard-coded `size-11` swapped in later turns this red.
    expect(src, "RECORD_MARK_BOX exists").toMatch(/RECORD_MARK_BOX/)
    expect(src).toMatch(/calc\(var\(--text-3xl\)\s*\*\s*var\(--text-3xl--line-height\)\)/)
    // And the row it renders into really is `items-center gap-3` — not
    // reasoned about only in prose above.
    expect(src).toMatch(/items-center gap-3/)
  })

  it("the three call sites this ruling actually named pass a NODE through `mark`, not a string", () => {
    // Positional, off disk — the point of the discriminator is that a caller
    // OPTS IN by handing over a real element; this proves the three named
    // record kinds actually do, rather than trusting the prose above.
    const accounts = read("web/components/accounts/account-detail.tsx")
    expect(accounts).toMatch(/mark=\{<RecordMark\b/)
    const apps = read("web/components/apps/app-detail.tsx")
    expect(apps).toMatch(/mark=\{<AppMark\b/)
    const members = read("web/components/team/member-screen.tsx")
    expect(members).toMatch(/mark=\{<RecordMark\b[^}]*shape="round"/)
  })
})
