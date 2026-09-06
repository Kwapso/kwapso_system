// A CHART THAT DROPPED SOMETHING HAS TO SAY SO.
//
// The tickets dashboard is the one screen in this app where every number was
// counted by somebody else — the database, over the whole backlog — and where
// nothing on screen can be checked against a row. Nobody scans a chart the way
// they scan a list. So the failure mode here is not a wrong number; it is a
// picture that is silently narrower than its own heading, and there is no way
// for a reader to notice.
//
// Three of those are built into the door on purpose, and each one is a
// subtraction a reader must be told about:
//
//   · the twelve-month trend DROPS any (month, kind) bucket under the floor,
//     which is why two kinds are drawn and two are not;
//   · the recategorisation matrix EXCLUDES every ticket raised before the
//     column existed, which is a denominator quietly missing ~800 rows;
//   · the closing-time spread only looks back six months.
//
// This suite mounts the real screen over each of those payloads and reads what
// a person would actually see. A source scan for the sentences would pass on a
// sentence rendered inside a branch nobody reaches — which is exactly the shape
// these three are: every one of them is in an `if`.
//
// It also mounts the screen over an EMPTY answer and over a full one, which is
// the cheap half: this component draws its own marks (the kit has no box plot,
// no heat grid and no gapped area), so an arithmetic slip in a `calc()` or an
// off-by-one walking the trend's runs is a blank panel in production and a
// green build everywhere else.

import * as React from "react"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { TicketDashboard } from "@/lib/api/content"
import { CLOSURE_TREND_MIN_CLOSURES, CLOSURE_WINDOW_MONTHS } from "@shared/types"

const holder = vi.hoisted(() => ({ view: undefined as TicketDashboard | undefined }))

// The dashboard read is the only cache this screen has an opinion about; the
// accounts read behind the Client facet resolves to the same stub and answers
// an empty option list, which is a facet with nothing in it rather than a crash.
vi.mock("@shared/web/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/web/store")>()
  return {
    ...actual,
    useCached: (key: string | null) => ({
      data: key && key.startsWith("help-dashboard:") ? holder.view : [],
      error: undefined,
      refresh: () => {},
    }),
  }
})

import { TicketsDashboard } from "@/components/tickets-dashboard"

afterEach(cleanup)

const TYPES = ["Issue", "Question", "Request", "Extra"]

const EMPTY: TicketDashboard = {
  openByTypeAndStatus: [],
  byAccountAndType: [],
  closureDays: [],
  closureTrend: [],
  raisedVsCurrent: [],
  raisedAsNotRecorded: 0,
  openByApp: [],
  unopenedPastLine: 0,
}

/** A backlog with something in every panel, so the happy path is exercised as
 * well as the three subtractions. */
const FULL: TicketDashboard = {
  openByTypeAndStatus: [
    { helpType: "Issue", status: "new", n: 9 },
    { helpType: "Issue", status: "triaged", n: 6 },
    { helpType: "Question", status: "new", n: 4 },
    { helpType: "Request", status: "in_progress", n: 3 },
    { helpType: "Extra", status: "awaiting_validation", n: 7 },
  ],
  byAccountAndType: [
    { accountId: "a1", accountName: "Bergmann Group", helpType: "Extra", open: 4, total: 9 },
    { accountId: "a2", accountName: null, helpType: "Extra", open: 3, total: 5 },
    { accountId: "a1", accountName: "Bergmann Group", helpType: "Request", open: 5, total: 11 },
  ],
  closureDays: [
    { helpType: "Issue", n: 118, minDays: 0, p25Days: 2, medianDays: 4, p75Days: 9, maxDays: 31 },
    { helpType: "Request", n: 21, minDays: 3, p25Days: 9, medianDays: 18, p75Days: 34, maxDays: 96 },
  ],
  closureTrend: [
    { helpType: "Issue", month: "2026-07", n: 40, medianDays: 5 },
    { helpType: "Issue", month: "2026-08", n: 38, medianDays: 4 },
    { helpType: "Issue", month: "2026-09", n: 41, medianDays: 3 },
    { helpType: "Request", month: "2026-07", n: 12, medianDays: 18 },
    // AUGUST IS MISSING FOR REQUEST, deliberately: the door dropped it under the
    // floor, so the area has to break rather than dive to the baseline and claim
    // that month was instant.
    { helpType: "Request", month: "2026-09", n: 11, medianDays: 15 },
  ],
  raisedVsCurrent: [
    { raisedAsType: "Issue", helpType: "Issue", n: 68 },
    { raisedAsType: "Issue", helpType: "Question", n: 39 },
    { raisedAsType: "Issue", helpType: "Request", n: 34 },
    { raisedAsType: "Question", helpType: "Request", n: 12 },
  ],
  raisedAsNotRecorded: 788,
  openByApp: [
    { appId: "p1", appName: "Bergmann Portal", helpType: "Issue", open: 8, total: 20 },
    { appId: "p1", appName: "Bergmann Portal", helpType: "Request", open: 3, total: 7 },
    { appId: null, appName: null, helpType: "Issue", open: 2, total: 4 },
  ],
  unopenedPastLine: 7,
}

