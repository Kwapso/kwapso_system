// AURORA'S FIVE MEETINGS RULINGS, 23 SEP 2026 — one suite, five blocks, her
// own words at the head of each.
//
//   a · "meetings: remove agenda view."
//   b · "meetings week view, show the avatars on whos in the meeting after
//        title"
//   c · "meetings detail: button join (rename to only join) move it to title,
//        also move Google Calendar (rename it to only this) to title"
//   d · "on meetings: rmeove notes (we have transcript for that)"
//   e · "for meeting: agenda as open field shoudl only be befor eor during
//        meeting. when end is in the past can only be edited on edit screen"
//
// WHAT IS PROVED BY RENDERING AND WHAT IS PROVED OFF THE DISK, and why the
// split falls where it does. (b) and (e) are DRAWINGS — a face after a title,
// an editor that is there or is not — so they are mounted and read out of the
// real DOM. (a), (c) and (d) are ABSENCES and PLACEMENTS: "this option is not
// in the switcher", "these two buttons are in the title's own actions node",
// "no screen in this module offers to type a note". A render can show one
// screen in one state; a census off the source shows the module. Both halves
// of (c) get both treatments — the words and the placement are read out of
// `meeting-detail.tsx`, and the kit's own `Title` is then mounted with the
// same node to prove where `actions` actually lands.
//
// NO LINE NUMBERS ANYWHERE. Every slice below is keyed on a marker string the
// file itself carries (this repo's own `never-key-an-exemption-by-line`), so
// an edit above a block cannot rot the key.

import { cleanup, render, screen } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"

import { stripComments } from "@shared/rules/source-scan"
import { LanguageProvider } from "@shared/web/language"
import { Title } from "@shared/ui/components/title/title"
import { RecordWeek } from "@/components/records/record-week"
import type { CalendarEntry } from "@/components/records/record-calendar"
import {
  MeetingAgendaSection,
  agendaIsOpenField,
  meetingEndMs,
} from "@/components/meetings/meeting-detail"
import type { Meeting } from "@shared/types"

afterEach(cleanup)

const ROOT = join(__dirname, "..", "..")
const read = (p: string) => readFileSync(join(ROOT, ...p.split("/")), "utf8")

const MEETINGS_SCREEN = "web/components/meetings/meetings-screen.tsx"
const MEETING_DETAIL = "web/components/meetings/meeting-detail.tsx"
const MEETING_FORM = "web/components/meetings/meeting-form-dialog.tsx"

/** The file with its prose taken out — every census below that asks whether a
 * NAME is gone has to read the code, because this module's own comments quote
 * the very words being removed (they carry Aurora's rulings verbatim and say
 * what each one replaced). A plain substring search would trip over the
 * explanation of its own change. */
const code = (p: string) => stripComments(read(p))

/** Everything between two markers the file itself carries. Both are asserted
 * present first, so a renamed marker fails loudly instead of slicing an empty
 * string that every `not.toMatch` below would pass against. */
function between(src: string, from: string, to: string): string {
  const start = src.indexOf(from)
  const end = src.indexOf(to, start + from.length)
  expect(start, `the marker ${JSON.stringify(from)} is still in the file`).toBeGreaterThan(-1)
  expect(end, `the marker ${JSON.stringify(to)} still follows it`).toBeGreaterThan(start)
  return src.slice(start, end)
}

// `value` is `SessionUser.language` — null for somebody who never chose, which
// is what a test reader is. English, so every assertion below reads the same
// words this file is written in.
const wrap = (node: React.ReactNode) =>
  render(<LanguageProvider value={null}>{node}</LanguageProvider>)

/* ═══════════════════════════════════════════════════════════════════════════
   a · "meetings: remove agenda view."
   ═══════════════════════════════════════════════════════════════════════════ */

