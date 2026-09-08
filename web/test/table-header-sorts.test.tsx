// A COLUMN HEADER MOVES THE ROWS, or it is not a control.
//
// ── THE BUG THIS IS ────────────────────────────────────────────────────────────
//
// Reported on the deployed build with a screenshot: Tasks → List, 80 rows, the
// Deadline header showing an active descending arrow, and the rows in the DOOR's
// order — one priority-4 task dated a year out sitting on top of 79 priority-1
// rows that ascend by deadline underneath it. The header was lit and the list had
// never moved.
//
// The mechanism was one line of the library. `DataTable` keeps the header's
// choice in its own state and pushes it down to `CollectionFrame` as a config
// prop; the frame seeds its sort from that prop ONCE, at mount
// (`React.useState(config.sortBy)`), and orders by its own state ever after. So
// the value the header wrote was read by nobody, on every column of both tables
// in the app. The arrow moved because the arrow is the header's own state; the
// rows did not because the rows are the frame's.
//
// ── WHY THIS FILE IS SHAPED LIKE THIS ──────────────────────────────────────────
//
// The comparison was already correct and already tested. `formatDateSortable`
// landed the same day, with a passing test, so that "2026-04-14" sorts after
// "2025-12-01" — and none of it could ever be seen, because the screen never
// asked anything to sort. A green test on a helper the screen does not call is
// how this shape ships three times in one day.
//
// THAT HELPER IS GONE, 2026-09-06, and the sentence above is now history rather
// than description. It bought a correct order by spelling the date for the
// COMPARATOR instead of for the reader — "2026-04-14" on a screen built for a
// manager — because the cell and the comparison value were the same string.
// `record-table.tsx` now takes a `sortType`/`sortKey` per column and compares
// the raw instant off the row, so Deadline and Closed render `formatDate` again
// and this file's fixtures read like the screen does. The comparison itself has
// its own suite: `sorts-compare-the-value-not-the-text.test.tsx`, whose whole
// point is fixture dates where the calendar and the alphabet DISAGREE.
//
// So NOTHING here tests a comparator. Every assertion is about the ORDER OF THE
// RENDERED ROWS BEFORE AND AFTER A PERSON CLICKS, read out of the DOM of the real
// screen — the one fact a working helper cannot fake and a lit-up dead control
// cannot pass.

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"
import { primeCache } from "@shared/web/store"
import { PagedFind } from "@/components/records/paged-find"
import { RecordTable } from "@/components/records/record-table"
import { COLLECTION_SORTS, translatedSorts } from "@/lib/collection-sorts"
import { formatDate } from "@shared/web/format"
import { appsKey, tasksKey } from "@/lib/live-resources"
import { BASE_RECIPES, withDataDrivenCollection } from "@/lib/screens"
import { TasksScreen } from "@/components/work/tasks-screen"
import type { Task } from "@shared/types"

// The screen mounts its "new task"/"ask a client" dialogs, which reach the
// router, and every cached read revalidates on mount. Neither is what is being
// tested; both have to answer for the screen to stay rendered.
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: () => {}, push: () => {} }) }))
const { door } = vi.hoisted(() => ({ door: { tasks: [] as unknown[] } }))
vi.mock("@/lib/api", () => ({
  ApiFailure: class extends Error {},
  content: {
    tasks: async () => ({
      tasks: door.tasks,
      openTotal: door.tasks.length,
      allTotal: 0,
      overdueTotal: 0,
      upcomingTotal: 0,
      completedTotal: 0,
      calendarTotal: 0,
      dueTodayTotal: 0,
      dueTodayDone: 0,
    }),
    todos: async () => ({ todos: [], total: 0 }),
  },
  tenancy: {
    members: async () => ({ members: [] }),
    apps: async () => ({ apps: [], total: 0 }),
    accounts: async () => ({
      accounts: [],
      total: 0,
      entityTotal: 0,
      individualTotal: 0,
      nextCursor: null,
    }),
    selectable: async () => ({ values: [], total: 0 }),
    myPermissions: async () => ({
      permissions: { work: { read: true }, all_tasks: { read: true } },
    }),
  },
}))

