"use client"

// Create-team dialog — a name, then the tenancy worker spins up a brand-new
// team with its OWN database (and switches you into it). Library primitives.

import * as React from "react"

import { Button } from "@shared/ui/components/button/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@shared/ui/components/sheet/sheet"
import { Field } from "@shared/web/field"
import { Input } from "@shared/ui/components/input/input"
import { Spinner } from "@shared/ui/components/spinner/spinner"
import { toast } from "@shared/ui/components/sonner/sonner"
import { defaultFieldConfig } from "@shared/web/screen-engine/config"

import { ApiFailure } from "@/lib/api"
import { useFormDraft } from "@shared/web/use-form-draft"
import { useT } from "@shared/web/language"

const nameField = { ...defaultFieldConfig, label: "Team name", required: true }

export function CreateTeamDialog({
  open,
  onOpenChange,
  onCreate,
  draftKey,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (name: string) => Promise<void>
  /** stable id for per-session draft persistence (CACHING.md §11); omit to disable */
  draftKey?: string
}) {
  const t = useT()
  const initialValues = { name: "" }
  // Per-session draft: restores what you typed if you navigate away and reopen.
  const [values, setValues, clearDraft] = useFormDraft(draftKey, initialValues, open)
  const [busy, setBusy] = React.useState(false)
  const { name } = values

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await onCreate(name.trim())
      clearDraft()
      onOpenChange(false)
    } catch (err) {
      toast.error(
        err instanceof ApiFailure ? err.message : t("Couldn't create the team.")
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (busy) return
        if (!o) clearDraft() // dismissing the form (Esc / backdrop / close) discards the draft
        onOpenChange(o)
      }}
    >
      {/* A FORM IS A SLIDE-IN. CLIENT, 2026-09-09, over a screenshot of the
          "New access token" dialog: "This should be a slide-in, like all the
          other screens. The only ones that are overlays are the warnings,
          such as archive or delete, and so on."

          The ruling is general — she was shown one dialog and answered about
          the class — so it lands here too: this is a form, therefore a
          drawer, not a centred modal. It is NOT a style preference and must
          not be reverted as one. Law R59 (`forms-are-not-overlays`) holds it.

          `Sheet` and not `EdgePanel`: a form is modal (you finish it or you
          leave it) and `Sheet` is the kit's modal drawer, while `EdgePanel`
          is deliberately NON-modal above 45rem — the shape the client picked
          for the record's activity rail, where you keep working beside it.
          `Sheet` also carries her OTHER standing ruling, 2026-09-04 —
          "everythung that's slisde in in desktop, should be slide up in
          mobile" — centrally: below 45rem `side="right"` presents and
          animates as the bottom sheet, capped at 85dvh, with the grabber.
          Nothing in this file implements that, and nothing in this file may.

          THE FOOTER IS OUTSIDE THE <form>, WIRED BACK WITH `form=`. A drawer
          is a three-part frame — `SheetHeader` and `SheetFooter` carry
          `sheet-*` slots and are excluded from `SheetContent`'s blanket
          "every other child scrolls" rule, so they pin and the middle child
          is the only thing that scrolls. Nesting the footer inside the form
          would have put the commit control inside the scrolling region,
          which is the exact bug FormShell's three-row grid was built to fix
          (a Save button below the fold). `form="create-team-form"` keeps
          `type="submit"` wired across that DOM gap — plain HTML, no handler
          duplicated. */}
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{t("Create a team")}</SheetTitle>
          <SheetDescription>
            {t("It gets its own private space. You'll be its admin.")}
          </SheetDescription>
        </SheetHeader>
        <form id="create-team-form" className="flex flex-col gap-4" onSubmit={submit}>
          <Field config={nameField} htmlFor="team-name">
            <Input
              id="team-name"
              value={name}
              onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
              placeholder={t("Acme Inc.")}
              disabled={busy}
              autoFocus
            />
          </Field>
        </form>
        <SheetFooter>
          <Button type="submit" form="create-team-form" disabled={busy || !name.trim()}>
            {busy ? <Spinner /> : null}
            {busy ? t("Creating…") : t("Create team")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
