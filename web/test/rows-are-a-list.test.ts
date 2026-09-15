// R80 — ROWS ARE A LIST, NEVER A BANDED TABLE.
//
// The client's ruling, 2026-09-15, verbatim: "On accounts, I want the views
// to be gallery and list. I don't like this table anywhere, so anywhere in
// the app where you have it, replace it with list. I don't want to say this
// again." `RecordTable` (web/components/records/record-table.tsx) is the one
// row-collection component every screen but Tickets' own bespoke
// `TicketRowsTable` draws through, and it used to draw TWO shapes: a bare
// `<Table>`, and, by DEFAULT, that same table wrapped a second time in
// `overflow-hidden rounded-[var(--radius)] bg-surface-panel` — a grey,
// rounded, inset band inside whatever card already held the toolbar above
// it. Every real caller already sits inside ONE surface of its own (a
// `CollectionCard` from `<PagedFind>`'s `wrap`, or the kit's own
// `useKitPanel` collection panel), so that second box was always a
// redundant, doubly-nested one — never a legitimate alternative to the bare
// shape Tickets' own `TicketRowsTable` drew from the start.
//
// TWO CLAUSES, BOTH DERIVED OFF DISK, BECAUSE A LAW ABOUT A SHAPE HAS TO
// HOLD BOTH THE COMPONENT AND ITS CALLERS TO ACCOUNT:
//   (i)  `record-table.tsx` itself draws no table-band variant any more —
//        the banded fill (`bg-surface-panel` wrapping the `<Table>`) is
//        gone from its source, not merely defaulted off.
//   (ii) no `<RecordTable` mount, anywhere in `web/`, passes a `frame` prop
//        asking for anything other than the literal `"bare"` — the one
//        value that was already a no-op before this law and stays a no-op
//        after it (kept only so `tasks-screen.tsx`'s pre-existing call site
//        keeps compiling while that lane's own brief lands).
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"

const ROOT = join(import.meta.dirname, "..", "..")
const RECORD_TABLE = join(ROOT, "web", "components", "records", "record-table.tsx")

/** THE BANDED FILL, EXACTLY AS IT USED TO READ. A single, unambiguous
 * string: `bg-surface-panel` had no other job in this file before R80 (it
 * named only the second, wrapping card `renderItems` used to return), so its
 * plain presence is the whole census for clause (i) — no need to also match
 * the `rounded-[var(--radius)]`/`overflow-hidden` classes beside it, and no
 * risk of matching something this file legitimately needs the token for,
 * because it never has. */
const BANDED_FILL = /bg-surface-panel/

/** A `<RecordTable` mount, and the `frame` prop it carries, if any.
 *
 * SELF-CLOSING ONLY, which is what every real call site is today (`grep -n
 * "<RecordTable" web/components` turns up six, all `/>`) — a mount is read
 * from its own `<RecordTable` up to the FIRST `/>` that follows it, so a
 * `frame=` inside an unrelated sibling component earlier or later in the
 * same file is never swept in by accident the way a whole-file search would
 * be. A non-self-closing `<RecordTable>...</RecordTable>` would fall
 * through this reader unseen — nothing in the app writes one, and the
 * "found almost nothing" tripwire below is what catches this census going
 * blind if that ever changes. */
function recordTableMounts(src: string): string[] {
  const out: string[] = []
  const re = /<RecordTable\b/g
  let m: RegExpExecArray | null
  while ((m = re.exec(src))) {
    const close = src.indexOf("/>", m.index)
    out.push(close === -1 ? src.slice(m.index) : src.slice(m.index, close + 2))
  }
  return out
}

/** The `frame` prop's own literal value, off one mount's text — `undefined`
 * when the prop is absent (compliant: the default is the only shape there
 * is), the string itself when it is a quoted literal, and the literal text
 * `"<non-literal>"` when `frame=` is spent on anything else (an expression,
 * a variable, a ternary) — which this census refuses just as firmly, because
 * a value it cannot read statically is a value it cannot prove is `"bare"`. */
