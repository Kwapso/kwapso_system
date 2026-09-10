// THE CONTACTS SCREEN IS A TABLE, AND ITS SECOND TAB ASKS THE DOOR.
//
// The client, 2026-09-09, choosing between five arrangements: *"for contacts
// lets do view table, also add column role after account"*, and, earlier the
// same day, *"also tabs here: All, In portal"*.
//
// ── WHY THESE ASSERTIONS AND NOT OTHERS ──────────────────────────────────────
//
// Three of the four things that could be quietly wrong here are invisible to
// every other check in this repo, because none of them is a type error and none
// of them makes the screen look broken:
//
//   1. THE COLUMN ORDER. "Role AFTER account" is a sentence about a sequence,
//      and a sequence is exactly what a snapshot-free test suite stops seeing.
//      Read out of the DOM, left to right.
//   2. THE EMPTY CELL. 22 of her 110 contacts sit under no company and 45 carry
//      no role. If those cells render "null", or "None", or a warning colour,
//      the screen reports two-fifths of the address book as faulty. The app's
//      existing answer is an em dash and this is what holds it there.
//   3. WHICH HEADERS SORT. `ACCOUNT_SORTS` has no name for the company or the
//      role, and — the stronger half — the accounts door is on the CLIENT
//      PORTAL's surface, where an ordering can make a withheld value inferable
//      from a position. A lit header over a column the door cannot order is the
//      defect `record-table.tsx` exists for; a lit header over a column it must
//      not order is that defect plus a fence.
//   4. WHAT THE In portal TAB ASKS. Six of 110 can sign in and a page is fifty
//      rows, so the tab is a question for the DOOR or it is a slice of page one
//      under a badge counting all six. Asserted as the QUERY that reaches the
//      door, because that is the only place the difference shows.
//
// The door's own half of #4 — the filter, the exact count, the `portal_users`
// right and the fence — is `workers/tenancy/test/accounts.test.ts`. This file
// only ever asks what the SCREEN sends and what it draws.

import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { Account } from "@shared/types"
import type { ScreenRights } from "@shared/web/screen-engine/recipe"

/** Every question this screen puts to the accounts door, in order — the one
 * fact that separates a tab that narrows at the door from a tab that filters
 * the page it is holding. */
const asked: Record<string, string | null | undefined>[] = []

vi.mock("@/lib/api", () => ({
  ApiFailure: class extends Error {},
  tenancy: {
    accounts: async (opts: Record<string, string>) => {
      asked.push({ ...opts })
      const rows = opts.portal === "yes" ? PEOPLE.filter((p) => p.id === "p1") : PEOPLE
      return {
        accounts: rows,
        total: rows.length,
        entityTotal: 2,
        individualTotal: PEOPLE.length,
        // The badge the In portal tab wears — the door's own COLLECTION count,
        // which is deliberately NOT the length of anything this call returned.
        individualPortalTotal: 1,
        nextCursor: null,
      }
    },
  },
}))

import { ContactsScreen } from "@/components/accounts/contacts-screen"
import { BASE_RECIPES } from "@/lib/screens"
import { clearCache } from "@shared/web/store"

/** Three contacts, and the three states an Account/Role pair can be in: both
 * filled, a company with nobody's word for what she does there, and neither. */
const PEOPLE = [
  {
    id: "p1",
    accountType: "individual",
    parentAccountId: "c1",
    name: "Marta Bergman",
    companyName: "Bergman S.A.",
    relationship: "CEO",
    active: true,
  },
  {
    id: "p2",
    accountType: "individual",
    parentAccountId: "c2",
    name: "Ines Ortiz",
    companyName: "Delaval Nord",
    relationship: null,
    active: true,
  },
  {
    id: "p3",
    accountType: "individual",
    parentAccountId: null,
    name: "Tomas Roig",
    companyName: null,
    relationship: null,
    active: true,
  },
] as unknown as Account[]

const RIGHTS = (portalUsers: boolean): ScreenRights =>
  ({
    accounts: { read: true, create: false, edit: false, delete: false },
    contacts: { read: true, create: false, edit: false, delete: false },
    portal_users: { read: portalUsers, create: false, edit: false, delete: false },
  }) as unknown as ScreenRights

let team = 0
function draw({ tab, maySeeLogins = true }: { tab?: string; maySeeLogins?: boolean } = {}) {
  const go = vi.fn()
  const onIntent = vi.fn()
  render(
    <ContactsScreen
      teamId={`team-${++team}`}
      t={(english: string) => english}
      go={go}
      sectionPath="/t/team/contacts"
      tab={tab}
      accountsQ={{ data: PEOPLE, error: undefined }}
      total={PEOPLE.length}
      recipe={BASE_RECIPES["contacts.list"]}
      rights={RIGHTS(maySeeLogins)}
      onAction={() => {}}
      onIntent={onIntent}
    />
  )
  return { go, onIntent }
}

/** The headings, left to right — the sequence her ruling is about. */
const headers = () =>
  Array.from(document.querySelectorAll("thead th")).map((th) => th.textContent?.trim() ?? "")

/** One row's cells, left to right. */
const cellsOf = (name: string) => {
  const row = Array.from(document.querySelectorAll("tbody tr")).find((tr) =>
    tr.textContent?.includes(name)
  )
  return Array.from(row?.querySelectorAll("td") ?? []).map((td) => td.textContent?.trim() ?? "")
}

const tabNames = () => screen.getAllByRole("tab").map((t) => t.textContent ?? "")

