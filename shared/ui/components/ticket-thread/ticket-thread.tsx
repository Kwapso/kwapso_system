/* ============================================================================
   TicketThread — the client-facing conversation (1 direct call site).

   A NAMING CONTRADICTION IN THE COMMISSION, LOGGED NOT RESOLVED
   Commission §11 rules: "Tiers 0–2 carry no product vocabulary. No component
   may be named or documented in terms of tickets, sprints, accounts or
   clients. `List`, not `TicketList`." Commission §7 then requires this exact
   folder and this exact export: "`ticket-thread` | `TicketThread` | the
   client-facing conversation | 1". Both sentences are the commission's.

   The export name wins, because §2 rule 2 is the delivery contract — the name
   is already written into a call site and renaming it breaks the build, which
   is the one failure this commission exists to prevent. Everything the NAME
   does not force is generic: no prop, no type, no default string and no
   comment below this block says "ticket". A message has an `author`, a
   `side`, an `internal` flag and `attachments`; it does not have a
   requester, an agent or a case. The full entry, with both sections quoted,
   is GAPS-COL3 TCK-1.

   DESIGN SOURCE
   design-mothership/specimens/kwapso-patterns.css → CH22 "Notifications &
   threads": `.kw-thread`, `.kw-msg`, `.kw-msg__bubble`, `.kw-msg--theirs`,
   `.kw-msg--mine`, `.kw-msg__receipt`, `.kw-comment__avatar`, `.kw-composer`,
   `.kw-composer__ghost`, `.kw-composer__send`, `.kw-mention`. Figure for
   figure:

     · thread   — `display:flex; flex-direction:column; gap:var(--space-2h)`
     · message  — `display:flex; gap:var(--space-2); align-items:flex-end;
                   max-width:62%`
     · bubble   — `border-radius:var(--radius-card);
                   padding:var(--space-3) var(--space-4);
                   font-size:var(--text-caption);
                   line-height:var(--leading-normal)`
     · theirs   — `align-self:flex-start`, bubble on `--surface-raised`
     · mine     — `align-self:flex-end; flex-direction:row-reverse`, bubble on
                   `--surface-inverse` with `--ink-on-inverse`
     · receipt  — `align-self:flex-end; font-size:var(--text-micro);
                   color:var(--ink-disabled); tabular`
     · avatar   — `--avatar-sm` (24) pill, `--surface-raised`, micro/strong
     · composer — `display:flex; align-items:center; gap:var(--space-2);
                   background:var(--surface-raised);
                   border-radius:var(--radius-pill);
                   padding:var(--space-2) var(--space-2) var(--space-2)
                   var(--space-4)`
     · send     — dense height, `--space-3` inline, pill, inverse fill,
                   badge/strong

   The sheet's own comment states the governing ruling verbatim, and it
   overrides the drawn chapter:

       "Message thread — built to RULING 36, which supersedes the ch22
        drawing (the drawn specimen shows mango-right/card-left at 78% with
        no avatars; the appendix states 'where a ruling contradicts an older
        page, the ruling wins'). Ruling 36: yours-right on the charcoal fill,
        theirs-left on paper, avatars outside, 62% maximum width. Ban stands
        on tails, scrims, gradients."

   Chapter 27.10 adds the two things ruling 36 does not: the four kinds of
   thread are ONE composition ("Client ↔ team threads, internal team chat,
   the assistant, and comments on a record are the same composition with a
   different header and a different participant list"), and an internal note
   is marked in the thread rather than hidden from it.

   THE LAW THIS FILE OBEYS
   · NO TAILS, NO SCRIMS, NO GRADIENTS. Ruling 36 bans all three by name.
     A bubble is a paper card with the box radius, and nothing else.
   · SIDES, NOT COLOURS, CARRY AUTHORSHIP. Mine is charcoal at the inline
     end; theirs is raised paper at the inline start. Mango never appears in
     a bubble: it is the brand, never a status and never a speaker.
   · 62% MAXIMUM WIDTH, at every breakpoint. Ruling 36 states one figure and
     it is not a function of viewport width — see the breakpoint block.
   · The avatar is OUTSIDE the bubble, and it is `Avatar`, not a redrawn
     circle.
   · An empty composer sends nothing: the send control is `disabled` — a fill
     and an ink — rather than absent, so the row does not reflow as the
     reader types.
   · Focus is ONE global rule (tokens.css §8). Nothing here sets
     `outline: none`; the composer's field carries no ring of its own and the
     shared `:focus-visible` rule lands on it at the pill radius.

   RENDERING CONTEXT
   `"use client"`. Controlled and uncontrolled composer state, a submit
   handler, and `Avatar` underneath.
   ========================================================================= */

"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "../avatar/avatar";
import { Badge } from "../badge/badge";
import { buttonVariants } from "../button/button";
import { Skeleton } from "../skeleton/skeleton";
import {
  Copy,
  DotsThree,
  Paperclip,
  PaperPlaneTilt,
  PencilSimple,
  Trash,
} from "../../foundations/icons";
import { Checkbox } from "../checkbox/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../dropdown-menu/dropdown-menu";
import { ScreenRegister } from "../screen-renderer/screen-renderer";
import { Textarea } from "../textarea/textarea";

/**
 * Which side of the thread a message sits on.
 *
 * `mine` and `theirs` rather than any role word: ruling 36 names the two
 * sides and nothing else, and the same component draws four different kinds
 * of conversation (ch27.10), in each of which "mine" means someone else.
 */
export type ThreadSide = "mine" | "theirs";