describe('a · the Agenda VIEW is gone from the meetings switcher', () => {
  const src = read(MEETINGS_SCREEN)

  it("the view switcher offers no Agenda option on any tab", () => {
    // `viewSlot` is the ONE place this screen names its views (R53 — the row
    // builds its own control from a config, so there is nowhere else a view
    // could be declared). Sliced by its own declaration and the assignment
    // that follows it.
    const slot = between(src, "const viewSlot: ToolbarViewSlot = {", "\n  return (")
    expect(slot).toMatch(/value: "calendar"/)
    expect(slot).toMatch(/value: "week"/)
    expect(slot).toMatch(/value: "list"/)
    expect(slot, "no tab may still offer an Agenda view").not.toMatch(/value: "agenda"/)
    expect(slot, "…and the word itself is gone from the switcher").not.toMatch(/t\("Agenda"\)/)
  })

  it("This week's remembered view slot cannot hold or revive `agenda`", () => {
    const remembered = between(src, 'const [weekMode, setWeekMode] = useRemembered<', '"meeting-view-mine"')
    // The union, the default and the revive guard all move together or the
    // removal is only half done: a union that still admits "agenda" would
    // typecheck a branch nothing draws, and a revive that still accepts it
    // would strand a returning reader on a view with no body.
    expect(remembered).toContain('"calendar" | "week" | "list"')
    expect(remembered).not.toContain('"agenda"')
  })

  it("the body switch has no agenda branch and the shaper is gone", () => {
    const body = code(MEETINGS_SCREEN)
    expect(body, "no `mode === \"agenda\"` branch is left to render").not.toMatch(
      /mode === "agenda"/
    )
    expect(body, "the MeetingsAgenda shaper is deleted, not merely unreferenced").not.toMatch(
      /function MeetingsAgenda\b/
    )
    expect(body, "…and nothing renders it").not.toMatch(/<MeetingsAgenda\b/)
  })

  it("the screen no longer imports RecordAgenda or AgendaEntry", () => {
    // Checked as an IMPORT, not a bare word: this file's own header explains
    // in prose why the Agenda view went, and a substring search would trip
    // over its own explanation.
    const imports = src
      .split("\n")
      .filter((l) => l.trimStart().startsWith("import "))
      .join("\n")
    expect(imports).not.toMatch(/\bRecordAgenda\b/)
    expect(imports).not.toMatch(/\bAgendaEntry\b/)
    // The host itself is untouched — the one-calendar law is about who MAY
    // reach the kit's Agenda, not about who currently does.
    expect(read("web/components/records/record-calendar.tsx")).toMatch(/export function RecordAgenda/)
  })

  it("the meeting's own agenda FIELD is untouched — this removed a view, not data", () => {
    expect(read(MEETING_FORM), "the edit form still has its Agenda field").toMatch(/agendaField/)
    expect(read(MEETING_DETAIL), "the record still draws its agenda").toMatch(
      /MeetingAgendaSection/
    )
  })
})

/* ═══════════════════════════════════════════════════════════════════════════
   b · "meetings week view, show the avatars on whos in the meeting after
        title"
   ═══════════════════════════════════════════════════════════════════════════ */

const WEEK_DAY = "2026-09-23"

function weekEntry(over: Partial<CalendarEntry> = {}): CalendarEntry {
  return {
    id: "m1",
    day: WEEK_DAY,
    title: "Kickoff with Northwind",
    time: "09:30",
    ...over,
  }
}

