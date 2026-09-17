// KNOWLEDGE SEARCHES AGAIN — B0296/T3659's "no search box anywhere on this
// screen" is reversed. The 17 Sep 2026 review, verbatim: "Also add the search
// to the toolbar. It's missing."
//
// This file used to be knowledge-search-removed.test.tsx, proving the OPPOSITE
// of what it now proves — that name would lie about the current screen, so it
// is renamed rather than left to describe a shape that no longer exists.
//
// The knowledge screen used to stack an inline `<AskTheAssistant/>` box above a
// `<PagedFind search={false}>` list. Two things changed on the same ruling: the
// box is gone outright (client, 17 Sep 2026: "remove the whole modal 'Ask a
// question'" — the mango "Ask" button in the head is the one way in now), and
// the list's own search field is back — `search={false}` deleted from the real
// call site, so `<PagedFind>` falls back to its own default (`search = true`,
// paged-find.tsx) exactly like every other paged collection in the app.
//
// TWO PROOFS, not one, because a mechanism nobody exercises is invisible and a
// wiring census alone cannot show the mechanism still behaves correctly:
//
//   1. THE DEFAULT — every `<PagedFind>` caller that passes no `search` prop
//      gets a real search box, knowledge included now. The regression this
//      guards against: `search` silently defaulting to `false` would kill
//      search on Accounts, Tickets, Contacts, Knowledge and every other paged
//      collection in the app, and only a screen that explicitly renders one
//      would notice.
//   2. THE REAL CALL SITE — read off disk, the same technique R48/R50/R53's
//      own censuses in rules.test.ts already use: the knowledge branch's own
//      `<PagedFind>` tag carries a real `placeholder`, never `search={false}`,
//      and still carries `facets=` and `view=` beside it. A render-level proof
//      alone could pass while the real screen quietly kept the old prop; this
//      is what stops that.

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

describe("PagedFind's own `search` default — the mechanism", () => {
  it("defaults to true: a caller that passes no `search` prop still gets a search box, over the knowledge shape too", () => {
    render(
      <PagedFind<Row>
        listKey={`test:${Math.random()}`}
        placeholder="Search sources…"
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
    expect(
      screen.queryByRole("searchbox"),
      "the default must stay `true` — Accounts, Tickets, Contacts, Knowledge and every other <PagedFind> caller passes no `search` prop at all"
    ).not.toBeNull()

    // EVERYTHING ELSE IN THE ROW STAYS ALONGSIDE IT — the facets and the view
    // switch narrow what is filed, the search box narrows/asks the door too,
    // and none of the three crowds another out.
    expect(
      screen.getByRole("button", { name: /^Filter/ }),
      "the filter pill (compartment/kind/active) must still draw"
    ).toBeTruthy()
    expect(
      document.querySelector('[data-slot="view-switch"]'),
      "the List·Shape view switch must still draw"
    ).toBeTruthy()
  })
})

describe("the real knowledge call site (knowledge-screen.tsx) — the wiring", () => {
  it("carries a real placeholder, never `search={false}`, and still passes facets and a view switch", () => {
    // SPLIT OUT OF collection-content.tsx, 17 Sep 2026 (K2 by kind) — the
    // knowledge branch became its own component the same way accounts/
    // contacts/tickets already are, because the kind-tab strip's own R16
    // badges need a live sidecar read only a real component can hold. The
    // wiring this test proves moved with it.
    const src = readFileSync(join(ROOT, "web", "components", "knowledge", "knowledge-screen.tsx"), "utf8")
    const at = src.indexOf("<PagedFind<KnowledgeSource>")
    expect(at, "the knowledge module's own <PagedFind<KnowledgeSource>> call site").toBeGreaterThan(-1)

    // A FIXED WINDOW, not a walk to the tag's own closing `>` — the same
    // reason rules.test.ts's own `findBars()` reads 1,800 characters on
    // rather than parsing the tag precisely: `<PagedFind<KnowledgeSource>`
    // carries a generic, so a bracket-depth walk that does not also track
    // angle-depth stops at the GENERIC's own `>` four characters in and
    // reports every prop below it as absent.
    const tag = src.slice(at, at + 1800)

    // THE FIX: `search={false}` is gone — the row draws its own default now.
    expect(
      tag,
      "the client's 17 Sep ruling: \"Also add the search to the toolbar. It's missing.\" — no opt-out on this call site any more"
    ).not.toContain("search={false}")
    expect(tag, "a real placeholder replaces the removed search-off prop").toMatch(/placeholder=\{t\(/)
    expect(tag, "facets browse, and still do — unrelated to the search box's return").toMatch(/\bfacets=\{/)
    expect(tag, "the List·Shape view switch must still be wired").toMatch(/\bview=\{/)
  })

  it("no longer mounts the inline AskTheAssistant box — client ruling, 17 Sep 2026: \"remove the whole modal 'Ask a question'\"", () => {
    const src = readFileSync(join(ROOT, "web", "components", "knowledge", "knowledge-screen.tsx"), "utf8")
    expect(src).not.toMatch(/<AskTheAssistant\s*\/>/)
    expect(src).not.toMatch(/from "@\/components\/assistant\/ask-the-assistant"/)
  })
})
