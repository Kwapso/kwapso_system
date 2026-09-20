// R96, THE ID CHIP IS BLACK. Aurora, verbatim: "id pill must always be black!
// f..e in backlgoits not black", read against the record she was looking at
// (the Backlog list's own standalone ID column, `web/components/work/
// stories-screen.tsx`): the record's own reference (`T0001`, `B0001`, `P0001`,
// `W0001`, ...) is drawn everywhere as the ink chip, never a quieter tone and
// never bare text.
//
// THE REGISTER ALREADY EXISTS. `shared/web/record-ref.tsx` (`RecordRef`) is
// the ONE component that builds it: `<Badge variant="inverse" size="pill"
// className="shrink-0 tabular-nums">`, the kit's own ink-fill token pair
// (`bg-surface-inverse text-ink-on-inverse`, `badge.tsx`), never a literal
// colour, and `one-black-chip.test.ts` (R32/R39's own shape) already holds
// the door shut from ONE side: nothing but `record-ref.tsx` may build a
// `Badge variant="inverse"`. What that census cannot see is the opposite
// mistake: a record's own reference drawn as a chip in the WRONG tone, which
// is exactly what she found. `storyLead()` and `ReviewsQueue()`
// (stories-screen.tsx) draw `s.ref` in a plain `variant="secondary"` badge,
// copying `storyLead`'s own shape rather than the shared register; the
// Planned/Backlog tabs' standalone ID column (Aurora's 20 Sep 2026 ruling, "on
// stories 'Planned,' add id as the first column") renders `s.ref` as BARE TEXT,
// no chip at all, because `RecordTable`'s generic column renderer draws
// whatever `field("ref", "ID")` hands it and nothing wraps a non-leading
// column in `RecordRef` the way it wraps the LEADING one (`refColumn`,
// record-table.tsx). Fixed the same session on every site this lane owns:
// `web/components/work/story-detail.tsx`'s chip row, which carried the
// identical `storyLead`-shaped badge. `stories-screen.tsx` and `work-
// panels.tsx` are OWNED BY ANOTHER LANE (per the working brief) and are not
// edited here; their still-open findings are named in `ID_CHIP_EXEMPT`,
// reasoned, rot-checked, so the debt is visible rather than silently
// swallowed.
//
// TWO CLAUSES, the two shapes the bug actually took:
//
//   1. THE TONE. A JSX line whose whole content is a bare record reference,
//      `{x.ref}`, sitting inside a `<Badge>` that does not carry
//      `variant="inverse"`, outside `record-ref.tsx` itself.
//   2. THE MISSING CHIP. A table/recipe column literally named `ref` and
//      labelled "ID" (`field("ref", "ID")`), which `RecordTable`'s generic
//      renderer draws as plain text unless the row itself hands over a
//      `RecordRef` node, and there is no OTHER place in this app doing this
//      yet, so any occurrence at all is the finding.
//
// Both are DATA in `ID_CHIP_EXEMPT`, keyed by `{file, contains}`, the exact
// offending LINE's own text, never a line number (a file:line key rots on the
// next edit above it), the same shape `REF_AS_STRING_OK` already takes in
// `one-black-chip.test.ts`, including its ambiguity guard: an exemption whose
// `contains` matches more than one line in its file excuses a site nobody
// reviewed and is refused.

import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"
import { ID_CHIP_EXEMPT, type IdChipExempt } from "@shared/rules/registry"

const REPO_ROOT = join(__dirname, "..", "..")

const ROOTS = [
  join(REPO_ROOT, "web", "app"),
  join(REPO_ROOT, "web", "components"),
  join(REPO_ROOT, "web", "lib"),
  join(REPO_ROOT, "web-portal", "app"),
  join(REPO_ROOT, "web-portal", "components"),
  join(REPO_ROOT, "web-portal", "lib"),
  join(REPO_ROOT, "shared", "web"),
]

