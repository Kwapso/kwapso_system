// A SORTABLE COLUMN THAT SHOWS A FORMATTED VALUE SAYS WHAT IT IS.
//
// ── WHY A CENSUS AND NOT JUST THE BEHAVIOURAL TEST ────────────────────────────
//
// `sorts-compare-the-value-not-the-text.test.tsx` proves the SEAM works — a date
// column handed a `sortType`/`sortKey` orders chronologically, in English and in
// German, with the blanks at one end. It cannot prove the seam is USED. The next
// date column somebody adds to a table will look exactly like the two that are
// declared, sort alphabetically, and pass every test in this repo, because a
// wrong order is not a type error and the rows still move. That is the whole
// nature of this defect: it is invisible to everything except somebody reading
// the screen carefully in a language they can spell the months in.
//
// So this is the other half, in the shape `ground-classes-are-named.test.ts`
// uses: derive the offence from the code rather than from a list a person has to
// remember to extend.
//
// ── WHAT COUNTS AS AN OFFENCE ─────────────────────────────────────────────────
//
// A key that is BOTH:
//
//   1. a COLUMN of a real, sortable table — `RecordTable` (web/components/
//      record-table.tsx) is the only one in either front door whose headers
//      order anything, so a table file is one that renders `<RecordTable`, and
//      its column keys are the `field("…")` / `key: "…"` literals in it; AND
//   2. a cell built by a FORMATTER — a date through `shared/web/format.ts`, or
//      money/hours through `shared/web/money.ts` / `shared/workers/savings.ts`.
//      Those are the four kinds of value whose printed form is not its own
//      order.
//
// …and that is neither declared with a `sortType` nor named below as a column
// the DOOR orders. The shaper is scanned separately from the table, and over a
// wider root, because the two are routinely in different files: Tasks shapes its
// own rows, Meetings shapes its rows in `deep-link/shape.tsx` two folders away.
//
// ── THE TWO WAYS OUT ARE BOTH DECISIONS ───────────────────────────────────────
//
// Declare the type (and, nearly always, a `sortKey` pointing at the raw value
// the row still carries), or record here that the column is ordered by the door
// and the browser never compares it. Both are one line and both are visible. The
// third option — leave it comparing text — is the bug, and there is no spelling
// of it that passes.

import { describe, expect, it } from "vitest"
import { join } from "node:path"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"

const REPO_ROOT = join(__dirname, "..", "..")

/** Where a TABLE is drawn. Both front doors, because the portal drawing none
 * today is a fact about today — the law has to be looking at it on the morning
 * it grows one. */
const TABLE_ROOTS = [
  join(REPO_ROOT, "web", "components"),
  join(REPO_ROOT, "web-portal", "components"),
]

/** Where a ROW is SHAPED. Wider than the tables on purpose: `shapeMeetingsList`
 * lives in `web/components/deep-link/shape.tsx` and the table that draws it
 * lives in `meetings-screen.tsx`, so a scan that only read table files would
 * have found the column and never the cell. */
const SHAPER_ROOTS = [
  ...TABLE_ROOTS,
  join(REPO_ROOT, "web", "lib"),
  join(REPO_ROOT, "web-portal", "lib"),
  join(REPO_ROOT, "shared", "web"),
]

/** A cell whose printed form is not its own order.
 *
 * The date half is `shared/web/format.ts`'s readable formatters — every one of
 * them produces something locale-shaped ("Apr 14, 2025" / "14.04.2025"), which
 * is the whole problem. `formatActivityWhen` is deliberately NOT here: it
 * produces "2026-06-30 21:50" precisely so the kit's activity feed can compare
 * it, and it is not a table column.
 *
 * The money/hours half has no offender today and is here as the tripwire: the
 * day somebody puts `moneyText(row.cents)` in a sortable column, "€1,240.00"
 * sorts below "€90.00" and this test says so before a person has to notice it. */
