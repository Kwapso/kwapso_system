// A CALL GATHERS WHAT CAME OUT OF IT — the meeting screen's Connections tab.
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
    appId: null,
    appName: null,
    purposeId: null,
    purposeName: null,
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

function openConnections() {
  const tab = screen.getByRole("tab", { name: /Connections/ })
  fireEvent.mouseDown(tab, { button: 0 })
  fireEvent.click(tab)
  expect(tab.getAttribute("aria-selected")).toBe("true")
  return tab
}

afterEach(cleanup)

describe("the Connections tab on a meeting", () => {
  it("REACHABLE AT ALL — the tab exists and asks for THIS meeting's map", () => {
    // The assertion the whole lane turns on. Before this, `knowledge-detail` was
    // the only screen in the app that drew a map (censused), so a call's siblings
    // were door-only. A source's map links here; this is what it lands on.
    const meeting = makeMeeting()
    primeTeam(meeting)
    render(<MeetingDetailScreen teamId={TEAM} meetingId={meeting.id} basePath={`/t/${TEAM}/meetings`} />)

    expect(screen.getByRole("tab", { name: /Connections/ })).toBeTruthy()
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
    openConnections()

    // Twice on purpose: a node in the picture, and the same fact as a sentence a
    // screen reader can read and a person can click (relationship-map.tsx).
    expect(await screen.findAllByText("Re: Strategy Session")).toHaveLength(2)
    expect(screen.getByText(/came out of/)).toBeTruthy()
  })

  it("EMPTY — the common case — says what is missing, in the kit's register", async () => {
    const meeting = makeMeeting()
    primeTeam(meeting)
    const focus = { table: "meetings", id: meeting.id, label: "Strategy Session w kwapso" }
    door.recordMap = async () => ({ focus, nodes: [focus], links: [], total: 0, capped: false })
    render(<MeetingDetailScreen teamId={TEAM} meetingId={meeting.id} basePath={`/t/${TEAM}/meetings`} />)
    openConnections()

    // The meeting's OWN sentence, not the knowledge base's "Nothing is linked to
    // this yet." — 58% of readers land here and deserve to be told what would
    // fill it.
    expect(await screen.findByText("Nothing is filed against this call yet.")).toBeTruthy()
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
    openConnections()

    expect(await screen.findByText("Nothing is filed against this call yet.")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Zoom in" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Fit the whole map" })).toBeNull()
    expect(screen.queryByText("0 connected")).toBeNull()
  })

  it("EMPTY — and the badge renders nothing rather than a zero (R16)", async () => {
    const meeting = makeMeeting()
    primeTeam(meeting)
    const focus = { table: "meetings", id: meeting.id, label: "Strategy Session w kwapso" }
    door.recordMap = async () => ({ focus, nodes: [focus], links: [], total: 0, capped: false })
    render(<MeetingDetailScreen teamId={TEAM} meetingId={meeting.id} basePath={`/t/${TEAM}/meetings`} />)
    const tab = await screen.findByRole("tab", { name: /Connections/ })

    // `formatCount` renders nothing at zero, so the tab reads as a plain offer
    // and not as a record advertising that it has none.
    expect(tab.textContent?.replace(/\s/g, "")).toBe("Connections")
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
    const tab = await screen.findByRole("tab", { name: /Connections/ })
    expect(tab.textContent).toContain("1")
    openConnections()
    const drawn = (await screen.findAllByText("Re: Strategy Session")).length / 2
    expect(drawn, "the badge says one neighbour, so the picture draws one").toBe(1)
  })

  it("a failed read says so and offers a retry that asks again", async () => {
    const meeting = makeMeeting()
    primeTeam(meeting)
    let calls = 0
    door.recordMap = () => {
      calls++
      return Promise.reject(new Error("network"))
    }
    render(<MeetingDetailScreen teamId={TEAM} meetingId={meeting.id} basePath={`/t/${TEAM}/meetings`} />)
    openConnections()

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
    openConnections()

    expect(await screen.findByText("This meeting doesn't have a map to draw.")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull()
  })
})
