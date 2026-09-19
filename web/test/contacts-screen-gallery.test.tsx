// CONTACTS — THE GALLERY VIEW AND THE NEW CONTACT DOOR.
//
// Aurora, verbatim: "on contacts, add the view gallery and the button to add."
// Until this change the Contacts screen drew one body only (a table) and had
// no create act at all — the two things this suite locks:
//
//   1. THE VIEW TOGGLE offers Gallery beside List, the same two-icon switch
//      `accounts-screen.tsx` already carries one screen over (R53).
//   2. THE GALLERY'S TILES ARE CONTACT ENTITIES — a person (`PersonCard`):
//      a face, the name, the account they work at as a plain chip (R86: only
//      STATUS may colour a chip), and the status dot underneath.
//   3. THE HEADER ADD BUTTON is offered only over a non-empty collection —
//      an empty one draws its own "Add the first" and nothing else (R50/R88:
//      one door, never two).
//   4. THE DIALOG OPENS, with its own Account picker (this screen has no
//      company already on screen to imply one), and the two-write door
//      (`createAccount` + `linkPerson`) is what it calls.
//
// Same render harness as `contacts-are-a-table.test.tsx` — the ONE other
// suite over this screen — so the two agree about what "drawing the real
// screen" means.

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { Account } from "@shared/types"
import type { ScreenRights } from "@shared/web/screen-engine/recipe"

const asked: Record<string, string | null | undefined>[] = []
const doorCalls = {
  createAccount: [] as Record<string, unknown>[],
  linkPerson: [] as Record<string, unknown>[],
}

const COMPANIES = [
  { id: "c1", accountType: "entity", name: "Bergman S.A.", logoUrl: null, active: true },
  { id: "c2", accountType: "entity", name: "Aardvark Logistics", logoUrl: null, active: true },
] as unknown as Account[]

const PEOPLE = [
  {
    id: "p1",
    accountType: "individual",
    parentAccountId: "c1",
    name: "Marta Bergman",
    companyName: "Bergman S.A.",
    relationship: "CEO",
    hasPortalLogin: true,
    active: true,
    logoUrl: null,
  },
  {
    id: "p2",
    accountType: "individual",
    parentAccountId: null,
    name: "Tomas Roig",
    companyName: null,
    relationship: null,
    active: false,
    logoUrl: null,
  },
] as unknown as Account[]

// MUTABLE, AND READ BY THE DOOR RATHER THAN THE SCREEN'S OWN `accountsQ`
// PROP. This screen's `fixed` is never `undefined` (see contacts-screen.tsx's
// own `contactsRestingEmpty` note), so `<PagedFind>` is permanently "active"
// and asks the door for page one on every render, regardless of what the
// resting `accountsQ` prop carries — so simulating a team with zero contacts
// means the DOOR has to answer zero, not merely the prop.
let currentPeople: Account[] = PEOPLE

vi.mock("@/lib/api", () => ({
  ApiFailure: class extends Error {},
  tenancy: {
    accounts: async (opts: Record<string, string> = {}) => {
      asked.push({ ...opts })
      // THE ACCOUNT PICKER'S OWN READ — `type: "entity"`, the companies list,
      // never the individuals this screen's own `accountsQ` already holds.
      if (opts.type === "entity") {
        return {
          accounts: COMPANIES,
          total: COMPANIES.length,
          entityTotal: COMPANIES.length,
          individualTotal: 0,
          nextCursor: null,
        }
      }
      const rows = opts.portal === "yes" ? currentPeople.filter((p) => p.id === "p1") : currentPeople
      return {
        accounts: rows,
        total: rows.length,
        entityTotal: 2,
        individualTotal: currentPeople.length,
        individualPortalTotal: currentPeople.some((p) => p.id === "p1") ? 1 : 0,
        nextCursor: null,
      }
    },
    createAccount: async (input: Record<string, unknown>) => {
      doorCalls.createAccount.push(input)
      return { id: "new-person" }
    },
    linkPerson: async (input: Record<string, unknown>) => {
      doorCalls.linkPerson.push(input)
      return { id: "link-1" }
    },
  },
}))

import { ContactsScreen } from "@/components/accounts/contacts-screen"
import { BASE_RECIPES } from "@/lib/screens"
import { clearCache } from "@shared/web/store"

const RIGHTS = (canCreate: boolean): ScreenRights =>
  ({
    accounts: { read: true, create: false, edit: false, delete: false },
    contacts: { read: true, create: canCreate, edit: false, delete: false },
    portal_users: { read: false, create: false, edit: false, delete: false },
  }) as unknown as ScreenRights

