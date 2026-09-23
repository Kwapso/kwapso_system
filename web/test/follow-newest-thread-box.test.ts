// T3841 — "opening a ticket's page scrolls straight down to the reply
// composer, so no ticket info visible on arrival." `useFollowNewest`
// (`shared/web/follow-newest.ts`) landed on the newest reply by scrolling
// `[data-slot="screen-shell-body"]` — right while that element WAS the
// thread's own bounded pane (kit v1.2.28), wrong from R89 round 28 on, when
// it became the WHOLE ticket page's one scroll region
// (`ticket-detail-body.tsx`). Landing on the newest reply then dragged the
// entire page to the bottom on open: composer visible, title and stage
// ladder scrolled out of view.
//
// The fix gives the thread's own scroller (`TicketConversationPanel`'s
// `CardContent`) a marker, `[data-thread-scroll]`, and points `threadBox()`
// at that instead. This test proves the hook now moves ONLY that bounded
// box — window.scrollTo is never called — mirroring
// `web-portal/test/follow-newest.test.ts`'s own probe shape for the door
// where no such box exists (the portal still scrolls the document, and this
// suite doesn't touch that path).

import * as React from "react"
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useFollowNewest } from "@shared/web/follow-newest"

describe("useFollowNewest — the agency door's bounded thread box", () => {
  let root: Root | null = null
  let mountHost: HTMLDivElement | null = null
  let threadBox: HTMLDivElement | null = null
  let windowScrollTo: ReturnType<typeof vi.fn>
  let boxScrollTo: ReturnType<typeof vi.fn>

  function Probe({ id, mine }: { id: string | null; mine: boolean }) {
    useFollowNewest(id, mine)
    return null
  }

  async function show(id: string | null, mine = false) {
    await act(async () => {
      root?.render(React.createElement(Probe, { id, mine }))
    })
  }

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

    windowScrollTo = vi.fn()
    Object.defineProperty(window, "scrollTo", { value: windowScrollTo, configurable: true })

    // The bounded thread pane a real ticket page renders — `TicketConversationPanel`'s
    // own `CardContent`, marked `data-thread-scroll` (ticket-detail-body.tsx).
    threadBox = document.createElement("div")
    threadBox.setAttribute("data-thread-scroll", "true")
    boxScrollTo = vi.fn()
    Object.defineProperty(threadBox, "scrollTo", { value: boxScrollTo, configurable: true })
    Object.defineProperty(threadBox, "scrollHeight", { value: 3000, configurable: true })
    Object.defineProperty(threadBox, "scrollTop", { value: 0, configurable: true, writable: true })
    Object.defineProperty(threadBox, "clientHeight", { value: 500, configurable: true })
    document.body.append(threadBox)

    mountHost = document.createElement("div")
    document.body.append(mountHost)
    root = createRoot(mountHost)
  })

  afterEach(async () => {
    await act(async () => root?.unmount())
    mountHost?.remove()
    threadBox?.remove()
    root = null
    threadBox = null
  })

  it("lands on the newest reply by scrolling the thread's own box, never the page", async () => {
    await show("m1")
    expect(boxScrollTo).toHaveBeenCalledTimes(1)
    expect(boxScrollTo.mock.calls[0][0]).toMatchObject({ top: 3000, behavior: "auto" })
    // THE WHOLE POINT — the ticket page itself must stay put so the title
    // and stage ladder are still on screen when the reader lands.
    expect(windowScrollTo).not.toHaveBeenCalled()
  })

  it("follows an appended reply inside the same bounded box", async () => {
    await show("m1")
    Object.defineProperty(threadBox as HTMLDivElement, "scrollTop", { value: 2500, configurable: true })
    await show("m2")
    expect(boxScrollTo).toHaveBeenCalledTimes(2)
    expect(boxScrollTo.mock.calls[1][0]).toMatchObject({ behavior: "smooth" })
    expect(windowScrollTo).not.toHaveBeenCalled()
  })
})
