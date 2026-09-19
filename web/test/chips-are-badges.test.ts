// EVERY CHIP/PILL IN THE APP IS THE KIT'S Badge — CLIENT RULING, 18 SEP 2026,
// VERBATIM: "on ticket list views, its missing the space between icon and
// name and the backgorund card. always, make it a rule, for everythng
// wether its a dot or an icno, for all chips / pills."
//
// Badge (`shared/ui/components/badge/badge.tsx`) now spends
// `LEADING_MARK_GAP` (`gap-2`) unconditionally and always carries a real
// fill — the two things the ruling asked for — and its own `icon` prop
// (v1.2.118) gives a leading glyph the same formal slot `dot` already had.
// That fixes every FUTURE badge automatically. It does nothing for a call
// site that either (a) never used Badge at all — a hand-rolled
// `<span className="inline-flex … rounded-pill …">` carrying an icon and a
// label — or (b) used Badge but handed the glyph in as a bare JSX CHILD
// beside the label (the exact shape `badge.tsx`'s own header names as the
// bug: "the ticket-type chip … hands an icon element in as a plain CHILD
// beside the label text, never through the `dot` prop"). Neither shape is
// caught by the kit fix, because neither one asks the kit for anything.
//
// THREE CENSUSES, ONE REGISTRY:
//
//   A · AN AD-HOC CHIP — a `<span>`/`<div>` outside Badge, carrying both an
//       icon-shaped element and a label, styled as a pill
//       (`inline-flex … rounded-pill|rounded-full`). This is a call site
//       that never reached for the kit at all.
//   B · AN ICON HANDED TO Badge AS A PLAIN CHILD — `<Badge>{Icon}{label}
//       </Badge>` instead of `<Badge icon={Icon}>{label}</Badge>`. This is
//       a call site that reached for the kit and then re-invented the one
//       thing it already does for a caller.
//   C · A STATUS/TYPE FIELD DRAWN BARE IN A PREVIEW ROW — Aurora's ruling,
//       19 Sep 2026, verbatim, over the ticket detail's Related stories
//       card: "chips and pills always must have the background card or
//       shape wherever they are. In this case, I'm talking inside
//       ticket-related stories. The type of ticket and the status need the
//       card to have a background." Check A/B only ever look at something
//       ALREADY chip-shaped (a pill wrapper, or a Badge). This check closes
//       the case check A and B both miss by construction — a compact
//       "preview row" (a `.map()` callback rendering one record among many,
//       the shape every related-record panel, board card and search result
//       row uses) that draws a status/type FIELD as bare JSX text with no
//       chip wrapper at all, often folded through a label map first
//       (`{t(STORY_STATUS_LABEL[s.status])}`). Matched on the raw text of
//       the JSX expression, the same "read the source" posture
//       `classAttrText` already takes for check A, because the field access
//       usually sits a call or two beneath the label map rather than bare.
//       Narrow field list on purpose — `status`, `storyType`, `ticketType`/
//       `helpType` and `stage` are the app's closed status/type vocabularies
//       (D17, R86); `type` alone is too common a word elsewhere in this
//       codebase (event types, source types, import types) to key on
//       without drowning in unrelated hits.
//
// All three are offenders under the same rule and share one exemption list
// (`CHIP_BADGE_EXEMPT`, `shared/rules/registry.ts`) — a reasoned entry is
// for a NON-CHIP the census cannot tell apart from one by shape alone (a
// selection control, a toolbar pill, or — check C's own case — a real table
// cell whose column IS the status/type word sitting beside its own dot
// rather than a chip; UI-RULEBOOK.md's "the dot reaches every status/stage
// picker and every list cell" ruling asks that cell for a DOT, never a
// pill), never for a chip that is merely inconvenient to convert.
//
// SCOPE — `web/components/**`, `web-portal/**`, `shared/web/**`, the same
// three roots `motion-is-the-kits.test.ts` walks for the identical reason:
// `shared/ui/` is the kit itself (hash-pinned, its own repo lints it) and is
// never walked by a law that exists to hold callers to it.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import ts from "typescript"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"
import { CHIP_BADGE_EXEMPT } from "@shared/rules/registry"

