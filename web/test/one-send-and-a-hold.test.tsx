// THE COMPOSER AS PAINTED — one send control, and it does not send anything
// for five seconds.
//
// FORMERLY "two-sends-and-a-hold.test.tsx". B0294/T3657, 16 Sep 2026: "Send
// and close button too easy to hit by accident … the close button needs to
// move to the top." The bottom "Send and close" button this file used to pin
// sat right beside the plain Send it still draws — one stray click away from
// closing a ticket somebody meant to keep answering. It is gone; closing now
// happens only through the title's "Answer and close" (help-detail.tsx,
// offered at every status `canClose` allows), which is proved separately in
// web/test/ticket-close-moved-to-top.test.tsx. This file keeps exactly what a
// person still gets on the composer row: typing, and Send.
//
// Its sibling (`five-seconds-before-it-sends.test.ts`) drives the state machine
// directly and proves the timing. This one reads the DOM a person actually gets:
// that the wordless send has a NAME a screen reader can say, that pressing it
// empties the field and calls no door for five seconds, and that Undo puts
// every character back.
//
// WHY THE ACCESSIBLE NAME IS A TEST RATHER THAN A CODE REVIEW NOTE: the client
// asked for "the only icon for send", and an icon-only button whose label
// somebody forgets announces itself as "button". That is not a rendering fault
// anybody sees on screen, which is exactly the kind of thing that ships.

import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { Toaster, toast } from "@shared/ui/components/sonner/sonner"

import { ReplyComposer, useReplySend } from "@/components/tickets/reply-composer"

/** Every door call the composer made, in order. */
type Sent = { text: string; leaving: boolean }

/** THE TICKET SCREEN, in miniature. The hold is owned by the SCREEN and not by
 * the composer — the tab strip unmounts the panel it is not showing, and the
 * client's ruling is that she may open Related stories while it counts — so a
 * test that rendered the composer alone would be testing a shape the app does
 * not have. This host calls the hook the way `help-detail.tsx` does. */
function Host({
  answered,
  onSend,
  /** False stands for another tab being open on the ticket — Radix unmounts the
   * panel it is not showing, so the composer genuinely goes away while the
   * screen around it stays. */
  showing = true,
}: {
  answered: boolean
  onSend: (text: string, leaving: boolean) => Promise<string>
  showing?: boolean
}) {
  const send = useReplySend({ ticketId: "01TICKET", onSend })
  return showing ? <ReplyComposer send={send} answered={answered} /> : null
}

function draw(options?: { answered?: boolean; showing?: boolean }) {
  const sent: Sent[] = []
  const view = render(
    <>
      {/* THE REAL TOAST HOST. The Undo the client asked for lives inside the
          toast, not on the composer, so a test that did not mount the stack
          could not press the control it is meant to be proving. */}
      <Toaster />
      <Host
        answered={options?.answered ?? false}
        showing={options?.showing ?? true}
        onSend={async (text, leaving) => {
          sent.push({ text, leaving })
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
          answered={options?.answered ?? false}
          showing={false}
          onSend={async (text, leaving) => {
            sent.push({ text, leaving })
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

describe("the ticket composer's one send", () => {
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

  it("draws a wordless send that a screen reader can still name, and no second control beside it", () => {
    draw()
    // The name is the button's own, not the glyph's: the paper plane is
    // aria-hidden, so this can only be passing because `aria-label` is there.
    const send = screen.getByRole("button", { name: "Send reply" })
    expect(send.textContent, "the plain send carries no words at all").toBe("")
    expect(send.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true")
    expect(send.querySelector("svg")?.getAttribute("focusable")).toBe("false")

    // B0294/T3657 — THE REGRESSION ITSELF. "Send and close" used to sit right
    // here, one stray click from Send. It has no button, at any status, any
    // more; closing moved to the title (`ticket-close-moved-to-top.test.tsx`).
    expect(screen.queryByRole("button", { name: "Send and close" })).toBeNull()
    // …and the row holds exactly one button — typing, and Send.
    expect(screen.getAllByRole("button")).toHaveLength(1)
  })

  it("hands the focus ring to the pill, so the ring is the shape a reader sees", () => {
    draw()
    const field = screen.getByLabelText("Message")
    const pill = field.closest("[data-slot='reply-composer']")

    // THE CLIENT'S SECOND SCREENSHOT, 7 Sep 2026: "the select here should be
    // round" — a hard 1px rectangle with square corners sitting inside the
    // white pill. Nothing had drawn a border: it was the one global
    // `:focus-visible` outline landing on the BARE input, which is the node
    // that takes focus and the node with no box and no radius of its own.
    //
    // THIS IS A DOM TEST AND NOT A CSS ONE ON PURPOSE. The rule that moves the
    // ring lives in the kit (tokens.css §8) and is not loaded here; what the
    // app owns, and what was actually missing, is the PAIR of marks that opts
    // this composite control into it. A ring that draws on the wrong box is
    // invisible to every other check in this repo — `focus-ring.test.ts` reads
    // source for a suppressed or restated ring, and neither had happened.
    expect(
      pill?.hasAttribute("data-focus-shell"),
      "the pill must take the ring — see the note in reply-composer.tsx"
    ).toBe(true)
    expect(
      field.hasAttribute("data-focus-proxy"),
      "the bare field must hand its ring over, or it draws a rectangle inside the pill"
    ).toBe(true)
  })

  it("says the ticket is answered in the placeholder, and still takes a reply", () => {
    draw({ answered: true })
    expect(
      (screen.getByLabelText("Message") as HTMLInputElement).placeholder
    ).toBe("This ticket is answered. Reply anyway…")
    // The send is still there — a reply on a closed ticket appends and touches
    // no status, which is the whole point of the sentence above.
    expect(screen.getByRole("button", { name: "Send reply" })).toBeTruthy()
  })

  it("keeps send dead until something is typed", () => {
    draw()
    expect((screen.getByRole("button", { name: "Send reply" }) as HTMLButtonElement).disabled).toBe(true)
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
      { text: "hold on, let me check the stories", leaving: false },
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
      { text: "on my way out", leaving: false },
    ])
  })
})
