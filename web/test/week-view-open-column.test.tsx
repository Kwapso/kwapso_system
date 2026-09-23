// THE WEEK VIEW IS AN OPEN COLUMN — Aurora's chosen redesign, 23 Sep 2026,
// variation One.
//
// ── THE THREE RULINGS ─────────────────────────────────────────────────────
//
//   1 · THE DAY HEAD LOSES ITS FILLED PILL. Verbatim: *"you invented the
//       color of the 'not today' days"*. A day head was `bg-muted` under
//       tier-3 ink, and today `bg-surface-inverse` under on-inverse ink.
//       Both are real kit tokens, so this was never a palette breach — what
//       was never ruled is that a day should be a filled BOX at all. It is
//       plain text now: the weekday, the date number and the day's COUNT, in
//       tier-3 ink; TODAY is the only one in full ink, marked by a RULE under
//       it rather than a fill.
//
//   2 · "+N more" GOES; THE DAY SHOWS EVERYTHING. Verbatim: *"also what is
//       this 'show more'? should show all."* No cap, no overflow chip, no
//       day dialog in this component. The month grid's own "+N more" is a
//       different component with its own copy and is deliberately untouched.
//
//   3 · THE CARD CARRIES THE APP AND THE ACCOUNT, AS CHIPS. Her example was
//       a meeting: beside the faces she wants the app or account chip. Above
//       the title (R65), in R94's fixed order — app is the main parent, the
//       account the secondary — and truncating, so a long client name
//       ellipses inside the column instead of stretching it.
//
// ── WHY A RENDER AND NOT A SOURCE CENSUS ──────────────────────────────────
//
// Every one of these is a statement about what is DRAWN. The department line
// this same card gained a day earlier was computed on every render and
// dropped on the floor for a week (`tasks-agenda-department.test.tsx`'s own
// header) precisely because a static census reads what a file SAYS. So this
// mounts the component.
//
// THE DESKTOP GRID AND THE PHONE PAGER ARE BOTH IN THE TREE AT ONCE — this
// component switches with CSS and never with a device branch — so a card is
// found more than once by design, and every copy has to be right. Assertions
// that can loop, loop.
//
// ── WHAT THIS FILE DELIBERATELY DOES NOT RE-ASSERT ────────────────────────
//
// The department line (`tasks-agenda-department.test.tsx`) and the faces row
// (`meetings-rulings.test.tsx`) are two other lanes' laws and are proved
// there. This file asserts only that the new chips did not DISPLACE them —
// the three still draw together on one card, in their ruled order.

import { cleanup, render, screen } from "@testing-library/react"
import * as React from "react"
import { afterEach, describe, expect, it } from "vitest"

import { LanguageProvider } from "@shared/web/language"
import { RecordWeek } from "@/components/records/record-week"
import type { CalendarEntry } from "@/components/records/record-calendar"

afterEach(cleanup)

const wrap = (node: React.ReactNode) =>
  render(<LanguageProvider value={null}>{node}</LanguageProvider>)

/** Today, as this component's own `dayKeyOf` writes it — LOCAL, never
 *  `toISOString()`, which is UTC and lands a card on the wrong side of
 *  midnight east of Greenwich (the component's own note). */
const pad = (n: number) => String(n).padStart(2, "0")
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const TODAY = dayKey(new Date())

/** A weekday inside the same week as today that is NOT today — so "today is
 *  the only one in ink" has something to be the only one against. Monday
 *  unless today is Monday, in which case Tuesday. */
function otherDayThisWeek(): string {
  const now = new Date()
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7))
  const first = dayKey(monday)
  if (first !== TODAY) return first
  return dayKey(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 1))
}

const entry = (over: Partial<CalendarEntry> & { id: string }): CalendarEntry => ({
  day: TODAY,
  title: `Entry ${over.id}`,
  ...over,
})

/** Every day head in the tree. The head is the one node in a column that
 *  carries a tabular count and is not a card. */
function heads(): HTMLElement[] {
  return [...document.querySelectorAll("div")].filter(
    (el) =>
      el.className.includes("tabular-nums") === false &&
      el.querySelector(".tabular-nums") !== null &&
      el.closest('[data-slot="card"]') === null &&
      el.className.includes("items-baseline")
  ) as HTMLElement[]
}