describe("b · the week view draws who is in the meeting, after the title", () => {
  it("renders one face per person, after the title node, inside the same card", () => {
    wrap(
      <RecordWeek
        weekOf={WEEK_DAY}
        entries={[
          weekEntry({
            faces: [
              { key: "ana@northwind.test", name: "Ana Ruiz" },
              { key: "bo@northwind.test", name: "Bo Meyer" },
            ],
          }),
        ]}
      />
    )
    // The desktop grid and the phone pager are BOTH in the tree at once (this
    // component switches with CSS, never a device branch), so the card is
    // found more than once by design — every copy has to be right.
    const titles = screen.getAllByText("Kickoff with Northwind")
    expect(titles.length).toBeGreaterThan(0)
    for (const title of titles) {
      const card = title.closest('[data-slot="card"]') as HTMLElement
      expect(card, "the title still sits inside a week card").toBeTruthy()
      const row = card.querySelector('[data-slot="people-faces-row"]') as HTMLElement
      expect(row, "the card draws the shared face row").toBeTruthy()
      expect(row.children.length, "one face per person on the invitation").toBe(2)
      const marks = [...row.children] as HTMLElement[]
      // AFTER THE TITLE — her word. Read as real document order rather than as
      // a class name, so a future layout change that puts the faces above the
      // title fails here even if every other assertion still passes.
      expect(
        title.compareDocumentPosition(marks[0]) & Node.DOCUMENT_POSITION_FOLLOWING,
        "the faces follow the title in the card"
      ).toBeTruthy()
    }
  })

  it("draws nothing at all when nobody is on the invitation", () => {
    wrap(<RecordWeek weekOf={WEEK_DAY} entries={[weekEntry({ faces: [] })]} />)
    const title = screen.getAllByText("Kickoff with Northwind")[0]
    const card = title.closest('[data-slot="card"]') as HTMLElement
    expect(card.querySelector('[data-slot="people-faces"]'), "no faces, no row at all").toBeNull()
  })

  it("caps the row at three faces and says how many more — the meetings table's own shape", () => {
    wrap(
      <RecordWeek
        weekOf={WEEK_DAY}
        entries={[
          weekEntry({
            faces: ["ana", "bo", "cy", "dee", "eve"].map((n) => ({ key: n, name: n })),
          }),
        ]}
      />
    )
    const title = screen.getAllByText("Kickoff with Northwind")[0]
    const card = title.closest('[data-slot="card"]') as HTMLElement
    const row = card.querySelector('[data-slot="people-faces-row"]') as HTMLElement
    expect(row.children.length).toBe(3)
    expect(card.textContent).toContain("+2")
  })

  it("it is ONE component, shared with the meetings table's Attendees column", () => {
    // The whole point of extracting `PeopleFaces` — two hand-rolled rows that
    // agree today drift the first time either is touched. Both call sites
    // must reach the same module.
    expect(read("web/components/records/record-week.tsx")).toMatch(
      /from "@shared\/web\/people-faces"/
    )
    expect(read("web/components/deep-link/shape.tsx")).toMatch(
      /from "@shared\/web\/people-faces"/
    )
    expect(read("web/components/deep-link/shape.tsx")).toMatch(/<PeopleFaces\b/)
  })

  it("the meetings screen feeds it the guest list, rooms subtracted", () => {
    const src = read(MEETINGS_SCREEN)
    const week = between(src, "function MeetingsWeek({", "/** ONE SHAPED MEETING ROW")
    expect(week).toMatch(/faces:/)
    // A meeting ROOM is on Google's attendee list and is not a person — the
    // same subtraction the table's own cell and the meeting's own screen make.
    expect(week).toMatch(/\.filter\(\(g\) => !g\.resource\)/)
  })
})

/* ═══════════════════════════════════════════════════════════════════════════
   c · "button join (rename to only join) move it to title, also move Google
        Calendar (rename it to only this) to title"
   ═══════════════════════════════════════════════════════════════════════════ */