afterEach(cleanup)

/* ───────────────────────────── the tasks screen ───────────────────────────── */

/** THE SCREENSHOT, as rows: the door hands back priority first, so the one
 * `4 · Do it now` task leads and everything under it climbs by deadline. Sorting
 * by Deadline has to move the top row to the BOTTOM — no arrangement of these
 * five is a no-op, which is what stops a dead control passing by luck. */
const TASKS = [
  // deliberately two rows sharing a deadline, as the screenshot had — ties keep
  // the order they arrived in, both ways round, which is what a stable sort owes
  // a person who is scanning the same list twice.
  { id: "t1", title: "Feedback 01", priority: 4, department: "Sales", assigneeName: "Ana", dueOn: "2026-09-21T00:00:00.000Z" },
  { id: "t2", title: "Visuals", priority: 1, department: "Design", assigneeName: "Bea", dueOn: "2025-04-14T00:00:00.000Z" },
  { id: "t3", title: "Copy", priority: 1, department: "Content", assigneeName: "Cal", dueOn: "2025-04-14T00:00:00.000Z" },
  { id: "t4", title: "HR Dashboard Hogo", priority: 1, department: "Ops", assigneeName: "Dev", dueOn: "2025-04-23T00:00:00.000Z" },
  // Nothing filled in at all: it must sit LAST in both directions, because a
  // sort is for finding the extremes of what you have and a screen of em-dashes
  // is not one of them.
  { id: "t5", title: "Someday", priority: 1, department: null, assigneeName: null, dueOn: null },
] as unknown as Task[]

let team = 0
/** A team with its caches already warm, so the screen renders its rows on the
 * first paint and nothing here is waiting on a mocked fetch. */
function warmTeam(tasks: Task[]): string {
  const teamId = `team-${++team}`
  primeCache(tasksKey(teamId, "open"), tasks)
  primeCache(`my-perms:${teamId}`, { work: { read: true }, all_tasks: { read: true } })
  primeCache(`members:${teamId}`, [])
  primeCache(appsKey(teamId), [])
  primeCache(`accounts:${teamId}`, [])
  primeCache(`selectable:${teamId}`, [])
  return teamId
}

function renderTasks(tasks: Task[] = TASKS) {
  const teamId = warmTeam(tasks)
  // …and the same rows come back when the screen revalidates on mount, so the
  // list under test is never quietly replaced mid-assertion.
  door.tasks = tasks
  render(
    <TasksScreen
      teamId={teamId}
      recipe={BASE_RECIPES["tasks.list"]}
      rights={{ work: { read: true } } as never}
      total={tasks.length}
      counts={{
        all: undefined,
        overdue: undefined,
        upcoming: undefined,
        completed: undefined,
        calendar: undefined,
        dueToday: undefined,
        dueTodayDone: undefined,
      }}
      view="open"
      onViewChange={() => {}}
      myUserId="u1"
      canCreate={false}
      canRaiseTodo={false}
      canCancelTodo={false}
      onAction={() => {}}
      onIntent={() => {}}
    />
  )
}

/** The first cell of every rendered row, in the order they are painted. The
 * whole point of the file: what a person actually sees down the page. */
const rowOrder = () =>
  Array.from(document.querySelectorAll("tbody tr")).map(
    (tr) => tr.querySelector("td")?.textContent ?? ""
  )

const header = (label: string) => screen.getByRole("button", { name: new RegExp(`^${label}`) })

/** What the column SAYS it is doing — the standard attribute, so the claim and
 * the rows can be compared rather than assumed to agree. */
const claimed = (label: string) => header(label).closest("th")?.getAttribute("aria-sort") ?? null

