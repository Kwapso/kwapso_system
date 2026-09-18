// THE RECORD HEAD'S OWN ACTIONS FOLD — Aurora's ruling, 18 Sep 2026, on the
// narrow ticket head: the Close / Start timer / pen / "…" row floated over a
// wrapped title once the head band ran out of room. Her pick off a
// side-by-side options page, verbatim: "h3, and aign the menu to the chips."
//
// `shared/web/head-actions.tsx` is the shared component this bought: the wide
// row (`HEAD_ACTIONS_ROW_CLASS`, a caller's own controls, wrapped) and the
// narrow trigger (`HeadActionsFoldMenu`, built from a flat, normalized item
// list) are BOTH always in the tree — CSS decides which one a reader sees,
// never a runtime condition (see that file's own header, "TWO RENDERS OF THE
// SAME ACTIONS, NOT ONE NODE PHYSICALLY MOVED"). JSDOM does not evaluate a
// `@container` query at all, so this suite cannot shrink a real box and watch
// the fold happen — what it CAN prove is the class contract the fold is
// built from (the wide row's `hidden`/`@min-[24rem]:flex` pair and the
// trigger's exact inverse), that the trigger opens a real menu holding every
// item handed to it, and that the ticket head — the one screen wired to this
// component so far — actually routes through it rather than drawing its own
// absolutely-positioned row.

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, beforeAll, describe, expect, it } from "vitest"

import {
  HeadActionsFoldMenu,
  HEAD_ACTIONS_ROW_CLASS,
  type HeadActionItem,
} from "@shared/web/head-actions"

beforeAll(() => {
  // Radix's dropdown-menu primitive reads these during open/close; jsdom has
  // none of them. The same polyfill block `wave-finder-toolbar-is-one-
  // container.test.tsx` and others already carry for the identical reason.
  Object.assign(window.HTMLElement.prototype, {
    scrollIntoView: () => {},
    hasPointerCapture: () => false,
    releasePointerCapture: () => {},
    setPointerCapture: () => {},
  })
})

afterEach(cleanup)

const ROOT = join(__dirname, "..", "..")
const read = (p: string) => readFileSync(join(ROOT, ...p.split("/")), "utf8")

const ITEMS: HeadActionItem[] = [
  { key: "close", label: "Close", onSelect: () => {} },
  { key: "timer", label: "Start timer", onSelect: () => {} },
  { key: "edit", label: "Edit", onSelect: () => {} },
  { key: "archive", label: "Archive", onSelect: () => {}, destructive: true },
]

describe("the wide row's own class contract", () => {
  it("HEAD_ACTIONS_ROW_CLASS is hidden below the fold's breakpoint, flex above it", () => {
    expect(HEAD_ACTIONS_ROW_CLASS).toMatch(/(?:^|\s)hidden(?:\s|$)/)
    expect(HEAD_ACTIONS_ROW_CLASS).toMatch(/(?:^|\s)@min-\[24rem\]:flex(?:\s|$)/)
    // Never the OTHER pair — a row that is both hidden AND flex-below-the-
    // fold at once is not a fold, it is two rules fighting.
    expect(HEAD_ACTIONS_ROW_CLASS).not.toMatch(/@min-\[24rem\]:hidden/)
  })
})

describe("HeadActionsFoldMenu's own class contract", () => {
  it("carries the EXACT inverse pair of the wide row", () => {
    render(<HeadActionsFoldMenu items={ITEMS} label="More actions" />)
    const wrapper = document.querySelector('[data-slot="head-actions-fold"]') as HTMLElement
    expect(wrapper, "the fold trigger renders its own named wrapper").toBeTruthy()
    expect(wrapper.className).toMatch(/(?:^|\s)flex(?:\s|$)/)
    expect(wrapper.className).toMatch(/(?:^|\s)@min-\[24rem\]:hidden(?:\s|$)/)
    expect(wrapper.className).not.toMatch(/@min-\[24rem\]:flex/)
    // Pushed to the row's own trailing edge — "aign the menu to the chips"
    // is what a caller reads this class for.
    expect(wrapper.className).toMatch(/(?:^|\s)ml-auto(?:\s|$)/)
  })

  it("renders nothing when there is nothing to fold — the same rule RecordActionsMenu follows", () => {
    const { container } = render(<HeadActionsFoldMenu items={[]} label="More actions" />)
    expect(container.querySelector('[data-slot="head-actions-fold"]')).toBeNull()
    expect(container.innerHTML).toBe("")
  })
})

