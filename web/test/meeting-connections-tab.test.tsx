// A CALL GATHERS WHAT CAME OUT OF IT — the meeting screen's Connections
// section.
//
// IT WAS A TAB UNTIL 23 SEP 2026, and this suite was written against one. The
// meeting record became ONE PAGE that day (Aurora: "meetings: implement the
// one page, love how you did it"), so the tab strip is gone and Connections is
// a section in the right-hand column. EVERY CASE BELOW SURVIVED THE MOVE —
// none was deleted, because none of them was ever really about a tab: they are
// about whether a call's siblings reach a person, whether the count and the
// picture agree, and whether a failure says so. Only the address changed, and
// each case now finds the section where it actually is.
//
// ONE CASE CHANGED ITS EXPECTATION RATHER THAN ITS ADDRESS, and it is the
// empty one. Her same ruling: when there is nothing filed against the call the
// section DISAPPEARS rather than explaining itself, the way the ticket's own
// Related stories already behaves. So the old assertion ("the register says
// what is missing") is now wrong BY RULING, and what is asserted instead is
// the new intent: nothing at all — no title, no count, no sentence.
//
// AND TWO CASES CAUGHT A REAL REGRESSION IN THAT REWRITE, which is the reason
// this file is worth more than the tab it was written for. The first gate read
// `(mapQ.data?.total ?? 0) > 0`, and `data` is undefined on a read that failed
// as well as on one that came back empty — so a meeting whose map door broke
// drew nothing at all, no sentence and no retry. Fixed in the screen, not
// here: the section is drawn when there is something to show OR something went
// wrong, and withheld only on a read that came back and said zero.
//
// WHY THIS TAB EXISTS AT ALL, since it is the second one in the app to draw a
// relationship map and the first on a record that is not a knowledge source.
// `record-map.ts` gained four edges with `knowledge_sources` at the near end, one
// of which follows Google's own calendar event id, so an email, a chat log and a
// transcript about the same half-hour all point at one meeting. That worked at
// the DOOR and reached no person: `knowledge-detail.tsx` was the only screen in
// the app drawing a map, so the sibling half of the feature was a dead end in
// the R40 sense — everything working except the last step, the only one anybody
// experiences. The owner ruled on 9 Sep 2026 ("yes ofc") and this is that step.
//
// THE EMPTY CASE IS THE COMMON ONE, which is why it gets a test of its own
// rather than a footnote. Measured on staging the same day: of 460 live
// meetings, 268 have no account, no app, no purpose and no artefacts. So the
// majority of readers opening this tab meet the register, and a register that
// reads like a failure would be the wrong answer 58% of the time.

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { MeetingDetailScreen } from "@/components/meetings/meeting-detail"
import { ApiFailure } from "@/lib/api"
import { appsKey, meetingsKey } from "@/lib/live-resources"
import { primeCache } from "@shared/web/store"
import type { Meeting } from "@shared/types"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: () => {}, push: () => {} }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}))

const { door } = vi.hoisted(() => ({
  door: {
    recordMap: (_table: string, _id: string): Promise<unknown> =>
      Promise.resolve({ focus: null, nodes: [], links: [], total: 0, capped: false }),
    asked: [] as { table: string; id: string }[],
    meetingsInPage: [] as unknown[],
  },
}))

vi.mock("@/lib/api", () => ({
  ApiFailure: class extends Error {
    status: number
    code: string
    constructor(status: number, code: string, message: string) {
      super(message)
      this.status = status
      this.code = code
    }
  },
  content: {
    recordMap: (table: string, id: string) => {
      door.asked.push({ table, id })
      return door.recordMap(table, id)
    },
    // `useCached` REVALIDATES ON MOUNT even against a warm cache
    // (shared/web/store.ts), and `listFetch.meetings` reaches this same module —
    // so every read the screen opens with is answered quietly here and only the
    // map is left under test. Without this the screen sits on "Loading…" for
    // ever and every assertion below fails for a reason that has nothing to do
    // with what it is testing.
    meetings: async () => ({ meetings: door.meetingsInPage, total: door.meetingsInPage.length, nextCursor: null }),
    meetingOne: async () => (door.meetingsInPage[0] as Meeting) ?? null,
    meetingPeople: async () => ({ links: [] }),
    meetingTranscript: async () => ({ transcript: null }),
    workLogs: async () => ({ workLogs: [], total: 0, nextCursor: null }),
    recordCounts: async () => ({ counts: {} }),
  },
  tenancy: {
    accounts: async () => ({ accounts: [], total: 0, entityTotal: 0, individualTotal: 0, nextCursor: null }),
    apps: async () => ({ apps: [], total: 0 }),
    myPermissions: async () => ({ permissions: { meetings: { edit: true }, work: { read: true } } }),
    recordActivity: async () => ({ activity: [], total: 0, nextCursor: null }),
    recordCounts: async () => ({ counts: {} }),
  },
}))

