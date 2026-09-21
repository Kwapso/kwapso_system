// R86 — IN ANY COLLECTION, THE ONE COLOURED CHIP IS THE RECORD'S STATUS.
//
// The client's ruling, 17 Sep 2026, verbatim: "I have changed my mind
// regarding chips. In a database where there are different columns, the one
// that gets the chip with the color is always the status. This means that
// for tickets, we need to find icons for the ticket type and assign colors
// to the status."
//
// TWO HALVES, and this file checks the first: a list row, a board card or a
// record's own head chip row may colour exactly ONE thing — its status
// (`shared/status-tones.ts`, `shared/app-stages.ts`, D17) — and every other
// categorical field draws an ICON or plain text, never a colour. Tickets
// (this task's own subject) are the worked example: `ticketTypeIconName`
// (@shared/ticket-types) replaced `ticketTypeColour` (web/lib/type-colours.ts)
// on every chip, row, board card and picker a ticket's TYPE reaches.
//
// THE CENSUS IS NARROW ON PURPOSE — over shape.tsx and the ticket
// collection/detail components (plus tasks-screen.tsx, home of the one
// exemption this law's ruling itself named), not a blanket walk of the whole
// app. A `<Badge variant="status" dot={…}>` or `<Swatch colour={…}>` whose
// expression resolves (through at most a few local `const` hops, the same
// single-hop discipline `mango-title-only.test.ts` already uses for its own
// `resolveLocalJsxRef`) to something naming STATUS or STAGE or WAITING is a
// legitimate status dot; anything else is an offender unless the file+
// function is named in `COLOURED_CHIP_OK`. An expression whose root
// identifier is a function PARAMETER (the generic `ChoiceGroupHome.colour`
// seam `shapeChoicesTable` draws for a group nobody has wired yet) is out of
// reach by construction — the same posture R84 takes for a computed `variant`
// — because a rule that reads source cannot resolve what a caller decides at
// render.
//
// ONE EXEMPTION ON THE DAY THIS LAW SHIPPED: the task PRIORITY dot
// (`tasks-screen.tsx#PriorityChip`, `PRIORITY_DOT_TONE`) — priority is
// already ruled a dot on tasks (K19a, "Priority has its own four colours,
// never App Stage's"), the one categorical field besides status this app
// colours on purpose, so it is named rather than silently allowed.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import ts from "typescript"

import { stripComments } from "@shared/rules/source-scan"
import { COLOURED_CHIP_OK } from "@shared/rules/registry"

const ROOT = join(import.meta.dirname, "..", "..")

/** The narrow population this law reads — shape.tsx, every ticket collection/
 * detail component the icon swap touched, and task-sheet.tsx, the file
 * that holds the ruling's own named exception (the priority chip moved
 * there off tasks-screen.tsx, 21 Sep 2026, with the task slide-in — see
 * that file's own header; tasks-screen.tsx is kept in this list too, since
 * it still imports and calls the chip, even though the literal `<Badge
 * variant="status" dot={…}>` this census reads now lives one file over).
 * Relative to ROOT, the same spelling every `_EXEMPT`/`_OK` key in this
 * repo uses. */
const FILES = [
  "web/components/deep-link/shape.tsx",
  "web/components/tickets/tickets-collection.tsx",
  "web/components/tickets/triage-chips.tsx",
  "web/components/tickets/triage-queue.tsx",
  "web/components/tickets/help-detail.tsx",
  "web/components/tickets/help-form-dialog.tsx",
  "web/components/work/work-panels.tsx",
  "web/components/work/tasks-screen.tsx",
  "web/components/work/task-sheet.tsx",
  "web/components/work/stories-screen.tsx",
  "web-portal/components/ticket-row.tsx",
  "shared/web/ticket-chips.tsx",
]

/** Whatever a resolved expression's own text names — STATUS, STAGE or
 * WAITING — is a real lifecycle colour (D17); anything else is not. */
const ALLOWED = /status|stage|waiting/i

type Offender = { key: string; rel: string; line: number; text: string }

function enclosingFunctionNode(node: ts.Node): ts.Node | undefined {
  for (let cur: ts.Node | undefined = node; cur; cur = cur.parent) {
    if (ts.isFunctionDeclaration(cur) || ts.isArrowFunction(cur) || ts.isFunctionExpression(cur)) return cur
  }
  return undefined
}

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

/** True when `name` is a parameter of `node`'s own enclosing function, or of
 * any function enclosing THAT one (a closure reads its outer scope's
 * parameters too). This is the "out of reach by construction" test: a value
 * that only exists once a caller supplies it cannot be classified by reading
 * source, the same posture R84 states for a computed `variant`. */
