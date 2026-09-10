"use client"

// Edit-your-profile dialog (Settings → Account): first/last name + optional
// photo. Reuses the same auth.updateProfile endpoint onboarding uses. Library
// primitives.

import * as React from "react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@shared/ui/components/avatar/avatar"
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
import { FileUpload } from "@shared/ui/components/file-upload/file-upload"
import { Input } from "@shared/ui/components/input/input"
import { Spinner } from "@shared/ui/components/spinner/spinner"
import { toast } from "@shared/ui/components/sonner/sonner"
import { defaultFieldConfig } from "@shared/web/screen-engine/config"

import type { SessionUser } from "@shared/types"
import { ApiFailure, auth } from "@/lib/api"
import { personInitials } from "@/lib/identity"
import { fileToDataUrl } from "@/lib/image"
import { useT } from "@shared/web/language"

const firstField = { ...defaultFieldConfig, label: "First name", required: true }
const lastField = { ...defaultFieldConfig, label: "Last name", required: true }

export function ProfileDialog({
  open,
  onOpenChange,
  user,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: SessionUser | null
  onSaved: () => Promise<void>
}) {
  const t = useT()
  const [firstName, setFirstName] = React.useState("")
  const [lastName, setLastName] = React.useState("")
  const [photo, setPhoto] = React.useState<string | undefined>()
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setFirstName(user?.firstName ?? "")
      setLastName(user?.lastName ?? "")
      setPhoto(undefined)
    }
  }, [open, user])

  async function handlePhoto(files: File[]) {
    if (!files[0]) return
    try {
      setPhoto(await fileToDataUrl(files[0]))
    } catch {
      toast.error(t("Couldn't read that image. Try another one."))
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await auth.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        imageDataUrl: photo,
      })
      await onSaved()
      onOpenChange(false)
      toast.success(t("Profile updated."))
    } catch (err) {
      toast.error(
        err instanceof ApiFailure ? err.message : t("Couldn't save your profile.")
      )
    } finally {
      setBusy(false)
    }
  }

  const initials = personInitials(firstName, lastName)

  return (
    <Sheet open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      {/* A FORM IS A SLIDE-IN — client ruling, 2026-09-09, over a screenshot
          of the "New access token" dialog: "This should be a slide-in, like
          all the other screens. The only ones that are overlays are the
          warnings, such as archive or delete, and so on." A general ruling on
          the CLASS, not a fix for one dialog, so it lands on this form too.
          Not a style preference; do not revert it as one. Law R59.

          This form has the most reason of any in the app to be a drawer: it
          is the tallest of the four that were centred — an avatar, a file
          picker and two fields — and a centred modal grows off BOTH edges of
          a short window, which is the exact defect FormShell's own header
          records (a 738px dialog on a 1280×640 window with its title clipped
          above the viewport and its Save button below it). A drawer is
          full-height by construction, so the fields scroll and the commit
          control does not move.

          The footer sits OUTSIDE the <form> and is wired back with
          `form="profile-form"`: `SheetHeader`/`SheetFooter` carry `sheet-*`
          slots and are exempt from `SheetContent`'s "every other child
          scrolls" rule, so they pin and only the middle child scrolls. Inside
          the form the footer would have scrolled away with the fields. */}
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{t("Edit your profile")}</SheetTitle>
          <SheetDescription>{t("Your name and photo across the app.")}</SheetDescription>
        </SheetHeader>
        <form id="profile-form" className="flex flex-col gap-4" onSubmit={submit}>
          <div className="flex flex-col items-center gap-4">
            <Avatar className="size-20">
              {(photo || user?.imageUrl) && (
                <AvatarImage src={photo || (user?.imageUrl as string)} alt={t("Your photo")} />
              )}
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <FileUpload accept="image/*" multiple={false} onFilesSelected={handlePhoto} />
          </div>
          <Field config={firstField} htmlFor="pf-first">
            <Input
              id="pf-first"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={busy}
            />
          </Field>
          <Field config={lastField} htmlFor="pf-last">
            <Input
              id="pf-last"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={busy}
            />
          </Field>
        </form>
        <SheetFooter>
          <Button
            type="submit"
            form="profile-form"
            disabled={busy || !firstName.trim() || !lastName.trim()}
          >
            {busy ? <Spinner /> : null}
            {busy ? t("Saving…") : t("Save")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
