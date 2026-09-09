// THE PAGED SEARCH BOX, PROVED TO ASK THE DOOR ONCE PER WORD.
//
// ── WHAT THIS SUITE IS ABOUT ────────────────────────────────────────────────
//
// `paged-find.tsx` carried a comment saying its box was "Debounced upstream by
// SearchInput (200ms), so a keystroke is not a request." It was not. The kit's
// `SearchInput` holds one piece of state — whether the field is non-empty, so
// it knows whether to draw its own ✕ — and calls `onChange` synchronously; there
// is no timer in the file. So every letter built a new `query`, a new `findKey`
// and a new `useCached` subscription: a door read per keystroke, each into a
// cache entry of its own, across all nine of this component's call sites.
//
// THE COMMENT IS WHY NOBODY NOTICED, and it is also why this file exists. A
// debounce is the exact class of thing that looks right from the outside and is
// not: the rows are correct, the count is correct, the screen is calm, and the
// only witnesses are the network tab and the bill. Nothing a person can see
// distinguishes one read per word from one read per letter, which means nothing
// but a test can hold this shut — and the previous defence was a sentence.
//
// So the assertions below are about COUNTS and about the CLOCK, deliberately,
// rather than about anything on screen:
//
//   · a burst of keystrokes with the clock stopped must produce ZERO reads —
//     this is the half that fails if the debounce is missing, and only this
//     half; every "does the search work" test in the app passes either way;
//   · advancing the clock past the delay must then produce exactly ONE, for
//     the SETTLED word and never for a prefix of it;
//   · clearing must not wait at all, and must not be undone a moment later by
//     a trailing timer nobody cancelled;
//   · a click on a facet or the sort control must NOT be delayed — the
//     debounce is on the typed term alone, and a fix that quieted the whole
//     toolbar would make every other control feel broken.
//
// It follows the shape of `dashboard-search-is-a-real-read.test.tsx`, which
// proves the same property for the tickets dashboard's own box.

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import type { FilterFacet } from "@shared/web/screen-engine/config"

import { PagedFind, type FindQuery } from "@/components/records/paged-find"

// The facet panel's popover measures itself; jsdom has no ResizeObserver. The
// same stub `facets-ask-the-door.test.tsx` installs, for the same reason.
beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

type Row = { id: string; name: string }

/** EVERY QUESTION THE DOOR WAS ACTUALLY ASKED, in order. The real `useCached`
 * is used rather than a stub, so an entry here is a fetch the component's own
 * key change caused — which is the only thing that can tell one read per word
 * from one read per letter. */
function fakeDoor() {
  const asked: FindQuery[] = []
  const fetchPage = async (query: FindQuery) => {
    asked.push({ ...query })
    return { rows: [{ id: "a", name: "x" }] as Row[], nextCursor: null, total: 1 }
  }
  return { asked, fetchPage }
}

/** The module-level store outlives a test, so every test gets a collection of
 * its own — otherwise the second test to search "invoice" reads the first
 * one's answer out of the cache and never calls the door at all. */
let n = 0
const freshKey = () => `accounts:team-debounce-${++n}`

const FACETS: FilterFacet[] = [
  {
    field: "kind",
    label: "Kind",
    control: "select",
    options: [
      { value: "note", label: "Note" },
      { value: "file", label: "File" },
    ],
  },
]

const SORTS = [
  { value: "created", label: "Newest", defaultDir: "desc" as const },
  { value: "name", label: "Name", defaultDir: "asc" as const },
]

function draw(
  fetchPage: ReturnType<typeof fakeDoor>["fetchPage"],
  props: { facets?: typeof FACETS; sorts?: typeof SORTS } = {}
) {
  return render(
    <PagedFind<Row>
      listKey={freshKey()}
      placeholder="Search accounts…"
      matches={{
        none: "No accounts match",
        one: "1 account matches",
        many: "{count} accounts match",
      }}
      facets={props.facets ?? []}
      sorts={props.sorts ?? []}
      defaultSort={props.sorts ? "created" : ""}
      restingEmpty={false}
      fetchPage={fetchPage}
    >
      {(found) => <div data-testid="body">{found.active ? "found" : "resting"}</div>}
    </PagedFind>
  )
}

const box = () => screen.getByPlaceholderText("Search accounts…") as HTMLInputElement
const body = () => screen.getByTestId("body").textContent

/** One keystroke. Separate from `settle` on purpose: calling this alone, and
 * then counting, is the whole proof that the request has NOT been made yet. */
function typeInto(word: string) {
  act(() => {
    fireEvent.change(box(), { target: { value: word } })
  })
}

