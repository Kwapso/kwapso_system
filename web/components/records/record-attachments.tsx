"use client"

// WHAT SOMEBODY ATTACHED TO A RECORD, ON THE RECORD'S OWN SCREEN — the files and
// links put up to say "here is the thing I mean".
//
// ONE PANEL, TWO RECORDS. A ticket's and a story's were two files that agreed
// character for character on 74 of their 8-line windows: the same list, the same
// hidden file input, the same size check, the same read-into-a-data-URL, the
// same preview well, the same add-a-link row. Only three things ever differed,
// and every one of them is now a prop:
//
//   · WHICH DOOR — `load`, `add`, `remove` and `fix` are handed in, so this file
//     names no endpoint and no cache key. The module owns its own client.
//   · WHAT IT SAYS — `emptyTitle` and `removeTitle` are the two sentences that
//     name the record ("Take {label} off this ticket?"). Every other word here
//     is the same word on both screens and is written once.
//   · WHETHER A MISTAKE CAN BE FIXED — `fix` is OPTIONAL, and its absence is the
//     whole reason the two files were kept apart for as long as they were.
//
// THE `fix` PROP IS A PERMISSION DECISION, NOT A FEATURE FLAG. Owner's ruling,
// 27 Aug 2026, asked as "may a client login rename or replace a file agency
// staff attached?" and answered in one word: "never." A ticket's panel writes on
// `help:read`, which a CLIENT LOGIN HOLDS; a story's writes on `work:edit`,
// which no client can reach. So the ticket panel passes no `fix` and the pencil
// is never drawn — and drawing it would have been the obvious next commit while
// the two files were twins, which is exactly why folding them puts the
// difference in one visible place instead of two headers nobody reads together.
//
// AND IF IT IS EVER WIDENED: the fence goes on the DOOR, not here. R21 was
// earned twice by exactly this — the agency gateway forwards `/api/content/*` by
// PREFIX and a client login is an ordinary team member, so a door the portal's
// allow-list withheld was being served to the same person at the other hostname.
// A `canEdit` that renders no button is not a fence; a fence is
// `refusePortalCaller` inside the handler.
//
// A FILE IS A CAPABILITY URL (`/media/<key>`, served by both gateways) — the key
// carries a ULID, and the fence on the door is what decides who is ever TOLD the
// key. Rendered as a plain link: nothing here signs, proxies or re-uploads.
//
// ONE LIST FOR BOTH KINDS, because it is one act. A screenshot and a Loom link
// are the same sentence in a conversation, and splitting them would have made a
// person look in two places for "the thing they sent me".
//
// AND IT SHOWS WHAT IT HOLDS. A row whose file is a picture draws that picture
// under its name (`AttachmentPreview`, the kit's own media well). The owner's
// words: "we do our best to preview them rather than me clicking on everything."
//
// UI-RULEBOOK K5: one card around the whole collection, hairline between rows,
// never a box per row.

import * as React from "react"

import { Button } from "@shared/ui/components/button/button"
import { Input } from "@shared/ui/components/input/input"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { toast } from "@shared/ui/components/sonner/sonner"
import { Check, LinkSimple, PencilSimple, Plus, Trash, UploadSimple, X } from "@shared/ui/foundations/icons"
import { fileTypeIcon } from "@shared/web/screen-engine/file-type-icon"

import { ApiFailure } from "@/lib/api"
import { AttachmentPreview, hasPreview } from "@shared/web/attachment-preview"
import { readFileAsDataUrl } from "@shared/web/file"
import { safeHref } from "@shared/web/rich-text"

import { isFollowable, MAX_SIZE_LABEL, spellSize } from "@/lib/attachments"
import { formatRelative } from "@shared/web/format"
import { primeCache, useCached } from "@shared/web/store"
import { TICKET_FILE_MAX_BYTES } from "@shared/workers/limits"
import { useLanguage } from "@shared/web/language"
import { CollectionEmptyState } from "@shared/web/screen-engine/collection-frame"
import { useConfirm } from "@shared/web/use-confirm"

/** ONE ROW OF THIS LIST — the shape `HelpAttachment` and `StoryAttachment` both
 * already have, minus the parent id, which is the only field they disagree on
 * and the only one this panel never reads. */
