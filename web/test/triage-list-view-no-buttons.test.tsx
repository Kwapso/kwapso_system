// TRIAGE LIST VIEW DRAWS NO BUTTONS. Aurora's ruling, 20 Sep 2026, verbatim:
// "on tickets triage list view have no buttons at all (rmeov ethe
// accept/store/all)." The LIST view (the table `TicketRowsTable` draws) used
// to carry a fifth `decide` column with the row's own Accept/Assign/Plan
// button plus a people-row strip beneath it: this file pins that the column
// is gone. The QUEUE view (the one-ticket-at-a-time card) is untouched: it
// keeps its own decision, exactly as her ruling says ("triage list view",
// never "triage queue").
//
// DRIVEN, NOT SCANNED. A comment can say the right thing beside a prop that
// draws the wrong one, and only a render that reads the buttons back catches
// that (the same argument web/test/ticket-close-moved-to-top.test.tsx gives).

import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { TriageWaiting } from "@/lib/api/content"

const WAITING: TriageWaiting = {
  id: "help-1",
  ref: "BERG-T0412",
  description: "None of my drivers can see today's routes.",
  createdAt: "2026-09-10T09:00:00.000Z",
  days: 4,
  missing: [],
  helpType: "Bug",
  accountId: "acct-bergman",
  appId: "app-1",
  moduleId: null,
  raisedByContactId: "contact-1",
  accountName: "Bergman S.A.",
  accountLogo: null,
  appName: "Dispatch",
  appLogo: null,
  moduleName: null,
  moduleMark: null,
  raisedByContactName: "Marta Bergman",
  raisedByContactLogo: null,
  raiserId: null,
  raiserName: null,
  raiserIsClient: false,
  titleDe: null,
  titleEn: "The dispatch board will not load",
}

// A STAFF-RAISED TICKET WITH NO CLIENT CONTACT: the majority shape (SCOPE
// ch.07: "220 of 221 seeded historical requests are staff-raised") and the one
// the reproof caught empty: `raisedByContactId`/`raisedByContactName` are both
// null (nobody has said who this is for yet), so the cell has nothing to fall
// back to and must draw the ACTOR instead (`raiserId`/`raiserName`, added to
// the triage door 20 Sep 2026 in `workers/content/src/lib/triage.ts`).
const STAFF_RAISED: TriageWaiting = {
  id: "help-2",
  ref: "T0001",
  description: "A request from the other company.",
  createdAt: "2026-09-07T11:59:33.757Z",
  days: 5,
  missing: [],
  helpType: "question",
  accountId: null,
  appId: null,
  moduleId: null,
  raisedByContactId: null,
  accountName: null,
  accountLogo: null,
  appName: null,
  appLogo: null,
  moduleName: null,
  moduleMark: null,
  raisedByContactName: null,
  raisedByContactLogo: null,
  raiserId: "user-smoke",
  raiserName: "Smoke Test",
  raiserIsClient: false,
  titleDe: null,
  titleEn: null,
}

// A MUTABLE HOLDER RATHER THAN A LITERAL ARRAY: the Raised-by test below
// swaps in `STAFF_RAISED` for its one render and puts `WAITING` back
// afterwards, so every other test in this file keeps seeing the row it always
// has (`beforeEach` resets it, same as `vi.clearAllMocks()` beside it).
let currentWaiting: TriageWaiting[] = [WAITING]

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return {
    ...actual,
    content: {
      ...actual.content,
      triage: async () => ({
        onDuty: { userId: "u-1", userName: "Aurora", weekStart: "2026-09-14" },
        yours: true,
        waiting: currentWaiting,
        total: currentWaiting.length,
      }),
      helpAttachments: async () => ({ attachments: [], total: 0 }),
    },
    tenancy: {
      ...actual.tenancy,
      members: async () => ({ members: [] }),
      apps: async () => ({ apps: [], total: 0 }),
    },
  }
})

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: () => {}, push: () => {} }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock("@shared/ui/components/sonner/sonner", () => ({
  toast: { success: () => {}, error: () => {}, info: () => {} },
  Toaster: () => null,
}))

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

import { TriageQueue } from "@/components/tickets/triage-queue"
import { RememberedScreen, type ScreenMemory } from "@shared/web/remembered"

afterEach(cleanup)
beforeEach(() => {
  vi.clearAllMocks()
  currentWaiting = [WAITING]
})

const PROPS = {
  teamId: "team-1",
  canTriage: true,
  canEdit: true,
  helpTypeOptions: ["Bug", "Question", "Issue", "Request"],
  canCreateTicket: false,
  onCreate: () => {},
  onOpen: () => {},
}

/** Forces `triageView` to a given value regardless of the hook's own
 * "list"-first default, through the real `ScreenMemory` seam
 * (`shared/web/remembered.tsx`) rather than by driving the kit's Radix
 * `ViewSwitch` dropdown open in jsdom. */
function memoryFor(view: "queue" | "list"): ScreenMemory {
  return { read: (slot) => (slot === "triage-view" ? view : undefined), write: () => {} }
}

