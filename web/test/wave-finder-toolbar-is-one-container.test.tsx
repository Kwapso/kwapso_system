// WAVEFINDER'S OWN TRACK GETS THE SAME "ONE CONTAINER" FIX `ToolbarRow` DOES,
// AND THEN THE SAME PILL RETIREMENT ONE PASS LATER.
//
// See `web/test/paged-find-toolbar-is-one-container.test.tsx`'s own header for
// the client ruling (2026-09-03, verbatim: "merge this with the main toolbar
// so that it's one single background or container, more like expand behaviour
// rather than open-a-new-one behaviour") and the shape it forbids. `WaveFinder`
// (this file's own subject) is the THIRD hand-drawn copy of the same track —
// alongside `ToolbarRow` (screen-bits.tsx) and `PagedFind` — and it carried the
// identical unfixed shape: `rounded-pill bg-background` on the track itself,
// unconditionally, with the open panel one `gap-2` below it as a second
// sibling of the same tone. Waves is the one screen whose toolbar is this
// component rather than `ToolbarRow` or the frame's own, so nothing else
// caught it.
//
// RETIRED AGAIN, 22 SEP 2026 — her ruling over the Triage/Ready pair ("make
// sure that you make this exactly the same everywhere"). `<PagedFind>`'s own
// column had already dropped its fill and radius on 21 Sep 2026 (rulebook
// L43, `CollectionCard`'s default flipping to `"plain"`); `WaveFinder` and
// `<ToolbarRow>` still carried the merged-container's OWN fill/radius (this
// file's earlier ruling, above) a day after that default changed, which is
// exactly the gap her screenshots caught. So the column now paints nothing
// at all, same as `<PagedFind>`'s — see `web/test/toolbar-search-edge.test.tsx`
// for the census that holds all three rows to the same, now-flush shape.

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import * as React from "react"
import { afterEach, beforeAll, describe, expect, it } from "vitest"

import { WaveFinder, EMPTY_WAVE_QUERY } from "@/components/work/wave-finder"
import type { Account } from "@shared/types"

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

/** THE TRACK'S SHAPE, with the one attribute that is SUPPOSED to change
 * normalised away.
 *
 * This assertion exists for the client's "one container" ruling: opening the
 * filter panel must not make the pill move, resize or repaint. `outerHTML`
 * was a fair proxy for that — until the add-filter button gained
 * `aria-expanded` (kit v1.2.42), which flips false→true precisely BECAUSE the
 * panel opened. That is a state announcement for a screen reader, not a
 * visual change: a person watching the pill sees nothing move, and a person
 * listening finally hears that the control expands something.
 *
 * So the comparison drops `aria-expanded` and keeps everything else byte for
 * byte — a class, a style, a structural change or a second attribute flipping
 * still fails it. Normalising the whole attribute (rather than asserting one
 * expected value) is deliberate: the point here is that the track did not
 * move, and the aria state has its own test elsewhere. */
const trackShape = (el: HTMLElement) =>
  el.outerHTML.replace(/ aria-expanded="(?:true|false)"/g, "")


const CLIENTS: Account[] = [{ id: "a1", name: "Bergman S.A." } as Account]

function Harness() {
  const [query, setQuery] = React.useState(EMPTY_WAVE_QUERY)
  return <WaveFinder query={query} onChange={setQuery} clients={CLIENTS} />
}

/** WITH ACTIONS — the "+" button, the control her screenshot found spilling
 * out of the pill's own right edge. `HarnessWithActions` renders it so the
 * regression has something concrete to sit outside the lane. */
function HarnessWithActions() {
  const [query, setQuery] = React.useState(EMPTY_WAVE_QUERY)
  return (
    <WaveFinder
      query={query}
      onChange={setQuery}
      clients={CLIENTS}
      actions={<button type="button">Sell a wave</button>}
    />
  )
}

const openPanel = () => fireEvent.click(screen.getByRole("button", { name: /^Filter/ }))

