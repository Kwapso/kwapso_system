// "RAISED BY" IS NOW A DROPDOWN — client ruling, 18 Sep 2026, verbatim: "On
// ticket raised by, there should be a dropdown." This supersedes her own
// 2026-09-07 ruling for this one field only ("the raise by, no dropdown but
// visible all chips" — see `help-form-dialog.tsx`'s own comment at the
// field's call site for the full account of the supersession).
//
// THE DATA AND THE DEFAULT ARE UNCHANGED. This file proves only the CONTROL:
// the field renders as a real `<select>`-shaped combobox (Radix's own role)
// sourced from the chosen client's contacts, pre-lit on the account's main
// contact (the 2026-09-10 ruling, untouched), and picking a different
// contact updates the value the form will submit.

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return {
    ...actual,
    tenancy: {
      ...actual.tenancy,
      apps: async () => ({ apps: [], total: 0 }),
      appModules: async () => ({ modules: [] }),
      accountDetail: async () => ({
        account: { id: "account-1", name: "Bergman S.A." },
        links: [
          {
            id: "link-1",
            accountId: "account-1",
            personAccountId: "p-marta",
            personName: "Marta Nilsson",
            personLogoUrl: null,
            relationship: null,
            isMainStakeholder: true,
            active: true,
          },
          {
            id: "link-2",
            accountId: "account-1",
            personAccountId: "p-otto",
            personName: "Otto Berg",
            personLogoUrl: null,
            relationship: "Ops",
            isMainStakeholder: false,
            active: true,
          },
        ],
      }),
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

/** Radix measures itself and captures the pointer; jsdom does neither — the
 * same polyfill `toolbar-search-floor.test.tsx` and `help-stakeholders.test.tsx`
 * use for the identical reason. */
beforeAll(() => {
  Object.assign(window.HTMLElement.prototype, {
    scrollIntoView: () => {},
    hasPointerCapture: () => false,
    releasePointerCapture: () => {},
    setPointerCapture: () => {},
  })
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

import { HelpFormDialog } from "@/components/tickets/help-form-dialog"

afterEach(cleanup)

const EDIT_INITIAL = {
  titleEn: "The dispatch board will not load",
  description: "<p>None of my drivers can see today's routes.</p>",
  helpType: "Bug",
  accountId: "account-1",
  appId: null,
  moduleId: null,
  raisedByContactId: null,
}

describe("Raised by — a dropdown, sourced from the client's own contacts", () => {
  it("renders as a combobox (a real Select trigger), not a row of chips", async () => {
    render(
      <HelpFormDialog
        open
        onOpenChange={() => {}}
        onSubmit={vi.fn(async () => {})}
        helpTypeOptions={["Bug"]}
        teamId="team-1"
        initial={EDIT_INITIAL}
        helpId="help-1"
      />
    )
    // Wait for the account's contacts to arrive (the field starts disabled,
    // showing "No contacts yet.", until `accountDetail` resolves).
    await screen.findByText(/Marta Nilsson/)
    const trigger = document.getElementById("help-contact")
    expect(trigger?.getAttribute("role")).toBe("combobox")
    // The old chip-row rendering drew every contact as its own `role="radio"`
    // — none of that role should be left on this field.
    expect(screen.queryByRole("radio")).toBeNull()
  })

  it("defaults to the account's main contact, unchanged by the control swap", async () => {
    render(
      <HelpFormDialog
        open
        onOpenChange={() => {}}
        onSubmit={vi.fn(async () => {})}
        helpTypeOptions={["Bug"]}
        teamId="team-1"
        initial={EDIT_INITIAL}
        helpId="help-1"
      />
    )
    expect(await screen.findByText(/Marta Nilsson/)).toBeTruthy()
  })

  it("opens on click and lets a different contact be picked", async () => {
    render(
      <HelpFormDialog
        open
        onOpenChange={() => {}}
        onSubmit={vi.fn(async () => {})}
        helpTypeOptions={["Bug"]}
        teamId="team-1"
        initial={EDIT_INITIAL}
        helpId="help-1"
      />
    )
    await screen.findByText(/Marta Nilsson/)
    const trigger = document.getElementById("help-contact") as HTMLElement
    fireEvent.click(trigger)
    // Radix also renders a hidden native `<option>` for form fallback, which
    // shares the same text — `role="option"` is the visible, clickable one.
    const ottoOption = await screen.findByRole("option", { name: /Otto Berg/ })
    fireEvent.click(ottoOption)
    expect(trigger.textContent).toContain("Otto Berg")
  })
})

// Aurora, 20 Sep 2026, verbatim: "we can't edit the first message — it's not
// a description (that was the old model), so rather multiple messages under
// the same ticket." The raise form keeps writing the opening message; the
// edit form no longer shows or edits it at all.
describe("The first message — raise only, not an edit field (Aurora, 20 Sep 2026)", () => {
  it("does not render the description editor on an EDIT", async () => {
    render(
      <HelpFormDialog
        open
        onOpenChange={() => {}}
        onSubmit={vi.fn(async () => {})}
        helpTypeOptions={["Bug"]}
        teamId="team-1"
        initial={EDIT_INITIAL}
        helpId="help-1"
      />
    )
    // Wait for the form to settle exactly as the tests above do, so this one
    // is not racing the same account-contacts fetch.
    await screen.findByText(/Marta Nilsson/)
    expect(screen.queryByText("Description")).toBeNull()
    // `Notes` (shared/web/notes-editor/notes-editor.tsx) is a contentEditable
    // rich-text field, not an `<input>`/`<textarea>` — its placeholder is a
    // `data-placeholder` attribute read by a CSS `content: attr(...)` rule,
    // invisible to both `getByPlaceholderText` (real `placeholder` attribute
    // only) and `getByText` (rendered text nodes only, and jsdom does not
    // paint CSS generated content at all). Queried by its own `aria-label`
    // (the same words as the field's label, one config) rather than a bare
    // `[data-placeholder]` selector — Radix's own `SelectTrigger` (the
    // "Raised by" contact combobox, right below this field) sets that exact
    // attribute too, as its "no value chosen" state marker, and matched it.
    expect(document.querySelector('[aria-label="Description"]')).toBeNull()
  })

  it("still renders the description editor on a RAISE", () => {
    render(
      <HelpFormDialog
        open
        onOpenChange={() => {}}
        onSubmit={vi.fn(async () => {})}
        helpTypeOptions={["Bug"]}
        teamId="team-1"
      />
    )
    expect(screen.getByText("Description")).toBeTruthy()
    const editor = document.querySelector('[aria-label="Description"]')
    expect(editor).toBeTruthy()
    expect(editor?.getAttribute("data-placeholder")).toMatch(/Tell us what's going on/)
  })
})