function show(view: TicketDashboard | undefined, total: number | undefined = 62) {
  holder.view = view
  return render(
    <TicketsDashboard teamId="T1" helpTypeOptions={TYPES} ticketTotal={total} />
  )
}

/** THE SAME SCREEN, STANDING INSIDE ONE APP — the app record's Tickets tab in
 * its Dashboard view. Same component, same payload, one extra prop, which is
 * the whole claim being tested: it is a filtered version of this dashboard and
 * not a second one. */
function showForApp(view: TicketDashboard | undefined, total: number | undefined = 62) {
  holder.view = view
  return render(
    <TicketsDashboard
      teamId="T1"
      appId="AP_1"
      helpTypeOptions={TYPES}
      ticketTotal={total}
      viewSlot={{
        views: [
          { value: "list", label: "List" },
          { value: "dashboard", label: "Dashboard" },
        ],
        value: "dashboard",
        onValueChange: () => {},
      }}
    />
  )
}

describe("the tickets dashboard says what it left out", () => {
  it("names the floor under the trend, so two missing kinds are not read as perfect", () => {
    show(FULL)
    expect(
      screen.getByText(
        new RegExp(`at least ${CLOSURE_TREND_MIN_CLOSURES} of a kind closed`, "i")
      ),
      "the trend drew two kinds and never said why the other two are absent"
    ).toBeTruthy()
  })

  it("names the tickets the matrix cannot speak for, as a number", () => {
    show(FULL)
    // 0065 refused to backfill precisely so this could be TOLD rather than
    // folded into the diagonal, where it would be a rate over a denominator
    // that had quietly changed.
    expect(screen.getByText(/788 older tickets have no record/i)).toBeTruthy()
  })

  it("says the closing-time spread only looks back six months, when there is nothing in it", () => {
    // CLIENT, 6 Sep 2026: "for this how long, only consider the latest 6
    // months." It was ninety days, and the UNIT moved with the number rather
    // than being converted — `CLOSURE_WINDOW_MONTHS` is read by the door's SQL
    // and by this sentence, so the window and its caption cannot drift apart.
    show({ ...FULL, closureDays: [] })
    expect(
      screen.getByText(new RegExp(`last ${CLOSURE_WINDOW_MONTHS} months`, "i"))
    ).toBeTruthy()
  })

  it("no longer says the weekend does not count — she already knows (6 Sep 2026)", () => {
    // THE SENTENCE WENT; THE ARITHMETIC DID NOT. Her words: "remove the subtitle
    // 'working days only.' It's not needed. We already know it." The panel's
    // durations are still counted Monday to Friday by the one shared seam
    // (`shared/business-days.ts`, under both of the door's reads) — the caption
    // was a description of that, never the thing itself. Asserted as an ABSENCE
    // rather than deleted, because the previous version of this test asserted
    // its presence and a removed test proves nothing: the caption coming back on
    // somebody's next pass at this panel is exactly the regression to catch.
    show(FULL)
    expect(
      screen.queryByText(/Saturday and Sunday do not count/i),
      "the retired 'working days only' subtitle is back on the closing-time panel"
    ).toBeNull()
    // …and the panel it belonged to still draws, so this is a removed line and
    // not a removed panel.
    expect(screen.getByText("How long a ticket takes to close")).toBeTruthy()
  })

  it("puts the middle ticket, the middle half and the longest behind the ROW — reachable by keyboard, and by a screen reader without the hover", () => {
    // A DELIBERATE REVERSAL BY THE CLIENT, NOT A REGRESSION, and it is written
    // here because that is the only place the difference is visible.
    //
    // EARLIER on 6 Sep 2026 she said: "it brings me a lot of value (the
    // subtitle of, for example, 'middle ticket 0 days,' blah blah blah), but I
    // wonder: this information only appears when I hover over the type." The
    // answer then was that it had never been behind a hover, and this test was
    // written to pin it AT REST so it could not drift there.
    //
    // LATER THE SAME DAY, having read the shipped screen: "the 'Middle ticket 0
    // days · middle half 0 to 0 · longest 16' i want to see it when hovering
    // over the row." That is exactly what the old assertion forbade. So the
    // assertion was rewritten rather than deleted — a deleted test would leave
    // the next reader unable to tell a decision from a regression, and the
    // coverage that matters did not go away, it changed shape: what is pinned
    // now is that hiding it behind a POINTER did not hide it from anybody else.
    //
    // THREE CLAUSES, and the last two are the ones that make the first
    // acceptable at all.
    show(FULL)

    // 1 · IT IS NOT WRITTEN OUT AT REST any more. `getByText` reads rendered
    //     TEXT and never an `aria-label`, so this is the honest test of "she
    //     no longer sees it until she hovers".
    expect(
      screen.queryByText(/Middle ticket 4 days · middle half 2 to 9 · longest 31/i),
      "the readout is still printed at rest — the client asked for it behind a hover on the row"
    ).toBeNull()

    // 2 · IT IS A REAL BUTTON CARRYING THE WHOLE READOUT AS ITS ACCESSIBLE
    //     NAME. `getByRole("button", { name })` is both halves at once: a
    //     screen reader is told the three figures by the row itself, with no
    //     pointer anywhere near it, and the control is in the tab order, so the
    //     kit's `HoverCard` (Radix) opens on FOCUS as well as on hover. The
    //     same shape the trend panel beside it already uses.
    const issue = screen.getByRole("button", {
      name: "Middle ticket 4 days · middle half 2 to 9 · longest 31",
    })
    const request = screen.getByRole("button", {
      name: "Middle ticket 18 days · middle half 9 to 34 · longest 96",
    })

    // 3 · AND NOT THE BROWSER'S NATIVE `title`, which is mouse-only, has no
    //     keyboard route at all and is announced inconsistently. The one
    //     affordance this panel gained had to be the kit's, on a focusable
    //     control, or the reversal would have cost the keyboard reader the
    //     figures outright.
    for (const row of [issue, request]) {
      expect(row.getAttribute("title"), "the readout fell back to a native title").toBeNull()
      expect(
        row.getAttribute("tabindex"),
        "the row was taken out of the tab order, so the figures are pointer-only"
      ).toBeNull()
      expect(row.hasAttribute("disabled")).toBe(false)
    }
  })

  it("draws the whole screen over a full answer without falling over", () => {
    show(FULL)
    for (const heading of [
      "The open work",
      "Which app",
      "Who has more",
      "Raised as, then triaged as",
      "How long a ticket takes to close",
      // The trend became a titled panel of its own on 6 Sep 2026 — "same style
      // as How long a ticket takes to close put text above the mountain graph
      // 'Tendency'" — so it is a heading to find, not a grey label inside
      // somebody else's card.
      "Tendency",
    ])
      expect(screen.getByText(heading), `the ${heading} panel did not render`).toBeTruthy()
    // The chip is the one number on this screen that is about US rather than
    // about the work, so it is the one worth asserting by value.
    expect(screen.getByText(/7 past the three-day line/i)).toBeTruthy()
    // THE TREND BREAKS AT THE MONTH THE DOOR DROPPED, rather than joining
    // across it and claiming a wait nobody measured. Issue has three months in
    // a row and draws one line; Request has July and September with August
    // missing, so it draws no line at all and two dots — which is the shape
    // that keeps it out of the plot's arithmetic while keeping it visible
    // beside its own name in the legend.
    expect(document.querySelectorAll("polyline").length, "the areas joined across a dropped month").toBe(1)
    expect(
      document.querySelectorAll('[data-slot="trend-point"]').length,
      "a lone month vanished off the plot"
    ).toBe(2)
  })

  it("draws the matrix's axes even with nothing in it, AND still says why it is empty", () => {
    // CLIENT, 6 Sep 2026: "in raised as pls display the graphic already even if
    // it's empty." The empty answer used to REPLACE the picture with its own
    // paragraph, which made this the one panel whose shape a reader could not
    // learn until the data arrived — and its shape (arrived down, decided
    // across, the diagonal for what nobody moved) is the whole point of it.
    //
    // BOTH HALVES, because the sentence is not decoration: `raised_as_type` is
    // a new column and migration 0065 deliberately left the old rows null, so
    // an empty grid is a YOUNG COLUMN and not a quiet week. Losing that
    // sentence to make room for the picture would have been the worse trade.
    show({ ...EMPTY, openByTypeAndStatus: FULL.openByTypeAndStatus })
    expect(screen.getByText(/nothing to compare yet/i)).toBeTruthy()
    const matrix = screen.getByText("Became").parentElement as HTMLElement
    expect(matrix, "the matrix drew no grid at all on an empty answer").toBeTruthy()
    // One heading row (the corner + a column per kind) and one row per kind
    // (its own name + a cell per kind) — the axes and their zeros, exactly the
    // structure a full answer draws.
    expect(
      matrix.childElementCount,
      "the empty matrix is not the same grid the full one draws"
    ).toBe((TYPES.length + 1) * (TYPES.length + 1))
  })

  it("a team with no tickets at all gets the empty state and NO toolbar (R50)", () => {
    show(EMPTY, 0)
    expect(screen.getByText(/Nothing is open right now/i)).toBeTruthy()
    expect(
      screen.queryByRole("button", { name: /filter/i }),
      "R50 — a toolbar drew over a collection with no rows in it at all"
    ).toBeNull()
  })

  it("…but a FILTER that finds nothing keeps the toolbar, so the reader can get back out", () => {
    // The difference this test exists for: an empty ANSWER is not an empty
    // COLLECTION, and taking the filters away at the moment somebody filters
    // themselves into a corner is the one thing that traps them there.
    show(EMPTY, 62)
    expect(screen.getByRole("button", { name: /filter/i })).toBeTruthy()
  })
})