describe("the triage LIST view draws no per-row ACTION buttons (Aurora, 20 Sep 2026)", () => {
  // THE ROW'S OWN TITLE LINK IS NOT ONE OF THESE. `TicketRowsTable` draws a
  // `<Button variant="link">` for the title on EVERY tab (Open, Closed, All
  // and Triage alike, `row-open.ts`'s own header): that is the row's plain
  // "open this ticket" affordance, identical everywhere, and it is not what
  // her ruling names ("the accept/store/all"). One row here, so exactly one
  // such button is the honest zero-actions answer.
  it("draws the ticket's own title link, and nothing else, inside the table", async () => {
    render(
      <RememberedScreen memory={memoryFor("list")}>
        <TriageQueue {...PROPS} />
      </RememberedScreen>
    )
    const table = await screen.findByRole("table", { name: "Triage queue" })
    expect(within(table).getByText("The dispatch board will not load")).toBeTruthy()
    const buttons = within(table).queryAllByRole("button")
    expect(buttons).toHaveLength(1)
    expect(buttons[0].textContent).toBe("The dispatch board will not load")
  })

  it("draws none of the old per-row decision verbs (Accept, Assign, Plan) anywhere in the table", async () => {
    render(
      <RememberedScreen memory={memoryFor("list")}>
        <TriageQueue {...PROPS} />
      </RememberedScreen>
    )
    const table = await screen.findByRole("table", { name: "Triage queue" })
    for (const name of ["Accept", "Assign", "Plan"]) {
      expect(within(table).queryByRole("button", { name })).toBeNull()
    }
    // AND NO PEOPLE-ROW PICKER: the strip the old `decide.strip` opened
    // beneath a row once Assign/Plan was clicked no longer exists to open.
    expect(screen.queryByPlaceholderText("Who is picking this up?")).toBeNull()
  })

  it("the LIST view is also the default a reader with no remembered choice sees", async () => {
    // No `RememberedScreen` at all: `useRemembered`'s own fallback
    // (triage-queue.tsx: `useRemembered("triage-view", "list")`) is plain
    // `useState("list")`, so this is the ordinary first-visit case.
    render(<TriageQueue {...PROPS} />)
    const table = await screen.findByRole("table", { name: "Triage queue" })
    expect(within(table).queryAllByRole("button")).toHaveLength(1)
    for (const name of ["Accept", "Assign", "Plan"]) {
      expect(within(table).queryByRole("button", { name })).toBeNull()
    }
  })
})

describe('the LIST view\'s "Raised by" cell names the raiser, and carries no date (Aurora, reproof 20)', () => {
  // THE DEFECT: a staff-raised ticket with no client contact
  // (`raisedByContactId`/`raisedByContactName` both null, the majority
  // shape, SCOPE ch.07) rendered an empty `<td>`. `raiserId`/`raiserName`
  // joined the triage door's `waiting` rows on 20 Sep 2026
  // (`workers/content/src/lib/triage.ts`) precisely so the cell has this
  // actor to fall back to. A ROUND EARLIER removed the second line under the
  // name that carried the raised-on date ("we have an own column for that!")
  // This proves the NAME survived that cut and the DATE genuinely did not,
  // rather than scanning source for either claim.
  it("shows the raiser's name and face, with no date line under it", async () => {
    currentWaiting = [STAFF_RAISED]
    render(
      <RememberedScreen memory={memoryFor("list")}>
        <TriageQueue {...PROPS} />
      </RememberedScreen>
    )
    const table = await screen.findByRole("table", { name: "Triage queue" })
    const rows = within(table).getAllByRole("row")
    // rows[0] is the header; the one ticket in `currentWaiting` is rows[1].
    const cells = within(rows[1]).getAllByRole("cell")
    const raisedByCell = cells[4]
    // R54-TRIMMED TO A FIRST NAME: `raiserIsClient` is false, so the cell
    // runs `staffNameFromSnapshot("Smoke Test")` rather than showing the
    // snapshot whole, the same trim the app tab's identical column already
    // proves (`app-tickets-are-a-table.test.tsx`).
    expect(raisedByCell.textContent).toContain("Smoke")
    // NO DATE ANYWHERE IN THE CELL: a four-digit year is `formatDate`'s own
    // tell (`shared/web/format.ts`: `toLocaleDateString(lang, { year:
    // "numeric", … })`), so its absence here is the date line's absence.
    expect(raisedByCell.textContent).not.toMatch(/\d{4}/)
    // AND THE FACE (R35): `RecordMark` (`shared/web/record-mark.tsx`) draws
    // an `<img>` when it has a picture and an `aria-hidden` initial tile when
    // it does not (no picture in the members cache here, an empty `members:
    // []` in this file's own mock), so the initial tile is the proof: the
    // cell is not bare text, matching "the face if the row pattern shows one".
    expect(raisedByCell.querySelector("[aria-hidden]")).toBeTruthy()
  })

  it("still shows the client contact's name when there is no staff actor (the pre-existing shape)", async () => {
    currentWaiting = [WAITING]
    render(
      <RememberedScreen memory={memoryFor("list")}>
        <TriageQueue {...PROPS} />
      </RememberedScreen>
    )
    const table = await screen.findByRole("table", { name: "Triage queue" })
    const rows = within(table).getAllByRole("row")
    const cells = within(rows[1]).getAllByRole("cell")
    expect(cells[4].textContent).toContain("Marta Bergman")
    expect(cells[4].textContent).not.toMatch(/\d{4}/)
  })
})

describe("the triage QUEUE (card) view keeps its own decision, untouched by the list ruling", () => {
  it("still draws the row's decision button and Skip", async () => {
    render(
      <RememberedScreen memory={memoryFor("queue")}>
        <TriageQueue {...PROPS} />
      </RememberedScreen>
    )
    // The card draws the ticket's title as a clickable heading-like button,
    // and its decision (`triageAct` falls to "Accept" for a "Bug" ticket,
    // the same default a Question or an Extra gets).
    await screen.findByRole("button", { name: "The dispatch board will not load" })
    expect(screen.getByRole("button", { name: "Accept" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Skip" })).toBeTruthy()
  })
})