describe("Tasks: the rows move when the header is clicked", () => {
  it("opens in the door's order — priority first, exactly as reported", () => {
    renderTasks()
    expect(rowOrder()[0]).toContain("Feedback 01")
  })

  it("sorting by Deadline REPLACES that order rather than sorting inside it", () => {
    renderTasks()
    const before = rowOrder()
    fireEvent.click(header("Deadline"))
    const after = rowOrder()

    // The assertion the old code could not pass: the list is not what it was.
    expect(after, "the rows did not move — the header is drawing a dead control").not.toEqual(before)
    // Soonest first, and the priority-4 row is no longer privileged: it has the
    // furthest-out deadline, so it goes last of the dated rows. Anything that
    // "sorted within priority" would still have it on top.
    expect(after.map((r) => r.replace(/ .*/, ""))).toEqual([
      "Visuals",
      "Copy",
      "HR",
      "Feedback",
      // no deadline — last, and it stays last when the direction flips
      "Someday",
    ])
    expect(claimed("Deadline")).toBe("ascending")
  })

  it("a second click reverses it, and the blanks stay at the bottom", () => {
    renderTasks()
    fireEvent.click(header("Deadline"))
    fireEvent.click(header("Deadline"))
    expect(rowOrder().map((r) => r.replace(/ .*/, ""))).toEqual([
      "Feedback",
      "HR",
      // the tie, still in the order it arrived in
      "Visuals",
      "Copy",
      "Someday",
    ])
    expect(claimed("Deadline")).toBe("descending")
  })

  it("a third click gives the door's own order back", () => {
    renderTasks()
    const arrived = rowOrder()
    fireEvent.click(header("Deadline"))
    fireEvent.click(header("Deadline"))
    fireEvent.click(header("Deadline"))
    // The priority-first default is a decision, not an accident — it is one more
    // press away rather than gone until the screen is reloaded.
    expect(rowOrder()).toEqual(arrived)
    expect(claimed("Deadline")).toBeNull()
  })

  // EVERY column with a header button moves the rows — column by column, because
  // the defect was per-column and uniform: five lit headers, none of them wired.
  // One passing column would have hidden four.
  //
  // The assertion is that the column's two DIRECTIONS differ from each other,
  // not that either differs from the arrival order — a column whose ascending
  // order happens to be the order the door already used is a live control that
  // legitimately moved nothing (Priority, here, is exactly that). A dead one
  // cannot pass: it gives the same list all three times.
  //
  // ONE CASE PER COLUMN rather than one case with a loop in it. Five full
  // renders inside a single `it` cost five times a normal test against the one
  // shared 5000ms budget — and that budget is WALL CLOCK, so in a 58-file
  // parallel suite it was measuring how busy the machine was rather than
  // anything about this code. It went red on 19 Aug 2026 because a lane added
  // two test files elsewhere in the workspace. Split, each column gets its own
  // budget, its own name in the output, and the coverage is identical.
  it.each(["Task", "Priority", "Department", "Who has it", "Deadline"])(
    "the %s header moves the rows",
    (label) => {
      renderTasks()
      fireEvent.click(header(label))
      const oneWay = rowOrder()
      fireEvent.click(header(label))
      expect(rowOrder(), `the ${label} header changes nothing in either direction`).not.toEqual(
        oneWay
      )
    }
  )
})

