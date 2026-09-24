// A FACET TAKES SEVERAL VALUES — OR INSIDE ONE, AND INSIDE ONE ONLY.
//
// Aurora, 24 Sep 2026, validating the filter overlay: *"validated, but i
// shoudl be able to select multile for each filter type"*.
//
// The sentence a person expects, and the one every layer here has to say
// identically: WITHIN one facet several values mean OR (the client is Confia
// or Etzi Haus); ACROSS facets they mean AND. Get either half wrong in either
// layer and the same collection answers two different questions depending on
// whether it pages — which is the founding defect `web/lib/collection-filters
// .ts`'s own header is a monument to.
//
// SO THIS FILE TESTS THE THREE LAYERS SEPARATELY, on purpose:
//
//   1 · THE WIRE — how a set is written down (`shared/facet-list.ts`). The one
//       spelling both sides read, and the one place the separator hazard can
//       be closed.
//   2 · THE SQL — `inClause`/`oneOfPair` (`shared/workers/filter-in.ts`), the
//       shape every door now builds its facet narrowing with. The doors' own
//       suites prove it against real rows (`workers/tenancy/test/accounts
//       .test.ts`); this proves the clause itself.
//   3 · THE BROWSER — `selectRows`, which narrows a bounded collection the
//       screen already holds. It must reach the same rows the door would.
//
// And a fourth thing that is not a layer: the CENSUS. Multi-select is the
// default now, so a facet that takes one value is the exception and has to say
// so in data (`CollectionFacet.single`) with a vocabulary that earns it.

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import * as React from "react"
import { afterEach, beforeAll, describe, expect, it } from "vitest"

import { FACET_VALUES_CAP, joinFacet, splitFacet } from "@shared/facet-list"
import { inClause, oneOfPair } from "@shared/workers/filter-in"
import { useFilterBar } from "@shared/web/screen-engine/filter-bar"
import { FACET_SPAN, filterOverlayForm } from "@shared/ui/components/filter-bar/filter-bar"
import type { FilterFacet } from "@shared/web/screen-engine/config"
import { selectRows } from "@shared/web/screen-engine/collection"
import { defaultCollectionConfig, type CollectionConfig } from "@shared/web/screen-engine/config"
import { COLLECTION_FILTERS } from "@/lib/collection-filters"

/* ── 1 · THE WIRE ─────────────────────────────────────────────────────────── */

