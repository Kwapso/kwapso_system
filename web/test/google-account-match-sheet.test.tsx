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
