"use client"

// A TABLE WHOSE COLUMN HEADERS ACTUALLY ORDER IT.
//
// ── WHY THIS EXISTS ───────────────────────────────────────────────────────────
//
// The library can draw this table; it cannot sort it, and the failure is silent
// in the worst possible way — the header lights up and the rows do not move.
//
// `DataTable` keeps the header's choice in its OWN state and pushes it down to
// `CollectionFrame` as a config prop (`sortBy: sort?.key ?? config.sortBy`). The
// frame seeds its sort from that prop ONCE, at mount — `React.useState(config.sortBy)`
// — and from then on orders by its own state and ignores the prop entirely. So
// the value the header writes is read by nobody. Every column of a `display:
// "table"` recipe is `sortable: true` (the engine hard-codes it), so both tables
// in the agency app drew five and six live-looking controls that changed nothing.
//
// That is worse than having no control: a person who sorts by Deadline and sees
// the rows sit still does not conclude the button is broken, they conclude the
// DATA is wrong. Reported from the deployed build: "the sort actually doesn't
// work… I don't see the order changing, even though I can see that there are
// different values." UI-GAPS #22(b) has the library's half of the fix (a
// `serverSide` + `onSortChange` seam on `DataTable`, the same shape #15 asks for
// about search); this is the host's half, and it is a composition of shipped
// primitives, not a fork — the same category as `paged-find.tsx`,
// `record-picker.tsx` and `record-calendar.tsx`, each of which exists because a
// library component owns a decision the host has to make.
//
// The CHROME is still the library's. `CollectionFrame` keeps doing the search
// box, the facets, the count and the pager exactly as before; the only thing
// taken off it is the ORDER, which it was not doing. The rows are ordered before
// the frame ever sees them, and the frame's own sort stays at its default (`""`),
// so `selectRows` leaves the sequence alone. Filtering and searching preserve
// order, so "sort then narrow" and "narrow then sort" are the same list.
//
// ── A HEADER REPLACES THE ORDER, IT DOES NOT REFINE IT ────────────────────────
//
// The doors order deliberately — tasks come back priority-first, the meetings
// list comes back newest-first — and the question was whether a column header
// should sort WITHIN that or instead of it. It replaces it, and the bug report is the
// argument: what the owner was looking at when he said the sort was broken was
// 80 tasks ascending by deadline with one priority-4 row pinned above them,
// which is exactly what "sort within the door's order" looks like from a chair.
// A column header is an instruction about that column and nothing else.
//
// The default is not lost, it is one press away: asc → desc → off, and "off" is
// the order the door handed us. Both tables behave identically.
//
// ── WHO DECIDES THE ORDER ─────────────────────────────────────────────────────
//
// The same split SEARCH.md draws for the search box, one control along:
//
//   • BOUNDED (Tasks) — the whole collection is in the browser, so ordering it
//     here is honest and free. Pass no `order` and this owns it.
//   • PAGED (the meetings list's All) — the browser holds page one, so ordering it here
//     would arrange fifty of 254 rows and call the result sorted. Pass the
//     `order` off `<PagedFind>` and a header click becomes a question for the
//     DOOR, landing in its own cache key at page one like every other one.
//     A column the door has no name for carries no `sort` and is not clickable:
//     a plain header is honest, and a live-looking one is what this file exists
//     to stop.

import * as React from "react"

import { ArrowDown, ArrowUp, ArrowsDownUp, DotsThree } from "@shared/ui/foundations/icons"

import { CollectionFrame } from "@shared/web/screen-engine/collection-frame"
import type { ScreenActionContext } from "@shared/web/screen-engine/screen-renderer"
import type { CollectionConfig } from "@shared/web/screen-engine/config"
import { gateState, type ScreenRecipe, type ScreenRights } from "@shared/web/screen-engine/recipe"
import { Button } from "@shared/ui/components/button/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@shared/ui/components/dropdown-menu/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@shared/ui/components/table/table"

import type { CollectionOrder } from "@/lib/collection-sorts"

export type TableRowData = Record<string, unknown>

/** One column. `label` is already in the reader's language (the recipe's own,
 * through `translateRecipe`), so a header costs the catalogue nothing (R28).
 *
 * `sort` is the name to order by, and its ABSENCE is a decision: this column
 * draws a plain header. On a bounded table it is the row key, because the
 * browser is doing the comparing; on a paged one it is the door's own menu name
 * (`COLLECTION_SORTS`), because the door is.
 *
 * `defaultDir` is where the FIRST press lands, the same knob a `SortOption`
 * carries and for the same reason: "most recent first" is what somebody means by
 * a date column, and opening on the oldest row reads as broken. */
