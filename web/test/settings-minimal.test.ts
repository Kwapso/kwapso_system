// SETTINGS, MINIMAL — Aurora, verbatim, 23 Sep 2026: "the whole settings
// module does not have the mibnimal aspect! Make minimal the whole app, not
// only tickets anymore."
//
// The rules this enforces already exist (R67's 21 Sep 2026 flip to
// plain-by-default, R100/R101/R103/R108, the `--heading-strip-gap` token) —
// this is the settings module's own regression guard, the same shape
// `heading-strip-gap.test.ts` and `section-title-one-style.test.ts` already
// take, scoped to the eleven files this lane owns or was told to audit:
//
//   web/components/screens/settings-screen.tsx
//   web/components/screens/module-settings-screen.tsx
//   web/components/screens/module-automations.tsx
//   web/components/screens/invitations-screen.tsx
//   web/components/team/invitations.tsx (rendered by two of the four above,
//     under both "Invites waiting for you" eyebrows)
//   web/components/team/team-panel.tsx
//   web/components/team/access-tokens.tsx
//   web/components/team/members-gallery.tsx
//   web/components/team/roles-matrix.tsx
//   web/components/team/role-picker-dialog.tsx
//   web/components/team/member-screen.tsx
//
// WHAT WAS FOUND, 23 Sep 2026, FIRST PASS. `settings-screen.tsx` still
// wrapped its own `<NoAccess />` refusal in a literal `rounded-[var(--radius)]
// bg-surface-panel p-6 lg:p-[var(--space-7)]` box on FOUR tabs (Members,
// Roles, Modules, Automations) — a shape `<NoAccess>` itself never carries
// (it is a bare `<StateLine>`, no card) and that every OTHER refusal in the
// app already renders without a box
// (`web/components/deep-link/module-content.tsx`,
// `settings-choices-panel.tsx`). The same screen's "Teams you are in" list
// stood inside an identical literal `bg-surface-panel` box under a real
// `size="h4"` (20px) heading, `<Headline as="h2" size="h4">` — a grouping
// section drawn in a heading size on paper, the two shapes R108 and R67 both
// took off every other section in the app. `web/components/team/
// invitations.tsx`'s own invite-rows `<List>` carried the identical literal
// box, reasoned off R67's OLD, pre-amendment sentence ("separation is a fill
// or an inset shadow, never a stroke") rather than the 21 Sep 2026 flip.
// `module-settings-screen.tsx`, `module-automations.tsx` and
// `invitations-screen.tsx` were already clean.
//
// SECOND PASS, SAME DAY — the six `web/components/team/` files, sent back for
// a second look after a first report leaned on dated comments (21/22 Sep)
// instead of judging each occurrence against R67 and `PAPER_ON_PURPOSE`
// today. Two later, individually correct changes had combined into a real
// bug: `members-gallery.tsx`'s member cards moved from `variant="raised"` to
// `variant="default"` (soft paper) on 21 Sep, so `<TeamPanel>`'s own
// `bg-surface-panel` wrap around the wall put soft paper ON soft paper —
// contrast 1.000, the identical bug `team-panel.tsx` was built to fix,
// recreated in the other direction. `team-panel.tsx` no longer paints
// anything (its own header has the full account); `roles-matrix.tsx`'s
// sticky name column reads `stickyGround="page"` now instead of `"panel"`,
// the kit's own default for exactly this case. `access-tokens.tsx` had two
// findings on its own merits (a token-rows box, and a sheet-body `<ul>` that
// also drew its row rule as a literal `divide-y` stroke rather than an inset
// shadow), and `role-picker-dialog.tsx` had one (a radio choice row's resting
// fill). `member-screen.tsx` was already clean — it draws through
// `RecordScreen`, the shared record chrome, which was never in question.
//
// THREE CENSUSES, over the same eleven files, comments stripped first (a
// prose mention of `bg-surface-panel` inside this lane's own doc comments —
// and there are many, describing what used to be there — must never be
// mistaken for a live class).
//
//   (1) NO LITERAL PAPER FILL. No JSX element's own `className` carries
//       `bg-surface-panel`/`bg-card` as a whole class token. `PAPER_ON_PURPOSE`
//       (shared/rules/registry.ts) is the app-wide register of the five
//       things a grouping section may still stand on paper for (a
//       conversation card, an empty or error state, a tile, a well, a
//       not-a-section); none of these eleven files draws one of those five
//       things today, so the census asks for zero rather than reading
//       PAPER_ON_PURPOSE a second time. If one of them ever legitimately
//       needs to (an error state that must stand out, say), name it in
//       `SETTINGS_MINIMAL_PAPER_OK` below with the reason — never restore the
//       literal class unreasoned.
//
//   (2) NO HEADING-SIZED SECTION TITLE. Every `<Headline` in these eleven
//       files either carries exactly `as="h1"` and `size="display-m"` — the
//       one main-page title each of the four `screens/` files draws once, at
//       the top, the same shape `settings-screen.tsx`'s own header calls
//       "the kit's own 'Page title' step" — or is `sr-only` (the two
//       accessibility-only headings `members-gallery.tsx`/`roles-matrix.tsx`
//       draw so a screen reader's heading list still says "Members"/"Roles";
//       R67's own census skips `hidden`/`sr-only` for the identical reason —
//       nothing sighted reads a heading SIZE that is never painted). Any
//       OTHER `<Headline` — a section drawn at `h4`/`h3`/etc. and actually
//       visible — is a title in a heading size where every record section in
//       the app now reads the eyebrow (`text-micro text-muted-foreground
//       uppercase`, R105/R108). A raw `<h2>`/`<h3>`/`<h4>` carrying
//       `text-sm`/`text-lg`/`text-xl`/`text-2xl` alongside
//       `font-medium`/`font-semibold` is the same finding by a different tag.
//
//   (3) NO STROKE AS A ROW RULE. R67's surviving half: separation is a fill
//       or an inset shadow, never a stroke. A `divide-y`/`divide-x` utility
//       (paired with a `divide-*` colour class) draws a literal border
//       between rows — `access-tokens.tsx`'s call-log list did exactly this
//       — where every other list in the app separates rows with an inset
//       `shadow-[var(--hairline-under)]` instead.
//
// All three censuses are keyed `{file, contains}` (the offending element's
// own opening-tag text, never a line number —
// `never-key-an-exemption-by-line`), rot-checked both ways, and proved
// non-vacuous against synthetic source — the same discipline
// `heading-strip-gap.test.ts` takes.