describe("the rest of the collection's chrome survived the swap", () => {
  // The order was the ONLY thing taken off the library frame. Search, facets,
  // the count and the empty line are still its own, and a table that gained a
  // working sort by losing its search box would be a bad trade nobody asked for.
  /** The box debounces (200ms upstream), so a keystroke is not a filter. */
  const search = async (text: string) => {
    fireEvent.change(screen.getAllByRole("searchbox")[0], { target: { value: text } })
    await waitFor(() => expect(rowOrder().length).toBeLessThan(5))
  }

  it("still searches the rows it holds", async () => {
    renderTasks()
    expect(rowOrder().length).toBe(5)
    await search("Visuals")
    expect(rowOrder()).toEqual(["Visuals"])
  })

  it("still narrows, and sorting what is left keeps it narrowed", async () => {
    renderTasks()
    // The two rows that share a deadline — the frame searches every column.
    //
    // DERIVED FROM THE FORMATTER rather than typed, because the Deadline cell is
    // now the warm date and the words in it are the reader's language's: typing
    // "Apr 14, 2025" here would pin this assertion to English and to a build of
    // ICU, and typing "2025-04-14" is what it used to say when the cell was the
    // sortable spelling — which is exactly the string this pass removed.
    await search(formatDate("2025-04-14T00:00:00.000Z", "en"))
    const narrowed = rowOrder()
    expect(narrowed.length).toBe(2)
    fireEvent.click(header("Deadline"))
    // Ordering happens before the frame narrows, and narrowing preserves order —
    // so the two compose rather than fight.
    expect(rowOrder().length, "sorting a searched list must not widen it").toBe(narrowed.length)
    expect([...rowOrder()].sort()).toEqual([...narrowed].sort())
  })
})

/* ───────────────────────────── the meetings list's table ──────────────────── */

type Row = { id: string; name: string; when: string }

/** The meetings list PAGES, so its headers must ask the DOOR — the same handle the
 * picker beside the search box holds. This is the screen's composition, minus
 * the screen: a `<PagedFind>` with the meetings list's own sort menu, and the table
 * underneath it taking `found.order`. */
function renderMeetingsTable() {
  const asked: { query: Record<string, string>; cursor: string | null }[] = []
  const listKey = `meetings:team-${++team}`
  render(
    <PagedFind<Row>
      listKey={listKey}
      placeholder="Search meetings…"
      matches={{
        none: "No meetings match",
        one: "1 meeting matches",
        many: "{count} meetings match",
      }}
      sorts={translatedSorts("meetings", (s) => s)}
      defaultSort={COLLECTION_SORTS.meetings.defaultSort}
      // R50 — this suite exercises a table header's own sort over a resting
      // collection that already has rows (`found.rows ?? […]` falls back to
      // one below).
      restingEmpty={false}
      fetchPage={async (query, cursor) => {
        asked.push({ query: { ...query }, cursor })
        return { rows: [{ id: "m9", name: "From the door", when: "2026-01-01" }], nextCursor: null, total: 1 }
      }}
    >
      {(found) => (
        <RecordTable
          columns={[
            { key: "name", label: "Meeting", sort: "title", defaultDir: "asc" },
            { key: "when", label: "When", sort: "when", defaultDir: "desc" },
            // The door has no name for this one — so it must not look like it has.
            { key: "where", label: "Where" },
          ]}
          rows={found.rows ?? [{ id: "m1", name: "The one we loaded", when: "2025-05-05" }]}
          config={
            withDataDrivenCollection(BASE_RECIPES["meetings.list"], [{ id: "m1", name: "x" }])
              .collection as never
          }
          order={found.order}
        />
      )}
    </PagedFind>
  )
  return asked
}