let team = 0
function draw({
  people = PEOPLE,
  total = people.length,
  canCreate = true,
}: { people?: Account[]; total?: number; canCreate?: boolean } = {}) {
  currentPeople = people
  const go = vi.fn()
  const onIntent = vi.fn()
  render(
    <ContactsScreen
      teamId={`team-${++team}`}
      t={(english: string) => english}
      lang="en"
      go={go}
      sectionPath="/t/team/contacts"
      tab={undefined}
      accountsQ={{ data: people, error: undefined }}
      total={total}
      recipe={BASE_RECIPES["contacts.list"]}
      rights={RIGHTS(canCreate)}
      onAction={() => {}}
      onIntent={onIntent}
    />
  )
  return { go, onIntent }
}

/** Switch to the gallery — the identical two-step `app-tickets-are-a-table.test.tsx`
 * already proves against this app's own `ViewSwitch` (a Radix `Select`): open
 * the "View" combobox, then click the option. */
function switchToGallery() {
  fireEvent.click(screen.getByRole("combobox", { name: "View" }))
  fireEvent.click(screen.getByRole("option", { name: "Gallery" }))
}

beforeEach(() => {
  asked.length = 0
  doorCalls.createAccount.length = 0
  doorCalls.linkPerson.length = 0
  clearCache()
})
afterEach(cleanup)

describe("the view toggle offers Gallery beside List (R53)", () => {
  it("draws a View switch with both bodies as options", async () => {
    draw()
    await waitFor(() => expect(document.querySelectorAll("tbody tr").length).toBe(2))
    fireEvent.click(screen.getByRole("combobox", { name: "View" }))
    expect(screen.getByRole("option", { name: "Gallery" })).toBeTruthy()
    expect(screen.getByRole("option", { name: "List" })).toBeTruthy()
  })

  it("opens on List — the table this screen already drew, unchanged as the default", async () => {
    draw()
    await waitFor(() => expect(document.querySelectorAll("tbody tr").length).toBe(2))
    // The table is already on screen without touching the switch at all.
    expect(document.querySelector("table")).toBeTruthy()
  })
})

describe("the gallery's tiles are contact entities (R35/R65/R86)", () => {
  it("draws one card per contact, each carrying the name, the account and the status", async () => {
    draw()
    await waitFor(() => expect(document.querySelectorAll("tbody tr").length).toBe(2))
    switchToGallery()
    // The table is gone — the gallery replaced it, not joined it.
    expect(document.querySelector("table")).toBeNull()
    // THE NAME — the card's own title.
    expect(await screen.findByText("Marta Bergman")).toBeTruthy()
    expect(screen.getByText(/Tomas Roig/)).toBeTruthy()
    // THE ACCOUNT — a plain chip above the title (R65), never a filled status
    // colour (R86: only the STATUS field may colour a chip).
    expect(screen.getByText("Bergman S.A.")).toBeTruthy()
    // TOMAS HAS NO COMPANY LINKED — the same em dash the table draws for the
    // identical absence, never blank and never "None".
    const tomasCard = screen.getByText(/Tomas Roig/).closest('[data-slot="card"]')
    expect(tomasCard?.textContent).toContain("—")
    // THE STATUS DOT — Marta is live, Tomas is archived (R86/D17: "contact
    // live green"), the SAME badge shape the table's own Status column draws.
    const martaCard = screen.getByText("Marta Bergman").closest('[data-slot="card"]')
    expect(martaCard?.querySelector('[data-slot="badge"][data-dot="shipped"]')).toBeTruthy()
    expect(tomasCard?.querySelector('[data-slot="badge"][data-dot="archived"]')).toBeTruthy()
  })

  it("a card is a real anchor to the contact's own account record (R37)", async () => {
    draw()
    await waitFor(() => expect(document.querySelectorAll("tbody tr").length).toBe(2))
    switchToGallery()
    const link = (await screen.findByText("Marta Bergman")).closest("a")
    expect(link?.getAttribute("href")).toBe(`/t/team-${team}/accounts/p1`)
  })
})

