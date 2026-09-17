// shared/web/upload-items.ts — the one seam every FileUpload call site now
// builds its `FileUploadItem`s through (web/test/file-upload-items-feed-tiles.test.ts
// is the census that every call site actually does). Two halves, tested here:
//
//   · usePickedFileItems — a picked browser `File` → an object URL preview for
//     `image/*`, nothing for anything else, revoked the moment the file drops
//     out of the list or the hook's owner unmounts.
//   · storedFileToUploadItem — an already-stored file (R40's own shape) → a
//     preview only when `safeSrc` accepts the href AND the declared MIME is a
//     renderable image, with the one named `data:` exception this app's own
//     client-side resize pipeline relies on.

import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { pickedFileId, storedFileToUploadItem, usePickedFileItems } from "@shared/web/upload-items"

function makeFile(name: string, type: string, bytes = "x"): File {
  return new File([bytes], name, { type })
}

describe("usePickedFileItems", () => {
  let created: string[]
  let revoked: string[]

  beforeEach(() => {
    created = []
    revoked = []
    let n = 0
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn((file: File) => {
        const url = `blob:mock-${++n}-${file.name}`
        created.push(url)
        return url
      }),
      revokeObjectURL: vi.fn((url: string) => {
        revoked.push(url)
      }),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("an image file gets an object URL preview", async () => {
    const image = makeFile("photo.png", "image/png")
    const { result } = renderHook(() => usePickedFileItems([image]))

    await waitFor(() => expect(result.current[0]?.preview).toBeDefined())
    expect(result.current).toEqual([
      {
        id: pickedFileId(image),
        name: "photo.png",
        size: 1,
        type: "image/png",
        preview: expect.stringContaining("blob:mock-"),
      },
    ])
    expect(created).toHaveLength(1)
  })

  it("a PDF gets no preview — the tile grid's own icon-and-tag fallback draws instead", async () => {
    const pdf = makeFile("contract.pdf", "application/pdf")
    const { result } = renderHook(() => usePickedFileItems([pdf]))

    // Give the effect a tick even though nothing should ever call createObjectURL.
    await waitFor(() => expect(result.current[0]).toBeDefined())
    expect(result.current).toEqual([
      { id: pickedFileId(pdf), name: "contract.pdf", size: 1, type: "application/pdf", preview: undefined },
    ])
    expect(created).toHaveLength(0)
  })

  it("removing a file revokes its object URL and reuses the one still present", async () => {
    const keep = makeFile("keep.png", "image/png")
    const drop = makeFile("drop.png", "image/png")
    const { result, rerender } = renderHook(({ files }) => usePickedFileItems(files), {
      initialProps: { files: [keep, drop] },
    })

    await waitFor(() => expect(result.current.every((i) => i.preview)).toBe(true))
    const keptUrl = result.current.find((i) => i.id === pickedFileId(keep))?.preview
    const droppedUrl = result.current.find((i) => i.id === pickedFileId(drop))?.preview
    expect(keptUrl).toBeDefined()
    expect(droppedUrl).toBeDefined()

    rerender({ files: [keep] })

    await waitFor(() => expect(revoked).toContain(droppedUrl))
    // The surviving file's URL is REUSED, never revoked and recreated.
    expect(revoked).not.toContain(keptUrl)
    expect(result.current).toEqual([
      { id: pickedFileId(keep), name: "keep.png", size: 1, type: "image/png", preview: keptUrl },
    ])
  })

  it("unmounting revokes every object URL still held", async () => {
    const image = makeFile("photo.png", "image/png")
    const { result, unmount } = renderHook(() => usePickedFileItems([image]))

    await waitFor(() => expect(result.current[0]?.preview).toBeDefined())
    const url = result.current[0]?.preview as string

    act(() => {
      unmount()
    })

    expect(revoked).toContain(url)
  })
})

describe("storedFileToUploadItem", () => {
  it("an image href with a renderable mime gets a preview", () => {
    const item = storedFileToUploadItem({
      id: "a1",
      name: "cover.jpg",
      href: "/media/abc123",
      mime: "image/jpeg",
    })
    expect(item).toEqual({ id: "a1", name: "cover.jpg", size: undefined, type: "image/jpeg", preview: "/media/abc123" })
  })

  it("a link kind with no declared mime gets no preview", () => {
    const item = storedFileToUploadItem({ id: "a2", name: "spec.pdf", href: "/media/def456", mime: null })
    expect(item.preview).toBeUndefined()
    expect(item.type).toBeUndefined()
  })

  it("a data: URL — this app's own resize pipeline — gets a preview even though safeSrc refuses data:", () => {
    const item = storedFileToUploadItem({
      id: "a3",
      name: "logo.jpg",
      href: "data:image/jpeg;base64,/9j/AAA=",
    })
    expect(item.preview).toBe("data:image/jpeg;base64,/9j/AAA=")
    expect(item.type).toBe("image/jpeg")
  })

  it("an unsafe scheme never becomes a preview, whatever the declared mime says", () => {
    const item = storedFileToUploadItem({
      id: "a4",
      name: "evil.png",
      href: "javascript:alert(1)",
      mime: "image/png",
    })
    expect(item.preview).toBeUndefined()
  })

  it("size is carried through when given, and left undefined otherwise", () => {
    const withSize = storedFileToUploadItem({ id: "a5", name: "x.png", href: "/media/x", mime: "image/png", size: 2048 })
    expect(withSize.size).toBe(2048)
    const withoutSize = storedFileToUploadItem({ id: "a6", name: "y.png", href: "/media/y", mime: "image/png" })
    expect(withoutSize.size).toBeUndefined()
  })
})
