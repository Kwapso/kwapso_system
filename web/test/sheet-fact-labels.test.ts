// R105, SHEET-FACT-LABELS. Her answer, 22 Sep 2026, item 6, reading the
// merged task-sheet section back: "there are 3 stiles of titles here adn
// that does not make sense: unify!! assigend to, details and deadline the
// three look different! i Definitely think it makes sense thys grey color,
// the rest you decide. also the assigned to person make it a chip, like in
// stories and put the title above." Inside a sheet, every fact label
// (Assigned to, Details, Deadline and their siblings) shares the eyebrow
// register, `text-micro`, uppercase, muted, placed above its own content,
// and the sheet's own sections carry no background. `task-sheet.tsx`'s own
// merged section is the shape this law generalises: Details' old bold
// `<h3>` and Deadline's old `OverviewList` dt/dd pair are both retired for
// the identical `text-micro text-muted-foreground uppercase` span every
// other fact label in the sheet already carries.
//
// THE CENSUS, OFF THE DISK, over every file in web/components that draws a
// literal `<SheetContent` (a real Sheet, not a panel that merely resembles
// one, a card, a side rail): every element whose OWN `className` carries
// both `uppercase` and `text-muted-foreground` (the established eyebrow
// shape elsewhere in this app, `record-chrome.tsx`'s `text-micro` note) is a
// "fact label" for this law's purposes, and every one found in the SAME file
// must carry the identical class list, never two different spellings of the
// same idea in one sheet. `task-sheet.tsx`'s own three labels are asserted
// against the canonical string directly, a tripwire so the census cannot
// pass by matching nothing at all.
//
// SCOPED TO A LITERAL SheetContent MOUNT ON PURPOSE. See the registry
// entry's own `why` for the reasoning: widening this to every eyebrow-shaped
// label in the app would catch D10's own `DescriptionList` labels and every
// other small-caps caption this app draws, none of which this ruling
// touched.

import { join } from "node:path"
import { describe, expect, it } from "vitest"
import ts from "typescript"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"
import { SHEET_FACT_LABEL_EXEMPT } from "@shared/rules/registry"

const ROOT = join(import.meta.dirname, "..", "..")
const COMPONENTS = join(ROOT, "web", "components")

const CANONICAL = "text-micro text-muted-foreground uppercase"

function normalize(classText: string): string {
  return classText.trim().split(/\s+/).sort().join(" ")
}

type Label = { rel: string; line: number; expression: string; classText: string }

function attrStringText(node: ts.JsxOpeningLikeElement, name: string): string | undefined {
  for (const p of node.attributes.properties) {
    if (!ts.isJsxAttribute(p) || p.name.getText() !== name || !p.initializer) continue
    if (ts.isStringLiteral(p.initializer)) return p.initializer.text
  }
  return undefined
}

function findLabels(): Label[] {
  const out: Label[] = []
  for (const f of sourceFiles([COMPONENTS], { extensions: [".tsx"], relativeTo: ROOT, skipTests: true })) {
    if (!/<SheetContent\b/.test(f.source)) continue
    const src = stripComments(f.source, { keepLength: true })
    const sf = ts.createSourceFile(f.path, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const lineOf = (node: ts.Node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1

    const visit = (node: ts.Node): void => {
      const opening = ts.isJsxElement(node)
        ? node.openingElement
        : ts.isJsxSelfClosingElement(node)
          ? node
          : undefined
      if (opening) {
        const cls = attrStringText(opening, "className")
        if (cls && /\buppercase\b/.test(cls) && /\btext-muted-foreground\b/.test(cls)) {
          out.push({ rel: f.rel, line: lineOf(node), expression: cls, classText: cls })
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(sf)
  }
  return out
}

function excused(rel: string, expression: string) {
  return SHEET_FACT_LABEL_EXEMPT.find((e) => e.file === rel && expression.includes(e.expression))
}

describe("R105, sheet-fact-labels", () => {
  it("task-sheet.tsx draws Assigned to, Details and Deadline with the canonical eyebrow class (tripwire, the census must find something)", () => {
    const labels = findLabels().filter((l) => l.rel === "web/components/work/task-sheet.tsx")
    expect(labels.length, "the census found no fact labels in task-sheet.tsx, fix the derivation, never this number").toBeGreaterThanOrEqual(3)
    for (const l of labels) {
      expect(normalize(l.classText), `task-sheet.tsx:${l.line} must carry the canonical eyebrow class`).toBe(
        normalize(CANONICAL)
      )
    }
  })

  it("every fact label inside a sheet shares one class list with every other fact label in that same sheet", () => {
    const labels = findLabels()
    const byFile = new Map<string, Label[]>()
    for (const l of labels) byFile.set(l.rel, [...(byFile.get(l.rel) ?? []), l])

    const wrong: string[] = []
    for (const [rel, rows] of byFile) {
      const canonicalSet = normalize(rows[0].classText)
      for (const row of rows) {
        if (normalize(row.classText) === canonicalSet) continue
        if (excused(rel, row.expression)) continue
        wrong.push(`${rel}:${row.line}  "${row.classText}" disagrees with "${rows[0].classText}" in the same sheet`)
      }
    }
    expect(
      wrong,
      "every fact label inside one sheet must carry the identical class list. Unify the class, or name the " +
        "finding in SHEET_FACT_LABEL_EXEMPT with the reason:\n  " + wrong.join("\n  ")
    ).toEqual([])
  })

  it("SHEET_FACT_LABEL_EXEMPT names only real, still-open findings", () => {
    const labels = findLabels()
    const stale = SHEET_FACT_LABEL_EXEMPT.filter(
      (e) => !labels.some((l) => l.rel === e.file && l.expression.includes(e.expression))
    )
    expect(
      stale,
      "these SHEET_FACT_LABEL_EXEMPT entries no longer match a real label. Delete the entry:\n  " +
        stale.map((e) => `${e.file}  ${e.expression}`).join("\n  ")
    ).toEqual([])
  })
})
