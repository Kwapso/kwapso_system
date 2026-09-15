"use client"

// THE ONE WAY TO PICK A STAFF MEMBER — a horizontal row of pills, never a
// dropdown. The client's ruling, 15 Sep 2026, verbatim: "On Add Task and
// generally absolutely everywhere where we are selecting staff, do the
// horizontal choices, not the dropdown. By default, in all of these where I'm
// selecting staff, always put the user preselected by default."
//
// ONE COMPONENT, TWO MODES. `mode="single"` (the default) is a `role="radiogroup"`
// of `role="radio"` pills — an assignee, an account manager, a lead: exactly one
// or nobody. `mode="multi"` is `role="group"` with `aria-pressed` on each pill —
// a ticket's stakeholders, an app's staff: any number, toggled independently.
// Same visual idiom either way, the same one `AppearancePillGroup`
// (`shared/web/appearance-pill-group.tsx`) already established for Settings ›
// Appearance's Size/Appearance/Background rows: a bare `<button role="…">` row
// styled with nothing but kit ROLE tokens, `rounded-pill` (R31), an inset
// hairline instead of a CSS border, and the selected pill's own hairline
// strengthening rather than a second colour (R32 — no new token, nothing here
// is a Tailwind ramp or a hex).
//
// WHY THIS IS A NEW FILE AND NOT A THIRD `RecordPicker` LAYOUT. `RecordPicker`
// already has a `layout="row"` — a line of chips with no trigger, built for a
// triage card offering four candidates at a glance. It draws `role="group"`
// unconditionally (its own header: these are buttons that ACT rather than a
// set of states being toggled before a submit) and has no `role="radiogroup"`
// mode, no "Nobody" pill, no default-to-me. A staff PICKER on a FORM is asking
// a different question — "whose field is this, right now" — and needs the
// radio semantics, the optional empty pill, and the preselect this file adds.
// `record-picker.tsx` is also the one file `web/test/rules.test.ts`'s
// `one-record-picker` law lets compose the kit's `Command`; this file composes
// nothing from it; it is closer to `AppearancePillGroup` than to `RecordPicker`.
//
// THE FACE IS `RecordMark` (R35), round — a person in their own right, never a
// client/app square. THE WORD IS THE FIRST NAME ALONE: a disambiguated name
// carries its email in parens (`assignableMembers`, `web/lib/members.ts` —
// "Alaap Kanchwala (alaap@kwapso.com)" when two colleagues share a first
// name), and on a pill the face beside the word is the disambiguator, not a
// longer string.
//
// A-Z, LOCALE-AWARE, ONCE, HERE (R75). Every caller hands over the unsorted
// list; this is the one chokepoint that orders it, so no call site can forget.
//
// KEYBOARD: every pill is its own `<button>` (real focus, real Enter/Space
// activation, the kit's own focus ring from tokens.css §8 — nothing hand-rolled).
// Arrow keys additionally ROAM focus along the row (Left/Up = previous,
// Right/Down = next), the same one-axis navigation a native radio group gives
// for free and these plain buttons do not get without it.

import * as React from "react"

import { RecordMark } from "@shared/web/record-mark"
import { sortedOptions } from "@shared/web/sorted-options"
import { cn } from "@shared/ui/lib/utils"
import type { Language } from "../i18n"

/** The one shape a pill needs: an id a door stores, the name a person reads,
 * and their own face (R35). Structurally identical to `PickablePerson`
 * (`web/lib/members.ts`) — not imported from there because `shared/web/` may
 * not reach into app code, and never diverges because both are read off the
 * same `TeamMember` shape at the source. */
export type StaffPillPerson = {
  id: string
  name: string
  photo?: string | null
}

/** THE WORD ON THE PILL. Strips a disambiguating "(email)" suffix, then takes
 * the first word of what remains — "Madonna" for a single-word name, which is
 * also the honest fallback for a name this can't parse further. */
function firstName(name: string): string {
  const bare = name.split(" (")[0]?.trim() || name
  return bare.split(/\s+/)[0] || bare
}

/** ROVING FOCUS ALONG ONE ROW. `data-pill` marks every button this component
 * draws (the "Nobody" pill included), so Left/Right walks the whole group
 * regardless of mode. Wraps at both ends, the same as a native radio group. */
function movePillFocus(current: HTMLElement, dir: 1 | -1) {
  const row = current.closest<HTMLElement>("[data-pill-row]")
  if (!row) return
  const pills = Array.from(row.querySelectorAll<HTMLButtonElement>("[data-pill]:not(:disabled)"))
  const i = pills.indexOf(current as HTMLButtonElement)
  if (i === -1 || pills.length === 0) return
  pills[(i + dir + pills.length) % pills.length]?.focus()
}

function onPillKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
  if (e.key === "ArrowRight" || e.key === "ArrowDown") {
    e.preventDefault()
    movePillFocus(e.currentTarget, 1)
  } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
    e.preventDefault()
    movePillFocus(e.currentTarget, -1)
  }
}

