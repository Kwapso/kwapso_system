// THE CHAT FACE, THE SAME SIZE AS "ON THE LOOP", Aurora, 21 Sep 2026,
// verbatim, on the chat message avatar (then 40px through kit TicketThread's
// own `faceSize="md"`): "idk, still not happy about the size. make them the
// same size as 'on the loop'."
//
// "On the loop" is help-stakeholders.tsx's own read-only row of stakeholder
// chips (`PersonCard orientation="horizontal" size="choice"`), which draws
// its face through `shared/web/record-mark.tsx`'s `RecordMark size="choice"`,
// `BOX.choice`, `size-[var(--avatar-sm)]` (24px, the kit's own
// `--avatar-sm` token). `help-detail.tsx`'s `TicketThread` call already
// defaults `faceSize` to `"sm"` when unset, which reads the kit's own
// `Avatar size="sm"`, `size-[var(--avatar-sm)]` too, the SAME class the
// loop chip's mark carries, so no kit change was needed; only the call
// site's `faceSize="md"` line moved to `faceSize="sm"`.
//
// This file proves the two faces agree on the box: both mark elements carry
// the literal `size-[var(--avatar-sm)]` class, the one shared source of
// truth (`--avatar-sm` in tokens.css), rather than trusting that two
// differently-drawn elements (a real kit `Avatar` in the thread, a plain
// `RecordMark` span in the stakeholders card) happen to read the same today.

import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import type { HelpStakeholder } from "@shared/types"
import { HelpStakeholders } from "@/components/tickets/help-stakeholders"
import { TicketThread } from "@shared/ui/components/ticket-thread/ticket-thread"

afterEach(cleanup)

const RAISER: HelpStakeholder = {
  userId: "u-1",
  name: "Max Mustermann",
  email: "max@bergman.example",
  imageUrl: null,
  origin: "raiser",
}

const LOOP_MEMBER: HelpStakeholder = {
  userId: "u-2",
  name: "Aurora",
  email: "aurora@kwapso.com",
  imageUrl: null,
  origin: "admin",
}

const SIZE_CLASS = "size-[var(--avatar-sm)]"

describe("the chat face and the 'On the loop' chip's face are the same size", () => {
  it("TicketThread's own faceSize default ('sm', unset, help-detail.tsx's own call) draws the Avatar at --avatar-sm", () => {
    const { container } = render(
      <TicketThread messages={[{ id: "m1", side: "mine", initials: "AB", body: "Hello" }]} />
    )
    const avatar = container.querySelector('[data-slot="avatar"]') as HTMLElement
    expect(avatar).toBeTruthy()
    expect(avatar.getAttribute("data-size")).toBe("sm")
    expect(avatar.className).toContain(SIZE_CLASS)
  })

  it("the 'On the loop' chip's own mark draws at --avatar-sm too (RecordMark size=\"choice\")", () => {
    const { container } = render(<HelpStakeholders stakeholders={[RAISER, LOOP_MEMBER]} />)
    const loopCard = container.querySelector('[data-slot="loop-card"]') as HTMLElement
    expect(loopCard).toBeTruthy()
    const mark = loopCard.querySelector("span[aria-hidden]") as HTMLElement
    expect(mark).toBeTruthy()
    expect(mark.className).toContain(SIZE_CLASS)
  })

  it("both faces carry the exact same size class, one shared token, not a coincidence", () => {
    const thread = render(
      <TicketThread messages={[{ id: "m1", side: "mine", initials: "AB", body: "Hello" }]} />
    )
    const avatar = thread.container.querySelector('[data-slot="avatar"]') as HTMLElement
    const threadSizeToken = avatar.className.split(" ").find((c) => c.startsWith("size-["))
    thread.unmount()

    const loop = render(<HelpStakeholders stakeholders={[RAISER, LOOP_MEMBER]} />)
    const loopCard = loop.container.querySelector('[data-slot="loop-card"]') as HTMLElement
    const mark = loopCard.querySelector("span[aria-hidden]") as HTMLElement
    const loopSizeToken = mark.className.split(" ").find((c) => c.startsWith("size-["))
    loop.unmount()

    expect(threadSizeToken).toBe(SIZE_CLASS)
    expect(loopSizeToken).toBe(SIZE_CLASS)
    expect(threadSizeToken).toBe(loopSizeToken)
  })
})
