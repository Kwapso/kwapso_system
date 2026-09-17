// HELP-STAKEHOLDERS — FACES + NAMES ONLY. Client ruling, 17 Sep 2026, reading
// the deployed V1 ticket page back, verbatim: "Remove all of this from
// stakeholders 'Pick someone to keep in the loop … B Blackbox C Chilavert …
// You can add members, but no one is ever removed.'" And, read together with
// the fact-list removal in the same review: "Everyone kept in the loop on this
// ticket, the person who raised it, your admins, and anyone mentioned." also
// goes. What remains, on the page itself: the stakeholder's face and name,
// nothing else. The picker moved into the ticket edit sheet
// (help-form-dialog-loop-field.test.tsx proves its new home); this file
// proves the component the page renders now takes no picker props at all.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

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

describe("HelpStakeholders — the people list", () => {
  it("renders a face and a name for every stakeholder, and nothing else", () => {
    render(<HelpStakeholders stakeholders={[AURORA, MAX]} />)
    expect(screen.getByText("Aurora")).toBeTruthy()
    // R54 — a client contact (origin: "raiser") keeps their name WHOLE; a
    // colleague (origin: anything else) is named by their first name alone.
    // `staffNameFromSnapshot` is what does that, so Max — the raiser — reads
    // in full, and this proves the component still calls it.
    expect(screen.getByText("Max Mustermann")).toBeTruthy()

    // NO EMAIL LINE, NO ORIGIN BADGE — "the stakeholder faces + names", her
    // own words, read narrowly: a face and a name, never a third fact.
    expect(screen.queryByText("aurora@kwapso.com")).toBeNull()
    expect(screen.queryByText("Admin")).toBeNull()
    expect(screen.queryByText("Raiser")).toBeNull()

    // AND NO PICKER OR ITS SENTENCES — moved to the edit sheet.
    expect(screen.queryByText("Pick someone to keep in the loop")).toBeNull()
    expect(screen.queryByText("You can add members, but no one is ever removed.")).toBeNull()
  })

  it("draws one face (an initial fallback, with no photo) per stakeholder", () => {
    render(<HelpStakeholders stakeholders={[AURORA, MAX]} />)
    const avatars = document.querySelectorAll('[data-slot="avatar"]')
    expect(avatars.length).toBe(2)
  })

  it("takes no picker-related props at all — the component's own contract shrank with the ruling", () => {
    // `HelpStakeholders` used to require `members`, `canAdd` and `onAdd`
    // alongside `stakeholders`; rendering it above with `stakeholders` alone
    // already proves the signature no longer demands them (a required prop
    // missing would fail to compile). This reads the SOURCE'S own export
    // signature too — narrowly, the one line that declares the component's
    // props — so a regression that re-widened the contract still fails here
    // even if a call site kept passing `stakeholders` alone. Comments
    // elsewhere in the file naming `StaffPillPicker`/`onAdd` in PROSE (the
    // history of where they moved) are deliberately out of scope for this
    // narrower read.
    const src = readFileSync(join(import.meta.dirname, "..", "components", "tickets", "help-stakeholders.tsx"), "utf8")
    const signature = src.slice(src.indexOf("export function HelpStakeholders"), src.indexOf("{\n  const"))
    expect(signature).not.toContain("StaffPillPicker")
    expect(signature).not.toContain("canAdd")
    expect(signature).not.toContain("onAdd")
    expect(signature).not.toContain("members")
  })
})