describe("the meetings list: a header asks the door, because the browser only holds page one", () => {
  it("does not ask for the order the meetings list already arrived in", async () => {
    const asked = renderMeetingsTable()
    await new Promise((r) => setTimeout(r, 20))
    expect(asked, "an untouched screen sends nothing").toEqual([])
    // …and it says which order that is, rather than showing three neutral arrows
    // over a list that is very much in an order.
    expect(claimed("When")).toBe("descending")
  })

  it("clicking a column asks the DOOR for it, from page one", async () => {
    const asked = renderMeetingsTable()
    fireEvent.click(header("Meeting"))
    await waitFor(() => expect(asked.length).toBe(1))
    expect(asked[0].query.sort, "the door's own name for that column").toBe("title")
    expect(asked[0].query.dir).toBe("asc")
    expect(asked[0].cursor, "a different order is a different question — page one").toBeNull()
  })

  it("…and the rows on screen become the door's answer", async () => {
    renderMeetingsTable()
    expect(rowOrder()[0]).toContain("The one we loaded")
    fireEvent.click(header("Meeting"))
    await waitFor(() => expect(rowOrder()[0]).toContain("From the door"))
  })

  it("the column the door cannot order draws no control at all", () => {
    renderMeetingsTable()
    expect(
      screen.queryByRole("button", { name: /^Where/ }),
      "a header that cannot sort must not look like one that can"
    ).toBeNull()
    expect(screen.getByText("Where"), "…it is still a column heading").toBeTruthy()
  })

  it("the third press on a column gives the meetings list's own order back, asking nothing", async () => {
    const asked = renderMeetingsTable()
    fireEvent.click(header("Meeting")) // title asc
    await waitFor(() => expect(asked.length).toBe(1))
    fireEvent.click(header("Meeting")) // title desc
    await waitFor(() => expect(asked.length).toBe(2))
    fireEvent.click(header("Meeting")) // back to the door's default
    await new Promise((r) => setTimeout(r, 20))
    expect(asked.length, "the order it was already in is not a question").toBe(2)
    expect(rowOrder()[0]).toContain("The one we loaded")
  })
})

/* ──────────────────── and no table goes back to the dead path ──────────────── */

