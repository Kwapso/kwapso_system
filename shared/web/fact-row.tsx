"use client"

// A FACT, NOT A CONTROL — one shape for every field a form answers on the
// caller's behalf because the record it was opened FROM already settles it
// (the app a story is filed under, the ticket a story answers, the account a
// wave was sold to…). UI-RULEBOOK F5/F12: a create/edit form shows the label
// and the control, nothing else, and where there is genuinely nothing to
// choose the "control" IS the settled value — read-only, no hint text
// glued to it, the field's own label doing all the explaining it needs.
//
// WHY THIS EXISTS. `story-form-dialog.tsx` drew this twice, two different
// ways, for two fields on the SAME form: the App row sat in a padded,
// `bg-surface-panel` box ("the panel and padding are what make this read as
// a filled answer rather than a hint under the label" — that file's own
// words); the Ticket row three fields down was bare `text-muted-foreground`
// text with none of that. Six other dialogs each drew a third, fourth or
// fifth variant — some the panel, some the bare text, two of them a
// hand-written sentence OUTSIDE any `<Field>` at all ("For **Acme**",
// "Inside **Driver app**") with no label above them, and two more that
// declared a `fixed*` prop and never gated their picker on it at all. The
// client's ruling, 17 Sep 2026, verbatim: "Keep the fact rows, but make sure
// they appear everywhere." Everywhere means ONE shape, not a shape each
// dialog reinvents — so this is the one component every `fixed*`/parent
// prop renders through, the panel treatment `story-form-dialog.tsx`'s own
// comment already argued for, now carrying the record's own mark beside its
// name the way every picker option in the app already does (`RecordMark`,
// `choice` size — the same 24px box a `RecordPicker`'s own closed control
// and candidate list draw).
//
// NEVER COPY THIS JSX. A second hand-rolled `<p className="bg-surface-panel
// …">` is the defect this file exists to end.

import * as React from "react"

import { RecordMark } from "./record-mark"

export function FactRow({
  id,
  name,
  picture,
  mark,
  shape = "square",
  external = false,
  className = "",
}: {
  /** Wires the field's `<label htmlFor>` to this row, same as any control. */
  id?: string
  /** The settled record's own name — the only word this row says. */
  name: string
  /** The record's own picture, when it has one (R35 — a record shows its own
   * face). Optional: several `fixed*` facts (a request behind a story, a work
   * target) name a row that carries no picture at all. */
  picture?: string | null
  /** The record type's own glyph, drawn where there is no picture. */
  mark?: string | null
  /** THE BOX. A person is a circle; every other record — app, account,
   * ticket, sprint, wave — is a rounded square (R31), `RecordMark`'s own
   * default. */
  shape?: "square" | "round"
  /** IS THE PERSON IN THAT MARK FROM OUTSIDE — a client contact rather than
   * one of ours? Aurora, 23 Sep 2026: *"external photos (from contacts) gray
   * scale. keep staff nirmal."* Handed straight to `RecordMark`'s own
   * `external`; see that prop for the ruling and for why the safe default is
   * colour. A `square` fact (an app, an account, a ticket) never sets it.
   *
   * CARRIED BECAUSE THIS IS A SEAM, NOT BECAUSE A CALLER ASKS TODAY. A shared
   * row that drops a fact is how the next person-shaped caller ships
   * untreated with nothing visible at its own call site to show for it — the
   * same argument `list-compat.tsx` makes about the kit's `List`. */
  external?: boolean
  className?: string
}) {
  return (
    <p
      id={id}
      className={`bg-surface-panel flex items-center gap-2 rounded-[var(--radius)] px-3 py-2 text-sm ${className}`}
    >
      <RecordMark picture={picture} mark={mark} name={name} shape={shape} size="choice" external={external} />
      <span className="min-w-0 flex-1 truncate">{name}</span>
    </p>
  )
}
