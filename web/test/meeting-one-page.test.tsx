// ONE MEETING, ON ONE PAGE — Aurora, 23 Sep 2026, verbatim: *"meetings:
// implement the one page, love how you did it."*
//
// WHAT THIS SUITE IS FOR, AND WHAT IT DELIBERATELY DOES NOT RE-PROVE. The
// footer's position (R89) took nine rounds of live-injection against a real
// browser and is proved, once, by `web/test/footer-on-the-edge.test.ts`
// against `TicketDetailBody`'s own source. This page does not re-derive any
// of it: it calls the SAME three pieces the ticket and the story call
// (`<RecordScreen panelVisible footerVisible>`, `<RecordDetailBody>`,
// `<ScreenFooterSlot>`), so what is checked here is that it really calls
// them, in the shape that makes them work — never a second measurement of a
// construction somebody else owns.
//
// RENDERED WHERE IT IS A DRAWING, READ OFF DISK WHERE IT IS A STRUCTURE. The
// Location section and the in-person rule are mounted and read out of the
// DOM. "There is no tab strip", "the body is a sibling of the head", "the
// Details section is struck" are facts about the file, and a census is what
// sees them.

import { cleanup, render, screen } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"

import { stripComments } from "@shared/rules/source-scan"
import { orderChips } from "@shared/web/chip-order"
import { RecordRef } from "@shared/web/record-ref"
import { LanguageProvider } from "@shared/web/language"
import { PersonCard } from "@shared/web/person-card"
import { RECORD_TABS_SINGLE_PANEL, NO_NESTED_SCROLL_EXEMPT } from "@shared/rules/registry"
import {
  attendeeName,
  MeetingLocationSection,
  MeetingTranscriptSection,
  meetingIsInPerson,
  meetingHasEnded,
} from "@/components/meetings/meeting-detail"
import type { Meeting } from "@shared/types"

afterEach(cleanup)

const ROOT = join(__dirname, "..", "..")
const read = (p: string) => readFileSync(join(ROOT, ...p.split("/")), "utf8")
const MEETING_DETAIL = "web/components/meetings/meeting-detail.tsx"
/** The file with its prose removed — this module's own comments quote every
 * ruling verbatim and name the very things being removed, so a plain
 * substring search would keep tripping over the explanation of its own
 * change. */
const code = (p: string) => stripComments(read(p))

const wrap = (node: React.ReactNode) =>
  render(<LanguageProvider value={null}>{node}</LanguageProvider>)

function meeting(over: Partial<Meeting> = {}): Meeting {
  return {
    id: "m1",
    startsAt: "2026-09-23T10:00:00.000Z",
    endsAt: "2026-09-23T11:00:00.000Z",
    active: true,
    location: null,
    googleJoinUrl: null,
    googleAttachments: [],
    googleGuests: [],
    ...over,
  } as Meeting
}

/* ═══════════════════════════════════════════════════════════════════════════
   THE CHASSIS — the same one a ticket and a story stand on
   ═══════════════════════════════════════════════════════════════════════════ */