describe("the header add button (R50/R88: one door, never two)", () => {
  it("is offered over a non-empty collection, labelled New contact", async () => {
    draw({ canCreate: true })
    await waitFor(() => expect(document.querySelectorAll("tbody tr").length).toBe(2))
    expect(screen.getByRole("button", { name: /New contact/i })).toBeTruthy()
    // AND THE EMPTY REGISTER'S OWN DOOR IS NOT ALSO ON SCREEN — there is
    // exactly one way in, never two, over a collection that has rows.
    expect(screen.queryByRole("button", { name: /Add the first/i })).toBeNull()
  })

  it("is withdrawn for a role without contacts:create", async () => {
    draw({ canCreate: false })
    await waitFor(() => expect(document.querySelectorAll("tbody tr").length).toBe(2))
    expect(screen.queryByRole("button", { name: /New contact/i })).toBeNull()
  })

  it("is absent on a genuinely empty collection — the empty state's own 'Add the first' is the ONE door", async () => {
    draw({ people: [], total: 0, canCreate: true })
    expect(await screen.findByText("No contacts yet.")).toBeTruthy()
    // THE HEADER'S OWN "New contact" BUTTON IS WITHDRAWN — gated on
    // `contactsRestingEmpty` (contacts-screen.tsx), not merely on
    // `<PagedFind>`'s own slot suppression: this screen's `fixed` is never
    // empty (see that constant's own header), so the toolbar row itself
    // keeps drawing search/tabs even at rest — the header AddButton is the
    // one thing this screen stands down by hand.
    expect(screen.queryByRole("button", { name: /New contact/i })).toBeNull()
    // R88 — the ONE door left is the empty register's own "Add the first"
    // (the kit's own fixed word for it, `CollectionEmptyState`'s own
    // register, never the caller's action label).
    const addTheFirst = screen.getByRole("button", { name: /Add the first/i })
    expect(addTheFirst.closest('[data-slot="collection-empty-body"]')).toBeTruthy()
  })
})

describe("the New contact dialog (no account implied — R90/R75)", () => {
  it("opens from the header button, with its own Account picker", async () => {
    draw({ canCreate: true })
    await waitFor(() => expect(document.querySelectorAll("tbody tr").length).toBe(2))
    fireEvent.click(screen.getByRole("button", { name: /New contact/i }))
    expect(await screen.findByText("New contact")).toBeTruthy()
    expect(screen.getByLabelText(/name/i, { selector: "input" })).toBeTruthy()
    // THE ACCOUNT PICKER — absent from the SAME dialog opened with an
    // implied account (account-detail.tsx's own call carries `accountName`,
    // never `accounts`); present here because this screen has none to imply.
    expect(screen.getByRole("combobox", { name: /account/i })).toBeTruthy()
  })

  it("offers the team's own companies, A→Z, once the picker is opened", async () => {
    draw({ canCreate: true })
    await waitFor(() => expect(document.querySelectorAll("tbody tr").length).toBe(2))
    fireEvent.click(screen.getByRole("button", { name: /New contact/i }))
    await screen.findByText("New contact")
    fireEvent.click(screen.getByRole("combobox", { name: /account/i }))
    const options = await screen.findAllByRole("option")
    // Matched loosely (`.toContain`, not `.toBe`) the same way
    // `contacts-are-a-table.test.tsx` reads a face-led cell: the option's own
    // text is the mark's fallback initials then the name.
    expect(options.length).toBe(2)
    expect(options[0].textContent).toContain("Aardvark Logistics")
    expect(options[1].textContent).toContain("Bergman S.A.")
  })

  it("submits through the two-write door — createAccount, then linkPerson", async () => {
    draw({ canCreate: true })
    await waitFor(() => expect(document.querySelectorAll("tbody tr").length).toBe(2))
    fireEvent.click(screen.getByRole("button", { name: /New contact/i }))
    await screen.findByText("New contact")
    fireEvent.click(screen.getByRole("combobox", { name: /account/i }))
    fireEvent.click(await screen.findByRole("option", { name: "Bergman S.A." }))
    fireEvent.change(screen.getByPlaceholderText("Marta Bergman"), { target: { value: "Ines Ortiz" } })
    fireEvent.click(screen.getByRole("button", { name: /submit/i }))
    await waitFor(() => expect(doorCalls.createAccount.length).toBe(1))
    expect(doorCalls.createAccount[0]).toMatchObject({
      accountType: "individual",
      name: "Ines Ortiz",
      parentAccountId: "c1",
    })
    await waitFor(() => expect(doorCalls.linkPerson.length).toBe(1))
    expect(doorCalls.linkPerson[0]).toMatchObject({
      accountId: "c1",
      personAccountId: "new-person",
    })
  })
})
