// @vitest-environment node
//
// TWO OF THE CLIENT'S THREE RULINGS, 18 SEP 2026, verbatim, proved as source
// censuses rather than by rendering — jsdom cannot measure a row's own
// height, and a status/stage cell's colour is a source-level DECISION
// (`Badge dot={…}`) before it is a pixel.
//
//   8 · "when avatar/icon on list view, make the avatar smaller. should not
//        be the cause of more height to the overall row" — in a TABLE row, a
//        face renders at the kit's SMALLEST size, `choice` (24px,
//        `--avatar-sm`), because that is what fits the row's own text line
//        without the picture setting the row's height instead.
//
//   9 · "when showing status/stage on a list, include the colored dot" —
//        every list cell that shows a status or stage draws through
//        `<Badge variant="status" dot={…}>`, never bare text.
//
// ── WIDENED APP-WIDE, 18 SEP 2026 (SAME DAY) ─────────────────────────────────
//
// The first pass scoped itself to three files — `shape.tsx`, `tickets-
// collection.tsx`, `work-panels.tsx` — because that is where the pass's own
// brief pointed it, not because the ruling was ever about three files. Her
// words were "on list view" and "on a list", unqualified. This widens both
// censuses to every table in `web/components`, and the widening found one
// real offender beyond the original three: `work/tasks-screen.tsx`'s own
// Account and App cells drew `<RecordMark picture={…} name={…} />` with no
// `size` at all — fixed here, in the same pass that widened the check.
//
// TWO SHAPES OF TABLE, and the census has to read both. `record-table.tsx`'s
// generic `<TableCell>` is one (`tickets-collection.tsx`, `work-panels.tsx`,
// and any file walked below that draws one literally); the other is a row
// SHAPED as a plain object — `{ status: <Badge…>, account: <RecordMark…> }` —
// whose values `<RecordTable columns={…} rows={…}>` or the recipe engine's
// own `display: "table"` later drop into a cell it builds itself. The first
// shape is found by walking the JSX tree for a literal `<TableCell>`
// ancestor; the second has no such ancestor to look for; a field a table
// never actually shows is not a defect just because it exists. So the
// second half is TABLE_SOURCES below: for each row-shaping function that
// really feeds a table, the file that declares that table's OWN columns
// (`TableColumn[]`/`field(...)`) is read to learn which row KEYS are real
// columns, and only THOSE properties are checked. A `mark`/`status`/`state`
// field a shaper builds but no column ever reads — `shapeInvitesList`'s own
// `mark`, `shapeMeetingsList`'s own dead `state` (the table draws no status
// column at all, ANSWERED, K19a's own reasoning: every row on the list a
// meeting's start time already narrows) — is invisible to a reader and
// invisible to this census for the identical reason.
//
// TABLE_SOURCES IS EXPLICIT, NOT DERIVED, on purpose: which shaper function
// feeds which screen's table is a fact about the CALL GRAPH (an import plus
// a JSX wiring), not about file layout, and this repo's own precedent for
// exactly this kind of judgement call is a reasoned, rot-checked list (R58's
// `GONE_ON_PURPOSE`, R48's `TOOLBAR_EXEMPT`) rather than a census that
// guesses. What IS derived off disk, for every entry: the target file's own
// column keys (never hand-typed — a column renamed in `accounts-screen.tsx`
// changes what this file checks with no edit here), and the shaper
// function's own body (read fresh, never copied). `shape.tsx` alone declares
// eleven row-shaping functions; only four feed a `RecordTable` at all
// (`shapeAccountsList`, `shapeContactsTable`, `shapeMeetingsList`,
// `shapeChoicesTable`) — the other seven (`shapeMembersList`,
// `shapeRolesList`, `shapeInvitesList`, `shapeBrandList`, `shapePurposesList`
// and the two `*Detail` shapers) either feed the recipe engine's own GALLERY
// display or, for `shapeMembersList`/`shapeRolesList`/`shapeInvitesList`,
// are read by nothing outside `web/test/shape.test.ts` at all — a fact
// checked below (`FEEDS_NO_TABLE`), so a day one of them starts feeding a
// real `RecordTable` this file goes red rather than staying quiet about it.
//
// THE PEER FILE, `work/stories-screen.tsx`, IS OWNED BY A PARALLEL SESSION
// (this lane's own brief) and is read but never fixed here. Its one real
// offender — `status: STORY_STATUS_LABEL[s.status]`, bare text, no dotted
// `<Badge>` — is named in `PEER_OWNED_FINDINGS` below: pinned, rot-checked
// both ways (the line goes red the moment the finding disappears OR the
// moment a NEW one appears beside it that this list does not yet name), so
// the peer session's own fix deletes this file's line rather than leaving it
// to rot as a stale warning nobody reads.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import ts from "typescript"

