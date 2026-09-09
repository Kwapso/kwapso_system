// THE DASHBOARD'S SEARCH BOX, PROVED TO BE A READ RATHER THAN A CONTROL.
//
// CLIENT, 7 SEP 2026, HAVING SAID IT TWICE: "on the dashboard, I'm missing the
// full toolbar", then "still missing full toolbar!". Sort is absent from that
// row by her own earlier ruling ("filter by client and type / no sort"), so a
// search box was the one control a sibling ticket tab had that this one did not.
//
// ── WHY THIS FILE EXISTS SEPARATELY FROM THE DOOR'S OWN SUITE ──────────────
//
// `workers/content/test/dashboard-search-agrees-with-the-list.test.ts` proves
// the DOOR narrows, panel by panel, and answers the same tickets the list tab
// answers. None of that is worth anything if the browser never asks it, asks it
// under somebody else's cache key, or asks it once per keystroke. Those are
// three failures no worker test can see, and all three are invisible on screen:
//
//   · A BOX THAT DOES NOT REACH THE DOOR looks exactly like one that does —
//     charts redraw on every render anyway, and nobody scans a chart against a
//     row they can check.
//   · A CACHE KEY THAT FORGETS THE TERM paints the PREVIOUS search's numbers
//     under the new term, instantly, from cache, and only corrects itself when
//     the read lands. That is precisely the defect `appId` was added to the key
//     to prevent one lane earlier, and it is worse for a term, because a term
//     changes far more often than a system does.
//   · A BOX WITH NO DEBOUNCE fires nine grouped scans of the backlog per
//     letter, each into its own cache entry. Nothing looks wrong; the bill and
//     the database do.
//
// And the fourth thing, which is what the reader actually experiences: a term
// that matches nothing must be ONE SENTENCE naming the word, not six panels
// each drawing its own private zero.

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { TicketDashboard } from "@/lib/api/content"
import { helpDashboardKey } from "@/lib/live-resources"

/** EVERY KEY THE SCREEN SUBSCRIBED TO AND EVERY CALL IT MADE TO THE DOOR, in
 * order. The two are recorded separately on purpose: a screen can hold the
 * right key and ask the wrong question, and it can ask the right question under
 * a key that cannot tell two questions apart. Only one of those is visible from
 * the network, and only the other is visible from the cache. */
const holder = vi.hoisted(() => ({
  view: undefined as TicketDashboard | undefined,
  keys: [] as string[],
  asked: [] as Record<string, string | undefined>[],
  /** The key the screen is subscribed to RIGHT NOW. `keys` is the history and
   * `asked` is the network; this is the cache entry the panels on screen are
   * currently reading, which is the only one of the three that can show a key
   * switch happening without a fetch behind it — a cache HIT, which is what
   * clearing the box back to the resting question is. */
  current: null as string | null,
}))

// The store, stubbed so the fetcher actually RUNS once per distinct key — which
// is what makes `asked` a record of real door calls rather than of props. The
// real `useCached` fetches on a key change and serves a hit from memory; this
// keeps that one property (one fetch per key, ever) and drops the rest.
vi.mock("@shared/web/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/web/store")>()
  return {
    ...actual,
    useCached: (key: string | null, fetcher: () => Promise<unknown>) => {
      if (key?.startsWith("help-dashboard:")) {
        holder.current = key
        if (!holder.keys.includes(key)) {
          holder.keys.push(key)
          void fetcher()
        }
        return { data: holder.view, error: undefined, loading: false, refresh: () => {} }
      }
      // The accounts read behind the Client facet — an empty option list is a
      // facet with nothing in it rather than a crash.
      return { data: [], error: undefined, loading: false, refresh: () => {} }
    },
  }
})

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return {
    ...actual,
    content: {
      ...actual.content,
      helpDashboard: (opts: Record<string, string | undefined> = {}) => {
        holder.asked.push(opts)
        return Promise.resolve(holder.view as TicketDashboard)
      },
    },
    tenancy: { ...actual.tenancy, accounts: () => Promise.resolve({ accounts: [] }) },
  }
})

import { TicketsDashboard } from "@/components/tickets/tickets-dashboard"

const TYPES = ["Issue", "Question", "Request", "Extra"]

/** A backlog with something in every panel. `matched` is the population the
 * panels were grouped over — see the type's own note for why the screen reads
 * it rather than inferring emptiness from the arrays. */
