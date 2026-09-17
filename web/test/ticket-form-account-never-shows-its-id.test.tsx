// Reproduced by tidy_ups at 375px on staging as alaap@kwapso.com: the "Raise a
// ticket" form's Account field showed the raw account ULID
// ("01KZXBST6MRJ6YX4AMC76B…") instead of the account's name, on the app "196+
// awards". R35: a record shows its own face, never its id.
//
// ROOT CAUSE — NOT the T3655 settled-account paragraph (`fixedAccount`, which
// already falls back to `t("this account")`, never the id). It is
// `RecordPicker`'s own documented gap (web/components/records/record-picker.tsx):
// its closed control shows `chosenOption?.label ?? picked ?? selectedLabel ??
// value` — and this form's Account picker never passed `selectedLabel`. So
// any time `value` (a real accountId) is set before the picker's OWN search
// has ever run and found a matching row — the exact shape of a draft restored
// from a previous session on a cold page load, no tab-width dependency, 375px
// was just what tidy_ups happened to be testing — the label falls all the way
// to the bare id.
//
// THE FIX reuses `detailQ` (already fetched, for the very same account, to
// paint the settled `fixedAccount` text two dozen lines above) as this
// picker's `selectedLabel`, defaulting to "" rather than leaving it
// `undefined` — so the fallback chain stops one step early, at blank, and
// never reaches the bare id.
//
// Driven through the real dialog with `tenancy.accountDetail` PERMANENTLY
// pending (never resolves): the accounts list — and this specific account —
// stay exactly as empty as a cold cache leaves them for the whole test, which
// is the state that used to leak the id.

import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const COLD_ACCOUNT_ID = "01KZXBST6MRJ6YX4AMC76BAAAA"

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return {
    ...actual,
    tenancy: {
      ...actual.tenancy,
      apps: async () => ({ apps: [], total: 0 }),
      appModules: async () => ({ modules: [] }),
      // NEVER RESOLVES — the exact shape of a cold cache: the door has been
      // asked but has not yet answered, for as long as this test runs.
      accountDetail: () => new Promise(() => {}),
    },
    content: {
      ...actual.content,
      sprints: async () => ({ sprints: [], total: 0 }),
    },
  }
})

vi.mock("@shared/ui/components/sonner/sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}))

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

import { HelpFormDialog } from "@/components/tickets/help-form-dialog"

const DRAFT_KEY = "help:add:cold-cache-account-test"

afterEach(() => {
  cleanup()
  sessionStorage.clear()
})

describe("the ticket form's Account field never shows its own id", () => {
  it("stays blank rather than leaking the raw id while the account's name is still loading", () => {
    // A draft from a previous session, restored on THIS cold load — before the
    // picker has ever searched and before `accountDetail` has answered.
    sessionStorage.setItem(
      `kwapso:draft:${DRAFT_KEY}`,
      JSON.stringify({
        titleEn: "",
        description: "",
        helpType: "__none__",
        accountId: COLD_ACCOUNT_ID,
        appId: "__none__",
        moduleId: "__none__",
        raisedByContactId: "__none__",
      })
    )

    render(
      <HelpFormDialog
        open
        onOpenChange={() => {}}
        onSubmit={vi.fn(async () => {})}
        helpTypeOptions={["Issue"]}
        teamId="team-1"
        draftKey={DRAFT_KEY}
      />
    )

    // THE BUG, if it were still here: the bare id painted as the field's text.
    expect(screen.queryByText(COLD_ACCOUNT_ID)).toBeNull()

    // THE CONTROL ITSELF stays a real picker (this is a plain create, no
    // fixedApp — the account is a question, not a settled fact) — its closed
    // label is blank rather than the id, which is the fix: `selectedLabel`
    // stops the fallback one step early instead of leaving it `undefined`.
    const combobox = screen.getByRole("combobox", { name: "Account" })
    expect(within(combobox).queryByText(COLD_ACCOUNT_ID)).toBeNull()
  })
})
