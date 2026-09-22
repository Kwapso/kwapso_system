// R104, PEOPLE-AS-CHIPS. Read at UI-RULEBOOK.md L43, her validated rulings on
// the round-48/round-50 batch, 22 Sep 2026, following the 21 Sep 2026
// correction over the live tickets pages: "stakeholders raised by design
// like in the loop (chip like)" and "same with assigned to (chiplike)." A
// person or a group of people inside a RECORD SECTION (Raised by, Assigned
// to, On the loop, a system's stakeholders, the members of a group) renders
// as `PersonCard` chips under a plain eyebrow label, never inside a tile or
// a `<Card>`: the shape `web/components/tickets/help-stakeholders.tsx` and
// `web/components/work/task-sheet.tsx` already draw (`PersonCard
// orientation="horizontal" size="choice"`, no card around it).
//
// THE OTHER READING THIS LAW DOES NOT TOUCH. A collection of PEOPLE AS
// RECORDS, Settings members, a contacts grid, draws each one as its own
// square tile inside its own per-record `<Card>` (R65, chip-above-title):
// one card per ROW of a collection, not a card wrapping a fact about one
// record. `PEOPLE_AS_CHIPS_EXEMPT` is the file-wide way out for exactly that
// shape, never a per-mount exemption. See the registry entry for why a
// whole file, not one `<PersonCard>` at a time.
//
// THE CENSUS, OFF THE DISK, over web/components/tickets, web/components/work,
// web/components/apps and web/components/accounts (this app's contacts live
// under accounts/, there is no separate contacts/ folder): every
// `<PersonCard>` mount whose ancestor chain reaches a `<Card>` of ANY variant
// is a finding, unless its file is named whole in `PEOPLE_AS_CHIPS_EXEMPT`.

import { join } from "node:path"
import { describe, expect, it } from "vitest"
import ts from "typescript"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"
import { PEOPLE_AS_CHIPS_EXEMPT } from "@shared/rules/registry"

const ROOT = join(import.meta.dirname, "..", "..")

const ROOTS = [
  join(ROOT, "web", "components", "tickets"),
  join(ROOT, "web", "components", "work"),
  join(ROOT, "web", "components", "apps"),
  join(ROOT, "web", "components", "accounts"),
]

type Offender = { rel: string; line: number; card: string }

function tagName(node: ts.Node): string | null {
  if (ts.isJsxElement(node)) return node.openingElement.tagName.getText()
  if (ts.isJsxSelfClosingElement(node)) return node.tagName.getText()
  return null
}

function attributesOf(node: ts.Node): ts.JsxAttributes | null {
  if (ts.isJsxElement(node)) return node.openingElement.attributes
  if (ts.isJsxSelfClosingElement(node)) return node.attributes
  return null
}

function stringAttr(node: ts.Node, name: string): string | undefined {
  const attrs = attributesOf(node)
  if (!attrs) return undefined
  for (const p of attrs.properties) {
    if (!ts.isJsxAttribute(p) || p.name.getText() !== name || !p.initializer) continue
    if (ts.isStringLiteral(p.initializer)) return p.initializer.text
    if (
      ts.isJsxExpression(p.initializer) &&
      p.initializer.expression &&
      ts.isStringLiteral(p.initializer.expression)
    )
      return p.initializer.expression.text
  }
  return undefined
}

/** Every real JSX ancestor element from `node` up to the file's own root,
 * through `{…}` expressions, ternaries and fragments, so a `<Card>` two
 * levels up (a `<CardContent>` sitting between it and the chip) is still
 * found. */
function ancestorElements(node: ts.Node): ts.Node[] {
  const out: ts.Node[] = []
  let cur: ts.Node | undefined = node.parent
  while (cur) {
    if (ts.isJsxElement(cur) || ts.isJsxSelfClosingElement(cur)) out.push(cur)
    cur = cur.parent
  }
  return out
}

function findOffenders(): Offender[] {
  const offenders: Offender[] = []
  for (const f of sourceFiles(ROOTS, { extensions: [".tsx"], relativeTo: ROOT, skipTests: true })) {
    if (!/PersonCard/.test(f.source)) continue
    const src = stripComments(f.source, { keepLength: true })
    const sf = ts.createSourceFile(f.path, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const lineOf = (node: ts.Node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1

    const visit = (node: ts.Node): void => {
      if (tagName(node) === "PersonCard") {
        for (const anc of ancestorElements(node)) {
          if (tagName(anc) === "Card") {
            const variant = stringAttr(anc, "variant") ?? "default"
            offenders.push({ rel: f.rel, line: lineOf(node), card: `<Card variant="${variant}">` })
            break
          }
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(sf)
  }
  return offenders
}

function fileExempt(rel: string) {
  return PEOPLE_AS_CHIPS_EXEMPT.find((e) => e.file === rel)
}

describe("R104, people-as-chips", () => {
  it("a PersonCard inside a record section never sits inside a Card of any variant, unless its whole file is a per-record gallery grid", () => {
    const found = findOffenders()
    const unexempt = found.filter((f) => !fileExempt(f.rel))
    expect(
      unexempt,
      "a person inside a record section (Raised by, Assigned to, On the loop, stakeholders) renders as a bare " +
        "PersonCard chip under an eyebrow label, never inside a Card. If this file is genuinely a per-record " +
        "gallery grid (one Card per person, not a fact about one record), name the whole file in " +
        "PEOPLE_AS_CHIPS_EXEMPT:\n  " +
        unexempt.map((f) => `${f.rel}:${f.line}  PersonCard inside ${f.card}`).join("\n  ")
    ).toEqual([])
  })

  it("PEOPLE_AS_CHIPS_EXEMPT names only files that still mount a Card-wrapped PersonCard", () => {
    const found = findOffenders()
    const stale = PEOPLE_AS_CHIPS_EXEMPT.filter((e) => !found.some((f) => f.rel === e.file))
    expect(
      stale,
      "these PEOPLE_AS_CHIPS_EXEMPT entries name a file that no longer wraps a PersonCard in a Card. Delete " +
        "the entry:\n  " + stale.map((e) => e.file).join("\n  ")
    ).toEqual([])
  })
})