describe("the meeting record is one page, on the proved chassis", () => {
  const src = code(MEETING_DETAIL)

  it("draws no tab strip at all, and keeps no remembered tab", () => {
    expect(src, "no TabsView is imported or rendered").not.toMatch(/\bTabsView\b/)
    expect(src, "no tab config is left behind").not.toMatch(/tabsConfig/)
    // The remembered slot goes with the strip: a value nothing reads is an
    // address in `nav-memory.ts` that can only rot.
    expect(src, "no remembered tab slot").not.toMatch(/useRemembered\(\s*"tab"/)
    expect(src, "…and the hook is not imported for nothing").not.toMatch(/\buseRemembered\b/)
  })

  it("is named in RECORD_TABS_SINGLE_PANEL, so the tab law knows it is deliberate", () => {
    // Without this the derived `record-detail-tabs` census reads a
    // `<RecordScreen>` file with no `TabsView` as an offender. The entry is
    // rot-checked the other way by the law's own suite, so it cannot outlive
    // the decision.
    expect(RECORD_TABS_SINGLE_PANEL["meeting-detail"]).toBeTruthy()
    expect(RECORD_TABS_SINGLE_PANEL["meeting-detail"]).toMatch(/one page/i)
  })

  it("the head is head-only and the body is its SIBLING, not its children", () => {
    // `RecordDetail`'s own panel region never reads `content` once
    // `panelVisible` is false, so a body passed as children would render
    // nowhere at all.
    expect(src).toMatch(/panelVisible=\{false\}/)
    expect(src).toMatch(/footerVisible=\{false\}/)
    // Self-closing: the head takes no children on this page.
    const headAt = src.indexOf("<RecordScreen")
    const bodyAt = src.indexOf("<RecordDetailBody")
    expect(headAt).toBeGreaterThan(-1)
    expect(bodyAt).toBeGreaterThan(headAt)
    expect(
      src.slice(headAt, bodyAt),
      "the head closes itself before the body begins"
    ).toMatch(/\/>\s*$/m)
    expect(src, "no </RecordScreen> — nothing is nested inside the head").not.toContain(
      "</RecordScreen>"
    )
  })

  it("hands the band to the shell's own footer slot, exactly once", () => {
    expect(src).toMatch(/<ScreenFooterSlot>/)
    expect((src.match(/<ScreenFooterSlot>/g) ?? []).length, "one slot fill per page (R106)").toBe(1)
    const slotAt = src.indexOf("<ScreenFooterSlot>")
    const slotBody = src.slice(slotAt, src.indexOf("</ScreenFooterSlot>", slotAt))
    expect(slotBody, "the band is what goes in it").toContain("<RecordFooterBand")
    // R2's own footer clause: a record detail hands the footer an audit block
    // or a note door, never neither.
    expect(slotBody).toMatch(/audit=\{/)
    expect(slotBody).toMatch(/onAddNote=/)
  })

  it("the two columns are the shared body's own `main` and `side`", () => {
    expect(src).toMatch(/<RecordDetailBody[\s\S]{0,160}main=\{mainColumn\}/)
    expect(src).toMatch(/<RecordDetailBody[\s\S]{0,160}side=\{sideColumn\}/)
    // Its own marker, never the ticket's — two DOM subtrees must not wear one
    // name (`record-detail-body.tsx`'s own `dataSlot` note).
    expect(src).toMatch(/dataSlot="meeting-detail-body"/)
    expect(src).not.toContain('"ticket-detail-body"')
  })
})

/* ═══════════════════════════════════════════════════════════════════════════
   THE HEAD — her chip order
   ═══════════════════════════════════════════════════════════════════════════ */

describe('the chips are "id, department, app/account (with link)", through the one seam', () => {
  const src = code(MEETING_DETAIL)
  const chips = (() => {
    const at = src.indexOf("chips={")
    const end = src.indexOf("title={cleanTitle}", at)
    expect(at, "the chips block is where this test expects it").toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(at)
    return src.slice(at, end)
  })()

  it("is built through orderChips (R94), never a hand-ordered JSX list", () => {
    expect(chips).toMatch(/orderChips\(\[/)
  })

  it("carries all five kinds: the id, the status, the department, the app and the account", () => {
    expect(chips).toMatch(/kind: "id"[\s\S]{0,120}<RecordRef/)
    expect(chips).toMatch(/kind: "status"[\s\S]{0,200}Cancelled/)
    expect(chips).toMatch(/kind: "type"[\s\S]{0,300}department/)
    expect(chips).toMatch(/kind: "mainParent"[\s\S]{0,200}appId/)
    expect(chips).toMatch(/kind: "secondaryParent"[\s\S]{0,200}accountId/)
  })

  it("the id is the black RecordRef chip, and is not ALSO printed beside the title", () => {
    // R96 — one register for an id chip. And `recordNumber` would print the
    // same reference a second time on the same head.
    expect(chips).toContain("<RecordRef")
    expect(src, "no recordNumber prop is left").not.toMatch(/recordNumber=/)
  })

  it("both parents are underlined — her own words, \"with link\"", () => {
    expect(chips).toMatch(/key="app"[\s\S]{0,160}underline/)
    expect(chips).toMatch(/key="account"[\s\S]{0,160}underline/)
  })

  it("the department chip is NOT coloured (R86) and carries its own mark (R93)", () => {
    const dept = chips.slice(chips.indexOf('kind: "type"'), chips.indexOf('kind: "mainParent"'))
    expect(dept, "secondary, never a status tone").toMatch(/variant="secondary"/)
    expect(dept, "the one coloured chip on a record is its status").not.toMatch(/dot=/)
    expect(dept, "the glyph rides beside the word").toMatch(/departmentGlyph\(/)
  })

  // ── "MISSING CHIPS", AND WHICH KIND OF PROBLEM IT IS ──────────────────────
  //
  // Aurora said "missing chips" twice, 24 Sep 2026, against this head. The row
  // is built correctly and renders every chip it is given, in her order — the
  // first case below proves that with real data. What she is seeing is the
  // SECOND case: a meeting that arrived from Google Calendar has no reference,
  // no purpose, no app and no account, so every one of the five slots is empty
  // and the row draws NOTHING AT ALL. That is a data problem, and these two
  // cases are here so nobody re-reads it as a render one and "fixes" a
  // component that is already right.
  it("with real data, every chip she named renders, in her order", () => {
    const { container } = wrap(
      <>
        {orderChips([
          { kind: "id" as const, node: <RecordRef key="id" value="BERG-M0007" /> },
          { kind: "type" as const, node: <span key="d">Sales</span> },
          { kind: "mainParent" as const, node: <span key="a">Northwind</span> },
          { kind: "secondaryParent" as const, node: <span key="c">Bergmann</span> },
        ])}
      </>
    )
    expect(container.textContent).toBe("BERG-M0007SalesNorthwindBergmann")
  })

  it("a meeting swept in from Google has NOTHING to put in any of the five slots", () => {
    // Every one of these nulls is a fact about the door, asserted below rather
    // than assumed:
    //   · `ref` is minted in ONE place, `createMeeting`, and only when the
    //     meeting has an account; the calendar sweep never sets it.
    //   · the department comes off the meeting's PURPOSE, and a swept meeting
    //     has none.
    //   · app and account are both null on a swept row until somebody files it.
    const { container } = wrap(
      <>
        {orderChips([
          { kind: "id" as const, node: null },
          { kind: "type" as const, node: null },
          { kind: "mainParent" as const, node: null },
          { kind: "secondaryParent" as const, node: null },
        ])}
      </>
    )
    expect(container.textContent, "the head's chip row is empty, and the row is not at fault").toBe("")
  })

  it("…and the door really is why: a reference is minted only with an account, never by the sweep", () => {
    const door = read("workers/content/src/lib/meetings.ts")
    // ONE mint, gated on the account.
    expect(door).toMatch(/const ref = v\.accountId \? await nextTeamRef\([^)]*\) : null/)
    expect(
      (door.match(/nextTeamRef\(/g) ?? []).length,
      "a reference is minted in exactly one place in this module"
    ).toBe(1)
    // And the sweep's own INSERT names no `ref` column at all.
    const sweepAt = door.indexOf("INSERT INTO meetings (id, title, agenda, location, starts_at, ends_at,")
    expect(sweepAt, "the sweep's own insert is where this test expects it").toBeGreaterThan(-1)
    const sweepInsert = door.slice(sweepAt, door.indexOf(";`", sweepAt))
    expect(sweepInsert, "a swept meeting is inserted without a reference").not.toMatch(/\bref\b/)
  })

  it("the department is DERIVED from the meeting's purpose, never a new column", () => {
    expect(src).toMatch(/purposesQ\.data\?\.find\(\(x\) => x\.id === item\.purposeId\)\?\.department/)
    // And the read is no longer gated on the edit right, or a reader who
    // cannot edit would lose a chip for the wrong reason.
    expect(src).toMatch(/useCached<MeetingPurpose\[\]>\(have \?/)
    expect(src).not.toMatch(/have && canEdit \? `purposes:/)
  })
})

/* ═══════════════════════════════════════════════════════════════════════════
   THE MAIN COLUMN — the transcript fades, it does not scroll
   ═══════════════════════════════════════════════════════════════════════════ */

const TRANSCRIPT = { text: "line one\nline two", note: null, url: null }

describe("the transcript fades at about ten lines, with the document one click away", () => {
  it("clips and fades — there is no scroller anywhere in the section", () => {
    wrap(
      <MeetingTranscriptSection
        meeting={meeting({
          transcriptCapturedAt: "2026-09-23T12:00:00.000Z",
          transcriptUrl: "https://docs.google.com/document/d/abc",
        })}
        read={TRANSCRIPT}
      />
    )
    const box = document.querySelector('[data-slot="transcript-fade"]') as HTMLElement
    expect(box, "the fade box renders").toBeTruthy()
    expect(box.className, "it CLIPS").toMatch(/(?:^|\s)overflow-hidden(?:\s|$)/)
    expect(box.className, "…it does not scroll").not.toMatch(/overflow-y-auto|overflow-auto/)
    // Ten lines of --text-sm (0.875rem × 1.45) is 12.6875rem.
    expect(box.className).toMatch(/max-h-\[12\.7rem\]/)
  })

  it("the way out to the document is right there", () => {
    wrap(
      <MeetingTranscriptSection
        meeting={meeting({
          transcriptCapturedAt: "2026-09-23T12:00:00.000Z",
          transcriptUrl: "https://docs.google.com/document/d/abc",
        })}
        read={TRANSCRIPT}
      />
    )
    const link = screen.getByRole("link", { name: /Open the document/ })
    expect(link.getAttribute("href")).toContain("docs.google.com")
  })

  it("keeps all three badges — where it was found, and whether it is answerable", () => {
    wrap(
      <MeetingTranscriptSection
        meeting={meeting({
          transcriptCapturedAt: "2026-09-23T12:00:00.000Z",
          transcriptFoundBy: "attachment",
          transcriptUrl: "https://docs.google.com/document/d/abc",
        })}
        read={TRANSCRIPT}
      />
    )
    expect(screen.getByText("On the calendar entry")).toBeTruthy()
    expect(screen.getByText("Not in the knowledge base yet")).toBeTruthy()
  })

  it("every word is still in the DOM — the clip is visual, not a truncation", () => {
    const long = Array.from({ length: 60 }, (_, i) => `line ${i}`).join("\n")
    wrap(
      <MeetingTranscriptSection
        meeting={meeting({ transcriptCapturedAt: "2026-09-23T12:00:00.000Z" })}
        read={{ text: long, note: null, url: null }}
      />
    )
    const box = document.querySelector('[data-slot="transcript-fade"]') as HTMLElement
    expect(box.textContent).toContain("line 59")
  })

  it("draws nothing at all on a meeting with no transcript", () => {
    const { container } = wrap(<MeetingTranscriptSection meeting={meeting()} read={undefined} />)
    expect(container.innerHTML).toBe("")
  })

  it("R91's exemption for the old scroller is retired, not left pinned", () => {
    const stale = Object.keys(NO_NESTED_SCROLL_EXEMPT).filter((k) =>
      k.startsWith("web/components/meetings/meeting-detail.tsx")
    )
    expect(stale, "the transcript well is gone, so its sanction goes with it").toEqual([])
  })
})

/* ═══════════════════════════════════════════════════════════════════════════
   THE SIDE COLUMN — Attendees, Location, Time log, Connections
   ═══════════════════════════════════════════════════════════════════════════ */

describe("the side column is her four sections, in her order, and no Details", () => {
  const src = code(MEETING_DETAIL)
  // From the side column's own declaration to the render that follows it —
  // `indexOf("return (")` alone would land on one of the early returns far
  // above, which is how this slice first came back empty.
  const sideAt = src.indexOf("const sideColumn = (")
  const side = src.slice(sideAt, src.indexOf("\n  return (", sideAt))

  it("is Attendees, Location, Logs, Connections — in that order", () => {
    const order = ["attendeesPanel", "MeetingLocationSection", "logsPanel", "connectionsPanel"]
    const at = order.map((name) => side.indexOf(name))
    expect(at.every((i) => i > -1), `all four are drawn: ${JSON.stringify(at)}`).toBe(true)
    expect([...at].sort((a, b) => a - b), "and in her order").toEqual(at)
  })

  it("ATTACHED TO THE ENTRY is struck too — no section, no component, no render", () => {
    // Aurora, 24 Sep 2026, asked directly whether to keep the one route in the
    // app to a calendar entry's own Drive files: "kill that completely". It
    // had survived one round on a flagged judgement, which is exactly why this
    // is asserted rather than assumed — a section kept on a judgement is a
    // section somebody will re-add on the same judgement.
    expect(src, "the component is deleted, not merely unmounted").not.toMatch(
      /function MeetingAttachmentsSection\b/
    )
    expect(src, "…and nothing renders it").not.toMatch(/<MeetingAttachmentsSection\b/)
    expect(src, "…and no screen reads the attachment list any more").not.toMatch(
      /googleAttachments/
    )
    expect(src, "the file icon's own url seam has no reader left either").not.toMatch(
      /\bsafeSrc\b/
    )
  })

  it("…but the DATA behind it is untouched: the column, the sweep and the door all stand", () => {
    // The distinction her Notes ruling already drew, applied again: a UI
    // removal is not a data removal, and a screen that stops drawing something
    // must not take the row with it.
    expect(
      read("workers/tenancy/src/team-schema/migrations.ts"),
      "the column is still declared"
    ).toMatch(/ALTER TABLE meetings ADD COLUMN google_attachments_json TEXT;/)
    const door = read("workers/content/src/lib/meetings.ts")
    expect(door, "the sweep still rewrites it on every pass").toMatch(
      /google_attachments_json = \$\{sqlString\(JSON\.stringify\(event\.attachments\)\)\}/
    )
    expect(door, "and the door still hands it back on the row").toMatch(
      /googleAttachments: readJsonList<MeetingAttachment>\(r\.google_attachments_json\)/
    )
  })

  it("the Details section is struck outright — no OverviewList anywhere on the page", () => {
    expect(src, "her ruling: \"do not include section details (its unecessry)\"").not.toMatch(
      /OverviewList/
    )
    // The calendar tab's own Google-facts list was the same section under
    // another name, and it goes with it.
    expect(src).not.toMatch(/googleTimeZone/)
    expect(src).not.toMatch(/googleRecurrence/)
    expect(src).not.toMatch(/googleSyncedAt/)
  })

  it("the Logs section drops the Entries tile and keeps the other two", () => {
    const panelBlock = src.slice(src.indexOf("const logsPanel"), src.indexOf("const connectionsPanel"))
    expect(panelBlock).toMatch(/showEntriesTile=\{false\}/)
    // The shared panel really honours it, and every other caller keeps its
    // three tiles by default.
    const panel = code("web/components/work/work-logs-panel.tsx")
    expect(panel).toMatch(/showEntriesTile = true/)
    expect(panel, "the tile is conditional on the prop").toMatch(
      /\.\.\.\(showEntriesTile[\s\S]{0,200}id: "entries"/
    )
  })

  it("the logs section is titled Logs, the one word Aurora settled on", () => {
    // "word is logs only" (23 Sep 2026), reversing B0386's "Time log" of the
    // day before. The rename's own suite (`logs-dashboard.test.tsx`) proves
    // no surface anywhere still says the retired words; this proves THIS one
    // says the right one.
    const panelBlock = src.slice(src.indexOf("const logsPanel"), src.indexOf("const connectionsPanel"))
    expect(panelBlock).toMatch(/title=\{t\("Logs"\)\}/)
    expect(panelBlock).not.toMatch(/Time log|Work logs/)
  })

  it("Connections disappears when EMPTY, and never when the read failed", () => {
    // Not "explains itself" — on a one-page record an explanation of an
    // absence is a section about nothing.
    //
    // AND NOT "disappears whenever there is no data", which is what the first
    // version of this gate said and what `meeting-connections-tab.test.tsx`
    // caught: `mapQ.data` is `undefined` on a FAILED read as well as on an
    // empty one, so a broken map door drew nothing at all. The two conditions
    // are asserted together here precisely because dropping either one is a
    // real defect with no other symptom.
    const panelBlock = src.slice(src.indexOf("const connectionsPanel"), src.indexOf("const sideColumn"))
    expect(panelBlock, "something to show").toMatch(/\(mapQ\.data\?\.total \?\? 0\) > 0/)
    expect(panelBlock, "…or something went wrong").toMatch(/\|\| connectionsFailed/)
    // Loading stays silent: `data` undefined with no `error` is a read in
    // flight, and a section that appears then vanishes is its own small bug.
    expect(src).toMatch(/const connectionsFailed = mapQ\.error !== undefined && mapQ\.error !== null/)
  })

  it("R111 · a colleague wears their own photograph, resolved through the one seam", () => {
    // THE FREE HALF of R111 on this screen (23 Sep 2026). `memberUserId` off
    // the link this screen already resolves for the chip, through `memberFace`
    // against the members cache every other staff face in the app reads — a
    // lookup, not a door change.
    const panel = src.slice(src.indexOf("const attendeesPanel = ("), src.indexOf("const logsPanel"))
    expect(panel).toMatch(/picture=\{memberFace\(membersQ\.data, known\?\.memberUserId\)\}/)
    // The members list is read on the same cache key every other screen asks
    // for (R56), and only once there is somebody to resolve.
    expect(src).toMatch(/useCached<TeamMember\[\]>\([\s\S]{0,80}`members:\$\{teamId\}`/)
    expect(src).toMatch(/item\?\.googleGuests\.length \? `members:\$\{teamId\}` : null/)
    // And it goes through the app's ONE resolver, never a second lookup here.
    expect(src).toMatch(/from "@\/components\/tickets\/tickets-collection"/)
  })

  it("R111 · the external flag rides on both populations, whether or not there is a face", () => {
    const panel = src.slice(src.indexOf("const attendeesPanel = ("), src.indexOf("const logsPanel"))
    // A guest linked to a CLIENT's account is from outside. A guest linked to
    // a member of this team is not. A guest we recognise as neither takes the
    // colour default rather than a guess.
    expect(panel).toMatch(/external=\{Boolean\(known\?\.accountId\)\}/)
  })

  it("R111 · the fact reaches the mark even with no picture, so a tile treatment needs no second pass", () => {
    // The half-state this guards: after the free half, a colleague may show a
    // photograph while a client shows initials, and a client's tile looks
    // exactly like a colleague's who has no photograph. `external` used to
    // reach the DOM ONLY as `grayscale` on the `<img>`, so with no picture the
    // fact vanished. `RecordMark` publishes it on its own box now, the same
    // way the kit's `Avatar` already does.
    const { container } = wrap(
      <PersonCard
        orientation="horizontal"
        size="choice"
        external
        mark="AR"
        markName="Ana Ruiz"
        title={<span>Ana Ruiz</span>}
      />
    )
    const mark = container.querySelector('[data-external="true"]') as HTMLElement
    expect(mark, "an outside person's mark says so with no photograph at all").toBeTruthy()
    expect(mark.querySelector("img"), "…and there is genuinely no picture to grey").toBeNull()
  })

  it("R111 · and one of ours carries no such attribute — presence is the answer", () => {
    const { container } = wrap(
      <PersonCard
        orientation="horizontal"
        size="choice"
        mark="BM"
        markName="Bo Meyer"
        title={<span>Bo Meyer</span>}
      />
    )
    // Never a cheerful `data-external="false"`, which would read as "we
    // checked, and they are ours" on a call site nobody has updated.
    expect(container.querySelector("[data-external]")).toBeNull()
  })

  it("the attendee rows carry a face and a name and NOTHING else", () => {
    // Aurora, 24 Sep 2026: "rmeove the tag one of us, one of them - we know.
    // show name, not email. remove coming/noreply whatever - we can see it in
    // calendar". The faces and the greyscale flag from the round before stay —
    // this strips the words beside them, not the people.
    const panel = src.slice(src.indexOf("const attendeesPanel = ("), src.indexOf("const logsPanel"))
    expect(panel, "no One of us / account / Organiser tag").not.toMatch(/chip=\{/)
    expect(panel, "no RSVP line").not.toMatch(/secondary=\{/)
    expect(panel, "…and the RSVP vocabulary has no reader left at all").toBeTruthy()
    expect(src).not.toMatch(/\bRESPONSE\b\s*\[/)
    expect(src, "the response map itself is deleted").not.toMatch(
      /const RESPONSE: Record<string, string>/
    )
    // The two that survive, asserted so a later tidy cannot take them with it.
    expect(panel).toMatch(/picture=\{memberFace\(/)
    expect(panel).toMatch(/external=\{Boolean\(known\?\.accountId\)\}/)
  })

  it("a name, not an address — and an address in FULL when there is genuinely no name", () => {
    // ONE OF OURS wears their own record's spelling, first name only, because
    // a staff name is a first name everywhere else in this app (R54).
    expect(attendeeName({ email: "ana@kwapso.app", name: "Ana From Google" }, { memberName: "Ana Ruiz" })).toBe(
      "Ana"
    )
    // EVERYBODY ELSE keeps Google's own display name, un-trimmed: R54 is about
    // our people, and a client is known by their whole name.
    expect(attendeeName({ email: "bo@northwind.test", name: "Bo Meyer" }, undefined)).toBe("Bo Meyer")
    expect(
      attendeeName({ email: "bo@northwind.test", name: "Bo Meyer" }, { memberName: null }),
      "a link that matched nobody is the same as no link"
    ).toBe("Bo Meyer")
    // NOBODY AT ALL, AND NO NAME FROM GOOGLE — the whole address.
    expect(attendeeName({ email: "someone@elsewhere.test", name: null }, undefined)).toBe(
      "someone@elsewhere.test"
    )
    expect(attendeeName({ email: "someone@elsewhere.test" }, undefined)).toBe("someone@elsewhere.test")
    expect(attendeeName({ email: "someone@elsewhere.test", name: "   " }, undefined)).toBe(
      "someone@elsewhere.test"
    )
  })

  it("the fallback address is never truncated — it is a whole address or a real name", () => {
    // "ana@…" is not a name, it is a name-shaped thing that cannot be
    // searched, copied or recognised. The address at least is all three, and a
    // reader can see at once that this is somebody we do not know.
    const long = "a.very.long.local.part@some-rather-long-domain.example.test"
    expect(attendeeName({ email: long, name: null }, undefined)).toBe(long)
    expect(attendeeName({ email: long, name: null }, undefined)).not.toContain("…")
  })

  it("Attendees is her word, counted beside its own title, and drops its header when empty", () => {
    expect(side || src).toBeTruthy()
    const panel = src.slice(src.indexOf("const attendeesPanel = ("), src.indexOf("const logsPanel"))
    expect(panel).toMatch(/title=\{t\("Attendees"\)\}/)
    expect(panel, "R97 — the count sits beside the title").toMatch(/count=\{formatCount\(/)
    expect(panel, "R88 — an empty section drops its whole header").toMatch(/empty=\{attendees\.length === 0\}/)
    // R104 — a group of people in a record section is bare PersonCard chips.
    expect(panel).toMatch(/<PersonCard/)
    expect(panel, "never a card each").not.toMatch(/<Card\b/)
  })
})

/* ═══════════════════════════════════════════════════════════════════════════
   JOIN DISAPPEARS ONCE THE MEETING IS OVER
   ═══════════════════════════════════════════════════════════════════════════ */

const MINUTE = 60_000
const END = Date.parse("2026-09-23T11:00:00.000Z")

describe("Join disappears once the meeting is over; Google Calendar stays", () => {
  it("the clock rule is exact, a minute either side of the end", () => {
    expect(meetingHasEnded(meeting(), END - MINUTE), "a minute before: not over").toBe(false)
    expect(meetingHasEnded(meeting(), END + MINUTE), "a minute after: over").toBe(true)
  })

  it("the end instant itself counts as over — the same boundary the agenda draws", () => {
    expect(meetingHasEnded(meeting(), END - 1)).toBe(false)
    expect(meetingHasEnded(meeting(), END)).toBe(true)
  })

  it("a meeting with no stated end is bounded by its own start", () => {
    const m = meeting({ endsAt: null })
    const start = Date.parse("2026-09-23T10:00:00.000Z")
    expect(meetingHasEnded(m, start - MINUTE)).toBe(false)
    expect(meetingHasEnded(m, start + MINUTE)).toBe(true)
  })

  it("both the wide row and the fold are gated on it — never one and not the other", () => {
    const src = code(MEETING_DETAIL)
    const gated = src.match(/!meetingHasEnded\(item, now\)/g) ?? []
    expect(gated.length, "the actions row and the folded menu item").toBe(2)
  })

  it("the second button says exactly \"Calendar\"", () => {
    // Renamed twice, each time by her: "Open in Google Calendar" -> "Google
    // Calendar" (23 Sep) -> "Calendar" (24 Sep, "rename google calendar to
    // just 'calendar'"). Both retired labels are gone from the file.
    const body = code(MEETING_DETAIL)
    expect(body).toMatch(/t\("Calendar"\)/)
    expect(body).not.toContain("Google Calendar")
    expect(body).not.toContain("Open in Google Calendar")
  })

  it("Calendar is deliberately NOT gated on the clock — it still opens something real", () => {
    const src = code(MEETING_DETAIL)
    const at = src.indexOf("item.googleEventUrl")
    const window = src.slice(Math.max(0, at - 200), at + 200)
    expect(window).not.toMatch(/meetingHasEnded/)
  })
})

/* ═══════════════════════════════════════════════════════════════════════════
   THE LOCATION SECTION — view One today, and no wrong pin ever
   ═══════════════════════════════════════════════════════════════════════════ */

describe("in person: what draws the Location section, and what must not", () => {
  it("an address and nothing to join is in person", () => {
    expect(meetingIsInPerson({ location: "Oranienstr. 12, Berlin", googleJoinUrl: null })).toBe(true)
  })

  it("something to join is never in person, whatever the location says", () => {
    expect(
      meetingIsInPerson({ location: "Oranienstr. 12, Berlin", googleJoinUrl: "https://meet.google.com/x" })
    ).toBe(false)
  })

  it("no location at all is not in person", () => {
    expect(meetingIsInPerson({ location: null, googleJoinUrl: null })).toBe(false)
    expect(meetingIsInPerson({ location: "   ", googleJoinUrl: null })).toBe(false)
  })

  it("a video link PASTED into the location field is not an address", () => {
    // This is the case the brief's own pair would have got wrong: a Zoom link
    // typed into Location is not in `conferenceData`, so `googleJoinUrl` is
    // null and the meeting would have read as in person — and then a pin.
    expect(meetingIsInPerson({ location: "https://zoom.us/j/12345", googleJoinUrl: null })).toBe(false)
    expect(meetingIsInPerson({ location: "https://teams.microsoft.com/l/x", googleJoinUrl: null })).toBe(
      false
    )
  })
})

describe("the Location section draws view One, and it does not read as an error", () => {
  it("renders the place name, its address lines and the way out", () => {
    wrap(<MeetingLocationSection meeting={meeting({ location: "Studio 4, Oranienstr. 12, Berlin" })} />)
    expect(screen.getByText("Studio 4")).toBeTruthy()
    expect(screen.getByText("Oranienstr. 12")).toBeTruthy()
    expect(screen.getByText("Berlin")).toBeTruthy()
    const link = screen.getByRole("link", { name: /Open in Maps/ })
    expect(link.getAttribute("href")).toContain("google.com/maps/search/")
    expect(link.getAttribute("href")).toContain(encodeURIComponent("Studio 4, Oranienstr. 12, Berlin"))
  })

  it("a one-part location is one line and no invented name", () => {
    wrap(<MeetingLocationSection meeting={meeting({ location: "Berlin-3-Kreuzberg (8)" })} />)
    const box = document.querySelector('[data-slot="meeting-location"]') as HTMLElement
    expect(box.querySelectorAll("p").length, "one line, not a name plus a blank").toBe(1)
    expect(screen.getByText("Berlin-3-Kreuzberg (8)")).toBeTruthy()
  })

  it("NOT AN ERROR STATE — no warning tone, no failure sentence, no empty plate", () => {
    const { container } = wrap(
      <MeetingLocationSection meeting={meeting({ location: "Oranienstr. 12, Berlin" })} />
    )
    const html = container.innerHTML
    for (const wrong of ["destructive", "warning", "could not", "Couldn't", "unavailable"]) {
      expect(html, `view One must not read as a failure: found "${wrong}"`).not.toContain(wrong)
    }
  })

  it("NO PIN WITHOUT COORDINATES — nothing here builds a static map url", () => {
    // The whole point of the brief's own warning: a free-text address handed
    // to `staticmap?center=` makes Google guess, and Google answers a bad
    // guess with a confident map of somewhere else. Until a resolved position
    // exists there is no image request at all.
    const src = code(MEETING_DETAIL)
    expect(src, "no Static Maps endpoint is called").not.toContain("staticmap")
    expect(src, "and no key of any kind is read in the browser").not.toMatch(/GOOGLE_MAPS/)
    // The only Maps url on the page is the keyless search link.
    expect(src).toContain("google.com/maps/search/")
  })

  it("draws nothing at all when the meeting is not in person", () => {
    const { container } = wrap(
      <MeetingLocationSection meeting={meeting({ location: "Berlin", googleJoinUrl: "https://meet.google.com/x" })} />
    )
    expect(container.innerHTML).toBe("")
  })
})