import { sourceFiles } from "@shared/rules/source-scan"

const ROOT = join(import.meta.dirname, "..", "..")
const COMPONENTS = join(ROOT, "web", "components")

const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8")

function parse(rel: string): ts.SourceFile {
  return ts.createSourceFile(rel, read(rel), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
}

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

function hasAttribute(node: ts.Node, name: string): boolean {
  const attrs = attributesOf(node)
  if (!attrs) return false
  return attrs.properties.some((p) => ts.isJsxAttribute(p) && p.name.getText() === name)
}

function isInsideTableCell(node: ts.Node): boolean {
  for (let p: ts.Node | undefined = node.parent; p; p = p.parent) if (tagName(p) === "TableCell") return true
  return false
}

function line(sf: ts.SourceFile, node: ts.Node): number {
  return sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1
}

// ─────────────────────────────────────────────────────────────────────────────
// SHAPE ONE — a literal `<TableCell>` in the JSX tree. DERIVED off disk: every
// `.tsx` under `web/components` that spells `<TableCell` at all, minus the peer
// file. Today that is `tickets/tickets-collection.tsx`, `work/work-panels.tsx`
// and `assistant/agent-blocks.tsx` (the assistant's markdown-table renderer —
// plain cells off a parsed table, no `RecordMark`/status concept at all, so it
// contributes to neither census below and is included rather than carved out:
// the walk staying wide is the point).
// ─────────────────────────────────────────────────────────────────────────────

const PEER_FILE = "web/components/work/stories-screen.tsx"

const TABLE_CELL_FILES = sourceFiles(COMPONENTS, { extensions: [".tsx"], relativeTo: COMPONENTS })
  .map((f) => `web/components/${f.rel}`)
  .filter((rel) => rel !== PEER_FILE && read(rel).includes("<TableCell"))

// ─────────────────────────────────────────────────────────────────────────────
// SHAPE TWO — a row built as a plain object, read into a cell by `RecordTable`
// or the recipe engine's own table display. See this file's header for why the
// list is explicit and the KEYS inside each entry are derived rather than
// typed.
// ─────────────────────────────────────────────────────────────────────────────

type TableSource = {
  /** The file whose row-shaping function builds the values. */
  rowsFile: string
  /** The function to read, so a same-named property somewhere ELSE in a big
   * file (`shape.tsx` declares eleven) can never be attributed to the wrong
   * table. `null` when the whole file IS the shaper (a component's own
   * `rows.map(...)`, not a separate exported function). */
  fn: string | null
  /** The file whose `TableColumn[]`/`field(...)` calls say which of the
   * shaper's keys are real columns. Usually `rowsFile` itself; `shape.tsx`'s
   * four table-feeding functions each answer to a DIFFERENT screen. */
  columnsFile: string
}

const TABLE_SOURCES: TableSource[] = [
  {
    rowsFile: "web/components/deep-link/shape.tsx",
    fn: "shapeAccountsList",
    columnsFile: "web/components/accounts/accounts-screen.tsx",
  },
  {
    rowsFile: "web/components/deep-link/shape.tsx",
    fn: "shapeContactsTable",
    columnsFile: "web/components/accounts/contacts-screen.tsx",
  },
  {
    rowsFile: "web/components/deep-link/shape.tsx",
    fn: "shapeMeetingsList",
    columnsFile: "web/components/meetings/meetings-screen.tsx",
  },
  {
    rowsFile: "web/components/deep-link/shape.tsx",
    fn: "shapeChoicesTable",
    columnsFile: "web/components/screens/settings-choices-panel.tsx",
  },
  {
    rowsFile: "web/components/accounts/inputs-screen.tsx",
    fn: "shapeInputs",
    columnsFile: "web/components/accounts/inputs-screen.tsx",
  },
  {
    rowsFile: "web/components/work/tasks-screen.tsx",
    fn: "shapeTasks",
    columnsFile: "web/components/work/tasks-screen.tsx",
  },
  {
    rowsFile: "web/components/work/waves-screen.tsx",
    fn: "waveListRows",
    columnsFile: "web/components/work/waves-screen.tsx",
  },
  {
    // Inline — `ModuleAutomationsScreen`'s own `data = rows.map(...)`, one
    // row shape for the whole file, so there is no second function to
    // mis-attribute a property to.
    rowsFile: "web/components/screens/module-automations.tsx",
    fn: null,
    columnsFile: "web/components/screens/module-automations.tsx",
  },
  {
    // Inline — the meeting-types table's own `const rows = purposesQ.data.map(...)`
    // (`PurposesTypesPanel`/`internal-screens.tsx`'s own settings table, NOT
    // `shapeBrandList`/`shapePurposesList`, which feed the recipe engine's
    // GALLERY display for the Brand/Purposes screens below it in the same
    // file — a different table shape this list does not claim to cover).
    rowsFile: "web/components/team/internal-screens.tsx",
    fn: null,
    columnsFile: "web/components/team/internal-screens.tsx",
  },
]

/** Every function `shape.tsx` declares that this file does NOT claim feeds a
 * table — the rot check for the header's own claim. A day one of these starts
 * being imported by a screen that hands it to `<RecordTable>` is a day this
 * list (and TABLE_SOURCES above) is stale and needs a new entry, not a day
 * this test should stay quiet. */
const FEEDS_NO_TABLE = [
  "shapeMembersList",
  "shapeRolesList",
  "shapeInvitesList",
  "shapeBrandList",
  "shapeBrandDetail",
  "shapePurposesList",
  "shapeInviteDetail",
]

/** The peer session's own file (this lane's brief: read it, never fix it).
 * Pinned findings, rot-checked both ways below — the shape this repo already
 * uses for `GONE_ON_PURPOSE` (R58) and `TOOLBAR_EXEMPT` (R48): a line that no
 * longer matches anything is deleted, and this file goes red until it is. */
const PEER_OWNED_FINDINGS = [
  {
    needle: "status: STORY_STATUS_LABEL[s.status]",
    why: 'the List table\'s own Status column draws bare text off STORY_STATUS_LABEL, no <Badge variant="status" dot={…}> — item 9\'s exact shape, in the one file this lane\'s brief withholds (a parallel session owns stories-screen.tsx).',
  },
]

/** Column keys a file's own `TableColumn[]`/`field(key, label)` calls declare —
 * never hand-typed, so a column renamed at the call site is what this reads,
 * not a copy kept here. `field(...)`'s own signature (`web/lib/screens.ts`)
 * takes the column name first; the object-literal shape additionally requires
 * a sibling `label` so an unrelated same-named property elsewhere (a form
 * field's own `{ key: "mark", label: "Mark", kind: "text" }`,
 * `internal-record-dialog.tsx`) cannot be mistaken for a table column. */
function columnKeysOf(rel: string): Set<string> {
  const sf = parse(rel)
  const keys = new Set<string>()
  const visit = (node: ts.Node) => {
    if (ts.isObjectLiteralExpression(node)) {
      const props = node.properties.filter(ts.isPropertyAssignment)
      const keyProp = props.find((p) => ts.isIdentifier(p.name) && p.name.text === "key")
      const labelProp = props.find((p) => ts.isIdentifier(p.name) && p.name.text === "label")
      if (keyProp && labelProp && ts.isStringLiteral(keyProp.initializer)) keys.add(keyProp.initializer.text)
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "field") {
      const first = node.arguments[0]
      if (first && ts.isStringLiteral(first)) keys.add(first.text)
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return keys
}

function findFunctionBody(sf: ts.SourceFile, fnName: string): ts.Node | null {
  let found: ts.Node | null = null
  const visit = (node: ts.Node) => {
    if (found) return
    if (ts.isFunctionDeclaration(node) && node.name?.text === fnName) {
      found = node
      return
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return found
}

/** A gallery wall / board card / record-detail head — the OTHER places a
 * `<RecordMark>` legitimately draws at a size other than `choice`. Checked as
 * a JSX ancestor, so a table cell's own composite content (a mark plus a
 * muted second line, `waveListRows`'s own `account` cell) is never caught by
 * its OWN wrapping `<span>`. */
function isInsideExemptWall(node: ts.Node): boolean {
  const EXEMPT = new Set(["CardGrid", "Card", "RecordChrome", "KanbanCard"])
  for (let p: ts.Node | undefined = node.parent; p; p = p.parent) {
    const tn = tagName(p)
    if (tn && EXEMPT.has(tn)) return true
  }
  return false
}

function nearestOwningProperty(node: ts.Node): ts.PropertyAssignment | null {
  for (let p: ts.Node | undefined = node.parent; p; p = p.parent) {
    if (ts.isPropertyAssignment(p) && ts.isIdentifier(p.name)) return p
  }
  return null
}

/** A facet/picker OPTION — `{ value, label, mark: <RecordMark size="choice" /> }`
 * — told apart from a table row by its OWN sibling keys, never by the property
 * name alone (a row's own `mark` field, `shapeMembersList`'s unread one among
 * them, carries no such siblings and is a different shape entirely). */
function isFacetOption(propNode: ts.PropertyAssignment): boolean {
  const obj = propNode.parent
  if (!ts.isObjectLiteralExpression(obj)) return false
  const names = obj.properties.filter(ts.isPropertyAssignment).map((p) => (ts.isIdentifier(p.name) ? p.name.text : ""))
  return names.includes("value") && names.includes("label")
}

type Hit = { rel: string; text: string }

function scanTableSource(entry: TableSource): { faces: Hit[]; statuses: Hit[] } {
  const keys = columnKeysOf(entry.columnsFile)
  const sf = parse(entry.rowsFile)
  const root = entry.fn ? findFunctionBody(sf, entry.fn) : sf
  if (!root) throw new Error(`${entry.rowsFile}: could not find function ${entry.fn} — TABLE_SOURCES is stale`)
  const faces: Hit[] = []
  const statuses: Hit[] = []
  const visit = (node: ts.Node) => {
    if (tagName(node) === "RecordMark") {
      const owner = nearestOwningProperty(node)
      if (owner && keys.has((owner.name as ts.Identifier).text) && !isFacetOption(owner) && !isInsideExemptWall(node)) {
        const size = stringAttr(node, "size")
        if (size !== "choice")
          faces.push({
            rel: entry.rowsFile,
            text: `${entry.rowsFile}:${line(sf, node)} (${entry.fn ?? "file"}, column "${(owner.name as ts.Identifier).text}") — size=${JSON.stringify(size ?? null)}`,
          })
      }
    }
    if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name) && (node.name.text === "status" || node.name.text === "state")) {
      if (keys.has(node.name.text)) {
        const text = node.initializer.getText(sf)
        const hasDot = /<Badge\b[^]*?\bdot=/.test(text) || text.includes("ticketStatusCell(")
        if (!hasDot)
          statuses.push({
            rel: entry.rowsFile,
            text: `${entry.rowsFile}:${line(sf, node)} (${entry.fn ?? "file"}, column "${node.name.text}") — draws a status/stage cell as bare text`,
          })
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(root)
  return { faces, statuses }
}

describe("R86/item-8 — a table row's face is the kit's smallest size (app-wide)", () => {
  it("every <RecordMark> inside a literal <TableCell> carries size=\"choice\"", () => {
    const offenders: string[] = []
    let seen = 0
    for (const rel of TABLE_CELL_FILES) {
      const sf = parse(rel)
      const visit = (node: ts.Node) => {
        if (tagName(node) === "RecordMark" && isInsideTableCell(node)) {
          seen++
          const size = stringAttr(node, "size")
          if (size !== "choice") offenders.push(`${rel}:${line(sf, node)} — size=${JSON.stringify(size ?? null)}`)
        }
        ts.forEachChild(node, visit)
      }
      visit(sf)
    }
    // THE BLINDNESS TRIPWIRE — a walk that stopped finding `<RecordMark>` at
    // all would report zero offenders for the same reason a fixed one does.
    expect(seen, "no <RecordMark> found inside a literal <TableCell> — the census went blind").toBeGreaterThan(3)
    expect(
      offenders,
      "a table-row face is not the kit's smallest size (client ruling, 18 Sep 2026: " +
        "\"make the avatar smaller. should not be the cause of more height to the overall row\"):\n  " +
        offenders.join("\n  ")
    ).toEqual([])
  })

  it("every <RecordMark> a RecordTable-style row hands to a real column carries size=\"choice\"", () => {
    const offenders: string[] = []
    let seen = 0
    for (const entry of TABLE_SOURCES) {
      const { faces } = scanTableSource(entry)
      // seen counts every RecordMark this entry's column-key filter let
      // through, compliant or not, read straight off the scan rather than
      // re-derived — see the tripwire below.
      const keys = columnKeysOf(entry.columnsFile)
      const sf = parse(entry.rowsFile)
      const root = entry.fn ? findFunctionBody(sf, entry.fn)! : sf
      const visit = (node: ts.Node) => {
        if (tagName(node) === "RecordMark") {
          const owner = nearestOwningProperty(node)
          if (owner && keys.has((owner.name as ts.Identifier).text) && !isFacetOption(owner) && !isInsideExemptWall(node)) seen++
        }
        ts.forEachChild(node, visit)
      }
      visit(root)
      offenders.push(...faces.map((f) => f.text))
    }
    expect(seen, "no RecordMark-in-a-real-column found across TABLE_SOURCES — the census went blind").toBeGreaterThan(3)
    expect(
      offenders,
      "a table-row face is not the kit's smallest size (client ruling, 18 Sep 2026):\n  " + offenders.join("\n  ")
    ).toEqual([])
  })
})

describe("R86/item-9 — status/stage on a list always carries the dot (app-wide)", () => {
  it("no literal <TableCell> reads HELP_STATUS[ without a dotted <Badge> in the same cell", () => {
    const offenders: string[] = []
    let seen = 0
    for (const rel of TABLE_CELL_FILES) {
      const sf = parse(rel)
      const visit = (node: ts.Node) => {
        if (tagName(node) === "TableCell") {
          const text = node.getText(sf)
          if (text.includes("HELP_STATUS[") || text.includes("ticketStatusCell(")) {
            seen++
            const throughSharedCell = text.includes("ticketStatusCell(")
            const hasDottedBadge = (() => {
              let found = false
              const inner = (n: ts.Node) => {
                if (found) return
                if (tagName(n) === "Badge" && hasAttribute(n, "dot")) {
                  found = true
                  return
                }
                ts.forEachChild(n, inner)
              }
              inner(node)
              return found
            })()
            if (!throughSharedCell && !hasDottedBadge)
              offenders.push(`${rel}:${line(sf, node)} — draws a ticket status/stage as bare text`)
          }
        }
        ts.forEachChild(node, visit)
      }
      visit(sf)
    }
    expect(seen, "no <TableCell> referencing a ticket's status/stage was found — the census went blind").toBeGreaterThan(0)
    expect(
      offenders,
      "a status/stage cell must draw the coloured dot (client ruling, 18 Sep 2026: " +
        "\"when showing status/stage on a list, include the colored dot\"):\n  " +
        offenders.join("\n  ")
    ).toEqual([])
  })

  it("every RecordTable-style row's status/state column carries the dot", () => {
    const offenders: string[] = []
    let seen = 0
    for (const entry of TABLE_SOURCES) {
      const { statuses } = scanTableSource(entry)
      const keys = columnKeysOf(entry.columnsFile)
      const sf = parse(entry.rowsFile)
      const root = entry.fn ? findFunctionBody(sf, entry.fn)! : sf
      const visit = (node: ts.Node) => {
        if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name) && (node.name.text === "status" || node.name.text === "state")) {
          if (keys.has(node.name.text)) seen++
        }
        ts.forEachChild(node, visit)
      }
      visit(root)
      offenders.push(...statuses.map((s) => s.text))
    }
    expect(seen, "no status/state column found across TABLE_SOURCES — the census went blind").toBeGreaterThan(0)
    expect(
      offenders,
      "a status/stage cell must draw the coloured dot (client ruling, 18 Sep 2026):\n  " + offenders.join("\n  ")
    ).toEqual([])
  })

  it("red proof — the pre-fix shape (bare HELP_STATUS text, no Badge) is exactly what this census flags", () => {
    const src = `
      function renderRows() {
        return (
          <TableCell className="text-muted-foreground">
            {t(HELP_STATUS[ticket.status])}
          </TableCell>
        )
      }
    `
    const sf = ts.createSourceFile("fixture-red.tsx", src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    let flagged = false
    const visit = (node: ts.Node) => {
      if (tagName(node) === "TableCell") {
        const text = node.getText(sf)
        if (text.includes("HELP_STATUS[")) {
          let found = false
          const inner = (n: ts.Node) => {
            if (found) return
            if (tagName(n) === "Badge" && hasAttribute(n, "dot")) {
              found = true
              return
            }
            ts.forEachChild(n, inner)
          }
          inner(node)
          if (!found) flagged = true
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(sf)
    expect(flagged, "the owned red fixture (bare HELP_STATUS text in a TableCell) was not flagged").toBe(true)
  })
})

describe("the peer file (stories-screen.tsx) is read, never fixed, and its findings are pinned rather than silent", () => {
  it("shape.tsx's non-table shapers really feed nothing this file calls a table", () => {
    const shapeSrc = read("web/components/deep-link/shape.tsx")
    for (const fn of FEEDS_NO_TABLE)
      expect(shapeSrc.includes(`function ${fn}(`), `${fn} no longer exists in shape.tsx — FEEDS_NO_TABLE is stale`).toBe(
        true
      )
    const wired = new Set(TABLE_SOURCES.filter((s) => s.rowsFile.endsWith("deep-link/shape.tsx")).map((s) => s.fn))
    for (const fn of FEEDS_NO_TABLE)
      expect(wired.has(fn), `${fn} is in both FEEDS_NO_TABLE and TABLE_SOURCES — pick one`).toBe(false)
  })

  it("every PEER_OWNED_FINDINGS line still matches the peer file (no rot)", () => {
    const src = read(PEER_FILE)
    for (const { needle, why } of PEER_OWNED_FINDINGS) {
      expect(src.includes(needle), `${PEER_FILE} no longer contains ${JSON.stringify(needle)} — delete this PEER_OWNED_FINDINGS line, the peer session fixed it`).toBe(
        true
      )
      expect(why.length, `${JSON.stringify(needle)} needs a real reason, not a placeholder`).toBeGreaterThan(30)
    }
  })
})
