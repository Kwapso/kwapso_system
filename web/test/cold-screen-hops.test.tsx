// WHAT A COLD DEEP LINK COSTS BEFORE THE RECORD IS ON SCREEN — counted, and
// held to a budget.
//
// A person arrives from an email (R30 builds emails around exactly this), on a
// fresh tab, at `/t/<team>/processes/<id>`. Nothing is cached. Measured on
// 6 Sep 2026 that screen made FOURTEEN distinct requests before anything
// rendered: two to find out who they were and where they stood, four to warm
// caches the screen was not going to read, one for the screen's own overrides,
// one for the breadcrumb's name, and six for a record screen whose first paint
// needs one of them. `MAX_D1_TRIPS_PER_DOOR` had bounded the server half of a
// round trip for a week by then; the browser half had no number at all.
//
// This is the browser half's number, and the census that holds it. The whole
// shell is rendered cold with `fetch` stood in for, and every request is
// stamped with whether the record was ALREADY ON SCREEN when it left. That
// stamp is the whole discriminator: a request that leaves after the person can
// read the record is a request the person never waited for.
//
// TWO ASSERTIONS, in opposite directions, because a count can be gamed in
// either. The cold path must fit under the budget — and the work that was moved
// off it must STILL HAPPEN afterwards, or "fewer requests before paint" is
// indistinguishable from "the prewarm was deleted".
//
// FOUR SCREENS, NOT ONE (7 Sep 2026). The budget's own sentence is about the
// BUSIEST screen, and one screen cannot answer that: a census of one is a claim
// about the screen somebody happened to instrument. Processes was the screen the
// fourteen were found on, so it is the one with a story; tickets, accounts and
// meetings are the three other record screens a person is sent to by name, each
// reached through its own module branch, its own list door and its own by-id
// door. If a new screen comes in over the budget that is a finding to report,
// not a number to raise.

import { cleanup, render, screen, waitFor } from "@testing-library/react"
import * as React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { MAX_REQUESTS_BEFORE_FIRST_PAINT } from "@shared/workers/limits"
import type {
  Account,
  ActiveContext,
  HelpTicket,
  Meeting,
  PermissionValue,
  ProcessDetail,
  SessionUser,
} from "@shared/types"

const TEAM = "T1"
const PROCESS = "P1"
const NAME = "Invoice run"

/** The path under test, read by the `next/navigation` stand-in below. A `let`
 * rather than a constant because the census walks four of them, and the router
 * mock is hoisted above every one of them. */
let path = `/t/${TEAM}/processes/${PROCESS}`

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }),
  usePathname: () => path,
}))

// The sockets are not the subject. Nothing here opens one.
vi.mock("@shared/web/realtime", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@shared/web/realtime")>()),
  useRealtime: () => {},
  useUserRealtime: () => {},
}))

/* -------------------------------- fixtures -------------------------------- */

