// @vitest-environment node
//
// A pure source scan: it reads files and parses them, and never touches a DOM.
// The workspace's default environment is jsdom, and standing one up costs a few
// seconds of a worker thread this file has no use for.
//
// ─────────────────────────────────────────────────────────────────────────────
// R67 — A TITLED SECTION STANDS ON PAPER. NOTHING SITS ON THE BARE PAGE GROUND.
// ─────────────────────────────────────────────────────────────────────────────
//
// THE CLIENT, TWICE, IN TWO DAYS, ABOUT TWO DIFFERENT SCREENS.
//
//   2026-09-09, over the Team tab: "more members in each row, too much blank
//   space. needs container!! nothing on top of white background, its a rule!"
//
//   2026-09-10, over Settings › Integrations: "but give it a container. once
//   again, nothing shoudl sit on the white, everything contained! (make this a
//   law)"
//
// "Once again" and "make this a law" are the whole brief. The first one was
// fixed at one screen (web/components/team/team-panel.tsx, which carries the
// measured contrast numbers and the reasoning); the second is the same fault
// one tab over, which is what a fix-at-the-screen always earns.
//
// ── WHAT A CONTAINER IS HERE, AND WHY IT IS DERIVED ─────────────────────────
//
// The kit's own §2.6 settles it: there are TWO paper tones and no third.
// Off-beige `--background` is the PAGE; soft paper `--surface-panel` is the
// PANEL; a card standing on a panel takes the other tone again (`raised`).
// So "contained" is not a class somebody chose, it is a FILL FROM THE PAPER
// FAMILY, and the family is read off `shared/ui/foundations/tokens/tokens.css`
// rather than typed here: every `--surface-*` custom property the kit declares,
// plus whatever each one points AT (`--surface-raised: var(--card)`,
// `--surface-idle: var(--muted)`), MINUS `--surface-page` — which the kit
// defines as `var(--background)` and which is, by its own name, the ground a
// container is meant to stand out from. A fill the kit adds tomorrow is covered
// without editing this file; a token it renames turns the derivation red rather
// than quietly shrinking the census.
//
// ── WHAT A TITLED SECTION IS, AND WHAT WAS DELIBERATELY LEFT OUT ────────────
//
// The subject is a `<section>` element that carries a HEADING of its own — an
// `<h1>`…`<h4>`, the kit's `<Headline>`, or `<CollectionHeading>`. That is the
// smallest unit that is unambiguously "a titled section of content", which is
// exactly what she pointed at both times, and it is a unit the source states
// rather than one a regex infers.
//
// FOUR THINGS ARE DELIBERATELY NOT CONTENT, and each exclusion is a decision
// rather than a convenience:
//
//   · THE TITLE BLOCK. Any child that itself contains the heading — the heading
//     and the create button beside it ride the section's own header row, and a
//     heading is not something that stands ON anything.
//   · PROSE. `<p>`, `<span>`, `<small>`, `<em>`, `<strong>`, `<a>`, `<br>`. A
//     sentence directly under a heading is part of the title block. Every
//     settings section in this app is heading + sentence + control, and boxing
//     the sentence would be a different design, not this rule.
//   · AN OVERLAY. A component whose declaring file renders through a portal
//     (a Radix `.Portal`, a `createPortal`) is not in the section's flow at
//     all — a `<Sheet>` or an `<AlertDialog>` declared inside a section paints
//     on the scrim, not on the page. Derived off the kit's own source, so the
//     next overlay it ships is covered.
//   · AN ACT. A lone `<Button>` (or a component that renders nothing but one)
//     is "Show older", "Ask us something", "Try again" — the same class of
//     thing as the create button in the section's header row, which the title
//     block already lets through. A control is pressed, not read.
//   · ANYTHING `hidden` OR `sr-only`. A file input a button clicks for you
//     draws nothing and cannot sit on anything.
//
// AND THE CLAUSE THAT MAKES THE LAW BITE: containment is asked PER BODY, and a
// ternary's two arms are two bodies. That is the whole reason the section the
// client reported was invisible to every check here — Access tokens drew its
// ROWS inside `bg-surface-panel` and its error, its skeleton and its zero
// straight onto the page, so "does this section have a panel in it anywhere"
// answers yes and describes the wrong screen. She was looking at the branch
// with nothing in it.
//
// A NAIVE VERSION OF THIS LAW ("every screen's root is a panel") was written
// first and thrown away: it is either trivially true or it forbids the shape
// the whole app already uses and the client has already approved — a heading
// OUTSIDE, the content on paper under it, which is what `CollectionFrame`
// draws on every collection screen in the base. Both shapes pass here, and
// they are the same sentence read from either end: either the section is the
// box, or everything the section draws is in one.
//
// ANCESTRY IS READ FROM THE SYNTAX TREE, not from indentation or a window of
// characters (the same move `action-rows-wrap.test.ts` makes beside this file):
// "what is this section standing inside" is a question about the JSX, and the
// compiler is already a dependency here.

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import ts from "typescript"
import { sourceFiles } from "@shared/rules/source-scan"
import { UNCONTAINED_SECTION_OK } from "@shared/rules/registry"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, "..", "..")

