// TRACKER `b-filing` — the confirm-once sheet itself. `google-source-dialog.tsx`
// decides WHEN this opens (one item, one strong name match, nobody has
// touched the account field yet — see that file's own `matchAccount`); this
// only has to get right what happens once it is open: which account it
// names, and that "Not this one" and Escape/backdrop both mean the same
// thing (decline, never a silent confirm).

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { GoogleAccountMatchSheet } from "@/components/knowledge/google-account-match-sheet"

afterEach(cleanup)

describe("GoogleAccountMatchSheet", () => {
  it("names the folder and the account it matched", () => {
    render(
      <GoogleAccountMatchSheet
        open
        itemName="HOGO Q3 Project Files"
        accountName="Hogo Health Systems"
        onConfirm={() => {}}
        onDecline={() => {}}
      />
    )
    expect(screen.getByText("File this under Hogo Health Systems?")).toBeTruthy()
    expect(screen.getByText(/HOGO Q3 Project Files/)).toBeTruthy()
  })

  it("the matched account carries its own face (R35) — a RecordMark, not a bare word", () => {
    render(
      <GoogleAccountMatchSheet
        open
        itemName="HOGO Q3 Project Files"
        accountName="Hogo Health Systems"
        onConfirm={() => {}}
        onDecline={() => {}}
      />
    )
    // The Sheet renders through a portal into document.body, so the mark box
    // is looked up there, not on the render's own container. RecordMark's box
    // carries `bg-muted` — nothing else in this sheet does — and with no
    // picture on file its last-resort fallback is the account name's first
    // letter (record-mark.tsx's own rule). A plain <span> beside the name
    // would pass every other test in this file while still being the
    // bare-word row R35 refuses, so this checks the actual mark box and its
    // fallback glyph, not just any hidden element.
    const mark = document.body.querySelector('[class*="bg-muted"]')
    expect(mark, "no RecordMark box found beside the matched account's name").toBeTruthy()
    expect(mark?.textContent).toBe("H")
  })

  it("renders nothing when closed", () => {
    render(
      <GoogleAccountMatchSheet
        open={false}
        itemName="HOGO Q3 Project Files"
        accountName="Hogo Health Systems"
        onConfirm={() => {}}
        onDecline={() => {}}
      />
    )
    expect(screen.queryByText(/File this under/)).toBeNull()
  })

  it("confirming calls onConfirm and never onDecline", () => {
    const onConfirm = vi.fn()
    const onDecline = vi.fn()
    render(
      <GoogleAccountMatchSheet
        open
        itemName="HOGO Q3 Project Files"
        accountName="Hogo Health Systems"
        onConfirm={onConfirm}
        onDecline={onDecline}
      />
    )
    fireEvent.click(screen.getByText("Yes, file it under Hogo Health Systems"))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onDecline).not.toHaveBeenCalled()
  })

  it('"Not this one" declines, never confirms', () => {
    const onConfirm = vi.fn()
    const onDecline = vi.fn()
    render(
      <GoogleAccountMatchSheet
        open
        itemName="HOGO Q3 Project Files"
        accountName="Hogo Health Systems"
        onConfirm={onConfirm}
        onDecline={onDecline}
      />
    )
    fireEvent.click(screen.getByText("Not this one"))
    expect(onDecline).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
