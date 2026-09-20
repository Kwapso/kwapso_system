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
import { clampRecordHeading, TITLE_ACTIONS_SPLIT } from "@shared/web/record-heading"
import { RecordActionsMenu } from "@/components/records/record-chrome"
import { Trash } from "@shared/ui/foundations/icons"

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
  { key: "timer", label: "Start", onSelect: () => {} },
  { key: "edit", label: "Edit", onSelect: () => {} },
  { key: "archive", label: "Archive", onSelect: () => {}, destructive: true },
]

describe("the wide row's own class contract", () => {
  it("HEAD_ACTIONS_ROW_CLASS is hidden below the fold's breakpoint, flex above it", () => {
    expect(HEAD_ACTIONS_ROW_CLASS).toMatch(/(?:^|\s)hidden(?:\s|$)/)
    // `44rem`, RAISED FROM `24rem` 19 Sep 2026 (shared/web/head-actions.tsx's
    // own header carries the arithmetic) — the old 24rem covered only the
    // actions row's own natural width; the ticket-head overlay defect showed
    // that left no guaranteed room for the TITLE once the row fit, so the
    // threshold is now that same 24rem (the row's own footprint, unchanged)
    // plus a 20rem title floor.
    expect(HEAD_ACTIONS_ROW_CLASS).toMatch(/(?:^|\s)@min-\[44rem\]:flex(?:\s|$)/)
    // Never the OTHER pair — a row that is both hidden AND flex-below-the-
    // fold at once is not a fold, it is two rules fighting.
    expect(HEAD_ACTIONS_ROW_CLASS).not.toMatch(/@min-\[44rem\]:hidden/)
    // And never the RETIRED threshold — a stray 24rem left behind would fold
    // at the wrong width while this suite kept passing against the constant.
    expect(HEAD_ACTIONS_ROW_CLASS).not.toMatch(/24rem/)
  })
})

