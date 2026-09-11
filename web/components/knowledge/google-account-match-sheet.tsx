"use client"

// TRACKER `b-filing` — "naming a Drive folder or Chat space asks you to
// confirm its account once." A YES/NO QUESTION ABOUT SOMETHING THAT ALREADY
// EXISTS — a real account on file, a real name that matched it — is exactly
// `role-picker-dialog.tsx`'s own line for what still earns a Sheet rather
// than a centred `AlertDialog` (R59): "everything else COLLECTS an answer
// and commits it," and confirming which account narrows the compartment the
// share-in-progress will land in — a decision, not a warning about an act
// that already happened.
//
// NEVER OFFERED FOR MORE THAN ONE ITEM AT ONCE. `google-source-dialog.tsx`'s
// own header already settled this: who may read it and whose material it is
// are ONE answer for everything picked in a sitting, so a match that is
// confident about item one and silent (or different) about item two would
// be a second, disagreeing answer to a question the form only asks once.
// The confirm only ever fires while exactly one item is selected — see the
// call site.
//
// THIS SHEET NEVER WRITES. Confirming sets the compartment field the main
// share form already carries; the write it eventually causes is the SAME
// gated, published door (`postGoogleSource`) sharing has always gone
// through — R10/R1/R15 are satisfied there, unchanged, not duplicated here.

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

import { useT } from "@shared/web/language"

export function GoogleAccountMatchSheet({
  open,
  itemName,
  accountName,
  onConfirm,
  onDecline,
}: {
  open: boolean
  /** the folder or space's own name, as Google has it */
  itemName: string
  /** the account this name matched */
  accountName: string
  onConfirm: () => void
  /** dismissal, however it happens — the "Not this one" button, Escape, or a
   * tap on the backdrop all mean the same thing here: leave the match
   * unconfirmed. */
  onDecline: () => void
}) {
  const t = useT()
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onDecline()}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{t("File this under {account}?", { account: accountName })}</SheetTitle>
          <SheetDescription>
            {t('"{name}" looks like it belongs to an account you already have on file.', {
              name: itemName,
            })}
          </SheetDescription>
        </SheetHeader>
        <SheetFooter>
          <Button variant="secondary" onClick={onDecline}>
            {t("Not this one")}
          </Button>
          <Button onClick={onConfirm}>
            {t("Yes, file it under {account}", { account: accountName })}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
