"use client"

// THE TICKET'S REPLY COMPOSER — one send, and five seconds before it happens.
//
// THE CLIENT, 6 September 2026, verbatim: "yes, do the double button the only
// icon for send and the send and close / however, in the modal notification that
// shows temporarily on the bottom of the page - show the button undo / actually
// wait 5 seconds to actually send it and marked as closed - enough time to click
// undo (if mistake)."
//
// B0294/T3657, 16 September 2026, IS WHY THIS IS ONE SEND AND NOT TWO ANY
// MORE: "Send and close button too easy to hit by accident … the close button
// needs to move to the top." It sat right beside the plain Send this composer
// still draws, one keystroke away from a stray click closing a ticket she
// meant to keep answering. The close action did not go — it MOVED, to the
// title's own "Answer and close" (`help-detail.tsx`, offered now at every
// status this composer used to gate its own close button on), through the
// same `ResolveDialog` seam that button already opened. This composer went
// back to being what its row can hold without a second target beside Send:
// typing, and Send.
//
// WHY THIS IS THE APP'S COMPOSER AND NOT THE KIT'S. `TicketThread` draws the
// thread AND a composer, and its composer has exactly one send control — one
// `<button type="submit">` with one `sendLabel`. There is no icon-only mode,
// and no `aria-label`/tooltip pair of the shape this screen needs. The kit is
// a dependency (a hand-edit under `shared/ui/` turns the build red), so this
// one is drawn app-side instead: the kit's composer turned OFF
// (`composer={false}` on `TicketThread`) and this one drawn directly beneath
// it, out of the kit's own Button and the kit's own glyph, in the kit's own
// pill. Everything else on this screen is still the kit's — the bubbles, the
// avatars, the sides, the receipts.
//
// WHY THE SEND CARRIES NO WORDS. The plain send is the ORDINARY act, so it is
// the filled one and carries no words at all — the paper plane and nothing
// else, which is what was asked for. Because it has no visible label it needs
// an accessible name written by hand, and it has one: `aria-label="Send
// reply"` on the button, `aria-hidden` on the glyph so the SVG contributes
// nothing to that name, and a tooltip saying THE SAME TWO WORDS — so somebody
// driving the screen by voice can say what they can see and be understood
// (label-in-name).
//
// WHY THIS FILE IS A HOOK AND A COMPONENT RATHER THAN ONE COMPONENT. The hold
// has to OUTLIVE the Conversation tab. The artifact is explicit that during the
// five seconds "she can keep reading the ticket, scroll, open the stories" — and
// the tab strip is Radix's, which UNMOUNTS the panel it is not showing. A hold
// living inside the composer would therefore be flushed by a glance at Related
// stories, three seconds early, with the pending bubble vanishing as she looked.
// So `useReplySend` is called by the ticket screen itself, above the tabs, and
// `ReplyComposer` is the drawing it hands its state to. Leaving the TICKET still
// flushes, which is the rule; leaving the TAB does not, because she has not left.
//
// WHY THE PENDING BUBBLE IS DRAWN HERE RATHER THAN IN THE THREAD. During the
// five seconds the message does not exist anywhere but this browser: no row, no
// ping, nothing a colleague with the same ticket open could see and nothing in
// the client's portal. Putting it in the thread's `messages` would say the
// opposite — those are rows the server answered with. It sits between the
// transcript and the composer instead, on the sender's own side, in the quiet
// fill rather than the solid one, with a counting receipt where a timestamp
// would be. That IS its meaning: not sent, not lost, and about to go.

import * as React from "react"

import { Button } from "@shared/ui/components/button/button"
import { FileUpload, type FileUploadItem } from "@shared/ui/components/file-upload/file-upload"
import { toast } from "@shared/ui/components/sonner/sonner"
import { Tooltip, TooltipContent, TooltipTrigger } from "@shared/ui/components/tooltip/tooltip"
import { PaperPlaneTilt, Paperclip } from "@shared/ui/foundations/icons"
import { useLanguage } from "@shared/web/language"
import { useFormDraft } from "@shared/web/use-form-draft"
import { pickedFileId, storedFileToUploadItem, usePickedFileItems } from "@shared/web/upload-items"