describe("HeadActionsFoldMenu's own class contract", () => {
  it("carries the EXACT inverse pair of the wide row", () => {
    render(<HeadActionsFoldMenu items={ITEMS} label="More actions" />)
    const wrapper = document.querySelector('[data-slot="head-actions-fold"]') as HTMLElement
    expect(wrapper, "the fold trigger renders its own named wrapper").toBeTruthy()
    expect(wrapper.className).toMatch(/(?:^|\s)flex(?:\s|$)/)
    expect(wrapper.className).toMatch(/(?:^|\s)@min-\[44rem\]:hidden(?:\s|$)/)
    expect(wrapper.className).not.toMatch(/@min-\[44rem\]:flex/)
    expect(wrapper.className).not.toMatch(/24rem/)
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
    expect(screen.queryByText("Start")).toBeNull()

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

// ============================================================================
// DELETE, AT EVERY WIDTH -- a live proof of commit dc8e76b2. Tasks' own Delete
// (Aurora, 21 Sep 2026, "i need delete actino for tasks on the ... button")
// lived ONLY inside `foldedActions`, and this file's own `HeadActionsFoldMenu`
// wrapper is `@min-[44rem]:hidden` BY DESIGN -- the fold is the narrow answer,
// never a second home for an act with no standalone button. The ticket head's
// own Archive already carries a persistent `RecordActionsMenu` in the WIDE
// row for exactly that reason (`help-detail.tsx`); `task-detail.tsx` had none.
// ============================================================================
describe("the task head -- Delete is reachable at every width, not only the fold", () => {
  const src = read("web/components/work/task-detail.tsx")

  it("imports RecordActionsMenu and renders it inside the wide HEAD_ACTIONS_ROW_CLASS row, not only the fold", () => {
    expect(src).toMatch(/RecordActionsMenu/)
    const wideRowStart = src.indexOf('<div data-slot="head-actions-row" className={HEAD_ACTIONS_ROW_CLASS}>')
    expect(wideRowStart, "the wide actions row is where this test expects it").toBeGreaterThan(-1)
    const wideRowEnd = src.indexOf("</div>", wideRowStart)
    const wideRow = src.slice(wideRowStart, wideRowEnd)
    // The persistent menu lives in the WIDE row itself -- the row that is
    // `@min-[44rem]:flex`, never `hidden` at that width -- not only inside
    // `HeadActionsFoldMenu`'s own `@min-[44rem]:hidden` wrapper.
    expect(wideRow).toMatch(/<RecordActionsMenu actions=\{overflow\}/)
  })

  it("the wide row's own RecordActionsMenu carries the same `overflow` the fold also spreads -- one Delete, not two definitions", () => {
    expect(src).toMatch(/const overflow: RecordAction\[\] = canEdit/)
    expect(src).toMatch(/\.\.\.overflow,?\s*\n\s*\]/)
    // Delete is built once, inside `overflow`, never a second literal object
    // repeated for the wide row.
    const deleteMentions = src.match(/key:\s*"delete"/g) ?? []
    expect(deleteMentions.length).toBe(1)
  })

  it("behaviourally: the same shape task-detail.tsx builds renders a More button whose opened menu lists Delete", async () => {
    // NOT the whole screen (task-detail.tsx pulls in the timer bar, activity,
    // form options and the running-timers cache -- real hooks this suite has
    // no reason to fake). This exercises the REAL `RecordActionsMenu`, the
    // real component the wide row now mounts, fed the exact item shape
    // `task-detail.tsx`'s own `overflow` builds (source-proven above) -- the
    // same technique this file already uses for `HeadActionsFoldMenu` itself
    // (JSDOM never evaluates `@container`, so there is nothing to "make"
    // wide; what is provable is that the persistent trigger this width is
    // supposed to keep actually opens a menu that lists Delete).
    const overflow = [
      { key: "delete", label: "Delete", icon: <Trash className="size-3.5" />, destructive: true, onSelect: () => {} },
    ]
    render(<RecordActionsMenu actions={overflow} />)
    const trigger = screen.getByRole("button", { name: "More actions" })
    fireEvent.pointerDown(trigger, { button: 0, pointerId: 1 })
    fireEvent.pointerUp(trigger, { button: 0, pointerId: 1 })
    fireEvent.click(trigger)
    const item = await waitFor(() => screen.getByRole("menuitem", { name: "Delete" }))
    expect(item.className).toMatch(/text-destructive/)
  })

  it("renders nothing when there is nothing to delete -- the same empty rule every RecordActionsMenu follows", () => {
    const { container } = render(<RecordActionsMenu actions={[]} />)
    expect(container.innerHTML).toBe("")
  })
})

// ============================================================================
// THE OVERLAY DEFECT'S OWN CLASS CONTRACT — 19 Sep 2026. The wide row's fold
// threshold (above) is only HALF the fix: the buttons covered the title even
// where the row's OWN class contract was already correct, because the
// title's own clamp (`clampRecordHeading`, shared/web/record-heading.tsx) was
// a bare inline `<span>` — CSS never applies `overflow`/`text-overflow` to a
// non-replaced inline box, so `truncate`'s clip-and-ellipsis silently did
// nothing and the title painted past its column at full content width,
// straight under the actions. Proven live first (`page.addStyleTag`, three
// real states, BEFORE either source edit): forcing `display:block` on that
// exact span was the whole fix, because `TITLE_ACTIONS_SPLIT` (below) was
// already flowing the title and the actions as ordinary flex siblings —
// nothing here was ever absolutely positioned.
// ============================================================================
describe("the title column stays in flow beside the actions, and its own clamp can actually clip", () => {
  it("TITLE_ACTIONS_SPLIT keeps the title flexible and in flow, and the actions fixed-width", () => {
    // The heading wrapper — grows/shrinks with the row, never forced wide.
    expect(TITLE_ACTIONS_SPLIT).toMatch(/:min-w-0(?:\s|$)/)
    expect(TITLE_ACTIONS_SPLIT).toMatch(/:flex-1(?:\s|$)/)
    expect(TITLE_ACTIONS_SPLIT).toMatch(/:max-w-\[80%\](?:\s|$)/)
    // The actions column — never yields its own width to the title.
    expect(TITLE_ACTIONS_SPLIT).toMatch(/\[data-slot=title-actions\]\]:shrink-0/)
    // Neither half is ever pulled out of flow — an overlay bug wearing a flex
    // class would still be an overlay bug.
    expect(TITLE_ACTIONS_SPLIT).not.toMatch(/absolute/)
  })

  it("clampRecordHeading's own span is display:block, so its truncate/ellipsis actually apply", () => {
    // THE FAULT: `overflow`/`text-overflow` do not apply to a non-replaced
    // INLINE box at all (CSS Overflow §2) — a bare `<span>` is inline by
    // default, so `truncate`'s clip-and-ellipsis were dead code until this
    // class was added. Read off the RENDERED node, not the source string, so
    // a future Tailwind class-ordering pass can't quietly satisfy a regex
    // while leaving the cascade unchanged.
    const { container } = render(<>{clampRecordHeading("a title far longer than any column it will ever sit in")}</>)
    const span = container.querySelector("span") as HTMLElement
    expect(span, "the clamp still renders a span").toBeTruthy()
    expect(span.className).toMatch(/(?:^|\s)block(?:\s|$)/)
    expect(span.className).toMatch(/(?:^|\s)truncate(?:\s|$)/)
    // R87 (title-length, RULES.md) still governs: ONE line, never
    // `line-clamp-2` — `record-heading-clamps.test.tsx` and
    // `title-length.test.ts` are this law's own suites; this assertion is
    // the same law read from the fold's side of the fix.
    expect(span.className).not.toMatch(/line-clamp/)
  })
})