import { join } from "node:path"
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import ts from "typescript"

import { stripComments } from "@shared/rules/source-scan"

const REPO_ROOT = join(__dirname, "..", "..")

const SETTINGS_FILES = [
  join(REPO_ROOT, "web", "components", "screens", "settings-screen.tsx"),
  join(REPO_ROOT, "web", "components", "screens", "module-settings-screen.tsx"),
  join(REPO_ROOT, "web", "components", "screens", "module-automations.tsx"),
  join(REPO_ROOT, "web", "components", "screens", "invitations-screen.tsx"),
  join(REPO_ROOT, "web", "components", "team", "invitations.tsx"),
  join(REPO_ROOT, "web", "components", "team", "team-panel.tsx"),
  join(REPO_ROOT, "web", "components", "team", "access-tokens.tsx"),
  join(REPO_ROOT, "web", "components", "team", "members-gallery.tsx"),
  join(REPO_ROOT, "web", "components", "team", "roles-matrix.tsx"),
  join(REPO_ROOT, "web", "components", "team", "role-picker-dialog.tsx"),
  join(REPO_ROOT, "web", "components", "team", "member-screen.tsx"),
  // ── THE SETTINGS MODULE'S OTHER HALF, ADDED 23 SEP 2026 ─────────────────
  //
  // Aurora, the same day, over the one settings screen the sweep above left
  // boxed: "settings appearacne shoudl not have card - thats not minimal."
  //
  // SHE WAS LOOKING AT A FILE THIS CENSUS COULD NOT SEE. The eleven paths
  // above are all `web/components/screens/**` and `web/components/team/**`,
  // which is where the lane that wrote this test was sent — but Settings ›
  // Appearance draws none of its UI from either folder. The whole tab is
  // `shared/web/appearance-panel.tsx` standing in `shared/web/settings-
  // section.tsx`, and it was THAT `<section>` that still carried
  // `rounded-[var(--radius)] bg-surface-panel p-4 lg:p-[var(--space-7)]` —
  // the identical literal box this census had just taken off four tabs one
  // folder away. A census scoped by FOLDER rather than by SCREEN passed
  // green over the last card in the module it is named after.
  //
  // So the six files the Appearance tab is actually made of are in the
  // subject now. `settings-section.tsx` is the box itself; `appearance-
  // panel.tsx` is the column that used to draw its row rule as a `divide-y`
  // stroke (census 3 — invisible inside a box, the whole of the offence on
  // the bare page); the four `*-section.tsx` files are the pill rows, in for
  // the same reason the eleven above are: this is where a fill would come
  // back first.
  //
  // KNOWN, MEASURED AND DELIBERATELY NOT IN THIS LIST:
  // `web/components/screens/settings-choices-panel.tsx` still wraps its own
  // `<NoAccess />` refusal in `rounded-[var(--radius)] bg-surface-panel p-6
  // lg:p-[var(--space-7)]` — the exact shape this census's own first pass
  // removed from `settings-screen.tsx`'s four tabs, surviving because that
  // pass's eleven files did not include it either. Aurora has not named that
  // screen, and naming a file here while exempting the finding in it would
  // be a green over an open question. It is reported instead, so the ruling
  // is asked for rather than assumed.
  join(REPO_ROOT, "shared", "web", "settings-section.tsx"),
  join(REPO_ROOT, "shared", "web", "appearance-panel.tsx"),
  join(REPO_ROOT, "shared", "web", "language-section.tsx"),
  join(REPO_ROOT, "shared", "web", "scale-section.tsx"),
  join(REPO_ROOT, "shared", "web", "theme-section.tsx"),
  join(REPO_ROOT, "shared", "web", "spine-section.tsx"),
]

