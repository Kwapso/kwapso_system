// HELP-STAKEHOLDERS — FACES + NAMES, RAISED BY AS ONE TILE, THE LOOP
// HORIZONTAL. Client ruling, 17 Sep 2026, reading the deployed V1 page back,
// verbatim: "Remove all of this from stakeholders 'Pick someone to keep in
// the loop … B Blackbox C Chilavert … You can add members, but no one is
// ever removed.'" And, read together with the fact-list removal in the same
// review: "Everyone kept in the loop on this ticket, the person who raised
// it, your admins, and anyone mentioned." also goes. What remains, on the
// page itself: the stakeholder's face and name, nothing else. The picker
// moved into the ticket edit sheet (help-form-dialog-loop-field.test.tsx
// proves its new home); this file proves the component the page renders now
// takes no LOOP-picker props at all.
//
// AMENDED 18 Sep 2026 — client ruling, verbatim: "show them like cards (like
// settings members) and show what was before, who raised it and on the
// loop." The row became a card (shared/web/person-card.tsx's `PersonCard`)
// and now carries a relation label — "Raised by" for the one raiser, "On the
// loop" for everyone else — never a THIRD fact beyond the face, the name and
// that one label.
//
// AMENDED AGAIN, SAME DAY, THEN SUPERSEDED THE SAME DAY: "square tiles, three
// to a row" (grid-cols-3) was the shape for a few hours; her next ruling —
// "On ticket raised by, there should be a dropdown, and who to keep in the
// loop should be horizontal" — split the panel in two: Raised by keeps ONE
// tile (the same `PersonCard` vertical/band shape, now also EDITABLE through
// the ticket's own `raised_by_contact_id`, the field that field already
// supports via the existing PATCH door); the loop is no longer a grid, it is
// one card holding a single horizontal, wrapping row of `PersonCard`
// `orientation="horizontal"` chips. See help-stakeholders.tsx's own header
// for the full account, including why the loop row is still READ-ONLY (no
// "×" — `help_stakeholders` has no delete route).
//
// SUPERSEDED AGAIN, 20 Sep 2026 — Aurora, verbatim: "On ticket detail, remove
// the pencil from the Stakeholders section (should be only on the edit
// screen)." The "now also EDITABLE" clause two paragraphs up is retired: the
// inline edit pen + `Select` this file used to prove (over a mocked
// `tenancy.accountDetail`) is deleted from the component, not merely hidden.
// The two tests that proved it are replaced below with tests proving the
// opposite — no pen renders, ever, even when the old gating props are still
// passed — because `raised_by_contact_id` now has exactly one door,
// `help-form-dialog.tsx`'s own "Raised by" field on the ticket's edit screen.
// Also 20 Sep 2026: "Avatars are always a round image" retires the square
// band this suite otherwise never asserted on directly (it read `PersonCard`
// through text and structure, never through `shape=`), so nothing here
// needed to change for that ruling on its own.
//
// ASSIGNED TO MOVED OUT, 21 SEP 2026, TWICE THE SAME DAY. It landed inside
// this component first (Aurora, verbatim: "both on story detail and ticket
// detail we need to see to whom it's assigned, normally this gets inherited
// from the app"), then her very next ruling, reading that back, moved it
// back out: "nono assigned to on the very top, a different card from
// stakeholders!" `AssignedToCard` (exported from `help-stakeholders.tsx`
// beside `HelpStakeholders`) is its own top-level `Card` now, never nested
// inside this one, rendered as the ticket page's own FIRST side panel
// (`ticket-detail-body.tsx`'s `assignedTo` slot). The "HelpStakeholders,
// Assigned to, first" describe block this comment used to sit above is
// replaced below with two things: a suite over `AssignedToCard` standing
// alone, and a suite proving `HelpStakeholders` carries none of it any more.
//
// AND THEN `AssignedToCard` ITSELF WENT READ-ONLY, SAME DAY. Aurora, reading
// the card back, verbatim: "ok, but rmeove the edit button (this can be
// editedfrom dtory edit screen). rmeove the 'use the apps lead' text." The
// pen, the Select it opened and the "Use the app's lead" clear button are
// deleted from the component, not merely hidden, the same shape the 20 Sep
// 2026 ruling above already took on Raised by's own pen. The `describe`
// blocks below that used to drive the pen open, pick an option and press the
// clear button are replaced by tests proving none of that renders any more,
// ever, even with the old gating props still passed; the one remaining door
// onto `assigneeId` is `help-form-dialog-assignee.test.tsx`'s own field on
// the ticket's edit screen.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import type * as React from "react"
import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { HelpStakeholder } from "@shared/types"
import { HelpStakeholders, AssignedToCard } from "@/components/tickets/help-stakeholders"
import { TicketDetailBody, TicketSidePanel, TICKET_PANEL_ANCHOR } from "@/components/tickets/ticket-detail-body"

afterEach(cleanup)

const AURORA: HelpStakeholder = {
  userId: "u-2",
  name: "Aurora",
  email: "aurora@kwapso.com",
  imageUrl: null,
  origin: "admin",
}

const MAX: HelpStakeholder = {
  userId: "u-3",
  name: "Max Mustermann",
  email: "max@bergman.example",
  imageUrl: null,
  origin: "raiser",
}

