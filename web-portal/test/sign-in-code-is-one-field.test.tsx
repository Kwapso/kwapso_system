// THE CLIENT'S OWN DOOR — the six-box code field, on the screen a client
// actually signs in through.
//
// `web/test/code-input-is-one-field.test.tsx` holds the behaviour suite for this
// control (backspace, paste spread, autofill, the numeric keypad, the group
// name). This is the smaller, different question, and it is the one "both front
// doors" means: the portal draws its own sign-in screen — the agency app signs
// in through the kit's `compositions/templates/sign-in`, this one is hand-built
// here — so a fix to the shared control is only reaching a client if THIS screen
// still renders it. It does not import the control by accident; it imports it on
// purpose, and this is the test that says so out loud rather than by grep.
//
// It drives the real screen from the email step, because the code step is not a
// prop: the only honest way to reach it is the way a person does.

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/api", async () => {
  const real = await vi.importActual<typeof import("@shared/web/api")>("@shared/web/api")
  return {
    ApiFailure: real.ApiFailure,
    auth: {
      startEmail: async () => ({}),
      verifyEmail: async () => ({}),
      googleStartUrl: "/api/auth/google/start",
    },
  }
})

import { SignIn } from "@/components/sign-in"

afterEach(cleanup)

describe("the portal's sign-in code field", () => {
  it("is one named control, not six anonymous boxes", async () => {
    render(<SignIn onSignedIn={() => {}} />)

    // The email step first — this is the real screen, driven the real way.
    fireEvent.change(screen.getByRole("textbox", { name: "Your email" }), {
      target: { value: "sam@acme.test" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Email me a code" }))

    const group = await screen.findByRole("group", { name: "Verification code" })
    const digits = screen.getAllByRole("textbox")
    expect(digits.length, "the code step drew something other than six boxes").toBe(6)
    for (const box of digits) expect(group.contains(box)).toBe(true)
    expect(screen.getByRole("textbox", { name: "Digit 1 of 6" })).toBe(digits[0])
  })
})