const FORMATTER =
  /\b(formatDate|formatDateTime|formatDayMonth|formatMonth|formatTime|formatRelative|moneyText|rateText|hoursText|minutesText)\s*\(/

/** `someKey: <something that calls a formatter>` — a row property built from a
 * formatted value. Anchored to the property name so the key can be read off it,
 * which is the only thing that lets a cell in one file be matched to a column in
 * another.
 *
 * The value half runs to the end of the line rather than to the next comma,
 * because a formatter call HAS commas in it (`formatDate(t.dueOn, lang)`) — a
 * comma-terminated value matched nothing at all, which is a census that reads
 * every file and finds zero offenders. The blindness tripwire below is what
 * caught that, on this file's first run. */
const SHAPED_CELL = /(?:^|[\s{,(])([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.+)$/

/** A column key, in the two literal spellings both tables use: the recipe
 * helper (`field("deadline", "Deadline")`) and a hand-built column object
 * (`{ key: "when", label: … }`). A key computed at runtime (`key: f.column`) is
 * invisible here BY CONSTRUCTION — which is why the blindness tripwire at the
 * bottom exists: both real tables build their `TableColumn`s that way and are
 * only reachable through their `field(…)` declarations. */
const COLUMN_KEY = /\bfield\(\s*"([a-zA-Z_][a-zA-Z0-9_]*)"|\bkey:\s*"([a-zA-Z_][a-zA-Z0-9_]*)"/g

/** A column that has said what it is: `deadline: { sortType: "date", … }`. */
const DECLARED = /([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*\{\s*sortType\s*:/g

/** COLUMNS THE DOOR ORDERS, so the browser never compares them and a `sortType`
 * would be a claim about a comparison that does not happen.
 *
 * Rot-checked below in both directions, like every other deny-list here: an
 * entry that is no longer an offending key at all is stale and turns the build
 * red, so this list can only shrink or stay true. */
const DOOR_ORDERED: Record<string, string> = {
  when: (
    "the Meetings 'All' table. The meetings list PAGES, so its headers ask " +
    "`<PagedFind>` for the order and `meetings-screen.tsx` hands the answer " +
    "to `RecordTable` as `order={found.order}` — the rows arrive already " +
    "ordered and `ordered()` is never reached. Declaring a browser comparison " +
    "here would arrange the fifty rows in hand under a badge counting the " +
    "whole meetings list, which is a worse lie than the alphabetical one."
  ),
}

/** Every `key: value` line in a file where the value calls a formatter. */
function shapedCells(source: string): Map<string, string> {
  const found = new Map<string, string>()
  for (const raw of stripComments(source).split("\n")) {
    if (!FORMATTER.test(raw)) continue
    const m = SHAPED_CELL.exec(raw.trimEnd())
    if (m && FORMATTER.test(m[2])) found.set(m[1], raw.trim().slice(0, 90))
  }
  return found
}

describe("a sortable column showing a formatted value declares what it is", () => {
  const tableFiles = sourceFiles(TABLE_ROOTS, {
    extensions: [".tsx"],
    skipTests: true,
    relativeTo: REPO_ROOT,
  }).filter((f) => stripComments(f.source).includes("<RecordTable"))

  const columnKeys = new Set<string>()
  const declared = new Set<string>()
  for (const f of tableFiles) {
    const src = stripComments(f.source)
    for (const m of src.matchAll(COLUMN_KEY)) columnKeys.add(m[1] ?? m[2])
    for (const m of src.matchAll(DECLARED)) declared.add(m[1])
  }

  const cells = new Map<string, string>()
  for (const f of sourceFiles(SHAPER_ROOTS, {
    extensions: [".ts", ".tsx"],
    skipTests: true,
    relativeTo: REPO_ROOT,
  }))
    for (const [key, line] of shapedCells(f.source)) if (!cells.has(key)) cells.set(key, `${f.rel} — ${line}`)

  /** The intersection: a table column whose cell somebody formatted. */
  const formattedColumns = [...columnKeys].filter((k) => cells.has(k)).sort()

  it("every one of them has a sortType, or is a column the door orders", () => {
    const offenders = formattedColumns
      .filter((k) => !declared.has(k) && !(k in DOOR_ORDERED))
      .map((k) => `${k} — ${cells.get(k)}`)
    expect(
      offenders,
      "these columns are SORTED IN THE BROWSER and show a formatted value, so they are being " +
        "compared as text: a date column orders April before December before January and the rows " +
        "move, so nothing looks wrong. Give the column a `sortType` (and a `sortKey` reading the " +
        "raw value the row already carries — never re-parse the formatted text, it changes answer " +
        "per language), or add a reasoned DOOR_ORDERED line if the door owns that order:\n  " +
        offenders.join("\n  ")
    ).toEqual([])
  })

  it("no DOOR_ORDERED line has outlived its column", () => {
    // ROT, both ways round. An entry whose column no longer shows a formatted
    // value — or no longer exists — is a reasoned exception nobody re-reads,
    // and an entry that has ALSO grown a `sortType` is two answers to one
    // question with nothing saying which won.
    const stale = Object.keys(DOOR_ORDERED).filter(
      (k) => !formattedColumns.includes(k) || declared.has(k)
    )
    expect(
      stale,
      "DOOR_ORDERED entries that no longer describe anything — the column moved, stopped being " +
        "formatted, or gained a sortType of its own; delete the line:\n  " + stale.join("\n  ")
    ).toEqual([])
  })

  it("the census can still see — it finds the tables, the columns and the cells", () => {
    // THE BLINDNESS TRIPWIRE, and this file needs one more than most: three of
    // its four derivations are regexes over spellings, and a rename ("shapeRows"
    // → something else, `field(` → a new helper, `<RecordTable` → a wrapper)
    // empties the census silently. An empty census passes every assertion above.
    expect(tableFiles.map((f) => f.rel).sort(), "no file renders a RecordTable any more").toEqual([
      // The client turned the Contacts screen into a table on 2026-09-09 ("for
      // contacts lets do view table"). It is in the census and carries NO
      // formatted cell — a contact row has no date and no money on it — so it
      // adds column keys and no offenders, which is the shape a new table
      // should have.
      "web/components/accounts/contacts-screen.tsx",
      "web/components/meetings/meetings-screen.tsx",
      "web/components/work/tasks-screen.tsx",
    ])
    expect(columnKeys.size, "no column keys were found in the table files").toBeGreaterThan(5)
    expect(cells.size, "no formatted cells were found in any shaper").toBeGreaterThan(3)
    // …and the two that this whole pass was about are actually in the net: one
    // declared, one door-ordered. If either drops out, the census stopped
    // looking at the thing it was built for.
    expect(formattedColumns, "the Tasks Deadline column is not being censused").toContain("deadline")
    expect(formattedColumns, "the Meetings When column is not being censused").toContain("when")
  })

  it("a declared column reads a RAW value, never the cell it is drawn from", () => {
    // The one shape that would pass the census and still be broken: a `sortKey`
    // pointing back at the column's own key, i.e. re-parsing the formatted text.
    // "Apr 14, 2025" parses and "14.04.2025" does not, so that spelling works in
    // English and silently reverts to alphabetical in German — the exact bug,
    // wearing the fix's clothes.
    const offenders: string[] = []
    for (const f of tableFiles)
      for (const m of stripComments(f.source).matchAll(
        /([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*\{\s*sortType[^}]*sortKey:\s*\([^)]*\)\s*=>\s*\w+\.([a-zA-Z_][a-zA-Z0-9_]*)/g
      ))
        if (m[1] === m[2]) offenders.push(`${f.rel} — ${m[1]} compares its own cell`)
    expect(
      offenders,
      "a sortKey that reads the column's own key is reading the FORMATTED text — point it at the " +
        "raw field the shaper carries alongside (dueOn beside deadline):\n  " + offenders.join("\n  ")
    ).toEqual([])
  })
})
