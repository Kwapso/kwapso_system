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
//   · the closing-time spread only looks back ninety days.
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

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { TicketDashboard } from "@/lib/api/content"
import { CLOSURE_TREND_MIN_CLOSURES, CLOSURE_WINDOW_DAYS } from "@shared/types"

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

  it("says the closing-time spread only looks back ninety days, when there is nothing in it", () => {
    show({ ...FULL, closureDays: [] })
    expect(
      screen.getByText(new RegExp(`last ${CLOSURE_WINDOW_DAYS} days`, "i"))
    ).toBeTruthy()
  })

  it("says the weekend does not count, on the panel that counts durations", () => {
    // The client's ruling is invisible in a number — 4 days and 4 days look
    // identical whichever clock produced them — so the panel that reports one
    // has to say which clock it used.
    show(FULL)
    expect(screen.getByText(/Saturday and Sunday do not count/i)).toBeTruthy()
  })

  it("draws the whole screen over a full answer without falling over", () => {
    show(FULL)
    for (const heading of [
      "The open work",
      "Which app",
      "Who has more",
      "Raised as, then triaged as",
      "How long a ticket takes to close",
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
    expect(document.querySelectorAll("line").length, "a lone month vanished off the plot").toBe(2)
  })

  it("says the matrix has nothing to compare yet, rather than drawing an empty grid", () => {
    show({ ...EMPTY, openByTypeAndStatus: FULL.openByTypeAndStatus })
    expect(screen.getByText(/nothing to compare yet/i)).toBeTruthy()
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
      // how long we take to close things on it
      "How long a ticket takes to close",
    ])
      expect(screen.getByText(heading), `the ${heading} panel is missing from the app's dashboard`).toBeTruthy()
    // The subtractions the panels have to keep announcing — the same three the
    // suite above proves for the whole-team screen. A "mini version" that
    // stopped saying what it left out would be the worse half of this feature.
    expect(screen.getByText(/788 older tickets have no record/i)).toBeTruthy()
    expect(screen.getByText(/Saturday and Sunday do not count/i)).toBeTruthy()
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
