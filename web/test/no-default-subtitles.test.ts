// @vitest-environment node
//
// A pure source scan: it reads files and parses them, and never touches a DOM
// (sections-stand-on-paper.test.ts's own reason for the same directive).
//
// ─────────────────────────────────────────────────────────────────────────────
// R72 — NO SUBTITLE UNDER A HEADING, UNLESS SHE ASKED.
// ─────────────────────────────────────────────────────────────────────────────
//
// THE CLIENT, 2026-09-14, over Settings › Modules' own intro sentence:
//
//   "In settings, modules: delete this. Generally, I don't like subtitles,
//    so stop putting them unless I ask."
//
// The second sentence is the wider one and it is what this law enforces. She
// had already said the narrower version twice this same week, about two other
// screens — "in ticket settings (or any other module) no subtilte" (10 Sep) and
// "ticket types should be … without subtitle, make this. always" (11 Sep) — and
// both of those landed as ONE-SCREEN fixes (`shared/web/settings-section.tsx`
// deleted the field outright; see its own header). This is her saying, for the
// third time in four days and now about a screen neither of the first two
// touched, that the pattern itself is unwanted, everywhere, by default.
//
// ── WHY THIS IS NOT R67 ──────────────────────────────────────────────────────
//
// R67 (`sections-stand-on-paper.test.ts`) also polices a titled section, and
// the two laws share a census file (`Headline`/`h1`-`h4`) and a house term
// ("title block"). They are not the same law. R67's subject is WHERE content
// stands — a titled section either IS a container or draws every body it has
// inside one; a sentence in the title block is explicitly EXEMPT from R67
// (amendment 4's own `carriesHeading` skip), because R67 has nothing to say
// about whether that sentence should exist, only about the ground it stands on
// if it does. This law's subject is whether the sentence exists AT ALL. A boxed
// subtitle passes R67 outright and fails this one; an unboxed subtitle fails
// both. Different questions, so different laws — R67's own header, discussing
// the module settings pages it cannot reach, says the same thing from the other
// side: "reaching them means judging a component by the PROPS it is handed
// rather than the JSX it writes, which is a different check with a different
// oracle." That is this file.
//
// ── WHAT A SUBTITLE IS, PRECISELY ───────────────────────────────────────────
//
// A prose element (`<p>`, `<span>`, `<small>`, `<em>`, `<strong>` — R67's own
// `READABLE_PROSE` set, reused here for the same reason it reused it: a kit
// component is always Capitalised, so `<Text>`, `<CollectionEmptyState>` and
// every other real component this repo draws a sentence through is invisible
// to a lowercase-tag census by construction, deliberately) standing as the
// IMMEDIATE next significant sibling of a heading (`<h1>`-`<h4>`, the kit's
// `<Headline>`) inside the same JSX children array. "Significant" drops blank
// text and a `{/* comment */}` the same way R67's own walk does, so a comment
// between the two does not break the pair.
//
// THREE SHAPES ARE DELIBERATELY NOT A SUBTITLE, each because it answers a
// different question than "what does this heading mean":
//
//   · A FORM FIELD'S HELPER TEXT. `shared/web/field.tsx` renders it through the
//     kit's own `Field`, never a bare `<p>` beside a bare heading — R33 already
//     holds that seam shut by an import ban, so this census cannot even reach
//     it: a field's helper text has no heading sibling, it has a LABEL.
//   · AN EMPTY STATE'S EXPLANATION. `CollectionEmptyState`, `PortalEmpty`,
//     `NothingYet`, `ShapeStateBody` are all Capitalised components — excluded
//     by the same tag-name rule that excludes `<Text>` — so R62's whole
//     vocabulary for "why is this collection showing nothing" sits outside the
//     census without a line of exemption spent on it.
//   · A REASON SOMETHING CANNOT BE CHANGED. R70 *requires* `helpText` on a
//     switched-off automation, rendered through the kit's `<Text>` beside a
//     `<Badge>` (`module-automations.tsx`) — Capitalised again, and a different
//     job besides: that sentence answers "why can I not turn this off", not
//     "what is this section for".
//
// A REAL BLIND SPOT, WRITTEN DOWN RATHER THAN CHASED: a heading drawn INSIDE
// a component (`SettingsSection`, `ToolbarRow`'s `title`, `CollectionHeading`)
// is invisible to the sibling census when a CALLER passes prose as that
// component's `children` — the heading and the prose are then in different
// JSX children arrays, one inside the component's own render and one at the
// call site. The three chokepoints below are checked a second, narrower way
// for exactly this reason: none of them may re-grow a prop shaped like a
// subtitle, which is the only door big enough to let the blind spot matter.
//
// ── THE EXEMPTION, AND WHY IT IS KEYED BY FILE ──────────────────────────────
//
// "Unless I ask" is part of the ruling, so `SUBTITLE_OK` (shared/rules/
// registry.ts) is the way out — a reasoned line, rot-checked so it can only
// shrink, exactly the house pattern `UNCONTAINED_SECTION_OK` (R67) and
// `HAND_ROLLED_OK` (the motion check) already use. Keyed by FILE rather than by
// line: a screen either has a reason to keep explaining itself under a heading
// or it does not, and a per-line key would let the next sentence added to an
// already-exempted file borrow an argument written about a different one.
//
// ── AMENDMENT 1 (2026-09-14) — `CARDTITLE` IS A HEADING ─────────────────────
//
// THE THIRD MISS. This law's own founding case — the Modules wall's card, name
// over a joined line of section titles — passed this census on the day it was
// written, and stayed on screen four days into R72's own life before the
// client named it by hand a third time: *"In settings, modules: delete this."*
// The card drew its name through the kit's `CardTitle`, not `<h1>`-`<h4>` or
// `<Headline>`, so the pair (`CardTitle`, `<span>`) never formed — `a` failed
// `HEADING.test(a)` before `b` was ever asked about. **This was not the
// Capitalised-prose blind spot amendment 0 already named** (a subtitle
// rendered through a Capitalised, real-content component): the prose here was
// a bare `<span>`, which the ORIGINAL `PROSE` set already matched fine. The
// miss was entirely on the HEADING side — a kit component that draws a real
// heading, documented as one in the kit's own source
// (`shared/ui/components/card/card.tsx`: "TEN STATES — none apply; it is a
// heading"), was invisible to a census that only recognised bare tags and one
// named kit part.
//
// So `HEADING` gains exactly the one name the kit itself already calls a
// heading — `CardTitle` — and `PROSE` gains, for the same reason and on the
// same authority, the one name the kit calls prose beside it —
// `CardDescription` (its own header: "TEN STATES — none apply; it is prose").
// Nothing else in `shared/ui/components/card/card.tsx` claims either word.
//
// WHAT THIS DOES AND DOES NOT REACH — checked by hand against every call site
// in the app, because there are few enough to read rather than guess about
// (four files import `CardTitle`, one imports `CardDescription`, in the whole
// of `web/`, `web-portal/` and `shared/web/`):
//
//   · The Modules card (fixed by this same change — the offending `<span>` is
//     deleted, not exempted) and any future card built the same way.
//   · `web/components/team/members-gallery.tsx` draws a member's email under
//     their name in the identical wall shape — but `CardTitle` there sits
//     INSIDE its own wrapping `<span>` (paired with the role `Badge` above it,
//     for R65's "chip on top of title"), so the email line is a sibling of
//     that wrapper, never of `CardTitle` itself. Structurally outside the
//     pair, not exempted into it — confirmed by running this census over the
//     file, not by reading the JSX and guessing.
//   · `shared/web/screen-engine/screen-renderer.tsx`'s generic `display:
//     "cards"` branch pairs `CardTitle` with `CardDescription` directly and
//     would be the one real catch — except the ONE recipe in the whole app
//     that declares `display: "cards"` (`knowledgeListRecipe`,
//     `web/lib/screens.ts`) is special-cased to a bespoke component
//     (`KnowledgeSourceCard`) before `screen-renderer.tsx` ever sees it
//     (`web/components/deep-link/collection-content.tsx`, `if (module ===
//     "knowledge")`). No live recipe reaches this branch today, so widening
//     `PROSE` catches a card shape that is currently unreachable — recorded
//     here rather than left for the next reader to rediscover, and flagged
//     separately as dead code, which is a different law's job (lean, not R72).
//
// So this amendment's live effect, as of 2026-09-14, is exactly the Modules
// card and nothing else — the two other `CardTitle`/`CardDescription` sites in
// the app are outside the pair for reasons specific to each, not because
// anybody wrote them an exemption.
//
// `CardDescription` is NOT widened into the three deliberately-not-a-subtitle
// shapes (helper text, empty state, R70's required reason): none of those
// three draws through `Card` at all, so the question does not arise for them.

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import ts from "typescript"
import { sourceFiles, stripComments } from "@shared/rules/source-scan"
import { SUBTITLE_OK } from "@shared/rules/registry"

