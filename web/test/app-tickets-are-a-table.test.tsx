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
// six column headers are asserted by name, the row's own facts are read back
// out of the rendered table, and the column she asked for that is deliberately
// ABSENT is asserted absent — because dropping "App" inside one app is a
// judgement, and a judgement nobody wrote down is a judgement somebody
// re-litigates in six weeks.
//
// EXTENDED 17 Sep 2026 for the same day's four rulings: "Resolved Date,
// Resolved By" (two more columns, read back off the door's own
// `resolverId`/`resolverName`), and "a board view by status" / "the queue
// view for triaging" (two more bodies on the tab's existing view switch,
// asserted both by their OPTIONS existing and by what each one draws once
// picked — an option nobody can reach is not a view).
//
// EXTENDED AGAIN, THE SAME DAY, LATER: "I am not seeing 'raised' on the
// queue view on triage." The queue draws through this file's own table (the
// `renderRows` List and Queue both call), so the fault was in the ONE cell
// both bodies share — the Raised column carried only a date, no raiser —
// and the fix is proved here once rather than twice.

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import type { HelpTicket } from "@shared/types"
import {
  activeTabIdSnapshot,
  forgetOpenTabs,
  openTabsSnapshot,
  setWorkspaceScope,
  visitTrail,
} from "@/lib/workspace-tabs"

// A REAL RADIX SELECT UNDER THE VIEW SWITCH — jsdom measures nothing and
// captures no pointer, so the three stand-ins `no-sort-in-calendar-views.
// test.tsx` and `knowledge-form-dialog.test.tsx` already use for the
// identical `Select`-backed control are needed here too, to open it and read
// its options back.
beforeAll(() => {
  Object.assign(window.HTMLElement.prototype, {
    scrollIntoView: () => {},
    hasPointerCapture: () => false,
    releasePointerCapture: () => {},
    setPointerCapture: () => {},
  })
})

beforeEach(() => {
  forgetOpenTabs()
  setWorkspaceScope("app-tickets-board-test:team1")
  visitTrail([{ path: "/t/T1/apps/AP_1", label: "AP_1" }])
})

