// THE SIGN-IN CODE, AS A SCREEN READER AND A THUMB MEET IT.
//
// This control is the worst place in the product to be lost. It is on the way
// IN — a person who cannot work it cannot reach the app, cannot reach the
// language switcher, and cannot reach anybody to complain to. It also has no
// second route: there is no password to fall back to.
//
// WHAT THIS SUITE IS FOR. The gap list asked for seven behaviours here and was
// written before several of them shipped, so the first job was to find out which
// were already true rather than to rebuild them. Four were (`length`,
// auto-advance, `inputMode`, `disabled`) and are pinned below anyway — an
// existing behaviour with no test is one refactor away from being a former
// behaviour. Three were not, and those are the tests that would have been red an
// hour ago: backspace that CLEARS as well as moves, a paste that spreads from
// the box it landed in rather than from the start of the row, and the whole
// thing announcing itself as ONE named field instead of six anonymous boxes.
//
// EVERY NAME IS ASKED FOR THROUGH THE ACCESSIBILITY TREE (`getByRole`), never by
// reading an attribute, for the reason `notes-editor-is-named.test.tsx` sets out
// at length: an attribute that is present and an attribute that names something
// look identical to a test that only checks presence.

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import * as React from "react"
import { afterEach, describe, expect, it } from "vitest"

import { translate } from "@shared/i18n"
import { CodeInput } from "@shared/web/code-input"
import { LanguageProvider } from "@shared/web/language"

afterEach(cleanup)

/** The control as its two call sites hold it: a string of digits in the
 * caller's own state, handed back one whole code at a time. Rendering the real
 * thing against a real `useState` is what makes the paste and backspace
 * assertions below mean anything — a stubbed `onChange` would prove the handler
 * fired and nothing about what the six boxes then show. */
function Harness({ start = "", disabled = false }: { start?: string; disabled?: boolean }) {
  const [code, setCode] = React.useState(start)
  return <CodeInput value={code} onChange={setCode} disabled={disabled} />
}

const boxes = () => screen.getAllByRole("textbox") as HTMLInputElement[]
const paste = (el: HTMLElement, text: string) =>
  fireEvent.paste(el, { clipboardData: { getData: () => text } })

describe("the sign-in code is one field", () => {
  it("announces itself as one named group, with six boxes that each say where they are", () => {
    render(<Harness />)

    // ONE control. Before this it was six inputs with no relationship a screen
    // reader could report — the reader was told about box four and never that
    // there were six of them or what they were for.
    const group = screen.getByRole("group", { name: "Verification code" })
    expect(group).toBeTruthy()

    const inputs = boxes()
    expect(inputs.length).toBe(6)
    for (const input of inputs) expect(group.contains(input)).toBe(true)

    // …and each box still answers "which of the six am I in".
    expect(screen.getByRole("textbox", { name: "Digit 1 of 6" })).toBe(inputs[0])
    expect(screen.getByRole("textbox", { name: "Digit 6 of 6" })).toBe(inputs[5])
  })

  it("says both of those in the reader's language", () => {
    // The per-box name used to be a template literal, which the extractor cannot
    // see and the catalogue therefore never held: it was English forever, in
    // every language, on the one screen a person cannot get past.
    render(
      <LanguageProvider value="de">
        <Harness />
      </LanguageProvider>
    )
    const groupName = translate("Verification code", "de")
    const boxName = translate("Digit {position} of {total}", "de", { position: 3, total: 6 })
    expect(groupName, "no German for the group name — the test would prove nothing").not.toBe(
      "Verification code"
    )
    expect(boxName).not.toContain("Digit")
    expect(screen.getByRole("group", { name: groupName })).toBeTruthy()
    expect(screen.getByRole("textbox", { name: boxName })).toBeTruthy()
  })

  it("offers a phone its numeric keypad and the code out of the message", () => {
    render(<Harness />)
    const inputs = boxes()
    for (const input of inputs) expect(input.getAttribute("inputmode")).toBe("numeric")
    // On the FIRST box only. The platform reads the whole code into the box it
    // fills, and six one-time-code fields over one row asks a phone to offer the
    // same suggestion six times.
    expect(inputs[0].getAttribute("autocomplete")).toBe("one-time-code")
    for (const input of inputs.slice(1)) expect(input.getAttribute("autocomplete")).toBe("off")
  })

  it("advances as digits are typed", () => {
    render(<Harness />)
    fireEvent.change(boxes()[0], { target: { value: "4" } })
    expect(boxes()[0].value).toBe("4")
    expect(document.activeElement).toBe(boxes()[1])
  })

  it("spreads a pasted code across the boxes, starting where it landed", () => {
    render(<Harness />)
    paste(boxes()[0], "123456")
    expect(boxes().map((b) => b.value).join("")).toBe("123456")
  })

  it("…and a paste into a later box fills forward from THERE, not from the first", () => {
    // The old spread ignored which box received it, so pasting the tail of a
    // code into box five rewrote boxes one and two instead.
    render(<Harness start="12" />)
    paste(boxes()[2], "345")
    expect(boxes().map((b) => b.value).join("")).toBe("12345")
  })

  it("handles the phone's own autofill, which arrives as typing rather than as a paste", () => {
    // A platform filling the code from the SMS raises an input event, not a
    // paste event. Both paths run through one `spreadFrom`, and this is the
    // assertion that keeps them from drifting apart.
    render(<Harness />)
    fireEvent.change(boxes()[0], { target: { value: "654321" } })
    expect(boxes().map((b) => b.value).join("")).toBe("654321")
  })

  it("backspace on an empty box goes back AND clears — one press, one digit", () => {
    render(<Harness start="12" />)
    const third = boxes()[2]
    third.focus()
    fireEvent.keyDown(third, { key: "Backspace" })

    // The digit is GONE, not merely focused. Before this the first press only
    // moved and the second deleted, so undoing a mis-keyed digit took two
    // presses and the caret appeared to stall on a box still showing a number.
    expect(boxes().map((b) => b.value).join("")).toBe("1")
    expect(document.activeElement).toBe(boxes()[1])
  })

  it("goes quiet while a code is being checked", () => {
    render(<Harness start="123456" disabled />)
    for (const input of boxes()) expect(input.disabled).toBe(true)
  })
})
