// THE TRIGGER KEEPS THE FACE (OR THE ICON) ONCE SELECTED, WITH NO
// PER-CALL-SITE PROP.
//
// Two rulings, Aurora, verbatim, 21 Sep 2026: "on every choice component
// where I can choose a ticket, show me the type as the icon everywhere,"
// and "on choice components, when I have selected, for example, the app,
// in the dropdown I see the icon, but I want to continue seeing it also
// once it's selected. This app accounts for people everywhere where I
// select something with an avatar or an image. Still show it once it's
// selected, or the icon."
//
// Kit v1.2.144 closes the gap on the SELECT SIDE: `SelectItem` registers
// its own `(value, face)` pair as it renders, and `SelectTrigger` reads the
// registry for the current value on its own; no call site anywhere below
// passes a `face` prop to `SelectTrigger` in this file, on purpose, because
// proving the automatic path is the whole point.
//
// TWO THINGS PROVED HERE:
//   1 · A MOUNTED SELECT keeps the face mark inside the trigger after an
//       option is picked and the list has closed, for both face shapes the
//       kit now carries (a photo/initials `Avatar`, and a glyph icon).
//   2 · A SOURCE CENSUS that every `<SelectItem`/`<SelectTrigger` in this
//       app that carries a `face=` prop is rendered through the KIT's own
//       `Select` (`@shared/ui/components/select/select`), never a bespoke
//       component reusing the same prop name; the same discipline R39
//       ("the kit supplies the UI, and nothing else does") already holds
//       every other control to.

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it } from "vitest"

import { join } from "node:path"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/ui/components/select/select"
import { ticketFace } from "@shared/web/ticket-face"

const ROOT = join(import.meta.dirname, "..", "..")

/** Radix measures itself and captures the pointer; jsdom does neither; the
 * same polyfill `help-form-dialog-raised-by.test.tsx` and
 * `help-stakeholders.test.tsx` already use for the identical reason. */
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

afterEach(cleanup)

describe("SelectTrigger: keeps the selected option's face automatically", () => {
  it("shows the avatar face on the closed trigger after picking a person, with no face prop on SelectTrigger", async () => {
    render(
      <Select defaultValue="priya">
        <SelectTrigger id="pick-a-person" aria-label="Pick a person">
          <SelectValue placeholder="Pick a person" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="priya" face={{ name: "Priya Raman" }}>
            Priya Raman
          </SelectItem>
          <SelectItem value="owen" face={{ name: "Owen Tate" }}>
            Owen Tate
          </SelectItem>
        </SelectContent>
      </Select>
    )
    const trigger = document.getElementById("pick-a-person") as HTMLElement
    // Never opened yet; the registry populates from Radix's own
    // always-mounted items, so the face is already there before the first
    // open, the same way SelectValue's own text is.
    expect(trigger.querySelector('[data-slot="avatar"]'), "the face before the list is ever opened").toBeTruthy()

    fireEvent.click(trigger)
    const owen = await screen.findByRole("option", { name: /Owen Tate/ })
    fireEvent.click(owen)

    // The list is closed again (Radix closes on pick) and the trigger still
    // carries the newly selected option's own face.
    expect(trigger.textContent).toContain("Owen Tate")
    expect(trigger.querySelector('[data-slot="avatar"]'), "the face after picking and closing").toBeTruthy()
  })

  it("shows the icon face on the closed trigger after picking a ticket, built through ticketFace", async () => {
    const tickets = [
      { id: "t1", title: "Dispatch board will not load", helpType: "Issue" },
      { id: "t2", title: "How do I add a driver?", helpType: "Question" },
    ]
    render(
      <Select defaultValue="t1">
        <SelectTrigger id="pick-a-ticket" aria-label="Pick a ticket">
          <SelectValue placeholder="Pick a ticket" />
        </SelectTrigger>
        <SelectContent>
          {tickets.map((ticket) => (
            <SelectItem key={ticket.id} value={ticket.id} face={ticketFace(ticket)}>
              {ticket.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
    const trigger = document.getElementById("pick-a-ticket") as HTMLElement
    expect(
      trigger.querySelector('[data-slot="select-face-icon"]'),
      "the type icon before the list is ever opened"
    ).toBeTruthy()

    fireEvent.click(trigger)
    const question = await screen.findByRole("option", { name: /How do I add a driver/ })
    fireEvent.click(question)

    expect(trigger.textContent).toContain("How do I add a driver")
    expect(
      trigger.querySelector('[data-slot="select-face-icon"]'),
      "the type icon after picking and closing"
    ).toBeTruthy()
    // A real glyph, not an empty badge.
    expect(trigger.querySelector('[data-slot="select-face-icon"] svg')).toBeTruthy()
  })

  it("still lets an explicit face prop on SelectTrigger override the registry's own answer", async () => {
    render(
      <Select defaultValue="priya">
        <SelectTrigger id="pick-with-override" aria-label="Pick" face={{ name: "Override Face" }}>
          <SelectValue placeholder="Pick" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="priya" face={{ name: "Priya Raman" }}>
            Priya Raman
          </SelectItem>
        </SelectContent>
      </Select>
    )
    const trigger = document.getElementById("pick-with-override") as HTMLElement
    // Initials for "Override Face" ("OF"), not "Priya Raman"'s ("PR"); the
    // explicit prop won, exactly as the nine pre-existing call sites need.
    expect(trigger.textContent).toContain("OF")
  })
})

describe("every face= on a SelectItem/SelectTrigger is rendered through the kit Select, never a bespoke trigger", () => {
  const KIT_SELECT_IMPORT = "@shared/ui/components/select/select"

  function findingsWithFaceProp(): { rel: string; imports: boolean }[] {
    const files = sourceFiles([join(ROOT, "web", "components"), join(ROOT, "shared", "web")], {
      extensions: [".tsx"],
      relativeTo: ROOT,
      skipTests: true,
    })
    const out: { rel: string; imports: boolean }[] = []
    for (const f of files) {
      const src = stripComments(f.source)
      const carriesFace = /<Select(Item|Trigger)\b[^>]*\bface\s*=/.test(src)
      if (!carriesFace) continue
      out.push({ rel: f.rel, imports: src.includes(KIT_SELECT_IMPORT) })
    }
    return out
  }

  it("found at least one real call site to prove the census is reading something", () => {
    expect(findingsWithFaceProp().length).toBeGreaterThan(0)
  })

  it("every one of them imports SelectItem/SelectTrigger from the kit's own select module", () => {
    const bespoke = findingsWithFaceProp().filter((f) => !f.imports)
    expect(
      bespoke.map((f) => f.rel),
      "these files draw a face= prop on something named SelectItem/SelectTrigger without importing " +
        `the kit's own component; a bespoke reimplementation of the kit's face contract: ${bespoke
          .map((f) => f.rel)
          .join(", ")}`
    ).toEqual([])
  })
})
