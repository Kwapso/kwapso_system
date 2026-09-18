"use client"

// ONE REQUEST — what you asked, where it stands, and the conversation.
//
// TWO THINGS THIS SCREEN DELIBERATELY DOES NOT HAVE, both worth stating because
// both look like omissions until you know why:
//
// 1. NO ACTIVITY TAB. Every record detail in the base carries Overview +
//    Activity (R2). A record's history is a list of sentences like "Alaap moved
//    this to in progress" — it NAMES the staff moving the work, which the portal
//    never does (SCOPE ch.06). The activity door isn't on the portal gateway's
//    surface either, so this isn't a hidden button; it is a door that was never
//    opened. Recorded as a reasoned exemption in shared/rules/registry.ts
//    (PORTAL_ACTIVITY_EXEMPT) and held true by the portal's rules test — an
//    exemption nobody checks is just a skip with better manners.
//
// 2. NO STATUS CONTROL, AND SINCE 7 SEP 2026 THE SENTENCE HAS NO EXCEPTION
//    CLAUSE. Moving a ticket along its lifecycle is gated on help:update, which is
//    the agency's job: the client sees where it stands (CHECKLIST 5.2 — the
//    status is a label, never a button).
//
//    There WAS one exception, and it is worth a paragraph because it stood here
//    for a long time and its safety argument is still quoted elsewhere. The
//    first move used to be the client's: an extra, a request or a piece of
//    feedback waited in `awaiting_validation` until the company paying for it
//    said it wanted it (CHECKLIST 5.13), and this screen drew a "yes, go ahead"
//    band for exactly that. The client retired the stage (shared/types.ts,
//    `HELP_STATUSES`), so the band, the door and the tool behind it are gone and
//    a request goes into the queue the moment it is raised. Nothing on this
//    surface moves a ticket along its lifecycle now — no qualifier.
//
// THE ONE PIECE OF REAL LOGIC: who wrote a reply. A thread now has three kinds
// of author, not two — since the owner ruled that a contact sees their COMPANY's
// questions (11 Aug 2026), the people on a thread are this person, their
// COLLEAGUES, and the agency.
//
// The server decides which is which, because only the server knows: it sends a
// name for everyone on the client's side of the fence and NO name for anyone on
// ours (lib/help listReplies). So the rule here is simply "you, or the name we
// were given, or us" — and the staff-anonymity rule (SCOPE ch.06) is kept by the
// wire rather than by this component choosing not to draw something it was sent.
// Which matters: the old version printed the agency's name for every author who
// wasn't you, and would have introduced a client's own colleague as "kwapso".
//
// THE THREAD IS THE KIT'S, AND THIS PARAGRAPH USED TO SAY IT COULD NOT BE.
//
// The old note here explained that the conversation was hand-assembled because
// "no component in the library can express [WhatsApp-style sides] on a NAMED
// thread" — TicketThread had no per-reply side, and Chat had sides but no
// author. Both were true of the OLD library. The kit ships
// `structures/portal-conversation`, whose `ThreadMessage` carries `side`,
// `author`, `authorMeta`, `time` and `attachments`, and which is drawn for
// exactly this screen: "the client's thread on a record". The note outlived the
// thing it described by one design system, which is how a hand-rolled copy
// becomes permanent.
//
// So the bubbles, their sides, the 62% measure, the author headings, the
// loading/empty/error registers and the internal-note PROHIBITION (ch27.10 —
// a message marked internal is dropped before the thread sees it, which is a
// safety property this screen should never have been carrying itself) are the
// kit's now.
//
// ONE PART IS STILL COMPOSED HERE, deliberately:
//   • THE COMPOSER. The kit's is a single-line pill (`<input type="text">`),
//     which is right for a chat and wrong for a client describing what went
//     wrong with their work. `composer={false}`, and the paragraph field below
//     stays — built from the kit's own Card, Textarea and Button, so it is the
//     kit's vocabulary either way.
// (The kit's `PortalApprovalBand` used to be composed here too, under the
// description — a person is asked to approve a request after they have read it
// back, not before. It went with the approval it drew; see note 2 below.)

import * as React from "react"
import Link from "next/link"