const HERE = dirname(fileURLToPath(import.meta.url)) // web/test
const ROOT = join(HERE, "..", "..") // repo root

/** Both front doors and the code they share — the same three roots R67 walks,
 * for the same reason: a settings section can live in `shared/web/`. */
const APP_DIRS = [join(ROOT, "web"), join(ROOT, "web-portal"), join(ROOT, "shared", "web")]

/** `CardTitle` joins the bare heading tags by amendment 1 (2026-09-14) — the
 * kit's own source calls it one ("TEN STATES — none apply; it is a heading",
 * `shared/ui/components/card/card.tsx`), and the Modules panel's card proved a
 * heading the census could not see is a heading it cannot protect either. */
const HEADING = /^(h[1-4]|Headline|CardTitle)$/
/** R67's own `READABLE_PROSE` set, PLUS `CardDescription` (amendment 1,
 * 2026-09-14, the kit's own words again: "TEN STATES — none apply; it is
 * prose") — the one kit component that stands opposite `CardTitle` the same
 * way a bare `<p>` stands opposite `<h2>`. Every other real-content component
 * (`<Text>`, `<CollectionEmptyState>`, …) stays outside by construction: this
 * is a second NAMED exception, not a reopened door. */
const PROSE = /^(p|span|small|em|strong|CardDescription)$/