export type TableColumn = {
  key: string
  label: string
  sort?: string
  defaultDir?: "asc" | "desc"
  /** WHAT THIS COLUMN IS, for the purpose of putting two of them in order.
   * Absent means `"text"`, which is what every column was before this existed
   * and is the right answer for a name, a department or a status word. See the
   * long note on `SortType` below for why a date has to say so out loud. */
  sortType?: SortType
  /** WHERE THE COMPARISON VALUE COMES FROM, when it is not the cell.
   *
   * Given a row, hand back the value to COMPARE — the raw one the row still
   * carries beside the shaped cell (`dueOn` beside `deadline`), never the
   * shaped cell itself. Absent means `row[key]`, i.e. compare what is drawn,
   * which stays correct for a column whose text IS the fact. */
  sortKey?: (row: TableRowData) => unknown
}

/** ── WHY A COLUMN HAS TO SAY WHAT IT IS ───────────────────────────────────────
 *
 * A cell holds a STRING SHAPED FOR A READER and a sort holds a QUESTION ABOUT A
 * FACT, and for a whole class of columns those two are not the same value. A
 * date column showing "14 Apr 2025", "22 Dec 2025", "3 Jan 2026" compared as
 * text answers April, December, January — a real answer, in the wrong order,
 * arrived at silently: the rows MOVE, the arrow lights, and nobody looking at
 * the screen can tell the difference between a sort that worked and one that
 * sorted the alphabet. It is the same shape of failure the header itself had
 * (see the top of this file) one layer in: not a dead control, a lying one.
 *
 * The same is true of a duration, of money rendered as text, and of a count with
 * a label glued to it ("10 · Do it now" against "9 · …").
 *
 * ── TWO KNOBS, BECAUSE THERE ARE TWO QUESTIONS ────────────────────────────────
 *
 * `sortType` and `sortKey` are both here, and neither collapses into the other:
 *
 *   • `sortKey` answers WHICH VALUE. The rows a table is handed are SHAPED rows
 *     — `deadline: "14 Apr 2025"` — and the fact behind them (`dueOn`) is a
 *     separate field the shaper carries along. Without this there is nothing to
 *     compare but the shaped text, which is the bug.
 *   • `sortType` answers HOW. Two ISO strings do compare correctly as text by
 *     luck of the format, but "2026-06-13" and "2026-06-13T09:00:00.000Z" do
 *     not, and a raw number formatted with grouping does not either. Naming the
 *     kind is what makes the comparison a decision instead of a coincidence.
 *
 * A `sortKey` with no `sortType` is legitimate (compare a raw string by text);
 * a `sortType` with no `sortKey` is legitimate too (a column whose cell already
 * holds the raw value). Most date columns want both, and the census test —
 * `web/test/sorted-columns-declare-their-type.test.ts` — is what stops the next
 * one shipping with neither.
 *
 * ── LOCALE ───────────────────────────────────────────────────────────────────
 *
 * This app ships English, German, Spanish and Catalan (`shared/i18n.ts`), and
 * the ONE thing this seam must never do is read the date back out of the words
 * on screen. `formatDate(iso, "de")` produces "14.04.2025" and `formatDate(iso,
 * "en")` produces "Apr 14, 2025"; a comparison that re-parsed either would be a
 * comparison that changes its answer when somebody changes their language, and
 * would need a month-name table per language to do it at all. The comparison
 * here reads the RAW ISO instant off the row, so the order of the rows is
 * identical in all four languages and the cell is free to be as warm and as
 * local as it likes. That freedom is the point: it is what let the two date
 * columns stop showing "2026-04-14" to a person.
 *
 * ── EMPTY ────────────────────────────────────────────────────────────────────
 *
 * A row with nothing in the column sorts to the END, both directions — see
 * `isBlank`. For a typed column "nothing" is wider than an empty string: a
 * value that will not parse as a date (or as a number) is missing too, because
 * a `NaN` in a comparator does not sort a row to one end, it SCATTERS every row
 * it is compared against. Predictably last is the only honest place for it. */
export type SortType = "text" | "number" | "date"

/** Blanks go LAST, whichever way the column is pointing.
 *
 * Every cell here is a shaped string and an absent value is rendered "—", so
 * without this a descending sort on a column that is mostly empty opens with a
 * screen of em-dashes — the sort worked and the answer is useless. Sorting is
 * for finding the extremes of what you HAVE. */
const isBlank = (v: unknown) => v == null || v === "" || v === "—"