const TEAM = "01TEAM"

/** EACH CASE GETS ITS OWN RECORD, and the sibling suite learnt this the hard
 * way: `shared/web/store.ts` dedupes concurrent reads of the SAME cache key
 * across the whole module (`inFlight`), and that outlives `cleanup()` between
 * tests. Share one meeting id and the first case's settled answer is handed to
 * every later one — so the two error states below saw a resolved map and failed
 * for a reason that had nothing to do with what they assert. */
let n = 0
const nextId = () => `01MEET${++n}`

function makeMeeting(over: Partial<Meeting> = {}): Meeting {
  return {
    id: nextId(),
    ref: "M-1",
    title: "Strategy Session w kwapso",
    accountId: null,
    accountName: null,
    accountLogoUrl: null,
    appId: null,
    appName: null,
    purposeId: null,
    purposeName: null,
    purposeIcon: null,
    agenda: null,
    notes: null,
    location: null,
    startsAt: "2026-08-18T09:00:00.000Z",
    endsAt: null,
    googleEventId: "GCAL_9",
    googleEventUrl: null,
    googleJoinUrl: null,
    googleOrganizer: null,
    googleStatus: null,
    googleTimeZone: null,
    googleRecurrence: null,
    googleGuests: [],
    googleAttachments: [],
    googleSyncedAt: null,
    fromCalendar: false,
    transcriptFileId: null,
    transcriptCapturedAt: null,
    transcriptUrl: null,
    transcriptFoundBy: null,
    knowledgeIndexedAt: null,
    recurringEventId: null,
    active: true,
    createdAt: "2026-08-01T00:00:00.000Z",
    creatorName: null,
    updatedAt: null,
    editorName: null,
    ...over,
  }
}

function primeTeam(meeting: Meeting) {
  door.asked = []
  door.meetingsInPage = [meeting]
  primeCache(meetingsKey(TEAM), [meeting])
  primeCache(appsKey(TEAM), [])
  primeCache(`accounts:${TEAM}`, [])
  primeCache(`my-perms:${TEAM}`, { meetings: { edit: true }, work: { read: true } })
  primeCache(`activity:record:meetings:${meeting.id}`, [])
}

/** THERE IS NOTHING TO OPEN ANY MORE. This used to click the Connections tab
 * and assert it had become selected; the section is simply on the page now, so
 * every case below just waits for what it is about. Kept as a named function
 * rather than deleted at eight call sites, so the diff that moved this suite
 * reads as "the address changed" rather than as eight rewritten tests — and so
 * there is one place to look if the section ever grows a disclosure again.
 *
 * `findBy*` IS WHAT ACTUALLY WAITS. The map is its own read (`recordMapKey`),
 * so on first paint the section is not there yet whatever this function does. */
async function connectionsSection(): Promise<HTMLElement> {
  return await screen.findByRole("group", { name: /Connections/ })
}

afterEach(cleanup)