function isParameterName(name: string, node: ts.Node): boolean {
  for (let fn = enclosingFunctionNode(node); fn; fn = enclosingFunctionNode(fn.parent)) {
    if (!ts.isFunctionDeclaration(fn) && !ts.isArrowFunction(fn) && !ts.isFunctionExpression(fn)) continue
    const params = (fn as ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression).parameters
    if (params.some((p) => ts.isIdentifier(p.name) && p.name.text === name)) return true
  }
  return false
}

/** The leftmost identifier of a member/call/binary chain — `home` out of
 * `home?.colour?.(v.value)`, `DOT_TONE_FILL` out of
 * `DOT_TONE_FILL[helpStatusDotTone(s)]`, `colour` out of
 * `colour ?? NEUTRAL_TYPE_COLOUR`. `null` for anything else (a literal, a
 * template string), which this census then reads as a plain, unresolvable
 * expression. */
function rootIdentifierName(expr: ts.Expression): string | null {
  let cur: ts.Expression = expr
  for (;;) {
    if (ts.isParenthesizedExpression(cur)) {
      cur = cur.expression
      continue
    }
    if (ts.isNonNullExpression(cur)) {
      cur = cur.expression
      continue
    }
    if (ts.isPropertyAccessExpression(cur) || ts.isElementAccessExpression(cur) || ts.isCallExpression(cur)) {
      cur = cur.expression
      continue
    }
    if (ts.isBinaryExpression(cur)) {
      cur = cur.left
      continue
    }
    break
  }
  return ts.isIdentifier(cur) ? cur.text : null
}

/** `const <name> = <init>` anywhere inside `scope` — the same shape
 * `resolveLocalJsxRef` (mango-title-only.test.ts) searches for, reused here
 * under its own name because this law lives in its own file. */
function findLocalConstInit(name: string, scope: ts.Node): ts.Expression | null {
  let found: ts.Expression | null = null
  const search = (node: ts.Node): void => {
    if (found) return
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name && node.initializer) {
      found = node.initializer
      return
    }
    ts.forEachChild(node, search)
  }
  search(scope)
  return found
}

/** `"allowed"` (a real status/stage/waiting colour), `"offender"` (a colour
 * keyed to something else), or `"skip"` (the root traces to a function
 * parameter — out of reach by construction). Resolves at most six local
 * `const` hops before giving up and reading whatever text it is holding. */
function classify(initExpr: ts.Expression, fromNode: ts.Node, sf: ts.SourceFile): "allowed" | "offender" | "skip" {
  const scope = enclosingFunctionNode(fromNode) ?? sf
  let expr = initExpr
  for (let depth = 0; depth < 6; depth++) {
    const rootName = rootIdentifierName(expr)
    if (!rootName) break
    if (isParameterName(rootName, fromNode)) return "skip"
    const init = findLocalConstInit(rootName, scope)
    if (!init || init === expr) break
    expr = init
  }
  const text = expr.getText(sf).replace(/\s+/g, " ")
  return ALLOWED.test(text) ? "allowed" : "offender"
}

function jsxTagName(el: ts.JsxElement | ts.JsxSelfClosingElement): string {
  const tag = ts.isJsxElement(el) ? el.openingElement.tagName : el.tagName
  return tag.getText()
}

function findColourAttr(
  opening: ts.JsxOpeningElement | ts.JsxSelfClosingElement,
  attrName: string
): ts.Expression | null {
  const attr = opening.attributes.properties.find(
    (p): p is ts.JsxAttribute => ts.isJsxAttribute(p) && p.name.getText() === attrName
  )
  const init = attr?.initializer
  if (init && ts.isJsxExpression(init) && init.expression) return init.expression
  return null
}

/** Every `<Badge dot={…}>` / `<Swatch colour={…}>` census offender in one
 * already-parsed source file. Exported shape mirrors `mango-title-only
 * .test.ts`'s own `findOffenders`: `key` for `COLOURED_CHIP_OK`, `rel`+`line`
 * for the message, `text` for a human-readable "what this resolved to". */