/** A date column's comparison value, as a number of milliseconds — `null` when
 * there is nothing there to compare.
 *
 * `Date.parse` and nothing else: it reads both shapes the doors hand back, the
 * full instant (`2026-09-21T00:00:00.000Z`) and the bare day (`2026-09-21`),
 * and it reads NEITHER of the shapes a person sees, which is deliberate. If a
 * caller points `sortKey` at the formatted cell by mistake, "Apr 14, 2025"
 * happens to parse and "14.04.2025" does not — so the German build would sort
 * differently from the English one. The census test is what catches that; this
 * function's job is only to be unambiguous about what it accepts. */
function instant(v: unknown): number | null {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.getTime()
  if (typeof v === "number") return Number.isFinite(v) ? v : null
  if (typeof v !== "string" || v.trim() === "") return null
  const ms = Date.parse(v)
  return Number.isFinite(ms) ? ms : null
}

/** A number column's comparison value — `null` when there is nothing to compare.
 *
 * STRICT ON PURPOSE. A real number passes, and so does a string that is ENTIRELY
 * a number; anything else — "10 · Do it now", "€1,240.00", "3 days" — is `null`
 * and lands at the end. The tempting alternative (strip the non-digits and hope)
 * is the same locale trap the date half is avoiding: "1,240" is one thousand two
 * hundred and forty in English and one-point-two-four in German, and a comparator
 * that guesses gets one of those two wrong in silence. A column declaring
 * `sortType: "number"` is telling this file the row carries the number; if it
 * does not, every row is equally missing and the list simply keeps the order it
 * arrived in, which is visible rather than wrong. */
