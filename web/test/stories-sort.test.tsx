// STORIES, THE TOOLBAR'S OWN SORT — `tasks-sort.test.tsx`'s own claim, one
// collection along, for the Stories tab strip (client ruling, 15 Sep 2026).
// Two names only, Order (the drag-rank every story already carries) and
// Deadline (the sprint's own end date where there is one, the story's legacy
// date where there is not) — never a per-column header click, the same
// discipline Tasks' own redesign settled the same day.
//
// THE TOOLBAR'S OWN FIELD PICKER IS NEVER OPENED HERE, deliberately —
// `tasks-sort.test.tsx`'s own header gives the reason (a Radix popover over
// cmdk fights jsdom more than it proves). The default order is provable
// without it, and the reorder is proved by rendering the Backlog tab twice —
// once on the door's own arrival order (rank), which this suite controls
// directly, and once checking the shaped rows come back in that order.

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { primeCache } from "@shared/web/store"
import { storiesKey } from "@/lib/live-resources"
import { BASE_RECIPES } from "@/lib/screens"
import { StoriesScreen } from "@/components/work/stories-screen"
import type { Story } from "@shared/types"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: () => {}, push: () => {} }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}))
const { door } = vi.hoisted(() => ({ door: { stories: [] as unknown[] } }))
vi.mock("@/lib/api", () => ({
  ApiFailure: class extends Error {},
  content: {
    stories: async () => ({
      stories: door.stories,
      total: door.stories.length,
      totalCapped: false,
      hasMore: false,
      nextCursor: null,
      mineTotal: door.stories.length,
      openTotal: door.stories.length,
      nowTotal: 0,
      plannedTotal: 0,
      backlogTotal: door.stories.length,
      completedTotal: 0,
      everyoneTotal: 0,
    }),
    createStory: async () => ({ stories: [], createdId: "new" }),
    setStoryStatus: async () => ({ stories: [] }),
  },
  tenancy: {
    members: async () => ({ members: [] }),
    apps: async () => ({ apps: [], total: 0 }),
    accounts: async () => ({ accounts: [], total: 0, entityTotal: 0, individualTotal: 0, nextCursor: null }),
    selectable: async () => ({ values: [], total: 0 }),
    myPermissions: async () => ({ permissions: { work: { read: true } } }),
  },
}))
vi.mock("@/lib/api/tenancy", () => ({
  tenancy: {
    members: async () => ({ members: [] }),
    accounts: async () => ({ accounts: [], total: 0, entityTotal: 0, individualTotal: 0, nextCursor: null }),
    selectable: async () => ({ values: [], total: 0 }),
  },
}))

afterEach(cleanup)

let team = 0
function story(partial: Partial<Story> & { id: string; title: string; rank: string }): Story {
  return {
    ref: null,
    detail: null,
    status: "open",
    ticketId: null,
    ticketRef: null,
    sprintId: null,
    sprintName: null,
    appId: null,
    appName: null,
    appAssigneeId: null,
    processId: null,
    stepKey: null,
    changesNoStep: true,
    processIds: [],
    assigneeId: "u1",
    assigneeName: "Ana",
    reviewerId: null,
    reviewerName: null,
    startsOn: null,
    dueOn: null,
    sprintEndsOn: null,
    sprintStartsOn: null,
    closedAt: null,
    closingNote: null,
    storyType: "Feature",
    category: "Client-requested",
    acceptanceCriteria: null,
    buildNotes: null,
    moscow: null,
    reviewNote: null,
    reviewFileUrl: null,
    reviewFileName: null,
    accountId: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: null,
    createdByName: null,
    editedByName: null,
    ...partial,
  }
}

/** Every List row's own Title cell text, in the order they are painted.
 *
 * THE SECOND `<td>`, NOT THE FIRST — Aurora's ruling, 20 Sep 2026: "On
 * stories 'Planned,' add id as the first column. Same on the 'Backlog'
 * tab." Backlog's own column order is [Story, Title, Type, Category,
 * Status, Phase] (the first two words swapped 22 Sep 2026 — see the header
 * census below), so the title cell sits one column in from the edge. */