// THE PLAIN SURFACE, APP WIDE (rulebook L43, 21 Sep 2026) — `TicketSidePanel`
// defaults to plain now. These two cases used to read the other way round
// (boxed was the default, plain the tickets-only opt-in); the ruling swapped
// them, so the DEFAULT case asserts the plain drawing and `boxed` survives as
// the opposite decision a call site spells and `PAPER_ON_PURPOSE` names.
describe("TicketSidePanel — surface", () => {
  it("boxed (spelled at the call site) carries data-variant=\"default\" and p-4 on its content", () => {
    render(
      <TicketSidePanel title="Stakeholders" surface="boxed">
        content
      </TicketSidePanel>
    )
    const card = screen.getByText("Stakeholders").closest('[data-slot="card"]') as HTMLElement
    expect(card.getAttribute("data-variant")).toBe("default")
    expect(card.getAttribute("data-surface")).toBeNull()
    const content = card.querySelector('[data-slot="card-content"]') as HTMLElement
    expect(content.className).toContain("p-4")
  })

  it("plain (the default, no prop at all) carries data-variant=\"plain\", data-surface=\"plain\", and no p-4 on its content", () => {
    render(<TicketSidePanel title="Stakeholders">content</TicketSidePanel>)
    const card = screen.getByText("Stakeholders").closest('[data-slot="card"]') as HTMLElement
    expect(card.getAttribute("data-variant")).toBe("plain")
    expect(card.getAttribute("data-surface")).toBe("plain")
    const content = card.querySelector('[data-slot="card-content"]') as HTMLElement
    expect(content.className).not.toContain("p-4")
  })

  it("still draws the title, the count and the children on the plain default", () => {
    render(
      <TicketSidePanel title="Stakeholders" count="4">
        <div>row</div>
      </TicketSidePanel>
    )
    expect(screen.getByText("Stakeholders")).toBeTruthy()
    expect(screen.getByText("4")).toBeTruthy()
    expect(screen.getByText("row")).toBeTruthy()
  })
})

describe("HelpStakeholders — the empty state", () => {
  it("says just the raiser and the admins so far, with no picker and no intro sentence", () => {
    render(<HelpStakeholders stakeholders={[]} />)
    expect(screen.getByText("Just the person who raised it and your admins so far.")).toBeTruthy()
    expect(screen.queryByText("Pick someone to keep in the loop")).toBeNull()
    expect(
      screen.queryByText(
        "Everyone kept in the loop on this ticket, the person who raised it, your admins, and anyone mentioned."
      )
    ).toBeNull()
  })
})

