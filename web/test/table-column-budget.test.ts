// R82 — A TABLE ROW HOLDS AT MOST SIX COLUMNS.
//
// The client's ruling, 16 Sep 2026, over the Waves List view: "the right side
// of the container in waves is shape wrong." UI-RULEBOOK N1 already named
// the ceiling ("at most … six in a table row … the fifth fact moves to a
// second line … it does not get squeezed onto the end"), and Tickets' own
// `TICKET_COLUMNS_DEFAULT` stays at four (five on Closed) by deliberate,
// dated design — but the ceiling was prose, never a check, so it could break
// silently. `waveListColumns` (web/components/work/waves-screen.tsx) did
// exactly that: the same commit that gave the T3 timeline's left column the
// wave's own App (client, 16 Sep 2026: "I want the name of the app") also
// gave the List view a SEVENTH column for it — Wave · Account · App ·
// Sprints · Start · End · Status — on a collection already at the six-column
// ceiling before the App fact existed.
//
// A seventh column does not overflow the frame: the kit's own `<Table>`
// self-scrolls on the inline axis inside its own container
// (`shared/ui/components/table/table.tsx`'s `overflow-x-auto`, never
// `overflow: hidden` — R39), so nothing spills past `<CollectionCard>`'s
// rounded edge. It SQUEEZES instead — every column loses width to make room
// for the one that just arrived, most visibly at the row's own right end,
// where Start/End/Status crowd together against the card's own inset. That
// is the shape she is naming.
//
// THE FIX IS N1's OWN PRESCRIPTION: the App fact rides the Account cell's
// own second line, the identical primary-plus-muted-subline shape
// `record-timeline.tsx`'s own `TimelineRow.sublabel` already draws one
// column along, never a column of its own.
//
// THE CENSUS, OFF THE DISK: every array literal in `web/`, `web-portal/` and
// `shared/web/` whose elements are ALL object literals carrying both a `key`
// and a `label` property — the shape `TableColumn` (record-table.tsx) needs
// of both, and the only shape this census claims to recognise — is a
// table's own column list. Its element count must be six or fewer, or the
// array's enclosing function is named in `TABLE_COLUMN_BUDGET_EXEMPT`
// (shared/rules/registry.ts) with the real reason.
//
// OUT OF REACH BY CONSTRUCTION, stated rather than exempted: a RECIPE-DRIVEN
// column list built by `.map()` over a config array
// (`tasks-screen.tsx`/`stories-screen.tsx`'s own
// `tableRecipe.fields.map(…)`, `contacts-screen.tsx`'s
// `contactColumnHeaders`) is not a literal array of object literals at all —
// its own ceiling is a question for whoever edits that recipe's `fields`,
// not for a census reading TSX source.

import { join } from "node:path"
import { describe, expect, it } from "vitest"
import ts from "typescript"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"
import { TABLE_COLUMN_BUDGET_EXEMPT } from "@shared/rules/registry"

const ROOT = join(import.meta.dirname, "..", "..")
const ROOTS = [join(ROOT, "web"), join(ROOT, "web-portal"), join(ROOT, "shared", "web")]

const CEILING = 6

type Offender = { key: string; rel: string; line: number; count: number }

/** The nearest enclosing named function — a declared function, or an arrow/
 * function expression assigned to a variable — the same "room" every other
 * per-function exemption key in this repo uses (rules.test.ts's own
 * `enclosingName`, re-read here rather than imported: that helper is local
 * to `rules.test.ts` and this law lives in its own file, the way every law
 * since R74 does). A module-level array with no enclosing function keys on
 * the file itself. */
function enclosingFunctionName(node: ts.Node, sf: ts.SourceFile): string {
  for (let cur: ts.Node | undefined = node; cur; cur = cur.parent) {
    if (ts.isFunctionDeclaration(cur) && cur.name) return cur.name.getText(sf)
    if (
      (ts.isArrowFunction(cur) || ts.isFunctionExpression(cur)) &&
      ts.isVariableDeclaration(cur.parent) &&
      ts.isIdentifier(cur.parent.name)
    )
      return cur.parent.name.getText(sf)
  }
  return "module"
}

/** True when every element of `arr` is an object literal carrying BOTH a
 * `key` and a `label` property assignment — `TableColumn`'s own two required
 * fields, and the only two this census asks about. A shorthand
 * (`{ key, label }`) counts too; a spread element (`...rest`) does not, so an
 * array built with one is read as NOT this shape rather than mis-measured. */
function looksLikeTableColumns(arr: ts.ArrayLiteralExpression): boolean {
  if (arr.elements.length === 0) return false
  return arr.elements.every((el) => {
    if (!ts.isObjectLiteralExpression(el)) return false
    let hasKey = false
    let hasLabel = false
    for (const p of el.properties) {
      if (!ts.isPropertyAssignment(p) && !ts.isShorthandPropertyAssignment(p)) continue
      const name = p.name.getText()
      if (name === "key" || name === '"key"') hasKey = true
      if (name === "label" || name === '"label"') hasLabel = true
    }
    return hasKey && hasLabel
  })
}

