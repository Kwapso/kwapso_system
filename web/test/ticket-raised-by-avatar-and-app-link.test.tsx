// TWO OF THE CLIENT'S THIRD-ROUND RULINGS, 18 SEP 2026, verbatim, over the
// deployed build c6e6366f — proved by rendering rather than by reading the
// source, the same posture `ticket-row-opens-beside.test.tsx` (this
// directory) already takes over the same component.
//
//   6 · "on cokumn raised by i am misisng the avatar" — a STAFF raiser's face
//        on the top-level Tickets list was never drawn at all: `TicketFace`'s
//        own `raiserId`/`raiserName` pair has carried a name-only
//        `<RecordMark>` since it was written, with no `picture` prop, because
//        `HelpTicket` stores no avatar URL for a raiser and nothing on this
//        screen ever read the team's members cache to resolve one — the app
//        record's own Tickets tab (`AppTicketsPanel`, work-panels.tsx)
//        always has, through its own local `memberAvatar`. `memberFace`
//        (tickets-collection.tsx) is the ONE resolver now, shared by both,
//        and `TicketRowsTable` takes `members` as an optional prop so its
//        raisedBy cell can call it.
//
//   13 · "type icon is still gray, and the app name (a link) is not
//        underlined" — the Type column's icon carried a hard
//        `text-muted-foreground` class that fought the kit's own
//        `text-foreground` fix on `Badge`'s `secondary` variant; removed so
//        the glyph inherits the pill's own (now black) ink.
//
// A CLIENT CONTACT'S FACE IS UNTOUCHED BY EITHER FIX and is proved here too,
// so a regression that broke the staff half by breaking the client half
// alongside it would not read as green by accident.

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import type { TeamMember } from "@shared/types"

import { memberFace, TicketRowsTable, type TicketFace } from "@/components/tickets/tickets-collection"

afterEach(cleanup)

const STAFF_ROW: TicketFace = {
  id: "help-1",
  ref: "BERG-T0412",
  helpType: "Bug",
  appName: "Dispatch",
  appLogo: null,
  createdAt: "2026-08-18T09:00:00.000Z",
  titleEn: "The dispatch board will not load",
  titleDe: null,
  description: "<p>None of my drivers can see today's routes.</p>",
  resolvedAt: null,
  raiserId: "usr_alex",
  raiserName: "Alex Kovač",
  raiserIsClient: false,
}

const CLIENT_ROW: TicketFace = {
  ...STAFF_ROW,
  id: "help-2",
  ref: "BERG-T0413",
  raiserId: null,
  raiserName: null,
  raiserIsClient: false,
  raisedByContactName: "Petra Ostwald",
  raisedByContactLogo: "https://example.test/petra.png",
}

const MEMBERS: TeamMember[] = [
  {
    userId: "usr_alex",
    email: "alex@kwapso.com",
    firstName: "Alex",
    lastName: "Kovač",
    imageUrl: "https://example.test/alex.png",
    roleId: "role_1",
    roleTitle: "Admin",
    isYou: false,
    isAdmin: true,
    isClient: false,
    joinedAt: "2026-01-01T00:00:00.000Z",
    createdByName: null,
  } as TeamMember,
]

describe("memberFace — the one staff-raiser resolver (R35)", () => {
  it("resolves a member's own imageUrl by id", () => {
    expect(memberFace(MEMBERS, "usr_alex")).toBe("https://example.test/alex.png")
  })

  it("falls through to undefined for a null/absent id, or a cache that has not loaded", () => {
    expect(memberFace(MEMBERS, null)).toBeUndefined()
    expect(memberFace(MEMBERS, undefined)).toBeUndefined()
    expect(memberFace(undefined, "usr_alex")).toBeUndefined()
    expect(memberFace(MEMBERS, "usr_nobody")).toBeUndefined()
  })
})

describe("the top-level ticket list draws a staff raiser's own face (client ruling, 18 Sep 2026)", () => {
  it("renders the member's picture when the members cache is passed in", () => {
    render(
      <TicketRowsTable
        rows={[STAFF_ROW]}
        onOpen={() => {}}
        label="Tickets"
        teamId="team1"
        columns={["raisedBy"]}
        members={MEMBERS}
      />
    )
    const img = document.querySelector('img[src="https://example.test/alex.png"]')
    expect(img, "the raiser's own face should render, not just their initial").not.toBeNull()
    // R54 — a colleague is trimmed to a first name in the agency app.
    screen.getByText("Alex")
  })

  it("without a members cache, falls back to the initial rather than crashing — never a broken image", () => {
    render(
      <TicketRowsTable rows={[STAFF_ROW]} onOpen={() => {}} label="Tickets" teamId="team1" columns={["raisedBy"]} />
    )
    expect(document.querySelector("img")).toBeNull()
    screen.getByText("Alex")
  })

  it("a client contact's own face still draws from the door's raisedByContactLogo, untouched by the staff fix", () => {
    render(
      <TicketRowsTable
        rows={[CLIENT_ROW]}
        onOpen={() => {}}
        label="Tickets"
        teamId="team1"
        columns={["raisedBy"]}
        members={MEMBERS}
      />
    )
    const img = document.querySelector('img[src="https://example.test/petra.png"]')
    expect(img, "a client contact's own logo must still render").not.toBeNull()
    screen.getByText("Petra Ostwald")
  })
})

describe("the Type chip's glyph carries no forced grey (client ruling, 18 Sep 2026)", () => {
  it("the type icon draws with no text-muted-foreground/text-ink-secondary class", () => {
    render(
      <TicketRowsTable rows={[STAFF_ROW]} onOpen={() => {}} label="Tickets" teamId="team1" columns={["type"]} />
    )
    const icon = document.querySelector('[data-slot="badge-icon"] svg, [data-slot="badge-icon"] [class*="icon"]')
      ?? document.querySelector('[data-slot="badge-icon"]')?.firstElementChild
    expect(icon, "expected the type badge to draw a leading icon").not.toBeNull()
    const cls = icon?.getAttribute("class") ?? ""
    expect(cls).not.toMatch(/text-muted-foreground|text-ink-secondary/)
  })
})