// ── THE SAME DASHBOARD, INSIDE ONE APP ──────────────────────────────────────
//
// The app record's Tickets tab is a list and this (client, 6 Sep 2026: "make
// the dashboard a view inside the Tickets tab inside the app … like a mini
// version, a filtered version"). Two of the five panels stand down there, and
// that judgement is the part worth locking: it is invisible to every other
// check in this repo, and both directions of getting it wrong are silent.
//
// Drawing "Which app" inside one app is a bar chart of one bar under a heading
// naming the record you are standing on — furniture, not information. Drawing
// "Who has more, by client" is a ranking of one, because an app row carries a
// single `accountId`. And DROPPING a panel that still says something would be
// the same failure the other way round: a reader on this tab believing they had
// seen the whole picture of their system.
describe("the app's own tickets dashboard is the same one, narrowed", () => {
  it("drops the two panels one app empties of meaning", () => {
    showForApp(FULL)
    expect(
      screen.queryByText("Which app"),
      "a per-system chart drew inside one system — one bar at 100% of its own scale"
    ).toBeNull()
    expect(
      screen.queryByText("Who has more"),
      "a by-client ranking drew inside one app, which has one client by construction"
    ).toBeNull()
  })

  it("keeps the three that still answer a question about this system", () => {
    showForApp(FULL)
    for (const heading of [
      // where this app's open work is stuck
      "The open work",
      // whether what arrives about it is what it turns out to be
      "Raised as, then triaged as",
      // how long we take to close things on it…
      "How long a ticket takes to close",
      // …and which way that is going. Two panels since 6 Sep 2026, and BOTH
      // have to survive the narrowing: the split was a layout decision on the
      // whole-team screen, and a layout decision that quietly dropped a panel
      // inside an app record would be a second dashboard by accident.
      "Tendency",
    ])
      expect(screen.getByText(heading), `the ${heading} panel is missing from the app's dashboard`).toBeTruthy()
    // The subtractions the panels have to keep announcing — the same three the
    // suite above proves for the whole-team screen. A "mini version" that
    // stopped saying what it left out would be the worse half of this feature.
    expect(screen.getByText(/788 older tickets have no record/i)).toBeTruthy()
    expect(
      screen.getByText(
        new RegExp(`at least ${CLOSURE_TREND_MIN_CLOSURES} of a kind closed`, "i")
      ),
      "the app's own dashboard drew the trend without naming the floor under it"
    ).toBeTruthy()
  })

  it("offers no Client filter, because an app is built for one client", () => {
    // The same subtraction the "Who has more" panel makes, made at the toolbar:
    // a control whose only meaningful setting is the one already in force is a
    // fact wearing a control's clothes. The Kind filter stays — a system's
    // Issues and its Requests are a real question inside one app.
    showForApp(FULL)
    expect(screen.getByRole("button", { name: /filter/i })).toBeTruthy()
    expect(screen.queryByText("Client"), "a Client facet drew inside one app").toBeNull()
  })

  it("draws the view switch, so the list is one press away", () => {
    // R50 takes the WHOLE row away on an empty collection, this switch
    // included — which is correct and is why the list leads: a reader only ever
    // reaches this view from a tab that had rows.
    showForApp(FULL)
    // A `SelectTrigger` under the hood (the kit's `ViewSwitch`), so the role is
    // a combobox and the accessible name is the `aria-label` the row passes —
    // the pill draws no visible label, its own text is the current view.
    expect(
      screen.getByRole("combobox", { name: "View" }),
      "the dashboard view drew no way back to the list"
    ).toBeTruthy()
  })
})