describe("the one spelling a set of values is written in", () => {
  it("round-trips, and one value is spelled EXACTLY as a single value always was", () => {
    // The backwards-compatibility clause the whole change rests on: every
    // caller that exists today sends one word, and one word must keep meaning
    // exactly what it meant — byte-identical, not merely equivalent.
    expect(splitFacet("ready")).toEqual(["ready"])
    expect(joinFacet(["ready"])).toBe("ready")
    expect(splitFacet(joinFacet(["a", "b", "c"]))).toEqual(["a", "b", "c"])

    // THE ONE THAT CAUGHT THE FIRST CUT OUT. A knowledge compartment carries a
    // colon, and `encodeURIComponent` turns it into `%3A` — so the first
    // version of this file quietly respelled every scoped read in the app.
    // Only the separator and the escape character are escaped now.
    expect(joinFacet(["account:01JABCDE"])).toBe("account:01JABCDE")
    for (const value of ["account:01JABCDE", "a b", "Ångström", "x/y?z=1", "Zoë & Co."]) {
      expect(joinFacet([value]), `a single ${value} must go on the wire unchanged`).toBe(value)
      expect(splitFacet(value)).toEqual([value])
    }

    // THE TWO CHARACTERS THAT CANNOT BE LEFT ALONE, said out loud rather than
    // hidden: a value carrying a comma or a percent sign is escaped on the way
    // out, because the separator and the escape character are the only two
    // things the parse cannot survive raw. A caller that sent either one RAW,
    // before this parameter learned to carry a set, still reads back exactly
    // as it did — which is the half that keeps old links working.
    expect(joinFacet(["100%"])).toBe("100%25")
    expect(splitFacet("100%"), "a raw percent from an older caller is untouched").toEqual(["100%"])
    expect(splitFacet(joinFacet(["100%"])), "and our own escaped one round-trips").toEqual(["100%"])
  })

  it("an ESCAPED escape is not a separator", () => {
    // `%2C` typed by a person is a value, not a comma. One unescaping pass is
    // what keeps the two apart; two passes would turn this into a split.
    const literal = "%2C"
    expect(splitFacet(joinFacet([literal, "b"]))).toEqual([literal, "b"])
  })

  it("survives a value that CONTAINS the separator", () => {
    // "Bonaire, Sint Eustatius and Saba" is a real country in ISO 3166, and
    // Country is one of the two facets whose vocabulary is the team's own
    // typing rather than a closed list. A plain comma join turns that one
    // value into three that match nothing, silently, on the one screen a
    // person would least expect it.
    const awkward = "Bonaire, Sint Eustatius and Saba"
    const wire = joinFacet([awkward, "Spain"])
    expect(wire, "the raw comma must not survive into the wire").not.toContain(", ")
    expect(splitFacet(wire)).toEqual([awkward, "Spain"])
  })

  it("an empty set and an absent parameter are the same thing", () => {
    // `IN ()` is not valid SQL in SQLite, and "named no value" cannot be told
    // apart from "did not ask". Anything else here is a filter that matches
    // nothing the moment somebody clears their last chosen value.
    expect(splitFacet("")).toEqual([])
    expect(splitFacet(null)).toEqual([])
    expect(splitFacet(undefined)).toEqual([])
    expect(joinFacet([])).toBe("")
  })

  it("drops blanks and duplicates, and keeps the order it was given", () => {
    expect(splitFacet("a,,b, a ,c")).toEqual(["a", "b", "c"])
  })

  it("guards the SIZE OF A REQUEST, far above anything a person can tick", () => {
    // NOT a product limit: the door's clause costs one bound parameter whether
    // the set holds one value or five hundred, so nothing here stands between
    // a reader and their eleventh pick. What is left is an untrusted string,
    // and the cut sits above every vocabulary this app has (131 clients is the
    // largest measured), so the only thing it can truncate is a hand-made
    // request.
    expect(FACET_VALUES_CAP, "the guard must stay clear of every real vocabulary").toBeGreaterThan(200)
    const many = Array.from({ length: FACET_VALUES_CAP + 20 }, (_, i) => `v${i}`)
    expect(splitFacet(many.join(",")).length).toBe(FACET_VALUES_CAP)
    expect(splitFacet(joinFacet(many)).length).toBe(FACET_VALUES_CAP)
  })

  it("a value that was never encoded still reads back", () => {
    // A hand-edited URL, or a caller written before the parameter learned to
    // carry a set. A malformed escape must not take the whole request down.
    expect(splitFacet("100%")).toEqual(["100%"])
  })
})

/* ── 2 · THE SQL ──────────────────────────────────────────────────────────── */

describe("what a facet becomes in a door's WHERE", () => {
  it("narrows on the COLUMN, carries every value, and an empty set is no clause", () => {
    // ASSERTED AS PROPERTIES, NOT AS A SPELLING. The exact SQL is this
    // helper's business and has already changed once (from `IN (?, ?, …)` to
    // a `json_each` subselect, so the parameter count stops growing with the
    // selection). A test that pins the string breaks on the next honest
    // rewrite and says nothing about whether the filter works.
    const one = inClause("country", ["Spain"])
    expect(one.sql, "the clause must narrow on the column it was given").toContain("country")
    expect(one.params.join(" "), "and carry the value").toContain("Spain")

    const two = inClause("country", ["Spain", "France"])
    expect(two.sql).toContain("country")
    expect(two.params.join(" ")).toContain("Spain")
    expect(two.params.join(" ")).toContain("France")

    expect(inClause("country", []), "an empty set is not a filter").toEqual({ sql: "", params: [] })
    expect(inClause("country", undefined)).toEqual({ sql: "", params: [] })
  })

  it("costs ONE bound parameter whatever the selection holds (D1 binds 100)", () => {
    // The defect this shape exists to prevent: a placeholder per value crosses
    // D1's hundred-parameter limit between two facets and 500s the door rather
    // than degrading. `workers/content/test/d1-parameter-cap.test.ts` is the
    // law; this is the property it rests on.
    const many = Array.from({ length: 300 }, (_, i) => `v${i}`)
    expect(inClause("country", ["Spain"]).params.length).toBe(1)
    expect(inClause("country", many).params.length).toBe(1)
    expect(inClause("country", many).sql).not.toContain("?, ?")
  })

  it("every value is a BOUND parameter, never interpolated", () => {
    // The one property that makes this safe to build from request text at all.
    const nasty = "'); DROP TABLE accounts; --"
    const clause = inClause("country", [nasty])
    expect(clause.sql, "nothing the caller typed may reach the statement text").not.toContain("DROP")
    expect(clause.params.join(" ")).toContain("DROP TABLE")
  })

  it("a two-word facet asked for BOTH words narrows nothing", () => {
    // Asking for every word a facet has is asking for no narrowing. A door
    // that took "both" as a filter would spend a scan saying nothing and the
    // count beside it would report a narrowing that is not one.
    const pair = ["yes", "no"] as const
    expect(oneOfPair(["yes"], pair)).toBe("yes")
    expect(oneOfPair(["no"], pair)).toBe("no")
    expect(oneOfPair(["yes", "no"], pair)).toBeUndefined()
    expect(oneOfPair([], pair)).toBeUndefined()
    expect(oneOfPair(["maybe"], pair)).toBeUndefined()
  })
})

