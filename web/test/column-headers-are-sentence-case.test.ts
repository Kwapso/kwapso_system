// COLUMN HEADERS READ IN SENTENCE CASE, AS WRITTEN.
//
// The client's ruling, 2026-09-17, verbatim over the Choices table's Details
// column: *"why all caps? 'Details' pls."* Her screenshots the same session
// showed every table header in the app drawn ALL CAPS — Roles'
// MODULE / ADMIN / CLIENT, Contacts' ACCOUNT / ROLE / PORTAL — so the ruling
// is general, not one column: a column heading is sentence case, exactly as
// its call site wrote the word, never transformed to capitals.
//
// THE SEAM WAS THE KIT. `shared/ui/components/table/table.tsx`'s `TableHead`
// (the primitive every column head in this app draws through — `RecordTable`,
// `screen-renderer.tsx`'s `DataTable` mount, `Matrix`, `PermissionMatrix`) put
// `uppercase` on the `<th>` itself, and `data-table.tsx`'s own sortable-header
// button restated it because a `<button>` resets an inherited
// `text-transform`. Both are fixed upstream in kwapso-design and this app's
// vendored `shared/ui/` picks the fix up on its next kit sync — this repo
// never hand-edits the vendored copy (see CLAUDE.md).
//
// ONE APP-SIDE ECHO SURVIVED THE KIT FIX: `roles-matrix.tsx` draws the Roles
// screen's ROLE column heads as its own `<button>` (the kit's own `<th>`
// belongs to `PermissionMatrix`, in a different file, so this app can only
// hand it a `label: React.ReactNode`) and explicitly restated `uppercase` on
// it "to unify with Module" — a decision the OLD ruling made and this one
// reverses. Fixed alongside this test.
//
// TWO CENSUSES, because there are two shapes a column head can carry the case
// transform in: an actual `<th>`/`<TableHead>` mount this app writes directly
// (census A — general, every file under web/, web-portal/, shared/web/), and
// a `React.ReactNode` column-head LABEL an app file authors for a kit
// component that draws the `<th>` itself, where `roles-matrix.tsx`'s
// `roleRows[].label` is the one real instance today (census B — named
// directly, the same way `rows-are-a-list.test.ts` names `RECORD_TABLE`: a
// derived subject, not an exemption). A third clause guards the CSS half: no
// stylesheet under those same roots sets `text-transform` to `uppercase` on
// any selector, full stop.
//
// `shared/ui/` (the vendored kit) is deliberately OUT of every walk here —
// this repo cannot fix it in place, and a census that read it would go red
// for a reason no change in this repo can clear until the next kit sync.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"

const ROOT = join(import.meta.dirname, "..", "..")
const APP_ROOTS = [join(ROOT, "web"), join(ROOT, "web-portal"), join(ROOT, "shared", "web")]
const ROLES_MATRIX = join(ROOT, "web", "components", "team", "roles-matrix.tsx")

/** True when a captured tag span carries the case transform, in either the
 * form it could arrive: a Tailwind `uppercase` utility class, or a literal
 * `text-transform`/`textTransform` (a CSS string or a React inline-style
 * object) naming `uppercase`. Word-bounded, so it never matches a longer
 * class or identifier that merely contains the substring. */
