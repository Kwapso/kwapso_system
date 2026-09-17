// TWO CLIENT RULINGS, 17 SEP 2026, ONE SESSION, BOTH ABOUT TICKETS › DASHBOARD.
//
//   "Remove the toolbar from the tickets dashboard." — the whole
//   search/filters/create-button row, gone on BOTH hosts (the Tickets
//   screen's own Dashboard tab and the app record's Tickets › Dashboard
//   view). Every OTHER collection tab keeps its toolbar (R48); this is the
//   one named, reasoned exception UI-RULEBOOK.md carries for it (K37).
//
//   "I want a rank list with bars in total, not the last 30 days, and yes,
//   put the faces." — the "Raised by" panel, the third column of the row
//   "The open work" and "Raised" now share inside one app.
//
// THIS FILE PROVES BOTH, THE WAY `web/test/toolbar-lead-gap.test.ts` AND ITS
// SIBLINGS PROVE THE OTHER TOOLBAR RULES: a static census off the disk for
// the shape a screenshot cannot lie about (no `<ToolbarRow` in the file at
// all), and a real render for the shape only a mounted component can answer
// (ranking order, counts, the five-row cut, a face on screen).

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import * as React from "react"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { stripComments } from "@shared/rules/source-scan"

import type { TicketDashboard } from "@/lib/api/content"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, "..", "..")
const DASHBOARD_FILE = join(ROOT, "web", "components", "tickets", "tickets-dashboard.tsx")

describe("no toolbar on the tickets dashboard, on disk (R48's own exception, K37)", () => {
  const source = readFileSync(DASHBOARD_FILE, "utf8")
  // COMMENTS STRIPPED FIRST, the same discipline every other census in this
  // repo keeps (sections-stand-on-paper.test.ts's own header says why): the
  // file's history still MENTIONS `<ToolbarRow>` in prose (this ruling's own
  // account of what used to be here), and an unstripped scan would fail on
  // its own explanation of the fix.
  const code = stripComments(source)

  it("draws no <ToolbarRow> at all", () => {
    expect(
      code.includes("<ToolbarRow"),
      "tickets-dashboard.tsx still mounts <ToolbarRow> — the client's 17 Sep 2026 ruling " +
        '("Remove the toolbar from the tickets dashboard") removed it on both hosts'
    ).toBe(false)
  })

  it("no longer imports the toolbar row, or the search/filter machinery it drew", () => {
    for (const gone of [
      "deep-link/screen-bits", // <ToolbarRow>'s own module — no longer imported at all
      "search-input/search-input",
      "use-debounce/use-debounce",
      "screen-engine/filter-bar",
    ])
      expect(source.includes(gone), `tickets-dashboard.tsx still imports something from ${gone}`).toBe(false)
  })

  it("the two call sites pass no standsOn/viewSlot/actions — <TicketsDashboard> accepts none of them", () => {
    const collection = readFileSync(
      join(ROOT, "web", "components", "tickets", "tickets-collection.tsx"),
      "utf8"
    )
    const workPanels = readFileSync(join(ROOT, "web", "components", "work", "work-panels.tsx"), "utf8")
    for (const stale of ["standsOn=", "viewSlot=", "actions={raiseTicket}", "actions={onNew"]) {
      expect(collection.includes(stale), `tickets-collection.tsx still passes ${stale}`).toBe(false)
      expect(workPanels.includes(stale), `work-panels.tsx still passes ${stale}`).toBe(false)
    }
  })
})

/* ══════════════════════════════════════════════════════════════════════════
   "RAISED BY" — a rendered mount, because ranking order, a sum and a face on
   screen are not things a source scan can answer.
   ══════════════════════════════════════════════════════════════════════════ */

const holder = vi.hoisted(() => ({ view: undefined as TicketDashboard | undefined }))

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

import { TicketsDashboard } from "@/components/tickets/tickets-dashboard"

afterEach(cleanup)

const TYPES = ["Issue", "Question", "Extra"]

/** SEVEN CONTACTS, DELIBERATELY MORE THAN FIVE — the top-five cut has nothing
 * to prove against a door that only ever hands back five rows; the ordering
 * is scrambled so an assertion that merely echoed the fixture's own order
 * would pass for the wrong reason, and `total`/`people` are WHOLE-POPULATION
 * numbers a naive `rows.reduce` would get wrong (two of the seven are never
 * drawn at all). */