/* ── 3 · THE BROWSER ──────────────────────────────────────────────────────── */

type Row = { id: string; account: string; stage: string }

const ROWS: Row[] = [
  { id: "1", account: "confia", stage: "open" },
  { id: "2", account: "etzi", stage: "open" },
  { id: "3", account: "confia", stage: "done" },
  { id: "4", account: "nordis", stage: "done" },
]

const CONFIG: CollectionConfig = {
  ...defaultCollectionConfig,
  filterFacets: [
    { field: "account", label: "Account", control: "select" },
    { field: "stage", label: "Stage", control: "select" },
  ],
}

const ids = (values: Record<string, string>) =>
  selectRows(ROWS, CONFIG, { facetValues: values }).filtered.map((r) => r.id)

describe("the browser narrows the way the door does", () => {
  it("TWO VALUES IN ONE FACET WIDEN — the second pick adds rows, never removes them", () => {
    const one = ids({ account: joinFacet(["confia"]) })
    const two = ids({ account: joinFacet(["confia", "etzi"]) })
    expect(one).toEqual(["1", "3"])
    expect(two).toEqual(["1", "2", "3"])
    expect(two.length, "a second value in one facet must widen").toBeGreaterThan(one.length)
    for (const id of one) expect(two, "and must never drop what the first one matched").toContain(id)
  })

  it("TWO FACETS NARROW — a set in each intersects, it does not union", () => {
    expect(ids({ account: joinFacet(["confia", "etzi"]), stage: joinFacet(["open"]) })).toEqual([
      "1",
      "2",
    ])
    expect(ids({ account: joinFacet(["confia", "etzi"]), stage: joinFacet(["done"]) })).toEqual(["3"])
  })

  it("THE COUNT AGREES WITH THE ROWS, at every intermediate state", () => {
    // `total` is what the overlay's own "Show N" prints. A widening that moved
    // the rows and not the total would tell somebody their second pick did
    // nothing — which is the one thing that number exists to say.
    const states: Record<string, string>[] = [
      {},
      { account: joinFacet(["confia"]) },
      { account: joinFacet(["confia", "etzi"]) },
      { account: joinFacet(["confia", "etzi"]), stage: joinFacet(["open"]) },
      { account: joinFacet(["nordis"]), stage: joinFacet(["open"]) },
    ]
    for (const values of states) {
      const slice = selectRows(ROWS, CONFIG, { facetValues: values })
      expect(slice.total, `the count disagreed with the rows for ${JSON.stringify(values)}`).toBe(
        slice.filtered.length
      )
    }
    expect(selectRows(ROWS, CONFIG, { facetValues: {} }).total).toBe(4)
    expect(
      selectRows(ROWS, CONFIG, { facetValues: { account: joinFacet(["confia", "etzi"]) } }).total
    ).toBe(3)
  })

  it("ONE VALUE CLEARS ON ITS OWN, and the rest keep narrowing", () => {
    // The coordinator's own clause: do not let the only way out of four
    // selections be four clicks — but one value leaving must also be possible,
    // and it must not take the others with it.
    const chosen = ["confia", "etzi", "nordis"]
    const all = ids({ account: joinFacet(chosen) })
    expect(all).toEqual(["1", "2", "3", "4"])
    const without = chosen.filter((v) => v !== "etzi")
    expect(ids({ account: joinFacet(without) })).toEqual(["1", "3", "4"])
    // And clearing the LAST one is the facet turned off, not a filter matching
    // nothing.
    expect(ids({ account: joinFacet([]) })).toEqual(["1", "2", "3", "4"])
  })

  it("an empty set narrows nothing, exactly as the door's own clause does", () => {
    expect(ids({ account: "" })).toEqual(ids({}))
  })
})