const ALL = { read: true, create: true, edit: true, delete: true }
const user: SessionUser = {
  id: "u1",
  email: "aurora@kwapso.com",
  firstName: "Aurora",
  lastName: "Thalassa",
  imageUrl: null,
  onboardingComplete: true,
  currentTeamId: TEAM,
  pinnedTeamId: null,
  language: null,
  scale: null,
  spine: null,
}
const permissions: PermissionValue = {
  processes: ALL,
  accounts: ALL,
  apps: ALL,
  help: ALL,
  work: ALL,
  meetings: ALL,
  member_roles: ALL,
  invites: ALL,
  selectable_data: ALL,
  teams: ALL,
}
const team = { id: TEAM, name: "Kwapso", logoUrl: null, roleId: "r1", dbStatus: "ready" }
const ctx: ActiveContext = {
  team,
  role: { id: "r1", title: "Admin" },
  memberCount: 3,
  teams: [team],
  user,
  permissions,
}
const detail: ProcessDetail = {
  process: {
    id: PROCESS,
    appId: "A1",
    appName: "Dispatch",
    accountId: "ACC1",
    name: NAME,
    description: null,
    roleName: null,
    roleId: null,
    auditDate: "2026-01-01",
    versionCount: 1,
    stepCount: 0,
    active: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  versions: [
    {
      id: "V1",
      processId: PROCESS,
      versionNo: 1,
      label: null,
      isBaseline: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      createdByName: null,
    },
  ],
  steps: [],
  shownVersionId: "V1",
  shownStepCount: 0,
  commentsTotal: 0,
  saving: null,
  savingsCaption: "",
  auditDate: "2026-01-01",
  asOf: null,
  revisionDates: ["2026-01-01"],
  links: [],
}
const paged = <T,>(rows: T, extra: Record<string, unknown> = {}) => ({
  ...rows,
  ...extra,
  total: 0,
  totalCapped: false,
  hasMore: false,
  nextCursor: null,
})

/** The three other record screens' rows. Each is the real shape its own door
 * answers with — a fixture thinner than the wire is a fixture that measures a
 * screen the app does not have. */
const TICKET = "H1"
const TICKET_NAME = "The dispatch board will not load"
const ticket: HelpTicket = {
  id: TICKET,
  helpType: "Question",
  description: `<p>${TICKET_NAME}</p>`,
  screenRecordingLink: null,
  sourceScreen: null,
  status: "new",
  resolved: false,
  resolvedAt: null,
  ref: "BERG-T0412",
  rank: "a0",
  lockedAt: null,
  archivedAt: null,
  titleDe: null,
  titleEn: null,
  draftResolution: null,
  storyCount: 0,
  doneStoryCount: 0,
  raiserId: "u1",
  raiserName: "Aurora Thalassa",
  // R54 — which population each stored name belongs to. A colleague raised this
  // one, so both flags are false and the screen shows a first name.
  raiserIsClient: false,
  editorIsClient: false,
  // What it arrived as, before triage said what it is.
  raisedAsType: "Question",
  editorName: null,
  moduleId: null,
  moduleName: null,
  moduleMark: null,
  accountId: null,
  appId: null,
  appName: null,
  raisedByContactId: null,
  raisedByContactName: null,
  validatedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: null,
}

const ACCOUNT = "ACC1"
const ACCOUNT_NAME = "Bergstrom Logistics"
const account: Account = {
  id: ACCOUNT,
  accountType: "entity",
  parentAccountId: null,
  name: ACCOUNT_NAME,
  email: null,
  phone: null,
  street: null,
  postalCode: null,
  city: null,
  country: null,
  industry: null,
  about: null,
  logoUrl: null,
  coverUrl: null,
  code: "BERG",
  currency: null,
  locale: null,
  timezone: null,
  commercialsVisible: null,
  active: true,
  createdAt: "2026-01-01T00:00:00.000Z",
}

const MEETING = "M1"
const MEETING_NAME = "Bergstrom weekly"
const meeting: Meeting = {
  id: MEETING,
  ref: null,
  title: MEETING_NAME,
  accountId: null,
  accountName: null,
  appId: null,
  appName: null,
  purposeId: null,
  purposeName: null,
  agenda: null,
  notes: null,
  location: null,
  startsAt: "2026-01-01T09:00:00.000Z",
  endsAt: null,
  googleEventId: null,
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
  recurringEventId: null,
  transcriptFileId: null,
  transcriptCapturedAt: null,
  transcriptUrl: null,
  transcriptFoundBy: null,
  knowledgeIndexedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  creatorName: null,
  updatedAt: null,
  editorName: null,
  active: true,
}

/** WHICH COLD ARRIVAL IS BEING MEASURED. Both are real and they are different
 * costs, which is the reason both are here: page one of a growing collection
 * (R14) holds fifty rows, so of staging's 2,051 tickets exactly fifty arrive
 * "inPage" and 2,001 do not, and a census of the lucky fifty would report the
 * cheaper number for the rarer case.
 *
 *  • "in page one" — the list answers with the record, so the screen paints off
 *    the row it already has and the by-id read never fires.
 *  • "past the cursor" — the list answers without it, so the screen waits for
 *    the by-id read, and everything the screen asked for meanwhile is a request
 *    the person waited through. */
let listHoldsTheRecord = true

/** What each door answers. Anything not named answers an empty object, and is
 * still COUNTED — an unexpected door on the cold path is exactly what this file
 * exists to notice. */
function answer(p: string): unknown {
  const listed = <T,>(row: T) => (listHoldsTheRecord ? [row] : [])
  if (p.startsWith("/api/auth/me")) return { user }
  if (p.startsWith("/api/tenancy/active")) return ctx
  if (p.startsWith("/api/tenancy/my-permissions")) return { permissions }
  if (p.startsWith("/api/tenancy/config/screens")) return { screens: {} }
  if (p.startsWith("/api/tenancy/roles")) return { roles: [], total: 0 }
  if (p.startsWith("/api/tenancy/invites")) return { invites: [], total: 0 }
  if (p.startsWith("/api/tenancy/selectable")) return { values: [], total: 0 }
  if (p.startsWith("/api/tenancy/processes/detail")) return detail
  if (p.startsWith("/api/tenancy/processes/comments")) return { comments: [], total: 0 }
  if (p.startsWith("/api/tenancy/processes")) return paged({ processes: [] })
  if (p.startsWith("/api/tenancy/client-roles")) return { roles: [] }
  if (p.startsWith("/api/tenancy/client-tools")) return { tools: [] }
  if (p.startsWith("/api/tenancy/activity")) return paged({ activity: [] })
  // The three other record screens. The by-id door always answers the row; the
  // LIST answers it only in the "in page one" arrival above.
  if (p.startsWith("/api/content/help/attachments")) return { attachments: [], total: 0 }
  if (p.startsWith("/api/content/help/thread")) return paged({ replies: [] })
  if (p.startsWith("/api/content/help/stakeholders")) return { stakeholders: [], total: 0 }
  if (p.startsWith("/api/content/help"))
    return paged({ tickets: p.includes(`id=${TICKET}`) ? [ticket] : listed(ticket) })
  if (p.startsWith("/api/tenancy/accounts/detail"))
    return {
      account,
      parent: null,
      links: [],
      companies: [],
      portalUsers: [],
      linksTotal: 0,
      companiesTotal: 0,
      portalUsersTotal: 0,
    }
  if (p.startsWith("/api/tenancy/accounts/links")) return { links: [], total: 0 }
  if (p.startsWith("/api/tenancy/accounts")) return paged({ accounts: listed(account) })
  if (p.startsWith("/api/content/meetings/people")) return { links: [] }
  if (p.startsWith("/api/content/meetings"))
    return paged(
      { meetings: p.includes(`id=${MEETING}`) ? [meeting] : listed(meeting) },
      { weekTotal: 0 }
    )
  if (p.startsWith("/api/content/delivery/purposes")) return paged({ purposes: [] })
  return {}
}

/* -------------------------------- the spy ---------------------------------- */

type Seen = { path: string; afterPaint: boolean }
let seen: Seen[] = []
/** What "painted" means for the screen currently under test. */
let painted: () => boolean = () => false

/** A REAL, macrotask delay on one door — a `setTimeout`, never a resolved
 * Promise, because a resolved-Promise "delay" and a genuine wait are
 * indistinguishable to `await` and would pass a sequencing test for the wrong
 * reason (see the "ordering, not just a ceiling" describe block below). `null`
 * (the default) delays nothing. A predicate, not a prefix, because the list and
 * the by-id read are the SAME door on tickets and meetings (`?id=` is the only
 * difference) — a prefix would slow both. */
let slowDoor: { match: (p: string) => boolean; ms: number } | null = null

/** A door that DROPS THE CONNECTION — the stand-in throws, so the fetcher's
 * promise REJECTS. Not a 500 and not an empty answer on purpose: a 200 with
 * `{ticket: null}` is a real answer meaning "gone", and that is the case these
 * screens already got right. What they got wrong was the case where the read
 * never answered at all. */
let deadDoor: ((p: string) => boolean) | null = null

function paintedOn(name: string): boolean {
  return document.body.textContent?.includes(name) ?? false
}

function arriveAt(at: string, name: string) {
  path = at
  painted = () => paintedOn(name)
  seen = []
  slowDoor = null
  deadDoor = null
  window.history.replaceState({}, "", at)
}

beforeEach(() => {
  arriveAt(`/t/${TEAM}/processes/${PROCESS}`, NAME)
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const p = typeof input === "string" ? input : input instanceof URL ? input.pathname + input.search : input.url
      // STAMPED AT DEPARTURE. Whether the person could already read the record
      // when this request left is the only fact the budget is about.
      seen.push({ path: p, afterPaint: painted() })
      if (slowDoor?.match(p)) await new Promise((resolve) => setTimeout(resolve, slowDoor?.ms))
      if (deadDoor?.(p)) throw new TypeError("Failed to fetch")
      return new Response(JSON.stringify(answer(p)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    })
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

/** A COLD tab. The session is a module-level cache and the row store is a
 * module-level Map, so a fresh module graph is the only honest cold start. */
async function coldShell() {
  vi.resetModules()
  const [{ DeepLinkScreen }, store] = await Promise.all([
    import("@/components/deep-link/deep-link-screen"),
    import("@shared/web/store"),
  ])
  store.clearCache()
  return DeepLinkScreen
}

const distinct = (rows: Seen[]) => [...new Set(rows.map((r) => r.path))]

/** Arrive cold at one record screen and wait until its record can be read. ONE
 * render answers every question below — a fresh module graph per assertion cost
 * six seconds each and measured the same thing four times. */
async function arrive(at: string, name: string, inPageOne: boolean): Promise<Seen[]> {
  listHoldsTheRecord = inPageOne
  arriveAt(at, name)
  const DeepLinkScreen = await coldShell()
  render(<DeepLinkScreen />)
  await screen.findAllByText(new RegExp(name), {}, { timeout: 15_000 })
  return seen.slice()
}
const beforePaint = (rows: Seen[]) => distinct(rows.filter((r) => !r.afterPaint))

/** THE CENSUS — the four record screens a person is sent to by name, and what
 * each of them cost before and after this commit. Measured 7 Sep 2026 by this
 * file, both arrivals, at `d2e50c8f` and at the tip.
 *
 *                       before            after
 *                    page 1 / past     page 1 / past
 *   a process           3   /   3        3   /   3
 *   a ticket           12   /  13        4   /   5
 *   an account         11   /  11        5   /   5
 *   a meeting           8   /   9        4   /   5
 *
 * THE BUDGET WAS ONLY EVER TESTED ON THE FIRST ROW, and that is the finding
 * this file was widened to make. `MAX_REQUESTS_BEFORE_FIRST_PAINT` was set to 5
 * on 6 Sep 2026 by the lane that took the processes screen from fourteen to
 * three, and the move that did it — the team-wide prewarm deferred to the
 * browser's next idle moment (`useAfterPaint`, use-screen-data.ts) — was made
 * on the shell and nowhere else. So the other three screens went on asking for
 * their pickers, their members, their stakeholders, their activity feed and
 * their tab badges in front of the record, and a person opening a ticket from
 * an email waited through thirteen requests to read one sentence.
 *
 * WHAT MOVED, and none of it deleted. Every read a record screen makes BESIDE
 * the record now waits until that screen has the record — `have`, the
 * DETERMINISTIC gate shared/web/after-paint.ts asks callers to prefer over its
 * own scheduler ("exact, needs no scheduler, and cannot be flaky"): the record's
 * activity feed and tab badges, a ticket's members, dropdown values and
 * stakeholders, an account's glyphs, impact panel and apps picker, a meeting's
 * three edit-form pickers. The one read with no such dependency —
 * `useStoryFormOptions`, six lists for a dialog nobody has opened — is behind
 * the scheduler itself, which is the case that hook reserves for itself.
 *
 * The last test in this file is unchanged and is the assertion in the other
 * direction: the deferred work still HAPPENS, afterwards.
 *
 * ONE BUDGET FOR EVERY ROW, deliberately. A per-screen ceiling was written here
 * first, while the numbers were 13 and 11, and thrown away when they came under
 * five: a table of pins is a table somebody raises, and the one number in
 * `limits.ts` is the sentence that was always meant.
 *
 * `byId` is the door that proves the record was read BY ID rather than found in
 * a page (R38) — asserted on the "past the cursor" arrival, which is the only
 * one where a screen reading the list would show nothing at all. */
const SCREENS = [
  {
    what: "a process",
    at: `/t/${TEAM}/processes/${PROCESS}`,
    name: NAME,
    byId: `/api/tenancy/processes/detail`,
    byIdCarries: PROCESS,
    collection: "/api/tenancy/processes",
  },
  {
    what: "a ticket",
    at: `/t/${TEAM}/tickets/${TICKET}`,
    name: TICKET_NAME,
    byId: "/api/content/help",
    byIdCarries: `id=${TICKET}`,
    collection: null,
  },
  {
    what: "an account",
    at: `/t/${TEAM}/accounts/${ACCOUNT}`,
    name: ACCOUNT_NAME,
    byId: "/api/tenancy/accounts/detail",
    byIdCarries: `id=${ACCOUNT}`,
    collection: null,
  },
  {
    what: "a meeting",
    at: `/t/${TEAM}/meetings/${MEETING}`,
    name: MEETING_NAME,
    byId: "/api/content/meetings",
    byIdCarries: `id=${MEETING}`,
    collection: null,
  },
] as const

/** Both arrivals, ONE render each, every question asked of that render. A fresh
 * module graph is the only honest cold start and it costs about six seconds, so
 * four assertions meant four identical renders and a file nobody wanted to run.
 * `ARRIVAL_TIMEOUT` is generous for the same reason. */
const ARRIVALS = [
  { inPageOne: true, called: "in page one" },
  { inPageOne: false, called: "past the cursor" },
] as const
const ARRIVAL_TIMEOUT = 60_000

describe.each(SCREENS)("a cold deep link to $what", ({ at, name, byId, byIdCarries, collection }) => {
  it.each(ARRIVALS)(
    `costs at most ${MAX_REQUESTS_BEFORE_FIRST_PAINT} requests before the record is on screen, $called`,
    async ({ inPageOne }) => {
      const rows = await arrive(at, name, inPageOne)
      const before = beforePaint(rows)

      // THE COUNT. The doors are NAMED in the failure, so the next reader sees
      // which ones were on the cold path rather than only how many.
      expect(
        before.length,
        `before first paint (${before.length}): ${before.join(", ")}`
      ).toBeLessThanOrEqual(MAX_REQUESTS_BEFORE_FIRST_PAINT)

      // NOTHING ASKED TWICE on the way to that paint — the other way a hop count
      // is gamed: split one door's answer across two requests, or mount the same
      // loader twice, and each of them is "one hop".
      const paths = rows.filter((r) => !r.afterPaint).map((r) => r.path)
      expect(
        paths.filter((p, i) => paths.indexOf(p) !== i),
        "a door asked twice before the record could be read"
      ).toEqual([])

      // THE RECORD IS READ BY ID (R38). Only the "past the cursor" arrival can
      // prove it: on the other one a screen that read its record out of the page
      // is indistinguishable from one that did the right thing.
      if (!inPageOne) {
        expect(
          before.some((p) => p.startsWith(byId) && p.includes(byIdCarries)),
          `${byId} carrying ${byIdCarries} is on the cold path (saw: ${before.join(", ")})`
        ).toBe(true)
        // …and the record's own COLLECTION is not read to draw one record. Only
        // named where the module HAS a separate collection door: on tickets,
        // accounts and meetings the by-id read is the same door with `?id=`.
        if (collection)
          expect(before.some((p) => p === collection || p.startsWith(`${collection}?`))).toBe(false)
      }
    },
    ARRIVAL_TIMEOUT
  )
})

/** ORDERING, NOT JUST A CEILING. The census above proves the by-id read
 * eventually happens and the total stays under budget — it cannot tell a
 * by-id read that started immediately, in parallel, from one that only
 * started after the list read resolved: with an un-delayed mock fetch, both
 * shapes finish in the same tick and post the same count. So the list door is
 * given a REAL, multi-second delay here, and the record must still paint —
 * proving the by-id read does not wait on it. A gated read (`listQ.data !==
 * undefined && !inPage ? key : null`) cannot even START until the delayed
 * list resolves, so this fails by TIMEOUT on that shape, not by a wrong
 * count — the same "setTimeout is the only honest gate" reasoning the
 * deferred-work assertion above already relies on for the opposite claim. */
const SEQUENCING = [
  {
    what: "a ticket",
    at: `/t/${TEAM}/tickets/${TICKET}`,
    name: TICKET_NAME,
    listMatch: (p: string) => p.startsWith("/api/content/help") && !p.includes("id="),
  },
  {
    what: "a meeting",
    at: `/t/${TEAM}/meetings/${MEETING}`,
    name: MEETING_NAME,
    listMatch: (p: string) => p.startsWith("/api/content/meetings") && !p.includes("id="),
  },
] as const
const LIST_DELAY_MS = 4_000
const PAINT_MUST_BEAT_MS = 1_500

describe.each(SEQUENCING)("$what, past the cursor, with a slow list door", ({ at, name, listMatch }) => {
  it("the by-id read does not wait for the list", async () => {
    listHoldsTheRecord = false
    arriveAt(at, name)
    slowDoor = { match: listMatch, ms: LIST_DELAY_MS }
    const DeepLinkScreen = await coldShell()
    render(<DeepLinkScreen />)
    // A short ceiling, well under LIST_DELAY_MS: only reachable if the by-id
    // read fired without waiting for the (still in-flight) list door.
    await screen.findAllByText(new RegExp(name), {}, { timeout: PAINT_MUST_BEAT_MS })
  }, LIST_DELAY_MS + 5_000)
})

describe("a cold deep link to a record", () => {
  it("the work moved off the cold path is still done — afterwards", async () => {
    // THE ASSERTION IN THE OPPOSITE DIRECTION, and the reason this file has one.
    // "Fewer requests before paint" and "the prewarm was deleted" are the same
    // number. Every door that used to be on the cold path must still be asked
    // once the person can read the record.
    listHoldsTheRecord = true
    arriveAt(`/t/${TEAM}/processes/${PROCESS}`, NAME)
    const DeepLinkScreen = await coldShell()
    render(<DeepLinkScreen />)
    await screen.findAllByText(NAME, {}, { timeout: 15_000 })
    await waitFor(
      () => {
        const after = distinct(seen.filter((r) => r.afterPaint))
        for (const door of [
          // the team-wide prewarm and the badge counts
          "/api/tenancy/roles",
          "/api/tenancy/invites",
          "/api/tenancy/selectable",
          // the record's own secondary panels
          "/api/tenancy/processes/comments",
          "/api/tenancy/client/roles",
          "/api/tenancy/client/tools",
          // …and the Activity tab, which is a tab and not a first paint
          "/api/tenancy/activity",
        ])
          expect(after.some((p) => p.startsWith(door)), `${door} is still asked, after the paint`).toBe(true)
      },
      { timeout: 15_000 }
    )
  })
})

/** WHAT THE SCREEN SAYS WHEN THE READ NEVER ANSWERS.
 *
 * The census in `detail-error-states.test.ts` proves each screen's error branch
 * MENTIONS the by-id read. That is a claim about the source, and a source claim
 * cannot tell you what a person sees — `RecordScreen` could swallow the state,
 * the branch could sit below an earlier return, the copy could be missing. So
 * this renders the two screens for real with the by-id door dropping the
 * connection, and reads the screen.
 *
 * The two wrong answers are named explicitly rather than left to a green tick,
 * because both of them shipped:
 *
 *   "That ticket no longer exists."  a CLAIM, made because the read that could
 *                                    have disproved it failed. A dropped
 *                                    connection is not a deletion.
 *   a skeleton that never resolves   the meetings half, and the worse one: a
 *                                    person cannot retry it, report it
 *                                    precisely, or tell it from a slow network.
 *
 * `round_trip_review` asked for exactly this shape — a rejected promise rather
 * than a timing race, since nothing here is about sequencing. */
const DEAD_READ = [
  {
    what: "a ticket",
    at: `/t/${TEAM}/tickets/${TICKET}`,
    door: (p: string) => p.startsWith("/api/content/help") && p.includes(`id=${TICKET}`),
    says: /couldn't load the ticket/i,
    neverSays: /no longer exists/i,
  },
  {
    what: "a meeting",
    at: `/t/${TEAM}/meetings/${MEETING}`,
    door: (p: string) => p.startsWith("/api/content/meetings") && p.includes(`id=${MEETING}`),
    says: /couldn't load the meeting/i,
    neverSays: /doesn't exist/i,
  },
] as const

describe.each(DEAD_READ)("$what past the cursor, when the by-id read never answers", ({ at, door, says, neverSays }) => {
  it("says it couldn't load — not that the record is gone, and not for ever", async () => {
    listHoldsTheRecord = false
    arriveAt(at, "never painted")
    deadDoor = door
    const DeepLinkScreen = await coldShell()
    render(<DeepLinkScreen />)

    // The error card, with its Try again — a state the person can act on.
    await screen.findAllByText(says, {}, { timeout: 15_000 })
    await screen.findAllByText(/try again/i, {}, { timeout: 15_000 })

    // …and NOT the confident sentence about a record nothing has looked at.
    expect(
      screen.queryAllByText(neverSays),
      "the screen claimed the record is gone, on a read that failed"
    ).toEqual([])
  }, 30_000)
})
