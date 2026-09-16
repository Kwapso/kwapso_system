// THE COVER BAND, C1 — CLIENT RULING, 16 SEP 2026, verbatim: "For the cover,
// let's try C1. I want this for accounts and members." C1 was the artifact
// option "a cover BAND above the head": a full-width image band sits above
// the B1 head (the mark inline with the title, D14, stays exactly as it
// is), the band has the kit's radius on its top corners, a fixed height,
// `object-fit: cover`, and with no cover set the band is a quiet tinted
// surface — no placeholder text (R81's spirit, no hints) — and the head
// reads exactly as today.
//
// jsdom RUNS NO LAYOUT ENGINE (web/test/setup.ts's own header) — there is no
// real box to measure a pixel height on. So, exactly as `record-head-mark.
// test.tsx` (B1's own suite) already does for the mark beside the title,
// this proves the band STRUCTURALLY: the right classes are on the right
// node, the node sits in the right place in the DOM, and the three record
// kinds the ruling actually names are the only ones that wire it up.

import { readFileSync } from "node:fs"
import { join } from "node:path"

import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { RecordCoverBand } from "@shared/web/record-mark"
import { RecordScreen } from "@/components/records/record-chrome"

afterEach(cleanup)

const ROOT = join(__dirname, "..", "..")
const read = (p: string) => readFileSync(join(ROOT, ...p.split("/")), "utf8")

describe("RecordCoverBand — the box itself (shared/web/record-mark.tsx)", () => {
  it("with NO cover: draws a quiet tinted surface, fixed height, no picture, no placeholder text", () => {
    const { container } = render(<RecordCoverBand picture={null} />)
    const band = container.firstElementChild as HTMLElement
    expect(band, "the band always draws, even with nothing to show").toBeTruthy()
    // A FIXED HEIGHT — never a ratio — and the kit's own top-corner radius,
    // R31's second named position (`rounded-t-[var(--radius)]`), never a
    // bare `rounded` or a third value.
    expect(band.className).toMatch(/\bh-32\b/)
    expect(band.className).toMatch(/\bsm:h-40\b/)
    expect(band.className).toMatch(/\brounded-t-\[var\(--radius\)\]/)
    // A TOKEN, never a hex or a Tailwind ramp step (R32).
    expect(band.className).toMatch(/\bbg-surface-panel\b/)
    // NO PICTURE, AND NOTHING STANDING IN FOR ONE — R81's spirit, carried
    // into an empty STATE rather than only a form: no <img>, and no text
    // node inside the band at all.
    expect(band.querySelector("img")).toBeNull()
    expect(band.textContent).toBe("")
  })

  it("with a cover: draws the picture, filling the SAME box — object-cover, never contain (R60)", () => {
    const { container } = render(<RecordCoverBand picture="/media/internal/T/accounts/cover.png" />)
    const band = container.firstElementChild as HTMLElement
    // The box itself is unchanged by having a picture — same fixed height,
    // same top radius, same tint underneath (visible the instant the image
    // fails to load, never a hole).
    expect(band.className).toMatch(/\bh-32\b/)
    expect(band.className).toMatch(/\brounded-t-\[var\(--radius\)\]/)
    const img = band.querySelector("img")
    expect(img, "the picture renders inside the band").toBeTruthy()
    expect(img!.className).toMatch(/\bobject-cover\b/)
    expect(img!.className).not.toMatch(/\bobject-contain\b/)
    expect(img!.src).toContain("/media/internal/T/accounts/cover.png")
  })

  it("a picture that will not load falls back to the SAME quiet tint — never a torn-paper glyph", () => {
    // `RecordCover` (the primitive this band wraps) only drops its <img> once
    // the browser has actually reported the failure — jsdom never fires that,
    // so this just pins that the band renders the same wrapper box either
    // way rather than a second, differently-styled "broken" state.
    const { container: withCover } = render(<RecordCoverBand picture="/media/internal/x/y/z.png" />)
    const { container: withNone } = render(<RecordCoverBand picture={null} />)
    const bandWithCover = withCover.firstElementChild as HTMLElement
    const bandWithNone = withNone.firstElementChild as HTMLElement
    expect(bandWithCover.className).toBe(bandWithNone.className)
  })
})

describe("RecordScreen's `cover` prop — the band sits ABOVE the whole head", () => {
  it("renders nothing extra when no cover is passed — the head reads exactly as today", () => {
    const { container } = render(<RecordScreen title="Bergman S.A." />)
    expect(container.querySelector('[data-testid="the-cover"]')).toBeNull()
  })

  it("draws the cover band BEFORE the title, chips and mark — one level above the B1 head, not beside it", () => {
    const { container } = render(
      <RecordScreen
        title="Bergman S.A."
        mark={<span data-testid="the-mark">B</span>}
        chips={<span data-testid="a-chip">Company</span>}
        cover={<div data-testid="the-cover">band</div>}
      />
    )
    const cover = container.querySelector('[data-testid="the-cover"]')
    const heading = container.querySelector("h1")
    expect(cover, "the cover renders").toBeTruthy()
    expect(heading, "the heading renders").toBeTruthy()
    // BEFORE, in document order — the DOM position `object-fit`-free proof
    // this suite's neighbour (`record-head-mark.test.tsx`) already uses for
    // "the chip row sits above the mark+title row".
    // eslint-disable-next-line no-bitwise
    expect(cover!.compareDocumentPosition(heading!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // AND THE MARK, B1, IS UNTOUCHED — still drawn, still beside the title,
    // never displaced or duplicated by the band above it.
    const mark = container.querySelector('[data-testid="the-mark"]')
    expect(mark, "B1's mark is exactly where it always was").toBeTruthy()
    expect(heading!.contains(mark)).toBe(true)
  })

  it("forwards `cover` straight to the kit's own `banner` slot — no wrapper of its own", () => {
    const src = read("web/components/records/record-chrome.tsx")
    expect(src).toMatch(/banner=\{cover\}/)
  })
})

describe("the two record kinds the ruling names wire the band up — positional, off disk", () => {
  it("account-detail.tsx passes cover={<RecordCoverBand …/>} to RecordScreen", () => {
    const src = read("web/components/accounts/account-detail.tsx")
    expect(src).toMatch(/cover=\{<RecordCoverBand\b/)
  })

  it("member-screen.tsx passes cover={<RecordCoverBand …/>} to RecordScreen", () => {
    const src = read("web/components/team/member-screen.tsx")
    expect(src).toMatch(/cover=\{<RecordCoverBand\b/)
  })
})
