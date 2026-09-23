// THE APP'S FILES TAB (T3850) — `AppAttachmentsPanel` wraps the shared
// `RecordAttachments` list (already proven generically by the ticket's and
// the story's own panels) with the app's own door and cache key. This file
// proves:
//   1. The empty state renders, with no add door drawn beside it (R88 — the
//      shared panel's own single door, the "Add a file"/"Add a link" row,
//      is the only one; the empty register itself carries no button).
//   2. A reader (canEdit=false) sees the list but no add door at all.
//   3. An editor (canEdit=true) sees the add door, and adding a link calls
//      tenancy.addAppAttachment with the app's id.

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const { appAttachments, addAppAttachment } = vi.hoisted(() => ({
  appAttachments: vi.fn(async () => ({ attachments: [], total: 0 })),
  addAppAttachment: vi.fn(async () => ({
    attachments: [
      {
        id: "att-1",
        appId: "app-1",
        kind: "link" as const,
        label: "Floor plan",
        url: "https://example.com/plan",
        contentType: null,
        sizeBytes: null,
        createdAt: "2026-09-23T00:00:00.000Z",
        addedByName: "Staff",
      },
    ],
    total: 1,
  })),
}))

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return {
    ...actual,
    tenancy: {
      ...actual.tenancy,
      appAttachments,
      addAppAttachment,
      removeAppAttachment: vi.fn(),
      updateAppAttachment: vi.fn(),
    },
  }
})

vi.mock("@shared/ui/components/sonner/sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}))

import { AppAttachmentsPanel } from "@/components/apps/app-attachments"

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("the app's own Files tab (T3850)", () => {
  it("an empty app shows the empty register and no add door beside it", async () => {
    render(<AppAttachmentsPanel appId="app-1" canEdit={true} />)
    expect(await screen.findByText("Nothing attached to this app yet.")).toBeTruthy()
    // R88 — the register itself draws no button; the panel's own single add
    // door (below the list) is the only one, and it is present here because
    // canEdit is true.
    expect(screen.getByRole("button", { name: "Add a file" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Add a link" })).toBeTruthy()
  })

  it("a reader sees no add door at all, empty or not", async () => {
    render(<AppAttachmentsPanel appId="app-1" canEdit={false} />)
    await screen.findByText("Nothing attached to this app yet.")
    expect(screen.queryByRole("button", { name: "Add a file" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Add a link" })).toBeNull()
  })

  it("an editor adding a link calls tenancy.addAppAttachment with this app's id", async () => {
    render(<AppAttachmentsPanel appId="app-1" canEdit={true} />)
    await screen.findByText("Nothing attached to this app yet.")

    fireEvent.click(screen.getByRole("button", { name: "Add a link" }))
    fireEvent.change(screen.getByPlaceholderText("What it is"), { target: { value: "Floor plan" } })
    fireEvent.change(screen.getByPlaceholderText("https://…"), {
      target: { value: "https://example.com/plan" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Submit" }))

    await waitFor(() => expect(addAppAttachment).toHaveBeenCalledTimes(1))
    expect(addAppAttachment).toHaveBeenCalledWith({
      id: "app-1",
      kind: "link",
      label: "Floor plan",
      url: "https://example.com/plan",
    })
    expect(await screen.findByText("Floor plan")).toBeTruthy()
  })
})