function findOffendersInFile(sf: ts.SourceFile, rel: string): Offender[] {
  const offenders: Offender[] = []
  const visit = (node: ts.Node): void => {
    const isJsxEl = ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)
    if (isJsxEl) {
      const el = node as ts.JsxElement | ts.JsxSelfClosingElement
      const tag = jsxTagName(el)
      const opening = ts.isJsxElement(el) ? el.openingElement : el
      const expr =
        tag === "Badge"
          ? findColourAttr(opening, "dot")
          : tag === "Swatch"
            ? (findColourAttr(opening, "colour") ?? findColourAttr(opening, "color"))
            : null
      if (expr) {
        const verdict = classify(expr, node, sf)
        if (verdict === "offender") {
          const name = enclosingFunctionName(node, sf)
          offenders.push({
            key: `${rel}#${name}`,
            rel,
            line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
            text: expr.getText(sf).replace(/\s+/g, " "),
          })
        }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return offenders
}

function findOffenders(): Offender[] {
  const offenders: Offender[] = []
  for (const rel of FILES) {
    const abs = join(ROOT, rel)
    const src = stripComments(readFileSync(abs, "utf8"), { keepLength: true })
    const sf = ts.createSourceFile(abs, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    offenders.push(...findOffendersInFile(sf, rel))
  }
  return offenders
}

describe("R86 — the one coloured chip is the record's status", () => {
  it("status-owns-the-chip: no <Badge dot=…>/<Swatch colour=…> in the ticket surfaces keys to a non-status field, or it is named in COLOURED_CHIP_OK", () => {
    const offenders = findOffenders()
    const used = new Set<string>()
    const unexempt: string[] = []
    for (const o of offenders) {
      if (o.key in COLOURED_CHIP_OK) {
        used.add(o.key)
        continue
      }
      unexempt.push(
        `${o.rel}:${o.line} — a coloured chip resolving to "${o.text}", which names neither status, ` +
          `stage nor waiting (key: "${o.key}"). Draw an icon or plain text instead, or name "${o.key}" ` +
          `in COLOURED_CHIP_OK with the real reason.`
      )
    }
    expect(unexempt, unexempt.join("\n")).toEqual([])

    const stale = Object.keys(COLOURED_CHIP_OK).filter((k) => !used.has(k))
    expect(
      stale,
      `these COLOURED_CHIP_OK entries match no offending chip any more — delete them:\n  ${stale.join("\n  ")}`
    ).toEqual([])
  })

  // THE RED PROOF — the exact shape this census exists to catch: today's
  // ticket type colour, before the 17 Sep 2026 fix, over a fixture standing
  // in for a real ticket row.
  it("a ticket type's own colour dot, resolving to neither status nor stage, is exactly what this census flags", () => {
    const before = `
      function ticketTypeCell(w) {
        return (
          <Badge variant="secondary" size="pill">
            <Swatch colour={ticketTypeColour(w.helpType)} />
            {w.helpType ?? "—"}
          </Badge>
        )
      }
    `
    const sf = ts.createSourceFile("ticket-type-cell-before.tsx", before, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const offenders = findOffendersInFile(sf, "ticket-type-cell-before.tsx")
    expect(offenders.length, "the Swatch's colour resolves to ticketTypeColour(w.helpType) — no status/stage/waiting").toBe(1)
    expect(offenders[0].text).toContain("ticketTypeColour")
  })

  // THE GREEN PROOF, same fixture, today's fix: the icon replaces the dot
  // entirely, so there is nothing left for this census to see.
  it("the fixed cell — an icon instead of a colour dot — draws nothing this census can flag", () => {
    const after = `
      function ticketTypeCell(w) {
        const iconName = ticketTypeIconName(w.helpType)
        return (
          <Badge variant="secondary" size="pill">
            {iconName && <Icon name={iconName} className="text-muted-foreground size-3.5 shrink-0" />}
            {w.helpType ?? "—"}
          </Badge>
        )
      }
    `
    const sf = ts.createSourceFile("ticket-type-cell-after.tsx", after, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    expect(findOffendersInFile(sf, "ticket-type-cell-after.tsx")).toEqual([])
  })

  // A GENUINE STATUS DOT, resolved through a local const the way the
  // Choices table's App-stage cell does it (`shapeChoicesTable`) — passes
  // clean without an exemption.
  it("a status dot resolved through a local const passes clean", () => {
    const statusCell = `
      function choiceDetailsCell(v) {
        const tone = appStageDotTone(v.value)
        return tone ? <Badge variant="status" dot={tone}>{v.value}</Badge> : null
      }
    `
    const sf = ts.createSourceFile("status-cell.tsx", statusCell, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    expect(findOffendersInFile(sf, "status-cell.tsx")).toEqual([])
  })

  // A GENERIC, CALLER-SUPPLIED COLOUR — the `ChoiceGroupHome.colour` seam no
  // group wires today — is OUT OF REACH BY CONSTRUCTION: its root traces to
  // a function PARAMETER, so the census cannot know what it will be handed at
  // render and does not guess.
  it("a colour resolved back to a function parameter is out of reach, not an offender", () => {
    const generic = `
      function shapeChoicesTable(values, groupHome) {
        return values.map((v) => {
          const home = groupHome.get(v.type)
          const colour = home?.colour?.(v.value)
          return colour ? <Swatch colour={colour ?? NEUTRAL_TYPE_COLOUR} /> : null
        })
      }
    `
    const sf = ts.createSourceFile("generic-colour.tsx", generic, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    expect(findOffendersInFile(sf, "generic-colour.tsx")).toEqual([])
  })
})