/**
 * A message's edit/copy/delete affordance — 20 Sep 2026, client-ruled,
 * verbatim: "for chat edit pencil: i like from p1 that its besides and
 * appears when hover, but make it like p4 wth the 3 options menu (edit,
 * copy/delete)." Two earlier drawings, merged: p1's PLACEMENT (a small
 * round control beside the bubble, hidden until hover) and p4's CONTENTS
 * (a menu, not a single pencil).
 *
 * Set here for the whole thread, or on `ThreadMessage.actions` for one
 * message — the per-message value wins where both are given (`message.
 * actions ?? actions`, read once per row). Undefined at both levels draws
 * no affordance at all: this is opt in, the same contract `onClose`/
 * `onInternalChange` already hold elsewhere in this kit.
 *
 * COPY NEEDS NO HANDLER TO WORK. `navigator.clipboard.writeText` runs
 * unconditionally the moment the row renders at all (any one of the four
 * being set is enough to draw the trigger, and Copy is the one item that
 * always appears once it does); `onCopy` is a told-you, not a permission.
 * `onEdit`/`onEditRequest`/`onDelete` gate their OWN row — a menu with a
 * Delete item nobody wired would commit to nothing.
 *
 * TWO WAYS TO EDIT, and a caller picks one. Aurora, on the same menu, a
 * later ruling: "open the edit as slide in. can edit text and date and
 * attachments" — three fields the inline textarea this component owns
 * cannot hold. `onEditRequest`, when given, WINS: the Edit row calls it
 * with the message's own id and opens nothing here, so the call site's own
 * slide-in owns the whole edit (text, date, attachments, whatever else it
 * needs) rather than this component guessing at a shape for three fields
 * it has no other opinion about. `onEdit` keeps today's inline-textarea
 * behaviour exactly as it always has, for a caller that never reaches for
 * `onEditRequest`.
 */
export interface ThreadMessageActions {
  /**
   * Puts the bubble into an inline editor seeded with its own body (Save /
   * Cancel underneath) and is called with the message's own id and the
   * edited text once Save is pressed. Absent, no Edit row — unless
   * `onEditRequest` is given, which draws the row on its own.
   *
   * Stood down the moment `onEditRequest` is ALSO given: that one wins, this
   * component opens no inline editor, and `onEdit` here is simply unused for
   * as long as `onEditRequest` is present. See `onEditRequest`'s own doc.
   */
  onEdit?: (id: string, newBody: string) => void;
  /**
   * The OTHER way to edit — see this type's own header, "TWO WAYS TO EDIT".
   * When present, the Edit row calls this instead of opening the inline
   * textarea, with the message's own id and nothing else: what happens next
   * (a slide-in, a route, anything) is entirely the call site's. Draws the
   * Edit row on its own, so a caller reaching only for `onEditRequest` (no
   * `onEdit` at all) still gets one.
   */
  onEditRequest?: (id: string) => void;
  /** Told after the body was copied to the clipboard — see this type's own header. */
  onCopy?: (id: string) => void;
  /**
   * Removes the message. Confirming is the caller's own job — this fires
   * the moment Delete is chosen, with no dialog of its own. Absent, no
   * Delete row.
   */
  onDelete?: (id: string) => void;
}

export interface ThreadAttachment {
  /** Stable key. Falls back to the index. */
  id?: string;
  /** The file's name, as the reader would recognise it. */
  name: React.ReactNode;
  /** Its size, already formatted — "240 KB". A node, so a locale decides. */
  size?: React.ReactNode;
  /** Where it opens. Absent, the chip is a label rather than a link. */
  href?: string;
}

export interface ThreadMessage {
  /** Stable key. Falls back to the index. */
  id?: string;
  /** Which side. Defaults to `theirs`, the safer read for an unknown author. */
  side?: ThreadSide;
  /** Who said it. Drawn above the bubble when it differs from the last one. */
  author?: React.ReactNode;
  /** Which organisation they speak for — ch27.10 draws it beside the name. */
  authorMeta?: React.ReactNode;
  /**
   * Initials for the avatar outside the bubble. INDEPENDENT of the byline:
   * pass this on EVERY message of a run, not only the last one — the avatar
   * and the author/time line are two different signals (see
   * `ThreadBylinePlacement` above, Aurora's 20 Sep 2026 ruling).
   */
  initials?: React.ReactNode;
  /**
   * A photograph for the avatar. Falls back to `initials` when it fails.
   * Same independence as `initials` — a run's earlier messages keep their
   * own `image`/`initials` even though they carry no `author`/`time`.
   */
  image?: string;
  /** IS THIS PERSON FROM OUTSIDE? Forwarded straight to `Avatar`'s own
   * `external` (see `components/avatar/avatar.tsx` for the ruling, the reason
   * the fact is taken rather than guessed, and why the default is colour):
   * an outside person's PHOTOGRAPH renders greyscale, one of our own in full
   * colour. Aurora, 23 Sep 2026: "external photos (from contacts) gray scale.
   * keep staff nirmal." Undefined reads as one of ours. */
  external?: boolean;
  /** Alt text for `image`. Empty is correct when the name is already beside it. */
  imageAlt?: string;
  /** What was said. A node, so a mention pill or a link rides along. */
  body?: React.ReactNode;
  /** When. Already formatted, tabular, beside the author. */
  time?: React.ReactNode;
  /**
   * Not visible to the other side. ch27.10 marks it in the thread rather
   * than hiding it: a note nobody can see is a note nobody trusts. Drawn as
   * a quiet `Badge` above the bubble; the words carry the meaning.
   */
  internal?: boolean;
  /** Files on the message. Each is its own chip under the body. */
  attachments?: readonly ThreadAttachment[];
  /**
   * A media block — an image, a preview. Its own bubble, on the sender's own
   * side (ruling 36), which is why it is a node and not a `src`.
   */
  media?: React.ReactNode;
  /** The read receipt under the last `mine` bubble — "read 12:09". */
  receipt?: React.ReactNode;
  /**
   * A day heading above this message — "13 Jun 2026". Already formatted; a
   * component that grouped by day would have to know a calendar it cannot
   * see.
   */
  daySeparator?: React.ReactNode;
  /**
   * This message's own edit/copy/delete affordance, overriding
   * `TicketThreadProps.actions` for this one row. See `ThreadMessageActions`
   * for the full contract, including why an absent value draws nothing.
   */
  actions?: ThreadMessageActions;
}

