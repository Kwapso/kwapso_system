// The destructive-confirm AlertDialog for remove-member / revoke-invite. Owns
// its in-flight (busy) state; the parent does the mutation + navigation. Gated
// by `canRun` so a deep link can't reach it (block at every step).
//
// IT TAKES THE ACT, NOT THE URL — changed 2026-09-10. It used to read
// `query.confirm` off the `ScreenQuery` itself, which quietly made it a
// deep-link-only component: the ONLY way to open this warning was to be on a
// team-area screen with `?confirm=` in the address. That is precisely how the
// member acts came to have no door on Settings › Team (`team/member-panel.tsx`
// carries the whole account of the regression). The act is now a prop, so the
// two callers say the same sentence two ways — the engine host passes the
// `?confirm` it parsed, the Team tab passes the act it is about to run — and
// neither of them is a second copy of this warning.

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
import { Spinner } from "@shared/ui/components/spinner/spinner"

import { personName } from "@/lib/identity"
import { useT } from "@shared/web/language"
import type { TeamMember } from "@shared/types"

/** The two acts this warning covers. The strings are the engine's own action
 * ids (`web/lib/screens.ts`), so the `?confirm=` a deep link carries and the act
 * a component is about to run are spelled the same way in both places. */
export type ConfirmKind = "members.remove" | "invites.revoke"

export function ConfirmAction({
  kind,
  canRun,
  memberName,
  onCancel,
  onConfirm,
}: {
  /** Which act is being confirmed — `null`/anything else keeps it closed. */
  kind: string | null | undefined
  /** false → the viewer lacks the delete right; never open (block at every step). */
  canRun: boolean
  memberName: TeamMember | null
  onCancel: () => void
  onConfirm: () => Promise<void>
}) {
  const t = useT()
  const [busy, setBusy] = React.useState(false)
  const open = canRun && (kind === "members.remove" || kind === "invites.revoke")
  const isRemove = kind === "members.remove"
  const title = isRemove
    ? `Remove ${memberName ? personName(memberName) : "this member"}?`
    : "Revoke this invite?"
  const body = isRemove
    ? "They lose access to this team right away. You can invite them back later."
    : "They won't be able to join with this invite. You can send a new one later."

  return (
    <AlertDialog open={open} onOpenChange={(o) => !busy && !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{t("Cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              setBusy(true)
              void onConfirm().finally(() => setBusy(false))
            }}
            disabled={busy}
          >
            {busy ? <Spinner /> : null}
            {isRemove ? t("Remove") : t("Revoke")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