const FOUND: TicketDashboard = {
  openByTypeAndStatus: [{ helpType: "Issue", status: "new", n: 9 }],
  byAccountAndType: [
    { accountId: "a1", accountName: "Bergmann Group", helpType: "Issue", open: 4, total: 9 },
  ],
  closureDays: [
    { helpType: "Issue", n: 18, minDays: 0, p25Days: 2, medianDays: 4, p75Days: 9, maxDays: 31 },
  ],
  closureTrend: [],
  raisedVsCurrent: [{ raisedAsType: "Issue", helpType: "Issue", n: 8 }],
  raisedAsNotRecorded: 0,
  openByApp: [{ appId: "p1", appName: "Bergmann Portal", helpType: "Issue", open: 8, total: 20 }],
  unopenedPastLine: 0,
  matched: 9,
}

/** THE SAME DOOR ANSWER FOR A TERM NOTHING MENTIONS. Every array empty AND
 * `matched: 0` — the second is the one the screen reads, and the fixture
 * carries both because that is genuinely what the door sends. */
const NOTHING: TicketDashboard = {
  openByTypeAndStatus: [],
  byAccountAndType: [],
  closureDays: [],
  closureTrend: [],
  raisedVsCurrent: [],
  raisedAsNotRecorded: 0,
  openByApp: [],
  unopenedPastLine: 0,
  matched: 0,
}

function draw(props: Partial<React.ComponentProps<typeof TicketsDashboard>> = {}) {
  return render(
    <TicketsDashboard teamId="T1" helpTypeOptions={TYPES} ticketTotal={62} {...props} />
  )
}

const box = () => screen.getByPlaceholderText("Search tickets…") as HTMLInputElement

/** Type a word and let the debounce run out. The two halves are separate on
 * purpose — `typeInto` alone is what proves the request has NOT been made yet. */
