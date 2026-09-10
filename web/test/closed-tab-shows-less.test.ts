// WHAT THE CLOSED TAB SHOWS, AND WHAT IT MAY BE ORDERED BY.
//
// ── THE CLIENT RULED ON THIS TWICE ON 2026-09-09 ────────────────────────────
//
// First, that morning:
//
//   "in closed tickets, I want to be able to sort by created date and closed
//    date only. Remove the rest. ID, created date, closed date. Remove the
//    rest."
//
// Two subtractions, and they are not the same subtraction: the first is about
// the ORDER control (two names), the second about the COLUMNS. Then, reviewing
// the result on staging the same day:
//
//   "columns for close: title (with id), type, app, raised closed"
//
// That REPLACES the column half and leaves the sort half exactly as it was.
// It is a revision, not a correction of our reading of the first: a tab of bare
// reference numbers is a list nobody can scan, so the title came back and the
// number came back INSIDE it, as the black `RecordRef` chip every other tab
// already leads its title with.
//
// SO THE ASSERTIONS BELOW HOLD TWO DIFFERENT THINGS AT ONCE and must not be
// "tidied" into agreeing: the columns are the default four PLUS the closing
// date, and the sorts are still two names. Widening the sort menu to match the
// wider column set would be inventing a ruling out of the shape of another one.
//
// ── WHY THIS FILE EXISTS AT ALL ─────────────────────────────────────────────
//
// It is `tab-facets.test.tsx`'s argument, one control along, and that file says
// it best: *an over-offered control looks exactly like a correctly-offered one*.
// A sort option that should not be on this tab renders identically to one that
// should, orders the rows when pressed, and breaks nothing. A column that should
// not be here draws a perfectly good cell. Neither is visible to a type, to the
// lint, or to any other suite in this repo — the only thing that can see them is
// a test that drives the rule over every token on the strip.
//
// So both rules are FUNCTIONS OF A TAB TOKEN (`helpTabColumns` / `helpTabSorts`,
// web/lib/live-resources.ts) rather than expressions inside a render, for the
// same reason `ticketFacets` was lifted out of one: a vocabulary that lives
// inside the thing it decorates cannot be checked.
//
// ── AND WHY THE SORT HALF IS TWO ASSERTIONS, NOT ONE ────────────────────────
//
// A sort menu is one half of a seam. The screen sends a NAME and the door looks
// it up, so a name the door does not know is a clean 400 the moment somebody
// presses it (`paged-sort.test.ts` holds that half against
// `COLLECTION_SORTS.help`). What THAT file cannot see is a tab offering a
// SUBSET: every name here is one the door knows, so it is silent about whether
// the subtraction happened at all. This is that missing half.

import { describe, expect, it } from "vitest"

import { HELP_STATUSES } from "@shared/types"
import { COLLECTION_SORTS } from "@/lib/collection-sorts"
import {
  helpFacetFilter,
  helpTabColumns,
  helpTabOrder,
  helpTabSorts,
  OPEN_FACET,
  TICKET_COLUMN_ORDER,
  TICKET_COLUMNS_DEFAULT,
  WAITING_FACET,
  type HelpFacet,
  type TicketColumn,
} from "@/lib/live-resources"

/** EVERY TOKEN THE STRIP CAN BE ON — the same set `tab-facets.test.tsx` drives,
 * built the same way: the two non-narrowing screens, the derived tab, the
 * whole-lifecycle tab, one tab per stage, and a `type:` token. Built from
 * `HELP_STATUSES` rather than typed out, so a stage added to the vocabulary is
 * a tab this file asks about without anybody remembering to add it. */
const TABS: HelpFacet[] = [
  "dashboard",
  "triage",
  "all",
  OPEN_FACET,
  WAITING_FACET,
  ...HELP_STATUSES.map((s) => `status:${s}` as HelpFacet),
  "type:Extra",
]

const CLOSED: HelpFacet = "status:resolved"

