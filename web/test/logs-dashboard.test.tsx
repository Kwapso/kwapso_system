// THE LOGS MODULE, 23 SEP 2026 — Aurora's four rulings, and what each one has
// to be true of afterwards:
//
//   1. "tabs: dahsbaord, entries."            → exactly two, Dashboard first
//                                                and the default.
//   2. "word is logs only"                    → four words became one.
//   3. "kind of work is what its related to"  → the split is by RELATED RECORD
//      …and, the same day, "on logs this        TYPE, never the free-text
//      kind of work shoudl not be manual,       `kind` column, and nobody is
//      but automatic to where it was            asked to type one.
//      creted…"
//   4. "implement everything you suggested    → six sections, no "running now",
//      for dashboard - exclude running now.     and a toolbar whose two filters
//      add toolbar w filters by person,         narrow EVERY section.
//      account."
//
// TWO KINDS OF TEST, and the split is deliberate. What the dashboard DRAWS is
// invisible to a source scan — a donut and a stack of bars are both "a chart",
// and a figure behind a hover and a figure printed at rest are the same words
// in the same file — so those suites MOUNT the real component over a real
// payload and read what a person would see, the same reasoning
// `accounts-dashboard-marks.test.tsx` gives one module over. What the WORDS are
// and what the DOOR groups by are facts about source, so those are read off
// disk: a render test cannot prove that no OTHER screen still says "Time log".
//
// HOW A HOVER IS PROVED WITHOUT A POINTER: the whole readout rides the hit
// area's accessible NAME (the component's own rule, so a screen reader and a
// sighted reader can never make two different claims), so it is asserted
// without driving a floating panel that only exists once a pointer is in it.

import * as React from "react"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { LogsDashboard as LogsDashboardData } from "@shared/types"

const HERE = dirname(fileURLToPath(import.meta.url))
const WEB = join(HERE, "..")
const ROOT = join(WEB, "..")
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8")

const holder = vi.hoisted(() => ({
  view: undefined as LogsDashboardData | undefined,
  key: "",
  fetched: [] as unknown[],
}))

vi.mock("@shared/web/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/web/store")>()
  return {
    ...actual,
    useCached: (key: string, fetcher: () => unknown) => {
      holder.key = key
      holder.fetched.push(fetcher)
      return { data: holder.view, error: undefined, refresh: () => {} }
    },
  }
})

import { LogsDashboard } from "@/components/work/logs-dashboard"

afterEach(cleanup)
beforeEach(() => {
  holder.key = ""
  holder.fetched = []
})

/** A WEEK WITH SOMETHING IN EVERY READING: four related types (so the donut has
 * four slices and its legend four rows), two people (so the bar rank is a rank
 * rather than one bar), a client AND our own work (so the no-client row has
 * something to be beside), and eight weeks with a real run in them. */
const FULL: LogsDashboardData = {
  thisWeekSeconds: 36000, // 10 h
  lastWeekSeconds: 28800, // 8 h  → +25%
  todaySeconds: 7200, // 2 h
  todayPeople: 2,
  quietLastWeek: 1,
  activePeople: 4,
  recordsTouched: 12,
  targets: [
    { targetTable: "stories", seconds: 72000 }, // 20 h
    { targetTable: "help", seconds: 36000 }, // 10 h
    { targetTable: "tasks", seconds: 18000 }, // 5 h
    { targetTable: "meetings", seconds: 18000 }, // 5 h
  ],
  weeks: [
    { weekStart: "2026-08-03", seconds: 3600 },
    { weekStart: "2026-08-10", seconds: 7200 },
    { weekStart: "2026-08-17", seconds: 10800 },
    { weekStart: "2026-08-24", seconds: 14400 },
    { weekStart: "2026-08-31", seconds: 18000 },
    { weekStart: "2026-09-07", seconds: 21600 },
    { weekStart: "2026-09-14", seconds: 28800 },
    { weekStart: "2026-09-21", seconds: 36000 },
  ],
  people: [
    {
      userId: "u1",
      userName: "Alex Rivera",
      seconds: 90000, // 25 h
      weekSeconds: [3600, 3600, 7200, 7200, 10800, 14400, 18000, 25200],
    },
    {
      userId: "u2",
      userName: "Bea Marín",
      seconds: 54000, // 15 h
      weekSeconds: [0, 3600, 3600, 7200, 7200, 7200, 10800, 10800],
    },
  ],
  accounts: [
    { accountId: "a1", accountName: "Bergman", seconds: 90000 }, // 25 h
    // OUR OWN WORK — a null account, a real row. See the component's own note.
    { accountId: null, accountName: null, seconds: 54000 }, // 15 h
  ],
  records: [
    {
      targetTable: "stories",
      targetId: "s1",
      targetRef: "BERG-S0412",
      targetLabel: "Dispatch rewrite",
      seconds: 54000, // 15 h
    },
    {
      targetTable: "tasks",
      targetId: "k1",
      targetRef: null,
      targetLabel: "Quarterly VAT return",
      seconds: 7200, // 2 h
    },
  ],
}