/** The one file allowed to build the black chip, `one-black-chip.test.ts`'s
 * own constant, restated: nothing here may hand-roll the tone either. */
const THE_ONE_PLACE = "shared/web/record-ref.tsx"

/** `RecordTable`'s own generic renderer is where a leading `refColumn` DOES
 * get wrapped in `RecordRef`; that mechanism itself is not a finding. */
const GENERIC_RENDERER = "web/components/records/record-table.tsx"

/** A JSX child that is nothing but a bare record reference, alone on its own
 * line: `{s.ref}`, `{ticket.ref}`, `{item.ref}`, never a longer expression
 * (`${x.ref} dot dot dot`, already R32/`one-black-chip`'s own "glued into the
 * name" clause), so this never re-covers ground `REF_AS_STRING_OK` already
 * settles. */
const REF_ONLY_CHILD = /^\s*\{[\w]+\.ref\}\s*$/

/** How far up a bare `{x.ref}` line this walks looking for the `<Badge` that
 * opens it. The two real offenders (`storyLead`, `ReviewsQueue`) both open
 * one line above; five is generous headroom for a wrapped conditional
 * (`{s.ref && (`) sitting between the two. */
const BADGE_LOOKBACK = 5

interface Finding {
  rel: string
  line: string
}

function toneFindings(): Finding[] {
  const files = sourceFiles(ROOTS, { extensions: [".tsx"], relativeTo: REPO_ROOT, skipTests: true })
  const out: Finding[] = []
  for (const f of files) {
    if (f.rel === THE_ONE_PLACE) continue
    const lines = stripComments(f.source).split("\n")
    lines.forEach((line, i) => {
      if (!REF_ONLY_CHILD.test(line)) return
      let openedInverse = false
      let sawBadgeOpen = false
      let context = line.trim()
      for (let j = i; j >= 0 && i - j <= BADGE_LOOKBACK; j--) {
        if (!/<Badge\b/.test(lines[j])) continue
        sawBadgeOpen = true
        // THE WHOLE OPENING TAG may span more than one line (attrs wrapped),
        // so this joins from the `<Badge` line down to the reference line
        // itself, so a `variant="inverse"` on its own attribute line is
        // still seen. KEPT AS THE FINDING'S OWN KEY TEXT too, not just the
        // bare `{x.ref}` line: two sites in the same file can share the
        // identical `{s.ref}` child (this repo's own two offenders do), so
        // the opening tag is what actually tells them apart for
        // ID_CHIP_EXEMPT's own ambiguity guard.
        context = lines.slice(j, i + 1).join("\n")
        openedInverse = /variant=["']inverse["']/.test(context)
        break
      }
      if (!sawBadgeOpen || openedInverse) return
      out.push({ rel: f.rel, line: context })
    })
  }
  return out
}

/** `field("ref", "ID")` (any case on the label): a standalone id COLUMN,
 * which `RecordTable`'s generic cell renderer draws as bare text, never a
 * chip, unless the row itself already hands over a `RecordRef` node (nothing
 * in this app does today, see the file header). */
const ID_COLUMN_FIELD = /field\(\s*"ref"\s*,\s*"[Ii][Dd]"\s*\)/

/** THE WAY OUT THAT IS NOT AN EXEMPTION: a standalone `ref` column is not a
 * finding when the SAME FILE wires its own cell through `<RecordRef>` via
 * `TableColumn`'s `render` slot (`record-table.tsx`'s own `render?: (value:
 * unknown) => React.ReactNode | undefined`) — the fix `stories-screen.tsx`'s
 * `tableColumns` builder takes for `PLANNED_BACKLOG_COLUMNS` and
 * `REVIEWS_LIST_COLUMNS` (R96, 20 Sep 2026): the row still hands the shaped
 * cell the RAW string (`shapeStories()`'s `ref: s.ref || ""`, unchanged), so
 * search and sort keep comparing the value and only the CELL routes through
 * the register. A render callback's actual output cannot be read off source
 * alone — `stories-sort.test.tsx` proves the rendered DOM carries the ink
 * chip — so this only recognises the WIRING shape, narrowly, so a genuinely
 * still-bare column cannot hide behind an unrelated `render` elsewhere in the
 * same file: `column === "ref"` and a `render =` assignment reaching
 * `<RecordRef` within the same short stretch of source. */
const REF_COLUMN_RENDERS_RECORD_REF =
  /column\s*===\s*"ref"[\s\S]{0,200}?render\s*=[\s\S]{0,200}?<RecordRef\b/

function columnFindings(): Finding[] {
  const files = sourceFiles(ROOTS, { extensions: [".ts", ".tsx"], relativeTo: REPO_ROOT, skipTests: true })
  const out: Finding[] = []
  for (const f of files) {
    if (f.rel === THE_ONE_PLACE || f.rel === GENERIC_RENDERER) continue
    const stripped = stripComments(f.source)
    if (REF_COLUMN_RENDERS_RECORD_REF.test(stripped)) continue
    const lines = stripped.split("\n")
    lines.forEach((line) => {
      if (!ID_COLUMN_FIELD.test(line)) return
      // RAW, NOT TRIMMED: two columns in the same file can share the
      // identical trimmed text (`field("ref", "ID"),`), so the line's own
      // indentation is part of what tells them apart for ID_CHIP_EXEMPT's
      // ambiguity guard, which reads the same raw, untrimmed lines.
      out.push({ rel: f.rel, line })
    })
  }
  return out
}

function excused(entries: IdChipExempt[], rel: string, line: string): IdChipExempt | undefined {
  return entries.find((e) => e.file === rel && line.includes(e.contains))
}

/** Whether a given finding is still open, used by both the rot check below
 * and nowhere else, so a matching finding from EITHER clause counts. */
function stillOpen(all: Finding[], rel: string, contains: string): boolean {
  return all.some((f) => f.rel === rel && f.line.includes(contains))
}

describe("R96, the id chip is black", () => {
  it('no record reference is drawn as a chip in any tone but ink (variant="inverse")', () => {
    const found = toneFindings()
    const unexempt = found.filter((f) => !excused(ID_CHIP_EXEMPT, f.rel, f.line))
    expect(
      unexempt,
      `these draw a record's reference inside a Badge that is not variant="inverse". Route it through ` +
        `<RecordRef> (${THE_ONE_PLACE}), the one shared id chip register, or name it in ID_CHIP_EXEMPT with ` +
        `the reason:\n  ` + unexempt.map((f) => `${f.rel}  ${f.line}`).join("\n  ")
    ).toEqual([])
  })

  it("no standalone ID column renders the reference as bare text", () => {
    const found = columnFindings()
    const unexempt = found.filter((f) => !excused(ID_CHIP_EXEMPT, f.rel, f.line))
    expect(
      unexempt,
      `these declare a standalone "ID" column (field("ref", "ID")). RecordTable's generic cell renderer ` +
        `draws it as bare text, never the ink chip, unless the row hands over a <RecordRef> node. Wrap the ` +
        `cell in <RecordRef>, or name it in ID_CHIP_EXEMPT with the reason:\n  ` +
        unexempt.map((f) => `${f.rel}  ${f.line}`).join("\n  ")
    ).toEqual([])
  })

  it("ID_CHIP_EXEMPT names only real, still-open findings", () => {
    const all = [...toneFindings(), ...columnFindings()]
    const stale = ID_CHIP_EXEMPT.filter((e) => !stillOpen(all, e.file, e.contains))
    expect(
      stale,
      `these ID_CHIP_EXEMPT entries no longer match a real finding. Fixed, or the source moved on, delete ` +
        `the entry:\n  ` + stale.map((e) => `${e.file}  ${e.contains}`).join("\n  ")
    ).toEqual([])
  })

  it("an exemption's contains matches only one line in its file", () => {
    const files = sourceFiles(ROOTS, { extensions: [".ts", ".tsx"], relativeTo: REPO_ROOT, skipTests: true })
    const bySource = new Map(files.map((f) => [f.rel, stripComments(f.source).split("\n")]))
    const ambiguous: string[] = []
    for (const e of ID_CHIP_EXEMPT) {
      const lines = bySource.get(e.file) ?? []
      const hits = lines.filter((l) => l.includes(e.contains))
      if (hits.length > 1) ambiguous.push(`${e.file}  "${e.contains}" matches ${hits.length} lines`)
    }
    expect(
      ambiguous,
      `an ID_CHIP_EXEMPT entry excuses more than one site, make it specific:\n  ` + ambiguous.join("\n  ")
    ).toEqual([])
  })

  // PROVEN NOT VACUOUS, against synthetic source only, the same discipline
  // `chip-order.test.ts` and `no-em-dash.test.ts` hold their own censuses to.
  it("catches a synthetic non-black reference chip", () => {
    const synthetic = [
      "function x() {",
      "  return (",
      '    <Badge variant="secondary" className="font-mono">',
      "      {s.ref}",
      "    </Badge>",
      "  )",
      "}",
      "",
    ].join("\n")
    const lines = synthetic.split("\n")
    const idx = lines.findIndex((l) => REF_ONLY_CHILD.test(l))
    expect(idx).toBeGreaterThan(-1)
    let openedInverse = false
    for (let j = idx; j >= 0 && idx - j <= BADGE_LOOKBACK; j--) {
      if (!/<Badge\b/.test(lines[j])) continue
      openedInverse = /variant=["']inverse["']/.test(lines.slice(j, idx + 1).join("\n"))
      break
    }
    expect(openedInverse).toBe(false)
  })

  it('does not flag the same shape once it is variant="inverse"', () => {
    const synthetic = [
      '    <Badge variant="inverse" size="pill" className="shrink-0 tabular-nums">',
      "      {s.ref}",
      "    </Badge>",
    ].join("\n")
    const lines = synthetic.split("\n")
    const idx = lines.findIndex((l) => REF_ONLY_CHILD.test(l))
    let openedInverse = false
    for (let j = idx; j >= 0 && idx - j <= BADGE_LOOKBACK; j--) {
      if (!/<Badge\b/.test(lines[j])) continue
      openedInverse = /variant=["']inverse["']/.test(lines.slice(j, idx + 1).join("\n"))
      break
    }
    expect(openedInverse).toBe(true)
  })

  it("catches a synthetic standalone ID column with no RecordRef", () => {
    const synthetic = 'const COLUMNS = [field("ref", "ID"), field("name", "Story")]'
    expect(ID_COLUMN_FIELD.test(synthetic)).toBe(true)
  })

  it("does not re-flag a standalone ID column once its cell is wired through RecordRef's render slot", () => {
    const synthetic = [
      'const COLUMNS = [field("ref", "ID"), field("name", "Story")]',
      "const tableColumns = fields.map((f) => {",
      "  const col = { key: f.column, label: f.field.label }",
      '  if (f.column === "ref") col.render = (value) => <RecordRef value={value} />',
      "  return col",
      "})",
    ].join("\n")
    expect(ID_COLUMN_FIELD.test(synthetic)).toBe(true)
    expect(REF_COLUMN_RENDERS_RECORD_REF.test(synthetic)).toBe(true)
  })

  it("still flags a bare standalone ID column when nothing in the file renders it through RecordRef", () => {
    const synthetic = 'const COLUMNS = [field("ref", "ID"), field("name", "Story")]'
    expect(REF_COLUMN_RENDERS_RECORD_REF.test(synthetic)).toBe(false)
  })

  it("stories-screen.tsx's own three R96 sites are fixed — ID_CHIP_EXEMPT carries no entry for it", () => {
    expect(ID_CHIP_EXEMPT.some((e) => e.file === "web/components/work/stories-screen.tsx")).toBe(false)
  })
})