beforeEach(() => {
  asked.length = 0
  clearCache()
})
afterEach(cleanup)

describe("the contacts screen draws a table", () => {
  it("draws Contact, then Account, then Role — her order, read off the DOM", async () => {
    draw()
    await waitFor(() => expect(document.querySelectorAll("tbody tr").length).toBe(3))
    expect(headers(), "the client asked for the role column AFTER account").toEqual([
      "Contact",
      "Account",
      "Role",
    ])
  })

  it("puts the person's mark in front of her name, in the first column", async () => {
    draw()
    await waitFor(() => expect(document.querySelectorAll("tbody tr").length).toBe(3))
    const first = cellsOf("Marta Bergman")
    expect(first[0]).toContain("Marta Bergman")
    expect(first[1]).toBe("Bergman S.A.")
    expect(first[2]).toBe("CEO")
  })

  it("an absent company and an absent role are an em dash, not an error", async () => {
    // Two-fifths of the real address book lands in one of these two states, so
    // the quiet answer is the correct one — the same dash the tickets list draws
    // for a ticket with no app.
    draw()
    await waitFor(() => expect(document.querySelectorAll("tbody tr").length).toBe(3))
    // The first cell reads "IInes Ortiz" — the mark's fallback initial, then the
    // name — which is the mark being drawn (none of these three has a picture,
    // and on the real team only 31 of 110 do). So the name is matched loosely
    // and the two cells this case is about are matched exactly.
    const ines = cellsOf("Ines Ortiz")
    expect(ines[0]).toContain("Ines Ortiz")
    expect(ines.slice(1), "a company, and nobody's word for what she does").toEqual([
      "Delaval Nord",
      "—",
    ])
    const tomas = cellsOf("Tomas Roig")
    expect(tomas[0]).toContain("Tomas Roig")
    expect(tomas.slice(1), "nobody has filed him under a company yet").toEqual(["—", "—"])
  })

  it("only the column the door can order draws a control", async () => {
    draw()
    await waitFor(() => expect(document.querySelectorAll("tbody tr").length).toBe(3))
    // `name` is in ACCOUNT_SORTS, so the person's column is a real sort.
    expect(screen.getByRole("button", { name: /^Contact/ })).toBeTruthy()
    // Account and Role are NOT — and must not look as though they are. The door
    // has no name for them, and it could not be given one: this door is on the
    // portal gateway's surface and both values are withheld from a client login,
    // so an ordering would hand back through the POSITION what the projection
    // refuses to put in the row.
    expect(
      screen.queryByRole("button", { name: /^Account/ }),
      "a header that cannot order must not look like one that can"
    ).toBeNull()
    expect(screen.queryByRole("button", { name: /^Role/ })).toBeNull()
    expect(screen.getByText("Account"), "…they are still column headings").toBeTruthy()
    expect(screen.getByText("Role")).toBeTruthy()
  })
})

describe("All · In portal", () => {
  it("draws her two tabs, in her order", async () => {
    draw()
    await waitFor(() => expect(document.querySelectorAll("tbody tr").length).toBe(3))
    expect(tabNames().map((n) => n.replace(/\d+$/, ""))).toEqual(["All", "In portal"])
  })

  it("badges In portal with the DOOR's own count, not the rows it is holding", async () => {
    draw()
    // The fixture answers 3 rows and `individualPortalTotal: 1`. A badge read off
    // the loaded page would say 3 on both tabs, which is the R16 failure this
    // screen would otherwise ship: page one is fifty rows and six of 110 sign in.
    await waitFor(() => expect(screen.getAllByRole("tab")[1].textContent).toContain("1"))
    expect(screen.getAllByRole("tab")[0].textContent).toContain("3")
  })

  it("the In portal tab is a question for the DOOR, from page one", async () => {
    draw({ tab: "portal" })
    await waitFor(() => expect(asked.length).toBeGreaterThan(0))
    const last = asked[asked.length - 1]
    expect(last.portal, "the tab narrows at the door, never the page in hand").toBe("yes")
    expect(last.type, "…and it is still the people half of the accounts table").toBe("individual")
    expect(last.cursor, "a different question is page one").toBeFalsy()
    // …and the rows on screen are the door's answer to it.
    await waitFor(() => expect(document.querySelectorAll("tbody tr").length).toBe(1))
    expect(cellsOf("Marta Bergman")[0]).toContain("Marta Bergman")
  })

  it("the All tab asks the door nothing about logins", async () => {
    draw()
    await waitFor(() => expect(asked.length).toBeGreaterThan(0))
    expect(asked.every((q) => q.portal === undefined)).toBe(true)
  })

  it("a role without portal_users:read is not offered the tab at all", async () => {
    // The DOOR is what decides (without the right its filter is empty and its
    // count is zero — accounts.test.ts). This is the other half: a tab that
    // opens on nothing and explains nothing is worse than a strip of one.
    draw({ maySeeLogins: false })
    await waitFor(() => expect(document.querySelectorAll("tbody tr").length).toBe(3))
    expect(tabNames().map((n) => n.replace(/\d+$/, ""))).toEqual(["All"])
  })

  it("…and a link to ?tab=portal lands on All rather than on a tab that is not there", async () => {
    draw({ tab: "portal", maySeeLogins: false })
    await waitFor(() => expect(asked.length).toBeGreaterThan(0))
    expect(asked.every((q) => q.portal === undefined)).toBe(true)
    expect(document.querySelectorAll("tbody tr").length).toBe(3)
  })
})
