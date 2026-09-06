// WHAT A BRAND-NEW TEAM ACTUALLY SEES — the screens with nothing in them.
//
// EVERYONE TESTING ALREADY HAS DATA. That sentence is why this file exists.
// `onboarding-dead-ends.test.tsx` covers the sign-UP screen properly and has
// done for weeks; nothing anywhere asserted what /home or a collection screen
// RENDERS when the team has no rows. Every empty-state regression in the three
// weeks to 2026-09-05 — six commits' worth — was caught by a person looking at
// a screenshot, and the one instrument that walks a cold account
// (scripts/lane-shots/walk-empty-team.mjs) is a manual Playwright script that
// needs two live cookies and a running dev server.
//
// So this is the cold walk, in CI, over the four things the 2026-09-05 fresh-
// eyes review found and this change fixed. Each `it` below is one of its
// findings, written as the sentence that would have gone red:
//
//   F1  the landing screen never names a first act
//   F2  two import targets, and the generic importer, are reachable from nowhere
//   F3  sixteen collections share one empty sentence and it is untrue on most
//   F4  Contacts has no create route at all and its empty state points elsewhere

// The portal's own half of the same walk (F12 — a search box and a lone "+"
// over an empty collection) is in web-portal/test/cold-portal.test.tsx: the two
// front doors are two workspaces with two suites, and the portal does not
// compile out of the agency app's tree.
//
// A CANARY GUARDS THE INSTRUMENT, not just the result. Two of these assertions
// are absence assertions ("Start here" is NOT drawn on a busy team; the search
// box is NOT drawn on an empty one), and an absence assertion passes perfectly
// against a component that rendered nothing at all — a broken import, a thrown
// hook, a mock that never resolved. So every absence test asserts something
// POSITIVE from the same render first, and the shared `mustRender` helper below
// fails loudly when a tree comes back empty.

import { cleanup, render, screen, waitFor, within } from "@testing-library/react"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"

import type { ActiveContext, PermissionValue, TeamPulse } from "@shared/types"

const myPermissions = vi.fn()
const insights = vi.fn()

vi.mock("@/lib/api", () => ({
  tenancy: { myPermissions: () => myPermissions() },
  content: { insights: () => insights() },
}))

import {
  CollectionCreateActionProvider,
  CollectionEmptyState,
} from "@shared/web/screen-engine/collection-frame"
import { ScreenRenderer } from "@shared/web/screen-engine/screen-renderer"
import { BASE_RECIPES } from "@/lib/screens"
import { HomeScreen } from "@/components/screens/home-screen"
import { clearCache } from "@shared/web/store"

const WEB = join(__dirname, "..")

/* ------------------------------- the fixtures ------------------------------ */

const ALL_RIGHTS = { read: true, create: true, edit: true, delete: true }
const admin: PermissionValue = {
  accounts: ALL_RIGHTS,
  help: ALL_RIGHTS,
  work: ALL_RIGHTS,
  meetings: ALL_RIGHTS,
}
/** A role that may look at everything and change nothing — the shape that must
 * see no first-run block at all, because every step in it would refuse them. */
const viewer: PermissionValue = {
  accounts: { read: true, create: false, edit: false, delete: false },
  help: { read: true, create: false, edit: false, delete: false },
}

const ctx: ActiveContext = {
  team: { id: "team-1", name: "Brand New", logoUrl: null } as ActiveContext["team"],
  role: { id: "r1", title: "Admin" },
  memberCount: 1,
  teams: [],
}

const active = {
  loading: false,
  user: null,
  ctx,
  switchTeam: async () => {},
  createTeam: async () => {},
  refresh: async () => {},
}

/** A team created five seconds ago: every door answers, and every answer is a
 * zero. Not `null` — null is "your role may not read this" (R18), which is a
 * different fact and must not read as an empty team. */
const coldPulse: TeamPulse = {
  tickets: { open: 0, byStage: [{ stage: "new", count: 0 }] },
  work: {
    storiesOpen: 0,
    tasksDue: 0,
    tasksDueDone: 0,
    weeks: Array.from({ length: 8 }, (_, i) => ({ weekStart: `2026-07-0${i + 1}`, seconds: 0 })),
  },
  meetings: { thisWeek: 0 },
} as TeamPulse

/** The same team a fortnight later — one open ticket is enough. */
const warmPulse: TeamPulse = {
  ...coldPulse,
  tickets: { open: 1, byStage: [{ stage: "new", count: 1 }] },
} as TeamPulse

/** Render, and REFUSE an empty tree. A screen that throws in a hook or never
 * resolves its mock renders nothing, and every "…is not on screen" assertion
 * below would sail through it. */
function mustRender(ui: React.ReactElement): HTMLElement {
  const { container } = render(ui)
  expect(container.textContent?.trim().length ?? 0, "the component rendered nothing at all").toBeGreaterThan(0)
  return container as HTMLElement
}