const ROOT = join(import.meta.dirname, "..", "..")

const ROOTS = [
  join(ROOT, "web", "components"),
  join(ROOT, "web-portal"),
  join(ROOT, "shared", "web"),
]

/** An icon-shaped JSX tag — the kit's own `Icon` (`shared/web/screen-engine/
 * icon.tsx`, resolves a Phosphor name at runtime) or a local resolver named
 * the same way every one of these is named in this codebase (`storyType
 * Chip`'s own `iconComponent()` result, `SprintTypeGlyph`, a future
 * `*Glyph`). Deliberately narrow: `RecordMark`, `AppMark`, `InAppLink`,
 * `RecordRef`, `Badge` itself and every other capitalised component this
 * app draws inside a chip-shaped wrapper are NOT icons, and a census that
 * flagged every capitalised child would need an exemption for each of
 * them — false generality is not the same law as this one. */
const ICON_TAG = /^(Icon|[A-Za-z]*Glyph)$/

/** Check C's closed field list — see the file header for why it stays
 * narrow. Matched against the raw text of a JSX expression, so it finds the
 * property access whether it sits bare (`s.status`) or a call or two
 * underneath a label map (`t(STORY_STATUS_LABEL[s.status])`). */
const ROW_FIELD_ACCESS = /\.(status|storyType|ticketType|helpType|stage)\b/i

/** Tags that take a status/type field out of check C's reach — a real chip
 * (`Badge`, already governed), a selection control (`select`/`option`, a
 * different law entirely) or a genuine table cell (`td`, the ruling's own
 * named exception: a list/table CELL shows the word beside its dot, never a
 * pill — UI-RULEBOOK.md, "the dot reaches every status/stage picker and
 * every list cell"). */
const ROW_FIELD_EXEMPT_ANCESTOR = ["Badge", "select", "option"]

type Offender = { key: string; rel: string; line: number; kind: "A" | "B" | "C"; detail: string }

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

function tagName(opening: ts.JsxOpeningElement | ts.JsxSelfClosingElement): string {
  return opening.tagName.getText()
}

/** The raw source text of a JSX attribute's value — a plain string literal,
 * a template string, or a `cn(...)` call alike. This census only needs to
 * know what CLASSES a wrapper carries, never how it computed them, so
 * reading the attribute's own text (rather than evaluating it) is the same
 * "read the source, not run it" posture every other structural census here
 * takes. */
function classAttrText(opening: ts.JsxOpeningElement | ts.JsxSelfClosingElement, sf: ts.SourceFile): string {
  const attr = opening.attributes.properties.find(
    (p): p is ts.JsxAttribute => ts.isJsxAttribute(p) && p.name.getText() === "className",
  )
  if (!attr?.initializer) return ""
  return attr.initializer.getText(sf)
}

/** A JSX child that is neither an icon element nor pure whitespace text —
 * the "and a label" half of "an icon and a label". A JSX expression
 * (`{value}`, `{count}`) counts: it is the shape every one of the real
 * offenders this law fixed uses for its own label. */
function isIconChild(child: ts.JsxChild): boolean {
  if (ts.isJsxElement(child)) return ICON_TAG.test(tagName(child.openingElement))
  if (ts.isJsxSelfClosingElement(child)) return ICON_TAG.test(tagName(child))
  return false
}

function isBlankText(child: ts.JsxChild): boolean {
  return ts.isJsxText(child) && child.text.trim() === ""
}

/** True when `fn` is the callback argument of a `.map(` call — the shape
 * every "preview row" (a related-record panel, a board card, a search
 * result) renders through: one function, called once per record. */