describe("HelpStakeholders — Raised by, one tile", () => {
  it("renders the raiser's face and name, labelled 'Raised by', with no email and no raw origin word", () => {
    render(<HelpStakeholders stakeholders={[AURORA, MAX]} />)
    // R54 — a client contact (origin: "raiser") keeps their name WHOLE.
    const card = screen.getByText("Max Mustermann").closest('[data-slot="stakeholder-card"]') as HTMLElement
    expect(card).toBeTruthy()
    expect(within(card).getByText("Raised by")).toBeTruthy()
    expect(screen.queryByText("max@bergman.example")).toBeNull()
    expect(screen.queryByText("Raiser")).toBeNull()
  })

  // CLIENT RULING, 21 Sep 2026, verbatim, reviewing the ticket detail whose
  // side sections are now plain cards: "stakeholders raised by design like in
  // the loop (chip like)." Supersedes the 19 Sep "horizontal card, avatar on
  // the left, raised by + name stacked on the right" shape this test used to
  // prove (a `Card variant="raised"` with the chip drawn INSIDE the
  // `PersonCard` as its own overline) — see this file's own header and
  // help-stakeholders.tsx's for the account.
  it("draws the tile as a face+name chip, like the loop — the eyebrow sits above the chip row, no raised tile around it", () => {
    render(<HelpStakeholders stakeholders={[AURORA, MAX]} />)
    const tile = screen.getByText("Max Mustermann").closest('[data-slot="stakeholder-card"]') as HTMLElement
    // No raised tile around the chip any more — a plain div, no kit `Card`.
    expect(tile.getAttribute("data-variant")).toBeNull()
    expect(tile.querySelector('[data-slot="card"]')).toBeNull()

    const chipEl = screen.getByText("Raised by")
    const nameEl = screen.getByText("Max Mustermann")
    expect(tile.contains(chipEl), "the eyebrow sits inside the tile, above the chip row").toBe(true)
    expect(tile.contains(nameEl)).toBe(true)

    // The eyebrow is OUTSIDE the PersonCard's own column now — the loop's own
    // position, a label ABOVE the wrapping row, never PersonCard's own `chip`
    // slot (which would mark its column `items-start`).
    const nameColumn = nameEl.parentElement as HTMLElement
    expect(nameColumn.contains(chipEl), "the eyebrow is no longer stacked inside the name's own column").toBe(false)

    // DOM order: the eyebrow row comes before the chip row, top over bottom.
    const children = Array.from(tile.children)
    const eyebrowRowIndex = children.findIndex((c) => c.contains(chipEl))
    const chipRowIndex = children.findIndex((c) => c.contains(nameEl))
    expect(eyebrowRowIndex).toBeGreaterThan(-1)
    expect(chipRowIndex).toBeGreaterThan(-1)
    expect(eyebrowRowIndex, "the eyebrow row sits above the chip row").toBeLessThan(chipRowIndex)
  })

  it("draws the chip at the loop's own face size (size=\"choice\"), the loop's exact PersonCard shape", () => {
    render(<HelpStakeholders stakeholders={[AURORA, MAX]} />)
    const raisedByTile = screen.getByText("Max Mustermann").closest('[data-slot="stakeholder-card"]') as HTMLElement
    const raisedByRow = raisedByTile.querySelector(".flex-wrap") as HTMLElement
    expect(raisedByRow, "the chip sits inside a flex-wrap row, the loop's own wrapping row shape").toBeTruthy()
    expect(raisedByRow.className).toContain("gap-3")
  })

  it("draws exactly one Raised-by tile, never one per admitted/mentioned/added stakeholder", () => {
    render(<HelpStakeholders stakeholders={[AURORA, MAX]} />)
    expect(document.querySelectorAll('[data-slot="stakeholder-card"]').length).toBe(1)
  })

  it("is a plain fact, not an editor — no pen at all", () => {
    render(<HelpStakeholders stakeholders={[AURORA, MAX]} />)
    expect(screen.queryByLabelText("Edit")).toBeNull()
  })

  // Aurora, 20 Sep 2026, verbatim: "On ticket detail, remove the pencil from
  // the Stakeholders section (should be only on the edit screen)." This used
  // to prove the OPPOSITE — that gating these props on drew an edit pen and
  // an inline `Select` right here. There is no pen left to gate: the props
  // are still accepted (the call site in help-detail.tsx still passes them —
  // see help-stakeholders.tsx's own header) but change nothing about what
  // renders, which is the point of this test.
  it("draws no edit pen and no Select even when the old gating props are passed", () => {
    const onChange = vi.fn(async () => {})
    render(
      <HelpStakeholders
        stakeholders={[AURORA, MAX]}
        accountId="account-1"
        raisedByContactId={null}
        raisedByContactName={null}
        canEditRaisedBy
        onChangeRaisedBy={onChange}
      />
    )
    expect(screen.queryByLabelText("Edit")).toBeNull()
    expect(screen.queryByRole("combobox")).toBeNull()
    // Not clickable either — the card is a fact, not a door.
    const card = screen.getByText("Max Mustermann").closest('[data-slot="stakeholder-card"]') as HTMLElement
    const content = card.firstElementChild as HTMLElement
    expect(content.className).not.toContain("cursor-pointer")
  })

  // SUPERSEDED 21 Sep 2026 by the chip ruling above: the 20 Sep 2026 "SMALLER,
  // TOO" padding fix (`py-3`/`lg:py-3` beating the kit's own
  // `lg:py-[var(--space-7)]`) applied to a `Card`/`CardContent` this tile no
  // longer renders — there is no raised tile left to carry an lg:py override.
  // This test now proves the ABSENCE of that whole kit-padding surface,
  // rather than one particular class winning on it.
  it("carries no kit CardContent padding at all — there is no raised tile left to override", () => {
    render(<HelpStakeholders stakeholders={[AURORA, MAX]} />)
    const tile = screen.getByText("Max Mustermann").closest('[data-slot="stakeholder-card"]') as HTMLElement
    expect(tile.querySelector('[data-slot="card-content"]')).toBeNull()
  })

  it("takes no LOOP-picker props — StaffPillPicker/onAdd/canAdd/members are gone from its signature", () => {
    // The component's own contract for the LOOP half stayed shrunk (17 Sep
    // 2026 ruling); reading the SOURCE'S own export signature narrowly so a
    // regression fails here even if a call site kept passing `stakeholders`
    // alone. `raisedByContactId`/`raisedByContactName`/`accountId`/
    // `canEditRaisedBy`/`onChangeRaisedBy` are a NEW, narrower capability —
    // editing the one field the door already supports — not a return of the
    // old loop picker, so they are deliberately not in this deny-list.
    const src = readFileSync(
      join(import.meta.dirname, "..", "components", "tickets", "help-stakeholders.tsx"),
      "utf8"
    )
    const signature = src.slice(src.indexOf("export function HelpStakeholders"), src.indexOf("{\n  const"))
    expect(signature).not.toContain("StaffPillPicker")
    expect(signature).not.toContain("canAddToLoop")
    expect(signature).not.toContain("onAddStakeholder")
    expect(signature).not.toContain("loopMembers")
  })
})