describe("the Connections section on a meeting", () => {
  it("REACHABLE AT ALL — the screen asks for THIS meeting's map, and draws it", async () => {
    // The assertion the whole lane turns on, and the ONE line of it that
    // changed is where the answer lands: a section on the page instead of a
    // tab to click. Before this lane, `knowledge-detail` was the only screen
    // in the app that drew a map (censused), so a call's siblings were
    // door-only. A source's map links here; this is what it lands on.
    const meeting = makeMeeting()
    primeTeam(meeting)
    const focus = { table: "meetings", id: meeting.id, label: "Strategy Session w kwapso" }
    const mail = { table: "knowledge_sources", id: "KS1", label: "Re: Strategy Session" }
    door.recordMap = async () => ({
      focus,
      nodes: [focus, mail],
      links: [{ from: "knowledge_sources:KS1", to: `meetings:${meeting.id}`, relation: "came out of" }],
      total: 1,
      capped: false,
    })
    render(<MeetingDetailScreen teamId={TEAM} meetingId={meeting.id} basePath={`/t/${TEAM}/meetings`} />)

    expect(await connectionsSection()).toBeTruthy()
    expect(door.asked).toContainEqual({ table: "meetings", id: meeting.id })
  })

  it("has siblings: draws them, and says each line's meaning in words", async () => {
    const meeting = makeMeeting()
    primeTeam(meeting)
    const focus = { table: "meetings", id: meeting.id, label: "Strategy Session w kwapso" }
    const mail = { table: "knowledge_sources", id: "KS1", label: "Re: Strategy Session" }
    door.recordMap = async () => ({
      focus,
      nodes: [focus, mail],
      links: [{ from: "knowledge_sources:KS1", to: `meetings:${meeting.id}`, relation: "came out of" }],
      total: 1,
      capped: false,
    })
    render(<MeetingDetailScreen teamId={TEAM} meetingId={meeting.id} basePath={`/t/${TEAM}/meetings`} />)

    // Twice on purpose: a node in the picture, and the same fact as a sentence a
    // screen reader can read and a person can click (relationship-map.tsx).
    expect(await screen.findAllByText("Re: Strategy Session")).toHaveLength(2)
    expect(screen.getByText(/came out of/)).toBeTruthy()
  })

  it("EMPTY — the common case — the section is not there at all", async () => {
    // THE EXPECTATION REVERSED, 23 Sep 2026, and it is the one case in this
    // file whose INTENT changed rather than its address. It used to assert the
    // meeting's own register sentence ("Nothing is filed against this call
    // yet."), on the reasoning that 58% of readers land on an empty map and
    // deserve to be told what would fill it. Aurora ruled the other way on the
    // one-page design: an empty section disappears rather than explaining
    // itself, the same behaviour the ticket's own Related stories already has.
    // On a page with no tabs, a paragraph about an absence is a section about
    // nothing, and the majority reading of this record is now one section
    // shorter rather than one paragraph longer.
    const meeting = makeMeeting()
    primeTeam(meeting)
    const focus = { table: "meetings", id: meeting.id, label: "Strategy Session w kwapso" }
    door.recordMap = async () => ({ focus, nodes: [focus], links: [], total: 0, capped: false })
    render(<MeetingDetailScreen teamId={TEAM} meetingId={meeting.id} basePath={`/t/${TEAM}/meetings`} />)

    // Waited for rather than asserted on first paint: the map is its own read,
    // so "not there" has to mean "not there once the read has answered", never
    // "not there yet". The Agenda section is always drawn, so its arrival is
    // the proof this render actually settled.
    expect(await screen.findByText("Agenda")).toBeTruthy()
    expect(screen.queryByRole("group", { name: /Connections/ })).toBeNull()
    expect(screen.queryByText("Nothing is filed against this call yet.")).toBeNull()
    expect(screen.queryByText("Couldn't load this record's connections.")).toBeNull()
  })

  it("EMPTY — and NO picture, no inert zoom buttons, no \"0 connected\"", async () => {
    // The register replaces the plate rather than sitting under it. Before this,
    // the majority reading of this tab was a 26rem empty box with three zoom
    // buttons that moved a single dot, and the one useful sentence below the
    // fold. An inert control is worse than an absent one: it invites a press
    // that does nothing.
    const meeting = makeMeeting()
    primeTeam(meeting)
    const focus = { table: "meetings", id: meeting.id, label: "Strategy Session w kwapso" }
    door.recordMap = async () => ({ focus, nodes: [focus], links: [], total: 0, capped: false })
    render(<MeetingDetailScreen teamId={TEAM} meetingId={meeting.id} basePath={`/t/${TEAM}/meetings`} />)

    // A STRICTER VERSION OF THE SAME SENTENCE. This case was written when the
    // register replaced the plate; now the whole section is absent, so the
    // three things it forbade are forbidden a fortiori — asserted anyway,
    // because "the section is gone" and "no inert control survived somewhere
    // else on the page" are two different facts and only the second one is
    // about the zoom buttons.
    expect(await screen.findByText("Agenda")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Zoom in" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Fit the whole map" })).toBeNull()
    expect(screen.queryByText("0 connected")).toBeNull()
  })

  it("EMPTY — and no zero is printed anywhere, because there is no count to print (R16)", async () => {
    // THE COUNT REGISTER MOVED WITH THE SECTION. It was a tab badge; it is now
    // the count beside the section's own title (R97 — "just a count next to
    // the title"), drawn through the same `formatCount` seam, which renders
    // NOTHING at zero. On an empty map there is no section, so there is no
    // title and no number either: this asserts the record never advertises
    // that it has none, which is the sentence this case always made.
    const meeting = makeMeeting()
    primeTeam(meeting)
    const focus = { table: "meetings", id: meeting.id, label: "Strategy Session w kwapso" }
    door.recordMap = async () => ({ focus, nodes: [focus], links: [], total: 0, capped: false })
    const { container } = render(
      <MeetingDetailScreen teamId={TEAM} meetingId={meeting.id} basePath={`/t/${TEAM}/meetings`} />
    )
    expect(await screen.findByText("Agenda")).toBeTruthy()

    expect(screen.queryByText("Connections")).toBeNull()
    expect(container.textContent, "no stray zero where a count used to be").not.toMatch(
      /Connections\s*0/
    )
  })

  it("THE BADGE AND THE PICTURE ANSWER THE SAME QUESTION, denied module included", async () => {
    // The failure this repo keeps being bitten by: a number counted over one
    // predicate above a list drawn over another. The door removes an edge whose
    // far end the caller may not read AND does not count it, so a fenced answer
    // arrives with both halves already agreeing — this asserts the screen does
    // not reintroduce the gap by badging something it then refuses to draw.
    const meeting = makeMeeting()
    primeTeam(meeting)
    const focus = { table: "meetings", id: meeting.id, label: "Strategy Session w kwapso" }
    const mail = { table: "knowledge_sources", id: "KS1", label: "Re: Strategy Session" }
    door.recordMap = async () => ({
      focus,
      nodes: [focus, mail],
      links: [{ from: "knowledge_sources:KS1", to: `meetings:${meeting.id}`, relation: "came out of" }],
      // One neighbour drawn, one counted. A caller denied `accounts` would get
      // this shape with the account edge absent from BOTH halves.
      total: 1,
      capped: false,
    })
    render(<MeetingDetailScreen teamId={TEAM} meetingId={meeting.id} basePath={`/t/${TEAM}/meetings`} />)
    // THE SAME QUESTION, ASKED OF THE SECTION'S OWN COUNT. The badge on the
    // retired tab and the count beside this title are the same number through
    // the same seam; what this case is about — one counted, one drawn — is
    // unchanged.
    const section = await connectionsSection()
    expect(section.textContent).toContain("1")
    const drawn = (await screen.findAllByText("Re: Strategy Session")).length / 2
    expect(drawn, "the count says one neighbour, so the picture draws one").toBe(1)
  })

  it("A FAILED READ IS NOT AN EMPTY ONE — it says so, and offers a retry that asks again", async () => {
    // THIS CASE CAUGHT A REAL REGRESSION, 23 Sep 2026, and it is why the suite
    // was worth moving rather than deleting. The one-page rewrite gated the
    // section on `(mapQ.data?.total ?? 0) > 0`, and `mapQ.data` is `undefined`
    // on a read that FAILED exactly as it is on one that came back empty — so
    // a meeting whose map door broke drew nothing whatsoever: no sentence, no
    // retry, no trace that anything had been asked for. Worse than the tab it
    // replaced, which at least existed to be clicked. The screen is fixed, not
    // this test: it draws the section when there is something to show OR
    // something went wrong, and withholds it only on a read that came back and
    // said zero.
    const meeting = makeMeeting()
    primeTeam(meeting)
    let calls = 0
    door.recordMap = () => {
      calls++
      return Promise.reject(new Error("network"))
    }
    render(<MeetingDetailScreen teamId={TEAM} meetingId={meeting.id} basePath={`/t/${TEAM}/meetings`} />)

    expect(await screen.findByText("Couldn't load this record's connections.")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(calls).toBeGreaterThan(1)
  })

  it("a PERMANENT refusal gets the sentence and no button that will refuse again", async () => {
    const meeting = makeMeeting()
    primeTeam(meeting)
    door.recordMap = () =>
      Promise.reject(
        new ApiFailure(400, "invalid_input", "That is not a kind of record this map draws.")
      )
    render(<MeetingDetailScreen teamId={TEAM} meetingId={meeting.id} basePath={`/t/${TEAM}/meetings`} />)

    // The other half of the same regression: a 400 is a read that came back
    // with an answer, and the answer is "never". Hiding it would tell a person
    // the call has no siblings, which is a different and untrue sentence.
    expect(await screen.findByText("This meeting doesn't have a map to draw.")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull()
  })
})