describe("c · Join and Google Calendar sit in the record's own title row", () => {
  const src = read(MEETING_DETAIL)
  const actions = between(src, "      actions={\n", "      panelVisible={false}")

  it("both buttons are declared inside the `actions` node", () => {
    expect(actions).toMatch(/t\("Join"\)/)
    // SHORTENED AGAIN 24 Sep 2026, her own second pass: "rename google
    // calendar to just 'calendar'". `meeting-one-page.test.tsx` holds the
    // assertion that both retired labels are gone from the file.
    expect(actions).toMatch(/t\("Calendar"\)/)
    expect(actions).toMatch(/item\.googleJoinUrl/)
    expect(actions).toMatch(/item\.googleEventUrl/)
  })

  it("the labels are EXACTLY her two words — the old ones are gone from the file", () => {
    const body = code(MEETING_DETAIL)
    expect(body, '"Join the call" is renamed, not kept beside the new label').not.toContain(
      "Join the call"
    )
    expect(body, '"Open in Google Calendar" is renamed too').not.toContain(
      "Open in Google Calendar"
    )
  })

  it("nothing else on the record draws a second copy of either", () => {
    // The Calendar TAB that used to draw both is deleted outright with the
    // one-page ruling (`meeting-one-page.test.tsx` proves that), so the
    // question is now the stronger one: each of these two urls is READ in
    // exactly two places on this screen, the wide actions row and the fold,
    // and nowhere else.
    const body = code(MEETING_DETAIL)
    // Two SITES each — the wide actions row and the fold menu — and each site
    // reads its url twice (the guard, then the href), so four reads apiece is
    // exactly two places. A fifth would be a third site.
    expect((body.match(/item\.googleJoinUrl/g) ?? []).length, "Join: the row and the fold").toBe(4)
    expect(
      (body.match(/item\.googleEventUrl/g) ?? []).length,
      "Google Calendar: the row and the fold"
    ).toBe(4)
    expect(body, "and no CalendarPanel is left to draw a third").not.toMatch(
      /function CalendarPanel\b/
    )
  })

  it("they are still reachable below the fold, in the one '…' trigger", () => {
    const folded = between(src, "const foldedActions: HeadActionItem[] = [", "\n  return (")
    expect(folded).toMatch(/key: "join"/)
    expect(folded).toMatch(/key: "google-calendar"/)
    // The KEY is a stable identifier and deliberately not renamed with the
    // label — nothing a person reads, and moving it would churn a menu item's
    // identity for a word change.
    expect(folded).toMatch(/label: t\("Calendar"\)/)
  })

  // ── THE LAW, CITED AND OBEYED ──────────────────────────────────────────────
  // R52 (`record-heading.tsx`, RULES.md): every path that draws a record
  // detail wears `RECORD_TITLE_TREATMENT`, the title/actions split that keeps
  // a long name from pushing the buttons onto a second line. R100: the head's
  // action row is `items-center`, so a control sits on the title's own line
  // box. Neither is something this screen re-implements — it obeys them by
  // putting the buttons in `actions`, which is the node that travels into the
  // kit's `Title`.
  it("R52 · the path this screen draws through wears RECORD_TITLE_TREATMENT and forwards `actions`", () => {
    const chrome = read("web/components/records/record-chrome.tsx")
    expect(chrome).toMatch(/from "@shared\/web\/record-heading"/)
    expect(chrome).toMatch(/\$\{RECORD_TITLE_TREATMENT\}/)
    expect(chrome, "the node this screen passes reaches the kit's own actions slot").toMatch(
      /\n        actions=\{actions\}/
    )
    expect(src, "and this screen really draws through that path").toMatch(/<RecordScreen/)
  })

  it("R100 · a node handed to `actions` lands in the title's own centred row", () => {
    // Mounted rather than asserted off the kit's source: what matters is
    // WHERE the node ends up, and that is a fact about the rendered tree.
    const { container } = wrap(
      <Title actions={<a href="#x">Join</a>}>A meeting with a rather long name</Title>
    )
    const row = container.querySelector('[data-slot="title"]') as HTMLElement
    const slot = container.querySelector('[data-slot="title-actions"]') as HTMLElement
    expect(slot, "the actions node renders in the title's own actions slot").toBeTruthy()
    expect(row.contains(slot)).toBe(true)
    expect(slot.textContent).toBe("Join")
    // R100's own words: centred on the title's line box, never end/baseline.
    expect(row.className).toMatch(/(?:^|\s)items-center(?:\s|$)/)
    expect(row.className).not.toMatch(/items-(?:end|start|baseline)/)
  })

  it("R98 · neither button asks for the dense height a page head may not use", () => {
    expect(actions, "no `size: \"sm\"` on a control in the record's own head").not.toMatch(
      /size: "sm"/
    )
  })
})