/** BOTH FRONT DOORS AND THE CODE THEY SHARE. `shared/web/` is in on purpose:
 * four of the app's settings sections live there and are drawn on both. */
const APP_DIRS = [join(ROOT, "web"), join(ROOT, "web-portal"), join(ROOT, "shared", "web")]
/** The kit, read but never judged — it is a hash-pinned dependency. It is here
 * so a `<Card>` or a `<Skeleton>` can be asked what it paints. */
const KIT_DIR = join(ROOT, "shared", "ui")

const TOKENS = join(ROOT, "shared", "ui", "foundations", "tokens", "tokens.css")

/** THE PAPER FAMILY, off the kit's own tokens. Every `--surface-*` property and
 * every variable one points at; `--surface-page` and `--background` are the
 * GROUND and are the one thing a container is defined against. */
function containerFills(): string[] {
  const css = readFileSync(TOKENS, "utf8")
  const family = new Set<string>()
  const aliasedBy = new Map<string, Set<string>>()
  for (const m of css.matchAll(/^\s*--(surface-[a-z0-9-]+):\s*var\(--([a-z0-9-]+)\)/gm)) {
    family.add(m[1])
    if (!aliasedBy.has(m[2])) aliasedBy.set(m[2], new Set())
    aliasedBy.get(m[2])!.add(m[1])
  }
  // AN ALIAS JOINS THE FAMILY ONLY WHEN MORE THAN ONE SURFACE TOKEN POINTS AT
  // IT, which is the signature of a shared PAPER TONE rather than one control's
  // fill. `--card` qualifies — `--surface-raised` and `--surface-lift` are both
  // it, it is the kit's own raised paper, and 25 places in our source spell
  // `bg-card` for exactly that. `--muted` does NOT: only `--surface-idle` points
  // at it, and idle is a disabled WELL. A section standing on `bg-muted` is
  // standing in a groove, not on a sheet, and counting it would have quietly
  // passed every section that happens to draw one line of inline code.
  for (const [alias, sources] of aliasedBy) if (sources.size > 1) family.add(alias)
  // THE GROUND ITSELF IS NEVER A CONTAINER — that is the whole sentence of the
  // law, and `--surface-page` is `var(--background)` by the kit's own line.
  family.delete("surface-page")
  family.delete("background")
  // `--kw-*` are the RAW ramp underneath the semantic tokens; nothing in the
  // app may name one (R32 forbids it), so they are not spellable fills.
  return [...family].filter((n) => !n.startsWith("kw-")).sort()
}

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

/** Every string literal anywhere inside this element's `className` — so a
 * `cn(...)`, a ternary and a `cva` call are all read, rather than only the
 * plain-string case. */
function classNameOf(node: ts.Node): string {
  const attrs = ts.isJsxElement(node)
    ? node.openingElement.attributes
    : ts.isJsxSelfClosingElement(node)
      ? node.attributes
      : null
  if (!attrs) return ""
  const parts: string[] = []
  for (const a of attrs.properties) {
    if (!ts.isJsxAttribute(a) || a.name.getText() !== "className") continue
    const collect = (n: ts.Node) => {
      if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) parts.push(n.text)
      ts.forEachChild(n, collect)
    }
    if (a.initializer) collect(a.initializer)
  }
  return parts.join(" ")
}