import { Badge } from "@shared/ui/components/badge/badge"
import { Button } from "@shared/ui/components/button/button"
import { Card } from "@shared/ui/components/card/card"
import { FileUpload, type FileUploadItem } from "@shared/ui/components/file-upload/file-upload"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { Textarea } from "@shared/ui/components/textarea/textarea"
import { toast } from "@shared/ui/components/sonner/sonner"
import {
  PortalConversation,
  type PortalMessage,
} from "@shared/ui/components/portal-conversation/portal-conversation"
import { ArrowLeft, PaperPlaneTilt, Paperclip } from "@shared/ui/foundations/icons"
import type { ThreadAttachment } from "@shared/ui/components/ticket-thread/ticket-thread"

import { brand } from "@shared/brand"
import type { HelpAttachment, HelpMessage, HelpMessageAttachment } from "@shared/types"
import { useFollowNewest } from "@shared/web/follow-newest"
import { formatRelative } from "@shared/web/format"
import { primeCache, useCached } from "@shared/web/store"
import { ApiFailure, support } from "@/lib/api"
import { cacheKeys } from "@/lib/live-resources"
import { useTickets } from "@/lib/tickets"
import { STATUS_WORDS } from "@/components/ticket-row"
import { TicketAttachments } from "@/components/ticket-attachments"
import { TicketRating } from "@/components/ticket-rating"
import { ErrorPanel } from "@/components/error-panel"
import type { PortalReady } from "@/components/portal-shell"
import { useLanguage } from "@shared/web/language"
import { RecordRef, REF_LEADS_NAME } from "@shared/web/record-ref"
import { RichText } from "@shared/web/rich-text-view"
// EACH MESSAGE'S OWN FILES (team migration 0105) — the SAME two pieces
// `web/components/tickets/help-detail.tsx`'s own `messageFilesFor` reads a
// picture and a document glyph through: `AttachmentPreview`/`hasPreview` for
// the media well, `fileTypeIcon` for the chip's glyph. `readFileAsDataUrl` and
// `pickedFileId`/`usePickedFileItems`/`storedFileToUploadItem` are the exact
// upload/preview seam `ticket-attachments.tsx`'s own picker (this file's
// sibling, the TICKET-LEVEL list) already stands on.
import { AttachmentPreview, hasPreview } from "@shared/web/attachment-preview"
import { fileTypeIcon } from "@shared/web/screen-engine/file-type-icon"
import { readFileAsDataUrl } from "@shared/web/file"
import { safeHref } from "@shared/web/rich-text"
import { pickedFileId, storedFileToUploadItem, usePickedFileItems } from "@shared/web/upload-items"

/** WHICH SIDE A MESSAGE SITS ON — and why it is this way round.
 *
 * The owner asked to "show a clear distinction between chats sent by the current
 * active user and chats sent by another user… similar to WhatsApp". He typed
 * "ours on the left, theirs on the right" — but WhatsApp, the app he NAMED, puts
 * YOUR OWN messages on the RIGHT. This builds the convention he named rather
 * than the direction he typed. That is a decision, not a slip: to flip it, swap
 * these two values and change nothing else.
 *
 * It is also deliberately BINARY, and that is a security property, not tidiness.
 * The only question it asks is "did I write this". It must never key on the
 * author id for anything more — no per-author grouping, no per-author colour, no
 * collapsing consecutive messages by author — because two replies typed by two
 * different staff members have to be indistinguishable. The moment the unnamed
 * side splits into groups, it stops being "the agency" and starts being a
 * fingerprint you can count people with (SCOPE ch.06).
 *
 * The wire already holds that line: to a client login a reply from our side of
 * the fence arrives with authorId AND authorName null (shared/types HelpMessage
 * says why). So `null === me` is false and every agency reply lands on the same
 * side by the same route — this function must never become the second place that
 * decision is made. */
export const OWN_SIDE = "mine"
export const OTHER_SIDE = "theirs"
export function sideFor(authorId: string | null, meId: string): "mine" | "theirs" {
  return authorId === meId ? OWN_SIDE : OTHER_SIDE
}

