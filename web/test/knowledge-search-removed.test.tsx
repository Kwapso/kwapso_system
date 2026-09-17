// KNOWLEDGE IS AN ARCHIVE NOW, NOT A SECOND SEARCH BOX — B0296/T3659.
//
// The 16 Sep 2026 review meeting, verbatim: "Remove KB search bar, convert KB
// view to archive/source-manager, centralize search through assistant." And
// the ticket itself: "KB has two overlapping search entry points (its own
// search bar + the assistant chat). Decision: kill the KB's own search bar,
// turn that view into a pure archive/source-management screen, redirect all
// searching through the assistant."
//
// The knowledge screen used to stack <AskTheAssistant/> above a <PagedFind
// placeholder="Search"> list — two search-shaped controls. The fix is a new
// `search` prop on `PagedFind` itself (paged-find.tsx), defaulting `true` (so
// every other caller — accounts, tickets, contacts, inputs, meetings,
// processes, stories — is byte-for-byte unchanged), with the knowledge call
// site in `web/components/deep-link/collection-content.tsx` the one place
// that passes `search={false}`. R48's own `TOOLBAR_EXEMPT["knowledge.list"]`
// entry carries the reasoned WHY; this file proves the MECHANISM (the field
// really does stop rendering, and nothing else in the row does) and the
// WIRING (the real call site really does pass the prop).
//
// THREE PROOFS, not one, because a mechanism nobody wires is invisible and a
// wiring census with no working mechanism behind it is a prop nobody reads:
//
//   1. THE DEFAULT — every other <PagedFind> caller still gets a search box
//      when it passes no `search` prop at all. The regression this guards
//      against: `search` silently defaulting to `false` would kill search on
//      Accounts, Tickets, Contacts and every other paged collection in the
//      app, and only a screen that explicitly renders one would notice.
//   2. THE KNOWLEDGE SHAPE — `search={false}` over knowledge-shaped facets
//      (compartment/kind/active), a sort and the List·Shape view switch:
//      no search box, and everything else in the row still there. Proves the
//      client's own second sentence too — the facets and the view switch
//      browse, they do not search, and removing search must not have taken
//      them with it.
//   3. THE REAL CALL SITE — read off disk, the same technique R48/R50/R53's
//      own censuses in rules.test.ts already use: the knowledge branch's own
//      <PagedFind> tag carries `search={false}` and still carries `facets=`
//      and `view=`. A render-level proof alone could pass while the real
//      screen quietly reverted to the default; this is what stops that.

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it } from "vitest"

import { PagedFind, type FindQuery } from "@/components/records/paged-find"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, "..", "..")

type Row = { id: string; name: string }

/** Radix measures itself and captures the pointer; jsdom does neither — the
 * same polyfill `paged-find-toolbar-is-one-container.test.tsx` carries, needed
 * here so the filter pill and the view switch actually open/render. */
beforeAll(() => {
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
})

afterEach(cleanup)

const fetchPage = async (_query: FindQuery, _cursor: string | null) => ({
  rows: [{ id: "a", name: "A source" }] as Row[],
  nextCursor: null,
  total: 1,
})

/** The knowledge screen's own three facets (web/lib/collection-filters.ts),
 * reproduced here rather than imported — this test is about the ROW's
 * behaviour given that shape, not a second copy of the door's vocabulary. */
const knowledgeFacets = [
  {
    field: "kind",
    label: "Type",
    control: "select" as const,
    options: [
      { value: "meeting", label: "From a meeting" },
      { value: "ticket", label: "From a ticket" },
    ],
  },
  { field: "compartment", label: "Filed under", control: "select" as const, options: [{ value: "agency", label: "The agency" }] },
  {
    field: "active",
    label: "Status",
    control: "select" as const,
    options: [
      { value: "yes", label: "In use" },
      { value: "no", label: "Not in use" },
    ],
  },
]

const knowledgeSorts = [{ value: "recent", label: "Newest first", defaultDir: "desc" as const }]

