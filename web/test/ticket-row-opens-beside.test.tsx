// A TICKET ROW'S OWN MODIFIER-CLICK — the client, 17 Sep 2026, verbatim,
// asked twice: "Unless I press Command and click, this would open a new
// tab..." (the general rule, `in-app-link.test.tsx` pins it for a real
// anchor) and then, more pointedly, over this exact table: "the command
// that I'm clicking is not opening a new tab. Is this because I'm using it
// inside of Chrome, or is it not working."
//
// IT WAS NOT CHROME. Reproduced live on staging with Playwright (a ticket
// row cmd-clicked, the workspace tab strip's own <li> count unchanged, the
// URL replaced IN PLACE — no browser-native tab either): `TicketRowsTable`'s
// row (`tickets-collection.tsx`) is a plain `<TableRow onClick={() =>
// onOpen(w.id)}>` — no `<a href>` at all, so R37's own anchor census
// (`shell-nav.test.ts`'s "in-app-anchors") could never have caught it, and
// `onOpen` (`onIntent`'s "open" case, `deep-link-screen.tsx`) calls `go()`
// directly with no MouseEvent in reach to read a modifier off. This is the
// one place that DOES see the raw click, so it is the one place that now
// computes the ticket's own address (`/t/<teamId>/tickets/<id>`, the same
// form `RaisedByRow` already hands `InAppLink`) and opens it beside the
// active tab on cmd/ctrl-click or a middle-click — the identical gesture
// `InAppLink` already teaches every real anchor.
//
// DRIVEN, NOT SCANNED — a render that reads the store back, the same reason
// `in-app-link.test.tsx` gives.

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { TicketRowsTable, type TicketFace } from "@/components/tickets/tickets-collection"
import { forgetOpenTabs, openTabsSnapshot, setWorkspaceScope, visitTrail } from "@/lib/workspace-tabs"

const ROW: TicketFace = {
  id: "help-1",
  ref: "BERG-T0412",
  helpType: "Bug",
  appName: "Dispatch",
  appLogo: null,
  createdAt: "2026-08-18T09:00:00.000Z",
  titleEn: "The dispatch board will not load",
  titleDe: null,
  description: "<p>None of my drivers can see today's routes.</p>",
  resolvedAt: null,
}

beforeEach(() => {
  forgetOpenTabs()
  localStorage.clear()
  setWorkspaceScope("ticket-row-test:team1")
  visitTrail([{ path: "/tickets", label: "Tickets" }])
})

afterEach(cleanup)

describe("a plain click on a ticket row", () => {
  it("still calls onOpen, same tab, no tab minted", () => {
    const seen: string[] = []
    render(
      <TicketRowsTable
        rows={[ROW]}
        onOpen={(id) => seen.push(id)}
        label="Tickets"
        teamId="team1"
        columns={["title"]}
      />
    )
    const before = openTabsSnapshot().length
    fireEvent.click(screen.getByText("The dispatch board will not load"))
    expect(seen).toEqual(["help-1"])
    expect(openTabsSnapshot()).toHaveLength(before)
  })
})

describe("cmd/ctrl-click a ticket row — opens beside, never in place", () => {
  it("meta-click opens the ticket beside the active tab and never calls onOpen", () => {
    const seen: string[] = []
    render(
      <TicketRowsTable
        rows={[ROW]}
        onOpen={(id) => seen.push(id)}
        label="Tickets"
        teamId="team1"
        columns={["title"]}
      />
    )
    const before = openTabsSnapshot().length
    fireEvent.click(screen.getByText("The dispatch board will not load"), { metaKey: true })
    expect(seen).toEqual([]) // never the same-tab door
    expect(openTabsSnapshot()).toHaveLength(before + 1)
    const opened = openTabsSnapshot().at(-1)
    expect(opened?.steps).toEqual([
      { path: "/t/team1/tickets/help-1", label: "The dispatch board will not load" },
    ])
  })

  it("ctrl-click does the same, for Windows/Linux", () => {
    render(
      <TicketRowsTable rows={[ROW]} onOpen={() => {}} label="Tickets" teamId="team1" columns={["title"]} />
    )
    const before = openTabsSnapshot().length
    fireEvent.click(screen.getByText("The dispatch board will not load"), { ctrlKey: true })
    expect(openTabsSnapshot()).toHaveLength(before + 1)
  })

  it("clicking anywhere in the row (not just the title) honours the modifier too", () => {
    render(
      <TicketRowsTable rows={[ROW]} onOpen={() => {}} label="Tickets" teamId="team1" columns={["title"]} />
    )
    const before = openTabsSnapshot().length
    // The row itself, not the title's own <Button> — the "click anywhere in
    // the row" convenience `tickets-collection.tsx`'s own comment describes.
    const row = screen.getByText("The dispatch board will not load").closest("tr")
    if (!row) throw new Error("expected a table row")
    fireEvent.click(row, { metaKey: true })
    expect(openTabsSnapshot()).toHaveLength(before + 1)
  })
})

describe("middle-click a ticket row — the same door, the browser's own auxclick", () => {
  it("opens beside on button 1, never calling onOpen", () => {
    const seen: string[] = []
    render(
      <TicketRowsTable
        rows={[ROW]}
        onOpen={(id) => seen.push(id)}
        label="Tickets"
        teamId="team1"
        columns={["title"]}
      />
    )
    const before = openTabsSnapshot().length
    const row = screen.getByText("The dispatch board will not load").closest("tr")
    if (!row) throw new Error("expected a table row")
    fireEvent(row, new MouseEvent("auxclick", { bubbles: true, button: 1 }))
    expect(seen).toEqual([])
    expect(openTabsSnapshot()).toHaveLength(before + 1)
  })
})