describe("the folded menu holds every item, ordinary then destructive", () => {
  it("opens on the trigger and lists every label, with the destructive one behind a separator", async () => {
    render(<HeadActionsFoldMenu items={ITEMS} label="More actions" />)
    const trigger = screen.getByRole("button", { name: "More actions" })
    expect(screen.queryByText("Start timer")).toBeNull()

    // Radix's DropdownMenuTrigger opens off a pointer-down/up pair, not a
    // bare click — the same recipe `ticket-detail-no-tabs.test.tsx` already
    // uses on this app's identical "…" trigger.
    fireEvent.pointerDown(trigger, { button: 0, pointerId: 1 })
    fireEvent.pointerUp(trigger, { button: 0, pointerId: 1 })
    fireEvent.click(trigger)

    await waitFor(() => expect(screen.getByRole("menu")).toBeTruthy())
    for (const item of ITEMS) {
      expect(screen.getByRole("menuitem", { name: item.label })).toBeTruthy()
    }
    // Radix orders DOM children the way this file's own source does — ordinary
    // items first, the destructive one last, a separator between the two
    // groups (mirrors `RecordActionsMenu`'s own shape, record-chrome.tsx).
    const menu = screen.getByRole("menu")
    const separator = menu.querySelector('[role="separator"]')
    expect(separator, "a separator divides ordinary items from the destructive one").toBeTruthy()
    const archiveItem = screen.getByRole("menuitem", { name: "Archive" })
    expect(archiveItem.className).toMatch(/text-destructive/)
  })

  it("calls the item's own onSelect, not a rebuilt handler", async () => {
    let clicked = false
    const items: HeadActionItem[] = [{ key: "close", label: "Close", onSelect: () => (clicked = true) }]
    render(<HeadActionsFoldMenu items={items} label="More actions" />)
    const trigger = screen.getByRole("button", { name: "More actions" })
    fireEvent.pointerDown(trigger, { button: 0, pointerId: 1 })
    fireEvent.pointerUp(trigger, { button: 0, pointerId: 1 })
    fireEvent.click(trigger)
    const item = await waitFor(() => screen.getByRole("menuitem", { name: "Close" }))
    fireEvent.click(item)
    expect(clicked).toBe(true)
  })
})

describe("the trigger sits inside the chip row, at its trailing edge", () => {
  it("is the chip row's own last child, after whatever chips a caller draws", () => {
    render(
      <div data-testid="chip-row" className="flex flex-wrap items-center gap-3">
        <span data-testid="chip-one">BERG-T0412</span>
        <span data-testid="chip-two">Ticket</span>
        <HeadActionsFoldMenu items={ITEMS} label="More actions" />
      </div>
    )
    const row = screen.getByTestId("chip-row")
    const trigger = document.querySelector('[data-slot="head-actions-fold"]') as HTMLElement
    expect(row.contains(trigger), "the trigger lives inside the chip row, not beside the title").toBe(true)
    expect(row.lastElementChild).toBe(trigger)
  })
})

describe("the ticket head passes its actions through the shared component", () => {
  const src = read("web/components/tickets/help-detail.tsx")

  it("imports the shared fold from shared/web/head-actions", () => {
    expect(src).toMatch(/from "@shared\/web\/head-actions"/)
    expect(src).toMatch(/HeadActionsFoldMenu/)
    expect(src).toMatch(/HEAD_ACTIONS_ROW_CLASS/)
  })

  it("wraps the wide actions row in HEAD_ACTIONS_ROW_CLASS, and renders the fold trigger in chips", () => {
    expect(src).toMatch(/className=\{HEAD_ACTIONS_ROW_CLASS\}/)
    expect(src).toMatch(/<HeadActionsFoldMenu items=\{foldedActions\}/)
  })

  it("has no absolutely positioned action row — the fold is CSS-driven, not position-driven", () => {
    // Scoped to the head's OWN `actions` block (this lane's to own), not the
    // whole file — the conversation card, Work logs and Related stories
    // panels belong to other lanes and are free to use `absolute` for their
    // own reasons untouched by this ruling.
    const start = src.indexOf("const actions = (")
    const end = src.indexOf("\n      /* THE LADDER, ABOVE THE TABS")
    expect(start, "the actions block is where this test expects it").toBeGreaterThan(-1)
    expect(end, "the marker after the actions block still exists").toBeGreaterThan(start)
    const actionsBlock = src.slice(start, end)
    expect(actionsBlock).not.toMatch(/(?:^|["\s])absolute(?:["\s]|$)/)
    expect(actionsBlock).not.toMatch(/position:\s*absolute/)
  })
})