function frameValue(mount: string): string | undefined {
  const literal = mount.match(/\bframe=\{?"([^"]*)"\}?/)
  if (literal) return literal[1]
  if (/\bframe=\{/.test(mount)) return "<non-literal>"
  return undefined
}

/** Every `.tsx` file under `web/` whose (comment-stripped) source draws at
 * least one `<RecordTable` mount, each mount's own `frame` value alongside
 * it. */
function mountsAcrossApp(): { rel: string; frame: string | undefined }[] {
  const files = sourceFiles(join(ROOT, "web"), {
    extensions: [".tsx"],
    relativeTo: ROOT,
    skipTests: true,
  })
  const out: { rel: string; frame: string | undefined }[] = []
  for (const f of files) {
    const src = stripComments(f.source)
    for (const mount of recordTableMounts(src)) out.push({ rel: f.rel, frame: frameValue(mount) })
  }
  return out
}

/** The law itself, as a pure function over a population of `frame` values —
 * so the mutation proof below can exercise it against synthetic fixtures
 * without touching a real file on disk. */
function offenders(mounts: { rel: string; frame: string | undefined }[]): string[] {
  return mounts.filter((m) => m.frame !== undefined && m.frame !== "bare").map((m) => m.rel)
}

describe("R80 — rows are a list, never a banded table", () => {
  it("rows-are-a-list: record-table.tsx draws no table-band variant", () => {
    const src = stripComments(readFileSync(RECORD_TABLE, "utf8"))
    expect(
      BANDED_FILL.test(src),
      "record-table.tsx still spends `bg-surface-panel` somewhere — R80 deleted the branch that " +
        "wrapped <Table> in a second, rounded, banded card. If this is a genuine new need, it is " +
        "not this one: the banded shape is the defect the law retired, not a variant to keep."
    ).toBe(false)
  })

  it("rows-are-a-list: no <RecordTable mount asks for anything but the bare shape", () => {
    const mounts = mountsAcrossApp()
    // THE TRIPWIRE every derived census here carries: a walk that reads
    // nothing reports the same all-clear as one that read everything and
    // found no fault. Six real call sites as of 2026-09-15.
    expect(
      mounts.length,
      "the <RecordTable census found almost nothing — the walk or the MOUNT regex has gone blind"
    ).toBeGreaterThanOrEqual(5)

    const bad = offenders(mounts)
    expect(
      bad,
      "these <RecordTable mounts pass a `frame` prop asking for something other than the literal " +
        '"bare" — the only value R80 left typeable, and the only shape the component draws at all. ' +
        "No call site may ask for the banded look this law deleted:\n  " + bad.join("\n  ")
    ).toEqual([])
  })

  // PROVE THE CHECK CAN FAIL, against synthetic fixtures — never a real
  // file, so this proof needs no disk mutation and cannot itself go stale
  // as the app's own call sites change.
  it("rows-are-a-list: the census is provably not vacuous", () => {
    const compliantAbsent = { rel: "fixture#accounts-screen", frame: undefined }
    const compliantBare = { rel: "fixture#tasks-screen", frame: "bare" }
    const offendingPanel = { rel: "fixture#reverted-accounts-screen", frame: "panel" }
    const offendingExpr = { rel: "fixture#dynamic-frame", frame: "<non-literal>" }

    expect(offenders([compliantAbsent, compliantBare])).toEqual([])

    // THE EXACT MUTATION THE TASK'S OWN "PROVE RED" STEP PERFORMS FOR REAL:
    // a call site re-adding `frame="panel"` (the old, now-untypeable value)
    // turns the census red by name.
    expect(offenders([compliantAbsent, offendingPanel])).toEqual([offendingPanel.rel])

    // AND A NON-LITERAL `frame={...}` IS REFUSED TOO — a value this census
    // cannot read statically is not proof of "bare".
    expect(offenders([compliantBare, offendingExpr])).toEqual([offendingExpr.rel])
  })

  it("rows-are-a-list: the JSX mount reader itself is provably not vacuous", () => {
    // The reader has to isolate ONE mount's own attributes rather than
    // matching `frame=` anywhere in a file — proved directly, against a
    // fixture carrying an unrelated `frame=` on a SIBLING element the way a
    // whole-file regex would wrongly sweep in.
    const fixture =
      '<SomeOtherThing frame="not-mine" />\n' +
      '<RecordTable columns={c} rows={r} config={cfg} />\n' +
      '<AnotherThing frame="also-not-mine" />'
    const mounts = recordTableMounts(fixture)
    expect(mounts.length).toBe(1)
    expect(frameValue(mounts[0])).toBeUndefined()

    // And the positive case: the mount's OWN frame is read, not a
    // neighbour's.
    const withFrame =
      '<Unrelated frame="panel" />\n<RecordTable columns={c} rows={r} config={cfg} frame="bare" />'
    const mounts2 = recordTableMounts(withFrame)
    expect(mounts2.length).toBe(1)
    expect(frameValue(mounts2[0])).toBe("bare")
  })
})