// ── THE CLIENT'S SEVEN, 6 SEPTEMBER 2026 ────────────────────────────────────
//
// She reviewed the shipped screen and sent one list. Four of the seven are
// invisible to every other check in this repo — an ORDER, a ROW COUNT, a
// PRESENT BUTTON and a REACHABLE FIGURE all render the same words as their
// broken twins, so nothing but a test that reads the DOM can tell them apart.
// The other three (the taller plot, the month rules, the retired caption) are
// covered above or are pure geometry.

/** The vocabulary as a team might really hold it: NOT in the client's order (the
 * seed's own order starts with Question), and FIVE words rather than four — the
 * base seeds Requirements alongside the four the client named. Both facts are
 * load-bearing below, and both are true of a real team today. */
const SCRAMBLED = ["Question", "Extra", "Requirements", "Request", "Issue"]

function showWith(
  types: string[],
  props: Partial<React.ComponentProps<typeof TicketsDashboard>> = {}
) {
  holder.view = FULL
  return render(
    <TicketsDashboard teamId="T1" helpTypeOptions={types} ticketTotal={62} {...props} />
  )
}

describe("the open work is one row per stage, with the kinds named on top", () => {
  it("draws ONE grid row per stage, however many kinds the team uses", () => {
    // THE DEFECT, IN ONE SENTENCE. This panel used to draw each stage as a label
    // line plus its own `lg:grid-cols-4` of bars, and 4 is a constant while the
    // number of `Ticket type` values is not — the base SEEDS FIVE. So every
    // stage wrapped onto a second line ("each status should have only one row.
    // I don't know why some of them have two"), and which ones looked doubled
    // depended on whether the wrapped fifth cell held a bar or an em dash.
    //
    // The fix is that the column count is DERIVED from the vocabulary, so the
    // assertion is about the structure and not about the words: one heading row
    // plus one row per open stage, each of (1 stage name + 1 cell per kind).
    showWith(SCRAMBLED)
    const grid = document.querySelector('[data-slot="open-work"]') as HTMLElement
    expect(grid, "the open work no longer draws its one grid").toBeTruthy()
    // FULL has something open at four of the six stages.
    const stages = 4
    expect(
      grid.style.gridTemplateColumns,
      "the kind columns are not counted off the vocabulary"
    ).toContain(`repeat(${SCRAMBLED.length},`)
    expect(
      grid.childElementCount,
      "the stage rows and the kind columns disagree — a stage is wrapping again"
    ).toBe((stages + 1) * (SCRAMBLED.length + 1))
  })

  it("names every kind on top of its own column, and only once", () => {
    // "on top of each column, put the name of the legend like you did in your
    // artifact". The separate legend strip this panel used to carry above the
    // bars is gone with it: a key written twice is a key a reader has to check
    // for agreement.
    showWith(SCRAMBLED)
    const grid = document.querySelector('[data-slot="open-work"]') as HTMLElement
    const heading = [...grid.children].slice(1, SCRAMBLED.length + 1)
    expect(heading.map((c) => c.textContent)).toEqual([
      "Issue",
      "Question",
      "Request",
      "Extra",
      "Requirements",
    ])
  })
})