/** "2.4 MB", "812 KB" — `ticket-attachments.tsx`'s own local `fileSize`, one
 * file along: kept as its own small copy rather than exported and imported,
 * because that file's `isFollowable` beside it is DELIBERATELY policy (its own
 * header: "plainly-the-web only, so no mailto:") and the two are written
 * together on purpose — this composer needs the size half only, since a
 * message's `href` is always this ticket's own `/media/<key>` path, never a
 * pasted link (see `messageFilesFor`, below). */
function fileSize(bytes: number | null): string | null {
  if (bytes === null || bytes <= 0) return null
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** ONE PICKED FILE, FROM "JUST CHOSEN" TO "SENT" — team migration 0105, the
 * client's ruling of 18 Sep 2026 restated at `TicketAttachments`'s own header:
 * "the customers can attach images & files. so do we." Uploaded IMMEDIATELY on
 * pick (this ticket already exists, so R41's deferred-upload branch does not
 * apply), never deferred to the Reply press. The same shape
 * `reply-composer.tsx`'s own `AttachSlot` uses on the agency side — kept as
 * its own copy here rather than shared, since the two composers do not share a
 * component (this one has no five-second hold to carry it through). */
type AttachSlot =
  | { key: string; status: "uploading" | "error"; file: File; message?: string }
  | { key: string; status: "done"; attachment: HelpMessageAttachment }

/** EACH MESSAGE'S OWN FILES — the agency twin's `messageFilesFor`
 * (help-detail.tsx), read here off the identical `HelpMessage.attachments`
 * shape the door now answers with on BOTH front doors (lib/help.ts's
 * `listReplies` redacts nothing about a message's own files — R54 is about
 * WHO SAID something, not what they attached). `href` goes through
 * `safeHref` before it reaches a chip or a media well: the portal's own
 * render-side half of R20/R40, the same seam `ticket-attachments.tsx` already
 * stands on for the ticket-level list. */
function messageFilesFor(attachments: HelpMessageAttachment[] | undefined): {
  attachments?: ThreadAttachment[]
  media?: React.ReactNode
} {
  if (!attachments || !attachments.length) return {}
  const pictures = attachments.filter((a) => hasPreview("file", a.mime))
  return {
    attachments: attachments.map((a) => {
      const Glyph = fileTypeIcon(a.name)
      const size = fileSize(a.size)
      return {
        id: a.id,
        name: (
          <span className="inline-flex min-w-0 items-center gap-1">
            <Glyph aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="min-w-0 truncate">{a.name}</span>
          </span>
        ),
        size: size ?? undefined,
        href: safeHref(a.href),
      }
    }),
    media: pictures.length ? (
      <div className="flex flex-col gap-2">
        {pictures.map((a) => (
          <AttachmentPreview key={a.id} kind="file" url={a.href} contentType={a.mime} />
        ))}
      </div>
    ) : undefined,
  }
}

export function TicketScreen({ ready, ticketId }: { ready: PortalReady; ticketId: string }) {
  const { t, lang } = useLanguage()
  // READ BY ID, ALWAYS — and paint from the list while that lands.
  //
  // This used to read the ticket OUT OF THE LIST and only fall back to the by-id
  // door when the list did not hold it, which is the shape R38 exists to forbid:
  // tickets is a paged collection, so a ticket past page one reports itself as
  // missing, and the row a list carries is not the record — a list row is
  // whatever the LIST door chose to send. Concretely it is why the ticket list
  // payload cannot be trimmed: `description` is 34.9% of it, measured, and
  // dropping it would silently show a client half their own ticket.
  //
  // Cache-first, so nothing on screen got slower: the list row paints instantly
  // and the by-id answer replaces it the moment it lands (CACHING.md), which is
  // the same trade every record screen in the agency app already makes.
  const { tickets } = useTickets()
  const fromList = (tickets ?? []).find((t) => t.id === ticketId)
  const oneQ = useCached(cacheKeys.ticket(ticketId), () => support.ticket(ticketId))
  const ticket = oneQ.data ?? fromList ?? null

  const threadQ = useCached<HelpMessage[]>(cacheKeys.thread(ticketId), () =>
    support.thread(ticketId).then((r) => {
      primeCache(cacheKeys.threadTotal(ticketId), r.total)
      return r.replies
    })
  )

  const me = ready.user.id
  // ONE decision per message, taken here and never re-taken. The alignment and
  // the bubble surface both hang off `side`, so they cannot disagree — and the
  // author id does not survive this map, so nothing downstream can accidentally
  // key on it (see sideFor's note on fingerprints).
  const messages: (PortalMessage & { own: boolean })[] = (threadQ.data ?? []).map((m) => {
    const side = sideFor(m.authorId, me)
    return {
      id: m.id,
      side,
      own: side === OWN_SIDE,
      // Your own side says only the time: the side IS the attribution, which is
      // the whole point of having one.
      author: side === OWN_SIDE ? undefined : (m.authorName ?? brand.name),
      time: formatRelative(m.createdAt, t, lang),
      // A reply is typed, so its line breaks are the person's. The kit's bubble
      // wraps and breaks a long word; preserving a paragraph is the call site's.
      body: <span className="whitespace-pre-wrap">{m.body}</span>,
      // team migration 0105 — see `messageFilesFor`'s own header, above.
      ...messageFilesFor(m.attachments),
    }
  })

  const [draft, setDraft] = React.useState("")
  const [sending, setSending] = React.useState(false)
  // THE COMPOSER'S OWN TILE GRID — see `AttachSlot`'s header above. A hidden
  // native input drives BOTH the Paperclip below and the grid's own Add tile
  // (`addFiles` is the one handler for either).
  const [slots, setSlots] = React.useState<AttachSlot[]>([])
  // SEQUENTIAL, matching `reply-composer.tsx`'s own `uploadChain` and for the
  // identical reason: `support.attach` answers with the WHOLE list, and
  // reading "the newest one" off it is only honest when uploads cannot race.
  const uploadChain = React.useRef<Promise<void>>(Promise.resolve())
  const fileInput = React.useRef<HTMLInputElement | null>(null)

  // Land on the newest reply, and follow the one you just sent. Every hook here
  // sits ABOVE the `if (!ticket)` return below, deliberately — a hook under an
  // early return changes the hook count the first day that return fires.
  const newest = messages[messages.length - 1] ?? null
  useFollowNewest(newest?.id ?? null, newest?.own ?? false)

  async function send() {
    const body = draft.trim()
    if (!body || sending || attachBusy) return
    setSending(true)
    try {
      const attachmentIds = slots
        .filter((s): s is Extract<AttachSlot, { status: "done" }> => s.status === "done")
        .map((s) => s.attachment.id)
      const r = await support.reply(ticketId, body, attachmentIds)
      primeCache(cacheKeys.thread(ticketId), r.replies)
      primeCache(cacheKeys.threadTotal(ticketId), r.total)
      setDraft("")
      // The tiles empty ONLY on success — matching `draft` right above: a
      // refusal leaves both the words AND the files exactly where they were,
      // never a silent loss of either (R41).
      setSlots([])
    } catch (e) {
      toast.error(e instanceof ApiFailure ? e.message : t("Couldn't send that. Try again."))
    } finally {
      setSending(false)
    }
  }

  /** UPLOAD ONE PICKED FILE, IMMEDIATELY — the SAME door
   * `ticket-attachments.tsx`'s own picker already calls (`support.attach`),
   * `kind: "file"`, no `help_thread_id` yet: this only STAGES the row.
   * `support.reply`'s own `attachmentIds` (above) is what claims it for a
   * specific message once Send is actually pressed. */
  async function uploadFile(file: File): Promise<HelpMessageAttachment> {
    let r: { attachments: HelpAttachment[]; total: number }
    try {
      r = await support.attach(ticketId, {
        kind: "file",
        label: file.name,
        fileDataUrl: await readFileAsDataUrl(file),
      })
    } catch (err) {
      throw new Error(err instanceof ApiFailure ? err.message : t("Couldn't attach that."))
    }
    // THE NEWEST ROW, off the end of the door's own oldest-first list —
    // `uploadChain` (above) is what makes this reading honest; see its own
    // comment and `help-detail.tsx`'s identical `uploadReplyFile`.
    const created = r.attachments[r.attachments.length - 1]
    if (!created) throw new Error(t("Couldn't attach that."))
    return { id: created.id, name: created.label, href: created.url, mime: created.contentType, size: created.sizeBytes }
  }

  function addFiles(files: File[]) {
    for (const file of files) {
      const key = pickedFileId(file)
      setSlots((prev) => [...prev, { key, status: "uploading", file }])
      uploadChain.current = uploadChain.current
        .then(() => uploadFile(file))
        .then((attachment) => {
          setSlots((prev) => prev.map((s) => (s.key === key ? { key, status: "done", attachment } : s)))
        })
        .catch((err) => {
          const message = err instanceof Error ? err.message : t("Couldn't attach that.")
          setSlots((prev) => prev.map((s) => (s.key === key ? { key, status: "error", file, message } : s)))
          toast.error(message)
        })
    }
  }

  /** TAKE ONE OFF, before Send — best-effort deactivate off the same door
   * `TicketAttachments`'s own remove control calls. See `reply-composer.tsx`'s
   * identical `removeAttachment` for why this cannot fail loudly: the tile
   * leaves the grid whatever the cleanup call does. */
  function removeAttachment(key: string) {
    setSlots((prev) => {
      const slot = prev.find((s) => s.key === key)
      if (slot?.status === "done") void support.detach(ticketId, slot.attachment.id).catch(() => {})
      return prev.filter((s) => s.key !== key)
    })
  }

  const pendingSlots = slots.filter(
    (s): s is Extract<AttachSlot, { status: "uploading" | "error" }> => s.status !== "done"
  )
  const pendingItems = usePickedFileItems(pendingSlots.map((s) => s.file))
  const attachTiles: FileUploadItem[] = slots.map((s) => {
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
  const attachBusy = slots.some((s) => s.status === "uploading")

  const back = (
    <Link
      href="/tickets"
      className="text-muted-foreground hover:text-foreground -ml-1 flex w-fit items-center gap-1 text-sm"
    >
      <ArrowLeft className="size-3.5" />
      {t("All tickets")}
    </Link>
  )

  if (!ticket) {
    // NOT FOUND AND FAILED TO LOAD ARE DIFFERENT SENTENCES. `ticket` collapses
    // to null both when the by-id read genuinely resolved with nothing (outside
    // the fence a real id and a made-up one are the same sentence — the door
    // answers null either way, and so do we) AND when the read never resolved
    // at all — a dropped connection, a 500. This used to print "We can't find
    // that ticket." for both, which tells a client on a flaky connection that
    // their real ticket is gone. Only reachable when `fromList` is absent, so
    // `oneQ` is the read that ran.
    const failed = !!oneQ.error && oneQ.data === undefined
    return (
      <div className="flex flex-col gap-6">
        {back}
        {oneQ.loading || threadQ.loading ? (
          <Skeleton className="h-64 w-full rounded-[var(--radius)]" />
        ) : failed ? (
          <ErrorPanel
            title={t("We couldn't load that ticket.")}
            description={t("Check your connection and try again.")}
            onRetry={oneQ.refresh}
          />
        ) : (
          // REGRESSION FIX, 2026-09-01: was `border border-dashed` — see
          // impact-screen.tsx's own note on this box for the full reasoning.
          <p className="text-muted-foreground rounded-[var(--radius)] bg-surface-panel p-8 text-center">
            {t("We can't find that ticket.")}
          </p>
        )}
      </div>
    )
  }

  const status = STATUS_WORDS[ticket.status]

  return (
    <div className="flex flex-col gap-6">
      {back}

      {/* What you asked, and where it stands — in the portal's own words. One
       * badge, not two: the library's header showed its own English status
       * ("Open", "In progress") beside this one, so the same fact appeared twice
       * and half of it was the agency's vocabulary rather than the client's. */}
      <Card className="flex flex-col gap-4 p-4">
        {/* THE NUMBER AND THE STATE, in that order — the number is what a client
            reads down the phone ("I'm calling about T0412"), so it leads. The
            chip is `RecordRef`, the same component and the same lozenge the
            agency's own ticket screen draws, and `ticket-row.tsx`'s header
            carries the whole argument for why a reference crosses the fence
            when an assignee does not. */}
        <span className={`${REF_LEADS_NAME} w-fit flex-wrap`}>
          <RecordRef value={ticket.ref} />
          <Badge variant={status.variant} className="w-fit">
            {t(status.label)}
          </Badge>
        </span>
        <RichText html={ticket.description} className="break-words" />
      </Card>

      {/* SHOW US WHAT YOU MEAN (CHECKLIST 5.10) — above the conversation, because
       * the files are part of the request rather than part of the exchange about
       * it. The thread below scrolls itself to the newest reply on arrival, so
       * nothing here costs the person their place. */}
      <TicketAttachments ticketId={ticketId} />

      {/* THE KIT'S THREAD. `composer={false}` and `audience={null}` because both
          are composed below — see the note at the top of this file for why the
          paragraph field stays. `state` is the thread's own, not the screen's:
          the ticket is already on screen above, so a thread still arriving is a
          thread-shaped wait and not a page-shaped one. */}
      <PortalConversation
        messages={messages}
        composer={false}
        audience={null}
        // NEVER SWALLOW (ERROR-HANDLING.md): this used to read
        // `data === undefined ? "loading" : …`, so a thread whose fetch FAILED
        // looked identical to one still in flight — spinning forever, and the
        // errorTitle/errorDescription below were dead copy no branch could
        // ever select. `error` is checked first now, the same order every
        // other read in this file uses.
        state={
          threadQ.error && threadQ.data === undefined
            ? "error"
            : threadQ.data === undefined
              ? "loading"
              : messages.length === 0
                ? "empty"
                : "ready"
        }
        label={t("Conversation")}
        loadingLabel={t("Loading…")}
        copy={{
          emptyTitle: t("No replies yet"),
          emptyDescription: t("Write below and we'll see it."),
          errorTitle: t("We can't show this right now"),
          errorDescription: t("Try again in a moment."),
        }}
      />

      {/* HOW DID WE DO (the owner, 6 Sep 2026). UNDER the conversation and above
          the composer, which is the one arrangement decision here: the question
          is about work that is finished, so it belongs after the person has read
          what we said — the same "read it back first" ordering the approval band
          above is placed by. It draws nothing at all until the ticket is
          answered, and the door refuses a rating on anything else besides, so
          this prop is the screen agreeing with the rule rather than owning it. */}
      <TicketRating ticketId={ticketId} resolved={ticket.status === "resolved"} />

      {/* No @mentions from this surface: a client has no business naming which
       * staff member picks their request up — so no mention hint in the
       * placeholder either, which the library's composer showed while the portal
       * passed it an empty member list and the "@" did nothing. */}
      <Card className="flex flex-col gap-2 p-3">
        {/* THE TILE GRID (team migration 0105) — same OPTION B shape as the
            agency's own composer (reply-composer.tsx), mounted only once
            there is something to show. */}
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
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("Write a reply…")}
          rows={3}
          className="resize-none"
          aria-label={t("Reply")}
          disabled={sending}
        />
        <div className="flex items-center justify-between gap-2">
          {/* WHO READS THIS, said on the composer — the kit's ch27.10 rule for
           * the portal, in the agency's own name rather than a hardcoded one. */}
          <span className="text-muted-foreground text-xs">
            {t("{name} will see this", { name: brand.name })}
          </span>
          <div className="flex items-center gap-2">
            {/* ATTACH — the client's own ruling, 18 Sep 2026: "the customers
                can attach images & files. so do we." A hidden native picker,
                same shape as `TicketAttachments`'s own; `addFiles` — SHARED
                with the tile grid's own Add tile above — does the work. */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInput.current?.click()}
              aria-label={t("Attach a file")}
              className="px-2"
            >
              <Paperclip className="size-3.5" />
            </Button>
            <input
              ref={fileInput}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? [])
                if (files.length) addFiles(files)
                // Cleared so picking the SAME file twice in a row still fires
                // `onChange` — a native input only changes on a DIFFERENT value.
                e.target.value = ""
              }}
            />
            {/* R84 — the composer is not a title component, so black. */}
            <Button
              type="button"
              variant="inverse"
              size="sm"
              disabled={!draft.trim() || sending || attachBusy}
              onClick={() => void send()}
            >
              <PaperPlaneTilt className="size-3.5" />
              {sending ? t("Sending…") : t("Reply")}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