/** Advance the clock past the 200ms delay and let the fetch's promises run. */
async function settle(ms = 250) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe("a five-letter word is one door read, not five", () => {
  it("asks nothing at all while the letters are still arriving", () => {
    const door = fakeDoor()
    draw(door.fetchPage)
    expect(door.asked.length, "an untouched box asks the door nothing").toBe(0)

    // THE BURST, one letter at a time, exactly as a keyboard produces it. This
    // is the assertion the missing debounce failed, and the only one that
    // could have caught it.
    for (const partial of ["c", "co", "con", "conf", "confi", "confia"]) typeInto(partial)
    expect(
      door.asked.length,
      "a keystroke fired a door read — the debounce is missing, or it is not on the term"
    ).toBe(0)
  })

  it("…and then exactly one, for the whole word", async () => {
    const door = fakeDoor()
    draw(door.fetchPage)
    for (const partial of ["c", "co", "con", "conf", "confi", "confia"]) typeInto(partial)
    await settle()

    expect(door.asked.length, "the settled term never reached the door").toBe(1)
    expect(door.asked[0].q, "a PREFIX reached the door — a trailing call fired early").toBe(
      "confia"
    )
  })

  it("the box keeps up with the keyboard while the request runs behind it", () => {
    // The other half, and the half a person feels. A field showing only the
    // settled value would swallow letters for a fifth of a second, which reads
    // as a broken keyboard rather than as a patient search.
    const door = fakeDoor()
    draw(door.fetchPage)
    typeInto("con")
    expect(box().value).toBe("con")
    expect(door.asked.length).toBe(0)
  })

  it("a second word is a second read, and only one", async () => {
    const door = fakeDoor()
    draw(door.fetchPage)
    typeInto("confia")
    await settle()
    for (const partial of ["h", "ho", "hos", "host", "hosti", "hostin", "hosting"])
      typeInto(partial)
    expect(door.asked.length, "the second word's keystrokes fired reads too").toBe(1)
    await settle()

    expect(door.asked.map((a) => a.q)).toEqual(["confia", "hosting"])
  })

  it("pausing mid-word asks for what has been typed so far, then for the rest", async () => {
    // A debounce is not a "wait for the first result then stop": someone who
    // types three letters, reads the screen, then types three more must get an
    // answer to both questions. This is the property `maxWait` would break if
    // anybody ever reached for it here.
    const door = fakeDoor()
    draw(door.fetchPage)
    typeInto("con")
    await settle()
    typeInto("confia")
    await settle()

    expect(door.asked.map((a) => a.q)).toEqual(["con", "confia"])
  })
})

describe("clearing is immediate, never debounced", () => {
  it("the ✕ puts the screen back on the resting list with no wait", async () => {
    const door = fakeDoor()
    draw(door.fetchPage)
    typeInto("confia")
    await settle()
    expect(body(), "the find should be on").toBe("found")

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /clear/i }))
    })
    // NO `settle()` HERE, deliberately. "Show me everything again" is one
    // decided act, and it is the one moment a 200ms wait is noticed — a person
    // watching a narrowed list for a fifth of a second AFTER asking for all of
    // it. Read off what the children were handed, because there is no door
    // call to read: the resting collection is the screen's own list, already
    // in hand, so clearing costs nothing at all.
    expect(body(), "clearing waited out the debounce").toBe("resting")
    expect(box().value).toBe("")
  })

  it("emptying the box by hand is the same act, and just as immediate", () => {
    // Holding backspace and clicking the ✕ produce the same empty string and
    // the same intent, so they must not be two behaviours. The decision is made
    // on the VALUE rather than in two handlers that could drift.
    const door = fakeDoor()
    draw(door.fetchPage)
    typeInto("confia")
    typeInto("")
    expect(body()).toBe("resting")
  })

  it("a pending keystroke does not re-narrow the list a moment after it is cleared", async () => {
    // THE HALF THAT IS EASY TO MISS. Clear within the delay and, with no
    // `cancel()`, the trailing timer still fires and sets the asked term back
    // to the word that was just cleared: the full list appears and then
    // silently re-narrows itself, with nothing on screen to explain it.
    const door = fakeDoor()
    draw(door.fetchPage)
    typeInto("confia")
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /clear/i }))
    })
    await settle(600)

    expect(
      door.asked.length,
      "a cancelled keystroke reached the door after the box was cleared"
    ).toBe(0)
    expect(body(), "the abandoned word came back on its own").toBe("resting")
    expect(box().value).toBe("")
  })
})

describe("only the typed term waits — a click never does", () => {
  it("a facet asks the door on the click", async () => {
    // The debounce is on `q` alone. A fix that quieted the whole toolbar would
    // make every other control feel broken for no benefit: a chip is one
    // deliberate act, not one of five accidents.
    const door = fakeDoor()
    draw(door.fetchPage, { facets: FACETS })

    // Operated the way a reader operates it — the Filter pill, then the
    // facet's own disclosure button, then the word. `flush()` moves the clock
    // by ZERO and only lets React's own state settle, so nothing below can pass
    // because a timer happened to fire.
    const flush = () => act(async () => void (await vi.advanceTimersByTimeAsync(0)))
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /^Filter/ }))
    })
    await flush()
    const facet = screen.getByRole("group", { name: "Kind" })
    act(() => {
      fireEvent.click(within(facet).getByRole("button"))
    })
    await flush()
    act(() => {
      fireEvent.click(within(screen.getByRole("listbox")).getByRole("option", { name: "Note" }))
    })
    await flush()

    expect(door.asked.length, "the facet click was delayed").toBe(1)
    expect(door.asked[0].kind).toBe("note")
    expect(door.asked[0].q, "a facet is not a search").toBeUndefined()
  })
})