describe("HelpStakeholders — On the loop, one horizontal row", () => {
  it("labels the loop card 'On the loop' once, not per person", () => {
    render(<HelpStakeholders stakeholders={[AURORA, MAX]} />)
    expect(screen.getAllByText("On the loop").length).toBe(1)
  })

  it("draws the loop members in ONE group, side by side, wrapping — not a grid of tiles", () => {
    const { container } = render(<HelpStakeholders stakeholders={[AURORA, MAX]} />)
    const loopCard = container.querySelector('[data-slot="loop-card"]') as HTMLElement
    expect(loopCard).toBeTruthy()
    expect(screen.getByText("Aurora").closest('[data-slot="loop-card"]')).toBe(loopCard)
    // No grid-cols-3 census any more — the row is a flex-wrap, not a grid.
    expect(loopCard.innerHTML).not.toContain("grid-cols-3")
    const row = loopCard.querySelector(".flex-wrap") as HTMLElement
    expect(row).toBeTruthy()
  })

  // NO BACKGROUND — Aurora, 22 Sep 2026, verbatim: "On the loop still has a
  // background. Remove that in tickets." The loop's own `data-slot=
  // "loop-card"` wrapper is a plain `<div>` now, the same shape Raised by and
  // Assigned to already draw (no kit `Card` around either — see this file's
  // own "draws the tile as a face+name chip" test above, over Raised by).
  it("draws no Card around the loop — a plain div, eyebrow then chip row directly on the page", () => {
    const { container } = render(<HelpStakeholders stakeholders={[AURORA, MAX]} />)
    const loopCard = container.querySelector('[data-slot="loop-card"]') as HTMLElement
    expect(loopCard).toBeTruthy()
    expect(loopCard.tagName).toBe("DIV")
    expect(loopCard.getAttribute("data-variant")).toBeNull()
    expect(loopCard.querySelector('[data-slot="card"]')).toBeNull()
    // The eyebrow sits directly inside the plain wrapper, above the chip row.
    const eyebrow = within(loopCard).getByText("On the loop")
    expect(loopCard.contains(eyebrow)).toBe(true)
  })

  it("names a colleague by their first name (staffNameFromSnapshot), never their raw origin word", () => {
    render(<HelpStakeholders stakeholders={[AURORA, MAX]} />)
    expect(screen.getByText("Aurora")).toBeTruthy()
    expect(screen.queryByText("aurora@kwapso.com")).toBeNull()
    expect(screen.queryByText("Admin")).toBeNull()
  })

  it("carries no remove control — the loop stays add-only (help_stakeholders has no delete route)", () => {
    render(<HelpStakeholders stakeholders={[AURORA, MAX]} />)
    expect(screen.queryByText("×")).toBeNull()
    expect(screen.queryByLabelText(/remove/i)).toBeNull()
  })

  it("does not render the loop card at all when nobody but the raiser is on the ticket", () => {
    const { container } = render(<HelpStakeholders stakeholders={[MAX]} />)
    expect(container.querySelector('[data-slot="loop-card"]')).toBeNull()
  })
})

// HELPSTAKEHOLDERS CARRIES NONE OF IT ANY MORE. Aurora's second 21 Sep 2026
// ruling, verbatim: "nono assigned to on the very top, a different card from
// stakeholders!", this suite proves the row is gone from this component,
// not merely moved and still reachable from here too.
describe("HelpStakeholders no longer draws an Assigned to row", () => {
  const MEMBERS = [
    { id: "u-staff", name: "Alaap Kanchwala", photo: null },
    { id: "u-lead", name: "Petya Bletsova", photo: null },
  ]

  it("renders no 'Assigned to' text and no assignee tile, even when the old props are passed", () => {
    // Cast through `unknown` deliberately: these props no longer exist on
    // `HelpStakeholders`'s own type (proved positionally below), passed
    // anyway at the RUNTIME boundary to prove a stale caller cannot smuggle
    // the row back through them.
    const staleProps = {
      stakeholders: [],
      assigneeId: "u-staff",
      assigneeName: "Alaap Kanchwala",
      appId: "app-1",
      appName: "Bergman dispatch",
      appAssigneeId: "u-lead",
      members: MEMBERS,
      canEditAssignee: true,
    } as unknown as React.ComponentProps<typeof HelpStakeholders>
    render(<HelpStakeholders {...staleProps} />)
    expect(screen.queryByText("Assigned to")).toBeNull()
    expect(screen.queryByText("From the app")).toBeNull()
    // `assignee-tile` is `AssignedToCard`'s own tile slot (redesigned 21 Sep
    // 2026, see this file's own header on the `AssignedToCard` describe
    // block below); its absence here is what proves this component still
    // draws none of the assignee row, not merely that an old slot name is
    // gone.
    expect(document.querySelector('[data-slot="assignee-tile"]')).toBeNull()
    expect(screen.queryByLabelText("Change who is assigned")).toBeNull()
  })

  it("takes no assignee props at all, HelpStakeholders/AssignedToCard is a signature census, not a render one", () => {
    // The render test above proves a stale prop is IGNORED; this proves the
    // TYPE no longer offers it, the same discipline this file's own "takes
    // no LOOP-picker props" test above holds `HelpStakeholders` to.
    const src = readFileSync(
      join(import.meta.dirname, "..", "components", "tickets", "help-stakeholders.tsx"),
      "utf8"
    )
    const at = src.indexOf("export function HelpStakeholders")
    const signature = src.slice(at, src.indexOf("{\n  const", at))
    for (const field of ["assigneeId", "assigneeName", "appAssigneeId", "canEditAssignee", "onChangeAssignee"])
      expect(signature, `HelpStakeholders must not declare ${field} any more`).not.toContain(field)
  })
})