function quantity(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null
  if (typeof v !== "string" || v.trim() === "") return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** Is there anything here to compare, for a column of this kind? Wider than
 * `isBlank` for the two typed kinds — see the `SortType` note on empty. */
function missing(v: unknown, type: SortType): boolean {
  if (type === "date") return instant(v) === null
  if (type === "number") return quantity(v) === null
  return isBlank(v)
}

/** The comparison, per kind.
 *
 * TEXT is the original, unchanged: numerically aware, because `numeric: true` is
 * what makes "10 · Do it now" fall after "9 · …" without the column having to
 * declare anything. It stays the default so a name column costs its caller
 * nothing.
 *
 * DATE and NUMBER compare the parsed value, so what is on screen has no vote. */
function compare(a: unknown, b: unknown, type: SortType = "text"): number {
  if (missing(a, type)) return missing(b, type) ? 0 : 1
  if (missing(b, type)) return -1
  if (type === "date" || type === "number") {
    const x = (type === "date" ? instant(a) : quantity(a)) as number
    const y = (type === "date" ? instant(b) : quantity(b)) as number
    return x < y ? -1 : x > y ? 1 : 0
  }
  if (typeof a === "number" && typeof b === "number") return a - b
  return String(a).localeCompare(String(b), undefined, { numeric: true })
}

/** The rows, in the asked-for order. A COPY — the caller's array is the shaped
 * list other things on the screen read.
 *
 * STABLE, and it has to be: `Array.prototype.sort` has been required to be
 * stable since ES2019, so two rows the column cannot tell apart keep the order
 * the door handed them in. That is what makes the same list, sorted the same
 * way twice, look the same twice — and it is what the "two tasks share a
 * deadline" case in `table-header-sorts.test.tsx` is pinning. */
function ordered<T extends TableRowData>(
  rows: T[],
  columns: TableColumn[],
  by: string,
  dir: "asc" | "desc"
): T[] {
  if (!by) return rows
  // The COLUMN, not just its name: the type and the value-reader hang off it.
  // Found by `sort` (the name the header writes) rather than by `key`, because
  // those are the same string only on a bounded table. A name no column claims
  // falls back to reading the cell, which is what this did before.
  const col = columns.find((c) => c.sort === by)
  const type = col?.sortType ?? "text"
  const read = col?.sortKey ?? ((row: TableRowData) => row[col?.key ?? by])
  const sign = dir === "desc" ? -1 : 1
  return rows.slice().sort((x, y) => {
    const a = read(x)
    const b = read(y)
    // Blanks stay last in BOTH directions, so they are pushed out of the reversal.
    const flip = missing(a, type) || missing(b, type) ? 1 : sign
    return compare(a, b, type) * flip
  })
}

/** A trailing ⋯ entry. */
export type TableAction<T> = { label: string; onSelect: (row: T) => void }

/** The recipe's own actions, minus the ones this caller may not see — the same
 * two lines `ScreenRenderer` runs before it builds the ⋯ column, kept because a
 * recipe's actions are what a TEAM may OVERRIDE (`POST /api/tenancy/config/screens`).
 * A table that simply dropped them would quietly un-ship something somebody
 * configured, and nothing would say so. */
export function visibleActions<T extends TableRowData>(
  recipe: ScreenRecipe,
  rights: ScreenRights,
  onAction: (actionId: string, ctx: ScreenActionContext) => void
): TableAction<T>[] {
  return recipe.actions
    .filter((a) => gateState(rights, a.gate) !== "hidden")
    .map((a) => ({
      label: a.label,
      onSelect: (row: T) => onAction(a.id, { id: String(row.id ?? ""), record: row }),
    }))
}

export function RecordTable<T extends TableRowData>({
  columns,
  rows,
  config,
  order,
  actions = [],
  onRowClick,
  className,
  useKitPanel,
}: {
  columns: TableColumn[]
  rows: T[]
  /** the collection's own chrome — the tuned recipe's config, so the search box,
   * the facets, the empty line and the count are the recipe's decisions, not
   * this component's */
  config: CollectionConfig
  /** WHO OWNS THE ORDER. Absent = this does, in the browser, over the whole
   * bounded collection. Present = somebody else does (the door, through
   * `<PagedFind>`), and the rows arrive already ordered. */
  order?: CollectionOrder
  actions?: TableAction<T>[]
  onRowClick?: (row: T) => void
  className?: string
  /** Forwarded straight to `CollectionFrame` — see its own doc. A table is a
   * `renderItems` callback same as a list's; the toolbar/panel/create-button
   * chrome around it is the frame's decision either way, so this component
   * needs nothing of its own to carry the flag, only a place to pass it. */
  useKitPanel?: boolean
}) {
  const [own, setOwn] = React.useState<{ by: string; dir: "asc" | "desc" } | null>(null)
  const live: CollectionOrder = order ?? {
    by: own?.by ?? "",
    dir: own?.dir ?? "asc",
    set: (by, dir) => setOwn(by ? { by, dir } : null),
  }
  // When somebody else owns the order, the rows they hand over ARE the order.
  const shown = order ? rows : ordered(rows, columns, live.by, live.dir)

  /** A column cycles through its TWO directions and then back to the order the
   * collection arrived in. Three presses, three different lists.
   *
   * Written as "away from the column's own default, then off" rather than
   * "asc, desc, off" because of the meetings list: it opens ordered by When, newest
   * first, so a fixed asc→desc→off cycle would spend its third press putting the
   * screen back into the state it was already in. A dead press on a control that
   * just worked twice is how somebody decides it is unreliable. */
  const toggle = (c: TableColumn) => {
    const name = c.sort as string
    const lands = c.defaultDir ?? "asc"
    if (live.by !== name) return live.set(name, lands)
    if (live.dir === lands) return live.set(name, lands === "asc" ? "desc" : "asc")
    return live.set(null, lands)
  }

  return (
    <CollectionFrame
      config={config}
      data={shown}
      searchKeys={columns.map((c) => c.key) as (keyof T)[]}
      className={className}
      useKitPanel={useKitPanel}
      renderItems={(page) => (
        <div className="overflow-hidden rounded-[var(--radius)] bg-surface-panel">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((c) => {
                  const active = c.sort != null && live.by === c.sort
                  return (
                    <TableHead
                      key={c.key}
                      // The standard way a table says which column it is in
                      // order by — so a screen reader hears it without the
                      // arrow needing a sentence of its own to explain it.
                      aria-sort={
                        active ? (live.dir === "asc" ? "ascending" : "descending") : undefined
                      }
                    >
                      {c.sort == null ? (
                        c.label
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggle(c)}
                          className="hover:text-foreground motion-hover inline-flex items-center gap-1"
                        >
                          {c.label}
                          {active ? (
                            live.dir === "asc" ? (
                              <ArrowUp className="size-3.5" />
                            ) : (
                              <ArrowDown className="size-3.5" />
                            )
                          ) : (
                            <ArrowsDownUp className="size-3.5 opacity-40" />
                          )}
                        </button>
                      )}
                    </TableHead>
                  )
                })}
                {actions.length > 0 && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {page.map((row, i) => (
                <TableRow
                  key={String(row.id ?? i)}
                  role={onRowClick ? "button" : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            onRowClick(row)
                          }
                        }
                      : undefined
                  }
                  className={
                    (i % 2 === 1 ? "bg-muted" : "") +
                    (onRowClick
                      ? "cursor-pointer"
                      : "")
                  }
                >
                  {columns.map((c) => (
                    <TableCell key={c.key}>{row[c.key] as React.ReactNode}</TableCell>
                  ))}
                  {actions.length > 0 && (
                    // Reaching the menu must not also open the record.
                    <TableCell
                      className="text-right"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-7">
                            <DotsThree className="size-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {actions.map((a) => (
                            <DropdownMenuItem key={a.label} onSelect={() => a.onSelect(row)}>
                              {a.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    />
  )
}