import type { HelpMessageAttachment } from "@shared/types"
import { createSendHold, type SendHold, type SendHoldView } from "@/lib/send-hold"

/** ONE PICKED FILE, ANYWHERE ON THE TICK-TOCK FROM "JUST CHOSEN" TO "SENT" —
 * team migration 0105, the client's ruling of 18 Sep 2026 restated at the top
 * of this file's own header. `key` is the tile's stable identity for the whole
 * of that arc: `pickedFileId(file)` the moment it is picked, so React and
 * `onRemove` never lose track of a tile across a re-render, and it stays the
 * SAME string once the row lands on the server — `done`'s `attachment.id` is a
 * different id space (the `help_attachments` row), and conflating the two
 * would mean a tile's identity changes under it mid-upload.
 *
 * UPLOADED IMMEDIATELY ON PICK, never deferred to Send (R41's "the record
 * already exists" branch — this ticket has, so there is nowhere a picked file
 * has to wait). `done` is the ONLY state Send may act on; `uploading`/`error`
 * slots are shown, never silently sent and never silently dropped. */
export type AttachSlot =
  | { key: string; status: "uploading" | "error"; file: File; message?: string }
  | { key: string; status: "done"; attachment: HelpMessageAttachment }

/** WHAT IS HELD FOR FIVE SECONDS. Text, a caret, and — since team migration
 * 0105 — the files that were staged (uploaded, not yet sent) the moment Send
 * was pressed. Already-uploaded rows (`HelpMessageAttachment`, not `File`s):
 * the bytes are in the bucket the instant a tile turns `done`, well before the
 * hold starts, so what the hold needs to remember is which ROWS to claim, not
 * bytes to resend. */
type HeldReply = {
  text: string
  /** Where the cursor was when she pressed send, so Undo puts it back exactly
   * there rather than at the end of a sentence she was editing the middle of. */
  caret: number
  /** The files Send swept off the tile grid. Undo and a failed send both put
   * them straight back — see `useReplySend`'s own `restoreAttachments`. */
  attachments: HelpMessageAttachment[]
}

/** WHAT THE HOOK HANDS THE DRAWING. Everything the composer needs and nothing
 * about how it looks, so the state can live one level up (above the tab strip)
 * while the controls live where a person expects to find them. */
export type ReplySend = {
  /** What is in the field right now. */
  text: string
  setText: (next: string) => void
  /** What is being held, or null. The pending bubble is drawn from this. */
  held: HeldReply | null
  secondsLeft: number
  /** Press send. */
  start: () => void
  /** The field itself, so the caret can be read on press and restored on Undo. */
  field: React.RefObject<HTMLInputElement | null>
  /** THE TILE GRID'S OWN STATE — team migration 0105, one slot per picked
   * file, from the instant it is picked through upload and until Send (or
   * Undo, or a refusal) clears it. RAW, not pre-built into `FileUploadItem`s:
   * `file-upload-items-feed-tiles.test.ts`'s own census reads a `<FileUpload`
   * mount's ENCLOSING COMPONENT for `usePickedFileItems`/
   * `storedFileToUploadItem`, so the actual tile-building has to happen in
   * `ReplyComposer` itself — the same shape every other `<FileUpload>` call
   * site in this app already uses — rather than being handed down pre-built
   * from a hook the census cannot see into. */
  attachSlots: AttachSlot[]
  /** A file is still going up. Send is disabled while this is true. */
  attachBusy: boolean
  /** Hand it whatever was picked or dropped. */
  addFiles: (files: File[]) => void
  /** Take one tile off, by its stable key (`AttachSlot.key`, never the door's
   * own attachment id — see that type's own header). */
  removeAttachment: (key: string) => void
}