/** Every `TableColumn`-shaped array literal over six entries, across `roots`. */
function findOffenders(roots: string[]): Offender[] {
  const offenders: Offender[] = []
  for (const f of sourceFiles(roots, { extensions: [".tsx"], relativeTo: ROOT, skipTests: true })) {
    // Blanked, not deleted: `keepLength` keeps every offset — and therefore
    // every line number — identical to the file on disk.
    const src = stripComments(f.source, { keepLength: true })
    const sf = ts.createSourceFile(f.path, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const visit = (node: ts.Node): void => {
      if (ts.isArrayLiteralExpression(node) && looksLikeTableColumns(node)) {
        if (node.elements.length > CEILING) {
          const name = enclosingFunctionName(node, sf)
          offenders.push({
            key: `${f.rel}#${name}`,
            rel: f.rel,
            line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
            count: node.elements.length,
          })
        }
        // A TableColumn array never nests another one inside it (a column's
        // own `render`/`sortKey` are functions, not arrays of columns), so
        // there is nothing to gain — and a real risk of double-counting a
        // spread's own source array — by recursing into one once matched.
        return
      }
      ts.forEachChild(node, visit)
    }
    visit(sf)
  }
  return offenders
}

describe("R82 — a table row holds at most six columns", () => {
  it("table-column-budget: no TableColumn[] literal in web/, web-portal/ or shared/web/ exceeds six entries, or is named in TABLE_COLUMN_BUDGET_EXEMPT", () => {
    const offenders = findOffenders(ROOTS)
    const used = new Set<string>()
    const unexempt: string[] = []
    for (const o of offenders) {
      if (o.key in TABLE_COLUMN_BUDGET_EXEMPT) {
        used.add(o.key)
        continue
      }
      unexempt.push(
        `${o.rel}:${o.line} — ${o.count} columns (key: "${o.key}"). N1's ceiling is six: fold the extra fact onto an existing column's own second line, or name "${o.key}" in TABLE_COLUMN_BUDGET_EXEMPT with the real reason.`
      )
    }
    expect(unexempt, unexempt.join("\n")).toEqual([])

    const stale = Object.keys(TABLE_COLUMN_BUDGET_EXEMPT).filter((k) => !used.has(k))
    expect(
      stale,
      `these TABLE_COLUMN_BUDGET_EXEMPT entries match no table over six columns any more — delete them:\n  ${stale.join("\n  ")}`
    ).toEqual([])
  })

  // THE RED PROOF — waves-screen.tsx's own pre-fix shape, replayed from a
  // fixture rather than the live file, so this law stays provably red on the
  // regression it was written for even after the real file is clean.
  it("waveListColumns' own pre-fix shape (Wave · Account · App · Sprints · Start · End · Status) is exactly what this census flags", () => {
    const preFix = `
      export function waveListColumns(t: (s: string) => string): TableColumn[] {
        return [
          { key: "name", label: t("Wave") },
          { key: "account", label: t("Account"), searchKey: "accountName" },
          { key: "app", label: t("App"), searchKey: "appName" },
          { key: "sprints", label: t("Sprints") },
          { key: "start", label: t("Start") },
          { key: "end", label: t("End") },
          { key: "state", label: t("Status") },
        ]
      }
    `
    const sf = ts.createSourceFile("waves-screen.tsx", preFix, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    let found: ts.ArrayLiteralExpression | undefined
    const visit = (node: ts.Node): void => {
      if (ts.isArrayLiteralExpression(node) && looksLikeTableColumns(node)) {
        found = node
        return
      }
      ts.forEachChild(node, visit)
    }
    visit(sf)
    expect(found, "the fixture's own array must be recognised as a TableColumn[] literal").toBeTruthy()
    expect(found!.elements.length, "the pre-fix shape carries seven columns").toBe(7)
    expect(found!.elements.length > CEILING).toBe(true)
  })

  it("the post-fix shape (six columns, App folded into Account's own second line) passes clean", () => {
    const postFix = `
      export function waveListColumns(t: (s: string) => string): TableColumn[] {
        return [
          { key: "name", label: t("Wave") },
          { key: "account", label: t("Account"), searchKey: "accountName" },
          { key: "sprints", label: t("Sprints") },
          { key: "start", label: t("Start") },
          { key: "end", label: t("End") },
          { key: "state", label: t("Status") },
        ]
      }
    `
    const sf = ts.createSourceFile("waves-screen.tsx", postFix, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    let found: ts.ArrayLiteralExpression | undefined
    const visit = (node: ts.Node): void => {
      if (ts.isArrayLiteralExpression(node) && looksLikeTableColumns(node)) {
        found = node
        return
      }
      ts.forEachChild(node, visit)
    }
    visit(sf)
    expect(found!.elements.length).toBe(6)
    expect(found!.elements.length > CEILING).toBe(false)
  })
})