/* ── 4 · THE CENSUS ───────────────────────────────────────────────────────── */

describe("multi-select is the default and `single` is the named exception", () => {
  it("every facet the app declares takes several values unless its vocabulary is a pair", () => {
    const offenders: string[] = []
    let counted = 0
    for (const [collection, facets] of Object.entries(COLLECTION_FILTERS)) {
      for (const facet of facets) {
        counted++
        if (!facet.single) continue
        // A `single` facet must EARN it: exactly two declared options that are
        // opposites of each other. A facet over records or over an open
        // vocabulary declares no options at all here (the screen fills them
        // in), so it can never satisfy this and can never be pinned single.
        if ((facet.options?.length ?? 0) !== 2)
          offenders.push(
            `${collection}.${facet.field} is marked \`single\` but its vocabulary is ` +
              `${facet.options?.length ?? 0} option(s) — only a two-word pair earns it`
          )
      }
    }
    expect(counted, "the census found no facets at all — it has stopped matching").toBeGreaterThan(8)
    expect(offenders, offenders.join("\n")).toEqual([])
  })

  it("the facets her ruling is about are NOT single", () => {
    // Named rather than derived, because this is the half a census cannot
    // check: these are the controls she was looking at when she said it.
    const multi: Array<[string, string]> = [
      ["accounts", "manager"],
      ["accounts", "country"],
      ["help", "accountId"],
      ["help", "helpType"],
      ["help", "status"],
      ["knowledge", "compartment"],
      ["meetings", "accountId"],
      ["meetings", "purposeId"],
      ["processes", "appId"],
      ["workLogs", "userId"],
      ["workLogs", "accountId"],
    ]
    for (const [collection, field] of multi) {
      const facet = COLLECTION_FILTERS[collection]?.find((f) => f.field === field)
      expect(facet, `${collection}.${field} has left the declaration`).toBeTruthy()
      expect(facet?.single, `${collection}.${field} must take several values`).toBeFalsy()
    }
  })
})

/* ── 5 · THE CONTROL, DRIVEN FOR REAL ─────────────────────────────────────── */
//
// The four sections above prove the wire, the SQL and the browser's narrowing
// WITHOUT the control, which is what let them land a day before the kit tag
// that carries `CompactFacet`'s `multiple` mode. This section is the other
// half: the real `useFilterBar`, the real kit control, a real reader ticking
// real rows. It is what says the two ends actually meet.

