// R50 ON THE PATH MOST SCREENS ACTUALLY TAKE — the engine's own header, drawn
// over a collection with nothing in it.
//
// WHY THIS FILE EXISTS BESIDE cold-account.test.tsx, WHICH ALREADY ASKS THIS.
// That suite draws six real recipes empty and asserts no search box, no count
// and no filter pill — and it passed every day the bug below was live, because
// its own `drawCollection` passes `useKitPanel`. `CollectionFrame` has two
// header implementations: the kit-panel branch, which got the client's 2 Sep
// ruling, and the app-drawn branch, which did not. `useKitPanel` DEFAULTS TO
// FALSE, and three live screen files render `<ScreenRenderer>` without ever
// mentioning it — contacts-screen.tsx, contacts-by-company.tsx and
// deep-link/module-content.tsx. So the guarded branch was the one under test
// and the unguarded one was the one under people.
//
// That is the same shape as the two failures CLAUDE.md already records for this
// rule: the law is right, and the instrument walks somewhere the violation
// cannot be. R48 asked only whether `search` was passed; R50's census reads
// `<ToolbarRow>`/`<PagedFind>` call sites and the engine draws neither; and the
// newest render test picks the branch that was already fixed. Three instruments,
// one blind spot, four recurrences.
//
// So this asks the same question with `useKitPanel` LEFT OFF — the live default
// — and it asks it of the DOM rather than of the source, because every previous
// attempt to settle this by reading the file reached a confident wrong answer,
// including two this week.
//
// THE CANARY IS NOT OPTIONAL HERE. Every assertion below is an ABSENCE, and an
// absence assertion passes perfectly against a tree that rendered nothing at all
// — a thrown hook, a missing gate, a recipe key that no longer exists. So each
// empty render must first prove it reached its own empty state, and the same
// recipe is drawn again WITH a row to prove the search box appears when it
// should. A test that cannot fail is not evidence.

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/api", () => ({
  tenancy: { myPermissions: () => Promise.resolve({}) },
  content: { insights: () => Promise.resolve({}) },
}))

import { CollectionCreateActionProvider } from "@shared/web/screen-engine/collection-frame"
import { ScreenRenderer } from "@shared/web/screen-engine/screen-renderer"
import { BASE_RECIPES } from "@/lib/screens"
import { clearCache } from "@shared/web/store"

afterEach(() => {
  cleanup()
  clearCache()
})

/** The six the cold walk already names, so the two suites disagree about the
 * BRANCH and about nothing else. */
const COLLECTIONS: [key: string, emptySentence: string][] = [
  ["accounts.list", "No accounts yet."],
  ["roles.list", "No roles yet."],
  ["invites.list", "No invites yet."],
  ["meetings.list", "Nothing in Meetings yet."],
  ["contacts.list", "No contacts yet."],
  ["members.list", "No members yet."],
]

const ALL_FOUR = { read: true, create: true, edit: true, delete: true }
/** Every module any recipe here gates on. A recipe whose gate is missing draws
 * NOTHING, which would satisfy every absence assertion below. */
const EVERY_RIGHT = new Proxy({} as Record<string, typeof ALL_FOUR>, {
  get: () => ALL_FOUR,
  has: () => true,
})

/** Draw one recipe through the engine with `useKitPanel` LEFT OFF — the default
 * every un-migrated screen takes. Fails loudly on an empty tree: `render` is
 * happy to hand back nothing, and nothing passes an absence test. */
function drawDefaultPath(key: string, rows: Record<string, unknown>[]) {
  expect(BASE_RECIPES[key], `${key} is gone from BASE_RECIPES`).toBeTruthy()
  const view = render(
    <CollectionCreateActionProvider action={{ label: "New", onCreate: () => {} }}>
      <ScreenRenderer
        recipe={BASE_RECIPES[key]}
        data={{ rows: rows as never }}
        rights={EVERY_RIGHT as never}
        onAction={() => {}}
        onIntent={() => {}}
      />
    </CollectionCreateActionProvider>
  )
  expect(
    view.container.innerHTML.length,
    `${key} rendered an EMPTY TREE — every absence assertion below would pass against it`
  ).toBeGreaterThan(0)
  return view
}

/** Does this recipe's collection declare a search box at all?
 *
 * THREE OF THE SIX DO NOT, and the difference is not cosmetic: `accounts`,
 * `meetings` and `contacts` are R14 GROWING collections, so they page by key and
 * their search lives in `<PagedFind>` rather than in this frame
 * (`searchable: false`, `showCount: false`). Asserting "no search box when
 * empty" against one of those passes for a reason that has nothing to do with
 * R50 — it never had one — which is exactly the vacuous pass this file exists
 * to stop happening again. So the assertion is asked only of the recipes that
 * can actually answer it, and the suite proves below that some can. */
const isSearchable = (key: string) => BASE_RECIPES[key].collection?.searchable === true

describe("R50 · the engine's own header draws no toolbar over an empty collection", () => {
  it("the suite is not vacuous — some of these recipes really do draw a search box", () => {
    // Without this, a change that set `searchable: false` everywhere would turn
    // every assertion below into a tautology and the file would stay green
    // while measuring nothing.
    expect(
      COLLECTIONS.filter(([key]) => isSearchable(key)).map(([key]) => key).length,
      "no recipe here declares a search box — every emptiness assertion below is vacuous"
    ).toBeGreaterThan(0)
  })

  it.each(COLLECTIONS)("%s draws no search, no count and no filter pill", (key, sentence) => {
    const { container } = drawDefaultPath(key, [])
    // POSITIVE FIRST: it really is the empty state we are looking at, not a
    // gate refusing or a shaper throwing.
    expect(screen.getByText(sentence), `${key} never reached its empty state`).toBeTruthy()

    if (isSearchable(key))
      expect(
        container.querySelector("input"),
        `${key} draws a search box over zero rows on the DEFAULT header path`
      ).toBeNull()
    expect(
      screen.queryByText(/^Showing /),
      `${key} counts rows on an empty collection ("Showing 0 of 0" over an empty state)`
    ).toBeNull()
    expect(
      screen.queryByText(/results$/),
      `${key} draws a filter pill over zero rows`
    ).toBeNull()
  })

  it.each(COLLECTIONS)("%s CANARY — one row and the toolbar comes back", (key, sentence) => {
    // THE ASSERTION ABOVE MUST BE ABLE TO FAIL. The same recipe, one row, and
    // the search box has to reappear — otherwise "no search box when empty"
    // would be satisfied by a frame that never draws one at all.
    //
    // The same word in every field: these six recipes title their rows from
    // different columns (Invites reads `email`, the rest read `name`), so a
    // fixture pinned to one field reports "no row" on the others and the canary
    // silently stops canarying.
    const row = { id: "r1", name: "Findable", email: "findable@example.com", title: "Findable" }
    const { container } = drawDefaultPath(key, [row])
    expect(screen.queryByText(sentence), `${key} still shows its empty sentence WITH a row`).toBeNull()
    if (isSearchable(key))
      expect(
        container.querySelector("input"),
        `${key} draws no search box even with a row — the emptiness test above proves nothing`
      ).not.toBeNull()
  })
})
