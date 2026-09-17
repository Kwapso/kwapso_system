// RecordTable's OWN ROW — the shared defect `TicketRowsTable`'s own suite
// (`ticket-row-opens-beside.test.tsx`) pins for the ticket table, pinned here
// for the table `RecordTable` draws under every OTHER collection in the app
// (Accounts, Tasks, Waves, Contacts, Stories, Meetings). Diagnosed the same
// day: a row drawn as `<TableRow onClick={() => onRowClick(row)}>` has no
// anchor, so a cmd/ctrl-click or a middle-click — the gesture `InAppLink`
// already teaches every real link — silently does nothing.
//
// FIXED ONTO THE SAME SEAM `TicketRowsTable` now uses (`rowOpenHandlers`,
// web/lib/row-open.ts), wired in only when the caller hands over the row's
// own address (`rowPath`) — the same thing a caller's `<InAppLink href=…>`
// would carry. `rowPath` ABSENT keeps this component's older, narrower
// contract (a plain click only), which is what a caller that is not opening a
// record at all — `module-automations.tsx`'s inline-edit row — still gets;
// pinned below as the negative case.

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { RecordTable } from "@/components/records/record-table"
import { BASE_RECIPES, withDataDrivenCollection } from "@/lib/screens"
import { forgetOpenTabs, openTabsSnapshot, setWorkspaceScope, visitTrail } from "@/lib/workspace-tabs"

type Row = { id: string; name: string }

const ROWS: Row[] = [{ id: "acc-1", name: "Acme Studio" }]

const config = withDataDrivenCollection(BASE_RECIPES["accounts.list"], [{ id: "acc-1", name: "x" }])
  .collection as never

beforeEach(() => {
  forgetOpenTabs()
  localStorage.clear()
  setWorkspaceScope("record-table-test:team1")
  visitTrail([{ path: "/accounts", label: "Accounts" }])
})

afterEach(cleanup)

describe("a plain click on a RecordTable row (with rowPath)", () => {
  it("calls onRowClick, same tab, no tab minted", () => {
    const seen: string[] = []
    render(
      <RecordTable
        columns={[{ key: "name", label: "Name" }]}
        rows={ROWS}
        config={config}
        onRowClick={(row) => seen.push(row.id)}
        rowPath={(row) => `/t/team1/accounts/${row.id}`}
        rowLabel={(row) => row.name}
      />
    )
    const before = openTabsSnapshot().length
    fireEvent.click(screen.getByText("Acme Studio"))
    expect(seen).toEqual(["acc-1"])
    expect(openTabsSnapshot()).toHaveLength(before)
  })
})

describe("cmd/ctrl-click a RecordTable row — opens beside, never in place", () => {
  it("meta-click opens beside and never calls onRowClick", () => {
    const seen: string[] = []
    render(
      <RecordTable
        columns={[{ key: "name", label: "Name" }]}
        rows={ROWS}
        config={config}
        onRowClick={(row) => seen.push(row.id)}
        rowPath={(row) => `/t/team1/accounts/${row.id}`}
        rowLabel={(row) => row.name}
      />
    )
    const before = openTabsSnapshot().length
    fireEvent.click(screen.getByText("Acme Studio"), { metaKey: true })
    expect(seen).toEqual([])
    expect(openTabsSnapshot()).toHaveLength(before + 1)
    const opened = openTabsSnapshot().at(-1)
    expect(opened?.steps).toEqual([{ path: "/t/team1/accounts/acc-1", label: "Acme Studio" }])
  })

  it("ctrl-click does the same, for Windows/Linux", () => {
    render(
      <RecordTable
        columns={[{ key: "name", label: "Name" }]}
        rows={ROWS}
        config={config}
        onRowClick={() => {}}
        rowPath={(row) => `/t/team1/accounts/${row.id}`}
      />
    )
    const before = openTabsSnapshot().length
    fireEvent.click(screen.getByText("Acme Studio"), { ctrlKey: true })
    expect(openTabsSnapshot()).toHaveLength(before + 1)
  })
})

describe("middle-click a RecordTable row — the browser's own auxclick", () => {
  it("opens beside on button 1, never calling onRowClick", () => {
    const seen: string[] = []
    render(
      <RecordTable
        columns={[{ key: "name", label: "Name" }]}
        rows={ROWS}
        config={config}
        onRowClick={(row) => seen.push(row.id)}
        rowPath={(row) => `/t/team1/accounts/${row.id}`}
      />
    )
    const before = openTabsSnapshot().length
    const row = screen.getByText("Acme Studio").closest("tr")
    if (!row) throw new Error("expected a table row")
    fireEvent(row, new MouseEvent("auxclick", { bubbles: true, button: 1 }))
    expect(seen).toEqual([])
    expect(openTabsSnapshot()).toHaveLength(before + 1)
  })
})