describe("1 · the day head is plain text, never a filled box", () => {
  it("no day head paints a fill — not the invented grey, not the inverse", () => {
    wrap(<RecordWeek weekOf={TODAY} entries={[entry({ id: "a" })]} />)
    const all = heads()
    expect(all.length, "the week draws day heads at all").toBeGreaterThan(0)
    for (const head of all) {
      expect(
        head.className,
        `a day head still paints a fill: "${head.className}". Aurora, 23 Sep 2026: ` +
          '"you invented the color of the \'not today\' days". A head is text now, not a box.'
      ).not.toMatch(/\bbg-/)
      expect(head.className, "…and it is not a pill either").not.toMatch(/rounded-pill/)
    }
  })

  it("today is the ONE head in full ink, and it is marked by a rule, not a fill", () => {
    const other = otherDayThisWeek()
    wrap(<RecordWeek weekOf={TODAY} entries={[entry({ id: "a" }), entry({ id: "b", day: other })]} />)
    const all = heads()
    const inInk = all.filter((h) => h.className.includes("text-foreground"))
    const quiet = all.filter((h) => h.className.includes("text-ink-tertiary"))
    expect(inInk.length, "today's head, on both breakpoints, is the only one in full ink").toBeGreaterThan(0)
    expect(quiet.length, "every other day stays at tier-3 ink").toBeGreaterThan(0)
    for (const head of inInk) {
      expect(
        head.className,
        "today is marked by a RULE under it — one edge, the kit's own `--hairline-under-strong` " +
          "(RULES.md §2.8 blesses a separator and forbids a box)"
      ).toMatch(/shadow-\[var\(--hairline-under-strong\)\]/)
    }
    for (const head of quiet) {
      expect(head.className, "an ordinary day carries no rule and no fill").not.toMatch(
        /shadow-\[var\(--hairline/
      )
    }
  })

  it("the head prints the day's count, zero included", () => {
    const other = otherDayThisWeek()
    wrap(
      <RecordWeek
        weekOf={TODAY}
        entries={[entry({ id: "a" }), entry({ id: "b" }), entry({ id: "c", day: other })]}
      />
    )
    const counts = heads().map((h) => (h.lastElementChild as HTMLElement | null)?.textContent ?? "")
    expect(counts, "a day with two entries says 2").toContain("2")
    expect(counts, "a day with one says 1").toContain("1")
    expect(counts, "and an empty day says 0 rather than leaving a reader guessing").toContain("0")
  })
})

describe("2 · the day shows everything it has — no cap, no '+N more'", () => {
  it("renders every entry of a heavy day, well past the old cap of three", () => {
    const many = Array.from({ length: 9 }, (_, i) => entry({ id: `m${i}`, title: `Meeting ${i}` }))
    wrap(<RecordWeek weekOf={TODAY} entries={many} />)
    for (const e of many) {
      expect(
        screen.getAllByText(e.title as string).length,
        `${e.title} is drawn. Aurora: "also what is this 'show more'? should show all."`
      ).toBeGreaterThan(0)
    }
  })

  it("draws no overflow chip and opens no day dialog, at any length", () => {
    wrap(<RecordWeek weekOf={TODAY} entries={Array.from({ length: 12 }, (_, i) => entry({ id: `x${i}` }))} />)
    expect(
      document.body.textContent,
      "the '+N more' fold is gone from the week entirely"
    ).not.toMatch(/\+\d+ more/)
    expect(
      document.querySelector('[role="dialog"]'),
      "and the day dialog it used to open goes with it"
    ).toBeNull()
  })
})

describe("3 · the card carries the app and the account as chips", () => {
  const rich = entry({
    id: "k",
    title: "Kickoff",
    time: "09:30",
    detail: "Design",
    appName: "Handover",
    accountName: "Northwind Trading Company",
    faces: [{ key: "ana", name: "Ana Ruiz" }],
  })

  it("draws both chips, app before account (R94's fixed order)", () => {
    wrap(<RecordWeek weekOf={TODAY} entries={[rich]} />)
    const title = screen.getAllByText("Kickoff")[0]
    const card = title.closest('[data-slot="card"]') as HTMLElement
    const chips = [...card.querySelectorAll('[data-slot="badge"]')] as HTMLElement[]
    expect(chips.map((c) => c.textContent), "the app and the account, both drawn").toEqual([
      "Handover",
      "Northwind Trading Company",
    ])
  })

  it("puts them ABOVE the title — R65, the chip sits above the title", () => {
    wrap(<RecordWeek weekOf={TODAY} entries={[rich]} />)
    for (const title of screen.getAllByText("Kickoff")) {
      const card = title.closest('[data-slot="card"]') as HTMLElement
      const chip = card.querySelector('[data-slot="badge"]') as HTMLElement
      expect(
        title.compareDocumentPosition(chip) & Node.DOCUMENT_POSITION_PRECEDING,
        'R65 — "on a card that stands for a record, the chip sits above the title"'
      ).toBeTruthy()
    }
  })

  it("truncates rather than widening — a long client name may not stretch the column", () => {
    wrap(<RecordWeek weekOf={TODAY} entries={[rich]} />)
    const card = screen.getAllByText("Kickoff")[0].closest('[data-slot="card"]') as HTMLElement
    for (const chip of [...card.querySelectorAll('[data-slot="badge"]')] as HTMLElement[]) {
      expect(chip.className, "the card caps the chip at its own width").toMatch(/max-w-full/)
      const inner = chip.firstElementChild as HTMLElement
      expect(inner?.className, "and the name inside it ellipses").toMatch(/truncate/)
    }
  })

  it("a record with neither name draws no chip row at all — never an empty lozenge", () => {
    wrap(<RecordWeek weekOf={TODAY} entries={[entry({ id: "bare", title: "Bare" })]} />)
    const card = screen.getAllByText("Bare")[0].closest('[data-slot="card"]') as HTMLElement
    expect(card.querySelector('[data-slot="badge"]'), "no name, no chip").toBeNull()
  })

  it("does not displace the department line or the faces row — all three draw together", () => {
    wrap(<RecordWeek weekOf={TODAY} entries={[rich]} />)
    const title = screen.getAllByText("Kickoff")[0]
    const card = title.closest('[data-slot="card"]') as HTMLElement
    // The other two lanes' own laws, asserted here only as "still present and
    // still after the title" — each is proved properly in its own file.
    const department = [...card.querySelectorAll("span")].find((s) => s.textContent === "Design")
    expect(department, "the department line survives the chips (tasks-agenda-department)").toBeTruthy()
    const faces = card.querySelector('[data-slot="people-faces-row"]')
    expect(faces, "the faces row survives the chips (meetings-rulings)").toBeTruthy()
    expect(
      title.compareDocumentPosition(department as HTMLElement) & Node.DOCUMENT_POSITION_FOLLOWING,
      "the department is still UNDER the title"
    ).toBeTruthy()
    expect(
      title.compareDocumentPosition(faces as HTMLElement) & Node.DOCUMENT_POSITION_FOLLOWING,
      'the faces are still "after title" — her own word'
    ).toBeTruthy()
  })
})