describe("the stage axis reads as a journey, and a stage nobody is in is not drawn", () => {
  it("puts waiting on the client immediately above ready", () => {
    // CLIENT, 6 Sep 2026: "in the open work add waiting before ready."
    //
    // `OPEN_HELP_STATUSES` leads with `awaiting_validation`, because it is
    // `HELP_STATUSES` minus the closed one and that array is written in the
    // order the STATE MACHINE names its states. Read top to bottom as a
    // pipeline, that put "Waiting on you" ABOVE "New" — before the ticket has
    // been looked at — and left "Ready" alone at the bottom. The view now
    // reorders (`PIPELINE_STAGES`); nothing about the lifecycle moved, which is
    // why this is asserted on the SCREEN and not on the shared constant.
    //
    // The fixture has something open at four stages, so all four are drawn and
    // the two the note is about are adjacent and in her order.
    showWith(TYPES)
    const grid = document.querySelector('[data-slot="open-work"]') as HTMLElement
    const stride = TYPES.length + 1
    const stages = [...grid.children]
      .filter((_, i) => i >= stride && i % stride === 0)
      .map((c) => c.textContent)
    expect(stages, "the pipeline is not read in the client's stage order").toEqual([
      "New",
      "Triaged",
      "In progress",
      "Waiting on you",
    ])
  })

  it("drops a stage only when EVERY kind is at nothing in it", () => {
    // "whe a status is completely empty do not show it." COMPLETELY is the
    // whole rule, and it is the half a careless fix gets wrong: a stage holding
    // ONE ticket still draws its full row, because the zeros beside that one
    // bar are the comparison the row exists for.
    //
    // `scheduled` and `ready` are empty across every kind in the fixture, so
    // they are absent; `in_progress` holds a single kind's three tickets, so it
    // is present with three dashes beside it.
    showWith(TYPES)
    const grid = document.querySelector('[data-slot="open-work"]') as HTMLElement
    const stride = TYPES.length + 1
    const stages = [...grid.children]
      .filter((_, i) => i >= stride && i % stride === 0)
      .map((c) => c.textContent)
    expect(stages, "an empty stage drew a row of dashes").not.toContain("Scheduled")
    expect(stages, "an empty stage drew a row of dashes").not.toContain("Ready")
    expect(
      stages,
      "a stage with a single kind in it was dropped — 'completely empty' means every kind"
    ).toContain("In progress")
    // …and the row that survives on one kind is a WHOLE row: its stage name
    // plus a cell for every kind, three of them showing nothing.
    const at = stages.indexOf("In progress")
    const row = [...grid.children].slice(stride * (at + 1) + 1, stride * (at + 2))
    expect(row.filter((c) => c.textContent === "–").length, "the empty cells beside the one bar are missing").toBe(
      TYPES.length - 1
    )
  })
})

