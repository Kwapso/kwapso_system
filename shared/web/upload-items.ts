"use client"

// PICKED FILE / STORED FILE → `FileUploadItem` — the ONE seam every `<FileUpload`
// mount in this app builds its tiles through, so the kit's v1.2.110 tile grid
// (`shared/ui/components/file-upload/file-upload.tsx`, "OPTION B" in its own
// header) actually shows the picture rather than falling back to the generic
// icon everywhere.
//
// Client ruling, 17 Sep 2026, verbatim: "I can really see the images that I have
// already uploaded. They don't show only as the name, but I also see the image
// itself, or, if it's a document, a preview." Two different inputs answer that,
// and this file is both halves of it, next to the other upload helpers
// (`shared/web/file.ts`'s `readFileAsDataUrl`, `shared/web/attachment-preview.tsx`'s
// `AttachmentPreview`/`hasPreview`, which this reuses the exact same `safeSrc` +
// `isRenderableImage` seam as, for the identical reason: a preview `src` is
// still a URL boundary a client login could have written):
//
//   · A PICKED BROWSER `File`, not yet sent anywhere — `usePickedFileItems`.
//     The only bytes this component has are in the `File` itself, so the
//     preview is a same-origin `URL.createObjectURL`, created once per file and
//     revoked the moment that file is no longer in the list handed in (removed,
//     replaced, or the component holding them unmounts) — an object URL is a
//     real browser resource, and one that outlives its file is a leak nothing
//     else in this app would ever notice.
//   · AN ALREADY-STORED FILE — `storedFileToUploadItem`. R40's own shape: a
//     served URL and, where the record carries one, the MIME it was declared
//     with. `storedFileToUploadItem` never trusts that URL directly — it runs
//     it through `safeSrc` first, the identical check `AttachmentPreview` and
//     every account/app/team logo preview in this app already apply before a
//     stored string reaches an `<img src>` — with ONE named exception: a
//     `data:` URL, because that is this app's own client-side resize pipeline
//     talking to itself (`web/lib/image.ts`'s `fileToDataUrl`), never a value a
//     server sent back, and `safeSrc` refuses `data:` on purpose (its own
//     comment: "MUST never be javascript:/data:/blob:/vbscript:"). Every call
//     site that already special-cased this (`account-form-dialog.tsx`,
//     `app-form-dialog.tsx`) named the same exception the same way; this is
//     that pattern, once, rather than a fourth copy of it.

import * as React from "react"

import type { FileUploadItem } from "@shared/ui/components/file-upload/file-upload"
import { safeSrc } from "./rich-text"
import { isRenderableImage } from "@shared/workers/image"

/* ── PICKED FILES ────────────────────────────────────────────────────────── */

// A picked `File` has no id of its own, and this app's `pending`/`attached`
// state everywhere else is a plain `File[]` — asking every call site to also
// carry a parallel id array would be the second thing this helper exists to
// avoid. A `WeakMap` keyed on the `File` object itself is stable for as long as
// that exact File is still selected (browsers hand back the same object across
// re-renders) and costs nothing to clean up: an entry the app drops every other
// reference to is collected with the File, never held open by this map.
const PICKED_FILE_IDS = new WeakMap<File, string>()
let pickedFileSeq = 0

/** The stable id a picked `File` is known by — the same one `onRemove`'s
 *  argument carries, so a caller can filter its own `File[]` state by it. */
export function pickedFileId(file: File): string {
  let id = PICKED_FILE_IDS.get(file)
  if (!id) {
    id = `picked-${++pickedFileSeq}`
    PICKED_FILE_IDS.set(file, id)
  }
  return id
}

/**
 * Picked browser `File`s → tiles, an object URL preview for `image/*` and
 * none for anything else (a document tile falls back to the kit's own
 * icon-and-tag, drawn from `type` — there is no server-side thumbnail to show
 * yet, so this is honest about that rather than inventing one).
 *
 * MEMORY-SAFE BY CONSTRUCTION. One effect does the whole job, keyed by each
 * file's own identity: on every change to `files` it diffs against what it
 * created last time — reusing the URL for a file that is still there,
 * creating one only for a file that is new, and revoking one for a file that
 * dropped out (removed, or swapped for a fresh pick under the same slot) —
 * and a second, mount-only effect revokes whatever is left the moment the
 * component holding this hook unmounts. Neither path can leak: every URL this
 * hook ever mints is either reused, revoked on removal, or revoked on
 * unmount, and never both created and forgotten.
 */