describe("every table in the agency app is one whose headers work", () => {
  it("no screen renders a collection through the engine's table display", () => {
    // The rot-check under the two behavioural suites above. `ScreenRenderer`'s
    // table branch hard-codes `sortable: true` on every column and hands the
    // choice to a frame that will not read it, so a third table added that way
    // would ship the same defect with a green build — and nothing else in the
    // repo can see it, because a lit arrow over unmoved rows is not a type error.
    const offenders: string[] = []
    /** Every screen the census actually judged — the positive control, and the
     * only thing between this test and a silent all-clear.
     *
     * TWO WAYS IT GOES QUIET, and the second is the near one. The WALK could
     * collapse (`web/components` renamed) and this loop would judge no screen.
     * More likely: the SUBJECT is small. Two screens build a table recipe today
     * — tasks and meetings — out of 144 component files, so the gate
     * `display: "table"` is doing the work of finding two needles, and any
     * change of spelling (a constant instead of the literal, the recipe built
     * by a helper) empties this census while leaving both defects shippable.
     * If this floor fails, the shape moved: teach it the new one, do not
     * lower it. */
    const judged: string[] = []
    for (const f of sourceFiles(join(__dirname, "..", "components"), { extensions: [".tsx"] })) {
      const src = stripComments(f.source)
      if (!/display:\s*"table"/.test(src)) continue
      judged.push(f.path.split("/").pop() as string)
      // The recipe a file builds as a table must reach `RecordTable`. Named, so
      // the check reads the same way the screens do: `<name>Recipe` in, table out.
      const names = [...src.matchAll(/const (\w+)\s*=\s*withDataDrivenCollection\(\s*\{[^}]*display:\s*"table"/g)]
      for (const m of names) {
        const built = m[1]
        if (new RegExp(`<ScreenRenderer[\\s\\S]{0,200}recipe=\\{${built}\\}`).test(src))
          offenders.push(`${f.path.split("/").pop()}: ${built} is drawn by ScreenRenderer`)
      }
      if (!src.includes("<RecordTable"))
        offenders.push(`${f.path.split("/").pop()}: builds a table recipe and renders no RecordTable`)
    }
    expect(
      judged,
      `this census judged ${judged.length} screens. There are table screens in this app — finding none means the recipe's shape has moved and nothing here is being checked`
    ).not.toEqual([])
    expect(
      offenders,
      `a table whose column headers cannot sort: ${offenders.join(" · ")}`
    ).toEqual([])
  })

  it("the library seam this works around is still the broken one", () => {
    // If the seam is ever fixed, this goes red and `RecordTable` can collapse
    // onto `DataTable` — so the workaround cannot quietly outlive its reason.
    // (UI-GAPS #22(b) is the ask.)
    //
    // Read out of `shared/ui/` since 2026-08-22, not `node_modules`. "If the
    // library ever fixes it" used to name somebody else's roadmap; the library
    // is this repo's now, so the fix is ours to make and this check is the thing
    // that will tell us the workaround has become dead weight.
    // The frame is ENGINE code now (shared/web/screen-engine) — the design-kit
    // swap moved the old library's collection controller app-side, so "the
    // library's roadmap" became "this file, one directory over".
    const frame = readFileSync(
      join(__dirname, "..", "..", "shared", "web", "screen-engine", "collection-frame.tsx"),
      "utf8"
    )
    // THE DEFECT IS "SEEDED ONCE, NEVER RE-READ", not one spelling of it. This
    // used to grep for `useState(config.sortBy)`, which went red on 27 Aug 2026
    // when the nav memory replaced that `useState` with a remembered value —
    // seeded from `config.sortBy` at mount and ignoring the prop from then on,
    // which is the SAME broken seam under a different name. A rot-check that
    // matches the shape of the bug rather than its characters would not have
    // moved, so it is written that way now: the seed is still there, and
    // nothing re-syncs it when the prop changes. Fix the seam (make the frame
    // follow `config.sortBy`) and both halves go red together, which is the
    // signal `RecordTable` is free to collapse onto `DataTable`.
    const seedsOnceFromConfig =
      /useState\(\s*config\.sortBy\s*\)/.test(frame) || /sortBy:\s*config\.sortBy/.test(frame)
    // THE EFFECT THAT OWNS `sortBy`, not any effect that happens to be followed
    // by the word. This was `/useEffect\([\s\S]{0,400}config\.sortBy/`, and a
    // canary written as a character window lies in BOTH directions — which
    // matters more here than in an ordinary law, because this one is deliberately
    // held red-when-fixed and its whole job is to report the day the seam
    // changes.
    //   · TOO NARROW: a real re-sync effect with more than 400 characters of
    //     dependency array, comment or body between `useEffect(` and the prop
    //     read keeps this reporting "still broken" after the fix has landed, and
    //     `RecordTable` stays in the tree with nothing to say so.
    //   · TOO WIDE: the window does not stop at the effect's own closing paren,
    //     so ANY `useEffect(` with a `config.sortBy` within 400 characters after
    //     it — a neighbouring effect, a line of config below it — flips this
    //     green and announces a fix nobody made.
    // So each effect is read by BALANCING ITS OWN PARENTHESES, and it counts as
    // a re-sync only if it both reads the prop and writes the remembered value
    // back (`remember(` / `setSortBy(`). An effect that merely mentions
    // `config.sortBy` while doing something else is not the fix.
    const effects: string[] = []
    for (const m of frame.matchAll(/\buseEffect\s*\(/g)) {
      const open = frame.indexOf("(", m.index as number)
      let depth = 0
      for (let j = open; j < frame.length; j++) {
        if (frame[j] === "(") depth++
        else if (frame[j] === ")" && --depth === 0) {
          effects.push(frame.slice(open + 1, j))
          break
        }
      }
    }
    expect(
      effects.length,
      "no useEffect found in collection-frame.tsx at all — this canary has gone blind, teach it the frame's new shape rather than deleting it"
    ).toBeGreaterThan(0)
    const resyncsFromTheProp = effects.some(
      (e) => /config\.sortBy/.test(e) && /(remember\(|setSortBy\()/.test(e)
    )
    expect(
      seedsOnceFromConfig && !resyncsFromTheProp,
      "CollectionFrame no longer seeds its sort once from config — re-check UI-GAPS #22(b), the host table may be able to go"
    ).toBe(true)
  })
})