beforeEach(() => {
  clearCache()
  myPermissions.mockReset()
  insights.mockReset()
  myPermissions.mockResolvedValue({ permissions: admin })
  insights.mockResolvedValue(coldPulse)
})
afterEach(cleanup)

/* --------------------------- F1 · the landing screen ----------------------- */

describe("F1 · the first screen a new member sees names a first act", () => {
  it("offers Start here on a team with nothing in it, and every step is pressable", async () => {
    mustRender(<HomeScreen active={active} />)
    const block = (await screen.findByText("Start here")).closest("section")
    expect(block, "Start here is not inside a section of its own").not.toBeNull()
    // The three acts, by the words a person reads — not by an internal id.
    for (const step of ["Add your first account", "Bring a spreadsheet in", "Raise the first ticket"]) {
      expect(within(block as HTMLElement).getByText(step), `"${step}" is missing from Start here`).toBeTruthy()
    }
  })

  it("takes Start here away the moment the team has anything at all", async () => {
    insights.mockResolvedValue(warmPulse)
    mustRender(<HomeScreen active={active} />)
    // THE CANARY: prove this render produced a real Home before believing the
    // absence below. The team's own name is on it whatever the numbers say.
    expect(await screen.findByText("Brand New")).toBeTruthy()
    await waitFor(() => expect(insights).toHaveBeenCalled())
    expect(screen.queryByText("Start here")).toBeNull()
  })

  it("draws no block at all for a role that can create nothing", async () => {
    myPermissions.mockResolvedValue({ permissions: viewer })
    mustRender(<HomeScreen active={active} />)
    expect(await screen.findByText("Brand New")).toBeTruthy()
    await waitFor(() => expect(myPermissions).toHaveBeenCalled())
    expect(screen.queryByText("Start here")).toBeNull()
  })
})

/* -------------------- F2 · the importer is reachable at all ---------------- */

