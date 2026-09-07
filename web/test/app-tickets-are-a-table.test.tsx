// AN APP'S TICKETS ARE A TABLE, AND THE TABLE IS THE ONE SHE APPROVED.
//
// The client, 6 Sep 2026: "create me, in each app, the ticket page. Put me in
// the list and also create another view for the dashboard." What that tab drew
// until then was a `RowList` of two text lines per ticket — the description on
// top and `ref · type · status` under it as one dot-joined string. Three facts
// flattened into prose: the type of row four is not above the type of row five,
// so comparing two tickets meant reading two sentences.
//
// WHY A TEST AND NOT A CODE REVIEW. A list that regresses to text lines still
// renders, still opens the right record, still pages, and still passes every
// rule in this repo — R48 sees a search box, R50 sees an `empty` prop, R53 sees
// the slots. The SHAPE of a row is invisible to all of them, which is exactly
// how the flattened line survived on this tab for as long as it did. So the
// four column headers are asserted by name, the row's own facts are read back
// out of the rendered table, and the column she asked for that is deliberately
// ABSENT is asserted absent — because dropping "App" inside one app is a
// judgement, and a judgement nobody wrote down is a judgement somebody
// re-litigates in six weeks.

import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { HelpTicket } from "@shared/types"

const TICKETS: HelpTicket[] = [
  {
    id: "H1",
    ref: "BERG-T0412",
    helpType: "Issue",
    description: "The dispatch board stops refreshing after lunch",
    status: "triaged",
    createdAt: "2026-06-10T09:00:00.000Z",
  } as HelpTicket,
  {
    // NO REFERENCE AND NO TYPE — both are real states (a client with no code
    // yet, a ticket nobody has triaged), and both are the shapes a table gets
    // wrong: an empty black lozenge, and a hole where every other row has a
    // pill. Drawn in the fixture rather than described in a comment.
    id: "H2",
    ref: null,
    helpType: null,
    description: "Can you add the driver column back",
    status: "new",
    createdAt: "2026-06-11T09:00:00.000Z",
  } as HelpTicket,
]

// TWO KEYS ANSWER, NOT ONE, and the second is the part worth writing down: this
// panel passes `fixed={{ appId }}` to `<PagedFind>`, so the find is ALWAYS
// active — the app is a narrowing the door is asked for on every read, not a
// question somebody typed. So the rows a person sees come out of the find cache
// (`find:<listKey>:appId=…`) and the panel's own resting read is spent on R50's
// "is this collection empty" question. A mock that answered only the resting key
// would draw a loading skeleton and every assertion below would fail for a
// reason that has nothing to do with the table.
vi.mock("@shared/web/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/web/store")>()
  return {
    ...actual,
    useCached: (key: string | null) => ({
      data: key && (key === "tickets-app-of:AP_1" || key.startsWith("find:")) ? TICKETS : undefined,
      error: undefined,
      refresh: () => {},
    }),
    useCachedValue: () => undefined,
    primeCache: () => {},
  }
})

import { AppTicketsTab } from "@/components/work-panels"

afterEach(cleanup)

function show() {
  return render(
    <AppTicketsTab
      teamId="T1"
      appId="AP_1"
      /* NO `marks`, and no such prop to pass one to any more. This call site
         and `app-detail.tsx`'s stopped passing them on 2026-09-07 — client,
         over the ticket list's Type column: "for type, kill the emojis. this is
         legacy. in current system we use colors." `MARK_GROUP.ticket` is gone
         (web/lib/type-marks.ts carries the ruling and what it left alone), and
         both ticket panels have since dropped the prop and the mark they drew
         with it: a ticket row's kind is the coloured pill alone. The story and
         sprint panels in work-panels.tsx still take `marks` and still draw
         them — those record kinds kept their glyphs. */
      helpTypeOptions={["Issue", "Question"]}
      host={{ base: "/t/T1" }}
      ticketTotal={2}
    />
  )
}

describe("an app's Tickets tab draws the list as a table", () => {
  it("names its four columns, and does not name the one it stands inside", () => {
    show()
    for (const header of ["Title", "Type", "Stage", "Raised"])
      expect(
        screen.getByRole("columnheader", { name: header }),
        `the ${header} column is missing from the app's ticket list`
      ).toBeTruthy()
    // HER FOURTH COLUMN WAS "App", AND IT IS THE RECORD THIS LIST IS NESTED
    // INSIDE. Every cell would repeat the page's own heading — the same
    // subtraction the Dashboard view makes when it drops the "Which app" panel.
    expect(
      screen.queryByRole("columnheader", { name: "App" }),
      "an App column drew inside one app, where every cell is the page you are on"
    ).toBeNull()
  })

  it("puts each ticket's facts in their own cells, so a column can be read down", () => {
    show()
    const rows = screen.getAllByRole("row")
    // One header row and one row per ticket. Asserted by count as well as by
    // content: a table that silently drew nothing would pass every getByText.
    expect(rows.length).toBe(3)
    const first = within(rows[1])
    expect(first.getByText("BERG-T0412"), "the number is not in the row").toBeTruthy()
    expect(
      first.getByRole("button", { name: /dispatch board stops refreshing/i }),
      "the title is not a real control — the keyboard and a screen reader have no way in"
    ).toBeTruthy()
    expect(first.getByText("Issue")).toBeTruthy()
    // The stage through the app's own closed vocabulary, never the raw column.
    expect(first.getByText("Triaged")).toBeTruthy()
  })

  it("still draws a pill for a ticket with no type, and no chip for one with no number", () => {
    show()
    const second = within(screen.getAllByRole("row")[2])
    // An em dash rather than a hole: a column with a pill on one row and
    // nothing on the next reads as the broken row, not the untyped one.
    expect(second.getByText("—")).toBeTruthy()
    expect(
      second.queryByText("BERG-T0412"),
      "the second ticket borrowed the first one's reference"
    ).toBeNull()
  })

  it("carries the view switch, so the dashboard is one press away from the list", () => {
    show()
    // The kit's `ViewSwitch` is a `SelectTrigger` underneath, so the role is a
    // combobox and its name is the `aria-label` the toolbar passes.
    expect(
      screen.getByRole("combobox", { name: "View" }),
      "the list view drew no way through to this app's own ticket dashboard"
    ).toBeTruthy()
  })
})