function show(
  view: LogsDashboardData | undefined = FULL,
  filter: { userId?: string; accountId?: string } = {}
): HTMLElement {
  holder.view = view
  return render(
    <LogsDashboard
      teamId="t1"
      lang="en"
      filter={filter}
      faceOf={(id) => ({ picture: null, name: id === "u1" ? "Alex Rivera" : "Bea Marín" })}
    />
  ).container
}

/* ═══════════════ 1 · THE TWO TABS, DASHBOARD FIRST AND DEFAULT ═══════════ */

describe("ruling 1 — 'tabs: dahsbaord, entries'", () => {
  const screenSrc = () => read("web/components/work/time-screen.tsx")

  it("declares EXACTLY two tabs, and Dashboard is the first of them", () => {
    const src = screenSrc()
    const at = src.indexOf("const tabs = [")
    expect(at, "could not find the Logs strip's own `const tabs = [` array").toBeGreaterThan(-1)
    const values = [...src.slice(at).matchAll(/\{\s*value:\s*([A-Z_]+)\s*,/g)].map((m) => m[1])
    expect(
      values.slice(0, 2),
      "the Logs strip's first two tabs are not Dashboard then Entries"
    ).toEqual(["DASHBOARD", "ENTRIES"])
    expect(
      values.length,
      `the Logs strip declares ${values.length} tabs. Aurora ruled EXACTLY two: ` +
        "\"tabs: dahsbaord, entries.\" Nothing else becomes a tab."
    ).toBe(2)
  })

  it("opens on Dashboard when the address carries no tab at all", () => {
    // Her standing rule, and the same sentence `default-tab-is-first.test.ts`
    // makes about the ticket strip: the leading tab is what a page with nothing
    // remembered lands on. Here it is one expression rather than a
    // `useRemembered` default, so the expression itself is what is read.
    const src = screenSrc()
    const resolved = src.match(/const logsTab\s*=\s*tab === ([A-Z_]+) \? \1 : ([A-Z_]+)/)
    expect(
      resolved,
      "could not find the Logs screen's own `logsTab` resolution — if it was reshaped, teach this test the new spelling rather than deleting it"
    ).not.toBeNull()
    expect(
      resolved?.[2],
      `a Logs URL with no \`tab\` lands on ${resolved?.[2]}, not on the leading tab`
    ).toBe("DASHBOARD")
  })

  it("drops `tab` from the address entirely when Dashboard is chosen", () => {
    expect(
      /onValueChange:\s*\(v\)\s*=>\s*go\(sectionPath,\s*v === DASHBOARD \? \{\} : \{ tab: v \}\)/.test(
        screenSrc()
      ),
      "pressing back onto Dashboard should leave no `tab` in the address, the same shape Accounts' own strip keeps"
    ).toBe(true)
  })
})

/* ═══════════════ 2 · EVERY SECTION, AND NO "RUNNING NOW" ═════════════════ */

describe("ruling 4 — the sections she asked for, and the one she excluded", () => {
  it("draws the four figures, each with the reading beside it", () => {
    show()
    expect(screen.getByText("Hours this week")).toBeTruthy()
    expect(screen.getByText("10")).toBeTruthy()
    // 36000 against 28800 is +25%, said as a sentence rather than a coloured
    // arrow — more hours is not good news and fewer is not bad news.
    expect(screen.getByText("25% more than last week")).toBeTruthy()

    expect(screen.getByText("Hours today")).toBeTruthy()
    expect(screen.getByText("2 people")).toBeTruthy()

    expect(screen.getByText("Logged nothing last week")).toBeTruthy()
    // THE DENOMINATOR IS PRINTED, NEVER IMPLIED. This door cannot see the
    // team's roster, so the figure is over the people it CAN see and the note
    // says which people those are. A bare "1" would be a claim about a roster
    // nothing here holds.
    expect(
      screen.getByText("of 4 who logged in the last eight weeks"),
      "the quiet-last-week figure does not name its own denominator"
    ).toBeTruthy()

    expect(screen.getByText("Records worked on")).toBeTruthy()
    expect(screen.getByText("12")).toBeTruthy()
  })

  it("draws all six sections she named", () => {
    show()
    for (const title of [
      "Where the hours went",
      "Hours a week, the last eight",
      "Who logged it",
      "Whose work it was",
      "What ate the most",
    ])
      expect(screen.getByText(title), `the "${title}" section is missing`).toBeTruthy()
  })

  it("draws NO 'running now' section — she excluded it by name", () => {
    const container = show()
    expect(
      /running now/i.test(container.textContent ?? ""),
      'the dashboard draws a "running now" section. Aurora excluded it: the header bar already carries every running timer on every screen.'
    ).toBe(false)
    // …and the source does not reach for the running-timers door either, which
    // is the half a rendered payload cannot show.
    expect(
      read("web/components/work/logs-dashboard.tsx").includes("runningTimers"),
      "the Logs dashboard reads the running-timers door"
    ).toBe(false)
  })

  it("hovering a week gives that week's hours AND who logged them", () => {
    show()
    // The readout rides the hit area's accessible name — see this file's
    // header. The last of the eight weeks is 36000s = 10 h, of which Alex put
    // in 25200s = 7 h and Bea 10800s = 3 h.
    // `formatDayMonth` is `toLocaleDateString(lang, {month:"short",day:"numeric"})`
    // — "Sep 21" in en. Matched loosely so a locale tweak does not fail this.
    const week = screen.getByRole("button", { name: /Sep 21|21 Sep/ })
    const said = week.getAttribute("aria-label") ?? ""
    expect(said, "the week's own hours are not in its readout").toContain("10 h")
    expect(said, "the week's readout does not name who logged it").toContain("Alex")
    expect(said).toContain("7 h")
    expect(said).toContain("Bea")
  })

  it("draws the top records with their reference and their title", () => {
    show()
    expect(screen.getByText("Dispatch rewrite")).toBeTruthy()
    expect(screen.getByText("BERG-S0412")).toBeTruthy()
    // A ref is NULLABLE on purpose — our own internal work has none — so the
    // title carries the row either way.
    expect(screen.getByText("Quarterly VAT return")).toBeTruthy()
  })

  it("puts no figure inside a card (R97: a count never gets its own card)", () => {
    show()
    expect(
      screen.getByText("Hours this week").closest('[data-slot="card"]'),
      "a figure on the Logs dashboard sits inside a card, which R97 forbids"
    ).toBeNull()
  })

  it("says one honest sentence when there is no time at all, never six empty pictures", () => {
    show({ ...FULL, recordsTouched: 0 })
    expect(screen.getByText("No time logged yet.")).toBeTruthy()
    expect(screen.queryByText("Where the hours went")).toBeNull()
  })
})

/* ═══════════════ 3 · THE DONUT GROUPS BY THE RELATED RECORD TYPE ═════════ */

describe("ruling 3 — 'kind of work is what its related to'", () => {
  it("names the four RELATED RECORD TYPES in the donut's legend", () => {
    show()
    for (const word of ["Story", "Ticket", "Task", "Meeting"])
      expect(
        screen.getAllByText(word).length,
        `the donut's legend does not name "${word}"`
      ).toBeGreaterThan(0)
  })

  it("shows each slice's hours and share on hover, and the legend at rest", () => {
    show()
    // Stories is 72000s of 144000s: 20 h, 50%.
    const slice = screen.getByRole("button", { name: /^Story · / })
    expect(slice.getAttribute("aria-label")).toContain("20 h")
    expect(slice.getAttribute("aria-label")).toContain("50%")
  })

  it("reads `targets` and never the free-text `kind` column", () => {
    // THE HALF A RENDER CANNOT SHOW. `WorkLogSummary.kinds` still exists on the
    // wire (the column and its data survive, Aurora's own instruction), so the
    // only thing standing between this donut and the old grouping is that
    // nothing here reads it.
    const src = read("web/components/work/logs-dashboard.tsx")
    expect(src.includes("data.targets"), "the donut is not built from `targets`").toBe(true)
    expect(
      /\bkinds\b/.test(src),
      "the Logs dashboard reads the free-text `kinds` breakdown. Aurora's ruling: the kind of work IS the related record type."
    ).toBe(false)
  })

  it("the DOOR groups by `target_table`, not by `kind`", () => {
    const src = read("workers/content/src/lib/work-logs.ts")
    const at = src.indexOf("export async function logsDashboard(")
    expect(at, "could not find the `logsDashboard` door").toBeGreaterThan(-1)
    const body = src.slice(at)
    expect(
      body.includes("GROUP BY w.target_table ORDER BY s DESC"),
      "the dashboard door does not group the hours by the related record type"
    ).toBe(true)
    expect(
      /GROUP BY w\.kind\b/.test(body),
      "the dashboard door groups by the free-text `kind` column"
    ).toBe(false)
  })

  it("nobody is asked to type a kind any more, on the log form or the correction", () => {
    // Her sharpening the same day: "on logs this kind of work shoudl not be
    // manual, but automatic to where it was created". One dialog serves both
    // the new entry and the correction, so one file answers for both.
    const src = read("web/components/work/time-form-dialog.tsx")
    expect(
      /kindField|id="time-kind"/.test(src),
      "the log form still asks somebody to type a kind of work"
    ).toBe(false)
    expect(
      /kind:\s*values\.kind/.test(src),
      "the log form still sends a typed kind to the door"
    ).toBe(false)
  })

  it("keeps the column and its stored data — this is a screen change, not a migration", () => {
    const lib = read("workers/content/src/lib/work-logs.ts")
    // The meetings door's own constant still exists and the `meetingTime`
    // filter still reads it, which is the whole reason the column stays.
    expect(lib.includes('export const MEETING_LOG_KIND = "Meeting"')).toBe(true)
    expect(lib.includes("filter.meetingTime")).toBe(true)
    // …and a correction that sends no kind falls back to the stored one, so a
    // row that already carries a typed word keeps it.
    expect(lib.includes("input.kind ?? before.kind")).toBe(true)
  })
})

/* ═══════════════ 4 · THE CLIENT SECTION, INCLUDING OUR OWN WORK ══════════ */

describe("'whose work it was' — the section `account_id` never had", () => {
  it("draws one bar per client", () => {
    show()
    const rank = screen.getByRole("list", { name: "Whose work it was" })
    expect(rank.textContent).toContain("Bergman")
    expect(rank.textContent).toContain("25 h")
  })

  it("draws OUR OWN WORK as its own row, never a dropped one", () => {
    show()
    const rank = screen.getByRole("list", { name: "Whose work it was" })
    expect(
      rank.textContent,
      "the no-client pile is missing. A log inherits its client from what it was logged against, and our own admin belongs to none — omitting it draws the billable half as if it were the whole."
    ).toContain("Our own work")
    expect(rank.textContent).toContain("15 h")
  })

  it("keeps the hours of a client whose own record has gone quiet", () => {
    // `accountName` is null when the account row has since been deactivated or
    // archived. The hours still count; only the name is missing.
    show({
      ...FULL,
      accounts: [{ accountId: "gone", accountName: null, seconds: 36000 }],
    })
    const rank = screen.getByRole("list", { name: "Whose work it was" })
    expect(rank.textContent).toContain("An account")
    expect(rank.textContent).toContain("10 h")
    expect(
      rank.textContent,
      "a nameless client was drawn as our own work, which is a different pile entirely"
    ).not.toContain("Our own work")
  })
})

/* ═══════════════ 5 · THE TOOLBAR'S TWO FILTERS NARROW EVERY SECTION ══════ */

describe("ruling 4 — 'add toolbar w filters by person, account'", () => {
  it("carries BOTH filters into the one door read every section is drawn from", () => {
    show(FULL, { userId: "u1", accountId: "a1" })
    // ONE read, so there is nowhere for two sections to disagree: the key is
    // the cache entry and the filters are IN it, which is what stops picking a
    // person and then a client from painting the first question's figures under
    // the second question's toolbar.
    expect(holder.key).toBe("logs-dashboard:t1:u1:a1")
    expect(holder.fetched.length, "the dashboard makes more than one door read").toBe(1)
  })

  it("asks a different question under a different filter", () => {
    show(FULL, { userId: "u1" })
    const one = holder.key
    cleanup()
    show(FULL, { accountId: "a1" })
    expect(
      holder.key === one,
      "two different narrowings share one cache key, so one would be served the other's answer"
    ).toBe(false)
  })

  it("narrows MORE THAN ONE section — every figure and every picture comes off that one payload", () => {
    // The proof that a filter reaches every section is that there is only ONE
    // payload: change it and everything moves together. A filter that narrowed
    // one section would need a second read, and the test above pins that there
    // is not one.
    show(
      {
        ...FULL,
        thisWeekSeconds: 3600,
        recordsTouched: 1,
        targets: [{ targetTable: "help", seconds: 3600 }],
        accounts: [{ accountId: "a1", accountName: "Bergman", seconds: 3600 }],
        people: [{ userId: "u1", userName: "Alex Rivera", seconds: 3600, weekSeconds: [0, 0, 0, 0, 0, 0, 0, 3600] }],
      },
      { accountId: "a1" }
    )
    // the figures moved…
    expect(screen.getByText("Records worked on").parentElement?.textContent).toContain("1")
    expect(screen.getByText("Hours this week").parentElement?.textContent).toContain("1")
    // …the donut moved (Story is gone, Ticket is the whole ring)…
    expect(screen.queryByRole("button", { name: /^Story · / })).toBeNull()
    // …and the client section moved with them.
    const rank = screen.getByRole("list", { name: "Whose work it was" })
    expect(rank.textContent).not.toContain("Our own work")
  })

  it("declares both facets through the shared toolbar's own facet table", () => {
    // Her instruction was to DECLARE the facets, never to build a second
    // filter control. Both names are the door's own query parameters.
    const filters = read("web/lib/collection-filters.ts")
    const at = filters.indexOf("workLogs: [")
    expect(at).toBeGreaterThan(-1)
    const block = filters.slice(at, filters.indexOf("],", at))
    expect(block.includes('field: "userId"')).toBe(true)
    expect(block.includes('field: "accountId"')).toBe(true)

    const src = read("web/components/work/time-screen.tsx")
    expect(src.includes("useFilterBar"), "the Logs toolbar does not use the shared filter seam").toBe(true)
    expect(
      /translatedFacets\("workLogs"/.test(src),
      "the Logs toolbar builds its own facets instead of declaring them through the shared table"
    ).toBe(true)
  })

  it("the DOOR parses `accountId`, so the filter is answered over the whole collection", () => {
    const route = read("workers/content/src/routes/work-logs.ts")
    expect(
      /accountId:\s*queryText\(url\.searchParams\.get\("accountId"\)/.test(route),
      "the work-logs door does not parse `accountId`, so the account filter would narrow nothing"
    ).toBe(true)
    const lib = read("workers/content/src/lib/work-logs.ts")
    expect(lib.includes('parts.push("w.account_id = ?")')).toBe(true)
  })
})

/* ═══════════════ 6 · "WORD IS LOGS ONLY" ════════════════════════════════ */

describe("ruling 2 — one concept, one word", () => {
  it("the glossary term is Log", () => {
    const g = read("shared/glossary.ts")
    expect(
      /workLog:\s*\{\s*term:\s*"Log"/.test(g),
      'the glossary still calls it something other than "Log"'
    ).toBe(true)
  })

  it("the Home tile says Logs", () => {
    const home = read("web/components/screens/home-screen.tsx")
    expect(home.includes('title: t("Logs")'), "the Home tile does not say Logs").toBe(true)
    expect(
      home.includes('t("Work logs")'),
      'the Home tile still says "Work logs"'
    ).toBe(false)
  })

  it("the rail destination says Logs", () => {
    const pages = read("web/lib/pages.ts")
    expect(/key: "time", title: "Logs"/.test(pages)).toBe(true)
  })

  it("the section on a story, a ticket and a task says Logs", () => {
    const effort = read("web/components/work/effort-card.tsx")
    expect(effort.includes('t("Logs")'), "the Effort card's title does not say Logs").toBe(true)
    expect(
      effort.includes('t("Time log")'),
      'the record section still says "Time log" — this reverses B0386 of 22 Sep 2026, and Aurora\'s ruling is the newer one'
    ).toBe(false)
  })

  it("no screen either front door draws still says 'Work logs' or 'Time log'", () => {
    // THE EXCEPTION IS PAID, 23 Sep 2026. This test used to name ONE survivor
    // — the meeting detail's own time panel — because another lane owned
    // `web/components/meetings/**` and could not be reached from here. That
    // lane has since moved it to `t("Logs")` as part of the meeting's
    // one-page rebuild, so the list is empty and this test is the tighter one
    // its own previous message asked for.
    const MEETINGS = "web/components/meetings/meeting-detail.tsx"
    const strings: string[] = JSON.parse(read("shared/i18n-strings.json"))
    const left = strings.filter((s) => /\bWork logs?\b|\bTime log\b/.test(s))
    expect(
      left,
      `these user-visible sentences still use a retired word: ${left.join(", ")}`
    ).toEqual([])
    expect(
      read(MEETINGS).includes('t("Time log")'),
      "the meeting detail must not reintroduce the retired word"
    ).toBe(false)
    expect(
      read(MEETINGS).includes('title={t("Logs")}'),
      "…and its own section says Logs, like every other surface"
    ).toBe(true)
  })
})

/* ═══════════════ 7 · THE LEGEND'S COLOURS ARE THE RING'S ═════════════════ */

describe("the donut's legend cannot drift from its own ring", () => {
  it("restates the kit's own segment sequence, in the same order", () => {
    // The kit does not export `SEGMENT_COLOURS`, so the sequence is restated
    // rather than reached for privately across a module boundary that was never
    // made public — the identical decision `accounts-dashboard.tsx` documents.
    // A colour key that has drifted from its own ring is worse than no key.
    const seq = (src: string, name: string) => {
      const at = src.indexOf(name)
      expect(at, `could not find ${name}`).toBeGreaterThan(-1)
      return [...src.slice(at, src.indexOf("]", at)).matchAll(/var\(--chart-\d\)/g)].map((m) => m[0])
    }
    const kit = seq(read("shared/ui/components/donut/donut.tsx"), "const SEGMENT_COLOURS = [")
    const ours = seq(read("web/components/work/logs-dashboard.tsx"), "const DONUT_SEGMENT_COLOURS = [")
    expect(kit.length).toBeGreaterThan(0)
    expect(ours, "the legend's dots no longer read the same sequence the ring does").toEqual(kit)
  })
})
