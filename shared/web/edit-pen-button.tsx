"use client"

// THE EDIT PEN — one quiet icon button, everywhere a record screen draws one.
//
// CLIENT RULING, 18 Sep 2026, verbatim: "edit button is never black (even
// when it's only one). f.e. in ticket detail the edit buton is black." The
// pen is the one control almost every record detail draws, and it had
// drifted onto three different variants across the app — `secondary` (the
// kit's own answer for an icon-only control, ch26's "an icon-only control is
// secondary anyway"), `ghost` on a few row-level ones, and, on the ticket
// page, `inverse` (the kit's charcoal fill) and, on the meeting page, no
// variant at all (`Button`'s own default is `default` — mango). Both of
// those read as "black"/"filled" beside the plain pencil glyph, which is
// exactly what she is pointing at: the edit pen NEVER carries the record's
// one primary colour, on ANY screen, even where it is the only button drawn.
//
// SO IT IS ONE COMPONENT, NOT A RULE REPEATED AT TWENTY CALL SITES. `secondary`
// is the variant, per the kit's own button.tsx comment on `ghost` ("ch26 says
// an icon-only control is secondary anyway") — the majority shape every
// existing pen button on this base already drew, so this component is a name
// for the rule those call sites were already following, not a new look.
//
// `web/test/pencil-button-census.test.ts` (R84's amendment) reads every
// `<Button>` in `web/components/` that draws a `PencilSimple` child and fails
// the build on `variant="inverse"` or no variant at all (which resolves to
// `default`, mango) — this component is what a call site reaches for instead
// of hand-rolling the variant again.
import * as React from "react"

import { Button } from "@shared/ui/components/button/button"
import { PencilSimple } from "@shared/ui/foundations/icons"

export function EditPenButton({
  onClick,
  /** The accessible name AND the tooltip-less label — an icon-only control's
   * whole reason for `aria-label` to exist. "Edit" in most callers; a few
   * (a profile with nothing written yet) hand a longer sentence instead. */
  label,
  disabled,
  className,
}: {
  onClick: () => void
  label: string
  disabled?: boolean
  className?: string
}) {
  return (
    <Button
      variant="secondary"
      size="icon"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={className ? `shrink-0 ${className}` : "shrink-0"}
    >
      <PencilSimple className="size-3.5" aria-hidden="true" focusable="false" />
    </Button>
  )
}
