"use client"

// TEMPORARY PLACEHOLDER — flagged in UI-GAPS.md (#1).
// The library has no one-time-code input yet. This stand-in composes six
// library Inputs (auto-advance, backspace, paste). Once the library
// ships `code-input`, this file gets DELETED and imports swap to the library.
//
// It sits in shared/web/ — the most permanent folder in the repo — and NOT in
// web/components/temp/ beside auth-card, for one reason: both front ends sign in
// with it (the agency app and the client portal), and a file two workspaces
// import cannot live inside one of them. The folder no longer carries the
// "this is a stand-in" signal, so this comment has to. It is still temporary.
//
// ── WHAT WAS ALREADY HERE, AND WHAT WAS NOT, 2026-09-07 ──────────────────────
//
// The gap list asks for seven behaviours on this control and was written before
// several of them landed, so the honest starting point is the audit rather than
// the list: configurable `length`, auto-advance on a digit, paste spread,
// `inputMode="numeric"`, `autoComplete="one-time-code"` and `disabled` were all
// already here and are left alone. Three things were not.
//
// 1 · BACKSPACE ONLY MOVED. On an empty box it walked focus back and left the
//     previous digit sitting there, so the second press deleted it and the
//     third moved again — two presses per digit, and the caret appearing to
//     stall on a box that visibly still holds a number. One press should undo
//     one digit, which is what every other text field in the world does and
//     what a person types without thinking when they mis-key one of six.
//
// 2 · PASTE ALWAYS LANDED AT THE START. The spread was real but it ignored
//     which box received it (`onChange(clean)` from index 0 regardless), so
//     pasting the last two digits into box five rewrote boxes one and two. And
//     it only ever ran through `onChange`, which is the AUTOFILL path — a phone
//     filling the code from the SMS raises an input event — while a person
//     using ⌘V raises a `paste` event this control never listened for. Both
//     paths now run through one `spreadFrom`, so the two can never disagree.
//
// 3 · SIX UNLABELLED BOXES. This is the one that matters most, because of
//     WHERE it is: the sign-in screen. Six inputs whose only name was an
//     English template literal (`Digit 3 of 6`) that no catalogue ever saw, and
//     nothing at all saying they were one field between them — a screen reader
//     announced six unrelated edit boxes to somebody who is trying to get into
//     the product and has no other way in. `role="group"` with a name is what
//     turns them back into one control; the per-box name stays, because "which
//     of the six am I in" is the other question being asked, and it goes
//     through `t(...)` like every other sentence the app says.
//
// A FOCUS THAT SELECTS is the small one that makes the rest behave. Clicking a
// box that already holds a digit used to leave the caret beside it, so typing
// produced a two-character value that the spread path then read as a paste.
// Selecting the digit on focus means a typed character REPLACES it, which is
// what the box looks like it will do.

import * as React from "react"

import { Input } from "@shared/ui/components/input/input"
import { useT } from "@shared/web/language"

export function CodeInput({
  length = 6,
  value,
  onChange,
  disabled = false,
  "aria-label": ariaLabel,
}: {
  length?: number
  value: string
  onChange: (code: string) => void
  disabled?: boolean
  /** What the whole control is called. Defaults to the plainest true sentence;
   * a screen with a more specific one (changing the address on your own
   * account, say) passes its own rather than adding a second heading. */
  "aria-label"?: string
}) {
  const t = useT()
  const refs = React.useRef<(HTMLInputElement | null)[]>([])
  const digits = Array.from({ length }, (_, i) => value[i] ?? "")

  function setDigit(index: number, digit: string) {
    const next = digits.slice()
    next[index] = digit
    onChange(next.join(""))
  }

  /** Write a run of digits starting at `index` and leave the caret on the last
   * box it touched. The ONE implementation behind both ways a whole code
   * arrives: a paste event, and the input event a phone's one-time-code
   * autofill raises. */
  function spreadFrom(index: number, raw: string) {
    const clean = raw.replace(/\D/g, "")
    if (!clean) return
    const next = digits.slice()
    for (let n = 0; n < clean.length && index + n < length; n++) next[index + n] = clean[n]
    onChange(next.join(""))
    refs.current[Math.min(index + clean.length, length) - 1]?.focus()
  }

  function handleChange(index: number, raw: string) {
    const clean = raw.replace(/\D/g, "")
    // More than one character in a one-character box is autofill (or a paste
    // in a browser that reports it as input): spread it from HERE, not from
    // the start of the row.
    if (clean.length > 1) {
      spreadFrom(index, clean)
      return
    }
    setDigit(index, clean)
    if (clean && index < length - 1) refs.current[index + 1]?.focus()
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key !== "Backspace" || digits[index] || index === 0) return
    // The box under the caret is already empty, so the browser's own backspace
    // would do nothing at all. Take it over: step back AND clear, one press
    // for one digit. `preventDefault` so the move and the delete are not
    // followed by the native delete landing on the box we just moved to.
    e.preventDefault()
    setDigit(index - 1, "")
    refs.current[index - 1]?.focus()
  }

  return (
    // ONE CONTROL, NOT SIX. A `group` with a name is the shape ARIA has for
    // "these inputs are one thing" — the name is read once on entering the row
    // and each box then names its own position inside it.
    <div role="group" aria-label={ariaLabel ?? t("Verification code")} className="flex justify-center gap-2">
      {digits.map((digit, i) => (
        <Input
          key={i}
          ref={(el: HTMLInputElement | null) => {
            refs.current[i] = el
          }}
          value={digit}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={(e: React.ClipboardEvent<HTMLInputElement>) => {
            const pasted = e.clipboardData.getData("text")
            if (!pasted.replace(/\D/g, "")) return
            // Only once the paste is known to carry digits, so a paste of
            // nothing useful still falls through to the browser's own handling
            // rather than being silently swallowed.
            e.preventDefault()
            spreadFrom(i, pasted)
          }}
          onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.currentTarget.select()}
          disabled={disabled}
          // The numeric keypad on a phone, and the code offered from the SMS or
          // the email rather than typed out. `one-time-code` on the FIRST box
          // only: it is the box the platform fills and reads the whole code
          // into, and repeating it on all six invites six separate suggestions
          // over one row.
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={t("Digit {position} of {total}", { position: i + 1, total: length })}
          // A CODE CELL IS A BOX, NOT A PILL, and the kit says so in as many
          // words: code-input cells are 24px, explicitly NOT the 6px selection
          // exception, because "a code cell is a box". It has to say so here
          // because the cell is built from the library `Input`, and an input IS
          // a pill in this system — so without the override the six cells
          // render as six circles. 44 x 52 and tabular, per the kit's spec.
          className="h-13 w-11 rounded-[var(--radius)] px-0 text-center text-lg font-medium tabular-nums"
        />
      ))}
    </div>
  )
}