/**
 * Where the author · org · time line sits relative to the bubble.
 * `"above"` is the kit's own drawing (ch27.10) and the default — passing
 * nothing here changes nothing. `"below"` moves that same line to follow
 * the bubble, aligned to the bubble's own side, for a caller drawing chat
 * "runs": several bubbles from one speaker with the byline only on the
 * last, and the earlier ones sitting closer together (see `ThreadMessage`
 * above — pass `author`/`authorMeta`/`time` only on the last message of a
 * run to get both the placement and the tightened gap).
 *
 * THE FACE IS NOT THE BYLINE. Aurora's 20 Sep 2026 ruling, verbatim: "on
 * chat, when there are multiple messages by the same person, keep the name
 * and date only on the bottom one, but show the avatar for each." The run
 * signal this component reads (`hasByline`, gating `data-run="continued"`)
 * is built only from `author`/`authorMeta`/`time`/`internal` — never from
 * `initials`/`image` — so a caller building a run passes `author`/
 * `authorMeta`/`time` only on the LAST message and `initials`/`image` on
 * EVERY message: the byline collapses to the last bubble, the avatar does
 * not. AN EARLIER DOC HERE SAID THE OPPOSITE ("pass … `initials` only on
 * the last message of a run") and at least one caller followed it, which is
 * the exact bug the ruling reports — a run member with no byline showing no
 * avatar either. That sentence was wrong and is corrected here; it was never
 * what the render logic (`hasAvatar`, below) actually keyed on.
 */
export type ThreadBylinePlacement = "above" | "below";

const BUBBLE_BASE = [
  // `.kw-msg__bubble` — the box radius, 12/16 inset, caption at normal leading.
  "rounded-[var(--radius)] px-4 py-3",
  "text-caption",
  // A bubble holds pasted URLs and stack traces. Without this one unbreakable
  // string makes the bubble wider than its 62%.
  "min-w-0 break-words",
];

const BUBBLE_SIDE: Record<ThreadSide, string> = {
  /** Ruling 36 — theirs, on paper. */
  theirs: "bg-card",
  /** Ruling 36 — yours, on the charcoal fill with off-beige ink. */
  mine: "bg-surface-inverse text-ink-on-inverse",
};

export interface TicketThreadProps
  extends Omit<React.ComponentPropsWithoutRef<"div">, "children" | "onSubmit"> {
  /** The conversation, oldest first. An empty array draws the empty register. */
  messages: readonly ThreadMessage[];
  /**
   * Where each message's author · org · time line sits. Defaults to
   * `"above"`, the kit's own ch27.10 drawing — leaving this unset changes
   * nothing about today's output.
   */
  bylinePlacement?: ThreadBylinePlacement;
  /**
   * How big each bubble's own face is. Defaults to `"sm"`, `Avatar`'s 24px
   * ruling-30 rung and today's behaviour: leaving this unset changes
   * nothing about today's output. `"md"` draws `Avatar size="control"`
   * instead, 40px, the same height as the message-actions trigger
   * (`size="icon"`, `--control-height-button`) — Aurora, on that same menu:
   * "make the avatar as big as this button." The row is a plain flex row
   * (`items-end`, `gap-2` between the face and the bubble column), so a
   * taller face reflows the row rather than needing its own offset math;
   * the byline (above or below, per `bylinePlacement`) and the run gap
   * between messages both live inside the bubble column, untouched by the
   * face's own width or height at either size.
   */
  faceSize?: "sm" | "md";
  /**
   * A band above the composer — an approval strip, a status line, a notice
   * that the conversation is closed. A node, so whatever the composition puts
   * there brings its own drawing.
   */
  banner?: React.ReactNode;
  /**
   * Draw the composer. On by default. Off for a read-only transcript, which
   * is a real case: a closed conversation is still worth reading.
   */
  composer?: boolean;
  /** The composer's value, when the call site owns it. */
  value?: string;
  /** The composer's starting value, when it does not. */
  defaultValue?: string;
  /** Fires on every keystroke. */
  onValueChange?: (value: string) => void;
  /** Fires on send. The composer clears itself only when it owns its value. */
  onSend?: (value: string) => void;
  /** Fires when the attach control is pressed. Absent, no attach control. */
  onAttach?: () => void;
  /** The composer is not editable and cannot send. A fill and an ink. */
  disabled?: boolean;
  /**
   * A send is in flight. The composer becomes non-editable and sets
   * `aria-busy` — `input.tsx`'s answer, and the right one: typing into a
   * field whose value has not been accepted loses what you typed.
   */
  sending?: boolean;
  /** Which body is drawn. Only the messages swap; the composer stays. */
  state?: "ready" | "loading" | "empty" | "error";
  /** The thread's accessible name. Defaulted so no call site ships a nameless log. */
  label?: string;
  /** The composer's placeholder. The kit's own is a prompt, not a label. */
  placeholder?: string;
  /** The composer field's accessible name, when no visible label sits above it. */
  composerLabel?: string;
  /** The send control's label. */
  sendLabel?: string;
  /** The attach control's accessible name — it is an icon and has no words. */
  attachLabel?: string;
  /** What a quiet `Badge` says over a message the other side cannot see. */
  internalLabel?: string;
  /**
   * The thread-wide edit/copy/delete affordance, applied to every message
   * that does not set its own `ThreadMessage.actions`. See that type's own
   * doc for the full contract. Absent at both levels, no message draws the
   * affordance at all.
   */
  actions?: ThreadMessageActions;
  /** The per-message actions trigger's accessible name — an icon, no visible label. */
  messageActionsLabel?: string;
  /** The Edit row's label, and the inline editor's own heading word. */
  editActionLabel?: string;
  /** The Copy row's label. */
  copyActionLabel?: string;
  /** The Delete row's label. */
  deleteActionLabel?: string;
  /** The inline editor's field, when no visible label sits above it. */
  editFieldLabel?: string;
  /** The inline editor's Save control. */
  editSaveLabel?: string;
  /** The inline editor's Cancel control. */
  editCancelLabel?: string;
  /* -- 27.10's CARD composer ------------------------------------------------
     "The composer is a soft-paper card at the bottom of the thread with the
     internal switch, the audience line, and a round PaperPlaneRight furthest right —
     the send glyph alone, no label. There is no paperclip anywhere in chat."
     Passing `onInternalChange` OR `audience` turns the pill composer into
     that card; without either, chapter 22's pill ships unchanged, which is
     what a record's comments and the portal (which has no internal switch)
     still draw. */
  /** The internal switch's value. Card composer only. */
  internal?: boolean;
  /** The switch was pressed. Its presence mounts the switch chip. */
  onInternalChange?: (value: boolean) => void;
  /** The words on the internal switch chip. */
  internalChoiceLabel?: React.ReactNode;
  /**
   * The audience line — "who will see what you type", in words, beside the
   * send. 27.10: "the composer says in words who will see what you type."
   */
  audience?: React.ReactNode;
  /** How many skeleton bubbles the loading body draws. */
  loadingMessages?: number;
  /** What a screen reader hears while the thread loads. */
  loadingLabel?: string;
  /** The empty register's sentence. */
  emptyTitle?: React.ReactNode;
  /** The line under it. */
  emptyDescription?: React.ReactNode;
  /** The error register's sentence. */
  errorTitle?: React.ReactNode;
  /** The line under it. */
  errorDescription?: React.ReactNode;
  /** The retry. */
  errorAction?: React.ReactNode;
}