const knowledgeView = {
  views: [
    { value: "list", label: "List" },
    { value: "shape", label: "Shape" },
  ],
  value: "list",
  onValueChange: () => {},
}

describe("PagedFind's own `search` prop — the mechanism (B0296/T3659)", () => {
  it("defaults to true: every caller that passes no `search` prop still gets a search box", () => {
    render(
      <PagedFind<Row>
        listKey={`test:${Math.random()}`}
        placeholder="Search"
        matches={{ none: "No matches", one: "1 match", many: "{count} matches" }}
        restingEmpty={false}
        fetchPage={fetchPage}
      >
        {() => <div data-testid="rows" />}
      </PagedFind>
    )
    expect(
      screen.queryByRole("searchbox"),
      "the default must stay `true` — Accounts, Tickets, Contacts and every other <PagedFind> caller passes no `search` prop at all"
    ).not.toBeNull()
  })

  it("search={false}: no search box, and the facets/sort/view switch it sits beside are untouched", async () => {
    render(
      <PagedFind<Row>
        listKey={`test:${Math.random()}`}
        placeholder="Search"
        search={false}
        matches={{ none: "No matches", one: "1 match", many: "{count} matches" }}
        facets={knowledgeFacets}
        sorts={knowledgeSorts}
        defaultSort="recent"
        view={knowledgeView}
        restingEmpty={false}
        fetchPage={fetchPage}
      >
        {() => <div data-testid="rows" />}
      </PagedFind>
    )

    // THE FIELD ITSELF IS GONE — no <SearchInput> (type="search") anywhere in
    // the row, by role or by the raw input type the kit renders it as.
    expect(screen.queryByRole("searchbox")).toBeNull()
    expect(document.querySelector('input[type="search"]')).toBeNull()

    // EVERYTHING ELSE IN THE ROW STAYS — the client's own second sentence:
    // the facets and the view switch browse, they do not search.
    expect(
      screen.getByRole("button", { name: /^Filter/ }),
      "the filter pill (compartment/kind/active) must still draw"
    ).toBeTruthy()
    expect(
      document.querySelector('[data-slot="view-switch"]'),
      "the List·Shape view switch must still draw"
    ).toBeTruthy()
    // A sort control renders too — some accessible control naming the one
    // sort option offered.
    expect(screen.getByText("Newest first")).toBeTruthy()
  })
})

describe("the real knowledge call site (collection-content.tsx) — the wiring", () => {
  it("passes search={false} to its <PagedFind>, and still passes facets and a view switch", () => {
    const src = readFileSync(
      join(ROOT, "web", "components", "deep-link", "collection-content.tsx"),
      "utf8"
    )
    const at = src.indexOf("<PagedFind<KnowledgeSource>")
    expect(at, "the knowledge module's own <PagedFind<KnowledgeSource>> call site").toBeGreaterThan(-1)

    // A FIXED WINDOW, not a walk to the tag's own closing `>` — the same
    // reason rules.test.ts's own `findBars()` reads 1,800 characters on
    // rather than parsing the tag precisely: `<PagedFind<KnowledgeSource>`
    // carries a generic, so a bracket-depth walk that does not also track
    // angle-depth stops at the GENERIC's own `>` four characters in and
    // reports every prop below it as absent.
    const tag = src.slice(at, at + 1800)

    expect(tag, "the fix: this call site opts out of the row's own default").toContain("search={false}")
    expect(tag, "R48's own client sentence — facets browse, they are not search").toMatch(/\bfacets=\{/)
    expect(tag, "the List·Shape view switch must still be wired").toMatch(/\bview=\{/)
    // NEGATIVE CONTROL — the removed prop really is gone, not merely
    // shadowed by a later one further down the file.
    expect(tag, "the old, now-wrong placeholder wiring must not remain").not.toMatch(/placeholder=\{t\("Search"\)\}/)
  })
})