describe("F2 · every declared import target has a way in from a screen", () => {
  /** Every line of every component and lib file in the agency app, comments
   * stripped — a comment naming a route is not a route. The same census shape
   * R37's in-app-anchors check stands on, asked of a different string. */
  const agencySource = sourceFiles(
    [join(WEB, "components"), join(WEB, "lib"), join(WEB, "app")],
    { extensions: [".ts", ".tsx"], relativeTo: WEB }
  )
    .map((f) => stripComments(f.source))
    .join("\n")

  /** THE CANARY, and it runs first. `import/accounts` has had a button since
   * the importer shipped, so a census that cannot find THAT one is a broken
   * census and every zero below would be a lie. */
  it("finds an import route that is definitely there", () => {
    expect(agencySource, "the census cannot find a route that exists — every result below is meaningless").toContain(
      "import/accounts"
    )
  })

  it.each([
    ["accounts", "the customer spine"],
    ["meetings", "two years of somebody's diary"],
    ["stories", "the work in hand"],
    ["brand_assets", "the agency's own material"],
    ["meeting_purposes", "why we meet"],
    ["member_roles", "the permission sheet"],
    ["selectable_data", "the team's dropdowns"],
  ])("names import/%s on a screen (%s)", (tableKey) => {
    expect(
      agencySource,
      `nothing in web/ links at /t/<team>/import/${tableKey} — the importer works and no button reaches it`
    ).toContain(`import/${tableKey}`)
  })

  it("names the generic import screen too, which lists all seven and hands out the sample file", () => {
    expect(
      /\/t\/\$\{teamId\}\/import`/.test(agencySource),
      "the bare /t/<team>/import screen is linked from nowhere — the only way in is to type the URL"
    ).toBe(true)
  })
})

/* ------------------ F3 / F4 · what an empty collection says ---------------- */

describe("F3 · an empty collection's sentence is true of that collection", () => {
  it("no longer tells every screen that records arrive from the client portal", () => {
    mustRender(<CollectionEmptyState title="No roles yet." onCreate={() => {}} />)
    expect(screen.getByText("No roles yet.")).toBeTruthy()
    expect(
      screen.queryByText(/raises a request from the portal/i),
      "the shared default still claims every collection fills from the client portal"
    ).toBeNull()
    expect(screen.getByText(/Whatever you add shows up here/i)).toBeTruthy()
  })

  it("says something different where the reader has no way in", () => {
    mustRender(<CollectionEmptyState title="No members yet." />)
    expect(screen.getByText(/Whatever gets added shows up here/i)).toBeTruthy()
    // TEN STATES #10: the control is ABSENT, never dimmed.
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("prefers the collection's own sentence when it has one", () => {
    mustRender(
      <CollectionEmptyState title="No contacts yet." description="Open the company under Accounts." onCreate={() => {}} />
    )
    expect(screen.getByText("Open the company under Accounts.")).toBeTruthy()
    expect(screen.queryByText(/Whatever you add shows up here/i)).toBeNull()
  })

  it("F4 · Contacts names the route that actually exists, since it has no create act", () => {
    const contacts = BASE_RECIPES["contacts.list"]?.collection
    expect(contacts, "the contacts list recipe is gone").toBeTruthy()
    expect(contacts?.emptyDescription, "Contacts' empty state has no sentence of its own").toBeTruthy()
    expect(contacts?.emptyDescription).toMatch(/Accounts/)
  })

  it("keeps the portal sentence on the one collection it is true of", () => {
    expect(BASE_RECIPES["tickets.list"]?.collection?.emptyDescription).toMatch(/portal/i)
    // …and nowhere else. Every other collection that carries its own sentence
    // must not claim a client raises one of these.
    for (const [key, recipe] of Object.entries(BASE_RECIPES)) {
      if (key === "tickets.list") continue
      const said = recipe.collection?.emptyDescription
      if (!said) continue
      expect(said, `${key} still tells a new team its rows arrive from the client portal`).not.toMatch(/portal/i)
    }
  })
})

/* ------------- F5 · the SCREENS reach their empty state, not just the body --- */

// EVERYTHING ABOVE THIS LINE TESTED THE PARTS. This section tests the SCREEN.
//
// The three `CollectionEmptyState` tests in F3 render that component directly,
// with a title and a description handed to it — so they prove the empty BODY
// draws what it is told and prove nothing at all about whether any screen ever
// reaches it. A recipe could lose its `emptyText`, a host could stop publishing
// its create action, the frame could take the no-results branch on a resting
// collection, and all three would stay green.
//
// So this renders the real engine (`ScreenRenderer`) over the real recipes
// (`BASE_RECIPES`) with `data={{ rows: [] }}` — the exact path every recipe
// collection in the app takes — and asks the two questions a new team's screen
// actually answers: what does it say, and is there something to press.
//
// `useKitPanel` is on because that is what the app passes at every one of these
// call sites (collection-content.tsx for members/roles/invites, meetings-screen
// and the accounts branch for the rest). It is not a test convenience: the
// suppression of search/filter/sort/count over a genuinely empty collection
// lives in that branch of `CollectionFrame` (its `isEmptyState` gate), so
// rendering the other branch would be asking a question about a screen nobody
// opens.
//
// THE CANARY IS THE ONE-ROW RENDER, and it is not optional. Every assertion
// here is about a screen with nothing in it, and "nothing in it" is exactly
// what a broken render looks like: a recipe key that no longer exists, a shaper
// that throws, a frame stuck in `loading`. So each screen is drawn a second
// time with a single row, and must then show that row and NOT show the empty
// sentence. A screen that says "No accounts yet." whatever you hand it is
// broken in the way this file exists to catch.

/** What the host publishes above each of these collections today. `false` is
 * never an oversight — Members and Contacts have no create act at all (a member
 * arrives by accepting an invite; a contact is added from her company's own
 * screen), and TEN STATES #10 says the control is then ABSENT, never dimmed. */
const COLLECTIONS: [key: string, title: string, hasCreateAction: boolean][] = [
  ["accounts.list", "No accounts yet.", true],
  ["roles.list", "No roles yet.", true],
  ["invites.list", "No invites yet.", true],
  ["meetings.list", "Nothing in Meetings yet.", true],
  ["contacts.list", "No contacts yet.", false],
  ["members.list", "No members yet.", false],
]

const ALL_FOUR = { read: true, create: true, edit: true, delete: true }
/** Every module any recipe below gates on. A recipe whose gate is missing draws
 * NOTHING, which would pass every absence assertion in this section. */
const EVERY_RIGHT = {
  accounts: ALL_FOUR,
  contacts: ALL_FOUR,
  member_roles: ALL_FOUR,
  team_members: ALL_FOUR,
  meetings: ALL_FOUR,
  help: ALL_FOUR,
  work: ALL_FOUR,
}

function drawCollection(key: string, rows: Record<string, unknown>[], hasCreateAction: boolean) {
  return mustRender(
    <CollectionCreateActionProvider
      action={hasCreateAction ? { label: "New", onCreate: () => {} } : null}
    >
      <ScreenRenderer
        recipe={BASE_RECIPES[key]}
        data={{ rows: rows as never }}
        rights={EVERY_RIGHT}
        onAction={() => {}}
        onIntent={() => {}}
        useKitPanel
      />
    </CollectionCreateActionProvider>
  )
}

describe("F5 · a real collection screen with nothing in it", () => {
  it.each(COLLECTIONS)("%s says its own sentence and nothing is loading", (key, title) => {
    expect(BASE_RECIPES[key], `${key} is gone from BASE_RECIPES`).toBeTruthy()
    drawCollection(key, [], true)
    expect(screen.getByText(title), `${key} never reached its empty state`).toBeTruthy()
  })

  it.each(COLLECTIONS)("%s draws its create act exactly where one exists", (key, _title, hasCreateAction) => {
    drawCollection(key, [], hasCreateAction)
    const add = screen.queryByRole("button", { name: /Add the first/i })
    if (hasCreateAction) {
      expect(add, `${key} names no act on an empty screen — a new team has nothing to press`).not.toBeNull()
      expect((add as HTMLButtonElement).disabled, "the one act on an empty screen is dimmed").toBe(false)
    } else {
      // TEN STATES #10: absent, never dimmed. Members and Contacts route
      // elsewhere, and their own sentence (F3/F4) is what says where.
      expect(add, `${key} offers "Add the first" for a record that cannot be created here`).toBeNull()
    }
  })

  it.each(COLLECTIONS)("%s draws no toolbar over a collection that is genuinely empty (R50)", (key) => {
    const container = drawCollection(key, [], true)
    // R50 is about the whole row, so this asks for the row's contents rather
    // than for `<ToolbarRow>` — the engine draws its own, and a law that only
    // recognised one spelling is how the portal's hand-rolled row slipped it.
    expect(container.querySelector("input"), `${key} draws a search box over zero rows`).toBeNull()
    expect(screen.queryByText(/^Showing /), `${key} counts rows on an empty collection`).toBeNull()
    expect(screen.queryByText(/results$/), `${key} draws a filter pill over zero rows`).toBeNull()
  })

  it.each(COLLECTIONS)("%s CANARY — one row and the empty sentence is gone", (key, title, hasCreateAction) => {
    // Enough fields for any of these shapers; the ones a recipe does not read
    // are ignored rather than rejected. THE SAME WORD IS IN ALL OF THEM on
    // purpose — Invites titles its row from `email` and the others from `name`,
    // so a canary pinned to one field would have reported "no row rendered" on
    // a screen that drew one perfectly.
    const row = {
      id: "row-1",
      name: "Vinter AB",
      title: "Vinter AB",
      label: "Vinter AB",
      email: "vinter@vinter.se",
      description: "Vinter AB",
      active: true,
    }
    drawCollection(key, [row], hasCreateAction)
    expect(
      screen.getAllByText(/vinter/i).length,
      `${key} rendered no row at all — every claim above is meaningless`
    ).toBeGreaterThan(0)
    expect(
      screen.queryByText(title),
      `${key} still says "${title}" while holding a row — its empty state is not reading the data`
    ).toBeNull()
  })
})

/* ------- F6 · a collection with no create act must say where the act IS ----- */

// THE DELIBERATE CHOICE, MADE READABLE BY SOMETHING OTHER THAN A HUMAN.
//
// Contacts publishes no create action on purpose — a contact is a person AT a
// company, so she is added from that company's own record, and a "New contact"
// button here would either create an orphan or open a form whose first question
// is "which company?", which is the Accounts screen with extra steps. Members
// is the same shape for a different reason: a member arrives by accepting an
// invite, and there is no door that makes one directly.
//
// Both reasons were written down in 2026 as CODE COMMENTS
// (contacts-screen.tsx's own note, collection-content.tsx's members branch),
// and a comment is read by people who are already looking at that file. What
// nothing checked was the PAIR: the moment a collection has no act, its empty
// state must say where the act actually is, because the frame's own default
// sentence — "Whatever you add shows up here" — promises one that does not
// exist on this screen.
//
// So this is the rule rather than the instance: no create act ⇒ its own
// sentence. It goes red if somebody gives Contacts a button and leaves the
// sentence pointing at Accounts, and red the other way if somebody deletes the
// sentence and lets the generic promise back in.

describe("F6 · no create act means the screen says where the act is", () => {
  const ACTLESS = COLLECTIONS.filter(([, , hasCreateAction]) => !hasCreateAction)

  it("there is at least one such collection, or this whole rule is vacuous", () => {
    // A filter that matches nothing passes every `it.each` below it silently —
    // the empty-result trap, said as a test.
    expect(ACTLESS.length, "no collection is marked act-less, so the rule below checks nothing").toBeGreaterThan(0)
  })

  it.each(ACTLESS)("%s carries its own sentence naming the route that exists", (key) => {
    const said = BASE_RECIPES[key]?.collection?.emptyDescription
    expect(
      said,
      `${key} has no create act and no sentence of its own — a new team is shown the frame's default, which promises an "Add the first" this screen does not have`
    ).toBeTruthy()
    expect(
      said,
      `${key} falls back to the generic promise on a screen with nothing to press`
    ).not.toMatch(/Whatever you add shows up here/i)
  })
})