function typeInto(word: string) {
  act(() => {
    fireEvent.change(box(), { target: { value: word } })
  })
}
async function settle(ms = 250) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  holder.view = FOUND
  holder.keys = []
  holder.asked = []
  holder.current = null
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe("the dashboard's search box is a third door parameter", () => {
  it("draws the box at all, with the same words the list tab's box says", () => {
    // R48's own sentence, and the reason `TOOLBAR_EXEMPT`'s line for this file
    // was DELETED rather than reworded: the screen now has the control the
    // exemption said it could not have.
    draw()
    expect(box()).toBeTruthy()
  })

  it("the term reaches the door, and only after the typing stops", async () => {
    draw()
    expect(holder.asked.length, "the resting read").toBe(1)
    expect(holder.asked[0].q, "nothing is asked before anything is typed").toBeUndefined()

    // A BURST, ONE LETTER AT A TIME — the failure this catches is nine grouped
    // scans of the backlog per keystroke, which nothing on screen would show.
    for (const partial of ["i", "in", "inv", "invo", "invoi", "invoic", "invoice"])
      typeInto(partial)
    expect(
      holder.asked.length,
      "a keystroke fired a door read — the debounce is missing or too short"
    ).toBe(1)

    await settle()
    expect(holder.asked.length, "the settled term never reached the door").toBe(2)
    expect(holder.asked[1].q).toBe("invoice")
  })

  it("the box keeps up with the keyboard while the request runs behind it", () => {
    // The other half of the debounce, and the half a person feels: a field that
    // only showed the settled value would swallow letters for a fifth of a
    // second, which reads as a broken keyboard rather than as a slow search.
    draw()
    typeInto("inv")
    expect(box().value).toBe("inv")
  })

  it("clearing is immediate — it does not wait out the debounce", async () => {
    draw()
    typeInto("invoice")
    await settle()
    expect(holder.asked[1].q).toBe("invoice")

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /clear/i }))
    })
    // NO `settle()` HERE, deliberately: "show me everything again" is one
    // decided act, and the one moment a debounce would be noticed.
    //
    // READ OFF THE SUBSCRIBED KEY RATHER THAN OFF A DOOR CALL, because there is
    // no door call to read: the unfiltered answer is already in the cache, so
    // clearing is a HIT and the panels repaint from it with no request at all.
    // That is the behaviour worth having, and it is exactly what a test looking
    // for a fetch would misread as "nothing happened".
    expect(holder.current, "clearing left the screen on the search's cache entry").toBe(
      helpDashboardKey("T1")
    )
    expect(box().value).toBe("")
  })

  it("two different terms are two different cache entries", async () => {
    // THE BUG THIS PREVENTS, stated as the key itself: without the term in the
    // key, searching "invoice" and then "hosting" would paint the first term's
    // numbers under the second term's box until the read landed — a chart
    // carries no row a reader could recognise as belonging to another question.
    draw()
    typeInto("invoice")
    await settle()
    typeInto("hosting")
    await settle()

    const dashKeys = holder.keys.filter((k) => k.startsWith("help-dashboard:"))
    expect(new Set(dashKeys).size, "two searches shared one cache entry").toBe(dashKeys.length)
    expect(dashKeys).toContain(helpDashboardKey("T1", "", "", "", "invoice"))
    expect(dashKeys).toContain(helpDashboardKey("T1", "", "", "", "hosting"))
    // …and neither of them is the unfiltered key, which is the same claim from
    // the other end: the resting answer must survive a search being typed over
    // it, so that clearing the box paints instantly from cache.
    expect(dashKeys).toContain(helpDashboardKey("T1"))
  })

  it("the key separates a term from a client and from a system", () => {
    // Read directly, because this is a property of the FUNCTION and a screen
    // test can only ever sample it. Every part is present even when empty, so
    // the unfiltered key is a fixed shape rather than a prefix of a filtered
    // one — and no two different questions may spell one key.
    const keys = [
      helpDashboardKey("T1"),
      helpDashboardKey("T1", "ACC_1"),
      helpDashboardKey("T1", "", "Issue"),
      helpDashboardKey("T1", "", "", "AP_1"),
      helpDashboardKey("T1", "", "", "", "invoice"),
      helpDashboardKey("T1", "", "", "", "hosting"),
      helpDashboardKey("T1", "ACC_1", "Issue", "AP_1", "invoice"),
      helpDashboardKey("T2", "", "", "", "invoice"),
      // A COLON IN THE TERM. It is the only free text in the key, which is why
      // it is LAST: everything after the fourth colon is the term, whatever is
      // in it, so a typed colon cannot make two questions spell one key.
      helpDashboardKey("T1", "", "", "", "a:b"),
      helpDashboardKey("T1", "", "", "a", "b"),
    ]
    expect(new Set(keys).size, "two different questions spell one cache key").toBe(keys.length)
  })

  it("a term that matches nothing is ONE sentence naming the word", async () => {
    holder.view = FOUND
    draw()
    holder.view = NOTHING
    typeInto("invoice")
    await settle()

    // The sentence names the term, because "nothing matched" alone is what a
    // screen would say for any reason at all and the reader's next move depends
    // on seeing what was actually asked.
    expect(screen.getByText(/Nothing matched .invoice./)).toBeTruthy()
    // …AND THE PANELS ARE GONE. Six panels each drawing their own zero is six
    // true statements that together read as a broken screen.
    expect(screen.queryByText("The open work")).toBeNull()
    expect(screen.queryByText("Raised as, then triaged as")).toBeNull()
    expect(screen.queryByText("How long a ticket takes to close")).toBeNull()
  })

  it("…and the toolbar stays, so the reader can get back out", async () => {
    holder.view = FOUND
    draw()
    holder.view = NOTHING
    typeInto("invoice")
    await settle()
    // R50 is about the COLLECTION, never about the answer: a team with tickets
    // keeps its toolbar even when the word they typed finds none of them, or
    // there is no way to change the question.
    expect(box().value).toBe("invoice")
  })

  it("an empty collection still loses the whole toolbar, search box included", () => {
    // R50 outranks R48, and the box does not change that: `empty` is the WHOLE
    // collection's count, so a team with no tickets at all draws no row.
    draw({ ticketTotal: 0 })
    expect(screen.queryByPlaceholderText("Search tickets…")).toBeNull()
  })

  it("the app-scoped host searches too, and its key carries both narrowings", async () => {
    // THE SECOND HOST — an app record's Tickets tab in its Dashboard view. The
    // same component with an `appId`, so a fix that only reached the Tickets
    // screen would leave this one with a decorative box or, worse, one whose
    // answers were served under another system's key.
    draw({
      appId: "AP_1",
      viewSlot: {
        views: [
          { value: "list", label: "List" },
          { value: "dashboard", label: "Dashboard" },
        ],
        value: "dashboard",
        onValueChange: () => {},
      },
    })
    typeInto("invoice")
    await settle()

    expect(holder.asked[holder.asked.length - 1]).toMatchObject({
      appId: "AP_1",
      q: "invoice",
    })
    expect(holder.keys).toContain(helpDashboardKey("T1", "", "", "AP_1", "invoice"))
    // …and never the Tickets screen's own key for the same word, which would be
    // one system's dashboard served under the whole team's numbers.
    expect(holder.keys).not.toContain(helpDashboardKey("T1", "", "", "", "invoice"))
  })
})
