// T3658/B0295 — RESOLVE IS DISABLED UNTIL A SCREENSHOT IS ATTACHED. This
// dialog's own picker is the same "pick, upload immediately, tile" shape the
// reply composer's tile grid already draws (`reply-composer.tsx`), through
// the SAME upload seam (`uploadFile`/`removeUploadedFile`, handed down from
// help-detail.tsx's own `uploadReplyFile`/`removeReplyFile`) — this file
// stands the dialog up on its own, with those two functions mocked, and
// drives a real pick/upload/submit rather than trusting the wiring by
// reading it.

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { HelpMessageAttachment } from "@shared/types"

vi.mock("@shared/ui/components/sonner/sonner", () => ({
  toast: { success: () => {}, error: () => {}, info: () => {} },
  Toaster: () => null,
}))

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

import { ResolveDialog, type ResolveFormValues } from "@/components/tickets/resolve-dialog"

afterEach(cleanup)

/** The picker's hidden native input — no accessible name of its own, the
 * same shape `reply-attachments.test.tsx` already reads this exact control
 * by (`reply-composer.tsx`'s own comment: a button cannot open a file dialog
 * on its own). */
function pickFile(name: string, type: string) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  const file = new File(["hello"], name, { type })
  Object.defineProperty(input, "files", { value: [file], configurable: true })
  fireEvent.change(input)
}

const ATTACHMENT: HelpMessageAttachment = {
  id: "att-1",
  name: "shot.png",
  href: "/media/team/ticket/shot.png",
  mime: "image/png",
  size: 1024,
}

function renderDialog(opts?: {
  uploadFile?: (file: File) => Promise<HelpMessageAttachment>
  onSubmit?: (values: ResolveFormValues) => Promise<void>
}) {
  const uploadFile = opts?.uploadFile ?? vi.fn(async () => ATTACHMENT)
  const removeUploadedFile = vi.fn(async () => {})
  const onSubmit = opts?.onSubmit ?? vi.fn(async () => {})
  const onOpenChange = vi.fn()
  render(
    <ResolveDialog
      open
      onOpenChange={onOpenChange}
      draft={null}
      draftKey="test:resolve"
      onSubmit={onSubmit}
      uploadFile={uploadFile}
      removeUploadedFile={removeUploadedFile}
    />
  )
  return { uploadFile, removeUploadedFile, onSubmit, onOpenChange }
}

beforeEach(() => {
  // A fresh draft key per test would need a real teamId/ticketId; this
  // suite always opens the SAME key, so whatever `useFormDraft` cached from
  // the previous render must not leak into the next one.
  window.localStorage?.clear?.()
})

describe("Resolve is disabled until an image is attached", () => {
  it("starts disabled — no resolution, no screenshot", () => {
    renderDialog()
    expect((screen.getByRole("button", { name: "Submit" }) as HTMLButtonElement).disabled).toBe(true)
  })

  it("stays disabled with words but no screenshot", () => {
    renderDialog()
    fireEvent.change(screen.getByPlaceholderText("What we did, in the words they'd use."), {
      target: { value: "Fixed it." },
    })
    expect((screen.getByRole("button", { name: "Submit" }) as HTMLButtonElement).disabled).toBe(true)
  })

  it("enables once an image has finished uploading and words are present", async () => {
    renderDialog()
    fireEvent.change(screen.getByPlaceholderText("What we did, in the words they'd use."), {
      target: { value: "Fixed it." },
    })
    fireEvent.click(screen.getByRole("button", { name: "Add a screenshot" }))
    pickFile("shot.png", "image/png")
    await waitFor(() =>
      expect((screen.getByRole("button", { name: "Submit" }) as HTMLButtonElement).disabled).toBe(false)
    )
  })

  it("a non-image pick is refused and never reaches the upload seam", async () => {
    const uploadFile = vi.fn(async () => ATTACHMENT)
    renderDialog({ uploadFile })
    fireEvent.click(screen.getByRole("button", { name: "Add a screenshot" }))
    pickFile("notes.pdf", "application/pdf")
    await new Promise((r) => setTimeout(r, 0))
    expect(uploadFile).not.toHaveBeenCalled()
  })
})

describe("submitting sends the resolution and the uploaded image's id", () => {
  it("onSubmit carries attachmentIds — the uploaded row's own id", async () => {
    const onSubmit = vi.fn(async () => {})
    renderDialog({ onSubmit })
    fireEvent.change(screen.getByPlaceholderText("What we did, in the words they'd use."), {
      target: { value: "Fixed it, and here is what changed." },
    })
    fireEvent.click(screen.getByRole("button", { name: "Add a screenshot" }))
    pickFile("shot.png", "image/png")
    await waitFor(() =>
      expect((screen.getByRole("button", { name: "Submit" }) as HTMLButtonElement).disabled).toBe(false)
    )
    fireEvent.click(screen.getByRole("button", { name: "Submit" }))
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        resolution: "Fixed it, and here is what changed.",
        attachmentIds: ["att-1"],
      })
    )
  })

  it("removing the tile calls removeUploadedFile and disables Submit again", async () => {
    const { removeUploadedFile } = renderDialog()
    fireEvent.change(screen.getByPlaceholderText("What we did, in the words they'd use."), {
      target: { value: "Fixed it." },
    })
    fireEvent.click(screen.getByRole("button", { name: "Add a screenshot" }))
    pickFile("shot.png", "image/png")
    await waitFor(() =>
      expect((screen.getByRole("button", { name: "Submit" }) as HTMLButtonElement).disabled).toBe(false)
    )
    fireEvent.click(screen.getByRole("button", { name: "Remove" }))
    await waitFor(() => expect(removeUploadedFile).toHaveBeenCalledWith("att-1"))
    expect((screen.getByRole("button", { name: "Submit" }) as HTMLButtonElement).disabled).toBe(true)
  })
})