describe("WaveFinder's toolbar is one container, exactly like ToolbarRow's", () => {
  it("the track never moves, and neither the track nor the column paints a surface any more", async () => {
    render(<Harness />)

    const column = document.querySelector('[data-slot="toolbar-row-column"]')
    expect(column, "the toolbar must be wrapped in its own merged container").toBeTruthy()
    const track = document.querySelector('[data-slot="toolbar-row-track"]') as HTMLElement
    expect(track, "the track is a named child of the merged container").toBeTruthy()
    expect(column!.contains(track), "the track lives inside the merged container").toBe(true)

    expect(document.querySelector('[data-slot="filter-bar-row"]'), "nothing is open yet").toBeNull()
    // 22 SEP 2026 — NO FILL, NO RADIUS, NEITHER OPEN NOR CLOSED (this file's
    // header has the ruling). The column used to switch between `rounded-pill`
    // and `rounded-[var(--radius)]` off whether the panel was open; both are
    // gone now, so there is nothing left to switch.
    expect(column!.className, "the column paints no background of its own").not.toMatch(
      /\bbg-(?!clip|none)[\w-]+/
    )
    expect(column!.className, "the column carries no radius of its own").not.toMatch(
      /\brounded-[\w[\]().,%/#-]+/
    )
    expect(
      track.className,
      "the track paints no fill or shape of its own either"
    ).not.toMatch(/rounded-pill|bg-background|bg-surface-panel/)
    const closedTrack = trackShape(track)

    openPanel()
    const panelRow = await waitFor(() => {
      const node = document.querySelector('[data-slot="filter-bar-row"]') as HTMLElement | null
      expect(node).toBeTruthy()
      return node!
    })

    expect(trackShape(track), "opening the panel must not change the track's own markup").toBe(
      closedTrack
    )
    expect(track.contains(panelRow), "the panel must never be inside the track").toBe(false)
    expect(column!.contains(panelRow), "the panel lives in the merged container").toBe(true)
    expect(
      panelRow.className,
      "an in-flow panel positions nothing — no overlay"
    ).not.toMatch(/(?:^|\s)(?:absolute|fixed|sticky|top-full|inset-x-0|z-\d+)(?:\s|$)/)
    expect(
      panelRow.className,
      "the open panel must not paint its own background — one surface, not two"
    ).not.toMatch(/bg-background|bg-surface-panel/)
    expect(
      panelRow.className,
      "the open panel must not round its own corners — the merged container does"
    ).not.toMatch(/rounded-\[var\(--radius\)\]/)

    // STILL NOTHING PAINTED WITH THE PANEL OPEN — the column used to switch
    // to the box radius here; now it stays exactly as it was closed.
    expect(column!.className, "the container still owns no background, panel open or not").not.toMatch(
      /\bbg-(?!clip|none)[\w-]+/
    )
    expect(column!.className, "and no radius, panel open or not").not.toMatch(
      /\brounded-[\w[\]().,%/#-]+/
    )

    openPanel()
    await waitFor(() =>
      expect(document.querySelector('[data-slot="filter-bar-row"]')).toBeNull()
    )
    expect(trackShape(track)).toBe(closedTrack)
  })
})

// THE BROKEN CONTAINER — client, 16 Sep 2026, over a screenshot: "The
// container looks broken." The track's own comment already claimed "one row,
// always" (the 2026-09-01 ruling); `flex-wrap`, no scrolling lane and no
// pinned action group meant it did not keep that promise — the trailing
// controls dropped to a second line the moment the lane ran out of room, and
// the collapsed `rounded-pill` (a capsule computed off the box's own HEIGHT)
// stretched around the now-taller box, reading as a corner clipping the
// wrapped "+"/view switch. Pinned here the way the kit's own `ToolbarRow`
// (shared/ui/components/toolbar-row/toolbar-row.tsx) is built: the track
// never wraps, a scrolling lane holds search/filters/sort/period, and the
// action group is pinned outside it.
describe("WaveFinder's track never wraps to a second line (16 Sep 2026 fix)", () => {
  it("the track is flex-nowrap, never flex-wrap", () => {
    render(<Harness />)
    const track = document.querySelector('[data-slot="toolbar-row-track"]') as HTMLElement
    expect(track).toBeTruthy()
    expect(track.className).toMatch(/(?:^|\s)flex-nowrap(?:\s|$)/)
    expect(track.className).not.toMatch(/(?:^|\s)flex-wrap(?:\s|$)/)
  })

  it("search/filters/sort/period sit in their own scrolling lane, not loose in the track", () => {
    render(<Harness />)
    const track = document.querySelector('[data-slot="toolbar-row-track"]') as HTMLElement
    const lane = document.querySelector('[data-slot="toolbar-row-lane"]') as HTMLElement
    expect(lane, "the track needs a lane to scroll instead of wrapping").toBeTruthy()
    expect(track.contains(lane)).toBe(true)
    // `min-w-0` is load-bearing (toolbar-row.tsx's own note): without it the
    // lane cannot shrink below its content and the PAGE scrolls sideways
    // instead of the lane scrolling internally.
    expect(lane.className).toMatch(/(?:^|\s)min-w-0(?:\s|$)/)
    expect(lane.className).toMatch(/(?:^|\s)overflow-x-auto(?:\s|$)/)
    expect(lane.className).not.toMatch(/(?:^|\s)flex-wrap(?:\s|$)/)
  })

  it("the action group is pinned outside the lane with ms-auto, never inside it", () => {
    render(<HarnessWithActions />)
    const lane = document.querySelector('[data-slot="toolbar-row-lane"]') as HTMLElement
    const actionsGroup = document.querySelector('[data-slot="toolbar-row-actions"]') as HTMLElement
    expect(actionsGroup, "actions render in their own pinned group").toBeTruthy()
    expect(lane.contains(actionsGroup), "the action group is a sibling of the lane, not nested in it").toBe(
      false
    )
    expect(actionsGroup.className).toMatch(/(?:^|\s)ms-auto(?:\s|$)/)
    expect(actionsGroup.className).toMatch(/(?:^|\s)shrink-0(?:\s|$)/)
    expect(actionsGroup.className).toMatch(/(?:^|\s)flex-nowrap(?:\s|$)/)
    expect(screen.getByRole("button", { name: "Sell a wave" })).toBeTruthy()
  })
})