// ASSIGNED TO, ITS OWN COMPONENT NOW, `AssignedToCard`. Aurora's ruling,
// verbatim, 21 Sep 2026: "both on story detail and ticket detail we need to
// see to whom it's assigned, normally this gets inherited from the app."
// Landed inside `HelpStakeholders` first, moved out the same day by her next
// ruling ("nono assigned to on the very top, a different card from
// stakeholders!"). Every test below renders `AssignedToCard` alone, the same
// way `HelpStakeholders`'s own suites above render it alone.
//
// REDESIGNED AS THE STAKEHOLDERS CARD'S TWIN, 21 Sep 2026. Aurora, over a
// screenshot of the Stakeholders card: "I wanted the 'Assigned to' to be
// like this: the count and the horizontal card. Redesign it." Validated the
// same round: "4. Validated but redesigned as explained." The card no longer
// carries its own `data-slot="assignee-card"`, it opens with the SAME
// `<TicketSidePanel>` register "Stakeholders" itself renders through
// (help-detail.tsx's own call), whose `<Card>` carries the kit's plain
// `data-slot="card"`, so every test below locates the card by its own
// title-with-count heading (`assignedCard()`, below) rather than a bespoke
// slot name, and the face+name tile inside it carries its own
// `data-slot="assignee-tile"`.
describe("AssignedToCard", () => {
  const MEMBERS = [
    { id: "u-staff", name: "Alaap Kanchwala", photo: null },
    { id: "u-lead", name: "Petya Bletsova", photo: null },
  ]

  // The panel's own title never changes with state ("Assigned to" always),
  // so this is safe to use across every state below, unlike `screen.getByText`
  // on its own, which can match the tile's own eyebrow too when the record
  // carries its own person (the chip also reads "Assigned to" there).
  function assignedCard(): HTMLElement {
    const titleSpan = screen.getByText("Assigned to", { selector: "h3 span.truncate" })
    return titleSpan.closest('[data-slot="card"]') as HTMLElement
  }

  it("stands on its own top-level Card, variant default, the Stakeholders card's own title-with-count register (R67)", () => {
    render(<AssignedToCard />)
    const card = assignedCard()
    expect(card).toBeTruthy()
    // PLAIN SINCE 21 SEP 2026 (rulebook L43) — this asserted `"default"`
    // while `TicketSidePanel`'s own default was boxed. The card is still the
    // card and still the top-level one; what changed is that it paints
    // nothing, which is the whole ruling.
    expect(card.getAttribute("data-variant")).toBe("plain")
    expect(screen.getByText("Nobody yet.")).toBeTruthy()
  })

  // PLAIN BY DEFAULT, NO PROP AT ALL — rulebook L43 went app wide on 21 Sep
  // 2026 and `TicketSidePanel`'s own default is `"plain"`. These two cases
  // used to be "forwards surface=\"plain\"" and "defaults to boxed"; the
  // forwarding prop had exactly one caller, which passed the value that is
  // now the default, so it was retired with the experiment and the second
  // case asserted the opposite of the ruling. One case now, and it is the
  // ruling: nobody says anything and the card draws no box.
  it("draws its shell plain with no surface prop at all", () => {
    render(<AssignedToCard />)
    const card = assignedCard()
    expect(card.getAttribute("data-variant")).toBe("plain")
    expect(card.getAttribute("data-surface")).toBe("plain")
    const content = card.querySelector('[data-slot="card-content"]') as HTMLElement
    expect(content.className).not.toContain("p-4")
  })

  it("shows the inherited line when the ticket has none of its own and the app does", () => {
    render(
      <AssignedToCard appId="app-1" appName="Bergman dispatch" appAssigneeId="u-lead" members={MEMBERS} />
    )
    const card = assignedCard()
    expect(within(card).getByText("Petya Bletsova")).toBeTruthy()
    expect(within(card).getByText(/Inherited from/)).toBeTruthy()
    expect(within(card).getByText(/Bergman dispatch/)).toBeTruthy()
  })

  it("the ticket's own assignee wins, no inherited line", () => {
    render(
      <AssignedToCard
        assigneeId="u-staff"
        assigneeName="Alaap Kanchwala"
        appId="app-1"
        appName="Bergman dispatch"
        appAssigneeId="u-lead"
        members={MEMBERS}
      />
    )
    const card = assignedCard()
    expect(within(card).getByText("Alaap Kanchwala")).toBeTruthy()
    expect(within(card).queryByText(/Inherited from/)).toBeNull()
  })

  // THE TITLE-WITH-COUNT REGISTER, THE SAME ONE "Stakeholders" ITSELF USES
  // (help-detail.tsx's `<TicketSidePanel title={t("Stakeholders")}
  // count={stakeholderBadge}>`): `formatCount`, 1 when someone is assigned
  // or inherited, nothing at all (never a bare "0") otherwise.
  describe("the count beside the title, the Stakeholders card's own register", () => {
    it("shows no count when nobody is assigned and there is nothing to inherit", () => {
      render(<AssignedToCard />)
      const titleSpan = screen.getByText("Assigned to", { selector: "h3 span.truncate" })
      const heading = titleSpan.closest("h3") as HTMLElement
      expect(heading.querySelector("span:not(.truncate)")).toBeNull()
    })

    it("counts 1 when the ticket carries its own assignee", () => {
      render(<AssignedToCard assigneeId="u-staff" assigneeName="Alaap Kanchwala" members={MEMBERS} />)
      const titleSpan = screen.getByText("Assigned to", { selector: "h3 span.truncate" })
      const heading = titleSpan.closest("h3") as HTMLElement
      expect(heading.querySelector("span:not(.truncate)")?.textContent).toBe("1")
    })

    it("counts 1 when the ticket has none of its own but inherits one from the app", () => {
      render(
        <AssignedToCard appId="app-1" appName="Bergman dispatch" appAssigneeId="u-lead" members={MEMBERS} />
      )
      const titleSpan = screen.getByText("Assigned to", { selector: "h3 span.truncate" })
      const heading = titleSpan.closest("h3") as HTMLElement
      expect(heading.querySelector("span:not(.truncate)")?.textContent).toBe("1")
    })
  })

  // THE TILE'S OWN EYEBROW, "Assigned to" for the record's own person,
  // "From the app" (the app's own name kept on its existing muted second
  // line) when inherited. Scoped to the tile itself (`data-slot=
  // "assignee-tile"`) so the panel's own "Assigned to" title never collides
  // with the tile's identical eyebrow word in the own-person case.
  describe("the tile's own eyebrow, in both states", () => {
    it("reads 'Assigned to' when the record carries its own person", () => {
      render(<AssignedToCard assigneeId="u-staff" assigneeName="Alaap Kanchwala" members={MEMBERS} />)
      const tile = document.querySelector('[data-slot="assignee-tile"]') as HTMLElement
      expect(within(tile).getByText("Assigned to")).toBeTruthy()
      expect(within(tile).queryByText("From the app")).toBeNull()
    })

    it("reads 'From the app' when inherited, with the app's own name on its own muted line", () => {
      render(
        <AssignedToCard appId="app-1" appName="Bergman dispatch" appAssigneeId="u-lead" members={MEMBERS} />
      )
      const tile = document.querySelector('[data-slot="assignee-tile"]') as HTMLElement
      expect(within(tile).getByText("From the app")).toBeTruthy()
      expect(within(tile).queryByText("Assigned to")).toBeNull()
      expect(within(tile).getByText(/Inherited from/)).toBeTruthy()
      expect(within(tile).getByText(/Bergman dispatch/)).toBeTruthy()
    })
  })

  // THE TILE ITSELF IS THE SAME COMPONENT RAISED BY DRAWS ITSELF WITH
  // (`StakeholderTile`, help-stakeholders.tsx), not a second, hand-copied
  // one that can drift the first time either is touched. Proved on the
  // rendered classes rather than on the source, so a regression that
  // reintroduces a copy with even one different class fails here.
  //
  // AND NEITHER CARRIES A RAISED TILE ANY MORE — Aurora's 21 Sep 2026 ruling,
  // "stakeholders raised by design like in the loop (chip like)" / "same with
  // assigned to (chiplike)": both are a face+name chip now, no
  // `data-variant="raised"` `Card` standing around either one.
  it("the assigned-to tile shares the Raised by tile's own classes, and neither carries a raised Card any more", () => {
    render(<HelpStakeholders stakeholders={[MAX]} />)
    const raisedByTile = screen.getByText("Max Mustermann").closest('[data-slot="stakeholder-card"]') as HTMLElement
    const raisedByContent = raisedByTile.firstElementChild as HTMLElement
    const raisedByClasses = raisedByContent.className
    expect(raisedByTile.getAttribute("data-variant")).toBeNull()
    expect(raisedByTile.querySelector('[data-slot="card"]')).toBeNull()

    cleanup()

    render(<AssignedToCard assigneeId="u-staff" assigneeName="Alaap Kanchwala" members={MEMBERS} />)
    const assignedTile = document.querySelector('[data-slot="assignee-tile"]') as HTMLElement
    const assignedContent = assignedTile.firstElementChild as HTMLElement

    expect(assignedContent.className).toBe(raisedByClasses)
    expect(assignedTile.getAttribute("data-variant")).toBeNull()
    expect(assignedTile.querySelector('[data-slot="card"]')).toBeNull()
  })

  // READ-ONLY. Aurora's ruling, 21 Sep 2026, verbatim, reading the card
  // back: "ok, but rmeove the edit button (this can be editedfrom dtory edit
  // screen). rmeove the 'use the apps lead' text." No pencil, no Select, no
  // clear action, in EITHER state, ever, even with the old gating props
  // still passed at the runtime boundary, the same proof
  // `HelpStakeholders`'s own "draws no edit pen and no Select even when the
  // old gating props are passed" test above holds Raised by to.
  describe("read-only, no pencil, no Select, no clear action, in either state", () => {
    it("draws no pen, no combobox and no clear text, with the ticket's own assignee", () => {
      const staleProps = {
        assigneeId: "u-staff",
        assigneeName: "Alaap Kanchwala",
        appId: "app-1",
        appName: "Bergman dispatch",
        appAssigneeId: "u-lead",
        members: MEMBERS,
        canEditAssignee: true,
        onChangeAssignee: vi.fn(async () => {}),
      } as unknown as React.ComponentProps<typeof AssignedToCard>
      render(<AssignedToCard {...staleProps} />)
      expect(screen.queryByLabelText("Change who is assigned")).toBeNull()
      expect(screen.queryByRole("combobox")).toBeNull()
      expect(screen.queryByText("Use the app's lead")).toBeNull()
    })

    it("draws no pen, no combobox and no clear text, inheriting from the app", () => {
      const staleProps = {
        appId: "app-1",
        appName: "Bergman dispatch",
        appAssigneeId: "u-lead",
        members: MEMBERS,
        canEditAssignee: true,
        onChangeAssignee: vi.fn(async () => {}),
      } as unknown as React.ComponentProps<typeof AssignedToCard>
      render(<AssignedToCard {...staleProps} />)
      expect(screen.queryByLabelText("Change who is assigned")).toBeNull()
      expect(screen.queryByRole("combobox")).toBeNull()
      expect(screen.queryByText("Use the app's lead")).toBeNull()
    })

    it("draws no pen, no combobox and no clear text, in the empty state", () => {
      const staleProps = {
        canEditAssignee: true,
        onChangeAssignee: vi.fn(async () => {}),
      } as unknown as React.ComponentProps<typeof AssignedToCard>
      render(<AssignedToCard {...staleProps} />)
      expect(screen.getByText("Nobody yet.")).toBeTruthy()
      expect(screen.queryByLabelText("Change who is assigned")).toBeNull()
      expect(screen.queryByRole("combobox")).toBeNull()
      expect(screen.queryByText("Use the app's lead")).toBeNull()
    })

    // THE TYPE NO LONGER OFFERS THEM AT ALL, the same discipline this file's
    // own `HelpStakeholders` census above holds the loop props to.
    it("takes no editing props at all, a signature census, not a render one", () => {
      const src = readFileSync(
        join(import.meta.dirname, "..", "components", "tickets", "help-stakeholders.tsx"),
        "utf8"
      )
      const at = src.indexOf("export function AssignedToCard")
      const signature = src.slice(at, src.indexOf("{\n  const", at))
      for (const field of ["canEditAssignee", "onChangeAssignee", "pickingAssignee"])
        expect(signature, `AssignedToCard must not declare or use ${field} any more`).not.toContain(field)
    })

    it("the tile still reflects a re-render, own assignee to inherited to empty, with no door of its own", () => {
      // A round trip in miniature, over ordinary prop changes a parent
      // (`help-detail.tsx`) makes after ITS OWN write elsewhere (now
      // `help-form-dialog.tsx`'s "Assigned to" field) resolves. The card's
      // job is only to read `effectiveAssignee` off whatever it is handed;
      // it never calls a door itself any more.
      const { rerender } = render(
        <AssignedToCard
          assigneeId="u-staff"
          assigneeName="Alaap Kanchwala"
          appId="app-1"
          appName="Bergman dispatch"
          appAssigneeId="u-lead"
          members={MEMBERS}
        />
      )
      let card = assignedCard()
      expect(within(card).getByText("Alaap Kanchwala")).toBeTruthy()

      rerender(
        <AssignedToCard
          assigneeId={null}
          assigneeName={null}
          appId="app-1"
          appName="Bergman dispatch"
          appAssigneeId="u-lead"
          members={MEMBERS}
        />
      )
      card = assignedCard()
      expect(within(card).getByText("Petya Bletsova")).toBeTruthy()
      expect(within(card).getByText(/Inherited from/)).toBeTruthy()

      rerender(<AssignedToCard assigneeId={null} assigneeName={null} members={MEMBERS} />)
      card = assignedCard()
      expect(within(card).getByText("Nobody yet.")).toBeTruthy()
    })
  })
})

