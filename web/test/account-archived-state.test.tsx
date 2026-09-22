// HER ARCHIVED (0117, 22 Sep 2026) — THE FRONT-DOOR HALF OF THE PROOF.
//
// Aurora, verbatim: "inactive is different than archived! Archived menas
// 'delated' (only that we cnnot delete). inactive meanse something els, its
// a status for accounts," and earlier the same day: "archived are not
// visible anywhere … however inactive have their own tab … archived however
// are completley invisible."
//
// The worker-side proof (an archived row cannot leak into a list, a count or
// a picker's own door query) lives in workers/tenancy/test/accounts.test.ts,
// against a real SQLite database running the real migration — that is where
// `accountsWhere`'s own default lives and is the right place to prove it
// bites. This file proves the FRONT DOOR asks the door the right QUESTION:
// the wire word this screen sent for the Inactive tab was `archived` until
// this same round, renamed to `inactive` the instant `archived` gained a
// real, stronger meaning — a rename that is invisible to TypeScript (both
// are optional string fields) and would ship silently wrong under a green
// build without a test that reads the actual network call.
//
// Each case is keyed by the EXPRESSION it guards (the field name in the
// captured request), never a line number.

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { Account, TeamMember } from "@shared/types"
import type { ScreenRights } from "@shared/web/screen-engine/recipe"

/** Every call this suite's mock `tenancy.accounts` received, in order — the
 * same "capture the request, don't guess at it from the response" shape
 * `ticket-names-its-client.test.tsx`'s own `door` hoist uses. */
const calls: Record<string, unknown>[] = []

vi.mock("@/lib/api", () => ({
  ApiFailure: class extends Error {},
  tenancy: {
    accounts: async (opts: Record<string, unknown> = {}) => {
      calls.push(opts)
      return {
        accounts: opts.archived === "yes" ? [] : ROWS,
        total: opts.archived === "yes" ? 0 : ROWS.length,
        entityTotal: ROWS.length,
        individualTotal: 0,
        nextCursor: null,
      }
    },
    selectable: async () => ({ values: [], total: 0 }),
  },
}))

import { AccountsScreen } from "@/components/accounts/accounts-screen"
import { RecordPicker } from "@/components/records/record-picker"
import { pickerKey, searchAccounts } from "@/lib/picker-sources"
import { BASE_RECIPES } from "@/lib/screens"
import { clearCache } from "@shared/web/store"

const ROWS: Account[] = [
  {
    id: "acc_co_1",
    accountType: "entity",
    name: "Bergman S.A.",
    logoUrl: null,
    active: true,
    archived: false,
    accountManagerId: null,
    country: "Spain",
  },
] as unknown as Account[]

const MEMBERS: TeamMember[] = []
const RIGHTS: ScreenRights = {
  accounts: { read: true, create: true, edit: false, delete: true },
} as unknown as ScreenRights

let team = 0
function drawAccountsScreen(tab: string | undefined) {
  render(
    <AccountsScreen
      teamId={`team-${++team}`}
      t={(english: string) => english}
      lang="en"
      go={() => {}}
      sectionPath="/t/team/accounts"
      tab={tab}
      accountsQ={{ data: ROWS, error: undefined }}
      membersQ={{ data: MEMBERS }}
      total={ROWS.length}
      recipe={BASE_RECIPES["accounts.list"]}
      rights={RIGHTS}
      can={() => true}
      onAction={() => {}}
      onIntent={() => {}}
    />
  )
}

beforeEach(() => {
  clearCache()
  calls.length = 0
})
afterEach(cleanup)

describe("the Accounts screen's Inactive tab asks the door `inactive`, never `archived`", () => {
  it("the Inactive tab's fixed filter and its own badge total both send `inactive: \"yes\"`", async () => {
    drawAccountsScreen("inactive")
    await waitFor(() => expect(calls.length).toBeGreaterThan(0))
    // At least one request narrowed by `inactive: "yes"` (the tab's own
    // `fixed` filter, or its badge's `inactiveTotalQ` — both send it).
    expect(calls.some((c) => c.inactive === "yes")).toBe(true)
    // AND NEVER `archived: "yes"` FOR THIS QUESTION — the whole bug this
    // suite exists to catch: a stale caller still spelling the OLD wire
    // word would silently ask for her new, stronger, true-archived pile
    // instead of the inactive one, and the Inactive tab would render as
    // permanently empty.
    const inactiveTabCall = calls.find((c) => c.inactive !== undefined)
    expect(inactiveTabCall?.archived).toBeUndefined()
  })
})

describe("the Accounts screen's Archived tab is a real, separate door and a real, separate tab", () => {
  it("has its own tab, labelled Archived", async () => {
    drawAccountsScreen(undefined)
    await waitFor(() => expect(calls.length).toBeGreaterThan(0))
    expect(screen.getByRole("tab", { name: /Archived/i })).toBeTruthy()
  })

  it("pressing the Archived tab (and its own badge) both send `archived: \"yes\"`, and nothing narrows it by `inactive`", async () => {
    drawAccountsScreen("archived")
    await waitFor(() => expect(calls.length).toBeGreaterThan(0))
    const archivedCall = calls.find((c) => c.archived === "yes")
    expect(archivedCall).toBeTruthy()
    // The Archived tab is its own pile, not a slice of Active/Inactive: it
    // must not ALSO narrow by `inactive`.
    expect(archivedCall?.inactive).toBeUndefined()
  })

  it("the All tab still renders its rows — the archived tab's own badge total is a SEPARATE, harmless call, never the one the rows come from", async () => {
    drawAccountsScreen("all")
    // This screen legitimately sends `{ archived: "yes" }` once, unconditionally,
    // for the Archived tab's OWN badge (`archivedTotalQ`) — captured below —
    // but that must never be the call the All tab's own ROWS are read from:
    // the mock answers `archived === "yes"` with an empty page, so if it EVER
    // fed the row list, "Bergman S.A." would not be on the screen.
    await waitFor(() => expect(calls.some((c) => c.archived === "yes")).toBe(true))
    expect(screen.getByText("Bergman S.A.")).toBeTruthy()
  })
})

describe("the account picker (searchAccounts) still asks the door to exclude the put-away pile, under its new name", () => {
  it("sends `inactive: \"no\"`, never `archived: \"no\"` — the OLD wire word, which would now ask a different, wrong question", async () => {
    render(
      <RecordPicker
        id="acct-field"
        ariaLabel="Account"
        value=""
        onChange={() => {}}
        placeholder="Choose an account"
        searchPlaceholder="Search accounts…"
        emptyText="No account matched."
        search={(term) => searchAccounts(term)}
        searchKey={pickerKey("accounts", "team-1")}
      />
    )
    fireEvent.click(screen.getByRole("combobox", { name: "Account" }))
    await screen.findByRole("option", { name: /Bergman/ })

    expect(calls.length).toBeGreaterThan(0)
    expect(calls[0].inactive).toBe("no")
    expect(calls[0].archived).toBeUndefined()
  })
})