export function useReplySend({
  /** The ticket. The draft is kept per ticket, so two tickets open in two tabs
   * never share half a sentence. */
  ticketId,
  /** DO IT. Returns the sentence the settling toast should say — so the words
   * for "sent" are decided by the caller that knows what the door actually
   * answered, not guessed at here. `leaving` is true only on the tab-closing
   * path, where it must reach `fetch` as `keepalive`. `attachmentIds` are the
   * rows staged by `uploadFile` below, ready to be claimed by this reply. */
  onSend,
  /** UPLOAD ONE PICKED FILE, IMMEDIATELY — the moment `addFiles` (below) is
   * handed it, never deferred to Send (R41: the ticket already exists, so
   * there is nowhere for the bytes to wait). The caller does the actual door
   * call (`content.addHelpAttachment` on the agency, the portal's own
   * equivalent) and hands back the row's own shape; a rejection is a plain
   * `Error` whose `.message` is what the tile's error state shows. */
  uploadFile,
  /** TAKE A STAGED FILE BACK OFF, when its tile's remove control is pressed
   * before Send. Best-effort — the tile leaves the grid either way, because a
   * person pressing remove has already decided, and a failed cleanup call
   * leaves an orphaned ticket-level row rather than a stuck control. */
  removeUploadedFile,
}: {
  ticketId: string
  onSend: (text: string, leaving: boolean, attachmentIds: string[]) => Promise<string>
  uploadFile: (file: File) => Promise<HelpMessageAttachment>
  removeUploadedFile: (attachmentId: string) => Promise<void>
}): ReplySend {
  const { t } = useLanguage()
  const field = React.useRef<HTMLInputElement | null>(null)

  // THE TILE GRID'S OWN STATE — see `AttachSlot`'s header above. Kept OUTSIDE
  // the draft (`useFormDraft`) on purpose: a `File` cannot survive
  // `JSON.stringify` into localStorage, and a row that already finished
  // uploading is recoverable from the server (the ticket-level door still
  // lists it) even if this tab is killed mid-wait — the one failure mode the
  // TEXT draft exists to cover has no equivalent hole here.
  const [slots, setSlots] = React.useState<AttachSlot[]>([])
  // SEQUENTIAL, NEVER PARALLEL. Two uploads racing on the SAME ticket would
  // answer with two "whole list" responses whose ORDER on the wire is not
  // guaranteed to match the order they were fired in, and the only way this
  // hook finds out WHICH row a call just created is "the newest one on the
  // list I got back" (see the host's own `uploadFile`, e.g. help-detail.tsx).
  // A promise chain — not `Promise.all` — is what keeps that reading honest:
  // the second file's upload does not even START until the first one's
  // response has been read.
  const uploadChain = React.useRef<Promise<void>>(Promise.resolve())

  /** THE SAME RESTORE, FOR TWO DIFFERENT REASONS. Undo and a refused send both
   * mean "nothing happened, put it all back" — the words AND the files, which
   * is the whole of R41's promise here: a picked file that made it as far as
   * `done` is never lost to a mistake a person can still take back. */
  const restoreAttachments = React.useCallback(
    (attachments: HelpMessageAttachment[]) =>
      setSlots(attachments.map((attachment): AttachSlot => ({ key: attachment.id, status: "done", attachment }))),
    []
  )

  // THE DRAFT, KEPT PER TICKET (CACHING.md §11, the same seam every form dialog
  // uses). This is the answer to the one failure mode the five seconds cannot
  // cover: the browser being KILLED mid-wait. Nothing was posted, so the ticket
  // is untouched and nobody was emailed — which is the correct outcome — and her
  // words are still here when she comes back, because they were written to the
  // draft as she typed rather than only living in component state.
  const [draft, setDraft, clearDraft] = useFormDraft(`help:reply:${ticketId}`, { text: "" }, true)
  const text = draft.text

  // The toast is REPLACED rather than stacked: one id for the countdown, the
  // settle and the cancellation, so a person never has two of these on screen
  // arguing about what happened.
  const toastId = React.useId()

  const [view, setView] = React.useState<SendHoldView<HeldReply>>({
    payload: null,
    secondsLeft: 0,
  })

  /* THE CALLBACKS THE HOLD CALLS, ALWAYS THE CURRENT ONES. The hold is created
     ONCE (it owns a timer; recreating it would drop the wait on every keystroke)
     but it must call this render's `onSend` and speak this render's language. A
     ref read at call time is how a long-lived object reaches short-lived
     closures.

     THE SENTENCES ARE TRANSLATED HERE AND CARRIED, rather than translated inside
     the callback. R28's extractor only sees a BARE `t("…")` — `latest.current.t
     ("…")` is a property access and is invisible to it, so a string written that
     way would be in no catalogue, would be translated nowhere, and would ship in
     English to somebody who chose German with a green build. Wrapping it at the
     render position keeps the law able to see it and costs one line. */
  const words = { refused: t("Couldn't post your reply."), attachFailed: t("Couldn't attach that.") }
  const latest = React.useRef({ onSend, uploadFile, removeUploadedFile, setDraft, clearDraft, restoreAttachments, words })
  latest.current = { onSend, uploadFile, removeUploadedFile, setDraft, clearDraft, restoreAttachments, words }

  const holdRef = React.useRef<SendHold<HeldReply> | null>(null)
  if (holdRef.current === null) {
    holdRef.current = createSendHold<HeldReply>({
      send: async (held, { keepalive }) => {
        const said = await latest.current.onSend(
          held.text,
          keepalive,
          held.attachments.map((a) => a.id)
        )
        // Nothing is drawn on a page that is being torn down. The request is
        // already in flight and will outlive this document; a toast would not.
        if (keepalive) return
        // A couple of seconds, and no Undo on it — because from here there is
        // none: the row is written. The five seconds exist precisely so that
        // undo never has to mean pulling a message back off the thread.
        toast.success(said, { id: toastId, duration: 2600 })
      },
      onFailed: (held) => {
        // THE WORDS COME BACK, AND SO DO THE FILES. A refusal must never cost
        // somebody the sentence they wrote OR the files they picked — the
        // composer emptied on press, so this is the only route back to either.
        latest.current.setDraft({ text: held.text })
        latest.current.restoreAttachments(held.attachments)
        toast.error(latest.current.words.refused, { id: toastId })
      },
      onChange: setView,
    })
  }
  const hold = holdRef.current

  const held = view.payload

  /** STOP IT. Nothing was sent, so nothing has to be unwound: the bubble goes,
   * and her words, her caret and her files come back to the composer. This is
   * non-negotiable — the composer empties on press, so Undo is the only route
   * back to what she wrote AND to what she picked. */
  const undo = React.useCallback(() => {
    const stopped = hold.undo()
    if (!stopped) return
    latest.current.setDraft({ text: stopped.text })
    latest.current.restoreAttachments(stopped.attachments)
    toast.success(t("Nothing was sent. Your words are back in the composer."), {
      id: toastId,
      duration: 4000,
    })
    // Focus and the caret, restored after the value has been painted.
    window.requestAnimationFrame(() => {
      const input = field.current
      if (!input) return
      input.focus()
      const at = Math.min(stopped.caret, stopped.text.length)
      input.setSelectionRange(at, at)
    })
  }, [hold, t, toastId])

  /* WHAT THE TOAST SAYS AND WHAT IT DOES, redrawn on every tick with the SAME id
     so sonner updates the pill in place instead of stacking five of them.
     `duration: Infinity` because this hold's clock is the one in send-hold.ts and
     nothing else: sonner pauses its own timer while a pointer rests on the stack,
     and a five-second promise that quietly becomes eleven because somebody left
     the mouse there is not the promise that was made. */
  const seconds = view.secondsLeft
  React.useEffect(() => {
    if (!held) return
    toast(
      <span role="status" className="flex min-w-0 items-baseline gap-2">
        <span className="min-w-0">{t("Sending your reply")}</span>
        {/* THE NUMBER IS HIDDEN FROM THE ANNOUNCEMENT, ON PURPOSE. sonner's stack
            is a polite live region with `aria-relevant="additions text"`, so a
            number that changes inside it is read out every single second — a
            countdown nobody asked for, over the top of whatever else is being
            read. The sentence is announced once, when the toast appears, which
            is what it is for; the number is for eyes. */}
        <span aria-hidden="true" className="shrink-0 tabular-nums font-[var(--font-weight-medium)]">
          {seconds}
        </span>
      </span>,
      {
        id: toastId,
        duration: Number.POSITIVE_INFINITY,
        action: { label: t("Undo"), onClick: undo },
      }
    )
  }, [held, seconds, t, toastId, undo])

  /* ESCAPE IS UNDO while the toast is up. The toast does not take focus and does
     not block the screen — she can keep reading the ticket while it counts — so
     the one key that means "no, stop" has to work from wherever she is standing.
     Bound only while something is held, so Escape means what it always means the
     rest of the time. */
  React.useEffect(() => {
    if (!held) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      event.preventDefault()
      undo()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [held, undo])

  /* THE TWO WAYS OF LEAVING, and they are the same rule: leaving is not a
     mistake, so the wait is CUT SHORT rather than cancelled.
     · Somewhere else in the app — this component unmounts, and the flush below
       runs on the way out. The door is called there and then, in the order she
       typed, and the toast reports the result on the screen she has arrived at.
     · The tab or the window — `pagehide`, with `keepalive` so the request
       survives the document being destroyed. `pagehide` and not `unload`,
       because `unload` is not fired at all on mobile Safari and blocks the
       back-forward cache everywhere else.
     Registered once, for the life of the TICKET SCREEN — which is where this
     hook is called, above the tab strip, so opening Related stories is not
     mistaken for walking away. */
  React.useEffect(() => {
    const leave = () => hold.flush({ keepalive: true })
    window.addEventListener("pagehide", leave)
    return () => {
      window.removeEventListener("pagehide", leave)
      hold.flush()
      hold.dispose()
    }
  }, [hold])

  /** PICK, UPLOAD, TILE — one call per file, chained so responses land in the
   * order they were sent (see `uploadChain`'s own comment). Each file gets a
   * tile the INSTANT it is picked (`uploading`), well before the network call
   * resolves — the same "show it immediately, reconcile after" shape the
   * optimistic reply echo (help-detail.tsx's `sendReply`) already uses one
   * level up. */
  const addFiles = React.useCallback((files: File[]) => {
    for (const file of files) {
      const key = pickedFileId(file)
      setSlots((prev) => [...prev, { key, status: "uploading", file }])
      uploadChain.current = uploadChain.current
        .then(() => latest.current.uploadFile(file))
        .then((attachment) => {
          setSlots((prev) => prev.map((s) => (s.key === key ? { key, status: "done", attachment } : s)))
        })
        .catch((err) => {
          const message = err instanceof Error ? err.message : latest.current.words.attachFailed
          setSlots((prev) => prev.map((s) => (s.key === key ? { key, status: "error", file, message } : s)))
          toast.error(message)
        })
    }
  }, [])

  /** TAKE ONE OFF, before Send. A `done` tile's row is already on the ticket —
   * `removeUploadedFile` deactivates it, best-effort (see the prop's own doc) —
   * an `uploading`/`error` tile has no row yet, so removing it is simply
   * forgetting the `File`; the chained upload above still resolves into a
   * `done` slot nobody is holding a reference to any more and that write is
   * harmless (the row would just sit unlinked, exactly like any other
   * ticket-level attachment nobody has claimed). */
  const removeAttachment = React.useCallback((key: string) => {
    setSlots((prev) => {
      const slot = prev.find((s) => s.key === key)
      if (slot?.status === "done") void latest.current.removeUploadedFile(slot.attachment.id).catch(() => {})
      return prev.filter((s) => s.key !== key)
    })
  }, [])

  // Send is held off while a file is still going up: what Send would carry is
  // exactly `slots.filter(done)`, and a person pressing it mid-upload should
  // see the tile finish rather than have a reply go out that silently left
  // their newest file behind.
  const attachBusy = slots.some((s) => s.status === "uploading")

  function start() {
    if (text.trim().length === 0 || attachBusy) return
    hold.start({
      text,
      caret: field.current?.selectionStart ?? text.length,
      // ONLY `done` RIDES THE REPLY. An `error` tile already told the person
      // its file did not make it — pressing Send anyway sends the words
      // without it, which is the refusal R41 asks for, made visible before
      // the press rather than discovered after.
      attachments: slots.filter((s): s is Extract<AttachSlot, { status: "done" }> => s.status === "done").map((s) => s.attachment),
    })
    // The composer empties NOW, not when the send lands — she has finished with
    // these words and the next thing she types is the next message. Undo is what
    // brings them back, and the draft is dropped with them so a reload during
    // the wait does not resurrect a sentence that is already on its way. The
    // tile grid empties with it — the files are riding the held bubble now,
    // same as the text.
    latest.current.setDraft({ text: "" })
    latest.current.clearDraft()
    setSlots([])
  }

  return {
    text,
    setText: (next: string) => setDraft({ text: next }),
    held,
    secondsLeft: view.secondsLeft,
    start,
    field,
    attachSlots: slots,
    attachBusy,
    addFiles,
    removeAttachment,
  }
}

export function ReplyComposer({
  /** The hold, owned by the screen above the tab strip. */
  send,
  /** The ticket is already answered. Only the placeholder changes: a reply on a
   * closed ticket appends and touches no status, which is worth saying. */
  answered,
}: {
  send: ReplySend
  answered: boolean
}) {
  const { t } = useLanguage()
  const { text, setText, held, secondsLeft, start, field, attachSlots, attachBusy, addFiles, removeAttachment } = send
  const ready = text.trim().length > 0
  // A HIDDEN NATIVE PICKER, the same shape `record-attachments.tsx`'s own
  // `fileRef` drives — the Paperclip below is a plain button, and a button
  // cannot open a file dialog on its own. `multiple`: the client's own ask was
  // "images OR files", never "one at a time".
  const fileInput = React.useRef<HTMLInputElement | null>(null)

  // THE TILE GRID ITSELF (kit `FileUpload`, OPTION B — a picked file becomes a
  // tile the moment it lands), built HERE rather than inside `useReplySend` —
  // `file-upload-items-feed-tiles.test.ts`'s own census reads a `<FileUpload`
  // mount's ENCLOSING COMPONENT for `usePickedFileItems`/
  // `storedFileToUploadItem`, the same "one level of indirection, never
  // further" allowance every other call site in this app already stands on.
  // `uploading`/`error` slots draw a LOCAL preview off the `File` they still
  // hold; `done` slots draw the SERVED preview off the row the door already
  // wrote — an object URL would still work for those too, but the served one
  // is what Undo/a failed send restores from (no `File` survives that round
  // trip), so using it here as well keeps a tile's picture identical before
  // and after the hold, rather than swapping the instant Send is pressed.
  const pendingSlots = attachSlots.filter(
    (s): s is Extract<AttachSlot, { status: "uploading" | "error" }> => s.status !== "done"
  )
  const pendingItems = usePickedFileItems(pendingSlots.map((s) => s.file))
  const attachTiles: FileUploadItem[] = attachSlots.map((s) => {
    if (s.status === "done")
      return storedFileToUploadItem({
        id: s.key,
        name: s.attachment.name,
        href: s.attachment.href,
        mime: s.attachment.mime,
        size: s.attachment.size,
      })
    const idx = pendingSlots.findIndex((p) => p.key === s.key)
    return { ...pendingItems[idx], id: s.key, status: s.status, error: s.status === "error" ? s.message : undefined }
  })

  return (
    // `w-full` — R89 RE-PROOF, 18 Sep 2026 evening. This div is the sole
    // child `<CardFooter>` (card.tsx) renders as `composer` — CardFooter is
    // a `flex flex-wrap items-center` ROW, and a row's own child sizes to
    // its OWN content (shrink-to-fit) unless it claims width itself. The
    // `<form>` below already carried `w-full` from the day it shipped, but
    // `w-full` is only ever 100% of ITS OWN containing block — this div —
    // so without this line the form's 100% was 100% of a box that had
    // already shrunk to the form's own min-content width. Measured live on
    // staging before this fix: the form rendered 271px wide inside a
    // 769px-wide footer. `w-full` here is what gives the form's own
    // `w-full` something real to be 100% of.
    <div className="flex w-full min-w-0 flex-col gap-4">
      {held ? (
        /* THE PENDING BUBBLE. Her own side, quiet fill instead of the solid one,
           and a counting receipt where the timestamp goes. Not absent (she would
           press again) and not drawn as sent (she would believe something that
           is not true yet). */
        <div data-slot="pending-reply" className="flex min-w-0 flex-col items-end gap-1 self-end">
          <div className="min-w-0 max-w-[62%] break-words rounded-[var(--radius)] bg-surface-quiet px-4 py-3 text-caption">
            {held.text}
          </div>
          <span className="pe-[var(--space-1h)] text-micro tabular-nums text-ink-tertiary">
            {t("Sending in {seconds}", { seconds: secondsLeft })}
          </span>
        </div>
      ) : null}

      {/* THE TILE GRID (team migration 0105) — kit `FileUpload`'s OPTION B, a
          picked file becomes a tile the moment it lands, drawn ABOVE the pill
          rather than inside it: the pill is a single-line composite control
          (`data-focus-shell`, below) and a wrapping grid of 5.5rem tiles has
          no home inside a pill's own row. Mounted only once there is
          something to show — an empty grid drawn every time the composer
          renders would be the full dashed drop zone sitting under an empty
          message field, which is not what "a message can carry a picture"
          asked for. `readOnly` is never set: the grid's own Add tile shares
          `addFiles` with the Paperclip below (same handler, so a click on
          either does the same thing), and `onRemove` reaches this hold's own
          `removeAttachment`. */}
      {attachTiles.length > 0 && (
        <FileUpload
          files={attachTiles}
          onFilesSelected={addFiles}
          onRemove={removeAttachment}
          removeLabel={t("Remove")}
          addLabel={t("Add")}
          multiple
        />
      )}

      {/* The kit's own composer pill, drawn here because this composer needs an
          `aria-label`/tooltip pair the kit's `sendLabel` cannot express. Same
          shape, same tokens, same radius.

          `data-focus-shell` — THE STANDARD COMPOSITE-CONTROL SEAM (tokens.css
          §8, "review 1A · fix 4"), not a rule invented here, and the one thing
          this composer was missing when it shipped. A composite control is a
          decorated shell wrapped around a BARE focusable node: the pill carries
          the fill and the radius, and the `<input>` inside it carries neither —
          `border-0 bg-transparent p-0`, deliberately, so the pill is what a
          reader perceives as the field. The one global `:focus-visible` rule
          then draws its outline around the node that actually has focus, which
          is the bare input: 1px of `--focus` at zero offset around a
          full-width, 24px-high, ZERO-RADIUS box — a hard rectangle with square
          corners, sitting INSIDE the pill, over the pill's own white fill.
          That is exactly what the client photographed and called "the select",
          asking for it to be round; it is not a border and no CSS here asked
          for one.

          The kit had already met this three times and solved it once, in the
          place a solution belongs: the shell takes the ring
          (`[data-focus-shell]:has([data-focus-proxy]:focus-visible)`) and the
          bare node hands it over. Same `--focus-width`, same zero offset, same
          single ring — the ONLY thing that changes is which box it is drawn
          around, so ruling 24 ("one ring spec for every control at once") is
          obeyed rather than restated. `search-input.tsx`, `filter-bar.tsx`'s
          facet field, `agent-chat.tsx`'s composer and `notes-editor.tsx` are
          the four already marked; this composer is the fifth, and it is the
          same shape as the third almost line for line.

          THE PAIR IS ALWAYS A PAIR. The `outline: none` that lets the shell own
          the ring lives in the kit's CSS, on `[data-focus-proxy]`, and it is
          written on a node the rule above guarantees has a visible ring around
          it. Nothing here suppresses a ring and nothing here defines a second
          one, which is what `focus-ring.test.ts` reads this file for.

          THE PILL'S OWN GROUND — CORRECTED, R89 "footer-on-the-edge",
          18 Sep 2026. The paragraph this replaces was true when it was
          written and stale by the time `ticket-detail-body.tsx` moved
          `TicketConversationPanel`'s own `Card` to `variant="default"`
          (R67, the SAME session, "remove the 'overall' container, make
          each thing its own container") — that change repainted the
          conversation card's ground from `--card`/`--background`
          (#FFFEF9) to `--surface-panel` (#F7F2EB), and this composer's own
          `bg-surface-panel` was never revisited against the new ground it
          was standing on. Live proof on staging (T0001, before this fix,
          `${SCRATCH}/footer-measure.json`): the composer's
          `background-color` and the conversation card's were the SAME
          `rgb(247,242,235)` — no contrast at all, exactly the client's own
          complaint ("on the same beige as the card"), and exactly the class
          of bug R67 exists to catch, just arrived at from the OTHER
          direction — the container's ground moved out from under a control
          that used to answer it correctly.
          `bg-card` now (`rgb(255,254,249)` / #FFFEF9 in light), for two
          reasons together: it is DIFFERENT from the card's own
          `--surface-panel` ground, so the pill reads as its own field
          again; and it is the SAME class `shared/ui/components/input/
          input.tsx`'s own `inputVariants` paints every ordinary text field
          with (`"bg-card text-foreground"`) — this composer matches every
          other input in the app BY CONSTRUCTION, reaching for the one class
          the kit's own field already uses, rather than a new colour picked
          to look right once. */}
      <form
        data-slot="reply-composer"
        data-focus-shell=""
        onSubmit={(event) => {
          event.preventDefault()
          start()
        }}
        className="flex w-full min-w-0 items-center gap-2 rounded-pill bg-card py-2 ps-4 pe-2"
      >
        {/* ATTACH — a Paperclip beside the field, back for real (team migration
            0105, the client's ruling of 18 Sep 2026 restated at the top of
            this file's own header). It opens the hidden native picker below;
            `addFiles` — SHARED with the tile grid's own Add tile above — does
            the actual work. Icon-only and quiet: this is a composer control,
            not the record's title, so `ghost` per the kit's own "an icon-only
            control is secondary anyway" note (button.tsx) is the wrong read
            here specifically — SECONDARY reaches for a fill in the OTHER
            paper tone, and this pill's own fill (`bg-card`) IS that tone, so
            a secondary button beside it would repaint the pill's own ground.
            `ghost` (no fill) reads correctly on top of it. */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInput.current?.click()}
              aria-label={t("Attach a file")}
              className="w-[var(--control-height-dense)] shrink-0 px-0"
            >
              <Paperclip aria-hidden="true" focusable="false" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("Attach a file")}</TooltipContent>
        </Tooltip>
        <input
          ref={fileInput}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? [])
            if (files.length) addFiles(files)
            // Cleared so picking the SAME file twice in a row still fires
            // `onChange` — a native input only changes on a DIFFERENT value.
            event.target.value = ""
          }}
        />
        <input
          ref={field}
          type="text"
          /* Hands its ring to the pill above. See tokens.css §8. */
          data-focus-proxy=""
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={answered ? t("This ticket is answered. Reply anyway…") : t("Write a reply…")}
          aria-label={t("Message")}
          className="min-w-0 flex-1 appearance-none border-0 bg-transparent p-0 [font:inherit] text-caption text-foreground placeholder:text-ink-tertiary"
        />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="submit"
              variant="inverse"
              size="sm"
              disabled={!ready || attachBusy}
              /* THE NAME A SCREEN READER HEARS, and the name the tooltip shows,
                 and they are the same two words on purpose. */
              aria-label={t("Send reply")}
              className="w-[var(--control-height-dense)] px-0"
            >
              <PaperPlaneTilt aria-hidden="true" focusable="false" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("Send reply")}</TooltipContent>
        </Tooltip>
      </form>
    </div>
  )
}