// THE TICKET PAGE'S OWN LAYOUT, ASSIGNED TO LEADS THE SIDE COLUMN. Aurora's
// ruling, verbatim, 21 Sep 2026: "nono assigned to on the very top, a
// different card from stakeholders!" Rendered against the real
// `TicketDetailBody` (never a hand-rolled stand-in), so a regression to the
// slot order fails here rather than only in a full page-level render.
describe("TicketDetailBody, Assigned to is the first panel in the side column", () => {
  it("the assignedTo anchor sits before stories/time/stakeholders, in the same side column", () => {
    render(
      <TicketDetailBody
        assignedTo={<div>ASSIGNED-MARK</div>}
        thread={<div>thread</div>}
        composer={<div>composer</div>}
        stories={<div>STORIES-MARK</div>}
        time={<div>TIME-MARK</div>}
        stakeholders={<div>STAKEHOLDERS-MARK</div>}
        footer={<div>footer</div>}
      />
    )
    const assignedAnchor = document.getElementById(TICKET_PANEL_ANCHOR.assignedTo) as HTMLElement
    const storiesAnchor = document.getElementById(TICKET_PANEL_ANCHOR.stories) as HTMLElement
    const timeAnchor = document.getElementById(TICKET_PANEL_ANCHOR.time) as HTMLElement
    const stakeholdersAnchor = document.getElementById(TICKET_PANEL_ANCHOR.stakeholders) as HTMLElement
    expect(assignedAnchor).toBeTruthy()
    expect(within(assignedAnchor).getByText("ASSIGNED-MARK")).toBeTruthy()

    // Same side column as the other three.
    const sideColumn = storiesAnchor.parentElement as HTMLElement
    expect(assignedAnchor.parentElement).toBe(sideColumn)
    expect(timeAnchor.parentElement).toBe(sideColumn)
    expect(stakeholdersAnchor.parentElement).toBe(sideColumn)

    // FIRST, ahead of Stories, Time and Stakeholders, in that order.
    const order = Array.from(sideColumn.children)
    expect(order.indexOf(assignedAnchor)).toBe(0)
    expect(order.indexOf(assignedAnchor)).toBeLessThan(order.indexOf(storiesAnchor))
    expect(order.indexOf(storiesAnchor)).toBeLessThan(order.indexOf(timeAnchor))
    expect(order.indexOf(timeAnchor)).toBeLessThan(order.indexOf(stakeholdersAnchor))
  })
})