// AN ANCHOR NESTED INSIDE THE ROW — the live proof, 17 Sep 2026: an account
// card wraps its whole surface in a real `<InAppLink>` (R37) while a
// `RecordTable`/`TicketRowsTable` row opens through `rowOpenHandlers`
// instead, and nothing before today taught the two seams to defer to one
// another. No column in this app currently renders an anchor of its own —
// see `record-table.tsx`'s own `refColumn`, which draws a chip, never a
// link — but the shape is one `render` callback away, so this pins the RULE
// rather than any one column.
//
// THE SEAM IS `stopPropagation`, ON THE NESTED CONTROL — never a guard on
// the row's own side. `row-open.ts`'s own header explains why: the row
// cannot tell "a click bubbled up from a nested anchor it should ignore"
// apart from "a nested control (`TicketRowsTable`'s title `<Button>`,
// `AppTicketsPanel`'s own) deliberately re-dispatching to THIS row's own
// `handlers.onClick` on purpose" — both look identical from `e.target`. So
// the row stays a plain dispatcher, and whichever control sits inside it
// calls `e.stopPropagation()` itself before deciding what the click means,
// the exact shape `InAppLink`'s own modified-click branch now uses
// (in-app-link.tsx) and the exact shape this stub reproduces.
describe("an anchor nested inside a RecordTable row — the anchor wins, the row stands down", () => {
  function nestedAnchor(onOpenCount: { current: number }) {
    return () => (
      <a
        href="/t/team1/accounts/somewhere-else"
        onClick={(e) => {
          // THE ANCHOR'S OWN GUARD — stops the SAME click from also reaching
          // the row's `onClick` (`handlers.onClick`, record-table.tsx), on
          // every branch, plain or modified: an interactive control inside a
          // row must be the only thing that answers a click landing on it.
          e.stopPropagation()
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault()
            // Stands in for `openBeside` — a plain counter is enough to prove
            // it fired exactly once; the real seam's own `openBeside` call is
            // already pinned by `row-open.test.tsx` and by this row's OWN
            // meta-click case above.
            onOpenCount.current++
          }
        }}
      >
        A different record
      </a>
    )
  }

  it("cmd-click reaches the anchor once, never onRowClick, and mints no tab at all", () => {
    const seen: string[] = []
    const anchorOpens = { current: 0 }
    render(
      <RecordTable
        columns={[{ key: "name", label: "Name", render: nestedAnchor(anchorOpens) }]}
        rows={ROWS}
        config={config}
        onRowClick={(row) => seen.push(row.id)}
        rowPath={(row) => `/t/team1/accounts/${row.id}`}
        rowLabel={(row) => row.name}
      />
    )
    const before = openTabsSnapshot().length
    fireEvent.click(screen.getByText("A different record"), { metaKey: true })
    // openBeside once — the anchor's own handler, exactly once.
    expect(anchorOpens.current).toBe(1)
    // onOpen never — the row's plain-click branch (`onRowClick`) is not this.
    expect(seen).toEqual([])
    // no navigation — the ROW's own `rowOpenHandlers` never saw this click at
    // all (stopPropagation kept it from bubbling), so `openBeside` was never
    // reached from the row's side either: no second tab, no tab at all from
    // this seam (the anchor's own stand-in above isn't the real
    // `openBeside`, so `openTabsSnapshot()` never grows here).
    expect(openTabsSnapshot()).toHaveLength(before)
  })

  it("a plain click on the nested anchor does not also fire onRowClick", () => {
    const seen: string[] = []
    render(
      <RecordTable
        columns={[{ key: "name", label: "Name", render: nestedAnchor({ current: 0 }) }]}
        rows={ROWS}
        config={config}
        onRowClick={(row) => seen.push(row.id)}
        rowPath={(row) => `/t/team1/accounts/${row.id}`}
        rowLabel={(row) => row.name}
      />
    )
    fireEvent.click(screen.getByText("A different record"))
    expect(seen).toEqual([])
  })
})

describe("no rowPath — the older, narrower contract (module-automations.tsx's own shape)", () => {
  it("a plain click still calls onRowClick, and a modifier does nothing special", () => {
    const seen: string[] = []
    render(
      <RecordTable
        columns={[{ key: "name", label: "Name" }]}
        rows={ROWS}
        config={config}
        onRowClick={(row) => seen.push(row.id)}
      />
    )
    const before = openTabsSnapshot().length
    fireEvent.click(screen.getByText("Acme Studio"), { metaKey: true })
    // No `rowPath` handed over, so there is no address to open beside —
    // the row keeps its older behaviour: a plain dispatch, modifier or not.
    expect(seen).toEqual(["acc-1"])
    expect(openTabsSnapshot()).toHaveLength(before)
  })
})