export function usePickedFileItems(files: File[]): FileUploadItem[] {
  const [previews, setPreviews] = React.useState<Map<File, string>>(() => new Map())
  // Mirrors `previews` synchronously, so the unmount effect below can revoke
  // whatever is CURRENTLY held without taking a dependency on `previews`
  // itself (which would re-arm the unmount effect on every change, defeating
  // "mount-only").
  const previewsRef = React.useRef(previews)

  // THE DEPENDENCY IS THE SET OF FILES, NEVER THE ARRAY'S OWN IDENTITY. A
  // caller's `files` is very often rebuilt on every render (a `.filter().map()`
  // over cached data, exactly what the story/review dialogs and the recipe
  // engine's own "image" field all do) — depending on `[files]` directly would
  // re-run this effect on every unrelated render forever, since a freshly built
  // array never `===`s the one before it. `pickedFileId` is already stable per
  // File (the same WeakMap the returned items key off), so joining them is a
  // dependency that only changes when the actual SET of files does.
  const filesKey = files.map((f) => pickedFileId(f)).join(",")
  // The latest `files`, read INSIDE the effect through a ref rather than the
  // outer variable directly — refs aren't a "reactive value" exhaustive-deps
  // asks for, which is what lets the effect depend on `filesKey` alone
  // without the lint rule (rightly) demanding `files` too.
  const filesRef = React.useRef(files)
  filesRef.current = files

  React.useEffect(() => {
    setPreviews((prev) => {
      const next = new Map<File, string>()
      for (const file of filesRef.current) {
        if (!file.type.startsWith("image/")) continue
        next.set(file, prev.get(file) ?? URL.createObjectURL(file))
      }
      for (const [file, url] of prev) {
        if (!next.has(file)) URL.revokeObjectURL(url)
      }
      previewsRef.current = next
      return next
    })
  }, [filesKey])

  React.useEffect(() => {
    return () => {
      for (const url of previewsRef.current.values()) URL.revokeObjectURL(url)
    }
  }, [])

  return files.map((file) => ({
    id: pickedFileId(file),
    name: file.name,
    size: file.size,
    type: file.type,
    preview: previews.get(file),
  }))
}

/* ── ALREADY-STORED FILES ────────────────────────────────────────────────── */

/**
 * An already-stored file — R40's own shape, a served `href` and, where the
 * record carries one, its declared MIME — → a tile. `href` goes through
 * `safeSrc` first (the render-side half of R20, the same check
 * `AttachmentPreview` and every logo preview in this app already run), except
 * a `data:` URL, which is this app's own client-side resize pipeline talking
 * to itself and never a value that came back over the wire — see the file
 * header. Anything `safeSrc` refuses, and anything whose MIME
 * `isRenderableImage` refuses (a link, an SVG, a type nobody declared), gets
 * no `preview` at all: the tile grid's own icon-and-tag fallback, never a
 * broken-image glyph.
 */
export function storedFileToUploadItem(input: {
  id: string
  name: string
  href: string
  mime?: string | null
  size?: number | null
}): FileUploadItem {
  const isDataUrl = input.href.startsWith("data:")
  const safe = isDataUrl ? input.href : safeSrc(input.href)
  const mime = input.mime ?? (isDataUrl ? dataUrlMime(input.href) : null)
  const preview = safe && isRenderableImage(mime) ? safe : undefined
  return {
    id: input.id,
    name: input.name,
    size: input.size ?? undefined,
    type: mime ?? undefined,
    preview,
  }
}

/** The declared MIME off a `data:` URL's own prefix — `data:image/jpeg;base64,…`
 *  → `"image/jpeg"` — for the one caller shape (`storedFileToUploadItem`) that
 *  is handed a data URL with no MIME alongside it. */
function dataUrlMime(dataUrl: string): string | null {
  const match = /^data:([^;,]+)/.exec(dataUrl)
  return match ? match[1] : null
}
