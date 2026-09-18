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
import { toast } from "@shared/ui/components/sonner/sonner"
import { Tooltip, TooltipContent, TooltipTrigger } from "@shared/ui/components/tooltip/tooltip"
import { PaperPlaneTilt, Paperclip } from "@shared/ui/foundations/icons"
import { useLanguage } from "@shared/web/language"
import { useFormDraft } from "@shared/web/use-form-draft"

import { createSendHold, type SendHold, type SendHoldView } from "@/lib/send-hold"

/** WHAT IS HELD FOR FIVE SECONDS. Text and a caret, and nothing else — this
 * composer has no attachment control, because the kit's own rule for a thread is
 * that "a message is text, files live on the record", and this ticket's files
 * live on its Files and links tab. If one is ever added here it rides in this
 * object, which is why the shape is named. */
type HeldReply = {
  text: string
  /** Where the cursor was when she pressed send, so Undo puts it back exactly
   * there rather than at the end of a sentence she was editing the middle of. */
  caret: number
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
}

export function useReplySend({
  /** The ticket. The draft is kept per ticket, so two tickets open in two tabs
   * never share half a sentence. */
  ticketId,
  /** DO IT. Returns the sentence the settling toast should say — so the words
   * for "sent" are decided by the caller that knows what the door actually
   * answered, not guessed at here. `leaving` is true only on the tab-closing
   * path, where it must reach `fetch` as `keepalive`. */
  onSend,
}: {
  ticketId: string
  onSend: (text: string, leaving: boolean) => Promise<string>
}): ReplySend {
  const { t } = useLanguage()
  const field = React.useRef<HTMLInputElement | null>(null)

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
  const words = { refused: t("Couldn't post your reply.") }
  const latest = React.useRef({ onSend, setDraft, clearDraft, words })
  latest.current = { onSend, setDraft, clearDraft, words }

  const holdRef = React.useRef<SendHold<HeldReply> | null>(null)
  if (holdRef.current === null) {
    holdRef.current = createSendHold<HeldReply>({
      send: async (held, { keepalive }) => {
        const said = await latest.current.onSend(held.text, keepalive)
        // Nothing is drawn on a page that is being torn down. The request is
        // already in flight and will outlive this document; a toast would not.
        if (keepalive) return
        // A couple of seconds, and no Undo on it — because from here there is
        // none: the row is written. The five seconds exist precisely so that
        // undo never has to mean pulling a message back off the thread.
        toast.success(said, { id: toastId, duration: 2600 })
      },
      onFailed: (held) => {
        // THE WORDS COME BACK. A refusal must never cost somebody the sentence
        // they wrote — the composer emptied on press, so this is the only route
        // back to it, exactly as Undo is.
        latest.current.setDraft({ text: held.text })
        toast.error(latest.current.words.refused, { id: toastId })
      },
      onChange: setView,
    })
  }
  const hold = holdRef.current

  const held = view.payload

  /** STOP IT. Nothing was sent, so nothing has to be unwound: the bubble goes,
   * and her words, her caret and (when there is ever one) her attachment come
   * back to the composer. This is non-negotiable — the composer empties on press,
   * so Undo is the only route back to what she wrote. */
  const undo = React.useCallback(() => {
    const stopped = hold.undo()
    if (!stopped) return
    latest.current.setDraft({ text: stopped.text })
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

  function start() {
    if (text.trim().length === 0) return
    hold.start({
      text,
      caret: field.current?.selectionStart ?? text.length,
    })
    // The composer empties NOW, not when the send lands — she has finished with
    // these words and the next thing she types is the next message. Undo is what
    // brings them back, and the draft is dropped with them so a reload during
    // the wait does not resurrect a sentence that is already on its way.
    latest.current.setDraft({ text: "" })
    latest.current.clearDraft()
  }

  return {
    text,
    setText: (next: string) => setDraft({ text: next }),
    held,
    secondsLeft: view.secondsLeft,
    start,
    field,
  }
}

export function ReplyComposer({
  /** The hold, owned by the screen above the tab strip. */
  send,
  /** The ticket is already answered. Only the placeholder changes: a reply on a
   * closed ticket appends and touches no status, which is worth saying. */
  answered,
  /** OPENS THE SAME FILE PICKER `HelpAttachmentsPanel` already has, client
   * ruling, 18 Sep 2026: "the customers can attach images & files. so do
   * we… that's why I ask for the attach button on the text input field."
   * Absent draws no button — a caller with no attachment door of its own
   * (there is none today) gets a composer identical to before. */
  onAttach,
}: {
  send: ReplySend
  answered: boolean
  onAttach?: () => void
}) {
  const { t } = useLanguage()
  const { text, setText, held, secondsLeft, start, field } = send
  const ready = text.trim().length > 0

  return (
    <div className="flex min-w-0 flex-col gap-4">
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
          one, which is what `focus-ring.test.ts` reads this file for. */}
      <form
        data-slot="reply-composer"
        data-focus-shell=""
        onSubmit={(event) => {
          event.preventDefault()
          start()
        }}
        className="flex min-w-0 items-center gap-2 rounded-pill bg-card py-2 ps-4 pe-2"
      >
        {/* ATTACH — a Paperclip beside the field, wired to the SAME file
            picker `HelpAttachmentsPanel` (now inline below the thread) opens
            on "Add a file"; `onAttach` is that panel's `openRef`, read
            through help-detail.tsx. Icon-only and quiet: this is a composer
            control, not the record's title, so `ghost` per the kit's own
            "an icon-only control is secondary anyway" note (button.tsx) is
            the wrong read here specifically — SECONDARY reaches for a fill
            in the OTHER paper tone, and this pill's own fill (`bg-card`) IS
            that tone, so a secondary button beside it would repaint the
            pill's own ground. `ghost` (no fill) reads correctly on top of it. */}
        {onAttach && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onAttach}
                aria-label={t("Attach a file")}
                className="w-[var(--control-height-dense)] shrink-0 px-0"
              >
                <Paperclip aria-hidden="true" focusable="false" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("Attach a file")}</TooltipContent>
          </Tooltip>
        )}
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
              disabled={!ready}
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
