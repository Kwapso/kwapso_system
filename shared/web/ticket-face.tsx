"use client"

import * as React from "react"

import { Icon } from "@shared/web/screen-engine/icon"
import { ticketTypeIconName } from "@shared/ticket-types"
import type { SelectFace } from "@shared/ui/components/select/select"

/** THE FACE FOR A CHOICE OVER A TICKET, RULINGS TWENTY-ONE SEP 2026, VERBATIM:
 * "on every choice component where I can choose a ticket, show me the type
 * as the icon everywhere," and, the companion ruling on the same day, that a
 * face stays visible once an option is chosen, "or the icon."
 *
 * A ticket has no photograph and no name to cut to initials, so its face is
 * its TYPE's glyph, the same map the tickets list already draws through
 * (`ticketTypeIconName`, `shared/ticket-types.ts`): bug for an Issue, the
 * question mark for a Question, the regular plus circle for an Extra, the
 * chat bubble for Feedback. Kit v1.2.144 gave `SelectFace` a matching
 * `icon` variant that the trigger keeps showing once an option is picked,
 * with no per-call-site prop, so handing this to a `SelectItem`'s (and
 * therefore the trigger's own) `face` prop is the whole wiring a ticket
 * picker needs.
 *
 * An UNTYPED ticket (a renamed row this map has never heard of, or no type
 * at all) never renders a blank option: it falls back to a neutral ticket
 * glyph rather than nothing, the same "never guess, never leave empty"
 * contract `ticketTypeIconName` itself keeps.
 */

/** The neutral mark for a ticket whose type this map does not recognise.
 * Written as a literal `icon:` field on purpose: `scripts/icon-map.mjs`
 * reads exactly this shape to decide which kit glyphs the app's bundle
 * keeps, the same way `TAB_ICONS`/`CONCEPT_ICON`/`KNOWLEDGE_KIND_ICON`
 * already declare theirs. */
const NEUTRAL_TICKET_MARK = { icon: "ticket" } as const

/** The minimal shape `ticketFace` needs off a ticket, a search result, or
 * any other row that carries the same type word `HelpTicket.helpType`
 * does. Never the whole `HelpTicket` type: a ticket picker's own search
 * results rarely carry every field a full ticket record does, and this
 * helper has no use for any of them beyond the type. */
export interface TicketFaceSource {
  helpType?: string | null
}

/** `size-3.5`, the same glyph size `TicketChips`' own `typeDot` slot draws
 * (`triage-chips.tsx`), so a ticket's face reads at one size whether it is
 * beside its chips or inside a picker. `text-ink-secondary` reads the same
 * ink `SelectItem`'s own standalone `icon` prop already carries. */
const TICKET_FACE_ICON_CLASS = "size-3.5 text-ink-secondary"

/** The `SelectFace` for a ticket, built from its type. Pass a ticket (or
 * any row carrying `helpType`), get back a face ready for a `SelectItem`'s
 * or a `SelectTrigger`'s own `face` prop. `null`/`undefined` in, the same
 * neutral face out, so a caller mapping a list of tickets never has to
 * guard this call on its own. */
export function ticketFace(ticket: TicketFaceSource | null | undefined): SelectFace {
  const name = ticket ? ticketTypeIconName(ticket.helpType) : null
  return {
    icon: <Icon name={name ?? NEUTRAL_TICKET_MARK.icon} className={TICKET_FACE_ICON_CLASS} />,
  }
}