describe("a person ticking several values in one facet", () => {
  beforeAll(() => {
    // Radix measures itself and captures the pointer; jsdom does neither.
    Object.assign(window.HTMLElement.prototype, {
      scrollIntoView: () => {},
      hasPointerCapture: () => false,
      releasePointerCapture: () => {},
      setPointerCapture: () => {},
    })
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver
    // `useHasRoom`'s one query. `test/setup.ts` answers false to everything,
    // which is "a phone" — a real case with its own coverage, but not this one.
    window.matchMedia = ((query: string) => ({
      matches: query.includes("min-width: 45rem"),
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
  })
  afterEach(cleanup)

  const ACCOUNT: FilterFacet = {
    field: "account",
    label: "Account",
    control: "select",
    options: [
      { value: "confia", label: "Confia" },
      { value: "etzi", label: "Etzi Haus" },
      { value: "nordis", label: "Nordis" },
    ],
  }
  const STAGE: FilterFacet = {
    field: "stage",
    label: "Stage",
    control: "select",
    options: [
      { value: "open", label: "Open" },
      { value: "done", label: "Done" },
    ],
  }
  /** A two-word facet whose words are opposites: the named exception. */
  const ARCHIVED: FilterFacet = {
    field: "archived",
    label: "Archived",
    control: "select",
    single: true,
    options: [
      { value: "no", label: "No" },
      { value: "yes", label: "Yes" },
    ],
  }

  function Harness({ facets }: { facets: FilterFacet[] }) {
    const [values, setValues] = React.useState<Record<string, string>>({})
    const filter = useFilterBar({
      facets,
      values,
      data: ROWS,
      // The live count the overlay's own "Show N" prints, computed the way a
      // screen computes it: off the narrowed rows, never off a snapshot.
      resultCount: selectRows(ROWS, CONFIG, { facetValues: values }).total,
      onChange: (field, value) =>
        setValues((was) => {
          const next = { ...was }
          if (value === "") delete next[field]
          else next[field] = value
          return next
        }),
      onClearFacets: () => setValues({}),
    })
    return (
      <>
        {filter}
        <span data-testid="values">{JSON.stringify(values)}</span>
        <span data-testid="rows">
          {selectRows(ROWS, CONFIG, { facetValues: values })
            .filtered.map((r) => r.id)
            .join(",")}
        </span>
      </>
    )
  }

  const openOverlay = () =>
    fireEvent.click(screen.getByRole("button", { name: /^Filter/, hidden: true }))
  /** THE OVERLAY, BY ITS SLOT. A facet's own open panel is a Radix popover and
   * therefore also `role="dialog"`, so a role query finds two the moment a
   * facet list is open. */
  const overlay = () => document.querySelector<HTMLElement>('[data-slot="filter-overlay"]')!
  const facetGroup = (label: string) => screen.getByRole("group", { name: label })
  const openFacet = (label: string) =>
    fireEvent.click(within(facetGroup(label)).getByRole("button"))
  const list = () => screen.getByRole("listbox")
  const tick = (name: string) => fireEvent.click(within(list()).getByRole("option", { name }))
  const said = () => screen.getByTestId("values").textContent
  const rows = () => screen.getByTestId("rows").textContent
  const closedField = () =>
    document.querySelector('[data-slot="compact-facet-value"]')?.textContent ?? ""

  it("SEVERAL IN ONE FACET: the list stays open, the set grows, and the rows widen", async () => {
    render(<Harness facets={[ACCOUNT, STAGE]} />)
    openOverlay()
    await screen.findByRole("dialog")
    openFacet("Account")
    await screen.findByRole("listbox")

    // The list says out loud that it takes several — a mark alone is a picture.
    expect(list().getAttribute("aria-multiselectable")).toBe("true")

    tick("Confia")
    await waitFor(() => expect(said()).toBe('{"account":"confia"}'))
    expect(rows()).toBe("1,3")
    // AND THE PANEL IS STILL OPEN, which is the whole reason a pick toggles
    // rather than commits: choosing three clients is one visit to the list.
    expect(screen.queryByRole("listbox"), "the list must not close on a pick").not.toBeNull()

    tick("Etzi Haus")
    await waitFor(() => expect(said()).toBe('{"account":"confia,etzi"}'))
    expect(rows(), "a second value in one facet WIDENS").toBe("1,2,3")
  })

  it("THE CLOSED FIELD SUMMARISES, in the app's own words", async () => {
    render(<Harness facets={[ACCOUNT, STAGE]} />)
    openOverlay()
    await screen.findByRole("dialog")
    expect(closedField(), "nothing chosen is the placeholder").toContain("Any account")

    openFacet("Account")
    await screen.findByRole("listbox")
    tick("Confia")
    await waitFor(() => expect(closedField()).toBe("Confia"))
    tick("Etzi Haus")
    await waitFor(() => expect(closedField()).toBe("Confia +1"))
    tick("Nordis")
    await waitFor(() => expect(closedField()).toBe("Confia +2"))
  })

  it("TWO FACETS STILL NARROW — the row holds both, and the rows intersect", async () => {
    render(<Harness facets={[ACCOUNT, STAGE]} />)
    openOverlay()
    await screen.findByRole("dialog")

    openFacet("Account")
    await screen.findByRole("listbox")
    tick("Confia")
    tick("Etzi Haus")
    await waitFor(() => expect(rows()).toBe("1,2,3"))
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" })

    openFacet("Stage")
    await screen.findByRole("listbox")
    tick("Open")
    await waitFor(() => expect(said()).toBe('{"account":"confia,etzi","stage":"open"}'))
    expect(rows(), "a second FACET narrows what the first one widened").toBe("1,2")
  })

  it("THE COUNT AGREES WITH THE ROWS at every intermediate state", async () => {
    // "Show N" is the only thing on screen that says a pick did anything.
    const showsNow = () => within(overlay()).getByRole("button", { name: /^Show / }).textContent
    render(<Harness facets={[ACCOUNT, STAGE]} />)
    openOverlay()
    await screen.findByRole("dialog")
    expect(showsNow()).toBe("Show 4")

    openFacet("Account")
    await screen.findByRole("listbox")
    tick("Confia")
    await waitFor(() => expect(showsNow()).toBe("Show 2"))
    expect(rows()?.split(",").length).toBe(2)

    tick("Etzi Haus")
    await waitFor(() => expect(showsNow()).toBe("Show 3"))
    expect(rows()?.split(",").length).toBe(3)
  })

  it("ONE VALUE CLEARS ON ITS OWN, and the whole facet clears in one press", async () => {
    render(<Harness facets={[ACCOUNT, STAGE]} />)
    openOverlay()
    await screen.findByRole("dialog")
    openFacet("Account")
    await screen.findByRole("listbox")
    tick("Confia")
    tick("Etzi Haus")
    tick("Nordis")
    await waitFor(() => expect(said()).toBe('{"account":"confia,etzi,nordis"}'))

    // ONE AT A TIME: a row that is already on turns itself off, and takes
    // nothing else with it.
    tick("Etzi Haus")
    await waitFor(() => expect(said()).toBe('{"account":"confia,nordis"}'))
    expect(rows()).toBe("1,3,4")

    // AND THE WAY OUT OF WHAT IS LEFT, in one press rather than two more.
    tick("Any account")
    await waitFor(() => expect(said()).toBe("{}"))
    expect(rows()).toBe("1,2,3,4")
  })

  it("a TWO-WORD facet stays single-select — there is nothing there to multi-select", async () => {
    render(<Harness facets={[ACCOUNT, ARCHIVED]} />)
    openOverlay()
    await screen.findByRole("dialog")
    openFacet("Archived")
    await screen.findByRole("listbox")
    expect(
      list().getAttribute("aria-multiselectable"),
      "ticking both words of a pair is asking for no narrowing, so the control does not offer it"
    ).toBeNull()
    tick("Yes")
    await waitFor(() => expect(said()).toBe('{"archived":"yes"}'))
    // A single-select list closes on a pick, which is the other half of the
    // same contract.
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull())
  })

  it("`FACET_SPAN` reads the same number whether a facet takes one value or five", () => {
    // This is what keeps the popover-or-sheet decision honest: a multi-select
    // facet keeps its list BEHIND a closed field in both modes, so it is
    // exactly as tall as a single-select one and `filterOverlayForm` reads the
    // same span. If multi-select had cost a row, every four-facet collection
    // would have silently become a drop sheet.
    const span = (facets: FilterFacet[]) =>
      facets.reduce((n, f) => n + (f.control === "range" ? FACET_SPAN.range : FACET_SPAN.field), 0)
    expect(span([ACCOUNT, STAGE])).toBe(2)
    expect(span([ACCOUNT, STAGE, ARCHIVED])).toBe(3)
    expect(filterOverlayForm(span([ACCOUNT, STAGE, ARCHIVED]), true)).toBe("popover")
    expect(filterOverlayForm(span([ACCOUNT, STAGE, ARCHIVED, ACCOUNT]), true)).toBe("sheet")
    // And a facet marked `single` costs exactly what a multi one costs.
    expect(span([ARCHIVED])).toBe(span([ACCOUNT]))
  })
})
