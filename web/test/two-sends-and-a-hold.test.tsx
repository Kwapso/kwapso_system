// THE COMPOSER AS PAINTED — two send controls, and neither of them sends
// anything for five seconds.
//
// Its sibling (`five-seconds-before-it-sends.test.ts`) drives the state machine
// directly and proves the timing. This one reads the DOM a person actually gets:
// that the wordless send has a NAME a screen reader can say, that "Send and
// close" is drawn beside it and only where it can do something, that pressing
// either one empties the field and calls no door, and that Undo puts every
// character back.
//
// WHY THE ACCESSIBLE NAME IS A TEST RATHER THAN A CODE REVIEW NOTE: the client
// asked for "the only icon for send", and an icon-only button whose label
// somebody forgets announces itself as "button". That is not a rendering fault
// anybody sees on screen, which is exactly the kind of thing that ships.

import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { Toaster, toast } from "@shared/ui/components/sonner/sonner"

import { ReplyComposer, useReplySend } from "@/components/reply-composer"

/** Every door call the composer made, in order. */
type Sent = { text: string; andClose: boolean; leaving: boolean }

/** THE TICKET SCREEN, in miniature. The hold is owned by the SCREEN and not by
 * the composer — the tab strip unmounts the panel it is not showing, and the
 * client's ruling is that she may open Related stories while it counts — so a
 * test that rendered the composer alone would be testing a shape the app does
 * not have. This host calls the hook the way `help-detail.tsx` does. */
function Host({
  canClose,
  answered,
  onSend,
  /** False stands for another tab being open on the ticket — Radix unmounts the
   * panel it is not showing, so the composer genuinely goes away while the
   * screen around it stays. */
  showing = true,
}: {
  canClose: boolean
  answered: boolean
  onSend: (text: string, andClose: boolean, leaving: boolean) => Promise<string>
  showing?: boolean
}) {
  const send = useReplySend({ ticketId: "01TICKET", onSend })
  return showing ? <ReplyComposer send={send} canClose={canClose} answered={answered} /> : null
}

function draw(options?: { canClose?: boolean; answered?: boolean; showing?: boolean }) {
  const sent: Sent[] = []
  const view = render(
    <>
      {/* THE REAL TOAST HOST. The Undo the client asked for lives inside the
          toast, not on the composer, so a test that did not mount the stack
          could not press the control it is meant to be proving. */}
      <Toaster />
      <Host
        canClose={options?.canClose ?? true}
        answered={options?.answered ?? false}
        showing={options?.showing ?? true}
        onSend={async (text, andClose, leaving) => {
          sent.push({ text, andClose, leaving })
          return "Sent."
        }}
      />
    </>
  )
  /** Re-render the same tree with the composer hidden — a tab switch, not a
   * navigation. The hook's own state survives; only its drawing goes. */
  const openAnotherTab = () =>
    view.rerender(
      <>
        <Toaster />
        <Host
          canClose={options?.canClose ?? true}
          answered={options?.answered ?? false}
          showing={false}
          onSend={async (text, andClose, leaving) => {
            sent.push({ text, andClose, leaving })
            return "Sent."
          }}
        />
      </>
    )
  return { sent, view, openAnotherTab }
}

/** Type into the field the way a person does, through React's own onChange. */
function type(words: string) {
  const field = screen.getByLabelText("Message") as HTMLInputElement
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    )?.set
    setter?.call(field, words)
    field.dispatchEvent(new Event("input", { bubbles: true }))
  })
  return field
}

const press = (name: string) =>
  act(() => {
    screen.getByRole("button", { name }).click()
  })

/** Walk the hold's clock, then let the chained door call actually go. */
const wait = async (seconds: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(seconds * 1000)
  })
}