type Parsed = { rel: string; path: string; tree: ts.SourceFile }

function parse(dirs: string[]): Parsed[] {
  const out: Parsed[] = []
  for (const dir of dirs)
    for (const f of sourceFiles(dir, { extensions: [".tsx"], relativeTo: ROOT, skipTests: true }))
      out.push({
        rel: f.rel,
        path: f.path,
        tree: ts.createSourceFile(f.path, f.source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX),
      })
  return out
}

function tagName(node: ts.Node): string | null {
  if (ts.isJsxElement(node)) return node.openingElement.tagName.getText()
  if (ts.isJsxSelfClosingElement(node)) return node.tagName.getText()
  return null
}

/** Drops what draws nothing a reader can see: blank text, and a
 * `{/* comment *}` expression container with no real expression in it — the
 * same two shapes R67's own per-branch walk treats as transparent. A comment
 * sitting between a heading and the sentence under it must not break the pair. */
function isSignificant(node: ts.Node): boolean {
  if (ts.isJsxText(node)) return node.text.trim().length > 0
  if (ts.isJsxExpression(node)) return node.expression !== undefined
  return true
}

type Offence = { rel: string; line: number; where: string; heading: string; prose: string }

/** Every (heading, prose) SIBLING pair in the whole walk — a heading tag
 * immediately followed, inside the same JSX children array, by a prose tag
 * carrying real text. Ancestry is read from the syntax tree, the same move
 * R67 makes for the identical reason: "what stands next to what" is a
 * question about the JSX, not about indentation or a window of characters. */