function isMapCallback(fn: ts.Node): boolean {
  const parent = fn.parent
  return (
    !!parent &&
    ts.isCallExpression(parent) &&
    ts.isPropertyAccessExpression(parent.expression) &&
    parent.expression.name.text === "map" &&
    parent.arguments[0] === fn
  )
}

/** Walks up from `node` to see whether it sits inside a `.map()` row
 * renderer at all — check C's scope. A record's own DETAIL head (never
 * mapped, always one record) is out of reach by construction; that shape is
 * `status-owns-the-chip.test.ts`'s territory, not this one's. */
function isInsideRowRenderer(node: ts.Node): boolean {
  for (let cur: ts.Node | undefined = node; cur; cur = cur.parent) {
    if ((ts.isArrowFunction(cur) || ts.isFunctionExpression(cur)) && isMapCallback(cur)) return true
  }
  return false
}

/** Walks up from `node` for the nearest enclosing JSX element carrying one
 * of `tags` — used both for check C's exempt ancestors (`Badge`, a
 * selection control) and for the genuine-table-cell carve-out (`td`). */
function isInsideTag(node: ts.Node, tags: string[]): boolean {
  for (let cur: ts.Node | undefined = node; cur; cur = cur.parent) {
    if (ts.isJsxElement(cur) && tags.includes(tagName(cur.openingElement))) return true
  }
  return false
}

/** True when `node` itself renders JSX somewhere beneath it. Check C reads
 * the OUTER JsxExpression wrapping a field access, and a big conditional
 * (`cond ? (<Badge>…</Badge>) : (<span>…</span>)`) or an inline `.map(…)`
 * matches the field regex on its own full text while the actual chip (or
 * lack of one) lives on a NESTED JsxExpression a few levels down — one the
 * same walk visits independently, because `ts.forEachChild` still recurses
 * into whatever this node returns false for. Flagging the outer wrapper too
 * would double-report the exact same offender, or worse, flag a wrapper
 * that already renders a real Badge inside it. */
function containsJsx(node: ts.Node): boolean {
  if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) return true
  let found = false
  node.forEachChild((child) => {
    if (found) return
    if (containsJsx(child)) found = true
  })
  return found
}

/** True when `expr` is a call to some OTHER named helper — `ticketStatusCell
 * (ticket.status, t)`, the shape `work-panels.tsx`'s own status cell
 * already uses. A call site handing a field to a function it did not write
 * inline has delegated the rendering decision entirely; if that helper
 * draws a bare status/type field, the same walk finds it at the helper's
 * OWN definition site instead (still inside `web/components` and `shared/
 * web`, so nothing is hidden by delegating twice). Only `t(...)`, this
 * app's translate call, is trusted to wrap a field directly, because that
 * is the exact shape most of the app's own status labels already take
 * (`t(STORY_STATUS_LABEL[s.status])`) and a translate call renders nothing
 * on its own. */
function isOpaqueHelperCall(expr: ts.Expression): boolean {
  return ts.isCallExpression(expr) && ts.isIdentifier(expr.expression) && expr.expression.text !== "t"
}

