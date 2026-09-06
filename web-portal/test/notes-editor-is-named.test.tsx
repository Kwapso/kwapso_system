// THE CLIENT'S OWN HALF — the portal's only notes editor, asked for by NAME.
//
// `web/test/notes-editor-is-named.test.tsx` is the agency side of this and
// carries the argument for why the assertion is `getByRole("textbox", { name })`
// rather than a check that an attribute exists. This file exists because the two
// front doors are two applications: a fix that lands in `web/` and is never
// rendered here is half a fix, and "Raise a ticket" is the one form on the whole
// portal — the box a client types their problem into, on the door that a person
// outside this agency actually opens.
//
// It is also the harder half to notice going wrong. The agency app has fifteen
// notes editors and somebody works in it every day; the portal has one, on a
// dialog a client opens occasionally, and nobody here reads it with a screen
// reader.

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { translate } from "@shared/i18n"
import { LanguageProvider } from "@shared/web/language"

// The dialog reads the client's own app sections to fill its one picker. An
// empty list is a real answer (a client whose sections nobody has written down
// yet), and it is the answer that leaves the description box as the only
// control on the form — which is exactly the shape being asserted.
vi.mock("@/lib/api", async () => {
  const real = await vi.importActual<typeof import("@shared/web/api")>("@shared/web/api")
  return { ApiFailure: real.ApiFailure, appModules: { list: async () => ({ modules: [] }) } }
})

import { RaiseTicketDialog } from "@/components/raise-ticket-dialog"
import { clearCache } from "@shared/web/store"

afterEach(() => {
  cleanup()
  clearCache()
})

describe("the portal's notes editor says what it is", () => {
  it("Raise a ticket's description box is a multi-line textbox called by its own label", () => {
    render(
      <LanguageProvider value="en">
        <RaiseTicketDialog open onOpenChange={() => {}} onSubmit={async () => {}} draftKey="t" />
      </LanguageProvider>
    )

    const box = screen.getByRole("textbox", { name: "What do you need?" })
    expect(box.getAttribute("contenteditable"), "the named textbox is not the editor").toBe("true")
    expect(box.getAttribute("aria-multiline")).toBe("true")
    // The `Field`'s `htmlFor` reaching the editable node — the binding that was
    // decoration until this lane.
    expect(box.id, "the Field's htmlFor never reached the editor").toBe("ticket-desc")
  })

  it("…and says it in the reader's language", () => {
    render(
      <LanguageProvider value="es">
        <RaiseTicketDialog open onOpenChange={() => {}} onSubmit={async () => {}} draftKey="t" />
      </LanguageProvider>
    )
    const spanish = translate("What do you need?", "es")
    expect(spanish, "the catalogue has no Spanish for this label — the test would prove nothing").not.toBe(
      "What do you need?"
    )
    expect(screen.getByRole("textbox", { name: spanish })).toBeTruthy()
  })
})