function relOf(path: string): string {
  return path.startsWith(REPO_ROOT + "/") ? path.slice(REPO_ROOT.length + 1) : path
}

/** Reasoned exemptions for a literal paper fill, keyed by `{file, contains}` —
 * the offending element's own opening-tag text. Empty on the day this test
 * shipped: every box this census found was either fixed or was never one of
 * `PAPER_ON_PURPOSE`'s five things. */
export const SETTINGS_MINIMAL_PAPER_OK: { file: string; contains: string; why: string }[] = []

/** Reasoned exemptions for a heading-sized section title, keyed the same way.
 * Empty on the day this test shipped. */
export const SETTINGS_MINIMAL_TITLE_OK: { file: string; contains: string; why: string }[] = []

/** Reasoned exemptions for a stroke used as a row rule, keyed the same way.
 * Empty on the day this test shipped. */
export const SETTINGS_MINIMAL_STROKE_OK: { file: string; contains: string; why: string }[] = []

type Finding = { rel: string; contains: string }

const PAPER_CLASS_RE = /(^|\s)(bg-surface-panel|bg-card)(\s|$)/
const OLD_SECTION_TITLE_RE = /\b(text-sm|text-lg|text-xl|text-2xl)\b/
const DIVIDE_RE = /(^|\s)divide-[xy](\s|$)/

function attrStringText(node: ts.JsxOpeningLikeElement, name: string): string | undefined {
  for (const p of node.attributes.properties) {
    if (!ts.isJsxAttribute(p) || p.name.getText() !== name || !p.initializer) continue
    if (ts.isStringLiteral(p.initializer)) return p.initializer.text
    if (ts.isJsxExpression(p.initializer) && p.initializer.expression) {
      const parts: string[] = []
      const collect = (n: ts.Node) => {
        if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) parts.push(n.text)
        ts.forEachChild(n, collect)
      }
      collect(p.initializer.expression)
      if (parts.length > 0) return parts.join(" ")
    }
  }
  return undefined
}

function openingOf(node: ts.Node): ts.JsxOpeningLikeElement | undefined {
  if (ts.isJsxElement(node)) return node.openingElement
  if (ts.isJsxSelfClosingElement(node)) return node
  return undefined
}