/** ONE PILL'S CLASS LIST — `AppearancePillGroup`'s own string, unchanged, so a
 * staff pill and an appearance pill read as the same control at a glance. */
function pillClass(selected: boolean, disabled: boolean) {
  return cn(
    "inline-flex items-center gap-1.5 rounded-pill bg-background px-3 py-1.5",
    // The kit's own boundary law: a fill or an inset shadow, never a CSS
    // `border` — see `appearance-pill-group.tsx`'s header.
    "shadow-[var(--hairline)]",
    "text-sm text-foreground",
    disabled && "cursor-not-allowed opacity-60",
    selected && "font-[var(--font-weight-medium)] shadow-[var(--hairline-ink)]"
  )
}

type BaseProps = {
  /** The team's assignable staff (never a client login — the caller narrows
   * through `web/lib/members.ts`'s one seam before this component ever sees
   * the list). Unsorted; this component sorts it A→Z itself (R75). */
  people: StaffPillPerson[]
  /** The app's current language, for the locale-aware sort — `useLanguage().lang`,
   * never the browser's own. */
  lang: Language
  ariaLabel: string
  /** Named on the row's own container, the same trade-off `RecordPicker`'s
   * `layout="row"` already makes (its own header explains it): a `<label
   * for>` cannot associate with a `role="group"`/`role="radiogroup"` div, so
   * this does not truly bind a `Field`'s label to the control — it still
   * names a real element instead of a ghost when a caller's `Field` points
   * `htmlFor` at it, and `ariaLabel` above is what a screen reader actually
   * hears. */
  id?: string
  disabled?: boolean
  className?: string
}

export type StaffPillPickerProps =
  | (BaseProps & {
      mode?: "single"
      /** The chosen id, or "" for nobody. */
      value: string
      onValueChange: (value: string) => void
      /** Render a "Nobody" pill and let the row clear itself — only where the
       * field genuinely may hold no one. Omit on a required field. */
      allowNobody?: boolean
      /** Required alongside `allowNobody` — the screen's own words ("Nobody
       * yet", "Not said"), already translated, the same sentence the dropdown
       * this replaces used as its `emptyOption`/`placeholder`. */
      nobodyLabel?: string
    })
  | (BaseProps & {
      mode: "multi"
      /** The chosen ids. */
      value: string[]
      onValueChange: (value: string[]) => void
      /** Already-set ids that cannot be clicked off — an add-only set (a
       * ticket's stakeholders: R54, nobody already in is ever removed here).
       * Shown pressed and disabled rather than left out, so the full roster
       * stays visible and the row never reorders under a click. */
      lockedIds?: string[]
    })

export function StaffPillPicker(props: StaffPillPickerProps) {
  const { people, lang, ariaLabel, id, disabled = false, className } = props
  const ordered = sortedOptions(people, lang, (p) => p.name)

  if (props.mode === "multi") {
    const { value, onValueChange, lockedIds = [] } = props
    const locked = new Set(lockedIds)
    const chosen = new Set(value)
    return (
      <div
        id={id}
        role="group"
        aria-label={ariaLabel}
        data-pill-row
        className={cn("flex flex-wrap gap-1.5", className)}
      >
        {ordered.map((p) => {
          const isLocked = locked.has(p.id)
          const pressed = chosen.has(p.id) || isLocked
          return (
            <button
              key={p.id}
              type="button"
              data-pill
              aria-pressed={pressed}
              disabled={disabled || isLocked}
              onKeyDown={onPillKeyDown}
              onClick={() => {
                onValueChange(chosen.has(p.id) ? value.filter((id) => id !== p.id) : [...value, p.id])
              }}
              className={pillClass(pressed, disabled || isLocked)}
            >
              <RecordMark picture={p.photo} name={p.name} shape="round" size="choice" />
              {firstName(p.name)}
            </button>
          )
        })}
      </div>
    )
  }

  const { value, onValueChange, allowNobody = false, nobodyLabel } = props
  const nobodyChosen = value === ""
  return (
    <div
      id={id}
      role="radiogroup"
      aria-label={ariaLabel}
      data-pill-row
      className={cn("flex flex-wrap gap-1.5", className)}
    >
      {allowNobody && (
        <button
          type="button"
          role="radio"
          data-pill
          aria-checked={nobodyChosen}
          disabled={disabled}
          onKeyDown={onPillKeyDown}
          onClick={nobodyChosen ? undefined : () => onValueChange("")}
          className={pillClass(nobodyChosen, disabled)}
        >
          {nobodyLabel}
        </button>
      )}
      {ordered.map((p) => {
        const selected = p.id === value
        return (
          <button
            key={p.id}
            type="button"
            role="radio"
            data-pill
            aria-checked={selected}
            disabled={disabled}
            onKeyDown={onPillKeyDown}
            onClick={selected ? undefined : () => onValueChange(p.id)}
            className={pillClass(selected, disabled)}
          >
            <RecordMark picture={p.photo} name={p.name} shape="round" size="choice" />
            {firstName(p.name)}
          </button>
        )
      })}
    </div>
  )
}
