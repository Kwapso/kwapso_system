// R103, EMPTY-REGISTER-ON-THE-PAGE. Read at UI-RULEBOOK.md L43, from her
// "Her answers on the minimal fixes" round, 22 Sep 2026 (item 2, over the
// empty-collection screenshot): "ok, but need a bit more spacing over it
// (like it was with the card)", read together with the standing 21/22 Sep
// no-containers ruling (R67, `sections-stand-on-paper`) and R62's own
// two-zero register (`CollectionEmptyState` on the agency door, `PortalEmpty`
// on the portal). An empty or filtered-empty register draws no card and no
// paper fill of its own: text sits directly on the page ground, the same
// 24px (`--space-6`) top inset both registers already carry, with its one
// door in (R88's single-door law) beside it, never a second box painted
// around it.
//
// THE CENSUS, OFF THE DISK, over web/components, web-portal/components and
// shared/web/screen-engine: every `<CollectionEmptyState`/`<PortalEmpty`
// mount is found, and its ancestor JSX chain (walking every real element up
// to the file's own root, not just the nearest one, since a stray wrapper
// between two painted boxes should not hide the outer one) is read for two
// shapes this law forbids: a `<Card>` ancestor that is NOT `variant="plain"`
// (the kit's own default variant paints `bg-surface-panel`, `shared/ui/
// components/card/card.tsx`), and any ancestor element whose own `className`
// carries a literal `bg-surface-panel`/`bg-card` fill. `<EmptyGatedPanel>` is
// censused directly rather than through an ancestor walk: its own `surface`
// prop defaults to `"plain"` (R88's own shell, `web/components/deep-link/
// screen-bits.tsx`) so a call site has to say `surface="boxed"` on purpose to
// paint the branch this law forbids, which is the "painted EmptyGatedPanel
// branch" the law names.
//
// A LANE WORKING THE SAME FILES IN PARALLEL. Two of the historically worst
// offenders, the apps Stakeholders panel and the portal's own empty
// register, are owned by another lane fixing empty registers live this
// session; this census reports whatever it finds there rather than adding an
// exemption for it, because an exemption written against a file mid-edit
// would rot the moment that lane's fix lands. `EMPTY_REGISTER_EXEMPT`
// (`shared/rules/registry.ts`) is for a genuinely different shape, a card
// that stands for something other than an empty register and merely happens
// to sit near one, never a parked violation waiting on someone else's fix.

import { join } from "node:path"
import { describe, expect, it } from "vitest"
import ts from "typescript"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"
import { EMPTY_REGISTER_EXEMPT } from "@shared/rules/registry"

const ROOT = join(import.meta.dirname, "..", "..")

const ROOTS = [
  join(ROOT, "web", "components"),
  join(ROOT, "web-portal", "components"),
  join(ROOT, "shared", "web", "screen-engine"),
]

const REGISTER_TAGS = new Set(["CollectionEmptyState", "PortalEmpty"])

type Offender = { rel: string; line: number; expression: string; why: string }

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

/** The raw source text of a `className` attribute's own value, string literal
 * or not (`cn(...)`, a ternary), read as TEXT, because a fill class buried
 * inside a `cn()` call is still a fill class a reader would see. */
function classText(node: ts.Node): string {
  const attrs = attributesOf(node)
  if (!attrs) return ""
  for (const p of attrs.properties) {
    if (!ts.isJsxAttribute(p) || p.name.getText() !== "className" || !p.initializer) continue
    return p.initializer.getText()
  }
  return ""
}

/** Every real JSX ancestor element (self-closing or not) from `node` up to
 * the file's own root, walking THROUGH `{…}` expressions, ternaries and
 * fragments, never stopping at the first one, because a painted box two
 * levels up is still a painted box. */
function ancestorElements(node: ts.Node): ts.Node[] {
  const out: ts.Node[] = []
  let cur: ts.Node | undefined = node.parent
  while (cur) {
    if (ts.isJsxElement(cur) || ts.isJsxSelfClosingElement(cur)) out.push(cur)
    cur = cur.parent
  }
  return out
}

const FILL_CLASS = /\bbg-(surface-panel|card)\b/

function findOffenders(): Offender[] {
  const offenders: Offender[] = []
  for (const f of sourceFiles(ROOTS, { extensions: [".tsx", ".ts"], relativeTo: ROOT, skipTests: true })) {
    if (!/CollectionEmptyState|PortalEmpty|EmptyGatedPanel/.test(f.source)) continue
    const src = stripComments(f.source, { keepLength: true })
    const sf = ts.createSourceFile(f.path, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const lineOf = (node: ts.Node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1

    const visit = (node: ts.Node): void => {
      const name = tagName(node)
      if (name && REGISTER_TAGS.has(name)) {
        for (const anc of ancestorElements(node)) {
          const ancName = tagName(anc)
          if (ancName === "Card") {
            const variant = stringAttr(anc, "variant")
            if (variant === undefined || variant === "default") {
              offenders.push({
                rel: f.rel,
                line: lineOf(node),
                expression: `<${name}> inside <Card${variant ? ` variant="${variant}"` : ""}>`,
                why: "a Card default (or no variant at all) paints bg-surface-panel around the empty register",
              })
              break
            }
            continue
          }
          if (FILL_CLASS.test(classText(anc))) {
            offenders.push({
              rel: f.rel,
              line: lineOf(node),
              expression: `<${name}> inside a ${ancName ?? "tag"} carrying ${FILL_CLASS.exec(classText(anc))?.[0]}`,
              why: "a literal bg-surface-panel/bg-card fill wraps the empty register",
            })
            break
          }
        }
      }
      if (name === "EmptyGatedPanel" && stringAttr(node, "surface") === "boxed") {
        offenders.push({
          rel: f.rel,
          line: lineOf(node),
          expression: `<EmptyGatedPanel surface="boxed">`,
          why: 'EmptyGatedPanel defaults to "plain"; surface="boxed" paints the branch on purpose',
        })
      }
      ts.forEachChild(node, visit)
    }
    visit(sf)
  }
  return offenders
}

function excused(rel: string, expression: string) {
  return EMPTY_REGISTER_EXEMPT.find((e) => e.file === rel && expression.includes(e.expression))
}

describe("R103, empty-register-on-the-page", () => {
  it("no empty/filtered-empty register sits inside a painted Card, a bg-surface-panel/bg-card box, or a boxed EmptyGatedPanel branch, unnamed", () => {
    const found = findOffenders()
    const unexempt = found.filter((f) => !excused(f.rel, f.expression))
    expect(
      unexempt,
      "an empty register must stand on the page ground, no card, no paper fill. Drop the wrapper, switch the " +
        "Card to variant=\"plain\", or drop surface=\"boxed\". Otherwise name it in EMPTY_REGISTER_EXEMPT with the " +
        "reason (never for a file another lane is mid-fixing):\n  " +
        unexempt.map((f) => `${f.rel}:${f.line}  ${f.expression}`).join("\n  ")
    ).toEqual([])
  })

  it("EMPTY_REGISTER_EXEMPT names only real, still-open findings", () => {
    const found = findOffenders()
    const stale = EMPTY_REGISTER_EXEMPT.filter(
      (e) => !found.some((f) => f.rel === e.file && f.expression.includes(e.expression))
    )
    expect(
      stale,
      "these EMPTY_REGISTER_EXEMPT entries no longer match a real finding. Fixed, or the source moved on, " +
        "delete the entry:\n  " + stale.map((e) => `${e.file}  ${e.expression}`).join("\n  ")
    ).toEqual([])
  })
})
