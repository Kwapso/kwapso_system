// T3654, its real cause — not the store.ts race the first pass fixed, but a
// second, independent gap the live repro on staging surfaced: a nested panel
// that passes `fixed` to `<PagedFind>` (an app's own Tickets/Stories/
// Processes/Sprints/Meetings tab, a ticket's Related stories, a sprint's own
// stories) is ALWAYS "active" — `fixed`'s fields fold straight into `query`,
// so `Object.keys(query).length > 0` is never false — which means its rows
// come from `findKeyFor(listKey, query)`, a DIFFERENT, query-shaped cache key,
// and NEVER from `listKey` itself. Every one of these panels' create dialogs
// called `invalidate(sliceKey(...))` — the resting key — and none of them
// touched the find key, so the row a person just created sat in the door,
// correctly, and never reached the screen without a hard reload.
//
// Proved live on staging before the fix: badge 25→26, the new ticket never
// appeared, 5+ seconds of waiting changed nothing, only a full reload showed
// it. This test reproduces the same shape against the REAL `store.ts` (not
// mocked) — `invalidateFindsOf` is the fix, and this proves it actually
// reaches what `<PagedFind fixed={...}>` reads from.

import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { PagedFind, invalidateFindsOf } from "@/components/records/paged-find"
import { clearCache } from "@shared/web/store"

afterEach(() => {
  cleanup()
  clearCache()
})

describe("a fixed <PagedFind> panel reaches its own create", () => {
  it("shows a freshly created row once invalidateFindsOf is called — never on its own", async () => {
    let rows = ["Existing ticket"]
    render(
      <PagedFind<string>
        listKey="tickets-app-of:app-1"
        fixed={{ appId: "app-1" }}
        placeholder="Search"
        matches={{ none: "No matches", one: "1 match", many: "{count} matches" }}
        restingEmpty={false}
        fetchPage={async () => ({ rows, nextCursor: null, total: rows.length })}
      >
        {(found) => (
          <ul>
            {(found.active ? found.rows ?? [] : []).map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}
      </PagedFind>
    )

    await waitFor(() => expect(screen.getByText("Existing ticket")).toBeTruthy())
    expect(screen.queryByText("A brand new ticket")).toBeNull()

    // The write commits — the door now has a new row — and the creating
    // screen calls the fix.
    rows = ["A brand new ticket", "Existing ticket"]
    invalidateFindsOf("tickets-app-of:app-1")

    await waitFor(() => expect(screen.getByText("A brand new ticket")).toBeTruthy())
  })

  it("without the fix, invalidating only the resting key leaves a fixed panel stale", async () => {
    // THE NEGATIVE CONTROL — proves the OLD code's own call
    // (`invalidate(sliceKey(...))`, the resting key) really does nothing for a
    // `fixed` panel, so the bug this file is about is not hypothetical.
    const { invalidate } = await import("@shared/web/store")
    let rows = ["Existing ticket"]
    render(
      <PagedFind<string>
        listKey="tickets-app-of:app-2"
        fixed={{ appId: "app-2" }}
        placeholder="Search"
        matches={{ none: "No matches", one: "1 match", many: "{count} matches" }}
        restingEmpty={false}
        fetchPage={async () => ({ rows, nextCursor: null, total: rows.length })}
      >
        {(found) => (
          <ul>
            {(found.active ? found.rows ?? [] : []).map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}
      </PagedFind>
    )
    await waitFor(() => expect(screen.getByText("Existing ticket")).toBeTruthy())

    rows = ["A brand new ticket", "Existing ticket"]
    invalidate("tickets-app-of:app-2") // the OLD, insufficient call

    // Give any real refetch every chance to land — none should, because this
    // key is never the one the fixed panel reads from.
    await new Promise((r) => setTimeout(r, 50))
    expect(screen.queryByText("A brand new ticket")).toBeNull()
  })
})