const HEADING = /^(h[1-4]|Headline|CollectionHeading)$/
const PROSE = /^(p|span|small|em|strong|a|br)$/

describe("R67 — a titled section stands on paper", () => {
  const fills = containerFills()
  const FILL = new RegExp(`(^|[\\s:[])bg-(${fills.join("|")})\\b`)

  const app = parse(APP_DIRS)
  const kit = parse([KIT_DIR])
  const all = [...app, ...kit]

  // ── WHAT EACH COMPONENT PAINTS, resolved through the module-scope constants
  // its own file declares. A kit control almost never carries its fill inline:
  // `Skeleton` reads `skeletonVariants`, which is `cva(PULSE, …)`, which is
  // where `bg-surface-quiet` actually lives. Resolving one hop would call it
  // unpainted and report a false offender, so the walk is transitive over the
  // file's own top-level declarations until it stops growing.
  const declText = new Map<string, { text: string; rel: string }>()
  const fileTop = new Map<string, Map<string, string>>()
  for (const f of all) {
    const tops = new Map<string, string>()
    for (const st of f.tree.statements) {
      if (ts.isVariableStatement(st))
        for (const d of st.declarationList.declarations)
          if (ts.isIdentifier(d.name)) tops.set(d.name.text, d.getText())
      if (ts.isFunctionDeclaration(st) && st.name) tops.set(st.name.text, st.getText())
    }
    fileTop.set(f.rel, tops)
    for (const [name, text] of tops)
      if (/^[A-Z]/.test(name) && !declText.has(name)) declText.set(name, { text, rel: f.rel })
  }

  const paintCache = new Map<string, boolean>()
  function componentPaints(name: string): boolean {
    const cached = paintCache.get(name)
    if (cached !== undefined) return cached
    paintCache.set(name, false) // recursion guard
    const d = declText.get(name)
    if (!d) return false
    const tops = fileTop.get(d.rel) ?? new Map<string, string>()
    let text = d.text
    const seen = new Set([name])
    for (let hop = 0; hop < 8; hop++) {
      let grew = false
      for (const [k, v] of tops) {
        if (seen.has(k)) continue
        if (new RegExp(`\\b${k}\\b`).test(text)) {
          seen.add(k)
          text += `\n${v}`
          grew = true
        }
      }
      if (!grew) break
    }
    // …AND ONLY THROUGH ITS OWN CLASSES. The walk deliberately does NOT follow
    // the components this one RENDERS. That version was written and thrown
    // away: `CollectionEmptyState` renders a headline, a sentence and a button,
    // one of which resolves to a fill two files away, so every uncontained zero
    // register in the app came back green — and an uncontained zero register is
    // precisely what the client reported. A rule that cannot catch the bug it
    // was written for is not a weaker rule, it is a different one.
    const hit = FILL.test(text)
    paintCache.set(name, hit)
    return hit
  }

  /** An overlay does not stand on the page — it stands on the scrim. Derived
   * in two steps, because almost nothing names a portal itself: a component
   * whose DECLARING FILE renders through one is an overlay, and so is a
   * component that renders an overlay. `<AddLinkDialog>` is a
   * `<FormShellDialog>` is a kit `<Sheet>` is a Radix portal — three files, and
   * stopping at the first would have reported a slide-in form as content lying
   * on the page. */
  const portalFile = new Map<string, boolean>()
  for (const f of all)
    portalFile.set(f.rel, /\.Portal\b|<[A-Za-z]*Portal\b|createPortal\(/.test(readFileSync(f.path, "utf8")))
  const overlayCache = new Map<string, boolean>()
  function isOverlay(name: string): boolean {
    const cached = overlayCache.get(name)
    if (cached !== undefined) return cached
    overlayCache.set(name, false) // recursion guard
    const d = declText.get(name)
    if (!d) return false
    let hit = portalFile.get(d.rel) === true
    if (!hit)
      for (const m of d.text.matchAll(/<([A-Z][A-Za-z0-9]*)\b/g))
        if (m[1] !== name && isOverlay(m[1])) {
          hit = true
          break
        }
    overlayCache.set(name, hit)
    return hit
  }

  /** …AND AN ACT IS NOT CONTENT EITHER. A lone `<Button>` under a heading is
   * "Show older" or "Ask us something" — the same class of thing as the create
   * button in the section's header row, which the title-block exclusion already
   * lets through. A control is pressed, not read; it is not a body of content
   * that could be said to sit on anything. Derived by resolving the tag to the
   * kit's own `Button`, so a wrapper around one counts too. */
  const actCache = new Map<string, boolean>()
  function isAct(name: string): boolean {
    if (name === "Button") return true
    const cached = actCache.get(name)
    if (cached !== undefined) return cached
    actCache.set(name, false)
    const d = declText.get(name)
    if (!d) return false
    const roots = [...d.text.matchAll(/<([A-Z][A-Za-z0-9]*)\b/g)].map((m) => m[1])
    const hit = roots.length > 0 && roots.every((r) => r === name || isAct(r))
    actCache.set(name, hit)
    return hit
  }

  const paints = (n: ts.Node): boolean => {
    if (FILL.test(classNameOf(n))) return true
    const t = tagName(n)
    return !!t && /^[A-Z]/.test(t) && componentPaints(t.split(".")[0])
  }
  const subtreePaints = (n: ts.Node): boolean => {
    let hit = false
    const walk = (x: ts.Node) => {
      if (hit) return
      if ((ts.isJsxElement(x) || ts.isJsxSelfClosingElement(x)) && paints(x)) {
        hit = true
        return
      }
      ts.forEachChild(x, walk)
    }
    walk(n)
    return hit
  }
  const carriesHeading = (n: ts.Node): boolean => {
    let hit = false
    const walk = (x: ts.Node) => {
      const t = tagName(x)
      if (t && HEADING.test(t)) hit = true
      ts.forEachChild(x, walk)
    }
    walk(n)
    return hit
  }

  /** THE BODIES A SECTION ACTUALLY DRAWS — one per BRANCH, which is the clause
   * with the teeth. A ternary's two arms, a `&&`'s right-hand side and a
   * `.map()`'s row are each their own body, so a section cannot pass on the
   * strength of the one branch that happens to have a panel in it. */
  function bodies(node: ts.JsxElement): ts.Node[] {
    const out: ts.Node[] = []
    const fromChild = (n: ts.Node) => {
      if (ts.isJsxText(n)) return
      if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n)) {
        out.push(n)
        return
      }
      if (ts.isJsxFragment(n)) {
        for (const c of n.children) fromChild(c)
        return
      }
      if (ts.isJsxExpression(n) && n.expression) fromExpr(n.expression)
    }
    const fromExpr = (e: ts.Expression) => {
      if (ts.isParenthesizedExpression(e)) return fromExpr(e.expression)
      if (ts.isConditionalExpression(e)) {
        fromExpr(e.whenTrue)
        fromExpr(e.whenFalse)
        return
      }
      if (
        ts.isBinaryExpression(e) &&
        [
          ts.SyntaxKind.AmpersandAmpersandToken,
          ts.SyntaxKind.BarBarToken,
          ts.SyntaxKind.QuestionQuestionToken,
        ].includes(e.operatorToken.kind)
      ) {
        fromExpr(e.left)
        fromExpr(e.right)
        return
      }
      if (ts.isJsxElement(e) || ts.isJsxSelfClosingElement(e)) {
        out.push(e)
        return
      }
      if (ts.isJsxFragment(e)) {
        for (const c of e.children) fromChild(c)
        return
      }
      if (ts.isCallExpression(e)) {
        for (const a of e.arguments) {
          if (!ts.isArrowFunction(a) && !ts.isFunctionExpression(a)) continue
          const b = a.body
          if (ts.isBlock(b)) {
            const walk = (x: ts.Node) => {
              if (ts.isReturnStatement(x) && x.expression) fromExpr(x.expression)
              ts.forEachChild(x, walk)
            }
            walk(b)
          } else fromExpr(b)
        }
      }
    }
    for (const c of node.children) fromChild(c)
    return out
  }

  type Finding = { where: string; bare: string[] }
  const titled: Finding[] = []

  for (const f of app) {
    const visit = (node: ts.Node) => {
      if (ts.isJsxElement(node) && tagName(node) === "section" && carriesHeading(node)) {
        const where = `${f.rel}:${f.tree.getLineAndCharacterOfPosition(node.getStart()).line + 1}`
        // (a) the team-panel shape — the section IS the box, or stands in one.
        let boxed = false
        for (let p: ts.Node | undefined = node; p && !boxed; p = p.parent)
          if ((ts.isJsxElement(p) || ts.isJsxSelfClosingElement(p)) && paints(p)) boxed = true
        // (b) the CollectionFrame shape — heading outside, every body on paper.
        const bare: string[] = []
        if (!boxed)
          for (const b of bodies(node)) {
            const t = tagName(b)
            if (carriesHeading(b)) continue
            if (t && PROSE.test(t)) continue
            if (t && /^[A-Z]/.test(t) && isOverlay(t.split(".")[0])) continue
            if (t && /^[A-Z]/.test(t) && isAct(t.split(".")[0])) continue
            if (/(^|\s)(hidden|sr-only)(\s|$)/.test(classNameOf(b))) continue
            if (subtreePaints(b)) continue
            bare.push(`<${t}> at line ${f.tree.getLineAndCharacterOfPosition(b.getStart()).line + 1}`)
          }
        titled.push({ where, bare })
      }
      ts.forEachChild(node, visit)
    }
    visit(f.tree)
  }

  // ── THE BLINDNESS TRIPWIRE ────────────────────────────────────────────────
  // Three ways this check could report a clean app while measuring nothing: the
  // token derivation could come back empty (every fill unspellable, so every
  // section "uncontained" — or, with an empty alternation, every string a
  // match); the walk could find no files; the heading census could find no
  // sections at all. Each fails LOUDLY here rather than passing quietly, which
  // is the failure mode this repository keeps re-earning.
  it("the census measures something (a blind scan reports all clear exactly like a passing one)", () => {
    expect(fills.length, "no container fill was derived from the kit's tokens — the paper family moved").toBeGreaterThan(5)
    expect(fills, "the ground is not a container and must never be in the derived family").not.toContain("surface-page")
    expect(fills, "the ground is not a container and must never be in the derived family").not.toContain("background")
    expect(app.length, "the front-door walk found nothing").toBeGreaterThan(150)
    expect(kit.length, "the kit walk found nothing — nothing could be asked what it paints").toBeGreaterThan(50)
    expect(titled.length, "no titled <section> was found on either front door — the census has gone blind").toBeGreaterThan(20)
    // …and the two shapes are both really represented, so a rule that only ever
    // sees one of them is not silently enforcing half of itself.
    expect(titled.filter((s) => s.bare.length === 0).length, "no section passes — the definition has drifted").toBeGreaterThan(10)
  })

  it("sections-stand-on-paper: every titled section is contained, or says why not (R67)", () => {
    const offenders = titled.filter((s) => s.bare.length > 0)
    const unexplained = offenders.filter((s) => !(s.where.split(":")[0] in UNCONTAINED_SECTION_OK))
    expect(
      unexplained.map((s) => `${s.where} — on the bare page ground: ${s.bare.join(", ")}`),
      "R67 — a titled section either IS a container or draws every one of its bodies inside one. " +
        "Put the section's content on `--surface-panel` (the shape `CollectionFrame` and " +
        "`web/components/team/team-panel.tsx` both use), or name the file in " +
        "UNCONTAINED_SECTION_OK with the real reason:"
    ).toEqual([])

    // ROT-CHECKED, so the list can only shrink: a file whose sections are all
    // contained now must lose its line rather than keep a pin nobody re-reads.
    const claimed = new Set(offenders.map((s) => s.where.split(":")[0]))
    const stale = Object.keys(UNCONTAINED_SECTION_OK).filter((k) => !claimed.has(k))
    expect(
      stale,
      "these UNCONTAINED_SECTION_OK entries match nothing any more — the sections are contained, so delete the entry:"
    ).toEqual([])
  })
})