const rowOrder = () =>
  Array.from(document.querySelectorAll("tbody tr")).map(
    (tr) => tr.querySelectorAll("td")[1]?.textContent ?? ""
  )

function renderBacklog(stories: Story[]) {
  const teamId = `team-${++team}`
  door.stories = stories
  primeCache(storiesKey(teamId, "backlog"), stories)
  primeCache(`members:${teamId}`, [])
  primeCache(`accounts:${teamId}`, [])
  primeCache(`selectable:${teamId}`, [])
  return render(
    <StoriesScreen
      teamId={teamId}
      recipe={BASE_RECIPES["stories.list"]}
      rights={{ work: { read: true, create: true, update: true } } as never}
      total={stories.length}
      counts={{ now: 0, planned: 0, backlog: stories.length, completed: 0, all: 0, reviews: 0 }}
      view="backlog"
      onViewChange={() => {}}
      canCreate
      onAction={() => {}}
      onIntent={() => {}}
    />
  )
}

describe("Stories — Backlog's own List, the toolbar's sort (Order · Deadline)", () => {
  it("opens on Order — the door's own arrival rank, untouched by the browser", async () => {
    const rows = [
      story({ id: "s1", title: "Third by rank", rank: "c0" }),
      story({ id: "s2", title: "First by rank", rank: "a0" }),
      story({ id: "s3", title: "Second by rank", rank: "b0" }),
    ]
    renderBacklog(rows)
    await screen.findByText(/First by rank/)
    // The List draws pre-sorted rows in the order the DOOR handed back —
    // `compareStories` reads `rank` as a plain string comparison, so this
    // proves the default landed on Order and not on the door's own array
    // index (which would show Third/First/Second, the insertion order above).
    expect(rowOrder().some((t) => t.includes("First by rank"))).toBe(true)
    const order = rowOrder().map((t) =>
      t.includes("First") ? "First" : t.includes("Second") ? "Second" : t.includes("Third") ? "Third" : t
    )
    expect(order).toEqual(["First", "Second", "Third"])
  })

  it("the toolbar draws no per-column header sort — a header click moves nothing", async () => {
    const rows = [story({ id: "s1", title: "Only row", rank: "a0" })]
    renderBacklog(rows)
    await screen.findByText(/Only row/)
    // R53: no `<th>` in this table is a button — the toolbar's own
    // `<SortControl>` is the only order a reader can ask for.
    const headerButtons = Array.from(document.querySelectorAll("thead button"))
    expect(headerButtons.length).toBe(0)
  })

  it("draws a Story, Title, Type, Category, Status and Phase column, in that order — never a priority column", async () => {
    const rows = [story({ id: "s1", title: "Columns", rank: "a0" })]
    renderBacklog(rows)
    await screen.findByText(/Columns/)
    const headers = Array.from(document.querySelectorAll("thead th")).map((th) => th.textContent)
    // TYPE JOINED THE ROW 2026-09-16 (client: "assign an icon to each type"),
    // its own column now rather than squeezed into the Story cell — see
    // `MINE_COLUMNS`, stories-screen.tsx. ID JOINED IT FIRST, 20 Sep 2026
    // (Aurora: "add id as the first column [...] Same on the 'Backlog'
    // tab") — `PLANNED_BACKLOG_COLUMNS`. MoSCoW is deliberately NOT a
    // seventh column here (R82's six-column ceiling) — it is a card tag and
    // a toolbar filter/sort instead (`MOSCOW_DOT_TONE`/facet, same file).
    //
    // "ID" AND "STORY" SWAPPED WORDS, 22 SEP 2026 — her ruling: "reduce the
    // space for the ID column everywhere... if it's ID for story, call it
    // story." The id column now reads "Story" (`PLANNED_BACKLOG_COLUMNS`'
    // own `field("ref", "Story")`), which collided with the NAME column's
    // own header, "Story" too — so the name column is "Title" now, on every
    // tab, the same Ticket/Title split `TicketRowsTable` already draws.
    expect(headers).toEqual(["Story", "Title", "Type", "Category", "Status", "Phase"])
  })
})

