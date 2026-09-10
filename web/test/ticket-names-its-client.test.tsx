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
  /** The chosen client's OWN people, for the "Raised by" row. A LET for
   * `door.apps`'s reason — `beforeEach` puts it back to empty, which is what
   * every case that predates the avatar ruling expects. */
  links: [] as Record<string, unknown>[],
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
      accountDetail: async () => ({
        account: { id: "acct-bergman", name: "Bergman" },
        links: door.links,
      }),
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
  door.links = []
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

/** Name the ticket. Title joined Description and Type as a required field on
 * 2026-09-09 ("in titcket: client, title, raised by app, title is required"), so
 * every case below that asks whether the button is ENABLED has to answer it —
 * a case that left it blank would be measuring the title rule while claiming to
 * measure something else. Cases that fire `submit` on the form directly do not
 * need it: `submitForm` bypasses the disabled button on purpose, because what
 * they are about is what reaches `onSubmit`. */
const name = (title: string) => {
  const box = screen.getByLabelText("Title") as HTMLInputElement
  fireEvent.change(box, { target: { value: title } })
}

/** The dialog renders in a PORTAL, so the form is on the document rather than in
 * render()'s own container. */
const submitForm = () => fireEvent.submit(document.querySelector("form") as HTMLFormElement)

describe("raising a ticket in the agency app", () => {
  // "Client" UNTIL 2026-09-09, when she corrected the word: "the filter client
  // is the company, so it's the account. Rename client to account everywhere we
  // said client." The FIELD did not move — it is still `accountId`, still the
  // same picker, still the same door — so this test's subject is unchanged and
  // only the label it looks for follows the screen.
  it("asks which account it is for", () => {
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
    expect(screen.getByText("Account")).toBeTruthy()
    // …and it is a real control a person can open, pointed at by that label.
    const control = screen.getByLabelText("Account")
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
    expect(screen.getByText(/can't be moved to another account/i)).toBeTruthy()
    // The company is NAMED, from its own record — an account past page one used
    // to be shown to its own ticket as "this account".
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
    // NAMED, so the only thing this case is measuring is the TYPE rule. Title is
    // required too since 2026-09-09 and has its own describe below; leaving it
    // blank here would make this assertion pass for the wrong reason.
    name("Tuesday export is empty")
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
    name("Rotate the D1 token")
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
    expect(row.textContent).toContain("Choose an account first.")
    // AND IT IS A LOCKED CONTROL RATHER THAN A LINE OF TEXT — client,
    // 2026-09-09: "unify how to 'choose x first' looks. i prefer how currently
    // is the modules. make the same for apps." The Module row one field down has
    // always been a disabled select wearing its placeholder; this row drew the
    // same sentence as a bare paragraph. Exactly one control, and it offers no
    // app: the gate is the whole of what is on the row.
    const controls = within(row).queryAllByRole("button")
    expect(controls, "the gate is not drawn as a control").toHaveLength(1)
    expect(
      (controls[0] as HTMLButtonElement).disabled,
      "the gate can be pressed — it must read as locked, not as an app nobody named"
    ).toBe(true)
    // The sentence IS the control's name. `aria-label` would replace the
    // content and announce a nameless dimmed button, which is why the shell
    // deliberately carries none.
    expect(controls[0].textContent).toContain("Choose an account first.")
    expect(within(row).queryByRole("button", { name: /Padelbase/ })).toBeNull()
  })

  it("draws one pill per app, each wearing its own face, once a client is set", async () => {
    // ALL THREE BELONG TO THE CHOSEN CLIENT, which this fixture has to say out
    // loud since the list started narrowing by owner (2026-09-09). Before that
    // the field was simply absent and every app was offered; leaving it absent
    // now would silently move this case onto the "owned by nobody" branch and
    // it would go on passing while measuring something else.
    door.apps = [
      { id: "app-1", name: "Padelbase", accountId: "acct-bergman", stage: "live", logoUrl: null, active: true },
      { id: "app-2", name: "Ferienhaus", accountId: "acct-bergman", stage: null, logoUrl: null, active: true },
      { id: "app-3", name: "Retired thing", accountId: "acct-bergman", stage: "live", logoUrl: null, active: false },
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

  /* ── "FILTER THE APPS BY SELECTED CLIENT!" (client, 2026-09-09) ────────────
     The second half of the sentence whose first half ("until clint is not
     selected, show nothing") the two cases above already prove. It shipped
     alone: the gate was built, the narrowing was not, and a comment in the
     dialog argued at length that narrowing would hide the agency's own systems
     and should never be written. She ruled twice; the comment was arguing
     against narrowing by EQUALITY, and the rule that answers both is the one
     her cascade already uses on the toolbar — own, or nobody's. */
  it("offers the chosen client's own systems and ours, and never another client's", async () => {
    door.apps = [
      { id: "app-1", name: "Padelbase", accountId: "acct-bergman", stage: "live", logoUrl: null, active: true },
      // ANOTHER CLIENT'S. The whole defect in one row: before the narrowing it
      // was offered on every client's ticket in the agency.
      { id: "app-2", name: "Someone else's system", accountId: "acct-other", stage: "live", logoUrl: null, active: true },
      // OURS — `accountId` null, the case the retired comment was defending.
      { id: "app-3", name: "Our own admin", accountId: null, stage: "live", logoUrl: null, active: true },
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
    expect(
      within(row).queryByRole("button", { name: /Someone else's system/ }),
      "an app belonging to another client is offered on this client's ticket"
    ).toBeNull()
    expect(
      within(row).getByRole("button", { name: /Our own admin/ }),
      "the agency's own systems must survive the narrowing — the cost the retired comment named"
    ).toBeTruthy()
  })

  it("keeps the app a ticket already names, whoever it belongs to", async () => {
    door.apps = [
      { id: "app-1", name: "Padelbase", accountId: "acct-bergman", stage: "live", logoUrl: null, active: true },
      { id: "app-2", name: "Someone else's system", accountId: "acct-other", stage: "live", logoUrl: null, active: true },
    ]
    render(
      <HelpFormDialog
        open
        onOpenChange={() => {}}
        onSubmit={async () => {}}
        helpTypeOptions={[]}
        teamId="team-1"
        // A LEGAL ROW: `appForTicket` accepts any live app for any client, so
        // this pair exists and an edit must not blank it. Without the escape
        // the row would draw no pressed chip while `values.appId` still held
        // the app, and `submit` would send a value the screen had stopped
        // showing.
        initial={{ description: "<p>x</p>", accountId: "acct-bergman", appId: "app-2" }}
      />
    )
    const row = await waitFor(() => {
      const r = chipRow("App")
      expect(within(r).getByRole("button", { name: /Padelbase/ })).toBeTruthy()
      return r
    })
    expect(
      within(row).getByRole("button", { name: /Someone else's system/ }),
      "the app this ticket already names was narrowed off its own edit form"
    ).toBeTruthy()
  })

  it("offers only our own systems on a ticket that has an app and no client", async () => {
    door.apps = [
      { id: "app-1", name: "Padelbase", accountId: "acct-bergman", stage: "live", logoUrl: null, active: true },
      { id: "app-3", name: "Our own admin", accountId: null, stage: "live", logoUrl: null, active: true },
    ]
    render(
      <HelpFormDialog
        open
        onOpenChange={() => {}}
        onSubmit={async () => {}}
        helpTypeOptions={[]}
        teamId="team-1"
        // The housekeeping ticket: no client on purpose, and about one of ours.
        initial={{ description: "<p>x</p>", appId: "app-3" }}
      />
    )
    const row = await waitFor(() => {
      const r = chipRow("App")
      expect(within(r).getByRole("button", { name: /Our own admin/ })).toBeTruthy()
      return r
    })
    expect(
      within(row).queryByRole("button", { name: /Padelbase/ }),
      "a client's app is offered on a ticket that names no client"
    ).toBeNull()
  })
})

/* ══════════════════════════════════════════════════════════════════════════
   "IN TITCKET: CLIENT, TITLE, RAISED BY APP, TITLE IS REQUIRED"
   — the client, 2026-09-09.

   TWO CLAIMS, AND THE SECOND IS THE ONE A SENTENCE LIKE THAT USUALLY LOSES.
   She names four fields and rules about ONE of them, so the form has to start
   refusing an untitled ticket AND has to leave Client, App and "Raised by"
   exactly as optional as they were. Making four fields required because a
   sentence listed four nouns is the failure this describe is pointed at.

   AND THE 788. `title_en` is nullable and 788 imported tickets have none, so a
   rule about what this form RAISES cannot become a rule about what it OPENS —
   `ticketTitle` already names those rows from their German title or their body,
   and a dead Submit would make somebody invent a name for a two-year-old
   request in order to fix a typo. Same grandfathering the type row got, one
   order of magnitude bigger.
   ══════════════════════════════════════════════════════════════════════════ */
describe("a ticket has a title", () => {
  it("refuses a new ticket until it is named", () => {
    render(
      <HelpFormDialog
        open
        onOpenChange={() => {}}
        onSubmit={async () => {}}
        helpTypeOptions={[]}
        teamId="team-1"
      />
    )
    // Everything else this form demands is answered: the description is written
    // and the team has no ticket types to demand. The title is the only thing
    // outstanding, so the button's state is this rule and nothing else.
    write("<p>The Tuesday export is empty</p>")
    expect(submitButton().disabled).toBe(true)
    name("Tuesday export is empty")
    expect(submitButton().disabled).toBe(false)
    // AND WHITESPACE IS NOT A NAME. `submit` trims before it sends, so a form
    // that accepted spaces would post `undefined` and quietly leave the ticket
    // unnamed after refusing the person who left it blank.
    name("   ")
    expect(submitButton().disabled).toBe(true)
  })

  it("marks the field required, through the same seam that disables Submit", () => {
    render(
      <HelpFormDialog
        open
        onOpenChange={() => {}}
        onSubmit={async () => {}}
        helpTypeOptions={[]}
        teamId="team-1"
      />
    )
    // The kit draws the marker off `required` on the control the Field owns, so
    // the boolean in `submit.disabled` and the one a person SEES are one value.
    expect((screen.getByLabelText("Title") as HTMLInputElement).required).toBe(true)
  })

  it("does not trap — or silently name — a ticket that arrived without one", async () => {
    const onSubmit = vi.fn(async (_input: { titleEn?: string }) => {})
    render(
      <HelpFormDialog
        open
        onOpenChange={() => {}}
        onSubmit={onSubmit}
        helpTypeOptions={[]}
        teamId="team-1"
        initial={{ description: "<p>Tuesday export is empty</p>", titleEn: null }}
      />
    )
    // The box is empty — the screen does not invent a name from the body, which
    // is what `ticketTitle` already derives for free…
    expect((screen.getByLabelText("Title") as HTMLInputElement).value).toBe("")
    // …the marker stands down…
    expect((screen.getByLabelText("Title") as HTMLInputElement).required).toBe(false)
    // …and the form saves anyway.
    expect(submitButton().disabled).toBe(false)
    submitForm()
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    // undefined, not "": `optionalText` leaves the stored null alone.
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ titleEn: undefined })
  })

  it("demands one again on a ticket that already has one", () => {
    // The exemption dies with the row it was written for: a titled ticket is an
    // ordinary required edit, so emptying the box refuses.
    render(
      <HelpFormDialog
        open
        onOpenChange={() => {}}
        onSubmit={async () => {}}
        helpTypeOptions={[]}
        teamId="team-1"
        initial={{ description: "<p>x</p>", titleEn: "Tuesday export is empty" }}
      />
    )
    expect(submitButton().disabled).toBe(false)
    name("")
    expect(submitButton().disabled).toBe(true)
  })

  it("leaves the three fields she NAMED optional, because she ruled about one", () => {
    // Client, App and "Raised by" appear in her sentence and nowhere in the
    // refusal. A ticket the agency raises about its own housekeeping has no
    // client, no system and nobody outside who asked — required there would make
    // it unraisable, which is what each field's own config has always said.
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
    name("Rotate the D1 token")
    // No client, no app, no contact — and the form accepts it.
    expect(submitButton().disabled).toBe(false)
  })
})

/* ══════════════════════════════════════════════════════════════════════════
   "IN RAIDES BY TICKET ADD SCREEN: ADD AVATAR IN ROUND" — the client, 2026-09-09.

   READ OFF THE MARK BOX, not off the chip's text, for the reason the app row's
   own case gives one describe up: the label already contains every letter of the
   name, so a textContent assertion would pass with no mark drawn at all.
   `RecordMark` is `aria-hidden` by design, so its class is the handle.
   ══════════════════════════════════════════════════════════════════════════ */
describe("who raised it", () => {
  it("draws each contact with a round mark carrying their initial", async () => {
    door.links = [
      { id: "l1", accountId: "acct-bergman", personAccountId: "p1", personName: "Marta Nilsson", relationship: null, isMainStakeholder: true, active: true },
      { id: "l2", accountId: "acct-bergman", personAccountId: "p2", personName: "Otto Berg", relationship: null, isMainStakeholder: false, active: true },
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
      const r = chipRow("Raised by")
      expect(within(r).getByRole("button", { name: /Marta Nilsson/ })).toBeTruthy()
      return r
    })
    const marta = within(row).getByRole("button", { name: /Marta Nilsson/ })
    const mark = marta.querySelector(".bg-muted")
    // THE MARK EXISTS AT ALL — this is the half `shape: "round"` alone never
    // bought. `RowChip` draws its `RecordMark` only when a picture, a glyph or
    // `face` says to, and neither of these two contacts has a photograph.
    expect(mark).toBeTruthy()
    // ROUND, which is R35's box for a person in their own right…
    expect(mark?.className).toContain("rounded-pill")
    // …and the honest content: no `personLogoUrl` on the row, so the initial.
    // This is now the FALLBACK case rather than the only case — see below.
    expect(mark?.textContent).toBe("M")

    // "NOT SAID" IS NOT A PERSON, so it wears no face — a round grey "N" would
    // draw a colleague nobody has.
    const notSaid = within(row).getByRole("button", { name: "Not said" })
    expect(notSaid.querySelector(".bg-muted")).toBeNull()
  })

  /* ── "ADD AVATAR IN ROUND" (client, 2026-09-09), THE OTHER HALF ────────────
     The round box shipped the day she asked and every contact drew a grey
     letter in it, because the query behind the row selected `p.name` off the
     joined person row and nothing else — so the photographs that
     `scripts/glide-visuals.mjs` put in R2 reached nobody. The door now carries
     `personLogoUrl` and this is the case that says a real face is drawn where
     there is one, and the letter kept where there is not. Both halves in one
     render, because "it draws the picture" and "it still draws the initial" are
     two claims and shipping only the first would be the regression. */
  it("draws a contact's real face where they have one, and the initial where they don't", async () => {
    door.links = [
      {
        id: "l1",
        accountId: "acct-bergman",
        personAccountId: "p1",
        personName: "Marta Nilsson",
        // ONE OF THE 31. A `/media/...` path is what the door hands back — the
        // same shape `Account.logoUrl` carries and `STORED_FILES` claims.
        personLogoUrl: "/media/accounts/p1/logo.jpg",
        relationship: null,
        isMainStakeholder: true,
        active: true,
      },
      {
        id: "l2",
        accountId: "acct-bergman",
        personAccountId: "p2",
        personName: "Otto Berg",
        personLogoUrl: null,
        relationship: null,
        isMainStakeholder: false,
        active: true,
      },
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
      const r = chipRow("Raised by")
      expect(within(r).getByRole("button", { name: /Marta Nilsson/ })).toBeTruthy()
      return r
    })
    // R40's own oracle, read the way that law reads it: the bytes reach a person
    // through a real `src`, not through a value parked in the form. Asserting on
    // the `<img>` rather than on the option object is the whole point — the
    // field was on the row and rendered by nothing for two days.
    const marta = within(row).getByRole("button", { name: /Marta Nilsson/ })
    const photo = marta.querySelector("img")
    expect(photo, "the contact's photograph never reached the screen").toBeTruthy()
    expect(photo?.getAttribute("src")).toContain("/media/accounts/p1/logo.jpg")
    // AND THE BOX IS STILL THE PERSON'S — a picture must not quietly become a
    // square the way a client's mark is.
    expect(marta.querySelector(".rounded-pill")).toBeTruthy()

    // …AND THE UNPHOTOGRAPHED COLLEAGUE BESIDE HER KEEPS THE LETTER TILE, which
    // is the half `face` buys and the half a "just pass the picture" change
    // would have dropped.
    const otto = within(row).getByRole("button", { name: /Otto Berg/ })
    expect(otto.querySelector("img"), "an invented picture for a contact who has none").toBeNull()
    expect(otto.querySelector(".bg-muted")?.textContent).toBe("O")
  })
})
