// R98, EVERY BUTTON IS THE KIT'S OWN HEIGHT. Aurora, verbatim, 21 Sep 2026,
// validating the fix to the Knowledge Sync button (`size="sm"` next to
// toolbar siblings sitting at the kit's default 40px, K56, documents/
// UI-RULEBOOK.md): "Validated. This is a rule for all buttons, so make sure
// that I don't find any others like this." Every button in a TOOLBAR, a PAGE
// HEAD, a CARD HEADER or a FORM FOOT uses the kit `Button`'s default size (or
// `size="icon"`, the same 40px height, `--control-height-button`,
// shared/ui/components/button/button.tsx) — `size="sm"` (32px,
// `--control-height-dense`) and any custom height/padding class on a `Button`
// are forbidden there, outside a named exemption.
//
// ONE CENSUS, NOT FOUR SEPARATE ONES, and that is a deliberate choice this
// file's own header explains rather than hides. Telling a toolbar's own
// action apart from a dense per-row action, from an error-state retry, from a
// chat confirm — purely from source, off disk — is exactly the kind of
// judgement call a regex cannot make reliably; a census narrow enough to only
// match the four named surfaces would miss real ones (the same blind spot
// R96's own "what it could not see" paragraph warns about), and one loose
// enough to catch every shape would flag controls the law was never about (a
// picker chip, a "Load more" button, an error retry). So the census casts
// wide — every `<Button` carrying `size="sm"` or a custom `h-`/`py-`/`px-`
// class, across both front doors and `shared/web/` — and `BUTTON_SIZE_EXEMPT`
// is where the real judgement lives, one reasoned line per site, so a
// reviewer can see the call rather than trust a regex to have made it. Every
// site this census found that sits in a toolbar, a page head, a card header
// or a form foot was fixed the same session this law shipped (removing the
// `size="sm"`/custom class, not adding an exemption for it); what remains in
// `BUTTON_SIZE_EXEMPT` is either genuinely outside the four named surfaces
// (an inline error retry, a chat confirm row, a standalone picker control, a
// composer's own send row) or a dense per-item action inside a repeated
// list/card — the same shape the law's own "dense table row actions" carve-
// out names, most of them marked "pending her word" because a list row is a
// close cousin of a table row and not a certain yes.

import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"
import { BUTTON_SIZE_EXEMPT } from "@shared/rules/registry"

const REPO_ROOT = join(__dirname, "..", "..")

const ROOTS = [
  join(REPO_ROOT, "web", "app"),
  join(REPO_ROOT, "web", "components"),
  join(REPO_ROOT, "web", "lib"),
  join(REPO_ROOT, "web-portal", "app"),
  join(REPO_ROOT, "web-portal", "components"),
  join(REPO_ROOT, "web-portal", "lib"),
  join(REPO_ROOT, "shared", "web"),
]

const CUSTOM_BOX_CLASS = /className=["'][^"']*\b(h-\d|h-\[|py-\d|py-\[|px-\d|px-\[)/

interface Finding {
  rel: string
  tag: string
}

/** Finds the end of a JSX opening tag starting at `<Button`/`<IconButton`:
 * the first `>` that sits OUTSIDE a `{…}` expression, so an arrow function's
 * own `=>` (or a stray `>` inside a comparison) inside an attribute value
 * never closes the tag early. Mirrors the same "read past nested braces"
 * shape `id-chip-is-black`'s own BADGE_LOOKBACK takes for a wrapped opening
 * tag, just walked forward instead of back. */
function tagEnd(src: string, start: number): number {
  let depth = 0
  for (let i = start; i < src.length; i++) {
    const c = src[i]
    if (c === "{") depth++
    else if (c === "}") depth--
    else if (c === ">" && depth <= 0) return i
  }
  return -1
}

/** No `IconButton` exists in this kit today (`shared/ui/components/button/
 * button.tsx`'s own `size="icon"` variant IS the icon-only shape) — matched
 * anyway, so the census does not go blind the day one is added. */
const OPEN_TAG = /<(Button|IconButton)\b/g

function findings(): Finding[] {
  const files = sourceFiles(ROOTS, { extensions: [".tsx", ".ts"], relativeTo: REPO_ROOT, skipTests: true })
  const out: Finding[] = []
  for (const f of files) {
    const src = stripComments(f.source)
    OPEN_TAG.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = OPEN_TAG.exec(src))) {
      const start = m.index
      const end = tagEnd(src, start)
      if (end === -1) continue
      const tag = src.slice(start, end + 1)
      if (/size=["']sm["']/.test(tag) || CUSTOM_BOX_CLASS.test(tag)) {
        out.push({ rel: f.rel, tag })
      }
    }
  }
  return out
}

