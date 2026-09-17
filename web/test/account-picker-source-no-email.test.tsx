// THE CLIENT'S RULING, 17 SEP 2026, VERBATIM: "On all add screens, when I'm
// picking an account, do only show me the icon and the name, no email or
// anything else."
//
// Before this change `searchAccounts` (web/lib/picker-sources.ts) built every
// account option through the shared `accountOption` seam (R35 — value, label,
// picture, `shape: "square"`, `face: true`) and then added a `hint` of its
// own: `[a.code, a.email].filter(Boolean).join(" · ")`. `PickerOption.hint` is
// drawn by `RecordPicker` as a second line under the name, in
// `text-muted-foreground` — so an account row read "Bergström Handels AB"
// over "KW-0031 · info@bergstrom.se". One form (the ticket dialog's own
// account field) had already had its hint stripped by a narrower ruling on
// 2026-09-09 ("in add/edit for tickets… i only need the name"), with a
// `.map` at that one call site. Her 17 Sep ruling generalises it to every add
// screen, so the fix now lives at the SOURCE (`searchAccounts` itself) rather
// than at nine more call sites: every form that asks the accounts door
// through this function inherits it in one place.
//
// This suite drives the real `RecordPicker` open over the real `searchAccounts`
// function (mocking only the network door underneath, `tenancy.accounts`), the
// same shape `ticket-form-account-never-shows-its-id.test.tsx` uses — because
// the bug lived in what the OPTION carries, not in whether a function returns
// the right fields on paper.
//
// PROVEN NOT VACUOUS the manual way this base's conventions ask for
// (`staff-picker-kills-nobody.test.tsx`'s own header): before `hint` was
// removed from `searchAccounts`, this suite's first assertion (no email/code
// text in the open row) was confirmed red against a `cp`-backed-up copy of
// the ORIGINAL `web/lib/picker-sources.ts`, and green again once the fix
// landed — see the session report for the exact commands.

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { Account } from "@shared/types"

const account: Account = {
  id: "acct-1",
  accountType: "entity",
  parentAccountId: null,
  name: "Bergström Handels AB",
  email: "info@bergstrom.se",
  phone: null,
  street: null,
  postalCode: null,
  city: null,
  country: null,
  industry: null,
  about: null,
  // No picture on purpose: this is the 83-in-134 case `accountOption`'s own
  // header measures, where the face is the letter fallback rather than a
  // photo — proving `face: true` is what draws the mark, not a lucky logo.
  logoUrl: null,
  coverUrl: null,
  code: "KW-0031",
  currency: null,
  locale: null,
  timezone: null,
  commercialsVisible: null,
  altNames: [],
} as unknown as Account

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return {
    ...actual,
    tenancy: {
      ...actual.tenancy,
      accounts: async () => ({ accounts: [account], total: 1 }),
    },
  }
})

import { RecordPicker } from "@/components/records/record-picker"
import { pickerKey, searchAccounts } from "@/lib/picker-sources"

afterEach(cleanup)

describe("the account picker source draws the face and the name, nothing else (client ruling, 17 Sep 2026)", () => {
  it("opens to a row with the name and a face, and no email or code anywhere in it", async () => {
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

    const option = await screen.findByRole("option", { name: /Bergström/ })

    // THE POSITIVE ASSERTION FIRST (the canary `cold-account.test.tsx`'s own
    // header insists on): the row actually rendered the account, so the
    // absence checks below are not passing because nothing painted at all.
    expect(within(option).getByText("Bergström Handels AB")).toBeTruthy()

    // THE FACE (R35) — `RecordMark`'s box, `aria-hidden` because a mark
    // carries no meaning the name does not (record-mark.tsx's own header).
    // No picture was handed to it, so this is the letter fallback, which is
    // exactly the case `face: true` exists for.
    // The Check svg is `aria-hidden` too (its own opacity carries selection),
    // so the face is picked out by RecordMark's own box class rather than by
    // the attribute alone.
    const face = option.querySelector("span.bg-muted[aria-hidden]")
    expect(face).toBeTruthy()
    expect(face?.textContent).toBe("B")

    // NO EMAIL. NO CODE. NO SECOND LINE. This is the whole ruling: nothing in
    // the row besides the face and the name.
    expect(within(option).queryByText(/info@bergstrom\.se/)).toBeNull()
    expect(within(option).queryByText(/KW-0031/)).toBeNull()
    expect(option.textContent).not.toMatch(/@/)
    expect(option.textContent).not.toMatch(/·/)
  })
})