/* ═══════════════════════════════════════════════════════════════════════════
   d · "on meetings: rmeove notes (we have transcript for that)"
   ═══════════════════════════════════════════════════════════════════════════ */

describe("d · the Notes surface is gone from the meetings UI", () => {
  const detail = read(MEETING_DETAIL)
  const form = read(MEETING_FORM)

  it("the record leads with its Agenda, and the words 'Agenda & notes' are gone", () => {
    // The tab STRIP is gone with the one-page ruling (see
    // `meeting-one-page.test.tsx`), so this is no longer a question about a
    // tab config: the agenda section is the first thing in the main column,
    // and the retired compound label is nowhere in the file.
    const main = between(detail, "const mainColumn = (", "const attendeesPanel = (")
    expect(main).toMatch(/<MeetingAgendaSection/)
    const agendaAt = main.indexOf("<MeetingAgendaSection")
    const transcriptAt = main.indexOf("<MeetingTranscriptSection")
    expect(transcriptAt, "the transcript sits under the agenda, not over it").toBeGreaterThan(
      agendaAt
    )
    expect(code(MEETING_DETAIL)).not.toContain("Agenda & notes")
  })

  it("no screen in the module offers to type a note", () => {
    for (const [name, src] of [
      [MEETING_DETAIL, detail],
      [MEETING_FORM, form],
    ] as const) {
      expect(src, `${name} draws no Notes heading`).not.toMatch(/t\("Notes"\)/)
      expect(src, `${name} draws no notes field label`).not.toMatch(/notesField/)
      expect(src, `${name} has no save-notes control`).not.toMatch(/t\("Save notes"\)/)
      expect(src, `${name} has no notes draft`).not.toMatch(/notesDraft/)
      expect(src, `${name} has no saveNotes door`).not.toMatch(/function saveNotes\b/)
    }
  })

  it("the form no longer carries a `notes` value at all", () => {
    const values = between(form, "export type MeetingFormValues = {", "export function MeetingFormDialog")
    expect(values).toMatch(/agenda: string/)
    expect(values).not.toMatch(/\n {2}notes: string/)
  })

  // ── AND NOTHING WAS DROPPED. The distinction her ruling turns on: this is a
  // UI removal. The column, the stored rows and the door are untouched, and an
  // edit through the form must not wipe what is there.
  it("the update call still sends the row's own stored notes back, unchanged", () => {
    const save = between(detail, "  async function save(values: MeetingFormValues) {", "\n  /**")
    expect(save, "the door REPLACES what it is given, so the field must ride along").toMatch(
      /notes: item\?\.notes \?\? null/
    )
    expect(save, "…and never a blank").not.toMatch(/notes: (?:null|""),/)
  })

  it("the column, the door and the knowledge sweep are all still there", () => {
    expect(
      read("workers/tenancy/src/team-schema/migrations.ts"),
      "the meetings table still declares its notes column"
    ).toMatch(/\n {2}notes TEXT,/)
    const door = read("workers/content/src/lib/meetings.ts")
    expect(door, "the read still selects it").toMatch(/m\.notes/)
    expect(door, "the write still accepts it").toMatch(/notes: optionalText\(input\.notes/)
    expect(
      read("workers/content/src/lib/knowledge-ingest.ts"),
      "a stored note is still answerable through the knowledge base"
    ).toMatch(/r\.notes/)
  })
})

/* ═══════════════════════════════════════════════════════════════════════════
   e · "agenda as open field shoudl only be befor eor during meeting. when end
        is in the past can only be edited on edit screen"
   ═══════════════════════════════════════════════════════════════════════════ */

const MINUTE = 60_000
const END = Date.parse("2026-09-23T11:00:00.000Z")
const START = Date.parse("2026-09-23T10:00:00.000Z")

function meeting(over: Partial<Meeting> = {}): Meeting {
  return {
    id: "m1",
    startsAt: new Date(START).toISOString(),
    endsAt: new Date(END).toISOString(),
    active: true,
    agenda: "<p>The three things</p>",
    ...over,
  } as Meeting
}

describe("e · the agenda is an open field until the meeting's end, and not after", () => {
  it("the boundary is exact, tested a minute either side of the end", () => {
    expect(agendaIsOpenField(meeting(), END - MINUTE), "a minute before the end: open").toBe(true)
    expect(agendaIsOpenField(meeting(), END + MINUTE), "a minute after the end: closed").toBe(false)
  })

  it("the end instant ITSELF is already past — 'when end is in the past'", () => {
    expect(agendaIsOpenField(meeting(), END - 1)).toBe(true)
    expect(agendaIsOpenField(meeting(), END)).toBe(false)
  })

  it("before it has even started is still 'before the meeting', so still open", () => {
    expect(agendaIsOpenField(meeting(), START - 24 * 60 * MINUTE)).toBe(true)
  })

  it("a meeting with no stated end is bounded by its own start", () => {
    const open = meeting({ endsAt: null })
    expect(meetingEndMs(open)).toBe(START)
    expect(agendaIsOpenField(open, START - MINUTE)).toBe(true)
    expect(agendaIsOpenField(open, START + MINUTE)).toBe(false)
  })

  it("a cancelled meeting is closed whatever the clock says", () => {
    expect(agendaIsOpenField(meeting({ active: false }), END - MINUTE)).toBe(false)
  })

  // ── THE SAME BOUNDARY, DRAWN. The rule above decides a boolean; these two
  // mount the section with the clock INJECTED and read the real DOM, because
  // "an open field" is a textbox a person can type in, not a predicate.
  it("a minute BEFORE the end the agenda is an editable field with its own save", () => {
    wrap(
      <MeetingAgendaSection
        meeting={meeting()}
        now={END - MINUTE}
        canEdit
        busy={false}
        html="<p>The three things</p>"
        onSave={() => {}}
      />
    )
    // Asked the way a screen reader asks: a TEXTBOX named by the section's own
    // heading. `aria-labelledby` is the only route this editor has to a name.
    expect(screen.getByRole("textbox", { name: "Agenda" })).toBeTruthy()
    expect(screen.getByRole("button", { name: /Save agenda/ })).toBeTruthy()
  })

  it("a minute AFTER the end it reads, with no editor and no save anywhere on it", () => {
    wrap(
      <MeetingAgendaSection
        meeting={meeting()}
        now={END + MINUTE}
        canEdit
        busy={false}
        html="<p>The three things</p>"
        onSave={() => {}}
      />
    )
    expect(screen.queryByRole("textbox", { name: "Agenda" })).toBeNull()
    expect(screen.queryByRole("button", { name: /Save agenda/ })).toBeNull()
    // It still SHOWS the agenda — closed is read-only, never hidden.
    expect(screen.getByText("The three things")).toBeTruthy()
  })

  it("a reader with no edit right never gets the field, even before the end", () => {
    wrap(
      <MeetingAgendaSection
        meeting={meeting()}
        now={END - MINUTE}
        canEdit={false}
        busy={false}
        html="<p>The three things</p>"
        onSave={() => {}}
      />
    )
    expect(screen.queryByRole("textbox", { name: "Agenda" })).toBeNull()
  })

  it("the screen reads the clock ONCE and passes it down — the rule never reads one", () => {
    const src = read(MEETING_DETAIL)
    const rule = between(src, "export function agendaIsOpenField(", "\n}")
    expect(rule, "a rule about time that reads the clock cannot be tested at its edge").not.toMatch(
      /Date\.now\(\)/
    )
    expect(src).toMatch(/<MeetingAgendaSection[\s\S]{0,200}now=\{now\}/)
  })

  it("…and the other half of her sentence needs no code: the edit dialog still has Agenda", () => {
    expect(read(MEETING_FORM)).toMatch(/htmlFor="meeting-agenda"/)
  })
})