describe("the ticket composer's two sends", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    sessionStorage.clear()
  })
  afterEach(() => {
    // Unmounting is not incidental here: the composer FLUSHES what it is
    // holding on the way out, so a test that left its tree standing would carry
    // a live five-second hold into the next one.
    cleanup()
    // sonner's queue is a MODULE-level store, so it outlives the tree that made
    // it — a toast left standing would be found by the next test's query.
    toast.dismiss()
    vi.useRealTimers()
  })

  it("draws a wordless send that a screen reader can still name, and a worded close beside it", () => {
    draw()
    // The name is the button's own, not the glyph's: the paper plane is
    // aria-hidden, so this can only be passing because `aria-label` is there.
    const send = screen.getByRole("button", { name: "Send reply" })
    expect(send.textContent, "the plain send carries no words at all").toBe("")
    expect(send.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true")
    expect(send.querySelector("svg")?.getAttribute("focusable")).toBe("false")

    // Its neighbour needs no label: its visible text IS its name.
    expect(screen.getByRole("button", { name: "Send and close" })).toBeTruthy()
  })

  it("draws no close control where there is nothing left to close", () => {
    draw({ canClose: false, answered: true })
    expect(screen.queryByRole("button", { name: "Send and close" })).toBeNull()
    // …and says so in the placeholder rather than leaving a dead control.
    expect(
      (screen.getByLabelText("Message") as HTMLInputElement).placeholder
    ).toBe("This ticket is answered. Reply anyway…")
  })

  it("keeps both sends dead until something is typed", () => {
    draw()
    expect((screen.getByRole("button", { name: "Send reply" }) as HTMLButtonElement).disabled).toBe(true)
    expect(
      (screen.getByRole("button", { name: "Send and close" }) as HTMLButtonElement).disabled
    ).toBe(true)
    type("Happy to — which address?")
    expect((screen.getByRole("button", { name: "Send reply" }) as HTMLButtonElement).disabled).toBe(false)
  })

  it("empties the field, shows the message as pending, and calls no door for five seconds", async () => {
    const { sent } = draw()
    type("Happy to — which address should the September retainer go to?")
    press("Send reply")

    // The composer empties on press — Undo is the route back.
    expect((screen.getByLabelText("Message") as HTMLInputElement).value).toBe("")
    // …and the words are on screen as a PENDING bubble rather than gone.
    expect(
      screen.getByText("Happy to — which address should the September retainer go to?")
    ).toBeTruthy()

    await wait(4)
    expect(sent, "nothing may reach a door before the hold reaches zero").toEqual([])

    await wait(1)
    expect(sent).toEqual([
      {
        text: "Happy to — which address should the September retainer go to?",
        andClose: false,
        leaving: false,
      },
    ])
  })

  it("undo before zero sends nothing and puts every character back", async () => {
    const { sent } = draw()
    type("Happy to — which address?")
    press("Send reply")
    await wait(3)

    press("Undo")
    expect((screen.getByLabelText("Message") as HTMLInputElement).value).toBe(
      "Happy to — which address?"
    )

    // And it never goes, however long anybody waits.
    await wait(60)
    expect(sent).toEqual([])
  })

  it("'Send and close' is the same rule with one flag changed", async () => {
    const { sent } = draw()
    type("The 4th, same as every month.")
    press("Send and close")

    // Same hold, same silence.
    await wait(4)
    expect(sent).toEqual([])

    await wait(1)
    expect(sent).toEqual([
      { text: "The 4th, same as every month.", andClose: true, leaving: false },
    ])
  })

  it("keeps the draft per ticket as she types, so a crash costs no words", () => {
    draw()
    type("half a sentence")
    // The one failure the five seconds cannot cover is the browser being killed
    // mid-wait. Nothing was posted — correct — and this is what means nothing
    // was lost either.
    expect(sessionStorage.getItem("kwapso:draft:help:reply:01TICKET")).toBe(
      JSON.stringify({ text: "half a sentence" })
    )
  })

  it("does NOT send early when she opens another tab on the same ticket", async () => {
    const { sent, openAnotherTab } = draw()
    type("hold on, let me check the stories")
    press("Send reply")
    await wait(2)

    // The artifact is explicit: during the five seconds "she can keep reading
    // the ticket, scroll, open the stories". The tab strip unmounts the panel
    // it is not showing, so a hold owned by the COMPOSER would be flushed here,
    // three seconds early, with the bubble vanishing as she looked away. It is
    // owned by the screen instead.
    await act(async () => {
      openAnotherTab()
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(sent, "opening another tab on the ticket is not leaving the ticket").toEqual([])

    // …and the rest of the wait still runs, from where it was.
    await wait(3)
    expect(sent).toEqual([
      { text: "hold on, let me check the stories", andClose: false, leaving: false },
    ])
  })

  it("sends what is held when the screen goes away", async () => {
    const { sent, view } = draw()
    type("on my way out")
    press("Send reply")
    await wait(2)

    // Navigating anywhere else in the app unmounts this screen.
    await act(async () => {
      view.unmount()
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(sent, "leaving is not a mistake — the wait is cut short, not cancelled").toEqual([
      { text: "on my way out", andClose: false, leaving: false },
    ])
  })
})
