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

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { HelpStakeholder } from "@shared/types"
import { HelpStakeholders } from "@/components/tickets/help-stakeholders"

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

  // CLIENT RULING, 19 Sep 2026, verbatim: "for stakeholder, raised by, use a
  // horizontal card (avatar on the left, raised by + name on the right one
  // on top of the other)." Supersedes the 18 Sep vertical/band shape —
  // see this file's own header and help-stakeholders.tsx's for the account.
  it("draws the tile as a horizontal PersonCard — avatar on the left, the chip over the name on the right", () => {
    render(<HelpStakeholders stakeholders={[AURORA, MAX]} />)
    const chipEl = screen.getByText("Raised by")
    // `PersonCard`'s own horizontal branch (shared/web/person-card.tsx) wraps
    // chip+title in a column marked `items-start`; the vertical/band branch
    // marks the same column `items-center` — the one class that tells the
    // two shapes apart without reaching into PersonCard's own internals.
    const column = chipEl.parentElement as HTMLElement
    expect(column.className).toContain("items-start")
    expect(column.className).not.toContain("items-center")
    const nameEl = screen.getByText("Max Mustermann")
    expect(column.contains(nameEl), "the name sits in the same column as the chip, under it").toBe(true)
    const children = Array.from(column.children)
    const chipIndex = children.indexOf(chipEl)
    const nameIndex = children.findIndex((c) => c.contains(nameEl))
    expect(chipIndex).toBeGreaterThan(-1)
    expect(nameIndex).toBeGreaterThan(-1)
    expect(chipIndex, "the chip ('Raised by') sits above the name — top line over bottom line").toBeLessThan(nameIndex)
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

  // Aurora, 20 Sep 2026, from the live measurement: "the Raised by card in
  // help-stakeholders.tsx measures 102px because CardContent still carries
  // lg:py-[var(--space-7)] beating py-3; remove the lg override so the card
  // is ≈60px at every width." The kit's own `CardContent`
  // (shared/ui/components/card/card.tsx) carries `py-6 lg:py-[var(--space-7)]`
  // — a call site's own `py-3` only wins at the base breakpoint, sharing no
  // prefix with `lg:py-…`, so the kit's own padding kept winning above that
  // width. This locks the app-side override at the SAME breakpoint.
  it("overrides the kit's lg:py padding on the Raised-by card, not only the base one", () => {
    render(<HelpStakeholders stakeholders={[AURORA, MAX]} />)
    const card = screen.getByText("Max Mustermann").closest('[data-slot="stakeholder-card"]') as HTMLElement
    const content = card.firstElementChild as HTMLElement
    expect(content.className).toContain("py-3")
    expect(content.className).toContain("lg:py-3")
    expect(content.className).not.toContain("lg:py-[var(--space-7)]")
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

  it("draws the loop members in ONE card, side by side, wrapping — not a grid of tiles", () => {
    const { container } = render(<HelpStakeholders stakeholders={[AURORA, MAX]} />)
    const loopCard = container.querySelector('[data-slot="loop-card"]') as HTMLElement
    expect(loopCard).toBeTruthy()
    expect(screen.getByText("Aurora").closest('[data-slot="loop-card"]')).toBe(loopCard)
    // No grid-cols-3 census any more — the row is a flex-wrap, not a grid.
    expect(loopCard.innerHTML).not.toContain("grid-cols-3")
    const row = loopCard.querySelector(".flex-wrap") as HTMLElement
    expect(row).toBeTruthy()
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

// ASSIGNED TO. Aurora's ruling, verbatim, 21 Sep 2026: "both on story detail
// and ticket detail we need to see to whom it's assigned, normally this gets
// inherited from the app." Drawn exactly like Raised by, above it, always
// rendered, see help-stakeholders.tsx's own header for the account.
describe("HelpStakeholders, Assigned to, first", () => {
  const MEMBERS = [
    { id: "u-staff", name: "Alaap Kanchwala", photo: null },
    { id: "u-lead", name: "Petya Bletsova", photo: null },
  ]

  it("renders before Raised by, even with no stakeholders at all", () => {
    render(<HelpStakeholders stakeholders={[]} />)
    const assigned = screen.getByText("Assigned to").closest('[data-slot="assignee-card"]') as HTMLElement
    expect(assigned).toBeTruthy()
    expect(screen.getByText("Nobody yet.")).toBeTruthy()
    // Still first in DOM order, ahead of the empty-state sentence below it.
    const empty = screen.getByText("Just the person who raised it and your admins so far.")
    expect(
      assigned.compareDocumentPosition(empty) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  it("shows the inherited line when the ticket has none of its own and the app does", () => {
    render(
      <HelpStakeholders
        stakeholders={[]}
        appId="app-1"
        appName="Bergman dispatch"
        appAssigneeId="u-lead"
        members={MEMBERS}
      />
    )
    const card = screen.getByText("Assigned to").closest('[data-slot="assignee-card"]') as HTMLElement
    expect(within(card).getByText("Petya Bletsova")).toBeTruthy()
    expect(within(card).getByText(/Inherited from/)).toBeTruthy()
    expect(within(card).getByText(/Bergman dispatch/)).toBeTruthy()
  })

  it("the ticket's own assignee wins, no inherited line", () => {
    render(
      <HelpStakeholders
        stakeholders={[]}
        assigneeId="u-staff"
        assigneeName="Alaap Kanchwala"
        appId="app-1"
        appName="Bergman dispatch"
        appAssigneeId="u-lead"
        members={MEMBERS}
      />
    )
    const card = screen.getByText("Assigned to").closest('[data-slot="assignee-card"]') as HTMLElement
    expect(within(card).getByText("Alaap Kanchwala")).toBeTruthy()
    expect(within(card).queryByText(/Inherited from/)).toBeNull()
  })

  it("draws no pen and no Select for a reader with no edit right", () => {
    render(
      <HelpStakeholders
        stakeholders={[]}
        appId="app-1"
        appName="Bergman dispatch"
        appAssigneeId="u-lead"
        members={MEMBERS}
      />
    )
    expect(screen.queryByLabelText("Change who is assigned")).toBeNull()
    expect(screen.queryByRole("combobox")).toBeNull()
  })

  it("the pen opens the kit Select (R90 faces), and picking someone calls the door", async () => {
    const onChangeAssignee = vi.fn(async () => {})
    render(
      <HelpStakeholders
        stakeholders={[]}
        appId="app-1"
        appName="Bergman dispatch"
        appAssigneeId="u-lead"
        members={MEMBERS}
        canEditAssignee
        onChangeAssignee={onChangeAssignee}
      />
    )
    expect(screen.queryByRole("combobox")).toBeNull()
    fireEvent.click(screen.getByLabelText("Change who is assigned"))
    const trigger = document.getElementById("help-assignee") as HTMLElement
    expect(trigger).toBeTruthy()
    fireEvent.click(trigger)
    const option = await screen.findByRole("option", { name: /Alaap Kanchwala/ })
    // R90: every SelectItem over a person carries its own face.
    expect(option.querySelector("[aria-hidden]")).toBeTruthy()
    fireEvent.click(option)
    expect(onChangeAssignee).toHaveBeenCalledWith("u-staff")
  })
})