function census(files: string[]): { paper: Finding[]; title: Finding[]; stroke: Finding[] } {
  const paper: Finding[] = []
  const title: Finding[] = []
  const stroke: Finding[] = []
  for (const path of files) {
    const raw = readFileSync(path, "utf8")
    const src = stripComments(raw, { keepLength: true })
    const rel = relOf(path)
    const sf = ts.createSourceFile(path, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)

    const visit = (node: ts.Node): void => {
      const opening = openingOf(node)
      if (opening) {
        const tag = opening.tagName.getText(sf)
        const cls = attrStringText(opening, "className")
        if (cls && PAPER_CLASS_RE.test(cls)) {
          paper.push({ rel, contains: opening.getText(sf) })
        }
        if (cls && DIVIDE_RE.test(cls)) {
          stroke.push({ rel, contains: opening.getText(sf) })
        }
        // `sr-only`/`hidden` is skipped — the same tripwire R67's own
        // section census carries: nothing sighted reads a heading SIZE
        // that is never painted, so an accessibility-only heading (the
        // Members/Roles tab-panel labels) is not a title-in-heading-size
        // finding.
        const isHidden = cls !== undefined && /\b(sr-only|hidden)\b/.test(cls)
        if (!isHidden && tag === "Headline") {
          const asAttr = attrStringText(opening, "as")
          const sizeAttr = attrStringText(opening, "size")
          if (asAttr !== "h1" || sizeAttr !== "display-m") {
            title.push({ rel, contains: opening.getText(sf) })
          }
        } else if (!isHidden && /^h[234]$/.test(tag)) {
          if (cls && OLD_SECTION_TITLE_RE.test(cls) && /font-(medium|semibold)/.test(cls)) {
            title.push({ rel, contains: opening.getText(sf) })
          }
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(sf)
  }
  return { paper, title, stroke }
}

function excusedPaper(f: Finding) {
  return SETTINGS_MINIMAL_PAPER_OK.find((e) => e.file === f.rel && f.contains.includes(e.contains))
}
function excusedTitle(f: Finding) {
  return SETTINGS_MINIMAL_TITLE_OK.find((e) => e.file === f.rel && f.contains.includes(e.contains))
}

function excusedStroke(f: Finding) {
  return SETTINGS_MINIMAL_STROKE_OK.find((e) => e.file === f.rel && f.contains.includes(e.contains))
}

describe("settings-minimal — the settings module reads plain, the same as tickets", () => {
  it("no literal bg-surface-panel/bg-card fill in the eleven settings files this lane audited", () => {
    const { paper } = census(SETTINGS_FILES)
    const unexempt = paper.filter((f) => !excusedPaper(f))
    expect(
      unexempt,
      "these elements paint a literal paper fill. Aurora, 23 Sep 2026: make the whole settings module " +
        "minimal. Remove the fill, or name the row in SETTINGS_MINIMAL_PAPER_OK with which of " +
        "PAPER_ON_PURPOSE's five things it is:\n  " +
        unexempt.map((f) => `${f.rel}  ${f.contains.split("\n")[0].slice(0, 120)}`).join("\n  ")
    ).toEqual([])
  })

  it("no section title drawn in a heading size — every visible <Headline> is the one main-page title", () => {
    const { title } = census(SETTINGS_FILES)
    const unexempt = title.filter((f) => !excusedTitle(f))
    expect(
      unexempt,
      "these headings are not the screen's own as=\"h1\" size=\"display-m\" page title, and are not " +
        "sr-only. Draw a section title as the eyebrow (text-micro text-muted-foreground uppercase, " +
        "R105/R108), or name the row in SETTINGS_MINIMAL_TITLE_OK:\n  " +
        unexempt.map((f) => `${f.rel}  ${f.contains.split("\n")[0].slice(0, 120)}`).join("\n  ")
    ).toEqual([])
  })

  it("no row rule drawn as a stroke — divide-x/divide-y never separates rows", () => {
    const { stroke } = census(SETTINGS_FILES)
    const unexempt = stroke.filter((f) => !excusedStroke(f))
    expect(
      unexempt,
      "these elements separate rows with a divide-x/divide-y stroke. R67's surviving half: separation " +
        "is a fill or an inset shadow, never a stroke. Use shadow-[var(--hairline-under)] " +
        "last:shadow-none per row instead, or name the row in SETTINGS_MINIMAL_STROKE_OK:\n  " +
        unexempt.map((f) => `${f.rel}  ${f.contains.split("\n")[0].slice(0, 120)}`).join("\n  ")
    ).toEqual([])
  })

  it("SETTINGS_MINIMAL_PAPER_OK/TITLE_OK/STROKE_OK name only real, still-open findings", () => {
    const { paper, title, stroke } = census(SETTINGS_FILES)
    const stalePaper = SETTINGS_MINIMAL_PAPER_OK.filter(
      (e) => !paper.some((f) => f.rel === e.file && f.contains.includes(e.contains))
    )
    const staleTitle = SETTINGS_MINIMAL_TITLE_OK.filter(
      (e) => !title.some((f) => f.rel === e.file && f.contains.includes(e.contains))
    )
    const staleStroke = SETTINGS_MINIMAL_STROKE_OK.filter(
      (e) => !stroke.some((f) => f.rel === e.file && f.contains.includes(e.contains))
    )
    expect(
      [...stalePaper, ...staleTitle, ...staleStroke],
      "these exemptions no longer match a real finding, delete them:\n  " +
        [...stalePaper, ...staleTitle, ...staleStroke].map((e) => `${e.file}  ${e.contains}`).join("\n  ")
    ).toEqual([])
  })

  // PROVEN NOT VACUOUS, against synthetic source only — the same shape
  // heading-strip-gap.test.ts's own last two cases take, so a census that has
  // quietly stopped matching anything is caught here rather than trusted.
  it("catches a synthetic bg-surface-panel box, a synthetic heading-sized title, a synthetic divide-y — and skips an sr-only heading", () => {
    const synthetic = [
      'import { Headline } from "@shared/ui/components/typography/typography"',
      "function X() {",
      "  return (",
      "    <div>",
      '      <Headline as="h1" size="display-m">Real title</Headline>',
      '      <Headline as="h2" size="h4" className="sr-only">Hidden</Headline>',
      '      <div className="rounded-[var(--radius)] bg-surface-panel p-6">',
      "        <NoAccess />",
      "      </div>",
      '      <Headline as="h2" size="h4">Section</Headline>',
      '      <h3 className="text-sm font-medium">Also a section</h3>',
      '      <ul className="divide-border divide-y">',
      "        <li>Row</li>",
      "      </ul>",
      "    </div>",
      "  )",
      "}",
      "",
    ].join("\n")
    const src = stripComments(synthetic, { keepLength: true })
    const sf = ts.createSourceFile("synthetic.tsx", src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const paper: Finding[] = []
    const title: Finding[] = []
    const stroke: Finding[] = []
    const visit = (node: ts.Node): void => {
      const opening = openingOf(node)
      if (opening) {
        const tag = opening.tagName.getText(sf)
        const cls = attrStringText(opening, "className")
        if (cls && PAPER_CLASS_RE.test(cls)) paper.push({ rel: "synthetic.tsx", contains: opening.getText(sf) })
        if (cls && DIVIDE_RE.test(cls)) stroke.push({ rel: "synthetic.tsx", contains: opening.getText(sf) })
        const isHidden = cls !== undefined && /\b(sr-only|hidden)\b/.test(cls)
        if (!isHidden && tag === "Headline") {
          const asAttr = attrStringText(opening, "as")
          const sizeAttr = attrStringText(opening, "size")
          if (asAttr !== "h1" || sizeAttr !== "display-m") title.push({ rel: "synthetic.tsx", contains: opening.getText(sf) })
        } else if (!isHidden && /^h[234]$/.test(tag)) {
          if (cls && OLD_SECTION_TITLE_RE.test(cls) && /font-(medium|semibold)/.test(cls))
            title.push({ rel: "synthetic.tsx", contains: opening.getText(sf) })
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(sf)
    expect(paper.length).toBe(1)
    expect(title.length).toBe(2)
    expect(stroke.length).toBe(1)
  })

  it("does not flag the real files' own remaining <Headline as=\"h1\" size=\"display-m\"> page titles or sr-only headings", () => {
    const { paper, title, stroke } = census(SETTINGS_FILES)
    // A tripwire the other direction: the real files must still contain at
    // least one <Headline> each (settings-screen.tsx, module-settings-
    // screen.tsx, invitations-screen.tsx all draw the page title, and
    // members-gallery.tsx/roles-matrix.tsx each draw an sr-only one), and
    // none of the eleven should ever land in a census — if they do, either
    // the shape changed or this census broke.
    expect(title).toEqual([])
    expect(paper).toEqual([])
    expect(stroke).toEqual([])
  })
})