describe("which app is bounded by the row beside it, not by a count it apologises for", () => {
  it("names every system the door answered with, and never 'and N more'", () => {
    // CLIENT, 6 Sep 2026: "on which app do not 'and 14 more systems' - make it
    // as long as the who has more container."
    //
    // Both the eight-system ceiling and the sentence that confessed it are
    // gone. What bounds the list now is the HEIGHT of the grid row, measured
    // from its siblings rather than typed here: the rows sit `absolute` inside
    // a `flex-1` box, so this panel contributes no height of its own and takes
    // whatever "Who has more" and the matrix set. Anything past that scrolls,
    // which is why nothing has to be dropped or announced.
    //
    // Nine systems, one more than the retired ceiling, so a surviving `slice`
    // would show itself as a missing name and a sentence.
    holder.view = {
      ...FULL,
      openByApp: Array.from({ length: 9 }, (_, i) => ({
        appId: `p${i}`,
        appName: `System ${i}`,
        helpType: "Issue",
        open: 9 - i,
        total: 20,
      })),
    }
    render(<TicketsDashboard teamId="T1" helpTypeOptions={TYPES} ticketTotal={62} />)
    const panel = screen.getByText("Which app").closest('[data-slot="card"]') as HTMLElement
    expect(panel.textContent, "the overflow sentence is back").not.toMatch(/more systems/i)
    for (let i = 0; i < 9; i++)
      expect(
        screen.getByText(`System ${i}`),
        `System ${i} was dropped — the panel is capping its rows again instead of being bounded by the row`
      ).toBeTruthy()
  })
})