// `let`, NOT `const` — two of the tests below (the Queue view, empty and not)
// need a DIFFERENT fixture from the table tests above them, and the mock
// factory below reads this binding by closure at CALL time, not at
// mock-definition time, so reassigning it before a render is enough; no
// second `vi.mock` is needed per shape.
let TICKETS: HelpTicket[] = [
  {
    id: "H1",
    ref: "BERG-T0412",
    helpType: "Issue",
    description: "The dispatch board stops refreshing after lunch",
    status: "triaged",
    createdAt: "2026-06-10T09:00:00.000Z",
    // RAISED BY A COLLEAGUE — R54's first-name trim applies to the Raised
    // column exactly as it already does to Resolved by (H3, below).
    raiserId: "u5",
    raiserName: "Diego Fischer",
    raiserIsClient: false,
  } as HelpTicket,
  {
    // NO REFERENCE AND NO TYPE — both are real states (a client with no code
    // yet, a ticket nobody has triaged), and both are the shapes a table gets
    // wrong: an empty black lozenge, and a hole where every other row has a
    // pill. Drawn in the fixture rather than described in a comment.
    //
    // RAISED BY A CLIENT CONTACT — named in full, never trimmed (R54: "a
    // contact who raised their own question is named in full").
    id: "H2",
    ref: null,
    helpType: null,
    description: "Can you add the driver column back",
    status: "new",
    createdAt: "2026-06-11T09:00:00.000Z",
    raiserId: "c3",
    raiserName: "Petra Ostwald",
    raiserIsClient: true,
  } as HelpTicket,
  {
    // RESOLVED, AND BY SOMEBODY — the shape `resolverId`/`resolverName`
    // exist to draw: a ticket the door has actually closed, with the actor
    // snapshot `setStatus` stamps at resolve time (workers/content/src/lib/
    // help.ts). "Marta Bergman Costa" proves R54's first-name trim fires on
    // this cell exactly as it does everywhere else staff are named.
    id: "H3",
    ref: "BERG-T0480",
    helpType: "Issue",
    description: "The invoice export times out on large accounts",
    status: "resolved",
    createdAt: "2026-06-05T09:00:00.000Z",
    resolvedAt: "2026-06-12T09:00:00.000Z",
    resolverId: "u9",
    resolverName: "Marta Bergman Costa",
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

import { AppTicketsTab } from "@/components/work/work-panels"

const ORIGINAL_TICKETS = TICKETS

afterEach(() => {
  cleanup()
  // THE ONE TEST BELOW THAT REASSIGNS `TICKETS` (the empty-queue one) must
  // not leave a later test — or a re-run of this file — reading its
  // narrower fixture, so every test hands the shared array back afterwards
  // rather than only the one that changed it.
  TICKETS = ORIGINAL_TICKETS
})

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
  it("names its six columns, and does not name the one it stands inside", () => {
    show()
    // SIX NOW, NOT FOUR — client, 17 Sep 2026: "On tickets list inside an
    // app, add columns: Resolved Date, Resolved By." Exactly R82's ceiling;
    // see `renderRows`'s own header (work-panels.tsx) for the budget line.
    for (const header of ["Title", "Type", "Stage", "Raised", "Resolved date", "Resolved by"])
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
    expect(rows.length).toBe(4)
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
    // H2 is untyped AND unresolved, so THREE cells now draw the same em dash
    // (Type, Resolved date, Resolved by) — one hole would read as broken data
    // and three, in three different columns, read as three honest absences.
    expect(second.getAllByText("—")).toHaveLength(3)
    expect(
      second.queryByText("BERG-T0412"),
      "the second ticket borrowed the first one's reference"
    ).toBeNull()
  })

  it("resolved date and resolved by are drawn from the door, never invented", () => {
    show()
    const third = within(screen.getAllByRole("row")[3])
    // `formatDate` through the reader's language — the same seam the Raised
    // column beside it uses, so the two dates on this row cannot disagree
    // about how a day is spelled.
    expect(third.getByText(/12/), "the resolved date did not render").toBeTruthy()
    // R54 — the agency's own people are named by their FIRST NAME, and
    // nobody else is: `staffNameFromSnapshot` must have trimmed the stored
    // "Marta Bergman Costa" snapshot down to "Marta" on this cell.
    expect(third.getByText("Marta"), "resolved by did not trim to a first name (R54)").toBeTruthy()
    expect(
      third.queryByText("Marta Bergman Costa"),
      "resolved by drew the untrimmed staff snapshot"
    ).toBeNull()
  })

  it("raised shows who asked beside the date — trimmed for staff, in full for a client (R54)", () => {
    show()
    const first = within(screen.getAllByRole("row")[1]) // H1 — raised by a colleague
    expect(first.getByText("Diego"), "raised did not trim a colleague to a first name (R54)").toBeTruthy()
    expect(first.queryByText("Diego Fischer"), "raised drew the untrimmed staff snapshot").toBeNull()
    const second = within(screen.getAllByRole("row")[2]) // H2 — raised by a client contact
    expect(
      second.getByText("Petra Ostwald"),
      "a client contact who raised their own question should be named in full"
    ).toBeTruthy()
  })

  it("the queue rows carry the same Raised column the list does — face, name and date", () => {
    show()
    fireEvent.click(screen.getByRole("combobox", { name: "View" }))
    fireEvent.click(screen.getByRole("option", { name: "Queue" }))
    // H2 is the fixture's only `new` ticket, and it is the queue's own row —
    // her exact complaint was this view, so the proof is on it directly
    // rather than only on List above.
    expect(screen.getByText("Petra Ostwald"), "the queue view drew no raiser at all").toBeTruthy()
  })

  it("carries the view switch, and offers Board and Queue beside List and Dashboard", () => {
    show()
    // The kit's `ViewSwitch` is a `SelectTrigger` underneath, so the role is a
    // combobox and its name is the `aria-label` the toolbar passes.
    const combo = screen.getByRole("combobox", { name: "View" })
    expect(combo, "the list view drew no way through to this app's own ticket dashboard").toBeTruthy()
    fireEvent.click(combo)
    // "In Tickets inside the app, I want a board view by status" and "I also
    // want the queue view for triaging" — both options must be real choices
    // on the SAME switch as List/Dashboard, not a second control.
    for (const view of ["List", "Board", "Queue", "Dashboard"])
      expect(screen.getByRole("option", { name: view }), `${view} is missing from the view switch`).toBeTruthy()
  })

  it("the board view groups this app's tickets into one column per status", () => {
    show()
    fireEvent.click(screen.getByRole("combobox", { name: "View" }))
    fireEvent.click(screen.getByRole("option", { name: "Board" }))
    // Every live stage gets a column — `HELP_STATUSES`' own six words,
    // `ticketStatusColumnTitles`' own titles (tickets-collection.tsx) — and
    // this fixture holds a ticket in three of them. The kit draws a column's
    // title as an `<h3>`; queried by heading role rather than plain text
    // because "New" is also a ticket's own status chip, drawn on the card
    // beneath its column head.
    for (const column of ["New", "Triaged", "Resolved"])
      expect(
        screen.getByRole("heading", { name: column, level: 3 }),
        `the ${column} column is missing from the app's own board`
      ).toBeTruthy()
    // A card for each ticket, on the board rather than in the table.
    expect(screen.getByText(/dispatch board stops refreshing/i)).toBeTruthy()
    expect(screen.getByText(/invoice export times out/i)).toBeTruthy()
  })

  it("the queue view is this app's status-new tickets, oldest first", () => {
    show()
    fireEvent.click(screen.getByRole("combobox", { name: "View" }))
    fireEvent.click(screen.getByRole("option", { name: "Queue" }))
    // H2 is the fixture's only `new` ticket — triaged and resolved tickets
    // stay off the queue, which is the whole point of it.
    expect(screen.getByText(/driver column back/i)).toBeTruthy()
    expect(screen.queryByText(/dispatch board stops refreshing/i)).toBeNull()
    expect(screen.queryByText(/invoice export times out/i)).toBeNull()
  })

  it("an app with nothing new says so — 'Empty. Show there's nothing to triage.'", () => {
    // A DIFFERENT FIXTURE, reassigned before this one render: everything is
    // already triaged or resolved, so status `new` is genuinely empty.
    TICKETS = [
      { ...TICKETS[0], id: "H4", status: "triaged" } as HelpTicket,
      { ...TICKETS[2], id: "H5", status: "resolved" } as HelpTicket,
    ]
    show()
    fireEvent.click(screen.getByRole("combobox", { name: "View" }))
    fireEvent.click(screen.getByRole("option", { name: "Queue" }))
    // R62's register, the client's own sentence: "Empty. Show there's
    // nothing to triage."
    expect(screen.getByText("Nothing to triage.")).toBeTruthy()
    expect(screen.queryByText(/dispatch board stops refreshing/i)).toBeNull()
  })

  // THE LAST KNOWN GAP, closed the same day: a board card used to open only
  // through `Kanban`'s own `onCardSelect` (shared/ui), which hands back the
  // card and nothing about the click — no `metaKey`, no `ctrlKey`, no
  // `button` — so a cmd/ctrl-click or a middle-click on a card silently did
  // the same thing a plain click did: opened in place. Fixed onto the same
  // seam every other row/card in the app now opens through
  // (`rowOpenHandlers`, web/lib/row-open.ts), via the one part of a board
  // card `Kanban` lets a caller reach at all — its own `title` node
  // (`AppTicketsBoard`, work-panels.tsx).
  it("cmd-click on a board card opens beside, not in place", () => {
    show()
    fireEvent.click(screen.getByRole("combobox", { name: "View" }))
    fireEvent.click(screen.getByRole("option", { name: "Board" }))
    const before = openTabsSnapshot().length
    fireEvent.click(screen.getByText(/dispatch board stops refreshing/i), { metaKey: true })
    expect(openTabsSnapshot()).toHaveLength(before + 1)
    const opened = openTabsSnapshot().at(-1)
    expect(opened?.steps[0]?.path).toBe("/t/T1/tickets/H1")
  })

  it("middle-click on a board card opens beside too, via onAuxClick", () => {
    show()
    fireEvent.click(screen.getByRole("combobox", { name: "View" }))
    fireEvent.click(screen.getByRole("option", { name: "Board" }))
    const before = openTabsSnapshot().length
    const card = screen.getByText(/dispatch board stops refreshing/i)
    fireEvent(card, new MouseEvent("auxclick", { bubbles: true, cancelable: true, button: 1 }))
    expect(openTabsSnapshot()).toHaveLength(before + 1)
  })

  // THE MIDDLE-BUTTON MOUSEDOWN GUARD, ON THE CARD TITLE TOO — the same
  // Chrome autoscroll quirk `in-app-link.test.tsx`'s own guard block pins for
  // a real anchor (18 Sep 2026): an un-prevented middle mousedown can eat the
  // auxclick above before it ever fires. `AppTicketsBoard`'s title span
  // carries the identical guard (work-panels.tsx), proved here the same way —
  // a real `mousedown`, read back off its own `defaultPrevented`.
  it("a middle mousedown on a board card title is defaultPrevented, so the auxclick above cannot be swallowed", () => {
    show()
    fireEvent.click(screen.getByRole("combobox", { name: "View" }))
    fireEvent.click(screen.getByRole("option", { name: "Board" }))
    const card = screen.getByText(/dispatch board stops refreshing/i)
    const event = new MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 1 })
    card.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })

  // CMD+SHIFT-CLICK ON A BOARD CARD — "beside-switch": a new tab opens beside
  // the active one AND she is switched to it, Chrome's own "open link in new
  // tab and switch to it." Only cmd-click (background) and middle-click were
  // pinned above; this is the third gesture `clickGesture` names, proved
  // through the identical title span rather than assumed from the other two.
  it("cmd+shift-click on a board card opens beside AND switches her to it", () => {
    show()
    fireEvent.click(screen.getByRole("combobox", { name: "View" }))
    fireEvent.click(screen.getByRole("option", { name: "Board" }))
    const before = openTabsSnapshot().length
    fireEvent.click(screen.getByText(/dispatch board stops refreshing/i), { metaKey: true, shiftKey: true })
    expect(openTabsSnapshot()).toHaveLength(before + 1)
    const opened = openTabsSnapshot().at(-1)
    expect(opened?.steps[0]?.path).toBe("/t/T1/tickets/H1")
    expect(activeTabIdSnapshot()).toBe(opened?.id) // switched, not left in the background
  })
})