function carriesUppercase(span: string): boolean {
  if (/\buppercase\b/.test(span)) return true
  if (/text-?[Tt]ransform\s*[:=]\s*['"`]?\s*uppercase/.test(span)) return true
  return false
}

/** Every `<th…>…</th>` and `<TableHead…>…</TableHead>` span in a
 * (comment-stripped) file's source — attributes AND children, so a class on
 * the tag itself or on anything nested inside it (a sortable header's own
 * `<button>`, say) is caught the same way. Self-closing mounts (`<TableHead
 * className="w-10" />`, the actions-column spacer) are read as just their
 * attributes. Non-nesting on purpose: neither tag nests inside its own kind
 * anywhere in this app, so the first matching close tag IS the matching one. */
function headerSpans(src: string): string[] {
  const out: string[] = []
  for (const tag of ["th", "TableHead"] as const) {
    // Word-bounded so "th" never matches "thead"/"TableHeader" and so on.
    const open = new RegExp(`<${tag}(?=[\\s/>])`, "g")
    let m: RegExpExecArray | null
    while ((m = open.exec(src))) {
      const gt = src.indexOf(">", m.index)
      if (gt === -1) break
      if (src[gt - 1] === "/") {
        // Self-closing — nothing to read past the tag itself.
        out.push(src.slice(m.index, gt + 1))
        continue
      }
      const closeTag = `</${tag}>`
      const close = src.indexOf(closeTag, gt)
      out.push(close === -1 ? src.slice(m.index, gt + 1) : src.slice(m.index, close + closeTag.length))
    }
  }
  return out
}

/** Census A's population: every `<th>`/`<TableHead>` span, across every file
 * under the app roots (not the vendored kit), paired with the file it came
 * from so a failure names where to look. */
function headerSpansAcrossApp(): { rel: string; span: string }[] {
  const out: { rel: string; span: string }[] = []
  for (const root of APP_ROOTS) {
    const files = sourceFiles(root, { extensions: [".ts", ".tsx"], relativeTo: ROOT, skipTests: true })
    for (const f of files) {
      for (const span of headerSpans(stripComments(f.source))) out.push({ rel: f.rel, span })
    }
  }
  return out
}

/** Census B's population: `roleRows`' own `label:` value in `roles-matrix.tsx`
 * — the one ReactNode column-head label this app authors for a kit component
 * (`PermissionMatrix`) that draws its own `<th>` in a different file, so
 * census A's tag walk cannot see it. Read as the text from `label: (` to the
 * matching close paren, by bracket depth, so it captures exactly the JSX the
 * role column head renders and nothing past it. */
function roleLabelSpan(): string {
  const src = stripComments(readFileSync(ROLES_MATRIX, "utf8"))
  // Anchored past `const roleRows =` — the file has an EARLIER `label: (` on
  // `moduleColumns` (the module's own per-ROW name, first-column body text,
  // never a column head), and a blind `indexOf` would read that one instead.
  const roleRowsAt = src.indexOf("const roleRows")
  if (roleRowsAt === -1) return ""
  const marker = "label: ("
  const start = src.indexOf(marker, roleRowsAt)
  if (start === -1) return ""
  let depth = 0
  let i = start + marker.length - 1 // sit on the opening "("
  for (; i < src.length; i++) {
    if (src[i] === "(") depth++
    else if (src[i] === ")") {
      depth--
      if (depth === 0) return src.slice(start, i + 1)
    }
  }
  return src.slice(start)
}

/** Census C's population: every `.css` file under the app roots. */
function stylesheetsAcrossApp(): { rel: string; source: string }[] {
  const out: { rel: string; source: string }[] = []
  for (const root of APP_ROOTS) {
    const files = sourceFiles(root, { extensions: [".css"], relativeTo: ROOT })
    for (const f of files) out.push({ rel: f.rel, source: f.source })
  }
  return out
}

describe("column headers are sentence case, never uppercase", () => {
  it("no <th>/<TableHead> mount in the app carries the case transform", () => {
    const spans = headerSpansAcrossApp()
    // The tripwire every derived census here carries: a walk that reads
    // nothing reports the same all-clear as one that read everything and
    // found no fault. `RecordTable` alone draws several dozen `<TableHead`
    // mounts across the app's real screens.
    expect(
      spans.length,
      "the <th>/<TableHead> census found almost nothing — the walk or the tag reader has gone blind"
    ).toBeGreaterThanOrEqual(10)

    const bad = spans.filter((s) => carriesUppercase(s.span))
    expect(
      bad.map((b) => b.rel),
      "these files draw a <th>/<TableHead> that still carries `uppercase` (a class, `text-transform`, " +
        "or `textTransform`) — the client's ruling, 2026-09-17, is that a column heading reads exactly " +
        'as written: \'why all caps? "Details" pls.\' The kit primitive no longer applies the case ' +
        "transform; nothing app-side may reintroduce it:\n  " + bad.map((b) => b.rel).join("\n  ")
    ).toEqual([])
  })

  it("the Roles screen's role-column label carries no uppercase", () => {
    const span = roleLabelSpan()
    expect(span.length, "roles-matrix.tsx's roleRows `label:` value was not found — has it moved or been renamed?").toBeGreaterThan(0)
    expect(
      carriesUppercase(span),
      "roles-matrix.tsx's role-column label still restates `uppercase` — it used to, \"to unify with " +
        "Module\" against the kit's own uppercase TableHead; the kit dropped that transform and this " +
        "label must stay unified with it, not against it."
    ).toBe(false)
  })

  it("no stylesheet under the app sets text-transform: uppercase", () => {
    const sheets = stylesheetsAcrossApp()
    expect(sheets.length, "the stylesheet census found no .css files at all — has globals.css moved?").toBeGreaterThanOrEqual(1)
    const bad = sheets.filter((s) => /text-transform\s*:\s*uppercase/i.test(s.source))
    expect(bad.map((b) => b.rel)).toEqual([])
  })

  // PROVE THE CHECK CAN FAIL, against synthetic fixtures — never a real file,
  // so this proof needs no disk mutation and cannot itself go stale as the
  // app's own markup changes.
  it("the census is provably not vacuous", () => {
    const clean =
      '<TableHeader>\n  <TableHead>{t("Details")}</TableHead>\n  <TableHead className="w-10" />\n</TableHeader>'
    expect(headerSpans(clean).some(carriesUppercase)).toBe(false)

    // THE EXACT REGRESSION THIS LAW GUARDS AGAINST: a column head class
    // restating the old kit transform by hand.
    const classOffender = '<TableHead className="text-micro uppercase">{t("Module")}</TableHead>'
    expect(headerSpans(classOffender).some(carriesUppercase)).toBe(true)

    // AND A NESTED BUTTON RESTATING IT, the exact shape `HeaderSorter` and
    // `roles-matrix.tsx`'s role button both used to be:
    const nestedOffender =
      '<TableHead><button className="text-micro uppercase">{t("Role")}</button></TableHead>'
    expect(headerSpans(nestedOffender).some(carriesUppercase)).toBe(true)

    // AND A RAW `<th>`, not only the kit component name:
    const rawTh = '<th className="uppercase">{label}</th>'
    expect(headerSpans(rawTh).some(carriesUppercase)).toBe(true)

    // A CSS-SIDE OFFENDER, the inline-style shape:
    expect(carriesUppercase('<th style={{ textTransform: "uppercase" }}>{label}</th>')).toBe(true)

    // AND THE READER DOES NOT SWEEP IN AN UNRELATED SIBLING'S CLASS — an
    // `uppercase` on a neighbour must not taint a clean header two tags away.
    const siblingNotSwept =
      '<span className="uppercase">Eyebrow</span>\n<TableHead>{t("Account")}</TableHead>'
    const spans = headerSpans(siblingNotSwept)
    expect(spans.length).toBe(1)
    expect(carriesUppercase(spans[0])).toBe(false)

    // AND `<thead>`/`<TableHeader>` NEVER MATCH AS `th`/`TableHead` THEMSELVES
    // — the word-boundary guard the tag reader states in its own comment.
    const noFalseMatch = '<thead className="uppercase"><TableHeader className="uppercase" /></thead>'
    expect(headerSpans(noFalseMatch).length).toBe(0)
  })
})