function findOffendersInFile(sf: ts.SourceFile, rel: string): Offender[] {
  const offenders: Offender[] = []

  const visit = (node: ts.Node): void => {
    // ── CHECK A — an ad-hoc pill wrapper, never Badge at all ──────────────
    if (ts.isJsxElement(node)) {
      const tag = tagName(node.openingElement)
      if (tag === "span" || tag === "div") {
        const cls = classAttrText(node.openingElement, sf)
        if (/inline-flex/.test(cls) && /rounded-pill|rounded-full/.test(cls)) {
          const kids = node.children.filter((c) => !isBlankText(c))
          const hasIcon = kids.some(isIconChild)
          const hasLabel = kids.some((c) => !isIconChild(c))
          if (hasIcon && hasLabel) {
            offenders.push({
              key: `${rel}#${enclosingFunctionName(node, sf)}`,
              rel,
              line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
              kind: "A",
              detail: `a hand-rolled <${tag}> pill (className carries "inline-flex" and a rounded-pill/rounded-full` +
                ` fill) draws an icon beside a label — this is a Badge the call site never reached for`,
            })
          }
        }
      }

      // ── CHECK B — Badge, but the icon rides a plain child ────────────────
      if (tag === "Badge") {
        const kids = node.children.filter((c) => !isBlankText(c))
        const iconKid = kids.find(isIconChild)
        if (iconKid) {
          offenders.push({
            key: `${rel}#${enclosingFunctionName(node, sf)}`,
            rel,
            line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
            kind: "B",
            detail:
              `<Badge> draws its glyph as a plain JSX child instead of through the \`icon\` prop — the leading-mark` +
              ` gap and the fill both apply automatically either way, but a bare child is the exact shape badge.tsx's` +
              ` own header names as the bug this ruling closes`,
          })
        }
      }
    }

    // ── CHECK C — a status/type field drawn bare in a preview row ────────
    if (
      ts.isJsxExpression(node) &&
      node.expression &&
      node.parent &&
      (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))
    ) {
      const text = node.expression.getText(sf)
      if (
        ROW_FIELD_ACCESS.test(text) &&
        isInsideRowRenderer(node) &&
        !isInsideTag(node, ROW_FIELD_EXEMPT_ANCESTOR) &&
        !isInsideTag(node, ["td"]) &&
        !containsJsx(node.expression) &&
        !isOpaqueHelperCall(node.expression)
      ) {
        offenders.push({
          key: `${rel}#${enclosingFunctionName(node, sf)}`,
          rel,
          line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
          kind: "C",
          detail:
            `a status/type field ("${text.trim()}") renders bare in a preview row, with no <Badge> around it — ` +
            `every chip carries the kit's fill (Aurora, 19 Sep 2026: "chips and pills always must have the ` +
            `background card or shape wherever they are ... the type of ticket and the status need the card to ` +
            `have a background")`,
        })
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sf)
  return offenders
}

function findOffenders(): { offenders: Offender[]; fileCount: number } {
  const files = sourceFiles(ROOTS, { extensions: [".tsx", ".ts"], skipTests: true, relativeTo: ROOT })
  const offenders: Offender[] = []
  for (const file of files) {
    // Comments are not code — a doc comment describing the OLD shape (several
    // of this ruling's own fixes quote what they replaced) must not read as a
    // live offender.
    const stripped = stripComments(file.source, { keepLength: true })
    const sf = ts.createSourceFile(file.path, stripped, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    offenders.push(...findOffendersInFile(sf, file.rel))
  }
  return { offenders, fileCount: files.length }
}

describe("every chip/pill is the kit's Badge (client ruling, 18 Sep 2026)", () => {
  it("no ad-hoc pill wrapper and no Badge with a plain-child icon, or it is named in CHIP_BADGE_EXEMPT", () => {
    const { offenders, fileCount } = findOffenders()
    // THE BLINDNESS TRIPWIRE — the same shape motion-is-the-kits.test.ts
    // carries for the identical three roots: a census over an empty walk
    // reports "clean" in the same words as a census over a real one.
    expect(
      fileCount,
      `only ${fileCount} files were walked under web/components, web-portal and shared/web — a root has moved ` +
        "and this census is looking at nothing",
    ).toBeGreaterThan(150)

    const used = new Set<string>()
    const unexempt: string[] = []
    for (const o of offenders) {
      if (o.key in CHIP_BADGE_EXEMPT) {
        used.add(o.key)
        continue
      }
      unexempt.push(`${o.rel}:${o.line} [check ${o.kind}] — ${o.detail} (key: "${o.key}").`)
    }
    expect(
      unexempt,
      unexempt.join("\n") +
        '\n\nRoute it through <Badge icon={<Icon .../>}>label</Badge>, or name the key above in ' +
        "CHIP_BADGE_EXEMPT (shared/rules/registry.ts) with the real reason — a selection control, a toolbar " +
        "pill, or (check C only) a genuine table cell whose column IS the status word beside its own dot — " +
        "never a chip that is merely inconvenient to convert.",
    ).toEqual([])

    const stale = Object.keys(CHIP_BADGE_EXEMPT).filter((k) => !used.has(k))
    expect(
      stale,
      `these CHIP_BADGE_EXEMPT entries match no offending chip any more — delete them:\n  ${stale.join("\n  ")}`,
    ).toEqual([])
  })

  // THE RED PROOF — check A, the shape the ticket type cell drew before this
  // ruling: a hand-rolled pill, never Badge.
  it("check A catches a hand-rolled icon+label pill that never reaches for Badge", () => {
    const before = `
      function typeCell(w) {
        return (
          <span className="inline-flex items-center gap-2 rounded-pill bg-secondary px-3 py-1">
            <Icon name={ticketTypeIconName(w.helpType)} className="size-3.5" />
            {w.helpType ?? "—"}
          </span>
        )
      }
    `
    const sf = ts.createSourceFile("fixture-a-before.tsx", before, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const offenders = findOffendersInFile(sf, "fixture-a-before.tsx")
    expect(offenders.length).toBe(1)
    expect(offenders[0].kind).toBe("A")
  })

  // THE RED PROOF — check B, the shape `tickets-collection.tsx`'s type cell
  // and `shared/web/ticket-chips.tsx`'s own type chip actually drew until
  // this ruling: a real Badge, icon as a bare child.
  it("check B catches a Badge whose icon rides a plain child instead of the `icon` prop", () => {
    const before = `
      function typeCell(w) {
        return (
          <Badge variant="secondary" size="pill">
            <Icon name={ticketTypeIconName(w.helpType)} className="size-3.5" />
            {w.helpType ?? "—"}
          </Badge>
        )
      }
    `
    const sf = ts.createSourceFile("fixture-b-before.tsx", before, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const offenders = findOffendersInFile(sf, "fixture-b-before.tsx")
    expect(offenders.length).toBe(1)
    expect(offenders[0].kind).toBe("B")
  })

  // THE RED PROOF — check C, the shape the ticket detail's Related stories
  // panel drew before Aurora's 19 Sep 2026 ruling: a preview row mapped over
  // stories, its status folded through a label map and dropped in bare —
  // no Badge, no fill, no card.
  it("check C catches a status/type field drawn bare in a preview row's markup", () => {
    const before = `
      function relatedStories(list) {
        return (
          <ul>
            {list.map((s) => (
              <li key={s.id}>
                <span>{s.title}</span>
                <span>{s.storyType ?? "—"}</span>
                <span>{t(STORY_STATUS_LABEL[s.status])}</span>
              </li>
            ))}
          </ul>
        )
      }
    `
    const sf = ts.createSourceFile("fixture-c-before.tsx", before, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const offenders = findOffendersInFile(sf, "fixture-c-before.tsx")
    expect(offenders.every((o) => o.kind === "C")).toBe(true)
    expect(offenders.length).toBe(2)
  })

  // THE GREEN PROOF — the same row, fixed: both fields through real Badges.
  it("check C draws nothing once the row's status/type fields are real Badges", () => {
    const after = `
      function relatedStories(list) {
        return (
          <ul>
            {list.map((s) => (
              <li key={s.id}>
                <span>{s.title}</span>
                <Badge variant="secondary" size="pill" icon={<Icon name={storyTypeIconName(s.storyType)} />}>
                  {s.storyType ?? "—"}
                </Badge>
                <Badge variant="status" dot={storyStatusDotTone(s.status)}>
                  {t(STORY_STATUS_LABEL[s.status])}
                </Badge>
              </li>
            ))}
          </ul>
        )
      }
    `
    const sf = ts.createSourceFile("fixture-c-after.tsx", after, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    expect(findOffendersInFile(sf, "fixture-c-after.tsx")).toEqual([])
  })

  // THE NAMED CARVE-OUT — a genuine table cell whose column IS the status
  // word, beside its own dot, is not a chip: UI-RULEBOOK.md's "the dot
  // reaches every status/stage picker and every list cell" ruling asks that
  // cell for a dot, never a pill, so check C leaves `<td>` alone.
  it("a real <td> status cell, same bare-field shape, is out of check C's reach by construction", () => {
    const tableCell = `
      function statusCell(rows) {
        return (
          <table>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <StatusDot tone={r.status} />
                    {t(STATUS_LABEL[r.status])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      }
    `
    const sf = ts.createSourceFile("fixture-td.tsx", tableCell, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    expect(findOffendersInFile(sf, "fixture-td.tsx")).toEqual([])
  })

  // THE GREEN PROOF — the fixed shape both cells above actually draw now:
  // the glyph through `icon`, nothing left for either check to see.
  it("the fixed cell — the glyph through Badge's own `icon` prop — draws nothing either check can flag", () => {
    const after = `
      function typeCell(w) {
        return (
          <Badge
            variant="secondary"
            size="pill"
            icon={ticketTypeIconName(w.helpType) ? (
              <Icon name={ticketTypeIconName(w.helpType)} className="size-3.5" />
            ) : undefined}
          >
            {w.helpType ?? "—"}
          </Badge>
        )
      }
    `
    const sf = ts.createSourceFile("fixture-after.tsx", after, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    expect(findOffendersInFile(sf, "fixture-after.tsx")).toEqual([])
  })

  // A NON-CHIP THE CENSUS CANNOT TELL APART FROM ONE BY SHAPE ALONE — a
  // selection control drawn as a real `<button>` rather than a `<span>`/
  // `<div>` is already out of check A's reach BY CONSTRUCTION (it scans
  // exactly those two tags, the shape a display chip draws and a control
  // never does); this proves the tag restriction is real rather than
  // incidental, standing in for `shared/web/appearance-pill-group.tsx` and
  // `shared/web/staff-pill-picker.tsx`, both real `role="radio"` buttons
  // carrying an icon beside a label on a `rounded-pill` fill.
  it("a real <button> selection control, same icon+label+pill shape, is out of check A's reach by construction", () => {
    const radioPill = `
      function optionButton(option) {
        return (
          <button className="inline-flex items-center gap-1.5 rounded-pill bg-background px-3 py-1.5">
            {option.dot ? <PillDot tone={option.dot} /> : null}
            {option.label}
          </button>
        )
      }
    `
    const sf = ts.createSourceFile("fixture-button.tsx", radioPill, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    expect(findOffendersInFile(sf, "fixture-button.tsx")).toEqual([])
  })

  it("every CHIP_BADGE_EXEMPT pin still describes a real offender", () => {
    const files = sourceFiles(ROOTS, { extensions: [".tsx", ".ts"], skipTests: true, relativeTo: ROOT })
    const byRel = new Map(files.map((f) => [f.rel, f]))
    for (const key of Object.keys(CHIP_BADGE_EXEMPT)) {
      const rel = key.split("#")[0]
      const file = byRel.get(rel)
      expect(file, `CHIP_BADGE_EXEMPT names "${key}", but ${rel} is not under web/components, web-portal or shared/web any more`).toBeTruthy()
      if (!file) continue
      const stripped = stripComments(readFileSync(file.path, "utf8"), { keepLength: true })
      const sf = ts.createSourceFile(file.path, stripped, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
      const offenders = findOffendersInFile(sf, rel)
      expect(
        offenders.some((o) => o.key === key),
        `CHIP_BADGE_EXEMPT's "${key}" matches no offender any more — delete it`,
      ).toBe(true)
    }
  })
})