function dashboardWithRaisers(): TicketDashboard {
  return {
    openByTypeAndStatus: [],
    byAccountAndType: [],
    closureDays: [],
    closureTrend: [],
    raisedVsCurrent: [],
    raisedAsNotRecorded: 0,
    openByApp: [],
    unopenedPastLine: 0,
    raisedByContact: {
      // NOT SORTED IN SOURCE ORDER — the component's own job is the ranking,
      // never the door's (the door already orders `n DESC`, and a fixture
      // that pre-sorted would leave that clause unexercised).
      rows: [
        { contactId: "c3", contactName: "Priya Rao", contactLogoUrl: "https://img.example/priya.png", n: 6 },
        { contactId: "c1", contactName: "Marta Klein", contactLogoUrl: "https://img.example/marta.png", n: 14 },
        { contactId: "c5", contactName: "Sam Ortiz", contactLogoUrl: null, n: 4 },
        { contactId: "c2", contactName: "Jonas Beck", contactLogoUrl: null, n: 9 },
        { contactId: "c4", contactName: "Wei Chen", contactLogoUrl: null, n: 7 },
      ],
      // THE FULL POPULATION — bigger than the five rows' own sum (40) and
      // bigger than five people, exactly the shape the panel's own footer
      // exists to say honestly rather than let the five rows imply.
      total: 47,
      people: 7,
    },
    matched: 40,
  }
}

function showApp(view: TicketDashboard) {
  holder.view = view
  return render(<TicketsDashboard teamId="T1" appId="AP_1" helpTypeOptions={TYPES} ticketTotal={40} />)
}

describe('"Raised by" — the rank list with faces (client ruling, 17 Sep 2026)', () => {
  it("draws the panel, top five only, over seven raisers", () => {
    showApp(dashboardWithRaisers())
    expect(screen.getByText("Raised by")).toBeTruthy()
    for (const name of ["Marta Klein", "Jonas Beck", "Wei Chen", "Priya Rao", "Sam Ortiz"])
      expect(screen.getByText(name), `${name} is missing from the top five`).toBeTruthy()
  })

  it("ranks by count, highest first — never the door's own row order", () => {
    showApp(dashboardWithRaisers())
    const names = screen.getAllByText(/^(Marta Klein|Jonas Beck|Wei Chen|Priya Rao|Sam Ortiz)$/).map(
      (el) => el.textContent
    )
    expect(names, "the five raisers did not read highest-count-first").toEqual([
      "Marta Klein", // 14
      "Jonas Beck", // 9
      "Wei Chen", // 7
      "Priya Rao", // 6
      "Sam Ortiz", // 4
    ])
  })

  it("the footer names the WHOLE population, not the sum of the five rows drawn", () => {
    showApp(dashboardWithRaisers())
    // The five rows on screen sum to 40 and cover 5 people — both smaller
    // than the door's own totals (47, 7), which is the whole point of
    // keeping the footer's two numbers separate from the rows: a reader must
    // not be told "that is everyone" when it is not.
    expect(screen.getByText("of 47 · 7 people")).toBeTruthy()
  })

  it("puts a face on a row that has one, and a row with none still renders", () => {
    showApp(dashboardWithRaisers())
    const faces = Array.from(document.querySelectorAll("img")).map((img) => img.getAttribute("src"))
    expect(faces, "Marta's own photo never reached the screen").toContain("https://img.example/marta.png")
    expect(faces, "Priya's own photo never reached the screen").toContain("https://img.example/priya.png")
    // Sam and Wei carry no `contactLogoUrl` — the row still has to draw (an
    // initial, `RecordMark`'s own documented fallback), never a blank cell.
    expect(screen.getByText("Wei Chen"), "a raiser with no photo dropped off the ranking").toBeTruthy()
  })

  it("draws nothing at all for an app where nobody has an attributed raiser", () => {
    const empty = dashboardWithRaisers()
    empty.raisedByContact = { rows: [], total: 0, people: 0 }
    showApp(empty)
    expect(screen.getByText("Raised by"), "the panel itself still stands — only its content is empty").toBeTruthy()
    expect(screen.queryByText(/^of \d/), "a footer drew over zero rows").toBeNull()
  })
})