// THE PLAIN-SURFACE SEPARATOR (rulebook L43) — one hairline between
// consecutive sections in the side column, nothing above the first, nothing
// below the last, and no stray hairline beside a section that rendered
// nothing at all.
//
// THE SEAM IS THE KIT'S SINCE 21 SEP 2026 (v1.2.149). `ticket-detail-body.tsx`
// used to run its own `sawVisibleSection` walk and draw a bare `<Separator>`;
// it hands the column to `RecordSections` now, which draws the same rule
// between consecutive VISIBLE children and marks it
// `data-slot="record-sections-seam"` (its `data-slot` lands after the kit
// `Separator`'s own, so the seam's mark is the one that survives). These
// assertions therefore look for THAT slot rather than a bare `"separator"` —
// which also makes them prove the kit component is what drew the rule, not a
// hand-rolled copy that happens to look like one. The side column is now
// `RecordSections`' own box, so below `lg` the conversation is its SIBLING
// rather than its last child, and the old "what sits right after
// stakeholders" hedge is no longer needed.
describe("TicketDetailBody, the plain-surface separator between side-column sections", () => {
  it("draws exactly one Separator between each of the four visible sections — three total, none above the first or below the last", () => {
    render(
      <TicketDetailBody
        assignedTo={<div>ASSIGNED-MARK</div>}
        thread={<div>thread</div>}
        composer={<div>composer</div>}
        stories={<div>STORIES-MARK</div>}
        time={<div>TIME-MARK</div>}
        stakeholders={<div>STAKEHOLDERS-MARK</div>}
        footer={<div>footer</div>}
      />
    )
    const assignedAnchor = document.getElementById(TICKET_PANEL_ANCHOR.assignedTo) as HTMLElement
    const stakeholdersAnchor = document.getElementById(TICKET_PANEL_ANCHOR.stakeholders) as HTMLElement
    const sideColumn = assignedAnchor.parentElement as HTMLElement
    const children = Array.from(sideColumn.children)
    const separators = children.filter((c) => c.getAttribute("data-slot") === "record-sections-seam")
    expect(separators.length).toBe(3)
    // Nothing above the first section, nothing below the last — scoped to
    // the four tickets sections: below `lg` (jsdom's own default width) the
    // conversation anchor shares this same parent, appended AFTER
    // stakeholders (`{sidePanels}{conversation}`), so "the last child of the
    // parent" is not the right question — "what sits right after
    // stakeholders" is.
    const assignedIdx = children.indexOf(assignedAnchor)
    const stakeholdersIdx = children.indexOf(stakeholdersAnchor)
    expect(assignedIdx).toBe(0)
    expect(stakeholdersIdx, "stakeholders is the column's last child — nothing below the last").toBe(
      children.length - 1
    )
    // Alternating anchor/seam/anchor/seam/anchor/seam/anchor, over exactly
    // the four tickets sections.
    expect(children.map((c) => c.getAttribute("data-slot") === "record-sections-seam")).toEqual([
      false,
      true,
      false,
      true,
      false,
      true,
      false,
    ])
  })

  it("draws no stray separator around a section whose slot is absent (time === null)", () => {
    render(
      <TicketDetailBody
        assignedTo={<div>ASSIGNED-MARK</div>}
        thread={<div>thread</div>}
        composer={<div>composer</div>}
        stories={<div>STORIES-MARK</div>}
        time={null}
        stakeholders={<div>STAKEHOLDERS-MARK</div>}
        footer={<div>footer</div>}
      />
    )
    const assignedAnchor = document.getElementById(TICKET_PANEL_ANCHOR.assignedTo) as HTMLElement
    const stakeholdersAnchor = document.getElementById(TICKET_PANEL_ANCHOR.stakeholders) as HTMLElement
    const sideColumn = assignedAnchor.parentElement as HTMLElement
    const children = Array.from(sideColumn.children)
    const separators = children.filter((c) => c.getAttribute("data-slot") === "record-sections-seam")
    // Only two separators now: assignedTo|stories and stories|stakeholders —
    // the absent time section leaves no stray hairline on either side of it.
    expect(separators.length).toBe(2)
    const assignedIdx = children.indexOf(assignedAnchor)
    const stakeholdersIdx = children.indexOf(stakeholdersAnchor)
    expect(assignedIdx).toBe(0)
    expect(stakeholdersIdx, "stakeholders is still the last child, with no rule under it").toBe(
      children.length - 1
    )
  })

  it("draws no stray separator around a section EffortCard confirmed empty (timeEmpty=true)", () => {
    render(
      <TicketDetailBody
        assignedTo={<div>ASSIGNED-MARK</div>}
        thread={<div>thread</div>}
        composer={<div>composer</div>}
        stories={<div>STORIES-MARK</div>}
        time={<div>TIME-MARK</div>}
        timeEmpty
        stakeholders={<div>STAKEHOLDERS-MARK</div>}
        footer={<div>footer</div>}
      />
    )
    const assignedAnchor = document.getElementById(TICKET_PANEL_ANCHOR.assignedTo) as HTMLElement
    const sideColumn = assignedAnchor.parentElement as HTMLElement
    const children = Array.from(sideColumn.children)
    const separators = children.filter((c) => c.getAttribute("data-slot") === "record-sections-seam")
    expect(separators.length).toBe(2)
  })
})
