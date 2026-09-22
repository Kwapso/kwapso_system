"use client"

// THE ONE UNSAVED-CHANGES CONFIRM — R59 (a yes/no warning is the kit's
// `AlertDialog`, never a `Sheet`). One caller stages a draft behind a
// Save/Discard bar today (`RolesMatrix` — see that file's own header;
// `AppearancePanel` was the other until 22 Sep 2026, when its own pending/
// Save shape was removed — see `shared/web/appearance-panel.tsx`'s own
// header) and two seams can throw one away: `settings-screen.tsx`'s
// own tab strip (a LOCAL switch, no navigation), and the app's nav bus / Back
// / tab-close (a REAL navigation, `web/lib/nav.ts`'s `guardNavigate` and
// `use-host-nav.ts`). Both raise this exact component rather than two
// AlertDialogs that read almost, but not quite, the same — the shape this
// file exists to rule out.
//
// THE HOST BELOW IS THE IMPERATIVE HALF'S ANSWER. `nav.ts` is not a
// component — `softNavigate`, `guardNavigate` and the Back handler are plain
// functions called from deep, unrelated places with no dialog in hand — so
// they raise this confirm the same way `toast()` raises a message: a tiny
// pub/sub (`web/lib/unsaved-changes.ts`) that a component mounted once near
// the root subscribes to. `UnsavedChangesDialogHost` is that component,
// mounted in `web/app/layout.tsx` beside `<Toaster />` for exactly the same
// reason `<Toaster />` lives there — one place in the whole app that
// imperative code can reach.

import * as React from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@shared/ui/components/alert-dialog/alert-dialog"
import { useLanguage } from "@shared/web/language"

import {
  answerDiscardConfirm,
  useDirtyKeys,
  useDiscardConfirmOpen,
} from "@/lib/unsaved-changes"

/** THE DIALOG ITSELF, presentational — no opinion on WHY it is open, only
 * that it is. `settings-screen.tsx`'s tab guard and `UnsavedChangesDialogHost`
 * below are its two callers, and neither reaches into the other: the tab
 * guard's `onDiscard` switches a tab, the host's clears the nav registry and
 * replays a navigation, and this component knows about neither. */
export function UnsavedChangesDialog({
  open,
  onOpenChange,
  onDiscard,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDiscard: () => void
}) {
  const { t } = useLanguage()
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("Discard your unsaved changes?")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("Leaving throws away what you changed here.")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {/* KEEP EDITING — the default answer, Radix's own initial focus (the
              safe answer, same as every other `AlertDialog` in this app).
              Closing without discarding is the whole of it: nothing was
              cleared, nothing moved. */}
          <AlertDialogCancel>{t("Keep editing")}</AlertDialogCancel>
          {/* DISCARD CHANGES — the caller's own act: a tab switch, or the
              navigation the bus was holding. Nothing to await here either
              way — discarding a draft that was never sent anywhere has no
              door to call. */}
          <AlertDialogAction
            variant="destructive"
            onClick={(e) => {
              e.preventDefault()
              onDiscard()
              onOpenChange(false)
            }}
          >
            {t("Discard changes")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** MOUNTED ONCE, `web/app/layout.tsx`, beside `<Toaster />` — see this file's
 * own header for why an imperative call needs a root-mounted component to
 * draw anything at all. */
export function UnsavedChangesDialogHost() {
  const dirtyKeys = useDirtyKeys()
  const open = useDiscardConfirmOpen()

  // THE HARD LEAVE — closing the browser tab, a reload, an external link.
  // `beforeunload` is the honest, conventional minimum for this (no browser
  // has let a page draw its own words in that prompt for years, so there is
  // nothing here to localise), and it is registered ONLY while something is
  // actually dirty and removed the moment nothing is — an always-on
  // `beforeunload` is the well-known anti-pattern this deliberately avoids:
  // it would still fire on a soft in-app move in some browsers, and it
  // trains a person to click through a prompt that means nothing.
  React.useEffect(() => {
    if (dirtyKeys.length === 0) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [dirtyKeys.length])

  return (
    <UnsavedChangesDialog
      open={open}
      onOpenChange={(next) => !next && answerDiscardConfirm(false)}
      onDiscard={() => answerDiscardConfirm(true)}
    />
  )
}