/**
 * A conversation.
 *
 * TEN STATES
 *  1. default        — a column of bubbles, theirs at the inline start on
 *                      paper and mine at the inline end on charcoal, avatars
 *                      outside, 62% maximum width, then the composer.
 *  2. hover          — does not apply to a bubble. A message is not a target;
 *                      the kit draws no hover for `.kw-msg` and none is
 *                      invented (GAPS-COL3 TCK-3). The composer's two
 *                      controls are Buttons in everything but markup and
 *                      carry their own named hover tokens; the attachment
 *                      chip, where it is a link, takes the `--accent` wash.
 *  3. focus-visible  — NOT here. tokens.css §8 rings every control at once,
 *                      at the control's own radius. The composer is a pill
 *                      and its ring follows that; nothing here sets
 *                      `overflow: hidden`, so the ring is never shaved.
 *  4. active/pressed — does not apply to a bubble. The send control's press
 *                      resolves into the message appearing, which is a far
 *                      louder acknowledgement than a nudge.
 *  5. disabled       — `disabled`: the composer takes `--btn-disabled-fill` /
 *                      `--btn-disabled-label` and cannot be typed in or sent
 *                      from. A fill and an ink, never an opacity. The
 *                      messages above stay exactly as they are: a closed
 *                      conversation is still readable, and greying the
 *                      transcript would say it had been withdrawn.
 *  6. loading        — TWO different things, kept apart. The THREAD loading
 *                      is `state="loading"` and draws skeleton bubbles with
 *                      the composer kept in place. A SEND in flight is
 *                      `sending`: the field becomes non-editable and sets
 *                      `aria-busy`, and the send control shows it is busy
 *                      without the row reflowing.
 *  7. empty          — `state="empty"`, or `messages: []`: chapter 21's
 *                      register above the composer, which stays — a
 *                      conversation with nothing in it is exactly the moment
 *                      the composer matters most. When there is nothing to
 *                      say either, the register renders `null` and only the
 *                      composer is drawn.
 *  8. error          — `state="error"`: the register in its error tone,
 *                      `role="alert"`, above the composer. A failed SEND is
 *                      not this: it belongs to the call site's own notice, so
 *                      the reader's text is never thrown away by a state
 *                      change inside this component.
 *  9. selected       — does not apply. A message is not a choice. Where a
 *                      thread supports reactions or picking a message to
 *                      quote, the control is a `Button` in the message's own
 *                      `body`.
 * 10. read-only      — `composer={false}`: the transcript renders with no
 *                      composer at all, which is the honest drawing for a
 *                      conversation nobody may add to. `disabled` is the
 *                      other case — may add later, not now — and keeps the
 *                      composer visible so the reader can see that.
 *
 * THREE BREAKPOINTS
 *  mobile   — 62% at 320 is 198px of bubble, which is tight but is what
 *             ruling 36 states, and the ruling states ONE figure rather than
 *             a range. It is kept, for the reason `status-stepper.tsx` keeps
 *             its fold count: a width-triggered change would need a
 *             breakpoint the kit never states, and one reader on a phone and
 *             another on a laptop would be looking at two different shapes
 *             of the same conversation while talking about it. What
 *             DOES respond is the bubble's own text, which wraps, and the
 *             composer, whose attach control drops out of the row before the
 *             field becomes unusable — it is reachable from the message's own
 *             attachment list, which the field is not.
 *  tablet   — unchanged.
 *  desktop  — unchanged. The thread fills the column it is given and the
 *             62% is measured against that column, not against the viewport,
 *             so a thread in a narrow panel on a wide screen is still
 *             correct without a media query.
 *
 * RTL — safe, and this is the component where the sides matter most. `mine`
 * is `self-end` and `theirs` is `self-start`, both LOGICAL, so in Arabic,
 * Urdu and Persian the reader's own messages sit on the reading end exactly
 * as they do in English. The avatar is placed by `flex-row-reverse`, which
 * mirrors with the writing direction rather than naming a side. The receipt
 * is `self-end` with a logical `pe-*`. No physical side appears in this file.
 */