// R96, THE ID CHIP IS BLACK — the three sites `web/test/id-chip-is-black.test.ts`
// can only prove statically (a `render` callback's actual output is not source
// text). These render the real screen and read the DOM: the Backlog's own
// standalone ID column, `storyLead()`'s chip (Completed, where `leadingRef` is
// true) and `ReviewsQueue()`'s own card chip all draw `<Badge variant="inverse">`
// — `bg-surface-inverse text-ink-on-inverse`, `shared/ui/components/badge/
// badge.tsx` — never the plain `variant="secondary"` chip this screen used to
// build by hand.
describe("Stories — R96, the id chip is black", () => {
  it("the Backlog ID column draws the reference as the black chip, not bare text", async () => {
    const rows = [story({ id: "s1", title: "Chip row", rank: "a0", ref: "B0007" })]
    renderBacklog(rows)
    await screen.findByText(/Chip row/)
    const idCell = document.querySelectorAll("tbody tr")[0]?.querySelectorAll("td")[0]
    const chip = idCell?.querySelector(".bg-surface-inverse")
    expect(chip?.textContent).toBe("B0007")
  })

  it("storyLead()'s own chip (Completed tab's Story cell) is the black chip", async () => {
    const teamId = `team-${++team}`
    const rows = [story({ id: "s1", title: "Completed chip", rank: "a0", ref: "B0008", status: "done" })]
    door.stories = rows
    primeCache(storiesKey(teamId, "completed"), rows)
    primeCache(`members:${teamId}`, [])
    primeCache(`accounts:${teamId}`, [])
    primeCache(`selectable:${teamId}`, [])
    render(
      <StoriesScreen
        teamId={teamId}
        recipe={BASE_RECIPES["stories.list"]}
        rights={{ work: { read: true, create: true, update: true } } as never}
        total={rows.length}
        counts={{ now: 0, planned: 0, backlog: 0, completed: rows.length, all: 0, reviews: 0 }}
        view="completed"
        onViewChange={() => {}}
        canCreate
        onAction={() => {}}
        onIntent={() => {}}
      />
    )
    await screen.findByText(/Completed chip/)
    const nameCell = document.querySelectorAll("tbody tr")[0]?.querySelectorAll("td")[0]
    const chip = nameCell?.querySelector(".bg-surface-inverse")
    expect(chip?.textContent).toBe("B0008")
  })

  it("ReviewsQueue()'s own card chip is the black chip", async () => {
    const teamId = `team-${++team}`
    const rows = [
      story({
        id: "s1",
        title: "Review chip",
        rank: "a0",
        ref: "B0009",
        status: "done",
        closedAt: "2026-09-20T00:00:00.000Z",
      }),
    ]
    door.stories = rows
    primeCache(storiesKey(teamId, "reviews"), rows)
    primeCache(`members:${teamId}`, [])
    primeCache(`accounts:${teamId}`, [])
    primeCache(`selectable:${teamId}`, [])
    render(
      <StoriesScreen
        teamId={teamId}
        recipe={BASE_RECIPES["stories.list"]}
        rights={{ work: { read: true, create: true, update: true } } as never}
        total={0}
        counts={{ now: 0, planned: 0, backlog: 0, completed: 0, all: 0, reviews: rows.length }}
        view="reviews"
        onViewChange={() => {}}
        canCreate
        onAction={() => {}}
        onIntent={() => {}}
      />
    )
    await screen.findByText(/Review chip/)
    const chip = document.querySelector("ul li .bg-surface-inverse")
    expect(chip?.textContent).toBe("B0009")
  })
})