describe("the Closed tab shows less, and only the Closed tab does", () => {
  it("the census can still see — every tab token is a real one", () => {
    // THE BLINDNESS TRIPWIRE, first, because every assertion below is a loop
    // over `TABS` and a loop over nothing passes. `helpFacetFilter` returns `{}`
    // for anything it does not recognise, so a token that stopped being a tab
    // would quietly become "narrows nothing" and be waved through as All.
    expect(TABS.length, "the strip's tokens are not being enumerated").toBeGreaterThan(8)
    expect(TABS, "the tab this whole ruling is about is not in the census").toContain(CLOSED)
    const narrowing = TABS.filter((f) => Object.keys(helpFacetFilter(f)).length > 0)
    expect(
      narrowing.length,
      "no token narrows anything — `helpFacetFilter` has stopped recognising the strip's own words"
    ).toBeGreaterThan(6)
  })

  // ── THE COLUMNS ───────────────────────────────────────────────────────────

  it("Closed draws title, type, app, raised and closed — and nothing else", () => {
    // Her five, in her order. Read as an exact SEQUENCE because the order is
    // half the ruling: she said them in the order she wants to read them.
    expect(helpTabColumns(CLOSED)).toEqual(["title", "type", "app", "created", "closed"])
  })

  it("Closed is every other tab's row plus the closing date", () => {
    // THE SAME FACT, ASKED THE WAY THE CODE SPELLS IT. The literal above is her
    // sentence and cannot be derived from anything; this is the relationship
    // that sentence turned out to describe, and holding both is what catches a
    // change to `TICKET_COLUMNS_DEFAULT` that silently stops reaching this tab.
    expect(helpTabColumns(CLOSED)).toEqual([...TICKET_COLUMNS_DEFAULT, "closed"])
  })

  it("the reference is not a column anywhere — it rides inside the title", () => {
    // HER FIRST READING OF 2026-09-09 GAVE THE NUMBER A COLUMN OF ITS OWN, for
    // the one tab that then had no title for it to lead. Her second reading put
    // the title back, so nothing names `ref` any more and the vocabulary has
    // dropped it. This is the tripwire against re-adding it: a reference in this
    // app belongs in the black `RecordRef` chip in front of a name
    // (`web/test/one-black-chip.test.ts` is the census), and a `ref` column
    // would be a second drawing of one mark, sitting one edit from being used.
    expect(TICKET_COLUMN_ORDER as readonly string[]).not.toContain("ref")
    for (const facet of TABS)
      expect(
        helpTabColumns(facet) as readonly string[],
        `${facet} asks for a column of bare references — the number belongs in front of the title`
      ).not.toContain("ref")
  })

  it("every other tab keeps the four columns she ruled on 2026-09-06", () => {
    for (const facet of TABS) {
      if (facet === CLOSED) continue
      expect(
        helpTabColumns(facet),
        `${facet} lost or gained a column — the 2026-09-09 ruling was about the Closed tab alone`
      ).toEqual(TICKET_COLUMNS_DEFAULT)
    }
  })

  it("the closed-date column appears ONLY where every row has one", () => {
    // THE ONE PART OF THIS THAT IS DERIVED RATHER THAN DICTATED, and the reason
    // it must be: `setStatus` (workers/content/src/lib/help.ts) NULLs
    // `resolved_at` on any move to a non-resolved status — the owner's ruling of
    // 2026-09-06, with the closure kept in the activity trail instead. So on a
    // tab that can hold an open ticket this column would be empty on most rows
    // and would say "never closed" about a ticket that has been closed twice.
    for (const facet of TABS) {
      const pinnedToResolved = helpFacetFilter(facet).status === "resolved"
      expect(
        helpTabColumns(facet).includes("closed"),
        `${facet} ${pinnedToResolved ? "should draw" : "draws"} a closed date, and it is ${
          pinnedToResolved ? "not" : ""
        } a tab pinned to the resolved stage — a reopened ticket's stamp is NULL, so the cell would lie`
      ).toBe(pinnedToResolved)
    }
  })

  it("every column a tab names is one the table knows how to draw", () => {
    // The seam between the rule and the table: the header row and the body row
    // are both laid out by `TICKET_COLUMN_ORDER`, so a name outside it would be
    // silently dropped from BOTH and the tab would simply show less than it
    // asked for, with nothing red.
    for (const facet of TABS)
      for (const c of helpTabColumns(facet))
        expect(
          TICKET_COLUMN_ORDER.includes(c),
          `${facet} asks for a "${c}" column and the table has no such column`
        ).toBe(true)
    // …and no tab may name one twice, which would draw two identical cells
    // under one header.
    for (const facet of TABS) {
      const cols = helpTabColumns(facet)
      expect(new Set(cols).size, `${facet} names a column twice`).toBe(cols.length)
    }
  })

  it("the order the table lays out in is the order the tab asked for", () => {
    // `columns` is a SET the table filters `TICKET_COLUMN_ORDER` by, which is
    // what keeps the header and the body aligned. That only stays honest while
    // no tab wants its facts in a different order from the canonical one, so
    // the two are checked to agree rather than assumed to.
    for (const facet of TABS) {
      const asked = helpTabColumns(facet)
      const drawn = TICKET_COLUMN_ORDER.filter((c: TicketColumn) => asked.includes(c))
      expect(
        drawn,
        `${facet} asks for its columns in an order the table will not draw them in — the header and ` +
          "the cells are laid out by TICKET_COLUMN_ORDER, so the tab would be silently reordered"
      ).toEqual(asked)
    }
  })

  // ── THE SORTS ─────────────────────────────────────────────────────────────

  it("Closed offers created date and closed date, and nothing else", () => {
    expect(helpTabSorts(CLOSED).options).toEqual(["created", "closed"])
  })

  it("every other tab keeps the whole menu, minus the one name that would lie", () => {
    const all = COLLECTION_SORTS.help.options.map((o) => o.value)
    for (const facet of TABS) {
      if (facet === CLOSED) continue
      expect(
        helpTabSorts(facet).options,
        `${facet}'s sort menu changed — the 2026-09-09 ruling was about the Closed tab alone`
      ).toEqual(all.filter((v) => v !== "closed"))
    }
  })

  it("no tab offers a sort its door has never heard of", () => {
    // The other end of the seam `paged-sort.test.ts` holds: that file proves
    // `COLLECTION_SORTS.help` is exactly `TICKET_SORTS`; this proves no per-tab
    // narrowing can smuggle a name past it. A subtraction cannot invent, but a
    // typo in one of these arrays would, and it would look like every other
    // option until somebody pressed it.
    const known = new Set(COLLECTION_SORTS.help.options.map((o) => o.value))
    for (const facet of TABS)
      for (const name of helpTabSorts(facet).options)
        expect(known.has(name), `${facet} offers "${name}", which the tickets door does not know`).toBe(
          true
        )
  })

  it("a tab opens on an order its own control can show", () => {
    // THE DEFAULT MUST BE IN THE MENU. `<PagedFind>` seeds `sortBy` with
    // `defaultSort` and hands it to `SortControl` as the selected value, so a
    // default the tab has withdrawn draws an EMPTY field over rows in an order
    // nothing on screen names — which is the failure this whole per-tab
    // narrowing could most easily have introduced.
    for (const facet of TABS) {
      const { options, defaultSort } = helpTabSorts(facet)
      expect(options.length, `${facet} offers no order at all`).toBeGreaterThan(1)
      expect(
        options.includes(defaultSort),
        `${facet} opens on "${defaultSort}", which is not one of the orders it offers`
      ).toBe(true)
    }
  })

  it("a tab whose default is not the door's own SENDS it", () => {
    // …and this is the half that is invisible from the control. `<PagedFind>`
    // deliberately does not send the default order — a screen sitting on it
    // reads the collection's own cache key and looks exactly as it did before
    // sorting existed — so a tab that opens on something other than the DOOR's
    // fallback has to say so in its own query, or the chip reads "Newest first"
    // while `resolveOrdering` falls back to the drag-rank.
    for (const facet of TABS) {
      const { defaultSort } = helpTabSorts(facet)
      const order = helpTabOrder(facet)
      if (defaultSort === COLLECTION_SORTS.help.defaultSort)
        expect(
          order,
          `${facet} opens on the door's own fallback, so it must send no sort at all — sending it ` +
            "would move the resting screen into a find cache key the live registry does not patch"
        ).toEqual({})
      else
        expect(
          order,
          `${facet} opens on "${defaultSort}" and does not ask the door for it — the control would ` +
            "name one order and the rows would arrive in another"
        ).toEqual({ sort: defaultSort })
    }
  })

  it("the tab's order is not smuggled in as a FILTER", () => {
    // `helpTabFacets` decides a tab is DERIVED — and withholds its Status facet
    // — from any key in `helpFacetFilter` outside the toolbar's own four. A
    // `sort` key put in that bag would therefore silently take the Status
    // control off every tab that pinned an order. Two different questions, two
    // different functions, and this is what keeps them apart.
    for (const facet of TABS)
      expect(
        Object.keys(helpFacetFilter(facet)),
        `${facet}'s narrowing carries an ordering — an order is not a filter, and helpTabFacets reads ` +
          "these keys to decide whether a tab is derived"
      ).not.toContain("sort")
  })
})