describe("the panels carry no subtitles any more", () => {
  it("none of the four the client named by their words is on screen", () => {
    // "rmoeve all subtitles: Every open ticket, as one pipeline per kind down a
    // shared set of stages. Open tickets against the thing you built. Open work
    // by client, for the kinds that wait for a client to confirm. What your
    // morning is actually spent on."
    //
    // Asserted as an ABSENCE with the panels still present beside it, the same
    // shape as the retired "working days only" caption above: a removed line is
    // not a removed panel, and the regression to catch is somebody writing the
    // fifth one on their next pass.
    showWith(TYPES)
    for (const gone of [
      "Every open ticket, as one pipeline per kind down a shared set of stages.",
      "Open tickets against the thing you built.",
      "Open work by client, for the kinds that wait for a client to confirm.",
      "What your morning is actually spent on.",
      // …and the two grey labels INSIDE the closing-time panel, which the split
      // below replaced with real headings: "in the how logn ticket takes to
      // close remove subtitle 'What it is now' and 'Which way it is going'".
      "What it is now",
      "Which way it is going",
    ])
      expect(screen.queryByText(gone), `a retired subtitle is back: ${gone}`).toBeNull()
    for (const kept of ["The open work", "Which app", "Who has more", "Raised as, then triaged as"])
      expect(screen.getByText(kept), `${kept} lost its panel, not just its subtitle`).toBeTruthy()
  })

  it("the closing time is two panels on one row, a third and two thirds", () => {
    // "the how long, split in 2 containers same row" · "the how long 1/3, the
    // graph 2/3". Two CARDS now, so the assertion is about the boxes and their
    // tracks rather than about the words: a `col-span` written on a card that
    // is not in a grid, or two headings inside one card, would both pass a text
    // search and neither is what she asked for.
    showWith(TYPES)
    const spread = screen.getByText("How long a ticket takes to close").closest('[data-slot="card"]')
    const trend = screen.getByText("Tendency").closest('[data-slot="card"]')
    expect(spread, "the distribution is not its own card").toBeTruthy()
    expect(trend, "the trend is not its own card").toBeTruthy()
    expect(spread, "the two closing-time panels are still one container").not.toBe(trend)
    // SIBLINGS IN ONE GRID ROW, which is also what makes them one height: the
    // trend's plot measures itself from the distribution beside it.
    expect(spread!.parentElement, "the two panels are not in the same row").toBe(trend!.parentElement)
    expect(spread!.parentElement!.className).toContain("lg:grid-cols-3")
    expect(trend!.className, "the graph does not take two thirds of the row").toContain("lg:col-span-2")
    expect(spread!.className, "the distribution is not a single track").not.toContain("col-span")
  })
})

describe("every graph reads the kinds in the client's one order", () => {
  // "the order: for all the graphs, it's always: 1. issue 2. question
  // 3. request 4. extra." Held in ONE place (`orderTicketTypes`,
  // web/lib/type-colours.ts, beside the colours and keyed the same way), so a
  // fifth kind is one decision rather than five panels to remember.
  const order = (within: Element, words: string[]) => {
    const text = within.textContent ?? ""
    const seen = words.map((w) => ({ w, at: text.indexOf(w) }))
    expect(
      seen.filter((s) => s.at === -1).map((s) => s.w),
      "a kind vanished from a panel that still counts it"
    ).toEqual([])
    expect(
      [...seen].sort((a, b) => a.at - b.at).map((s) => s.w),
      "this panel is not reading the kinds in the client's order"
    ).toEqual(words)
  }

  // THE OPEN WORK'S own columns are proved one describe up, by the heading test
  // — it reads the heading cells themselves, which is stricter than a text
  // search can be here (a stage name could otherwise be mistaken for a kind).

  it("orders the matrix's two axes the same way", () => {
    showWith(SCRAMBLED)
    // `Became` heads the matrix's own column strip, so the grid it sits in is
    // the one to read. Its axes are `types` — the same array the pipeline above
    // takes — which is the whole point of sorting once in the screen.
    const matrix = screen.getByText("Became").parentElement as HTMLElement
    order(matrix, ["Issue", "Question", "Request", "Extra"])
  })

  it("orders the per-system legend the same way", () => {
    showWith(SCRAMBLED)
    // WHICH APP — its stacked segments and its legend are both built from
    // `types`, so one read of the panel proves both. Only the two kinds the
    // fixture actually has open against a system appear in it; the legend draws
    // every kind, so reading the whole card is the honest scope.
    const panel = screen.getByText("Which app").closest('[data-slot="card"]') as HTMLElement
    order(panel, ["Issue", "Question", "Request", "Extra", "Requirements"])
  })

  it("keeps a kind the order has never heard of, after the four it has", () => {
    // The retiring "Requirements", a word a team typed itself, a kind that only
    // exists on imported tickets: it sorts to the END and still draws. A type
    // that vanished from a chart because nobody had ranked it is exactly the
    // silent subtraction this whole screen exists to avoid.
    // The vocabulary leads with the unknown word AND the fixture's rows carry
    // three more kinds the vocabulary has dropped — both routes into `types`,
    // exercised at once. Every one of them still draws; the four the client
    // named lead, and the word nobody ranked is last rather than absent.
    showWith(["Requirements", "Issue"])
    const grid = document.querySelector('[data-slot="open-work"]') as HTMLElement
    const heading = [...grid.children].slice(1, 6).map((c) => c.textContent)
    expect(heading).toEqual(["Issue", "Question", "Request", "Extra", "Requirements"])
  })
})

