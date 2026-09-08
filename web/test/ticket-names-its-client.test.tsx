// THE FIELD THAT WAS ONLY EVER ON THE MACHINE SURFACE.
//
// `createTicket` has accepted a staff-named client since the customer spine
// landed, and workers/content/test/help-fence.test.ts proves the door means it:
// "a ticket the AGENCY raises for a client reaches that client's people". The MCP
// tool exposed it too, with its own note that without `accountId` "a machine can
// only raise tickets that no client will ever see".
//
// The screen never asked. So every ticket a person typed in the agency app
// belonged to nobody and appeared in no client's portal — with a green build the
// whole time, because no check has ever asked whether a form offers what its door
// accepts. This is that question, for this door.
//
// It drives the real dialog rather than scanning its source: a picker that renders
// and a value that reaches `onSubmit` are two different claims, and the second is
// the one the bug was about.
//
// WHERE "THE LIVE COMPANIES ONLY" IS NOW PROVED, and why it moved. This used to
// assert that a retired account and a person were absent from the rendered option
// rows — which was true of the options the browser had, and the browser had page
// one. Accounts PAGE (R14), so that assertion was about the newest fifty and
// silent about the rest, which is exactly the bug the owner then reported from a
// phone. The narrowing now rides the request, so the claim is asserted on the
// REQUEST: the door is asked for entities that are not archived, and the door
// answers for the whole collection.

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

/** What the accounts door was asked, captured. Hoisted so `vi.mock`'s factory —
 * which runs before the module body — can close over it. */
const door = vi.hoisted(() => ({
  /** The team's own systems, for the App row. A LET rather than a constant so a
   * case can hand this door real apps without a second `vi.mock` factory —
   * `beforeEach` puts it back to empty, which is what every case that predates
   * the chip row expects. */
  apps: [] as Record<string, unknown>[],
  accounts: vi.fn(async (_opts: Record<string, unknown> = {}) => ({
    accounts: [
      { id: "acct-bergman", name: "Bergman", code: "BERG", email: null, active: true, accountType: "entity" },
    ],
    total: 1,
    entityTotal: 1,
    individualTotal: 0,
    nextCursor: null,
    hasMore: false,
  })),
}))

vi.mock("@/lib/live-resources", () => ({
  // WHICH SYSTEM the request is about (CHECKLIST 5.8) still reads a bounded list
  // through the store, so the key and its fetcher both have to exist here or the
  // dialog throws before any of these cases can look at it.
  appsKey: (t: string) => `apps:${t}`,
  // …and the SECTIONS of that system, on the same terms: one bounded list
  // through the store, so the key has to exist here too.
  appModulesKey: (t: string) => `app-modules:${t}`,
  listFetch: { apps: async () => door.apps },
}))

// The client picker asks the accounts door; the contact picker asks the accounts
// DETAIL door for the chosen company's own people. The detail also carries the
// company's NAME, which is what a ticket that already has a client shows.
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return {
    ...actual,
    tenancy: {
      ...actual.tenancy,
      accounts: door.accounts,
      accountDetail: async () => ({ account: { id: "acct-bergman", name: "Bergman" }, links: [] }),
      appModules: async () => ({ modules: [], total: 0 }),
    },
  }
})

vi.mock("@/lib/perms", () => ({ usePermissions: () => ({ can: () => false }) }))

import { HelpFormDialog } from "@/components/tickets/help-form-dialog"
import { searchAccounts } from "@/lib/picker-sources"

afterEach(cleanup)
beforeEach(() => {
  door.apps = []
})

/** Write the ticket's own words. The description is a RICH-TEXT field now, so it
 * is not a `<textarea>` with a value to set: it is the library `Notes` editor,
 * a contentEditable that emits its HTML on `input`. Drive the real control —
 * the point of this suite is that the dialog a person actually uses reaches
 * `onSubmit` with what they typed. */
const write = (html: string) => {
  const box = document.querySelector('[contenteditable="true"]') as HTMLElement
  box.innerHTML = html
  fireEvent.input(box)
}

/** The dialog renders in a PORTAL, so the form is on the document rather than in
 * render()'s own container. */
const submitForm = () => fireEvent.submit(document.querySelector("form") as HTMLFormElement)