export type AttachmentRow = {
  id: string
  kind: "file" | "link"
  /** what a person reads in the list — the file's name, or the link's label */
  label: string
  /** the file's key in the media bucket, or the link's address */
  url: string
  contentType: string | null
  sizeBytes: number | null
  createdAt: string
  addedByName: string | null
}

/** What every door here answers with: the list as it now stands, and the exact
 * COUNT(*) the tab badge shows (R16 — never this array's length). */
type Listing<R extends AttachmentRow> = { attachments: R[]; total: number }

export function RecordAttachments<R extends AttachmentRow>({
  cacheKey,
  load,
  canEdit,
  add,
  remove,
  fix,
  emptyTitle,
  removeTitle,
}: {
  /** The module's own live-resource key. The registry patches this row-for-row,
   * so the key belongs to the module and never to this file (R15). */
  cacheKey: string
  load: () => Promise<Listing<R>>
  /** The right that gates this module's write doors. READ THE HEADER BEFORE
   * WIDENING IT on a ticket: it is a sentence about adding and removing your
   * OWN, never about fixing somebody else's. */
  canEdit: boolean
  add: (a: {
    kind: "file" | "link"
    label: string
    url?: string
    fileDataUrl?: string
  }) => Promise<Listing<R>>
  remove: (attachmentId: string) => Promise<Listing<R>>
  /** Rename, or swap a file's bytes — one call for both, because which of them
   * the door does is decided by what the body carries. OMIT IT and no pencil is
   * drawn: on a ticket that is the owner's "never", not an oversight. */
  fix?: (a: {
    attachmentId: string
    label: string
    url?: string
    fileDataUrl?: string
  }) => Promise<Listing<R>>
  /** "Nothing attached to this ticket yet." — named at the call site, where the
   * record has a name and `t` is in scope. */
  emptyTitle: string
  removeTitle: (label: string) => string
}) {
  const { t, lang } = useLanguage()
  const listQ = useCached<R[]>(cacheKey, () =>
    load().then((r) => {
      // R16: the tab badge shows the door's exact COUNT(*), never this list's length.
      primeCache(`total:${cacheKey}`, r.total)
      return r.attachments
    })
  )
  const fileRef = React.useRef<HTMLInputElement>(null)
  const [addingLink, setAddingLink] = React.useState(false)
  const [link, setLink] = React.useState({ label: "", url: "" })
  const [busy, setBusy] = React.useState(false)
  /** The row being fixed, and the values in its boxes. `null` is the list at
   * rest — one row is open at a time, because two half-finished renames on one
   * screen is a state nobody can read. */
  const [editing, setEditing] = React.useState<{ id: string; label: string; url: string } | null>(null)
  /** WHICH ROW THE FILE PICKER IS ANSWERING FOR. One hidden `<input type=file>`
   * serves both "add a file" and "replace this one" — a second picker per row
   * would be one DOM node per attachment for a control that can only be used
   * once at a time. Set before `.click()`, read in the change handler, cleared
   * on the way out of both paths including the cancel. */
  const replacingRef = React.useRef<string | null>(null)
  // Taking a file off is the one destructive act in this list — one confirm
  // dialog (shared/web/use-confirm.tsx); add, rename and replace stay
  // confirm-free since nothing about them takes anything away.
  const { ask: askRemove, dialog: removeDialog } = useConfirm()

  /** Returns whether it worked, so a confirm dialog can stay open beside the
   * message rather than closing as if it had happened. */
  async function run(what: () => Promise<Listing<R>>, done: string): Promise<boolean> {
    setBusy(true)
    try {
      const r = await what()
      primeCache(cacheKey, r.attachments)
      primeCache(`total:${cacheKey}`, r.total)
      toast.success(done)
      return true
    } catch (err) {
      toast.error(err instanceof ApiFailure ? err.message : t("Couldn't do that."))
      return false
    } finally {
      setBusy(false)
    }
  }

  /** A PICKED FILE, CHECKED AND READ — or null, having already said why.
   *
   * Adding and replacing ask exactly the same three questions of the same file,
   * and the day they stop agreeing is the day one of them gets a different size
   * limit or loses the failure toast. */
  async function readPicked(file: File): Promise<string | null> {
    // Checked here as well as at the door: a 30MB upload that fails after the
    // whole file has been read and base64'd is a minute of somebody's morning.
    if (file.size > TICKET_FILE_MAX_BYTES) {
      toast.error(t("That file is too big. The limit is {limit}.", { limit: MAX_SIZE_LABEL }))
      return null
    }
    // THE READ IS INSIDE ITS OWN TRY, not folded into `run`'s. A file the browser
    // cannot read — a permission-denied on a synced folder, a file removed
    // between the pick and the read, a HEIC on a browser that will not decode
    // one — would otherwise reject into nothing at all: no toast, no spinner, no
    // inline error, which is the one failure worse than an error message.
    try {
      return await readFileAsDataUrl(file)
    } catch {
      // The sentence the knowledge base's own file picker already says for the
      // same failure, rather than a seventh way of putting it (R28: a new
      // sentence is a new row in the catalogue and a new thing to translate;
      // this one is already there, in every language).
      toast.error(t("Couldn't add that file."))
      return null
    }
  }

  async function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // Reset first: picking the SAME file twice must fire the change event twice,
    // and a browser only does that if the value was cleared in between. Which is
    // exactly what somebody does after a failed upload.
    e.target.value = ""
    // …and read the target row BEFORE any await, then clear it, so an abandoned
    // replace cannot capture the next plain "Add a file".
    const replacing = replacingRef.current
    replacingRef.current = null
    if (!file) return
    const dataUrl = await readPicked(file)
    if (!dataUrl) return
    if (replacing && fix) {
      // The name comes with the new file, because that is what a person means by
      // swapping one document for another: the row should stop saying the wrong
      // filename the moment it stops holding the wrong file.
      await run(() => fix({ attachmentId: replacing, label: file.name, fileDataUrl: dataUrl }), "Replaced.")
      setEditing(null)
      return
    }
    await run(() => add({ kind: "file", label: file.name, fileDataUrl: dataUrl }), "Attached.")
  }

  /** Save the boxes. A link sends its address too; a file has none to send —
   * its bytes are swapped by the picker above, never typed. */
  async function saveEdit(a: R) {
    if (!fix || !editing || !editing.label.trim()) return
    await run(
      () =>
        fix({
          attachmentId: a.id,
          label: editing.label.trim(),
          ...(a.kind === "link" ? { url: editing.url.trim() } : {}),
        }),
      "Saved."
    )
    setEditing(null)
  }

  async function addLink() {
    if (!link.label.trim() || !link.url.trim()) return
    await run(() => add({ kind: "link", label: link.label.trim(), url: link.url.trim() }), "Attached.")
    setLink({ label: "", url: "" })
    setAddingLink(false)
  }

  if (listQ.data === undefined) return <Skeleton variant="list" lines={2} />

  return (
    <div className="flex flex-col gap-4">
      {listQ.data.length === 0 ? (
        // The kit's register (27.21), not a bare line — owner ruling,
        // 2026-09-07. No act on it: "Add a file" / "Add a link" sit right
        // under this list, for whoever may edit.
        <CollectionEmptyState title={emptyTitle} />
      ) : (
        <ul className="divide-border divide-y">
          {listQ.data.map((a) => {
            const FileGlyph = a.kind === "file" ? fileTypeIcon(a.label) : LinkSimple
            return (
              <li key={a.id} className="flex flex-wrap items-center gap-2 py-3">
                <FileGlyph className="text-muted-foreground size-4 shrink-0" />
                {editing?.id === a.id ? (
                  <>
                    <Input
                      value={editing.label}
                      onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                      placeholder={t("What it is")}
                      // ITS OWN LINE ON A PHONE. The row is `flex-wrap`, so a
                      // full-width basis makes the name box take a line and the
                      // three buttons wrap under it; sharing the line the way the
                      // desktop does left it 60px wide and showing "Sc".
                      className="w-full min-w-0 sm:w-auto sm:flex-1"
                      disabled={busy}
                      aria-label={t("Name")}
                    />
                    {a.kind === "link" && (
                      <Input
                        value={editing.url}
                        onChange={(e) => setEditing({ ...editing, url: e.target.value })}
                        placeholder="https://…"
                        className="w-full sm:w-64"
                        disabled={busy}
                        aria-label={t("Link")}
                      />
                    )}
                    {a.kind === "file" && (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={busy}
                        onClick={() => {
                          replacingRef.current = a.id
                          fileRef.current?.click()
                        }}
                        className="shrink-0 gap-1"
                      >
                        <UploadSimple className="size-3.5" />
                        {t("Replace the file")}
                      </Button>
                    )}
                    <Button size="sm" disabled={busy} onClick={() => void saveEdit(a)} className="shrink-0 gap-1">
                      <Check className="size-3.5" />
                      {t("Save")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => {
                        replacingRef.current = null
                        setEditing(null)
                      }}
                      className="shrink-0 gap-1"
                      aria-label={t("Cancel")}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </>
                ) : (
                  <>
                    {isFollowable(a.url) ? (
                      <a
                        href={safeHref(a.url)}
                        target="_blank"
                        rel="noreferrer"
                        className="min-w-0 flex-1 truncate text-sm underline-offset-2 hover:underline"
                      >
                        {a.label}
                      </a>
                    ) : (
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {a.label} <span className="text-muted-foreground">({a.url})</span>
                      </span>
                    )}
                    {/* THE METADATA WRAPS, NOT THE NAME. On a phone this span
                      * would not shrink and the name column has `min-w-0`, so the
                      * filename was squeezed down to its first letter — the row
                      * read "S · 2.7 MB · Alaap K · 3h ago", which is the same
                      * class of bug as the one this panel is about: the file was
                      * on the screen and the person could not tell which it was.
                      * Below `sm` the size, the person and the date take a line of
                      * their own and the name gets the width it needs. */}
                    <span className="text-muted-foreground w-full text-xs tabular-nums sm:w-auto">
                      {[spellSize(a.sizeBytes), a.addedByName, formatRelative(a.createdAt, t, lang)]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    {canEdit && (
                      <>
                        {fix && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={busy}
                            onClick={() =>
                              setEditing({ id: a.id, label: a.label, url: a.kind === "link" ? a.url : "" })
                            }
                            className="shrink-0 gap-1"
                            aria-label={t("Rename")}
                          >
                            <PencilSimple className="size-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() =>
                            askRemove({
                              title: removeTitle(a.label),
                              body: t("There's no way to bring it back from here — attach it again if you need it."),
                              action: t("Take it off"),
                              run: () => run(() => remove(a.id), t("Taken off.")),
                            })
                          }
                          className="text-destructive hover:text-destructive shrink-0 gap-1"
                          aria-label={t("Take it off")}
                        >
                          <Trash className="size-3.5" />
                        </Button>
                      </>
                    )}
                    {/* A SCREENSHOT LOOKS LIKE A SCREENSHOT. Half of what lands on
                      * a record is a picture of the thing somebody is describing,
                      * and a paperclip beside `Screenshot 2026-08-27 at
                      * 14.02.11.png` is the one shape a person cannot scan.
                      *
                      * A FULL-WIDTH ITEM AT THE END OF A WRAPPING ROW, which is
                      * how it takes its own line under the name without the row
                      * becoming a second layout. A row with no picture renders
                      * nothing at all here — not an empty well, which is what the
                      * kit's media box would hold if it were always drawn. */}
                    {hasPreview(a.kind, a.contentType) && (
                      <div className="w-full pl-6">
                        <AttachmentPreview kind={a.kind} url={a.url} contentType={a.contentType} />
                      </div>
                    )}
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {canEdit && (
        <div className="flex flex-wrap items-end gap-2">
          <input ref={fileRef} type="file" hidden onChange={(e) => void pickFile(e)} />
          <Button
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="gap-1"
          >
            <UploadSimple className="size-3.5" />
            {t("Add a file")}
          </Button>
          {addingLink ? (
            <>
              <Input
                value={link.label}
                onChange={(e) => setLink((l) => ({ ...l, label: e.target.value }))}
                placeholder={t("What it is")}
                className="w-40"
                disabled={busy}
              />
              <Input
                value={link.url}
                onChange={(e) => setLink((l) => ({ ...l, url: e.target.value }))}
                placeholder="https://…"
                className="w-64"
                disabled={busy}
              />
              <Button size="sm" disabled={busy} onClick={() => void addLink()} className="gap-1">
                <Plus className="size-3.5" />
                {t("Submit")}
              </Button>
            </>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => setAddingLink(true)}
              className="gap-1"
            >
              <LinkSimple className="size-3.5" />
              {t("Add a link")}
            </Button>
          )}
        </div>
      )}

      {removeDialog}
    </div>
  )
}
