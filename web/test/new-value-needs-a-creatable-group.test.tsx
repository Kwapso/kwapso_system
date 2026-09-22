// A "New value" BUTTON OVER A VOCABULARY THAT CANNOT GROW.
//
// `create: false` is `MODULE_SETTINGS`' own flag for a vocabulary the APP
// owns rather than the team — today exactly one: Ticket types, the locked
// four (Issue / Question / Extra / Feedback), which the door itself refuses a
// fifth of with a `locked_group` 400 (`createSelectable`,
// workers/tenancy/src/lib/selectable.ts). The screen's own half of that
// ruling is written beside the section: *"a control that can only ever be
// refused should not be a control."*
//
// IT WAS HONOURED IN THE PICKER AND NOWHERE IN THE BUTTON.
// `settings-choices-panel.tsx` filters `moduleOptions` to `create: true`
// sections, so a mounting scoped to Tickets resolves that list to `[]` — but
// the toolbar's create action was built from `can("selectable_data",
// "create")` ALONE. So any reader holding the right was offered "New value"
// on the Ticket type tab, and pressing it opened `SelectableFormDialog` with
// `modules: []`: an empty group picker, and behind it a door that would have
// said no anyway. The fix folds `moduleOptions.length > 0` into the same
// gate (`canAdd`).
//
// ASKED OF THE DOM, NOT OF THE SOURCE, and that is the whole point of the
// file. The bug lived in the gap between two expressions that were each
// correct on their own — a source census reading either one would have
// reported a screen behaving exactly as written. Only the rendered toolbar
// can say whether a reader is offered a button, so that is what is asked.
//
// EVERY ABSENCE HERE CARRIES ITS OWN CANARY. `queryByRole(...)` returns null
// just as happily for a tree that never rendered — a thrown hook, a gate
// refusing, a fetch left hanging on the skeleton — as for the fix working.
// So each "no button" assertion first proves the table it is judging really
// drew its rows, and the same panel is drawn again over a CREATABLE
// vocabulary (Accounts › Industry), with the same rights and the same data,
// where the button must still appear.

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { SelectableValue } from "@shared/types"

const api = vi.hoisted(() => ({ selectable: vi.fn() }))
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return { ...actual, tenancy: { ...actual.tenancy, selectable: api.selectable } }
})

import { SettingsChoicesPanel } from "@/components/screens/settings-choices-panel"
import { TICKET_TYPE_GROUP } from "@shared/ticket-types"
import { clearCache } from "@shared/web/store"
import type { Can } from "@/lib/perms"

const TEAM = "team-1"

/** One value is enough per group to keep the table out of its empty state —
 * which matters, because the GENUINELY-empty body suppresses the toolbar's
 * own + button by itself (`isEmptyState`, collection-frame.tsx) and would
 * hand this suite a passing absence for a reason that has nothing to do with
 * `create: false`. */
const value = (id: string, type: string, word: string): SelectableValue => ({
  id,
  type,
  value: word,
  isDefault: false,
  active: true,
  mark: null,
  nameDe: null,
  description: null,
  standardDays: null,
  position: null,
  createdAt: "2026-09-01T10:00:00.000Z",
  createdByName: "Aurora",
})

const VALUES: SelectableValue[] = [
  value("v1", TICKET_TYPE_GROUP, "Issue"),
  value("v2", TICKET_TYPE_GROUP, "Question"),
  value("v3", "Industry", "Consulting"),
  value("v4", "Country", "Portugal"),
]

/** A reader holding EVERY right, including `selectable_data:create` — the
 * exact reader the bug was visible to. A reader without the right was never
 * offered the button and could not have shown this. */
const canEverything: Can = () => true
/** The same reader with the create right withheld, and nothing else changed —
 * so the third case below proves the original gate is still doing its job
 * beside the new one. */
const canReadOnly: Can = (_module, right) => right !== "create"

afterEach(cleanup)

beforeEach(() => {
  clearCache()
  api.selectable.mockReset()
  api.selectable.mockResolvedValue({ values: VALUES })
})

describe("the toolbar offers no way to add a value where no value can be added", () => {
  it("Tickets › Ticket type (create: false) draws its rows and NO \"New value\" button", async () => {
    render(
      <SettingsChoicesPanel teamId={TEAM} can={canEverything} scope={{ segment: "tickets", type: TICKET_TYPE_GROUP }} />
    )
    // THE CANARY: the table really is on screen, holding the locked four.
    expect(await screen.findByText("Issue")).toBeTruthy()
    expect(screen.getByText("Question")).toBeTruthy()
    // AND THE POINT: a reader who may create values anywhere they are allowed
    // is offered nothing here, because there is nowhere for a new value to go.
    expect(
      screen.queryByRole("button", { name: "New value" }),
      'the Ticket type tab offers "New value" again. Its one vocabulary section is `create: false` (the locked ' +
        "four — MODULE_SETTINGS, module-settings-screen.tsx), so `moduleOptions` is empty and the dialog behind " +
        "this button opens on an empty group picker over a door that answers `locked_group`. The create action " +
        "must gate on `canAdd` (the right AND a vocabulary that can grow), never on the right alone."
    ).toBeNull()
  })

  it("Accounts › Industry (create: true) still draws its own \"New value\" button", async () => {
    render(
      <SettingsChoicesPanel teamId={TEAM} can={canEverything} scope={{ segment: "accounts", type: "Industry" }} />
    )
    expect(await screen.findByText("Consulting")).toBeTruthy()
    expect(
      screen.getByRole("button", { name: "New value" }),
      "a creatable vocabulary lost its create button — the fix for the locked group must narrow to the locked " +
        "group, not switch the control off everywhere"
    ).toBeTruthy()
  })

  it("the whole-team table (Settings › Choices, unscoped) keeps its \"New choice\" button", async () => {
    render(<SettingsChoicesPanel teamId={TEAM} can={canEverything} />)
    expect(await screen.findByText("Consulting")).toBeTruthy()
    // Tickets is ONE page among many here, so `moduleOptions` is non-empty and
    // the button stands — the unscoped table is where a reader picks the group
    // in the dialog anyway.
    expect(
      screen.getByRole("button", { name: "New choice" }),
      "the main Settings › Choices table lost its create button. Its `moduleOptions` still holds every creatable " +
        "vocabulary in the team; only a mounting scoped to an uncreatable one resolves to nothing."
    ).toBeTruthy()
  })

  it("and a reader WITHOUT `selectable_data:create` is offered nothing on a creatable vocabulary either", async () => {
    render(
      <SettingsChoicesPanel teamId={TEAM} can={canReadOnly} scope={{ segment: "accounts", type: "Industry" }} />
    )
    expect(await screen.findByText("Consulting")).toBeTruthy()
    expect(
      screen.queryByRole("button", { name: "New value" }),
      "the right itself stopped gating the create button — `canAdd` must ask BOTH questions, not replace one " +
        "with the other"
    ).toBeNull()
  })
})