describe("raising a ticket in the agency app", () => {
  it("asks which client it is for", () => {
    render(
      <HelpFormDialog
        open
        onOpenChange={() => {}}
        onSubmit={async () => {}}
        helpTypeOptions={[]}
        teamId="team-1"
      />
    )
    // The question is on the form at all — this is the half that was missing.
    expect(screen.getByText("Client")).toBeTruthy()
    // …and it is a real control a person can open, pointed at by that label.
    const control = screen.getByLabelText("Client")
    expect(control.getAttribute("role")).toBe("combobox")
  })

  it("asks the door for the live companies, not for a page of them", async () => {
    door.accounts.mockClear()
    await searchAccounts("berg", { type: "entity" })
    // A retired account can't be sold to and a contact is not a client, so
    // neither is a thing to file a ticket under — and both are refused by the
    // DOOR, over the whole collection, rather than by a filter over page one.
    expect(door.accounts).toHaveBeenCalledWith({ q: "berg", type: "entity", archived: "no" })
  })

  it("sends no client when the ticket is our own", async () => {
    const onSubmit = vi.fn(async (_input: { accountId?: string }) => {})
    render(
      <HelpFormDialog
        open
        onOpenChange={() => {}}
        onSubmit={onSubmit}
        helpTypeOptions={[]}
        teamId="team-1"
      />
    )
    write("<p>Internal: rotate the D1 token</p>")
    submitForm()
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    // undefined, not the empty-picker sentinel — the door reads this straight.
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ accountId: undefined })
    // …and the words survive the round trip through the editor.
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      description: "<p>Internal: rotate the D1 token</p>",
    })
  })

  it("keeps the client a ticket already has, and does not offer to move it", async () => {
    // Set once: `updateTicket` refuses a DIFFERENT client with `account_fixed`,
    // so the form states the one it has instead of offering a refusal. It must
    // still SEND it — the door accepts the same id and leaves the row alone.
    const onSubmit = vi.fn(async (_input: { accountId?: string }) => {})
    render(
      <HelpFormDialog
        open
        onOpenChange={() => {}}
        onSubmit={onSubmit}
        helpTypeOptions={[]}
        teamId="team-1"
        initial={{ description: "Tuesday export is empty", accountId: "acct-bergman" }}
      />
    )
    expect(screen.getByText(/can't be moved to another client/i)).toBeTruthy()
    // The company is NAMED, from its own record — a client past page one used to
    // be shown to its own ticket as "this client".
    await waitFor(() => expect(screen.getByText(/^Bergman,/)).toBeTruthy())
    submitForm()
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ accountId: "acct-bergman" })
  })
})

/** The form's ONE button, by the word every form in the app says (UI-RULEBOOK
 * F1). It is in the portal with the rest of the dialog. */
const submitButton = () =>
  screen.getByRole("button", { name: /submit/i }) as HTMLButtonElement

/** One chip row, by the name a screen reader reads — which is the field's own
 * label, passed as `ariaLabel` because a `<label for>` cannot bind to a div. */
const chipRow = (name: string) => screen.getByRole("group", { name })

// ── "NO TYPE IS NOT AN OPTION" (client, 2026-09-07) ─────────────────────────
//
// She said it twice in two sentences, which is a rejection rather than a query,
// and the two halves of acting on it are separable and both have to hold: the
// chip has to be GONE, and the form has to actually REFUSE a ticket with no type
// — a row that merely stopped offering "none" while the door still accepted one
// would be the screen and the record disagreeing silently.
describe("a ticket has a type", () => {
  it("offers no way to say it has none", () => {
    render(
      <HelpFormDialog
        open
        onOpenChange={() => {}}
        onSubmit={async () => {}}
        helpTypeOptions={["Issue", "Question"]}
        teamId="team-1"
      />
    )
    // The four real words are there…
    expect(within(chipRow("Type")).getByRole("button", { name: "Issue" })).toBeTruthy()
    // …and the fifth chip is not, anywhere on the form.
    expect(screen.queryByText("No type")).toBeNull()
  })

  it("refuses a new ticket until a type is pressed, and nothing is preselected", () => {
    render(
      <HelpFormDialog
        open
        onOpenChange={() => {}}
        onSubmit={async () => {}}
        helpTypeOptions={["Issue", "Question"]}
        teamId="team-1"
      />
    )
    write("<p>The Tuesday export is empty</p>")
    // A description alone is no longer enough: Type is required, and the refusal
    // rides the SAME `submit.disabled` seam the module field already used —
    // there is no second validation style on this form.
    expect(submitButton().disabled).toBe(true)
    // Nothing is chosen on a new ticket, so no chip is pressed…
    for (const word of ["Issue", "Question"])
      expect(
        within(chipRow("Type")).getByRole("button", { name: word }).getAttribute("aria-pressed")
      ).toBe("false")
    // …and pressing one is the whole of what was outstanding.
    fireEvent.click(within(chipRow("Type")).getByRole("button", { name: "Issue" }))
    expect(submitButton().disabled).toBe(false)
  })

  it("still lets a team with no ticket types at all raise one", () => {
    // Every word can be switched off on the Choices screen. Required-when-there-
    // is-nothing-to-require would be a door with no handle: a form nobody in that
    // team could ever submit, on a row that offers them nothing to press.
    render(
      <HelpFormDialog
        open
        onOpenChange={() => {}}
        onSubmit={async () => {}}
        helpTypeOptions={[]}
        teamId="team-1"
      />
    )
    write("<p>Internal: rotate the D1 token</p>")
    expect(submitButton().disabled).toBe(false)
  })

  it("does not trap — or silently retype — a ticket that arrived without one", async () => {
    // About sixty imported rows carry a null `help_type`. Opening one to fix a
    // typo must not demand a category for somebody else's two-year-old request,
    // and must not invent one behind their back.
    const onSubmit = vi.fn(async (_input: { helpType?: string }) => {})
    render(
      <HelpFormDialog
        open
        onOpenChange={() => {}}
        onSubmit={onSubmit}
        helpTypeOptions={["Issue", "Question"]}
        teamId="team-1"
        initial={{ description: "<p>Tuesday export is empty</p>", helpType: null }}
      />
    )
    // No chip is pressed — the screen does not claim a type this ticket has never
    // had…
    for (const word of ["Issue", "Question"])
      expect(
        within(chipRow("Type")).getByRole("button", { name: word }).getAttribute("aria-pressed")
      ).toBe("false")
    // …and the form saves anyway.
    expect(submitButton().disabled).toBe(false)
    submitForm()
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    // undefined, not a guess: `optionalText` leaves the stored null alone.
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ helpType: undefined })
  })
})

