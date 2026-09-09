"use client"

// Change-your-email dialog (Settings → Account): enter a new address → a 6-digit
// code goes to THAT address → verify. On success the email switches, the old
// address is warned, and other devices are signed out (server-side). Two-step,
// mirroring the login card; reuses the CodeInput temp + library primitives.

import * as React from "react"

import { Button } from "@shared/ui/components/button/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@shared/ui/components/sheet/sheet"
import { Field } from "@shared/web/field"
import { Input } from "@shared/ui/components/input/input"
import { Spinner } from "@shared/ui/components/spinner/spinner"
import { toast } from "@shared/ui/components/sonner/sonner"
import { defaultFieldConfig } from "@shared/web/screen-engine/config"

import { ApiFailure, auth } from "@/lib/api"
import { CodeInput } from "@shared/web/code-input"
import { useT } from "@shared/web/language"

const emailField = { ...defaultFieldConfig, label: "New email", required: true }

export function EmailChangeDialog({
  open,
  onOpenChange,
  currentEmail,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentEmail: string
  onSaved: () => Promise<void>
}) {
  const t = useT()
  const [step, setStep] = React.useState<"email" | "code">("email")
  const [email, setEmail] = React.useState("")
  const [code, setCode] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | undefined>()

  React.useEffect(() => {
    if (open) {
      setStep("email")
      setEmail("")
      setCode("")
      setError(undefined)
      setBusy(false)
    }
  }, [open])

  async function sendCode() {
    setBusy(true)
    setError(undefined)
    try {
      await auth.startEmailChange(email.trim())
      setStep("code")
      setCode("")
      // The code goes ONLY to the new inbox — never the response or a toast.
      toast.success(`Code sent. Check ${email.trim()}.`)
    } catch (e) {
      setError(e instanceof ApiFailure ? e.message : "Couldn't send the code.")
    } finally {
      setBusy(false)
    }
  }

  async function verify(fullCode: string) {
    setBusy(true)
    setError(undefined)
    try {
      await auth.verifyEmailChange(email.trim(), fullCode)
      await onSaved()
      onOpenChange(false)
      toast.success(t("Email changed. Your other devices were signed out."))
    } catch (e) {
      setCode("")
      setError(e instanceof ApiFailure ? e.message : "That didn't work. Try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      {/* A FORM IS A SLIDE-IN — client ruling, 2026-09-09, over a screenshot
          of the "New access token" dialog: "This should be a slide-in, like
          all the other screens. The only ones that are overlays are the
          warnings, such as archive or delete, and so on." She was shown one
          dialog and answered about the CLASS, so it binds here. Law R59; not
          a style preference, and not to be reverted as one.

          THIS ONE IS WARNING-ADJACENT AND IS STILL A FORM. Changing the
          address you sign in with is a consequential act, and the temptation
          is to read "consequential" as "warning" and leave it centred. It is
          not: her line draws the boundary at what the surface DOES, not at
          how much it matters — a warning ASKS ("archive this? delete this?")
          and is answered yes or no, while this one COLLECTS (an address,
          then a six-digit code). The revoke check in `access-tokens.tsx` is
          the warning on the same kind of dangerous material, and it stays an
          `AlertDialog`. Collecting is a form; a form is a drawer.

          NO `SheetFooter` HERE, DELIBERATELY. Each of the two steps owns its
          own controls — "Email me a code" is the form's submit, and the
          quiet "Use a different email" / "Resend code" pair belongs to the
          code step and to nothing else. Hoisting either into a pinned foot
          would make one action bar out of two different steps' controls. The
          body is short at both steps (one field, or one code input), so
          nothing falls below the fold; verified at 1280 and 390 rather than
          assumed. Whichever branch renders is `SheetContent`'s ONE non-slot
          child and takes the drawer's scrolling body treatment. */}
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{t("Change your email")}</SheetTitle>
          <SheetDescription>
            {step === "email"
              ? `You currently sign in with ${currentEmail}.`
              : `Enter the 6-digit code sent to ${email.trim()}.`}
          </SheetDescription>
        </SheetHeader>

        {step === "email" ? (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              void sendCode()
            }}
          >
            <Field config={emailField} htmlFor="ec-email" error={error}>
              <Input
                id="ec-email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
                autoFocus
              />
            </Field>
            <Button type="submit" disabled={busy || !email.trim()}>
              {busy ? <Spinner /> : null}
              {busy ? t("Sending…") : t("Email me a code")}
            </Button>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <CodeInput
              value={code}
              disabled={busy}
              onChange={(next) => {
                setCode(next)
                if (next.length === 6) void verify(next)
              }}
            />
            {error && <p className="text-destructive text-center text-xs">{error}</p>}
            {busy && (
              <div className="flex justify-center">
                <Spinner />
              </div>
            )}
            <div className="flex justify-between">
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => {
                  setStep("email")
                  setError(undefined)
                }}
              >
                {t("Use a different email")}
              </Button>
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => void sendCode()}>
                {t("Resend code")}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