describe("the trend is as tall as the panel beside it, ruled by month, and answers a hover", () => {
  it("draws one vertical rule per month, behind the areas", () => {
    // "add me some vertical lines that show the months". Named marks, because
    // the lone-month DOT is also an SVG `<line>` — see the component.
    showWith(TYPES)
    const months = new Set(FULL.closureTrend.map((r) => r.month))
    expect(
      document.querySelectorAll('[data-slot="trend-month-rule"]').length,
      "the month rules do not match the months on the plot"
    ).toBe(months.size)
  })

  it("gives every month a focusable hit area naming that month's real figures", () => {
    // "I want that when I hover over the graphic on a specific day, it has a
    // little modal that gives me the info for this date." The x-axis is MONTHS,
    // so a point is a month — and the affordance is a real `<button>`, so it is
    // in the tab order and the kit's hover card opens on focus as well as on
    // hover. The figures ride the button's own accessible NAME, so a screen
    // reader hears them whether or not the floating panel ever opens.
    showWith(TYPES)
    // 2026-09 has both kinds, in the client's order rather than the paint order
    // (Request's median is the larger, so it is painted FIRST and read LAST).
    expect(
      screen.getByRole("button", {
        name: "2026-09 · Issue: 3 days, from 41 closed · Request: 15 days, from 11 closed",
      })
    ).toBeTruthy()
    // AUGUST DROPPED REQUEST at the door, so August's card says nothing about
    // Request rather than writing it as nought days — printing a zero here is
    // exactly the lie `CLOSURE_TREND_MIN_CLOSURES` exists to prevent.
    const august = screen.getByRole("button", { name: /^2026-08/ })
    expect(august.getAttribute("aria-label")).toBe("2026-08 · Issue: 4 days, from 38 closed")
  })
})

describe("the toolbar carries the same create button every other ticket tab has", () => {
  // CLIENT: "On the dashboard, I'm missing the full toolbar, so go ahead and
  // implement that." The row passed `filters` and `view` and nothing else, so
  // its right-hand end was empty while every sibling tab had a create button
  // there. The node comes from the HOST — the identical one its list body draws
  // — which is what makes "the same button" a fact rather than a claim.
  it("draws the host's raise-ticket action in the row", () => {
    showWith(TYPES, { actions: <button type="button">Raise ticket</button> })
    expect(screen.getByRole("button", { name: "Raise ticket" })).toBeTruthy()
  })

  it("…and loses it with the rest of the row on a team with no tickets at all (R50)", () => {
    holder.view = EMPTY
    render(
      <TicketsDashboard
        teamId="T1"
        helpTypeOptions={TYPES}
        ticketTotal={0}
        actions={<button type="button">Raise ticket</button>}
      />
    )
    expect(
      screen.queryByRole("button", { name: "Raise ticket" }),
      "R50 — the create button outlived the row it sits in, again"
    ).toBeNull()
  })
})