function census(files: Parsed[]): Offence[] {
  const out: Offence[] = []
  for (const f of files) {
    const visit = (node: ts.Node) => {
      const children = ts.isJsxElement(node)
        ? node.children
        : ts.isJsxFragment(node)
          ? node.children
          : null
      if (children) {
        const sig = children.filter(isSignificant)
        for (let i = 0; i < sig.length - 1; i++) {
          const a = tagName(sig[i])
          const b = tagName(sig[i + 1])
          if (a && HEADING.test(a) && b && PROSE.test(b)) {
            const text = sig[i + 1].getText().trim()
            if (text.length > 0) {
              const { line } = f.tree.getLineAndCharacterOfPosition(sig[i + 1].getStart(f.tree))
              out.push({ rel: f.rel, line: line + 1, where: `${f.rel}:${line + 1}`, heading: a, prose: b })
            }
          }
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(f.tree)
  }
  return out
}

/** The three chokepoints that draw a heading FOR a caller, so a caller has no
 * position to place a subtitle at — unless one of them re-grows a prop shaped
 * like one. `shared/web/settings-section.tsx`'s own header names the shape
 * exactly: "A section cannot declare a subtitle it has nowhere to put." */
const CHOKEPOINTS = [
  "shared/web/settings-section.tsx",
  "web/components/deep-link/screen-bits.tsx",
  "web/components/records/collection-heading.tsx",
  "web-portal/components/collection-heading.tsx",
]

/** A prop shaped like a subtitle — declared as a TYPE member (`name?:` /
 * `name:`), never merely mentioned in prose, which is why comments are
 * stripped first (`settings-section.tsx`'s own header uses the word
 * "description" nine times while declaring no such prop). */
const SUBTITLE_PROP = /\b(subtitle|description|subheading|caption)\s*\??\s*:/i

describe("R72 — no subtitle under a heading, unless she asked", () => {
  const files = parse(APP_DIRS)
  const offenders = census(files)

  it("the walk is not blind: it reaches real files and finds the shape it exists to catch", () => {
    expect(files.length, "no front-door file was parsed — a root has moved").toBeGreaterThan(150)
    // A tripwire in BOTH directions, the same discipline R67's own amendment 4
    // uses: a census that always finds nothing looks exactly like a clean app.
    expect(
      offenders.length,
      "no heading-adjacent subtitle was found ANYWHERE in the app, including the reasoned exemptions this " +
        "file still carries — the HEADING/PROSE tag sets have drifted, or the sibling walk has stopped " +
        "resolving, and either way this law is enforcing nothing"
    ).toBeGreaterThan(0)
  })

  it("no heading draws a subtitle beneath it, or the file says why it may (R72)", () => {
    const unexplained = offenders.filter((o) => !(o.rel in SUBTITLE_OK))
    expect(
      unexplained.map((o) => `${o.where} — <${o.heading}> is immediately followed by <${o.prose}>`),
      "R72 — 'Generally, I don't like subtitles, so stop putting them unless I ask' (client, 2026-09-14). " +
        "Delete the sentence, fold it into the heading, or move it where R33/R62/R70 already carry one " +
        "(a field's own helper text, an empty state's explanation, an automation's required reason) — " +
        "or name the file in SUBTITLE_OK with the real reason it is none of those:"
    ).toEqual([])

    // ROT-CHECKED, so the list can only shrink: a file whose subtitles are all
    // gone must lose its line rather than keep a pin nobody re-reads — the same
    // discipline UNCONTAINED_SECTION_OK (R67) and HAND_ROLLED_OK already use.
    const claimed = new Set(offenders.map((o) => o.rel))
    const stale = Object.keys(SUBTITLE_OK).filter((k) => !claimed.has(k))
    expect(
      stale,
      "these SUBTITLE_OK entries match nothing any more — the heading no longer has a subtitle under it, so delete the entry:"
    ).toEqual([])
  })

  it("no chokepoint that draws a heading for its caller re-grows a subtitle prop (R72)", () => {
    // THE BLIND SPOT'S OWN GUARD. The sibling census cannot see a subtitle
    // passed as `children` to a component that draws its OWN heading — so the
    // three components that do that are read directly instead, for the one
    // thing that would open the blind spot back up: a prop shaped like a
    // subtitle in their own declared type.
    const offenders2: string[] = []
    for (const rel of CHOKEPOINTS) {
      const source = stripComments(readFileSync(join(ROOT, rel), "utf8"))
      if (SUBTITLE_PROP.test(source)) offenders2.push(rel)
    }
    expect(
      offenders2,
      "these draw a heading FOR a caller and must never also accept a subtitle/description prop — a call " +
        "site with no position to place a subtitle is what stops the next section from growing one back " +
        "(shared/web/settings-section.tsx's own header). Delete the prop, or argue here why this " +
        "chokepoint is different:"
    ).toEqual([])
  })
})