const TicketThread = React.forwardRef<HTMLDivElement, TicketThreadProps>(
  (
    {
      className,
      messages,
      bylinePlacement = "above",
      faceSize = "sm",
      banner,
      composer = true,
      value,
      defaultValue = "",
      onValueChange,
      onSend,
      onAttach,
      disabled = false,
      sending = false,
      state = "ready",
      label = "Conversation",
      placeholder = "Write a reply…",
      composerLabel = "Message",
      sendLabel = "Send",
      attachLabel = "Attach a file",
      internalLabel = "Internal only",
      actions,
      messageActionsLabel = "Message actions",
      editActionLabel = "Edit",
      copyActionLabel = "Copy",
      deleteActionLabel = "Delete",
      editFieldLabel = "Edit message",
      editSaveLabel = "Save",
      editCancelLabel = "Cancel",
      internal = false,
      onInternalChange,
      internalChoiceLabel = "Internal only",
      audience,
      loadingMessages = 3,
      loadingLabel = "Loading…",
      emptyTitle,
      emptyDescription,
      errorTitle,
      errorDescription,
      errorAction,
      ...props
    },
    ref,
  ) => {
    /* Uncontrolled by default, controlled the moment `value` is passed —
       the same contract every field in this system offers. */
    const [internalValue, setInternalValue] = React.useState(defaultValue);
    const controlled = value !== undefined;
    const text = controlled ? value : internalValue;

    const setText = (next: string) => {
      if (!controlled) setInternalValue(next);
      onValueChange?.(next);
    };

    /* Which message (by its own resolved key — `message.id ?? index`, the
       identical fallback the render below already uses) is mid-edit, and
       the draft it is editing. One editor at a time: starting a second
       edit silently replaces the first rather than stacking two open
       textareas in one thread. */
    const [editingKey, setEditingKey] = React.useState<string | null>(null);
    const [editDraft, setEditDraft] = React.useState("");

    const startEdit = (key: string, currentBody: React.ReactNode) => {
      // Seeded from a STRING body only — a bubble carrying a mention pill or
      // a link (`body: React.ReactNode`) has no plain-text form this file
      // can invent, so an edit on one of those opens empty rather than
      // guessing at a serialization. Plain-text bodies, the ordinary case,
      // round-trip exactly.
      setEditDraft(typeof currentBody === "string" ? currentBody : "");
      setEditingKey(key);
    };
    const cancelEdit = () => {
      setEditingKey(null);
      setEditDraft("");
    };
    const saveEdit = (key: string, onEdit: (id: string, newBody: string) => void) => {
      onEdit(key, editDraft);
      setEditingKey(null);
      setEditDraft("");
    };

    const resolved = state === "ready" && messages.length === 0 ? "empty" : state;
    const canSend = text.trim().length > 0 && !disabled && !sending;

    const send = () => {
      if (!canSend) return;
      onSend?.(text);
      // Only a field that owns its value may clear it; a controlled composer
      // is cleared by the call site when the send actually succeeds.
      if (!controlled) setInternalValue("");
    };

    let body: React.ReactNode;

    if (resolved === "loading") {
      /* Skeleton bubbles, alternating sides so the shape of a conversation is
         already there when the words arrive. `Skeleton` owns the pulse. */
      body = (
        <div className="flex flex-col gap-[var(--space-2h)]">
          {Array.from({ length: loadingMessages }, (_, index) => (
            <div
              key={`loading-${index}`}
              className={cn(
                "flex max-w-[62%] items-end gap-2",
                index % 2 === 0 ? "self-start" : "self-end flex-row-reverse",
              )}
            >
              <Skeleton
                announce={false}
                className={cn(
                  faceSize === "md" ? "size-[var(--avatar-control)]" : "size-[var(--avatar-sm)]",
                  "shrink-0",
                )}
              />
              <Skeleton
                variant="card"
                announce={index === 0}
                label={loadingLabel}
                className="w-[12rem]"
              />
            </div>
          ))}
        </div>
      );
    } else if (resolved !== "ready") {
      body =
        resolved === "error" ? (
          <ScreenRegister
            tone="error"
            title={errorTitle}
            description={errorDescription}
            action={errorAction}
          />
        ) : (
          <ScreenRegister tone="empty" title={emptyTitle} description={emptyDescription} />
        );
    } else {
      body = (
        /* `.kw-thread` — a column at `--space-2h`. `role="log"` rather than
           `list`: a conversation is appended to, and `log` is what makes a
           screen reader announce a new message without re-reading the
           thread. */
        <div
          role="log"
          aria-label={label}
          aria-live="polite"
          className={
            bylinePlacement === "below"
              ? cn(
                  "flex flex-col",
                  // Full gap between runs; a message with no byline (an
                  // earlier message of a run, by construction — see
                  // `ThreadMessage.author`) sits closer to the one after it.
                  "[&>*+*]:mt-[var(--space-2h)]",
                  "[&>[data-run=continued]+*]:mt-[var(--space-1)]",
                )
              : "flex flex-col gap-[var(--space-2h)]"
          }
        >
          {messages.map((message, index) => {
            const side: ThreadSide = message.side ?? "theirs";
            const mine = side === "mine";
            const key = message.id ?? String(index);
            // Deliberately independent of `hasByline` below — the avatar and
            // the author/time line are two different signals (Aurora's 20
            // Sep 2026 ruling: show the face on every bubble, keep the name
            // and date on the run's last one only). A caller building runs
            // passes `initials`/`image` on every message and restricts
            // `author`/`authorMeta`/`time` to the last message of the run.
            const hasAvatar =
              message.initials !== undefined || message.image !== undefined;
            const hasByline =
              message.author !== undefined ||
              message.authorMeta !== undefined ||
              message.time !== undefined ||
              Boolean(message.internal);
            const below = bylinePlacement === "below";
            // Per-message wins over the thread-wide default — see
            // `ThreadMessage.actions`'s own doc. Undefined at both levels
            // draws no affordance and no menu.
            const effectiveActions = message.actions ?? actions;
            const isEditingThis = editingKey === key;

            // Author, org and time. Ch27.10 draws all three at the caption
            // and badge steps; `bylinePlacement` only moves the whole line
            // above or below the bubble, never its own typography.
            const byline = hasByline ? (
              <span
                data-slot={below ? "thread-byline" : undefined}
                className={cn(
                  "flex flex-wrap items-baseline gap-2 text-badge",
                  mine && "justify-end",
                )}
              >
                {message.author !== undefined && message.author !== null ? (
                  <span className="text-caption font-[var(--font-weight-medium)]">
                    {message.author}
                  </span>
                ) : null}
                {message.authorMeta !== undefined && message.authorMeta !== null ? (
                  <span className="text-ink-tertiary">{message.authorMeta}</span>
                ) : null}
                {/* Quiet, not coloured: an internal note is a scope,
                    not a status, and the words carry it. */}
                {message.internal ? <Badge>{internalLabel}</Badge> : null}
                {message.time !== undefined && message.time !== null ? (
                  <span className="tabular-nums text-ink-tertiary">
                    {message.time}
                  </span>
                ) : null}
              </span>
            ) : null;

            return (
              <React.Fragment key={key}>
                {message.daySeparator !== undefined && message.daySeparator !== null ? (
                  /* The day heading. Micro, tertiary, centred, tabular — the
                     kit's own treatment for a quiet divider line. */
                  <span
                    data-slot="thread-day"
                    className="self-center py-2 text-micro tabular-nums text-ink-tertiary"
                  >
                    {message.daySeparator}
                  </span>
                ) : null}

                <div
                  data-slot="thread-message"
                  data-side={side}
                  data-run={below && !hasByline ? "continued" : undefined}
                  /* `.kw-msg` — 8 between the avatar and the bubble, bottom
                     aligned, 62% maximum. `flex-row-reverse` puts the avatar
                     outside on the sender's own side and mirrors with the
                     writing direction on its own. */
                  className={cn(
                    "flex max-w-[62%] min-w-0 items-end gap-2",
                    mine ? "self-end flex-row-reverse" : "self-start",
                  )}
                >
                  {hasAvatar ? (
                    /* `.kw-comment__avatar` — 24, pill, raised paper, micro
                       at weight 500. `Avatar size="sm"` is that exactly, and
                       `faceSize`'s default keeps it so. `faceSize="md"`
                       reads `Avatar size="control"` instead (40, matching
                       the message-actions trigger) — see this prop's own
                       doc on `TicketThreadProps`. */
                    <Avatar size={faceSize === "md" ? "control" : "sm"} external={message.external} className="flex-none">
                      {message.image ? (
                        <AvatarImage src={message.image} alt={message.imageAlt ?? ""} />
                      ) : null}
                      <AvatarFallback>{message.initials}</AvatarFallback>
                    </Avatar>
                  ) : null}

                  <div className="flex min-w-0 flex-col gap-1">
                    {/* `bylinePlacement="above"` (the default, ch27.10's own
                        drawing): the line sits above the bubble. */}
                    {below ? null : byline}

                    {/* Ruling 36 — images sit as their OWN bubble, same side
                        as the sender. Its inset steps down so the block reads
                        edge to edge inside the radius (t22.css T22-3). */}
                    {message.media ? (
                      <div
                        data-slot="thread-media"
                        className={cn(
                          BUBBLE_BASE,
                          BUBBLE_SIDE[side],
                          "overflow-hidden p-[var(--space-1h)]",
                        )}
                      >
                        {message.media}
                      </div>
                    ) : null}

                    {message.body !== undefined && message.body !== null ? (
                      isEditingThis ? (
                        /* THE INLINE EDITOR — the bubble's own shape (radius,
                           side fill, inset), holding a field instead of the
                           body, Save/Cancel underneath. Client, verbatim: "i
                           like from p1 that its besides and appears when
                           hover, but make it like p4 wth the 3 options menu"
                           — p1's control OPENS this; this is what it opens
                           INTO, in the bubble's own place rather than a
                           second surface (a popover, a sheet) layered over
                           it, so the reader edits where the message already
                           is. */
                        <div
                          data-slot="thread-edit"
                          className={cn(BUBBLE_BASE, BUBBLE_SIDE[side], "flex flex-col gap-2")}
                        >
                          <Textarea
                            autoFocus
                            autoGrow
                            value={editDraft}
                            onChange={(event) => { setEditDraft(event.target.value); }}
                            aria-label={editFieldLabel}
                            className={cn(
                              "min-h-0 resize-none border-0 bg-transparent p-0",
                              "[font:inherit] text-[inherit]",
                            )}
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className={cn(buttonVariants({ variant: "cancel", size: "sm" }))}
                            >
                              {editCancelLabel}
                            </button>
                            <button
                              type="button"
                              disabled={effectiveActions?.onEdit === undefined}
                              onClick={() => {
                                if (effectiveActions?.onEdit) saveEdit(key, effectiveActions.onEdit);
                              }}
                              className={cn(buttonVariants({ variant: "default", size: "sm" }))}
                            >
                              {editSaveLabel}
                            </button>
                          </div>
                        </div>
                      ) : effectiveActions ? (
                        /* `group/actions` — THE HOVER/FOCUS GATE FOR THE
                           TRIGGER BESIDE IT, below. `items-end` keeps the
                           trigger on the bubble's own last line rather than
                           centred against a tall, multi-line one. ONLY DRAWN
                           WHEN A CALLER ACTUALLY PASSES `actions` — a caller
                           that never does keeps the exact single-`<div data-
                           slot="thread-bubble">` markup this file always
                           rendered (the plain branch just below), so nothing
                           about today's callers or tests moves. */
                        <div
                          data-slot="thread-bubble-row"
                          className={cn(
                            "group/actions relative flex items-end gap-1",
                            mine && "flex-row-reverse",
                          )}
                        >
                          <div
                            data-slot="thread-bubble"
                            className={cn(BUBBLE_BASE, BUBBLE_SIDE[side])}
                          >
                            {message.body}
                          </div>

                          {
                            /* THE TRIGGER — `buttonVariants({ variant:
                               "secondary", size: "icon" })` is the exact
                               construction `EditPenButton` (kwapso_system's
                               own `shared/web/edit-pen-button.tsx`) spends:
                               same size step, same secondary skin, so a
                               reader who already knows that control
                               recognises this one. Hidden until the row is
                               hovered or holds focus (`group-hover/actions`,
                               `group-focus-within/actions` — both scoped
                               `@media (hover: hover)` by Tailwind itself, so
                               a touch tap never fights a sticky hover), and
                               ALWAYS visible on a coarse pointer
                               (`pointer-coarse:`) — a touch reader has no
                               hover state to reveal it with. */
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                data-slot="thread-message-actions-trigger"
                                aria-label={messageActionsLabel}
                                className={cn(
                                  buttonVariants({ variant: "secondary", size: "icon" }),
                                  "shrink-0 self-end",
                                  "opacity-0 pointer-events-none",
                                  "group-hover/actions:opacity-100 group-hover/actions:pointer-events-auto",
                                  "group-focus-within/actions:opacity-100 group-focus-within/actions:pointer-events-auto",
                                  "pointer-coarse:opacity-100 pointer-coarse:pointer-events-auto",
                                )}
                              >
                                <DotsThree size={16} aria-hidden="true" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align={mine ? "end" : "start"}>
                                {effectiveActions.onEdit || effectiveActions.onEditRequest ? (
                                  <DropdownMenuItem
                                    icon={<PencilSimple size={16} aria-hidden="true" />}
                                    onSelect={() => {
                                      // `onEditRequest` wins when both are given — see
                                      // `ThreadMessageActions`'s own "TWO WAYS TO EDIT" doc.
                                      // This component opens no inline editor for it.
                                      if (effectiveActions.onEditRequest) {
                                        effectiveActions.onEditRequest(key);
                                      } else {
                                        startEdit(key, message.body);
                                      }
                                    }}
                                  >
                                    {editActionLabel}
                                  </DropdownMenuItem>
                                ) : null}
                                {/* COPY NEEDS NO HANDLER — see
                                    `ThreadMessageActions`'s own header. It
                                    draws whenever the row does at all. */}
                                <DropdownMenuItem
                                  icon={<Copy size={16} aria-hidden="true" />}
                                  onSelect={() => {
                                    const plain = typeof message.body === "string" ? message.body : "";
                                    void navigator.clipboard?.writeText(plain);
                                    effectiveActions.onCopy?.(key);
                                  }}
                                >
                                  {copyActionLabel}
                                </DropdownMenuItem>
                                {effectiveActions.onDelete ? (
                                  <DropdownMenuItem
                                    danger
                                    icon={<Trash size={16} aria-hidden="true" />}
                                    onSelect={() => { effectiveActions.onDelete?.(key); }}
                                  >
                                    {deleteActionLabel}
                                  </DropdownMenuItem>
                                ) : null}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          }
                        </div>
                      ) : (
                        /* THE PLAIN BRANCH — byte-identical to every render
                           this file produced before `actions` existed. */
                        <div
                          data-slot="thread-bubble"
                          className={cn(BUBBLE_BASE, BUBBLE_SIDE[side])}
                        >
                          {message.body}
                        </div>
                      )
                    ) : null}

                    {/* Attachments. One chip per file, under the bubble and
                        on the sender's own side. A chip that opens is an
                        anchor, so the global ring lands on it. */}
                    {message.attachments && message.attachments.length > 0 ? (
                      <span
                        className={cn(
                          "flex flex-wrap gap-2",
                          mine && "justify-end",
                        )}
                      >
                        {message.attachments.map((file, fileIndex) => {
                          const chip = (
                            <>
                              <Paperclip size={16} aria-hidden="true" />
                              <span className="truncate">{file.name}</span>
                              {file.size !== undefined && file.size !== null ? (
                                <span className="tabular-nums text-ink-tertiary">
                                  {file.size}
                                </span>
                              ) : null}
                            </>
                          );
                          const chipClasses =
                            "inline-flex max-w-full items-center gap-2 rounded-pill bg-card px-3 py-1 text-badge";
                          return file.href ? (
                            <a
                              key={file.id ?? String(fileIndex)}
                              href={file.href}
                              className={cn(
                                chipClasses,
                                "motion-row-hover hover:bg-accent",
                              )}
                            >
                              {chip}
                            </a>
                          ) : (
                            <span
                              key={file.id ?? String(fileIndex)}
                              className={chipClasses}
                            >
                              {chip}
                            </span>
                          );
                        })}
                      </span>
                    ) : null}

                    {/* `bylinePlacement="below"`: the same line follows the
                        bubble (and any attachments), aligned to its side. */}
                    {below ? byline : null}
                  </div>
                </div>

                {/* `.kw-msg__receipt` — micro, disabled ink, tabular, at the
                    inline end under the bubble. */}
                {message.receipt !== undefined && message.receipt !== null ? (
                  <span
                    data-slot="thread-receipt"
                    /* Tertiary, not disabled — the artifact's `--fg4`. See `chat.tsx`. */
                    className="self-end pe-[var(--space-1h)] text-micro tabular-nums text-ink-tertiary"
                  >
                    {message.receipt}
                  </span>
                ) : null}
              </React.Fragment>
            );
          })}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        data-slot="ticket-thread"
        data-state={resolved}
        className={cn("flex w-full min-w-0 flex-col gap-4", className)}
        {...props}
      >
        {body}

        {/* The band above the composer — an approval strip, a closed notice. */}
        {banner ? <div data-slot="thread-banner">{banner}</div> : null}

        {composer && (onInternalChange !== undefined || audience !== undefined) ? (
          /* 27.10's composer — a soft-paper CARD, not the pill: the field on
             top; below it the internal switch chip, the audience line in
             words, and a round mango PaperPlaneRight carrying the glyph alone. The kit:
             sheet, radius 24, 14×16 padding, 12 between the rows; chip 32
             tall on the card fill; send 40×40. No paperclip — "a message is
             text, files live on the record." */
          <form
            data-slot="thread-composer"
            data-variant="card"
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
            className={cn(
              "flex min-w-0 flex-col gap-3 rounded-[var(--radius)] bg-surface-panel px-4 py-3.5",
              disabled && "bg-[var(--btn-disabled-fill)] text-[var(--btn-disabled-label)]",
            )}
          >
            <input
              type="text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={placeholder}
              aria-label={composerLabel}
              aria-busy={sending || undefined}
              disabled={disabled}
              readOnly={sending}
              className={cn(
                "min-w-0 appearance-none border-0 bg-transparent p-0",
                "[font:inherit] text-body-s text-foreground",
                "placeholder:text-ink-tertiary",
                "disabled:cursor-not-allowed disabled:text-[var(--btn-disabled-label)]",
              )}
            />
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {onInternalChange !== undefined ? (
                <label
                  className={cn(
                    "inline-flex h-8 cursor-pointer items-center gap-2 rounded-pill bg-card px-3.5",
                    "text-caption text-foreground",
                    (disabled || sending) && "cursor-not-allowed",
                  )}
                >
                  <Checkbox
                    checked={internal}
                    onCheckedChange={(next) => {
                      onInternalChange(next === true);
                    }}
                    disabled={disabled || sending}
                  />
                  {internalChoiceLabel}
                </label>
              ) : null}
              {audience === undefined || audience === null ? null : (
                <span className="ms-auto min-w-0 text-badge text-ink-tertiary">
                  {audience}
                </span>
              )}
              <button
                type="submit"
                disabled={!canSend}
                aria-label={sendLabel}
                className={cn(
                  "inline-flex size-10 shrink-0 cursor-pointer appearance-none items-center justify-center",
                  "rounded-pill border-0 bg-primary text-ink-on-accent",
                  "transition-colors duration-[var(--duration-colour)] ease-kwapso",
                  "disabled:cursor-not-allowed disabled:bg-[var(--btn-disabled-fill)] disabled:text-[var(--btn-disabled-label)]",
                  audience === undefined || audience === null ? "ms-auto" : "",
                )}
              >
                <PaperPlaneTilt size={14} aria-hidden="true" />
              </button>
            </div>
          </form>
        ) : composer ? (
          /* `.kw-composer` — a pill on raised paper, 8 inside, 16 at the
             leading edge where the text starts. */
          <form
            data-slot="thread-composer"
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
            className={cn(
              "flex items-center gap-2 rounded-pill bg-card",
              "ps-4 pe-2 py-2",
              // A fill and an ink, never an opacity, and the hover on the
              // controls inside is suppressed with them.
              disabled && "bg-[var(--btn-disabled-fill)] text-[var(--btn-disabled-label)]",
            )}
          >
            {onAttach ? (
              <button
                type="button"
                onClick={onAttach}
                disabled={disabled || sending}
                aria-label={attachLabel}
                className={cn(
                  "hidden shrink-0 cursor-pointer appearance-none items-center justify-center",
                  // The attach control drops out before the field becomes
                  // unusable; the files are still reachable from the thread.
                  "sm:inline-flex",
                  "size-[var(--control-height-dense)] rounded-pill border-0 bg-transparent",
                  /* `color: var(--fg3)` — tertiary, not secondary. */
                  "text-ink-tertiary transition-colors duration-[var(--duration-colour)] ease-kwapso",
                  "enabled:hover:bg-accent enabled:hover:text-foreground",
                  "disabled:cursor-not-allowed disabled:bg-[var(--btn-disabled-fill)] disabled:text-[var(--btn-disabled-label)]",
                )}
              >
                <Paperclip size={16} aria-hidden="true" />
              </button>
            ) : null}

            {/* `.kw-composer__ghost` as a real field (t22.css T22-5): the UA
                chrome is reset, typed text is primary ink and the tertiary
                ink moves to the placeholder. No ring is set here — the shared
                `:focus-visible` rule lands on the form's pill. */}
            <input
              type="text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={placeholder}
              aria-label={composerLabel}
              aria-busy={sending || undefined}
              disabled={disabled}
              readOnly={sending}
              className={cn(
                "min-w-0 flex-1 appearance-none border-0 bg-transparent p-0",
                "[font:inherit] text-caption text-foreground",
                "placeholder:text-ink-tertiary",
                "disabled:cursor-not-allowed disabled:text-[var(--btn-disabled-label)]",
              )}
            />

            {/* `.kw-composer__send` — dense height, pill, inverse fill,
                badge at weight 500. Disabled is a fill and an ink; the
                control stays in the row so nothing reflows as you type. */}
            <button
              type="submit"
              disabled={!canSend}
              className={cn(
                "inline-flex shrink-0 cursor-pointer appearance-none items-center gap-2",
                /* `padding: 0 15px` — the ladder's 16, which is exactly what
                   `Button size="sm"` ships and what `comments.tsx` uses for
                   the identical send. 12 made the chapter's two composers
                   different widths. */
                "h-[var(--control-height-dense)] rounded-pill border-0 px-4",
                "bg-surface-inverse text-ink-on-inverse",
                "text-badge font-[var(--font-weight-medium)]",
                "transition-colors duration-[var(--duration-colour)] ease-kwapso",
                "disabled:cursor-not-allowed disabled:bg-[var(--btn-disabled-fill)] disabled:text-[var(--btn-disabled-label)]",
              )}
            >
              {/* WORDS ONLY. Both of chapter 22's composers draw the send as
                  a label and nothing else; the one glyph the chapter puts in a
                  composer is the separate attach control above. (27.9's
                  round glyph-only Post is the ACTIVITY LOG's composer, which
                  is a different object.) */}
              {sendLabel}
            </button>
          </form>
        ) : null}
      </div>
    );
  },
);

TicketThread.displayName = "TicketThread";

export { TicketThread };