// ── THE APP IS CHIPS, AND IT WAITS FOR A CLIENT (client, 2026-09-07) ────────
//
// "make app not openable until client is selected, and whe it is horizontal
// pills instead of dropdown."
describe("which app the ticket is about", () => {
  it("keeps its slot and says why it is empty until a client is named", async () => {
    // REAL APPS ON THE DOOR, deliberately: with an empty list the row would be
    // silent whether or not the gate existed, and the case would prove nothing.
    // These are apps a person could pick the moment a client is named, and the
    // point is that until then they are not offered.
    door.apps = [{ id: "app-1", name: "Padelbase", stage: "live", logoUrl: null, active: true }]
    render(
      <HelpFormDialog
        open
        onOpenChange={() => {}}
        onSubmit={async () => {}}
        helpTypeOptions={[]}
        teamId="team-1"
      />
    )
    // Give the bounded apps read time to land, so this is the GATE talking and
    // not a list that simply had not arrived yet.
    await waitFor(() => expect(chipRow("App")).toBeTruthy())
    const row = chipRow("App")
    // The field is still THERE — a row that vanished would move every field
    // under it as somebody fills the form in, inside an order the client fixed
    // field by field.
    expect(row.textContent).toContain("Choose a client first.")
    expect(within(row).queryAllByRole("button")).toHaveLength(0)
  })

  it("draws one pill per app, each wearing its own face, once a client is set", async () => {
    door.apps = [
      { id: "app-1", name: "Padelbase", stage: "live", logoUrl: null, active: true },
      { id: "app-2", name: "Ferienhaus", stage: null, logoUrl: null, active: true },
      { id: "app-3", name: "Retired thing", stage: "live", logoUrl: null, active: false },
    ]
    render(
      <HelpFormDialog
        open
        onOpenChange={() => {}}
        onSubmit={async () => {}}
        helpTypeOptions={[]}
        teamId="team-1"
        initial={{ description: "<p>x</p>", accountId: "acct-bergman" }}
      />
    )
    const row = await waitFor(() => {
      const r = chipRow("App")
      expect(within(r).getByRole("button", { name: /Padelbase/ })).toBeTruthy()
      return r
    })
    // Pills, not a dropdown: no combobox anywhere in this field.
    expect(within(row).queryAllByRole("combobox")).toHaveLength(0)
    // The live ones only…
    expect(within(row).queryByRole("button", { name: /Retired thing/ })).toBeNull()
    // …plus the escape hatch, which the APP row keeps and the type row does not:
    // a ticket about no system at all is a real and common answer here.
    expect(within(row).getByRole("button", { name: "No app" })).toBeTruthy()
    // AND THE ICONS SURVIVE (her own ask, one sentence earlier). "Ferienhaus"
    // has no logo AND no stage, which is exactly the pill that would otherwise
    // be the one blank one in a line of icons — the `face` flag makes
    // `RecordMark` fall through to the name's own initial.
    //
    // READ OFF THE MARK BOX ITSELF, not off the button's text: the label already
    // contains every letter of the name, so asserting on the button's own
    // textContent would pass with no mark drawn at all. `RecordMark` is
    // `aria-hidden` by design (the word beside it says everything the picture
    // does), so no role query can reach it and the class its one component draws
    // with is the handle.
    const plainest = within(row).getByRole("button", { name: /Ferienhaus/ })
    const mark = plainest.querySelector(".bg-muted")
    expect(mark).toBeTruthy()
    expect(mark?.textContent).toBe("F")
  })
})