function excused(entries: typeof BUTTON_SIZE_EXEMPT, rel: string, tag: string) {
  return entries.find((e) => e.file === rel && tag.includes(e.contains))
}

function stillOpen(all: Finding[], rel: string, contains: string): boolean {
  return all.some((f) => f.rel === rel && f.tag.includes(contains))
}

describe("R98, every button is the kit's own height", () => {
  it('no Button in a toolbar, a page head, a card header or a form foot carries size="sm" or a custom box class, unnamed', () => {
    const found = findings()
    const unexempt = found.filter((f) => !excused(BUTTON_SIZE_EXEMPT, f.rel, f.tag))
    expect(
      unexempt,
      `these Buttons carry size="sm" or a custom height/padding class. If this sits in a toolbar, a page ` +
        `head, a card header or a form foot, drop the size prop/class so it falls back to the kit's default ` +
        `height (or size="icon"). Otherwise name it in BUTTON_SIZE_EXEMPT with the reason:\n  ` +
        unexempt.map((f) => `${f.rel}  ${f.tag.split("\n")[0].slice(0, 80)}`).join("\n  ")
    ).toEqual([])
  })

  it("BUTTON_SIZE_EXEMPT names only real, still-open findings", () => {
    const all = findings()
    const stale = BUTTON_SIZE_EXEMPT.filter((e) => !stillOpen(all, e.file, e.contains))
    expect(
      stale,
      `these BUTTON_SIZE_EXEMPT entries no longer match a real finding. Fixed, or the source moved on, delete ` +
        `the entry:\n  ` + stale.map((e) => `${e.file}  ${e.contains}`).join("\n  ")
    ).toEqual([])
  })

  it("an exemption's contains matches only one current finding in its file", () => {
    const all = findings()
    const ambiguous: string[] = []
    for (const e of BUTTON_SIZE_EXEMPT) {
      const hits = all.filter((f) => f.rel === e.file && f.tag.includes(e.contains))
      if (hits.length > 1) ambiguous.push(`${e.file}  "${e.contains}" matches ${hits.length} findings`)
    }
    expect(
      ambiguous,
      `a BUTTON_SIZE_EXEMPT entry excuses more than one site, make it specific:\n  ` + ambiguous.join("\n  ")
    ).toEqual([])
  })

  // PROVEN NOT VACUOUS, against synthetic source only.
  it("catches a synthetic size=\"sm\" toolbar button", () => {
    const synthetic = [
      "function X() {",
      "  return (",
      '    <Button variant="secondary" size="sm" onClick={() => doThing()}>',
      "      Go",
      "    </Button>",
      "  )",
      "}",
      "",
    ].join("\n")
    OPEN_TAG.lastIndex = 0
    const m = OPEN_TAG.exec(synthetic)
    expect(m).not.toBeNull()
    const end = tagEnd(synthetic, m!.index)
    expect(end).toBeGreaterThan(-1)
    const tag = synthetic.slice(m!.index, end + 1)
    expect(/size=["']sm["']/.test(tag)).toBe(true)
  })

  it("does not truncate the tag early on an arrow function's own '=>' inside an attribute", () => {
    const synthetic = [
      '<Button variant="secondary" onClick={() => setX(1)} size="sm">',
      "  Go",
      "</Button>",
    ].join("\n")
    OPEN_TAG.lastIndex = 0
    const m = OPEN_TAG.exec(synthetic)!
    const end = tagEnd(synthetic, m.index)
    const tag = synthetic.slice(m.index, end + 1)
    expect(/size=["']sm["']/.test(tag)).toBe(true)
  })
})
